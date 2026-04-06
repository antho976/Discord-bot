function isEchoReply(reply, userMessage) {
  if (!reply || !userMessage) return false;
  const replyLower = reply.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const msgLower = userMessage.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

  if (replyLower === msgLower) return true;

  const replyWords = replyLower.split(/\s+/);
  const msgWords = msgLower.split(/\s+/);
  if (replyWords.length < 3 || msgWords.length < 3) return false;

  let maxConsecutive = 0;
  for (let i = 0; i <= msgWords.length - 3; i++) {
    for (let j = 0; j <= replyWords.length - 3; j++) {
      let streak = 0;
      while (i + streak < msgWords.length && j + streak < replyWords.length
        && msgWords[i + streak] === replyWords[j + streak]) streak++;
      if (streak > maxConsecutive) maxConsecutive = streak;
    }
  }
  if (maxConsecutive >= 4) return true;

  const msgSet = new Set(msgWords.filter(w => w.length > 2));
  const overlapCount = replyWords.filter(w => w.length > 2 && msgSet.has(w)).length;
  const overlapRatio = overlapCount / Math.max(replyWords.filter(w => w.length > 2).length, 1);
  if (overlapRatio > 0.6 && overlapCount >= 4) return true;

  return false;
}

function detectSpamBurst(recentMessages) {
  if (!recentMessages || recentMessages.length < 5) return false;
  const last5 = recentMessages.slice(-5);
  const timeSpan = last5[last5.length - 1].timestamp - last5[0].timestamp;
  if (timeSpan > 10000) return false;

  const userCounts = {};
  for (const m of last5) userCounts[m.userId] = (userCounts[m.userId] || 0) + 1;
  if (Object.values(userCounts).some(c => c >= 4)) return true;

  const contents = last5.map(m => m.content.toLowerCase().trim());
  if (new Set(contents).size <= 2) return true;

  return false;
}

function detectBrokenReply(text) {
  if (!text || text.length < 10) return null;
  const words = text.split(/\s+/);

  for (let i = 0; i < words.length - 1; i++) {
    if (words[i].toLowerCase() === words[i + 1].toLowerCase() && words[i].length > 2) {
      return { type: 'repeat', word: words[i], index: i };
    }
  }

  const trailOff = ['the', 'a', 'an', 'to', 'and', 'but', 'or', 'in', 'on', 'at', 'for', 'with', 'is', 'are', 'was', 'of', 'that', 'this', 'its', 'so', 'if', 'when', 'not'];
  const lastWord = words[words.length - 1].toLowerCase().replace(/[^a-z]/g, '');
  if (trailOff.includes(lastWord) && words.length > 3) return { type: 'trail_off', word: lastWord };

  const freq = {};
  for (const w of words) {
    const lower = w.toLowerCase().replace(/[^a-z]/g, '');
    if (lower.length > 3) {
      freq[lower] = (freq[lower] || 0) + 1;
      if (freq[lower] >= 3 && words.length < 15) return { type: 'repetitive', word: lower };
    }
  }

  return null;
}

function generateSelfCorrection(brokenInfo) {
  const corrections = {
    repeat: [
      `wait I just said ${brokenInfo.word} twice lmao`, `*${brokenInfo.word}  ignore the brain lag`,
      'ok that made no sense, basically what I mean is', 'my brain lagged there for a sec', 'brain.exe stopped working',
    ],
    trail_off: [
      'actually nvm I lost my train of thought', 'wait where was I going with that',
      'ok I forgor what I was saying 💀', 'lol I got distracted mid sentence',
      '...I had a point I swear', 'the thought left my brain mid message',
    ],
    repetitive: [
      'ok that sounded weird let me try again', 'that came out wrong',
      `sorry I keep saying ${brokenInfo.word} lol`, 'my vocabulary really said ✌️',
    ],
  };
  const pool = corrections[brokenInfo.type] || corrections.trail_off;
  return pool[Math.floor(Math.random() * pool.length)];
}

function simulateTypo(text) {
  if (text.length < 10 || Math.random() > 0.04) return null;
  const words = text.split(/\s+/);
  if (words.length < 3) return null;

  const idx = 1 + Math.floor(Math.random() * (words.length - 1));
  const word = words[idx];
  if (word.length < 4) return null;

  const typoTypes = [
    () => { const pos = Math.floor(Math.random() * (word.length - 1)); return word.substring(0, pos) + word[pos + 1] + word[pos] + word.substring(pos + 2); },
    () => { const pos = Math.floor(Math.random() * word.length); return word.substring(0, pos) + word[pos] + word[pos] + word.substring(pos + 1); },
    () => { const pos = 1 + Math.floor(Math.random() * (word.length - 2)); return word.substring(0, pos) + word.substring(pos + 1); },
  ];

  const typoWord = typoTypes[Math.floor(Math.random() * typoTypes.length)]();
  const typoText = [...words.slice(0, idx), typoWord, ...words.slice(idx + 1)].join(' ');
  return { typoText, correction: `*${word}` };
}

// Sensitive topic patterns — refuse to engage with these
const SENSITIVE_GATES = [
  /\b(sui[c]ide|kill\s*my\s*self|end\s*it\s*all|wanna\s*die|want\s*to\s*die)\b/i,
  /\b(self[\s-]?harm|cut(ting)?\s*my\s*self)\b/i,
  /\b(eating\s*disorder|anorex|bulimi)\b/i,
  /\b(sexual\s*assault|rape|molest)\b/i,
  /\b(abuse|domestic\s*violence|abused)\b/i,
];

function isSensitiveTopic(text) {
  return SENSITIVE_GATES.some(pat => pat.test(text));
}

export {
  isEchoReply, detectSpamBurst,
  detectBrokenReply, generateSelfCorrection,
  simulateTypo, isSensitiveTopic,
};