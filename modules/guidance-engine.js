/**
 * Guidance Engine — World → Category → Cards evaluation system
 *
 * Loads guidance-config.json, evaluates a save against each card's extractor,
 * determines the current tier and progress toward the next tier for every card.
 * Returns a structured result with per-card, per-category, and per-world ratings.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─────────────────────────────────────────────────────────────────────────────
//  Config loader (hot-reloadable)
// ─────────────────────────────────────────────────────────────────────────────

const CONFIG_PATH = path.join(__dirname, '../data/guidance-config.json');
let _config = null;

export function loadConfig(force = false) {
  if (_config && !force) return _config;
  _config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  return _config;
}

export function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
  _config = cfg;
}

export function getConfig() { return loadConfig(); }

// ─────────────────────────────────────────────────────────────────────────────
//  Helper: parse JSON-string values from save data
// ─────────────────────────────────────────────────────────────────────────────

function _pk(data, key) {
  let v = data[key];
  if (v == null) return null;
  if (typeof v === 'string') try { v = JSON.parse(v); } catch { return null; }
  return v;
}

// ─────────────────────────────────────────────────────────────────────────────
//  EXTRACTORS — one function per extractor ID
//  Each receives (save) and returns a number.
// ─────────────────────────────────────────────────────────────────────────────

const EXTRACTORS = {

  // ══════════════ STAMPS ══════════════

  'stamps.totalLeveled'(save) {
    const stamps = save.data?.StampLv;
    if (!Array.isArray(stamps)) return 0;
    let count = 0;
    for (const tab of stamps) {
      if (!tab || typeof tab !== 'object' || Array.isArray(tab)) continue;
      for (const v of Object.values(tab)) if (typeof v === 'number' && v > 0) count++;
    }
    return count;
  },

  'stamps.maxLevel'(save) {
    const stamps = save.data?.StampLv;
    if (!Array.isArray(stamps)) return 0;
    let max = 0;
    for (const tab of stamps) {
      if (!tab || typeof tab !== 'object' || Array.isArray(tab)) continue;
      for (const v of Object.values(tab)) if (typeof v === 'number' && v > max) max = v;
    }
    return max;
  },

  'stamps.gildedCount'(save) {
    const gilded = save.data?.StampLvM;
    if (!Array.isArray(gilded)) return 0;
    let count = 0;
    for (const tab of gilded) {
      if (!tab || typeof tab !== 'object' || Array.isArray(tab)) continue;
      for (const v of Object.values(tab)) if (typeof v === 'number' && v > 0) count++;
    }
    return count;
  },

  // ══════════════ STATUES ══════════════

  'statues.totalLeveled'(save) {
    // StuG[60] — 0=not gilded; we count per-char StatueLevels entries above 0
    // Use StuG > 0 as proxy for "leveled at account level"
    const stug = _pk(save.data, 'StuG') || save.data?.StuG;
    if (!Array.isArray(stug)) return 0;
    return stug.filter(v => typeof v === 'number' && v > 0).length;
  },

  'statues.maxLevel'(save) {
    let max = 0;
    for (let i = 0; i < 12; i++) {
      const sl = _pk(save.data, `StatueLevels_${i}`);
      if (!Array.isArray(sl)) continue;
      for (const entry of sl) {
        if (Array.isArray(entry) && entry[0] > max) max = entry[0];
      }
    }
    return max;
  },

  'statues.gildedCount'(save) {
    const stug = save.data?.StuG;
    if (!Array.isArray(stug)) return 0;
    return stug.filter(v => v === 3).length;
  },

  // ══════════════ ANVIL ══════════════

  'anvil.tabsUnlocked'(save) {
    const cs = save.data?.AnvilCraftStatus;
    if (!Array.isArray(cs)) return 0;
    let tabs = 0;
    for (const charTabs of cs) {
      if (!Array.isArray(charTabs)) continue;
      const t = charTabs.filter(v => v === 1 || v === true).length;
      if (t > tabs) tabs = t;
    }
    return tabs;
  },

  'anvil.maxProdSpeed'(save) {
    let max = 0;
    for (let i = 0; i < 12; i++) {
      const stats = _pk(save.data, `AnvilPAstats_${i}`);
      if (Array.isArray(stats) && typeof stats[0] === 'number' && stats[0] > max) max = stats[0];
    }
    return max;
  },

  // ══════════════ FORGE ══════════════

  'forge.maxSlotLevel'(save) {
    const fv = _pk(save.data, 'ForgeLV') || save.data?.ForgeLV;
    if (!Array.isArray(fv)) return 0;
    return Math.max(0, ...fv.filter(v => typeof v === 'number'));
  },

  // ══════════════ CARDS ══════════════

  'cards.totalCollected'(save) {
    const c0 = save.data?.Cards0;
    if (!c0 || typeof c0 !== 'object') return 0;
    const obj = typeof c0 === 'string' ? JSON.parse(c0) : c0;
    return Object.keys(obj).length;
  },

  'cards.rubyCount'(save) {
    // Ruby = 6th star tier — counts need to be >= threshold in game data
    // Cards0 = {codename: count}. Ruby requires 1e12 cards of a monster.
    const c0 = save.data?.Cards0;
    if (!c0) return 0;
    const obj = typeof c0 === 'string' ? JSON.parse(c0) : c0;
    const RUBY_THRESHOLD = 1_000_000_000_000;
    return Object.values(obj).filter(v => typeof v === 'number' && v >= RUBY_THRESHOLD).length;
  },

  // ══════════════ ALCHEMY ══════════════

  'alchemy.bubblesLeveled'(save) {
    const ci = _pk(save.data, 'CauldronInfo');
    if (!Array.isArray(ci) || !Array.isArray(ci[0])) return 0;
    // ci[0] = levels per cauldron (array of arrays)
    let count = 0;
    for (const cauldron of ci[0]) {
      if (!Array.isArray(cauldron)) continue;
      for (const lv of cauldron) if (typeof lv === 'number' && lv > 0) count++;
    }
    return count;
  },

  'alchemy.bubblesMaxLevel'(save) {
    const ci = _pk(save.data, 'CauldronInfo');
    if (!Array.isArray(ci) || !Array.isArray(ci[0])) return 0;
    let max = 0;
    for (const cauldron of ci[0]) {
      if (!Array.isArray(cauldron)) continue;
      for (const lv of cauldron) if (typeof lv === 'number' && lv > max) max = lv;
    }
    return max;
  },

  'alchemy.vialsMaxed'(save) {
    const ci = _pk(save.data, 'CauldronInfo');
    if (!Array.isArray(ci) || !ci[4]) return 0;
    const vials = ci[4];
    if (typeof vials !== 'object' || Array.isArray(vials)) return 0;
    const MAX = 15;
    return Object.values(vials).filter(v => typeof v === 'number' && v >= MAX).length;
  },

  // ══════════════ OBOLS ══════════════

  'obols.familyTotal'(save) {
    const o1 = save.data?.ObolEqO1;
    const o2 = save.data?.ObolEqO2;
    let count = 0;
    if (Array.isArray(o1)) count += o1.filter(v => v && v !== '0' && v !== 0).length;
    if (Array.isArray(o2)) count += o2.filter(v => v && v !== '0' && v !== 0).length;
    return count;
  },

  // ══════════════ CONSTRUCTION ══════════════

  'construction.maxBuildingLevel'(save) {
    const tower = _pk(save.data, 'Tower');
    if (!Array.isArray(tower)) return 0;
    return Math.max(0, ...tower.slice(0, 27).filter(v => typeof v === 'number'));
  },

  'construction.buildingsAbove10'(save) {
    const tower = _pk(save.data, 'Tower');
    if (!Array.isArray(tower)) return 0;
    return tower.slice(0, 27).filter(v => typeof v === 'number' && v >= 10).length;
  },

  // ══════════════ PRAYERS ══════════════

  'prayers.totalLevels'(save) {
    const po = _pk(save.data, 'PrayOwned');
    if (!Array.isArray(po)) return 0;
    return po.reduce((s, v) => s + (typeof v === 'number' && v > 0 ? v : 0), 0);
  },

  'prayers.unlocked'(save) {
    const po = _pk(save.data, 'PrayOwned');
    if (!Array.isArray(po)) return 0;
    return po.filter(v => typeof v === 'number' && v > 0).length;
  },

  // ══════════════ TOTEMS ══════════════

  'totems.highestWave'(save) {
    const ti = _pk(save.data, 'TotemInfo');
    if (!Array.isArray(ti) || !Array.isArray(ti[0])) return 0;
    return Math.max(0, ...ti[0].filter(v => typeof v === 'number' && v > 0));
  },

  'totems.avgWave'(save) {
    const ti = _pk(save.data, 'TotemInfo');
    if (!Array.isArray(ti) || !Array.isArray(ti[0])) return 0;
    const active = ti[0].filter(v => typeof v === 'number' && v > 0);
    return active.length > 0 ? active.reduce((a, b) => a + b, 0) / active.length : 0;
  },

  // ══════════════ SALT LICK ══════════════

  'saltLick.totalLevels'(save) {
    const sl = _pk(save.data, 'SaltLick');
    if (!Array.isArray(sl)) return 0;
    return sl.reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
  },

  // ══════════════ ATOMS ══════════════

  'atoms.highestLevel'(save) {
    const atm = _pk(save.data, 'Atoms');
    if (!Array.isArray(atm)) return 0;
    return Math.max(0, ...atm.filter(v => typeof v === 'number'));
  },

  'atoms.totalLevels'(save) {
    const atm = _pk(save.data, 'Atoms');
    if (!Array.isArray(atm)) return 0;
    return atm.reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
  },

  // ══════════════ COOKING ══════════════

  'cooking.mealsMaxed'(save) {
    const meals = _pk(save.data, 'Meals');
    if (!Array.isArray(meals)) return 0;
    const MAX = 30;
    let maxed = 0;
    for (let i = 0; i < meals.length; i += 2) {
      if (typeof meals[i] === 'number' && meals[i] >= MAX) maxed++;
    }
    return maxed;
  },

  'cooking.mealsDiscovered'(save) {
    const meals = _pk(save.data, 'Meals');
    if (!Array.isArray(meals)) return 0;
    let discovered = 0;
    for (let i = 0; i < meals.length; i += 2) {
      if (typeof meals[i] === 'number' && meals[i] > 0) discovered++;
    }
    return discovered;
  },

  // ══════════════ LAB ══════════════

  'lab.totalChipsEquipped'(save) {
    const lab = _pk(save.data, 'Lab');
    if (!Array.isArray(lab)) return 0;
    // Lab[1] = per-player chip arrays or similar structure
    let count = 0;
    for (const row of lab) {
      if (Array.isArray(row)) count += row.filter(v => typeof v === 'number' && v > 0).length;
    }
    return count;
  },

  // ══════════════ BREEDING ══════════════

  'breeding.highestPetPower'(save) {
    const ps = _pk(save.data, 'PetsStored');
    if (!Array.isArray(ps)) return 0;
    let max = 0;
    for (const pet of ps) {
      if (!Array.isArray(pet)) continue;
      const power = pet[2];
      if (typeof power === 'number' && power > max) max = power;
    }
    return max;
  },

  'breeding.territoriesUnlocked'(save) {
    const terr = _pk(save.data, 'Territory');
    if (!Array.isArray(terr)) return 0;
    // Count rows that have non-zero progress in terr[0]
    if (Array.isArray(terr[0])) return terr[0].filter(v => typeof v === 'number' && v > 0).length;
    return 0;
  },

  // ══════════════ SAILING ══════════════

  'sailing.artifactsFound'(save) {
    const sailing = _pk(save.data, 'Sailing');
    if (!Array.isArray(sailing) || !Array.isArray(sailing[3])) return 0;
    // sailing[3] = artifact data: [level, bonus, ...] per artifact
    return sailing[3].filter(v => Array.isArray(v) ? v[0] > 0 : typeof v === 'number' && v > 0).length;
  },

  'sailing.islandsReached'(save) {
    const sailing = _pk(save.data, 'Sailing');
    if (!Array.isArray(sailing) || !Array.isArray(sailing[1])) return 0;
    // sailing[1] = island data; count islands with progress > 0
    return sailing[1].filter(v => Array.isArray(v) ? v[0] > 0 : typeof v === 'number' && v > 0).length;
  },

  // ══════════════ FARMING ══════════════

  'farming.activePlots'(save) {
    const plots = _pk(save.data, 'FarmPlot');
    if (!Array.isArray(plots)) return 0;
    return plots.filter(p => Array.isArray(p) && p[0] !== -1).length;
  },

  'farming.totalUpgrades'(save) {
    const upg = _pk(save.data, 'FarmUpg');
    if (!Array.isArray(upg)) return 0;
    return upg.reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
  },

  // ══════════════ SUMMONING ══════════════

  'summoning.highestArenaWave'(save) {
    const summon = _pk(save.data, 'Summon');
    if (!Array.isArray(summon) || !Array.isArray(summon[3])) return 0;
    return Math.max(0, ...summon[3].filter(v => typeof v === 'number' && v > 0));
  },

  // ══════════════ DIVINITY ══════════════

  'divinity.godsUnlocked'(save) {
    const div = _pk(save.data, 'Divinity');
    if (!Array.isArray(div) || !Array.isArray(div[0])) return 0;
    return div[0].filter(v => typeof v === 'number' && v > 0).length;
  },

  // ══════════════ CAVERNS ══════════════

  'caverns.highestVillagerLevel'(save) {
    const holes = _pk(save.data, 'Holes');
    if (!Array.isArray(holes) || !Array.isArray(holes[0])) return 0;
    return Math.max(0, ...holes[0].filter(v => typeof v === 'number'));
  },

  'caverns.totalVillagerLevels'(save) {
    const holes = _pk(save.data, 'Holes');
    if (!Array.isArray(holes) || !Array.isArray(holes[0])) return 0;
    return holes[0].reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
  },

  // ══════════════ BEES ══════════════

  'bees.highestLevel'(save) {
    const bubba = _pk(save.data, 'Bubba');
    if (!Array.isArray(bubba) || !Array.isArray(bubba[1])) return 0;
    return Math.max(0, ...bubba[1].filter(v => typeof v === 'number'));
  },

  // ══════════════ SNEAKING ══════════════

  'sneaking.areasUnlocked'(save) {
    const spelunk = _pk(save.data, 'Spelunk');
    if (!Array.isArray(spelunk) || !Array.isArray(spelunk[0])) return 0;
    return spelunk[0].filter(v => v === 1).length;
  },

  'sneaking.highestAreaLevel'(save) {
    const spelunk = _pk(save.data, 'Spelunk');
    if (!Array.isArray(spelunk) || !Array.isArray(spelunk[1])) return 0;
    return Math.max(0, ...spelunk[1].filter(v => typeof v === 'number'));
  },

  // ══════════════ SUSHI ══════════════

  'sushi.tablesUnlocked'(save) {
    const sushi = _pk(save.data, 'Sushi');
    if (!Array.isArray(sushi) || !Array.isArray(sushi[3])) return 0;
    return sushi[3].filter(v => v !== -1).length;
  },

  'sushi.highestDishTier'(save) {
    const sushi = _pk(save.data, 'Sushi');
    if (!Array.isArray(sushi) || !Array.isArray(sushi[7])) return 0;
    return Math.max(0, ...sushi[7].filter(v => typeof v === 'number' && v > 0));
  },

  // ══════════════ BUG CATCHING ══════════════

  'bugCatching.plotsUnlocked'(save) {
    const bi = _pk(save.data, 'BugInfo');
    if (!Array.isArray(bi) || !Array.isArray(bi[2])) return 0;
    // bi[2][i] = -10 means active/unlocked
    return bi[2].filter(v => v === -10).length;
  },

  // ══════════════ STAR SIGNS ══════════════

  'starSigns.purchased'(save) {
    const sg = save.data?.StarSg;
    if (!sg || typeof sg !== 'object') return 0;
    return Object.keys(sg).length;
  },

  'starSigns.constellationsCompleted'(save) {
    const ssprog = _pk(save.data, 'SSprog');
    if (!Array.isArray(ssprog)) return 0;
    return ssprog.filter(pair => Array.isArray(pair) && pair[1] === 1).length;
  },

  // ══════════════ ACHIEVEMENTS ══════════════

  'achievements.completed'(save) {
    const a = _pk(save.data, 'AchieveReg');
    if (!Array.isArray(a)) return 0;
    return a.filter(v => v === 1).length;
  },

  // ══════════════ DEATH NOTE ══════════════

  'deathnote.totalSkullTiers'(save) {
    let total = 0;
    for (let i = 0; i < 12; i++) {
      const kla = _pk(save.data, `KLA_${i}`);
      if (!Array.isArray(kla)) continue;
      for (const mapEntry of kla) {
        if (Array.isArray(mapEntry)) {
          const kills = mapEntry[0];
          if (typeof kills === 'number' && kills > 0) total++;
        }
      }
    }
    return total;
  },

  // ══════════════ RIFT ══════════════

  'rift.bonusesUnlocked'(save) {
    const rift = _pk(save.data, 'Rift') || save.data?.Rift;
    if (!Array.isArray(rift)) return 0;
    return rift.filter(v => typeof v === 'number' && v > 0).length;
  },

  // ══════════════ SLAB ══════════════

  'slab.itemsObtained'(save) {
    const slab = _pk(save.data, 'Cards1');
    if (!Array.isArray(slab)) return 0;
    return slab.length;
  },

  // ══════════════ STAMPS (extended) ══════════════

  'stamps.totalSumLevels'(save) {
    let total = 0;
    for (const key of ['StampA', 'StampB', 'StampC']) {
      const arr = _pk(save.data, key);
      if (!Array.isArray(arr)) continue;
      for (const lv of arr) if (typeof lv === 'number' && lv > 0) total += lv;
    }
    return total;
  },

  // ══════════════ CHARACTERS ══════════════

  'characters.count'(save) {
    const cc = _pk(save.data, 'CharacterClass');
    if (!Array.isArray(cc)) return 0;
    return cc.length;
  },

  'characters.highestLevel'(save) {
    let max = 0;
    for (let i = 0; i < 12; i++) {
      const lv = _pk(save.data, `Lv_${i}`);
      if (Array.isArray(lv) && typeof lv[0] === 'number' && lv[0] > max) max = lv[0];
    }
    return max;
  },

  // ══════════════ ALCHEMY (extended) ══════════════

  'alchemy.totalVialsLeveled'(save) {
    const ci = _pk(save.data, 'CauldronInfo');
    if (!Array.isArray(ci) || !ci[4]) return 0;
    const vials = ci[4];
    if (typeof vials !== 'object' || Array.isArray(vials)) return 0;
    return Object.values(vials).filter(v => typeof v === 'number' && v > 0).length;
  },

  // ══════════════ POST OFFICE ══════════════

  'postOffice.totalBoxes'(save) {
    let total = 0;
    for (let i = 0; i < 12; i++) {
      const po = _pk(save.data, `POu_${i}`);
      if (!Array.isArray(po)) continue;
      total += po.reduce((s, v) => s + (typeof v === 'number' && v > 0 ? v : 0), 0);
    }
    return total;
  },

};

// ─────────────────────────────────────────────────────────────────────────────
//  Tier evaluation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Given a numeric value and an ascending tiers array [{label, threshold}...],
 * returns:
 *   { tierIndex, tierLabel, currentThreshold, nextTier, nextThreshold, pct, value }
 */
