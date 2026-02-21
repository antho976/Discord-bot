/**
 * Equipment Builds System - Save and quickly swap equipment loadouts
 */

class EquipmentBuilds {
  constructor() {
    // Map<playerId, Array<build>>
    this.builds = new Map();
  }

  /**
   * Save current equipment as a named build
   */
  saveBuild(playerId, buildName, equipment) {
    if (!this.builds.has(playerId)) {
      this.builds.set(playerId, []);
    }

    const playerBuilds = this.builds.get(playerId);
    
    // Check if build already exists
    const existingIndex = playerBuilds.findIndex(b => b.name.toLowerCase() === buildName.toLowerCase());
    
    const buildData = {
      name: buildName,
      timestamp: Date.now(),
      equipment: {
        weapon: equipment.weapon || null,
        armor: equipment.armor || null,
        shield: equipment.shield || null,
        ring: equipment.ring || null,
        amulet: equipment.amulet || null
      }
    };

    if (existingIndex >= 0) {
      // Update existing build
      playerBuilds[existingIndex] = buildData;
      return { success: true, message: `Updated build: ${buildName}`, isNew: false };
    } else {
      // Check if we're at the 3-build limit
      if (playerBuilds.length >= 3) {
        return { success: false, message: 'Build limit reached (3 maximum). Delete a build first.' };
      }
      
      playerBuilds.push(buildData);
      return { success: true, message: `Saved build: ${buildName}`, isNew: true };
    }
  }

  /**
   * Load a saved build
   */
  loadBuild(playerId, buildName) {
    const playerBuilds = this.builds.get(playerId) || [];
    const build = playerBuilds.find(b => b.name.toLowerCase() === buildName.toLowerCase());

    if (!build) {
      return { success: false, message: 'Build not found' };
    }

    return { success: true, build: build.equipment };
  }

  /**
   * Get all builds for a player
   */
  getBuilds(playerId) {
    return this.builds.get(playerId) || [];
  }

  /**
   * Delete a build
   */
  deleteBuild(playerId, buildName) {
    const playerBuilds = this.builds.get(playerId);
    if (!playerBuilds) {
      return { success: false, message: 'No builds found' };
    }

    const index = playerBuilds.findIndex(b => b.name.toLowerCase() === buildName.toLowerCase());
    if (index === -1) {
      return { success: false, message: 'Build not found' };
    }

    const deletedBuild = playerBuilds.splice(index, 1);
    return { success: true, message: `Deleted build: ${deletedBuild[0].name}` };
  }

  /**
   * Rename a build
   */
  renameBuild(playerId, oldName, newName) {
    const playerBuilds = this.builds.get(playerId);
    if (!playerBuilds) {
      return { success: false, message: 'No builds found' };
    }

    const build = playerBuilds.find(b => b.name.toLowerCase() === oldName.toLowerCase());
    if (!build) {
      return { success: false, message: 'Build not found' };
    }

    build.name = newName;
    return { success: true, message: `Renamed to: ${newName}` };
  }

  /**
   * Clear all builds for a player
   */
  clearBuilds(playerId) {
    this.builds.delete(playerId);
  }

  /**
   * Get build summary for display
   */
  getBuildSummary(build) {
    const items = Object.values(build).filter(item => item !== null);
    return {
      itemCount: items.length,
      itemNames: items.map(item => item.name || 'Unknown').join(', ')
    };
  }
}

export default EquipmentBuilds;
