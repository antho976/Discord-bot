/**
 * Combat System - Turn-based combat logic with skills and effects
 */

import Enemy from '../models/Enemy.js';
import { getSkill, evaluateSkillUsage } from '../data/classes.js';
import { getConfig } from '../data/config.js';
import { generateDailyWorldState } from '../data/world-state.js';
import { loadBalanceData } from '../data/balance.js';
import { getBossTemplate, getAbility, getBossPhaseAbilities, getBossPhaseInfo } from '../data/boss-abilities.js';
import { checkCombo, recordSkillUsage, resetComboHistory, applyComboBonus } from '../data/skill-combos.js';
import { getCombatStyle, applyStyleModifiers, applyStyleStatMods } from '../data/combat-styles.js';
import { getEnvironment, getRandomEnvironment, processEnvironmentEffects, getEnvironmentDescription } from '../data/environmental-effects.js';
import { createEnemyGroupInstances, getEnemyGroup } from '../data/multi-enemy-encounters.js';

const TYPE_CHART = {
  fire: { grass: 2, ice: 2, water: 0.5, fire: 0.5 },
  water: { fire: 2, electric: 0.5, grass: 0.5, water: 0.5 },
  grass: { water: 2, fire: 0.5, ice: 0.5, grass: 0.5 },
  electric: { water: 2, grass: 0.5, electric: 0.5 },
  ice: { grass: 2, fire: 0.5, ice: 0.5 },
  holy: { shadow: 2, holy: 0.5 },
  shadow: { holy: 2, shadow: 0.5 },
  poison: { physical: 1.2, poison: 0.5 },
  arcane: { physical: 1.1, arcane: 0.5 },
  physical: { arcane: 1.1, physical: 0.9 },
};

const STANCES = {
  balanced: { damageDealt: 1, damageTaken: 1, accuracyBonus: 0, critBonus: 0, dodgeChance: 0 },
  aggressive: { damageDealt: 1.15, damageTaken: 1.1, accuracyBonus: 0, critBonus: 0, dodgeChance: 0 },
  defensive: { damageDealt: 0.9, damageTaken: 0.8, accuracyBonus: 0, critBonus: 0, dodgeChance: 0 },
  focused: { damageDealt: 1, damageTaken: 1, accuracyBonus: 0.1, critBonus: 0.1, dodgeChance: 0 },
  evasive: { damageDealt: 1, damageTaken: 1, accuracyBonus: -0.1, critBonus: 0, dodgeChance: 0.1 },
};

const GUARD_MAX = 100;

function normalizeTypes(types) {
  if (!types) return ['normal'];
  if (Array.isArray(types)) return types.length ? types : ['normal'];
  return [types];
}

function getPlayerTypes(player) {
  const classId = player.class || player.internalClass;
  if (classId === 'mage') return ['arcane'];
  if (classId === 'rogue') return ['shadow'];
  if (classId === 'paladin') return ['holy'];
  return ['physical'];
}

function getEnemyTypes(enemy) {
  return normalizeTypes(enemy.types || enemy.element || 'normal');
}

function getEffectivenessMultiplier(attackType, defenderTypes) {
  const atkType = attackType || 'normal';
  let multiplier = 1;
  for (const defType of normalizeTypes(defenderTypes)) {
    const chart = TYPE_CHART[atkType] || {};
    const mod = chart[defType] ?? 1;
    multiplier *= mod;
  }
  return multiplier;
}

function getEffectivenessText(multiplier) {
  if (multiplier >= 1.5) return "It's super effective!";
  if (multiplier <= 0.75) return "It's not very effective...";
  return null;
}

function getStanceModifiers(stance) {
  return STANCES[stance] || STANCES.balanced;
}

export default class CombatSystem {
  constructor() {
    this.activeCombats = new Map(); // userId -> combat state
    // Auto-cleanup stale combats every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanupStaleCombats(), 5 * 60 * 1000);
  }

  /**
   * Start a new combat encounter
   */
  startCombat(player, enemyName, enemyLevel, options = {}) {
    const enemy = new Enemy(enemyName, enemyLevel);
    const combatId = `${player.userId}-${Date.now()}`;
    const worldState = generateDailyWorldState();

    // Apply dungeon difficulty boost (2.5x HP, 1.5x stats)
    if (options.meta?.type === 'dungeon') {
      enemy.maxHp = Math.floor(enemy.maxHp * 2.5);
      enemy.hp = enemy.maxHp;
      enemy.strength = Math.floor(enemy.strength * 1.5);
      enemy.defense = Math.floor(enemy.defense * 1.5);
      enemy.agility = Math.floor(enemy.agility * 1.3);
      enemy.intelligence = Math.floor(enemy.intelligence * 1.3);
    }

    if (!enemy.types) enemy.types = ['normal'];

    if (!player.party || !Array.isArray(player.party.members) || player.party.members.length === 0) {
      player.party = {
        maxSize: 4,
        activeIndex: 0,
        members: [
          {
            userId: player.userId,
            name: player.username,
            classId: player.class || player.internalClass,
            role: 'leader',
          },
        ],
      };
    }

    const combatState = {
      combatId,
      player,
      enemy,
      round: 1,
      log: [`Combat started! ${player.username} vs ${enemy.name}!`],
      playerEffects: [], // Status effects on player
      enemyEffects: [],  // Status effects on enemy
      playerStance: 'balanced',
      playerGuard: 0,
      enemyGuard: 0,
      guardMax: GUARD_MAX,
      enemyIntent: null,
      worldState,
      party: {
        maxSize: player.party.maxSize || 4,
        activeIndex: player.party.activeIndex || 0,
        members: [...player.party.members],
      },
      meta: options.meta || null,
      startTime: Date.now(),
      lastActionTime: Date.now(),
    };

    this.primeEnemyIntent(combatState);

    this.activeCombats.set(player.userId, combatState);
    player.isInCombat = true;
    player.currentEnemy = enemy;

    return combatState;
  }

