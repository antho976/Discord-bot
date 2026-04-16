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
import { getStampStats } from './idleon-review.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─────────────────────────────────────────────────────────────────────────────
//  Config loader (hot-reloadable)
//  Uses PERSISTENT_DATA_DIR (Render disk) when available, falls back to local data/
//  #51: Config is cached in memory and hot-reloaded on file change via fs.watch
// ─────────────────────────────────────────────────────────────────────────────

const _persistDir = process.env.PERSISTENT_DATA_DIR;
const CONFIG_PATH = _persistDir
  ? path.join(_persistDir, 'guidance-config.json')
  : path.join(__dirname, '../data/guidance-config.json');
const _SEED_PATH = path.join(__dirname, '../data/guidance-config.json');
const DEFAULT_CONFIG = { _info: 'Guidance config', _schema_version: 1, worlds: [] };
let _config = null;
let _configMtime = 0;

export function loadConfig(force = false) {
  if (!force && _config) {
    // Quick mtime check — only re-read if file changed (#51)
    try {
      const stat = fs.statSync(CONFIG_PATH);
      if (stat.mtimeMs <= _configMtime) return _config;
    } catch { /* fall through to full load */ }
  }
  if (!fs.existsSync(CONFIG_PATH)) {
    if (_persistDir && fs.existsSync(_SEED_PATH)) {
      fs.copyFileSync(_SEED_PATH, CONFIG_PATH);
    } else {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf8');
    }
  }
  _config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  try { _configMtime = fs.statSync(CONFIG_PATH).mtimeMs; } catch { _configMtime = Date.now(); }
  return _config;
}

export function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
  _config = cfg;
  try { _configMtime = fs.statSync(CONFIG_PATH).mtimeMs; } catch { _configMtime = Date.now(); }
}

export function getConfig() { return loadConfig(); }

// ─────────────────────────────────────────────────────────────────────────────
//  Helper: parse JSON-string values from save data
//  #39: Cache parsed values per evaluation using a WeakMap keyed on `data`
// ─────────────────────────────────────────────────────────────────────────────

const _pkCache = new WeakMap(); // data object → Map<key, parsed>

