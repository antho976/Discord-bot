/**
 * Fix retroactive skill points for all players
 * Run this script once to give skill points to players who leveled up before the skill point system
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PLAYERS_FILE = path.join(__dirname, 'data', 'players.json');

function loadPlayers() {
  try {
    if (!fs.existsSync(PLAYERS_FILE)) {
      console.log('No players.json file found.');
      return [];
    }
    const data = fs.readFileSync(PLAYERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading players:', error);
    return [];
  }
}

function savePlayers(players) {
  try {
    fs.writeFileSync(PLAYERS_FILE, JSON.stringify(players, null, 2));
    console.log('✅ Players saved successfully!');
  } catch (error) {
    console.error('Error saving players:', error);
  }
}

function fixSkillPoints() {
  console.log('🔧 Fixing retroactive skill points...\n');
  
  const players = loadPlayers();
  
  if (players.length === 0) {
    console.log('No players to fix.');
    return;
  }

  let fixedCount = 0;
  let totalPointsAdded = 0;

  for (const player of players) {
    // Calculate expected skill points based on level
    // Players get 1 skill point every 2 levels
    const expectedSkillPoints = Math.floor(player.level / 2);
    const currentSkillPoints = player.skillPoints || 0;
    
    // Check if player is missing skill points
    if (currentSkillPoints < expectedSkillPoints) {
      const pointsToAdd = expectedSkillPoints - currentSkillPoints;
      player.skillPoints = expectedSkillPoints;
      
      console.log(`✨ ${player.username || player.userId}: Level ${player.level}`);
      console.log(`   Had: ${currentSkillPoints} points, Should have: ${expectedSkillPoints} points`);
      console.log(`   Added: ${pointsToAdd} skill points\n`);
      
      fixedCount++;
      totalPointsAdded += pointsToAdd;
    }
  }

  if (fixedCount > 0) {
    savePlayers(players);
    console.log(`\n✅ Fixed ${fixedCount} players!`);
    console.log(`📊 Total skill points distributed: ${totalPointsAdded}`);
  } else {
    console.log('✅ All players already have correct skill points!');
  }
}

// Run the fix
fixSkillPoints();