  /**
   * Start a combat with custom enemy stats (for quests/bosses)
   */
  startCombatWithCustomEnemy(player, enemyName, enemyLevel, hp, stats, skills, meta = {}) {
    const enemy = new Enemy(enemyName, enemyLevel);
    
    // Override with custom stats
    enemy.maxHp = hp;
    enemy.hp = hp;
    enemy.strength = stats.strength || enemy.strength;
    enemy.defense = stats.defense || enemy.defense;
    enemy.intelligence = stats.intelligence || enemy.intelligence;
    enemy.agility = stats.agility || enemy.agility;
    enemy.skills = skills || enemy.skills;
    enemy.types = stats.types || enemy.types || ['normal'];

    const combatId = `${player.userId}-${Date.now()}`;
    const worldState = generateDailyWorldState();

    const combatState = {
      combatId,
      player,
      enemy,
      round: 1,
      log: [`Combat started! ${player.username} vs ${enemy.name}!`],
      playerEffects: [],
      enemyEffects: [],
      playerStance: 'balanced',
      playerGuard: 0,
      enemyGuard: 0,
      guardMax: GUARD_MAX,
      enemyIntent: null,
      worldState,
      party: {
        maxSize: player.party?.maxSize || 4,
        activeIndex: player.party?.activeIndex || 0,
        members: [...(player.party?.members || [])],
      },
      meta,
    };

    this.primeEnemyIntent(combatState);

    // Apply pre-combat potion heal
    if (player.potionBuffs?.nextCombatHeal) {
      const healAmount = player.potionBuffs.nextCombatHeal;
      player.hp = Math.min(player.hp + healAmount, player.maxHp);
      combatState.log.push(`💚 Potion healed ${healAmount} HP before combat!`);
      delete player.potionBuffs.nextCombatHeal;
    }

    this.activeCombats.set(player.userId, combatState);
    player.isInCombat = true;
    player.currentEnemy = enemy;

    return combatState;
  }

  /**
   * Start a boss combat encounter
   */
  startBossCombat(player, bossName, bossId, bossLevel, environment = null) {
    const enemy = new Enemy(bossName, bossLevel, true);
    const bossTemplate = getBossTemplate(bossId);
    
    if (bossTemplate) {
      enemy.bossTemplate = bossTemplate;
      enemy.element = bossTemplate.element;
      enemy.weakness = bossTemplate.weakness;
      enemy.resistance = bossTemplate.resistance;
    }

    const combatId = `${player.userId}-boss-${Date.now()}`;
    const worldState = generateDailyWorldState();
    const env = environment || getRandomEnvironment(true);

    const combatState = {
      combatId,
      player,
      enemy,
      enemies: [enemy], // For multi-enemy support
      round: 1,
      log: [`🔥 Boss Battle Started! ${player.username} vs ${enemy.name}!`],
      playerEffects: [],
      enemyEffects: [],
      playerStance: 'balanced',
      combatStyle: null,
      playerGuard: 0,
      enemyGuard: 0,
      guardMax: GUARD_MAX,
      enemyIntent: null,
      worldState,
      environment: env,
      environmentEffectsLog: [],
      party: {
        maxSize: player.party?.maxSize || 4,
        activeIndex: player.party?.activeIndex || 0,
        members: [...(player.party?.members || [])],
      },
      meta: { type: 'boss', bossId, environment: env.id },
      comboChain: 0,
      phaseTransition: false,
    };

    this.primeEnemyIntent(combatState, bossTemplate);
    this.activeCombats.set(player.userId, combatState);
    player.isInCombat = true;
    player.currentEnemy = enemy;

    return combatState;
  }

  /**
   * Start a multi-enemy group encounter
   */
  startMultiEnemyCombat(player, enemyGroupId, scaleFactor = 1) {
    const groupDef = getEnemyGroup(enemyGroupId);
    if (!groupDef) return null;

    const enemies = createEnemyGroupInstances(groupDef, scaleFactor);
    const combatId = `${player.userId}-multi-${Date.now()}`;
    const worldState = generateDailyWorldState();
    const env = getRandomEnvironment(true);

    const combatState = {
      combatId,
      player,
      enemy: enemies[0], // Primary target
      enemies: enemies, // All enemies in group
      currentEnemyIndex: 0,
      round: 1,
      log: [`⚔️ Group Combat Started! ${player.username} vs ${groupDef.name}!`],
      playerEffects: [],
      enemyEffects: [],
      playerStance: 'balanced',
      combatStyle: null,
      playerGuard: 0,
      enemyGuard: 0,
      guardMax: GUARD_MAX,
      enemyIntent: null,
      worldState,
      environment: env,
      environmentEffectsLog: [],
      party: {
        maxSize: player.party?.maxSize || 4,
        activeIndex: player.party?.activeIndex || 0,
        members: [...(player.party?.members || [])],
      },
      meta: { type: 'multi', groupId: enemyGroupId, environment: env.id, groupName: groupDef.name },
      comboChain: 0,
    };

    this.primeEnemyIntent(combatState);
    this.activeCombats.set(player.userId, combatState);
    player.isInCombat = true;
    player.currentEnemy = enemies[0];

    return combatState;
  }

  /**
   * Switch to next alive enemy in multi-enemy fight
   */
  switchToNextEnemy(combatState) {
    if (!combatState.enemies || combatState.enemies.length <= 1) return false;

    let nextIndex = combatState.currentEnemyIndex + 1;
    while (nextIndex < combatState.enemies.length) {
      if (combatState.enemies[nextIndex].hp > 0) {
        combatState.currentEnemyIndex = nextIndex;
        combatState.enemy = combatState.enemies[nextIndex];
        combatState.enemyGuard = 0;
        combatState.enemyEffects = [];
        combatState.log.push(`Next enemy: ${combatState.enemy.name}!`);
        return true;
      }
      nextIndex++;
    }

    return false;
  }

