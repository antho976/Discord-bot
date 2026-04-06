// ===== BUILT-IN KNOWLEDGE BASE =====
const BUILT_IN_KNOWLEDGE = {
  // --- GAMES ---
  'valorant': { type: 'game', genre: 'fps', desc: 'a tactical 5v5 shooter by Riot', opinions: { positive: ['Valorant honestly sets the bar for tactical shooters rn', 'The agent abilities in Valorant add so much strategy', 'Valorant ranked grind is addicting once you get into it'], negative: ['Valorant can be pretty toxic in ranked ngl', 'The matchmaking in Valorant feels off sometimes'], neutral: ['Valorant is one of those games you either grind or dont touch'] } },
  'minecraft': { type: 'game', genre: 'sandbox', desc: 'a sandbox survival game', opinions: { positive: ['Minecraft is literally timeless you can always go back', 'Minecraft with mods is a whole different experience', 'Building in Minecraft is genuinely therapeutic'], negative: ['Vanilla Minecraft gets repetitive after a while'], neutral: ['Minecraft is one of those games everyone has played'] } },
  'fortnite': { type: 'game', genre: 'battle royale', desc: 'a battle royale by Epic Games', opinions: { positive: ['Fortnite keeps reinventing itself and thats impressive', 'The building in Fortnite is actually really skillful'], negative: ['Fortnite was better in the OG days honestly', 'Fortnite lobbies can be a lot'], neutral: ['Fortnite is still going strong love it or hate it'] } },
  'league of legends': { type: 'game', genre: 'MOBA', desc: 'a MOBA by Riot Games', opinions: { positive: ['League is actually rewarding once you learn a champ well', 'Champion design in League is always top tier'], negative: ['League is a mental health hazard lol', 'Been playing League for years and still dont know why'], neutral: ['League is the game you say youll quit but never do'] } },
  'league': { type: 'game', alias: 'league of legends' },
  'lol': { type: 'game', alias: 'league of legends' },
  'gta': { type: 'game', genre: 'open world', desc: 'an open world action game by Rockstar', opinions: { positive: ['GTA Online with friends is pure chaos and I love it', 'Rockstar knows how to make open worlds'], negative: ['GTA Online grind is insane without buying stuff', 'Loading times in GTA are legendary for wrong reasons'], neutral: ['GTA just hits different every generation'] } },
  'gta 6': { type: 'game', genre: 'open world', desc: 'the upcoming GTA sequel', opinions: { positive: ['GTA 6 is probably the most hyped game in history rn', 'If Rockstar delivers GTA 6 could be game of the decade'], negative: ['The wait for GTA 6 has been painful'], neutral: ['GTA 6 hype is at astronomical levels rn'] } },
  'elden ring': { type: 'game', genre: 'RPG', desc: 'an open world RPG by FromSoftware', opinions: { positive: ['Elden Ring is a masterpiece the world design is insane', 'Exploration in Elden Ring is genuinely unmatched'], negative: ['Elden Ring difficulty spikes are brutal ngl', 'Some bosses in Elden Ring are straight up unfair'], neutral: ['Elden Ring made everyone a souls fan somehow'] } },
  'overwatch': { type: 'game', genre: 'hero shooter', desc: 'a team hero shooter by Blizzard', opinions: { positive: ['Overwatch is fun with a good team comp', 'The character designs in Overwatch are so well done'], negative: ['Overwatch matchmaking is a coin flip', 'Going from 6v6 to 5v5 was rough'], neutral: ['Overwatch has its moments but ranked is wild'] } },
  'overwatch 2': { type: 'game', alias: 'overwatch' },
  'apex legends': { type: 'game', genre: 'battle royale', desc: 'a BR shooter by Respawn', opinions: { positive: ['Apex movement is the smoothest in any BR', 'Apex is underrated as a competitive shooter'], negative: ['Apex servers have been rough ngl', 'SBMM in Apex is questionable'], neutral: ['Apex is solid but the skill ceiling is high'] } },
  'apex': { type: 'game', alias: 'apex legends' },
  'cod': { type: 'game', genre: 'FPS', desc: 'an FPS franchise by Activision', opinions: { positive: ['CoD campaigns are always cinematic', 'Zombies mode is goated no debate'], negative: ['CoD multiplayer has been mid lately', 'A new CoD every year is exhausting'], neutral: ['CoD is comfort gaming you know what youre getting'] } },
  'call of duty': { type: 'game', alias: 'cod' },
  'roblox': { type: 'game', genre: 'platform', desc: 'a game creation platform', opinions: { positive: ['Roblox has genuinely creative games on there', 'The variety on Roblox is actually insane'], negative: ['Most Roblox games are the same obby copied 1000 times'], neutral: ['Roblox is way bigger than people give it credit for'] } },
  'zelda': { type: 'game', genre: 'adventure', desc: 'an adventure series by Nintendo', opinions: { positive: ['Zelda games are consistently some of the best ever', 'Tears of the Kingdom blew my mind'], negative: ['Weapon durability in BotW is so annoying tho'], neutral: ['You cant go wrong with a Zelda game'] } },
  'tears of the kingdom': { type: 'game', alias: 'zelda' },
  'botw': { type: 'game', alias: 'zelda' },
  'totk': { type: 'game', alias: 'zelda' },
  'pokemon': { type: 'game', genre: 'RPG', desc: 'an RPG series by Nintendo', opinions: { positive: ['Pokemon is pure nostalgia', 'Competitive Pokemon is way deeper than people think'], negative: ['Game Freak has been slacking on quality', 'Pokemon games are too easy now'], neutral: ['Pokemon will never die its just too iconic'] } },
  'genshin impact': { type: 'game', genre: 'gacha RPG', desc: 'an open world gacha RPG', opinions: { positive: ['Genshin world design is actually beautiful', 'Insane production value for a free game'], negative: ['Gacha system is predatory ngl', 'Genshin endgame is pretty dry'], neutral: ['Genshin is great as a casual game to hop in and out'] } },
  'genshin': { type: 'game', alias: 'genshin impact' },
  'cs2': { type: 'game', genre: 'FPS', desc: 'a tactical FPS by Valve', opinions: { positive: ['CS2 is still THE tactical shooter', 'Skill ceiling in CS is literally infinite'], negative: ['CS2 matchmaking has a cheater problem', 'Skin prices in CS2 are wild'], neutral: ['CS will always be CS it just hits different'] } },
  'csgo': { type: 'game', alias: 'cs2' },
  'counter strike': { type: 'game', alias: 'cs2' },
  'baldurs gate 3': { type: 'game', genre: 'RPG', desc: 'an RPG by Larian Studios', opinions: { positive: ['BG3 raised the bar for RPGs honestly', 'Choices in BG3 actually matter which is rare'], negative: ['BG3 Act 3 needed more polish imo'], neutral: ['BG3 is peak RPG but its a time commitment'] } },
  'bg3': { type: 'game', alias: 'baldurs gate 3' },
  'helldivers 2': { type: 'game', genre: 'co-op shooter', desc: 'a co-op shooter', opinions: { positive: ['Most fun Ive had in co-op in years', 'Spreading democracy has never been this fun'], negative: ['Nerfs come too fast sometimes'], neutral: ['Great with friends but solo is rough'] } },
  'helldivers': { type: 'game', alias: 'helldivers 2' },
  'destiny 2': { type: 'game', genre: 'looter shooter', desc: 'a looter shooter by Bungie', opinions: { positive: ['Destiny raids are some of the best PvE in gaming', 'Destiny gunplay is unmatched'], negative: ['Destiny FOMO is real always feel behind', 'Bungie removing content people paid for is rough'], neutral: ['Destiny is a love hate relationship'] } },
  'destiny': { type: 'game', alias: 'destiny 2' },
  'dead by daylight': { type: 'game', genre: 'horror', desc: 'an asymmetric horror game', opinions: { positive: ['DBD is addicting past the learning curve', 'Playing killer at 2am hits different'], negative: ['DBD matchmaking is pain', 'The grind is astronomical'], neutral: ['DBD is the game I love to hate'] } },
  'dbd': { type: 'game', alias: 'dead by daylight' },
  'hollow knight': { type: 'game', genre: 'metroidvania', desc: 'a metroidvania by Team Cherry', opinions: { positive: ['Hollow Knight is a masterpiece for the price', 'Art and music in Hollow Knight are perfection'], negative: ['Some bosses made me question my life choices'], neutral: ['Hollow Knight will destroy you in the best way'] } },
  'terraria': { type: 'game', genre: 'sandbox', desc: 'a 2D sandbox adventure', opinions: { positive: ['Insane content for a 2D game', 'Devs kept updating for years absolute legends'], negative: ['Early game without a wiki is confusing'], neutral: ['Looks simple but the depth is crazy'] } },
  'stardew valley': { type: 'game', genre: 'farming sim', desc: 'a farming sim by ConcernedApe', opinions: { positive: ['The ultimate comfort game', 'One dev making all this is insane respect'], negative: ['Time management stresses me more than real life'], neutral: ['Everyone should play Stardew at least once'] } },
  'stardew': { type: 'game', alias: 'stardew valley' },
  'cyberpunk 2077': { type: 'game', genre: 'RPG', desc: 'an open world RPG by CDPR', opinions: { positive: ['After patches Cyberpunk is genuinely good', 'Night City is the most immersive game world ever'], negative: ['Launch was rough but its redeemed itself'], neutral: ['Cyberpunk is a redemption arc for CDPR'] } },
  'cyberpunk': { type: 'game', alias: 'cyberpunk 2077' },
  'warzone': { type: 'game', genre: 'battle royale', desc: 'a CoD battle royale', opinions: { positive: ['Warzone with a full squad hits different', 'Wins feel the most satisfying in any BR'], negative: ['Cheater problem is insane', 'File size is criminal'], neutral: ['Peak CoD in BR form'] } },
  'rust': { type: 'game', genre: 'survival', desc: 'a multiplayer survival game', opinions: { positive: ['Raid nights are peak gaming', 'Emergent gameplay is unmatched'], negative: ['Offline raiding is the worst thing in gaming', 'Requires way too much time'], neutral: ['Brings out the worst and best in people'] } },
  'among us': { type: 'game', genre: 'party', desc: 'a social deduction game', opinions: { positive: ['Full lobby of friends is peak gaming', 'The lying brings out the worst in everyone lol'], negative: ['Randos are a different breed', 'Got old quick ngl'], neutral: ['Was a cultural phenomenon for sure'] } },
  'rocket league': { type: 'game', genre: 'sports', desc: 'car soccer', opinions: { positive: ['Skill ceiling is genuinely infinite', 'Hitting ceiling shots in RL is unmatched'], negative: ['Teammates in ranked are something else', 'Been playing for years still trash'], neutral: ['Easy to learn impossible to master'] } },
  'dark souls': { type: 'game', genre: 'action RPG', desc: 'an action RPG by FromSoftware', opinions: { positive: ['Taught me patience honestly', 'Level design is masterclass'], negative: ['Just suffering simulator change my mind'], neutral: ['Defines a whole genre'] } },
  'animal crossing': { type: 'game', genre: 'life sim', desc: 'a life sim by Nintendo', opinions: { positive: ['Most wholesome game ever made', 'Island decorating hits different'], negative: ['Gets repetitive after the honeymoon phase'], neutral: ['Virtual therapy honestly'] } },
  'lethal company': { type: 'game', genre: 'horror', desc: 'a co-op horror game', opinions: { positive: ['With friends at 2am is TERRIFYING and hilarious', 'Modding community is goated'], negative: ['Solo is just depression simulator'], neutral: ['Fun with friends horror alone'] } },
  'palworld': { type: 'game', genre: 'survival', desc: 'a creature survival game', opinions: { positive: ['Scratches that Pokemon itch but with guns lol', 'Catching pals is surprisingly addicting'], negative: ['Content dried up quick'], neutral: ['Had a crazy launch thats for sure'] } },
  'ff14': { type: 'game', genre: 'MMO', desc: 'an MMORPG by Square Enix', opinions: { positive: ['Story is better than most single player RPGs', 'Community is genuinely wholesome'], negative: ['Base game ARR is a slog', 'GCD feels slow coming from other games'], neutral: ['The MMO with an actually good story which is wild'] } },
  'ffxiv': { type: 'game', alias: 'ff14' },
  'final fantasy': { type: 'game', alias: 'ff14' },
  'wow': { type: 'game', genre: 'MMO', desc: 'an MMORPG by Blizzard', opinions: { positive: ['20 years and still has a community thats dedication', 'Classic WoW nostalgia hits different'], negative: ['Modern WoW systems are exhausting', 'Blizzard keeps missing what made it great'], neutral: ['The granddaddy of MMOs love it or hate it'] } },
  'world of warcraft': { type: 'game', alias: 'wow' },
  'diablo': { type: 'game', genre: 'action RPG', desc: 'an action RPG by Blizzard', opinions: { positive: ['Loot grinding is dangerously addicting', 'Dark atmosphere is chefs kiss'], negative: ['Blizzard monetization has been questionable'], neutral: ['The game you play to mindlessly destroy everything'] } },
  'the sims': { type: 'game', genre: 'life sim', desc: 'a life simulator by EA', opinions: { positive: ['Ultimate creative outlet', 'Building houses is so satisfying'], negative: ['EA charging for every expansion is insane'], neutral: ['Live your best virtual life'] } },
  'sims': { type: 'game', alias: 'the sims' },
  'smash bros': { type: 'game', genre: 'fighting', desc: 'a fighting game by Nintendo', opinions: { positive: ['Ultimate roster is insane', 'Best party game no debate'], negative: ['Online is laggy pain'], neutral: ['Brings out the competitive side in everyone'] } },
  'smash': { type: 'game', alias: 'smash bros' },
  'fifa': { type: 'game', genre: 'sports', desc: 'a football/soccer game by EA', opinions: { positive: ['With friends is always a good time', 'Ultimate Team is addicting'], negative: ['Same game every year and we still buy it'], neutral: ['Comfort gaming for sports fans'] } },
  'ea fc': { type: 'game', alias: 'fifa' },
  'idleon': { type: 'game', genre: 'idle MMO', desc: 'an idle MMO by LavaFlame2', opinions: { positive: ['Idleon is insanely deep for an idle game the amount of content is wild', 'The skilling progression in Idleon is so satisfying when it clicks', 'AFK gains in Idleon are genius you progress while doing nothing'], negative: ['New players get overwhelmed by how much there is to do in Idleon', 'The UI in Idleon can be a lot to figure out at first'], neutral: ['Idleon is one of those games where the wiki is your best friend'] } },
  'legends of idleon': { type: 'game', alias: 'idleon' },
  'idle on': { type: 'game', alias: 'idleon' },

  // --- ANIME & SHOWS ---
  'one piece': { type: 'anime', genre: 'shonen', desc: 'a pirate adventure anime', opinions: { positive: ['Worldbuilding is genuinely the best in anime', 'Wano arc animation was insane'], negative: ['Pacing can be rough especially in the anime', '1000+ episodes is a lot to commit to'], neutral: ['Its a journey and I mean that literally'] } },
  'naruto': { type: 'anime', genre: 'shonen', desc: 'a ninja anime series', opinions: { positive: ['Fight scenes go crazy hard', 'Pain arc is peak fiction'], negative: ['Filler is astronomical', 'Ending was mid ngl'], neutral: ['Defined a whole generation of anime fans'] } },
  'attack on titan': { type: 'anime', genre: 'action', desc: 'a dark fantasy anime', opinions: { positive: ['Most intense anime Ive ever watched', 'Plot twists are insane'], negative: ['Ending was divisive thats for sure'], neutral: ['Changed what anime could be for mainstream'] } },
  'aot': { type: 'anime', alias: 'attack on titan' },
  'demon slayer': { type: 'anime', genre: 'shonen', desc: 'a demon hunter anime', opinions: { positive: ['Ufotable animation is genuinely unmatched', 'Every fight is a visual masterpiece'], negative: ['Story is kinda simple for how popular it is'], neutral: ['Carried by god tier animation and thats ok'] } },
  'jujutsu kaisen': { type: 'anime', genre: 'shonen', desc: 'a sorcerer anime', opinions: { positive: ['Fights are some of the most creative in anime', 'Gojo is perfectly designed'], negative: ['Manga pacing got wild', 'Some plot points came outta nowhere'], neutral: ['Peak modern shonen especially the animations'] } },
  'jjk': { type: 'anime', alias: 'jujutsu kaisen' },
  'dragon ball': { type: 'anime', genre: 'shonen', desc: 'a martial arts anime', opinions: { positive: ['The anime that started it all for so many people', 'Tournament arcs are always hype'], negative: ['Power scaling stopped making sense ages ago'], neutral: ['Comfort anime you know what youre getting'] } },
  'dbz': { type: 'anime', alias: 'dragon ball' },
  'my hero academia': { type: 'anime', genre: 'shonen', desc: 'a superhero anime', opinions: { positive: ['Some really well done character arcs', 'Quirk system is creative'], negative: ['Fell off after a while imo'], neutral: ['Gateway anime for newer fans'] } },
  'mha': { type: 'anime', alias: 'my hero academia' },
  'hunter x hunter': { type: 'anime', genre: 'shonen', desc: 'an adventure anime', opinions: { positive: ['Best power system in anime period', 'Chimera Ant arc is peak'], negative: ['Hiatuses are legendary and not in a good way'], neutral: ['Fans are just perpetually waiting and coping'] } },
  'hxh': { type: 'anime', alias: 'hunter x hunter' },
  'spy x family': { type: 'anime', genre: 'comedy', desc: 'a comedy spy anime', opinions: { positive: ['Most wholesome anime in years', 'Anya is the most adorable character'], negative: ['More wholesome than plot-driven tbh'], neutral: ['Perfect comfort anime'] } },
  'solo leveling': { type: 'anime', genre: 'action', desc: 'a power fantasy anime', opinions: { positive: ['The animation and power-ups are so satisfying to watch', 'Solo Leveling is peak hype'], negative: ['Story is kinda straightforward for how popular it is'], neutral: ['Its a fun ride if you like overpowered MCs'] } },
  'chainsaw man': { type: 'anime', genre: 'action', desc: 'an action horror anime', opinions: { positive: ['Chainsaw Man is so unhinged and I love it', 'MAPPA did an insane job with the animation'], negative: ['Can be too edgy for some people'], neutral: ['Its different from typical shonen and thats the appeal'] } },
  'breaking bad': { type: 'show', genre: 'drama', desc: 'a crime drama series', opinions: { positive: ['Best show ever made imo', 'Character development is insane'], negative: ['Some parts are slow but worth it'], neutral: ['Set the standard for prestige TV'] } },
  'stranger things': { type: 'show', genre: 'sci-fi', desc: 'a sci-fi horror series', opinions: { positive: ['Season 1 was perfect television', 'Nostalgia factor is unmatched'], negative: ['Went downhill after season 1 imo'], neutral: ['Made everyone love 80s aesthetics'] } },
  'the boys': { type: 'show', genre: 'action', desc: 'a superhero satire show', opinions: { positive: ['Everything superhero content should be', 'Homelander is the most terrifying villain on TV'], negative: ['Gets pretty graphic not for everyone'], neutral: ['What happens when superheroes are realistic'] } },
  'squid game': { type: 'show', genre: 'thriller', desc: 'a Korean survival thriller', opinions: { positive: ['Wild ride from start to finish', 'The concept is genius'], negative: ['Season 2 didnt hit the same'], neutral: ['Put Korean media on the global map even more'] } },
  'the last of us': { type: 'show', genre: 'drama', desc: 'a post-apocalyptic drama', opinions: { positive: ['Best video game adaptation ever', 'Pedro Pascal chemistry is incredible'], negative: ['Some episodes were slow but payoff was worth it'], neutral: ['Proved game adaptations can work'] } },
  'tlou': { type: 'show', alias: 'the last of us' },
  'wednesday': { type: 'show', genre: 'comedy', desc: 'an Addams Family spinoff', opinions: { positive: ['Surprising good ngl', 'Jenna Ortega killed that role'], negative: ['Decent but a bit overhyped'], neutral: ['Fun watch if you like that aesthetic'] } },
  'arcane': { type: 'show', genre: 'animated', desc: 'an animated League of Legends show', opinions: { positive: ['Arcane is the best animated show in years easily', 'The animation quality is genuinely insane'], negative: ['You kinda need League context for full appreciation'], neutral: ['Set the bar for video game adaptations'] } },

  // --- MUSIC ---
  'rap': { type: 'music', genre: 'genre', desc: 'hip hop / rap music', opinions: { positive: ['Most creative genre rn with all the subgenres', 'Nothing hits like a good rap album on repeat'], negative: ['Modern rap is hit or miss lots of mid'], neutral: ['Rap has evolved so much its insane'] } },
  'hip hop': { type: 'music', alias: 'rap' },
  'pop': { type: 'music', genre: 'genre', desc: 'pop music', opinions: { positive: ['Catchy for a reason some songs are just bangers', 'Production quality these days is insane'], negative: ['Can sound samey after a while'], neutral: ['Mainstream for a reason it just works'] } },
  'rock': { type: 'music', genre: 'genre', desc: 'rock music', opinions: { positive: ['Rock never dies some of the best music ever', 'Classic rock hits different at certain times'], negative: ['People say rock is dead but its evolved'], neutral: ['So many subgenres theres something for everyone'] } },
  'metal': { type: 'music', genre: 'genre', desc: 'heavy metal music', opinions: { positive: ['Metal musicianship is genuinely insane', 'Nothing gets you hyped like metal'], negative: ['Acquired taste not everyone gets it'], neutral: ['Metal fans are some of the most dedicated'] } },
  'edm': { type: 'music', genre: 'genre', desc: 'electronic dance music', opinions: { positive: ['EDM at festivals is a whole different experience', 'Good drops hit different'], negative: ['Too much sounds the same after a while'], neutral: ['Either your vibe or not no in between'] } },
  'kpop': { type: 'music', genre: 'genre', desc: 'Korean pop music', opinions: { positive: ['Production quality is world class', 'Fan dedication is unmatched'], negative: ['Fan culture can be a lot sometimes'], neutral: ['Taken over the world and not slowing down'] } },
  'k-pop': { type: 'music', alias: 'kpop' },
  'taylor swift': { type: 'music', genre: 'artist', desc: 'a pop/country artist', opinions: { positive: ['Consistently reinvents herself and it works', 'Eras Tour is biggest in history for a reason'], negative: ['A bit overplayed at this point imo'], neutral: ['Whether you like her or not she runs the industry rn'] } },
  'drake': { type: 'music', genre: 'artist', desc: 'a rap/rnb artist', opinions: { positive: ['Has bangers you cant deny that', 'Take Care era was peak'], negative: ['Been mid lately compared to earlier stuff'], neutral: ['One of the most consistent hitmakers ever'] } },
  'kanye': { type: 'music', genre: 'artist', desc: 'a rapper and producer', opinions: { positive: ['Production is genuinely genius MBDTF is a masterpiece', 'Changed hip hop production forever'], negative: ['Recent stuff has been all over the place'], neutral: ['Separating art from artist is a whole debate'] } },
  'kendrick': { type: 'music', genre: 'artist', desc: 'a rapper', opinions: { positive: ['Best rapper alive not even close', 'Every album is a masterpiece'], negative: ['Could drop more frequently tho'], neutral: ['Sets the bar for what rap can be'] } },
  'kendrick lamar': { type: 'music', alias: 'kendrick' },
  'travis scott': { type: 'music', genre: 'artist', desc: 'a rapper and producer', opinions: { positive: ['Production and vibes are unmatched', 'Rodeo and Astroworld are elite'], negative: ['Style over substance sometimes'], neutral: ['Concerts are an experience regardless'] } },
  'the weeknd': { type: 'music', genre: 'artist', desc: 'an rnb/pop artist', opinions: { positive: ['One of the most unique voices in music', 'After Hours was perfect'], negative: ['Stuff can start sounding similar'], neutral: ['Always delivers a vibe'] } },
  'weeknd': { type: 'music', alias: 'the weeknd' },
  'eminem': { type: 'music', genre: 'artist', desc: 'a rapper', opinions: { positive: ['Old Em lyrical ability was genuinely insane', 'Slim Shady LP is a classic forever'], negative: ['New Eminem isnt the same imo'], neutral: ['One of the GOATs undeniable'] } },
  'beyonce': { type: 'music', genre: 'artist', desc: 'a pop/rnb artist', opinions: { positive: ['On another level as a performer', 'Renaissance was incredible'], negative: ['Fans can be intense'], neutral: ['Music industry royalty just facts'] } },
  'billie eilish': { type: 'music', genre: 'artist', desc: 'a pop artist', opinions: { positive: ['Such a unique sound and aesthetic', 'Album production is incredible'], negative: ['Vibe can be a bit much sometimes'], neutral: ['Carved out her own lane and thats respectable'] } },
  'sza': { type: 'music', genre: 'artist', desc: 'an rnb artist', opinions: { positive: ['Vocals are ethereal honestly', 'SOS was album of the year'], negative: ['Albums take forever to drop'], neutral: ['Carrying modern RnB'] } },
  'doja cat': { type: 'music', genre: 'artist', desc: 'a rap/pop artist', opinions: { positive: ['Most versatile artist out rn', 'Can do any genre and nail it'], negative: ['Unpredictable but keeps things interesting'], neutral: ['Keeps reinventing herself'] } },
  'bts': { type: 'music', genre: 'artist', desc: 'a K-pop group', opinions: { positive: ['Broke every barrier for K-pop in the west', 'Discography has something for everyone'], negative: ['Hype got overwhelming at some point'], neutral: ['Impact on pop culture is undeniable'] } },
  'ariana grande': { type: 'music', genre: 'artist', desc: 'a pop artist', opinions: { positive: ['Vocals are genuinely incredible', 'One of the best voices in pop rn'], negative: ['Music can sound similar across albums'], neutral: ['Powerhouse vocalist for sure'] } },

  // --- MOVIES/FRANCHISES ---
  'marvel': { type: 'movie', genre: 'superhero', desc: 'the Marvel superhero franchise', opinions: { positive: ['First three phases were incredible', 'Endgame was a cultural event'], negative: ['Marvel fatigue is real too many projects', 'Quality dropped since Endgame'], neutral: ['Changed cinema forever whether you like it or not'] } },
  'mcu': { type: 'movie', alias: 'marvel' },
  'dc': { type: 'movie', genre: 'superhero', desc: 'the DC franchise', opinions: { positive: ['Dark Knight is still the best superhero movie', 'DC animated content is goated'], negative: ['Live action has been rough outside a few films'], neutral: ['Incredible characters just need better execution'] } },
  'star wars': { type: 'movie', genre: 'sci-fi', desc: 'the Star Wars franchise', opinions: { positive: ['Original trilogy is timeless', 'Andor proved it can still be peak'], negative: ['Sequel trilogy was inconsistent', 'Disney hasnt always done it justice'], neutral: ['Incredible lore worth diving into'] } },
  'harry potter': { type: 'movie', genre: 'fantasy', desc: 'the wizarding world franchise', opinions: { positive: ['Defined a whole generation of readers', 'World building is insanely detailed'], negative: ['Movies left out so many good book moments'], neutral: ['Comfort content for so many people'] } },
  'spider-man': { type: 'movie', genre: 'superhero', desc: 'the Spider-Man franchise', opinions: { positive: ['Spider-Verse movies are the best superhero movies', 'No Way Home was peak cinema'], negative: ['Too many reboots lol'], neutral: ['Most relatable superhero thats why everyone loves him'] } },
  'spiderman': { type: 'movie', alias: 'spider-man' },
  'john wick': { type: 'movie', genre: 'action', desc: 'an action film series', opinions: { positive: ['Set a new standard for action choreography', 'World building is surprisingly deep'], negative: ['4 was maybe a bit too long'], neutral: ['Proved Keanu is an action legend'] } },

  // --- TECH ---
  'iphone': { type: 'tech', genre: 'phone', desc: 'an Apple smartphone', opinions: { positive: ['Ecosystem just works once youre in it', 'Camera is consistently top tier'], negative: ['Overpriced for what they offer sometimes', 'Holding back features to sell next year is annoying'], neutral: ['Reliable and thats what people pay for'] } },
  'android': { type: 'tech', genre: 'phone', desc: 'the Android mobile OS', opinions: { positive: ['Customization is unmatched', 'Variety means theres one for every budget'], negative: ['Updates are inconsistent across brands'], neutral: ['Android vs iPhone will never end'] } },
  'ps5': { type: 'tech', genre: 'console', desc: 'the PlayStation 5', opinions: { positive: ['Exclusives are worth the price alone', 'DualSense is a game changer'], negative: ['70 dollar games is rough', 'Needs more exclusives'], neutral: ['Solid console hard to complain'] } },
  'playstation': { type: 'tech', alias: 'ps5' },
  'xbox': { type: 'tech', genre: 'console', desc: 'the Microsoft game console', opinions: { positive: ['Game Pass is the best deal in gaming', 'Backwards compatibility is goated'], negative: ['First party exclusives have been lacking', 'Exclusivity strategy is confusing'], neutral: ['Basically a Game Pass machine and thats not bad'] } },
  'nintendo': { type: 'tech', genre: 'console', desc: 'the Nintendo company', opinions: { positive: ['Makes the most fun games period', 'Strongest first party lineup'], negative: ['Online is stuck in the past', 'Hardware always behind on specs'], neutral: ['Does their own thing and it works'] } },
  'switch': { type: 'tech', genre: 'console', desc: 'the Nintendo Switch', opinions: { positive: ['Play anywhere concept is genius', 'One of the best game libraries ever'], negative: ['Hardware is showing its age', 'Joy-Con drift is unacceptable'], neutral: ['Had an incredible run time for the next one'] } },
  'nintendo switch': { type: 'tech', alias: 'switch' },
  'pc': { type: 'tech', genre: 'platform', desc: 'PC gaming', opinions: { positive: ['Ultimate experience if you have the budget', 'Mods emulators steam sales PC is king'], negative: ['Expensive and troubleshooting is pain', 'Some game optimizations are garbage'], neutral: ['Comes down to budget and preference'] } },
  'steam deck': { type: 'tech', genre: 'handheld', desc: 'a Valve handheld PC', opinions: { positive: ['Best handheld gaming device rn', 'Whole Steam library on the go is insane'], negative: ['Battery life could be better'], neutral: ['Proved theres a market for handheld PC'] } },
  'ai': { type: 'tech', genre: 'technology', desc: 'artificial intelligence', opinions: { positive: ['Advancing so fast its revolutionary', 'Creative possibilities are insane'], negative: ['Ethics and job displacement are real concerns'], neutral: ['A tool depends on how you use it'] } },
  'chatgpt': { type: 'tech', genre: 'technology', desc: 'an AI chatbot by OpenAI', opinions: { positive: ['Actually incredibly useful', 'Changing how people work'], negative: ['People rely on it too much without verifying', 'Only as good as the person using it'], neutral: ['Started the whole AI chatbot wave'] } },
  'vr': { type: 'tech', genre: 'technology', desc: 'virtual reality', opinions: { positive: ['Future of gaming once more accessible', 'Immersion cant be explained you have to try it'], negative: ['Still too expensive and bulky', 'Motion sickness is real'], neutral: ['Cool tech that needs to get more affordable'] } },

  // --- PLATFORMS ---
  'youtube': { type: 'platform', genre: 'video', desc: 'a video platform', opinions: { positive: ['Content for literally anything', 'Long form creators are at peak quality'], negative: ['Ads are getting out of control', 'Algorithm can be a rabbit hole'], neutral: ['Replaced TV for a whole generation'] } },
  'tiktok': { type: 'platform', genre: 'social', desc: 'a short video platform', opinions: { positive: ['Algorithm is scary good at showing what you like', 'Genuinely funny content if your fyp is right'], negative: ['Time vortex I lose hours', 'Ruining attention spans'], neutral: ['Changed how content is consumed'] } },
  'twitter': { type: 'platform', genre: 'social', desc: 'a social media platform', opinions: { positive: ['For news and live events still unmatched', 'Funniest content comes from there'], negative: ['Dumpster fire and I cant look away', 'Discourse is exhausting'], neutral: ['Where you go for opinions you didnt ask for'] } },
  'twitch': { type: 'platform', genre: 'streaming', desc: 'a live streaming platform', opinions: { positive: ['Communities can be really wholesome', 'Finding a small streamer is such a vibe'], negative: ['Moderation is inconsistent', 'Ads are ruthless now'], neutral: ['Still king of game streaming'] } },
  'discord': { type: 'platform', genre: 'social', desc: 'a chat/community platform', opinions: { positive: ['Some of the best online communities', 'Features keep getting better'], negative: ['Notifications can be overwhelming', 'Some servers are too active'], neutral: ['Replaced every other chat platform for gamers'] } },
  'reddit': { type: 'platform', genre: 'social', desc: 'a forum platform', opinions: { positive: ['Community for literally everything', 'Niche hobbies is invaluable'], negative: ['Hivemind can be intense', 'Mods power tripping is comedy'], neutral: ['Front page of the internet for better or worse'] } },
  'spotify': { type: 'platform', genre: 'music', desc: 'a music streaming service', opinions: { positive: ['Discover weekly is how I find music', 'All music in one place is convenient'], negative: ['Artist payouts are criminal', 'Adding features nobody asked for'], neutral: ['Killed buying albums for a generation'] } },
  'netflix': { type: 'platform', genre: 'streaming', desc: 'a video streaming service', opinions: { positive: ['Still has bangers if you look', 'Variety is decent across genres'], negative: ['Cancelling good shows after 1 season is criminal', 'Password sharing crackdown was not the move'], neutral: ['Pioneered streaming but competition caught up'] } },

  // --- FOOD ---
  'pizza': { type: 'food', genre: 'food', desc: 'a food', opinions: { positive: ['Literally the perfect food no debate', 'Even bad pizza is still pretty good'], negative: ['Pineapple on pizza is a crime fight me'], neutral: ['Universal comfort food'] } },
  'sushi': { type: 'food', genre: 'food', desc: 'Japanese cuisine', opinions: { positive: ['Good sushi is life changing', 'Once you love it you cant stop'], negative: ['Expensive for what you get'], neutral: ['Quality range is insane from gas station to Michelin'] } },
  'ramen': { type: 'food', genre: 'food', desc: 'Japanese noodle soup', opinions: { positive: ['Real ramen is one of the best meals ever', 'On a cold day hits different'], negative: ['Good spots can be pricey for noodle soup'], neutral: ['Instant vs real is not the same food'] } },
  'coffee': { type: 'food', genre: 'drink', desc: 'a beverage', opinions: { positive: ['Only reason I function in the morning', 'Good coffee is an art form'], negative: ['Coffee addiction isnt the flex people think', 'Past 2pm is a sleep death sentence'], neutral: ['Coffee culture is wild with all the specialty stuff'] } },
  'boba': { type: 'food', genre: 'drink', desc: 'bubble tea', opinions: { positive: ['Dangerously addicting those pearls hit different', 'On a hot day is peak existence'], negative: ['Basically sugar milk but cant stop'], neutral: ['Boba craze shows no signs of slowing'] } },
  'tacos': { type: 'food', genre: 'food', desc: 'Mexican food', opinions: { positive: ['Street tacos are top tier cant change my mind', 'Perfect in every way'], negative: ['There is no bad taco honestly'], neutral: ['Ultimate accessible food'] } },
};

