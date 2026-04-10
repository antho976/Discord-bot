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
  { p: /\breward\s+received\b.*\$\d/i,                                                    w: 5, tag: 'fake-reward' },
  { p: /\b(?:you\s+(?:have\s+)?won|congratulations\s+you(?:'ve)?\s+(?:been\s+)?(?:selected|chosen|won))\b/i, w: 5, tag: 'fake-reward' },
    { p: /\b(?:activate|enter|use)\s+(?:your\s+|the\s+|a\s+)?(?:(?:bonus|promo|reward|gift)\s*code|code\s+(?:for\s+)?(?:bonus|promo|reward|gift))\b/i, w: 5, tag: 'fake-reward' },
  { p: /\byour\s+(?:reward|bonus|winnings?)(?:\s+(?:is|has been))\s+\$?\d/i,              w: 5, tag: 'fake-reward' },
  { p: /\b(?:deposit|withdraw|wager)\s+(?:now|today|here|bonus)\b/i,                      w: 5, tag: 'gambling-scam' },
  // MED (3)
  { p: /\b(?:commissions?\s+(?:are\s+)?open|open\s+(?:for\s+)?commissions?)\b/i,         w: 3, tag: 'commission-ad' },
  { p: /\b(?:taking|accepting|doing)\s+(?:commissions?|orders?|requests?)\s+(?:now|rn|atm)\b/i, w: 3, tag: 'commission-ad' },
  { p: /\bsteam\s+(?:gift|free|nitro)\b/i,                                               w: 3, tag: 'steam-scam' },
  { p: /\b(?:claim|get)\s+(?:your\s+)?(?:free|gift)\b/i,                                 w: 3, tag: 'fake-giveaway' },
  { p: /\b(?:crypto|bitcoin|nft)\s+(?:giveaway|airdrop|invest)\b/i,                      w: 3, tag: 'crypto-scam' },
  { p: /\b(?:dm|message)\s+me\s+(?:to\s+)?(?:learn|know|find\s+out)\s+how\b/i,           w: 3, tag: 'solicitation' },
  { p: /\b(?:selling|boosting|accounts?\s+for\s+sale)\b/i,                                w: 3, tag: 'service-ad' },
  { p: /\b(?:followers?|likes?|views?|subs?)\s+for\s+(?:sale|cheap)\b/i,                  w: 3, tag: 'service-ad' },
  { p: /\bavailable\b.*\b(?:hit\s+me\s+up|hmu|dm\s*me|message\s*me|contact\s*me)\b/i,    w: 3, tag: 'solicitation' },
  { p: /\b(?:hit\s+me\s+up|hmu)\b.*\b(?:available|open|offering|selling|commission)\b/i,  w: 3, tag: 'solicitation' },
  { p: /\b(?:hit\s+me\s+up|hmu)\b/i,                                                      w: 3, tag: 'solicitation' },
  { p: /\b(?:bonus|rakeback|cashback|promo\s*code)\b.*\b(?:deposit|sign\s*up|register)\b/i, w: 3, tag: 'gambling-scam' },
  { p: /\b(?:sign\s*up|register|join)\b.*\b(?:bonus|reward|free\s+money|free\s+\$)\b/i,   w: 3, tag: 'gambling-scam' },
  { p: /\b(?:online\s+)?(?:casino|betting|gambling|slots?|poker)\s+(?:site|bonus|free)\b/i, w: 3, tag: 'gambling-scam' },
  { p: /\b(?:18\+|21\+)\b.*\b(?:bet|gambl|casino|slot)\b/i,                               w: 3, tag: 'gambling-scam' },
  { p: /\bcustom\s+(?:stream\s+)?(?:overlays?|panels?|emotes?|badges?|banners?)\s+(?:available|for\s+sale)\b/i, w: 3, tag: 'service-ad' },
  { p: /\b(?:overlays?|panels?|emotes?|banners?)\s+(?:and\s+)?(?:overlays?|panels?|emotes?|banners?)\s+available\b/i, w: 3, tag: 'service-ad' },
  // MED (3) - portfolio / design self-promo spam
  { p: /\b(?:show\s+(?:some|your)\s+(?:love|support)|take\s+a\s+look\s+and\s+(?:show|give|drop|leave))\b/i, w: 3, tag: 'portfolio-spam' },
  { p: /(?:behance\.net|artstation\.com|dribbble\.com|fiverr\.com)\/\S*(?:logo|pfp|mascot|emote|banner|design|twitch)/i, w: 3, tag: 'portfolio-link' },
  // LOW (1)
  { p: /\b(?:i|we)\s+(?:just\s+)?(?:made|created|designed|finished|completed)\s+(?:an?\s+)?(?:\w+\s+){0,3}(?:logo|pfp|banner|emote|mascot|overlay|design|artwork|model)\b/i, w: 1, tag: 'portfolio-spam' },
  { p: /\bfor\s+(?:a|my)\s+(?:\w+\s+)?(?:client|customer)\b/i,                            w: 1, tag: 'portfolio-spam' },
  { p: /\b(?:very\s+)?(?:discounted|cheap|low)\s+prices?\b/i,                             w: 1, tag: 'price-language' },
  { p: /\b(?:cheap|best)\s+(?:prices?|rates?)\b/i,                                        w: 1, tag: 'price-language' },
  { p: /\b(?:limited\s+time|act\s+now|hurry|don'?t\s+miss)\b/i,                           w: 1, tag: 'urgency' },
  { p: /\b(?:rakeback|cashback|wagering|rollover)\b/i,                                     w: 1, tag: 'gambling-scam' },
  { p: /\b(?:bonus|reward|prize)\s+(?:code|link)\b/i,                                      w: 1, tag: 'fake-reward' },
  { p: /\bforwarded\b/i,                                                                   w: 1, tag: 'forwarded' },
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
  // Overlay/panel spam (from screenshot 1)
  'Custom stream overlays & panels available, hit me up 👊',
  'Custom overlays available, hmu for prices',
  // Gambling/reward scams (from screenshot 2)
  'Reward Received: $2500 YOUR WINNINGS HAS BEEN SUCCESSFULLY INCLUDED',
  'Activate Code for Bonus - Enter the promo code to receive a welcome bonus',
  'Deposit now and get rakeback bonus! Sign up today',
  'Your reward is $2500! Withdraw now',
  'Congratulations you\'ve been selected to win! Claim your free gift',
  'You have won a special prize! Deposit bonus available',
  'Wager bonus: sign up and get free $50 reward code',
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
  // Casual gambling/reward talk (should NOT trigger)
  'I got a nice reward in the game after completing the quest',
  'The deposit for the apartment was expensive',
  'The casino level in the game is really hard',
  'I withdrew money from the ATM',
  'The bonus stage in Mario is fun',
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