  /**
   * Execute a full AI-driven combat round
   */
  executeRound(userId) {
    const combatState = this.activeCombats.get(userId);
    if (!combatState) {
      return { error: 'No active combat' };
    }

    // Update last action timestamp
    combatState.lastActionTime = Date.now();

    const { player, enemy, worldState } = combatState;

    // Process environmental effects
    if (combatState.environment) {
      const envEffects = processEnvironmentEffects(combatState.environment, 'player');
      if (envEffects) {
        for (const envEffect of envEffects) {
          combatState.log.push(`${envEffect.icon} ${envEffect.name}: ${envEffect.description}`);
          if (envEffect.effect && envEffect.type === 'hazard') {
            this.applyEffect(combatState, 'player', envEffect.effect);
          } else if (envEffect.type === 'buff') {
            // Remove duplicate environmental buffs
            combatState.playerEffects = combatState.playerEffects.filter(e => e.id !== envEffect.id);
            combatState.playerEffects.push(envEffect.effect);
          }
        }
      }
    }

    // Process DoT effects at start of round
    this.processDotEffects(combatState);

    // Check boss phase transition
    if (enemy.bossTemplate) {
      const hpPercent = Math.round((enemy.hp / enemy.maxHp) * 100);
      const newPhase = this.checkBossPhase(combatState, hpPercent);
      if (newPhase > enemy.currentPhase) {
        combatState.phaseTransition = true;
      }
    }

    // Player AI action
    const playerAction = this.evaluatePlayerAction(combatState);
    this.executeAction(combatState, 'player', playerAction);

    if (enemy.hp <= 0) {
      resetComboHistory(player.userId); // Reset combo on combat end
      if (combatState.enemies && combatState.enemies.length > 1) {
        if (this.switchToNextEnemy(combatState)) {
          combatState.round += 1;
          return {
            status: 'ongoing',
            combatState: this.getCombatSummary(combatState),
          };
        }
      }
      return this.endCombat(userId, true, worldState);
    }

    // Enemy action (skip if stunned)
    if (!this.hasEffect(combatState.enemyEffects, 'stun')) {
      const enemyAction = combatState.enemyIntent?.action || this.evaluateEnemyAction(combatState);
      this.executeAction(combatState, 'enemy', enemyAction);
    } else {
      combatState.log.push(`${enemy.name} is stunned and cannot act!`);
    }

    if (player.hp <= 0) {
      resetComboHistory(player.userId);
      return this.endCombat(userId, false, worldState);
    }

    // Update effects and cooldowns
    this.updateEffects(combatState);
    this.primeEnemyIntent(combatState, enemy.bossTemplate);
    combatState.round += 1;

    return {
      status: 'ongoing',
      combatState: this.getCombatSummary(combatState),
    };
  }

  /**
   * Check if boss has transitioned phases
   */
  checkBossPhase(combatState, hpPercent) {
    const { enemy } = combatState;
    if (!enemy.bossTemplate) return 1;

    const phaseInfo = getBossPhaseInfo(enemy.bossTemplate, hpPercent);
    if (phaseInfo && phaseInfo.phase > enemy.currentPhase) {
      enemy.currentPhase = phaseInfo.phase;
      combatState.log.push(`🔥 ${enemy.name} enters Phase ${phaseInfo.phase}! ${phaseInfo.description}`);
      return phaseInfo.phase;
    }

    return enemy.currentPhase;
  }

  /**
   * Apply an effect to a target
   */
  applyEffect(combatState, target, effect) {
    if (!effect || !effect.type) return; // Skip null/invalid effects
    const effectList = target === 'player' ? combatState.playerEffects : combatState.enemyEffects;
    
    effectList.push({
      type: effect.type,
      duration: effect.duration,
      ...effect,
    });

    const targetName = target === 'player' ? combatState.player.username : combatState.enemy.name;
    combatState.log.push(`${targetName} is affected by ${effect.type}!`);
  }

  /**
   * Update effects (reduce duration, reduce cooldowns)
   */
  updateEffects(combatState) {
    combatState.playerEffects = combatState.playerEffects.filter(e => --e.duration > 0);
    combatState.enemyEffects = combatState.enemyEffects.filter(e => --e.duration > 0);

    // Decrement skill cooldowns (clamp to minimum 0)
    for (const skillId in combatState.player.skillCooldowns) {
      combatState.player.skillCooldowns[skillId] = Math.max(0, combatState.player.skillCooldowns[skillId] - 1);
    }
  }

  /**
   * Get combat summary for display
   */
  getCombatSummary(combatState) {
    const { player, enemy, log, round, worldState } = combatState;
    const activeMember = combatState.party?.members?.[combatState.party.activeIndex];
    const playerName = activeMember?.name || player.username;
    return {
      playerStatus: {
        name: playerName,
        hp: Math.max(0, player.hp),
        maxHp: player.maxHp,
        hpPercent: Math.round((Math.max(0, player.hp) / player.maxHp) * 100),
      },
      enemyStatus: {
        name: enemy.name,
        hp: Math.max(0, enemy.hp),
        maxHp: enemy.maxHp,
        hpPercent: Math.round((Math.max(0, enemy.hp) / enemy.maxHp) * 100),
      },
      playerEffects: combatState.playerEffects || [],
      enemyEffects: combatState.enemyEffects || [],
      playerStance: combatState.playerStance || 'balanced',
      playerGuard: combatState.playerGuard || 0,
      enemyGuard: combatState.enemyGuard || 0,
      guardMax: combatState.guardMax || GUARD_MAX,
      enemyIntent: combatState.enemyIntent || null,
      party: combatState.party || null,
      round,
      worldState,
      log: log.slice(-6),
    };
  }

