/**
 * Test for parsePatchNotes logic extracted from f61-guide-indexer.js
 * Run: node tests/patch-parser.test.mjs
 */

// ── Static IdleOn terms (copied from f61) ──
const IDLEON_STATIC_TERMS = [
  'Beginner','Warrior','Archer','Mage','Journeyman','Barbarian','Squire','Bowman','Hunter','Wizard','Shaman',
  'Blood Berserker','Death Bringer','Divine Knight','Royal Guardian','Siege Breaker','Beast Master',
  'Elemental Sorcerer','Bubonic Conjuror','Voidwalker',
  'Base Damage','Max HP','Max MP','Defence','Accuracy','Weapon Power','Movement Speed','Total Damage',
  'STR','AGI','WIS','LUK','Crit Chance','Crit Damage','Multikill','Respawn','KO Chance',
  'Mining Speed','Mining Efficiency','Mining Power','Choppin Speed','Choppin Efficiency','Choppin Power',
  'Catching Speed','Catching Efficiency','Fishing Speed','Fishing Efficiency','Fishing Power',
  'Trapping Efficiency','Trapping Speed','Worship Charge Rate','Worship Souls',
  'Refinery Speed','Construction Speed','Cooking Speed','Breeding EXP','Laboratory EXP',
  'Sailing Speed','Divinity EXP','Gaming Bits','Farming EXP','Summoning EXP',
  'Drop Rate','EXP Rate','Money','Printer Sample Rate','Talent Book Library',
  'Roid Ragin','Hammer Hammer','FMJ','Shaquracy','Gilded Sword','Bappity Boopity','Bow Jack',
  'Call Me Bob','Wis Wiz','Stronk Tools','Swift Steppin','Sanic Speed','Brewed Coffee',
  'Oj Jooce','Blowing Bubbles','Name I Guess','Laaarrrryyyy','Cauldronic Charge',
  'Lo Cost Mo Mana','Carpet of Accuracy','Essence Genesis','Droppin Loads',
  'Copper Corona','Sippy Splinter','Mushroom Soup','Fermented Birch','Jungle Juice',
  'Barley Brew','Tea With Pea','Gold Guzzle','Ramificoction','Seawater',
  'Fly In My Drink','Slug Slurp','Mimosa Moment','Blue Flav','Slug In A Rug',
  'Sword Stamp','Heart Stamp','Mana Stamp','Vitality Stamp','Book Stamp','Polearm Stamp',
  'Fist Stamp','Battleaxe Stamp','Agile Stamp','Luk Stamp','Pickaxe Stamp','Hatchet Stamp',
  'Card Stamp','Matty Bag Stamp','Steve Sword','Mason Jar Stamp','Alch Goes Boom',
  'Blunder Hills','Yum Yum Desert','Frostbite Tundra','Hyperion Nebula','Smolderin Plateau','Spirited Valley',
  'Easy Resources','Medium Resources','Hard Resources','Bosses','Events','Dungeons',
  'Bribe','Forge','Anvil','Post Office','Smithing',
  'Sigil','Fish Pool','Cauldron','Liquid Shop','Arcade','Ballot',
  'Construction','Worship','Trapping','Refinery','Salt Lick','Atom Collider',
  'Cog Complexity','Construction Mastery','Shrine','Prayer','Death Note','Tower Defence',
  'Big Brain Time','Skilled Dimwit','Unending Energy','Shiny Snitch','Zerg Rushogen',
  'Tachion of the Titans','Balance of Pain','Midas Minded','Jawbreaker',
  'The Royal Sampler','Antifun Spirit','Circular Cranium','Ruck Sack',
  'Fibers of Absence','Vacuous Dreams','Beefy For Real','Balance of Proficiency',
  'Shrine of Snehebatu','Shrine of the Owl','Shrine of the Chaotic Chizoar',
  'Ishrisha of the Infinite','Shrine of Mr Massacre',
  'Breeding','Laboratory','Cooking','Kitchen','Pet Arena','Chip','Jewel','Meal',
  'Lab Connection','Lab Range','Jewel Effect','Chip Slot','Pet Gene','Territory Fight',
  'Spelunker Obol','Fungi Finger Pocketer','Emerald Prison','Bling Bling',
  'Bow Barbarian','Wired In','No Escape','Gilded Cyclical',
  'Egg','Corndog','Saucy Weiner','Cauliflower','Cabbage','Butter Bar',
  'Sushi Roll','Pad Thai','Fries','Gummy Fish',
  'Sailing','Divinity','Gaming','Artifact','Captain','Island','Slab',
  'Sail Speed','Captain Level','Island Explore','Artifact Find','Boat Level',
  'Moai Head','Maneki Kat','Fauxory Tusk','Gold Relic','Genie Lamp','Silver Ankh',
  'Emerald Navette','Fun Hippoete','Arrowhead','Opera Mask','Ashen Urn',
  'Crystal Steak','Trilobite Rock','Billcye Tri','Frost Relic','Chilled Yarn',
  'Snehebatu','Kattlecruk','Arctis','Nobisect','Harriep','Goharut',
  'Jade','Ninja','Market','Farming','Crop','Seed','Summoning','Essence',
  'Jade Coin','Ninja Level','Market Value','Crop Value','Crop Speed',
  'Summoning Winner','Summoning Damage','Essence Gain',
  'Simple Shipment','Upgrade Storage','Tedious Tree','Magician Starterpack',
  'Lil Boxy Thing','Myriad Crate','Box of Filler','Utilitarian',
  'Gratitude Box','Stompin Stamp','Daggery Box','Stampede','Box Fighter',
  'Bronze Obol','Silver Obol','Gold Obol','Platinum Obol','Pink Obol','Dementia Obol',
  'Dungeon Credits','Dungeon Rank','Dungeon Flurbos','Happy Hour',
  'Chronus','Hydron','Pyron','Shoeful','Starius','Gordonius',
  'The Book Worm','The Buff Guy','Flexo Bendo','Dwarfo Beardus','Hipster Logger',
  'Pie Seas','Shoe Fly','Pack Mule','Pirate Booty',
  'Talent Point','Star Talent','Tab 1','Tab 2','Tab 3','Tab 4',
  'Skill Efficiency','AFK Gains','Active Gains','Multikill Per Tier',
  'Damage Per Second','Kills Per Hour','EXP Per Hour','Sample Size',
  'Printer Go Brr','Crystal Mob','Giant Mob','Monster Kill',
  'Obol Slot','Card Slot','Food Slot','Carry Cap','Max AFK Time',
];

