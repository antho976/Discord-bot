import { MarkovChain } from './engines/markov.js';
import { SentenceEmbedder } from './engines/embedder.js';
import { TfIdfScorer } from './engines/tfidf.js';
import { QwenAI } from './engines/qwen-ai.js';
import { ChannelMemory } from './memory/channel-memory.js';
import { ConversationTracker } from './memory/conversation-tracker.js';
import { UserPreferences } from './memory/user-preferences.js';
import { ReplyHistory } from './memory/reply-history.js';
import { FeedbackTracker, SlangTracker } from './memory/feedback-tracker.js';
import { PairStore } from './pairs/pair-store.js';
import { PairMatcher } from './pairs/pair-matcher.js';
import { PairLearning } from './pairs/pair-learning.js';
import { detectTopics } from './data/topics.js';
import { TEMPLATES, FOCUSED_TEMPLATES, loadTemplates, templatesToJSON } from './data/templates.js';
import { analyzeSentiment } from './utils/sentiment.js';
import { extractSubject } from './utils/subject-extractor.js';
import { lookupKnowledge } from './data/knowledge-base.js';
import { extractMessageSignals, detectInputStyle } from './pipeline/input-layer.js';
import { detectSpamBurst, isEchoReply, detectBrokenReply, generateSelfCorrection, simulateTypo } from './pipeline/safety-filter.js';
import { TOPIC_EMOJIS, SENTIMENT_EMOJIS } from './pipeline/follow-up.js';
import { generateReply } from './generate-reply.js';

const _POSITIVE_FEEDBACK = new Set(['lol', 'lmao', 'haha', '😂', '🔥', 'true', 'facts', 'fr', 'based', 'W', 'good', 'nice', 'agree', 'exactly', 'real', 'valid', 'yes', 'yeah', '💀', '👍', 'this', 'goated']);
const _NEGATIVE_FEEDBACK = new Set(['what?', 'huh', '?', 'cringe', 'no', 'wrong', 'bad', 'shut up', 'stfu', 'who asked', 'nobody asked', 'L', 'ratio', 'mid', 'weird', 'bruh what']);
const _POSITIVE_EMOJIS = new Set(['👍', '❤️', '😂', '🔥', '💯', '✅', '⭐']);
const _NEGATIVE_EMOJIS = new Set(['👎', '❌', '💀', '😬']);

class SmartBot {
  constructor() {
    // Engines
    this.markov = new MarkovChain();
    this.embedder = new SentenceEmbedder();
    this.tfidf = new TfIdfScorer();
    this.ai = new QwenAI();

    // Memory
    this.memory = new ChannelMemory(30);
    this.conversationTracker = new ConversationTracker();
    this.userPrefs = new UserPreferences();
    this.replyHistory = new ReplyHistory();
    this.feedback = new FeedbackTracker();
    this.slangTracker = new SlangTracker();

    // Pairs
    this.pairStore = new PairStore();
    this.pairMatcher = new PairMatcher(this.pairStore, this.embedder);
    this.pairLearning = new PairLearning(this.pairStore);

    // Config
    this.config = {
      enabled: false,
      replyChance: 0.015,
      mentionAlwaysReply: true,
      nameAlwaysReply: true,
      cooldownMs: 30000,
      minMessagesBetween: 4,
      markovChance: 0.25,
      maxResponseLength: 200,
      allowedChannels: [],
      ignoredChannels: [],
      botName: '',
      personality: 'chill',
      persona: '',
      aiMode: 'direct',
      smartReply: false,
      smartReplyThreshold: 0.5,
    };

    this.knowledge = {
      streamSchedule: '', nextStream: '', isLive: false, currentGame: '',
      streamTitle: '', viewerCount: 0, streamerName: '',
      socials: {}, customEntries: {}, serverInfo: '', rules: '',
      lastStreamPeakViewers: 0, lastStreamDate: '', lastStreamDuration: '',
      lastStreamGame: '', lastStreamAvgViewers: 0, facts: {},
    };

    this.stats = {
      totalReplies: 0, topicReplies: {}, markovReplies: 0, templateReplies: 0,
      mentionReplies: 0, knowledgeReplies: 0, followUpReplies: 0, lastReplyAt: null, dailyReplies: {},
    };

    this.apiKeys = { weatherApi: '', openWeatherMap: '', newsApi: '', omdb: '', tmdb: '', rawg: '', huggingface: '' };
    this.apiCache = new Map();
    this.API_CACHE_TTL = 300000;

    // State
    this.lastReplyTime = new Map();
    this.messageCountSinceReply = new Map();
    this.lastBotReply = new Map();
    this.lastBotReplyDetails = new Map();
    this._lastConversationContext = new Map();
    this._lastMentionReply = new Map();
    this._lastAskedAbout = null;
    this._recentBotMessageIds = new Map(); // channelId → Set of recent bot msg IDs
    this._consecutiveReplyCount = new Map(); // channelId → { userId, count }
    this.channelMsgLengths = new Map();
    this.userReputation = new Map();
    this._conversationLog = [];
    this._trainingStats = { totalSessions: 0, approved: 0, rejected: 0, log: [] };
    this.userPreferences = new Map();
    this.recentEmotionalReplies = [];
    this.levelingData = null;
    this.streamHistory = null;

    this._regexPatterns = {
      correction: /^(?:no|nah|wrong|actually|its not|thats not|it should be|the answer is|correct answer is)\s*[,:]?\s*(.+)/i,
      question: /\?$|\b(?:what|how|why|who|when|where|which|can you|do you|is there|are there|tell me)\b/i,
      greeting: /^(?:hi|hello|hey|sup|yo|whats up|good morning|good evening|gm|gn)\b/i,
      command: /^[!\/\.]/,
    };

    this._decayTimer = null;
    this._botNameRegex = null;
    this._updateBotNameRegex();
  }

