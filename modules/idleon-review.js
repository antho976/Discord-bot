/**
 * Idleon Account Review — Analyzer Module
 * Parses an Idleon JSON save and produces per-system scores + recommendations.
 */

// ── Tier definitions ──
const TIERS = ['early', 'mid', 'late', 'endgame', 'ultra'];
const TIER_LABELS = { early: 'Early Game', mid: 'Mid Game', late: 'Late Game', endgame: 'Endgame', ultra: 'Ultra Endgame' };
const TIER_COLORS = { early: '#4caf50', mid: '#2196f3', late: '#ff9800', endgame: '#e91e63', ultra: '#b794f6' };

// ── Class name map ──
const CLASS_MAP = {
  1:'Beginner',2:'Journeyman',3:'Maestro',4:'Virtuoso',
  7:'Warrior',8:'Barbarian',9:'Squire',10:'Blood Berserker',11:'Divine Knight',
  14:'Archer',15:'Bowman',16:'Hunter',17:'Siege Breaker',18:'Beast Master',
  21:'Mage',22:'Wizard',23:'Shaman',24:'Elemental Sorcerer',25:'Bubonic Conjuror',
  27:'Beginner',28:'Voidwalker',29:'Infinilyte',
  31:'Warrior',32:'Barbarian',33:'Squire',34:'Blood Berserker',35:'Divine Knight',
  37:'Archer',38:'Bowman',39:'Hunter',40:'Siege Breaker',41:'Beast Master',
  12:'Jman',14:'Archer',22:'Wizard',29:'Infinilyte',40:'Beast Master',
};

// ── Skill name map (index in Lv0_X) ──
const SKILL_NAMES = [
  'Character','Mining','Smithing','Chopping','Fishing','Alchemy',
  'Catching','Trapping','Construction','Worship','Cooking','Breeding',
  'Lab','Sailing','Divinity','Gaming','Farming','Sneaking','Summoning','Hole','W7Skill'
];

/**
 * Detect the player's overall tier based on AFK targets, levels, and unlocked systems.
 */
function detectTier(save) {
  const data = save.data || {};
  // Check highest world from AFK targets
  let maxWorld = 0;
  for (let i = 0; i < 12; i++) {
    const afk = data[`AFKtarget_${i}`] || '';
    const m = afk.match(/^w(\d+)/);
    if (m) maxWorld = Math.max(maxWorld, parseInt(m[1]));
  }
  // Check max character level
  let maxLevel = 0;
  for (let i = 0; i < 12; i++) {
    const lv = data[`Lv0_${i}`];
    if (Array.isArray(lv) && lv[0] > maxLevel) maxLevel = lv[0];
  }

  if (maxWorld >= 7 || maxLevel >= 800) return 'ultra';
  if (maxWorld >= 6 || maxLevel >= 500) return 'endgame';
  if (maxWorld >= 4 || maxLevel >= 250) return 'late';
  if (maxWorld >= 3 || maxLevel >= 100) return 'mid';
  return 'early';
}

/**
 * Parse characters from the save.
 */
function parseCharacters(save) {
  const data = save.data || {};
  const names = save.charNames || [];
  const chars = [];
  for (let i = 0; i < names.length; i++) {
    const lvArr = data[`Lv0_${i}`];
    const skills = Array.isArray(lvArr) ? lvArr : [];
    const cls = data[`CharacterClass_${i}`] || 0;
    const afk = data[`AFKtarget_${i}`] || '';
    chars.push({
      index: i,
      name: names[i] || `Char_${i}`,
      classId: cls,
      className: CLASS_MAP[cls] || `Class ${cls}`,
      level: skills[0] || 0,
      skills: skills.slice(0, SKILL_NAMES.length),
      afkTarget: afk,
      afkWorld: afk.match(/^w(\d+)/)?.[1] || '?',
    });
  }
  return chars;
}

/**
 * Score a single system 0-5.
 * Each system scorer returns { score: 0-5, detail: string, tier: string }
 */
