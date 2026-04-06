import { expandContractions, basicStem, tokenizeContent, nGramSimilarity } from '../utils/text-utils.js';
import { STOP_WORDS } from '../data/stop-words.js';
const SYNONYMS = {
  'gaming': 'game', 'games': 'game', 'gamer': 'game',
  'songs': 'song', 'music': 'song', 'track': 'song', 'tracks': 'song',
  'movie': 'film', 'movies': 'film', 'films': 'film',
  'show': 'series', 'shows': 'series', 'tv': 'series',
  'anime': 'anime',
  'streaming': 'stream', 'streams': 'stream', 'streamer': 'stream',
  'programming': 'code', 'coding': 'code', 'developer': 'code', 'dev': 'code',
  'funny': 'humor', 'hilarious': 'humor', 'lmao': 'humor', 'lol': 'humor',
  'awesome': 'great', 'amazing': 'great', 'fantastic': 'great', 'incredible': 'great',
  'terrible': 'bad', 'horrible': 'bad', 'awful': 'bad', 'trash': 'bad',
  'purchase': 'buy', 'bought': 'buy', 'buying': 'buy',
  'eating': 'eat', 'food': 'eat', 'meal': 'eat',
  'sleeping': 'sleep', 'tired': 'sleep', 'sleepy': 'sleep', 'nap': 'sleep',
  'working': 'work', 'job': 'work', 'career': 'work',
  'studying': 'study', 'homework': 'study', 'school': 'study', 'exam': 'study',
  'favorite': 'fav', 'fave': 'fav', 'favourite': 'fav',
  'recommend': 'suggest', 'recommendation': 'suggest', 'suggestions': 'suggest',
};

function applySynonyms(text) {
  return text.replace(/\b\w+\b/g, w => SYNONYMS[w] || w);
}

class PairStore {
  constructor() {
    this.trainedPairs = new Map();
    this._pairIndex = new Map();
    this._candidatePairs = new Map();
    this._normalizeCache = new Map();
    this._normForMatchCache = new Map();
    this._maxNormalizeCache = 2000;
  }

  normalizeForMatch(text) {
    const key = String(text);
    const cached = this._normForMatchCache.get(key);
    if (cached !== undefined) return cached;
    let t = key.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();
    t = expandContractions(t);
    t = t.replace(/\b(\w+)(\s+\1)+\b/g, '$1');
    if (this._normForMatchCache.size >= this._maxNormalizeCache) {
      const first = this._normForMatchCache.keys().next().value;
      this._normForMatchCache.delete(first);
    }
    this._normForMatchCache.set(key, t);
    return t;
  }

  normalizeStemmed(text) {
    const basic = typeof text === 'string' ? text : this.normalizeForMatch(text);
    const cached = this._normalizeCache.get(basic);
    if (cached !== undefined) return cached;
    const numNorm = basic.replace(/\d+/g, '<NUM>');
    const synNorm = applySynonyms(numNorm);
    const words = synNorm.split(' ');
    const stemmed = words.filter(w => w.length > 1 && !STOP_WORDS.has(w)).map(basicStem);
    const result = stemmed.length > 0 ? stemmed.join(' ') : basic;
    this._normalizeCache.set(basic, result);
    if (this._normalizeCache.size > this._maxNormalizeCache) {
      const first = this._normalizeCache.keys().next().value;
      this._normalizeCache.delete(first);
    }
    return result;
  }

  getBigrams(text) {
    const words = text.split(' ').filter(w => w.length > 1);
    const bigrams = new Set();
    for (let i = 0; i < words.length - 1; i++) bigrams.add(`${words[i]} ${words[i + 1]}`);
    return bigrams;
  }

  detectPairIntent(text) {
    if (/\b(?:how to|how do|how can|steps to|way to)\b/.test(text)) return 'howto';
    if (/\b(?:what is|what are|whats|define|meaning of|explain)\b/.test(text)) return 'definition';
    if (/\b(?:why|reason|cause)\b/.test(text)) return 'reason';
    if (/\b(?:when|what time|schedule|date)\b/.test(text)) return 'time';
    if (/\b(?:where|location|place)\b/.test(text)) return 'location';
    if (/\b(?:recommend|suggest|best|should i|which)\b/.test(text)) return 'recommendation';
    if (/\?/.test(text)) return 'question';
    return null;
  }

