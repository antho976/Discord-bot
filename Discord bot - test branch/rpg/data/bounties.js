/**
 * Bounty System
 * Players can create and accept bounties for rewards
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BOUNTIES_FILE = path.resolve(__dirname, '../../data/bounties.json');

let cachedBounties = null;

/**
 * Load bounties from file
 */
function loadBounties() {
  if (cachedBounties) return cachedBounties;
  
  try {
    if (fs.existsSync(BOUNTIES_FILE)) {
      const data = fs.readFileSync(BOUNTIES_FILE, 'utf8');
      cachedBounties = JSON.parse(data);
      return cachedBounties;
    }
  } catch (err) {
    console.error('[Bounties] Failed to load:', err);
  }
  
  cachedBounties = { player: [], npc: [], limited: [] };
  saveBounties(cachedBounties);
  return cachedBounties;
}

/**
 * Save bounties to file
 */
function saveBounties(bounties) {
  try {
    const dir = path.dirname(BOUNTIES_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(BOUNTIES_FILE, JSON.stringify(bounties, null, 2));
    cachedBounties = bounties;
  } catch (err) {
    console.error('[Bounties] Failed to save:', err);
  }
}

/**
 * Create a player bounty
 */
export function createPlayerBounty(creatorId, data) {
  const bounties = loadBounties();
  const bounty = {
    id: `bounty_${Date.now()}`,
    type: 'player',
    creatorId,
    creatorName: data.creatorName,
    title: data.title,
    description: data.description,
    target: data.target, // What to kill/collect
    targetAmount: data.targetAmount,
    rewards: data.rewards, // What bounty creator offers
    creatorRewards: data.creatorRewards, // What bounty creator gets back (optional)
    claimed: false,
    claimedBy: null,
    completed: false,
    createdAt: Date.now(),
    expiresAt: data.expiresAt || (Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days default
  };
  
  bounties.player.push(bounty);
  saveBounties(bounties);
  return bounty;
}

/**
 * Create an NPC bounty
 */
export function createNPCBounty(data) {
  const bounties = loadBounties();
  const bounty = {
    id: `npc_bounty_${Date.now()}`,
    type: 'npc',
    title: data.title,
    description: data.description,
    target: data.target,
    targetAmount: data.targetAmount,
    rewards: data.rewards,
    maxClaims: data.maxClaims || null, // Null = unlimited
    claimed: 0,
    createdAt: Date.now(),
    worldId: data.worldId || null,
    minRank: data.minRank || 'F',
  };
  
  bounties.npc.push(bounty);
  saveBounties(bounties);
  return bounty;
}

/**
 * Get all available bounties for a player
 */
export function getAvailableBounties(playerRank, worldId) {
  const bounties = loadBounties();
  const now = Date.now();
  
  // Filter player bounties (not expired, not claimed)
  const playerBounties = bounties.player.filter(b => 
    !b.claimed && b.expiresAt > now
  );
  
  // Filter NPC bounties (not full, rank requirement met)
  const npcBounties = bounties.npc.filter(b => 
    (b.maxClaims === null || b.claimed < b.maxClaims) &&
    (!b.worldId || b.worldId === worldId) &&
    isRankSufficient(playerRank, b.minRank)
  );
  
  return {
    player: playerBounties,
    npc: npcBounties,
  };
}

/**
 * Claim a bounty
 */
export function claimBounty(bountyId, playerId) {
  const bounties = loadBounties();
  
  // Check player bounties
  let bounty = bounties.player.find(b => b.id === bountyId);
  if (bounty) {
    if (bounty.claimed) return { success: false, error: 'Bounty already claimed' };
    bounty.claimed = true;
    bounty.claimedBy = playerId;
    saveBounties(bounties);
    return { success: true, bounty };
  }
  
  // Check NPC bounties
  bounty = bounties.npc.find(b => b.id === bountyId);
  if (bounty) {
    if (bounty.maxClaims !== null && bounty.claimed >= bounty.maxClaims) {
      return { success: false, error: 'Bounty full' };
    }
    bounty.claimed += 1;
    saveBounties(bounties);
    return { success: true, bounty };
  }
  
  return { success: false, error: 'Bounty not found' };
}

/**
 * Complete a bounty
 */
export function completeBounty(bountyId, playerId) {
  const bounties = loadBounties();
  
  const bounty = bounties.player.find(b => b.id === bountyId);
  if (bounty && bounty.claimedBy === playerId) {
    bounty.completed = true;
    saveBounties(bounties);
    return { success: true, bounty };
  }
  
  return { success: false, error: 'Bounty not found or not claimed by player' };
}

/**
 * Get bounty by ID
 */
export function getBountyById(bountyId) {
  const bounties = loadBounties();
  
  let bounty = bounties.player.find(b => b.id === bountyId);
  if (bounty) return bounty;
  
  bounty = bounties.npc.find(b => b.id === bountyId);
  return bounty || null;
}

/**
 * Remove expired bounties
 */
export function cleanExpiredBounties() {
  const bounties = loadBounties();
  const now = Date.now();
  
  bounties.player = bounties.player.filter(b => b.expiresAt > now || b.completed);
  saveBounties(bounties);
}

/**
 * Check if player rank is sufficient
 */
function isRankSufficient(playerRank, requiredRank) {
  const ranks = ['F', 'E', 'D', 'C', 'B', 'A', 'S'];
  const playerIndex = ranks.indexOf(playerRank);
  const requiredIndex = ranks.indexOf(requiredRank);
  return playerIndex >= requiredIndex;
}

/**
 * Refresh cache
 */
export function refreshBountyCache() {
  cachedBounties = null;
  return loadBounties();
}
