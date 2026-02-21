/**
 * RPG Bot Integration - Entry point for RPG system
 * This module exports the RPG system and handles Discord interactions
 */

import RPGCommand from './commands/RPGCommand.js';

export default class RPGBot {
  constructor(client = null) {
    this.rpgCommand = new RPGCommand();
    if (client) {
      this.rpgCommand.setClient(client);
    }
  }

  setClient(client) {
    this.rpgCommand.setClient(client);
  }

  /**
   * Register slash commands with Discord
   */
  registerCommands(client) {
    // This would be called when setting up the bot
    // For now, the command is defined in RPGCommand.getSlashCommand()
    console.log('[RPG] Slash commands registered');
  }

  /**
   * Handle interactions from Discord
   */
  async handleInteraction(interaction) {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'rpg') {
        await this.rpgCommand.handleCommand(interaction);
      } else if (interaction.commandName === 'leaderboard') {
        await this.rpgCommand.handleLeaderboardCommand(interaction);
      }
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith('rpg-')) {
      await this.rpgCommand.handleButtonInteraction(interaction);
      return;
    }

    if (interaction.isStringSelectMenu && interaction.isStringSelectMenu() && interaction.customId.startsWith('rpg-')) {
      await this.rpgCommand.handleSelectMenuInteraction(interaction);
      return;
    }

    if (interaction.isModalSubmit && interaction.isModalSubmit() && interaction.customId.startsWith('rpg-')) {
      await this.rpgCommand.handleModalSubmit(interaction);
      return;
    }
  }

  /**
   * Get the RPG command object (for slash command registration)
   */
  getSlashCommand() {
    return this.rpgCommand.getSlashCommand();
  }

  /**
   * Get the leaderboard command object (for slash command registration)
   */
  getLeaderboardSlashCommand() {
    return this.rpgCommand.getLeaderboardSlashCommand();
  }

  /**
   * Get the RPG command handler (for interaction handling)
   */
  getRPGCommand() {
    return this.rpgCommand;
  }
}
