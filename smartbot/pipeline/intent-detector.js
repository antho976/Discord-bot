import { extractSubject } from '../utils/subject-extractor.js';
import { lookupKnowledge } from '../data/knowledge-base.js';
function detectIntent(text) {
  const lower = text.toLowerCase().trim();
  const extracted = extractSubject(text);
  const wordCount = text.trim().split(/\s+/).length;

  const result = {
    ...(extracted || { intent: null, subjects: [], confidence: 0 }),
    isGreeting: /^(hey|hi|hello|yo|sup|whats? ?up|howdy|hiya)\b/i.test(lower),
    isFarewell: /\b(bye|cya|goodnight|gn|later|peace|see ya|ttyl)\b/i.test(lower),
    isQuestion: /\?/.test(text) || /^(what|how|why|when|where|who|which|is|are|do|does|should|would|could)\b/i.test(lower),
    isTellMore: /\b(tell me more|elaborate|go on|explain|what else|more about|expand|continue)\b/i.test(lower),
    isComparison: /\b(vs|versus|compared to|or|better|worse|rather)\b/i.test(lower) && extracted?.subjects?.length >= 2,
    isRecommendation: /\b(recommend|suggestion|should i|what should|try|check out)\b/i.test(lower),
    isShort: wordCount <= 3,
    isLong: wordCount > 15,
    knowledgeMatch: null,
  };

  if (result.subjects?.[0]) {
    result.knowledgeMatch = lookupKnowledge(result.subjects[0]);
  }

  return result;
}

export { detectIntent };