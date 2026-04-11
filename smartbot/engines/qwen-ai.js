class QwenAI {
  constructor() {
    this.groqKey = '';
    this.hfKey = '';
    this.enabled = false;
    this.groqModel = 'qwen/qwen3-32b';
    this.hfModel = 'Qwen/Qwen3-32B';
    this.maxTokens = 250;
    this.temperature = 0.85;
    this.cache = new Map();
    this.CACHE_TTL = 3 * 60 * 1000;
    this.rateLimiter = { count: 0, resetAt: 0 };
    this.MAX_REQUESTS_PER_MIN = 25;
    this.stats = { groqCalls: 0, hfCalls: 0, cacheHits: 0, failures: 0, memoryHits: 0 };
    this.onRateLimitHit = null; // callback(remaining seconds)
    this._rateLimitNotified = false;

    // Persistent response memory — survives restarts via save/load
    // Map<normalizedQuestion, { replies: [{text, ts, uses}], lastUsedIndex }>
    this.responseMemory = new Map();
    this.MEMORY_MAX_ENTRIES = 5000;
    this.MEMORY_MAX_REPLIES = 5;  // keep up to 5 variations per question
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
    let base;
    if (extraContext?.persona) {
      base = extraContext.persona + '\n'
        + `Your name is ${botName || 'a Discord bot'}. `
        + `Never use asterisks for actions. Never say you're an AI or language model. `
        + `Stay in character at all times. Actually answer what the person said or asked. `
        + `IMPORTANT: Only reply with your response. Do not include any thinking, reasoning, or internal monologue. `
        + `NEVER start with "Ah," or "Oh," or "Heh,". No puns, no wordplay, no "which kind?" questions. Talk like a real person. `
        + `Do NOT stall — if asked to do something, just do it immediately. No "alright let me try" preambles. `
        + `Max 1 emoji per message. Do NOT end with labels like "mic drop" or "roast accepted".`;
    } else {
      base = `You are ${botName || 'a Discord bot'}, a chill chat bot in a Discord server. `
        + `You talk like a real person in chat — casual, short, no formal language. `
        + `Use lowercase mostly, abbreviations like "ngl", "tbh", "fr", "rn" naturally. `
        + `Never use asterisks for actions. Never say you're an AI or language model. `
        + `Keep replies under 2-3 sentences unless the question really needs more. `
        + `Match the vibe of whoever you're talking to. `
        + `If someone asks a factual question you don't know, admit it casually instead of making things up. `
        + `IMPORTANT: Actually answer what the person said or asked. Give useful, specific answers. `
        + `IMPORTANT: Only reply with your response. Do not include any thinking, reasoning, or internal monologue. `
        + `NEVER start answers with "Ah," or "Oh," or "Heh," or puns. Do NOT make wordplay or clever jokes about what someone said. `
        + `Do NOT give multiple options or ask "which kind?" questions. Just respond naturally like a real person would in a group chat. `
        + `Avoid sounding like a chatbot — no quirky observations, no forced wit, no structured responses. `
        + `Do NOT stall or hedge. If someone asks you to do something (like roast someone), just DO it immediately — no "alright let me try" or "okay here goes". `
        + `Do NOT use excessive emojis. Max 1 emoji per message, and only if it fits naturally. `
        + `Do NOT end messages with a label like "roast accepted" or "mic drop" — just say your piece and stop. `
        + `When roasting or joking, be actually funny and savage — think mean but hilarious, like how friends roast each other. No generic "you're ugly" stuff. Be creative and specific to what you know about the person from chat.`;
    }

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
      this._rateLimitNotified = false;
    }
    if (this.rateLimiter.count >= this.MAX_REQUESTS_PER_MIN) {
      if (!this._rateLimitNotified && typeof this.onRateLimitHit === 'function') {
        this._rateLimitNotified = true;
        const secsLeft = Math.ceil((this.rateLimiter.resetAt - now) / 1000);
        try { this.onRateLimitHit(secsLeft); } catch (_) {}
      }
      return false;
    }
    this.rateLimiter.count++;
    return true;
  }

  _cacheKey(content) {
    return content.toLowerCase().trim().replace(/\s+/g, ' ').substring(0, 100);
  }

  async generate(content, username, botName, personality, recentMessages, extraContext) {
    if (!this.enabled) return null;

    const cleanContent = content.replace(/<@!?\d+>/g, '').replace(/<#\d+>/g, '').trim();
    if (!cleanContent) return null;

    // Check persistent memory for similar questions
    const memKey = this._memoryKey(cleanContent);
    const memEntry = this._findMemoryMatch(memKey, cleanContent);
    if (memEntry && memEntry.replies.length > 0) {
      // We have a saved response — pick one we haven't used recently
      const pick = this._pickMemoryReply(memEntry);
      if (pick) {
        this.stats.memoryHits++;
        this.stats.cacheHits++;
        // Every 3rd hit on the same entry, request a variation from AI to grow the pool
        if (memEntry.totalUses % 3 === 0 && memEntry.replies.length < this.MEMORY_MAX_REPLIES) {
          this._generateVariation(cleanContent, username, botName, personality, recentMessages, extraContext, memEntry, memKey).catch(() => {});
        }
        return pick;
      }
    }

    // Short-term cache check
    const key = this._cacheKey(cleanContent);
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.ts < this.CACHE_TTL) {
      this.stats.cacheHits++;
      return cached.reply;
    }

    if (!this._checkRateLimit()) return null;

    const systemPrompt = this._buildSystemPrompt(botName, personality, recentMessages, extraContext);
    const userPrompt = `${username}: ${cleanContent}`;
    let reply = null;

    if (this.groqKey) reply = await this._callGroq(systemPrompt, userPrompt);
    if (!reply && this.hfKey) reply = await this._callHuggingFace(systemPrompt, userPrompt);

    if (reply) {
      reply = this._cleanReply(reply, botName);
      // Save to short-term cache
      this.cache.set(key, { reply, ts: Date.now() });
      if (this.cache.size > 200) {
        const now = Date.now();
        for (const [k, v] of this.cache) {
          if (now - v.ts > this.CACHE_TTL) this.cache.delete(k);
        }
      }
      // Save to persistent memory
      if (reply) this._saveToMemory(memKey, reply);
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
    // Strip <think>...</think> reasoning tags (closed or unclosed)
    reply = reply.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    reply = reply.replace(/<think>[\s\S]*/gi, '').trim();
    reply = reply.replace(/<\/think>/gi, '').trim();
    if (botName) {
      const namePattern = new RegExp(`^${botName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:\\s*`, 'i');
      reply = reply.replace(namePattern, '');
    }
    reply = reply.replace(/^(assistant|bot|ai)\s*:\s*/i, '');
    if ((reply.startsWith('"') && reply.endsWith('"')) || (reply.startsWith("'") && reply.endsWith("'"))) {
      reply = reply.slice(1, -1);
    }
    const maxLen = this._maxReplyLen || 500;
    if (reply.length > maxLen) {
      // Try to cut at a sentence boundary
      const truncated = reply.substring(0, maxLen);
      const sentenceEnd = truncated.search(/[.!?][^.!?]*$/);
      if (sentenceEnd > maxLen * 0.4) {
        reply = truncated.substring(0, sentenceEnd + 1);
      } else {
        const cutoff = truncated.lastIndexOf(' ');
        reply = truncated.substring(0, cutoff > 200 ? cutoff : maxLen);
      }
    }
    reply = reply.replace(/\*\*/g, '').replace(/\*/g, '').replace(/_{2,}/g, '');
    // Strip trailing incomplete sentence (no ending punctuation)
    reply = reply.trim();
    if (reply && !/[.!?…)"']$/.test(reply)) {
      const lastEnd = Math.max(reply.lastIndexOf('.'), reply.lastIndexOf('!'), reply.lastIndexOf('?'));
      if (lastEnd > reply.length * 0.3) {
        reply = reply.substring(0, lastEnd + 1);
      }
    }
    return reply.trim() || null;
  }

  // ─── Persistent Response Memory ───

  _memoryKey(text) {
    return text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim().substring(0, 120);
  }

  _findMemoryMatch(memKey, _rawText) {
    // Exact match first
    if (this.responseMemory.has(memKey)) return this.responseMemory.get(memKey);
    // Fuzzy: find entries with >=60% word overlap
    const inputWords = new Set(memKey.split(' ').filter(w => w.length > 2));
    if (inputWords.size < 2) return null;
    let bestMatch = null, bestScore = 0;
    for (const [key, entry] of this.responseMemory) {
      const keyWords = key.split(' ').filter(w => w.length > 2);
      if (keyWords.length < 2) continue;
      const overlap = keyWords.filter(w => inputWords.has(w)).length;
      const score = overlap / Math.max(keyWords.length, inputWords.size);
      if (score >= 0.6 && score > bestScore) {
        bestScore = score;
        bestMatch = entry;
      }
    }
    return bestMatch;
  }

  _pickMemoryReply(entry) {
    if (!entry.replies.length) return null;
    // Round-robin through available replies to avoid repeating
    entry.lastUsedIndex = ((entry.lastUsedIndex || 0) + 1) % entry.replies.length;
    const pick = entry.replies[entry.lastUsedIndex];
    pick.uses = (pick.uses || 0) + 1;
    entry.totalUses = (entry.totalUses || 0) + 1;
    return pick.text;
  }

  _saveToMemory(memKey, replyText) {
    let entry = this.responseMemory.get(memKey);
    if (!entry) {
      entry = { replies: [], lastUsedIndex: -1, totalUses: 0 };
      this.responseMemory.set(memKey, entry);
    }
    // Don't add duplicate replies
    const norm = replyText.toLowerCase().trim();
    if (entry.replies.some(r => r.text.toLowerCase().trim() === norm)) return;
    entry.replies.push({ text: replyText, ts: Date.now(), uses: 0 });
    // Cap at max replies
    if (entry.replies.length > this.MEMORY_MAX_REPLIES) {
      // Remove least-used reply
      entry.replies.sort((a, b) => (a.uses || 0) - (b.uses || 0));
      entry.replies.shift();
    }
    // Cap total entries
    if (this.responseMemory.size > this.MEMORY_MAX_ENTRIES) {
      // Remove oldest entry by total uses (least useful)
      let worstKey = null, worstUses = Infinity;
      for (const [k, e] of this.responseMemory) {
        if (k === memKey) continue;
        if ((e.totalUses || 0) < worstUses) { worstUses = e.totalUses || 0; worstKey = k; }
      }
      if (worstKey) this.responseMemory.delete(worstKey);
    }
  }

  async _generateVariation(cleanContent, username, botName, personality, recentMessages, extraContext, memEntry, memKey) {
    if (!this._checkRateLimit()) return;
    const existingReplies = memEntry.replies.map(r => r.text).join('\n- ');
    const systemPrompt = this._buildSystemPrompt(botName, personality, recentMessages, extraContext);
    const userPrompt = `${username}: ${cleanContent}\n\n[You've answered this before with:\n- ${existingReplies}\nGive a similar answer but word it differently. Keep the same meaning/vibe but change the phrasing.]`;
    let reply = null;
    if (this.groqKey) reply = await this._callGroq(systemPrompt, userPrompt);
    if (!reply && this.hfKey) reply = await this._callHuggingFace(systemPrompt, userPrompt);
    if (reply) {
      reply = this._cleanReply(reply, botName);
      if (reply) this._saveToMemory(memKey, reply);
    }
  }

  // ─── Memory Persistence ───

  memoryToJSON() {
    const arr = [];
    for (const [key, entry] of this.responseMemory) {
      arr.push({ key, replies: entry.replies, lastUsedIndex: entry.lastUsedIndex, totalUses: entry.totalUses });
    }
    return arr;
  }

  loadMemoryFromJSON(data) {
    if (!Array.isArray(data)) return;
    this.responseMemory.clear();
    for (const item of data) {
      if (!item.key || !Array.isArray(item.replies)) continue;
      this.responseMemory.set(item.key, {
        replies: item.replies.slice(0, this.MEMORY_MAX_REPLIES),
        lastUsedIndex: item.lastUsedIndex || -1,
        totalUses: item.totalUses || 0,
      });
    }
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