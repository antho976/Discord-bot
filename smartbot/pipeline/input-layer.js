import { lookupKnowledge, BUILT_IN_KNOWLEDGE } from '../data/knowledge-base.js';

// Pre-sorted at module load — avoids Object.entries + filter + sort per message
const _SORTED_KNOWLEDGE_KEYS = Object.entries(BUILT_IN_KNOWLEDGE)
  .filter(([k, v]) => !v.alias && k.length >= 3)
  .sort((a, b) => b[0].length - a[0].length);

const TIME_CUES = {
  'late night': 'night', 'late at night': 'night', '3am': 'night', '2am': 'night', '4am': 'night',
  'at night': 'night', 'tonight': 'night', 'all night': 'night', 'night owl': 'night', 'cant sleep': 'night',
  'this morning': 'morning', 'early': 'morning', 'woke up': 'morning', 'just woke': 'morning',
  'after work': 'evening', 'after school': 'evening', 'this evening': 'evening', 'winding down': 'evening',
  'lunch break': 'afternoon', 'afternoon': 'afternoon', 'midday': 'afternoon',
  'all day': 'allday', 'all weekend': 'weekend', 'this weekend': 'weekend', 'on the weekend': 'weekend',
  'for hours': 'marathon', 'all session': 'marathon', 'binge': 'marathon', 'marathon': 'marathon', 'non stop': 'marathon',
};

const ACTIVITY_CUES = {
  'grinding': 'grind', 'grind': 'grind', 'grinded': 'grind', 'farming': 'grind',
  'ranked': 'competitive', 'competitive': 'competitive', 'tournament': 'competitive', 'tryhard': 'competitive',
  'chill': 'chill', 'vibing': 'chill', 'relaxing': 'chill', 'casual': 'chill', 'cozy': 'chill',
  'with friends': 'social', 'with the boys': 'social', 'with the squad': 'social', 'squad': 'social', 'party': 'social', 'co-op': 'social', 'coop': 'social',
  'alone': 'solo', 'solo': 'solo', 'by myself': 'solo', 'singleplayer': 'solo',
  'streaming': 'streaming', 'on stream': 'streaming', 'live': 'streaming',
  'first time': 'new', 'just started': 'new', 'new to': 'new', 'beginner': 'new', 'learning': 'new',
  'again': 'returning', 'coming back to': 'returning', 'reinstalled': 'returning', 'picked back up': 'returning',
};

const INTENSITY_CUES = {
  'addicted': 'obsessed', 'obsessed': 'obsessed', 'cant stop': 'obsessed', 'hooked': 'obsessed',
  'love': 'love', 'amazing': 'love', 'incredible': 'love', 'goated': 'love', 'fire': 'love', 'best': 'love',
  'hate': 'hate', 'trash': 'hate', 'garbage': 'hate', 'terrible': 'hate', 'worst': 'hate',
  'mid': 'meh', 'alright': 'meh', 'ok': 'meh', 'whatever': 'meh', 'meh': 'meh',
  'bored': 'bored', 'boring': 'bored', 'nothing to do': 'bored', 'looking for': 'bored',
};

function detectInputStyle(text) {
  const caps = (text.match(/[A-Z]/g) || []).length;
  const total = text.replace(/\s/g, '').length || 1;
  const capsRatio = caps / total;
  const hasExclamation = /!{2,}|!!/.test(text);
  const hasAllCaps = capsRatio > 0.5 && text.length > 3;
  const hasHypeWords = /\b(?:LETS GO|SHEESH|GOATED|INSANE|NO WAY|CLUTCH|BROO|fire|hype|crazy|insane|goated)\b/i.test(text);
  const hasChillWords = /\b(?:idk|meh|whatever|i guess|kinda|lowkey|vibing|chill|tbh)\b/i.test(text);
  const isLowercase = text === text.toLowerCase() && text.length > 5;
  const isShort = text.split(/\s+/).length <= 3;

  if (hasAllCaps || (hasExclamation && hasHypeWords)) return 'hype';
  if (hasHypeWords && !hasChillWords) return 'energetic';
  if (hasChillWords || (isLowercase && !hasExclamation)) return 'chill';
  if (isShort && isLowercase) return 'minimal';
  return 'neutral';
}

function extractMessageSignals(text, topics, sentiment, extracted) {
  const lower = text.toLowerCase();
  const signals = {
    entity: null, entityType: null, timeCue: null, activity: null, intensity: null,
    topics: [], subTopics: [], sentiment,
    intent: extracted?.intent || null,
    subject: extracted?.subjects?.[0] || null,
    wordCount: text.trim().split(/\s+/).length,
    isQuestion: /\?/.test(text) || /^(what|how|why|when|where|who|which|is|are|do|does|should|would|could)\b/i.test(text),
  };

  if (extracted?.subjects?.[0]) {
    const knowledge = lookupKnowledge(extracted.subjects[0]);
    if (knowledge) { signals.entity = knowledge.key; signals.entityType = knowledge.type; }
  }

  if (!signals.entity) {
    for (const [key, val] of _SORTED_KNOWLEDGE_KEYS) {
      if (lower.includes(key)) { signals.entity = key; signals.entityType = val.type; break; }
    }
  }

  for (const [phrase, cue] of Object.entries(TIME_CUES)) {
    if (lower.includes(phrase)) { signals.timeCue = cue; break; }
  }
  for (const [phrase, cue] of Object.entries(ACTIVITY_CUES)) {
    if (lower.includes(phrase)) { signals.activity = cue; break; }
  }
  for (const [phrase, cue] of Object.entries(INTENSITY_CUES)) {
    if (lower.includes(phrase)) { signals.intensity = cue; break; }
  }

  if (topics) {
    signals.topics = topics.map(([name, data]) => ({ name, score: data.score, matched: data.matched, confidence: data.confidence }));
    if (topics[0]) signals.subTopics = topics[0][1].matched || [];
  }

  return signals;
}

export {
  extractMessageSignals, detectInputStyle,
  TIME_CUES, ACTIVITY_CUES, INTENSITY_CUES,
};