import fs from 'fs';
import path from 'path';
import { AttachmentBuilder } from 'discord.js';

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
  };

  // ── Persistence helpers ──
  function loadGuides() {
    try { return JSON.parse(fs.readFileSync(GUIDES_PATH, 'utf8')); }
    catch { return { guides: {}, analyses: [] }; }
  }
  function saveGuides(data) {
    fs.writeFileSync(GUIDES_PATH, JSON.stringify(data, null, 2));
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
    try { return JSON.parse(fs.readFileSync(IDLEON_CACHE_PATH, 'utf8')); }
    catch { return { terms: [], fetchedAt: null }; }
  }
  function saveIdleonTerms(data) {
    fs.writeFileSync(IDLEON_CACHE_PATH, JSON.stringify(data, null, 2));
  }
  function loadSteamPatches() {
    try { return JSON.parse(fs.readFileSync(STEAM_PATCHES_PATH, 'utf8')); }
    catch { return { patches: [], lastFetchedAt: null }; }
  }
  function saveSteamPatches(data) {
    fs.writeFileSync(STEAM_PATCHES_PATH, JSON.stringify(data, null, 2));
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
    return { patches: stored.patches, newCount, totalCount: stored.patches.length };
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
  async function analyzePatchNotes(patchTitle, patchText) {
    const guides = F.guideIndexer.guides;
    const guideCount = Object.keys(guides).length;
    if (guideCount === 0) throw new Error('No guides indexed yet. Scan a forum first.');

    // Parse patch notes into structured changes
    const patchChanges = parsePatchNotes(patchText);
    const patchTerms = [...new Set(patchChanges.flatMap(c => c.terms))];

    // Build compact guide summaries with game terms for AI context
    const guideSummaries = Object.entries(guides).map(([id, g]) => {
      const sectionList = g.sections.map(s => `  [${s.heading}]: ${s.content.slice(0, 150)}`).join('\n');
      const terms = (g.gameTerms || []).slice(0, 40).join(', ');
      const valueList = Object.entries(g.values || {}).slice(0, 15).map(([k, v]) => `  ${k}: ${v}`).join('\n');
      // Find how many patch terms overlap with this guide
      const guideTermsLower = (g.gameTerms || []).map(t => t.toLowerCase());
      const overlap = patchTerms.filter(t => guideTermsLower.includes(t.toLowerCase()));
      const overlapNote = overlap.length > 0 ? `\n⚠️ PATCH MATCHES: ${overlap.join(', ')}` : '';
      return `GUIDE "${g.title}" (ID:${id}, tags: ${g.tags.join(', ') || 'none'})\nGame Terms: ${terms || 'none'}\nSections:\n${sectionList}\n${valueList ? 'Values:\n' + valueList : ''}${overlapNote}`;
    }).join('\n---\n');

    // Build structured patch summary
    const patchSummary = patchChanges.map(c => {
      let line = `[${c.type.toUpperCase()}] ${c.text.slice(0, 200)}`;
      if (c.terms.length) line += `\n  Terms: ${c.terms.join(', ')}`;
      if (c.numericChanges.length) line += `\n  Numbers: ${c.numericChanges.map(n => n.from ? `${n.from} → ${n.to}` : n.multiplier ? n.multiplier : `max ${n.max}`).join(', ')}`;
      return line;
    }).join('\n');

    // Trim if too large (keep under ~8000 chars for AI context)
    const maxCtx = 8000;
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

    const userPrompt = `EXISTING GUIDES:\n${trimmedSummaries}\n\n---\nPATCH NOTES: "${patchTitle}"\n\nSTRUCTURED CHANGES:\n${patchSummary}\n\nRAW PATCH TEXT:\n${patchText}`;

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

    // Store analysis
    const analysis = {
      id: Date.now().toString(36),
      date: new Date().toISOString(),
      patchTitle,
      patchText: patchText.slice(0, 2000),
      results,
      guidesAffected: results.filter(r => r.changes?.length > 0).length,
    };
    F.guideIndexer.analyses.unshift(analysis);
    if (F.guideIndexer.analyses.length > 50) F.guideIndexer.analyses.length = 50;
    saveState();
    saveGuides({ guides: F.guideIndexer.guides, analyses: F.guideIndexer.analyses });

    return analysis;
  }

  // ── Format analysis as Discord embed text ──
  function formatAnalysisForDiscord(analysis) {
    if (!analysis.results || analysis.results.length === 0) {
      return '✅ No guides need updating based on these patch notes.';
    }

    const icons = { CERTAIN: '🔴', PROBABLE: '🟡', POSSIBLE: '🟠' };
    let text = `📋 **${analysis.patchTitle}** — ${analysis.guidesAffected} guide(s) to update\n\n`;

    for (const r of analysis.results) {
      if (!r.changes?.length) continue;
      text += `${icons[r.confidence] || '⚪'} **${r.confidence}** — "${r.guideTitle}"\n`;
      for (const c of r.changes) {
        const val = c.oldValue && c.newValue ? ` \`${c.oldValue}\` → \`${c.newValue}\`` : '';
        text += `  • **${c.section}** → ${c.item}${val}\n`;
        if (c.note) text += `    _${c.note}_\n`;
      }
      text += '\n';
    }

    return text.slice(0, 4000); // Discord limit
  }

  // ══════════════════════ API ROUTES ══════════════════════

  // Get config & stats
  app.get('/api/features/guide-indexer', requireAuth, requireTier('admin'), (req, res) => {
    const guides = F.guideIndexer.guides;
    const guideList = Object.entries(guides).map(([id, g]) => ({
      id, title: g.title, sections: g.sections.length, values: Object.keys(g.values || {}).length,
      gameTerms: (g.gameTerms || []).length,
      images: (g.images || []).length,
      tags: g.tags, lastIndexed: g.lastIndexed, messageCount: g.messageCount, authorTag: g.authorTag,
    }));
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
      },
      stats: { totalGuides: guideList.length, totalAnalyses: F.guideIndexer.analyses.length },
      guides: guideList,
      analyses: (F.guideIndexer.analyses || []).slice(0, 20).map(a => ({
        id: a.id, date: a.date, patchTitle: a.patchTitle, guidesAffected: a.guidesAffected,
      })),
    });
  });

  // Update config
  app.post('/api/features/guide-indexer/config', requireAuth, requireTier('admin'), (req, res) => {
    const { enabled, forumChannelIds, autoScanInterval } = req.body;
    if (typeof enabled === 'boolean') F.guideIndexer.enabled = enabled;
    if (Array.isArray(forumChannelIds)) F.guideIndexer.forumChannelIds = forumChannelIds.map(String).slice(0, 10);
    if (typeof autoScanInterval === 'number') F.guideIndexer.autoScanInterval = Math.max(0, Math.min(168, autoScanInterval));
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
    res.json({
      success: true,
      termCount: (cached.terms || []).length,
      fetchedAt: cached.fetchedAt || null,
      sources: cached.meta?.sources || [],
      errors: cached.meta?.errors || [],
      sampleTerms: (cached.terms || []).slice(0, 50),
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

  // List cached Steam patches
  app.get('/api/features/guide-indexer/steam-patches', requireAuth, requireTier('admin'), (req, res) => {
    const stored = loadSteamPatches();
    res.json({
      success: true,
      lastFetchedAt: stored.lastFetchedAt,
      patches: (stored.patches || []).map(p => ({
        gid: p.gid, title: p.title, date: p.date, url: p.url, author: p.author,
        charCount: p.charCount, parsed: p.parsed,
        analyzedAt: p.analyzedAt, analysisId: p.analysisId,
      })),
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

  // Auto-bump config
  app.post('/api/features/guide-indexer/bump-config', requireAuth, requireTier('admin'), (req, res) => {
    const { autoBumpEnabled, autoBumpIntervalHours } = req.body;
    if (typeof autoBumpEnabled === 'boolean') F.guideIndexer.autoBumpEnabled = autoBumpEnabled;
    if (typeof autoBumpIntervalHours === 'number') F.guideIndexer.autoBumpIntervalHours = Math.max(1, Math.min(168, autoBumpIntervalHours));
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

  // ── Bump all indexed threads to prevent archival ──
  async function bumpAllThreads() {
    const guides = F.guideIndexer.guides;
    const threadIds = Object.keys(guides);
    let bumped = 0, failed = 0;

    for (const tid of threadIds) {
      try {
        const thread = await client.channels.fetch(tid).catch(() => null);
        if (!thread) { failed++; continue; }
        if (thread.archived) {
          await thread.setArchived(false);
        }
        bumped++;
      } catch {
        failed++;
      }
    }

    F.guideIndexer.lastBumpAt = new Date().toISOString();
    saveState();
    addLog('info', `Guide indexer: Bumped ${bumped}/${threadIds.length} threads (${failed} failed)`);
    return { total: threadIds.length, bumped, failed };
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

  // ── Background task: auto‑fetch Steam patch notes (every 6h) ──
  bgTasks.push({
    fn: async () => {
      try {
        const result = await fetchSteamPatchNotes(365);
        if (result.newCount > 0) {
          addLog('info', `Guide indexer: Auto-fetched ${result.newCount} new Steam patch note(s)`);
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
      indexThread,
      bumpAllThreads,
      fetchIdleonGameData,
      fetchSteamPatchNotes,
    },
  };
}
