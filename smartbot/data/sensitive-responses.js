// Sensitive & empathetic responses

export const SENSITIVE_PATTERNS = /\b(?:passed away|died|death|funeral|cancer|diagnosed|rip\b.*(?:pet|cat|dog|mom|dad|friend|brother|sister)|lost my|lost a|passed on|gone forever|in the hospital|suicide|kill myself)\b/i;
export const SENSITIVE_KEYWORDS = /\b(?:passed away|died|passing|grief|grieving|mourning)\b/i;

export const SENSITIVE_RESPONSES = [
  'Im really sorry to hear that 🫂',
  'Thats really tough, Im sorry',
  'Sending you all the love right now ❤️',
  'Im so sorry, thats heartbreaking',
  'I dont even know what to say, just know were here for you',
  'Thats awful, Im truly sorry',
  'Take all the time you need, were here',
  'My heart goes out to you honestly',
  'Thats so hard, Im sorry youre going through this',
  'No words can fix that but just know people care about you',
];

export const CELEBRATION_PATTERN = /\b(?:got promoted|promotion|got accepted|accepted into|got the job|got hired|new job|graduated|passed (?:my|the) (?:exam|test|finals)|won (?:a |the )?(?:tournament|competition|award|prize|match|game)|got engaged|getting married|having a baby|new house|moved in|first car|license|certified|published|accomplished)\b/i;
export const GAMING_CONTEXT_PATTERN = /\b(?:valorant|fortnite|league|apex|overwatch|minecraft|csgo|cs2|dota|cod|warzone|pubg|rocket league|smash|elden ring|genshin|ranked|elo|mmr|scrims|esports)\b/i;

export const CELEBRATION_RESPONSES = [
  'LETS GOOO thats amazing congrats!! 🎉',
  'No way thats huge!! Congrats fr fr 🔥',
  'W after W you deserve this honestly',
  'Thats such a big deal congrats!! 🥳',
  'The hard work paid off lets go!!',
  'Chat we need to celebrate this 🎉',
  'Massive W congrats!! You earned it',
  'Thats incredible actually, so happy for you',
  'The comeback story is real, congrats!!',
  'You dropped this 👑 congrats!!',
  'Achievement unlocked fr, thats awesome',
  'This is the kind of news chat needed today 🙌',
];
