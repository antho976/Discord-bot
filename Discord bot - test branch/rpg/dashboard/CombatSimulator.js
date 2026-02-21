/**
 * Combat Simulator - Simulate AI combat turn-by-turn
 * Useful for testing AI behavior and balance
 */

import { evaluateSkillUsage, getSkill } from '../data/classes.js';

export class CombatSimulator {
  constructor(player, enemy, worldState = null) {
    this.player = { ...player };
    this.enemy = { ...enemy };
    this.worldState = worldState;
    this.turns = [];
    this.log = [];
  }

  /**
   * Run full combat simulation
   */
  simulate(maxRounds = 20) {
    this.log = [];
    this.turns = [];

    for (let round = 0; round < maxRounds; round++) {
      if (this.player.hp <= 0 || this.enemy.hp <= 0) break;

      this.simulateRound(round + 1);
    }

    return {
      won: this.enemy.hp <= 0,
      rounds: this.turns.length,
      log: this.log,
      finalPlayer: this.player,
      finalEnemy: this.enemy,
    };
  }

  /**
   * Simulate a single round
   */
  simulateRound(roundNum) {
    const turnData = {
      round: roundNum,
      playerAction: null,
      enemyAction: null,
    };

    // Player turn
    const playerAction = this.evaluatePlayerAction();
    this.executeAction('player', playerAction);
    turnData.playerAction = {
      type: playerAction.type,
      skillName: playerAction.skill?.name,
      damage: playerAction.damage || 0,
    };

    if (this.enemy.hp <= 0) {
      this.turns.push(turnData);
      return;
    }

    // Enemy turn
    const enemyAction = this.evaluateEnemyAction();
    this.executeAction('enemy', enemyAction);
    turnData.enemyAction = {
      type: enemyAction.type,
      skillName: enemyAction.skill?.name,
      damage: enemyAction.damage || 0,
    };

    this.turns.push(turnData);
  }

  /**
   * Evaluate best player action
   */
  evaluatePlayerAction() {
    let bestSkill = null;
    let bestScore = -1;

    for (const skillId of this.player.skills) {
      const skill = getSkill(skillId);
      if (!skill) continue;
      if (this.player.mana < skill.manaCost) continue;

      const score = evaluateSkillUsage(
        skill,
        {
          playerHp: this.player.hp,
          playerMaxHp: this.player.maxHp,
          enemyHp: this.enemy.hp,
          enemyMaxHp: this.enemy.maxHp,
          enemyStrength: this.enemy.strength,
          playerDefense: this.player.defense,
        },
        this.player.aiTendencies,
        this.worldState
      );

      if (score > bestScore) {
        bestScore = score;
        bestSkill = skill;
      }
    }

    if (bestSkill) {
      return { type: 'skill', skill: bestSkill };
    }

    return { type: 'attack' };
  }

  /**
   * Evaluate enemy action (basic AI)
   */
  evaluateEnemyAction() {
    // Simple: attack with variance
    return { type: 'attack' };
  }

  /**
   * Execute an action in simulation
   */
  executeAction(actor, action) {
    const isPlayer = actor === 'player';
    const attacker = isPlayer ? this.player : this.enemy;
    const defender = isPlayer ? this.enemy : this.player;

    if (action.type === 'attack') {
      const baseDamage = isPlayer
        ? attacker.strength * 1.1
        : attacker.strength * 1.2;

      let damage = Math.max(1, Math.floor(baseDamage - defender.defense * 0.3));
      defender.hp -= damage;

      action.damage = damage;
      this.log.push(`${attacker.username || attacker.name} attacks for ${damage} damage!`);
    } else if (action.type === 'skill') {
      const skill = action.skill;
      attacker.mana -= skill.manaCost;

      const stats = {
        strength: attacker.strength,
        intelligence: attacker.intelligence,
      };

      let damage = Math.max(0, Math.floor(skill.damage(stats) - defender.defense * 0.3));
      defender.hp -= damage;

      action.damage = damage;
      this.log.push(`${attacker.username || attacker.name} uses ${skill.name} for ${damage} damage!`);
    }
  }

  /**
   * Get summary of simulation
   */
  getSummary() {
    return {
      playerWon: this.enemy.hp <= 0,
      roundsLasted: this.turns.length,
      playerFinalHp: Math.max(0, this.player.hp),
      enemyFinalHp: Math.max(0, this.enemy.hp),
      totalDamageToPlayer: this.player.maxHp - Math.max(0, this.player.hp),
      totalDamageToEnemy: this.enemy.maxHp - Math.max(0, this.enemy.hp),
      log: this.log.slice(-10),
    };
  }
}

/**
 * Batch simulate multiple combats
 */
export function simulateMultipleCombats(player, enemies, iterations = 5) {
  let wins = 0;
  const roundsData = [];

  for (let i = 0; i < iterations; i++) {
    for (const enemy of enemies) {
      const sim = new CombatSimulator(player, enemy);
      const result = sim.simulate();

      if (result.won) wins++;
      roundsData.push(result.rounds);
    }
  }

  const avgRounds = roundsData.reduce((a, b) => a + b, 0) / roundsData.length;
  const winRate = (wins / (iterations * enemies.length)) * 100;

  return {
    winRate,
    avgRounds,
    totalSimulations: iterations * enemies.length,
  };
}
