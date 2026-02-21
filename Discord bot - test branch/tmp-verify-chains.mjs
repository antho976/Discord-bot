import { getQuestCategoriesByWorld } from './rpg/data/quests.js';

const { main, side, daily } = getQuestCategoriesByWorld(2);
const allQuests = [...(main || []), ...(side || []), ...(daily || [])];

console.log(`Total quests loaded for world 2: ${allQuests.length}`);

// Check chain quest q_asgard_side_16
const chainIds = ['q_asgard_side_16', 'q_asgard_side_16_step1', 'q_asgard_side_16_step2', 
                  'q_asgard_side_16_step3', 'q_asgard_side_16_choice', 'q_asgard_side_16a', 'q_asgard_side_16b'];

for (const id of chainIds) {
  const q = allQuests.find(q => q.id === id);
  if (q) {
    console.log(`\n${id}:`);
    console.log(`  name: ${q.name}`);
    console.log(`  nextQuestId: ${q.nextQuestId || 'NONE'}`);
    console.log(`  branches: ${q.branches ? JSON.stringify(q.branches.map(b => ({ choice: b.choice, nextQuestId: b.nextQuestId }))) : 'NONE'}`);
  } else {
    console.log(`\n${id}: ❌ NOT FOUND`);
  }
}