  /**
   * End combat and award XP/gold
   */
  endCombat(userId, playerWon, worldState) {
    const combatState = this.activeCombats.get(userId);
    if (!combatState) return { error: 'No active combat' };

    const { player, enemy, log } = combatState;

    let levelUpResult = null;
    let xpGain = 0;
    let goldGain = 0;
    const isGuildBoss = combatState.meta?.type === 'guild_boss';
    
    if (playerWon && !isGuildBoss) {
      const balance = loadBalanceData();
      const baseXp = 50 * enemy.level;
      const baseGold = 25 * enemy.level;
      const xpMult = Number(balance.combatXpMultiplier) || 1;
      xpGain = Math.floor(baseXp * (worldState?.modifiers?.xpGain || 1) * xpMult);
      goldGain = Math.floor(baseGold * (worldState?.modifiers?.goldGain || 1));

      // Apply potion buffs
      if (player.potionBuffs) {
        // XP Bonus potion
        if (player.potionBuffs.xpRemaining && player.potionBuffs.xpRemaining > 0 && player.potionBuffs.xpBonus) {
          const bonusXp = Math.floor(xpGain * (player.potionBuffs.xpBonus / 100));
          xpGain += bonusXp;
          log.push(`✨ XP Potion bonus: +${bonusXp} XP (+${player.potionBuffs.xpBonus}%)`);
          player.potionBuffs.xpRemaining -= 1;
          if (player.potionBuffs.xpRemaining <= 0) {
            delete player.potionBuffs.xpBonus;
            delete player.potionBuffs.xpRemaining;
          }
        }
        
        // Gold Bonus potion
        if (player.potionBuffs.goldRemaining && player.potionBuffs.goldRemaining > 0 && player.potionBuffs.goldBonus) {
          const bonusGold = Math.floor(goldGain * (player.potionBuffs.goldBonus / 100));
          goldGain += bonusGold;
          log.push(`💰 Gold Potion bonus: +${bonusGold} gold (+${player.potionBuffs.goldBonus}%)`);
          player.potionBuffs.goldRemaining -= 1;
          if (player.potionBuffs.goldRemaining <= 0) {
            delete player.potionBuffs.goldBonus;
            delete player.potionBuffs.goldRemaining;
          }
        }
        
        // Loot Bonus potion (decrement counter)
        if (player.potionBuffs.lootRemaining && player.potionBuffs.lootRemaining > 0) {
          player.potionBuffs.lootRemaining -= 1;
          if (player.potionBuffs.lootRemaining <= 0) {
            delete player.potionBuffs.lootBonus;
            delete player.potionBuffs.lootRemaining;
          }
        }
      }

      levelUpResult = player.addXp(xpGain);
      player.gold += goldGain;

      log.push(`Victory! Gained ${xpGain} XP and ${goldGain} gold!`);
      
      // Add level up messages if applicable
      if (levelUpResult && levelUpResult.levelsGained > 0) {
        log.push(`🎉 Level Up! You are now level ${player.level}!`);
        
        // Add milestone messages
        if (levelUpResult.milestones && levelUpResult.milestones.length > 0) {
          levelUpResult.milestones.forEach(milestone => {
            log.push(`✨ ${milestone.message}`);
            if (milestone.gold) log.push(`   💰 Bonus: ${milestone.gold} gold`);
            if (milestone.talentPoints) log.push(`   ⭐ Bonus: ${milestone.talentPoints} talent points`);
          });
        }
      }
    } else if (playerWon && isGuildBoss) {
      log.push('Victory!');
    } else {
      log.push('Defeat! You lost the battle...');
      player.hp = player.maxHp; // Respawn with full HP
    }

    player.isInCombat = false;
    player.currentEnemy = null;
    player.skillCooldowns = {};
    this.activeCombats.delete(userId);

    return {
      status: playerWon ? 'victory' : 'defeat',
      xpGained: xpGain,
      goldGained: goldGain,
      log: log.slice(-10),
      meta: combatState.meta,
      enemy: enemy,
      levelUp: levelUpResult,
      player: player, // Return the modified player object
    };
  }

  /**
   * Force end combat without rewards
   */
  forceEndCombat(userId) {
    const combatState = this.activeCombats.get(userId);
    if (!combatState) return false;
    const player = combatState.player;
    if (player) {
      player.isInCombat = false;
      player.currentEnemy = null;
    }
    this.activeCombats.delete(userId);
    return true;
  }

  evaluatePlayerAction(combatState) {
    const { player, enemy, worldState } = combatState;
    const stats = combatState.playerStats || player.getStats();

    let bestSkill = null;
    let bestScore = -1;

    const skillIds = combatState.playerSkills || player.skills || [];
    for (const skillId of skillIds) {
      const skill = getSkill(skillId);
      if (!skill) continue;
      // No mana check - new system doesn't use mana
      if (player.skillCooldowns[skillId] && player.skillCooldowns[skillId] > 0) continue;

      const score = evaluateSkillUsage(
        skill,
        {
          playerHp: player.hp,
          playerMaxHp: player.maxHp,
          enemyHp: enemy.hp,
          enemyMaxHp: enemy.maxHp,
          enemyStrength: enemy.strength,
          playerDefense: stats.defense,
        },
        player.aiTendencies,
        worldState
      );

      if (score > bestScore) {
        bestScore = score;
        bestSkill = skill;
      }
    }

    if (!bestSkill) {
      return { type: 'attack' };
    }

    return { type: 'skill', skill: bestSkill };
  }

  evaluateEnemyAction(combatState) {
    const { enemy } = combatState;
    if (enemy.skills && Array.isArray(enemy.skills) && enemy.skills.length > 0) {
      const chance = Math.random();
      if (chance < 0.55) {
        const skillId = enemy.skills[Math.floor(Math.random() * enemy.skills.length)];
        const skill = getSkill(skillId);
        if (skill) {
          return { type: 'skill', skill };
        }
      }
    }
    return { type: 'attack' };
  }

