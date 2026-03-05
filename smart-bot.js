/**
 * SmartBot — Local AI chat engine
 * Combines topic detection, Markov chains, sentiment analysis,
 * channel memory, and smart templates for on-topic replies.
 * No external API needed.
 */

// ======================== MARKOV CHAIN ENGINE ========================

class MarkovChain {
  constructor() {
    this.chain = new Map();   // "w1 w2" → ["w3", ...]
    this.starters = [];       // sentence starters
    this.totalTrained = 0;
    this.maxChainSize = 50000; // prevent unbounded memory
  }

  train(text) {
    if (!text || text.length < 5) return;
    // Skip URLs, commands, emoji-only messages
    if (/^[!\/]/.test(text)) return;
    if (/^https?:\/\//.test(text)) return;

    const cleaned = text
      .replace(/<a?:\w+:\d+>/g, '')       // remove custom discord emotes
      .replace(/<@!?\d+>/g, '')            // remove mentions
      .replace(/https?:\/\/\S+/g, '')      // remove URLs
      .trim();

    if (cleaned.length < 5) return;

    const words = cleaned.split(/\s+/).filter(w => w.length > 0);
    if (words.length < 3) return;

    // Prune if too large
    if (this.chain.size > this.maxChainSize) {
      const keys = [...this.chain.keys()];
      for (let i = 0; i < 5000; i++) {
        this.chain.delete(keys[i]);
      }
    }

    this.starters.push(`${words[0]} ${words[1]}`);
    if (this.starters.length > 2000) this.starters = this.starters.slice(-1000);

    for (let i = 0; i < words.length - 2; i++) {
      const key = `${words[i]} ${words[i + 1]}`;
      if (!this.chain.has(key)) this.chain.set(key, []);
      this.chain.get(key).push(words[i + 2]);
    }
    this.totalTrained++;
  }

  generate(maxWords = 20, seedWords = null) {
    if (this.chain.size < 10) return null;

    let current = null;

    // Try to use seed words from the topic
    if (seedWords && seedWords.length > 0) {
      for (const seed of seedWords) {
        const lower = seed.toLowerCase();
        const matching = [...this.chain.keys()].filter(k =>
          k.toLowerCase().includes(lower)
        );
        if (matching.length > 0) {
          current = matching[Math.floor(Math.random() * matching.length)];
          break;
        }
      }
    }

    // Fallback to random starter
    if (!current) {
      if (this.starters.length === 0) return null;
      current = this.starters[Math.floor(Math.random() * this.starters.length)];
    }

    const result = current.split(' ');

    for (let i = 0; i < maxWords; i++) {
      const next = this.chain.get(current);
      if (!next || next.length === 0) break;
      const word = next[Math.floor(Math.random() * next.length)];
      result.push(word);
      current = `${current.split(' ')[1]} ${word}`;
    }

    // Clean up the result
    let text = result.join(' ').trim();
    // Capitalize first letter
    if (text.length > 0) text = text[0].toUpperCase() + text.slice(1);

    return text.length > 3 ? text : null;
  }

  getStats() {
    return {
      chainSize: this.chain.size,
      starterCount: this.starters.length,
      totalTrained: this.totalTrained
    };
  }

  toJSON() {
    // Save a compact version (last 10000 chain entries + 500 starters)
    const entries = [...this.chain.entries()].slice(-10000);
    return {
      chain: entries,
      starters: this.starters.slice(-500),
      totalTrained: this.totalTrained
    };
  }

  loadFromJSON(data) {
    if (!data) return;
    if (data.chain) {
      this.chain = new Map(data.chain);
    }
    if (data.starters) {
      this.starters = data.starters;
    }
    if (data.totalTrained) {
      this.totalTrained = data.totalTrained;
    }
  }
}

// ======================== TOPIC DETECTION ========================

const TOPICS = {
  gaming: {
    keywords: ['game', 'gaming', 'play', 'playing', 'games', 'gamer', 'controller', 'console',
      'pc', 'steam', 'xbox', 'playstation', 'ps5', 'ps4', 'nintendo', 'switch',
      'fps', 'mmo', 'mmorpg', 'rpg', 'pvp', 'pve', 'raid', 'dungeon', 'boss',
      'loot', 'drop', 'grind', 'level', 'rank', 'ranked', 'elo', 'mmr',
      'fortnite', 'valorant', 'minecraft', 'league', 'lol', 'apex', 'cod',
      'warzone', 'overwatch', 'gta', 'elden ring', 'zelda', 'mario',
      'diablo', 'wow', 'dota', 'csgo', 'cs2', 'pubg', 'roblox', 'rust',
      'tarkov', 'destiny', 'halo', 'smash', 'pokemon', 'palworld',
      'souls', 'soulslike', 'roguelike', 'indie', 'aaa', 'early access',
      'respawn', 'spawn', 'checkpoint', 'save', 'loadout', 'build',
      'nerf', 'buff', 'patch', 'update', 'dlc', 'expansion', 'mod',
      'speedrun', 'no hit', 'permadeath', 'hardcore', 'survival',
      'crafting', 'inventory', 'weapon', 'armor', 'shield', 'sword',
      'headshot', 'clutch', 'ace', 'pentakill', 'carry', 'feed',
      'noob', 'pro', 'tryhard', 'casual', 'sweat', 'meta', 'op',
      'npc', 'quest', 'mission', 'campaign', 'story mode', 'coop', 'co-op',
      'multiplayer', 'singleplayer', 'open world', 'sandbox',
      'battle royale', 'respawning', 'killstreak', 'combo', 'parry',
      'dodge roll', 'iframe', 'hitbox', 'cooldown', 'ability', 'ultimate',
      'tank', 'healer', 'dps', 'support', 'aggro', 'kiting', 'ganking',
      'farming', 'jungling', 'roaming', 'flanking', 'camping', 'rushing',
      'strat', 'callout', 'comms', 'teamwork', 'solo queue', 'premade',
      'smurf', 'boosting', 'leaderboard', 'season pass', 'battle pass',
      'skin', 'cosmetic', 'emote wheel', 'loot box', 'gacha',
      'remaster', 'remake', 'port', 'optimization', 'performance',
      'frame drops', 'stuttering', 'input lag', 'aim assist', 'crosshair',
      'sensitivity', 'keybinds', 'macro', 'controller aim', 'mnk',
      'lethal company', 'helldivers', 'baldurs gate', 'bg3', 'starfield',
      'cyberpunk', 'witcher', 'final fantasy', 'ff14', 'ffxiv',
      'dead by daylight', 'dbd', 'phasmophobia', 'satisfactory',
      'stardew', 'terraria', 'hollow knight', 'silksong', 'celeste',
      'hades', 'risk of rain', 'deep rock', 'sea of thieves',
      'escape from tarkov', 'hunt showdown', 'the finals', 'xdefiant',
      'wuthering waves', 'zenless zone zero', 'genshin', 'honkai'],
    weight: 1.5
  },
  stream: {
    keywords: ['stream', 'streaming', 'streamer', 'live', 'twitch', 'youtube',
      'vod', 'clip', 'chat', 'viewer', 'viewers', 'sub', 'subs', 'subscribe',
      'follow', 'follower', 'donation', 'dono', 'bits', 'gifted',
      'emote', 'emotes', 'channel', 'channel points', 'raid',
      'host', 'hosting', 'going live', 'went live', 'offline',
      'schedule', 'next stream', 'last stream', 'content', 'content creator',
      'obs', 'bitrate', 'fps', 'dropped frames', 'webcam', 'mic',
      'overlay', 'alerts', 'tts', 'text to speech', 'nightbot', 'streamlabs',
      'affiliate', 'partner', 'irl', 'just chatting', 'category',
      'subathon', 'marathon stream', 'charity stream', 'collab',
      'co-stream', 'watchparty', 'watch party', 'react', 'reacting',
      'highlight', 'montage', 'compilations', 'stream sniper',
      'backseat', 'backseating', 'mod', 'moderator', 'vip',
      'hype train', 'prediction', 'predictions', 'channel rewards',
      'bttv', 'ffz', '7tv', 'subscriber', 'tier 1', 'tier 2', 'tier 3',
      'prime sub', 'prime gaming', 'drops', 'watch time'],
    weight: 1.3
  },
  music: {
    keywords: ['music', 'song', 'songs', 'album', 'artist', 'band', 'singer',
      'rap', 'hiphop', 'hip hop', 'rock', 'metal', 'pop', 'jazz', 'edm',
      'playlist', 'spotify', 'soundcloud', 'beat', 'beats', 'bass',
      'guitar', 'drums', 'piano', 'vocals', 'lyrics', 'verse', 'chorus',
      'fire', 'banger', 'slaps', 'vibe', 'vibes', 'vibing',
      'concert', 'tour', 'festival', 'dj', 'producer', 'remix',
      'apple music', 'tidal', 'vinyl', 'record', 'mixtape', 'ep',
      'single', 'feature', 'feat', 'collab', 'freestyle',
      'trap', 'drill', 'r&b', 'rnb', 'country', 'punk', 'grunge',
      'techno', 'house', 'dubstep', 'dnb', 'drum and bass', 'lo-fi', 'lofi',
      'classical', 'orchestra', 'symphony', 'acoustic', 'unplugged',
      'karaoke', 'singing', 'vocalist', 'cover', 'sample', 'instrumental',
      'headphones', 'speakers', 'subwoofer', 'audio', 'audiophile',
      'drop', 'hook', 'bridge', 'outro', 'intro', 'adlib',
      'grammy', 'billboard', 'top 40', 'charts', 'number one',
      'kendrick', 'drake', 'taylor swift', 'kanye', 'travis scott',
      'weeknd', 'sza', 'doja cat', 'bad bunny', 'metro boomin'],
    weight: 1.0
  },
  food: {
    keywords: ['food', 'eat', 'eating', 'hungry', 'starving', 'cook', 'cooking',
      'recipe', 'dinner', 'lunch', 'breakfast', 'snack', 'snacks',
      'pizza', 'burger', 'fries', 'chicken', 'steak', 'sushi', 'ramen',
      'taco', 'noodles', 'rice', 'pasta', 'salad', 'soup',
      'coffee', 'tea', 'drink', 'drinks', 'beer', 'water',
      'restaurant', 'takeout', 'delivery', 'fast food', 'mcdonalds',
      'delicious', 'yummy', 'tasty', 'gross', 'mid',
      'baking', 'grill', 'grilling', 'bbq', 'barbecue', 'smoker',
      'wings', 'ribs', 'brisket', 'nachos', 'quesadilla', 'burrito',
      'sandwich', 'sub', 'wrap', 'hotdog', 'corndog',
      'ice cream', 'cake', 'cookies', 'brownies', 'donuts', 'pancakes',
      'waffles', 'cereal', 'oatmeal', 'smoothie', 'milkshake',
      'soda', 'juice', 'energy drink', 'monster', 'redbull', 'gfuel',
      'chipotle', 'chick fil a', 'wendys', 'taco bell', 'kfc',
      'doordash', 'ubereats', 'grubhub', 'uber eats',
      'vegan', 'vegetarian', 'keto', 'diet', 'calories', 'macros',
      'meal prep', 'leftovers', 'microwave', 'air fryer', 'instant pot',
      'spicy', 'mild', 'sauce', 'hot sauce', 'seasoning', 'garlic',
      'cheese', 'bacon', 'egg', 'avocado', 'chocolate', 'peanut butter'],
    weight: 1.0
  },
  tech: {
    keywords: ['code', 'coding', 'programming', 'developer', 'dev', 'software',
      'javascript', 'python', 'java', 'html', 'css', 'react', 'node',
      'api', 'database', 'server', 'deploy', 'git', 'github',
      'bug', 'debug', 'error', 'crash', 'fix', 'feature',
      'computer', 'laptop', 'phone', 'iphone', 'android', 'app',
      'ai', 'artificial intelligence', 'machine learning', 'gpt', 'chatgpt',
      'wifi', 'internet', 'download', 'upload', 'browser', 'chrome',
      'windows', 'mac', 'linux', 'gpu', 'cpu', 'ram', 'ssd',
      'monitor', 'keyboard', 'mouse', 'setup', 'build', 'specs',
      'rgb', 'overclock', 'benchmark', 'bottleneck',
      'typescript', 'rust', 'golang', 'swift', 'kotlin', 'csharp',
      'docker', 'kubernetes', 'cloud', 'aws', 'azure', 'devops',
      'frontend', 'backend', 'fullstack', 'framework', 'library',
      'algorithm', 'data structure', 'leetcode', 'hackerrank',
      'nvidia', 'amd', 'intel', 'rtx', 'radeon', 'ryzen',
      'ultrawide', 'dual monitor', '4k', '1440p', '144hz', '240hz',
      'mechanical', 'custom keyboard', 'switches', 'keycaps',
      'headset', 'microphone', 'webcam', 'deskmat', 'cable management',
      'homelab', 'nas', 'raspberry pi', 'arduino', 'linux distro',
      'terminal', 'command line', 'open source', 'ide', 'vscode',
      'stackoverflow', 'reddit', 'hackathon', 'startup',
      'cybersecurity', 'vpn', 'encryption', 'hacker', 'password',
      'tablet', 'ipad', 'smartwatch', 'earbuds', 'airpods',
      'router', 'ethernet', 'fiber', 'ping', 'latency', 'bandwidth'],
    weight: 1.0
  },
  movies_tv: {
    keywords: ['movie', 'movies', 'film', 'show', 'tv', 'series', 'anime',
      'netflix', 'disney', 'hbo', 'hulu', 'crunchyroll', 'prime video',
      'watch', 'watching', 'binge', 'binged', 'season', 'episode',
      'spoiler', 'spoilers', 'trailer', 'release', 'sequel', 'prequel',
      'horror', 'comedy', 'action', 'thriller', 'sci-fi', 'fantasy',
      'marvel', 'dc', 'star wars', 'lotr', 'lord of the rings',
      'actor', 'actress', 'director', 'cinematography',
      'manga', 'weeb', 'waifu', 'shonen', 'isekai', 'mha', 'aot',
      'one piece', 'naruto', 'dragonball', 'jujutsu', 'demon slayer',
      'studio ghibli', 'miyazaki', 'chainsaw man', 'spy x family',
      'solo leveling', 'blue lock', 'vinland saga', 'frieren',
      'oscar', 'golden globe', 'emmy', 'award', 'nomination',
      'box office', 'blockbuster', 'flop', 'underrated', 'overrated',
      'documentary', 'docuseries', 'true crime', 'reality tv',
      'sitcom', 'drama', 'romance', 'romcom', 'animated', 'pixar',
      'dreamworks', 'a24', 'nolan', 'tarantino', 'scorsese', 'spielberg',
      'screenplay', 'writing', 'plot hole', 'twist ending', 'cliffhanger',
      'mid-credits', 'post-credits', 'after credits', 'reboot',
      'casting', 'adaptation', 'live action', 'cgi', 'vfx', 'practical effects',
      'subtitles', 'dubbed', 'original', 'soundtrack', 'score',
      'binge worthy', 'masterpiece', 'classic', 'cult classic',
      'streaming service', 'apple tv', 'peacock', 'paramount plus', 'max'],
    weight: 1.0
  },
  sports: {
    keywords: ['sports', 'football', 'soccer', 'basketball', 'baseball', 'hockey',
      'nfl', 'nba', 'mlb', 'nhl', 'mls', 'ufc', 'mma', 'boxing',
      'goal', 'score', 'touchdown', 'dunk', 'slam', 'knockout',
      'team', 'player', 'coach', 'season', 'playoffs', 'finals',
      'championship', 'trophy', 'mvp', 'goat', 'draft',
      'gym', 'workout', 'lift', 'lifting', 'gains', 'cardio',
      'run', 'running', 'marathon', 'fitness', 'exercise',
      'tennis', 'golf', 'cricket', 'rugby', 'volleyball', 'swimming',
      'olympics', 'world cup', 'super bowl', 'world series',
      'formula 1', 'f1', 'nascar', 'motorsport', 'racing',
      'esports', 'competitive', 'tournament', 'bracket', 'grand finals',
      'transfer', 'free agent', 'trade', 'contract', 'salary cap',
      'jersey', 'stadium', 'arena', 'halftime', 'overtime', 'penalty',
      'foul', 'red card', 'yellow card', 'offside', 'referee',
      'bench press', 'squat', 'deadlift', 'pull ups', 'push ups',
      'protein', 'creatine', 'pre workout', 'bulk', 'cut', 'shred',
      'personal record', 'pr', 'one rep max', 'rep', 'set',
      'yoga', 'stretching', 'recovery', 'rest day', 'active recovery',
      'crossfit', 'calisthenics', 'hiit', 'bodybuilding', 'powerlifting'],
    weight: 1.0
  },
  pets_animals: {
    keywords: ['dog', 'dogs', 'puppy', 'pupper', 'doggo', 'cat', 'cats', 'kitten', 'kitty',
      'pet', 'pets', 'animal', 'animals', 'bird', 'fish', 'hamster', 'rabbit', 'bunny',
      'snake', 'lizard', 'reptile', 'parrot', 'turtle', 'tortoise', 'ferret',
      'vet', 'veterinarian', 'adoption', 'rescue', 'shelter', 'breed',
      'walk', 'fetch', 'treat', 'treats', 'belly rubs', 'zoomies', 'boop',
      'meow', 'woof', 'bark', 'purr', 'howl', 'chirp',
      'cute', 'adorable', 'fluffy', 'chonky', 'chonk', 'smol',
      'golden retriever', 'german shepherd', 'husky', 'corgi', 'poodle',
      'siamese', 'tabby', 'maine coon', 'persian', 'bengal',
      'aquarium', 'terrarium', 'cage', 'leash', 'collar', 'toy',
      'wildlife', 'nature', 'safari', 'zoo', 'ocean', 'marine'],
    weight: 1.1
  },
  weather: {
    keywords: ['weather', 'rain', 'raining', 'rainy', 'snow', 'snowing', 'snowy',
      'sunny', 'sun', 'hot', 'cold', 'freezing', 'warm', 'humid',
      'storm', 'thunder', 'lightning', 'tornado', 'hurricane',
      'wind', 'windy', 'cloudy', 'clouds', 'fog', 'foggy', 'hail',
      'temperature', 'degrees', 'celsius', 'fahrenheit',
      'summer', 'winter', 'spring', 'fall', 'autumn',
      'forecast', 'climate', 'heatwave', 'blizzard', 'drought', 'flood'],
    weight: 0.9
  },
  sleep: {
    keywords: ['sleep', 'sleeping', 'sleepy', 'tired', 'nap', 'napping',
      'insomnia', 'cant sleep', 'awake', 'bed', 'bedtime', 'pillow',
      'dream', 'dreaming', 'nightmare', 'alarm', 'wake up', 'woke up',
      'all nighter', 'pulling an all nighter', 'staying up', 'night owl',
      'morning person', 'melatonin', 'caffeine', 'exhausted', 'passed out',
      'knocked out', 'dozed off', 'yawning', 'fatigue', 'rest'],
    weight: 1.0
  },
  school_work: {
    keywords: ['school', 'college', 'university', 'class', 'classes', 'lecture',
      'homework', 'assignment', 'essay', 'exam', 'test', 'quiz', 'midterm', 'final',
      'study', 'studying', 'grade', 'grades', 'gpa', 'professor', 'teacher',
      'degree', 'major', 'minor', 'graduate', 'graduation', 'semester',
      'campus', 'dorm', 'tuition', 'student loan', 'scholarship',
      'work', 'working', 'job', 'career', 'office', 'boss', 'coworker',
      'salary', 'paycheck', 'raise', 'promotion', 'interview', 'resume',
      'meeting', 'deadline', 'project', 'presentation', 'overtime',
      'remote', 'work from home', 'wfh', 'commute', 'clock in', 'clock out',
      'intern', 'internship', 'freelance', 'side hustle', 'nine to five'],
    weight: 1.0
  },
  travel: {
    keywords: ['travel', 'traveling', 'trip', 'vacation', 'holiday', 'flight',
      'airport', 'plane', 'fly', 'flying', 'road trip', 'drive', 'driving',
      'hotel', 'airbnb', 'hostel', 'resort', 'beach', 'mountain',
      'tourism', 'tourist', 'sightseeing', 'explore', 'exploring',
      'passport', 'visa', 'luggage', 'packing', 'suitcase', 'backpacking',
      'europe', 'asia', 'japan', 'korea', 'thailand', 'mexico', 'canada',
      'hawaii', 'vegas', 'new york', 'paris', 'london', 'tokyo',
      'cruise', 'train', 'bus', 'uber', 'lyft', 'taxi',
      'adventure', 'hiking', 'camping', 'skiing', 'snowboarding', 'surfing',
      'scuba', 'diving', 'skydiving', 'bungee', 'zip line',
      'souvenir', 'photos', 'sunset', 'sunrise', 'scenic', 'view'],
    weight: 1.0
  },
  fashion: {
    keywords: ['fashion', 'outfit', 'clothes', 'clothing', 'drip', 'fit', 'fits',
      'shoes', 'sneakers', 'jordans', 'nikes', 'adidas', 'yeezy', 'new balance',
      'hoodie', 'jacket', 'jeans', 'pants', 'shirt', 'hat', 'cap', 'beanie',
      'dress', 'skirt', 'suit', 'tie', 'blazer', 'coat',
      'style', 'aesthetic', 'streetwear', 'hypebeast', 'vintage', 'thrift',
      'brand', 'designer', 'gucci', 'nike', 'supreme', 'stussy',
      'shopping', 'mall', 'online shopping', 'sale', 'discount', 'drop',
      'jewelry', 'watch', 'chain', 'ring', 'bracelet', 'earrings',
      'haircut', 'hairstyle', 'hair', 'beard', 'fade', 'trim',
      'tattoo', 'tattoos', 'piercing', 'piercings', 'ink'],
    weight: 1.0
  },
  money: {
    keywords: ['money', 'cash', 'broke', 'rich', 'wealthy', 'salary', 'paycheck',
      'invest', 'investing', 'stocks', 'crypto', 'bitcoin', 'ethereum',
      'budget', 'savings', 'saving', 'debt', 'loan', 'mortgage', 'rent',
      'expensive', 'cheap', 'price', 'cost', 'deal', 'sale', 'discount',
      'millionaire', 'billionaire', 'passive income', 'side hustle',
      'taxes', 'tax', 'irs', 'refund', 'credit card', 'bank', 'atm',
      'paypal', 'venmo', 'cashapp', 'zelle', 'wire transfer',
      'nft', 'blockchain', 'trading', 'forex', 'options', 'wallstreetbets',
      'diamond hands', 'paper hands', 'hodl', 'to the moon', 'stonks',
      'robinhood', 'fidelity', 'portfolio', 'dividends', 'roi'],
    weight: 1.0
  },
  relationship: {
    keywords: ['relationship', 'dating', 'date', 'single', 'taken', 'couple',
      'girlfriend', 'boyfriend', 'gf', 'bf', 'wife', 'husband', 'partner',
      'crush', 'ex', 'breakup', 'broke up', 'love', 'romance', 'romantic',
      'tinder', 'bumble', 'hinge', 'dating app', 'swipe', 'match',
      'valentine', 'anniversary', 'wedding', 'engaged', 'engagement',
      'friend', 'friends', 'bestie', 'best friend', 'bff', 'homie', 'homies',
      'hanging out', 'chill', 'kickback', 'party', 'get together',
      'family', 'mom', 'dad', 'parents', 'sibling', 'brother', 'sister',
      'wholesome', 'support', 'loyalty', 'trust', 'communication'],
    weight: 0.9
  },
  cars: {
    keywords: ['car', 'cars', 'truck', 'suv', 'sedan', 'coupe', 'convertible',
      'engine', 'horsepower', 'hp', 'torque', 'turbo', 'supercharger',
      'manual', 'automatic', 'stick shift', 'transmission', 'exhaust',
      'drift', 'drifting', 'race', 'racing', 'track', 'drag race',
      'bmw', 'mercedes', 'audi', 'tesla', 'toyota', 'honda', 'ford',
      'chevrolet', 'chevy', 'porsche', 'lamborghini', 'ferrari', 'mustang',
      'corvette', 'camaro', 'supra', 'gtr', 'wrx', 'civic', 'miata',
      'electric vehicle', 'ev', 'hybrid', 'mpg', 'gas', 'diesel',
      'jdm', 'euro', 'muscle car', 'sports car', 'supercar', 'hypercar',
      'mod', 'mods', 'wheels', 'rims', 'wrap', 'tint', 'lowered', 'lifted',
      'oil change', 'brake', 'tire', 'tires', 'suspension', 'intake',
      'detailing', 'wash', 'wax', 'ceramic coating',
      'license', 'driving', 'road trip', 'highway', 'speeding', 'ticket'],
    weight: 1.0
  },
  creative: {
    keywords: ['art', 'artist', 'drawing', 'draw', 'painting', 'paint', 'sketch',
      'digital art', 'illustration', 'commission', 'commissions',
      'photography', 'photo', 'photos', 'camera', 'lens', 'editing',
      'photoshop', 'illustrator', 'procreate', 'clip studio', 'blender',
      'animation', 'animate', '3d', '3d modeling', 'render', 'rendering',
      'graphic design', 'design', 'logo', 'branding', 'typography',
      'writing', 'writer', 'novel', 'story', 'fanfic', 'fiction',
      'poetry', 'poem', 'creative writing', 'worldbuilding',
      'video editing', 'premiere', 'after effects', 'davinci resolve',
      'music production', 'fl studio', 'ableton', 'logic pro',
      'cosplay', 'crafts', 'diy', 'handmade', 'crochet', 'knitting',
      'woodworking', 'pottery', 'sculpture', 'calligraphy',
      'content creation', 'thumbnail', 'graphic', 'aesthetic'],
    weight: 1.0
  },
  horror_scary: {
    keywords: ['horror', 'scary', 'scared', 'creepy', 'spooky', 'terrifying',
      'ghost', 'ghosts', 'haunted', 'paranormal', 'supernatural',
      'zombie', 'zombies', 'vampire', 'werewolf', 'demon', 'possessed',
      'jumpscared', 'jumpscare', 'nightmare', 'sleep paralysis',
      'urban legend', 'creepypasta', 'backrooms', 'liminal',
      'true crime', 'serial killer', 'missing', 'mystery', 'cold case',
      'conspiracy', 'conspiracy theory', 'alien', 'aliens', 'ufo',
      'cryptid', 'bigfoot', 'mothman', 'skinwalker', 'wendigo',
      'dark web', 'deep web', 'unsolved', 'unexplained',
      'phobia', 'claustrophobia', 'arachnophobia', 'thalassophobia',
      'halloween', 'october', 'friday the 13th', 'exorcist',
      'found footage', 'analog horror', 'arg', 'iceberg'],
    weight: 1.1
  },
  mood_positive: {
    keywords: ['happy', 'excited', 'amazing', 'awesome', 'great', 'love', 'perfect',
      'best', 'incredible', 'insane', 'fire', 'goated', 'sick', 'dope',
      'lit', 'pog', 'pogchamp', 'poggers', 'lets go', 'let\'s go', 'letsgoo',
      'hype', 'hyped', 'w', 'dub', 'massive', 'clutch',
      'lol', 'lmao', 'lmfao', 'rofl', 'haha', 'hahaha', 'xd',
      'nice', 'cool', 'sweet', 'beautiful', 'legendary', 'epic',
      'gg', 'well played', 'wp', 'based', 'gigachad', 'chad',
      'sheesh', 'bussin', 'valid', 'goat', 'no cap', 'fr fr',
      'congratulations', 'congrats', 'proud', 'impressive', 'respect',
      'cracked', '🔥', '🎉', '💪', '😂', '🤣', 'W',
      'blessed', 'grateful', 'thankful', 'wholesome', 'heartwarming',
      'unreal', 'magnificent', 'phenomenal', 'outstanding', 'brilliant',
      'top tier', 'god tier', 'elite', 'premium', 'peak', 'prime',
      'glorious', 'majestic', 'flawless', 'immaculate', 'pristine'],
    weight: 0.8
  },
  mood_negative: {
    keywords: ['sad', 'angry', 'annoyed', 'frustrated', 'tilted', 'rage',
      'boring', 'bored', 'tired', 'exhausted', 'sleepy', 'dead',
      'trash', 'garbage', 'terrible', 'awful', 'worst', 'bad',
      'hate', 'sucks', 'pain', 'suffering', 'rip', 'f',
      'l', 'loss', 'fail', 'failed', 'unlucky', 'unfortunate',
      'bruh', 'down bad', 'oof', 'yikes', 'cringe', 'mid',
      'lag', 'laggy', 'lagging', 'disconnect', 'dc', 'crash',
      'toxic', 'troll', 'griefing', 'throwing', 'inting',
      'depressed', 'depressing', 'lonely', 'alone', 'stressed',
      'overwhelmed', 'burned out', 'burnout', 'drained', 'done',
      'over it', 'fed up', 'sick of', 'cant deal', 'spiraling',
      'disaster', 'catastrophe', 'ruined', 'wrecked', 'destroyed',
      'gutted', 'devastated', 'heartbroken', 'betrayed', 'scammed'],
    weight: 0.8
  },
  greeting: {
    keywords: ['hello', 'hey', 'hi', 'yo', 'sup', 'whats up', 'what\'s up',
      'good morning', 'good evening', 'good night', 'goodnight',
      'morning', 'evening', 'afternoon', 'gm', 'gn',
      'howdy', 'greetings', 'welcome', 'wb', 'welcome back',
      'bye', 'goodbye', 'cya', 'see ya', 'later', 'peace', 'gtg',
      'brb', 'back', 'im back', 'i\'m back',
      'hola', 'bonjour', 'konnichiwa', 'aloha', 'wassup', 'wsg',
      'waddup', 'heyy', 'heyyy', 'yooo', 'ayooo'],
    weight: 1.2
  },
  question: {
    keywords: ['what', 'how', 'why', 'when', 'where', 'who', 'which',
      'anyone', 'anybody', 'someone', 'does anyone', 'do you',
      'can you', 'could you', 'would you', 'is there',
      'thoughts', 'opinion', 'opinions', 'think', 'recommend',
      'suggestion', 'advice', 'help', 'tip', 'tips',
      'should i', 'is it worth', 'whats the best', 'favorite',
      'unpopular opinion', 'hot take', 'controversial', 'debate',
      'tier list', 'top 5', 'top 10', 'ranking', 'rate',
      'poll', 'vote', 'prefer', 'rather', 'would you rather'],
    weight: 0.7
  },
  meme: {
    keywords: ['meme', 'memes', 'ratio', 'copium', 'hopium', 'copypasta',
      'sus', 'amogus', 'among us', 'monke', 'stonks',
      'sigma', 'grindset', 'alpha', 'beta', 'npc', 'main character',
      'plot armor', 'real', 'not real', 'canon', 'fanfic',
      'certified', 'moment', 'energy', 'vibe check', 'rent free',
      'cope', 'seethe', 'mald', 'touch grass', 'grass',
      'skull', '💀', 'deadass', 'no way', 'cap', 'slay',
      'ate', 'period', 'queen', 'king', 'serve', 'iconic',
      'delulu', 'understood the assignment', 'no thoughts', 'brain rot',
      'skibidi', 'gyatt', 'rizz', 'rizzler', 'ohio', 'fanum tax',
      'aura', 'aura points', 'negative aura', 'edging', 'gooning',
      'mogging', 'mewing', 'looksmax', 'bonesmash', 'jelqing',
      'its giving', 'the way', 'not the', 'bestie', 'era',
      'roman empire', 'ick', 'red flag', 'green flag', 'beige flag',
      'gaslighting', 'gatekeeping', 'girlboss', 'gaslight gatekeep',
      'living my best life', 'no thoughts just vibes', 'chaos goblin',
      'feral', 'unhinged', 'chronically online', 'terminally online'],
    weight: 0.9
  }
};

function detectTopics(text) {
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/);
  const scores = {};

