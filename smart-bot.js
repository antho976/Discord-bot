/**
 * SmartBot — Local chat engine with trained response pairs
 * Combines topic detection, Markov chains, sentiment analysis,
 * channel memory, and smart templates for on-topic replies.
 * Now with optional Qwen AI via Groq (primary) + HuggingFace (fallback).
 */

import { TOPICS, detectTopics, BOT_GREETINGS, TEMPLATES, SLANG_REACTIONS, matchSlangReaction, SARCASM_PATTERNS, SARCASM_RESPONSES, WITTY_BYSTANDER } from './smart-bot-data.js';

// ======================== QWEN AI ENGINE (Groq + HuggingFace) ========================

class QwenAI {
  constructor() {
    this.groqKey = '';
    this.hfKey = '';
    this.enabled = false;
    this.groqModel = 'qwen/qwen3-32b';
    this.hfModel = 'Qwen/Qwen3-32B';
    this.maxTokens = 150;
    this.temperature = 0.85;
    this.cache = new Map();
    this.CACHE_TTL = 3 * 60 * 1000;
    this.rateLimiter = { count: 0, resetAt: 0 };
    this.MAX_REQUESTS_PER_MIN = 25;
    this.stats = { groqCalls: 0, hfCalls: 0, cacheHits: 0, failures: 0 };
  }

  setKeys(keys) {
    if (keys.groq) this.groqKey = keys.groq;
    if (keys.huggingface) this.hfKey = keys.huggingface;
    this.enabled = !!(this.groqKey || this.hfKey);
  }

  shouldUseAI(reason, content) {
    if (!this.enabled) return false;
    const isDirect = reason === 'mention' || reason === 'name' || reason === 'reply_to_bot';
    if (!isDirect) return false;
    if (!content || content.replace(/<[^>]+>/g, '').trim().length < 5) return false;
    return true;
  }

  _buildSystemPrompt(botName, personality, channelContext) {
    const base = `You are ${botName || 'a Discord bot'}, a chill chat bot in a Discord server. `
      + `You talk like a real person in chat — casual, short, no formal language. `
      + `Use lowercase mostly, abbreviations like "ngl", "tbh", "fr", "rn" naturally. `
      + `Never use asterisks for actions. Never say you're an AI or language model. `
      + `Keep replies under 2-3 sentences unless the question really needs more. `
      + `Match the vibe of whoever you're talking to. `
      + `IMPORTANT: Actually answer what the person said or asked.`;

    const personalityTraits = {
      chill: ' You have a laid-back, relaxed personality.',
      hype: ' You are energetic and hyped up.',
      sarcastic: ' You have a witty, slightly sarcastic sense of humor.',
      adaptive: ' You match the energy of whoever is talking to you.',
    };

    let prompt = base + (personalityTraits[personality] || personalityTraits.chill);

    if (channelContext && channelContext.length > 0) {
      prompt += '\n\nRecent chat messages for context:\n';
      for (const msg of channelContext.slice(-6)) {
        prompt += `${msg.username || 'someone'}: ${(msg.content || '').substring(0, 150)}\n`;
      }
    }

    return prompt;
  }

  _checkRateLimit() {
    const now = Date.now();
    if (now > this.rateLimiter.resetAt) {
      this.rateLimiter.count = 0;
      this.rateLimiter.resetAt = now + 60000;
    }
    if (this.rateLimiter.count >= this.MAX_REQUESTS_PER_MIN) return false;
    this.rateLimiter.count++;
    return true;
  }

  _cacheKey(content) {
    return content.toLowerCase().trim().replace(/\s+/g, ' ').substring(0, 100);
  }

  async generate(content, username, botName, personality, recentMessages) {
    if (!this.enabled) return null;
    if (!this._checkRateLimit()) return null;

    const key = this._cacheKey(content);
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.ts < this.CACHE_TTL) {
      this.stats.cacheHits++;
      return cached.reply;
    }

    const cleanContent = content.replace(/<@!?\d+>/g, '').replace(/<#\d+>/g, '').trim();
    if (!cleanContent) return null;

    const systemPrompt = this._buildSystemPrompt(botName, personality, recentMessages);
    const userPrompt = `${username}: ${cleanContent}`;
    let reply = null;

    if (this.groqKey) {
      reply = await this._callGroq(systemPrompt, userPrompt);
    }
    if (!reply && this.hfKey) {
      reply = await this._callHuggingFace(systemPrompt, userPrompt);
    }

    if (reply) {
      reply = this._cleanReply(reply, botName);
      this.cache.set(key, { reply, ts: Date.now() });
      if (this.cache.size > 200) {
        const now = Date.now();
        for (const [k, v] of this.cache) {
          if (now - v.ts > this.CACHE_TTL) this.cache.delete(k);
        }
      }
    } else {
      this.stats.failures++;
    }

    return reply;
  }