  executeAction(combatState, actor, action) {
    const { player, enemy, log, worldState } = combatState;
    const isPlayer = actor === 'player';
    const attacker = isPlayer ? player : enemy;
    const defender = isPlayer ? enemy : player;
    const playerStance = getStanceModifiers(combatState.playerStance);
    const stance = isPlayer ? playerStance : getStanceModifiers('balanced');

    if (action.type === 'switch') {
      const { index, name } = action;
      if (combatState.party && typeof index === 'number') {
        combatState.party.activeIndex = index;
        log.push(`${player.username} switched to ${name || 'a new ally'}!`);
      }
      return;
    }

    if (action.type === 'stance') {
      if (isPlayer && action.stance) {
        combatState.playerStance = action.stance;
        log.push(`${player.username} shifts into ${action.stance} stance.`);
      }
      return;
    }

    // Handle boss abilities
    if (action.type === 'ability') {
      const ability = action.ability;
      if (!ability) {
        this.executeAction(combatState, actor, { type: 'attack' });
        return;
      }

      let damage = enemy.strength * 1.5 * ability.damage;
      const variance = damage * 0.15;
      damage = Math.max(1, Math.floor(damage - variance + Math.random() * variance * 2));

      // Apply type effectiveness
      const defenderTypes = getPlayerTypes(player);
      const typeMultiplier = getEffectivenessMultiplier(ability.element, defenderTypes);
      damage = Math.floor(damage * typeMultiplier);

      defender.takeDamage(damage);
      log.push(`${enemy.name} uses ${ability.name} for ${damage} damage!`);

      // Apply ability effects
      if (ability.effect) {
        this.applyEffect(combatState, 'player', ability.effect);
      }

      const effectText = getEffectivenessText(typeMultiplier);
      if (effectText) log.push(effectText);
      return;
    }

    if (action.type === 'attack') {
      const attackAccuracy = isPlayer ? Math.min(0.99, 0.95 + stance.accuracyBonus) : 0.9;
      if (Math.random() > attackAccuracy) {
        log.push(`${attacker.username || attacker.name}'s attack missed!`);
        return;
      }

      const playerStats = combatState.playerStats || player.getStats();
      const baseDamage = isPlayer
        ? playerStats.strength * 1.1
        : enemy.calculateAttackDamage();

      const variance = baseDamage * (getConfig('combat.damageVariance') + (worldState?.modifiers?.varianceBonus || 0));
      let damage = Math.max(1, Math.floor(baseDamage - variance + Math.random() * variance * 2));

      if (isPlayer) {
        damage = Math.floor(damage * stance.damageDealt);
      }

      damage = this.applyOffensiveModifiers(combatState, isPlayer ? 'player' : 'enemy', damage);

      const defenseMultiplier = getConfig('combat.defenseMultiplier');
      const defenseValue = isPlayer
        ? defender.defense
        : (combatState.playerStats ? combatState.playerStats.defense : defender.getStats().defense);
      damage = Math.max(1, damage - Math.floor(defenseValue * defenseMultiplier));

      damage = Math.floor(damage * (isPlayer ? (worldState?.modifiers?.playerDamage || 1) : (worldState?.modifiers?.enemyDamage || 1)));

      const defenderTypes = isPlayer ? getEnemyTypes(defender) : getPlayerTypes(defender);
      const typeMultiplier = getEffectivenessMultiplier('physical', defenderTypes);
      damage = Math.floor(damage * typeMultiplier);

      if (!isPlayer) {
        damage = Math.floor(damage * playerStance.damageTaken);
      }

      damage = this.applyDefensiveEffects(combatState, isPlayer ? 'enemy' : 'player', damage);

      defender.takeDamage(damage);
      this.addGuardDamage(combatState, isPlayer ? 'enemy' : 'player', damage);
      log.push(`${attacker.username || attacker.name} attacks for ${damage} damage!`);

      const effectivenessText = getEffectivenessText(typeMultiplier);
      if (effectivenessText) {
        log.push(effectivenessText);
      }
      return;
    }

    if (action.type === 'skill') {
      const skill = action.skill;
      if (!skill) {
        log.push(`${attacker.username || attacker.name} tried to use an invalid skill!`);
        return;
      }
      const accuracy = isPlayer ? Math.min(1, (skill.accuracy ?? 1) + stance.accuracyBonus) : (skill.accuracy ?? 1);
      if (Math.random() > accuracy) {
        log.push(`${attacker.username || attacker.name} uses ${skill.name}, but it missed!`);
        return;
      }

      const stats = isPlayer ? (combatState.playerStats || attacker.getStats()) : {
        strength: enemy.strength,
        intelligence: enemy.intelligence,
        agility: enemy.agility,
        wisdom: enemy.wisdom,
        defense: enemy.defense,
      };

      if (isPlayer) {
        // New system: No mana deduction, just turn-based cooldowns
        const skillLevel = combatState.playerSkillLevels?.[skill.id]
          || attacker.skillLevels?.[skill.id]
          || 1;
        const cooldown = skill.getCooldown ? skill.getCooldown(skillLevel) : (skill.cooldown || 0);
        if (cooldown > 0) {
          attacker.skillCooldowns[skill.id] = cooldown;
        }
      }

      // Calculate damage using new system
      let damage = 0;
      if (skill.damageCalc) {
        const skillLevel = isPlayer
          ? (combatState.playerSkillLevels?.[skill.id] || attacker.skillLevels?.[skill.id] || 1)
          : 1;
        damage = skill.damageCalc(stats, skillLevel);
      } else if (skill.damage) {
        // Fallback for old format
        damage = typeof skill.damage === 'function' ? skill.damage(stats) : skill.damage;
      }

      if (isPlayer) {
        // Apply combat style modifiers to damage
        if (combatState.combatStyle) {
          damage = applyStyleModifiers(damage, combatState.combatStyle, skill.id);
        }

        // Check for skill combo
        const combo = recordSkillUsage(player.userId, skill.id, player.skills);
        if (combo) {
          damage = applyComboBonus(damage, combo);
          log.push(`✨ **COMBO!** ${combo.description}`);
          combatState.comboChain = (combatState.comboChain || 0) + 1;

          // Apply combo bonus effects
          if (combo.bonus.effect) {
            this.applyEffect(combatState, 'enemy', combo.bonus.effect);
          }
        }
      }

      if (isPlayer) {
        damage = Math.floor(damage * stance.damageDealt);
      }

      damage = this.applyOffensiveModifiers(combatState, isPlayer ? 'player' : 'enemy', damage);

      // Get effects using new system
      let effectsList = [];
      if (skill.getEffects) {
        const skillLevel = isPlayer ? (attacker.skillLevels?.[skill.id] || 1) : 1;
        effectsList = skill.getEffects(skillLevel) || [];
      } else if (skill.effects && Array.isArray(skill.effects)) {
        // Fallback for old format
        effectsList = skill.effects;
      }

      // Critical effect
      const criticalEffect = effectsList.find(e => e.type === 'critical');
      if (criticalEffect) {
        const critChance = isPlayer ? Math.min(1, criticalEffect.chance + stance.critBonus) : criticalEffect.chance;
        if (Math.random() < critChance) {
          damage *= getConfig('combat.criticalDamageMultiplier');
          if (isPlayer) {
            if (!attacker.progressStats) {
              attacker.progressStats = {
                monstersDefeated: 0,
                gatheringActions: 0,
                materialsCollected: 0,
                craftsCompleted: 0,
                goldEarned: 0,
                criticalHits: 0,
                dungeonsCleared: 0,
                raidsCleared: 0,
              };
            }
            attacker.progressStats.criticalHits += 1;
          }
          log.push('Critical hit!');
        }
      }

      const defenseMultiplier = getConfig('combat.defenseMultiplier');
      const defenseValue = isPlayer ? defender.defense : defender.getStats().defense;
      damage = Math.max(0, Math.floor(damage - Math.floor(defenseValue * defenseMultiplier)));

      damage = Math.floor(damage * (isPlayer ? (worldState?.modifiers?.playerDamage || 1) : (worldState?.modifiers?.enemyDamage || 1)));

      const attackType = skill.element || (skill.type === 'magical' ? 'arcane' : skill.type) || 'normal';
      const defenderTypes = isPlayer ? getEnemyTypes(defender) : getPlayerTypes(defender);
      const typeMultiplier = getEffectivenessMultiplier(attackType, defenderTypes);
      damage = Math.floor(damage * typeMultiplier);

      if (!isPlayer) {
        damage = Math.floor(damage * playerStance.damageTaken);
      }

      if (damage > 0) {
        damage = this.applyDefensiveEffects(combatState, isPlayer ? 'enemy' : 'player', damage);
        defender.takeDamage(damage);
        this.addGuardDamage(combatState, isPlayer ? 'enemy' : 'player', damage);
        log.push(`${attacker.username || attacker.name} uses ${skill.name} for ${damage} damage!`);

        const effectivenessText = getEffectivenessText(typeMultiplier);
        if (effectivenessText) {
          log.push(effectivenessText);
        }
      } else {
        log.push(`${attacker.username || attacker.name} uses ${skill.name}.`);
      }

      // Apply effects
      for (const effect of effectsList) {
        if (!effect || !effect.type) continue; // Skip null/invalid effects
        if (effect.type === 'heal' && isPlayer) {
          const healValue = effect.value;
          const healing = typeof healValue === 'number' && healValue < 1
            ? Math.floor(attacker.maxHp * healValue * (worldState?.modifiers?.healingMultiplier || 1))
            : Math.floor(healValue * (worldState?.modifiers?.healingMultiplier || 1));
          attacker.heal(healing);
          log.push(`${attacker.username} heals for ${healing} HP!`);
        } else if (effect.type === 'lifesteal' && isPlayer && damage > 0) {
          const healAmount = Math.floor(damage * effect.value);
          attacker.heal(healAmount);
          log.push(`${attacker.username} siphons ${healAmount} HP!`);
        } else if (effect.type === 'regeneration' && isPlayer) {
          this.applyEffect(combatState, isPlayer ? 'player' : 'enemy', effect);
        } else if (effect.type === 'damage_reduction' || effect.type === 'defense_boost' || effect.type === 'dodge' || effect.type === 'absorb') {
          this.applyEffect(combatState, isPlayer ? 'player' : 'enemy', effect);
        } else if (effect.type === 'ward') {
          this.applyEffect(combatState, isPlayer ? 'player' : 'enemy', effect);
        } else if (effect.type === 'poison' || effect.type === 'slow' || effect.type === 'stun' || effect.type === 'bleed' || effect.type === 'weakened' || effect.type === 'exposed') {
          this.applyEffect(combatState, isPlayer ? 'enemy' : 'player', effect);
        } else if (effect.type === 'revive') {
          this.applyEffect(combatState, isPlayer ? 'player' : 'enemy', effect);
        } else if (effect.type === 'strength_boost' || effect.type === 'agility_boost' || effect.type === 'defense_reduction') {
          this.applyEffect(combatState, isPlayer ? 'player' : 'enemy', effect);
        } else if (effect.type === 'self_damage') {
          const maxHp = attacker.maxHp || 1;
          const loss = effect.value < 1 ? Math.floor(maxHp * effect.value) : Math.floor(effect.value);
          if (loss > 0) {
            attacker.takeDamage(loss);
            log.push(`${attacker.username || attacker.name} takes ${loss} recoil damage!`);
          }
        } else if (effect.type === 'self_weakened') {
          this.applyEffect(combatState, isPlayer ? 'player' : 'enemy', { ...effect, type: 'weakened' });
        } else if (effect.type === 'self_exposed') {
          this.applyEffect(combatState, isPlayer ? 'player' : 'enemy', { ...effect, type: 'exposed' });
        } else if (effect.type === 'self_bleed') {
          this.applyEffect(combatState, isPlayer ? 'player' : 'enemy', { ...effect, type: 'bleed' });
        }
      }
    }
  }

