/**
 * Example Integration: How to integrate the RPG system into your main bot
 * 
 * In your main index.js or bot file, you would:
 * 1. Import the RPGBot class
 * 2. Create an instance in your bot's ready event
 * 3. Register the slash command with Discord
 * 4. Handle interactions through the RPG system
 */

const RPGBot = require('./rpg/RPGBot');
const { REST, Routes } = require('discord.js');

// Initialize the RPG system
const rpgBot = new RPGBot();

/**
 * In your bot's ready event, register the slash command:
 */
async function registerRPGCommand(client) {
  const rpgSlashCommand = rpgBot.getSlashCommand();

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    console.log('Registering /rpg command...');
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: [rpgSlashCommand] }
    );
    console.log('[RPG] /rpg command registered successfully!');
  } catch (error) {
    console.error('[RPG] Failed to register command:', error);
  }
}

/**
 * In your bot's interactionCreate event:
 */
async function handleRPGInteraction(interaction) {
  if (
    interaction.isChatInputCommand() ||
    interaction.isButton() ||
    interaction.isSelectMenu()
  ) {
    try {
      await rpgBot.handleInteraction(interaction);
    } catch (error) {
      console.error('[RPG] Interaction error:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'An error occurred processing your request.',
          ephemeral: true,
        });
      }
    }
  }
}

module.exports = {
  rpgBot,
  registerRPGCommand,
  handleRPGInteraction,
};

/**
 * USAGE IN YOUR MAIN BOT FILE:
 * 
 * const { rpgBot, registerRPGCommand, handleRPGInteraction } = require('./rpg-integration');
 * 
 * client.on('ready', () => {
 *   console.log('Bot is ready');
 *   registerRPGCommand(client);
 * });
 * 
 * client.on('interactionCreate', (interaction) => {
 *   handleRPGInteraction(interaction);
 * });
 */
