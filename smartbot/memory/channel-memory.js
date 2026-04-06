import { extractSubject } from '../utils/subject-extractor.js';
import { detectTopics } from '../data/topics.js';
class ChannelMemory {
  constructor(maxMessages = 30) {
    this.channels = new Map();
    this.maxMessages = maxMessages;
    this.userLastSeen = new Map();
    this.activeThreads = new Map();
    this.recentSummaries = new Map();
  }

  addMessage(channelId, userId, username, content, precomputed = null) {
    if (!this.channels.has(channelId)) this.channels.set(channelId, []);
    const msgs = this.channels.get(channelId);
    const extracted = precomputed?.extracted ?? extractSubject(content);
    const topics = precomputed?.topics ?? detectTopics(content);
    const msg = {
      userId, username, content, timestamp: Date.now(),
      topics, intent: extracted ? extracted.intent : null,
      subjects: extracted ? extracted.subjects : [],
    };
    msgs.push(msg);
    if (msgs.length > this.maxMessages) msgs.shift();
    this.userLastSeen.set(`${channelId}:${userId}`, Date.now());
    this._updateThread(channelId, userId, username, content, topics, extracted);
    return msg;
  }

  _updateThread(channelId, userId, username, content, topics, extracted) {
    const thread = this.activeThreads.get(channelId);
    const now = Date.now();
    const topTopic = topics && topics.length > 0 ? topics[0][0] : null;

    if (!thread || (now - thread.lastActivity > 300000)) {
      if (thread && thread.messages >= 5) this._summarizeThread(channelId, thread);
      this.activeThreads.set(channelId, {
        topic: topTopic, participants: new Set([userId]),
        startTime: now, lastActivity: now, messages: 1,
        subjects: extracted?.subjects || [],
        questionsAsked: extracted?.intent?.includes('asking') ? [{ userId, content, answered: false }] : [],
      });
    } else {
      thread.lastActivity = now;
      thread.messages++;
      thread.participants.add(userId);
      if (topTopic && topTopic !== thread.topic) {
        thread.topicShifts = (thread.topicShifts || 0) + 1;
        if (thread.topicShifts >= 3) thread.topic = topTopic;
      }
      if (extracted?.subjects) {
        thread.subjects = [...new Set([...thread.subjects, ...extracted.subjects])].slice(-10);
      }
      if (extracted?.intent?.includes('asking')) {
        if (!thread.questionsAsked) thread.questionsAsked = [];
        thread.questionsAsked.push({ userId, content, answered: false });
        if (thread.questionsAsked.length > 5) thread.questionsAsked.shift();
      }
    }
  }

  _summarizeThread(channelId, thread) {
    if (!this.recentSummaries.has(channelId)) this.recentSummaries.set(channelId, []);
    const summaries = this.recentSummaries.get(channelId);
    const participantCount = thread.participants instanceof Set ? thread.participants.size : (thread.participants || 0);
    const duration = Math.round((thread.lastActivity - thread.startTime) / 60000);
    summaries.push({
      topic: thread.topic || 'general', subjects: thread.subjects || [],
      participantCount, messageCount: thread.messages, duration, timestamp: Date.now(),
    });
    if (summaries.length > 10) summaries.shift();
  }

  getActiveThread(channelId) {
    const thread = this.activeThreads.get(channelId);
    if (!thread) return null;
    if (Date.now() - thread.lastActivity > 300000) return null;
    return thread;
  }

  getUnansweredQuestions(channelId) {
    const thread = this.getActiveThread(channelId);
    if (!thread || !thread.questionsAsked) return [];
    return thread.questionsAsked.filter(q => !q.answered);
  }

  getLastSummary(channelId) {
    const summaries = this.recentSummaries.get(channelId);
    if (!summaries || summaries.length === 0) return null;
    return summaries[summaries.length - 1];
  }

  generateSummaryText(channelId) {
    const summary = this.getLastSummary(channelId);
    if (!summary) return null;
    const templates = [
      `Looks like the convo was about ${summary.topic} with ${summary.participantCount} people chatting for about ${summary.duration} min`,
      `Last discussion: ${summary.topic} topic, ${summary.messageCount} messages over ${summary.duration} min`,
      `Chat was going off about ${summary.topic} earlier, ${summary.participantCount} people were in on it`,
    ];
    let text = templates[Math.floor(Math.random() * templates.length)];
    if (summary.subjects.length > 0) text += ` — subjects: ${summary.subjects.slice(0, 3).join(', ')}`;
    return text;
  }

  getRecentTopics(channelId, windowMs = 120000) {
    const msgs = this.channels.get(channelId) || [];
    const cutoff = Date.now() - windowMs;
    const topicCounts = {};
    for (const msg of msgs) {
      if (msg.timestamp < cutoff) continue;
      if (!msg.topics) continue;
      for (const [topic, data] of msg.topics) topicCounts[topic] = (topicCounts[topic] || 0) + data.score;
    }
    return Object.entries(topicCounts).sort(([, a], [, b]) => b - a).map(([topic]) => topic);
  }

  getRecentMessages(channelId, count = 10) {
    return (this.channels.get(channelId) || []).slice(-count);
  }

  isUserReturning(channelId, userId, thresholdMs = 1800000) {
    const lastSeen = this.userLastSeen.get(`${channelId}:${userId}`);
    if (!lastSeen) return true;
    return (Date.now() - lastSeen) > thresholdMs;
  }

  getActiveUserCount(channelId, windowMs = 300000) {
    const msgs = this.channels.get(channelId) || [];
    const cutoff = Date.now() - windowMs;
    const users = new Set();
    for (const msg of msgs) {
      if (msg.timestamp >= cutoff) users.add(msg.userId);
    }
    return users.size;
  }

  toJSON() {
    const threads = {};
    for (const [k, v] of this.activeThreads) {
      threads[k] = { ...v, participants: v.participants instanceof Set ? [...v.participants] : [] };
    }
    const summaries = {};
    for (const [k, v] of this.recentSummaries) summaries[k] = v;
    const lastSeen = [...this.userLastSeen.entries()].slice(-500);
    return { threads, summaries, lastSeen };
  }

  loadFromJSON(data) {
    if (!data) return;
    if (data.threads) {
      for (const [k, v] of Object.entries(data.threads)) {
        this.activeThreads.set(k, { ...v, participants: new Set(v.participants || []) });
      }
    }
    if (data.summaries) {
      for (const [k, v] of Object.entries(data.summaries)) this.recentSummaries.set(k, v);
    }
    if (data.lastSeen) this.userLastSeen = new Map(data.lastSeen);
  }
}

export { ChannelMemory };