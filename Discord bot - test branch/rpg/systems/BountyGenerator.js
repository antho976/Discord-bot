import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BOUNTIES_FILE = path.join(__dirname, '../../../data/bounties.json');

// Common enemies from RPG world
const ENEMY_TEMPLATES = [
  { name: 'Goblin Scout', level: 1, xp: 20, gold: 15 },
  { name: 'Wolf Pack', level: 2, xp: 30, gold: 25 },
  { name: 'Orc Warrior', level: 3, xp: 40, gold: 35 },
  { name: 'Skeleton Knight', level: 4, xp: 50, gold: 45 },
  { name: 'Dark Wraith', level: 5, xp: 75, gold: 60 },
  { name: 'Dragon Wyvern', level: 6, xp: 100, gold: 100 },
  { name: 'Lich Lord', level: 7, xp: 150, gold: 150 },
  { name: 'Demon Prince', level: 8, xp: 200, gold: 250 },
  { name: 'Ancient Dragon', level: 9, xp: 300, gold: 400 },
  { name: 'God-Tier Beast', level: 10, xp: 500, gold: 800 },
];

// Bounty difficulty tiers
const DIFFICULTY_TIERS = {
  common: { multiplier: 1, rarity: 0.5, icon: '⚔️' },
  rare: { multiplier: 2, rarity: 0.3, icon: '🗡️' },
  legendary: { multiplier: 3, rarity: 0.15, icon: '⚡' },
  mythical: { multiplier: 5, rarity: 0.05, icon: '👑' },
};

// Load bounties from file
export function loadBounties() {
  try {
    if (fs.existsSync(BOUNTIES_FILE)) {
      const data = JSON.parse(fs.readFileSync(BOUNTIES_FILE, 'utf8'));
      return data || { active: [], completed: [] };
    }
  } catch (error) {
    console.error('Error loading bounties:', error);
  }
  return { active: [], completed: [] };
}

// Save bounties to file
function saveBounties(bounties) {
  try {
    fs.writeFileSync(BOUNTIES_FILE, JSON.stringify(bounties, null, 2));
  } catch (error) {
    console.error('Error saving bounties:', error);
  }
}

// Generate random bounties based on difficulty
export function generateBounties(count = 5, playerAverageLevel = 5) {
  const bounties = [];
  const difficultyKeys = Object.keys(DIFFICULTY_TIERS);

  for (let i = 0; i < count; i++) {
    // Weighted random difficulty selection
    const rand = Math.random();
    let difficulty;
    if (rand < 0.5) difficulty = 'common';
    else if (rand < 0.8) difficulty = 'rare';
    else if (rand < 0.95) difficulty = 'legendary';
    else difficulty = 'mythical';

    const tier = DIFFICULTY_TIERS[difficulty];
    const enemy = ENEMY_TEMPLATES[Math.floor(Math.random() * ENEMY_TEMPLATES.length)];
    
    const scaledLevel = Math.max(1, Math.floor(playerAverageLevel + (Math.random() - 0.5) * 4));
    const baseReward = enemy.gold * tier.multiplier;

    const bounty = {
      id: `bounty_${Date.now()}_${i}`,
      title: `${tier.icon} ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Bounty: ${enemy.name}`,
      description: `Hunt down a dangerous ${enemy.name}. Level ${scaledLevel} enemy offering substantial rewards.`,
      target: enemy.name,
      targetLevel: scaledLevel,
      difficulty: difficulty,
      minRank: this.getMinRankForDifficulty(difficulty),
      rewards: {
        gold: Math.round(baseReward * (0.8 + Math.random() * 0.4)),
        guildXP: Math.round(baseReward * 0.5),
        xp: Math.round(baseReward * 0.3),
      },
      maxClaims: Math.max(1, Math.floor(5 / tier.multiplier)),
      claimedCount: 0,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      completed: false,
    };

    bounties.push(bounty);
  }

  return bounties;
}