  for (const [topic, data] of Object.entries(TOPICS)) {
    let score = 0;
    const matched = [];
    for (const kw of data.keywords) {
      // Use word boundary check for short keywords, includes for longer ones
      if (kw.length <= 3) {
        const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(lower)) {
          score += data.weight;
          matched.push(kw);
        }
      } else {
        if (lower.includes(kw)) {
          score += data.weight;
          matched.push(kw);
        }
      }
    }
    if (score > 0) {
      scores[topic] = { score, matched, confidence: matched.length >= 2 ? 'high' : 'low' };
    }
  }

  // Sort by score descending
  const sorted = Object.entries(scores)
    .sort(([, a], [, b]) => b.score - a.score);

  return sorted.length > 0 ? sorted : null;
}

// ======================== SENTIMENT ANALYSIS ========================

const POSITIVE_WORDS = new Set([
  'good', 'great', 'awesome', 'amazing', 'love', 'like', 'best', 'nice',
  'cool', 'fire', 'sick', 'dope', 'epic', 'incredible', 'perfect', 'beautiful',
  'happy', 'glad', 'excited', 'hype', 'insane', 'goated', 'pog', 'poggers',
  'clutch', 'based', 'valid', 'bussin', 'lit', 'cracked', 'legendary',
  'W', 'w', 'dub', 'gg', 'wp', 'yes', 'yeah', 'yep', 'absolutely',
  'thanks', 'thank', 'appreciate', 'respect', 'congrats', 'congratulations',
  'sheesh', 'clean', 'smooth', 'ez', 'easy', 'fun', 'funny', 'hilarious',
  'lol', 'lmao', 'haha', 'hahaha', 'xd'
]);

const NEGATIVE_WORDS = new Set([
  'bad', 'terrible', 'awful', 'worst', 'hate', 'trash', 'garbage',
  'boring', 'lame', 'mid', 'cringe', 'yikes', 'L', 'loss', 'fail',
  'sad', 'angry', 'toxic', 'annoying', 'frustrated', 'tilted',
  'dead', 'pain', 'suffering', 'bruh', 'oof', 'rip', 'unlucky',
  'lag', 'laggy', 'crash', 'broken', 'bugged', 'scam', 'fake',
  'troll', 'griefing', 'throwing', 'cope', 'seethe', 'mald'
]);

function analyzeSentiment(text) {
  const words = text.toLowerCase().split(/\s+/);
  let pos = 0, neg = 0;
  for (const w of words) {
    if (POSITIVE_WORDS.has(w)) pos++;
    if (NEGATIVE_WORDS.has(w)) neg++;
  }
  const total = pos + neg;
  if (total === 0) return 'neutral';
  if (pos > neg) return 'positive';
  if (neg > pos) return 'negative';
  return 'neutral';
}

// ======================== RESPONSE MODIFIERS ========================
// These are prepended/appended to base templates for massive variety

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

