/**
 * Balance settings loader
 */

import fs from 'fs';
import path from 'path';

const BALANCE_FILE = path.resolve(process.cwd(), 'data', 'balance.json');

const DEFAULT_BALANCE = {
  levelXpBase: 120,
  levelXpGrowth: 1.15,
  adventureXpMultiplier: 0.7,
  questMainXpMultiplier: 0.5,
  questOtherXpMultiplier: 0.8,
  combatXpMultiplier: 0.8,
  gatheringXpMultiplier: 0.35,
  craftingCostMultiplier: 2,
  craftingCostMin: 1,
};

export function loadBalanceData() {
  if (!fs.existsSync(BALANCE_FILE)) return DEFAULT_BALANCE;
  try {
    const raw = fs.readFileSync(BALANCE_FILE, 'utf8');
    const data = JSON.parse(raw);
    return { ...DEFAULT_BALANCE, ...data };
  } catch {
    return DEFAULT_BALANCE;
  }
}

export function saveBalanceData(data) {
  fs.writeFileSync(BALANCE_FILE, JSON.stringify(data, null, 2));
}

export default {
  loadBalanceData,
  saveBalanceData,
};