// Get minimum rank for bounty difficulty
function getMinRankForDifficulty(difficulty) {
  const rankMap = {
    common: 'F',
    rare: 'D',
    legendary: 'B',
    mythical: 'S',
  };
  return rankMap[difficulty] || 'F';
}

// Add generated bounties to active list
export function addGeneratedBounties(count = 5, playerAverageLevel = 5) {
  const bounties = loadBounties();
  const newBounties = generateBounties(count, playerAverageLevel);
  
  // Remove expired bounties
  bounties.active = bounties.active.filter(b => new Date(b.expiresAt) > new Date());
  
  // Add new bounties
  bounties.active.push(...newBounties);
  
  saveBounties(bounties);
  return newBounties;
}

// Auto-spawn bounties nightly
export function startBountyGenerationSchedule() {
  const checkNightly = () => {
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setDate(nextMidnight.getDate() + 1);
    nextMidnight.setHours(0, 0, 0, 0);
    
    const timeUntilMidnight = nextMidnight.getTime() - now.getTime();
    
    setTimeout(() => {
      console.log('[BountyGenerator] Generating nightly bounties...');
      addGeneratedBounties(3, 5); // Generate 3 bounties each night
      checkNightly(); // Schedule next generation
    }, timeUntilMidnight);
  };
  
  checkNightly();
}

// Get all active bounties
export function getActiveBounties() {
  const bounties = loadBounties();
  return bounties.active.filter(b => !b.completed && new Date(b.expiresAt) > new Date());
}

// Get bounties by difficulty
export function getBountiesByDifficulty(difficulty) {
  const bounties = loadBounties();
  return bounties.active.filter(b => b.difficulty === difficulty && !b.completed);
}

// Claim bounty (same player can claim if claims < maxClaims)
export function claimBounty(bountyId, playerId) {
  const bounties = loadBounties();
  const bounty = bounties.active.find(b => b.id === bountyId);
  
  if (!bounty) return { success: false, message: 'Bounty not found' };
  if (bounty.claimedCount >= bounty.maxClaims) {
    return { success: false, message: 'Bounty claim limit reached' };
  }
  if (new Date(bounty.expiresAt) < new Date()) {
    return { success: false, message: 'Bounty has expired' };
  }

  bounty.claimedCount += 1;
  saveBounties(bounties);
  
  return { success: true, bounty: bounty, message: 'Bounty claimed successfully' };
}

// Complete bounty
export function completeBounty(bountyId) {
  const bounties = loadBounties();
  const bounty = bounties.active.find(b => b.id === bountyId);
  
  if (!bounty) return { success: false, message: 'Bounty not found' };

  bounty.completed = true;
  bounty.completedAt = new Date().toISOString();
  bounties.completed.push(bounty);
  bounties.active = bounties.active.filter(b => b.id !== bountyId);
  
  saveBounties(bounties);
  return { success: true, message: 'Bounty marked as complete' };
}

// Get bounty completion stats
export function getBountyStats() {
  const bounties = loadBounties();
  return {
    totalActive: bounties.active.length,
    totalClaimed: bounties.active.reduce((sum, b) => sum + b.claimedCount, 0),
    totalCompleted: bounties.completed.length,
    byDifficulty: {
      common: bounties.active.filter(b => b.difficulty === 'common').length,
      rare: bounties.active.filter(b => b.difficulty === 'rare').length,
      legendary: bounties.active.filter(b => b.difficulty === 'legendary').length,
      mythical: bounties.active.filter(b => b.difficulty === 'mythical').length,
    },
  };
}

// Manually delete expired bounties
export function cleanupExpiredBounties() {
  const bounties = loadBounties();
  const before = bounties.active.length;
  
  bounties.active = bounties.active.filter(b => new Date(b.expiresAt) > new Date());
  
  saveBounties(bounties);
  const removed = before - bounties.active.length;
  
  return { removed: removed, remaining: bounties.active.length };
}