// Apply a random modifier to a template string to create variety
function modifyResponse(base) {
  // 40% chance to add a prefix
  if (Math.random() < 0.4) {
    const prefixType = ['agree', 'react', 'soft'][Math.floor(Math.random() * 3)];
    const prefix = PREFIXES[prefixType][Math.floor(Math.random() * PREFIXES[prefixType].length)];
    // Only add prefix if base doesn't already start with a similar word
    if (!base.match(/^(Bro|Bruh|Yo|Dude|Ngl|Honestly|Lowkey|Fr|Tbh|Lol|Lmao|I think|Imo)/i)) {
      base = prefix + base.charAt(0).toLowerCase() + base.slice(1);
    }
  }
  // 30% chance to add a suffix
  if (Math.random() < 0.3) {
    const suffixType = ['emphasis', 'filler', 'chill', 'hype'][Math.floor(Math.random() * 4)];
    const suffix = SUFFIXES[suffixType][Math.floor(Math.random() * SUFFIXES[suffixType].length)];
    // Don't double up emojis or similar endings
    const lastChar = base.slice(-3);
    if (!suffix.trim().startsWith(lastChar.trim()) && !base.endsWith(suffix.trim())) {
      base = base.replace(/[.!,]$/, '') + suffix;
    }
  }
  return base;
}

// ======================== SMART TEMPLATES ========================