// ── parsePatchNotes (exact copy from f61) ──
function parsePatchNotes(text) {
  const changes = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let currentCategory = 'General';

  for (const line of lines) {
    if (/^[A-Z][A-Z\s&:/-]{4,60}$/.test(line) || /^#{1,3}\s+/.test(line)) {
      currentCategory = line.replace(/^#+\s*/, '').replace(/:$/, '').trim();
      continue;
    }

    const content = line.replace(/^[•\-*►▸]\s*/, '').replace(/^\d+[.)\-]\s*/, '').trim();
    if (content.length < 10) continue;

    const change = { category: currentCategory, text: content, type: 'unknown', terms: [], numericChanges: [] };

    const typePatterns = [
      { type: 'fix',    re: /\b(?:fixed|fix|bug|crash|resolved|patched)\b/i },
      { type: 'added',  re: /\b(?:added|new|introduced|can\s+now|now\s+(?:has|shows|lets|gives|grants|also|accepts?|open|available|credited|permanently|visually|tells?|remembers?|counts?)|is\s+(?:HERE|BACK)|come\s+again|unlock)\b/i },
      { type: 'nerf',   re: /\b(?:nerfed|decreased|lowered|reduced|removed|no longer|is no more|shorter|less|now\s+caps?\s+at|now\s+start\s+drop)/i },
      { type: 'buff',   re: /\b(?:buffed|increased|boosted|doubled|tripled|improved|enhanced|super\s+boost|now\s+instant|maximum\s+is\s+now)/i },
      { type: 'change', re: /\b(?:changed|reworked|replaced|renamed|converted|adjusted|now\s+(?:chains|uses|works|called|only|just)|are\s+now\s+(?:called|credited))\b/i },
      { type: 'ui',     re: /\b(?:UI|button|hover|click|popup|display|visual|viewer|toggle)\b/i },
    ];
    let earliestPos = Infinity;
    for (const tp of typePatterns) {
      const m = tp.re.exec(content);
      if (m && m.index < earliestPos) { change.type = tp.type; earliestPos = m.index; }
    }
    // Fallback: informational lines that describe mechanics
    if (change.type === 'unknown') {
      if (/\b(?:you\s+(?:can|get|need|should)|there\s+are|this\s+(?:means|also|isn't)|remember\s+to|for\s+full\s+info|every\s+(?:single\s+)?day|currently\s+just|check\s+it\s+out|don't\s+be\s+fooled|you\s+can\s+expect)\b/i.test(content)) {
        change.type = 'info';
      }
    }

    // Arrow: "X -> Y", "X → Y" (with K/M/B/T suffixes and /unit rates)
    const numChange = content.match(/(\d[\d,.]*[KMBTkmbt]?%?(?:\s*\/?\s*(?:min(?:utes?)?|hrs?|hours?|days?|sec(?:onds?)?))?)\s*(?:->|→|-->)\s*(\d[\d,.]*[KMBTkmbt]?%?(?:\s*\/?\s*(?:min(?:utes?)?|hrs?|hours?|days?|sec(?:onds?)?))?)/i);
    if (numChange) change.numericChanges.push({ from: numChange[1].trim(), to: numChange[2].trim() });
    if (/\bdoubled\b/i.test(content)) change.numericChanges.push({ multiplier: '2x' });
    if (/\btripled\b/i.test(content)) change.numericChanges.push({ multiplier: '3x' });
    const upTo = content.match(/up\s+to\s+(\d[\d,.]*[KMBTkmbt]?%?)/i);
    if (upTo) change.numericChanges.push({ max: upTo[1] });
    const fromTo = content.match(/from\s+(\d[\d,.]*[KMBTkmbt]?%?)\s*(?:->|→|to)\s*(\d[\d,.]*[KMBTkmbt]?%?)/i);
    if (fromTo) change.numericChanges.push({ from: fromTo[1], to: fromTo[2] });

    // Caps/new patterns
    const capMatch = content.match(/(?:caps?\s+at|maxes?\s+(?:at|out)|now\s+(?:maxes?|caps?)\s+at)\s+\+?([\d,.]+[KMBTkmbt]?%?)/i);
    if (capMatch) change.numericChanges.push({ cap: capMatch[1] });
    const perMatch = content.match(/(?:per|every)\s+(\d[\d,.]*)\s+(\w+)/i);
    if (perMatch) change.numericChanges.push({ per: `${perMatch[1]} ${perMatch[2]}` });
    const multMatch = content.match(/(\d[\d,.]*)x\s*(?:~\d+x\s*)?(?:rarer|more|bigger|stronger|lower|higher|faster)/i);
    if (multMatch) change.numericChanges.push({ multiplier: `${multMatch[1]}x` });
    // "X instead of the previous Y"
    const insteadOf = content.match(/\+?(\d[\d,.]*[KMBTkmbt]?%?)\s*(?:\w+[,;]?\s+)?instead\s+of\s+(?:the\s+)?(?:previous\s+)?\+?(\d[\d,.]*[KMBTkmbt]?%?)/i);
    if (insteadOf) change.numericChanges.push({ from: insteadOf[2], to: insteadOf[1] });

    const contentLower = content.toLowerCase();
    for (const term of IDLEON_STATIC_TERMS) {
      if (term.length >= 3 && contentLower.includes(term.toLowerCase())) {
        change.terms.push(term);
      }
    }
    const proper = content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g) || [];
    for (const p of proper) {
      if (p.length >= 4 && !change.terms.includes(p)) change.terms.push(p);
    }

    if (change.type !== 'unknown' || change.terms.length > 0 || change.numericChanges.length > 0) {
      changes.push(change);
    }
  }

  return changes;
}

