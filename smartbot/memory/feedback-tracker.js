// ===== FEEDBACK TRACKER =====
class FeedbackTracker {
  constructor() {
    this.templateScores = new Map();
    this.topicScores = new Map();
    this.recentChannelFeedback = new Map();
    this.pairFeedback = new Map();
    this.responseFeedback = new Map();
  }

  recordResponse(channelId, templateKey, topic) {
    if (!this.templateScores.has(templateKey)) this.templateScores.set(templateKey, { positive: 0, negative: 0, uses: 0 });
    this.templateScores.get(templateKey).uses++;
    if (this.templateScores.size > 2000) {
      const oldest = this.templateScores.keys().next().value;
      this.templateScores.delete(oldest);
    }
  }

  recordFeedback(templateKey, topic, isPositive, userWeight = 1) {
    const weight = Math.max(0.5, Math.min(userWeight, 3));
    if (this.templateScores.has(templateKey)) {
      const entry = this.templateScores.get(templateKey);
      if (isPositive) entry.positive += weight; else entry.negative += weight;
    }
    if (topic) {
      if (!this.topicScores.has(topic)) this.topicScores.set(topic, { positive: 0, negative: 0 });
      const ts = this.topicScores.get(topic);
      if (isPositive) ts.positive += weight; else ts.negative += weight;
    }
  }

  recordPairFeedback(pairKey, isPositive, userWeight = 1) {
    if (!this.pairFeedback.has(pairKey)) this.pairFeedback.set(pairKey, { positive: 0, negative: 0 });
    const entry = this.pairFeedback.get(pairKey);
    const weight = Math.max(0.5, Math.min(userWeight, 3));
    if (isPositive) entry.positive += weight; else entry.negative += weight;
    if (this.pairFeedback.size > 3000) {
      const oldest = this.pairFeedback.keys().next().value;
      this.pairFeedback.delete(oldest);
    }
  }

  getPairScore(pairKey) {
    const entry = this.pairFeedback.get(pairKey);
    if (!entry) return 0;
    const total = entry.positive + entry.negative;
    if (total < 2) return 0;
    return (entry.positive - entry.negative) / total;
  }

  recordResponseFeedback(responseHash, isPositive) {
    if (!this.responseFeedback.has(responseHash)) this.responseFeedback.set(responseHash, { positive: 0, negative: 0, uses: 0 });
    const entry = this.responseFeedback.get(responseHash);
    entry.uses++;
    if (isPositive) entry.positive++; else entry.negative++;
    if (this.responseFeedback.size > 5000) {
      const oldest = this.responseFeedback.keys().next().value;
      this.responseFeedback.delete(oldest);
    }
  }

  getResponseScore(responseHash) {
    const entry = this.responseFeedback.get(responseHash);
    if (!entry || entry.uses < 2) return 0;
    return (entry.positive - entry.negative) / (entry.positive + entry.negative);
  }

  recordChannelFeedback(channelId, isPositive) {
    if (!this.recentChannelFeedback.has(channelId)) this.recentChannelFeedback.set(channelId, []);
    const arr = this.recentChannelFeedback.get(channelId);
    arr.push({ isPositive, timestamp: Date.now() });
    if (arr.length > 20) arr.splice(0, arr.length - 20);
  }

  getRecentScore(channelId) {
    const arr = this.recentChannelFeedback.get(channelId);
    if (!arr || arr.length < 3) return null;
    const cutoff = Date.now() - 3600000;
    const recent = arr.filter(e => e.timestamp > cutoff);
    if (recent.length < 3) return null;
    return recent.filter(e => e.isPositive).length / recent.length;
  }

  getScore(templateKey) {
    const entry = this.templateScores.get(templateKey);
    if (!entry || entry.uses < 3) return 0;
    const total = entry.positive + entry.negative;
    if (total === 0) return 0;
    return (entry.positive - entry.negative) / total;
  }

  filterPool(pool, topic) {
    if (!pool || pool.length <= 3) return pool;
    const filtered = pool.filter(t => {
      const key = `${topic}:${t.substring(0, 40)}`;
      return this.getScore(key) >= -0.3;
    });
    return filtered.length === 0 ? pool : filtered;
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

// ===== SLANG TRACKER =====
class SlangTracker {
  constructor() {
    this.expressions = new Map();
    this.maxExpressions = 200;
  }

  record(message, userId) {
    const words = message.toLowerCase().split(/\s+/);
    if (words.length < 2 || words.length > 6) return;

    for (let len = 2; len <= Math.min(3, words.length); len++) {
      for (let i = 0; i <= words.length - len; i++) {
        const phrase = words.slice(i, i + len).join(' ');
        if (phrase.length < 4 || /^(i am|it is|do you|are you|in the|on the|of the)$/i.test(phrase)) continue;
        if (!this.expressions.has(phrase)) this.expressions.set(phrase, { count: 0, users: new Set(), lastUsed: Date.now() });
        const e = this.expressions.get(phrase);
        e.count++;
        e.users.add(userId);
        e.lastUsed = Date.now();
      }
    }

    if (this.expressions.size > this.maxExpressions * 2) {
      const sorted = [...this.expressions.entries()].sort(([,a],[,b]) => b.count - a.count);
      this.expressions = new Map(sorted.slice(0, this.maxExpressions));
    }
  }

  getPopular() {
    const popular = [];
    for (const [phrase, data] of this.expressions) {
      const userCount = data.users instanceof Set ? data.users.size : data.users;
      if (data.count >= 5 && userCount >= 3) popular.push({ phrase, count: data.count, users: userCount });
    }
    return popular.sort((a, b) => b.count - a.count).slice(0, 20);
  }

  toJSON() {
    const entries = {};
    for (const [k, v] of this.expressions) entries[k] = { count: v.count, users: v.users instanceof Set ? v.users.size : v.users, lastUsed: v.lastUsed };
    return entries;
  }

  loadFromJSON(data) {
    if (!data) return;
    for (const [k, v] of Object.entries(data)) this.expressions.set(k, { count: v.count, users: new Set(), lastUsed: v.lastUsed });
  }
}

// ===== LEARNING LOG =====
class LearningLog {
  constructor() {
    this.entries = [];
    this.maxEntries = 200;
  }

  log(type, details) {
    this.entries.push({ type, details, timestamp: Date.now() });
    if (this.entries.length > this.maxEntries) this.entries = this.entries.slice(-this.maxEntries);
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

export { FeedbackTracker, SlangTracker, LearningLog };