const TEMPLATES = {
  gaming: {
    generic: [
      'What game are you guys playing?',
      'Oh nice, what game?',
      'That sounds like a solid game tbh',
      'Gaming hits different late at night ngl',
      'That game is actually pretty fun',
      'I need to try that game out fr',
      'Is that game any good? Been thinking about it',
      'The gaming session is real tonight',
      'Anyone else grinding tonight? 🎮',
      'That game goes hard honestly',
      'Bro that game is addicting',
      'I been playing that too, it slaps',
      'W game choice honestly',
      'Is that game still popping?',
      'That game has such good vibes',
      'How many hours you got in that?',
      'Is it worth the grind though?',
      'Late night gaming session lets gooo',
      'The soundtrack in that game is fire btw',
      'That game had me up till 4am no cap',
      'The game selection tonight is elite',
      'I cant stop playing that game honestly',
      'That game is goated with the sauce',
      'Everyone keeps talking about that game',
      'My backlog is crying but I keep playing that',
      'Drop your steam name lets run it',
      'That game just different when you play with the boys',
      'Bro I need a squad for that game',
      'How is that game in 2026 though?',
      'Is the community still active?',
      'I uninstalled that game 3 times and keep coming back',
      'That game is a 10/10 experience',
      'The developers actually did a great job with that one',
      'Waiting for a sale to grab that one',
      'Is it on game pass?',
      'Cross platform or nah?',
      'That game runs smooth on everything',
      'You need friends for that or is solo good?',
      'How many GB is that game though lol',
      'The tutorials in that game dont teach you anything fr',
      'Day one purchase for sure',
      'Steam reviews say mixed but the game is actually fire',
      'The loading screens in that game are non existent its insane',
      'I keep meaning to start that game but my backlog is insane',
      'That game deserves way more attention than it gets',
      'Underrated game of the year candidate right there',
      'The replay value on that game is crazy',
      'Whats the learning curve like on that?',
      'The devs keep dropping updates too W developers',
      'That game looks mid from trailers but plays amazing',
      'My friends wont stop talking about that game',
      'Game pass carrying rn honestly',
      'I need to reinstall that game immediately',
      'That game was my childhood honestly',
      'The nostalgia from that game hits different',
      'Remember when that game first dropped? Times were different',
      'That game aged like fine wine',
      'Is there a demo or I gotta commit?',
      'Waiting for it to go on sale im not paying full price lol',
      'The mod community for that game goes crazy',
      'That game with mods is a completely different experience',
      'I got lost in that game for like 6 hours straight',
      'Time flies when youre playing that for real',
      'Thats one of those games you recommend to everyone',
      'The early game is slow but once it picks up though',
      'Controller or keyboard for that game?',
      'Native controller support or nah?',
      'That game at 60fps is a different game entirely',
      'My GPU was crying playing that on max settings',
      'Had to lower the graphics to actually play it lol',
      'That game is CPU intensive fr your processor matters',
      'Split screen or online only?',
      'LAN party vibes with that game no cap',
      'The character creator in that game is insane',
      'I spent 3 hours making my character before even playing',
      'Photo mode in that game produces actual art',
      'The attention to detail in that game is next level',
      'Easter eggs in that game are everywhere',
      'Did you find the secret area? No spoilers but look around',
      'The fishing minigame is always better than the actual game lol',
      'Side quests in that game are better than most main stories',
      'The story in that game made me feel things ngl',
      'That ending was not what I expected at all',
      'Multiple endings? Guess Im playing it again',
      'New game plus hits different on that one',
      'The endgame content is actually worth it',
      'They keep adding free DLC which is rare these days',
      'That games DLC is better than most full games',
      'Season 2 of that game is way better than season 1',
      'The balance patches actually made the game better for once',
      'Remember when that game was broken on launch lmao',
      'Redemption arc of the year for that games dev team',
      'The community is actually really wholesome for once',
      'Looking for people to play that game with drop your tag',
      'That game is perfect for winding down after a long day',
      'Cozy game energy right there',
      'Nothing beats a good story driven game',
      'Open world fatigue is real but that game different',
      'The inventory management in that game is pain',
      'Collecting everything in that game is my personality',
      'Completionist run or casual? Choose your fighter',
      'Speedrunners make that game look like a joke',
      'The world record for that game is actually insane look it up',
      'That game has the best community events',
      'In game events always bring the vibes',
      'The seasonal content in that game is elite',
      'Halloween event in that game goes hard every year',
      'They really put their heart into that game you can tell',
      'Passion project game vs corporate game and it shows',
      'Indie devs carrying the gaming industry rn',
      'AAA games could learn from that indie game for real',
      'The pixel art in that game is gorgeous',
      'Art style carries that game so hard',
      'That game has the best water physics change my mind',
      'Destruction physics in that game hit different',
      'The ragdoll in that game is comedy gold',
      'Bug or feature? In that game you never know',
      'The speedrun community for that game is elite',
      'Any% or 100%? Real gamers do both',
      'That game at 3am with headphones on is an experience',
      'Horror game at night with lights off is crazy brave',
      'That game has the best jump scares no cap',
      'Survival mode in that game taught me real stress',
      'Base building in that game is my therapy',
      'I spent more time decorating my base than playing the game',
      'The building system is so satisfying in that',
      'Farming simulator games are unironically relaxing',
      'That cozy game is my comfort game fr',
      'Everyone needs a comfort game and that one is mine',
      'Trading system in that game is wild',
      'The economy in that game is more complex than real life',
      'Auction house warriors know the real grind',
      'Crafting system is either amazing or tedious no middle ground',
      'The RNG in that game is brutal be warned',
      'Gacha rates in that game are criminal',
      'F2P or P2W? The debate continues',
      'That game respects your time which is rare',
      'Pay to win ruined what could have been a great game',
      'The anti cheat in that game is either goated or nonexistent',
      'Cheaters in that game are out of control honestly',
      'Custom lobbies in that game are the best content',
      'Private matches with friends hit different than ranked',
      'That game in VR is a whole different experience',
      'VR version of that game is actually insane',
      'Crossplay saves are so needed for that game',
      'Cloud saves saved my life when my PC died',
      'That games subreddit is either helpful or toxic no middle',
      'The wiki for that game is my bible',
      'Guide makers for that game deserve awards',
      'That game has the best community wikis',
      'Discord server for that game is popping',
      'Looking for guild for that game anyone?',
      'End game raids in that require a PhD honestly',
      'The skill ceiling in that game is infinite',
      'Easy to learn hard to master games are the best',
      'Pick up and play or is there a learning curve?',
      'That games tutorial should be studied by other devs',
      'The tutorial boss humbled me immediately',
    ],
    achievement: [
      'GG thats a huge W 🏆',
      'Yooo thats insane, well played!',
      'That clutch was actually clean',
      'Bro youre cracked at this game',
      'How did you even pull that off lol',
      'Certified gamer moment right there',
      'That was lowkey impressive ngl',
      'GG EZ 😎',
      'Youre built different at this game fr',
      'Thats a clip right there',
      'Someone clip that!',
      'Actual god gamer',
      'The skill gap is showing 💪',
      'No way you just did that lmao',
      'Thats going on the highlight reel',
      'Bro just casually being goated',
      'Main character energy right there',
      'The gaming chair is paying off',
      'That was the play of the year no cap',
      'Drop the settings you are locked in',
      'The aim was immaculate on that one',
      'Bro activated ultra instinct',
      'That was pixel perfect timing',
      'Gaming prodigy right here',
      'You make that look easy and its not',
      'The enemy team is shaking rn',
      'Bruh that was the cleanest thing Ive ever seen',
      'Put that on the resume honestly',
      'Esports ready 🏆',
      'The mechanical skill is unreal',
      'That was frame perfect execution right there',
      'How are you that consistent though',
      'You just made that look effortless what',
      'Thats not normal that was insane',
      'The reaction time on that play though',
      'Ok you might actually be too good at this',
      'Were witnessing greatness live',
      'Tell me you didnt just do that',
      'The disrespect on that play I love it',
      'Youre the reason they rage quit',
      'MVP MVP MVP',
      'You carried that entire game on your back',
      'Someone check this persons gaming chair',
      'That game sense is unmatched',
      'The play was so clean it felt scripted',
      'That was a once in a lifetime play for real',
      'I would have choked that 100% of the time',
      'The IQ on that play was actually massive',
      'Strategic genius and mechanical beast',
      'You just speed ran that like it was nothing',
      'That is what peak performance looks like',
      'The clutch gene is strong with this one',
      'Built different and they know it',
      'Your opponents need therapy after that',
      'That play just ruined someones day and I love it',
      'Do you practice or is this natural talent',
      'Muscle memory on that play was insane',
      'The movement was so smooth it looked like butter',
      'Wall to wall action and you survived all of it',
      'The team contribution was actually insane',
      'You literally 1v5d and won what',
      'The comeback from that position is legendary',
      'Down bad and still pulled off the win respect',
      'Thats what we call a certified carry right there',
      'Your back must hurt from carrying that hard',
      'That was an all time great play honestly',
      'Send that clip to the devs they need to see it',
      'Top 0.1% gameplay right there easy',
      'You just unlocked a new achievement in real life too',
      'Title screen worthy performance right there',
      'Hall of fame play no question',
      'The precision on that is actually scary',
      'Are you a robot? That was too precise',
      'Zero mistakes from start to finish how',
      'Flawless execution the whole time',
      'Not a single wasted move that was efficient as hell',
      'Economy of movement on another level',
      'That was textbook perfect play',
    ],
    fail: [
      'Pain 💀',
      'Bro that was rough lmao',
      'We dont talk about that one',
      'That was unfortunate 😂',
      'RIP, happens to the best of us',
      'Unlucky tbh, go next',
      'Nah that was the games fault not yours',
      'Controller threw itself',
      'Lag right? ...right? 😅',
      'The game said no today',
      'F in the chat',
      'Thats just the gaming experience lol',
      'Its not about winning its about... wait no',
      'That was a certified bruh moment',
      'We go agane 💪',
      'Keyboard wasnt plugged in obviously',
      'That was a skill issue and you know it 😂',
      'The input delay got you for sure',
      'Were gonna pretend that didnt happen',
      'Thats getting deleted from the vod lol',
      'Bro ragequit speedrun any%',
      'That was a learning experience right? Right?',
      'Even the NPCs felt bad for you',
      'The hitbox was lying I saw it',
      'I felt that in my soul',
      'The emotional damage from that play',
      'Thats the kind of play that makes you close the game',
      'The comeback arc starts now though',
      'Its giving uninstall energy 💀',
      'You took the L so we dont have to respect',
      'The game was rigged from the start honestly',
      'That is going in the fail compilation for sure',
      'The desk got punched after that one I know it',
      'Monitor almost got a fist through it',
      'Alt F4 was calling your name',
      'You peaked too early and it showed',
      'The gaming gods were not on your side today',
      'Imagine if someone was watching that live 😂',
      'That is the definition of a down bad play',
      'I cant believe what I just witnessed honestly',
      'The replay of that is gonna haunt you',
      'That was so bad it was almost impressive',
      'New definition of throwing right there',
      'At least it can only go up from here right',
      'Character development starts with rock bottom',
      'Everyone has off games its fine its fine',
      'The tilt after that play must be immeasurable',
      'Please tell me you at least laughed at that',
      'That play belongs in a museum of mistakes',
      'Historical L right there',
      'The killcam after that was disrespectful',
      'Outplayed outgunned and outmaneuvered completely',
      'That was a whole series of unfortunate events',
      'Murphy law speedrun right there',
      'Everything that could go wrong did go wrong',
      'Your luck stat is at zero confirmed',
      'The RNG gods have abandoned you today',
      'Even the game felt sorry for you I think',
      'That death was creative at least give yourself that',
      'You found a new way to die nobody has seen before',
      'Speed ran to the death screen',
      'The respawn timer felt extra long after that one huh',
      'Walk of shame back to your stuff after that',
      'Lost all your inventory from that? Pain',
      'The friendly fire was not friendly at all',
      'Teamkilled? Yikes the trust issues after that',
      'You literally walked into that one lol',
      'The trap was so obvious but here we are',
      'Fell for the oldest trick in the book',
      'Got baited so hard its actually funny',
      'The fake out got you good admit it',
      'You had one job and chose violence against yourself',
      'Self sabotage at its finest right there',
      'The panic button press that made everything worse',
      'Wrong button wrong time wrong everything',
      'Fat fingered the ability at the worst moment possible',
      'Used your ultimate on absolutely nothing beautiful',
      'Wasted everything for that? Pain',
      'The economy round was not economical at all',
    ],
    boss: [
      'That boss is a nightmare honestly',
      'Did you beat it though??',
      'How many tries did that take haha',
      'That boss fight goes crazy',
      'The boss music probably slaps though',
      'I got stuck on that boss for hours',
      'Just dodge bro its easy (its not easy)',
      'That boss has zero chill',
      'Bosses in that game are built different',
      'Did it drop anything good at least?',
      'That boss made me question my gaming abilities',
      'The second phase is where it gets real',
      'You gotta learn the patterns',
      'I had to look up a guide ngl',
      'That boss was designed by a psychopath fr',
      'The feeling of finally beating it though >>> everything',
      'Did you rage or stay calm? Be honest',
      'Some bosses are just built to destroy your confidence',
      'The run back to the boss is the real torture',
      'That boss has like 47 health bars',
      'Phase 3??? There was a phase 3???',
      'The healing window is so tiny on that fight',
      'That boss teaches you patience or teaches you rage',
      'I looked up the guide after attempt 50',
      'That attack is literally undodgeable I swear',
      'Every time you think the boss is dead... another health bar',
      'The relief after beating that boss is unmatched',
      'Your hands were shaking after that kill I know it',
      'That boss made me rethink my entire build',
      'Had to respect and change my whole strategy',
      'Summoning signs required for that boss honestly',
      'Solo or you brought help? No judgment',
      'That boss arena is beautiful though at least',
      'The lore behind that boss is actually really cool',
      'That boss was harder than the final boss what',
      'Optional boss being harder than the story boss is crazy',
      'The music carried me through that fight honestly',
      'When the choir kicks in during the boss fight',
      'That boss has the most satisfying kill animation',
      'First try? Yeah right sure buddy 😂',
      'That boss punishes greed so hard',
      'Dont get greedy on the openings thats how you die',
      'The window to attack is like half a second good luck',
      'That boss teaches you to be patient or die trying',
      'I nearly threw my controller at that boss fr',
      'The relief dopamine when you finally beat that boss',
      'Beating that boss is a core memory',
      'I texted my friends when I beat it thats how hype I was',
      'That boss has entered my nightmares permanently',
      'That boss fight is actually a masterpiece of game design',
      'The difficulty spike at that boss is INSANE',
      'Everything before that boss was the tutorial apparently',
      'I thought I was good at the game then that boss happened',
      'The enrage timer on that boss is brutal',
      'DPS check boss right there if you cant put out damage GG',
      'That boss punishes you for every mistake no mercy',
      'The hitbox on that bosses attack is bigger than my screen',
      'One shot mechanics in a boss fight should be illegal',
      'The grab attack from that boss... instant death every time',
    ],
    competitive: [
      'Ranked grind is real tonight huh',
      'What rank are you at?',
      'Ranked is either a W or pure suffering no in between',
      'The ranked experience 💀',
      'Elo hell is real and we all live there',
      'Are you climbing or falling? Be honest',
      'Ranked at 3am hits different (worse)',
      'One more game... (it was not one more game)',
      'The matchmaking is crazy sometimes',
      'Ranked makes you question life honestly',
      'Solo queue is a different kind of pain',
      'The teammates are always the problem right lol',
      'What role do you main?',
      'Current meta is wild right now',
      'You gained or lost rank today? Truth only',
      'The win streak is coming I can feel it',
      'Hardstuck is a lifestyle at this point',
      'Just one more win for the next rank right?',
      'The late night ranked gamble never pays off',
      'Teammates diff is real sometimes',
      'When you get good teammates its like winning the lottery',
      'The promo games are always the sweatiest',
      'Why does matchmaking always find the worst lobbies',
      'Ranked anxiety is a real thing',
      'You queueing up or done for tonight?',
      'The rank reset pain is coming soon',
      'Placements are the most stressful games of the season',
      'Where did you end up last season?',
      'The grind from gold to plat is wild',
      'Diamond lobby is where the real pain starts',
      'Every rank feels like elo hell at some point',
      'The comms in ranked are either amazing or nonexistent',
      'Why do people go afk in ranked of all modes',
      'Dodge or play with the troll? The eternal dilemma',
      'My mental is gone after that ranked session',
      'Taking a break from ranked for my health honestly',
      'Warmup games before ranked or straight in?',
      'The enemy team always has a smurf I swear',
      'My rank does not reflect my skill and thats a hill I die on',
      'Peak rank vs current rank dont ask me about it',
      'Decay system in that game is so punishing',
      'Havent played in a week and lost all my progress',
      'The mmr system is rigged change my mind',
      'Winners queue and losers queue are definitely real',
      'Getting carried to a rank you dont belong in is rough',
      'The imposter syndrome at a new rank is real',
      'You belong at that rank you earned it',
      'The grind pays off when you hit that new rank',
      'That rank up screen hits different at 2am',
      'Screenshot the rank up its a historic event',
      'The demotion game is the scariest game you can play',
      'Playing on a loss streak is how you end up in bronze',
      'Know when to stop thats the real ranked skill',
      'Tilt queueing is the enemy of climbing',
      'The mental game is 50% of ranked at least',
      'Warm up in norms before ranked trust me',
      'Aim trainer before ranked or raw dawg it?',
      'The one trick to climbing is consistency not flashy plays',
      'Fundamentals beat mechanics at every rank',
    ]
  },
  stream: {
    generic: [
      'Stream was fire today 🔥',
      'When is the next stream??',
      'I always catch the streams, they go hard',
      'Stream vibes are unmatched fr',
      'Best stream in a while honestly',
      'The content has been so good lately',
      'Stream when?? 👀',
      'I missed the stream noooo',
      'Anyone catch the last stream?',
      'The streams keep getting better',
      'Chat was wild during that stream lol',
      'The energy on stream was crazy',
      'Stream was goated today',
      'Whos ready for next stream?',
      'That stream was actually so entertaining',
      'The content is elite ngl',
      'I need to catch more streams fr',
      'Stream highlights go crazy every time',
      'The community here is actually so chill',
      'Best part of stream is always the chat tbh',
      'The stream schedule is perfect for my timezone',
      'I always fall asleep during streams and wake up to chaos',
      'Chat interaction on stream is top tier',
      'The stream quality has been insane lately',
      'I had that stream on in the background all day',
      'When the stream goes live my productivity dies',
      'Chat was carrying the stream today ngl',
      'The reactions on stream had me dying 😂',
      'Stream snacks are mandatory for watching',
      'That stream had everything honestly',
      'The chill streams are actually the best ones',
      'Stream VODs are saving me when I miss live',
      'That was one of those streams you had to be there for',
      'The community streams hit different fr',
      'I set an alarm for stream time not gonna lie',
      'Chat was peaking during that segment',
      'The production quality keeps going up',
      'Love the variety in the stream content',
      'That just chatting section was actually amazing',
      'The raids are always so fun',
      'Getting hosted feels like a surprise party',
      'Stream alerts going off back to back',
      'The emote wall during that moment was insane',
      'I came for the games and stayed for the vibes',
      'The community built here is actually special',
      'Lurking since the beginning 👀',
      'Been here since day one and the growth is insane',
      'The stream never misses honestly',
      'Always leave the stream in a better mood',
      'The engagement on stream is unreal',
      'That cooking segment on stream was unexpected but elite',
      'When the stream goes over time and nobody complains',
      'Extra long stream today? Say less im staying',
      'The variety content keeps things fresh',
      'IRL streams when?? Those would be fire',
      'The camera angle upgrade was needed honestly',
      'Sound quality on stream is really good',
      'The overlay redesign looks clean',
      'Channel point predictions are always fun',
      'I lost all my channel points but it was worth it',
      'The donation messages are always hilarious',
      'TTS on stream is either comedy gold or pure chaos',
      'Bits and subs going crazy today',
      'That gifter is the real MVP of the stream',
      'Anonymous gifter dropping bombs in here',
      'The sub train is still going what',
      'The watch hours on this stream must be insane',
      'Everyone is active in chat today love to see it',
      'Chat moves so fast when it gets hype',
      'Slow mode needed when chat gets this wild',
      'The moderators are working overtime today lol',
      'Shoutout to the mods keeping chat clean',
      'VIP chat hits different during big moments',
      'The stream title is already fire',
      'That category change mid stream was unexpected',
      'The game choice for today is perfect',
      'Multi stream setup is so clean',
      'Dual PC stream quality is on another level',
      'The bitrate is chef kiss today no buffering at all',
      'Stream has been going for hours and still going strong',
      'Marathon stream energy right here',
      'The dedication to streaming is actually inspiring',
      'How long has the stream been going? feels like it just started',
      'Time flies during good streams',
      'Chat replay should be a thing for moments like that',
      'That clip is going to blow up on TikTok',
      'Stream clips on social media bringing everyone in',
      'The growth has been insane congrats on the follows',
      'Road to affiliate/partner is happening',
      'Consistent schedule is key and you nailed it',
      'The networking with other streamers is paying off',
      'That collab stream was the best content this month',
      'Co-streams with friends are always the move',
      'The stream setup tour was overdue and it looked clean',
      'Facecam on or off? Both are valid',
      'The green screen setup is looking professional',
      'Stream deck moments when the right sound plays',
      'The sound alerts selection is top tier',
    ],
    hype: [
      'LETS GOOO 🔥🔥🔥',
      'THE STREAM IS LIVE LETS GO',
      'HYPE HYPE HYPE',
      'Oh its about to go crazy',
      'This is gonna be a good one I can feel it',
      'Everyone get in here!!',
      'We are so back',
      'The hype is REAL',
      'I been waiting for this all day',
      'Time to vibe 😎',
      'EVERYBODY GET IN HERE NOW',
      'DROP EVERYTHING STREAM IS LIVE',
      'ITS GO TIME CHAT',
      'The energy is THROUGH THE ROOF',
      'This stream is going to break records I feel it',
      'The hype train is leaving the station ALL ABOARD',
      'Chat is about to go INSANE',
      'Best notification of the day right there',
      'I SPRINTED to my computer for this',
      'WE ARE SO BACK ITS NOT EVEN FUNNY',
      'THE MOMENT WE HAVE ALL BEEN WAITING FOR',
      'Clear your schedule this is gonna be epic',
      'Canceling all my plans for this stream',
      'The anticipation was killing me',
      'Chat is already at 100 energy before it even started',
      'THIS IS NOT A DRILL THE STREAM IS LIVE',
      'The special stream is finally happening',
      'I can already tell this is gonna be legendary',
      'My body is ready for this stream',
      'The countdown was worth the wait',
      'EVERYONE TYPE 1 IF YOURE HYPED',
      'The hype emotes are flooding chat I love it',
      'This stream is the main event tonight',
      'PRIME TIME STREAM BABY',
      'WE EATING GOOD TONIGHT WITH THIS CONTENT',
      'The notification popped up and I ran',
      'Set everything aside stream is priority one',
      'THIS IS THE ONE CHAT THIS IS THE ONE',
      'Energy levels maximum capacity',
      'The whole community showed up for this one',
      'Record breaking vibes in here tonight',
      'Chat is moving at light speed rn',
      'THE HYPE NEVER DIES IN HERE',
      'We stay winning with streams like these',
      'Goosebumps energy right now',
      'The electricity in chat is insane',
      'IVE BEEN REFRESHING THE PAGE FOR AN HOUR',
      'Finally the wait is over LETS GOOOO',
      'This deserves every single viewer it gets',
    ]
  },
  music: {
    generic: [
      'Song name?? 🎵',
      'This song actually slaps',
      'The music taste here is W',
      'Add that to the playlist fr',
      'Banger after banger honestly',
      'The vibes are immaculate rn',
      'That beat goes crazy',
      'Who put you on this song? Its fire',
      'Spotify playlist when??',
      'The music hits different at night',
      'Certified banger 🔥',
      'Good taste in music fr fr',
      'This playlist is actually goated',
      'I need this song in my life',
      'The bass on that track though 🔊',
      'Music is carrying the vibe rn',
      'Shazam moment',
      'This song is on repeat for sure',
      'Drop the playlist link 🎧',
      'That album was so good btw',
      'The production on that track is insane',
      'Who produced that? The beat is crazy',
      'This song just unlocked a core memory',
      'Perfect driving music right there',
      'The lyrical content is actually deep',
      'This artist never misses honestly',
      'Been listening to that on repeat all week',
      'That song hits harder with good headphones',
      'The music video was fire too',
      'Lowkey this might be song of the year',
      'The features on that album were perfect',
      'I discovered that song at 2am and it changed my life',
      'That genre is underrated honestly',
      'Live performance of that must be insane',
      'The transition between those two songs 🤌',
      'This song is therapy honestly',
      'The bassline in that track is criminal',
      'Anyone else have this on their wrapped?',
      'The sample they used in that is so clever',
      'That dropped at the perfect time',
      'The album cover art is actually fire too',
      'Music taste is the true personality test',
      'You can tell a lot about someone by their playlist',
      'Late night drives with that song on repeat',
      'That song at golden hour in the car hits different',
      'Windows down volume up that kind of song',
      'Aux cord privileges are not given lightly',
      'Hand me the aux I got the perfect song for this moment',
      'The playlist name is probably something unhinged lol',
      'Liked songs playlist is just 3000 random vibes',
      'The discover weekly actually came through this week',
      'Release radar never misses lately',
      'That artist dropped without warning and its fire',
      'Surprise album drops are the best',
      'The deluxe version better have more tracks',
      'The bonus tracks are better than the main album sometimes',
      'That feature was unexpected but it worked so well',
      'The chemistry between those two artists is insane',
      'Collab album when?? The world needs it',
      'Tour announced yet? Need those ticket prices asap',
      'Concert tickets are so expensive now but worth it',
      'That artist live is a completely different experience',
      'The energy at that concert was unreal',
      'Festival lineup this year is actually stacked',
      'Front row at a concert is a life changing experience',
      'The mosh pit energy for that song must be insane',
      'Acoustic version of that song hits even harder',
      'The unplugged version shows the real talent',
      'That cover version might be better than the original',
      'Hot take the remix is better than the original',
      'The original is always better fight me',
      'That song has been in my head for 3 days straight',
      'Earworm status that song wont leave my brain',
      'Need to add that to every single playlist I have',
      'That genre crossover shouldnt work but it does',
      'Country rap? Pop punk? The genre blending is crazy now',
      'Lo-fi beats for studying is undefeated background music',
      'The study playlist is doing heavy lifting right now',
      'Working out to that song adds 10lbs to my bench press',
      'Gym playlist is sacred territory dont touch it',
      'That pregame playlist gets me pumped every time',
      'Cooking playlist is an underrated genre',
      'Shower concerts to that song are undefeated',
      'The transition from that song to the next one in the album',
      'That music video deserved a movie budget',
      'The storyline across the album is actually genius',
      'Concept albums dont get enough love',
      'That artists discography is actually flawless',
      'No skips on that album seriously',
      'Every track on that album is a single quality',
      'Deep cuts from that artist are better than the hits',
      'The B-sides from that era are criminally underrated',
      'That songs bridge is the best part and you know it',
      'When the beat switches on that track',
      'The beat switch caught me off guard and I loved it',
      'Producers are the unsung heroes of music fr',
    ]
  },
  food: {
    generic: [
      'Now Im hungry thanks 😂',
      'That sounds so good rn',
      'What are you eating? Im jealous',
      'Food talk at this hour is dangerous',
      'Im ordering food after this conversation',
      'That sounds bussin',
      'W food choice',
      'Bro stop youre making me hungry 😭',
      'I could go for some of that rn',
      'Late night food talk is a vibe',
      'Pizza or burger though? Hard choice',
      'Food pics or it didnt happen',
      'The midnight hunger is real',
      'Thats a solid meal right there',
      'I need that in my life immediately',
      'You had me at food 🍕',
      'What time is it? Snack time apparently',
      'Calories dont count after midnight right?',
      'The food conversation always hits different',
      'Someone get me doordash rn',
      'My stomach literally just growled reading that',
      'Thats a chef kiss meal right there 🤌',
      'The seasoning on that must be perfect',
      'Food is literally the best topic',
      'Eating good tonight huh? Save me some',
      'That meal goes hard not gonna lie',
      'The portions better be massive for that',
      'Comfort food hits different when youre tired',
      'Whats your go-to order from there?',
      'Free food always tastes better idk why',
      'That food looks like a hug in a bowl',
      'The struggle of choosing what to eat is REAL',
      'My wallet says no but my stomach says yes',
      'Home cooked or restaurant? Both valid',
      'That recipe sounds too good to be that easy',
      'Bro unlocked a new craving for me',
      'The food coma after that must be elite',
      'Adding that to my must-try list',
      'Breakfast food at any time of day is a W',
      'The leftovers hit just as hard sometimes',
      'Reheated food is either amazing or a disaster',
      'Microwave reheating is an art form',
      'Air fryer changed my whole relationship with food',
      'Everything is better air fried prove me wrong',
      'The crunch from the air fryer is unmatched',
      'Instant pot meals when you dont wanna cook but need food',
      'Slow cooker meals fill the whole house with vibes',
      'Mac and cheese is the ultimate comfort food',
      'Grilled cheese and tomato soup on a cold day',
      'Ramen when its raining outside is peak existence',
      'That late night bowl of cereal hits so different',
      'Cereal is acceptable food at any time',
      'The debate: is a hot dog a sandwich?',
      'The cereal before or after milk debate will never end',
      'Wings: boneless or bone-in? I will die on this hill',
      'Ranch or blue cheese with wings? Choose carefully',
      'Hot sauce tier list would break this chat',
      'That level of spicy is just pain not flavor anymore',
      'Milk after spicy food is survival not weakness',
      'The burn was worth it though right?',
      'Street food from that country is on another level',
      'Food trucks are underrated gems of the food world',
      'Hole in the wall restaurants always have the best food',
      'The fanciest looking restaurant had the smallest portions',
      'Fine dining portions for $50? Give me a burger instead',
      'The presentation was beautiful but I was still hungry',
      'Buffet strategy: skip the bread go straight for the good stuff',
      'All you can eat is a challenge not a suggestion',
      'That dessert was the star of the whole meal',
      'Dessert stomach is a real thing I always have room',
      'Ice cream flavor debate GO',
      'Mint chocolate chip is either the best or worst flavor',
      'Controversial take: pineapple on pizza is actually good',
      'That pizza debate will never be settled and I love it',
      'Deep dish or thin crust? Both are valid',
      'NY pizza vs Chicago pizza the eternal battle',
      'Homemade pizza always tastes better than delivery',
      'That cooking channel on YouTube taught me everything',
      'YouTube cooking videos at 2am when Im not even hungry',
      'The secret ingredient is always butter lets be honest',
      'Garlic makes everything better thats just facts',
      'That seasoning combo was a game changer',
      'Meal prep Sunday is either productive or a disaster',
      'The grocery bill for that recipe was how much??',
      'Cooking for one is depressing but eating for one is peaceful',
      'That snack was supposed to be a snack not the whole bag',
      'The bag was not finished it was simply eliminated',
      'Water is technically the best drink but coffee exists',
      'Coffee is a personality trait at this point',
      'Iced coffee in December? Absolutely valid',
      'Energy drinks are carrying me through life rn',
      'Boba tea is always the right choice',
      'That smoothie recipe is how many ingredients??',
    ]
  },
  tech: {
    generic: [
      'What specs you running?',
      'Tech talk lets gooo 🖥️',
      'RGB makes it run faster everyone knows that',
      'Have you tried turning it off and on again?',
      'That setup sounds clean',
      'What monitor are you using?',
      'Thats a solid build',
      'Budget build or nah?',
      'Frame rate matters more than anything',
      'That tech stack is fire actually',
      'Cable management is an art form',
      'Upgrade time soon?',
      'The setup glow up is real',
      'Tech specs conversation, we in deep',
      'What keyboard are you rocking?',
      'Mechanical keyboard gang 🎹',
      'How many tabs do you have open be honest',
      'Chrome eating all your ram again?',
      'That coding project sounds cool though',
      'Dark mode or light mode? Choose wisely',
      'The desk setup content is top tier',
      'How much did that build cost you?',
      'Bruh my PC is crying just hearing about your specs',
      'The cable management is either perfect or a war crime no in between',
      'What mousepad are you using? Details matter',
      'That monitor refresh rate is insane',
      'The glow up from a tech upgrade hits different',
      'I need to do a PC cleaning its been months',
      'Thermal paste reapplication is self care change my mind',
      'Running at max settings like a boss',
      'The setup tour when??',
      'What chair are you rocking? Comfort is key',
      'Dual monitor life is the way',
      'That loading speed is actually impressive',
      'The bottleneck calculator says otherwise lol',
      'The new hardware drops are looking crazy',
      'That desk setup belongs on r/battlestations',
      'SSDs changed my life and thats not an exaggeration',
      'How is the airflow in that case?',
      'The peripheral game is strong',
      'Wireless vs wired mouse the debate of the century',
      'That mouse weight is perfect for FPS gaming',
      'The DPI settings on that mouse are wild',
      'Vertical monitor for coding is game changing',
      'Triple monitor setup or ultrawide? Tough choice',
      'The USB-C everything life is actually convenient',
      'Dongle life is pain when you need all the ports',
      'That laptop thermal throttles just by looking at it',
      'Gaming laptop vs desktop the eternal struggle',
      'The portability of a laptop vs the power of a desktop',
      'That phone battery lasts how long?? Impressive',
      'Screen on time is the real phone benchmark',
      'The camera on that phone takes insane photos',
      'Pro Max Ultra Mega Plus what are these phone names',
      'Software updates breaking everything is tradition at this point',
      'That OS update bricked someones machine again',
      'New Windows update and nothing works classic',
      'Linux users explaining why they use Linux unprompted',
      'Mac vs Windows vs Linux the trilogy of hate',
      'Have you considered switching to Linux? 😂',
      'The tech stack for that project is modern and clean',
      'Microservices or monolith? Depends on the project honestly',
      'That API response time is impressive',
      'The database query optimization is satisfying work',
      'Clean code is self documenting code change my mind',
      'Documentation? What documentation? 😂',
      'The commit messages tell a story of desperation',
      'Git merge conflicts are my supervillain origin story',
      'Stack overflow copypaste engineering 💪',
      'That error message is completely unhelpful thanks',
      'The bug that only appears in production never in dev',
      'Works on my machine is not a valid deployment strategy',
      'The deployment went smooth? Lies. Somethings broken.',
      'CI/CD pipeline green on the first try? Suspicious',
      'The code review was 300 files lgtm 👍',
      'Rubber duck debugging actually works try it',
      'The 3am breakthrough that fixes everything',
      'Taking a walk fixes more bugs than debugging does',
      'The imposter syndrome in tech is real but youre doing great',
      'Self taught devs are built different honestly',
      'CS degree vs bootcamp vs self taught all valid paths',
      'That framework just released version 47 this year',
      'JavaScript frameworks coming out faster than I can learn them',
      'AI is either gonna take our jobs or make them easier',
      'Copilot is carrying my coding sessions ngl',
      'Smart home setup is either convenient or a security nightmare',
      'The server rack in the closet is a fire hazard but its cool',
      'Pi-hole blocking ads on the whole network is glorious',
      'Custom DNS for the homies who know what that means',
      'That NAS setup is goals for data hoarders',
      'Backing up data is the thing everyone should do but nobody does',
      'The hard drive failure without backup is a horror story',
      'E-waste is a real problem we need to talk about it more',
    ]
  },
  movies_tv: {
    generic: [
      'No spoilers please!! 🙈',
      'That show is so good omg',
      'I need to watch that still',
      'Is it actually worth watching though?',
      'My watchlist is never ending at this point',
      'That was such a good episode',
      'The ending had me shook',
      'Who else binged the whole thing?',
      'That show lives rent free in my head',
      'The cinematography was actually insane',
      'I rate that show 10/10 fr',
      'Season 2 when??',
      'That plot twist was wild',
      'Im so behind on everything lol',
      'Netflix and chill... with the homies 😂',
      'That anime goes crazy btw',
      'Sub or dub debate still going on?',
      'The manga is better (mandatory opinion)',
      'That character development though 👏',
      'I cried and Im not ashamed',
      'The pacing in that show is perfect',
      'They better not cancel that show',
      'The villain in that is actually well written',
      'That opening scene hooked me immediately',
      'I stayed up way too late binge watching that',
      'The cliffhanger at the end though??',
      'Im emotionally invested in these fictional characters',
      'That show ruined my sleep schedule',
      'Everyone keeps recommending this I gotta watch it',
      'The acting in that scene was phenomenal',
      'That show deserves every award it gets',
      'The world building in that is next level',
      'I think about that ending constantly',
      'How did I not know about this show before',
      'The fandom for that show is wild lol',
      'I binged that in one sitting no regrets',
      'That crossover episode was everything',
      'The animation quality is ridiculous',
      'If you havent watched it yet what are you doing',
      'That show changed the genre honestly',
      'The way they handle foreshadowing in that show is brilliant',
      'Every detail matters when you rewatch',
      'Second watch reveals so many hidden details',
      'The fan theories for that show are wild',
      'Reddit theories ended up being right somehow',
      'The show surpassed the source material and its actually good',
      'Reading the book after watching hits different',
      'The book was better but the show was still great',
      'That POV switch in the show was genius storytelling',
      'The unreliable narrator thing blew my mind',
      'That bottle episode was better than most action episodes',
      'The one shot sequence in that episode was incredible',
      'That long take scene was technically insane to film',
      'The sound design in that scene gave me chills',
      'No music in that scene and it was more powerful',
      'The silence in that moment spoke louder than any dialogue',
      'That dialogue writing is actually quotable',
      'I use quotes from that show in daily life',
      'The memes from that show are elite',
      'That show has the best meme format templates',
      'The fandom is either wholesome or completely unhinged',
      'Ship wars in that fandom are brutal stay away',
      'The chosen one trope is tired but that show did it different',
      'Subverting expectations can work when done right',
      'That season finale ruined me emotionally',
      'The mid season twist was better than most finales',
      'How is that show not talked about more?',
      'Criminally underrated show right there',
      'That show was ahead of its time and people are just now catching on',
      'Watching it week by week vs binging two different experiences',
      'Binging is better for plot heavy shows',
      'Week by week builds the hype though',
      'The theories between episodes are half the fun',
      'That post credits scene changed everything',
      'Staying after the credits in movies now because of marvel',
      'That horror movie genuinely scared me and Im not easy to scare',
      'Jump scares are cheap but that movie earned its scares',
      'The slow burn horror is way scarier than jump scare stuff',
      'That movie made me think about it for days after',
      'That documentary changed how I see things honestly',
      'True crime docs are addicting but also keep me up at night',
      'The deep dive documentaries on YouTube are just as good as Netflix',
      'Anime pacing can be rough but when it hits it HITS',
      'That fight scene in that anime was peak animation',
      'Studio going all out on that scene was worth the wait',
      'Filler episodes in anime are the bane of my existence',
      'Manga readers spoiling anime onlys is criminal behavior',
      'The opening theme of that show is an absolute banger',
      'Skipping the intro should be illegal for that show',
      'That shows opening credits are actually art',
      'End credits scenes being important now means I cant leave early',
    ]
  },
  sports: {
    generic: [
      'What a game that was!',
      'Did you see that play?? 🤯',
      'That was a crazy finish',
      'W take',
      'L take ngl',
      'That team is looking good this year',
      'ESPN top 10 moment right there',
      'That player is built different',
      'The offseason moves are gonna be interesting',
      'Fantasy league update anyone?',
      'That ref was blind smh',
      'Biggest upset of the season??',
      'The atmosphere at those games must be insane',
      'That play will be remembered forever',
      'Playoffs are gonna be wild this year',
      'The GOAT debate continues...',
      'Gym gains update? 💪',
      'That workout routine sounds brutal',
      'Leg day is the real boss fight',
      'Protein shake time 🥛',
      'That comeback was legendary',
      'The defense was insane that game',
      'That buzzer beater though?? INSANE',
      'The crowd went absolutely crazy for that',
      'Highlights from that game are everywhere',
      'How did that not make the top plays?',
      'The coaching decisions were questionable ngl',
      'That player deserves MVP honestly',
      'The rivalry game is always the best',
      'Fantasy football is ruining my friendships 😂',
      'The draft class this year is stacked',
      'I need to start going to the gym again fr',
      'That throw was a dime',
      'The stamina on that player is unreal',
      'Watching sports with the squad just hits different',
      'The pregame analysis was spot on',
      'That injury is devastating for the team',
      'The halftime show was actually fire',
      'Home field advantage is real',
      'That athletes work ethic is inspiring honestly',
      'The retirement speech hit me in the feels',
      'End of an era when legends retire',
      'The next generation of athletes is looking insane',
      'Young talent coming through the ranks is exciting',
      'That rookies confidence is unreal',
      'Veteran presence on the team matters so much',
      'The leadership on that team is what makes them great',
      'Chemistry between players is more important than talent',
      'The jersey retirement ceremony was emotional',
      'That stat line is absolutely ridiculous',
      'Triple double like its nothing how',
      'The record they broke stood for how many years??',
      'Records are meant to be broken and that one needed to go',
      'The clutch gene runs in that athletes blood',
      'Game winning shot with seconds left is peak sports',
      'The walk off hit in the bottom of the ninth',
      'Penalty kicks should be illegal they are too stressful',
      'Shootout in hockey is the most intense thing',
      'Overtime rules need to be changed honestly',
      'The playoff format is perfect dont change it',
      'Wild card team winning it all is the best storyline',
      'Cinderella story in the tournament this year',
      'March madness brackets get destroyed every year',
      'Nobody gets a perfect bracket and thats the beauty',
      'Tailgating before the game is half the experience',
      'The food at the stadium is overpriced but I still buy it',
      'Those rivalries go back generations its personal',
      'Local derby games have the best atmosphere by far',
      'The away fans showing up in numbers is respect',
      'Being in the stands when your team wins hits different',
      'Watching the game at home vs at the bar different vibes both good',
      'The sports bar atmosphere during playoffs is unmatched',
      'Wearing the jersey during game day is mandatory',
      'Superstition before games is wild some fans are dedicated',
      'The pre-game ritual is sacred dont mess with it',
      'Post game analysis is when we all become experts',
      'Monday morning quarterbacks unite',
      'The hot takes after a loss are always extreme',
      'One bad game and people want to trade everyone lol',
      'Gym progress pics are actually inspiring keep posting them',
      'The bulk to cut transformation photos are wild',
      'Leg day separates the dedicated from the casual',
      'Never skip leg day is a life philosophy',
      'The DOMS after leg day is a different kind of pain',
      'That pump after a good workout is unmatched',
      'Gym bro science is either genius or completely wrong',
      'The gym at 5am crowd is a different breed',
      'Late night gym sessions are peaceful and focused',
      'Form over weight every single time',
      'That PR was long overdue congrats',
      'The gym playlist makes or breaks the workout',
    ]
  },
  pets_animals: {
    generic: [
      'PET TAX!! Show us!! 🐾',
      'Omg thats so cute',
      'I need a pet so bad',
      'That is the cutest thing Ive ever seen',
      'Dogs are literally the best things on earth',
      'Cat people rise up 🐱',
      'The zoomies are my favorite thing ever',
      'That pet is living its best life',
      'Send more pics please 🥺',
      'I would die for that pet honestly',
      'The tail wagging always gets me',
      'What breed is that?! So cute',
      'Pets make everything better change my mind',
      'That is one happy looking pet',
      'The puppy eyes are LETHAL',
      'My heart cannot handle this cuteness',
      'BRB going to hug my pet',
      'That pet is more photogenic than me',
      'Belly rubs are non negotiable',
      'The way they just stare at you for food 😂',
      'That pet has more personality than most people',
      'Golden hour pet photos hit different',
      'The grabby paws are killing me',
      'I just wanna boop that nose',
      'Service animals are literally heroes',
      'That pet is spoiled and deserves it',
      'The bond between a person and their pet is unmatched',
      'My pet just did the funniest thing I wish I recorded it',
      'Rescue pets are the best pets fight me',
      'That animal is majestic af',
      'The way cats judge you from across the room 😂',
      'Dogs when you grab the leash that excitement is everything',
      'The happy dance when you come home is the best part',
      'Separation anxiety in pets is real and heartbreaking',
      'The vet bill arrived and my wallet is crying',
      'Pet insurance is actually worth it trust me',
      'The before and after rescue photos always get me',
      'Adopt dont shop is a movement I fully support',
      'Foster fails are the best kind of fails',
      'That kitten grew into a massive cat what happened',
      'Big dogs who think theyre lap dogs are the best',
      'Small dogs with big personalities are hilarious',
      'That cat knocked everything off the table on purpose',
      'Cats are liquid they fit anywhere they want',
      'Dog parks are free entertainment change my mind',
      'The play date between those two pets was adorable',
      'Pet costumes are either cute or pure comedy',
      'Halloween pets in costumes is the content I need',
      'Training that pet must have taken so much patience',
      'Smart pets are either impressive or terrifying',
      'That pet learned a new trick thats actually big brain',
      'The guilty face after they did something bad',
      'They know what they did and they dont care one bit',
      'The attitude on that cat is unmatched',
      'That dog smile is healing my soul',
      'Pet content is the reason the internet was invented',
      'I follow more pet accounts than human accounts',
      'The pet influencer economy is wild',
      'That pet has more followers than I do and deserves it',
    ]
  },
  weather: {
    generic: [
      'The weather is crazy rn',
      'Rain is the best sleeping weather ngl',
      'Its way too hot for this 🥵',
      'Cold weather = stay inside and game',
      'Snow day vibes are unmatched ❄️',
      'I live for fall weather fr',
      'Summer is either amazing or suffering no in between',
      'The thunderstorm sounds are lowkey relaxing',
      'Who else loves rainy days?',
      'The heat is not it today',
      'Perfect weather to do absolutely nothing',
      'Weatherman got it wrong again lol',
      'This weather makes me want hot chocolate',
      'Beach weather when??',
      'The sunset today was actually gorgeous',
      'Hoodie weather is the best weather',
      'Rain hitting the window while gaming is peak comfort',
      'Spring allergies are the real villain',
      'Four seasons in one day type of weather',
      'The weather is giving main character vibes today',
      'This weather is perfect for a walk',
      'I checked the weather and chose violence (staying inside)',
      'The temperature dropped so fast what happened',
      'Cozy weather + good music = elite combo',
      'This is sweater weather and Im here for it',
      'The fog this morning was actually eerie',
      'Cloudy days are so underrated',
      'The wind out there is no joke today',
      'Tornado warnings stress me out so much',
      'The double rainbow was worth going outside for',
      'First snow of the season always hits different',
      'I could listen to rain all day honestly',
      'The humidity is making my hair tragic',
      'Sunny days make everything feel possible',
      'Winter mornings are beautiful but COLD',
      'Ice on the roads is terrifying ngl',
      'The forecast said partly cloudy and it rained all day',
      'Pool weather is finally here lets gooo',
      'The heatwave is testing my patience',
      'Wind chill makes it feel like the arctic outside',
      'The weather app is basically my best friend now',
      'Storms rolling in always makes me nervous and excited',
      'Hot take: overcast weather is the best',
      'The frost on the windows this morning was actually pretty',
      'I love the sound of hail unless its hitting my car',
      'Weather is changing so fast I dressed wrong 3 times',
      'The golden hour lighting after a storm though',
      'Snow is only fun for the first day then its a problem',
      'I live where there are only two seasons hot and hotter',
      'The breeze today is chef kiss perfect',
      'Humidity at 100% is basically swimming in the air',
      'Rain boots season is upon us',
      'The weather is giving cozy movie night energy',
      'A thunderstorm in the distance at night is peak aesthetic',
    ]
  },
  sleep: {
    generic: [
      'Sleep is overrated... right? 😅',
      'Go to sleep bro its late 😂',
      'The sleep schedule is destroyed',
      'Who needs sleep when you have chat',
      'Insomnia gang where you at',
      '3am and still going strong',
      'I should be sleeping but here we are',
      'Nap time sounds amazing rn',
      'The melatonin isnt working 💀',
      'Sleep deprivation is a vibe apparently',
      'My body says sleep but my brain says nah',
      'One more hour... (says that every hour)',
      'The 2am thoughts hit different',
      'Early bird or night owl? Night owl forever',
      'How are you still awake lol',
      'The bed is calling but chat is too good',
      'I am running on pure willpower and caffeine',
      'Power nap or full sleep? Hard choice',
      'The bags under my eyes have their own zip code',
      'Sleep is for the weak (Im the weak)',
      'That nap was supposed to be 20 min not 4 hours',
      'Woke up and chose chaos today',
      'Morning people are a different species fr',
      'The alarm clock is my worst enemy',
      'I slept great and by great I mean 3 hours',
      'Sleep debt is real and Im bankrupt',
      'The pillow was too comfortable I couldnt leave',
      'Accidentally took a 6 hour nap oops',
      'Dreams be wild sometimes what was that about',
      'I fell asleep during the movie at the good part too',
      'The sleep paralysis demon and I are roommates now',
      'White noise machine changed my life ngl',
      'Sleeping in on the weekend is my religion',
      'How do people wake up at 5am and be happy about it',
      'The all nighter was not worth it retrospectively',
      'My circadian rhythm is in shambles',
      'One does not simply go to bed at a reasonable hour',
      'The midnight snack to bed pipeline is too real',
      'I dreamt something crazy and forgot it immediately',
      'Being tired but not being able to sleep is torture',
      'The weighted blanket is the best purchase I ever made',
      'Sunday naps are a form of self care',
      'My bed has never been more comfortable than when I need to get up',
      'I counted sheep and theyre all partying now still awake',
      'The 20 minute nap that turned into a full REM cycle',
      'Night shift people are built different fr',
      'I woke up in a different position than I fell asleep in',
      'That feeling when you wake up and its still night time W',
      'Oversleeping is just as bad as undersleeping somehow',
      'The bedtime procrastination is real even when tired',
      'I stayed up way too late reading chat again',
      'Dark circles are just my aesthetic at this point',
      'My body wakes me up at the same time even on weekends rude',
      'The afternoon crash is hitting different today',
    ]
  },
  school_work: {
    generic: [
      'The grind never stops 📚',
      'School/work is draining today',
      'Procrastination is an art form',
      'The deadline is approaching and I havent started',
      'Who invented homework honestly',
      'The motivation just isnt there today',
      'Taking a break is important too dw',
      'Group projects are the worst thing ever conceived',
      'The assignment is due WHEN?!',
      'I have so much work to do 😫',
      'The work grind is real',
      'Almost Friday though! We got this',
      'Coffee is the only reason Im functional rn ☕',
      'The 9 to 5 is testing me today',
      'Can someone do my homework for me lol',
      'Work meetings that couldve been emails >',
      'The essay isnt going to write itself unfortunately',
      'Hustle culture is real but so is burnout',
      'I need a vacation immediately',
      'The class was supposed to be easy they said',
      'Study group or solo? I cant focus with people',
      'Just submitted that assignment with 2 minutes to spare 😅',
      'The presentation anxiety is kicking in',
      'My coworkers are carrying me honestly',
      'The procrastination to productivity pipeline is real',
      'I learn more from YouTube than lectures ngl',
      'The Monday struggle is universal',
      'Report cards / performance reviews stress me out',
      'Taking notes is boring but future me will thank current me',
      'The lunch break is the best part of the day lets be honest',
      'Remote work changed the game fr',
      'Working from home means working in pajamas 🏠',
      'The imposter syndrome at work or school is real',
      'That exam was straight up unfair',
      'Teacher or boss just dropped a surprise assignment 💀',
      'The burnout is real take care of yourselves',
      'Study music recommendations? I need focus',
      'I have 15 tabs open and none of them are helping',
      'The Pomodoro technique actually works try it',
      'Group project = one person does all the work',
      'The textbook costs more than my dignity',
      'Office politics are worse than high school politics',
      'The passive aggressive email I just received 🙃',
      'That feeling when you finish a huge assignment though',
      'The end of the semester grind is brutal',
      'Work-life balance? Never heard of her',
      'The Sunday scaries are hitting hard',
      'My desk setup is my pride and joy',
      'Free food at work meetings is the only motivation',
      'The deadline extension just saved my life',
      'That test had questions from stuff we never covered',
      'The internship grind is different',
      'First day jitters never go away',
      'The commute alone is draining honestly',
      'Working overtime for free is not the vibe',
      'That study session was actually productive for once',
      'The class average was low so I feel better about my grade',
      'Graduation cant come fast enough',
      'The career change thoughts are creeping in again',
    ]
  },
  travel: {
    generic: [
      'Where are you going?? Im jealous',
      'Travel content is always fire 📸',
      'The wanderlust is REAL rn',
      'That place looks like a dream',
      'I need a trip so bad',
      'How was the flight?',
      'Airport food prices are criminal',
      'The sunset from there must be insane',
      'Adding that to the bucket list',
      'Road trips > flying change my mind',
      'The travel photos are making me jealous',
      'That destination is on my list fr',
      'The food from that country hits different',
      'How long are you there for?',
      'Bring back souvenirs for everyone lol',
      'Traveling alone is underrated honestly',
      'The jet lag is gonna be brutal though',
      'That place is giving paradise vibes 🌴',
      'I need recommendations for that area',
      'The Airbnb or hotel? Which is better?',
      'Post-vacation depression is a real thing',
      'The best part of traveling is the food lets be real',
      'Did you learn any of the language before going?',
      'That view is absolutely insane',
      'The memories from trips like that last forever',
      'The hostel stories are either amazing or terrifying',
      'Packing is an art and Im not good at it',
      'Forgetting your charger on a trip is nightmare fuel',
      'The train through the countryside is so peaceful',
      'Street food from markets is always the best food',
      'Lost my luggage once and I still have trust issues',
      'The airport WiFi is always terrible',
      'TSA pre-check is worth every penny',
      'That road trip playlist was fire though',
      'National parks are free therapy',
      'The sunrise from that mountain was life changing',
      'Camping is fun until you realize you forgot something',
      'The cheapest flights are always at 4am lol',
      'That resort looked way better in the photos',
      'Solo travel is scary at first then its freeing',
      'The layover was longer than the actual flight',
      'Customs and immigration lines are a test of patience',
      'The travel vlog content was incredible',
      'Budget travel hacks are actually genius',
      'The culture shock hits different when you actually go',
      'Trying to speak the language is half the fun',
      'That cruise ship looked like a floating city',
      'The overnight train is such a vibe',
      'Adventure travel or resort relaxing both valid',
      'The travel photography from there is insane',
      'I already want to go back and I just left',
      'The local tips from residents are always the best',
      'Day trips are underrated honestly',
      'That hidden gem spot was the highlight of the whole trip',
    ]
  },
  fashion: {
    generic: [
      'The fit is clean 🔥',
      'Drip check passed ✅',
      'That outfit goes hard',
      'W fashion sense',
      'The sneaker game is strong',
      'ID on those shoes??',
      'That hairstyle is fire btw',
      'Streetwear or clean casual? Both valid',
      'The thrift finds are always the best',
      'Where did you get that?? I need it',
      'The outfit of the day is elite',
      'Dressed to impress I see',
      'That color combo is clean',
      'Comfort > style... just kidding both matter',
      'The shoe collection is probably insane huh',
      'Fashion is self expression and yours is LOUD',
      'That drip is certified',
      'Simple fits hit harder sometimes',
      'Accessory game on point',
      'That jacket is everything',
      'The confidence boost from a good outfit is real',
      'Monochrome fits are underrated',
      'That vintage find is a grail',
      'Sneaker drops are stressful but worth it',
      'The fit pic when??',
      'Layering game is strong this season',
      'That watch really completes the look',
      'Matching colors or contrast which style are you',
      'The wardrobe refresh was needed honestly',
      'Oversized fits are a whole vibe',
      'The tailored look is just so clean',
      'Sunglasses really do change the whole outfit',
      'Brand loyalty or variety shopping? Mix of both',
      'The secondhand finds are always the best stories',
      'Coordinating outfits with friends is elite behavior',
      'The seasonal wardrobe switch is exhausting but worth it',
      'Wearing all black is a lifestyle not just a choice',
      'That hat adds so much character to the fit',
      'Platform shoes are making a comeback and Im for it',
      'The jewelry game is leveling up I see',
      'Comfort shoes that still look good are the holy grail',
      'DIY fashion projects are actually so fun',
      'The designer vs dupe debate never ends',
      'Closet organization is satisfying to watch',
      'That fabric texture looks luxurious',
      'The minimalist style is underrated for real',
      'Mixed patterns take courage and it paid off',
      'That belt was the missing piece of the whole outfit',
      'Fashion trends cycle so just wait for your time',
      'The custom piece is one of a kind love it',
      'Dress for the job you want not the one you have',
      'The glow up fashion edition is real',
      'That color suits you perfectly',
      'Bag game strong as usual',
    ]
  },
  money: {
    generic: [
      'Down bad financially rn 😭',
      'Money talks and mine says goodbye',
      'The savings account is crying',
      'Invest in what though?',
      'Payday hits different when rent is due',
      'Broke until further notice 💸',
      'The budget is a suggestion at this point',
      'Financial literacy is important fr',
      'That sounds expensive but worth it',
      'My wallet just flinched reading that',
      'The grind for money never stops',
      'Just found a deal too good to be true',
      'Crypto is a rollercoaster and Im not wearing a seatbelt',
      'Save money or enjoy life? The eternal question',
      'The sale prices are calling my name',
      'I need a raise yesterday',
      'Making money in your sleep is the dream',
      'The impulse purchase hit hard today',
      'Is that worth the price though?',
      'Money cant buy happiness but it buys pizza and thats close',
      'Financial goals for this year looking ambitious ngl',
      'The subscription services are draining my account',
      'That deal was too good to pass up',
      'Investing young is the move apparently',
      'Budgeting apps are great until you see the truth',
      'The credit card bill arrived and I blacked out',
      'Thrift shopping is an art and a sport',
      'Side hustles are the new normal',
      'Passive income is the dream if you can get it going',
      'The price of groceries went up AGAIN',
      'Coupon stacking is a real skill',
      'Financial independence retire early sounds nice',
      'That buy one get one deal was calling my name',
      'Splitting the bill is always awkward',
      'The tipping culture debate is wild',
      'Meal prepping saves money for real',
      'That was an investment not an expense... right?',
      'Student loans are the real final boss',
      'The cost of living is no joke',
      'Black Friday deals are hit or miss honestly',
      'Compound interest is either your best friend or worst enemy',
      'My savings goal just felt more realistic today',
      'The economy is doing that thing again',
      'Emergency fund is non negotiable honestly',
      'Rent prices are absolutely criminal',
      'The 50 30 20 budget rule actually works',
      'Tax season is stressful every single year',
      'That refund hit different this year',
      'The price comparison saved me so much money',
      'Living below your means is harder than it sounds',
      'Financial freedom is the ultimate goal',
      'That receipt shocked me not gonna lie',
      'The rewards points are finally adding up',
      'Free shipping minimum is my weakness',
    ]
  },
  relationship: {
    generic: [
      'Ayy thats wholesome 🥰',
      'Relationship goals right there',
      'The single life has its perks too ngl',
      'Thats actually really sweet',
      'The dating scene is wild out there',
      'Friendship is the real treasure change my mind',
      'Thats wholesome content right there',
      'The homies are the real MVPs',
      'Long distance or nah?',
      'Communication is key they say',
      'Thats cute not gonna lie 🥺',
      'The friend group dynamic is everything',
      'Bros before... wait nah everyone important',
      'That support system hits different',
      'Trust is everything in any relationship',
      'Thats actually the cutest thing',
      'Found the wholesome content of the day',
      'The loyalty is unmatched',
      'Everyone needs friends like that',
      'Thats real love right there',
      'The group chat is always chaotic but we love it',
      'Quality time > everything else',
      'Thats the kind of energy we need more of',
      'Being there for people is underrated',
      'The real ones always show up',
      'That surprise for them was so thoughtful',
      'Long distance takes real dedication respect',
      'The love language talk is actually important',
      'That apology was chef kiss genuine and real',
      'Friendship breakups are just as hard ngl',
      'The matching pfps are cute I cant lie',
      'That glow up after the breakup though',
      'Supporting each other through hard times is real love',
      'The inside jokes are what make friendships elite',
      'Introvert friendships are quiet but so deep',
      'That friend who always checks in on you is a keeper',
      'The trust fall of friendships is being vulnerable first',
      'Found family is just as valid as blood family',
      'The duo content is superior to solo content',
      'Childhood friends who are still friends are precious',
      'That heart to heart conversation was needed',
      'Boundaries in relationships are healthy not mean',
      'The double date was actually so fun',
      'Making new friends as an adult is weirdly hard',
      'The friends who hype you up are the real ones',
      'Unexpected kindness from someone hits different',
      'That reunion after years apart must have been emotional',
      'The support system you have is everything',
      'Pet names are either adorable or cringe no middle ground',
      'Late night conversations with close friends are the best',
      'The group trip together would be legendary',
      'Matching outfits with your bestie is peak friendship',
      'That compliment made their whole day I bet',
      'Being someones safe person is the highest honor',
    ]
  },
  cars: {
    generic: [
      'What car is that? Clean 🚗',
      'The car enthusiast energy is strong',
      'Manual or automatic? (Manual obviously)',
      'That car is a dream',
      'The exhaust note on that must be insane',
      'JDM supremacy 🏎️',
      'That build is coming along nicely',
      'How much HP we talking?',
      'Car meets hit different at night',
      'The maintenance on that must be rough though',
      'Is it a daily or a weekend car?',
      'The mods on that are clean',
      'Insurance on that gotta be wild',
      'That color is perfect for that car',
      'The turbo spool sound is therapy',
      'Car people just understand each other fr',
      'What tires you running?',
      'The interior is just as important fight me',
      'First car memories hit different',
      'That detailing job is pristine',
      'Carwash or hand wash? Details matter',
      'The highway pulls in that must be crazy',
      'Stance or performance? Why not both',
      'That wrap or factory color?',
      'Car content on YouTube is addicting',
      'That engine swap was ambitious but it paid off',
      'Air freshener game in the car is important',
      'The sound system in that car must be incredible',
      'Muscle cars or imports both communities are passionate',
      'Electric cars are the future whether we like it or not',
      'That paint job is custom right its too clean',
      'Dashboard cam footage is always wild',
      'Parallel parking is the real drivers test',
      'Road rage is never worth it just breathe',
      'That car wash ASMR is satisfying content',
      'Stick shift in traffic is a workout',
      'The car collection goals are insane',
      'Rally cars are the most exciting motorsport fight me',
      'The carbon fiber accents are chefs kiss',
      'The resale value on that is going up for sure',
      'Midnight drives with the windows down is therapy',
      'That drift was clean controlled and intentional',
      'Garage setup goals right there',
      'The headlights on the new models are futuristic',
      'Ceramic coating is the move for protection',
      'That project car has so much potential',
      'Vintage trucks are making a comeback and I support it',
      'The driving route through the mountains must be incredible',
      'Fuel prices making me reconsider that road trip',
      'That car has personality I can tell',
      'The racing stripes actually look good on that one',
      'Car people naming their cars is perfectly normal',
      'The first car show of the season is always hype',
      'That garage find restoration is amazing content',
    ]
  },
  creative: {
    generic: [
      'That art is AMAZING 🎨',
      'The talent in here is insane',
      'How long did that take to make?',
      'You should sell that honestly',
      'The creative energy is flowing',
      'Drop the portfolio link!',
      'The detail in that is incredible',
      'Self taught? Thats even more impressive',
      'The style is so unique I love it',
      'Art is therapy and this is proof',
      'Commission prices for that level of skill?',
      'That photography is professional level',
      'The color palette choice is perfect',
      'Keep creating that is actual talent',
      'The improvement from your old work is insane',
      'How did you learn that? Tutorial link??',
      'Digital or traditional? Both hit different',
      'The composition is chefs kiss 🤌',
      'That editing work is so clean',
      'The creative process is fascinating honestly',
      'You made that?? Thats professional quality',
      'The art community here is so talented',
      'That took real skill to pull off',
      'The linework is so satisfying to look at',
      'Bruh Im jealous of your talent fr',
      'The creative block is real but push through it',
      'That time lapse of the creation process is mesmerizing',
      'The sketchbook tour was so interesting',
      'Mixed media art is so cool and unique',
      'The pottery and ceramics content is so satisfying',
      'Speed painting videos are hypnotic',
      'That music production setup is insane',
      'The beat you made is fire drop it',
      'Writing poetry or stories? Both are valid art',
      'The calligraphy is so smooth and flowing',
      'That sculpture came out incredible',
      'The before and after of that piece is wild',
      'Fan art of that quality deserves more recognition',
      'The animation smoothness is professional grade',
      'Stop motion content takes so much patience respect',
      'That album cover design goes hard',
      'The graphic design is chef kiss clean',
      'Woodworking is an underrated creative outlet',
      'That crochet or knitting pattern is complex and beautiful',
      'The cosplay craftsmanship is next level',
      'Painting on different surfaces is so creative',
      'The embroidery detail I cant even imagine the patience',
      'That guitar riff you wrote is catchy',
      'The film editing gives professional vibes',
      'Street art and murals add so much life to a city',
      'The creative community supporting each other is wholesome',
      'That custom sneaker design is fire',
      'Resin art is both relaxing and cool to watch',
      'The font design work is so clean and readable',
    ]
  },
  horror_scary: {
    generic: [
      'Nah that gave me chills 😨',
      'Why would you share that at this hour 💀',
      'Im sleeping with the lights on tonight',
      'That is genuinely terrifying',
      'Horror is the best genre fight me',
      'The scariest part is that could be real',
      'Nope nope nope nuh uh',
      'My heart rate just spiked reading that',
      'That jumpscare got everyone in the room',
      'Horror movies at night are a different experience',
      'The atmosphere in those stories is everything',
      'True crime is addicting but also concerning',
      'I love horror until its 3am and I hear a noise',
      'That theory is actually really creepy',
      'The found footage genre is underrated',
      'Paranormal activity? In this economy?',
      'That rabbit hole goes deep be careful',
      'Internet mysteries are the best kind of content',
      'The iceberg videos on that topic are insane',
      'Nah that urban legend gave me anxiety',
      'Why do we watch scary stuff at night? We never learn',
      'The psychological horror is way scarier than jumpscares',
      'Bro Im not sleeping after this conversation',
      'That conspiracy theory actually made sense though 👀',
      'Ok but what if its real... nah jk... unless? 😅',
      'The creepypasta community writes better than some authors',
      'That abandoned building exploration was terrifying',
      'The true crime documentary was unsettling but well made',
      'That plot twist in the horror movie got everyone',
      'The ARG rabbit hole goes so deep',
      'Analog horror is the scariest new genre honestly',
      'That unresolved mystery still keeps me up at night',
      'The backrooms content is weirdly fascinating',
      'The SCP rabbit hole is endless and terrifying',
      'That haunted house experience looked wild',
      'The atmospheric horror is way more unsettling',
      'Reading scary stories at 3am was a mistake',
      'That supernatural encounter story gave me goosebumps',
      'The documentary evidence was actually convincing',
      'Liminal spaces are creepy but I cant stop looking',
      'The deep web stories are always unsettling',
      'That horror game has the best jump scares',
      'The folklore from that culture is genuinely terrifying',
      'Alien documentaries at night are a choice',
      'That mystery was solved after decades thats wild',
      'The unsolved cases are the ones that haunt you',
      'Camping horror stories hit different when camping',
      'The ocean deep is scarier than space change my mind',
      'That crime scene breakdown was detailed and chilling',
      'The horror manga art style is horrifying in the best way',
      'Cursed images at midnight? Why do I do this to myself',
      'The missing persons cases are always so sad and scary',
      'That cult documentary was eye opening and terrifying',
      'The unexplained sounds in the woods late at night 😨',
    ]
  },
  mood_positive: {
    responses: [
      'The vibes are immaculate rn 😎',
      'We love to see it',
      'Thats what Im talking about!',
      'W energy right here',
      'This chat is goated today',
      'Good vibes only in here',
      'The positivity is real 🔥',
      'Everyone eating good today',
      'I love this energy fr',
      'Big W moment',
      'Chat is on fire today',
      'This is the content I signed up for',
      'Wholesome hours activated',
      'The good ending 🎬',
      'Everything is coming together nicely',
      'Were all winning today',
      'Certified feel good moment',
      'This right here is a vibe',
      'Chat diff honestly',
      'The serotonin is flowing',
      'Nothing but good energy in here 🌟',
      'This is what peak chat looks like',
      'Spreading the positivity one message at a time',
      'The feel good energy is contagious',
      'Everyone is thriving today I love it',
      'Main character energy from everyone rn',
      'The good vibes are off the charts',
      'I am here for this energy fr',
      'This chat is a safe space for Ws only',
      'Today is a good day and thats that',
      'Chat decided to be elite today',
      'The happiness in here is unmatched',
      'Group hug in chat 🤗',
      'This energy needs to be bottled and sold',
      'Everyone is winning today no exceptions',
      'The happiness is radiating through the screen',
      'That made my day and I needed it',
      'The collective W in here is massive',
      'Youre all amazing and I mean that',
      'The encouragement in chat is unmatched',
      'Group celebration mode activated 🎊',
      'The support in this community is unreal',
      'That accomplishment deserves recognition',
      'The pride I feel for chat rn is real',
      'This is what a winning mentality looks like',
      'The blessings keep coming',
      'Everything worked out as it should',
      'The universe is on our side today clearly',
      'Cheers to the good times 🥂',
      'The glow up is real and ongoing',
      'Smiles all around in here today',
      'That news just made everything better',
      'The energy shift is noticeable and welcome',
      'Grateful for this moment fr',
      'The stars aligned for this one',
      'Chat is radiating pure joy rn',
      'That was the highlight of the day easily',
      'The celebration is well deserved',
      'Manifest energy is paying off',
      'Happy vibes are spreading like wildfire',
      'The comeback nobody expected W',
      'Good karma coming back around',
      'Today chose to be on our side',
      'The smiley faces in chat are contagious 😊',
    ]
  },
  mood_negative: {
    responses: [
      'It be like that sometimes 😔',
      'I felt that honestly',
      'Pain. Just pain.',
      'We go again tomorrow though 💪',
      'Rough day huh? It gets better fr',
      'Sending good vibes your way',
      'That is unfortunate but we move',
      'L moment but tomorrows a new day',
      'At least chat is here for you',
      'Head up king/queen, the crown is slipping',
      'Bad days make good days feel even better',
      'The comeback is always greater than the setback',
      'Its giving main character struggle arc',
      'Plot armor will kick in soon dont worry',
      'This is just the villain arc before the redemption',
      'Bruh same though',
      'Thats rough buddy',
      'We all been there honestly',
      'Tomorrow is a fresh start',
      'Keep your head up, it gets better 🫶',
      'This too shall pass fr fr',
      'Bad chapter not a bad story remember that',
      'You got this even when it doesnt feel like it',
      'Rest if you need to but dont quit',
      'The struggle is temporary the growth is permanent',
      'Chat is here for you always',
      'Even the darkest night ends with sunrise',
      'Take it one step at a time',
      'Youre stronger than you think honestly',
      'Sometimes life hits different but we bounce back',
      'Sending virtual hugs rn 🫂',
      'Growth comes from struggle real talk',
      'You survived every bad day before this one too',
      'Its okay to not be okay sometimes',
      'Were gonna get through this chat strong together',
      'Sometimes you just gotta let it out and thats okay',
      'The healing process isnt linear remember that',
      'Its okay to take breaks from being strong',
      'Rough patches build character fr',
      'The light at the end of the tunnel is there I promise',
      'Everyone hits rock bottom before they bounce back',
      'Nobody has it all figured out and thats normal',
      'Your effort matters even when results are slow',
      'Progress isnt always visible but its happening',
      'Being kind to yourself is not optional',
      'The setback is just setup for the comeback story',
      'One bad day doesnt define the whole week',
      'Youre doing better than you think honestly',
      'The feelings are valid dont let anyone tell you otherwise',
      'Take the time you need theres no rush',
      'Every masterpiece went through drafts and edits same with life',
      'The storm doesnt last forever it just feels like it',
      'Lean on the people who care about you',
      'Something better is coming just hang in there',
      'Its not giving up its regrouping',
      'Even on bad days youre still moving forward',
      'The weight of the world isnt yours alone to carry',
      'Be gentle with yourself today and every day',
      'Rain makes things grow and so do hard times',
      'Your worth isnt tied to one bad moment',
      'Rest is productive too never forget that',
      'The low points make the highs worth it',
      'Tomorrow is unwritten and full of potential',
      'Chat has your back no matter what',
    ]
  },
  greeting: {
    hello: [
      'Hey! Whats good? 👋',
      'Yooo whats up!',
      'Hey hey! Welcome!',
      'Ayy whats going on!',
      'Sup! How we doing today?',
      'Hey! Good to see you!',
      'Welcome welcome! 🎉',
      'Heyyy! How are you?',
      'Yooo wassup!',
      'Hey there! 😄',
      'Ayy welcome!',
      'Whats poppin!',
      'Hey! Glad youre here',
      'Oh hey! Whats up?',
      'Whatup! How goes it?',
      'Look who showed up! Hey! 👋',
      'The gang is here! Sup!',
      'Ayyy there they are!',
      'Hola! How you doing?',
      'Welcome to the chaos! 😂',
      'Hey hey! Pull up a chair',
      'Oh snap we got company! Hey!',
      'The party dont start till you walk in',
      'Yo! Long time no see! How you been?',
      'Waddup! Chat just got better',
      'Ayo! Welcome to the stream!',
      'Hey fam! Whats the move today?',
      'Oh snap its you! Whats good!',
      'Welcome in! Grab a snack and get comfy',
      'Eyyy there they are! How you doing?',
      'Hey! Ready for some fun? 🎮',
      'The vibe just got better youre here!',
      'Hey newcomer! Welcome to the community!',
      'Well well well look who decided to join us',
      'Salutations! JK whats up lol',
      'Heyo! How was your day?',
      'Another day another hello! Hey!',
      'Oh its you! Pull up pull up',
      'Hey friend! Long time! ✨',
      'The notification said you joined and I got excited',
      'Yo! Big welcome from chat!',
      'Hello hello! Make yourself at home',
      'Ayyy my fav person just arrived',
      'Hey! Just in time for the good stuff',
    ],
    goodbye: [
      'Later! Take it easy ✌️',
      'See ya! Have a good one!',
      'Peace! Catch you later!',
      'Bye! Dont be a stranger!',
      'Later! Stay safe out there',
      'Adios! See you next time',
      'See you around! 👋',
      'Take care! Come back soon',
      'Later gator! 🐊',
      'Peace out! ✌️',
      'Cya later!',
      'Bye bye! Have a great day/night',
      'See ya! It was fun',
      'Goodnight! Rest well 🌙',
      'Take it easy!',
      'Until next time! 🫡',
      'Dont stay away too long!',
      'Rest up! See you next session',
      'Have a good one! You deserve it',
      'Later! Chat wont be the same without you',
      'Go get some rest! See ya tomorrow',
      'Peace! It was real 🤙',
      'Drive safe if youre heading out!',
      'Night night! Sweet dreams 💤',
      'Till next time legend ✌️',
      'Catch you on the flip side!',
      'Have the best night or day wherever you are!',
      'Missing you already honestly',
      'Byeee! Chat sending good vibes your way',
      'Go live your best life! See ya!',
      'Logging off? Fair enough rest well!',
      'The goodbye is always the hardest part',
      'You better come back soon or we riot',
      'Sending you off with a virtual high five ✋',
      'Sweet dreams if youre heading to sleep!',
      'Stay hydrated and get some rest!',
      'Later! The next time will be even better',
      'Farewell friend! Until our paths cross again',
      'The exit is bittersweet but see ya soon!',
      'Go touch some grass for the rest of us 🌿',
      'Bye! Tell em chat said hi',
      'Take it easy champion!',
      'The stream ending sadge but see you next time!',
      'Goodnight from the whole crew! 🌙',
    ],
    welcome_back: [
      'Oh youre back! Welcome back!',
      'Ayy look whos back! 👀',
      'Welcome back! We missed you',
      'The legend returns!',
      'Wb! What did we miss?',
      'Oh snap youre back! Lets go',
      'Return of the king/queen 👑',
      'Wb wb! How you been?',
      'You were missed! Welcome back',
      'The comeback is real 💪',
      'Look who decided to show up again 😂',
      'The OG is back in the building',
      'Welcome back! Chat was boring without you',
      'The prodigal chatter returns!',
      'Wb! We saved your seat',
      'THEY HAVE RETURNED',
      'Back from the shadow realm I see',
      'The gang is complete again',
      'Oh you survived out there? Welcome back lol',
      'Chat just leveled up now that youre back',
      'Where did you go? Doesnt matter youre here now',
      'The sequel is always better and youre back for it',
      'WB legend! What we talking about?',
      'The notification said youre back and I got hype',
      'Just when we thought chat peaked you returned',
      'Back for more I see love it',
      'You were gone for too long dont do that again',
      'Chat was 60% less fun without you just saying',
      'The absence made the heart grow fonder wb!',
      'Returned from the void I see welcome back',
      'THE RETURN 🔥 how you been?',
      'Ayy the missing piece is back!',
      'Didnt recognize chat without you in it wb!',
      'The energy just shifted youre back lets gooo',
      'Missed your presence for real wb!',
      'Like you never left honestly wb!',
      'The comeback tour continues wb!',
      'Welcome back to the chaos you were missed',
      'Chat was asking about you the whole time',
    ]
  },
  question: {
    generic: [
      'Good question honestly',
      'I was wondering the same thing',
      'Thats a great question',
      'Someone smart answer this pls',
      'Asking the real questions out here',
      'I actually dont know but Im curious now too',
      'Great question, who knows?',
      'The question of the day right there',
      'I need to know this too actually',
      'Big brain question',
      'Hmmm thats actually interesting',
      'Now Im curious too 🤔',
      'Can someone google this for us lol',
      'That made me think ngl',
      'Asking the real questions here',
      'Chat help us out on this one',
      'We need an expert in here for that',
      'The question we didnt know we needed',
      'Thats gonna keep me up tonight thinking about it',
      'Drop your hot take on this one',
      'This is the kind of deep conversation I live for',
      'Someone has the answer in here I know it',
      'That question just opened a whole can of worms',
      'The debate is about to get heated 🔥',
      'I have opinions but Im scared to share lol',
      'This is gonna split the chat for sure',
      'Controversial take incoming??',
      'Everyone has a different answer for this one',
      'The real question is does anyone actually know',
      'Shower thought level question right there',
      'That question deserves its own thread',
      'Im writing that down for later',
      'The philosophical energy is strong with this one',
      'My brain just buffered trying to think about this',
      'That made me pause and actually think',
      'I have a theory but its probably wrong',
      'Google might know but do WE know',
      'The kind of question that starts a podcast',
      'That question should be on an exam',
      'I just went down a rabbit hole researching that',
      'My hot take might be controversial',
      'I feel like there is no right answer here',
      'The think tank in chat is activated',
      'Someone with a degree please answer this',
      'That question was deeper than the Mariana Trench',
      'Wait actually I want everyones opinion on this',
      'The kind of question that makes you stare at the ceiling',
      'Genuinely never thought about it that way',
      'That question unlocked a new perspective for me',
      'My brain cells are attempting to form an answer',
      'If chat doesnt know then nobody does',
      'That question just created more questions',
      'The debate club energy in here is strong',
      'I need a whiteboard to explain my answer',
      'Actually wait thats a really interesting angle',
      'The wisdom of the crowd will solve this one',
      'I love the random knowledge drops from these questions',
      'That question just divided chat perfectly 50/50',
    ]
  },
  meme: {
    generic: [
      'Bro 💀💀',
      'Im dead 😂😂',
      'LMAOOO',
      'Nahhh thats crazy',
      'I cant with you guys lmao',
      'This chat is unhinged and I love it',
      'The memes write themselves here',
      'Absolute cinema',
      'This is peak content right here',
      'Someone screenshot this 📸',
      'Bro thats hilarious',
      'The comedy is elite in here',
      'I wasnt ready for that 💀',
      'You did NOT just say that lmao',
      'Chat is in rare form today',
      'This conversation is going in the group chat',
      'Nahhh youre wild for that 😂',
      'Bro is a menace',
      'The funniest timeline',
      'We are living in a meme',
      'Actual comedy gold',
      'I spit out my drink reading that',
      'This is why I come to chat lol',
      'Chef kiss on that joke 🤌',
      'The comedic timing was perfect',
      'Brain rot chat is the best chat',
      'That just sent me to another dimension 💀',
      'The aura on that message is insane',
      'Bro just typed that with no hesitation',
      'Chat is going through it and I love every second',
      'The chronically online energy is immaculate',
      'That reference is elite tier',
      'I need to save this conversation 😂',
      'Bro rizzing up the chat rn',
      'The sigma grindset is strong with this one',
      'Main NPC dialogue right there',
      'The ohio energy in this chat',
      'That was unhinged in the best way possible',
      'The brain damage from this chat is permanent and I love it',
      'Someone needs to touch grass after that message 🌿',
      'The lore in this chat is deeper than any anime',
      'Bro just broke the matrix with that take',
      'That was the most unserious thing Ive ever read',
      'The chat is writing itself at this point',
      'Internet culture peaked with this conversation',
      'The comedic genius in chat today is unmatched',
      'I literally cant breathe from laughing 😂',
      'Whoever said that needs a Netflix special',
      'The callback to that earlier joke was perfect',
      'Chat writing skills are underrated this is content',
      'The roast session just started nobody is safe',
      'That delivery was impeccable timing and all',
      'Comedy chemistry between chat members is gold',
      'The running joke is now canon',
      'Adding that to the quote wall immediately',
      'The comedic value of this chat is priceless',
      'No thoughts just vibes and memes in here',
      'That was the plot twist nobody expected',
      'The sitcom that is this chat needs a laugh track',
      'Bro woke up and chose comedy today',
      'The meme game in this community is elite',
      'That pun was bad and you should feel bad but I laughed',
      'Deadpan humor hits when done right and that was right',
      'The reaction image I wish I could post rn',
      'Chat is a content farm and I love it',
      'That joke will be referenced for weeks I already know',
      'The random humor at 2am is top tier',
      'My humor is broken because that was way too funny',
      'The shitpost quality in here is gourmet',
      'Someone clip that messages entire existence',
      'The ratio of serious to unhinged messages is perfect',
      'Chat is just NPCs with the best dialogue ever',
      'The copypasta potential on that message is high',
      'No context needed that was just funny',
    ]
  },
  fallback: [
    'Real',
    'Facts',
    'Fr fr',
    'True true',
    'I feel that',
    'Makes sense',
    'Valid',
    'Lowkey yeah',
    'Honestly same',
    'Thats actually interesting',
    'Hmm didnt think about it like that',
    'Thats a good point',
    'I can see that',
    'Respectable take',
    'Cant argue with that',
    'Interesting 🤔',
    'Say less',
    'No cap',
    'Yeah for real',
    'That tracks',
    'Big if true',
    'I agree tbh',
    'Yep yep',
    'Couldnt have said it better',
    'This right here ^^',
    'Underrated comment',
    'Thats what Im saying!',
    'Preaching to the choir',
    'You get it',
    'Straight up',
    'Not wrong',
    'The truth has been spoken',
    'Say it louder for the people in the back',
    'Period.',
    'This is the way',
    'Noted 📝',
    'W take',
    'Based',
    'Truer words have never been spoken',
    'Literally this',
    'Pin this message',
    'Hard agree',
    'You spittin rn',
    'The realest thing said in chat today',
    'Bars honestly',
    'Someone said it finally',
    'Tea ☕',
    'And thats on everything',
    'Exactly what I was thinking',
    'Well said well said',
    'Yup that checks out',
    'Nothing to add youre right',
    'I mean yeah thats fair',
    'Good point good point',
    'Trueeee',
    'Yep cant deny that',
    'For sure for sure',
    'That resonates honestly',
    'I stand by that take',
    'Agreed no further questions',
    'Absolutely right',
    'You read my mind',
    'I second that motion',
    'The people have spoken and theyre right',
    'Factual statement right there',
    'I have nothing to add that says it all',
    'Major facts right there',
    'Thats it thats the take',
    'Literally could not agree more',
    'Real recognize real',
    'This is canon now',
    'Youve convinced me completely',
    'Eloquently put honestly',
    'This message needs to be pinned',
    'Dropping knowledge on us I see',
    'The correct take has been located',
    'Copy paste that its gospel now',
    'I felt that in my soul',
    'This deserves more engagement fr',
  ]
};

