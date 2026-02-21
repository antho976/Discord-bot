/**
 * Shorthand Command Tips - Quick reference and hotkey system
 */

class ShorthandCommandTips {
  constructor() {
    // Map<playerId, hotkeys>
    this.playerHotkeys = new Map();

    this.DEFAULT_COMMANDS = [
      { command: '/sp', description: 'Open Spell Wheel', action: 'rpg-qol-spell-wheel', category: 'Combat' },
      { command: '/inv', description: 'Show Inventory', action: 'rpg-inventory', category: 'Inventory' },
      { command: '/eq', description: 'Equipment Manager', action: 'rpg-equipment', category: 'Equipment' },
      { command: '/st', description: 'Show Statistics', action: 'rpg-stats', category: 'Info' },
      { command: '/qst', description: 'Quest Log', action: 'rpg-quests', category: 'Quests' },
      { command: '/qol', description: 'QOL Tools Menu', action: 'rpg-qol-menu', category: 'Tools' },
      { command: '/boss', description: 'Boss Tracker', action: 'rpg-qol-boss-tracker', category: 'Combat' },
      { command: '/skill', description: 'Skill Mastery', action: 'rpg-skill-mastery', category: 'Skills' },
      { command: '/dmg', description: 'Damage Tracker', action: 'rpg-damage-tracker', category: 'Tracking' },
      { command: '/build', description: 'Equipment Builds', action: 'rpg-equipment-builds', category: 'Equipment' },
      { command: '/fav', description: 'Favorite Items', action: 'rpg-favorites', category: 'Inventory' },
      { command: '/enc', description: 'Enemy Encyclopedia', action: 'rpg-encyclopedia', category: 'Info' },
      { command: '/rnd', description: 'Random Enemy', action: 'rpg-random-enemy', category: 'Combat' },
      { command: '/guild', description: 'Guild Menu', action: 'rpg-guild', category: 'Guild' }
    ];
  }

  /**
   * Initialize player hotkeys
   */
  initializeHotkeys(playerId) {
    const hotkeys = {
      playerId,
      customHotkeys: {},
      recentlyUsed: [],
      favoriteCommands: []
    };

    // Set default hotkeys
    this.DEFAULT_COMMANDS.forEach(cmd => {
      hotkeys.customHotkeys[cmd.command] = {
        ...cmd,
        custom: false
      };
    });

    this.playerHotkeys.set(playerId, hotkeys);
  }

  /**
   * Get player hotkeys
   */
  getPlayerHotkeys(playerId) {
    if (!this.playerHotkeys.has(playerId)) {
      this.initializeHotkeys(playerId);
    }
    return this.playerHotkeys.get(playerId);
  }

  /**
   * Get all available commands
   */
  getAllCommands(playerId) {
    const hotkeys = this.getPlayerHotkeys(playerId);
    return Object.values(hotkeys.customHotkeys).sort((a, b) => 
      a.category.localeCompare(b.category) || a.command.localeCompare(b.command)
    );
  }

  /**
   * Get commands by category
   */
  getCommandsByCategory(playerId, category) {
    const commands = this.getAllCommands(playerId);
    return commands.filter(c => c.category === category);
  }

  /**
   * Get recently used commands
   */
  getRecentlyUsed(playerId, limit = 5) {
    const hotkeys = this.getPlayerHotkeys(playerId);
    return hotkeys.recentlyUsed.slice(-limit).reverse();
  }

  /**
   * Record command use
   */
  recordCommandUse(playerId, command) {
    const hotkeys = this.getPlayerHotkeys(playerId);
    
    // Add to recently used
    if (!hotkeys.recentlyUsed.includes(command)) {
      hotkeys.recentlyUsed.push(command);
      if (hotkeys.recentlyUsed.length > 20) {
        hotkeys.recentlyUsed.shift();
      }
    }
  }

  /**
   * Add to favorites
   */
  addFavoriteCommand(playerId, command) {
    const hotkeys = this.getPlayerHotkeys(playerId);

    if (!hotkeys.favoriteCommands.includes(command)) {
      hotkeys.favoriteCommands.push(command);
    }

    return { success: true, message: `⭐ ${command} added to favorites` };
  }

  /**
   * Remove from favorites
   */
  removeFavoriteCommand(playerId, command) {
    const hotkeys = this.getPlayerHotkeys(playerId);
    const index = hotkeys.favoriteCommands.indexOf(command);

    if (index >= 0) {
      hotkeys.favoriteCommands.splice(index, 1);
      return { success: true, message: `Removed ${command} from favorites` };
    }

    return { success: false, message: 'Command not in favorites' };
  }

  /**
   * Get favorites
   */
  getFavorites(playerId) {
    const hotkeys = this.getPlayerHotkeys(playerId);
    return hotkeys.favoriteCommands.map(cmd => 
      hotkeys.customHotkeys[cmd]
    ).filter(Boolean);
  }

  /**
   * Custom hotkey binding
   */
  setCustomHotkey(playerId, customKey, command) {
    const hotkeys = this.getPlayerHotkeys(playerId);
    const cmdData = hotkeys.customHotkeys[command];

    if (!cmdData) {
      return { success: false, message: 'Command not found' };
    }

    // Create custom hotkey
    hotkeys.customHotkeys[customKey] = {
      ...cmdData,
      command: customKey,
      custom: true,
      originalCommand: command
    };

    return { success: true, message: `Custom hotkey ${customKey} set for ${command}` };
  }

  /**
   * Remove custom hotkey
   */
  removeCustomHotkey(playerId, customKey) {
    const hotkeys = this.getPlayerHotkeys(playerId);

    if (hotkeys.customHotkeys[customKey]?.custom) {
      delete hotkeys.customHotkeys[customKey];
      return { success: true, message: `Hotkey ${customKey} removed` };
    }

    return { success: false, message: 'Custom hotkey not found' };
  }

  /**
   * Search commands
   */
  searchCommands(playerId, query) {
    const commands = this.getAllCommands(playerId);
    const lowerQuery = query.toLowerCase();

    return commands.filter(c =>
      c.command.toLowerCase().includes(lowerQuery) ||
      c.description.toLowerCase().includes(lowerQuery) ||
      c.action.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get category list
   */
  getCategories() {
    const categories = new Set(this.DEFAULT_COMMANDS.map(c => c.category));
    return Array.from(categories).sort();
  }

  /**
   * Get command reference card
   */
  getCommandReferenceCard(playerId) {
    const hotkeys = this.getPlayerHotkeys(playerId);
    const categories = this.getCategories();

    const card = {};
    categories.forEach(category => {
      card[category] = this.getCommandsByCategory(playerId, category)
        .map(c => `${c.command.padEnd(8)} - ${c.description}`)
        .join('\n');
    });

    return card;
  }

  /**
   * Get quick access menu
   */
  getQuickAccessMenu(playerId) {
    const hotkeys = this.getPlayerHotkeys(playerId);
    
    return {
      favorites: this.getFavorites(playerId),
      recent: this.getRecentlyUsed(playerId, 5),
      allCategories: this.getCategories()
    };
  }
}

export default ShorthandCommandTips;
