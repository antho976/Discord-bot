import { extractSubject } from '../utils/subject-extractor.js';
import { analyzeSentiment } from '../utils/sentiment.js';
import { lookupKnowledge, BUILT_IN_KNOWLEDGE } from '../data/knowledge-base.js';
function resolveVagueReference(text, recentMessages) {
  const lower = text.toLowerCase().trim();
  const vaguePatterns = /^(?:.*\b(?:it|that|this|these|those)\b.{0,25})$/i;
  const hasOwnSubject = /\b(?:playing|watching|listening|eating|trying|using|game|show|song|food|anime|movie|album|app)\b/i.test(lower);
  if (hasOwnSubject || !vaguePatterns.test(lower)) return null;
  if (lower.split(/\s+/).length > 8) return null;

  const recent = (recentMessages || []).slice().reverse();
  for (const msg of recent) {
    if (msg.subjects && msg.subjects.length > 0) {
      const subj = msg.subjects[0];
      if (subj.length >= 2 && !/^(?:it|that|this|these|those)$/i.test(subj)) {
        const knowledge = lookupKnowledge(subj);
        return {
          resolvedSubject: subj,
          resolvedEntity: knowledge ? knowledge.key : null,
          resolvedType: knowledge ? knowledge.type : null,
          sourceTopic: msg.topics?.[0]?.[0] || null,
        };
      }
    }
    if (msg.content) {
      const msgLower = msg.content.toLowerCase();
      const sortedKeys = Object.entries(BUILT_IN_KNOWLEDGE)
        .filter(([k, v]) => !v.alias && k.length >= 3)
        .sort((a, b) => b[0].length - a[0].length);
      for (const [key, val] of sortedKeys) {
        if (msgLower.includes(key)) {
          return {
            resolvedSubject: key, resolvedEntity: key,
            resolvedType: val.type, sourceTopic: msg.topics?.[0]?.[0] || null,
          };
        }
      }
    }
  }
  return null;
}

function analyzeConversationFlow(recentMessages) {
  if (!recentMessages || recentMessages.length < 2) return null;

  const flow = {
    dominantTopic: null, mood: 'neutral', isActive: false,
    lastSubjects: [], isDebate: false, isHype: false,
  };

  let posCount = 0, negCount = 0;
  const topicCounts = {};
  const subjects = [];

  for (const msg of recentMessages) {
    const sentiment = analyzeSentiment(msg.content);
    if (sentiment === 'positive') posCount++;
    if (sentiment === 'negative') negCount++;

    if (msg.topics) {
      for (const [topic, data] of msg.topics) topicCounts[topic] = (topicCounts[topic] || 0) + data.score;
    }

    const extracted = extractSubject(msg.content);
    if (extracted?.subjects) subjects.push(...extracted.subjects);
  }

  const topTopic = Object.entries(topicCounts).sort(([, a], [, b]) => b - a)[0];
  if (topTopic) flow.dominantTopic = topTopic[0];

  if (posCount > negCount * 2) flow.mood = 'positive';
  else if (negCount > posCount * 2) flow.mood = 'negative';
  else if (posCount > 0 && negCount > 0) flow.mood = 'mixed';

  if (recentMessages.length >= 5) {
    const timeSpan = recentMessages[recentMessages.length - 1].timestamp - recentMessages[0].timestamp;
    if (timeSpan < 120000) flow.isActive = true;
  }

  const hypeWords = ['lets go', 'hype', 'pog', 'poggers', 'W', '🔥', 'goated', 'sheesh'];
  const hypeCount = recentMessages.filter(m => hypeWords.some(w => m.content.toLowerCase().includes(w))).length;
  if (hypeCount >= 3) flow.isHype = true;

  flow.lastSubjects = [...new Set(subjects)].slice(-5);
  return flow;
}

export { resolveVagueReference, analyzeConversationFlow };