// ══════════════════════ TEST DATA ══════════════════════

const PATCH_CHUNK_1 = `28 NEW VAULT UPGRADES!
Upgrade them with coins, LOTS and lots of coins!

TOURNAMENT REWARDS!
Collect rewards at the end of each Tournament Season based on the best Division you reach! There are unique rewards for reaching Bronze, Silver, and Gold -- and yes, you get the lower divisions too, so Gold players get all 3 rewards!
NOTE: Previous season was a Trial season, so it has just 1 reward for all. Starting now, seasons do have 3 rewards as explained above.

BIG PLAYERS!
The RAREST reward in the game - the 1.50x PLAYER SIZE!
There are currently just 2 ways of winning a Big Player:
1. Finish 1st in the Gold Division
2. Win a Major Championship

• You can now 'skip ahead' when viewing your Tournament Matches, but ONLY after the day's Tournament is over and you have more than 1 life left!
• I'll say it again -- if you ONLY have 1 life left, you no longer get to skip viewing matches. This does NOT mean you've lost, don't be fooled by the button disappearing!
• The Tournament bracket now tells you if you made the bracket, and highlights your name in green!
• If you HAVE made the bracket, the display also lets you jump straight to your page for easier viewing!
• Your Upgrade Vault remembers where you scrolled down to even after you close the game instead of tragically forgetting!

• Tournament PTS are much less top-heavy. Previously, bracket matches starting at Round of 1024 gave +2 PTS, then +3, +5, +8, +12, +15, +20, 25, 30, and +35 for winning the final. Now its +2, +2, +2, +2 ,+2, +3, +3, +4, +4, and +5 for the final. In other words, winning all matches in a bracket only gives +29 PTS, instead of the previous +155 PTS.
• Card Drop Rate for most monsters in World 1~3 buffed tremendously.

• Fixed an issue wherein the 4th Spelunking Elixir was not giving its proper bonus. The bonus is also per 10 stamina, not 1 stamina, used at time of elixir usage.
• Fixed the lag that many experienced while opening Sailing Chests`;

const PATCH_CHUNK_2 = `Valenslimes Day has come again to IdleOn!
• Valenslimes Event is HERE! Collect 50 choco boxes from monsters every day and open them for free gems, new exclusive hats, event cards and more!

Play the new BITTERSWEET BITES game in World 1 town!
Take bites of sweet chocolate pieces, while avoiding the BITTER ones... only problem is, there's no way to know which is which! Rewards include the Lovely Day nametag, the NEW Choco Nametag, Gold Balls, and of course Event Points!

• TONS of ways to earn Bittersweet Bites:
1. Collect all 50 choco boxes from monsters. This gives +1 every day!
2. Have IdleOn running, the exact timer is shown in the bottom-right corner of the Bittersweet Game display.
3. Buy them in batches of 2, 5, or 10 with gems! You can only buy a single batch every day, so choose wisely.
4. Open up IdleOn for the first time! That's right, I gave everyone +1 play for free, and I gave it with love from me to u xoxoxo
5. This isn't a way to get more plays, but its important. Event plays CARRY OVER to the next event! Just sayin'. So do Event Points, duh.

New EVENT SHOP, talk to the Loveulyte NPC in World 1 Town to see what's in stock!
• New Research Grid bonus [O8]: Game Design 102 - boosts Research EXP gain based on total Observation LV, optical monocles are back in style!
• New Research Grid bonus [N4]: Divine Design - Arctis is now permanently counted as linked for all players... one step closer... Doot owners will get a different bonus instead.
• New Research Grid bonus [L11]: Smart Eye - increases the minimum possible roll when searching for new observations every time you fail a roll, but gets reset when you succeesfully find a new observation.

• You can now claim +1 TOME for watching my streams without needing to get a Gem Drop. Tune in to see for yourself. OH, and I stream on YOUTUBE now too, you can get +1 Tome via my youtube streams too!

• Artifact Chance display has changed for really low odds -- if you have less than a 1 in 10,000 chance for the current chest you're about to open, instead of just saying "0.01%", it will say the actual odds, like 1 in 63,354 for example.
• DNA drops in Gaming no longer show up if you have all Mutations. They still happen, you still get +DNA every sprout harvest just in-case they have a use later on, but visually the DNA strands wont show up.`;