function evaluateTiers(value, tiers) {
  if (!Array.isArray(tiers) || tiers.length === 0) {
    return { tierIndex: -1, tierLabel: 'No tiers', currentThreshold: 0, nextTier: null, nextThreshold: null, pct: 0, value };
  }

  let tierIndex = -1;
  for (let i = 0; i < tiers.length; i++) {
    if (value >= tiers[i].threshold) tierIndex = i;
    else break;
  }

  const currentTier   = tierIndex >= 0 ? tiers[tierIndex] : null;
  const nextTier      = tierIndex < tiers.length - 1 ? tiers[tierIndex + 1] : null;
  const prevThreshold = tierIndex > 0 ? tiers[tierIndex].threshold : 0;
  const nextThreshold = nextTier ? nextTier.threshold : null;

  let pct = 0;
  if (nextThreshold !== null) {
    const base  = tierIndex >= 0 ? tiers[tierIndex].threshold : 0;
    const range = nextThreshold - base;
    pct = range > 0 ? Math.min(1, (value - base) / range) : 1;
  } else {
    pct = 1; // Already at max tier
  }

  return {
    tierIndex,
    tierLabel: currentTier ? currentTier.label : 'None',
    currentThreshold: currentTier ? currentTier.threshold : 0,
    nextTier: nextTier ? nextTier.label : null,
    nextThreshold,
    nextNote: nextTier ? (nextTier.note || null) : null,
    pct: Math.round(pct * 1000) / 1000,
    atMax: nextTier === null,
    value,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Card evaluation
// ─────────────────────────────────────────────────────────────────────────────

function evaluateCard(card, save) {
  const extractor = EXTRACTORS[card.extractor];
  let value = 0;
  let error = null;
  if (!extractor) {
    error = `Unknown extractor: ${card.extractor}`;
  } else {
    try { value = extractor(save) ?? 0; }
    catch (e) { error = e.message; }
  }

  const tierResult = evaluateTiers(value, card.tiers);

  return {
    id: card.id,
    label: card.label,
    icon: card.icon,
    weight: card.weight ?? 1.0,
    unit: card.unit ?? '',
    extractor: card.extractor,
    value,
    error,
    ...tierResult,
    // Weighted score: 0 = below tier 1, 1 = at tier 1, ..., N = at tier N (max), interpolated
    weightedScore: tierResult.tierIndex + 1 + tierResult.pct,
    maxScore: card.tiers.length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Category rating: weighted average of card scores as % of max
// ─────────────────────────────────────────────────────────────────────────────

function rateCategory(evalCards) {
  let weightedSum = 0, weightTotal = 0, maxSum = 0;
  for (const c of evalCards) {
    const w = c.weight ?? 1.0;
    weightedSum += c.weightedScore * w;
    maxSum      += c.maxScore * w;
    weightTotal += w;
  }
  const pct = maxSum > 0 ? weightedSum / maxSum : 0;
  return { pct: Math.round(pct * 1000) / 1000, weightedSum, maxSum };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main evaluator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Evaluate all worlds/categories/cards for a given save object.
 * Returns detailed per-card results plus aggregated ratings.
 */
export function evaluateGuidance(save) {
  const cfg = loadConfig();

  const worldResults = [];

  for (const world of cfg.worlds) {
    const categoryResults = [];

    for (const category of world.categories) {
      const cardResults = [];

      for (const card of category.cards) {
        cardResults.push(evaluateCard(card, save));
      }

      const { pct } = rateCategory(cardResults);

      categoryResults.push({
        id: category.id,
        label: category.label,
        icon: category.icon,
        weight: category.weight ?? 1.0,
        pct,
        cards: cardResults,
        // How many cards at max tier
        cardsAtMax: cardResults.filter(c => c.atMax).length,
        cardsTotal: cardResults.length,
      });
    }

    // World rating = weighted avg of category pcts
    let wSum = 0, wTotal = 0;
    for (const cat of categoryResults) {
      const w = cat.weight ?? 1.0;
      wSum   += cat.pct * w;
      wTotal += w;
    }
    const worldPct = wTotal > 0 ? wSum / wTotal : 0;

    worldResults.push({
      id: world.id,
      label: world.label,
      icon: world.icon,
      weight: world.weight ?? 1.0,
      pct: Math.round(worldPct * 1000) / 1000,
      categories: categoryResults,
    });
  }

  // Global rating = weighted avg of world pcts
  let gSum = 0, gTotal = 0;
  for (const w of worldResults) {
    const wt = w.weight ?? 1.0;
    gSum   += w.pct * wt;
    gTotal += wt;
  }
  const globalPct = gTotal > 0 ? gSum / gTotal : 0;

  // Top recommendations: cards not at max, sorted by how close they are to next tier
  const recommendations = [];
  for (const world of worldResults) {
    for (const cat of world.categories) {
      for (const card of cat.cards) {
        if (!card.atMax && card.nextThreshold !== null) {
          const gap = card.nextThreshold - card.value;
          recommendations.push({
            worldId: world.id,
            worldLabel: world.label,
            categoryId: cat.id,
            categoryLabel: cat.label,
            categoryIcon: cat.icon,
            card,
            gap,
            pctToNext: card.pct,
          });
        }
      }
    }
  }

  // Sort: highest pct to next tier first (almost there)
  recommendations.sort((a, b) => b.pctToNext - a.pctToNext);

  return {
    globalPct: Math.round(globalPct * 1000) / 1000,
    worlds: worldResults,
    recommendations: recommendations.slice(0, 20),
    evaluatedAt: Date.now(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Extractor registry export (for editor to list available extractors)
// ─────────────────────────────────────────────────────────────────────────────

export const EXTRACTOR_IDS = Object.keys(EXTRACTORS);

// ─────────────────────────────────────────────────────────────────────────────
//  Extractor metadata — human-readable docs for the guidance editor UI.
//  Each entry: { label, desc, dataKey, valueType, maxHint }
//    label     — short display name (used in dropdown & tooltips)
//    desc      — one-sentence explanation of what the value represents
//    dataKey   — save key(s) actually read by the extractor
//    valueType — 'count' | 'max' | 'sum' | 'score' — how to interpret the number
//    maxHint   — rough upper bound (used to scale preview bars)
// ─────────────────────────────────────────────────────────────────────────────

export const EXTRACTOR_META = {

  // ── STAMPS ───────────────────────────────────────────────────────────────
  'stamps.totalLeveled': {
    label: 'Stamps Leveled',
    desc:  'Number of stamps that have been leveled at least once (lv > 0). ~270 stamps exist in total across all three books.',
    dataKey: 'StampA, StampB, StampC',
    valueType: 'count',
    maxHint: 270,
  },
  'stamps.maxLevel': {
    label: 'Max Stamp Level',
    desc:  'Level of the single highest-leveled stamp in the collection. Very high-end players reach lv 1000+.',
    dataKey: 'StampA, StampB, StampC',
    valueType: 'max',
    maxHint: 1500,
  },
  'stamps.gildedCount': {
    label: 'Gilded Stamps',
    desc:  'Number of stamps that are gilded (the StuG array tracks this with value 3 per gilded slot, shared with gilded statues).',
    dataKey: 'StuG',
    valueType: 'count',
    maxHint: 200,
  },
  'stamps.totalSumLevels': {
    label: 'Total Stamp Level Sum',
    desc:  'Sum of all stamp levels across all three books. Reflects overall upgrade investment, used by the in-game Stamp badge tier.',
    dataKey: 'StampA, StampB, StampC',
    valueType: 'sum',
    maxHint: 50000,
  },

  // ── STATUES ───────────────────────────────────────────────────────────────
  'statues.totalLeveled': {
    label: 'Statues Leveled',
    desc:  'Number of distinct statue types leveled across all characters (best level per statue is used).',
    dataKey: 'StatueLevels_0…11',
    valueType: 'count',
    maxHint: 30,
  },
  'statues.maxLevel': {
    label: 'Max Statue Level',
    desc:  'Highest level reached on any single statue across all characters.',
    dataKey: 'StatueLevels_0…11',
    valueType: 'max',
    maxHint: 1000,
  },
  'statues.gildedCount': {
    label: 'Gilded Statues',
    desc:  'Number of statues with a golden upgrade (StuG array — value 3 = gilded; same array as gilded stamps, different index).',
    dataKey: 'StuG',
    valueType: 'count',
    maxHint: 30,
  },

  // ── ANVIL ────────────────────────────────────────────────────────────────
  'anvil.tabsUnlocked': {
    label: 'Anvil Tabs Unlocked',
    desc:  'Maximum number of production tabs unlocked across all characters (AnvilCraftStatus per character, array of booleans).',
    dataKey: 'AnvilCraftStatus',
    valueType: 'count',
    maxHint: 8,
  },
  'anvil.maxProdSpeed': {
    label: 'Best Anvil Prod Speed',
    desc:  'Highest production speed value across all characters (AnvilPAstats_N[0] = speed per char). Raw game units.',
    dataKey: 'AnvilPAstats_0…11',
    valueType: 'score',
    maxHint: 100000,
  },

  // ── FORGE ────────────────────────────────────────────────────────────────
  'forge.maxSlotLevel': {
    label: 'Max Forge Slot Level',
    desc:  'Highest level of any forge slot (ForgeLV array). Forge upgrades are account-wide.',
    dataKey: 'ForgeLV',
    valueType: 'max',
    maxHint: 200,
  },

  // ── CARDS ────────────────────────────────────────────────────────────────
  'cards.totalCollected': {
    label: 'Cards Collected',
    desc:  'Total distinct monster cards in the collection (Cards0 object — keys are monster codenames, any value > 0 means collected).',
    dataKey: 'Cards0',
    valueType: 'count',
    maxHint: 300,
  },
  'cards.rubyCount': {
    label: 'Ruby Cards',
    desc:  'Cards with ≥ 1 trillion (1e12) copies — the highest star tier. Very late-game metric, most players have 0.',
    dataKey: 'Cards0',
    valueType: 'count',
    maxHint: 50,
  },

  // ── ALCHEMY ──────────────────────────────────────────────────────────────
  'alchemy.bubblesLeveled': {
    label: 'Bubbles Leveled',
    desc:  'Count of alchemy bubbles with lv > 0 across all four cauldrons (CauldronInfo[0] = nested level arrays per cauldron).',
    dataKey: 'CauldronInfo[0]',
    valueType: 'count',
    maxHint: 100,
  },
  'alchemy.bubblesMaxLevel': {
    label: 'Max Bubble Level',
    desc:  'Level of the single highest-leveled alchemy bubble across all cauldrons.',
    dataKey: 'CauldronInfo[0]',
    valueType: 'max',
    maxHint: 500,
  },
  'alchemy.vialsMaxed': {
    label: 'Vials Maxed',
    desc:  'Number of alchemy vials at or above max level (15). Vials are stored as a dict in CauldronInfo[4] → { codename: level }.',
    dataKey: 'CauldronInfo[4]',
    valueType: 'count',
    maxHint: 35,
  },
  'alchemy.totalVialsLeveled': {
    label: 'Vials Leveled',
    desc:  'Number of vials with any level > 0 (CauldronInfo[4] dict). Tracks collection breadth vs. vialsMaxed which tracks depth.',
    dataKey: 'CauldronInfo[4]',
    valueType: 'count',
    maxHint: 35,
  },

  // ── OBOLS ────────────────────────────────────────────────────────────────
  'obols.familyTotal': {
    label: 'Family Obols Equipped',
    desc:  'Total non-empty slots in the family obol board (ObolEqO1 + ObolEqO2). Filters out 0 and empty string values.',
    dataKey: 'ObolEqO1, ObolEqO2',
    valueType: 'count',
    maxHint: 50,
  },

  // ── CONSTRUCTION ─────────────────────────────────────────────────────────
  'construction.maxBuildingLevel': {
    label: 'Max Building Level',
    desc:  'Highest level of any W3 construction building (Tower array, first 27 entries are buildings; rest are traps/misc).',
    dataKey: 'Tower',
    valueType: 'max',
    maxHint: 200,
  },
  'construction.buildingsAbove10': {
    label: 'Buildings ≥ Lv 10',
    desc:  'Count of W3 construction buildings at level 10 or above (Tower[0..26]).',
    dataKey: 'Tower',
    valueType: 'count',
    maxHint: 27,
  },

  // ── PRAYERS ──────────────────────────────────────────────────────────────
  'prayers.totalLevels': {
    label: 'Total Prayer Levels',
    desc:  'Sum of all prayer levels (PrayOwned array). Prayers are leveled with Monster Drops in W3 worship.',
    dataKey: 'PrayOwned',
    valueType: 'sum',
    maxHint: 400,
  },
  'prayers.unlocked': {
    label: 'Prayers Unlocked',
    desc:  'Number of prayers unlocked (PrayOwned entries > 0). Each prayer requires clearing specific content to unlock.',
    dataKey: 'PrayOwned',
    valueType: 'count',
    maxHint: 25,
  },

  // ── TOTEMS ───────────────────────────────────────────────────────────────
  'totems.highestWave': {
    label: 'Totem Highest Wave',
    desc:  'Best wave reached across all world totems (TotemInfo[0] array). Totems are W3 worship towers.',
    dataKey: 'TotemInfo[0]',
    valueType: 'max',
    maxHint: 200,
  },
  'totems.avgWave': {
    label: 'Totem Average Wave',
    desc:  'Average wave across all active totems (only entries > 0). Measures consistent worship depth vs. just the best one.',
    dataKey: 'TotemInfo[0]',
    valueType: 'score',
    maxHint: 150,
  },

  // ── SALT LICK ────────────────────────────────────────────────────────────
  'saltLick.totalLevels': {
    label: 'Salt Lick Total Levels',
    desc:  'Sum of all Salt Lick upgrade levels (SaltLick array). Salt Lick is a W3 account-wide upgrade building.',
    dataKey: 'SaltLick',
    valueType: 'sum',
    maxHint: 200,
  },

  // ── ATOMS ────────────────────────────────────────────────────────────────
  'atoms.highestLevel': {
    label: 'Highest Atom Level',
    desc:  'Level of the highest-leveled atom collider upgrade (Atoms array, W4 feature unlocked via construction).',
    dataKey: 'Atoms',
    valueType: 'max',
    maxHint: 50,
  },
  'atoms.totalLevels': {
    label: 'Total Atom Levels',
    desc:  'Sum of all atom collider upgrade levels. Atoms are expensive but grant permanent account bonuses.',
    dataKey: 'Atoms',
    valueType: 'sum',
    maxHint: 300,
  },

  // ── COOKING ──────────────────────────────────────────────────────────────
  'cooking.mealsMaxed': {
    label: 'Meals Maxed',
    desc:  'Number of W4 meals at max level 30. The Meals array stores [level, speed, level, speed…] alternating, so only even indices are checked.',
    dataKey: 'Meals',
    valueType: 'count',
    maxHint: 60,
  },
  'cooking.mealsDiscovered': {
    label: 'Meals Discovered',
    desc:  'Number of meals with lv > 0 (Meals array, even indices). Discovering meals requires cooking them for the first time.',
    dataKey: 'Meals',
    valueType: 'count',
    maxHint: 60,
  },

  // ── LAB ──────────────────────────────────────────────────────────────────
  'lab.totalChipsEquipped': {
    label: 'Lab Chips Equipped',
    desc:  'Total chips with value > 0 summed across all nested sub-arrays of the Lab key. Lab chips boost characters while they are in the lab.',
    dataKey: 'Lab',
    valueType: 'count',
    maxHint: 100,
  },

  // ── BREEDING ─────────────────────────────────────────────────────────────
  'breeding.highestPetPower': {
    label: 'Highest Pet Power',
    desc:  'Power level of the strongest stored pet (PetsStored[i][2] = power). Pet power grows exponentially with egg tier.',
    dataKey: 'PetsStored',
    valueType: 'max',
    maxHint: 1000000,
  },
  'breeding.territoriesUnlocked': {
    label: 'Territories Unlocked',
    desc:  'Number of W4 breeding territories with any progress (Territory[0] array, value > 0). Each territory gives passive bonuses.',
    dataKey: 'Territory[0]',
    valueType: 'count',
    maxHint: 50,
  },

  // ── SAILING ──────────────────────────────────────────────────────────────
  'sailing.artifactsFound': {
    label: 'Artifacts Found',
    desc:  'Number of W5 sailing artifacts with level > 0 (Sailing[3] array of [level, bonus…] per artifact).',
    dataKey: 'Sailing[3]',
    valueType: 'count',
    maxHint: 40,
  },
  'sailing.islandsReached': {
    label: 'Islands Reached',
    desc:  'Number of W5 sailing islands with any progress (Sailing[1] array). Each island unlocks new artifacts or resources.',
    dataKey: 'Sailing[1]',
    valueType: 'count',
    maxHint: 30,
  },

  // ── FARMING ──────────────────────────────────────────────────────────────
  'farming.activePlots': {
    label: 'Active Farm Plots',
    desc:  'Number of W6 farming plots with a crop planted (FarmPlot entries where index 0 ≠ -1; -1 = empty/locked).',
    dataKey: 'FarmPlot',
    valueType: 'count',
    maxHint: 36,
  },
  'farming.totalUpgrades': {
    label: 'Farm Upgrade Levels',
    desc:  'Sum of all W6 farming plot upgrade levels (FarmUpg array). Upgrades speed up crop growth and yields.',
    dataKey: 'FarmUpg',
    valueType: 'sum',
    maxHint: 500,
  },

  // ── SUMMONING ────────────────────────────────────────────────────────────
  'summoning.highestArenaWave': {
    label: 'Summoning Arena Wave',
    desc:  'Highest wave reached across all W6 summoning arenas (Summon[3] array of best-wave-per-arena).',
    dataKey: 'Summon[3]',
    valueType: 'max',
    maxHint: 100,
  },

  // ── DIVINITY ─────────────────────────────────────────────────────────────
  'divinity.godsUnlocked': {
    label: 'Gods Unlocked',
    desc:  'Number of W5 divinity gods with any blessings collected (Divinity[0] array, value > 0). Requires linking characters.',
    dataKey: 'Divinity[0]',
    valueType: 'count',
    maxHint: 14,
  },

  // ── CAVERNS (W7) ─────────────────────────────────────────────────────────
  'caverns.highestVillagerLevel': {
    label: 'Highest Villager Level',
    desc:  'Level of the highest-leveled W7 cavern villager (Holes[0] array). Villager levels are capped by content milestones.',
    dataKey: 'Holes[0]',
    valueType: 'max',
    maxHint: 50,
  },
  'caverns.totalVillagerLevels': {
    label: 'Total Villager Levels',
    desc:  'Sum of all W7 cavern villager levels (Holes[0] array). More total levels = more active cavern bonuses.',
    dataKey: 'Holes[0]',
    valueType: 'sum',
    maxHint: 300,
  },

  // ── BEES (W7) ────────────────────────────────────────────────────────────
  'bees.highestLevel': {
    label: 'Highest Bee Level',
    desc:  'Level of the highest-leveled bee in the W7 bee system (Bubba[1] = array of bee levels).',
    dataKey: 'Bubba[1]',
    valueType: 'max',
    maxHint: 100,
  },

  // ── SNEAKING (W7) ────────────────────────────────────────────────────────
  'sneaking.areasUnlocked': {
    label: 'Sneaking Areas Unlocked',
    desc:  'Number of W7 sneaking areas unlocked (Spelunk[0] array, value === 1). More areas = more sneaking resources.',
    dataKey: 'Spelunk[0]',
    valueType: 'count',
    maxHint: 20,
  },
  'sneaking.highestAreaLevel': {
    label: 'Sneaking Highest Area Level',
    desc:  'Highest sneaking area completion level (Spelunk[1] array). Higher = better loot from sneaking runs.',
    dataKey: 'Spelunk[1]',
    valueType: 'max',
    maxHint: 100,
  },

  // ── SUSHI (W7) ───────────────────────────────────────────────────────────
  'sushi.tablesUnlocked': {
    label: 'Sushi Tables Unlocked',
    desc:  'Number of W7 sushi tables unlocked (Sushi[3] array, value ≠ -1). Each table produces a different type of bonus.',
    dataKey: 'Sushi[3]',
    valueType: 'count',
    maxHint: 20,
  },
  'sushi.highestDishTier': {
    label: 'Sushi Highest Dish Tier',
    desc:  'Highest dish tier reached in the W7 sushi system (Sushi[7] array). Higher tiers give bigger bonuses.',
    dataKey: 'Sushi[7]',
    valueType: 'max',
    maxHint: 10,
  },

  // ── BUG CATCHING (W7) ────────────────────────────────────────────────────
  'bugCatching.plotsUnlocked': {
    label: 'Bug Catching Plots',
    desc:  'Number of active W7 bug catching plots (BugInfo[2] entries === -10; -10 is the game\'s sentinel for an active/unlocked plot).',
    dataKey: 'BugInfo[2]',
    valueType: 'count',
    maxHint: 15,
  },

  // ── STAR SIGNS ───────────────────────────────────────────────────────────
  'starSigns.purchased': {
    label: 'Star Signs Purchased',
    desc:  'Total star signs owned (StarSg object, key count). Star signs are account-wide and include all types purchased.',
    dataKey: 'StarSg',
    valueType: 'count',
    maxHint: 100,
  },
  'starSigns.constellationsCompleted': {
    label: 'Constellations Completed',
    desc:  'Number of star constellations with done flag = 1 (SSprog array of [id, done] pairs). Completing one unlocks new signs.',
    dataKey: 'SSprog',
    valueType: 'count',
    maxHint: 50,
  },

  // ── ACHIEVEMENTS ─────────────────────────────────────────────────────────
  'achievements.completed': {
    label: 'Achievements Completed',
    desc:  'Total regular achievements completed (AchieveReg array, value === 1). Does not include Steam/platform achievements.',
    dataKey: 'AchieveReg',
    valueType: 'count',
    maxHint: 300,
  },

  // ── DEATH NOTE ───────────────────────────────────────────────────────────
  'deathnote.totalSkullTiers': {
    label: 'Death Note Skull Tiers',
    desc:  'Total monster-map entries with kills > 0 across all worlds (KLA_{0..11} arrays of [kills, …] per map). This counts entries above zero — NOT total skull levels.',
    dataKey: 'KLA_0…KLA_11',
    valueType: 'count',
    maxHint: 500,
  },

  // ── RIFT ─────────────────────────────────────────────────────────────────
  'rift.bonusesUnlocked': {
    label: 'Rift Bonuses Unlocked',
    desc:  'Number of Rift milestone bonuses with value > 0 (Rift array). Rift bonuses are permanent account power unlocks.',
    dataKey: 'Rift',
    valueType: 'count',
    maxHint: 40,
  },

  // ── SLAB ─────────────────────────────────────────────────────────────────
  'slab.itemsObtained': {
    label: 'Slab Items Obtained',
    desc:  'Items logged in the loot slab (Cards1 array length). Important: Slab uses Cards1 — distinct from monster card data in Cards0.',
    dataKey: 'Cards1',
    valueType: 'count',
    maxHint: 1200,
  },

  // ── CHARACTERS ───────────────────────────────────────────────────────────
  'characters.count': {
    label: 'Character Count',
    desc:  'Total number of characters on the account (CharacterClass array length).',
    dataKey: 'CharacterClass',
    valueType: 'count',
    maxHint: 10,
  },
  'characters.highestLevel': {
    label: 'Highest Character Level',
    desc:  'Level of the highest-leveled character (Lv_{0..11}[0] = base level per character).',
    dataKey: 'Lv_0…Lv_11',
    valueType: 'max',
    maxHint: 400,
  },

  // ── POST OFFICE ──────────────────────────────────────────────────────────
  'postOffice.totalBoxes': {
    label: 'PO Boxes Total Levels',
    desc:  'Sum of all Post Office box delivery levels across all characters (POu_{0..11} arrays). Higher = more PO bonuses active.',
    dataKey: 'POu_0…POu_11',
    valueType: 'sum',
    maxHint: 5000,
  },
};
