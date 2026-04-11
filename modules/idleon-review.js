/**
 * Idleon Account Review — Analyzer Module v2
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
  12:'Jman',22:'Wizard',29:'Infinilyte',40:'Beast Master',
};

const SKILL_NAMES = [
  'Character','Mining','Smithing','Chopping','Fishing','Alchemy',
  'Catching','Trapping','Construction','Worship','Cooking','Breeding',
  'Lab','Sailing','Divinity','Gaming','Farming','Sneaking','Summoning','Hole','W7Skill'
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

const VIAL_MAX_LEVEL = 13;

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
      index: i, name: names[i] || `Char_${i}`,
      classId: cls, className: CLASS_MAP[cls] || `Class ${cls}`,
      level: skills[0] || 0, skills: skills.slice(0, SKILL_NAMES.length),
      afkTarget: afk, afkWorld: afk.match(/^w(\d+)/)?.[1] || '?',
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
    for (let i = 0; i < names.length; i++) {
      let ap = _pk(data, `AnvilPA_${i}`);
      if (!Array.isArray(ap)) continue;
      chars++;
      const prod = ap.reduce((s, e) => s + (e && typeof e === 'object' ? (e['3'] || e[3] || 0) : 0), 0);
      totalProd += prod;
    }
    if (chars === 0) return { score: 0, detail: 'No data', tips: ['Use the anvil in W1'], tier: 'early' };
    let score = chars >= 10 ? 4 : chars >= 6 ? 3 : chars >= 3 ? 2 : 1;
    if (totalProd > 1e12) score = 5;
    const tips = [];
    if (chars < names.length) tips.push(`Only ${chars}/${names.length} characters have anvil data`);
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
    let st = _pk(data, 'StatueLevels_0');
    if (!Array.isArray(st)) return { score: 0, detail: 'No data', tips: ['Level up statues by collecting statue drops'], tier: 'early' };
    const levels = st.filter(Array.isArray).map(e => e[0] || 0);
    const total = levels.length;
    const maxLv = Math.max(0, ...levels);
    const avgLv = levels.length > 0 ? levels.reduce((a, b) => a + b, 0) / levels.length : 0;
    const gold = st.filter(Array.isArray).filter(e => (e[1] || 0) > 0).length;
    const low = levels.filter(v => v > 0 && v < avgLv * .5).length;
    let score = 0;
    if (avgLv >= 300 && maxLv >= 400) score = 5; else if (avgLv >= 150) score = 4; else if (avgLv >= 50) score = 3; else if (avgLv >= 10) score = 2; else score = 1;
    const tips = [];
    if (low > 0) tips.push(`${low} statues significantly below avg (${Math.round(avgLv)}) — level them up`);
    if (gold < total) tips.push(`${gold}/${total} statues golden — make them all gold`);
    if (maxLv < 200 && score >= 2) tips.push(`Max statue lv ${maxLv} — push higher`);
    if (!tips.length) tips.push('Statues looking good!');
    return { score, detail: `${total} statues, avg lv ${Math.round(avgLv)}, max ${maxLv}, ${gold} gold`, tips, tier: _tierFromScore(score) };
  },

  cards(save) {
    const c0 = _pk(save.data, 'Cards0');
    if (!c0 || typeof c0 !== 'object') return { score: 0, detail: 'No data', tips: ['Collect cards from monsters'], tier: 'early' };
    const entries = Object.entries(c0).filter(([, v]) => typeof v === 'number');
    const count = entries.length;
    const stars = entries.map(([, v]) => v);
    // Star distribution
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
    let score = 0;
    if (count >= 200 && highStar >= 100) score = 5;
    else if (count >= 180 && highStar >= 50) score = 4;
    else if (count >= 150) score = 3;
    else if (count >= 80) score = 2;
    else if (count > 0) score = 1;
    const tips = [];
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
    let cauldUpg = _pk(save.data, 'CauldUpgLVs') || save.data?.CauldUpgLVs;
    const CAULDRON = ['Power', 'Speed', 'Liquid', 'Trench'];
    let parts = [], tips = [], score = 0;
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
    if (!parts.length) return { score: 0, detail: 'No data', tips: ['Start alchemy in W2'], tier: 'early' };
    if (!tips.length) tips.push('Alchemy is strong!');
    return { score, detail: parts.join(', '), tips, tier: _tierFromScore(score) };
  },

  bubbles(save) {
    // Look at actual bubble levels across all cauldrons
    // CauldronBubbles = array of bubble objects with level info
    const data = save.data || {};
    const CAULDRON = ['Power', 'Speed', 'Liquid', 'Trench'];
    let totalBubbles = 0, maxed99 = 0, below99 = 0, maxLv = 0;
    const perCauldron = [];

    // Try CauldUpgLVs for individual bubble levels
    // Also check for bubble-specific keys like CauldronBubbles
    const cb = _pk(data, 'CauldronBubbles');
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

    // Fallback: check CauldronInfo for bubble aggregate data
    if (totalBubbles === 0) {
      const info = _pk(data, 'CauldronInfo');
      if (!Array.isArray(info)) return { score: 0, detail: 'No data', tips: ['Level up bubbles in alchemy'], tier: 'early' };
      // CauldronInfo stores aggregate — check for p2w/vial counts
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

    const tips = [];
    for (const c of perCauldron) {
      if (c.below > 0) tips.push(`${c.name}: ${c.below} bubbles below lv 99 — get them to 99`);
    }
    if (below99 === 0) tips.push('All bubbles at 99+!');
    if (!tips.length) tips.push(`${Math.round(pct99 * 100)}% of bubbles at lv 99+`);
    return { score, detail: `${totalBubbles} bubbles — ${maxed99} at 99+, ${below99} below 99 (${Math.round(pct99*100)}%)`, tips, tier: _tierFromScore(score) };
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
    }
    if (zero > 0) tips.push(`${zero} vials at lv 0 — discover them`);
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
    let totalObols = 0;
    for (let i = 0; i < 12; i++) {
      const ob = _pk(data, `ObolEqO0_${i}`);
      if (Array.isArray(ob)) totalObols += ob.filter(v => v && v !== 'Blank' && v !== 'None').length;
    }
    if (totalObols === 0) return { score: 0, detail: 'No data', tips: ['Equip obols from W2'], tier: 'early' };
    let score = 0;
    if (totalObols >= 150) score = 5; else if (totalObols >= 100) score = 4; else if (totalObols >= 60) score = 3; else if (totalObols >= 20) score = 2; else score = 1;
    const tips = [];
    if (totalObols < 100) tips.push(`${totalObols} obols equipped across characters — equip more for stat boosts`);
    if (!tips.length) tips.push('Obol slots well-filled!');
    return { score, detail: `${totalObols} obols equipped`, tips, tier: _tierFromScore(score) };
  },

  // ═══════════ WORLD 3 ═══════════

  prayers(save) {
    let pr = _pk(save.data, 'PrayOwned');
    if (!Array.isArray(pr)) return { score: 0, detail: 'No data', tips: ['Unlock prayers in W3'], tier: 'early' };
    // Filter out unreleased prayers
    const released = [];
    for (let i = 0; i < pr.length; i++) {
      const maxLv = i < PRAYER_MAX.length ? PRAYER_MAX[i] : -1;
      if (maxLv < 0) continue; // unreleased
      released.push({ i, lv: typeof pr[i] === 'number' ? pr[i] : 0, max: maxLv });
    }
    const total = released.length;
    const maxed = released.filter(p => p.lv >= p.max).length;
    const notMaxed = released.filter(p => p.lv > 0 && p.lv < p.max);
    let score = 0;
    if (maxed >= total && total > 0) score = 5;
    else if (maxed >= total * .8) score = 4;
    else if (maxed >= total * .5) score = 3;
    else if (maxed >= 5) score = 2;
    else score = 1;
    const tips = [];
    if (notMaxed.length > 0) {
      const bot = notMaxed.sort((a, b) => a.lv - b.lv).slice(0, 5);
      tips.push(`Not maxed: ${bot.map(p => `#${p.i + 1} lv ${p.lv}/${p.max}`).join(', ')}`);
    }
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
    const pr = _pk(save.data, 'Print');
    if (!Array.isArray(pr)) return { score: 0, detail: 'No data', tips: ['Use the 3D Printer in W3'], tier: 'early' };
    const active = pr.filter(x => x !== 0 && x !== '' && x !== 'Blank').length;
    let score = 0;
    if (active >= 120) score = 5; else if (active >= 80) score = 4; else if (active >= 40) score = 3; else if (active >= 15) score = 2; else if (active > 0) score = 1;
    const tips = [];
    if (active < pr.length) tips.push(`${pr.length - active} printer slots inactive — fill them`);
    if (!tips.length) tips.push('Printer fully active!');
    return { score, detail: `${active}/${pr.length} active samples`, tips, tier: _tierFromScore(score) };
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
    if (flurboLeveled < flurboTotal) tips.push(`${flurboTotal - flurboLeveled} flurbo upgrades not bought`);
    if (rngOwned < rngItems.length && rngItems.length > 0) tips.push(`${rngItems.length - rngOwned} RNG items not obtained — keep running dungeons`);
    if (dungUpgNotMaxed.length > 0) tips.push(`${dungUpgNotMaxed.length} dungeon upgrades not maxed`);
    if (!hornUnlocked && score >= 2) tips.push('Dungeon horn not unlocked — unlock it for bonus runs');
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
    let div = _pk(save.data, 'Divinity') || save.data?.Divinity;
    if (!Array.isArray(div)) return { score: 0, detail: 'No data', tips: ['Unlock Divinity in W5'], tier: 'early' };
    const charGods = div.slice(0, 12);
    const linked = charGods.filter(v => typeof v === 'number' && v > 0).length;
    const unlinked = charGods.filter(v => typeof v === 'number' && v === 0).length;
    const godPts = div.slice(29, 40).filter(v => typeof v === 'number');
    const lowGods = godPts.filter(v => v > 0 && v < 150).length;
    let score = 0;
    if (linked >= 10 && div.length >= 35) score = 5; else if (linked >= 8) score = 4; else if (linked >= 5) score = 3; else if (linked >= 2) score = 2; else score = 1;
    const tips = [];
    if (unlinked > 0) tips.push(`${unlinked} chars not linked to a god`);
    if (lowGods > 0) tips.push(`${lowGods} gods with low offerings — increase them`);
    if (!tips.length) tips.push('Divinity maxed!');
    return { score, detail: `${linked}/12 chars linked, ${godPts.length} gods`, tips, tier: _tierFromScore(score) };
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

// ────────────────────────────────────────────────────────────────
//  BENCHMARK SYSTEM — per-tier aggregated reference data
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

export function loadBenchmarks() {
  try {
    if (fs.existsSync(BENCHMARK_PATH)) {
      return JSON.parse(fs.readFileSync(BENCHMARK_PATH, 'utf-8'));
    }
  } catch { /* ignore */ }
  return _emptyBenchmarks();
}

export function saveBenchmarks(bm) {
  try {
    fs.writeFileSync(BENCHMARK_PATH, JSON.stringify(bm, null, 2));
  } catch (e) { console.error('[IdleonBenchmark] Save error:', e.message); }
}

/**
 * Update benchmarks with the result of an analysis.
 * Stores running sum & best per system, plus count for averaging.
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