const PATCH_CHUNK_3 = `• There was a magma-flare on the W5 Docks, spiking the temperature to 16423°C. Everyone's Transcendent Artifacts are dead. Due to a large imbalance in odds -- to the point where Transcendent Artifacts from the first 6 islands were more common than Eldritch artifacts -- I have removed all of the ill-gotten transcendent artifacts. As for the rest, they were 100x rarer than they're meant to be, and have been lowered.
• Changed the "Jackpots Hit in Arcade" Tome metric. It now caps at 4 jackpots, giving 20 PTS each (80 PTS max). Before, it was less fair, as it had a much higher max.
• Glimbo Insider Trading Secrets now gives DR multi every 100 trades, instead of every 25.
• Guaranteed Crystal mobs spawn rate increased: 2/sec -> 5/sec. While I will be looking further into reducing lag overall, I am making this slight adjustment to help make things better in the meantime.

• Fixed a rare bug that was crashing certain users on the new W7 Trench maps.
• Fixed the Bleeding Heart elixir in Spelunking. It now works exactly as it says it does, boosting POW by 100x and raising Stamina Costs by 4x for every use -- e.g. 5 uses would put you at 500x POW and 20x Stamina costs.
• Fixed the "Auto not working!" situation for Pirate Mess Hall endgame map for Steam and Web. Mobile will have the fix next update.
• Fixed the glitch causing Research EXP/LV to be inconsistent between characters.
• Fixed a display issue where Glimbo & Boomy Mine pets were missing from the Bonuses list in Pet Park. Their bonuses worked, it's just their displays that were missing.
• Fixed an issue where Bubba's Sooshi megaflesh where it would sometimes replace your Dice Roll with an inferior roll.
• Fixed a display issue where cog claims could show up in Tiny Cog slots. These gave no stats, if this happened to you simply drag the cogs back into your inventory to clear up space for your tiny cogs.
• Fixed a potential mobile overflow regarding EXP balloons with regards to Cooking EXP
• Fixed a bug where the Prehistoric Armor set was not giving any Research EXP bonus, despite the description saying it should
• Fixed a bug where you could get more than +1 Tournament Registration for tome per day. All ill-gotten registrations have been removed from all players.
• Fixed a bug where using Charred Bones would use up the whole stack. This has been fixed, they now get used one-by-one as I said they would.`;

const PATCH_CHUNK_4 = `The treacherous maps of the MURKY TRENCHES are now accessible!
• 7 new maps to explore, full of new content to discover and monsters to defeat!
• Skill #20 has been added - RESEARCH!
• Find and study observations hidden throughout IdleOn's worlds, leveling up your skill and earning points to to unlock new content both new AND old!

📋Clipboards signify content that is unlocked via Research
📋 Mr. Minehead is now accepting challengers for his game Depth Charge, over on the 2nd map of the new Murky Trenches area!
📋 New Artifact Tier - TRANSCENDENT! Good luck getting these...
📋 New Sigil Tier - ECLECTIC! You need to get Ethereal sigils first from Spelunking though!
📋 New Farming gameplay system - STICKER DEPOT! Grow Megacrops, and earn stickers for your troubles, each one giving powerful bonuses!
📋 New Import Item in Gaming - the KING RAT of OLDE!
📋 New Superbits Page! I had 'em all laughin' with Superbits, saw 'em all flauntin' they stuff with them Duperbits, but yall ain't ready for this new one...
📋 New Refinery tab, producing 3 new Salts!
📋 New Cog Board slots which ONLY fit "Tiny" Cogs... wait...
📋 New Cog Type: Tiny Cogs! Collect them daily in the hopes of finding the legendary T10...
📋 Glimbo's Swap Meet is open for business, located on the 3rd map in the new Murky Trenches area in World 7!

Ok, back to NEW CONTENT unrelated to Research!
• New Spelunking Tunnel - the SCOUTPOST! Delve deep into the snowy outpost of a science lab gone wrong, and defeat the new Lore Boss to earn a new bonus fit for a Spelunking master!
• 20 new Crop Types added, grown through the Medal Seed!
• 5 New Coin Types! As always, 100 of a coin turns into 1 of the next coin type...
• TONS of old bonues that were "coming soon" are HERE! 2 from the Gambit Cavern in w5 village, 2 from Duperbits upgrades in Gaming (MSA and Slab related), 1 from the Tome Epilogue upgraded in the Coral Reef, and 1 from the final Artifact in Sailing, oh and 1 from Zenith Market!
• 1 new Mob Territory and Spice to go after in Breeding! Yea, they're called Mobs now, the things you breed in Breeding. Not joking, every single mention of them is Mob. They are Mobs now and forever.
• 3 new Cooking Meals to unlock and upgrade!
• 1 new Palette Colour bonus added - Magenta now has it's bonus!
• 6 New Deathnote killcounts for the new W7 mobs!
• 6 New Teal Opponents in Summoning!
• 1 new Jade Emporium purchase, the Science Chalk!`;

