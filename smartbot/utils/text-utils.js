// Text processing utilities — normalization, contractions, synonyms, stemming, etc.

export const CONTRACTIONS = {
  "dont": "do not", "doesnt": "does not", "didnt": "did not", "cant": "can not",
  "couldnt": "could not", "shouldnt": "should not", "wouldnt": "would not",
  "isnt": "is not", "arent": "are not", "wasnt": "was not", "werent": "were not",
  "hasnt": "has not", "havent": "have not", "hadnt": "had not",
  "wont": "will not", "im": "i am", "ive": "i have", "ill": "i will",
  "youre": "you are", "youve": "you have", "youll": "you will",
  "theyre": "they are", "theyve": "they have", "theyll": "they will",
  "whos": "who is", "whats": "what is", "thats": "that is",
  "heres": "here is", "theres": "there is", "lets": "let us",
  "aint": "is not", "gonna": "going to", "wanna": "want to", "gotta": "got to",
  "kinda": "kind of", "sorta": "sort of", "coulda": "could have",
  "woulda": "would have", "shoulda": "should have",
};

export const SYNONYMS = {
  'good': 'good', 'great': 'good', 'awesome': 'good', 'amazing': 'good', 'nice': 'good', 'solid': 'good',
  'bad': 'bad', 'terrible': 'bad', 'awful': 'bad', 'trash': 'bad', 'garbage': 'bad',
  'play': 'play', 'playing': 'play', 'played': 'play', 'gaming': 'play',
  'watch': 'watch', 'watching': 'watch', 'watched': 'watch', 'seen': 'watch',
  'listen': 'listen', 'listening': 'listen', 'heard': 'listen',
  'like': 'like', 'love': 'like', 'enjoy': 'like', 'fan': 'like', 'dig': 'like',
  'dislike': 'dislike', 'hate': 'dislike', 'despise': 'dislike',
  'big': 'big', 'huge': 'big', 'massive': 'big', 'large': 'big', 'enormous': 'big',
  'small': 'small', 'tiny': 'small', 'little': 'small', 'mini': 'small',
  'fast': 'fast', 'quick': 'fast', 'rapid': 'fast', 'speedy': 'fast',
  'slow': 'slow', 'sluggish': 'slow', 'laggy': 'slow',
  'happy': 'happy', 'glad': 'happy', 'excited': 'happy', 'hyped': 'happy', 'pumped': 'happy',
  'sad': 'sad', 'depressed': 'sad', 'down': 'sad', 'bummed': 'sad', 'upset': 'sad',
};

export function expandContractions(text) {
  return text.replace(/\b\w+\b/g, w => CONTRACTIONS[w.toLowerCase()] || w);
}

export function applySynonyms(text) {
  return text.replace(/\b\w+\b/g, w => SYNONYMS[w.toLowerCase()] || w);
}

export function tokenizeContent(text) {
  return text.toLowerCase()
    .replace(/<a?:\w+:\d+>/g, '').replace(/<@!?\d+>/g, '')
    .replace(/https?:\/\/\S+/g, '').replace(/[^\w\s'-]/g, ' ')
    .split(/\s+/).filter(w => w.length > 1);
}

export function basicStem(word) {
  if (word.length < 4) return word;
  return word
    .replace(/ies$/, 'y')
    .replace(/sses$/, 'ss')
    .replace(/([^s])s$/, '$1')
    .replace(/eed$/, 'ee')
    .replace(/(ed|ing)$/, '')
    .replace(/ness$/, '')
    .replace(/ment$/, '')
    .replace(/ful$/, '')
    .replace(/ly$/, '')
    .replace(/tion$/, 't')
    .replace(/able$/, '')
    .replace(/ible$/, '');
}

export function nGrams(text, n = 2) {
  const words = text.split(/\s+/).filter(w => w.length > 1);
  const grams = new Set();
  for (let i = 0; i <= words.length - n; i++) {
    grams.add(words.slice(i, i + n).join(' '));
  }
  return grams;
}

export function nGramSimilarity(a, b, n = 2) {
  const gramsA = nGrams(a, n);
  const gramsB = nGrams(b, n);
  if (gramsA.size === 0 || gramsB.size === 0) return 0;
  let intersection = 0;
  for (const g of gramsA) if (gramsB.has(g)) intersection++;
  return intersection / new Set([...gramsA, ...gramsB]).size;
}

// Noun phrase extraction (fallback subject detection)
export function extractNounPhrase(text) {
  const lower = text.toLowerCase()
    .replace(/<a?:\w+:\d+>/g, '').replace(/<@!?\d+>/g, '')
    .replace(/https?:\/\/\S+/g, '').trim();

  // Try common noun phrase patterns
  const patterns = [
    /(?:the |a |an |my |this |that |new |old |best |worst |favorite )?(\w[\w\s'-]{2,25}?)(?:\s+(?:is|are|was|were|has|have|does|can|will|should|might|looks?|feels?|seems?|sounds?))/i,
    /(?:about|like|enjoy|hate|love|play|watch|listen to|into|tried|started|got) (\w[\w\s'-]{2,25})/i,
    /^(\w[\w\s'-]{2,20}?)(?:\s*[.!?]?\s*$)/i,
  ];
  for (const p of patterns) {
    const m = lower.match(p);
    if (m && m[1] && m[1].trim().length >= 3) {
      return m[1].trim().replace(/[.!?,;:]+$/, '').trim();
    }
  }
  return null;
}
