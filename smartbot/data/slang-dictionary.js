// Slang reaction patterns — short messages (1-4 words) get quick reactions

export const SLANG_REACTIONS = {
  agreement: {
    triggers: /^(?:w take|w|big w|huge w|dub|fax|facts|real|so real|thats real|too real|valid|based|true|fr fr|frfr|on god|no cap|ong|say less|periodt|deadass|straight up)$/i,
    responses: [
      'Biggest W in chat today',
      'Say it louder for the people in the back',
      'Fax no printer',
      'The realest thing said all day',
      'Chat needed to hear this',
      'Preach',
      'This is the way',
      'Certified correct take',
      'Respect the honesty',
      'Speaking nothing but facts rn',
    ],
  },
  hype: {
    triggers: /^(?:lets go+|sheesh|yoo+|ayoo+|pog|poggers|pogchamp|goated|insane|no way|broo+|yooo+|holy|clutch|hits different|slaps|bussin|gas|fire)$/i,
    responses: [
      'THE ENERGY IN HERE',
      'Chat is going crazy rn',
      'The vibes are unmatched',
      'This energy is contagious fr',
      'Sheeeesh',
      'We are so locked in',
      'The hype is real today',
      'Chat woke up and chose excitement',
      'This is what we live for',
    ],
  },
  vibe: {
    triggers: /^(?:bruh moment|bruh|oof|rip|pain|big L|massive L|down bad|its over|we lost|f in chat|down horrendous|im cooked|its joever)$/i,
    responses: [
      'Pain.',
      'We take those Ls together',
      'The struggle continues',
      'Chat felt that one',
      'Moment of silence',
      'It really be like that huh',
      'The bruh-est of moments',
      'Adding this to the pain collection',
    ],
  },
  meme: {
    triggers: /^(?:ratio|cope|copium|seethe|npc|sus|sigma|grindset|main character|plot armor|canon|real and true|skibidi|gyatt|rizz|ohio|fanum tax)$/i,
    responses: [
      'The meme energy is strong with this one',
      'Chat is in peak form today',
      'Internet culture at its finest',
      'Certified internet moment',
      'The lore deepens',
      'This is going in the archives',
      'Peak chat behavior',
    ],
  },
  micro_agree: {
    triggers: /^(?:same|mood|felt that|relatable|this|exactly|yep|yup|ye|yeah|ya|bet|aight|ok bet)$/i,
    responses: [
      'Literally same',
      'Mood honestly',
      'This is the one',
      'Say less',
      'Felt that in my soul',
      'You and me both',
      'Real',
      'Chat is in sync rn',
      'Living the same life apparently',
      'Couldnt have said it better',
    ],
  },
  micro_laugh: {
    triggers: /^(?:lol|lmao|lmfao|haha|hahaha|😂|💀|dead|im dead|crying)$/i,
    responses: [
      'Actually dying',
      'Chat is too funny today',
      'I cant with yall',
      'The comedy writes itself',
      'Bro stop im dead',
      'Peak comedy hours',
      'Yall are unhinged lol',
    ],
  },
  micro_nice: {
    triggers: /^(?:nice|gg|ggs|good game|wp|well played|ez|clean|clutch|goated)$/i,
    responses: [
      'GG indeed',
      'Respect the play',
      'Clean work honestly',
      'The W was earned',
      'Thats how its done',
      'Nothing but respect',
      'Chat approves',
    ],
  },
  micro_deny: {
    triggers: /^(?:nah|nope|cap|no way|hell no|absolutely not|negative|hard pass)$/i,
    responses: [
      'Understandable honestly',
      'Fair enough',
      'Respecting the stance',
      'Noted',
      'The verdict has been delivered',
      'Chat has decided',
    ],
  },
  micro_short: {
    triggers: /^(?:L|f|F|rip|oof|yikes|welp|oh|ah|hmm|hm|damn|dang|wow|wut|wat|huh)$/i,
    responses: [
      'Big mood',
      'Thats a whole vibe',
      'I felt that',
      'The energy is palpable',
      'Chat moment',
      'Eloquent',
    ],
  },
};

export function matchSlangReaction(text) {
  const trimmed = text.trim();
  if (trimmed.split(/\s+/).length > 4) return null;
  for (const [, data] of Object.entries(SLANG_REACTIONS)) {
    if (data.triggers.test(trimmed)) {
      return data.responses[Math.floor(Math.random() * data.responses.length)];
    }
  }
  return null;
}