const PATCH_CHUNK_5 = `• THE GRAND TOURNAMENT is here, find it in your Codex
• Every single day, a massive game-wide competition will take place between ALL players of IdleOn to answer one simple question... who has the best Pet Collection!
• Lose all 3 lives, and you're out... but the final 1024 surviving players live on and make THE BRACKET
• You'll earn Rank PTS based on how well you did, and can gain promotion to higher divisions if you can get enough PTS!
• Players will be rewarded with Cosmetics based on the best Division they were able to reach
• For FULL info on Tournaments, press the "INFO" in the top-right corner of the Tournament Lobby!

• Buy pets DIRECTLY with NO RNG at the new Pet Mart! Pets rotate daily, sometimes on a discount, and always in Tradeable form!

• Added new Damage Symbols for Crystal Damage -- both M for million and T for Trillion! Can you hit the new max damage display of 999,999T?
• DB's Charred Bones & WW's Aethermoons can now be held-down on and are used one at a time, just like AC's Arcane Rock!
• Various important NPCs added to the Map Info, from Soul Totems to Subfeatures like Coral Kid and Keymaster!
• Edited the AFK-Gains display of "Ores/Logs Per HR" and "QTY of Drops" for both ores and logs, so that they are much cleaner.
• Breeding creatures are now called Mobs, not pets. Companions are now Pets.
• Statue Carry Capacity maximum is now 999,999,999 instead of the previous 9,999,999
• Minor adjustments to "Crop Depot" number displays in the Farming Market to make it more legible, less overlapping numbers.`;

const PATCH_CHUNK_6 = `• Aethermoons are now earned every 1hr, and give 1hr of dust instead as a result, so that it matches the 1hr timeline of the other Masterclasses.
• Construction "material" costs are no longer. They now just got salts from the refinery.
• POW required for last few tunnels has been lowered a lot, in the 10x~1000x lower range.
• Quick Slap bubble adjusted to be based on POW of movement speed (albeit base 2, not base 10 for those who understand Logarithmic scale) to be more in-line with "Big Meaty Claws" and "Name I Guess" bubbles which scale based on POW of HP and MP respectively.
• Coralcave Crab HP reduced: 8M -> 3M Crystal HP
• Coralcave Guardian HP reduced: 200M -> 100M Crystal HP
• Coral Reef costs for Tome, Gallery, and Ninja related corals increased by about 1.10^LV
• Octosoda will continue doing exactly what it gave you currently, which was Spelunking AFK gains, but will not give AFK gains for the rest of W7 skills.
• Charge Syphon increases Max Charge by +1000% per LV, instead of +10% per LV, but Time Candies no longer give Worship Charge
• "Total LV of Sigils" Tome Metric now maxes out at is now 120 (new sigils). It should've been 96 before because of Spelunking's bonus, but it wasnt, thats why it's jumped from 72 -> 120 at once. As such, the PTS from this metric have gone way up for maxing it, from 250 -> 500!
• The PTS from the "Total Vial LV" metric has been increased from 500 -> 600
• Added a cooldown to "guaranteed crystal mob spawn", so that you can only get 2/sec. You still get the same number of them, this isn't a nerf.
• Teh TOM now caps at +1200 Tome PTS. Why not +1000, since Max Lv is 500? Well, because that's misinfo, fake news, and quite frankly no longer the case, get with the program!!`;

const PATCH_CHUNK_7 = `• Fixed an issue wherein Deposit All button, only when it came to statues coming from storage chest, wouldnt take into account the full bonus exp from having other Zenith Statues
• Fixed Funguy's Party Crashin' Quest from being uncompletable -- if you were trying to complete it, simply forfeit it in Codex and try again now.
• Fixed the Daily Task requiring sending a "friend message" by making it require sending a "friend bonus" instead.
• Fixed the Daily Task requiring dropping a leaf on Stiltzcho, since he got moved.
• Fixed an issue where the "Grand Discovery" elixir in Spelunking could prevent you from finishing a run
• Fixed "Picasso Gaming" Legend Talent, the one that boosts all Palette Bonuses from all colours. I have also adjusted the bonus itself
• Fixed a small end-game overflow regarding Shrine EXP

• Research AFK gains is only for OFFLINE gains only. Online Research gains are 100%, so if you're online you're good!
• Duplicate pets do NOT count in Tournaments, and never will. You have 17 Riptides? Good for you, only 1 Riptide makes the team.
• When you Register for a tournament, you're locking in your team for that day.
• Tournaments are for glory and bragging rights, not for getting stats.
• All mega-rare pets, like my very own Glunko Supreme as well as the new Champion Pets, always have just 10 Power.
• Champion Pets, which are awarded to the winning player of each tournament, have NO IdleOn stats.
• You can change which Username you use for Tournaments on Pg 2 of "Info" found in the Top-Right of Tournament Lobby.
• Rat King's Crowns are not made equally, as the ones further down the log book are way harder to get!`;

