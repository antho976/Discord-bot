class PairMatcher {
  constructor(pairStore, embedder) {
    this.store = pairStore;
    this.embedder = embedder;
    this._currentChannelId = null;
  }

  setChannel(channelId) {
    this._currentChannelId = channelId;
  }

  find(content, inputTopics = null) {
    if (this.store.trainedPairs.size === 0) return null;
    const norm = this.store.normalizeForMatch(content);
    if (!norm || norm.length < 3) return null;

    // Exact match
    const exact = this.store.trainedPairs.get(norm);
    if (exact && exact.score > 0) return this._useMatch(exact);

    // Substring match
    for (const [key, pair] of this.store.trainedPairs) {
      if (pair.score <= 0 || key.length < 8) continue;
      if (norm.includes(key) || (norm.length >= 8 && key.includes(norm))) return this._useMatch(pair);
    }

    // Fuzzy match with embeddings
    return this._fuzzyMatch(norm, inputTopics);
  }

  findFallback(content) {
    if (this.store.trainedPairs.size === 0) return null;
    const norm = this.store.normalizeForMatch(content);
    if (!norm || norm.length < 3) return null;
    const stemmedInput = this.store.normalizeStemmed(norm);
    const inputWords = new Set(stemmedInput.split(' ').filter(w => w.length > 1));
    if (inputWords.size === 0) return null;

    const threshold = inputWords.size <= 3 ? 0.45 : inputWords.size <= 6 ? 0.38 : 0.30;
    const minOverlap = inputWords.size <= 3 ? 2 : 2;
    const inputBigrams = this.store.getBigrams(stemmedInput);

    const candidates = this._getCandidates(inputWords);
    let bestMatch = null, bestScore = 0;

    for (const key of candidates) {
      const pair = this.store.trainedPairs.get(key);
      if (!pair || pair.score <= 0) continue;
      const pairStemmed = pair._cachedStemmed || this.store.normalizeStemmed(key);
      const pairWords = new Set(pairStemmed.split(' ').filter(w => w.length > 1));
      if (pairWords.size === 0) continue;

      let intersection = 0;
      for (const w of inputWords) if (pairWords.has(w)) intersection++;
      const union = inputWords.size + pairWords.size - intersection;
      let score = union > 0 ? intersection / union : 0;

      if (inputBigrams.size > 0) {
        const pairBigrams = this.store.getBigrams(pairStemmed);
        let bigramOverlap = 0;
        for (const bg of inputBigrams) if (pairBigrams.has(bg)) bigramOverlap++;
        if (bigramOverlap > 0) score += bigramOverlap * 0.08;
      }

      if (pair.feedbackScore) {
        if (pair.feedbackScore > 0) score *= (1 + Math.min(pair.feedbackScore * 0.04, 0.15));
        else score *= Math.max(1 + pair.feedbackScore * 0.03, 0.75);
      }

      if (score >= threshold && intersection >= minOverlap && score > bestScore) {
        bestScore = score;
        bestMatch = pair;
      }
    }

    return bestMatch ? this._useMatch(bestMatch) : null;
  }

  _fuzzyMatch(norm, inputTopics) {
    const stemmedInput = this.store.normalizeStemmed(norm);
    const inputWords = new Set(stemmedInput.split(' ').filter(w => w.length > 1));
    if (inputWords.size === 0) return null;

    const inputBigrams = this.store.getBigrams(stemmedInput);
    const useEmbeddings = this.embedder?.isReady?.() && this.embedder.pairEmbeddings.size > 0;
    let inputEmbedding = null;
    if (useEmbeddings) {
      const cacheKey = norm.toLowerCase().trim().replace(/\s+/g, ' ').substring(0, 200);
      inputEmbedding = this.embedder.cache?.get(cacheKey) || null;
    }
    const channelContext = useEmbeddings ? this.embedder.getChannelContext(this._currentChannelId) : null;

    const candidates = this._getCandidates(inputWords);
    let bestMatch = null, bestScore = 0, bestLength = 0;

    for (const key of candidates) {
      const pair = this.store.trainedPairs.get(key);
      if (!pair || pair.score <= 0) continue;

      const pairStemmed = pair._cachedStemmed || this.store.normalizeStemmed(key);
      const pairWords = new Set(pairStemmed.split(' ').filter(w => w.length > 1));
      if (pairWords.size === 0) continue;

      let intersection = 0;
      for (const w of inputWords) if (pairWords.has(w)) intersection++;
      const union = inputWords.size + pairWords.size - intersection;
      let keywordScore = union > 0 ? intersection / union : 0;

      if (inputBigrams.size > 0) {
        const pairBigrams = this.store.getBigrams(pairStemmed);
        if (pairBigrams.size > 0) {
          let bigramOverlap = 0;
          for (const bg of inputBigrams) if (pairBigrams.has(bg)) bigramOverlap++;
          const bigramUnion = inputBigrams.size + pairBigrams.size - bigramOverlap;
          if (bigramUnion > 0) keywordScore = keywordScore * 0.7 + (bigramOverlap / bigramUnion) * 0.3;
        }
      }

      let score = keywordScore;
      if (inputEmbedding) {
        const pairEmb = this.embedder.pairEmbeddings.get(key);
        if (pairEmb) {
          const embScore = this.embedder.cosineSimilarity(inputEmbedding, pairEmb);
          score = embScore * 0.55 + keywordScore * 0.45;
          if (channelContext) {
            const contextSim = this.embedder.cosineSimilarity(pairEmb, channelContext);
            if (contextSim > 0.5) score *= 1.08;
          }
        }
      }

      if (pair.feedbackScore) {
        if (pair.feedbackScore > 0) score *= (1 + Math.min(pair.feedbackScore * 0.05, 0.2));
        else score *= Math.max(1 + pair.feedbackScore * 0.03, 0.7);
      }

      const pairAge = (Date.now() - (pair.updatedAt || pair.created || Date.now())) / 86400000;
      if (pairAge > 30) score *= 0.85;
      else if (pairAge > 14) score *= 0.95;

      if (pair.intent) {
        const inputIntent = this.store.detectPairIntent(norm);
        if (inputIntent && inputIntent === pair.intent) score *= 1.15;
      }

      if (pair.context?.length > 0 && inputTopics) {
        const inputTopicNames = inputTopics.map(t => t[0]);
        const contextOverlap = pair.context.filter(c => inputTopicNames.includes(c));
        if (contextOverlap.length > 0) score *= 1.12;
        else if (inputTopicNames.length > 0) score *= 0.95;
      }

      const threshold = inputEmbedding ? 0.45 : 0.55;
      const minIntersection = inputEmbedding ? 1 : Math.max(2, Math.min(Math.ceil(inputWords.size * 0.3), 4));
      if (score >= threshold && intersection >= minIntersection && (score > bestScore || (score === bestScore && key.length > bestLength))) {
        bestScore = score;
        bestMatch = pair;
        bestLength = key.length;
      }
    }

    return bestMatch ? this._useMatch(bestMatch) : null;
  }

  _getCandidates(inputWords) {
    const candidates = new Set();
    for (const word of inputWords) {
      const keys = this.store._pairIndex.get(word);
      if (keys) for (const k of keys) candidates.add(k);
    }
    return candidates.size > 0 ? [...candidates] : [...this.store.trainedPairs.keys()];
  }

  _useMatch(pair) {
    pair.lastUsed = Date.now();
    pair.uses = (pair.uses || 0) + 1;
    if (pair.responses && pair.responses.length > 1) {
      const idx = Math.floor(Math.random() * pair.responses.length);
      pair._lastResponseIdx = idx;
      pair.response = pair.responses[idx];
    }
    return pair;
  }
}

export { PairMatcher };