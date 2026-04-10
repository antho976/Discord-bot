import { TEMPLATES, FOCUSED_TEMPLATES } from '../data/templates.js';

function registerTemplatesRoutes(app, { smartBot, requireAuth, saveState }) {
  // Get all templates
  app.get('/api/smartbot/templates', requireAuth, (req, res) => {
    const broad = {};
    for (const [key, val] of Object.entries(TEMPLATES)) {
      broad[key] = Array.isArray(val) ? val : [];
    }
    const focused = {};
    for (const [q, a] of FOCUSED_TEMPLATES) {
      focused[q] = a;
    }
    res.json({ success: true, broad, focused });
  });

  // Get available topic keys
  app.get('/api/smartbot/templates/topics', requireAuth, (req, res) => {
    res.json({ success: true, topics: Object.keys(TEMPLATES) });
  });

  // === BROAD TEMPLATES ===

  // Add response(s) to a broad topic
  app.post('/api/smartbot/templates/broad', requireAuth, (req, res) => {
    const { topic, responses } = req.body;
    if (!topic || !responses || !Array.isArray(responses) || responses.length === 0) {
      return res.status(400).json({ success: false, error: 'topic and responses[] required' });
    }
    if (!(topic in TEMPLATES)) {
      return res.status(400).json({ success: false, error: `Unknown topic: ${topic}` });
    }
    const safe = responses.map(r => String(r).slice(0, 500).trim()).filter(Boolean);
    if (!safe.length) return res.status(400).json({ success: false, error: 'No valid responses' });

    if (!Array.isArray(TEMPLATES[topic])) TEMPLATES[topic] = [];
    TEMPLATES[topic].push(...safe);
    saveState();
    res.json({ success: true, topic, count: TEMPLATES[topic].length });
  });

  // Add a new custom broad topic
  app.post('/api/smartbot/templates/broad/topic', requireAuth, (req, res) => {
    const { topic } = req.body;
    if (!topic) return res.status(400).json({ success: false, error: 'topic required' });
    const key = String(topic).toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 40);
    if (!key) return res.status(400).json({ success: false, error: 'Invalid topic name' });
    if (key in TEMPLATES) return res.json({ success: true, exists: true, topic: key });
    TEMPLATES[key] = [];
    saveState();
    res.json({ success: true, topic: key });
  });

  // Delete a single response from a broad topic
  app.delete('/api/smartbot/templates/broad', requireAuth, (req, res) => {
    const { topic, index } = req.body;
    if (!topic || index === undefined) return res.status(400).json({ success: false, error: 'topic and index required' });
    if (!(topic in TEMPLATES) || !Array.isArray(TEMPLATES[topic])) {
      return res.status(400).json({ success: false, error: 'Topic not found' });
    }
    const i = parseInt(index, 10);
    if (isNaN(i) || i < 0 || i >= TEMPLATES[topic].length) {
      return res.status(400).json({ success: false, error: 'Invalid index' });
    }
    TEMPLATES[topic].splice(i, 1);
    saveState();
    res.json({ success: true, topic, count: TEMPLATES[topic].length });
  });

  // Clear all responses from a broad topic
  app.delete('/api/smartbot/templates/broad/clear', requireAuth, (req, res) => {
    const { topic } = req.body;
    if (!topic || !(topic in TEMPLATES)) return res.status(400).json({ success: false, error: 'Topic not found' });
    TEMPLATES[topic] = [];
    saveState();
    res.json({ success: true, topic });
  });

  // === FOCUSED TEMPLATES ===

  // Add a focused template (question + answers)
  app.post('/api/smartbot/templates/focused', requireAuth, (req, res) => {
    const { question, answers } = req.body;
    if (!question || !answers || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ success: false, error: 'question and answers[] required' });
    }
    const q = String(question).slice(0, 300).trim();
    if (!q) return res.status(400).json({ success: false, error: 'Invalid question' });
    const safe = answers.map(a => String(a).slice(0, 500).trim()).filter(Boolean);
    if (!safe.length) return res.status(400).json({ success: false, error: 'No valid answers' });

    if (FOCUSED_TEMPLATES.has(q)) {
      FOCUSED_TEMPLATES.get(q).push(...safe);
    } else {
      FOCUSED_TEMPLATES.set(q, safe);
    }
    saveState();
    res.json({ success: true, question: q, count: FOCUSED_TEMPLATES.get(q).length });
  });

  // Add answer to existing focused template
  app.post('/api/smartbot/templates/focused/answer', requireAuth, (req, res) => {
    const { question, answer } = req.body;
    if (!question || !answer) return res.status(400).json({ success: false, error: 'question and answer required' });
    const q = String(question).slice(0, 300).trim();
    if (!FOCUSED_TEMPLATES.has(q)) return res.status(400).json({ success: false, error: 'Question not found' });
    FOCUSED_TEMPLATES.get(q).push(String(answer).slice(0, 500).trim());
    saveState();
    res.json({ success: true, question: q, count: FOCUSED_TEMPLATES.get(q).length });
  });

  // Delete a focused template
  app.delete('/api/smartbot/templates/focused', requireAuth, (req, res) => {
    const { question } = req.body;
    if (!question) return res.status(400).json({ success: false, error: 'question required' });
    const deleted = FOCUSED_TEMPLATES.delete(question);
    saveState();
    res.json({ success: true, deleted });
  });

  // Delete a single answer from a focused template
  app.delete('/api/smartbot/templates/focused/answer', requireAuth, (req, res) => {
    const { question, index } = req.body;
    if (!question || index === undefined) return res.status(400).json({ success: false, error: 'question and index required' });
    if (!FOCUSED_TEMPLATES.has(question)) return res.status(400).json({ success: false, error: 'Question not found' });
    const answers = FOCUSED_TEMPLATES.get(question);
    const i = parseInt(index, 10);
    if (isNaN(i) || i < 0 || i >= answers.length) return res.status(400).json({ success: false, error: 'Invalid index' });
    answers.splice(i, 1);
    if (answers.length === 0) FOCUSED_TEMPLATES.delete(question);
    saveState();
    res.json({ success: true });
  });

  // === AI SUGGESTION ===

  app.post('/api/smartbot/templates/suggest', requireAuth, async (req, res) => {
    const { type, topic, question, count } = req.body;
    const ai = smartBot?.ai;
    if (!ai?.enabled) {
      return res.status(400).json({ success: false, error: 'AI not configured. Set a Groq or HuggingFace API key.' });
    }

    const num = Math.min(Math.max(parseInt(count, 10) || 5, 1), 10);
    let prompt;

    if (type === 'focused' && question) {
      const q = String(question).slice(0, 300).trim();
      prompt = `Generate exactly ${num} short Discord chat responses to the question: "${q}"\n\n`
        + `Rules:\n`
        + `- Each response is 1-2 sentences max, casual Discord style\n`
        + `- Use lowercase mostly, abbreviations like "ngl", "tbh", "fr" naturally\n`
        + `- No asterisks, no quotes around responses\n`
        + `- Each response on its own line, no numbering or bullet points\n`
        + `- Vary the tone: some chill, some hyped, some sarcastic\n`
        + `- Actually answer the question with useful/specific content`;
    } else if (type === 'broad' && topic) {
      const t = String(topic).slice(0, 40).trim();
      const existing = (TEMPLATES[t] || []).slice(0, 5).join(' | ');
      prompt = `Generate exactly ${num} short Discord chat responses for the topic "${t.replace(/_/g, ' ')}".\n\n`
        + (existing ? `Existing responses (don't repeat these): ${existing}\n\n` : '')
        + `Rules:\n`
        + `- Each response is 1-2 sentences max, casual Discord style\n`
        + `- Use lowercase mostly, abbreviations like "ngl", "tbh", "fr" naturally\n`
        + `- No asterisks, no quotes around responses\n`
        + `- Each response on its own line, no numbering or bullet points\n`
        + `- Include topic-related keywords so the bot can match them to conversations\n`
        + `- Vary the tone: some chill, some hyped, some sarcastic`;
    } else {
      return res.status(400).json({ success: false, error: 'Provide type ("broad"/"focused") with topic or question' });
    }

    try {
      const raw = await ai.generate(prompt, 'dashboard', smartBot.config.botName || 'SmartBot', 'adaptive', [], null);
      if (!raw) {
        return res.status(502).json({ success: false, error: 'AI did not return a response. Try again.' });
      }
      // Strip <think>...</think> reasoning tags if present
      const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      const suggestions = cleaned.split('\n')
        .map(l => l.replace(/^\d+[\.\)\-]\s*/, '').replace(/^[-•*]\s*/, '').trim())
        .filter(l => l.length >= 5 && l.length <= 500);
      res.json({ success: true, suggestions });
    } catch (err) {
      res.status(500).json({ success: false, error: 'AI request failed: ' + (err.message || 'unknown error') });
    }
  });
}

export { registerTemplatesRoutes };
