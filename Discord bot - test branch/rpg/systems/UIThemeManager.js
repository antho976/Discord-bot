/**
 * Customizable UI Themes - Dark mode, light mode, accessibility themes
 */

class UIThemeManager {
  constructor() {
    // Map<playerId, theme>
    this.playerThemes = new Map();

    this.THEMES = {
      dark: {
        name: 'Dark Mode',
        colors: {
          background: '#1a1a1a',
          surface: '#2a2a2a',
          primary: '#00ff00',
          secondary: '#0088ff',
          accent: '#ff6600',
          text: '#ffffff',
          textMuted: '#888888'
        },
        description: 'Easy on the eyes, reduces eye strain'
      },
      light: {
        name: 'Light Mode',
        colors: {
          background: '#ffffff',
          surface: '#f5f5f5',
          primary: '#0066cc',
          secondary: '#00aa00',
          accent: '#ff6600',
          text: '#000000',
          textMuted: '#666666'
        },
        description: 'Bright and clean interface'
      },
      highcontrast: {
        name: 'High Contrast',
        colors: {
          background: '#000000',
          surface: '#111111',
          primary: '#ffff00',
          secondary: '#00ffff',
          accent: '#ff0000',
          text: '#ffffff',
          textMuted: '#cccccc'
        },
        description: 'Maximum contrast for accessibility'
      },
      colorblind_deuteranopia: {
        name: 'Colorblind (Deuteranopia)',
        colors: {
          background: '#1a1a1a',
          surface: '#2a2a2a',
          primary: '#0088ff',      // Blue (visible)
          secondary: '#ff8800',     // Orange (visible)
          accent: '#ffff00',        // Yellow (visible)
          text: '#ffffff',
          textMuted: '#888888'
        },
        description: 'Optimized for red-green colorblindness'
      },
      colorblind_protanopia: {
        name: 'Colorblind (Protanopia)',
        colors: {
          background: '#1a1a1a',
          surface: '#2a2a2a',
          primary: '#0088ff',       // Blue (visible)
          secondary: '#ffff00',     // Yellow (visible)
          accent: '#88ff00',        // Green-yellow (visible)
          text: '#ffffff',
          textMuted: '#888888'
        },
        description: 'Optimized for red blindness'
      },
      colorblind_tritanopia: {
        name: 'Colorblind (Tritanopia)',
        colors: {
          background: '#1a1a1a',
          surface: '#2a2a2a',
          primary: '#ff0088',       // Pink-red (visible)
          secondary: '#00ff88',     // Cyan-green (visible)
          accent: '#ffff00',        // Yellow (visible)
          text: '#ffffff',
          textMuted: '#888888'
        },
        description: 'Optimized for blue-yellow colorblindness'
      },
      forest: {
        name: 'Forest Theme',
        colors: {
          background: '#0d2818',
          surface: '#155a2a',
          primary: '#4dff4d',
          secondary: '#66cc66',
          accent: '#ffcc00',
          text: '#e6f2e6',
          textMuted: '#99bb99'
        },
        description: 'Nature-inspired green theme'
      },
      ocean: {
        name: 'Ocean Theme',
        colors: {
          background: '#0a1428',
          surface: '#1a3d52',
          primary: '#00ccff',
          secondary: '#0088cc',
          accent: '#ff9900',
          text: '#e0f2ff',
          textMuted: '#8899cc'
        },
        description: 'Calming blue ocean theme'
      }
    };
  }

  /**
   * Initialize player theme
   */
  initializeTheme(playerId, themeName = 'dark') {
    if (!this.THEMES[themeName]) {
      themeName = 'dark';
    }

    this.playerThemes.set(playerId, {
      playerId,
      currentTheme: themeName,
      customColors: null,
      fontSize: 'medium',
      layout: 'standard',
      animations: true
    });
  }

  /**
   * Get player theme
   */
  getPlayerTheme(playerId) {
    if (!this.playerThemes.has(playerId)) {
      this.initializeTheme(playerId);
    }
    return this.playerThemes.get(playerId);
  }

  /**
   * Set theme
   */
  setTheme(playerId, themeName) {
    if (!this.THEMES[themeName]) {
      return { success: false, message: 'Theme not found' };
    }

    const settings = this.getPlayerTheme(playerId);
    settings.currentTheme = themeName;
    settings.customColors = null; // Reset custom colors

    return {
      success: true,
      message: `Theme changed to ${this.THEMES[themeName].name}`,
      theme: this.THEMES[themeName]
    };
  }

