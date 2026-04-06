class UserPreferences {
  constructor() {
    this.users = new Map();
  }

  track(userId, content, extracted) {
    if (!this.users.has(userId)) {
      this.users.set(userId, { subjects: {}, topics: {}, lastSeen: Date.now() });
    }
    const prefs = this.users.get(userId);
    prefs.lastSeen = Date.now();

    if (extracted?.subjects) {
      for (const subj of extracted.subjects) {
        const key = subj.toLowerCase();
        prefs.subjects[key] = (prefs.subjects[key] || 0) + 1;
      }
    }

    if (this.users.size > 5000) {
      const oldest = this.users.keys().next().value;
      this.users.delete(oldest);
    }
  }

  get(userId) {
    return this.users.get(userId) || null;
  }

  getTopInterests(userId, count = 5) {
    const prefs = this.users.get(userId);
    if (!prefs || !prefs.subjects) return [];
    return Object.entries(prefs.subjects)
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(e => e[0]);
  }

  toJSON() {
    const obj = {};
    for (const [k, v] of this.users) obj[k] = v;
    return obj;
  }

  loadFromJSON(data) {
    if (!data) return;
    for (const [k, v] of Object.entries(data)) this.users.set(k, v);
  }
}

export { UserPreferences };