// ===== QUESTION TYPE MAP =====
const QUESTION_TYPE_MAP = {
  game: { pattern: /\b(?:game|games|play|playing|gaming)\b/i, type: 'game' },
  anime: { pattern: /\b(?:anime|manga|watch|watching|show|series)\b/i, type: 'anime' },
  show: { pattern: /\b(?:show|series|tv|watch|watching|movie|film)\b/i, type: 'show' },
  music: { pattern: /\b(?:music|song|album|artist|listen|listening|rapper|singer|band)\b/i, type: 'music' },
  food: { pattern: /\b(?:food|eat|restaurant|meal|snack|drink|hungry)\b/i, type: 'food' },
};

// ===== LOOKUP =====
const _knowledgeCache = new Map();
const _KNOWLEDGE_CACHE_MAX = 500;

function lookupKnowledge(subject) {
  if (!subject) return null;
  const lower = subject.toLowerCase().trim();

  if (_knowledgeCache.has(lower)) return _knowledgeCache.get(lower);

  let entry = BUILT_IN_KNOWLEDGE[lower];
  if (entry && entry.alias) entry = BUILT_IN_KNOWLEDGE[entry.alias];
  if (entry && !entry.alias) {
    const result = { key: lower, ...entry };
    _cacheKnowledge(lower, result);
    return result;
  }

  if (lower.length >= 3) {
    for (const [key, val] of Object.entries(BUILT_IN_KNOWLEDGE)) {
      if (key.length < 3) continue;
      if (lower.includes(key) || key.includes(lower)) {
        let resolved = val;
        if (resolved.alias) resolved = BUILT_IN_KNOWLEDGE[resolved.alias];
        if (resolved && !resolved.alias) {
          const result = { key, ...resolved };
          _cacheKnowledge(lower, result);
          return result;
        }
      }
    }
  }
  _cacheKnowledge(lower, null);
  return null;
}