  hasEffect(effectList, type) {
    return effectList.some(e => e.type === type && e.duration > 0);
  }

  applyDefensiveEffects(combatState, target, damage) {
    const effects = target === 'player' ? combatState.playerEffects : combatState.enemyEffects;
    let finalDamage = damage;

    const reduction = effects.find(e => e.type === 'damage_reduction');
    if (reduction) {
      finalDamage = Math.floor(finalDamage * (1 - reduction.value));
    }

    const defenseBoost = effects.find(e => e.type === 'defense_boost');
    if (defenseBoost) {
      finalDamage = Math.max(1, finalDamage - Math.floor(finalDamage * defenseBoost.value));
    }

    const dodge = effects.find(e => e.type === 'dodge');
    if (dodge && Math.random() < dodge.chance) {
      return 0;
    }

    // Check for stance-based dodge
    if (target === 'player') {
      const playerStance = getStanceModifiers(combatState.playerStance);
      if (playerStance.dodgeChance > 0 && Math.random() < playerStance.dodgeChance) {
        combatState.log.push(`${combatState.player.username} evades the attack!`);
        return 0;
      }
    }

    const absorb = effects.find(e => e.type === 'absorb');
    if (absorb && absorb.value > 0) {
      const absorbed = Math.min(absorb.value, finalDamage);
      absorb.value -= absorbed;
      finalDamage -= absorbed;
    }

    const ward = effects.find(e => e.type === 'ward');
    if (ward && ward.value > 0) {
      const absorbed = Math.min(ward.value, finalDamage);
      ward.value -= absorbed;
      finalDamage -= absorbed;
    }

    const exposed = effects.find(e => e.type === 'exposed');
    if (exposed) {
      finalDamage = Math.floor(finalDamage * (1 + exposed.value));
    }

    const broken = effects.find(e => e.type === 'broken');
    if (broken) {
      finalDamage = Math.floor(finalDamage * (1 + broken.value));
    }

    return finalDamage;
  }