  setApiKeys(keys) {
    Object.assign(this.apiKeys, keys);
    if (keys.huggingface) {
      this.embedder.apiKey = keys.huggingface;
    }
    if (keys.groq || keys.huggingface) {
      this.ai.setKeys({ groq: keys.groq, huggingface: keys.huggingface });
    }
  }

  getConfig() {
    return { ...this.config };
  }

  updateConfig(newConfig) {
    for (const [key, value] of Object.entries(newConfig)) {
      if (key in this.config) {
        this.config[key] = value;
      }
    }
    if (newConfig.botName !== undefined) this._updateBotNameRegex();
  }

  _updateBotNameRegex() {
    const name = this.config.botName?.toLowerCase();
    if (name) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      this._botNameRegex = new RegExp(`\\b${escaped}\\b`, 'i');
    } else {
      this._botNameRegex = null;
    }
  }

  getStats() {
    return {
      ...this.stats,
      markov: this.markov.getStats(),
      memoryChannels: this.memory.channels.size,
      trackedUsers: this.userPrefs.prefs?.size || 0,
      feedbackTemplates: this.feedback.templateScores.size,
      serverExpressions: this.slangTracker.expressions.size,
      replyHistoryChannels: this.replyHistory.history.size,
      trainedPairs: this.pairStore.trainedPairs.size,
    };
  }

  processReaction(message, emojiName, userId) {
    if (!message || !message.content) return;
    const positive = _POSITIVE_EMOJIS.has(emojiName);
    const negative = _NEGATIVE_EMOJIS.has(emojiName);
    if (positive) this.feedback.recordFeedback('positive', message.content);
    if (negative) this.feedback.recordFeedback('negative', message.content);
  }

  // ==================== shouldReply ====================

  shouldReply(msg, botUserId) {
    if (!this.config.enabled) return { reply: false };
    const channelId = msg.channel.id;

    if (this.config.ignoredChannels.includes(channelId)) return { reply: false };
    if (this.config.allowedChannels.length > 0 && !this.config.allowedChannels.includes(channelId)) return { reply: false };

    let replyChanceMultiplier = 1.0;
    const recentScore = this.feedback.getRecentScore(channelId);
    if (recentScore !== null) replyChanceMultiplier = 0.5 + (recentScore * 1.0);

    // Direct mentions
    if (this.config.mentionAlwaysReply && msg.mentions.has(botUserId)) {
      const lastMention = this._lastMentionReply?.get(channelId) || 0;
      if (Date.now() - lastMention < 3000) return { reply: false };
      return { reply: true, reason: 'mention', isDirect: true };
    }

    // Reply to bot's message — check if they replied to ANY recent bot message
    if (msg.reference?.messageId) {
      const recentBotIds = this._recentBotMessageIds.get(channelId);
      if (recentBotIds && recentBotIds.has(msg.reference.messageId)) {
        return { reply: true, reason: 'reply_to_bot', isDirect: true };
      }
      // Fallback: check lastBotReply (legacy)
      const lastReply = this.lastBotReply.get(channelId);
      if (lastReply && lastReply.messageId === msg.reference.messageId) {
        return { reply: true, reason: 'reply_to_bot', isDirect: true };
      }
    }

    // Conversation continuation — someone talking right after bot replied (within 60s, same user)
    const lastCtxCheck = this._lastConversationContext.get(channelId);
    if (lastCtxCheck && Date.now() - lastCtxCheck.timestamp < 60000
        && lastCtxCheck.userId === msg.author.id
        && !msg.content.startsWith('!') && !msg.content.startsWith('/')) {
      return { reply: true, reason: 'reply_to_bot', isDirect: true };
    }

    // Bot name mentioned
    const botName = this.config.botName.toLowerCase();
    if (this.config.nameAlwaysReply && botName) {
      if (this._botNameRegex && this._botNameRegex.test(msg.content)) {
        return { reply: true, reason: 'name', isDirect: true };
      }
    }

    // Cooldown
    const lastReply = this.lastReplyTime.get(channelId) || 0;
    let adjustedCooldown = this.config.cooldownMs * (replyChanceMultiplier < 0.8 ? 1.5 : 1.0);
    if (this.pairStore.trainedPairs.size > 10) {
      let highScore = 0;
      for (const pair of this.pairStore.trainedPairs.values()) if (pair.score >= 3 && pair.uses >= 2) highScore++;
      if (highScore > 5) adjustedCooldown *= 0.7;
    }
    if (Date.now() - lastReply < adjustedCooldown) return { reply: false };

    const msgCount = this.messageCountSinceReply.get(channelId) || 0;
    if (msgCount < this.config.minMessagesBetween) return { reply: false };

    const effectiveChance = this.config.replyChance * replyChanceMultiplier;

    // Intent-based boosts
    const extracted = extractSubject(msg.content);
    if (extracted?.intent) {
      if (extracted.intent === 'greeting_bot') return { reply: true, reason: 'greeting' };
      if (extracted.intent === 'asking_info') {
        const known = extracted.subjects.length > 0 && lookupKnowledge(extracted.subjects[0]);
        if (known && Math.random() < effectiveChance * 5) return { reply: true, reason: 'knowledge_answer' };
      }
      if (['asking_opinion', 'comparing'].includes(extracted.intent) && Math.random() < effectiveChance * 4) {
        return { reply: true, reason: 'direct_question' };
      }
      if (['sharing_experience', 'recommending', 'complaining'].includes(extracted.intent)) {
        const known = extracted.subjects.length > 0 && lookupKnowledge(extracted.subjects[0]);
        if (Math.random() < effectiveChance * (known ? 3 : 2)) return { reply: true, reason: 'engagement' };
      }
    }

    // Pair-aware boost
    if (this.pairStore.trainedPairs.size > 0) {
      const normMsg = this.pairStore.normalizeForMatch(msg.content);
      if (this.pairStore.trainedPairs.has(normMsg)) {
        if (Math.random() < effectiveChance * 6) return { reply: true, reason: 'trained_pair_exact' };
      } else {
        const stemmed = this.pairStore.normalizeStemmed(normMsg);
        const words = stemmed.split(' ').filter(w => w.length > 1);
        let candidateCount = 0;
        for (const word of words) {
          const keys = this.pairStore._pairIndex.get(word);
          if (keys) candidateCount += keys.size;
        }
        if (candidateCount >= 2 && Math.random() < effectiveChance * 4) return { reply: true, reason: 'trained_pair_fuzzy' };
      }
    }

    // Topic boost
    const topics = detectTopics(msg.content);
    const wordCount = msg.content.trim().split(/\s+/).length;
    if (topics?.[0] && topics[0][1].score >= 3 && Math.random() < effectiveChance * 2) return { reply: true, reason: 'strong_topic' };

    // Unanswered questions
    const unanswered = this.memory.getUnansweredQuestions(channelId);
    if (unanswered.length > 0 && Math.random() < 0.05) return { reply: true, reason: 'unanswered_question' };

    // Smart reply — only reply to messages that "make sense" to respond to
    if (this.config.smartReply) {
      const score = this._scoreMessageQuality(msg.content, topics, extracted, wordCount);
      if (score < (this.config.smartReplyThreshold || 0.5)) return { reply: false };
    }

    // Random
    if (wordCount >= 4 && Math.random() < effectiveChance) {
      const recentTopics = this.memory.getRecentTopics(channelId);
      if (topics?.[0] && (topics[0][1].confidence === 'high' || recentTopics.includes(topics[0][0]))) {
        return { reply: true, reason: 'random' };
      }
    }

    return { reply: false };
  }

  // ==================== processMessage ====================

  async processMessage(msg, botUserId) {
    const content = msg.content;
    const channelId = msg.channel.id;
    const userId = msg.author.id;
    const username = msg.member?.displayName || msg.author.username;

    const topics = detectTopics(content);
    const primaryTopic = topics?.[0]?.[0] || null;
    const extracted = extractSubject(content);
    const sentiment = analyzeSentiment(content);
    const precomputed = { topics, extracted, sentiment };

    // Train systems
    this.markov.train(content, primaryTopic);
    this.memory.addMessage(channelId, userId, username, content, precomputed);

    if (this.embedder?.enabled && content.length >= 5) {
      this.embedder.updateChannelContext(channelId, content).catch(() => {});
      this.embedder.embed(content).catch(() => {});
    }

    // Track user data
    this._trackUserPreferences(userId, content, topics, precomputed);
    this.conversationTracker.addUserMessage(channelId, userId, content, extracted);
    this.userPrefs.track(userId, content, extracted);

    // Channel message length tracking
    if (!this.channelMsgLengths.has(channelId)) this.channelMsgLengths.set(channelId, { totalLen: 0, count: 0 });
    const lenTracker = this.channelMsgLengths.get(channelId);
    lenTracker.totalLen += content.length;
    lenTracker.count++;
    if (lenTracker.count > 200) { lenTracker.totalLen = Math.floor(lenTracker.totalLen / 2); lenTracker.count = Math.floor(lenTracker.count / 2); }

    this.slangTracker.record(content, userId);

    this._detectFeedback(channelId, userId, content);
    this.pairLearning.extractCandidate(channelId, userId, content, this.memory.getRecentMessages(channelId, 5));

    this.messageCountSinceReply.set(channelId, (this.messageCountSinceReply.get(channelId) || 0) + 1);

    if (detectSpamBurst(this.memory.getRecentMessages(channelId, 5))) return null;

    const decision = this.shouldReply(msg, botUserId);
    if (!decision.reply) return null;

    let reply = await generateReply(this, msg, decision.reason, decision, precomputed);
    if (!reply) {
      if (['mention', 'name', 'reply_to_bot'].includes(decision.reason)) {
        reply = TEMPLATES.fallback[Math.floor(Math.random() * TEMPLATES.fallback.length)];
      } else return null;
    }

    if (reply && typeof reply === 'object' && reply.__type) {
      this.lastReplyTime.set(channelId, Date.now());
      this.messageCountSinceReply.set(channelId, 0);
      return reply;
    }

    // Anti-repetition
    if (this.replyHistory.isDuplicate(channelId, reply)) {
      reply = await generateReply(this, msg, decision.reason, decision);
      if (!reply || this.replyHistory.isDuplicate(channelId, reply)) {
        reply = ['mention', 'name', 'reply_to_bot'].includes(decision.reason)
          ? TEMPLATES.fallback[Math.floor(Math.random() * TEMPLATES.fallback.length)] : null;
        if (!reply) return null;
      }
    }

    // Anti-echo
    if (isEchoReply(reply, content)) {
      reply = await generateReply(this, msg, decision.reason, decision);
      if (!reply || isEchoReply(reply, content)) {
        reply = ['mention', 'name', 'reply_to_bot'].includes(decision.reason)
          ? TEMPLATES.fallback[Math.floor(Math.random() * TEMPLATES.fallback.length)] : null;
        if (!reply) return null;
      }
    }

    // Adaptive length
    const avgLen = this._getChannelAvgLength(channelId);
    if (avgLen > 0 && avgLen < 40 && reply.length > 80) {
      const sentences = reply.split(/(?<=[.!?])\s+/);
      if (sentences.length > 1) reply = sentences[0];
    }

    // Self-correction / typo
    const brokenCheck = detectBrokenReply(reply);
    let selfCorrection = null;
    if (brokenCheck && Math.random() < 0.7) selfCorrection = generateSelfCorrection(brokenCheck);
    const typoResult = simulateTypo(reply);

    this.replyHistory.record(channelId, reply);
    if (typeof reply === 'string') this.conversationTracker.addBotReply(channelId, userId, reply);

    this.lastBotReply.set(channelId, {
      content: reply, subject: extracted?.subjects?.[0] || null,
      intent: extracted?.intent || null, timestamp: Date.now(),
    });

    this._lastConversationContext.set(channelId, {
      topic: primaryTopic || 'general', subject: extracted?.subjects?.[0] || null,
      allSubjects: extracted?.subjects || [], userQuery: content,
      botReply: typeof reply === 'string' ? reply : null, timestamp: Date.now(),
      userId: userId,
    });

    // Track consecutive replies with same user
    const prevCount = this._consecutiveReplyCount.get(channelId);
    if (prevCount && prevCount.userId === userId) {
      prevCount.count++;
    } else {
      this._consecutiveReplyCount.set(channelId, { userId, count: 1 });
    }

    // Log for dashboard
    if (typeof reply === 'string' && reply.length > 0) {
      this._conversationLog.push({
        userMessage: content.substring(0, 400), botReply: reply.substring(0, 400),
        topic: primaryTopic || 'general', channelId, userId, username,
        reason: decision.reason, timestamp: Date.now(), reviewed: false,
      });
      if (this._conversationLog.length > 200) this._conversationLog = this._conversationLog.slice(-200);
    }

    this.lastReplyTime.set(channelId, Date.now());
    this.messageCountSinceReply.set(channelId, 0);
    if (decision.reason === 'mention') this._lastMentionReply.set(channelId, Date.now());

    const activeThread = this.memory.getActiveThread(channelId);
    if (activeThread?.questionsAsked) {
      for (const q of activeThread.questionsAsked) { if (!q.answered) { q.answered = true; break; } }
    }

    // Emoji reaction instead of text (6% chance)
    if (Math.random() < 0.06 && decision.reason !== 'mention' && decision.reason !== 'name') {
      const topicEmojis = primaryTopic ? TOPIC_EMOJIS[primaryTopic] : null;
      const sentiment = analyzeSentiment(content);
      const emojiPool = topicEmojis || SENTIMENT_EMOJIS[sentiment] || SENTIMENT_EMOJIS.neutral;
      return { __type: 'reaction', emoji: emojiPool[Math.floor(Math.random() * emojiPool.length)] };
    }

    // Multi-message split
    if (reply.length > 40 && Math.random() < 0.07) {
      const splitPoint = reply.indexOf(' ', Math.floor(reply.length * 0.4));
      if (splitPoint > 10 && splitPoint < reply.length - 10) {
        return { __type: 'multi', parts: [reply.substring(0, splitPoint), reply.substring(splitPoint + 1)] };
      }
    }

    if (selfCorrection) return { __type: 'multi', parts: [reply, selfCorrection] };
    if (typoResult) return { __type: 'multi', parts: [typoResult.typoText, typoResult.correction] };

    return reply;
  }

  // ==================== Helper methods ====================

  _finalizeReply(topicUsed, templateKey, channelId, isKnowledge, botReply) {
    this.stats.totalReplies++;
    this.stats.topicReplies[topicUsed] = (this.stats.topicReplies[topicUsed] || 0) + 1;
    if (isKnowledge) this.stats.knowledgeReplies = (this.stats.knowledgeReplies || 0) + 1;
    this.stats.lastReplyAt = new Date().toISOString();
    if (botReply && botReply.length > 1900) botReply = botReply.substring(0, 1897) + '...';
    this.lastBotReplyDetails.set(channelId, { templateKey, topic: topicUsed, timestamp: Date.now(), botReply: botReply || null });
    this.feedback.recordResponse(channelId, templateKey, topicUsed);
  }

  _getChannelAvgLength(channelId) {
    const tracker = this.channelMsgLengths.get(channelId);
    if (!tracker || tracker.count === 0) return 0;
    return tracker.totalLen / tracker.count;
  }

  _trackUserPreferences(userId, content, topics, precomputed = null) {
    if (!this.userPreferences.has(userId)) {
      this.userPreferences.set(userId, {
        topics: {}, subjects: {}, messageCount: 0,
        sentiment: { positive: 0, negative: 0, neutral: 0 },
        personality: null, lastActive: Date.now(), favoriteSubject: null, memories: [],
      });
    }
    const prefs = this.userPreferences.get(userId);
    prefs.messageCount++;
    prefs.lastActive = Date.now();

    const sentiment = precomputed?.sentiment ?? analyzeSentiment(content);
    prefs.sentiment[sentiment] = (prefs.sentiment[sentiment] || 0) + 1;

    if (topics) { for (const [topic] of topics) prefs.topics[topic] = (prefs.topics[topic] || 0) + 1; }

    const extracted = precomputed?.extracted ?? extractSubject(content);
    if (extracted?.subjects) {
      for (const subj of extracted.subjects) {
        prefs.subjects[subj] = (prefs.subjects[subj] || 0) + 1;
        // Incremental max — avoids Object.entries().sort() per message
        if (!prefs.favoriteSubject || prefs.subjects[subj] > (prefs.subjects[prefs.favoriteSubject] || 0)) {
          prefs.favoriteSubject = subj;
        }
      }
    }

    this._extractMemorableFacts(userId, content, extracted);

    if (this.userPreferences.size > 1000) {
      const oldest = this.userPreferences.keys().next().value;
      this.userPreferences.delete(oldest);
    }
  }

  _extractMemorableFacts(userId, content, extracted) {
    const prefs = this.userPreferences.get(userId);
    if (!prefs) return;
    if (!prefs.memories) prefs.memories = [];
    const lower = content.toLowerCase();

    const factPatterns = [
      { re: /\b(?:i play|im playing|i main|playing)\s+(.{2,30})/i, type: 'plays' },
      { re: /\b(?:i love|i really love|i adore)\s+(.{2,30})/i, type: 'loves' },
      { re: /\b(?:i hate|i cant stand)\s+(.{2,30})/i, type: 'hates' },
      { re: /\b(?:my (?:favorite|fav|fave))\s+(?:\w+\s+)?(?:is|are)\s+(.{2,30})/i, type: 'favorite' },
      { re: /\b(?:i work|my job|i work as)\s+(?:as |at |in )?(.{2,30})/i, type: 'works' },
      { re: /\b(?:i live in|im from)\s+(.{2,30})/i, type: 'from' },
      { re: /\b(?:i have a|my)\s+(dog|cat|pet|bird|fish|hamster|rabbit)\b/i, type: 'has_pet' },
      { re: /\b(?:i watch|been watching|binging)\s+(.{2,30})/i, type: 'watches' },
      { re: /\b(?:i listen to|been listening to)\s+(.{2,30})/i, type: 'listens_to' },
    ];

    for (const { re, type } of factPatterns) {
      const m = lower.match(re);
      if (m) {
        const value = m[1].replace(/[.!?,;]+$/, '').trim();
        if (value.length < 3 || value.length > 40) continue;
        if (!prefs.memories.some(mem => mem.type === type && mem.value.toLowerCase() === value.toLowerCase())) {
          prefs.memories.push({ type, value, ts: Date.now() });
          if (prefs.memories.length > 20) prefs.memories.shift();
        }
      }
    }
  }

  _detectFeedback(channelId, userId, content) {
    const details = this.lastBotReplyDetails.get(channelId);
    if (!details || Date.now() - details.timestamp > 45000) return;

    const lower = content.toLowerCase();
    let isPositive = false, isNegative = false;
    for (const s of _POSITIVE_FEEDBACK) { if (lower.includes(s)) { isPositive = true; break; } }
    if (!isPositive) { for (const s of _NEGATIVE_FEEDBACK) { if (lower.includes(s)) { isNegative = true; break; } } }
    if (!isPositive && !isNegative) {
      // Check correction
      if (Date.now() - details.timestamp < 60000) {
        const correctionMatch = content.match(this._regexPatterns.correction);
        if (correctionMatch) {
          const correction = correctionMatch[1].trim();
          const userPref = this.userPreferences.get(userId);
          const msgCount = userPref?.messageCount || 0;
          if (correction.length >= 5 && correction.length <= 300 && msgCount >= 30) {
            this.pairLearning.autoCorrect(userId, correction, details, this.userReputation);
          }
        }
      }
      return;
    }

    const userPref = this.userPreferences.get(userId);
    const msgCount = userPref?.messageCount || 0;
    let userWeight = msgCount >= 100 ? 2.0 : msgCount >= 30 ? 1.5 : 1.0;
    const rep = this.userReputation.get(userId);
    if (rep?.accuracy > 0.7 && rep?.total >= 5) userWeight *= 1.3;

    if (!this.userReputation.has(userId)) this.userReputation.set(userId, { positive: 0, negative: 0, total: 0, accuracy: 0.5 });
    const repData = this.userReputation.get(userId);
    repData.total++;
    if (isPositive) repData.positive++; else repData.negative++;
    repData.accuracy = repData.positive / repData.total;
    if (this.userReputation.size > 1500) this.userReputation.delete(this.userReputation.keys().next().value);

    this.feedback.recordFeedback(details.templateKey, details.topic, isPositive, userWeight);
    this.feedback.recordChannelFeedback(channelId, isPositive);

    if (details.templateKey?.startsWith('trained:')) {
      const pairKey = details.templateKey.replace('trained:', '');
      this.feedback.recordPairFeedback(pairKey, isPositive, userWeight);
    }

    if (isPositive && details.botReply && details.topic !== 'fallback') {
      this.markov.trainWeighted(details.botReply, details.topic, 2);
    }
  }

  // ==================== Smart Reply Quality Scoring ====================

  _scoreMessageQuality(content, topics, extracted, wordCount) {
    let score = 0;
    // Longer messages are more meaningful
    if (wordCount >= 6) score += 0.2;
    if (wordCount >= 10) score += 0.1;
    // Questions are great to reply to
    if (/\?/.test(content)) score += 0.3;
    // Has a topic match
    if (topics?.[0] && topics[0][1].score >= 2) score += 0.2;
    if (topics?.[0] && topics[0][1].confidence === 'high') score += 0.1;
    // Has extractable subjects
    if (extracted?.subjects?.length > 0) score += 0.15;
    // Has clear intent
    if (extracted?.intent) score += 0.15;
    // Opinioned messages are good
    if (/\b(love|hate|best|worst|goat|fire|mid|trash|amazing|terrible|favorite|fav)\b/i.test(content)) score += 0.15;
    // Too short — not much to reply to
    if (wordCount <= 2) score -= 0.3;
    // Single word or very short filler
    if (/^(lol|lmao|haha|ok|yeah|true|facts|fr|real|rip|oof|bruh|nah|same|mood)$/i.test(content.trim())) score -= 0.4;
    // All caps spam
    if (content === content.toUpperCase() && content.length > 5 && !/[a-z]/.test(content)) score -= 0.1;
    return Math.max(0, Math.min(1, score));
  }

  // ==================== Timers ====================

  startTimers() {
    if (this._decayTimer) clearInterval(this._decayTimer);
    this._decayTimer = setInterval(() => {
      this.pairStore.decayUnused();
      this._decayFeedback();
      this._decaySlang();
    }, 86400000);
  }

  stopTimers() {
    if (this._decayTimer) { clearInterval(this._decayTimer); this._decayTimer = null; }
  }

  _decayFeedback() {
    let decayed = 0;
    for (const [key, entry] of this.feedback.templateScores) {
      if (entry.uses > 0) {
        entry.positive = Math.floor(entry.positive * 0.95);
        entry.negative = Math.floor(entry.negative * 0.95);
        if (entry.positive === 0 && entry.negative === 0) this.feedback.templateScores.delete(key);
        decayed++;
      }
    }
    if (decayed > 0) console.log(`[SmartBot] Decayed ${decayed} feedback entries`);
  }

  _decaySlang() {
    const now = Date.now();
    const MONTH = 30 * 86400000;
    let removed = 0;
    for (const [phrase, data] of this.slangTracker.expressions) {
      if (now - (data.lastUsed || 0) > MONTH * 2) {
        data.count = Math.floor(data.count * 0.8);
        if (data.count <= 1) { this.slangTracker.expressions.delete(phrase); removed++; }
      }
    }
  }

  // ==================== Persistence ====================

  toJSON() {
    return {
      config: this.config,
      knowledge: this.knowledge,
      stats: this.stats,
      apiKeys: this.apiKeys,
      markov: this.markov.toJSON(),
      embedder: this.embedder.toJSON(),
      memory: this.memory.toJSON(),
      feedback: this.feedback.toJSON(),
      slangTracker: this.slangTracker.toJSON(),
      replyHistory: this.replyHistory.toJSON(),
      userPrefs: this.userPrefs.toJSON(),
      pairs: this.pairStore.toJSON(),
      templates: templatesToJSON(),
      ai: this.ai.toJSON(),
      aiMemory: this.ai.memoryToJSON(),
      userPreferences: Object.fromEntries([...this.userPreferences.entries()].slice(0, 500)),
      userReputation: [...this.userReputation.entries()].slice(0, 500),
      conversationLog: this._conversationLog.slice(-100),
      trainingStats: this._trainingStats,
    };
  }

  loadFromJSON(data) {
    if (!data) return;

    if (data.config) Object.assign(this.config, data.config);
    if (data.knowledge) Object.assign(this.knowledge, data.knowledge);
    if (data.stats) Object.assign(this.stats, data.stats);
    if (data.apiKeys) Object.assign(this.apiKeys, data.apiKeys);

    if (data.markov) this.markov.loadFromJSON(data.markov);
    if (data.embedder) this.embedder.loadFromJSON(data.embedder);
    if (data.memory) this.memory.loadFromJSON(data.memory);
    if (data.feedback) this.feedback.loadFromJSON(data.feedback);
    if (data.slangTracker) this.slangTracker.loadFromJSON(data.slangTracker);
    if (data.replyHistory) this.replyHistory.loadFromJSON(data.replyHistory);
    if (data.userPrefs) this.userPrefs.loadFromJSON(data.userPrefs);
    if (data.pairs) this.pairStore.loadFromJSON(data.pairs);
    if (data.templates) loadTemplates(data.templates);
    if (data.ai) this.ai.loadFromJSON(data.ai);
    if (data.aiMemory) this.ai.loadMemoryFromJSON(data.aiMemory);

    if (data.userPreferences) {
      for (const [k, v] of Object.entries(data.userPreferences)) this.userPreferences.set(k, v);
    }
    if (data.userReputation) this.userReputation = new Map(Array.isArray(data.userReputation) ? data.userReputation : Object.entries(data.userReputation));
    if (data.conversationLog) this._conversationLog = data.conversationLog;
    if (data.trainingStats) this._trainingStats = data.trainingStats;

    // Rebuild pair embeddings
    if (this.embedder?.enabled && this.pairStore.trainedPairs.size > 0) {
      this.embedder.buildPairEmbeddings(this.pairStore.trainedPairs).catch(() => {});
    }

    this.startTimers();
  }
}

export { SmartBot };