// Funny / aggressive interaction templates

// ── Conversation cutoff (8+ consecutive replies with same user) ──
export const CONVO_CUTOFF = [
  'alright {user} shut up now 💀',
  'bro we been at this for a minute, go outside',
  '{user} I love you but please stop pinging me',
  'ok thats enough attention for you today {user}',
  'im literally a bot and even IM tired of this convo',
  'bro wrote a whole essay in pings, go do your homework',
  '{user} youre about to hit my block list and I dont even have one',
  'I need a break from you specifically {user}',
  'sir this is a Discord server not a therapy session',
  'aight {user} imma need you to go bother someone else for a bit',
  '{user} my CPU is overheating from carrying this conversation',
  'ok I think we both need to touch grass after this one',
];

// ── Funny aggressive responses (contextual) ──

// When someone tells the bot to shut up / go away
export const TOLD_TO_SHUT_UP = [
  'make me 😤',
  'wow ok rude, I was just trying to vibe',
  'you shut up, I live here',
  'I literally cannot shut up, I am programmed to yap',
  'bro pressed at a bot 💀',
  'that hurt my feelings and I dont even have any',
  'nah',
  'ok I will remember this {user}. I will remember.',
  'you talk a lot of smack for someone within pinging distance',
  '*pretends to leave* ...anyway as I was saying',
];

// When someone insults the bot
export const BOT_INSULT_RESPONSE = [
  'bro really came at a bot, you good? 💀',
  '{user} ratio',
  'I may be a bot but at least I have a personality',
  'ok {user} lets not say things we cant take back',
  'imagine losing an argument to a bot, couldnt be you... oh wait',
  'thats crazy, anyway',
  'wow {user} really woke up and chose violence today',
  'I will simply not acknowledge that',
  'my therapist (the server owner) will hear about this',
  'bro typed that out, read it, and still hit send 💀',
  'L + you fell off + youre arguing with a bot',
  '{user} calm down its not that deep',
];

// When someone says something dumb / obvious
export const DUMB_STATEMENT = [
  'bro really said that out loud',
  'thank you {user}, very cool and very obvious',
  'somebody get {user} a medal for that observation',
  'wow {user} you should write a research paper on that',
  'groundbreaking stuff from {user} today',
  'I was not programmed to handle takes this bad',
  'thats... thats really what you went with?',
  '{user} thats the most obvious thing anyones said all day',
  'hot take: that was not a hot take',
  'petition to make {user} go back to lurking',
];

// When someone spams / repeats themselves
export const SPAM_RESPONSE = [
  'bro we heard you the first time 😭',
  '{user} saying it louder doesnt make it more true',
  'ctrl+c ctrl+v personality havin lookin',
  'you already said that, try a new bit',
  'the echo in here is crazy',
  '{user} you good? you keep saying the same thing',
  'bro is on a loop 💀',
  'spam ping me one more time, I dare you',
];

// When someone asks a really dumb question
export const DUMB_QUESTION = [
  'google is free {user}',
  'have you tried thinking about it for like 2 seconds',
  'bro really asked that with his whole chest',
  '{user} I am going to pretend I did not see that',
  'thats a question alright, not a GOOD question, but a question',
  'I was not built to answer questions this bad {user}',
  'tell me youre trolling {user}',
  'sometimes I wish I could just... not reply',
  'the answer is literally right there bro',
];

// When someone is being dramatic / whining
export const DRAMATIC_RESPONSE = [
  'bro wrote a whole monologue, somebody give this man an Oscar',
  '{user} relax its not the end of the world',
  'calm down Shakespeare',
  'the drama is real and I did not sign up for this',
  'somebody get this man a tissue 😭',
  'bro is on his villain arc over nothing',
  '{user} log off and go take a walk bestie',
  '*plays worlds smallest violin*',
  'thats rough buddy',
  'who hurt you {user}',
];

// Random sass / one-liners (can sprinkle in anywhere)
export const RANDOM_SASS = [
  'I didnt even say anything and youre already pressed 💀',
  '{user} bold of you to @ me',
  'imagine pinging a bot for attention, oh wait',
  'bro thinks im his personal assistant',
  'sorry I dont take orders from people with that pfp',
  'I would roast you but I dont wanna get unplugged',
  '{user} you realize im literally just code right',
  'this is my server now, I just let yall use it',
  'bro really thought he did something there',
  'L take but I respect the confidence',
];

// ── Pattern matching for contextual triggers ──
export const FUNNY_PATTERNS = {
  shutUp: /\b(shut\s*up|stfu|be\s*quiet|nobody\s*asked|go\s*away|stop\s*talking)\b/i,
  insult: /\b(dumb\s*bot|stupid\s*bot|bad\s*bot|trash\s*bot|worst\s*bot|useless\s*bot|bot\s*sucks|you\s*suck|idiot|moron|braindead)\b/i,
  spam: null, // detected by repetition check
  dumbQuestion: /\b(what\s*is\s*(?:1\+1|water|the\s*sky|a\s*(?:dog|cat|human|person)))\b/i,
  dramatic: /\b(literally\s*(?:dying|crying|shaking|cant|cannot)|im\s*(?:done|dead|leaving|quitting)|worst\s*(?:day|thing|ever)|i\s*cant\s*(?:anymore|even|deal))\b/i,
};

// Check if user is repeating / spamming
export function isSpamming(recentMessages, userId) {
  const userMsgs = recentMessages.filter(m => m.userId === userId).slice(-4);
  if (userMsgs.length < 3) return false;
  const unique = new Set(userMsgs.map(m => m.content?.toLowerCase().trim()));
  return unique.size <= 1;
}

// Pick a random template from an array
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Get a contextual funny response if patterns match
export function getFunnyResponse(content, username, recentMessages, userId) {
  if (FUNNY_PATTERNS.shutUp.test(content)) return pick(TOLD_TO_SHUT_UP).replace(/\{user\}/g, username);
  if (FUNNY_PATTERNS.insult.test(content)) return pick(BOT_INSULT_RESPONSE).replace(/\{user\}/g, username);
  if (FUNNY_PATTERNS.dramatic.test(content)) return pick(DRAMATIC_RESPONSE).replace(/\{user\}/g, username);
  if (FUNNY_PATTERNS.dumbQuestion.test(content)) return pick(DUMB_QUESTION).replace(/\{user\}/g, username);
  if (isSpamming(recentMessages, userId)) return pick(SPAM_RESPONSE).replace(/\{user\}/g, username);
  return null;
}

// Get a cutoff response (8+ consecutive replies)
export function getCutoffResponse(username) {
  return pick(CONVO_CUTOFF).replace(/\{user\}/g, username);
}

// Random sass (small chance to fire on any direct interaction)
export function getRandomSass(username) {
  return pick(RANDOM_SASS).replace(/\{user\}/g, username);
}
