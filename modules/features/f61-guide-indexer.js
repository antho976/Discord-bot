import fs from 'fs';
import path from 'path';
import { AttachmentBuilder, EmbedBuilder } from 'discord.js';

/**
 * F61 — Guide Indexer & Patch Notes Analyzer
 * Indexes Discord forum threads (guides), downloads images locally,
 * supports editing + re-posting from dashboard, and auto-bumps threads.
 */
export default function setup(app, deps, F, shared) {
  const { requireAuth, requireTier, saveState, dashAudit, addLog, client, smartBot, loadJSON, saveJSON, DATA_DIR } = deps;

  const GUIDES_PATH = path.join(DATA_DIR, 'guides-index.json');
  const ROOT_DIR = path.resolve(DATA_DIR, '..');
  const UPLOADS_DIR = process.env.PERSISTENT_DATA_DIR
    ? path.join(process.env.PERSISTENT_DATA_DIR, 'uploads', 'guides')
    : path.join(ROOT_DIR, 'uploads', 'guides');

  // Ensure uploads dir exists
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  // Initialize state
  if (!F.guideIndexer) F.guideIndexer = {
    enabled: false,
    forumChannelIds: [],
    lastScanAt: null,
    autoScanInterval: 0,   // hours, 0 = off
    autoBumpEnabled: false,
    autoBumpIntervalHours: 23,
    lastBumpAt: null,
    guides: {},
    analyses: [],
    notificationHistory: [],
    notifyChannelId: null,  // optional separate channel for notifications
    notifyCooldownHours: 12, // don't re-notify same guide about same patch within this window
    notifyDigestMode: false, // batch all notifications into one message
    notifyDmAuthors: false,  // DM guide authors about changes
    bumpHistory: [],  // last 200 bump records
    bumpStaggerMs: 2000, // delay between bumps to avoid rate limits
    bumpSkipRecentHours: 2, // skip threads active within this many hours
    bumpMessageEnabled: false, // send a message when bumping (not just unarchive)
    bumpMessage: '📌 Keeping this guide thread active!', // custom bump message
  };

  // ── Persistence helpers ──
  // In-memory cache to avoid repeated disk reads
  const _cache = { guides: null, idleonTerms: null, steamPatches: null };
  const _saveTimers = { guides: null, idleonTerms: null, steamPatches: null };
  const SAVE_DEBOUNCE_MS = 2000; // debounce writes by 2s

  function loadGuides() {
    if (_cache.guides) return _cache.guides;
    try { _cache.guides = JSON.parse(fs.readFileSync(GUIDES_PATH, 'utf8')); }
    catch { _cache.guides = { guides: {}, analyses: [] }; }
    return _cache.guides;
  }
  function saveGuides(data) {
    _cache.guides = data;
    if (_saveTimers.guides) clearTimeout(_saveTimers.guides);
    _saveTimers.guides = setTimeout(() => {
      try { fs.writeFileSync(GUIDES_PATH, JSON.stringify(data, null, 2)); } catch(e) { addLog('error', 'Guide save failed: ' + e.message); }
      _saveTimers.guides = null;
    }, SAVE_DEBOUNCE_MS);
  }

  // Sync F state with file on start
  const stored = loadGuides();
  if (stored.guides && Object.keys(stored.guides).length > 0 && Object.keys(F.guideIndexer.guides).length === 0) {
    F.guideIndexer.guides = stored.guides;
    F.guideIndexer.analyses = stored.analyses || [];
  }

  // ══════════════════════ IDLEON GAME DATA ══════════════════════
  const IDLEON_CACHE_PATH = path.join(DATA_DIR, 'idleon-terms.json');
  const STEAM_PATCHES_PATH = path.join(DATA_DIR, 'idleon-patches.json');
  const STEAM_APPID = 1476970; // Legends of IdleOn
  const GITHUB_RAW = 'https://raw.githubusercontent.com/BigCoight/IdleonWikiBot3.0/master';

  function loadIdleonTerms() {
    if (_cache.idleonTerms) return _cache.idleonTerms;
    try { _cache.idleonTerms = JSON.parse(fs.readFileSync(IDLEON_CACHE_PATH, 'utf8')); }
    catch { _cache.idleonTerms = { terms: [], fetchedAt: null }; }
    return _cache.idleonTerms;
  }
  function saveIdleonTerms(data) {
    _cache.idleonTerms = data;
    if (_saveTimers.idleonTerms) clearTimeout(_saveTimers.idleonTerms);
    _saveTimers.idleonTerms = setTimeout(() => {
      try { fs.writeFileSync(IDLEON_CACHE_PATH, JSON.stringify(data, null, 2)); } catch(e) { addLog('error', 'IdleOn save failed: ' + e.message); }
      _saveTimers.idleonTerms = null;
    }, SAVE_DEBOUNCE_MS);
  }
  function loadSteamPatches() {
    if (_cache.steamPatches) return _cache.steamPatches;
    try { _cache.steamPatches = JSON.parse(fs.readFileSync(STEAM_PATCHES_PATH, 'utf8')); }
    catch { _cache.steamPatches = { patches: [], lastFetchedAt: null }; }
    return _cache.steamPatches;
  }
  function saveSteamPatches(data) {
    _cache.steamPatches = data;
    if (_saveTimers.steamPatches) clearTimeout(_saveTimers.steamPatches);
    _saveTimers.steamPatches = setTimeout(() => {
      try { fs.writeFileSync(STEAM_PATCHES_PATH, JSON.stringify(data, null, 2)); } catch(e) { addLog('error', 'Steam patches save failed: ' + e.message); }
      _saveTimers.steamPatches = null;
    }, SAVE_DEBOUNCE_MS);
  }

  // Static IdleOn keywords for when GitHub data hasn't been fetched yet
  const IDLEON_STATIC_TERMS = [
    // ── Classes ──
    'Beginner','Warrior','Archer','Mage','Journeyman','Barbarian','Squire','Bowman','Hunter','Wizard','Shaman',
    'Blood Berserker','Death Bringer','Divine Knight','Royal Guardian','Siege Breaker','Beast Master',
    'Elemental Sorcerer','Bubonic Conjuror','Voidwalker',
    // ── Stats ──
    'Base Damage','Max HP','Max MP','Defence','Accuracy','Weapon Power','Movement Speed','Total Damage',
    'STR','AGI','WIS','LUK','Crit Chance','Crit Damage','Multikill','Respawn','KO Chance',
    // ── Skill speeds ──
    'Mining Speed','Mining Efficiency','Mining Power','Choppin Speed','Choppin Efficiency','Choppin Power',
    'Catching Speed','Catching Efficiency','Fishing Speed','Fishing Efficiency','Fishing Power',
    'Trapping Efficiency','Trapping Speed','Worship Charge Rate','Worship Souls',
    'Refinery Speed','Construction Speed','Cooking Speed','Breeding EXP','Laboratory EXP',
    'Sailing Speed','Divinity EXP','Gaming Bits','Farming EXP','Summoning EXP',
    // ── Drop / EXP rates ──
    'Drop Rate','EXP Rate','Money','Printer Sample Rate','Talent Book Library',
    // ── Alchemy (common bubbles) ──
    'Roid Ragin','Hammer Hammer','FMJ','Shaquracy','Gilded Sword','Bappity Boopity','Bow Jack',
    'Call Me Bob','Wis Wiz','Stronk Tools','Swift Steppin','Sanic Speed','Brewed Coffee',
    'Oj Jooce','Blowing Bubbles','Name I Guess','Laaarrrryyyy','Cauldronic Charge',
    'Lo Cost Mo Mana','Carpet of Accuracy','Essence Genesis','Droppin Loads',
    // ── Alchemy (vials) ──
    'Copper Corona','Sippy Splinter','Mushroom Soup','Fermented Birch','Jungle Juice',
    'Barley Brew','Tea With Pea','Gold Guzzle','Ramificoction','Seawater',
    'Fly In My Drink','Slug Slurp','Mimosa Moment','Blue Flav','Slug In A Rug',
    // ── Stamps (common names) ──
    'Sword Stamp','Heart Stamp','Mana Stamp','Vitality Stamp','Book Stamp','Polearm Stamp',
    'Fist Stamp','Battleaxe Stamp','Agile Stamp','Luk Stamp','Pickaxe Stamp','Hatchet Stamp',
    'Card Stamp','Matty Bag Stamp','Steve Sword','Mason Jar Stamp','Alch Goes Boom',
    // ── Cards (sets & notable) ──
    'Blunder Hills','Yum Yum Desert','Frostbite Tundra','Hyperion Nebula','Smolderin Plateau','Spirited Valley',
    'Easy Resources','Medium Resources','Hard Resources','Bosses','Events','Dungeons',
    // ── W1 systems ──
    'Bribe','Forge','Anvil','Post Office','Smithing',
    // ── W2 systems ──
    'Sigil','Fish Pool','Cauldron','Liquid Shop','Arcade','Ballot',
    // ── W3 systems ──
    'Construction','Worship','Trapping','Refinery','Salt Lick','Atom Collider',
    'Cog Complexity','Construction Mastery','Shrine','Prayer','Death Note','Tower Defence',
    // ── W3 prayers ──
    'Big Brain Time','Skilled Dimwit','Unending Energy','Shiny Snitch','Zerg Rushogen',
    'Tachion of the Titans','Balance of Pain','Midas Minded','Jawbreaker',
    'The Royal Sampler','Antifun Spirit','Circular Cranium','Ruck Sack',
    'Fibers of Absence','Vacuous Dreams','Beefy For Real','Balance of Proficiency',
    // ── W3 shrines ──
    'Shrine of Snehebatu','Shrine of the Owl','Shrine of the Chaotic Chizoar',
    'Ishrisha of the Infinite','Shrine of Mr Massacre',
    // ── W4 systems ──
    'Breeding','Laboratory','Cooking','Kitchen','Pet Arena','Chip','Jewel','Meal',
    'Lab Connection','Lab Range','Jewel Effect','Chip Slot','Pet Gene','Territory Fight',
    // ── W4 labs ──
    'Spelunker Obol','Fungi Finger Pocketer','Emerald Prison','Bling Bling',
    'Bow Barbarian','Wired In','No Escape','Gilded Cyclical',
    // ── W4 meals ──
    'Egg','Corndog','Saucy Weiner','Cauliflower','Cabbage','Butter Bar',
    'Sushi Roll','Pad Thai','Fries','Gummy Fish',
    // ── W5 systems ──
    'Sailing','Divinity','Gaming','Artifact','Captain','Island','Slab',
    'Sail Speed','Captain Level','Island Explore','Artifact Find','Boat Level',
    // ── W5 artifacts ──
    'Moai Head','Maneki Kat','Fauxory Tusk','Gold Relic','Genie Lamp','Silver Ankh',
    'Emerald Navette','Fun Hippoete','Arrowhead','Opera Mask','Ashen Urn',
    'Crystal Steak','Trilobite Rock','Billcye Tri','Frost Relic','Chilled Yarn',
    // ── W5 gods ──
    'Snehebatu','Kattlecruk','Arctis','Nobisect','Harriep','Goharut',
    // ── W6 systems ──
    'Jade','Ninja','Market','Farming','Crop','Seed','Summoning','Essence',
    'Jade Coin','Ninja Level','Market Value','Crop Value','Crop Speed',
    'Summoning Winner','Summoning Damage','Essence Gain',
    // ── Post-Office boxes ──
    'Simple Shipment','Upgrade Storage','Tedious Tree','Magician Starterpack',
    'Lil Boxy Thing','Myriad Crate','Box of Filler','Utilitarian',
    'Gratitude Box','Stompin Stamp','Daggery Box','Stampede','Box Fighter',
    // ── Obols ──
    'Bronze Obol','Silver Obol','Gold Obol','Platinum Obol','Pink Obol','Dementia Obol',
    // ── Dungeon ──
    'Dungeon Credits','Dungeon Rank','Dungeon Flurbos','Happy Hour',
    // ── Constellations ──
    'Chronus','Hydron','Pyron','Shoeful','Starius','Gordonius',
    // ── Star Signs ──
    'The Book Worm','The Buff Guy','Flexo Bendo','Dwarfo Beardus','Hipster Logger',
    'Pie Seas','Shoe Fly','Pack Mule','Pirate Booty',
    // ── Misc mechanics ──
    'Talent Point','Star Talent','Tab 1','Tab 2','Tab 3','Tab 4',
    'Skill Efficiency','AFK Gains','Active Gains','Multikill Per Tier',
    'Damage Per Second','Kills Per Hour','EXP Per Hour','Sample Size',
    'Printer Go Brr','Crystal Mob','Giant Mob','Monster Kill',
    'Obol Slot','Card Slot','Food Slot','Carry Cap','Max AFK Time',
  ];

  // Fetch game data from BigCoight/IdleonWikiBot3.0 GitHub repo
  async function fetchIdleonGameData() {
    const sources = [
      { url: `${GITHUB_RAW}/exported/list/Talents/TalentNameRepo.json`, label: 'Talents' },
      { url: `${GITHUB_RAW}/exported/list/Talents/ActiveTalentRepo.json`, label: 'ActiveTalents' },
      { url: `${GITHUB_RAW}/repositories/item/CardRepo.json`, label: 'Cards' },
      { url: `${GITHUB_RAW}/repositories/item/StampDescriptionRepo.json`, label: 'Stamps' },
      { url: `${GITHUB_RAW}/repositories/item/StatueRepo.json`, label: 'Statues' },
      { url: `${GITHUB_RAW}/repositories/item/AnvilRepo.json`, label: 'Anvil' },
      { url: `${GITHUB_RAW}/repositories/misc/AchievementRepo.json`, label: 'Achievements' },
      { url: `${GITHUB_RAW}/repositories/misc/StarSignsRepo.json`, label: 'StarSigns' },
      { url: `${GITHUB_RAW}/repositories/misc/ConstellationsRepo.json`, label: 'Constellations' },
      { url: `${GITHUB_RAW}/repositories/misc/GuildBonusRepo.json`, label: 'GuildBonuses' },
      { url: `${GITHUB_RAW}/repositories/misc/TomeRepo.json`, label: 'Tomes' },
      { url: `${GITHUB_RAW}/repositories/misc/CardSetRepo.json`, label: 'CardSets' },
      { url: `${GITHUB_RAW}/repositories/misc/GemShopRepo.json`, label: 'GemShop' },
      { url: `${GITHUB_RAW}/repositories/misc/world1/BribeRepo.json`, label: 'W1Bribes' },
      { url: `${GITHUB_RAW}/repositories/misc/world2/SigilRepo.json`, label: 'W2Sigils' },
      { url: `${GITHUB_RAW}/repositories/misc/world2/FishPoolRepo.json`, label: 'W2FishPools' },
      { url: `${GITHUB_RAW}/repositories/misc/world3/PrayerRepo.json`, label: 'W3Prayers' },
      { url: `${GITHUB_RAW}/repositories/misc/world3/ShrineRepo.json`, label: 'W3Shrines' },
      { url: `${GITHUB_RAW}/repositories/misc/world3/SaltLickRepo.json`, label: 'W3SaltLick' },
      { url: `${GITHUB_RAW}/repositories/misc/world3/AtomColliderRepo.json`, label: 'W3Atoms' },
      { url: `${GITHUB_RAW}/repositories/misc/world3/BuildingRepo.json`, label: 'W3Buildings' },
      { url: `${GITHUB_RAW}/repositories/misc/world4/MealRepo.json`, label: 'W4Meals' },
      { url: `${GITHUB_RAW}/repositories/misc/world4/ChipRepo.json`, label: 'W4Chips' },
      { url: `${GITHUB_RAW}/repositories/misc/world4/JewelRepo.json`, label: 'W4Jewels' },
      { url: `${GITHUB_RAW}/repositories/misc/world4/PetRepo.json`, label: 'W4Pets' },
      { url: `${GITHUB_RAW}/repositories/misc/world4/PetGeneRepo.json`, label: 'W4PetGenes' },
      { url: `${GITHUB_RAW}/repositories/misc/world4/LabBonusRepo.json`, label: 'W4LabBonuses' },
      { url: `${GITHUB_RAW}/repositories/misc/world5/ArtifactRepo.json`, label: 'W5Artifacts' },
      { url: `${GITHUB_RAW}/repositories/misc/world5/GodInfoRepo.json`, label: 'W5Gods' },
      { url: `${GITHUB_RAW}/repositories/misc/world5/DivinityStyleRepo.json`, label: 'W5Divinity' },
      { url: `${GITHUB_RAW}/repositories/misc/world5/IslandInfoRepo.json`, label: 'W5Islands' },
      { url: `${GITHUB_RAW}/repositories/misc/world5/GamingSuperbitsRepo.json`, label: 'W5Superbits' },
      { url: `${GITHUB_RAW}/repositories/misc/world5/CaptainBonusRepo.json`, label: 'W5Captains' },
      { url: `${GITHUB_RAW}/repositories/misc/world6/JadeUpgradeRepo.json`, label: 'W6Jade' },
      { url: `${GITHUB_RAW}/repositories/misc/world6/NinjaItemRepo.json`, label: 'W6Ninja' },
      { url: `${GITHUB_RAW}/repositories/misc/world6/NinjaUpgradeRepo.json`, label: 'W6NinjaUpgrades' },
      { url: `${GITHUB_RAW}/repositories/misc/world6/MarketInfoRepo.json`, label: 'W6Market' },
      { url: `${GITHUB_RAW}/repositories/misc/world6/SeedInfoRepo.json`, label: 'W6Seeds' },
      { url: `${GITHUB_RAW}/repositories/misc/world6/SummonUpgradeRepo.json`, label: 'W6Summoning' },
    ];

    const allTerms = new Set(IDLEON_STATIC_TERMS);
    const meta = { sources: [], errors: [] };

    for (const src of sources) {
      try {
        const res = await fetch(src.url, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) { meta.errors.push(`${src.label}: HTTP ${res.status}`); continue; }
        const data = await res.json();
        let count = 0;

        const extractNames = (arr) => {
          if (!Array.isArray(arr)) return;
          for (const item of arr) {
            if (typeof item === 'string' && item.length >= 3 && item.length <= 60 && /[a-zA-Z]/.test(item)) {
              allTerms.add(item.trim()); count++;
            } else if (item && typeof item === 'object') {
              // Try various name fields used in different repos
              const n = item.name || item.Name || item.displayName || item.label || item.desc
                || item.stamp || item.bonus || item.effect || item.data;
              if (typeof n === 'string' && n.length >= 3 && n.length <= 80 && /[a-zA-Z]/.test(n)) {
                allTerms.add(n.trim()); count++;
              }
            }
          }
        };

        if (Array.isArray(data)) {
          extractNames(data);
        } else if (data && typeof data === 'object') {
          // Some repos are { "key": {...} } objects
          for (const [key, val] of Object.entries(data)) {
            if (typeof key === 'string' && key.length >= 3 && !/^\d+$/.test(key)) {
              allTerms.add(key.trim()); count++;
            }
            if (Array.isArray(val)) extractNames(val);
            else if (val && typeof val === 'object') extractNames([val]);
          }
        }

        meta.sources.push({ label: src.label, count });
      } catch (err) {
        meta.errors.push(`${src.label}: ${err.message}`);
      }
    }

    const terms = [...allTerms].sort();
    const result = { terms, fetchedAt: new Date().toISOString(), meta };
    saveIdleonTerms(result);
    addLog('info', `Guide indexer: Fetched ${terms.length} IdleOn terms from ${meta.sources.length} sources (${meta.errors.length} errors)`);
    return { termCount: terms.length, sources: meta.sources, errors: meta.errors };
  }

  // ══════════════════════ STEAM PATCH NOTES ══════════════════════

  /**
   * Fetch IdleOn patch notes from Steam's public API.
   * @param {number} [sinceDays=365] — How many days back to fetch
   * @returns {{ patches: Array, newCount: number, totalCount: number }}
   */
  async function fetchSteamPatchNotes(sinceDays = 365) {
    const url = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${STEAM_APPID}&count=100&maxlength=0&format=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`Steam API returned HTTP ${res.status}`);
    const data = await res.json();
    const items = data?.appnews?.newsitems;
    if (!Array.isArray(items)) throw new Error('Invalid Steam API response');

    const cutoff = Date.now() / 1000 - sinceDays * 86400;
    const stored = loadSteamPatches();
    const existingIds = new Set((stored.patches || []).map(p => p.gid));
    let newCount = 0;

    for (const item of items) {
      if (item.date < cutoff) continue;
      if (existingIds.has(item.gid)) {
        // Update content in case it was edited on Steam
        const existing = stored.patches.find(p => p.gid === item.gid);
        if (existing) existing.contents = item.contents;
        continue;
      }

      // Parse the patch notes through our parser
      const parsed = parsePatchNotes(item.contents);

      stored.patches.push({
        gid: item.gid,
        title: item.title,
        url: item.url,
        author: item.author,
        date: new Date(item.date * 1000).toISOString(),
        dateUnix: item.date,
        contents: item.contents,
        charCount: item.contents.length,
        parsed: {
          totalChanges: parsed.length,
          types: parsed.reduce((acc, c) => { acc[c.type] = (acc[c.type] || 0) + 1; return acc; }, {}),
          allTerms: [...new Set(parsed.flatMap(c => c.terms))],
          numericChanges: parsed.filter(c => c.numericChanges.length > 0).length,
        },
        analyzedAt: null,    // set when AI analysis runs
        analysisId: null,    // link to analysis result
      });
      newCount++;
    }

    // Sort newest first
    stored.patches.sort((a, b) => b.dateUnix - a.dateUnix);
    stored.lastFetchedAt = new Date().toISOString();
    saveSteamPatches(stored);

    addLog('info', `Guide indexer: Fetched ${stored.patches.length} Steam patches (${newCount} new, cutoff ${sinceDays}d)`);
    return { patches: stored.patches, newCount, totalCount: stored.patches.length, newPatches: stored.patches.filter(p => !existingIds.has(p.gid)) };
  }

  // ══════════════════════ AUTO-NOTIFY GUIDES ══════════════════════

  /**
   * Match a parsed patch against all indexed guides and post an update
   * comment in each affected guide thread.
   */
  async function notifyGuidesOfPatchChanges(patch) {
    const guides = F.guideIndexer.guides;
    const guideEntries = Object.entries(guides);
    if (guideEntries.length === 0) return { notified: 0, skipped: 0, details: [] };

    const parsed = parsePatchNotes(patch.contents || '');
    if (parsed.length === 0) return { notified: 0, skipped: 0, details: [] };

    // Build set of patch terms (lowercased)
    const patchTerms = new Set(parsed.flatMap(c => c.terms).map(t => t.toLowerCase()));
    // Build map of numeric changes by term
    const termChanges = {};
    for (const change of parsed) {
      for (const term of change.terms) {
        const key = term.toLowerCase();
        if (!termChanges[key]) termChanges[key] = [];
        termChanges[key].push(change);
      }
    }

    // Cooldown check
    const cooldownMs = (F.guideIndexer.notifyCooldownHours || 12) * 60 * 60 * 1000;
    const history = F.guideIndexer.notificationHistory || [];

    let notified = 0;
    let skipped = 0;
    const details = [];
    const digestEntries = [];

    for (const [threadId, guide] of guideEntries) {
      // Match: see if the guide's gameTerms overlap with the patch's terms
      const guideTermsLower = (guide.gameTerms || []).map(t => t.toLowerCase());
      const matches = guideTermsLower.filter(t => patchTerms.has(t));
      if (matches.length === 0) { skipped++; continue; }

      // Cooldown: skip if this guide was notified about this patch recently
      const cooldownKey = `${threadId}:${patch.gid}`;
      const lastNotify = history.find(h => h.key === cooldownKey);
      if (lastNotify && (Date.now() - new Date(lastNotify.date).getTime()) < cooldownMs) {
        skipped++;
        details.push({ threadId, title: guide.title, status: 'cooldown', matches: matches.length });
        continue;
      }

      // Build the relevant changes for this guide
      const relevant = [];
      const seen = new Set();
      for (const matchedTerm of matches) {
        const changes = termChanges[matchedTerm] || [];
        for (const c of changes) {
          const sig = c.text;
          if (seen.has(sig)) continue;
          seen.add(sig);
          relevant.push(c);
        }
      }
      if (relevant.length === 0) { skipped++; continue; }

      // Build embed
      const typeIcons = { buff: '📈', nerf: '📉', fix: '🔧', added: '✨', change: '🔄', ui: '🖥️', info: 'ℹ️', unknown: '❔' };
      let changesText = '';
      for (const c of relevant.slice(0, 15)) {
        const icon = typeIcons[c.type] || '•';
        let line = `${icon} **${c.type.toUpperCase()}** — ${c.text}`;
        if (c.numericChanges.length > 0) {
          const nc = c.numericChanges[0];
          if (nc.from && nc.to) line += `\n  ┗ \`${nc.from}\` → \`${nc.to}\``;
        }
        changesText += line + '\n';
      }
      if (relevant.length > 15) changesText += `\n_...and ${relevant.length - 15} more changes_`;

      // Determine severity
      const hasNumeric = relevant.some(c => c.numericChanges.length > 0);
      const severity = hasNumeric && relevant.length >= 5 ? 'CRITICAL'
        : (hasNumeric || relevant.length >= 3) ? 'WARNING' : 'INFO';
      const sevColors = { CRITICAL: 0xE74C3C, WARNING: 0xF5A623, INFO: 0x3498DB };
      const sevIcons = { CRITICAL: '🚨', WARNING: '⚠️', INFO: 'ℹ️' };

      const embedTitle = `${sevIcons[severity]} ${severity}: Patch Update — ${patch.title}`.slice(0, 256);
      const embed = new EmbedBuilder()
        .setColor(sevColors[severity] || 0xF5A623)
        .setTitle(embedTitle)
        .setDescription(`This guide may need updating! **${matches.length}** matching term(s) found, **${relevant.length}** change(s) detected.`)
        .addFields({
          name: '🎯 Matched Terms',
          value: matches.slice(0, 20).map(t => `\`${t}\``).join(', ').slice(0, 1024) || 'See patch notes.',
        })
        .addFields({
          name: '📋 Relevant Changes',
          value: changesText.slice(0, 1024) || 'See patch notes for details.',
        })
        .setFooter({ text: 'Guide Indexer • Auto-detected from Steam patch notes' })
        .setTimestamp(new Date(patch.date));

      if (patch.url) embed.setURL(patch.url);

      // Post in thread (or digest or notification channel)
      try {
        if (F.guideIndexer.notifyDigestMode) {
          digestEntries.push({ embed, threadId, title: guide.title, matches: matches.length, relevant: relevant.length, severity });
          details.push({ threadId, title: guide.title, status: 'digest-queued', matches: matches.length, changes: relevant.length, severity });
        } else {
          const thread = await client.channels.fetch(threadId).catch(() => null);
          if (!thread) { skipped++; details.push({ threadId, title: guide.title, status: 'thread-not-found' }); continue; }
          if (thread.archived) await thread.setArchived(false).catch(() => null);
          await thread.send({ embeds: [embed] });

          // Also post to notification channel if configured
          if (F.guideIndexer.notifyChannelId) {
            try {
              const notifCh = await client.channels.fetch(F.guideIndexer.notifyChannelId).catch(() => null);
              if (notifCh) await notifCh.send({ content: `📋 Patch notification sent to **${guide.title}**`, embeds: [embed] });
            } catch { /* ignore */ }
          }

          // DM the guide author if enabled
          if (F.guideIndexer.notifyDmAuthors && guide.authorId) {
            try {
              const user = await client.users.fetch(guide.authorId).catch(() => null);
              if (user) await user.send({ content: `Your guide **${guide.title}** may need updating due to a new patch!`, embeds: [embed] }).catch(() => null);
            } catch { /* ignore DM failures */ }
          }

          notified++;
          details.push({ threadId, title: guide.title, status: 'notified', matches: matches.length, changes: relevant.length, severity });
        }

        // Record in history
        const cooldownKey = `${threadId}:${patch.gid}`;
        F.guideIndexer.notificationHistory = (F.guideIndexer.notificationHistory || []).filter(h => h.key !== cooldownKey);
        F.guideIndexer.notificationHistory.push({ key: cooldownKey, date: new Date().toISOString(), patchTitle: patch.title, guideTitle: guide.title, severity });
        // Keep history to last 500 entries
        if (F.guideIndexer.notificationHistory.length > 500) F.guideIndexer.notificationHistory = F.guideIndexer.notificationHistory.slice(-500);

        addLog('info', `Guide indexer: Notified thread "${guide.title}" about patch "${patch.title}" [${severity}] (${matches.length} terms, ${relevant.length} changes)`);
      } catch (err) {
        addLog('warn', `Guide indexer: Failed to notify thread ${threadId}: ${err.message}`);
        skipped++;
        details.push({ threadId, title: guide.title, status: 'error', error: err.message });
      }
    }

    // Digest mode: send all notifications as one message to notification channel
    if (F.guideIndexer.notifyDigestMode && digestEntries.length > 0) {
      const targetChannelId = F.guideIndexer.notifyChannelId || F.guideIndexer.forumChannelIds[0];
      if (targetChannelId) {
        try {
          const ch = await client.channels.fetch(targetChannelId).catch(() => null);
          if (ch) {
            let digestText = `📋 **Patch Digest: ${patch.title}** — ${digestEntries.length} guide(s) affected\n\n`;
            for (const e of digestEntries) {
              digestText += `${e.severity === 'CRITICAL' ? '🚨' : e.severity === 'WARNING' ? '⚠️' : 'ℹ️'} **${e.title}** — ${e.matches} terms, ${e.changes} changes\n`;
            }
            await ch.send({ content: digestText.slice(0, 2000) });
            notified = digestEntries.length;
          }
        } catch (err) { addLog('warn', `Guide indexer: Digest send failed: ${err.message}`); }
      }
    }

    saveState();
    return { notified, skipped, details };
  }

  // ── Download an image from URL to local storage ──
  async function downloadImage(url, threadId, filename) {
    const threadDir = path.join(UPLOADS_DIR, threadId);
    fs.mkdirSync(threadDir, { recursive: true });
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      // Sanitize filename
      const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
      const dest = path.join(threadDir, safeName);
      fs.writeFileSync(dest, buf);
      return `/uploads/guides/${threadId}/${safeName}`;
    } catch (err) {
      addLog('warn', `Guide indexer: Failed to download image ${filename}: ${err.message}`);
      return null;
    }
  }

  // Extract inline image URLs from markdown text
  function extractInlineImages(text) {
    const urls = [];
    const patterns = [
      /!\[[^\]]*\]\((https?:\/\/[^\s)]+\.(png|jpe?g|gif|webp)[^\s)]*)\)/gi,
      /(https?:\/\/[^\s<>"]+\.(png|jpe?g|gif|webp)(\?[^\s<>"]*)?)/gi,
    ];
    for (const pat of patterns) {
      let m;
      while ((m = pat.exec(text)) !== null) {
        if (!urls.includes(m[1])) urls.push(m[1]);
      }
    }
    return urls;
  }

  // ── Parse a thread into structured sections ──
  function parseGuideContent(messages) {
    const fullText = messages.map(m => m.content).filter(Boolean).join('\n\n');
    const sections = [];
    let currentHeading = 'Introduction';
    let currentContent = [];

    for (const line of fullText.split('\n')) {
      const trimmed = line.trim();
      // Detect headings: markdown #, bold **, or ALL CAPS lines
      if (/^#{1,3}\s+/.test(trimmed)) {
        if (currentContent.length) sections.push({ heading: currentHeading, content: currentContent.join('\n').trim() });
        currentHeading = trimmed.replace(/^#+\s*/, '');
        currentContent = [];
      } else if (/^\*\*[^*]+\*\*$/.test(trimmed) && trimmed.length < 80) {
        if (currentContent.length) sections.push({ heading: currentHeading, content: currentContent.join('\n').trim() });
        currentHeading = trimmed.replace(/\*\*/g, '');
        currentContent = [];
      } else if (/^[A-Z][A-Z\s&:/-]{4,60}$/.test(trimmed) && !/^(AND|THE|FOR|BUT|NOT)$/.test(trimmed)) {
        if (currentContent.length) sections.push({ heading: currentHeading, content: currentContent.join('\n').trim() });
        currentHeading = trimmed;
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    }
    if (currentContent.length) sections.push({ heading: currentHeading, content: currentContent.join('\n').trim() });

    // ══════════ COMPREHENSIVE VALUE EXTRACTION ══════════
    const values = {};
    const SKIP_WORDS = /^(the|and|but|for|not|this|that|with|from|your|have|will|been|just|like|also|into|over|such|than|only|some|very|when|what|then|here|more|make|them|were|each|much|most|many|well|back|does|look|want|give|said|same|last|next|both|come|made|know|take|long|even|good|http|https|www|com|org|net|discord|channel|server|image|png|jpg|gif|link|click|note|edit|update|source)$/i;

    function addVal(key, val) {
      key = key.trim().replace(/\*{1,2}/g, '').replace(/_{1,2}/g, '').replace(/\s+/g, ' ');
      if (key.length < 3 || key.length > 80 || SKIP_WORDS.test(key)) return;
      if (/^\d/.test(key)) return; // skip keys starting with numbers
      val = String(val).trim();
      if (val.length > 0 && val.length < 80) values[key] = val;
    }

    let m;

    // 1. Standard key: value (expanded separators & value formats)
    const kv = /([A-Za-z][\w\s'"-]{2,50})[:=–—→>]\s*([\d,.]+%?(?:\s*[-–/x×*]\s*[\d,.]+%?)*)/g;
    while ((m = kv.exec(fullText)) !== null) addVal(m[1], m[2]);

    // 2. Level patterns: "Name Lv. X", "Name Level X", "Name lvl X"
    const lvl = /([A-Za-z][\w\s'"-]{2,50})\s+(?:Lv\.?|Level|lvl|LV|lv)\s*(\d+)/gi;
    while ((m = lvl.exec(fullText)) !== null) addVal(m[1], `Lv ${m[2]}`);

    // 3. Parenthetical values: "Name (X%)", "Name (Lv X)", "Name (X/Y)"
    const paren = /([A-Za-z][\w\s'"-]{2,50})\s*\(\s*((?:Lv\.?\s*)?\d[\d,.%/x×\s+-]*)\)/gi;
    while ((m = paren.exec(fullText)) !== null) addVal(m[1], m[2]);

    // 4. Plus values: "Name +X%", "Name +X"
    const plus = /([A-Za-z][\w\s'"-]{2,50})\s+\+\s*([\d,.]+%?)/g;
    while ((m = plus.exec(fullText)) !== null) addVal(m[1], `+${m[2]}`);

    // 5. Star/tier patterns: "Name ★★★", "Name 3 stars"
    const star = /([A-Za-z][\w\s'"-]{2,50})[:=\s]+([★⭐]{1,7}|\d+\s*(?:stars?|⭐|★))/gi;
    while ((m = star.exec(fullText)) !== null) addVal(m[1], m[2]);

    // 6. Table row extraction: "| Name | Value |"
    const table = /\|\s*([^|]{3,40})\s*\|\s*([\d,.]+%?(?:\s*[-–/x×]\s*[\d,.]+%?)?)\s*\|/g;
    while ((m = table.exec(fullText)) !== null) addVal(m[1], m[2]);

    // 7. List items: "- Name: value", "• Name - value", "* Name: value"
    const list = /^[\s]*[-•*►▸]\s+([A-Za-z][\w\s'"-]{2,40})[:–—-]\s*([\d,.]+%?(?:\s*[-–/x×]\s*[\d,.]+%?)*)/gm;
    while ((m = list.exec(fullText)) !== null) addVal(m[1], m[2]);

    // 8. Arrow/progression: "Name: X → Y"
    const arrow = /([A-Za-z][\w\s'"-]{2,40})[:=\s]+([\d,.]+%?)\s*[→>-]{1,2}\s*([\d,.]+%?)/g;
    while ((m = arrow.exec(fullText)) !== null) addVal(m[1], `${m[2]} → ${m[3]}`);

    // 9. Fraction values: "Name X/Y"
    const frac = /([A-Za-z][\w\s'"-]{2,40})\s+(\d+)\s*\/\s*(\d+)/g;
    while ((m = frac.exec(fullText)) !== null) addVal(m[1], `${m[2]}/${m[3]}`);

    // 10. Formula patterns: "Name = X * Y + Z"
    const formula = /([A-Za-z][\w\s'"-]{2,40})\s*=\s*([\d,.]+(?:\s*[+\-*/×÷^]\s*[\d,.]+)+)/g;
    while ((m = formula.exec(fullText)) !== null) addVal(m[1], m[2]);

    // 11. Max/cap patterns: "Name maxed at X", "Name capped at X"
    const maxPat = /([A-Za-z][\w\s'"-]{2,40})\s+(?:max(?:ed)?|capped)\s+(?:at|to)\s+(\d[\d,.]*)/gi;
    while ((m = maxPat.exec(fullText)) !== null) addVal(m[1], `Max ${m[2]}`);

    // 12. Meal/buff with effect: "Name: Lv X (+Y%)"
    const mealPat = /([A-Za-z][\w\s'"-]{2,40}):\s*Lv\.?\s*(\d+)\s*\(\+?([\d,.]+%?)\)/gi;
    while ((m = mealPat.exec(fullText)) !== null) addVal(m[1], `Lv ${m[2]} (+${m[3]})`);

    // 13. Rate patterns: "Name: X per hour", "Name X/hr"
    const rate = /([A-Za-z][\w\s'"-]{2,40})[:=\s]+([\d,.]+)\s*(?:per|\/)\s*(hour|hr|h|day|d|sec|s|min|m|second|minute|tick)/gi;
    while ((m = rate.exec(fullText)) !== null) addVal(m[1], `${m[2]}/${m[3]}`);

    // 14. Numbered list: "1. Name - value", "2) Name: value"
    const numList = /^\s*\d+[.)]\s+([A-Za-z][\w\s'"-]{2,40})[:–—-]\s*([\d,.]+%?(?:\s*[-–/x×]\s*[\d,.]+%?)*)/gm;
    while ((m = numList.exec(fullText)) !== null) addVal(m[1], m[2]);

    // 15. Bold values: "**Name**: value"
    const bold = /\*\*([^*]{3,40})\*\*[:=\s]+([\d,.]+%?(?:\s*[-–/x×]\s*[\d,.]+%?)*)/g;
    while ((m = bold.exec(fullText)) !== null) addVal(m[1], m[2]);

    // 16. Underline: "__Name__: value"
    const underline = /__([^_]{3,40})__[:=\s]+([\d,.]+%?(?:\s*[-–/x×]\s*[\d,.]+%?)*)/g;
    while ((m = underline.exec(fullText)) !== null) addVal(m[1], m[2]);

    // 17. Code block values: "`Name: value`"
    const code = /`([^`]{3,40})[:=]\s*([\d,.]+%?)`/g;
    while ((m = code.exec(fullText)) !== null) addVal(m[1], m[2]);

    // 18. Multiplier prefix: "x2.5 Name" or "×3 Name"
    const multPre = /[x×]\s*([\d,.]+)\s+([A-Za-z][\w\s'"-]{2,40})/gi;
    while ((m = multPre.exec(fullText)) !== null) addVal(m[2], `x${m[1]}`);

    // 19. Percentage prefix: "+15% Name"
    const pctPre = /\+\s*([\d,.]+%)\s+([A-Za-z][\w\s'"-]{2,40})/g;
    while ((m = pctPre.exec(fullText)) !== null) addVal(m[2], `+${m[1]}`);

    // 20. Tab > Bubble > Lv pattern (IdleOn alchemy): "Tab X > Name > Lv Y"
    const tabPat = /Tab\s*\d+\s*>\s*([^>]{3,40})\s*>\s*(?:Lv\.?\s*)?(\d+)/gi;
    while ((m = tabPat.exec(fullText)) !== null) addVal(m[1].trim(), `Lv ${m[2]}`);

    // 21. IdleOn term proximity matching — match known terms near numbers
    const cached = loadIdleonTerms();
    const allTerms = (cached.terms && cached.terms.length > 0) ? cached.terms : IDLEON_STATIC_TERMS;
    // Build lookup for efficient matching (only terms 3-40 chars)
    const termSet = allTerms.filter(t => t.length >= 3 && t.length <= 40);
    // Process in batches to avoid huge regex
    const BATCH = 150;
    for (let i = 0; i < termSet.length; i += BATCH) {
      const batch = termSet.slice(i, i + BATCH);
      const escaped = batch.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      // Term followed by a number (with optional separator)
      const termAfter = new RegExp(`(${escaped.join('|')})\\s*[:=\\-–—(>]?\\s*(\\d[\\d,.]*%?)`, 'gi');
      while ((m = termAfter.exec(fullText)) !== null) addVal(m[1], m[2]);
      // Number followed by term
      const termBefore = new RegExp(`(\\d[\\d,.]*%?)\\s*[-–x×]?\\s*(${escaped.join('|')})`, 'gi');
      while ((m = termBefore.exec(fullText)) !== null) addVal(m[2], m[1]);
    }

    // 22. Extract all recognized IdleOn game terms mentioned in the text
    const gameTerms = [];
    const textLower = fullText.toLowerCase();
    const allKnown = (cached.terms && cached.terms.length > 0) ? cached.terms : IDLEON_STATIC_TERMS;
    for (const term of allKnown) {
      if (term.length >= 3 && textLower.includes(term.toLowerCase())) {
        gameTerms.push(term);
      }
    }
    // Also extract custom terms: capitalized multi-word phrases that appear 2+ times
    const phraseMap = {};
    const phrasePat = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g;
    while ((m = phrasePat.exec(fullText)) !== null) {
      const p = m[1].trim();
      if (p.length >= 4 && p.length <= 50) phraseMap[p] = (phraseMap[p] || 0) + 1;
    }
    for (const [phrase, count] of Object.entries(phraseMap)) {
      if (count >= 2 && !gameTerms.includes(phrase)) gameTerms.push(phrase);
    }

    return { sections, values, fullText, gameTerms };
  }

  // ── Parse patch notes into structured changes ──
  function parsePatchNotes(text) {
    const changes = [];
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    let currentCategory = 'General';

    for (const line of lines) {
      // Category headers (ALL CAPS, or lines ending with :)
      if (/^[A-Z][A-Z\s&:/-]{4,60}$/.test(line) || /^#{1,3}\s+/.test(line)) {
        currentCategory = line.replace(/^#+\s*/, '').replace(/:$/, '').trim();
        continue;
      }

      // Bullet points or numbered items
      const content = line.replace(/^[•\-*►▸]\s*/, '').replace(/^\d+[.)\-]\s*/, '').trim();
      if (content.length < 10) continue;

      const change = { category: currentCategory, text: content, type: 'unknown', terms: [], numericChanges: [] };

      // Detect change type — use first-match priority via indexOf position
      const typePatterns = [
        { type: 'fix',    re: /\b(?:fixed|fix|bug|crash|resolved|patched)\b/i },
        { type: 'added',  re: /\b(?:added|new|introduced|can\s+now|now\s+(?:has|shows|lets|gives|grants|also|accepts?|open|available|credited|permanently|visually|tells?|remembers?|counts?)|is\s+(?:HERE|BACK)|come\s+again|unlock)\b/i },
        { type: 'nerf',   re: /\b(?:nerfed|decreased|lowered|reduced|removed|no longer|is no more|shorter|less|now\s+caps?\s+at|now\s+start\s+drop)/i },
        { type: 'buff',   re: /\b(?:buffed|increased|boosted|doubled|tripled|improved|enhanced|super\s+boost|now\s+instant|maximum\s+is\s+now)/i },
        { type: 'change', re: /\b(?:changed|reworked|replaced|renamed|converted|adjusted|now\s+(?:chains|uses|works|called|only|just)|are\s+now\s+(?:called|credited))\b/i },
        { type: 'ui',     re: /\b(?:UI|button|hover|click|popup|display|visual|viewer|toggle)\b/i },
      ];
      let earliestPos = Infinity;
      for (const tp of typePatterns) {
        const m = tp.re.exec(content);
        if (m && m.index < earliestPos) { change.type = tp.type; earliestPos = m.index; }
      }
      // Fallback: informational lines that describe mechanics
      if (change.type === 'unknown') {
        if (/\b(?:you\s+(?:can|get|need|should)|there\s+are|this\s+(?:means|also|isn't)|remember\s+to|for\s+full\s+info|every\s+(?:single\s+)?day|currently\s+just|check\s+it\s+out|don't\s+be\s+fooled|you\s+can\s+expect)\b/i.test(content)) {
          change.type = 'info';
        }
      }

      // ── Extract numeric changes ──
      // Arrow: "X -> Y", "X → Y" (with K/M/B/T suffixes and /unit rates)
      const numChange = content.match(/(\d[\d,.]*[KMBTkmbt]?%?(?:\s*\/?\s*(?:min(?:utes?)?|hrs?|hours?|days?|sec(?:onds?)?))?)\s*(?:->|→|-->)\s*(\d[\d,.]*[KMBTkmbt]?%?(?:\s*\/?\s*(?:min(?:utes?)?|hrs?|hours?|days?|sec(?:onds?)?))?)/i);
      if (numChange) change.numericChanges.push({ from: numChange[1].trim(), to: numChange[2].trim() });
      // "DOUBLED", "TRIPLED" etc
      if (/\bdoubled\b/i.test(content)) change.numericChanges.push({ multiplier: '2x' });
      if (/\btripled\b/i.test(content)) change.numericChanges.push({ multiplier: '3x' });
      // "up to X"
      const upTo = content.match(/up\s+to\s+(\d[\d,.]*[KMBTkmbt]?%?)/i);
      if (upTo) change.numericChanges.push({ max: upTo[1] });
      // "from X to Y" or "from X -> Y"
      const fromTo = content.match(/from\s+(\d[\d,.]*[KMBTkmbt]?%?)\s*(?:->|→|to)\s*(\d[\d,.]*[KMBTkmbt]?%?)/i);
      if (fromTo) change.numericChanges.push({ from: fromTo[1], to: fromTo[2] });
      // "caps at X", "maxes out at X"
      const capMatch = content.match(/(?:caps?\s+at|maxes?\s+(?:at|out)|now\s+(?:maxes?|caps?)\s+at)\s+\+?([\d,.]+[KMBTkmbt]?%?)/i);
      if (capMatch) change.numericChanges.push({ cap: capMatch[1] });
      // "every N trades/days"
      const perMatch = content.match(/(?:per|every)\s+(\d[\d,.]*)\s+(\w+)/i);
      if (perMatch) change.numericChanges.push({ per: `${perMatch[1]} ${perMatch[2]}` });
      // "Xx rarer/more/lower" multiplier
      const multMatch = content.match(/(\d[\d,.]*)x\s*(?:~\d+x\s*)?(?:rarer|more|bigger|stronger|lower|higher|faster)/i);
      if (multMatch) change.numericChanges.push({ multiplier: `${multMatch[1]}x` });
      // "X instead of the previous Y"
      const insteadOf = content.match(/\+?(\d[\d,.]*[KMBTkmbt]?%?)\s*(?:\w+[,;]?\s+)?instead\s+of\s+(?:the\s+)?(?:previous\s+)?\+?(\d[\d,.]*[KMBTkmbt]?%?)/i);
      if (insteadOf) change.numericChanges.push({ from: insteadOf[2], to: insteadOf[1] });

      // Extract mentioned game terms
      const contentLower = content.toLowerCase();
      const cached = loadIdleonTerms();
      const allKnown = (cached.terms && cached.terms.length > 0) ? cached.terms : IDLEON_STATIC_TERMS;
      for (const term of allKnown) {
        if (term.length >= 3 && contentLower.includes(term.toLowerCase())) {
          change.terms.push(term);
        }
      }
      // Also grab capitalized proper nouns as potential game terms
      const proper = content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g) || [];
      for (const p of proper) {
        if (p.length >= 4 && !change.terms.includes(p)) change.terms.push(p);
      }

      if (change.type !== 'unknown' || change.terms.length > 0 || change.numericChanges.length > 0) {
        changes.push(change);
      }
    }

    return changes;
  }

  // ── Index a single thread ──
  async function indexThread(thread) {
    try {
      const messages = [];
      let lastId;
      // Fetch all messages (up to 500)
      for (let i = 0; i < 5; i++) {
        const batch = await thread.messages.fetch({ limit: 100, ...(lastId ? { before: lastId } : {}) });
        if (batch.size === 0) break;
        batch.forEach(m => messages.push({
          id: m.id,
          content: m.content,
          authorId: m.author.id,
          authorTag: m.author.tag,
          attachments: [...m.attachments.values()].map(a => ({ name: a.name, url: a.url, contentType: a.contentType })),
        }));
        lastId = batch.last().id;
        if (batch.size < 100) break;
      }

      if (messages.length === 0) return null;

      const { sections, values, fullText, gameTerms } = parseGuideContent(messages);
      const firstMsg = messages[messages.length - 1]; // oldest

      // Download images: attachments + inline
      const images = [];
      for (const msg of messages) {
        for (const att of msg.attachments) {
          if (/^image\//i.test(att.contentType || '')) {
            const localPath = await downloadImage(att.url, thread.id, att.name);
            if (localPath) images.push({ original: att.url, local: localPath, name: att.name, messageId: msg.id });
          }
        }
        const inlineUrls = extractInlineImages(msg.content || '');
        for (const url of inlineUrls) {
          const fname = `inline_${msg.id}_${images.length}.${url.split('.').pop().split('?')[0] || 'png'}`;
          const localPath = await downloadImage(url, thread.id, fname);
          if (localPath) images.push({ original: url, local: localPath, name: fname, messageId: msg.id });
        }
      }

      // Store message IDs for re-post (delete old messages)
      const messageIds = messages.map(m => m.id);

      return {
        title: thread.name,
        threadId: thread.id,
        channelId: thread.parentId,
        sections,
        values,
        gameTerms,
        images,
        messageIds,
        tags: thread.appliedTags?.map(t => {
          const tag = thread.parent?.availableTags?.find(at => at.id === t);
          return tag?.name || t;
        }) || [],
        lastIndexed: new Date().toISOString(),
        messageCount: messages.length,
        authorId: firstMsg.authorId,
        authorTag: firstMsg.authorTag,
        contentLength: fullText.length,
      };
    } catch (err) {
      addLog('error', `Guide indexer: Failed to index thread ${thread.name}: ${err.message}`);
      return null;
    }
  }

  // ── Scan an entire forum channel ──
  async function scanForum(channelId) {
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel || channel.type !== 15) { // 15 = GuildForum
      throw new Error(`Channel ${channelId} is not a forum channel`);
    }

    const threads = [];

    // Fetch active threads
    const active = await channel.threads.fetchActive();
    active.threads.forEach(t => threads.push(t));

    // Fetch archived threads (up to 100)
    let hasMore = true;
    let before;
    while (hasMore && threads.length < 200) {
      const archived = await channel.threads.fetchArchived({ limit: 100, before });
      archived.threads.forEach(t => threads.push(t));
      hasMore = archived.hasMore;
      if (archived.threads.size > 0) before = archived.threads.last().id;
      else break;
    }

    let indexed = 0;
    for (const thread of threads) {
      const guide = await indexThread(thread);
      if (guide) {
        F.guideIndexer.guides[thread.id] = guide;
        indexed++;
      }
    }

    F.guideIndexer.lastScanAt = new Date().toISOString();
    saveState();
    saveGuides({ guides: F.guideIndexer.guides, analyses: F.guideIndexer.analyses });

    return { total: threads.length, indexed };
  }

  // ── AI‑powered patch analysis ──
  async function analyzePatchNotes(patchTitle, patchText, opts = {}) {
    const startTime = Date.now();
    const guides = F.guideIndexer.guides;
    const guideCount = Object.keys(guides).length;
    if (guideCount === 0) throw new Error('No guides indexed yet. Scan a forum first.');

    // Parse patch notes into structured changes
    const patchChanges = parsePatchNotes(patchText);
    const patchTerms = [...new Set(patchChanges.flatMap(c => c.terms))];
    const patchTermsLower = patchTerms.map(t => t.toLowerCase());

    // Smart pre-filtering: score guides by relevance, only send top ones to AI
    const guideScores = Object.entries(guides).map(([id, g]) => {
      const guideTermsLower = (g.gameTerms || []).map(t => t.toLowerCase());
      const overlap = patchTermsLower.filter(t => guideTermsLower.includes(t));
      // Score: term overlap * 3 + section topic match + value key match
      let score = overlap.length * 3;
      const guideSectionsLower = (g.sections || []).map(s => (s.heading + ' ' + s.content).toLowerCase());
      for (const term of patchTermsLower) {
        if (guideSectionsLower.some(s => s.includes(term))) score += 1;
      }
      for (const key of Object.keys(g.values || {})) {
        if (patchTermsLower.includes(key.toLowerCase())) score += 2;
      }
      return { id, guide: g, score, overlap };
    });

    // Sort by relevance, take top guides (always include any with overlap, up to 30)
    guideScores.sort((a, b) => b.score - a.score);
    const relevantGuides = guideScores.filter(g => g.score > 0).slice(0, 30);
    // Also include a few random non-matching guides for context (up to 5)
    const nonMatching = guideScores.filter(g => g.score === 0).slice(0, 5);
    const selectedGuides = [...relevantGuides, ...nonMatching];

    // Build compact guide summaries with game terms for AI context
    // Prioritize: more detail for higher-scoring guides
    const guideSummaries = selectedGuides.map(({ id, guide: g, score, overlap }) => {
      const detailLevel = score >= 6 ? 'full' : score >= 2 ? 'medium' : 'brief';
      const contentSlice = detailLevel === 'full' ? 250 : detailLevel === 'medium' ? 150 : 80;
      const valLimit = detailLevel === 'full' ? 25 : detailLevel === 'medium' ? 15 : 5;
      const termLimit = detailLevel === 'full' ? 60 : 40;

      const sectionList = g.sections.map(s => `  [${s.heading}]: ${s.content.slice(0, contentSlice)}`).join('\n');
      const terms = (g.gameTerms || []).slice(0, termLimit).join(', ');
      const valueList = Object.entries(g.values || {}).slice(0, valLimit).map(([k, v]) => `  ${k}: ${v}`).join('\n');
      const overlapNote = overlap.length > 0 ? `\n⚠️ PATCH MATCHES (${overlap.length}): ${overlap.join(', ')}` : '';
      const relevanceTag = score >= 6 ? '🔴 HIGH RELEVANCE' : score >= 2 ? '🟡 MEDIUM RELEVANCE' : '⚪ LOW RELEVANCE';
      return `GUIDE "${g.title}" (ID:${id}, tags: ${g.tags.join(', ') || 'none'}) [${relevanceTag}, score:${score}]\nGame Terms: ${terms || 'none'}\nSections:\n${sectionList}\n${valueList ? 'Values:\n' + valueList : ''}${overlapNote}`;
    }).join('\n---\n');

    // Build structured patch summary
    const patchSummary = patchChanges.map(c => {
      let line = `[${c.type.toUpperCase()}] ${c.text.slice(0, 200)}`;
      if (c.terms.length) line += `\n  Terms: ${c.terms.join(', ')}`;
      if (c.numericChanges.length) line += `\n  Numbers: ${c.numericChanges.map(n => n.from ? `${n.from} → ${n.to}` : n.multiplier ? n.multiplier : `max ${n.max}`).join(', ')}`;
      return line;
    }).join('\n');

    // Compute patch complexity
    const patchStats = {
      totalChanges: patchChanges.length,
      types: patchChanges.reduce((acc, c) => { acc[c.type] = (acc[c.type] || 0) + 1; return acc; }, {}),
      numericChanges: patchChanges.filter(c => c.numericChanges.length > 0).length,
      uniqueTerms: patchTerms.length,
      guidesScanned: guideCount,
      guidesRelevant: relevantGuides.length,
    };

    // Dynamic context window: larger if fewer relevant guides
    const maxCtx = relevantGuides.length <= 5 ? 12000 : relevantGuides.length <= 15 ? 10000 : 8000;
    const trimmedSummaries = guideSummaries.length > maxCtx
      ? guideSummaries.slice(0, maxCtx) + '\n... (truncated)'
      : guideSummaries;

    const systemPrompt = `You are an Legends of Idleon guide maintenance assistant. You compare game patch notes against existing player guides to find what needs updating.

IDLEON GAME SYSTEMS: Alchemy (bubbles, vials, cauldrons), Stamps, Cards, Statues, Anvil, Post Office, Obols, Forge, Construction (cogs, buildings), Refinery, Salt Lick, Atom Collider, Worship (prayers, shrines, towers), Trapping, Breeding (pets, genes, territory), Laboratory (chips, jewels, connections), Cooking (meals, kitchen, spices), Sailing (boats, islands, artifacts, captains), Divinity (gods, links, styles), Gaming (superbits, bits), Farming (crops, seeds), Summoning (units, upgrades), Jade Upgrades, Ninja, Market, Dungeons, Arcade, Sigils, Talents (tabs 1-4, star talents), Star Signs, Constellations

PATCH CHANGE TYPES:
- ADDED: New features, buttons, systems
- BUFF: Increased values, improved mechanics
- NERF: Decreased values, removed capabilities
- CHANGE: Reworked mechanics, renamed things, altered behavior
- FIX: Bug fixes, crash fixes
- UI: Visual changes, new buttons/popups

RULES:
- Match by game term overlap (⚠️ PATCH MATCHES sections), section topics, AND general context
- Even if a guide doesn't explicitly mention a value, if it covers that game system, mark it as affected
- For buffs/nerfs, try to identify old vs new values
- "is no more" or "renamed" means terminology in guides needs updating
- Rate confidence: CERTAIN (exact term match + value change), PROBABLE (system match + relevant change), POSSIBLE (indirect impact)
- Output valid JSON only, no markdown fences

OUTPUT FORMAT (JSON array):
[{
  "guideId": "thread-id",
  "guideTitle": "Guide Name",
  "confidence": "CERTAIN|PROBABLE|POSSIBLE",
  "changes": [{
    "section": "Section Name or 'General' if unclear",
    "item": "What changed (specific feature/mechanic name)",
    "oldValue": "current guide value/description or 'not specified'",
    "newValue": "new value from patch",
    "note": "brief explanation of impact on guide"
  }]
}]

If no guides are affected, return [].`;

    const trimmedPatchSummary = patchSummary.slice(0, 4000);
    let userPrompt = `EXISTING GUIDES:\n${trimmedSummaries}\n\n---\nPATCH NOTES: "${patchTitle}"\n\nSTRUCTURED CHANGES:\n${trimmedPatchSummary}\n\nRAW PATCH TEXT:\n${patchText}`;
    if (userPrompt.length > 20000) userPrompt = userPrompt.slice(0, 20000) + '\n... (truncated)';

    // Call AI via SmartBot's AI engine
    const ai = smartBot?.ai;
    if (!ai?.enabled) throw new Error('AI is not configured. Set a Groq API key in SmartBot settings.');

    const aiSystemPrompt = systemPrompt;
    const aiUserPrompt = userPrompt;

    // Direct Groq call for structured output
    let rawReply;
    if (ai.groqKey) {
      rawReply = await ai._callGroq(aiSystemPrompt, aiUserPrompt);
    } else if (ai.hfKey) {
      rawReply = await ai._callHuggingFace(aiSystemPrompt, aiUserPrompt);
    }

    if (!rawReply) throw new Error('AI did not return a response. Check API key and rate limits.');

    // Parse JSON from response (handle markdown fences)
    let results;
    try {
      const jsonStr = rawReply.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      results = JSON.parse(jsonStr);
    } catch {
      // If AI didn't return valid JSON, wrap in a freeform result
      results = [{ guideId: 'unknown', guideTitle: 'AI Analysis', confidence: 'POSSIBLE', changes: [{ section: 'General', item: 'See AI response', oldValue: '', newValue: '', note: rawReply.slice(0, 1000) }] }];
    }

    // Compute confidence scores based on term overlap (augment AI confidence)
    for (const r of results) {
      const matchedGuide = guideScores.find(g => g.id === r.guideId);
      r.overlapScore = matchedGuide ? matchedGuide.score : 0;
      r.overlapTerms = matchedGuide ? matchedGuide.overlap.length : 0;
      // Impact severity: CRITICAL (buffs/nerfs with values), HIGH (direct term match + changes), MEDIUM, LOW
      const hasNumeric = r.changes?.some(c => c.oldValue && c.newValue && c.oldValue !== 'not specified');
      const changeCount = r.changes?.length || 0;
      r.impactSeverity = hasNumeric && changeCount >= 3 ? 'CRITICAL'
        : (hasNumeric || r.overlapScore >= 6) ? 'HIGH'
        : r.overlapScore >= 2 ? 'MEDIUM' : 'LOW';
      r.priority = r.impactSeverity === 'CRITICAL' ? 1 : r.impactSeverity === 'HIGH' ? 2 : r.impactSeverity === 'MEDIUM' ? 3 : 4;
    }
    // Sort by priority
    results.sort((a, b) => a.priority - b.priority);

    const elapsed = Date.now() - startTime;

    // Store analysis
    const analysis = {
      id: Date.now().toString(36),
      date: new Date().toISOString(),
      patchTitle,
      patchText: patchText.slice(0, 2000),
      results,
      guidesAffected: results.filter(r => r.changes?.length > 0).length,
      stats: {
        ...patchStats,
        elapsedMs: elapsed,
        contextChars: trimmedSummaries.length,
        aiModel: ai.groqKey ? 'groq' : 'huggingface',
      },
      version: (opts.previousAnalysisId ? 2 : 1),
      previousAnalysisId: opts.previousAnalysisId || null,
    };
    F.guideIndexer.analyses.unshift(analysis);
    if (F.guideIndexer.analyses.length > 100) F.guideIndexer.analyses.length = 100;
    saveState();
    saveGuides({ guides: F.guideIndexer.guides, analyses: F.guideIndexer.analyses });

    addLog('info', `Guide indexer: Analysis "${patchTitle}" completed in ${elapsed}ms — ${analysis.guidesAffected} affected, ${patchStats.totalChanges} changes, ${patchStats.guidesRelevant}/${patchStats.guidesScanned} guides relevant`);
    return analysis;
  }

  // ── Format analysis as Discord embed text ──
  function formatAnalysisForDiscord(analysis) {
    if (!analysis.results || analysis.results.length === 0) {
      return '✅ No guides need updating based on these patch notes.';
    }

    const icons = { CERTAIN: '🔴', PROBABLE: '🟡', POSSIBLE: '🟠' };
    const sevIcons = { CRITICAL: '🚨', HIGH: '🔴', MEDIUM: '🟡', LOW: '🟢' };
    let text = `📋 **${analysis.patchTitle}** — ${analysis.guidesAffected} guide(s) to update\n`;
    if (analysis.stats) text += `_${analysis.stats.totalChanges} changes, ${analysis.stats.guidesRelevant}/${analysis.stats.guidesScanned} guides relevant, ${analysis.stats.elapsedMs}ms_\n`;
    text += '\n';

    for (const r of analysis.results) {
      if (!r.changes?.length) continue;
      const sev = r.impactSeverity ? ` ${sevIcons[r.impactSeverity] || ''} ${r.impactSeverity}` : '';
      text += `${icons[r.confidence] || '⚪'} **${r.confidence}**${sev} — "${r.guideTitle}"\n`;
      for (const c of r.changes) {
        const val = c.oldValue && c.newValue ? ` \`${c.oldValue}\` → \`${c.newValue}\`` : '';
        text += `  • **${c.section}** → ${c.item}${val}\n`;
        if (c.note) text += `    _${c.note}_\n`;
      }
      text += '\n';
    }

    return text.slice(0, 2000); // Discord message limit
  }

  // ── Format analysis as Markdown for export ──
  function formatAnalysisAsMarkdown(analysis) {
    let md = `# Patch Analysis: ${analysis.patchTitle}\n`;
    md += `**Date:** ${analysis.date}\n`;
    md += `**Guides Affected:** ${analysis.guidesAffected}\n`;
    if (analysis.stats) {
      md += `**Stats:** ${analysis.stats.totalChanges} changes, ${analysis.stats.uniqueTerms} terms, ${analysis.stats.guidesRelevant}/${analysis.stats.guidesScanned} guides relevant\n`;
      md += `**Processing Time:** ${analysis.stats.elapsedMs}ms | **AI Model:** ${analysis.stats.aiModel}\n`;
    }
    md += '\n---\n\n';

    if (!analysis.results || analysis.results.length === 0) {
      md += '✅ No guides need updating based on these patch notes.\n';
      return md;
    }

    const sevIcons = { CRITICAL: '🚨', HIGH: '🔴', MEDIUM: '🟡', LOW: '🟢' };
    for (const r of analysis.results) {
      if (!r.changes?.length) continue;
      md += `## ${r.guideTitle}\n`;
      md += `**Confidence:** ${r.confidence} | **Impact:** ${sevIcons[r.impactSeverity] || ''} ${r.impactSeverity || 'N/A'} | **Term Overlap:** ${r.overlapTerms || 0}\n\n`;
      md += '| Section | Change | Old Value | New Value | Note |\n';
      md += '|---------|--------|-----------|-----------|------|\n';
      for (const c of r.changes) {
        md += `| ${c.section} | ${c.item} | ${c.oldValue || '-'} | ${c.newValue || '-'} | ${c.note || '-'} |\n`;
      }
      md += '\n';
    }

    return md;
  }

  // ══════════════════════ API ROUTES ══════════════════════

  // Get config & stats
  app.get('/api/features/guide-indexer', requireAuth, requireTier('admin'), (req, res) => {
    const guides = F.guideIndexer.guides;
    const now = Date.now();
    const guideList = Object.entries(guides).map(([id, g]) => {
      // Compute health score (0-100)
      const daysSinceIndex = (now - new Date(g.lastIndexed).getTime()) / 86400000;
      const hasTerms = (g.gameTerms || []).length > 0;
      const hasSections = (g.sections || []).length > 0;
      const hasValues = Object.keys(g.values || {}).length > 0;
      const hasImages = (g.images || []).length > 0;
      const sectionCount = (g.sections || []).length;
      const contentLen = g.contentLength || 0;
      let health = 100;
      if (daysSinceIndex > 90) health -= 30;
      else if (daysSinceIndex > 30) health -= 15;
      else if (daysSinceIndex > 14) health -= 5;
      if (!hasTerms) health -= 15;
      if (!hasSections || sectionCount < 2) health -= 10;
      if (!hasValues) health -= 10;
      if (!hasImages) health -= 5;
      if (contentLen < 200) health -= 15;
      if (g.messageCount < 2) health -= 5;
      health = Math.max(0, Math.min(100, health));

      // Word count and reading time
      const fullText = (g.sections || []).map(s => s.content).join(' ');
      const wordCount = fullText.split(/\s+/).filter(Boolean).length;
      const readingTime = Math.ceil(wordCount / 200); // ~200 wpm

      return {
        id, title: g.title, sections: g.sections.length, values: Object.keys(g.values || {}).length,
        gameTerms: (g.gameTerms || []).length,
        images: (g.images || []).length,
        tags: g.tags, lastIndexed: g.lastIndexed, messageCount: g.messageCount, authorTag: g.authorTag,
        health, wordCount, readingTime, contentLength: contentLen,
        lastEdited: g.lastEdited || null, lastReposted: g.lastReposted || null,
        daysSinceIndex: Math.floor(daysSinceIndex),
      };
    });
    res.json({
      success: true,
      config: {
        enabled: F.guideIndexer.enabled,
        forumChannelIds: F.guideIndexer.forumChannelIds,
        autoScanInterval: F.guideIndexer.autoScanInterval,
        lastScanAt: F.guideIndexer.lastScanAt,
        autoBumpEnabled: F.guideIndexer.autoBumpEnabled,
        autoBumpIntervalHours: F.guideIndexer.autoBumpIntervalHours,
        lastBumpAt: F.guideIndexer.lastBumpAt,
        autoNotifyEnabled: F.guideIndexer.autoNotifyEnabled !== false,
        notifyChannelId: F.guideIndexer.notifyChannelId || '',
        notifyCooldownHours: F.guideIndexer.notifyCooldownHours || 12,
        notifyDigestMode: !!F.guideIndexer.notifyDigestMode,
        notifyDmAuthors: !!F.guideIndexer.notifyDmAuthors,
        bumpStaggerMs: F.guideIndexer.bumpStaggerMs || 2000,
        bumpSkipRecentHours: F.guideIndexer.bumpSkipRecentHours || 2,
        bumpMessageEnabled: !!F.guideIndexer.bumpMessageEnabled,
        bumpMessage: F.guideIndexer.bumpMessage || '',
      },
      stats: { totalGuides: guideList.length, totalAnalyses: F.guideIndexer.analyses.length },
      guides: guideList,
      analyses: (F.guideIndexer.analyses || []).slice(0, 20).map(a => ({
        id: a.id, date: a.date, patchTitle: a.patchTitle, guidesAffected: a.guidesAffected,
        stats: a.stats || null, impactBreakdown: a.results ? a.results.reduce((acc, r) => { const sev = r.impactSeverity || 'LOW'; acc[sev] = (acc[sev] || 0) + 1; return acc; }, {}) : null,
        version: a.version || 1,
      })),
    });
  });

  // Update config
  app.post('/api/features/guide-indexer/config', requireAuth, requireTier('admin'), (req, res) => {
    const { enabled, forumChannelIds, autoScanInterval, autoNotifyEnabled } = req.body;
    if (typeof enabled === 'boolean') F.guideIndexer.enabled = enabled;
    if (Array.isArray(forumChannelIds)) F.guideIndexer.forumChannelIds = forumChannelIds.map(String).slice(0, 10);
    if (typeof autoScanInterval === 'number') F.guideIndexer.autoScanInterval = Math.max(0, Math.min(168, autoScanInterval));
    if (typeof autoNotifyEnabled === 'boolean') F.guideIndexer.autoNotifyEnabled = autoNotifyEnabled;
    // Notification options
    const { notifyChannelId, notifyCooldownHours, notifyDigestMode, notifyDmAuthors } = req.body;
    if (typeof notifyChannelId === 'string') F.guideIndexer.notifyChannelId = notifyChannelId.trim() || null;
    if (typeof notifyCooldownHours === 'number') F.guideIndexer.notifyCooldownHours = Math.max(0, Math.min(168, notifyCooldownHours));
    if (typeof notifyDigestMode === 'boolean') F.guideIndexer.notifyDigestMode = notifyDigestMode;
    if (typeof notifyDmAuthors === 'boolean') F.guideIndexer.notifyDmAuthors = notifyDmAuthors;
    saveState();
    dashAudit(req.userName, 'update-guide-indexer', `Guide indexer: enabled=${F.guideIndexer.enabled}`);
    res.json({ success: true });
  });

  // Trigger scan
  app.post('/api/features/guide-indexer/scan', requireAuth, requireTier('admin'), async (req, res) => {
    try {
      const channelIds = F.guideIndexer.forumChannelIds;
      if (channelIds.length === 0) return res.json({ success: false, error: 'No forum channels configured' });

      let totalThreads = 0, totalIndexed = 0;
      for (const cid of channelIds) {
        const result = await scanForum(cid);
        totalThreads += result.total;
        totalIndexed += result.indexed;
      }

      addLog('info', `Guide indexer: Scanned ${totalThreads} threads, indexed ${totalIndexed}`);
      dashAudit(req.userName, 'scan-guides', `Scanned ${totalIndexed} guides from ${channelIds.length} forum(s)`);
      res.json({ success: true, total: totalThreads, indexed: totalIndexed });
    } catch (err) {
      addLog('error', `Guide scan failed: ${err.message}`);
      res.json({ success: false, error: err.message });
    }
  });

  // Analyze patch notes
  app.post('/api/features/guide-indexer/analyze', requireAuth, requireTier('admin'), async (req, res) => {
    try {
      const { patchTitle, patchText } = req.body;
      if (!patchText || typeof patchText !== 'string') return res.json({ success: false, error: 'Patch notes text required' });
      const title = (typeof patchTitle === 'string' && patchTitle.trim()) ? patchTitle.trim().slice(0, 100) : 'Untitled Patch';

      const analysis = await analyzePatchNotes(title, patchText.slice(0, 8000));
      dashAudit(req.userName, 'analyze-patch', `Analyzed "${title}" — ${analysis.guidesAffected} guides affected`);
      res.json({ success: true, analysis });
    } catch (err) {
      addLog('error', `Patch analysis failed: ${err.message}`);
      res.json({ success: false, error: err.message });
    }
  });

  // Get full analysis by id
  app.get('/api/features/guide-indexer/analysis/:id', requireAuth, requireTier('admin'), (req, res) => {
    const analysis = F.guideIndexer.analyses.find(a => a.id === req.params.id);
    if (!analysis) return res.json({ success: false, error: 'Analysis not found' });
    res.json({ success: true, analysis });
  });

  // Delete an analysis
  app.delete('/api/features/guide-indexer/analysis/:id', requireAuth, requireTier('admin'), (req, res) => {
    const idx = F.guideIndexer.analyses.findIndex(a => a.id === req.params.id);
    if (idx === -1) return res.json({ success: false, error: 'Analysis not found' });
    F.guideIndexer.analyses.splice(idx, 1);
    saveState();
    saveGuides({ guides: F.guideIndexer.guides, analyses: F.guideIndexer.analyses });
    dashAudit(req.userName, 'delete-analysis', `Deleted analysis ${req.params.id}`);
    res.json({ success: true });
  });

  // Re-analyze: run analysis again on the same patch, linking to previous
  app.post('/api/features/guide-indexer/analysis/:id/reanalyze', requireAuth, requireTier('admin'), async (req, res) => {
    try {
      const prev = F.guideIndexer.analyses.find(a => a.id === req.params.id);
      if (!prev) return res.json({ success: false, error: 'Analysis not found' });
      const analysis = await analyzePatchNotes(prev.patchTitle, prev.patchText, { previousAnalysisId: prev.id });
      dashAudit(req.userName, 're-analyze', `Re-analyzed "${prev.patchTitle}" — ${analysis.guidesAffected} guides affected (v${analysis.version})`);
      res.json({ success: true, analysis });
    } catch (err) {
      res.json({ success: false, error: err.message });
    }
  });

  // Export analysis as markdown
  app.get('/api/features/guide-indexer/analysis/:id/export', requireAuth, requireTier('admin'), (req, res) => {
    const analysis = F.guideIndexer.analyses.find(a => a.id === req.params.id);
    if (!analysis) return res.json({ success: false, error: 'Analysis not found' });
    const md = formatAnalysisAsMarkdown(analysis);
    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="analysis-${analysis.id}.md"`);
    res.send(md);
  });

  // Batch analyze multiple patches at once
  app.post('/api/features/guide-indexer/batch-analyze', requireAuth, requireTier('admin'), async (req, res) => {
    try {
      const { patchGids } = req.body;
      if (!Array.isArray(patchGids) || patchGids.length === 0) return res.json({ success: false, error: 'Provide patchGids array' });
      if (patchGids.length > 10) return res.json({ success: false, error: 'Maximum 10 patches at once' });
      const stored = loadSteamPatches();
      const results = [];
      for (const gid of patchGids) {
        const patch = (stored.patches || []).find(p => p.gid === gid);
        if (!patch) { results.push({ gid, error: 'Not found' }); continue; }
        try {
          const analysis = await analyzePatchNotes(patch.title, patch.contents.slice(0, 12000));
          patch.analyzedAt = new Date().toISOString();
          patch.analysisId = analysis.id;
          results.push({ gid, success: true, analysisId: analysis.id, guidesAffected: analysis.guidesAffected });
        } catch (err) {
          results.push({ gid, error: err.message });
        }
      }
      saveSteamPatches(stored);
      dashAudit(req.userName, 'batch-analyze', `Batch analyzed ${results.filter(r => r.success).length}/${patchGids.length} patches`);
      res.json({ success: true, results });
    } catch (err) {
      res.json({ success: false, error: err.message });
    }
  });

  // Compare two analyses
  app.get('/api/features/guide-indexer/analysis/compare/:id1/:id2', requireAuth, requireTier('admin'), (req, res) => {
    const a1 = F.guideIndexer.analyses.find(a => a.id === req.params.id1);
    const a2 = F.guideIndexer.analyses.find(a => a.id === req.params.id2);
    if (!a1 || !a2) return res.json({ success: false, error: 'One or both analyses not found' });
    // Find guides affected in both, only in a1, only in a2
    const ids1 = new Set((a1.results || []).filter(r => r.changes?.length).map(r => r.guideId));
    const ids2 = new Set((a2.results || []).filter(r => r.changes?.length).map(r => r.guideId));
    const shared = [...ids1].filter(id => ids2.has(id));
    const onlyIn1 = [...ids1].filter(id => !ids2.has(id));
    const onlyIn2 = [...ids2].filter(id => !ids1.has(id));
    res.json({ success: true, comparison: { analysis1: { id: a1.id, patchTitle: a1.patchTitle, date: a1.date, guidesAffected: a1.guidesAffected }, analysis2: { id: a2.id, patchTitle: a2.patchTitle, date: a2.date, guidesAffected: a2.guidesAffected }, shared: shared.length, onlyInFirst: onlyIn1.length, onlyInSecond: onlyIn2.length, sharedGuides: shared, onlyInFirstGuides: onlyIn1, onlyInSecondGuides: onlyIn2 } });
  });

  // Get guide details
  app.get('/api/features/guide-indexer/guide/:id', requireAuth, requireTier('admin'), (req, res) => {
    const guide = F.guideIndexer.guides[req.params.id];
    if (!guide) return res.json({ success: false, error: 'Guide not found' });
    res.json({ success: true, guide });
  });

  // Fetch IdleOn game data from BigCoight/IdleonWikiBot3.0
  app.post('/api/features/guide-indexer/fetch-idleon-data', requireAuth, requireTier('admin'), async (req, res) => {
    try {
      const result = await fetchIdleonGameData();
      dashAudit(req.userName, 'fetch-idleon-data', `Fetched ${result.termCount} IdleOn terms from ${result.sources.length} sources`);
      res.json({ success: true, ...result });
    } catch (err) {
      addLog('error', `IdleOn data fetch failed: ${err.message}`);
      res.json({ success: false, error: err.message });
    }
  });

  // Get cached IdleOn terms info
  app.get('/api/features/guide-indexer/idleon-data', requireAuth, requireTier('admin'), (req, res) => {
    const cached = loadIdleonTerms();
    const terms = cached.terms || [];
    const q = (req.query.q || '').toLowerCase().trim();

    // Categorize terms
    const categories = {};
    const classTerms = ['Beginner','Warrior','Archer','Mage','Journeyman','Barbarian','Squire','Bowman','Hunter','Wizard','Shaman','Blood Berserker','Death Bringer','Divine Knight','Royal Guardian','Siege Breaker','Eagle Eye','Bubonic Conjuror','Elemental Sorcerer'];
    const skillTerms = ['Mining','Choppin','Fishing','Catching','Trapping','Worship','Construction','Cooking','Breeding','Laboratory','Sailing','Divinity','Gaming','Farming','Summoning','Sneaking'];
    for (const t of terms) {
      let cat = 'Other';
      if (classTerms.some(c => t.toLowerCase().includes(c.toLowerCase()))) cat = 'Classes';
      else if (skillTerms.some(s => t.toLowerCase().includes(s.toLowerCase()))) cat = 'Skills';
      else if (/stamp|card|statue|shrine/i.test(t)) cat = 'Collectibles';
      else if (/talent|ability|skill/i.test(t)) cat = 'Talents';
      else if (/quest|npc|mob|boss|enemy/i.test(t)) cat = 'World';
      else if (/item|equip|armor|weapon|ring|pendant|tool/i.test(t)) cat = 'Items';
      else if (/alchemy|bubble|vial|cauldron/i.test(t)) cat = 'Alchemy';
      if (!categories[cat]) categories[cat] = 0;
      categories[cat]++;
    }

    // Calculate usage across guides
    const guides = F.guideIndexer.guides;
    const termUsage = {};
    for (const guide of Object.values(guides)) {
      for (const gt of (guide.gameTerms || [])) {
        termUsage[gt] = (termUsage[gt] || 0) + 1;
      }
    }
    const mostUsed = Object.entries(termUsage).sort((a, b) => b[1] - a[1]).slice(0, 20);
    const unusedCount = terms.filter(t => !termUsage[t]).length;

    // Filter if search query
    const filtered = q ? terms.filter(t => t.toLowerCase().includes(q)) : terms;

    res.json({
      success: true,
      termCount: terms.length,
      fetchedAt: cached.fetchedAt || null,
      sources: cached.meta?.sources || [],
      errors: cached.meta?.errors || [],
      categories,
      mostUsed,
      unusedCount,
      terms: filtered.slice(0, 200),
      totalFiltered: filtered.length,
      staticCount: IDLEON_STATIC_TERMS.length,
    });
  });

  // Delete a single guide from index
  app.delete('/api/features/guide-indexer/guide/:id', requireAuth, requireTier('admin'), (req, res) => {
    delete F.guideIndexer.guides[req.params.id];
    saveState();
    saveGuides({ guides: F.guideIndexer.guides, analyses: F.guideIndexer.analyses });
    dashAudit(req.userName, 'delete-guide-index', `Removed guide ${req.params.id} from index`);
    res.json({ success: true });
  });

  // Bulk delete guides
  app.post('/api/features/guide-indexer/guides/bulk-delete', requireAuth, requireTier('admin'), (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.json({ success: false, error: 'Provide ids array' });
    let deleted = 0;
    for (const id of ids) {
      if (F.guideIndexer.guides[id]) { delete F.guideIndexer.guides[id]; deleted++; }
    }
    saveState();
    saveGuides({ guides: F.guideIndexer.guides, analyses: F.guideIndexer.analyses });
    dashAudit(req.userName, 'bulk-delete-guides', `Bulk deleted ${deleted} guides`);
    res.json({ success: true, deleted });
  });

  // Export a guide as markdown
  app.get('/api/features/guide-indexer/guide/:id/export', requireAuth, requireTier('admin'), (req, res) => {
    const guide = F.guideIndexer.guides[req.params.id];
    if (!guide) return res.json({ success: false, error: 'Guide not found' });
    let md = `# ${guide.title}\n`;
    md += `**Author:** ${guide.authorTag || 'Unknown'} | **Messages:** ${guide.messageCount} | **Last Indexed:** ${guide.lastIndexed}\n`;
    if (guide.tags?.length) md += `**Tags:** ${guide.tags.join(', ')}\n`;
    if (guide.gameTerms?.length) md += `**Game Terms:** ${guide.gameTerms.slice(0, 50).join(', ')}\n`;
    md += '\n---\n\n';
    for (const s of guide.sections) {
      md += `## ${s.heading}\n\n${s.content}\n\n`;
    }
    if (Object.keys(guide.values || {}).length) {
      md += '---\n\n## Extracted Values\n\n| Key | Value |\n|-----|-------|\n';
      for (const [k, v] of Object.entries(guide.values)) {
        md += `| ${k} | ${v} |\n`;
      }
    }
    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="guide-${req.params.id}.md"`);
    res.send(md);
  });

  // Export all guides as JSON
  app.get('/api/features/guide-indexer/guides/export-all', requireAuth, requireTier('admin'), (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="guides-export.json"');
    res.json({ guides: F.guideIndexer.guides, exportedAt: new Date().toISOString() });
  });

  // Re-index a single guide thread
  app.post('/api/features/guide-indexer/guide/:id/reindex', requireAuth, requireTier('admin'), async (req, res) => {
    try {
      const threadId = req.params.id;
      const thread = await client.channels.fetch(threadId).catch(() => null);
      if (!thread) return res.json({ success: false, error: 'Thread not found' });
      const guide = await indexThread(thread);
      if (guide) {
        F.guideIndexer.guides[threadId] = guide;
        saveState();
        saveGuides({ guides: F.guideIndexer.guides, analyses: F.guideIndexer.analyses });
        dashAudit(req.userName, 'reindex-guide', `Re-indexed "${guide.title}"`);
        res.json({ success: true, guide: { title: guide.title, sections: guide.sections.length, values: Object.keys(guide.values || {}).length, gameTerms: guide.gameTerms.length } });
      } else {
        res.json({ success: false, error: 'Could not index thread' });
      }
    } catch (err) {
      res.json({ success: false, error: err.message });
    }
  });

  // ══════════════════════ STEAM PATCH NOTES API ══════════════════════

  // Fetch latest patch notes from Steam
  app.post('/api/features/guide-indexer/steam-patches/fetch', requireAuth, requireTier('admin'), async (req, res) => {
    try {
      const days = Math.min(Math.max(parseInt(req.body.days) || 365, 1), 1500);
      const result = await fetchSteamPatchNotes(days);
      dashAudit(req.userName, 'fetch-steam-patches', `Fetched ${result.totalCount} patches (${result.newCount} new)`);
      res.json({
        success: true,
        newCount: result.newCount,
        totalCount: result.totalCount,
        patches: result.patches.map(p => ({
          gid: p.gid, title: p.title, date: p.date, charCount: p.charCount,
          parsed: p.parsed, analyzedAt: p.analyzedAt, analysisId: p.analysisId,
        })),
      });
    } catch (err) {
      addLog('error', `Steam patch fetch failed: ${err.message}`);
      res.json({ success: false, error: err.message });
    }
  });

  // List cached Steam patches (with search/filter)
  app.get('/api/features/guide-indexer/steam-patches', requireAuth, requireTier('admin'), (req, res) => {
    const stored = loadSteamPatches();
    let patches = stored.patches || [];

    // Search filter
    const q = (req.query.q || '').toLowerCase().trim();
    if (q) patches = patches.filter(p => p.title.toLowerCase().includes(q) || (p.parsed?.allTerms || []).some(t => t.toLowerCase().includes(q)));

    // Date range filter
    if (req.query.from) { const from = new Date(req.query.from).getTime(); patches = patches.filter(p => new Date(p.date).getTime() >= from); }
    if (req.query.to) { const to = new Date(req.query.to).getTime(); patches = patches.filter(p => new Date(p.date).getTime() <= to); }

    // Type filter (e.g. ?type=buff)
    if (req.query.type) { const type = req.query.type.toLowerCase(); patches = patches.filter(p => p.parsed?.types?.[type] > 0); }

    // Analyzed filter
    if (req.query.analyzed === 'true') patches = patches.filter(p => p.analyzedAt);
    if (req.query.analyzed === 'false') patches = patches.filter(p => !p.analyzedAt);

    // Auto-categorize patches
    patches = patches.map(p => {
      const totalChanges = p.parsed?.totalChanges || 0;
      const types = p.parsed?.types || {};
      const category = totalChanges >= 30 ? 'major' : totalChanges >= 10 ? 'minor' : (types.fix || 0) > totalChanges * 0.5 ? 'hotfix' : 'micro';
      const sizeLabel = p.charCount >= 5000 ? 'large' : p.charCount >= 1500 ? 'medium' : 'small';
      return {
        gid: p.gid, title: p.title, date: p.date, url: p.url, author: p.author,
        charCount: p.charCount, parsed: p.parsed,
        analyzedAt: p.analyzedAt, analysisId: p.analysisId, notifiedAt: p.notifiedAt,
        category, sizeLabel,
      };
    });

    // Summary stats
    const allPatches = stored.patches || [];
    const stats = {
      total: allPatches.length,
      analyzed: allPatches.filter(p => p.analyzedAt).length,
      notified: allPatches.filter(p => p.notifiedAt).length,
      avgChanges: allPatches.length > 0 ? Math.round(allPatches.reduce((s, p) => s + (p.parsed?.totalChanges || 0), 0) / allPatches.length) : 0,
      typeBreakdown: allPatches.reduce((acc, p) => { for (const [t, c] of Object.entries(p.parsed?.types || {})) acc[t] = (acc[t] || 0) + c; return acc; }, {}),
    };

    res.json({
      success: true,
      lastFetchedAt: stored.lastFetchedAt,
      patches,
      stats,
      filtered: patches.length,
    });
  });

  // Compare two patches (term diff)
  app.get('/api/features/guide-indexer/steam-patches/compare/:gid1/:gid2', requireAuth, requireTier('admin'), (req, res) => {
    const stored = loadSteamPatches();
    const p1 = (stored.patches || []).find(p => p.gid === req.params.gid1);
    const p2 = (stored.patches || []).find(p => p.gid === req.params.gid2);
    if (!p1 || !p2) return res.json({ success: false, error: 'One or both patches not found' });
    const terms1 = new Set(p1.parsed?.allTerms || []);
    const terms2 = new Set(p2.parsed?.allTerms || []);
    const shared = [...terms1].filter(t => terms2.has(t));
    const onlyIn1 = [...terms1].filter(t => !terms2.has(t));
    const onlyIn2 = [...terms2].filter(t => !terms1.has(t));
    res.json({
      success: true,
      patch1: { gid: p1.gid, title: p1.title, date: p1.date, changes: p1.parsed?.totalChanges || 0, terms: terms1.size },
      patch2: { gid: p2.gid, title: p2.title, date: p2.date, changes: p2.parsed?.totalChanges || 0, terms: terms2.size },
      shared: shared.length, sharedTerms: shared.slice(0, 50),
      onlyInFirst: onlyIn1.length, onlyInFirstTerms: onlyIn1.slice(0, 50),
      onlyInSecond: onlyIn2.length, onlyInSecondTerms: onlyIn2.slice(0, 50),
    });
  });

  // Get full patch note content by gid
  app.get('/api/features/guide-indexer/steam-patches/:gid', requireAuth, requireTier('admin'), (req, res) => {
    const stored = loadSteamPatches();
    const patch = (stored.patches || []).find(p => p.gid === req.params.gid);
    if (!patch) return res.json({ success: false, error: 'Patch not found' });
    res.json({ success: true, patch });
  });

  // Analyze a specific Steam patch (auto-fill title + text from stored patch)
  app.post('/api/features/guide-indexer/steam-patches/:gid/analyze', requireAuth, requireTier('admin'), async (req, res) => {
    try {
      const stored = loadSteamPatches();
      const patch = (stored.patches || []).find(p => p.gid === req.params.gid);
      if (!patch) return res.json({ success: false, error: 'Patch not found' });

      const analysis = await analyzePatchNotes(patch.title, patch.contents.slice(0, 12000));
      patch.analyzedAt = new Date().toISOString();
      patch.analysisId = analysis.id;
      saveSteamPatches(stored);

      dashAudit(req.userName, 'analyze-steam-patch', `Analyzed Steam patch "${patch.title}" — ${analysis.guidesAffected} guides affected`);
      res.json({ success: true, analysis });
    } catch (err) {
      addLog('error', `Steam patch analysis failed: ${err.message}`);
      res.json({ success: false, error: err.message });
    }
  });

  // Notify guide threads about a specific patch
  app.post('/api/features/guide-indexer/steam-patches/:gid/notify', requireAuth, requireTier('admin'), async (req, res) => {
    try {
      const stored = loadSteamPatches();
      const patch = (stored.patches || []).find(p => p.gid === req.params.gid);
      if (!patch) return res.json({ success: false, error: 'Patch not found' });

      const result = await notifyGuidesOfPatchChanges(patch);
      patch.notifiedAt = new Date().toISOString();
      patch.notifyResult = { notified: result.notified, skipped: result.skipped };
      saveSteamPatches(stored);

      dashAudit(req.userName, 'notify-guides-patch', `Notified ${result.notified} guide(s) about patch "${patch.title}"`);
      res.json({ success: true, notified: result.notified, skipped: result.skipped });
    } catch (err) {
      addLog('error', `Guide notification failed: ${err.message}`);
      res.json({ success: false, error: err.message });
    }
  });

  // Delete a stored Steam patch
  app.delete('/api/features/guide-indexer/steam-patches/:gid', requireAuth, requireTier('admin'), (req, res) => {
    const stored = loadSteamPatches();
    const idx = (stored.patches || []).findIndex(p => p.gid === req.params.gid);
    if (idx === -1) return res.json({ success: false, error: 'Patch not found' });
    stored.patches.splice(idx, 1);
    saveSteamPatches(stored);
    dashAudit(req.userName, 'delete-steam-patch', `Deleted Steam patch ${req.params.gid}`);
    res.json({ success: true });
  });

  // Update guide content from dashboard editor
  app.post('/api/features/guide-indexer/guide/:id/update', requireAuth, requireTier('admin'), (req, res) => {
    const guide = F.guideIndexer.guides[req.params.id];
    if (!guide) return res.json({ success: false, error: 'Guide not found' });

    const { sections } = req.body;
    if (Array.isArray(sections)) {
      guide.sections = sections.map(s => ({
        heading: String(s.heading || '').slice(0, 200),
        content: String(s.content || '').slice(0, 10000),
      }));
      guide.lastEdited = new Date().toISOString();
    }
    saveState();
    saveGuides({ guides: F.guideIndexer.guides, analyses: F.guideIndexer.analyses });
    dashAudit(req.userName, 'edit-guide', `Edited guide "${guide.title}" (${req.params.id})`);
    res.json({ success: true });
  });

  // Re-post guide to Discord (delete old messages, post updated content + images)
  app.post('/api/features/guide-indexer/guide/:id/repost', requireAuth, requireTier('admin'), async (req, res) => {
    const guide = F.guideIndexer.guides[req.params.id];
    if (!guide) return res.json({ success: false, error: 'Guide not found' });

    try {
      const thread = await client.channels.fetch(guide.threadId).catch(() => null);
      if (!thread) return res.json({ success: false, error: 'Thread not found or inaccessible' });

      // Unarchive if needed
      if (thread.archived) await thread.setArchived(false);

      // Delete old messages (the ones we indexed)
      if (guide.messageIds?.length) {
        for (const msgId of guide.messageIds) {
          try {
            const msg = await thread.messages.fetch(msgId).catch(() => null);
            if (msg?.deletable) await msg.delete();
          } catch { /* skip undeletable */ }
        }
      }

      // Rebuild content from sections
      const contentParts = [];
      for (const section of guide.sections) {
        contentParts.push(`## ${section.heading}\n${section.content}`);
      }
      const fullContent = contentParts.join('\n\n');

      // Split into 2000-char messages (Discord limit)
      const chunks = [];
      let current = '';
      for (const line of fullContent.split('\n')) {
        if ((current + '\n' + line).length > 1900) {
          chunks.push(current);
          current = line;
        } else {
          current += (current ? '\n' : '') + line;
        }
      }
      if (current) chunks.push(current);

      // Attach images to first message
      const files = [];
      if (guide.images?.length) {
        for (const img of guide.images) {
          const absPath = path.join(UPLOADS_DIR, '..', '..', img.local.replace(/^\/uploads\//, ''));
          const resolvedPath = path.resolve(UPLOADS_DIR, '..', img.local.replace(/^\/uploads\/guides\//, ''));
          // Try both path resolution approaches
          const filePath = fs.existsSync(resolvedPath) ? resolvedPath : absPath;
          if (fs.existsSync(filePath)) {
            files.push(new AttachmentBuilder(filePath, { name: img.name }));
          }
        }
      }

      // Post the new messages
      const newMessageIds = [];
      for (let i = 0; i < chunks.length; i++) {
        const opts = { content: chunks[i] };
        if (i === 0 && files.length) opts.files = files;
        const sent = await thread.send(opts);
        newMessageIds.push(sent.id);
      }

      // Update stored message IDs
      guide.messageIds = newMessageIds;
      guide.lastReposted = new Date().toISOString();
      saveState();
      saveGuides({ guides: F.guideIndexer.guides, analyses: F.guideIndexer.analyses });

      dashAudit(req.userName, 'repost-guide', `Re-posted guide "${guide.title}" (${guide.threadId})`);
      addLog('info', `Guide indexer: Re-posted "${guide.title}" with ${chunks.length} message(s) and ${files.length} image(s)`);
      res.json({ success: true, messagesSent: chunks.length, imagesSent: files.length });
    } catch (err) {
      addLog('error', `Guide re-post failed for ${req.params.id}: ${err.message}`);
      res.json({ success: false, error: err.message });
    }
  });

  // Get notification history
  app.get('/api/features/guide-indexer/notification-history', requireAuth, requireTier('admin'), (req, res) => {
    const history = (F.guideIndexer.notificationHistory || []).slice(-100).reverse();
    res.json({ success: true, history, total: (F.guideIndexer.notificationHistory || []).length });
  });

  // Preview notification (dry-run: show what would be notified without actually sending)
  app.post('/api/features/guide-indexer/steam-patches/:gid/notify-preview', requireAuth, requireTier('admin'), (req, res) => {
    const stored = loadSteamPatches();
    const patch = (stored.patches || []).find(p => p.gid === req.params.gid);
    if (!patch) return res.json({ success: false, error: 'Patch not found' });

    const parsed = parsePatchNotes(patch.contents || '');
    const patchTerms = new Set(parsed.flatMap(c => c.terms).map(t => t.toLowerCase()));
    const guides = F.guideIndexer.guides;
    const preview = [];

    for (const [threadId, guide] of Object.entries(guides)) {
      const guideTermsLower = (guide.gameTerms || []).map(t => t.toLowerCase());
      const matches = guideTermsLower.filter(t => patchTerms.has(t));
      if (matches.length === 0) continue;
      // Check cooldown
      const cooldownMs = (F.guideIndexer.notifyCooldownHours || 12) * 60 * 60 * 1000;
      const history = F.guideIndexer.notificationHistory || [];
      const cooldownKey = `${threadId}:${patch.gid}`;
      const lastNotify = history.find(h => h.key === cooldownKey);
      const onCooldown = lastNotify && (Date.now() - new Date(lastNotify.date).getTime()) < cooldownMs;

      preview.push({
        threadId, title: guide.title, matches: matches.length, matchedTerms: matches.slice(0, 15),
        onCooldown, lastNotifiedAt: lastNotify?.date || null,
      });
    }

    res.json({ success: true, preview, totalGuides: Object.keys(guides).length, wouldNotify: preview.filter(p => !p.onCooldown).length });
  });

  // Auto-bump config
  app.post('/api/features/guide-indexer/bump-config', requireAuth, requireTier('admin'), (req, res) => {
    const { autoBumpEnabled, autoBumpIntervalHours, bumpStaggerMs, bumpSkipRecentHours, bumpMessageEnabled, bumpMessage } = req.body;
    if (typeof autoBumpEnabled === 'boolean') F.guideIndexer.autoBumpEnabled = autoBumpEnabled;
    if (typeof autoBumpIntervalHours === 'number') F.guideIndexer.autoBumpIntervalHours = Math.max(1, Math.min(168, autoBumpIntervalHours));
    if (typeof bumpStaggerMs === 'number') F.guideIndexer.bumpStaggerMs = Math.max(500, Math.min(10000, bumpStaggerMs));
    if (typeof bumpSkipRecentHours === 'number') F.guideIndexer.bumpSkipRecentHours = Math.max(0, Math.min(168, bumpSkipRecentHours));
    if (typeof bumpMessageEnabled === 'boolean') F.guideIndexer.bumpMessageEnabled = bumpMessageEnabled;
    if (typeof bumpMessage === 'string' && bumpMessage.length <= 200) F.guideIndexer.bumpMessage = bumpMessage;
    saveState();
    dashAudit(req.userName, 'bump-config', `Auto-bump: ${F.guideIndexer.autoBumpEnabled ? 'ON' : 'OFF'} (${F.guideIndexer.autoBumpIntervalHours}h)`);
    res.json({ success: true });
  });

  // Manual bump all threads
  app.post('/api/features/guide-indexer/bump', requireAuth, requireTier('admin'), async (req, res) => {
    try {
      const results = await bumpAllThreads();
      dashAudit(req.userName, 'manual-bump', `Bumped ${results.bumped}/${results.total} threads`);
      res.json({ success: true, ...results });
    } catch (err) {
      res.json({ success: false, error: err.message });
    }
  });

  // Bump single thread
  app.post('/api/features/guide-indexer/bump/:threadId', requireAuth, requireTier('admin'), async (req, res) => {
    try {
      const tid = req.params.threadId;
      const guide = F.guideIndexer.guides[tid];
      if (!guide) return res.json({ success: false, error: 'Thread not found' });
      const thread = await client.channels.fetch(tid).catch(() => null);
      if (!thread) return res.json({ success: false, error: 'Cannot access thread' });
      if (thread.archived) await thread.setArchived(false);
      if (F.guideIndexer.bumpMessageEnabled && F.guideIndexer.bumpMessage) {
        await thread.send(F.guideIndexer.bumpMessage).catch(() => null);
      }
      guide.lastBumpAt = new Date().toISOString();
      guide.bumpCount = (guide.bumpCount || 0) + 1;
      if (!F.guideIndexer.bumpHistory) F.guideIndexer.bumpHistory = [];
      F.guideIndexer.bumpHistory.push({ threadId: tid, title: guide.title, date: new Date().toISOString(), type: 'manual-single' });
      if (F.guideIndexer.bumpHistory.length > 200) F.guideIndexer.bumpHistory = F.guideIndexer.bumpHistory.slice(-200);
      saveState();
      dashAudit(req.userName, 'bump-single', `Bumped thread: ${guide.title}`);
      res.json({ success: true, threadId: tid, title: guide.title });
    } catch (err) {
      res.json({ success: false, error: err.message });
    }
  });

  // Get bump history
  app.get('/api/features/guide-indexer/bump-history', requireAuth, requireTier('admin'), (req, res) => {
    const history = (F.guideIndexer.bumpHistory || []).slice(-100).reverse();
    res.json({ success: true, history, total: (F.guideIndexer.bumpHistory || []).length });
  });

  // Get bump config
  app.get('/api/features/guide-indexer/bump-config', requireAuth, requireTier('admin'), (req, res) => {
    res.json({
      success: true,
      autoBumpEnabled: F.guideIndexer.autoBumpEnabled,
      autoBumpIntervalHours: F.guideIndexer.autoBumpIntervalHours,
      lastBumpAt: F.guideIndexer.lastBumpAt,
      bumpStaggerMs: F.guideIndexer.bumpStaggerMs || 2000,
      bumpSkipRecentHours: F.guideIndexer.bumpSkipRecentHours || 2,
      bumpMessageEnabled: !!F.guideIndexer.bumpMessageEnabled,
      bumpMessage: F.guideIndexer.bumpMessage || '',
      totalBumps: (F.guideIndexer.bumpHistory || []).length,
    });
  });

  // Performance stats endpoint
  app.get('/api/features/guide-indexer/stats', requireAuth, requireTier('admin'), (req, res) => {
    const guides = F.guideIndexer.guides;
    const guideCount = Object.keys(guides).length;
    const cached = loadIdleonTerms();
    const steamData = loadSteamPatches();
    const analyses = F.guideIndexer.analyses || [];

    // Calculate data sizes
    const guideTermCounts = Object.values(guides).map(g => (g.gameTerms || []).length);
    const avgTerms = guideTermCounts.length ? Math.round(guideTermCounts.reduce((a, b) => a + b, 0) / guideTermCounts.length) : 0;

    // Guide freshness
    const now = Date.now();
    const guidesOlderThan30d = Object.values(guides).filter(g => g.indexedAt && (now - new Date(g.indexedAt).getTime()) > 30 * 86400000).length;
    const guidesNeverBumped = Object.values(guides).filter(g => !g.lastBumpAt).length;

    res.json({
      success: true,
      performance: {
        cacheStatus: {
          guides: !!_cache.guides,
          idleonTerms: !!_cache.idleonTerms,
          steamPatches: !!_cache.steamPatches,
        },
        pendingSaves: {
          guides: !!_saveTimers.guides,
          idleonTerms: !!_saveTimers.idleonTerms,
          steamPatches: !!_saveTimers.steamPatches,
        },
        saveDebounceMs: SAVE_DEBOUNCE_MS,
      },
      data: {
        guideCount,
        analysisCount: analyses.length,
        idleonTermCount: (cached.terms || []).length,
        steamPatchCount: (steamData.patches || []).length,
        notificationHistoryCount: (F.guideIndexer.notificationHistory || []).length,
        bumpHistoryCount: (F.guideIndexer.bumpHistory || []).length,
      },
      health: {
        avgTermsPerGuide: avgTerms,
        guidesOlderThan30d,
        guidesNeverBumped,
        idleonDataAge: cached.fetchedAt ? Math.round((now - new Date(cached.fetchedAt).getTime()) / 86400000) + 'd' : 'never',
        steamLastFetch: steamData.lastFetchedAt ? Math.round((now - new Date(steamData.lastFetchedAt).getTime()) / 86400000) + 'd' : 'never',
      },
    });
  });

  // ── Bump all indexed threads to prevent archival ──
  async function bumpAllThreads() {
    const guides = F.guideIndexer.guides;
    const threadIds = Object.keys(guides);
    let bumped = 0, failed = 0, skipped = 0;
    const staggerMs = F.guideIndexer.bumpStaggerMs || 2000;
    const skipRecentHours = F.guideIndexer.bumpSkipRecentHours || 0;
    const skipRecentMs = skipRecentHours * 60 * 60 * 1000;
    const now = Date.now();
    const results = [];

    for (const tid of threadIds) {
      try {
        const guide = guides[tid];

        // Skip recently-active threads
        if (skipRecentMs > 0 && guide.lastEdited) {
          const lastActive = new Date(guide.lastEdited).getTime();
          if ((now - lastActive) < skipRecentMs) {
            skipped++;
            results.push({ threadId: tid, title: guide.title, status: 'skipped-recent' });
            continue;
          }
        }

        const thread = await client.channels.fetch(tid).catch(() => null);
        if (!thread) { failed++; results.push({ threadId: tid, title: guide.title, status: 'not-found' }); continue; }
        if (thread.archived) {
          await thread.setArchived(false);
        }
        // Optionally send bump message
        if (F.guideIndexer.bumpMessageEnabled && F.guideIndexer.bumpMessage) {
          await thread.send(F.guideIndexer.bumpMessage).catch(() => null);
        }
        guide.lastBumpAt = new Date().toISOString();
        guide.bumpCount = (guide.bumpCount || 0) + 1;
        bumped++;
        results.push({ threadId: tid, title: guide.title, status: 'bumped' });

        // Stagger to avoid rate limits
        if (staggerMs > 0 && threadIds.indexOf(tid) < threadIds.length - 1) {
          await new Promise(r => setTimeout(r, staggerMs));
        }
      } catch {
        failed++;
        results.push({ threadId: tid, title: guides[tid]?.title || tid, status: 'error' });
      }
    }

    F.guideIndexer.lastBumpAt = new Date().toISOString();
    // Record bump history
    if (!F.guideIndexer.bumpHistory) F.guideIndexer.bumpHistory = [];
    F.guideIndexer.bumpHistory.push({
      date: new Date().toISOString(),
      type: 'bulk',
      total: threadIds.length,
      bumped, failed, skipped,
    });
    if (F.guideIndexer.bumpHistory.length > 200) F.guideIndexer.bumpHistory = F.guideIndexer.bumpHistory.slice(-200);
    saveState();
    addLog('info', `Guide indexer: Bumped ${bumped}/${threadIds.length} threads (${failed} failed, ${skipped} skipped)`);
    return { total: threadIds.length, bumped, failed, skipped, results };
  }

  // ── Background task: auto‑scan ──
  const bgTasks = [];
  if (F.guideIndexer.autoScanInterval > 0) {
    bgTasks.push({
      fn: async () => {
        if (!F.guideIndexer.enabled || F.guideIndexer.forumChannelIds.length === 0) return;
        try {
          for (const cid of F.guideIndexer.forumChannelIds) {
            await scanForum(cid);
          }
          addLog('info', 'Guide indexer: Auto-scan completed');
        } catch (err) {
          addLog('error', `Guide auto-scan failed: ${err.message}`);
        }
      },
      intervalMs: F.guideIndexer.autoScanInterval * 60 * 60 * 1000,
      runOnStart: false,
    });
  }

  // ── Background task: auto‑bump ──
  bgTasks.push({
    fn: async () => {
      if (!F.guideIndexer.autoBumpEnabled || Object.keys(F.guideIndexer.guides).length === 0) return;
      try {
        await bumpAllThreads();
      } catch (err) {
        addLog('error', `Guide auto-bump failed: ${err.message}`);
      }
    },
    intervalMs: (F.guideIndexer.autoBumpIntervalHours || 23) * 60 * 60 * 1000,
    runOnStart: false,
  });

  // ── Background task: auto‑fetch Steam patch notes (every 6h) + auto-notify ──
  bgTasks.push({
    fn: async () => {
      try {
        const result = await fetchSteamPatchNotes(365);
        if (result.newCount > 0) {
          addLog('info', `Guide indexer: Auto-fetched ${result.newCount} new Steam patch note(s)`);
          // Auto-notify affected guide threads
          if (F.guideIndexer.autoNotifyEnabled !== false && Object.keys(F.guideIndexer.guides).length > 0) {
            for (const patch of result.newPatches || []) {
              try {
                const nr = await notifyGuidesOfPatchChanges(patch);
                if (nr.notified > 0) {
                  addLog('info', `Guide indexer: Auto-notified ${nr.notified} guide thread(s) about "${patch.title}"`);
                }
              } catch (err) {
                addLog('warn', `Guide indexer: Auto-notify failed for "${patch.title}": ${err.message}`);
              }
            }
          }
        }
      } catch (err) {
        addLog('error', `Steam patch auto-fetch failed: ${err.message}`);
      }
    },
    intervalMs: 6 * 60 * 60 * 1000,
    runOnStart: true,
  });

  return {
    hooks: {},
    backgroundTasks: bgTasks,
    masterData: () => ({
      guideIndexer: {
        enabled: F.guideIndexer.enabled,
        totalGuides: Object.keys(F.guideIndexer.guides).length,
        totalAnalyses: (F.guideIndexer.analyses || []).length,
        autoBumpEnabled: F.guideIndexer.autoBumpEnabled,
        lastBumpAt: F.guideIndexer.lastBumpAt,
      }
    }),
    exports: {
      scanForum,
      analyzePatchNotes,
      parsePatchNotes,
      formatAnalysisForDiscord,
      formatAnalysisAsMarkdown,
      indexThread,
      bumpAllThreads,
      fetchIdleonGameData,
      fetchSteamPatchNotes,
      notifyGuidesOfPatchChanges,
      flushCaches() {
        // Force write all pending saves immediately (useful before shutdown)
        for (const key of Object.keys(_saveTimers)) {
          if (_saveTimers[key]) { clearTimeout(_saveTimers[key]); _saveTimers[key] = null; }
        }
        if (_cache.guides) try { fs.writeFileSync(GUIDES_PATH, JSON.stringify(_cache.guides, null, 2)); } catch {}
        if (_cache.idleonTerms) try { fs.writeFileSync(IDLEON_CACHE_PATH, JSON.stringify(_cache.idleonTerms, null, 2)); } catch {}
        if (_cache.steamPatches) try { fs.writeFileSync(STEAM_PATCHES_PATH, JSON.stringify(_cache.steamPatches, null, 2)); } catch {}
      },
    },
  };
}
