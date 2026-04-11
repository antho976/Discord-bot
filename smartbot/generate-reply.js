import { detectTopics } from './data/topics.js';
import { analyzeSentiment } from './utils/sentiment.js';
import { extractSubject } from './utils/subject-extractor.js';
import { lookupKnowledge } from './data/knowledge-base.js';
import { TEMPLATES, FOCUSED_TEMPLATES } from './data/templates.js';
import { extractMessageSignals, detectInputStyle } from './pipeline/input-layer.js';
import { detectIntent } from './pipeline/intent-detector.js';
import { resolveVagueReference, analyzeConversationFlow } from './pipeline/context-matcher.js';
import { contextAwarePick } from './pipeline/response-picker.js';
import { modifyResponse, sanitizePrefixForSentiment } from './pipeline/variation-engine.js';
import { TOPIC_EMOJIS, SENTIMENT_EMOJIS, pickFollowUp, FOLLOW_UP_RESPONSES } from './pipeline/follow-up.js';
import { isEchoReply, detectSpamBurst, detectBrokenReply, generateSelfCorrection, simulateTypo, isSensitiveTopic } from './pipeline/safety-filter.js';
import { detectSarcasm, SARCASM_RESPONSES } from './data/sarcasm.js';
import { SENSITIVE_RESPONSES, CELEBRATION_RESPONSES } from './data/sensitive-responses.js';
import { matchSlangReaction } from './data/slang-dictionary.js';
import { generateWittyBystander, engageWithStory } from './data/witty-bystander.js';
import { answerWithKnowledge, answerGenericQuestion, answerComparison } from './data/knowledge-base.js';
import { BOT_GREETINGS } from './data/greetings.js';
import { getTimeGreeting, getSeasonalContext } from './utils/time-utils.js';
import { getFunnyResponse, getCutoffResponse, getRandomSass } from './data/funny-interactions.js';

const RE_AGREEMENT = /\b(true|facts|fr|based|real|exactly|agree|same|W|this|right|yes|yeah)\b/i;
const RE_DISAGREEMENT = /\b(nah|no|wrong|cap|L|ratio|disagree|mid)\b/i;
const RE_AMUSED = /\b(lol|lmao|haha|😂|💀|dead|funny)\b/i;
const RE_CELEBRATION = /\b(got promoted|graduated|passed|won|achievement|engaged|married|baby|hired|accepted)\b/i;

