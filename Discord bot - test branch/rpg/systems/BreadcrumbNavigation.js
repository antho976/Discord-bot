/**
 * Navigation Breadcrumb System - Tracks menu path for navigation
 */

class BreadcrumbNavigation {
  constructor() {
    // Map<playerId, Array<breadcrumb>>
    this.trails = new Map();
  }

  /**
   * Push location to breadcrumb trail
   */
  pushLocation(playerId, location) {
    if (!this.trails.has(playerId)) {
      this.trails.set(playerId, []);
    }

    const trail = this.trails.get(playerId);
    
    // Avoid duplicates at the end
    if (trail.length > 0 && trail[trail.length - 1].id === location.id) {
      return;
    }

    // Limit trail to 10 locations
    if (trail.length >= 10) {
      trail.shift();
    }

    trail.push({
      id: location.id,
      name: location.name,
      timestamp: Date.now()
    });
  }

  /**
   * Get current breadcrumb trail
   */
  getTrail(playerId) {
    return this.trails.get(playerId) || [];
  }

  /**
   * Get formatted breadcrumb string (e.g., "Main > Combat > Boss Fight")
   */
  getFormattedTrail(playerId) {
    const trail = this.getTrail(playerId);
    return trail.map(b => b.name).join(' > ') || 'Main Menu';
  }

  /**
   * Clear trail
   */
  clearTrail(playerId) {
    this.trails.delete(playerId);
  }

  /**
   * Go back in trail
   */
  goBack(playerId) {
    const trail = this.trails.get(playerId);
    if (trail && trail.length > 1) {
      trail.pop();
      return trail[trail.length - 1];
    }
    return null;
  }
}

export default BreadcrumbNavigation;
