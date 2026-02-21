/**
 * Dashboard Command - Opens the admin dashboard
 * Accessible to admins only
 * Fully integrated with all dashboard systems
 */

import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { contentStore } from './ContentStore.js';
import { DashboardValidator } from './Validator.js';
import { DASHBOARD_STRUCTURE } from './DashboardNavigator.js';
import fs from 'fs';
import path from 'path';
import { WorldStateSimulator } from './WorldStateSimulator.js';
import { FlagTester, PRESET_SCENARIOS } from './FlagTester.js';
import { CombatSimulator } from './CombatSimulator.js';
import { QuestSimulator } from './QuestSimulator.js';
import { ContentExporter, ContentImporter } from './ContentTools.js';
import { getAIProfile, AI_BEHAVIOR_PROFILES } from './AIBehaviorSystem.js';
import RPGCommand from '../commands/RPGCommand.js';
import { loadTutorialData, saveTutorialData } from '../data/tutorial.js';

const CRAFTING_FILE = path.resolve(process.cwd(), 'data', 'crafting.json');

function loadCraftingData() {
  if (!fs.existsSync(CRAFTING_FILE)) {
    return { materials: {}, recipes: {} };
  }
  try {
    const raw = fs.readFileSync(CRAFTING_FILE, 'utf8');
    const data = JSON.parse(raw);
    return {
      materials: data.materials || {},
      recipes: data.recipes || {},
    };
  } catch {
    return { materials: {}, recipes: {} };
  }
}

function saveCraftingData(data) {
  fs.writeFileSync(CRAFTING_FILE, JSON.stringify(data, null, 2));
}

export default class DashboardCommand {
  constructor() {
    this.adminOnly = true;
    this.flagTester = new FlagTester();
    this.sessionData = new Map(); // userId -> session state
  }

  /**
   * Define the slash command
   */
  getSlashCommand() {
    return new SlashCommandBuilder()
      .setName('dashboard')
      .setDescription('Open the RPG Dashboard (Admin only)')
      .setDefaultMemberPermissions(0) // Admin only
      .toJSON();
  }

