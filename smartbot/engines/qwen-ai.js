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

  _buildSystemPrompt(botName, personality, channelContext, extraContext) {
    const base = `You are ${botName || 'a Discord bot'}, a chill chat bot in a Discord server. `
      + `You talk like a real person in chat — casual, short, no formal language. `
      + `Use lowercase mostly, abbreviations like "ngl", "tbh", "fr", "rn" naturally. `
      + `Never use asterisks for actions. Never say you're an AI or language model. `
      + `Keep replies under 2-3 sentences unless the question really needs more. `
      + `Match the vibe of whoever you're talking to. `
      + `If someone asks a factual question you don't know, admit it casually instead of making things up. `
      + `IMPORTANT: Actually answer what the person said or asked. Give useful, specific answers.`;

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

    if (extraContext) {
      if (extraContext.serverInfo) prompt += `\nServer context: ${extraContext.serverInfo.substring(0, 200)}`;
      if (extraContext.streamInfo) prompt += `\n${extraContext.streamInfo}`;
      if (extraContext.learnedTopics && extraContext.learnedTopics.length > 0) {
        prompt += `\nTopics the community talks about: ${extraContext.learnedTopics.join(', ')}`;
      }
      if (extraContext.userInterests) prompt += `\nThe person you're talking to is interested in: ${extraContext.userInterests}`;
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

  async generate(content, username, botName, personality, recentMessages, extraContext) {
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

    const systemPrompt = this._buildSystemPrompt(botName, personality, recentMessages, extraContext);
    const userPrompt = `${username}: ${cleanContent}`;
    let reply = null;

    if (this.groqKey) reply = await this._callGroq(systemPrompt, userPrompt);
    if (!reply && this.hfKey) reply = await this._callHuggingFace(systemPrompt, userPrompt);

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
        headers: { 'Authorization': `Bearer ${this.groqKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.groqModel,
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
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
        headers: { 'Authorization': `Bearer ${this.hfKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.hfModel,
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
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
    // Strip <think>...</think> reasoning tags from thinking models
    reply = reply.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
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

export { QwenAI };