// ======================== CHANNEL MEMORY ========================

class ChannelMemory {
  constructor(maxMessages = 30) {
    this.channels = new Map(); // channelId → messages[]
    this.maxMessages = maxMessages;
    this.userLastSeen = new Map(); // `channelId:userId` → timestamp
  }

  addMessage(channelId, userId, username, content) {
    if (!this.channels.has(channelId)) this.channels.set(channelId, []);
    const msgs = this.channels.get(channelId);
    msgs.push({
      userId,
      username,
      content,
      timestamp: Date.now(),
      topics: detectTopics(content)
    });
    if (msgs.length > this.maxMessages) msgs.shift();

    const key = `${channelId}:${userId}`;
    this.userLastSeen.set(key, Date.now());
  }

  getRecentTopics(channelId, windowMs = 120000) {
    const msgs = this.channels.get(channelId) || [];
    const cutoff = Date.now() - windowMs;
    const topicCounts = {};

    for (const msg of msgs) {
      if (msg.timestamp < cutoff) continue;
      if (!msg.topics) continue;
      for (const [topic, data] of msg.topics) {
        topicCounts[topic] = (topicCounts[topic] || 0) + data.score;
      }
    }

    return Object.entries(topicCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([topic]) => topic);
  }

  getRecentMessages(channelId, count = 10) {
    const msgs = this.channels.get(channelId) || [];
    return msgs.slice(-count);
  }

