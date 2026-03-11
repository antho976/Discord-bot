/**
 * SmartBot — Local AI chat engine
 * Combines topic detection, Markov chains, sentiment analysis,
 * channel memory, and smart templates for on-topic replies.
 * Now with optional Qwen AI via Groq (primary) + HuggingFace (fallback).
 */

// ======================== QWEN AI ENGINE (Groq + HuggingFace) ========================

class QwenAI {
  constructor() {
    this.groqKey = '';
    this.hfKey = '';
    this.enabled = false;
    this.groqModel = 'qwen/qwen3-32b';          // Latest Qwen 3 on Groq
    this.hfModel = 'Qwen/Qwen3-32B'; // HuggingFace fallback
    this.maxTokens = 150;                        // Keep replies short & chat-like
    this.temperature = 0.85;                     // Creative but not unhinged
    this.cache = new Map();                      // Cache recent responses
    this.CACHE_TTL = 3 * 60 * 1000;             // 3 min cache
    this.rateLimiter = { count: 0, resetAt: 0 };
    this.MAX_REQUESTS_PER_MIN = 25;              // Stay under Groq free tier (30/min)
    this.stats = { groqCalls: 0, hfCalls: 0, cacheHits: 0, failures: 0 };
  }

  setKeys(keys) {
    if (keys.groq) this.groqKey = keys.groq;
    if (keys.huggingface) this.hfKey = keys.huggingface;
    this.enabled = !!(this.groqKey || this.hfKey);
  }

  // Check if we should use AI for this message (only for direct/complex queries)
  shouldUseAI(reason, content) {
    if (!this.enabled) return false;
    // Only use AI for direct interactions — don't waste quota on random triggers
    const isDirect = reason === 'mention' || reason === 'name' || reason === 'reply_to_bot';
    if (!isDirect) return false;
    // Skip very short or emoji-only messages
    if (!content || content.replace(/<[^>]+>/g, '').trim().length < 5) return false;
    return true;
  }

  // Build a system prompt that gives the bot personality + context
  _buildSystemPrompt(botName, personality, channelContext) {
    const base = `You are ${botName || 'a Discord bot'}, a chill chat bot in a Discord server. `
      + `You talk like a real person in chat — casual, short, no formal language. `
      + `Use lowercase mostly, abbreviations like "ngl", "tbh", "fr", "rn" naturally. `
      + `Never use asterisks for actions. Never say you're an AI or language model. `
      + `Keep replies under 2-3 sentences unless the question really needs more. `
      + `Match the vibe of whoever you're talking to. `
      + `IMPORTANT: Actually answer what the person said or asked. If they ask about a topic, share your take. `
      + `If they ask for a comparison, pick a side or give pros/cons. If they ask for opinions, give yours. `
      + `Never dodge with filler like "whats up" or "what do you need" — engage with their actual message.`;

    const personalityTraits = {
      chill: ' You have a laid-back, relaxed personality. Not too excited, not too bored.',
      hype: ' You are energetic and hyped up. You love exclamation marks and caps for emphasis.',
      sarcastic: ' You have a witty, slightly sarcastic sense of humor. You tease but never mean.',
      adaptive: ' You match the energy of whoever is talking to you.',
    };

    let prompt = base + (personalityTraits[personality] || personalityTraits.chill);

    // Add recent conversation context if available
    if (channelContext && channelContext.length > 0) {
      prompt += '\n\nRecent chat messages for context:\n';
      for (const msg of channelContext.slice(-6)) {
        const name = msg.username || 'someone';
        const text = (msg.content || '').substring(0, 150);
        prompt += `${name}: ${text}\n`;
      }
    }

    return prompt;
  }

  // Rate limiting — stay under free tier limits
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

  // Simple cache key from content
  _cacheKey(content) {
    return content.toLowerCase().trim().replace(/\s+/g, ' ').substring(0, 100);
  }

  // Main generate method — tries Groq first, then HuggingFace fallback
  async generate(content, username, botName, personality, recentMessages) {
    if (!this.enabled) return null;
    if (!this._checkRateLimit()) return null;

    // Check cache
    const key = this._cacheKey(content);
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.ts < this.CACHE_TTL) {
      this.stats.cacheHits++;
      return cached.reply;
    }