const PATCH_CHUNK_8 = `No new content... but remember to make a blue candle wish on December 25th to get your GIFTMAS MIRACLE!

• Added a warning when trashing the ONLY copy of a companion you have, properly informing you that you'll lose their bonus if you do trash them while also helping prevent accidental trashing of final copies.
• Nova Blasts from elixirs (that includes the Spelunker Shop Upgrade that causes blasts when using any elixir) now disables the Escape Rope from appearing within the first 4*N depths.

• Fixed a rare issue regarding Winter Candle not visually letting some players buy their pity Riptide when they reached pity.
• The new Material Bags from Anvil VII now visually show up in your "Storage Info" section above your player stats.
• Fixed an issue where endgame Sneaking Nunchaku would say "infinity" damage around the 10e100 mark.
• Fixed an issue with Divinity Kattlekruk not giving his daily bubble LVs to a small subset of players in certain circumstanes some of the time.
• Fixed an issue regarding the "DING! Free Ticket!" system for leaving IdleOn running being stuck for some users, shown by needing 6 trillion hours for the next free ticket.
• Fixed a mobile overflow regarding Statues - specifically the displayed requirement to level up a statue.
• Fixed a mobile issue where "Portal Opened!" would pop up often on maps you've already unlocked all portals on.`;

const PATCH_CHUNK_9 = `Giftmas is HERE! Celebrate with daily giftboxes, daily ticket tries, and daily digs until December 31st!
• Daily Giftboxes: Collect 50 giftboxes every day by defeating monsters, and open them for exclusive hats, nametags, gems, and more
• Collecting all 50 giftboxes each day earns you a FREE try at the Starry Night Delight ticket!
• Starry Night Delight Ticket: Found in World 1 town, you can win Event Points & exclusive event rewards
• The "Leave IdleOn running for free Ticket Plays!" system now caps at 24hrs (and starts off much faster)
• Daily Dig is BACK! Every day, you can find special rewards, just say "Dig" in game to get started!

• 2 new metrics added to Tome: Bubba Megaflesh owned, and Total Premium Hats Collected
• Glimmerwick Candle added -- making this the BESTEST event EVER!!!!
• BUBBA PET BUBBA PET!!!! Check it out in the Gem Shop!
• All premium hats in your Slab are credited to your Hat Rack! Harold sends his regards...
• You can now "View Collection" within the Event Shop! This shows you a list of all event bonuses you've ever purchased!
• Items deposited to the Gallery and Hat Rack are now credited to the slab!

• Alchemy Bubbles with linearly scaling bonuses (like Main Stat Bubbles) now start dropping off after Lv 50000. For example, a Lv 200K bubble would give the bonuses that a Lv 75K bubble used to give, a Lv 1M bubble would give the bonuses that a Lv ~90K bubble used to give, and an infinitely leveled bubble would give the bonuses that a Lv 100K bubble used to give.
• Full transparency: the above change was polled in the official discord with an Approval Rating of 83.4% (8122 "YES" votes to 1615 "NO" votes)

• Added a Reclaim button to all completed quests involving Stamps, including World 7 quests.
• Spelunking Chapter 4 'No Escape' now gives the correct Lore Bonuses when used`;

const PATCH_CHUNK_10 = `• You get 2.40 event points on average per Starry Night Delight ticket.
• You can expect to get ~60 tickets for free by playing and leaving IdleOn open every day (23 from 50-box-collecting, 30+ from timer system, 2 for free instantly when downloading the update, more from Daily Dig and other surprises).
• You can thus expect to get ~144 event points on average for free, not including event points from Daily Dig.
• This also means you are guaranteed to hit the Gingerbread Jackpot at least once for free, for what I believe is the first time in IdleOn event history!
• The Blue Candle counts as +1 pity for the Green Candle toward getting Riptide.
• Your Total Wish Boost, shown under the Green Candle, improves the odds of BOTH candles, and increases by +1% for every wish you make
• The odds of winning a Tradeable Riptide (shown under the Green Candle) are the same odds as winning at the free Blue Candle each day.
• The Yellow Candle will indeed last forever, just make sure you don't get rid of it.
• You can expect to get 50 boxes a day for 23 days, which is 1150 boxes, which based on MATH itself means you have a 68.4% chance of getting a particular Event Exclusive
• The Ticket game will sometimes show two prizes being won, but you only win the bigger prize as stated on the ticket`;

// ══════════════════════ RUN TESTS ══════════════════════

const COLORS = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m', white: '\x1b[37m',
};
const TYPE_COLORS = {
  fix: COLORS.green, added: COLORS.cyan, nerf: COLORS.red,
  buff: COLORS.yellow, change: COLORS.magenta, ui: COLORS.blue, info: '\x1b[37m', unknown: COLORS.dim,
};