  isUserReturning(channelId, userId, thresholdMs = 1800000) {
    const key = `${channelId}:${userId}`;
    const lastSeen = this.userLastSeen.get(key);
    if (!lastSeen) return true; // first time = returning
    return (Date.now() - lastSeen) > thresholdMs;
  }

  getActiveUserCount(channelId, windowMs = 300000) {
    const msgs = this.channels.get(channelId) || [];
    const cutoff = Date.now() - windowMs;
    const users = new Set();
    for (const msg of msgs) {
      if (msg.timestamp >= cutoff) users.add(msg.userId);
    }
    return users.size;
  }
}

// ======================== SMART BOT CORE ========================

class SmartBot {
  constructor() {
    this.markov = new MarkovChain();
    this.memory = new ChannelMemory(30);
    this.lastReplyTime = new Map(); // channelId → timestamp
    this.messageCountSinceReply = new Map(); // channelId → count
    this.config = {
      enabled: false,
      replyChance: 0.06,          // 6% chance to reply to any message
      mentionAlwaysReply: true,    // always reply when @mentioned
      nameAlwaysReply: true,       // always reply when bot name mentioned
      cooldownMs: 30000,           // minimum 30s between replies per channel
      minMessagesBetween: 4,       // minimum 4 messages from others before next reply
      markovChance: 0.25,          // 25% chance to use Markov instead of template
      maxResponseLength: 200,      // cap response length
      allowedChannels: [],         // empty = all channels
      ignoredChannels: [],         // never reply in these
      botName: '',                 // bot display name (auto-detected)
      personality: 'chill',        // chill, hype, sarcastic
    };

    // Knowledge base for info queries
    this.knowledge = {
      // Stream info
      streamSchedule: '',       // e.g. "Mon/Wed/Fri at 7pm EST"
      nextStream: '',           // e.g. "Tomorrow at 7pm"
      isLive: false,
      currentGame: '',
      streamTitle: '',
      viewerCount: 0,
      streamerName: '',
      // Social links
      socials: {},              // { youtube: 'url', twitter: 'url', ... }
      // Custom info entries { key: { question patterns, answer } }
      customEntries: {},
      // Discord server info
      serverInfo: '',
      rules: '',
    };

    // Stats
    this.stats = {
      totalReplies: 0,
      topicReplies: {},
      markovReplies: 0,
      templateReplies: 0,
      mentionReplies: 0,
      lastReplyAt: null
    };
  }

