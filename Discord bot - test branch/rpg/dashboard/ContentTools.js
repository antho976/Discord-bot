/**
 * Content Export/Import Tool - Safe content distribution and backup
 * Allows exporting content with validation and versioning metadata
 */

import fs from 'fs';
import path from 'path';

export class ContentExporter {
  /**
   * Export all content with metadata
   */
  static exportFull(worlds, quests, metadata = {}) {
    const exported = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      metadata: {
        author: metadata.author || 'Admin',
        description: metadata.description || '',
        tags: metadata.tags || [],
        ...metadata,
      },
      content: {
        worlds: worlds.map(w => ContentExporter.sanitizeWorld(w)),
        quests: quests.map(q => ContentExporter.sanitizeQuest(q)),
      },
      statistics: {
        totalWorlds: worlds.length,
        totalQuests: quests.length,
        flagsUsed: ContentExporter.collectFlags(worlds, quests),
        modifiersUsed: ContentExporter.collectModifiers(worlds, quests),
      },
    };

    return exported;
  }

  /**
   * Export specific worlds and their linked quests
   */
  static exportWorld(world, allQuests, metadata = {}) {
    const linkedQuests = allQuests.filter(q => q.worldId === world.id);

    return {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      type: 'world',
      metadata: {
        worldId: world.id,
        worldName: world.name,
        ...metadata,
      },
      content: {
        world: ContentExporter.sanitizeWorld(world),
        quests: linkedQuests.map(q => ContentExporter.sanitizeQuest(q)),
      },
    };
  }

  /**
   * Sanitize world for export
   */
  static sanitizeWorld(world) {
    const { draftMode, ...clean } = world;
    return {
      ...clean,
      exportedAt: new Date().toISOString(),
    };
  }

  /**
   * Sanitize quest for export
   */
  static sanitizeQuest(quest) {
    const { draftMode, ...clean } = quest;
    return {
      ...clean,
      exportedAt: new Date().toISOString(),
    };
  }

  /**
   * Collect all flags used
   */
  static collectFlags(worlds, quests) {
    const flags = new Set();

    for (const world of worlds) {
      world.requiredFlags?.forEach(f => flags.add(f));
    }

    for (const quest of quests) {
      quest.visibilityConditions?.requiredFlags?.forEach(f => flags.add(f));
      quest.visibilityConditions?.forbiddenFlags?.forEach(f => flags.add(f));
      
      for (const outcome of (quest.outcomes || [])) {
        outcome.flagsSet?.forEach(f => flags.add(f));
      }
    }

    return Array.from(flags);
  }

  /**
   * Collect all modifiers used
   */
  static collectModifiers(worlds, quests) {
    const modifiers = new Set();

    for (const world of worlds) {
      Object.keys(world.baseModifiers || {}).forEach(m => modifiers.add(m));
    }

    for (const quest of quests) {
      for (const outcome of (quest.outcomes || [])) {
        Object.keys(outcome.modifiersApplied || {}).forEach(m => modifiers.add(m));
      }
    }

    return Array.from(modifiers);
  }

  /**
   * Save export to file
   */
  static saveToFile(exportData, filename) {
    try {
      const dir = './rpg/dashboard/exports';
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const filepath = path.join(dir, filename);
      fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2));

      return {
        success: true,
        path: filepath,
        size: fs.statSync(filepath).size,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export class ContentImporter {
  /**
   * Validate import data
   */
  static validate(data) {
    const errors = [];
    const warnings = [];

    if (!data.version) {
      errors.push('Missing version');
    }

    if (!data.content) {
      errors.push('Missing content');
    }

    if (data.content.worlds && !Array.isArray(data.content.worlds)) {
      errors.push('Worlds must be an array');
    }

    if (data.content.quests && !Array.isArray(data.content.quests)) {
      errors.push('Quests must be an array');
    }

    // Check for duplicate IDs
    const worldIds = new Set();
    for (const world of (data.content.worlds || [])) {
      if (worldIds.has(world.id)) {
        errors.push(`Duplicate world ID: ${world.id}`);
      }
      worldIds.add(world.id);
    }

    const questIds = new Set();
    for (const quest of (data.content.quests || [])) {
      if (questIds.has(quest.id)) {
        errors.push(`Duplicate quest ID: ${quest.id}`);
      }
      questIds.add(quest.id);

      // Check if world exists
      if (!worldIds.has(quest.worldId)) {
        warnings.push(`Quest ${quest.id} references non-existent world ${quest.worldId}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Parse import file
   */
  static parseFile(filepath) {
    try {
      const data = fs.readFileSync(filepath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return {
        error: error.message,
      };
    }
  }

  /**
   * Merge imported content with existing
   */
  static merge(existing, imported, strategy = 'addNew') {
    const result = {
      worlds: [...existing.worlds],
      quests: [...existing.quests],
    };

    // Strategy: 'addNew' = only add non-existent
    //           'overwrite' = replace matching IDs
    //           'rename' = add with new IDs

    for (const importedWorld of (imported.content.worlds || [])) {
      const existing_idx = result.worlds.findIndex(w => w.id === importedWorld.id);

      if (existing_idx === -1) {
        result.worlds.push(importedWorld);
      } else if (strategy === 'overwrite') {
        result.worlds[existing_idx] = importedWorld;
      } else if (strategy === 'rename') {
        const newWorld = { ...importedWorld, id: this.generateNewId('world', importedWorld.id) };
        result.worlds.push(newWorld);
      }
    }

    for (const importedQuest of (imported.content.quests || [])) {
      const existing_idx = result.quests.findIndex(q => q.id === importedQuest.id);

      if (existing_idx === -1) {
        result.quests.push(importedQuest);
      } else if (strategy === 'overwrite') {
        result.quests[existing_idx] = importedQuest;
      } else if (strategy === 'rename') {
        const newQuest = { ...importedQuest, id: this.generateNewId('quest', importedQuest.id) };
        result.quests.push(newQuest);
      }
    }

    return result;
  }

  /**
   * Generate new ID with suffix
   */
  static generateNewId(type, originalId) {
    return `${originalId}_imported_${Date.now()}`;
  }
}

/**
 * Create backup snapshot
 */
export function createBackup(worlds, quests) {
  return ContentExporter.exportFull(worlds, quests, {
    author: 'System',
    description: 'Automatic backup',
    tags: ['backup', 'automatic'],
  });
}

/**
 * Compare two exports
 */
export function compareExports(export1, export2) {
  const changes = {
    worldsAdded: [],
    worldsRemoved: [],
    worldsModified: [],
    questsAdded: [],
    questsRemoved: [],
    questsModified: [],
  };

  const world1Map = new Map(export1.content.worlds.map(w => [w.id, w]));
  const world2Map = new Map(export2.content.worlds.map(w => [w.id, w]));

  // Check worlds
  for (const [id, world] of world1Map) {
    if (!world2Map.has(id)) {
      changes.worldsRemoved.push(id);
    } else if (JSON.stringify(world) !== JSON.stringify(world2Map.get(id))) {
      changes.worldsModified.push(id);
    }
  }

  for (const id of world2Map.keys()) {
    if (!world1Map.has(id)) {
      changes.worldsAdded.push(id);
    }
  }

  // Check quests
  const quest1Map = new Map(export1.content.quests.map(q => [q.id, q]));
  const quest2Map = new Map(export2.content.quests.map(q => [q.id, q]));

  for (const [id, quest] of quest1Map) {
    if (!quest2Map.has(id)) {
      changes.questsRemoved.push(id);
    } else if (JSON.stringify(quest) !== JSON.stringify(quest2Map.get(id))) {
      changes.questsModified.push(id);
    }
  }

  for (const id of quest2Map.keys()) {
    if (!quest1Map.has(id)) {
      changes.questsAdded.push(id);
    }
  }

  return changes;
}
