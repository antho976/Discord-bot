import { scoreTemplateRelevance } from './confidence-scorer.js';
const ENTITY_CONNECTORS = {
  game: [
    '{template}, {entity} is that game', '{template}, especially {entity}',
    '{template}, {entity} specifically', '{entity} though, {template_lower}',
    'when it comes to {entity}, {template_lower}', '{template} — {entity} is exactly that',
  ],
  show: [
    '{template}, {entity} especially', '{entity} is a perfect example, {template_lower}',
    '{template} — talking about {entity} specifically',
  ],
  music: [
    '{template}, {entity} hits different', '{entity} though... {template_lower}',
    '{template} and {entity} is proof of that',
  ],
  food: [
    '{template}, especially {entity}', '{entity} specifically, {template_lower}',
    '{template} — {entity} is elite', '{template}, {entity} hits different',
    'ngl {entity} is underrated, {template_lower}',
  ],
  tech: [
    '{template}, {entity} especially', '{entity} though, {template_lower}',
    '{template} — {entity} in particular', '{template}, especially with {entity}',
    '{entity} is something else, {template_lower}',
  ],
};

const TIME_ENRICHMENTS = {
  night: ['at this hour', 'this late', 'late night', 'at night'],
  morning: ['this early', 'in the morning', 'before noon'],
  evening: ['in the evening', 'after the day'],
  weekend: ['on the weekend', 'weekend vibes'],
  marathon: ['for that long', 'nonstop like that', 'marathon style'],
  allday: ['all day like that', 'the whole day'],
};

const ACTIVITY_ENRICHMENTS = {
  grind: ['the grind is real', 'grinding it out', 'the dedication though'],
  competitive: ['in ranked especially', 'competitively like that', 'in ranked'],
  chill: ['just vibing with it', 'keeping it chill', 'cozy mode'],
  social: ['with the squad', 'with friends makes it hit different', 'the group experience'],
  solo: ['solo like that', 'by yourself though', 'the solo experience'],
  streaming: ['on stream too', 'while streaming', 'live and everything'],
  new: ['especially as a beginner', 'when youre just starting', 'the first time experience'],
  returning: ['coming back to it', 'the return arc', 'picking it back up'],
};

const CROSS_TOPIC_BRIDGES = {
  'gaming+sleep': ['gaming session turning into an all nighter', 'sleep schedule said goodbye to gaming', 'one more game ruined the sleep schedule again'],
  'gaming+food': ['gaming snacks are essential', 'pause the game for food breaks', 'eating while gaming is a skill'],
  'gaming+music': ['the right playlist makes the game 10x better', 'gaming with music on is elite', 'that games soundtrack is all you need though'],
  'gaming+stream': ['gaming content is always good', 'gaming streams hit different', 'watching someone else play is almost as fun'],
  'gaming+money': ['gaming is expensive but worth it', 'the wallet takes hits for gaming', 'gaming deals save lives'],
  'gaming+relationship': ['gaming with your partner is either bonding or divorce', 'couples who game together stay together maybe'],
  'gaming+school_work': ['gaming after homework hits different', 'should be studying but gaming wins', 'work first game later...theoretically'],
  'stream+music': ['music streams are so chill', 'stream playlist go crazy', 'the vibes when the streamer has good music taste'],
  'stream+food': ['cooking streams are underrated content', 'eating on stream is comfort content'],
  'food+sleep': ['midnight snack energy', 'food coma incoming', 'eating right before bed hits different'],
  'music+sleep': ['sleep playlist is essential', 'falling asleep to music is the move', 'lofi and sleep go together'],
  'music+mood_positive': ['good music good mood simple', 'the right song can fix anything'],
  'music+mood_negative': ['sad songs hit different sometimes', 'music for the feels'],
  'tech+gaming': ['the setup matters for gaming', 'tech upgrades for gaming are addicting', 'hardware makes the gaming experience'],
  'tech+money': ['tech is expensive but thats the tax', 'saving up for tech is a lifestyle'],
  'sports+gaming': ['sports games or actual sports tough call', 'athlete on screen athlete in game'],
  'movies_tv+food': ['movie night with snacks is the blueprint', 'watching shows while eating is peak'],
  'weather+sleep': ['rain sounds for sleeping are elite', 'cold weather makes you sleep better'],
  'weather+gaming': ['rainy day gaming sessions are the best', 'stuck inside so might as well game'],
  'food+music': ['cooking with good music on is elite', 'the right music makes the food taste better somehow'],
  'sleep+school_work': ['sleep vs homework the eternal struggle', 'pulling an all nighter for school is a rite of passage'],
  'tech+stream': ['the stream setup matters more than people think', 'tech upgrades for streaming hit different'],
  'food+school_work': ['studying requires snacks thats just science', 'brain food is a real thing'],
  'sleep+gaming': ['one more game and then sleep right? wrong', 'the sleep schedule is just a suggestion for gamers'],
};

function getCrossTopicBridge(signals) {
  if (signals.topics.length < 2) return null;
  const t1 = signals.topics[0].name;
  const t2 = signals.topics[1].name;
  const bridges = CROSS_TOPIC_BRIDGES[`${t1}+${t2}`] || CROSS_TOPIC_BRIDGES[`${t2}+${t1}`];
  if (!bridges) return null;
  return bridges[Math.floor(Math.random() * bridges.length)];
}

