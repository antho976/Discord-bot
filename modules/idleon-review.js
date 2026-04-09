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

// ── Helpers ──
function _pk(data, key) {
  let v = data[key];
  if (v == null) return null;
  if (typeof v === 'string') try { v = JSON.parse(v); } catch { return null; }
  return v;
}
function _tierFromScore(s) { return s >= 5 ? 'ultra' : s >= 4 ? 'endgame' : s >= 3 ? 'late' : s >= 2 ? 'mid' : 'early'; }
function _fmtBig(n) { return n >= 1e6 ? n.toExponential(2) : Number(n).toLocaleString('en-US'); }

/**
 * Detect the player's overall tier based on AFK targets, levels, and unlocked systems.
 */
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

// ────────────────────────────────────────────────────────────────
//  SYSTEM SCORERS — each returns { score:0-5, detail, tips[], tier }
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
    // Per-char anvil production. Check AnvilPA_0..11
    const data = save.data || {};
    const names = save.charNames || [];
    let totalProd = 0, chars = 0, lowChars = [];
    for (let i = 0; i < names.length; i++) {
      let ap = _pk(data, `AnvilPA_${i}`);
      if (!Array.isArray(ap)) continue;
      chars++;
      // Each entry is {0: hammers, 1: speed, 2: cap, 3: produced}
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
    // Per-char statue levels: StatueLevels_0 is array of [level, xp] pairs
    const data = save.data || {};
    let st = _pk(data, 'StatueLevels_0');
    if (!Array.isArray(st)) return { score: 0, detail: 'No data', tips: ['Level up statues by collecting statue drops'], tier: 'early' };
    const levels = st.filter(Array.isArray).map(e => e[0] || 0);
    const total = levels.length;
    const maxLv = Math.max(0, ...levels);
    const avgLv = levels.length > 0 ? levels.reduce((a, b) => a + b, 0) / levels.length : 0;
    const low = levels.filter(v => v > 0 && v < avgLv * .5).length;
    let score = 0;
    if (avgLv >= 300 && maxLv >= 400) score = 5; else if (avgLv >= 150) score = 4; else if (avgLv >= 50) score = 3; else if (avgLv >= 10) score = 2; else score = 1;
    const tips = [];
    if (low > 0) tips.push(`${low} statues significantly below avg (${Math.round(avgLv)}) — level them up`);
    if (maxLv < 200 && score >= 2) tips.push(`Max statue lv ${maxLv} — push higher`);
    if (!tips.length) tips.push('Statues looking good!');
    return { score, detail: `${total} statues, avg lv ${Math.round(avgLv)}, max ${maxLv}`, tips, tier: _tierFromScore(score) };
  },

  cards(save) {
    const c0 = _pk(save.data, 'Cards0');
    if (!c0 || typeof c0 !== 'object') return { score: 0, detail: 'No data', tips: ['Collect cards from monsters'], tier: 'early' };
    const entries = Object.entries(c0).filter(([, v]) => typeof v === 'number');
    const count = entries.length;
    const stars = entries.map(([, v]) => v);
    const maxStar = Math.max(0, ...stars);
    let score = 0;
    if (count >= 200 && maxStar >= 5) score = 5; else if (count >= 150) score = 4; else if (count >= 100) score = 3; else if (count >= 50) score = 2; else if (count > 0) score = 1;
    const tips = [];
    if (count < 200) tips.push(`${count} cards collected — keep farming for more`);
    if (!tips.length) tips.push('Card collection is strong!');
    return { score, detail: `${count} cards collected`, tips, tier: _tierFromScore(score) };
  },

  postOffice(save) {
    const po0 = _pk(save.data, 'PostOfficeInfo0') || save.data?.PostOfficeInfo0;
    const po1 = _pk(save.data, 'PostOfficeInfo1') || save.data?.PostOfficeInfo1;
    if (!Array.isArray(po0)) return { score: 0, detail: 'No data', tips: ['Use the Post Office in W1'], tier: 'early' };
    const boxes = po0.length;
    // PO1 entries have order levels
    let maxOrder = 0; let totalOrders = 0;
    if (Array.isArray(po1)) for (const e of po1) { if (e && typeof e === 'object') { const v = e['0'] || e[0] || 0; if (typeof v === 'number' && v > 0) { totalOrders++; if (v > maxOrder) maxOrder = v; } } }
    let score = 0;
    if (boxes >= 6 && maxOrder >= 10000) score = 5; else if (boxes >= 6 && maxOrder >= 1000) score = 4; else if (boxes >= 5) score = 3; else if (boxes >= 3) score = 2; else score = 1;
    const tips = [];
    if (boxes < 6) tips.push(`Only ${boxes} delivery boxes — unlock more`);
    if (maxOrder < 1000 && score >= 2) tips.push(`Max delivery orders: ${maxOrder} — keep delivering`);
    if (!tips.length) tips.push('Post Office is well-used!');
    return { score, detail: `${boxes} boxes, max orders ${_fmtBig(maxOrder)}`, tips, tier: _tierFromScore(score) };
  },

  colosseum(save) {
    const col = save.data?.FamValColosseumHighscores;
    if (!Array.isArray(col)) return { score: 0, detail: 'No data', tips: ['Try Colosseum battles'], tier: 'early' };
    const played = col.filter(v => typeof v === 'number' && v > 0).length;
    const maxScore = Math.max(0, ...col.filter(v => typeof v === 'number'));
    let score = 0;
    if (played >= 7 && maxScore >= 1e7) score = 5; else if (played >= 6) score = 4; else if (played >= 4) score = 3; else if (played >= 2) score = 2; else if (played > 0) score = 1;
    const tips = [];
    if (played < col.length) tips.push(`${col.length - played} colosseum tiers not attempted`);
    if (!tips.length) tips.push('Colosseum progression solid!');
    return { score, detail: `${played}/${col.length} tiers played, best ${_fmtBig(maxScore)}`, tips, tier: _tierFromScore(score) };
  },

  // ═══════════ WORLD 2 ═══════════

  alchemy(save) {
    let cauldUpg = _pk(save.data, 'CauldUpgLVs') || save.data?.CauldUpgLVs;
    const bubbles = _pk(save.data, 'CauldronBubbles');
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
    if (Array.isArray(bubbles)) { parts.push(`${bubbles.length} bubble slots`); if (bubbles.length < 36) tips.push(`${bubbles.length}/36 bubble slots — unlock more`); }
    if (!parts.length) return { score: 0, detail: 'No data', tips: ['Start alchemy in W2'], tier: 'early' };
    if (!tips.length) tips.push('Alchemy is strong!');
    return { score, detail: parts.join(', '), tips, tier: _tierFromScore(score) };
  },

  bubbles(save) {
    const info = _pk(save.data, 'CauldronInfo') || save.data?.CauldronInfo;
    if (!Array.isArray(info)) return { score: 0, detail: 'No data', tips: ['Level up bubbles in alchemy'], tier: 'early' };
    // CauldronInfo has aggregate bubble data
    let score = info.length >= 10 ? 4 : info.length >= 6 ? 3 : info.length >= 3 ? 2 : 1;
    const tips = [];
    if (info.length < 10) tips.push(`${info.length} cauldron info entries — keep upgrading bubbles`);
    if (!tips.length) tips.push('Bubble levels look good!');
    return { score, detail: `${info.length} cauldron data entries`, tips, tier: _tierFromScore(score) };
  },

  arcade(save) {
    const arc = _pk(save.data, 'ArcadeUpg');
    if (!Array.isArray(arc)) return { score: 0, detail: 'No data', tips: ['Play the Arcade in W2'], tier: 'early' };
    const leveled = arc.filter(x => typeof x === 'number' && x > 0).length;
    const maxLv = Math.max(0, ...arc.filter(x => typeof x === 'number'));
    let score = 0;
    if (leveled >= 60 && maxLv >= 100) score = 5; else if (leveled >= 45) score = 4; else if (leveled >= 30) score = 3; else if (leveled >= 15) score = 2; else if (leveled > 0) score = 1;
    const tips = [];
    if (leveled < arc.length) tips.push(`${arc.length - leveled} arcade upgrades not leveled`);
    if (maxLv < 100 && score >= 3) tips.push(`Max arcade upgrade lv ${maxLv} — push higher`);
    if (!tips.length) tips.push('Arcade upgrades maxed!');
    return { score, detail: `${leveled}/${arc.length} upgrades, max lv ${maxLv}`, tips, tier: _tierFromScore(score) };
  },

  obols(save) {
    // Check per-char obol equipment
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
    const unlocked = pr.filter(v => typeof v === 'number' && v > 0).length;
    const locked = pr.filter(v => typeof v === 'number' && v === 0).length;
    const maxed = pr.filter(v => typeof v === 'number' && v >= 50).length;
    const low = pr.map((v, i) => ({ i, v })).filter(x => typeof x.v === 'number' && x.v > 0 && x.v < 50);
    let score = 0;
    if (unlocked >= 22 && maxed >= 15) score = 5; else if (unlocked >= 18 && maxed >= 10) score = 4; else if (unlocked >= 14) score = 3; else if (unlocked >= 8) score = 2; else if (unlocked > 0) score = 1;
    const tips = [];
    if (locked > 0) tips.push(`${locked} prayers locked — unlock via worship`);
    if (low.length > 0) { const bot = low.sort((a, b) => a.v - b.v).slice(0, 5); tips.push(`Low prayers: ${bot.map(p => `#${p.i + 1} lv ${p.v}`).join(', ')}`); }
    if (maxed < unlocked && unlocked > 0) tips.push(`${maxed}/${unlocked} maxed (lv 50) — keep pushing`);
    if (!tips.length) tips.push('Prayers maxed!');
    return { score, detail: `${unlocked}/${pr.length} unlocked, ${maxed} maxed`, tips, tier: _tierFromScore(score) };
  },

  construction(save) {
    let tower = _pk(save.data, 'Tower');
    if (!Array.isArray(tower)) return { score: 0, detail: 'No data', tips: ['Unlock Construction in W3'], tier: 'early' };
    const indexed = tower.map((v, i) => ({ i, v: typeof v === 'number' ? v : 0 }));
    const built = indexed.filter(x => x.v > 0);
    const unbuilt = indexed.filter(x => x.v === 0).length;
    const lowest = [...built].sort((a, b) => a.v - b.v).slice(0, 5);
    let score = 0;
    if (built.length >= 80) score = 5; else if (built.length >= 60) score = 4; else if (built.length >= 40) score = 3; else if (built.length >= 20) score = 2; else if (built.length > 0) score = 1;
    const tips = [];
    if (unbuilt > 0) tips.push(`${unbuilt} buildings not built yet`);
    if (lowest.length && lowest[0].v < 20) tips.push(`Lowest: ${lowest.map(b => `slot ${b.i} (lv ${b.v})`).join(', ')}`);
    if (!tips.length) tips.push('Construction solid!');
    const totalLv = built.reduce((s, x) => s + x.v, 0);
    return { score, detail: `${built.length}/${tower.length} buildings, total ${_fmtBig(totalLv)}`, tips, tier: _tierFromScore(score) };
  },

  saltLick(save) {
    const sl = _pk(save.data, 'SaltLick');
    if (!Array.isArray(sl)) return { score: 0, detail: 'No data', tips: ['Unlock Salt Lick in W3'], tier: 'early' };
    const leveled = sl.filter(v => typeof v === 'number' && v > 0).length;
    const maxLv = Math.max(0, ...sl.filter(v => typeof v === 'number'));
    const zeroes = sl.filter(v => v === 0).length;
    let score = 0;
    if (leveled >= 15 && maxLv >= 100) score = 5; else if (leveled >= 10) score = 4; else if (leveled >= 7) score = 3; else if (leveled >= 3) score = 2; else if (leveled > 0) score = 1;
    const tips = [];
    if (zeroes > 0) tips.push(`${zeroes} salt lick upgrades at lv 0 — level them`);
    if (!tips.length) tips.push('Salt Lick well-leveled!');
    return { score, detail: `${leveled}/${sl.length} leveled, max lv ${maxLv}`, tips, tier: _tierFromScore(score) };
  },

  refinery(save) {
    const rf = _pk(save.data, 'Refinery');
    if (!Array.isArray(rf)) return { score: 0, detail: 'No data', tips: ['Use the Refinery in W3'], tier: 'early' };
    const entries = rf.length;
    const arrEntries = rf.filter(Array.isArray).length;
    let score = 0;
    if (entries >= 20) score = 5; else if (entries >= 15) score = 4; else if (entries >= 10) score = 3; else if (entries >= 5) score = 2; else score = 1;
    const tips = [];
    if (entries < 20) tips.push(`${entries} refinery entries — keep refining salts`);
    if (!tips.length) tips.push('Refinery production solid!');
    return { score, detail: `${entries} refinery entries`, tips, tier: _tierFromScore(score) };
  },

  shrines(save) {
    const sh = _pk(save.data, 'Shrine');
    if (!Array.isArray(sh)) return { score: 0, detail: 'No data', tips: ['Build shrines in W3'], tier: 'early' };
    const placed = sh.filter(Array.isArray).length;
    const maxLv = sh.reduce((m, e) => Array.isArray(e) ? Math.max(m, e[0] || 0) : m, 0);
    const low = sh.filter(e => Array.isArray(e) && (e[0] || 0) < 100).length;
    let score = 0;
    if (placed >= 9 && maxLv >= 200) score = 5; else if (placed >= 8) score = 4; else if (placed >= 6) score = 3; else if (placed >= 3) score = 2; else if (placed > 0) score = 1;
    const tips = [];
    if (low > 0) tips.push(`${low} shrines below lv 100 — level up via worship`);
    if (placed < 9) tips.push(`${placed}/9 shrines placed — build more`);
    if (!tips.length) tips.push('Shrines all leveled!');
    return { score, detail: `${placed} shrines, max lv ${maxLv}`, tips, tier: _tierFromScore(score) };
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
    const leveled = at.filter(v => typeof v === 'number' && v > 0).length;
    const maxLv = Math.max(0, ...at.filter(v => typeof v === 'number'));
    const zeroes = at.filter(v => v === 0).length;
    let score = 0;
    if (leveled >= 15 && maxLv >= 60) score = 5; else if (leveled >= 12) score = 4; else if (leveled >= 8) score = 3; else if (leveled >= 4) score = 2; else if (leveled > 0) score = 1;
    const tips = [];
    if (zeroes > 0) tips.push(`${zeroes} atoms at lv 0 — level them for passive bonuses`);
    const low = at.map((v, i) => ({ i, v })).filter(x => typeof x.v === 'number' && x.v > 0 && x.v < 30).sort((a, b) => a.v - b.v).slice(0, 3);
    if (low.length) tips.push(`Low atoms: ${low.map(a => `#${a.i + 1} (lv ${a.v})`).join(', ')}`);
    if (!tips.length) tips.push('Atoms well-leveled!');
    return { score, detail: `${leveled}/${at.length} leveled, max lv ${maxLv}`, tips, tier: _tierFromScore(score) };
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
    // Per-char traps: PldTraps_i
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

  worship(save) {
    const totem = _pk(save.data, 'TotemInfo') || save.data?.TotemInfo;
    if (!Array.isArray(totem)) return { score: 0, detail: 'No data', tips: ['Start Worship in W3'], tier: 'early' };
    const entries = totem.length;
    let score = 0;
    if (entries >= 10) score = 5; else if (entries >= 7) score = 4; else if (entries >= 4) score = 3; else if (entries >= 2) score = 2; else score = 1;
    const tips = [];
    if (entries < 10) tips.push(`${entries} totem entries — progress worship further`);
    if (!tips.length) tips.push('Worship totems solid!');
    return { score, detail: `${entries} totem entries`, tips, tier: _tierFromScore(score) };
  },

  dungeons(save) {
    const du = _pk(save.data, 'DungUpg');
    if (!Array.isArray(du)) return { score: 0, detail: 'No data', tips: ['Try Dungeons (unlocked W3+)'], tier: 'early' };
    // du[0] = dungeon progress/floors array, du[5] = flurbo upgrades, du[6] = happy hours
    const floors = Array.isArray(du[0]) ? du[0] : [];
    const maxFloor = Math.max(0, ...floors.filter(v => typeof v === 'number'));
    const flurboUpg = Array.isArray(du[5]) ? du[5].filter(v => typeof v === 'number' && v > 0).length : 0;
    let score = 0;
    if (maxFloor >= 10 && flurboUpg >= 8) score = 5; else if (maxFloor >= 8) score = 4; else if (maxFloor >= 5) score = 3; else if (maxFloor >= 3) score = 2; else score = 1;
    const tips = [];
    if (maxFloor < 10) tips.push(`Max dungeon floor: ${maxFloor} — push deeper`);
    if (flurboUpg < 8) tips.push(`${flurboUpg} flurbo upgrades — buy more with dungeon currency`);
    if (!tips.length) tips.push('Dungeons well-progressed!');
    return { score, detail: `Max floor ${maxFloor}, ${flurboUpg} flurbo upgrades`, tips, tier: _tierFromScore(score) };
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
    const mealLvd = mealLv.filter(v => typeof v === 'number' && v > 0).length;
    const mealZero = mealLv.filter(v => typeof v === 'number' && v === 0).length;
    const total = mealLv.length;
    const lowest = mealLv.map((v, i) => ({ i, v })).filter(x => typeof x.v === 'number' && x.v > 0).sort((a, b) => a.v - b.v).slice(0, 5);
    let score = 0;
    if (mealLvd >= 60 && kitchens >= 10) score = 5; else if (mealLvd >= 40 && kitchens >= 8) score = 4; else if (mealLvd >= 20) score = 3; else if (mealLvd >= 10) score = 2; else score = 1;
    const tips = [];
    if (mealZero > 0) tips.push(`${mealZero} meals at lv 0 — discover and level them`);
    if (lowest.length && lowest[0].v < 100) tips.push(`Lowest meals: ${lowest.map(m => `#${m.i + 1} lv ${m.v}`).join(', ')}`);
    if (kitchens < 10) tips.push(`${kitchens} kitchens — unlock more`);
    if (!tips.length) tips.push('Cooking solid!');
    return { score, detail: `${kitchens} kitchens, ${mealLvd}/${total} meals leveled`, tips, tier: _tierFromScore(score) };
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

  jars(save) {
    const ja = _pk(save.data, 'Jars');
    if (!Array.isArray(ja)) return { score: 0, detail: 'No data', tips: ['Collect Jars'], tier: 'early' };
    const active = ja.filter(v => typeof v === 'number' && v > 0).length;
    let score = 0;
    if (active >= 80) score = 5; else if (active >= 50) score = 4; else if (active >= 25) score = 3; else if (active >= 10) score = 2; else if (active > 0) score = 1;
    const tips = [];
    if (active < ja.length) tips.push(`${ja.length - active} jars empty — fill them`);
    if (!tips.length) tips.push('Jars well-collected!');
    return { score, detail: `${active}/${ja.length} jars`, tips, tier: _tierFromScore(score) };
  },

  // ═══════════ WORLD 7 ═══════════

  companions(save) {
    const comp = save.companion;
    if (!comp) return { score: 0, detail: 'No data', tips: ['Unlock Companions in W7'], tier: 'early' };
    const compScore = comp.s || 0;
    const petsOwned = Array.isArray(comp.o) ? comp.o.length : 0;
    let score = 0;
    if (compScore >= 4000 && petsOwned >= 100) score = 5; else if (compScore >= 2000) score = 4; else if (compScore >= 1000) score = 3; else if (compScore >= 300) score = 2; else if (compScore > 0) score = 1;
    const tips = [];
    if (petsOwned < 120) tips.push(`${petsOwned} pets — collect more`);
    if (compScore < 5000) tips.push(`Score ${compScore} — level pets to increase`);
    if (!tips.length) tips.push('Companions maxed!');
    return { score, detail: `Score ${compScore}, ${petsOwned} pets`, tips, tier: _tierFromScore(score) };
  },

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
    // ho[0] = floor progress per well, ho[1] = depths
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

  // ═══════════ CROSS-WORLD / GENERAL ═══════════

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

  achievements(save) {
    const ach = _pk(save.data, 'AchieveReg');
    if (!Array.isArray(ach)) return { score: 0, detail: 'No data', tips: ['Complete achievements for rewards'], tier: 'early' };
    const done = ach.filter(x => x > 0).length;
    let score = 0;
    if (done >= 350) score = 5; else if (done >= 250) score = 4; else if (done >= 150) score = 3; else if (done >= 50) score = 2; else if (done > 0) score = 1;
    const tips = [];
    if (done < ach.length) tips.push(`${ach.length - done} achievements remaining`);
    if (!tips.length) tips.push('Achievements maxed!');
    return { score, detail: `${done}/${ach.length} achievements`, tips, tier: _tierFromScore(score) };
  },

  tasks(save) {
    // TaskZZ1 = merit shop purchase levels (worlds 0-5)
    const data = save.data || {};
    let totalMerits = 0, maxedMerits = 0, worldsDone = 0;
    for (let w = 0; w < 6; w++) {
      const t = _pk(data, `TaskZZ1`);
      if (Array.isArray(t) && Array.isArray(t[w])) {
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
    // su[7] = deathnote tiers per mob (array of tier values 0-5+)
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
    const depth = ri[0] || 0;
    let score = 0;
    if (depth >= 50) score = 5; else if (depth >= 35) score = 4; else if (depth >= 20) score = 3; else if (depth >= 10) score = 2; else if (depth > 0) score = 1;
    const tips = [];
    if (depth < 50) tips.push(`Rift depth ${depth} — push deeper for rewards`);
    if (!tips.length) tips.push('Rift maxed!');
    return { score, detail: `Depth ${depth}`, tips, tier: _tierFromScore(score) };
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
    const leveled = vu.filter(v => typeof v === 'number' && v > 0).length;
    let score = 0;
    if (leveled >= 80) score = 5; else if (leveled >= 60) score = 4; else if (leveled >= 40) score = 3; else if (leveled >= 20) score = 2; else if (leveled > 0) score = 1;
    const tips = [];
    if (leveled < vu.length) tips.push(`${vu.length - leveled} vault upgrades not bought`);
    if (!tips.length) tips.push('Vault fully upgraded!');
    return { score, detail: `${leveled}/${vu.length} upgrades`, tips, tier: _tierFromScore(score) };
  },

  compass(save) {
    const co = _pk(save.data, 'Compass');
    if (!Array.isArray(co)) return { score: 0, detail: 'No data', tips: ['Unlock the Compass'], tier: 'early' };
    // co[0] = upgrade levels, co[1] = unlocked flags, co[2] = route IDs, co[3] = mob names, co[4] = route categories
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
    if (!Array.isArray(dr)) return { score: 0, detail: 'No data', tips: ['Unlock the Dream upgrade tree'], tier: 'early' };
    const dreamPts = dr[0] || 0;
    const upgrades = dr.slice(1).filter(v => typeof v === 'number' && v > 0).length;
    const totalSlots = dr.length - 1;
    let score = 0;
    if (upgrades >= 15) score = 5; else if (upgrades >= 10) score = 4; else if (upgrades >= 6) score = 3; else if (upgrades >= 3) score = 2; else if (upgrades > 0) score = 1;
    const tips = [];
    if (upgrades < totalSlots) tips.push(`${totalSlots - upgrades} dream upgrades not purchased`);
    if (!tips.length) tips.push('Dream tree maxed!');
    return { score, detail: `${upgrades} dream upgrades, ${_fmtBig(dreamPts)} pts`, tips, tier: _tierFromScore(score) };
  },

  territory(save) {
    const te = _pk(save.data, 'Territory');
    if (!Array.isArray(te)) return { score: 0, detail: 'No data', tips: ['Claim spice territories'], tier: 'early' };
    const active = te.filter(Array.isArray).length;
    let score = 0;
    if (active >= 24) score = 5; else if (active >= 18) score = 4; else if (active >= 12) score = 3; else if (active >= 6) score = 2; else if (active > 0) score = 1;
    const tips = [];
    if (active < te.length) tips.push(`${te.length - active} territories not claimed — claim for spice production`);
    if (!tips.length) tips.push('All territories claimed!');
    return { score, detail: `${active}/${te.length} territories`, tips, tier: _tierFromScore(score) };
  },

  weeklyBoss(save) {
    const wb = _pk(save.data, 'WeeklyBoss');
    if (!wb || typeof wb !== 'object') return { score: 0, detail: 'No data', tips: ['Fight weekly bosses'], tier: 'early' };
    const sets = Object.keys(wb).filter(k => k.startsWith('set'));
    const maxSet = sets.length > 0 ? Math.max(...sets.map(k => wb[k]).filter(v => typeof v === 'number')) : 0;
    let score = 0;
    if (maxSet >= 8) score = 5; else if (maxSet >= 6) score = 4; else if (maxSet >= 4) score = 3; else if (maxSet >= 2) score = 2; else if (maxSet > 0) score = 1;
    const tips = [];
    if (maxSet < 8) tips.push(`Max boss set ${maxSet} — push higher for rewards`);
    if (!tips.length) tips.push('Weekly bosses conquered!');
    return { score, detail: `Max set ${maxSet}`, tips, tier: _tierFromScore(score) };
  },

  research(save) {
    const re = _pk(save.data, 'Research');
    if (!Array.isArray(re)) return { score: 0, detail: 'No data', tips: ['Start research in Lab'], tier: 'early' };
    // re[2] = unlocked flags, re[4] = levels, re[8] = some levels
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

  mapBonus(save) {
    const mb = _pk(save.data, 'MapBon');
    if (!Array.isArray(mb)) return { score: 0, detail: 'No data', tips: ['Clear maps for star bonuses'], tier: 'early' };
    const stars = mb.filter(v => typeof v === 'number' && v > 0).length;
    let score = 0;
    if (stars >= 250) score = 5; else if (stars >= 180) score = 4; else if (stars >= 100) score = 3; else if (stars >= 40) score = 2; else if (stars > 0) score = 1;
    const tips = [];
    if (stars < mb.length) tips.push(`${mb.length - stars} maps without star bonus — clear them`);
    if (!tips.length) tips.push('All maps starred!');
    return { score, detail: `${stars}/${mb.length} map bonuses`, tips, tier: _tierFromScore(score) };
  },
};

// ────────────────────────────────────────────────────────────────
//  SYSTEM META — display order, icon, label, world tag
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
  { key: 'colosseum',    icon: '🏟️', label: 'Colosseum',       world: 'W1' },
  // World 2
  { key: 'alchemy',      icon: '⚗️', label: 'Alchemy',         world: 'W2' },
  { key: 'bubbles',      icon: '🫧', label: 'Bubbles',         world: 'W2' },
  { key: 'arcade',       icon: '🕹️', label: 'Arcade',          world: 'W2' },
  { key: 'obols',        icon: '🔵', label: 'Obols',           world: 'W2' },
  // World 3
  { key: 'prayers',      icon: '🙏', label: 'Prayers',         world: 'W3' },
  { key: 'construction', icon: '🏗️', label: 'Construction',    world: 'W3' },
  { key: 'saltLick',     icon: '🧂', label: 'Salt Lick',       world: 'W3' },
  { key: 'refinery',     icon: '🏭', label: 'Refinery',        world: 'W3' },
  { key: 'shrines',      icon: '⛩️', label: 'Shrines',         world: 'W3' },
  { key: 'cogs',         icon: '⚙️', label: 'Cogs',            world: 'W3' },
  { key: 'atoms',        icon: '⚛️', label: 'Atoms',           world: 'W3' },
  { key: 'printer',      icon: '🖨️', label: '3D Printer',      world: 'W3' },
  { key: 'traps',        icon: '🪤', label: 'Trapping',        world: 'W3' },
  { key: 'worship',      icon: '🛐', label: 'Worship',         world: 'W3' },
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
  { key: 'jars',         icon: '🏺', label: 'Jars',            world: 'W6' },
  // World 7
  { key: 'companions',   icon: '🐾', label: 'Companions',      world: 'W7' },
  { key: 'spelunking',   icon: '⛏️', label: 'Spelunking',      world: 'W7' },
  { key: 'holes',        icon: '🕳️', label: 'The Hole',        world: 'W7' },
  // Cross-world
  { key: 'starSigns',    icon: '⭐', label: 'Star Signs',      world: 'All' },
  { key: 'achievements', icon: '🏆', label: 'Achievements',    world: 'All' },
  { key: 'tasks',        icon: '📋', label: 'Merit Shop',      world: 'All' },
  { key: 'deathNote',    icon: '💀', label: 'Death Note',      world: 'All' },
  { key: 'rift',         icon: '🌀', label: 'Rift',            world: 'All' },
  { key: 'arcane',       icon: '🔮', label: 'Arcane',          world: 'All' },
  { key: 'grimoire',     icon: '📖', label: 'Grimoire',        world: 'All' },
  { key: 'vault',        icon: '🔐', label: 'Vault',           world: 'All' },
  { key: 'compass',      icon: '🧭', label: 'Compass',         world: 'All' },
  { key: 'dream',        icon: '💤', label: 'Dream',           world: 'All' },
  { key: 'territory',    icon: '🏴', label: 'Territories',     world: 'All' },
  { key: 'weeklyBoss',   icon: '👹', label: 'Weekly Boss',     world: 'All' },
  { key: 'research',     icon: '🔎', label: 'Research',        world: 'All' },
  { key: 'mapBonus',     icon: '🗺️', label: 'Map Bonuses',     world: 'All' },
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
