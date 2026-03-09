/**
 * Features Module — Orchestrator
 * Imports all standalone feature files and wires them together.
 * 
 * Each feature file exports a default setup(app, deps, F, shared) function that returns:
 *   { hooks, backgroundTasks, masterData, exports? }
 * 
 * Already implemented in index.js/discord-events.js:
 *   F1  Moderation auto-escalation
 *   F4  Suggestion statuses
 *   F13 SmartBot conversation memory
 */

// Existing features (F2-F48, excluding F30-33)
import f02 from './f02-leveling-streaks.js';
import f03 from './f03-dashboard-themes.js';
import f05 from './f05-stats-channels.js';
import f06 from './f06-smart-slowmode.js';
import f07 from './f07-welcome-image.js';
import f08 from './f08-sticky-messages.js';
import f09 from './f09-auto-thread.js';
import f10 from './f10-giveaway-requirements.js';
import f11 from './f11-push-notifications.js';
import f12 from './f12-xp-blacklist.js';
import f14 from './f14-status-rotation.js';
import f15 from './f15-channel-lockdown.js';
import f16 from './f16-dashboard-prefs.js';
import f17 from './f17-bulk-moderation.js';
import f18 from './f18-log-search.js';
import f19 from './f19-auto-backup.js';
import f20 from './f20-member-milestones.js';
import f21 from './f21-channel-activity.js';
import f22 from './f22-event-sync.js';
import f24 from './f24-webhook-forwarding.js';
import f25 from './f25-twitch-clips.js';
import f26 from './f26-ticket-idle.js';
import f28 from './f28-auto-role-rejoin.js';
import f29 from './f29-birthday-system.js';
import f34 from './f34-warning-expiry.js';
import f35 from './f35-quarantine.js';
import f36 from './f36-mod-mail.js';
import f37 from './f37-media-only.js';
import f38 from './f38-auto-purge.js';
import f39 from './f39-engagement-heatmap.js';
import f40 from './f40-member-retention.js';
import f41 from './f41-server-health.js';
import f42 from './f42-voice-activity.js';
import f43 from './f43-rss-feeds.js';
import f44 from './f44-api-polling.js';
import f45 from './f45-timezone-helper.js';
import f46 from './f46-role-analytics.js';
import f47 from './f47-bookmarks.js';
import f48 from './f48-auto-responder.js';

// New features (F49-F60, excluding F50-52,54-56)
import f49 from './f49-scheduled-announcements.js';
import f53 from './f53-invite-tracker.js';
import f57 from './f57-scheduled-roles.js';
import f58 from './f58-anti-alt.js';
import f59 from './f59-dashboard-changelog.js';
import f60 from './f60-member-notes.js';

const featureModules = [
  f02, f03, f05, f06, f07, f08, f09, f10, f11, f12,
  f14, f15, f16, f17, f18, f19, f20, f21, f22, f24,
  f25, f26, f28, f29, f34, f35, f36, f37, f38, f39,
  f40, f41, f42, f43, f44, f45, f46, f47, f48,
  f49, f53, f57, f58, f59, f60
];

export function registerFeatures(app, deps) {
  const { addLog, client, requireAuth, saveState, state } = deps;

  // Shared feature state
  if (!state.features) state.features = {};
  const F = state.features;

  // Shared object for inter-feature communication
  const shared = {};

  // Collect results from all features
  const allHooks = {};
  const allBackgroundTasks = [];
  const allMasterData = [];

  for (const setupFn of featureModules) {
    const result = setupFn(app, deps, F, shared);

    // Merge hooks
    if (result.hooks) Object.assign(allHooks, result.hooks);

    // Collect background tasks
    if (result.backgroundTasks) allBackgroundTasks.push(...result.backgroundTasks);

    // Collect master data providers
    if (result.masterData) allMasterData.push(result.masterData);

    // Store exports for inter-feature use
    if (result.exports) Object.assign(shared, result.exports);
  }

  // Background task runner
  function startBackgroundTasks() {
    for (const task of allBackgroundTasks) {
      if (task.runOnStart) task.fn();
      if (task.intervalMs) setInterval(task.fn, task.intervalMs);
    }
    addLog('info', `Feature background tasks started (${allBackgroundTasks.length} tasks)`);
  }

  // Master features list endpoint
  app.get('/api/features', requireAuth, (req, res) => {
    const features = {};
    for (const getData of allMasterData) {
      try { Object.assign(features, getData()); } catch {}
    }
    res.json({ success: true, features });
  });

  // Start background tasks when Discord client is ready
  client.once('ready', () => startBackgroundTasks());
  if (client.isReady()) startBackgroundTasks();

  // Return all hooks + F reference for discord-events.js integration
  return { ...allHooks, F };
}