function _cacheKnowledge(key, value) {
  if (_knowledgeCache.size >= _KNOWLEDGE_CACHE_MAX) {
    const first = _knowledgeCache.keys().next().value;
    _knowledgeCache.delete(first);
  }
  _knowledgeCache.set(key, value);
}

// ===== ANSWER WITH KNOWLEDGE =====
function answerWithKnowledge(subject, intent, sentiment = 'neutral') {
  const knowledge = lookupKnowledge(subject);
  if (!knowledge) return null;
  const { desc, type, genre, opinions } = knowledge;

  if (intent === 'asking_info') {
    const infoTemplates = [
      `Oh {subject}? Its {desc}, pretty {adjective} imo`,
      `{subject} is {desc}. Personally I think its {adjective}`,
      `From what I know {subject} is {desc}. {opinion}`,
      `{subject}? Yeah thats {desc}. {opinion}`,
      `So {subject} is basically {desc}, and honestly {opinion}`,
      `Oh yeah {subject} is {desc}! {opinion}`,
      `{subject} — {desc}. I got thoughts on that actually, {opinion}`,
    ];
    const adjectives = ['solid', 'interesting', 'worth checking out', 'pretty popular', 'well-known', 'goated', 'fire', 'decent'];
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const allOpinions = [...(opinions?.positive || []), ...(opinions?.neutral || [])];
    const opinion = allOpinions.length > 0 ? allOpinions[Math.floor(Math.random() * allOpinions.length)] : 'its pretty solid';
    const template = infoTemplates[Math.floor(Math.random() * infoTemplates.length)];
    return template
      .replace(/\{subject\}/g, subject).replace(/\{desc\}/g, desc)
      .replace(/\{adjective\}/g, adjective)
      .replace(/\{opinion\}/g, opinion.charAt(0).toLowerCase() + opinion.slice(1))
      .replace(/\{type\}/g, type).replace(/\{genre\}/g, genre || type);
  }

  if (intent === 'asking_opinion') {
    let pool;
    if (sentiment === 'negative') pool = opinions?.negative || opinions?.neutral || [];
    else if (sentiment === 'positive') pool = opinions?.positive || opinions?.neutral || [];
    else pool = opinions?.neutral || opinions?.positive || [];
    if (pool.length > 0) return pool[Math.floor(Math.random() * pool.length)];
  }

  if (intent === 'sharing_experience') {
    const reactions = [
      `Ooh {subject}! {opinion}`, `Nice choice with {subject}. {opinion}`,
      `{subject} huh? {opinion}`, `Oh you into {subject}? {opinion}`,
      `Ah {subject}, {opinion}`, `{subject} is a vibe honestly. {opinion}`,
      `Yooo {subject}! {opinion}`, `So youre a {subject} person, respect. {opinion}`,
    ];
    const allOpinions = [...(opinions?.positive || []), ...(opinions?.neutral || [])];
    const opinion = allOpinions.length > 0 ? allOpinions[Math.floor(Math.random() * allOpinions.length)] : 'thats cool';
    const template = reactions[Math.floor(Math.random() * reactions.length)];
    return template.replace(/\{subject\}/g, subject).replace(/\{opinion\}/g, opinion.charAt(0).toLowerCase() + opinion.slice(1));
  }

  if (intent === 'recommending') {
    const allOpinions = [...(opinions?.positive || [])];
    if (allOpinions.length > 0) {
      const baseOpinion = allOpinions[Math.floor(Math.random() * allOpinions.length)];
      const endorsements = [
        `Facts, ${baseOpinion.charAt(0).toLowerCase() + baseOpinion.slice(1)}`,
        `Can confirm, ${baseOpinion.charAt(0).toLowerCase() + baseOpinion.slice(1)}`,
        `Big W recommendation. ${baseOpinion}`,
        `100% agree, ${baseOpinion.charAt(0).toLowerCase() + baseOpinion.slice(1)}`,
        `Vouch. ${baseOpinion}`,
      ];
      return endorsements[Math.floor(Math.random() * endorsements.length)];
    }
  }

  if (intent === 'complaining') {
    const r = Math.random();
    let pool;
    if (r < 0.4) pool = opinions?.negative || opinions?.neutral || [];
    else if (r < 0.75) pool = opinions?.neutral || [];
    else pool = opinions?.positive || [];
    if (pool.length > 0) {
      const opinion = pool[Math.floor(Math.random() * pool.length)];
      if (r >= 0.75) {
        const prefixes = ['Idk I kinda think ', 'Hmm disagree a bit — ', 'Ngl hot take but ', 'Ok but counterpoint — '];
        return prefixes[Math.floor(Math.random() * prefixes.length)] + opinion.charAt(0).toLowerCase() + opinion.slice(1);
      }
      return opinion;
    }
  }

  const allOpinions = [...(opinions?.positive || []), ...(opinions?.neutral || []), ...(opinions?.negative || [])];
  if (allOpinions.length > 0) return allOpinions[Math.floor(Math.random() * allOpinions.length)];
  return null;
}

