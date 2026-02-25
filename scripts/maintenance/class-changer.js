/**
 * Class Change Utility - Safe class respec tool
 * Usage: node class-changer.js <userId> <newClass>
 * Classes: warrior, mage, rogue, paladin
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CLASSES } from './rpg/data/classes.js';
import { TALENTS, WARRIOR_TALENTS, MAGE_TALENTS, ROGUE_TALENTS, PALADIN_TALENTS } from './rpg/data/talents.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PLAYERS_FILE = path.join(__dirname, 'data', 'players.json');

function loadPlayers() {
  const data = fs.readFileSync(PLAYERS_FILE, 'utf8');
  return JSON.parse(data);
}

function savePlayers(players) {
  fs.writeFileSync(PLAYERS_FILE, JSON.stringify(players, null, 2));
  console.log('✅ Players data saved');
}

function getSkillsForClass(classId) {
  const classData = CLASSES[classId];
  if (!classData) return [];
  return classData.skillTree.map(entry => entry.skillId);
}

function getTalentsForClass(classId) {
  switch(classId) {
    case 'warrior': return WARRIOR_TALENTS;
    case 'mage': return MAGE_TALENTS;
    case 'rogue': return ROGUE_TALENTS;
    case 'paladin': return PALADIN_TALENTS;
    default: return [];
  }
}

function changePlayerClass(player, newClassId) {
  const oldClass = player.class || player.internalClass;
  const newClassData = CLASSES[newClassId];
  
  if (!newClassData) {
    console.error(`❌ Invalid class: ${newClassId}`);
    return null;
  }

  console.log(`\n📋 Class Change Report for ${player.username}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Old Class: ${oldClass} → New Class: ${newClassId}`);
  
  const oldSkills = player.skills || [];
  const newClassSkills = getSkillsForClass(newClassId);
  const startingSkills = newClassData.startingSkills;
  
  // Calculate which skills to keep and remove
  const skillsToKeep = oldSkills.filter(skillId => newClassSkills.includes(skillId));
  const skillsToRemove = oldSkills.filter(skillId => !newClassSkills.includes(skillId));
  
  // Calculate skill points to refund
  let pointsRefunded = 0;
  const oldClassData = CLASSES[oldClass];
  if (oldClassData && skillsToRemove.length > 0) {
    skillsToRemove.forEach(skillId => {
      const entry = oldClassData.skillTree.find(e => e.skillId === skillId);
      if (entry && entry.pointCost > 0) {
        pointsRefunded += entry.pointCost;
      }
    });
  }
  
  console.log(`\n🎯 Skills:`);
  console.log(`  Kept: ${skillsToKeep.length} skills`);
  if (skillsToKeep.length > 0) {
    console.log(`    - ${skillsToKeep.join(', ')}`);
  }
  console.log(`  Removed: ${skillsToRemove.length} skills`);
  if (skillsToRemove.length > 0) {
    console.log(`    - ${skillsToRemove.join(', ')}`);
  }
  console.log(`  Added: ${startingSkills.length} starting skills`);
  console.log(`    - ${startingSkills.join(', ')}`);
  
  // Update skills
  player.skills = [...new Set([...startingSkills, ...skillsToKeep])];
  
  // Clean up skill levels for removed skills
  if (player.skillLevels) {
    skillsToRemove.forEach(skillId => {
      delete player.skillLevels[skillId];
    });
    // Ensure starting skills have at least level 1
    startingSkills.forEach(skillId => {
      if (!player.skillLevels[skillId]) {
        player.skillLevels[skillId] = 1;
      }
    });
  }
  
  // Refund skill points
  player.skillPoints = (player.skillPoints || 0) + pointsRefunded;
  console.log(`\n💎 Skill Points: +${pointsRefunded} refunded (Total: ${player.skillPoints})`);
  
  // Handle talents
  const classTalents = getTalentsForClass(newClassId);
  const classTalentIds = classTalents.map(t => t.id);
  let talentsRemoved = 0;
  let talentPointsRefunded = 0;
  
  if (player.talents) {
    Object.keys(player.talents).forEach(talentId => {
      const talent = [...TALENTS, ...classTalents].find(t => t.id === talentId);
      if (talent && talent.classRestriction && talent.classRestriction !== newClassId) {
        const level = player.talents[talentId];
        talentPointsRefunded += level;
        delete player.talents[talentId];
        talentsRemoved++;
      }
    });
  }
  
  if (talentsRemoved > 0) {
    player.talentPoints = (player.talentPoints || 0) + talentPointsRefunded;
    console.log(`\n✨ Talents: ${talentsRemoved} class-specific talents removed`);
    console.log(`   +${talentPointsRefunded} talent points refunded (Total: ${player.talentPoints})`);
  } else {
    console.log(`\n✨ Talents: No class-specific talents to remove`);
  }
  
  // Update class fields
  player.class = newClassId;
  player.internalClass = newClassId;
  
  // Clear stats cache so bonuses recalculate
  if (player._statsCache) {
    delete player._statsCache;
  }
  
  console.log(`\n⚠️  Important Notes:`);
  console.log(`  • Class stat bonuses will change on next login`);
  console.log(`  • Equipment with class restrictions may be unequippable`);
  console.log(`  • Player should respec their talents and skills`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  
  return {
    skillsRemoved: skillsToRemove.length,
    skillsKept: skillsToKeep.length,
    skillsAdded: startingSkills.length,
    pointsRefunded,
    talentsRemoved,
    talentPointsRefunded,
  };
}

// Main execution
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║              RPG Class Changer Utility                      ║
╚════════════════════════════════════════════════════════════╝

Usage: node class-changer.js <userId> <newClass>

Available Classes:
  • warrior  - Strong melee fighter (Slash, Shield Bash)
  • mage     - Powerful spellcaster (Ice Spike, Lightning Bolt)
  • rogue    - Fast assassin (Backstab, Evade)
  • paladin  - Holy warrior with healing (Holy Strike, Heal)

Example:
  node class-changer.js 102149810961788928 mage

What happens during class change:
  ✅ Keeps skills that exist in new class
  ✅ Removes skills exclusive to old class
  ✅ Refunds skill points for removed skills
  ✅ Gives new class starting skills
  ✅ Removes incompatible class-specific talents
  ✅ Refunds talent points for removed talents
  ✅ Updates class stat bonuses

⚠️  Warning: This operation modifies player data immediately!
  `);
  process.exit(0);
}

const [userId, newClassId] = args;

// Validate class
if (!['warrior', 'mage', 'rogue', 'paladin'].includes(newClassId)) {
  console.error(`❌ Invalid class: ${newClassId}`);
  console.log(`Valid classes: warrior, mage, rogue, paladin`);
  process.exit(1);
}

// Load players
const players = loadPlayers();
const player = players.find(p => p.userId === userId);

if (!player) {
  console.error(`❌ Player not found: ${userId}`);
  process.exit(1);
}

// Confirm change
console.log(`\n🎭 About to change class for:`);
console.log(`   Username: ${player.username}`);
console.log(`   Current Level: ${player.level}`);
console.log(`   Current Class: ${player.class || player.internalClass}`);
console.log(`   New Class: ${newClassId}`);
console.log(`\n⚠️  This will modify player data immediately!`);

// Change class
const result = changePlayerClass(player, newClassId);

if (result) {
  // Save changes
  savePlayers(players);
  console.log(`✅ Class change complete!`);
  console.log(`\nSummary:`);
  console.log(`  Skills: -${result.skillsRemoved}, +${result.skillsAdded}, kept ${result.skillsKept}`);
  console.log(`  Skill Points: +${result.pointsRefunded}`);
  if (result.talentsRemoved > 0) {
    console.log(`  Talents: -${result.talentsRemoved}`);
    console.log(`  Talent Points: +${result.talentPointsRefunded}`);
  }
} else {
  console.error(`❌ Class change failed`);
  process.exit(1);
}
