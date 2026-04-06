class ConversationTracker {
  constructor(maxTurns = 8, ttlMs = 600000) {
    this.threads = new Map();
    this.maxTurns = maxTurns;
    this.ttlMs = ttlMs;
  }

  addUserMessage(channelId, userId, content, extracted) {
    const key = `${channelId}:${userId}`;
    if (!this.threads.has(key)) {
      this.threads.set(key, { turns: [], topic: null, lastActivity: Date.now(), subjects: [] });
    }
    const thread = this.threads.get(key);
    thread.turns.push({ role: 'user', content: content.substring(0, 300), timestamp: Date.now() });
    if (thread.turns.length > this.maxTurns) thread.turns.shift();
    thread.lastActivity = Date.now();
    if (extracted?.subjects?.[0]) {
      thread.topic = extracted.subjects[0];
      if (!thread.subjects.includes(extracted.subjects[0])) {
        thread.subjects.push(extracted.subjects[0]);
        if (thread.subjects.length > 5) thread.subjects.shift();
      }
    }
  }

  addBotReply(channelId, userId, reply) {
    const key = `${channelId}:${userId}`;
    const thread = this.threads.get(key);
    if (!thread) return;
    thread.turns.push({ role: 'bot', content: (typeof reply === 'string' ? reply : '').substring(0, 300), timestamp: Date.now() });
    if (thread.turns.length > this.maxTurns) thread.turns.shift();
    thread.lastActivity = Date.now();
  }

  getThread(channelId, userId) {
    const key = `${channelId}:${userId}`;
    const thread = this.threads.get(key);
    if (!thread) return null;
    if (Date.now() - thread.lastActivity > this.ttlMs) {
      this.threads.delete(key);
      return null;
    }
    return thread;
  }

  getLastBotReply(channelId, userId) {
    const thread = this.getThread(channelId, userId);
    if (!thread) return null;
    for (let i = thread.turns.length - 1; i >= 0; i--) {
      if (thread.turns[i].role === 'bot') return thread.turns[i].content;
    }
    return null;
  }

  getOngoingTopic(channelId, userId) {
    const thread = this.getThread(channelId, userId);
    return thread?.topic || null;
  }

  getRecentSubjects(channelId, userId) {
    const thread = this.getThread(channelId, userId);
    return thread?.subjects || [];
  }

  cleanup() {
    const now = Date.now();
    for (const [key, thread] of this.threads) {
      if (now - thread.lastActivity > this.ttlMs) this.threads.delete(key);
    }
  }
}

export { ConversationTracker };