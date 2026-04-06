import { tokenizeContent, basicStem, nGramSimilarity } from '../utils/text-utils.js';
class PairLearning {
  constructor(pairStore) {
    this.store = pairStore;
    this._regexPatterns = {
      question: /\?|^(what|how|why|when|where|who|which|is|are|do|does|should|would|could)\b/i,
      command: /^[!/.]/,
      greeting: /^(hey|hi|hello|yo|sup|whats? ?up)\b/i,
    };
  }

  extractCandidate(channelId, userId, content, recentMessages) {
    if (!recentMessages || recentMessages.length < 2) return null;
    if (content.length < 15 || content.length > 300) return null;

    const prevMsg = recentMessages[recentMessages.length - 2];
    if (!prevMsg || prevMsg.userId === userId) return null;
    if (!this._regexPatterns.question.test(prevMsg.content)) return null;

    const isAnswer = !this._regexPatterns.question.test(content)
      && !this._regexPatterns.command.test(content)
      && content.length >= 15
      && !this._regexPatterns.greeting.test(content);

    if (!isAnswer) return null;

    const candidate = {
      question: prevMsg.content.substring(0, 200),
      answer: content.substring(0, 300),
      questionUserId: prevMsg.userId,
      answerUserId: userId,
      channelId,
      timestamp: Date.now(),
    };

    if (!this.store._candidatePairs.has('qa')) this.store._candidatePairs.set('qa', []);
    const qaCandidates = this.store._candidatePairs.get('qa');
    qaCandidates.push(candidate);
    if (qaCandidates.length > 100) qaCandidates.splice(0, qaCandidates.length - 100);

    return candidate;
  }

  matchAutoQA(question) {
    const qaPairs = this.store._candidatePairs.get('qa');
    if (!qaPairs || qaPairs.length === 0) return null;

    const qStems = new Set(tokenizeContent(question).map(basicStem));
    if (qStems.size < 2) return null;

    let bestMatch = null, bestScore = 0;

    for (const pair of qaPairs) {
      const pairStems = new Set(tokenizeContent(pair.question).map(basicStem));
      let intersection = 0;
      for (const s of qStems) if (pairStems.has(s)) intersection++;
      const union = new Set([...qStems, ...pairStems]).size;
      const jaccard = union > 0 ? intersection / union : 0;
      const ngram = nGramSimilarity(question, pair.question);
      const score = jaccard * 0.6 + ngram * 0.4;

      if (score > bestScore && score >= 0.35 && intersection >= 2) {
        bestScore = score;
        bestMatch = pair;
      }
    }

    return bestMatch;
  }

  autoCorrect(userId, correction, details, userReputation) {
    const rep = userReputation?.get(userId);
    if (!rep || rep.accuracy < 0.7 || rep.total < 5) return false;

    const normKey = this.store.normalizeForMatch(details.botReply || details.topic || '');
    if (normKey.length < 3) return false;

    this.store.trainedPairs.set(normKey, {
      pattern: details.botReply || details.topic,
      response: correction,
      responses: [correction],
      score: 2,
      uses: 0,
      created: Date.now(),
      updatedAt: Date.now(),
      trainedBy: `auto-correction:${userId}`,
      channelId: details.channelId || 'auto',
      source: 'auto-correction',
      context: [],
      intent: null,
      feedbackScore: 0,
    });

    this.store.rebuildIndex();
    return true;
  }
}

export { PairLearning };