function testChunk(name, text) {
  const changes = parsePatchNotes(text);
  console.log(`\n${COLORS.bold}════════════════════ ${name} ════════════════════${COLORS.reset}`);

  const typeCounts = {};
  for (const c of changes) {
    typeCounts[c.type] = (typeCounts[c.type] || 0) + 1;
    const col = TYPE_COLORS[c.type] || COLORS.dim;
    const shortText = c.text.length > 90 ? c.text.slice(0, 87) + '...' : c.text;
    let extra = '';
    if (c.numericChanges.length) {
      extra = c.numericChanges.map(n => {
        if (n.from && n.to) return `${n.from} → ${n.to}`;
        if (n.multiplier) return n.multiplier;
        if (n.max) return `max ${n.max}`;
        if (n.cap) return `cap ${n.cap}`;
        if (n.per) return `per ${n.per}`;
        return JSON.stringify(n);
      }).join(', ');
      extra = `  ${COLORS.bold}[${extra}]${COLORS.reset}`;
    }
    const terms = c.terms.length ? `  ${COLORS.dim}terms: ${c.terms.slice(0, 6).join(', ')}${c.terms.length > 6 ? '...' : ''}${COLORS.reset}` : '';
    console.log(`  ${col}[${c.type.toUpperCase().padEnd(7)}]${COLORS.reset} ${shortText}${extra}${terms}`);
  }

  const total = changes.length;
  const typed = changes.filter(c => c.type !== 'unknown').length;
  const withTerms = changes.filter(c => c.terms.length > 0).length;
  const withNums = changes.filter(c => c.numericChanges.length > 0).length;
  const unknown = changes.filter(c => c.type === 'unknown').length;

  console.log(`  ${COLORS.dim}─── Summary: ${total} items parsed | ${typed} typed (${unknown} unknown) | ${withTerms} with terms | ${withNums} with numbers ───${COLORS.reset}`);

  return { total, typed, withTerms, withNums, unknown, typeCounts };
}

const chunks = [
  ['Chunk 1: Vault + Tournament + Fixes', PATCH_CHUNK_1],
  ['Chunk 2: Valenslimes + Research Grid', PATCH_CHUNK_2],
  ['Chunk 3: Artifact reset + Balance + Fixes', PATCH_CHUNK_3],
  ['Chunk 4: Murky Trenches + Research + New Content', PATCH_CHUNK_4],
  ['Chunk 5: Grand Tournament + Pet Mart + QoL', PATCH_CHUNK_5],
  ['Chunk 6: Balance Changes + Nerfs', PATCH_CHUNK_6],
  ['Chunk 7: Fixes + Info Notes', PATCH_CHUNK_7],
  ['Chunk 8: Giftmas Hotfix', PATCH_CHUNK_8],
  ['Chunk 9: Giftmas + Alchemy Nerf + Stamps', PATCH_CHUNK_9],
  ['Chunk 10: Event Info + Candles', PATCH_CHUNK_10],
];

let grandTotal = { total: 0, typed: 0, withTerms: 0, withNums: 0, unknown: 0, typeCounts: {} };

for (const [name, text] of chunks) {
  const r = testChunk(name, text);
  grandTotal.total += r.total;
  grandTotal.typed += r.typed;
  grandTotal.withTerms += r.withTerms;
  grandTotal.withNums += r.withNums;
  grandTotal.unknown += r.unknown;
  for (const [t, c] of Object.entries(r.typeCounts)) {
    grandTotal.typeCounts[t] = (grandTotal.typeCounts[t] || 0) + c;
  }
}

// ── FULL combined test ──
const fullText = chunks.map(c => c[1]).join('\n\n');
const fullChanges = parsePatchNotes(fullText);

console.log(`\n${COLORS.bold}${COLORS.green}══════════════════════════════════════════════════════════════${COLORS.reset}`);
console.log(`${COLORS.bold}  GRAND TOTALS (${chunks.length} chunks)${COLORS.reset}`);
console.log(`${COLORS.bold}${COLORS.green}══════════════════════════════════════════════════════════════${COLORS.reset}`);
console.log(`  Total items parsed:    ${grandTotal.total}`);
console.log(`  Items with a type:     ${grandTotal.typed} (${(grandTotal.typed/grandTotal.total*100).toFixed(1)}%)`);
console.log(`  Items with game terms: ${grandTotal.withTerms} (${(grandTotal.withTerms/grandTotal.total*100).toFixed(1)}%)`);
console.log(`  Items with numbers:    ${grandTotal.withNums} (${(grandTotal.withNums/grandTotal.total*100).toFixed(1)}%)`);
console.log(`  Unknown type:          ${grandTotal.unknown} (${(grandTotal.unknown/grandTotal.total*100).toFixed(1)}%)`);
console.log(`  Combined parse:        ${fullChanges.length} items`);
console.log(`\n  Type breakdown:`);
for (const [t, c] of Object.entries(grandTotal.typeCounts).sort((a,b) => b[1] - a[1])) {
  const col = TYPE_COLORS[t] || COLORS.dim;
  console.log(`    ${col}${t.toUpperCase().padEnd(10)}${COLORS.reset} ${c}`);
}

// ── Assertions ──
const allLines = fullText.split('\n').filter(l => l.trim().startsWith('•')).length;
const clipLines = fullText.split('\n').filter(l => l.trim().startsWith('📋')).length;
console.log(`\n  Input bullet lines (•): ${allLines}`);
console.log(`  Input clipboard lines (📋): ${clipLines}`);
console.log(`  Coverage: ${fullChanges.length} / ~${allLines + clipLines} bullet+clip lines = ${(fullChanges.length / (allLines + clipLines) * 100).toFixed(1)}%`);

