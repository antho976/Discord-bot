class ReplyHistory {
  constructor(maxPerChannel = 50) {
    this.history = new Map();
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
    if (arr.includes(normalized)) return true;
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

export { ReplyHistory };