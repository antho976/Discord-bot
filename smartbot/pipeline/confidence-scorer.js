function scoreTemplateRelevance(template, signals) {
  const tLower = template.toLowerCase();
  const tWords = new Set(tLower.split(/\s+/).map(w => w.replace(/[^a-z0-9]/g, '')));
  let score = 0;

  for (const kw of signals.subTopics) {
    if (kw.length >= 3 && tLower.includes(kw)) score += 3;
    else if (kw.length < 3 && tWords.has(kw)) score += 3;
  }

  if (signals.entity && tLower.includes(signals.entity)) score += 5;

  if (signals.timeCue) {
    const timeWords = {
      night: ['night', 'late', '3am', '2am', 'sleep', 'insomnia'],
      morning: ['morning', 'early', 'woke', 'coffee'],
      evening: ['evening', 'wind', 'after'],
      afternoon: ['lunch', 'afternoon', 'midday'],
      weekend: ['weekend', 'saturday', 'sunday'],
      marathon: ['hours', 'marathon', 'session', 'binge', 'stop'],
      allday: ['all day', 'whole day'],
    };
    const cueWords = timeWords[signals.timeCue] || [];
    for (const w of cueWords) { if (tLower.includes(w)) { score += 2; break; } }
  }

  if (signals.activity) {
    const activityWords = {
      grind: ['grind', 'grinding', 'farming', 'farm'],
      competitive: ['ranked', 'competitive', 'elo', 'rank', 'climb', 'mmr'],
      chill: ['chill', 'relax', 'vibe', 'cozy', 'comfort', 'wind'],
      social: ['friends', 'squad', 'boys', 'crew', 'together', 'party', 'co-op'],
      solo: ['solo', 'alone', 'single'],
      streaming: ['stream', 'live', 'viewer'],
      new: ['first', 'new', 'started', 'learning', 'beginner', 'tutorial'],
      returning: ['back', 'again', 'return', 'reinstall', 'revisit'],
    };
    const actWords = activityWords[signals.activity] || [];
    for (const w of actWords) { if (tLower.includes(w)) { score += 2; break; } }
  }

  if (signals.intensity) {
    const intensityWords = {
      obsessed: ['addic', 'cant stop', 'hooked', 'obsess', 'cant put'],
      love: ['fire', 'goated', 'amazing', 'best', 'love', 'solid', 'elite', 'banger'],
      hate: ['trash', 'garbage', 'terrible', 'worst', 'awful', 'mid'],
      meh: ['mid', 'alright', 'ok', 'fine', 'whatever'],
      bored: ['bored', 'nothing', 'looking for', 'need something'],
    };
    const intWords = intensityWords[signals.intensity] || [];
    for (const w of intWords) { if (tLower.includes(w)) { score += 2; break; } }
  }

  if (signals.sentiment === 'positive' && /good|great|fire|nice|love|solid|elite|goated|W|amazing/i.test(template)) score += 1;
  if (signals.sentiment === 'negative' && /rough|pain|rip|bad|trash|mid|sad|awful|oof/i.test(template)) score += 1;

  if (!signals.activity || signals.activity !== 'competitive') {
    if (/\branked\b|\belo\b|\bmmr\b|\bcompetitive\b/i.test(template)) score -= 2;
  }
  if (!signals.timeCue || (signals.timeCue !== 'night' && signals.timeCue !== 'marathon')) {
    if (/\b3am\b|\b2am\b|\b4am\b|\blate night\b|\blate at night\b|\bmidnight\b|\binsomnia\b|\bat night\b|\btonight\b/i.test(template)) score -= 2;
  }
  if (!signals.activity || signals.activity !== 'social') {
    if (/\bwith the boys\b|\bthe squad\b|\bwith friends\b/i.test(template)) score -= 1;
  }
  if (!signals.activity || signals.activity !== 'solo') {
    if (/\bsolo\b|\balone\b|\bby yourself\b/i.test(template)) score -= 1;
  }

  return score;
}

export { scoreTemplateRelevance };