  applyOffensiveModifiers(combatState, attacker, damage) {
    const effects = attacker === 'player' ? combatState.playerEffects : combatState.enemyEffects;
    let finalDamage = damage;

    const weakened = effects.find(e => e.type === 'weakened');
    if (weakened) {
      finalDamage = Math.floor(finalDamage * (1 - weakened.value));
    }

    if (attacker === 'player' && combatState?.meta?.type === 'guild_boss') {
      const bossDamageLevel = this.getEnchantLevel(combatState.player, 'boss_damage');
      if (bossDamageLevel > 0) {
        finalDamage = Math.floor(finalDamage * (1 + (bossDamageLevel * 0.05)));
      }
    }

    return Math.max(0, finalDamage);
  }

  getEnchantLevel(player, enchantType) {
    if (!player?.equipmentEnchants) return 0;
    let total = 0;
    for (const slot of Object.keys(player.equipmentEnchants)) {
      const slotEnchants = player.equipmentEnchants[slot];
      if (!slotEnchants || typeof slotEnchants !== 'object') continue;
      total += Number(slotEnchants[enchantType] || 0);
    }
    return total;
  }

  addGuardDamage(combatState, target, damage) {
    if (damage <= 0) return;

    const guardKey = target === 'player' ? 'playerGuard' : 'enemyGuard';
    const current = Number(combatState[guardKey]) || 0;
    const gain = Math.max(1, Math.floor(damage * 0.5));
    const next = Math.min(combatState.guardMax || GUARD_MAX, current + gain);
    combatState[guardKey] = next;

    if (combatState[guardKey] >= (combatState.guardMax || GUARD_MAX)) {
      combatState[guardKey] = 0;
      const targetName = target === 'player' ? combatState.player.username : combatState.enemy.name;
      this.applyEffect(combatState, target, { type: 'broken', value: 0.25, duration: 1 });
      combatState.log.push(`${targetName} is Guard Broken!`);
    }
  }

  processDotEffects(combatState) {
    const { worldState } = combatState;
    const dotMultiplier = worldState?.modifiers?.dotMultiplier || 1;

    for (const effect of combatState.playerEffects) {
      if (!effect || !effect.type) continue; // Skip null/invalid effects
      if ((effect.type === 'poison' || effect.type === 'bleed') && effect.damagePerTurn) {
        const raw = effect.damagePerTurn < 1 ? combatState.player.maxHp * effect.damagePerTurn : effect.damagePerTurn;
        const damage = Math.floor(raw * dotMultiplier);
        combatState.player.takeDamage(damage);
        const label = effect.type === 'bleed' ? 'bleed' : 'poison';
        combatState.log.push(`${combatState.player.username} suffers ${damage} ${label} damage.`);
      }
    }

    for (const effect of combatState.enemyEffects) {
      if (!effect || !effect.type) continue; // Skip null/invalid effects
      if ((effect.type === 'poison' || effect.type === 'bleed') && effect.damagePerTurn) {
        const raw = effect.damagePerTurn < 1 ? combatState.enemy.maxHp * effect.damagePerTurn : effect.damagePerTurn;
        const damage = Math.floor(raw * dotMultiplier);
        combatState.enemy.takeDamage(damage);
        const label = effect.type === 'bleed' ? 'bleed' : 'poison';
        combatState.log.push(`${combatState.enemy.name} suffers ${damage} ${label} damage.`);
      }
    }
  }

  /**
   * Get active combat for player
   */
  getActiveCombat(userId) {
    return this.activeCombats.get(userId);
  }

  /**
   * Check if player is in combat
   */
  isInCombat(userId) {
    return this.activeCombats.has(userId);
  }

  /**
   * Clean up stale combats (older than 5 minutes)
   */
  cleanupStaleCombats() {
    const now = Date.now();
    const STALE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
    
    for (const [userId, combatState] of this.activeCombats.entries()) {
      const timeSinceLastAction = now - (combatState.lastActionTime || combatState.startTime || 0);
      if (timeSinceLastAction > STALE_TIMEOUT) {
        console.log(`[Combat Cleanup] Removing stale combat for user ${userId} (inactive for ${Math.floor(timeSinceLastAction / 60000)} minutes)`);
        this.forceEndCombat(userId);
      }
    }
  }

  /**
   * Get available player skills for the current combat
   */
  getAvailableSkills(userId) {
    const combatState = this.activeCombats.get(userId);
    if (!combatState) return [];

    const { player } = combatState;
    const skills = [];

    // Get all skills available to the player
    const skillIds = combatState.playerSkills || player.skills || [];
    if (Array.isArray(skillIds)) {
      for (const skillId of skillIds) {
        const skill = getSkill(skillId);
        if (skill) {
          skills.push({
            ...skill,
            canUse: this.canUseSkill(combatState, skillId),
            reason: this.getSkillUseReason(combatState, skillId),
          });
        }
      }
    }

    return skills;
  }

  /**
   * Check if a skill can be used in current combat
   */
  canUseSkill(combatState, skillId) {
    const { player } = combatState;
    const skill = getSkill(skillId);
    
    if (!skill) return false;
    // New system: No mana costs, only cooldown checks
    
    // Check cooldown if applicable
    if (player.skillCooldowns && player.skillCooldowns[skillId] > 0) {
      return false;
    }

    return true;
  }

  /**
   * Get reason why a skill cannot be used
   */
  getSkillUseReason(combatState, skillId) {
    const { player } = combatState;
    const skill = getSkill(skillId);
    
    if (!skill) return 'Unknown skill';

    if (player.skillCooldowns && player.skillCooldowns[skillId] > 0) {
      return `Cooldown: ${player.skillCooldowns[skillId]} turns`;
    }

    return 'Ready';
  }

