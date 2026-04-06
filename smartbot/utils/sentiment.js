// Sentiment analysis utility

const POSITIVE_WORDS = new Set([
  'good', 'great', 'awesome', 'amazing', 'love', 'like', 'best', 'nice',
  'cool', 'fire', 'sick', 'dope', 'epic', 'incredible', 'perfect', 'beautiful',
  'happy', 'glad', 'excited', 'hype', 'insane', 'goated', 'pog', 'poggers',
  'clutch', 'based', 'valid', 'bussin', 'lit', 'cracked', 'legendary',
  'W', 'w', 'dub', 'gg', 'wp', 'yes', 'yeah', 'yep', 'absolutely',
  'thanks', 'thank', 'appreciate', 'respect', 'congrats', 'congratulations',
  'sheesh', 'clean', 'smooth', 'ez', 'easy', 'fun', 'funny', 'hilarious',
  'lol', 'lmao', 'haha', 'hahaha', 'xd',
]);

const NEGATIVE_WORDS = new Set([
  'bad', 'terrible', 'awful', 'worst', 'hate', 'trash', 'garbage',
  'boring', 'lame', 'mid', 'cringe', 'yikes', 'L', 'loss', 'fail',
  'sad', 'angry', 'toxic', 'annoying', 'frustrated', 'tilted',
  'dead', 'pain', 'suffering', 'bruh', 'oof', 'rip', 'unlucky',
  'lag', 'laggy', 'crash', 'broken', 'bugged', 'scam', 'fake',
  'troll', 'griefing', 'throwing', 'cope', 'seethe', 'mald',
]);

export function analyzeSentiment(text) {
  const words = text.toLowerCase().split(/\s+/);
  let pos = 0, neg = 0;
  for (const w of words) {
    if (POSITIVE_WORDS.has(w)) pos++;
    if (NEGATIVE_WORDS.has(w)) neg++;
  }
  if (pos === 0 && neg === 0) return 'neutral';
  return pos > neg ? 'positive' : neg > pos ? 'negative' : 'neutral';
}

export { POSITIVE_WORDS, NEGATIVE_WORDS };