const systemScorers = {

  stamps(save, tier) {
    const stamps = save.data?.StampLv;
    if (!Array.isArray(stamps) || stamps.length === 0) return { score: 0, detail: 'No stamp data found', tier: 'early' };
    let totalLeveled = 0, totalStamps = 0, totalLevels = 0, maxLv = 0;
    for (const tab of stamps) {
      if (tab && typeof tab === 'object' && !Array.isArray(tab)) {
        const vals = Object.values(tab).filter(v => typeof v === 'number');
        totalStamps += vals.length;
        totalLeveled += vals.filter(v => v > 0).length;
        totalLevels += vals.reduce((a, b) => a + Math.max(0, b), 0);
        for (const v of vals) if (v > maxLv) maxLv = v;
      }
    }
    const pct = totalStamps > 0 ? totalLeveled / totalStamps : 0;
    const gilded = save.data?.StampLvM;
    const hasGilded = Array.isArray(gilded) && gilded.some(t => t && typeof t === 'object' && Object.values(t).some(v => v > 0));

    let score = 0;
    if (pct >= 0.95 && maxLv >= 400 && hasGilded) score = 5;
    else if (pct >= 0.85 && maxLv >= 200) score = 4;
    else if (pct >= 0.7 && maxLv >= 100) score = 3;
    else if (pct >= 0.5) score = 2;
    else if (totalLeveled > 10) score = 1;

    const sTier = score >= 5 ? 'ultra' : score >= 4 ? 'endgame' : score >= 3 ? 'late' : score >= 2 ? 'mid' : 'early';
    return { score, detail: `${totalLeveled}/${totalStamps} stamps, max lv ${maxLv}, sum ${totalLevels}${hasGilded ? ', gilded ✓' : ''}`, tier: sTier };
  },

  alchemy(save, tier) {
    let cauldUpg = save.data?.CauldUpgLVs;
    const bubbles = save.data?.CauldronBubbles;
    let parts = [];
    let score = 0;

    // CauldUpgLVs is a flat array of upgrade levels (e.g. [170, 170, ...])
    if (typeof cauldUpg === 'string') cauldUpg = JSON.parse(cauldUpg);
    if (Array.isArray(cauldUpg)) {
      const vals = cauldUpg.filter(v => typeof v === 'number');
      const leveled = vals.filter(v => v > 0).length;
      const sum = vals.reduce((a, b) => a + Math.max(0, b), 0);
      const maxLv = vals.length > 0 ? Math.max(...vals) : 0;
      parts.push(`${leveled}/${vals.length} upgrades, max lv ${maxLv}`);
      if (leveled >= 28 && maxLv >= 1000) score = 5;
      else if (leveled >= 24 && maxLv >= 100) score = 4;
      else if (leveled >= 16) score = 3;
      else if (leveled >= 8) score = 2;
      else if (leveled > 0) score = 1;
    }

    // CauldronBubbles = array of [cauldronRef, cauldronRef, level] entries
    if (typeof bubbles === 'string' || Array.isArray(bubbles)) {
      const parsed = typeof bubbles === 'string' ? JSON.parse(bubbles) : bubbles;
      if (Array.isArray(parsed)) {
        parts.push(`${parsed.length} bubble slots`);
        if (parsed.length >= 30) score = Math.max(score, 4);
      }
    }

    if (parts.length === 0) return { score: 0, detail: 'No alchemy data found', tier: 'early' };
    const sTier = score >= 5 ? 'ultra' : score >= 4 ? 'endgame' : score >= 3 ? 'late' : score >= 2 ? 'mid' : 'early';
    return { score, detail: parts.join(', '), tier: sTier };
  },

  prayers(save, tier) {
    let prayOwned = save.data?.PrayOwned;
    if (typeof prayOwned === 'string') prayOwned = JSON.parse(prayOwned);
    if (!Array.isArray(prayOwned)) return { score: 0, detail: 'No prayer data', tier: 'early' };

    const unlocked = prayOwned.filter(v => typeof v === 'number' && v > 0).length;
    const maxed = prayOwned.filter(v => typeof v === 'number' && v >= 50).length;
    const total = prayOwned.length;

    let score = 0;
    if (unlocked >= 22 && maxed >= 15) score = 5;
    else if (unlocked >= 18 && maxed >= 10) score = 4;
    else if (unlocked >= 14) score = 3;
    else if (unlocked >= 8) score = 2;
    else if (unlocked > 0) score = 1;

    const sTier = score >= 5 ? 'ultra' : score >= 4 ? 'endgame' : score >= 3 ? 'late' : score >= 2 ? 'mid' : 'early';
    return { score, detail: `${unlocked}/${total} unlocked, ${maxed} maxed`, tier: sTier };
  },

  construction(save, tier) {
    let tower = save.data?.Tower;
    if (typeof tower === 'string') tower = JSON.parse(tower);
    if (!Array.isArray(tower)) return { score: 0, detail: 'No construction data', tier: 'early' };

    const totalLevels = tower.reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
    const buildings = tower.filter(v => typeof v === 'number' && v > 0).length;

    let score = 0;
    if (buildings >= 80 && totalLevels >= 1000) score = 5;
    else if (buildings >= 60 && totalLevels >= 500) score = 4;
    else if (buildings >= 40) score = 3;
    else if (buildings >= 20) score = 2;
    else if (buildings > 0) score = 1;

    const sTier = score >= 5 ? 'ultra' : score >= 4 ? 'endgame' : score >= 3 ? 'late' : score >= 2 ? 'mid' : 'early';
    const fmtLvl = totalLevels >= 1e6 ? totalLevels.toExponential(2) : totalLevels.toLocaleString('en-US');
    return { score, detail: `${buildings} buildings, total levels ${fmtLvl}`, tier: sTier };
  },

  breeding(save, tier) {
    let breed = save.data?.Breeding;
    if (typeof breed === 'string') breed = JSON.parse(breed);
    if (!Array.isArray(breed)) return { score: 0, detail: 'Not unlocked', tier: 'early' };

    const totalEntries = breed.reduce((s, e) => s + (Array.isArray(e) ? e.length : 0), 0);
    let score = 0;
    if (totalEntries >= 100) score = 5;
    else if (totalEntries >= 60) score = 4;
    else if (totalEntries >= 30) score = 3;
    else if (totalEntries >= 15) score = 2;
    else score = 1;

    const sTier = score >= 5 ? 'ultra' : score >= 4 ? 'endgame' : score >= 3 ? 'late' : score >= 2 ? 'mid' : 'early';
    return { score, detail: `${totalEntries} total entries`, tier: sTier };
  },

  cooking(save, tier) {
    let cooking = save.data?.Cooking;
    if (typeof cooking === 'string') cooking = JSON.parse(cooking);
    if (!Array.isArray(cooking)) return { score: 0, detail: 'Not unlocked', tier: 'early' };

    const totalEntries = cooking.reduce((s, e) => s + (Array.isArray(e) ? e.length : 0), 0);
    let score = 0;
    if (totalEntries >= 200) score = 5;
    else if (totalEntries >= 100) score = 4;
    else if (totalEntries >= 50) score = 3;
    else if (totalEntries >= 20) score = 2;
    else score = 1;

    const sTier = score >= 5 ? 'ultra' : score >= 4 ? 'endgame' : score >= 3 ? 'late' : score >= 2 ? 'mid' : 'early';
    return { score, detail: `${totalEntries} total entries across ${cooking.length} categories`, tier: sTier };
  },

  sailing(save, tier) {
    let sailing = save.data?.Sailing;
    if (typeof sailing === 'string') sailing = JSON.parse(sailing);
    if (!Array.isArray(sailing)) return { score: 0, detail: 'Not unlocked', tier: 'early' };

    // sailing[1] = islands, sailing[3] = artifacts/loot
    const islands = Array.isArray(sailing[1]) ? sailing[1].length : 0;
    const artifacts = Array.isArray(sailing[3]) ? sailing[3].length : 0;

    let score = 0;
    if (islands >= 30 && artifacts >= 50) score = 5;
    else if (islands >= 25 && artifacts >= 30) score = 4;
    else if (islands >= 20) score = 3;
    else if (islands >= 10) score = 2;
    else score = 1;

    const sTier = score >= 5 ? 'ultra' : score >= 4 ? 'endgame' : score >= 3 ? 'late' : score >= 2 ? 'mid' : 'early';
    return { score, detail: `${islands} islands, ${artifacts} artifacts`, tier: sTier };
  },

  gaming(save, tier) {
    let gaming = save.data?.Gaming;
    if (typeof gaming === 'string') gaming = JSON.parse(gaming);
    if (!Array.isArray(gaming)) return { score: 0, detail: 'Not unlocked', tier: 'early' };

    const entries = gaming.length;
    let score = 0;
    if (entries >= 20) score = 5;
    else if (entries >= 15) score = 4;
    else if (entries >= 10) score = 3;
    else if (entries >= 5) score = 2;
    else score = 1;

    const sTier = score >= 5 ? 'ultra' : score >= 4 ? 'endgame' : score >= 3 ? 'late' : score >= 2 ? 'mid' : 'early';
    return { score, detail: `${entries} entries`, tier: sTier };
  },

  divinity(save, tier) {
    let div = save.data?.Divinity;
    if (typeof div === 'string') div = JSON.parse(div);
    if (!Array.isArray(div)) return { score: 0, detail: 'Not unlocked', tier: 'early' };

    const entries = div.length;
    let score = 0;
    if (entries >= 35) score = 5;
    else if (entries >= 25) score = 4;
    else if (entries >= 15) score = 3;
    else if (entries >= 5) score = 2;
    else score = 1;

    const sTier = score >= 5 ? 'ultra' : score >= 4 ? 'endgame' : score >= 3 ? 'late' : score >= 2 ? 'mid' : 'early';
    return { score, detail: `${entries} entries`, tier: sTier };
  },

  lab(save, tier) {
    let lab = save.data?.Lab;
    if (typeof lab === 'string') lab = JSON.parse(lab);
    if (!Array.isArray(lab)) return { score: 0, detail: 'Not unlocked', tier: 'early' };

    // lab[0] = chip levels, lab[1+] = connections
    const chips = Array.isArray(lab[0]) ? lab[0] : [];
    const maxChip = chips.length > 0 ? Math.max(...chips.filter(v => typeof v === 'number')) : 0;
    const totalChips = chips.filter(v => typeof v === 'number' && v > 0).length;

    let score = 0;
    if (maxChip >= 500 && totalChips >= 20) score = 5;
    else if (maxChip >= 200 && totalChips >= 15) score = 4;
    else if (maxChip >= 100) score = 3;
    else if (totalChips >= 5) score = 2;
    else if (totalChips > 0) score = 1;

    const sTier = score >= 5 ? 'ultra' : score >= 4 ? 'endgame' : score >= 3 ? 'late' : score >= 2 ? 'mid' : 'early';
    return { score, detail: `${totalChips} chips, max level ${maxChip}`, tier: sTier };
  },

  farming(save, tier) {
    let rank = save.data?.FarmRank;
    if (typeof rank === 'string') rank = JSON.parse(rank);
    if (!Array.isArray(rank) || !Array.isArray(rank[0])) return { score: 0, detail: 'Not unlocked', tier: 'early' };

    const ranks = rank[0].filter(v => typeof v === 'number');
    const avgRank = ranks.length > 0 ? ranks.reduce((a, b) => a + b, 0) / ranks.length : 0;
    const maxRank = ranks.length > 0 ? Math.max(...ranks) : 0;

    let score = 0;
    if (avgRank >= 150) score = 5;
    else if (avgRank >= 100) score = 4;
    else if (avgRank >= 50) score = 3;
    else if (avgRank >= 20) score = 2;
    else if (avgRank > 0) score = 1;

    const sTier = score >= 5 ? 'ultra' : score >= 4 ? 'endgame' : score >= 3 ? 'late' : score >= 2 ? 'mid' : 'early';
    return { score, detail: `${ranks.length} crops, avg rank ${Math.round(avgRank)}, max ${maxRank}`, tier: sTier };
  },

  summoning(save, tier) {
    let summon = save.data?.Summon;
    if (typeof summon === 'string') summon = JSON.parse(summon);
    if (!Array.isArray(summon)) return { score: 0, detail: 'Not unlocked', tier: 'early' };

    const battles = Array.isArray(summon[0]) ? summon[0].length : 0;
    const upgrades = Array.isArray(summon[1]) ? summon[1].length : 0;

    let score = 0;
    if (battles >= 70 && upgrades >= 100) score = 5;
    else if (battles >= 50 && upgrades >= 60) score = 4;
    else if (battles >= 30) score = 3;
    else if (battles >= 10) score = 2;
    else score = 1;

    const sTier = score >= 5 ? 'ultra' : score >= 4 ? 'endgame' : score >= 3 ? 'late' : score >= 2 ? 'mid' : 'early';
    return { score, detail: `${battles} battles, ${upgrades} upgrades`, tier: sTier };
  },

  sneaking(save, tier) {
    let ninja = save.data?.Ninja;
    if (typeof ninja === 'string') ninja = JSON.parse(ninja);
    if (!Array.isArray(ninja)) return { score: 0, detail: 'Not unlocked', tier: 'early' };

    const entries = ninja.length;
    let score = 0;
    if (entries >= 100) score = 5;
    else if (entries >= 70) score = 4;
    else if (entries >= 40) score = 3;
    else if (entries >= 20) score = 2;
    else score = 1;

    const sTier = score >= 5 ? 'ultra' : score >= 4 ? 'endgame' : score >= 3 ? 'late' : score >= 2 ? 'mid' : 'early';
    return { score, detail: `${entries} entries`, tier: sTier };
  },

  companions(save, tier) {
    const comp = save.companion;
    if (!comp) return { score: 0, detail: 'Not unlocked', tier: 'early' };

    const compScore = comp.s || 0;
    const petsOwned = Array.isArray(comp.o) ? comp.o.length : 0;

    let score = 0;
    if (compScore >= 4000 && petsOwned >= 100) score = 5;
    else if (compScore >= 2000 && petsOwned >= 70) score = 4;
    else if (compScore >= 1000 && petsOwned >= 40) score = 3;
    else if (compScore >= 300) score = 2;
    else if (compScore > 0) score = 1;

    const sTier = score >= 5 ? 'ultra' : score >= 4 ? 'endgame' : score >= 3 ? 'late' : score >= 2 ? 'mid' : 'early';
    return { score, detail: `Score ${compScore}, ${petsOwned} pets owned`, tier: sTier };
  },

  spelunking(save, tier) {
    let spelunk = save.data?.Spelunk;
    if (typeof spelunk === 'string') spelunk = JSON.parse(spelunk);
    if (!Array.isArray(spelunk)) return { score: 0, detail: 'Not unlocked', tier: 'early' };

    const rooms = Array.isArray(spelunk[0]) ? spelunk[0].length : 0;
    const unlocked = Array.isArray(spelunk[0]) ? spelunk[0].filter(v => v > 0).length : 0;

    let score = 0;
    if (unlocked >= 14) score = 5;
    else if (unlocked >= 10) score = 4;
    else if (unlocked >= 7) score = 3;
    else if (unlocked >= 4) score = 2;
    else if (unlocked > 0) score = 1;

    const sTier = score >= 5 ? 'ultra' : score >= 4 ? 'endgame' : score >= 3 ? 'late' : score >= 2 ? 'mid' : 'early';
    return { score, detail: `${unlocked}/${rooms} rooms unlocked`, tier: sTier };
  },

  forge(save, tier) {
    let forgeLv = save.data?.ForgeLV;
    if (typeof forgeLv === 'string') forgeLv = JSON.parse(forgeLv);
    if (!Array.isArray(forgeLv)) return { score: 0, detail: 'No forge data', tier: 'early' };

    const leveled = forgeLv.filter(v => typeof v === 'number' && v > 0).length;
    const maxLv = forgeLv.reduce((m, v) => typeof v === 'number' && v > m ? v : m, 0);

    let score = 0;
    if (leveled >= 8 && maxLv >= 30) score = 5;
    else if (leveled >= 6 && maxLv >= 20) score = 4;
    else if (leveled >= 4) score = 3;
    else if (leveled >= 2) score = 2;
    else if (leveled > 0) score = 1;

    const sTier = score >= 5 ? 'ultra' : score >= 4 ? 'endgame' : score >= 3 ? 'late' : score >= 2 ? 'mid' : 'early';
    return { score, detail: `${leveled} slots leveled, max lv ${maxLv}`, tier: sTier };
  },
};