  /**
   * Handle main command
   */
  async handleCommand(interaction) {
    try {
      // Check if admin
      if (!interaction.member.permissions.has('Administrator')) {
        await interaction.reply({
          content: 'Only administrators can access the dashboard.',
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply();

      contentStore.loadAll();

      // Show main dashboard
      const embed = this.createMainDashboardEmbed();
      const buttons = this.createMainNavigationButtons();

      await interaction.editReply({
        embeds: [embed],
        components: buttons,
      });
    } catch (error) {
      console.error('[Dashboard] Command error:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'An error occurred.',
          ephemeral: true,
        });
      }
    }
  }

  /**
   * Create main dashboard embed
   */
  createMainDashboardEmbed() {
    const validation = contentStore.validate();

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle('⚙️ RPG Dashboard')
      .setDescription('Manage all aspects of your RPG without code changes.')
      .addFields(
        {
          name: '📊 Content Summary',
          value: `Worlds: ${contentStore.getAllWorlds().length}\nQuests: ${contentStore.getAllQuests().length}`,
          inline: true,
        },
        {
          name: '✅ Validation',
          value: validation.valid ? 'All systems valid' : `${validation.errors.length} errors`,
          inline: true,
        },
        {
          name: '📝 Main Sections',
          value: 'Use buttons below to navigate',
          inline: false,
        }
      )
      .setTimestamp();

    return embed;
  }

  /**
   * Create main navigation buttons
   */
  createMainNavigationButtons() {
    const mainSections = DASHBOARD_STRUCTURE.MAIN_SIDEBAR;
    const rows = [];
    let currentRow = [];

    for (const section of mainSections) {
      currentRow.push(
        new ButtonBuilder()
          .setCustomId(`dashboard-main-${section.id}`)
          .setLabel(section.label)
          .setStyle(ButtonStyle.Primary)
      );

      if (currentRow.length === 5) {
        rows.push(new ActionRowBuilder().addComponents(currentRow));
        currentRow = [];
      }
    }

    if (currentRow.length > 0) {
      rows.push(new ActionRowBuilder().addComponents(currentRow));
    }

    return rows;
  }

  /**
   * Create world list embed
   */
  createWorldListEmbed() {
    let description = '';
    const editorFile = path.resolve(process.cwd(), 'data', 'rpg-worlds.json');
    if (fs.existsSync(editorFile)) {
      try {
        const raw = fs.readFileSync(editorFile, 'utf8');
        const data = JSON.parse(raw);
        const worldList = Object.values(data || []);

        const sorted = worldList.sort((a, b) => {
          const tierA = Number(a.tier) || 1;
          const tierB = Number(b.tier) || 1;
          if (tierA !== tierB) return tierA - tierB;
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateA - dateB;
        });

        description = sorted
          .map((w, index) => {
            const tier = Number(w.tier) || index + 1;
            const minLevel = 1 + (tier - 1) * 10;
            const maxLevel = minLevel + 9;
            return `**${w.name || `World ${index + 1}`}** (${w.id})\nTier ${tier} | Levels ${minLevel}-${maxLevel}`;
          })
          .join('\n\n');
      } catch (error) {
        console.error('[Dashboard] Failed to load editor worlds:', error);
      }
    }

    if (!description) {
      const worlds = contentStore.getAllWorlds();
      if (worlds.length > 0) {
        description = worlds
          .map(w => `**${w.displayName}** (${w.id})\nTier ${w.tier} | Levels ${w.minLevel}-${w.maxLevel}`)
          .join('\n\n');
      }
    }

    if (!description) {
      description = 'No worlds created yet.';
    }

    return new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('🌍 Worlds')
      .setDescription(description)
      .setTimestamp();
  }

  /**
   * Create quest list embed
   */
  createQuestListEmbed() {
    const quests = contentStore.getAllQuests();

    let description = quests
      .map(q => `**${q.title}** (${q.id})\nWorld: ${q.worldId} | Type: ${q.type}`)
      .join('\n\n');

    if (!description) {
      description = 'No quests created yet.';
    }

    return new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('📜 Quests')
      .setDescription(description)
      .setTimestamp();
  }

  /**
   * Create validation report embed
   */
  createValidationEmbed() {
    const validation = contentStore.validate();

    const embed = new EmbedBuilder()
      .setColor(validation.valid ? 0x2ecc71 : 0xe74c3c)
      .setTitle('🔍 Validation Report');

    if (validation.valid) {
      embed.setDescription('✅ All systems valid and consistent!');
    } else {
      const errors = validation.errors.slice(0, 10).join('\n');
      embed.addField('❌ Errors', `\`\`\`${errors}\`\`\`` || 'None');
    }

    if (validation.warnings.length > 0) {
      const warnings = validation.warnings.slice(0, 5).join('\n');
      embed.addField('⚠️ Warnings', `\`\`\`${warnings}\`\`\``);
    }

    embed.setTimestamp();
    return embed;
  }

  /**
   * Create world state preview embed
   */
  createWorldStatePreviewEmbed() {
    const worlds = contentStore.getAllWorlds();
    
    let description = 'Select a world to preview daily states:\n\n';
    description += worlds.map(w => `**${w.name}** (${w.id})`).join('\n');

    if (worlds.length === 0) {
      description = 'No worlds available. Create worlds first.';
    }

    return new EmbedBuilder()
      .setColor(0xf39c12)
      .setTitle('🌅 World State Preview')
      .setDescription(description)
      .setTimestamp();
  }

  /**
   * Create AI profiles embed
   */
  createAIProfilesEmbed() {
    let description = '';
    for (const [id, profile] of Object.entries(AI_BEHAVIOR_PROFILES)) {
      description += `**${profile.name}** (\`${id}\`)\n`;
      description += `Aggression: ${profile.aggression} | Defense: ${profile.defensivePriority}\n`;
      description += `${profile.description}\n\n`;
    }

    return new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle('🤖 AI Behavior Profiles')
      .setDescription(description)
      .setTimestamp();
  }

  /**
   * Create flags and modifiers embed
   */
  createFlagsModifiersEmbed() {
    const flagCount = Object.keys(this.flagTester.getAllFlags()).length;
    const modifierCount = Object.keys(this.flagTester.getAllModifiers()).length;

    return new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('🚩 Flags & Modifiers')
      .setDescription('Manage global flags and modifiers')
      .addFields(
        {
          name: 'Registered Flags',
          value: `${flagCount} flags available`,
          inline: true,
        },
        {
          name: 'Registered Modifiers',
          value: `${modifierCount} modifiers available`,
          inline: true,
        }
      )
      .setTimestamp();
  }

  /**
   * Create simulation tools embed
   */
  createSimulationToolsEmbed() {
    return new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('🧪 Simulation & Testing Tools')
      .setDescription('Tools for testing gameplay mechanics')
      .addFields(
        {
          name: '⚔️ Combat Simulator',
          value: 'Simulate combat scenarios',
          inline: true,
        },
        {
          name: '📜 Quest Preview',
          value: 'Preview quest outcomes',
          inline: true,
        },
        {
          name: '🎮 Flag Tester',
          value: 'Toggle flags for testing',
          inline: true,
        },
        {
          name: '🌍 World Preview',
          value: 'Preview world states',
          inline: true,
        }
      )
      .setTimestamp();
  }

  /**
   * Create admin tools embed
   */
  createAdminToolsEmbed() {
    const versions = contentStore.getAllVersions();

    return new EmbedBuilder()
      .setColor(0x34495e)
      .setTitle('🔑 Admin Tools')
      .setDescription('Content management and version control')
      .addFields(
        {
          name: 'Validation',
          value: 'Check for broken dependencies',
          inline: true,
        },
        {
          name: 'Versioning',
          value: `${versions.length} versions saved`,
          inline: true,
        },
        {
          name: 'Export/Import',
          value: 'Backup and share content',
          inline: true,
        },
        {
          name: '🔄 Reset Character',
          value: 'Reset your RPG character for testing',
          inline: true,
        }
      )
      .setTimestamp();
  }

  /**
   * Create systems embed
   */
  createSystemsEmbed() {
    const tutorial = loadTutorialData();
    const sections = Array.isArray(tutorial.sections) ? tutorial.sections.length : 0;

    return new EmbedBuilder()
      .setColor(0x1abc9c)
      .setTitle('⚙️ Systems')
      .setDescription('Configure core systems. All content here is editable.')
      .addFields(
        {
          name: '📖 Tutorial',
          value: `Title: ${tutorial.title || 'Untitled'}\nSections: ${sections}`,
          inline: false,
        }
      )
      .setTimestamp();
  }

  /**
   * Handle button interactions
   */
  async handleButtonInteraction(interaction) {
    const customId = interaction.customId;

    try {
      if (customId.startsWith('dashboard-main-')) {
        const section = customId.replace('dashboard-main-', '');
        return this.handleMainNavigation(interaction, section);
      }

      if (customId === 'dashboard-back') {
        const embed = this.createMainDashboardEmbed();
        const buttons = this.createMainNavigationButtons();
        await interaction.update({
          embeds: [embed],
          components: buttons,
        });
        return;
      }

      // Subsection handlers
      if (customId === 'dashboard-world-list') {
        const embed = this.createWorldListEmbed();
        const backButton = this.createBackButton();
        await interaction.update({
          embeds: [embed],
          components: [backButton],
        });
        return;
      }

      if (customId === 'dashboard-quest-list') {
        const embed = this.createQuestListEmbed();
        const backButton = this.createBackButton();
        await interaction.update({
          embeds: [embed],
          components: [backButton],
        });
        return;
      }

      if (customId === 'dashboard-validation') {
        const embed = this.createValidationEmbed();
        const backButton = this.createBackButton();
        await interaction.update({
          embeds: [embed],
          components: [backButton],
        });
        return;
      }

      if (customId === 'dashboard-world-preview') {
        const embed = this.createWorldStatePreviewEmbed();
        const backButton = this.createBackButton();
        await interaction.update({
          embeds: [embed],
          components: [backButton],
        });
        return;
      }

      if (customId === 'dashboard-ai-profiles') {
        const embed = this.createAIProfilesEmbed();
        const backButton = this.createBackButton();
        await interaction.update({
          embeds: [embed],
          components: [backButton],
        });
        return;
      }

      if (customId === 'dashboard-flags-modifiers') {
        const embed = this.createFlagsModifiersEmbed();
        const backButton = this.createBackButton();
        await interaction.update({
          embeds: [embed],
          components: [backButton],
        });
        return;
      }

      if (customId === 'dashboard-simulation') {
        const embed = this.createSimulationToolsEmbed();
        const backButton = this.createBackButton();
        await interaction.update({
          embeds: [embed],
          components: [backButton],
        });
        return;
      }

      if (customId === 'dashboard-admin') {
        const embed = this.createAdminToolsEmbed();
        const buttons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('dashboard-reset-character')
            .setLabel('🔄 Reset Character')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('dashboard-back')
            .setLabel('← Back')
            .setStyle(ButtonStyle.Secondary)
        );
        await interaction.update({
          embeds: [embed],
          components: [buttons],
        });
        return;
      }

      if (customId === 'dashboard-reset-character') {
        await this.handleResetCharacter(interaction);
        return;
      }

      if (customId === 'dashboard-add-material') {
        const modal = new ModalBuilder()
          .setCustomId('dashboard-add-material-modal')
          .setTitle('Add Material');

        const idInput = new TextInputBuilder()
          .setCustomId('material-id')
          .setLabel('Material ID (e.g., silver_ore)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const nameInput = new TextInputBuilder()
          .setCustomId('material-name')
          .setLabel('Material Name')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const rarityInput = new TextInputBuilder()
          .setCustomId('material-rarity')
          .setLabel('Rarity (common/uncommon/rare/epic/legendary)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const valueInput = new TextInputBuilder()
          .setCustomId('material-value')
          .setLabel('Value (number)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder().addComponents(idInput),
          new ActionRowBuilder().addComponents(nameInput),
          new ActionRowBuilder().addComponents(rarityInput),
          new ActionRowBuilder().addComponents(valueInput)
        );

        await interaction.showModal(modal);
        return;
      }

      if (customId === 'dashboard-add-recipe') {
        const modal = new ModalBuilder()
          .setCustomId('dashboard-add-recipe-modal')
          .setTitle('Add Recipe');

        const idInput = new TextInputBuilder()
          .setCustomId('recipe-id')
          .setLabel('Recipe ID (e.g., silver_sword_recipe)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const nameInput = new TextInputBuilder()
          .setCustomId('recipe-name')
          .setLabel('Recipe Name')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const professionInput = new TextInputBuilder()
          .setCustomId('recipe-profession')
          .setLabel('Profession (blacksmith/alchemist/enchanter)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const materialsInput = new TextInputBuilder()
          .setCustomId('recipe-materials')
          .setLabel('Materials JSON (e.g., {"iron_ore":5,"coal":2})')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        const outputInput = new TextInputBuilder()
          .setCustomId('recipe-output')
          .setLabel('Output JSON (e.g., {"item":"iron_greatsword","quantity":1,"level":3})')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder().addComponents(idInput),
          new ActionRowBuilder().addComponents(nameInput),
          new ActionRowBuilder().addComponents(professionInput),
          new ActionRowBuilder().addComponents(materialsInput),
          new ActionRowBuilder().addComponents(outputInput)
        );

        await interaction.showModal(modal);
        return;
      }

      if (customId === 'dashboard-edit-tutorial') {
        const tutorial = loadTutorialData();
        const modal = new ModalBuilder()
          .setCustomId('dashboard-edit-tutorial-modal')
          .setTitle('Edit Tutorial');

        const titleInput = new TextInputBuilder()
          .setCustomId('tutorial-title')
          .setLabel('Tutorial Title')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setValue(tutorial.title || '');

        const introInput = new TextInputBuilder()
          .setCustomId('tutorial-intro')
          .setLabel('Intro Text')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setValue(tutorial.intro || '');

        const sectionsInput = new TextInputBuilder()
          .setCustomId('tutorial-sections')
          .setLabel('Sections JSON (array of {title, body})')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setValue(JSON.stringify(tutorial.sections || [], null, 2));

        modal.addComponents(
          new ActionRowBuilder().addComponents(titleInput),
          new ActionRowBuilder().addComponents(introInput),
          new ActionRowBuilder().addComponents(sectionsInput)
        );

        await interaction.showModal(modal);
        return;
      }
    } catch (error) {
      console.error('[Dashboard] Button interaction error:', error);
      if (!interaction.replied) {
        await interaction.reply({
          content: 'An error occurred.',
          ephemeral: true,
        });
      }
    }
  }

  /**
   * Create back button
   */
  createBackButton() {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('dashboard-back')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  /**
   * Handle main navigation
   */
  async handleMainNavigation(interaction, section) {
    let embed;
    let buttons = new ActionRowBuilder();

    switch (section) {
      case 'worlds':
        embed = this.createWorldListEmbed();
        break;
      case 'quests':
        embed = this.createQuestListEmbed();
        break;
      case 'systems':
        embed = this.createSystemsEmbed();
        break;
      case 'simulation':
        embed = this.createSimulationToolsEmbed();
        break;
      case 'admin':
        embed = this.createAdminToolsEmbed();
        break;
      case 'ai-combat':
        embed = this.createAIProfilesEmbed();
        break;
      case 'flags-modifiers':
        embed = this.createFlagsModifiersEmbed();
        break;
      default:
        embed = new EmbedBuilder()
          .setColor(0x95a5a6)
          .setTitle(`${section} - Section`)
          .setDescription('This section is available.')
          .setTimestamp();
    }

    if (section === 'admin') {
      const adminButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('dashboard-reset-character')
          .setLabel('🔄 Reset Character')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('dashboard-add-material')
          .setLabel('➕ Add Material')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('dashboard-add-recipe')
          .setLabel('➕ Add Recipe')
          .setStyle(ButtonStyle.Primary)
      );

      const backRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('dashboard-back')
          .setLabel('← Back')
          .setStyle(ButtonStyle.Secondary)
      );

      await interaction.update({
        embeds: [embed],
        components: [adminButtons, backRow],
      });
      return;
    }

    if (section === 'systems') {
      const systemsButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('dashboard-edit-tutorial')
          .setLabel('✏️ Edit Tutorial')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('dashboard-back')
          .setLabel('← Back')
          .setStyle(ButtonStyle.Secondary)
      );

      await interaction.update({
        embeds: [embed],
        components: [systemsButtons],
      });
      return;
    }

    buttons.addComponents(
      new ButtonBuilder()
        .setCustomId('dashboard-back')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.update({
      embeds: [embed],
      components: [buttons],
    });
  }

  /**
   * Handle character reset
   */
  async handleModalSubmit(interaction) {
    if (!interaction.member.permissions.has('Administrator')) {
      await interaction.reply({ content: 'Only administrators can access the dashboard.', ephemeral: true });
      return;
    }

    const customId = interaction.customId;

    if (customId === 'dashboard-add-material-modal') {
      const id = interaction.fields.getTextInputValue('material-id').trim();
      const name = interaction.fields.getTextInputValue('material-name').trim();
      const rarity = interaction.fields.getTextInputValue('material-rarity').trim().toLowerCase();
      const value = Number(interaction.fields.getTextInputValue('material-value').trim());

      if (!id || !name || !Number.isFinite(value)) {
        await interaction.reply({ content: 'Invalid material data.', ephemeral: true });
        return;
      }

      const data = loadCraftingData();
      data.materials[id] = { id, name, rarity, value };
      saveCraftingData(data);

      await interaction.reply({
        content: `✅ Material added: **${name}** (${id}). Restart the bot to load it into crafting.`,
        ephemeral: true,
      });
      return;
    }

    if (customId === 'dashboard-add-recipe-modal') {
      const id = interaction.fields.getTextInputValue('recipe-id').trim();
      const name = interaction.fields.getTextInputValue('recipe-name').trim();
      const profession = interaction.fields.getTextInputValue('recipe-profession').trim();
      const materialsRaw = interaction.fields.getTextInputValue('recipe-materials').trim();
      const outputRaw = interaction.fields.getTextInputValue('recipe-output').trim();

      let materials;
      let output;

      try {
        materials = JSON.parse(materialsRaw);
        output = JSON.parse(outputRaw);
      } catch {
        await interaction.reply({ content: 'Invalid JSON for materials or output.', ephemeral: true });
        return;
      }

      if (!id || !name || !profession || !output?.item) {
        await interaction.reply({ content: 'Missing required recipe fields.', ephemeral: true });
        return;
      }

      const recipe = {
        id,
        name,
        profession,
        level: Number(output.level) || 1,
        materials,
        output: { item: output.item, quantity: Number(output.quantity) || 1 },
        craftTime: Number(output.craftTime) || 3,
      };

      const data = loadCraftingData();
      data.recipes[id] = recipe;
      saveCraftingData(data);

      await interaction.reply({
        content: `✅ Recipe added: **${name}** (${id}). Restart the bot to load it into crafting.`,
        ephemeral: true,
      });
      return;
    }

    if (customId === 'dashboard-edit-tutorial-modal') {
      const title = interaction.fields.getTextInputValue('tutorial-title').trim();
      const intro = interaction.fields.getTextInputValue('tutorial-intro').trim();
      const sectionsRaw = interaction.fields.getTextInputValue('tutorial-sections').trim();

      let sections = [];
      try {
        const parsed = JSON.parse(sectionsRaw);
        if (!Array.isArray(parsed)) throw new Error('Sections must be an array');
        sections = parsed.map((s) => ({
          title: String(s.title || 'Section').slice(0, 256),
          body: String(s.body || 'Details').slice(0, 1000),
        }));
      } catch (err) {
        await interaction.reply({ content: `Invalid sections JSON: ${err.message}`, ephemeral: true });
        return;
      }

      saveTutorialData({ title, intro, sections });

      await interaction.reply({
        content: '✅ Tutorial updated. Changes take effect immediately.',
        ephemeral: true,
      });
      return;
    }
  }

  async handleResetCharacter(interaction) {
    const rpgCommand = new RPGCommand();
    const userId = interaction.user.id;

    // Delete player from memory and file
    rpgCommand.playerManager.deletePlayer(userId);
    
    // Force save to ensure file is updated
    rpgCommand.playerManager.saveAllPlayers();

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('✅ Character Reset')
      .setDescription(`Your RPG character has been fully reset. Run \`/rpg\` again to create a new character.`)
      .setTimestamp();

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('dashboard-back')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.update({
      embeds: [embed],
      components: [buttons],
    });
  }
}