function _pk(data, key) {
  let v = data[key];
  if (v == null) return null;
  if (typeof v !== 'string') return v; // already parsed (number/array/object)
  // Check cache
  let cache = _pkCache.get(data);
  if (cache) {
    if (cache.has(key)) return cache.get(key);
  } else {
    cache = new Map();
    _pkCache.set(data, cache);
  }
  try {
    const parsed = JSON.parse(v);
    cache.set(key, parsed);
    return parsed;
  } catch {
    cache.set(key, null);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Performance profiling (#40, #46, #55)
// ─────────────────────────────────────────────────────────────────────────────

let _lastEvalProfile = null;

export function getLastEvalProfile() { return _lastEvalProfile; }

// ─────────────────────────────────────────────────────────────────────────────
//  #63: LRU cache for extractor results (per-evaluation, keyed on extractor+param)
// ─────────────────────────────────────────────────────────────────────────────

class _LRUCache {
  constructor(max = 512) { this._max = max; this._map = new Map(); }
  get(key) {
    if (!this._map.has(key)) return undefined;
    const v = this._map.get(key);
    this._map.delete(key); this._map.set(key, v);
    return v;
  }
  set(key, val) {
    this._map.delete(key);
    this._map.set(key, val);
    if (this._map.size > this._max) this._map.delete(this._map.keys().next().value);
  }
  clear() { this._map.clear(); }
}

// Per-evaluation LRU — shared by evaluateGuidance, cleared between evaluations
let _extractorLRU = new _LRUCache(512);

// ─────────────────────────────────────────────────────────────────────────────
//  #58: Measurement unit helpers
// ─────────────────────────────────────────────────────────────────────────────

const _UNIT_MAP = {
  '%': { base: '%', factor: 1 },
  'k': { base: '', factor: 1000 },
  'M': { base: '', factor: 1e6 },
  'hrs': { base: 'min', factor: 60 },
  'min': { base: 'sec', factor: 60 },
  'sec': { base: 'ms', factor: 1000 },
};

export function convertUnit(value, fromUnit, toUnit) {
  const from = _UNIT_MAP[fromUnit], to = _UNIT_MAP[toUnit];
  if (!from || !to || from.base !== to.base) return value;
  return value * from.factor / to.factor;
}

// ─────────────────────────────────────────────────────────────────────────────
//  #45: Rate-of-change helper (compares two save snapshots)
// ─────────────────────────────────────────────────────────────────────────────

export function computeRateOfChange(currentSave, previousSave, extractorIds) {
  if (!previousSave || !Array.isArray(extractorIds)) return {};
  const result = {};
  for (const id of extractorIds) {
    const fn = EXTRACTORS[id];
    if (!fn) continue;
    try {
      const cur = fn(currentSave) ?? 0, prev = fn(previousSave) ?? 0;
      result[id] = { current: cur, previous: prev, delta: cur - prev, pctChange: prev !== 0 ? ((cur - prev) / prev) * 100 : 0 };
    } catch { result[id] = null; }
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
//  EXTRACTORS — one function per extractor ID
//  Each receives (save) and returns a number.
// ─────────────────────────────────────────────────────────────────────────────

const EXTRACTORS = {

  // ══════════════ STAMPS ══════════════

  'stamps.totalLeveled'(save) { return getStampStats(save).leveled; },

  'stamps.maxLevel'(save) { return getStampStats(save).maxLv; },

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

  'stamps.totalSumLevels'(save) { return getStampStats(save).totalLevels; },

  'stamps.hasStamp'(save, param) {
    // param: "tab:index"  e.g. "0:5" = combat tab, index 5
    // StampLv[0]=combat, [1]=skills, [2]=misc  each is an array (or object) of levels
    const lv = save.data?.StampLv;
    if (!Array.isArray(lv)) return 0;
    const parts = String(param || '').split(':');
    const tab = parseInt(parts[0], 10);
    const idx = parseInt(parts[1], 10);
    if (isNaN(tab) || isNaN(idx)) return 0;
    const tabData = lv[tab];
    if (!tabData) return 0;
    const val = Array.isArray(tabData)
      ? tabData[idx]
      : (typeof tabData === 'object' ? Object.values(tabData)[idx] : null);
    return (val ?? 0) > 0 ? 1 : 0;
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

  // ══════════════ ITEM TRACKING ══════════════
  // These search item codenames across storage, inventories, and the Slab.
  // param = item codename (case-insensitive match, e.g. "FoodHealth1", "EquipmentHats12")

  'items.inChest'(save, codename) {
    // Returns the total quantity of an item stored in the account storage chest.
    const order = save.data?.ChestOrder;
    const qty   = save.data?.ChestQuantity;
    if (!Array.isArray(order) || !Array.isArray(qty)) return 0;
    const target = String(codename || '').toLowerCase();
    let total = 0;
    for (let i = 0; i < order.length; i++) {
      if (String(order[i] ?? '').toLowerCase() === target) {
        total += typeof qty[i] === 'number' ? qty[i] : (parseFloat(qty[i]) || 0);
      }
    }
    return total;
  },

  'items.anywhereQty'(save, codename) {
    // Returns total quantity across storage chest + all character inventories.
    const target = String(codename || '').toLowerCase();
    let total = 0;
    // Chest
    const order = save.data?.ChestOrder;
    const qty   = save.data?.ChestQuantity;
    if (Array.isArray(order) && Array.isArray(qty)) {
      for (let i = 0; i < order.length; i++) {
        if (String(order[i] ?? '').toLowerCase() === target) {
          total += typeof qty[i] === 'number' ? qty[i] : (parseFloat(qty[i]) || 0);
        }
      }
    }
    // Per-character inventories via InventoryOrder_{i} + ItemQTY_{i}
    for (let ci = 0; ci < 12; ci++) {
      const iOrder = _pk(save.data, `InventoryOrder_${ci}`);
      const iQty   = _pk(save.data, `ItemQTY_${ci}`);
      if (!Array.isArray(iOrder)) continue;
      for (let s = 0; s < iOrder.length; s++) {
        if (String(iOrder[s] ?? '').toLowerCase() === target) {
          const q = iQty?.[s];
          total += typeof q === 'number' ? q : (parseFloat(q) || 0);
        }
      }
    }
    return total;
  },

  'items.inSlab'(save, codename) {
    // Returns 1 if the item has ever been obtained (present in the Slab / Cards1).
    const slab = _pk(save.data, 'Cards1') || save.data?.Cards1;
    if (!Array.isArray(slab)) return 0;
    const target = String(codename || '').toLowerCase();
    return slab.some(v => String(v ?? '').toLowerCase() === target) ? 1 : 0;
  },

  // ══════════════ PARAMETERISED — HAS ITEM / HAS ARTIFACT / HAS MEAL ══════════════
  // These accept a second argument `param` (name/index) and return 0 or 1.

  'chips.hasChip'(save, chipName) {
    const lab = _pk(save.data, 'Lab');
    if (!Array.isArray(lab)) return 0;
    for (const sub of lab) {
      if (!Array.isArray(sub)) continue;
      for (const entry of sub) {
        if (Array.isArray(entry) && entry[0] === chipName && entry[1] > 0) return 1;
        if (typeof entry === 'string' && entry === chipName) return 1;
      }
    }
    return 0;
  },

  'artifacts.hasArtifact'(save, artifactName) {
    const sailing = _pk(save.data, 'Sailing');
    if (!Array.isArray(sailing)) return 0;
    const arts = sailing[3];
    if (!Array.isArray(arts)) return 0;
    for (const art of arts) {
      if (Array.isArray(art) && art[0] === artifactName && art[1] > 0) return 1;
    }
    return 0;
  },

  'meals.hasMeal'(save, mealName) {
    const meals = _pk(save.data, 'Meals') || save.data?.Meals;
    if (!Array.isArray(meals)) return 0;
    // Meals array alternates [level, speed, level, speed ...]; even indices = level
    // mealName can be a numeric index or a string name matched against index
    const idx = typeof mealName === 'number' ? mealName : parseInt(mealName, 10);
    if (!isNaN(idx)) {
      const levelIdx = idx * 2;
      return (meals[levelIdx] ?? 0) > 0 ? 1 : 0;
    }
    return 0;
  },

  // ══════════════ PER-CHAR COUNTS ══════════════

  'characters.inLab'(save) {
    let count = 0;
    for (let i = 0; i < 12; i++) {
      const misc = _pk(save.data, `PVMisc_${i}`);
      // PVMisc index 4 is "in lab" flag (1 = in lab)
      if (Array.isArray(misc) && misc[4] === 1) count++;
    }
    return count;
  },

  'characters.withStarSign'(save, signName) {
    let count = 0;
    for (let i = 0; i < 12; i++) {
      const ss = _pk(save.data, `SSprog_${i}`) || _pk(save.data, `StarSign_${i}`);
      if (!Array.isArray(ss)) continue;
      // Each entry is [signId, equipped] — check if any equipped entry matches signName
      for (const entry of ss) {
        if (Array.isArray(entry) && entry[0] === signName && entry[1] > 0) { count++; break; }
      }
    }
    return count;
  },

  // ══════════════ PERCENTAGE EXTRACTORS (return 0–100) ══════════════

  'stamps.pctLeveled'(save) {
    const { leveled, total } = getStampStats(save);
    return total > 0 ? Math.round((leveled / total) * 100) : 0;
  },

  'bubbles.pctLeveled'(save) {
    const ci = _pk(save.data, 'CauldronInfo');
    if (!Array.isArray(ci)) return 0;
    const tabs = [ci[0], ci[1], ci[2], ci[3]];
    let total = 0, leveled = 0;
    for (const tab of tabs) {
      if (!tab || typeof tab !== 'object' || Array.isArray(tab)) continue;
      for (const v of Object.values(tab)) {
        if (typeof v === 'number') { total++; if (v > 0) leveled++; }
      }
    }
    return total > 0 ? Math.round((leveled / total) * 100) : 0;
  },

  // ══════════════ AVERAGE EXTRACTORS ══════════════

  'statues.avgLevel'(save) {
    const stug = _pk(save.data, 'StuG') || save.data?.StuG;
    if (!Array.isArray(stug) || stug.length === 0) return 0;
    const leveled = stug.filter(v => typeof v === 'number' && v > 0);
    if (leveled.length === 0) return 0;
    return Math.round((leveled.reduce((s, v) => s + v, 0) / leveled.length) * 10) / 10;
  },

  'stamps.avgLevel'(save) {
    const { totalLevels, leveled } = getStampStats(save);
    return leveled > 0 ? Math.round((totalLevels / leveled) * 10) / 10 : 0;
  },

  'bubbles.avgLevel'(save) {
    const ci = _pk(save.data, 'CauldronInfo');
    if (!Array.isArray(ci)) return 0;
    let sum = 0, count = 0;
    for (let t = 0; t < 4; t++) {
      const tab = ci[t];
      if (!tab || typeof tab !== 'object' || Array.isArray(tab)) continue;
      for (const v of Object.values(tab)) { if (typeof v === 'number' && v > 0) { sum += v; count++; } }
    }
    return count > 0 ? Math.round((sum / count) * 10) / 10 : 0;
  },

  // ══════════════ EQUINOX ══════════════

  'equinox.bonusesUnlocked'(save) {
    // Dream: array where each index = 1 if that equinox dream/bonus is unlocked
    const dream = _pk(save.data, 'Dream') || save.data?.Dream;
    if (!Array.isArray(dream)) return 0;
    return dream.filter(v => v === 1).length;
  },

  // ══════════════ REFINERY ══════════════

  'refinery.highestRank'(save) {
    // Refinery: array per salt type, each entry [rank, cycles, storage, ...]
    const ref = _pk(save.data, 'Refinery') || save.data?.Refinery;
    if (!Array.isArray(ref)) return 0;
    let max = 0;
    for (const salt of ref) {
      const rank = Array.isArray(salt) ? salt[0] : (typeof salt === 'number' ? salt : 0);
      if (typeof rank === 'number' && rank > max) max = rank;
    }
    return max;
  },

  'refinery.totalRanks'(save) {
    // Sum of all salt ranks across all refinery slots
    const ref = _pk(save.data, 'Refinery') || save.data?.Refinery;
    if (!Array.isArray(ref)) return 0;
    let total = 0;
    for (const salt of ref) {
      const rank = Array.isArray(salt) ? salt[0] : (typeof salt === 'number' ? salt : 0);
      total += typeof rank === 'number' ? rank : 0;
    }
    return total;
  },

  // ══════════════ SHRINES ══════════════

  'shrines.active'(save) {
    // Shrine: array of shrine entries, each [mapId, level, xp, ...]. level > 0 = active
    const shrine = _pk(save.data, 'Shrine') || save.data?.Shrine;
    if (!Array.isArray(shrine)) return 0;
    return shrine.filter(s => {
      const lv = Array.isArray(s) ? s[1] : (typeof s === 'number' ? s : 0);
      return typeof lv === 'number' && lv > 0;
    }).length;
  },

  'shrines.totalLevels'(save) {
    // Sum of all shrine levels
    const shrine = _pk(save.data, 'Shrine') || save.data?.Shrine;
    if (!Array.isArray(shrine)) return 0;
    let total = 0;
    for (const s of shrine) {
      const lv = Array.isArray(s) ? s[1] : (typeof s === 'number' ? s : 0);
      if (typeof lv === 'number' && lv > 0) total += lv;
    }
    return total;
  },

  // ══════════════ ARCADE ══════════════

  'arcade.totalLevels'(save) {
    const upg = _pk(save.data, 'ArcadeUpg') || save.data?.ArcadeUpg;
    if (!Array.isArray(upg)) return 0;
    return upg.reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
  },

  'arcade.highestLevel'(save) {
    const upg = _pk(save.data, 'ArcadeUpg') || save.data?.ArcadeUpg;
    if (!Array.isArray(upg)) return 0;
    return Math.max(0, ...upg.filter(v => typeof v === 'number'));
  },

  // ══════════════ DUNGEON ══════════════

  'dungeon.totalUpgrades'(save) {
    // DungUpg: [0]=RNG items, [1]=currency, [2]=flurbo shop, [3]=upgrades (actual levels)
    const dung = _pk(save.data, 'DungUpg') || save.data?.DungUpg;
    if (!Array.isArray(dung) || !Array.isArray(dung[3])) return 0;
    return dung[3].reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
  },

  // ══════════════ GAMING ══════════════

  'gaming.superbitActive'(save) {
    // Gaming[0] = superbit state/level array; count active (> 0)
    const gaming = _pk(save.data, 'Gaming') || save.data?.Gaming;
    if (!Array.isArray(gaming) || !Array.isArray(gaming[0])) return 0;
    return gaming[0].filter(v => typeof v === 'number' && v > 0).length;
  },

  // ══════════════ GRIMOIRE ══════════════

  'grimoire.totalLevels'(save) {
    // Grimoire: Death Bringer upgrade levels array
    const gr = _pk(save.data, 'Grimoire') || save.data?.Grimoire;
    if (!Array.isArray(gr)) return 0;
    return gr.reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
  },

  'grimoire.highestLevel'(save) {
    const gr = _pk(save.data, 'Grimoire') || save.data?.Grimoire;
    if (!Array.isArray(gr)) return 0;
    return Math.max(0, ...gr.filter(v => typeof v === 'number'));
  },

  // ══════════════ TESSERACT ══════════════

  'tesseract.unlocked'(save) {
    // Tess: Wind Walker tesseract entries; count > 0 = unlocked
    const tess = _pk(save.data, 'Tess') || save.data?.Tess;
    if (!Array.isArray(tess)) return 0;
    return tess.filter(v => typeof v === 'number' && v > 0).length;
  },

  // ══════════════ COMPASS ══════════════

  'compass.totalLevels'(save) {
    // Compass: Wind Walker Compass upgrade totals
    const comp = _pk(save.data, 'Compass') || save.data?.Compass;
    if (!Array.isArray(comp)) return 0;
    let total = 0;
    for (const entry of comp) {
      if (Array.isArray(entry)) {
        for (const v of entry) if (typeof v === 'number' && v > 0) total += v;
      } else {
        total += typeof entry === 'number' ? entry : 0;
      }
    }
    return total;
  },

  // ══════════════ ARCANE ══════════════

  'arcane.activeNodes'(save) {
    // Arcane: list[100] ints; [0-56] = active node levels, [57-99] = unused
    const arc = _pk(save.data, 'Arcane') || save.data?.Arcane;
    if (!Array.isArray(arc)) return 0;
    return arc.slice(0, 57).filter(v => typeof v === 'number' && v > 0).length;
  },

  'arcane.totalLevels'(save) {
    // Sum of all active arcane node levels ([0-56])
    const arc = _pk(save.data, 'Arcane') || save.data?.Arcane;
    if (!Array.isArray(arc)) return 0;
    return arc.slice(0, 57).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
  },

  // ══════════════ RESEARCH ══════════════

  'research.booksUpgraded'(save) {
    // Research: Array[14] of progress arrays; [i][0] > 0 = upgraded
    const res = _pk(save.data, 'Research') || save.data?.Research;
    if (!Array.isArray(res)) return 0;
    return res.filter(entry => {
      if (Array.isArray(entry)) return typeof entry[0] === 'number' && entry[0] > 0;
      return typeof entry === 'number' && entry > 0;
    }).length;
  },

  // ══════════════ STAMPS — EXALT ══════════════

  'stamps.exaltPlaced'(save) {
    // Compass[4] = array of placed exalt stamps (length = how many stamps are exalted)
    const comp = _pk(save.data, 'Compass') || save.data?.Compass;
    if (!Array.isArray(comp) || comp.length < 5) return 0;
    const raw = comp[4];
    return Array.isArray(raw) ? raw.length : 0;
  },

  'stamps.exaltBonusPct'(save) {
    // Approximate total exalt bonus % (base 100 + various sources)
    const data = save.data || {};
    const ola = data.OptLacc;
    const spelunk = _pk(data, 'Spelunk');
    const atoms = _pk(data, 'Atoms');
    const exaltedFrag = Array.isArray(spelunk) && Array.isArray(spelunk[4]) && typeof spelunk[4][3] === 'number'
      ? Math.floor(spelunk[4][3]) : 0;
    const atomBonus = Array.isArray(atoms) && typeof atoms[12] === 'number' ? atoms[12] : 0;
    let armorSetBonus = 0;
    if (Array.isArray(ola) && ola[379]) {
      if (String(ola[379]).split(',').includes('EMPEROR_SET')) armorSetBonus = 20;
    }
    const eventBonus = Array.isArray(ola) && Number(ola[311]) > 0 ? 20 : 0;
    return 100 + atomBonus + armorSetBonus + eventBonus + exaltedFrag;
  },

  // ══════════════ BRIBES ══════════════

  'bribes.bought'(save) {
    const br = _pk(save.data, 'BribeStatus') || save.data?.BribeStatus;
    if (!Array.isArray(br)) return 0;
    return br.filter(x => typeof x === 'number' && x > 0).length;
  },

  'bribes.total'(save) {
    const br = _pk(save.data, 'BribeStatus') || save.data?.BribeStatus;
    return Array.isArray(br) ? br.length : 0;
  },

  // ══════════════ STATUES (extended) ══════════════

  'statues.goldCount'(save) {
    const stug = _pk(save.data, 'StuG') || save.data?.StuG;
    if (!Array.isArray(stug)) return 0;
    return stug.slice(0, 32).filter(v => v === 3).length;
  },

  'statues.silverCount'(save) {
    const stug = _pk(save.data, 'StuG') || save.data?.StuG;
    if (!Array.isArray(stug)) return 0;
    return stug.slice(0, 32).filter(v => v === 2).length;
  },

  'statues.statueLevel'(save, param) {
    // param = statue index (0-31) — returns max level across all characters
    const idx = parseInt(String(param ?? ''), 10);
    if (isNaN(idx) || idx < 0 || idx > 31) return 0;
    let max = 0;
    for (let i = 0; i < 12; i++) {
      const sl = _pk(save.data, `StatueLevels_${i}`);
      if (!Array.isArray(sl) || !sl[idx]) continue;
      const entry = sl[idx];
      const lv = Array.isArray(entry) ? (entry[0] || 0) : (typeof entry === 'number' ? entry : 0);
      if (lv > max) max = lv;
    }
    return max;
  },

  'statues.statueGold'(save, param) {
    // param = statue index (0-31) — returns 1 if statue at this index is gold (StuG[idx] === 3)
    const idx = parseInt(String(param ?? ''), 10);
    if (isNaN(idx) || idx < 0 || idx > 31) return 0;
    const stug = _pk(save.data, 'StuG') || save.data?.StuG;
    return Array.isArray(stug) && stug[idx] === 3 ? 1 : 0;
  },

  // ══════════════ FORGE (extended) ══════════════

  'forge.upgradeSum'(save) {
    const fv = _pk(save.data, 'ForgeLV') || save.data?.ForgeLV;
    if (!Array.isArray(fv)) return 0;
    return fv.reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
  },

  'forge.upgradedCount'(save) {
    const fv = _pk(save.data, 'ForgeLV') || save.data?.ForgeLV;
    if (!Array.isArray(fv)) return 0;
    return fv.filter(v => typeof v === 'number' && v > 0).length;
  },

  // ══════════════ ANVIL (extended) ══════════════

  'anvil.unspentPoints'(save) {
    // AnvilPAstats_{i}[1] = stored production points not yet spent
    let total = 0;
    for (let i = 0; i < 12; i++) {
      const stats = _pk(save.data, `AnvilPAstats_${i}`);
      if (Array.isArray(stats) && typeof stats[1] === 'number') total += stats[1];
    }
    return total;
  },

  // ══════════════ POST OFFICE (extended) ══════════════

  'postOffice.boxLevel'(save, param) {
    // param = box index (0-23) — returns max level across all characters
    const idx = parseInt(String(param ?? ''), 10);
    if (isNaN(idx) || idx < 0) return 0;
    let max = 0;
    for (let i = 0; i < 12; i++) {
      const po = _pk(save.data, `POu_${i}`);
      if (!Array.isArray(po)) continue;
      const lv = typeof po[idx] === 'number' ? po[idx] : 0;
      if (lv > max) max = lv;
    }
    return max;
  },

  // ══════════════ ACHIEVEMENTS (extended) ══════════════

  'achievements.hasAchievement'(save, param) {
    // param = achievement index (integer)
    const idx = parseInt(String(param ?? ''), 10);
    if (isNaN(idx) || idx < 0) return 0;
    const ach = _pk(save.data, 'AchieveReg');
    if (!Array.isArray(ach)) return 0;
    const v = ach[idx];
    return (typeof v === 'number' && v > 0) || v === true ? 1 : 0;
  },

  // ══════════════ VIALS (extended) ══════════════

  'vials.level'(save, param) {
    // param = vial index (0-83) — returns current level of that specific vial
    const idx = parseInt(String(param ?? ''), 10);
    if (isNaN(idx) || idx < 0) return 0;
    const ci = _pk(save.data, 'CauldronInfo');
    if (!Array.isArray(ci)) return 0;
    let vialsRaw = Array.isArray(ci[4]) ? ci[5] : ci[4];
    if (typeof vialsRaw === 'string') try { vialsRaw = JSON.parse(vialsRaw); } catch { return 0; }
    if (!vialsRaw || typeof vialsRaw !== 'object') return 0;
    const v = vialsRaw[String(idx)];
    return typeof v === 'number' ? v : 0;
  },

  'vials.isMaxed'(save, param) {
    // param = vial index (0-83) — returns 1 if vial >= max level (13)
    const idx = parseInt(String(param ?? ''), 10);
    if (isNaN(idx) || idx < 0) return 0;
    const ci = _pk(save.data, 'CauldronInfo');
    if (!Array.isArray(ci)) return 0;
    let vialsRaw = Array.isArray(ci[4]) ? ci[5] : ci[4];
    if (typeof vialsRaw === 'string') try { vialsRaw = JSON.parse(vialsRaw); } catch { return 0; }
    if (!vialsRaw || typeof vialsRaw !== 'object') return 0;
    const VIAL_MAX = 13;
    const v = vialsRaw[String(idx)];
    return typeof v === 'number' && v >= VIAL_MAX ? 1 : 0;
  },

  // ══════════════ BRIBES (extended) ══════════════

  'bribes.pctPurchased'(save) {
    const br = _pk(save.data, 'BribeStatus') || save.data?.BribeStatus;
    if (!Array.isArray(br) || br.length === 0) return 0;
    const bought = br.filter(x => typeof x === 'number' && x > 0).length;
    return Math.round((bought / br.length) * 100);
  },

  'bribes.setBought'(save, param) {
    // param = set index (0-based). Returns 1 if ALL bribes in that set are purchased, else 0.
    const BRIBES_PER_SET = 5;
    const setIdx = parseInt(String(param ?? ''), 10);
    if (isNaN(setIdx) || setIdx < 0) return 0;
    const br = _pk(save.data, 'BribeStatus') || save.data?.BribeStatus;
    if (!Array.isArray(br)) return 0;
    const start = setIdx * BRIBES_PER_SET;
    const end = Math.min(start + BRIBES_PER_SET, br.length);
    if (start >= br.length) return 0;
    for (let i = start; i < end; i++) {
      if (typeof br[i] !== 'number' || br[i] <= 0) return 0;
    }
    return 1;
  },

  'bribes.setProgress'(save, param) {
    // param = set index (0-based). Returns count of bribes bought in that set.
    const BRIBES_PER_SET = 5;
    const setIdx = parseInt(String(param ?? ''), 10);
    if (isNaN(setIdx) || setIdx < 0) return 0;
    const br = _pk(save.data, 'BribeStatus') || save.data?.BribeStatus;
    if (!Array.isArray(br)) return 0;
    const start = setIdx * BRIBES_PER_SET;
    const end = Math.min(start + BRIBES_PER_SET, br.length);
    if (start >= br.length) return 0;
    let count = 0;
    for (let i = start; i < end; i++) {
      if (typeof br[i] === 'number' && br[i] > 0) count++;
    }
    return count;
  },

  // ══════════════ COLOSSEUM ══════════════

  'colosseum.bestScore'(save) {
    // FamValColosseumHighscores[map] = highest score per player; take global max
    const hs = _pk(save.data, 'FamValColosseumHighscores') || save.data?.FamValColosseumHighscores;
    if (!hs || typeof hs !== 'object') return 0;
    let max = 0;
    const vals = Array.isArray(hs) ? hs : Object.values(hs);
    for (const v of vals) {
      const n = Array.isArray(v) ? Math.max(...v.filter(x => typeof x === 'number')) : (typeof v === 'number' ? v : 0);
      if (n > max) max = n;
    }
    return max;
  },

  // ══════════════ SIGILS ══════════════

  'alchemy.sigilsUnlocked'(save) {
    // Sigils are stored in CauldronInfo[2] (or separate SigilUnlock)
    const ci = _pk(save.data, 'CauldronInfo');
    if (!Array.isArray(ci)) return 0;
    // Try ci[2] as object of sigil states (1 = unlocked)
    const sigils = ci[2];
    if (!sigils || typeof sigils !== 'object') return 0;
    return Object.values(sigils).filter(v => typeof v === 'number' && v >= 1).length;
  },

  'alchemy.cauldronUpgradeTotal'(save) {
    // Cauldron upgrades: CauldronInfo[1] for each cauldron, sum all levels
    const ci = _pk(save.data, 'CauldronInfo');
    if (!Array.isArray(ci) || !Array.isArray(ci[1])) return 0;
    let total = 0;
    for (const cauldron of ci[1]) {
      if (!cauldron || typeof cauldron !== 'object') continue;
      for (const v of Object.values(cauldron)) {
        if (typeof v === 'number' && v > 0) total += v;
      }
    }
    return total;
  },

  // ══════════════ OBOLS (extended) ══════════════

  'obols.charEquippedTotal'(save) {
    // Per-character obols in ObolEqO1_{i} and ObolEqO2_{i}
    let total = 0;
    for (let i = 0; i < 12; i++) {
      const o1 = _pk(save.data, `ObolEqO1_${i}`) || [];
      const o2 = _pk(save.data, `ObolEqO2_${i}`) || [];
      total += [...(o1 || []), ...(o2 || [])].filter(v => v && v !== '0' && v !== 0).length;
    }
    return total;
  },

  // ══════════════ LIBRARY ══════════════

  'library.booksUpgraded'(save) {
    // Same as research.booksUpgraded — Research array
    const res = _pk(save.data, 'Research') || save.data?.Research;
    if (!Array.isArray(res)) return 0;
    return res.filter(entry => {
      if (Array.isArray(entry)) return typeof entry[0] === 'number' && entry[0] > 0;
      return typeof entry === 'number' && entry > 0;
    }).length;
  },

  // ══════════════ DEATH NOTE (extended) ══════════════

  'deathnote.goldSkullCount'(save) {
    // Gold skull = 10k+ kills per map. Count maps across all characters.
    const GOLD_SKULL = 10_000;
    let total = 0;
    for (let i = 0; i < 12; i++) {
      const kla = _pk(save.data, `KLA_${i}`);
      if (!Array.isArray(kla)) continue;
      for (const mapEntry of kla) {
        if (Array.isArray(mapEntry) && typeof mapEntry[0] === 'number' && mapEntry[0] >= GOLD_SKULL) total++;
      }
    }
    return total;
  },

  'deathnote.emeraldSkullCount'(save) {
    // Emerald skull = 1M+ kills per map
    const EMERALD_SKULL = 1_000_000;
    let total = 0;
    for (let i = 0; i < 12; i++) {
      const kla = _pk(save.data, `KLA_${i}`);
      if (!Array.isArray(kla)) continue;
      for (const mapEntry of kla) {
        if (Array.isArray(mapEntry) && typeof mapEntry[0] === 'number' && mapEntry[0] >= EMERALD_SKULL) total++;
      }
    }
    return total;
  },

  // ══════════════ LAB (extended) ══════════════

  'lab.jewelsActive'(save) {
    // Lab[2] or Lab[3] = jewel slots; count non-zero entries
    const lab = _pk(save.data, 'Lab');
    if (!Array.isArray(lab)) return 0;
    // Try each sub-array for jewel data
    let count = 0;
    for (let i = 2; i < 5; i++) {
      const row = lab[i];
      if (!Array.isArray(row)) continue;
      count += row.filter(v => v && v !== 'Blank' && v !== 0).length;
    }
    return count;
  },

  // ══════════════ COOKING (extended) ══════════════

  'cooking.avgMealLevel'(save) {
    const meals = _pk(save.data, 'Meals');
    if (!Array.isArray(meals)) return 0;
    let sum = 0, count = 0;
    for (let i = 0; i < meals.length; i += 2) {
      const lv = meals[i];
      if (typeof lv === 'number' && lv > 0) { sum += lv; count++; }
    }
    return count > 0 ? Math.round((sum / count) * 10) / 10 : 0;
  },

  'cooking.totalMealLevels'(save) {
    const meals = _pk(save.data, 'Meals');
    if (!Array.isArray(meals)) return 0;
    let total = 0;
    for (let i = 0; i < meals.length; i += 2) {
      const lv = meals[i];
      if (typeof lv === 'number' && lv > 0) total += lv;
    }
    return total;
  },

  // ══════════════ BREEDING (extended) ══════════════

  'breeding.totalUpgradeLevels'(save) {
    // Breeding sub-arrays contain upgrade/territory data
    const breed = _pk(save.data, 'Breeding') || save.data?.Breeding;
    if (!Array.isArray(breed)) return 0;
    let total = 0;
    for (const row of breed) {
      if (Array.isArray(row)) {
        for (const v of row) if (typeof v === 'number' && v > 0) total += v;
      } else if (typeof row === 'number' && row > 0) total += row;
    }
    return total;
  },

  'breeding.petsStored'(save) {
    const ps = _pk(save.data, 'PetsStored');
    if (!Array.isArray(ps)) return 0;
    return ps.filter(p => Array.isArray(p) && p[0] && p[0] !== 'Blank').length;
  },

  // ══════════════ RIFT (extended) ══════════════

  'rift.highestBonus'(save) {
    const rift = _pk(save.data, 'Rift') || save.data?.Rift;
    if (!Array.isArray(rift)) return 0;
    return Math.max(0, ...rift.filter(v => typeof v === 'number' && v > 0));
  },

  // ══════════════ SAILING (extended) ══════════════

  'sailing.boatMaxLevel'(save) {
    const sailing = _pk(save.data, 'Sailing');
    if (!Array.isArray(sailing) || !Array.isArray(sailing[0])) return 0;
    // sailing[0] = boat data: [[level, loot, ...], ...]
    return Math.max(0, ...sailing[0].map(b => Array.isArray(b) ? (b[0] || 0) : 0));
  },

  'sailing.captainMaxLevel'(save) {
    const sailing = _pk(save.data, 'Sailing');
    if (!Array.isArray(sailing) || !Array.isArray(sailing[2])) return 0;
    // sailing[2] = captain data: [[level, ...], ...]
    return Math.max(0, ...sailing[2].map(c => Array.isArray(c) ? (c[0] || 0) : 0));
  },

  'sailing.captainCount'(save) {
    const sailing = _pk(save.data, 'Sailing');
    if (!Array.isArray(sailing) || !Array.isArray(sailing[2])) return 0;
    return sailing[2].filter(c => Array.isArray(c) && c[0] > 0).length;
  },

  // ══════════════ DIVINITY (extended) ══════════════

  'divinity.totalPoints'(save) {
    // Divinity[1] = points per god slot
    const div = _pk(save.data, 'Divinity');
    if (!Array.isArray(div) || !Array.isArray(div[1])) return 0;
    return div[1].reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
  },

  'divinity.linksActive'(save) {
    // Count characters linked to a god (Divinity[2] or per-char flags)
    const div = _pk(save.data, 'Divinity');
    if (!Array.isArray(div)) return 0;
    // div[2] = per-char links (non-zero = linked)
    const links = div[2];
    if (!Array.isArray(links)) return 0;
    return links.filter(v => typeof v === 'number' && v > 0).length;
  },

  // ══════════════ FARMING (extended) ══════════════

  'farming.cropMasteryTotal'(save) {
    // FarmCrop is an object {cropIndex: [level, mastery, ...]}
    const cm = _pk(save.data, 'FarmCrop') || save.data?.FarmCrop;
    if (!cm || typeof cm !== 'object') return 0;
    let total = 0;
    for (const vals of Object.values(cm)) {
      if (Array.isArray(vals) && typeof vals[1] === 'number') total += vals[1];
      else if (typeof vals === 'number' && vals > 0) total += vals;
    }
    return total;
  },

  'farming.plotsUnlocked'(save) {
    const plots = _pk(save.data, 'FarmPlot');
    if (!Array.isArray(plots)) return 0;
    return plots.filter(p => Array.isArray(p) && p[0] !== -1).length;
  },

  // ══════════════ CAVERNS (extended) ══════════════

  'caverns.motherlodeCompleted'(save) {
    // Holes[1] or Holes[2] = motherlode progress; count completed
    const holes = _pk(save.data, 'Holes');
    if (!Array.isArray(holes) || !Array.isArray(holes[1])) return 0;
    return holes[1].filter(v => typeof v === 'number' && v >= 1).length;
  },

  // ══════════════ BEES (extended) ══════════════

  'bees.totalBeeUpgrades'(save) {
    // Bubba[0] = upgrade levels array
    const bubba = _pk(save.data, 'Bubba');
    if (!Array.isArray(bubba) || !Array.isArray(bubba[0])) return 0;
    return bubba[0].reduce((s, v) => s + (typeof v === 'number' && v > 0 ? v : 0), 0);
  },

  'bees.queenLevel'(save) {
    // Bubba[2] or similar = queen level
    const bubba = _pk(save.data, 'Bubba');
    if (!Array.isArray(bubba)) return 0;
    // Queen is likely at a fixed index; try index 2
    const qLv = bubba[2];
    return typeof qLv === 'number' ? qLv : 0;
  },

  // ══════════════ SNEAKING (extended) ══════════════

  'sneaking.masteryTotal'(save) {
    // Spelunk[2] or [3] = mastery levels
    const spelunk = _pk(save.data, 'Spelunk');
    if (!Array.isArray(spelunk)) return 0;
    let total = 0;
    for (let idx = 2; idx < 5; idx++) {
      const arr = spelunk[idx];
      if (!Array.isArray(arr)) continue;
      for (const v of arr) if (typeof v === 'number' && v > 0) total += v;
    }
    return total;
  },

  // ══════════════ TASKS ══════════════

  'tasks.totalTiersCompleted'(save) {
    // TaskZZ0–TaskZZ4 = task completion arrays; count completed entries
    let total = 0;
    for (let i = 0; i < 5; i++) {
      const tz = _pk(save.data, `TaskZZ${i}`) || save.data?.[`TaskZZ${i}`];
      if (!Array.isArray(tz)) continue;
      total += tz.filter(v => typeof v === 'number' && v > 0).length;
    }
    return total;
  },

  // ══════════════ CHARACTERS (extended) ══════════════

  'characters.avgLevel'(save) {
    const levels = [];
    for (let i = 0; i < 12; i++) {
      const lv = _pk(save.data, `Lv_${i}`);
      if (Array.isArray(lv) && typeof lv[0] === 'number' && lv[0] > 0) levels.push(lv[0]);
    }
    return levels.length > 0 ? Math.round(levels.reduce((a, b) => a + b, 0) / levels.length) : 0;
  },

  'characters.totalLevels'(save) {
    let total = 0;
    for (let i = 0; i < 12; i++) {
      const lv = _pk(save.data, `Lv_${i}`);
      if (Array.isArray(lv) && typeof lv[0] === 'number') total += lv[0];
    }
    return total;
  },

  'characters.classUnlocked'(save, param) {
    // param = class id (integer) — returns 1 if any character has that class
    const classId = parseInt(String(param ?? ''), 10);
    if (isNaN(classId)) return 0;
    const cc = _pk(save.data, 'CharacterClass');
    if (!Array.isArray(cc)) return 0;
    return cc.includes(classId) ? 1 : 0;
  },

  // ══════════════ QUESTS ══════════════

  'quests.totalCompleted'(save) {
    // QuestComplete_{i} per character
    let total = 0;
    for (let i = 0; i < 12; i++) {
      const qc = _pk(save.data, `QuestComplete_${i}`);
      if (!qc || typeof qc !== 'object') continue;
      const obj = typeof qc === 'string' ? JSON.parse(qc) : qc;
      total += Object.values(obj).filter(v => v === 1 || v === true).length;
    }
    return total;
  },

  // ══════════════ DUNGEONS ══════════════

  'dungeon.flurboTotal'(save) {
    // DungUpg[1] = currency amounts; sum all
    const dung = _pk(save.data, 'DungUpg') || save.data?.DungUpg;
    if (!Array.isArray(dung) || !Array.isArray(dung[1])) return 0;
    return dung[1].reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
  },

  // ══════════════ GAMING (extended) ══════════════

  'gaming.evolutionsCompleted'(save) {
    // Gaming[1] = evolution levels; count > 0
    const gaming = _pk(save.data, 'Gaming') || save.data?.Gaming;
    if (!Array.isArray(gaming) || !Array.isArray(gaming[1])) return 0;
    return gaming[1].filter(v => typeof v === 'number' && v > 0).length;
  },

  // ══════════════ SUMMONING (extended) ══════════════

  'summoning.winsTotal'(save) {
    const summon = _pk(save.data, 'Summon');
    if (!Array.isArray(summon) || !Array.isArray(summon[1])) return 0;
    return summon[1].reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
  },

  // ══════════════ BUG CATCHING (extended) ══════════════

  'bugCatching.totalCritters'(save) {
    const bi = _pk(save.data, 'BugInfo');
    if (!Array.isArray(bi) || !Array.isArray(bi[0])) return 0;
    // bi[0] = critter counts per slot
    return bi[0].reduce((s, v) => s + (typeof v === 'number' && v > 0 ? v : 0), 0);
  },

  // ══════════════ SUSHI (extended) ══════════════

  'sushi.totalDishLevels'(save) {
    const sushi = _pk(save.data, 'Sushi');
    if (!Array.isArray(sushi) || !Array.isArray(sushi[7])) return 0;
    return sushi[7].reduce((s, v) => s + (typeof v === 'number' && v > 0 ? v : 0), 0);
  },

  // ══════════════ SLAB (extended) ══════════════

  'slab.pctObtained'(save) {
    // Rough estimate: compare slab count to known total (~1000 items)
    const slab = _pk(save.data, 'Cards1');
    if (!Array.isArray(slab)) return 0;
    const TOTAL_ITEMS = 1000;
    return Math.min(100, Math.round((slab.length / TOTAL_ITEMS) * 100));
  },

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  BATCH — Zero-coverage systems (brand new domains)                     ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  // ── COMPANIONS ────────────────────────────────────────────────────────────
  'companions.owned'(save) {
    const comp = save.companion || save.data?.companion;
    if (!comp || !comp.a) return 0;
    if (Array.isArray(comp.a)) return comp.a.filter(v => v && v !== 0).length;
    if (typeof comp.a === 'object') return Object.values(comp.a).filter(v => v && v !== 0).length;
    return 0;
  },
  'companions.totalLevel'(save) {
    const comp = save.companion || save.data?.companion;
    if (!comp || !comp.a) return 0;
    const arr = Array.isArray(comp.a) ? comp.a : Object.values(comp.a);
    return arr.reduce((s, v) => s + (typeof v === 'number' && v > 0 ? v : 0), 0);
  },
  'companions.linkedCount'(save) {
    const comp = save.companion || save.data?.companion;
    if (!comp || !comp.l) return 0;
    const arr = Array.isArray(comp.l) ? comp.l : Object.values(comp.l);
    return arr.filter(v => v && v !== -1 && v !== 0).length;
  },

  // ── GUILD ─────────────────────────────────────────────────────────────────
  'guild.gp'(save) {
    const g = _pk(save.data, 'Guild') || save.guildData;
    if (!g) return 0;
    if (Array.isArray(g) && typeof g[1] === 'number') return g[1];
    if (typeof g === 'object' && typeof g.gp === 'number') return g.gp;
    return 0;
  },
  'guild.bonusesUnlocked'(save) {
    const g = _pk(save.data, 'Guild') || save.guildData;
    if (!g) return 0;
    if (Array.isArray(g) && Array.isArray(g[0])) return g[0].filter(v => typeof v === 'number' && v > 0).length;
    if (typeof g === 'object' && Array.isArray(g.bonuses)) return g.bonuses.filter(v => v > 0).length;
    return 0;
  },
  'guild.memberCount'(save) {
    const g = save.guildData;
    if (!g) return 0;
    if (Array.isArray(g.members)) return g.members.length;
    if (typeof g.memberCount === 'number') return g.memberCount;
    return 0;
  },

  // ── COGS ──────────────────────────────────────────────────────────────────
  'cogs.placed'(save) {
    const cogO = _pk(save.data, 'CogO');
    if (!Array.isArray(cogO)) return 0;
    return cogO.filter(v => v && v !== 'Blank' && v !== '' && v !== 0).length;
  },
  'cogs.totalLevels'(save) {
    const cogM = _pk(save.data, 'CogM');
    if (!cogM || typeof cogM !== 'object') return 0;
    return Object.values(cogM).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
  },

  // ── PRINTER (3D) ──────────────────────────────────────────────────────────
  'printer.slotsActive'(save) {
    const pr = _pk(save.data, 'Print');
    if (!Array.isArray(pr)) return 0;
    let active = 0;
    for (const row of pr) {
      if (!Array.isArray(row)) continue;
      for (const slot of row) if (slot && slot !== 'Blank' && slot !== '' && slot !== -1) active++;
    }
    return active;
  },
  'printer.samplesCollected'(save) {
    const pr = _pk(save.data, 'Print');
    if (!Array.isArray(pr)) return 0;
    let count = 0;
    for (const row of pr) {
      if (!Array.isArray(row)) continue;
      count += row.filter(v => v && v !== 'Blank' && v !== '' && v !== -1).length;
    }
    return count;
  },

  // ── TRAPS ─────────────────────────────────────────────────────────────────
  'traps.activeCount'(save) {
    let total = 0;
    for (let i = 0; i < 12; i++) {
      const t = _pk(save.data, `PldTraps_${i}`);
      if (!Array.isArray(t)) continue;
      total += t.filter(tr => Array.isArray(tr) && tr[0] && tr[0] !== 'Blank').length;
    }
    return total;
  },
  'traps.highestCritterTier'(save) {
    let max = 0;
    for (let i = 0; i < 12; i++) {
      const t = _pk(save.data, `PldTraps_${i}`);
      if (!Array.isArray(t)) continue;
      for (const tr of t) {
        if (Array.isArray(tr) && typeof tr[5] === 'number' && tr[5] > max) max = tr[5];
      }
    }
    return max;
  },

  // ── WORSHIP ───────────────────────────────────────────────────────────────
  'worship.totalEXP'(save) {
    const ti = _pk(save.data, 'TotemInfo');
    if (!Array.isArray(ti) || !Array.isArray(ti[2])) return 0;
    return Math.round(ti[2].reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0));
  },
  'worship.chargesPerChar'(save) {
    // Average charge rate across characters (from PlayerStuff_i if available)
    let sum = 0, count = 0;
    for (let i = 0; i < 12; i++) {
      const ps = _pk(save.data, `PlayerStuff_${i}`);
      if (!Array.isArray(ps)) continue;
      const charge = ps[7]; // worship charge index
      if (typeof charge === 'number' && charge > 0) { sum += charge; count++; }
    }
    return count > 0 ? Math.round(sum / count) : 0;
  },

  // ── KILLROY ───────────────────────────────────────────────────────────────
  'killroy.bestWave'(save) {
    const kr = _pk(save.data, 'KRbest');
    if (!kr || typeof kr !== 'object') return 0;
    const vals = Object.values(kr).filter(v => typeof v === 'number');
    return vals.length > 0 ? Math.max(...vals) : 0;
  },
  'killroy.worldsCompleted'(save) {
    const kr = _pk(save.data, 'KRbest');
    if (!kr || typeof kr !== 'object') return 0;
    return Object.values(kr).filter(v => typeof v === 'number' && v > 0).length;
  },

  // ── WEEKLY BOSS ───────────────────────────────────────────────────────────
  'weeklyBoss.totalCleared'(save) {
    const wb = _pk(save.data, 'WeeklyBoss') || save.data?.WeeklyBoss;
    if (!wb || typeof wb !== 'object') return 0;
    if (Array.isArray(wb)) return wb.filter(v => v && v > 0).length;
    return Object.values(wb).filter(v => typeof v === 'number' && v > 0).length;
  },

  // ── TALENT BOOKS ──────────────────────────────────────────────────────────
  'talents.maxedBooks'(save) {
    let count = 0;
    for (let i = 0; i < 12; i++) {
      const sm = _pk(save.data, `SM_${i}`);
      if (!sm || typeof sm !== 'object') continue;
      const vals = typeof sm === 'string' ? Object.values(JSON.parse(sm)) : Object.values(sm);
      count += vals.filter(v => typeof v === 'number' && v >= 100).length;
    }
    return count;
  },
  'talents.totalBookLevels'(save) {
    let total = 0;
    for (let i = 0; i < 12; i++) {
      const sm = _pk(save.data, `SM_${i}`);
      if (!sm || typeof sm !== 'object') continue;
      const vals = typeof sm === 'string' ? Object.values(JSON.parse(sm)) : Object.values(sm);
      total += vals.reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
    }
    return total;
  },
  'talents.uniqueTalentsLeveled'(save) {
    const seen = new Set();
    for (let i = 0; i < 12; i++) {
      const sl = _pk(save.data, `SL_${i}`);
      if (!sl || typeof sl !== 'object') continue;
      const obj = typeof sl === 'string' ? JSON.parse(sl) : sl;
      for (const [k, v] of Object.entries(obj)) {
        if (typeof v === 'number' && v > 0) seen.add(k);
      }
    }
    return seen.size;
  },

  // ── GEM SHOP ──────────────────────────────────────────────────────────────
  'gemShop.slotsPurchased'(save) {
    const gs = _pk(save.data, 'GemItemsPurchased');
    if (!Array.isArray(gs)) return 0;
    return gs.filter(v => typeof v === 'number' && v > 0).length;
  },
  'gemShop.totalSpent'(save) {
    const gs = _pk(save.data, 'GemItemsPurchased');
    if (!Array.isArray(gs)) return 0;
    return gs.reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
  },
  'gemShop.autoLoot'(save) {
    const sv = save.serverVars || save.data?.serverVars;
    if (sv && sv.AutoLoot === 1) return 1;
    const bun = _pk(save.data, 'bun_i');
    return bun === 1 ? 1 : 0;
  },

  // ── FISHING ───────────────────────────────────────────────────────────────
  'fishing.toolkitOwned'(save) {
    const ft = _pk(save.data, 'FamValFishingToolkitOwned');
    if (!Array.isArray(ft)) return 0;
    return ft.filter(v => v && v > 0).length;
  },

  // ── MINIGAMES ─────────────────────────────────────────────────────────────
  'minigames.bestTotal'(save) {
    const mg = _pk(save.data, 'FamValMinigameHiscores');
    if (!Array.isArray(mg)) return 0;
    return mg.reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
  },
  'minigames.gamesPlayed'(save) {
    let total = 0;
    for (let i = 0; i < 12; i++) {
      const p = _pk(save.data, `PVMinigamePlays_${i}`);
      if (typeof p === 'number') total += p;
    }
    return total;
  },

  // ── BOSS KEYS ─────────────────────────────────────────────────────────────
  'bosses.keysTotal'(save) {
    const keys = _pk(save.data, 'CYKeysAll');
    if (!Array.isArray(keys)) return 0;
    return keys.reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
  },
  'bosses.bestScores'(save) {
    const bi = _pk(save.data, 'BossInfo');
    if (!bi || typeof bi !== 'object') return 0;
    const arr = Array.isArray(bi) ? bi : Object.values(bi);
    let total = 0;
    for (const entry of arr) {
      if (Array.isArray(entry) && typeof entry[1] === 'number') total += entry[1];
      else if (typeof entry === 'object' && typeof entry?.highscore === 'number') total += entry.highscore;
    }
    return total;
  },

  // ── JARS (W6) ─────────────────────────────────────────────────────────────
  'jars.collected'(save) {
    const jars = _pk(save.data, 'Jars');
    if (!Array.isArray(jars)) return 0;
    return jars.filter(j => Array.isArray(j) && j[0] && j[0] !== -1 && j[0] !== 0).length;
  },
  'jars.totalValue'(save) {
    const jars = _pk(save.data, 'Jars');
    if (!Array.isArray(jars)) return 0;
    let total = 0;
    for (const j of jars) {
      if (Array.isArray(j) && typeof j[2] === 'number') total += j[2];
    }
    return total;
  },

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  BATCH — Skills & Characters detail                                    ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  'skills.avgLevel'(save, param) {
    // param = skill index (0=Combat,1=Mining,2=Smithing,3=Chopping,4=Fishing,5=Alchemy,6=Catching,7=Trapping,8=Construction,9=Worship,10=Cooking,11=Breeding,12=Lab,13=Sailing,14=Divinity,15=Gaming,16=Farming,17=Sneaking,18=Summoning,19=Spelunking)
    const idx = parseInt(String(param ?? ''), 10);
    if (isNaN(idx) || idx < 0) return 0;
    let sum = 0, count = 0;
    for (let i = 0; i < 12; i++) {
      const lv = _pk(save.data, `Lv0_${i}`);
      if (!Array.isArray(lv) || typeof lv[idx] !== 'number' || lv[idx] <= 0) continue;
      sum += lv[idx]; count++;
    }
    return count > 0 ? Math.round(sum / count) : 0;
  },
  'skills.maxLevel'(save, param) {
    const idx = parseInt(String(param ?? ''), 10);
    if (isNaN(idx) || idx < 0) return 0;
    let max = 0;
    for (let i = 0; i < 12; i++) {
      const lv = _pk(save.data, `Lv0_${i}`);
      if (!Array.isArray(lv) || typeof lv[idx] !== 'number') continue;
      if (lv[idx] > max) max = lv[idx];
    }
    return max;
  },
  'skills.totalAcrossChars'(save, param) {
    const idx = parseInt(String(param ?? ''), 10);
    if (isNaN(idx) || idx < 0) return 0;
    let total = 0;
    for (let i = 0; i < 12; i++) {
      const lv = _pk(save.data, `Lv0_${i}`);
      if (!Array.isArray(lv) || typeof lv[idx] !== 'number') continue;
      total += lv[idx];
    }
    return total;
  },

  'characters.moneyTotal'(save) {
    let total = 0;
    for (let i = 0; i < 12; i++) {
      const m = _pk(save.data, `Money_${i}`);
      if (typeof m === 'number') total += m;
    }
    const bank = _pk(save.data, 'MoneyBANK');
    if (typeof bank === 'number') total += bank;
    return total;
  },
  'characters.gemsOwned'(save) {
    const g = _pk(save.data, 'GemsOwned');
    return typeof g === 'number' ? g : 0;
  },
  'characters.afkInWorld'(save, param) {
    // param = world prefix like 'w5' — returns count of chars AFK in that world
    const prefix = String(param ?? '').toLowerCase();
    if (!prefix) return 0;
    let count = 0;
    for (let i = 0; i < 12; i++) {
      const afk = _pk(save.data, `AFKtarget_${i}`);
      if (typeof afk === 'string' && afk.toLowerCase().startsWith(prefix)) count++;
    }
    return count;
  },

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  BATCH — Alchemy / Stamps / Cards granularity                          ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  // ── STAMPS per tab ────────────────────────────────────────────────────────
  'stamps.tabAvg'(save, param) {
    // param = 0 (combat), 1 (skills), 2 (misc)
    const tab = parseInt(String(param ?? ''), 10);
    if (isNaN(tab) || tab < 0 || tab > 2) return 0;
    const sl = _pk(save.data, 'StampLv');
    if (!Array.isArray(sl) || !Array.isArray(sl[tab])) return 0;
    const arr = sl[tab].filter(v => typeof v === 'number');
    if (arr.length === 0) return 0;
    return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;
  },
  'stamps.tabMaxed'(save, param) {
    const tab = parseInt(String(param ?? ''), 10);
    if (isNaN(tab) || tab < 0 || tab > 2) return 0;
    const sl = _pk(save.data, 'StampLv');
    if (!Array.isArray(sl) || !Array.isArray(sl[tab])) return 0;
    return sl[tab].filter(v => typeof v === 'number' && v > 0).length;
  },

  // ── ALCHEMY per cauldron ──────────────────────────────────────────────────
  'alchemy.cauldronBubbles'(save, param) {
    // param = 0 (green/power), 1 (orange/speed), 2 (purple/utility), 3 (yellow/quicc)
    const cauldron = parseInt(String(param ?? ''), 10);
    if (isNaN(cauldron) || cauldron < 0 || cauldron > 3) return 0;
    const ci = _pk(save.data, 'CauldronInfo');
    if (!Array.isArray(ci) || !Array.isArray(ci[0])) return 0;
    // ci[0] = bubble levels; grouped by cauldron (each ~50 bubbles)
    const bubbles = ci[0];
    if (!Array.isArray(bubbles)) return 0;
    const PER_CAULDRON = 50;
    let count = 0;
    const start = cauldron * PER_CAULDRON;
    const end = Math.min(start + PER_CAULDRON, bubbles.length);
    for (let i = start; i < end; i++) {
      if (typeof bubbles[i] === 'number' && bubbles[i] > 0) count++;
    }
    return count;
  },
  'alchemy.cauldronAvgLevel'(save, param) {
    const cauldron = parseInt(String(param ?? ''), 10);
    if (isNaN(cauldron) || cauldron < 0 || cauldron > 3) return 0;
    const ci = _pk(save.data, 'CauldronInfo');
    if (!Array.isArray(ci) || !Array.isArray(ci[0])) return 0;
    const bubbles = ci[0];
    const PER_CAULDRON = 50;
    const start = cauldron * PER_CAULDRON;
    const end = Math.min(start + PER_CAULDRON, bubbles.length);
    let sum = 0, cnt = 0;
    for (let i = start; i < end; i++) {
      if (typeof bubbles[i] === 'number' && bubbles[i] > 0) { sum += bubbles[i]; cnt++; }
    }
    return cnt > 0 ? Math.round((sum / cnt) * 10) / 10 : 0;
  },
  'alchemy.vialsTotalLevel'(save) {
    const ci = _pk(save.data, 'CauldronInfo');
    if (!Array.isArray(ci)) return 0;
    let vialsRaw = Array.isArray(ci[4]) ? ci[5] : ci[4];
    if (typeof vialsRaw === 'string') try { vialsRaw = JSON.parse(vialsRaw); } catch { return 0; }
    if (!vialsRaw || typeof vialsRaw !== 'object') return 0;
    return Object.values(vialsRaw).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
  },
  'alchemy.p2wShopBought'(save) {
    const p2w = _pk(save.data, 'CauldronP2W');
    if (!Array.isArray(p2w)) return 0;
    return p2w.filter(v => typeof v === 'number' && v > 0).length;
  },

  // ── CARDS detail ──────────────────────────────────────────────────────────
  'cards.setsCompleted'(save) {
    // Count card sets where all cards in set are at least bronze
    const c0 = _pk(save.data, 'Cards0');
    if (!c0 || typeof c0 !== 'object') return 0;
    // Rough: count entries with value >= 1 grouped by set (we just count total high-tier cards)
    return Object.values(c0).filter(v => typeof v === 'number' && v >= 6).length; // platinum+
  },
  'cards.platinumCount'(save) {
    const c0 = _pk(save.data, 'Cards0');
    if (!c0 || typeof c0 !== 'object') return 0;
    return Object.values(c0).filter(v => typeof v === 'number' && v >= 5).length;
  },
  'cards.avgTier'(save) {
    const c0 = _pk(save.data, 'Cards0');
    if (!c0 || typeof c0 !== 'object') return 0;
    const vals = Object.values(c0).filter(v => typeof v === 'number' && v > 0);
    if (vals.length === 0) return 0;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  },
  'cards.equippedPerChar'(save) {
    let total = 0, count = 0;
    for (let i = 0; i < 12; i++) {
      const ce = _pk(save.data, `CardEquip_${i}`);
      if (!Array.isArray(ce)) continue;
      count++;
      total += ce.filter(v => v && v !== 'B' && v !== '' && v !== 'Blank').length;
    }
    return count > 0 ? Math.round(total / count) : 0;
  },

  // ── POST OFFICE detail ────────────────────────────────────────────────────
  'postOffice.avgLevel'(save) {
    let total = 0, count = 0;
    for (let i = 0; i < 12; i++) {
      const po = _pk(save.data, `POu_${i}`);
      if (!Array.isArray(po)) continue;
      for (const v of po) {
        if (typeof v === 'number' && v > 0) { total += v; count++; }
      }
    }
    return count > 0 ? Math.round((total / count) * 10) / 10 : 0;
  },
  'postOffice.boxesCapped'(save) {
    // Count boxes at level 400+ across all chars
    let capped = 0;
    for (let i = 0; i < 12; i++) {
      const po = _pk(save.data, `POu_${i}`);
      if (!Array.isArray(po)) continue;
      capped += po.filter(v => typeof v === 'number' && v >= 400).length;
    }
    return capped;
  },

  // ── OBOLS detail ──────────────────────────────────────────────────────────
  'obols.platinumCount'(save) {
    const o1 = _pk(save.data, 'ObolEqO1') || [];
    const o2 = _pk(save.data, 'ObolEqO2') || [];
    let count = 0;
    for (const arr of [o1, o2]) {
      if (!Array.isArray(arr)) continue;
      count += arr.filter(v => typeof v === 'string' && v.startsWith('ObolP')).length;
    }
    return count;
  },
  'obols.pinkCount'(save) {
    const o1 = _pk(save.data, 'ObolEqO1') || [];
    const o2 = _pk(save.data, 'ObolEqO2') || [];
    let count = 0;
    for (const arr of [o1, o2]) {
      if (!Array.isArray(arr)) continue;
      count += arr.filter(v => typeof v === 'string' && (v.startsWith('ObolD') || v.startsWith('ObolPink'))).length;
    }
    return count;
  },

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  BATCH — Cooking / Sailing / Lab / Breeding detail                     ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  'cooking.kitchenSpeed'(save) {
    const ck = _pk(save.data, 'Cooking');
    if (!Array.isArray(ck)) return 0;
    // Cooking = per-table data; sum speed values
    let total = 0;
    for (const table of ck) {
      if (Array.isArray(table) && typeof table[0] === 'number') total += table[0];
      else if (typeof table === 'number') total += table;
    }
    return Math.round(total);
  },
  'cooking.mealsAbove'(save, param) {
    // param = min level (e.g. 20, 30)
    const minLv = parseInt(String(param ?? '20'), 10);
    const meals = _pk(save.data, 'Meals');
    if (!Array.isArray(meals)) return 0;
    let count = 0;
    for (let i = 0; i < meals.length; i += 2) {
      if (typeof meals[i] === 'number' && meals[i] >= minLv) count++;
    }
    return count;
  },
  'cooking.spiceTotal'(save) {
    const ribbon = _pk(save.data, 'Ribbon');
    if (!Array.isArray(ribbon)) return 0;
    return ribbon.reduce((s, v) => s + (typeof v === 'number' && v > 0 ? v : 0), 0);
  },

  'sailing.boatCount'(save) {
    const boats = _pk(save.data, 'Boats');
    if (!Array.isArray(boats)) {
      const sailing = _pk(save.data, 'Sailing');
      if (!Array.isArray(sailing) || !Array.isArray(sailing[0])) return 0;
      return sailing[0].filter(b => Array.isArray(b) && b[0] > 0).length;
    }
    return boats.filter(b => Array.isArray(b) && b[0] > 0).length;
  },
  'sailing.artifactLevels'(save) {
    const sailing = _pk(save.data, 'Sailing');
    if (!Array.isArray(sailing)) return 0;
    // Sailing[1] or Sailing[3] might contain artifact levels
    for (const sub of sailing) {
      if (!Array.isArray(sub) || sub.length < 5) continue;
      // Check if this looks like artifact data (array of small numbers)
      const avg = sub.reduce((a, v) => a + (typeof v === 'number' ? v : 0), 0) / sub.length;
      if (avg > 0 && avg < 50 && sub.length > 10) {
        return sub.reduce((s, v) => s + (typeof v === 'number' && v > 0 ? v : 0), 0);
      }
    }
    return 0;
  },
  'sailing.flagsPlaced'(save) {
    const fp = _pk(save.data, 'FlagP');
    if (!Array.isArray(fp)) return 0;
    return fp.filter(v => typeof v === 'number' && v >= 0).length;
  },
  'sailing.flagUpgrades'(save) {
    const fu = _pk(save.data, 'FlagU');
    if (!Array.isArray(fu)) return 0;
    return fu.filter(v => typeof v === 'number' && v !== -11 && v > 0).length;
  },

  'lab.connectionsActive'(save) {
    const lab = _pk(save.data, 'Lab');
    if (!Array.isArray(lab) || !Array.isArray(lab[0])) return 0;
    // lab[0] = connection lines active
    return lab[0].filter(v => v && v !== 0 && v !== 'Blank').length;
  },
  'lab.chipsUniqueOwned'(save) {
    const lab = _pk(save.data, 'Lab');
    if (!Array.isArray(lab)) return 0;
    const seen = new Set();
    for (const sub of lab) {
      if (!Array.isArray(sub)) continue;
      for (const v of sub) {
        if (typeof v === 'string' && v !== 'Blank' && v !== '' && v.includes('Chip')) seen.add(v);
      }
    }
    return seen.size;
  },

  'breeding.shinyTotal'(save) {
    const ps = _pk(save.data, 'PetsStored');
    if (!Array.isArray(ps)) return 0;
    let total = 0;
    for (const pet of ps) {
      if (!Array.isArray(pet)) continue;
      if (typeof pet[3] === 'number' && pet[3] > 0) total += pet[3];
    }
    return total;
  },
  'breeding.totalPetPower'(save) {
    const ps = _pk(save.data, 'PetsStored');
    if (!Array.isArray(ps)) return 0;
    let total = 0;
    for (const pet of ps) {
      if (!Array.isArray(pet)) continue;
      if (typeof pet[2] === 'number') total += pet[2];
    }
    return total;
  },
  'breeding.eggSlots'(save) {
    const br = _pk(save.data, 'Breeding');
    if (!Array.isArray(br)) return 0;
    // Breeding[0] or [1] = egg nest data
    for (const sub of br) {
      if (!Array.isArray(sub)) continue;
      const active = sub.filter(v => v && v !== -1 && v !== 0).length;
      if (active > 0 && active < 30) return active;
    }
    return 0;
  },

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  BATCH — Caverns sub-systems                                           ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  'caverns.wellLevel'(save) {
    const holes = _pk(save.data, 'Holes');
    if (!Array.isArray(holes) || !Array.isArray(holes[5])) return 0;
    return Math.max(0, ...holes[5].filter(v => typeof v === 'number'));
  },
  'caverns.harpLevel'(save) {
    const holes = _pk(save.data, 'Holes');
    if (!Array.isArray(holes) || !Array.isArray(holes[8])) return 0;
    return Math.max(0, ...holes[8].filter(v => typeof v === 'number'));
  },
  'caverns.lampTotal'(save) {
    const holes = _pk(save.data, 'Holes');
    if (!Array.isArray(holes) || !Array.isArray(holes[9])) return 0;
    return Math.round(holes[9].reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0));
  },
  'caverns.denProgress'(save) {
    const holes = _pk(save.data, 'Holes');
    if (!Array.isArray(holes) || !Array.isArray(holes[10])) return 0;
    return holes[10].filter(v => typeof v === 'number' && v > 0).length;
  },
  'caverns.grottoLevel'(save) {
    const holes = _pk(save.data, 'Holes');
    if (!Array.isArray(holes) || !Array.isArray(holes[11])) return 0;
    return Math.max(0, ...holes[11].filter(v => typeof v === 'number'));
  },
  'caverns.evertreeLevel'(save) {
    const holes = _pk(save.data, 'Holes');
    if (!Array.isArray(holes) || !Array.isArray(holes[12])) return 0;
    return Math.max(0, ...holes[12].filter(v => typeof v === 'number'));
  },
  'caverns.gambitDone'(save) {
    const holes = _pk(save.data, 'Holes');
    if (!Array.isArray(holes) || !Array.isArray(holes[13])) return 0;
    return holes[13].filter(v => v === 1).length;
  },
  'caverns.templeLevel'(save) {
    const holes = _pk(save.data, 'Holes');
    if (!Array.isArray(holes) || !Array.isArray(holes[14])) return 0;
    return Math.max(0, ...holes[14].filter(v => typeof v === 'number'));
  },
  'caverns.bellLevel'(save) {
    const holes = _pk(save.data, 'Holes');
    if (!Array.isArray(holes) || !Array.isArray(holes[7])) return 0;
    return Math.max(0, ...holes[7].filter(v => typeof v === 'number'));
  },
  'caverns.schematicLevels'(save) {
    const holes = _pk(save.data, 'Holes');
    if (!Array.isArray(holes) || !Array.isArray(holes[4])) return 0;
    return holes[4].reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
  },
  'caverns.villagerXPTotal'(save) {
    const holes = _pk(save.data, 'Holes');
    if (!Array.isArray(holes) || !Array.isArray(holes[2])) return 0;
    return Math.round(holes[2].reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0));
  },

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  BATCH — Sneaking / Sushi / Bees / Arcane / Gaming detail              ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  'sneaking.highestFloor'(save) {
    const spelunk = _pk(save.data, 'Spelunk');
    if (!Array.isArray(spelunk) || !Array.isArray(spelunk[1])) return 0;
    return Math.max(0, ...spelunk[1].filter(v => typeof v === 'number'));
  },
  'sneaking.gearScore'(save) {
    const spelunk = _pk(save.data, 'Spelunk');
    if (!Array.isArray(spelunk) || !Array.isArray(spelunk[46])) return 0;
    return spelunk[46].filter(v => v && v !== '' && v !== -1).length;
  },
  'sneaking.jadeBonuses'(save) {
    const ninja = _pk(save.data, 'Ninja');
    if (!Array.isArray(ninja)) return 0;
    let count = 0;
    for (const sub of ninja) {
      if (!Array.isArray(sub)) continue;
      count += sub.filter(v => typeof v === 'number' && v > 0).length;
    }
    return count;
  },
  'sneaking.upgradesTotal'(save) {
    const spelunk = _pk(save.data, 'Spelunk');
    if (!Array.isArray(spelunk) || !Array.isArray(spelunk[44])) return 0;
    let total = spelunk[44].reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
    if (Array.isArray(spelunk[45])) {
      total += spelunk[45].reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
    }
    return total;
  },

  'sushi.revenueRate'(save) {
    const sushi = _pk(save.data, 'Sushi');
    if (!Array.isArray(sushi) || !Array.isArray(sushi[4])) return 0;
    // sushi[4] = revenue/timing data
    return sushi[4].reduce((s, v) => s + (typeof v === 'number' && v > 0 ? v : 0), 0);
  },
  'sushi.ingredientSlots'(save) {
    const sushi = _pk(save.data, 'Sushi');
    if (!Array.isArray(sushi) || !Array.isArray(sushi[0])) return 0;
    return sushi[0].filter(v => typeof v === 'number' && v !== -1 && v >= 0).length;
  },
  'sushi.recipesUnlocked'(save) {
    const sushi = _pk(save.data, 'Sushi');
    if (!Array.isArray(sushi) || !Array.isArray(sushi[5])) return 0;
    return sushi[5].filter(v => typeof v === 'number' && v > 0).length;
  },
  'sushi.multipliersSum'(save) {
    const sushi = _pk(save.data, 'Sushi');
    if (!Array.isArray(sushi) || !Array.isArray(sushi[6])) return 0;
    return Math.round(sushi[6].reduce((s, v) => s + (typeof v === 'number' && v > 0 ? v : 0), 0) * 100) / 100;
  },

  'bees.hivesActive'(save) {
    const bubba = _pk(save.data, 'Bubba');
    if (!Array.isArray(bubba) || !Array.isArray(bubba[4])) return 0;
    return bubba[4].filter(v => typeof v === 'number' && v > 0).length;
  },
  'bees.specialBees'(save) {
    const bubba = _pk(save.data, 'Bubba');
    if (!Array.isArray(bubba) || !Array.isArray(bubba[3])) return 0;
    return bubba[3].filter(v => typeof v === 'number' && v > 0).length;
  },

  'arcane.maxNodeLevel'(save) {
    const arc = _pk(save.data, 'Arcane');
    if (!Array.isArray(arc)) return 0;
    return Math.max(0, ...arc.filter(v => typeof v === 'number'));
  },
  'arcane.unlockedNodes'(save) {
    const arc = _pk(save.data, 'Arcane');
    if (!Array.isArray(arc)) return 0;
    // Nodes at index 57-99 are locked (value=0); count non-zero
    return arc.filter(v => typeof v === 'number' && v > 0).length;
  },

  'gaming.sproutTypes'(save) {
    const gs = _pk(save.data, 'GamingSprout');
    if (!Array.isArray(gs)) return 0;
    return gs.filter(v => Array.isArray(v) ? v[0] > 0 : (typeof v === 'number' && v > 0)).length;
  },
  'gaming.nuggetLevel'(save) {
    const g = _pk(save.data, 'Gaming');
    if (!Array.isArray(g)) return 0;
    // Gaming[0] or [1] contains bit/nugget data
    for (const sub of g) {
      if (typeof sub === 'number' && sub > 0 && sub < 200) return sub;
    }
    return 0;
  },
  'gaming.importsUnlocked'(save) {
    const g = _pk(save.data, 'Gaming');
    if (!Array.isArray(g)) return 0;
    // Count import slots that are active (non-zero)
    for (const sub of g) {
      if (Array.isArray(sub)) {
        const active = sub.filter(v => v && v > 0).length;
        if (active > 0 && active <= 10) return active;
      }
    }
    return 0;
  },

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  BATCH — Remaining detail extractors                                   ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  // ── SUMMONING detail ──────────────────────────────────────────────────────
  'summoning.essenceTotal'(save) {
    const summon = _pk(save.data, 'Summon');
    if (!Array.isArray(summon) || !Array.isArray(summon[2])) return 0;
    return Math.round(summon[2].reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0));
  },
  'summoning.familiarsOwned'(save) {
    const summon = _pk(save.data, 'Summon');
    if (!Array.isArray(summon) || !Array.isArray(summon[0])) return 0;
    return summon[0].filter(v => typeof v === 'number' && v > 0).length;
  },
  'summoning.arenasBeat'(save) {
    const summon = _pk(save.data, 'Summon');
    if (!Array.isArray(summon) || !Array.isArray(summon[3])) return 0;
    return summon[3].filter(v => typeof v === 'number' && v > 0).length;
  },

  // ── FARMING detail ────────────────────────────────────────────────────────
  'farming.ogUpgrades'(save) {
    const fu = _pk(save.data, 'FarmUpg');
    if (!Array.isArray(fu)) return 0;
    return fu.filter(v => typeof v === 'number' && v > 0).length;
  },
  'farming.cropRankAvg'(save) {
    const fr = _pk(save.data, 'FarmRank');
    if (!Array.isArray(fr)) return 0;
    let sum = 0, count = 0;
    for (const rankArr of fr) {
      if (!Array.isArray(rankArr)) continue;
      for (const v of rankArr) {
        if (typeof v === 'number' && v > 0) { sum += v; count++; }
      }
    }
    return count > 0 ? Math.round((sum / count) * 10) / 10 : 0;
  },

  // ── DIVINITY detail ───────────────────────────────────────────────────────
  'divinity.highestGodLevel'(save) {
    const div = _pk(save.data, 'Divinity');
    if (!Array.isArray(div) || !Array.isArray(div[1])) return 0;
    return Math.max(0, ...div[1].filter(v => typeof v === 'number'));
  },

  // ── DEATHNOTE per world ───────────────────────────────────────────────────
  'deathnote.worldSkulls'(save, param) {
    // param = world string prefix like 'w1', 'w2', etc.
    const prefix = String(param ?? '').toLowerCase();
    if (!prefix) return 0;
    // Aggregate KLA across characters, only counting maps matching prefix
    let total = 0;
    for (let i = 0; i < 12; i++) {
      const kla = _pk(save.data, `KLA_${i}`);
      if (!Array.isArray(kla)) continue;
      for (const mapEntry of kla) {
        if (!Array.isArray(mapEntry) || mapEntry.length < 2) continue;
        const mapCode = String(mapEntry[1] ?? '').toLowerCase();
        if (mapCode.startsWith(prefix)) {
          total += typeof mapEntry[0] === 'number' ? (mapEntry[0] >= 10000 ? 1 : 0) : 0;
        }
      }
    }
    return total;
  },

  // ── FORGE detail ──────────────────────────────────────────────────────────
  'forge.barsForged'(save) {
    const fio = _pk(save.data, 'ForgeItemOrder');
    if (!Array.isArray(fio)) return 0;
    return fio.filter(v => v && v !== 'Blank' && v !== '').length;
  },

  // ── REFINERY detail ───────────────────────────────────────────────────────
  'refinery.saltStorage'(save) {
    const ref = _pk(save.data, 'Refinery');
    if (!Array.isArray(ref)) return 0;
    let total = 0;
    for (const entry of ref) {
      if (Array.isArray(entry)) {
        for (const v of entry) { if (typeof v === 'number' && v > 0) total += v; }
      }
    }
    return total;
  },

  // ── ATOMS detail ──────────────────────────────────────────────────────────
  'atoms.atomLevel'(save, param) {
    // param = atom index (0-14)
    const idx = parseInt(String(param ?? ''), 10);
    if (isNaN(idx) || idx < 0) return 0;
    const atoms = _pk(save.data, 'Atoms');
    if (!Array.isArray(atoms)) return 0;
    if (idx < atoms.length && typeof atoms[idx] === 'number') return atoms[idx];
    return 0;
  },

  // ── CHIPS detail ──────────────────────────────────────────────────────────
  'chips.totalEquipped'(save) {
    const lab = _pk(save.data, 'Lab');
    if (!Array.isArray(lab)) return 0;
    let count = 0;
    for (const sub of lab) {
      if (!Array.isArray(sub)) continue;
      count += sub.filter(v => typeof v === 'string' && v !== 'Blank' && v !== '' && v.includes('Chip')).length;
    }
    return count;
  },
  'chips.uniqueOwned'(save) {
    const lab = _pk(save.data, 'Lab');
    if (!Array.isArray(lab)) return 0;
    const seen = new Set();
    for (const sub of lab) {
      if (!Array.isArray(sub)) continue;
      for (const v of sub) {
        if (typeof v === 'string' && v.includes('Chip') && v !== 'Blank') seen.add(v);
      }
    }
    return seen.size;
  },

  // ── CONSTRUCTION detail ───────────────────────────────────────────────────
  'construction.cogSlots'(save) {
    const cogO = _pk(save.data, 'CogO');
    if (!Array.isArray(cogO)) return 0;
    return cogO.length;
  },
  'construction.flagPlaced'(save) {
    // Construction flags from Tower key
    const tower = _pk(save.data, 'Tower');
    if (!Array.isArray(tower)) return 0;
    // tower[54-61] = shrine misc  
    let count = 0;
    for (let i = 54; i < 62 && i < tower.length; i++) {
      if (typeof tower[i] === 'number' && tower[i] > 0) count++;
    }
    return count;
  },
  'construction.totalBuildingExp'(save) {
    const tower = _pk(save.data, 'Tower');
    if (!Array.isArray(tower)) return 0;
    let total = 0;
    for (let i = 62; i < 93 && i < tower.length; i++) {
      if (typeof tower[i] === 'number') total += tower[i];
    }
    return Math.round(total);
  },

  // ── EQUINOX detail ────────────────────────────────────────────────────────
  'equinox.totalUpgrades'(save) {
    const dream = _pk(save.data, 'Dream');
    if (!Array.isArray(dream)) return 0;
    return dream.reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
  },
  'equinox.cloudsCompleted'(save) {
    const dream = _pk(save.data, 'Dream');
    if (!Array.isArray(dream)) return 0;
    return dream.filter(v => v === 1).length;
  },

  // ── RIFT detail ───────────────────────────────────────────────────────────
  'rift.totalLevel'(save) {
    const rift = _pk(save.data, 'Rift') || save.data?.Rift;
    if (!Array.isArray(rift)) return 0;
    return rift.reduce((s, v) => s + (typeof v === 'number' && v > 0 ? v : 0), 0);
  },
  'rift.bonusCount'(save) {
    const rift = _pk(save.data, 'Rift') || save.data?.Rift;
    if (!Array.isArray(rift)) return 0;
    return rift.filter(v => typeof v === 'number' && v > 0).length;
  },

  // ── TESSERACT detail ──────────────────────────────────────────────────────
  'tesseract.totalLevels'(save) {
    const tess = _pk(save.data, 'Tess');
    if (!Array.isArray(tess)) return 0;
    return tess.reduce((s, v) => s + (typeof v === 'number' && v > 0 ? v : 0), 0);
  },
  'tesseract.maxLevel'(save) {
    const tess = _pk(save.data, 'Tess');
    if (!Array.isArray(tess)) return 0;
    return Math.max(0, ...tess.filter(v => typeof v === 'number'));
  },

  // ── STORAGE / INVENTORY ───────────────────────────────────────────────────
  'storage.chestSlots'(save) {
    const co = _pk(save.data, 'ChestOrder');
    if (!Array.isArray(co)) return 0;
    return co.filter(v => v && v !== 'Blank' && v !== '').length;
  },
  'storage.totalItemsStored'(save) {
    const cq = _pk(save.data, 'ChestQuantity');
    if (!Array.isArray(cq)) return 0;
    return cq.reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
  },

  // ── BACKGROUNDS / COSMETIC ────────────────────────────────────────────────
  'cosmetic.backgroundsUnlocked'(save) {
    const bg = _pk(save.data, 'BGunlocked');
    if (!Array.isArray(bg)) return 0;
    return bg.filter(v => v === 1).length;
  },

  // ── COLOSSEUM highscores ──────────────────────────────────────────────────
  'colosseum.totalHighscores'(save) {
    const hs = _pk(save.data, 'FamValColosseumHighscores');
    if (!Array.isArray(hs)) return 0;
    return hs.reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
  },
  'colosseum.worldsCompleted'(save) {
    const hs = _pk(save.data, 'FamValColosseumHighscores');
    if (!Array.isArray(hs)) return 0;
    return hs.filter(v => typeof v === 'number' && v > 0).length;
  },

  // ── STAR SIGNS detail ─────────────────────────────────────────────────────
  'starSigns.equippedPerChar'(save) {
    let total = 0, count = 0;
    for (let i = 0; i < 12; i++) {
      const ss = _pk(save.data, `PVtStarSign_${i}`);
      if (typeof ss !== 'string') continue;
      count++;
      const signs = ss.split(',').filter(s => s && s !== '_');
      total += signs.length;
    }
    return count > 0 ? Math.round((total / count) * 10) / 10 : 0;
  },

  // ── PRAYER detail ─────────────────────────────────────────────────────────
  'prayers.equippedPerChar'(save) {
    let total = 0, count = 0;
    for (let i = 0; i < 12; i++) {
      const pr = _pk(save.data, `Prayers_${i}`);
      if (!Array.isArray(pr)) continue;
      count++;
      total += pr.filter(v => typeof v === 'number' && v >= 0).length;
    }
    return count > 0 ? Math.round((total / count) * 10) / 10 : 0;
  },
  'prayers.maxLevel'(save) {
    const po = _pk(save.data, 'PrayOwned');
    if (!Array.isArray(po)) return 0;
    return Math.max(0, ...po.filter(v => typeof v === 'number'));
  },

  // ── SHRINES detail ────────────────────────────────────────────────────────
  'shrines.maxLevel'(save) {
    const sh = _pk(save.data, 'Shrine');
    if (!Array.isArray(sh)) return 0;
    let max = 0;
    for (const entry of sh) {
      if (Array.isArray(entry) && typeof entry[0] === 'number' && entry[0] > max) max = entry[0];
      if (typeof entry === 'number' && entry > max) max = entry;
    }
    return max;
  },

  // ── SALT LICK detail ──────────────────────────────────────────────────────
  'saltLick.maxLevel'(save) {
    const sl = _pk(save.data, 'SaltLick');
    if (!Array.isArray(sl)) return 0;
    return Math.max(0, ...sl.filter(v => typeof v === 'number'));
  },
  'saltLick.slotsActive'(save) {
    const sl = _pk(save.data, 'SaltLick');
    if (!Array.isArray(sl)) return 0;
    return sl.filter(v => typeof v === 'number' && v > 0).length;
  },

  // ── GRIMOIRE detail ───────────────────────────────────────────────────────
  'grimoire.avgLevel'(save) {
    const gr = _pk(save.data, 'Grimoire');
    if (!Array.isArray(gr)) return 0;
    const vals = gr.filter(v => typeof v === 'number' && v > 0);
    return vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : 0;
  },

  // ── COMPASS detail ────────────────────────────────────────────────────────
  'compass.maxLevel'(save) {
    const co = _pk(save.data, 'Compass');
    if (!Array.isArray(co)) return 0;
    return Math.max(0, ...co.filter(v => typeof v === 'number'));
  },

  // ── ACHIEVEMENTS detail ───────────────────────────────────────────────────
  'achievements.total'(save) {
    const ar = _pk(save.data, 'AchieveReg');
    if (!Array.isArray(ar)) return 0;
    return ar.length;
  },
  'achievements.steamCompleted'(save) {
    const sa = _pk(save.data, 'SteamAchieve');
    if (!Array.isArray(sa)) return 0;
    return sa.filter(v => typeof v === 'number' && v > 0).length;
  },

  // ── UPGRADE VAULT ─────────────────────────────────────────────────────────
  'vault.totalLevels'(save) {
    const uv = _pk(save.data, 'UpgVault');
    if (!Array.isArray(uv)) return 0;
    return uv.reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
  },
  'vault.maxLevel'(save) {
    const uv = _pk(save.data, 'UpgVault');
    if (!Array.isArray(uv)) return 0;
    return Math.max(0, ...uv.filter(v => typeof v === 'number'));
  },

  // ── DUNGEON detail ────────────────────────────────────────────────────────
  'dungeon.rngItemsFound'(save) {
    const dung = _pk(save.data, 'DungUpg') || save.data?.DungUpg;
    if (!Array.isArray(dung) || !Array.isArray(dung[0])) return 0;
    return dung[0].filter(v => typeof v === 'number' && v > 0).length;
  },
  'dungeon.flurboShopBought'(save) {
    const dung = _pk(save.data, 'DungUpg') || save.data?.DungUpg;
    if (!Array.isArray(dung) || !Array.isArray(dung[2])) return 0;
    return dung[2].filter(v => typeof v === 'number' && v > 0).length;
  },

  // ── ACCOUNT AGE ───────────────────────────────────────────────────────────
  'account.ageDays'(save) {
    const created = save.accountCreateTime;
    if (typeof created !== 'number' || created <= 0) return 0;
    return Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24));
  },

  // ══════════════ ACCOUNT — OUTER-LEVEL + META ══════════════

  'account.saveFreshnessDays'(save) {
    const ts = save.lastUpdated;
    if (typeof ts !== 'number' || ts <= 0) return 0;
    return Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24));
  },
  'account.gameVersion'(save) {
    return save.serverVars?.GameVERSION || 0;
  },
  'account.eventActive'(save) {
    return save.serverVars?.EventActive ? 1 : 0;
  },
  'account.extraCharSlots'(save) {
    return _pk(save.data, 'CYCharSlotsMTX') || save.data?.CYCharSlotsMTX || 0;
  },
  'account.worldTeleports'(save) {
    return _pk(save.data, 'CYWorldTeleports') || save.data?.CYWorldTeleports || 0;
  },
  'account.hintsCompleted'(save) {
    const h = _pk(save.data, 'HintStatus') || save.data?.HintStatus;
    if (!Array.isArray(h)) return 0;
    return h.filter(v => typeof v === 'number' && v > 0).length;
  },

  // ══════════════ TOURNAMENT ══════════════

  'tournament.dataPresent'(save) {
    return save.tournament && typeof save.tournament === 'object' ? 1 : 0;
  },

  // ══════════════ SERVER VARS ══════════════

  'arcade.activeBonuses'(save) {
    const b = save.serverVars?.ArcadeBonuses;
    if (!Array.isArray(b)) return 0;
    return b.filter(v => v != null && v !== 0).length;
  },
  'lab.chipRepoAvailable'(save) {
    const c = save.serverVars?.ChipRepo;
    if (!Array.isArray(c)) return 0;
    return c.filter(v => v != null && v !== 0).length;
  },
  'killroy.swapActive'(save) {
    return save.serverVars?.KillroySwap ? 1 : 0;
  },
  'companions.currentSeason'(save) {
    return save.serverVars?.CompBatch || 0;
  },

  // ══════════════ BUNDLES / BONUS FLAGS ══════════════

  'bundles.totalPurchased'(save) {
    const d = save.data;
    if (!d) return 0;
    let count = 0;
    for (const k of Object.keys(d)) {
      if (k.startsWith('bun_') && d[k] === 1) count++;
    }
    return count;
  },
  'bonuses.activeCount'(save) {
    const d = save.data;
    if (!d) return 0;
    let count = 0;
    for (const k of Object.keys(d)) {
      if ((k.startsWith('bon_') || k.startsWith('bin_')) && d[k] > 0) count++;
    }
    return count;
  },

  // ══════════════ GEM SHOP (extended) ══════════════

  'gemShop.packsBought'(save) {
    const g = _pk(save.data, 'GemsPacksPurchased') || save.data?.GemsPacksPurchased;
    if (!Array.isArray(g)) return 0;
    return g.filter(v => typeof v === 'number' && v > 0).length;
  },
  'gemShop.serverGems'(save) {
    return _pk(save.data, 'ServerGems') || save.data?.ServerGems || 0;
  },
  'gemShop.totalGemsReceived'(save) {
    return _pk(save.data, 'ServerGemsReceived') || save.data?.ServerGemsReceived || 0;
  },
  'gemShop.perCharPurchases'(save, param) {
    const ci = parseInt(param, 10);
    if (isNaN(ci)) return 0;
    const arr = _pk(save.data, `OptL_${ci}`) || save.data?.[`OptL_${ci}`];
    if (!Array.isArray(arr)) return 0;
    return arr.filter(v => typeof v === 'number' && v > 0).length;
  },

  // ══════════════ CY* CAVERN CURRENCIES ══════════════

  'caverns.deliveriesCompleted'(save) {
    return _pk(save.data, 'CYDeliveryBoxComplete') || save.data?.CYDeliveryBoxComplete || 0;
  },
  'caverns.deliveryStreak'(save) {
    return _pk(save.data, 'CYDeliveryBoxStreak') || save.data?.CYDeliveryBoxStreak || 0;
  },
  'caverns.afkDoubles'(save) {
    return _pk(save.data, 'CYAFKdoubles') || save.data?.CYAFKdoubles || 0;
  },
  'caverns.anvilTabs'(save) {
    return _pk(save.data, 'CYAnvilTabsOwned') || save.data?.CYAnvilTabsOwned || 0;
  },
  'caverns.gems'(save) {
    return _pk(save.data, 'CYGems') || save.data?.CYGems || 0;
  },
  'caverns.goldPens'(save) {
    return _pk(save.data, 'CYGoldPens') || save.data?.CYGoldPens || 0;
  },
  'caverns.silverPens'(save) {
    return _pk(save.data, 'CYSilverPens') || save.data?.CYSilverPens || 0;
  },
  'caverns.obolFragments'(save) {
    return _pk(save.data, 'CYObolFragments') || save.data?.CYObolFragments || 0;
  },
  'caverns.colosseumTickets'(save) {
    return _pk(save.data, 'CYColosseumTickets') || save.data?.CYColosseumTickets || 0;
  },
  'caverns.npcProgress'(save) {
    const npc = _pk(save.data, 'CYNPC') || save.data?.CYNPC;
    if (!Array.isArray(npc)) return 0;
    return npc.filter(v => v != null && v !== 0 && v !== -1).length;
  },

  // ══════════════ TALENTS — UNSPENT / LOADOUT ══════════════

  'talents.unspentPerTier'(save) {
    const tp = _pk(save.data, 'CYTalentPoints') || save.data?.CYTalentPoints;
    if (!Array.isArray(tp)) return 0;
    return tp.reduce((s, v) => s + (typeof v === 'number' && v > 0 ? v : 0), 0);
  },
  'talents.charsWithLoadout'(save) {
    const n = _charCount(save);
    let count = 0;
    for (let i = 0; i < n; i++) {
      const ld = save.data?.[`AttackLoadout_${i}`];
      if (Array.isArray(ld) && ld.some(v => v != null && v !== 0 && v !== -1)) count++;
    }
    return count;
  },

  // ══════════════ STAT ALLOCATION ══════════════

  'characters.totalStatPoints'(save) {
    const n = _charCount(save);
    let total = 0;
    for (let i = 0; i < n; i++) {
      const st = save.data?.[`PVStatList_${i}`];
      if (Array.isArray(st)) {
        for (const v of st) if (typeof v === 'number') total += v;
      }
    }
    return total;
  },
  'characters.avgStatAlloc'(save) {
    const n = _charCount(save);
    if (n === 0) return 0;
    let total = 0;
    for (let i = 0; i < n; i++) {
      const st = save.data?.[`PVStatList_${i}`];
      if (Array.isArray(st)) {
        for (const v of st) if (typeof v === 'number') total += v;
      }
    }
    return Math.round(total / n);
  },

  // ══════════════ CHARACTER AFK / MAP ══════════════

  'characters.avgAFKHours'(save) {
    const n = _charCount(save);
    if (n === 0) return 0;
    let total = 0, counted = 0;
    const now = Date.now();
    for (let i = 0; i < n; i++) {
      const t = save.data?.[`PTimeAway_${i}`];
      if (typeof t === 'number' && t > 0) {
        total += (now - t) / (1000 * 60 * 60);
        counted++;
      }
    }
    return counted > 0 ? Math.round(total / counted) : 0;
  },
  'characters.maxAFKHours'(save) {
    const n = _charCount(save);
    let maxH = 0;
    const now = Date.now();
    for (let i = 0; i < n; i++) {
      const t = save.data?.[`PTimeAway_${i}`];
      if (typeof t === 'number' && t > 0) {
        const h = (now - t) / (1000 * 60 * 60);
        if (h > maxH) maxH = h;
      }
    }
    return Math.round(maxH);
  },
  'characters.revivesAvailable'(save) {
    const n = _charCount(save);
    let total = 0;
    for (let i = 0; i < n; i++) {
      const r = save.data?.[`PVInstaRevives_${i}`] || save.data?.[`PV_InstaRevives_${i}`] || 0;
      if (typeof r === 'number' && r > 0) total += r;
    }
    return total;
  },

  // ══════════════ INVENTORY / STORAGE ══════════════

  'storage.usedPct'(save) {
    const used = _pk(save.data, 'InvStorageUsed') || save.data?.InvStorageUsed;
    if (!used || typeof used !== 'object') return 0;
    const total = used.TotalSlots || used.total || 0;
    const filled = used.FilledSlots || used.filled || 0;
    if (total <= 0) return 0;
    return Math.round((filled / total) * 100);
  },
  'inventory.bagsUsed'(save) {
    const n = _charCount(save);
    let total = 0;
    for (let i = 0; i < n; i++) {
      const bags = save.data?.[`InvBagsUsed_${i}`];
      if (bags && typeof bags === 'object') {
        total += Object.keys(bags).length;
      }
    }
    return total;
  },
  'inventory.avgCarryCap'(save) {
    const n = _charCount(save);
    if (n === 0) return 0;
    let total = 0, counted = 0;
    for (let i = 0; i < n; i++) {
      const cap = save.data?.[`MaxCarryCap_${i}`];
      if (cap && typeof cap === 'object') {
        const vals = Object.values(cap).filter(v => typeof v === 'number' && v > 0);
        if (vals.length > 0) {
          total += vals.reduce((s, v) => s + v, 0) / vals.length;
          counted++;
        }
      }
    }
    return counted > 0 ? Math.round(total / counted) : 0;
  },
  'inventory.materialTypes'(save) {
    const n = _charCount(save);
    const all = new Set();
    for (let i = 0; i < n; i++) {
      const im = save.data?.[`IMm_${i}`];
      if (im && typeof im === 'object') {
        for (const k of Object.keys(im)) all.add(k);
      }
    }
    return all.size;
  },

  // ══════════════ EQUIPMENT ══════════════

  'equipment.uniqueItems'(save) {
    const n = _charCount(save);
    const all = new Set();
    for (let i = 0; i < n; i++) {
      const eq = save.data?.[`EquipOrder_${i}`];
      if (!Array.isArray(eq)) continue;
      for (const sub of eq) {
        if (Array.isArray(sub)) sub.forEach(v => { if (v && v !== 'Blank' && v !== 'None') all.add(v); });
        else if (typeof sub === 'string' && sub !== 'Blank' && sub !== 'None') all.add(sub);
      }
    }
    return all.size;
  },
  'equipment.hasItem'(save, param) {
    if (!param) return 0;
    const needle = String(param).toLowerCase();
    const n = _charCount(save);
    for (let i = 0; i < n; i++) {
      const eq = save.data?.[`EquipOrder_${i}`];
      if (!Array.isArray(eq)) continue;
      for (const sub of eq) {
        if (Array.isArray(sub)) {
          if (sub.some(v => String(v).toLowerCase() === needle)) return 1;
        } else if (String(sub).toLowerCase() === needle) return 1;
      }
    }
    return 0;
  },

  // ══════════════ QUESTS ══════════════

  'quests.inProgress'(save) {
    const n = _charCount(save);
    let total = 0;
    for (let i = 0; i < n; i++) {
      const qs = save.data?.[`QuestStatus_${i}`];
      if (qs && typeof qs === 'object') total += Object.keys(qs).length;
    }
    return total;
  },
  'quests.npcDialogueProgress'(save) {
    const n = _charCount(save);
    let total = 0;
    for (let i = 0; i < n; i++) {
      const npc = save.data?.[`NPCdialogue_${i}`];
      if (npc && typeof npc === 'object') {
        total += Object.values(npc).filter(v => typeof v === 'number' && v > 0).length;
      }
    }
    return total;
  },

  // ══════════════ CARDS — EXTENDED ══════════════

  'cards.setsEquippedPerChar'(save) {
    const n = _charCount(save);
    let total = 0;
    for (let i = 0; i < n; i++) {
      const cs = save.data?.[`CSetEq_${i}`];
      if (cs && typeof cs === 'object' && Object.keys(cs).length > 0) total++;
    }
    return total;
  },
  'cards.presetsSaved'(save) {
    const n = _charCount(save);
    let total = 0;
    for (let i = 0; i < n; i++) {
      const cp = save.data?.[`CardPreset_${i}`];
      if (Array.isArray(cp) && cp.length > 0) total++;
    }
    return total;
  },

  // ══════════════ OBOLS — EXTENDED ══════════════

  'obols.totalOwned'(save) {
    const inv = _pk(save.data, 'ObolInvOr') || save.data?.ObolInvOr;
    if (!Array.isArray(inv)) return 0;
    return inv.filter(v => v != null && v !== '' && v !== 'Blank' && v !== 'None').length;
  },
  'obols.fragments'(save) {
    return _pk(save.data, 'CYObolFragments') || save.data?.CYObolFragments || 0;
  },
  'obols.familyUpgradeCount'(save) {
    let count = 0;
    for (const key of ['ObolEqMAPz1', 'ObolEqMAPz2']) {
      const m = save.data?.[key];
      if (m && typeof m === 'object') count += Object.keys(m).length;
    }
    return count;
  },

  // ══════════════ ALCHEMY — EXTENDED ══════════════

  'alchemy.cauldronUpgLevels'(save) {
    const c = _pk(save.data, 'CauldUpgLVs') || save.data?.CauldUpgLVs;
    if (!Array.isArray(c)) return 0;
    let total = 0;
    for (const row of c) {
      if (Array.isArray(row)) for (const v of row) { if (typeof v === 'number' && v > 0) total += v; }
      else if (typeof row === 'number' && row > 0) total += row;
    }
    return total;
  },
  'alchemy.bigBubblesSelected'(save) {
    const b = _pk(save.data, 'CauldronBubbles') || save.data?.CauldronBubbles;
    if (!Array.isArray(b)) return 0;
    return b.filter(v => v != null && v !== 0 && v !== -1).length;
  },
  'alchemy.jobAssignments'(save) {
    const j = _pk(save.data, 'CauldronJobs0') || save.data?.CauldronJobs0;
    if (!Array.isArray(j)) return 0;
    return j.filter(v => typeof v === 'number' && v >= 0).length;
  },

  // ══════════════ POST OFFICE — EXTENDED ══════════════

  'postOffice.deliverySlots'(save) {
    let total = 0;
    for (let k = 0; k < 3; k++) {
      const po = _pk(save.data, `PostOfficeInfo${k}`) || save.data?.[`PostOfficeInfo${k}`];
      if (Array.isArray(po)) total += po.length;
    }
    return total;
  },

  // ══════════════ FORGE — EXTENDED ══════════════

  'forge.queuedItems'(save) {
    const fq = _pk(save.data, 'ForgeItemOrder') || save.data?.ForgeItemOrder;
    if (!Array.isArray(fq)) return 0;
    return fq.filter(v => v != null && v !== '' && v !== 'Blank' && v !== 'None').length;
  },
  'forge.slotProgress'(save) {
    const fp = _pk(save.data, 'ForgeIntProg') || save.data?.ForgeIntProg;
    if (!Array.isArray(fp)) return 0;
    return fp.filter(v => typeof v === 'number' && v > 0).length;
  },

  // ══════════════ ARCADE — EXTENDED ══════════════

  'arcade.unclaimedProgress'(save) {
    const u = _pk(save.data, 'ArcUnclaim') || save.data?.ArcUnclaim;
    if (!u || typeof u !== 'object') return 0;
    return Object.keys(u).length;
  },

  // ══════════════ MAP BONUSES ══════════════

  'maps.bonusesUnlocked'(save) {
    const m = _pk(save.data, 'MapBon') || save.data?.MapBon;
    if (!Array.isArray(m)) return 0;
    return m.filter(v => typeof v === 'number' && v > 0).length;
  },

  // ══════════════ PRINTER — EXTENDED ══════════════

  'printer.filtersConfigured'(save) {
    const px = _pk(save.data, 'PrinterXtra') || save.data?.PrinterXtra;
    if (!Array.isArray(px)) return 0;
    return px.filter(v => v != null && v !== 0 && v !== -1).length;
  },

  // ══════════════ SAILING — EXTENDED ══════════════

  'sailing.chestsValue'(save) {
    const sc = _pk(save.data, 'SailChests') || save.data?.SailChests;
    if (!Array.isArray(sc)) return 0;
    let total = 0;
    for (const chest of sc) {
      if (Array.isArray(chest) && typeof chest[0] === 'number') total += chest[0];
      else if (typeof chest === 'number') total += chest;
    }
    return Math.round(total);
  },

  // ══════════════ PETS (account-wide collection) ══════════════

  'pets.totalOwned'(save) {
    const pets = _pk(save.data, 'Pets') || save.data?.Pets;
    if (!Array.isArray(pets)) return 0;
    return pets.filter(v => v != null && v !== 0 && v !== -1).length;
  },
  'pets.highestTier'(save) {
    const pets = _pk(save.data, 'Pets') || save.data?.Pets;
    if (!Array.isArray(pets)) return 0;
    let max = 0;
    for (const v of pets) if (typeof v === 'number' && v > max) max = v;
    return max;
  },

  // ══════════════ TERRITORY ══════════════

  'territory.activeSlots'(save) {
    const t = _pk(save.data, 'Territory') || save.data?.Territory;
    if (!Array.isArray(t)) return 0;
    if (Array.isArray(t[0])) {
      return t.filter(row => Array.isArray(row) && row.some(v => v != null && v !== 0)).length;
    }
    return t.filter(v => v != null && v !== 0).length;
  },
  'territory.spiceRateTotal'(save) {
    const t = _pk(save.data, 'Territory') || save.data?.Territory;
    if (!Array.isArray(t)) return 0;
    let total = 0;
    for (const row of t) {
      if (Array.isArray(row)) {
        for (const v of row) if (typeof v === 'number' && v > 0) total += v;
      } else if (typeof row === 'number' && row > 0) total += row;
    }
    return Math.round(total);
  },

  // ══════════════ FISHING — EXTENDED ══════════════

  'fishing.toolsEquipped'(save) {
    const n = _charCount(save);
    let total = 0;
    for (let i = 0; i < n; i++) {
      const tk = save.data?.[`PVFishingToolkit_${i}`];
      if (Array.isArray(tk)) total += tk.filter(v => v != null && v !== 0 && v !== -1).length;
    }
    return total;
  },

  // ══════════════ COSMETIC — EXTENDED ══════════════

  'cosmetic.selectedBackground'(save) {
    return _pk(save.data, 'BGsel') || save.data?.BGsel || 0;
  },

  // ══════════════ SHOPS ══════════════

  'shops.totalStock'(save) {
    const s = _pk(save.data, 'ShopStock') || save.data?.ShopStock;
    if (!Array.isArray(s)) return 0;
    return s.filter(v => typeof v === 'number' && v > 0).length;
  },

  // ══════════════ OPTLACC (OptionsListAccount) ══════════════
  // OptLacc is a massive array (400+ indices) that stores misc account state.
  // Indices documented via Idleon Injector reverse-engineering.

  'account.arenaEntriesUsed'(save) {
    const ola = save.data?.OptLacc;
    return Array.isArray(ola) ? Number(ola[88]) || 0 : 0;
  },
  'account.bossAttemptsUsed'(save) {
    const ola = save.data?.OptLacc;
    return Array.isArray(ola) ? Number(ola[185]) || 0 : 0;
  },
  'account.killroyWeeklyProgress'(save) {
    const ola = save.data?.OptLacc;
    return Array.isArray(ola) ? Number(ola[113]) || 0 : 0;
  },
  'account.spiceClaimsUsed'(save) {
    const ola = save.data?.OptLacc;
    return Array.isArray(ola) ? Number(ola[100]) || 0 : 0;
  },
  'account.eventSpinsLeft'(save) {
    const ola = save.data?.OptLacc;
    return Array.isArray(ola) ? Number(ola[325]) || 0 : 0;
  },
  'account.emperorTriesUsed'(save) {
    const ola = save.data?.OptLacc;
    return Array.isArray(ola) ? Math.abs(Number(ola[370]) || 0) : 0;
  },
  'account.dustTotal'(save) {
    const ola = save.data?.OptLacc;
    return Array.isArray(ola) ? Number(ola[362]) || 0 : 0;
  },
  'account.dustByType'(save, param) {
    // param = 0-4 (indices 357-361)
    const ola = save.data?.OptLacc;
    const idx = 357 + (Number(param) || 0);
    return Array.isArray(ola) ? Number(ola[idx]) || 0 : 0;
  },
  'account.bonesTotal'(save) {
    const ola = save.data?.OptLacc;
    return Array.isArray(ola) ? Number(ola[329]) || 0 : 0;
  },
  'account.bonesByType'(save, param) {
    // param = 0-3 (indices 330-333)
    const ola = save.data?.OptLacc;
    const idx = 330 + (Number(param) || 0);
    return Array.isArray(ola) ? Number(ola[idx]) || 0 : 0;
  },
  'account.tachyonTotal'(save) {
    const ola = save.data?.OptLacc;
    return Array.isArray(ola) ? Number(ola[394]) || 0 : 0;
  },
  'account.tachyonByType'(save, param) {
    // param = 0-5 (indices 388-393)
    const ola = save.data?.OptLacc;
    const idx = 388 + (Number(param) || 0);
    return Array.isArray(ola) ? Number(ola[idx]) || 0 : 0;
  },
  'account.jeweledCogs'(save) {
    const ola = save.data?.OptLacc;
    return Array.isArray(ola) ? Number(ola[414]) || 0 : 0;
  },
  'account.smithySetsUnlocked'(save) {
    const ola = save.data?.OptLacc;
    if (!Array.isArray(ola) || !ola[379]) return 0;
    const raw = String(ola[379]);
    return raw ? raw.split(',').filter(Boolean).length : 0;
  },
  'account.fishingIslandsUnlocked'(save) {
    const ola = save.data?.OptLacc;
    if (!Array.isArray(ola) || !ola[169]) return 0;
    const raw = String(ola[169]);
    return raw ? raw.replace(/_/g, '').length : 0;
  },
  'account.prismaPoints'(save) {
    const ola = save.data?.OptLacc;
    return Array.isArray(ola) ? Number(ola[383]) || 0 : 0;
  },
  'account.dungeonCredits'(save) {
    const ola = save.data?.OptLacc;
    if (!Array.isArray(ola)) return 0;
    return (Number(ola[71]) || 0) + (Number(ola[72]) || 0);
  },
  'account.dungeonFlurbos'(save) {
    const ola = save.data?.OptLacc;
    return Array.isArray(ola) ? Number(ola[73]) || 0 : 0;
  },

  // ══════════════ KEYCHAINS ══════════════

  'keychains.totalOwned'(save) {
    const d = save.data;
    if (!d) return 0;
    let count = 0;
    for (let i = 0; i < 25; i++) {
      const k = d[`EquipmentKeychain${i}`];
      if (k != null && k !== '' && k !== 'Blank') count++;
    }
    return count;
  },
  'keychains.highestTier'(save) {
    const d = save.data;
    if (!d) return 0;
    let max = 0;
    for (let i = 0; i < 25; i++) {
      const k = d[`EquipmentKeychain${i}`];
      if (typeof k === 'string' && k.includes('Keychain')) {
        // Keychain codenames often encode tier: KeychainT3_0 → tier 3
        const m = k.match(/T(\d)/);
        if (m) max = Math.max(max, Number(m[1]));
      }
    }
    return max;
  },

  // ══════════════ ENRICHED SUB-STRUCTURES ══════════════

  'alchemy.liquidTotal'(save) {
    const ci = _pk(save.data, 'CauldronInfo') || save.data?.CauldronInfo;
    if (!Array.isArray(ci) || !Array.isArray(ci[6])) return 0;
    return ci[6].reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
  },

  'equinox.barFill'(save) {
    const dr = _pk(save.data, 'Dream') || save.data?.Dream;
    if (!Array.isArray(dr)) return 0;
    return Number(dr[0]) || 0;
  },
  'equinox.upgradesUnlocked'(save) {
    const dr = _pk(save.data, 'Dream') || save.data?.Dream;
    if (!Array.isArray(dr)) return 0;
    return dr.slice(2).filter(v => v > 0).length;
  },
  'equinox.totalUpgradeLevel'(save) {
    const dr = _pk(save.data, 'Dream') || save.data?.Dream;
    if (!Array.isArray(dr)) return 0;
    return dr.slice(2).reduce((s, v) => s + (typeof v === 'number' && v > 0 ? v : 0), 0);
  },

  'caverns.jarGemTotal'(save) {
    const h = _pk(save.data, 'Holes') || save.data?.Holes;
    if (!Array.isArray(h) || !Array.isArray(h[24])) return 0;
    return h[24].reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
  },
  'caverns.summonDoublers'(save) {
    const h = _pk(save.data, 'Holes') || save.data?.Holes;
    if (!Array.isArray(h) || !Array.isArray(h[28])) return 0;
    return h[28].reduce((s, v) => s + (typeof v === 'number' && v > 0 ? 1 : 0), 0);
  },
  'caverns.gambitCompletion'(save) {
    const h = _pk(save.data, 'Holes') || save.data?.Holes;
    if (!Array.isArray(h) || !Array.isArray(h[13])) return 0;
    const done = h[13].filter(v => v === 1).length;
    const total = h[13].length;
    return total > 0 ? Math.round((done / total) * 100) : 0;
  },
  'caverns.villagerMaxLevel'(save) {
    const h = _pk(save.data, 'Holes') || save.data?.Holes;
    if (!Array.isArray(h) || !Array.isArray(h[0])) return 0;
    return Math.max(0, ...h[0].map(v => typeof v === 'number' ? v : 0));
  },

  'lab.chipCountTotal'(save) {
    const lb = _pk(save.data, 'Lab') || save.data?.Lab;
    if (!Array.isArray(lb) || !Array.isArray(lb[15])) return 0;
    return lb[15].filter(v => v != null && v !== 0 && v !== '').length;
  },

  'sneaking.minibossKills'(save) {
    const nj = _pk(save.data, 'Ninja') || save.data?.Ninja;
    if (!Array.isArray(nj)) return 0;
    return Number(nj[105]) || 0;
  },

  'ribbon.totalLevel'(save) {
    const rb = _pk(save.data, 'Ribbon') || save.data?.Ribbon;
    if (!Array.isArray(rb)) return 0;
    return rb.slice(0, 28).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
  },

  'rift.currentIndex'(save) {
    const rf = _pk(save.data, 'Rift') || save.data?.Rift;
    if (!Array.isArray(rf)) return 0;
    return Number(rf[0]) || 0;
  },

  'bees.totalLevel'(save) {
    const bb = _pk(save.data, 'Bubba') || save.data?.Bubba;
    if (!Array.isArray(bb) || !Array.isArray(bb[1])) return 0;
    return bb[1].reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
  },

  'restaurant.tablesUnlocked'(save) {
    const su = _pk(save.data, 'Sushi') || save.data?.Sushi;
    if (!Array.isArray(su) || !Array.isArray(su[3])) return 0;
    return su[3].filter(v => v !== -1 && v != null).length;
  },
  'restaurant.highestTier'(save) {
    const su = _pk(save.data, 'Sushi') || save.data?.Sushi;
    if (!Array.isArray(su) || !Array.isArray(su[7])) return 0;
    return Math.max(0, ...su[7].map(v => typeof v === 'number' ? v : 0));
  },

  'critters.totalCaught'(save) {
    const bi = _pk(save.data, 'BugInfo') || save.data?.BugInfo;
    if (!Array.isArray(bi) || !Array.isArray(bi[1])) return 0;
    return bi[1].reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
  },
  'critters.plotsActive'(save) {
    const bi = _pk(save.data, 'BugInfo') || save.data?.BugInfo;
    if (!Array.isArray(bi) || !Array.isArray(bi[2])) return 0;
    return bi[2].filter(v => v === -10).length;
  },

  'summoning.familiarCount'(save) {
    const sm = _pk(save.data, 'Summon') || save.data?.Summon;
    if (!Array.isArray(sm) || !Array.isArray(sm[4])) return 0;
    return sm[4].filter(v => v === 1).length;
  },
  'summoning.arenaProgress'(save) {
    const sm = _pk(save.data, 'Summon') || save.data?.Summon;
    if (!Array.isArray(sm) || !Array.isArray(sm[3])) return 0;
    return sm[3].filter(v => typeof v === 'number' && v > 0).length;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
//  Tier evaluation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Given a value and an ascending tiers array, determines the current tier.
 *
 * Tier objects support an optional `type` field (defaults to "gte"):
 *   "gte"         — value >= threshold  (default, backward-compatible)
 *   "unlocked"    — value >= 1  (bool display: ✓/✗)
 *   "count_of_n"  — value >= threshold, displays as "X / total"
 *   "pct"         — value 0–100 treated as %, displays as "X%"
 *   "has_item"    — value is 0|1 from parameterised extractor, bool display
 *   "max_any"     — value >= threshold, displays as "Best: X"
 *   "avg"         — value >= threshold, displays as "avg X"
 *   "per_char"    — value >= threshold (count of qualifying chars)
 *   "compound_and"— all conditions[] must individually pass; ignores `value`
 *   "rate"        — value >= threshold, displays with `per` ("hour"/"day")
 *
 * Extra tier fields used by specific types:
 *   total     — (count_of_n) denominator shown in display
 *   per       — (rate) unit string, e.g. "hour" or "day"
 *   conditions— (compound_and) [{extractor, threshold}, ...]
 *
 * @param {number}  value  — extracted value (ignored for compound_and)
 * @param {Array}   tiers  — ascending tier config array
 * @param {object}  save   — full save object; only needed for compound_and tiers
 */
// #44: Cache tier threshold sequences (keyed on tiers array reference)
const _tierThresholdCache = new WeakMap();
function _getTierThresholds(tiers) {
  if (_tierThresholdCache.has(tiers)) return _tierThresholdCache.get(tiers);
  const thresholds = tiers.map(t => t.threshold ?? 0);
  _tierThresholdCache.set(tiers, thresholds);
  return thresholds;
}

function evaluateTiers(value, tiers, save = null) {
  if (!Array.isArray(tiers) || tiers.length === 0) {
    return { tierIndex: -1, tierLabel: 'No tiers', currentThreshold: 0, nextTier: null, nextThreshold: null, pct: 0, value, displayType: 'gte', total: null, per: null };
  }

  let tierIndex = -1;
  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    const type = tier.type || 'gte';
    let passes = false;

    if (type === 'compound_and') {
      if (save && Array.isArray(tier.conditions) && tier.conditions.length > 0) {
        passes = tier.conditions.every(cond => {
          const fn = EXTRACTORS[cond.extractor];
          if (!fn) return false;
          try { return (fn(save) ?? 0) >= cond.threshold; }
          catch { return false; }
        });
      }
    } else if (type === 'compound_or') {
      // #42: OR logic — any condition met = tier passes
      if (save && Array.isArray(tier.conditions) && tier.conditions.length > 0) {
        passes = tier.conditions.some(cond => {
          const fn = EXTRACTORS[cond.extractor];
          if (!fn) return false;
          try { return (fn(save) ?? 0) >= cond.threshold; }
          catch { return false; }
        });
      }
    } else {
      passes = value >= tier.threshold;
    }

    // #60: Tier skip logic — if a higher tier passes, skip lower ones
    if (passes) tierIndex = i;
    else if (type !== 'compound_and' && type !== 'compound_or') break;
    // For compound types, continue checking higher tiers (non-sequential)
  }

  const currentTier   = tierIndex >= 0 ? tiers[tierIndex] : null;
  const nextTier      = tierIndex < tiers.length - 1 ? tiers[tierIndex + 1] : null;
  const nextThreshold = nextTier ? nextTier.threshold : null;

  // Display type is taken from the current tier (or next tier if none reached yet)
  const displayType   = (currentTier || nextTier || tiers[0])?.type || 'gte';

  let pct = 0;
  if (nextThreshold !== null) {
    const base  = currentTier ? currentTier.threshold : 0;
    const range = nextThreshold - base;
    // For non-numeric types, pct progress isn't meaningful — set to 0
    if (displayType === 'compound_and' || displayType === 'compound_or') {
      pct = 0;
    } else {
      // #56: Smart interpolation — clamp to [0,1] for smooth progress bars
      pct = range > 0 ? Math.max(0, Math.min(1, (value - base) / range)) : 1;
    }
  } else {
    pct = 1; // Already at max tier
  }
  // #44: Use cached thresholds for any threshold-related lookups
  _getTierThresholds(tiers); // warm cache

  return {
    tierIndex,
    tierLabel: currentTier ? currentTier.label : 'None',
    currentThreshold: currentTier ? (currentTier.threshold ?? 0) : 0,
    nextTier: nextTier ? nextTier.label : null,
    nextThreshold,
    nextNote: nextTier ? (nextTier.note || null) : null,
    pct: Math.round(pct * 1000) / 1000,
    atMax: nextTier === null,
    value,
    displayType,
    // Type-specific display hints
    total: currentTier?.total ?? null,
    per: currentTier?.per ?? null,
    // All upcoming tiers (for sub-card display in review UI)
    upcomingTiers: tiers.slice(tierIndex + 1).map(function(t) {
      return { label: t.label, threshold: t.threshold, note: t.note || null, type: t.type || 'gte', total: t.total || null, per: t.per || null, param: t.param ?? null };
    }),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Card evaluation
// ─────────────────────────────────────────────────────────────────────────────

function evaluateCard(card, save, profile = null) {
  // Info cards are static text — no extraction or scoring needed
  if (card.cardType === 'info') {
    return {
      id: card.id,
      label: card.label,
      icon: card.icon,
      cardType: 'info',
      text: card.text || '',
      weight: 0,
      unit: '',
      extractor: null,
      value: 0,
      error: null,
      tierIndex: -1,
      tierLabel: null,
      currentThreshold: 0,
      nextTier: null,
      nextThreshold: null,
      pct: 0,
      atMax: true,
      displayType: 'info',
      total: null,
      per: null,
      upcomingTiers: [],
      weightedScore: 0,
      maxScore: 0,
    };
  }

  const extractor = EXTRACTORS[card.extractor];
  let value = 0;
  let error = null;
  const t0 = profile ? performance.now() : 0;

  if (!extractor) {
    // Fall back to custom extractors
    const customDefs = loadCustomExtractors();
    const customDef = customDefs.find(d => d.id === card.extractor);
    if (customDef) {
      try {
        const paramTier = card.tiers?.find(t => t.param != null);
        const cardParam = card.param ?? paramTier?.param ?? null;
        value = evaluateCustomExtractor(customDef, save, cardParam) ?? 0;
      } catch (e) { error = e.message; }
    } else {
      error = `Unknown extractor: ${card.extractor}`;
    }
  } else {
    // #63: Check LRU cache first
    const paramTier = card.tiers?.find(t => t.param != null);
    const cardParam = card.param ?? paramTier?.param ?? null;
    const cacheKey = card.extractor + (cardParam != null ? ':' + cardParam : '');
    const cached = _extractorLRU.get(cacheKey);
    if (cached !== undefined) {
      value = cached;
    } else {
      try {
        value = cardParam != null
          ? (extractor(save, cardParam) ?? 0)
          : (extractor(save) ?? 0);
        // #53: Return type validation — warn if extractor returns non-number
        if (typeof value !== 'number' || !isFinite(value)) {
          value = Number(value) || 0;
        }
        // #62: avg_per_char mode — divide by character count
        if (card.mode === 'avg_per_char') {
          const chars = save?.CharacterCount ?? save?.playerCount ?? 1;
          value = chars > 0 ? value / chars : value;
        }
        _extractorLRU.set(cacheKey, value);
      } catch (e) { error = e.message; }
    }
  }

  // #40: Record extractor timing
  if (profile) {
    const elapsed = performance.now() - t0;
    profile.push({ extractor: card.extractor, ms: Math.round(elapsed * 100) / 100 });
  }

  // #43: Exclude error cards from scoring — set weight to 0 on error
  // #48: Conditional weights — weight can be { base, conditions: [{ extractor, threshold, weight }] }
  let effectiveWeight;
  if (error) {
    effectiveWeight = 0;
  } else if (card.weight && typeof card.weight === 'object' && Array.isArray(card.weight.conditions)) {
    effectiveWeight = card.weight.base ?? 1.0;
    for (const cond of card.weight.conditions) {
      const fn = EXTRACTORS[cond.extractor];
      if (fn) {
        try { if ((fn(save) ?? 0) >= (cond.threshold ?? 0)) effectiveWeight = cond.weight ?? effectiveWeight; } catch {}
      }
    }
  } else {
    effectiveWeight = card.weight ?? 1.0;
  }

  // Pass save so compound_and/compound_or tiers can re-evaluate their conditions
  const tierResult = evaluateTiers(value, card.tiers, save);

  return {
    id: card.id,
    label: card.label,
    icon: card.icon,
    weight: effectiveWeight,
    unit: card.unit ?? '',
    extractor: card.extractor,
    value,
    error,
    ...tierResult,
    // #59: Card visibility condition
    visible: card.visibleIf ? _checkVisibility(card.visibleIf, save) : true,
    // Weighted score: 0 = below tier 1, 1 = at tier 1, …, N = at tier N (max), interpolated
    weightedScore: tierResult.tierIndex + 1 + tierResult.pct,
    maxScore: card.tiers.length,
  };
}

// #59: Visibility condition checker
function _checkVisibility(visibleIf, save) {
  if (!visibleIf || !visibleIf.extractor) return true;
  const fn = EXTRACTORS[visibleIf.extractor];
  if (!fn) return true;
  try {
    const val = fn(save, visibleIf.param) ?? 0;
    return val >= (visibleIf.threshold || 1);
  } catch { return true; }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Category rating: weighted average of card scores as % of max
// ─────────────────────────────────────────────────────────────────────────────

function rateCategory(evalCards) {
  let weightedSum = 0, weightTotal = 0, maxSum = 0;
  for (const c of evalCards) {
    if (c.cardType === 'info') continue; // info cards do not affect score
    // #43: Error cards have weight=0, so they're excluded from scoring
    const w = c.weight ?? 1.0;
    if (w === 0) continue;
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
export function evaluateGuidance(save, opts = {}) {
  const t0 = performance.now();
  const cfg = loadConfig();
  const profile = opts.profile ? [] : null;

  // #63: Clear LRU cache at start of each evaluation (new save data)
  _extractorLRU.clear();

  const worldResults = [];

  for (const world of cfg.worlds) {
    const categoryResults = [];

    for (const category of world.categories) {
      const cardResults = [];

      for (const card of category.cards) {
        cardResults.push(evaluateCard(card, save, profile));
      }

      const { pct } = rateCategory(cardResults);

      const scorableCards = cardResults.filter(c => c.cardType !== 'info');
      categoryResults.push({
        id: category.id,
        label: category.label,
        icon: category.icon,
        weight: category.weight ?? 1.0,
        pct,
        cards: cardResults,
        cardsAtMax: scorableCards.filter(c => c.atMax).length,
        cardsTotal: scorableCards.length,
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
        if (card.cardType === 'info') continue;
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

  recommendations.sort((a, b) => b.pctToNext - a.pctToNext);

  const totalMs = Math.round((performance.now() - t0) * 100) / 100;

  // #40/#55 Store last profile for diagnostics
  if (profile) {
    profile.sort((a, b) => b.ms - a.ms);
    _lastEvalProfile = { ts: Date.now(), totalMs, extractors: profile };
  }

  // #61 Audit log entry
  _appendAuditLog({ globalPct: Math.round(globalPct * 1000) / 1000, totalMs, cardCount: recommendations.length });

  const result = {
    globalPct: Math.round(globalPct * 1000) / 1000,
    worlds: worldResults,
    recommendations: recommendations.slice(0, 20),
    evaluatedAt: Date.now(),
    _evalMs: totalMs,
  };
  if (profile) result._profile = _lastEvalProfile;
  return result;
}

// #61 Evaluation audit log — keeps last 100 evaluations in memory
const _auditLog = [];
function _appendAuditLog(entry) {
  _auditLog.push({ ts: Date.now(), ...entry });
  if (_auditLog.length > 100) _auditLog.shift();
}
export function getAuditLog() { return _auditLog; }

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
    group: 'Stamps',
    label: 'Stamps Leveled — how many unlocked (count)',
    desc:  'How many stamps you have leveled at least once (lv > 0). ~270 slots total across all three books. Use thresholds like 50, 100, 200, 270.',
    dataKey: 'StampA, StampB, StampC',
    valueType: 'count',
    maxHint: 270,
  },
  'stamps.maxLevel': {
    group: 'Stamps',
    label: 'Stamps — level of your single highest stamp (max)',
    desc:  'The level of your one most-leveled stamp. This is NOT the total level sum — it is the peak a single stamp has reached (e.g. your best Combat stamp at lv 634). Use for benchmarking single-stamp depth.',
    dataKey: 'StampA, StampB, StampC',
    valueType: 'max',
    maxHint: 1500,
  },
  'stamps.gildedCount': {
    group: 'Stamps',
    label: 'Stamps — gilded count (count)',
    desc:  'Number of stamps that are gilded (the StuG array tracks this with value 3 per gilded slot, shared with gilded statues).',
    dataKey: 'StuG',
    valueType: 'count',
    maxHint: 200,
  },
  'stamps.totalSumLevels': {
    group: 'Stamps',
    label: 'Stamps — total sum of ALL levels (sum) ← the "36K" number',
    desc:  'Sum of all stamp levels across all three books — this is the big number (e.g. 36 000) shown in the idleon-review Stamps card. Use this to track overall stamp investment. Thresholds: 5 000 = early, 20 000 = mid, 50 000+ = endgame.',
    dataKey: 'StampLv',
    valueType: 'sum',
    maxHint: 50000,
  },
  'stamps.hasStamp': {
    group: 'Stamps',
    label: 'Has Specific Stamp Unlocked (bool)',
    desc:  'Returns 1 if a specific stamp slot has been unlocked (level > 0). Param format: "tab:index" where tab 0=Combat, 1=Skills, 2=Misc, and index is 0-based position in that tab. E.g. "0:5" = 6th combat stamp.',
    dataKey: 'StampLv',
    valueType: 'bool',
    paramHint: 'tab:index  e.g. "0:5" (combat tab, slot 5)',
  },
  'stamps.pctLeveled': {
    group: 'Stamps',
    label: 'Stamps % Leveled',
    desc:  'Percentage of stamp slots with level > 0 across all three tabs (StampLv). Returns an integer 0–100. Use with tier type "pct".',
    dataKey: 'StampLv',
    valueType: 'pct',
    maxHint: 100,
  },
  'stamps.avgLevel': {
    group: 'Stamps',
    label: 'Stamps Average Level',
    desc:  'Average level of all leveled stamps across all tabs (StampLv, entries > 0). Returns a float. Use with tier type "avg".',
    dataKey: 'StampLv',
    valueType: 'avg',
    maxHint: 300,
  },

  // ── STATUES ───────────────────────────────────────────────────────────────
  'statues.totalLeveled': {
    group: 'Statues',
    label: 'Statues Leveled (count)',
    desc:  'Number of distinct statue types leveled across all characters (best level per statue is used).',
    dataKey: 'StatueLevels_0…11',
    valueType: 'count',
    maxHint: 30,
  },
  'statues.maxLevel': {
    group: 'Statues',
    label: 'Statue Max Level (single highest)',
    desc:  'Highest level reached on any single statue across all characters.',
    dataKey: 'StatueLevels_0…11',
    valueType: 'max',
    maxHint: 1000,
  },
  'statues.gildedCount': {
    group: 'Statues',
    label: 'Gilded Statues (count)',
    desc:  'Number of statues with a golden upgrade (StuG array — value 3 = gilded; same array as gilded stamps, different index).',
    dataKey: 'StuG',
    valueType: 'count',
    maxHint: 30,
  },
  'statues.avgLevel': {
    group: 'Statues',
    label: 'Statues Average Level',
    desc:  'Average level of all leveled statues (StuG array, entries > 0). Returns a float. Use with tier type "avg".',
    dataKey: 'StuG',
    valueType: 'avg',
    maxHint: 100,
  },

  // ── ANVIL ────────────────────────────────────────────────────────────────
  'anvil.tabsUnlocked': {
    group: 'Anvil',
    label: 'Anvil Tabs Unlocked (count)',
    desc:  'Maximum number of production tabs unlocked across all characters (AnvilCraftStatus per character, array of booleans).',
    dataKey: 'AnvilCraftStatus',
    valueType: 'count',
    maxHint: 8,
  },
  'anvil.maxProdSpeed': {
    group: 'Anvil',
    label: 'Best Anvil Prod Speed',
    desc:  'Highest production speed value across all characters (AnvilPAstats_N[0] = speed per char). Raw game units.',
    dataKey: 'AnvilPAstats_0…11',
    valueType: 'score',
    maxHint: 100000,
  },

  // ── FORGE ────────────────────────────────────────────────────────────────
  'forge.maxSlotLevel': {
    group: 'Forge',
    label: 'Max Forge Slot Level',
    desc:  'Highest level of any forge slot (ForgeLV array). Forge upgrades are account-wide.',
    dataKey: 'ForgeLV',
    valueType: 'max',
    maxHint: 200,
  },

  // ── CARDS ────────────────────────────────────────────────────────────────
  'cards.totalCollected': {
    group: 'Cards',
    label: 'Cards Collected (count)',
    desc:  'Total distinct monster cards in the collection (Cards0 object — keys are monster codenames, any value > 0 means collected).',
    dataKey: 'Cards0',
    valueType: 'count',
    maxHint: 300,
  },
  'cards.rubyCount': {
    group: 'Cards',
    label: 'Ruby Cards (count)',
    desc:  'Cards with ≥ 1 trillion (1e12) copies — the highest star tier. Very late-game metric, most players have 0.',
    dataKey: 'Cards0',
    valueType: 'count',
    maxHint: 50,
  },

  // ── ALCHEMY ──────────────────────────────────────────────────────────────
  'alchemy.bubblesLeveled': {
    group: 'Alchemy',
    label: 'Bubbles Leveled (count)',
    desc:  'Count of alchemy bubbles with lv > 0 across all four cauldrons (CauldronInfo[0] = nested level arrays per cauldron).',
    dataKey: 'CauldronInfo[0]',
    valueType: 'count',
    maxHint: 100,
  },
  'alchemy.bubblesMaxLevel': {
    group: 'Alchemy',
    label: 'Bubble Max Level (single highest)',
    desc:  'Level of the single highest-leveled alchemy bubble across all cauldrons.',
    dataKey: 'CauldronInfo[0]',
    valueType: 'max',
    maxHint: 500,
  },
  'alchemy.vialsMaxed': {
    group: 'Alchemy',
    label: 'Vials Maxed (count)',
    desc:  'Number of alchemy vials at or above max level (15). Vials are stored as a dict in CauldronInfo[4] → { codename: level }.',
    dataKey: 'CauldronInfo[4]',
    valueType: 'count',
    maxHint: 35,
  },
  'alchemy.totalVialsLeveled': {
    group: 'Alchemy',
    label: 'Vials Leveled (count)',
    desc:  'Number of vials with any level > 0 (CauldronInfo[4] dict). Tracks collection breadth vs. vialsMaxed which tracks depth.',
    dataKey: 'CauldronInfo[4]',
    valueType: 'count',
    maxHint: 35,
  },
  'bubbles.pctLeveled': {
    group: 'Alchemy',
    label: 'Bubbles % Leveled',
    desc:  'Percentage of alchemy bubble slots with level > 0 across all four cauldrons (CauldronInfo[0..3]). Returns an integer 0–100. Use with tier type "pct".',
    dataKey: 'CauldronInfo',
    valueType: 'pct',
    maxHint: 100,
  },
  'bubbles.avgLevel': {
    group: 'Alchemy',
    label: 'Bubbles Average Level',
    desc:  'Average level of all leveled bubbles across all cauldrons (CauldronInfo[0..3], entries > 0). Returns a float. Use with tier type "avg".',
    dataKey: 'CauldronInfo',
    valueType: 'avg',
    maxHint: 200,
  },

  // ── OBOLS ────────────────────────────────────────────────────────────────
  'obols.familyTotal': {
    group: 'Obols',
    label: 'Family Obols Equipped (count)',
    desc:  'Total non-empty slots in the family obol board (ObolEqO1 + ObolEqO2). Filters out 0 and empty string values.',
    dataKey: 'ObolEqO1, ObolEqO2',
    valueType: 'count',
    maxHint: 50,
  },

  // ── CONSTRUCTION ─────────────────────────────────────────────────────────
  'construction.maxBuildingLevel': {
    group: 'Construction',
    label: 'Max Building Level',
    desc:  'Highest level of any W3 construction building (Tower array, first 27 entries are buildings; rest are traps/misc).',
    dataKey: 'Tower',
    valueType: 'max',
    maxHint: 200,
  },
  'construction.buildingsAbove10': {
    group: 'Construction',
    label: 'Buildings ≥ Lv 10 (count)',
    desc:  'Count of W3 construction buildings at level 10 or above (Tower[0..26]).',
    dataKey: 'Tower',
    valueType: 'count',
    maxHint: 27,
  },

  // ── PRAYERS ──────────────────────────────────────────────────────────────
  'prayers.totalLevels': {
    group: 'Prayers',
    label: 'Prayer Total Levels (sum)',
    desc:  'Sum of all prayer levels (PrayOwned array). Prayers are leveled with Monster Drops in W3 worship.',
    dataKey: 'PrayOwned',
    valueType: 'sum',
    maxHint: 400,
  },
  'prayers.unlocked': {
    group: 'Prayers',
    label: 'Prayers Unlocked (count)',
    desc:  'Number of prayers unlocked (PrayOwned entries > 0). Each prayer requires clearing specific content to unlock.',
    dataKey: 'PrayOwned',
    valueType: 'count',
    maxHint: 25,
  },

  // ── TOTEMS ───────────────────────────────────────────────────────────────
  'totems.highestWave': {
    group: 'Worship',
    label: 'Totem Highest Wave (max)',
    desc:  'Best wave reached across all world totems (TotemInfo[0] array). Totems are W3 worship towers.',
    dataKey: 'TotemInfo[0]',
    valueType: 'max',
    maxHint: 200,
  },
  'totems.avgWave': {
    group: 'Worship',
    label: 'Totem Average Wave',
    desc:  'Average wave across all active totems (only entries > 0). Measures consistent worship depth vs. just the best one.',
    dataKey: 'TotemInfo[0]',
    valueType: 'score',
    maxHint: 150,
  },

  // ── SALT LICK ────────────────────────────────────────────────────────────
  'saltLick.totalLevels': {
    group: 'Salt Lick',
    label: 'Salt Lick Total Levels (sum)',
    desc:  'Sum of all Salt Lick upgrade levels (SaltLick array). Salt Lick is a W3 account-wide upgrade building.',
    dataKey: 'SaltLick',
    valueType: 'sum',
    maxHint: 200,
  },

  // ── ATOMS ────────────────────────────────────────────────────────────────
  'atoms.highestLevel': {
    group: 'Atoms',
    label: 'Highest Atom Level (max)',
    desc:  'Level of the highest-leveled atom collider upgrade (Atoms array, W4 feature unlocked via construction).',
    dataKey: 'Atoms',
    valueType: 'max',
    maxHint: 50,
  },
  'atoms.totalLevels': {
    group: 'Atoms',
    label: 'Atom Total Levels (sum)',
    desc:  'Sum of all atom collider upgrade levels. Atoms are expensive but grant permanent account bonuses.',
    dataKey: 'Atoms',
    valueType: 'sum',
    maxHint: 300,
  },

  // ── COOKING ──────────────────────────────────────────────────────────────
  'cooking.mealsMaxed': {
    group: 'Cooking',
    label: 'Meals Maxed (count)',
    desc:  'Number of W4 meals at max level 30. The Meals array stores [level, speed, level, speed…] alternating, so only even indices are checked.',
    dataKey: 'Meals',
    valueType: 'count',
    maxHint: 60,
  },
  'cooking.mealsDiscovered': {
    group: 'Cooking',
    label: 'Meals Discovered (count)',
    desc:  'Number of meals with lv > 0 (Meals array, even indices). Discovering meals requires cooking them for the first time.',
    dataKey: 'Meals',
    valueType: 'count',
    maxHint: 60,
  },

  // ── LAB ──────────────────────────────────────────────────────────────────
  'lab.totalChipsEquipped': {
    group: 'Lab',
    label: 'Lab Chips Equipped (count)',
    desc:  'Total chips with value > 0 summed across all nested sub-arrays of the Lab key. Lab chips boost characters while they are in the lab.',
    dataKey: 'Lab',
    valueType: 'count',
    maxHint: 100,
  },

  // ── BREEDING ─────────────────────────────────────────────────────────────
  'breeding.highestPetPower': {
    group: 'Breeding',
    label: 'Highest Pet Power (max)',
    desc:  'Power level of the strongest stored pet (PetsStored[i][2] = power). Pet power grows exponentially with egg tier.',
    dataKey: 'PetsStored',
    valueType: 'max',
    maxHint: 1000000,
  },
  'breeding.territoriesUnlocked': {
    group: 'Breeding',
    label: 'Territories Unlocked (count)',
    desc:  'Number of W4 breeding territories with any progress (Territory[0] array, value > 0). Each territory gives passive bonuses.',
    dataKey: 'Territory[0]',
    valueType: 'count',
    maxHint: 50,
  },

  // ── SAILING ──────────────────────────────────────────────────────────────
  'sailing.artifactsFound': {
    group: 'Sailing',
    label: 'Artifacts Found (count)',
    desc:  'Number of W5 sailing artifacts with level > 0 (Sailing[3] array of [level, bonus…] per artifact).',
    dataKey: 'Sailing[3]',
    valueType: 'count',
    maxHint: 40,
  },
  'sailing.islandsReached': {
    group: 'Sailing',
    label: 'Islands Reached (count)',
    desc:  'Number of W5 sailing islands with any progress (Sailing[1] array). Each island unlocks new artifacts or resources.',
    dataKey: 'Sailing[1]',
    valueType: 'count',
    maxHint: 30,
  },

  // ── FARMING ──────────────────────────────────────────────────────────────
  'farming.activePlots': {
    group: 'Farming',
    label: 'Active Farm Plots (count)',
    desc:  'Number of W6 farming plots with a crop planted (FarmPlot entries where index 0 ≠ -1; -1 = empty/locked).',
    dataKey: 'FarmPlot',
    valueType: 'count',
    maxHint: 36,
  },
  'farming.totalUpgrades': {
    group: 'Farming',
    label: 'Farm Upgrade Levels (sum)',
    desc:  'Sum of all W6 farming plot upgrade levels (FarmUpg array). Upgrades speed up crop growth and yields.',
    dataKey: 'FarmUpg',
    valueType: 'sum',
    maxHint: 500,
  },

  // ── SUMMONING ────────────────────────────────────────────────────────────
  'summoning.highestArenaWave': {
    group: 'Summoning',
    label: 'Summoning Arena Wave (max)',
    desc:  'Highest wave reached across all W6 summoning arenas (Summon[3] array of best-wave-per-arena).',
    dataKey: 'Summon[3]',
    valueType: 'max',
    maxHint: 100,
  },

  // ── DIVINITY ─────────────────────────────────────────────────────────────
  'divinity.godsUnlocked': {
    group: 'Divinity',
    label: 'Gods Unlocked (count)',
    desc:  'Number of W5 divinity gods with any blessings collected (Divinity[0] array, value > 0). Requires linking characters.',
    dataKey: 'Divinity[0]',
    valueType: 'count',
    maxHint: 14,
  },

  // ── CAVERNS (W7) ─────────────────────────────────────────────────────────
  'caverns.highestVillagerLevel': {
    group: 'Caverns',
    label: 'Highest Villager Level (max)',
    desc:  'Level of the highest-leveled W7 cavern villager (Holes[0] array). Villager levels are capped by content milestones.',
    dataKey: 'Holes[0]',
    valueType: 'max',
    maxHint: 50,
  },
  'caverns.totalVillagerLevels': {
    group: 'Caverns',
    label: 'Villager Total Levels (sum)',
    desc:  'Sum of all W7 cavern villager levels (Holes[0] array). More total levels = more active cavern bonuses.',
    dataKey: 'Holes[0]',
    valueType: 'sum',
    maxHint: 300,
  },

  // ── BEES (W7) ────────────────────────────────────────────────────────────
  'bees.highestLevel': {
    group: 'Bees',
    label: 'Highest Bee Level (max)',
    desc:  'Level of the highest-leveled bee in the W7 bee system (Bubba[1] = array of bee levels).',
    dataKey: 'Bubba[1]',
    valueType: 'max',
    maxHint: 100,
  },

  // ── SNEAKING (W7) ────────────────────────────────────────────────────────
  'sneaking.areasUnlocked': {
    group: 'Sneaking',
    label: 'Sneaking Areas Unlocked (count)',
    desc:  'Number of W7 sneaking areas unlocked (Spelunk[0] array, value === 1). More areas = more sneaking resources.',
    dataKey: 'Spelunk[0]',
    valueType: 'count',
    maxHint: 20,
  },
  'sneaking.highestAreaLevel': {
    group: 'Sneaking',
    label: 'Sneaking Highest Area Level (max)',
    desc:  'Highest sneaking area completion level (Spelunk[1] array). Higher = better loot from sneaking runs.',
    dataKey: 'Spelunk[1]',
    valueType: 'max',
    maxHint: 100,
  },

  // ── SUSHI (W7) ───────────────────────────────────────────────────────────
  'sushi.tablesUnlocked': {
    group: 'Sushi',
    label: 'Sushi Tables Unlocked (count)',
    desc:  'Number of W7 sushi tables unlocked (Sushi[3] array, value ≠ -1). Each table produces a different type of bonus.',
    dataKey: 'Sushi[3]',
    valueType: 'count',
    maxHint: 20,
  },
  'sushi.highestDishTier': {
    group: 'Sushi',
    label: 'Sushi Highest Dish Tier (max)',
    desc:  'Highest dish tier reached in the W7 sushi system (Sushi[7] array). Higher tiers give bigger bonuses.',
    dataKey: 'Sushi[7]',
    valueType: 'max',
    maxHint: 10,
  },

  // ── BUG CATCHING (W7) ────────────────────────────────────────────────────
  'bugCatching.plotsUnlocked': {
    group: 'Bug Catching',
    label: 'Bug Catching Plots (count)',
    desc:  'Number of active W7 bug catching plots (BugInfo[2] entries === -10; -10 is the game\'s sentinel for an active/unlocked plot).',
    dataKey: 'BugInfo[2]',
    valueType: 'count',
    maxHint: 15,
  },

  // ── STAR SIGNS ───────────────────────────────────────────────────────────
  'starSigns.purchased': {
    group: 'Star Signs',
    label: 'Star Signs Purchased (count)',
    desc:  'Total star signs owned (StarSg object, key count). Star signs are account-wide and include all types purchased.',
    dataKey: 'StarSg',
    valueType: 'count',
    maxHint: 100,
  },
  'starSigns.constellationsCompleted': {
    group: 'Star Signs',
    label: 'Constellations Completed (count)',
    desc:  'Number of star constellations with done flag = 1 (SSprog array of [id, done] pairs). Completing one unlocks new signs.',
    dataKey: 'SSprog',
    valueType: 'count',
    maxHint: 50,
  },

  // ── ACHIEVEMENTS ─────────────────────────────────────────────────────────
  'achievements.completed': {
    group: 'Achievements',
    label: 'Achievements Completed (count)',
    desc:  'Total regular achievements completed (AchieveReg array, value === 1). Does not include Steam/platform achievements.',
    dataKey: 'AchieveReg',
    valueType: 'count',
    maxHint: 300,
  },

  // ── DEATH NOTE ───────────────────────────────────────────────────────────
  'deathnote.totalSkullTiers': {
    group: 'Death Note',
    label: 'Death Note Skull Tiers (count)',
    desc:  'Total monster-map entries with kills > 0 across all worlds (KLA_{0..11} arrays of [kills, …] per map). This counts entries above zero — NOT total skull levels.',
    dataKey: 'KLA_0…KLA_11',
    valueType: 'count',
    maxHint: 500,
  },

  // ── RIFT ─────────────────────────────────────────────────────────────────
  'rift.bonusesUnlocked': {
    group: 'Rift',
    label: 'Rift Bonuses Unlocked (count)',
    desc:  'Number of Rift milestone bonuses with value > 0 (Rift array). Rift bonuses are permanent account power unlocks.',
    dataKey: 'Rift',
    valueType: 'count',
    maxHint: 40,
  },

  // ── SLAB ─────────────────────────────────────────────────────────────────
  'slab.itemsObtained': {
    group: 'Slab',
    label: 'Slab Items Obtained (count)',
    desc:  'Items logged in the loot slab (Cards1 array length). Important: Slab uses Cards1 — distinct from monster card data in Cards0.',
    dataKey: 'Cards1',
    valueType: 'count',
    maxHint: 1200,
  },

  // ── CHARACTERS ───────────────────────────────────────────────────────────
  'characters.count': {
    group: 'Characters',
    label: 'Character Count',
    desc:  'Total number of characters on the account (CharacterClass array length).',
    dataKey: 'CharacterClass',
    valueType: 'count',
    maxHint: 10,
  },
  'characters.highestLevel': {
    group: 'Characters',
    label: 'Highest Character Level (max)',
    desc:  'Level of the highest-leveled character (Lv_{0..11}[0] = base level per character).',
    dataKey: 'Lv_0…Lv_11',
    valueType: 'max',
    maxHint: 400,
  },
  'characters.inLab': {
    group: 'Characters',
    label: 'Characters In Lab (count)',
    desc:  'Count of characters currently stationed in the W4 lab (PVMisc_i[4] === 1). Use with tier type "per_char".',
    dataKey: 'PVMisc_0…PVMisc_11',
    valueType: 'count',
    maxHint: 12,
  },
  'characters.withStarSign': {
    group: 'Characters',
    label: 'Characters With Star Sign (count)',
    desc:  'Count of characters that have a specific star sign equipped (SSprog_i / StarSign_i arrays). Use with tier type "per_char" and a `param` field containing the sign name.',
    dataKey: 'SSprog_0…SSprog_11',
    valueType: 'count',
    maxHint: 12,
    paramHint: 'signName (string)',
  },

  // ── POST OFFICE ──────────────────────────────────────────────────────────
  'postOffice.totalBoxes': {
    group: 'Post Office',
    label: 'PO Boxes Total Levels (sum)',
    desc:  'Sum of all Post Office box delivery levels across all characters (POu_{0..11} arrays). Higher = more PO bonuses active.',
    dataKey: 'POu_0…POu_11',
    valueType: 'sum',
    maxHint: 5000,
  },

  // ── ITEM TRACKING ────────────────────────────────────────────────────────
  'items.inChest': {
    group: 'Items',
    label: 'Item Quantity In Chest (count)',
    desc:  'Total quantity of a named item in the account storage chest (ChestOrder + ChestQuantity). Use a `param` field with the item codename (case-insensitive). Use with tier type "gte" for quantity thresholds or "has_item"/"unlocked" to check presence.',
    dataKey: 'ChestOrder, ChestQuantity',
    valueType: 'count',
    maxHint: 99999999,
    paramHint: 'itemCodename (string, e.g. "FoodHealth1")',
  },
  'items.anywhereQty': {
    group: 'Items',
    label: 'Item Quantity (Chest + All Inventories)',
    desc:  'Total quantity of a named item across the storage chest and all character inventories. Searches ChestOrder/ChestQuantity and InventoryOrder_{i}/ItemQTY_{i}. Use a `param` field with the item codename (case-insensitive). Useful for materials that are spread across characters.',
    dataKey: 'ChestOrder, ChestQuantity, InventoryOrder_0…11, ItemQTY_0…11',
    valueType: 'count',
    maxHint: 99999999,
    paramHint: 'itemCodename (string, e.g. "CopperBar")',
  },
  'items.inSlab': {
    group: 'Items',
    label: 'Item Obtained (Slab) (bool)',
    desc:  'Returns 1 if the item has ever been obtained — i.e. its codename appears in the Loot Slab (Cards1). Does NOT check quantity; it only confirms the item was looted at least once. Use with tier type "has_item" or "unlocked".',
    dataKey: 'Cards1',
    valueType: 'bool',
    paramHint: 'itemCodename (string, e.g. "EquipmentHats12")',
  },

  // ── PARAMETERISED (has_item) ─────────────────────────────────────────────
  'chips.hasChip': {
    group: 'Lab',
    label: 'Has Lab Chip (bool)',
    desc:  'Returns 1 if the named lab chip is equipped on any character (Lab nested arrays). Use with tier type "has_item" and a `param` field containing the chip name.',
    dataKey: 'Lab',
    valueType: 'bool',
    paramHint: 'chipName (string)',
  },
  'artifacts.hasArtifact': {
    group: 'Sailing',
    label: 'Has Sailing Artifact (bool)',
    desc:  'Returns 1 if the named sailing artifact has been found (Sailing[3] array, level > 0). Use with tier type "has_item" and a `param` field containing the artifact name.',
    dataKey: 'Sailing[3]',
    valueType: 'bool',
    paramHint: 'artifactName (string)',
  },
  'meals.hasMeal': {
    group: 'Cooking',
    label: 'Has Meal Unlocked (bool)',
    desc:  'Returns 1 if the given meal index (0-based) has been discovered — Meals[index*2] > 0. Use with tier type "has_item" and a `param` field containing the meal index.',
    dataKey: 'Meals',
    valueType: 'bool',
    paramHint: 'mealIndex (number)',
  },

  // ── EQUINOX ──────────────────────────────────────────────────────────────
  'equinox.bonusesUnlocked': {
    group: 'Equinox',
    label: 'Equinox Bonuses Unlocked (count)',
    desc:  'Number of Equinox dream bonuses unlocked (Dream array, entries === 1). Equinox is a W3 character system with daily bonuses.',
    dataKey: 'Dream',
    valueType: 'count',
    maxHint: 30,
  },

  // ── REFINERY ─────────────────────────────────────────────────────────────
  'refinery.highestRank': {
    group: 'Refinery',
    label: 'Refinery Highest Salt Rank (max)',
    desc:  'Highest rank of any salt type in the W3 refinery (Refinery[salt][0]). Ranks unlock different salt tiers and properties.',
    dataKey: 'Refinery',
    valueType: 'max',
    maxHint: 50,
  },
  'refinery.totalRanks': {
    group: 'Refinery',
    label: 'Refinery Total Salt Ranks (sum)',
    desc:  'Sum of all salt ranks across all W3 refinery slots. Higher rank = faster salt production.',
    dataKey: 'Refinery',
    valueType: 'sum',
    maxHint: 200,
  },

  // ── SHRINES ──────────────────────────────────────────────────────────────
  'shrines.active': {
    group: 'Shrines',
    label: 'Shrines Active (count)',
    desc:  'Number of W3 shrines with level > 0 (Shrine array, entry[1] = level). Active shrines provide map-specific bonuses.',
    dataKey: 'Shrine',
    valueType: 'count',
    maxHint: 9,
  },
  'shrines.totalLevels': {
    group: 'Shrines',
    label: 'Shrines Total Levels (sum)',
    desc:  'Sum of all shrine levels (Shrine[i][1]). Higher total = more shrine bonus potency.',
    dataKey: 'Shrine',
    valueType: 'sum',
    maxHint: 200,
  },

  // ── ARCADE ───────────────────────────────────────────────────────────────
  'arcade.totalLevels': {
    group: 'Arcade',
    label: 'Arcade Total Upgrade Levels (sum)',
    desc:  'Sum of all W2 arcade upgrades (ArcadeUpg array, max 100 per upgrade). Arcade upgrades give permanent account bonuses.',
    dataKey: 'ArcadeUpg',
    valueType: 'sum',
    maxHint: 3000,
  },
  'arcade.highestLevel': {
    group: 'Arcade',
    label: 'Arcade Highest Upgrade Level (max)',
    desc:  'Level of the single highest-leveled arcade upgrade (ArcadeUpg array, max 100 each).',
    dataKey: 'ArcadeUpg',
    valueType: 'max',
    maxHint: 100,
  },

  // ── DUNGEON ──────────────────────────────────────────────────────────────
  'dungeon.totalUpgrades': {
    group: 'Dungeon',
    label: 'Dungeon Total Upgrade Levels (sum)',
    desc:  'Sum of all dungeon upgrade levels (DungUpg[3] = main upgrades array). Dungeon upgrades bought with Flurbos from W2 dungeon runs.',
    dataKey: 'DungUpg[3]',
    valueType: 'sum',
    maxHint: 500,
  },

  // ── GAMING ───────────────────────────────────────────────────────────────
  'gaming.superbitActive': {
    group: 'Gaming',
    label: 'Gaming Superbits Active (count)',
    desc:  'Number of W5 gaming superbits with level > 0 (Gaming[0] array). Superbits are purchased with bits and grant account-wide bonuses.',
    dataKey: 'Gaming[0]',
    valueType: 'count',
    maxHint: 30,
  },

  // ── GRIMOIRE ─────────────────────────────────────────────────────────────
  'grimoire.totalLevels': {
    group: 'Grimoire',
    label: 'Grimoire Total Levels (sum)',
    desc:  'Sum of all Death Bringer Grimoire upgrade levels (Grimoire array). Grimoire upgrades are exclusive to the Death Bringer master class.',
    dataKey: 'Grimoire',
    valueType: 'sum',
    maxHint: 500,
  },
  'grimoire.highestLevel': {
    group: 'Grimoire',
    label: 'Grimoire Highest Level (max)',
    desc:  'Level of the single highest Grimoire upgrade (Grimoire array, max per entry).',
    dataKey: 'Grimoire',
    valueType: 'max',
    maxHint: 100,
  },

  // ── TESSERACT ────────────────────────────────────────────────────────────
  'tesseract.unlocked': {
    group: 'Tesseract',
    label: 'Tesseracts Unlocked (count)',
    desc:  'Number of Wind Walker tesseract entries with value > 0 (Tess array). Tesseracts are an exclusive Wind Walker master class upgrade system.',
    dataKey: 'Tess',
    valueType: 'count',
    maxHint: 20,
  },

  // ── COMPASS ──────────────────────────────────────────────────────────────
  'compass.totalLevels': {
    group: 'Compass',
    label: 'Compass Total Levels (sum)',
    desc:  'Total of all Wind Walker Compass upgrade values (Compass array, JSON-encoded). Compass is exclusive to the Wind Walker master class.',
    dataKey: 'Compass',
    valueType: 'sum',
    maxHint: 500,
  },

  // ── ARCANE ───────────────────────────────────────────────────────────────
  'arcane.activeNodes': {
    group: 'Arcane',
    label: 'Arcane Active Nodes (count)',
    desc:  'Number of active W8 arcane spell nodes (Arcane[0..56] entries > 0). Nodes beyond index 56 are locked/unused.',
    dataKey: 'Arcane[0..56]',
    valueType: 'count',
    maxHint: 57,
  },
  'arcane.totalLevels': {
    group: 'Arcane',
    label: 'Arcane Total Node Levels (sum)',
    desc:  'Sum of all active arcane node levels (Arcane[0..56]). Higher total = more spell power.',
    dataKey: 'Arcane[0..56]',
    valueType: 'sum',
    maxHint: 5000,
  },

  // ── RESEARCH ─────────────────────────────────────────────────────────────
  'research.booksUpgraded': {
    group: 'Research',
    label: 'Library Books Upgraded (count)',
    desc:  'Number of W3 library research books with any progress (Research[i][0] > 0). Up to 14 books total.',
    dataKey: 'Research',
    valueType: 'count',
    maxHint: 14,
  },

  // ── STAMPS — EXALT ───────────────────────────────────────────────────────
  'stamps.exaltPlaced': {
    group: 'Stamps',
    label: 'Exalt Stamps Placed (count)',
    desc:  'Number of stamps that have been exalted via the Compass system (Compass[4] array length). Each exalted stamp slot gets a massive bonus multiplier.',
    dataKey: 'Compass[4]',
    valueType: 'count',
    maxHint: 30,
  },
  'stamps.exaltBonusPct': {
    group: 'Stamps',
    label: 'Exalt Bonus % (approx.)',
    desc:  'Approximate total exalt bonus percentage (base 100% + atom Aluminium lv + Emperor set + Spelunking fragments + event). Does NOT include all sources (palette, exotic, etc.).',
    dataKey: 'Compass, Spelunk, Atoms, OptLacc',
    valueType: 'score',
    maxHint: 500,
  },

  // ── BRIBES ───────────────────────────────────────────────────────────────
  'bribes.bought': {
    group: 'Bribes',
    label: 'Bribes Bought (count)',
    desc:  'Number of W1 bribes purchased (BribeStatus entries > 0). Each bribe gives a permanent account bonus.',
    dataKey: 'BribeStatus',
    valueType: 'count',
    maxHint: 45,
  },
  'bribes.total': {
    group: 'Bribes',
    label: 'Total Bribes Available (count)',
    desc:  'Total number of bribe slots in BribeStatus array. Use alongside bribes.bought to show how many are left.',
    dataKey: 'BribeStatus',
    valueType: 'count',
    maxHint: 50,
  },

  // ── STATUES (extended) ───────────────────────────────────────────────────
  'statues.goldCount': {
    group: 'Statues',
    label: 'Gold Statues (count)',
    desc:  'Number of statues upgraded to Gold tier (StuG[0..31] === 3). Gold statues get a shared bonus multiplier when you unlock the Golden Statue upgrade.',
    dataKey: 'StuG',
    valueType: 'count',
    maxHint: 32,
  },
  'statues.silverCount': {
    group: 'Statues',
    label: 'Silver Statues (count)',
    desc:  'Number of statues at Silver tier (StuG[0..31] === 2). Silver is the tier before Gold.',
    dataKey: 'StuG',
    valueType: 'count',
    maxHint: 32,
  },
  'statues.statueLevel': {
    group: 'Statues',
    label: 'Specific Statue Level (max across chars)',
    desc:  'Level of a specific statue (StatueLevels_{i}[idx][0]), taking the maximum across all characters. Param = statue index (0-31).',
    dataKey: 'StatueLevels_0…11',
    valueType: 'max',
    paramHint: 'statueIndex (0–31)',
    maxHint: 1000,
  },
  'statues.statueGold': {
    group: 'Statues',
    label: 'Specific Statue — Is Gold? (bool)',
    desc:  'Returns 1 if the statue at the given index is Gold or higher (StuG[idx] === 3). Param = statue index (0-31).',
    dataKey: 'StuG',
    valueType: 'bool',
    paramHint: 'statueIndex (0–31)',
  },

  // ── FORGE (extended) ─────────────────────────────────────────────────────
  'forge.upgradeSum': {
    group: 'Forge',
    label: 'Forge Upgrade Sum (all slots)',
    desc:  'Sum of all forge slot levels (ForgeLV array). Tracks total investment in the W1 Forge upgrade system.',
    dataKey: 'ForgeLV',
    valueType: 'sum',
    maxHint: 2000,
  },
  'forge.upgradedCount': {
    group: 'Forge',
    label: 'Forge Slots Upgraded (count)',
    desc:  'Number of forge slots with any upgrade (ForgeLV > 0). Each slot gives a permanent account bonus.',
    dataKey: 'ForgeLV',
    valueType: 'count',
    maxHint: 20,
  },

  // ── ANVIL (extended) ─────────────────────────────────────────────────────
  'anvil.unspentPoints': {
    group: 'Anvil',
    label: 'Anvil Unspent Points (total across chars)',
    desc:  'Sum of unspent production points across all characters (AnvilPAstats_{i}[1]). High values = points waiting to be spent on capacity or speed.',
    dataKey: 'AnvilPAstats_0…11',
    valueType: 'sum',
    maxHint: 100000,
  },

  // ── POST OFFICE (extended) ───────────────────────────────────────────────
  'postOffice.boxLevel': {
    group: 'Post Office',
    label: 'Specific PO Box Level (max across chars)',
    desc:  'Level of a specific Post Office box (POu_{i}[boxIndex]), taking the max across all characters. Param = box index (0–23). Box names: 0=Civil War Box, 3=Unwanted Stats, etc.',
    dataKey: 'POu_0…POu_11',
    valueType: 'max',
    paramHint: 'boxIndex (0–23)',
    maxHint: 400,
  },

  // ── ACHIEVEMENTS (extended) ──────────────────────────────────────────────
  'achievements.hasAchievement': {
    group: 'Achievements',
    label: 'Has Specific Achievement (bool)',
    desc:  'Returns 1 if the achievement at the given index is completed (AchieveReg[index] > 0). Param = achievement index (integer). Use with tier type "has_item" or "unlocked".',
    dataKey: 'AchieveReg',
    valueType: 'bool',
    paramHint: 'achievementIndex (integer)',
  },

  // ── VIALS (extended) ─────────────────────────────────────────────────────
  'vials.level': {
    group: 'Alchemy',
    label: 'Specific Vial Level',
    desc:  'Level of a specific alchemy vial (CauldronInfo vials dict, key = index string). Param = vial index (0–83). Use to track important vials like Pickle Jar (index 20).',
    dataKey: 'CauldronInfo[4 or 5]',
    valueType: 'max',
    paramHint: 'vialIndex (0–83)',
    maxHint: 13,
  },
  'vials.isMaxed': {
    group: 'Alchemy',
    label: 'Specific Vial — Is Maxed? (bool)',
    desc:  'Returns 1 if the vial at the given index is at max level (13). Param = vial index (0–83). Use with tier type "has_item" or "unlocked".',
    dataKey: 'CauldronInfo[4 or 5]',
    valueType: 'bool',
    paramHint: 'vialIndex (0–83)',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  BATCH META — all extractors from coverage expansion batches
  // ═══════════════════════════════════════════════════════════════════════════

  // ── ACCOUNT & META ───────────────────────────────────────────────────────
  'account.ageDays':             { group: 'Account', label: 'Account Age (days)', desc: 'Days since account was created (accountCreateTime). Measures account maturity.', dataKey: 'accountCreateTime', valueType: 'count', maxHint: 3000 },
  'account.saveFreshnessDays':   { group: 'Account', label: 'Save Freshness (days ago)', desc: 'Days since the save was last updated (lastUpdated outer key). 0 = today. High values = stale save.', dataKey: 'lastUpdated', valueType: 'count', maxHint: 365 },
  'account.gameVersion':         { group: 'Account', label: 'Game Version', desc: 'Current game version from serverVars.GameVERSION.', dataKey: 'serverVars.GameVERSION', valueType: 'count', maxHint: 300 },
  'account.eventActive':         { group: 'Account', label: 'Event Active (bool)', desc: 'Returns 1 if a game event is currently active (serverVars.EventActive).', dataKey: 'serverVars.EventActive', valueType: 'bool' },
  'account.extraCharSlots':      { group: 'Account', label: 'Extra Character Slots (MTX)', desc: 'Number of extra character slots purchased via MTX (CYCharSlotsMTX).', dataKey: 'CYCharSlotsMTX', valueType: 'count', maxHint: 4 },
  'account.worldTeleports':      { group: 'Account', label: 'World Teleport Charges', desc: 'Remaining world teleport charges (CYWorldTeleports).', dataKey: 'CYWorldTeleports', valueType: 'count', maxHint: 100 },
  'account.hintsCompleted':      { group: 'Account', label: 'Hints/Tutorials Completed', desc: 'Tutorial hints completed per world batch (HintStatus entries > 0).', dataKey: 'HintStatus', valueType: 'count', maxHint: 50 },

  // ── TOURNAMENT ───────────────────────────────────────────────────────────
  'tournament.dataPresent':      { group: 'Account', label: 'Tournament Data Present (bool)', desc: 'Returns 1 if tournament data object exists in the save.', dataKey: 'tournament', valueType: 'bool' },

  // ── SERVER VARS ──────────────────────────────────────────────────────────
  'arcade.activeBonuses':        { group: 'Arcade', label: 'Arcade Active Bonuses (server)', desc: 'Count of active arcade bonuses from serverVars.ArcadeBonuses.', dataKey: 'serverVars.ArcadeBonuses', valueType: 'count', maxHint: 20 },
  'lab.chipRepoAvailable':       { group: 'Lab', label: 'Lab Chip Repo Available', desc: 'Number of chips available in the weekly ChipRepo (serverVars.ChipRepo).', dataKey: 'serverVars.ChipRepo', valueType: 'count', maxHint: 30 },
  'killroy.swapActive':          { group: 'Killroy', label: 'Killroy Swap Active (bool)', desc: 'Returns 1 if Killroy swap is active (serverVars.KillroySwap).', dataKey: 'serverVars.KillroySwap', valueType: 'bool' },
  'companions.currentSeason':    { group: 'Companions', label: 'Companion Season/Batch', desc: 'Current companion batch/season number (serverVars.CompBatch).', dataKey: 'serverVars.CompBatch', valueType: 'count', maxHint: 20 },

  // ── BUNDLES & BONUSES ────────────────────────────────────────────────────
  'bundles.totalPurchased':      { group: 'Gem Shop', label: 'Bundles Purchased (total)', desc: 'Total bun_* flags with value 1 in save data. Each represents a purchased bundle.', dataKey: 'bun_*', valueType: 'count', maxHint: 20 },
  'bonuses.activeCount':         { group: 'Account', label: 'Bonus Flags Active', desc: 'Count of active bon_*/bin_* account bonus flags.', dataKey: 'bon_*, bin_*', valueType: 'count', maxHint: 15 },

  // ── GEM SHOP (extended) ──────────────────────────────────────────────────
  'gemShop.slotsPurchased':      { group: 'Gem Shop', label: 'Gem Shop Slots Purchased', desc: 'Number of gem shop slots with purchases > 0 (GemItemsPurchased[300]).', dataKey: 'GemItemsPurchased', valueType: 'count', maxHint: 300 },
  'gemShop.totalSpent':          { group: 'Gem Shop', label: 'Gem Shop Total Spent', desc: 'Sum of all gem shop purchases (GemItemsPurchased). Higher = more invested.', dataKey: 'GemItemsPurchased', valueType: 'sum', maxHint: 10000 },
  'gemShop.autoLoot':            { group: 'Gem Shop', label: 'Auto Loot Active (bool)', desc: 'Returns 1 if AutoLoot is active (serverVars.AutoLoot).', dataKey: 'serverVars.AutoLoot', valueType: 'bool' },
  'gemShop.packsBought':         { group: 'Gem Shop', label: 'Gem Packs Bought', desc: 'Number of gem packs purchased (GemsPacksPurchased entries > 0).', dataKey: 'GemsPacksPurchased', valueType: 'count', maxHint: 20 },
  'gemShop.serverGems':          { group: 'Gem Shop', label: 'Server Gem Balance', desc: 'Current server-side gem balance (ServerGems).', dataKey: 'ServerGems', valueType: 'count', maxHint: 100000 },
  'gemShop.totalGemsReceived':   { group: 'Gem Shop', label: 'Total Gems Received (server)', desc: 'Total gems received from server (ServerGemsReceived).', dataKey: 'ServerGemsReceived', valueType: 'count', maxHint: 500000 },
  'gemShop.perCharPurchases':    { group: 'Gem Shop', label: 'Per-Char Gem Shop Purchases', desc: 'Count of gem shop purchases for a specific character (OptL_{i}). Param = char index.', dataKey: 'OptL_{i}', valueType: 'count', paramHint: 'charIndex (0-11)', maxHint: 50 },

  // ── CY* CAVERN CURRENCIES ───────────────────────────────────────────────
  'caverns.deliveriesCompleted': { group: 'Caverns', label: 'Deliveries Completed', desc: 'Cavern delivery box completions (CYDeliveryBoxComplete).', dataKey: 'CYDeliveryBoxComplete', valueType: 'count', maxHint: 500 },
  'caverns.deliveryStreak':      { group: 'Caverns', label: 'Delivery Box Streak', desc: 'Current cavern delivery streak (CYDeliveryBoxStreak).', dataKey: 'CYDeliveryBoxStreak', valueType: 'count', maxHint: 100 },
  'caverns.afkDoubles':          { group: 'Caverns', label: 'AFK Doubles', desc: 'Cavern AFK doubles accumulated (CYAFKdoubles).', dataKey: 'CYAFKdoubles', valueType: 'count', maxHint: 1000 },
  'caverns.anvilTabs':           { group: 'Caverns', label: 'Cavern Anvil Tabs Owned', desc: 'Cavern-specific anvil tabs (CYAnvilTabsOwned).', dataKey: 'CYAnvilTabsOwned', valueType: 'count', maxHint: 8 },
  'caverns.gems':                { group: 'Caverns', label: 'Cavern Gems', desc: 'Cavern-specific gem count (CYGems).', dataKey: 'CYGems', valueType: 'count', maxHint: 100000 },
  'caverns.goldPens':            { group: 'Caverns', label: 'Gold Pens', desc: 'Gold pen count for talent books (CYGoldPens).', dataKey: 'CYGoldPens', valueType: 'count', maxHint: 500 },
  'caverns.silverPens':          { group: 'Caverns', label: 'Silver Pens', desc: 'Silver pen count (CYSilverPens).', dataKey: 'CYSilverPens', valueType: 'count', maxHint: 500 },
  'caverns.obolFragments':       { group: 'Caverns', label: 'Obol Fragments', desc: 'Obol fragment count from caverns (CYObolFragments).', dataKey: 'CYObolFragments', valueType: 'count', maxHint: 1000 },
  'caverns.colosseumTickets':    { group: 'Caverns', label: 'Colosseum Tickets', desc: 'Current colosseum ticket count (CYColosseumTickets).', dataKey: 'CYColosseumTickets', valueType: 'count', maxHint: 100 },
  'caverns.npcProgress':         { group: 'Caverns', label: 'Cavern NPC Progress', desc: 'Number of cavern NPCs with progress (CYNPC entries ≠ 0 or -1).', dataKey: 'CYNPC', valueType: 'count', maxHint: 20 },
  'caverns.motherlodeCompleted': { group: 'Caverns', label: 'Motherlode Entries', desc: 'Active entries in the Motherlode sub-system (Holes[6]).', dataKey: 'Holes[6]', valueType: 'count', maxHint: 12 },
  'caverns.wellLevel':           { group: 'Caverns', label: 'The Well Level', desc: 'Max level in the Well sub-system (Holes[5]).', dataKey: 'Holes[5]', valueType: 'max', maxHint: 100 },
  'caverns.harpLevel':           { group: 'Caverns', label: 'Harp Level', desc: 'Max level in the Harp sub-system (Holes[8]).', dataKey: 'Holes[8]', valueType: 'max', maxHint: 100 },
  'caverns.lampTotal':           { group: 'Caverns', label: 'Lamp Currency Total', desc: 'Sum of lamp currency in Holes[9] sub-array.', dataKey: 'Holes[9]', valueType: 'sum', maxHint: 1000000 },
  'caverns.denProgress':         { group: 'Caverns', label: 'Den Progress', desc: 'Active entries in the Den sub-system (Holes[10]).', dataKey: 'Holes[10]', valueType: 'count', maxHint: 60 },
  'caverns.grottoLevel':         { group: 'Caverns', label: 'Grotto Level', desc: 'Max level in the Grotto sub-system (Holes[11]).', dataKey: 'Holes[11]', valueType: 'max', maxHint: 100 },
  'caverns.evertreeLevel':       { group: 'Caverns', label: 'Evertree Level', desc: 'Max level in the Evertree sub-system (Holes[12]).', dataKey: 'Holes[12]', valueType: 'max', maxHint: 100 },
  'caverns.gambitDone':          { group: 'Caverns', label: 'Gambit Entries Done', desc: 'Number of Gambit completion flags set to 1 (Holes[13]).', dataKey: 'Holes[13]', valueType: 'count', maxHint: 150 },
  'caverns.templeLevel':         { group: 'Caverns', label: 'Temple/Hive Level', desc: 'Max level in the Temple/Hive sub-system (Holes[14]).', dataKey: 'Holes[14]', valueType: 'max', maxHint: 50 },
  'caverns.bellLevel':           { group: 'Caverns', label: 'Bell/Monument Level', desc: 'Max level in the Bell sub-system (Holes[7]).', dataKey: 'Holes[7]', valueType: 'max', maxHint: 100 },
  'caverns.schematicLevels':     { group: 'Caverns', label: 'Schematic Total Levels', desc: 'Sum of schematic/building levels (Holes[4]).', dataKey: 'Holes[4]', valueType: 'sum', maxHint: 200 },
  'caverns.villagerXPTotal':     { group: 'Caverns', label: 'Villager XP Total', desc: 'Sum of cumulative villager XP (Holes[2]).', dataKey: 'Holes[2]', valueType: 'sum', maxHint: 100000 },

  // ── TALENTS ──────────────────────────────────────────────────────────────
  'talents.maxedBooks':          { group: 'Talents', label: 'Maxed Talent Books', desc: 'Number of talent books at max level across all characters (SM_{i} entries at cap).', dataKey: 'SM_0…11', valueType: 'count', maxHint: 200 },
  'talents.totalBookLevels':     { group: 'Talents', label: 'Total Talent Book Levels', desc: 'Sum of all talent book max levels across all characters.', dataKey: 'SM_0…11', valueType: 'sum', maxHint: 50000 },
  'talents.uniqueTalentsLeveled':{ group: 'Talents', label: 'Unique Talents Leveled', desc: 'Number of distinct talent IDs with any level across all characters.', dataKey: 'SL_0…11', valueType: 'count', maxHint: 300 },
  'talents.unspentPerTier':      { group: 'Talents', label: 'Unspent Talent Points (sum)', desc: 'Total unspent talent points across all tiers (CYTalentPoints array sum).', dataKey: 'CYTalentPoints', valueType: 'sum', maxHint: 1000 },
  'talents.charsWithLoadout':    { group: 'Talents', label: 'Chars With Talent Loadout', desc: 'Number of characters that have a talent bar loadout configured (AttackLoadout_{i}).', dataKey: 'AttackLoadout_0…11', valueType: 'count', maxHint: 12 },

  // ── STAT ALLOCATION ──────────────────────────────────────────────────────
  'characters.totalStatPoints':  { group: 'Characters', label: 'Total Stat Points Allocated', desc: 'Sum of STR+AGI+WIS+LUK across all characters (PVStatList_{i}).', dataKey: 'PVStatList_0…11', valueType: 'sum', maxHint: 50000 },
  'characters.avgStatAlloc':     { group: 'Characters', label: 'Avg Stat Points Per Char', desc: 'Average total stat allocation per character.', dataKey: 'PVStatList_0…11', valueType: 'avg', maxHint: 5000 },

  // ── CHARACTER AFK/MAP ────────────────────────────────────────────────────
  'characters.avgAFKHours':      { group: 'Characters', label: 'Avg AFK Hours', desc: 'Average hours since last played across all characters.', dataKey: 'PTimeAway_0…11', valueType: 'avg', maxHint: 720 },
  'characters.maxAFKHours':      { group: 'Characters', label: 'Max AFK Hours (any char)', desc: 'Longest AFK time among all characters (hours).', dataKey: 'PTimeAway_0…11', valueType: 'max', maxHint: 2000 },
  'characters.revivesAvailable': { group: 'Characters', label: 'Insta-Revives Available', desc: 'Total insta-revive charges across all characters.', dataKey: 'PVInstaRevives_0…11', valueType: 'sum', maxHint: 100 },
  'characters.totalLevels':      { group: 'Characters', label: 'Total Character Levels', desc: 'Sum of all character base levels.', dataKey: 'Lv0_0…11[0]', valueType: 'sum', maxHint: 4000 },
  'characters.avgLevel':         { group: 'Characters', label: 'Average Character Level', desc: 'Average base level across all characters.', dataKey: 'Lv0_0…11[0]', valueType: 'avg', maxHint: 400 },
  'characters.moneyTotal':       { group: 'Characters', label: 'Total Money (all chars)', desc: 'Sum of Money_{i} across all characters.', dataKey: 'Money_0…11', valueType: 'sum', maxHint: 999999999 },
  'characters.gemsOwned':        { group: 'Characters', label: 'Gems Owned', desc: 'Current gem count (GemsOwned).', dataKey: 'GemsOwned', valueType: 'count', maxHint: 100000 },
  'characters.classUnlocked':    { group: 'Characters', label: 'Has Class Unlocked (bool)', desc: 'Returns 1 if any character has the given class ID. Param = class ID number.', dataKey: 'CharacterClass_0…11', valueType: 'bool', paramHint: 'classId (number)' },
  'characters.afkInWorld':       { group: 'Characters', label: 'Chars AFK in World', desc: 'Count of characters AFK in a specific world. Param = world prefix (e.g. "w5").', dataKey: 'AFKtarget_0…11', valueType: 'count', paramHint: 'worldPrefix (e.g. "w5")', maxHint: 12 },

  // ── INVENTORY/STORAGE ────────────────────────────────────────────────────
  'storage.chestSlots':          { group: 'Storage', label: 'Chest Slots Used', desc: 'Number of non-empty slots in storage chest (ChestOrder entries ≠ empty).', dataKey: 'ChestOrder', valueType: 'count', maxHint: 500 },
  'storage.totalItemsStored':    { group: 'Storage', label: 'Total Items Stored', desc: 'Sum of all quantities in storage chest (ChestQuantity).', dataKey: 'ChestQuantity', valueType: 'sum', maxHint: 99999999 },
  'storage.usedPct':             { group: 'Storage', label: 'Storage Used %', desc: 'Percentage of storage slots filled (InvStorageUsed).', dataKey: 'InvStorageUsed', valueType: 'pct', maxHint: 100 },
  'inventory.bagsUsed':          { group: 'Inventory', label: 'Bags Used (all chars)', desc: 'Total bag types in use across all characters (InvBagsUsed_{i}).', dataKey: 'InvBagsUsed_0…11', valueType: 'count', maxHint: 100 },
  'inventory.avgCarryCap':       { group: 'Inventory', label: 'Avg Carry Capacity', desc: 'Average carry capacity across all characters (MaxCarryCap_{i}).', dataKey: 'MaxCarryCap_0…11', valueType: 'avg', maxHint: 100000 },
  'inventory.materialTypes':     { group: 'Inventory', label: 'Unique Material Types', desc: 'Count of distinct materials in character inventories (IMm_{i}).', dataKey: 'IMm_0…11', valueType: 'count', maxHint: 200 },

  // ── EQUIPMENT ────────────────────────────────────────────────────────────
  'equipment.uniqueItems':       { group: 'Equipment', label: 'Unique Equipped Items', desc: 'Count of distinct equipped item codenames across all characters (EquipOrder_{i}).', dataKey: 'EquipOrder_0…11', valueType: 'count', maxHint: 200 },
  'equipment.hasItem':           { group: 'Equipment', label: 'Has Item Equipped (bool)', desc: 'Returns 1 if any character has the item codename equipped. Param = item codename.', dataKey: 'EquipOrder_0…11', valueType: 'bool', paramHint: 'itemCodename (string)' },

  // ── QUESTS ───────────────────────────────────────────────────────────────
  'quests.totalCompleted':       { group: 'Quests', label: 'Quests Completed (total)', desc: 'Total completed quests across all characters (QuestComplete_{i} key count sum).', dataKey: 'QuestComplete_0…11', valueType: 'count', maxHint: 500 },
  'quests.inProgress':           { group: 'Quests', label: 'Quests In Progress', desc: 'Total in-progress quests across all characters (QuestStatus_{i} key count sum).', dataKey: 'QuestStatus_0…11', valueType: 'count', maxHint: 100 },
  'quests.npcDialogueProgress':  { group: 'Quests', label: 'NPC Dialogue Progress', desc: 'Total NPC dialogue entries with progress across all characters.', dataKey: 'NPCdialogue_0…11', valueType: 'count', maxHint: 200 },

  // ── CARDS (extended) ─────────────────────────────────────────────────────
  'cards.avgTier':               { group: 'Cards', label: 'Cards Average Tier', desc: 'Average star tier of all collected cards.', dataKey: 'Cards0', valueType: 'avg', maxHint: 7 },
  'cards.platinumCount':         { group: 'Cards', label: 'Platinum Cards', desc: 'Count of cards at Platinum tier (≥100K copies).', dataKey: 'Cards0', valueType: 'count', maxHint: 100 },
  'cards.setsCompleted':         { group: 'Cards', label: 'Card Sets Completed', desc: 'Number of card sets (world/group sets) fully completed.', dataKey: 'Cards0', valueType: 'count', maxHint: 13 },
  'cards.equippedPerChar':       { group: 'Cards', label: 'Cards Equipped Per Char (avg)', desc: 'Average non-empty card slots across characters (CardEquip_{i}).', dataKey: 'CardEquip_0…11', valueType: 'avg', maxHint: 8 },
  'cards.setsEquippedPerChar':   { group: 'Cards', label: 'Chars With Card Set', desc: 'Number of characters with a card set equipped (CSetEq_{i}).', dataKey: 'CSetEq_0…11', valueType: 'count', maxHint: 12 },
  'cards.presetsSaved':          { group: 'Cards', label: 'Card Presets Saved', desc: 'Number of characters with saved card presets (CardPreset_{i}).', dataKey: 'CardPreset_0…11', valueType: 'count', maxHint: 12 },

  // ── OBOLS (extended) ─────────────────────────────────────────────────────
  'obols.charEquippedTotal':     { group: 'Obols', label: 'Per-Char Obols Equipped', desc: 'Total non-empty obol slots across all characters (ObolEqO0_{i}).', dataKey: 'ObolEqO0_0…11', valueType: 'count', maxHint: 200 },
  'obols.platinumCount':         { group: 'Obols', label: 'Platinum Obols (count)', desc: 'Total platinum-tier obols equipped (codename contains "Platinum").', dataKey: 'ObolEqO0, ObolEqO1, ObolEqO2', valueType: 'count', maxHint: 50 },
  'obols.pinkCount':             { group: 'Obols', label: 'Pink/Dementia Obols (count)', desc: 'Total pink/dementia-tier obols equipped (codename contains "Pink").', dataKey: 'ObolEqO0, ObolEqO1, ObolEqO2', valueType: 'count', maxHint: 30 },
  'obols.totalOwned':            { group: 'Obols', label: 'Obols in Inventory', desc: 'Non-empty obol inventory slots (ObolInvOr).', dataKey: 'ObolInvOr', valueType: 'count', maxHint: 200 },
  'obols.fragments':             { group: 'Obols', label: 'Obol Fragments', desc: 'Fragment count from caverns (CYObolFragments).', dataKey: 'CYObolFragments', valueType: 'count', maxHint: 1000 },
  'obols.familyUpgradeCount':    { group: 'Obols', label: 'Family Obol Upgrades', desc: 'Number of family obol stat upgrades (ObolEqMAPz1 + ObolEqMAPz2 key counts).', dataKey: 'ObolEqMAPz1, ObolEqMAPz2', valueType: 'count', maxHint: 100 },

  // ── ALCHEMY (extended) ──────────────────────────────────────────────────
  'alchemy.cauldronUpgradeTotal':{ group: 'Alchemy', label: 'Cauldron Upgrade Total', desc: 'Sum of cauldron upgrade levels (CauldUpgLVs). Includes brew speed, new bubble, luck etc.', dataKey: 'CauldUpgLVs', valueType: 'sum', maxHint: 1000 },
  'alchemy.cauldronBubbles':     { group: 'Alchemy', label: 'Cauldron Bubbles (per cauldron)', desc: 'Bubble count for a specific cauldron. Param = cauldron index (0-3).', dataKey: 'CauldronInfo[0]', valueType: 'count', paramHint: 'cauldronIndex (0-3)', maxHint: 50 },
  'alchemy.cauldronAvgLevel':    { group: 'Alchemy', label: 'Cauldron Bubble Avg Level', desc: 'Average bubble level for a specific cauldron. Param = cauldron index (0-3).', dataKey: 'CauldronInfo[0]', valueType: 'avg', paramHint: 'cauldronIndex (0-3)', maxHint: 300 },
  'alchemy.cauldronUpgLevels':   { group: 'Alchemy', label: 'Cauldron Upgrade Levels (sum)', desc: 'Sum of all cauldron upgrade levels (CauldUpgLVs).', dataKey: 'CauldUpgLVs', valueType: 'sum', maxHint: 1000 },
  'alchemy.sigilsUnlocked':     { group: 'Alchemy', label: 'Sigils Unlocked', desc: 'Number of unlocked sigils (CauldronInfo[4] or array of sigils with value > 0).', dataKey: 'CauldronInfo', valueType: 'count', maxHint: 30 },
  'alchemy.vialsTotalLevel':     { group: 'Alchemy', label: 'Vials Total Level (sum)', desc: 'Sum of all vial levels. Tracks total investment vs vialsMaxed (just max count).', dataKey: 'CauldronInfo', valueType: 'sum', maxHint: 1000 },
  'alchemy.p2wShopBought':      { group: 'Alchemy', label: 'P2W Liquid Shop Purchases', desc: 'Count of P2W/liquid shop items purchased (CauldronP2W entries > 0).', dataKey: 'CauldronP2W', valueType: 'count', maxHint: 50 },
  'alchemy.bigBubblesSelected':  { group: 'Alchemy', label: 'Big Bubbles Selected', desc: 'Count of big bubble selections across characters (CauldronBubbles entries ≠ 0/-1).', dataKey: 'CauldronBubbles', valueType: 'count', maxHint: 50 },
  'alchemy.jobAssignments':      { group: 'Alchemy', label: 'Cauldron Job Assignments', desc: 'Number of characters assigned to cauldron jobs (CauldronJobs0 entries ≥ 0).', dataKey: 'CauldronJobs0', valueType: 'count', maxHint: 12 },

  // ── STAMPS (extended) ────────────────────────────────────────────────────
  'stamps.tabAvg':               { group: 'Stamps', label: 'Stamp Tab Average Level', desc: 'Average level of stamps in a specific tab. Param = tab index (0=Combat, 1=Skills, 2=Misc).', dataKey: 'StampLv', valueType: 'avg', paramHint: 'tabIndex (0-2)', maxHint: 300 },
  'stamps.tabMaxed':             { group: 'Stamps', label: 'Stamps Maxed in Tab', desc: 'Count of stamps at a high level (≥100) in a specific tab. Param = tab index.', dataKey: 'StampLv', valueType: 'count', paramHint: 'tabIndex (0-2)', maxHint: 100 },

  // ── POST OFFICE (extended) ──────────────────────────────────────────────
  'postOffice.avgLevel':         { group: 'Post Office', label: 'PO Box Average Level', desc: 'Average PO box level across all characters (POu_{i} non-zero entries).', dataKey: 'POu_0…11', valueType: 'avg', maxHint: 300 },
  'postOffice.boxesCapped':      { group: 'Post Office', label: 'PO Boxes at Max', desc: 'Number of PO boxes at max level across any character.', dataKey: 'POu_0…11', valueType: 'count', maxHint: 36 },
  'postOffice.deliverySlots':    { group: 'Post Office', label: 'PO Delivery Slots', desc: 'Total delivery slots across PostOfficeInfo0/1/2.', dataKey: 'PostOfficeInfo0-2', valueType: 'count', maxHint: 100 },

  // ── FORGE (extended) ─────────────────────────────────────────────────────
  'forge.barsForged':            { group: 'Forge', label: 'Forge Bars Forged', desc: 'Count of forge slots with queued items (ForgeItemOrder non-empty entries).', dataKey: 'ForgeItemOrder', valueType: 'count', maxHint: 20 },
  'forge.queuedItems':           { group: 'Forge', label: 'Forge Queued Items', desc: 'Number of items currently queued in forge (ForgeItemOrder non-empty).', dataKey: 'ForgeItemOrder', valueType: 'count', maxHint: 20 },
  'forge.slotProgress':          { group: 'Forge', label: 'Forge Slots in Progress', desc: 'Number of forge slots with active progress (ForgeIntProg > 0).', dataKey: 'ForgeIntProg', valueType: 'count', maxHint: 20 },

  // ── ARCADE (extended) ────────────────────────────────────────────────────
  'arcade.unclaimedProgress':    { group: 'Arcade', label: 'Arcade Unclaimed Items', desc: 'Count of unclaimed arcade progress entries (ArcUnclaim keys).', dataKey: 'ArcUnclaim', valueType: 'count', maxHint: 50 },

  // ── MAPS ─────────────────────────────────────────────────────────────────
  'maps.bonusesUnlocked':        { group: 'Account', label: 'Map Bonuses Unlocked', desc: 'Number of map bonus flags set (MapBon[327] entries > 0). Tracks world exploration.', dataKey: 'MapBon', valueType: 'count', maxHint: 327 },

  // ── PRINTER (extended) ──────────────────────────────────────────────────
  'printer.slotsActive':         { group: 'Printer', label: '3D Printer Active Slots', desc: 'Number of active printer slots (Print entries with samples).', dataKey: 'Print', valueType: 'count', maxHint: 50 },
  'printer.samplesCollected':    { group: 'Printer', label: '3D Printer Samples', desc: 'Total distinct samples collected across all printer slots.', dataKey: 'Print', valueType: 'count', maxHint: 200 },
  'printer.filtersConfigured':   { group: 'Printer', label: 'Printer Filters Set', desc: 'Number of configured printer filter settings (PrinterXtra entries).', dataKey: 'PrinterXtra', valueType: 'count', maxHint: 50 },

  // ── SAILING (extended) ──────────────────────────────────────────────────
  'sailing.boatCount':           { group: 'Sailing', label: 'Boats Owned', desc: 'Number of sailing boats with any level (Boats array entries > 0).', dataKey: 'Boats', valueType: 'count', maxHint: 15 },
  'sailing.boatMaxLevel':        { group: 'Sailing', label: 'Boat Max Level', desc: 'Highest level of any sailing boat.', dataKey: 'Boats', valueType: 'max', maxHint: 100 },
  'sailing.captainCount':        { group: 'Sailing', label: 'Captains Owned', desc: 'Number of sailing captains with any data.', dataKey: 'Captains', valueType: 'count', maxHint: 15 },
  'sailing.captainMaxLevel':     { group: 'Sailing', label: 'Captain Max Level', desc: 'Highest level of any sailing captain.', dataKey: 'Captains', valueType: 'max', maxHint: 100 },
  'sailing.artifactLevels':      { group: 'Sailing', label: 'Artifact Total Levels', desc: 'Sum of all artifact levels (Sailing[3]).', dataKey: 'Sailing[3]', valueType: 'sum', maxHint: 200 },
  'sailing.flagsPlaced':         { group: 'Sailing', label: 'Flags Placed', desc: 'Number of sailing flags placed on maps (FlagP entries ≠ -1).', dataKey: 'FlagP', valueType: 'count', maxHint: 24 },
  'sailing.flagUpgrades':        { group: 'Sailing', label: 'Flag Upgrades', desc: 'Number of unlocked flag upgrade slots (FlagU entries ≠ -11).', dataKey: 'FlagU', valueType: 'count', maxHint: 252 },
  'sailing.chestsValue':         { group: 'Sailing', label: 'Sailing Chests Value', desc: 'Total value from sailing chests (SailChests sum).', dataKey: 'SailChests', valueType: 'sum', maxHint: 1000000 },

  // ── PETS ─────────────────────────────────────────────────────────────────
  'pets.totalOwned':             { group: 'Pets', label: 'Pets Owned (total)', desc: 'Total distinct pets in collection (Pets array entries ≠ 0/-1).', dataKey: 'Pets', valueType: 'count', maxHint: 150 },
  'pets.highestTier':            { group: 'Pets', label: 'Pet Highest Tier', desc: 'Highest tier/level value in the pet collection.', dataKey: 'Pets', valueType: 'max', maxHint: 20 },

  // ── TERRITORY ────────────────────────────────────────────────────────────
  'territory.activeSlots':       { group: 'Territory', label: 'Territory Active Slots', desc: 'Number of active territory slots with progress (Territory array).', dataKey: 'Territory', valueType: 'count', maxHint: 14 },
  'territory.spiceRateTotal':    { group: 'Territory', label: 'Territory Spice Rate Total', desc: 'Sum of all territory progress/spice values.', dataKey: 'Territory', valueType: 'sum', maxHint: 1000000 },

  // ── FISHING (extended) ──────────────────────────────────────────────────
  'fishing.toolkitOwned':        { group: 'Fishing', label: 'Fishing Toolkit Items', desc: 'Number of fishing toolkit items owned (FamValFishingToolkitOwned entries > 0).', dataKey: 'FamValFishingToolkitOwned', valueType: 'count', maxHint: 20 },
  'fishing.toolsEquipped':       { group: 'Fishing', label: 'Fishing Tools Equipped', desc: 'Total fishing tools equipped across all characters (PVFishingToolkit_{i}).', dataKey: 'PVFishingToolkit_0…11', valueType: 'count', maxHint: 50 },

  // ── COSMETIC (extended) ─────────────────────────────────────────────────
  'cosmetic.backgroundsUnlocked':{ group: 'Cosmetic', label: 'Backgrounds Unlocked', desc: 'Number of unlocked backgrounds (BGunlocked entries === 1).', dataKey: 'BGunlocked', valueType: 'count', maxHint: 50 },
  'cosmetic.selectedBackground': { group: 'Cosmetic', label: 'Selected Background Index', desc: 'Currently selected background index (BGsel).', dataKey: 'BGsel', valueType: 'count', maxHint: 50 },

  // ── SHOPS ────────────────────────────────────────────────────────────────
  'shops.totalStock':            { group: 'Account', label: 'Shop Stock Entries', desc: 'Number of shop stock entries with value > 0 (ShopStock).', dataKey: 'ShopStock', valueType: 'count', maxHint: 200 },

  // ── COOKING (extended) ──────────────────────────────────────────────────
  'cooking.avgMealLevel':        { group: 'Cooking', label: 'Average Meal Level', desc: 'Average level of all discovered meals.', dataKey: 'Meals', valueType: 'avg', maxHint: 30 },
  'cooking.totalMealLevels':     { group: 'Cooking', label: 'Total Meal Levels', desc: 'Sum of all meal levels.', dataKey: 'Meals', valueType: 'sum', maxHint: 2000 },
  'cooking.kitchenSpeed':        { group: 'Cooking', label: 'Kitchen Speed (sum)', desc: 'Sum of kitchen speed values across all tables (Cooking).', dataKey: 'Cooking', valueType: 'sum', maxHint: 100000 },
  'cooking.mealsAbove':          { group: 'Cooking', label: 'Meals Above Level (count)', desc: 'Number of meals above a given level. Param = level threshold.', dataKey: 'Meals', valueType: 'count', paramHint: 'minLevel (number)', maxHint: 67 },
  'cooking.spiceTotal':          { group: 'Cooking', label: 'Spice Total', desc: 'Sum of spice data values (Ribbon).', dataKey: 'Ribbon', valueType: 'sum', maxHint: 1000000 },

  // ── LAB (extended) ──────────────────────────────────────────────────────
  'lab.jewelsActive':            { group: 'Lab', label: 'Lab Jewels Active', desc: 'Count of lab jewels active (Lab nested, checking jewel sub-arrays).', dataKey: 'Lab', valueType: 'count', maxHint: 30 },
  'lab.connectionsActive':       { group: 'Lab', label: 'Lab Connections Active', desc: 'Count of active lab connections (Lab nested connection data).', dataKey: 'Lab', valueType: 'count', maxHint: 50 },
  'lab.chipsUniqueOwned':        { group: 'Lab', label: 'Unique Lab Chips Owned', desc: 'Count of distinct chip types equipped across all characters.', dataKey: 'Lab', valueType: 'count', maxHint: 30 },

  // ── BREEDING (extended) ─────────────────────────────────────────────────
  'breeding.totalUpgradeLevels': { group: 'Breeding', label: 'Breeding Upgrade Levels', desc: 'Sum of all breeding upgrade/territory data values (Breeding sub-arrays).', dataKey: 'Breeding', valueType: 'sum', maxHint: 10000 },
  'breeding.petsStored':         { group: 'Breeding', label: 'Pets Stored', desc: 'Number of stored pets with data (PetsStored entries with codename).', dataKey: 'PetsStored', valueType: 'count', maxHint: 200 },
  'breeding.shinyTotal':         { group: 'Breeding', label: 'Shiny Pets Total', desc: 'Count of shiny pets in PetsStored (checking shiny flag).', dataKey: 'PetsStored', valueType: 'count', maxHint: 50 },
  'breeding.totalPetPower':      { group: 'Breeding', label: 'Total Pet Power', desc: 'Sum of all pet power values from PetsStored.', dataKey: 'PetsStored', valueType: 'sum', maxHint: 10000000 },
  'breeding.eggSlots':           { group: 'Breeding', label: 'Egg Slots Used', desc: 'Number of active egg incubation slots.', dataKey: 'Breeding', valueType: 'count', maxHint: 12 },

  // ── SNEAKING (extended) ─────────────────────────────────────────────────
  'sneaking.highestFloor':       { group: 'Sneaking', label: 'Sneaking Highest Floor', desc: 'Highest floor/area level reached (Spelunk[1] max).', dataKey: 'Spelunk[1]', valueType: 'max', maxHint: 200 },
  'sneaking.masteryTotal':       { group: 'Sneaking', label: 'Sneaking Mastery Total', desc: 'Sum of all sneaking mastery levels (Spelunk[3]).', dataKey: 'Spelunk[3]', valueType: 'sum', maxHint: 500 },
  'sneaking.gearScore':          { group: 'Sneaking', label: 'Sneaking Gear Score', desc: 'Total sneaking equipment score from equipped gear (Spelunk[46]).', dataKey: 'Spelunk[46]', valueType: 'sum', maxHint: 10000 },
  'sneaking.jadeBonuses':        { group: 'Sneaking', label: 'Jade Bonuses', desc: 'Count of jade bonuses earned (Spelunk jade data).', dataKey: 'Spelunk', valueType: 'count', maxHint: 50 },
  'sneaking.upgradesTotal':      { group: 'Sneaking', label: 'Sneaking Upgrades Total', desc: 'Sum of all sneaking upgrade levels (Spelunk[44]+[45]).', dataKey: 'Spelunk[44-45]', valueType: 'sum', maxHint: 500 },

  // ── SUSHI (extended) ─────────────────────────────────────────────────────
  'sushi.totalDishLevels':       { group: 'Sushi', label: 'Sushi Dish Levels Total', desc: 'Sum of all dish tier/rank values (Sushi[7]).', dataKey: 'Sushi[7]', valueType: 'sum', maxHint: 500 },
  'sushi.revenueRate':           { group: 'Sushi', label: 'Sushi Revenue Rate', desc: 'Revenue rate from sushi system (Sushi[4] timing data).', dataKey: 'Sushi[4]', valueType: 'max', maxHint: 100000 },
  'sushi.ingredientSlots':       { group: 'Sushi', label: 'Ingredient Slots Active', desc: 'Non-empty ingredient slots (Sushi[0] entries ≠ -1).', dataKey: 'Sushi[0]', valueType: 'count', maxHint: 120 },
  'sushi.recipesUnlocked':       { group: 'Sushi', label: 'Recipes Unlocked', desc: 'Number of unlocked recipes/dishes (Sushi[5] entries > 0).', dataKey: 'Sushi[5]', valueType: 'count', maxHint: 100 },
  'sushi.multipliersSum':        { group: 'Sushi', label: 'Multipliers Sum', desc: 'Sum of dish multiplier values (Sushi[6]).', dataKey: 'Sushi[6]', valueType: 'sum', maxHint: 1000 },

  // ── BEES (extended) ──────────────────────────────────────────────────────
  'bees.totalBeeUpgrades':       { group: 'Bees', label: 'Bee Upgrades Total', desc: 'Sum of bee upgrade levels (Bubba[1]).', dataKey: 'Bubba[1]', valueType: 'sum', maxHint: 5000 },
  'bees.queenLevel':             { group: 'Bees', label: 'Queen Bee Level', desc: 'Queen/special bee level (Bubba[3][0]).', dataKey: 'Bubba[3]', valueType: 'max', maxHint: 500 },
  'bees.hivesActive':            { group: 'Bees', label: 'Hives Active', desc: 'Number of active hives (Bubba[4] entries > 0).', dataKey: 'Bubba[4]', valueType: 'count', maxHint: 8 },
  'bees.specialBees':            { group: 'Bees', label: 'Special Bees', desc: 'Number of special/queen bees with data (Bubba[3] entries > 0).', dataKey: 'Bubba[3]', valueType: 'count', maxHint: 6 },

  // ── BUG CATCHING (extended) ─────────────────────────────────────────────
  'bugCatching.totalCritters':   { group: 'Bug Catching', label: 'Total Critters Caught', desc: 'Sum of critter quantities across all plots (BugInfo[1]).', dataKey: 'BugInfo[1]', valueType: 'sum', maxHint: 1000000 },

  // ── ARCANE (extended) ────────────────────────────────────────────────────
  'arcane.maxNodeLevel':         { group: 'Arcane', label: 'Arcane Max Node Level', desc: 'Highest individual node level (Arcane[0..56] max).', dataKey: 'Arcane', valueType: 'max', maxHint: 500 },
  'arcane.unlockedNodes':        { group: 'Arcane', label: 'Arcane Unlocked Nodes', desc: 'Total arcane nodes with value ≥ 1 (Arcane[0..56]).', dataKey: 'Arcane', valueType: 'count', maxHint: 57 },

  // ── GAMING (extended) ────────────────────────────────────────────────────
  'gaming.evolutionsCompleted':  { group: 'Gaming', label: 'Gaming Evolutions Done', desc: 'Number of gaming evolutions completed (Gaming data).', dataKey: 'Gaming', valueType: 'count', maxHint: 20 },
  'gaming.sproutTypes':          { group: 'Gaming', label: 'Sprout Types Grown', desc: 'Distinct sprout types grown (GamingSprout entries > 0).', dataKey: 'GamingSprout', valueType: 'count', maxHint: 30 },
  'gaming.nuggetLevel':          { group: 'Gaming', label: 'Nugget Level', desc: 'Gaming nugget upgrade level.', dataKey: 'Gaming', valueType: 'max', maxHint: 100 },
  'gaming.importsUnlocked':      { group: 'Gaming', label: 'Imports Unlocked', desc: 'Number of gaming imports unlocked.', dataKey: 'Gaming', valueType: 'count', maxHint: 20 },

  // ── SUMMONING (extended) ─────────────────────────────────────────────────
  'summoning.winsTotal':         { group: 'Summoning', label: 'Summoning Wins Total', desc: 'Total wins across all summoning arenas (Summon[3] sum).', dataKey: 'Summon[3]', valueType: 'sum', maxHint: 1000000 },
  'summoning.essenceTotal':      { group: 'Summoning', label: 'Essence Total (all colors)', desc: 'Sum of all essence amounts across colors (Summon[2]).', dataKey: 'Summon[2]', valueType: 'sum', maxHint: 1000000 },
  'summoning.familiarsOwned':    { group: 'Summoning', label: 'Familiars Owned', desc: 'Number of familiar entries with codenames (Summon[1] non-empty entries).', dataKey: 'Summon[1]', valueType: 'count', maxHint: 112 },
  'summoning.arenasBeat':        { group: 'Summoning', label: 'Arenas Beat', desc: 'Number of summoning arenas with progress (Summon[3] entries > 0).', dataKey: 'Summon[3]', valueType: 'count', maxHint: 9 },

  // ── FARMING (extended) ──────────────────────────────────────────────────
  'farming.plotsUnlocked':       { group: 'Farming', label: 'Farm Plots Unlocked', desc: 'Number of farming plots with a crop planted (FarmPlot non-empty entries).', dataKey: 'FarmPlot', valueType: 'count', maxHint: 36 },
  'farming.cropMasteryTotal':    { group: 'Farming', label: 'Crop Mastery Total', desc: 'Sum of crop mastery values (FarmCrop object values[1]).', dataKey: 'FarmCrop', valueType: 'sum', maxHint: 5000 },
  'farming.cropRankAvg':         { group: 'Farming', label: 'Average Crop Rank', desc: 'Average rank across all farm ranks (FarmRank).', dataKey: 'FarmRank', valueType: 'avg', maxHint: 100 },
  'farming.ogUpgrades':          { group: 'Farming', label: 'OG Farming Upgrades', desc: 'Count of farming upgrades with level > 0 (FarmUpg non-zero entries).', dataKey: 'FarmUpg', valueType: 'count', maxHint: 100 },

  // ── DIVINITY (extended) ─────────────────────────────────────────────────
  'divinity.linksActive':        { group: 'Divinity', label: 'Divinity Links Active', desc: 'Number of active divinity links across characters.', dataKey: 'Divinity', valueType: 'count', maxHint: 12 },
  'divinity.totalPoints':        { group: 'Divinity', label: 'Divinity Total Points', desc: 'Sum of all divinity offering points.', dataKey: 'Divinity', valueType: 'sum', maxHint: 100000 },
  'divinity.highestGodLevel':    { group: 'Divinity', label: 'Highest God Level', desc: 'Max god blessing level (Divinity god data).', dataKey: 'Divinity', valueType: 'max', maxHint: 200 },

  // ── DEATHNOTE (extended) ────────────────────────────────────────────────
  'deathnote.goldSkullCount':    { group: 'Death Note', label: 'Gold Skulls (count)', desc: 'Monster entries with enough kills for Gold skull tier.', dataKey: 'KLA_0…11', valueType: 'count', maxHint: 200 },
  'deathnote.emeraldSkullCount': { group: 'Death Note', label: 'Emerald Skulls (count)', desc: 'Monster entries with enough kills for Emerald skull tier.', dataKey: 'KLA_0…11', valueType: 'count', maxHint: 100 },
  'deathnote.worldSkulls':       { group: 'Death Note', label: 'World Skull Count', desc: 'Skull count for a specific world. Param = world number (1-7).', dataKey: 'KLA_0…11', valueType: 'count', paramHint: 'worldNumber (1-7)', maxHint: 100 },

  // ── COLOSSEUM (extended) ────────────────────────────────────────────────
  'colosseum.bestScore':         { group: 'Colosseum', label: 'Best Colosseum Score', desc: 'Highest colosseum score across all worlds (FamValColosseumHighscores).', dataKey: 'FamValColosseumHighscores', valueType: 'max', maxHint: 1000000 },
  'colosseum.totalHighscores':   { group: 'Colosseum', label: 'Total Colosseum Highscores', desc: 'Sum of all colosseum highscores across worlds.', dataKey: 'FamValColosseumHighscores', valueType: 'sum', maxHint: 5000000 },
  'colosseum.worldsCompleted':   { group: 'Colosseum', label: 'Colosseum Worlds Completed', desc: 'Number of worlds with any colosseum score.', dataKey: 'FamValColosseumHighscores', valueType: 'count', maxHint: 7 },

  // ── STAR SIGNS (extended) ───────────────────────────────────────────────
  'starSigns.equippedPerChar':   { group: 'Star Signs', label: 'Star Signs Equipped (avg)', desc: 'Average star signs equipped per character (PVtStarSign_{i}).', dataKey: 'PVtStarSign_0…11', valueType: 'avg', maxHint: 10 },

  // ── PRAYERS (extended) ──────────────────────────────────────────────────
  'prayers.equippedPerChar':     { group: 'Prayers', label: 'Prayers Equipped (avg)', desc: 'Average prayers equipped per character (Prayers_{i}).', dataKey: 'Prayers_0…11', valueType: 'avg', maxHint: 6 },
  'prayers.maxLevel':            { group: 'Prayers', label: 'Prayer Max Level', desc: 'Highest prayer level (PrayOwned max).', dataKey: 'PrayOwned', valueType: 'max', maxHint: 100 },

  // ── SHRINES (extended) ──────────────────────────────────────────────────
  'shrines.maxLevel':            { group: 'Shrines', label: 'Shrine Max Level', desc: 'Highest shrine level.', dataKey: 'Shrine', valueType: 'max', maxHint: 100 },

  // ── SALT LICK (extended) ────────────────────────────────────────────────
  'saltLick.maxLevel':           { group: 'Salt Lick', label: 'Salt Lick Max Level', desc: 'Highest single salt lick upgrade level.', dataKey: 'SaltLick', valueType: 'max', maxHint: 100 },
  'saltLick.slotsActive':       { group: 'Salt Lick', label: 'Salt Lick Slots Active', desc: 'Number of salt lick slots with level > 0.', dataKey: 'SaltLick', valueType: 'count', maxHint: 20 },

  // ── GRIMOIRE (extended) ─────────────────────────────────────────────────
  'grimoire.avgLevel':           { group: 'Grimoire', label: 'Grimoire Average Level', desc: 'Average level of all grimoire upgrades with level > 0.', dataKey: 'Grimoire', valueType: 'avg', maxHint: 100 },

  // ── COMPASS (extended) ──────────────────────────────────────────────────
  'compass.maxLevel':            { group: 'Compass', label: 'Compass Max Level', desc: 'Highest compass upgrade level.', dataKey: 'Compass', valueType: 'max', maxHint: 100 },

  // ── ACHIEVEMENTS (extended) ─────────────────────────────────────────────
  'achievements.total':          { group: 'Achievements', label: 'Total Achievement Count', desc: 'Total achievement slots in AchieveReg.', dataKey: 'AchieveReg', valueType: 'count', maxHint: 300 },
  'achievements.steamCompleted': { group: 'Achievements', label: 'Steam Achievements Done', desc: 'Number of Steam achievements completed (SteamAchieve entries ≠ -1).', dataKey: 'SteamAchieve', valueType: 'count', maxHint: 100 },

  // ── EQUINOX (extended) ──────────────────────────────────────────────────
  'equinox.totalUpgrades':       { group: 'Equinox', label: 'Equinox Cloud Upgrade Total', desc: 'Sum of equinox dream bonus values (Dream array sum).', dataKey: 'Dream', valueType: 'sum', maxHint: 200 },
  'equinox.cloudsCompleted':     { group: 'Equinox', label: 'Equinox Clouds Completed', desc: 'Number of equinox cloud tiers fully completed.', dataKey: 'Dream', valueType: 'count', maxHint: 30 },

  // ── RIFT (extended) ──────────────────────────────────────────────────────
  'rift.totalLevel':             { group: 'Rift', label: 'Rift Total Level', desc: 'Sum of all rift milestone levels.', dataKey: 'Rift', valueType: 'sum', maxHint: 200 },
  'rift.highestBonus':           { group: 'Rift', label: 'Rift Highest Bonus', desc: 'Highest single rift bonus value.', dataKey: 'Rift', valueType: 'max', maxHint: 50 },
  'rift.bonusCount':             { group: 'Rift', label: 'Rift Bonus Count', desc: 'Total distinct rift bonuses > 0.', dataKey: 'Rift', valueType: 'count', maxHint: 40 },

  // ── TESSERACT (extended) ────────────────────────────────────────────────
  'tesseract.totalLevels':       { group: 'Tesseract', label: 'Tesseract Total Levels', desc: 'Sum of all tesseract levels (Tess array).', dataKey: 'Tess', valueType: 'sum', maxHint: 500 },
  'tesseract.maxLevel':          { group: 'Tesseract', label: 'Tesseract Max Level', desc: 'Highest tesseract level.', dataKey: 'Tess', valueType: 'max', maxHint: 100 },

  // ── DUNGEON (extended) ──────────────────────────────────────────────────
  'dungeon.flurboTotal':         { group: 'Dungeon', label: 'Flurbos Total', desc: 'Total flurbos earned from dungeons (DungUpg[1] sum).', dataKey: 'DungUpg[1]', valueType: 'sum', maxHint: 100000 },
  'dungeon.rngItemsFound':       { group: 'Dungeon', label: 'Dungeon RNG Items Found', desc: 'Number of RNG items found in dungeons (DungUpg[0]).', dataKey: 'DungUpg[0]', valueType: 'count', maxHint: 30 },
  'dungeon.flurboShopBought':    { group: 'Dungeon', label: 'Flurbo Shop Purchases', desc: 'Number of flurbo shop items purchased (DungUpg[2] entries > 0).', dataKey: 'DungUpg[2]', valueType: 'count', maxHint: 30 },

  // ── REFINERY (extended) ─────────────────────────────────────────────────
  'refinery.saltStorage':        { group: 'Refinery', label: 'Salt Storage Total', desc: 'Sum of stored salt quantities across all types.', dataKey: 'Refinery', valueType: 'sum', maxHint: 1000000 },

  // ── ATOMS (extended) ────────────────────────────────────────────────────
  'atoms.atomLevel':             { group: 'Atoms', label: 'Specific Atom Level', desc: 'Level of a specific atom collider upgrade. Param = atom index.', dataKey: 'Atoms', valueType: 'max', paramHint: 'atomIndex (number)', maxHint: 50 },

  // ── CHIPS (extended) ────────────────────────────────────────────────────
  'chips.totalEquipped':         { group: 'Lab', label: 'Chips Total Equipped', desc: 'Total lab chips equipped across all characters.', dataKey: 'Lab', valueType: 'count', maxHint: 100 },
  'chips.uniqueOwned':           { group: 'Lab', label: 'Unique Chip Types Owned', desc: 'Number of distinct lab chip types equipped.', dataKey: 'Lab', valueType: 'count', maxHint: 30 },

  // ── CONSTRUCTION (extended) ─────────────────────────────────────────────
  'construction.cogSlots':       { group: 'Construction', label: 'Cog Slots Used', desc: 'Number of active cog data entries (CogO).', dataKey: 'CogO', valueType: 'count', maxHint: 50 },
  'construction.flagPlaced':     { group: 'Construction', label: 'Construction Flag Placed', desc: 'Whether a construction flag is placed.', dataKey: 'Tower', valueType: 'bool' },
  'construction.totalBuildingExp':{ group: 'Construction', label: 'Total Building EXP', desc: 'Sum of building EXP values (Tower[62-92]).', dataKey: 'Tower[62-92]', valueType: 'sum', maxHint: 1000000 },

  // ── COGS ─────────────────────────────────────────────────────────────────
  'cogs.placed':                 { group: 'Construction', label: 'Cogs Placed', desc: 'Number of active cogs placed in the cog builder (CogO entries).', dataKey: 'CogO', valueType: 'count', maxHint: 30 },
  'cogs.totalLevels':            { group: 'Construction', label: 'Cog Total Levels', desc: 'Sum of all cog modifier levels (CogM).', dataKey: 'CogM', valueType: 'sum', maxHint: 1000 },

  // ── COMPANIONS ──────────────────────────────────────────────────────────
  'companions.owned':            { group: 'Companions', label: 'Companions Owned', desc: 'Number of companions owned (companion.a entries).', dataKey: 'companion.a', valueType: 'count', maxHint: 10 },
  'companions.totalLevel':       { group: 'Companions', label: 'Companion Total Level', desc: 'Sum of companion levels.', dataKey: 'companion', valueType: 'sum', maxHint: 100 },
  'companions.linkedCount':      { group: 'Companions', label: 'Companions Linked', desc: 'Number of characters with a companion linked.', dataKey: 'companion.l', valueType: 'count', maxHint: 12 },

  // ── GUILD ────────────────────────────────────────────────────────────────
  'guild.gp':                    { group: 'Guild', label: 'Guild GP', desc: 'Guild Points total (guildData or Guild array value).', dataKey: 'guildData / Guild', valueType: 'count', maxHint: 1000000 },
  'guild.bonusesUnlocked':       { group: 'Guild', label: 'Guild Bonuses Unlocked', desc: 'Number of guild bonuses with level > 0.', dataKey: 'Guild', valueType: 'count', maxHint: 30 },
  'guild.memberCount':           { group: 'Guild', label: 'Guild Members', desc: 'Number of guild members.', dataKey: 'Guild', valueType: 'count', maxHint: 50 },

  // ── KILLROY (extended) ──────────────────────────────────────────────────
  'killroy.bestWave':            { group: 'Killroy', label: 'Killroy Best Wave', desc: 'Highest Killroy wave reached (KRbest max value).', dataKey: 'KRbest', valueType: 'max', maxHint: 500 },
  'killroy.worldsCompleted':     { group: 'Killroy', label: 'Killroy Worlds Done', desc: 'Number of world entries with Killroy data.', dataKey: 'KRbest', valueType: 'count', maxHint: 7 },

  // ── WEEKLY BOSS ──────────────────────────────────────────────────────────
  'weeklyBoss.totalCleared':     { group: 'Bosses', label: 'Weekly Bosses Cleared', desc: 'Total weekly boss completions (WeeklyBoss data entries > 0).', dataKey: 'WeeklyBoss', valueType: 'count', maxHint: 50 },

  // ── BOSSES ──────────────────────────────────────────────────────────────
  'bosses.keysTotal':            { group: 'Bosses', label: 'Boss Keys Total', desc: 'Total boss keys across all worlds (CYKeysAll sum).', dataKey: 'CYKeysAll', valueType: 'sum', maxHint: 500 },
  'bosses.bestScores':           { group: 'Bosses', label: 'Boss Best Scores Sum', desc: 'Sum of best scores across all bosses (BossInfo).', dataKey: 'BossInfo', valueType: 'sum', maxHint: 1000000 },

  // ── MINIGAMES ────────────────────────────────────────────────────────────
  'minigames.bestTotal':         { group: 'Minigames', label: 'Minigame Best Total', desc: 'Sum of minigame highscores (FamValMinigameHiscores).', dataKey: 'FamValMinigameHiscores', valueType: 'sum', maxHint: 100000 },
  'minigames.gamesPlayed':       { group: 'Minigames', label: 'Minigames Played', desc: 'Total minigame plays across all characters (PVMinigamePlays_{i}).', dataKey: 'PVMinigamePlays_0…11', valueType: 'sum', maxHint: 10000 },

  // ── JARS ─────────────────────────────────────────────────────────────────
  'jars.collected':              { group: 'Jars', label: 'Jars Collected', desc: 'Number of non-empty jar entries (Jars array).', dataKey: 'Jars', valueType: 'count', maxHint: 120 },
  'jars.totalValue':             { group: 'Jars', label: 'Jars Total Value', desc: 'Sum of jar values (Jars array value fields).', dataKey: 'Jars', valueType: 'sum', maxHint: 1000000 },

  // ── TRAPS ────────────────────────────────────────────────────────────────
  'traps.activeCount':           { group: 'Traps', label: 'Active Traps', desc: 'Number of active traps across all characters (PldTraps_{i}).', dataKey: 'PldTraps_0…11', valueType: 'count', maxHint: 50 },
  'traps.highestCritterTier':    { group: 'Traps', label: 'Highest Critter Tier', desc: 'Highest critter tier being trapped.', dataKey: 'PldTraps_0…11', valueType: 'max', maxHint: 10 },

  // ── WORSHIP ──────────────────────────────────────────────────────────────
  'worship.totalEXP':            { group: 'Worship', label: 'Worship Total EXP', desc: 'Sum of worship EXP across all totems (TotemInfo[2]).', dataKey: 'TotemInfo[2]', valueType: 'sum', maxHint: 1000000 },
  'worship.chargesPerChar':      { group: 'Worship', label: 'Worship Charges (avg per char)', desc: 'Average worship charges per character.', dataKey: 'TotemInfo', valueType: 'avg', maxHint: 1000 },

  // ── VAULT ────────────────────────────────────────────────────────────────
  'vault.totalLevels':           { group: 'Vault', label: 'Vault Total Levels', desc: 'Sum of upgrade vault levels (UpgVault).', dataKey: 'UpgVault', valueType: 'sum', maxHint: 200 },
  'vault.maxLevel':              { group: 'Vault', label: 'Vault Max Level', desc: 'Highest vault upgrade level.', dataKey: 'UpgVault', valueType: 'max', maxHint: 50 },

  // ── TASKS ────────────────────────────────────────────────────────────────
  'tasks.totalTiersCompleted':   { group: 'Tasks', label: 'Task Tiers Completed', desc: 'Sum of task tier completions (TaskZZ1).', dataKey: 'TaskZZ1', valueType: 'sum', maxHint: 500 },

  // ── SLAB ─────────────────────────────────────────────────────────────────
  'slab.pctObtained':            { group: 'Slab', label: 'Slab % Obtained', desc: 'Percentage of slab entries obtained out of maximum (Cards1 vs max items).', dataKey: 'Cards1', valueType: 'pct', maxHint: 100 },

  // ── LIBRARY ──────────────────────────────────────────────────────────────
  'library.booksUpgraded':       { group: 'Research', label: 'Library Books Upgraded', desc: 'Number of library books with any upgrade (Research arr non-zero entries).', dataKey: 'Research', valueType: 'count', maxHint: 14 },

  // ── SKILLS ───────────────────────────────────────────────────────────────
  'skills.avgLevel':             { group: 'Skills', label: 'Skill Average Level', desc: 'Average level of a specific skill across all characters. Param = skill index (see SKILL_INDICES).', dataKey: 'Lv0_0…11', valueType: 'avg', paramHint: 'skillIndex (0=Combat, 1=Mining, ...)', maxHint: 200 },
  'skills.maxLevel':             { group: 'Skills', label: 'Skill Max Level', desc: 'Highest level of a specific skill across all characters. Param = skill index.', dataKey: 'Lv0_0…11', valueType: 'max', paramHint: 'skillIndex (0=Combat, 1=Mining, ...)', maxHint: 400 },
  'skills.totalAcrossChars':     { group: 'Skills', label: 'Skill Total (all chars)', desc: 'Sum of a specific skill level across all characters. Param = skill index.', dataKey: 'Lv0_0…11', valueType: 'sum', paramHint: 'skillIndex (0=Combat, 1=Mining, ...)', maxHint: 3000 },

  // ── BRIBES (extended) ────────────────────────────────────────────────────
  'bribes.pctPurchased':         { group: 'Bribes', label: 'Bribes % Purchased', desc: 'Percentage of available bribes purchased.', dataKey: 'BribeStatus', valueType: 'pct', maxHint: 100 },
  'bribes.setBought':            { group: 'Bribes', label: 'Bribe Set Complete', desc: 'Returns 1 if all 5 bribes in the given set are purchased, 0 otherwise. Param = set index (0-based).', dataKey: 'BribeStatus', valueType: 'bool', paramHint: 'setIndex (0–8)', maxHint: 1 },
  'bribes.setProgress':          { group: 'Bribes', label: 'Bribe Set Progress', desc: 'Number of bribes bought in the given set (0–5). Param = set index (0-based).', dataKey: 'BribeStatus', valueType: 'count', paramHint: 'setIndex (0–8)', maxHint: 5 },

  // ── OPTLACC / ACCOUNT STATE (new) ──────────────────────────────────────
  'account.arenaEntriesUsed':    { group: 'Account', label: 'Arena Entries Used', desc: 'Arena entries used this week (OptLacc[88]).', dataKey: 'OptLacc[88]', valueType: 'count', maxHint: 20 },
  'account.bossAttemptsUsed':    { group: 'Account', label: 'Boss Attempts Used', desc: 'Weekly boss attempts consumed (OptLacc[185]).', dataKey: 'OptLacc[185]', valueType: 'count', maxHint: 10 },
  'account.killroyWeeklyProgress':{ group: 'Account', label: 'Killroy Weekly Progress', desc: 'Killroy weekly progress counter (OptLacc[113]).', dataKey: 'OptLacc[113]', valueType: 'count', maxHint: 50 },
  'account.spiceClaimsUsed':     { group: 'Account', label: 'Spice Claims Used', desc: 'Spice claims consumed this reset (OptLacc[100]).', dataKey: 'OptLacc[100]', valueType: 'count', maxHint: 20 },
  'account.eventSpinsLeft':      { group: 'Account', label: 'Event Spins Left', desc: 'Remaining event wheel spins (OptLacc[325]).', dataKey: 'OptLacc[325]', valueType: 'count', maxHint: 10 },
  'account.emperorTriesUsed':    { group: 'Account', label: 'Emperor Tries Used', desc: 'Emperor attempt counter (OptLacc[370]).', dataKey: 'OptLacc[370]', valueType: 'count', maxHint: 10 },
  'account.dustTotal':           { group: 'Account', label: 'Dust Total', desc: 'Total dust accumulated (OptLacc[362]).', dataKey: 'OptLacc[362]', valueType: 'sum', maxHint: 100000 },
  'account.dustByType':          { group: 'Account', label: 'Dust by Type', desc: 'Dust amount for a specific type. Param = index 0-4 (maps to OptLacc[357-361]).', dataKey: 'OptLacc[357-361]', valueType: 'count', paramHint: 'dustTypeIndex (0-4)', maxHint: 50000 },
  'account.bonesTotal':          { group: 'Account', label: 'Bones Total', desc: 'Total bones accumulated (OptLacc[329]).', dataKey: 'OptLacc[329]', valueType: 'sum', maxHint: 100000 },
  'account.bonesByType':         { group: 'Account', label: 'Bones by Type', desc: 'Bones amount for a specific type. Param = index 0-3 (maps to OptLacc[330-333]).', dataKey: 'OptLacc[330-333]', valueType: 'count', paramHint: 'bonesTypeIndex (0-3)', maxHint: 50000 },
  'account.tachyonTotal':        { group: 'Account', label: 'Tachyon Total', desc: 'Total tachyon particles (OptLacc[394]).', dataKey: 'OptLacc[394]', valueType: 'sum', maxHint: 100000 },
  'account.tachyonByType':       { group: 'Account', label: 'Tachyon by Type', desc: 'Tachyon for a specific type. Param = index 0-5 (maps to OptLacc[388-393]).', dataKey: 'OptLacc[388-393]', valueType: 'count', paramHint: 'tachTypeIndex (0-5)', maxHint: 50000 },
  'account.jeweledCogs':         { group: 'Account', label: 'Jeweled Cogs', desc: 'Current jeweled cog count (OptLacc[414]).', dataKey: 'OptLacc[414]', valueType: 'count', maxHint: 100 },
  'account.smithySetsUnlocked':  { group: 'Account', label: 'Smithy Sets Unlocked', desc: 'Number of smithy equipment sets unlocked (OptLacc[379] comma-list).', dataKey: 'OptLacc[379]', valueType: 'count', maxHint: 20 },
  'account.fishingIslandsUnlocked':{ group: 'Account', label: 'Fishing Islands Unlocked', desc: 'Number of fishing islands unlocked (OptLacc[169] letter count).', dataKey: 'OptLacc[169]', valueType: 'count', maxHint: 10 },
  'account.prismaPoints':        { group: 'Account', label: 'Prisma Points', desc: 'Prisma bubble points accumulated (OptLacc[383]).', dataKey: 'OptLacc[383]', valueType: 'count', maxHint: 1000 },
  'account.dungeonCredits':      { group: 'Account', label: 'Dungeon Credits', desc: 'Total dungeon credits (sum of OptLacc[71]+[72]).', dataKey: 'OptLacc[71-72]', valueType: 'sum', maxHint: 10000 },
  'account.dungeonFlurbos':      { group: 'Account', label: 'Dungeon Flurbos', desc: 'Flurbo currency (OptLacc[73]).', dataKey: 'OptLacc[73]', valueType: 'count', maxHint: 5000 },

  // ── KEYCHAINS (new) ─────────────────────────────────────────────────────
  'keychains.totalOwned':        { group: 'Keychains', label: 'Keychains Owned', desc: 'Number of keychains owned (EquipmentKeychain0-24 non-blank entries).', dataKey: 'EquipmentKeychain0-24', valueType: 'count', maxHint: 25 },
  'keychains.highestTier':       { group: 'Keychains', label: 'Highest Keychain Tier', desc: 'Highest tier keychain owned (T1/T2/T3 from codename).', dataKey: 'EquipmentKeychain0-24', valueType: 'max', maxHint: 3 },

  // ── ALCHEMY (enriched) ─────────────────────────────────────────────────
  'alchemy.liquidTotal':         { group: 'Alchemy', label: 'Liquid Total', desc: 'Sum of all liquid amounts (CauldronInfo[6]).', dataKey: 'CauldronInfo[6]', valueType: 'sum', maxHint: 100000 },

  // ── EQUINOX (new) ──────────────────────────────────────────────────────
  'equinox.barFill':             { group: 'Equinox', label: 'Equinox Bar Fill', desc: 'Current equinox bar fill progress (Dream[0]).', dataKey: 'Dream[0]', valueType: 'count', maxHint: 1000 },
  'equinox.upgradesUnlocked':    { group: 'Equinox', label: 'Equinox Upgrades Unlocked', desc: 'Number of equinox upgrades with level > 0 (Dream[2+]).', dataKey: 'Dream[2+]', valueType: 'count', maxHint: 20 },
  'equinox.totalUpgradeLevel':   { group: 'Equinox', label: 'Equinox Total Upgrade Level', desc: 'Sum of all equinox upgrade levels.', dataKey: 'Dream[2+]', valueType: 'sum', maxHint: 500 },

  // ── CAVERNS (enriched) ─────────────────────────────────────────────────
  'caverns.jarGemTotal':         { group: 'Caverns', label: 'Jar Gem Total', desc: 'Sum of jar gem counts (Holes[24]).', dataKey: 'Holes[24]', valueType: 'sum', maxHint: 10000 },
  'caverns.summonDoublers':      { group: 'Caverns', label: 'Summoning Doublers', desc: 'Count of active summoning doublers (Holes[28] > 0).', dataKey: 'Holes[28]', valueType: 'count', maxHint: 20 },
  'caverns.gambitCompletion':    { group: 'Caverns', label: 'Gambit Completion %', desc: 'Percentage of gambit flags completed (Holes[13]).', dataKey: 'Holes[13]', valueType: 'pct', maxHint: 100 },
  'caverns.villagerMaxLevel':    { group: 'Caverns', label: 'Villager Max Level', desc: 'Highest villager level (Holes[0] max).', dataKey: 'Holes[0]', valueType: 'max', maxHint: 20 },

  // ── LAB (enriched) ─────────────────────────────────────────────────────
  'lab.chipCountTotal':          { group: 'Lab', label: 'Lab Chip Count', desc: 'Total number of chips installed (Lab[15] non-empty entries).', dataKey: 'Lab[15]', valueType: 'count', maxHint: 100 },

  // ── SNEAKING (enriched) ────────────────────────────────────────────────
  'sneaking.minibossKills':      { group: 'Sneaking', label: 'Miniboss Kills', desc: 'Total miniboss kills (Ninja[105]).', dataKey: 'Ninja[105]', valueType: 'count', maxHint: 10000 },

  // ── RIBBON (new) ───────────────────────────────────────────────────────
  'ribbon.totalLevel':           { group: 'Cooking', label: 'Ribbon Total Level', desc: 'Sum of ribbon/spice levels (Ribbon[0..27]).', dataKey: 'Ribbon[0-27]', valueType: 'sum', maxHint: 500 },

  // ── RIFT (enriched) ────────────────────────────────────────────────────
  'rift.currentIndex':           { group: 'Rift', label: 'Rift Current Index', desc: 'Current rift reward index (Rift[0]).', dataKey: 'Rift[0]', valueType: 'count', maxHint: 100 },

  // ── BEES (new) ─────────────────────────────────────────────────────────
  'bees.totalLevel':             { group: 'Bees', label: 'Bee Total Level', desc: 'Sum of all bee/hive levels (Bubba[1]).', dataKey: 'Bubba[1]', valueType: 'sum', maxHint: 50000 },

  // ── RESTAURANT (new) ──────────────────────────────────────────────────
  'restaurant.tablesUnlocked':   { group: 'Restaurant', label: 'Tables Unlocked', desc: 'Number of restaurant tables unlocked (Sushi[3] non -1 entries).', dataKey: 'Sushi[3]', valueType: 'count', maxHint: 15 },
  'restaurant.highestTier':      { group: 'Restaurant', label: 'Highest Dish Tier', desc: 'Highest dish tier reached (Sushi[7] max).', dataKey: 'Sushi[7]', valueType: 'max', maxHint: 10 },

  // ── CRITTERS (new) ─────────────────────────────────────────────────────
  'critters.totalCaught':        { group: 'Trapping', label: 'Total Critters Caught', desc: 'Sum of critter quantities caught across all plots (BugInfo[1]).', dataKey: 'BugInfo[1]', valueType: 'sum', maxHint: 100000 },
  'critters.plotsActive':        { group: 'Trapping', label: 'Critter Plots Active', desc: 'Number of active critter plots (BugInfo[2] entries = -10).', dataKey: 'BugInfo[2]', valueType: 'count', maxHint: 15 },

  // ── SUMMONING (enriched) ──────────────────────────────────────────────
  'summoning.familiarCount':     { group: 'Summoning', label: 'Familiars Unlocked', desc: 'Number of familiar unlock flags set (Summon[4] entries = 1).', dataKey: 'Summon[4]', valueType: 'count', maxHint: 14 },
  'summoning.arenaProgress':     { group: 'Summoning', label: 'Arenas with Progress', desc: 'Number of summoning arenas with progress > 0 (Summon[3]).', dataKey: 'Summon[3]', valueType: 'count', maxHint: 9 },
};

// ─────────────────────────────────────────────────────────────────────────────
//  Name tables for param options (mirrors idleon-review.js constants)
// ─────────────────────────────────────────────────────────────────────────────

const _STATUE_NAMES = ['Power','Mining','Feasty','Health','Speed','Kachow','Lumberbob','Thicc Skin','Oceanman','Ol Reliable','Exp Book','Anvil','Cauldron','Beholder','Bullseye','Twoshoter','Acorn','Beholder2','Snakeskin','Cog','Battleaxe','Eyepatch','Multikill','Triceratops','Key','Cobra','Alchemy','Dragon','Lobster','Seesaw','Golem','Pants'];
const _PO_BOX_NAMES = ['Civil War Memory Box','Locally Sourced Organs','Magician Starterpack','Box of Unwanted Stats','Dwarven Supplies','Blacksmith Box','Taped Up Timber','Carepack From Mum','Sealed Fishheads','Potion Package','Bug Hunting Supplies','Non Predatory Loot Box','Deaths Storage Unit','Utilitarian Capsule','Lazzzy Lootcrate','Science Spare Parts','Trapping Lockbox','Construction Container','Crate of the Creator','Chefs Essentials','Myriad Crate',"Scurvy C'arr'ate",'Box of Gosh','Gaming Lootcrate'];
const _VIAL_NAMES = ['Copper Corona','Sippy Splinters','Mushroom Soup','Spool Sprite','Barium Mixture','Dieter Drink','Skinny 0 Cal','Thumb Pow','Jungle Juice','Barley Brew','Anearful','Tea With Pea','Gold Guzzle','Ramificoction','Seawater','Tail Time','Fly In My Drink','Mimicraught','Blue Flav','Slug Slurp','Pickle Jar','Fur Refresher','Sippy Soul','Crab Juice','Void Vial','Red Malt','Ew Gross Gross','The Spanish Sahara','Poison Tincture','Etruscan Lager','Chonker Chug','Bubonic Burp','Visible Ink','Orange Malt','Snow Slurry','Slowergy Drink','Sippy Cup','Bunny Brew','40-40 Purity','Shaved Ice','Goosey Glug','Ball Pickle Jar','Capachino','Donut Drink','Long Island Tea','Spook Pint','Calcium Carbonate','Bloat Draft','Choco Milkshake','Pearl Seltzer','Krakenade','Electrolyte','Ash Agua','Maple Syrup','Hampter Drippy','Dreadnog','Dusted Drink','Oj Jooce','Oozie Ooblek','Venison Malt','Marble Mocha','Willow Sippy','Shinyfin Stew','Dreamy Drink','Ricecakorade','Ladybug Serum','Flavorgil','Greenleaf Tea','Firefly Grog','Dabar Special','Refreshment','Gibbed Drink','Ded Sap','Royale Cola','Turtle Tisane','Chapter Chug','Sippy Seaweed','Wriggle Water','Rocky Boba','Octosoda','Paper Pint','Scale On Ice','Trash Drank','Crabomayse'];
const _MEAL_NAMES = ['Turkey a la Thank','Egg','Salad','Pie','Frenk Fries','Spaghetti','Corn','Garlic Bread','Garlicless Bread','Pizza','Apple','Pancakes','Corndog','Cabbage','Potato Pea Pastry','Dango','Sourish Fish','Octoplop','Croissant','Canopy','Cannoli','Cheese','Sawdust','Eggplant','Cheesy Bread','Wild Boar','Donut','Riceball','Cauliflower','Durian Fruit','Orange','Bunt Cake','Chocolate Truffle','Leek','Fortune Cookie','Pretzel','Sea Urchin','Mashed Potato','Mutton','Wedding Cake','Eel','Whipped Cocoa','Onion','Soda','Sushi Roll','Buncha Banana','Pumpkin','Cotton Candy','Massive Fig','Head Chef Geustloaf','Kiwi Fruit','Popped Corn','Double Cherry','Ratatouey','Giant Tomato','Wrath Grapes','Sausy Sausage','Seasoned Marrow','Sticky Bun','Frazzleberry','Misterloin Steak','Large Pohayoh','Bill Jack Pepper','Burned Marshmallow','Yumi Peachring','Plumpcakes','Nyanborgir','Tempura Shrimp','Woahtermelon','Cookies','Singing Seed','Tasty Treat','Giga Chip','2nd Wedding Cake'];
const _CHIP_NAMES = ['Grounded Nanochip','Grounded Motherboard','Grounded Software','Grounded Processor','Potato Chip','Conductive Nanochip','Conductive Motherboard','Conductive Software','Conductive Processor','Chocolatey Chip','Galvanic Nanochip','Galvanic Motherboard','Galvanic Software','Galvanic Processor','Wood Chip','Silkrode Nanochip','Silkrode Motherboard','Silkrode Software','Silkrode Processor','Poker Chip','Omega Nanochip','Omega Motherboard'];
const _ARTIFACT_NAMES = ['Moai Head','Maneki Kat','Ruble Cuble','Fauxory Tusk','Gold Relic','Genie Lamp','Silver Ankh','Emerald Relic','Fun Hippoete','Arrowhead','10 AD Tablet','Ashen Urn','Amberite','Triagulon','Billcye Tri','Frost Relic','Chilled Yarn','Causticolumn','Jade Rock','Dreamcatcher','Gummy Orb','Fury Relic','Cloud Urn','Weatherbook','Giants Eye','Crystal Steak','Trilobite Rock','Opera Mask','Socrates','The True Lantern','The Onyx Lantern','The Shim Lantern','The Winz Lantern','Deathskull','Obsidian','Pointagon','Ender Pearl','Fang of the Gods','Nomenclature','Me First Dollar','Enigma Fragment'];
const _ARTIFACT_CODENAMES = ['Moai','Maneki_kat','Ruble_Cuble','Fauxory_Tusk','Gold_Relic','Genie_Lamp','Silver_Ankh','Emerald_Relic','Fun_Hippoete','Arrowhead','10_AD_Tablet','Ashen_Urn','Amberite','Triagulon','Billcye_Tri','Frost_Relic','Chilled_Yarn','Causticolumn','Jade_Rock','Dreamcatcher','Gummy_Orb','Fury_Relic','Cloud_Urn','Weatherbook','Giants_Eye','Crystal_Steak','Trilobite_Rock','Opera_Mask','Socrates','True_Lantern','Onyx_Lantern','Shim_Lantern','Winz_Lantern','Deathskull','Obsidian','Pointagon','Ender_Pearl','Fang_of_Gods','Nomenclature','First_Dollar','Enigma_Fragment'];
const _STAMP_NAMES = {
  combat: ['Sword Stamp','Heart Stamp','Mana Stamp','Tomahawk Stamp','Target Stamp','Shield Stamp','Longsword Stamp','Kapow Stamp','Fist Stamp','Battleaxe Stamp','Agile Stamp','Vitality Stamp','Book Stamp','Manamoar Stamp','Clover Stamp','Scimitar Stamp','Bullseye Stamp','Feather Stamp','Polearm Stamp','Violence Stamp','Buckler Stamp','Hermes Stamp','Sukka Foo','Arcane Stamp','Avast Yar Stamp','Steve Sword','Blover Stamp','Stat Graph Stamp','Gilded Axe Stamp','Diamond Axe Stamp','Tripleshot Stamp','Blackheart Stamp','Maxo Slappo Stamp','Sashe Sidestamp','Intellectostampo','Conjocharmo Stamp','Dementia Sword Stamp','Golden Sixes Stamp','Stat Wallstreet Stamp','Void Sword Stamp','Void Axe Stamp','Captalist Stats Stamp','Splosion Stamp','Gud EXP Stamp'],
  skills: ['Pickaxe Stamp','Hatchet Stamp','Anvil Zoomer Stamp','Lil Mining Baggy Stamp','Twin Ores Stamp','Choppin Bag Stamp','Duplogs Stamp','Matty Bag Stamp','Smart Dirt Stamp','Cool Diggy Tool Stamp','High IQ Lumber Stamp','Swag Swingy Tool Stamp','Alch Go Brrr Stamp','Brainstew Stamps','Drippy Drop Stamp','Droplots Stamp','Fishing Rod Stamp','Fishhead Stamp','Catch Net Stamp','Fly Intel Stamp','Bag o Heads Stamp','Holy Mackerel Stamp','Bugsack Stamp','Buzz Buzz Stamp','Hidey Box Stamp','Purp Froge Stamp','Spikemouth Stamp','Shiny Crab Stamp','Gear Stamp','Stample Stamp','Saw Stamp','Amplestample Stamp','SpoOoky Stamp','Flowin Stamp','Prayday Stamp','Banked Pts Stamp','Cooked Meal Stamp','Spice Stamp','Ladle Stamp','Nest Eggs Stamp','Egg Stamp','Lab Tube Stamp','Sailboat Stamp','Gamejoy Stamp','Divine Stamp','Multitool Stamp','Skelefish Stamp','Crop Evo Stamp','Sneaky Peeky Stamp','Jade Mint Stamp','Summoner Stone Stamp','White Essence Stamp','Triad Essence Stamp','Dark Triad Essence Stamp','Amber Stamp','Little Rock Stamp','Hardhat Stamp'],
  misc: ['Questin Stamp','Mason Jar Stamp','Crystallin','Arcade Ball Stamp','Gold Ball Stamp','Potion Stamp','Golden Apple Stamp','Ball Timer Stamp','Card Stamp','Forge Stamp','Vendor Stamp','Sigil Stamp','Talent I Stamp','Talent II Stamp','Talent III Stamp','Talent IV Stamp','Talent V Stamp','Talent S Stamp','Multikill Stamp','Biblio Stamp','DNA Stamp','Refinery Stamp','Atomic Stamp','Cavern Resource Stamp','Study Hall Stamp','Kruker Stamp','Corale Stamp'],
};

// ─────────────────────────────────────────────────────────────────────────────
//  getParamOptions — returns organized picker options for a given extractor
//  Returns Array<{ value: string, label: string, group: string, desc?: string }>
// ─────────────────────────────────────────────────────────────────────────────

export function getParamOptions(extId) {
  const _SKILL_NAMES = ['Combat','Mining','Smithing','Chopping','Fishing','Alchemy','Catching','Trapping','Construction','Worship','Cooking','Breeding','Laboratory','Sailing','Divinity','Gaming','Farming','Sneaking','Summoning','Spelunking'];
  const _CLASS_NAMES = {0:'Beginner',2:'Journeyman',3:'Maestro',4:'Voidwalker',5:'Infinilyte',7:'Warrior',8:'Barbarian',9:'Squire',10:'Blood Berserker',12:'Divine Knight',14:'Death Bringer',16:'Royal Guardian',19:'Archer',20:'Bowman',21:'Hunter',22:'Siege Breaker',25:'Beast Master',29:'Wind Walker',31:'Mage',32:'Wizard',33:'Shaman',34:'Elemental Sorcerer',35:'Spiritual Monk',36:'Bubonic Conjuror',40:'Arcane Cultist'};

  switch (extId) {
    case 'stamps.hasStamp':
      return [
        ..._STAMP_NAMES.combat.map((n, i) => ({ value: `0:${i}`, label: n, group: 'Combat Stamps' })),
        ..._STAMP_NAMES.skills.map((n, i) => ({ value: `1:${i}`, label: n, group: 'Skills Stamps' })),
        ..._STAMP_NAMES.misc.map((n,  i) => ({ value: `2:${i}`, label: n, group: 'Misc Stamps' })),
      ];

    case 'stamps.tabAvg':
    case 'stamps.tabMaxed':
      return [
        { value: '0', label: 'Combat Stamps', group: 'Stamp Tabs' },
        { value: '1', label: 'Skills Stamps', group: 'Stamp Tabs' },
        { value: '2', label: 'Misc Stamps',   group: 'Stamp Tabs' },
      ];

    case 'statues.statueLevel':
    case 'statues.statueGold':
      return _STATUE_NAMES.map((n, i) => ({ value: String(i), label: n, group: 'Statues' }));

    case 'postOffice.boxLevel':
      return _PO_BOX_NAMES.map((n, i) => ({ value: String(i), label: n, group: 'Post Office Boxes' }));

    case 'vials.level':
    case 'vials.isMaxed':
      return _VIAL_NAMES.map((n, i) => ({ value: String(i), label: n, group: 'Vials' }));

    case 'meals.hasMeal':
      return _MEAL_NAMES.map((n, i) => ({ value: String(i), label: n, group: 'Meals' }));

    case 'chips.hasChip':
      return _CHIP_NAMES.map(n => ({ value: n, label: n, group: 'Lab Chips' }));

    case 'artifacts.hasArtifact':
      return _ARTIFACT_CODENAMES.map((cod, i) => ({ value: cod, label: _ARTIFACT_NAMES[i] || cod, group: 'Artifacts' }));

    case 'achievements.hasAchievement':
      return Array.from({ length: 300 }, (_, i) => ({ value: String(i), label: `Achievement #${i}`, group: 'Achievements' }));

    case 'skills.avgLevel':
    case 'skills.maxLevel':
    case 'skills.totalAcrossChars':
      return _SKILL_NAMES.map((n, i) => ({ value: String(i), label: n, group: 'Skills' }));

    case 'characters.classUnlocked':
      return Object.entries(_CLASS_NAMES).map(([id, name]) => ({ value: id, label: name, group: 'Classes' }));

    case 'characters.afkInWorld':
      return Array.from({ length: 8 }, (_, i) => ({ value: `w${i + 1}`, label: `World ${i + 1}`, group: 'Worlds' }));

    case 'alchemy.cauldronBubbles':
    case 'alchemy.cauldronAvgLevel':
      return [
        { value: '0', label: 'Power Cauldron (Orange)',  group: 'Cauldrons' },
        { value: '1', label: 'Quicc Cauldron (Green)',   group: 'Cauldrons' },
        { value: '2', label: 'High-IQ Cauldron (Purple)',group: 'Cauldrons' },
        { value: '3', label: 'Kazam Cauldron (Yellow)',  group: 'Cauldrons' },
      ];

    case 'deathnote.worldSkulls':
      return Array.from({ length: 7 }, (_, i) => ({ value: String(i + 1), label: `World ${i + 1}`, group: 'Worlds' }));

    case 'atoms.atomLevel':
      return Array.from({ length: 20 }, (_, i) => ({ value: String(i), label: `Atom #${i}`, group: 'Atoms' }));

    case 'cooking.mealsAbove':
      return [5, 10, 15, 20, 25, 30].map(l => ({ value: String(l), label: `Level ${l}+`, group: 'Level Thresholds' }));

    case 'gemShop.perCharPurchases':
      return Array.from({ length: 12 }, (_, i) => ({ value: String(i), label: `Character ${i + 1}`, group: 'Characters' }));

    case 'characters.withStarSign':
      return [];

    case 'bribes.setBought':
    case 'bribes.setProgress':
      return Array.from({ length: 9 }, (_, i) => ({ value: String(i), label: `Bribe Set ${i + 1}`, group: 'Bribe Sets' }));

    case 'account.dustByType':
      return [
        { value: '0', label: 'Dust Type 1', group: 'Dust Types' },
        { value: '1', label: 'Dust Type 2', group: 'Dust Types' },
        { value: '2', label: 'Dust Type 3', group: 'Dust Types' },
        { value: '3', label: 'Dust Type 4', group: 'Dust Types' },
        { value: '4', label: 'Dust Type 5', group: 'Dust Types' },
      ];

    case 'account.bonesByType':
      return [
        { value: '0', label: 'Bones Type 1', group: 'Bone Types' },
        { value: '1', label: 'Bones Type 2', group: 'Bone Types' },
        { value: '2', label: 'Bones Type 3', group: 'Bone Types' },
        { value: '3', label: 'Bones Type 4', group: 'Bone Types' },
      ];

    case 'account.tachyonByType':
      return [
        { value: '0', label: 'Tachyon Type 1', group: 'Tachyon Types' },
        { value: '1', label: 'Tachyon Type 2', group: 'Tachyon Types' },
        { value: '2', label: 'Tachyon Type 3', group: 'Tachyon Types' },
        { value: '3', label: 'Tachyon Type 4', group: 'Tachyon Types' },
        { value: '4', label: 'Tachyon Type 5', group: 'Tachyon Types' },
        { value: '5', label: 'Tachyon Type 6', group: 'Tachyon Types' },
      ];

    default:
      return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Custom Extractor CRUD
//  Custom extractors are stored in guidance-config.json under `customExtractors`.
//  Each definition: { id, group, label, desc, dataKey, operation, filter?,
//                     arrayPath?, paramMode?, valueType, maxHint? }
// ─────────────────────────────────────────────────────────────────────────────

export function loadCustomExtractors() {
  const cfg = loadConfig(true);
  return Array.isArray(cfg.customExtractors) ? cfg.customExtractors : [];
}

export function saveCustomExtractors(defs) {
  const cfg = loadConfig(true);
  cfg.customExtractors = defs;
  saveConfig(cfg);
}

export function getCustomExtractorMeta() {
  const defs = loadCustomExtractors();
  const meta = {};
  for (const d of defs) {
    meta[d.id] = {
      group: d.group || 'Custom',
      label: d.label,
      desc: d.desc || '',
      dataKey: d.dataKey || '',
      valueType: d.valueType || 'count',
      maxHint: d.maxHint || null,
      paramHint: d.paramMode ? `param (${d.paramMode})` : undefined,
      custom: true,
    };
  }
  return meta;
}

/**
 * Evaluate a custom extractor definition against a save object.
 * Supports: count, sum, max, min, avg, pct, bool, len, value operations.
 * arrayPath: dot/bracket notation to drill into the raw data, e.g. "[4][0]" or "0.levels"
 * filter:    gt0 | gte1 | eq1 | neq0 | all  (default gt0 for count/sum)
 * paramMode: "index" | "key" — if set, `param` is used as array index or object key after arrayPath
 */
export function evaluateCustomExtractor(def, save, param) {
  const data = save.data || {};

  // Read base data key
  let raw = data[def.dataKey];
  if (raw == null) return 0;

  // Navigate arrayPath (e.g. "[4]" or "[4][0]" or "1.upgrades")
  if (def.arrayPath) {
    const parts = String(def.arrayPath).replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
    for (const part of parts) {
      if (raw == null) return 0;
      const key = /^\d+$/.test(part) ? parseInt(part, 10) : part;
      raw = Array.isArray(raw) ? raw[key] : (raw && typeof raw === 'object' ? raw[part] : null);
    }
  }

  // Apply param as sub-index/key
  if (def.paramMode && param != null) {
    if (def.paramMode === 'index') {
      const idx = parseInt(String(param), 10);
      raw = Array.isArray(raw) ? raw[idx] : (raw && typeof raw === 'object' ? Object.values(raw)[idx] : null);
    } else if (def.paramMode === 'key') {
      raw = raw && typeof raw === 'object' ? raw[String(param)] : null;
    }
  }

  if (raw == null) return 0;

  // Normalize object → array of values for operations that need it
  const toArray = (v) => {
    if (Array.isArray(v)) return v;
    if (v && typeof v === 'object') return Object.values(v);
    return [v];
  };

  const filterFn = (v) => {
    const n = typeof v === 'number' ? v : (parseFloat(v) || 0);
    switch (def.filter || 'gt0') {
      case 'gt0':   return n > 0;
      case 'gte1':  return n >= 1;
      case 'eq1':   return n === 1;
      case 'neq0':  return n !== 0;
      case 'all':   return true;
      default:      return n > 0;
    }
  };

  switch (def.operation || 'count') {
    case 'count': {
      const arr = toArray(raw);
      return arr.filter(filterFn).length;
    }
    case 'sum': {
      const arr = toArray(raw);
      return arr.reduce((s, v) => s + (typeof v === 'number' ? v : (parseFloat(v) || 0)), 0);
    }
    case 'max': {
      const arr = toArray(raw).filter(v => typeof v === 'number');
      return arr.length ? Math.max(...arr) : 0;
    }
    case 'min': {
      const arr = toArray(raw).filter(v => typeof v === 'number');
      return arr.length ? Math.min(...arr) : 0;
    }
    case 'avg': {
      const nums = toArray(raw).filter(v => typeof v === 'number' && v > 0);
      return nums.length ? Math.round((nums.reduce((s, v) => s + v, 0) / nums.length) * 10) / 10 : 0;
    }
    case 'pct': {
      const arr = toArray(raw);
      const done = arr.filter(v => typeof v === 'number' && v > 0).length;
      return arr.length ? Math.round((done / arr.length) * 100) : 0;
    }
    case 'bool':
      if (typeof raw === 'number') return raw > 0 ? 1 : 0;
      if (typeof raw === 'boolean') return raw ? 1 : 0;
      if (Array.isArray(raw)) return raw.length > 0 ? 1 : 0;
      return raw ? 1 : 0;
    case 'len':
      if (Array.isArray(raw)) return raw.length;
      if (raw && typeof raw === 'object') return Object.keys(raw).length;
      if (typeof raw === 'string') return raw.length;
      return 0;
    case 'value':
      return typeof raw === 'number' ? raw : (parseFloat(raw) || 0);
    default:
      return 0;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Dynamic extractor ID list (built-ins + custom)
// ─────────────────────────────────────────────────────────────────────────────

export function getAllExtractorIDs() {
  const custom = loadCustomExtractors();
  return [...EXTRACTOR_IDS, ...custom.map(c => c.id)];
}

export function getAllExtractorMeta() {
  return { ...EXTRACTOR_META, ...getCustomExtractorMeta() };
}

// Custom extractor IDs for use in param options fetch
export function getCustomExtractorParamOptions(id) {
  const defs = loadCustomExtractors();
  const def = defs.find(d => d.id === id);
  if (!def || !def.paramMode) return [];
  return []; // server-side: no built-in list, user defines
}

// ─────────────────────────────────────────────────────────────────────────────
//  #52: Batch evaluation — evaluate multiple saves at once
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Evaluate an array of saves concurrently and return an array of results.
 * Each entry in the input array may be an object { save, uid?, opts? }.
 */
export function evaluateGuidanceBatch(items) {
  if (!Array.isArray(items)) throw new TypeError('items must be an array');
  return items.map(item => {
    const save = item?.save ?? item;
    const opts = item?.opts ?? {};
    const uid  = item?.uid ?? null;
    try {
      const result = evaluateGuidance(save, opts);
      return { uid, ok: true, result };
    } catch (e) {
      return { uid, ok: false, error: e.message };
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  #41: Lazy meta accessor (avoid eagerly iterating the full META dict)
// ─────────────────────────────────────────────────────────────────────────────

let _metaCache = null;
export function getExtractorMeta(id) {
  if (!_metaCache) _metaCache = EXTRACTOR_META;
  return _metaCache[id] ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
//  #47: Precision-safe rounding helper
// ─────────────────────────────────────────────────────────────────────────────

export function roundPct(value, decimals = 3) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
