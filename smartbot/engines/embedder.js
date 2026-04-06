class SentenceEmbedder {
  constructor() {
    this.hfKey = '';
    this.model = 'sentence-transformers/all-MiniLM-L6-v2';
    this.enabled = false;
    this.cache = new Map();
    this.pairEmbeddings = new Map();
    this.contextEmbeddings = new Map();
    this.MAX_CACHE = 2000;
    this.BATCH_SIZE = 32;
    this.stats = { apiCalls: 0, cacheHits: 0, failures: 0 };
    this._ready = false;
    this._building = false;
    this._rateLimiter = { count: 0, resetAt: 0 };
    this.MAX_REQUESTS_PER_MIN = 25;
  }

  setKey(key) {
    this.hfKey = key;
    this.enabled = !!key;
  }

  _checkRateLimit() {
    const now = Date.now();
    if (now > this._rateLimiter.resetAt) {
      this._rateLimiter.count = 0;
      this._rateLimiter.resetAt = now + 60000;
    }
    if (this._rateLimiter.count >= this.MAX_REQUESTS_PER_MIN) return false;
    this._rateLimiter.count++;
    return true;
  }

  async embed(text) {
    if (!this.enabled) return null;
    const key = text.toLowerCase().trim().replace(/\s+/g, ' ').substring(0, 200);
    if (this.cache.has(key)) {
      this.stats.cacheHits++;
      return this.cache.get(key);
    }
    if (!this._checkRateLimit()) return null;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`https://api-inference.huggingface.co/pipeline/feature-extraction/${this.model}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.hfKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: key, options: { wait_for_model: true } }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) { this.stats.failures++; return null; }
      const data = await res.json();
      const embedding = this._extractEmbedding(data);
      if (!embedding) { this.stats.failures++; return null; }
      this.cache.set(key, embedding);
      this.stats.apiCalls++;
      if (this.cache.size > this.MAX_CACHE) this._pruneCache();
      return embedding;
    } catch {
      this.stats.failures++;
      return null;
    }
  }

  async embedBatch(texts) {
    if (!this.enabled || texts.length === 0) return [];
    const results = [];
    for (let i = 0; i < texts.length; i += this.BATCH_SIZE) {
      const batch = texts.slice(i, i + this.BATCH_SIZE).map(t => t.toLowerCase().trim().replace(/\s+/g, ' ').substring(0, 200));
      if (!this._checkRateLimit()) { results.push(...batch.map(() => null)); continue; }
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 30000);
        const res = await fetch(`https://api-inference.huggingface.co/pipeline/feature-extraction/${this.model}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.hfKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputs: batch, options: { wait_for_model: true } }),
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (!res.ok) { this.stats.failures++; results.push(...batch.map(() => null)); continue; }
        const data = await res.json();
        this.stats.apiCalls++;
        for (let j = 0; j < batch.length; j++) {
          const emb = this._extractBatchEmbedding(data, j);
          if (emb) this.cache.set(batch[j], emb);
          results.push(emb);
        }
      } catch {
        this.stats.failures++;
        results.push(...batch.map(() => null));
      }
    }
    return results;
  }

  _extractEmbedding(data) {
    if (!data) return null;
    if (typeof data[0] === 'number') return data;
    if (Array.isArray(data[0]) && typeof data[0][0] === 'number') return data[0];
    if (Array.isArray(data[0]) && Array.isArray(data[0][0])) return this._meanPool(data[0]);
    return null;
  }

  _extractBatchEmbedding(data, index) {
    if (!data || !data[index]) return null;
    const item = data[index];
    if (typeof item[0] === 'number') return item;
    if (Array.isArray(item[0]) && typeof item[0][0] === 'number') return this._meanPool(item);
    return null;
  }

  _meanPool(tokenEmbeddings) {
    if (!tokenEmbeddings || tokenEmbeddings.length === 0) return null;
    const dim = tokenEmbeddings[0].length;
    const avg = new Array(dim).fill(0);
    for (const token of tokenEmbeddings) {
      for (let i = 0; i < dim; i++) avg[i] += token[i];
    }
    for (let i = 0; i < dim; i++) avg[i] /= tokenEmbeddings.length;
    return avg;
  }

  async buildPairEmbeddings(trainedPairs) {
    if (!this.enabled || this._building) return;
    this._building = true;
    try {
      const keys = [...trainedPairs.keys()];
      const toEmbed = keys.filter(k => !this.pairEmbeddings.has(k));
      if (toEmbed.length === 0) { this._ready = this.pairEmbeddings.size > 0; return; }
      const embeddings = await this.embedBatch(toEmbed);
      for (let i = 0; i < toEmbed.length; i++) {
        if (embeddings[i]) this.pairEmbeddings.set(toEmbed[i], embeddings[i]);
      }
      this._ready = this.pairEmbeddings.size > 0;
    } finally {
      this._building = false;
    }
  }

  async embedNewPair(key) {
    if (!this.enabled) return;
    const emb = await this.embed(key);
    if (emb) this.pairEmbeddings.set(key, emb);
  }

  async updateChannelContext(channelId, text) {
    if (!this.enabled) return;
    const emb = await this.embed(text);
    if (!emb) return;
    if (!this.contextEmbeddings.has(channelId)) {
      this.contextEmbeddings.set(channelId, { vectors: [], avgVector: null });
    }
    const ctx = this.contextEmbeddings.get(channelId);
    ctx.vectors.push(emb);
    if (ctx.vectors.length > 10) ctx.vectors.shift();
    const dim = emb.length;
    const avg = new Array(dim).fill(0);
    for (const v of ctx.vectors) {
      for (let i = 0; i < dim; i++) avg[i] += v[i];
    }
    for (let i = 0; i < dim; i++) avg[i] /= ctx.vectors.length;
    ctx.avgVector = avg;
  }

  getChannelContext(channelId) {
    return this.contextEmbeddings.get(channelId)?.avgVector || null;
  }

  cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    if (magA === 0 || magB === 0) return 0;
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
  }

  _pruneCache() {
    let count = 0;
    const target = Math.floor(this.MAX_CACHE * 0.3);
    for (const k of this.cache.keys()) {
      if (count++ >= target) break;
      this.cache.delete(k);
    }
  }

  getStats() {
    return { ...this.stats, enabled: this.enabled, ready: this._ready, pairsCached: this.pairEmbeddings.size, contextChannels: this.contextEmbeddings.size };
  }

  toJSON() {
    return { stats: this.stats };
  }

  loadFromJSON(data) {
    if (!data) return;
    if (data.stats) this.stats = { ...this.stats, ...data.stats };
  }
}

export { SentenceEmbedder };