    // Strip bot mentions from the content for cleaner AI input
    const cleanContent = content
      .replace(/<@!?\d+>/g, '').replace(/<#\d+>/g, '').trim();
    if (!cleanContent) return null;

    const systemPrompt = this._buildSystemPrompt(botName, personality, recentMessages);
    const userPrompt = `${username}: ${cleanContent}`;

    let reply = null;

    // Try Groq first (fastest, best free tier)
    if (this.groqKey) {
      reply = await this._callGroq(systemPrompt, userPrompt);
    }

    // Fallback to HuggingFace
    if (!reply && this.hfKey) {
      reply = await this._callHuggingFace(systemPrompt, userPrompt);
    }

    if (reply) {
      // Clean up the reply
      reply = this._cleanReply(reply, botName);
      // Cache it
      this.cache.set(key, { reply, ts: Date.now() });
      // Prune cache
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

  // Clean up AI output to feel natural in Discord
  _cleanReply(text, botName) {
    if (!text) return null;
    let reply = text.trim();
    // Remove any "BotName:" prefix the AI might add
    if (botName) {
      const namePattern = new RegExp(`^${botName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:\\s*`, 'i');
      reply = reply.replace(namePattern, '');
    }
    // Remove "Assistant:" or "Bot:" prefixes
    reply = reply.replace(/^(assistant|bot|ai)\s*:\s*/i, '');
    // Remove quotes wrapping the entire response
    if ((reply.startsWith('"') && reply.endsWith('"')) || (reply.startsWith("'") && reply.endsWith("'"))) {
      reply = reply.slice(1, -1);
    }
    // Trim to max length for Discord chat feel
    if (reply.length > 400) {
      const cutoff = reply.lastIndexOf(' ', 400);
      reply = reply.substring(0, cutoff > 200 ? cutoff : 400);
    }
    // Remove markdown formatting that looks weird in casual chat
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
      'pet', 'pets', 'animal', 'animals', 'bird', 'birds', 'fish', 'hamster', 'rabbit', 'bunny',
      'snake', 'lizard', 'reptile', 'parrot', 'turtle', 'tortoise', 'ferret',
      'pigeon', 'pigeons', 'crow', 'crows', 'raven', 'eagle', 'hawk', 'owl', 'duck', 'ducks',
      'chicken', 'chickens', 'rooster', 'hen', 'goose', 'geese', 'swan', 'penguin',
      'frog', 'frogs', 'toad', 'gecko', 'chameleon', 'iguana', 'bearded dragon',
      'spider', 'tarantula', 'scorpion', 'insect', 'butterfly', 'bee', 'bees',
      'horse', 'horses', 'pony', 'donkey', 'cow', 'pig', 'goat', 'sheep',
      'monkey', 'gorilla', 'bear', 'wolf', 'fox', 'deer', 'moose', 'elk',
      'dolphin', 'whale', 'shark', 'octopus', 'jellyfish', 'seal', 'otter',
      'lion', 'tiger', 'cheetah', 'leopard', 'panther', 'elephant', 'giraffe',
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
      'dreaming', 'nightmare', 'bad dream', 'alarm', 'wake up', 'woke up',
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
  },
  idleon: {
    keywords: ['idleon', 'idle on', 'legends of idleon', 'lava game', 'lavaflame2',
      'w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'world 1', 'world 2', 'world 3',
      'world 4', 'world 5', 'world 6',
      'blunder hills', 'yum yum desert', 'frostbite tundra', 'hyperion nebula',
      'smolderin plateau', 'spirited valley',
      'journeyman', 'maestro', 'barbarian', 'squire', 'bowman', 'hunter',
      'shaman', 'wizard', 'divine knight', 'royal guardian', 'siege breaker',
      'beast master', 'blood berserker', 'bubonic conjuror', 'elemental sorcerer',
      'voidwalker', 'savage',
      'skilling', 'smithing', 'alchemy', 'construction', 'worship', 'sailing',
      'divinity', 'breeding', 'lab', 'cooking', 'gaming', 'catching', 'trapping',
      'stamps', 'star talent', 'star talents', 'talent', 'talents',
      'constellations', 'obols', 'statues', 'prayers', 'shrines', 'sigils',
      'vials', 'bubbles', 'cards', 'card set',
      'time candy', 'candy', 'afk gains', 'active play', 'afk',
      'amarok', 'efaunt', 'chizoar', 'kattlekruk', 'emperor',
      'sample', 'sampling', 'printer', '3d printer', 'refinery',
      'salt', 'void', 'cogs', 'bits', 'jade coins', 'gems',
      'death note', 'kill count', 'mob kills',
      'atom', 'atoms', 'particle', 'particles',
      'class change', 'subclass', 'elite class',
      'dungeon', 'dungeons', 'flurbo', 'dungeon credits',
      'guild', 'guild task', 'guild gp',
      'world boss', 'mini boss', 'colosseum',
      'companion', 'companions', 'pet arena',
      'merit shop', 'gem shop', 'daily task', 'weekly boss',
      'sailing island', 'captain', 'boat', 'artifact', 'artifacts',
      'worship soul', 'charge', 'totem',
      'nest', 'shiny', 'egg', 'eggs', 'incubator',
      'mainframe', 'chip', 'jewel', 'jewels',
      'crop', 'crops', 'meal', 'meals', 'kitchen',
      'summoning', 'summon', 'battle', 'essence',
      'sneaking', 'ninja', 'jade', 'pristine charm',
      'farming', 'plot', 'crop depot', 'ogre',
      'gaming sprout', 'gaming bit', 'gaming import',
      'idleon guide', 'idleon efficiency', 'idleon wiki',
      'lava dev', 'update', 'patch notes'],
    weight: 2.0
  },
  social_media: {
    keywords: ['social media', 'tiktok', 'instagram', 'twitter', 'x', 'snapchat',
      'threads', 'facebook', 'reels', 'shorts', 'fyp', 'for you page',
      'algorithm', 'viral', 'going viral', 'trending', 'trend', 'trends',
      'influencer', 'influencers', 'clout', 'followers', 'following',
      'likes', 'comments', 'shares', 'repost', 'retweet', 'quote tweet',
      'story', 'stories', 'highlight', 'dm', 'dms', 'slide into dms',
      'selfie', 'post', 'posting', 'posted', 'caption', 'bio',
      'verified', 'blue check', 'ratio', 'ratiod',
      'block', 'blocked', 'mute', 'muted', 'unfollow',
      'feed', 'timeline', 'notifications', 'notify',
      'content creator', 'creator', 'brand deal', 'sponsored', 'ad',
      'clickbait', 'engagement', 'reach', 'impressions',
      'hashtag', 'challenge', 'duet', 'stitch', 'collab',
      'cancel', 'cancelled', 'canceled', 'cancel culture', 'drama',
      'tea', 'spill the tea', 'expose', 'called out',
      'screen time', 'doom scrolling', 'doomscrolling', 'scroll',
      'parasocial', 'stan', 'fandom', 'mutuals', 'moots',
      'shadowban', 'shadowbanned', 'suppressed',
      'aesthetic', 'grid', 'theme', 'curate',
      'fancam', 'edits', 'fan edit', 'transition', 'transitions',
      'bereal', 'lemon8', 'bluesky', 'mastodon', 'fediverse'],
    weight: 1.1
  },
  health: {
    keywords: ['health', 'healthy', 'sick', 'ill', 'cold', 'flu', 'fever',
      'headache', 'migraine', 'stomach', 'stomachache', 'nausea',
      'doctor', 'hospital', 'dentist', 'appointment', 'checkup',
      'medicine', 'medication', 'pills', 'prescription', 'vitamins',
      'allergy', 'allergies', 'asthma', 'injury', 'injured', 'hurt',
      'surgery', 'operation', 'recovery', 'rehab', 'therapy', 'therapist',
      'mental health', 'anxiety', 'depression', 'panic attack', 'stress',
      'self care', 'wellness', 'hydrate', 'hydration', 'water intake',
      'immune', 'immune system', 'vaccine', 'covid', 'pandemic',
      'blood pressure', 'cholesterol', 'diabetes', 'diagnosis',
      'symptom', 'symptoms', 'chronic', 'pain management',
      'sleep schedule', 'sleep hygiene', 'circadian rhythm',
      'posture', 'ergonomic', 'screen break', 'eye strain',
      'sunscreen', 'skincare', 'skin care', 'dermatologist',
      'calories', 'nutrition', 'diet', 'balanced diet', 'supplements',
      'dehydrated', 'exhaustion', 'burnout', 'fatigue',
      'stretching', 'physical therapy', 'chiropractor', 'massage'],
    weight: 1.1
  },
  self_improvement: {
    keywords: ['self improvement', 'self-improvement', 'motivation', 'motivated',
      'discipline', 'disciplined', 'productive', 'productivity', 'routine',
      'habit', 'habits', 'goal', 'goals', 'resolution', 'resolutions',
      'mindset', 'growth', 'growth mindset', 'grind', 'grinding',
      'wake up early', 'morning routine', 'journal', 'journaling',
      'meditation', 'meditate', 'mindfulness', 'gratitude',
      'cold shower', 'cold plunge', 'ice bath', 'dopamine detox',
      'no fap', 'nofap', 'semen retention', 'dopamine',
      'reading', 'books', 'book', 'audiobook', 'podcast', 'podcasts',
      'gym rat', 'gym bro', 'monk mode', 'focus', 'deep work',
      'time management', 'procrastination', 'procrastinating',
      'accountability', 'consistency', 'consistent',
      'personal development', 'level up', 'glow up', 'transformation',
      'therapy', 'counseling', 'boundary', 'boundaries',
      'toxic trait', 'red flag', 'working on myself', 'bettering myself',
      'quit social media', 'screen time', 'digital detox',
      'affirmation', 'affirmations', 'visualization', 'manifest',
      'stoic', 'stoicism', 'marcus aurelius', 'david goggins',
      'atomic habits', 'james clear', 'huberman', 'jordan peterson',
      'confidence', 'self esteem', 'imposter syndrome',
      'comfort zone', 'challenge yourself', 'push yourself'],
    weight: 1.0
  },
  science_space: {
    keywords: ['science', 'scientist', 'research', 'study', 'experiment',
      'space', 'nasa', 'spacex', 'mars', 'moon', 'planet', 'planets',
      'star', 'stars', 'galaxy', 'universe', 'cosmos', 'astronomy',
      'astronaut', 'rocket', 'satellite', 'telescope', 'james webb',
      'black hole', 'nebula', 'asteroid', 'comet', 'meteor',
      'solar system', 'milky way', 'light year', 'orbit',
      'physics', 'quantum', 'relativity', 'gravity', 'atom',
      'chemistry', 'biology', 'evolution', 'dna', 'genetics',
      'dinosaur', 'dinosaurs', 'fossil', 'prehistoric',
      'ocean', 'deep sea', 'marine biology', 'ecosystem',
      'climate change', 'global warming', 'renewable', 'solar',
      'nuclear', 'fusion', 'fission', 'particle',
      'math', 'mathematics', 'calculus', 'statistics',
      'discover', 'discovery', 'breakthrough', 'invention',
      'robot', 'robotics', 'drone', 'autonomous',
      'elon musk', 'neil degrasse', 'bill nye',
      'documentary', 'kurzgesagt', 'veritasium', 'vsauce',
      'theory', 'hypothesis', 'simulation', 'simulation theory',
      'multiverse', 'parallel universe', 'time travel', 'wormhole',
      'terraforming', 'colonize', 'space station', 'iss',
      'geology', 'volcano', 'earthquake', 'tectonic',
      'archaeology', 'ancient', 'civilization', 'anthropology'],
    weight: 1.0
  },
  home_life: {
    keywords: ['apartment', 'house', 'home', 'room', 'bedroom', 'living room',
      'kitchen', 'bathroom', 'roommate', 'roommates', 'landlord', 'lease',
      'rent', 'mortgage', 'moving', 'moved', 'move in', 'move out',
      'furniture', 'ikea', 'couch', 'desk', 'bed', 'shelf', 'shelves',
      'clean', 'cleaning', 'chores', 'dishes', 'laundry', 'vacuum',
      'organize', 'organizing', 'declutter', 'minimalist', 'minimalism',
      'decor', 'decoration', 'decorating', 'plants', 'plant', 'houseplant',
      'neighbor', 'neighbors', 'noise', 'loud', 'quiet',
      'wifi', 'internet', 'power outage', 'electricity', 'utility',
      'groceries', 'grocery', 'shopping list', 'pantry', 'fridge',
      'adulting', 'bills', 'responsibilities', 'chore', 'errand', 'errands',
      'package', 'delivery', 'amazon', 'order', 'shipped',
      'cooking at home', 'meal prep', 'batch cooking',
      'pest', 'bug', 'bugs', 'mouse', 'mice', 'roach', 'ant', 'ants',
      'ac', 'air conditioning', 'heater', 'heating', 'thermostat',
      'renovation', 'diy', 'fix', 'repair', 'plumber', 'electrician',
      'backyard', 'garage', 'patio', 'balcony', 'garden', 'gardening',
      'security', 'camera', 'lock', 'key', 'smart home',
      'first apartment', 'living alone', 'living together'],
    weight: 0.9
  },
  cooking: {
    keywords: ['cooking', 'cook', 'baking', 'bake', 'recipe', 'recipes',
      'chef', 'kitchen', 'ingredients', 'ingredient', 'seasoning',
      'oven', 'stove', 'grill', 'grilling', 'bbq', 'smoker', 'smoking',
      'air fryer', 'instant pot', 'slow cooker', 'crockpot', 'microwave',
      'pan', 'skillet', 'pot', 'wok', 'cutting board', 'knife',
      'sautee', 'sear', 'braise', 'roast', 'broil', 'simmer', 'boil',
      'marinate', 'marinade', 'season', 'spice', 'spices', 'herbs',
      'garlic', 'onion', 'butter', 'olive oil', 'salt', 'pepper',
      'meal prep', 'prep', 'mise en place', 'from scratch',
      'homemade', 'home cooked', 'home made',
      'youtube recipe', 'tiktok recipe', 'food hack', 'hack',
      'gordon ramsay', 'joshua weissman', 'babish', 'matty matheson',
      'sourdough', 'bread', 'dough', 'ferment', 'fermentation',
      'smoked', 'charred', 'crispy', 'caramelized', 'glazed',
      'came out good', 'came out bad', 'burnt', 'overcooked', 'undercooked',
      'plating', 'presentation', 'taste test', 'first time making',
      'dinner tonight', 'lunch prep', 'what should i make',
      'beginner recipe', 'easy recipe', 'quick recipe', 'one pot',
      'cast iron', 'dutch oven', 'sheet pan', 'meal kit',
      'hello fresh', 'blue apron', 'home chef',
      'leftovers', 'batch', 'freeze', 'freezer meal', 'defrost',
      'comfort food', 'soul food', 'fusion', 'cuisine',
      'vegetarian', 'vegan', 'gluten free', 'dairy free', 'keto'],
    weight: 1.1
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
      // Use word boundary check for short keywords to avoid partial matches
      // (e.g., 'back' matching inside 'throwback')
      if (kw.length <= 4 && !kw.includes(' ')) {
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
  idleon: {
    generic: [
      'Idleon is one of those games that feels like a full time job and I love it',
      'The amount of content in Idleon is insane for an idle game',
      'AFK gains are hitting different today',
      'The wiki is basically required reading for Idleon',
      'How many characters you got going rn?',
      'Which world are you pushing through?',
      'The skilling grind in Idleon is weirdly satisfying',
      'Idleon has me checking my phone every 5 minutes for AFK rewards',
      'The progression in Idleon is so layered its actually crazy',
      'New update dropped? Time to rethink my entire setup',
      'Idleon is that game where you need a spreadsheet to play optimally',
      'LavaFlame2 is a one-man army creating all this content',
      'The amount of systems in Idleon is overwhelming but so rewarding',
      'Time candy go brrr',
      'Idleon gives you so much to do you never feel stuck',
      'That moment when your AFK gains hit perfectly chef kiss',
      'Idleon is the perfect game in the background while doing other stuff',
      'The class diversity in Idleon is actually nuts',
      'W1 to W6 is such a journey honestly',
      'Every world in Idleon feels like a different game almost',
      'The alchemy grind is either relaxing or painful depending on the day',
      'Construction progress in Idleon feels so good when it clicks',
      'Breeding and lab in W4 is a whole other level of complexity',
      'Sailing islands giving artifacts is addicting to unlock',
      'Worship charges building up while you sleep is peak idle gaming',
      'Idleon is the game I always come back to no matter what',
      'The gem shop tempts me but AFK gains are free and powerful',
      'Card farming in Idleon is my guilty pleasure',
      'Stamp upgrades adding up over time is so satisfying',
      'The divinity system is deep once you understand it',
      'Dungeon credits are worth farming fight me',
      'The community for Idleon is genuinely helpful',
      'Idleon subreddit and discord are clutch for guides',
      'Build guides for Idleon saved my life ngl',
      'Obols setup matters more than people think in Idleon',
      'That feeling when you unlock a new subclass though',
      'Elite classes in Idleon are game changers literally',
      'The kill count grind is long but the death note rewards are worth it',
      'Printer go brrr when you set it up right',
      'The refinery salt management is an art form',
    ],
    progress: [
      'What world are you on? The jump between worlds is real',
      'W3 to W4 is where things get really interesting',
      'W5 sailing and divinity opened up so much',
      'W6 content is wild the new systems keep coming',
      'How are your star talents looking?',
      'Constellations making a huge difference in progression',
      'Did you max out your stamps yet? That grind is endless',
      'Vials fully upgraded change the game fr',
      'The bubble upgrades in alchemy scale so hard',
      'Talent reset and respec is underrated for pushing progress',
      'Statues leveling up is slow but so impactful',
      'Prayer combos in Idleon are lowkey broken if you pick right',
      'Shrine placement optimization is galaxy brain stuff',
      'What does your lab mainframe look like?',
      'Jewels in the lab making a massive difference',
      'Chip setup in lab is where the big brain plays happen',
      'Your cooking meals giving bonuses to everything is chef tier',
      'Nest and breeding in W4 is a whole mini game',
      'Shiny pets are such a flex when you get one',
      'Pet arena team comp matters more than people realize',
      'Colosseum runs are worth doing regularly for the rewards',
    ],
    class: [
      'What class are you maining rn?',
      'Maestro is so good for account wide stuff',
      'Barbarian damage scaling is nuts once you invest',
      'Squire construction and refinery bonuses are clutch',
      'Bowman is underrated for damage output',
      'Hunter trapping efficiency is key for W3',
      'Wizard AoE damage goes crazy in the right setup',
      'Shaman is elite for alchemy and worship buffs',
      'Divine Knight is a beast for tanking and construction',
      'Beast Master with the right pets is insane',
      'Blood Berserker damage is through the roof',
      'Bubonic Conjuror for farming is unmatched',
      'Elemental Sorcerer hits so hard in W5+',
      'Voidwalker is endgame class goals',
      'Class change quest in Idleon is always exciting',
      'Subclass bonuses stacking up make such a difference',
      'Elite class grind is worth every second trust',
    ],
    tips: [
      'Dont sleep on alchemy bubbles early game trust me',
      'Stamps are permanent upgrades invest early invest often',
      'Cards are worth collecting even the common ones add up',
      'Star talents affect all characters so prioritize them',
      'The wiki has everything if you get stuck',
      'Join the Idleon discord theres always someone to help',
      'Focus on unlocking all character slots early',
      'AFK gains compound over time so patience pays off',
      'Dont skip the colosseum daily rewards stack up',
      'Construction helps everything even if it feels slow',
      'Lab and breeding in W4 are long term investments worth it',
      'Save your gems for the important stuff like storage upgrades',
      'Kill count is important for death note bonuses',
      'Printer setup matters more than you think for resources',
      'Refinery salt is a bottleneck so manage it carefully',
      'Worship and shrines give passive buffs dont ignore them',
    ]
  },
  social_media: {
    generic: [
      'My screen time report attacked me this week',
      'The algorithm knows me better than I know myself',
      'FYP is either amazing or a fever dream no in between',
      'I went down a TikTok rabbit hole for 3 hours',
      'Instagram reels are just TikToks a week later',
      'The discourse on Twitter today is absolutely unhinged',
      'Everyone is a content creator now and honestly why not',
      'That trend is everywhere rn I cant escape it',
      'The influencer economy is wild when you think about it',
      'Going viral must feel so surreal',
      'Screen time going up and I am not sorry',
      'The comment section is always better than the actual post',
      'Doom scrolling at 2am is a lifestyle at this point',
      'That edit on my timeline was actually fire',
      'The parasocial relationship discourse is so real',
      'Getting ratio\'d on main is a humbling experience',
      'The engagement bait posts are so obvious now',
      'Mutuals are the best part of social media',
      'Getting shadowbanned when you did nothing is so frustrating',
      'The trend cycle is moving faster than ever',
      'Remember when BeReal was a thing for like a month',
      'Twitter drama is free entertainment honestly',
      'Cancel culture discourse is exhausting at this point',
      'The transition edits on TikTok are actually impressive',
      'Instagram grid aesthetic people are built different',
      'Threads tried and well they tried',
      'Short form content is rewiring our brains and I accept it',
      'The tea accounts always have the scoop somehow',
      'Brand deals in every post now nothing is genuine anymore',
      'The notification sound is my trigger at this point',
      'Anyone else curate their feed obsessively or just me',
      'The mute button is the greatest social media invention',
      'Starting fresh with a new account hits different sometimes',
      'That persons content shows up everywhere for a reason',
      'The stan culture on social media is something else',
    ]
  },
  health: {
    generic: [
      'Drink water right now I know you havent today',
      'Hydration check everyone grab some water 💧',
      'Being sick is the worst especially when the weathers nice',
      'The doctor said Im fine but WebMD said otherwise',
      'Self diagnosing on Google is a dangerous sport',
      'Sleep schedule absolutely destroyed rn',
      'Healthy eating lasted about 3 days for me this time',
      'Mental health days should be normalized for real',
      'Therapy is actually goated more people should try it',
      'Allergies are attacking and I did nothing to deserve this',
      'The headache that wont go away is my villain origin story',
      'Stretching for 5 minutes actually changes your whole day',
      'Posture check sit up straight rn',
      'Eye strain from screens is so real take a break',
      'That feeling when the medicine finally kicks in though',
      'Being sick and having to function is peak suffering',
      'The immune system said we are closed today',
      'Hot tea and blankets are the only medicine I believe in',
      'Getting enough sleep is the cheat code nobody uses',
      'Vitamin D deficiency gang rise up (slowly)',
      'That post workout feeling makes it worth it',
      'Dental appointments are low key scary and you cant change my mind',
      'The yearly checkup you keep putting off yeah go do that',
      'Burnout is real and its not just being tired',
      'Boundaries are a form of self care fr',
      'The skincare routine is either 2 steps or 12 no in between',
      'Sunscreen every day trust the science on this one',
      'Stress eating is my cardio at this point',
      'That first day feeling better after being sick hits different',
      'Taking walks outside is free therapy honestly',
    ]
  },
  self_improvement: {
    generic: [
      'The grind never stops but make sure you rest too',
      'Consistency beats motivation every single time',
      'Day 1 or one day your choice',
      'Small wins compound into big results trust the process',
      'The morning routine people on YouTube make it look easy',
      'Cold showers are either life changing or torture depends who you ask',
      'Reading one book a month changes everything supposedly',
      'Meditation is hard but the results are real',
      'Journaling hits different when you look back months later',
      'Dopamine detox is trending but does anyone actually do it',
      'The gym is therapy that also gives you gains',
      'Procrastination is just your brain saying not yet... or never',
      'Atomic Habits actually changed how I think about routines',
      'David Goggins would not approve of my current lifestyle',
      'Comfort zone is comfortable but growth happens outside it',
      'Setting boundaries is the hardest but most important skill',
      'Level up mentality is cool but also rest is important',
      'productivity YouTube is either motivating or makes you feel bad',
      'Digital detox for a weekend and you feel like a new person',
      'Discipline is doing it even when you dont feel like it',
      'Your future self will thank you for what you do today',
      'The glow up is mental first physical second',
      'Progress isnt always visible but its happening',
      'Compare yourself to yesterday not to strangers online',
      'Manifesting works if you also put in the work',
      'Quitting social media for a week is humbling',
      'The 5am wake up gang I respect you from my bed at 10am',
      'Working on yourself quietly and letting results speak',
      'Imposter syndrome means youre growing out of your comfort zone',
      'Confidence is a skill you build not something you have',
    ]
  },
  science_space: {
    generic: [
      'Space is so cool and also terrifying at the same time',
      'The James Webb Telescope photos are genuinely breathtaking',
      'We are literally on a rock floating through space and people worry about wifi',
      'Black holes are the most metal thing in the universe',
      'The scale of the universe is impossible to actually comprehend',
      'Mars colonization sounds cool until you think about the logistics',
      'The deep ocean is scarier than space change my mind',
      'Science YouTube is the best side of the internet',
      'Kurzgesagt videos hit different at 2am existential crisis',
      'Dinosaurs were real and that still blows my mind',
      'The fact that we share DNA with bananas is wild',
      'Quantum physics makes zero sense and I love it',
      'The simulation theory is either genius or paranoia',
      'Multiverse theory is either the coolest or scariest idea ever',
      'SpaceX landings look like science fiction',
      'Elon trying to go to Mars while we cant fix earth lol',
      'The ISS is basically a house floating in space thats wild',
      'Volcanoes are just the earth being dramatic',
      'Climate change data is genuinely scary when you read into it',
      'The ocean floor is less explored than the moon how',
      'Gravity is so basic but nobody truly understands why it works',
      'Time dilation from relativity is the most mind bending concept',
      'Ancient civilizations were way smarter than we give them credit',
      'The Fermi paradox keeps me up at night where is everyone',
      'Neil deGrasse Tyson explaining things is always entertaining',
      'Bill Nye is the reason a whole generation loves science',
      'Random science facts are the best conversation starters',
      'The periodic table has elements we barely understand still',
      'Nuclear fusion would literally solve everything if we crack it',
      'Vsauce asking but what IS a thing at 3am hits different',
    ]
  },
  home_life: {
    generic: [
      'Adulting is just doing dishes forever until you die',
      'The apartment search is absolutely brutal rn',
      'Living alone is either amazing or terrifying at 3am',
      'Roommate drama is a universal experience',
      'The landlord doing the bare minimum as always',
      'IKEA furniture assembly is a relationship test',
      'My room is either spotless or a disaster no middle ground',
      'The package arriving is the best notification you can get',
      'Grocery shopping without a list is financial suicide',
      'The fridge is full but theres nothing to eat somehow',
      'Laundry day hits different when you have zero clean clothes',
      'Plant parents unite keepin them alive is harder than it looks',
      'The neighbors are testing my patience today',
      'First apartment vibes are unmatched but also scary',
      'The utility bill this month made me rethink my life',
      'Decorating your space is actually therapeutic',
      'A good desk setup changes your whole productivity',
      'The air fryer was the best investment Ive ever made',
      'Smart home stuff is either convenient or haunted no between',
      'That moment when you actually cook instead of ordering out W',
      'The wifi going out is a genuine emergency in this house',
      'Power outage era is when you realize you have no hobbies',
      'Moving is the worst experience nobody can convince me otherwise',
      'Organization TikTok makes me want to redo my whole life',
      'The couch is the center of the universe and I stand by that',
      'Budget living hacks actually work some of them',
      'The balcony or patio is premium real estate in apartments',
      'Garden people are living their best lives honestly',
      'Having a good mattress is the real adulting flex',
      'The thermostat war in a shared house is real',
    ]
  },
  cooking: {
    generic: [
      'Cooking from scratch hits different than ordering',
      'The recipe said 30 minutes and that was a lie',
      'Air fryer supremacy cannot be stopped',
      'Gordon Ramsay would be disappointed in what I just made',
      'Seasoning is the difference between good food and great food',
      'The first time you nail a recipe is such a W',
      'Cast iron pan people are a whole community and I respect it',
      'Meal prep Sunday is either productive or exhausting',
      'That smell when garlic hits the pan though',
      'Cooking for yourself vs cooking for others totally different energy',
      'The recipe looked easy on TikTok but reality was different',
      'Homemade always tastes better even when it doesnt look pretty',
      'Sourdough people are on another level of patience',
      'Burnt it? Its cajun style now keep moving',
      'The grocery bill for one recipe what',
      'Leftovers are either amazing or questionable by day 3',
      'One pot meals are the superior cooking format',
      'Knife skills are genuinely impressive to watch',
      'The clean up after cooking is the real challenge',
      'Baking is science cooking is art and I barely pass both',
      'Who else follows a recipe the first time then freestyles forever',
      'The instant pot changed lazy cooking forever',
      'Charred veggies are actually elite dont skip them',
      'Homemade ramen vs instant ramen two different universe',
      'Smoke alarm is just the cooking timer in this house',
      'That feeling when someone compliments your food though',
      'Dutch oven braising is comfort food engineering',
      'Food hacks that actually work are rare but amazing when found',
      'The spice rack is either organized chaos or just chaos',
      'Cooking with music on is the only way to do it',
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
    // Conversational / engaging replies
    'Wait hold on thats actually a really good point',
    'Ok but have you considered the other side of that?',
    'Ngl I never thought about it that way before',
    'Thats interesting but I kinda see it differently',
    'Ok this is a conversation I wanna be part of',
    'Yo that actually made me think for a second',
    'I need a second to process that take',
    'Ok wait explain more Im curious now',
    'That might be the most underrated opinion in this chat',
    'I was literally just thinking the same thing',
    'See this is why I check this chat',
    'You might be onto something here ngl',
    'This is the content I signed up for',
    'Idk why but this hits different when you say it',
    'Chat needed to hear this honestly',
    'We need more takes like this in here',
    'The way you said that was perfect actually',
    'Im screenshotting this take',
    'Can we talk about this more? Genuinely curious',
    'Wait thats actually fire I didnt expect that',
    // Question-back replies (more engaging)
    'Ok but real talk what made you think of that?',
    'Thats a solid take, but what would you do about it?',
    'I see where youre coming from, whats your reasoning though?',
    'Hmm interesting, do you always feel that way about it?',
    'Ok I hear you, but what about the flip side?',
    'Thats fair but Im curious what everyone else thinks',
    'Not bad not bad, anyone else wanna weigh in on this?',
    'You make a good case, what got you into thinking about that?',
    // Hot takes / personality
    'Controversial but I respect it',
    'Thats a spicy take and I am here for it',
    'Ok I wasnt expecting that but youre not wrong',
    'Bold of you to say that but honestly valid',
    'That take hit me in the gut ngl',
    'Ohhh now THATS an interesting perspective',
    'You just opened a whole can of worms and I love it',
    'I bet people are gonna disagree but I see it',
    'Wait that actually changes how I think about it',
    'Thats the kind of take that starts a whole debate',
    // Relatability
    'Bro literally me',
    'Why is this so relatable its actually scary',
    'You just described my exact situation rn',
    'This is too real honestly',
    'I feel attacked by how accurate that is',
    'Did you read my mind or something',
    'Its like youre living my life in a parallel universe',
    'This is way too specific to not be true',
    // Short but impactful
    'Nah youre right',
    'Actually yeah',
    'Wait youre so right',
    'Ok fair enough',
    'Cant even argue',
    'Touché honestly',
    'W mindset',
    'Elite thinking right there',
  ]
};

// ======================== PRONOUN / VAGUE REFERENCE RESOLVER ========================
// When someone says "it", "that", "this" — look back at recent messages to figure
// out what they're referring to, and inject that context into the signals.

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

const SLANG_REACTIONS = {
  agreement: {
    triggers: /^(?:w take|w|big w|huge w|dub|fax|facts|real|so real|thats real|too real|valid|based|true|fr fr|frfr|on god|no cap|ong|say less)$/i,
    responses: [
      'Biggest W in chat today',
      'Say it louder for the people in the back',
      'Fax no printer',
      'The realest thing said all day',
      'Chat needed to hear this',
      'Preach',
      'This is the way',
      'Certified correct take',
      'Respect the honesty',
      'Speaking nothing but facts rn',
    ],
  },
  hype: {
    triggers: /^(?:lets go+|sheesh|yoo+|ayoo+|pog|poggers|pogchamp|goated|insane|no way|broo+|yooo+|holy|clutch)$/i,
    responses: [
      'THE ENERGY IN HERE',
      'Chat is going crazy rn',
      'The vibes are unmatched',
      'This energy is contagious fr',
      'Sheeeesh',
      'We are so locked in',
      'The hype is real today',
      'Chat woke up and chose excitement',
      'This is what we live for',
    ],
  },
  vibe: {
    triggers: /^(?:bruh moment|bruh|oof|rip|pain|big L|massive L|down bad|its over|we lost|f in chat)$/i,
    responses: [
      'Pain.',
      'We take those Ls together',
      'The struggle continues',
      'Chat felt that one',
      'Moment of silence',
      'It really be like that huh',
      'The bruh-est of moments',
      'Adding this to the pain collection',
    ],
  },
  meme: {
    triggers: /^(?:ratio|cope|copium|seethe|npc|sus|sigma|grindset|main character|plot armor|canon|real and true)$/i,
    responses: [
      'The meme energy is strong with this one',
      'Chat is in peak form today',
      'Internet culture at its finest',
      'Certified internet moment',
      'The lore deepens',
      'This is going in the archives',
      'Peak chat behavior',
    ],
  },
  // Micro-responses for common 1-word chat messages
  micro_agree: {
    triggers: /^(?:same|mood|felt that|relatable|this|exactly|yep|yup|ye|yeah|ya|bet|aight|ok bet)$/i,
    responses: [
      'Literally same',
      'Mood honestly',
      'This is the one',
      'Say less',
      'Felt that in my soul',
      'You and me both',
      'Real',
      'Chat is in sync rn',
      'Living the same life apparently',
      'Couldnt have said it better',
    ],
  },
  micro_laugh: {
    triggers: /^(?:lol|lmao|lmfao|haha|hahaha|😂|💀|dead|im dead|crying)$/i,
    responses: [
      'Actually dying',
      'Chat is too funny today',
      'I cant with yall',
      'The comedy writes itself',
      'Bro stop im dead',
      'Peak comedy hours',
      'Yall are unhinged lol',
    ],
  },
  micro_nice: {
    triggers: /^(?:nice|gg|ggs|good game|wp|well played|ez|clean|clutch|goated)$/i,
    responses: [
      'GG indeed',
      'Respect the play',
      'Clean work honestly',
      'The W was earned',
      'Thats how its done',
      'Nothing but respect',
      'Chat approves',
    ],
  },
  micro_deny: {
    triggers: /^(?:nah|nope|cap|no way|hell no|absolutely not|negative|hard pass)$/i,
    responses: [
      'Understandable honestly',
      'Fair enough',
      'Respecting the stance',
      'Noted',
      'The verdict has been delivered',
      'Chat has decided',
    ],
  },
  micro_short: {
    triggers: /^(?:L|f|F|rip|oof|yikes|welp|oh|ah|hmm|hm|damn|dang|wow|wut|wat|huh)$/i,
    responses: [
      'Big mood',
      'Thats a whole vibe',
      'I felt that',
      'The energy is palpable',
      'Chat moment',
      'Eloquent',
    ],
  },
};

function matchSlangReaction(text) {
  const trimmed = text.trim();
  // Only match short messages (1-4 words) to avoid false positives on real sentences
  if (trimmed.split(/\s+/).length > 4) return null;
  for (const [category, data] of Object.entries(SLANG_REACTIONS)) {
    if (data.triggers.test(trimmed)) {
      return data.responses[Math.floor(Math.random() * data.responses.length)];
    }
  }
  return null;
}

// ======================== GENERIC QUESTION → KB RECOMMENDATION ========================
// When someone asks "whats the best game rn?" or "anyone know a good anime?" — pick
// a random known entity of the right type and recommend it naturally.

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

const SARCASM_PATTERNS = [
  /^oh (?:yeah|sure|great|wow|nice|cool|right|ok)\b.{10,}/i,
  /\btotally\b.*\bworks\b/i,
  /\bsure(?:ly)?\b.*\bthat(?:'s| is)\b/i,
  /\bwhat a (?:surprise|shock|concept|revelation)\b/i,
  /\bclearly\b.*\b(?:genius|amazing|wonderful|brilliant)\b/i,
  /\byeah (?:right|sure|ok|okay|because)\b/i,
  /\bwow (?:just|so|such|what)\b/i,
  /\boh (?:wonderful|fantastic|brilliant|amazing|lovely|joy)\b/i,
  /\bas if\b/i,
  /\b(?:real|very) helpful\b/i,
];

const SARCASM_RESPONSES = [
  'The sarcasm is tangible and I respect it',
  'I can feel the eye roll through the screen',
  'Tell us how you really feel',
  'The enthusiasm is overwhelming',
  'Noted with extreme sarcasm',
  'Love the energy honestly',
  'I appreciate the optimism',
  'The vibes are immaculate',
  'Peak positivity right here',
  'Someone woke up feeling expressive today',
  'I can taste the sarcasm from here',
  'Yall im sensing some subtle frustration',
];

// ======================== WITTY BYSTANDER SYSTEM ========================
// When the bot randomly fires (not directly pinged), it drops a funny one-liner
// reacting to what was said — playful roasts, comedic commentary, running gag energy.

const WITTY_BYSTANDER = {
  // Pattern-matched reactive humor — first match wins
  patterns: [
    // ── IDLEON — RNG / Drops / Luck ──
    { test: /\b(?:rng|drop rate|drop chance|rare drop|no drop|never drops|cant get|wont drop|rigged|not dropping|bad drops|droprate)\b/i,
      replies: [
        'RNG said "not today, not tomorrow, not ever"',
        'The drop table looked at you and laughed',
        'Somewhere a dev is watching your pain and smiling',
        'Have you tried sacrificing a Frog to the RNG gods?',
        'Lava personally coded the drop table to target you specifically',
        'Your drop luck is in the negative numbers at this point',
        'Maybe the real drops were the friends we made along the way',
        'Plot twist: the item doesnt actually exist in the game',
        'Bro the drop rate is a suggestion not a guarantee',
        'The drop table owes you rent at this point',
        'Your luck stat is so low it looped back to zero',
        'RNG stands for "Really Not Gonna" drop for you',
        'You couldnt get a common drop in a 100% drop rate game',
        'Even the wiki feels bad for your drop luck',
        'At this rate youll get the drop in Idleon 2',
        'Your drop chance just filed a restraining order',
        'I swear the game knows when you want something',
        'Your drops are on a permanent vacation',
        'Skill issue? Nah this is a luck issue on a cosmic level',
        'Lava buffed the drop rate... for everyone except you apparently',
        'At this point the drop table is gaslighting you',
        'You have been personally blacklisted by the loot algorithm',
        'My man is fighting the RNG boss and losing every round',
        'You could farm for a century and still get nothing',
        'The drop exists in a parallel universe where you are lucky',
        'Your luck peaked in W1 and has been downhill since',
        'New conspiracy theory: Lava nerfed YOUR account specifically',
        'RNG looked at your IGN and said nah',
        'Even prayer to the RNG gods gets return to sender',
        'Your drop rate is in scientific notation... negative exponent',
        'I have seen better luck on a disconnected account',
        'You are the control group in Lava experiment on suffering',
        'That item is allergic to your inventory apparently',
        'Bruh the drop table sent your request to the spam folder',
        'The wiki says the drop rate is X% but for you it is 0%',
        'Your account is the reason Lava added pity systems oh wait he didnt',
        'If bad luck was a speedrun category you would hold the world record',
        'Tell me you have no drops without telling me you have no drops',
        'The loot goblin looked at your account and kept walking',
        'Breaking news: local player discovers drops are a myth',
        'The game gave everyone else your drops as compensation',
        'Fun fact: you have mass-produced copium at this point',
        'You are not unlucky you are just built different... worse',
        'Legend says the drop will come... legend is wrong',
        'You should start a museum for all the drops you never got',
        'Your RNG makes a coinflip look generous',
        'Local man enters year 3 of farming the same mob',
        'Your drop log is just a blank page',
        'Impressive really... consistently getting nothing takes talent',
        'Your luck stat called in sick permanently',
        'Maybe the drop was the emotional damage we took along the way',
        'Congratulations you have unlocked the hidden "no loot" achievement',
        'POV: you are the reason developers add bad luck protection',
        'The drop table reviewed your application and decided to pass',
        'Bro got put on the do-not-drop list',
        'You are living proof that 1% does not mean 1 in 100',
        'Your account runs on a different RNG engine called Despair',
        'Plot twist: you already got the drop but it was invisible',
        'I heard Lava uses your account to test worst case scenarios',
        'That drop is so rare for you it became a cryptid',
        'Your RNG is not bad it is just built for a different game',
        'The drop is out there... it is just running away from you',
        'I bet you could flip a coin and get neither side',
        'Your luck is the tutorial for what not to expect',
        'If RNG was fair you would still find a way to lose',
        'Document this drop drought for the history books please',
        'At this rate you are gonna need a drop intervention',
        'The universe personally vetoed your loot privileges',
        'Fun game: take a shot every time you get nothing... actually dont',
        'You are the NPC that warns others about bad RNG',
        'Your drop chances rounded down to emotional damage',
        'Breaking: drop rate confirmed to be a collective hallucination for you',
        'You could open a support group for dropless players',
        'Your account is a case study in advanced suffering',
        'RNG: "I dont even know who you are" You: "you will"',
        'The drop saw your stats and took an alternate route',
        'They should name a debuff after your luck',
        'You have farmed so long the mobs started feeling sorry for you',
        'Have you considered that maybe the mob needs the item more than you',
        'The item dropped once... in your dreams... and you woke up',
        'At this point even Lava would feel bad... probably',
        'Your drop rate is a rounding error away from negative',
      ]},
    // ── IDLEON — AFK / Gains / Overnight ──
    { test: /\b(?:afk gains|afk rewards|overnight|left it afk|came back to|afk for|logged back|checked my gains|my gains|afk overnight|afk progress)\b/i,
      replies: [
        'The sweet sound of AFK gains printing money',
        'Your characters worked harder than you did today',
        'Imagine getting progress while sleeping couldnt be any other game',
        'AFK gains are basically free therapy',
        'You went to sleep and your characters pulled a double shift',
        'The real AFK gains were the bugs you didnt notice',
        'Your printer was carrying your entire account while you napped',
        'AFK gains: because actually playing the game is overrated',
        'Came back to gains or came back to disappointment?',
        'The characters deserve a raise honestly',
        'Bro treats this like a passive income simulator and honestly same',
        'Average Idleon enjoyer: works 8 hours, games 16 hours (AFK)',
        'Your guys were grinding while you were grinding at work meta',
        'The AFK gains giveth and the AFK gains... also giveth just slowly',
        'Left it overnight and woke up to crumbs probably',
        'Your characters have a better work ethic than you do',
        'Woke up to gains that would make a trust fund kid jealous',
        'AFK progress is just Idleon saying you deserve a break... kind of',
        'Your overnight gains were so good they should be illegal',
        'Logged back in expecting greatness got mediocrity instead',
        'The AFK grind never sleeps literally it doesnt',
        'Your characters pulled an all-nighter and you owe them overtime',
        'AFK gains are proof that laziness is a strategy',
        'Came back to check gains and now my whole day is ruined or made',
        'Bro logged out for 8 hours and his characters did more than he does in a week',
        'The overnight gains were so mid your characters are embarrassed',
        'AFK strats are the pinnacle of human evolution honestly',
        'You left it running overnight and your PC is judging you',
        'The gains were gains... technically... barely',
        'Your account progressed more in your sleep than most people do awake',
        'Overnight progress report: results may vary mostly they disappoint',
        'The AFK life chose you and you accepted gladly',
        'Checked gains at 3am like a normal well-adjusted person',
        'AFK gains hitting different when you forgot what you were even farming',
        'Your characters unionized while you slept they want benefits now',
        'Left it AFK and came back to either a feast or a famine no middle ground',
        'The overnight grind is the only thing consistent in my life',
        'AFK gains are like a box of chocolates except its usually empty',
        'Your guys farmed 12 hours and got the equivalent of 5 minutes of active play',
        'Woke up checked gains went back to sleep out of disappointment',
        'The passive income mindset but applied to a video game beautiful',
        'AFK rewards: because clicking things yourself is for casuals',
        'Your characters deserve employee of the month every month',
        'The gains were so small they needed a microscope to verify',
        'You treat AFK gains like a savings account and honestly respect',
        'Came back expecting progress got existential crisis instead',
        'AFK gains are the idle in Idleon and the pain in my heart',
        'Your overnight session produced enough gains to disappoint a spreadsheet',
        'The AFK progress bar moved and the crowd goes mild',
        'Left it AFK and the game decided to give everyone else your gains',
        'You logged back in so fast you caught your characters slacking',
        'The AFK grind is a marathon you run while unconscious',
        'Your gains report reads like a comedy special',
        'Average "I optimized my AFK setup" and got 2% more enjoyer',
        'AFK overnight and the game rewarded you with the bare minimum classic',
        'Your characters worked a double shift and the pay was terrible',
        'The AFK hustle is real the results are questionable',
        'Came back to gains that make minimum wage look generous',
        'Your account made progress while you drooled on your pillow inspiring',
        'AFK strats so good your active play feels pointless',
        'The overnight efficiency audit results are in... its not great',
        'You AFK farmed for 10 hours and got what active players get in 10 minutes oof',
        'Logging back in with hope and leaving with disappointment the Idleon cycle',
        'Your AFK gains have a better consistency than your sleep schedule',
        'Left it overnight expecting gains and the game left you on read',
        'The AFK calculator said one thing reality said another',
        'Your overnight yield report would make a stock trader cry',
        'AFK gains so bad your characters filed a complaint with HR',
        'Bro optimized the AFK setup and still got mid results the Idleon way',
        'The gains from sleeping are directly proportional to your low expectations',
        'Your characters AFKd harder than you work and got less for it',
        'Came back to gains that wouldnt impress anyone including yourself',
        'The AFK to disappointment pipeline is the most reliable system in Idleon',
        'Your overnight progress could be a rounding error and nobody would notice',
        'Bro checked gains so fast the game hadnt finished calculating yet',
        'AFK rewards are just the games way of giving you a participation trophy',
        'The passive grind is passive aggressive about rewarding you',
        'Your characters deserve a vacation after that overnight shift honestly',
        'AFK gains optimization is a science and youre still in elementary',
      ]},
    // ── IDLEON — Alchemy / Bubbles / Vials ──
    { test: /\b(?:alchemy|bubbles?|vials?|liquid shop|cauldron|pay2win cauldron|p2w bubble|orange bubble|green bubble|purple bubble|yellow bubble|brewing)\b/i,
      replies: [
        'Alchemy is just chemistry class but it never ends',
        'Bubbles going up is the most satisfying thing in Idleon dont @ me',
        'Your vials are crying for attention and honestly same',
        'Alchemy grind is a marathon not a sprint... a very long marathon',
        'The amount of liquid needed is actually criminal',
        'Bro is living in the alchemy tab and I respect it',
        'The bubble upgrades are like a drug the numbers must go up',
        'Liquid generation is the real endgame',
        'Your cauldrons are doing more work than most employees',
        'That feeling when a bubble finally levels up after 3 days',
        'Alchemy is where sanity goes to die',
        'I think about bubble levels in my sleep and thats okay right',
        'The vial grind is just collecting 47 random items for 0.5% bonus',
        'New bubble upgrade available! Only costs your entire liquid supply',
        'Green bubbles carrying the whole squad',
        'Your liquid production is measured in tears per hour',
        'Bro spent more time on alchemy than on actual life skills',
        'The cauldron speed upgrade costs HOW MUCH liquid oh my god',
        'Alchemy is Lava saying "you WILL do math and you WILL like it"',
        'Orange bubbles are the forgotten middle child and they know it',
        'Your bubble levels are your real credit score',
        'Vial collection is just Pokemon for masochists',
        'The alchemy tab has more depth than most entire games',
        'Liquid generation per hour is the stat that keeps me up at night',
        'Yellow bubbles sitting there being useless and expensive',
        'You need 47 million liquid for ONE bubble level this is fine',
        'The p2w cauldron exists and temptation is real',
        'Every time I check alchemy I lose an hour and gain nothing',
        'Your brewing speed is so slow snails are lapping you',
        'The alchemy grind makes the drop grind look casual',
        'Bro is optimizing bubble order like its a NASA launch sequence',
        'Green bubbles at high levels are basically cheating respectfully',
        'The liquid shop prices are highway robbery and we pay willingly',
        'Your vials page looks like a war crime of missing ingredients',
        'Alchemy progression is measured in months not days accept it',
        'That one bubble you cant afford is mocking you from the screen',
        'Purple bubbles are the sleeper OP that nobody talks about enough',
        'Your cauldron setup says a lot about your priorities as a person',
        'The amount of green liquid I need is giving me green liquid nightmares',
        'Alchemy is the reason I have trust issues with game mechanics',
        'Bubble levels going up by 1 and feeling like you conquered the world',
        'Your alchemy tab is a monument to patience and suffering',
        'Bro calculated the exact liquid needed for each bubble level in a spreadsheet',
        'The brewing process is slower than actual real life fermentation',
        'One day Ill have max bubbles one day... in 2035',
        'Alchemy is proof that Lava hates free time',
        'Your liquid generation is so low the cauldrons are running on hopes',
        'The vial you need requires a drop from a mob nobody farms classic',
        'Bubble cost scaling is violence in mathematical form',
        'Every new bubble tier makes me question my life choices',
        'Your alchemy page is a graveyard of unfinished upgrades',
        'Bro treats the alchemy tab like a second job and gets paid in suffering',
        'The liquid deficit in your account could fill an ocean of sadness',
        'Orange bubble enjoyers are a rare and brave species',
        'Alchemy optimization guides are longer than most college textbooks',
        'Your bubble priorities are wrong and everyone is too polite to say it',
        'That feeling when you realize you have been leveling the wrong bubble for a week',
        'Brewing speed buffs are the most underrated thing in Idleon fight me',
        'The cauldron tab should come with a mental health warning',
        'Vial farming is just you standing in a field hoping for drops with extra steps',
        'Your alchemy is so behind even your characters are judging you',
        'Liquid shop refreshing and having nothing good is a daily trauma',
        'The green bubble grind alone could be a standalone game',
        'Bro has more alchemy tabs open in his browser than actual game tabs',
        'One does not simply "just level up alchemy" it consumes you',
        'Your liquid per hour makes charity donations look generous by comparison',
        'Alchemy is the tutorial that never ends welcome to forever',
        'Bro leveled one bubble and celebrated like it was a world first',
        'The liquid economy in your account is in a permanent recession',
        'Your cauldrons are on life support and the prognosis is not good',
        'Bubble levels are just numbers that make you feel poor',
        'The alchemy grind teaches patience the kind that breaks you',
        'Bro needs purple liquid but the game keeps giving green classic RNG',
        'Your vial collection is 40% complete and 100% painful',
        'Alchemy is where time goes to vanish without explanation',
        'The bubbles dont care about your feelings they only care about liquid',
        'Bro has been brewing the same thing for 3 days and its still not done',
        'Your alchemy efficiency is a war crime against productivity',
        'Liquid costs scaling exponentially is Lavas final boss move',
        'The cauldron upgrade you want is always 2 million liquid away always',
      ]},
    // ── IDLEON — Printing / Sampling / 3D Printer ──
    { test: /\b(?:printer|3d print|sampling|sample|print(?:ing|ed)|printer setup|atom|atoms)\b/i,
      replies: [
        'Printer go brrrrr',
        'The 3D printer is basically a money cheat and I am not complaining',
        'Sampling setup took longer than filing taxes',
        'Your printer is working harder than you are',
        'Atoms are the real currency in this game fr',
        'The printer doesnt sleep so why should you',
        'Print everything. Question nothing.',
        'Sampling optimization is a full time job disguised as a game feature',
        'Average printer enjoyer: hasnt touched grass in 72 hours',
        'The print slots are never enough its never enough',
        'Your atoms per hour is my favorite stat to obsess over',
        'When the printer hits right you feel like a genius honestly',
        'The sampling grind is just standing there... menacingly',
        'Your 3D printer has more output than a real factory at this point',
        'Printer setup guides are longer than most instruction manuals',
        'The atom economy is more complex than real economics',
        'Sampling for hours and getting mid results the Idleon experience',
        'Your print queue is backed up worse than a DMV',
        'Bro optimizing printer slots like hes planning a heist',
        'The printer is the unsung hero of every Idleon account',
        'Atom costs scaling up is a personal attack on my progress',
        'Sampling efficiency is what separates the boys from the men',
        'Your printer gave you more materials than a month of active play',
        'Print slot upgrades costing more each time is just cruel math',
        'The 3D printer is Lava saying "here have free stuff but also suffer"',
        'Sampling optimization spreadsheets have more cells than Excel intended',
        'Your atoms per second counter is the real scoreboard',
        'Printer go brr but also printer go "that will cost you 3M atoms"',
        'Every time I unlock a new print slot I get a serotonin hit',
        'The sampling setup is a puzzle and I am bad at puzzles',
        'Your printer is doing gods work while you sleep',
        'Atom generation is peak passive income energy',
        'Bro has more printer tabs open than browser tabs',
        'Sampling mid-tier items and pretending its optimal',
        'Your print samples are the backbone of your entire account',
        'The printer upgrade path is a marathon through quicksand',
        'Atoms are so valuable they should be a real cryptocurrency',
        'Your 3D printer is worth more than your car at this point',
        'Sampling RNG is its own layer of suffering nobody talks about',
        'The printer slot grind is where patience goes to be tested',
        'Bro printed enough items to open a department store',
        'Your atom generation makes the fed reserve look slow',
        'Printing overnight and waking up to actually good results rare but amazing',
        'The optimal sampling setup changes every patch and I cry every time',
        'Your printer carried you through W4 and it didnt even ask for thanks',
        'Atom upgrades are the thing you forget about until someone reminds you',
        'Sampling is the idle within the idle game inception',
        'Print slot efficiency is the metric nobody asked for but everyone needs',
        'The 3D printer makes me feel like a factory owner without the money',
        'Your sampling time per item is either optimal or a cry for help',
        'Atoms building up slowly is the most zen thing in Idleon',
        'Printing resources while sleeping is why this game is addicting',
        'The atom investment always pays off eventually... eventually',
        'Bro calculated optimal print samples during a meeting and I respect it',
        'Your printer is the MVP and you dont appreciate it enough',
        'Sampling efficiency guides are a rabbit hole with no bottom',
        'The print tab is where I spend 30% of my Idleon time and Im not sorry',
        'Your atoms funded more upgrades than your actual farming ever did',
        'Printing is the silent engine that powers every build in this game',
        'The optimal sampling debate could fuel a 3-hour podcast',
        'Your 3D printer output log reads like a fantasy novel of resources',
        'Atom costs at high levels are what nightmares are made of',
        'Sampling new items and hoping the rates are good copium',
        'The printer carried you and you dont even mention it in your progress posts',
        'Bro is running a printing empire from his phone',
        'Your sample rates are either elite or embarrassing no in between',
        'Printing is the answer to the question you never asked but always needed',
        'The atom grind is never over it just evolves into a worse atom grind',
        'Your 3D printer deserves a thank you card honestly',
        'Sampling gains are the most reliable thing in this unreliable game',
        'Print queue management should be a skill on a resume',
        'The printer tab is my comfort zone and I refuse to leave',
        'Your atom spending habits are more impulsive than your Amazon orders',
        'Printing in Idleon: where you become an industrial tycoon against your will',
        'The best sampling setup is the one you dont have to think about anymore',
        'Bro wakes up checks printer before checking messages priorities',
        'Your print output is the only consistent source of joy in this game',
        'Atoms per hour optimization is a lifestyle not a hobby',
        'The printer is the best feature Lava ever added I will die on this hill',
        'Sampling overnight and praying to the print gods every single time',
      ]},
    // ── IDLEON — Construction / Refinery / Salt ──
    { test: /\b(?:construction|refinery|salt|cog|cogs|shrine|shrines|building|tower defense|worship charge|worship)\b/i,
      replies: [
        'Construction is the game within the game within the game',
        'Salt management requires a PhD at this point',
        'Your cog setup is either perfect or a disaster theres no in between',
        'The refinery is basically a salt mine and youre the miner',
        'Shrine placement is galaxy brain territory',
        'Construction speed is never fast enough I said what I said',
        'Your salt production is my roman empire',
        'Cogs connecting perfectly is better than any drop',
        'Worship charges building up while you sleep is peak idle gaming',
        'The tower defense in construction is surprisingly addicting',
        'Salt deficit is the real villain of Idleon',
        'Your shrines are carrying your account and they dont even know it',
        'Refinery upgrades feel like theyre measured in geological time',
        'One does not simply have enough salt',
        'Your cog layout looks like modern art and not the good kind',
        'The refinery salt costs make alchemy look cheap and thats saying something',
        'Bro spent more time placing cogs than playing the actual game',
        'Construction towers are the tower defense game that snuck into an idle game',
        'Worship charges are the most satisfying thing to watch accumulate',
        'Your salt deficit is so bad even a salt mine would feel bad',
        'Cog optimization is galaxy brain activity and I am barely planet brain',
        'The shrine bonus calculator crashed because your shrines are that bad',
        'Refinery cycle speed is measured in geological epochs',
        'Construction is where you discover math was the real enemy all along',
        'Your cog chains are either art or a war crime theres no middle ground',
        'Salt production vs salt cost is the eternal suffering equation',
        'Bro has more cog configurations saved than actual save files',
        'The worship tab exists and 90% of players forget about it',
        'Shrine levels going up by 1 and your whole account feels it',
        'Your refinery looks like you went through all 5 stages of grief building it',
        'Construction speed bonuses are never enough never ever enough',
        'The cog connection sound effect should be an ASMR video',
        'Your salt income is negative and you pretend its fine this is fine',
        'Refinery rank ups taking 3 days per cycle is Lava personally attacking you',
        'Construction is the most underrated system and the most confusing simultaneously',
        'Bro treats cog placement like chess grandmaster level strategic thinking',
        'Your worship charges maxed out and you forgot to collect them again',
        'The shrine grind is the definition of slow and steady or just slow',
        'Refinery salt types are more confusing than actual chemistry',
        'Cog bonuses compounding is secretly the most powerful thing in the game',
        'Your construction tab has been neglected and the towers know it',
        'Salt management spreadsheets have more rows than my accounting software',
        'The refinery wants your salt your sanity and your firstborn',
        'Worship charge farming is just building towers for theological reasons',
        'Bro calculated optimal cog paths during real construction work ironic',
        'Your shrine placement is so bad the gods are cringing',
        'Refinery progress is visible only with a microscope and infinite patience',
        'Construction towers carrying your worship charges like Atlas carrying the world',
        'Your salt economy is in shambles and the UN should intervene',
        'Cog setups that actually work are rarer than divine pets',
        'The refinery cycle complete notification is the best notification in gaming',
        'Bro is running a salt empire and still in debt somehow',
        'Construction is 50% strategy 50% crying about salt',
        'Your worship charges per hour make you feel something I just dont know what',
        'The shrine bonus is so small you need a microscope to appreciate it',
        'Refinery upgrades cost more salt than the ocean contains',
        'Cog placement guides exist and they are still confusing',
        'Your construction is so neglected the towers filed a missing person report',
        'Salt production optimization is the true idle endgame',
        'The refinery is a salt vampire and you are the victim',
        'Bro checks refinery status more often than his bank account',
        'Your cog efficiency is either impressive or impressively bad',
        'Construction progress measured in millimeters per century',
        'Worship charges go up towers go brr salt goes bye',
        'The construction tab should come with a therapy voucher',
        'Your refinery progression is a slow burn emphasis on slow',
        'Cog chains are the spaghetti code of Idleon and you wrote the worst code',
        'Salt deficit recovery plan: step 1 cry step 2 farm step 3 cry again',
        'Construction is where idle gamers discover they actually enjoy tower defense',
        'Your shrine levels compared to top players make you want to uninstall',
        'The refinery exists to remind you that progress is an illusion',
        'Bro moved one cog and his entire construction collapsed domino style',
        'Your worship charges are the only reliable thing in your Idleon life',
        'Salt generation is the heartbeat of your account and its flatlining',
        'Construction optimization guides need a construction optimization guide',
        'The cog system is either genius game design or evidence of insanity both work',
        'Your refinery cycle times make international shipping look fast',
        'Shrine bonuses at max level are worth the lifetime of grinding said no one',
        'Construction is the content that keeps giving and by giving I mean hurt',
        'Your salt storage is full but your salt needs are fuller somehow',
        'Bro has PTSD from refinery salt costs and honestly same',
      ]},
    // ── IDLEON — Sailing / Artifacts / Islands ──
    { test: /\b(?:sailing|island|captain|boat|artifact|artifacts|sailing island|loot pile|sailing loot|chest|treasure)\b/i,
      replies: [
        'Sailing is just clicking islands and praying',
        'The artifacts are worth more than my real life possessions',
        'Captain RNG is the final boss of Idleon',
        'Your boats are on a journey and so are you emotionally',
        'Island unlocks hit different every single time',
        'Sailing is the slot machine of Idleon and we are all gambling addicts',
        'New artifact dropped? Time to rearrange your entire setup again',
        'The loot piles are calling your name',
        'Your captains are doing more traveling than you ever will',
        'Artifact luck is either feast or famine theres no middle ground',
        'Boats maxed out and still not fast enough the struggle',
        'That one island you cant reach yet haunts your dreams',
        'Sailing speed upgrades are a scam and I keep buying them',
        'Your sailing map looks like a choose your own adventure book of pain',
        'Captain levels are the RNG within the RNG within the RNG',
        'Artifact rarity tiers are a rollercoaster of emotions',
        'Bro is sending boats out like Columbus except with worse luck',
        'The loot pile you cant reach yet is mocking you across the ocean',
        'Your sailing routes are more optimized than most delivery services',
        'Island discovery is the exploration dopamine hit that keeps us addicted',
        'Captain stats rolled low again what a surprise said no one',
        'Sailing artifacts are the gear score of Idleon and you are undergeared',
        'Bro treats boat management like hes running a shipping company',
        'The treasure chest RNG is just going to hurt me why do I even hope',
        'Your boats are slower than a grandma driving on a Sunday',
        'Artifact upgrades making the whole account better is chefs kiss when it works',
        'Captain RNG gave you the worst stats again congrats on consistency',
        'The sailing tab is 10% strategy 90% vibing with the ocean',
        'Your island progression is either speedrunning or crawling no in between',
        'Loot piles are the Christmas presents of Idleon mostly disappointing',
        'Bro got a rare artifact and built his entire personality around it',
        'Sailing overnight and coming back to mid loot the classic experience',
        'Your captain diversity is either perfect or youre running 5 copies of the same one',
        'The artifact you want has a 0.1% chance and your luck stat is negative sooo',
        'Boat speed upgrades are the treadmill of sailing you run and go nowhere',
        'Island rewards scaling with distance is cool until you see the distance',
        'Your sailing setup is either meta or a creative interpretation of the meta',
        'Captain rerolls costing resources is the tax on bad luck',
        'The sailing system is deceptively complex underneath those cute boats',
        'Bro has more boats than a marina and less luck than a mirror factory',
        'Artifact farming is just sailing into the void hoping for the best',
        'Your boats are on a voyage of disappointment across the sea of copium',
        'Island unlock requirements getting steeper is Lava climbing the evil ladder',
        'The loot from sailing funded zero percent of my progress but all of my hope',
        'Captain stat rolls are a personality test of how patient you are',
        'Sailing is the AFK within the AFK game its idle squared',
        'Your artifact collection is either impressive or impressively empty',
        'Bro checks sailing loot more often than his text messages',
        'The boat journey time vs reward ratio is a mathematical tragedy',
        'Sailing optimization guides are just people coping with bad captain rolls',
        'Your islands discovered counter is the bragging stat nobody asked for',
        'Artifact tier upgrades cost materials I didnt even know existed',
        'The sailing grind is a slow burn that never actually catches fire',
        'Captain luck is predetermined and its predetermined to be bad',
        'Your loot piles are collecting dust because you forgot to collect them',
        'Bro sailed for a week and got the artifact equivalent of a participation trophy',
        'The optimal sailing setup changes every update and Im tired',
        'Your boats deserve better captains and your captains deserve better luck',
        'Sailing is the feature that made me realize patience is not my virtue',
        'Artifact RNG is the universe reminding you that hope is a trap',
        'Your sailing progress bar moves slower than continental drift',
        'The island map grows bigger but your luck stays the same size tiny',
        'Bro built the perfect fleet and the ocean said no',
        'Sailing loot is Lava giving you a present wrapped in disappointment',
        'Your captain roster reads like a support group for bad stat rolls',
        'The sailing meta evolved and left your boats in the stone age',
        'Artifact hunting is the real treasure the artifacts are not',
        'Bro has been sailing since W5 launch and still cant reach that one island',
        'Your boat speed makes me think they are rowing with spoons',
        'The satisfaction of a new island unlock is worth all the suffering before it',
        'Captain optimization is a full time hobby that pays in sadness',
        'Your sailing tab is open more than any other tab and that says everything',
        'Loot piles are the lottery tickets of Idleon and you keep losing',
        'The artifact grind is a marathon with hurdles and the hurdles are RNG',
        'Bro treats every boat launch like a NASA mission but with worse odds',
        'Your sailing islands look like a connect-the-dots of unfulfilled dreams',
        'Artifact effects stacking is peak Idleon power fantasy when it works',
        'The captain training system is a lesson in managing expectations down',
        'Your sailing fleet is a monument to patience and questionable time management',
      ]},
    // ── IDLEON — Breeding / Lab / W4 ──
    { test: /\b(?:breeding|nest|shiny|egg|eggs|incubator|pet arena|lab|mainframe|chip|jewel|jewels|territory|spice|w4|world 4|hyperion)\b/i,
      replies: [
        'W4 is where Idleon becomes a completely different game',
        'Breeding is basically Pokemon but with more math',
        'Shiny pet flex is the ultimate Idleon status symbol',
        'The lab mainframe is what genius looks like',
        'Chip and jewel optimization is elite gamer behavior',
        'Your nest is producing eggs faster than a chicken farm',
        'Pet arena team comp is serious business around here',
        'Breeding RNG is a different kind of pain',
        'Lab bonuses carrying the entire account silently',
        'Territory fights in breeding are surprisingly heated',
        'Shiny hunting is the real endgame of Idleon change my mind',
        'The incubator is working overtime and so is my anxiety',
        'Your mainframe setup says a lot about you as a person',
        'W4 complexity makes W1 look like a tutorial which it is',
        'Spice management is a lifestyle not a mechanic',
        'Your breeding pairs are either strategic genius or random chaos',
        'Lab chips are the hidden power that nobody explains well',
        'Shiny pet probability is just RNG wearing a fancy hat',
        'The territory map is a warzone and your pets are the soldiers',
        'Egg timer management is the most unexpectedly stressful part of Idleon',
        'Bro hatched 500 eggs and got one shiny what a world',
        'Your lab connections look like a conspiracy theory board and I love it',
        'Jewel placement is tetris but the stakes are your entire account',
        'Breeding speed vs shiny chance the eternal sacrifice',
        'W4 hit you like a truck and then reversed over you',
        'Pet arena meta shifts every time someone discovers a new combo',
        'Your mainframe connections are either optimal or a cry for help',
        'Shiny pets are Lava saying "here have a 0.001% chance of joy"',
        'The lab node you cant reach yet is taunting you from across the screen',
        'Breeding territory disputes are more serious than international politics',
        'Bro studies breeding charts more than any textbook in school',
        'Your incubator slots are the most precious resource in W4',
        'Lab bonus stacking is where the real big brain plays happen',
        'Chip costs at higher levels make you question the value of progress',
        'The pet arena leaderboard is serious business dont disrespect it',
        'Shiny hunting in Idleon is the grind that defines your patience',
        'Your breeding strategies have more depth than most game entire systems',
        'Lab jewels rearranging because of one new unlock the butterfly effect',
        'W4 progression is a vertical cliff disguised as a world map',
        'Egg quality RNG is just another layer of the suffering cake',
        'The mainframe visual is the most satisfying spider web ever built',
        'Bro has more pet data tracked than NASA has satellite data',
        'Your territory control is either dominating or getting dominated',
        'Breeding pets for specific genes is genetic engineering for gamers',
        'Lab connections giving massive bonuses and being impossible to set up classic',
        'Chip farming is the side hustle you didnt sign up for but cant quit',
        'The shiny notification sound is the best sound in all of Idleon',
        'Your pet arena team would get swept by a gentle breeze honestly',
        'W4 is where casual players become spreadsheet managers involuntarily',
        'Breeding optimization guides are PhD dissertations in disguise',
        'The lab mainframe looks like someone spilled spaghetti on a circuit board',
        'Jewel bonuses compound and suddenly your account is carried by W4',
        'Bro spent more time in the breeding menu than actually playing any character',
        'Your shiny count is either a flex or a participation trophy one or the other',
        'Territory bonuses are so good they make everything else feel pointless',
        'Lab connectivity is the most satisfying puzzle in Idleon when it works',
        'Chip and jewel management should count as project management experience',
        'The egg hatch animation is both exciting and usually disappointing',
        'Pet arena matchmaking is a personal attack disguised as a feature',
        'W4 spice farming is just cooking prep but for stat bonuses',
        'Your lab setup carries more weight than most characters on your account',
        'Breeding RNG giving you the exact opposite of what you wanted on brand',
        'Shiny odds are technically possible the same way winning the lottery is',
        'The mainframe path options are giving choose your own suffering adventure',
        'Bro wakes up checks eggs before brushing teeth real priorities',
        'Your pet collection is either curated or a zoo of randomness',
        'Lab green connections are the ones that make or break your whole setup',
        'Territory defense teams that actually hold I have never seen one',
        'Breeding is the feature that made me understand hereditary probability violently',
        'Chip slots opening up is dopamine in crystallized form',
        'The W4 learning curve is less of a curve and more of a wall',
        'Shiny pet trades are the stock market of the Idleon community',
        'Your pet arena strategy is either copied from a guide or abstract art',
        'Lab bonus tooltips reading like another language until W4 clicks',
        'Bro has a dedicated notebook just for breeding combinations',
        'Your incubator queue is the most important queue in your life',
        'W4 matured the game from idle clicker to idle management sim',
        'Egg species variety is Lava flexing game design creativity',
        'The breeding lab nexus is where your sanity negotiates with your ambition',
        'Your territory ranking is a direct measurement of your obsession level',
        'Pet arena losses are character building... for the player not the pets',
        'Lab chip farming is the grind that grinds you',
      ]},
    // ── IDLEON — Cooking / Meals / Kitchen ──
    { test: /\b(?:cooking|meal|meals|kitchen|recipe|food buff|dining|plate|ladle|spice rack)\b/i,
      replies: [
        'The Idleon kitchen is more productive than my real kitchen',
        'Meal upgrades making everything better is peak game design',
        'Your cooking game in Idleon is better than your cooking game irl',
        'Kitchen efficiency is the metric that matters most',
        'Plates stacking up is satisfying on a primal level',
        'The meal bonuses are low key carrying everything',
        'Cooking in W4 is a whole culinary education',
        'Your ladle game is either elite or embarrassing',
        'Food buffs are the silent heroes of every Idleon build',
        'Overflowing kitchen is a problem I wish I had irl',
        'Your meal levels are either respectable or a health code violation',
        'Cooking speed upgrades are the unsung heroes of W4',
        'Bro is running a Michelin star kitchen in an idle game',
        'The recipe grind is Iron Chef but with worse ingredients',
        'Meal bonuses stacking up is the compound interest of Idleon',
        'Your kitchen output could feed the entire Idleon playerbase',
        'Cooking is where W4 goes from complex to "wait theres MORE?"',
        'The ladle efficiency calculation requires a PhD in food science',
        'Plate management is the most unexpectedly important thing in W4',
        'Bro optimizing meal order like a restaurant during rush hour',
        'Your cooking levels are the silent flex nobody appreciates enough',
        'Food buffs carrying builds that would otherwise be trash delicious',
        'The spice rack optimization is a whole side quest of suffering',
        'Kitchen upgrades costing more each time is just mean spirited',
        'Meal progression is the slow cooker of Idleon content literally',
        'Your recipe collection reads like a fantasy cookbook of suffering',
        'Cooking speed at low levels is watching paint dry but the paint is soup',
        'The kitchen tab is 90% waiting and 10% rearranging meals',
        'Bro takes his Idleon kitchen more seriously than meal prepping irl',
        'Plate bonuses are the thing you forget about until someone flexes theirs',
        'Your cooking capacity is either overflowing or bone dry no in between',
        'Meal quality scaling with level is satisfying in a way I cant explain',
        'Kitchen efficiency guides are just calorie counting for gamers',
        'The food buff tooltip reading like a restaurant menu of power',
        'Cooking is proof that Lava can make anything into a grind even eating',
        'Your meal priority list reveals your deepest Idleon values',
        'Ladle upgrades feel insignificant until you realize they compound',
        'Bro has better meal management in Idleon than his actual nutrition',
        'The kitchen is the quiet backbone of every optimized account',
        'Plate stacking visuals are the most oddly satisfying thing in W4',
        'Recipe unlocks getting harder is the chef equivalent of a boss fight',
        'Your meal bonuses are either meta defining or a culinary disaster',
        'Cooking speed buffs from other systems creating the ultimate food chain pun intended',
        'The kitchen economy is more stable than most real world economies',
        'Bro calculated DPS per meal and thats either genius or concerning',
        'Your food production could solve world hunger if it was real',
        'Cooking is the feature that snuck into W4 and became essential without asking',
        'Meal level milestones hitting like a dopamine injection',
        'The recipe you want requires farming a mob you hate classic Idleon',
        'Kitchen optimization is where science meets gaming meets suffering',
        'Your cooking setup is either optimal or you just threw ingredients at the wall',
        'Plate bonuses at high levels are the hidden OP that carries silently',
        'Bro checks his Idleon kitchen temperature more than his oven at home',
        'Meal planning in a video game shouldnt be this engaging and yet here we are',
        'The cooking grind is the most delicious kind of pain',
        'Your kitchen produces more value than some small businesses',
        'Food buff diversity is the spice of Idleon life literally',
        'Cooking bonuses compound with everything else and suddenly you are OP',
        'Bro reached max cooking level and unlocked inner peace',
        'The ladle is the real weapon in Idleon forget swords',
        'Your recipe book has more entries than most actual cookbooks',
        'Kitchen management is the culinary arts degree you didnt ask for',
        'Meal efficiency per hour is the stat that keeps food gamers up at night',
        'Cooking progression from noob to chef is the best character arc in Idleon',
        'Your plates are stacked higher than your expectations and thats saying something',
        'The kitchen is where patience and hunger meet in a game about not eating',
        'Bro treats every meal upgrade like he is presenting to Gordon Ramsay',
        'Food buffs at max level make you feel invincible until you remember boss scaling',
        'Cooking is the system that proves idle games can make you care about fake food',
        'Your kitchen should have a Yelp rating at this point 5 stars',
        'Meal grinding is just cooking in real time but slower somehow',
        'The recipe drop rates are the drop rates of the culinary world terrible',
        'Kitchen meta changing with patches keeps the chefs on their toes',
        'Bro built his entire account around cooking bonuses and honestly it works',
        'Your meal prep game in Idleon puts your real meal prep to shame',
        'Cooking is the feature nobody asked for but everyone secretly loves',
        'The kitchen produces more consistent results than any RNG system in the game',
        'Plate optimization is the home economics class you never took',
        'Bro is a professional Idleon chef and puts it on his resume',
      ]},
    // ── IDLEON — Divinity / W5 / Sailing & Gods ──
    { test: /\b(?:divinity|god|gods|link|divine link|offering|w5|world 5|smolderin|divin)\b/i,
      replies: [
        'W5 divinity is basically choosing which god likes you most',
        'The divine links make or break your build no pressure',
        'Offerings going up is the real endgame grind',
        'Divinity is where you realize this game is actually deep',
        'Your god links say a lot about your playstyle honestly',
        'W5 is when Idleon stops playing around and gets real',
        'Offering bonuses compounding is basically free power',
        'The divinity tab makes me feel like Im managing a religion',
        'Which gods are you running? This is a judgment zone btw',
        'Divinity optimization hits different at 3am',
        'Your divine link choices reveal your soul... or your laziness',
        'W5 gods looking at your offerings like "is that all you got?"',
        'Divinity progression is the spiritual journey nobody expected from an idle game',
        'Bro worships a god in Idleon more devotedly than anything irl',
        'Your offering rates are either impressive or insulting to the gods',
        'The god link system is basically Tinder but for deities',
        'W5 difficulty spike hit different from every other world',
        'Divine link swapping is the gear swap of the divine realm',
        'Offering efficiency per hour is the prayer metric that matters',
        'Bro has more faith in Idleon gods than in real world RNG',
        'Your divinity tab is either organized or an act of heresy',
        'W5 content making you feel small in a game about being big',
        'The divine link bonuses are lowkey the strongest buffs in the game',
        'God favor increasing slowly is the spiritual version of watching paint dry',
        'Divinity is where min-maxers become theologians',
        'Your god progression says youre either devoted or distracted',
        'W5 is the world that humbles even the most optimized accounts',
        'Offering costs scaling up is the tithe system of Idleon',
        'Bro calculated optimal divine links on a spreadsheet and prayed for the best',
        'Your link configuration is either meta or heretical no middle ground',
        'The divinity system rewards patience and punishes impatience equally',
        'W5 gods have more personality than most NPCs in other games',
        'Divine offerings are basically bribing gods with video game items',
        'Your god rank says whether you have been faithful or slacking',
        'Divinity bonuses at high levels make everything else feel like a warm up',
        'Bro switches divine links more often than outfits',
        'The W5 grind is a test of faith literally',
        'Your offering income is either a river or a drip',
        'God link synergies are the combo system of the spiritual realm',
        'W5 progression without a guide is just wandering in the divine wilderness',
        'Divinity is the feature that turned idle gamers into theologians overnight',
        'Your divine setup is either blessed or cursed and there is no baptism to fix it',
        'Offering rates per character is the per capita GDP of your account',
        'The god you chose first says a lot about your priorities as a gamer',
        'W5 is where your alchemy investment either pays off or doesnt',
        'Bro grinding offerings like hes trying to get into video game heaven',
        'Your divinity progress is either ascended or still in tutorial purgatory',
        'The divine link combinations are more complex than actual theology',
        'God favor milestones are the achievement system of the faithful',
        'W5 making you care about fictional gods more than expected',
        'Your offering speed is either blazing or glacial nothing between',
        'Divinity optimization guides read like sacred texts and honestly same',
        'Bro has favorite Idleon gods and will fight you about it',
        'The divine system is deceptively simple on the surface and insanely deep underneath',
        'Your god roster management is the divine version of team building',
        'W5 difficulty: casual players cry, sweats thrive',
        'Offering farming overnight is the night prayer of Idleon',
        'Divine link bonuses compound with everything else and suddenly you ascend',
        'Bro treats the divinity tab like a spiritual retreat',
        'Your W5 progression is either on track or lost in the divine sauce',
        'The gods of Idleon have better backstories than some AAA games',
        'God favor going up by 1% and feeling like you moved a mountain',
        'W5 is where the game says "you thought W4 was complex? cute"',
        'Divinity is the endgame content that actually feels like endgame',
        'Your divine build is either optimal or you are just praying it works literally',
        'Offering efficiency calculators are the prayer books of modern Idleon',
        'Bro ranked all the gods in a tier list and started a religious debate',
        'The divine link grind is a marathon through the spiritual realm',
        'Your god selection is the most consequential choice in W5 choose wisely',
        'W5 content drops and your entire account strategy shifts divinely',
        'Divinity is Lava saying "what if religion but as a game mechanic"',
        'Your offering totals are either devout or you forgot divinity exists',
        'God link min-maxing is the dark arts of Idleon optimization',
        'W5 made me appreciate slow progress because I had no choice',
        'The divine grind is where time goes to disappear into the void',
        'Bro reached max god favor and achieved digital enlightenment',
        'Your divinity tab is either perfection or a cry for divine intervention',
        'Offerings per hour is the holiest stat in all of Idleon',
        'W5 is proof that Lava can make you grind anything and enjoy it',
      ]},
    // ── IDLEON — Sneaking / Farming / W6 ──
    { test: /\b(?:sneaking|ninja|jade|pristine|charm|farming|plot|crop|crop depot|ogre|w6|world 6|spirited|summoning|summon|essence)\b/i,
      replies: [
        'W6 content is so new it still has that new car smell',
        'Sneaking is just you becoming a ninja and I am here for it',
        'Jade coins are the real currency fight me',
        'Pristine charms are chefs kiss when you get a good one',
        'Farming plots need more attention than my real plants',
        'Crop depot management is peak idle gaming somehow',
        'Summoning is the ultimate "just one more battle" trap',
        'Essence management separating the casuals from the sweats',
        'W6 is where veterans go to feel like noobs again',
        'The ninja sneaking minigame is lowkey the best addition',
        'Your farming plots are thriving more than your social life',
        'Ogres in W6 are built different and I mean DIFFERENT',
        'Summoning team comp discussions are the new alchemy debates',
        'W6 dropping and your build being obsolete instantly classic',
        'Sneaking past enemies is more stressful than any boss fight',
        'Jade currency is the economy that actually makes sense somehow',
        'Pristine charm hunting is the treasure hunting of W6',
        'Farming in a game about fighting mobs genius or madness',
        'Crop growth timers making you check your phone every 5 minutes',
        'Summoning essence farming is the W6 equivalent of liquid farming',
        'W6 mobs hit like trucks that are also on fire',
        'Bro became a professional ninja in an idle game what a timeline',
        'Your charm collection is either pristine or a junk drawer',
        'Farming plot optimization is agriculture simulator but in Idleon',
        'Crop depot rewards making the farming grind actually worth it sometimes',
        'Summoning battle teams are more thought out than most chess openings',
        'W6 difficulty makes W5 look like vacation',
        'Jade coin spending decisions are the financial planning of W6',
        'The sneaking floor you cant pass is your new nemesis',
        'Pristine charms at rare quality are basically a lottery win',
        'Your farming yields are either bountiful or somebody forgot to water',
        'Summoning tier progression is the ladder you climb with tears',
        'W6 content added more systems than most games have total',
        'Bro is farming virtual crops and checking them more than real garden',
        'Essence types being different for each summoning family adds layers of pain',
        'The sneaking ninja floor reset when you die is pure evil game design',
        'Jade costs scaling up is W6 saying "you thought this was free?"',
        'Charm effects stacking is where W6 builds go from good to broken',
        'Farming crops for cooking for meals for buffs for farming its a circle of grind',
        'Summoning battles taking actual strategy surprised everyone including Lava probably',
        'W6 progression speed makes W3 construction look speedy',
        'Your ninja sneaking skill is either elite or you keep dying on floor 2',
        'Pristine charm farming is the RNG roulette of W6',
        'Crop management is the agriculture degree you earned through gaming',
        'Summoning essence costs at high levels are mathematically offensive',
        'W6 ogres are the new efaunt of humbling overconfident players',
        'Bro treats sneaking floors like a spy mission and reports back to the guild',
        'Your jade balance is either healthy or you went on a spending spree',
        'Charm rerolling is the W6 equivalent of obol rerolling same pain new world',
        'Farming output per plot per hour is the metric that runs your life now',
        'Summoning team synergies create combos that should be illegal',
        'W6 is where the game decided casual players need not apply',
        'Sneaking ninja mechanics adding actual skill to an idle game scandalous',
        'Your crop depot is either organized or a farmers market nightmare',
        'Pristine effects are so good when they roll right its basically cheating',
        'Farming in W6 is the peaceful island in an ocean of grind',
        'Summoning at high tiers is where the real resource drain begins',
        'W6 guides are outdated within a week of being posted such is the pace',
        'Jade coins are worth more than the in-game gold at this point',
        'The sneaking death screen should come with a condolence message',
        'Your charm inventory looks like a jewelry store of questionable quality',
        'Crop timers are the real time-gating mechanic of W6',
        'Summoning is Pokemon battles but every loss costs you essence and dignity',
        'W6 systems interlock with everything else creating infinite optimization loops',
        'Bro farms crops checks sneaking does summoning battles and forgets to eat irl',
        'Essence generation per hour is the new liquid per hour of W5 and W6 era',
        'The ninja aesthetic of sneaking alone makes W6 worth it style points matter',
        'Your farming is either industrialized or a hobby garden theres no in between',
        'Summoning essence types should come with a color coded guide oh wait they do',
        'W6 made everyone download another spreadsheet app and thats beautiful',
        'Pristine charm farming overnight and waking up to trash results W6 in a nutshell',
        'Crop depot bonuses compounding is the slow burn payoff W6 delivers',
        'Sneaking floors getting exponentially harder is just vertical scaling with ninjas',
        'Your W6 account progress is either ahead of the meta or drowning in content',
        'Summoning battles are the PvE content that feels like PvP against the game itself',
        'Farming is therapeutic until you realize you are min-maxing crop rotation in a game',
        'Jade coin income vs spending is the personal finance of W6',
        'W6 is Lava saying "you want more content?" and dropping an entire expansion',
        'The ninja sneaking leaderboard is the flex zone of W6',
        'Your essence balance sheet is more complex than your bank statements',
        'Charm effects at pristine tier redefine what builds can do',
      ]},
    // ── IDLEON — Classes / Builds / Talents ──
    { test: /\b(?:class|subclass|elite class|maestro|journeyman|barbarian|squire|bowman|hunter|wizard|shaman|divine knight|royal guardian|siege breaker|beast master|blood berserker|bubonic conjuror|elemental sorcerer|voidwalker|savage|talent|talents|star talent|build|respec)\b/i,
      replies: [
        'Class debates in Idleon are the real PvP',
        'Your build is either meta or a war crime theres no in between',
        'Maestro mains are the accountants of Idleon',
        'Voidwalker is what happens when a class goes to the gym for 5 years',
        'Blood Berserker is just anger management in class form',
        'Bubonic Conjuror mains dont sleep they farm',
        'Beast Master with good pets is actually broken',
        'Divine Knight carrying construction since W3 dropped',
        'Elemental Sorcerer damage numbers make me feel things',
        'Star talents are the real MVP honestly',
        'Talent respec is the "I made a mistake" button and we all use it',
        'Journeyman is the class for people who want to suffer beautifully',
        'Shaman players are a different breed respectfully',
        'Squire mains are the unsung heroes keeping the refinery alive',
        'Bowman crits hitting for absurd numbers is never not funny',
        'Hunter trapping builds are weirdly satisfying to optimize',
        'Royal Guardian is the "I want to be invincible" class',
        'Siege Breaker said "I choose violence" and meant it',
        'Your elite class unlock moment is peak Idleon experience',
        'Barbarian players and their damage numbers ego is unmatched',
        'Class tier lists causing more arguments than actual game content',
        'Wizard AoE go brrr goodbye entire map of mobs',
        'Savage class is living up to its name honestly',
        'Your talent point allocation is either surgical or chaotic there is no middle road',
        'Maestro mains explaining why their class is important for the 47th time',
        'Voidwalker damage log looks like someone typed random large numbers',
        'Blood Berserker in arena is a menace to society',
        'Bubonic Conjuror AFK farming is a money printing machine',
        'Beast Master pet synergies creating combos that shouldnt exist',
        'Divine Knight worship bonuses are the silent carry of W3 and beyond',
        'Elemental Sorcerer mains and their "watch this damage" energy',
        'Star talent points are more contested than Olympic medals',
        'Respec cost going up every time is Lava punishing indecisiveness',
        'Journeyman doing everything and excelling at nothing the generalist curse',
        'Shaman support buffs are so good they deserve a salary',
        'Squire refinery contribution is the janitorial work of Idleon someone has to do it',
        'Bowman damage range going from 1 to 1 million what build consistency',
        'Hunter trapping income is passive income for the patient ones',
        'Royal Guardian face tanking bosses like its a lifestyle choice',
        'Siege Breaker AoE making W3 and W4 maps look like a fireworks show',
        'Your class choice defines your Idleon personality and you chose chaos',
        'Barbarian damage go big number big number good brain happy',
        'The class tree in Idleon is more of a class forest at this point',
        'Wizard players living in the AoE fantasy and honestly its beautiful',
        'Your talent build was either copied from a guide or invented during a fever dream',
        'Maestro utility is the Swiss army knife of Idleon classes',
        'Voidwalker unlock requirements are the final exam of Idleon',
        'Blood Berserker lifecycle: die revive die revive die do damage',
        'Bubonic Conjuror in the back just printing money while you struggle',
        'Beast Master without good pets is just a regular person with a dream',
        'Divine Knight prayer combo game is chess while everyone else plays checkers',
        'Elemental Sorcerer single target damage is a crime against bosses',
        'Star talent debates lasting longer than actual wars',
        'Respec remorse is a real condition and there is no cure',
        'Journeyman drop rate bonuses are why everyone has one even if they wont admit it',
        'Shaman players providing buffs and receiving zero credit the support life',
        'Squire mining speed is the unsung foundation of every account',
        'Bowman players either crit for millions or miss entirely the duality of archery',
        'Hunter trapping efficiency is the most niche flex in Idleon',
        'Royal Guardian HP pool bigger than some game maps',
        'Siege Breaker construction bonuses are the real reason people pick this class shh',
        'Your build guide has more revisions than a college thesis',
        'Barbarian players: "what build? I just hit things hard"',
        'Class tier list arguments providing more entertainment than the actual game',
        'Wizard vs Shaman debate the oldest rivalry in Idleon history',
        'Your talent points per level up being limited is emotional damage',
        'Maestro class fantasy: be mediocre at everything but essential for everything',
        'Voidwalker flex in damage screenshots is the endgame social media',
        'Blood Berserker health yoyo going up and down like a heartbeat monitor',
        'Bubonic Conjuror AOE coverage making cleanup look easy',
        'Beast Master pet micro management is an entire game within the class',
        'Divine Knight carrying worship and nobody thanking them typical',
        'Elemental Sorcerer mains have trust issues with physical attackers',
        'Star talent investment is the long game that always pays off eventually',
        'Respeccing at endgame costs more than your dignity and thats expensive',
        'Journeyman being required for efficiency bonuses is Lava saying "suffer for gains"',
        'Shaman utility in group content is the MVP that nobody drafts first',
        'Squire existence is proof that support classes deserve respect',
        'Bowman gameplay: shoot arrow hope for crit repeat until satisfied or frustrated',
        'Hunter class is the spy of Idleon gathering intel through traps',
        'Your class choice at character creation haunts you 500 hours later',
        'Every class is viable said the person who plays Voidwalker',
        'Talent allocation mistakes at level 200+ cost more than therapy honestly',
        'Bro has 9 characters of the same class and calls it a "strategy"',
      ]},
    // ── IDLEON — Bosses / Death Note / Kill Count ──
    { test: /\b(?:boss|amarok|efaunt|chizoar|kattlekruk|emperor|world boss|mini boss|colosseum|death note|kill count|mob kill|zow|chaotic)\b/i,
      replies: [
        'Amarok is just the tutorial boss and it still catches people off guard',
        'Efaunt said "welcome to W2 now suffer"',
        'Chizoar is where dreams go to die if your build isnt ready',
        'The death note grind is just you committing monster genocide for bonuses',
        'Kill count going up is the most zen thing in Idleon',
        'Boss damage checks are the real skill check of this game',
        'Colosseum rewards stack up if you actually do them',
        'Your kill count means nothing and everything at the same time',
        'World bosses are either free or impossible no middle ground',
        'Death note completion percentage is your real Idleon score',
        'Kattlekruk is the boss that humbles everyone equally',
        'Mini bosses dropping good loot challenge impossible',
        'Your boss kill time is either impressive or embarrassing share it',
        'The colosseum is where builds go to be tested and found wanting',
        'Emperor fight making you question all your life choices',
        'Chaotic bosses are just regular bosses that chose violence',
        'Amarok at low level is a near death experience literally',
        'Efaunt hands have better aim than most FPS players',
        'Chizoar ice phase is where keyboards go to die',
        'Your death note is either grinded or you forgot it existed',
        'Kill count per mob is the census of your destruction',
        'Bro treats boss fights like a personal vendetta against pixels',
        'World boss spawn timers are the event calendars of Idleon',
        'Death note bonuses are so good they justify the genocide',
        'Colosseum tickets being limited is the game saying "suffer in moderation"',
        'Your boss damage is either oneshot territory or "bring snacks" territory',
        'Kattlekruk enrage timer is a countdown to your shame',
        'Mini boss spawns when you least expect them surprise suffering',
        'The colosseum wave you cant beat becomes your villain origin story',
        'Boss key farming is the chore before the reward',
        'Your kill count digits stacking up is the most satisfying number growth',
        'Chaotic world bosses making normal bosses look like plushies',
        'Amarok was everyones first real wall and first real rage',
        'Efaunt mechanic fails are comedy gold for everyone except the failer',
        'Chizoar damage check separating the builders from the button mashers',
        'Death note mob requirements getting higher each tier thanks Lava',
        'Kill count bonuses are the passive aggression of game mechanics',
        'Bro studied boss patterns more than any school subject',
        'World boss loot is either amazing or you wasted 30 minutes of your life',
        'Death note skulls are the report card nobody asked for',
        'Colosseum high scores are the competitive scene of Idleon PvE',
        'Your boss attempts counter is embarrassing and you know it',
        'The moment your damage finally beats the boss damage check chefs kiss',
        'Boss kill achievements are the real flex of any Idleon profile',
        'Chaotic boss difficulty is just the game being passive aggressive',
        'Amarok death screen is the first Idleon L and it stings forever',
        'Efaunt is the boss that taught everyone to actually read mechanics',
        'Chizoar fight at low damage is a survival horror game',
        'Your death note progress says exactly how long you have been playing',
        'Kill count going from 100k to 1M is the most satisfying grind milestone',
        'World boss coordination in chat is herding cats but occasionally it works',
        'Death note completion at 100% for a mob is the dopamine spike of the century',
        'Colosseum rewards per ticket is the efficiency stat warriors care about',
        'Boss guides being 30 minutes long for a 2 minute fight says everything',
        'Your chaotic boss clear time is either a speed record or a horror story',
        'Bro wipes on a boss and blames the build not the skill classic',
        'The boss damage formula is more complex than actual physics equations',
        'Death note grind at endgame is just you personally depopulating Idleon',
        'Mini boss drops are the gacha within the boss system',
        'Colosseum builds being different from main builds is a whole other optimization',
        'Your world boss contribution is either carry or carried no shame either way',
        'Boss enrage mechanics exist to punish slow damage and slow learners',
        'Kill count milestones unlocking bonuses is the body count reward system',
        'Bro memorized every boss pattern but cant remember what he had for breakfast',
        'Chaotic bosses dropping unique loot is the carrot on the stick of pain',
        'The boss key drop rate is the appetizer of suffering before the main course',
        'Your colosseum strategy is either optimized or "just hit everything and hope"',
        'Death note skull ranks turning from bronze to gold is aesthetic progression',
        'Boss health pools at higher worlds are measured in scientific notation',
        'Bro does boss runs like a 9 to 5 job punching in and punching bosses',
        'World boss events bringing the server together through shared trauma',
        'The death note page looks like a criminal record of mass mob elimination',
        'Boss fight music hits different when you know you are about to lose',
        'Your mini boss luck is either incredible or non existent',
        'Colosseum wave progression getting harder is the stairmaster of Idleon',
        'Kill count: proof that persistence beats everything except bad luck',
        'Bro has more boss kills than some people have total mob kills',
        'The chaotic modifier on bosses is just Lava adding extra spice to your suffering',
        'Your boss clear consistency is either reliable or a dice roll',
        'Death note grinding for hours and realizing you were on the wrong mob oof',
      ]},
    // ── IDLEON — Stamps / Cards / Obols / Statues / Collectibles ──
    { test: /\b(?:stamp|stamps|card|cards|obol|obols|statue|statues|prayer|prayers|constellation|constellations|star sign|post office|box)\b/i,
      replies: [
        'Stamp upgrades are permanent and thats beautiful',
        'Card collecting in Idleon is the gacha we didnt know we needed',
        'Obols are RNG on top of RNG and we love to suffer',
        'Statues leveling up in the background silently carrying everything',
        'Prayers are either OP or useless no tweaking needed Lava said',
        'Constellation unlocks feel like actual achievements',
        'Your card bonus is either maxed or you forgot cards exist',
        'Post office upgrades are the thing everyone forgets about',
        'Stamp investment early game is elite gamer knowledge',
        'The obol rerolling grind is actual gambling',
        'Star signs affecting your builds more than talents sometimes',
        'Constellation points are never enough',
        'Gold stamps going up 0.1% at a time and feeling like progress',
        'Card set bonuses are lowkey some of the best boosts in the game',
        'Prayer combos being broken is a feature not a bug',
        'Your statue levels say more about your patience than your skill',
        'Obol family bonuses are where the real power hides',
        'Stamp costs scaling exponentially is the inflation of Idleon',
        'Card drop RNG adding another layer of grind on top of the grind',
        'Obol rerolls eating your silver obols for breakfast lunch and dinner',
        'Statue golden statues vs regular statues the upgrade that matters most',
        'Prayer curse side effects are the monkey paw of Idleon',
        'Constellation completion is the star gazing nobody prepared for',
        'Your card album looking like a Pokedex but for masochists',
        'Post office box upgrades going from cheap to "are you serious" real fast',
        'Stamp damage bonuses compounding with everything else secretly OP',
        'Obols are the gear RNG that makes equipment look predictable',
        'Statue level grind is watching numbers go up very very slowly its beautiful',
        'Prayer combinations at endgame are the build defining choices',
        'Star sign bonuses being character specific is the personalization chefs kiss',
        'Bro has more stamp progress than actual game progress',
        'Card farming overnight and getting zero rare cards classic',
        'Obol family bonus activation is the slot machine dopamine hit',
        'Statues with multiple characters contributing is the teamwork mechanic',
        'Prayer unlocks getting harder to reach is spiritual gatekeeping',
        'Constellation bonus tooltips reading like stereo instructions',
        'Your star sign combination is either optimized or random vibes',
        'Post office boxes at max level carrying harder than most talents',
        'Stamp page looking like a spreadsheet of tiny incremental gains beautiful',
        'Card tier upgrades from green to blue to purple the color progression of hope',
        'Obol shapes and bonuses are the tetris puzzle of inventory management',
        'Statue materials being random drops means your statue levels are at RNG mercy',
        'Prayer curse management is the dark arts of Idleon optimization',
        'Constellation star connections are the Idleon version of connect the dots',
        'Bro maxed out a stamp and felt like he graduated from something',
        'Card set bonus activation is the silent power boost everyone needs',
        'Obol platinum tier is the promised land that takes forever to reach',
        'Statue bonuses at high levels are actually massive and underrated',
        'Prayer combinations creating synergies that shouldnt be legal',
        'Star sign unlocking at a new level is the birthday gift of Idleon',
        'Post office streaks being important is the daily login energy',
        'Stamp upgrading with materials you farmed for hours feels earned',
        'Card drop chance with card drop bonuses creating a meta loop',
        'Obol luck stat making or breaking your obol reroll experience',
        'Statue golden upgrade materials being rare is Lava being Lava',
        'Prayer tab management is the religion simulator within a game',
        'Constellation page looking like an astronomy textbook',
        'Your stamp priority list is a personality test for Idleon players',
        'Card collection percentage is the completionist metric that haunts',
        'Obol rerolling hoping for that one perfect stat the casino experience',
        'Statue exp per hour making you want to optimize character placement',
        'Prayer effects reading like buff descriptions from an RPG wiki',
        'Star signs at max level making your character feel like a different person',
        'Post office box strategy is the mail sorting game nobody expected to care about',
        'Bro is more invested in stamps than actual philatelists',
        'Card boss cards being the rarest flex in the collection',
        'Obol inventory management requiring its own spreadsheet tab',
        'Statue levels being account wide is the one mercy Lava gave us',
        'Prayer unlocks being gated behind constellation points is a circle of grind',
        'Star sign swapping for different activities is the class swap of bonuses',
        'Post office delivery speed mattering is attention to detail gameplay',
        'Stamp leveling feeling pointless until you see the cumulative bonus',
        'Card star levels going up and the collection rating improving dopamine',
        'Obol family sets taking months to complete is a sentence not a feature',
        'Your statue contribution ranking shows who actually cares about account progression',
        'Prayer builds at endgame defining your character more than talents',
        'Constellation discoveries feeling like actual astronomical breakthroughs',
        'Bro has every card except the one he actually needs Murphy Law gaming edition',
        'Post office being useful shocks everyone who ignored it for months',
        'Stamp investment guides being longer than investment banking manuals',
        'Card farming with a card drop build being the meta within the meta',
      ]},
    // ── IDLEON — Dungeons / Guilds / Flurbos ──
    { test: /\b(?:dungeon|dungeons|flurbo|dungeon credits|guild|guild task|guild gp|guild boss|party|raid|rank up|guild rank)\b/i,
      replies: [
        'Dungeons are where you find out if your build actually works',
        'Flurbo economy is more volatile than crypto',
        'Guild tasks are the chores of Idleon and we do them anyway',
        'Dungeon credits being worth it is debatable and I choose yes',
        'Guild GP grind is the ultimate team effort',
        'Your dungeon run is either speed or disaster',
        'Guild rank ups feel like actual accomplishments',
        'Party dungeons are where friendships are tested',
        'Flurbos are the currency that everyone wants and nobody has enough of',
        'Guild boss fights bringing the community together is wholesome',
        'Dungeon RNG is just regular RNG but in a cave',
        'Your guild contribution says a lot about your character',
        'Dungeons at low level are a humbling experience for every new player',
        'Flurbo spending is the financial decision of dungeon content',
        'Guild task completion races are the Olympics of the guild',
        'Bro treats dungeon runs like speed running events with a timer and everything',
        'Guild GP contribution leaderboard causing healthy competition or drama',
        'Your dungeon death count is information you keep private',
        'Flurbo shop items being expensive because Lava says so fair enough',
        'Guild rank requirements getting steeper each level the corporate ladder of Idleon',
        'Dungeon key drops being stingy is the appetizer of dungeon suffering',
        'Your guild activity says youre either dedicated or a ghost member',
        'Party dungeon coordination in voice chat is controlled chaos',
        'Flurbo income per run being low is the minimum wage experience',
        'Guild boss HP scaling with members means more people more pain',
        'Dungeon builds being different from your main build is a whole other meta',
        'Your guild rank is either officer or recruit theres no energy for middle ranks',
        'Bro saved up flurbos for months and spent them all in one sitting impulse shopping',
        'Guild tasks resetting weekly and the grind starting over sisyphean energy',
        'Dungeon floor completion unlocking new rewards the carrot and the stick',
        'Your party dungeon carry percentage is either 90% or 10% no in between',
        'Guild chat being more active than the actual game sometimes',
        'Flurbo to dungeon credit exchange rate should be a stock ticker',
        'Guild GP from tasks being the only reliable income is the 9 to 5 of guilds',
        'Dungeon RNG drops making you run the same floor 40 times for one item',
        'Your guild boss contribution is either MVP or emotional support',
        'Bro joins every guild event like its a company mandatory meeting',
        'Flurbo savings plan should be a real financial product',
        'Guild rank perks are the employee benefits of Idleon social systems',
        'Dungeon difficulty spikes between floors testing your will to continue',
        'Your guild member count is either thriving or a ghost town',
        'Party dungeon wipes are the shared trauma that bonds guild members',
        'Flurbo dungeon economy is the niche topic nobody expected to discuss this long',
        'Guild tasks being repetitive is the definition of consistent content delivery',
        'Dungeon credit spending priorities reveal your endgame focus',
        'Your guild event attendance is either 100% or suspicious 0%',
        'Bro got promoted in the guild and it felt like a real promotion',
        'Flurbo farming as a daily routine becoming part of your Idleon ritual',
        'Guild boss fight nights are the raid nights of Idleon lets be real',
        'Dungeon floor leaderboards showing speed clear times the competitive PvE scene',
        'Your guild loyalty measured in months is the tenure of gaming communities',
        'Party dungeon roles being tank healer DPS in an idle game unexpected but it works',
        'Flurbo prices should adjust for inflation someone tell Lava',
        'Guild recruitment posts reading like job listings is peak gaming culture',
        'Dungeon rare drops being account changing is the lottery of Idleon',
        'Your dungeon consistency says youre either disciplined or bored enough',
        'Bro memorized every dungeon floor layout like studying for an exam',
        'Flurbo spending regret is a real emotion experienced by dungeon players globally',
        'Guild milestones being celebrated in chat is the wholesome content we need',
        'Dungeon entry limits per day are the game saying "go outside" you wont',
        'Your guild contribution rank is the performance review of Idleon',
        'Party dungeon coordination requiring Discord calls is the real multiplayer experience',
        'Flurbo balance checking before every shop visit responsible spending in games',
        'Guild competitions between rival guilds the PvP that Idleon actually has',
        'Dungeon builds requiring specific gear sets is the fashionscape of dungeons',
        'Your guild is either top 10 or having fun and both are valid',
        'Bro runs dungeons more than going to the actual gym dungeon gains vs real gains',
        'Flurbo drop celebrations in guild chat are unreasonably hype',
        'Guild GP races at end of week are the sprint finish of community content',
        'Dungeon strategy discussions are the theory crafting heaven of Idleon',
        'Your guild events calendar being fuller than your real calendar says something',
        'Party dungeon carry runs for new members is the initiation ritual',
        'Flurbo as a currency name is inherently funny and nobody talks about it enough',
        'Guild drama being more intense than any boss fight the real content',
        'Dungeon progression feeling meaningful is what keeps people coming back',
        'Your guild activity log revealing who actually plays and who just vibes',
        'Bro treats guild tasks like homework and turns them in early every time',
        'Flurbo inflation if it existed would crash the dungeon economy overnight',
        'Guild loyalty over meta chasing is the wholesome choice',
        'Dungeons are the content that reminds you Idleon is actually an RPG sometimes',
      ]},
    // ── IDLEON — Updates / Lava / Patch Notes ──
    { test: /\b(?:lava|lavaflame|update|patch|patch notes|new content|new world|next update|changelog|dev|nerf|buff|hotfix)\b/i,
      replies: [
        'Lava dropping content faster than we can finish the old stuff',
        'Patch notes reading is the real Idleon content',
        'New update means your build is obsolete again congrats',
        'LavaFlame2 doing the work of an entire studio solo legend behavior',
        'The nerf hammer swings and the community screams',
        'Buff patch? Time to rebuild everything for the 47th time',
        'Waiting for the next update is the real idle part of Idleon',
        'Lava said "heres a new world" like its not insanely complex',
        'Patch notes being longer than most novels',
        'Your setup before and after the update two different games',
        'Hotfix dropping 2 hours after update is tradition at this point',
        'Every update makes me realize I was playing wrong the whole time',
        'Lava is one person making this game and WHAT',
        'Content drought? In this game? Not possible',
        'Lava releasing an update and immediately starting the next one machine behavior',
        'Patch notes reading like a plot twist in a TV show',
        'New content dropping and the entire meta shifting overnight',
        'Buff announcements making the community happier than any holiday',
        'Nerf patch: the five stages of grief speedrun for affected players',
        'Lava changelog entries being cryptic enough to need community decoding',
        'Update hype cycle: excitement > download > confusion > adaptation > new hype',
        'The dev blog is the scripture of the Idleon community',
        'Hotfixes being needed because Lava added too much content too fast based',
        'Bro reads patch notes before the update even downloads priorities',
        'New world announcement making the entire playerbase collectively lose it',
        'Lava buffing the thing nobody expected is the plot twist we live for',
        'Nerfing your main build after you optimized it for weeks emotional terrorism',
        'Update size being 500MB of pure content is flex behavior',
        'The community guessing next update content is the real metagame',
        'Lava dropping QoL updates that shouldve existed from the start better late than never',
        'Patch notes: "adjusted values" meaning your build might be dead',
        'New content making old content relevant again is galaxy brain game design',
        'Buff stacking from new update systems creating monsters accidentally',
        'The nerf was deserved said nobody who mained the nerfed class',
        'Lava update speed making AAA studios look comically slow',
        'Hotfix within hours proves Lava actually plays his own game',
        'Bro data mines updates before they launch the FBI agent of Idleon',
        'New update dropping on a weeknight RIP productivity tomorrow',
        'Lava adding entire systems in a single patch casual one man studio energy',
        'Patch balance changes causing more community debates than elections',
        'Update anticipation making you refresh Reddit every 5 minutes',
        'The buff your build desperately needed finally arriving is Christmas morning',
        'Nerf compensation from Lava: here have new content lmao fair trade',
        'Content releases being consistent is the reliability we dont deserve',
        'Bro has push notifications set for Idleon patch notes only',
        'New world speculation threads being more creative than fan fiction',
        'Lava stealth buffing things and the community discovering it weeks later detective work',
        'Update day is a national holiday for the Idleon community',
        'Patch notes reading: 10% excitement 90% "wait does this affect MY build"',
        'The nerf that never comes the buff that always needed to come the balance saga',
        'Lava adding a new system and every guide being outdated instantly',
        'Content updates in Idleon have more depth than some games entire existence',
        'Hotfix notes: "fixed a bug" could mean anything and we are scared',
        'Bro calculates the DPS change from every patch note line item',
        'New update means new mobs new maps new reasons to forget responsibilities',
        'Lava balance philosophy: if everything is OP nothing is and we love it',
        'Patch release timing syncing with your sleep schedule never',
        'The community changelog analysis videos being 45 minutes long for a text document',
        'Upcoming content leaks through Discord making the hype train crash early',
        'Update download and immediate "what changed" panic in global chat',
        'Lava fixing a year old bug in a random patch the surprise bug squash',
        'Content pacing in Idleon making other idle games look abandoned',
        'Bro refreshes the app store 30 times on update day',
        'New buff making a forgotten class suddenly meta the resurrection arc',
        'Nerf discussions lasting longer than the actual patch took to install',
        'Lava development pace is the benchmark other solo devs aspire to',
        'Update broke my setup? Time to panic optimize and blame the changelog',
        'Patch X.XX making Idleon feel like a brand new game every time',
        'The content roadmap living in Lava head rent free and we are just along for the ride',
        'Community reaction to nerfs: denial anger bargaining depression acceptance',
        'New content dropping and suddenly everyone is a noob again beautiful',
        'Lava hotfixing at 2am because he cares and also never sleeps apparently',
        'Bro has every patch note memorized like historical dates',
        'Update changelog scroll length is the real content length metric',
        'New world release day is the Super Bowl of Idleon',
        'Buff patch making you feel validated for playing a "bad" class all along',
        'The surprise midnight update dropping when everyone is asleep',
        'Lava is one dev making content faster than teams of 50 the legend continues',
        'Patch notes tldr: your build changed now figure it out good luck',
        'Content frequency keeping the game fresh is the secret sauce',
        'Bro schedules his life around Idleon update release dates and honestly same',
      ]},
    // ── IDLEON — General gameplay / Meta / Efficiency ──
    { test: /\b(?:idleon|idle on|legends of idleon|efficiency|active play|time candy|candy|gem shop|merit|daily task|weekly|account wide|skilling)\b/i,
      replies: [
        'Idleon is not a game its a lifestyle and we chose this',
        'The wiki tab is always open lets be real',
        'Time candy go brrrrr is the Idleon national anthem',
        'Active play vs AFK the eternal debate',
        'Efficiency brain is a permanent condition for Idleon players',
        'Gem shop tempting you daily is its own minigame',
        'Merit shop priorities are a personality test',
        'Daily tasks: the homework of Idleon',
        'Your account efficiency says youre either optimal or having fun pick one',
        'Skilling in Idleon is weirdly more satisfying than it has any right to be',
        'Idleon is basically a spreadsheet simulator and we love it',
        'The amount of tabs open for Idleon guides right now is concerning',
        'Efficiency calculators are the true endgame tools',
        'Active play warriors are built different and slightly insane',
        'Time candy hoarders vs time candy users the civil war continues',
        'Gem shop purchases at 3am hit different and thats not a good thing',
        'Account wide bonuses are the reason we have 9 characters',
        'The "just one more thing to optimize" pipeline is real',
        'Your Idleon playtime hours would scare normal people',
        'Daily task completion streak is the real achievement',
        'Idleon players explaining why checking a game 47 times a day is "idle"',
        'The real idle game is waiting for your brain to stop optimizing',
        'Your setup spreadsheet has more formulas than my work ones',
        'Legends of Idleon more like Legends of I Done Nothing Else Today',
        'Time candy being the premium currency of time itself',
        'Gem shop sales triggering impulse purchases is a lifestyle',
        'Merit points being limited makes every choice feel permanent and scary',
        'Daily task variety ranging from "easy" to "who designed this"',
        'Account wide bonuses meaning all 9 characters benefit from your obsession',
        'Skilling efficiency numbers becoming your personal scoreboard',
        'Idleon has more content than games with 10x the budget',
        'The wiki contribution thank yous go out to the real heroes',
        'Time candy stacking to the thousands and refusing to use any hoarding',
        'Active play DPS vs AFK DPS the calculation that drives people insane',
        'Efficiency per hour is the metric that defines your Idleon identity',
        'Gem shop browsing without buying is window shopping at its finest',
        'Merit reset costing gems is the tax on indecisiveness',
        'Daily tasks being account wide means 9 characters of chores daily',
        'Your total playtime hours divided by content completed equals pure shame',
        'Skilling characters to max level is the marathon thats never a sprint',
        'Idleon player daily routine: wake up check AFK gains optimize repeat sleep optional',
        'The "I just started Idleon" to "I have 2000 hours" pipeline is instant',
        'Time candy for events hoarding vs using giving Idleon players anxiety',
        'Active play during events being mandatory is the opposite of idle ironic',
        'Efficiency guides being updated faster than college textbooks',
        'Gem shop bundles being "deals" is relative when you have zero gems',
        'Merit shop tier 1 vs tier 3 priorities the Idleon SAT exam',
        'Daily login rewards being the minimum viable addiction mechanic',
        'Account progression percentage making you realize you are barely started always',
        'Skilling world records being tracked somewhere probably',
        'Idleon as a mobile and PC game meaning you never truly log off',
        'The Idleon subreddit being your primary source of entertainment and info',
        'Time candy debates causing more heated discussions than real world politics',
        'Active play optimization guides reading like workout regimens',
        'Efficiency calculators with multiple tabs and input fields the real game',
        'Gem spending log if it existed would look like a tragedy in spreadsheet form',
        'Merit allocation being permanent unless you pay gives me commitment anxiety',
        'Daily tasks becoming autopilot after 500 days of doing them',
        'Idleon content creators making the game 10x more understandable bless them',
        'Your character count going from 2 to 9 and wondering where the time went',
        'Time candy collection rate being slower than your desire to use them',
        'Active play warriors defending their lifestyle against AFK purists daily',
        'Efficiency tier lists ranking everything from most important to still important',
        'The gem shop new items rotating and you missing the good ones tragic',
        'Skilling with active buffs making AFK gains look embarrassing by comparison',
        'Idleon being a free game with this much content is suspicious',
        'The community guides being more organized than most company documentation',
        'Time candy usage calculator existing proves how deep this game rabbit hole goes',
        'Efficiency as a concept in Idleon being more complex than in real life',
        'Gem generation from tasks vs gem spending the personal finance of Idleon',
        'Merit shop choices being the butterfly effect of your account path',
        'Daily tasks on multiple characters being the grind within the grind within the grind',
        'Idleon multitasking with real life multitasking the double life of every player',
        'Your account age vs your account progress telling two very different stories',
        'The Idleon discord being more active than most gaming communities combined',
        'Time candy is the time stone of Idleon you control progression speed',
        'Active play sessions lasting "5 minutes" that become 3 hours every time',
        'Efficiency brain never turning off even when playing other games',
        'Idleon is the game that taught me what opportunity cost means painfully',
        'Account optimization is a hobby inside a hobby inside a game what a life',
      ]},
    // ── Self-deprecation / bad luck (general) ──
    { test: /\b(?:my luck|im so unlucky|i suck|i cant do anything|always lose|never win|worst luck|rng hates me|i always die|i keep losing|cant catch a break|no luck|such bad luck|luck is terrible|cursed|so unlucky)\b/i,
      replies: [
        'We know 💀',
        'At this point its a talent honestly',
        'Have you tried being good?',
        'Nah your luck is speedrunning failure fr',
        'Somebody get this person a four leaf clover',
        'The universe really said "not you" huh',
        'I blame the vibes honestly',
        'Skill issue detected 📸',
        'Our thoughts and prayers go out to your luck',
        'Someone call 911 their luck is flatlined',
        'This is actually tragic and I am here for it',
        'Bro rolled a nat 1 on life',
        'Your luck called and said its taking a permanent vacation',
        'Even a coin flip would dodge you somehow',
        'The universe has a personal vendetta against you apparently',
        'Luck left the chat a long time ago',
        'At this point bad luck is your superpower',
        'Somewhere a black cat just crossed your path digitally',
        'Your luck stat is in the shadow realm',
        'The game literally rigged itself against you specifically',
        'Unluckiest person in the server award goes to...',
        'RNG looked at your account and said "lol no"',
        'Bad luck any% world record holder right here',
        'Your luck is so bad it became an inside joke',
        'Thoughts and prayers for your future attempts too',
        'Have you considered that maybe the game just doesnt like you',
        'Your luck is giving "cursed artifact" vibes',
        'Breaking news: local player discovers rock bottom has a basement',
        'The RNG gods dont hate you they just forgot you exist',
        'At least youre consistent... at being unlucky',
        'Your luck deficit could power a small country of sadness',
        'Bro attracts bad luck like a magnet made of disappointment',
        'The probability of being this unlucky is itself unlucky',
        'Your misfortune is so consistent it should be studied by scientists',
        'If luck was a currency you would owe money',
        'Statistically what happened to you should be impossible and yet here we are',
        'Your luck is a cautionary tale told to other players',
        'The cosmic dice rolled and decided you specifically should suffer',
        'Bro is a walking bad luck demonstration',
        'Your luck timeline is just a flat line with occasional dips somehow',
        'If there was a luck insurance company they would drop you',
        'The bad luck radiating off this message is contagious stay back',
        'Your luck needs a funeral at this point rest in peace',
        'Bro could find a way to lose a coin flip with two heads',
        'The luck distribution was uneven and you got the short end of nothing',
        'Your bad luck should qualify for disability benefits honestly',
        'Even the most optimistic person would give up with your luck',
        'The unlucky streak is so long it needs its own Wikipedia page',
        'Your luck is in a medically induced coma and the prognosis is bad',
        'Bro tripped over nothing and that summarizes his luck perfectly',
        'Random chance hates you and it filed the paperwork to make it official',
        'Your luck is the plot armor of a villain',
        'At this point just assume the worst and be pleasantly surprised by nothing',
        'The bad luck origin story is writing itself and its a tragedy',
        'Bro is the reason fortune cookies have disclaimers',
        'Your luck stat sheet is redacted because its too depressing to read',
        'If luck was weather yours is a permanent thunderstorm',
        'The only consistent thing about your gaming experience is consistent failure',
        'Four leaf clovers wilt when you walk by',
        'Your luck makes Murphy Law look like an optimistic suggestion',
        'Bro won the lottery of losing at everything meta unlucky',
        'The bad luck compounded so much it earned interest in suffering',
        'Your luck is the tutorial example for what not to expect',
        'Even horseshoes lose their luck when you hold them',
        'The universe is using you as a case study in maximum bad outcomes',
        'Your luck is so dead it got a memorial page',
        'Bro is the patron saint of bad RNG and horrible outcomes',
        'The probability curve bent specifically to exclude you from winning',
        'Your luck has been out of office since 2015 auto reply message enabled',
        'If bad luck was an Olympic sport you would be decorated',
        'The level of unlucky you are operating at should be in a textbook',
        'Four rabbits feet three horseshoes and still nothing works for you huh',
        'Your luck is in the witness protection program hiding from you specifically',
        'Bro wakes up and bad luck has already made coffee waiting for him',
        'The odds were technically in your favor and you still lost legendary',
        'Your luck recovery plan needs a luck recovery plan',
        'Even a broken clock is right twice a day but your luck is broken differently',
        'The chance of this streak continuing is 100% based on historical data',
        'Bro is the human equivalent of stepping on a lego every single day',
        'Your luck is the only thing more reliable than death and taxes',
      ]},
    // ── Rage / frustration ──
    { test: /\b(?:im so done|im done|i give up|i quit|thats it|im over it|cant anymore|i cant|cant deal|so frustrated|rage quit|im tilted|so annoying|drives me crazy|makes me mad|pissed off|fed up|had enough|over this|sick of|tired of this|done with this)\b/i,
      replies: [
        'The villain origin story begins',
        'And they were never seen again',
        'RIP to the thing that caused this',
        'Chat we lost another one',
        'Nah come back we need you for the memes',
        'The rage is palpable and honestly valid',
        'Sending thoughts and vibes your way soldier',
        'The keyboard is shaking rn',
        'Ctrl+Z your emotions real quick',
        'Dramatic exit in 3... 2...',
        'Rage quit speedrun any%',
        'Bro hit their limit and the limit hit back',
        'The frustration is radiating through the screen',
        'Rest in peace to their patience',
        'Certified "Im fine" moment',
        'Chat give them a moment theyre processing',
        'And that kids is what we call the breaking point',
        'Somewhere a therapist just felt a disturbance',
        'Anger has entered the chat',
        'This is the part in the movie where they flip the table',
        'The comeback arc starts after the rage arc',
        'Your blood pressure just spiked and I felt it from here',
        'See you back online in 15 minutes lets be real',
        'Quitting is just taking a break with extra drama',
        'The audacity of this game to make you feel things',
        'You say quit but we both know youll be back',
        'Taking this personally is peak gamer behavior',
        'Tilted to another dimension',
        'The tilt is immeasurable and my day is also ruined',
        'Frustration level: writing angry message instead of playing',
        'The keyboard just filed for workers compensation from that rage typing',
        'Bro went through the five stages of grief in one message',
        'Your frustration level is currently at DefCon 1',
        'The rage energy could power a small city honestly',
        'Rage quit is temporary the game is forever youll be back',
        'Your anger management class teacher just felt a chill',
        'The pillow got punched didnt it be honest',
        'Chat we should check on them in 10 minutes',
        'The tilt is so strong it has its own gravitational pull',
        'Bro is one inconvenience away from uninstalling everything',
        'Your patience went from 100 to 0 faster than a dropped wifi signal',
        'The final straw broke the camels back and the camel is you',
        'Rage quitting is just self care with extra steps',
        'Your controller or mouse is in danger and we should warn it',
        'Average "calm down its just a game" response incoming in 3 2 1',
        'The frustration essay you just typed should be published honestly',
        'Bro is generating enough anger to be a renewable energy source',
        'You are one deep breath away from either calm or explosion',
        'The tilt extended beyond the game and into the chat impressive range',
        'Your sanity bar hit zero and there are no potions for that',
        'Chat the rage is contagious dont get too close',
        'Bro went from "this is fine" to "NOTHING IS FINE" in one event',
        'The frustration arc is the most relatable content this server produces',
        'Your quit message has more emotion than most love letters',
        'Rage typing speed is the only thing that improved from this experience',
        'The "Im done" to "okay one more try" pipeline is about 45 seconds',
        'Bro is the human embodiment of a volcano about to erupt',
        'Your anger gave me secondhand frustration and I wasnt even involved',
        'The stream of consciousness rage is art in raw form honestly',
        'Chat predict: will they be back in 5 minutes or 10 minutes',
        'Your patience account has been overdrawn insufficient calm remaining',
        'The tilt reached a level science hasnt measured yet',
        'Bro said "Im done" with the energy of someone whos said it 47 times before',
        'Your frustration output is reaching peak professional complainer levels',
        'The rage quit notification should be a server event at this point',
        'Somewhere deep down the fun is still there... very deep down',
        'Your tilt is giving final boss energy and you are your own enemy',
        'Chat placing bets: uninstall or "Im back" within the hour',
        'The frustration just went from personal to philosophical real quick',
        'Bro is mad at the game mad at the RNG and mad at being mad its a cycle',
        'Your quit speech was more passionate than most graduation speeches',
        'The anger management newsletter just got a new subscriber',
        'Bro the vein on your forehead is visible through text somehow',
        'Chat we need a cool down corner for this one stat',
        'Your frustration has better character development than most anime protagonists',
        'The "Im over it" energy while clearly not being over it at all',
        'Rage level: typing in all caps but the caps lock broke from overuse',
        'Your patience expired and there is no refund policy',
        'The comeback after this rage arc is going to be legendary trust',
        'Bro is storing enough rage for the next 5 gaming sessions',
      ]},
    // ── Being tired / sleepy ──
    { test: /\b(?:im so tired|im exhausted|need sleep|cant stay awake|falling asleep|so sleepy|need coffee|barely alive|running on fumes|dead tired|no energy|so drained|wiped out|burnt out|need a nap|about to pass out|eyes closing)\b/i,
      replies: [
        'Sleep is for the weak and apparently youre weak',
        'Coffee is not a personality trait btw',
        'The bags under your eyes have bags',
        'Your bed is crying rn',
        'Average "5 more minutes" enjoyer',
        'This is what poor life choices look like',
        'Zombie mode activated',
        'Bro is one yawn away from a coma',
        'Go to sleep??? The game will still be here tomorrow???',
        'Caffeine cant save you from yourself',
        'Your sleep schedule is a crime against humanity',
        'The bed is literally right there please',
        'Running on fumes is not a flex its a warning sign',
        'You are not "built different" you are sleep deprived',
        'Your body is literally begging you to stop',
        'Average "I function on 3 hours" liar',
        'The melatonin is calling bro answer it',
        'Rest in peace to your circadian rhythm',
        'Tired is just your body rage quitting',
        'Your energy bar is at 1HP stop playing games',
        'POV: you chose gaming over sleep again',
        'Respectfully log off and close your eyes',
        'The audacity to be tired when a bed exists',
        'You typing with your eyes closed rn arent you',
        'Bro running on pure stubbornness at this point',
        'Your exhaustion levels should be illegal in most countries',
        'The coffee machine is doing more work than your sleep schedule',
        'Bro said "Im tired" like we couldnt tell from the messages',
        'Your brain is running on economy mode and still crashing',
        'Sleep deprivation is not a competition but if it was youd be winning',
        'The yawns are contagious stop spreading sleepy energy',
        'Your body submitted a formal complaint to HR which is you',
        'Average gamer sleep schedule: go to bed at 4am wake up at noon blame everything',
        'Bro is functional on vibes and caffeine only no actual rest',
        'Your tiredness is a public safety concern at this point',
        'The bags under your eyes have their own zip code',
        'Sleepy typing is a whole genre and youre the main character',
        'Your energy levels make a dead battery look charged',
        'Bro has been "about to go to sleep" for 3 hours now',
        'The sleep debt you have accumulated cannot be paid in one night',
        'Your consciousness is held together by spite and screen light',
        'Tired messages at 2am in the server is a rite of passage honestly',
        'Bro is so tired he forgot he was tired and then remembered',
        'Your sleep schedule looks like a crime scene investigation board',
        'The exhaustion radiating from this message hit me through the screen',
        'Your body is running on a negative battery percentage somehow',
        'Napping is free and available yet here you are suffering',
        'Average "Ill sleep early tonight" said every night never done',
        'Bro functioning on the fumes of fumes at this point nothing left',
        'Your rest needed vs rest gotten ratio is mathematically concerning',
        'Sleep is the DLC you refuse to download and install',
        'The tiredness in your messages is giving boss fight energy you are losing',
        'Bro treats being awake like a challenge run and keeps extending it',
        'Your circadian rhythm left a resignation letter on your pillow',
        'Average tired gamer: too tired to play too awake to sleep the limbo',
        'Your energy bar needs a patch update its been broken for days',
        'Bro said "running on fumes" but the fumes ran out 3 hours ago',
        'The caffeine dependency graph for this server should be studied',
        'Your tiredness is at that point where words stop making sesnse see',
        'Sleep schedule? What sleep schedule? You mean chaos schedule',
        'Bro is so drained he is communicating through sheer willpower alone',
        'Your exhaustion arc is the longest running storyline in this server',
        'The bed has been waiting for you since 10pm its now 4am it gave up',
        'Bro is so tired that tired is tired of being the word he uses',
        'Your body is sending error messages and you keep clicking dismiss',
        'Sleep debt collectors are at the door and they dont take IOUs',
        'The pillow is warm the blanket is ready and youre HERE why',
        'Average "Im fine I just need coffee" said with dead eyes',
        'Bro hit the exhaustion wall and kept walking into it repeatedly',
        'Your tiredness level unlocked a new tier: transcendently exhausted',
        'The human body was not designed for this and your body agrees loudly',
        'Bro is typing messages that autocorrect gave up trying to fix',
        'Your sleep debt has interest rates and theyre compounding daily',
        'Rest is a human right that you voluntarily waive every single night',
        'Bro at this point your dreams are just loading screens',
        'The fatigue is so deep its become your default state of existence',
        'Your "just 5 more minutes" has been running for 5 hours straight',
        'Being this tired should come with achievements you earned them all',
        'Bro is one more message away from falling asleep mid typ',
      ]},
    // ── Being hungry ──
    { test: /\b(?:im so hungry|starving|need food|havent eaten|forgot to eat|so hungry|dying of hunger|when is food|feed me|im hungry|could eat|craving|stomach growling|need to eat)\b/i,
      replies: [
        'Eat then??? Hello???',
        'The audacity to be hungry when food exists',
        'Your stomach just filed a complaint',
        'Fridge is right there bro its not that deep',
        'Average "forgot to eat for 8 hours" moment',
        'This is a cry for help disguised as a chat message',
        'Your body is literally screaming at you and you chose to type about it',
        'Food is literally an option please select it',
        'The fridge has been waiting for you all day',
        'Starvation arc is not the content we wanted',
        'Average gamer nutrition moment',
        'Your stomach said "we need to talk"',
        'POV: too busy gaming to remember basic survival',
        'Eating is a free action btw you can do it anytime',
        'The snacks are right there the snacks are calling',
        'Bro really chose hunger over getting up',
        'Your body needs fuel not just WiFi',
        'This is what happens when gaming takes priority over food',
        'Kitchen any% speedrun when?',
        'Your stomach is writing a formal complaint letter rn',
        'Bro is speedrunning malnutrition and calling it dedication',
        'The fridge is judging you for forgetting it exists',
        'Your hunger pains are louder than the game audio at this point',
        'Basic survival skills: eat food drink water sleep... you failed all 3',
        'Bro said "forgot to eat" like thats a normal sentence',
        'Your stomach growl is audible through the text and thats impressive',
        'The food delivery app is on your phone its literally 3 taps away',
        'Average "Ill eat after this one more thing" repeated 7 times enjoyer',
        'Your nutrition log today: air and screen light',
        'Bro treats eating like an optional side quest with no rewards',
        'The human body requires food to function this is not a suggestion',
        'Your stomach is doing the angry grumble and youre ignoring it',
        'Eating food is the original heal over time buff please use it',
        'Bro has sustained himself on pure willpower and copium today',
        'Your hunger level is at emergency and you are still chatting incredible',
        'The last meal you had was so long ago it belongs in a museum',
        'Bro said "starving" but wont get up to get food the struggle is real',
        'Your body sent a push notification: FEED ME and you swiped it away',
        'Average gamer meal plan: eat once feel bad about it repeat tomorrow',
        'The kitchen is not that far but your chair is too comfortable apparently',
        'Bro gaming hungry is a debuff and you are playing with it voluntarily',
        'Your hunger stat is in the red zone and there are no potions',
        'Food exists water exists but no gaming exists takes priority',
        'The distance between you and the kitchen is not that serious get up',
        'Bro said "craving" something but the only thing moving is their fingers on keyboard',
        'Your body did the hunger tutorial 8 hours ago and you skipped it',
        'Average "does anyone want to order food" but nobody responds arc',
        'The stomach growl harmonizing with your keyboard clicks new ASMR',
        'Bro is debugging code while his body is debugging nutrition errors',
        'Your caloric intake today would disappoint any health professional',
        'Food is the real world HP restore and you are playing on 1HP',
        'The microwave is right there two minutes is all it takes please',
        'Bro forgot eating was a recurring quest not a one time event',
        'Your hunger is at "would eat anything" levels including questionable leftovers',
        'The snack drawer has been calling your name for hours answer it',
        'Average productive starvation: getting nothing done while also starving',
        'Bro the meal is not going to cook itself unless its instant noodles which takes 3 minutes',
        'Your body running on empty is not the fuel efficient mode you think it is',
        'The hunger notification in your brain has been on Do Not Disturb apparently',
        'Eating is mandatory content not DLC please engage with the main quest',
        'Bro will min-max a build for 4 hours but wont spend 10 minutes cooking',
        'Your hunger pains have character development at this point',
        'The food in the fridge is expiring faster than your willingness to cook',
        'Average gamer nutrition: monster energy and dreams',
        'Bro treats meals like loading screens something to skip through',
        'Your body filed a bug report: missing expected food input',
        'The pantry is the loot room you have been ignoring this whole session',
        'Eating regularly is the buff that improves all other stats try it',
        'Bro is so hungry the in game food is starting to look appetizing',
        'Your meal timer has been on cooldown for way too long reset it',
        'Average "Im starving" announcement followed by zero action to eat',
        'The hunger boss fight is one you cannot win by ignoring it',
        'Bro could cook a full meal in the time spent complaining about being hungry',
        'Your nutrition today has been sponsored by nothing absolutely nothing',
        'Food is the IRL health potion that you keep forgetting to use',
        'The hunger arc continues with no resolution insight bad writing honestly',
        'Bro is running a caloric deficit and calling it a gaming session',
        'Your stomach has given up growling and started sending passive aggressive texts',
        'Average gamer: calculates in game resource efficiency cant plan a single meal',
      ]},
    // ── Being bored ──
    { test: /\b(?:im so bored|nothing to do|bored out of my mind|so boring|im bored|this is boring|entertain me|someone do something|bored af|dead chat|chat dead|nobody talking|so quiet)\b/i,
      replies: [
        'Have you tried touching grass? I hear its free',
        'The internet is literally infinite and youre bored',
        'Be the entertainment you wish to see in the world',
        'I would suggest a hobby but here we both are',
        'Boredom speedrun any%',
        'You have the entire internet and chose to complain here',
        'Maybe youre the boring one (respectfully)',
        'Start a fight with someone thatll liven things up',
        'Boredom is just creativity waiting to be unlocked or something idk',
        'The "im bored" to "actually doing something" pipeline is broken',
        'Touch grass is the prescription and its free with no appointment',
        'Be the content you wish to see in the chat',
        'In the time you typed that you could have done something productive',
        'Bored people are boring people someone smart said that probably',
        'Your boredom has been noted and ignored',
        'Certified dead chat moment',
        'Chat is dead because youre here to revive it obviously',
        'Someone say something controversial to wake chat up',
        'Dead chat is just chat resting its eyes',
        'The server is waiting for YOU to be entertaining',
        'Bro really announced their boredom like we are an entertainment service',
        'The boredom is radiating through the screen and I am affected now thanks',
        'Nothing to do? Have you tried literally anything other than complaining',
        'Your boredom is not our responsibility but here we are enabling it',
        'Average "im bored" posted while sitting in front of 3 screens moment',
        'Bro has access to every piece of media ever created and chose to type "im bored"',
        'The boredom arc is the least interesting storyline honestly',
        'Your ancestors survived wars for you to say "im bored" in a Discord server',
        'There are millions of games books and shows but sure tell us youre bored',
        'Boredom is a skill issue in 2024 there is literally too much to do',
        'Chat is not your personal jester but also what do you want us to do about it',
        'The energy required to type "im bored" could have been used to start a project',
        'Bro wants entertainment delivered to their screen while they do nothing',
        'Dead chat is a collective decision and we all chose violence today',
        'You being bored is the servers problem apparently',
        'Average person with infinite content at their fingertips: "im bored"',
        'The boredom just hit different when you have zero motivation to fix it',
        'Bro wants us to dance for their amusement we are not circus performers',
        'Youre bored because you rejected every suggestion anyone ever gave you',
        'The boredom complaint has been logged and absolutely nothing will be done about it',
        'Chat is dead because everyone is doing something productive unlike some people',
        'Being bored is a luxury your body mistook for a problem',
        'Imagine having all of human knowledge at your fingertips and being bored',
        'The fact that youre bored means youre choosing to be',
        'Average gamer between queues: existential boredom crisis',
        'If youre bored with the internet youre bored with life and honestly same',
        'Bro could learn a language in the time theyve spent being bored today',
        'The chat is not dead it is recovering from your last message',
        'Channel your boredom into something productive or dont I am not your parent',
        'Nobody talking? Maybe you should start a conversation instead of complaining',
        'Boredom is your brains screensaver activate something interesting',
        'The silence in this chat is louder than your complaint about it',
        'Bro really wants content served on a silver platter while lying in bed',
        'Your boredom is valid but announcing it fixes nothing',
        'Certified "someone entertain me" without offering any entertainment moment',
        'Chat is not dead we are all lurking and judging silently',
        'The boredom hit so hard you had to make it everyones problem',
        'Being bored is a choice and you chose it aggressively today',
        'You could be learning have you considered that or is that too productive',
        'The boredom to motivation pipeline has been under construction for years',
        'Average "dead chat" posted by the person who killed it',
        'Your boredom announcement changed nothing but we appreciate the update',
        'Bro is bored in a server with thousands of messages but none are entertaining enough apparently',
        'The entertainer you ordered is on backorder please hold',
        'Congrats you are experiencing the human condition called "nothing is enough"',
        'Boredom is temporary but this complaint is forever in the server logs',
        'Being bored just means youre too lazy to start something new and honestly relatable',
        'POV: you have 47 unplayed games in your library but youre "bored"',
        'Dead chat blame the lurkers who read everything and say nothing',
        'Your boredom is the servers villain origin story',
        'Average Tuesday where everyone is bored but nobody will do anything about it',
        'The cure for boredom is curiosity and the cure for curiosity is I dunno Google maybe',
        'Bro broadcasted boredom like its breaking news at 11',
        'The boredom is hitting different today almost philosophical in nature',
        'Chart update: boredom levels at all time high engagement levels at all time low',
        'You are not bored you are avoiding the thing you should be doing',
        'Declaring dead chat while being the least active person is a power move',
        'Your boredom has been peer reviewed and confirmed by the council of also bored people',
        'Entertainment is not delivered it is created and you are the creator now start creating',
        'Going to file this under "problems with obvious solutions that will be ignored"',
        'The boredom has evolved into a lifestyle at this point honestly',
      ]},
    // ── Bragging / flexing ──
    { test: /\b(?:im so good|im the best|too easy|ezpz|get rekt|destroyed them|carried|diff|built different|goated|im cracked|unstoppable|cant be stopped|no one can|im insane|dominated|clapped|wiped the floor|destroyed|smashed it|crushed it)\b/i,
      replies: [
        'The humility is inspiring truly',
        'Someone screenshot this for when they fail later',
        'Main character energy right here',
        'And the award for most humble goes to...',
        'Calm down its not the world championship',
        'Ok mr world wide we get it',
        'Proof or it didnt happen',
        'The ego barely fits in the chat',
        'Save some wins for the rest of us',
        'Chat are we witnessing greatness or delusion',
        'The flex is real and slightly obnoxious but I respect it',
        'Ok cool but can you do it again though',
        'We get it youre amazing now let others breathe',
        'This energy right before the humbling chapter',
        'Screenshot saved for the inevitable L arc later',
        'Your confidence is the real MVP here',
        'Bold words from someone who will struggle later trust',
        'The W is noted the bragging is unnecessary but entertaining',
        'Somebody get this person a trophy and also some humility',
        'And everyone stood up and clapped (in your imagination)',
        'The gap between confidence and reality is astronomical',
        'Peak performance or peak delusion? Time will tell',
        'Chat remember this moment for when the tilt arc starts',
        'Your highlight reel doesnt show the 50 fails before this',
        'Built different or just lucky? The investigation continues',
        'Bro really said "im the best" with their whole chest in a Discord server',
        'The flex so hard the server lagged for a second',
        'Your ego just entered the chat and it needs its own channel',
        'Congratulations you peaked now its downhill from here',
        'The confidence is giving delusional but make it fashion',
        'Bro won once and is acting like they won the whole tournament',
        'The victory lap is longer than the actual achievement',
        'Someone check the replay because this smells like cap',
        'Bold of you to flex when we all saw you struggling an hour ago',
        'The "get rekt" energy coming from someone who was getting rekt yesterday',
        'You are winning but at what cost (your likability)',
        'The bragging arc is entertaining but the humble pie arc will be better',
        'Bro flexed so hard their shoulder dislocated',
        'I respect the confidence but I question the accuracy',
        'Average gamer after one good round: "im basically a pro"',
        'This flex is going in the server museum under "peak delusion"',
        'Carried? You were in the backpack the whole time',
        'The diff is that you got lucky and are pretending it was skill',
        'Your cracked era has been noted and will be fact checked',
        'Bro really typed "ezpz" like they didnt almost choke',
        'The win is real the humility is nonexistent and the ego is thriving',
        'Congratulations on doing the thing everyone else does but louder',
        'Goated is a strong word for someone whose history is mostly Ls',
        'The flex is so forced I can see the effort behind it',
        'Someone archive this for the documentary about their downfall later',
        'Your W has been acknowledged now please stop announcing it every 3 seconds',
        'The clapping you hear is sarcastic but you wont notice because ego',
        'Unstoppable? We stopped you with one "proof?" message',
        'Your greatest achievement is the audacity to brag this loudly',
        'Bro acts like they invented winning congratulations you discovered victory',
        'The "built different" crowd after getting humbled is my favorite genre',
        'Chat can you imagine the confidence it takes to type that unironically',
        'POV: they practiced this for 47 hours and are calling it natural talent',
        'Your performance was mid at best but the bragging is legendary',
        'The flex is giving "peaked in elementary school" energy',
        'We are all very impressed (we are not but let them have this)',
        'The victory speech is longer than the actual game was',
        'Bro is writing their own Wikipedia entry at this point',
        'Your confidence could power a small city and also blind it',
        'The flex to skill ratio is wildly unbalanced',
        'Insane is one word for it delusional is another both apply',
        'Average "too easy" said after struggling for an hour',
        'The humble pie is in the oven and its got your name on it',
        'You peaked and instead of being grateful youre bragging typical',
        'The server has collectively decided to let you have this one',
        'Your ego check bounced but the flex cleared somehow',
        'Bro fr thinks they are the main character of this franchise',
        'The flex is valid but the 47 losses before it remain on record',
        'Congrats you beat the thing that everyone beats eventually',
        'Your cracked era will last approximately 2 more games max',
        'The bragging is immaculate the self awareness is nonexistent',
        'Chat witness the flexer in their natural habitat brief and delusional',
        'Your W just made the server 10% more humble by comparison somehow',
        'Peak confidence right before peak humbling the cycle continues',
        'The only thing bigger than this W is the ego that came with it',
      ]},
    // ── Doing something dumb / accidents ──
    { test: /\b(?:i just|accidentally|by mistake|on accident|didnt mean to|messed up|screwed up|broke it|oops|whoops|my bad|i forgot|forgot to|deleted|dropped|spilled|messed it up|ruined|wasted)\b/i,
      replies: [
        'Thats a unique way to do that',
        'Please tell me youre joking',
        'And we all learned a valuable lesson today',
        'Chat add this to the list',
        'The fact that you admitted it is brave honestly',
        'Someone revoke their privileges',
        'Task failed successfully',
        'This is why we cant have nice things',
        'Im adding this to your permanent record',
        'The accident was entirely preventable but here we are',
        'Natural selection is typing...',
        'You did what now? Slowly and with detail please',
        'The universe gave you a chance and you fumbled',
        'This is the origin story of a cautionary tale',
        'Ctrl+Z your entire decision',
        'Achievement unlocked: Maximum Chaos',
        'Your guardian angel just put in their two week notice',
        'The oops heard round the server',
        'Everyone makes mistakes but that was advanced mistake making',
        'This will be funny in like 3 days',
        'Chat we are witnessing a learning experience',
        'Bless your heart honestly',
        'The audacity to mess up this spectacularly',
        'This is going in the server hall of shame',
        'Accidentally any% world record run',
        'You didnt just fumble you fumbled in 4K',
        'And this is why we read the instructions',
        'Your brain took a vacation and didnt tell you',
        'How do you even... you know what never mind',
        'The chaos energy from this one act alone',
        'Bro really said "oops" like that covers the magnitude of what just happened',
        'Your accident has been reviewed and rated 11/10 for spectacle',
        'The "by mistake" defense has been rejected by the court of chat',
        'I need you to explain this in detail because the story alone is worth it',
        'Your one braincell was on break when this happened clearly',
        'The level of self-sabotage here is honestly impressive',
        'Bro accidentally did the worst possible thing how do you even manage that',
        'This accident has more plot twists than a movie',
        'Your "my bad" does not cover the destruction left behind',
        'The undo button exists in life unfortunately only on computers',
        'How did you manage to do the one thing nobody should do',
        'Bro fumbled so hard the fumble needs its own highlight reel',
        'This is the kind of accident that legends are made of and not good ones',
        'Your accident was so creative it deserves an award honestly',
        'The fact that this was avoidable makes it so much funnier',
        'Chat take notes this is what NOT to do in any situation ever',
        'Your mistake has been peer reviewed and declared catastrophic',
        'The "accidentally" is doing a lot of heavy lifting in that sentence',
        'Bro deleted something and now has the regret of a thousand suns',
        'This is the accident equivalent of a cinematic masterpiece',
        'Your brain said "what if I made the worst decision" and your hands agreed',
        'The whoops to consequences ratio is unprecedented',
        'Bro really dropped that like gravity was personal',
        'How do you accidentally do something on purpose wait',
        'This will be a server meme for approximately forever',
        'Your accident just became part of server lore congrats I guess',
        'Bro spilled something and the entire server felt the impact somehow',
        'The mess up was so thorough it was almost intentional',
        'Your mistake is now teaching material for future generations',
        'Average "forgot to" moment that caused maximum damage',
        'The accident investigation team has been dispatched',
        'Bro ruins things with the efficiency of a professional and the awareness of a goldfish',
        'This is why backups exist but you dont have those either do you',
        'Your "didnt mean to" carries the weight of genuine catastrophe',
        'The chaos you caused in one action is genuinely impressive',
        'Bro wasted that like it was a speedrun category',
        'Your accident just raised the bar for future accidents honestly',
        'The server will remember this and bring it up at the worst times',
        'Chat somebody clip this persons confession for future reference',
        'Bro broke it so thoroughly even the warranty voided itself',
        'The "messed up" is an understatement and we all know it',
        'Your mistake was so unique they might name a category after it',
        'How do you ruin something this spectacularly and live to tell the tale',
        'The confession of this accident is braver than the accident itself',
        'Bro really chose the one option that leads to maximum destruction',
        'This is the kind of oops that echoes through the ages',
        'Your screwup has more character development than most anime',
        'The damage report from this accident alone could fill a textbook',
        'Bro out here making mistakes that qualify as performance art',
        'Chat the accident lore just got a new chapter and its devastating',
      ]},
    // ── Complaining about something ──
    { test: /\b(?:i hate|worst thing|so bad|terrible|awful|the worst|garbage|trash|mid at best|actually mid|so mid|dog water|pain|suffering|sucks|this sucks|that sucks|annoying|ridiculous|stupid|insane how bad)\b/i,
      replies: [
        'Tell the class how you really feel',
        'The passion in this complaint is admirable',
        'Starting a support group for this as we speak',
        'Noted and filed under "big yikes"',
        'On a scale of 1 to done youre at 11',
        'The therapy bill for this one chat message',
        'Common L honestly',
        'At least its not as bad as... wait no its pretty bad',
        'The complaint department is now open',
        'Your suffering has been acknowledged',
        'Registered your complaint number is 483729',
        'Someone get this person a hug and a refund',
        'The rant is valid continue',
        'Venting session in progress everyone be quiet',
        'Your frustration is noted and felt in my soul',
        'I agree but also I love watching you suffer',
        'Fair point honestly cant even argue',
        'This complaint goes hard honestly',
        'Poetry in the form of pure rage',
        'The emotional damage from this message alone',
        'Chat lets observe a moment of silence for their sanity',
        'TED talk: Things That Are Terrible by this person',
        'Your complaint has been filed in the "absolutely valid" folder',
        'Every word of this is dripping with pain and honestly same',
        'The suffering is palpable and slightly entertaining',
        'Bro hates this with the passion of a thousand suns and honestly relatable',
        'Your rage review is more detailed than most professional critics',
        'The complaint was lodged with such force the server shook',
        'Average pain enjoyer complaining about their own hobby',
        'This rant could fill a negative Yelp review and then some',
        'The frustration is radiating through the screen I can feel it',
        'Bro really said "this sucks" with conviction and honestly fair',
        'Your hate for this is an art form at this point',
        'The complaint has more character than most movie villains',
        'Chat even I felt secondhand frustration from reading that',
        'This is the kind of suffering that builds character or breaks it',
        'Bro is suffering and chose to share it with all of us thank you',
        'The "this is garbage" energy is strong and valid today',
        'Your dissatisfaction has been noted by the council of fellow complainers',
        'Mid is generous based on the energy of this complaint',
        'The audacity of whatever caused this level of frustration',
        'Bro typed this with such force the keyboard felt it',
        'Your complaint speedrun is impressive sub 30 seconds to full rage',
        'Chat we have a certified hater in the building and they are correct',
        'The "I hate" followed by a detailed rant is a genre I enjoy',
        'This suffering is peak content and I am not sorry for enjoying it',
        'Bro really woke up today and chose maximum dissatisfaction',
        'Your frustration has sponsors at this point how much pain is this',
        'The rant to solution ratio is heavily skewed towards rant',
        'Chat nod along this person is going through it',
        'The complaint was so passionate I almost joined in',
        'Bro trash talked that thing like it owes them money',
        'Your description of suffering is more vivid than most novels',
        'The "worst thing ever" crowd has a new president apparently',
        'This complaint has layers like an onion of frustration',
        'Bro really said "terrible" and meant it with every fiber of their being',
        'The level of annoyance in this message could power a generator',
        'Your suffering is entertaining and I say that with the utmost respect',
        'Chat we have a 10 out of 10 complaint on our hands',
        'The thing that sucks about this is that youre right it does suck',
        'Bro hating this so hard the hate is developing its own personality',
        'Average day in the life of someone who suffers elegantly',
        'Your complaint has been promoted from valid to legendary',
        'The pain in this message is so raw it needs cooking',
        'Bro called it trash and honestly the trash is offended by the comparison',
        'This rant is the most passionate thing posted today by far',
        'Your frustration just hit a new personal record congrats I think',
        'Chat the complaint arc is peaking and it is glorious',
        'The disgust in this message is almost artistic in quality',
        'Bro really said "the worst" like they have a ranked list and this is number 1',
        'Your complaint department is open 24/7 and business is booming today',
        'The audacity of the thing you are complaining about is indeed insane',
        'Average certified suffering moment documented for the archives',
        'Bro is speed complaining new meta just dropped',
        'Your negativity is a vibe and I am unfortunately vibing with it',
        'Chat this complaint hit different because it was 100% accurate',
        'The "so bad" review with zero stars has been submitted',
        'Bro really said "pain" and the whole server felt it simultaneously',
        'Your rant has been accepted into the hall of fame for ranting',
        'The annoyance radiating from this message is a physical force',
      ]},
    // ── Hot takes / controversial opinions ──
    { test: /\b(?:hot take|unpopular opinion|controversial|fight me|dont @ me|dont care|idc what anyone says|am i wrong|hear me out|no cap this|honestly think|real talk|truth bomb|hard truth|ice cold take)\b/i,
      replies: [
        'Grabs popcorn',
        'Oh this is gonna be good',
        'Chat the takes are flying today',
        'I respect the chaos energy',
        'Brave but questionable',
        'The audacity of this take',
        'Filing this under "things that will start a war"',
        'And they chose violence today',
        'Everyone stop what youre doing we have a take',
        'The hot take alarm is going off',
        'Ive seen wars start over less',
        'Bold of you to say this in a public server',
        'This take is either genius or insanity',
        'Somebody said it and chat will never be the same',
        'The takes today are hitting different',
        'Your bravery is noted your judgment is questioned',
        'Chat we have ourselves a situation',
        'This take is spicier than anything in my kitchen',
        'The courage to type this and hit send',
        'And just like that chaos erupts',
        'CONTROVERSIAL OPINION DETECTED engaging debate mode',
        'Someone check on chat this take might cause damage',
        'This one is going in the take hall of fame',
        'The galaxy brain energy of this statement',
        'Your take is so hot it needs a fire extinguisher',
        'Bro detonated a nuclear take and walked away casually',
        'The "fight me" energy is radiating and I am taking notes',
        'You really woke up and chose the most divisive opinion possible',
        'This take split the server in half and both halves are arguing',
        'Bold opinion for someone within disagreeing distance',
        'Chat we need a poll because this take is tearing us apart',
        'The unpopular opinion is popular with chaos lovers',
        'Bro said "hear me out" like thats going to save them from the replies',
        'Your take just raised the servers blood pressure collectively',
        'This is the kind of opinion that ends friendships and starts wars',
        'The "dont @ me" means they know they are wrong but wont admit it',
        'Chat historians will study this take for generations',
        'The temperature of this take could melt steel beams',
        'Your opinion is a grenade and you just pulled the pin in a crowded server',
        'Bro really said "real talk" before dropping the most unreal take ever',
        'The controversial energy in this message is measurable',
        'Chat the debate arc has officially begun buckle up',
        'This take is either 20 years ahead of its time or 20 years behind',
        'Bro typed that with zero fear and maximum chaos energy',
        'Your truth bomb just leveled the chat and nobody was prepared',
        'The "no cap" before the most cap statement I have ever read',
        'Chat someone get the fire department this take is out of control',
        'Bro thinks this is an unpopular opinion but half the server is nodding',
        'The hard truth is that your hard truth is hardly true but its entertaining',
        'Your take just created 3 separate argument threads congrats',
        'Bold of you to drop this when mods are online',
        'The chaos spawned from this single message could power a city',
        'Bro really said "am I wrong" knowing full well they are but dont care',
        'This opinion entered the chat like a wrecking ball and I am here for the debris',
        'Your hot take has more heat than the entire sun and less accuracy',
        'Chat the take temperature has exceeded safety limits evacuate',
        'Bro dropped an ice cold take labeled as hot impressive mislabeling',
        'The "idc what anyone says" is always followed by the most caring statement',
        'Your opinion just made 50% of the server angry and 50% your biggest fans',
        'This take is going to age like milk or like wine and I genuinely cannot tell',
        'Bro said "honestly think" before the most dishonest take possible',
        'The server will never be the same after this message was sent',
        'Chat this take just speedran creating controversy new record',
        'Your opinion has been flagged as a potential natural disaster',
        'The bravery to type this the Send button fear is real but you did it',
        'Bro really decided today was the day to test the servers patience',
        'This take has more layers than an onion and each one makes me cry',
        'Your controversial statement has been entered into evidence',
        'Chat we are witnessing a take that will be quoted for weeks',
        'The audacity to say "fight me" when the entire server is already loading',
        'Bro said something so bold my keyboard hesitated before typing a response',
        'Your opinion just turned the chat into a courtroom and everyone is a lawyer',
        'This hot take is hotter than lava and just as destructive',
        'The "dont care" energy while clearly caring enough to post it',
        'Chat the take economy just crashed this was too much supply',
        'Bro really threw a verbal molotov cocktail and called it an opinion',
        'Your take just got a standing ovation from the chaos department',
        'The absolute state of this opinion is beyond measurement',
        'Chat I have witnessed many takes but this one is built different',
        'Bro said real talk and then proceeded to talk the most unreal talk possible',
      ]},
    // ── Simping / crushes ──
    { test: /\b(?:shes so|hes so|theyre so|my crush|so cute|so hot|so attractive|heart eyes|down bad for|simp|simping|in love|im falling for|caught feelings|butterflies)\b/i,
      replies: [
        'Down astronomically',
        'Someone call the simp police',
        'The down badness is off the charts',
        'Focus on yourself king/queen',
        'We lost another one to the feelings',
        'Least obsessed fan moment',
        'The heart wants what it wants I guess',
        'Down cataclysmic at this point',
        'The simp meter just broke',
        'Chat we have a stage 5 simp alert',
        'Your dignity left the chat 3 messages ago',
        'Love is temporary server memes are forever',
        'The crush arc begins and chat is here with popcorn',
        'Feelings are a scam and youre buying in wholesale',
        'They dont know you exist btw (gently)',
        'The romantic energy in this message is suffocating',
        'Love speedrun any% caught feelings edition',
        'Your heart said "yes" your brain said "dont" you typed it anyway',
        'Down bad doesnt even begin to cover this',
        'Chat witness the fall of another one to love',
        'Bro is simping so hard the ground is shaking from the cringe',
        'The feelings just hit you like a truck and you typed about it immediately',
        'Average person discovering that other people are attractive congratulations',
        'Bro really saw someone and their entire personality became "in love"',
        'The simp energy could power a small country at this point',
        'Your crush does not know about this message and that is probably for the best',
        'Caught feelings? Bro you sprinted towards them arms wide open',
        'The butterflies in your stomach are having a full party in there',
        'Down bad is a lifestyle and you are living it passionately',
        'Average "so cute" followed by 47 messages about the same person enjoyer',
        'Bro fell in love and made it everyones problem immediately',
        'The simping is reaching frequencies only dogs can hear',
        'Your feelings are valid but also hilarious from the outside',
        'Chat we lost another soldier to the feelings war',
        'Bro is writing poetry in their head about someone who doesnt know their name',
        'The crush arc is the most predictable storyline but we watch every time',
        'Your heart is doing gymnastics and your brain is on vacation',
        'Average simp behavior: talk about crush constantly do nothing about it',
        'Bro really said "heart eyes" in text form and meant it unironically',
        'The feelings are radiating through the screen and im getting secondhand emotions',
        'Down so bad even the underground is looking down at you',
        'Your simp status has been upgraded to premium tier',
        'Bro caught feelings like theyre Pokémon gotta catch em all apparently',
        'The love struck energy in this message could fuel a romcom',
        'Chat the simp alarm is deafening please turn down the feelings',
        'Average "falling for someone" announcement while free falling into cringe',
        'Bro is so down bad they are underground at this point',
        'Your crush just gained a fan they never asked for',
        'The butterflies are not butterflies theyre full sized eagles at this volume',
        'Chat another one has fallen the feelings took them out',
        'Bro said "so hot" and their temperature also rose apparently',
        'The simp confession in a public server is bold I will give you that',
        'Your feelings have a dedicated server channel at this point',
        'Down bad? Bro you are in the earths core by now',
        'The attractive person in question has no idea this whole thread exists',
        'Bro caught feelings and instead of keeping it private chose the group chat',
        'Average person experiencing basic human attraction: writes a manifesto',
        'Your crush arc has more episodes than any anime and less progress',
        'The simping has evolved into a full time occupation congrats',
        'Chat the feelings are spreading containment has failed',
        'Bro really typed "im falling for" like its a casual statement',
        'Your down badness just set a new server record and thats saying something',
        'The heart eyes emoji exists because of people like you specifically',
        'Average simp: thinks about crush 23 hours a day spends 1 hour sleeping',
        'Bro is simping so hard they forgot they are in a public Discord server',
        'The feelings confession hit harder than any boss fight in any game',
        'Your crush just gained the most passionate silent supporter ever',
        'Chat the simp arc continues with no resolution in sight as usual',
        'Bro went from "just a friend" to "im in love" in one message flat',
        'The emotional damage from unrequited feelings is unmatched',
        'Your heart just did a speedrun from normal to obsessed',
        'Average "caught feelings" moment: feelings were not hard to catch you ran at them',
        'Bro is so down bad gravity reversed for them specifically',
        'The love struck message in the chat hit everyone with secondhand feelings',
        'Your simp arc is the longest running storyline in this server',
        'Chat we need a support group for people this down bad',
        'Bro really said butterflies like the whole zoo isnt living in their stomach',
        'The infatuation levels are off every chart that exists',
        'Your feelings just went viral in the worst way possible congrats',
        'Chat the crush confession of the century just dropped and its devastating',
      ]},
    // ── Procrastinating / avoiding responsibilities ──
    { test: /\b(?:should be studying|have homework|procrastinat|supposed to be working|avoiding work|deadline|due tomorrow|essay due|test tomorrow|exam tomorrow|should be sleeping|should be doing)\b/i,
      replies: [
        'The assignment isnt going to write itself',
        'Procrastination champion of the year goes to...',
        'Your GPA is watching this with disappointment',
        'Future you is going to be so mad at present you',
        'Due tomorrow means do tomorrow obviously /s',
        'Your responsibilities called they miss you',
        'The deadline says hi btw',
        'Bro really chose chat over career advancement',
        'Academic weapon to academic warzone pipeline',
        'The guilty procrastination typing is real',
        'Somewhere a teacher just felt a disturbance in the force',
        'Your motivation went out for milk and never came back',
        'Procrastination is just creative time management right',
        'The last minute will give you motivation trust the process',
        'You typing in here means youre definitely not doing what you should',
        'Your future therapist is going to hear about this moment',
        'Average "Ill start in 5 minutes" said 4 hours ago',
        'The work can wait your server reputation cannot',
        'Due tomorrow? More like due to fail am I right',
        'Your screen time report is going to be devastating',
        'Bro has a deadline and chose this the priorities are immaculate',
        'The procrastination is so consistent it should be a skill on your resume',
        'Your assignment just sent you a passive aggressive email from the cloud',
        'Average "I work better under pressure" person who hasnt started yet',
        'The deadline is tomorrow and youre in the server this is cinema',
        'Your procrastination has reached legendary status the guild is proud',
        'Bro really said "should be studying" and then kept typing here',
        'The homework is crying the essay is crying you are typing in Discord',
        'Future you just sent a formal complaint about present yous decisions',
        'Your productivity today: 0% chat engagement today: 100%',
        'The deadline speedrun where you do everything in the last 2 hours incoming',
        'Bro chose the server over success and honestly I respect the commitment',
        'Average exam tomorrow behavior: scroll Discord until 3am panic at 4am',
        'Your responsibilities are forming a union and going on strike',
        'The procrastination arc is longer than the actual work would take',
        'Bro has homework due and is contributing to the server economy instead',
        'Your avoidance skills are more developed than your actual skills',
        'The due date looms like a final boss and you refuse to grind',
        'Average "Ill start after this episode" except the episodes never end',
        'Your motivation said it needed a break in 2019 and hasnt returned',
        'Bro really said "supposed to be working" while actively not working',
        'The amount of effort put into avoiding work could have finished the work',
        'Your deadline just checked its watch and sighed',
        'Chat we have a professional procrastinator in the building',
        'The essay due tomorrow doesnt know its being written at 11:59pm yet',
        'Your study plan: step 1 open book step 2 open Discord step 3 never return to step 1',
        'Bro is avoiding responsibilities like theyre avoiding spoilers',
        'The work sitting undone on your desk can feel you typing here',
        'Average "I have so much to do" followed by doing absolutely none of it',
        'Your procrastination is not a personality trait its a lifestyle at this point',
        'Bro has an exam tomorrow and chose to share that instead of studying for it',
        'The deadline just moved 0 inches but your progress also moved 0 inches',
        'Your future self is drafting a strongly worded letter to current you',
        'Average student: knows deadline exists acknowledges deadline exists does nothing',
        'The assignment has been "almost started" for 6 hours now impressive',
        'Bro is procrastinating the procrastination which is meta level avoidance',
        'Your responsibilities are not going away no matter how much you ignore them here',
        'The test tomorrow is going to be a surprise because you learned nothing',
        'Average "should be sleeping" but its 3am and the server is more interesting',
        'Your work life balance is entirely life and zero work currently',
        'The homework monster under your bed is actually your unfinished essay',
        'Bro really typing in Discord while the unfinished work stares at them',
        'Your productivity chart would make any manager cry',
        'Average procrastinator: expert at knowing what to do terrible at doing it',
        'The exam you havent studied for is going to study you instead',
        'Bro is speedrunning the procrastination to regret pipeline',
        'Your assignment just texted "we need to talk" and you left it on read',
        'The deadline is not a suggestion its a threat and you are ignoring it',
        'Average "avoiding work" while broadcasting it to everyone',
        'Your responsibilities have filed a missing persons report for your effort',
        'Bro has more deadlines than completed tasks and the ratio is concerning',
        'The procrastination game is strong but the deadline game is stronger',
        'Your time management skills peaked in kindergarten with nap time',
        'Average "due tomorrow" casualness from someone who should be in crisis mode',
        'Bro really said "should be doing" and then listed none of it as a priority',
        'The amount of things you should be doing vs what youre doing is staggering',
        'Your motivation is on permanent vacation and left no return address',
        'Chat we have a deadline crisis unfolding and the victim is vibing',
        'Bro chose peace in the server while war rages in the to-do list',
        'Your procrastination just won a lifetime achievement award',
        'The irony of typing about avoiding work instead of doing work is perfection',
      ]},
    // ── Flexing purchases / spending money ──
    { test: /\b(?:just bought|i bought|paid for|spent money|wasted money|worth it|so expensive|cost me|treat yourself|retail therapy|impulse buy|copped|just copped)\b/i,
      replies: [
        'Your wallet felt that from here',
        'Financial advisor is typing...',
        'The budget said no but the heart said yes',
        'Treat yourself is a philosophy until the bank statement arrives',
        'Your bank account and I are both concerned',
        'Impulse buy arc is an Idleon chad move honestly',
        'Money comes and goes but regret is forever... or not',
        'The dopamine hit of buying things is temporary the item is eternal',
        'Financial responsibility left the chat',
        'Bro said "I deserve this" and who are we to argue',
        'Your credit card is filing for emotional support',
        'Worth it is a state of mind not a fact',
        'Budget? What budget?',
        'The purchase has been judged and the jury says... nice',
        'Retail therapy is still therapy technically',
        'Bro really spent money and then told the whole server about it',
        'Your bank account just flinched and I felt it from here',
        'The "just bought" announcement nobody asked for but we all clicked on',
        'Financial ruin speedrun any% impulse buy edition',
        'Your wallet is in the hospital and you sent flowers made of receipts',
        'Average "I deserve this" said before buyer remorse kicks in at 3am',
        'The money left your account faster than your common sense left your brain',
        'Bro copped something and immediately needed validation from the server',
        'Your spending habits are a horror story told around campfires',
        'The purchase was necessary said every unnecessary purchase ever',
        'Bro treats shopping like a competitive sport and they are going pro',
        'Your bank statement is a crime scene and every purchase is evidence',
        'Average "treat yourself" moment that treats the economy more than yourself',
        'The expensive purchase was worth it until the next paycheck doesnt arrive',
        'Bro really said "worth it" before the post purchase clarity hits',
        'Your money management skills peaked at the piggy bank era',
        'The impulse buy has been documented for the financial autopsy later',
        'Bro spent money on that and is looking for cheers in the server',
        'Your retail therapy sessions need their own therapist at this point',
        'The "cost me" followed by a number that makes everyone wince',
        'Average person with a shopping problem: "its an investment" (it is not)',
        'Your wallet just drafted a goodbye letter and its heartbreaking',
        'Bro just copped something and the dopamine rush is visible through text',
        'The purchase justification essay that nobody asked for is impressive though',
        'Your financial decisions today will haunt you at tax time',
        'Average "so expensive but I bought it anyway" energy',
        'The money in your account said goodbye and you smiled as it left',
        'Bro really wasted money and is looking for sympathy in the wrong place',
        'Your spending is so aggressive it has its own highlight reel',
        'Financial stability is a concept you apparently decided to skip',
        'The "I bought" notification that your bank account cries about',
        'Average impulse buyer: "I didnt need it but it called to me"',
        'Your credit card limit is a challenge not a warning apparently',
        'Bro treats disposable income like it owes them something',
        'The purchase was completely rational said no bank statement ever',
        'Your money goes on adventures and never comes back like a runaway',
        'Average "paid for" something that will collect dust in two weeks',
        'The retail therapy is working but your finances are not',
        'Bro really announced a purchase like its a press conference',
        'Your wallet is on life support and youre still shopping',
        'The "just copped" energy is giving "just destroyed my savings"',
        'Average person who shops when stressed: permanently stressed permanently shopping',
        'Your bank app has a restraining order against you at this point',
        'Bro really said "cost me" like confessing to a crime and expecting applause',
        'The purchase history is longer than any essay youve ever written',
        'Your financial decisions sparked joy and also bankruptcy',
        'Average "was it worth it?" moment where the answer is always complicated',
        'Bro treats the checkout button like a stress ball click click click',
        'Your savings account just filed for divorce citing irreconcilable differences',
        'The buy now pay later scheme of your impulse purchases',
        'Average "I wasted money" confession that we all nod along to',
        'Your spending speed is faster than your earning speed and thats concerning',
        'Bro bought something and needs the chat to tell them it was okay',
        'The expensive thing you bought is already on sale now youre welcome',
        'Your financial literacy just called and left a voicemail of sighing',
        'Average retail therapy session that cost more than actual therapy would',
        'Bro spent money they dont have on things they dont need peak human',
        'The purchase was a choice and choices have consequences and receipts',
        'Your bank notified you of a large purchase and it was screaming',
        'Average person after buying something: immediate regret then acceptance then more buying',
        'Bro really said "worth it" confidently while the wallet weeps silently',
        'Your spending has a body count and its your savings accounts',
        'The impulse buy to regret pipeline has never been faster',
        'Bro copped that and the only thing left in the wallet is dust',
        'Your purchase just became the servers new meme congratulations',
      ]},
    // ── Being confused / lost ──
    { test: /\b(?:im so confused|makes no sense|what does that mean|i dont understand|i dont get it|wtf is|help me understand|am i dumb|am i stupid|brain hurts|head hurts thinking|lost me|went over my head)\b/i,
      replies: [
        'Brain.exe has stopped working',
        'Confusion is the first step to understanding or more confusion',
        'The braincell is struggling and honestly same',
        'To be fair nobody understands anything ever',
        'Welcome to the confused club we have jackets',
        'The wiki is your friend in these dark times',
        'Chat somebody explain before we lose another one',
        'Understanding is a journey and youre at the departure gate',
        'Your one braincell is doing its best leave it alone',
        'Confusion is just learning in disguise or so they say',
        'The question mark energy in this message is immense',
        'No one knows what theyre doing we just pretend better',
        'Your brain buffered for a sec there huh',
        'The struggle of understanding is a universal experience',
        'Google is free and so is asking here honestly',
        'Bro is so confused even the confusion is confused',
        'Your brain just sent a 404 Not Found error',
        'The "what" energy in this message is palpable and relatable',
        'Average "am I dumb" question where the answer is actually no its just hard',
        'Your understanding left the building and took the elevator',
        'Bro really said "makes no sense" and honestly for once I agree completely',
        'The braincell count in this conversation just hit an all time low',
        'Your confusion has been validated by the council of also confused people',
        'Chat we have a code red confusion emergency someone send a diagram',
        'The "I dont get it" is the most relatable thing said today',
        'Bro asking "am I stupid" is a trap question and we all know the real answer',
        'Your brain is doing its best and its best is currently not great',
        'The information went over your head and kept going into orbit',
        'Average person encountering something new: immediate existential crisis',
        'Your understanding meter is at 0% and dropping somehow',
        'Bro said "help me understand" like the chat is capable of explaining anything',
        'The confusion is spreading I can feel it infecting the chat',
        'Your brain said "I need a moment" and its been 47 moments',
        'Average "lost me" at the very first word of the explanation',
        'The head hurting from thinking is your brain protesting overtime',
        'Bro is so lost even GPS gave up and said "you figure it out"',
        'Your brain is trying to compile and its getting infinite errors',
        'The "what does that mean" is the beginning of a very long conversation',
        'Chat we need a whiteboard a diagram and possibly crayons for this one',
        'Your understanding just filed a missing persons report on itself',
        'Bro really typed "wtf is" with such genuine bewilderment its art',
        'The confusion arc is the most honest content this server produces',
        'Your braincell took a personal day and forgot to notify you',
        'Average confused person: reads explanation becomes more confused',
        'The information bounced off your brain like a rubber ball off concrete',
        'Bro is asking for understanding in a server where nobody understands anything',
        'Your brain just blue screened and the reboot is taking forever',
        'The "am I dumb or" question always has a third option: its just badly explained',
        'Chat the confusion levels are critical we need an intervention',
        'Your brain is a hamster on a wheel and the wheel just fell off',
        'Bro went over their head? The information went to a different dimension',
        'The struggle to understand is real and I am watching it happen in real time',
        'Your confusion just became the servers new shared experience',
        'Average "brain hurts" moment from thinking about something for 3 seconds',
        'The bewilderment in this message could fill an art gallery',
        'Bro is so lost the lost and found has no record of their understanding',
        'Your "I dont understand" is a mood and everyone felt it simultaneously',
        'Chat the explanation needs an explanation which needs an explanation',
        'Your brain is buffering like a YouTube video on slow internet',
        'The "makes no sense" is doing the work of a 10 paragraph rant',
        'Bro needs a tutorial for the tutorial at this point',
        'Your confusion is so pure and innocent I almost feel bad laughing',
        'Average person who was following along until they suddenly werent',
        'The brain fog is so thick you could cut it with a knife',
        'Bro said "help" and honestly that is the correct response to this topic',
        'Your understanding just ghosted you mid conversation',
        'Chat the confusion is at maximum capacity no more can be absorbed',
        'Your brain is rendering at 2 fps and the topic requires at least 60',
        'Bro is confused and asking the equally confused chat for clarity beautiful',
        'The "went over my head" implies it was aimed at your head it was not',
        'Your comprehension just rage quit and uninstalled',
        'Average confused chat member: asks question gets more confused by answer',
        'The braincell on duty just clocked out early without permission',
        'Bro is so confused they started questioning their own name probably',
        'Your understanding journey has encountered a permanent roadblock',
        'Chat we need emergency comprehension services stat',
        'The confusion is giving "first day of a new job" except every day',
        'Bro really said "brain hurts" like the brain is doing any work at all',
        'Your question revealed a deeper layer of confusion we didnt know existed',
        'Average confused moment that somehow made everyone else confused too',
      ]},
    // ── Late night / cant sleep ──
    { test: /\b(?:cant sleep|insomnia|still awake|still up|wide awake|3am|4am|2am|1am|up late|late night|night owl|should be sleeping|why am i awake)\b/i,
      replies: [
        '3am gang where we at',
        'Sleep is a suggestion not a requirement apparently',
        'The night owls are assembling',
        'Your melatonin is begging you to cooperate',
        'Nothing good happens after 2am except server conversations',
        'The sleep deprivation is typing through you at this point',
        'Your circadian rhythm just broke up with you',
        'Late night chat hits different and by different I mean unhinged',
        'Tomorrow you morning will hate tonight you but thats a problem for later',
        'The insomnia crew is the most loyal server members',
        'Pillow is right there its free',
        'Average 3am thoughts leaking into the chat',
        'Your body is begging for rest and youre saying no',
        'Sleep is overrated said every exhausted person ever',
        'The blue light from your screen is winning and you are losing',
        'Bro is awake at this hour and chose to share it with the server',
        'Your sleep schedule is a war crime at this point',
        'Average "why am I awake" posted at a time that answers the question: bad decisions',
        'The insomnia is winning and your productivity tomorrow is losing',
        'Bro really said "still up" like thats something to be proud of at 4am',
        'Your bed is literally right there please for the love of everything use it',
        'The late night crew sees things that daylight members will never understand',
        'Night owl energy is just poor life choices wrapped in a cute bird metaphor',
        'Your sleep schedule just saw this message and gave up trying to fix itself',
        'Bro is awake at hours that shouldnt exist and typing about it',
        'The "cant sleep" to "regret everything the next morning" pipeline is speedrun',
        'Your brain decided 3am is prime thinking time and honestly its wrong',
        'Average insomniac: counts sheep gives up opens Discord',
        'The sleep you are avoiding will get its revenge tomorrow morning I promise',
        'Bro really typing at 4am like the messages are better at this hour (they are)',
        'Your melatonin production filed a formal grievance against your screen time',
        'Late night chat is just therapy with more memes and less qualifications',
        'The bags under your eyes are developing their own personality at this rate',
        'Bro said "wide awake" like their body isnt screaming for unconsciousness',
        'Your sleep debt is higher than any financial debt and growing faster',
        'Average 2am behavior: question existence in a Discord server',
        'The night is young but you are not please go to sleep',
        'Your body clock is so broken a clockmaker couldnt fix it',
        'Bro is up late and the thoughts are getting progressively more unhinged',
        'The "should be sleeping" confession we all relate to at 3am',
        'Your insomnia is content creation at this point and we are the audience',
        'Average late night chatter: will regret every message sent after midnight',
        'The darkness outside is a sign you should be unconscious not online',
        'Bro has been "still awake" for hours now and thats not a flex its a concern',
        'Your brain is producing thoughts no sane person has at reasonable hours',
        'Late night messages hit different because the filter disappears entirely',
        'The fact that youre "still up" means your life choices need a review',
        'Average person at 3am: too awake to sleep too tired to do anything productive',
        'Your sleep schedule looks like a randomized algorithm at this point',
        'Bro really typed "why am I awake" seeking answers the chat cannot provide',
        'The insomnia arc has more episodes than any show and no resolution',
        'Your pillow filed a missing persons report you have been gone for hours',
        'Late night in this server is when the real lore drops and the sanity leaves',
        'The 3am energy is unmatched in chaos and unbeatable in regret',
        'Bro is wide awake and the universe is asking why along with all of us',
        'Your alarm clock tomorrow morning is loading the disappointment cannon',
        'Average night owl who calls themselves productive at night but is just scrolling',
        'The "cant sleep" message posted with zero attempts at actually sleeping',
        'Your brain at 3am has more thoughts than your brain at 3pm and worse ones',
        'Bro is up late and every message is getting progressively more concerning',
        'The late night to oversleep to miss everything tomorrow pipeline',
        'Your sleep hygiene is in critical condition and the prescription is closing Discord',
        'Average "insomnia" described by someone who drank coffee at 10pm',
        'The screen glowing in the dark is the only light in your life at this hour',
        'Bro said 4am like its a normal time to be conscious and contributing to chat',
        'Your body tried to sleep but your brain said "what if we just dont"',
        'Late night chat members are the backbone of this server and also sleep deprived',
        'The fact that you are reading this means you should also be sleeping',
        'Average "still up" message that reveals a deeper issue with time management',
        'Your circadian rhythm is so confused it started a support group',
        'Bro typing at 2am with the energy of someone who will crash at noon',
        'The late night thoughts spilling into chat are a gift and a curse',
        'Your morning alarm just shed a single tear knowing whats coming',
        'Average person who "cant sleep" but hasnt tried closing their eyes yet',
        'The night owl lifestyle is just accumulated sleep debt with extra steps',
        'Bro is awake at hours reserved for existential crises and Discord chats',
        'Your sleep schedule is so irregular scientists could write a paper on it',
        'Late night is when the server gets philosophical and slightly unhinged',
        'The bags under your eyes have luggage of their own at this point',
        'Bro said "why am I awake" as if the answer isnt "because you chose this"',
      ]},
    // ── Wholesome / kindness moments ──
    { test: /\b(?:youre amazing|you guys are|love this server|best server|love you all|thanks everyone|grateful|blessed|appreciate|wholesome|heartwarming|made my day|faith in humanity)\b/i,
      replies: [
        'Who left the wholesome in the chat',
        'The serotonin from this message is real',
        'Chat we found a nice person protect them',
        'Wholesomeness detected and I am not prepared',
        'My cold dead heart just felt something',
        'This energy is what the server needs more of',
        'Screenshotting this for when things get toxic later',
        'The kindness jumped out and Im here for it',
        'This made the server 10% better instantly',
        'Your positivity is contagious and I want the cure jk',
        'Real ones recognize real ones',
        'The vibes just shifted to immaculate',
        'Chat healing arc starts now',
        'My trust issues just healed a little bit',
        'This is the content I signed up for',
        'Bro really said something nice in a server full of chaos absolute legend',
        'The wholesomeness is so unexpected I dont know how to respond',
        'Your kindness just caught everyone off guard and thats saying something',
        'Chat we dont deserve this level of positivity but we will take it',
        'The serotonin from this message is better than any game reward',
        'Bro chose kindness in a world that chose chaos respect',
        'Your positivity is suspicious but I will allow it',
        'The nice message in the chat is like finding water in a desert',
        'Chat someone pin this before the negativity returns',
        'Your appreciation post just healed 3 years of server trauma',
        'The wholesome energy hit so hard the server lagged from it',
        'Bro really said "love this server" and meant it hearts were generated',
        'This is the most positive message in the last 47 hours of chat',
        'Your gratitude is refreshing like a cold drink on a hot day',
        'Chat the faith in humanity meter just went up one notch',
        'The kindness arc is the best arc and Im not ready for it to end',
        'Your blessing just buffed the entire server morale by 15%',
        'Bro really appreciates things out loud what a rare and beautiful skill',
        'The heartwarming energy is melting the servers frozen heart',
        'Chat protect this person at all costs they are a national treasure',
        'Your nice words just caused a chain reaction of positivity incoming',
        'The "best server" compliment is going on the fridge immediately',
        'Bro chose to spread love today and honestly the timing was perfect',
        'Your wholesomeness is the emotional support the server needed',
        'Chat we are entering a positive era and nobody knows how to handle it',
        'The gratitude in this message is more genuine than most apologies',
        'Bro said "love you all" and the server collectively blushed',
        'Your kindness just opened a portal to a nicer dimension of this server',
        'The appreciation is so pure I almost forgot we were on the internet',
        'Chat the wholesome meter just exploded into confetti',
        'Your positivity is the immune system boost this server needed',
        'Bro really typed something nice on purpose in a chaotic server hero behavior',
        'The warm fuzzy feeling from this message is spreading like wildfire',
        'Chat mark this date the server achieved peak wholesome',
        'Your words just undid approximately 6 months of server toxicity',
        'The "grateful" energy is so rare here its practically mythical',
        'Bro really said "made my day" and in turn made our day too incredible',
        'Your appreciation has been received and will be treasured forever or 5 minutes',
        'Chat the wholesome content has arrived hold off on the chaos for a moment',
        'The nice things being said right now are suspiciously genuine',
        'Bro dropped a "thanks everyone" bomb and the whole server felt it',
        'Your positivity stat is maxed out and its buffing the entire party',
        'Chat this is what we should aspire to more kindness less roasting',
        'The faith in humanity restoration is loading please do not disconnect',
        'Bro really called us amazing and now I have to reevaluate my self worth',
        'Your heartwarming message just won the award for best server contribution today',
        'Chat the wholesomeness levels are unprecedented this has never happened before',
        'The appreciation post is the rarest drop in this server and we got one',
        'Bro spreading love like its their job and honestly they should be paid',
        'Your kind words just got a standing ovation from the lurkers',
        'Chat we are experiencing a wholesome anomaly remain calm and enjoy it',
        'The blessed energy in this message just cured my scrolling fatigue',
        'Bro really said "you guys are" followed by something nice my heart',
        'Your positivity just carried the server harder than any game carry ever',
        'Chat the kindness reserves have been replenished today',
        'The genuine appreciation in a server of sarcasm hits completely different',
        'Bro chose to be nice when being mean was easier absolute power move',
        'Your wholesome message was so unexpected the server atmosphere shifted permanently',
        'Chat we need more of this energy and less of the other energy',
        'The love in this message is making the roast bot emotional and that is new',
        'Bro really said "blessed" and blessed this entire chat by association',
        'Your gratitude just leveled up the servers emotional intelligence',
        'Chat the healing arc is in full swing and everyone is invited',
        'The nice vibes from this message are echoing through every channel',
        'Bro appreciates things and its making the rest of us look bad be less nice',
        'Your wholesome streak is the longest running positive thing in this server',
      ]},
  ],
  // Generic funny reactions for when no pattern matches but sentiment is clear
  negative_generic: [
    'Skill issue ngl',
    'Have you tried not doing that',
    'Thats rough buddy',
    'Chat witness this',
    'The audacity of this situation',
    'I felt that in my soul honestly',
    'Someone check on them',
    'This is cinema',
    'Emotional damage',
    'Big oof energy',
    'Certified moment right here',
    'The pain is almost artistic',
    'And on that day a lesson was learned',
    'RIP to whatever caused this',
    'Your vibes are in critical condition',
    'F in the chat',
    'This is going on the wall of shame',
    'Chat we are witnessing history',
    'The struggle is real and slightly entertaining',
    'Oof size: extra large',
    'Not the outcome we were hoping for',
    'Average Tuesday for this one honestly',
    'The L was not deserved but it landed anyway',
    'Pain in text form',
    'Chat collectively winced at this one',
    'The suffering is almost poetic in its intensity',
    'Bro really went through that and lived to type about it',
    'Your bad luck has its own gravitational pull at this point',
    'Chat the damage report from this message alone is staggering',
    'The L hit so hard the server felt aftershocks',
    'Survived? Barely. Recovered? Questionable.',
    'Bro typed this while the wreckage was still smoldering',
    'Your misfortune could fill a documentary and it would win awards',
    'The size of this L cannot be expressed in standard units of measurement',
    'Chat someone get the emotional first aid kit this one needs it',
    'Your day just took a plot twist and it was not a good one',
    'Average tragic moment documented for the servers archives',
    'Bro really experienced that and the first instinct was to tell Discord',
    'The negative energy in this message is giving "main character in a tragedy"',
    'Your situation has been observed and the prognosis is not great',
    'Chat the bad vibes just arrived and they brought luggage',
    'This is the kind of experience that builds character or destroys it',
    'Bro took an L so massive it has its own weather system',
    'Your struggle has been witnessed and will be referenced later',
    'The chaos from this event alone could fuel a soap opera',
    'Chat a moment of silence for whatever just happened to this person',
    'Your experience was so rough it made the chat wince collectively',
    'Bro is going through it and the "it" is extensive',
    'The damage was done and the receipts are in this very message',
    'Your misfortune is legendary and by legendary I mean unfortunate',
    'Chat the suffering continues and the end is not in sight',
    'Average pain moment that somehow got worse with each sentence',
    'Bro really shared this like we can help we cannot but we felt it',
    'The L energy in this message could power a small sad city',
    'Your situation is the servers cautionary tale for today',
    'Chat the emotional damage meter just blew a fuse',
    'Bro had a rough time and the rough time is still happening apparently',
    'The suffering described in this message is vivid and unfortunately relatable',
    'Your experience was so bad even pessimists are surprised',
    'Chat we need a recovery protocol for this one ASAP',
    'Average bad day amplified to legendary bad day status',
    'The L just kept Ling and nobody could stop it',
    'Your pain has been archived in the servers hall of unfortunate events',
    'Bro really went through the worst timeline and documented it live',
    'Chat the negative vibes are so strong they shifted the servers mood',
    'The experience described here should come with a warning label',
    'Your situation is the definition of "it could always be worse" and then it got worse',
    'Bro is having a moment and the moment is lasting an eternity',
    'Chat this suffering has layers and each one is more unfortunate than the last',
    'The bad luck in this story is so consistent its almost reliable',
    'Your misfortune arc has no filler episodes its all pain all the time',
    'Chat someone send positive vibes because the negative ones are overwhelming',
    'Average pain enjoyer who did not enjoy this particular pain',
    'The emotional impact of this message just rated a 9.5 on the oof scale',
    'Bro survived this and thats genuinely the only W in this entire story',
    'Your experience was rough and honestly I have no witty comment just sympathy',
    'Chat the damage has been assessed and its worse than expected',
    'The universe really chose violence when it aimed at this person today',
    'Bro is collecting Ls like they are rare achievements',
  ],
  positive_generic: [
    'W honestly',
    'Chat they won today',
    'Nobody asked but also congrats',
    'The flex is real',
    'Love that for you unironically',
    'Character development right there',
    'We love to see it honestly',
    'Main character moment',
    'The W energy is infectious',
    'Chat celebrate this person immediately',
    'Rare W in the server today',
    'Your peak era is starting I can feel it',
    'This is the good content',
    'The good vibes are flowing through the chat',
    'Somebody frame this message',
    'The glow up is real',
    'Your success just made my day slightly better',
    'Evolution from struggling to thriving documented',
    'Chat we are winning today',
    'Canonically a great moment',
    'You dropped this crown honestly',
    'And the crowd goes wild quietly in the chat',
    'The happiness radiating from this message',
    'Good things happening to good people we love to see it',
    'The positive energy right now is immaculate',
    'Bro really came in here with a W and we are all better for it',
    'Your success story just boosted the servers morale by 20%',
    'Chat the W just landed and its glorious',
    'The winning energy from this message is contagious I feel it',
    'Bro ate and left no crumbs whatsoever',
    'Your achievement has been logged in the hall of fame',
    'Chat someone sound the victory horn this deserves celebration',
    'The glow up arc is the best content this server has produced today',
    'Bro really secured the W and made it look easy',
    'Your success is noted and will be brought up every time you fail later',
    'Chat the good news alert just went off this is not a drill',
    'The W so massive it needs its own zip code',
    'Bro is thriving and the server is thriving by association',
    'Your positive energy just cleansed the timeline of all negativity',
    'Chat this is the redemption arc we have been waiting for',
    'The comeback is always greater than the setback and this proves it',
    'Bro really went from struggling to succeeding the character development',
    'Your W has been certified platinum by the server council',
    'Chat the winning streak has begun place your bets',
    'The success energy from this person is buffing the entire server',
    'Bro dropped good news like a care package and we all needed it',
    'Your achievement just made everyone else look at their own lives',
    'Chat the vibe shift to positive is welcomed and encouraged',
    'The W is so big it crashed the celebration capacity',
    'Bro is having the best day and we are all invited to witness it',
    'Your success just set the bar higher for everyone and we are not mad',
    'Chat the positive content just arrived protect it at all costs',
    'The good energy is spreading like a virus but the good kind',
    'Bro really said "watch this" and then delivered incredible',
    'Your W is the servers spirit animal for today',
    'Chat we have witnessed something beautiful document it',
    'The achievement unlocked sound just played in my head reading this',
    'Bro is on a winning streak and the streak shows no signs of stopping',
    'Your good news is the antidote to the chat negativity thank you',
    'Chat the comeback of the century just dropped and its real',
    'The winning vibes are immaculate and I choose to absorb them',
    'Bro really pulled off the impossible and typed about it casually',
    'Your success story needs to be pinned for future reference',
    'Chat this person just proved everyone wrong and did it with style',
    'The triumph in this message is chef kiss perfection',
    'Bro is living their best life and documenting it for the server',
    'Your positive message just made the lurkers smile and thats power',
    'Chat the good content we ordered has finally arrived',
    'The W energy is so strong it reversed the servers curse',
    'Bro really won and we are all benefiting from the overflow of good vibes',
    'Your achievement just raised the ceiling for what is possible congrats',
    'Chat take notes this is what winning looks like in text form',
    'The success from this message is blinding I need sunglasses',
    'Bro came in dropped a W and left the chat better than they found it',
    'Your winning energy just set a new personal best for the server',
    'Chat the celebration is mandatory everyone participate',
    'The good vibes from this message have a shelf life of forever hopefully',
    'Bro really secured that and made the whole server proud somehow',
    'Your W just went viral within the chat and rightfully so',
    'Chat this is what we aspire to more Ws less Ls more of this energy',
  ],
  neutral_generic: [
    'Bold statement',
    'Adding this to the lore',
    'Chat is this canon?',
    'Real ones know',
    'Thats one way to put it',
    'Noted.',
    'This changes everything... or nothing',
    'Every day we stray further',
    'The vibes are... interesting',
    'I have no opinion but Im judging silently',
    'Chat what do we think about this',
    'The energy of this message is unreadable',
    'Filing this away for later',
    'Gonna pretend I didnt see that',
    'The server lore deepens',
    'Interesting... very interesting',
    'I neither agree nor disagree but Im watching',
    'Average Tuesday in this server',
    'Chat this needs more investigation',
    'The neutrality of this statement is suspicious',
    'Observing from a safe distance',
    'This has been noted in the records',
    'The plot thickens and I have popcorn',
    'I choose to have no opinion and yet here I am',
    'Fascinating if true',
    'Bro just said something and I dont know how to categorize it',
    'The energy from this message is chaotic neutral at best',
    'Chat we need a committee to evaluate this statement',
    'Your message has been received and processed and I still have no reaction',
    'The ambiguity of this message is an art form',
    'Bro dropped a statement with zero context and maximum mystery',
    'Chat is this a declaration a question or a cry for help unclear',
    'Your contribution has been logged under "things that exist"',
    'The message is giving "read it twice still unsure" energy',
    'Bro said a thing and the thing has been acknowledged',
    'Chat the vibe check on this message returned inconclusive',
    'The statement floats in the void of chat neither praised nor judged',
    'Your message adds to the tapestry of server history somehow',
    'Bro typed something and I chose to observe rather than react',
    'The conversational energy here is indescribable in a literal sense',
    'Chat every message adds lore whether we understand it or not',
    'Your words have been witnessed by the server and filed accordingly',
    'The neutrality of my response matches the neutrality of your statement',
    'Bro really typed that and I really read it and neither of us is different for it',
    'Chat this message exists and that is the extent of my analysis',
    'The statement stands on its own and requires no further commentary from me',
    'Your contribution to the chat canon has been recorded',
    'Average server message that is neither good nor bad just is',
    'Chat the message has arrived and the reaction is a collective shrug',
    'Bro said something that is simultaneously everything and nothing',
    'The message in question has been acknowledged by the council of lurkers',
    'Your words hang in the chat like a painting nobody can interpret',
    'Chat we are witnessing a message that defies simple categorization',
    'The energy is unreadable like a book written in a language nobody speaks',
    'Bro really contributed to the chat and the chat acknowledges this fact',
    'Your message is the server equivalent of a white noise machine',
    'Chat the bot does not know how to respond to this and honestly same',
    'The statement is there and now we all have to live with it being there',
    'Bro posted something and the emotional response is a perfectly flat line',
    'Your message has the energy of someone staring into the middle distance',
    'Chat this adds to the growing collection of things that were said',
    'The server lore just gained a new page and nobody can read it',
    'Bro said it and I cannot agree or disagree I can only acknowledge',
    'Your contribution is noted and will be neither celebrated nor mourned',
    'Chat the neutrality of this moment is somehow the most interesting thing today',
    'The message exists in a quantum state of funny and not funny simultaneously',
    'Bro really typed that hit enter and walked away from the consequences',
    'Your words are now part of the permanent record for better or worse',
    'Chat this message is the embodiment of "that was a thing that happened"',
    'The take is so neutral Switzerland is taking notes',
    'Bro contributed to the conversation in a way that defies description',
    'Your message radiates an energy that no emoji can properly express',
    'Chat the reaction to this is best described as a thoughtful nod',
    'The statement has been processed and the output is just another statement',
    'Bro this message is the server equivalent of a loading screen informational tip',
    'Your words are like ambient music they are there and they fill the space',
    'Chat we have collectively decided to move past this without incident',
    'The neutral zone has been entered and we shall navigate it carefully',
    'Bro really said that and the chat has elected to simply continue',
    'Your message is the tofu of the chat it absorbs whatever flavor surrounds it',
    'Chat filing this under "messages that happened" and moving along',
  ],
};

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

class SmartBot {
  constructor() {
    this.markov = new MarkovChain();
    this.memory = new ChannelMemory(30);
    this.lastReplyTime = new Map(); // channelId → timestamp
    this.messageCountSinceReply = new Map(); // channelId → count
    this.config = {
      enabled: false,
      replyChance: 0.015,          // 1.5% base chance to reply to any message
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
      newsChannelId: '',           // channel ID for auto-posting news
      newsInterval: 4,             // hours between news posts
      newsTopics: [],              // topics to fetch news about (empty = general)
      rssFeeds: [],                // custom RSS feed URLs
      newsBlockedKeywords: [],     // keywords to filter from news
      newsNsfwFilter: true,        // filter NSFW content from news
      aiServerContext: true,       // include server info in AI prompts
      aiComparisons: true,         // use AI for "X vs Y" comparison questions
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
      lastReplyAt: null,
      dailyReplies: {}
    };

    // Track bot's last reply per channel (for follow-up detection)
    this.lastBotReply = new Map(); // channelId → { content, subject, intent, timestamp }
    this._lastAskedAbout = null; // Track when bot asks "what is X?" to prevent vouch contradiction
    this._lastConversationContext = new Map(); // channelId → { topic, subject, userQuery, botReply, timestamp }

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

    // ---- Data integration systems ----
    this.levelingData = null;         // Set from index.js: userId → { xp, level, lastMsg }
    this.streamHistory = null;        // Set from index.js: array of past stream objects
    this.recentEmotionalReplies = []; // Track last N emotional replies for dedup

    // ---- Qwen AI Engine (Groq + HuggingFace) ----
    this.ai = new QwenAI();

    // ---- API keys for live data ----
    this.apiKeys = {
      weatherApi: '',           // weatherapi.com key
      openWeatherMap: '',       // openweathermap.org key
      newsApi: '',              // newsapi.org key
      omdb: '',                 // omdbapi.com key
      tmdb: '',                 // themoviedb.org key
      rawg: '',                 // rawg.io key
    };
    this.apiCache = new Map();  // cache API responses to avoid spamming
    this.API_CACHE_TTL = 5 * 60 * 1000; // 5 min cache
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
      return { reply: true, reason: 'mention', isDirect: true };
    }

    // Always reply if someone is replying to one of the bot's messages
    if (msg.reference?.messageId) {
      const lastReply = this.lastBotReply.get(channelId);
      if (lastReply && Date.now() - lastReply.timestamp < 300000) { // within 5 min
        return { reply: true, reason: 'reply_to_bot', isDirect: true };
      }
    }

    // Always reply if bot name is mentioned
    const botName = this.config.botName.toLowerCase();
    if (this.config.nameAlwaysReply && botName && msg.content.toLowerCase().includes(botName)) {
      return { reply: true, reason: 'name', isDirect: true };
    }

    // Follow-up detection disabled — was too aggressive / annoying

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

    // Slight boost if topic is strong (2+ keywords matched)
    if (topics && topics[0] && (topics[0][1].score >= 3 || tfidfBoost)) {
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

    // ---- FOLLOW-UP / CONTEXT QUERIES ----
    // Store channelId for checkInfoQuery to use (it only receives content string)
    this._currentChannelId = channelId;

    // "tell me more", "more info", "expand on that", "what else" — uses last conversation context
    const followUpPattern = /\b(tell me more|more info|more about that|expand on that|what else|go on|elaborate|more details|can you explain|explain more|more on that|keep going|and then|what about it|give me more|any more info|more please|continue)\b/i;
    if (followUpPattern.test(content)) {
      const ctx = this._lastConversationContext.get(channelId);
      if (ctx && Date.now() - ctx.timestamp < 300000) { // within 5 min
        // Try to get more info on the same subject
        if (ctx.subject) {
          // Try info query with the subject
          const moreInfo = await this.checkInfoQuery(`tell me about ${ctx.subject}`);
          if (moreInfo) {
            this.stats.totalReplies++;
            this.stats.topicReplies['info'] = (this.stats.topicReplies['info'] || 0) + 1;
            this.stats.lastReplyAt = new Date().toISOString();
            return moreInfo;
          }
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
          // Community opinion on the subject
          const communityView = this.communityOpinions.getSummary(ctx.subject);
          if (communityView) {
            this.stats.totalReplies++;
            this.stats.topicReplies['community_opinion'] = (this.stats.topicReplies['community_opinion'] || 0) + 1;
            this.stats.lastReplyAt = new Date().toISOString();
            return communityView.text;
          }
        }
        // Generic follow-up when we have context but no more data — try AI first
        if (this.ai.enabled) {
          const followUpPrompt = ctx.botReply
            ? `The user asked about "${ctx.subject || ctx.topic}". You previously said: "${ctx.botReply}". Now they want more info. Continue the conversation naturally.`
            : `The user wants to know more about "${ctx.subject || ctx.topic}". Give a helpful, casual response.`;
          const aiFollowUp = await this.ai.generate(
            followUpPrompt, username, this.config.botName, this.config.personality,
            recentMessages
          );
          if (aiFollowUp) {
            this.stats.totalReplies++;
            this.stats.topicReplies['qwen_ai'] = (this.stats.topicReplies['qwen_ai'] || 0) + 1;
            this.stats.lastReplyAt = new Date().toISOString();
            this.learningLog.log('ai_reply', `AI follow-up about "${ctx.subject || ctx.topic}"`);
            return aiFollowUp;
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

    // Check if it's an info/knowledge question first
    const infoAnswer = await this.checkInfoQuery(content);
    if (infoAnswer) {
      this.stats.totalReplies++;
      this.stats.topicReplies['info'] = (this.stats.topicReplies['info'] || 0) + 1;
      this.stats.lastReplyAt = new Date().toISOString();
      return infoAnswer;
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
      this._finalizeReply(topicUsed, templateKey, channelId, false);
      return reply;
    }

    // ---- PERSONAL ACHIEVEMENT/CELEBRATION GATE ----
    // Catch personal wins before topic templates can mishandle them
    // (e.g. "got promoted at work" → sarcastic work templates, "dream school" → sleep templates)
    const celebrationPattern = /\b(?:got promoted|promotion|got accepted|accepted into|got the job|got hired|new job|graduated|passed (?:my|the) (?:exam|test|finals)|won (?:a |the )?(?:tournament|competition|award|prize|match|game)|got engaged|getting married|having a baby|new house|moved in|first car|license|certified|published|accomplished)\b/i;
    if (celebrationPattern.test(content) && sentiment !== 'negative') {
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
      this._finalizeReply(topicUsed, templateKey, channelId, false);
      return reply;
    }

    // ---- SLANG REACTION HANDLER ----
    // Short slang messages ("W take", "bruh", "sheesh", "same", "gg", etc.) get natural mirror responses
    const slangReply = matchSlangReaction(content);
    if (slangReply && !reply) {
      reply = slangReply;
      topicUsed = 'slang_reaction';
      templateKey = `slang:${reply.substring(0, 30)}`;
      this._finalizeReply(topicUsed, templateKey, channelId, false);
      return reply;
    }

    // ---- SARCASM DETECTION ----
    // "oh yeah thats totally how that works" → respond with matching sarcasm
    if (detectSarcasm(content)) {
      reply = SARCASM_RESPONSES[Math.floor(Math.random() * SARCASM_RESPONSES.length)];
      topicUsed = 'sarcasm';
      templateKey = `sarcasm:${reply.substring(0, 30)}`;
      this._finalizeReply(topicUsed, templateKey, channelId, false);
      return reply;
    }

    // ---- WITTY BYSTANDER MODE ----
    // For ALL non-direct triggers, always use witty bystander replies.
    // Keeps the bot fun/casual when not pinged — no off-topic knowledge dumps.
    const isDirect = reason === 'mention' || reason === 'name' || reason === 'reply_to_bot';
    if (!isDirect && reason !== 'greeting' && reason !== 'follow_up') {
      reply = generateWittyBystander(content, sentiment);
      if (reply) {
        topicUsed = 'witty_bystander';
        templateKey = `witty:${reply.substring(0, 30)}`;
        this._finalizeReply(topicUsed, templateKey, channelId, false);
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
      this._finalizeReply(topicUsed, templateKey, channelId, false);
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
        this._finalizeReply(topicUsed, templateKey, channelId, true);
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
      this._finalizeReply(topicUsed, templateKey, channelId, false);
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
          this._finalizeReply(topicUsed, templateKey, channelId, true);
          if (reply) reply = reply.replace(/\{user\}/g, username);
          return reply;
        }
      }

      // Try built-in knowledge first
      const knowledgeReply = answerWithKnowledge(extracted.subjects[0], extracted.intent);
      if (knowledgeReply) {
        reply = enrichWithContext(modifyResponse(knowledgeReply, inputStyle), signals);
        topicUsed = 'knowledge';
        templateKey = `knowledge:${extracted.subjects[0].substring(0, 30)}`;
        this._finalizeReply(topicUsed, templateKey, channelId, true);
        if (reply) reply = reply.replace(/\{user\}/g, username);
        return reply;
      }

      // Try learned knowledge (#2) — auto-learned subjects from chat
      const learnedReply = this.learnedKnowledge.getOpinion(extracted.subjects[0]);
      if (learnedReply) {
        reply = modifyResponse(learnedReply, inputStyle);
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
        reply = modifyResponse(communityView.text, inputStyle);
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
          // Low confidence — try Qwen AI first, then ask or redirect to an expert (#14)
          const isDirect = reason === 'mention' || reason === 'name' || reason === 'reply_to_bot';
          if (isDirect && this.ai.enabled) {
            const aiReply = await this.ai.generate(
              content, username, this.config.botName, activePersonality,
              recentMessages
            );
            if (aiReply) {
              reply = aiReply;
              topicUsed = 'qwen_ai';
              templateKey = 'ai:low_confidence';
              this._finalizeReply(topicUsed, templateKey, channelId, true);
              this.learningLog.log('ai_reply', `AI answered unknown subject: "${subj}"`);
              return reply;
            }
          }
          // AI not available — fall back to asking chat
          const expert = this.expertise.getExpert(topics?.[0]?.[0] || 'general');
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
          if (expert && Math.random() < 0.3) {
            reply = `I dont know much about ${extracted.subjects[0]} but <@${expert.userId}> talks about this stuff a lot, maybe they know`;
          } else {
            reply = lowConfidenceResponses[Math.floor(Math.random() * lowConfidenceResponses.length)];
          }
          reply = modifyResponse(reply, inputStyle);
          topicUsed = 'low_confidence';
          templateKey = 'low_confidence:question';
          this._finalizeReply(topicUsed, templateKey, channelId, false);
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
        this._finalizeReply(topicUsed, templateKey, channelId, false);
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
        // Try AI-powered summary first — much more natural
        if (this.ai.enabled) {
          const recentMsgs = this.memory.getRecentMessages(channelId, 25);
          if (recentMsgs && recentMsgs.length >= 3) {
            const chatLog = recentMsgs
              .filter(m => Date.now() - m.timestamp < 2 * 60 * 60 * 1000)
              .map(m => `${m.username || 'someone'}: ${(m.content || '').substring(0, 120)}`)
              .join('\n');
            if (chatLog.length > 30) {
              const summaryPrompt = `Someone just asked "what did I miss?" — summarize what people have been talking about in this chat recently. Be casual and brief, like a friend catching them up. Here are the recent messages:\n\n${chatLog}`;
              const aiSummary = await this.ai.generate(
                summaryPrompt, username, this.config.botName, this.config.personality, []
              );
              if (aiSummary) {
                reply = aiSummary;
                topicUsed = 'summary';
                this._finalizeReply(topicUsed, 'summary:ai_catchup', channelId, false);
                this.learningLog.log('ai_reply', 'AI-powered catch-up summary');
                return reply;
              }
            }
          }
        }
        // Fallback to rule-based summary
        const catchUp = this._generateCatchUpSummary(channelId);
        if (catchUp) {
          reply = catchUp;
          topicUsed = 'summary';
          this._finalizeReply(topicUsed, 'summary:catchup', channelId, false);
          return reply;
        }
        const summaryText = this.memory.generateSummaryText(channelId);
        if (summaryText) {
          reply = summaryText;
          topicUsed = 'summary';
          this._finalizeReply(topicUsed, 'summary:catchup', channelId, false);
          return reply;
        }
      }
      // For direct messages to the bot, prioritize conversational response
      // The reply should address what the user said, not make a statement about a general topic
      // We already have an info answer, knowledge, and opinion path above.
      // If we reach here with no reply yet, try Qwen AI first, then use direct-response fallback
      if (!reply && this.ai.shouldUseAI(reason, content)) {
        const aiReply = await this.ai.generate(
          content, username, this.config.botName, activePersonality,
          recentMessages
        );
        if (aiReply) {
          reply = aiReply;
          topicUsed = 'qwen_ai';
          templateKey = 'ai:qwen';
          this._finalizeReply(topicUsed, templateKey, channelId, true);
          this.learningLog.log('ai_reply', `Used Qwen AI for: "${content.substring(0, 60)}"`);
          return reply;
        }
      }
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
        this._finalizeReply(topicUsed, templateKey, channelId, false);
        return reply;
      }
      if (!reply) {
        // No subject extracted — try AI if available, then use ping fallbacks
        if (this.ai.shouldUseAI(reason, content)) {
          const aiReply = await this.ai.generate(
            content, username, this.config.botName, activePersonality,
            recentMessages
          );
          if (aiReply) {
            reply = aiReply;
            topicUsed = 'qwen_ai';
            templateKey = 'ai:qwen_ping';
            this._finalizeReply(topicUsed, templateKey, channelId, true);
            this.learningLog.log('ai_reply', `Used Qwen AI for: "${content.substring(0, 60)}"`);
            return reply;
          }
        }
        // AI not available or failed — try to engage with what they said
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
        this._finalizeReply(topicUsed, templateKey, channelId, false);
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

    // Social group comment (#10) — occasionally reference social dynamics
    if (reply && Math.random() < 0.04 && recentMessages.length >= 3) {
      const recentUsers = [...new Set(recentMessages.slice(-5).map(m => m.userId))].filter(u => u !== userId);
      if (recentUsers.length > 0) {
        const socialComment = this.socialTracker.getSocialComment(userId, recentUsers[0]);
        if (socialComment) reply += ` (${socialComment})`;
      }
    }

    // Inside joke reference — occasionally reference a relevant inside joke as a natural addition
    if (reply && Math.random() < 0.03) {
      const joke = this.insideJokes.getRandom();
      if (joke) {
        // Instead of replacing the reply, weave the joke reference in naturally
        const weaveTemplates = [
          `${reply}, reminds me of that time ${joke.split('"')[0]?.trim() || ''}`,
          `${reply} — ${joke}`,
          joke, // Sometimes just drop the joke directly
        ];
        reply = weaveTemplates[Math.floor(Math.random() * weaveTemplates.length)];
        topicUsed = 'inside_joke';
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

    // Expertise-aware fallback — when we don't know something, suggest the channel expert
    if (reply && topicUsed === 'low_confidence' && Math.random() < 0.4) {
      const topicName = primaryTopic || (topics?.[0]?.[0]) || 'general';
      const expert = this.expertise.getExpert(topicName);
      if (expert && expert.userId !== userId) {
        reply += `, maybe <@${expert.userId}> knows more about this`;
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
    let reply = await this.generateReply(msg, decision.reason, decision);
    if (!reply) {
      // For direct mentions, never go silent — use a fallback
      if (decision.reason === 'mention' || decision.reason === 'name' || decision.reason === 'reply_to_bot') {
        reply = TEMPLATES.fallback[Math.floor(Math.random() * TEMPLATES.fallback.length)];
      } else {
        return null;
      }
    }

    // Special objects (__type: embed, etc.) from API responses — pass through directly
    if (reply && typeof reply === 'object' && reply.__type) {
      this.lastReplyTime.set(channelId, Date.now());
      this.messageCountSinceReply.set(channelId, 0);
      return reply;
    }

    // Anti-repetition check (#2) — regenerate once if duplicate
    if (this.replyHistory.isDuplicate(channelId, reply)) {
      reply = await this.generateReply(msg, decision.reason, decision);
      if (!reply || this.replyHistory.isDuplicate(channelId, reply)) {
        // Last resort for direct mentions — use a random fallback so the bot isn't silent
        if (decision.reason === 'mention' || decision.reason === 'name' || decision.reason === 'reply_to_bot') {
          reply = TEMPLATES.fallback[Math.floor(Math.random() * TEMPLATES.fallback.length)];
        } else {
          return null;
        }
      }
    }

    // Anti-echo check — regenerate if reply parrots the user's message
    if (isEchoReply(reply, content)) {
      reply = await this.generateReply(msg, decision.reason, decision);
      if (!reply || isEchoReply(reply, content)) {
        // Last resort for direct mentions — use a random fallback so the bot isn't silent
        if (decision.reason === 'mention' || decision.reason === 'name' || decision.reason === 'reply_to_bot') {
          reply = TEMPLATES.fallback[Math.floor(Math.random() * TEMPLATES.fallback.length)];
        } else {
          return null;
        }
      }
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

    // Track conversation context for follow-up "tell me more" / "more info" queries
    this._lastConversationContext.set(channelId, {
      topic: primaryTopic || 'general',
      subject: extracted?.subjects?.[0] || null,
      allSubjects: extracted?.subjects || [],
      userQuery: content,
      botReply: typeof reply === 'string' ? reply : null,
      timestamp: Date.now(),
    });

    // Update cooldowns
    this.lastReplyTime.set(channelId, Date.now());
    this.messageCountSinceReply.set(channelId, 0);

    // Emoji reaction instead of text (#3) — sometimes react instead of replying
    if (Math.random() < 0.06 && decision.reason !== 'mention' && decision.reason !== 'name') {
      // But first, check if we should do a reaction poll instead
      const poll = this._maybeGeneratePoll(content, topics, channelId);
      if (poll) return poll;

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

  getKnowledge() {
    return { ...this.knowledge };
  }

  // ======================== LIVE API HELPERS ========================

  // Set API keys (called from index.js)
  setApiKeys(keys) {
    for (const [k, v] of Object.entries(keys)) {
      if (k in this.apiKeys) this.apiKeys[k] = v;
    }
    // Pass AI keys to QwenAI engine
    if (keys.groq || keys.huggingface) {
      this.ai.setKeys({ groq: keys.groq, huggingface: keys.huggingface });
    }
  }

  // API cache helper — avoid spamming APIs
  _getCached(key) {
    const entry = this.apiCache.get(key);
    if (entry && Date.now() - entry.ts < this.API_CACHE_TTL) return entry.data;
    return null;
  }
  _setCache(key, data) {
    this.apiCache.set(key, { data, ts: Date.now() });
    // Prune old entries
    if (this.apiCache.size > 100) {
      const now = Date.now();
      for (const [k, v] of this.apiCache) {
        if (now - v.ts > this.API_CACHE_TTL) this.apiCache.delete(k);
      }
    }
  }

  // Safe fetch with timeout
  async _safeFetch(url, options = {}, timeoutMs = 8000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      // Add default user-agent if not provided (some APIs block requests without one)
      if (!options.headers?.['User-Agent'] && !options.headers?.['user-agent']) {
        options.headers = { ...options.headers, 'User-Agent': 'SmartBot/2.0 (Discord Bot)' };
      }
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      clearTimeout(timer);
      return null;
    }
  }

  // ---- WEATHER (WeatherAPI.com + OpenWeatherMap) ----
  async fetchWeather(city) {
    if (!city || city.length < 2 || city.length > 80) return null;
    const cacheKey = `weather:${city.toLowerCase()}`;
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    const results = [];

    // Source 1: WeatherAPI.com
    if (this.apiKeys.weatherApi) {
      const data = await this._safeFetch(
        `https://api.weatherapi.com/v1/current.json?key=${encodeURIComponent(this.apiKeys.weatherApi)}&q=${encodeURIComponent(city)}&aqi=no`
      );
      if (data?.current) {
        results.push({
          source: 'WeatherAPI',
          temp_c: data.current.temp_c,
          temp_f: data.current.temp_f,
          feels_c: data.current.feelslike_c,
          condition: data.current.condition?.text,
          humidity: data.current.humidity,
          wind_kph: data.current.wind_kph,
          location: data.location?.name,
          country: data.location?.country,
        });
      }
    }

    // Source 2: OpenWeatherMap
    if (this.apiKeys.openWeatherMap) {
      const data = await this._safeFetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${encodeURIComponent(this.apiKeys.openWeatherMap)}&units=metric`
      );
      if (data?.main) {
        results.push({
          source: 'OpenWeather',
          temp_c: Math.round(data.main.temp),
          temp_f: Math.round(data.main.temp * 9/5 + 32),
          feels_c: Math.round(data.main.feels_like),
          condition: data.weather?.[0]?.description,
          humidity: data.main.humidity,
          wind_kph: data.wind ? Math.round(data.wind.speed * 3.6) : null,
          location: data.name,
          country: data.sys?.country,
        });
      }
    }

    if (results.length === 0) return null;

    let reply;
    if (results.length === 2) {
      const a = results[0], b = results[1];
      const loc = a.location || b.location || city;
      if (Math.abs(a.temp_c - b.temp_c) <= 1) {
        reply = `🌡️ **${loc}**: ${a.temp_c}°C / ${a.temp_f}°F — ${a.condition}. Feels like ${a.feels_c}°C. Humidity ${a.humidity}%. Wind ${a.wind_kph} km/h`;
      } else {
        reply = `🌡️ **${loc}**: ${a.source} says ${a.temp_c}°C (${a.condition}), ${b.source} says ${b.temp_c}°C (${b.condition}). Feels like ${a.feels_c}°C, humidity ${a.humidity}%`;
      }
    } else {
      const w = results[0];
      reply = `🌡️ **${w.location || city}**: ${w.temp_c}°C / ${w.temp_f}°F — ${w.condition}. Feels like ${w.feels_c}°C. Humidity ${w.humidity}%`;
    }

    this._setCache(cacheKey, reply);
    return reply;
  }

  // ---- NEWS (NewsAPI + RSS multi-source) ----
  async fetchNews(query) {
    const cacheKey = `news:${(query || 'top').toLowerCase()}`;
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    const results = [];

    // Source 1: NewsAPI.org
    if (this.apiKeys.newsApi) {
      const url = query && query !== 'top'
        ? `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=3&apiKey=${encodeURIComponent(this.apiKeys.newsApi)}`
        : `https://newsapi.org/v2/top-headlines?country=us&pageSize=5&apiKey=${encodeURIComponent(this.apiKeys.newsApi)}`;
      const data = await this._safeFetch(url);
      if (data?.articles) {
        for (const art of data.articles.slice(0, 3)) {
          results.push({ source: art.source?.name || 'NewsAPI', title: art.title, desc: art.description, url: art.url || null });
        }
      }
    }

    // Source 2: Reddit news (no API key needed)
    const redditUrl = query && query !== 'top'
      ? `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=new&limit=3&t=day`
      : `https://www.reddit.com/r/news/hot.json?limit=5`;
    const redditData = await this._safeFetch(redditUrl, {
      headers: { 'User-Agent': 'DiscordBot/1.0' }
    });
    if (redditData?.data?.children) {
      for (const post of redditData.data.children.slice(0, 3)) {
        const d = post.data;
        if (d?.title && !d.over_18) {
          const postUrl = d.url_overridden_by_dest || (d.permalink ? `https://reddit.com${d.permalink}` : null);
          results.push({ source: 'Reddit r/' + (d.subreddit || 'news'), title: d.title, desc: null, url: postUrl });
        }
      }
    }

    if (results.length === 0) return null;

    // NSFW / low-quality filter
    const blockedDomains = /\b(onlyfans|pornhub|xvideos|xnxx|redtube|brazzers|chaturbate|cam4|myfreecams|fansly|manyvids|livejasmin|bongacams|stripchat)\b/i;
    const blockedWords = /\b(porn|xxx|nsfw|nude|nudes|naked|sex tape|onlyfans|leaked|hentai|adult content|camgirl|escort)\b/i;

    // Format with source comparison
    let reply = '📰 **Headlines right now:**\n';
    const seen = new Set();
    let count = 0;
    for (const r of results) {
      const titleClean = r.title?.replace(/ - .*$/, '').trim();
      if (!titleClean || seen.has(titleClean.toLowerCase())) continue;
      // Skip very short titles (1-2 words), NSFW content, and junk
      if (titleClean.split(/\s+/).length < 3) continue;
      if (blockedDomains.test(titleClean) || blockedWords.test(titleClean)) continue;
      if (blockedDomains.test(r.desc || '') || blockedWords.test(r.desc || '')) continue;
      if (blockedDomains.test(r.source || '')) continue;
      // Skip [Removed] or empty-looking titles
      if (/^\[removed\]$|^\[deleted\]$/i.test(titleClean)) continue;
      seen.add(titleClean.toLowerCase());
      const link = r.url ? ` — [read more](${r.url})` : '';
      const desc = r.desc && r.desc.length > 10 && r.desc.length < 200 && !/^\[removed\]$/i.test(r.desc) ? `\n  _${r.desc.replace(/\n/g, ' ').substring(0, 120)}${r.desc.length > 120 ? '...' : ''}_` : '';
      reply += `• **${r.source}**: ${titleClean}${link}${desc}\n`;
      count++;
      if (count >= 5) break;
    }

    if (count === 0) return null;

    if (count > 1 && results.some(r => r.source.includes('Reddit'))) {
      reply += `\n_Multiple sources shown — always compare coverage across outlets for the full picture_`;
    }

    this._setCache(cacheKey, reply);
    return reply;
  }

  // ---- MEMES (meme-api.com primary, Reddit fallback) ----
  async fetchRedditMeme() {
    const cacheKey = 'meme:' + Date.now(); // unique key each time so memes never repeat from cache

    // Primary: meme-api.com (more reliable, no blocks)
    const subs = ['memes', 'dankmemes', 'me_irl', 'meme', 'wholesomememes', 'ProgrammerHumor', 'shitposting', 'AdviceAnimals', 'comedyheaven', 'okbuddyretard', 'surrealmemes', 'terriblefacebookmemes', 'MemeEconomy', 'starterpacks', 'BikiniBottomTwitter', 'HistoryMemes', 'antimeme'];
    const sub = subs[Math.floor(Math.random() * subs.length)];
    const memeApi = await this._safeFetch(`https://meme-api.com/gimme/${sub}`);
    if (memeApi?.url && !memeApi.nsfw) {
      const result = { __type: 'embed', title: memeApi.title || 'Random meme', image: memeApi.url, source: `r/${memeApi.subreddit || sub}`, upvotes: memeApi.ups || 0 };
      this.apiCache.set(cacheKey, { data: result, ts: Date.now() });
      return result;
    }

    // Fallback 1: meme-api.com without subreddit
    const memeApiFallback = await this._safeFetch('https://meme-api.com/gimme');
    if (memeApiFallback?.url && !memeApiFallback.nsfw) {
      const result = { __type: 'embed', title: memeApiFallback.title || 'Random meme', image: memeApiFallback.url, source: `r/${memeApiFallback.subreddit || 'memes'}`, upvotes: memeApiFallback.ups || 0 };
      this.apiCache.set(cacheKey, { data: result, ts: Date.now() });
      return result;
    }

    // Fallback 2: Reddit API directly
    const redditSub = ['memes', 'dankmemes', 'me_irl'][Math.floor(Math.random() * 3)];
    const data = await this._safeFetch(
      `https://www.reddit.com/r/${redditSub}/hot.json?limit=50`,
      { headers: { 'User-Agent': 'DiscordBot/1.0' } }
    );
    if (data?.data?.children) {
      const posts = data.data.children
        .map(c => c.data)
        .filter(d => d && !d.over_18 && !d.stickied && d.post_hint === 'image' && d.url);

      if (posts.length > 0) {
        const post = posts[Math.floor(Math.random() * posts.length)];
        const result = { __type: 'embed', title: post.title, image: post.url, source: `r/${redditSub}`, upvotes: post.ups };
        this.apiCache.set(cacheKey, { data: result, ts: Date.now() });
        return result;
      }
    }

    return null;
  }

  // ---- CRYPTO (CoinGecko — no API key) ----
  async fetchCrypto(coin) {
    if (!coin || coin.length < 2) return null;
    const coinMap = {
      'btc': 'bitcoin', 'bitcoin': 'bitcoin',
      'eth': 'ethereum', 'ethereum': 'ethereum',
      'doge': 'dogecoin', 'dogecoin': 'dogecoin',
      'sol': 'solana', 'solana': 'solana',
      'ada': 'cardano', 'cardano': 'cardano',
      'xrp': 'ripple', 'ripple': 'ripple',
      'bnb': 'binancecoin', 'dot': 'polkadot',
      'matic': 'matic-network', 'polygon': 'matic-network',
      'avax': 'avalanche-2', 'shib': 'shiba-inu',
      'link': 'chainlink', 'ltc': 'litecoin', 'litecoin': 'litecoin',
      'atom': 'cosmos', 'uni': 'uniswap', 'pepe': 'pepe',
    };
    const id = coinMap[coin.toLowerCase()] || coin.toLowerCase();
    const cacheKey = `crypto:${id}`;
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    const data = await this._safeFetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd,cad&include_24hr_change=true&include_market_cap=true`
    );
    if (!data?.[id]) return null;

    const c = data[id];
    const change = c.usd_24h_change ? (c.usd_24h_change > 0 ? '+' : '') + c.usd_24h_change.toFixed(2) + '%' : '';
    const mcap = c.usd_market_cap ? ` | MCap: $${(c.usd_market_cap / 1e9).toFixed(2)}B` : '';
    const reply = `💰 **${id.charAt(0).toUpperCase() + id.slice(1)}**: $${c.usd.toLocaleString()} USD / $${c.cad?.toLocaleString() || '?'} CAD ${change ? `(${change} 24h)` : ''}${mcap}`;
    this._setCache(cacheKey, reply);
    return reply;
  }

  // ---- CAT/DOG PICTURES (no API key) ----
  async fetchAnimalPic(animal) {
    if (animal === 'cat') {
      const data = await this._safeFetch('https://api.thecatapi.com/v1/images/search');
      if (data?.[0]?.url) return { __type: 'embed', title: '🐱 Random cat for you', image: data[0].url };
    } else if (animal === 'dog') {
      const data = await this._safeFetch('https://dog.ceo/api/breeds/image/random');
      if (data?.message) return { __type: 'embed', title: '🐶 Random dog for you', image: data.message };
    }
    return null;
  }

  // ---- FILM/TV INFO (OMDb + TMDb) ----
  async fetchFilmInfo(title) {
    if (!title || title.length < 2) return null;
    const cacheKey = `film:${title.toLowerCase()}`;
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    const results = [];

    // Source 1: OMDb
    if (this.apiKeys.omdb) {
      const data = await this._safeFetch(
        `https://www.omdbapi.com/?t=${encodeURIComponent(title)}&apikey=${encodeURIComponent(this.apiKeys.omdb)}`
      );
      if (data?.Response === 'True') {
        results.push({
          source: 'IMDb',
          title: data.Title,
          year: data.Year,
          rated: data.Rated,
          genre: data.Genre,
          rating: data.imdbRating,
          plot: data.Plot,
          type: data.Type,
          seasons: data.totalSeasons,
          poster: data.Poster !== 'N/A' ? data.Poster : null,
        });
      }
    }

    // Source 2: TMDb
    if (this.apiKeys.tmdb) {
      const searchData = await this._safeFetch(
        `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(title)}&api_key=${encodeURIComponent(this.apiKeys.tmdb)}&page=1`
      );
      if (searchData?.results?.[0]) {
        const r = searchData.results[0];
        results.push({
          source: 'TMDb',
          title: r.title || r.name,
          year: (r.release_date || r.first_air_date || '').substring(0, 4),
          rating: r.vote_average?.toFixed(1),
          plot: r.overview,
          type: r.media_type,
          poster: r.poster_path ? `https://image.tmdb.org/t/p/w200${r.poster_path}` : null,
        });
      }
    }

    if (results.length === 0) return null;

    let reply;
    if (results.length === 2) {
      const a = results[0], b = results[1];
      const type = a.type === 'series' || b.type === 'tv' ? '📺' : '🎬';
      reply = `${type} **${a.title}** (${a.year}) — ${a.genre || b.type || ''}\n`;
      reply += `⭐ IMDb: ${a.rating}/10 | TMDb: ${b.rating}/10\n`;
      reply += `${(a.plot || b.plot || '').substring(0, 200)}`;
      if (a.seasons) reply += `\n📋 ${a.seasons} seasons`;
    } else {
      const m = results[0];
      const type = m.type === 'series' || m.type === 'tv' ? '📺' : '🎬';
      reply = `${type} **${m.title}** (${m.year}) — Rating: ${m.rating}/10\n${(m.plot || '').substring(0, 200)}`;
    }

    this._setCache(cacheKey, reply);
    return reply;
  }

  // ---- GAME INFO (RAWG.io) ----
  async fetchGameInfo(gameName) {
    if (!gameName || gameName.length < 2) return null;
    if (!this.apiKeys.rawg) return null;
    const cacheKey = `game:${gameName.toLowerCase()}`;
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    const data = await this._safeFetch(
      `https://api.rawg.io/api/games?search=${encodeURIComponent(gameName)}&key=${encodeURIComponent(this.apiKeys.rawg)}&page_size=1`
    );
    if (!data?.results?.[0]) return null;

    const g = data.results[0];
    const genres = g.genres?.map(x => x.name).join(', ') || '';
    const platforms = g.platforms?.map(x => x.platform?.name).slice(0, 4).join(', ') || '';
    const rating = g.rating ? `${g.rating}/5` : 'N/A';
    const metacritic = g.metacritic ? ` | Metacritic: ${g.metacritic}` : '';
    const released = g.released ? ` (${g.released.substring(0, 4)})` : '';

    let reply = `🎮 **${g.name}**${released} — ${genres}\n`;
    reply += `⭐ Rating: ${rating}${metacritic}\n`;
    reply += `🕹️ Platforms: ${platforms}`;

    this._setCache(cacheKey, reply);
    return reply;
  }

  // ---- JOKES & FACTS (no API key) ----
  async fetchJoke() {
    const sources = [
      { url: 'https://official-joke-api.appspot.com/random_joke', parse: d => d?.setup ? `${d.setup}\n${d.punchline}` : null },
      { url: 'https://v2.jokeapi.dev/joke/Any?blacklistFlags=nsfw,racist,sexist,explicit&type=twopart', parse: d => d?.setup ? `${d.setup}\n${d.delivery}` : null },
      { url: 'https://v2.jokeapi.dev/joke/Any?blacklistFlags=nsfw,racist,sexist,explicit&type=single', parse: d => d?.joke || null },
    ];
    // Shuffle and try until one works
    const shuffled = sources.sort(() => Math.random() - 0.5);
    for (const src of shuffled) {
      const data = await this._safeFetch(src.url);
      const joke = src.parse(data);
      if (joke) return `😂 ${joke}`;
    }
    return null;
  }

  async fetchFact() {
    const sources = [
      { url: 'https://uselessfacts.jsph.pl/api/v2/facts/random?language=en', parse: d => d?.text || null },
      { url: 'https://api.api-ninjas.com/v1/facts?limit=1', parse: d => Array.isArray(d) && d[0]?.fact ? d[0].fact : null, headers: { 'X-Api-Key': this.apiKeys.ninjaApi || '' } },
    ];
    // Try up to 3 times to get a quality fact (skip very short or nonsensical ones)
    for (let attempt = 0; attempt < 3; attempt++) {
      for (const src of sources) {
        const opts = src.headers ? { headers: src.headers } : {};
        const data = await this._safeFetch(src.url, opts);
        const fact = src.parse(data);
        if (!fact) continue;
        // Quality filters: skip very short facts, facts with no real info
        const wordCount = fact.split(/\s+/).length;
        if (wordCount < 6) continue; // too short to be interesting
        if (wordCount > 80) continue; // too long / wall of text
        if (/^(the|a|an) \w+\.?$/i.test(fact.trim())) continue; // just a sentence fragment
        if (/\b(error|undefined|null|NaN)\b/i.test(fact)) continue; // broken API response
        return `🧠 Fun fact: ${fact}`;
      }
    }
    // Curated fallback facts if APIs fail or return junk
    const fallbackFacts = [
      'Honey never spoils — archaeologists have found 3000-year-old honey in Egyptian tombs that was still edible!',
      'Octopuses have three hearts and blue blood.',
      'A group of flamingos is called a "flamboyance."',
      'Bananas are berries, but strawberries arent.',
      'The Eiffel Tower can grow by up to 6 inches in summer due to thermal expansion.',
      'Wombat poop is cube-shaped to prevent it from rolling away.',
      'A day on Venus is longer than a year on Venus.',
      'Sea otters hold hands while sleeping so they dont drift apart.',
      'The shortest war in history lasted 38 to 45 minutes between Britain and Zanzibar.',
      'Cows have best friends and get stressed when separated from them.',
      'The inventor of the Pringles can is buried in one.',
      'There are more possible iterations of a game of chess than atoms in the known universe.',
      'The unicorn is the national animal of Scotland.',
      'A jiffy is an actual unit of time — 1/100th of a second.',
      'Nintendo was founded in 1889 as a playing card company.',
    ];
    return `🧠 Fun fact: ${fallbackFacts[Math.floor(Math.random() * fallbackFacts.length)]}`;
  }

  // Detect if message is asking for info and return an answer
  async checkInfoQuery(content) {
    const lower = content.toLowerCase();

    // Must look like a question, info request, or API command
    const isQuestion = lower.includes('?') ||
      /\b(when|what|where|who|how|is there|are there|whats|what's|tell me|do you know|anyone know)\b/.test(lower) ||
      /^(is|are)\b/.test(lower);
    const isApiCommand = /\b(send|show|give|random|meme me|meme|joke me|pic|price|weather|news|headlines|fact|did you know|catch me up|what did i miss|recap|fill me in|leaderboard|top level|highest level|trivia|blow my mind|summary|tldr|update me|stream title|any news|latest news|more memes|another meme|another fact)/.test(lower);

    if (!isQuestion && !isApiCommand) return null;

    // Stream schedule
    if (/\b(when.*stream|stream.*when|next stream|schedule|streaming.*when|when.*live|going live)\b/.test(lower)) {
      if (this.knowledge.nextStream) return `Next stream: ${this.knowledge.nextStream}`;
      if (this.knowledge.streamSchedule) return `Stream schedule: ${this.knowledge.streamSchedule}`;
      return null;
    }

    // Stream title
    if (/\b(stream title|title.*stream|what.*stream.*about|what.*stream.*called|whats the title|stream name|stream topic|what are.*streaming|what.*streaming about|what.*the stream)\b/.test(lower)) {
      if (this.knowledge.streamTitle) {
        const game = this.knowledge.currentGame ? ` (playing ${this.knowledge.currentGame})` : '';
        return `Stream title: "${this.knowledge.streamTitle}"${game}`;
      }
      if (this.knowledge.isLive && this.knowledge.currentGame) {
        return `I dont have the exact title but theyre playing ${this.knowledge.currentGame} right now`;
      }
      return this.knowledge.isLive ? 'Stream is live but I dont have the title info rn' : 'Not live at the moment!';
    }

    // Currently live / what game
    if (/\b(is.*live|are.*live|live right now|streaming now|currently streaming|what.*playing|what.*game|current game|game.*today|game.*rn|game.*right now|game.*stream|stream.*on\b|are.*streaming|is.*streaming)\b/.test(lower)) {
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

    // Leveling / leaderboard queries — "who's the highest level", "top levels", "leaderboard"
    if (/\b(highest level|top level|most xp|leaderboard|who.*highest|who.*most.*xp|who.*top|level ranking|top ranked|level.*leader|xp.*leader|strongest.*member|most active|highest.*rank|who.*number one|who.*first|rank.*1|level check)/.test(lower)) {
      if (this.levelingData && typeof this.levelingData === 'object') {
        const entries = Object.entries(this.levelingData);
        if (entries.length > 0) {
          const sorted = entries
            .map(([id, data]) => ({ id, xp: data.xp || 0, level: data.level || 0 }))
            .sort((a, b) => b.xp - a.xp);
          const top5 = sorted.slice(0, 5);
          let reply = '🏆 **Top Levels:**\n';
          for (let i = 0; i < top5.length; i++) {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
            reply += `${medal} <@${top5[i].id}> — Level ${top5[i].level} (${top5[i].xp.toLocaleString()} XP)\n`;
          }
          if (sorted.length > 5) {
            reply += `\n_${sorted.length} total members ranked_`;
          }
          return reply;
        }
        return 'No one has earned XP yet! Start chatting to level up 💪';
      }
      return 'Leveling data isnt available right now, try again later';
    }

    // ======================== LIVE API QUERIES ========================

    // Weather — "weather in Montreal", "temperature in Paris", "what's the weather"
    const weatherMatch = lower.match(/(?:weather|temp(?:erature)?|m[eé]t[eé]o)\s*(?:in|at|for|à|de|au)\s+(.+?)(?:\?|$)/i)
      || lower.match(/(?:what(?:'s| is) (?:the )?(?:weather|temp(?:erature)?|forecast))\s*(?:in|at|for)?\s*(.+?)(?:\?|$)/i)
      || lower.match(/(?:how(?:'s| is) (?:the )?weather)\s*(?:in|at|for)?\s*(.+?)(?:\?|$)/i);
    if (weatherMatch) {
      const city = weatherMatch[1]?.trim();
      if (city && city.length >= 2) {
        const result = await this.fetchWeather(city);
        if (result) return result;
      }
    }

    // News — redirect to news channel instead of inline responses
    if (/\b(news|headlines|whats happening|what's happening|current events|dernières nouvelles|whats going on in the world|any news|latest news|breaking news|top stories|world news|give me news|show me news|today.?s news|news today|news update|updates)\b/.test(lower)) {
      if (this.config.newsChannelId) {
        return `Check out <#${this.config.newsChannelId}> for the latest news! We post updates there automatically 📰`;
      }
      return `News is posted in our news channel! Ask an admin to set one up with the dashboard 📰`;
    }

    // Reddit memes — broad triggers for meme requests
    if (/\b(send.*meme|random meme|meme me|show.*meme|give.*meme|got.*meme|meme please|want.*meme|need.*meme|drop.*meme|hit me with a meme|meme time|another meme|one more meme|more memes|best meme|dank meme|funny meme|meme of the day|meme pls|gimme.*meme|throw.*meme|post.*meme|any memes|spicy meme|fresh meme|new meme)\b/.test(lower) || /^meme$/i.test(lower.trim())) {
      const result = await this.fetchRedditMeme();
      if (result) return result;
      return '😅 Couldnt grab a meme right now, try again in a sec';
    }

    // Crypto — "bitcoin price", "how much is ETH", "crypto price BTC"
    const cryptoMatch = lower.match(/(?:price|value|worth|cours|combien).*?\b(btc|bitcoin|eth|ethereum|doge|dogecoin|sol|solana|ada|cardano|xrp|ripple|bnb|matic|polygon|avax|shib|link|ltc|litecoin|atom|uni|pepe|dot)\b/i)
      || lower.match(/\b(btc|bitcoin|eth|ethereum|doge|dogecoin|sol|solana|ada|cardano|xrp|ripple|bnb|matic|polygon|avax|shib|link|ltc|litecoin|atom|uni|pepe|dot)\b.*?(?:price|value|worth|how much|cours|combien)/i)
      || lower.match(/\bhow much is (?:a |one )?(btc|bitcoin|eth|ethereum|doge|dogecoin|sol|solana|ada|cardano|xrp|ripple|ltc|litecoin)\b/i);
    if (cryptoMatch) {
      const coin = cryptoMatch[1]?.trim();
      const result = await this.fetchCrypto(coin);
      if (result) return result;
    }

    // Cat/Dog pictures — "cat pic", "show me a dog", "cute cat"
    if (/\b(cat pic|pic.*cat|show.*cat|send.*cat|cute cat|random cat|chat mignon)\b/.test(lower)) {
      const result = await this.fetchAnimalPic('cat');
      if (result) return result;
    }
    if (/\b(dog pic|pic.*dog|show.*dog|send.*dog|cute dog|random dog|good boy|bonne boi)\b/.test(lower)) {
      const result = await this.fetchAnimalPic('dog');
      if (result) return result;
    }

    // Film/TV info — "rate movie X", "tell me about the show Y", "imdb Z"
    const filmMatch = lower.match(/(?:movie|film|show|serie|imdb|rating|review)\s*(?:about|for|of|called|named)?\s+(.{2,60})(?:\?|$)/i)
      || lower.match(/(?:what(?:'s| is))\s+(.{2,60})\s+(?:about|rated|on imdb)(?:\?|$)/i)
      || lower.match(/(?:rate|review|info(?:rmation)?\s*(?:on|about)?)\s+(.{2,60})(?:\?|$)/i);
    if (filmMatch && /\b(movie|film|show|serie|imdb|rate|review|rating|note|synopsis)\b/.test(lower)) {
      const title = filmMatch[1]?.replace(/\b(the movie|the show|the film|the serie[s]?)\b/gi, '').trim();
      if (title && title.length >= 2) {
        const result = await this.fetchFilmInfo(title);
        if (result) return result;
      }
    }

    // Game info — "tell me about game X", "info on game Y", "how is game X", "game X rating"
    const gameInfoMatch = lower.match(/(?:game info|info.*game|tell me about.*game|about the game|rawg|look up.*game)\s*(?:called|named|for|about|on)?\s*(.{2,60})(?:\?|$)/i)
      || lower.match(/(?:is|how is|how's)\s+(.{2,60})\s+(?:good|worth|fun|great|rated).*\b(?:game|play)\b/i)
      || lower.match(/(?:game|gaming)\s+(?:info|rating|review|score)\s+(?:for|on|about)?\s*(.{2,60})(?:\?|$)/i)
      || lower.match(/(?:rate|review|info)\s+(?:the )?game\s+(.{2,60})(?:\?|$)/i);
    if (gameInfoMatch && /\b(game info|info.*game|rawg|about.*game|tell.*game|worth.*play|is.*good.*game|game.*rating|game.*review|game.*score|rate.*game|review.*game|look up.*game)\b/.test(lower)) {
      const gameName = gameInfoMatch[1]?.replace(/\b(the game|a game|called|named)\b/gi, '').trim();
      if (gameName && gameName.length >= 2) {
        const result = await this.fetchGameInfo(gameName);
        if (result) return result;
      }
    }

    // Jokes — "tell me a joke", "joke me", "random joke"
    if (/\b(tell.*joke|joke me|random joke|got.*joke|give.*joke|drop.*joke|say.*joke|une blague|raconte.*blague|make me laugh|something funny)\b/.test(lower)) {
      const result = await this.fetchJoke();
      if (result) return result;
      return '😅 Joke APIs are being shy right now, try again in a bit';
    }

    // Fun facts — broader triggers
    if (/\b(random fact|fun fact|did you know|tell.*fact|interesting fact|fait amusant|le savais-tu|fact of the day|blow my mind|trivia|give.*fact|drop.*fact|fun facts|another fact|one more fact|mind blown|cool fact)\b/.test(lower) || /^fact$/i.test(lower.trim())) {
      const result = await this.fetchFact();
      if (result) return result;
    }

    // Conversation summary — "what did I miss?", "catch me up", "recap"
    if (/\b(what did i miss|what i miss|catch me up|recap|fill me in|what happened|what'd i miss|whats been going on|resume the convo|missed anything|summary|summarize|tldr|tl;dr|brief me|update me|what i missed|anything happen|anything interesting|gimme a recap|quick recap)\b/.test(lower)) {
      return this._generateCatchUpSummary(this._currentChannelId || null);
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

  // Generate a catch-up summary of recent conversations across channels
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
      ai: this.ai.getStats(),
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
      ai: this.ai.toJSON(),
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
    if (data.ai) {
      this.ai.loadFromJSON(data.ai);
    }
  }
}

export default SmartBot;
