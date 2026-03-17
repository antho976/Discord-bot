/**
 * Automod Scam Detection Test Suite
 * Run: node tests/automod-scam.test.js
 * 
 * Tests the weighted scoring system to verify:
 *   ✅ Real spam gets caught
 *   ✅ Normal messages do NOT get caught
 */

const SCAM_PROMO_PATTERNS = [
  // HIGH (5)
  { p: /\b(?:message|dm|pm|whisper)\s+me\s+for\s+(?:rates?|details?|pricing|prices?|info)\b/i, w: 5, tag: 'solicitation' },
  { p: /\b(?:dm|message|contact)\s+(?:me|us)\s+(?:for|to)\s+(?:order|commission|book|get)\b/i, w: 5, tag: 'solicitation' },
  { p: /\bfree\s+(?:discord\s+)?nitro\b/i,                                               w: 5, tag: 'nitro-scam' },
  { p: /(?:https?:\/\/)?(?:discord|discörd|disc0rd|d[i1]sc[o0]rd)(?:\.(?:gift|gifts|app|gg|nitro))\//i, w: 5, tag: 'phishing-link' },
  { p: /(?:https?:\/\/)?(?:steam|st[e3]am)commun[i1l]ty\./i,                             w: 5, tag: 'phishing-link' },
  { p: /\b(?:earn|make)\s+\$?\d+.*(?:daily|weekly|monthly|per\s+day)\b/i,                w: 5, tag: 'crypto-scam' },
  // MED (3)
  { p: /\b(?:commissions?\s+(?:are\s+)?open|open\s+(?:for\s+)?commissions?)\b/i,         w: 3, tag: 'commission-ad' },
  { p: /\b(?:taking|accepting|doing)\s+(?:commissions?|orders?|requests?)\s+(?:now|rn|atm)\b/i, w: 3, tag: 'commission-ad' },
  { p: /\bsteam\s+(?:gift|free|nitro)\b/i,                                               w: 3, tag: 'steam-scam' },
  { p: /\b(?:claim|get)\s+(?:your\s+)?(?:free|gift)\b/i,                                 w: 3, tag: 'fake-giveaway' },
  { p: /\b(?:crypto|bitcoin|nft)\s+(?:giveaway|airdrop|invest)\b/i,                      w: 3, tag: 'crypto-scam' },
  { p: /\b(?:dm|message)\s+me\s+(?:to\s+)?(?:learn|know|find\s+out)\s+how\b/i,           w: 3, tag: 'solicitation' },
  { p: /\b(?:selling|boosting|accounts?\s+for\s+sale)\b/i,                                w: 3, tag: 'service-ad' },
  { p: /\b(?:followers?|likes?|views?|subs?)\s+for\s+(?:sale|cheap)\b/i,                  w: 3, tag: 'service-ad' },
  // MED (3) - portfolio / design self-promo spam
  { p: /\b(?:show\s+(?:some|your)\s+(?:love|support)|take\s+a\s+look\s+and\s+(?:show|give|drop|leave))\b/i, w: 3, tag: 'portfolio-spam' },
  { p: /(?:behance\.net|artstation\.com|dribbble\.com|fiverr\.com)\/\S*(?:logo|pfp|mascot|emote|banner|design|twitch)/i, w: 3, tag: 'portfolio-link' },
  // LOW (1)
  { p: /\b(?:i|we)\s+(?:just\s+)?(?:made|created|designed|finished|completed)\s+(?:an?\s+)?(?:\w+\s+){0,3}(?:logo|pfp|banner|emote|mascot|overlay|design|artwork|model)\b/i, w: 1, tag: 'portfolio-spam' },
  { p: /\bfor\s+(?:a|my)\s+(?:\w+\s+)?(?:client|customer)\b/i,                            w: 1, tag: 'portfolio-spam' },
  { p: /\b(?:very\s+)?(?:discounted|cheap|low)\s+prices?\b/i,                             w: 1, tag: 'price-language' },
  { p: /\b(?:cheap|best)\s+(?:prices?|rates?)\b/i,                                        w: 1, tag: 'price-language' },
  { p: /\b(?:limited\s+time|act\s+now|hurry|don'?t\s+miss)\b/i,                           w: 1, tag: 'urgency' },
];
const THRESHOLD = 5;

function scoreMessage(text) {
  let score = 0;
  const matched = [];
  for (const { p, w, tag } of SCAM_PROMO_PATTERNS) {
    if (p.test(text)) {
      score += w;
      matched.push({ tag, weight: w });
    }
  }
  return { score, blocked: score >= THRESHOLD, matched };
}

// ========== TEST CASES ==========

const SHOULD_BLOCK = [
  // The original spam that got through
  'CUSTOM VTUBER MODEL COMMISSION ARE OPEN NOW IN VERY DISCOUNTED PRICES\nMessage me for rates and details',
  // Variations of commission spam
  'commissions open!! DM me for details and pricing 💜',
  'Taking commissions now! Message me for rates',
  'Open for commissions, contact me to order!',
  // Nitro scams
  'free discord nitro! claim yours now',
  'Hey everyone! Free Nitro giveaway at disc0rd.gift/free',
  // Crypto scams
  'I make $500 daily with crypto investing, DM me to learn how',
  'Earn $200 per day with this simple trick!',
  // Phishing links
  'Check this out: https://discörd.gift/freestuff',
  'Login here: steamcommunlty.com/id/trade',
  // Service spam
  'Selling boosting services! Cheap prices, dm me for rates',
  'Followers for sale! Best rates guaranteed, message me for info',
  // NFT spam
  'NFT airdrop! Claim your free gift now!',
  // Portfolio / design self-promo spam
  'heyya everyonee, i made an awesome logo PFP design for a special client. I\'m thrilled to share it with you all—take a look and show some love! 💖💫https://www.behance.net/gallery/227078169/MASCOT-LOGO-PFP-FOR-TWITCH',
  'heyya everyonee, i made an awesome logo PFP design for a special client. I\'m thrilled to share it with you all—take a look and show some love! 💖💫',
  'Just finished an amazing mascot design for a client! Show some love 💖 https://artstation.com/artwork/mascot-logo',
  'I created a new emote design for a customer, take a look and show your support! https://dribbble.com/shots/emote-design',
];

const SHOULD_NOT_BLOCK = [
  // Normal gaming conversations
  'This game is at a discounted price on Steam right now!',
  'The new DLC is cheap, only $5',
  'Have you seen the low prices on the Steam sale?',
  'Best prices I have seen for a AAA game',
  // Normal Discord conversations
  'Hey how are you doing today?',
  'Anyone wanna play Valorant?',
  'I love this server!',
  'The commission the artist did for me looks amazing!',
  'My commission from last week finally arrived',
  'Check out this new game release',
  'I got the game at a cheap price during the sale',
  // Talking about commissions (not advertising)
  'Does anyone know if that artist has commissions open? I want one',
  'The prices for art commissions are kinda high these days',
  // Talking about designs / portfolio casually
  'I made a logo for my friend, turned out great!',
  'Check out this cool design on behance.net/gallery/123456',
  'The artist made an awesome mascot for a client of ours',
  'Show some love to the new members joining today!',
  // Talking about deals
  'Amazon has discounted prices today for Prime Day',
  'Limited time offer on PlayStation Store',
  // Talking about crypto casually
  'Bitcoin went up today, interesting',
  'I think NFTs are overrated lol',
  // Mentioning free stuff in context
  'The game went free to play, nice!',
  'You can get a free skin if you link your account',
];

// ========== RUN TESTS ==========

let passed = 0;
let failed = 0;

console.log('═══════════════════════════════════════════════════');
console.log('  🤖 AUTOMOD SCAM DETECTION TEST SUITE');
console.log(`  Threshold: score >= ${THRESHOLD} to block`);
console.log('═══════════════════════════════════════════════════\n');

console.log('── SHOULD BE BLOCKED (spam/scam) ──\n');
for (const msg of SHOULD_BLOCK) {
  const result = scoreMessage(msg);
  const status = result.blocked ? '✅ BLOCKED' : '❌ MISSED';
  if (result.blocked) passed++; else failed++;
  const tags = result.matched.map(m => `${m.tag}(${m.weight})`).join(' + ');
  console.log(`${status} [score: ${result.score}] ${tags}`);
  console.log(`   "${msg.length > 80 ? msg.slice(0, 80) + '...' : msg}"\n`);
}

console.log('\n── SHOULD NOT BE BLOCKED (legitimate) ──\n');
for (const msg of SHOULD_NOT_BLOCK) {
  const result = scoreMessage(msg);
  const status = !result.blocked ? '✅ OK' : '❌ FALSE POSITIVE';
  if (!result.blocked) passed++; else failed++;
  const tags = result.matched.length ? result.matched.map(m => `${m.tag}(${m.weight})`).join(' + ') : '(no matches)';
  console.log(`${status} [score: ${result.score}] ${tags}`);
  console.log(`   "${msg.length > 80 ? msg.slice(0, 80) + '...' : msg}"\n`);
}

console.log('═══════════════════════════════════════════════════');
console.log(`  Results: ${passed} passed, ${failed} failed out of ${passed + failed}`);
console.log(`  ${failed === 0 ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED — review patterns!'}`);
console.log('═══════════════════════════════════════════════════');

process.exit(failed > 0 ? 1 : 0);
