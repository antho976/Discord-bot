/**
 * Idleon Account Review — Analyzer Module v2
 * Parses an Idleon JSON save and produces per-system scores + recommendations.
 */

// ── Tier definitions ──
const TIERS = ['early', 'mid', 'late', 'endgame', 'ultra'];
const TIER_LABELS = { early: 'Early Game', mid: 'Mid Game', late: 'Late Game', endgame: 'Endgame', ultra: 'Ultra Endgame' };
const TIER_COLORS = { early: '#4caf50', mid: '#2196f3', late: '#ff9800', endgame: '#e91e63', ultra: '#b794f6' };

// ── Class name map (from AutoReview ClassNames) ──
const CLASS_MAP = {
  0:'Beginner',1:'Beginner',2:'Journeyman',3:'Maestro',4:'Voidwalker',5:'Infinilyte',
  7:'Warrior',8:'Barbarian',9:'Squire',10:'Blood Berserker',12:'Divine Knight',14:'Death Bringer',16:'Royal Guardian',
  19:'Archer',20:'Bowman',21:'Hunter',22:'Siege Breaker',25:'Beast Master',29:'Wind Walker',
  31:'Mage',32:'Wizard',33:'Shaman',34:'Elemental Sorcerer',35:'Spiritual Monk',36:'Bubonic Conjuror',40:'Arcane Cultist',
};

const SKILL_NAMES = [
  'Combat','Mining','Smithing','Chopping','Fishing','Alchemy',
  'Catching','Trapping','Construction','Worship','Cooking','Breeding',
  'Laboratory','Sailing','Divinity','Gaming','Farming','Sneaking','Summoning','Spelunking'
];

// ── Helpers ──
function _pk(data, key) {
  let v = data[key];
  if (v == null) return null;
  if (typeof v === 'string') try { v = JSON.parse(v); } catch { return null; }
  return v;
}
function _tierFromScore(s) { return s >= 5 ? 'ultra' : s >= 4 ? 'endgame' : s >= 3 ? 'late' : s >= 2 ? 'mid' : 'early'; }
function _fmtBig(n) { return n >= 1e6 ? n.toExponential(2) : Number(n).toLocaleString('en-US'); }

// ── Prayer max levels (some prayers aren't released yet) ──
// Index → max level. -1 means unreleased.
const PRAYER_MAX = [
  50,50,50,50,50,50,50,50,50,50, // 0-9
  50,50,50,50,50,50,50,50,50,50, // 10-19
  50,50,-1,-1,-1,-1,-1,-1,-1,-1, // 20-29: 22+ are unreleased
];

const VIAL_MAX_LEVEL = 15;

const ARMOR_SET_ORDER = [
  'COPPER_SET','IRON_SET','GOLD_SET','PLATINUM_SET','DEMENTIA_SET',
  'VOID_SET','LUSTRE_SET','AMAROK_SET','EFAUNT_SET','TROLL_SET',
  'DIABOLICAL_SET','CHIZOAR_SET','EMPEROR_SET','MAGMA_SET',
  'KATTLEKRUK_SET','SECRET_SET','MARBIGLASS_SET','GODSHARD_SET','PREHISTORIC_SET'
];

const ARMOR_SET_LABELS = {
  COPPER_SET:'Copper',IRON_SET:'Iron',GOLD_SET:'Gold',PLATINUM_SET:'Platinum',
  DEMENTIA_SET:'Dementia',VOID_SET:'Void',LUSTRE_SET:'Lustre',AMAROK_SET:'Amarok',
  EFAUNT_SET:'Efaunt',TROLL_SET:'Troll',DIABOLICAL_SET:'Diabolical',CHIZOAR_SET:'Chizoar',
  EMPEROR_SET:'Emperor',MAGMA_SET:'Magma',KATTLEKRUK_SET:'Kattlekruk',
  SECRET_SET:'Secret',MARBIGLASS_SET:'Marbiglass',GODSHARD_SET:'Godshard',PREHISTORIC_SET:'Prehistoric'
};

