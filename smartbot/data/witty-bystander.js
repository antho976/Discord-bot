// Witty bystander mode — casual reactions when not directly addressed

export const WITTY_BYSTANDER = {
  patterns: [
    { test: /\b(?:fight|fighting|argue|arguing|beef|drama)\b/i, replies: ['*grabs popcorn*', 'the drama is premium today', 'chat is getting spicy 🌶️', 'I love free entertainment'] },
    { test: /\b(?:wrong|cap|lying|fake|sus)\b/i, replies: ['someone said it', 'the call out 💀', 'got them with the receipts', 'the truth hurts sometimes'] },
    { test: /\b(?:whos gonna tell|nobody gonna mention|are we just ignoring)\b/i, replies: ['I wasnt gonna say anything but...', 'I was thinking the same thing', 'someone had to bring it up', 'the elephant in the room 🐘'] },
    { test: /\b(?:hot take|unpopular opinion|controversial)\b/i, replies: ['this is either gonna be based or terrible', 'bold move going there', 'I respect the courage to say it', 'here we go 🍿'] },
    { test: /\b(?:ratio|L take|W take|based|mid take)\b/i, replies: ['the jury has spoken', 'chat interaction is peak content', 'democracy in action', 'the people have voted'] },
  ],
  positive_generic: [
    'good vibes in chat rn',
    'I like the energy',
    'chat is being wholesome and I appreciate it',
    'this is the content I come here for',
    'the vibes are immaculate',
  ],
  negative_generic: [
    'oof that sounds rough',
    'I felt that in my soul',
    'pain',
    'the struggle is real',
    'I cant even argue with that honestly',
  ],
  neutral_generic: [
    'interesting take honestly',
    'I see what you mean',
    'huh never thought about it that way',
    'valid point',
    'noted 📝',
    'thats a perspective for sure',
  ],
};

export function generateWittyBystander(content, sentiment) {
  const lower = content.toLowerCase();
  for (const pat of WITTY_BYSTANDER.patterns) {
    if (pat.test.test(lower)) {
      return pat.replies[Math.floor(Math.random() * pat.replies.length)];
    }
  }
  const pool = sentiment === 'negative' ? WITTY_BYSTANDER.negative_generic
    : sentiment === 'positive' ? WITTY_BYSTANDER.positive_generic
    : WITTY_BYSTANDER.neutral_generic;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function engageWithStory(content) {
  const lower = content.toLowerCase();
  const storyPatterns = [
    { test: /so (?:basically|essentially|like)\b.{20,}/i, replies: ["wait that's wild, what happened next?", "no way, keep going", "lmao then what??"] },
    { test: /(?:you won't believe|guess what|so get this)\b/i, replies: ["oh this is gonna be good", "I'm listening 👀", "spill the tea"] },
    { test: /(?:long story short|basically what happened|the thing is)\b/i, replies: ["I love where this is going", "oh boy here we go", "this already sounds chaotic"] },
  ];
  for (const pat of storyPatterns) {
    if (pat.test.test(lower)) {
      return pat.replies[Math.floor(Math.random() * pat.replies.length)];
    }
  }
  return null;
}
