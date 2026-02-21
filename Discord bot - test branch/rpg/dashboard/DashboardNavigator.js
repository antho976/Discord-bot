/**
 * Dashboard Navigator - Sidebar and sub-sidebar navigation
 * Manages navigation hierarchy
 */

export const DASHBOARD_STRUCTURE = {
  MAIN_SIDEBAR: [
    {
      id: 'worlds',
      label: '🌍 Worlds',
      icon: '🌍',
      subsections: [
        { id: 'world-overview', label: 'World Overview' },
        { id: 'world-settings', label: 'World Settings' },
        { id: 'world-state-rules', label: 'World State Rules' },
        { id: 'linked-quests', label: 'Linked Quests' },
        { id: 'linked-vendors', label: 'Linked Vendors' },
        { id: 'linked-enemies', label: 'Linked Enemies' },
        { id: 'progression', label: 'Progression & Unlocks' },
      ],
    },
    {
      id: 'quests',
      label: '📜 Quests',
      icon: '📜',
      subsections: [
        { id: 'quest-list', label: 'Quest List' },
        { id: 'quest-logic', label: 'Quest Logic Graph' },
        { id: 'outcomes', label: 'Outcomes & Consequences' },
        { id: 'flags-modifiers', label: 'Flags & Modifiers Used' },
        { id: 'story-layer', label: 'Story Layer (Optional)' },
      ],
    },
    {
      id: 'entities',
      label: '👥 Entities',
      icon: '👥',
      subsections: [
        { id: 'players', label: 'Players' },
        { id: 'npcs', label: 'NPCs' },
        { id: 'enemies', label: 'Enemies' },
        { id: 'vendors', label: 'Vendors' },
      ],
    },
    {
      id: 'systems',
      label: '⚙️ Systems',
      icon: '⚙️',
      subsections: [
        { id: 'stats-formulas', label: 'Stats & Formulas' },
        { id: 'xp-progression', label: 'XP & Progression' },
        { id: 'classes', label: 'Classes & Backgrounds' },
        { id: 'skills', label: 'Skills & Effects' },
        { id: 'professions', label: 'Professions & Crafting' },
      ],
    },
    {
      id: 'ai-combat',
      label: '🤖 AI & Combat',
      icon: '🤖',
      subsections: [
        { id: 'ai-profiles', label: 'AI Behavior Profiles' },
        { id: 'skill-priorities', label: 'Skill Priorities' },
        { id: 'enemy-overrides', label: 'Enemy Overrides' },
        { id: 'combat-balance', label: 'Combat Balance' },
      ],
    },
    {
      id: 'flags-modifiers',
      label: '🚩 Flags & Modifiers',
      icon: '🚩',
      subsections: [
        { id: 'flag-registry', label: 'Flag Registry' },
        { id: 'modifier-registry', label: 'Modifier Registry' },
        { id: 'flag-groups', label: 'Flag Groups' },
        { id: 'modifier-pipeline', label: 'Modifier Pipeline' },
      ],
    },
    {
      id: 'simulation',
      label: '🧪 Simulation',
      icon: '🧪',
      subsections: [
        { id: 'combat-sim', label: 'Combat Simulator' },
        { id: 'quest-preview', label: 'Quest Preview' },
        { id: 'world-preview', label: 'World State Preview' },
        { id: 'flag-tester', label: 'Flag Tester' },
      ],
    },
    {
      id: 'admin',
      label: '🔑 Admin',
      icon: '🔑',
      subsections: [
        { id: 'validation', label: 'Validation Report' },
        { id: 'dependencies', label: 'Dependency Graph' },
        { id: 'export-import', label: 'Export / Import' },
        { id: 'content-version', label: 'Content Versioning' },
      ],
    },
  ],
};

export class DashboardNavigator {
  constructor() {
    this.currentMain = null;
    this.currentSub = null;
    this.history = [];
  }

  /**
   * Navigate to main section
   */
  navigateToMain(sectionId) {
    if (this.currentMain !== sectionId) {
      this.history.push({ main: this.currentMain, sub: this.currentSub });
    }
    this.currentMain = sectionId;
    this.currentSub = null;
  }

  /**
   * Navigate to subsection
   */
  navigateToSub(sectionId) {
    this.currentSub = sectionId;
  }

  /**
   * Get current navigation state
   */
  getCurrentState() {
    return {
      main: this.currentMain,
      sub: this.currentSub,
    };
  }

  /**
   * Get main sections
   */
  getMainSections() {
    return DASHBOARD_STRUCTURE.MAIN_SIDEBAR;
  }

  /**
   * Get subsections for a main section
   */
  getSubsections(mainId) {
    const main = DASHBOARD_STRUCTURE.MAIN_SIDEBAR.find(m => m.id === mainId);
    return main ? main.subsections : [];
  }

  /**
   * Get current breadcrumb
   */
  getBreadcrumb() {
    const main = DASHBOARD_STRUCTURE.MAIN_SIDEBAR.find(m => m.id === this.currentMain);
    const sub = main?.subsections.find(s => s.id === this.currentSub);

    const path = [];
    if (main) path.push({ label: main.label, id: main.id, type: 'main' });
    if (sub) path.push({ label: sub.label, id: sub.id, type: 'sub' });

    return path;
  }

  /**
   * Go back in navigation
   */
  goBack() {
    if (this.history.length > 0) {
      const prev = this.history.pop();
      this.currentMain = prev.main;
      this.currentSub = prev.sub;
    }
  }
}

export const dashboardNavigator = new DashboardNavigator();