  async _callGroq(systemPrompt, userPrompt) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.groqModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: this.maxTokens,
          temperature: this.temperature,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) return null;
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      if (text) this.stats.groqCalls++;
      return text || null;
    } catch {
      return null;
    }
  }

  async _callHuggingFace(systemPrompt, userPrompt) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(`https://api-inference.huggingface.co/models/${this.hfModel}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.hfKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.hfModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: this.maxTokens,
          temperature: this.temperature,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) return null;
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      if (text) this.stats.hfCalls++;
      return text || null;
    } catch {
      return null;
    }
  }

  _cleanReply(text, botName) {
    if (!text) return null;
    let reply = text.trim();
    if (botName) {
      const namePattern = new RegExp(`^${botName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:\\s*`, 'i');
      reply = reply.replace(namePattern, '');
    }
    reply = reply.replace(/^(assistant|bot|ai)\s*:\s*/i, '');
    if ((reply.startsWith('"') && reply.endsWith('"')) || (reply.startsWith("'") && reply.endsWith("'"))) {
      reply = reply.slice(1, -1);
    }
    if (reply.length > 400) {
      const cutoff = reply.lastIndexOf(' ', 400);
      reply = reply.substring(0, cutoff > 200 ? cutoff : 400);
    }
    reply = reply.replace(/\*\*/g, '').replace(/\*/g, '').replace(/_{2,}/g, '');
    return reply.trim() || null;
  }

  getStats() {
    return { ...this.stats, enabled: this.enabled, hasGroq: !!this.groqKey, hasHF: !!this.hfKey, groqModel: this.groqModel, temperature: this.temperature, maxTokens: this.maxTokens };
  }

  toJSON() {
    return { groqModel: this.groqModel, hfModel: this.hfModel, maxTokens: this.maxTokens, temperature: this.temperature, stats: this.stats };
  }

  loadFromJSON(data) {
    if (!data) return;
    if (data.groqModel) this.groqModel = data.groqModel;
    if (data.hfModel) this.hfModel = data.hfModel;
    if (data.maxTokens) this.maxTokens = data.maxTokens;
    if (data.temperature) this.temperature = data.temperature;
    if (data.stats) this.stats = { ...this.stats, ...data.stats };
  }
}

// ======================== STOP WORDS (1C) ========================
const STOP_WORDS = new Set([
  'a','an','the','is','are','was','were','be','been','being','have','has','had',
  'do','does','did','will','would','shall','should','may','might','must','can','could',
  'i','me','my','we','our','you','your','he','him','his','she','her','it','its','they','them','their',
  'this','that','these','those','am','to','of','in','for','on','with','at','by','from',
  'as','into','through','during','before','after','above','below','between','but','and',
  'or','nor','not','no','so','if','then','than','too','very','just','about','up','out',
  'all','each','every','both','few','more','most','other','some','such','only','own',
  'same','also','how','what','when','where','which','who','whom','why',
  'im','dont','doesnt','didnt','wont','cant','isnt','arent','wasnt','werent',
]);

// ======================== CONTRACTION EXPANSION ========================
const CONTRACTIONS = {
  'cant': 'can not', 'dont': 'do not', 'doesnt': 'does not', 'didnt': 'did not',
  'wont': 'will not', 'isnt': 'is not', 'arent': 'are not', 'wasnt': 'was not',
  'werent': 'were not', 'havent': 'have not', 'hasnt': 'has not', 'hadnt': 'had not',
  'shouldnt': 'should not', 'wouldnt': 'would not', 'couldnt': 'could not',
  'mustnt': 'must not', 'ive': 'i have', 'youve': 'you have', 'weve': 'we have',
  'theyve': 'they have', 'youre': 'you are', 'theyre': 'they are', 'were': 'we are',
  'hes': 'he is', 'shes': 'she is', 'thats': 'that is', 'whats': 'what is',
  'whos': 'who is', 'wheres': 'where is', 'heres': 'here is', 'theres': 'there is',
  'ill': 'i will', 'youll': 'you will', 'hell': 'he will', 'shell': 'she will',
  'well': 'we will', 'theyll': 'they will', 'id': 'i would', 'youd': 'you would',
  'hed': 'he would', 'shed': 'she would', 'wed': 'we would', 'theyd': 'they would',
  'im': 'i am', 'gonna': 'going to', 'wanna': 'want to', 'gotta': 'got to',
  'lemme': 'let me', 'gimme': 'give me', 'kinda': 'kind of', 'sorta': 'sort of',
};

function expandContractions(text) {
  return text.replace(/\b\w+\b/g, w => CONTRACTIONS[w] || w);
}

// ======================== SYNONYM ALIASES (I2) ========================
// Maps common variants to a canonical form for better fuzzy matching
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

// ======================== BASIC STEMMER (1B) ========================
function basicStem(word) {
  if (word.length < 4) return word;
  // Common suffixes — simple suffix stripping
  if (word.endsWith('ting') && word.length > 5) return word.slice(0, -4);
  if (word.endsWith('ning') && word.length > 5) return word.slice(0, -4);
  if (word.endsWith('ring') && word.length > 5) return word.slice(0, -4);
  if (word.endsWith('zing') && word.length > 5) return word.slice(0, -4);
  if (word.endsWith('ing') && word.length > 5) return word.slice(0, -3);
  if (word.endsWith('tion') && word.length > 5) return word.slice(0, -4);
  if (word.endsWith('sion') && word.length > 5) return word.slice(0, -4);
  if (word.endsWith('ness') && word.length > 5) return word.slice(0, -4);
  if (word.endsWith('ment') && word.length > 5) return word.slice(0, -4);
  if (word.endsWith('able') && word.length > 5) return word.slice(0, -4);
  if (word.endsWith('ible') && word.length > 5) return word.slice(0, -4);
  if (word.endsWith('ful') && word.length > 4) return word.slice(0, -3);
  if (word.endsWith('less') && word.length > 5) return word.slice(0, -4);
  if (word.endsWith('ally') && word.length > 5) return word.slice(0, -4);
  if (word.endsWith('ily') && word.length > 4) return word.slice(0, -3);
  if (word.endsWith('ly') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('ies') && word.length > 4) return word.slice(0, -3) + 'y';
  if (word.endsWith('ied') && word.length > 4) return word.slice(0, -3) + 'y';
  if (word.endsWith('ier') && word.length > 4) return word.slice(0, -3) + 'y';
  if (word.endsWith('es') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('ed') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('er') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 3) return word.slice(0, -1);
  return word;
}

// ======================== LRU CACHE (8A) ========================
class LRUCache {
  constructor(max = 200) {
    this.max = max;
    this.cache = new Map();
  }
  get(key) {
    if (!this.cache.has(key)) return undefined;
    const val = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, val);
    return val;
  }
  set(key, val) {
    if (this.cache.has(key)) this.cache.delete(key);
    else if (this.cache.size >= this.max) {
      this.cache.delete(this.cache.keys().next().value);
    }
    this.cache.set(key, val);
  }
}

class MarkovChain {
  constructor() {
    this.chain = new Map();   // "w1 w2" → ["w3", ...] (bigram)
    this.trichain = new Map(); // "w1 w2 w3" → ["w4", ...] (trigram for #7)
    this.starters = [];       // sentence starters
    this.totalTrained = 0;
    this.maxChainSize = 50000; // prevent unbounded memory
    this.topicChains = new Map(); // topic → separate chain for topic-specific generation (#7)
    this.styleChains = new Map(); // style → chain (4B: casual, formal, slang)
  }

  // (4B) Classify message style
  _classifyStyle(text) {
    const lower = text.toLowerCase();
    const slangWords = ['bruh','ngl','fr','tbh','lowkey','highkey','ong','bussin','deadass','goated','cap','mid','fire','based','ratio','slay','vibe','yall','gonna','wanna','gotta','aint'];
    const slangCount = slangWords.filter(w => lower.includes(w)).length;
    if (slangCount >= 2 || /\b(lmao|lol|omg|wtf|smh|imo)\b/.test(lower)) return 'slang';
    if (/[.!?]\s*[A-Z]/.test(text) && text.length > 60 && !/\b(lol|lmao|bruh)\b/i.test(text)) return 'formal';
    return 'casual';
  }

  train(text, topic = null) {
    if (!text || text.length < 5) return;
    // Skip URLs, commands, emoji-only messages, very short msgs (#7 filter)
    if (/^[!\/]/.test(text)) return;
    if (/^https?:\/\//.test(text)) return;
    // Skip spam-looking messages (#7)
    if (/(.)\1{5,}/.test(text)) return;

    const cleaned = text
      .replace(/<a?:\w+:\d+>/g, '')       // remove custom discord emotes
      .replace(/<@!?\d+>/g, '')            // remove mentions
      .replace(/https?:\/\/\S+/g, '')      // remove URLs
      .trim();

    if (cleaned.length < 8) return; // slightly higher min length (#7)

    const words = cleaned.split(/\s+/).filter(w => w.length > 0);
    if (words.length < 4) return; // need 4+ words for trigrams (#7)

    // Prune if too large
    if (this.chain.size > this.maxChainSize) {
      const keys = [...this.chain.keys()];
      for (let i = 0; i < 5000; i++) {
        this.chain.delete(keys[i]);
      }
    }
    if (this.trichain.size > this.maxChainSize) {
      const keys = [...this.trichain.keys()];
      for (let i = 0; i < 5000; i++) {
        this.trichain.delete(keys[i]);
      }
    }

    this.starters.push(`${words[0]} ${words[1]}`);
    if (this.starters.length > 2000) this.starters = this.starters.slice(-1000);

    // Bigram chains
    for (let i = 0; i < words.length - 2; i++) {
      const key = `${words[i]} ${words[i + 1]}`;
      if (!this.chain.has(key)) this.chain.set(key, []);
      this.chain.get(key).push(words[i + 2]);
    }

    // Trigram chains (#7) — more coherent output
    for (let i = 0; i < words.length - 3; i++) {
      const key = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
      if (!this.trichain.has(key)) this.trichain.set(key, []);
      this.trichain.get(key).push(words[i + 3]);
    }

    // Topic-specific chain (#7) — separate chains per topic for relevance
    if (topic && typeof topic === 'string') {
      if (!this.topicChains.has(topic)) this.topicChains.set(topic, new Map());
      const tc = this.topicChains.get(topic);
      for (let i = 0; i < words.length - 2; i++) {
        const key = `${words[i]} ${words[i + 1]}`;
        if (!tc.has(key)) tc.set(key, []);
        tc.get(key).push(words[i + 2]);
      }
      // Cap per-topic chain
      if (tc.size > 10000) {
        const keys = [...tc.keys()];
        for (let i = 0; i < 2000; i++) tc.delete(keys[i]);
      }
      // Cap total topic chains
      if (this.topicChains.size > 30) {
        const oldest = this.topicChains.keys().next().value;
        this.topicChains.delete(oldest);
      }
    }

    this.totalTrained++;

    // (4B) Style-specific chain
    const style = this._classifyStyle(text);
    if (!this.styleChains.has(style)) this.styleChains.set(style, new Map());
    const sc = this.styleChains.get(style);
    for (let i = 0; i < words.length - 2; i++) {
      const key = `${words[i]} ${words[i + 1]}`;
      if (!sc.has(key)) sc.set(key, []);
      sc.get(key).push(words[i + 2]);
    }
    if (sc.size > 15000) {
      const keys = [...sc.keys()];
      for (let i = 0; i < 3000; i++) sc.delete(keys[i]);
    }
  }

  // (4A) Train with extra weight for positively-received messages
  trainWeighted(text, topic, weight = 2) {
    for (let i = 0; i < weight; i++) this.train(text, topic);
  }

  generate(maxWords = 20, seedWords = null, topic = null, style = null) {
    if (this.chain.size < 10) return null;

    let current = null;

    // Try topic-specific chain first (#7)
    const useTopicChain = topic && this.topicChains.has(topic) && this.topicChains.get(topic).size > 20;
    // (4B) Try style chain if requested
    const useStyleChain = style && this.styleChains.has(style) && this.styleChains.get(style).size > 20;
    const activeChain = useTopicChain ? this.topicChains.get(topic)
      : useStyleChain ? this.styleChains.get(style)
      : this.chain;

    // Try to use seed words from the topic
    if (seedWords && seedWords.length > 0) {
      for (const seed of seedWords) {
        const lower = seed.toLowerCase();
        const matching = [...activeChain.keys()].filter(k =>
          k.toLowerCase().includes(lower)
        );
        if (matching.length > 0) {
          current = matching[Math.floor(Math.random() * matching.length)];
          break;
        }
      }
    }

    // Fallback to random starter
    if (!current) {
      if (this.starters.length === 0) return null;
      current = this.starters[Math.floor(Math.random() * this.starters.length)];
    }
    // Guard against empty string starters
    if (!current || !current.trim()) return null;

    const result = current.split(' ');

    for (let i = 0; i < maxWords; i++) {
      // Try trigram first for more coherent output (#7)
      let word = null;
      if (result.length >= 3) {
        const trikey = `${result[result.length - 3]} ${result[result.length - 2]} ${result[result.length - 1]}`;
        const triNext = this.trichain.get(trikey);
        if (triNext && triNext.length > 0) {
          word = triNext[Math.floor(Math.random() * triNext.length)];
        }
      }

      // Fall back to bigram
      if (!word) {
        const bikey = `${result[result.length - 2]} ${result[result.length - 1]}`;
        const biNext = activeChain.get(bikey);
        if (!biNext || biNext.length === 0) break;
        word = biNext[Math.floor(Math.random() * biNext.length)];
      }

      result.push(word);
      current = `${result[result.length - 2]} ${word}`;
    }

    // Clean up the result
    let text = result.join(' ').trim();
    // Capitalize first letter
    if (text.length > 0) text = text[0].toUpperCase() + text.slice(1);

    return text.length > 3 ? text : null;
  }

  getStats() {
    return {
      chainSize: this.chain.size,
      starterCount: this.starters.length,
      totalTrained: this.totalTrained
    };
  }

  toJSON() {
    // (4C) Increased persistence limits: 20K bigram, 10K trigram, 6K topic, 1K starters
    const entries = [...this.chain.entries()].slice(-20000);
    const triEntries = [...this.trichain.entries()].slice(-10000);
    const topicChainsJSON = {};
    for (const [topic, tc] of this.topicChains) {
      topicChainsJSON[topic] = [...tc.entries()].slice(-6000);
    }
    const styleChainsJSON = {};
    for (const [style, sc] of this.styleChains) {
      styleChainsJSON[style] = [...sc.entries()].slice(-5000);
    }
    return {
      chain: entries,
      trichain: triEntries,
      topicChains: topicChainsJSON,
      styleChains: styleChainsJSON,
      starters: this.starters.slice(-1000),
      totalTrained: this.totalTrained
    };
  }

  loadFromJSON(data) {
    if (!data) return;
    if (data.chain) {
      this.chain = new Map(data.chain);
    }
    if (data.trichain) {
      this.trichain = new Map(data.trichain);
    }
    if (data.topicChains) {
      for (const [topic, entries] of Object.entries(data.topicChains)) {
        this.topicChains.set(topic, new Map(entries));
      }
    }
    if (data.starters) {
      this.starters = data.starters.slice(-1000);
    }
    if (data.totalTrained) {
      this.totalTrained = data.totalTrained;
    }
    if (data.styleChains) {
      for (const [style, entries] of Object.entries(data.styleChains)) {
        this.styleChains.set(style, new Map(entries));
      }
    }
  }
}

// ======================== LEARNED KNOWLEDGE SYSTEM (#2) ========================
// Auto-learns new subjects from conversations when they come up frequently

class LearnedKnowledge {
  constructor() {
    this.subjects = new Map();       // subject → { mentions, sentiments, opinions, firstSeen, lastSeen, type }
    this.pendingSubjects = new Map(); // subject → { count, firstSeen, users } — waiting to cross threshold
    this.learnThreshold = 3;         // mentions by 2+ users before promoting
    this.maxSubjects = 500;
    this.maxPending = 1000;
  }

  // Record a mention of a subject with sentiment context
  recordMention(subject, userId, sentiment, context) {
    if (!subject || subject.length < 2 || subject.length > 60) return;
    const key = subject.toLowerCase().trim();

    // Already learned?
    if (this.subjects.has(key)) {
      const entry = this.subjects.get(key);
      entry.mentions++;
      entry.lastSeen = Date.now();
      if (sentiment && sentiment !== 'neutral') {
        entry.sentiments[sentiment] = (entry.sentiments[sentiment] || 0) + 1;
      }
      if (context && entry.opinions.length < 20) {
        entry.opinions.push({ text: context, sentiment, timestamp: Date.now() });
      }
      entry.users.add(userId);
      return;
    }

    // Track in pending
    if (!this.pendingSubjects.has(key)) {
      this.pendingSubjects.set(key, { count: 0, firstSeen: Date.now(), users: new Set(), sentiments: {}, contexts: [] });
    }
    const pending = this.pendingSubjects.get(key);
    pending.count++;
    pending.users.add(userId);
    if (sentiment && sentiment !== 'neutral') {
      pending.sentiments[sentiment] = (pending.sentiments[sentiment] || 0) + 1;
    }
    if (context && pending.contexts.length < 10) {
      pending.contexts.push({ text: context, sentiment });
    }

    // Promote if threshold met (multiple users + enough mentions)
    if (pending.count >= this.learnThreshold && pending.users.size >= 2) {
      this._promote(key, pending);
    }

    // Cap pending size
    if (this.pendingSubjects.size > this.maxPending) {
      const oldest = this.pendingSubjects.keys().next().value;
      this.pendingSubjects.delete(oldest);
    }
  }

  _promote(key, pending) {
    if (this.subjects.size >= this.maxSubjects) {
      // Evict least-mentioned subject
      let minKey = null, minMentions = Infinity;
      for (const [k, v] of this.subjects) {
        if (v.mentions < minMentions) { minMentions = v.mentions; minKey = k; }
      }
      if (minKey) this.subjects.delete(minKey);
    }

    this.subjects.set(key, {
      mentions: pending.count,
      sentiments: { ...pending.sentiments },
      opinions: pending.contexts.map(c => ({ text: c.text, sentiment: c.sentiment, timestamp: Date.now() })),
      firstSeen: pending.firstSeen,
      lastSeen: Date.now(),
      users: pending.users,
      type: 'learned',
    });
    this.pendingSubjects.delete(key);
  }

  // Get learned opinion about subject
  getOpinion(subject) {
    const key = subject.toLowerCase().trim();
    const entry = this.subjects.get(key);
    if (!entry) return null;

    const totalSentiment = (entry.sentiments.positive || 0) - (entry.sentiments.negative || 0);
    const dominantSentiment = totalSentiment > 0 ? 'positive' : totalSentiment < 0 ? 'negative' : 'neutral';
    const userCount = entry.users instanceof Set ? entry.users.size : (entry.users || 0);

    const templates = {
      positive: [
        `From what people here say {subject} is pretty fire`,
        `Chat seems to really like {subject} ngl`,
        `{subject} gets a lot of love in here honestly`,
        `Most people here are fans of {subject} from what I can tell`,
        `The general consensus on {subject} is positive vibes`,
      ],
      negative: [
        `{subject} gets mixed reception around here ngl`,
        `Chat has some opinions about {subject} and theyre not all great`,
        `From what Ive seen people have issues with {subject}`,
        `{subject} is kinda divisive in here honestly`,
      ],
      neutral: [
        `People talk about {subject} sometimes, opinions are all over the place`,
        `{subject} comes up now and then, mixed feelings from chat`,
        `Ive heard a bit about {subject} from chat, seems interesting`,
        `{subject} is on peoples radar for sure`,
      ],
    };

    const pool = templates[dominantSentiment] || templates.neutral;
    let reply = pool[Math.floor(Math.random() * pool.length)];
    reply = reply.replace(/\{subject\}/g, subject);

    if (userCount >= 5) {
      reply += ` (like ${userCount} people have mentioned it)`;
    }
    return reply;
  }

  // Check if a subject is known (learned)
  has(subject) {
    return this.subjects.has(subject.toLowerCase().trim());
  }

  toJSON() {
    const subj = {};
    for (const [k, v] of this.subjects) {
      subj[k] = { ...v, users: v.users instanceof Set ? v.users.size : v.users };
    }
    const pending = {};
    for (const [k, v] of this.pendingSubjects) {
      pending[k] = { ...v, users: v.users instanceof Set ? v.users.size : v.users };
    }
    return { subjects: subj, pending };
  }

  loadFromJSON(data) {
    if (!data) return;
    if (data.subjects) {
      for (const [k, v] of Object.entries(data.subjects)) {
        this.subjects.set(k, { ...v, users: new Set() });
      }
    }
    if (data.pending) {
      for (const [k, v] of Object.entries(data.pending)) {
        this.pendingSubjects.set(k, { ...v, users: new Set() });
      }
    }
  }
}

// ======================== TRENDING TOPICS SYSTEM (#5) ========================
class FeedbackTracker {
  constructor() {
    // Maps response patterns to positive/negative feedback scores
    this.templateScores = new Map(); // templateKey → { positive: n, negative: n, uses: n }
    this.topicScores = new Map();    // topic → { positive: n, negative: n }
    this.recentChannelFeedback = new Map(); // channelId → [{ isPositive, timestamp }]
    // (5B) Direct feedback on trained pairs: pairKey → { positive, negative }
    this.pairFeedback = new Map();
    // (5C) Per-response variant tracking: responseHash → { positive, negative, uses }
    this.responseFeedback = new Map();
  }

  recordResponse(channelId, templateKey, topic) {
    if (!this.templateScores.has(templateKey)) {
      this.templateScores.set(templateKey, { positive: 0, negative: 0, uses: 0 });
    }
    this.templateScores.get(templateKey).uses++;
    // Cap size
    if (this.templateScores.size > 2000) {
      const oldest = this.templateScores.keys().next().value;
      this.templateScores.delete(oldest);
    }
  }

  // (5A) Record feedback with user weight — active users' feedback counts more
  recordFeedback(templateKey, topic, isPositive, userWeight = 1) {
    const weight = Math.max(0.5, Math.min(userWeight, 3)); // clamp 0.5-3
    if (this.templateScores.has(templateKey)) {
      const entry = this.templateScores.get(templateKey);
      if (isPositive) entry.positive += weight;
      else entry.negative += weight;
    }
    if (topic) {
      if (!this.topicScores.has(topic)) this.topicScores.set(topic, { positive: 0, negative: 0 });
      const ts = this.topicScores.get(topic);
      if (isPositive) ts.positive += weight;
      else ts.negative += weight;
    }
  }

  // (5B) Record direct feedback on a trained pair
  recordPairFeedback(pairKey, isPositive, userWeight = 1) {
    if (!this.pairFeedback.has(pairKey)) {
      this.pairFeedback.set(pairKey, { positive: 0, negative: 0 });
    }
    const entry = this.pairFeedback.get(pairKey);
    const weight = Math.max(0.5, Math.min(userWeight, 3));
    if (isPositive) entry.positive += weight;
    else entry.negative += weight;
    // Cap size
    if (this.pairFeedback.size > 3000) {
      const oldest = this.pairFeedback.keys().next().value;
      this.pairFeedback.delete(oldest);
    }
  }

  // (5B) Get pair feedback score (-1 to 1)
  getPairScore(pairKey) {
    const entry = this.pairFeedback.get(pairKey);
    if (!entry) return 0;
    const total = entry.positive + entry.negative;
    if (total < 2) return 0;
    return (entry.positive - entry.negative) / total;
  }

  // (5C) Record feedback for a specific response variant
  recordResponseFeedback(responseHash, isPositive) {
    if (!this.responseFeedback.has(responseHash)) {
      this.responseFeedback.set(responseHash, { positive: 0, negative: 0, uses: 0 });
    }
    const entry = this.responseFeedback.get(responseHash);
    entry.uses++;
    if (isPositive) entry.positive++;
    else entry.negative++;
    if (this.responseFeedback.size > 5000) {
      const oldest = this.responseFeedback.keys().next().value;
      this.responseFeedback.delete(oldest);
    }
  }

  // (5C) Get score for a specific response variant
  getResponseScore(responseHash) {
    const entry = this.responseFeedback.get(responseHash);
    if (!entry || entry.uses < 2) return 0;
    return (entry.positive - entry.negative) / (entry.positive + entry.negative);
  }

  // Record channel-level feedback for rate limiting (#20)
  recordChannelFeedback(channelId, isPositive) {
    if (!this.recentChannelFeedback.has(channelId)) {
      this.recentChannelFeedback.set(channelId, []);
    }
    const arr = this.recentChannelFeedback.get(channelId);
    arr.push({ isPositive, timestamp: Date.now() });
    // Keep last 20 entries
    if (arr.length > 20) arr.splice(0, arr.length - 20);
  }

  // Get recent feedback score for a channel (0-1, null if no data) (#20)
  getRecentScore(channelId) {
    const arr = this.recentChannelFeedback.get(channelId);
    if (!arr || arr.length < 3) return null;
    // Only consider last hour
    const cutoff = Date.now() - 3600000;
    const recent = arr.filter(e => e.timestamp > cutoff);
    if (recent.length < 3) return null;
    const positiveCount = recent.filter(e => e.isPositive).length;
    return positiveCount / recent.length;
  }

  // Get a score for a template (-1 to 1 range)
  getScore(templateKey) {
    const entry = this.templateScores.get(templateKey);
    if (!entry || entry.uses < 3) return 0; // not enough data
    const total = entry.positive + entry.negative;
    if (total === 0) return 0;
    return (entry.positive - entry.negative) / total;
  }

  // Filter a template pool, removing poorly-scoring ones
  filterPool(pool, topic) {
    if (!pool || pool.length <= 3) return pool; // keep minimum variety
    const filtered = pool.filter(t => {
      const key = `${topic}:${t.substring(0, 40)}`;
      const score = this.getScore(key);
      return score >= -0.3; // only filter out consistently bad ones
    });
    // Safety net: if filtering removed everything, return the original pool
    // so we never end up with zero replies
    if (filtered.length === 0) return pool;
    return filtered;
  }

  toJSON() {
    return {
      templates: [...this.templateScores.entries()].slice(-1000),
      topics: [...this.topicScores.entries()],
      pairFeedback: [...this.pairFeedback.entries()].slice(-2000),
      responseFeedback: [...this.responseFeedback.entries()].slice(-3000),
    };
  }

  loadFromJSON(data) {
    if (!data) return;
    if (data.templates) this.templateScores = new Map(data.templates);
    if (data.topics) this.topicScores = new Map(data.topics);
    if (data.pairFeedback) this.pairFeedback = new Map(data.pairFeedback);
    if (data.responseFeedback) this.responseFeedback = new Map(data.responseFeedback);
  }
}

// ======================== COMMUNITY OPINIONS (#12) ========================
class SlangTracker {
  constructor() {
    // Track expressions that appear frequently in the server
    this.expressions = new Map(); // phrase → { count, users, lastUsed }
    this.maxExpressions = 200;
  }

  record(message, userId) {
    // Look for short repeated phrases (2-4 words that appear a lot)
    const words = message.toLowerCase().split(/\s+/);
    if (words.length < 2 || words.length > 6) return;

    // Track 2-3 word phrases
    for (let len = 2; len <= Math.min(3, words.length); len++) {
      for (let i = 0; i <= words.length - len; i++) {
        const phrase = words.slice(i, i + len).join(' ');
        // Filter out common boring phrases
        if (phrase.length < 4 || /^(i am|it is|do you|are you|in the|on the|of the)$/i.test(phrase)) continue;

        if (!this.expressions.has(phrase)) {
          this.expressions.set(phrase, { count: 0, users: new Set(), lastUsed: Date.now() });
        }
        const e = this.expressions.get(phrase);
        e.count++;
        e.users.add(userId);
        e.lastUsed = Date.now();
      }
    }

    // Prune to max size, keeping highest count
    if (this.expressions.size > this.maxExpressions * 2) {
      const sorted = [...this.expressions.entries()].sort(([,a],[,b]) => b.count - a.count);
      this.expressions = new Map(sorted.slice(0, this.maxExpressions));
    }
  }

  // Get popular server-specific expressions (used by 3+ people, 5+ times)
  getPopular() {
    const popular = [];
    for (const [phrase, data] of this.expressions) {
      const userCount = data.users instanceof Set ? data.users.size : data.users;
      if (data.count >= 5 && userCount >= 3) {
        popular.push({ phrase, count: data.count, users: userCount });
      }
    }
    return popular.sort((a, b) => b.count - a.count).slice(0, 20);
  }

  toJSON() {
    const entries = {};
    for (const [k, v] of this.expressions) {
      entries[k] = { count: v.count, users: v.users instanceof Set ? v.users.size : v.users, lastUsed: v.lastUsed };
    }
    return entries;
  }

  loadFromJSON(data) {
    if (!data) return;
    for (const [k, v] of Object.entries(data)) {
      this.expressions.set(k, { count: v.count, users: new Set(), lastUsed: v.lastUsed });
    }
  }
}

// ======================== LEARNING LOG SYSTEM (#19) ========================

class LearningLog {
  constructor() {
    this.entries = [];
    this.maxEntries = 200;
  }

  log(type, details) {
    this.entries.push({ type, details, timestamp: Date.now() });
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }
  }

  getRecent(count = 20) {
    return this.entries.slice(-count);
  }

  toJSON() {
    return this.entries.slice(-100);
  }

  loadFromJSON(data) {
    if (!data) return;
    this.entries = data;
  }
}

class ReplyHistory {
  constructor(maxPerChannel = 50) {
    this.history = new Map(); // channelId → string[]
    this.maxPerChannel = maxPerChannel;
  }

  record(channelId, reply) {
    if (!this.history.has(channelId)) this.history.set(channelId, []);
    const arr = this.history.get(channelId);
    arr.push(reply.toLowerCase().trim());
    if (arr.length > this.maxPerChannel) arr.shift();
  }

  isDuplicate(channelId, reply) {
    const arr = this.history.get(channelId);
    if (!arr) return false;
    const normalized = reply.toLowerCase().trim();
    // Exact match in last 50
    if (arr.includes(normalized)) return true;
    // Very similar match in last 25 (Jaccard similarity > 0.75)
    const replyWords = new Set(normalized.split(/\s+/));
    for (let i = arr.length - 1; i >= Math.max(0, arr.length - 25); i--) {
      const pastWords = new Set(arr[i].split(/\s+/));
      const intersection = [...replyWords].filter(w => pastWords.has(w)).length;
      const union = new Set([...replyWords, ...pastWords]).size;
      if (union > 0 && intersection / union > 0.75) return true;
    }
    return false;
  }

  toJSON() {
    const obj = {};
    for (const [k, v] of this.history) obj[k] = v.slice(-30);
    return obj;
  }

  loadFromJSON(data) {
    if (!data) return;
    for (const [k, v] of Object.entries(data)) this.history.set(k, v);
  }
}

// ======================== WORD ASSOCIATION GRAPH (#9) ========================
function getTimeContext() {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay(); // 0=Sun
  const month = now.getMonth(); // 0=Jan
  const date = now.getDate();

  let timeOfDay;
  if (hour >= 5 && hour < 12) timeOfDay = 'morning';
  else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
  else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
  else timeOfDay = 'night';

  const isWeekend = day === 0 || day === 6;
  const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day];

  return { hour, day, dayName, month, date, timeOfDay, isWeekend };
}

function getTimeGreeting() {
  const ctx = getTimeContext();
  const greetings = {
    morning: ['good morning chat', 'morning yall', 'gm everyone', 'rise and grind chat',
      'gm gm', 'wakey wakey chat', 'morning coffee hit different today', 'who else just woke up',
      'early bird gang', 'its too early for this but gm'],
    afternoon: ['afternoon vibes', 'hope yall having a good day', 'how is everyones day going',
      'afternoon check in whats good', 'halfway through the day lets go',
      'lunch break vibes', 'surviving the afternoon?'],
    evening: ['evening chat', 'hope the day was good yall', 'evening vibes hitting',
      'winding down or just getting started?', 'evening crew whats good',
      'how was everyones day', 'the evening shift is here'],
    night: ['late night crew represent', 'night owls gang', 'who else cant sleep lol',
      'the real ones are on at this hour', 'its way too late but here we are',
      'night time is the best time for chat', 'sleep is overrated honestly',
      'the 3am thoughts are hitting different', 'insomnia gang where you at'],
  };
  const pool = greetings[ctx.timeOfDay];
  let greeting = pool[Math.floor(Math.random() * pool.length)];
  // Occasional day-of-week reference
  if (Math.random() < 0.15) {
    const dayComments = {
      Monday: 'monday grind', Tuesday: 'taco tuesday vibes', Wednesday: 'hump day',
      Thursday: 'almost friday', Friday: 'FRIDAY LETS GO', Saturday: 'weekend mode',
      Sunday: 'sunday chill'
    };
    if (dayComments[ctx.dayName]) greeting += ', ' + dayComments[ctx.dayName];
  }
  return greeting;
}

// ======================== SEASONAL/EVENT AWARENESS (#11) ========================

function getSeasonalContext() {
  const now = new Date();
  const month = now.getMonth();
  const date = now.getDate();
  const md = `${month + 1}-${date}`;

  // Specific dates
  const events = {
    '1-1': 'new_year', '2-14': 'valentines', '3-17': 'st_patricks',
    '10-31': 'halloween', '12-25': 'christmas', '12-31': 'new_years_eve',
    '7-4': 'july_4th', '11-11': 'veterans_day',
  };

  // Check ±1 day for events
  if (events[md]) return events[md];
  const yesterday = new Date(now); yesterday.setDate(date - 1);
  const tomorrow = new Date(now); tomorrow.setDate(date + 1);
  const mdY = `${yesterday.getMonth() + 1}-${yesterday.getDate()}`;
  const mdT = `${tomorrow.getMonth() + 1}-${tomorrow.getDate()}`;
  if (events[mdT]) return `eve_of_${events[mdT]}`;

  // Seasons
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

const SEASONAL_COMMENTS = {
  new_year: ['happy new year chat 🎉', 'new year new us frfr', 'whos already failed their resolution lol'],
  valentines: ['happy valentines day chat ❤️', 'love is in the air or whatever'],
  halloween: ['happy halloween 🎃', 'spooky season vibes', 'trick or treat chat'],
  christmas: ['merry christmas yall 🎄', 'tis the season chat', 'hope everyone got something nice'],
  new_years_eve: ['last day of the year lets gooo', 'who else celebrating tonight'],
  eve_of_christmas: ['christmas tomorrow chat lets gooo 🎄'],
  summer: ['summer vibes hitting different', 'its giving summer energy'],
  fall: ['fall weather is elite honestly', 'cozy season loading'],
  winter: ['its cold out there ngl', 'winter arc activated'],
  spring: ['spring energy is immaculate', 'the weather is finally getting better'],
};

// ======================== SMART EMOJI MAPPING (#7) ========================

const TOPIC_EMOJIS = {
  gaming: ['🎮', '🕹️', '👾'],
  music: ['🎵', '🎶', '🎤'],
  food: ['🍕', '🍔', '🍳'],
  anime: ['⚔️', '✨', '🔥'],
  movies: ['🎬', '🍿', '📺'],
  sports: ['⚽', '🏀', '🏆'],
  tech: ['💻', '🤖', '⚡'],
  pets: ['🐱', '🐶', '🐾'],
  stream: ['📺', '🎥', '🔴'],
  meme: ['💀', '😭', '🤣'],
  art: ['🎨', '✏️', '🖼️'],
  school: ['📚', '✏️', '🎓'],
  work: ['💼', '😤', '☕'],
  fitness: ['💪', '🏋️', '🔥'],
  weather: ['☀️', '🌧️', '❄️'],
  mood_positive: ['😄', '🔥', '✨', '💯'],
  mood_negative: ['😔', '💀', '😤'],
  greeting: ['👋', '✌️'],
};

const SENTIMENT_EMOJIS = {
  positive: ['🔥', '💯', '✨', 'W', '😤'],
  negative: ['😔', 'F', '💀', '😭'],
  neutral: ['👀', '🤔', '💭'],
};

// ======================== TYPO SIMULATION (#8) ========================

function simulateTypo(text) {
  if (text.length < 10 || Math.random() > 0.04) return null; // 4% chance
  const words = text.split(/\s+/);
  if (words.length < 3) return null;

  // Pick a random word to typo (not the first word)
  const idx = 1 + Math.floor(Math.random() * (words.length - 1));
  const word = words[idx];
  if (word.length < 4) return null;

  // Types of typos
  const typoTypes = [
    // Swap adjacent letters
    () => {
      const pos = Math.floor(Math.random() * (word.length - 1));
      return word.substring(0, pos) + word[pos + 1] + word[pos] + word.substring(pos + 2);
    },
    // Double a letter
    () => {
      const pos = Math.floor(Math.random() * word.length);
      return word.substring(0, pos) + word[pos] + word[pos] + word.substring(pos + 1);
    },
    // Skip a letter
    () => {
      const pos = 1 + Math.floor(Math.random() * (word.length - 2));
      return word.substring(0, pos) + word.substring(pos + 1);
    },
  ];

  const typoFn = typoTypes[Math.floor(Math.random() * typoTypes.length)];
  const typoWord = typoFn();
  const typoText = [...words.slice(0, idx), typoWord, ...words.slice(idx + 1)].join(' ');
  const correction = `*${word}`;

  return { typoText, correction };
}

// ======================== ANTI-ECHO CHECK ========================

// Detect if reply is too similar to the user's original message
function isEchoReply(reply, userMessage) {
  if (!reply || !userMessage) return false;
  const replyLower = reply.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const msgLower = userMessage.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

  // Exact or near-exact match
  if (replyLower === msgLower) return true;

  const replyWords = replyLower.split(/\s+/);
  const msgWords = msgLower.split(/\s+/);
  if (replyWords.length < 3 || msgWords.length < 3) return false;

  // Check for long consecutive word overlap (copying half the sentence)
  let maxConsecutive = 0;
  for (let i = 0; i <= msgWords.length - 3; i++) {
    for (let j = 0; j <= replyWords.length - 3; j++) {
      let streak = 0;
      while (i + streak < msgWords.length && j + streak < replyWords.length
        && msgWords[i + streak] === replyWords[j + streak]) {
        streak++;
      }
      if (streak > maxConsecutive) maxConsecutive = streak;
    }
  }
  // If 4+ consecutive words from user message appear in reply, it's echo
  if (maxConsecutive >= 4) return true;

  // Check overall word overlap ratio
  const msgSet = new Set(msgWords.filter(w => w.length > 2));
  const overlapCount = replyWords.filter(w => w.length > 2 && msgSet.has(w)).length;
  const overlapRatio = overlapCount / Math.max(replyWords.filter(w => w.length > 2).length, 1);
  // If >60% of meaningful reply words came from user message, it's echo
  if (overlapRatio > 0.6 && overlapCount >= 4) return true;

  return false;
}

// ======================== SELF-CORRECTION CHECK ========================

// Detect if a Markov-generated reply looks broken/incoherent
function detectBrokenReply(text) {
  if (!text || text.length < 10) return null;
  const words = text.split(/\s+/);

  // Repeated words in a row: "the the game game"
  for (let i = 0; i < words.length - 1; i++) {
    if (words[i].toLowerCase() === words[i + 1].toLowerCase() && words[i].length > 2) {
      return { type: 'repeat', word: words[i], index: i };
    }
  }

  // Sentence that ends abruptly mid-thought (last word is a preposition/article/conjunction)
  const trailOff = ['the', 'a', 'an', 'to', 'and', 'but', 'or', 'in', 'on', 'at', 'for', 'with', 'is', 'are', 'was', 'of', 'that', 'this', 'its', 'so', 'if', 'when', 'not'];
  const lastWord = words[words.length - 1].toLowerCase().replace(/[^a-z]/g, '');
  if (trailOff.includes(lastWord) && words.length > 3) {
    return { type: 'trail_off', word: lastWord };
  }

  // Very repetitive content (same word 3+ times)
  const freq = {};
  for (const w of words) {
    const lower = w.toLowerCase().replace(/[^a-z]/g, '');
    if (lower.length > 3) {
      freq[lower] = (freq[lower] || 0) + 1;
      if (freq[lower] >= 3 && words.length < 15) return { type: 'repetitive', word: lower };
    }
  }

  return null;
}

// Generate a natural self-correction message
function generateSelfCorrection(brokenInfo, originalReply) {
  const corrections = {
    repeat: [
      `wait I just said ${brokenInfo.word} twice lmao`,
      `*${brokenInfo.word}  ignore the brain lag`,
      `ok that made no sense, basically what I mean is`,
      `my brain lagged there for a sec`,
      `brain.exe stopped working`,
    ],
    trail_off: [
      'actually nvm I lost my train of thought',
      'wait where was I going with that',
      'ok I forgor what I was saying 💀',
      'lol I got distracted mid sentence',
      '...I had a point I swear',
      'the thought left my brain mid message',
    ],
    repetitive: [
      'ok that sounded weird let me try again',
      'that came out wrong',
      `sorry I keep saying ${brokenInfo.word} lol`,
      'my vocabulary really said ✌️',
    ],
  };
  const pool = corrections[brokenInfo.type] || corrections.trail_off;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ======================== ANTI-SPAM GUARD (#12) ========================

function detectSpamBurst(recentMessages) {
  if (!recentMessages || recentMessages.length < 5) return false;
  const last5 = recentMessages.slice(-5);
  const timeSpan = last5[last5.length - 1].timestamp - last5[0].timestamp;
  if (timeSpan > 10000) return false; // 5 msgs in >10s is normal

  // Check if same user sent 4+ of the last 5
  const userCounts = {};
  for (const m of last5) {
    userCounts[m.userId] = (userCounts[m.userId] || 0) + 1;
  }
  if (Object.values(userCounts).some(c => c >= 4)) return true;

  // Check if messages are very similar (spam flood)
  const contents = last5.map(m => m.content.toLowerCase().trim());
  const unique = new Set(contents);
  if (unique.size <= 2) return true;

  return false;
}

// ======================== TOPIC DETECTION ========================

const POSITIVE_WORDS = new Set([
  'good', 'great', 'awesome', 'amazing', 'love', 'like', 'best', 'nice',
  'cool', 'fire', 'sick', 'dope', 'epic', 'incredible', 'perfect', 'beautiful',
  'happy', 'glad', 'excited', 'hype', 'insane', 'goated', 'pog', 'poggers',
  'clutch', 'based', 'valid', 'bussin', 'lit', 'cracked', 'legendary',
  'W', 'w', 'dub', 'gg', 'wp', 'yes', 'yeah', 'yep', 'absolutely',
  'thanks', 'thank', 'appreciate', 'respect', 'congrats', 'congratulations',
  'sheesh', 'clean', 'smooth', 'ez', 'easy', 'fun', 'funny', 'hilarious',
  'lol', 'lmao', 'haha', 'hahaha', 'xd'
]);

const NEGATIVE_WORDS = new Set([
  'bad', 'terrible', 'awful', 'worst', 'hate', 'trash', 'garbage',
  'boring', 'lame', 'mid', 'cringe', 'yikes', 'L', 'loss', 'fail',
  'sad', 'angry', 'toxic', 'annoying', 'frustrated', 'tilted',
  'dead', 'pain', 'suffering', 'bruh', 'oof', 'rip', 'unlucky',
  'lag', 'laggy', 'crash', 'broken', 'bugged', 'scam', 'fake',
  'troll', 'griefing', 'throwing', 'cope', 'seethe', 'mald'
]);

function analyzeSentiment(text) {
  const words = text.toLowerCase().split(/\s+/);
  let pos = 0, neg = 0;
  for (const w of words) {
    if (POSITIVE_WORDS.has(w)) pos++;
    if (NEGATIVE_WORDS.has(w)) neg++;
  }
  const total = pos + neg;
  if (total === 0) return 'neutral';
  if (pos > neg) return 'positive';
  if (neg > pos) return 'negative';
  return 'neutral';
}

// ======================== RESPONSE MODIFIERS ========================
// These are prepended/appended to base templates for massive variety

const PREFIXES = {
  agree: ['Honestly ', 'Lowkey ', 'Ngl ', 'Fr ', 'Tbh ', 'Actually ', 'Legit ', 'Deadass ', 'Straight up ', 'Real talk ', 'No joke ', 'Not gonna lie ', 'On god ', 'For real ', 'Genuinely ', 'Truthfully ', 'Unironically '],
  react: ['Bro ', 'Bruh ', 'Yo ', 'Dude ', 'Lol ', 'Lmao ', 'Haha ', 'Omg ', 'Wait ', 'Ok but ', 'Nah but ', 'See ', 'Look ', 'Ayo ', 'Sheesh ', 'Dawg ', 'Man ', 'Fam '],
  soft: ['I think ', 'I feel like ', 'Imo ', 'In my opinion ', 'Personally ', 'To me ', 'Id say ', 'I mean ', 'Like ', 'Kinda ', 'Lowkey ', 'Maybe its just me but ', 'Could be wrong but ', 'Not sure but ', 'I might be biased but '],
};

const SUFFIXES = {
  emphasis: [' fr', ' ngl', ' tbh', ' honestly', ' no cap', ' for real', ' lowkey', ' actually', ' tho', ' though', ' not gonna lie', ' on god', ' deadass', ' straight up', ' fs', ' frfr', ' ong'],
  filler: [' lol', ' lmao', ' haha', ' 😂', ' 💀', ' 😭', ' bruh', ' dawg', ' man', ' bro', ' fr tho', ' im ngl', ' istg', ' idk'],
  hype: [' 🔥', ' 🔥🔥', ' 💪', ' lets gooo', ' sheesh', ' W', ' 🫡', ' ‼️', ' 😤', ' no cap 🔥', ' goated', ' elite', ' bussin'],
  chill: [' ya know', ' just saying', ' idk man', ' whatever tho', ' its all good', ' no worries', ' vibing', ' its whatever', ' i guess', ' you know how it is', ' thats just how it is'],
};

// Apply a random modifier to a template string to create variety
// Optional inputStyle parameter adjusts prefix/suffix selection to mirror user's vibe
function modifyResponse(base, inputStyle) {
  const baseLower = base.toLowerCase();

  // Adjust probabilities and pool selection based on input style
  let prefixChance = 0.4;
  let suffixChance = 0.3;
  let preferredPrefix = null;
  let preferredSuffix = null;
  if (inputStyle === 'hype' || inputStyle === 'energetic') {
    prefixChance = 0.5;
    suffixChance = 0.45;
    preferredPrefix = 'react';
    preferredSuffix = 'hype';
  } else if (inputStyle === 'chill' || inputStyle === 'minimal') {
    prefixChance = 0.3;
    suffixChance = 0.35;
    preferredPrefix = 'soft';
    preferredSuffix = 'chill';
  }

  // 40% chance to add a prefix (adjusted by style)
  if (Math.random() < prefixChance) {
    const prefixType = preferredPrefix && Math.random() < 0.6
      ? preferredPrefix
      : ['agree', 'react', 'soft'][Math.floor(Math.random() * 3)];
    const prefix = PREFIXES[prefixType][Math.floor(Math.random() * PREFIXES[prefixType].length)];
    // Only add prefix if base doesn't already start with a similar word
    if (!base.match(/^(Bro|Bruh|Yo|Dude|Ngl|Honestly|Lowkey|Fr|Tbh|Lol|Lmao|I think|Imo)/i)) {
      // Dedup: don't add "Ngl" prefix if base already contains "ngl"
      const prefixWord = prefix.trim().toLowerCase().split(' ')[0];
      if (!baseLower.includes(prefixWord) || prefixWord.length <= 2) {
        base = prefix + base.charAt(0).toLowerCase() + base.slice(1);
      }
    }
  }
  // 30% chance to add a suffix (adjusted by style)
  if (Math.random() < suffixChance) {
    const suffixType = preferredSuffix && Math.random() < 0.6
      ? preferredSuffix
      : ['emphasis', 'filler', 'chill', 'hype'][Math.floor(Math.random() * 4)];
    const suffix = SUFFIXES[suffixType][Math.floor(Math.random() * SUFFIXES[suffixType].length)];
    const suffixWord = suffix.trim().toLowerCase().replace(/[^a-z]/g, '');
    // Dedup: don't add "lol" suffix if base already has "lol", etc.
    const alreadyHas = suffixWord.length > 1 && baseLower.includes(suffixWord);
    const lastChar = base.slice(-3);
    if (!alreadyHas && !suffix.trim().startsWith(lastChar.trim()) && !base.endsWith(suffix.trim())) {
      base = base.replace(/[.!,]$/, '') + suffix;
    }
  }

  // Strip trailing period (Discord users rarely use periods)
  base = base.replace(/\.\s*$/, '');

  // 35% chance to go all-lowercase (very natural for Discord)
  if (Math.random() < 0.35 && !/[🔥⚡💀😂😭🎮]/.test(base)) {
    base = base.toLowerCase();
  }

  return base;
}

// ======================== INTENT DETECTION ========================
// Understanding WHAT someone is doing: asking, sharing, comparing, etc.

const INTENT_PATTERNS = {
  asking_opinion: [
    /what do you(?:all| guys)? think (?:of|about) (.+?)[\?]?$/i,
    /thoughts on (.+?)[\?]?$/i,
    /(?:your|anyones?) (?:opinion|take|thoughts) on (.+?)[\?]?$/i,
    /how (?:do you|you) feel about (.+?)[\?]?$/i,
    /^is (.+?) (?:good|worth it|any good|worth|overrated|underrated|mid)[\?]?$/i,
    /(?:should i|should we) (?:get|try|play|watch|buy|listen to|check out) (.+?)[\?]?$/i,
    /(?:anyone|anybody) (?:tried|played|watched|seen|heard) (.+?)[\?]?$/i,
    /(?:have you|you) (?:tried|played|watched|seen|heard) (.+?)[\?]?$/i,
    /rate (.+)/i,
  ],
  asking_info: [
    /what(?:'s| is) (.+?) (?:about|like)[\?]?$/i,
    /what (?:is|are|was|were) (.+?)[\?]?$/i,
    /(?:tell me|explain|describe) (?:about |what )(.+)/i,
    /(?:who|what) (?:is|are|was) (.+?)[\?]?$/i,
    /how (?:does|do|did|is) (.+?) (?:work|play|run|perform)[\?]?$/i,
    /whats (.+?)[\?]?$/i,
    /do you (?:know|like) (.+?)[\?]?$/i,
    /(?:anyone know|does anyone know) (?:about |what )(.+?)[\?]?$/i,
  ],
  sharing_experience: [
    /i just (?:finished|beat|completed|watched|played|tried|started|got|bought) (.+)/i,
    /just (?:finished|beat|completed|watched|played|tried|started|got|bought) (.+)/i,
    /i(?:'ve|ve| have) been (?:playing|watching|listening to|into|hooked on|addicted to|obsessed with) (.+)/i,
    /(?:^|\s)been (?:playing|watching|listening to|into|hooked on|addicted to|obsessed with) (.+)/i,
    /i (?:love|like|enjoy|adore|appreciate|dig) (.+)/i,
    /(?:finally|just) got into (.+)/i,
    /i(?:'m|m| am) (?:playing|watching|listening to|reading|into|obsessed with|addicted to) (.+)/i,
    /currently (?:playing|watching|listening to|reading|into) (.+)/i,
    /started (?:playing|watching|getting into) (.+)/i,
  ],
  recommending: [
    /you (?:guys |all )?(?:should|gotta|need to|have to) (?:try|play|watch|listen to|check out|get) (.+)/i,
    /(?:go |everyone )?(?:play|watch|listen to|try|check out) (.+)/i,
    /(.+?) is (?:so good|amazing|fire|goated|a must|incredible|underrated|a banger|slept on|bussin)/i,
    /i (?:recommend|suggest) (.+)/i,
    /(?:highly|definitely|seriously) recommend (.+)/i,
    /if you (?:like|enjoy|havent tried) .+? (?:try|check out|play|watch) (.+)/i,
  ],
  complaining: [
    /(.+?) is (?:so bad|terrible|trash|garbage|broken|mid|overrated|awful|scam|dog ?water|ass|wack|dead)/i,
    /i (?:hate|cant stand|can't stand|cant deal with|am so tired of|am sick of|despise|loathe) (.+)/i,
    /(.+?) (?:sucks|is trash|is garbage|is dead|is boring|pisses me off|is ass|is wack|fell off|flopped)/i,
    /(?:im|i'm|i am) (?:done with|over|sick of|tired of|fed up with) (.+)/i,
    /(.+?) (?:ruined|killed|destroyed|butchered) (?:it|the game|the show|everything)/i,
  ],
  comparing: [
    /(.+?) (?:vs|versus|or|compared to) (.+?)[\?]?$/i,
    /(.+?) is (?:better|worse|superior|inferior|more fun|harder) (?:than|to|compared to) (.+)/i,
    /which is better[,:]? (.+?) or (.+?)[\?]?$/i,
    /would you (?:rather|prefer|pick|choose) (.+?) or (.+?)[\?]?$/i,
    /(.+?) (?:>>|>>>|>|<<) (.+)/i,
  ],
  greeting_bot: [
    /^(?:he+y+|hi+|hello+|yo+|su+p|whats up|what's up|howdy|hiya|heyo|ayoo*|waddup|wsg|wassup)(?:\s+(?:bot|smartbot|buddy|dude|bro|man|homie|fam))?[\s!?.]*$/i,
    /^(?:good (?:morning|afternoon|evening|night))(?:\s+(?:bot|smartbot|everyone|all|guys|chat))?[\s!?.]*$/i,
    /^(?:how are you|how you doing|hows it going|how's it going|what's good|whats good)[\s!?.]*$/i,
  ],
};

// Extract the subject from a message (what they're specifically talking about)
function extractSubject(text) {
  const lower = text.toLowerCase().trim();
  // Clean up common wrappers
  const cleaned = lower
    .replace(/<a?:\w+:\d+>/g, '')
    .replace(/<@!?\d+>/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[!]{2,}/g, '!')
    .trim();

  // Try each intent pattern
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    for (const pattern of patterns) {
      const match = cleaned.match(pattern);
      if (match) {
        // Greeting intent has no subjects
        if (intent === 'greeting_bot') {
          return { intent, subjects: [], raw: cleaned };
        }
        // For comparing intents, capture both subjects
        if (intent === 'comparing' && match[2]) {
          return { intent, subjects: [match[1].trim(), match[2].trim()], raw: cleaned };
        }
        if (match[1]) {
          // Clean trailing punctuation and common noise from subject
          let subj = match[1].trim().replace(/[?.!,]+$/, '').trim();
          // Strip leading verbs that sometimes get captured (e.g. "playing bg3" → "bg3")
          subj = subj.replace(/^(?:playing|watching|listening to|reading|trying|getting into|checking out|streaming|doing)\s+/i, '');
          if (subj.length > 0) {
            return { intent, subjects: [subj], raw: cleaned };
          }
        }
      }
    }
  }

  return null;
}

// ======================== OPINION ENGINE ========================
// Generates contextual opinions about specific subjects

const OPINION_TEMPLATES = {
  asking_info: {
    positive: [
      '{subject}? Oh yeah I know about that, its pretty solid from what I can tell',
      'From what I know {subject} is generally well liked',
      '{subject} is something a lot of people are into honestly',
      'Yeah {subject} is definitely a thing, and mostly positive vibes around it',
    ],
    neutral: [
      '{subject}? I know a bit about it, its one of those things people have mixed feelings on',
      'So {subject} is interesting, people either love it or are meh about it',
      '{subject} is kinda divisive honestly but worth looking into',
      'Hmm {subject}, from what Ive seen its a mixed bag but has its fans',
    ],
  },
  asking_opinion: {
    positive: [
      'Honestly {subject} is really solid, I\'d give it a thumbs up',
      '{subject}? Yeah that\'s actually pretty fire imo',
      'I think {subject} is underrated, more people should try it',
      'Big fan of {subject} ngl, would recommend',
      '{subject} goes hard tbh, I\'m into it',
      '{subject} is lowkey one of the better ones out there',
      'Tbh {subject} is a W choice, good taste',
      '{subject}? 10/10 would recommend fr',
      'I mess with {subject} heavy honestly',
      'Hot take: {subject} is actually goated',
      '{subject} is definitely worth checking out',
      'Cant go wrong with {subject} honestly',
      '{subject} hits different once you really get into it',
      'Imo {subject} is elite if you give it a chance',
    ],
    negative: [
      '{subject}? Eh its mid imo not gonna lie',
      'Honestly I think {subject} is a bit overrated',
      '{subject} had potential but kinda fell off',
      'Not the biggest fan of {subject} personally but I get why people like it',
      '{subject} is... fine I guess? Not my thing tho',
      'I tried {subject} and it was kinda underwhelming ngl',
      'Hot take: {subject} is overhyped, there are better options',
      '{subject} just didnt click with me but thats just me',
    ],
    neutral: [
      '{subject}? I think it really depends on what youre into',
      'Hmm {subject} is one of those things you either love or hate',
      '{subject} has its moments, its not for everyone tho',
      'I have mixed feelings about {subject} honestly',
      '{subject}? It depends tbh, what specifically about it?',
      'Some people swear by {subject} and some dont, I can see both sides',
      '{subject} is interesting ngl, worth trying at least once',
    ],
  },
  sharing_experience: {
    positive: [
      'Ooh nice! How is {subject}? Ive heard good things',
      '{subject}?? Thats awesome, how are you liking it so far?',
      'W for getting into {subject}',
      'Yoo {subject} sounds fire honestly',
      'Lets go!! {subject} is such a vibe',
      'No way you just started {subject}? Tell me how it goes',
      'Oh {subject} sounds interesting, keep us posted',
      '{subject} seems like a solid choice ngl',
      'Thats cool! How is {subject} treating you?',
    ],
    negative: [
      'Oof {subject} huh... yeah Ive heard it can be rough',
      '{subject} really be testing patience sometimes from what I hear',
      'I feel you on {subject}, sounds like a hit or miss',
      'Yeah {subject} can be like that unfortunately lol',
    ],
    neutral: [
      'Oh nice! How far are you into {subject}?',
      '{subject} huh? Whats the vibe so far?',
      'Ooh tell me more about {subject}, how is it?',
      'Oh cool! First time with {subject} or coming back to it?',
      'Interesting, whats your take on {subject} so far?',
    ],
  },
  recommending: {
    positive: [
      'Facts {subject} is actually so good',
      'Been saying this!! {subject} deserves more love',
      'Adding {subject} to the list, good looks 🙏',
      'W recommendation, {subject} goes hard',
      'Ok bet Ill check out {subject}, sounds good',
      'You got good taste, {subject} is legit',
      'Yooo {subject} goes crazy honestly',
      '{subject} is valid I respect the recommendation',
    ],
    neutral: [
      'Ive been hearing about {subject}, might have to check it out',
      '{subject}? Alright Ill give it a shot',
      'Ill take your word on {subject}, whats the best part?',
      'Hmm {subject}... sell me on it, why should I try it?',
      'Ok {subject} is on the radar now, thanks for the tip',
    ],
  },
  complaining: {
    agree: [
      'Honestly yeah {subject} has been rough lately',
      'I feel that, {subject} is frustrating fr',
      'The {subject} experience is pain sometimes ngl',
      'Yeah {subject} needs work, youre not wrong',
      'I been saying this about {subject} for a while now',
      '{subject} really dropped the ball on that one',
    ],
    disagree: [
      'Idk I think {subject} gets too much hate honestly',
      'Hot take but {subject} isnt as bad as people say',
      'I kinda like {subject} ngl, but I see your point',
      '{subject} has issues but also has some good things going for it',
    ],
    empathize: [
      'That sounds rough, {subject} can be annoying for sure',
      'I feel you on {subject}, hang in there lol',
      'The {subject} struggle is real, youre not alone',
      'Yeah {subject} be like that sometimes unfortunately',
    ],
  },
  comparing: {
    templates: [
      'Oooh {subject1} vs {subject2}? Thats a tough one',
      'Hmm I think {subject1} has the edge but {subject2} is solid too',
      'Id go with {subject2} personally but {subject1} is a close second',
      'Both are good but {subject1} hits different for me',
      'Depends on what you want tbh, {subject1} for one thing {subject2} for another',
      'This is the debate that never ends lol, {subject1} vs {subject2}',
      'I flip flop between {subject1} and {subject2} all the time honestly',
      'Controversial take: {subject2} > {subject1} but I respect both',
      '{subject1} and {subject2} are both W tier honestly',
      'The real answer is both, {subject1} and {subject2} each have their moments',
    ],
  },
};

// ======================== CONVERSATION AWARENESS ========================
// Understand the flow of conversation, not just individual messages

function analyzeConversationFlow(recentMessages) {
  if (!recentMessages || recentMessages.length < 2) return null;

  const flow = {
    dominantTopic: null,
    mood: 'neutral',         // overall mood of the conversation
    isActive: false,         // is the convo flowing fast
    lastSubjects: [],        // recent subjects being discussed
    isDebate: false,         // are people disagreeing
    isHype: false,           // is everyone excited
  };

  let posCount = 0, negCount = 0;
  const topicCounts = {};
  const subjects = [];

  for (const msg of recentMessages) {
    const sentiment = analyzeSentiment(msg.content);
    if (sentiment === 'positive') posCount++;
    if (sentiment === 'negative') negCount++;

    if (msg.topics) {
      for (const [topic, data] of msg.topics) {
        topicCounts[topic] = (topicCounts[topic] || 0) + data.score;
      }
    }

    // Try extracting subjects from each message
    const extracted = extractSubject(msg.content);
    if (extracted && extracted.subjects) {
      subjects.push(...extracted.subjects);
    }
  }

  // Determine dominant topic
  const topTopic = Object.entries(topicCounts).sort(([,a],[,b]) => b - a)[0];
  if (topTopic) flow.dominantTopic = topTopic[0];

  // Determine mood
  if (posCount > negCount * 2) flow.mood = 'positive';
  else if (negCount > posCount * 2) flow.mood = 'negative';
  else if (posCount > 0 && negCount > 0) flow.mood = 'mixed';

  // Activity check
  if (recentMessages.length >= 5) {
    const timeSpan = recentMessages[recentMessages.length - 1].timestamp - recentMessages[0].timestamp;
    if (timeSpan < 120000) flow.isActive = true; // 5+ msgs in 2 min = active
  }

  // Hype check
  const hypeWords = ['lets go', 'hype', 'pog', 'poggers', 'W', '🔥', 'goated', 'sheesh'];
  const hypeCount = recentMessages.filter(m =>
    hypeWords.some(w => m.content.toLowerCase().includes(w))
  ).length;
  if (hypeCount >= 3) flow.isHype = true;

  flow.lastSubjects = [...new Set(subjects)].slice(-5);

  return flow;
}

// ======================== SMART RESPONSE COMPOSER ========================
// Builds responses that reference actual content from the message

function composeContextualReply(subject, intent, sentiment, topic, conversationFlow) {
  // If we have a specific subject and intent, use the opinion engine
  if (subject && OPINION_TEMPLATES[intent]) {
    const subjectText = subject.subjects ? subject.subjects[0] : '';
    // Skip opinion templates if the "subject" is a generic phrase, not a real entity
    // e.g. "promoted at work", "you guys watching" should fall through to topic templates
    if (subjectText && (/^(?:the |a |an |my |your |you |we |they |it |this |that |some )/.test(subjectText)
        || subjectText.split(/\s+/).length > 4
        || /\b(?:best|worst|good|favorite|right now|these days|lately|anyone|guys|everyone|at work|at school|so much|kinda|really)\b/i.test(subjectText))) {
      return null;
    }
    const templates = OPINION_TEMPLATES[intent];
    let pool;

    if (intent === 'comparing' && subject.subjects && subject.subjects.length >= 2) {
      pool = templates.templates;
      const choice = pool[Math.floor(Math.random() * pool.length)];
      return choice
        .replace(/\{subject1\}/g, subject.subjects[0])
        .replace(/\{subject2\}/g, subject.subjects[1]);
    }

    if (intent === 'complaining') {
      // Randomly agree, disagree, or empathize
      const r = Math.random();
      if (r < 0.5) pool = templates.agree;
      else if (r < 0.7) pool = templates.disagree;
      else pool = templates.empathize;
    } else if (templates.positive && templates.negative && templates.neutral) {
      // For opinion/sharing: weight towards positive (people like being agreed with)
      const r = Math.random();
      if (sentiment === 'negative') {
        pool = r < 0.5 ? templates.negative : templates.neutral;
      } else if (sentiment === 'positive') {
        pool = r < 0.7 ? templates.positive : templates.neutral;
      } else {
        if (r < 0.4) pool = templates.positive;
        else if (r < 0.6) pool = templates.neutral;
        else pool = templates.negative;
      }
    } else if (templates.positive && templates.neutral) {
      pool = Math.random() < 0.6 ? templates.positive : templates.neutral;
    } else {
      pool = templates.positive || templates.neutral || Object.values(templates)[0];
    }

    if (pool && pool.length > 0) {
      const choice = pool[Math.floor(Math.random() * pool.length)];
      const subjectText = subject.subjects ? subject.subjects[0] : '';
      return choice.replace(/\{subject\}/g, subjectText);
    }
  }

  return null; // fall through to regular template system
}

// ======================== BUILT-IN KNOWLEDGE BASE ========================
// The bot's "brain" — subjects it actually knows about and can discuss

const BUILT_IN_KNOWLEDGE = {
  // --- GAMES ---
  'valorant': { type: 'game', genre: 'fps', desc: 'a tactical 5v5 shooter by Riot', opinions: { positive: ['Valorant honestly sets the bar for tactical shooters rn', 'The agent abilities in Valorant add so much strategy', 'Valorant ranked grind is addicting once you get into it'], negative: ['Valorant can be pretty toxic in ranked ngl', 'The matchmaking in Valorant feels off sometimes'], neutral: ['Valorant is one of those games you either grind or dont touch'] } },
  'minecraft': { type: 'game', genre: 'sandbox', desc: 'a sandbox survival game', opinions: { positive: ['Minecraft is literally timeless you can always go back', 'Minecraft with mods is a whole different experience', 'Building in Minecraft is genuinely therapeutic'], negative: ['Vanilla Minecraft gets repetitive after a while'], neutral: ['Minecraft is one of those games everyone has played'] } },
  'fortnite': { type: 'game', genre: 'battle royale', desc: 'a battle royale by Epic Games', opinions: { positive: ['Fortnite keeps reinventing itself and thats impressive', 'The building in Fortnite is actually really skillful'], negative: ['Fortnite was better in the OG days honestly', 'Fortnite lobbies can be a lot'], neutral: ['Fortnite is still going strong love it or hate it'] } },
  'league of legends': { type: 'game', genre: 'MOBA', desc: 'a MOBA by Riot Games', opinions: { positive: ['League is actually rewarding once you learn a champ well', 'Champion design in League is always top tier'], negative: ['League is a mental health hazard lol', 'Been playing League for years and still dont know why'], neutral: ['League is the game you say youll quit but never do'] } },
  'league': { type: 'game', alias: 'league of legends' },
  'lol': { type: 'game', alias: 'league of legends' },
  'gta': { type: 'game', genre: 'open world', desc: 'an open world action game by Rockstar', opinions: { positive: ['GTA Online with friends is pure chaos and I love it', 'Rockstar knows how to make open worlds'], negative: ['GTA Online grind is insane without buying stuff', 'Loading times in GTA are legendary for wrong reasons'], neutral: ['GTA just hits different every generation'] } },
  'gta 6': { type: 'game', genre: 'open world', desc: 'the upcoming GTA sequel', opinions: { positive: ['GTA 6 is probably the most hyped game in history rn', 'If Rockstar delivers GTA 6 could be game of the decade'], negative: ['The wait for GTA 6 has been painful'], neutral: ['GTA 6 hype is at astronomical levels rn'] } },
  'elden ring': { type: 'game', genre: 'RPG', desc: 'an open world RPG by FromSoftware', opinions: { positive: ['Elden Ring is a masterpiece the world design is insane', 'Exploration in Elden Ring is genuinely unmatched'], negative: ['Elden Ring difficulty spikes are brutal ngl', 'Some bosses in Elden Ring are straight up unfair'], neutral: ['Elden Ring made everyone a souls fan somehow'] } },
  'overwatch': { type: 'game', genre: 'hero shooter', desc: 'a team hero shooter by Blizzard', opinions: { positive: ['Overwatch is fun with a good team comp', 'The character designs in Overwatch are so well done'], negative: ['Overwatch matchmaking is a coin flip', 'Going from 6v6 to 5v5 was rough'], neutral: ['Overwatch has its moments but ranked is wild'] } },
  'overwatch 2': { type: 'game', alias: 'overwatch' },
  'apex legends': { type: 'game', genre: 'battle royale', desc: 'a BR shooter by Respawn', opinions: { positive: ['Apex movement is the smoothest in any BR', 'Apex is underrated as a competitive shooter'], negative: ['Apex servers have been rough ngl', 'SBMM in Apex is questionable'], neutral: ['Apex is solid but the skill ceiling is high'] } },
  'apex': { type: 'game', alias: 'apex legends' },
  'cod': { type: 'game', genre: 'FPS', desc: 'an FPS franchise by Activision', opinions: { positive: ['CoD campaigns are always cinematic', 'Zombies mode is goated no debate'], negative: ['CoD multiplayer has been mid lately', 'A new CoD every year is exhausting'], neutral: ['CoD is comfort gaming you know what youre getting'] } },
  'call of duty': { type: 'game', alias: 'cod' },
  'roblox': { type: 'game', genre: 'platform', desc: 'a game creation platform', opinions: { positive: ['Roblox has genuinely creative games on there', 'The variety on Roblox is actually insane'], negative: ['Most Roblox games are the same obby copied 1000 times'], neutral: ['Roblox is way bigger than people give it credit for'] } },
  'zelda': { type: 'game', genre: 'adventure', desc: 'an adventure series by Nintendo', opinions: { positive: ['Zelda games are consistently some of the best ever', 'Tears of the Kingdom blew my mind'], negative: ['Weapon durability in BotW is so annoying tho'], neutral: ['You cant go wrong with a Zelda game'] } },
  'tears of the kingdom': { type: 'game', alias: 'zelda' },
  'botw': { type: 'game', alias: 'zelda' },
  'totk': { type: 'game', alias: 'zelda' },
  'pokemon': { type: 'game', genre: 'RPG', desc: 'an RPG series by Nintendo', opinions: { positive: ['Pokemon is pure nostalgia', 'Competitive Pokemon is way deeper than people think'], negative: ['Game Freak has been slacking on quality', 'Pokemon games are too easy now'], neutral: ['Pokemon will never die its just too iconic'] } },
  'genshin impact': { type: 'game', genre: 'gacha RPG', desc: 'an open world gacha RPG', opinions: { positive: ['Genshin world design is actually beautiful', 'Insane production value for a free game'], negative: ['Gacha system is predatory ngl', 'Genshin endgame is pretty dry'], neutral: ['Genshin is great as a casual game to hop in and out'] } },
  'genshin': { type: 'game', alias: 'genshin impact' },
  'cs2': { type: 'game', genre: 'FPS', desc: 'a tactical FPS by Valve', opinions: { positive: ['CS2 is still THE tactical shooter', 'Skill ceiling in CS is literally infinite'], negative: ['CS2 matchmaking has a cheater problem', 'Skin prices in CS2 are wild'], neutral: ['CS will always be CS it just hits different'] } },
  'csgo': { type: 'game', alias: 'cs2' },
  'counter strike': { type: 'game', alias: 'cs2' },
  'baldurs gate 3': { type: 'game', genre: 'RPG', desc: 'an RPG by Larian Studios', opinions: { positive: ['BG3 raised the bar for RPGs honestly', 'Choices in BG3 actually matter which is rare'], negative: ['BG3 Act 3 needed more polish imo'], neutral: ['BG3 is peak RPG but its a time commitment'] } },
  'bg3': { type: 'game', alias: 'baldurs gate 3' },
  'helldivers 2': { type: 'game', genre: 'co-op shooter', desc: 'a co-op shooter', opinions: { positive: ['Most fun Ive had in co-op in years', 'Spreading democracy has never been this fun'], negative: ['Nerfs come too fast sometimes'], neutral: ['Great with friends but solo is rough'] } },
  'helldivers': { type: 'game', alias: 'helldivers 2' },
  'destiny 2': { type: 'game', genre: 'looter shooter', desc: 'a looter shooter by Bungie', opinions: { positive: ['Destiny raids are some of the best PvE in gaming', 'Destiny gunplay is unmatched'], negative: ['Destiny FOMO is real always feel behind', 'Bungie removing content people paid for is rough'], neutral: ['Destiny is a love hate relationship'] } },
  'destiny': { type: 'game', alias: 'destiny 2' },
  'dead by daylight': { type: 'game', genre: 'horror', desc: 'an asymmetric horror game', opinions: { positive: ['DBD is addicting past the learning curve', 'Playing killer at 2am hits different'], negative: ['DBD matchmaking is pain', 'The grind is astronomical'], neutral: ['DBD is the game I love to hate'] } },
  'dbd': { type: 'game', alias: 'dead by daylight' },
  'hollow knight': { type: 'game', genre: 'metroidvania', desc: 'a metroidvania by Team Cherry', opinions: { positive: ['Hollow Knight is a masterpiece for the price', 'Art and music in Hollow Knight are perfection'], negative: ['Some bosses made me question my life choices'], neutral: ['Hollow Knight will destroy you in the best way'] } },
  'terraria': { type: 'game', genre: 'sandbox', desc: 'a 2D sandbox adventure', opinions: { positive: ['Insane content for a 2D game', 'Devs kept updating for years absolute legends'], negative: ['Early game without a wiki is confusing'], neutral: ['Looks simple but the depth is crazy'] } },
  'stardew valley': { type: 'game', genre: 'farming sim', desc: 'a farming sim by ConcernedApe', opinions: { positive: ['The ultimate comfort game', 'One dev making all this is insane respect'], negative: ['Time management stresses me more than real life'], neutral: ['Everyone should play Stardew at least once'] } },
  'stardew': { type: 'game', alias: 'stardew valley' },
  'cyberpunk 2077': { type: 'game', genre: 'RPG', desc: 'an open world RPG by CDPR', opinions: { positive: ['After patches Cyberpunk is genuinely good', 'Night City is the most immersive game world ever'], negative: ['Launch was rough but its redeemed itself'], neutral: ['Cyberpunk is a redemption arc for CDPR'] } },
  'cyberpunk': { type: 'game', alias: 'cyberpunk 2077' },
  'warzone': { type: 'game', genre: 'battle royale', desc: 'a CoD battle royale', opinions: { positive: ['Warzone with a full squad hits different', 'Wins feel the most satisfying in any BR'], negative: ['Cheater problem is insane', 'File size is criminal'], neutral: ['Peak CoD in BR form'] } },
  'rust': { type: 'game', genre: 'survival', desc: 'a multiplayer survival game', opinions: { positive: ['Raid nights are peak gaming', 'Emergent gameplay is unmatched'], negative: ['Offline raiding is the worst thing in gaming', 'Requires way too much time'], neutral: ['Brings out the worst and best in people'] } },
  'among us': { type: 'game', genre: 'party', desc: 'a social deduction game', opinions: { positive: ['Full lobby of friends is peak gaming', 'The lying brings out the worst in everyone lol'], negative: ['Randos are a different breed', 'Got old quick ngl'], neutral: ['Was a cultural phenomenon for sure'] } },
  'rocket league': { type: 'game', genre: 'sports', desc: 'car soccer', opinions: { positive: ['Skill ceiling is genuinely infinite', 'Hitting ceiling shots in RL is unmatched'], negative: ['Teammates in ranked are something else', 'Been playing for years still trash'], neutral: ['Easy to learn impossible to master'] } },
  'dark souls': { type: 'game', genre: 'action RPG', desc: 'an action RPG by FromSoftware', opinions: { positive: ['Taught me patience honestly', 'Level design is masterclass'], negative: ['Just suffering simulator change my mind'], neutral: ['Defines a whole genre'] } },
  'animal crossing': { type: 'game', genre: 'life sim', desc: 'a life sim by Nintendo', opinions: { positive: ['Most wholesome game ever made', 'Island decorating hits different'], negative: ['Gets repetitive after the honeymoon phase'], neutral: ['Virtual therapy honestly'] } },
  'lethal company': { type: 'game', genre: 'horror', desc: 'a co-op horror game', opinions: { positive: ['With friends at 2am is TERRIFYING and hilarious', 'Modding community is goated'], negative: ['Solo is just depression simulator'], neutral: ['Fun with friends horror alone'] } },
  'palworld': { type: 'game', genre: 'survival', desc: 'a creature survival game', opinions: { positive: ['Scratches that Pokemon itch but with guns lol', 'Catching pals is surprisingly addicting'], negative: ['Content dried up quick'], neutral: ['Had a crazy launch thats for sure'] } },
  'ff14': { type: 'game', genre: 'MMO', desc: 'an MMORPG by Square Enix', opinions: { positive: ['Story is better than most single player RPGs', 'Community is genuinely wholesome'], negative: ['Base game ARR is a slog', 'GCD feels slow coming from other games'], neutral: ['The MMO with an actually good story which is wild'] } },
  'ffxiv': { type: 'game', alias: 'ff14' },
  'final fantasy': { type: 'game', alias: 'ff14' },
  'wow': { type: 'game', genre: 'MMO', desc: 'an MMORPG by Blizzard', opinions: { positive: ['20 years and still has a community thats dedication', 'Classic WoW nostalgia hits different'], negative: ['Modern WoW systems are exhausting', 'Blizzard keeps missing what made it great'], neutral: ['The granddaddy of MMOs love it or hate it'] } },
  'world of warcraft': { type: 'game', alias: 'wow' },
  'diablo': { type: 'game', genre: 'action RPG', desc: 'an action RPG by Blizzard', opinions: { positive: ['Loot grinding is dangerously addicting', 'Dark atmosphere is chefs kiss'], negative: ['Blizzard monetization has been questionable'], neutral: ['The game you play to mindlessly destroy everything'] } },
  'the sims': { type: 'game', genre: 'life sim', desc: 'a life simulator by EA', opinions: { positive: ['Ultimate creative outlet', 'Building houses is so satisfying'], negative: ['EA charging for every expansion is insane'], neutral: ['Live your best virtual life'] } },
  'sims': { type: 'game', alias: 'the sims' },
  'smash bros': { type: 'game', genre: 'fighting', desc: 'a fighting game by Nintendo', opinions: { positive: ['Ultimate roster is insane', 'Best party game no debate'], negative: ['Online is laggy pain'], neutral: ['Brings out the competitive side in everyone'] } },
  'smash': { type: 'game', alias: 'smash bros' },
  'fifa': { type: 'game', genre: 'sports', desc: 'a football/soccer game by EA', opinions: { positive: ['With friends is always a good time', 'Ultimate Team is addicting'], negative: ['Same game every year and we still buy it'], neutral: ['Comfort gaming for sports fans'] } },
  'ea fc': { type: 'game', alias: 'fifa' },
  'idleon': { type: 'game', genre: 'idle MMO', desc: 'an idle MMO by LavaFlame2', opinions: { positive: ['Idleon is insanely deep for an idle game the amount of content is wild', 'The skilling progression in Idleon is so satisfying when it clicks', 'AFK gains in Idleon are genius you progress while doing nothing'], negative: ['New players get overwhelmed by how much there is to do in Idleon', 'The UI in Idleon can be a lot to figure out at first'], neutral: ['Idleon is one of those games where the wiki is your best friend'] } },
  'legends of idleon': { type: 'game', alias: 'idleon' },
  'idle on': { type: 'game', alias: 'idleon' },

  // --- ANIME & SHOWS ---
  'one piece': { type: 'anime', genre: 'shonen', desc: 'a pirate adventure anime', opinions: { positive: ['Worldbuilding is genuinely the best in anime', 'Wano arc animation was insane'], negative: ['Pacing can be rough especially in the anime', '1000+ episodes is a lot to commit to'], neutral: ['Its a journey and I mean that literally'] } },
  'naruto': { type: 'anime', genre: 'shonen', desc: 'a ninja anime series', opinions: { positive: ['Fight scenes go crazy hard', 'Pain arc is peak fiction'], negative: ['Filler is astronomical', 'Ending was mid ngl'], neutral: ['Defined a whole generation of anime fans'] } },
  'attack on titan': { type: 'anime', genre: 'action', desc: 'a dark fantasy anime', opinions: { positive: ['Most intense anime Ive ever watched', 'Plot twists are insane'], negative: ['Ending was divisive thats for sure'], neutral: ['Changed what anime could be for mainstream'] } },
  'aot': { type: 'anime', alias: 'attack on titan' },
  'demon slayer': { type: 'anime', genre: 'shonen', desc: 'a demon hunter anime', opinions: { positive: ['Ufotable animation is genuinely unmatched', 'Every fight is a visual masterpiece'], negative: ['Story is kinda simple for how popular it is'], neutral: ['Carried by god tier animation and thats ok'] } },
  'jujutsu kaisen': { type: 'anime', genre: 'shonen', desc: 'a sorcerer anime', opinions: { positive: ['Fights are some of the most creative in anime', 'Gojo is perfectly designed'], negative: ['Manga pacing got wild', 'Some plot points came outta nowhere'], neutral: ['Peak modern shonen especially the animations'] } },
  'jjk': { type: 'anime', alias: 'jujutsu kaisen' },
  'dragon ball': { type: 'anime', genre: 'shonen', desc: 'a martial arts anime', opinions: { positive: ['The anime that started it all for so many people', 'Tournament arcs are always hype'], negative: ['Power scaling stopped making sense ages ago'], neutral: ['Comfort anime you know what youre getting'] } },
  'dbz': { type: 'anime', alias: 'dragon ball' },
  'my hero academia': { type: 'anime', genre: 'shonen', desc: 'a superhero anime', opinions: { positive: ['Some really well done character arcs', 'Quirk system is creative'], negative: ['Fell off after a while imo'], neutral: ['Gateway anime for newer fans'] } },
  'mha': { type: 'anime', alias: 'my hero academia' },
  'hunter x hunter': { type: 'anime', genre: 'shonen', desc: 'an adventure anime', opinions: { positive: ['Best power system in anime period', 'Chimera Ant arc is peak'], negative: ['Hiatuses are legendary and not in a good way'], neutral: ['Fans are just perpetually waiting and coping'] } },
  'hxh': { type: 'anime', alias: 'hunter x hunter' },
  'spy x family': { type: 'anime', genre: 'comedy', desc: 'a comedy spy anime', opinions: { positive: ['Most wholesome anime in years', 'Anya is the most adorable character'], negative: ['More wholesome than plot-driven tbh'], neutral: ['Perfect comfort anime'] } },
  'solo leveling': { type: 'anime', genre: 'action', desc: 'a power fantasy anime', opinions: { positive: ['The animation and power-ups are so satisfying to watch', 'Solo Leveling is peak hype'], negative: ['Story is kinda straightforward for how popular it is'], neutral: ['Its a fun ride if you like overpowered MCs'] } },
  'chainsaw man': { type: 'anime', genre: 'action', desc: 'an action horror anime', opinions: { positive: ['Chainsaw Man is so unhinged and I love it', 'MAPPA did an insane job with the animation'], negative: ['Can be too edgy for some people'], neutral: ['Its different from typical shonen and thats the appeal'] } },
  'breaking bad': { type: 'show', genre: 'drama', desc: 'a crime drama series', opinions: { positive: ['Best show ever made imo', 'Character development is insane'], negative: ['Some parts are slow but worth it'], neutral: ['Set the standard for prestige TV'] } },
  'stranger things': { type: 'show', genre: 'sci-fi', desc: 'a sci-fi horror series', opinions: { positive: ['Season 1 was perfect television', 'Nostalgia factor is unmatched'], negative: ['Went downhill after season 1 imo'], neutral: ['Made everyone love 80s aesthetics'] } },
  'the boys': { type: 'show', genre: 'action', desc: 'a superhero satire show', opinions: { positive: ['Everything superhero content should be', 'Homelander is the most terrifying villain on TV'], negative: ['Gets pretty graphic not for everyone'], neutral: ['What happens when superheroes are realistic'] } },
  'squid game': { type: 'show', genre: 'thriller', desc: 'a Korean survival thriller', opinions: { positive: ['Wild ride from start to finish', 'The concept is genius'], negative: ['Season 2 didnt hit the same'], neutral: ['Put Korean media on the global map even more'] } },
  'the last of us': { type: 'show', genre: 'drama', desc: 'a post-apocalyptic drama', opinions: { positive: ['Best video game adaptation ever', 'Pedro Pascal chemistry is incredible'], negative: ['Some episodes were slow but payoff was worth it'], neutral: ['Proved game adaptations can work'] } },
  'tlou': { type: 'show', alias: 'the last of us' },
  'wednesday': { type: 'show', genre: 'comedy', desc: 'an Addams Family spinoff', opinions: { positive: ['Surprising good ngl', 'Jenna Ortega killed that role'], negative: ['Decent but a bit overhyped'], neutral: ['Fun watch if you like that aesthetic'] } },
  'arcane': { type: 'show', genre: 'animated', desc: 'an animated League of Legends show', opinions: { positive: ['Arcane is the best animated show in years easily', 'The animation quality is genuinely insane'], negative: ['You kinda need League context for full appreciation'], neutral: ['Set the bar for video game adaptations'] } },

  // --- MUSIC ---
  'rap': { type: 'music', genre: 'genre', desc: 'hip hop / rap music', opinions: { positive: ['Most creative genre rn with all the subgenres', 'Nothing hits like a good rap album on repeat'], negative: ['Modern rap is hit or miss lots of mid'], neutral: ['Rap has evolved so much its insane'] } },
  'hip hop': { type: 'music', alias: 'rap' },
  'pop': { type: 'music', genre: 'genre', desc: 'pop music', opinions: { positive: ['Catchy for a reason some songs are just bangers', 'Production quality these days is insane'], negative: ['Can sound samey after a while'], neutral: ['Mainstream for a reason it just works'] } },
  'rock': { type: 'music', genre: 'genre', desc: 'rock music', opinions: { positive: ['Rock never dies some of the best music ever', 'Classic rock hits different at certain times'], negative: ['People say rock is dead but its evolved'], neutral: ['So many subgenres theres something for everyone'] } },
  'metal': { type: 'music', genre: 'genre', desc: 'heavy metal music', opinions: { positive: ['Metal musicianship is genuinely insane', 'Nothing gets you hyped like metal'], negative: ['Acquired taste not everyone gets it'], neutral: ['Metal fans are some of the most dedicated'] } },
  'edm': { type: 'music', genre: 'genre', desc: 'electronic dance music', opinions: { positive: ['EDM at festivals is a whole different experience', 'Good drops hit different'], negative: ['Too much sounds the same after a while'], neutral: ['Either your vibe or not no in between'] } },
  'kpop': { type: 'music', genre: 'genre', desc: 'Korean pop music', opinions: { positive: ['Production quality is world class', 'Fan dedication is unmatched'], negative: ['Fan culture can be a lot sometimes'], neutral: ['Taken over the world and not slowing down'] } },
  'k-pop': { type: 'music', alias: 'kpop' },
  'taylor swift': { type: 'music', genre: 'artist', desc: 'a pop/country artist', opinions: { positive: ['Consistently reinvents herself and it works', 'Eras Tour is biggest in history for a reason'], negative: ['A bit overplayed at this point imo'], neutral: ['Whether you like her or not she runs the industry rn'] } },
  'drake': { type: 'music', genre: 'artist', desc: 'a rap/rnb artist', opinions: { positive: ['Has bangers you cant deny that', 'Take Care era was peak'], negative: ['Been mid lately compared to earlier stuff'], neutral: ['One of the most consistent hitmakers ever'] } },
  'kanye': { type: 'music', genre: 'artist', desc: 'a rapper and producer', opinions: { positive: ['Production is genuinely genius MBDTF is a masterpiece', 'Changed hip hop production forever'], negative: ['Recent stuff has been all over the place'], neutral: ['Separating art from artist is a whole debate'] } },
  'kendrick': { type: 'music', genre: 'artist', desc: 'a rapper', opinions: { positive: ['Best rapper alive not even close', 'Every album is a masterpiece'], negative: ['Could drop more frequently tho'], neutral: ['Sets the bar for what rap can be'] } },
  'kendrick lamar': { type: 'music', alias: 'kendrick' },
  'travis scott': { type: 'music', genre: 'artist', desc: 'a rapper and producer', opinions: { positive: ['Production and vibes are unmatched', 'Rodeo and Astroworld are elite'], negative: ['Style over substance sometimes'], neutral: ['Concerts are an experience regardless'] } },
  'the weeknd': { type: 'music', genre: 'artist', desc: 'an rnb/pop artist', opinions: { positive: ['One of the most unique voices in music', 'After Hours was perfect'], negative: ['Stuff can start sounding similar'], neutral: ['Always delivers a vibe'] } },
  'weeknd': { type: 'music', alias: 'the weeknd' },
  'eminem': { type: 'music', genre: 'artist', desc: 'a rapper', opinions: { positive: ['Old Em lyrical ability was genuinely insane', 'Slim Shady LP is a classic forever'], negative: ['New Eminem isnt the same imo'], neutral: ['One of the GOATs undeniable'] } },
  'beyonce': { type: 'music', genre: 'artist', desc: 'a pop/rnb artist', opinions: { positive: ['On another level as a performer', 'Renaissance was incredible'], negative: ['Fans can be intense'], neutral: ['Music industry royalty just facts'] } },
  'billie eilish': { type: 'music', genre: 'artist', desc: 'a pop artist', opinions: { positive: ['Such a unique sound and aesthetic', 'Album production is incredible'], negative: ['Vibe can be a bit much sometimes'], neutral: ['Carved out her own lane and thats respectable'] } },
  'sza': { type: 'music', genre: 'artist', desc: 'an rnb artist', opinions: { positive: ['Vocals are ethereal honestly', 'SOS was album of the year'], negative: ['Albums take forever to drop'], neutral: ['Carrying modern RnB'] } },
  'doja cat': { type: 'music', genre: 'artist', desc: 'a rap/pop artist', opinions: { positive: ['Most versatile artist out rn', 'Can do any genre and nail it'], negative: ['Unpredictable but keeps things interesting'], neutral: ['Keeps reinventing herself'] } },
  'bts': { type: 'music', genre: 'artist', desc: 'a K-pop group', opinions: { positive: ['Broke every barrier for K-pop in the west', 'Discography has something for everyone'], negative: ['Hype got overwhelming at some point'], neutral: ['Impact on pop culture is undeniable'] } },
  'ariana grande': { type: 'music', genre: 'artist', desc: 'a pop artist', opinions: { positive: ['Vocals are genuinely incredible', 'One of the best voices in pop rn'], negative: ['Music can sound similar across albums'], neutral: ['Powerhouse vocalist for sure'] } },

  // --- MOVIES/FRANCHISES ---
  'marvel': { type: 'movie', genre: 'superhero', desc: 'the Marvel superhero franchise', opinions: { positive: ['First three phases were incredible', 'Endgame was a cultural event'], negative: ['Marvel fatigue is real too many projects', 'Quality dropped since Endgame'], neutral: ['Changed cinema forever whether you like it or not'] } },
  'mcu': { type: 'movie', alias: 'marvel' },
  'dc': { type: 'movie', genre: 'superhero', desc: 'the DC franchise', opinions: { positive: ['Dark Knight is still the best superhero movie', 'DC animated content is goated'], negative: ['Live action has been rough outside a few films'], neutral: ['Incredible characters just need better execution'] } },
  'star wars': { type: 'movie', genre: 'sci-fi', desc: 'the Star Wars franchise', opinions: { positive: ['Original trilogy is timeless', 'Andor proved it can still be peak'], negative: ['Sequel trilogy was inconsistent', 'Disney hasnt always done it justice'], neutral: ['Incredible lore worth diving into'] } },
  'harry potter': { type: 'movie', genre: 'fantasy', desc: 'the wizarding world franchise', opinions: { positive: ['Defined a whole generation of readers', 'World building is insanely detailed'], negative: ['Movies left out so many good book moments'], neutral: ['Comfort content for so many people'] } },
  'spider-man': { type: 'movie', genre: 'superhero', desc: 'the Spider-Man franchise', opinions: { positive: ['Spider-Verse movies are the best superhero movies', 'No Way Home was peak cinema'], negative: ['Too many reboots lol'], neutral: ['Most relatable superhero thats why everyone loves him'] } },
  'spiderman': { type: 'movie', alias: 'spider-man' },
  'john wick': { type: 'movie', genre: 'action', desc: 'an action film series', opinions: { positive: ['Set a new standard for action choreography', 'World building is surprisingly deep'], negative: ['4 was maybe a bit too long'], neutral: ['Proved Keanu is an action legend'] } },

  // --- TECH ---
  'iphone': { type: 'tech', genre: 'phone', desc: 'an Apple smartphone', opinions: { positive: ['Ecosystem just works once youre in it', 'Camera is consistently top tier'], negative: ['Overpriced for what they offer sometimes', 'Holding back features to sell next year is annoying'], neutral: ['Reliable and thats what people pay for'] } },
  'android': { type: 'tech', genre: 'phone', desc: 'the Android mobile OS', opinions: { positive: ['Customization is unmatched', 'Variety means theres one for every budget'], negative: ['Updates are inconsistent across brands'], neutral: ['Android vs iPhone will never end'] } },
  'ps5': { type: 'tech', genre: 'console', desc: 'the PlayStation 5', opinions: { positive: ['Exclusives are worth the price alone', 'DualSense is a game changer'], negative: ['70 dollar games is rough', 'Needs more exclusives'], neutral: ['Solid console hard to complain'] } },
  'playstation': { type: 'tech', alias: 'ps5' },
  'xbox': { type: 'tech', genre: 'console', desc: 'the Microsoft game console', opinions: { positive: ['Game Pass is the best deal in gaming', 'Backwards compatibility is goated'], negative: ['First party exclusives have been lacking', 'Exclusivity strategy is confusing'], neutral: ['Basically a Game Pass machine and thats not bad'] } },
  'nintendo': { type: 'tech', genre: 'console', desc: 'the Nintendo company', opinions: { positive: ['Makes the most fun games period', 'Strongest first party lineup'], negative: ['Online is stuck in the past', 'Hardware always behind on specs'], neutral: ['Does their own thing and it works'] } },
  'switch': { type: 'tech', genre: 'console', desc: 'the Nintendo Switch', opinions: { positive: ['Play anywhere concept is genius', 'One of the best game libraries ever'], negative: ['Hardware is showing its age', 'Joy-Con drift is unacceptable'], neutral: ['Had an incredible run time for the next one'] } },
  'nintendo switch': { type: 'tech', alias: 'switch' },
  'pc': { type: 'tech', genre: 'platform', desc: 'PC gaming', opinions: { positive: ['Ultimate experience if you have the budget', 'Mods emulators steam sales PC is king'], negative: ['Expensive and troubleshooting is pain', 'Some game optimizations are garbage'], neutral: ['Comes down to budget and preference'] } },
  'steam deck': { type: 'tech', genre: 'handheld', desc: 'a Valve handheld PC', opinions: { positive: ['Best handheld gaming device rn', 'Whole Steam library on the go is insane'], negative: ['Battery life could be better'], neutral: ['Proved theres a market for handheld PC'] } },
  'ai': { type: 'tech', genre: 'technology', desc: 'artificial intelligence', opinions: { positive: ['Advancing so fast its revolutionary', 'Creative possibilities are insane'], negative: ['Ethics and job displacement are real concerns'], neutral: ['A tool depends on how you use it'] } },
  'chatgpt': { type: 'tech', genre: 'technology', desc: 'an AI chatbot by OpenAI', opinions: { positive: ['Actually incredibly useful', 'Changing how people work'], negative: ['People rely on it too much without verifying', 'Only as good as the person using it'], neutral: ['Started the whole AI chatbot wave'] } },
  'vr': { type: 'tech', genre: 'technology', desc: 'virtual reality', opinions: { positive: ['Future of gaming once more accessible', 'Immersion cant be explained you have to try it'], negative: ['Still too expensive and bulky', 'Motion sickness is real'], neutral: ['Cool tech that needs to get more affordable'] } },

  // --- PLATFORMS ---
  'youtube': { type: 'platform', genre: 'video', desc: 'a video platform', opinions: { positive: ['Content for literally anything', 'Long form creators are at peak quality'], negative: ['Ads are getting out of control', 'Algorithm can be a rabbit hole'], neutral: ['Replaced TV for a whole generation'] } },
  'tiktok': { type: 'platform', genre: 'social', desc: 'a short video platform', opinions: { positive: ['Algorithm is scary good at showing what you like', 'Genuinely funny content if your fyp is right'], negative: ['Time vortex I lose hours', 'Ruining attention spans'], neutral: ['Changed how content is consumed'] } },
  'twitter': { type: 'platform', genre: 'social', desc: 'a social media platform', opinions: { positive: ['For news and live events still unmatched', 'Funniest content comes from there'], negative: ['Dumpster fire and I cant look away', 'Discourse is exhausting'], neutral: ['Where you go for opinions you didnt ask for'] } },
  'twitch': { type: 'platform', genre: 'streaming', desc: 'a live streaming platform', opinions: { positive: ['Communities can be really wholesome', 'Finding a small streamer is such a vibe'], negative: ['Moderation is inconsistent', 'Ads are ruthless now'], neutral: ['Still king of game streaming'] } },
  'discord': { type: 'platform', genre: 'social', desc: 'a chat /community platform', opinions: { positive: ['Some of the best online communities', 'Features keep getting better'], negative: ['Notifications can be overwhelming', 'Some servers are too active'], neutral: ['Replaced every other chat platform for gamers'] } },
  'reddit': { type: 'platform', genre: 'social', desc: 'a forum platform', opinions: { positive: ['Community for literally everything', 'Niche hobbies is invaluable'], negative: ['Hivemind can be intense', 'Mods power tripping is comedy'], neutral: ['Front page of the internet for better or worse'] } },
  'spotify': { type: 'platform', genre: 'music', desc: 'a music streaming service', opinions: { positive: ['Discover weekly is how I find music', 'All music in one place is convenient'], negative: ['Artist payouts are criminal', 'Adding features nobody asked for'], neutral: ['Killed buying albums for a generation'] } },
  'netflix': { type: 'platform', genre: 'streaming', desc: 'a video streaming service', opinions: { positive: ['Still has bangers if you look', 'Variety is decent across genres'], negative: ['Cancelling good shows after 1 season is criminal', 'Password sharing crackdown was not the move'], neutral: ['Pioneered streaming but competition caught up'] } },

  // --- FOOD / MISC ---
  'pizza': { type: 'food', genre: 'food', desc: 'a food', opinions: { positive: ['Literally the perfect food no debate', 'Even bad pizza is still pretty good'], negative: ['Pineapple on pizza is a crime fight me'], neutral: ['Universal comfort food'] } },
  'sushi': { type: 'food', genre: 'food', desc: 'Japanese cuisine', opinions: { positive: ['Good sushi is life changing', 'Once you love it you cant stop'], negative: ['Expensive for what you get'], neutral: ['Quality range is insane from gas station to Michelin'] } },
  'ramen': { type: 'food', genre: 'food', desc: 'Japanese noodle soup', opinions: { positive: ['Real ramen is one of the best meals ever', 'On a cold day hits different'], negative: ['Good spots can be pricey for noodle soup'], neutral: ['Instant vs real is not the same food'] } },
  'coffee': { type: 'food', genre: 'drink', desc: 'a beverage', opinions: { positive: ['Only reason I function in the morning', 'Good coffee is an art form'], negative: ['Coffee addiction isnt the flex people think', 'Past 2pm is a sleep death sentence'], neutral: ['Coffee culture is wild with all the specialty stuff'] } },
  'boba': { type: 'food', genre: 'drink', desc: 'bubble tea', opinions: { positive: ['Dangerously addicting those pearls hit different', 'On a hot day is peak existence'], negative: ['Basically sugar milk but cant stop'], neutral: ['Boba craze shows no signs of slowing'] } },
  'tacos': { type: 'food', genre: 'food', desc: 'Mexican food', opinions: { positive: ['Street tacos are top tier cant change my mind', 'Perfect in every way'], negative: ['There is no bad taco honestly'], neutral: ['Ultimate accessible food'] } },
};

// Resolve aliases in knowledge base
function lookupKnowledge(subject) {
  if (!subject) return null;
  const lower = subject.toLowerCase().trim();

  // Direct match
  let entry = BUILT_IN_KNOWLEDGE[lower];
  if (entry && entry.alias) {
    entry = BUILT_IN_KNOWLEDGE[entry.alias];
  }
  if (entry && !entry.alias) return { key: lower, ...entry };

  // Partial match — if any knowledge key is contained in the subject or vice versa
  // Require at least 3 chars to avoid false matches on tiny strings
  if (lower.length >= 3) {
    for (const [key, val] of Object.entries(BUILT_IN_KNOWLEDGE)) {
      if (key.length < 3) continue; // skip very short keys
      if (lower.includes(key) || key.includes(lower)) {
        let resolved = val;
        if (resolved.alias) {
          resolved = BUILT_IN_KNOWLEDGE[resolved.alias];
        }
        if (resolved && !resolved.alias) return { key, ...resolved };
      }
    }
  }

  return null;
}

// ======================== FOLLOW-UP DETECTION ========================
// Detects if a message is responding to what the bot just said

const FOLLOW_UP_PATTERNS = [
  { pattern: /^(?:yeah|yea|yes|yep|true|facts|exactly|agreed|fr|real|based|W take|good take|right|correct|this|^this)/i, type: 'agree' },
  { pattern: /^(?:nah|no|wrong|cap|bad take|L take|disagree|not really|hard disagree|idk about that|ehhh)/i, type: 'disagree' },
  { pattern: /^(?:why|how come|how so|wdym|what do you mean|elaborate|explain|in what way|like how)/i, type: 'question' },
  { pattern: /^(?:lol|lmao|haha|💀|😂|😭|bruh|ded|dead|im dead)/i, type: 'amused' },
  { pattern: /^(?:what about|how about|and|but what about) (.+)/i, type: 'redirect' },
  { pattern: /^(?:but|however|although|still|even so|idk tho) (.+)/i, type: 'counter' },
  { pattern: /^(?:same|mood|relatable|felt that|i feel that|so true|fr fr|on god|ong|fax)/i, type: 'relate' },
  { pattern: /^(?:wait really|for real|seriously|actually|no way|you think so|fr\?|really\?)/i, type: 'surprise' },
];

function detectFollowUp(message, lastBotReply) {
  if (!lastBotReply) return null;
  // Only count as follow-up if within 60 seconds
  if (Date.now() - lastBotReply.timestamp > 60000) return null;

  const lower = message.toLowerCase().trim();
  // Short messages after bot reply are likely follow-ups
  const wordCount = lower.split(/\s+/).length;
  if (wordCount > 15) return null; // Long messages are probably new topics

  for (const { pattern, type } of FOLLOW_UP_PATTERNS) {
    const match = lower.match(pattern);
    if (match) {
      return { type, match: match[1] || null, subject: lastBotReply.subject };
    }
  }
  return null;
}

// ======================== FOLLOW-UP RESPONSE SYSTEM ========================

const FOLLOW_UP_RESPONSES = {
  agree: [
    'Right? Glad someone gets it',
    'See thats what Im saying',
    'We on the same wavelength fr',
    'Great minds think alike honestly',
    'Exactly bro thank you',
    'This is why I said it, someone had to',
    'I knew I wasnt the only one thinking that',
    'Finally someone with taste lol',
    'W take recognizing a W take',
    'Facts on facts right there',
  ],
  disagree: [
    'Fair enough everyone got their own take',
    'I can see that angle actually',
    'Agree to disagree I guess lol',
    'Hmm you might have a point there ngl',
    'Different strokes for different folks',
    'Ok I respect that even if I dont fully agree',
    'Thats valid I can see the other side',
    'You make a fair point there honestly',
    'Aight I hear you, maybe I was too harsh',
    'Ok ok I can respect a different perspective',
  ],
  question: [
    'Hmm honestly its just one of those things you gotta experience yourself',
    'Good question tbh, I just go off vibes mostly',
    'Hard to explain but like {subject} just has that certain something you know',
    'Tbh its more of a gut feeling than anything logical',
    'I mean when you try {subject} youll understand what I mean',
    'Its one of those things where once you get into it it clicks',
    'I could go into it but honestly just check it out yourself',
    'Let me think... yeah I just think {subject} hits different when you experience it',
  ],
  amused: [
    'I try to keep it entertaining lol',
    'At least someone appreciates my takes haha',
    'I aim to please 😂',
    'My humor is underrated honestly',
    'Im here all day folks',
    'The comedic genius strikes again lol',
    'I have my moments what can I say',
  ],
  redirect: [
    'Ooh {match} is a whole different conversation',
    'Hmm {match}? That actually changes things',
    'Oh if we talking about {match} then thats another story',
    'Good point bringing up {match}, let me think on that',
    '{match} is interesting too honestly',
  ],
  counter: [
    'Hmm you raise a good point with that',
    'Ok I can see that side too honestly',
    'Fair counter tbh I didnt think about it that way',
    'Thats a valid point, maybe its not so black and white',
    'You know what, youre not wrong there',
    'I hear that, its more nuanced than I made it sound',
  ],
  relate: [
    'We really on the same page huh',
    'See this is why I love this chat',
    'Twin behavior honestly',
    'Connection right there fr',
    'We share a brain cell I think lol',
    'The vibes are immaculate rn',
    'This is the unity we need honestly',
  ],
  surprise: [
    'Yeah for real, thats genuinely how I feel about it',
    'Dead serious, thats my actual take',
    '100% I stand by that',
    'I know it might sound wild but yeah thats where Im at',
    'Listen Ive given this some thought and yeah Im confident on that one',
    'You heard me right lol',
  ],
};

// Generate a follow-up reply
function generateFollowUpReply(followUp) {
  const pool = FOLLOW_UP_RESPONSES[followUp.type];
  if (!pool || pool.length === 0) return null;

  let reply = pool[Math.floor(Math.random() * pool.length)];
  // Substitute variables
  if (followUp.subject) reply = reply.replace(/\{subject\}/g, followUp.subject);
  if (followUp.match) reply = reply.replace(/\{match\}/g, followUp.match);
  // Clean up unreplaced placeholders
  reply = reply.replace(/\{subject\}/g, 'it').replace(/\{match\}/g, 'that');
  return reply;
}

// ======================== SMART QUESTION ANSWERING ========================
// Answer general "what is X" / "how is X" questions using knowledge

function answerWithKnowledge(subject, intent, sentiment = 'neutral') {
  const knowledge = lookupKnowledge(subject);
  if (!knowledge) return null;

  const { desc, type, genre, opinions } = knowledge;

  if (intent === 'asking_info') {
    // "What is X?" type questions — give info + light opinion
    const infoTemplates = [
      `Oh {subject}? Its {desc}, pretty {adjective} imo`,
      `{subject} is {desc}. Personally I think its {adjective}`,
      `From what I know {subject} is {desc}. {opinion}`,
      `{subject}? Yeah thats {desc}. {opinion}`,
      `So {subject} is basically {desc}, and honestly {opinion}`,
      `Oh yeah {subject} is {desc}! {opinion}`,
      `{subject} — {desc}. I got thoughts on that actually, {opinion}`,
    ];

    const adjectives = ['solid', 'interesting', 'worth checking out', 'pretty popular', 'well-known', 'goated', 'fire', 'decent'];
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];

    // Get a random opinion to attach
    const allOpinions = [...(opinions?.positive || []), ...(opinions?.neutral || [])];
    const opinion = allOpinions.length > 0 ? allOpinions[Math.floor(Math.random() * allOpinions.length)] : 'its pretty solid';

    const template = infoTemplates[Math.floor(Math.random() * infoTemplates.length)];
    return template
      .replace(/\{subject\}/g, subject)
      .replace(/\{desc\}/g, desc)
      .replace(/\{adjective\}/g, adjective)
      .replace(/\{opinion\}/g, opinion.charAt(0).toLowerCase() + opinion.slice(1))
      .replace(/\{type\}/g, type)
      .replace(/\{genre\}/g, genre || type);
  }

  if (intent === 'asking_opinion') {
    // Use real sentiment from user's message instead of random
    let pool;
    if (sentiment === 'negative') pool = opinions?.negative || opinions?.neutral || [];
    else if (sentiment === 'positive') pool = opinions?.positive || opinions?.neutral || [];
    else pool = opinions?.neutral || opinions?.positive || [];

    if (pool.length > 0) {
      return pool[Math.floor(Math.random() * pool.length)];
    }
  }

  if (intent === 'sharing_experience') {
    const reactions = [
      `Ooh {subject}! {opinion}`,
      `Nice choice with {subject}. {opinion}`,
      `{subject} huh? {opinion}`,
      `Oh you into {subject}? {opinion}`,
      `Ah {subject}, {opinion}`,
      `{subject} is a vibe honestly. {opinion}`,
      `Yooo {subject}! {opinion}`,
      `So youre a {subject} person, respect. {opinion}`,
    ];
    const allOpinions = [...(opinions?.positive || []), ...(opinions?.neutral || [])];
    const opinion = allOpinions.length > 0 ? allOpinions[Math.floor(Math.random() * allOpinions.length)] : 'thats cool';
    const template = reactions[Math.floor(Math.random() * reactions.length)];
    return template
      .replace(/\{subject\}/g, subject)
      .replace(/\{opinion\}/g, opinion.charAt(0).toLowerCase() + opinion.slice(1));
  }

  if (intent === 'recommending') {
    const allOpinions = [...(opinions?.positive || [])];
    if (allOpinions.length > 0) {
      const baseOpinion = allOpinions[Math.floor(Math.random() * allOpinions.length)];
      const endorsements = [
        `Facts, ${baseOpinion.charAt(0).toLowerCase() + baseOpinion.slice(1)}`,
        `Can confirm, ${baseOpinion.charAt(0).toLowerCase() + baseOpinion.slice(1)}`,
        `I second that, ${baseOpinion.charAt(0).toLowerCase() + baseOpinion.slice(1)}`,
        `Big W recommendation. ${baseOpinion}`,
        `100% agree, ${baseOpinion.charAt(0).toLowerCase() + baseOpinion.slice(1)}`,
        `Vouch. ${baseOpinion}`,
        `W take honestly, ${baseOpinion.charAt(0).toLowerCase() + baseOpinion.slice(1)}`,
      ];
      return endorsements[Math.floor(Math.random() * endorsements.length)];
    }
  }

  if (intent === 'complaining') {
    const r = Math.random();
    let pool;
    if (r < 0.4) pool = opinions?.negative || opinions?.neutral || [];
    else if (r < 0.75) pool = opinions?.neutral || [];
    else pool = opinions?.positive || []; // disagree with complaint sometimes
    if (pool.length > 0) {
      const opinion = pool[Math.floor(Math.random() * pool.length)];
      if (r >= 0.75) {
        // Gentle disagreement
        const prefixes = ['Idk I kinda think ', 'Hmm disagree a bit — ', 'Ngl hot take but ', 'Controversial take: ', 'Hear me out though, ', 'Ok but counterpoint — ', 'Not gonna lie I actually think '];
        return prefixes[Math.floor(Math.random() * prefixes.length)] + opinion.charAt(0).toLowerCase() + opinion.slice(1);
      }
      return opinion;
    }
  }

  // Default: just share a knowledge-based opinion
  const allOpinions = [...(opinions?.positive || []), ...(opinions?.neutral || []), ...(opinions?.negative || [])];
  if (allOpinions.length > 0) {
    return allOpinions[Math.floor(Math.random() * allOpinions.length)];
  }

  return null;
}

// Compare two subjects using knowledge
function answerComparison(subject1, subject2) {
  const k1 = lookupKnowledge(subject1);
  const k2 = lookupKnowledge(subject2);

  // If we know both subjects, give an informed comparison
  if (k1 && k2) {
    const templates = [
      `Oof {s1} vs {s2}? Thats tough but leaning towards {pick} personally. {reason}`,
      `Both are solid but I think {pick} edges it out. {reason}`,
      `Hmm {s1} and {s2} both go hard but {pick} hits different for me. {reason}`,
      `Hard to compare honestly but {pick} has the edge imo. {reason}`,
      `{s1} and {s2} are both W tier but if I HAD to choose... {pick}. {reason}`,
      `Cant go wrong with either but {pick} is my go-to. {reason}`,
    ];

    // Randomly pick a winner
    const winner = Math.random() < 0.5 ? { name: subject1, k: k1 } : { name: subject2, k: k2 };
    const reason = winner.k.opinions?.positive?.[Math.floor(Math.random() * winner.k.opinions.positive.length)] || 'just vibes';

    return templates[Math.floor(Math.random() * templates.length)]
      .replace(/\{s1\}/g, subject1)
      .replace(/\{s2\}/g, subject2)
      .replace(/\{pick\}/g, winner.name)
      .replace(/\{reason\}/g, reason.charAt(0).toLowerCase() + reason.slice(1));
  }

  // If we know one, favor that one
  if (k1 && !k2) {
    const op = k1.opinions?.positive?.[0] || 'its solid';
    return `I know more about ${subject1} tbh, and ${op.charAt(0).toLowerCase() + op.slice(1)}. Dont know enough about ${subject2} to compare fairly`;
  }
  if (k2 && !k1) {
    const op = k2.opinions?.positive?.[0] || 'its solid';
    return `Hmm I know ${subject2} better, ${op.charAt(0).toLowerCase() + op.slice(1)}. Havent experienced enough ${subject1} to say`;
  }

  return null; // Fall through to generic comparison templates
}

// ======================== GREETING RESPONSES ========================

function resolveVagueReference(text, recentMessages) {
  const lower = text.toLowerCase().trim();
  // Only trigger on short/vague messages that use pronouns without a clear subject
  const vaguePatterns = /^(?:.*\b(?:it|that|this|these|those)\b.{0,25})$/i;
  const hasOwnSubject = /\b(?:playing|watching|listening|eating|trying|using|game|show|song|food|anime|movie|album|app)\b/i.test(lower);
  if (hasOwnSubject || !vaguePatterns.test(lower)) return null;
  // Also skip if message is long enough to stand on its own (>8 words)
  if (lower.split(/\s+/).length > 8) return null;

  // Scan recent messages (newest first) for the last concrete subject or entity
  const recent = (recentMessages || []).slice().reverse();
  for (const msg of recent) {
    if (msg.subjects && msg.subjects.length > 0) {
      const subj = msg.subjects[0];
      // Make sure the subject is a real entity, not another vague phrase
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
    // Also check if the message mentioned a known entity even without intent extraction
    if (msg.content) {
      const msgLower = msg.content.toLowerCase();
      const sortedKeys = Object.entries(BUILT_IN_KNOWLEDGE)
        .filter(([k, v]) => !v.alias && k.length >= 3)
        .sort((a, b) => b[0].length - a[0].length);
      for (const [key, val] of sortedKeys) {
        if (msgLower.includes(key)) {
          return {
            resolvedSubject: key,
            resolvedEntity: key,
            resolvedType: val.type,
            sourceTopic: msg.topics?.[0]?.[0] || null,
          };
        }
      }
    }
  }
  return null;
}

// ======================== SLANG REACTION TEMPLATES ========================
// Short slang messages like "W take", "bruh moment", "no cap" that don't have
// a real topic — respond with natural mirror/vibe-match responses.

const QUESTION_TYPE_MAP = {
  game: { pattern: /\b(?:game|games|play|playing)\b/i, type: 'game' },
  show: { pattern: /\b(?:show|shows|anime|series|watch|watching)\b/i, type: 'show' },
  music: { pattern: /\b(?:song|songs|music|album|artist|listen|listening)\b/i, type: 'music' },
  food: { pattern: /\b(?:food|eat|eating|restaurant|meal|snack|hungry)\b/i, type: 'food' },
  tech: { pattern: /\b(?:tech|phone|laptop|pc|headset|keyboard|monitor|setup)\b/i, type: 'tech' },
};

function answerGenericQuestion(text) {
  const lower = text.toLowerCase();
  // Only trigger on recommendation-seeking questions
  if (!/\b(?:best|good|recommend|suggestions?|any recs|whats a good|what should|should i|anyone know)\b/i.test(lower)) return null;

  // Find which type they're asking about
  let targetType = null;
  for (const [, mapping] of Object.entries(QUESTION_TYPE_MAP)) {
    if (mapping.pattern.test(lower)) {
      targetType = mapping.type;
      break;
    }
  }
  if (!targetType) return null;

  // Collect all non-alias entities of that type
  const candidates = Object.entries(BUILT_IN_KNOWLEDGE)
    .filter(([, v]) => v.type === targetType && !v.alias && v.opinions?.positive?.length > 0)
    .map(([key, v]) => ({ key, opinion: v.opinions.positive[Math.floor(Math.random() * v.opinions.positive.length)] }));
  if (candidates.length === 0) return null;

  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  const name = pick.key.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const templates = [
    `Hmm I'd say try ${name}, ${pick.opinion.charAt(0).toLowerCase() + pick.opinion.slice(1)}`,
    `${name} is a solid pick, ${pick.opinion.charAt(0).toLowerCase() + pick.opinion.slice(1)}`,
    `Have you tried ${name}? ${pick.opinion}`,
    `I'd recommend ${name} honestly, ${pick.opinion.charAt(0).toLowerCase() + pick.opinion.slice(1)}`,
    `${name} for sure, ${pick.opinion.charAt(0).toLowerCase() + pick.opinion.slice(1)}`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

// ======================== INPUT-STYLE DETECTION ========================
// Detect the user's typing style and mirror it in the response.
// Hype users get hype responses, chill users get chill responses.

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

// ======================== SARCASM DETECTION ========================
// Detect sarcastic messages like "oh yeah thats totally how that works" and respond in kind.

function generateWittyBystander(content, sentiment) {
  const lower = content.toLowerCase();
  // Try pattern-matched responses first
  for (const pat of WITTY_BYSTANDER.patterns) {
    if (pat.test.test(lower)) {
      return pat.replies[Math.floor(Math.random() * pat.replies.length)];
    }
  }
  // Fall back to sentiment-based generic reactions
  const pool = sentiment === 'negative' ? WITTY_BYSTANDER.negative_generic
    : sentiment === 'positive' ? WITTY_BYSTANDER.positive_generic
    : WITTY_BYSTANDER.neutral_generic;
  return pool[Math.floor(Math.random() * pool.length)];
}

function detectSarcasm(text) {
  if (text.split(/\s+/).length < 4) return false;
  return SARCASM_PATTERNS.some(p => p.test(text));
}

// ======================== STORY / ANECDOTE ENGAGEMENT ========================
// When someone tells a long personal story, react to the content instead of using
// topic templates that ignore what they actually said.

function engageWithStory(text) {
  const wordCount = text.split(/\s+/).length;
  if (wordCount < 15) return null; // Not a story — too short
  const lower = text.toLowerCase();

  // Must have personal/narrative markers
  const hasNarrative = /\b(?:so i|i was|this guy|this person|my friend|my (?:mom|dad|brother|sister|boss|coworker)|today i|yesterday|last (?:night|week|time)|the other day|what happened was)\b/i.test(lower);
  if (!hasNarrative) return null;

  // Extract the most interesting noun/phrase to react to
  const interestingBits = lower.match(/\b(?:(?:\d+) (?:cans?|bottles?|bags?|boxes?|hours?|minutes?|times?|people|dollars|bucks)|(?:like|literally) \w+ing|(?:just|there) (?:like|standing|sitting|staring|waiting)|what is happening|couldnt believe|never seen|first time|out of nowhere|no reason|for no reason)\b/i);

  const storyReactions = [
    'Wait that actually happened?? lol',
    'I need more details on this',
    'Nah theres no way',
    'The way you tell stories is elite honestly',
    'Chat we have a storyteller in the building',
    'I was NOT expecting that',
    'This is the content I come here for',
    'Please tell me someone else was there to witness this',
    'Thats actually hilarious',
    'The mental image alone is sending me',
    'I refuse to believe this is real',
    'Things that keep me on this server fr',
  ];

  // If we found a funny specific detail, react to it
  if (interestingBits) {
    const detail = interestingBits[0];
    const detailReactions = [
      `"${detail}" is taking me out`,
      `Wait ${detail}?? lmao`,
      `I lost it at "${detail}"`,
      `${detail} is the funniest part of this`,
    ];
    if (Math.random() < 0.5) {
      return detailReactions[Math.floor(Math.random() * detailReactions.length)];
    }
  }

  return storyReactions[Math.floor(Math.random() * storyReactions.length)];
}

// ======================== SENTIMENT-SAFE PREFIX FILTER ========================
// Certain prefixes are inappropriate on sad/negative/sensitive messages.
// "Lmao the weight of the world isnt yours" — the Lmao is wrong here.

const UNSAFE_SAD_PREFIXES = /^(?:Lmao|Lol|Haha|Bruh|Bro|Dude|Sheesh|Ayo|Dawg|Omg|Yo|Fam|Man|Nah but) /i;

function sanitizePrefixForSentiment(text, sentiment) {
  if (sentiment !== 'negative') return text;
  // Strip inappropriate prefixes from sad/negative responses
  if (UNSAFE_SAD_PREFIXES.test(text)) {
    text = text.replace(UNSAFE_SAD_PREFIXES, '');
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }
  return text;
}

// ======================== CONTEXT-AWARE RESPONSE ENGINE ========================
// Extracts ALL signals from a message, scores templates for best fit, and enriches
// the chosen template with specific contextual details for human-sounding replies.

// --- Signal Extraction ---
// Pulls every useful signal from the user's message into a structured object.
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

function extractMessageSignals(text, topics, sentiment, extracted) {
  const lower = text.toLowerCase();
  const signals = {
    entity: null,        // specific game/show/artist/food name
    entityType: null,    // 'game', 'show', 'music', 'food', 'tech'
    timeCue: null,       // 'night', 'morning', 'weekend', 'marathon'
    activity: null,      // 'grind', 'competitive', 'chill', 'social', 'solo'
    intensity: null,     // 'obsessed', 'love', 'hate', 'meh', 'bored'
    topics: [],          // all detected topics sorted by score
    subTopics: [],       // matched keywords from the primary topic
    sentiment,
    intent: extracted?.intent || null,
    subject: extracted?.subjects?.[0] || null,
    wordCount: text.trim().split(/\s+/).length,
    isQuestion: /\?/.test(text) || /^(what|how|why|when|where|who|which|is|are|do|does|should|would|could)\b/i.test(text),
  };

  // Extract specific entity from knowledge base
  if (extracted?.subjects?.[0]) {
    const knowledge = lookupKnowledge(extracted.subjects[0]);
    if (knowledge) {
      signals.entity = knowledge.key;  // Use the canonical KB key, not the raw subject
      signals.entityType = knowledge.type;
    }
  }

  // If no entity from intent extraction, scan for known entities directly
  if (!signals.entity) {
    // Sort by key length descending so longer (more specific) matches win
    const sortedKeys = Object.entries(BUILT_IN_KNOWLEDGE)
      .filter(([k, v]) => !v.alias && k.length >= 3)
      .sort((a, b) => b[0].length - a[0].length);
    for (const [key, val] of sortedKeys) {
      if (lower.includes(key)) {
        signals.entity = key;
        signals.entityType = val.type;
        break;
      }
    }
  }

  // Extract time cue
  for (const [phrase, cue] of Object.entries(TIME_CUES)) {
    if (lower.includes(phrase)) {
      signals.timeCue = cue;
      break;
    }
  }

  // Extract activity cue
  for (const [phrase, cue] of Object.entries(ACTIVITY_CUES)) {
    if (lower.includes(phrase)) {
      signals.activity = cue;
      break;
    }
  }

  // Extract intensity cue
  for (const [phrase, cue] of Object.entries(INTENSITY_CUES)) {
    if (lower.includes(phrase)) {
      signals.intensity = cue;
      break;
    }
  }

  // Collect all topics
  if (topics) {
    signals.topics = topics.map(([name, data]) => ({ name, score: data.score, matched: data.matched, confidence: data.confidence }));
    if (topics[0]) {
      signals.subTopics = topics[0][1].matched || [];
    }
  }

  return signals;
}

// --- Template Scoring ---
// Scores how well a template matches the extracted signals.
// Higher score = template is more relevant to what the user said.
function scoreTemplateRelevance(template, signals) {
  const tLower = template.toLowerCase();
  const tWords = new Set(tLower.split(/\s+/).map(w => w.replace(/[^a-z0-9]/g, '')));
  let score = 0;

  // +3 for each sub-topic keyword that appears in the template
  for (const kw of signals.subTopics) {
    if (kw.length >= 3 && tLower.includes(kw)) score += 3;
    else if (kw.length < 3 && tWords.has(kw)) score += 3;
  }

  // +5 for entity name appearing in template
  if (signals.entity && tLower.includes(signals.entity)) score += 5;

  // +2 for matching time cue
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
    for (const w of cueWords) {
      if (tLower.includes(w)) { score += 2; break; }
    }
  }

  // +2 for matching activity cue
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
    for (const w of actWords) {
      if (tLower.includes(w)) { score += 2; break; }
    }
  }

  // +2 for matching intensity/sentiment feel
  if (signals.intensity) {
    const intensityWords = {
      obsessed: ['addic', 'cant stop', 'hooked', 'obsess', 'cant put'],
      love: ['fire', 'goated', 'amazing', 'best', 'love', 'solid', 'elite', 'banger'],
      hate: ['trash', 'garbage', 'terrible', 'worst', 'awful', 'mid'],
      meh: ['mid', 'alright', 'ok', 'fine', 'whatever'],
      bored: ['bored', 'nothing', 'looking for', 'need something'],
    };
    const intWords = intensityWords[signals.intensity] || [];
    for (const w of intWords) {
      if (tLower.includes(w)) { score += 2; break; }
    }
  }

  // +1 for sentiment alignment
  if (signals.sentiment === 'positive' && /good|great|fire|nice|love|solid|elite|goated|W|amazing/i.test(template)) score += 1;
  if (signals.sentiment === 'negative' && /rough|pain|rip|bad|trash|mid|sad|awful|oof/i.test(template)) score += 1;

  // Negative scoring: penalize templates that imply context the user didn't mention
  // This prevents "ranked at 3am" from showing up when there's no competitive signal
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

// Pick the best-scoring template from a pool, with slight randomization to avoid
// always returning the exact same one. Top 3 candidates are picked from, weighted.
function pickBestTemplate(pool, signals) {
  if (!pool || pool.length === 0) return null;
  if (pool.length <= 3) return pool[Math.floor(Math.random() * pool.length)];

  // Score all templates, with small random jitter for variety
  const scored = pool.map((t, i) => ({
    template: t,
    score: scoreTemplateRelevance(t, signals) + (Math.random() * 1.5),
    index: i,
  }));
  scored.sort((a, b) => b.score - a.score);

  const topScore = scored[0].score;

  // If no signal matches at all (scores are just jitter), fall back to random
  if (topScore < 1.5) return pool[Math.floor(Math.random() * pool.length)];

  // Collect all templates within 3 points of the top score for variety
  const candidates = scored.filter(s => s.score >= topScore - 3 && s.score > 0);
  // Weighted random: higher score = higher chance
  const totalWeight = candidates.reduce((sum, c) => sum + c.score, 0);
  let roll = Math.random() * totalWeight;
  for (const c of candidates) {
    roll -= c.score;
    if (roll <= 0) return c.template;
  }
  return candidates[0].template;
}

// --- Contextual Enrichment ---
// After choosing a template, enrich it by weaving in specific details from the signals.
// Uses natural sentence connectors so it sounds human, not assembled.

const ENTITY_CONNECTORS = {
  game: [
    '{template}, {entity} is that game',
    '{template}, especially {entity}',
    '{template}, {entity} specifically',
    '{entity} though, {template_lower}',
    'when it comes to {entity}, {template_lower}',
    '{template} — {entity} is exactly that',
  ],
  show: [
    '{template}, {entity} especially',
    '{entity} is a perfect example, {template_lower}',
    '{template} — talking about {entity} specifically',
  ],
  music: [
    '{template}, {entity} hits different',
    '{entity} though... {template_lower}',
    '{template} and {entity} is proof of that',
  ],
  food: [
    '{template}, especially {entity}',
    '{entity} specifically, {template_lower}',
    '{template} — {entity} is elite',
    '{template}, {entity} hits different',
    'ngl {entity} is underrated, {template_lower}',
  ],
  tech: [
    '{template}, {entity} especially',
    '{entity} though, {template_lower}',
    '{template} — {entity} in particular',
    '{template}, especially with {entity}',
    '{entity} is something else, {template_lower}',
  ],
};

const TIME_ENRICHMENTS = {
  night: ['at this hour', 'this late', 'late night', 'at night'],
  morning: ['this early', 'in the morning', 'before noon'],
  evening: ['in the evening', 'after the day'],
  weekend: ['on the weekend', 'weekend vibes'],
  marathon: ['for that long', 'nonstop like that', 'marathon style'],
  allday: ['all day like that', 'the whole day'],
};

const ACTIVITY_ENRICHMENTS = {
  grind: ['the grind is real', 'grinding it out', 'the dedication though'],
  competitive: ['in ranked especially', 'competitively like that', 'in ranked'],
  chill: ['just vibing with it', 'keeping it chill', 'cozy mode'],
  social: ['with the squad', 'with friends makes it hit different', 'the group experience'],
  solo: ['solo like that', 'by yourself though', 'the solo experience'],
  streaming: ['on stream too', 'while streaming', 'live and everything'],
  new: ['especially as a beginner', 'when youre just starting', 'the first time experience'],
  returning: ['coming back to it', 'the return arc', 'picking it back up'],
};

function enrichWithContext(template, signals, opts = {}) {
  if (!template) return template;
  let result = template;
  const lower = template.toLowerCase();
  const resultWords = new Set(lower.split(/\s+/).map(w => w.replace(/[^a-z]/g, '')).filter(Boolean));
  let enriched = false;

  // Scale enrichment budget based on input length — short messages get less enrichment
  let maxEnrich;
  if (signals.wordCount <= 3) maxEnrich = 0;        // "gg", "nice", "lol" → no enrichment
  else if (signals.wordCount <= 6) maxEnrich = 1;    // short sentences → 1 enrichment max
  else maxEnrich = 2;                                 // full sentences → up to 2

  // If cross-topic bridge will be appended, reserve space by reducing max
  if (opts.bridgeWillFollow) maxEnrich = Math.max(0, maxEnrich - 1);

  let enrichCount = 0;

  // 1. Entity enrichment — if the template doesn't already mention the specific entity
  if (signals.entity && !lower.includes(signals.entity) && enrichCount < maxEnrich) {
    const connectors = ENTITY_CONNECTORS[signals.entityType] || ENTITY_CONNECTORS.game;
    if (Math.random() < 0.65) {
      const connector = connectors[Math.floor(Math.random() * connectors.length)];
      const properNounTypes = new Set(['game', 'show', 'tech', 'music']);
      const entityDisplay = properNounTypes.has(signals.entityType)
        ? signals.entity.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
        : signals.entity;
      result = connector
        .replace('{template}', result.replace(/[.!,]$/, ''))
        .replace('{template_lower}', result.charAt(0).toLowerCase() + result.slice(1).replace(/[.!,]$/, ''))
        .replace(/\{entity\}/g, entityDisplay);
      enrichCount++;
      enriched = true;
    }
  }

  // 2. Time enrichment — if the template doesn't already mention the time context
  if (signals.timeCue && enrichCount < maxEnrich) {
    const timeWords = TIME_ENRICHMENTS[signals.timeCue];
    if (timeWords) {
      const alreadyHasTime = timeWords.some(w => lower.includes(w.split(' ')[0]));
      // Also check for word overlap to avoid repeating what the template already says
      const phrase = timeWords[Math.floor(Math.random() * timeWords.length)];
      const phraseWords = phrase.split(' ').map(w => w.replace(/[^a-z]/g, ''));
      const overlaps = phraseWords.filter(w => w.length >= 3 && resultWords.has(w)).length;
      if (!alreadyHasTime && overlaps === 0 && Math.random() < 0.45) {
        const joiners = enriched
          ? [', ', ' ']
          : [', ', ' especially ', ', '];
        const joiner = joiners[Math.floor(Math.random() * joiners.length)];
        result = result.replace(/[.!,]$/, '') + joiner + phrase;
        enrichCount++;
        enriched = true;
      }
    }
  }

  // 3. Activity enrichment — if template doesn't already reference the activity
  if (signals.activity && enrichCount < maxEnrich) {
    const actPhrases = ACTIVITY_ENRICHMENTS[signals.activity];
    if (actPhrases) {
      const phrase = actPhrases[Math.floor(Math.random() * actPhrases.length)];
      const phraseWords = phrase.split(' ').map(w => w.replace(/[^a-z]/g, ''));
      const alreadyHasAct = actPhrases.some(w => lower.includes(w.split(' ')[0]));
      const overlaps = phraseWords.filter(w => w.length >= 3 && resultWords.has(w)).length;
      if (!alreadyHasAct && overlaps === 0 && Math.random() < 0.35) {
        result = result.replace(/[.!,]$/, '') + ', ' + phrase;
        enrichCount++;
      }
    }
  }

  // Length safety net: trim the last enrichment clause if result got too long
  if (result.length > 110) {
    const lastComma = result.lastIndexOf(', ');
    const lastDash = result.lastIndexOf(' — ');
    const cutPoint = Math.max(lastComma, lastDash);
    if (cutPoint > 30 && cutPoint > template.length * 0.6) {
      result = result.substring(0, cutPoint);
    }
  }

  return result;
}

// --- Cross-Topic Blending ---
// When multiple topics are detected, add a natural bridge between them.
const CROSS_TOPIC_BRIDGES = {
  'gaming+sleep': ['gaming session turning into an all nighter', 'sleep schedule said goodbye to gaming', 'one more game ruined the sleep schedule again'],
  'gaming+food': ['gaming snacks are essential', 'pause the game for food breaks', 'eating while gaming is a skill'],
  'gaming+music': ['the right playlist makes the game 10x better', 'gaming with music on is elite', 'that games soundtrack is all you need though'],
  'gaming+stream': ['gaming content is always good', 'gaming streams hit different', 'watching someone else play is almost as fun'],
  'gaming+money': ['gaming is expensive but worth it', 'the wallet takes hits for gaming', 'gaming deals save lives'],
  'gaming+relationship': ['gaming with your partner is either bonding or divorce', 'couples who game together stay together maybe'],
  'gaming+school_work': ['gaming after homework hits different', 'should be studying but gaming wins', 'work first game later...theoretically'],
  'stream+music': ['music streams are so chill', 'stream playlist go crazy', 'the vibes when the streamer has good music taste'],
  'stream+food': ['cooking streams are underrated content', 'eating on stream is comfort content'],
  'food+sleep': ['midnight snack energy', 'food coma incoming', 'eating right before bed hits different'],
  'music+sleep': ['sleep playlist is essential', 'falling asleep to music is the move', 'lofi and sleep go together'],
  'music+mood_positive': ['good music good mood simple', 'the right song can fix anything'],
  'music+mood_negative': ['sad songs hit different sometimes', 'music for the feels'],
  'tech+gaming': ['the setup matters for gaming', 'tech upgrades for gaming are addicting', 'hardware makes the gaming experience'],
  'tech+money': ['tech is expensive but thats the tax', 'saving up for tech is a lifestyle'],
  'sports+gaming': ['sports games or actual sports tough call', 'athlete on screen athlete in game'],
  'movies_tv+food': ['movie night with snacks is the blueprint', 'watching shows while eating is peak'],
  'weather+sleep': ['rain sounds for sleeping are elite', 'cold weather makes you sleep better'],
  'weather+gaming': ['rainy day gaming sessions are the best', 'stuck inside so might as well game'],
  'food+music': ['cooking with good music on is elite', 'the right music makes the food taste better somehow'],
  'sleep+school_work': ['sleep vs homework the eternal struggle', 'pulling an all nighter for school is a rite of passage'],
  'tech+stream': ['the stream setup matters more than people think', 'tech upgrades for streaming hit different'],
  'food+school_work': ['studying requires snacks thats just science', 'brain food is a real thing'],
  'sleep+gaming': ['one more game and then sleep right? wrong', 'the sleep schedule is just a suggestion for gamers'],
};

function getCrossTopicBridge(signals) {
  if (signals.topics.length < 2) return null;
  const t1 = signals.topics[0].name;
  const t2 = signals.topics[1].name;

  // Try both orders
  const key1 = `${t1}+${t2}`;
  const key2 = `${t2}+${t1}`;
  const bridges = CROSS_TOPIC_BRIDGES[key1] || CROSS_TOPIC_BRIDGES[key2];
  if (!bridges) return null;
  return bridges[Math.floor(Math.random() * bridges.length)];
}

// --- Main context-aware pick function ---
// Replaces random selection with scored selection + enrichment.
function contextAwarePick(pool, signals, feedbackFilter) {
  // Apply feedback filtering if available (preserves existing anti-repeat logic)
  const filtered = feedbackFilter ? feedbackFilter(pool) : pool;
  if (!filtered || filtered.length === 0) return null;

  // Pick best template based on signal scoring
  const template = pickBestTemplate(filtered, signals);
  if (!template) return null;

  // Decide upfront if we'll add a cross-topic bridge so enrichment can adjust
  const willBridge = signals.topics.length >= 2 && Math.random() < 0.15;
  const bridge = willBridge ? getCrossTopicBridge(signals) : null;

  // Enrich the chosen template with specific context
  let result = enrichWithContext(template, signals, { bridgeWillFollow: !!bridge });

  // Append cross-topic bridge (no additional enrichment stacking)
  if (bridge) {
    // Short inputs shouldn't get bridges either
    if (signals.wordCount > 3) {
      if (Math.random() < 0.5) {
        result = bridge.charAt(0).toUpperCase() + bridge.slice(1) + ', ' + result.charAt(0).toLowerCase() + result.slice(1);
      } else {
        result = result.replace(/[.!,]$/, '') + ' — ' + bridge;
      }
    }
  }

  return result;
}

// ======================== CHANNEL MEMORY ========================

class ChannelMemory {
  constructor(maxMessages = 30) {
    this.channels = new Map(); // channelId → messages[]
    this.maxMessages = maxMessages;
    this.userLastSeen = new Map(); // `channelId:userId` → timestamp
    // Persistent conversation threads (#8)
    this.activeThreads = new Map(); // channelId → { topic, participants, startTime, lastActivity, messages }
    // Conversation summaries (#13)
    this.recentSummaries = new Map(); // channelId → [{ summary, topic, timestamp }]
  }

  addMessage(channelId, userId, username, content) {
    if (!this.channels.has(channelId)) this.channels.set(channelId, []);
    const msgs = this.channels.get(channelId);
    const extracted = extractSubject(content);
    const topics = detectTopics(content);
    const msg = {
      userId,
      username,
      content,
      timestamp: Date.now(),
      topics,
      intent: extracted ? extracted.intent : null,
      subjects: extracted ? extracted.subjects : [],
    };
    msgs.push(msg);
    if (msgs.length > this.maxMessages) msgs.shift();

    const key = `${channelId}:${userId}`;
    this.userLastSeen.set(key, Date.now());

    // Update active thread tracking (#8)
    this._updateThread(channelId, userId, username, content, topics, extracted);

    return msg;
  }

  // Multi-turn context tracking (#8)
  _updateThread(channelId, userId, username, content, topics, extracted) {
    const thread = this.activeThreads.get(channelId);
    const now = Date.now();

    // Detect dominant topic
    const topTopic = topics && topics.length > 0 ? topics[0][0] : null;

    if (!thread || (now - thread.lastActivity > 300000)) {
      // No active thread or expired (5 min gap) — start new one
      // Generate summary of old thread if it was substantial (#13)
      if (thread && thread.messages >= 5) {
        this._summarizeThread(channelId, thread);
      }
      this.activeThreads.set(channelId, {
        topic: topTopic,
        participants: new Set([userId]),
        startTime: now,
        lastActivity: now,
        messages: 1,
        subjects: extracted?.subjects || [],
        questionsAsked: extracted?.intent?.includes('asking') ? [{ userId, content, answered: false }] : [],
      });
    } else {
      // Continue existing thread
      thread.lastActivity = now;
      thread.messages++;
      thread.participants.add(userId);
      if (topTopic && topTopic !== thread.topic) {
        // Topic shift detected — track it
        thread.topicShifts = (thread.topicShifts || 0) + 1;
        if (thread.topicShifts >= 3) thread.topic = topTopic; // fully shifted
      }
      if (extracted?.subjects) {
        thread.subjects = [...new Set([...thread.subjects, ...extracted.subjects])].slice(-10);
      }
      // Track unanswered questions (#8)
      if (extracted?.intent?.includes('asking')) {
        if (!thread.questionsAsked) thread.questionsAsked = [];
        thread.questionsAsked.push({ userId, content, answered: false });
        if (thread.questionsAsked.length > 5) thread.questionsAsked.shift();
      }
    }
  }

  // Generate a simple summary of a conversation thread (#13)
  _summarizeThread(channelId, thread) {
    if (!this.recentSummaries.has(channelId)) this.recentSummaries.set(channelId, []);
    const summaries = this.recentSummaries.get(channelId);

    const participantCount = thread.participants instanceof Set ? thread.participants.size : (thread.participants || 0);
    const duration = Math.round((thread.lastActivity - thread.startTime) / 60000);
    const summary = {
      topic: thread.topic || 'general',
      subjects: thread.subjects || [],
      participantCount,
      messageCount: thread.messages,
      duration,
      timestamp: Date.now(),
    };
    summaries.push(summary);
    if (summaries.length > 10) summaries.shift();
  }

  // Get the current active thread for a channel (#8)
  getActiveThread(channelId) {
    const thread = this.activeThreads.get(channelId);
    if (!thread) return null;
    if (Date.now() - thread.lastActivity > 300000) return null; // expired
    return thread;
  }

  // Get unanswered questions in the channel (#8)
  getUnansweredQuestions(channelId) {
    const thread = this.getActiveThread(channelId);
    if (!thread || !thread.questionsAsked) return [];
    return thread.questionsAsked.filter(q => !q.answered);
  }

  // Get last conversation summary (#13)
  getLastSummary(channelId) {
    const summaries = this.recentSummaries.get(channelId);
    if (!summaries || summaries.length === 0) return null;
    return summaries[summaries.length - 1];
  }

  // Generate a text summary for the bot to share (#13)
  generateSummaryText(channelId) {
    const summary = this.getLastSummary(channelId);
    if (!summary) return null;

    const templates = [
      `Looks like the convo was about ${summary.topic} with ${summary.participantCount} people chatting for about ${summary.duration} min`,
      `Last discussion: ${summary.topic} topic, ${summary.messageCount} messages over ${summary.duration} min`,
      `Chat was going off about ${summary.topic} earlier, ${summary.participantCount} people were in on it`,
    ];
    let text = templates[Math.floor(Math.random() * templates.length)];
    if (summary.subjects.length > 0) {
      text += ` — subjects: ${summary.subjects.slice(0, 3).join(', ')}`;
    }
    return text;
  }

  getRecentTopics(channelId, windowMs = 120000) {
    const msgs = this.channels.get(channelId) || [];
    const cutoff = Date.now() - windowMs;
    const topicCounts = {};

    for (const msg of msgs) {
      if (msg.timestamp < cutoff) continue;
      if (!msg.topics) continue;
      for (const [topic, data] of msg.topics) {
        topicCounts[topic] = (topicCounts[topic] || 0) + data.score;
      }
    }

    return Object.entries(topicCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([topic]) => topic);
  }

  getRecentMessages(channelId, count = 10) {
    const msgs = this.channels.get(channelId) || [];
    return msgs.slice(-count);
  }

  isUserReturning(channelId, userId, thresholdMs = 1800000) {
    const key = `${channelId}:${userId}`;
    const lastSeen = this.userLastSeen.get(key);
    if (!lastSeen) return true; // first time = returning
    return (Date.now() - lastSeen) > thresholdMs;
  }

  getActiveUserCount(channelId, windowMs = 300000) {
    const msgs = this.channels.get(channelId) || [];
    const cutoff = Date.now() - windowMs;
    const users = new Set();
    for (const msg of msgs) {
      if (msg.timestamp >= cutoff) users.add(msg.userId);
    }
    return users.size;
  }

  // Persistent memory (#3) — save channel contexts that survive restarts
  toJSON() {
    const threads = {};
    for (const [k, v] of this.activeThreads) {
      threads[k] = { ...v, participants: v.participants instanceof Set ? [...v.participants] : [] };
    }
    const summaries = {};
    for (const [k, v] of this.recentSummaries) {
      summaries[k] = v;
    }
    // Save last seen data
    const lastSeen = [...this.userLastSeen.entries()].slice(-500);
    return { threads, summaries, lastSeen };
  }

  loadFromJSON(data) {
    if (!data) return;
    if (data.threads) {
      for (const [k, v] of Object.entries(data.threads)) {
        this.activeThreads.set(k, { ...v, participants: new Set(v.participants || []) });
      }
    }
    if (data.summaries) {
      for (const [k, v] of Object.entries(data.summaries)) {
        this.recentSummaries.set(k, v);
      }
    }
    if (data.lastSeen) {
      this.userLastSeen = new Map(data.lastSeen);
    }
  }
}

// ======================== SMART BOT CORE ========================


// ======================== SMARTBOT CORE ========================

class SmartBot {
  constructor() {
    this.markov = new MarkovChain();
    this.memory = new ChannelMemory(30);
    this.lastReplyTime = new Map();
    this.messageCountSinceReply = new Map();
    this.config = {
      enabled: false,
      replyChance: 0.015,
      mentionAlwaysReply: true,
      nameAlwaysReply: true,
      cooldownMs: 30000,
      minMessagesBetween: 4,
      markovChance: 0.25,
      maxResponseLength: 200,
      allowedChannels: [],
      ignoredChannels: [],
      botName: '',
      personality: 'chill',
      newsChannelId: '',
      newsInterval: 4,
      newsTopics: [],
      rssFeeds: [],
      newsBlockedKeywords: [],
      newsNsfwFilter: true,
    };

    this.knowledge = {
      streamSchedule: '', nextStream: '', isLive: false, currentGame: '',
      streamTitle: '', viewerCount: 0, streamerName: '',
      socials: {}, customEntries: {}, serverInfo: '', rules: '',
      // Historical stream data (auto-filled by stream-manager on go-offline)
      lastStreamPeakViewers: 0, lastStreamDate: '', lastStreamDuration: '',
      lastStreamGame: '', lastStreamAvgViewers: 0,
      // Bot facts — editable from dashboard
      facts: {},
    };

    this.stats = {
      totalReplies: 0, topicReplies: {}, markovReplies: 0, templateReplies: 0,
      mentionReplies: 0, knowledgeReplies: 0, followUpReplies: 0, lastReplyAt: null, dailyReplies: {}
    };

    this.lastBotReply = new Map();
    this._lastAskedAbout = null;
    this._lastConversationContext = new Map();
    this.userPreferences = new Map();

    this.learnedKnowledge = new LearnedKnowledge();
    this.feedback = new FeedbackTracker();
    this.slangTracker = new SlangTracker();
    this.learningLog = new LearningLog();
    this._trainingStats = { totalSessions: 0, approved: 0, rejected: 0, log: [] };
    this.trainedPairs = new Map();

    this.replyHistory = new ReplyHistory();
    this.channelMsgLengths = new Map();
    this.lastBotReplyDetails = new Map();

    this.levelingData = null;
    this.streamHistory = null;
    this.recentEmotionalReplies = [];

    // ---- Qwen AI Engine (Groq + HuggingFace) ----
    this.ai = new QwenAI();

    // ---- API keys for live data ----
    this.apiKeys = {
      weatherApi: '',
      openWeatherMap: '',
      newsApi: '',
      omdb: '',
      tmdb: '',
      rawg: '',
    };
    this.apiCache = new Map();
    this.API_CACHE_TTL = 5 * 60 * 1000;

    // (8A) LRU cache for normalization
    this._normalizeCache = new LRUCache(300);
    // (1D) Inverted index: stemmed word → Set<normalizedKey>
    this._pairIndex = new Map();
    // (2C) Candidate Q&A pairs extracted from conversations
    this._candidatePairs = new Map();
    // (59) Conversation log — every bot reply saved for dashboard review
    this._conversationLog = [];
    // (2B+5A) User reputation for correction system
    this.userReputation = new Map();
    // (8B) Precompiled regex patterns
    this._regexPatterns = {
      correction: /^(?:no|nah|wrong|actually|its not|thats not|it should be|the answer is|correct answer is)\s*[,:]?\s*(.+)/i,
      question: /\?$|\b(?:what|how|why|who|when|where|which|can you|do you|is there|are there|tell me)\b/i,
      greeting: /^(?:hi|hello|hey|sup|yo|whats up|good morning|good evening|gm|gn)\b/i,
      command: /^[!\/\.]/,
    };
    // (2D) Decay timer + (7C) Backup timer
    this._decayTimer = null;
    this._backupTimer = null;
    // Mention reply throttle
    this._lastMentionReply = new Map();
  }

  setApiKeys(keys) {
    for (const [k, v] of Object.entries(keys)) {
      if (k in this.apiKeys) this.apiKeys[k] = v;
    }
    if (keys.groq || keys.huggingface) {
      this.ai.setKeys({ groq: keys.groq, huggingface: keys.huggingface });
    }
  }

  pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  _normalizeForMatch(text) {
    let t = String(text).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();
    t = expandContractions(t);
    // Dedup repeated words: "haha haha haha" → "haha"
    t = t.replace(/\b(\w+)(\s+\1)+\b/g, '$1');
    return t;
  }

  // (1B+1C+8A) Enhanced normalization with stemming + stop word removal for fuzzy matching
  _normalizeStemmed(text) {
    const basic = typeof text === 'string' ? text : this._normalizeForMatch(text);
    const cached = this._normalizeCache.get(basic);
    if (cached !== undefined) return cached;
    // Number normalization for fuzzy matching — "5 apples" ≈ "3 apples"
    const numNorm = basic.replace(/\d+/g, '<NUM>');
    // Apply synonym aliases before stemming for better grouping
    const synNorm = applySynonyms(numNorm);
    const words = synNorm.split(' ');
    const stemmed = words.filter(w => w.length > 1 && !STOP_WORDS.has(w)).map(basicStem);
    const result = stemmed.length > 0 ? stemmed.join(' ') : basic;
    this._normalizeCache.set(basic, result);
    return result;
  }

  // (8C) Extract character bigrams for n-gram matching
  _getBigrams(text) {
    const words = text.split(' ').filter(w => w.length > 1);
    const bigrams = new Set();
    for (let i = 0; i < words.length - 1; i++) {
      bigrams.add(`${words[i]} ${words[i + 1]}`);
    }
    return bigrams;
  }

  // (1G) Simple intent detection for trained pair matching
  _detectIntent(text) {
    if (/\b(?:how to|how do|how can|steps to|way to)\b/.test(text)) return 'howto';
    if (/\b(?:what is|what are|whats|define|meaning of|explain)\b/.test(text)) return 'definition';
    if (/\b(?:why|reason|cause)\b/.test(text)) return 'reason';
    if (/\b(?:when|what time|schedule|date)\b/.test(text)) return 'time';
    if (/\b(?:where|location|place)\b/.test(text)) return 'location';
    if (/\b(?:recommend|suggest|best|should i|which)\b/.test(text)) return 'recommendation';
    if (/\?/.test(text)) return 'question';
    return null;
  }

  // (1D) Build/rebuild the inverted index for trained pairs
  _rebuildPairIndex() {
    this._pairIndex.clear();
    for (const [key, pair] of this.trainedPairs) {
      if (pair.score <= 0) continue;
      const stemmed = this._normalizeStemmed(key);
      pair._cachedStemmed = stemmed; // cache for matching
      for (const word of stemmed.split(' ')) {
        if (word.length < 2) continue;
        if (!this._pairIndex.has(word)) this._pairIndex.set(word, new Set());
        this._pairIndex.get(word).add(key);
      }
    }
  }

  // (2D) Temporal decay — reduce score of unused pairs over time so stale pairs fade out
  _decayUnusedPairs() {
    const now = Date.now();
    const DAY = 86400000;
    let decayed = 0;
    let staleWarned = 0;
    for (const [key, pair] of this.trainedPairs) {
      const lastUsed = pair.lastUsed || pair.created || now;
      const daysSinceUse = (now - lastUsed) / DAY;
      if (daysSinceUse > 7 && pair.score > 0) {
        // Decay 1% per day past the 7-day grace period
        const decayFactor = Math.pow(0.99, daysSinceUse - 7);
        pair.score = Math.max(pair.score * decayFactor, -5);
        decayed++;
      }
      // Staleness: pairs not updated in >30 days get additional decay
      const lastUpdated = pair.updatedAt || pair.created || now;
      const daysSinceUpdate = (now - lastUpdated) / DAY;
      if (daysSinceUpdate > 30 && pair.score > 0) {
        // Extra 2% decay per day past 30 days — stale pairs fade faster
        const staleFactor = Math.pow(0.98, daysSinceUpdate - 30);
        pair.score = Math.max(pair.score * staleFactor, 0.1);
        if (!pair._staleWarned) { pair._staleWarned = true; staleWarned++; }
      }
    }
    if (decayed > 0) {
      this.learningLog.log('pair_decay', `Decayed ${decayed} unused trained pairs${staleWarned ? `, ${staleWarned} newly stale` : ''}`);
    }
  }

  // (7C) Backup trained pairs to a separate file
  _backupTrainedPairs() {
    // This is called by timer; actual file write is handled by the route layer via saveState.
    // We store a snapshot timestamp so the route can detect if backup is needed.
    this._lastPairBackupRequest = Date.now();
  }

  // Start background timers for decay (2D) and backup (7C)
  _startTimers() {
    // Decay every 24 hours
    if (this._decayTimer) clearInterval(this._decayTimer);
    this._decayTimer = setInterval(() => {
      this._decayUnusedPairs();
      this._decayFeedback();
      this._decaySlang();
      this._decayLearnedKnowledge();
    }, 86400000);
    // Backup request every 6 hours
    if (this._backupTimer) clearInterval(this._backupTimer);
    this._backupTimer = setInterval(() => this._backupTrainedPairs(), 21600000);
  }

  // (E2) Temporal decay on feedback scores — old feedback fades
  _decayFeedback() {
    let decayed = 0;
    for (const [key, entry] of this.feedback.templateScores) {
      if (entry.uses > 0) {
        entry.positive = Math.floor(entry.positive * 0.95);
        entry.negative = Math.floor(entry.negative * 0.95);
        if (entry.positive === 0 && entry.negative === 0) {
          this.feedback.templateScores.delete(key);
        }
        decayed++;
      }
    }
    if (decayed > 0) this.learningLog.log('feedback_decay', `Decayed ${decayed} feedback entries`);
  }

  // (E4) Temporal decay on slang expressions — old unused expressions fade
  _decaySlang() {
    const now = Date.now();
    const MONTH = 30 * 86400000;
    let removed = 0;
    for (const [phrase, data] of this.slangTracker.expressions) {
      if (now - (data.lastUsed || 0) > MONTH * 2) {
        data.count = Math.floor(data.count * 0.8);
        if (data.count <= 1) { this.slangTracker.expressions.delete(phrase); removed++; }
      }
    }
    if (removed > 0) this.learningLog.log('slang_decay', `Removed ${removed} stale slang expressions`);
  }

  // (E3) Temporal decay on learned knowledge — old unused subjects fade
  _decayLearnedKnowledge() {
    const now = Date.now();
    const MONTH = 30 * 86400000;
    let removed = 0;
    for (const [subj, data] of this.learnedKnowledge.subjects) {
      if (now - (data.lastSeen || 0) > MONTH * 3 && data.mentions <= 5) {
        this.learnedKnowledge.subjects.delete(subj); removed++;
      }
    }
    if (removed > 0) this.learningLog.log('knowledge_decay', `Removed ${removed} stale learned subjects`);
  }

  _findTrainedPairMatch(content, inputTopicsForCtx = null) {
    if (this.trainedPairs.size === 0) return null;
    const norm = this._normalizeForMatch(content);
    if (!norm || norm.length < 3) return null;

    // Exact match first (fastest path)
    const exact = this.trainedPairs.get(norm);
    if (exact && exact.score > 0) {
      exact.lastUsed = Date.now(); // (7A)
      exact.uses = (exact.uses || 0) + 1;
      // (1F) Multiple response variants
      if (exact.responses && exact.responses.length > 1) {
        const idx = Math.floor(Math.random() * exact.responses.length);
        exact._lastResponseIdx = idx;
        exact.response = exact.responses[idx];
      }
      return exact;
    }

    // (1A) Substring/contains match — short trained keys contained in input or vice versa
    for (const [key, pair] of this.trainedPairs) {
      if (pair.score <= 0 || key.length < 8) continue;
      if (norm.includes(key) || (norm.length >= 8 && key.includes(norm))) {
        pair.lastUsed = Date.now();
        pair.uses = (pair.uses || 0) + 1;
        if (pair.responses && pair.responses.length > 1) {
          const idx = Math.floor(Math.random() * pair.responses.length);
          pair._lastResponseIdx = idx;
          pair.response = pair.responses[idx];
        }
        return pair;
      }
    }

    // (1B+1C) Stemmed normalization for fuzzy matching
    const stemmedInput = this._normalizeStemmed(norm);
    const inputWords = new Set(stemmedInput.split(' ').filter(w => w.length > 1));
    if (inputWords.size === 0) return null;

    // (1D) Use inverted index for candidate selection (O(k) instead of O(n))
    const candidates = new Set();
    for (const word of inputWords) {
      const keys = this._pairIndex.get(word);
      if (keys) for (const k of keys) candidates.add(k);
    }

    // (8C) Input bigrams for n-gram matching
    const inputBigrams = this._getBigrams(stemmedInput);

    let bestMatch = null;
    let bestScore = 0;
    let bestLength = 0; // (8E) tiebreaker by pair length

    // Check candidates from inverted index, fallback to full scan if no index
    const pairsToCheck = candidates.size > 0 ? [...candidates] : [...this.trainedPairs.keys()];
    for (const key of pairsToCheck) {
      const pair = this.trainedPairs.get(key);
      if (!pair || pair.score <= 0) continue;

      const pairStemmed = pair._cachedStemmed || this._normalizeStemmed(key);
      const pairWords = new Set(pairStemmed.split(' ').filter(w => w.length > 1));
      if (pairWords.size === 0) continue;

      // Jaccard similarity with stemmed words
      let intersection = 0;
      for (const w of inputWords) { if (pairWords.has(w)) intersection++; }
      const union = new Set([...inputWords, ...pairWords]).size;
      let score = union > 0 ? intersection / union : 0;

      // (8C) N-gram boost — blend word Jaccard with bigram overlap
      if (inputBigrams.size > 0) {
        const pairBigrams = this._getBigrams(pairStemmed);
        if (pairBigrams.size > 0) {
          let bigramOverlap = 0;
          for (const bg of inputBigrams) { if (pairBigrams.has(bg)) bigramOverlap++; }
          const bigramUnion = new Set([...inputBigrams, ...pairBigrams]).size;
          if (bigramUnion > 0) score = score * 0.7 + (bigramOverlap / bigramUnion) * 0.3;
        }
      }

      // (1E) Boost/penalize by feedback score — well-received pairs score higher, disliked lower
      if (pair.feedbackScore) {
        if (pair.feedbackScore > 0) score *= (1 + Math.min(pair.feedbackScore * 0.05, 0.2));
        else score *= Math.max(1 + pair.feedbackScore * 0.03, 0.7); // penalty floor at 0.7x
      }

      // Staleness penalty — old pairs that haven't been re-confirmed get lower priority
      const pairAge = (Date.now() - (pair.updatedAt || pair.created || Date.now())) / 86400000;
      if (pairAge > 30) score *= 0.85;
      else if (pairAge > 14) score *= 0.95;

      // (1G) Intent matching bonus — if pair has an intent tag and it matches input
      if (pair.intent) {
        const inputIntent = this._detectIntent(norm);
        if (inputIntent && inputIntent === pair.intent) score *= 1.15;
      }

      // Context/topic alignment bonus — pairs tagged with topics get boosted when the message matches
      if (pair.context && pair.context.length > 0 && inputTopicsForCtx) {
        const inputTopicNames = inputTopicsForCtx.map(t => t[0]);
        const contextOverlap = pair.context.filter(c => inputTopicNames.includes(c));
        if (contextOverlap.length > 0) score *= 1.12;
        else if (inputTopicNames.length > 0) score *= 0.95; // slight penalty when topics don't align
      }

      // Require minimum threshold and scaled intersection
      const minIntersection = Math.max(2, Math.min(Math.ceil(inputWords.size * 0.3), 4));
      if (score >= 0.55 && intersection >= minIntersection && (score > bestScore || (score === bestScore && key.length > bestLength))) {
        bestScore = score;
        bestMatch = pair;
        bestLength = key.length; // (8E) prefer longer (more specific) pairs on ties
      }
    }

    if (bestMatch) {
      bestMatch.lastUsed = Date.now(); // (7A)
      bestMatch.uses = (bestMatch.uses || 0) + 1;
      // (1F) Multiple response variants
      if (bestMatch.responses && bestMatch.responses.length > 1) {
        const idx = Math.floor(Math.random() * bestMatch.responses.length);
        bestMatch._lastResponseIdx = idx;
        bestMatch.response = bestMatch.responses[idx];
      }
    }

    return bestMatch;
  }

  // (3A) Fallback trained pair match — lower threshold, used at end of pipeline
  _findTrainedPairFallback(content) {
    if (this.trainedPairs.size === 0) return null;
    const norm = this._normalizeForMatch(content);
    if (!norm || norm.length < 3) return null;
    const stemmedInput = this._normalizeStemmed(norm);
    const inputWords = new Set(stemmedInput.split(' ').filter(w => w.length > 1));
    if (inputWords.size === 0) return null;

    // Adaptive threshold: longer inputs need lower threshold (more words = sparser overlap)
    const threshold = inputWords.size <= 3 ? 0.45 : inputWords.size <= 6 ? 0.38 : 0.30;
    const minOverlap = inputWords.size <= 3 ? 2 : inputWords.size <= 6 ? 2 : 3;
    const inputBigrams = this._getBigrams(stemmedInput);

    // Use inverted index for candidate narrowing
    const candidates = new Set();
    for (const word of inputWords) {
      const keys = this._pairIndex.get(word);
      if (keys) for (const k of keys) candidates.add(k);
    }
    const pairsToCheck = candidates.size > 0 ? [...candidates] : [...this.trainedPairs.keys()];

    let bestMatch = null;
    let bestScore = 0;
    for (const key of pairsToCheck) {
      const pair = this.trainedPairs.get(key);
      if (!pair || pair.score <= 0) continue;
      const pairStemmed = pair._cachedStemmed || this._normalizeStemmed(key);
      const pairWords = new Set(pairStemmed.split(' ').filter(w => w.length > 1));
      if (pairWords.size === 0) continue;
      let intersection = 0;
      for (const w of inputWords) { if (pairWords.has(w)) intersection++; }
      const union = new Set([...inputWords, ...pairWords]).size;
      let score = union > 0 ? intersection / union : 0;
      // Bigram boost for phrase matching
      if (inputBigrams.size > 0) {
        const pairBigrams = this._getBigrams(pairStemmed);
        let bigramOverlap = 0;
        for (const bg of inputBigrams) { if (pairBigrams.has(bg)) bigramOverlap++; }
        if (bigramOverlap > 0) score += bigramOverlap * 0.08;
      }
      // Feedback weighting in fallback too — penalize disliked pairs
      if (pair.feedbackScore) {
        if (pair.feedbackScore > 0) score *= (1 + Math.min(pair.feedbackScore * 0.04, 0.15));
        else score *= Math.max(1 + pair.feedbackScore * 0.03, 0.75);
      }
      if (score >= threshold && intersection >= minOverlap && score > bestScore) {
        bestScore = score;
        bestMatch = pair;
      }
    }
    if (bestMatch) {
      bestMatch.lastUsed = Date.now();
      bestMatch.uses = (bestMatch.uses || 0) + 1;
      if (bestMatch.responses && bestMatch.responses.length > 1) {
        const idx = Math.floor(Math.random() * bestMatch.responses.length);
        bestMatch._lastResponseIdx = idx;
        bestMatch.response = bestMatch.responses[idx];
      }
    }
    return bestMatch;
  }

  shouldReply(msg, botUserId) {
    if (!this.config.enabled) return { reply: false };
    
    const channelId = msg.channel.id;

    // Check channel restrictions
    if (this.config.ignoredChannels.includes(channelId)) return { reply: false };
    if (this.config.allowedChannels.length > 0 && !this.config.allowedChannels.includes(channelId)) {
      return { reply: false };
    }

    // Smart rate limiting (#20) — adjust reply chance based on recent feedback quality
    let replyChanceMultiplier = 1.0;
    const recentScore = this.feedback.getRecentScore(channelId);
    if (recentScore !== null) {
      // Scale: bad feedback → reply less (0.5x), good feedback → reply more (1.5x)
      replyChanceMultiplier = 0.5 + (recentScore * 1.0); // recentScore is 0-1
    }

    // Always reply if mentioned — with basic throttle to prevent spam abuse
    if (this.config.mentionAlwaysReply && msg.mentions.has(botUserId)) {
      const lastMentionReply = this._lastMentionReply?.get(msg.channel.id) || 0;
      if (Date.now() - lastMentionReply < 3000) return { reply: false }; // 3s throttle on mentions
      return { reply: true, reason: 'mention', isDirect: true };
    }

    // Always reply if someone is replying to one of the bot's messages
    if (msg.reference?.messageId) {
      const lastReply = this.lastBotReply.get(channelId);
      if (lastReply && Date.now() - lastReply.timestamp < 300000) {
        // Only if the referenced message IS the bot's reply (not a reply to any other user)
        if (lastReply.messageId && lastReply.messageId === msg.reference.messageId) {
          return { reply: true, reason: 'reply_to_bot', isDirect: true };
        }
      }
    }

    // Always reply if bot name is mentioned (word boundary match to avoid false triggers on usernames containing "bot")
    const botName = this.config.botName.toLowerCase();
    if (this.config.nameAlwaysReply && botName) {
      const escapedName = botName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const nameRegex = new RegExp(`\\b${escapedName}\\b`, 'i');
      if (nameRegex.test(msg.content)) {
        return { reply: true, reason: 'name', isDirect: true };
      }
    }

    // Follow-up detection disabled — was too aggressive / annoying

    // Cooldown check — adjust cooldown based on feedback (#20)
    const lastReply = this.lastReplyTime.get(channelId) || 0;
    let adjustedCooldown = this.config.cooldownMs * (replyChanceMultiplier < 0.8 ? 1.5 : 1.0);
    // (8D) Confidence-based cooldown reduction — if we have strong trained pairs, reply faster
    if (this.trainedPairs.size > 10) {
      let highScorePairs = 0;
      for (const pair of this.trainedPairs.values()) {
        if (pair.score >= 3 && pair.uses >= 2) highScorePairs++;
      }
      if (highScorePairs > 5) adjustedCooldown *= 0.7;
    }
    if (Date.now() - lastReply < adjustedCooldown) return { reply: false };

    // Min messages between replies
    const msgCount = this.messageCountSinceReply.get(channelId) || 0;
    if (msgCount < this.config.minMessagesBetween) return { reply: false };

    const effectiveChance = this.config.replyChance * replyChanceMultiplier;

    // Check if someone is asking a direct question/opinion (high-value reply opportunity)
    const extracted = extractSubject(msg.content);
    if (extracted && extracted.intent) {
      // Greetings directed at bot — always reply
      if (extracted.intent === 'greeting_bot') {
        return { reply: true, reason: 'greeting' };
      }
      // Info requests — boosted reply chance
      if (extracted.intent === 'asking_info') {
        const known = extracted.subjects.length > 0 && lookupKnowledge(extracted.subjects[0]);
        const learned = extracted.subjects.length > 0 && this.learnedKnowledge.has(extracted.subjects[0]);
        if ((known || learned) && Math.random() < effectiveChance * 5) {
          return { reply: true, reason: 'knowledge_answer' };
        }
      }
      // Boosted reply chance for direct questions/opinions
      if (['asking_opinion', 'comparing'].includes(extracted.intent)) {
        if (Math.random() < effectiveChance * 4) {
          return { reply: true, reason: 'direct_question' };
        }
      }
      // Small boost for sharing/recommending/complaining
      if (['sharing_experience', 'recommending', 'complaining'].includes(extracted.intent)) {
        const known = extracted.subjects.length > 0 && lookupKnowledge(extracted.subjects[0]);
        const multiplier = known ? 3 : 2;
        if (Math.random() < effectiveChance * multiplier) {
          return { reply: true, reason: 'engagement' };
        }
      }
    }

    // Pair-aware boost: if we have a strong trained pair match, reply more often
    if (this.trainedPairs && this.trainedPairs.size > 0) {
      const normMsg = this._normalizeForMatch(msg.content);
      // Exact match — highest boost
      if (this.trainedPairs.has(normMsg)) {
        if (Math.random() < effectiveChance * 6) {
          return { reply: true, reason: 'trained_pair_exact' };
        }
      } else {
        // Fuzzy check — quick inverted index scan for potential matches
        const stemmed = this._normalizeStemmed(normMsg);
        const words = stemmed.split(' ').filter(w => w.length > 1);
        let candidateCount = 0;
        for (const word of words) {
          const keys = this._pairIndex.get(word);
          if (keys) candidateCount += keys.size;
        }
        // If multiple trained pairs share words with this message, boost reply chance
        if (candidateCount >= 2 && Math.random() < effectiveChance * 4) {
          return { reply: true, reason: 'trained_pair_fuzzy' };
        }
      }
    }

    // Detect topics for decision making
    const topics = detectTopics(msg.content);
    const wordCount = msg.content.trim().split(/\s+/).length;

    // Slight boost if topic is strong (2+ keywords matched)
    if (topics && topics[0] && topics[0][1].score >= 3) {
      if (Math.random() < effectiveChance * 2) {
        return { reply: true, reason: 'strong_topic' };
      }
    }

    // Unanswered questions (#8) — if someone asked a question no one answered, jump in
    const unanswered = this.memory.getUnansweredQuestions(channelId);
    if (unanswered.length > 0 && Math.random() < 0.05) {
      return { reply: true, reason: 'unanswered_question' };
    }

    // Random chance — but only if message has substance
    if (wordCount >= 4 && Math.random() < effectiveChance) {
      if (topics && topics[0] && topics[0][1].confidence === 'high') {
        return { reply: true, reason: 'random' };
      }
      if (topics && topics[0]) {
        const recentTopics = this.memory.getRecentTopics(msg.channel.id);
        if (recentTopics.includes(topics[0][0])) {
          return { reply: true, reason: 'random_contextual' };
        }
      }
    }

    return { reply: false };
  }

  _trackDailyReply() {
    const today = new Date().toISOString().slice(0, 10);
    if (!this.stats.dailyReplies) this.stats.dailyReplies = {};
    this.stats.dailyReplies[today] = (this.stats.dailyReplies[today] || 0) + 1;
    // Keep only last 30 days
    const keys = Object.keys(this.stats.dailyReplies).sort();
    while (keys.length > 30) { delete this.stats.dailyReplies[keys.shift()]; }
  }

  // Generate the reply
  async generateReply(msg, reason, decision = {}) {
    const content = msg.content;
    const username = msg.member?.displayName || msg.author.username;
    const userId = msg.author.id;
    const topics = detectTopics(content);
    const sentiment = analyzeSentiment(content);
    const channelId = msg.channel.id;
    const recentTopics = this.memory.getRecentTopics(channelId);
    const recentMessages = this.memory.getRecentMessages(channelId, 10);
    const conversationFlow = analyzeConversationFlow(recentMessages);
    const extracted = extractSubject(content);

    // Context-aware signal extraction — used for template scoring & enrichment
    const signals = extractMessageSignals(content, topics, sentiment, extracted);

    // Pronoun/vague reference resolution — resolve "it", "that", "this" from recent context
    const vagueResolved = resolveVagueReference(content, recentMessages);
    if (vagueResolved) {
      // Inject resolved context into signals so template scoring picks up the right stuff
      if (vagueResolved.resolvedEntity && !signals.entity) {
        signals.entity = vagueResolved.resolvedEntity;
        signals.entityType = vagueResolved.resolvedType;
      }
      if (vagueResolved.sourceTopic && signals.topics.length === 0) {
        signals.topics.push({ name: vagueResolved.sourceTopic, score: 1, matched: [], confidence: 'low' });
      }
    }

    // Detect user's input style for personality matching
    const inputStyle = detectInputStyle(content);

    let reply = null;
    let usedMarkov = false;
    let topicUsed = 'fallback';
    let templateKey = 'fallback:generic';

    // Adaptive personality (#10) — match channel mood
    let activePersonality = this.config.personality;
    if (activePersonality === 'adaptive' || activePersonality === 'chill') {
      if (conversationFlow) {
        if (conversationFlow.isHype) activePersonality = 'hype';
        else if (conversationFlow.mood === 'negative') activePersonality = 'chill';
        else if (conversationFlow.mood === 'positive') activePersonality = 'hype';
        else activePersonality = 'chill';
      }
    }

    // ---- FOLLOW-UP REPLIES ----
    if (reason === 'follow_up' && decision.followUp) {
      reply = generateFollowUpReply(decision.followUp);
      if (reply) {
        reply = modifyResponse(reply, inputStyle);
        topicUsed = 'follow_up';
        this.stats.totalReplies++;
        this.stats.followUpReplies = (this.stats.followUpReplies || 0) + 1;
        this.stats.topicReplies[topicUsed] = (this.stats.topicReplies[topicUsed] || 0) + 1;
        this.stats.lastReplyAt = new Date().toISOString();
        return reply;
      }
    }

    // ---- GREETING REPLIES ----
    if (reason === 'greeting' || (extracted && extracted.intent === 'greeting_bot')) {
      // Time-aware greeting (#1)
      if (Math.random() < 0.4) {
        reply = getTimeGreeting();
      } else {
        reply = BOT_GREETINGS[Math.floor(Math.random() * BOT_GREETINGS.length)];
      }

      // Seasonal touch (#11) — occasionally add seasonal comment
      const season = getSeasonalContext();
      if (SEASONAL_COMMENTS[season] && Math.random() < 0.25) {
        const seasonJoiners = [', also ', ', oh and ', '. ', ', btw '];
        reply += seasonJoiners[Math.floor(Math.random() * seasonJoiners.length)] + this.pick(SEASONAL_COMMENTS[season]);
      }

      // Personalized greeting (#4) — recognize returning users
      const personalComment = this._getPersonalizedComment(userId);
      if (personalComment) {
        // Use natural joiners instead of always " — "
        const joiners = [', ', ' — ', ' lol ', '. ', ' btw '];
        const joiner = joiners[Math.floor(Math.random() * joiners.length)];
        reply += joiner + personalComment;
      }

      topicUsed = 'greeting';
      this.stats.totalReplies++;
      this.stats.topicReplies[topicUsed] = (this.stats.topicReplies[topicUsed] || 0) + 1;
      this.stats.lastReplyAt = new Date().toISOString();
      return reply;
    }

    // ---- STREAM FACTS / BOT FACTS ANSWERING ----
    // Answer questions about stream schedule, viewer count, facts, socials, etc.
    if (signals.isQuestion || /\b(when|schedule|viewers?|peak|socials|live|stream|next|last)\b/i.test(content)) {
      const factsResult = this.answerStreamFacts(content);
      if (factsResult) {
        reply = modifyResponse(factsResult.reply, inputStyle);
        topicUsed = 'facts';
        templateKey = factsResult.factField;
        this._finalizeReply(topicUsed, templateKey, channelId, true, reply);
        this._lastConversationContext.set(channelId, { subject: 'stream', topic: 'facts', timestamp: Date.now() });
        if (reply) reply = reply.replace(/\{user\}/g, username);
        return reply;
      }
    }

    // ---- FOLLOW-UP / CONTEXT QUERIES ----
    // Check trained pairs first — curated responses from training sessions
    const trainedMatch = this._findTrainedPairMatch(content, topics);
    if (trainedMatch) {
      trainedMatch.uses = (trainedMatch.uses || 0) + 1;
      reply = modifyResponse(trainedMatch.response, inputStyle);
      // (3B) Context combination — blend trained pair with contextual elements
      if (reply && Math.random() < 0.15 && topics?.[0]) {
        const topicName = topics[0][0];
        const recentCtx = recentMessages.length > 3 ? `, chat's been talking about ${topicName}` : '';
        if (recentCtx && !reply.toLowerCase().includes(topicName)) {
          reply += recentCtx;
        }
      }
      topicUsed = 'trained_pair';
      templateKey = `trained:${this._normalizeForMatch(content).substring(0, 40)}`;
      this._finalizeReply(topicUsed, templateKey, channelId, false, reply);
      this.learningLog.log('trained_pair', `Used trained response for: "${content.substring(0, 60)}"`);
      if (reply) reply = reply.replace(/\{user\}/g, username);
      return reply;
    }

    // "tell me more", "more info", "expand on that", "what else" — uses last conversation context
    const followUpPattern = /\b(tell me more|more info|more about that|expand on that|what else|go on|elaborate|more details|can you explain|explain more|more on that|keep going|and then|what about it|give me more|any more info|more please|continue)\b/i;
    if (followUpPattern.test(content)) {
      const ctx = this._lastConversationContext.get(channelId);
      if (ctx && Date.now() - ctx.timestamp < 300000) { // within 5 min
        // Try to get more info on the same subject
        if (ctx.subject) {
          // Try knowledge base
          const knowledgeReply = answerWithKnowledge(ctx.subject, 'asking_info');
          if (knowledgeReply) {
            this.stats.totalReplies++;
            this.stats.topicReplies['knowledge'] = (this.stats.topicReplies['knowledge'] || 0) + 1;
            this.stats.lastReplyAt = new Date().toISOString();
            return knowledgeReply;
          }
          // Try learned knowledge
          const learnedReply = this.learnedKnowledge.getOpinion(ctx.subject);
          if (learnedReply) {
            this.stats.totalReplies++;
            this.stats.topicReplies['learned_knowledge'] = (this.stats.topicReplies['learned_knowledge'] || 0) + 1;
            this.stats.lastReplyAt = new Date().toISOString();
            return learnedReply;
          }
        }
        const followUpResponses = [
          `Thats about all I know on ${ctx.subject || 'that'} tbh`,
          `I dont have much more on ${ctx.subject || 'that topic'} but if anyone else knows feel free to add`,
          `Hmm thats pretty much what I got on ${ctx.subject || 'that'}, anyone else have more info?`,
          `Wish I had more on ${ctx.subject || 'this'} but thats what I know so far`,
        ];
        this.stats.totalReplies++;
        this.stats.lastReplyAt = new Date().toISOString();
        return followUpResponses[Math.floor(Math.random() * followUpResponses.length)];
      }
    }

    // ---- SENSITIVE TOPIC GATE ----
    // Intercept messages about death, loss, grief, serious hardship BEFORE the knowledge/opinion
    // engine can produce tone-deaf responses like pet templates for "my pet passed away"
    const sensitivePatterns = /\b(?:passed away|died|death|funeral|cancer|diagnosed|rip\b.*(?:pet|cat|dog|mom|dad|friend|brother|sister)|lost my|lost a|passed on|gone forever|in the hospital|suicide|kill myself)\b/i;
    const sensitiveKeywords = /\b(?:passed away|died|passing|grief|grieving|mourning)\b/i;
    if (sensitivePatterns.test(content) || (sensitiveKeywords.test(content) && sentiment === 'negative')) {
      const sensitiveResponses = [
        'Im really sorry to hear that 🫂',
        'Thats really tough, Im sorry',
        'Sending you all the love right now ❤️',
        'Im so sorry, thats heartbreaking',
        'I dont even know what to say, just know were here for you',
        'Thats awful, Im truly sorry',
        'Take all the time you need, were here',
        'My heart goes out to you honestly',
        'Thats so hard, Im sorry youre going through this',
        'No words can fix that but just know people care about you',
      ];
      reply = sensitiveResponses[Math.floor(Math.random() * sensitiveResponses.length)];
      topicUsed = 'sensitive';
      templateKey = 'sensitive:empathy';
      this._finalizeReply(topicUsed, templateKey, channelId, false, reply);
      return reply;
    }

    // ---- PERSONAL ACHIEVEMENT/CELEBRATION GATE ----
    // Catch personal wins before topic templates can mishandle them
    // (e.g. "got promoted at work" → sarcastic work templates, "dream school" → sleep templates)
    const celebrationPattern = /\b(?:got promoted|promotion|got accepted|accepted into|got the job|got hired|new job|graduated|passed (?:my|the) (?:exam|test|finals)|won (?:a |the )?(?:tournament|competition|award|prize|match|game)|got engaged|getting married|having a baby|new house|moved in|first car|license|certified|published|accomplished)\b/i;
    // Skip celebration if the message is primarily about gaming (e.g. "won a tournament in Valorant")
    const gamingContextPattern = /\b(?:valorant|fortnite|league|apex|overwatch|minecraft|csgo|cs2|dota|cod|warzone|pubg|rocket league|smash|elden ring|genshin|ranked|elo|mmr|scrims|esports|e-sports)\b/i;
    const isCelebInGamingCtx = celebrationPattern.test(content) && gamingContextPattern.test(content);
    if (celebrationPattern.test(content) && sentiment !== 'negative' && !isCelebInGamingCtx) {
      const celebrationResponses = [
        'LETS GOOO thats amazing congrats!! 🎉',
        'No way thats huge!! Congrats fr fr 🔥',
        'W after W you deserve this honestly',
        'Thats such a big deal congrats!! 🥳',
        'The hard work paid off lets go!!',
        'Chat we need to celebrate this 🎉',
        'Massive W congrats!! You earned it',
        'Thats incredible actually, so happy for you',
        'The comeback story is real, congrats!!',
        'You dropped this 👑 congrats!!',
        'Achievement unlocked fr, thats awesome',
        'This is the kind of news chat needed today 🙌',
      ];
      reply = celebrationResponses[Math.floor(Math.random() * celebrationResponses.length)];
      topicUsed = 'celebration';
      templateKey = 'celebration:achievement';
      this._finalizeReply(topicUsed, templateKey, channelId, false, reply);
      return reply;
    }

    // ---- SLANG REACTION HANDLER ----
    // Short slang messages ("W take", "bruh", "sheesh", "same", "gg", etc.) get natural mirror responses
    const slangReply = matchSlangReaction(content);
    if (slangReply && !reply) {
      reply = slangReply;
      topicUsed = 'slang_reaction';
      templateKey = `slang:${reply.substring(0, 30)}`;
      this._finalizeReply(topicUsed, templateKey, channelId, false, reply);
      return reply;
    }

    // ---- SARCASM DETECTION ----
    // "oh yeah thats totally how that works" → respond with matching sarcasm
    if (detectSarcasm(content)) {
      reply = SARCASM_RESPONSES[Math.floor(Math.random() * SARCASM_RESPONSES.length)];
      topicUsed = 'sarcasm';
      templateKey = `sarcasm:${reply.substring(0, 30)}`;
      this._finalizeReply(topicUsed, templateKey, channelId, false, reply);
      return reply;
    }

    // ---- WITTY BYSTANDER MODE ----
    // For ALL non-direct triggers, always use witty bystander replies.
    // Keeps the bot fun/casual when not pinged — no off-topic knowledge dumps.
    const isDirect = reason === 'mention' || reason === 'name' || reason === 'reply_to_bot';
    if (!isDirect && reason !== 'greeting' && reason !== 'follow_up') {
      // Try trained pair fallback before falling back to witty bystander
      const bystanderPairMatch = this._findTrainedPairFallback(content);
      if (bystanderPairMatch) {
        bystanderPairMatch.uses = (bystanderPairMatch.uses || 0) + 1;
        reply = modifyResponse(bystanderPairMatch.response, inputStyle);
        topicUsed = 'trained_pair';
        templateKey = `trained:bystander:${this._normalizeForMatch(content).substring(0, 30)}`;
        this._finalizeReply(topicUsed, templateKey, channelId, false, reply);
        if (reply) reply = reply.replace(/\{user\}/g, username);
        return reply;
      }
      reply = generateWittyBystander(content, sentiment);
      if (reply) {
        topicUsed = 'witty_bystander';
        templateKey = `witty:${reply.substring(0, 30)}`;
        this._finalizeReply(topicUsed, templateKey, channelId, false, reply);
        return reply;
      }
    }

    // ---- STORY / ANECDOTE ENGAGEMENT ----
    // Long personal stories get a reaction to the content, not a random topic template
    const storyReply = engageWithStory(content);
    if (storyReply) {
      reply = storyReply;
      topicUsed = 'story';
      templateKey = `story:${reply.substring(0, 30)}`;
      this._finalizeReply(topicUsed, templateKey, channelId, false, reply);
      return reply;
    }

    // ---- GENERIC QUESTION → KB RECOMMENDATION ----
    // "whats the best game rn?" → recommend a real game from KB
    if (signals.isQuestion) {
      const genericAnswer = answerGenericQuestion(content);
      if (genericAnswer) {
        reply = modifyResponse(genericAnswer, inputStyle);
        topicUsed = 'recommendation';
        templateKey = `recommend:${reply.substring(0, 30)}`;
        this._finalizeReply(topicUsed, templateKey, channelId, true, reply);
        if (reply) reply = reply.replace(/\{user\}/g, username);
        return reply;
      }
    }

    // ---- CHECK IF BOT JUST ASKED ABOUT THIS SUBJECT ----
    // Prevents the "I don't know about X" → user explains → "I can vouch for X" contradiction
    const justAskedAbout = this._lastAskedAbout && 
      Date.now() - this._lastAskedAbout.timestamp < 120000; // within 2 min
    const isTeachingBot = justAskedAbout && extracted?.subjects?.[0] && 
      extracted.subjects[0].toLowerCase().includes(this._lastAskedAbout.subject);
    if (isTeachingBot) {
      // User is teaching the bot about something it asked about — respond as a learner, not an expert
      const learnResponses = [
        `Oh ok so thats what ${extracted.subjects[0]} is about, thanks for explaining!`,
        `Ahh I see, ${extracted.subjects[0]} sounds interesting now that you explain it`,
        `Ohhh ok that makes sense now, appreciate the info on ${extracted.subjects[0]}`,
        `Good to know! ${extracted.subjects[0]} sounds pretty cool from what you said`,
        `Oh nice thanks for filling me in on ${extracted.subjects[0]}, I get it now`,
        `Ahhh ok I was wondering about ${extracted.subjects[0]}, that clears things up`,
        `Oh word? Thats actually cool, thanks for the ${extracted.subjects[0]} breakdown`,
        `Now I know! ${extracted.subjects[0]} sounds like something Id check out`,
      ];
      reply = learnResponses[Math.floor(Math.random() * learnResponses.length)];
      this._lastAskedAbout = null; // Clear so it doesn't keep triggering
      topicUsed = 'learning';
      templateKey = 'learning:taught';
      this._finalizeReply(topicUsed, templateKey, channelId, false, reply);
      return reply;
    }

    // ---- KNOWLEDGE-BASED REPLY ENGINE (enhanced with #2 #11 #12) ----
    if (extracted && extracted.intent && extracted.subjects.length > 0) {
      // For comparisons, try knowledge-aware comparison first
      if (extracted.intent === 'comparing' && extracted.subjects.length >= 2) {
        const comparisonReply = answerComparison(extracted.subjects[0], extracted.subjects[1]);
        if (comparisonReply) {
          reply = modifyResponse(comparisonReply, inputStyle);
          topicUsed = 'knowledge';
          templateKey = `knowledge:comparison`;
          this._finalizeReply(topicUsed, templateKey, channelId, true, reply);
          if (reply) reply = reply.replace(/\{user\}/g, username);
          return reply;
        }
      }

      // Try built-in knowledge first
      const knowledgeReply = answerWithKnowledge(extracted.subjects[0], extracted.intent, sentiment);
      if (knowledgeReply) {
        reply = enrichWithContext(modifyResponse(knowledgeReply, inputStyle), signals);
        topicUsed = 'knowledge';
        templateKey = `knowledge:${extracted.subjects[0].substring(0, 30)}`;
        this._finalizeReply(topicUsed, templateKey, channelId, true, reply);
        if (reply) reply = reply.replace(/\{user\}/g, username);
        return reply;
      }

      // Try learned knowledge (#2) — auto-learned subjects from chat
      const learnedReply = this.learnedKnowledge.getOpinion(extracted.subjects[0]);
      if (learnedReply) {
        reply = modifyResponse(learnedReply, inputStyle);
        topicUsed = 'learned_knowledge';
        templateKey = `learned:${extracted.subjects[0].substring(0, 30)}`;
        this._finalizeReply(topicUsed, templateKey, channelId, true, reply);
        this.learningLog.log('used_learned', `Used learned knowledge about "${extracted.subjects[0]}"`);
        if (reply) reply = reply.replace(/\{user\}/g, username);
        return reply;
      }

      // Subject confidence system (#11) — if we don't know, ask instead of guessing
      if (extracted.intent === 'asking_opinion' || extracted.intent === 'asking_info') {
        const known = lookupKnowledge(extracted.subjects[0]);
        const learned = this.learnedKnowledge.has(extracted.subjects[0]);
        if (!known && !learned) {
          // Check if the subject looks like a real entity vs a generic phrase
          // "the best game right now" or "you guys watching" are NOT entities
          const subj = extracted.subjects[0];
          const isGenericPhrase = /^(?:the |a |an |my |your |you |we |they |it |this |that |some )/.test(subj)
            || subj.split(/\s+/).length > 4
            || /\b(?:best|worst|good|favorite|right now|these days|lately|anyone|guys|everyone)\b/i.test(subj);
          if (isGenericPhrase) {
            // Skip the low-confidence "what is X" response — let it fall through to topic templates
            // which will give a much more natural response
          } else {
          // Low confidence — ask chat
          const lowConfidenceResponses = [
            `hmm I dont know much about ${subj} yet tbh, anyone here know?`,
            `${subj}? thats new to me, whats the deal with it?`,
            `not gonna pretend I know about ${subj}, what do you think of it?`,
            `I havent heard much about ${subj} from chat yet, whats the vibe?`,
            `oh ${subj}, im still learning about that one, whats your take?`,
            `${subj} huh? first time hearing about it, is it good?`,
            `wait what is ${subj}? sounds interesting`,
            `cant say I know about ${subj} but im curious now`,
            `idk enough about ${subj} to have an opinion yet ngl`,
            `${subj} is a new one for me, what are peoples thoughts`,
          ];
          // Track that we asked about this subject so we don't "vouch" for it immediately after
          this._lastAskedAbout = { subject: subj.toLowerCase(), timestamp: Date.now() };
          // Find an expert: user who talked about this subject the most
          let expert = null;
          for (const [uid, prefs] of this.userPreferences) {
            const subjectCount = prefs.subjects?.[subj.toLowerCase()] || 0;
            if (subjectCount >= 3 && (!expert || subjectCount > expert.count)) {
              expert = { userId: uid, count: subjectCount };
            }
          }
          if (expert && Math.random() < 0.3) {
            reply = `I dont know much about ${extracted.subjects[0]} but <@${expert.userId}> talks about this stuff a lot, maybe they know`;
          } else {
            reply = lowConfidenceResponses[Math.floor(Math.random() * lowConfidenceResponses.length)];
          }
          reply = modifyResponse(reply, inputStyle);
          topicUsed = 'low_confidence';
          templateKey = 'low_confidence:question';
          this._finalizeReply(topicUsed, templateKey, channelId, false, reply);
          return reply;
          } // end isGenericPhrase else
        }
      }

      // Fall back to generic opinion engine (for unknown subjects)
      const contextualReply = composeContextualReply(
        extracted, extracted.intent, sentiment,
        topics ? topics[0]?.[0] : null, conversationFlow
      );
      if (contextualReply) {
        reply = enrichWithContext(modifyResponse(contextualReply, inputStyle), signals);
        topicUsed = topics ? (topics[0]?.[0] || 'opinion') : 'opinion';
        templateKey = `opinion:${extracted.intent}`;
        this._finalizeReply(topicUsed, templateKey, channelId, false, reply);
        if (reply) reply = reply.replace(/\{user\}/g, username);
        return reply;
      }
    }

    // ---- DIRECT MESSAGE HANDLING ----
    // When someone pings the bot or replies to it, respond TO their message, not as a bystander
    if (reason === 'mention' || reason === 'name' || reason === 'reply_to_bot') {
      const lower = content.toLowerCase();
      // Check for summary requests first
      if (/what did i miss|what happened|catch me up|what's going on|whats going on|recap|summary|tldr/.test(lower)) {
        // Rule-based summary
        const catchUp = this._generateCatchUpSummary(channelId);
        if (catchUp) {
          reply = catchUp;
          topicUsed = 'summary';
          this._finalizeReply(topicUsed, 'summary:catchup', channelId, false, reply);
          return reply;
        }
        const summaryText = this.memory.generateSummaryText(channelId);
        if (summaryText) {
          reply = summaryText;
          topicUsed = 'summary';
          this._finalizeReply(topicUsed, 'summary:catchup', channelId, false, reply);
          return reply;
        }
      }
      // For direct messages to the bot, prioritize conversational response
      // The reply should address what the user said, not make a statement about a general topic
      // We already have an info answer, knowledge, and opinion path above.
      // If we reach here with no reply yet, use direct-response fallback
      if (!reply && extracted?.subjects?.length > 0) {
        const subj = extracted.subjects[0];
        const directResponses = [
          `Hmm good question about ${subj}, I'd have to think about that one`,
          `${subj}? Thats interesting, what makes you ask?`,
          `Oh youre asking about ${subj}? I dont have a strong take on that yet tbh`,
          `${subj} huh, Im curious what made you think of that`,
          `Ahh ${subj}, that's a topic I'd need to hear more about from chat`,
          `Not sure I have the best answer on ${subj} but Im interested in what you think`,
        ];
        reply = directResponses[Math.floor(Math.random() * directResponses.length)];
        topicUsed = 'direct_response';
        templateKey = 'direct:addressed';
        this._finalizeReply(topicUsed, templateKey, channelId, false, reply);
        return reply;
      }
      if (!reply) {
        // No subject extracted — use ping fallbacks
        const lower = content.toLowerCase().replace(/<@!?\d+>/g, '').trim();
        const hasQuestion = /\?|\bwhat|\bhow|\bwhy|\bwho|\bwhen|\bwhere|\bwhich|\bcan you|\bdo you|\btell me/.test(lower);
        const chattyFiller = lower.replace(/[^a-z\s]/g, '').trim();
        const pingResponses = hasQuestion ? [
          'hmm thats a good question but ngl im not sure, anyone else know?',
          'I wish I had a good answer for that one tbh, maybe someone in chat knows?',
          'thats actually something I dont have a take on yet, what does everyone else think?',
          'ooh thats a tough one to answer off the top of my head honestly',
          'ngl I dont wanna give you bad info on that one, lets see if anyone else knows',
          'hmm I genuinely dont know enough about that to give a good answer rn',
          'solid question but im drawing a blank ngl, chat help me out here',
        ] : (chattyFiller.length < 6) ? [
          'yo whats good',
          'heyyy',
          'yoo whats up',
          'sup sup',
          'ayyy',
          'hello hello',
          'whatcha up to',
        ] : [
          'haha honestly not sure what to say to that one',
          'lmaooo fair enough',
          'ngl thats a vibe',
          'I felt that honestly',
          'real talk tho',
          'ok thats valid',
          'cant argue with that tbh',
          'mood honestly',
        ];
        reply = pingResponses[Math.floor(Math.random() * pingResponses.length)];
        topicUsed = 'direct_ping';
        templateKey = 'direct:ping';
        this._finalizeReply(topicUsed, templateKey, channelId, false, reply);
        return reply;
      }
    }

    // ---- CONVERSATION FLOW AWARENESS ----
    if (conversationFlow) {
      if (conversationFlow.isHype && Math.random() < 0.6) {
        const hypeResponses = [
          'THE ENERGY IN HERE IS INSANE 🔥🔥',
          'LETS GOOOOO',
          'Chat is actually going off rn',
          'The vibe is immaculate rn fr fr',
          'YOOO this chat is electric ⚡',
          'I love this energy honestly',
          'Everyone is going crazy rn and I am HERE for it',
          'Chat is ELITE today no cap',
          'ok chat is being legendary rn',
          'this is why I love this server',
          'the energy rn is unmatched',
          'yall are going CRAZY and I am living for it',
          'bro the vibes in here rn',
          'chat is on another level today fr',
          'I cant even keep up with how hype this is',
          'this goes so hard actually',
        ];
        reply = hypeResponses[Math.floor(Math.random() * hypeResponses.length)];
        topicUsed = 'hype_flow';
        this._finalizeReply(topicUsed, 'hype_flow:generic', channelId, false, reply);
        return reply;
      }

    }

    // Use conversation context to boost topic detection
    let contextBoost = null;
    if (recentTopics.length > 0) {
      contextBoost = recentTopics[0];
    }

    // Determine primary topic
    let primaryTopic = null;
    let subCategory = 'generic';

    if (topics && topics.length > 0) {
      const topEntry = topics[0];
      if (topEntry[1].confidence === 'low' && contextBoost) {
        const contextMatch = topics.find(([t]) => t === contextBoost);
        if (contextMatch) {
          primaryTopic = contextBoost;
          topicUsed = contextBoost;
        } else {
          primaryTopic = topEntry[0];
          topicUsed = topEntry[0];
        }
      } else {
        primaryTopic = topEntry[0];
        topicUsed = primaryTopic;
      }

      // Detect sub-categories for gaming
      if (primaryTopic === 'gaming') {
        const topicEntry = topics.find(([t]) => t === 'gaming');
        const matched = topicEntry ? topicEntry[1].matched : [];
        if (matched.some(w => ['boss', 'dungeon', 'raid'].includes(w))) subCategory = 'boss';
        else if (matched.some(w => ['ranked', 'rank', 'elo', 'mmr', 'competitive'].includes(w))) subCategory = 'competitive';
        else if (matched.some(w => ['clutch', 'ace', 'pentakill', 'carry', 'headshot', 'gg', 'well played'].includes(w))) subCategory = 'achievement';
        else if (matched.some(w => ['fail', 'rip', 'unlucky', 'pain'].includes(w))) subCategory = 'fail';
      }

      // Detect sub-categories for greeting
      if (primaryTopic === 'greeting') {
        const lower = content.toLowerCase();
        if (['bye', 'goodbye', 'cya', 'see ya', 'later', 'peace', 'gtg', 'gn', 'goodnight'].some(w => lower.includes(w))) {
          subCategory = 'goodbye';
        } else if (['wb', 'welcome back', 'im back', 'i\'m back', 'back'].some(w => lower.includes(w))) {
          subCategory = 'welcome_back';
        } else {
          subCategory = 'hello';
        }
      }

      // Detect hype for stream
      if (primaryTopic === 'stream') {
        const lower = content.toLowerCase();
        if (['hype', 'hyped', 'lets go', 'let\'s go', 'live', 'going live', 'raid'].some(w => lower.includes(w))) {
          subCategory = 'hype';
        }
      }

      // Detect sub-categories for music
      if (primaryTopic === 'music') {
        const lower = content.toLowerCase();
        if (['concert', 'show', 'live', 'festival', 'tour', 'tickets'].some(w => lower.includes(w))) subCategory = 'live';
        else if (['throwback', 'classic', 'nostalgic', 'remember', 'old school', 'back in the day'].some(w => lower.includes(w))) subCategory = 'nostalgia';
        else if (['recommend', 'suggestions', 'discover', 'new music', 'whats good', 'any recs'].some(w => lower.includes(w))) subCategory = 'discovery';
      }

      // Detect sub-categories for food
      if (primaryTopic === 'food') {
        const lower = content.toLowerCase();
        if (['midnight', 'late night', '3am', '2am', 'snack'].some(w => lower.includes(w))) subCategory = 'late_night';
        else if (['cook', 'cooking', 'recipe', 'homemade', 'made', 'making'].some(w => lower.includes(w))) subCategory = 'cooking';
        else if (['craving', 'hungry', 'starving', 'need food', 'want food', 'could go for'].some(w => lower.includes(w))) subCategory = 'craving';
      }

      // Detect sub-categories for tech
      if (primaryTopic === 'tech') {
        const lower = content.toLowerCase();
        if (['setup', 'desk', 'monitor', 'keyboard', 'mouse', 'rgb', 'build'].some(w => lower.includes(w))) subCategory = 'setup';
        else if (['upgrade', 'new', 'bought', 'getting', 'switching'].some(w => lower.includes(w))) subCategory = 'upgrade';
        else if (['broken', 'fix', 'crash', 'bug', 'lag', 'slow', 'issue', 'help'].some(w => lower.includes(w))) subCategory = 'troubleshoot';
      }

      // Detect sub-categories for sleep
      if (primaryTopic === 'sleep') {
        const lower = content.toLowerCase();
        if (['cant sleep', 'insomnia', 'awake', 'still up', 'wide awake'].some(w => lower.includes(w))) subCategory = 'insomnia';
        else if (['tired', 'exhausted', 'need sleep', 'sleepy', 'so tired'].some(w => lower.includes(w))) subCategory = 'exhausted';
        else if (['nap', 'napping', 'power nap'].some(w => lower.includes(w))) subCategory = 'nap';
      }

      // Detect sub-categories for school_work
      if (primaryTopic === 'school_work') {
        const lower = content.toLowerCase();
        if (['procrastinat', 'cant focus', 'distracted', 'later'].some(w => lower.includes(w))) subCategory = 'procrastination';
        else if (['exam', 'test', 'finals', 'midterm', 'studying'].some(w => lower.includes(w))) subCategory = 'exam';
        else if (['done', 'finished', 'finally', 'completed', 'turned in'].some(w => lower.includes(w))) subCategory = 'done';
      }

      // Detect sub-categories for idleon
      if (primaryTopic === 'idleon') {
        const lower = content.toLowerCase();
        if (['class', 'maestro', 'journeyman', 'barbarian', 'squire', 'bowman', 'hunter', 'wizard', 'shaman', 'divine knight', 'beast master', 'blood berserker', 'bubonic conjuror', 'elemental sorcerer', 'voidwalker', 'savage', 'royal guardian', 'siege breaker', 'subclass', 'elite class'].some(w => lower.includes(w))) subCategory = 'class';
        else if (['tip', 'tips', 'help', 'guide', 'how to', 'advice', 'recommend', 'what should'].some(w => lower.includes(w))) subCategory = 'tips';
        else if (['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'world', 'progress', 'unlock', 'pushed', 'pushing', 'advance', 'stuck'].some(w => lower.includes(w))) subCategory = 'progress';
      }
    }

    // Try Markov generation with confidence threshold (#18)
    const hasStrongTopic = topics && topics[0] && topics[0][1].confidence === 'high';
    if (hasStrongTopic && this.markov.totalTrained > 100 && Math.random() < this.config.markovChance) {
      const seedWords = topics[0][1].matched.slice(0, 3);
      const markovReply = this.markov.generate(15, seedWords, primaryTopic);
      // Confidence threshold (#18): stricter validation
      if (markovReply && markovReply.length > 10 && markovReply.length < this.config.maxResponseLength) {
        const markovLower = markovReply.toLowerCase();
        const relevantWordCount = seedWords.filter(w => markovLower.includes(w.toLowerCase())).length;
        const markovWords = markovReply.split(/\s+/);
        const hasGoodLength = markovWords.length >= 4 && markovWords.length <= 25;
        // Anti-echo: reject if reply just parrots the user's message
        const isEcho = isEchoReply(markovReply, content);
        // Must have at least 1 relevant word AND good length AND not echo (#18)
        if (relevantWordCount >= 1 && hasGoodLength && !isEcho) {
          reply = markovReply;
          usedMarkov = true;
          templateKey = `markov:${primaryTopic}`;
        }
      }
    }

    // If Markov didn't work, use context-aware template selection + enrichment
    if (!reply) {
      if (primaryTopic === 'mood_positive' || (sentiment === 'positive' && (!primaryTopic || primaryTopic === 'mood_positive'))) {
        const pool = this.feedback.filterPool(TEMPLATES.mood_positive.responses, 'mood_positive');
        reply = contextAwarePick(pool, signals, null);
        templateKey = `mood_positive:${reply?.substring(0, 40)}`;
      } else if (primaryTopic === 'mood_negative' || (sentiment === 'negative' && (!primaryTopic || primaryTopic === 'mood_negative'))) {
        const pool = this.feedback.filterPool(TEMPLATES.mood_negative.responses, 'mood_negative');
        reply = contextAwarePick(pool, signals, null);
        templateKey = `mood_negative:${reply?.substring(0, 40)}`;
      } else if (primaryTopic && TEMPLATES[primaryTopic]) {
        const topicTemplates = TEMPLATES[primaryTopic];
        let pool;
        if (topicTemplates[subCategory]) {
          pool = this.feedback.filterPool(topicTemplates[subCategory], `${primaryTopic}:${subCategory}`);
        } else if (topicTemplates.generic) {
          pool = this.feedback.filterPool(topicTemplates.generic, `${primaryTopic}:generic`);
        } else if (topicTemplates.responses) {
          pool = this.feedback.filterPool(topicTemplates.responses, `${primaryTopic}:responses`);
        } else {
          pool = TEMPLATES.fallback;
        }
        reply = contextAwarePick(pool, signals, null);
        templateKey = `${primaryTopic}:${reply?.substring(0, 40)}`;
      } else {
        // No topic detected — use fallback templates instead of borrowing from recent topic
        // This prevents off-topic replies like saying "that game is good" when talking about pigeons
        if (reason === 'random' || reason === 'random_contextual') {
          return null; // Don't reply with random fallback on random triggers
        }
        // Only use recent topic context if the message content actually relates to it
        if (recentTopics.length > 0 && TEMPLATES[recentTopics[0]]) {
          const recentTopic = recentTopics[0];
          // Verify the message has at least some connection to the recent topic
          const recentTopicEntry = TOPICS[recentTopic];
          const lower = content.toLowerCase();
          const hasConnection = recentTopicEntry?.keywords?.some(kw => {
            if (kw.length <= 3) {
              return new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(lower);
            }
            return lower.includes(kw);
          });
          if (hasConnection) {
            const rt = TEMPLATES[recentTopic];
            const pool = rt.generic || rt.responses || TEMPLATES.fallback;
            reply = contextAwarePick(this.feedback.filterPool(pool, recentTopic), signals, null);
            topicUsed = recentTopic;
            templateKey = `${recentTopic}:contextual`;
          } else {
            // Message has no connection to recent topic — use generic fallback
            reply = contextAwarePick(TEMPLATES.fallback, signals, null);
            templateKey = `fallback:${reply?.substring(0, 40)}`;
          }
        } else {
          reply = contextAwarePick(TEMPLATES.fallback, signals, null);
          templateKey = `fallback:${reply?.substring(0, 40)}`;
        }
      }
    }

    // (3A) Trained pair fallback — looser match before generic safety net
    if (!reply) {
      const fallbackPair = this._findTrainedPairFallback(content);
      if (fallbackPair) {
        fallbackPair.uses = (fallbackPair.uses || 0) + 1;
        reply = modifyResponse(fallbackPair.response, inputStyle);
        topicUsed = 'trained_pair_fallback';
        templateKey = `trained_fallback:${this._normalizeForMatch(content).substring(0, 40)}`;
        this._finalizeReply(topicUsed, templateKey, channelId, false, reply);
        this.learningLog.log('trained_pair_fallback', `Used fallback trained response for: "${content.substring(0, 60)}"`);
        if (reply) reply = reply.replace(/\{user\}/g, username);
        return reply;
      }
    }

    // Ultimate safety net: if all tiers returned null, pick a random fallback
    // This prevents the bot from going silent when it decided to reply
    if (!reply) {
      reply = TEMPLATES.fallback[Math.floor(Math.random() * TEMPLATES.fallback.length)];
      templateKey = `fallback:safety_net`;
    }

    // Apply response modifiers (prefix/suffix variation)
    if (reply && !usedMarkov) {
      reply = modifyResponse(reply, inputStyle);
    }

    // Sentiment-safe prefix sanitization — remove "Lmao"/"Lol"/"Sheesh" from sad/empathetic messages
    // Also catches mood_negative topic even if sentiment analyzer says neutral
    const isSadContext = sentiment === 'negative'
      || primaryTopic === 'mood_negative'
      || /\b(?:worst|alone|lonely|depressed|anxious|stressed|struggling|awful|terrible|miserable|cry|crying|hurts|painful|broken|lost)\b/i.test(content);
    if (reply && isSadContext) {
      reply = sanitizePrefixForSentiment(reply, 'negative');
    }

    // Emotional response dedup — avoid repeating the same emotional template
    if (reply && (primaryTopic === 'mood_positive' || primaryTopic === 'mood_negative')) {
      const replyLower = reply.toLowerCase().trim();
      if (this.recentEmotionalReplies.some(r => r === replyLower)) {
        // Already used this one recently — try to pick a different one
        const pool = primaryTopic === 'mood_positive'
          ? TEMPLATES.mood_positive.responses
          : TEMPLATES.mood_negative.responses;
        const filtered = pool.filter(t => !this.recentEmotionalReplies.includes(t.toLowerCase().trim()));
        if (filtered.length > 0) {
          reply = modifyResponse(filtered[Math.floor(Math.random() * filtered.length)], inputStyle);
          if (sentiment === 'negative') reply = sanitizePrefixForSentiment(reply, sentiment);
        }
      }
      this.recentEmotionalReplies.push(replyLower);
      if (this.recentEmotionalReplies.length > 15) this.recentEmotionalReplies.shift();
    }

    // Variable substitution
    if (reply) {
      reply = reply.replace(/\{user\}/g, username);
    }

    // Varied response formats (#16) — sometimes use different formats
    if (reply && Math.random() < 0.12) {
      reply = this._applyVariedFormat(reply, primaryTopic, extracted);
    }

    // Add server expressions/slang occasionally (#17)
    if (reply && Math.random() < 0.08) {
      const popular = this.slangTracker.getPopular();
      if (popular.length > 0) {
        const expr = popular[Math.floor(Math.random() * popular.length)];
        // Only add if it fits naturally
        if (expr.phrase.length < 20) {
          reply += ` (${expr.phrase})`;
        }
      }
    }

    // Personalization touch (#4) — occasionally reference user's known interests
    if (reply && Math.random() < 0.1) {
      const personalNote = this._getPersonalizedComment(userId, primaryTopic);
      if (personalNote) {
        const joiners = [', ', ' — ', ' lol ', ' btw '];
        reply += joiners[Math.floor(Math.random() * joiners.length)] + personalNote;
      }
    }

    // Smart emoji insertion (#7) — add contextual emoji based on topic/sentiment
    if (reply && Math.random() < 0.2) {
      const emojiPool = primaryTopic && TOPIC_EMOJIS[primaryTopic]
        ? TOPIC_EMOJIS[primaryTopic]
        : SENTIMENT_EMOJIS[sentiment] || [];
      if (emojiPool.length > 0) {
        const emoji = emojiPool[Math.floor(Math.random() * emojiPool.length)];
        // Add at end, only if no emoji already present
        if (!/[\u{1F300}-\u{1FAFF}]/u.test(reply.slice(-5))) {
          reply += ` ${emoji}`;
        }
      }
    }

    // Level-aware comment — occasionally reference user's level if we have leveling data
    if (reply && this.levelingData && Math.random() < 0.06) {
      const userLevel = this.levelingData[userId];
      if (userLevel && userLevel.level >= 5) {
        const lvl = userLevel.level;
        const levelComments = [
          `, you're level ${lvl} you'd know about this`,
          ` — level ${lvl} energy right there`,
          `, spoken like a true level ${lvl}`,
          ` (respect to the level ${lvl})`,
        ];
        // Only add if reply isn't already too long
        if (reply.length < 120) {
          reply += levelComments[Math.floor(Math.random() * levelComments.length)];
        }
      }
    }

    // Stream-aware context — when the stream is live, occasionally reference the current game
    if (reply && this.knowledge.isLive && this.knowledge.currentGame && Math.random() < 0.08) {
      const game = this.knowledge.currentGame;
      const streamComments = [
        `, ngl ${game} stream is going crazy rn`,
        ` — meanwhile ${game} on stream is fire`,
        `, speaking of vibes the ${game} stream tho`,
        ` (${game} stream enjoyers rise up)`,
      ];
      if (reply.length < 120 && !reply.toLowerCase().includes(game.toLowerCase())) {
        reply += streamComments[Math.floor(Math.random() * streamComments.length)];
      }
    }

    // Stream history reference — very rarely reference a past stream naturally
    if (reply && this.streamHistory && this.streamHistory.length > 0 && Math.random() < 0.03) {
      const pastStream = this.streamHistory[Math.floor(Math.random() * this.streamHistory.length)];
      if (pastStream && pastStream.game) {
        const historyRefs = [
          `remember the ${pastStream.game} stream? that was wild`,
          `ngl the ${pastStream.game} streams always hit different`,
          `gives me ${pastStream.game} stream vibes`,
          `ever since that ${pastStream.game} stream things have been different`,
        ];
        if (reply.length < 100) {
          reply += ', ' + historyRefs[Math.floor(Math.random() * historyRefs.length)];
        }
      }
    }

    // Time-aware comments (#1) — occasionally add time-relevant context
    if (reply && Math.random() < 0.05) {
      const timeCtx = getTimeContext();
      if (timeCtx.timeOfDay === 'night' && Math.random() < 0.5) {
        const nightPhrases = ['late night energy', 'we up late', 'insomnia hours', '3am vibes', 'sleep is overrated'];
        reply += ', ' + nightPhrases[Math.floor(Math.random() * nightPhrases.length)];
      } else if (timeCtx.isWeekend && Math.random() < 0.3) {
        const weekendPhrases = ['weekend vibes', 'weekend mode activated', 'no responsibilities energy', 'weekend hits different'];
        reply += ', ' + weekendPhrases[Math.floor(Math.random() * weekendPhrases.length)];
      } else if (timeCtx.dayName === 'Monday' && Math.random() < 0.2) {
        reply += ', why is it monday again';
      } else if (timeCtx.dayName === 'Friday' && Math.random() < 0.3) {
        reply += ', friday energy';
      }
    }

    // Reply threading awareness (#15) — if we're in a thread context, stay on topic
    if (reply && msg.reference?.messageId) {
      const thread = this.memory.getActiveThread(channelId);
      if (thread && thread.topic && primaryTopic !== thread.topic) {
        // We're in a thread about a specific topic — try to keep relevance
        const threadTopicTemplates = TEMPLATES[thread.topic];
        if (threadTopicTemplates) {
          const pool = threadTopicTemplates.generic || threadTopicTemplates.responses;
          if (pool && pool.length > 0) {
            const threadReply = contextAwarePick(pool, signals, null);
            if (threadReply) reply = modifyResponse(threadReply, inputStyle).replace(/\{user\}/g, username);
          }
        }
      }
    }

    // Adaptive personality adjustments (#10)
    if (activePersonality === 'hype') {
      // Partial caps instead of full uppercase — more natural
      if (Math.random() < 0.2) {
        const words = reply.split(' ');
        const capsCount = 1 + Math.floor(Math.random() * Math.min(3, words.length));
        for (let i = 0; i < capsCount; i++) {
          const idx = Math.floor(Math.random() * words.length);
          words[idx] = words[idx].toUpperCase();
        }
        reply = words.join(' ');
      }
      if (Math.random() < 0.15) reply += ' 🔥';
    } else if (activePersonality === 'sarcastic') {
      if (Math.random() < 0.15) {
        const sarcasticPrefixes = ['Oh, ', 'Wow, ', 'Sure, ', 'Right, ', 'Yeah ok, ', 'Mhm, ', 'Ah yes, '];
        const prefix = sarcasticPrefixes[Math.floor(Math.random() * sarcasticPrefixes.length)];
        reply = prefix + reply.charAt(0).toLowerCase() + reply.slice(1);
      }
    }
    // Match user's detected personality (#10) — partial caps not full
    const userPrefs = this.userPreferences.get(userId);
    if (userPrefs?.personality === 'hype' && Math.random() < 0.15) {
      reply = reply.replace(/\.$/, '') + ' 🔥';
    }

    // Record feedback tracking details (#6)
    this.lastBotReplyDetails.set(channelId, { templateKey, topic: topicUsed, timestamp: Date.now(), botReply: reply || null });

    // Track for feedback system (#6)
    this.feedback.recordResponse(channelId, templateKey, topicUsed);

    // Update stats
    this.stats.totalReplies++;
    this.stats.topicReplies[topicUsed] = (this.stats.topicReplies[topicUsed] || 0) + 1;
    if (usedMarkov) this.stats.markovReplies++;
    else this.stats.templateReplies++;
    if (reason === 'mention' || reason === 'name') this.stats.mentionReplies++;
    this.stats.lastReplyAt = new Date().toISOString();

    return reply;
  }

  // Helper to finalize reply stats for early returns
  _finalizeReply(topicUsed, templateKey, channelId, isKnowledge, botReply) {
    this.stats.totalReplies++;
    this.stats.topicReplies[topicUsed] = (this.stats.topicReplies[topicUsed] || 0) + 1;
    if (isKnowledge) this.stats.knowledgeReplies = (this.stats.knowledgeReplies || 0) + 1;
    this.stats.lastReplyAt = new Date().toISOString();
    // Cap reply to Discord's 2000 character limit
    if (botReply && botReply.length > 1900) botReply = botReply.substring(0, 1897) + '...';
    this.lastBotReplyDetails.set(channelId, { templateKey, topic: topicUsed, timestamp: Date.now(), botReply: botReply || null });
    this.feedback.recordResponse(channelId, templateKey, topicUsed);
  }

  // Varied response formats (#16)
  _applyVariedFormat(reply, topic, extracted) {
    const formats = [
      // Rhetorical question format
      () => {
        if (topic && Math.random() < 0.5) {
          return `${reply} right?`;
        }
        return reply;
      },
      // List/ranking format
      () => {
        if (extracted?.subjects?.[0]) {
          const templates = [
            `Hot take ranking: ${extracted.subjects[0]} — ${reply}`,
            `My verdict on ${extracted.subjects[0]}: ${reply}`,
          ];
          return templates[Math.floor(Math.random() * templates.length)];
        }
        return reply;
      },
      // Question back format
      () => {
        const questions = [
          `${reply} — what do you think?`,
          `${reply} — anyone else feel the same?`,
          `${reply} — or am I trippin?`,
        ];
        return questions[Math.floor(Math.random() * questions.length)];
      },
    ];

    const format = formats[Math.floor(Math.random() * formats.length)];
    const result = format();
    return result.length <= 250 ? result : reply;
  }

  // Main processing entrypoint — called from messageCreate

  async processMessage(msg, botUserId) {
    const content = msg.content;
    const channelId = msg.channel.id;
    const userId = msg.author.id;
    const username = msg.member?.displayName || msg.author.username;

    const topics = detectTopics(content);
    const primaryTopic = topics && topics.length > 0 ? topics[0][0] : null;

    // Train Markov on every message
    this.markov.train(content, primaryTopic);

    // Track in memory
    this.memory.addMessage(channelId, userId, username, content);

    // Track user preferences
    this._trackUserPreferences(userId, content);

    // Track channel message lengths for adaptive response length
    if (!this.channelMsgLengths.has(channelId)) {
      this.channelMsgLengths.set(channelId, { totalLen: 0, count: 0 });
    }
    const lenTracker = this.channelMsgLengths.get(channelId);
    lenTracker.totalLen += content.length;
    lenTracker.count++;
    if (lenTracker.count > 200) {
      lenTracker.totalLen = Math.floor(lenTracker.totalLen / 2);
      lenTracker.count = Math.floor(lenTracker.count / 2);
    }

    // Track server expressions/slang
    this.slangTracker.record(content, userId);

    // Record subject mentions for auto-learning
    const extracted = extractSubject(content);
    if (extracted && extracted.subjects) {
      const sentiment = analyzeSentiment(content);
      for (const subj of extracted.subjects) {
        const wasNew = !this.learnedKnowledge.has(subj);
        this.learnedKnowledge.recordMention(subj, userId, sentiment, content.substring(0, 100));
        if (wasNew && this.learnedKnowledge.has(subj)) {
          this.learningLog.log('learned_subject', `Learned new subject: "${subj}" from community conversations`);
        }
      }
    }

    // Detect implicit feedback on bot's last reply
    this._detectFeedback(channelId, userId, content);

    // (2C) Q&A candidate extraction — detect question-answer patterns in user conversations
    const recentMsgs = this.memory.getRecentMessages(channelId, 5);
    if (recentMsgs && recentMsgs.length >= 2 && content.length >= 15 && content.length <= 300) {
      const prevMsg = recentMsgs[recentMsgs.length - 2];
      if (prevMsg && prevMsg.userId !== userId && this._regexPatterns.question.test(prevMsg.content)) {
        // Previous message was a question by someone else, current message might be an answer
        const isAnswer = !this._regexPatterns.question.test(content) && !this._regexPatterns.command.test(content)
          && content.length >= 15 && !this._regexPatterns.greeting.test(content);
        if (isAnswer) {
          if (!this._candidatePairs.has('qa')) this._candidatePairs.set('qa', []);
          const qaCandidates = this._candidatePairs.get('qa');
          qaCandidates.push({
            question: prevMsg.content.substring(0, 200),
            answer: content.substring(0, 300),
            questionUserId: prevMsg.userId,
            answerUserId: userId,
            channelId,
            timestamp: Date.now(),
          });
          if (qaCandidates.length > 100) qaCandidates.splice(0, qaCandidates.length - 100);
        }
      }
    }

    // Increment message counter
    this.messageCountSinceReply.set(channelId, (this.messageCountSinceReply.get(channelId) || 0) + 1);

    // Anti-spam guard
    if (detectSpamBurst(this.memory.getRecentMessages(channelId, 5))) {
      return null;
    }

    // Check if we should reply
    const decision = this.shouldReply(msg, botUserId);
    if (!decision.reply) return null;

    // Generate reply
    let reply = await this.generateReply(msg, decision.reason, decision);
    if (!reply) {
      if (decision.reason === 'mention' || decision.reason === 'name' || decision.reason === 'reply_to_bot') {
        reply = TEMPLATES.fallback[Math.floor(Math.random() * TEMPLATES.fallback.length)];
      } else {
        return null;
      }
    }

    // Special objects pass through
    if (reply && typeof reply === 'object' && reply.__type) {
      this.lastReplyTime.set(channelId, Date.now());
      this.messageCountSinceReply.set(channelId, 0);
      return reply;
    }

    // Anti-repetition check
    if (this.replyHistory.isDuplicate(channelId, reply)) {
      reply = await this.generateReply(msg, decision.reason, decision);
      if (!reply || this.replyHistory.isDuplicate(channelId, reply)) {
        if (decision.reason === 'mention' || decision.reason === 'name' || decision.reason === 'reply_to_bot') {
          reply = TEMPLATES.fallback[Math.floor(Math.random() * TEMPLATES.fallback.length)];
        } else {
          return null;
        }
      }
    }

    // Anti-echo check
    if (isEchoReply(reply, content)) {
      reply = await this.generateReply(msg, decision.reason, decision);
      if (!reply || isEchoReply(reply, content)) {
        if (decision.reason === 'mention' || decision.reason === 'name' || decision.reason === 'reply_to_bot') {
          reply = TEMPLATES.fallback[Math.floor(Math.random() * TEMPLATES.fallback.length)];
        } else {
          return null;
        }
      }
    }

    // Adaptive response length
    const avgLen = this._getChannelAvgLength(channelId);
    if (avgLen > 0 && avgLen < 40 && reply.length > 80) {
      const sentences = reply.split(/(?<=[.!?])\s+/);
      if (sentences.length > 1) reply = sentences[0];
    }

    // Self-correction system
    const brokenCheck = detectBrokenReply(reply);
    let selfCorrection = null;
    if (brokenCheck && Math.random() < 0.7) {
      selfCorrection = generateSelfCorrection(brokenCheck, reply);
    }

    // Typo simulation
    const typoResult = simulateTypo(reply);

    // Record in reply history
    this.replyHistory.record(channelId, reply);

    // Track bot's reply
    this.lastBotReply.set(channelId, {
      content: reply, subject: extracted?.subjects?.[0] || null,
      intent: extracted?.intent || null, timestamp: Date.now(),
    });

    // Track conversation context
    this._lastConversationContext.set(channelId, {
      topic: primaryTopic || 'general', subject: extracted?.subjects?.[0] || null,
      allSubjects: extracted?.subjects || [], userQuery: content,
      botReply: typeof reply === 'string' ? reply : null, timestamp: Date.now(),
    });

    // (59) Log conversation for dashboard review
    if (typeof reply === 'string' && reply.length > 0) {
      this._conversationLog.push({
        userMessage: content.substring(0, 400),
        botReply: reply.substring(0, 400),
        topic: primaryTopic || 'general',
        channelId,
        userId,
        username,
        reason: decision.reason,
        timestamp: Date.now(),
        reviewed: false,
      });
      // Cap at 200 entries, keep newest
      if (this._conversationLog.length > 200) {
        this._conversationLog = this._conversationLog.slice(-200);
      }
    }

    // Update cooldowns
    this.lastReplyTime.set(channelId, Date.now());
    this.messageCountSinceReply.set(channelId, 0);

    // Track mention reply time for throttle
    if (decision.reason === 'mention') {
      this._lastMentionReply.set(channelId, Date.now());
    }

    // Mark questions as answered in the active thread
    const activeThread = this.memory.getActiveThread(channelId);
    if (activeThread && activeThread.questionsAsked) {
      for (const q of activeThread.questionsAsked) {
        if (!q.answered) { q.answered = true; break; } // mark oldest unanswered
      }
    }

    // Emoji reaction instead of text
    if (Math.random() < 0.06 && decision.reason !== 'mention' && decision.reason !== 'name') {
      const poll = this._maybeGeneratePoll(content, topics, channelId);
      if (poll) return poll;
      const topicEmojis = primaryTopic ? TOPIC_EMOJIS[primaryTopic] : null;
      const sentiment = analyzeSentiment(content);
      const emojiPool = topicEmojis || SENTIMENT_EMOJIS[sentiment] || SENTIMENT_EMOJIS.neutral;
      const emoji = emojiPool[Math.floor(Math.random() * emojiPool.length)];
      return { __type: 'reaction', emoji };
    }

    // Multi-message reply
    if (reply.length > 40 && Math.random() < 0.07) {
      const splitPoint = reply.indexOf(' ', Math.floor(reply.length * 0.4));
      if (splitPoint > 10 && splitPoint < reply.length - 10) {
        return { __type: 'multi', parts: [reply.substring(0, splitPoint), reply.substring(splitPoint + 1)] };
      }
    }

    if (selfCorrection) return { __type: 'multi', parts: [reply, selfCorrection] };
    if (typoResult) return { __type: 'multi', parts: [typoResult.typoText, typoResult.correction] };

    return reply;
  }


  // Get channel average message length (#4)
  _getChannelAvgLength(channelId) {
    const tracker = this.channelMsgLengths.get(channelId);
    if (!tracker || tracker.count === 0) return 0;
    return Math.floor(tracker.totalLen / tracker.count);
  }

  // Detect implicit feedback on the bot's last reply (#6, 2A, 2B+5A, 5B)
  _detectFeedback(channelId, userId, content) {
    const details = this.lastBotReplyDetails.get(channelId);
    if (!details) return;
    // Only check within 45 seconds of bot's reply
    if (Date.now() - details.timestamp > 45000) return;

    const lower = content.toLowerCase();
    const positiveSigns = ['lol', 'lmao', 'haha', '😂', '🔥', 'true', 'facts', 'fr', 'based', 'W', 'good', 'nice',
      'agree', 'exactly', 'real', 'valid', 'yes', 'yeah', '💀', '👍', 'this', 'goated'];
    const negativeSigns = ['what?', 'huh', '?', 'cringe', 'no', 'wrong', 'bad', 'shut up', 'stfu', 'who asked',
      'nobody asked', 'L', 'ratio', 'mid', 'weird', 'bruh what'];

    const isPositive = positiveSigns.some(s => lower.includes(s));
    const isNegative = negativeSigns.some(s => lower.includes(s)) && !isPositive;

    if (isPositive || isNegative) {
      // (5A) Calculate user weight based on activity + reputation
      const userPrefs = this.userPreferences.get(userId);
      const msgCount = userPrefs?.messageCount || 0;
      let userWeight = msgCount >= 100 ? 2.0 : msgCount >= 30 ? 1.5 : 1.0;
      // (B1) Apply reputation modifier
      const rep = this.userReputation.get(userId);
      if (rep && rep.accuracy > 0.7 && rep.total >= 5) userWeight *= 1.3;
      // Update reputation
      if (!this.userReputation.has(userId)) this.userReputation.set(userId, { positive: 0, negative: 0, total: 0, accuracy: 0.5 });
      const repData = this.userReputation.get(userId);
      repData.total++;
      if (isPositive) repData.positive++;
      else repData.negative++;
      repData.accuracy = repData.positive / repData.total;
      // Runtime cap to prevent unbounded memory growth
      if (this.userReputation.size > 1500) {
        const oldest = this.userReputation.keys().next().value;
        this.userReputation.delete(oldest);
      }

      this.feedback.recordFeedback(details.templateKey, details.topic, isPositive, userWeight);
      this.feedback.recordChannelFeedback(channelId, isPositive);

      // (5B) If this was a trained pair, record pair-specific feedback
      if (details.templateKey?.startsWith('trained:')) {
        const pairKey = details.templateKey.replace('trained:', '');
        this.feedback.recordPairFeedback(pairKey, isPositive, userWeight);
        // Update pair's feedbackScore directly
        for (const [key, pair] of this.trainedPairs) {
          if (this._normalizeForMatch(key).startsWith(pairKey)) {
            const pairScore = this.feedback.getPairScore(pairKey);
            pair.feedbackScore = pairScore;
            // (5C) Track per-response variant feedback
            if (pair._lastResponseIdx !== undefined && pair.responses) {
              const responseHash = `${pairKey}:${pair._lastResponseIdx}`;
              this.feedback.recordResponseFeedback(responseHash, isPositive);
            }
            break;
          }
        }
      }

      // (2A) Auto-train Markov on positively-received bot messages
      if (isPositive && details.botReply && details.topic !== 'fallback') {
        this.markov.trainWeighted(details.botReply, details.topic, 2);
        this.learningLog.log('auto_train_positive', `Markov trained on positively-received reply: "${details.botReply?.substring(0, 40)}"`);
      }

      if (isPositive) {
        this.learningLog.log('positive_feedback', `Got positive reaction to ${details.topic} response (weight: ${userWeight.toFixed(1)})`);
      } else {
        this.learningLog.log('negative_feedback', `Got negative reaction to ${details.topic} response (weight: ${userWeight.toFixed(1)})`);
      }
    }

    // (2B+5A) User correction detection with reputation gate
    if (details && Date.now() - details.timestamp < 60000) {
      const correctionMatch = content.match(this._regexPatterns.correction);
      if (correctionMatch) {
        const correction = correctionMatch[1].trim();
        if (correction.length >= 5 && correction.length <= 300) {
          // Reputation gate: only users with 50+ messages can correct the bot
          const userPrefs = this.userPreferences.get(userId);
          const msgCount = userPrefs?.messageCount || 0;
          if (msgCount >= 30) {
            // Store as a candidate correction (not auto-applied — appears in dashboard for review)
            if (!this._candidatePairs.has('corrections')) this._candidatePairs.set('corrections', []);
            const corrections = this._candidatePairs.get('corrections');
            corrections.push({
              originalTopic: details.topic,
              originalReply: details.botReply || '',
              correction,
              userId,
              userMsgCount: msgCount,
              timestamp: Date.now(),
              channelId,
            });
            // Keep last 50 corrections
            if (corrections.length > 50) corrections.splice(0, corrections.length - 50);

            // (B2) Auto-apply high-confidence corrections from trusted users
            if (msgCount >= 100) {
              const rep = this.userReputation.get(userId);
              if (rep && rep.accuracy >= 0.7 && rep.total >= 5) {
                // Trusted user — auto-train the correction as a pair
                const normKey = this._normalizeForMatch(details.botReply || details.topic || '');
                if (normKey.length >= 3) {
                  this.trainedPairs.set(normKey, {
                    pattern: details.botReply || details.topic, response: correction,
                    score: 2, uses: 0, created: Date.now(),
                    trainedBy: `auto-correction:${userId}`, channelId,
                  });
                  this._rebuildPairIndex();
                  this.learningLog.log('auto_correction', `Trusted user auto-corrected: "${correction.substring(0, 50)}"`);
                }
              }
            }

            this.learningLog.log('user_correction', `User (${msgCount} msgs) suggested correction: "${correction.substring(0, 50)}"`);
          }
        }
      }
    }
  }

  // Track what users talk about to personalize responses over time (#4 enhanced)
  _trackUserPreferences(userId, content) {
    if (!this.userPreferences.has(userId)) {
      this.userPreferences.set(userId, {
        topics: {}, subjects: {}, messageCount: 0,
        sentiment: { positive: 0, negative: 0, neutral: 0 },
        personality: null,
        lastActive: Date.now(),
        favoriteSubject: null,
        memories: [],  // memorable facts: "plays Elden Ring", "hates spiders", etc.
      });
    }
    const prefs = this.userPreferences.get(userId);
    prefs.messageCount++;
    prefs.lastActive = Date.now();

    // Track sentiment distribution (#4)
    const sentiment = analyzeSentiment(content);
    prefs.sentiment[sentiment] = (prefs.sentiment[sentiment] || 0) + 1;

    const topics = detectTopics(content);
    if (topics) {
      for (const [topic] of topics) {
        prefs.topics[topic] = (prefs.topics[topic] || 0) + 1;
      }
    }

    const extracted = extractSubject(content);
    if (extracted && extracted.subjects) {
      for (const subj of extracted.subjects) {
        prefs.subjects[subj] = (prefs.subjects[subj] || 0) + 1;
      }
    }

    // Detect user personality based on patterns (#4 + #10)
    if (prefs.messageCount % 20 === 0) {
      this._detectUserPersonality(userId, prefs);
    }

    // Update favorite subject
    if (Object.keys(prefs.subjects).length > 0) {
      prefs.favoriteSubject = Object.entries(prefs.subjects).sort(([,a],[,b]) => b - a)[0][0];
    }

    // Cap the preferences map size
    if (this.userPreferences.size > 1000) {
      const oldest = this.userPreferences.keys().next().value;
      this.userPreferences.delete(oldest);
    }

    // Extract memorable facts about the user
    this._extractMemorableFacts(userId, content, extracted, topics);
  }

  // Extract and store memorable facts from user messages
  _extractMemorableFacts(userId, content, extracted, topics) {
    const prefs = this.userPreferences.get(userId);
    if (!prefs) return;
    if (!prefs.memories) prefs.memories = [];
    const lower = content.toLowerCase();

    // Patterns that indicate personal facts worth remembering
    const factPatterns = [
      { re: /\b(?:i play|im playing|i main|i started|playing)\s+(.{2,30})/i, type: 'plays' },
      { re: /\b(?:i love|i really love|i adore)\s+(.{2,30})/i, type: 'loves' },
      { re: /\b(?:i hate|i cant stand|i despise)\s+(.{2,30})/i, type: 'hates' },
      { re: /\b(?:my (?:favorite|fav|fave))\s+(?:\w+\s+)?(?:is|are)\s+(.{2,30})/i, type: 'favorite' },
      { re: /\b(?:i work|i do|my job|i work as)\s+(?:as |at |in )?(.{2,30})/i, type: 'works' },
      { re: /\b(?:i live in|im from|i moved to)\s+(.{2,30})/i, type: 'from' },
      { re: /\b(?:i have a|i got a|my)\s+(dog|cat|pet|bird|fish|hamster|rabbit|snake|gecko|ferret)\b/i, type: 'has_pet' },
      { re: /\b(?:i just bought|i ordered|i got)\s+(?:a |an |the )?(.{2,40})/i, type: 'bought' },
      { re: /\b(?:i watch|been watching|binged|binging)\s+(.{2,30})/i, type: 'watches' },
      { re: /\b(?:i listen to|been listening to)\s+(.{2,30})/i, type: 'listens_to' },
    ];

    for (const { re, type } of factPatterns) {
      const m = lower.match(re);
      if (m) {
        const value = m[1].replace(/[.!?,;]+$/, '').trim();
        if (value.length < 3 || value.length > 40) continue;
        // Don't store duplicates
        const exists = prefs.memories.some(mem => mem.type === type && mem.value.toLowerCase() === value.toLowerCase());
        if (!exists) {
          prefs.memories.push({ type, value, ts: Date.now() });
          // Keep max 20 memories per user
          if (prefs.memories.length > 20) prefs.memories.shift();
        }
      }
    }
  }

  // Detect user personality for personalized responses (#4)
  _detectUserPersonality(userId, prefs) {
    const total = prefs.sentiment.positive + prefs.sentiment.negative + prefs.sentiment.neutral;
    if (total < 10) return;

    const posRatio = prefs.sentiment.positive / total;
    const negRatio = prefs.sentiment.negative / total;

    if (posRatio > 0.5) prefs.personality = 'hype';
    else if (negRatio > 0.4) prefs.personality = 'edgy';
    else if (prefs.topics['tech'] > (prefs.messageCount * 0.3)) prefs.personality = 'analytical';
    else prefs.personality = 'chill';
  }

  // Get personalized greeting or comment about a user (#4)
  _getPersonalizedComment(userId, topic) {
    const prefs = this.userPreferences.get(userId);
    if (!prefs || prefs.messageCount < 10) return null;

    // 15% chance to add a personal touch
    if (Math.random() > 0.15) return null;

    const favTopic = Object.entries(prefs.topics).sort(([,a],[,b]) => b - a)[0];
    const favSubject = prefs.favoriteSubject;

    const comments = [];
    if (favSubject && topic && prefs.subjects[favSubject] > 3) {
      comments.push(`you always come through with the ${favSubject} talk`);
      comments.push(`classic you bringing up stuff like this`);
      comments.push(`the ${favSubject} expert has arrived`);
      comments.push(`called it, you were gonna talk about ${favSubject}`);
      comments.push(`you and ${favSubject}, name a better duo`);
    }
    // Memory-based personal comments
    if (prefs.memories && prefs.memories.length > 0) {
      const recent = prefs.memories.slice(-10);
      for (const mem of recent) {
        if (mem.type === 'plays' && topic === 'gaming') comments.push(`still playing ${mem.value}?`);
        if (mem.type === 'plays' && topic === 'gaming') comments.push(`how's ${mem.value} going?`);
        if (mem.type === 'loves') comments.push(`I remember you love ${mem.value}`);
        if (mem.type === 'has_pet') comments.push(`how's the ${mem.value} doing?`);
        if (mem.type === 'watches' && (topic === 'movies_tv' || topic === 'stream')) comments.push(`still watching ${mem.value}?`);
        if (mem.type === 'bought') comments.push(`how's that ${mem.value} you got?`);
        if (mem.type === 'listens_to' && topic === 'music') comments.push(`still bumping ${mem.value}?`);
        if (mem.type === 'from') comments.push(`repping ${mem.value} as always`);
        if (mem.type === 'favorite') comments.push(`${mem.value} enjoyer alert`);
      }
    }
    if (favTopic && favTopic[1] > 5) {
      comments.push(`I know you from the ${favTopic[0]} discussions lol`);
      comments.push(`youre always in the ${favTopic[0]} convos`);
      comments.push(`the ${favTopic[0]} regular is back`);
    }
    if (prefs.personality === 'hype') {
      comments.push(`your energy is always unmatched`);
      comments.push(`you bring the hype every time`);
      comments.push(`never a dull moment with you`);
    }
    if (prefs.personality === 'chill') {
      comments.push(`always keeping it chill`);
      comments.push(`the calmest person in chat honestly`);
    }
    if (prefs.personality === 'analytical') {
      comments.push(`always coming in with the thoughtful takes`);
      comments.push(`the big brain energy is real`);
    }
    if (prefs.personality === 'edgy') {
      comments.push(`here comes the spicy takes`);
      comments.push(`I already know this is gonna be controversial`);
    }
    // Generic fallbacks so there's always something
    if (prefs.messageCount > 50) {
      comments.push(`youre a regular at this point`);
      comments.push(`one of the real ones in here`);
    }

    return comments.length > 0 ? comments[Math.floor(Math.random() * comments.length)] : null;
  }

  // Knowledge base management
  setKnowledge(key, value) {
    if (key in this.knowledge) {
      this.knowledge[key] = value;
    }
  }

  setCustomEntry(key, patterns, answer) {
    this.knowledge.customEntries[key] = { patterns, answer };
  }

  removeCustomEntry(key) {
    delete this.knowledge.customEntries[key];
  }

  setFact(key, value) {
    if (!this.knowledge.facts) this.knowledge.facts = {};
    this.knowledge.facts[String(key).slice(0, 100)] = String(value).slice(0, 500);
  }

  removeFact(key) {
    if (this.knowledge.facts) delete this.knowledge.facts[key];
  }

  getKnowledge() {
    return { ...this.knowledge };
  }

  // Answer stream/facts questions — "when next stream", "viewer peak", "schedule", etc.
  answerStreamFacts(content) {
    const lower = content.toLowerCase();
    const k = this.knowledge;

    // Custom facts — check if any fact key matches in the message
    if (k.facts && Object.keys(k.facts).length > 0) {
      for (const [factKey, factVal] of Object.entries(k.facts)) {
        const keyLower = factKey.toLowerCase();
        if (lower.includes(keyLower) || keyLower.split(/\s+/).every(w => lower.includes(w))) {
          const templates = [
            `${factVal}`,
            `Oh yeah, ${factVal.charAt(0).toLowerCase() + factVal.slice(1)}`,
            `From what I know, ${factVal.charAt(0).toLowerCase() + factVal.slice(1)}`,
          ];
          return { reply: templates[Math.floor(Math.random() * templates.length)], factField: `fact:${factKey}` };
        }
      }
    }

    // Custom entries (existing system) — check pattern matches
    if (k.customEntries && Object.keys(k.customEntries).length > 0) {
      for (const [, entry] of Object.entries(k.customEntries)) {
        if (entry.patterns && entry.patterns.some(p => lower.includes(p.toLowerCase()))) {
          return { reply: entry.answer, factField: 'facts:custom_entry' };
        }
      }
    }

    // Stream schedule / next stream questions
    const scheduleQ = /\b(when|what time|schedule|stream.?time|next stream|streaming|going live|stream today|stream tonight|are you live|is .+ live|when.+live)\b/i;
    if (scheduleQ.test(content)) {
      // "are you live" / "is X live"
      if (/\b(are you live|is .+ live|you live right now|streaming right now|live right now)\b/i.test(content)) {
        if (k.isLive && k.currentGame) {
          const r = [`Yeah we're live right now playing ${k.currentGame}!`, `Live rn! Playing ${k.currentGame}`, `Yep stream is on — ${k.currentGame} right now 🔴`];
          return { reply: r[Math.floor(Math.random() * r.length)], factField: 'facts:isLive' };
        } else if (k.isLive) {
          return { reply: 'Yeah the stream is live right now! 🔴', factField: 'facts:isLive' };
        } else {
          const offline = ['Not live right now', 'Stream is offline atm'];
          if (k.nextStream) offline[0] += ` but next stream is ${k.nextStream}`;
          if (k.streamSchedule && !k.nextStream) offline[0] += ` — schedule is ${k.streamSchedule}`;
          return { reply: offline[Math.floor(Math.random() * offline.length)], factField: 'facts:isLive' };
        }
      }
      // "when next stream" / "next stream"
      if (/\b(next stream|when.*stream|stream.?soon|how soon|going live)\b/i.test(content)) {
        if (k.nextStream) {
          const r = [`Next stream is ${k.nextStream}`, `Should be ${k.nextStream}!`, `${k.nextStream} — thats the plan at least`];
          return { reply: r[Math.floor(Math.random() * r.length)], factField: 'facts:nextStream' };
        }
        if (k.streamSchedule) {
          const r = [`The schedule is ${k.streamSchedule}`, `Usually ${k.streamSchedule}`, `Schedule says: ${k.streamSchedule}`];
          return { reply: r[Math.floor(Math.random() * r.length)], factField: 'facts:schedule' };
        }
      }
      // "what's the schedule"
      if (/\b(schedule|stream.?time|what time|when do)\b/i.test(content) && k.streamSchedule) {
        const r = [`Schedule is ${k.streamSchedule}`, `${k.streamSchedule} — thats the usual schedule`, `Its usually ${k.streamSchedule}`];
        return { reply: r[Math.floor(Math.random() * r.length)], factField: 'facts:schedule' };
      }
    }

    // Viewer peak / viewer count / how many viewers
    const viewerQ = /\b(viewer|viewers|peak|how many|watched|viewership)\b/i;
    if (viewerQ.test(content)) {
      if (/\b(peak|highest|most|record|max)\b/i.test(content)) {
        if (k.lastStreamPeakViewers > 0) {
          const r = [
            `Peak was ${k.lastStreamPeakViewers} viewers last stream${k.lastStreamGame ? ` (${k.lastStreamGame})` : ''}`,
            `Hit ${k.lastStreamPeakViewers} viewers${k.lastStreamGame ? ` during ${k.lastStreamGame}` : ''} — not bad!`,
            `Last stream peaked at ${k.lastStreamPeakViewers}${k.lastStreamGame ? ` playing ${k.lastStreamGame}` : ''}`,
          ];
          return { reply: r[Math.floor(Math.random() * r.length)], factField: 'facts:peakViewers' };
        }
      }
      if (/\b(average|avg|how many)\b/i.test(content) && k.lastStreamAvgViewers > 0) {
        const r = [`Average was about ${k.lastStreamAvgViewers} viewers last stream`, `Around ${k.lastStreamAvgViewers} on average last time`];
        return { reply: r[Math.floor(Math.random() * r.length)], factField: 'facts:avgViewers' };
      }
      if (k.isLive && k.viewerCount > 0) {
        const r = [`We got ${k.viewerCount} viewers right now!`, `Currently at ${k.viewerCount} viewers 📊`];
        return { reply: r[Math.floor(Math.random() * r.length)], factField: 'facts:currentViewers' };
      }
    }

    // Last stream questions
    if (/\b(last stream|previous stream|last time|how long|stream.?duration|how long was)\b/i.test(content)) {
      if (/\b(how long|duration|length)\b/i.test(content) && k.lastStreamDuration) {
        return { reply: `Last stream was ${k.lastStreamDuration} long`, factField: 'facts:duration' };
      }
      if (/\b(what game|what.+play|playing what)\b/i.test(content) && k.lastStreamGame) {
        return { reply: `Last stream was ${k.lastStreamGame}`, factField: 'facts:lastGame' };
      }
      if (k.lastStreamDate) {
        const parts = [`Last stream was ${k.lastStreamDate}`];
        if (k.lastStreamGame) parts[0] += ` — played ${k.lastStreamGame}`;
        if (k.lastStreamPeakViewers > 0) parts[0] += `, peaked at ${k.lastStreamPeakViewers} viewers`;
        return { reply: parts[0], factField: 'facts:lastStream' };
      }
    }

    // Socials
    if (/\b(youtube|twitter|instagram|tiktok|socials|social media|follow)\b/i.test(content) && k.socials) {
      const asked = lower.match(/youtube|twitter|instagram|tiktok/i);
      if (asked) {
        const platform = asked[0].toLowerCase();
        const link = k.socials[platform];
        if (link) return { reply: `Here's the ${platform}: ${link}`, factField: `facts:social_${platform}` };
      }
      // General socials question
      const links = Object.entries(k.socials).filter(([, v]) => v).map(([p, v]) => `${p}: ${v}`);
      if (links.length > 0) {
        return { reply: `Socials: ${links.join(', ')}`, factField: 'facts:socials' };
      }
    }

    // Server info/rules
    if (/\b(server info|about.+server|what is this|rules|server rules)\b/i.test(content)) {
      if (/\brules\b/i.test(content) && k.rules) return { reply: k.rules, factField: 'facts:rules' };
      if (k.serverInfo) return { reply: k.serverInfo, factField: 'facts:serverInfo' };
    }

    // Streamer name
    if (/\b(who.+stream|streamer.?name|whos the streamer)\b/i.test(content) && k.streamerName) {
      return { reply: `The streamer is ${k.streamerName}!`, factField: 'facts:streamerName' };
    }

    return null;
  }

  getConfig() {
    return { ...this.config };
  }

  updateConfig(newConfig) {
    for (const [key, value] of Object.entries(newConfig)) {
      if (key in this.config) {
        this.config[key] = value;
      }
    }
  }

  _generateCatchUpSummary(currentChannelId) {
    const summaries = [];
    for (const [channelId, sums] of this.memory.recentSummaries) {
      for (const s of sums) {
        if (Date.now() - s.timestamp < 4 * 60 * 60 * 1000) { // last 4 hours
          summaries.push(s);
        }
      }
    }
    // Also check active threads
    for (const [channelId, thread] of this.memory.activeThreads) {
      if (thread && thread.messages >= 3 && Date.now() - thread.lastActivity < 300000) {
        const participantCount = thread.participants instanceof Set ? thread.participants.size : 0;
        summaries.push({
          topic: thread.topic || 'general',
          subjects: thread.subjects || [],
          participantCount,
          messageCount: thread.messages,
          duration: Math.round((thread.lastActivity - thread.startTime) / 60000),
          timestamp: thread.lastActivity,
          active: true,
        });
      }
    }

    // If no formal summaries, try building one from recent messages in the current channel
    if (summaries.length === 0 && currentChannelId) {
      const recentMsgs = this.memory.getRecentMessages(currentChannelId, 30);
      if (recentMsgs && recentMsgs.length >= 3) {
        // Build a quick summary from recent message topics and subjects
        const topicCounts = {};
        const allSubjects = [];
        const participants = new Set();
        for (const m of recentMsgs) {
          if (Date.now() - m.timestamp > 2 * 60 * 60 * 1000) continue; // last 2 hours only
          participants.add(m.userId);
          if (m.topics) for (const [t] of m.topics) topicCounts[t] = (topicCounts[t] || 0) + 1;
          if (m.subjects) allSubjects.push(...m.subjects);
        }
        const sortedTopics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]);
        if (sortedTopics.length > 0) {
          const uniqueSubjects = [...new Set(allSubjects)].slice(0, 5);
          let reply = `📋 **Here's what's been going on:**\n`;
          let count = 0;
          for (const [topic, cnt] of sortedTopics.slice(0, 4)) {
            const relatedSubjects = uniqueSubjects.filter(s => s.toLowerCase() !== topic.toLowerCase()).slice(0, 2);
            const subjectStr = relatedSubjects.length > 0 ? ` (${relatedSubjects.join(', ')})` : '';
            reply += `• **${topic}** — came up ${cnt} times${subjectStr}\n`;
            count++;
          }
          if (participants.size > 1) reply += `\n_${participants.size} people have been chatting_`;
          return reply;
        }
      }
    }

    if (summaries.length === 0) return `Honestly not much happened, chat's been pretty quiet 😅`;

    summaries.sort((a, b) => b.timestamp - a.timestamp);

    let reply = `📋 **Here's what you missed:**\n`;
    const seen = new Set();
    let count = 0;
    for (const s of summaries) {
      if (seen.has(s.topic)) continue;
      seen.add(s.topic);
      const subjects = s.subjects?.length > 0 ? ` (${s.subjects.slice(0, 3).join(', ')})` : '';
      const active = s.active ? ' *(still going)*' : '';
      const people = s.participantCount > 1 ? `${s.participantCount} people` : 'someone';
      reply += `• **${s.topic}** — ${people} chatted for ~${s.duration || '?'} min${subjects}${active}\n`;
      count++;
      if (count >= 5) break;
    }
    if (count === 0) return `Chat's been pretty chill, nothing major happened`;
    return reply;
  }

  // Generate reaction poll for hot topics
  _maybeGeneratePoll(content, topics, channelId) {
    // Only trigger occasionally on debatable/opinionated messages
    if (Math.random() > 0.03) return null; // 3% chance
    if (!topics || topics.length === 0) return null;

    const lower = content.toLowerCase();
    const topic = topics[0][0];

    // Need a debatable statement or comparison
    const isDebatable = /\b(better|worse|best|worst|overrated|underrated|mid|goat|top tier|trash|fire|peak|prefer|vs|versus|or)\b/.test(lower);
    if (!isDebatable) return null;

    // Extract the debatable subject
    const extracted = extractSubject(content);
    const subject = extracted?.subjects?.[0] || topic;

    const pollTemplates = [
      { q: `Hot take check: ${subject} — agree or nah?`, options: ['🔥 Facts', '❄️ Cap', '😐 Mid'] },
      { q: `Chat, where do we stand on ${subject}?`, options: ['👍 W', '👎 L', '🤷 Idk'] },
      { q: `${subject} debate: vote!`, options: ['✅ Agree', '❌ Disagree', '🤔 Depends'] },
    ];

    const poll = pollTemplates[Math.floor(Math.random() * pollTemplates.length)];
    return { __type: 'poll', question: poll.q, options: poll.options };
  }


  getStats() {
    return {
      ...this.stats,
      markov: this.markov.getStats(),
      memoryChannels: this.memory.channels.size,
      knowledgeSubjects: Object.keys(BUILT_IN_KNOWLEDGE).filter(k => !BUILT_IN_KNOWLEDGE[k].alias).length,
      trackedUsers: this.userPreferences.size,
      learnedSubjects: this.learnedKnowledge.subjects.size,
      pendingSubjects: this.learnedKnowledge.pendingSubjects.size,
      feedbackTemplates: this.feedback.templateScores.size,
      serverExpressions: this.slangTracker.expressions.size,
      learningLogEntries: this.learningLog.entries.length,
      replyHistoryChannels: this.replyHistory.history.size,
      trainedPairs: this.trainedPairs.size,
    };
  }

  toJSON() {
    const userPrefsObj = {};
    for (const [k, v] of this.userPreferences) { userPrefsObj[k] = v; }

    return {
      config: this.config,
      stats: this.stats,
      markov: this.markov.toJSON(),
      knowledge: this.knowledge,
      memory: this.memory.toJSON(),
      learnedKnowledge: this.learnedKnowledge.toJSON(),
      feedback: this.feedback.toJSON(),
      slangTracker: this.slangTracker.toJSON(),
      learningLog: this.learningLog.toJSON(),
      userPreferences: userPrefsObj,
      replyHistory: this.replyHistory.toJSON(),
      trainingStats: this._trainingStats || { totalSessions: 0, approved: 0, rejected: 0, log: [] },
      trainedPairs: Object.fromEntries([...this.trainedPairs.entries()].slice(0, 2000)),
      candidatePairs: (() => {
        const obj = {};
        for (const [k, v] of this._candidatePairs) {
          obj[k] = Array.isArray(v) ? v.slice(-100) : v;
        }
        return obj;
      })(),
      userReputation: Object.fromEntries([...this.userReputation.entries()].slice(0, 1000)),
      conversationLog: (this._conversationLog || []).filter(e => !e.reviewed).slice(-200),
      lastConversationContext: (() => {
        const obj = {};
        for (const [k, v] of this._lastConversationContext) {
          // Only persist recent (within 30 min)
          if (v.timestamp && Date.now() - v.timestamp < 1800000) obj[k] = v;
        }
        return obj;
      })(),
      ai: this.ai.toJSON(),
    };
    if (!data) return;
    if (data.config) this.config = { ...this.config, ...data.config };
    if (data.stats) this.stats = { ...this.stats, ...data.stats };
    if (data.markov) this.markov.loadFromJSON(data.markov);
    if (data.knowledge) this.knowledge = { ...this.knowledge, ...data.knowledge };
    if (data.memory) this.memory.loadFromJSON(data.memory);
    if (data.learnedKnowledge) this.learnedKnowledge.loadFromJSON(data.learnedKnowledge);
    if (data.feedback) this.feedback.loadFromJSON(data.feedback);
    if (data.slangTracker) this.slangTracker.loadFromJSON(data.slangTracker);
    if (data.learningLog) this.learningLog.loadFromJSON(data.learningLog);
    if (data.ai) this.ai.loadFromJSON(data.ai);
    if (data.userPreferences) {
      for (const [k, v] of Object.entries(data.userPreferences)) {
        this.userPreferences.set(k, v);
      }
    }
    if (data.replyHistory) this.replyHistory.loadFromJSON(data.replyHistory);
    if (data.trainingStats) this._trainingStats = data.trainingStats;
    if (data.trainedPairs) {
      // Migrate old keys: re-normalize with contraction expansion so keys match runtime lookup
      for (const [k, v] of Object.entries(data.trainedPairs)) {
        const newKey = this._normalizeForMatch(k);
        if (newKey !== k && newKey.length >= 3) {
          // Key changed due to contraction expansion — migrate
          this.trainedPairs.set(newKey, v);
        } else {
          this.trainedPairs.set(k, v);
        }
      }
      this._rebuildPairIndex();
    }
    if (data.candidatePairs) {
      for (const [k, v] of Object.entries(data.candidatePairs)) {
        this._candidatePairs.set(k, v);
      }
    }
    if (data.userReputation) {
      for (const [k, v] of Object.entries(data.userReputation)) {
        this.userReputation.set(k, v);
      }
    }
    // Restore conversation log
    if (data.conversationLog && Array.isArray(data.conversationLog)) {
      this._conversationLog = data.conversationLog.filter(e => !e.reviewed).slice(-200);
    }
    // Restore conversation context
    if (data.lastConversationContext) {
      for (const [k, v] of Object.entries(data.lastConversationContext)) {
        if (v.timestamp && Date.now() - v.timestamp < 1800000) {
          this._lastConversationContext.set(k, v);
        }
      }
    }
    this._startTimers();
  }
}

export default SmartBot;