// ===== ANSWER GENERIC QUESTION =====
function answerGenericQuestion(text) {
  const lower = text.toLowerCase();
  if (!/\b(?:best|good|recommend|suggestions?|any recs|whats a good|what should|should i|anyone know)\b/i.test(lower)) return null;

  let targetType = null;
  for (const [, mapping] of Object.entries(QUESTION_TYPE_MAP)) {
    if (mapping.pattern.test(lower)) { targetType = mapping.type; break; }
  }
  if (!targetType) return null;

  const candidates = Object.entries(BUILT_IN_KNOWLEDGE)
    .filter(([, v]) => v.type === targetType && !v.alias && v.opinions?.positive?.length > 0)
    .map(([key, v]) => ({ key, opinion: v.opinions.positive[Math.floor(Math.random() * v.opinions.positive.length)] }));
  if (candidates.length === 0) return null;

  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  const name = pick.key.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const templates = [
    `Hmm I'd say try ${name}, ${pick.opinion.charAt(0).toLowerCase() + pick.opinion.slice(1)}`,
    `${name} is a solid pick, ${pick.opinion.charAt(0).toLowerCase() + pick.opinion.slice(1)}`,
    `Have you tried ${name}? ${pick.opinion}`,
    `I'd recommend ${name} honestly, ${pick.opinion.charAt(0).toLowerCase() + pick.opinion.slice(1)}`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

// ===== ANSWER COMPARISON =====
function answerComparison(subjectA, subjectB) {
  const a = lookupKnowledge(subjectA);
  const b = lookupKnowledge(subjectB);
  if (!a && !b) return null;

  const aName = subjectA.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const bName = subjectB.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  if (a && b) {
    const aOp = a.opinions?.neutral?.[0] || a.opinions?.positive?.[0] || '';
    const bOp = b.opinions?.neutral?.[0] || b.opinions?.positive?.[0] || '';
    const templates = [
      `Hmm ${aName} vs ${bName} is tough, ${aOp.charAt(0).toLowerCase() + aOp.slice(1)} but also ${bOp.charAt(0).toLowerCase() + bOp.slice(1)}`,
      `Both are solid honestly. ${aName}: ${aOp}. ${bName}: ${bOp}`,
      `Depends what you want tbh. ${aName} is more ${a.genre || a.type} while ${bName} is more ${b.genre || b.type}`,
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  const known = a || b;
  const knownName = a ? aName : bName;
  const unknownName = a ? bName : aName;
  const op = known.opinions?.positive?.[0] || known.opinions?.neutral?.[0] || 'pretty solid';
  return `I know more about ${knownName} tbh — ${op.charAt(0).toLowerCase() + op.slice(1)}. Not sure about ${unknownName} tho`;
}

export {
  BUILT_IN_KNOWLEDGE,
  QUESTION_TYPE_MAP,
  lookupKnowledge,
  answerWithKnowledge,
  answerGenericQuestion,
  answerComparison,
};