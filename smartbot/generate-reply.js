import { detectTopics } from './data/topics.js';
import { analyzeSentiment } from './utils/sentiment.js';
import { extractSubject } from './utils/subject-extractor.js';
import { lookupKnowledge } from './data/knowledge-base.js';
import { TEMPLATES } from './data/templates.js';
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
import { handleQuoteCommand } from './quotes/quote-commands.js';

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
  const lastCtx = bot._lastConversationContext.get(channelId);
  if (lastCtx && Date.now() - lastCtx.timestamp < 120000 && reason !== 'mention') {
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

  // === 5. Direct interaction → AI response ===
  if (decision.isDirect && bot.ai.shouldUseAI()) {
    const personality = bot.config.personality || 'chill';
    const channelCtx = {
      recentTopics: bot.memory.getRecentTopics(channelId),
      conversationHistory: bot.conversationTracker.getThread(channelId, userId),
    };
    try {
      reply = await bot.ai.generateReply(content, username, personality, channelCtx);
      if (reply) {
        topicUsed = 'ai_direct';
        templateKey = 'ai:direct';
        bot._finalizeReply(topicUsed, templateKey, channelId, false, reply);
        return reply;
      }
    } catch { /* AI failed, continue to other strategies */ }
  }

  // === 6. Trained pairs (highest priority for curated responses) ===
  bot.pairMatcher.setChannel(channelId);
  const trainedMatch = bot.pairMatcher.find(content, topics);
  if (trainedMatch) {
    reply = modifyResponse(trainedMatch.response, inputStyle);
    if (reply && Math.random() < 0.15 && topics?.[0]) {
      const topicName = topics[0][0];
      if (!reply.toLowerCase().includes(topicName) && recentMessages.length > 3) {
        reply += `, chat's been talking about ${topicName}`;
      }
    }
    topicUsed = 'trained_pair';
    templateKey = `trained:${bot.pairStore.normalizeForMatch(content).substring(0, 40)}`;
    bot._finalizeReply(topicUsed, templateKey, channelId, false, reply);
    bot.learningLog.log('trained_pair', `Used trained response for: "${content.substring(0, 60)}"`);
    return reply?.replace(/\{user\}/g, username);
  }

  // === 7. Quote command ===
  if (/^!quote/i.test(content)) {
    // (moved to top-level import)
    return handleQuoteCommand(bot.quoteManager, content, username);
  }

  // === 8. "Tell me more" follow-up ===
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

  // === 14. Learned knowledge ===
  if (signals.subject && bot.learnedKnowledge.has(signals.subject)) {
    const opinion = bot.learnedKnowledge.getOpinion(signals.subject);
    if (opinion && Math.random() < 0.5) {
      reply = modifyResponse(opinion, inputStyle);
      topicUsed = 'learned_knowledge';
      templateKey = `learned:${signals.subject}`;
      bot._finalizeReply(topicUsed, templateKey, channelId, true, reply);
      return reply;
    }
  }

  // === 15. Generic question → recommendation ===
  if (intent.isQuestion && intent.isRecommendation) {
    reply = answerGenericQuestion(content);
    if (reply) {
      topicUsed = 'generic_qa';
      templateKey = 'generic:question';
      bot._finalizeReply(topicUsed, templateKey, channelId, true, reply);
      return reply;
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
  if (flow?.isHype && Math.random() < 0.4) {
    const hypePool = ['LETS GOOOO', 'the energy rn 🔥🔥', 'chat is going off rn', 'this convo is elite', 'vibe check: passed ✅'];
    reply = hypePool[Math.floor(Math.random() * hypePool.length)];
    topicUsed = 'hype_moment';
    templateKey = 'hype';
    bot._finalizeReply(topicUsed, templateKey, channelId, false, reply);
    return reply;
  }

  // === 19. Trained pair fallback (bystander mode) ===
  const bystanderPair = bot.pairMatcher.findFallback(content);
  if (bystanderPair) {
    reply = modifyResponse(bystanderPair.response, inputStyle);
    topicUsed = 'trained_pair';
    templateKey = `trained:bystander:${bot.pairStore.normalizeForMatch(content).substring(0, 30)}`;
    bot._finalizeReply(topicUsed, templateKey, channelId, false, reply);
    return reply?.replace(/\{user\}/g, username);
  }

  // === 20. Topic-based template selection ===
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
              bot.learningLog.log('markov_rejected', `Markov rejected (sim=${sim.toFixed(3)}): "${markovText.substring(0, 40)}"`);
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

  // === 22. AI fallback for direct mentions ===
  if (decision.isDirect && bot.ai.shouldUseAI()) {
    try {
      reply = await bot.ai.generateReply(content, username, bot.config.personality || 'chill');
      if (reply) {
        topicUsed = 'ai_fallback';
        templateKey = 'ai:fallback';
        bot._finalizeReply(topicUsed, templateKey, channelId, false, reply);
        return reply;
      }
    } catch { /* AI failed */ }
  }

  // === 23. Fallback template ===
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