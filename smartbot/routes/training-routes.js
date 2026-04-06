import { detectTopics } from '../data/topics.js';
import { writeFile } from 'fs/promises';
function registerTrainingRoutes(app, { smartBot, requireAuth, saveState, debouncedSaveState }) {
  // Normalize text for pair matching — must match PairStore.normalizeForMatch
  function _normPair(text) {
    return smartBot.pairStore.normalizeForMatch(String(text));
  }

  function _detectPairContext(text) {
    const topics = detectTopics(text);
    if (!topics || topics.length === 0) return [];
    return topics.slice(0, 3).map(t => t[0]);
  }

  // ---- Pairs CRUD ----

  // Add new pair with multiple answer variations
  app.post('/api/smartbot/training/pairs', requireAuth, (req, res) => {
    const { question, answers, answer } = req.body;
    if (!question) return res.status(400).json({ success: false, error: 'question required' });
    const answerList = answers || (answer ? [answer] : []);
    if (!answerList.length) return res.status(400).json({ success: false, error: 'at least one answer required' });

    const normKey = _normPair(question);
    if (normKey.length < 3) return res.status(400).json({ success: false, error: 'question too short' });

    const safeQ = String(question).slice(0, 300);
    const safeAnswers = answerList.map(a => String(a).slice(0, 500)).filter(a => a.length >= 1);
    const pairCtx = _detectPairContext(safeQ);

    const existing = smartBot.pairStore.trainedPairs.get(normKey);
    if (existing) {
      if (!existing.responses) existing.responses = [existing.response];
      for (const a of safeAnswers) {
        if (!existing.responses.includes(a)) existing.responses.push(a);
      }
      if (existing.responses.length > 20) existing.responses = existing.responses.slice(-20);
      existing.response = existing.responses[0];
      existing.updatedAt = Date.now();
    } else {
      smartBot.pairStore.add(normKey, {
        pattern: safeQ, response: safeAnswers[0],
        responses: safeAnswers, score: 2, uses: 0,
        created: Date.now(), updatedAt: Date.now(),
        trainedBy: req.userName || 'dashboard', source: 'manual',
        context: pairCtx,
      });
    }

    smartBot.pairStore.rebuildIndex();
    if (smartBot.embedder?.enabled) smartBot.embedder.embedNewPair(normKey, safeQ).catch(() => {});
    debouncedSaveState();
    res.json({ success: true, pairsCount: smartBot.pairStore.trainedPairs.size });
  });

  // List pairs with search
  app.get('/api/smartbot/training/pairs', requireAuth, (req, res) => {
    const search = (req.query.search || '').toLowerCase().trim();
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const pairs = [];
    for (const [key, val] of smartBot.pairStore.trainedPairs) {
      if (search && !key.includes(search) && !(val.pattern || '').toLowerCase().includes(search) && !(val.response || '').toLowerCase().includes(search)) continue;
      pairs.push({ key, ...val });
    }
    pairs.sort((a, b) => (b.score || 0) - (a.score || 0));
    res.json({ success: true, pairs: pairs.slice(0, limit), total: pairs.length });
  });

  // Delete pair
  app.delete('/api/smartbot/training/pairs', requireAuth, (req, res) => {
    const { key } = req.body;
    if (!key) return res.status(400).json({ success: false, error: 'key required' });
    smartBot.pairStore.remove(key);
    smartBot.pairStore.rebuildIndex();
    debouncedSaveState();
    res.json({ success: true, pairsCount: smartBot.pairStore.trainedPairs.size });
  });

  // Add variation to existing pair
  app.post('/api/smartbot/training/pairs/variation', requireAuth, (req, res) => {
    const { key, answer } = req.body;
    if (!key || !answer) return res.status(400).json({ success: false, error: 'key and answer required' });
    const safeAnswer = String(answer).slice(0, 500);
    const pair = smartBot.pairStore.trainedPairs.get(key);
    if (!pair) return res.status(404).json({ success: false, error: 'pair not found' });
    smartBot.pairStore.addVariation(key, safeAnswer);
    debouncedSaveState();
    res.json({ success: true, responses: pair.responses || [pair.response] });
  });

  // Remove variation from existing pair
  app.delete('/api/smartbot/training/pairs/variation', requireAuth, (req, res) => {
    const { key, index } = req.body;
    if (!key || index === undefined) return res.status(400).json({ success: false, error: 'key and index required' });
    const pair = smartBot.pairStore.trainedPairs.get(key);
    if (!pair) return res.status(404).json({ success: false, error: 'pair not found' });
    if (!pair.responses || pair.responses.length <= 1) return res.status(400).json({ success: false, error: 'cannot remove last variation' });
    const idx = parseInt(index, 10);
    if (idx < 0 || idx >= pair.responses.length) return res.status(400).json({ success: false, error: 'invalid index' });
    pair.responses.splice(idx, 1);
    pair.response = pair.responses[0];
    pair.updatedAt = Date.now();
    debouncedSaveState();
    res.json({ success: true, responses: pair.responses });
  });

  // Edit pair response
  app.post('/api/smartbot/training/pairs/edit', requireAuth, (req, res) => {
    const { key, response } = req.body;
    if (!key || !response) return res.status(400).json({ success: false, error: 'key and response required' });
    const pair = smartBot.pairStore.trainedPairs.get(key);
    if (!pair) return res.status(404).json({ success: false, error: 'pair not found' });
    pair.response = String(response).slice(0, 500);
    smartBot.pairStore.rebuildIndex();
    debouncedSaveState();
    res.json({ success: true });
  });

  // Training stats
  app.get('/api/smartbot/training/stats', requireAuth, (req, res) => {
    const stats = smartBot._trainingStats;
    res.json({
      success: true,
      stats: { totalSessions: stats.totalSessions, approved: stats.approved, rejected: stats.rejected },
      pairsCount: smartBot.pairStore.trainedPairs.size,
      log: (stats.log || []).slice(-50).reverse()
    });
  });

  // ---- Conversation Review ----

  app.get('/api/smartbot/training/conversations', requireAuth, (req, res) => {
    const log = (smartBot._conversationLog || []).filter(e => !e.reviewed);
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = parseInt(req.query.offset) || 0;
    const items = log.slice().reverse().slice(offset, offset + limit);
    res.json({ success: true, conversations: items, total: log.length });
  });

  app.post('/api/smartbot/training/conversations/approve', requireAuth, (req, res) => {
    const { index, timestamp, correction } = req.body;
    const log = (smartBot._conversationLog || []).filter(e => !e.reviewed);
    const items = log.slice().reverse();
    const entry = timestamp ? items.find(e => e.timestamp === timestamp) : items[index];
    if (!entry) return res.status(404).json({ success: false, error: 'not found' });

    const normKey = _normPair(entry.userMessage);
    const responseText = (correction && correction.trim().length >= 3) ? correction.trim() : entry.botReply;
    if (normKey.length >= 3) {
      const existing = smartBot.pairStore.trainedPairs.get(normKey);
      if (existing) {
        if (!existing.responses) existing.responses = [existing.response];
        if (!existing.responses.includes(responseText)) existing.responses.push(responseText);
        existing.score = Math.min((existing.score || 1) + 0.3, 10);
      } else {
        smartBot.pairStore.add(normKey, {
          pattern: entry.userMessage, response: responseText, responses: [responseText],
          score: correction ? 2 : 1, uses: 0, created: Date.now(),
          source: 'conversation_review', context: _detectPairContext(entry.userMessage),
        });
      }
      smartBot.pairStore.rebuildIndex();
      smartBot.markov.trainWeighted(responseText, entry.topic, correction ? 3 : 2);
    }
    entry.reviewed = true;
    entry.approved = true;
    smartBot._trainingStats.totalSessions++;
    smartBot._trainingStats.approved++;
    debouncedSaveState();
    res.json({ success: true, pairsCount: smartBot.pairStore.trainedPairs.size });
  });

  app.post('/api/smartbot/training/conversations/reject', requireAuth, (req, res) => {
    const { index, timestamp } = req.body;
    const log = (smartBot._conversationLog || []).filter(e => !e.reviewed);
    const items = log.slice().reverse();
    const entry = timestamp ? items.find(e => e.timestamp === timestamp) : items[index];
    if (!entry) return res.status(404).json({ success: false, error: 'not found' });
    entry.reviewed = true;
    entry.approved = false;
    smartBot._trainingStats.totalSessions++;
    smartBot._trainingStats.rejected++;
    debouncedSaveState();
    res.json({ success: true });
  });

  app.post('/api/smartbot/training/conversations/bulk', requireAuth, (req, res) => {
    const { action } = req.body;
    const log = (smartBot._conversationLog || []).filter(e => !e.reviewed);
    let count = 0;
    for (const entry of log) {
      if (action === 'approve') {
        const normKey = _normPair(entry.userMessage);
        if (normKey.length >= 3) {
          const existing = smartBot.pairStore.trainedPairs.get(normKey);
          if (existing) {
            if (!existing.responses) existing.responses = [existing.response];
            if (!existing.responses.includes(entry.botReply)) existing.responses.push(entry.botReply);
            existing.score = Math.min((existing.score || 1) + 0.3, 10);
          } else {
            smartBot.pairStore.add(normKey, {
              pattern: entry.userMessage, response: entry.botReply, responses: [entry.botReply],
              score: 1, uses: 0, created: Date.now(), source: 'conversation_review',
            });
          }
          smartBot.markov.trainWeighted(entry.botReply, entry.topic, 2);
        }
        entry.reviewed = true; entry.approved = true; count++;
      } else {
        entry.reviewed = true; entry.approved = false; count++;
      }
    }
    if (action === 'approve') smartBot.pairStore.rebuildIndex();
    debouncedSaveState();
    res.json({ success: true, count, pairsCount: smartBot.pairStore.trainedPairs.size });
  });

  // ---- Candidate Pairs ----

  app.get('/api/smartbot/training/candidates', requireAuth, (req, res) => {
    const candidates = smartBot.pairLearning.getCandidates ? smartBot.pairLearning.getCandidates() : [];
    res.json({ success: true, candidates: candidates.slice(-50) });
  });

  app.post('/api/smartbot/training/candidates/approve', requireAuth, (req, res) => {
    const { index } = req.body;
    const candidates = smartBot.pairLearning.getCandidates ? smartBot.pairLearning.getCandidates() : [];
    if (index === undefined || !candidates[index]) return res.status(404).json({ success: false, error: 'not found' });
    const c = candidates[index];
    const normKey = _normPair(c.question);
    if (normKey.length >= 3) {
      smartBot.pairStore.add(normKey, {
        pattern: c.question, response: c.answer, responses: [c.answer],
        score: 1, uses: 0, created: Date.now(), source: 'qa_candidate',
      });
      smartBot.pairStore.rebuildIndex();
    }
    candidates.splice(index, 1);
    debouncedSaveState();
    res.json({ success: true, pairsCount: smartBot.pairStore.trainedPairs.size });
  });

  app.post('/api/smartbot/training/candidates/reject', requireAuth, (req, res) => {
    const { index } = req.body;
    const candidates = smartBot.pairLearning.getCandidates ? smartBot.pairLearning.getCandidates() : [];
    if (index === undefined || !candidates[index]) return res.status(404).json({ success: false, error: 'not found' });
    candidates.splice(index, 1);
    res.json({ success: true });
  });

  // Import chat history into Markov
  app.post('/api/smartbot/training/import', requireAuth, (req, res) => {
    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) return res.status(400).json({ success: false, error: 'messages array required' });
    let imported = 0;
    for (const msg of messages.slice(0, 5000)) {
      const text = String(msg).trim();
      if (text.length < 5 || text.length > 500) continue;
      if (text.startsWith('!') || text.startsWith('/') || /^https?:\/\/\S+$/.test(text)) continue;
      smartBot.markov.train(text);
      imported++;
    }
    debouncedSaveState();
    res.json({ success: true, imported });
  });

  // Backup pairs
  app.post('/api/smartbot/training/backup', requireAuth, async (req, res) => {
    try {
      // (moved to top-level import)
      const pairsObj = Object.fromEntries(smartBot.pairStore.trainedPairs);
      const backupPath = './data/trained-pairs-backup.json';
      await writeFile(backupPath, JSON.stringify({ timestamp: Date.now(), count: smartBot.pairStore.trainedPairs.size, pairs: pairsObj }, null, 2));
      res.json({ success: true, count: smartBot.pairStore.trainedPairs.size, path: backupPath });
    } catch (e) { res.json({ success: false, error: e.message }); }
  });
}

export { registerTrainingRoutes };