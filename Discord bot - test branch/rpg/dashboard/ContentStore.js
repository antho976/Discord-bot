/**
 * Content Store - Loads and manages all game content
 * Acts as the bridge between schemas and runtime
 * Handles persistence to JSON files
 */

import { createWorld } from './WorldSchema.js';
import { createQuest } from './QuestSchema.js';
import { DashboardValidator } from './Validator.js';
import fs from 'fs';
import path from 'path';

const DATA_DIR = './rpg/dashboard/data';
const WORLDS_FILE = path.join(DATA_DIR, 'worlds.json');
const QUESTS_FILE = path.join(DATA_DIR, 'quests.json');
const VERSIONS_DIR = path.join(DATA_DIR, 'versions');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(VERSIONS_DIR)) {
  fs.mkdirSync(VERSIONS_DIR, { recursive: true });
}

export class ContentStore {
  constructor() {
    this.worlds = new Map(); // id -> world
    this.quests = new Map(); // id -> quest
    this.validators = new DashboardValidator();
    this.lastValidation = null;
    this.versions = new Map(); // versionId -> { worlds, quests, timestamp }
  }

  /**
   * Load all content from files
   */
  loadAll() {
    try {
      if (fs.existsSync(WORLDS_FILE)) {
        const worldsData = JSON.parse(fs.readFileSync(WORLDS_FILE, 'utf8'));
        for (const worldData of worldsData) {
          const world = createWorld(worldData);
          this.worlds.set(world.id, world);
        }
      }

      if (fs.existsSync(QUESTS_FILE)) {
        const questsData = JSON.parse(fs.readFileSync(QUESTS_FILE, 'utf8'));
        for (const questData of questsData) {
          const quest = createQuest(questData);
          this.quests.set(quest.id, quest);
        }
      }

      this.loadVersions();
      this.validate();
    } catch (error) {
      console.error('[ContentStore] Error loading content:', error);
    }
  }

  /**
   * Save all content to files
   */
  saveAll() {
    try {
      fs.writeFileSync(WORLDS_FILE, JSON.stringify(this.getAllWorlds(), null, 2));
      fs.writeFileSync(QUESTS_FILE, JSON.stringify(this.getAllQuests(), null, 2));
    } catch (error) {
      console.error('[ContentStore] Error saving content:', error);
    }
  }

  /**
   * Create a version checkpoint
   */
  createVersion(versionName, description = '') {
    const versionId = `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const versionData = {
      id: versionId,
      name: versionName,
      description,
      timestamp: new Date().toISOString(),
      worlds: this.getAllWorlds(),
      quests: this.getAllQuests(),
    };

    this.versions.set(versionId, versionData);

    // Save to file
    const versionFile = path.join(VERSIONS_DIR, `${versionId}.json`);
    fs.writeFileSync(versionFile, JSON.stringify(versionData, null, 2));

    return versionId;
  }

  /**
   * Load versions from disk
   */
  loadVersions() {
    try {
      if (!fs.existsSync(VERSIONS_DIR)) return;

      const files = fs.readdirSync(VERSIONS_DIR);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const versionData = JSON.parse(
            fs.readFileSync(path.join(VERSIONS_DIR, file), 'utf8')
          );
          this.versions.set(versionData.id, versionData);
        }
      }
    } catch (error) {
      console.error('[ContentStore] Error loading versions:', error);
    }
  }

  /**
   * Get all versions
   */
  getAllVersions() {
    return Array.from(this.versions.values());
  }

  /**
   * Restore from a version
   */
  restoreVersion(versionId) {
    const version = this.versions.get(versionId);
    if (!version) return false;

    this.worlds.clear();
    this.quests.clear();

    for (const worldData of version.worlds) {
      const world = createWorld(worldData);
      this.worlds.set(world.id, world);
    }

    for (const questData of version.quests) {
      const quest = createQuest(questData);
      this.quests.set(quest.id, quest);
    }

    this.saveAll();
    this.validate();
    return true;
  }

  /**
   * Delete a version
   */
  deleteVersion(versionId) {
    this.versions.delete(versionId);
    const versionFile = path.join(VERSIONS_DIR, `${versionId}.json`);
    try {
      if (fs.existsSync(versionFile)) {
        fs.unlinkSync(versionFile);
      }
    } catch (error) {
      console.error('[ContentStore] Error deleting version:', error);
    }
  }

  /**
   * Add a world
   */
  addWorld(worldData) {
    const world = createWorld(worldData);
    this.worlds.set(world.id, world);
    this.saveAll();
    this.invalidate();
    return world;
  }

  /**
   * Update a world
   */
  updateWorld(worldId, updates) {
    const world = this.worlds.get(worldId);
    if (!world) throw new Error(`World not found: ${worldId}`);

    Object.assign(world, updates);
    this.saveAll();
    this.invalidate();
    return world;
  }

  /**
   * Delete a world
   */
  deleteWorld(worldId) {
    this.worlds.delete(worldId);
    this.saveAll();
    this.invalidate();
  }

  /**
   * Add a quest
   */
  addQuest(questData) {
    const quest = createQuest(questData);
    this.quests.set(quest.id, quest);
    this.saveAll();
    this.invalidate();
    return quest;
  }

  /**
   * Update a quest
   */
  updateQuest(questId, updates) {
    const quest = this.quests.get(questId);
    if (!quest) throw new Error(`Quest not found: ${questId}`);

    Object.assign(quest, updates);
    this.saveAll();
    this.invalidate();
    return quest;
  }

  /**
   * Delete a quest
   */
  deleteQuest(questId) {
    this.quests.delete(questId);
    this.saveAll();
    this.invalidate();
  }

  /**
   * Get world by ID
   */
  getWorld(worldId) {
    return this.worlds.get(worldId);
  }

  /**
   * Get quest by ID
   */
  getQuest(questId) {
    return this.quests.get(questId);
  }

  /**
   * Get all worlds
   */
  getAllWorlds() {
    return Array.from(this.worlds.values());
  }

  /**
   * Get all quests
   */
  getAllQuests() {
    return Array.from(this.quests.values());
  }

  /**
   * Get quests in a world
   */
  getQuestsInWorld(worldId) {
    return Array.from(this.quests.values()).filter(q => q.worldId === worldId);
  }

  /**
   * Validate all content
   */
  validate() {
    this.validators = new DashboardValidator(
      this.getAllWorlds(),
      this.getAllQuests()
    );
    this.lastValidation = this.validators.validateAll();
    return this.lastValidation;
  }

  /**
   * Mark as needing validation
   */
  invalidate() {
    this.lastValidation = null;
  }

  /**
   * Get validation report
   */
  getValidationReport() {
    if (!this.lastValidation) {
      return this.validate();
    }
    return this.lastValidation;
  }

  /**
   * Export all content as JSON
   */
  export() {
    return {
      worlds: this.getAllWorlds(),
      quests: this.getAllQuests(),
      exported: new Date().toISOString(),
    };
  }

  /**
   * Import content from JSON
   */
  import(data) {
    if (data.worlds) {
      for (const worldData of data.worlds) {
        this.addWorld(worldData);
      }
    }
    if (data.quests) {
      for (const questData of data.quests) {
        this.addQuest(questData);
      }
    }
    this.validate();
  }
}

// Global content store
export const contentStore = new ContentStore();
