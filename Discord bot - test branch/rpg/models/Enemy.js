/**
 * Enemy Model - Enemies for combat encounters
 */

export default class Enemy {
  constructor(name, level = 1, isBoss = false) {
    this.name = name;
    this.level = level;
    this.isBoss = isBoss;

    // Scale stats based on level (18% per level for steeper curve)
    const levelMultiplier = 1 + (level - 1) * 0.18;
    
    // Boss enemies get multiplied stats
    const bossMultiplier = isBoss ? 2.5 : 1;
    
    // Training Dummies are weak practice targets
    const isDummy = name === 'Training Dummy';
    const dummyMultiplier = isDummy ? 0.4 : 1;

    this.hp = Math.floor(70 * levelMultiplier * bossMultiplier * dummyMultiplier);
    this.maxHp = this.hp;
    this.strength = Math.floor(10 * levelMultiplier * bossMultiplier * dummyMultiplier);
    this.defense = Math.floor(8 * levelMultiplier * bossMultiplier * dummyMultiplier);
    this.agility = Math.floor(6 * levelMultiplier * bossMultiplier * dummyMultiplier);
    this.intelligence = Math.floor(6 * levelMultiplier * bossMultiplier * dummyMultiplier);

    // Loot rewards (scale with enemy difficulty)
    this.xpReward = Math.floor(55 * levelMultiplier * bossMultiplier);
    this.goldReward = Math.floor(30 * levelMultiplier * bossMultiplier);

    // Boss metadata
    this.bossTemplate = null; // Set by boss-abilities system
    this.currentPhase = 1;
    this.lastPhaseCheck = 100;
  }

  /**
   * Take damage
   */
  takeDamage(amount) {
    this.hp = Math.max(this.hp - amount, 0);
    return this.hp === 0; // returns true if dead
  }

  /**
   * Calculate basic attack damage
   */
  calculateAttackDamage() {
    const baseDamage = this.strength * 1.7;
    const variance = Math.random() * 0.25 - 0.125; // ±12.5% variance
    return Math.max(1, Math.floor(baseDamage * (1 + variance)));
  }

  /**
   * Get summary for display
   */
  getSummary() {
    return {
      name: this.name,
      level: this.level,
      hp: this.hp,
      maxHp: this.maxHp,
      hpPercent: Math.round((this.hp / this.maxHp) * 100),
      isAlive: this.hp > 0,
    };
  }
}
