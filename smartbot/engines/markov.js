const _SLANG_WORDS = ['bruh','ngl','fr','tbh','lowkey','highkey','ong','bussin','deadass','goated','cap','mid','fire','based','ratio','slay','vibe','yall','gonna','wanna','gotta','aint'];
const _RE_SLANG = /\b(lmao|lol|omg|wtf|smh|imo)\b/;

class MarkovChain {
  constructor() {
    this.chain = new Map();
    this.trichain = new Map();
    this.starters = [];
    this.totalTrained = 0;
    this.maxChainSize = 50000;
    this.topicChains = new Map();
    this.styleChains = new Map();
  }

  _classifyStyle(text) {
    const lower = text.toLowerCase();
    let slangCount = 0;
    for (const w of _SLANG_WORDS) if (lower.includes(w)) slangCount++;
    if (slangCount >= 2 || _RE_SLANG.test(lower)) return 'slang';
    if (/[.!?]\s*[A-Z]/.test(text) && text.length > 60 && !/\b(lol|lmao|bruh)\b/i.test(text)) return 'formal';
    return 'casual';
  }

  train(text, topic = null) {
    if (!text || text.length < 5) return;
    if (/^[!\/]/.test(text)) return;
    if (/^https?:\/\//.test(text)) return;
    if (/(.)\1{5,}/.test(text)) return;

    const cleaned = text
      .replace(/<a?:\w+:\d+>/g, '')
      .replace(/<@!?\d+>/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .trim();

    if (cleaned.length < 8) return;
    const words = cleaned.split(/\s+/).filter(w => w.length > 0);
    if (words.length < 4) return;

    if (this.chain.size > this.maxChainSize) {
      let count = 0;
      for (const key of this.chain.keys()) { if (count++ >= 5000) break; this.chain.delete(key); }
    }
    if (this.trichain.size > this.maxChainSize) {
      let count = 0;
      for (const key of this.trichain.keys()) { if (count++ >= 5000) break; this.trichain.delete(key); }
    }

    this.starters.push(`${words[0]} ${words[1]}`);
    if (this.starters.length > 2000) this.starters = this.starters.slice(-1000);

    for (let i = 0; i < words.length - 2; i++) {
      const key = `${words[i]} ${words[i + 1]}`;
      if (!this.chain.has(key)) this.chain.set(key, []);
      this.chain.get(key).push(words[i + 2]);
    }

    for (let i = 0; i < words.length - 3; i++) {
      const key = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
      if (!this.trichain.has(key)) this.trichain.set(key, []);
      this.trichain.get(key).push(words[i + 3]);
    }

    if (topic && typeof topic === 'string') {
      if (!this.topicChains.has(topic)) this.topicChains.set(topic, new Map());
      const tc = this.topicChains.get(topic);
      for (let i = 0; i < words.length - 2; i++) {
        const key = `${words[i]} ${words[i + 1]}`;
        if (!tc.has(key)) tc.set(key, []);
        tc.get(key).push(words[i + 2]);
      }
      if (tc.size > 10000) {
        let count = 0;
        for (const key of tc.keys()) { if (count++ >= 2000) break; tc.delete(key); }
      }
      if (this.topicChains.size > 30) {
        const oldest = this.topicChains.keys().next().value;
        this.topicChains.delete(oldest);
      }
    }

    this.totalTrained++;

    const style = this._classifyStyle(text);
    if (!this.styleChains.has(style)) this.styleChains.set(style, new Map());
    const sc = this.styleChains.get(style);
    for (let i = 0; i < words.length - 2; i++) {
      const key = `${words[i]} ${words[i + 1]}`;
      if (!sc.has(key)) sc.set(key, []);
      sc.get(key).push(words[i + 2]);
    }
    if (sc.size > 15000) {
      let count = 0;
      for (const key of sc.keys()) { if (count++ >= 3000) break; sc.delete(key); }
    }
  }

  trainWeighted(text, topic, weight = 2) {
    for (let i = 0; i < weight; i++) this.train(text, topic);
  }

  generate(maxWords = 20, seedWords = null, topic = null, style = null) {
    if (this.chain.size < 10) return null;

    let current = null;
    const useTopicChain = topic && this.topicChains.has(topic) && this.topicChains.get(topic).size > 20;
    const useStyleChain = style && this.styleChains.has(style) && this.styleChains.get(style).size > 20;
    const activeChain = useTopicChain ? this.topicChains.get(topic)
      : useStyleChain ? this.styleChains.get(style)
        : this.chain;

    if (seedWords && seedWords.length > 0) {
      for (const seed of seedWords) {
        const lower = seed.toLowerCase();
        const matching = [];
        for (const k of activeChain.keys()) {
          if (k.toLowerCase().includes(lower)) matching.push(k);
          if (matching.length >= 20) break;
        }
        if (matching.length > 0) {
          current = matching[Math.floor(Math.random() * matching.length)];
          break;
        }
      }
    }

    if (!current) {
      if (this.starters.length === 0) return null;
      current = this.starters[Math.floor(Math.random() * this.starters.length)];
    }
    if (!current || !current.trim()) return null;

    const result = current.split(' ');

    for (let i = 0; i < maxWords; i++) {
      let word = null;
      if (result.length >= 3) {
        const trikey = `${result[result.length - 3]} ${result[result.length - 2]} ${result[result.length - 1]}`;
        const triNext = this.trichain.get(trikey);
        if (triNext && triNext.length > 0) word = triNext[Math.floor(Math.random() * triNext.length)];
      }
      if (!word) {
        const bikey = `${result[result.length - 2]} ${result[result.length - 1]}`;
        const biNext = activeChain.get(bikey);
        if (!biNext || biNext.length === 0) break;
        word = biNext[Math.floor(Math.random() * biNext.length)];
      }
      result.push(word);
      current = `${result[result.length - 2]} ${word}`;
    }

    let text = result.join(' ').trim();
    if (text.length > 0) text = text[0].toUpperCase() + text.slice(1);
    return text.length > 3 ? text : null;
  }

  getStats() {
    return { chainSize: this.chain.size, starterCount: this.starters.length, totalTrained: this.totalTrained };
  }

  toJSON() {
    const entries = [...this.chain.entries()].slice(-20000);
    const triEntries = [...this.trichain.entries()].slice(-10000);
    const topicChainsJSON = {};
    for (const [topic, tc] of this.topicChains) topicChainsJSON[topic] = [...tc.entries()].slice(-6000);
    const styleChainsJSON = {};
    for (const [style, sc] of this.styleChains) styleChainsJSON[style] = [...sc.entries()].slice(-5000);
    return { chain: entries, trichain: triEntries, topicChains: topicChainsJSON, styleChains: styleChainsJSON, starters: this.starters.slice(-1000), totalTrained: this.totalTrained };
  }

  loadFromJSON(data) {
    if (!data) return;
    if (data.chain) this.chain = new Map(data.chain);
    if (data.trichain) this.trichain = new Map(data.trichain);
    if (data.topicChains) {
      for (const [topic, entries] of Object.entries(data.topicChains)) this.topicChains.set(topic, new Map(entries));
    }
    if (data.starters) this.starters = data.starters.slice(-1000);
    if (data.totalTrained) this.totalTrained = data.totalTrained;
    if (data.styleChains) {
      for (const [style, entries] of Object.entries(data.styleChains)) this.styleChains.set(style, new Map(entries));
    }
  }
}

export { MarkovChain };