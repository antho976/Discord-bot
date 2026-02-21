/**
 * Tutorial Content Loader
 */

import fs from 'fs';
import path from 'path';

const TUTORIAL_FILE = path.resolve(process.cwd(), 'data', 'tutorial.json');

const DEFAULT_TUTORIAL = {
  title: '📖 Your Journey Begins',
  intro: 'Welcome to the RPG! This guide explains the main systems so you can progress efficiently.',
  sections: [
    { title: '🧭 Core Loop', body: 'Run Adventures for XP + materials → craft gear → fight stronger content. Check your stats often to see power gains.' },
    { title: '🔨 Crafting & Professions', body: 'Use Crafting to turn materials into gear. Each recipe has a level requirement and material costs. Professions unlock recipes as you level them.' },
    { title: '⛏️ Gathering', body: 'Gathering skills (Mining/Chopping/Gathering) level over time and grant passive stat boosts. Higher levels unlock rarer materials.' },
    { title: '⚔️ Combat & Dungeons', body: 'Dungeons scale by level. Enter them when you meet the min/max level. Use better gear and stats to survive.' },
    { title: '📜 Quests & Progression', body: 'Quests drive story progression and unlock new content. Follow main quests to access new worlds, bosses, and systems.' },
    { title: '🧰 Tips', body: 'Upgrade gear regularly, keep an eye on material requirements, and use the dashboard to tune balance and content.' },
  ],
};

export function loadTutorialData() {
  if (!fs.existsSync(TUTORIAL_FILE)) {
    return DEFAULT_TUTORIAL;
  }

  try {
    const raw = fs.readFileSync(TUTORIAL_FILE, 'utf8');
    const data = JSON.parse(raw);
    return {
      title: data.title || DEFAULT_TUTORIAL.title,
      intro: data.intro || DEFAULT_TUTORIAL.intro,
      sections: Array.isArray(data.sections) && data.sections.length > 0 ? data.sections : DEFAULT_TUTORIAL.sections,
    };
  } catch {
    return DEFAULT_TUTORIAL;
  }
}

export function saveTutorialData(data) {
  fs.writeFileSync(TUTORIAL_FILE, JSON.stringify(data, null, 2));
}

export default {
  loadTutorialData,
  saveTutorialData,
};
