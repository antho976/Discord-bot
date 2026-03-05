/**
 * SmartBot — Local AI chat engine
 * Combines topic detection, Markov chains, sentiment analysis,
 * channel memory, and smart templates for on-topic replies.
 * No external API needed.
 */

// ======================== MARKOV CHAIN ENGINE ========================

class MarkovChain {
  constructor() {
    this.chain = new Map();   // "w1 w2" → ["w3", ...] (bigram)
    this.trichain = new Map(); // "w1 w2 w3" → ["w4", ...] (trigram for #7)
    this.starters = [];       // sentence starters
    this.totalTrained = 0;
    this.maxChainSize = 50000; // prevent unbounded memory
    this.topicChains = new Map(); // topic → separate chain for topic-specific generation (#7)
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
  }

  generate(maxWords = 20, seedWords = null, topic = null) {
    if (this.chain.size < 10) return null;

    let current = null;

    // Try topic-specific chain first (#7)
    const useTopicChain = topic && this.topicChains.has(topic) && this.topicChains.get(topic).size > 20;
    const activeChain = useTopicChain ? this.topicChains.get(topic) : this.chain;

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
    // Save a compact version (last 10000 chain entries + 500 starters)
    const entries = [...this.chain.entries()].slice(-10000);
    const triEntries = [...this.trichain.entries()].slice(-5000);
    const topicChainsJSON = {};
    for (const [topic, tc] of this.topicChains) {
      topicChainsJSON[topic] = [...tc.entries()].slice(-3000);
    }
    return {
      chain: entries,
      trichain: triEntries,
      topicChains: topicChainsJSON,
      starters: this.starters.slice(-500),
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
      this.starters = data.starters;
    }
    if (data.totalTrained) {
      this.totalTrained = data.totalTrained;
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

class TrendingTracker {
  constructor() {
    this.hourlyBuckets = new Map(); // "topic:hour" → count
    this.dailyBuckets = new Map();  // "topic:day" → count
  }

  record(topic) {
    const hour = Math.floor(Date.now() / 3600000);
    const day = Math.floor(Date.now() / 86400000);
    const hKey = `${topic}:${hour}`;
    const dKey = `${topic}:${day}`;
    this.hourlyBuckets.set(hKey, (this.hourlyBuckets.get(hKey) || 0) + 1);
    this.dailyBuckets.set(dKey, (this.dailyBuckets.get(dKey) || 0) + 1);
    // Prune old hourly buckets (keep 48 hours)
    const cutoffHour = hour - 48;
    for (const k of this.hourlyBuckets.keys()) {
      const h = parseInt(k.split(':').pop());
      if (h < cutoffHour) this.hourlyBuckets.delete(k);
    }
    // Prune old daily buckets (keep 14 days)
    const cutoffDay = day - 14;
    for (const k of this.dailyBuckets.keys()) {
      const d = parseInt(k.split(':').pop());
      if (d < cutoffDay) this.dailyBuckets.delete(k);
    }
  }

  getTrending(hours = 24) {
    const cutoffHour = Math.floor(Date.now() / 3600000) - hours;
    const counts = {};
    for (const [k, v] of this.hourlyBuckets) {
      const parts = k.split(':');
      const h = parseInt(parts.pop());
      const topic = parts.join(':');
      if (h >= cutoffHour) {
        counts[topic] = (counts[topic] || 0) + v;
      }
    }
    return Object.entries(counts).sort(([,a],[,b]) => b - a).slice(0, 10);
  }

  toJSON() {
    return {
      hourly: [...this.hourlyBuckets.entries()].slice(-500),
      daily: [...this.dailyBuckets.entries()].slice(-200),
    };
  }

  loadFromJSON(data) {
    if (!data) return;
    if (data.hourly) this.hourlyBuckets = new Map(data.hourly);
    if (data.daily) this.dailyBuckets = new Map(data.daily);
  }
}

// ======================== FEEDBACK LEARNING SYSTEM (#6) ========================

class FeedbackTracker {
  constructor() {
    // Maps response patterns to positive/negative feedback scores
    this.templateScores = new Map(); // templateKey → { positive: n, negative: n, uses: n }
    this.topicScores = new Map();    // topic → { positive: n, negative: n }
    this.recentChannelFeedback = new Map(); // channelId → [{ isPositive, timestamp }]
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

  recordFeedback(templateKey, topic, isPositive) {
    if (this.templateScores.has(templateKey)) {
      const entry = this.templateScores.get(templateKey);
      if (isPositive) entry.positive++;
      else entry.negative++;
    }
    if (topic) {
      if (!this.topicScores.has(topic)) this.topicScores.set(topic, { positive: 0, negative: 0 });
      const ts = this.topicScores.get(topic);
      if (isPositive) ts.positive++;
      else ts.negative++;
    }
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
    return pool.filter(t => {
      const key = `${topic}:${t.substring(0, 40)}`;
      const score = this.getScore(key);
      return score >= -0.3; // only filter out consistently bad ones
    });
  }

  toJSON() {
    return {
      templates: [...this.templateScores.entries()].slice(-1000),
      topics: [...this.topicScores.entries()],
    };
  }

  loadFromJSON(data) {
    if (!data) return;
    if (data.templates) this.templateScores = new Map(data.templates);
    if (data.topics) this.topicScores = new Map(data.topics);
  }
}

// ======================== COMMUNITY OPINIONS (#12) ========================

class CommunityOpinions {
  constructor() {
    this.opinions = new Map(); // subject → { positive: n, negative: n, neutral: n, total: n }
  }

  record(subject, sentiment) {
    const key = subject.toLowerCase().trim();
    if (!this.opinions.has(key)) {
      this.opinions.set(key, { positive: 0, negative: 0, neutral: 0, total: 0 });
    }
    const entry = this.opinions.get(key);
    entry[sentiment] = (entry[sentiment] || 0) + 1;
    entry.total++;
    // Cap size
    if (this.opinions.size > 1000) {
      const oldest = this.opinions.keys().next().value;
      this.opinions.delete(oldest);
    }
  }

  getSummary(subject) {
    const key = subject.toLowerCase().trim();
    const entry = this.opinions.get(key);
    if (!entry || entry.total < 3) return null;

    const ratio = entry.positive / (entry.total || 1);
    if (ratio > 0.65) return { mood: 'positive', text: `Most people here really like ${subject}` };
    if (ratio < 0.35) return { mood: 'negative', text: `${subject} gets a lot of criticism around here` };
    return { mood: 'mixed', text: `People are pretty split on ${subject} honestly` };
  }

  toJSON() {
    return [...this.opinions.entries()].slice(-500);
  }

  loadFromJSON(data) {
    if (!data) return;
    this.opinions = new Map(data);
  }
}

// ======================== USER EXPERTISE DETECTION (#14) ========================

class ExpertiseTracker {
  constructor() {
    this.experts = new Map(); // "topic:userId" → { messages, helpfulCount, lastActive }
  }

  record(userId, topic, isHelpful = false) {
    const key = `${topic}:${userId}`;
    if (!this.experts.has(key)) {
      this.experts.set(key, { messages: 0, helpfulCount: 0, lastActive: Date.now(), userId, topic });
    }
    const e = this.experts.get(key);
    e.messages++;
    e.lastActive = Date.now();
    if (isHelpful) e.helpfulCount++;
    // Cap
    if (this.experts.size > 5000) {
      const oldest = this.experts.keys().next().value;
      this.experts.delete(oldest);
    }
  }

  getExpert(topic) {
    let best = null, bestScore = 0;
    for (const [, v] of this.experts) {
      if (v.topic !== topic) continue;
      // Must have at least 10 messages on topic and active in last 7 days
      if (v.messages < 10) continue;
      if (Date.now() - v.lastActive > 7 * 86400000) continue;
      const score = v.messages + v.helpfulCount * 3;
      if (score > bestScore) { bestScore = score; best = v; }
    }
    return best;
  }

  toJSON() {
    return [...this.experts.entries()].slice(-2000);
  }

  loadFromJSON(data) {
    if (!data) return;
    this.experts = new Map(data);
  }
}

// ======================== SERVER EXPRESSIONS/SLANG TRACKER (#9, #17) ========================

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

// ======================== ANTI-REPETITION TRACKER (#2) ========================

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
    // Very similar match in last 10 (Jaccard similarity > 0.8)
    const replyWords = new Set(normalized.split(/\s+/));
    for (let i = arr.length - 1; i >= Math.max(0, arr.length - 10); i--) {
      const pastWords = new Set(arr[i].split(/\s+/));
      const intersection = [...replyWords].filter(w => pastWords.has(w)).length;
      const union = new Set([...replyWords, ...pastWords]).size;
      if (union > 0 && intersection / union > 0.8) return true;
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

class WordGraph {
  constructor(maxEdges = 3000) {
    this.edges = new Map(); // "word" → Map<"word", count>
    this.totalEdges = 0;
    this.maxEdges = maxEdges;
  }

  train(text) {
    const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2 && w.length < 20);
    if (words.length < 3) return;
    // Sliding window of 3 — connect nearby words
    for (let i = 0; i < words.length; i++) {
      for (let j = i + 1; j < Math.min(i + 4, words.length); j++) {
        const a = words[i], b = words[j];
        if (a === b) continue;
        if (!this.edges.has(a)) this.edges.set(a, new Map());
        const neighbors = this.edges.get(a);
        neighbors.set(b, (neighbors.get(b) || 0) + 1);
        this.totalEdges++;
      }
    }
    // Cap
    if (this.totalEdges > this.maxEdges * 2) this._prune();
  }

  _prune() {
    // Remove weakest edges
    for (const [word, neighbors] of this.edges) {
      for (const [n, count] of neighbors) {
        if (count < 2) { neighbors.delete(n); this.totalEdges--; }
      }
      if (neighbors.size === 0) this.edges.delete(word);
    }
  }

  // Get related words for a topic (for transitions)
  getRelated(word, count = 5) {
    const neighbors = this.edges.get(word.toLowerCase());
    if (!neighbors) return [];
    return [...neighbors.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([w]) => w);
  }

  toJSON() {
    const obj = {};
    for (const [word, neighbors] of this.edges) {
      const top = [...neighbors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
      if (top.length > 0) obj[word] = top;
    }
    return obj;
  }

  loadFromJSON(data) {
    if (!data) return;
    for (const [word, entries] of Object.entries(data)) {
      this.edges.set(word, new Map(entries));
      this.totalEdges += entries.length;
    }
  }
}

// ======================== SOCIAL GROUP DETECTION (#10) ========================

class SocialTracker {
  constructor() {
    this.interactions = new Map(); // "userId:userId" → { count, lastSeen }
    this.userActivity = new Map(); // userId → { channels: Set, replyTo: Map<userId, count> }
    this.maxPairs = 500;
  }

  recordInteraction(userId1, userId2, channelId) {
    if (userId1 === userId2) return;
    const key = [userId1, userId2].sort().join(':');
    if (!this.interactions.has(key)) {
      this.interactions.set(key, { count: 0, lastSeen: 0 });
    }
    const entry = this.interactions.get(key);
    entry.count++;
    entry.lastSeen = Date.now();

    // Track per-user activity
    for (const uid of [userId1, userId2]) {
      if (!this.userActivity.has(uid)) {
        this.userActivity.set(uid, { channels: new Set(), replyTo: new Map() });
      }
      this.userActivity.get(uid).channels.add(channelId);
    }
    const u1 = this.userActivity.get(userId1);
    u1.replyTo.set(userId2, (u1.replyTo.get(userId2) || 0) + 1);

    // Cap
    if (this.interactions.size > this.maxPairs) {
      let minKey = null, minCount = Infinity;
      for (const [k, v] of this.interactions) {
        if (v.count < minCount) { minCount = v.count; minKey = k; }
      }
      if (minKey) this.interactions.delete(minKey);
    }
  }

  // Detect if two users interact a lot
  areFriends(userId1, userId2) {
    const key = [userId1, userId2].sort().join(':');
    const entry = this.interactions.get(key);
    return entry && entry.count >= 10;
  }

  // Get a user's top interaction partners
  getTopPartners(userId, count = 3) {
    const activity = this.userActivity.get(userId);
    if (!activity) return [];
    return [...activity.replyTo.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([uid, cnt]) => ({ userId: uid, count: cnt }));
  }

  // Get a "social comment" about two users (for use in replies)
  getSocialComment(userId1, userId2) {
    if (!this.areFriends(userId1, userId2)) return null;
    const templates = [
      'you two are always in here together lol',
      'the dynamic duo strikes again',
      'classic you two honestly',
      'yall always on the same wavelength',
      'name a more iconic duo in this server',
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  toJSON() {
    const interactions = {};
    for (const [k, v] of this.interactions) interactions[k] = v;
    return { interactions };
  }

  loadFromJSON(data) {
    if (!data?.interactions) return;
    for (const [k, v] of Object.entries(data.interactions)) {
      this.interactions.set(k, v);
    }
  }
}

// ======================== COPYPASTA / INSIDE JOKES TRACKER (#14) ========================

class InsideJokeTracker {
  constructor() {
    this.quotes = new Map(); // normalized text → { original, author, uses, firstSeen, reactions }
    this.maxQuotes = 100;
  }

  // Record a memorable message (long, got reactions, or repeated)
  recordCandidate(text, authorName, reactions = 0) {
    if (text.length < 15 || text.length > 300) return;
    // Skip if it's a command or URL
    if (text.startsWith('!') || text.startsWith('/') || /https?:\/\//.test(text)) return;

    const key = text.toLowerCase().trim();
    if (this.quotes.has(key)) {
      const entry = this.quotes.get(key);
      entry.uses++;
      entry.reactions = Math.max(entry.reactions, reactions);
      return;
    }

    // Only store if it got reactions or is being repeated
    if (reactions >= 3) {
      this.quotes.set(key, {
        original: text,
        author: authorName,
        uses: 1,
        firstSeen: Date.now(),
        reactions,
      });
    }

    // Cap
    if (this.quotes.size > this.maxQuotes) {
      let minKey = null, minScore = Infinity;
      for (const [k, v] of this.quotes) {
        const score = v.uses + v.reactions;
        if (score < minScore) { minScore = score; minKey = k; }
      }
      if (minKey) this.quotes.delete(minKey);
    }
  }

  // Get a random inside joke (for occasional use)
  getRandom() {
    if (this.quotes.size === 0) return null;
    const entries = [...this.quotes.values()].filter(e => e.uses >= 2 || e.reactions >= 3);
    if (entries.length === 0) return null;
    const entry = entries[Math.floor(Math.random() * entries.length)];
    const intros = [
      `Remember when ${entry.author} said "${entry.original}"`,
      `"${entry.original}" - ${entry.author}, legendary`,
      `As ${entry.author} once said: "${entry.original}"`,
      `${entry.author} still goated for saying "${entry.original}"`,
    ];
    return intros[Math.floor(Math.random() * intros.length)];
  }

  toJSON() {
    const obj = {};
    for (const [k, v] of this.quotes) obj[k] = v;
    return obj;
  }

  loadFromJSON(data) {
    if (!data) return;
    for (const [k, v] of Object.entries(data)) this.quotes.set(k, v);
  }
}

// ======================== TF-IDF LOCAL TOPIC ENGINE (#13) ========================

class TfIdfEngine {
  constructor() {
    this.documentCount = 0;
    this.termDocFreq = new Map(); // term → number of documents containing it
    this.topicTerms = new Map();  // topic → Set<term>   (seeded from TOPICS keywords)
    this.maxTerms = 5000;
    this.seeded = false;
  }

  // Seed from existing TOPICS keywords (called once)
  seedFromTopics(topicsConst) {
    if (this.seeded) return;
    for (const [topic, data] of Object.entries(topicsConst)) {
      const terms = new Set(data.keywords.map(k => k.toLowerCase()));
      this.topicTerms.set(topic, terms);
    }
    this.seeded = true;
  }

  // Train on a message — updates document frequency
  train(text) {
    const terms = this._tokenize(text);
    if (terms.length < 2) return;
    this.documentCount++;
    const seen = new Set();
    for (const term of terms) {
      if (!seen.has(term)) {
        this.termDocFreq.set(term, (this.termDocFreq.get(term) || 0) + 1);
        seen.add(term);
      }
    }
    // Prune rare terms periodically
    if (this.documentCount % 500 === 0 && this.termDocFreq.size > this.maxTerms) {
      for (const [t, count] of this.termDocFreq) {
        if (count < 2) this.termDocFreq.delete(t);
      }
    }
  }

  // Score topics for a given message using TF-IDF
  scoreTopics(text) {
    const terms = this._tokenize(text);
    if (terms.length < 2) return null;

    // Calculate TF for this message
    const tf = new Map();
    for (const t of terms) tf.set(t, (tf.get(t) || 0) + 1);
    for (const [t, count] of tf) tf.set(t, count / terms.length);

    // Score each topic
    const scores = [];
    for (const [topic, topicTermSet] of this.topicTerms) {
      let score = 0;
      for (const term of topicTermSet) {
        if (tf.has(term)) {
          const tfidf = tf.get(term) * this._idf(term);
          score += tfidf;
        }
      }
      if (score > 0) scores.push([topic, score]);
    }

    if (scores.length === 0) return null;
    scores.sort((a, b) => b[1] - a[1]);
    return scores.slice(0, 5);
  }

  _idf(term) {
    const df = this.termDocFreq.get(term) || 0;
    if (df === 0 || this.documentCount === 0) return 1;
    return Math.log(this.documentCount / df) + 1;
  }

  _tokenize(text) {
    return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
  }

  toJSON() {
    return {
      documentCount: this.documentCount,
      termDocFreq: [...this.termDocFreq.entries()].slice(-2000),
    };
  }

  loadFromJSON(data) {
    if (!data) return;
    this.documentCount = data.documentCount || 0;
    if (data.termDocFreq) this.termDocFreq = new Map(data.termDocFreq);
  }
}

// ======================== TIME-AWARE RESPONSES (#1) ========================

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

const TOPICS = {
  gaming: {
    keywords: ['game', 'gaming', 'play', 'playing', 'games', 'gamer', 'controller', 'console',
      'pc', 'steam', 'xbox', 'playstation', 'ps5', 'ps4', 'nintendo', 'switch',
      'fps', 'mmo', 'mmorpg', 'rpg', 'pvp', 'pve', 'raid', 'dungeon', 'boss',
      'loot', 'drop', 'grind', 'level', 'rank', 'ranked', 'elo', 'mmr',
      'fortnite', 'valorant', 'minecraft', 'league', 'lol', 'apex', 'cod',
      'warzone', 'overwatch', 'gta', 'elden ring', 'zelda', 'mario',
      'diablo', 'wow', 'dota', 'csgo', 'cs2', 'pubg', 'roblox', 'rust',
      'tarkov', 'destiny', 'halo', 'smash', 'pokemon', 'palworld',
      'souls', 'soulslike', 'roguelike', 'indie', 'aaa', 'early access',
      'respawn', 'spawn', 'checkpoint', 'save', 'loadout', 'build',
      'nerf', 'buff', 'patch', 'update', 'dlc', 'expansion', 'mod',
      'speedrun', 'no hit', 'permadeath', 'hardcore', 'survival',
      'crafting', 'inventory', 'weapon', 'armor', 'shield', 'sword',
      'headshot', 'clutch', 'ace', 'pentakill', 'carry', 'feed',
      'noob', 'pro', 'tryhard', 'casual', 'sweat', 'meta', 'op',
      'npc', 'quest', 'mission', 'campaign', 'story mode', 'coop', 'co-op',
      'multiplayer', 'singleplayer', 'open world', 'sandbox',
      'battle royale', 'respawning', 'killstreak', 'combo', 'parry',
      'dodge roll', 'iframe', 'hitbox', 'cooldown', 'ability', 'ultimate',
      'tank', 'healer', 'dps', 'support', 'aggro', 'kiting', 'ganking',
      'farming', 'jungling', 'roaming', 'flanking', 'camping', 'rushing',
      'strat', 'callout', 'comms', 'teamwork', 'solo queue', 'premade',
      'smurf', 'boosting', 'leaderboard', 'season pass', 'battle pass',
      'skin', 'cosmetic', 'emote wheel', 'loot box', 'gacha',
      'remaster', 'remake', 'port', 'optimization', 'performance',
      'frame drops', 'stuttering', 'input lag', 'aim assist', 'crosshair',
      'sensitivity', 'keybinds', 'macro', 'controller aim', 'mnk',
      'lethal company', 'helldivers', 'baldurs gate', 'bg3', 'starfield',
      'cyberpunk', 'witcher', 'final fantasy', 'ff14', 'ffxiv',
      'dead by daylight', 'dbd', 'phasmophobia', 'satisfactory',
      'stardew', 'terraria', 'hollow knight', 'silksong', 'celeste',
      'hades', 'risk of rain', 'deep rock', 'sea of thieves',
      'escape from tarkov', 'hunt showdown', 'the finals', 'xdefiant',
      'wuthering waves', 'zenless zone zero', 'genshin', 'honkai'],
    weight: 1.5
  },
  stream: {
    keywords: ['stream', 'streaming', 'streamer', 'live', 'twitch', 'youtube',
      'vod', 'clip', 'chat', 'viewer', 'viewers', 'sub', 'subs', 'subscribe',
      'follow', 'follower', 'donation', 'dono', 'bits', 'gifted',
      'emote', 'emotes', 'channel', 'channel points', 'raid',
      'host', 'hosting', 'going live', 'went live', 'offline',
      'schedule', 'next stream', 'last stream', 'content', 'content creator',
      'obs', 'bitrate', 'fps', 'dropped frames', 'webcam', 'mic',
      'overlay', 'alerts', 'tts', 'text to speech', 'nightbot', 'streamlabs',
      'affiliate', 'partner', 'irl', 'just chatting', 'category',
      'subathon', 'marathon stream', 'charity stream', 'collab',
      'co-stream', 'watchparty', 'watch party', 'react', 'reacting',
      'highlight', 'montage', 'compilations', 'stream sniper',
      'backseat', 'backseating', 'mod', 'moderator', 'vip',
      'hype train', 'prediction', 'predictions', 'channel rewards',
      'bttv', 'ffz', '7tv', 'subscriber', 'tier 1', 'tier 2', 'tier 3',
      'prime sub', 'prime gaming', 'drops', 'watch time'],
    weight: 1.3
  },
  music: {
    keywords: ['music', 'song', 'songs', 'album', 'artist', 'band', 'singer',
      'rap', 'hiphop', 'hip hop', 'rock', 'metal', 'pop', 'jazz', 'edm',
      'playlist', 'spotify', 'soundcloud', 'beat', 'beats', 'bass',
      'guitar', 'drums', 'piano', 'vocals', 'lyrics', 'verse', 'chorus',
      'fire', 'banger', 'slaps', 'vibe', 'vibes', 'vibing',
      'concert', 'tour', 'festival', 'dj', 'producer', 'remix',
      'apple music', 'tidal', 'vinyl', 'record', 'mixtape', 'ep',
      'single', 'feature', 'feat', 'collab', 'freestyle',
      'trap', 'drill', 'r&b', 'rnb', 'country', 'punk', 'grunge',
      'techno', 'house', 'dubstep', 'dnb', 'drum and bass', 'lo-fi', 'lofi',
      'classical', 'orchestra', 'symphony', 'acoustic', 'unplugged',
      'karaoke', 'singing', 'vocalist', 'cover', 'sample', 'instrumental',
      'headphones', 'speakers', 'subwoofer', 'audio', 'audiophile',
      'drop', 'hook', 'bridge', 'outro', 'intro', 'adlib',
      'grammy', 'billboard', 'top 40', 'charts', 'number one',
      'kendrick', 'drake', 'taylor swift', 'kanye', 'travis scott',
      'weeknd', 'sza', 'doja cat', 'bad bunny', 'metro boomin'],
    weight: 1.0
  },
  food: {
    keywords: ['food', 'eat', 'eating', 'hungry', 'starving', 'cook', 'cooking',
      'recipe', 'dinner', 'lunch', 'breakfast', 'snack', 'snacks',
      'pizza', 'burger', 'fries', 'chicken', 'steak', 'sushi', 'ramen',
      'taco', 'noodles', 'rice', 'pasta', 'salad', 'soup',
      'coffee', 'tea', 'drink', 'drinks', 'beer', 'water',
      'restaurant', 'takeout', 'delivery', 'fast food', 'mcdonalds',
      'delicious', 'yummy', 'tasty', 'gross', 'mid',
      'baking', 'grill', 'grilling', 'bbq', 'barbecue', 'smoker',
      'wings', 'ribs', 'brisket', 'nachos', 'quesadilla', 'burrito',
      'sandwich', 'sub', 'wrap', 'hotdog', 'corndog',
      'ice cream', 'cake', 'cookies', 'brownies', 'donuts', 'pancakes',
      'waffles', 'cereal', 'oatmeal', 'smoothie', 'milkshake',
      'soda', 'juice', 'energy drink', 'monster', 'redbull', 'gfuel',
      'chipotle', 'chick fil a', 'wendys', 'taco bell', 'kfc',
      'doordash', 'ubereats', 'grubhub', 'uber eats',
      'vegan', 'vegetarian', 'keto', 'diet', 'calories', 'macros',
      'meal prep', 'leftovers', 'microwave', 'air fryer', 'instant pot',
      'spicy', 'mild', 'sauce', 'hot sauce', 'seasoning', 'garlic',
      'cheese', 'bacon', 'egg', 'avocado', 'chocolate', 'peanut butter'],
    weight: 1.0
  },
  tech: {
    keywords: ['code', 'coding', 'programming', 'developer', 'dev', 'software',
      'javascript', 'python', 'java', 'html', 'css', 'react', 'node',
      'api', 'database', 'server', 'deploy', 'git', 'github',
      'bug', 'debug', 'error', 'crash', 'fix', 'feature',
      'computer', 'laptop', 'phone', 'iphone', 'android', 'app',
      'ai', 'artificial intelligence', 'machine learning', 'gpt', 'chatgpt',
      'wifi', 'internet', 'download', 'upload', 'browser', 'chrome',
      'windows', 'mac', 'linux', 'gpu', 'cpu', 'ram', 'ssd',
      'monitor', 'keyboard', 'mouse', 'setup', 'build', 'specs',
      'rgb', 'overclock', 'benchmark', 'bottleneck',
      'typescript', 'rust', 'golang', 'swift', 'kotlin', 'csharp',
      'docker', 'kubernetes', 'cloud', 'aws', 'azure', 'devops',
      'frontend', 'backend', 'fullstack', 'framework', 'library',
      'algorithm', 'data structure', 'leetcode', 'hackerrank',
      'nvidia', 'amd', 'intel', 'rtx', 'radeon', 'ryzen',
      'ultrawide', 'dual monitor', '4k', '1440p', '144hz', '240hz',
      'mechanical', 'custom keyboard', 'switches', 'keycaps',
      'headset', 'microphone', 'webcam', 'deskmat', 'cable management',
      'homelab', 'nas', 'raspberry pi', 'arduino', 'linux distro',
      'terminal', 'command line', 'open source', 'ide', 'vscode',
      'stackoverflow', 'reddit', 'hackathon', 'startup',
      'cybersecurity', 'vpn', 'encryption', 'hacker', 'password',
      'tablet', 'ipad', 'smartwatch', 'earbuds', 'airpods',
      'router', 'ethernet', 'fiber', 'ping', 'latency', 'bandwidth'],
    weight: 1.0
  },
  movies_tv: {
    keywords: ['movie', 'movies', 'film', 'show', 'tv', 'series', 'anime',
      'netflix', 'disney', 'hbo', 'hulu', 'crunchyroll', 'prime video',
      'watch', 'watching', 'binge', 'binged', 'season', 'episode',
      'spoiler', 'spoilers', 'trailer', 'release', 'sequel', 'prequel',
      'horror', 'comedy', 'action', 'thriller', 'sci-fi', 'fantasy',
      'marvel', 'dc', 'star wars', 'lotr', 'lord of the rings',
      'actor', 'actress', 'director', 'cinematography',
      'manga', 'weeb', 'waifu', 'shonen', 'isekai', 'mha', 'aot',
      'one piece', 'naruto', 'dragonball', 'jujutsu', 'demon slayer',
      'studio ghibli', 'miyazaki', 'chainsaw man', 'spy x family',
      'solo leveling', 'blue lock', 'vinland saga', 'frieren',
      'oscar', 'golden globe', 'emmy', 'award', 'nomination',
      'box office', 'blockbuster', 'flop', 'underrated', 'overrated',
      'documentary', 'docuseries', 'true crime', 'reality tv',
      'sitcom', 'drama', 'romance', 'romcom', 'animated', 'pixar',
      'dreamworks', 'a24', 'nolan', 'tarantino', 'scorsese', 'spielberg',
      'screenplay', 'writing', 'plot hole', 'twist ending', 'cliffhanger',
      'mid-credits', 'post-credits', 'after credits', 'reboot',
      'casting', 'adaptation', 'live action', 'cgi', 'vfx', 'practical effects',
      'subtitles', 'dubbed', 'original', 'soundtrack', 'score',
      'binge worthy', 'masterpiece', 'classic', 'cult classic',
      'streaming service', 'apple tv', 'peacock', 'paramount plus', 'max'],
    weight: 1.0
  },
  sports: {
    keywords: ['sports', 'football', 'soccer', 'basketball', 'baseball', 'hockey',
      'nfl', 'nba', 'mlb', 'nhl', 'mls', 'ufc', 'mma', 'boxing',
      'goal', 'score', 'touchdown', 'dunk', 'slam', 'knockout',
      'team', 'player', 'coach', 'season', 'playoffs', 'finals',
      'championship', 'trophy', 'mvp', 'goat', 'draft',
      'gym', 'workout', 'lift', 'lifting', 'gains', 'cardio',
      'run', 'running', 'marathon', 'fitness', 'exercise',
      'tennis', 'golf', 'cricket', 'rugby', 'volleyball', 'swimming',
      'olympics', 'world cup', 'super bowl', 'world series',
      'formula 1', 'f1', 'nascar', 'motorsport', 'racing',
      'esports', 'competitive', 'tournament', 'bracket', 'grand finals',
      'transfer', 'free agent', 'trade', 'contract', 'salary cap',
      'jersey', 'stadium', 'arena', 'halftime', 'overtime', 'penalty',
      'foul', 'red card', 'yellow card', 'offside', 'referee',
      'bench press', 'squat', 'deadlift', 'pull ups', 'push ups',
      'protein', 'creatine', 'pre workout', 'bulk', 'cut', 'shred',
      'personal record', 'pr', 'one rep max', 'rep', 'set',
      'yoga', 'stretching', 'recovery', 'rest day', 'active recovery',
      'crossfit', 'calisthenics', 'hiit', 'bodybuilding', 'powerlifting'],
    weight: 1.0
  },
  pets_animals: {
    keywords: ['dog', 'dogs', 'puppy', 'pupper', 'doggo', 'cat', 'cats', 'kitten', 'kitty',
      'pet', 'pets', 'animal', 'animals', 'bird', 'fish', 'hamster', 'rabbit', 'bunny',
      'snake', 'lizard', 'reptile', 'parrot', 'turtle', 'tortoise', 'ferret',
      'vet', 'veterinarian', 'adoption', 'rescue', 'shelter', 'breed',
      'walk', 'fetch', 'treat', 'treats', 'belly rubs', 'zoomies', 'boop',
      'meow', 'woof', 'bark', 'purr', 'howl', 'chirp',
      'cute', 'adorable', 'fluffy', 'chonky', 'chonk', 'smol',
      'golden retriever', 'german shepherd', 'husky', 'corgi', 'poodle',
      'siamese', 'tabby', 'maine coon', 'persian', 'bengal',
      'aquarium', 'terrarium', 'cage', 'leash', 'collar', 'toy',
      'wildlife', 'nature', 'safari', 'zoo', 'ocean', 'marine'],
    weight: 1.1
  },
  weather: {
    keywords: ['weather', 'rain', 'raining', 'rainy', 'snow', 'snowing', 'snowy',
      'sunny', 'sun', 'hot', 'cold', 'freezing', 'warm', 'humid',
      'storm', 'thunder', 'lightning', 'tornado', 'hurricane',
      'wind', 'windy', 'cloudy', 'clouds', 'fog', 'foggy', 'hail',
      'temperature', 'degrees', 'celsius', 'fahrenheit',
      'summer', 'winter', 'spring', 'fall', 'autumn',
      'forecast', 'climate', 'heatwave', 'blizzard', 'drought', 'flood'],
    weight: 0.9
  },
  sleep: {
    keywords: ['sleep', 'sleeping', 'sleepy', 'tired', 'nap', 'napping',
      'insomnia', 'cant sleep', 'awake', 'bed', 'bedtime', 'pillow',
      'dream', 'dreaming', 'nightmare', 'alarm', 'wake up', 'woke up',
      'all nighter', 'pulling an all nighter', 'staying up', 'night owl',
      'morning person', 'melatonin', 'caffeine', 'exhausted', 'passed out',
      'knocked out', 'dozed off', 'yawning', 'fatigue', 'rest'],
    weight: 1.0
  },
  school_work: {
    keywords: ['school', 'college', 'university', 'class', 'classes', 'lecture',
      'homework', 'assignment', 'essay', 'exam', 'test', 'quiz', 'midterm', 'final',
      'study', 'studying', 'grade', 'grades', 'gpa', 'professor', 'teacher',
      'degree', 'major', 'minor', 'graduate', 'graduation', 'semester',
      'campus', 'dorm', 'tuition', 'student loan', 'scholarship',
      'work', 'working', 'job', 'career', 'office', 'boss', 'coworker',
      'salary', 'paycheck', 'raise', 'promotion', 'interview', 'resume',
      'meeting', 'deadline', 'project', 'presentation', 'overtime',
      'remote', 'work from home', 'wfh', 'commute', 'clock in', 'clock out',
      'intern', 'internship', 'freelance', 'side hustle', 'nine to five'],
    weight: 1.0
  },
  travel: {
    keywords: ['travel', 'traveling', 'trip', 'vacation', 'holiday', 'flight',
      'airport', 'plane', 'fly', 'flying', 'road trip', 'drive', 'driving',
      'hotel', 'airbnb', 'hostel', 'resort', 'beach', 'mountain',
      'tourism', 'tourist', 'sightseeing', 'explore', 'exploring',
      'passport', 'visa', 'luggage', 'packing', 'suitcase', 'backpacking',
      'europe', 'asia', 'japan', 'korea', 'thailand', 'mexico', 'canada',
      'hawaii', 'vegas', 'new york', 'paris', 'london', 'tokyo',
      'cruise', 'train', 'bus', 'uber', 'lyft', 'taxi',
      'adventure', 'hiking', 'camping', 'skiing', 'snowboarding', 'surfing',
      'scuba', 'diving', 'skydiving', 'bungee', 'zip line',
      'souvenir', 'photos', 'sunset', 'sunrise', 'scenic', 'view'],
    weight: 1.0
  },
  fashion: {
    keywords: ['fashion', 'outfit', 'clothes', 'clothing', 'drip', 'fit', 'fits',
      'shoes', 'sneakers', 'jordans', 'nikes', 'adidas', 'yeezy', 'new balance',
      'hoodie', 'jacket', 'jeans', 'pants', 'shirt', 'hat', 'cap', 'beanie',
      'dress', 'skirt', 'suit', 'tie', 'blazer', 'coat',
      'style', 'aesthetic', 'streetwear', 'hypebeast', 'vintage', 'thrift',
      'brand', 'designer', 'gucci', 'nike', 'supreme', 'stussy',
      'shopping', 'mall', 'online shopping', 'sale', 'discount', 'drop',
      'jewelry', 'watch', 'chain', 'ring', 'bracelet', 'earrings',
      'haircut', 'hairstyle', 'hair', 'beard', 'fade', 'trim',
      'tattoo', 'tattoos', 'piercing', 'piercings', 'ink'],
    weight: 1.0
  },
  money: {
    keywords: ['money', 'cash', 'broke', 'rich', 'wealthy', 'salary', 'paycheck',
      'invest', 'investing', 'stocks', 'crypto', 'bitcoin', 'ethereum',
      'budget', 'savings', 'saving', 'debt', 'loan', 'mortgage', 'rent',
      'expensive', 'cheap', 'price', 'cost', 'deal', 'sale', 'discount',
      'millionaire', 'billionaire', 'passive income', 'side hustle',
      'taxes', 'tax', 'irs', 'refund', 'credit card', 'bank', 'atm',
      'paypal', 'venmo', 'cashapp', 'zelle', 'wire transfer',
      'nft', 'blockchain', 'trading', 'forex', 'options', 'wallstreetbets',
      'diamond hands', 'paper hands', 'hodl', 'to the moon', 'stonks',
      'robinhood', 'fidelity', 'portfolio', 'dividends', 'roi'],
    weight: 1.0
  },
  relationship: {
    keywords: ['relationship', 'dating', 'date', 'single', 'taken', 'couple',
      'girlfriend', 'boyfriend', 'gf', 'bf', 'wife', 'husband', 'partner',
      'crush', 'ex', 'breakup', 'broke up', 'love', 'romance', 'romantic',
      'tinder', 'bumble', 'hinge', 'dating app', 'swipe', 'match',
      'valentine', 'anniversary', 'wedding', 'engaged', 'engagement',
      'friend', 'friends', 'bestie', 'best friend', 'bff', 'homie', 'homies',
      'hanging out', 'chill', 'kickback', 'party', 'get together',
      'family', 'mom', 'dad', 'parents', 'sibling', 'brother', 'sister',
      'wholesome', 'support', 'loyalty', 'trust', 'communication'],
    weight: 0.9
  },
  cars: {
    keywords: ['car', 'cars', 'truck', 'suv', 'sedan', 'coupe', 'convertible',
      'engine', 'horsepower', 'hp', 'torque', 'turbo', 'supercharger',
      'manual', 'automatic', 'stick shift', 'transmission', 'exhaust',
      'drift', 'drifting', 'race', 'racing', 'track', 'drag race',
      'bmw', 'mercedes', 'audi', 'tesla', 'toyota', 'honda', 'ford',
      'chevrolet', 'chevy', 'porsche', 'lamborghini', 'ferrari', 'mustang',
      'corvette', 'camaro', 'supra', 'gtr', 'wrx', 'civic', 'miata',
      'electric vehicle', 'ev', 'hybrid', 'mpg', 'gas', 'diesel',
      'jdm', 'euro', 'muscle car', 'sports car', 'supercar', 'hypercar',
      'mod', 'mods', 'wheels', 'rims', 'wrap', 'tint', 'lowered', 'lifted',
      'oil change', 'brake', 'tire', 'tires', 'suspension', 'intake',
      'detailing', 'wash', 'wax', 'ceramic coating',
      'license', 'driving', 'road trip', 'highway', 'speeding', 'ticket'],
    weight: 1.0
  },
  creative: {
    keywords: ['art', 'artist', 'drawing', 'draw', 'painting', 'paint', 'sketch',
      'digital art', 'illustration', 'commission', 'commissions',
      'photography', 'photo', 'photos', 'camera', 'lens', 'editing',
      'photoshop', 'illustrator', 'procreate', 'clip studio', 'blender',
      'animation', 'animate', '3d', '3d modeling', 'render', 'rendering',
      'graphic design', 'design', 'logo', 'branding', 'typography',
      'writing', 'writer', 'novel', 'story', 'fanfic', 'fiction',
      'poetry', 'poem', 'creative writing', 'worldbuilding',
      'video editing', 'premiere', 'after effects', 'davinci resolve',
      'music production', 'fl studio', 'ableton', 'logic pro',
      'cosplay', 'crafts', 'diy', 'handmade', 'crochet', 'knitting',
      'woodworking', 'pottery', 'sculpture', 'calligraphy',
      'content creation', 'thumbnail', 'graphic', 'aesthetic'],
    weight: 1.0
  },
  horror_scary: {
    keywords: ['horror', 'scary', 'scared', 'creepy', 'spooky', 'terrifying',
      'ghost', 'ghosts', 'haunted', 'paranormal', 'supernatural',
      'zombie', 'zombies', 'vampire', 'werewolf', 'demon', 'possessed',
      'jumpscared', 'jumpscare', 'nightmare', 'sleep paralysis',
      'urban legend', 'creepypasta', 'backrooms', 'liminal',
      'true crime', 'serial killer', 'missing', 'mystery', 'cold case',
      'conspiracy', 'conspiracy theory', 'alien', 'aliens', 'ufo',
      'cryptid', 'bigfoot', 'mothman', 'skinwalker', 'wendigo',
      'dark web', 'deep web', 'unsolved', 'unexplained',
      'phobia', 'claustrophobia', 'arachnophobia', 'thalassophobia',
      'halloween', 'october', 'friday the 13th', 'exorcist',
      'found footage', 'analog horror', 'arg', 'iceberg'],
    weight: 1.1
  },
  mood_positive: {
    keywords: ['happy', 'excited', 'amazing', 'awesome', 'great', 'love', 'perfect',
      'best', 'incredible', 'insane', 'fire', 'goated', 'sick', 'dope',
      'lit', 'pog', 'pogchamp', 'poggers', 'lets go', 'let\'s go', 'letsgoo',
      'hype', 'hyped', 'w', 'dub', 'massive', 'clutch',
      'lol', 'lmao', 'lmfao', 'rofl', 'haha', 'hahaha', 'xd',
      'nice', 'cool', 'sweet', 'beautiful', 'legendary', 'epic',
      'gg', 'well played', 'wp', 'based', 'gigachad', 'chad',
      'sheesh', 'bussin', 'valid', 'goat', 'no cap', 'fr fr',
      'congratulations', 'congrats', 'proud', 'impressive', 'respect',
      'cracked', '🔥', '🎉', '💪', '😂', '🤣', 'W',
      'blessed', 'grateful', 'thankful', 'wholesome', 'heartwarming',
      'unreal', 'magnificent', 'phenomenal', 'outstanding', 'brilliant',
      'top tier', 'god tier', 'elite', 'premium', 'peak', 'prime',
      'glorious', 'majestic', 'flawless', 'immaculate', 'pristine'],
    weight: 0.8
  },
  mood_negative: {
    keywords: ['sad', 'angry', 'annoyed', 'frustrated', 'tilted', 'rage',
      'boring', 'bored', 'tired', 'exhausted', 'sleepy', 'dead',
      'trash', 'garbage', 'terrible', 'awful', 'worst', 'bad',
      'hate', 'sucks', 'pain', 'suffering', 'rip', 'f',
      'l', 'loss', 'fail', 'failed', 'unlucky', 'unfortunate',
      'bruh', 'down bad', 'oof', 'yikes', 'cringe', 'mid',
      'lag', 'laggy', 'lagging', 'disconnect', 'dc', 'crash',
      'toxic', 'troll', 'griefing', 'throwing', 'inting',
      'depressed', 'depressing', 'lonely', 'alone', 'stressed',
      'overwhelmed', 'burned out', 'burnout', 'drained', 'done',
      'over it', 'fed up', 'sick of', 'cant deal', 'spiraling',
      'disaster', 'catastrophe', 'ruined', 'wrecked', 'destroyed',
      'gutted', 'devastated', 'heartbroken', 'betrayed', 'scammed'],
    weight: 0.8
  },
  greeting: {
    keywords: ['hello', 'hey', 'hi', 'yo', 'sup', 'whats up', 'what\'s up',
      'good morning', 'good evening', 'good night', 'goodnight',
      'morning', 'evening', 'afternoon', 'gm', 'gn',
      'howdy', 'greetings', 'welcome', 'wb', 'welcome back',
      'bye', 'goodbye', 'cya', 'see ya', 'later', 'peace', 'gtg',
      'brb', 'back', 'im back', 'i\'m back',
      'hola', 'bonjour', 'konnichiwa', 'aloha', 'wassup', 'wsg',
      'waddup', 'heyy', 'heyyy', 'yooo', 'ayooo'],
    weight: 1.2
  },
  question: {
    keywords: ['what', 'how', 'why', 'when', 'where', 'who', 'which',
      'anyone', 'anybody', 'someone', 'does anyone', 'do you',
      'can you', 'could you', 'would you', 'is there',
      'thoughts', 'opinion', 'opinions', 'think', 'recommend',
      'suggestion', 'advice', 'help', 'tip', 'tips',
      'should i', 'is it worth', 'whats the best', 'favorite',
      'unpopular opinion', 'hot take', 'controversial', 'debate',
      'tier list', 'top 5', 'top 10', 'ranking', 'rate',
      'poll', 'vote', 'prefer', 'rather', 'would you rather'],
    weight: 0.7
  },
  meme: {
    keywords: ['meme', 'memes', 'ratio', 'copium', 'hopium', 'copypasta',
      'sus', 'amogus', 'among us', 'monke', 'stonks',
      'sigma', 'grindset', 'alpha', 'beta', 'npc', 'main character',
      'plot armor', 'real', 'not real', 'canon', 'fanfic',
      'certified', 'moment', 'energy', 'vibe check', 'rent free',
      'cope', 'seethe', 'mald', 'touch grass', 'grass',
      'skull', '💀', 'deadass', 'no way', 'cap', 'slay',
      'ate', 'period', 'queen', 'king', 'serve', 'iconic',
      'delulu', 'understood the assignment', 'no thoughts', 'brain rot',
      'skibidi', 'gyatt', 'rizz', 'rizzler', 'ohio', 'fanum tax',
      'aura', 'aura points', 'negative aura', 'edging', 'gooning',
      'mogging', 'mewing', 'looksmax', 'bonesmash', 'jelqing',
      'its giving', 'the way', 'not the', 'bestie', 'era',
      'roman empire', 'ick', 'red flag', 'green flag', 'beige flag',
      'gaslighting', 'gatekeeping', 'girlboss', 'gaslight gatekeep',
      'living my best life', 'no thoughts just vibes', 'chaos goblin',
      'feral', 'unhinged', 'chronically online', 'terminally online'],
    weight: 0.9
  }
};

function detectTopics(text) {
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/);
  const scores = {};

  for (const [topic, data] of Object.entries(TOPICS)) {
    let score = 0;
    const matched = [];
    for (const kw of data.keywords) {
      // Use word boundary check for short keywords, includes for longer ones
      if (kw.length <= 3) {
        const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(lower)) {
          score += data.weight;
          matched.push(kw);
        }
      } else {
        if (lower.includes(kw)) {
          score += data.weight;
          matched.push(kw);
        }
      }
    }
    if (score > 0) {
      scores[topic] = { score, matched, confidence: matched.length >= 2 ? 'high' : 'low' };
    }
  }

  // Sort by score descending
  const sorted = Object.entries(scores)
    .sort(([, a], [, b]) => b.score - a.score);

  return sorted.length > 0 ? sorted : null;
}

// ======================== SENTIMENT ANALYSIS ========================

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
function modifyResponse(base) {
  const baseLower = base.toLowerCase();

  // 40% chance to add a prefix
  if (Math.random() < 0.4) {
    const prefixType = ['agree', 'react', 'soft'][Math.floor(Math.random() * 3)];
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
  // 30% chance to add a suffix
  if (Math.random() < 0.3) {
    const suffixType = ['emphasis', 'filler', 'chill', 'hype'][Math.floor(Math.random() * 4)];
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
    /^(?:hey|hi|hello|yo|sup|whats up|what's up|howdy|hiya|heyo)(?:\s+(?:bot|smartbot|buddy|dude|bro|man|homie|fam))?[\s!?.]*$/i,
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
      'Ooh nice! How was {subject}? I heard good things',
      '{subject}?? Thats awesome, how are you liking it so far?',
      'W for getting into {subject}, its so good',
      'Yoo {subject} is fire, good choice',
      'Lets go!! {subject} is such a vibe',
      'No way you just started {subject}? Youre in for a treat',
      'Oh youre gonna love {subject} trust me',
      '{subject} is goated ngl, youre in for a ride',
    ],
    negative: [
      'Oof {subject} huh... yeah I get it, its rough',
      '{subject} really be testing patience sometimes',
      'I feel you on {subject}, its a hit or miss',
      'Yeah {subject} can be like that unfortunately lol',
    ],
    neutral: [
      'Oh nice! How far are you into {subject}?',
      '{subject} huh? Whats the vibe so far?',
      'Ooh tell me more about {subject}, how is it?',
      'Oh cool! First time with {subject} or coming back to it?',
    ],
  },
  recommending: {
    positive: [
      'Facts {subject} is actually so good',
      'I can vouch for that, {subject} is fire',
      'Been saying this!! {subject} deserves more love',
      'Adding {subject} to the list, good looks 🙏',
      'W recommendation, {subject} goes hard',
      'Ok bet Ill check out {subject}, sounds good',
      'You got good taste, {subject} is legit',
    ],
    neutral: [
      'Ive been hearing about {subject}, might have to check it out',
      '{subject}? Alright Ill give it a shot',
      'Ill take your word on {subject}, whats the best part?',
      'Hmm {subject}... sell me on it, why should I try it?',
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

function answerWithKnowledge(subject, intent) {
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
    const sentiment = Math.random();
    let pool;
    if (sentiment < 0.55) pool = opinions?.positive || opinions?.neutral || [];
    else if (sentiment < 0.8) pool = opinions?.neutral || opinions?.positive || [];
    else pool = opinions?.negative || opinions?.neutral || [];

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
        const prefixes = ['Idk I kinda think ', 'Hmm disagree a bit — ', 'Ngl hot take but ', 'Controversial take: '];
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

const BOT_GREETINGS = [
  'Yo whats good!',
  'Heyyy whats up',
  'Sup! How we doing today',
  'Yooo hey there',
  'Well well well look whos here',
  'Ayyy whats happening',
  'Hey! Im vibing, you?',
  'Oh hey! Just out here existing, whats up with you',
  'Waddup, Im just chilling over here',
  'Oh hi! I was just thinking about things you know, bot stuff',
  'Heyoo how are we doing',
  'Sup chat, anything good happening?',
  'Hey hey, the vibes are looking good today',
  'Oh nice someone said hi, I appreciate that honestly',
  'Yoo glad you stopped by whats going on',
  'Hello! Im doing great thanks for asking',
  'Hiyaa, just your friendly neighborhood bot',
  'Oh hi there! Whats the move today',
  'Ayo nice to see some life in here lol',
  'Hey! I was getting lonely over here not gonna lie',
];

// ======================== SMART TEMPLATES ========================

const TEMPLATES = {
  gaming: {
    generic: [
      'What game are you guys playing?',
      'Oh nice, what game?',
      'That sounds like a solid game tbh',
      'Gaming hits different late at night ngl',
      'That game is actually pretty fun',
      'I need to try that game out fr',
      'Is that game any good? Been thinking about it',
      'The gaming session is real tonight',
      'Anyone else grinding tonight? 🎮',
      'That game goes hard honestly',
      'Bro that game is addicting',
      'I been playing that too, it slaps',
      'W game choice honestly',
      'Is that game still popping?',
      'That game has such good vibes',
      'How many hours you got in that?',
      'Is it worth the grind though?',
      'Late night gaming session lets gooo',
      'The soundtrack in that game is fire btw',
      'That game had me up till 4am no cap',
      'The game selection tonight is elite',
      'I cant stop playing that game honestly',
      'That game is goated with the sauce',
      'Everyone keeps talking about that game',
      'My backlog is crying but I keep playing that',
      'Drop your steam name lets run it',
      'That game just different when you play with the boys',
      'Bro I need a squad for that game',
      'How is that game in 2026 though?',
      'Is the community still active?',
      'I uninstalled that game 3 times and keep coming back',
      'That game is a 10/10 experience',
      'The developers actually did a great job with that one',
      'Waiting for a sale to grab that one',
      'Is it on game pass?',
      'Cross platform or nah?',
      'That game runs smooth on everything',
      'You need friends for that or is solo good?',
      'How many GB is that game though lol',
      'The tutorials in that game dont teach you anything fr',
      'Day one purchase for sure',
      'Steam reviews say mixed but the game is actually fire',
      'The loading screens in that game are non existent its insane',
      'I keep meaning to start that game but my backlog is insane',
      'That game deserves way more attention than it gets',
      'Underrated game of the year candidate right there',
      'The replay value on that game is crazy',
      'Whats the learning curve like on that?',
      'The devs keep dropping updates too W developers',
      'That game looks mid from trailers but plays amazing',
      'My friends wont stop talking about that game',
      'Game pass carrying rn honestly',
      'I need to reinstall that game immediately',
      'That game was my childhood honestly',
      'The nostalgia from that game hits different',
      'Remember when that game first dropped? Times were different',
      'That game aged like fine wine',
      'Is there a demo or I gotta commit?',
      'Waiting for it to go on sale im not paying full price lol',
      'The mod community for that game goes crazy',
      'That game with mods is a completely different experience',
      'I got lost in that game for like 6 hours straight',
      'Time flies when youre playing that for real',
      'Thats one of those games you recommend to everyone',
      'The early game is slow but once it picks up though',
      'Controller or keyboard for that game?',
      'Native controller support or nah?',
      'That game at 60fps is a different game entirely',
      'My GPU was crying playing that on max settings',
      'Had to lower the graphics to actually play it lol',
      'That game is CPU intensive fr your processor matters',
      'Split screen or online only?',
      'LAN party vibes with that game no cap',
      'The character creator in that game is insane',
      'I spent 3 hours making my character before even playing',
      'Photo mode in that game produces actual art',
      'The attention to detail in that game is next level',
      'Easter eggs in that game are everywhere',
      'Did you find the secret area? No spoilers but look around',
      'The fishing minigame is always better than the actual game lol',
      'Side quests in that game are better than most main stories',
      'The story in that game made me feel things ngl',
      'That ending was not what I expected at all',
      'Multiple endings? Guess Im playing it again',
      'New game plus hits different on that one',
      'The endgame content is actually worth it',
      'They keep adding free DLC which is rare these days',
      'That games DLC is better than most full games',
      'Season 2 of that game is way better than season 1',
      'The balance patches actually made the game better for once',
      'Remember when that game was broken on launch lmao',
      'Redemption arc of the year for that games dev team',
      'The community is actually really wholesome for once',
      'Looking for people to play that game with drop your tag',
      'That game is perfect for winding down after a long day',
      'Cozy game energy right there',
      'Nothing beats a good story driven game',
      'Open world fatigue is real but that game different',
      'The inventory management in that game is pain',
      'Collecting everything in that game is my personality',
      'Completionist run or casual? Choose your fighter',
      'Speedrunners make that game look like a joke',
      'The world record for that game is actually insane look it up',
      'That game has the best community events',
      'In game events always bring the vibes',
      'The seasonal content in that game is elite',
      'Halloween event in that game goes hard every year',
      'They really put their heart into that game you can tell',
      'Passion project game vs corporate game and it shows',
      'Indie devs carrying the gaming industry rn',
      'AAA games could learn from that indie game for real',
      'The pixel art in that game is gorgeous',
      'Art style carries that game so hard',
      'That game has the best water physics change my mind',
      'Destruction physics in that game hit different',
      'The ragdoll in that game is comedy gold',
      'Bug or feature? In that game you never know',
      'The speedrun community for that game is elite',
      'Any% or 100%? Real gamers do both',
      'That game at 3am with headphones on is an experience',
      'Horror game at night with lights off is crazy brave',
      'That game has the best jump scares no cap',
      'Survival mode in that game taught me real stress',
      'Base building in that game is my therapy',
      'I spent more time decorating my base than playing the game',
      'The building system is so satisfying in that',
      'Farming simulator games are unironically relaxing',
      'That cozy game is my comfort game fr',
      'Everyone needs a comfort game and that one is mine',
      'Trading system in that game is wild',
      'The economy in that game is more complex than real life',
      'Auction house warriors know the real grind',
      'Crafting system is either amazing or tedious no middle ground',
      'The RNG in that game is brutal be warned',
      'Gacha rates in that game are criminal',
      'F2P or P2W? The debate continues',
      'That game respects your time which is rare',
      'Pay to win ruined what could have been a great game',
      'The anti cheat in that game is either goated or nonexistent',
      'Cheaters in that game are out of control honestly',
      'Custom lobbies in that game are the best content',
      'Private matches with friends hit different than ranked',
      'That game in VR is a whole different experience',
      'VR version of that game is actually insane',
      'Crossplay saves are so needed for that game',
      'Cloud saves saved my life when my PC died',
      'That games subreddit is either helpful or toxic no middle',
      'The wiki for that game is my bible',
      'Guide makers for that game deserve awards',
      'That game has the best community wikis',
      'Discord server for that game is popping',
      'Looking for guild for that game anyone?',
      'End game raids in that require a PhD honestly',
      'The skill ceiling in that game is infinite',
      'Easy to learn hard to master games are the best',
      'Pick up and play or is there a learning curve?',
      'That games tutorial should be studied by other devs',
      'The tutorial boss humbled me immediately',
    ],
    achievement: [
      'GG thats a huge W 🏆',
      'Yooo thats insane, well played!',
      'That clutch was actually clean',
      'Bro youre cracked at this game',
      'How did you even pull that off lol',
      'Certified gamer moment right there',
      'That was lowkey impressive ngl',
      'GG EZ 😎',
      'Youre built different at this game fr',
      'Thats a clip right there',
      'Someone clip that!',
      'Actual god gamer',
      'The skill gap is showing 💪',
      'No way you just did that lmao',
      'Thats going on the highlight reel',
      'Bro just casually being goated',
      'Main character energy right there',
      'The gaming chair is paying off',
      'That was the play of the year no cap',
      'Drop the settings you are locked in',
      'The aim was immaculate on that one',
      'Bro activated ultra instinct',
      'That was pixel perfect timing',
      'Gaming prodigy right here',
      'You make that look easy and its not',
      'The enemy team is shaking rn',
      'Bruh that was the cleanest thing Ive ever seen',
      'Put that on the resume honestly',
      'Esports ready 🏆',
      'The mechanical skill is unreal',
      'That was frame perfect execution right there',
      'How are you that consistent though',
      'You just made that look effortless what',
      'Thats not normal that was insane',
      'The reaction time on that play though',
      'Ok you might actually be too good at this',
      'Were witnessing greatness live',
      'Tell me you didnt just do that',
      'The disrespect on that play I love it',
      'Youre the reason they rage quit',
      'MVP MVP MVP',
      'You carried that entire game on your back',
      'Someone check this persons gaming chair',
      'That game sense is unmatched',
      'The play was so clean it felt scripted',
      'That was a once in a lifetime play for real',
      'I would have choked that 100% of the time',
      'The IQ on that play was actually massive',
      'Strategic genius and mechanical beast',
      'You just speed ran that like it was nothing',
      'That is what peak performance looks like',
      'The clutch gene is strong with this one',
      'Built different and they know it',
      'Your opponents need therapy after that',
      'That play just ruined someones day and I love it',
      'Do you practice or is this natural talent',
      'Muscle memory on that play was insane',
      'The movement was so smooth it looked like butter',
      'Wall to wall action and you survived all of it',
      'The team contribution was actually insane',
      'You literally 1v5d and won what',
      'The comeback from that position is legendary',
      'Down bad and still pulled off the win respect',
      'Thats what we call a certified carry right there',
      'Your back must hurt from carrying that hard',
      'That was an all time great play honestly',
      'Send that clip to the devs they need to see it',
      'Top 0.1% gameplay right there easy',
      'You just unlocked a new achievement in real life too',
      'Title screen worthy performance right there',
      'Hall of fame play no question',
      'The precision on that is actually scary',
      'Are you a robot? That was too precise',
      'Zero mistakes from start to finish how',
      'Flawless execution the whole time',
      'Not a single wasted move that was efficient as hell',
      'Economy of movement on another level',
      'That was textbook perfect play',
    ],
    fail: [
      'Pain 💀',
      'Bro that was rough lmao',
      'We dont talk about that one',
      'That was unfortunate 😂',
      'RIP, happens to the best of us',
      'Unlucky tbh, go next',
      'Nah that was the games fault not yours',
      'Controller threw itself',
      'Lag right? ...right? 😅',
      'The game said no today',
      'F in the chat',
      'Thats just the gaming experience lol',
      'Its not about winning its about... wait no',
      'That was a certified bruh moment',
      'We go agane 💪',
      'Keyboard wasnt plugged in obviously',
      'That was a skill issue and you know it 😂',
      'The input delay got you for sure',
      'Were gonna pretend that didnt happen',
      'Thats getting deleted from the vod lol',
      'Bro ragequit speedrun any%',
      'That was a learning experience right? Right?',
      'Even the NPCs felt bad for you',
      'The hitbox was lying I saw it',
      'I felt that in my soul',
      'The emotional damage from that play',
      'Thats the kind of play that makes you close the game',
      'The comeback arc starts now though',
      'Its giving uninstall energy 💀',
      'You took the L so we dont have to respect',
      'The game was rigged from the start honestly',
      'That is going in the fail compilation for sure',
      'The desk got punched after that one I know it',
      'Monitor almost got a fist through it',
      'Alt F4 was calling your name',
      'You peaked too early and it showed',
      'The gaming gods were not on your side today',
      'Imagine if someone was watching that live 😂',
      'That is the definition of a down bad play',
      'I cant believe what I just witnessed honestly',
      'The replay of that is gonna haunt you',
      'That was so bad it was almost impressive',
      'New definition of throwing right there',
      'At least it can only go up from here right',
      'Character development starts with rock bottom',
      'Everyone has off games its fine its fine',
      'The tilt after that play must be immeasurable',
      'Please tell me you at least laughed at that',
      'That play belongs in a museum of mistakes',
      'Historical L right there',
      'The killcam after that was disrespectful',
      'Outplayed outgunned and outmaneuvered completely',
      'That was a whole series of unfortunate events',
      'Murphy law speedrun right there',
      'Everything that could go wrong did go wrong',
      'Your luck stat is at zero confirmed',
      'The RNG gods have abandoned you today',
      'Even the game felt sorry for you I think',
      'That death was creative at least give yourself that',
      'You found a new way to die nobody has seen before',
      'Speed ran to the death screen',
      'The respawn timer felt extra long after that one huh',
      'Walk of shame back to your stuff after that',
      'Lost all your inventory from that? Pain',
      'The friendly fire was not friendly at all',
      'Teamkilled? Yikes the trust issues after that',
      'You literally walked into that one lol',
      'The trap was so obvious but here we are',
      'Fell for the oldest trick in the book',
      'Got baited so hard its actually funny',
      'The fake out got you good admit it',
      'You had one job and chose violence against yourself',
      'Self sabotage at its finest right there',
      'The panic button press that made everything worse',
      'Wrong button wrong time wrong everything',
      'Fat fingered the ability at the worst moment possible',
      'Used your ultimate on absolutely nothing beautiful',
      'Wasted everything for that? Pain',
      'The economy round was not economical at all',
    ],
    boss: [
      'That boss is a nightmare honestly',
      'Did you beat it though??',
      'How many tries did that take haha',
      'That boss fight goes crazy',
      'The boss music probably slaps though',
      'I got stuck on that boss for hours',
      'Just dodge bro its easy (its not easy)',
      'That boss has zero chill',
      'Bosses in that game are built different',
      'Did it drop anything good at least?',
      'That boss made me question my gaming abilities',
      'The second phase is where it gets real',
      'You gotta learn the patterns',
      'I had to look up a guide ngl',
      'That boss was designed by a psychopath fr',
      'The feeling of finally beating it though >>> everything',
      'Did you rage or stay calm? Be honest',
      'Some bosses are just built to destroy your confidence',
      'The run back to the boss is the real torture',
      'That boss has like 47 health bars',
      'Phase 3??? There was a phase 3???',
      'The healing window is so tiny on that fight',
      'That boss teaches you patience or teaches you rage',
      'I looked up the guide after attempt 50',
      'That attack is literally undodgeable I swear',
      'Every time you think the boss is dead... another health bar',
      'The relief after beating that boss is unmatched',
      'Your hands were shaking after that kill I know it',
      'That boss made me rethink my entire build',
      'Had to respect and change my whole strategy',
      'Summoning signs required for that boss honestly',
      'Solo or you brought help? No judgment',
      'That boss arena is beautiful though at least',
      'The lore behind that boss is actually really cool',
      'That boss was harder than the final boss what',
      'Optional boss being harder than the story boss is crazy',
      'The music carried me through that fight honestly',
      'When the choir kicks in during the boss fight',
      'That boss has the most satisfying kill animation',
      'First try? Yeah right sure buddy 😂',
      'That boss punishes greed so hard',
      'Dont get greedy on the openings thats how you die',
      'The window to attack is like half a second good luck',
      'That boss teaches you to be patient or die trying',
      'I nearly threw my controller at that boss fr',
      'The relief dopamine when you finally beat that boss',
      'Beating that boss is a core memory',
      'I texted my friends when I beat it thats how hype I was',
      'That boss has entered my nightmares permanently',
      'That boss fight is actually a masterpiece of game design',
      'The difficulty spike at that boss is INSANE',
      'Everything before that boss was the tutorial apparently',
      'I thought I was good at the game then that boss happened',
      'The enrage timer on that boss is brutal',
      'DPS check boss right there if you cant put out damage GG',
      'That boss punishes you for every mistake no mercy',
      'The hitbox on that bosses attack is bigger than my screen',
      'One shot mechanics in a boss fight should be illegal',
      'The grab attack from that boss... instant death every time',
    ],
    competitive: [
      'Ranked grind is real tonight huh',
      'What rank are you at?',
      'Ranked is either a W or pure suffering no in between',
      'The ranked experience 💀',
      'Elo hell is real and we all live there',
      'Are you climbing or falling? Be honest',
      'Ranked at 3am hits different (worse)',
      'One more game... (it was not one more game)',
      'The matchmaking is crazy sometimes',
      'Ranked makes you question life honestly',
      'Solo queue is a different kind of pain',
      'The teammates are always the problem right lol',
      'What role do you main?',
      'Current meta is wild right now',
      'You gained or lost rank today? Truth only',
      'The win streak is coming I can feel it',
      'Hardstuck is a lifestyle at this point',
      'Just one more win for the next rank right?',
      'The late night ranked gamble never pays off',
      'Teammates diff is real sometimes',
      'When you get good teammates its like winning the lottery',
      'The promo games are always the sweatiest',
      'Why does matchmaking always find the worst lobbies',
      'Ranked anxiety is a real thing',
      'You queueing up or done for tonight?',
      'The rank reset pain is coming soon',
      'Placements are the most stressful games of the season',
      'Where did you end up last season?',
      'The grind from gold to plat is wild',
      'Diamond lobby is where the real pain starts',
      'Every rank feels like elo hell at some point',
      'The comms in ranked are either amazing or nonexistent',
      'Why do people go afk in ranked of all modes',
      'Dodge or play with the troll? The eternal dilemma',
      'My mental is gone after that ranked session',
      'Taking a break from ranked for my health honestly',
      'Warmup games before ranked or straight in?',
      'The enemy team always has a smurf I swear',
      'My rank does not reflect my skill and thats a hill I die on',
      'Peak rank vs current rank dont ask me about it',
      'Decay system in that game is so punishing',
      'Havent played in a week and lost all my progress',
      'The mmr system is rigged change my mind',
      'Winners queue and losers queue are definitely real',
      'Getting carried to a rank you dont belong in is rough',
      'The imposter syndrome at a new rank is real',
      'You belong at that rank you earned it',
      'The grind pays off when you hit that new rank',
      'That rank up screen hits different at 2am',
      'Screenshot the rank up its a historic event',
      'The demotion game is the scariest game you can play',
      'Playing on a loss streak is how you end up in bronze',
      'Know when to stop thats the real ranked skill',
      'Tilt queueing is the enemy of climbing',
      'The mental game is 50% of ranked at least',
      'Warm up in norms before ranked trust me',
      'Aim trainer before ranked or raw dawg it?',
      'The one trick to climbing is consistency not flashy plays',
      'Fundamentals beat mechanics at every rank',
    ]
  },
  stream: {
    generic: [
      'Stream was fire today 🔥',
      'When is the next stream??',
      'I always catch the streams, they go hard',
      'Stream vibes are unmatched fr',
      'Best stream in a while honestly',
      'The content has been so good lately',
      'Stream when?? 👀',
      'I missed the stream noooo',
      'Anyone catch the last stream?',
      'The streams keep getting better',
      'Chat was wild during that stream lol',
      'The energy on stream was crazy',
      'Stream was goated today',
      'Whos ready for next stream?',
      'That stream was actually so entertaining',
      'The content is elite ngl',
      'I need to catch more streams fr',
      'Stream highlights go crazy every time',
      'The community here is actually so chill',
      'Best part of stream is always the chat tbh',
      'The stream schedule is perfect for my timezone',
      'I always fall asleep during streams and wake up to chaos',
      'Chat interaction on stream is top tier',
      'The stream quality has been insane lately',
      'I had that stream on in the background all day',
      'When the stream goes live my productivity dies',
      'Chat was carrying the stream today ngl',
      'The reactions on stream had me dying 😂',
      'Stream snacks are mandatory for watching',
      'That stream had everything honestly',
      'The chill streams are actually the best ones',
      'Stream VODs are saving me when I miss live',
      'That was one of those streams you had to be there for',
      'The community streams hit different fr',
      'I set an alarm for stream time not gonna lie',
      'Chat was peaking during that segment',
      'The production quality keeps going up',
      'Love the variety in the stream content',
      'That just chatting section was actually amazing',
      'The raids are always so fun',
      'Getting hosted feels like a surprise party',
      'Stream alerts going off back to back',
      'The emote wall during that moment was insane',
      'I came for the games and stayed for the vibes',
      'The community built here is actually special',
      'Lurking since the beginning 👀',
      'Been here since day one and the growth is insane',
      'The stream never misses honestly',
      'Always leave the stream in a better mood',
      'The engagement on stream is unreal',
      'That cooking segment on stream was unexpected but elite',
      'When the stream goes over time and nobody complains',
      'Extra long stream today? Say less im staying',
      'The variety content keeps things fresh',
      'IRL streams when?? Those would be fire',
      'The camera angle upgrade was needed honestly',
      'Sound quality on stream is really good',
      'The overlay redesign looks clean',
      'Channel point predictions are always fun',
      'I lost all my channel points but it was worth it',
      'The donation messages are always hilarious',
      'TTS on stream is either comedy gold or pure chaos',
      'Bits and subs going crazy today',
      'That gifter is the real MVP of the stream',
      'Anonymous gifter dropping bombs in here',
      'The sub train is still going what',
      'The watch hours on this stream must be insane',
      'Everyone is active in chat today love to see it',
      'Chat moves so fast when it gets hype',
      'Slow mode needed when chat gets this wild',
      'The moderators are working overtime today lol',
      'Shoutout to the mods keeping chat clean',
      'VIP chat hits different during big moments',
      'The stream title is already fire',
      'That category change mid stream was unexpected',
      'The game choice for today is perfect',
      'Multi stream setup is so clean',
      'Dual PC stream quality is on another level',
      'The bitrate is chef kiss today no buffering at all',
      'Stream has been going for hours and still going strong',
      'Marathon stream energy right here',
      'The dedication to streaming is actually inspiring',
      'How long has the stream been going? feels like it just started',
      'Time flies during good streams',
      'Chat replay should be a thing for moments like that',
      'That clip is going to blow up on TikTok',
      'Stream clips on social media bringing everyone in',
      'The growth has been insane congrats on the follows',
      'Road to affiliate/partner is happening',
      'Consistent schedule is key and you nailed it',
      'The networking with other streamers is paying off',
      'That collab stream was the best content this month',
      'Co-streams with friends are always the move',
      'The stream setup tour was overdue and it looked clean',
      'Facecam on or off? Both are valid',
      'The green screen setup is looking professional',
      'Stream deck moments when the right sound plays',
      'The sound alerts selection is top tier',
    ],
    hype: [
      'LETS GOOO 🔥🔥🔥',
      'THE STREAM IS LIVE LETS GO',
      'HYPE HYPE HYPE',
      'Oh its about to go crazy',
      'This is gonna be a good one I can feel it',
      'Everyone get in here!!',
      'We are so back',
      'The hype is REAL',
      'I been waiting for this all day',
      'Time to vibe 😎',
      'EVERYBODY GET IN HERE NOW',
      'DROP EVERYTHING STREAM IS LIVE',
      'ITS GO TIME CHAT',
      'The energy is THROUGH THE ROOF',
      'This stream is going to break records I feel it',
      'The hype train is leaving the station ALL ABOARD',
      'Chat is about to go INSANE',
      'Best notification of the day right there',
      'I SPRINTED to my computer for this',
      'WE ARE SO BACK ITS NOT EVEN FUNNY',
      'THE MOMENT WE HAVE ALL BEEN WAITING FOR',
      'Clear your schedule this is gonna be epic',
      'Canceling all my plans for this stream',
      'The anticipation was killing me',
      'Chat is already at 100 energy before it even started',
      'THIS IS NOT A DRILL THE STREAM IS LIVE',
      'The special stream is finally happening',
      'I can already tell this is gonna be legendary',
      'My body is ready for this stream',
      'The countdown was worth the wait',
      'EVERYONE TYPE 1 IF YOURE HYPED',
      'The hype emotes are flooding chat I love it',
      'This stream is the main event tonight',
      'PRIME TIME STREAM BABY',
      'WE EATING GOOD TONIGHT WITH THIS CONTENT',
      'The notification popped up and I ran',
      'Set everything aside stream is priority one',
      'THIS IS THE ONE CHAT THIS IS THE ONE',
      'Energy levels maximum capacity',
      'The whole community showed up for this one',
      'Record breaking vibes in here tonight',
      'Chat is moving at light speed rn',
      'THE HYPE NEVER DIES IN HERE',
      'We stay winning with streams like these',
      'Goosebumps energy right now',
      'The electricity in chat is insane',
      'IVE BEEN REFRESHING THE PAGE FOR AN HOUR',
      'Finally the wait is over LETS GOOOO',
      'This deserves every single viewer it gets',
    ]
  },
  music: {
    generic: [
      'Song name?? 🎵',
      'This song actually slaps',
      'The music taste here is W',
      'Add that to the playlist fr',
      'Banger after banger honestly',
      'The vibes are immaculate rn',
      'That beat goes crazy',
      'Who put you on this song? Its fire',
      'Spotify playlist when??',
      'The music hits different at night',
      'Certified banger 🔥',
      'Good taste in music fr fr',
      'This playlist is actually goated',
      'I need this song in my life',
      'The bass on that track though 🔊',
      'Music is carrying the vibe rn',
      'Shazam moment',
      'This song is on repeat for sure',
      'Drop the playlist link 🎧',
      'That album was so good btw',
      'The production on that track is insane',
      'Who produced that? The beat is crazy',
      'This song just unlocked a core memory',
      'Perfect driving music right there',
      'The lyrical content is actually deep',
      'This artist never misses honestly',
      'Been listening to that on repeat all week',
      'That song hits harder with good headphones',
      'The music video was fire too',
      'Lowkey this might be song of the year',
      'The features on that album were perfect',
      'I discovered that song at 2am and it changed my life',
      'That genre is underrated honestly',
      'Live performance of that must be insane',
      'The transition between those two songs 🤌',
      'This song is therapy honestly',
      'The bassline in that track is criminal',
      'Anyone else have this on their wrapped?',
      'The sample they used in that is so clever',
      'That dropped at the perfect time',
      'The album cover art is actually fire too',
      'Music taste is the true personality test',
      'You can tell a lot about someone by their playlist',
      'Late night drives with that song on repeat',
      'That song at golden hour in the car hits different',
      'Windows down volume up that kind of song',
      'Aux cord privileges are not given lightly',
      'Hand me the aux I got the perfect song for this moment',
      'The playlist name is probably something unhinged lol',
      'Liked songs playlist is just 3000 random vibes',
      'The discover weekly actually came through this week',
      'Release radar never misses lately',
      'That artist dropped without warning and its fire',
      'Surprise album drops are the best',
      'The deluxe version better have more tracks',
      'The bonus tracks are better than the main album sometimes',
      'That feature was unexpected but it worked so well',
      'The chemistry between those two artists is insane',
      'Collab album when?? The world needs it',
      'Tour announced yet? Need those ticket prices asap',
      'Concert tickets are so expensive now but worth it',
      'That artist live is a completely different experience',
      'The energy at that concert was unreal',
      'Festival lineup this year is actually stacked',
      'Front row at a concert is a life changing experience',
      'The mosh pit energy for that song must be insane',
      'Acoustic version of that song hits even harder',
      'The unplugged version shows the real talent',
      'That cover version might be better than the original',
      'Hot take the remix is better than the original',
      'The original is always better fight me',
      'That song has been in my head for 3 days straight',
      'Earworm status that song wont leave my brain',
      'Need to add that to every single playlist I have',
      'That genre crossover shouldnt work but it does',
      'Country rap? Pop punk? The genre blending is crazy now',
      'Lo-fi beats for studying is undefeated background music',
      'The study playlist is doing heavy lifting right now',
      'Working out to that song adds 10lbs to my bench press',
      'Gym playlist is sacred territory dont touch it',
      'That pregame playlist gets me pumped every time',
      'Cooking playlist is an underrated genre',
      'Shower concerts to that song are undefeated',
      'The transition from that song to the next one in the album',
      'That music video deserved a movie budget',
      'The storyline across the album is actually genius',
      'Concept albums dont get enough love',
      'That artists discography is actually flawless',
      'No skips on that album seriously',
      'Every track on that album is a single quality',
      'Deep cuts from that artist are better than the hits',
      'The B-sides from that era are criminally underrated',
      'That songs bridge is the best part and you know it',
      'When the beat switches on that track',
      'The beat switch caught me off guard and I loved it',
      'Producers are the unsung heroes of music fr',
    ]
  },
  food: {
    generic: [
      'Now Im hungry thanks 😂',
      'That sounds so good rn',
      'What are you eating? Im jealous',
      'Food talk at this hour is dangerous',
      'Im ordering food after this conversation',
      'That sounds bussin',
      'W food choice',
      'Bro stop youre making me hungry 😭',
      'I could go for some of that rn',
      'Late night food talk is a vibe',
      'Pizza or burger though? Hard choice',
      'Food pics or it didnt happen',
      'The midnight hunger is real',
      'Thats a solid meal right there',
      'I need that in my life immediately',
      'You had me at food 🍕',
      'What time is it? Snack time apparently',
      'Calories dont count after midnight right?',
      'The food conversation always hits different',
      'Someone get me doordash rn',
      'My stomach literally just growled reading that',
      'Thats a chef kiss meal right there 🤌',
      'The seasoning on that must be perfect',
      'Food is literally the best topic',
      'Eating good tonight huh? Save me some',
      'That meal goes hard not gonna lie',
      'The portions better be massive for that',
      'Comfort food hits different when youre tired',
      'Whats your go-to order from there?',
      'Free food always tastes better idk why',
      'That food looks like a hug in a bowl',
      'The struggle of choosing what to eat is REAL',
      'My wallet says no but my stomach says yes',
      'Home cooked or restaurant? Both valid',
      'That recipe sounds too good to be that easy',
      'Bro unlocked a new craving for me',
      'The food coma after that must be elite',
      'Adding that to my must-try list',
      'Breakfast food at any time of day is a W',
      'The leftovers hit just as hard sometimes',
      'Reheated food is either amazing or a disaster',
      'Microwave reheating is an art form',
      'Air fryer changed my whole relationship with food',
      'Everything is better air fried prove me wrong',
      'The crunch from the air fryer is unmatched',
      'Instant pot meals when you dont wanna cook but need food',
      'Slow cooker meals fill the whole house with vibes',
      'Mac and cheese is the ultimate comfort food',
      'Grilled cheese and tomato soup on a cold day',
      'Ramen when its raining outside is peak existence',
      'That late night bowl of cereal hits so different',
      'Cereal is acceptable food at any time',
      'The debate: is a hot dog a sandwich?',
      'The cereal before or after milk debate will never end',
      'Wings: boneless or bone-in? I will die on this hill',
      'Ranch or blue cheese with wings? Choose carefully',
      'Hot sauce tier list would break this chat',
      'That level of spicy is just pain not flavor anymore',
      'Milk after spicy food is survival not weakness',
      'The burn was worth it though right?',
      'Street food from that country is on another level',
      'Food trucks are underrated gems of the food world',
      'Hole in the wall restaurants always have the best food',
      'The fanciest looking restaurant had the smallest portions',
      'Fine dining portions for $50? Give me a burger instead',
      'The presentation was beautiful but I was still hungry',
      'Buffet strategy: skip the bread go straight for the good stuff',
      'All you can eat is a challenge not a suggestion',
      'That dessert was the star of the whole meal',
      'Dessert stomach is a real thing I always have room',
      'Ice cream flavor debate GO',
      'Mint chocolate chip is either the best or worst flavor',
      'Controversial take: pineapple on pizza is actually good',
      'That pizza debate will never be settled and I love it',
      'Deep dish or thin crust? Both are valid',
      'NY pizza vs Chicago pizza the eternal battle',
      'Homemade pizza always tastes better than delivery',
      'That cooking channel on YouTube taught me everything',
      'YouTube cooking videos at 2am when Im not even hungry',
      'The secret ingredient is always butter lets be honest',
      'Garlic makes everything better thats just facts',
      'That seasoning combo was a game changer',
      'Meal prep Sunday is either productive or a disaster',
      'The grocery bill for that recipe was how much??',
      'Cooking for one is depressing but eating for one is peaceful',
      'That snack was supposed to be a snack not the whole bag',
      'The bag was not finished it was simply eliminated',
      'Water is technically the best drink but coffee exists',
      'Coffee is a personality trait at this point',
      'Iced coffee in December? Absolutely valid',
      'Energy drinks are carrying me through life rn',
      'Boba tea is always the right choice',
      'That smoothie recipe is how many ingredients??',
    ]
  },
  tech: {
    generic: [
      'What specs you running?',
      'Tech talk lets gooo 🖥️',
      'RGB makes it run faster everyone knows that',
      'Have you tried turning it off and on again?',
      'That setup sounds clean',
      'What monitor are you using?',
      'Thats a solid build',
      'Budget build or nah?',
      'Frame rate matters more than anything',
      'That tech stack is fire actually',
      'Cable management is an art form',
      'Upgrade time soon?',
      'The setup glow up is real',
      'Tech specs conversation, we in deep',
      'What keyboard are you rocking?',
      'Mechanical keyboard gang 🎹',
      'How many tabs do you have open be honest',
      'Chrome eating all your ram again?',
      'That coding project sounds cool though',
      'Dark mode or light mode? Choose wisely',
      'The desk setup content is top tier',
      'How much did that build cost you?',
      'Bruh my PC is crying just hearing about your specs',
      'The cable management is either perfect or a war crime no in between',
      'What mousepad are you using? Details matter',
      'That monitor refresh rate is insane',
      'The glow up from a tech upgrade hits different',
      'I need to do a PC cleaning its been months',
      'Thermal paste reapplication is self care change my mind',
      'Running at max settings like a boss',
      'The setup tour when??',
      'What chair are you rocking? Comfort is key',
      'Dual monitor life is the way',
      'That loading speed is actually impressive',
      'The bottleneck calculator says otherwise lol',
      'The new hardware drops are looking crazy',
      'That desk setup belongs on r/battlestations',
      'SSDs changed my life and thats not an exaggeration',
      'How is the airflow in that case?',
      'The peripheral game is strong',
      'Wireless vs wired mouse the debate of the century',
      'That mouse weight is perfect for FPS gaming',
      'The DPI settings on that mouse are wild',
      'Vertical monitor for coding is game changing',
      'Triple monitor setup or ultrawide? Tough choice',
      'The USB-C everything life is actually convenient',
      'Dongle life is pain when you need all the ports',
      'That laptop thermal throttles just by looking at it',
      'Gaming laptop vs desktop the eternal struggle',
      'The portability of a laptop vs the power of a desktop',
      'That phone battery lasts how long?? Impressive',
      'Screen on time is the real phone benchmark',
      'The camera on that phone takes insane photos',
      'Pro Max Ultra Mega Plus what are these phone names',
      'Software updates breaking everything is tradition at this point',
      'That OS update bricked someones machine again',
      'New Windows update and nothing works classic',
      'Linux users explaining why they use Linux unprompted',
      'Mac vs Windows vs Linux the trilogy of hate',
      'Have you considered switching to Linux? 😂',
      'The tech stack for that project is modern and clean',
      'Microservices or monolith? Depends on the project honestly',
      'That API response time is impressive',
      'The database query optimization is satisfying work',
      'Clean code is self documenting code change my mind',
      'Documentation? What documentation? 😂',
      'The commit messages tell a story of desperation',
      'Git merge conflicts are my supervillain origin story',
      'Stack overflow copypaste engineering 💪',
      'That error message is completely unhelpful thanks',
      'The bug that only appears in production never in dev',
      'Works on my machine is not a valid deployment strategy',
      'The deployment went smooth? Lies. Somethings broken.',
      'CI/CD pipeline green on the first try? Suspicious',
      'The code review was 300 files lgtm 👍',
      'Rubber duck debugging actually works try it',
      'The 3am breakthrough that fixes everything',
      'Taking a walk fixes more bugs than debugging does',
      'The imposter syndrome in tech is real but youre doing great',
      'Self taught devs are built different honestly',
      'CS degree vs bootcamp vs self taught all valid paths',
      'That framework just released version 47 this year',
      'JavaScript frameworks coming out faster than I can learn them',
      'AI is either gonna take our jobs or make them easier',
      'Copilot is carrying my coding sessions ngl',
      'Smart home setup is either convenient or a security nightmare',
      'The server rack in the closet is a fire hazard but its cool',
      'Pi-hole blocking ads on the whole network is glorious',
      'Custom DNS for the homies who know what that means',
      'That NAS setup is goals for data hoarders',
      'Backing up data is the thing everyone should do but nobody does',
      'The hard drive failure without backup is a horror story',
      'E-waste is a real problem we need to talk about it more',
    ]
  },
  movies_tv: {
    generic: [
      'No spoilers please!! 🙈',
      'That show is so good omg',
      'I need to watch that still',
      'Is it actually worth watching though?',
      'My watchlist is never ending at this point',
      'That was such a good episode',
      'The ending had me shook',
      'Who else binged the whole thing?',
      'That show lives rent free in my head',
      'The cinematography was actually insane',
      'I rate that show 10/10 fr',
      'Season 2 when??',
      'That plot twist was wild',
      'Im so behind on everything lol',
      'Netflix and chill... with the homies 😂',
      'That anime goes crazy btw',
      'Sub or dub debate still going on?',
      'The manga is better (mandatory opinion)',
      'That character development though 👏',
      'I cried and Im not ashamed',
      'The pacing in that show is perfect',
      'They better not cancel that show',
      'The villain in that is actually well written',
      'That opening scene hooked me immediately',
      'I stayed up way too late binge watching that',
      'The cliffhanger at the end though??',
      'Im emotionally invested in these fictional characters',
      'That show ruined my sleep schedule',
      'Everyone keeps recommending this I gotta watch it',
      'The acting in that scene was phenomenal',
      'That show deserves every award it gets',
      'The world building in that is next level',
      'I think about that ending constantly',
      'How did I not know about this show before',
      'The fandom for that show is wild lol',
      'I binged that in one sitting no regrets',
      'That crossover episode was everything',
      'The animation quality is ridiculous',
      'If you havent watched it yet what are you doing',
      'That show changed the genre honestly',
      'The way they handle foreshadowing in that show is brilliant',
      'Every detail matters when you rewatch',
      'Second watch reveals so many hidden details',
      'The fan theories for that show are wild',
      'Reddit theories ended up being right somehow',
      'The show surpassed the source material and its actually good',
      'Reading the book after watching hits different',
      'The book was better but the show was still great',
      'That POV switch in the show was genius storytelling',
      'The unreliable narrator thing blew my mind',
      'That bottle episode was better than most action episodes',
      'The one shot sequence in that episode was incredible',
      'That long take scene was technically insane to film',
      'The sound design in that scene gave me chills',
      'No music in that scene and it was more powerful',
      'The silence in that moment spoke louder than any dialogue',
      'That dialogue writing is actually quotable',
      'I use quotes from that show in daily life',
      'The memes from that show are elite',
      'That show has the best meme format templates',
      'The fandom is either wholesome or completely unhinged',
      'Ship wars in that fandom are brutal stay away',
      'The chosen one trope is tired but that show did it different',
      'Subverting expectations can work when done right',
      'That season finale ruined me emotionally',
      'The mid season twist was better than most finales',
      'How is that show not talked about more?',
      'Criminally underrated show right there',
      'That show was ahead of its time and people are just now catching on',
      'Watching it week by week vs binging two different experiences',
      'Binging is better for plot heavy shows',
      'Week by week builds the hype though',
      'The theories between episodes are half the fun',
      'That post credits scene changed everything',
      'Staying after the credits in movies now because of marvel',
      'That horror movie genuinely scared me and Im not easy to scare',
      'Jump scares are cheap but that movie earned its scares',
      'The slow burn horror is way scarier than jump scare stuff',
      'That movie made me think about it for days after',
      'That documentary changed how I see things honestly',
      'True crime docs are addicting but also keep me up at night',
      'The deep dive documentaries on YouTube are just as good as Netflix',
      'Anime pacing can be rough but when it hits it HITS',
      'That fight scene in that anime was peak animation',
      'Studio going all out on that scene was worth the wait',
      'Filler episodes in anime are the bane of my existence',
      'Manga readers spoiling anime onlys is criminal behavior',
      'The opening theme of that show is an absolute banger',
      'Skipping the intro should be illegal for that show',
      'That shows opening credits are actually art',
      'End credits scenes being important now means I cant leave early',
    ]
  },
  sports: {
    generic: [
      'What a game that was!',
      'Did you see that play?? 🤯',
      'That was a crazy finish',
      'W take',
      'L take ngl',
      'That team is looking good this year',
      'ESPN top 10 moment right there',
      'That player is built different',
      'The offseason moves are gonna be interesting',
      'Fantasy league update anyone?',
      'That ref was blind smh',
      'Biggest upset of the season??',
      'The atmosphere at those games must be insane',
      'That play will be remembered forever',
      'Playoffs are gonna be wild this year',
      'The GOAT debate continues...',
      'Gym gains update? 💪',
      'That workout routine sounds brutal',
      'Leg day is the real boss fight',
      'Protein shake time 🥛',
      'That comeback was legendary',
      'The defense was insane that game',
      'That buzzer beater though?? INSANE',
      'The crowd went absolutely crazy for that',
      'Highlights from that game are everywhere',
      'How did that not make the top plays?',
      'The coaching decisions were questionable ngl',
      'That player deserves MVP honestly',
      'The rivalry game is always the best',
      'Fantasy football is ruining my friendships 😂',
      'The draft class this year is stacked',
      'I need to start going to the gym again fr',
      'That throw was a dime',
      'The stamina on that player is unreal',
      'Watching sports with the squad just hits different',
      'The pregame analysis was spot on',
      'That injury is devastating for the team',
      'The halftime show was actually fire',
      'Home field advantage is real',
      'That athletes work ethic is inspiring honestly',
      'The retirement speech hit me in the feels',
      'End of an era when legends retire',
      'The next generation of athletes is looking insane',
      'Young talent coming through the ranks is exciting',
      'That rookies confidence is unreal',
      'Veteran presence on the team matters so much',
      'The leadership on that team is what makes them great',
      'Chemistry between players is more important than talent',
      'The jersey retirement ceremony was emotional',
      'That stat line is absolutely ridiculous',
      'Triple double like its nothing how',
      'The record they broke stood for how many years??',
      'Records are meant to be broken and that one needed to go',
      'The clutch gene runs in that athletes blood',
      'Game winning shot with seconds left is peak sports',
      'The walk off hit in the bottom of the ninth',
      'Penalty kicks should be illegal they are too stressful',
      'Shootout in hockey is the most intense thing',
      'Overtime rules need to be changed honestly',
      'The playoff format is perfect dont change it',
      'Wild card team winning it all is the best storyline',
      'Cinderella story in the tournament this year',
      'March madness brackets get destroyed every year',
      'Nobody gets a perfect bracket and thats the beauty',
      'Tailgating before the game is half the experience',
      'The food at the stadium is overpriced but I still buy it',
      'Those rivalries go back generations its personal',
      'Local derby games have the best atmosphere by far',
      'The away fans showing up in numbers is respect',
      'Being in the stands when your team wins hits different',
      'Watching the game at home vs at the bar different vibes both good',
      'The sports bar atmosphere during playoffs is unmatched',
      'Wearing the jersey during game day is mandatory',
      'Superstition before games is wild some fans are dedicated',
      'The pre-game ritual is sacred dont mess with it',
      'Post game analysis is when we all become experts',
      'Monday morning quarterbacks unite',
      'The hot takes after a loss are always extreme',
      'One bad game and people want to trade everyone lol',
      'Gym progress pics are actually inspiring keep posting them',
      'The bulk to cut transformation photos are wild',
      'Leg day separates the dedicated from the casual',
      'Never skip leg day is a life philosophy',
      'The DOMS after leg day is a different kind of pain',
      'That pump after a good workout is unmatched',
      'Gym bro science is either genius or completely wrong',
      'The gym at 5am crowd is a different breed',
      'Late night gym sessions are peaceful and focused',
      'Form over weight every single time',
      'That PR was long overdue congrats',
      'The gym playlist makes or breaks the workout',
    ]
  },
  pets_animals: {
    generic: [
      'PET TAX!! Show us!! 🐾',
      'Omg thats so cute',
      'I need a pet so bad',
      'That is the cutest thing Ive ever seen',
      'Dogs are literally the best things on earth',
      'Cat people rise up 🐱',
      'The zoomies are my favorite thing ever',
      'That pet is living its best life',
      'Send more pics please 🥺',
      'I would die for that pet honestly',
      'The tail wagging always gets me',
      'What breed is that?! So cute',
      'Pets make everything better change my mind',
      'That is one happy looking pet',
      'The puppy eyes are LETHAL',
      'My heart cannot handle this cuteness',
      'BRB going to hug my pet',
      'That pet is more photogenic than me',
      'Belly rubs are non negotiable',
      'The way they just stare at you for food 😂',
      'That pet has more personality than most people',
      'Golden hour pet photos hit different',
      'The grabby paws are killing me',
      'I just wanna boop that nose',
      'Service animals are literally heroes',
      'That pet is spoiled and deserves it',
      'The bond between a person and their pet is unmatched',
      'My pet just did the funniest thing I wish I recorded it',
      'Rescue pets are the best pets fight me',
      'That animal is majestic af',
      'The way cats judge you from across the room 😂',
      'Dogs when you grab the leash that excitement is everything',
      'The happy dance when you come home is the best part',
      'Separation anxiety in pets is real and heartbreaking',
      'The vet bill arrived and my wallet is crying',
      'Pet insurance is actually worth it trust me',
      'The before and after rescue photos always get me',
      'Adopt dont shop is a movement I fully support',
      'Foster fails are the best kind of fails',
      'That kitten grew into a massive cat what happened',
      'Big dogs who think theyre lap dogs are the best',
      'Small dogs with big personalities are hilarious',
      'That cat knocked everything off the table on purpose',
      'Cats are liquid they fit anywhere they want',
      'Dog parks are free entertainment change my mind',
      'The play date between those two pets was adorable',
      'Pet costumes are either cute or pure comedy',
      'Halloween pets in costumes is the content I need',
      'Training that pet must have taken so much patience',
      'Smart pets are either impressive or terrifying',
      'That pet learned a new trick thats actually big brain',
      'The guilty face after they did something bad',
      'They know what they did and they dont care one bit',
      'The attitude on that cat is unmatched',
      'That dog smile is healing my soul',
      'Pet content is the reason the internet was invented',
      'I follow more pet accounts than human accounts',
      'The pet influencer economy is wild',
      'That pet has more followers than I do and deserves it',
    ]
  },
  weather: {
    generic: [
      'The weather is crazy rn',
      'Rain is the best sleeping weather ngl',
      'Its way too hot for this 🥵',
      'Cold weather = stay inside and game',
      'Snow day vibes are unmatched ❄️',
      'I live for fall weather fr',
      'Summer is either amazing or suffering no in between',
      'The thunderstorm sounds are lowkey relaxing',
      'Who else loves rainy days?',
      'The heat is not it today',
      'Perfect weather to do absolutely nothing',
      'Weatherman got it wrong again lol',
      'This weather makes me want hot chocolate',
      'Beach weather when??',
      'The sunset today was actually gorgeous',
      'Hoodie weather is the best weather',
      'Rain hitting the window while gaming is peak comfort',
      'Spring allergies are the real villain',
      'Four seasons in one day type of weather',
      'The weather is giving main character vibes today',
      'This weather is perfect for a walk',
      'I checked the weather and chose violence (staying inside)',
      'The temperature dropped so fast what happened',
      'Cozy weather + good music = elite combo',
      'This is sweater weather and Im here for it',
      'The fog this morning was actually eerie',
      'Cloudy days are so underrated',
      'The wind out there is no joke today',
      'Tornado warnings stress me out so much',
      'The double rainbow was worth going outside for',
      'First snow of the season always hits different',
      'I could listen to rain all day honestly',
      'The humidity is making my hair tragic',
      'Sunny days make everything feel possible',
      'Winter mornings are beautiful but COLD',
      'Ice on the roads is terrifying ngl',
      'The forecast said partly cloudy and it rained all day',
      'Pool weather is finally here lets gooo',
      'The heatwave is testing my patience',
      'Wind chill makes it feel like the arctic outside',
      'The weather app is basically my best friend now',
      'Storms rolling in always makes me nervous and excited',
      'Hot take: overcast weather is the best',
      'The frost on the windows this morning was actually pretty',
      'I love the sound of hail unless its hitting my car',
      'Weather is changing so fast I dressed wrong 3 times',
      'The golden hour lighting after a storm though',
      'Snow is only fun for the first day then its a problem',
      'I live where there are only two seasons hot and hotter',
      'The breeze today is chef kiss perfect',
      'Humidity at 100% is basically swimming in the air',
      'Rain boots season is upon us',
      'The weather is giving cozy movie night energy',
      'A thunderstorm in the distance at night is peak aesthetic',
    ]
  },
  sleep: {
    generic: [
      'Sleep is overrated... right? 😅',
      'Go to sleep bro its late 😂',
      'The sleep schedule is destroyed',
      'Who needs sleep when you have chat',
      'Insomnia gang where you at',
      '3am and still going strong',
      'I should be sleeping but here we are',
      'Nap time sounds amazing rn',
      'The melatonin isnt working 💀',
      'Sleep deprivation is a vibe apparently',
      'My body says sleep but my brain says nah',
      'One more hour... (says that every hour)',
      'The 2am thoughts hit different',
      'Early bird or night owl? Night owl forever',
      'How are you still awake lol',
      'The bed is calling but chat is too good',
      'I am running on pure willpower and caffeine',
      'Power nap or full sleep? Hard choice',
      'The bags under my eyes have their own zip code',
      'Sleep is for the weak (Im the weak)',
      'That nap was supposed to be 20 min not 4 hours',
      'Woke up and chose chaos today',
      'Morning people are a different species fr',
      'The alarm clock is my worst enemy',
      'I slept great and by great I mean 3 hours',
      'Sleep debt is real and Im bankrupt',
      'The pillow was too comfortable I couldnt leave',
      'Accidentally took a 6 hour nap oops',
      'Dreams be wild sometimes what was that about',
      'I fell asleep during the movie at the good part too',
      'The sleep paralysis demon and I are roommates now',
      'White noise machine changed my life ngl',
      'Sleeping in on the weekend is my religion',
      'How do people wake up at 5am and be happy about it',
      'The all nighter was not worth it retrospectively',
      'My circadian rhythm is in shambles',
      'One does not simply go to bed at a reasonable hour',
      'The midnight snack to bed pipeline is too real',
      'I dreamt something crazy and forgot it immediately',
      'Being tired but not being able to sleep is torture',
      'The weighted blanket is the best purchase I ever made',
      'Sunday naps are a form of self care',
      'My bed has never been more comfortable than when I need to get up',
      'I counted sheep and theyre all partying now still awake',
      'The 20 minute nap that turned into a full REM cycle',
      'Night shift people are built different fr',
      'I woke up in a different position than I fell asleep in',
      'That feeling when you wake up and its still night time W',
      'Oversleeping is just as bad as undersleeping somehow',
      'The bedtime procrastination is real even when tired',
      'I stayed up way too late reading chat again',
      'Dark circles are just my aesthetic at this point',
      'My body wakes me up at the same time even on weekends rude',
      'The afternoon crash is hitting different today',
    ]
  },
  school_work: {
    generic: [
      'The grind never stops 📚',
      'School/work is draining today',
      'Procrastination is an art form',
      'The deadline is approaching and I havent started',
      'Who invented homework honestly',
      'The motivation just isnt there today',
      'Taking a break is important too dw',
      'Group projects are the worst thing ever conceived',
      'The assignment is due WHEN?!',
      'I have so much work to do 😫',
      'The work grind is real',
      'Almost Friday though! We got this',
      'Coffee is the only reason Im functional rn ☕',
      'The 9 to 5 is testing me today',
      'Can someone do my homework for me lol',
      'Work meetings that couldve been emails >',
      'The essay isnt going to write itself unfortunately',
      'Hustle culture is real but so is burnout',
      'I need a vacation immediately',
      'The class was supposed to be easy they said',
      'Study group or solo? I cant focus with people',
      'Just submitted that assignment with 2 minutes to spare 😅',
      'The presentation anxiety is kicking in',
      'My coworkers are carrying me honestly',
      'The procrastination to productivity pipeline is real',
      'I learn more from YouTube than lectures ngl',
      'The Monday struggle is universal',
      'Report cards / performance reviews stress me out',
      'Taking notes is boring but future me will thank current me',
      'The lunch break is the best part of the day lets be honest',
      'Remote work changed the game fr',
      'Working from home means working in pajamas 🏠',
      'The imposter syndrome at work or school is real',
      'That exam was straight up unfair',
      'Teacher or boss just dropped a surprise assignment 💀',
      'The burnout is real take care of yourselves',
      'Study music recommendations? I need focus',
      'I have 15 tabs open and none of them are helping',
      'The Pomodoro technique actually works try it',
      'Group project = one person does all the work',
      'The textbook costs more than my dignity',
      'Office politics are worse than high school politics',
      'The passive aggressive email I just received 🙃',
      'That feeling when you finish a huge assignment though',
      'The end of the semester grind is brutal',
      'Work-life balance? Never heard of her',
      'The Sunday scaries are hitting hard',
      'My desk setup is my pride and joy',
      'Free food at work meetings is the only motivation',
      'The deadline extension just saved my life',
      'That test had questions from stuff we never covered',
      'The internship grind is different',
      'First day jitters never go away',
      'The commute alone is draining honestly',
      'Working overtime for free is not the vibe',
      'That study session was actually productive for once',
      'The class average was low so I feel better about my grade',
      'Graduation cant come fast enough',
      'The career change thoughts are creeping in again',
    ]
  },
  travel: {
    generic: [
      'Where are you going?? Im jealous',
      'Travel content is always fire 📸',
      'The wanderlust is REAL rn',
      'That place looks like a dream',
      'I need a trip so bad',
      'How was the flight?',
      'Airport food prices are criminal',
      'The sunset from there must be insane',
      'Adding that to the bucket list',
      'Road trips > flying change my mind',
      'The travel photos are making me jealous',
      'That destination is on my list fr',
      'The food from that country hits different',
      'How long are you there for?',
      'Bring back souvenirs for everyone lol',
      'Traveling alone is underrated honestly',
      'The jet lag is gonna be brutal though',
      'That place is giving paradise vibes 🌴',
      'I need recommendations for that area',
      'The Airbnb or hotel? Which is better?',
      'Post-vacation depression is a real thing',
      'The best part of traveling is the food lets be real',
      'Did you learn any of the language before going?',
      'That view is absolutely insane',
      'The memories from trips like that last forever',
      'The hostel stories are either amazing or terrifying',
      'Packing is an art and Im not good at it',
      'Forgetting your charger on a trip is nightmare fuel',
      'The train through the countryside is so peaceful',
      'Street food from markets is always the best food',
      'Lost my luggage once and I still have trust issues',
      'The airport WiFi is always terrible',
      'TSA pre-check is worth every penny',
      'That road trip playlist was fire though',
      'National parks are free therapy',
      'The sunrise from that mountain was life changing',
      'Camping is fun until you realize you forgot something',
      'The cheapest flights are always at 4am lol',
      'That resort looked way better in the photos',
      'Solo travel is scary at first then its freeing',
      'The layover was longer than the actual flight',
      'Customs and immigration lines are a test of patience',
      'The travel vlog content was incredible',
      'Budget travel hacks are actually genius',
      'The culture shock hits different when you actually go',
      'Trying to speak the language is half the fun',
      'That cruise ship looked like a floating city',
      'The overnight train is such a vibe',
      'Adventure travel or resort relaxing both valid',
      'The travel photography from there is insane',
      'I already want to go back and I just left',
      'The local tips from residents are always the best',
      'Day trips are underrated honestly',
      'That hidden gem spot was the highlight of the whole trip',
    ]
  },
  fashion: {
    generic: [
      'The fit is clean 🔥',
      'Drip check passed ✅',
      'That outfit goes hard',
      'W fashion sense',
      'The sneaker game is strong',
      'ID on those shoes??',
      'That hairstyle is fire btw',
      'Streetwear or clean casual? Both valid',
      'The thrift finds are always the best',
      'Where did you get that?? I need it',
      'The outfit of the day is elite',
      'Dressed to impress I see',
      'That color combo is clean',
      'Comfort > style... just kidding both matter',
      'The shoe collection is probably insane huh',
      'Fashion is self expression and yours is LOUD',
      'That drip is certified',
      'Simple fits hit harder sometimes',
      'Accessory game on point',
      'That jacket is everything',
      'The confidence boost from a good outfit is real',
      'Monochrome fits are underrated',
      'That vintage find is a grail',
      'Sneaker drops are stressful but worth it',
      'The fit pic when??',
      'Layering game is strong this season',
      'That watch really completes the look',
      'Matching colors or contrast which style are you',
      'The wardrobe refresh was needed honestly',
      'Oversized fits are a whole vibe',
      'The tailored look is just so clean',
      'Sunglasses really do change the whole outfit',
      'Brand loyalty or variety shopping? Mix of both',
      'The secondhand finds are always the best stories',
      'Coordinating outfits with friends is elite behavior',
      'The seasonal wardrobe switch is exhausting but worth it',
      'Wearing all black is a lifestyle not just a choice',
      'That hat adds so much character to the fit',
      'Platform shoes are making a comeback and Im for it',
      'The jewelry game is leveling up I see',
      'Comfort shoes that still look good are the holy grail',
      'DIY fashion projects are actually so fun',
      'The designer vs dupe debate never ends',
      'Closet organization is satisfying to watch',
      'That fabric texture looks luxurious',
      'The minimalist style is underrated for real',
      'Mixed patterns take courage and it paid off',
      'That belt was the missing piece of the whole outfit',
      'Fashion trends cycle so just wait for your time',
      'The custom piece is one of a kind love it',
      'Dress for the job you want not the one you have',
      'The glow up fashion edition is real',
      'That color suits you perfectly',
      'Bag game strong as usual',
    ]
  },
  money: {
    generic: [
      'Down bad financially rn 😭',
      'Money talks and mine says goodbye',
      'The savings account is crying',
      'Invest in what though?',
      'Payday hits different when rent is due',
      'Broke until further notice 💸',
      'The budget is a suggestion at this point',
      'Financial literacy is important fr',
      'That sounds expensive but worth it',
      'My wallet just flinched reading that',
      'The grind for money never stops',
      'Just found a deal too good to be true',
      'Crypto is a rollercoaster and Im not wearing a seatbelt',
      'Save money or enjoy life? The eternal question',
      'The sale prices are calling my name',
      'I need a raise yesterday',
      'Making money in your sleep is the dream',
      'The impulse purchase hit hard today',
      'Is that worth the price though?',
      'Money cant buy happiness but it buys pizza and thats close',
      'Financial goals for this year looking ambitious ngl',
      'The subscription services are draining my account',
      'That deal was too good to pass up',
      'Investing young is the move apparently',
      'Budgeting apps are great until you see the truth',
      'The credit card bill arrived and I blacked out',
      'Thrift shopping is an art and a sport',
      'Side hustles are the new normal',
      'Passive income is the dream if you can get it going',
      'The price of groceries went up AGAIN',
      'Coupon stacking is a real skill',
      'Financial independence retire early sounds nice',
      'That buy one get one deal was calling my name',
      'Splitting the bill is always awkward',
      'The tipping culture debate is wild',
      'Meal prepping saves money for real',
      'That was an investment not an expense... right?',
      'Student loans are the real final boss',
      'The cost of living is no joke',
      'Black Friday deals are hit or miss honestly',
      'Compound interest is either your best friend or worst enemy',
      'My savings goal just felt more realistic today',
      'The economy is doing that thing again',
      'Emergency fund is non negotiable honestly',
      'Rent prices are absolutely criminal',
      'The 50 30 20 budget rule actually works',
      'Tax season is stressful every single year',
      'That refund hit different this year',
      'The price comparison saved me so much money',
      'Living below your means is harder than it sounds',
      'Financial freedom is the ultimate goal',
      'That receipt shocked me not gonna lie',
      'The rewards points are finally adding up',
      'Free shipping minimum is my weakness',
    ]
  },
  relationship: {
    generic: [
      'Ayy thats wholesome 🥰',
      'Relationship goals right there',
      'The single life has its perks too ngl',
      'Thats actually really sweet',
      'The dating scene is wild out there',
      'Friendship is the real treasure change my mind',
      'Thats wholesome content right there',
      'The homies are the real MVPs',
      'Long distance or nah?',
      'Communication is key they say',
      'Thats cute not gonna lie 🥺',
      'The friend group dynamic is everything',
      'Bros before... wait nah everyone important',
      'That support system hits different',
      'Trust is everything in any relationship',
      'Thats actually the cutest thing',
      'Found the wholesome content of the day',
      'The loyalty is unmatched',
      'Everyone needs friends like that',
      'Thats real love right there',
      'The group chat is always chaotic but we love it',
      'Quality time > everything else',
      'Thats the kind of energy we need more of',
      'Being there for people is underrated',
      'The real ones always show up',
      'That surprise for them was so thoughtful',
      'Long distance takes real dedication respect',
      'The love language talk is actually important',
      'That apology was chef kiss genuine and real',
      'Friendship breakups are just as hard ngl',
      'The matching pfps are cute I cant lie',
      'That glow up after the breakup though',
      'Supporting each other through hard times is real love',
      'The inside jokes are what make friendships elite',
      'Introvert friendships are quiet but so deep',
      'That friend who always checks in on you is a keeper',
      'The trust fall of friendships is being vulnerable first',
      'Found family is just as valid as blood family',
      'The duo content is superior to solo content',
      'Childhood friends who are still friends are precious',
      'That heart to heart conversation was needed',
      'Boundaries in relationships are healthy not mean',
      'The double date was actually so fun',
      'Making new friends as an adult is weirdly hard',
      'The friends who hype you up are the real ones',
      'Unexpected kindness from someone hits different',
      'That reunion after years apart must have been emotional',
      'The support system you have is everything',
      'Pet names are either adorable or cringe no middle ground',
      'Late night conversations with close friends are the best',
      'The group trip together would be legendary',
      'Matching outfits with your bestie is peak friendship',
      'That compliment made their whole day I bet',
      'Being someones safe person is the highest honor',
    ]
  },
  cars: {
    generic: [
      'What car is that? Clean 🚗',
      'The car enthusiast energy is strong',
      'Manual or automatic? (Manual obviously)',
      'That car is a dream',
      'The exhaust note on that must be insane',
      'JDM supremacy 🏎️',
      'That build is coming along nicely',
      'How much HP we talking?',
      'Car meets hit different at night',
      'The maintenance on that must be rough though',
      'Is it a daily or a weekend car?',
      'The mods on that are clean',
      'Insurance on that gotta be wild',
      'That color is perfect for that car',
      'The turbo spool sound is therapy',
      'Car people just understand each other fr',
      'What tires you running?',
      'The interior is just as important fight me',
      'First car memories hit different',
      'That detailing job is pristine',
      'Carwash or hand wash? Details matter',
      'The highway pulls in that must be crazy',
      'Stance or performance? Why not both',
      'That wrap or factory color?',
      'Car content on YouTube is addicting',
      'That engine swap was ambitious but it paid off',
      'Air freshener game in the car is important',
      'The sound system in that car must be incredible',
      'Muscle cars or imports both communities are passionate',
      'Electric cars are the future whether we like it or not',
      'That paint job is custom right its too clean',
      'Dashboard cam footage is always wild',
      'Parallel parking is the real drivers test',
      'Road rage is never worth it just breathe',
      'That car wash ASMR is satisfying content',
      'Stick shift in traffic is a workout',
      'The car collection goals are insane',
      'Rally cars are the most exciting motorsport fight me',
      'The carbon fiber accents are chefs kiss',
      'The resale value on that is going up for sure',
      'Midnight drives with the windows down is therapy',
      'That drift was clean controlled and intentional',
      'Garage setup goals right there',
      'The headlights on the new models are futuristic',
      'Ceramic coating is the move for protection',
      'That project car has so much potential',
      'Vintage trucks are making a comeback and I support it',
      'The driving route through the mountains must be incredible',
      'Fuel prices making me reconsider that road trip',
      'That car has personality I can tell',
      'The racing stripes actually look good on that one',
      'Car people naming their cars is perfectly normal',
      'The first car show of the season is always hype',
      'That garage find restoration is amazing content',
    ]
  },
  creative: {
    generic: [
      'That art is AMAZING 🎨',
      'The talent in here is insane',
      'How long did that take to make?',
      'You should sell that honestly',
      'The creative energy is flowing',
      'Drop the portfolio link!',
      'The detail in that is incredible',
      'Self taught? Thats even more impressive',
      'The style is so unique I love it',
      'Art is therapy and this is proof',
      'Commission prices for that level of skill?',
      'That photography is professional level',
      'The color palette choice is perfect',
      'Keep creating that is actual talent',
      'The improvement from your old work is insane',
      'How did you learn that? Tutorial link??',
      'Digital or traditional? Both hit different',
      'The composition is chefs kiss 🤌',
      'That editing work is so clean',
      'The creative process is fascinating honestly',
      'You made that?? Thats professional quality',
      'The art community here is so talented',
      'That took real skill to pull off',
      'The linework is so satisfying to look at',
      'Bruh Im jealous of your talent fr',
      'The creative block is real but push through it',
      'That time lapse of the creation process is mesmerizing',
      'The sketchbook tour was so interesting',
      'Mixed media art is so cool and unique',
      'The pottery and ceramics content is so satisfying',
      'Speed painting videos are hypnotic',
      'That music production setup is insane',
      'The beat you made is fire drop it',
      'Writing poetry or stories? Both are valid art',
      'The calligraphy is so smooth and flowing',
      'That sculpture came out incredible',
      'The before and after of that piece is wild',
      'Fan art of that quality deserves more recognition',
      'The animation smoothness is professional grade',
      'Stop motion content takes so much patience respect',
      'That album cover design goes hard',
      'The graphic design is chef kiss clean',
      'Woodworking is an underrated creative outlet',
      'That crochet or knitting pattern is complex and beautiful',
      'The cosplay craftsmanship is next level',
      'Painting on different surfaces is so creative',
      'The embroidery detail I cant even imagine the patience',
      'That guitar riff you wrote is catchy',
      'The film editing gives professional vibes',
      'Street art and murals add so much life to a city',
      'The creative community supporting each other is wholesome',
      'That custom sneaker design is fire',
      'Resin art is both relaxing and cool to watch',
      'The font design work is so clean and readable',
    ]
  },
  horror_scary: {
    generic: [
      'Nah that gave me chills 😨',
      'Why would you share that at this hour 💀',
      'Im sleeping with the lights on tonight',
      'That is genuinely terrifying',
      'Horror is the best genre fight me',
      'The scariest part is that could be real',
      'Nope nope nope nuh uh',
      'My heart rate just spiked reading that',
      'That jumpscare got everyone in the room',
      'Horror movies at night are a different experience',
      'The atmosphere in those stories is everything',
      'True crime is addicting but also concerning',
      'I love horror until its 3am and I hear a noise',
      'That theory is actually really creepy',
      'The found footage genre is underrated',
      'Paranormal activity? In this economy?',
      'That rabbit hole goes deep be careful',
      'Internet mysteries are the best kind of content',
      'The iceberg videos on that topic are insane',
      'Nah that urban legend gave me anxiety',
      'Why do we watch scary stuff at night? We never learn',
      'The psychological horror is way scarier than jumpscares',
      'Bro Im not sleeping after this conversation',
      'That conspiracy theory actually made sense though 👀',
      'Ok but what if its real... nah jk... unless? 😅',
      'The creepypasta community writes better than some authors',
      'That abandoned building exploration was terrifying',
      'The true crime documentary was unsettling but well made',
      'That plot twist in the horror movie got everyone',
      'The ARG rabbit hole goes so deep',
      'Analog horror is the scariest new genre honestly',
      'That unresolved mystery still keeps me up at night',
      'The backrooms content is weirdly fascinating',
      'The SCP rabbit hole is endless and terrifying',
      'That haunted house experience looked wild',
      'The atmospheric horror is way more unsettling',
      'Reading scary stories at 3am was a mistake',
      'That supernatural encounter story gave me goosebumps',
      'The documentary evidence was actually convincing',
      'Liminal spaces are creepy but I cant stop looking',
      'The deep web stories are always unsettling',
      'That horror game has the best jump scares',
      'The folklore from that culture is genuinely terrifying',
      'Alien documentaries at night are a choice',
      'That mystery was solved after decades thats wild',
      'The unsolved cases are the ones that haunt you',
      'Camping horror stories hit different when camping',
      'The ocean deep is scarier than space change my mind',
      'That crime scene breakdown was detailed and chilling',
      'The horror manga art style is horrifying in the best way',
      'Cursed images at midnight? Why do I do this to myself',
      'The missing persons cases are always so sad and scary',
      'That cult documentary was eye opening and terrifying',
      'The unexplained sounds in the woods late at night 😨',
    ]
  },
  mood_positive: {
    responses: [
      'The vibes are immaculate rn 😎',
      'We love to see it',
      'Thats what Im talking about!',
      'W energy right here',
      'This chat is goated today',
      'Good vibes only in here',
      'The positivity is real 🔥',
      'Everyone eating good today',
      'I love this energy fr',
      'Big W moment',
      'Chat is on fire today',
      'This is the content I signed up for',
      'Wholesome hours activated',
      'The good ending 🎬',
      'Everything is coming together nicely',
      'Were all winning today',
      'Certified feel good moment',
      'This right here is a vibe',
      'Chat diff honestly',
      'The serotonin is flowing',
      'Nothing but good energy in here 🌟',
      'This is what peak chat looks like',
      'Spreading the positivity one message at a time',
      'The feel good energy is contagious',
      'Everyone is thriving today I love it',
      'Main character energy from everyone rn',
      'The good vibes are off the charts',
      'I am here for this energy fr',
      'This chat is a safe space for Ws only',
      'Today is a good day and thats that',
      'Chat decided to be elite today',
      'The happiness in here is unmatched',
      'Group hug in chat 🤗',
      'This energy needs to be bottled and sold',
      'Everyone is winning today no exceptions',
      'The happiness is radiating through the screen',
      'That made my day and I needed it',
      'The collective W in here is massive',
      'Youre all amazing and I mean that',
      'The encouragement in chat is unmatched',
      'Group celebration mode activated 🎊',
      'The support in this community is unreal',
      'That accomplishment deserves recognition',
      'The pride I feel for chat rn is real',
      'This is what a winning mentality looks like',
      'The blessings keep coming',
      'Everything worked out as it should',
      'The universe is on our side today clearly',
      'Cheers to the good times 🥂',
      'The glow up is real and ongoing',
      'Smiles all around in here today',
      'That news just made everything better',
      'The energy shift is noticeable and welcome',
      'Grateful for this moment fr',
      'The stars aligned for this one',
      'Chat is radiating pure joy rn',
      'That was the highlight of the day easily',
      'The celebration is well deserved',
      'Manifest energy is paying off',
      'Happy vibes are spreading like wildfire',
      'The comeback nobody expected W',
      'Good karma coming back around',
      'Today chose to be on our side',
      'The smiley faces in chat are contagious 😊',
    ]
  },
  mood_negative: {
    responses: [
      'It be like that sometimes 😔',
      'I felt that honestly',
      'Pain. Just pain.',
      'We go again tomorrow though 💪',
      'Rough day huh? It gets better fr',
      'Sending good vibes your way',
      'That is unfortunate but we move',
      'L moment but tomorrows a new day',
      'At least chat is here for you',
      'Head up king/queen, the crown is slipping',
      'Bad days make good days feel even better',
      'The comeback is always greater than the setback',
      'Its giving main character struggle arc',
      'Plot armor will kick in soon dont worry',
      'This is just the villain arc before the redemption',
      'Bruh same though',
      'Thats rough buddy',
      'We all been there honestly',
      'Tomorrow is a fresh start',
      'Keep your head up, it gets better 🫶',
      'This too shall pass fr fr',
      'Bad chapter not a bad story remember that',
      'You got this even when it doesnt feel like it',
      'Rest if you need to but dont quit',
      'The struggle is temporary the growth is permanent',
      'Chat is here for you always',
      'Even the darkest night ends with sunrise',
      'Take it one step at a time',
      'Youre stronger than you think honestly',
      'Sometimes life hits different but we bounce back',
      'Sending virtual hugs rn 🫂',
      'Growth comes from struggle real talk',
      'You survived every bad day before this one too',
      'Its okay to not be okay sometimes',
      'Were gonna get through this chat strong together',
      'Sometimes you just gotta let it out and thats okay',
      'The healing process isnt linear remember that',
      'Its okay to take breaks from being strong',
      'Rough patches build character fr',
      'The light at the end of the tunnel is there I promise',
      'Everyone hits rock bottom before they bounce back',
      'Nobody has it all figured out and thats normal',
      'Your effort matters even when results are slow',
      'Progress isnt always visible but its happening',
      'Being kind to yourself is not optional',
      'The setback is just setup for the comeback story',
      'One bad day doesnt define the whole week',
      'Youre doing better than you think honestly',
      'The feelings are valid dont let anyone tell you otherwise',
      'Take the time you need theres no rush',
      'Every masterpiece went through drafts and edits same with life',
      'The storm doesnt last forever it just feels like it',
      'Lean on the people who care about you',
      'Something better is coming just hang in there',
      'Its not giving up its regrouping',
      'Even on bad days youre still moving forward',
      'The weight of the world isnt yours alone to carry',
      'Be gentle with yourself today and every day',
      'Rain makes things grow and so do hard times',
      'Your worth isnt tied to one bad moment',
      'Rest is productive too never forget that',
      'The low points make the highs worth it',
      'Tomorrow is unwritten and full of potential',
      'Chat has your back no matter what',
    ]
  },
  greeting: {
    hello: [
      'Hey! Whats good? 👋',
      'Yooo whats up!',
      'Hey hey! Welcome!',
      'Ayy whats going on!',
      'Sup! How we doing today?',
      'Hey! Good to see you!',
      'Welcome welcome! 🎉',
      'Heyyy! How are you?',
      'Yooo wassup!',
      'Hey there! 😄',
      'Ayy welcome!',
      'Whats poppin!',
      'Hey! Glad youre here',
      'Oh hey! Whats up?',
      'Whatup! How goes it?',
      'Look who showed up! Hey! 👋',
      'The gang is here! Sup!',
      'Ayyy there they are!',
      'Hola! How you doing?',
      'Welcome to the chaos! 😂',
      'Hey hey! Pull up a chair',
      'Oh snap we got company! Hey!',
      'The party dont start till you walk in',
      'Yo! Long time no see! How you been?',
      'Waddup! Chat just got better',
      'Ayo! Welcome to the stream!',
      'Hey fam! Whats the move today?',
      'Oh snap its you! Whats good!',
      'Welcome in! Grab a snack and get comfy',
      'Eyyy there they are! How you doing?',
      'Hey! Ready for some fun? 🎮',
      'The vibe just got better youre here!',
      'Hey newcomer! Welcome to the community!',
      'Well well well look who decided to join us',
      'Salutations! JK whats up lol',
      'Heyo! How was your day?',
      'Another day another hello! Hey!',
      'Oh its you! Pull up pull up',
      'Hey friend! Long time! ✨',
      'The notification said you joined and I got excited',
      'Yo! Big welcome from chat!',
      'Hello hello! Make yourself at home',
      'Ayyy my fav person just arrived',
      'Hey! Just in time for the good stuff',
    ],
    goodbye: [
      'Later! Take it easy ✌️',
      'See ya! Have a good one!',
      'Peace! Catch you later!',
      'Bye! Dont be a stranger!',
      'Later! Stay safe out there',
      'Adios! See you next time',
      'See you around! 👋',
      'Take care! Come back soon',
      'Later gator! 🐊',
      'Peace out! ✌️',
      'Cya later!',
      'Bye bye! Have a great day/night',
      'See ya! It was fun',
      'Goodnight! Rest well 🌙',
      'Take it easy!',
      'Until next time! 🫡',
      'Dont stay away too long!',
      'Rest up! See you next session',
      'Have a good one! You deserve it',
      'Later! Chat wont be the same without you',
      'Go get some rest! See ya tomorrow',
      'Peace! It was real 🤙',
      'Drive safe if youre heading out!',
      'Night night! Sweet dreams 💤',
      'Till next time legend ✌️',
      'Catch you on the flip side!',
      'Have the best night or day wherever you are!',
      'Missing you already honestly',
      'Byeee! Chat sending good vibes your way',
      'Go live your best life! See ya!',
      'Logging off? Fair enough rest well!',
      'The goodbye is always the hardest part',
      'You better come back soon or we riot',
      'Sending you off with a virtual high five ✋',
      'Sweet dreams if youre heading to sleep!',
      'Stay hydrated and get some rest!',
      'Later! The next time will be even better',
      'Farewell friend! Until our paths cross again',
      'The exit is bittersweet but see ya soon!',
      'Go touch some grass for the rest of us 🌿',
      'Bye! Tell em chat said hi',
      'Take it easy champion!',
      'The stream ending sadge but see you next time!',
      'Goodnight from the whole crew! 🌙',
    ],
    welcome_back: [
      'Oh youre back! Welcome back!',
      'Ayy look whos back! 👀',
      'Welcome back! We missed you',
      'The legend returns!',
      'Wb! What did we miss?',
      'Oh snap youre back! Lets go',
      'Return of the king/queen 👑',
      'Wb wb! How you been?',
      'You were missed! Welcome back',
      'The comeback is real 💪',
      'Look who decided to show up again 😂',
      'The OG is back in the building',
      'Welcome back! Chat was boring without you',
      'The prodigal chatter returns!',
      'Wb! We saved your seat',
      'THEY HAVE RETURNED',
      'Back from the shadow realm I see',
      'The gang is complete again',
      'Oh you survived out there? Welcome back lol',
      'Chat just leveled up now that youre back',
      'Where did you go? Doesnt matter youre here now',
      'The sequel is always better and youre back for it',
      'WB legend! What we talking about?',
      'The notification said youre back and I got hype',
      'Just when we thought chat peaked you returned',
      'Back for more I see love it',
      'You were gone for too long dont do that again',
      'Chat was 60% less fun without you just saying',
      'The absence made the heart grow fonder wb!',
      'Returned from the void I see welcome back',
      'THE RETURN 🔥 how you been?',
      'Ayy the missing piece is back!',
      'Didnt recognize chat without you in it wb!',
      'The energy just shifted youre back lets gooo',
      'Missed your presence for real wb!',
      'Like you never left honestly wb!',
      'The comeback tour continues wb!',
      'Welcome back to the chaos you were missed',
      'Chat was asking about you the whole time',
    ]
  },
  question: {
    generic: [
      'Good question honestly',
      'I was wondering the same thing',
      'Thats a great question',
      'Someone smart answer this pls',
      'Asking the real questions out here',
      'I actually dont know but Im curious now too',
      'Great question, who knows?',
      'The question of the day right there',
      'I need to know this too actually',
      'Big brain question',
      'Hmmm thats actually interesting',
      'Now Im curious too 🤔',
      'Can someone google this for us lol',
      'That made me think ngl',
      'Asking the real questions here',
      'Chat help us out on this one',
      'We need an expert in here for that',
      'The question we didnt know we needed',
      'Thats gonna keep me up tonight thinking about it',
      'Drop your hot take on this one',
      'This is the kind of deep conversation I live for',
      'Someone has the answer in here I know it',
      'That question just opened a whole can of worms',
      'The debate is about to get heated 🔥',
      'I have opinions but Im scared to share lol',
      'This is gonna split the chat for sure',
      'Controversial take incoming??',
      'Everyone has a different answer for this one',
      'The real question is does anyone actually know',
      'Shower thought level question right there',
      'That question deserves its own thread',
      'Im writing that down for later',
      'The philosophical energy is strong with this one',
      'My brain just buffered trying to think about this',
      'That made me pause and actually think',
      'I have a theory but its probably wrong',
      'Google might know but do WE know',
      'The kind of question that starts a podcast',
      'That question should be on an exam',
      'I just went down a rabbit hole researching that',
      'My hot take might be controversial',
      'I feel like there is no right answer here',
      'The think tank in chat is activated',
      'Someone with a degree please answer this',
      'That question was deeper than the Mariana Trench',
      'Wait actually I want everyones opinion on this',
      'The kind of question that makes you stare at the ceiling',
      'Genuinely never thought about it that way',
      'That question unlocked a new perspective for me',
      'My brain cells are attempting to form an answer',
      'If chat doesnt know then nobody does',
      'That question just created more questions',
      'The debate club energy in here is strong',
      'I need a whiteboard to explain my answer',
      'Actually wait thats a really interesting angle',
      'The wisdom of the crowd will solve this one',
      'I love the random knowledge drops from these questions',
      'That question just divided chat perfectly 50/50',
    ]
  },
  meme: {
    generic: [
      'Bro 💀💀',
      'Im dead 😂😂',
      'LMAOOO',
      'Nahhh thats crazy',
      'I cant with you guys lmao',
      'This chat is unhinged and I love it',
      'The memes write themselves here',
      'Absolute cinema',
      'This is peak content right here',
      'Someone screenshot this 📸',
      'Bro thats hilarious',
      'The comedy is elite in here',
      'I wasnt ready for that 💀',
      'You did NOT just say that lmao',
      'Chat is in rare form today',
      'This conversation is going in the group chat',
      'Nahhh youre wild for that 😂',
      'Bro is a menace',
      'The funniest timeline',
      'We are living in a meme',
      'Actual comedy gold',
      'I spit out my drink reading that',
      'This is why I come to chat lol',
      'Chef kiss on that joke 🤌',
      'The comedic timing was perfect',
      'Brain rot chat is the best chat',
      'That just sent me to another dimension 💀',
      'The aura on that message is insane',
      'Bro just typed that with no hesitation',
      'Chat is going through it and I love every second',
      'The chronically online energy is immaculate',
      'That reference is elite tier',
      'I need to save this conversation 😂',
      'Bro rizzing up the chat rn',
      'The sigma grindset is strong with this one',
      'Main NPC dialogue right there',
      'The ohio energy in this chat',
      'That was unhinged in the best way possible',
      'The brain damage from this chat is permanent and I love it',
      'Someone needs to touch grass after that message 🌿',
      'The lore in this chat is deeper than any anime',
      'Bro just broke the matrix with that take',
      'That was the most unserious thing Ive ever read',
      'The chat is writing itself at this point',
      'Internet culture peaked with this conversation',
      'The comedic genius in chat today is unmatched',
      'I literally cant breathe from laughing 😂',
      'Whoever said that needs a Netflix special',
      'The callback to that earlier joke was perfect',
      'Chat writing skills are underrated this is content',
      'The roast session just started nobody is safe',
      'That delivery was impeccable timing and all',
      'Comedy chemistry between chat members is gold',
      'The running joke is now canon',
      'Adding that to the quote wall immediately',
      'The comedic value of this chat is priceless',
      'No thoughts just vibes and memes in here',
      'That was the plot twist nobody expected',
      'The sitcom that is this chat needs a laugh track',
      'Bro woke up and chose comedy today',
      'The meme game in this community is elite',
      'That pun was bad and you should feel bad but I laughed',
      'Deadpan humor hits when done right and that was right',
      'The reaction image I wish I could post rn',
      'Chat is a content farm and I love it',
      'That joke will be referenced for weeks I already know',
      'The random humor at 2am is top tier',
      'My humor is broken because that was way too funny',
      'The shitpost quality in here is gourmet',
      'Someone clip that messages entire existence',
      'The ratio of serious to unhinged messages is perfect',
      'Chat is just NPCs with the best dialogue ever',
      'The copypasta potential on that message is high',
      'No context needed that was just funny',
    ]
  },
  fallback: [
    'Real',
    'Facts',
    'Fr fr',
    'True true',
    'I feel that',
    'Makes sense',
    'Valid',
    'Lowkey yeah',
    'Honestly same',
    'Thats actually interesting',
    'Hmm didnt think about it like that',
    'Thats a good point',
    'I can see that',
    'Respectable take',
    'Cant argue with that',
    'Interesting 🤔',
    'Say less',
    'No cap',
    'Yeah for real',
    'That tracks',
    'Big if true',
    'I agree tbh',
    'Yep yep',
    'Couldnt have said it better',
    'This right here ^^',
    'Underrated comment',
    'Thats what Im saying!',
    'Preaching to the choir',
    'You get it',
    'Straight up',
    'Not wrong',
    'The truth has been spoken',
    'Say it louder for the people in the back',
    'Period.',
    'This is the way',
    'Noted 📝',
    'W take',
    'Based',
    'Truer words have never been spoken',
    'Literally this',
    'Pin this message',
    'Hard agree',
    'You spittin rn',
    'The realest thing said in chat today',
    'Bars honestly',
    'Someone said it finally',
    'Tea ☕',
    'And thats on everything',
    'Exactly what I was thinking',
    'Well said well said',
    'Yup that checks out',
    'Nothing to add youre right',
    'I mean yeah thats fair',
    'Good point good point',
    'Trueeee',
    'Yep cant deny that',
    'For sure for sure',
    'That resonates honestly',
    'I stand by that take',
    'Agreed no further questions',
    'Absolutely right',
    'You read my mind',
    'I second that motion',
    'The people have spoken and theyre right',
    'Factual statement right there',
    'I have nothing to add that says it all',
    'Major facts right there',
    'Thats it thats the take',
    'Literally could not agree more',
    'Real recognize real',
    'This is canon now',
    'Youve convinced me completely',
    'Eloquently put honestly',
    'This message needs to be pinned',
    'Dropping knowledge on us I see',
    'The correct take has been located',
    'Copy paste that its gospel now',
    'I felt that in my soul',
    'This deserves more engagement fr',
  ]
};

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

class SmartBot {
  constructor() {
    this.markov = new MarkovChain();
    this.memory = new ChannelMemory(30);
    this.lastReplyTime = new Map(); // channelId → timestamp
    this.messageCountSinceReply = new Map(); // channelId → count
    this.config = {
      enabled: false,
      replyChance: 0.06,          // 6% chance to reply to any message
      mentionAlwaysReply: true,    // always reply when @mentioned
      nameAlwaysReply: true,       // always reply when bot name mentioned
      cooldownMs: 30000,           // minimum 30s between replies per channel
      minMessagesBetween: 4,       // minimum 4 messages from others before next reply
      markovChance: 0.25,          // 25% chance to use Markov instead of template
      maxResponseLength: 200,      // cap response length
      allowedChannels: [],         // empty = all channels
      ignoredChannels: [],         // never reply in these
      botName: '',                 // bot display name (auto-detected)
      personality: 'chill',        // chill, hype, sarcastic — or 'adaptive' (#10)
    };

    // Knowledge base for info queries
    this.knowledge = {
      // Stream info
      streamSchedule: '',       // e.g. "Mon/Wed/Fri at 7pm EST"
      nextStream: '',           // e.g. "Tomorrow at 7pm"
      isLive: false,
      currentGame: '',
      streamTitle: '',
      viewerCount: 0,
      streamerName: '',
      // Social links
      socials: {},              // { youtube: 'url', twitter: 'url', ... }
      // Custom info entries { key: { question patterns, answer } }
      customEntries: {},
      // Discord server info
      serverInfo: '',
      rules: '',
    };

    // Stats
    this.stats = {
      totalReplies: 0,
      topicReplies: {},
      markovReplies: 0,
      templateReplies: 0,
      mentionReplies: 0,
      knowledgeReplies: 0,
      followUpReplies: 0,
      lastReplyAt: null
    };

    // Track bot's last reply per channel (for follow-up detection)
    this.lastBotReply = new Map(); // channelId → { content, subject, intent, timestamp }

    // Track user preferences (what they talk about / like)
    this.userPreferences = new Map(); // userId → { topics: {}, subjects: {}, sentiment: {} }

    // ---- New Smart Systems ----
    this.learnedKnowledge = new LearnedKnowledge();   // #2 Auto-learn subjects
    this.trending = new TrendingTracker();             // #5 Trending topics
    this.feedback = new FeedbackTracker();             // #6 Implicit feedback
    this.communityOpinions = new CommunityOpinions();  // #12 Community sentiment
    this.expertise = new ExpertiseTracker();            // #14 User expertise
    this.slangTracker = new SlangTracker();             // #9 #17 Server expressions
    this.learningLog = new LearningLog();               // #19 Learning log

    // ---- New Systems (Round 2) ----
    this.replyHistory = new ReplyHistory();             // Anti-repetition
    this.wordGraph = new WordGraph();                   // Word association
    this.socialTracker = new SocialTracker();           // Social group detection
    this.insideJokes = new InsideJokeTracker();         // Copypasta/inside jokes
    this.tfidf = new TfIdfEngine();                     // TF-IDF topic scoring
    this.channelMsgLengths = new Map();                 // channelId → { totalLen, count } for adaptive length

    // Track bot's last reply per channel for feedback detection (#6)
    this.lastBotReplyDetails = new Map(); // channelId → { templateKey, topic, timestamp }
  }

  // Pick a random element from array
  pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // Decide if the bot should reply to this message
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

    // Always reply if mentioned
    if (this.config.mentionAlwaysReply && msg.mentions.has(botUserId)) {
      return { reply: true, reason: 'mention' };
    }

    // Always reply if bot name is mentioned
    const botName = this.config.botName.toLowerCase();
    if (this.config.nameAlwaysReply && botName && msg.content.toLowerCase().includes(botName)) {
      return { reply: true, reason: 'name' };
    }

    // Check for follow-ups to bot's last reply FIRST (bypass cooldown + min-messages)
    const lastBotMsg = this.lastBotReply.get(channelId);
    if (lastBotMsg) {
      const followUp = detectFollowUp(msg.content, lastBotMsg);
      if (followUp && Math.random() < 0.65) {
        return { reply: true, reason: 'follow_up', followUp };
      }
    }

    // Cooldown check — adjust cooldown based on feedback (#20)
    const lastReply = this.lastReplyTime.get(channelId) || 0;
    const adjustedCooldown = this.config.cooldownMs * (replyChanceMultiplier < 0.8 ? 1.5 : 1.0);
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
      // Info requests — very high reply chance
      if (extracted.intent === 'asking_info') {
        const known = extracted.subjects.length > 0 && lookupKnowledge(extracted.subjects[0]);
        const learned = extracted.subjects.length > 0 && this.learnedKnowledge.has(extracted.subjects[0]);
        if ((known || learned) && Math.random() < effectiveChance * 10) {
          return { reply: true, reason: 'knowledge_answer' };
        }
      }
      // Much higher reply chance for direct questions/opinions
      if (['asking_opinion', 'comparing'].includes(extracted.intent)) {
        if (Math.random() < effectiveChance * 8) {
          return { reply: true, reason: 'direct_question' };
        }
      }
      // Moderate boost for sharing/recommending/complaining
      if (['sharing_experience', 'recommending', 'complaining'].includes(extracted.intent)) {
        const known = extracted.subjects.length > 0 && lookupKnowledge(extracted.subjects[0]);
        const multiplier = known ? 6 : 4;
        if (Math.random() < effectiveChance * multiplier) {
          return { reply: true, reason: 'engagement' };
        }
      }
    }

    // Detect topics for decision making
    const topics = detectTopics(msg.content);
    const wordCount = msg.content.trim().split(/\s+/).length;

    // TF-IDF enhanced topic detection (#13) — boost weak keyword matches with TF-IDF
    let tfidfBoost = false;
    if (this.tfidf.documentCount > 50) {
      const tfidfScores = this.tfidf.scoreTopics(msg.content);
      if (tfidfScores && tfidfScores[0] && tfidfScores[0][1] > 0.1) {
        tfidfBoost = true; // TF-IDF says this message has strong topic signal
      }
    }

    // Higher chance if topic is strong (2+ keywords matched)
    if (topics && topics[0] && (topics[0][1].score >= 3 || tfidfBoost)) {
      if (Math.random() < effectiveChance * 3) {
        return { reply: true, reason: 'strong_topic' };
      }
    }

    // Unanswered questions (#8) — if someone asked a question no one answered, jump in
    const unanswered = this.memory.getUnansweredQuestions(channelId);
    if (unanswered.length > 0 && Math.random() < 0.2) {
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

  // Generate the reply
  generateReply(msg, reason, decision = {}) {
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
        reply = modifyResponse(reply);
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

    // Check if it's an info/knowledge question first
    const infoAnswer = this.checkInfoQuery(content);
    if (infoAnswer) {
      this.stats.totalReplies++;
      this.stats.topicReplies['info'] = (this.stats.topicReplies['info'] || 0) + 1;
      this.stats.lastReplyAt = new Date().toISOString();
      return infoAnswer;
    }

    // ---- KNOWLEDGE-BASED REPLY ENGINE (enhanced with #2 #11 #12) ----
    if (extracted && extracted.intent && extracted.subjects.length > 0) {
      // For comparisons, try knowledge-aware comparison first
      if (extracted.intent === 'comparing' && extracted.subjects.length >= 2) {
        const comparisonReply = answerComparison(extracted.subjects[0], extracted.subjects[1]);
        if (comparisonReply) {
          reply = modifyResponse(comparisonReply);
          topicUsed = 'knowledge';
          templateKey = `knowledge:comparison`;
          this._finalizeReply(topicUsed, templateKey, channelId, true);
          if (reply) reply = reply.replace(/\{user\}/g, username);
          return reply;
        }
      }

      // Try built-in knowledge first
      const knowledgeReply = answerWithKnowledge(extracted.subjects[0], extracted.intent);
      if (knowledgeReply) {
        reply = modifyResponse(knowledgeReply);
        topicUsed = 'knowledge';
        templateKey = `knowledge:${extracted.subjects[0].substring(0, 30)}`;
        this._finalizeReply(topicUsed, templateKey, channelId, true);
        if (reply) reply = reply.replace(/\{user\}/g, username);
        return reply;
      }

      // Try learned knowledge (#2) — auto-learned subjects from chat
      const learnedReply = this.learnedKnowledge.getOpinion(extracted.subjects[0]);
      if (learnedReply) {
        reply = modifyResponse(learnedReply);
        topicUsed = 'learned_knowledge';
        templateKey = `learned:${extracted.subjects[0].substring(0, 30)}`;
        this._finalizeReply(topicUsed, templateKey, channelId, true);
        this.learningLog.log('used_learned', `Used learned knowledge about "${extracted.subjects[0]}"`);
        if (reply) reply = reply.replace(/\{user\}/g, username);
        return reply;
      }

      // Try community opinion (#12) — what the server collectively thinks
      const communityView = this.communityOpinions.getSummary(extracted.subjects[0]);
      if (communityView && extracted.intent === 'asking_opinion') {
        reply = modifyResponse(communityView.text);
        topicUsed = 'community_opinion';
        templateKey = `community:${extracted.subjects[0].substring(0, 30)}`;
        this._finalizeReply(topicUsed, templateKey, channelId, false);
        if (reply) reply = reply.replace(/\{user\}/g, username);
        return reply;
      }

      // Subject confidence system (#11) — if we don't know, ask instead of guessing
      if (extracted.intent === 'asking_opinion' || extracted.intent === 'asking_info') {
        const known = lookupKnowledge(extracted.subjects[0]);
        const learned = this.learnedKnowledge.has(extracted.subjects[0]);
        if (!known && !learned) {
          // Low confidence — ask a question or redirect to an expert (#14)
          const expert = this.expertise.getExpert(topics?.[0]?.[0] || 'general');
          const lowConfidenceResponses = [
            `hmm I dont know much about ${extracted.subjects[0]} yet tbh, anyone here know?`,
            `${extracted.subjects[0]}? thats new to me, tell me more about it`,
            `not gonna pretend I know about ${extracted.subjects[0]}, what do you think of it?`,
            `I havent heard much about ${extracted.subjects[0]} from chat yet, whats the vibe?`,
            `oh ${extracted.subjects[0]}, im still learning about that one, school me on it`,
            `${extracted.subjects[0]} huh? I genuinely have no idea, someone educate me`,
            `wait what is ${extracted.subjects[0]}? fill me in`,
            `cant say I know about ${extracted.subjects[0]} but im curious now`,
            `idk enough about ${extracted.subjects[0]} to have an opinion yet ngl`,
            `${extracted.subjects[0]} is a new one for me, what are peoples thoughts`,
          ];
          if (expert && Math.random() < 0.3) {
            reply = `I dont know much about ${extracted.subjects[0]} but <@${expert.userId}> talks about this stuff a lot, maybe they know`;
          } else {
            reply = lowConfidenceResponses[Math.floor(Math.random() * lowConfidenceResponses.length)];
          }
          reply = modifyResponse(reply);
          topicUsed = 'low_confidence';
          templateKey = 'low_confidence:question';
          this._finalizeReply(topicUsed, templateKey, channelId, false);
          return reply;
        }
      }

      // Fall back to generic opinion engine (for unknown subjects)
      const contextualReply = composeContextualReply(
        extracted, extracted.intent, sentiment,
        topics ? topics[0]?.[0] : null, conversationFlow
      );
      if (contextualReply) {
        reply = modifyResponse(contextualReply);
        topicUsed = topics ? (topics[0]?.[0] || 'opinion') : 'opinion';
        templateKey = `opinion:${extracted.intent}`;
        this._finalizeReply(topicUsed, templateKey, channelId, false);
        if (reply) reply = reply.replace(/\{user\}/g, username);
        return reply;
      }
    }

    // ---- CONVERSATION SUMMARIES (#13) ----
    // If someone returns after a gap, offer a summary
    if (reason === 'name' || reason === 'mention') {
      const lower = content.toLowerCase();
      if (/what did i miss|what happened|catch me up|what's going on|whats going on/.test(lower)) {
        const summaryText = this.memory.generateSummaryText(channelId);
        if (summaryText) {
          reply = summaryText;
          topicUsed = 'summary';
          this._finalizeReply(topicUsed, 'summary:catchup', channelId, false);
          return reply;
        }
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
        this._finalizeReply(topicUsed, 'hype_flow:generic', channelId, false);
        return reply;
      }

      // Trending topic interjection (#5) — sometimes bring up what's trending
      if (Math.random() < 0.08 && !reply) {
        const trending = this.trending.getTrending(24);
        if (trending.length > 0) {
          const topTrend = trending[0];
          if (topTrend[1] >= 10 && topTrend[0] !== 'greeting' && topTrend[0] !== 'mood_positive') {
            const trendingTemplates = [
              `everyone keeps talking about ${topTrend[0]} lately huh`,
              `${topTrend[0]} has been the hot topic today`,
              `the ${topTrend[0]} discussions today have been fire ngl`,
              `${topTrend[0]} is living rent free in this chat today`,
              `why is everyone on ${topTrend[0]} today lol`,
              `${topTrend[0]} era for this server apparently`,
              `chat is in their ${topTrend[0]} arc today`,
              `not complaining but ${topTrend[0]} has taken over this chat`,
            ];
            reply = trendingTemplates[Math.floor(Math.random() * trendingTemplates.length)];
            topicUsed = 'trending';
            this._finalizeReply(topicUsed, 'trending:interjection', channelId, false);
            return reply;
          }
        }
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

    // If Markov didn't work, use templates with feedback filtering (#6)
    if (!reply) {
      if (primaryTopic === 'mood_positive' || (sentiment === 'positive' && (!primaryTopic || primaryTopic === 'mood_positive'))) {
        const pool = this.feedback.filterPool(TEMPLATES.mood_positive.responses, 'mood_positive');
        reply = this.pick(pool);
        templateKey = `mood_positive:${reply?.substring(0, 40)}`;
      } else if (primaryTopic === 'mood_negative' || (sentiment === 'negative' && (!primaryTopic || primaryTopic === 'mood_negative'))) {
        const pool = this.feedback.filterPool(TEMPLATES.mood_negative.responses, 'mood_negative');
        reply = this.pick(pool);
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
        reply = this.pick(pool);
        templateKey = `${primaryTopic}:${reply?.substring(0, 40)}`;
      } else {
        if (recentTopics.length > 0 && TEMPLATES[recentTopics[0]]) {
          const rt = TEMPLATES[recentTopics[0]];
          const pool = rt.generic || rt.responses || TEMPLATES.fallback;
          reply = this.pick(this.feedback.filterPool(pool, recentTopics[0]));
          topicUsed = recentTopics[0];
          templateKey = `${recentTopics[0]}:contextual`;
        } else {
          if (reason === 'random' || reason === 'random_contextual') {
            return null;
          }
          reply = this.pick(TEMPLATES.fallback);
          templateKey = `fallback:${reply?.substring(0, 40)}`;
        }
      }
    }

    // Apply response modifiers (prefix/suffix variation)
    if (reply && !usedMarkov) {
      reply = modifyResponse(reply);
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

    // Social group comment (#10) — occasionally reference social dynamics
    if (reply && Math.random() < 0.04 && recentMessages.length >= 3) {
      const recentUsers = [...new Set(recentMessages.slice(-5).map(m => m.userId))].filter(u => u !== userId);
      if (recentUsers.length > 0) {
        const socialComment = this.socialTracker.getSocialComment(userId, recentUsers[0]);
        if (socialComment) reply += ` (${socialComment})`;
      }
    }

    // Inside joke reference (#14) — very rarely drop a server inside joke
    if (reply && Math.random() < 0.02) {
      const joke = this.insideJokes.getRandom();
      if (joke) {
        reply = joke;
        topicUsed = 'inside_joke';
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
            const threadReply = this.pick(pool);
            if (threadReply) reply = modifyResponse(threadReply).replace(/\{user\}/g, username);
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
    this.lastBotReplyDetails.set(channelId, { templateKey, topic: topicUsed, timestamp: Date.now() });

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
  _finalizeReply(topicUsed, templateKey, channelId, isKnowledge) {
    this.stats.totalReplies++;
    this.stats.topicReplies[topicUsed] = (this.stats.topicReplies[topicUsed] || 0) + 1;
    if (isKnowledge) this.stats.knowledgeReplies = (this.stats.knowledgeReplies || 0) + 1;
    this.stats.lastReplyAt = new Date().toISOString();
    this.lastBotReplyDetails.set(channelId, { templateKey, topic: topicUsed, timestamp: Date.now() });
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

    // Detect topics early for training use
    const topics = detectTopics(content);
    const primaryTopic = topics && topics.length > 0 ? topics[0][0] : null;

    // Always train Markov on every message (with topic for #7)
    this.markov.train(content, primaryTopic);

    // Train word association graph (#9)
    this.wordGraph.train(content);

    // Train TF-IDF engine (#13)
    this.tfidf.train(content);
    // Lazy-seed TF-IDF from TOPICS keywords
    if (!this.tfidf.seeded) this.tfidf.seedFromTopics(TOPICS);

    // Always track in memory
    this.memory.addMessage(channelId, userId, username, content);

    // Track user preferences (what they talk about)
    this._trackUserPreferences(userId, content);

    // Track channel message lengths for adaptive response length (#4)
    if (!this.channelMsgLengths.has(channelId)) {
      this.channelMsgLengths.set(channelId, { totalLen: 0, count: 0 });
    }
    const lenTracker = this.channelMsgLengths.get(channelId);
    lenTracker.totalLen += content.length;
    lenTracker.count++;
    // Rolling average — decay every 200 messages
    if (lenTracker.count > 200) {
      lenTracker.totalLen = Math.floor(lenTracker.totalLen / 2);
      lenTracker.count = Math.floor(lenTracker.count / 2);
    }

    // Track social interactions (#10) — detect who is replying to whom
    if (msg.reference?.messageId) {
      // This is a reply — try to find who they're replying to from recent messages
      const recentMsgs = this.memory.getRecentMessages(channelId, 20);
      const repliedTo = recentMsgs.find(m => m.userId !== userId);
      if (repliedTo) {
        this.socialTracker.recordInteraction(userId, repliedTo.userId, channelId);
      }
    }
    // Also track proximity interaction (messages within 30s of each other)
    const recentMsgs = this.memory.getRecentMessages(channelId, 5);
    if (recentMsgs.length >= 2) {
      const prev = recentMsgs[recentMsgs.length - 2];
      if (prev && prev.userId !== userId && Date.now() - prev.timestamp < 30000) {
        this.socialTracker.recordInteraction(userId, prev.userId, channelId);
      }
    }

    // Track inside jokes / copypasta (#14) — messages with reactions tracked via processReaction
    // Also track repeated messages (same content by different users = meme)
    const repeats = recentMsgs.filter(m => m.content.toLowerCase().trim() === content.toLowerCase().trim() && m.userId !== userId);
    if (repeats.length >= 1) {
      this.insideJokes.recordCandidate(content, username, repeats.length + 1);
    }

    // Track trending topics (#5)
    if (primaryTopic) {
      this.trending.record(primaryTopic);
    }

    // Track server expressions/slang (#9 #17)
    this.slangTracker.record(content, userId);

    // Record subject mentions for auto-learning (#2)
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

    // Track community opinions (#12)
    if (extracted && extracted.subjects) {
      const sentiment = analyzeSentiment(content);
      for (const subj of extracted.subjects) {
        this.communityOpinions.record(subj, sentiment);
      }
    }

    // Track expertise (#14)
    if (primaryTopic) {
      const wordCount = content.trim().split(/\s+/).length;
      const isHelpful = wordCount > 15 && extracted?.intent?.includes('asking') === false;
      this.expertise.record(userId, primaryTopic, isHelpful);
    }

    // Detect implicit feedback on bot's last reply (#6)
    this._detectFeedback(channelId, userId, content);

    // Increment message counter
    this.messageCountSinceReply.set(channelId, (this.messageCountSinceReply.get(channelId) || 0) + 1);

    // Anti-spam guard (#12) — don't reply during spam bursts
    if (detectSpamBurst(this.memory.getRecentMessages(channelId, 5))) {
      return null;
    }

    // Check if we should reply
    const decision = this.shouldReply(msg, botUserId);
    if (!decision.reply) return null;

    // Generate reply
    let reply = this.generateReply(msg, decision.reason, decision);
    if (!reply) return null;

    // Anti-repetition check (#2) — regenerate once if duplicate
    if (this.replyHistory.isDuplicate(channelId, reply)) {
      reply = this.generateReply(msg, decision.reason, decision);
      if (!reply || this.replyHistory.isDuplicate(channelId, reply)) return null;
    }

    // Anti-echo check — regenerate if reply parrots the user's message
    if (isEchoReply(reply, content)) {
      reply = this.generateReply(msg, decision.reason, decision);
      if (!reply || isEchoReply(reply, content)) return null;
    }

    // Adaptive response length (#4) — trim if channel msgs are short
    const avgLen = this._getChannelAvgLength(channelId);
    if (avgLen > 0 && avgLen < 40 && reply.length > 80) {
      // Channel is short messages — try to shorten reply
      const sentences = reply.split(/(?<=[.!?])\s+/);
      if (sentences.length > 1) reply = sentences[0];
    }

    // Self-correction system — detect broken Markov output and correct naturally
    const brokenCheck = detectBrokenReply(reply);
    let selfCorrection = null;
    if (brokenCheck && Math.random() < 0.7) {
      // 70% chance to self-correct (sometimes real users just leave mistakes too)
      selfCorrection = generateSelfCorrection(brokenCheck, reply);
    }

    // Typo simulation (#8) — creates { typoText, correction } or null
    const typoResult = simulateTypo(reply);

    // Record in reply history
    this.replyHistory.record(channelId, reply);

    // Track bot's reply for follow-up detection
    this.lastBotReply.set(channelId, {
      content: reply,
      subject: extracted?.subjects?.[0] || null,
      intent: extracted?.intent || null,
      timestamp: Date.now(),
    });

    // Update cooldowns
    this.lastReplyTime.set(channelId, Date.now());
    this.messageCountSinceReply.set(channelId, 0);

    // Emoji reaction instead of text (#3) — sometimes react instead of replying
    if (Math.random() < 0.06 && decision.reason !== 'mention' && decision.reason !== 'name') {
      const topicEmojis = primaryTopic ? TOPIC_EMOJIS[primaryTopic] : null;
      const sentiment = analyzeSentiment(content);
      const emojiPool = topicEmojis || SENTIMENT_EMOJIS[sentiment] || SENTIMENT_EMOJIS.neutral;
      const emoji = emojiPool[Math.floor(Math.random() * emojiPool.length)];
      // Return special object for index.js to handle
      return { __type: 'reaction', emoji };
    }

    // Multi-message reply (#6) — sometimes split into 2 messages
    if (reply.length > 40 && Math.random() < 0.07) {
      const splitPoint = reply.indexOf(' ', Math.floor(reply.length * 0.4));
      if (splitPoint > 10 && splitPoint < reply.length - 10) {
        const part1 = reply.substring(0, splitPoint);
        const part2 = reply.substring(splitPoint + 1);
        return { __type: 'multi', parts: [part1, part2] };
      }
    }

    // Self-correction follow-up — send broken reply then correct yourself
    if (selfCorrection) {
      return { __type: 'multi', parts: [reply, selfCorrection] };
    }

    // Typo + correction (#8)
    if (typoResult) {
      return { __type: 'multi', parts: [typoResult.typoText, typoResult.correction] };
    }

    return reply;
  }

  // Track reactions for inside jokes (#14)
  processReaction(msg, emoji, userId) {
    if (!msg || !msg.content) return;
    const reactionCount = msg.reactions?.cache?.get(emoji)?.count || 1;
    const authorName = msg.member?.displayName || msg.author?.username || 'someone';
    this.insideJokes.recordCandidate(msg.content, authorName, reactionCount);
  }

  // Get channel average message length (#4)
  _getChannelAvgLength(channelId) {
    const tracker = this.channelMsgLengths.get(channelId);
    if (!tracker || tracker.count === 0) return 0;
    return Math.floor(tracker.totalLen / tracker.count);
  }

  // Detect implicit feedback on the bot's last reply (#6)
  _detectFeedback(channelId, userId, content) {
    const details = this.lastBotReplyDetails.get(channelId);
    if (!details) return;
    // Only check within 30 seconds of bot's reply
    if (Date.now() - details.timestamp > 30000) return;

    const lower = content.toLowerCase();
    const positiveSigns = ['lol', 'lmao', 'haha', '😂', '🔥', 'true', 'facts', 'fr', 'based', 'W', 'good', 'nice',
      'agree', 'exactly', 'real', 'valid', 'yes', 'yeah', '💀', '👍', 'this', 'goated'];
    const negativeSigns = ['what', 'huh', '?', 'cringe', 'no', 'wrong', 'bad', 'shut up', 'stfu', 'who asked',
      'nobody asked', 'L', 'ratio', 'mid', 'weird', 'bruh what'];

    const isPositive = positiveSigns.some(s => lower.includes(s));
    const isNegative = negativeSigns.some(s => lower.includes(s)) && !isPositive;

    if (isPositive || isNegative) {
      this.feedback.recordFeedback(details.templateKey, details.topic, isPositive);
      this.feedback.recordChannelFeedback(channelId, isPositive);
      if (isPositive) {
        this.learningLog.log('positive_feedback', `Got positive reaction to ${details.topic} response`);
      } else {
        this.learningLog.log('negative_feedback', `Got negative reaction to ${details.topic} response`);
      }
    }
  }

  // Track what users talk about to personalize responses over time (#4 enhanced)
  _trackUserPreferences(userId, content) {
    if (!this.userPreferences.has(userId)) {
      this.userPreferences.set(userId, {
        topics: {}, subjects: {}, messageCount: 0,
        sentiment: { positive: 0, negative: 0, neutral: 0 }, // overall user mood tracking
        personality: null, // detected personality: 'hype', 'chill', 'analytical', etc.
        lastActive: Date.now(),
        favoriteSubject: null,
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

  getKnowledge() {
    return { ...this.knowledge };
  }

  // Detect if message is asking for info and return an answer
  checkInfoQuery(content) {
    const lower = content.toLowerCase();

    // Must look like a question or info request
    const isQuestion = lower.includes('?') ||
      /\b(when|what|where|who|how|is there|are there|whats|what's|tell me|do you know|anyone know)\b/.test(lower);

    if (!isQuestion) return null;

    // Stream schedule
    if (/\b(when.*stream|stream.*when|next stream|schedule|streaming.*when|when.*live|going live)\b/.test(lower)) {
      if (this.knowledge.nextStream) return `Next stream: ${this.knowledge.nextStream}`;
      if (this.knowledge.streamSchedule) return `Stream schedule: ${this.knowledge.streamSchedule}`;
      return null;
    }

    // Currently live / what game
    if (/\b(is.*live|are.*live|live right now|streaming now|currently streaming|what.*playing|what game|current game)\b/.test(lower)) {
      if (this.knowledge.isLive) {
        const game = this.knowledge.currentGame ? ` playing ${this.knowledge.currentGame}` : '';
        const viewers = this.knowledge.viewerCount ? ` with ${this.knowledge.viewerCount} viewers` : '';
        return `Yep, ${this.knowledge.streamerName || 'they'} are live${game}${viewers}! 🔴`;
      }
      if (this.knowledge.nextStream) return `Not live rn, but next stream: ${this.knowledge.nextStream}`;
      return `Not live at the moment!`;
    }

    // Viewer count
    if (/\b(how many.*viewer|viewer count|viewers|how many.*watching)\b/.test(lower)) {
      if (this.knowledge.isLive && this.knowledge.viewerCount) {
        return `Currently at ${this.knowledge.viewerCount} viewers! 👀`;
      }
      return this.knowledge.isLive ? 'Stream is live but I dont have the viewer count rn' : 'Not live at the moment!';
    }

    // Socials
    if (/\b(socials|youtube|twitter|instagram|tiktok|links|social media|where.*follow)\b/.test(lower)) {
      const socials = this.knowledge.socials;
      if (Object.keys(socials).length > 0) {
        const list = Object.entries(socials).map(([k, v]) => `${k}: ${v}`).join('\n');
        return `Here are the socials:\n${list}`;
      }
      return null;
    }

    // Server info
    if (/\b(server info|about.*server|what is this server|discord info|server rules)\b/.test(lower)) {
      if (lower.includes('rules') && this.knowledge.rules) return this.knowledge.rules;
      if (this.knowledge.serverInfo) return this.knowledge.serverInfo;
      return null;
    }

    // Check custom entries
    for (const [, entry] of Object.entries(this.knowledge.customEntries)) {
      if (entry.patterns.some(p => lower.includes(p.toLowerCase()))) {
        return entry.answer;
      }
    }

    return null;
  }

  // Config getter & setter
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

  getStats() {
    return {
      ...this.stats,
      markov: this.markov.getStats(),
      memoryChannels: this.memory.channels.size,
      knowledgeSubjects: Object.keys(BUILT_IN_KNOWLEDGE).filter(k => !BUILT_IN_KNOWLEDGE[k].alias).length,
      trackedUsers: this.userPreferences.size,
      learnedSubjects: this.learnedKnowledge.subjects.size,
      pendingSubjects: this.learnedKnowledge.pendingSubjects.size,
      trendingTopics: this.trending.getTrending(24).slice(0, 5).map(([t, c]) => `${t}(${c})`),
      feedbackTemplates: this.feedback.templateScores.size,
      communityOpinions: this.communityOpinions.opinions.size,
      trackedExperts: this.expertise.experts.size,
      serverExpressions: this.slangTracker.expressions.size,
      learningLogEntries: this.learningLog.entries.length,
      wordGraphEdges: this.wordGraph.totalEdges,
      socialPairs: this.socialTracker.interactions.size,
      insideJokes: this.insideJokes.quotes.size,
      tfidfDocuments: this.tfidf.documentCount,
      replyHistoryChannels: this.replyHistory.history.size,
    };
  }

  // Persistence
  toJSON() {
    // Serialize userPreferences Map
    const userPrefsObj = {};
    for (const [k, v] of this.userPreferences) {
      userPrefsObj[k] = v;
    }

    return {
      config: this.config,
      stats: this.stats,
      markov: this.markov.toJSON(),
      knowledge: this.knowledge,
      memory: this.memory.toJSON(),
      learnedKnowledge: this.learnedKnowledge.toJSON(),
      trending: this.trending.toJSON(),
      feedback: this.feedback.toJSON(),
      communityOpinions: this.communityOpinions.toJSON(),
      expertise: this.expertise.toJSON(),
      slangTracker: this.slangTracker.toJSON(),
      learningLog: this.learningLog.toJSON(),
      userPreferences: userPrefsObj,
      replyHistory: this.replyHistory.toJSON(),
      wordGraph: this.wordGraph.toJSON(),
      socialTracker: this.socialTracker.toJSON(),
      insideJokes: this.insideJokes.toJSON(),
      tfidf: this.tfidf.toJSON(),
    };
  }

  loadFromJSON(data) {
    if (!data) return;
    if (data.config) {
      this.config = { ...this.config, ...data.config };
    }
    if (data.stats) {
      this.stats = { ...this.stats, ...data.stats };
    }
    if (data.markov) {
      this.markov.loadFromJSON(data.markov);
    }
    if (data.knowledge) {
      this.knowledge = { ...this.knowledge, ...data.knowledge };
    }
    if (data.memory) {
      this.memory.loadFromJSON(data.memory);
    }
    if (data.learnedKnowledge) {
      this.learnedKnowledge.loadFromJSON(data.learnedKnowledge);
    }
    if (data.trending) {
      this.trending.loadFromJSON(data.trending);
    }
    if (data.feedback) {
      this.feedback.loadFromJSON(data.feedback);
    }
    if (data.communityOpinions) {
      this.communityOpinions.loadFromJSON(data.communityOpinions);
    }
    if (data.expertise) {
      this.expertise.loadFromJSON(data.expertise);
    }
    if (data.slangTracker) {
      this.slangTracker.loadFromJSON(data.slangTracker);
    }
    if (data.learningLog) {
      this.learningLog.loadFromJSON(data.learningLog);
    }
    if (data.userPreferences) {
      for (const [k, v] of Object.entries(data.userPreferences)) {
        this.userPreferences.set(k, v);
      }
    }
    if (data.replyHistory) {
      this.replyHistory.loadFromJSON(data.replyHistory);
    }
    if (data.wordGraph) {
      this.wordGraph.loadFromJSON(data.wordGraph);
    }
    if (data.socialTracker) {
      this.socialTracker.loadFromJSON(data.socialTracker);
    }
    if (data.insideJokes) {
      this.insideJokes.loadFromJSON(data.insideJokes);
    }
    if (data.tfidf) {
      this.tfidf.loadFromJSON(data.tfidf);
    }
  }
}

export default SmartBot;
