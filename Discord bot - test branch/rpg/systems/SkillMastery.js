/**
 * Skill Mastery System - Per-skill leveling and unlocks
 */

class SkillMastery {
  constructor() {
    // Map<playerId, skillStats>
    this.playerSkills = new Map();

    // Skill variants that unlock at certain levels
    this.skillVariants = {
      'fireball': [
        { level: 1, name: 'Fireball', description: 'Basic fire spell', damage: 50 },
        { level: 10, name: 'Greater Fireball', description: 'Larger burning area', damage: 100, effect: 'Burn' },
        { level: 20, name: 'Inferno', description: 'Massive fire explosion', damage: 200, effect: 'Burn + Stun' }
      ],
      'lightning_strike': [
        { level: 1, name: 'Lightning Strike', description: 'Single target shock', damage: 50 },
        { level: 10, name: 'Chain Lightning', description: 'Hits multiple enemies', damage: 80, effect: 'Chain' },
        { level: 20, name: 'Thunderbolt', description: 'Devastating lightning', damage: 180, effect: 'Stun' }
      ],
      'ice_spike': [
        { level: 1, name: 'Ice Spike', description: 'Freeze attack', damage: 45 },
        { level: 10, name: 'Ice Storm', description: 'Widespread freeze', damage: 90, effect: 'Slow' },
        { level: 20, name: 'Absolute Zero', description: 'Complete freeze', damage: 160, effect: 'Freeze' }
      ]
    };
  }

  /**
   * Initialize or get player skill data
   */
  getPlayerSkills(playerId) {
    if (!this.playerSkills.has(playerId)) {
      this.initializePlayerSkills(playerId);
    }
    return this.playerSkills.get(playerId);
  }

  /**
   * Initialize fresh skill data
   */
  initializePlayerSkills(playerId) {
    const skills = {
      playerId,
      skills: {},
      masteriesAchieved: 0,
      variantsUnlocked: 0
    };

    // Initialize existing skills
    Object.keys(this.skillVariants).forEach(skillId => {
      skills.skills[skillId] = {
        skillId,
        level: 1,
        experience: 0,
        experienceForNext: 100,
        usageCount: 0,
        currentVariant: 0,
        lastUsed: null
      };
    });

    this.playerSkills.set(playerId, skills);
    return skills;
  }

  /**
   * Gain experience for a skill
   */
  gainSkillExperience(playerId, skillId, experienceAmount) {
    const skills = this.getPlayerSkills(playerId);
    const skill = skills.skills[skillId];

    if (!skill) return { success: false, message: 'Skill not found' };

    skill.experience += experienceAmount;
    skill.usageCount++;
    skill.lastUsed = Date.now();

    // Check for level up
    const levelUps = [];
    while (skill.experience >= skill.experienceForNext && skill.level < 20) {
      skill.experience -= skill.experienceForNext;
      skill.level++;
      skill.experienceForNext = Math.floor(skill.experienceForNext * 1.1);

      levelUps.push(skill.level);

      // Check for variant unlock
      const variant = this.getVariantAtLevel(skillId, skill.level);
      if (variant && skill.currentVariant < this.skillVariants[skillId].findIndex(v => v.level === skill.level)) {
        skill.currentVariant = this.skillVariants[skillId].findIndex(v => v.level === skill.level);
        skills.variantsUnlocked++;
      }
    }

    if (skill.level >= 20) {
      skills.masteriesAchieved++;
    }

    return {
      success: true,
      newLevel: skill.level,
      leveledUp: levelUps.length > 0,
      levelUps,
      unlockedVariant: levelUps.length > 0 ? this.getVariantAtLevel(skillId, skill.level) : null
    };
  }

  /**
   * Get variant at specific level
   */
  getVariantAtLevel(skillId, level) {
    const variants = this.skillVariants[skillId];
    return variants.find(v => v.level === level);
  }

  /**
   * Get current skill variant
   */
  getCurrentVariant(playerId, skillId) {
    const skills = this.getPlayerSkills(playerId);
    const skill = skills.skills[skillId];

    if (!skill) return null;

    const variants = this.skillVariants[skillId];
    return variants[skill.currentVariant];
  }

  /**
   * Get all variants for a skill
   */
  getSkillVariants(skillId) {
    return this.skillVariants[skillId] || [];
  }

  /**
   * Get skill progression summary
   */
  getSkillProgress(playerId, skillId) {
    const skills = this.getPlayerSkills(playerId);
    const skill = skills.skills[skillId];

    if (!skill) return null;

    const currentXP = skill.experience;
    const nextLevelXP = skill.experienceForNext;
    const percentage = Math.floor((currentXP / nextLevelXP) * 100);

    const allVariants = this.getSkillVariants(skillId);
    const unlockedVariants = allVariants.filter(v => v.level <= skill.level);

    return {
      skillId,
      skillName: this.getCurrentVariant(playerId, skillId)?.name || 'Unknown',
      level: skill.level,
      experience: currentXP,
      nextLevelRequires: nextLevelXP,
      progressToNext: percentage,
      usageCount: skill.usageCount,
      allVariants: allVariants.length,
      unlockedVariants: unlockedVariants.length,
      currentVariantStats: this.getCurrentVariant(playerId, skillId),
      nextVariant: allVariants.find(v => v.level > skill.level),
      isMastered: skill.level >= 20
    };
  }

  /**
   * Get all skills summary
   */
  getAllSkillProgress(playerId) {
    const skills = this.getPlayerSkills(playerId);

    return {
      totalMastered: skills.masteriesAchieved,
      totalVariantsUnlocked: skills.variantsUnlocked,
      skills: Object.keys(skills.skills).map(skillId => this.getSkillProgress(playerId, skillId))
    };
  }

  /**
   * Get mastery rewards
   */
  getMasteryRewards(playerId) {
    const skills = this.getPlayerSkills(playerId);

    const rewards = {
      totalMasteries: skills.masteriesAchieved,
      masteryBonus: skills.masteriesAchieved * 50, // 50 gold per mastery
      masteryBonusDescription: `+${skills.masteriesAchieved * 50} gold from mastery bonuses`,
      nextMasteryProgress: this.getNextMasteryProgress(playerId),
      achievements: this.calculateMasteryAchievements(skills)
    };

    return rewards;
  }

  /**
   * Get progress to next mastery
   */
  getNextMasteryProgress(playerId) {
    const allProgress = this.getAllSkillProgress(playerId);
    const notMastered = allProgress.skills.filter(s => !s.isMastered);

    if (notMastered.length === 0) return { allMastered: true };

    const closest = notMastered.reduce((a, b) => a.level > b.level ? a : b);

    return {
      skillId: closest.skillId,
      skillName: closest.skillName,
      currentLevel: closest.level,
      levelsToMastery: 20 - closest.level
    };
  }

  /**
   * Calculate mastery-based achievements
   */
  calculateMasteryAchievements(skills) {
    const achievements = [];

    if (skills.masteriesAchieved >= 1) {
      achievements.push({ name: 'First Mastery', rarity: 'Uncommon', reward: 100 });
    }
    if (skills.masteriesAchieved >= 3) {
      achievements.push({ name: 'Skill Master', rarity: 'Rare', reward: 500 });
    }
    if (skills.masteriesAchieved >= Object.keys(this.skillVariants).length) {
      achievements.push({ name: 'Grand Master', rarity: 'Legendary', reward: 2000 });
    }

    return achievements;
  }

  /**
   * Get skill usage statistics
   */
  getUsageStats(playerId, limit = 5) {
    const allProgress = this.getAllSkillProgress(playerId);

    return allProgress.skills
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  }
}

export default SkillMastery;