  add(question, response, options = {}) {
    const normKey = this.normalizeForMatch(question);
    if (normKey.length < 3) return null;

    const existing = this.trainedPairs.get(normKey);
    if (existing) {
      if (!existing.responses) existing.responses = [existing.response];
      if (!existing.responses.includes(response)) {
        existing.responses.push(response);
        existing.response = response;
      }
      existing.updatedAt = Date.now();
      if (options.trainedBy) existing.trainedBy = options.trainedBy;
      this.rebuildIndex();
      return existing;
    }

    const pair = {
      pattern: question,
      response,
      responses: [response],
      score: options.score || 2,
      uses: 0,
      created: Date.now(),
      updatedAt: Date.now(),
      lastUsed: null,
      trainedBy: options.trainedBy || 'dashboard',
      channelId: options.channelId || 'training-dashboard',
      source: options.source || 'manual',
      context: options.context || [],
      intent: this.detectPairIntent(question),
      closeMatch: false,
      feedbackScore: 0,
    };

    this.trainedPairs.set(normKey, pair);
    this.rebuildIndex();
    return pair;
  }

  addVariation(question, variation) {
    const normKey = this.normalizeForMatch(question);
    const pair = this.trainedPairs.get(normKey);
    if (!pair) return null;
    if (!pair.responses) pair.responses = [pair.response];
    if (!pair.responses.includes(variation)) {
      pair.responses.push(variation);
      pair.updatedAt = Date.now();
    }
    return pair;
  }

  remove(question) {
    const normKey = this.normalizeForMatch(question);
    const deleted = this.trainedPairs.delete(normKey);
    if (deleted) this.rebuildIndex();
    return deleted;
  }

  get(question) {
    return this.trainedPairs.get(this.normalizeForMatch(question)) || null;
  }

  getAll() {
    return [...this.trainedPairs.entries()].map(([key, pair]) => ({ key, ...pair }));
  }

  rebuildIndex() {
    this._pairIndex.clear();
    for (const [key, pair] of this.trainedPairs) {
      if (pair.score <= 0) continue;
      const stemmed = this.normalizeStemmed(key);
      pair._cachedStemmed = stemmed;
      for (const word of stemmed.split(' ')) {
        if (word.length < 2) continue;
        if (!this._pairIndex.has(word)) this._pairIndex.set(word, new Set());
        this._pairIndex.get(word).add(key);
      }
    }
  }

  decayUnused() {
    const now = Date.now();
    const DAY = 86400000;
    let decayed = 0;
    for (const [, pair] of this.trainedPairs) {
      const lastUsed = pair.lastUsed || pair.created || now;
      const daysSinceUse = (now - lastUsed) / DAY;
      if (daysSinceUse > 7 && pair.score > 0) {
        pair.score = Math.max(pair.score * Math.pow(0.99, daysSinceUse - 7), -5);
        decayed++;
      }
      const lastUpdated = pair.updatedAt || pair.created || now;
      const daysSinceUpdate = (now - lastUpdated) / DAY;
      if (daysSinceUpdate > 30 && pair.score > 0) {
        pair.score = Math.max(pair.score * Math.pow(0.98, daysSinceUpdate - 30), 0.1);
        if (!pair._staleWarned) pair._staleWarned = true;
      }
    }
    return decayed;
  }

  toJSON() {
    return {
      trainedPairs: Object.fromEntries([...this.trainedPairs.entries()].slice(0, 2000)),
      candidatePairs: (() => {
        const obj = {};
        for (const [k, v] of this._candidatePairs) obj[k] = Array.isArray(v) ? v.slice(-100) : v;
        return obj;
      })(),
    };
  }

  loadFromJSON(data) {
    if (!data) return;
    if (data.trainedPairs) {
      for (const [k, v] of Object.entries(data.trainedPairs)) {
        const newKey = this.normalizeForMatch(k);
        this.trainedPairs.set(newKey.length >= 3 ? newKey : k, v);
      }
      this.rebuildIndex();
    }
    if (data.candidatePairs) {
      for (const [k, v] of Object.entries(data.candidatePairs)) this._candidatePairs.set(k, v);
    }
  }
}

export { PairStore, SYNONYMS, applySynonyms };