const TOPIC_EMOJIS = {
  gaming: ['🎮', '🕹️', '👾'], music: ['🎵', '🎶', '🎤'],
  food: ['🍕', '🍔', '🍳'], anime: ['⚔️', '✨', '🔥'],
  movies: ['🎬', '🍿', '📺'], sports: ['⚽', '🏀', '🏆'],
  tech: ['💻', '🤖', '⚡'], pets: ['🐱', '🐶', '🐾'],
  stream: ['📺', '🎥', '🔴'], meme: ['💀', '😭', '🤣'],
  art: ['🎨', '✏️', '🖼️'], school: ['📚', '✏️', '🎓'],
  work: ['💼', '😤', '☕'], fitness: ['💪', '🏋️', '🔥'],
  weather: ['☀️', '🌧️', '❄️'],
  mood_positive: ['😄', '🔥', '✨', '💯'],
  mood_negative: ['😔', '💀', '😤'],
  greeting: ['👋', '✌️'],
};

const SENTIMENT_EMOJIS = {
  positive: ['🔥', '💯', '✨', 'W', '😤'],
  negative: ['😔', 'F', '💀', '😭'],
  neutral: ['👀', '🤔', '💭'],
};

const FOLLOW_UP_RESPONSES = {
  agree: [
    'Right? Glad someone gets it', 'See thats what Im saying',
    'We on the same wavelength fr', 'Great minds think alike honestly',
    'Exactly bro thank you', 'This is why I said it, someone had to',
    'I knew I wasnt the only one thinking that', 'Finally someone with taste lol',
    'W take recognizing a W take', 'Facts on facts right there',
  ],
  disagree: [
    'Fair enough everyone got their own take', 'I can see that angle actually',
    'Agree to disagree I guess lol', 'Hmm you might have a point there ngl',
    'Different strokes for different folks', 'Ok I respect that even if I dont fully agree',
    'Thats valid I can see the other side', 'You make a fair point there honestly',
    'Aight I hear you, maybe I was too harsh', 'Ok ok I can respect a different perspective',
  ],
  question: [
    'Hmm honestly its just one of those things you gotta experience yourself',
    'Good question tbh, I just go off vibes mostly',
    'Hard to explain but like {subject} just has that certain something you know',
    'Tbh its more of a gut feeling than anything logical',
    'I mean when you try {subject} youll understand what I mean',
    'Its one of those things where once you get into it it clicks',
    'I could go into it but honestly just check it out yourself',
    'Let me think... yeah I just think {subject} hits different when you experience it',
  ],
  amused: [
    'I try to keep it entertaining lol', 'At least someone appreciates my takes haha',
    'I aim to please 😂', 'My humor is underrated honestly',
    'Im here all day folks', 'The comedic genius strikes again lol',
    'I have my moments what can I say',
  ],
  redirect: [
    'Ooh {match} is a whole different conversation', 'Hmm {match}? That actually changes things',
    'Oh if we talking about {match} then thats another story',
    'Good point bringing up {match}, let me think on that', '{match} is interesting too honestly',
  ],
  counter: [
    'Hmm you raise a good point with that', 'Ok I can see that side too honestly',
    'Fair counter tbh I didnt think about it that way',
    'Thats a valid point, maybe its not so black and white',
    'You know what, youre not wrong there', 'I hear that, its more nuanced than I made it sound',
  ],
  relate: [
    'We really on the same page huh', 'See this is why I love this chat',
    'Twin behavior honestly', 'Connection right there fr',
    'We share a brain cell I think lol', 'The vibes are immaculate rn',
    'This is the unity we need honestly',
  ],
  surprise: [
    'Yeah for real, thats genuinely how I feel about it',
    'Dead serious, thats my actual take', '100% I stand by that',
    'I know it might sound wild but yeah thats where Im at',
    'Listen Ive given this some thought and yeah Im confident on that one',
    'You heard me right lol',
  ],
};

function pickFollowUp(type, subject, match) {
  const pool = FOLLOW_UP_RESPONSES[type] || FOLLOW_UP_RESPONSES.agree;
  let reply = pool[Math.floor(Math.random() * pool.length)];
  if (subject) reply = reply.replace(/\{subject\}/g, subject);
  if (match) reply = reply.replace(/\{match\}/g, match);
  return reply;
}

export { TOPIC_EMOJIS, SENTIMENT_EMOJIS, FOLLOW_UP_RESPONSES, pickFollowUp };