async function generateReply(bot, msg, reason, decision, precomputed = null) {
  const content = msg.content;
  const channelId = msg.channel.id;
  const userId = msg.author.id;
  const username = msg.member?.displayName || msg.author.username;

  const topics = precomputed?.topics ?? detectTopics(content);
  const sentiment = precomputed?.sentiment ?? analyzeSentiment(content);
  const extracted = precomputed?.extracted ?? extractSubject(content);
  const inputStyle = detectInputStyle(content);
  const signals = extractMessageSignals(content, topics, sentiment, extracted);
  const recentMessages = bot.memory.getRecentMessages(channelId, 10);
  const intent = detectIntent(content);

  let reply = null;
  let topicUsed = 'general';
  let templateKey = 'unknown';

  // === 1. Follow-up to previous bot reply ===
  const isDirect = reason === 'mention' || reason === 'name' || reason === 'reply_to_bot';

  // === 0a. Conversation cutoff (8+ consecutive replies with same user) ===
  if (isDirect) {
    const convoCount = bot._consecutiveReplyCount.get(channelId);
    if (convoCount && convoCount.userId === userId && convoCount.count >= 8) {
      reply = getCutoffResponse(username);
      topicUsed = 'cutoff';
      templateKey = 'funny:cutoff';
      bot._consecutiveReplyCount.set(channelId, { userId, count: 0 }); // reset after cutoff
      bot._finalizeReply(topicUsed, templateKey, channelId, false, reply);
      return reply;
    }
  }

  // === 0b. Funny contextual interactions (insults, shut up, spam, etc.) ===
  if (isDirect) {
    const funnyReply = getFunnyResponse(content, username, recentMessages, userId);
    if (funnyReply) {
      reply = funnyReply;
      topicUsed = 'funny';
      templateKey = 'funny:contextual';
      bot._finalizeReply(topicUsed, templateKey, channelId, false, reply);
      return reply;
    }
    // Small chance (~10%) of random sass on any direct ping
    if (Math.random() < 0.10) {
      reply = getRandomSass(username);
      topicUsed = 'funny';
      templateKey = 'funny:sass';
      bot._finalizeReply(topicUsed, templateKey, channelId, false, reply);
      return reply;
    }
  }

  const lastCtx = bot._lastConversationContext.get(channelId);
  if (lastCtx && Date.now() - lastCtx.timestamp < 120000 && !isDirect) {
    const lastBotReply = bot.conversationTracker.getLastBotReply(channelId, userId);
    if (lastBotReply) {
      const isAgreement = RE_AGREEMENT.test(content);
      const isDisagreement = RE_DISAGREEMENT.test(content);
      const isAmused = RE_AMUSED.test(content);
      const isQuestion = /\?/.test(content);
      const isNewTopic = extracted?.subjects?.[0] && extracted.subjects[0] !== lastCtx.subject;

      let followUpType = null;
      if (isNewTopic) followUpType = 'redirect';
      else if (isAgreement) followUpType = 'agree';
      else if (isDisagreement) followUpType = 'disagree';
      else if (isAmused) followUpType = 'amused';
      else if (isQuestion) followUpType = 'question';

      if (followUpType && Math.random() < 0.6) {
        reply = pickFollowUp(followUpType, lastCtx.subject, extracted?.subjects?.[0]);
        topicUsed = 'follow_up';
        templateKey = `followup:${followUpType}`;
        bot._finalizeReply(topicUsed, templateKey, channelId, false, reply);
        bot.stats.followUpReplies = (bot.stats.followUpReplies || 0) + 1;
        return reply?.replace(/\{user\}/g, username);
      }
    }
  }

  // === 2. Greeting ===
  if (intent.isGreeting && (reason === 'mention' || reason === 'name' || reason === 'greeting')) {
    const greet = BOT_GREETINGS[Math.floor(Math.random() * BOT_GREETINGS.length)];
    const timeGreet = getTimeGreeting();
    const seasonal = getSeasonalContext();
    reply = timeGreet && Math.random() < 0.4 ? `${timeGreet} ${username}! ${greet}` : `${greet.replace(/\{user\}/g, username)}`;
    if (seasonal && Math.random() < 0.2) reply += ` ${seasonal}`;
    topicUsed = 'greeting';
    templateKey = 'greeting';
    bot._finalizeReply(topicUsed, templateKey, channelId, false, reply);
    return reply;
  }

  // === 3. Sensitive topic gate ===
  if (isSensitiveTopic(content)) {
    reply = SENSITIVE_RESPONSES[Math.floor(Math.random() * SENSITIVE_RESPONSES.length)];
    topicUsed = 'sensitive';
    templateKey = 'sensitive_topic';
    bot._finalizeReply(topicUsed, templateKey, channelId, false, reply);
    return reply;
  }

  // === 4. Celebration gate ===
  if (RE_CELEBRATION.test(content) && sentiment === 'positive') {
    reply = CELEBRATION_RESPONSES[Math.floor(Math.random() * CELEBRATION_RESPONSES.length)].replace(/\{user\}/g, username);
    topicUsed = 'celebration';
    templateKey = 'celebration';
    bot._finalizeReply(topicUsed, templateKey, channelId, false, reply);
    return reply;
  }

  // === 4b. AI-first for direct mentions/replies ===
  if (isDirect && bot.ai?.enabled && bot.config.aiMode !== 'off') {
    const recentCtx = bot.memory.getRecentMessages(channelId, 15);
    const extraCtx = {
      persona: bot.config.persona || null,
      serverInfo: bot.knowledge.serverInfo || null,
      streamInfo: bot.knowledge.isLive
        ? `The stream is LIVE right now playing ${bot.knowledge.currentGame} with ${bot.knowledge.viewerCount} viewers.`
        : (bot.knowledge.nextStream ? `Next stream: ${bot.knowledge.nextStream}` : null),
      learnedTopics: topics?.slice(0, 3).map(t => t[0]) || [],
      userInterests: bot.userPrefs.getSummary?.(userId) || null,
    };
    bot.ai._maxReplyLen = 500;
    const aiReply = await bot.ai.generate(content, username, bot.config.botName, bot.config.personality, recentCtx, extraCtx);
    bot.ai._maxReplyLen = null;
    if (aiReply) {
      topicUsed = 'ai_direct';
      templateKey = 'ai:direct';
      bot.stats.mentionReplies = (bot.stats.mentionReplies || 0) + 1;
      bot._finalizeReply(topicUsed, templateKey, channelId, true, aiReply);
      return aiReply;
    }
  }

  // === 5a. Focused templates (100% priority when matched) ===
  if (FOCUSED_TEMPLATES.size > 0) {
    const normInput = content.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();
    let focusedMatch = null;

    // Exact match
    for (const [question, answers] of FOCUSED_TEMPLATES) {
      const normQ = question.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();
      if (normInput === normQ) {
        focusedMatch = answers;
        break;
      }
    }

    // Substring / contains match
    if (!focusedMatch) {
      for (const [question, answers] of FOCUSED_TEMPLATES) {
        const normQ = question.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();
        if (normQ.length >= 6 && (normInput.includes(normQ) || normQ.includes(normInput))) {
          focusedMatch = answers;
          break;
        }
      }
    }

    // Keyword overlap match (>= 70% of question words found in input)
    if (!focusedMatch) {
      const inputWords = new Set(normInput.split(' ').filter(w => w.length > 2));
      let bestOverlap = 0;
      for (const [question, answers] of FOCUSED_TEMPLATES) {
        const normQ = question.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();
        const qWords = normQ.split(' ').filter(w => w.length > 2);
        if (qWords.length === 0) continue;
        const overlap = qWords.filter(w => inputWords.has(w)).length / qWords.length;
        if (overlap >= 0.7 && overlap > bestOverlap) {
          bestOverlap = overlap;
          focusedMatch = answers;
        }
      }
    }

    if (focusedMatch && focusedMatch.length > 0) {
      reply = focusedMatch[Math.floor(Math.random() * focusedMatch.length)];
      topicUsed = 'focused_template';
      templateKey = `focused:${reply.substring(0, 40)}`;
      bot._finalizeReply(topicUsed, templateKey, channelId, false, reply);
      return reply?.replace(/\{user\}/g, username);
    }
  }

  // === 5b. Trained pairs (highest priority for curated responses) ===
  bot.pairMatcher.setChannel(channelId);
  const trainedMatch = bot.pairMatcher.find(content, topics);
  if (trainedMatch) {
    reply = trainedMatch.response;
    topicUsed = 'trained_pair';
    templateKey = `trained:${bot.pairStore.normalizeForMatch(content).substring(0, 40)}`;
    bot._finalizeReply(topicUsed, templateKey, channelId, false, reply);
    return reply?.replace(/\{user\}/g, username);
  }

  // === 6. "Tell me more" follow-up ===
  if (intent.isTellMore && lastCtx?.subject) {
    const kb = lookupKnowledge(lastCtx.subject);
    if (kb) {
      reply = answerWithKnowledge(lastCtx.subject, kb);
      topicUsed = 'knowledge_followup';
      templateKey = 'knowledge:followup';
      bot._finalizeReply(topicUsed, templateKey, channelId, true, reply);
      return reply;
    }
  }

  // === 9. Comparison ===
  if (intent.isComparison && extracted?.subjects?.length >= 2) {
    reply = answerComparison(extracted.subjects[0], extracted.subjects[1]);
    if (reply) {
      topicUsed = 'comparison';
      templateKey = 'comparison';
      bot._finalizeReply(topicUsed, templateKey, channelId, true, reply);
      return reply;
    }
  }

  // === 10. Slang reaction ===
  const slangReaction = matchSlangReaction(content);
  if (slangReaction && Math.random() < 0.5) {
    topicUsed = 'slang';
    templateKey = 'slang:reaction';
    bot._finalizeReply(topicUsed, templateKey, channelId, false, slangReaction);
    return slangReaction;
  }

  // === 11. Sarcasm detection ===
  if (detectSarcasm(content)) {
    reply = SARCASM_RESPONSES[Math.floor(Math.random() * SARCASM_RESPONSES.length)];
    topicUsed = 'sarcasm';
    templateKey = 'sarcasm';
    bot._finalizeReply(topicUsed, templateKey, channelId, false, reply);
    return reply;
  }

  // === 12. Vague reference resolution ===
  const vagueRef = resolveVagueReference(content, recentMessages);
  if (vagueRef) {
    signals.entity = vagueRef.resolvedEntity || vagueRef.resolvedSubject;
    signals.entityType = vagueRef.resolvedType;
    signals.subject = vagueRef.resolvedSubject;
  }

  // === 13. Knowledge-based answer ===
  if (intent.isQuestion && signals.entity) {
    const kb = lookupKnowledge(signals.entity);
    if (kb) {
      reply = answerWithKnowledge(signals.entity, kb);
      reply = modifyResponse(reply, inputStyle);
      topicUsed = 'knowledge';
      templateKey = `knowledge:${signals.entity}`;
      bot._finalizeReply(topicUsed, templateKey, channelId, true, reply);
      return reply;
    }
  }

  // === 12. Generic question → recommendation ===
  if (intent.isQuestion && intent.isRecommendation) {
    reply = answerGenericQuestion(content);
    if (reply) {
      topicUsed = 'generic_qa';
      templateKey = 'generic:question';
      bot._finalizeReply(topicUsed, templateKey, channelId, true, reply);
      return reply;
    }
  }

  // === 13b. Broad template selection (elevated priority) ===
  if (topics && topics.length > 0) {
    const primaryTopic = topics[0][0];
    const pool = TEMPLATES[primaryTopic];
    if (pool && pool.length > 0) {
      const feedbackFilter = (p) => bot.feedback.filterPool(p, primaryTopic);
      reply = contextAwarePick(pool, signals, feedbackFilter);
      if (reply) {
        reply = modifyResponse(reply, inputStyle);
        reply = sanitizePrefixForSentiment(reply, sentiment);
        topicUsed = primaryTopic;
        templateKey = `${primaryTopic}:${reply.substring(0, 40)}`;
        bot._finalizeReply(topicUsed, templateKey, channelId, false, reply);
        return reply?.replace(/\{user\}/g, username);
      }
    }
  }

  // === 16. Auto-learned Q&A ===
  const autoQA = bot.pairLearning.matchAutoQA(content);
  if (autoQA && Math.random() < 0.3) {
    reply = modifyResponse(autoQA.answer, inputStyle);
    topicUsed = 'auto_qa';
    templateKey = 'autoqa:community';
    bot._finalizeReply(topicUsed, templateKey, channelId, false, reply);
    return reply;
  }

  // === 17. Witty bystander / story engagement ===
  if (content.length > 50 && Math.random() < 0.3) {
    const story = engageWithStory(content);
    if (story) {
      topicUsed = 'story_engagement';
      templateKey = 'story';
      bot._finalizeReply(topicUsed, templateKey, channelId, false, story);
      return story;
    }
  }
  if (reason === 'random' || reason === 'random_contextual') {
    const bystander = generateWittyBystander(content, topics?.[0]?.[0]);
    if (bystander && Math.random() < 0.4) {
      topicUsed = 'bystander';
      templateKey = 'bystander';
      bot._finalizeReply(topicUsed, templateKey, channelId, false, bystander);
      return bystander;
    }
  }

  // === 18. Conversation flow awareness (hype) ===
  const flow = analyzeConversationFlow(recentMessages);
  if (flow?.isHype && Math.random() < 0.15) {
    const hypePool = ['the energy in here right now', 'this conversation though', 'love this chat honestly'];
    reply = hypePool[Math.floor(Math.random() * hypePool.length)];
    topicUsed = 'hype_moment';
    templateKey = 'hype';
    bot._finalizeReply(topicUsed, templateKey, channelId, false, reply);
    return reply;
  }

  // === 19. Trained pair fallback (bystander mode) ===
  const bystanderPair = bot.pairMatcher.findFallback(content);
  if (bystanderPair) {
    reply = bystanderPair.response;
    topicUsed = 'trained_pair';
    templateKey = `trained:bystander:${bot.pairStore.normalizeForMatch(content).substring(0, 30)}`;
    bot._finalizeReply(topicUsed, templateKey, channelId, false, reply);
    return reply?.replace(/\{user\}/g, username);
  }

  // === 21. Markov generation ===
  if (Math.random() < bot.config.markovChance) {
    const primaryTopic = topics?.[0]?.[0] || null;
    const seedWords = signals.subTopics?.slice(0, 2) || [];
    const markovText = bot.markov.generate(seedWords, primaryTopic, inputStyle);
    if (markovText && markovText.split(' ').length >= 3) {
      // Coherence gate via embedding
      if (bot.embedder?.isReady?.()) {
        try {
          const [inputEmb, markovEmb] = await Promise.all([
            bot.embedder.embed(content),
            bot.embedder.embed(markovText),
          ]);
          if (inputEmb && markovEmb) {
            const sim = bot.embedder.cosineSimilarity(inputEmb, markovEmb);
            if (sim < 0.25) {
              // Markov rejected — too low similarity;
            } else {
              reply = modifyResponse(markovText, inputStyle);
              topicUsed = 'markov';
              templateKey = 'markov:generated';
              bot.stats.markovReplies++;
              bot._finalizeReply(topicUsed, templateKey, channelId, false, reply);
              return reply;
            }
          }
        } catch { /* embedding failed, skip markov */ }
      } else {
        reply = modifyResponse(markovText, inputStyle);
        topicUsed = 'markov';
        templateKey = 'markov:generated';
        bot.stats.markovReplies++;
        bot._finalizeReply(topicUsed, templateKey, channelId, false, reply);
        return reply;
      }
    }
  }

  // === 19. Fallback template ===
  const fallbackPool = TEMPLATES.fallback || [];
  if (fallbackPool.length > 0) {
    reply = fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
    reply = modifyResponse(reply, inputStyle);
    topicUsed = 'fallback';
    templateKey = 'fallback';
    bot._finalizeReply(topicUsed, templateKey, channelId, false, reply);
    return reply?.replace(/\{user\}/g, username);
  }

  return null;
}

export { generateReply };