function enrichWithContext(template, signals, opts = {}) {
  if (!template) return template;
  let result = template;
  const lower = template.toLowerCase();
  const resultWords = new Set(lower.split(/\s+/).map(w => w.replace(/[^a-z]/g, '')).filter(Boolean));
  let enriched = false;

  let maxEnrich;
  if (signals.wordCount <= 3) maxEnrich = 0;
  else if (signals.wordCount <= 6) maxEnrich = 1;
  else maxEnrich = 2;
  if (opts.bridgeWillFollow) maxEnrich = Math.max(0, maxEnrich - 1);
  let enrichCount = 0;

  if (signals.entity && !lower.includes(signals.entity) && enrichCount < maxEnrich) {
    const connectors = ENTITY_CONNECTORS[signals.entityType] || ENTITY_CONNECTORS.game;
    if (Math.random() < 0.35) {
      const connector = connectors[Math.floor(Math.random() * connectors.length)];
      const properNounTypes = new Set(['game', 'show', 'tech', 'music']);
      const entityDisplay = properNounTypes.has(signals.entityType)
        ? signals.entity.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
        : signals.entity;
      result = connector
        .replace('{template}', result.replace(/[.!,]$/, ''))
        .replace('{template_lower}', result.charAt(0).toLowerCase() + result.slice(1).replace(/[.!,]$/, ''))
        .replace(/\{entity\}/g, entityDisplay);
      enrichCount++;
      enriched = true;
    }
  }

  if (signals.timeCue && enrichCount < maxEnrich) {
    const timeWords = TIME_ENRICHMENTS[signals.timeCue];
    if (timeWords) {
      const alreadyHasTime = timeWords.some(w => lower.includes(w.split(' ')[0]));
      const phrase = timeWords[Math.floor(Math.random() * timeWords.length)];
      const phraseWords = phrase.split(' ').map(w => w.replace(/[^a-z]/g, ''));
      const overlaps = phraseWords.filter(w => w.length >= 3 && resultWords.has(w)).length;
      if (!alreadyHasTime && overlaps === 0 && Math.random() < 0.2) {
        const joiners = enriched ? [', ', ' '] : [', ', ' especially ', ', '];
        const joiner = joiners[Math.floor(Math.random() * joiners.length)];
        result = result.replace(/[.!,]$/, '') + joiner + phrase;
        enrichCount++;
        enriched = true;
      }
    }
  }

  if (signals.activity && enrichCount < maxEnrich) {
    const actPhrases = ACTIVITY_ENRICHMENTS[signals.activity];
    if (actPhrases) {
      const phrase = actPhrases[Math.floor(Math.random() * actPhrases.length)];
      const phraseWords = phrase.split(' ').map(w => w.replace(/[^a-z]/g, ''));
      const alreadyHasAct = actPhrases.some(w => lower.includes(w.split(' ')[0]));
      const overlaps = phraseWords.filter(w => w.length >= 3 && resultWords.has(w)).length;
      if (!alreadyHasAct && overlaps === 0 && Math.random() < 0.15) {
        result = result.replace(/[.!,]$/, '') + ', ' + phrase;
        enrichCount++;
      }
    }
  }

  if (result.length > 90) {
    const lastComma = result.lastIndexOf(', ');
    const lastDash = result.lastIndexOf(' — ');
    const cutPoint = Math.max(lastComma, lastDash);
    if (cutPoint > 30 && cutPoint > template.length * 0.6) result = result.substring(0, cutPoint);
  }

  return result;
}

function pickBestTemplate(pool, signals) {
  if (!pool || pool.length === 0) return null;
  if (pool.length <= 3) return pool[Math.floor(Math.random() * pool.length)];

  const scored = pool.map((t, i) => ({
    template: t,
    score: scoreTemplateRelevance(t, signals) + (Math.random() * 1.5),
    index: i,
  }));
  scored.sort((a, b) => b.score - a.score);

  const topScore = scored[0].score;
  if (topScore < 1.5) return pool[Math.floor(Math.random() * pool.length)];

  const candidates = scored.filter(s => s.score >= topScore - 3 && s.score > 0);
  const totalWeight = candidates.reduce((sum, c) => sum + c.score, 0);
  let roll = Math.random() * totalWeight;
  for (const c of candidates) {
    roll -= c.score;
    if (roll <= 0) return c.template;
  }
  return candidates[0].template;
}

function contextAwarePick(pool, signals, feedbackFilter) {
  const filtered = feedbackFilter ? feedbackFilter(pool) : pool;
  if (!filtered || filtered.length === 0) return null;

  const template = pickBestTemplate(filtered, signals);
  if (!template) return null;

  const willBridge = signals.topics.length >= 2 && Math.random() < 0.05;
  const bridge = willBridge ? getCrossTopicBridge(signals) : null;

  let result = enrichWithContext(template, signals, { bridgeWillFollow: !!bridge });

  if (bridge && signals.wordCount > 3) {
    if (Math.random() < 0.5) {
      result = bridge.charAt(0).toUpperCase() + bridge.slice(1) + ', ' + result.charAt(0).toLowerCase() + result.slice(1);
    } else {
      result = result.replace(/[.!,]$/, '') + ' — ' + bridge;
    }
  }

  return result;
}

export {
  pickBestTemplate, contextAwarePick, enrichWithContext, getCrossTopicBridge,
  ENTITY_CONNECTORS, CROSS_TOPIC_BRIDGES, TIME_ENRICHMENTS, ACTIVITY_ENRICHMENTS,
};