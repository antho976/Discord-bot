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