  // Pick a random element from array
  pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // Decide if the bot should reply to this message
  shouldReply(msg, botUserId) {
    if (!this.config.enabled) return { reply: false };
    
    const channelId = msg.channel.id;

    // Check channel restrictions
    if (this.config.ignoredChannels.includes(channelId)) return { reply: false };
    if (this.config.allowedChannels.length > 0 && !this.config.allowedChannels.includes(channelId)) {
      return { reply: false };
    }

    // Always reply if mentioned
    if (this.config.mentionAlwaysReply && msg.mentions.has(botUserId)) {
      return { reply: true, reason: 'mention' };
    }

    // Always reply if bot name is mentioned
    const botName = this.config.botName.toLowerCase();
    if (this.config.nameAlwaysReply && botName && msg.content.toLowerCase().includes(botName)) {
      return { reply: true, reason: 'name' };
    }

    // Cooldown check
    const lastReply = this.lastReplyTime.get(channelId) || 0;
    if (Date.now() - lastReply < this.config.cooldownMs) return { reply: false };

    // Min messages between replies
    const msgCount = this.messageCountSinceReply.get(channelId) || 0;
    if (msgCount < this.config.minMessagesBetween) return { reply: false };

    // Detect topics for decision making
    const topics = detectTopics(msg.content);
    const wordCount = msg.content.trim().split(/\s+/).length;

    // Higher chance if topic is strong (2+ keywords matched)
    if (topics && topics[0] && topics[0][1].score >= 3) {
      if (Math.random() < this.config.replyChance * 3) {
        return { reply: true, reason: 'strong_topic' };
      }
    }

    // Random chance — but only if message has substance
    if (wordCount >= 4 && Math.random() < this.config.replyChance) {
      // Only reply randomly if we detected at least one topic with decent confidence
      if (topics && topics[0] && topics[0][1].confidence === 'high') {
        return { reply: true, reason: 'random' };
      }
      // For low-confidence topics, check conversation context
      if (topics && topics[0]) {
        const recentTopics = this.memory.getRecentTopics(msg.channel.id);
        if (recentTopics.includes(topics[0][0])) {
          return { reply: true, reason: 'random_contextual' };
        }
      }
    }

    return { reply: false };
  }

