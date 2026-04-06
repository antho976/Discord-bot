const PREFIXES = {
  agree: ['Honestly ', 'Lowkey ', 'Ngl ', 'Fr ', 'Tbh ', 'Actually ', 'Legit ', 'Deadass ', 'Straight up ', 'Real talk ', 'No joke ', 'Not gonna lie ', 'On god ', 'For real ', 'Genuinely ', 'Truthfully ', 'Unironically '],
  react: ['Bro ', 'Bruh ', 'Yo ', 'Dude ', 'Lol ', 'Lmao ', 'Haha ', 'Omg ', 'Wait ', 'Ok but ', 'Nah but ', 'See ', 'Look ', 'Ayo ', 'Sheesh ', 'Dawg ', 'Man ', 'Fam '],
  soft: ['I think ', 'I feel like ', 'Imo ', 'In my opinion ', 'Personally ', 'To me ', 'Id say ', 'I mean ', 'Like ', 'Kinda ', 'Lowkey ', 'Maybe its just me but ', 'Could be wrong but ', 'Not sure but ', 'I might be biased but '],
};

const SUFFIXES = {
  emphasis: [' fr', ' ngl', ' tbh', ' honestly', ' no cap', ' for real', ' lowkey', ' actually', ' tho', ' though', ' not gonna lie', ' on god', ' deadass', ' straight up', ' fs', ' frfr', ' ong'],
  filler: [' lol', ' lmao', ' haha', ' 😂', ' 💀', ' 😭', ' bruh', ' dawg', ' man', ' bro', ' fr tho', ' im ngl', ' istg', ' idk'],
  hype: [' 🔥', ' 🔥🔥', ' 💪', ' lets gooo', ' sheesh', ' W', ' 🫡', ' ‼️', ' 😤', ' no cap 🔥', ' goated', ' elite', ' bussin'],
  chill: [' ya know', ' just saying', ' idk man', ' whatever tho', ' its all good', ' no worries', ' vibing', ' its whatever', ' i guess', ' you know how it is', ' thats just how it is'],
};

const UNSAFE_SAD_PREFIXES = /^(?:Lmao|Lol|Haha|Bruh|Bro|Dude|Sheesh|Ayo|Dawg|Omg|Yo|Fam|Man|Nah but) /i;

function sanitizePrefixForSentiment(text, sentiment) {
  if (sentiment !== 'negative') return text;
  if (UNSAFE_SAD_PREFIXES.test(text)) {
    text = text.replace(UNSAFE_SAD_PREFIXES, '');
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }
  return text;
}

function modifyResponse(base, inputStyle) {
  const baseLower = base.toLowerCase();

  let prefixChance = 0.4;
  let suffixChance = 0.3;
  let preferredPrefix = null;
  let preferredSuffix = null;
  if (inputStyle === 'hype' || inputStyle === 'energetic') {
    prefixChance = 0.5; suffixChance = 0.45;
    preferredPrefix = 'react'; preferredSuffix = 'hype';
  } else if (inputStyle === 'chill' || inputStyle === 'minimal') {
    prefixChance = 0.3; suffixChance = 0.35;
    preferredPrefix = 'soft'; preferredSuffix = 'chill';
  }

  if (Math.random() < prefixChance) {
    const prefixType = preferredPrefix && Math.random() < 0.6
      ? preferredPrefix : ['agree', 'react', 'soft'][Math.floor(Math.random() * 3)];
    const prefix = PREFIXES[prefixType][Math.floor(Math.random() * PREFIXES[prefixType].length)];
    if (!base.match(/^(Bro|Bruh|Yo|Dude|Ngl|Honestly|Lowkey|Fr|Tbh|Lol|Lmao|I think|Imo)/i)) {
      const prefixWord = prefix.trim().toLowerCase().split(' ')[0];
      if (!baseLower.includes(prefixWord) || prefixWord.length <= 2) {
        base = prefix + base.charAt(0).toLowerCase() + base.slice(1);
      }
    }
  }

  if (Math.random() < suffixChance) {
    const suffixType = preferredSuffix && Math.random() < 0.6
      ? preferredSuffix : ['emphasis', 'filler', 'chill', 'hype'][Math.floor(Math.random() * 4)];
    const suffix = SUFFIXES[suffixType][Math.floor(Math.random() * SUFFIXES[suffixType].length)];
    const suffixWord = suffix.trim().toLowerCase().replace(/[^a-z]/g, '');
    const alreadyHas = suffixWord.length > 1 && baseLower.includes(suffixWord);
    const lastChar = base.slice(-3);
    if (!alreadyHas && !suffix.trim().startsWith(lastChar.trim()) && !base.endsWith(suffix.trim())) {
      base = base.replace(/[.!,]$/, '') + suffix;
    }
  }

  base = base.replace(/\.\s*$/, '');

  if (Math.random() < 0.35 && !/[🔥⚡💀😂😭🎮]/.test(base)) {
    base = base.toLowerCase();
  }

  return base;
}

export { modifyResponse, sanitizePrefixForSentiment, PREFIXES, SUFFIXES };