function detectTier(save) {
  const data = save.data || {};
  let maxWorld = 0;
  for (let i = 0; i < 12; i++) {
    const afk = data[`AFKtarget_${i}`] || '';
    const m = afk.match(/^w(\d+)/);
    if (m) maxWorld = Math.max(maxWorld, parseInt(m[1]));
  }
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

const ARMOR_SLOTS = ['Helmet', 'Shirt', 'Pants', 'Shoes', 'Pendant', 'Ring', 'Cape'];
const TOOL_SLOTS = ['Pickaxe', 'Hatchet', 'Fishing Rod', 'Bug Net', 'Trap', 'Worship Skull', 'DNA Gun'];

function parseEquipment(data, charIndex) {
  const equipOrder = data[`EquipOrder_${charIndex}`];
  if (!Array.isArray(equipOrder)) return { armor: [], tools: [] };

  const parseSlots = (arr, slotNames) => {
    if (!Array.isArray(arr)) return [];
    return arr.map((rawName, i) => {
      if (!rawName || rawName === 'Blank' || rawName === 'LockedInvSpace') return null;
      return { rawName, slot: slotNames[i] || `Slot ${i}` };
    }).filter(Boolean);
  };

  return {
    armor: parseSlots(equipOrder[0], ARMOR_SLOTS),
    tools: parseSlots(equipOrder[1], TOOL_SLOTS),
  };
}

function parseCharacters(save) {
  const data = save.data || {};
  const names = save.charNames || [];
  const chars = [];
  for (let i = 0; i < names.length; i++) {
    const lvArr = data[`Lv0_${i}`];
    const skills = Array.isArray(lvArr) ? lvArr : [];
    const cls = data[`CharacterClass_${i}`] || 0;
    const afk = data[`AFKtarget_${i}`] || '';
    const equipment = parseEquipment(data, i);
    chars.push({
      index: i, name: names[i] || `Char_${i}`,
      classId: cls, className: CLASS_MAP[cls] || `Class ${cls}`,
      level: skills[0] || 0, skills: skills.slice(0, SKILL_NAMES.length),
      afkTarget: afk, afkWorld: afk.match(/^w(\d+)/)?.[1] || '?',
      equipment,
    });
  }
  return chars;
}

// ────────────────────────────────────────────────────────────────
//  SYSTEM SCORERS
// ────────────────────────────────────────────────────────────────
const systemScorers = {

  // ═══════════ WORLD 1 ═══════════

  stamps(save) {
    const stamps = save.data?.StampLv;
    if (!Array.isArray(stamps) || !stamps.length) return { score: 0, detail: 'No data', tips: ['Unlock stamps from the vendor in W1 town'], tier: 'early' };
    const TAB = ['Combat', 'Skills', 'Misc'];
    let leveled = 0, total = 0, maxLv = 0;
    const tabInfo = [];
    for (let t = 0; t < stamps.length; t++) {
      const tab = stamps[t];
      if (!tab || typeof tab !== 'object' || Array.isArray(tab)) continue;
      const vals = Object.values(tab).filter(v => typeof v === 'number');
      const tLv = vals.filter(v => v > 0).length;
      const tZero = vals.filter(v => v === 0).length;
      const mn = tLv > 0 ? Math.min(...vals.filter(v => v > 0)) : 0;
      const mx = Math.max(0, ...vals);
      total += vals.length; leveled += tLv;
      if (mx > maxLv) maxLv = mx;
      tabInfo.push({ name: TAB[t] || `Tab${t}`, total: vals.length, leveled: tLv, zero: tZero, min: mn, max: mx });
    }
    const gilded = save.data?.StampLvM;
    let gC = 0, gT = 0;
    if (Array.isArray(gilded)) for (const t of gilded) if (t && typeof t === 'object') { const v = Object.values(t).filter(x => typeof x === 'number'); gT += v.length; gC += v.filter(x => x > 0).length; }
    const pct = total > 0 ? leveled / total : 0;
    let score = 0;
    if (pct >= .95 && maxLv >= 400 && gC > 0) score = 5;
    else if (pct >= .85 && maxLv >= 200) score = 4;
    else if (pct >= .7 && maxLv >= 100) score = 3;
    else if (pct >= .5) score = 2;
    else if (leveled > 10) score = 1;
    const tips = [];
    for (const ti of tabInfo) { if (ti.zero > 0) tips.push(`${ti.name}: ${ti.zero} stamps at lv 0`); if (ti.min > 0 && ti.min < 50) tips.push(`${ti.name}: lowest stamp lv ${ti.min} — raise above 50`); }
    if (gC > 0 && gC < gT) tips.push(`Gilding: ${gC}/${gT} gilded — gild the remaining ${gT - gC}`);
    else if (gC === 0 && score >= 3) tips.push('No gilded stamps yet — start gilding');
    if (!tips.length) tips.push('Stamps in great shape!');
    return { score, detail: `${leveled}/${total} stamps, max lv ${maxLv}${gC > 0 ? `, ${gC}/${gT} gilded` : ''}`, tips, tier: _tierFromScore(score) };
  },

  forge(save) {
    const fv = _pk(save.data, 'ForgeLV') || save.data?.ForgeLV;
    if (!Array.isArray(fv)) return { score: 0, detail: 'No data', tips: ['Start upgrading forge slots in W1'], tier: 'early' };
    const slots = fv.map((v, i) => ({ i: i + 1, v: typeof v === 'number' ? v : 0 }));
    const active = slots.filter(x => x.v > 0);
    const maxLv = active.length > 0 ? Math.max(...active.map(x => x.v)) : 0;
    const low = active.filter(x => x.v < maxLv * .5);
    let score = 0;
    if (active.length >= 8 && maxLv >= 30) score = 5;
    else if (active.length >= 6 && maxLv >= 20) score = 4;
    else if (active.length >= 4) score = 3;
    else if (active.length >= 2) score = 2;
    else if (active.length > 0) score = 1;
    const tips = [];
    if (active.length < fv.length) tips.push(`${fv.length - active.length} forge slots unused`);
    if (low.length > 0) tips.push(`Low slots: ${low.map(s => `#${s.i} (lv ${s.v})`).join(', ')} — max is ${maxLv}`);
    if (!tips.length) tips.push('Forge is solid!');
    return { score, detail: `${active.length} slots — ${active.map(s => s.v).join(', ')}`, tips, tier: _tierFromScore(score) };
  },

  anvil(save) {
    const data = save.data || {};
    const names = save.charNames || [];
    let totalProd = 0, chars = 0;
    const issueChars = [];
    for (let i = 0; i < names.length; i++) {
      let ap = _pk(data, `AnvilPA_${i}`);
      if (!Array.isArray(ap)) continue;
      chars++;
      const prod = ap.reduce((s, e) => s + (e && typeof e === 'object' ? (e['3'] || e[3] || 0) : 0), 0);
      totalProd += prod;

      // Check if anvil is full or close to full (production at capacity)
      const capacity = ap.reduce((s, e) => s + (e && typeof e === 'object' ? (e['2'] || e[2] || 0) : 0), 0);
      const stored = ap.reduce((s, e) => s + (e && typeof e === 'object' ? (e['1'] || e[1] || 0) : 0), 0);
      if (capacity > 0 && stored >= capacity * 0.9) {
        issueChars.push({ name: names[i] || `Char ${i}`, issue: 'full', pct: Math.round((stored / capacity) * 100) });
      }

      // Check for unused hammers: if ham slots exist but have 0 production
      const hammerSlots = ap.filter(e => e && typeof e === 'object');
      const unusedHammers = hammerSlots.filter(e => (e['3'] || e[3] || 0) === 0).length;
      if (unusedHammers > 0) {
        issueChars.push({ name: names[i] || `Char ${i}`, issue: 'unused_hammer', count: unusedHammers });
      }

      // Check for unspent anvil points
      const anvilPts = _pk(data, `AnvilPAstats_${i}`);
      if (Array.isArray(anvilPts)) {
        const unspent = anvilPts.filter(v => typeof v === 'number' && v > 0);
        // AnvilPAstats has speed/capacity points — if points available but not allocated, flag it
      }
    }
    if (chars === 0) return { score: 0, detail: 'No data', tips: ['Use the anvil in W1'], tier: 'early' };
    let score = chars >= 10 ? 4 : chars >= 6 ? 3 : chars >= 3 ? 2 : 1;
    if (totalProd > 1e12) score = 5;
    const tips = [];
    // Full anvil alerts
    const fullChars = issueChars.filter(c => c.issue === 'full');
    if (fullChars.length > 0) tips.push(`⚠️ Anvil full/near-full: ${fullChars.map(c => `${c.name} (${c.pct}%)`).join(', ')} — collect products!`);
    // Unused hammer alerts
    const unusedHammerChars = issueChars.filter(c => c.issue === 'unused_hammer');
    if (unusedHammerChars.length > 0) tips.push(`⚠️ Unused hammers: ${unusedHammerChars.map(c => `${c.name} (${c.count} idle)`).join(', ')} — put them to work!`);
    if (chars < names.length) tips.push(`Only ${chars}/${names.length} characters have anvil data`);
    tips.push('💡 Buy anvil points with mob materials and coins — each character needs their own');
    if (!tips.length) tips.push('Anvil production looks good!');
    return { score, detail: `${chars} characters producing`, tips, tier: _tierFromScore(score) };
  },

  bribes(save) {
    const br = _pk(save.data, 'BribeStatus') || save.data?.BribeStatus;
    if (!Array.isArray(br)) return { score: 0, detail: 'No data', tips: ['Do bribes in W1'], tier: 'early' };
    const done = br.filter(x => x > 0).length;
    let score = 0;
    if (done >= 38) score = 5; else if (done >= 30) score = 4; else if (done >= 20) score = 3; else if (done >= 10) score = 2; else if (done > 0) score = 1;
    const tips = [];
    if (done < br.length) tips.push(`${br.length - done} bribes incomplete — do them for bonuses`);
    if (!tips.length) tips.push('All bribes done!');
    return { score, detail: `${done}/${br.length} bribes`, tips, tier: _tierFromScore(score) };
  },

  statues(save) {
    const data = save.data || {};
    const names = save.charNames || [];
    let st = _pk(data, 'StuG') || _pk(data, 'StatueLevels_0');
    if (!Array.isArray(st)) return { score: 0, detail: 'No data', tips: ['Level up statues by collecting statue drops'], tier: 'early' };
    const levels = st.filter(Array.isArray).map(e => e[0] || 0);
    const total = levels.length;
    const maxLv = Math.max(0, ...levels);
    const avgLv = levels.length > 0 ? levels.reduce((a, b) => a + b, 0) / levels.length : 0;
    const gold = st.filter(Array.isArray).filter(e => (e[1] || 0) > 0).length;
    const low = levels.filter(v => v > 0 && v < avgLv * .5).length;
    const unlockedStatues = levels.filter(v => v > 0).length;

    // Check for statues in inventory/chest but not unlocked (level 0)
    const zeroLvStatues = levels.filter(v => v === 0).length;

    // Check if gold statue tool is bought (W2 shop)
    // Gold statues need GoldStatue tool from W2 — check OLA or shop data
    const ola = data.OptLacc;
    const hasGoldTool = Array.isArray(ola) && Number(ola[123] || 0) > 0; // approximate

    // Statue upgrade tiers — enough copies to upgrade
    const statueUpgradable = st.filter(Array.isArray).filter(e => {
      const lv = e[0] || 0;
      const copies = e[2] || e[3] || 0;
      // You need copies equal to level to upgrade
      return copies > 0 && lv > 0;
    }).length;

    let score = 0;
    if (avgLv >= 300 && maxLv >= 400) score = 5; else if (avgLv >= 150) score = 4; else if (avgLv >= 50) score = 3; else if (avgLv >= 10) score = 2; else score = 1;
    const tips = [];
    if (zeroLvStatues > 0) tips.push(`⚠️ ${zeroLvStatues} statues at lv 0 — unlock them by collecting statue drops`);
    if (gold < total && gold < unlockedStatues) {
      if (!hasGoldTool) tips.push(`⚠️ Buy the Gold Statue tool from W2 shop to unlock gold statues!`);
      tips.push(`${gold}/${unlockedStatues} statues golden — make them all gold for permanent bonuses`);
    }
    if (statueUpgradable > 0) tips.push(`💡 ${statueUpgradable} statues have enough copies to upgrade — level them up!`);
    if (low > 0) tips.push(`${low} statues significantly below avg (${Math.round(avgLv)}) — level them up`);
    if (maxLv < 200 && score >= 2) tips.push(`Max statue lv ${maxLv} — push higher`);
    if (!tips.length) tips.push('Statues looking great!');
    return { score, detail: `${unlockedStatues}/${total} statues, avg lv ${Math.round(avgLv)}, max ${maxLv}, ${gold} gold`, tips, tier: _tierFromScore(score) };
  },

  cards(save) {
    const data = save.data || {};
    const c0 = _pk(data, 'Cards0');
    if (!c0 || typeof c0 !== 'object') return { score: 0, detail: 'No data', tips: ['Collect cards from monsters'], tier: 'early' };
    const entries = Object.entries(c0).filter(([, v]) => typeof v === 'number');
    const count = entries.length;
    const stars = entries.map(([, v]) => v);
    const maxStar = Math.max(0, ...stars);
    const starDist = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, '6+': 0 };
    for (const s of stars) {
      if (s >= 6) starDist['6+']++;
      else if (s >= 0) starDist[s]++;
    }
    const noStar = starDist[0];
    const lowStar = starDist[1] + starDist[2];
    const midStar = starDist[3] + starDist[4];
    const highStar = starDist[5] + starDist['6+'];

    // Check passive cards (Cards1)
    const cards1 = _pk(data, 'Cards1');
    const hasPassiveCards = Array.isArray(cards1) && cards1.length > 0;
    const passiveCount = hasPassiveCards ? cards1.filter(v => v && v !== '' && v !== 'Blank').length : 0;

    // Check if using passive cards (alert if any are equipped as passive)
    const equippedPassive = _pk(data, 'CardEquip');

    // Check equinox passive cards progress
    const equinoxDream = _pk(data, 'Dream');
    const hasEquinox = Array.isArray(equinoxDream) && equinoxDream.length > 5;

    // Detect max world for card tier recommendations
    let maxWorld = 0;
    const names = save.charNames || [];
    for (let i = 0; i < names.length; i++) {
      const afk = data[`AFKtarget_${i}`] || '';
      const m = afk.match(/^w(\d+)/);
      if (m) maxWorld = Math.max(maxWorld, parseInt(m[1]));
    }

    let score = 0;
    if (count >= 200 && highStar >= 100) score = 5;
    else if (count >= 180 && highStar >= 50) score = 4;
    else if (count >= 150) score = 3;
    else if (count >= 80) score = 2;
    else if (count > 0) score = 1;

    const tips = [];
    // Passive card alerts
    if (passiveCount > 0) tips.push(`ℹ️ ${passiveCount} passive card slots available — only use skilling cards as passives`);
    if (hasEquinox) tips.push(`💡 Equinox can unlock passive card slots — check your equinox upgrades`);

    // World-based card star recommendations
    const CARD_STAR_TARGET = { 1: 1, 2: 2, 3: 3, 4: 3, 5: 4, 6: 5, 7: 6 };
    const targetStar = CARD_STAR_TARGET[maxWorld] || 1;
    const belowTarget = entries.filter(([, v]) => v < targetStar).length;
    if (belowTarget > 0 && maxWorld >= 2) tips.push(`${belowTarget} cards below ${targetStar}★ target for W${maxWorld} — farm them`);

    if (noStar > 0) tips.push(`${noStar} cards at 0 stars — farm them for at least 1 star`);
    if (lowStar > 20) tips.push(`${lowStar} cards at 1–2 stars — upgrade them`);
    if (count < 260) tips.push(`${count}/~260 cards collected — ${260 - count} missing`);
    if (!tips.length) tips.push('Card collection is strong!');
    return { score, detail: `${count} cards — ☆0: ${noStar}, ☆1-2: ${lowStar}, ☆3-4: ${midStar}, ☆5+: ${highStar}`, tips, tier: _tierFromScore(score) };
  },

  postOffice(save) {
    const data = save.data || {};
    const names = save.charNames || [];
    // POu_X = per-character post office box orders array
    // Max per index: 0-19=400, 20=100000, 21-23=800
    const PO_MAX = [];
    for (let i = 0; i < 36; i++) {
      if (i < 20) PO_MAX.push(400);
      else if (i === 20) PO_MAX.push(100000);
      else if (i <= 23) PO_MAX.push(800);
      else PO_MAX.push(0); // unknown/unused
    }

    let charsWithPO = 0, totalBoxes = 0, totalMaxed = 0, totalBelow = [];
    for (let c = 0; c < names.length; c++) {
      let pou = _pk(data, `POu_${c}`);
      if (!Array.isArray(pou)) continue;
      charsWithPO++;
      for (let b = 0; b < Math.min(pou.length, 24); b++) {
        const lv = typeof pou[b] === 'number' ? pou[b] : 0;
        const max = PO_MAX[b] || 400;
        if (max <= 0) continue;
        totalBoxes++;
        if (lv >= max) totalMaxed++;
        else if (lv > 0) totalBelow.push({ char: names[c] || `Char${c}`, box: b + 1, lv, max });
      }
    }

    if (charsWithPO === 0) {
      // Fallback to old PostOfficeInfo
      const po0 = _pk(data, 'PostOfficeInfo0') || data.PostOfficeInfo0;
      if (!Array.isArray(po0)) return { score: 0, detail: 'No data', tips: ['Use the Post Office in W1'], tier: 'early' };
      return { score: 2, detail: `${po0.length} delivery slots found`, tips: ['Upload a detailed save for per-box analysis'], tier: 'mid' };
    }

    const pctMaxed = totalBoxes > 0 ? totalMaxed / totalBoxes : 0;
    let score = 0;
    if (pctMaxed >= 0.98) score = 5;
    else if (pctMaxed >= 0.85) score = 4;
    else if (pctMaxed >= 0.6) score = 3;
    else if (pctMaxed >= 0.3) score = 2;
    else score = 1;

    const tips = [];
    const notMaxedCount = totalBoxes - totalMaxed;
    if (notMaxedCount > 0) {
      tips.push(`${notMaxedCount} PO boxes not maxed across ${charsWithPO} characters`);
      const worst = totalBelow.sort((a, b) => (a.lv / a.max) - (b.lv / b.max)).slice(0, 5);
      for (const w of worst) tips.push(`${w.char} box #${w.box}: ${w.lv}/${w.max}`);
    }
    if (!tips.length) tips.push('All Post Office boxes maxed!');

    return { score, detail: `${totalMaxed}/${totalBoxes} boxes maxed (${charsWithPO} chars)`, tips, tier: _tierFromScore(score) };
  },

  // ═══════════ WORLD 2 ═══════════

  alchemy(save) {
    const data = save.data || {};
    let cauldUpg = _pk(data, 'CauldUpgLVs') || data.CauldUpgLVs;
    const CAULDRON = ['Power', 'Speed', 'Liquid', 'Trench'];
    let parts = [], tips = [], score = 0;

    // Detect max world
    let maxWorld = 0;
    const names = save.charNames || [];
    for (let i = 0; i < names.length; i++) {
      const afk = data[`AFKtarget_${i}`] || '';
      const m = afk.match(/^w(\d+)/);
      if (m) maxWorld = Math.max(maxWorld, parseInt(m[1]));
    }

    if (Array.isArray(cauldUpg)) {
      const vals = cauldUpg.filter(v => typeof v === 'number');
      const leveled = vals.filter(v => v > 0).length;
      const maxLv = vals.length > 0 ? Math.max(...vals) : 0;
      parts.push(`${leveled}/${vals.length} upgrades, max lv ${maxLv}`);
      for (let c = 0; c < 4; c++) {
        const ch = vals.slice(c * 8, (c + 1) * 8);
        const z = ch.filter(v => v === 0).length;
        const cMin = ch.filter(v => v > 0).length > 0 ? Math.min(...ch.filter(v => v > 0)) : 0;
        const cMax = Math.max(0, ...ch);
        if (z > 0) tips.push(`${CAULDRON[c]}: ${z} upgrades at lv 0`);
        else if (cMin < 100 && cMax > 500) tips.push(`${CAULDRON[c]}: lv ${cMin}–${cMax}, balance out`);
      }
      if (leveled >= 28 && maxLv >= 1000) score = 5; else if (leveled >= 24 && maxLv >= 100) score = 4; else if (leveled >= 16) score = 3; else if (leveled >= 8) score = 2; else if (leveled > 0) score = 1;
    }

    // Check for missing bubbles (world-appropriate)
    const cb = _pk(data, 'CauldronBubbles');
    if (Array.isArray(cb)) {
      const CAULDRON_WORLD = [0, 0, 3, 5]; // Power/Speed=general, Liquid=W3+, Trench=W5+
      for (let c = 0; c < Math.min(cb.length, 4); c++) {
        if (CAULDRON_WORLD[c] > maxWorld) continue;
        const cauldron = cb[c];
        if (!cauldron || typeof cauldron !== 'object') continue;
        const bubbles = Array.isArray(cauldron) ? cauldron : Object.values(cauldron);
        const zeroBubbles = bubbles.filter(b => {
          const lv = typeof b === 'number' ? b : (b && typeof b === 'object' ? (b.level || b.lv || b[0] || 0) : 0);
          return lv === 0;
        }).length;
        if (zeroBubbles > 0) tips.push(`⚠️ ${CAULDRON[c]}: ${zeroBubbles} bubbles not unlocked — unlock them`);
      }
    }

    // Check sigils vs bubbles priority
    const p2w = _pk(data, 'CauldronP2W');
    if (Array.isArray(p2w) && Array.isArray(p2w[3])) {
      const activeSigils = p2w[3].filter(v => typeof v === 'number' && v > 0).length;
      const totalBubblesUnlocked = Array.isArray(cb) ? cb.reduce((s, c) => {
        if (!c) return s;
        const arr = Array.isArray(c) ? c : Object.values(c);
        return s + arr.filter(b => {
          const lv = typeof b === 'number' ? b : (b?.level || b?.lv || b?.[0] || 0);
          return lv > 0;
        }).length;
      }, 0) : 0;
      if (activeSigils > 0 && totalBubblesUnlocked < 60) {
        tips.push(`⚠️ Working on sigils (${activeSigils}) but only ${totalBubblesUnlocked} bubbles unlocked — prioritize unlocking all bubbles first`);
      }
    }

    if (!parts.length) return { score: 0, detail: 'No data', tips: ['Start alchemy in W2'], tier: 'early' };
    if (!tips.length) tips.push('Alchemy is strong!');
    return { score, detail: parts.join(', '), tips, tier: _tierFromScore(score) };
  },

  bubbles(save) {
    const data = save.data || {};
    const CAULDRON = ['Power', 'Speed', 'Liquid', 'Trench'];
    let totalBubbles = 0, maxed99 = 0, below99 = 0, maxLv = 0;
    const perCauldron = [];

    const cb = _pk(data, 'CauldronInfo') || _pk(data, 'CauldronBubbles');
    if (Array.isArray(cb) && cb.length > 0) {
      for (let c = 0; c < Math.min(cb.length, 4); c++) {
        const cauldron = cb[c];
        if (!cauldron || typeof cauldron !== 'object') continue;
        const bubbles = Array.isArray(cauldron) ? cauldron : Object.values(cauldron);
        let cCount = 0, cMaxed = 0, cBelow = 0;
        for (const b of bubbles) {
          const lv = typeof b === 'number' ? b : (b && typeof b === 'object' ? (b.level || b.lv || b[0] || 0) : 0);
          if (lv > 0) { cCount++; if (lv >= 99) cMaxed++; else cBelow++; if (lv > maxLv) maxLv = lv; }
        }
        totalBubbles += cCount; maxed99 += cMaxed; below99 += cBelow;
        perCauldron.push({ name: CAULDRON[c], count: cCount, maxed: cMaxed, below: cBelow });
      }
    }

    if (totalBubbles === 0) {
      const info = _pk(data, 'CauldronInfo');
      if (!Array.isArray(info)) return { score: 0, detail: 'No data', tips: ['Level up bubbles in alchemy'], tier: 'early' };
      const p2w = _pk(data, 'CauldronP2W');
      const vials = Array.isArray(p2w) ? p2w.filter(v => typeof v === 'number' && v > 0).length : 0;
      let score = info.length >= 10 ? 4 : info.length >= 6 ? 3 : 2;
      const tips = [];
      if (vials < 6) tips.push(`${vials} pay-to-win cauldron boosts — buy more`);
      tips.push('Upload a more detailed save for per-bubble analysis');
      return { score, detail: `${info.length} cauldron entries, ${vials} p2w boosts`, tips, tier: _tierFromScore(score) };
    }

    const pct99 = totalBubbles > 0 ? maxed99 / totalBubbles : 0;
    let score = 0;
    if (pct99 >= 0.95) score = 5; else if (pct99 >= 0.8) score = 4; else if (pct99 >= 0.5) score = 3; else if (totalBubbles >= 20) score = 2; else score = 1;

    // Alchemy efficiency % tier thresholds
    const EFFICIENCY_TIERS = [40, 50, 60, 70, 80, 90, 95, 99];
    const effPct = Math.round(pct99 * 100);
    const nextEffTier = EFFICIENCY_TIERS.find(t => t > effPct);

    const tips = [];
    for (const c of perCauldron) {
      if (c.below > 0) tips.push(`${c.name}: ${c.below} bubbles below lv 99 — get them to 99`);
    }
    // Efficiency tier guidance
    if (nextEffTier) tips.push(`📊 Bubble efficiency: ${effPct}% → push to ${nextEffTier}% next`);
    if (below99 === 0) tips.push('All bubbles at 99+!');
    if (!tips.length) tips.push(`${effPct}% of bubbles at lv 99+`);
    return { score, detail: `${totalBubbles} bubbles — ${maxed99} at 99+, ${below99} below 99 (${effPct}%)`, tips, tier: _tierFromScore(score) };
  },

  vials(save) {
    const data = save.data || {};
    const ci = _pk(data, 'CauldronInfo') || data.CauldronInfo;
    if (!Array.isArray(ci) || ci.length <= 4) return { score: 0, detail: 'No data', tips: ['Unlock vials in Alchemy (W2)'], tier: 'early' };
    let vialsRaw = ci[4];
    if (typeof vialsRaw === 'string') try { vialsRaw = JSON.parse(vialsRaw); } catch { return { score: 0, detail: 'Parse error', tips: ['Could not read vial data'], tier: 'early' }; }
    if (!vialsRaw || typeof vialsRaw !== 'object') return { score: 0, detail: 'No data', tips: ['Start leveling vials'], tier: 'early' };

    const entries = Object.entries(vialsRaw).filter(([, v]) => typeof v === 'number');
    const total = entries.length;
    const maxed = entries.filter(([, v]) => v >= VIAL_MAX_LEVEL).length;
    const notMaxed = entries.filter(([, v]) => v > 0 && v < VIAL_MAX_LEVEL).sort((a, b) => a[1] - b[1]);
    const zero = entries.filter(([, v]) => v === 0).length;

    let score = 0;
    const pct = total > 0 ? maxed / total : 0;
    if (pct >= 0.95) score = 5;
    else if (pct >= 0.8) score = 4;
    else if (pct >= 0.6) score = 3;
    else if (pct >= 0.3) score = 2;
    else if (maxed > 0) score = 1;

    const tips = [];
    if (notMaxed.length > 0) {
      tips.push(`${notMaxed.length} vials not maxed (lv < ${VIAL_MAX_LEVEL})`);
      const worst = notMaxed.slice(0, 5);
      tips.push(`Lowest: ${worst.map(([k, v]) => `#${k} lv ${v}`).join(', ')}`);
      // Upgrade alert: vials close to max
      const closeToMax = notMaxed.filter(([, v]) => v >= VIAL_MAX_LEVEL - 2);
      if (closeToMax.length > 0) tips.push(`⚠️ ${closeToMax.length} vials close to max (lv ${VIAL_MAX_LEVEL - 2}+) — upgrade them!`);
    }
    if (zero > 0) tips.push(`⚠️ ${zero} vials at lv 0 — discover and unlock them`);
    if (!tips.length) tips.push('All vials maxed!');

    return {
      score,
      detail: `${maxed}/${total} vials maxed (lv ${VIAL_MAX_LEVEL})`,
      tips,
      tier: _tierFromScore(score),
      breakdown: { sources: { maxed, notMaxed: notMaxed.length, zero, total } },
    };
  },

  obols(save) {
    const data = save.data || {};
    const names = save.charNames || [];
    let totalObols = 0;
    const DR_OBOL_KEYWORDS = ['Pop', 'Dice', 'ObolPop', 'ObolDice', 'DropRate', 'DR_'];
    const STAT_OBOL_KEYWORDS = ['Str', 'Agi', 'Wis', 'Luk', 'Stat'];
    const SKILLING_OBOL_KEYWORDS = ['Mining', 'Choppin', 'Fish', 'Catch', 'Trap', 'Worship'];
    const charsMissingDR = [];

    for (let i = 0; i < names.length; i++) {
      const ob = _pk(data, `ObolEqO0_${i}`);
      if (!Array.isArray(ob)) continue;
      const equipped = ob.filter(v => v && v !== 'Blank' && v !== 'None');
      totalObols += equipped.length;

      // Check if this char has DR obols (pop/dice)
      const hasDR = equipped.some(v => DR_OBOL_KEYWORDS.some(kw => String(v).toLowerCase().includes(kw.toLowerCase())));
      // Skip check if character uses main stat or skilling obols (they have a valid reason)
      const hasStatObols = equipped.some(v => STAT_OBOL_KEYWORDS.some(kw => String(v).toLowerCase().includes(kw.toLowerCase())));
      const hasSkillingObols = equipped.some(v => SKILLING_OBOL_KEYWORDS.some(kw => String(v).toLowerCase().includes(kw.toLowerCase())));

      if (!hasDR && !hasStatObols && !hasSkillingObols && equipped.length > 0) {
        charsMissingDR.push(names[i] || `Char ${i}`);
      }
    }

    // Check family obols (ObolEqO1_0)
    const familyOb = _pk(data, 'ObolEqO1_0');
    const familyCount = Array.isArray(familyOb) ? familyOb.filter(v => v && v !== 'Blank' && v !== 'None').length : 0;

    // Check obol rerolling — ObolInvOrder stores obol stats/bonuses
    // If bonuses exist but are below max, flag for rerolling
    const obolFragments = _pk(data, 'ObolFragments') || 0;

    if (totalObols === 0) return { score: 0, detail: 'No data', tips: ['Equip obols from W2'], tier: 'early' };
    let score = 0;
    if (totalObols >= 150) score = 5; else if (totalObols >= 100) score = 4; else if (totalObols >= 60) score = 3; else if (totalObols >= 20) score = 2; else score = 1;
    const tips = [];
    if (charsMissingDR.length > 0) {
      tips.push(`⚠️ No DR obols (Pop/Dice) on: ${charsMissingDR.join(', ')} — equip them for drop rate`);
    }
    if (familyCount < 8) tips.push(`Family obols: ${familyCount}/16 filled — equip more family obols`);
    if (typeof obolFragments === 'number' && obolFragments >= 100) {
      tips.push(`💡 ${_fmtBig(obolFragments)} obol fragments — reroll obols to get higher bonuses`);
    }
    tips.push('Tip: Reroll obols that are not at their highest possible bonus value');
    if (totalObols < 100) tips.push(`${totalObols} obols equipped across characters — equip more for stat boosts`);
    if (!tips.length) tips.push('Obol slots well-filled!');
    return { score, detail: `${totalObols} obols equipped, ${familyCount} family obols`, tips, tier: _tierFromScore(score) };
  },

  // ═══════════ WORLD 3 ═══════════

  prayers(save) {
    const data = save.data || {};
    let pr = _pk(data, 'PrayOwned');
    if (!Array.isArray(pr)) return { score: 0, detail: 'No data', tips: ['Unlock prayers in W3'], tier: 'early' };
    const names = save.charNames || [];

    // Prayer names for important ones
    const PRAYER_NAMES = { 0: 'Big Brain', 1: 'Skilled Dimwit', 2: 'Unending Energy', 3: 'Shiny Crab', 4: 'Zerg Rushogen', 5: 'Tachion of the Titans', 6: 'Balance of Pain', 7: 'Midas Touch', 8: 'Jawbreaker', 9: 'Royal Sampler', 10: 'Ruck Sack', 11: 'Fibers of Absence' };

    // Filter out unreleased prayers
    const released = [];
    for (let i = 0; i < pr.length; i++) {
      const maxLv = i < PRAYER_MAX.length ? PRAYER_MAX[i] : -1;
      if (maxLv < 0) continue;
      released.push({ i, lv: typeof pr[i] === 'number' ? pr[i] : 0, max: maxLv, name: PRAYER_NAMES[i] || `Prayer ${i+1}` });
    }
    const total = released.length;
    const maxed = released.filter(p => p.lv >= p.max).length;
    const notMaxed = released.filter(p => p.lv > 0 && p.lv < p.max);

    // Check which prayers each character has equipped
    const MUST_HAVE = [
      { idx: 4, name: 'Zerg Rushogen', removeAt: null },
      { idx: 1, name: 'Skilled Dimwit', removeAt: null },
      { idx: 9, name: 'Royal Sampler', removeAt: null },
    ];
    const missingPrayers = [];
    // Check printer sample rate for Royal Sampler removal logic
    const printerData = _pk(data, 'Print');
    const printerSlots = Array.isArray(printerData) ? printerData.filter(x => x !== 0 && x !== '' && x !== 'Blank').length : 0;
    const printerTotal = Array.isArray(printerData) ? printerData.length : 1;
    const printerPct = printerTotal > 0 ? (printerSlots / printerTotal) * 100 : 0;

    for (let c = 0; c < names.length; c++) {
      const eq = _pk(data, `PrayerEquipped_${c}`);
      const equipped = Array.isArray(eq) ? eq : [];
      for (const must of MUST_HAVE) {
        if (must.idx === 9 && printerPct >= 90) {
          // Royal Sampler: if >90% sample rate, should be REMOVED
          if (equipped.includes(must.idx)) {
            missingPrayers.push({ char: names[c] || `Char ${c}`, prayer: must.name, action: 'remove', reason: `printer sample rate ${Math.round(printerPct)}% — Royal Sampler no longer needed` });
          }
          continue;
        }
        if (!equipped.includes(must.idx)) {
          missingPrayers.push({ char: names[c] || `Char ${c}`, prayer: must.name, action: 'add' });
        }
      }
    }

    // Prayer upgrade priority tiers (by importance then cost)
    const UPGRADE_PRIORITY = [1, 9, 4, 11, 6, 8, 10]; // Skilled Dimwit, Royal Sampler, Zerg, Fiber, Balance, Jawbreaker, Ruck Sack
    const upgradeRecs = [];
    for (const idx of UPGRADE_PRIORITY) {
      const p = released.find(r => r.i === idx);
      if (p && p.lv < p.max) {
        upgradeRecs.push(`⬆️ ${p.name}: lv ${p.lv}/${p.max} — priority upgrade`);
      }
    }
    // Remaining non-priority prayers
    const prioritySet = new Set(UPGRADE_PRIORITY);
    const otherNotMaxed = notMaxed.filter(p => !prioritySet.has(p.i)).sort((a, b) => a.lv - b.lv);

    let score = 0;
    if (maxed >= total && total > 0) score = 5;
    else if (maxed >= total * .8) score = 4;
    else if (maxed >= total * .5) score = 3;
    else if (maxed >= 5) score = 2;
    else score = 1;

    const tips = [];
    // Missing prayer alerts
    const missingAdd = missingPrayers.filter(m => m.action === 'add');
    const missingRemove = missingPrayers.filter(m => m.action === 'remove');
    if (missingAdd.length > 0) {
      const grouped = {};
      for (const m of missingAdd) { (grouped[m.prayer] = grouped[m.prayer] || []).push(m.char); }
      for (const [prayer, chars] of Object.entries(grouped)) {
        tips.push(`⚠️ ${prayer} not equipped on: ${chars.join(', ')}`);
      }
    }
    if (missingRemove.length > 0) {
      for (const m of missingRemove) tips.push(`🔄 Remove ${m.prayer} from ${m.char} — ${m.reason}`);
    }
    // Upgrade recommendations
    if (upgradeRecs.length > 0) tips.push(...upgradeRecs.slice(0, 4));
    if (otherNotMaxed.length > 0) tips.push(`${otherNotMaxed.length} lower-priority prayers not maxed — level by cost`);
    if (maxed < total) tips.push(`${maxed}/${total} prayers maxed — ${total - maxed} to go`);
    if (!tips.length) tips.push('All released prayers maxed!');
    return { score, detail: `${maxed}/${total} released prayers maxed`, tips, tier: _tierFromScore(score) };
  },

  construction(save) {
    let tower = _pk(save.data, 'Tower');
    if (!Array.isArray(tower)) return { score: 0, detail: 'No data', tips: ['Unlock Construction in W3'], tier: 'early' };
    const indexed = tower.map((v, i) => ({ i, v: typeof v === 'number' ? v : 0 }));
    const built = indexed.filter(x => x.v > 0);
    const totalLv = built.reduce((s, x) => s + x.v, 0);
    const avgLv = built.length > 0 ? totalLv / built.length : 0;
    const maxLv = built.length > 0 ? Math.max(...built.map(b => b.v)) : 0;
    const minLv = built.length > 0 ? Math.min(...built.map(b => b.v)) : 0;
    const lowest5 = [...built].sort((a, b) => a.v - b.v).slice(0, 5);
    let score = 0;
    if (avgLv >= 100 && minLv >= 50) score = 5;
    else if (avgLv >= 60) score = 4;
    else if (avgLv >= 30) score = 3;
    else if (built.length >= 30) score = 2;
    else if (built.length > 0) score = 1;
    const tips = [];
    if (lowest5.length && lowest5[0].v < avgLv * 0.5) tips.push(`Lowest buildings: ${lowest5.map(b => `slot ${b.i} (lv ${b.v})`).join(', ')} — avg is ${Math.round(avgLv)}`);
    if (maxLv - minLv > 50) tips.push(`Level gap: ${minLv}–${maxLv} — balance your buildings`);
    if (!tips.length) tips.push('Construction solid!');
    return { score, detail: `${built.length} buildings, avg lv ${Math.round(avgLv)}, range ${minLv}–${maxLv}`, tips, tier: _tierFromScore(score) };
  },

  saltLick(save) {
    const sl = _pk(save.data, 'SaltLick');
    if (!Array.isArray(sl)) return { score: 0, detail: 'No data', tips: ['Unlock Salt Lick in W3'], tier: 'early' };
    const leveled = sl.filter(v => typeof v === 'number' && v > 0).length;
    const maxLv = Math.max(0, ...sl.filter(v => typeof v === 'number'));
    const allMaxed = sl.every(v => typeof v === 'number' && v >= 100);
    let score = 0;
    if (allMaxed || (leveled >= sl.length && maxLv >= 100)) score = 5;
    else if (leveled >= sl.length * .8 && maxLv >= 80) score = 4;
    else if (leveled >= 10) score = 3;
    else if (leveled >= 5) score = 2;
    else if (leveled > 0) score = 1;
    const tips = [];
    const low = sl.map((v, i) => ({ i, v: typeof v === 'number' ? v : 0 })).filter(x => x.v < 100).sort((a, b) => a.v - b.v);
    if (low.length > 0 && !allMaxed) tips.push(`${low.length} salt lick upgrades not maxed — lowest: ${low.slice(0,3).map(x => `#${x.i+1} lv ${x.v}`).join(', ')}`);
    if (!tips.length) tips.push('Salt Lick maxed!');
    return { score, detail: allMaxed ? `All ${sl.length} maxed!` : `${leveled}/${sl.length} leveled, max lv ${maxLv}`, tips, tier: _tierFromScore(score) };
  },

  refinery(save) {
    const rf = _pk(save.data, 'Refinery');
    if (!Array.isArray(rf)) return { score: 0, detail: 'No data', tips: ['Use the Refinery in W3'], tier: 'early' };
    // Refinery entries: each sub-array is a salt slot
    // rf[i] = [saltType, rank, progress, ...]
    const saltSlots = rf.filter(Array.isArray);
    const activeSalts = saltSlots.filter(s => s.length > 0 && (s[0] !== 0 || s[1] > 0));
    const inactiveSalts = saltSlots.filter(s => s.length === 0 || (s[0] === 0 && s[1] === 0));
    const maxRank = activeSalts.reduce((m, s) => Math.max(m, s[1] || 0), 0);
    // Check if newer salts are unlocked
    const totalSlots = rf.length;
    let score = 0;
    if (activeSalts.length >= 18 && maxRank >= 30) score = 5;
    else if (activeSalts.length >= 14) score = 4;
    else if (activeSalts.length >= 10) score = 3;
    else if (activeSalts.length >= 5) score = 2;
    else score = 1;
    const tips = [];
    if (inactiveSalts.length > 0) tips.push(`${inactiveSalts.length} salt slots inactive — work on unlocking new salts`);
    if (activeSalts.length < totalSlots) tips.push(`${activeSalts.length}/${totalSlots} salts active — newer salts not unlocked yet`);
    const lowRank = activeSalts.filter(s => (s[1] || 0) < maxRank * 0.5);
    if (lowRank.length > 0) tips.push(`${lowRank.length} salts with rank below ${Math.round(maxRank*0.5)} — level them`);
    if (!tips.length) tips.push('Refinery fully operational!');
    return { score, detail: `${activeSalts.length}/${totalSlots} salts active, max rank ${maxRank}`, tips, tier: _tierFromScore(score) };
  },

  cogs(save) {
    const cog = _pk(save.data, 'CogO');
    if (!Array.isArray(cog)) return { score: 0, detail: 'No data', tips: ['Place cogs in Construction'], tier: 'early' };
    const placed = cog.filter(x => x !== 0 && x !== 'None' && x !== '').length;
    let score = 0;
    if (placed >= 200) score = 5; else if (placed >= 150) score = 4; else if (placed >= 100) score = 3; else if (placed >= 50) score = 2; else if (placed > 0) score = 1;
    const tips = [];
    if (placed < cog.length) tips.push(`${cog.length - placed} cog slots empty — fill them for bonuses`);
    if (!tips.length) tips.push('All cogs placed!');
    return { score, detail: `${placed}/${cog.length} cogs placed`, tips, tier: _tierFromScore(score) };
  },

  atoms(save) {
    const at = _pk(save.data, 'Atoms') || save.data?.Atoms;
    if (!Array.isArray(at)) return { score: 0, detail: 'No data', tips: ['Unlock Atoms in W3 construction'], tier: 'early' };

    // Approximate max level: ~70 for endgame accounts (depends on superbit, compass, event shop)
    // We'll use the account's own max atom as a reference ceiling
    const atomLevels = at.filter(v => typeof v === 'number');
    const maxInAccount = Math.max(0, ...atomLevels);
    const refMax = Math.max(maxInAccount, 20); // at least 20 as baseline
    const leveled = atomLevels.filter(v => v > 0).length;
    const atMax = atomLevels.filter(v => v >= refMax).length;
    const zeroes = atomLevels.filter(v => v === 0).length;
    const notMaxed = atomLevels.map((v, i) => ({ i, v })).filter(x => x.v > 0 && x.v < refMax).sort((a, b) => a.v - b.v);

    let score = 0;
    if (leveled >= 15 && atMax >= 12 && zeroes <= 3) score = 5;
    else if (leveled >= 12 && atMax >= 8) score = 4;
    else if (leveled >= 8) score = 3;
    else if (leveled >= 4) score = 2;
    else if (leveled > 0) score = 1;

    const tips = [];
    if (zeroes > 0) tips.push(`${zeroes} atoms at lv 0 — level them for passive bonuses`);
    if (notMaxed.length > 0) {
      tips.push(`${notMaxed.length} atoms below max (${refMax})`);
      const worst = notMaxed.slice(0, 5);
      tips.push(`Lowest: ${worst.map(a => `#${a.i + 1} lv ${a.v}/${refMax}`).join(', ')}`);
    }
    if (!tips.length) tips.push('All atoms at max level!');

    return {
      score,
      detail: `${leveled}/${atomLevels.length} leveled, ${atMax} at max (${refMax}), ${zeroes} at 0`,
      tips,
      tier: _tierFromScore(score),
      breakdown: { sources: { leveled, atMax, zeroes, refMax, total: atomLevels.length } },
    };
  },

  printer(save) {
    const data = save.data || {};
    const pr = _pk(data, 'Print');
    if (!Array.isArray(pr)) return { score: 0, detail: 'No data', tips: ['Use the 3D Printer in W3'], tier: 'early' };
    const total = pr.length;
    const active = pr.filter(x => x !== 0 && x !== '' && x !== 'Blank').length;
    const pct = total > 0 ? (active / total) * 100 : 0;

    // Tiers (10% harder than standard autoreview thresholds)
    let score = 0;
    if (active >= 132) score = 5;      // ~110 * 1.1
    else if (active >= 88) score = 4;   // ~80 * 1.1
    else if (active >= 44) score = 3;   // ~40 * 1.1
    else if (active >= 17) score = 2;   // ~15 * 1.1
    else if (active > 0) score = 1;

    // Check for printer upgrades
    const printerUpg = _pk(data, 'PrinterUpg') || _pk(data, 'PrintUpg');

    const tips = [];
    if (active < total) tips.push(`${total - active} printer slots inactive — fill them all`);
    if (pct < 90) tips.push(`📊 Printer sample rate: ${Math.round(pct)}% — push to 90%+`);
    if (printerUpg && Array.isArray(printerUpg)) {
      const canUpgrade = printerUpg.filter(v => typeof v === 'number' && v === 0).length;
      if (canUpgrade > 0) tips.push(`⚠️ ${canUpgrade} printer upgrades available — buy them!`);
    }
    if (!tips.length) tips.push('Printer fully active!');
    return { score, detail: `${active}/${total} active samples (${Math.round(pct)}%)`, tips, tier: _tierFromScore(score) };
  },

  traps(save) {
    const data = save.data || {};
    const names = save.charNames || [];
    let totalTraps = 0, chars = 0;
    for (let i = 0; i < names.length; i++) {
      const t = _pk(data, `PldTraps_${i}`);
      if (Array.isArray(t)) { chars++; totalTraps += t.filter(Array.isArray).length; }
    }
    if (chars === 0) return { score: 0, detail: 'No data', tips: ['Set traps for Trapping skill'], tier: 'early' };
    let score = chars >= 10 ? 4 : chars >= 6 ? 3 : chars >= 3 ? 2 : 1;
    if (totalTraps >= 50) score = Math.max(score, 5);
    const tips = [];
    if (chars < names.length) tips.push(`Only ${chars}/${names.length} characters using traps`);
    if (!tips.length) tips.push('Traps well-deployed!');
    return { score, detail: `${chars} trappers, ${totalTraps} traps`, tips, tier: _tierFromScore(score) };
  },

  towerDefense(save) {
    // Tower Defense data — check for TD-related keys
    const data = save.data || {};
    // TowerDef or TD keys
    let td = _pk(data, 'TowerDef') || _pk(data, 'TD');
    if (!td) {
      // Search for tower defense keys
      const tdKeys = Object.keys(data).filter(k => /^TD|^TowerDef|^Defend/i.test(k));
      if (tdKeys.length > 0) td = _pk(data, tdKeys[0]);
    }
    if (!td) return { score: 0, detail: 'No data', tips: ['Play Tower Defense in W3'], tier: 'early' };
    let waves = 0, maxWave = 0;
    if (Array.isArray(td)) {
      waves = td.filter(v => typeof v === 'number' && v > 0).length;
      maxWave = Math.max(0, ...td.filter(v => typeof v === 'number'));
    } else if (typeof td === 'object') {
      const vals = Object.values(td).filter(v => typeof v === 'number');
      waves = vals.filter(v => v > 0).length;
      maxWave = Math.max(0, ...vals);
    }
    let score = 0;
    if (maxWave >= 100) score = 5; else if (maxWave >= 50) score = 4; else if (maxWave >= 20) score = 3; else if (maxWave >= 5) score = 2; else if (waves > 0) score = 1;
    const tips = [];
    if (maxWave < 100) tips.push(`Max wave ${maxWave} — push higher for rewards`);
    if (!tips.length) tips.push('Tower Defense well-progressed!');
    return { score, detail: `Max wave ${maxWave}`, tips, tier: _tierFromScore(score) };
  },

  dungeons(save) {
    const du = _pk(save.data, 'DungUpg');
    if (!Array.isArray(du)) return { score: 0, detail: 'No data', tips: ['Try Dungeons (unlocked W3+)'], tier: 'early' };
    // du[0] = boosted runs array
    // du[1] = dungeon credits/currency
    // du[2] = flurbo shop items (RNG items)
    // du[3] = dungeon upgrades
    // du[4] = happy hour data
    // du[5] = flurbo upgrades
    // du[6] = horn/pass data
    const flurboUpg = Array.isArray(du[5]) ? du[5] : [];
    const flurboLeveled = flurboUpg.filter(v => typeof v === 'number' && v > 0).length;
    const flurboTotal = flurboUpg.length;
    const flurboMaxed = flurboUpg.filter(v => typeof v === 'number' && v >= 100).length;

    // RNG items (du[2])
    const rngItems = Array.isArray(du[2]) ? du[2] : [];
    const rngOwned = rngItems.filter(v => v != null && v !== 0 && v !== -1).length;

    // Dungeon upgrades (du[3])
    const dungUpgArr = Array.isArray(du[3]) ? du[3] : [];
    const dungUpgLeveled = dungUpgArr.filter(v => typeof v === 'number' && v > 0).length;
    const dungUpgNotMaxed = dungUpgArr.filter(v => typeof v === 'number' && v > 0 && v < 100);

    // Horn/pass (du[6])
    const hornData = Array.isArray(du[6]) ? du[6] : [];
    const hornUnlocked = hornData.some(v => v > 0);

    let score = 0;
    if (flurboLeveled >= 8 && rngOwned >= 5 && hornUnlocked) score = 5;
    else if (flurboLeveled >= 6 && rngOwned >= 3) score = 4;
    else if (flurboLeveled >= 4) score = 3;
    else if (flurboLeveled >= 2) score = 2;
    else if (flurboLeveled > 0) score = 1;

    const tips = [];
    const notMaxedF = flurboUpg.filter(v => typeof v === 'number' && v > 0 && v < 100).length;
    if (notMaxedF > 0) tips.push(`${notMaxedF} flurbo upgrades not maxed`);
    if (flurboLeveled < flurboTotal) tips.push(`⚠️ ${flurboTotal - flurboLeveled} flurbo upgrades not bought — buy them (cheapest first)`);
    if (rngOwned < rngItems.length && rngItems.length > 0) tips.push(`⚠️ ${rngItems.length - rngOwned} RNG items could be unlocked — keep running dungeons!`);
    if (dungUpgNotMaxed.length > 0) tips.push(`⚠️ ${dungUpgNotMaxed.length} dungeon upgrades can be upgraded — level them up`);
    if (!hornUnlocked && score >= 2) tips.push('Dungeon horn not unlocked — unlock it for bonus runs');
    // Flurbo cost tiers
    if (flurboLeveled > 0 && flurboLeveled < flurboTotal) {
      tips.push('💡 Buy flurbo upgrades in cost order — cheapest first for best value');
    }
    if (!tips.length) tips.push('Dungeons fully maxed!');
    return { score, detail: `${flurboLeveled}/${flurboTotal} flurbo upg, ${rngOwned} RNG items, horn: ${hornUnlocked ? 'yes' : 'no'}`, tips, tier: _tierFromScore(score) };
  },

  // ═══════════ WORLD 4 ═══════════

  lab(save) {
    let lab = _pk(save.data, 'Lab');
    if (!Array.isArray(lab)) return { score: 0, detail: 'No data', tips: ['Unlock Lab in W4'], tier: 'early' };
    const chips = Array.isArray(lab[0]) ? lab[0] : [];
    const chipLv = chips.filter(v => typeof v === 'number' && v > 0).length;
    const maxChip = chipLv > 0 ? Math.max(...chips.filter(v => typeof v === 'number')) : 0;
    const unused = chips.filter(v => typeof v === 'number' && v === 0).length;
    const lines = []; for (let i = 1; i <= 5 && i < lab.length; i++) if (Array.isArray(lab[i]) && lab[i].length > 0) lines.push(i);
    let score = 0;
    if (maxChip >= 500 && chipLv >= 20) score = 5; else if (maxChip >= 200 && chipLv >= 15) score = 4; else if (maxChip >= 100) score = 3; else if (chipLv >= 5) score = 2; else if (chipLv > 0) score = 1;
    const tips = [];
    if (unused > 0) tips.push(`${unused} chip slots empty — fill them`);
    const low = chips.map((v, i) => ({ i, v })).filter(x => typeof x.v === 'number' && x.v > 0 && x.v < 100).sort((a, b) => a.v - b.v).slice(0, 3);
    if (low.length) tips.push(`Low chips: ${low.map(c => `#${c.i} lv ${c.v}`).join(', ')}`);
    if (lines.length < 5) tips.push(`${lines.length}/5 connection lines — link more chars`);
    if (!tips.length) tips.push('Lab well-developed!');
    return { score, detail: `${chipLv} chips, max lv ${maxChip}, ${lines.length} lines`, tips, tier: _tierFromScore(score) };
  },

  breeding(save) {
    let breed = _pk(save.data, 'Breeding');
    if (!Array.isArray(breed)) return { score: 0, detail: 'No data', tips: ['Unlock Breeding in W4'], tier: 'early' };
    const arenas = breed.filter(Array.isArray);
    const total = arenas.reduce((s, e) => s + e.length, 0);
    const small = arenas.filter(a => a.length <= 1).length;
    let score = 0;
    if (total >= 100) score = 5; else if (total >= 60) score = 4; else if (total >= 30) score = 3; else if (total >= 15) score = 2; else score = 1;
    const tips = [];
    if (small > 0) tips.push(`${small} arenas barely used (≤1 entry) — breed more`);
    if (total < 100) tips.push(`${total} total entries — fill all territories`);
    if (!tips.length) tips.push('Breeding well-developed!');
    return { score, detail: `${arenas.length} arenas, ${total} entries`, tips, tier: _tierFromScore(score) };
  },

  pets(save) {
    const pets = _pk(save.data, 'Pets');
    if (!Array.isArray(pets)) return { score: 0, detail: 'No data', tips: ['Collect pets from breeding'], tier: 'early' };
    const owned = pets.filter(v => v != null && v !== 0 && v !== -1).length;
    let score = 0;
    if (owned >= 120) score = 5; else if (owned >= 80) score = 4; else if (owned >= 40) score = 3; else if (owned >= 15) score = 2; else if (owned > 0) score = 1;
    const tips = [];
    if (owned < 120) tips.push(`${owned}/150 pets — keep breeding for more`);
    if (!tips.length) tips.push('Pet collection great!');
    return { score, detail: `${owned} pets owned`, tips, tier: _tierFromScore(score) };
  },

  cooking(save) {
    let cooking = _pk(save.data, 'Cooking');
    let meals = _pk(save.data, 'Meals');
    if (!Array.isArray(cooking)) return { score: 0, detail: 'No data', tips: ['Unlock Cooking in W4'], tier: 'early' };
    const kitchens = cooking.length;
    const mealLv = Array.isArray(meals) && Array.isArray(meals[0]) ? meals[0] : [];
    const discovered = mealLv.filter(v => typeof v === 'number' && v > 0).length;
    const mealMax = 30; // meals max at level 30
    const maxed = mealLv.filter(v => typeof v === 'number' && v >= mealMax).length;
    const notMaxed = mealLv.map((v, i) => ({ i, v })).filter(x => typeof x.v === 'number' && x.v > 0 && x.v < mealMax).sort((a, b) => a.v - b.v);
    const undiscovered = mealLv.filter(v => typeof v === 'number' && v === 0).length;
    const total = mealLv.length;

    let score = 0;
    if (maxed >= 70 && kitchens >= 10) score = 5;
    else if (maxed >= 50 && kitchens >= 8) score = 4;
    else if (maxed >= 30) score = 3;
    else if (discovered >= 15) score = 2;
    else score = 1;

    const tips = [];
    if (notMaxed.length > 0) {
      tips.push(`${notMaxed.length} meals not maxed (below lv ${mealMax})`);
      const worst = notMaxed.slice(0, 5);
      tips.push(`Lowest: ${worst.map(m => `meal #${m.i + 1} lv ${m.v}`).join(', ')}`);
    }
    if (undiscovered > 0 && total > 0) tips.push(`${undiscovered} meals undiscovered — cook new recipes`);
    if (kitchens < 10) tips.push(`${kitchens} kitchens — unlock more`);
    if (!tips.length) tips.push('All meals maxed!');

    return {
      score,
      detail: `${maxed}/${discovered} meals maxed (lv ${mealMax}), ${kitchens} kitchens`,
      tips,
      tier: _tierFromScore(score),
      breakdown: { sources: { maxed, notMaxed: notMaxed.length, undiscovered, kitchens } },
    };
  },

  // ═══════════ WORLD 5 ═══════════

  sailing(save) {
    let sail = _pk(save.data, 'Sailing');
    if (!Array.isArray(sail)) return { score: 0, detail: 'No data', tips: ['Unlock Sailing in W5'], tier: 'early' };
    const islands = Array.isArray(sail[1]) ? sail[1].length : 0;
    const artifacts = Array.isArray(sail[3]) ? sail[3] : [];
    const maxedArt = artifacts.filter(v => v >= 5).length;
    const lowArt = artifacts.filter(v => v > 0 && v < 5).length;
    const boats = _pk(save.data, 'Boats');
    const boatCount = Array.isArray(boats) ? boats.length : 0;
    const captains = _pk(save.data, 'Captains');
    const capCount = Array.isArray(captains) ? captains.length : 0;
    let score = 0;
    if (islands >= 30 && artifacts.length >= 50) score = 5; else if (islands >= 25 && artifacts.length >= 30) score = 4; else if (islands >= 20) score = 3; else if (islands >= 10) score = 2; else score = 1;
    const tips = [];
    if (islands < 33) tips.push(`${islands}/33 islands — keep exploring`);
    if (lowArt > 0) tips.push(`${lowArt} artifacts not max lv — level to 5`);
    if (boatCount < 10) tips.push(`Only ${boatCount} boats — get more`);
    if (!tips.length) tips.push('Sailing maxed!');
    return { score, detail: `${islands} islands, ${artifacts.length} artifacts (${maxedArt} maxed), ${boatCount} boats, ${capCount} captains`, tips, tier: _tierFromScore(score) };
  },

  gaming(save) {
    let gm = _pk(save.data, 'Gaming') || save.data?.Gaming;
    if (!Array.isArray(gm)) return { score: 0, detail: 'No data', tips: ['Unlock Gaming in W5'], tier: 'early' };
    const sprout = gm[1] || 0;
    const nugget = gm[2] || 0;
    const imports = gm[4] || 0;
    let score = 0;
    if (sprout >= 500 && nugget >= 500) score = 5; else if (sprout >= 200) score = 4; else if (sprout >= 50) score = 3; else if (sprout >= 10) score = 2; else score = 1;
    const tips = [];
    if (sprout < 500) tips.push(`Sprout lv ${sprout} — grow higher`);
    if (nugget < 500) tips.push(`Nugget lv ${nugget} — keep gaming`);
    if (imports < 8) tips.push(`${imports} imports — unlock more`);
    if (!tips.length) tips.push('Gaming well-developed!');
    return { score, detail: `Sprout ${sprout}, Nugget ${nugget}, ${imports} imports`, tips, tier: _tierFromScore(score) };
  },

  gamingSprout(save) {
    const gs = _pk(save.data, 'GamingSprout');
    if (!Array.isArray(gs)) return { score: 0, detail: 'No data', tips: ['Grow sprouts in Gaming'], tier: 'early' };
    const leveled = gs.filter(v => typeof v === 'number' && v > 0).length;
    let score = 0;
    if (leveled >= 30) score = 5; else if (leveled >= 20) score = 4; else if (leveled >= 10) score = 3; else if (leveled >= 5) score = 2; else if (leveled > 0) score = 1;
    const tips = [];
    if (leveled < gs.length) tips.push(`${gs.length - leveled} sprout types ungrown — grow them all`);
    if (!tips.length) tips.push('All sprout types grown!');
    return { score, detail: `${leveled}/${gs.length} sprout types`, tips, tier: _tierFromScore(score) };
  },

  divinity(save) {
    const data = save.data || {};
    let div = _pk(data, 'Divinity') || data.Divinity;
    if (!Array.isArray(div)) return { score: 0, detail: 'No data', tips: ['Unlock Divinity in W5'], tier: 'early' };
    const names = save.charNames || [];
    const charGods = div.slice(0, 12);
    const linked = charGods.filter(v => typeof v === 'number' && v > 0).length;
    const unlinked = charGods.filter(v => typeof v === 'number' && v === 0).length;
    const godPts = div.slice(29, 40).filter(v => typeof v === 'number');
    const lowGods = godPts.filter(v => v > 0 && v < 150).length;

    // God unlock order: 1=Snehebatu, 2=Arctis, 3=Omniphau, 4=Harriep, 5=Goharut, 6=Diamoon, 7=Muhmuguh, 8=Oelek, 9=Bagur, 10=Putt
    const GOD_NAMES = ['None', 'Snehebatu', 'Arctis', 'Omniphau', 'Harriep', 'Goharut', 'Diamoon', 'Muhmuguh', 'Oelek', 'Bagur', 'Putt'];
    const unlockedGods = new Set();
    for (const g of charGods) {
      if (typeof g === 'number' && g > 0) unlockedGods.add(g);
    }

    // Check if characters not on divinity or in lab have tranQI stance
    // The goat god is index 5 (Goharut) — lab chars using Goharut count
    const charsWithoutDivinity = [];
    for (let c = 0; c < names.length; c++) {
      const godIdx = typeof charGods[c] === 'number' ? charGods[c] : 0;
      if (godIdx === 0) {
        charsWithoutDivinity.push(names[c] || `Char ${c}`);
      }
    }

    // Check divinity points — enough to buy a new god at 100% offer
    const divPoints = div[28] || div[27] || 0; // divinity currency
    const nextGodCost = [0, 10, 50, 200, 1000, 5000, 20000, 100000, 500000, 2000000, 10000000];
    const highestGod = Math.max(0, ...Array.from(unlockedGods));
    const nextGod = highestGod + 1;
    const canBuyNextGod = nextGod < GOD_NAMES.length && typeof divPoints === 'number' && divPoints >= (nextGodCost[nextGod] || Infinity);

    let score = 0;
    if (linked >= 10 && div.length >= 35) score = 5; else if (linked >= 8) score = 4; else if (linked >= 5) score = 3; else if (linked >= 2) score = 2; else score = 1;
    const tips = [];
    if (canBuyNextGod) tips.push(`⚠️ Enough divinity points to unlock ${GOD_NAMES[nextGod] || 'next god'} — buy it at 100% offer!`);
    if (charsWithoutDivinity.length > 0) tips.push(`⚠️ Characters not linked to a god: ${charsWithoutDivinity.join(', ')} — ensure tranQI divinity stance`);
    if (lowGods > 0) tips.push(`${lowGods} gods with low offerings — increase them`);
    // God unlock tier display
    if (highestGod < GOD_NAMES.length - 1) tips.push(`God progress: ${highestGod}/${GOD_NAMES.length - 1} unlocked — next: ${GOD_NAMES[nextGod] || '?'}`);
    tips.push('💡 Divinity blessings will be analyzed in a future update');
    if (!tips.length) tips.push('Divinity maxed!');
    return { score, detail: `${linked}/12 chars linked, ${unlockedGods.size} gods unlocked`, tips, tier: _tierFromScore(score) };
  },

  // ═══════════ WORLD 6 ═══════════

  farming(save) {
    let rank = _pk(save.data, 'FarmRank');
    if (!Array.isArray(rank) || !Array.isArray(rank[0])) return { score: 0, detail: 'No data', tips: ['Unlock Farming in W6'], tier: 'early' };
    const ranks = rank[0].filter(v => typeof v === 'number');
    const avg = ranks.length > 0 ? ranks.reduce((a, b) => a + b, 0) / ranks.length : 0;
    const max = ranks.length > 0 ? Math.max(...ranks) : 0;
    const min = ranks.filter(v => v > 0).length > 0 ? Math.min(...ranks.filter(v => v > 0)) : 0;
    const low = ranks.filter(v => v > 0 && v < avg * .7).length;
    let score = 0;
    if (avg >= 150) score = 5; else if (avg >= 100) score = 4; else if (avg >= 50) score = 3; else if (avg >= 20) score = 2; else if (avg > 0) score = 1;
    const tips = [];
    if (low > 0) tips.push(`${low} crops below avg rank ${Math.round(avg)} — level them`);
    if (max - min > 50 && min > 0) tips.push(`Rank gap: ${min}–${max} — balance crops`);
    if (!tips.length) tips.push('Farming balanced!');
    return { score, detail: `${ranks.length} crops, avg rank ${Math.round(avg)}, ${min}–${max}`, tips, tier: _tierFromScore(score) };
  },

  farmUpgrades(save) {
    const fu = _pk(save.data, 'FarmUpg') || save.data?.FarmUpg;
    if (!Array.isArray(fu)) return { score: 0, detail: 'No data', tips: ['Buy farm upgrades in W6'], tier: 'early' };
    const leveled = fu.filter(v => typeof v === 'number' && v > 0).length;
    let score = 0;
    if (leveled >= 50) score = 5; else if (leveled >= 35) score = 4; else if (leveled >= 20) score = 3; else if (leveled >= 10) score = 2; else if (leveled > 0) score = 1;
    const tips = [];
    if (leveled < fu.length) tips.push(`${fu.length - leveled} farm upgrades not bought — invest in them`);
    if (!tips.length) tips.push('Farm upgrades well-invested!');
    return { score, detail: `${leveled}/${fu.length} upgrades bought`, tips, tier: _tierFromScore(score) };
  },

  summoning(save) {
    let sm = _pk(save.data, 'Summon');
    if (!Array.isArray(sm)) return { score: 0, detail: 'No data', tips: ['Unlock Summoning in W6'], tier: 'early' };
    const battles = Array.isArray(sm[0]) ? sm[0] : [];
    const units = Array.isArray(sm[1]) ? sm[1] : [];
    const zeroBattles = battles.filter(v => typeof v === 'number' && v === 0).length;
    const lowBattles = battles.filter(v => typeof v === 'number' && v > 0 && v < 30).length;
    let score = 0;
    if (battles.length >= 70 && units.length >= 100) score = 5; else if (battles.length >= 50) score = 4; else if (battles.length >= 30) score = 3; else if (battles.length >= 10) score = 2; else score = 1;
    const tips = [];
    if (zeroBattles > 0) tips.push(`${zeroBattles} battles with 0 wins — clear them`);
    if (lowBattles > 0) tips.push(`${lowBattles} battles with low wins (<30)`);
    if (units.length < 80) tips.push(`${units.length} units — unlock more`);
    if (!tips.length) tips.push('Summoning strong!');
    return { score, detail: `${battles.length} battles, ${units.length} units`, tips, tier: _tierFromScore(score) };
  },

  sneaking(save) {
    let nj = _pk(save.data, 'Ninja');
    if (!Array.isArray(nj)) return { score: 0, detail: 'No data', tips: ['Unlock Sneaking in W6'], tier: 'early' };
    const entries = nj.length;
    const maxFloor = nj.reduce((m, e) => Array.isArray(e) && typeof e[0] === 'number' ? Math.max(m, e[0]) : m, 0);
    let score = 0;
    if (entries >= 100 && maxFloor >= 7) score = 5; else if (entries >= 70) score = 4; else if (entries >= 40) score = 3; else if (entries >= 20) score = 2; else score = 1;
    const tips = [];
    if (maxFloor < 7) tips.push(`Max floor ${maxFloor} — push deeper`);
    if (entries < 100) tips.push(`${entries} areas — unlock more`);
    if (!tips.length) tips.push('Sneaking fully explored!');
    return { score, detail: `${entries} areas, max floor ${maxFloor}`, tips, tier: _tierFromScore(score) };
  },

  beanstalk(save) {
    const nj = _pk(save.data, 'Ninja') || save.data?.Ninja;
    if (!Array.isArray(nj) || nj.length <= 104) return { score: 0, detail: 'No data', tips: ['Unlock Beanstalk in Sneaking (W6)'], tier: 'early' };
    let bs = nj[104];
    if (typeof bs === 'string') try { bs = JSON.parse(bs); } catch { return { score: 0, detail: 'Parse error', tips: ['Could not parse beanstalk data'], tier: 'early' }; }
    if (!Array.isArray(bs)) return { score: 0, detail: 'No data', tips: ['Start growing the Beanstalk'], tier: 'early' };

    // Tiers: 0=not started, 1=lv 1-9 (tier 0 push), 2=lv 10+ (tier 1), 3=lv 10000+ (tier 2), 4=lv 100000+ (tier 3)
    const total = bs.length;
    const tier3 = bs.filter(v => typeof v === 'number' && v >= 3).length;
    const tier2 = bs.filter(v => typeof v === 'number' && v >= 2 && v < 3).length;
    const tier1 = bs.filter(v => typeof v === 'number' && v >= 1 && v < 2).length;
    const notStarted = bs.filter(v => typeof v === 'number' && v === 0).length;
    const maxTier = bs.reduce((m, v) => typeof v === 'number' && v > m ? v : m, 0);

    let score = 0;
    if (tier3 >= 30) score = 5;
    else if (tier3 >= 20) score = 4;
    else if (tier3 >= 10) score = 3;
    else if (tier3 >= 5 || tier2 >= 10) score = 2;
    else if (tier1 + tier2 + tier3 > 0) score = 1;

    const tips = [];
    if (notStarted > 0) tips.push(`${notStarted} beanstalk nodes not started — grow them`);
    if (tier1 > 0) tips.push(`${tier1} nodes at tier 1 — push to tier 2`);
    if (tier2 > 0) tips.push(`${tier2} nodes at tier 2 — push to tier 3`);
    if (tier3 < total && tier3 > 0) tips.push(`${tier3}/${total} at max tier 3`);
    if (!tips.length) tips.push('All beanstalk nodes at max tier!');

    return {
      score,
      detail: `${tier3} tier 3, ${tier2} tier 2, ${tier1} tier 1, ${notStarted} empty (${total} total)`,
      tips,
      tier: _tierFromScore(score),
      breakdown: { sources: { tier3, tier2, tier1, notStarted, total } },
    };
  },

  jars(save) {
    const ja = _pk(save.data, 'Jars');
    if (!Array.isArray(ja)) return { score: 0, detail: 'No data', tips: ['Collect Jars'], tier: 'early' };
    // Jars represent collectibles — check how many are unlocked vs total
    const unlocked = ja.filter(v => typeof v === 'number' && v > 0).length;
    const total = ja.length;
    const pct = total > 0 ? unlocked / total : 0;
    let score = 0;
    if (pct >= 0.95) score = 5;
    else if (pct >= 0.75) score = 4;
    else if (pct >= 0.50) score = 3;
    else if (pct >= 0.25) score = 2;
    else if (unlocked > 0) score = 1;
    const tips = [];
    if (unlocked < total) tips.push(`${total - unlocked} collectibles not unlocked — ${unlocked}/${total} (${Math.round(pct * 100)}%)`);
    if (unlocked === 0) tips.push('No collectibles unlocked yet — start collecting!');
    if (!tips.length) tips.push('All collectibles unlocked!');
    return { score, detail: `${unlocked}/${total} collectibles (${Math.round(pct * 100)}%)`, tips, tier: _tierFromScore(score) };
  },

  // ═══════════ WORLD 7 ═══════════

  spelunking(save) {
    let sp = _pk(save.data, 'Spelunk');
    if (!Array.isArray(sp)) return { score: 0, detail: 'No data', tips: ['Unlock Spelunking in W7'], tier: 'early' };
    const flags = Array.isArray(sp[0]) ? sp[0] : [];
    const levels = Array.isArray(sp[1]) ? sp[1] : [];
    const upgrades = Array.isArray(sp[5]) ? sp[5] : [];
    const biomes = Array.isArray(sp[44]) ? sp[44] : [];
    const unlocked = flags.filter(v => v > 0).length;
    const locked = flags.filter(v => v === 0).length;
    const upgLv = upgrades.filter(v => typeof v === 'number' && v > 0).length;
    const biomeActive = biomes.filter(v => typeof v === 'number' && v > 0).length;
    const lowestR = levels.map((v, i) => ({ i, v })).filter(x => typeof x.v === 'number' && x.v > 0).sort((a, b) => a.v - b.v).slice(0, 5);
    let score = 0;
    if (unlocked >= 14 && upgLv >= 60) score = 5; else if (unlocked >= 10 && upgLv >= 40) score = 4; else if (unlocked >= 7) score = 3; else if (unlocked >= 4) score = 2; else if (unlocked > 0) score = 1;
    const tips = [];
    if (locked > 0) tips.push(`${locked} rooms locked (${unlocked}/${flags.length})`);
    if (lowestR.length && lowestR[0].v < 100) tips.push(`Lowest rooms: ${lowestR.map(r => `#${r.i + 1} lv ${r.v}`).join(', ')}`);
    if (biomeActive < 5) tips.push(`${biomeActive} biomes — unlock more`);
    if (upgLv < 50) tips.push(`${upgLv} upgrades leveled — invest more`);
    if (!tips.length) tips.push('Spelunking fully explored!');
    return { score, detail: `${unlocked}/${flags.length} rooms, ${upgLv} upgrades, ${biomeActive} biomes`, tips, tier: _tierFromScore(score) };
  },

  holes(save) {
    const ho = _pk(save.data, 'Holes');
    if (!Array.isArray(ho)) return { score: 0, detail: 'No data', tips: ['Unlock The Hole in W7'], tier: 'early' };
    const floors = Array.isArray(ho[0]) ? ho[0] : [];
    const depths = Array.isArray(ho[1]) ? ho[1] : [];
    const maxFloor = Math.max(0, ...floors.filter(v => typeof v === 'number'));
    const activeWells = floors.filter(v => typeof v === 'number' && v > 0).length;
    const maxDepth = depths.length > 0 ? Math.max(0, ...depths.filter(v => typeof v === 'number')) : 0;
    let score = 0;
    if (activeWells >= 10 && maxFloor >= 14) score = 5; else if (activeWells >= 8) score = 4; else if (activeWells >= 5) score = 3; else if (activeWells >= 2) score = 2; else if (activeWells > 0) score = 1;
    const tips = [];
    const lowFloors = floors.filter(v => typeof v === 'number' && v > 0 && v < 10).length;
    if (lowFloors > 0) tips.push(`${lowFloors} wells on low floors — push deeper`);
    if (activeWells < floors.length) tips.push(`${floors.length - activeWells} wells inactive`);
    if (!tips.length) tips.push('Hole progression solid!');
    return { score, detail: `${activeWells} wells, max floor ${maxFloor}, max depth ${maxDepth}`, tips, tier: _tierFromScore(score) };
  },

  emperor(save) {
    const data = save.data || {};
    const ola = data.OptLacc;
    if (!Array.isArray(ola) || ola.length < 383) return { score: 0, detail: 'No data', tips: ['Unlock Emperor Showdown'], tier: 'early' };

    const highestLevel = Number(ola[369]) || 0;
    const attempts = Number(ola[370]) || 0; // negative means attempts used
    const dailyTickets = Number(ola[382]) || 0;
    const ticketsAvailable = attempts < 0 ? Math.abs(attempts) : 0;

    // Boss HP scales: 135e12 * 1.54^highestLevel
    const bossHP = 135e12 * Math.pow(1.54, highestLevel);

    let score = 0;
    if (highestLevel >= 120) score = 5;
    else if (highestLevel >= 80) score = 4;
    else if (highestLevel >= 40) score = 3;
    else if (highestLevel >= 10) score = 2;
    else if (highestLevel > 0) score = 1;

    const tips = [];
    if (ticketsAvailable > 0) tips.push(`🎟️ ${ticketsAvailable} tickets available — fight the Emperor!`);
    if (dailyTickets < 3) tips.push(`Daily tickets: ${dailyTickets} — buy more from the shop`);
    tips.push(`Next boss HP: ${_fmtBig(bossHP)} — prepare accordingly`);
    if (highestLevel < 120) tips.push(`Highest cleared: lv ${highestLevel} — push higher for rewards`);
    if (highestLevel >= 120) { tips.length = 0; tips.push('Emperor Showdown well-progressed!'); }

    return {
      score,
      detail: `Lv ${highestLevel}, ${ticketsAvailable > 0 ? ticketsAvailable + ' tickets ready' : 'no tickets'}, daily: ${dailyTickets}`,
      tips,
      tier: _tierFromScore(score),
      breakdown: { sources: { highestLevel, ticketsAvailable, dailyTickets, nextBossHP: bossHP.toExponential(2) } },
    };
  },

  villager(save) {
    const data = save.data || {};
    const holes = _pk(data, 'Holes') || data.Holes;
    if (!Array.isArray(holes) || holes.length < 3) return { score: 0, detail: 'No data', tips: ['Unlock Villagers in The Hole (W7)'], tier: 'early' };

    const villLv = Array.isArray(holes[1]) ? holes[1] : [];
    const villExp = Array.isArray(holes[2]) ? holes[2] : [];
    const total = villLv.length;
    const active = villLv.filter(v => typeof v === 'number' && v > 0).length;
    const notCollected = villLv.filter((v, i) => typeof v === 'number' && v === 0 && i < total).length;
    const maxLv = Math.max(0, ...villLv.filter(v => typeof v === 'number'));
    const avgLv = active > 0 ? villLv.filter(v => typeof v === 'number' && v > 0).reduce((s, v) => s + v, 0) / active : 0;

    // Check which villagers might be ready to level (have exp > threshold)
    const readyToLevel = [];
    for (let i = 0; i < Math.min(villLv.length, villExp.length); i++) {
      const lv = typeof villLv[i] === 'number' ? villLv[i] : 0;
      const exp = typeof villExp[i] === 'number' ? villExp[i] : 0;
      if (lv > 0 && exp > 0) readyToLevel.push({ i: i + 1, lv, exp });
    }

    let score = 0;
    if (active >= 8 && maxLv >= 200) score = 5;
    else if (active >= 6 && maxLv >= 100) score = 4;
    else if (active >= 5 && maxLv >= 50) score = 3;
    else if (active >= 3) score = 2;
    else if (active > 0) score = 1;

    const tips = [];
    if (notCollected > 0) tips.push(`${notCollected} villager slots unlocked but not collected — go get them!`);
    if (readyToLevel.length > 0) tips.push(`${readyToLevel.length} villagers have pending exp — level them up`);
    const lowLv = villLv.map((v, i) => ({ i: i + 1, v })).filter(x => typeof x.v === 'number' && x.v > 0 && x.v < avgLv * 0.5).sort((a, b) => a.v - b.v);
    if (lowLv.length > 0) tips.push(`Low villagers: ${lowLv.map(v => `#${v.i} lv ${v.v}`).join(', ')} — avg is ${Math.round(avgLv)}`);
    if (!tips.length) tips.push('All villagers active and leveled!');

    return {
      score,
      detail: `${active}/${total} active, max lv ${maxLv}, avg ${Math.round(avgLv)}`,
      tips,
      tier: _tierFromScore(score),
      breakdown: { sources: { active, notCollected, maxLv, avgLv: Math.round(avgLv), readyToLevel: readyToLevel.length } },
    };
  },

  // ═══════════ CROSS-WORLD ═══════════

  starSigns(save) {
    const sg = _pk(save.data, 'StarSg');
    if (!sg || typeof sg !== 'object') return { score: 0, detail: 'No data', tips: ['Unlock star signs'], tier: 'early' };
    const count = Object.keys(sg).length;
    let score = 0;
    if (count >= 70) score = 5; else if (count >= 50) score = 4; else if (count >= 30) score = 3; else if (count >= 15) score = 2; else if (count > 0) score = 1;
    const tips = [];
    if (count < 70) tips.push(`${count} star signs — unlock more for passive bonuses`);
    if (!tips.length) tips.push('Star signs well-collected!');
    return { score, detail: `${count} star signs unlocked`, tips, tier: _tierFromScore(score) };
  },

  tasks(save) {
    const data = save.data || {};
    let totalMerits = 0, maxedMerits = 0, worldsDone = 0;
    const t = _pk(data, 'TaskZZ1');
    if (!Array.isArray(t)) return { score: 0, detail: 'No data', tips: ['Complete tasks for merit shop'], tier: 'early' };
    for (let w = 0; w < Math.min(t.length, 7); w++) {
      if (Array.isArray(t[w])) {
        const world = t[w];
        const done = world.filter(v => typeof v === 'number' && v >= 10).length;
        const bought = world.filter(v => typeof v === 'number' && v > 0).length;
        totalMerits += bought;
        maxedMerits += done;
        if (done >= 7) worldsDone++;
      }
    }
    if (totalMerits === 0) return { score: 0, detail: 'No data', tips: ['Complete tasks for merit shop'], tier: 'early' };
    let score = 0;
    if (worldsDone >= 6) score = 5; else if (worldsDone >= 4) score = 4; else if (worldsDone >= 2) score = 3; else if (totalMerits >= 10) score = 2; else score = 1;
    const tips = [];
    if (worldsDone < 6) tips.push(`${worldsDone}/6 merit worlds maxed — keep completing tasks`);
    if (!tips.length) tips.push('Merit shop fully purchased!');
    return { score, detail: `${worldsDone} worlds maxed, ${maxedMerits} merits at lv 10`, tips, tier: _tierFromScore(score) };
  },

  deathNote(save) {
    const su = _pk(save.data, 'Sushi');
    if (!Array.isArray(su)) return { score: 0, detail: 'No data', tips: ['Work on Death Note kills'], tier: 'early' };
    const tiers = Array.isArray(su[7]) ? su[7] : [];
    const completed = tiers.filter(v => typeof v === 'number' && v > 0).length;
    const maxTier = Math.max(0, ...tiers.filter(v => typeof v === 'number'));
    let score = 0;
    if (completed >= 80 && maxTier >= 5) score = 5; else if (completed >= 50) score = 4; else if (completed >= 25) score = 3; else if (completed >= 10) score = 2; else if (completed > 0) score = 1;
    const tips = [];
    if (completed < tiers.length) tips.push(`${tiers.length - completed} death note mobs incomplete`);
    if (maxTier < 5) tips.push(`Max tier ${maxTier} — push to tier 5+ for bonuses`);
    if (!tips.length) tips.push('Death Note well-progressed!');
    return { score, detail: `${completed} mobs completed, max tier ${maxTier}`, tips, tier: _tierFromScore(score) };
  },

  rift(save) {
    const ri = _pk(save.data, 'Rift') || save.data?.Rift;
    if (!Array.isArray(ri)) return { score: 0, detail: 'No data', tips: ['Enter the Rift'], tier: 'early' };
    const level = ri[0] || 0;
    let score = 0;
    if (level >= 50) score = 5; else if (level >= 35) score = 4; else if (level >= 20) score = 3; else if (level >= 10) score = 2; else if (level > 0) score = 1;
    const tips = [];
    if (level < 50) tips.push(`Rift ${level} — push further for rewards`);
    if (!tips.length) tips.push('Rift maxed!');
    return { score, detail: `Rift ${level}`, tips, tier: _tierFromScore(score) };
  },

  arcane(save) {
    const ac = _pk(save.data, 'Arcane') || save.data?.Arcane;
    if (!Array.isArray(ac)) return { score: 0, detail: 'No data', tips: ['Unlock Arcane upgrades'], tier: 'early' };
    const leveled = ac.filter(v => typeof v === 'number' && v > 0).length;
    let score = 0;
    if (leveled >= 70) score = 5; else if (leveled >= 50) score = 4; else if (leveled >= 30) score = 3; else if (leveled >= 15) score = 2; else if (leveled > 0) score = 1;
    const tips = [];
    if (leveled < ac.length) tips.push(`${ac.length - leveled} arcane upgrades not leveled`);
    if (!tips.length) tips.push('Arcane upgrades maxed!');
    return { score, detail: `${leveled}/${ac.length} leveled`, tips, tier: _tierFromScore(score) };
  },

  grimoire(save) {
    const gr = _pk(save.data, 'Grimoire') || save.data?.Grimoire;
    if (!Array.isArray(gr)) return { score: 0, detail: 'No data', tips: ['Unlock the Grimoire'], tier: 'early' };
    const leveled = gr.filter(v => typeof v === 'number' && v > 0).length;
    let score = 0;
    if (leveled >= 70) score = 5; else if (leveled >= 50) score = 4; else if (leveled >= 30) score = 3; else if (leveled >= 15) score = 2; else if (leveled > 0) score = 1;
    const tips = [];
    if (leveled < gr.length) tips.push(`${gr.length - leveled} grimoire entries not leveled`);
    if (!tips.length) tips.push('Grimoire maxed!');
    return { score, detail: `${leveled}/${gr.length} leveled`, tips, tier: _tierFromScore(score) };
  },

  vault(save) {
    const vu = _pk(save.data, 'UpgVault') || save.data?.UpgVault;
    if (!Array.isArray(vu)) return { score: 0, detail: 'No data', tips: ['Buy vault upgrades'], tier: 'early' };
    const all = vu.filter(v => typeof v === 'number');
    const owned = all.filter(v => v > 0).length;
    const maxLv = Math.max(0, ...all);
    const total = all.length;
    // Vault upgrades get exponentially expensive. Score based on level, not just owned count.
    // Consider upgrades too expensive if they're 10x+ the average level
    const avgLv = owned > 0 ? all.filter(v => v > 0).reduce((s, v) => s + v, 0) / owned : 0;
    const affordable = all.filter(v => v > 0 && v < avgLv * 10).length;
    const tooExpensive = owned - affordable;
    let score = 0;
    if (owned >= total && maxLv >= 50) score = 5;
    else if (owned >= total * .9 && maxLv >= 20) score = 4;
    else if (owned >= total * .7) score = 3;
    else if (owned >= total * .4) score = 2;
    else if (owned > 0) score = 1;
    const tips = [];
    const notOwned = total - owned;
    if (notOwned > 0) tips.push(`${notOwned} vault upgrades not purchased`);
    const lowLv = all.map((v, i) => ({ i, v })).filter(x => x.v > 0 && x.v < 5).length;
    if (lowLv > 0) tips.push(`${lowLv} upgrades at very low level — cheap to level up`);
    if (tooExpensive > 0) tips.push(`${tooExpensive} upgrades at high cost — may not be worth leveling further right now`);
    if (!tips.length) tips.push('Vault fully upgraded!');
    return { score, detail: `${owned}/${total} owned, avg lv ${Math.round(avgLv)}, max lv ${maxLv}`, tips, tier: _tierFromScore(score) };
  },

  compass(save) {
    const co = _pk(save.data, 'Compass');
    if (!Array.isArray(co)) return { score: 0, detail: 'No data', tips: ['Unlock the Compass'], tier: 'early' };
    const upgrades = Array.isArray(co[0]) ? co[0] : [];
    const leveled = upgrades.filter(v => typeof v === 'number' && v > 0).length;
    const routes = Array.isArray(co[2]) ? co[2].length : 0;
    const mobs = Array.isArray(co[3]) ? co[3].length : 0;
    let score = 0;
    if (leveled >= 120 && routes >= 70) score = 5; else if (leveled >= 80) score = 4; else if (leveled >= 40) score = 3; else if (leveled >= 15) score = 2; else if (leveled > 0) score = 1;
    const tips = [];
    if (leveled < upgrades.length) tips.push(`${upgrades.length - leveled} compass upgrades not leveled`);
    if (routes < 70) tips.push(`${routes} routes discovered — explore more`);
    if (!tips.length) tips.push('Compass well-explored!');
    return { score, detail: `${leveled} upgrades, ${routes} routes, ${mobs} mobs`, tips, tier: _tierFromScore(score) };
  },

  dream(save) {
    const dr = _pk(save.data, 'Dream') || save.data?.Dream;
    if (!Array.isArray(dr)) return { score: 0, detail: 'No data', tips: ['Unlock Equinox / Dream upgrades'], tier: 'early' };

    // Dream[0] = charge, Dream[2..13] = 12 upgrade levels
    const dreamCharge = dr[0] || 0;
    const upgLevels = dr.slice(2, 14);
    const purchased = upgLevels.filter(v => typeof v === 'number' && v > 0).length;
    const totalUpg = 12;

    // Equinox clouds from WeeklyBoss
    const wb = _pk(save.data, 'WeeklyBoss') || save.data?.WeeklyBoss;
    let cloudsDone = 0, cloudsTotal = 0;
    if (wb && typeof wb === 'object') {
      const cloudKeys = Object.keys(wb).filter(k => k.startsWith('d_'));
      cloudsTotal = cloudKeys.length;
      cloudsDone = cloudKeys.filter(k => wb[k] === -1).length;
    }

    let score = 0;
    if (purchased >= 10 && cloudsDone >= 35) score = 5;
    else if (purchased >= 8 && cloudsDone >= 25) score = 4;
    else if (purchased >= 6 && cloudsDone >= 15) score = 3;
    else if (purchased >= 3) score = 2;
    else if (purchased > 0) score = 1;

    const tips = [];
    const notPurchased = totalUpg - purchased;
    if (notPurchased > 0) tips.push(`${notPurchased} dream upgrades not purchased`);
    if (dreamCharge > 100000) tips.push(`${_fmtBig(dreamCharge)} unspent charge — invest it`);
    if (cloudsTotal > 0 && cloudsDone < cloudsTotal) tips.push(`Equinox clouds: ${cloudsDone}/${cloudsTotal} completed — ${cloudsTotal - cloudsDone} remaining`);
    if (!tips.length) tips.push('Equinox / Dreams fully done!');

    return {
      score,
      detail: `${purchased}/${totalUpg} dream upgrades, ${cloudsDone}/${cloudsTotal} clouds`,
      tips,
      tier: _tierFromScore(score),
      breakdown: {
        sources: { dreamUpgrades: purchased, dreamCharge, cloudsDone, cloudsTotal },
      },
    };
  },

  territory(save) {
    const te = _pk(save.data, 'Territory');
    if (!Array.isArray(te)) return { score: 0, detail: 'No data', tips: ['Claim spice territories'], tier: 'early' };
    // Each territory is a sub-array. Check which ones have active production
    const totalSlots = te.length;
    const claimed = te.filter(e => {
      if (!Array.isArray(e)) return false;
      // A claimed territory has meaningful data — check for non-zero values
      return e.some(v => typeof v === 'number' && v > 0);
    }).length;
    const unclaimed = totalSlots - claimed;
    let score = 0;
    if (claimed >= 24) score = 5; else if (claimed >= 18) score = 4; else if (claimed >= 12) score = 3; else if (claimed >= 6) score = 2; else if (claimed > 0) score = 1;
    const tips = [];
    if (unclaimed > 0) tips.push(`${unclaimed}/${totalSlots} territories not claimed — claim them for spice production`);
    if (!tips.length) tips.push('All territories claimed!');
    return { score, detail: `${claimed}/${totalSlots} territories claimed`, tips, tier: _tierFromScore(score) };
  },

  armorSets(save) {
    const data = save.data || {};
    const ola = data.OptLacc;
    if (!Array.isArray(ola) || !ola[379]) return { score: 0, detail: 'No data', tips: ['Unlock armor sets by collecting all pieces'], tier: 'early' };

    const owned = String(ola[379]).split(',').filter(s => s && s !== '0');
    const ownedSet = new Set(owned);
    const totalSets = ARMOR_SET_ORDER.length;
    const ownedCount = owned.length;
    const missing = ARMOR_SET_ORDER.filter(s => !ownedSet.has(s));
    const next3 = missing.slice(0, 3);

    let score = 0;
    if (ownedCount >= totalSets) score = 5;
    else if (ownedCount >= totalSets - 3) score = 4;
    else if (ownedCount >= totalSets - 6) score = 3;
    else if (ownedCount >= 5) score = 2;
    else if (ownedCount > 0) score = 1;

    const tips = [];
    if (next3.length > 0) {
      tips.push(`Next sets to complete: ${next3.map(s => ARMOR_SET_LABELS[s] || s).join(', ')}`);
      tips.push(`${missing.length} sets remaining out of ${totalSets}`);
    }
    if (!tips.length) tips.push('All armor sets completed!');

    return {
      score,
      detail: `${ownedCount}/${totalSets} armor sets completed`,
      tips,
      tier: _tierFromScore(score),
      breakdown: { sources: { owned: ownedCount, missing: missing.length, total: totalSets } },
    };
  },

  weeklyBoss(save) {
    const data = save.data || {};
    // Look for boss-related keys
    const wb = _pk(data, 'WeeklyBoss');
    // Check BossStatus or similar
    const bossStatus = _pk(data, 'BossStatus') || _pk(data, 'BossInfo');
    if (!wb && !bossStatus) return { score: 0, detail: 'No data', tips: ['Fight weekly bosses for rewards'], tier: 'early' };

    let bossesDefeated = 0, totalBosses = 0, maxDifficulty = 0;
    if (wb && typeof wb === 'object') {
      // WeeklyBoss may have different structure — count all entries
      const vals = Object.values(wb).filter(v => typeof v === 'number');
      totalBosses = vals.length;
      bossesDefeated = vals.filter(v => v > 0).length;
      maxDifficulty = Math.max(0, ...vals);
    }
    if (Array.isArray(bossStatus)) {
      totalBosses = bossStatus.length;
      bossesDefeated = bossStatus.filter(v => v > 0).length;
    }

    let score = 0;
    if (bossesDefeated >= 8) score = 5; else if (bossesDefeated >= 6) score = 4; else if (bossesDefeated >= 4) score = 3; else if (bossesDefeated >= 2) score = 2; else if (bossesDefeated > 0) score = 1;
    const tips = [];
    if (bossesDefeated < totalBosses) tips.push(`${totalBosses - bossesDefeated} weekly bosses not defeated`);
    if (!tips.length) tips.push('All weekly bosses defeated!');
    return { score, detail: `${bossesDefeated}/${totalBosses} bosses defeated`, tips, tier: _tierFromScore(score) };
  },

  research(save) {
    const re = _pk(save.data, 'Research');
    if (!Array.isArray(re)) return { score: 0, detail: 'No data', tips: ['Start research in Lab'], tier: 'early' };
    const unlocked = Array.isArray(re[2]) ? re[2].filter(v => v > 0).length : 0;
    const totalSlots = Array.isArray(re[2]) ? re[2].length : 0;
    const levels = Array.isArray(re[4]) ? re[4].filter(v => typeof v === 'number' && v > 0).length : 0;
    let score = 0;
    if (unlocked >= 60 && levels >= 5) score = 5; else if (unlocked >= 40) score = 4; else if (unlocked >= 20) score = 3; else if (unlocked >= 10) score = 2; else if (unlocked > 0) score = 1;
    const tips = [];
    if (unlocked < totalSlots) tips.push(`${totalSlots - unlocked} research nodes locked — unlock more`);
    if (!tips.length) tips.push('Research well-progressed!');
    return { score, detail: `${unlocked}/${totalSlots} researched`, tips, tier: _tierFromScore(score) };
  },

  // ═══════════ PRISMA & EXALTED ═══════════

  prismaMulti(save) {
    const data = save.data || {};
    const ola = data.OptLacc;
    if (!Array.isArray(ola)) return { score: 0, detail: 'No data', tips: ['Upload a full save with account options'], tier: 'early' };

    // Prisma bubbles: OLA[384] is a comma-separated string of prismaed bubble indices
    const prismaStr = String(ola[384] || '');
    const prismaBubbles = prismaStr.split(',').filter(b => b && b !== '0');
    const prismaCount = prismaBubbles.length;

    // Tesseract upgrade 45 bonus (approx from Tess data)
    const tess = _pk(data, 'Tess');
    const tessUnlocked = Array.isArray(tess) && Array.isArray(tess[0]) ? tess[0].length : 0;
    // Rough estimate: tesseract bonus scales with unlocks
    const tessBonus = tessUnlocked > 40 ? 7 : tessUnlocked > 20 ? 4 : tessUnlocked > 10 ? 2 : 0;

    // Arcade bonus: check ArcadeUpg for Prisma_Bonuses related upgrades
    const arcadeUpg = _pk(data, 'ArcadeUpg');
    let arcadeBonus = 0;
    if (Array.isArray(arcadeUpg)) {
      // Arcade upgrades at index 100+ are maxed, count total maxed for scaling
      const maxed = arcadeUpg.filter(v => v >= 100).length;
      arcadeBonus = maxed >= 50 ? 20 : maxed >= 30 ? 12 : maxed >= 15 ? 6 : 0;
    }

    // Trophy23 check
    const cards1 = _pk(data, 'Cards1');
    const hasTrophy23 = Array.isArray(cards1) && cards1.includes('Trophy23');
    const trophyBonus = hasTrophy23 ? 10 : 0;

    // Sushi bonus index 23
    const sushi = _pk(data, 'Sushi');
    const sushiStations = Array.isArray(sushi) && Array.isArray(sushi[0]) ? sushi[0] : [];
    const hasSushi23 = sushiStations.length > 23 && sushiStations[23] >= 0 && sushiStations[23] !== -1;

    // Ethereal Sigils from CauldronP2W
    const p2w = _pk(data, 'CauldronP2W');
    let sigilCount = 0;
    if (Array.isArray(p2w) && Array.isArray(p2w[3])) {
      sigilCount = p2w[3].filter(v => typeof v === 'number' && v >= 200).length;
    }
    const sigilBonus = 0.2 * sigilCount;

    // Approximate total additive (we can see the pattern from IdleOn Toolbox)
    const additive = tessBonus + arcadeBonus + (hasSushi23 ? 5 : 0) + trophyBonus + sigilBonus;
    const prismaMultiVal = Math.min(4, 2 + additive / 100);

    let score = 0;
    if (prismaMultiVal >= 3.5) score = 5;
    else if (prismaMultiVal >= 3.0) score = 4;
    else if (prismaMultiVal >= 2.5) score = 3;
    else if (prismaMultiVal >= 2.2) score = 2;
    else if (prismaCount > 0) score = 1;

    const tips = [];
    if (prismaCount < 20) tips.push(`${prismaCount} bubbles prismaed — prisma more bubbles`);
    if (!hasTrophy23) tips.push('Missing Trophy23 — gives +10% prisma bonus');
    if (tessBonus < 7) tips.push('Level Tesseract upgrades for more prisma multi');
    if (arcadeBonus < 20) tips.push('Max Arcade upgrades for prisma bonus');
    if (sigilCount < 2) tips.push(`${sigilCount} ethereal sigils — unlock more for +0.2% each`);
    if (!tips.length) tips.push('Prisma multi near max!');

    return {
      score,
      detail: `${prismaCount} prismaed, multi ≈${prismaMultiVal.toFixed(2)}x`,
      tips,
      tier: _tierFromScore(score),
      breakdown: {
        prismaMulti: prismaMultiVal,
        prismaCount,
        sources: { tessBonus, arcadeBonus, trophyBonus, sigilBonus, sushi: hasSushi23 ? 5 : 0 },
      },
    };
  },

  exaltedStamps(save) {
    const data = save.data || {};
    const ola = data.OptLacc;
    const compass = _pk(data, 'Compass');

    // Compass[4] = exalted stamps raw array
    const exaltedStampsRaw = Array.isArray(compass) && compass.length > 4 ? compass[4] : [];
    const exaltedCount = Array.isArray(exaltedStampsRaw) ? exaltedStampsRaw.length : 0;

    // Exalted fragment from Spelunk[4][3]
    const spelunk = _pk(data, 'Spelunk');
    const exaltedFrag = Array.isArray(spelunk) && Array.isArray(spelunk[4]) && typeof spelunk[4][3] === 'number'
      ? Math.floor(spelunk[4][3]) : 0;

    // Atom 12 (Aluminium - Stamp Supercharger)
    const atoms = _pk(data, 'Atoms') || data.Atoms;
    const atomBonus = Array.isArray(atoms) && typeof atoms[12] === 'number' ? atoms[12] : 0;

    // Armor sets from OLA[379]
    let armorSetBonus = 0;
    if (Array.isArray(ola) && ola[379]) {
      const sets = String(ola[379]).split(',').filter(s => s && s !== '0');
      // EMPEROR_SET gives the bonus; having it completed = 20% bonus
      if (sets.includes('EMPEROR_SET')) armorSetBonus = 20;
    }

    // Exalted stamps from Gem Shop: OLA[366]
    const gemShopExalted = Array.isArray(ola) ? (Number(ola[366]) || 0) : 0;

    // Event bonus: OLA[311] event shop purchases
    const eventPurchases = Array.isArray(ola) ? (Number(ola[311]) || 0) : 0;
    const eventBonus = eventPurchases > 0 ? 20 : 0;

    // Approximate exalted total: 100 + (atom + charm + compass + armorSet + event + palette + exotic + exaltedFrag + legend + sushi)
    // We can approximate some we can't easily parse
    const approxTotal = 100 + atomBonus + armorSetBonus + eventBonus + exaltedFrag;

    let score = 0;
    if (approxTotal >= 300 && exaltedCount >= 20) score = 5;
    else if (approxTotal >= 230 && exaltedCount >= 12) score = 4;
    else if (approxTotal >= 180 && exaltedCount >= 8) score = 3;
    else if (approxTotal >= 130 && exaltedCount >= 4) score = 2;
    else if (exaltedCount > 0 || gemShopExalted > 0) score = 1;

    const tips = [];
    if (exaltedCount < 20) tips.push(`${exaltedCount} stamps exalted — exalt more via Compass`);
    if (atomBonus < 61) tips.push(`Atom Stamp Supercharger at lv ${atomBonus} — level it up`);
    if (armorSetBonus === 0) tips.push('Complete Emperor Armor Set for +20% exalted bonus');
    if (exaltedFrag < 10) tips.push(`Exalted Fragments: ${exaltedFrag} — find more in Spelunking`);
    if (eventBonus === 0) tips.push('Buy Event Shop bonus for +20% exalted');
    if (!tips.length) tips.push('Exalted stamps well-boosted!');

    return {
      score,
      detail: `${exaltedCount} exalted, bonus ≈${approxTotal}%`,
      tips,
      tier: _tierFromScore(score),
      breakdown: {
        exaltedTotal: approxTotal,
        exaltedCount,
        sources: { base: 100, atomBonus, armorSetBonus, eventBonus, exaltedFrag },
      },
    };
  },

  // ═══════════ NEW SYSTEMS ═══════════

  minibosses(save) {
    const data = save.data || {};
    // Miniboss timers: Dilapidated Slush (x2), Domeo Magmus (x2)
    // BossStatus or OptLacc stores boss kill timestamps
    // Each miniboss respawns every 7 days; alert when 2 stacked (14 days since last kill)
    const ola = data.OptLacc;
    const MINIBOSS_NAMES = ['Dilapidated Slush', 'Dilapidated Slush', 'Domeo Magmus', 'Domeo Magmus'];
    // Try to find boss timestamps
    const bossTimers = _pk(data, 'BossTimers') || _pk(data, 'MiniBoss');
    let score = 3, readyBosses = 0;
    const tips = [];

    if (Array.isArray(bossTimers)) {
      const now = Date.now() / 1000;
      for (let i = 0; i < Math.min(bossTimers.length, 4); i++) {
        const lastKill = bossTimers[i] || 0;
        const daysSince = lastKill > 0 ? (now - lastKill) / 86400 : 999;
        if (daysSince >= 14) {
          readyBosses++;
          tips.push(`⚠️ ${MINIBOSS_NAMES[i] || `Miniboss ${i+1}`}: 2 stacked (${Math.floor(daysSince)} days) — go fight!`);
        } else if (daysSince >= 7) {
          tips.push(`${MINIBOSS_NAMES[i] || `Miniboss ${i+1}`}: ready (${Math.floor(daysSince)} days)`);
        }
      }
      score = readyBosses >= 3 ? 1 : readyBosses >= 1 ? 2 : tips.length > 0 ? 3 : 5;
    } else {
      tips.push('💡 Minibosses respawn every 7 days — fight when 2 stacked for efficiency');
      tips.push('Fight: Dilapidated Slush (×2) & Domeo Magmus (×2)');
    }
    if (!tips.length) tips.push('All minibosses cleared recently!');
    return { score, detail: `${readyBosses} minibosses ready`, tips, tier: _tierFromScore(score) };
  },

  superTalentPoints(save) {
    const data = save.data || {};
    const names = save.charNames || [];
    let unusedSTP = 0;
    const charsWithUnused = [];
    for (let c = 0; c < names.length; c++) {
      const stp = _pk(data, `STP_${c}`) || _pk(data, `SuperTalent_${c}`);
      if (typeof stp === 'number' && stp > 0) {
        unusedSTP += stp;
        charsWithUnused.push({ name: names[c] || `Char ${c}`, pts: stp });
      }
      // Also check talent point data
      const talentPts = data[`TalentPts_${c}`];
      if (Array.isArray(talentPts)) {
        const stpIdx = talentPts.length > 5 ? talentPts[5] : 0;
        if (typeof stpIdx === 'number' && stpIdx > 0 && !charsWithUnused.find(x => x.name === (names[c] || `Char ${c}`))) {
          unusedSTP += stpIdx;
          charsWithUnused.push({ name: names[c] || `Char ${c}`, pts: stpIdx });
        }
      }
    }
    let score = unusedSTP === 0 ? 5 : unusedSTP <= 3 ? 3 : 1;
    const tips = [];
    if (unusedSTP > 0) {
      tips.push(`⚠️ ${unusedSTP} super talent points unused!`);
      for (const ch of charsWithUnused) tips.push(`${ch.name}: ${ch.pts} STP unused`);
      tips.push('📺 Watch this guide for optimal spending: https://www.youtube.com/watch?v=fo2WwEKsty0');
    }
    if (!tips.length) tips.push('All super talent points spent!');
    return { score, detail: unusedSTP > 0 ? `${unusedSTP} unspent STP` : 'All STP spent', tips, tier: _tierFromScore(score) };
  },

  worship(save) {
    const data = save.data || {};
    const names = save.charNames || [];
    let totalCharge = 0, charsWithCharge = 0;
    const charIssues = [];

    for (let c = 0; c < names.length; c++) {
      const wor = _pk(data, `Worship_${c}`) || _pk(data, `WorshipCharge_${c}`);
      if (typeof wor === 'number' && wor > 0) {
        charsWithCharge++;
        totalCharge += wor;
        // High unspent charge = alert
        if (wor > 500) {
          charIssues.push({ name: names[c] || `Char ${c}`, charge: wor });
        }
      }
    }

    // Check tower that gives most worship exp
    const tower = _pk(data, 'Tower');
    const towerInfo = [];
    if (Array.isArray(tower)) {
      // Tower with worship exp bonuses
      const worshipTowers = tower.map((v, i) => ({ i, v: typeof v === 'number' ? v : 0 })).filter(x => x.v > 0);
      if (worshipTowers.length > 0) {
        const sorted = worshipTowers.sort((a, b) => b.v - a.v);
        towerInfo.push(`Best tower for worship: slot ${sorted[0].i} (lv ${sorted[0].v})`);
      }
    }

    let score = 3;
    if (charIssues.length === 0 && charsWithCharge > 0) score = 5;
    else if (charIssues.length <= 2) score = 4;
    else if (charIssues.length <= 5) score = 3;
    else score = 2;

    const tips = [];
    if (charIssues.length > 0) {
      tips.push(`⚠️ Worship charge not spent on ${charIssues.length} characters:`);
      for (const ch of charIssues.slice(0, 5)) tips.push(`${ch.name}: ${_fmtBig(ch.charge)} charge — use it!`);
    }
    if (towerInfo.length > 0) tips.push(towerInfo[0]);
    tips.push('💡 Spend worship charge for prayer upgrades and tower defense');
    if (!tips.length) tips.push('Worship charge well-managed!');
    return { score, detail: `${charsWithCharge} chars with charge, ${_fmtBig(totalCharge)} total`, tips, tier: _tierFromScore(score) };
  },

  friends(save) {
    const data = save.data || {};
    const friendData = _pk(data, 'Friends') || _pk(data, 'FriendsList');
    const tips = [];
    let score = 3;

    if (Array.isArray(friendData)) {
      const totalFriends = friendData.length;
      const highLevel = friendData.filter(f => {
        if (typeof f === 'number') return f >= 12000;
        if (f && typeof f === 'object') return (f.level || f.lv || 0) >= 12000;
        return false;
      }).length;
      const lowLevel = friendData.filter(f => {
        const lv = typeof f === 'number' ? f : (f?.level || f?.lv || 0);
        return lv > 0 && lv < 12000;
      }).length;

      if (highLevel >= totalFriends && totalFriends > 0) score = 5;
      else if (highLevel >= totalFriends * 0.8) score = 4;
      else if (highLevel >= totalFriends * 0.5) score = 3;
      else score = 2;

      if (lowLevel > 0) tips.push(`⚠️ ${lowLevel} friends below 12k level — level them up for bonus!`);
      if (totalFriends === 0) tips.push('Add friends for level-based bonuses');
    } else {
      tips.push('💡 Friend bonuses unlock at 12k levels — add and level friends');
      score = 2;
    }
    if (!tips.length) tips.push('All friend bonuses at 12k+ levels!');
    return { score, detail: 'Friend bonuses', tips, tier: _tierFromScore(score) };
  },

  constellations(save) {
    const data = save.data || {};
    // Constellations are the star map challenges that unlock star signs
    // Check which constellation areas are completed
    const constel = _pk(data, 'Constellation') || _pk(data, 'ConstellationChallenge');
    const starSg = _pk(data, 'StarSg') || data.StarSg;

    // If no constellation data, fall back to star sign count analysis
    const unlocked = starSg && typeof starSg === 'object' ? Object.keys(starSg).filter(k => {
      const v = starSg[k];
      return v > 0 || v === true;
    }).length : 0;

    // Detect max world for tier recommendations
    let maxWorld = 0;
    const names = save.charNames || [];
    for (let i = 0; i < names.length; i++) {
      const afk = data[`AFKtarget_${i}`] || '';
      const m = afk.match(/^w(\d+)/);
      if (m) maxWorld = Math.max(maxWorld, parseInt(m[1]));
    }

    // Star signs per world (approximate unlockable counts)
    const SIGNS_PER_WORLD = { 1: 8, 2: 15, 3: 22, 4: 30, 5: 40, 6: 50, 7: 60 };
    const expectedForWorld = SIGNS_PER_WORLD[maxWorld] || 8;
    const behindOnSigns = unlocked < expectedForWorld * 0.7;

    let score = 0;
    if (unlocked >= 60) score = 5;
    else if (unlocked >= 45) score = 4;
    else if (unlocked >= 30) score = 3;
    else if (unlocked >= 15) score = 2;
    else if (unlocked > 0) score = 1;

    const tips = [];
    if (behindOnSigns) tips.push(`⚠️ Only ${unlocked} star signs for W${maxWorld} — expected ~${expectedForWorld}+`);
    tips.push('💡 Unlock star signs in world order — lower worlds first');
    if (maxWorld >= 3 && unlocked < 25) tips.push('Focus on W1-W3 constellation challenges before pushing further');
    if (!tips.length) tips.push('Star sign progression on track!');
    return { score, detail: `${unlocked} star signs (W${maxWorld})`, tips, tier: _tierFromScore(score) };
  },

  islands(save) {
    const data = save.data || {};
    const sail = _pk(data, 'Sailing');
    if (!Array.isArray(sail)) return { score: 0, detail: 'No data', tips: ['Unlock Sailing to explore islands'], tier: 'early' };

    const islands = Array.isArray(sail[1]) ? sail[1] : [];
    const islandCount = islands.length;
    const artifacts = Array.isArray(sail[3]) ? sail[3] : [];
    const loot = Array.isArray(sail[2]) ? sail[2] : [];

    // Check if player has enough loot/currency to unlock next island
    const totalLoot = loot.reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
    // Approximate island costs (exponential scaling)
    const ISLAND_COSTS = [0, 100, 500, 2000, 8000, 30000, 100000, 500000, 2000000, 10000000, 50000000];
    const nextIslandCost = ISLAND_COSTS[islandCount] || (islandCount > 0 ? Math.pow(10, islandCount) : 100);
    const canUnlockNext = totalLoot >= nextIslandCost;

    let score = 0;
    if (islandCount >= 33) score = 5;
    else if (islandCount >= 25) score = 4;
    else if (islandCount >= 18) score = 3;
    else if (islandCount >= 10) score = 2;
    else if (islandCount > 0) score = 1;

    const tips = [];
    if (canUnlockNext && islandCount < 33) tips.push(`⚠️ Enough resources to unlock island #${islandCount + 1} — do it!`);
    if (islandCount < 33) tips.push(`${islandCount}/33 islands — ${33 - islandCount} remaining`);
    tips.push('💡 Prioritize islands that unlock artifacts and new captains');
    if (!tips.length) tips.push('All islands explored!');
    return { score, detail: `${islandCount}/33 islands explored`, tips, tier: _tierFromScore(score) };
  },

  inventoryBags(save) {
    const data = save.data || {};
    const names = save.charNames || [];
    let maxWorld = 0;
    for (let i = 0; i < names.length; i++) {
      const afk = data[`AFKtarget_${i}`] || '';
      const m = afk.match(/^w(\d+)/);
      if (m) maxWorld = Math.max(maxWorld, parseInt(m[1]));
    }

    // Check inventory bags per character
    const BAG_TYPES = ['Mining', 'Chopping', 'Foods', 'bCraft', 'Fishing', 'Bugs', 'Critters', 'Souls'];
    const charBagIssues = [];

    for (let c = 0; c < names.length; c++) {
      const inv = _pk(data, `InventoryOrder_${c}`);
      const bagData = _pk(data, `InvBagsUsed_${c}`) || _pk(data, `MaxCarryCap_${c}`);
      if (!Array.isArray(inv) && !bagData) continue;

      // Check bag slots — if a bag upgrade exists in the game for a world the player has unlocked
      // Simply count available bag types vs what the character has
      if (bagData && typeof bagData === 'object') {
        const bags = Array.isArray(bagData) ? bagData : Object.values(bagData);
        const missingBags = BAG_TYPES.length - bags.filter(v => v > 0).length;
        if (missingBags > 0) {
          charBagIssues.push({ name: names[c] || `Char ${c}`, missing: missingBags });
        }
      }
    }

    let score = charBagIssues.length === 0 ? 5 : charBagIssues.length <= 3 ? 3 : 1;
    const tips = [];
    if (charBagIssues.length > 0) {
      tips.push(`⚠️ ${charBagIssues.length} characters missing bag upgrades:`);
      for (const ch of charBagIssues.slice(0, 5)) tips.push(`${ch.name}: ${ch.missing} bag types missing`);
      tips.push('💡 Bags come from drops, vendors, and crafting — check each world\'s shop');
    }
    tips.push('Each character needs their own bags (except the first basic bag from merits)');
    if (!tips.length) tips.push('All inventory bags collected!');
    return { score, detail: `${charBagIssues.length} chars with missing bags`, tips, tier: _tierFromScore(score) };
  },

  storageChests(save) {
    const data = save.data || {};
    // Storage chests are one-time unlocks
    const chest = _pk(data, 'ChestOrder') || _pk(data, 'StorageChest');
    const chestQuant = _pk(data, 'ChestQuantity') || _pk(data, 'StorageChestQuant');
    let totalSlots = 0, usedSlots = 0;

    if (Array.isArray(chest)) {
      totalSlots = chest.length;
      usedSlots = chest.filter(v => v && v !== 'Blank' && v !== 'LockedInvSpace' && v !== 'Empty').length;
    }

    // Check for locked slots (could be unlocked with chests)
    const lockedSlots = Array.isArray(chest) ? chest.filter(v => v === 'LockedInvSpace').length : 0;

    let score = 0;
    if (lockedSlots === 0 && totalSlots >= 100) score = 5;
    else if (lockedSlots <= 5) score = 4;
    else if (lockedSlots <= 15) score = 3;
    else if (totalSlots > 0) score = 2;
    else score = 1;

    const tips = [];
    if (lockedSlots > 0) tips.push(`⚠️ ${lockedSlots} storage slots still locked — unlock with chests`);
    tips.push('💡 Storage chests are one-time unlocks — craft, buy, or get from events');
    tips.push('Some chests are from seasonal events — check event shops when available');
    if (!tips.length) tips.push('All storage slots unlocked!');
    return { score, detail: `${totalSlots} total slots, ${lockedSlots} locked`, tips, tier: _tierFromScore(score) };
  },

  bagCapacity(save) {
    const data = save.data || {};
    const names = save.charNames || [];
    // Each collectable type has a bag with tiers
    // MaxCarryCap_X = per character carry capacities
    const BAG_NAMES = ['Mining', 'Chopping', 'Food', 'Material', 'Fishing', 'Bug', 'Critter', 'Soul'];
    const charIssues = [];

    for (let c = 0; c < names.length; c++) {
      const caps = _pk(data, `MaxCarryCap_${c}`);
      if (!caps || typeof caps !== 'object') continue;
      const capArr = Array.isArray(caps) ? caps : Object.values(caps);
      const lowCaps = capArr.filter(v => typeof v === 'number' && v > 0 && v < 5000).length;
      if (lowCaps > 0) {
        charIssues.push({ name: names[c] || `Char ${c}`, lowBags: lowCaps });
      }
    }

    let score = charIssues.length === 0 ? 5 : charIssues.length <= 3 ? 3 : 1;
    const tips = [];
    if (charIssues.length > 0) {
      for (const ch of charIssues.slice(0, 5)) tips.push(`${ch.name}: ${ch.lowBags} bag capacities are low — upgrade them`);
      tips.push('💡 You can skip tiers and go for higher bag upgrades directly');
      tips.push('Bag capacity is also boosted by various bonuses (stamps, alchemy, etc.)');
    }
    if (!tips.length) tips.push('All bag capacities looking good!');
    return { score, detail: `${charIssues.length} chars with low bag capacity`, tips, tier: _tierFromScore(score) };
  },
};

// ────────────────────────────────────────────────────────────────
//  SYSTEM META
// ────────────────────────────────────────────────────────────────
const SYSTEM_META = [
  // World 1
  { key: 'stamps',       icon: '📜', label: 'Stamps',          world: 'W1' },
  { key: 'forge',        icon: '🔨', label: 'Forge',           world: 'W1' },
  { key: 'anvil',        icon: '⚒️', label: 'Anvil',           world: 'W1' },
  { key: 'bribes',       icon: '💰', label: 'Bribes',          world: 'W1' },
  { key: 'statues',      icon: '🗿', label: 'Statues',         world: 'W1' },
  { key: 'cards',        icon: '🃏', label: 'Cards',           world: 'W1' },
  { key: 'postOffice',   icon: '📦', label: 'Post Office',     world: 'W1' },
  // World 2
  { key: 'alchemy',      icon: '⚗️', label: 'Alchemy',         world: 'W2' },
  { key: 'bubbles',      icon: '🫧', label: 'Bubbles',         world: 'W2' },
  { key: 'vials',        icon: '🧪', label: 'Vials',           world: 'W2' },
  { key: 'obols',        icon: '🔵', label: 'Obols',           world: 'W2' },
  // World 3
  { key: 'prayers',      icon: '🙏', label: 'Prayers',         world: 'W3' },
  { key: 'construction', icon: '🏗️', label: 'Construction',    world: 'W3' },
  { key: 'saltLick',     icon: '🧂', label: 'Salt Lick',       world: 'W3' },
  { key: 'refinery',     icon: '🏭', label: 'Refinery',        world: 'W3' },
  { key: 'cogs',         icon: '⚙️', label: 'Cogs',            world: 'W3' },
  { key: 'atoms',        icon: '⚛️', label: 'Atoms',           world: 'W3' },
  { key: 'printer',      icon: '🖨️', label: '3D Printer',      world: 'W3' },
  { key: 'traps',        icon: '🪤', label: 'Trapping',        world: 'W3' },
  { key: 'towerDefense', icon: '🛡️', label: 'Tower Defense',   world: 'W3' },
  { key: 'dungeons',     icon: '🏰', label: 'Dungeons',        world: 'W3' },
  // World 4
  { key: 'lab',          icon: '🔬', label: 'Lab',             world: 'W4' },
  { key: 'breeding',     icon: '🐣', label: 'Breeding',        world: 'W4' },
  { key: 'pets',         icon: '🐕', label: 'Pets',            world: 'W4' },
  { key: 'cooking',      icon: '🍳', label: 'Cooking',         world: 'W4' },
  // World 5
  { key: 'sailing',      icon: '⛵', label: 'Sailing',         world: 'W5' },
  { key: 'gaming',       icon: '🎮', label: 'Gaming',          world: 'W5' },
  { key: 'gamingSprout', icon: '🌱', label: 'Sprouts',         world: 'W5' },
  { key: 'divinity',     icon: '✨', label: 'Divinity',        world: 'W5' },
  // World 6
  { key: 'farming',      icon: '🌾', label: 'Farming',         world: 'W6' },
  { key: 'farmUpgrades', icon: '🚜', label: 'Farm Upgrades',   world: 'W6' },
  { key: 'summoning',    icon: '👻', label: 'Summoning',       world: 'W6' },
  { key: 'sneaking',     icon: '🥷', label: 'Sneaking',        world: 'W6' },
  { key: 'beanstalk',    icon: '🌿', label: 'Beanstalk',      world: 'W6' },
  { key: 'jars',         icon: '🏺', label: 'Collectibles',    world: 'W6' },
  // World 7
  { key: 'spelunking',   icon: '⛏️', label: 'Spelunking',      world: 'W7' },
  { key: 'holes',        icon: '🕳️', label: 'The Hole',        world: 'W7' },
  { key: 'emperor',      icon: '👑', label: 'Emperor Showdown', world: 'W7' },
  { key: 'villager',     icon: '🏘️', label: 'Villagers',       world: 'W7' },
  // Cross-world
  { key: 'starSigns',    icon: '⭐', label: 'Star Signs',      world: 'All' },
  { key: 'tasks',        icon: '📋', label: 'Merit Shop',      world: 'All' },
  { key: 'deathNote',    icon: '💀', label: 'Death Note',      world: 'All' },
  { key: 'rift',         icon: '🌀', label: 'Rift',            world: 'All' },
  { key: 'arcane',       icon: '🔮', label: 'Arcane',          world: 'All' },
  { key: 'grimoire',     icon: '📖', label: 'Grimoire',        world: 'All' },
  { key: 'vault',        icon: '🔐', label: 'Vault',           world: 'All' },
  { key: 'compass',      icon: '🧭', label: 'Compass',         world: 'All' },
  { key: 'dream',        icon: '💤', label: 'Equinox / Dreams', world: 'All' },
  { key: 'territory',    icon: '🏴', label: 'Territories',     world: 'All' },
  { key: 'weeklyBoss',   icon: '👹', label: 'Weekly Boss',     world: 'All' },
  { key: 'armorSets',    icon: '🛡️', label: 'Armor Sets',      world: 'All' },
  { key: 'research',     icon: '🔎', label: 'Research',        world: 'All' },
  // Prisma & Exalted
  { key: 'prismaMulti',   icon: '💎', label: 'Prisma Multi',    world: 'All' },
  { key: 'exaltedStamps', icon: '🏅', label: 'Exalted Stamps',  world: 'All' },
  // New Systems
  { key: 'minibosses',      icon: '🐉', label: 'Minibosses',          world: 'All' },
  { key: 'superTalentPoints', icon: '⭐', label: 'Super Talent Pts',  world: 'All' },
  { key: 'worship',         icon: '🛐', label: 'Worship',             world: 'W3' },
  { key: 'friends',         icon: '🤝', label: 'Friends / Social',    world: 'All' },
  { key: 'constellations',  icon: '🌌', label: 'Constellations',      world: 'All' },
  { key: 'islands',         icon: '🏝️', label: 'Island Priority',     world: 'W5' },
  { key: 'inventoryBags',   icon: '🎒', label: 'Inventory Bags',      world: 'All' },
  { key: 'storageChests',   icon: '�️', label: 'Storage Chests',      world: 'All' },
  { key: 'bagCapacity',     icon: '💼', label: 'Bag Capacity',        world: 'All' },
];

// ────────────────────────────────────────────────────────────────
//  MAIN ANALYZER
// ────────────────────────────────────────────────────────────────
export function analyzeAccount(save) {
  if (!save || !save.data) throw new Error('Invalid save data');

  const tier = detectTier(save);
  const characters = parseCharacters(save);

  const systems = [];
  for (const meta of SYSTEM_META) {
    const scorer = systemScorers[meta.key];
    if (!scorer) continue;
    let result;
    try { result = scorer(save, tier); } catch { result = { score: 0, detail: 'Error', tips: ['Could not analyze'], tier: 'early' }; }
    systems.push({
      ...meta,
      score: result.score,
      detail: result.detail,
      tips: result.tips || [],
      systemTier: result.tier,
      behind: TIERS.indexOf(result.tier) < TIERS.indexOf(tier),
      ...(result.breakdown ? { breakdown: result.breakdown } : {}),
    });
  }

  const priorities = systems
    .filter(s => s.behind || s.score <= 3)
    .sort((a, b) => a.score - b.score)
    .slice(0, 8)
    .map(s => ({
      system: s.label,
      icon: s.icon,
      world: s.world,
      score: s.score,
      tips: s.tips,
      reason: `${s.label} is at ${TIER_LABELS[s.systemTier] || s.systemTier} level — ${s.detail}`,
    }));

  const avgScore = systems.length > 0 ? systems.reduce((s, x) => s + x.score, 0) / systems.length : 0;
  const maxedCount = systems.filter(s => s.score >= 5).length;
  const behindCount = systems.filter(s => s.behind).length;

  // Progression tier recommendations (JSON-driven)
  let gearRecommendations = [];
  try { gearRecommendations = getProgressionRecommendations(save, characters); } catch (e) { console.error('[IdleonReview] Progression error:', e.message); }

  return {
    tier,
    tierLabel: TIER_LABELS[tier],
    tierColor: TIER_COLORS[tier],
    accountAge: save.accountCreateTime ? Math.floor((Date.now() - save.accountCreateTime) / (1000 * 60 * 60 * 24)) : null,
    characterCount: characters.length,
    characters,
    systems,
    priorities,
    gearRecommendations,
    summary: {
      avgScore: Math.round(avgScore * 10) / 10,
      maxedCount,
      behindCount,
      totalSystems: systems.length,
    },
  };
}

export { TIER_LABELS, TIER_COLORS, TIERS, SKILL_NAMES };

// ────────────────────────────────────────────────────────────────
//  BENCHMARK SYSTEM — per-tier aggregated reference data
//  Uses in-memory cache + debounced async writes
// ────────────────────────────────────────────────────────────────
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __bmDir = path.dirname(fileURLToPath(import.meta.url));
const BENCHMARK_PATH = path.resolve(__bmDir, '..', 'data', 'idleon-benchmarks.json');

function _emptyBenchmarks() {
  const bm = {};
  for (const t of TIERS) bm[t] = { count: 0, systems: {} };
  return bm;
}

// ── In-memory caches ──
let _benchmarkCache = null;
let _benchmarkDirty = false;
let _benchmarkSaveTimer = null;
const BENCHMARK_SAVE_INTERVAL = 30_000; // flush to disk every 30s max

let _progTiersCache = null;
let _progTiersMtime = 0;

// ── Review result cache per user ──
const _reviewCache = new Map(); // userId -> { result, analyzedAt, lastAccessedAt }
const REVIEW_TTL = 3 * 24 * 60 * 60 * 1000; // 3 days
const REVIEW_COOLDOWN = 2 * 60 * 60 * 1000; // 2 hours between analyses
let _reviewCleanupTimer = null;

function _initReviewCleanup() {
  if (_reviewCleanupTimer) return;
  _reviewCleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [uid, entry] of _reviewCache) {
      if (now - entry.lastAccessedAt > REVIEW_TTL) _reviewCache.delete(uid);
    }
  }, 60 * 60 * 1000); // cleanup every hour
  _reviewCleanupTimer.unref?.();
}
_initReviewCleanup();

export function getCachedReview(userId) {
  const entry = _reviewCache.get(userId);
  if (!entry) return null;
  if (Date.now() - entry.lastAccessedAt > REVIEW_TTL) {
    _reviewCache.delete(userId);
    return null;
  }
  entry.lastAccessedAt = Date.now();
  return { result: entry.result, analyzedAt: entry.analyzedAt, cached: true };
}

export function setCachedReview(userId, result) {
  _reviewCache.set(userId, {
    result,
    analyzedAt: Date.now(),
    lastAccessedAt: Date.now(),
  });
}

export function canAnalyze(userId) {
  const entry = _reviewCache.get(userId);
  if (!entry) return { allowed: true };
  const elapsed = Date.now() - entry.analyzedAt;
  if (elapsed >= REVIEW_COOLDOWN) return { allowed: true };
  const remaining = REVIEW_COOLDOWN - elapsed;
  const mins = Math.ceil(remaining / 60_000);
  return { allowed: false, remainingMs: remaining, remainingMins: mins };
}

export function getReviewCacheStats() {
  return { cachedUsers: _reviewCache.size, ttlDays: 3, cooldownHours: 2 };
}

// ── Benchmark cache functions ──

function _loadBenchmarksFromDisk() {
  try {
    if (fs.existsSync(BENCHMARK_PATH)) {
      return JSON.parse(fs.readFileSync(BENCHMARK_PATH, 'utf-8'));
    }
  } catch { /* ignore */ }
  return _emptyBenchmarks();
}

export function loadBenchmarks() {
  if (!_benchmarkCache) _benchmarkCache = _loadBenchmarksFromDisk();
  return _benchmarkCache;
}

function _scheduleBenchmarkSave() {
  if (_benchmarkSaveTimer) return;
  _benchmarkSaveTimer = setTimeout(() => {
    _benchmarkSaveTimer = null;
    if (_benchmarkDirty && _benchmarkCache) {
      try {
        fs.writeFile(BENCHMARK_PATH, JSON.stringify(_benchmarkCache, null, 2), (err) => {
          if (err) console.error('[IdleonBenchmark] Async save error:', err.message);
        });
        _benchmarkDirty = false;
      } catch (e) { console.error('[IdleonBenchmark] Save error:', e.message); }
    }
  }, BENCHMARK_SAVE_INTERVAL);
  _benchmarkSaveTimer.unref?.();
}

export function saveBenchmarks(bm) {
  _benchmarkCache = bm;
  _benchmarkDirty = true;
  _scheduleBenchmarkSave();
}

export function flushBenchmarks() {
  if (_benchmarkDirty && _benchmarkCache) {
    try {
      fs.writeFileSync(BENCHMARK_PATH, JSON.stringify(_benchmarkCache, null, 2));
      _benchmarkDirty = false;
    } catch (e) { console.error('[IdleonBenchmark] Flush error:', e.message); }
  }
}

/**
 * Update benchmarks with the result of an analysis.
 * All in-memory, async write to disk.
 */
export function updateBenchmarks(tier, systems) {
  const bm = loadBenchmarks();
  if (!bm[tier]) bm[tier] = { count: 0, systems: {} };
  bm[tier].count++;
  for (const sys of systems) {
    if (!bm[tier].systems[sys.key]) bm[tier].systems[sys.key] = { sumScore: 0, bestScore: 0, count: 0 };
    const entry = bm[tier].systems[sys.key];
    entry.sumScore += sys.score;
    entry.count++;
    if (sys.score > entry.bestScore) entry.bestScore = sys.score;
  }
  saveBenchmarks(bm);
  return bm;
}

/**
 * Get benchmark comparison for a tier's systems.
 * Returns { [systemKey]: { avg, best } }
 */
export function getBenchmarkComparison(tier) {
  const bm = loadBenchmarks();
  const tierData = bm[tier];
  if (!tierData || tierData.count === 0) return null;
  const comparison = {};
  for (const [key, entry] of Object.entries(tierData.systems)) {
    comparison[key] = {
      avg: entry.count > 0 ? Math.round((entry.sumScore / entry.count) * 10) / 10 : 0,
      best: entry.bestScore,
      sampleSize: entry.count,
    };
  }
  return comparison;
}

// ────────────────────────────────────────────────────────────────
//  PROGRESSION TIER RECOMMENDATIONS — JSON-driven, no coding needed
// ────────────────────────────────────────────────────────────────
const PROG_TIERS_PATH = path.resolve(__bmDir, '..', 'data', 'progression-tiers.json');

function loadProgressionTiers() {
  try {
    if (!fs.existsSync(PROG_TIERS_PATH)) return null;
    const stat = fs.statSync(PROG_TIERS_PATH);
    const mtime = stat.mtimeMs;
    if (_progTiersCache && mtime === _progTiersMtime) return _progTiersCache;
    _progTiersCache = JSON.parse(fs.readFileSync(PROG_TIERS_PATH, 'utf-8'));
    _progTiersMtime = mtime;
    return _progTiersCache;
  } catch (e) { console.error('[ProgressionTiers] Load error:', e.message); }
  return null;
}

/**
 * Given a save and parsed characters, generate gear/equipment progression recommendations.
 * Returns array of { category, icon, label, currentTier, recommendation, charsNeedingUpgrade? }
 */
export function getProgressionRecommendations(save, characters) {
  const config = loadProgressionTiers();
  if (!config || !config.categories) return [];

  // Determine max world reached
  const data = save.data || {};
  let maxWorld = 0;
  for (let i = 0; i < 12; i++) {
    const afk = data[`AFKtarget_${i}`] || '';
    const m = afk.match(/^w(\d+)/);
    if (m) maxWorld = Math.max(maxWorld, parseInt(m[1]));
  }

  const recommendations = [];

  for (const [catKey, cat] of Object.entries(config.categories)) {
    // Skip food_beanstalk for now — custom logic
    if (catKey === 'food_beanstalk') {
      const foodRecs = _evaluateBeanstalk(save, characters, cat, maxWorld);
      if (foodRecs) recommendations.push(foodRecs);
      continue;
    }

    // Skip if player hasn't reached the category's required world
    if (cat.world && cat.world > maxWorld) continue;

    const tiers = cat.tiers || [];
    if (tiers.length === 0) continue;

    if (cat.mode === 'allChars') {
      const rec = _evaluateAllCharsCategory(characters, cat, catKey, tiers, maxWorld);
      if (rec) recommendations.push(rec);
    } else {
      const rec = _evaluateHighestCategory(characters, cat, catKey, tiers, maxWorld);
      if (rec) recommendations.push(rec);
    }
  }

  return recommendations;
}

/**
 * For "allChars" mode: find highest tier any character has,
 * check if all characters have it, recommend equipping on everyone or next tier.
 */
function _evaluateAllCharsCategory(characters, cat, catKey, tiers, maxWorld) {
  // For each character, find their highest tier index
  const charTiers = characters.map(c => {
    const equipped = _getEquippedItems(c, cat);
    let highestTierIdx = -1;
    for (let t = tiers.length - 1; t >= 0; t--) {
      if (_charHasTier(equipped, tiers[t])) {
        highestTierIdx = t;
        break;
      }
    }
    return { name: c.name, tierIdx: highestTierIdx };
  });

  // Find the global highest tier any character has
  const globalHighest = Math.max(...charTiers.map(ct => ct.tierIdx));
  if (globalHighest < 0) {
    // Nobody has any tier — recommend first tier if world allows
    const first = tiers.find(t => !t.world || t.world <= maxWorld);
    if (!first) return null;
    return {
      category: catKey, icon: cat.icon, label: cat.label,
      currentTier: null, currentTierIdx: -1,
      recommendation: `Get ${first.name} on all characters`,
      targetTier: first.name, status: 'start',
      charsNeedingUpgrade: characters.map(c => c.name),
    };
  }

  const currentTier = tiers[globalHighest];
  const charsWithout = charTiers.filter(ct => ct.tierIdx < globalHighest).map(ct => ct.name);

  if (charsWithout.length > 0) {
    // Some characters don't have the highest tier yet
    return {
      category: catKey, icon: cat.icon, label: cat.label,
      currentTier: currentTier.name, currentTierIdx: globalHighest,
      recommendation: `Equip ${currentTier.name} on all characters (${charsWithout.length} missing)`,
      targetTier: currentTier.name, status: 'equip-all',
      charsNeedingUpgrade: charsWithout,
    };
  }

  // Everyone has the current tier — recommend next
  const nextIdx = globalHighest + 1;
  if (nextIdx >= tiers.length) {
    return {
      category: catKey, icon: cat.icon, label: cat.label,
      currentTier: currentTier.name, currentTierIdx: globalHighest,
      recommendation: null, targetTier: null, status: 'maxed',
    };
  }
  const nextTier = tiers[nextIdx];
  if (nextTier.world && nextTier.world > maxWorld) {
    return {
      category: catKey, icon: cat.icon, label: cat.label,
      currentTier: currentTier.name, currentTierIdx: globalHighest,
      recommendation: null, targetTier: null, status: 'maxed-for-world',
    };
  }
  return {
    category: catKey, icon: cat.icon, label: cat.label,
    currentTier: currentTier.name, currentTierIdx: globalHighest,
    recommendation: `Upgrade to ${nextTier.name}`,
    targetTier: nextTier.name, status: 'next-tier',
  };
}

function _evaluateHighestCategory(characters, cat, catKey, tiers, maxWorld) {
  let globalHighest = -1;
  for (const c of characters) {
    const equipped = _getEquippedItems(c, cat);
    for (let t = tiers.length - 1; t >= 0; t--) {
      if (_charHasTier(equipped, tiers[t])) {
        if (t > globalHighest) globalHighest = t;
        break;
      }
    }
  }

  const currentTier = globalHighest >= 0 ? tiers[globalHighest] : null;
  const nextIdx = globalHighest + 1;
  if (nextIdx >= tiers.length) {
    return {
      category: catKey, icon: cat.icon, label: cat.label,
      currentTier: currentTier?.name || null, currentTierIdx: globalHighest,
      recommendation: null, status: 'maxed',
    };
  }
  const next = tiers[nextIdx];
  if (next.world && next.world > maxWorld) {
    return {
      category: catKey, icon: cat.icon, label: cat.label,
      currentTier: currentTier?.name || null, currentTierIdx: globalHighest,
      recommendation: null, status: 'maxed-for-world',
    };
  }
  return {
    category: catKey, icon: cat.icon, label: cat.label,
    currentTier: currentTier?.name || null, currentTierIdx: globalHighest,
    recommendation: `Upgrade to ${next.name}`,
    targetTier: next.name, status: 'next-tier',
  };
}

function _getEquippedItems(character, cat) {
  const eq = character.equipment || {};
  if (cat.matchSlot) {
    // Filter to specific slot (e.g. "Pendant", "Ring", "Trap")
    const slot = cat.matchSlot;
    const items = [];
    if (eq.armor) items.push(...eq.armor.filter(e => e.slot === slot));
    if (eq.tools) items.push(...eq.tools.filter(e => e.slot === slot));
    return items.map(e => e.rawName);
  }
  if (cat.equipSlot === 'armor') return (eq.armor || []).map(e => e.rawName);
  if (cat.equipSlot === 'tools') return (eq.tools || []).map(e => e.rawName);
  return [...(eq.armor || []), ...(eq.tools || [])].map(e => e.rawName);
}

function _charHasTier(equippedRawNames, tier) {
  // Match by items list (exact rawNames)
  if (tier.items && tier.items.length > 0) {
    return tier.items.some(item => equippedRawNames.includes(item));
  }
  // Match by keywords (rawName contains keyword)
  if (tier.keywords && tier.keywords.length > 0) {
    return equippedRawNames.some(raw =>
      tier.keywords.some(kw => raw.toLowerCase().includes(kw.toLowerCase()))
    );
  }
  return false;
}

function _evaluateBeanstalk(save, characters, cat, maxWorld) {
  if (cat.world && cat.world > maxWorld) return null;

  // Beanstalk data is in save.data — look for gold food amounts
  const data = save.data || {};
  const tiers = cat.tiers || [];

  // Check food in characters' equipped food slots
  // For now, simplified: check if the hampter gummy is equipped
  const foodAdvice = cat.foodAdvice || {};
  const hampterRaw = foodAdvice.hampterGummyRawName || 'FoodG10';

  // Check if any character has the hampter gummy in food slots
  let hasHampter = false;
  for (const c of characters) {
    const equipOrder = data[`EquipOrder_${c.index}`];
    if (Array.isArray(equipOrder) && Array.isArray(equipOrder[2])) {
      if (equipOrder[2].includes(hampterRaw)) { hasHampter = true; break; }
    }
  }

  const tips = [];
  if (!hasHampter && maxWorld >= 6) {
    tips.push('Get Golden Hampter Gummy Candy on your characters for food bonuses');
  }

  if (tips.length === 0) return null;

  return {
    category: 'food_beanstalk', icon: cat.icon, label: cat.label,
    currentTier: null, currentTierIdx: -1,
    recommendation: tips[0],
    status: 'advice', tips,
  };
}