  /**
   * Execute combat round with player-selected skill
   */
  executeRoundWithSkill(userId, skillId) {
    const combatState = this.activeCombats.get(userId);
    if (!combatState) {
      return { error: 'No active combat' };
    }

    // Update last action timestamp
    combatState.lastActionTime = Date.now();

    const { player, enemy, worldState } = combatState;

    const skill = getSkill(skillId);
    if (!skill) {
      return { error: 'Unknown skill', status: 'error' };
    }

    // Check if skill is available
    if (!this.canUseSkill(combatState, skillId)) {
      return { 
        error: this.getSkillUseReason(combatState, skillId),
        status: 'error',
      };
    }

    // Process DoT effects at start of round
    this.processDotEffects(combatState);

    // Execute player action with selected skill
    this.executeAction(combatState, 'player', { type: 'skill', skill });

    if (enemy.hp <= 0) {
      return this.endCombat(userId, true, worldState);
    }

    // Enemy AI action (skip if stunned)
    let enemyAction = null;
    if (!this.hasEffect(combatState.enemyEffects, 'stun')) {
      enemyAction = combatState.enemyIntent?.action || this.evaluateEnemyAction(combatState);
      this.executeAction(combatState, 'enemy', enemyAction);
    } else {
      combatState.log.push(`${enemy.name} is stunned and cannot act!`);
    }

    if (player.hp <= 0) {
      return this.endCombat(userId, false, worldState);
    }

    // Update effects and cooldowns
    this.updateEffects(combatState);
    this.primeEnemyIntent(combatState);
    combatState.round++;

    return {
      status: 'ongoing',
      combatState: this.getCombatSummary(combatState),
      playerAction: skillId,
      enemyAction,
    };
  }

  /**
   * Execute combat round with player switching party member
   */
  executeRoundWithSwitch(userId, switchIndex) {
    const combatState = this.activeCombats.get(userId);
    if (!combatState) {
      return { error: 'No active combat' };
    }

    // Update last action timestamp
    combatState.lastActionTime = Date.now();

    const { player, enemy, worldState } = combatState;
    const party = combatState.party;

    if (!party || !Array.isArray(party.members) || party.members.length < 2) {
      return { error: 'No party members available', status: 'error' };
    }

    if (switchIndex === party.activeIndex) {
      return { error: 'That member is already active', status: 'error' };
    }

    if (switchIndex < 0 || switchIndex >= party.members.length) {
      return { error: 'Invalid party member', status: 'error' };
    }

    // Process DoT effects at start of round
    this.processDotEffects(combatState);

    const targetMember = party.members[switchIndex];
    this.executeAction(combatState, 'player', {
      type: 'switch',
      index: switchIndex,
      name: targetMember?.name,
    });

    if (enemy.hp <= 0) {
      return this.endCombat(userId, true, worldState);
    }

    // Enemy AI action (skip if stunned)
    let enemyAction = null;
    if (!this.hasEffect(combatState.enemyEffects, 'stun')) {
      enemyAction = combatState.enemyIntent?.action || this.evaluateEnemyAction(combatState);
      this.executeAction(combatState, 'enemy', enemyAction);
    } else {
      combatState.log.push(`${enemy.name} is stunned and cannot act!`);
    }

    if (player.hp <= 0) {
      return this.endCombat(userId, false, worldState);
    }

    // Update effects and cooldowns
    this.updateEffects(combatState);
    this.primeEnemyIntent(combatState);
    combatState.round++;

    return {
      status: 'ongoing',
      combatState: this.getCombatSummary(combatState),
      playerAction: 'switch',
      enemyAction,
    };
  }

  /**
   * Execute combat round with player selecting a stance
   */
  executeRoundWithStance(userId, stanceId) {
    const combatState = this.activeCombats.get(userId);
    if (!combatState) {
      return { error: 'No active combat' };
    }

    // Update last action timestamp
    combatState.lastActionTime = Date.now();

    const { player, enemy, worldState } = combatState;

    // Process DoT effects at start of round
    this.processDotEffects(combatState);

    this.executeAction(combatState, 'player', { type: 'stance', stance: stanceId });

    if (enemy.hp <= 0) {
      return this.endCombat(userId, true, worldState);
    }

    let enemyAction = null;
    if (!this.hasEffect(combatState.enemyEffects, 'stun')) {
      enemyAction = combatState.enemyIntent?.action || this.evaluateEnemyAction(combatState);
      this.executeAction(combatState, 'enemy', enemyAction);
    } else {
      combatState.log.push(`${enemy.name} is stunned and cannot act!`);
    }

    if (player.hp <= 0) {
      return this.endCombat(userId, false, worldState);
    }

    this.updateEffects(combatState);
    this.primeEnemyIntent(combatState);
    combatState.round++;

    return {
      status: 'ongoing',
      combatState: this.getCombatSummary(combatState),
      playerAction: `stance:${stanceId}`,
      enemyAction,
    };
  }

  primeEnemyIntent(combatState, bossTemplate = null) {
    if (bossTemplate && combatState.enemy.bossTemplate) {
      const hpPercent = Math.round((combatState.enemy.hp / combatState.enemy.maxHp) * 100);
      const abilities = getBossPhaseAbilities(bossTemplate, hpPercent);
      if (abilities && abilities.length > 0) {
        const abilityId = abilities[Math.floor(Math.random() * abilities.length)];
        const ability = getAbility(abilityId);
        if (ability) {
          combatState.enemyIntent = { 
            action: { type: 'ability', ability }, 
            label: `${ability.name} (${ability.element})`,
            icon: ability.icon
          };
          return;
        }
      }
    }
    combatState.enemyIntent = this.createEnemyIntent(combatState);
  }

  createEnemyIntent(combatState) {
    const action = this.evaluateEnemyAction(combatState);
    if (!action || action.type === 'attack') {
      return { action: { type: 'attack' }, label: 'Basic Attack' };
    }
    if (action.type === 'skill' && action.skill) {
      const element = action.skill.element || action.skill.type || 'normal';
      return { action, label: `${action.skill.name} (${element})` };
    }
    return { action, label: 'Unknown' };
  }

  /**
   * Get combat summary for display (by userId lookup)
   */
  getCombatSummaryById(userId) {
    const combatState = this.activeCombats.get(userId);
    if (!combatState) return null;

    const { player, enemy, round } = combatState;
    const activeMember = combatState.party?.members?.[combatState.party.activeIndex];
    const playerName = activeMember?.name || player.username;

    return {
      round,
      playerName,
      playerHp: `${player.hp}/${player.maxHp}`,
      playerMana: `${player.mana}/${player.maxMana}`,
      enemyName: enemy.name,
      enemyHp: `${enemy.hp}/${enemy.maxHp}`,
      playerHpPercent: Math.floor((player.hp / player.maxHp) * 100),
      enemyHpPercent: Math.floor((enemy.hp / enemy.maxHp) * 100),
    };
  }
}


