class QuoteManager {
  constructor() {
    this.quotes = [];
    this.maxQuotes = 1000;
  }

  add(text, author, addedBy, options = {}) {
    if (!text || text.length < 3 || text.length > 500) return null;
    const quote = {
      id: this._nextId(),
      text: text.trim(),
      author: author?.trim() || 'Unknown',
      addedBy,
      createdAt: Date.now(),
      tags: options.tags || [],
      uses: 0,
    };
    this.quotes.push(quote);
    if (this.quotes.length > this.maxQuotes) this.quotes.shift();
    return quote;
  }

  remove(id) {
    const idx = this.quotes.findIndex(q => q.id === id);
    if (idx === -1) return false;
    this.quotes.splice(idx, 1);
    return true;
  }

  edit(id, updates) {
    const quote = this.quotes.find(q => q.id === id);
    if (!quote) return null;
    if (updates.text) quote.text = updates.text.trim();
    if (updates.author) quote.author = updates.author.trim();
    if (updates.tags) quote.tags = updates.tags;
    return quote;
  }

  getRandom(tag) {
    let pool = this.quotes;
    if (tag) pool = pool.filter(q => q.tags.includes(tag));
    if (pool.length === 0) return null;
    const quote = pool[Math.floor(Math.random() * pool.length)];
    quote.uses++;
    return quote;
  }

  search(query) {
    const lower = query.toLowerCase();
    return this.quotes.filter(q =>
      q.text.toLowerCase().includes(lower) ||
      q.author.toLowerCase().includes(lower) ||
      q.tags.some(t => t.toLowerCase().includes(lower))
    );
  }

  getAll() {
    return this.quotes;
  }

  getById(id) {
    return this.quotes.find(q => q.id === id) || null;
  }

  _nextId() {
    if (this.quotes.length === 0) return 1;
    return Math.max(...this.quotes.map(q => q.id)) + 1;
  }

  toJSON() {
    return this.quotes.slice(0, this.maxQuotes);
  }

  loadFromJSON(data) {
    if (!data || !Array.isArray(data)) return;
    this.quotes = data;
  }
}

export { QuoteManager };