// System display order and metadata
const SYSTEM_META = [
  { key: 'stamps',       icon: '📜', label: 'Stamps',       world: 'W1' },
  { key: 'forge',        icon: '🔨', label: 'Forge',        world: 'W1' },
  { key: 'alchemy',      icon: '⚗️', label: 'Alchemy',      world: 'W2' },
  { key: 'prayers',      icon: '🙏', label: 'Prayers',      world: 'W3' },
  { key: 'construction', icon: '🏗️', label: 'Construction', world: 'W3' },
  { key: 'lab',          icon: '🔬', label: 'Lab',          world: 'W4' },
  { key: 'breeding',     icon: '🐣', label: 'Breeding',     world: 'W4' },
  { key: 'cooking',      icon: '🍳', label: 'Cooking',      world: 'W4' },
  { key: 'sailing',      icon: '⛵', label: 'Sailing',      world: 'W5' },
  { key: 'gaming',       icon: '🎮', label: 'Gaming',       world: 'W5' },
  { key: 'divinity',     icon: '✨', label: 'Divinity',     world: 'W5' },
  { key: 'farming',      icon: '🌾', label: 'Farming',      world: 'W6' },
  { key: 'summoning',    icon: '👻', label: 'Summoning',    world: 'W6' },
  { key: 'sneaking',     icon: '🥷', label: 'Sneaking',     world: 'W6' },
  { key: 'companions',   icon: '🐾', label: 'Companions',   world: 'W7' },
  { key: 'spelunking',   icon: '⛏️', label: 'Spelunking',   world: 'W7' },
];

