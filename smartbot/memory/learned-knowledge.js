class LearnedKnowledge {
  constructor() {
    this.subjects = new Map();
    this.pendingSubjects = new Map();
    this.learnThreshold = 3;
    this.maxSubjects = 500;
    this.maxPending = 1000;
  }

  recordMention(subject, userId, sentiment, context) {
    if (!subject || subject.length < 2 || subject.length > 60) return;
    const key = subject.toLowerCase().trim();

    if (this.subjects.has(key)) {
      const entry = this.subjects.get(key);
      entry.mentions++;
      entry.lastSeen = Date.now();
      if (sentiment && sentiment !== 'neutral') entry.sentiments[sentiment] = (entry.sentiments[sentiment] || 0) + 1;
      if (context && entry.opinions.length < 20) entry.opinions.push({ text: context, sentiment, timestamp: Date.now() });
      entry.users.add(userId);
      return;
    }

    if (!this.pendingSubjects.has(key)) {
      this.pendingSubjects.set(key, { count: 0, firstSeen: Date.now(), users: new Set(), sentiments: {}, contexts: [] });
    }
    const pending = this.pendingSubjects.get(key);
    pending.count++;
    pending.users.add(userId);
    if (sentiment && sentiment !== 'neutral') pending.sentiments[sentiment] = (pending.sentiments[sentiment] || 0) + 1;
    if (context && pending.contexts.length < 10) pending.contexts.push({ text: context, sentiment });

    if (pending.count >= this.learnThreshold && pending.users.size >= 2) this._promote(key, pending);
    if (this.pendingSubjects.size > this.maxPending) {
      const oldest = this.pendingSubjects.keys().next().value;
      this.pendingSubjects.delete(oldest);
    }
  }

  _promote(key, pending) {
    if (this.subjects.size >= this.maxSubjects) {
      let minKey = null, minMentions = Infinity;
      for (const [k, v] of this.subjects) {
        if (v.mentions < minMentions) { minMentions = v.mentions; minKey = k; }
      }
      if (minKey) this.subjects.delete(minKey);
    }
    this.subjects.set(key, {
      mentions: pending.count, sentiments: { ...pending.sentiments },
      opinions: pending.contexts.map(c => ({ text: c.text, sentiment: c.sentiment, timestamp: Date.now() })),
      firstSeen: pending.firstSeen, lastSeen: Date.now(), users: pending.users, type: 'learned',
    });
    this.pendingSubjects.delete(key);
  }

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
      ],
      negative: [
        `{subject} gets mixed reception around here ngl`,
        `Chat has some opinions about {subject} and theyre not all great`,
      ],
      neutral: [
        `People talk about {subject} sometimes, opinions are all over the place`,
        `{subject} comes up now and then, mixed feelings from chat`,
      ],
    };

    const pool = templates[dominantSentiment] || templates.neutral;
    let reply = pool[Math.floor(Math.random() * pool.length)].replace(/\{subject\}/g, subject);
    if (userCount >= 5) reply += ` (like ${userCount} people have mentioned it)`;
    return reply;
  }

  has(subject) {
    return this.subjects.has(subject.toLowerCase().trim());
  }

  getTopSubjects(n = 10) {
    return [...this.subjects.entries()]
      .sort((a, b) => b[1].mentions - a[1].mentions)
      .slice(0, n)
      .map(([key]) => key);
  }

  toJSON() {
    const subj = {};
    for (const [k, v] of this.subjects) subj[k] = { ...v, users: v.users instanceof Set ? v.users.size : v.users };
    const pending = {};
    for (const [k, v] of this.pendingSubjects) pending[k] = { ...v, users: v.users instanceof Set ? v.users.size : v.users };
    return { subjects: subj, pending };
  }

  loadFromJSON(data) {
    if (!data) return;
    if (data.subjects) {
      for (const [k, v] of Object.entries(data.subjects)) this.subjects.set(k, { ...v, users: new Set() });
    }
    if (data.pending) {
      for (const [k, v] of Object.entries(data.pending)) this.pendingSubjects.set(k, { ...v, users: new Set() });
    }
  }
}

export { LearnedKnowledge };