  /**
   * Get theme details
   */
  getThemeDetails(playerId) {
    const settings = this.getPlayerTheme(playerId);
    const themeName = settings.currentTheme;
    const theme = this.THEMES[themeName];

    return {
      currentTheme: themeName,
      name: theme.name,
      description: theme.description,
      colors: settings.customColors || theme.colors,
      customized: !!settings.customColors,
      layout: settings.layout,
      fontSize: settings.fontSize,
      animations: settings.animations
    };
  }

  /**
   * Customize theme colors
   */
  customizeTheme(playerId, colorOverrides) {
    const settings = this.getPlayerTheme(playerId);
    const theme = this.THEMES[settings.currentTheme];

    settings.customColors = {
      ...theme.colors,
      ...colorOverrides
    };

    return { success: true, message: 'Theme customized', colors: settings.customColors };
  }

  /**
   * Reset to default theme
   */
  resetTheme(playerId) {
    const settings = this.getPlayerTheme(playerId);
    settings.customColors = null;

    return { success: true, message: 'Theme reset to default' };
  }

  /**
   * Set font size
   */
  setFontSize(playerId, size) {
    const validSizes = ['small', 'medium', 'large', 'xlarge'];

    if (!validSizes.includes(size)) {
      return { success: false, message: 'Invalid font size' };
    }

    const settings = this.getPlayerTheme(playerId);
    settings.fontSize = size;

    const multipliers = { small: 0.85, medium: 1, large: 1.2, xlarge: 1.5 };

    return { success: true, message: `Font size set to ${size}`, multiplier: multipliers[size] };
  }

  /**
   * Toggle animations
   */
  toggleAnimations(playerId) {
    const settings = this.getPlayerTheme(playerId);
    settings.animations = !settings.animations;

    return { success: true, animationsEnabled: settings.animations };
  }

  /**
   * Set layout preference
   */
  setLayout(playerId, layout) {
    const validLayouts = ['standard', 'compact', 'spacious'];

    if (!validLayouts.includes(layout)) {
      return { success: false, message: 'Invalid layout' };
    }

    const settings = this.getPlayerTheme(playerId);
    settings.layout = layout;

    return { success: true, message: `Layout changed to ${layout}` };
  }

  /**
   * Get all available themes
   */
  getAvailableThemes() {
    return Object.entries(this.THEMES).map(([key, theme]) => ({
      id: key,
      name: theme.name,
      description: theme.description
    }));
  }

  /**
   * Get themes by category
   */
  getThemesByCategory(category) {
    const categories = {
      standard: ['dark', 'light'],
      accessibility: ['highcontrast', 'colorblind_deuteranopia', 'colorblind_protanopia', 'colorblind_tritanopia'],
      aesthetic: ['forest', 'ocean']
    };

    const themeNames = categories[category] || [];
    return themeNames.map(name => ({
      id: name,
      ...this.THEMES[name]
    }));
  }

  /**
   * Export theme settings (for backup)
   */
  exportThemeSettings(playerId) {
    const settings = this.getPlayerTheme(playerId);

    return {
      playerId,
      exportDate: new Date().toISOString(),
      settings: {
        currentTheme: settings.currentTheme,
        customColors: settings.customColors,
        fontSize: settings.fontSize,
        layout: settings.layout,
        animations: settings.animations
      }
    };
  }

  /**
   * Import theme settings
   */
  importThemeSettings(playerId, backup) {
    if (!backup.settings) {
      return { success: false, message: 'Invalid backup format' };
    }

    const settings = this.getPlayerTheme(playerId);
    Object.assign(settings, backup.settings);

    return { success: true, message: 'Theme settings imported' };
  }

  /**
   * Get recommended theme for accessibility
   */
  getAccessibilityRecommendations(playerId, accessibility) {
    const recommendations = [];

    if (accessibility.colorblindness) {
      const type = accessibility.colorblindness;
      recommendations.push({
        theme: `colorblind_${type}`,
        name: this.THEMES[`colorblind_${type}`]?.name,
        reason: `Optimized for ${type}`
      });
    }

    if (accessibility.lightSensitivity) {
      recommendations.push({
        theme: 'dark',
        name: this.THEMES.dark.name,
        reason: 'Reduces eye strain'
      });
    }

    if (accessibility.lowVision) {
      recommendations.push({
        theme: 'highcontrast',
        name: this.THEMES.highcontrast.name,
        reason: 'Maximum contrast for visibility'
      });
    }

    return recommendations;
  }
}

export default UIThemeManager;
