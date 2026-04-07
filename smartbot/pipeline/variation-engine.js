const PREFIXES = {
  agree: ['Honestly ', 'Actually ', 'Genuinely ', 'Real talk ', 'Not gonna lie ', 'For real ', 'Truthfully '],
  react: ['Wait ', 'Ok but ', 'See ', 'Look ', 'Yo ', 'Haha ', 'Man '],
  soft: ['I think ', 'I feel like ', 'In my opinion ', 'Personally ', 'To me ', 'Id say ', 'I mean ', 'Could be wrong but '],
};

const SUFFIXES = {
  emphasis: [' honestly', ' for real', ' actually', ' though'],
  filler: [' lol', ' haha', ' I think'],
  hype: [' 🔥', ' 💪', ' W'],
  chill: [' just saying', ' its all good', ' you know how it is'],
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

  let prefixChance = 0.15;
  let suffixChance = 0.12;
  let preferredPrefix = null;
  let preferredSuffix = null;
  if (inputStyle === 'hype' || inputStyle === 'energetic') {
    prefixChance = 0.25; suffixChance = 0.2;
    preferredPrefix = 'react'; preferredSuffix = 'hype';
  } else if (inputStyle === 'chill' || inputStyle === 'minimal') {
    prefixChance = 0.12; suffixChance = 0.15;
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

  return base;
}

export { modifyResponse, sanitizePrefixForSentiment, PREFIXES, SUFFIXES };