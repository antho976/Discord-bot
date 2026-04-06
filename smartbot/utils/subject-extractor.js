// Subject & intent extraction from messages

import { extractNounPhrase } from './text-utils.js';

export const INTENT_PATTERNS = {
  asking_opinion: [
    /what do you(?:all| guys)? think (?:of|about) (.+?)[\?]?$/i,
    /thoughts on (.+?)[\?]?$/i,
    /(?:your|anyones?) (?:opinion|take|thoughts) on (.+?)[\?]?$/i,
    /how (?:do you|you) feel about (.+?)[\?]?$/i,
    /^is (.+?) (?:good|worth it|any good|worth|overrated|underrated|mid)[\?]?$/i,
    /(?:should i|should we) (?:get|try|play|watch|buy|listen to|check out) (.+?)[\?]?$/i,
    /(?:anyone|anybody) (?:tried|played|watched|seen|heard) (.+?)[\?]?$/i,
    /rate (.+)/i,
  ],
  asking_info: [
    /what(?:'s| is) (.+?) (?:about|like)[\?]?$/i,
    /what (?:is|are|was|were) (.+?)[\?]?$/i,
    /(?:tell me|explain|describe) (?:about |what )(.+)/i,
    /how (?:does|do|did|is) (.+?) (?:work|play|run|perform)[\?]?$/i,
    /whats (.+?)[\?]?$/i,
    /do you (?:know|like) (.+?)[\?]?$/i,
  ],
  sharing_experience: [
    /i just (?:finished|beat|completed|watched|played|tried|started|got|bought) (.+)/i,
    /just (?:finished|beat|completed|watched|played|tried|started|got|bought) (.+)/i,
    /i(?:'ve|ve| have) been (?:playing|watching|listening to|into|hooked on|addicted to) (.+)/i,
    /i (?:love|like|enjoy|adore) (.+)/i,
    /i(?:'m|m| am) (?:playing|watching|listening to|reading|into|obsessed with) (.+)/i,
    /currently (?:playing|watching|listening to|reading|into) (.+)/i,
  ],
  recommending: [
    /you (?:guys |all )?(?:should|gotta|need to) (?:try|play|watch|listen to|check out) (.+)/i,
    /(?:go |everyone )?(?:play|watch|listen to|try|check out) (.+)/i,
    /(.+?) is (?:so good|amazing|fire|goated|a must|incredible|underrated|a banger|slept on)/i,
    /i (?:recommend|suggest) (.+)/i,
    /(?:highly|definitely|seriously) recommend (.+)/i,
  ],
  complaining: [
    /(.+?) is (?:so bad|terrible|trash|garbage|broken|mid|overrated|awful)/i,
    /i (?:hate|cant stand|am so tired of|am sick of) (.+)/i,
    /(.+?) (?:sucks|is trash|is garbage|is dead|is boring|fell off|flopped)/i,
    /(?:im|i'm) (?:done with|over|sick of|tired of) (.+)/i,
  ],
  comparing: [
    /(.+?) (?:vs|versus|or|compared to) (.+?)[\?]?$/i,
    /(.+?) is (?:better|worse) (?:than|to) (.+)/i,
    /which is better[,:]? (.+?) or (.+?)[\?]?$/i,
    /would you (?:rather|prefer) (.+?) or (.+?)[\?]?$/i,
  ],
  greeting_bot: [
    /^(?:he+y+|hi+|hello+|yo+|su+p|whats up|howdy|hiya|heyo|ayoo*|waddup|wsg|wassup)(?:\s+(?:bot|smartbot|buddy|dude|bro|man|homie|fam))?[\s!?.]*$/i,
    /^(?:good (?:morning|afternoon|evening|night))(?:\s+(?:bot|smartbot|everyone|all|guys|chat))?[\s!?.]*$/i,
    /^(?:how are you|how you doing|hows it going|what's good|whats good)[\s!?.]*$/i,
  ],
};

export function extractSubject(text) {
  const lower = text.toLowerCase().trim();
  const cleaned = lower
    .replace(/<a?:\w+:\d+>/g, '').replace(/<@!?\d+>/g, '')
    .replace(/https?:\/\/\S+/g, '').replace(/[!]{2,}/g, '!').trim();

  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    for (const pattern of patterns) {
      const match = cleaned.match(pattern);
      if (match) {
        if (intent === 'greeting_bot') return { intent, subjects: [], raw: cleaned };
        if (intent === 'comparing' && match[2]) {
          return { intent, subjects: [match[1].trim(), match[2].trim()], raw: cleaned };
        }
        if (match[1]) {
          let subj = match[1].trim().replace(/[?.!,]+$/, '').trim();
          subj = subj.replace(/^(?:playing|watching|listening to|reading|trying|getting into|checking out)\s+/i, '');
          if (subj.length > 0) return { intent, subjects: [subj], raw: cleaned };
        }
      }
    }
  }

  // Fallback: noun phrase extraction
  const nounPhrase = extractNounPhrase(cleaned);
  if (nounPhrase && nounPhrase.length >= 3) {
    const hasQuestion = /\?|\b(?:what|how|why|who|when|where|which)\b/i.test(cleaned);
    const hasNeg = /\b(?:hate|bad|trash|worst|sucks|terrible|boring|mid)\b/i.test(cleaned);
    const hasPos = /\b(?:love|amazing|fire|goated|best|great|awesome)\b/i.test(cleaned);
    const inf = hasQuestion ? 'asking_info' : hasNeg ? 'complaining' : hasPos ? 'sharing_experience' : 'sharing_experience';
    return { intent: inf, subjects: [nounPhrase], raw: cleaned, inferred: true };
  }

  return null;
}

export function detectInputStyle(text) {
  const caps = (text.match(/[A-Z]/g) || []).length;
  const total = text.replace(/\s/g, '').length || 1;
  const capsRatio = caps / total;
  const hasExclamation = /!{2,}|!!/.test(text);
  const hasAllCaps = capsRatio > 0.5 && text.length > 3;
  const hasHypeWords = /\b(?:LETS GO|SHEESH|GOATED|INSANE|NO WAY|CLUTCH|fire|hype|crazy|goated)\b/i.test(text);
  const hasChillWords = /\b(?:idk|meh|whatever|i guess|kinda|lowkey|vibing|chill|tbh)\b/i.test(text);
  const isLowercase = text === text.toLowerCase() && text.length > 5;
  const isShort = text.split(/\s+/).length <= 3;

  if (hasAllCaps || (hasExclamation && hasHypeWords)) return 'hype';
  if (hasHypeWords && !hasChillWords) return 'energetic';
  if (hasChillWords || (isLowercase && !hasExclamation)) return 'chill';
  if (isShort && isLowercase) return 'minimal';
  return 'neutral';
}