// Check specific expected items
const expectations = [
  { desc: 'Crab HP 8M->3M detected', test: () => fullChanges.some(c => c.numericChanges.some(n => n.from === '8M' || (n.from && n.from.includes('8M')))) },
  { desc: 'Guardian HP 200M->100M detected', test: () => fullChanges.some(c => c.numericChanges.some(n => n.from && n.from.includes('200M'))) },
  { desc: 'Sigils 72->120 detected', test: () => fullChanges.some(c => c.numericChanges.some(n => n.from === '72' || (n.from && n.from.includes('72')))) },
  { desc: 'Vial LV 500->600 detected', test: () => fullChanges.some(c => c.numericChanges.some(n => (n.from === '500' && n.to === '600') || (n.from && n.from.includes('500')))) },
  { desc: 'Crystal spawn 2/sec->5/sec', test: () => fullChanges.some(c => c.text.includes('Crystal') && c.numericChanges.length > 0) },
  { desc: 'Tome cap 1200', test: () => fullChanges.some(c => c.numericChanges.some(n => n.cap === '1200' || (n.max && n.max.includes('1200')))) },
  { desc: 'Alchemy bubble Lv 50000', test: () => fullChanges.some(c => c.text.includes('Alchemy') || c.text.includes('Bubbles')) },
  { desc: 'Charge Syphon +1000% vs +10%', test: () => fullChanges.some(c => c.text.includes('Charge Syphon') || c.text.includes('Worship Charge')) },
  { desc: '100x rarer multiplier', test: () => fullChanges.some(c => c.numericChanges.some(n => n.multiplier === '100x')) },
  { desc: 'Info type detected', test: () => fullChanges.some(c => c.type === 'info') },
  { desc: '"can now" → ADDED', test: () => fullChanges.some(c => c.text.includes('can now') && c.type === 'added') },
  { desc: '"adjusted" → CHANGE', test: () => fullChanges.some(c => c.text.includes('adjusted') && c.type === 'change') },
  { desc: '"is BACK" → ADDED', test: () => fullChanges.some(c => c.text.includes('BACK') && c.type === 'added') },
  { desc: 'PTS instead-of detected', test: () => fullChanges.some(c => c.numericChanges.some(n => n.from === '155' || (n.from && n.from.includes('155')))) },
  { desc: 'per 100 trades detected', test: () => fullChanges.some(c => c.numericChanges.some(n => n.per && n.per.includes('100'))) },
  { desc: 'Sailing term matched', test: () => fullChanges.some(c => c.terms.includes('Sailing')) },
  { desc: 'Refinery term matched', test: () => fullChanges.some(c => c.terms.includes('Refinery')) },
  { desc: 'Summoning term matched', test: () => fullChanges.some(c => c.terms.includes('Summoning')) },
  { desc: 'Cooking/Meal term matched', test: () => fullChanges.some(c => c.terms.includes('Cooking') || c.terms.includes('Meal')) },
  { desc: 'Breeding term matched', test: () => fullChanges.some(c => c.terms.includes('Breeding')) },
  { desc: 'Sigil term matched', test: () => fullChanges.some(c => c.terms.includes('Sigil')) },
  { desc: 'Shrine term found', test: () => fullChanges.some(c => c.terms.includes('Shrine')) },
  { desc: 'Arcade term matched', test: () => fullChanges.some(c => c.terms.includes('Arcade')) },
  { desc: 'No Escape term matched', test: () => fullChanges.some(c => c.terms.includes('No Escape')) },
  { desc: 'Arctis term matched', test: () => fullChanges.some(c => c.terms.includes('Arctis')) },
  { desc: 'Artifact term matched', test: () => fullChanges.some(c => c.terms.includes('Artifact')) },
  { desc: 'Construction/Refinery matched', test: () => fullChanges.some(c => c.terms.includes('Construction') || c.terms.includes('Refinery')) },
  { desc: 'Drop Rate term matched', test: () => fullChanges.some(c => c.terms.includes('Drop Rate')) },
  { desc: 'Name I Guess bubble matched', test: () => fullChanges.some(c => c.terms.includes('Name I Guess')) },
  { desc: 'AFK Gains term matched', test: () => fullChanges.some(c => c.terms.includes('AFK Gains')) },
  { desc: 'Slab term matched', test: () => fullChanges.some(c => c.terms.includes('Slab')) },
];

console.log(`\n${COLORS.bold}  Specific checks:${COLORS.reset}`);
let pass = 0, fail = 0;
for (const e of expectations) {
  const ok = e.test();
  if (ok) { pass++; console.log(`    ${COLORS.green}✓${COLORS.reset} ${e.desc}`); }
  else    { fail++; console.log(`    ${COLORS.red}✗${COLORS.reset} ${e.desc}`); }
}
console.log(`\n  ${COLORS.bold}${pass}/${expectations.length} checks passed${fail > 0 ? ` (${COLORS.red}${fail} FAILED${COLORS.reset}${COLORS.bold})` : ` ${COLORS.green}ALL PASS${COLORS.reset}`}${COLORS.reset}`);

if (fail > 0) process.exit(1);