  // Generate the reply
  generateReply(msg, reason) {
    const content = msg.content;
    const username = msg.member?.displayName || msg.author.username;
    const topics = detectTopics(content);
    const sentiment = analyzeSentiment(content);
    const channelId = msg.channel.id;
    const recentTopics = this.memory.getRecentTopics(channelId);

    let reply = null;
    let usedMarkov = false;
    let topicUsed = 'fallback';

    // Check if it's an info/knowledge question first
    const infoAnswer = this.checkInfoQuery(content);
    if (infoAnswer) {
      this.stats.totalReplies++;
      this.stats.topicReplies['info'] = (this.stats.topicReplies['info'] || 0) + 1;
      this.stats.lastReplyAt = new Date().toISOString();
      return infoAnswer;
    }

    // Use conversation context to boost topic detection
    // If the channel has been discussing a topic, a weak match becomes more valid
    let contextBoost = null;
    if (recentTopics.length > 0) {
      contextBoost = recentTopics[0]; // dominant conversation topic
    }

    // Determine primary topic
    let primaryTopic = null;
    let subCategory = 'generic';

    if (topics && topics.length > 0) {
      const topEntry = topics[0];
      // If the top topic only matched 1 keyword, check if conversation context confirms it
      if (topEntry[1].confidence === 'low' && contextBoost) {
        // See if channel context supports this topic or a different one
        const contextMatch = topics.find(([t]) => t === contextBoost);
        if (contextMatch) {
          // Use the context-supported topic instead
          primaryTopic = contextBoost;
          topicUsed = contextBoost;
        } else {
          // Low confidence + no context match: still use it but with caution
          primaryTopic = topEntry[0];
          topicUsed = topEntry[0];
        }
      } else {
        primaryTopic = topEntry[0];
        topicUsed = primaryTopic;
      }

      // Detect sub-categories for gaming
      if (primaryTopic === 'gaming') {
        const topicEntry = topics.find(([t]) => t === 'gaming');
        const matched = topicEntry ? topicEntry[1].matched : [];
        if (matched.some(w => ['boss', 'dungeon', 'raid'].includes(w))) subCategory = 'boss';
        else if (matched.some(w => ['ranked', 'rank', 'elo', 'mmr', 'competitive'].includes(w))) subCategory = 'competitive';
        else if (matched.some(w => ['clutch', 'ace', 'pentakill', 'carry', 'headshot', 'gg', 'well played'].includes(w))) subCategory = 'achievement';
        else if (matched.some(w => ['fail', 'rip', 'unlucky', 'pain'].includes(w))) subCategory = 'fail';
      }

      // Detect sub-categories for greeting
      if (primaryTopic === 'greeting') {
        const lower = content.toLowerCase();
        if (['bye', 'goodbye', 'cya', 'see ya', 'later', 'peace', 'gtg', 'gn', 'goodnight'].some(w => lower.includes(w))) {
          subCategory = 'goodbye';
        } else if (['wb', 'welcome back', 'im back', 'i\'m back', 'back'].some(w => lower.includes(w))) {
          subCategory = 'welcome_back';
        } else {
          subCategory = 'hello';
        }
      }

      // Detect hype for stream
      if (primaryTopic === 'stream') {
        const lower = content.toLowerCase();
        if (['hype', 'hyped', 'lets go', 'let\'s go', 'live', 'going live', 'raid'].some(w => lower.includes(w))) {
          subCategory = 'hype';
        }
      }
    }

    // Try Markov generation (only if enough training data AND strong topic)
    // Markov is restricted to avoid random gibberish
    const hasStrongTopic = topics && topics[0] && topics[0][1].confidence === 'high';
    if (hasStrongTopic && this.markov.totalTrained > 100 && Math.random() < this.config.markovChance) {
      const seedWords = topics[0][1].matched.slice(0, 3);
      const markovReply = this.markov.generate(15, seedWords);
      // Only use Markov if the output contains at least one topic keyword (relevance check)
      if (markovReply && markovReply.length > 10 && markovReply.length < this.config.maxResponseLength) {
        const markovLower = markovReply.toLowerCase();
        const isRelevant = seedWords.some(w => markovLower.includes(w.toLowerCase()));
        if (isRelevant) {
          reply = markovReply;
          usedMarkov = true;
        }
      }
    }

    // If Markov didn't work, use templates
    if (!reply) {
      if (primaryTopic === 'mood_positive' || (sentiment === 'positive' && (!primaryTopic || primaryTopic === 'mood_positive'))) {
        reply = this.pick(TEMPLATES.mood_positive.responses);
      } else if (primaryTopic === 'mood_negative' || (sentiment === 'negative' && (!primaryTopic || primaryTopic === 'mood_negative'))) {
        reply = this.pick(TEMPLATES.mood_negative.responses);
      } else if (primaryTopic && TEMPLATES[primaryTopic]) {
        const topicTemplates = TEMPLATES[primaryTopic];
        if (topicTemplates[subCategory]) {
          reply = this.pick(topicTemplates[subCategory]);
        } else if (topicTemplates.generic) {
          reply = this.pick(topicTemplates.generic);
        } else if (topicTemplates.responses) {
          reply = this.pick(topicTemplates.responses);
        } else {
          reply = this.pick(TEMPLATES.fallback);
        }
      } else {
        // Use recent channel topic if no topic detected in current message
        if (recentTopics.length > 0 && TEMPLATES[recentTopics[0]]) {
          const rt = TEMPLATES[recentTopics[0]];
          reply = this.pick(rt.generic || rt.responses || TEMPLATES.fallback);
          topicUsed = recentTopics[0];
        } else {
          // If triggered randomly with no topic at all, skip instead of sending generic noise
          if (reason === 'random' || reason === 'random_contextual') {
            return null;
          }
          reply = this.pick(TEMPLATES.fallback);
        }
      }
    }

    // Apply response modifiers (prefix/suffix variation)
    if (reply && !usedMarkov) {
      reply = modifyResponse(reply);
    }

    // Variable substitution
    if (reply) {
      reply = reply.replace(/\{user\}/g, username);
    }

    // Personality adjustments
    if (this.config.personality === 'hype') {
      if (Math.random() < 0.3) reply = reply.toUpperCase();
      if (Math.random() < 0.2) reply += ' 🔥';
    } else if (this.config.personality === 'sarcastic') {
      if (Math.random() < 0.15) reply = 'Oh, ' + reply.charAt(0).toLowerCase() + reply.slice(1);
    }

    // Update stats
    this.stats.totalReplies++;
    this.stats.topicReplies[topicUsed] = (this.stats.topicReplies[topicUsed] || 0) + 1;
    if (usedMarkov) this.stats.markovReplies++;
    else this.stats.templateReplies++;
    if (reason === 'mention' || reason === 'name') this.stats.mentionReplies++;
    this.stats.lastReplyAt = new Date().toISOString();

    return reply;
  }

  // Main processing entrypoint — called from messageCreate
  async processMessage(msg, botUserId) {
    const content = msg.content;
    const channelId = msg.channel.id;
    const userId = msg.author.id;
    const username = msg.member?.displayName || msg.author.username;

    // Always train Markov on every message
    this.markov.train(content);

    // Always track in memory
    this.memory.addMessage(channelId, userId, username, content);

    // Increment message counter
    this.messageCountSinceReply.set(channelId, (this.messageCountSinceReply.get(channelId) || 0) + 1);

    // Check if we should reply
    const decision = this.shouldReply(msg, botUserId);
    if (!decision.reply) return null;

    // Generate reply
    const reply = this.generateReply(msg, decision.reason);
    if (!reply) return null;

    // Update cooldowns
    this.lastReplyTime.set(channelId, Date.now());
    this.messageCountSinceReply.set(channelId, 0);

    return reply;
  }

  // Knowledge base management
  setKnowledge(key, value) {
    if (key in this.knowledge) {
      this.knowledge[key] = value;
    }
  }

  setCustomEntry(key, patterns, answer) {
    this.knowledge.customEntries[key] = { patterns, answer };
  }

  removeCustomEntry(key) {
    delete this.knowledge.customEntries[key];
  }

  getKnowledge() {
    return { ...this.knowledge };
  }

  // Detect if message is asking for info and return an answer
  checkInfoQuery(content) {
    const lower = content.toLowerCase();

    // Must look like a question or info request
    const isQuestion = lower.includes('?') ||
      /\b(when|what|where|who|how|is there|are there|whats|what's|tell me|do you know|anyone know)\b/.test(lower);

    if (!isQuestion) return null;

    // Stream schedule
    if (/\b(when.*stream|stream.*when|next stream|schedule|streaming.*when|when.*live|going live)\b/.test(lower)) {
      if (this.knowledge.nextStream) return `Next stream: ${this.knowledge.nextStream}`;
      if (this.knowledge.streamSchedule) return `Stream schedule: ${this.knowledge.streamSchedule}`;
      return null;
    }

    // Currently live / what game
    if (/\b(is.*live|are.*live|live right now|streaming now|currently streaming|what.*playing|what game|current game)\b/.test(lower)) {
      if (this.knowledge.isLive) {
        const game = this.knowledge.currentGame ? ` playing ${this.knowledge.currentGame}` : '';
        const viewers = this.knowledge.viewerCount ? ` with ${this.knowledge.viewerCount} viewers` : '';
        return `Yep, ${this.knowledge.streamerName || 'they'} are live${game}${viewers}! 🔴`;
      }
      if (this.knowledge.nextStream) return `Not live rn, but next stream: ${this.knowledge.nextStream}`;
      return `Not live at the moment!`;
    }

    // Viewer count
    if (/\b(how many.*viewer|viewer count|viewers|how many.*watching)\b/.test(lower)) {
      if (this.knowledge.isLive && this.knowledge.viewerCount) {
        return `Currently at ${this.knowledge.viewerCount} viewers! 👀`;
      }
      return this.knowledge.isLive ? 'Stream is live but I dont have the viewer count rn' : 'Not live at the moment!';
    }

    // Socials
    if (/\b(socials|youtube|twitter|instagram|tiktok|links|social media|where.*follow)\b/.test(lower)) {
      const socials = this.knowledge.socials;
      if (Object.keys(socials).length > 0) {
        const list = Object.entries(socials).map(([k, v]) => `${k}: ${v}`).join('\n');
        return `Here are the socials:\n${list}`;
      }
      return null;
    }

    // Server info
    if (/\b(server info|about.*server|what is this server|discord info|server rules)\b/.test(lower)) {
      if (lower.includes('rules') && this.knowledge.rules) return this.knowledge.rules;
      if (this.knowledge.serverInfo) return this.knowledge.serverInfo;
      return null;
    }

    // Check custom entries
    for (const [, entry] of Object.entries(this.knowledge.customEntries)) {
      if (entry.patterns.some(p => lower.includes(p.toLowerCase()))) {
        return entry.answer;
      }
    }

    return null;
  }

  // Config getter & setter
  getConfig() {
    return { ...this.config };
  }

  updateConfig(newConfig) {
    for (const [key, value] of Object.entries(newConfig)) {
      if (key in this.config) {
        this.config[key] = value;
      }
    }
  }

  getStats() {
    return {
      ...this.stats,
      markov: this.markov.getStats(),
      memoryChannels: this.memory.channels.size
    };
  }

  // Persistence
  toJSON() {
    return {
      config: this.config,
      stats: this.stats,
      markov: this.markov.toJSON(),
      knowledge: this.knowledge
    };
  }

  loadFromJSON(data) {
    if (!data) return;
    if (data.config) {
      this.config = { ...this.config, ...data.config };
    }
    if (data.stats) {
      this.stats = { ...this.stats, ...data.stats };
    }
    if (data.markov) {
      this.markov.loadFromJSON(data.markov);
    }
    if (data.knowledge) {
      this.knowledge = { ...this.knowledge, ...data.knowledge };
    }
  }
}

export default SmartBot;