/**
 * Run full account analysis. Returns { tier, characters, systems, priorities, summary }.
 */
export function analyzeAccount(save) {
  if (!save || !save.data) throw new Error('Invalid save data');

  const tier = detectTier(save);
  const characters = parseCharacters(save);

  // Score all systems
  const systems = [];
  for (const meta of SYSTEM_META) {
    const scorer = systemScorers[meta.key];
    if (!scorer) continue;
    const result = scorer(save, tier);
    systems.push({
      ...meta,
      score: result.score,
      detail: result.detail,
      systemTier: result.tier,
      behind: TIERS.indexOf(result.tier) < TIERS.indexOf(tier),
    });
  }

  // Sort priorities: most behind first, then by score ascending
  const priorities = systems
    .filter(s => s.behind || s.score <= 3)
    .sort((a, b) => a.score - b.score)
    .slice(0, 5)
    .map(s => ({
      system: s.label,
      icon: s.icon,
      world: s.world,
      score: s.score,
      reason: `${s.label} is at ${TIER_LABELS[s.systemTier] || s.systemTier} level — ${s.detail}`,
    }));

  // Summary stats
  const avgScore = systems.length > 0 ? systems.reduce((s, x) => s + x.score, 0) / systems.length : 0;
  const maxedCount = systems.filter(s => s.score >= 5).length;
  const behindCount = systems.filter(s => s.behind).length;

  return {
    tier,
    tierLabel: TIER_LABELS[tier],
    tierColor: TIER_COLORS[tier],
    accountAge: save.accountCreateTime ? Math.floor((Date.now() - save.accountCreateTime) / (1000 * 60 * 60 * 24)) : null,
    characterCount: characters.length,
    characters,
    systems,
    priorities,
    summary: {
      avgScore: Math.round(avgScore * 10) / 10,
      maxedCount,
      behindCount,
      totalSystems: systems.length,
    },
  };
}

export { TIER_LABELS, TIER_COLORS, TIERS, SKILL_NAMES };
