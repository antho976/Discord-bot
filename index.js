/* ====================== 
   IMPORTS & SETUP
====================== */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import os from 'os';
import { createServer } from 'http';
import express from 'express';
import multer from 'multer';
import { Server } from 'socket.io';
import compression from 'compression';
import {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionsBitField,
  AuditLogEvent,
  AttachmentBuilder
} from 'discord.js';
import RPGBot from './Discord bot - test branch/rpg/RPGBot.js';
import { registerSmartBotRoutes } from './smartbot/routes/index.js';
import { registerRPGRoutes } from './modules/rpg-routes.js';
import { renderRPGEditorTab } from './modules/render/rpg-editor-tab.js';
import { initAnalyticsTabs, renderHealthTab, renderAnalyticsTab, renderEngagementStatsTab, renderStreaksMilestonesTab, renderTrendsStatsTab, renderGamePerformanceTab, renderViewerPatternsTab, renderAIInsightsTab, renderReportsTab, renderCommunityStatsTab, renderRPGEconomyTab, renderRPGQuestsCombatTab, renderStreamCompareTab, renderRPGAnalyticsTab, renderRPGEventsTab } from './modules/render/analytics-tabs.js';
import { initConfigTabs, renderSuggestionsTab, renderCommandsAndConfigTab, renderCommandsTab, renderConfigGeneralTab, renderConfigNotificationsTab, renderConfigTab, renderSettingsTab, renderCommandsTabContent, renderLevelingTab, renderNotificationsTab, renderYouTubeAlertsTab, renderCustomCommandsTab, renderGiveawaysTab, renderPollsTab, renderRemindersTab, renderEmbedsTab, renderWelcomeTab, renderProfileTab } from './modules/render/config-tabs.js';
import { initCommunityTabs, renderEventsTab, renderTab, renderModerationTab, renderTicketsTab, renderReactionRolesTab, renderScheduledMsgsTab, renderAutomodTab, renderStarboardTab, renderBotStatusTab, renderPetsTab, renderPetApprovalsTab, renderPetGiveawaysTab, renderPetStatsTab, renderIdleonDashboardTab, renderIdleonMembersTab, renderIdleonAdminTab, renderIdleonReviewsTab, renderToolsExportTab, renderToolsBackupsTab, renderAccountsTab, renderAuditLogTab, renderGuideIndexerTab } from './modules/render/community-tabs.js';
import { initRpgTabs, renderRPGWorldsTab, renderRPGQuestsTab, renderRPGValidatorsTab, renderRPGSimulatorsTab, renderRPGEntitiesTab, renderRPGSystemsTab, renderRPGAITab, renderRPGFlagsTab, renderRPGGuildTab, renderRPGAdminTab, renderRPGGuildStatsTab } from './modules/render/rpg-tabs.js';
import { SmartBot } from './smartbot/index.js';
import contentRoutes from './Discord bot - test branch/rpg/api/content-routes.js';
import { ITEMS } from './Discord bot - test branch/rpg/data/items.js';
import { RECIPES } from './Discord bot - test branch/rpg/data/professions.js';
import { registerExpressRoutes } from './modules/express-routes.js';
import { registerIdleonRoutes } from './modules/routes/idleon-routes.js';
import { registerDiscordEvents } from './modules/discord-events.js';
import { registerStreamManager } from './modules/stream-manager.js';
import { registerScheduleCard } from './modules/schedule-card.js';
import { registerFeatures } from './modules/features/index.js';
import {
  setupHelmet, setupCorsBlock, bodyLimitOptions, setupCsrf, clearCsrfToken,
  setupWaf, setupPostRateLimit, checkUploadRateLimit, setupSocketRateLimit,
  checkUsernameLockout, recordUsernameFailedLogin, clearUsernameLockout,
  validateImageMagicBytes, encryptField, decryptField, writeSecureFile,
  sanitizeString, validateStringInput, safePath,
  checkSignupRateLimit, generateOAuthState, validateOAuthState
} from './modules/security.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========== STRUCTURED LOGGING ==========
const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const LOG_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL || 'info'] ?? 1;
function log(level, category, message, meta = null) {
  if ((LOG_LEVELS[level] ?? 1) < LOG_LEVEL) return;
  const ts = new Date().toISOString();
  const prefix = `[${ts}] [${level.toUpperCase()}] [${category}]`;
  const line = meta ? `${prefix} ${message} ${JSON.stringify(meta)}` : `${prefix} ${message}`;
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.User,
    Partials.GuildMember
  ],
  // Sweep old cached messages to reduce memory usage
  sweepers: {
    messages: { interval: 300, lifetime: 600 },       // Sweep messages older than 10min, check every 5min
  }
});

const AUDIT_LOG_FLUSH_MS = 2000;
const AUDIT_LOG_MAX_EMBEDS = 10;
const auditLogQueue = [];
let auditLogFlushTimer = null;
let auditLogFlushRunning = false;
const auditExecutorCache = new Map();

// ========== RESOURCE OPTIMIZATIONS ==========
// Debounced saveState — writes at most once per 5 seconds
let _saveStateTimer = null;
let _saveStatePending = false;
function debouncedSaveState() {
  _saveStatePending = true;
  if (!_saveStateTimer) {
    _saveStateTimer = setTimeout(() => {
      _saveStateTimer = null;
      if (_saveStatePending) {
        _saveStatePending = false;
        saveState();
      }
    }, 5000);
  }
}

// Debounced log writes — flush at most once per 3 seconds
let _logWriteTimer = null;
let _logDirty = false;
function flushLogs() {
  if (_logDirty) {
    _logDirty = false;
    try { fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2)); } catch {}
  }
}
function scheduleLogFlush() {
  _logDirty = true;
  if (!_logWriteTimer) {
    _logWriteTimer = setTimeout(() => {
      _logWriteTimer = null;
      flushLogs();
    }, 3000);
  }
}

// Analytics tab cache — re-renders only every 30 seconds
const _analyticsCache = {};
const ANALYTICS_CACHE_TTL = 30000; // 30s
function getCachedAnalytics(tabKey, renderFn) {
  const entry = _analyticsCache[tabKey];
  if (entry && (Date.now() - entry.time) < ANALYTICS_CACHE_TTL) return entry.html;
  const html = renderFn();
  _analyticsCache[tabKey] = { html, time: Date.now() };
  return html;
}
function invalidateAnalyticsCache() {
  Object.keys(_analyticsCache).forEach(k => delete _analyticsCache[k]);
}

// RPG file cache — caches parsed JSON for 10 seconds
const _rpgFileCache = {};
const RPG_CACHE_TTL = 10000;
function cachedReadJSON(filePath) {
  const entry = _rpgFileCache[filePath];
  if (entry && (Date.now() - entry.time) < RPG_CACHE_TTL) return entry.data;
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  _rpgFileCache[filePath] = { data, time: Date.now() };
  return data;
}
function invalidateRPGCache(filePath) {
  if (filePath) delete _rpgFileCache[filePath];
  else Object.keys(_rpgFileCache).forEach(k => delete _rpgFileCache[k]);
}
// ========== END OPTIMIZATIONS ==========

// Initialize RPG system
const rpgBot = new RPGBot(client);

// Initialize Smart Local Bot
const smartBot = new SmartBot();

// Pass API keys from env to smart bot
smartBot.setApiKeys({
  weatherApi: process.env.WEATHER_API_KEY || '',
  openWeatherMap: process.env.OPENWEATHER_API_KEY || '',
  newsApi: process.env.NEWS_API_KEY || '',
  omdb: process.env.OMDB_API_KEY || '',
  tmdb: process.env.TMDB_API_KEY || '',
  rawg: process.env.RAWG_API_KEY || '',
  groq: process.env.GROQ_API_KEY || '',
  huggingface: process.env.HUGGINGFACE_API_KEY || '',
});

/* ======================
   FILE STORAGE
====================== */
const SOURCE_DATA_DIR = path.join(__dirname, 'data');
const DATA_DIR = process.env.PERSISTENT_DATA_DIR ? path.join(process.env.PERSISTENT_DATA_DIR, 'data') : './data';
const UPLOADS_PERSIST_DIR = process.env.PERSISTENT_DATA_DIR ? path.join(process.env.PERSISTENT_DATA_DIR, 'uploads') : path.join(__dirname, 'uploads');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_PERSIST_DIR)) fs.mkdirSync(UPLOADS_PERSIST_DIR, { recursive: true });

// Seed persistent data dir from repo on first run
if (process.env.PERSISTENT_DATA_DIR && fs.existsSync(SOURCE_DATA_DIR)) {
  const sourceFiles = fs.readdirSync(SOURCE_DATA_DIR).filter(f => f.endsWith('.json'));
  for (const file of sourceFiles) {
    const dest = path.join(DATA_DIR, file);
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(path.join(SOURCE_DATA_DIR, file), dest);
      console.log(`[Persist] Seeded ${file} to persistent storage`);
    }
  }
}

// Fix any absolute image URLs in pets.json to relative paths
// Also merge any new catalog pets from repo into persistent storage
try {
  const petsFile = path.join(DATA_DIR, 'pets.json');
  const sourcePetsFile = path.join(SOURCE_DATA_DIR, 'pets.json');
  if (fs.existsSync(petsFile) && fs.existsSync(sourcePetsFile)) {
    const pData = JSON.parse(fs.readFileSync(petsFile, 'utf8'));
    const srcData = JSON.parse(fs.readFileSync(sourcePetsFile, 'utf8'));
    let fixed = false;

    // Merge new catalog entries from repo that don't exist in persistent
    const existingIds = new Set((pData.catalog || []).map(p => p.id));
    for (const srcPet of (srcData.catalog || [])) {
      if (!existingIds.has(srcPet.id)) {
        pData.catalog = pData.catalog || [];
        pData.catalog.push(srcPet);
        fixed = true;
        console.log(`[Persist] Merged new pet "${srcPet.name}" into persistent catalog`);
      }
    }

    // Merge new categories from repo
    if (srcData.categories && Array.isArray(srcData.categories)) {
      pData.categories = pData.categories || [];
      for (const cat of srcData.categories) {
        if (!pData.categories.includes(cat)) {
          pData.categories.push(cat);
          fixed = true;
        }
      }
    }

    // Fix absolute image URLs to relative
    for (const p of (pData.catalog || [])) {
      // Migrate "General" category pets to "Exclusive Companions"
      if (p.category === 'General') {
        p.category = 'Exclusive Companions';
        fixed = true;
        console.log(`[Persist] Migrated pet "${p.name}" from General to Exclusive Companions`);
      }
      if (p.imageUrl && p.imageUrl.includes('/uploads/') && p.imageUrl.startsWith('http')) {
        p.imageUrl = '/uploads/' + p.imageUrl.split('/uploads/').pop();
        fixed = true;
      }
      if (p.animatedUrl && p.animatedUrl.includes('/uploads/') && p.animatedUrl.startsWith('http')) {
        p.animatedUrl = '/uploads/' + p.animatedUrl.split('/uploads/').pop();
        fixed = true;
      }
    }

    // Remove "General" from categories list if present (migrated to Exclusive Companions)
    if (pData.categories && pData.categories.includes('General')) {
      pData.categories = pData.categories.filter(c => c !== 'General');
      fixed = true;
    }

    if (fixed) {
      fs.writeFileSync(petsFile, JSON.stringify(pData, null, 2));
      console.log('[Persist] Updated pets.json in persistent storage');
    }
  }
} catch (e) { console.error('[Persist] Error fixing pet image URLs:', e.message); }

// Seed state.json to persistent storage on first run
// Also merge history/stats from repo if persistent state is empty
if (process.env.PERSISTENT_DATA_DIR) {
  const persistStatePath = path.join(process.env.PERSISTENT_DATA_DIR, 'state.json');
  const repoStatePath = path.resolve('./state.json');
  if (!fs.existsSync(persistStatePath) && fs.existsSync(repoStatePath)) {
    fs.copyFileSync(repoStatePath, persistStatePath);
    console.log('[Persist] Seeded state.json to persistent storage');
  } else if (fs.existsSync(persistStatePath) && fs.existsSync(repoStatePath)) {
    // Merge: if persistent state has no history but repo does, copy it over
    try {
      const persistState = JSON.parse(fs.readFileSync(persistStatePath, 'utf8'));
      const repoState = JSON.parse(fs.readFileSync(repoStatePath, 'utf8'));
      let merged = false;
      if ((!persistState.history || persistState.history.length === 0) && repoState.history && repoState.history.length > 0) {
        persistState.history = repoState.history;
        merged = true;
        console.log(`[Persist] Merged ${repoState.history.length} history entries from repo`);
      }
      if ((!persistState.stats || persistState.stats.totalStreams === 0) && repoState.stats && repoState.stats.totalStreams > 0) {
        persistState.stats = repoState.stats;
        merged = true;
        console.log('[Persist] Merged stats from repo');
      }
      if (merged) {
        fs.writeFileSync(persistStatePath, JSON.stringify(persistState, null, 2));
        console.log('[Persist] Updated persistent state.json with merged data');
      }
    } catch (e) { console.error('[Persist] Error merging state:', e.message); }
  }
}

const LOG_FILE = `${DATA_DIR}/logs.json`;
const CONFIG_FILE = `${DATA_DIR}/config.json`;
const STATE_PATH = process.env.PERSISTENT_DATA_DIR ? path.join(process.env.PERSISTENT_DATA_DIR, 'state.json') : path.resolve('./state.json');
const RPG_WORLDS_FILE = path.join(DATA_DIR, 'rpg-worlds.json');

function loadRPGWorlds() {
  try {
    if (fs.existsSync(RPG_WORLDS_FILE)) {
      const data = fs.readFileSync(RPG_WORLDS_FILE, 'utf8');
      global.rpgWorlds = JSON.parse(data);
      let migrated = false;
      for (const world of Object.values(global.rpgWorlds || {})) {
        if (!world.entities) {
          world.entities = { monsters: {}, items: {}, npcs: {}, locations: {}, dungeons: {}, raids: {}, worldBosses: {}, quests: {} };
          migrated = true;
        }
        if (!world.entities.quests) {
          world.entities.quests = {};
          migrated = true;
        }
        if (world.quests && typeof world.quests === 'object') {
          for (const [category, list] of Object.entries(world.quests)) {
            if (!Array.isArray(list)) continue;
            list.forEach(q => {
              if (!q?.id) return;
              if (!world.entities.quests[q.id]) {
                world.entities.quests[q.id] = {
                  ...q,
                  type: q.type || category,
                  category: q.category || category
                };
                migrated = true;
              }
            });
          }
        }
      }
      if (migrated) saveRPGWorlds();
      console.log(`[INFO] Loaded ${Object.keys(global.rpgWorlds).length} RPG worlds from file`);
    } else {
      global.rpgWorlds = {};
      console.log('[INFO] No RPG worlds file found, starting fresh');
    }
  } catch (err) {
    console.error('[ERROR] Failed to load RPG worlds:', err);
    global.rpgWorlds = {};
  }
}

function saveRPGWorlds() {
  try {
    const dir = path.dirname(RPG_WORLDS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(RPG_WORLDS_FILE, JSON.stringify(global.rpgWorlds, null, 2));
  } catch (err) {
    console.error('[ERROR] Failed to save RPG worlds:', err);
  }
}

const DAY_MAP = {
  sun: 'sunday', sunday: 'sunday',
  mon: 'monday', monday: 'monday',
  tue: 'tuesday', tues: 'tuesday', tuesday: 'tuesday',
  wed: 'wednesday', weds: 'wednesday', wednesday: 'wednesday',
  thu: 'thursday', thur: 'thursday', thursday: 'thursday',
  fri: 'friday', friday: 'friday',
  sat: 'saturday', saturday: 'saturday'
};

const DAY_INDEX = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6
};

/* ======================
   LOAD LOGS
====================== */
let logs = [];
if (fs.existsSync(LOG_FILE)) {
  try { logs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')); } catch {}
}

const logSSEClients = new Set();

function notifyLogClients(entry) {
  const payload = `data: ${JSON.stringify(entry)}\n\n`;
  for (const client of logSSEClients) {
    try {
      client.write(payload);
    } catch {
      logSSEClients.delete(client);
    }
  }
}

function addLog(type, msg) {
  const time = new Date().toLocaleTimeString();
  const entry = { time, type, msg, ts: Date.now() };

  logs.unshift(entry);
  if (logs.length > 200) logs.pop();

  scheduleLogFlush();
  notifyLogClients(entry);
  console.log(`[${time}] [${type.toUpperCase()}] ${msg}`);

  // SAFEGUARD: Auto-refresh token if we detect auth errors
  if (type === 'error' && msg.toLowerCase().includes('token') && (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('expired'))) {
    const now = Date.now();
    // Only attempt refresh once every 5 minutes to avoid spam
    if (!lastTokenRefreshAttempt || (now - lastTokenRefreshAttempt) > 5 * 60 * 1000) {
      lastTokenRefreshAttempt = now;
      addLog('warn', '🛡️ Token error detected! Auto-attempting refresh...');
      refreshTwitchToken().then(success => {
        if (success) {
          addLog('info', '✅ Safeguard activated: Token auto-refreshed successfully!');
        } else {
          addLog('error', '⚠️ Safeguard: Token auto-refresh failed. Check your refresh token.');
        }
      }).catch(err => {
        addLog('error', `Safeguard refresh error: ${err.message}`);
      });
    }
  }
}

function addAuditLogEntry(entry) {
  // Store in audit log history for searchable dashboard
  addToAuditLogHistory(entry);
}

function isExcludedBySettings({ userId, channelId, roleIds }) {
  if (!auditLogSettings?.enabled) return true;
  if (channelId && Array.isArray(auditLogSettings.excludedChannels) && auditLogSettings.excludedChannels.includes(channelId)) return true;
  if (userId && Array.isArray(auditLogSettings.excludedUsers) && auditLogSettings.excludedUsers.includes(userId)) return true;
  if (roleIds && Array.isArray(auditLogSettings.excludedRoles) && auditLogSettings.excludedRoles.length) {
    if (roleIds.some(id => auditLogSettings.excludedRoles.includes(id))) return true;
  }
  return false;
}

async function getAuditExecutor(guild, auditType, targetId) {
  try {
    const cacheKey = `${auditType}:${targetId}`;
    const cached = auditExecutorCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    if (!guild?.members?.me?.permissions?.has(PermissionsBitField.Flags.ViewAuditLog)) return null;
    const logs = await guild.fetchAuditLogs({ type: auditType, limit: 6 });
    const entry = logs.entries.find(e => e?.target?.id === targetId && (Date.now() - e.createdTimestamp) < 15000);
    if (!entry) return null;
    const result = {
      id: entry.executor?.id || null,
      tag: entry.executor?.tag || entry.executor?.username || null,
      reason: entry.reason || null
    };
    auditExecutorCache.set(cacheKey, { value: result, expiresAt: Date.now() + 15000 });
    return result;
  } catch {
    return null;
  }
}

function getMemberRoleIds(member) {
  if (!member?.roles?.cache) return [];
  return [...member.roles.cache.keys()];
}

process.on('unhandledRejection', (reason) => {
  const message = reason instanceof Error ? reason.stack || reason.message : String(reason);
  try { addLog('error', `Unhandled promise rejection: ${message}`); } catch {}
});

process.on('uncaughtException', (err) => {
  try { addLog('error', `Uncaught exception: ${err?.stack || err?.message || String(err)}`); } catch {}
  try { saveState(); } catch {}
  process.exit(1);
});

function truncateLogText(text, max = 900) {
  if (text === null || text === undefined) return '';
  const str = String(text);
  if (str.length <= max) return str;
  return str.slice(0, max - 3) + '...';
}

async function sendAuditLog(payload) {
  try {
    if (!auditLogSettings?.enabled) return;
    const eventType = payload.eventType || 'unknown';
    const perEventChannel = auditLogSettings.perEventChannels?.[eventType];
    const mainChannel = auditLogSettings.channelId;
    if (!mainChannel && !perEventChannel) return;
    payload.targetChannel = perEventChannel || mainChannel;
    payload.targetPings = auditLogSettings.perEventPings?.[eventType] || [];
    auditLogQueue.push(payload);
    if (!auditLogFlushTimer) {
      auditLogFlushTimer = setInterval(() => {
        flushAuditLogQueue().catch(() => {});
      }, AUDIT_LOG_FLUSH_MS);
    }
  } catch (err) {
    addLog('error', `Audit log send failed: ${err.message}`);
  }
}

async function flushAuditLogQueue() {
  if (auditLogFlushRunning) return;
  if (auditLogQueue.length === 0) return;
  auditLogFlushRunning = true;
  try {
    const queueByChannel = {};
    while (auditLogQueue.length > 0) {
      const next = auditLogQueue.shift();
      const targetChannel = next.targetChannel;
      if (!targetChannel) continue;
      if (!queueByChannel[targetChannel]) queueByChannel[targetChannel] = [];
      if (next?.embeds?.length) {
        for (const e of next.embeds) {
          queueByChannel[targetChannel].push({ embed: e, pings: next.targetPings });
        }
      }
    }
    for (const [channelId, items] of Object.entries(queueByChannel)) {
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel || !channel.isTextBased()) continue;
      const batches = [];
      for (let i = 0; i < items.length; i += AUDIT_LOG_MAX_EMBEDS) {
        batches.push(items.slice(i, i + AUDIT_LOG_MAX_EMBEDS));
      }
      for (const batch of batches) {
        const embeds = batch.map(x => x.embed);
        const allPings = [...new Set(batch.flatMap(x => x.pings))];
        const content = allPings.length > 0 ? allPings.join(' ') : '';
        await channel.send({ content, embeds });
      }
    }
  } catch (err) {
    addLog('error', `Audit log flush failed: ${err.message}`);
  } finally {
    auditLogFlushRunning = false;
  }
}

function logNotification(type, message, details = {}) {
  const entry = { type, message, timestamp: new Date().toISOString(), details };
  notificationHistory.unshift(entry);
  if (notificationHistory.length > 100) notificationHistory.pop();
  saveState();
}

function recomputeStreamStatsFromHistory() {
  try {
    if (!Array.isArray(history)) return;
    const totalStreams = history.length;
    let peakViewers = 0;
    let totalViewers = 0;
    let avgViewersSum = 0;
    let avgCount = 0;

    for (const h of history) {
      if (!h) continue;
      const peak = h.peakViewers ?? h.viewers ?? 0;
      if (peak > peakViewers) peakViewers = peak;

      const avg = h.avgViewers ?? h.viewers ?? 0;
      avgViewersSum += avg;
      if (avg > 0) avgCount++;

      totalViewers += avg;
    }

    stats.totalStreams = totalStreams;
    stats.peakViewers = peakViewers;
    stats.totalViewers = totalViewers;
    stats.avgViewers = avgCount ? Math.round(avgViewersSum / avgCount) : 0;
  } catch (err) {
    addLog('error', `recomputeStreamStatsFromHistory failed: ${err.message}`);
  }
}

function isOnCooldown(key, cooldownMs = 300000) {
  const lastTime = alertCooldowns[key];
  if (!lastTime) return false;
  const elapsed = Date.now() - lastTime;
  return elapsed < cooldownMs;
}

function setCooldown(key) {
  alertCooldowns[key] = Date.now();
  debouncedSaveState();
}

function trackActivity(viewers) {
  const hour = new Date().getHours();
  const key = `${new Date().toISOString().split('T')[0]}_${hour}`;
  if (!activityHeatmap[key]) activityHeatmap[key] = [];
  activityHeatmap[key].push(viewers);
  debouncedSaveState();
}

function trackStreamViewers(viewers) {
  const now = Date.now();
  currentStreamViewerData.push({
    timestamp: now,
    viewers: viewers,
    time: new Date(now).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  });
  if (currentStreamViewerData.length > 1000) {
    currentStreamViewerData.shift();
  }
  debouncedSaveState();
}

function ensureCurrentStreamGameTimelineInitialized(initialGame = null) {
  if (!streamVars.isLive) return;
  if (!streamVars.lastStreamId) return;
  if (!Array.isArray(currentStreamGameTimeline)) currentStreamGameTimeline = [];
  if (currentStreamGameTimeline.length > 0) {
    const first = currentStreamGameTimeline[0];
    if (first && first.streamId && streamVars.lastStreamId && first.streamId !== streamVars.lastStreamId) {
      currentStreamGameTimeline = [];
    } else {
      return;
    }
  }
  const game = (initialGame || (history[history.length - 1]?.game) || '').toString().trim();
  if (!game) return;
  currentStreamGameTimeline = [{
    streamId: streamVars.lastStreamId,
    game,
    startMs: Date.now(),
    endMs: null
  }];
  saveState();
}

const defaultState = {
  isLive: false,
  lastStreamId: null,
  announcementMessageId: null,
  stats: { totalStreams: 0, peakViewers: 0, totalViewers: 0 },
  history: [],
  schedule: {
    nextStreamAt: null,
    alertsSent: { oneHour: false, tenMin: false },
    noStreamToday: false,
    streamDelayed: false,
    alertsEnabledToday: true,
    weekly: {},
    days: {}
  },
  streamMetadata: {
    lastTitle: null,
    lastGame: null,
    lastFollowers: 0,
    lastSubs: 0,
    streamStartTime: null,
    titleChangeDetected: false,
    gameChangeDetected: false,
    lastVodCheck: null
  },
  engagementSettings: {
    titleChangeNotif: true,
    gameChangeNotif: true,
    vodNotif: true,
    raidNotif: true,
    clipNotif: true,
    followMilestones: [100, 500, 1000, 5000, 10000],
    viewerMilestones: [100, 250, 500, 1000],
    lastFollowerMilestone: 0,
    lastViewerMilestone: 0,
    autoDeleteTitleChange: false,
    autoDeleteGameChange: false,
    autoDeleteVod: false,
    autoDeleteRaid: false,
    autoDeleteClip: false,
    autoDeleteFollowerMilestone: false,
    autoDeleteViewerMilestone: false,
    autoDeleteDelay: 60000
  },
  suggestions: [],
  warnings: {},
  startTime: Date.now(),
  botTimezone: 'America/Toronto',
  notificationHistory: [],
  customCommands: [],
  commandUsage: {},
  activityHeatmap: {},
  followerHistory: [],
  subHistory: [],
  alertCooldowns: {},
  dashboardSettings: {
    customLiveMessage: null,
    offlineThreshold: 120000,
    suggestionCooldownMinutes: 60,
    alertRoles: {
      liveAlert: null,
      scheduleAlert: null,
      suggestionAlert: null
    },
    hitMilestonesThisStream: {},
    levelUpChannelId: null,
    levelUpPingPlayer: true,
    youtubeAlerts: {
      enabled: false,
      template: '📺 **{channelName}** uploaded **{title}**\n{url}\nPublished: {publishedAt}',
      rewardButtonLabel: '🎁 Claim Reward',
      feeds: [],
      claims: {},
      health: {
        lastCheckAt: null,
        lastSuccessAt: null,
        lastError: null,
        lastDurationMs: null,
        lastCheckedFeeds: 0
      },
      youtubeChannelId: '',
      alertChannelId: null,
      alertRoleId: null,
      lastVideoId: null,
      lastPublishedAt: null
    },
    welcomeSettings: {
      enabled: false,
      channelId: null,
      message: 'Welcome {user} to {server}!',
      autoRoles: []
    },
    auditLogSettings: {
      enabled: false,
      channelId: null,
      logMessageEdits: true,
      logMessageDeletes: true,
      logMessageBulkDeletes: true,
      logMessagePins: true,
      logUsernameChanges: true,
      logAvatarChanges: true,
      logNicknameChanges: true,
      logRoleChanges: true,
      logMemberJoins: true,
      logMemberLeaves: true,
      logMemberBans: true,
      logMemberUnbans: true,
      logMemberTimeouts: true,
      logMemberMutes: true,
      logMemberBoosts: true,
      logJoinPosition: true,
      logServerUpdates: true,
      logIntegrations: true,
      warnNewAccounts: true,
      newAccountThresholdDays: 7,
      excludedChannels: [],
      excludedRoles: [],
      excludedUsers: [],
      muteRoleIds: []
    },
    rpgSettings: {
      channelRestrictionEnabled: false,
      allowedChannelIds: []
    }
  },
  leveling: {},
  levelingConfig: {
    xpPerMessageMin: 15,
    xpPerMessageMax: 25,
    messageCooldownMs: 45000,
    xpPerVoiceMinute: 5,
    xpPerReaction: 2,
    xpMultiplier: 1,
    multiplierEndTime: null,
    levelMilestones: [10, 25, 50, 100],
    roleRewards: {},
    xpMode: 'increment',
    baseXp: 100,
    xpIncrement: 50,
    customXpPerLevel: {},
    prestigeThresholds: {}
  },
  prestige: {},
  weeklyLeveling: {},
  lastWeeklyReset: Date.now(),
  currentStreamViewerData: [],
  currentStreamGameTimeline: [],
  viewerGraphHistory: [],
  giveaways: [],
  polls: [],
  reminders: [],
  notificationFilters: [],
  streamGoals: {
    monthlyFollowers: 0,
    monthlyHours: 0,
    monthlyStreams: 0,
    monthlyPeakViewers: 0,
    resetDay: 1
  },
  rpgTestMode: false,
  rpgEvents: {
    milestoneEvents: [
      { id: 'xp_boost_50', viewerThreshold: 50, type: 'xp_boost', multiplier: 2, duration: 30, name: '⚡ Double XP', description: '2x XP for 30 minutes!', emoji: '⚡', enabled: true },
      { id: 'secret_dungeon_100', viewerThreshold: 100, type: 'secret_dungeon', dungeonId: 'viewers_cave', duration: 60, name: '🏰 Secret Dungeon', description: 'A hidden dungeon unlocks for 1 hour!', emoji: '🏰', enabled: true },
      { id: 'gold_rain_150', viewerThreshold: 150, type: 'gold_rain', goldAmount: 5000, name: '💰 Gold Rain', description: 'All active players receive 5000 gold!', emoji: '💰', enabled: true },
      { id: 'boss_spawn_200', viewerThreshold: 200, type: 'boss_spawn', bossName: 'Viewer Dragon', duration: 45, name: '🐉 World Boss', description: 'A massive world boss appears!', emoji: '🐉', enabled: true },
      { id: 'loot_boost_250', viewerThreshold: 250, type: 'loot_boost', multiplier: 3, duration: 30, name: '🎁 Triple Loot', description: '3x loot drops for 30 minutes!', emoji: '🎁', enabled: true }
    ],
    activeEvents: [],
    eventHistory: [],
    triggeredThisStream: {}
  },
  // ========== NEW FEATURES STATE ==========
  afkUsers: {},           // { odId: { reason, timestamp } }
  tempBans: [],           // [{ odId, guildId, unbanAt, reason, moderator }]
  tempRoles: [],          // [{ odId, roleId, guildId, removeAt, addedBy }]
  boosterAutoRoles: [],   // [roleId, ...] — roles to assign when user boosts
  modEscalation: {        // Auto-escalation config
    enabled: false,
    warnThresholds: [
      { warns: 3, action: 'timeout', duration: 600 },    // 3 warns = 10min timeout
      { warns: 5, action: 'timeout', duration: 3600 },   // 5 warns = 1h timeout
      { warns: 7, action: 'kick' },                       // 7 warns = kick
      { warns: 10, action: 'ban' }                        // 10 warns = ban
    ]
  },
  suggestionSettings: {
    channelId: null,
    statusUpdates: true,   // DM user on status change
    votingEnabled: true     // Enable upvote/downvote buttons
  },
  userMemory: {}           // { odId: { facts: [], lastInteraction } } for SmartBot
};

function loadState() {
  try {
    if (!fs.existsSync(STATE_PATH))
      return JSON.parse(JSON.stringify(defaultState));

    const raw = fs.readFileSync(STATE_PATH, 'utf8');
    if (!raw.trim())
      return JSON.parse(JSON.stringify(defaultState));

    const parsed = JSON.parse(raw);

    return {
      ...defaultState,
      ...parsed,
      stats: {
        ...defaultState.stats,
        ...(parsed.stats || {})
      },
      schedule: {
        ...defaultState.schedule,
        ...(parsed.schedule || {}),
        alertsSent: {
          ...defaultState.schedule.alertsSent,
          ...(parsed.schedule?.alertsSent || {})
        }
      },
      streamMetadata: {
        ...defaultState.streamMetadata,
        ...(parsed.streamMetadata || {})
      },
      engagementSettings: {
        ...defaultState.engagementSettings,
        ...(parsed.engagementSettings || {})
      },
      suggestions: parsed.suggestions || [],
      warnings: parsed.warnings || {},
      startTime: parsed.startTime || Date.now(),
      botTimezone: parsed.botTimezone || 'America/Toronto',
      notificationHistory: parsed.notificationHistory || [],
      customCommands: (parsed.customCommands || []).map(cmd => ({
        ...cmd,
        imageUrl: cmd.imageUrl || ''
      })),
      activityHeatmap: parsed.activityHeatmap || {},
      followerHistory: parsed.followerHistory || [],
      subHistory: parsed.subHistory || [],
      alertCooldowns: parsed.alertCooldowns || {},
      dashboardSettings: {
        ...defaultState.dashboardSettings,
        ...(parsed.dashboardSettings || {})
      },
      leveling: parsed.leveling || {},
      levelingConfig: {
        ...defaultState.levelingConfig,
        ...(parsed.levelingConfig || {})
      },
      prestige: parsed.prestige || {},
      weeklyLeveling: parsed.weeklyLeveling || {},
      lastWeeklyReset: parsed.lastWeeklyReset || Date.now(),
      currentStreamViewerData: parsed.currentStreamViewerData || [],
      currentStreamGameTimeline: parsed.currentStreamGameTimeline || [],
      viewerGraphHistory: parsed.viewerGraphHistory || [],
      giveaways: parsed.giveaways || [],
      polls: parsed.polls || [],
      reminders: parsed.reminders || [],
      notificationFilters: parsed.notificationFilters || [],
      twitchTokens: parsed.twitchTokens || { access_token: null, refresh_token: null, expires_at: null }
    };
  } catch {
    return JSON.parse(JSON.stringify(defaultState));
  }
}

const state = loadState();

const streamVars = {
  isLive: state.isLive ?? defaultState.isLive,
  lastStreamId: state.lastStreamId ?? defaultState.lastStreamId,
  announcementMessageId: state.announcementMessageId ?? defaultState.announcementMessageId,
  suppressNextAnnounce: false,
  isCheckingStream: false,
  offlineDetectedAt: null,
  lastStreamCheckAt: null,
  TWITCH_ACCESS_TOKEN: '',
  BROADCASTER_ID: process.env.BROADCASTER_ID || null,
};
let stats = state.stats ?? JSON.parse(JSON.stringify(defaultState.stats));
let history = state.history ?? [];
// Normalize: duration is stored in seconds, compute durationMinutes for all analytics
history.forEach(s => { if (s.duration != null && s.durationMinutes == null) s.durationMinutes = Math.round(s.duration / 60); });
let schedule = state.schedule ?? JSON.parse(JSON.stringify(defaultState.schedule));
let streamMetadata = state.streamMetadata ?? JSON.parse(JSON.stringify(defaultState.streamMetadata));
let engagementSettings = state.engagementSettings ?? JSON.parse(JSON.stringify(defaultState.engagementSettings));
let suggestions = state.suggestions ?? [];
let warnings = state.warnings ?? {};
let startTime = state.startTime ?? Date.now();
let notificationHistory = state.notificationHistory ?? [];
let customCommands = state.customCommands ?? [];
let activityHeatmap = state.activityHeatmap ?? {};
let followerHistory = state.followerHistory ?? [];
let subHistory = state.subHistory ?? [];
let alertCooldowns = state.alertCooldowns ?? {};
let lastResetDate = state.lastResetDate ?? null;
let leveling = state.leveling ?? {};
let rpgTestMode = state.rpgTestMode ?? false;
let rpgEvents = state.rpgEvents ?? JSON.parse(JSON.stringify(defaultState.rpgEvents));
let streamGoals = state.streamGoals ?? JSON.parse(JSON.stringify(defaultState.streamGoals));

// ========== NEW FEATURES STATE ==========
let afkUsers = state.afkUsers ?? {};
let tempBans = state.tempBans ?? [];
let tempRoles = state.tempRoles ?? [];
let boosterAutoRoles = state.boosterAutoRoles ?? [];
let modEscalation = state.modEscalation ?? JSON.parse(JSON.stringify(defaultState.modEscalation));
let suggestionSettings = state.suggestionSettings ?? JSON.parse(JSON.stringify(defaultState.suggestionSettings));
let userMemory = state.userMemory ?? {};

// Load SmartBot AI state
smartBot.loadFromJSON(state.smartBot || null);
let levelingConfig = {
  ...defaultState.levelingConfig,
  ...(state.levelingConfig || {})
};
let prestigeHistory = state.prestigeHistory || []; // Array of {userId, username, prestigeLevel, timestamp}
let twitchTokens = state.twitchTokens ?? { access_token: null, refresh_token: null, expires_at: null };
let lastTokenRefreshAttempt = null; // Cooldown for token refresh attempts
const defaultDashboardSettings = {
  customLiveMessage: null,
  offlineThreshold: 120000, // 2 minutes in ms
  suggestionCooldownMinutes: 60,
  alertRoles: {
    liveAlert: null,
    scheduleAlert: null,
    suggestionAlert: null
  },
  hitMilestonesThisStream: {},
  levelUpChannelId: null,
  levelUpPingPlayer: true,
  youtubeAlerts: {
    enabled: false,
    template: '📺 **{channelName}** uploaded **{title}**\n{url}\nPublished: {publishedAt}',
    rewardButtonLabel: '🎁 Claim Reward',
    feeds: [],
    claims: {},
    health: {
      lastCheckAt: null,
      lastSuccessAt: null,
      lastError: null,
      lastDurationMs: null,
      lastCheckedFeeds: 0
    },
    youtubeChannelId: '',
    alertChannelId: null,
    alertRoleId: null,
    lastVideoId: null,
    lastPublishedAt: null
  },
  auditLogSettings: {
    enabled: false,
    channelId: null,
    logMessageEdits: true,
    logMessageDeletes: true,
    logMessageBulkDeletes: true,
    logMessagePins: true,
    logUsernameChanges: true,
    logAvatarChanges: true,
    logNicknameChanges: true,
    logRoleChanges: true,
    logMemberJoins: true,
    logMemberLeaves: true,
    logMemberBans: true,
    logMemberUnbans: true,
    logMemberTimeouts: true,
    logMemberMutes: true,
    logMemberBoosts: true,
    logJoinPosition: true,
    logServerUpdates: true,
    logIntegrations: true,
    warnNewAccounts: true,
    newAccountThresholdDays: 7,
    excludedChannels: [],
    excludedRoles: [],
    excludedUsers: [],
    muteRoleIds: []
  },
  rpgSettings: {
    channelRestrictionEnabled: false,
    allowedChannelIds: []
  }
};

let dashboardSettings = {
  ...defaultDashboardSettings,
  ...(state.dashboardSettings || {})
};

function normalizeYouTubeFeed(feed = {}, fallbackId = '') {
  const id = String(feed.id || fallbackId || crypto.randomUUID().slice(0, 8)).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || crypto.randomUUID().slice(0, 8);
  const roleMatch = String(feed.alertRoleId || '').match(/\d{16,22}/);
  const channelMatch = String(feed.alertChannelId || '').match(/\d{16,22}/);
  const rewardRoleMatch = String(feed.rewardRoleId || '').match(/\d{16,22}/);
  const ytMatch = String(feed.youtubeChannelId || '').match(/UC[\w-]{20,}/);
  return {
    id,
    name: String(feed.name || `Feed ${id}`).trim() || `Feed ${id}`,
    youtubeChannelId: ytMatch ? ytMatch[0] : String(feed.youtubeChannelId || '').trim(),
    alertChannelId: channelMatch ? channelMatch[0] : null,
    alertRoleId: roleMatch ? roleMatch[0] : null,
    rewardChance: Math.min(100, Math.max(0, parseInt(feed.rewardChance, 10) || 100)),
    rewardXp: Math.max(0, parseInt(feed.rewardXp, 10) || 0),
    rewardXpMin: Math.max(0, parseInt(feed.rewardXpMin, 10) || parseInt(feed.rewardXp, 10) || 0),
    rewardXpMax: Math.max(0, parseInt(feed.rewardXpMax, 10) || parseInt(feed.rewardXpMin, 10) || parseInt(feed.rewardXp, 10) || 0),
    rewardRoleId: rewardRoleMatch ? rewardRoleMatch[0] : null,
    rewardRoleDuration: Math.max(0, parseInt(feed.rewardRoleDuration, 10) || 0),
    rewardRoleChance: Math.min(100, Math.max(0, parseInt(feed.rewardRoleChance, 10) || 100)),
    rewardMultiplier: Math.max(1, Number(feed.rewardMultiplier) || 1),
    rewardDurationMinutes: Math.max(1, parseInt(feed.rewardDurationMinutes, 10) || 60),
    lastVideoId: feed.lastVideoId || null,
    lastPublishedAt: feed.lastPublishedAt || null,
    lastAlertMessageId: feed.lastAlertMessageId || null,
    lastCheckAt: feed.lastCheckAt || null,
    lastSuccessAt: feed.lastSuccessAt || null,
    lastError: feed.lastError || null,
    lastDurationMs: Number.isFinite(feed.lastDurationMs) ? Number(feed.lastDurationMs) : null
  };
}

function normalizeYouTubeAlertsSettings(value = {}) {
  const merged = {
    ...defaultDashboardSettings.youtubeAlerts,
    ...(value || {})
  };
  let feeds = Array.isArray(merged.feeds) ? merged.feeds.map((f, index) => normalizeYouTubeFeed(f, `feed${index + 1}`)) : [];
  if (feeds.length === 0 && (merged.youtubeChannelId || merged.alertChannelId || merged.alertRoleId)) {
    feeds = [normalizeYouTubeFeed({
      id: 'legacy',
      name: 'Legacy Feed',
      youtubeChannelId: merged.youtubeChannelId,
      alertChannelId: merged.alertChannelId,
      alertRoleId: merged.alertRoleId,
      lastVideoId: merged.lastVideoId,
      lastPublishedAt: merged.lastPublishedAt
    }, 'legacy')];
  }
  const unique = [];
  const seen = new Set();
  feeds.forEach(feed => {
    if (!feed.youtubeChannelId || !feed.alertChannelId) return;
    if (seen.has(feed.id)) feed.id = crypto.randomUUID().slice(0, 8);
    seen.add(feed.id);
    unique.push(feed);
  });
  return {
    ...merged,
    template: String(merged.template || defaultDashboardSettings.youtubeAlerts.template),
    rewardButtonLabel: String(merged.rewardButtonLabel || defaultDashboardSettings.youtubeAlerts.rewardButtonLabel).slice(0, 80),
    feeds: unique,
    claims: (merged.claims && typeof merged.claims === 'object') ? merged.claims : {},
    health: {
      ...defaultDashboardSettings.youtubeAlerts.health,
      ...(merged.health || {})
    }
  };
}

dashboardSettings.youtubeAlerts = normalizeYouTubeAlertsSettings(dashboardSettings.youtubeAlerts || {});

function getRpgSettings() {
  return {
    ...defaultDashboardSettings.rpgSettings,
    ...(dashboardSettings.rpgSettings || {})
  };
}

function isRpgChannelAllowed(channelId, channel = null) {
  const settings = getRpgSettings();
  if (!settings.channelRestrictionEnabled) return true;
  if (!channelId) return false;

  // Check if the channel itself is allowed
  if (Array.isArray(settings.allowedChannelIds) && settings.allowedChannelIds.includes(channelId)) {
    return true;
  }

  // If it's a thread, check if the parent channel is allowed
  if (channel && channel.isThread && channel.parentId) {
    if (Array.isArray(settings.allowedChannelIds) && settings.allowedChannelIds.includes(channel.parentId)) {
      return true;
    }
  }

  return false;
}

function getRpgRestrictionMessage() {
  const settings = getRpgSettings();
  const allowed = Array.isArray(settings.allowedChannelIds) ? settings.allowedChannelIds : [];
  if (!settings.channelRestrictionEnabled || allowed.length === 0) {
    return '❌ RPG is currently disabled.';
  }
  const channels = allowed.map(id => `<#${id}>`).join(', ');
  return `❌ RPG is restricted to: ${channels}`;
}

let welcomeSettings = {
  enabled: false,
  channelId: null,
  message: 'Welcome {user} to {server}!',
  autoRoles: [],
  // Embed settings
  useEmbed: false,
  embedTitle: 'Welcome to {server}! 👋',
  embedDescription: 'Hey {user}, welcome to **{server}**! We now have **{count}** members!',
  embedColor: '#9146ff',
  embedThumbnail: 'avatar', // 'avatar', 'custom', or 'none'
  embedThumbnailUrl: '',
  embedImage: '',
  embedFooter: 'Member #{position} • Joined {time}',
  embedFields: [], // [{name: '', value: '', inline: false}]
  // Multiple messages
  messages: [], // Array of message objects for rotation
  messageMode: 'single', // 'single', 'random', 'cycle'
  cycleIndex: 0,
  // DM welcome
  dmEnabled: false,
  dmMessage: 'Welcome to {server}, {username}! Please check out the rules.',
  dmUseEmbed: false,
  // Anti-spam
  antiSpamEnabled: false,
  antiSpamRoles: [], // Don't send welcome if user has these roles (re-joins)
  // Goodbye/Leave messages
  goodbyeEnabled: false,
  goodbyeChannelId: null,
  goodbyeMessage: 'Goodbye {username}, we\'ll miss you! 👋',
  goodbyeUseEmbed: false,
  goodbyeEmbedTitle: 'Goodbye! 👋',
  goodbyeEmbedDescription: '{username} has left us. We now have **{count}** members.',
  goodbyeEmbedColor: '#E74C3C',
  goodbyeEmbedThumbnail: 'avatar',
  goodbyeEmbedThumbnailUrl: '',
  goodbyeEmbedImage: '',
  goodbyeEmbedFooter: 'We\'ll miss you!',
  goodbyeMessages: [],
  goodbyeMessageMode: 'single',
  // Auto-roles settings
  autoRoleConditions: [], // [{roleId, condition: 'always'|'accountAge', minAccountAge: 7}]
  ...(state.dashboardSettings?.welcomeSettings || {})
};

let auditLogSettings = {
  enabled: false,
  channelId: null,
  logLevel: 'all',
  logMessageEdits: true,
  logMessageDeletes: true,
  logMessageBulkDeletes: true,
  logMessagePins: true,
  logUsernameChanges: true,
  logAvatarChanges: true,
  logNicknameChanges: true,
  logRoleChanges: true,
  logMemberJoins: true,
  logMemberLeaves: true,
  logMemberBans: true,
  logMemberUnbans: true,
  logMemberTimeouts: true,
  logMemberMutes: true,
  logMemberBoosts: true,
  logJoinPosition: true,
  logServerUpdates: true,
  logIntegrations: true,
  warnNewAccounts: true,
  newAccountThresholdDays: 7,
  excludedChannels: [],
  excludedRoles: [],
  excludedUsers: [],
  muteRoleIds: [],
  perEventChannels: {},
  perEventExclusions: {},
  perEventPings: {},
  // Log Retention & Cleanup
  logRetentionDays: 30,
  autoCleanupEnabled: false,
  // Severity/Color Coding
  eventColors: {
    ban: '#E74C3C',
    timeout: '#E67E22',
    mute: '#F39C12',
    kick: '#E74C3C',
    join: '#2ECC71',
    leave: '#95A5A6',
    boost: '#F47FFF',
    edit: '#3498DB',
    delete: '#E74C3C',
    roleChange: '#9B59B6',
    nameChange: '#1ABC9C',
    serverUpdate: '#7289DA'
  },
  // Keyword/Phrase Alerts
  alertKeywords: [],
  alertUserId: null, // User ID to ping on keyword match
  alertEnabled: false,
  // DM/Webhook Notifications for Critical Events
  dmNotificationsEnabled: false,
  dmNotifyUserId: null,
  dmNotifyEvents: {
    bans: true,
    newAccounts: true,
    serverChanges: false,
    botChanges: true
  },
  webhookUrl: null,
  webhookEnabled: false,
  // Auto-detect mute role
  autoDetectMuteRole: false,
  ...(state.dashboardSettings?.auditLogSettings || {})
};

// Audit log history for searchable dashboard (stored separately to avoid bloat)
let auditLogHistory = [];
const AUDIT_LOG_HISTORY_MAX = 5000;

// Load audit log history from file
const AUDIT_HISTORY_FILE = `${DATA_DIR}/audit-history.json`;
if (fs.existsSync(AUDIT_HISTORY_FILE)) {
  try { auditLogHistory = JSON.parse(fs.readFileSync(AUDIT_HISTORY_FILE, 'utf8')); } catch {}
}

function saveAuditLogHistory() {
  try {
    fs.writeFileSync(AUDIT_HISTORY_FILE, JSON.stringify(auditLogHistory, null, 2));
  } catch (err) {
    addLog('error', `Failed to save audit history: ${err.message}`);
  }
}

function addToAuditLogHistory(entry) {
  const historyEntry = {
    id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    ...entry
  };
  auditLogHistory.unshift(historyEntry);
  if (auditLogHistory.length > AUDIT_LOG_HISTORY_MAX) {
    auditLogHistory = auditLogHistory.slice(0, AUDIT_LOG_HISTORY_MAX);
  }
  saveAuditLogHistory();
  
  // Check for keyword alerts
  checkKeywordAlerts(historyEntry);
  
  return historyEntry;
}

async function checkKeywordAlerts(entry) {
  if (!auditLogSettings.alertEnabled || !auditLogSettings.alertKeywords?.length) return;
  if (!auditLogSettings.alertUserId) return;
  
  const textToSearch = [
    entry.userTag,
    entry.action,
    entry.details?.summary,
    entry.details?.reason,
    JSON.stringify(entry.details)
  ].filter(Boolean).join(' ').toLowerCase();
  
  const matchedKeyword = auditLogSettings.alertKeywords.find(kw => 
    textToSearch.includes(kw.toLowerCase())
  );
  
  if (matchedKeyword) {
    try {
      const user = await client.users.fetch(auditLogSettings.alertUserId).catch(() => null);
      if (user) {
        const embed = new EmbedBuilder()
          .setColor(0xFF6B6B)
          .setTitle('🔔 Keyword Alert Triggered')
          .setDescription(`Keyword **"${matchedKeyword}"** detected in audit log`)
          .addFields(
            { name: 'Event Type', value: entry.action || 'Unknown', inline: true },
            { name: 'User', value: entry.userTag || 'Unknown', inline: true },
            { name: 'Details', value: entry.details?.summary || 'No details' }
          )
          .setTimestamp();
        await user.send({ embeds: [embed] }).catch(() => {});
      }
    } catch (err) {
      addLog('error', `Keyword alert DM failed: ${err.message}`);
    }
  }
}

async function sendCriticalEventDM(eventType, details) {
  if (!auditLogSettings.dmNotificationsEnabled || !auditLogSettings.dmNotifyUserId) return;
  if (!auditLogSettings.dmNotifyEvents[eventType]) return;
  
  try {
    const user = await client.users.fetch(auditLogSettings.dmNotifyUserId).catch(() => null);
    if (!user) return;
    
    const embed = new EmbedBuilder()
      .setColor(0xFF4444)
      .setTitle(`⚠️ Critical Event: ${eventType.toUpperCase()}`)
      .setDescription(details.summary || 'A critical event occurred')
      .setTimestamp();
    
    if (details.userId) embed.addFields({ name: 'User ID', value: details.userId, inline: true });
    if (details.userTag) embed.addFields({ name: 'User', value: details.userTag, inline: true });
    if (details.reason) embed.addFields({ name: 'Reason', value: details.reason });
    
    await user.send({ embeds: [embed] }).catch(() => {});
    
    // Also send to webhook if configured
    if (auditLogSettings.webhookEnabled && auditLogSettings.webhookUrl) {
      await fetch(auditLogSettings.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `⚠️ **Critical Event: ${eventType.toUpperCase()}**`,
          embeds: [embed.toJSON()]
        })
      }).catch(() => {});
    }
  } catch (err) {
    addLog('error', `Critical event DM failed: ${err.message}`);
  }
}

// Log cleanup function
async function cleanupOldAuditLogs() {
  if (!auditLogSettings.autoCleanupEnabled || !auditLogSettings.logRetentionDays) return;
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - auditLogSettings.logRetentionDays);
  
  const oldLength = auditLogHistory.length;
  auditLogHistory = auditLogHistory.filter(entry => 
    new Date(entry.timestamp) > cutoffDate
  );
  
  if (auditLogHistory.length < oldLength) {
    saveAuditLogHistory();
    addLog('info', `Cleaned up ${oldLength - auditLogHistory.length} old audit log entries`);
  }
}

// Run cleanup daily
setInterval(cleanupOldAuditLogs, 24 * 60 * 60 * 1000);

// Get color for event type
function getEventColor(eventType) {
  const colorMap = {
    member_ban: auditLogSettings.eventColors?.ban || '#E74C3C',
    member_unban: auditLogSettings.eventColors?.ban || '#E74C3C',
    member_timeout: auditLogSettings.eventColors?.timeout || '#E67E22',
    member_mute: auditLogSettings.eventColors?.mute || '#F39C12',
    member_join: auditLogSettings.eventColors?.join || '#2ECC71',
    member_leave: auditLogSettings.eventColors?.leave || '#95A5A6',
    member_boost: auditLogSettings.eventColors?.boost || '#F47FFF',
    message_edit: auditLogSettings.eventColors?.edit || '#3498DB',
    message_delete: auditLogSettings.eventColors?.delete || '#E74C3C',
    role_change: auditLogSettings.eventColors?.roleChange || '#9B59B6',
    name_change: auditLogSettings.eventColors?.nameChange || '#1ABC9C',
    server_update: auditLogSettings.eventColors?.serverUpdate || '#7289DA'
  };
  return colorMap[eventType] || '#7289DA';
}

let botTimezone = state.botTimezone || defaultState.botTimezone || 'America/Toronto';

function saveState() {
  state.isLive = streamVars.isLive;
  state.lastStreamId = streamVars.lastStreamId;
  state.announcementMessageId = streamVars.announcementMessageId;
  state.stats = stats;
  state.history = history;
  state.schedule = schedule;
  state.streamMetadata = streamMetadata;
  state.engagementSettings = engagementSettings;
  state.suggestions = suggestions;
  state.warnings = warnings;
  state.startTime = startTime;
  state.botTimezone = botTimezone;
  state.notificationHistory = notificationHistory;
  state.customCommands = customCommands;
  state.activityHeatmap = activityHeatmap;
  state.followerHistory = followerHistory;
  state.subHistory = subHistory;
  state.alertCooldowns = alertCooldowns;
  state.lastResetDate = lastResetDate;
  state.dashboardSettings = {
    ...dashboardSettings,
    welcomeSettings: welcomeSettings,
    auditLogSettings: auditLogSettings
  };
  state.leveling = leveling;
  state.levelingConfig = levelingConfig;
  state.prestige = prestige;
  state.weeklyLeveling = weeklyLeveling;
  state.prestigeHistory = prestigeHistory;
  state.lastWeeklyReset = lastWeeklyReset;
  state.currentStreamViewerData = currentStreamViewerData;
  state.currentStreamGameTimeline = currentStreamGameTimeline;
  state.twitchTokens = twitchTokens;
  state.viewerGraphHistory = viewerGraphHistory;
  state.giveaways = giveaways;
  state.polls = polls;
  state.reminders = reminders;
  state.notificationFilters = notificationFilters;
  state.commandUsage = commandUsage;
  state.config = config;
  state.rpgEvents = rpgEvents;
  state.streamGoals = streamGoals;
  state.smartBot = smartBot.toJSON();
  state.afkUsers = afkUsers;
  state.tempBans = tempBans;
  state.tempRoles = tempRoles;
  state.boosterAutoRoles = boosterAutoRoles;
  state.modEscalation = modEscalation;
  state.suggestionSettings = suggestionSettings;
  state.userMemory = userMemory;

  // Cap viewerGraphHistory to last 30 streams to prevent unbounded growth
  if (state.viewerGraphHistory && state.viewerGraphHistory.length > 30) {
    state.viewerGraphHistory = state.viewerGraphHistory.slice(-30);
    viewerGraphHistory = state.viewerGraphHistory;
  }
  // Cap history to last 100 entries
  if (state.history && state.history.length > 100) {
    state.history = state.history.slice(-100);
    history = state.history;
  }
  // Prune activityHeatmap older than 90 days
  const heatmapCutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  if (state.activityHeatmap) {
    for (const key of Object.keys(state.activityHeatmap)) {
      const dateStr = key.split('_')[0];
      if (new Date(dateStr).getTime() < heatmapCutoff) delete state.activityHeatmap[key];
    }
  }
  // Cap notificationHistory
  if (state.notificationHistory && state.notificationHistory.length > 200) {
    state.notificationHistory = state.notificationHistory.slice(-200);
    notificationHistory = state.notificationHistory;
  }

  // Invalidate analytics cache on state change
  invalidateAnalyticsCache();

  try {
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
  } catch (err) {
    log('error', 'State', 'saveState() failed', { error: err.message });
    addLog('error', `saveState failed: ${err.message}`);
  }
}

function saveConfig() {
  saveState();
}

// ========== RPG EVENT SYSTEM ==========
function checkRPGMilestoneEvents(currentViewers) {
  if (!rpgEvents || !rpgEvents.milestoneEvents) return;
  const milestones = rpgEvents.milestoneEvents.filter(m => m.enabled);
  for (const milestone of milestones) {
    // Skip if already triggered this stream
    if (rpgEvents.triggeredThisStream[milestone.id]) continue;
    // Check if viewer count meets threshold
    if (currentViewers >= milestone.viewerThreshold) {
      triggerRPGEvent(milestone, currentViewers);
    }
  }
}

function triggerRPGEvent(milestone, viewerCount) {
  const now = Date.now();
  const durationMs = (milestone.duration || 30) * 60 * 1000;
  const activeEvent = {
    id: milestone.id,
    name: milestone.name,
    type: milestone.type,
    emoji: milestone.emoji || '🎮',
    description: milestone.description || '',
    duration: milestone.duration || 30,
    startedAt: now,
    endsAt: now + durationMs,
    viewerCount: viewerCount,
    multiplier: milestone.multiplier || 1,
    goldAmount: milestone.goldAmount || 0,
    bossName: milestone.bossName || '',
    dungeonId: milestone.dungeonId || ''
  };
  rpgEvents.activeEvents.push(activeEvent);
  rpgEvents.triggeredThisStream[milestone.id] = true;
  rpgEvents.eventHistory.push({
    ...activeEvent,
    triggeredAt: now,
    completed: false
  });
  // Cap event history to 100
  if (rpgEvents.eventHistory.length > 100) {
    rpgEvents.eventHistory = rpgEvents.eventHistory.slice(-100);
  }
  debouncedSaveState();
  addLog('info', `RPG Event triggered: ${milestone.emoji} ${milestone.name} (${viewerCount} viewers)`);
  // Send Discord notification
  sendEmbedNotification(
    `${milestone.emoji} **RPG Event: ${milestone.name}!**`,
    `${milestone.description}\n\n🎯 Triggered at **${viewerCount}** viewers\n⏱️ Duration: **${milestone.duration}** minutes`,
    milestone.type === 'xp_boost' ? 0x5b5bff : milestone.type === 'gold_rain' ? 0xFFD700 : milestone.type === 'loot_boost' ? 0x4caf50 : milestone.type === 'boss_spawn' ? 0xe91e63 : 0x9c27b0
  ).catch(() => {});
}

function expireRPGEvents() {
  if (!rpgEvents || !rpgEvents.activeEvents) return;
  const now = Date.now();
  const expired = rpgEvents.activeEvents.filter(e => e.endsAt && e.endsAt <= now);
  if (expired.length > 0) {
    rpgEvents.activeEvents = rpgEvents.activeEvents.filter(e => !e.endsAt || e.endsAt > now);
    // Mark completed in history
    for (const exp of expired) {
      const histEntry = rpgEvents.eventHistory.find(h => h.id === exp.id && h.startedAt === exp.startedAt);
      if (histEntry) histEntry.completed = true;
      addLog('info', `RPG Event expired: ${exp.emoji} ${exp.name}`);
      sendEmbedNotification(
        `⏱️ **RPG Event Ended: ${exp.name}**`,
        `The ${exp.emoji} ${exp.name} event has ended!`,
        0x666666
      ).catch(() => {});
    }
    debouncedSaveState();
  }
}
// ========== END RPG EVENT SYSTEM ==========

// Get current time in bot's timezone
function nowQuebec() {
  const utcNow = new Date();
  const tzString = utcNow.toLocaleString('en-US', { timeZone: botTimezone });
  return new Date(tzString);
}

// Safer bot-timezone date (UTC date representing bot wall-clock time)
function getNowInBotTimezone() {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: botTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(new Date());
  const map = {};
  parts.forEach(p => {
    if (p.type !== 'literal') map[p.type] = p.value;
  });
  return new Date(Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second)
  ));
}

function getTimeZoneParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(date);
  const map = {};
  parts.forEach(p => {
    if (p.type !== 'literal') map[p.type] = p.value;
  });
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second)
  };
}

function zonedTimeToUtcMillis(parts, timeZone) {
  const utcGuess = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second || 0
  );
  const tzParts = getTimeZoneParts(new Date(utcGuess), timeZone);
  const tzAsUtc = Date.UTC(
    tzParts.year,
    tzParts.month - 1,
    tzParts.day,
    tzParts.hour,
    tzParts.minute,
    tzParts.second || 0
  );
  const offsetMs = tzAsUtc - utcGuess;
  return utcGuess - offsetMs;
}

function getNextOccurrenceUtcMs(timeZone, targetDayIndex, hour, minute, now = Date.now()) {
  const nowParts = getTimeZoneParts(new Date(now), timeZone);
  const localNow = new Date(Date.UTC(
    nowParts.year,
    nowParts.month - 1,
    nowParts.day,
    nowParts.hour,
    nowParts.minute,
    nowParts.second
  ));
  const localDayIndex = localNow.getUTCDay();

  let diff = targetDayIndex - localDayIndex;
  if (diff < 0) diff += 7;

  const localCandidate = new Date(localNow.getTime());
  localCandidate.setUTCHours(hour, minute, 0, 0);

  if (diff === 0 && localCandidate.getTime() <= localNow.getTime()) diff = 7;
  localCandidate.setUTCDate(localCandidate.getUTCDate() + diff);

  return zonedTimeToUtcMillis({
    year: localCandidate.getUTCFullYear(),
    month: localCandidate.getUTCMonth() + 1,
    day: localCandidate.getUTCDate(),
    hour,
    minute,
    second: 0
  }, timeZone);
}

// Cache for user names (populated on-demand)
let userNameCache = {};

async function fetchUserName(userId) {
  if (userNameCache[userId]) {
    return userNameCache[userId];
  }
  try {
    const user = await client.users.fetch(userId);
    userNameCache[userId] = user.username;
    return user.username;
  } catch (err) {
    userNameCache[userId] = `Unknown (${userId})`;
    return userNameCache[userId];
  }
}

function getUserNameSync(userId) {
  return userNameCache[userId] || userId;
}

// XP requirement helper (cumulative XP to reach a level)
function getXpForLevel(level) {
  if (!level || level <= 0) return 0;
  const cfg = levelingConfig || {};
  const mode = cfg.xpMode === 'custom' ? 'custom' : 'increment';
  const base = Number(cfg.baseXp) || 100;
  const inc = Number(cfg.xpIncrement) || 50;

  if (mode === 'custom' && cfg.customXpPerLevel) {
    let total = 0;
    for (let i = 1; i <= level; i++) {
      const raw = Number(cfg.customXpPerLevel[i]);
      const perLevel = Number.isFinite(raw) ? raw : 0;
      total += Math.max(0, perLevel);
    }
    return total;
  }

  // Progressive prestige scaling: levels beyond each prestige threshold get exponentially harder
  const thresholds = cfg.prestigeThresholds || {};
  const sortedThresholds = Object.values(thresholds)
    .map(t => t.levelRequired)
    .filter(v => v > 0)
    .sort((a, b) => a - b);

  let baseXp = Math.floor(base * level + inc * (level * (level - 1) / 2));

  // Apply exponential scaling for levels approaching/beyond prestige thresholds
  if (sortedThresholds.length > 0) {
    const firstThreshold = sortedThresholds[0] || 115;
    // Ramp-up zone: 15 levels before each threshold, XP cost increases exponentially
    const rampStart = Math.max(1, firstThreshold - 15);
    if (level >= rampStart) {
      // Calculate which prestige tier we're in
      let tier = 0;
      for (const th of sortedThresholds) {
        if (level >= th) tier++;
      }
      // Levels in prestige zone get a multiplier: 1.5^tier * exponential ramp
      const levelsIntoRamp = level - rampStart;
      const rampMultiplier = 1 + (levelsIntoRamp * 0.15); // 15% more per level in ramp zone
      const tierMultiplier = Math.pow(1.5, tier); // 50% harder per prestige tier
      baseXp = Math.floor(baseXp * rampMultiplier * tierMultiplier);
    }
  }

  return baseXp;
}

// NEW: User prestige tracking
let prestige = state.prestige ?? {};

// Configuration object for dashboard settings
let config = {
  ROLE_ID: null,
  notificationRoles: {},
  notificationEnabled: {},
  notificationPing: {},
  notificationChannels: {},
  CUSTOM_CHANNEL_ID: null,
  ...(state.config || {})
};

if (!config.commandCooldowns) config.commandCooldowns = {};
if (!config.commandPinned) config.commandPinned = {};
if (!config.commandDisabled) config.commandDisabled = {};

// NEW: Weekly leveling reset
let weeklyLeveling = state.weeklyLeveling ?? {};
let lastWeeklyReset = state.lastWeeklyReset ?? Date.now();

// NEW: Viewer tracking data (current stream)
let currentStreamViewerData = state.currentStreamViewerData ?? [];
// NEW: Game timeline tracking data (current stream)
let currentStreamGameTimeline = state.currentStreamGameTimeline ?? [];
// NEW: Historical viewer data for all streams
let viewerGraphHistory = state.viewerGraphHistory ?? [];

// NEW: Giveaways
let giveaways = state.giveaways ?? [];

// NEW: Command usage tracking
let commandUsage = state.commandUsage ?? {};

// NEW: Polls
let polls = state.polls ?? [];

// NEW: Reminders
let reminders = state.reminders ?? [];

// NEW: Notification Filters
let notificationFilters = state.notificationFilters ?? [];

// Suggestion cooldown tracker
let suggestionCooldowns = {};

// Backfill older history entries (fixes existing Stats page issues after upgrades)
(function reconcileHistoryWithViewerGraphs() {
  try {
    if (!Array.isArray(history) || !Array.isArray(viewerGraphHistory) || viewerGraphHistory.length === 0) return;

    for (const h of history) {
      if (!h) continue;
      const match = viewerGraphHistory.find(g =>
        (h.streamId && g.streamId && h.streamId === g.streamId) ||
        (h.startedAt && g.startedAt && h.startedAt === g.startedAt)
      );
      if (!match) continue;

      if (!h.streamId && match.streamId) h.streamId = match.streamId;
      if (h.peakViewers == null && match.peakViewers != null) h.peakViewers = match.peakViewers;
      if (h.avgViewers == null && match.avgViewers != null) h.avgViewers = match.avgViewers;
      if (!h.endedAt && match.endedAt) h.endedAt = match.endedAt;

      if (h.duration == null && h.startedAt && (h.endedAt || match.endedAt)) {
        const startMs = new Date(h.startedAt).getTime();
        const endMs = new Date(h.endedAt || match.endedAt).getTime();
        if (!isNaN(startMs) && !isNaN(endMs)) {
          h.duration = Math.max(0, Math.floor((endMs - startMs) / 1000));
        }
      }
    }

    recomputeStreamStatsFromHistory();
    saveState();
  } catch (e) {
    console.log('[STATS] reconcileHistoryWithViewerGraphs failed:', e?.message || e);
  }
})();

// Clean up live timeline: remove placeholder entries
(function cleanupLiveTimeline() {
  try {
    if (!Array.isArray(currentStreamGameTimeline)) return;
    
    // Filter out placeholder games
    currentStreamGameTimeline = currentStreamGameTimeline.filter(seg => {
      const game = (seg.game || '').toString().trim();
      return game && game !== '\u2014' && game !== '\u2013' && game !== '\u2022';
    });
    
    if (streamVars.isLive && currentStreamGameTimeline.length === 0 && history.length > 0) {
      // If timeline is now empty but we're live, initialize with the current history game
      const lastStream = history[history.length - 1];
      if (lastStream && lastStream.game && lastStream.game !== '\u2014') {
        currentStreamGameTimeline = [{
          streamId: streamVars.lastStreamId || lastStream.streamId,
          game: lastStream.game,
          startMs: Date.now(),
          endMs: null
        }];
      }
    }
    
    saveState();
  } catch (e) {
    console.log('[TIMELINE] cleanupLiveTimeline failed:', e?.message || e);
  }
})();

// Fix custom command names (strip leading ! if present)
(function fixCustomCommandNames() {
  try {
    let changed = false;
    customCommands.forEach(cmd => {
      if (cmd.name && cmd.name.startsWith('!')) {
        cmd.name = cmd.name.slice(1).toLowerCase();
        changed = true;
      }
    });
    if (changed) {
      saveState();
      console.log('[CUSTOMCMDS] Fixed command names by stripping ! prefix');
    }
  } catch (e) {
    console.log('[CUSTOMCMDS] fixCustomCommandNames failed:', e?.message || e);
  }
})();

// NEW: Dashboard settings
// (already initialized above)

// Stream state vars are in streamVars object (see line ~903)

function normalizeSchedule() {
  if (!schedule) schedule = {};
  if (!schedule.weekly) schedule.weekly = {};
  if (!schedule.days) schedule.days = {};
  if (!schedule.alertsSent) {
    schedule.alertsSent = {
      oneHour: false,
      tenMin: false
    };
  }

  if (schedule.streamDelayed === undefined) schedule.streamDelayed = false;
  if (schedule.noStreamToday === undefined) schedule.noStreamToday = false;
}

// ✅ NOW it is safe
normalizeSchedule();
// ALWAYS exists so dashboard + discord don’t crash
let streamInfo = {
  title: '—',
  game: '—',
  viewers: 0,
  thumbnail: null,
  startedAt: null
};

// FIX: Initialize stream info from history when isLive is true
if (streamVars.isLive && history.length > 0 && !streamInfo.startedAt) {
  const lastStream = history[history.length - 1];
  if (lastStream && lastStream.startedAt) {
    streamInfo = {
      title: lastStream.title || '—',
      game: lastStream.game || lastStream.gameName || '—',
      viewers: lastStream.viewers || 0,
      thumbnail: null,
      startedAt: lastStream.startedAt
    };
  }
}

// ── Chat & API tracking for overview widgets ──
const chatStats = { messages: {}, emotes: {}, streamStart: null, totalMessages: 0 };
const apiRateLimits = { twitchRemaining: 800, twitchLimit: 800, twitchReset: 0, callsThisMinute: 0, minuteStart: Date.now(), totalCalls: 0, discordCalls: 0, discordCallsMinute: 0, youtubeCalls: 0, youtubeCallsMinute: 0, youtubeQuotaUsed: 0, dashboardCalls: 0, dashboardCallsMinute: 0 };
function trackApiCall(res) {
  apiRateLimits.totalCalls++;
  const now = Date.now();
  if (now - apiRateLimits.minuteStart > 60000) { apiRateLimits.callsThisMinute = 0; apiRateLimits.minuteStart = now; apiRateLimits.discordCallsMinute = 0; apiRateLimits.youtubeCallsMinute = 0; apiRateLimits.dashboardCallsMinute = 0; }
  apiRateLimits.callsThisMinute++;
  if (res && res.headers) {
    const rem = res.headers.get('ratelimit-remaining'); if (rem !== null) apiRateLimits.twitchRemaining = parseInt(rem, 10);
    const lim = res.headers.get('ratelimit-limit'); if (lim !== null) apiRateLimits.twitchLimit = parseInt(lim, 10);
    const rst = res.headers.get('ratelimit-reset'); if (rst !== null) apiRateLimits.twitchReset = parseInt(rst, 10) * 1000;
  }
}
function resetChatStats() { chatStats.messages = {}; chatStats.emotes = {}; chatStats.totalMessages = 0; chatStats.streamStart = Date.now(); }

// Initialize Twitch credentials in streamVars
streamVars.TWITCH_ACCESS_TOKEN = twitchTokens.access_token || process.env.TWITCH_ACCESS_TOKEN || '';
if (twitchTokens.access_token && twitchTokens.access_token !== process.env.TWITCH_ACCESS_TOKEN) {
  console.log('[Twitch] Using persisted token from state.json (may be newer than env var)');
}

/* ======================
   EXPRESS & SOCKET.IO
====================== */
const app = express();

// Initialize analytics tabs with state getter
initAnalyticsTabs(() => ({
  stats, isLive: streamVars.isLive,
  achievements: loadJSON(path.join(DATA_DIR, 'achievements.json'), []),
  auditLogSettings,
  bounties: loadJSON(path.join(DATA_DIR, 'bounties.json'), { player: [], npc: [] }),
  commandUsage,
  crafting: loadJSON(path.join(DATA_DIR, 'crafting.json'), { materials: [], recipes: [] }),
  defenseQuests: loadJSON(path.join(DATA_DIR, 'defense-quests.json'), []),
  giveaways,
  guilds: loadJSON(path.join(DATA_DIR, 'guilds.json'), []),
  leveling,
  players: loadJSON(path.join(DATA_DIR, 'players.json'), {}),
  polls, rpgBot, rpgEvents, schedule,
  suggestions,
  viewerCount: streamInfo.viewers || 0,
  welcomeSettings,
  youtubeAlerts: dashboardSettings.youtubeAlerts || {},
  client, twitchTokens,
  DATA_DIR, dashboardSettings, startTime, normalizeYouTubeAlertsSettings, cachedReadJSON,
  logs, membersCache, loadJSON, streamInfo, followerHistory, streamGoals,
  TWITCH_ACCESS_TOKEN: streamVars.TWITCH_ACCESS_TOKEN, history, auditLogHistory,
  STATE_PATH, LOG_FILE, CMD_USAGE_PATH, MODERATION_PATH,
  logSSEClients, currentStreamViewerData, activityHeatmap, customCommands,
  levelingConfig, notificationHistory, rpgTestMode, viewerGraphHistory,
  getRpgSettings, weeklyLeveling, AUDIT_LOG_HISTORY_MAX
}));

// Initialize config tabs with state getter
initConfigTabs(() => ({
  stats, client, commandUsage, dashboardSettings, giveaways, leveling,
  normalizeYouTubeAlertsSettings, polls, reminders, schedule, startTime,
  welcomeSettings,
  xpMultiplier: levelingConfig.xpMultiplier || 1,
  youtubeAlerts: dashboardSettings.youtubeAlerts || {},
  loadJSON, SCHED_MSG_PATH, DATA_DIR, renderTicketsTab,
  config, levelingConfig, customCommands, engagementSettings,
  streamInfo, weeklyLeveling, notificationHistory, notificationFilters,
  membersCache
}));

// Initialize community tabs with state getter
initCommunityTabs(() => ({
  stats, isLive: streamVars.isLive, client, dashboardSettings, DATA_DIR, giveaways,
  history, io, leveling, normalizeYouTubeAlertsSettings, polls,
  reminders, schedule, smartBot, startTime, suggestions,
  twitchTokens, welcomeSettings,
  youtubeAlerts: dashboardSettings.youtubeAlerts || {},
  followerHistory, streamInfo, logs, streamGoals,
  TWITCH_ACCESS_TOKEN: streamVars.TWITCH_ACCESS_TOKEN,
  membersCache, loadJSON, getCachedAnalytics,
  MODERATION_PATH, DASH_AUDIT_PATH, TICKETS_PATH, REACTION_ROLES_PATH,
  SCHED_MSG_PATH, AUTOMOD_PATH, STARBOARD_PATH, CMD_USAGE_PATH,
  PETS_PATH, PAGE_ACCESS_OPTIONS, auditLogHistory
}));

// Initialize RPG tabs with state getter
initRpgTabs(() => ({
  getRpgSettings
}));

// Trust Render's reverse proxy so Express sees HTTPS correctly
app.set('trust proxy', 1);

// ── Gzip/Brotli compression — reduces response sizes by 60-80% ──
app.use(compression({
  level: 6,
  threshold: 1024, // only compress responses > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// ── Security middleware stack (helmet + CORS block + body limits) ──
setupHelmet(app);
setupCorsBlock(app);

app.use(express.json(bodyLimitOptions()));
app.use(express.urlencoded({ ...bodyLimitOptions(), extended: true }));

// ── WAF: block common attack patterns in POST bodies/params ──
setupWaf(app, addLog);

// ── CSRF double-submit cookie protection ──
setupCsrf(app, getSessionFromCookie);

// ── Global POST rate limit for /api/* (60 req/min/IP) ──
setupPostRateLimit(app);

// ── robots.txt - tell crawlers not to index this private dashboard ──
app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send('User-agent: *\nDisallow: /\n');
});

// ── Privacy policy / About page ──
app.get('/privacy', (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <meta name="description" content="Privacy policy for the nephilheim Discord bot and dashboard.">
  <title>Privacy Policy — nephilheim Bot</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#000;color:#e0e0e0;font-family:'Segoe UI',Tahoma,sans-serif;min-height:100vh;display:flex;justify-content:center;padding:40px 20px;line-height:1.7}
    .privacy-card{background:#0a0a0a;border:1px solid #1a1a1a;border-radius:12px;padding:36px;max-width:720px;width:100%;animation:fadeIn 0.4s ease-out both}
    @keyframes fadeIn{0%{opacity:0;transform:translateY(12px)}100%{opacity:1;transform:translateY(0)}}
    h1{color:#fff;font-size:22px;font-weight:700;border-bottom:1px solid #1a1a1a;padding-bottom:12px;margin-bottom:16px}
    h2{color:#9146ff;font-size:16px;margin-top:28px;margin-bottom:8px}
    p,li{color:#bbb;font-size:14px}
    ul{padding-left:20px;margin-top:6px}
    li{margin-bottom:4px}
    li strong{color:#ddd}
    code{background:#111;border:1px solid #222;border-radius:4px;padding:1px 5px;font-size:13px;color:#888}
    .updated{color:#555;font-size:13px;margin-bottom:16px}
    .back{display:inline-block;margin-top:28px;color:#444;text-decoration:none;font-size:13px;transition:color 0.2s}
    .back:hover{color:#888}
    @media(max-width:480px){.privacy-card{padding:24px 16px}h1{font-size:20px}}
  </style>
</head>
<body>
  <div class="privacy-card">
    <h1>Privacy Policy</h1>
    <p class="updated">Last updated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
    <p>This policy explains what data the <strong>nephilheim Discord bot</strong> and its web dashboard collect, how that data is used, and your rights regarding it.</p>

    <h2>Who Can Access the Dashboard</h2>
    <p>The web dashboard is available to registered users with approved accounts. Roles range from Viewer (read-only) to Admin (full control). Anyone may create an account, but permissions are granted by a server administrator.</p>

    <h2>Data We Collect</h2>

    <h2>Account &amp; Authentication</h2>
    <ul>
      <li><strong>Dashboard credentials</strong> — Username and securely hashed password. Passwords are never stored in plain text.</li>
      <li><strong>Discord OAuth</strong> — If you log in via Discord, we receive your Discord user ID, username, and avatar from the Discord API. We do not access your email or friend list.</li>
      <li><strong>Session cookies</strong> — A secure, HTTP-only cookie (<code>session</code>) and a CSRF token (<code>_csrf</code>) to keep you logged in and protect against cross-site attacks.</li>
      <li><strong>IP addresses</strong> — Logged temporarily for rate limiting and abuse prevention (login attempts, signup). Not stored long-term.</li>
    </ul>

    <h2>Discord Server Data</h2>
    <ul>
      <li><strong>Member information</strong> — Usernames, display names, avatars, roles, join dates, and message activity as needed for leveling, moderation, and community features.</li>
      <li><strong>Message content</strong> — Processed in real time by auto-moderation (scam/spam detection) and the SmartBot system. Messages are not bulk-stored; only statistical patterns (word frequencies, topic models) are retained for the SmartBot's learning engine.</li>
      <li><strong>Moderation actions</strong> — Warnings, bans, mutes, timeouts, and audit logs including the moderator who issued them and the reason.</li>
      <li><strong>Server configuration</strong> — Channel settings, role assignments, reaction-role panels, welcome messages, and all bot feature toggles.</li>
    </ul>

    <h2>Community &amp; Engagement Features</h2>
    <ul>
      <li><strong>Leveling &amp; XP</strong> — Per-member experience points, levels, role rewards, and leaderboard rankings.</li>
      <li><strong>Starboard</strong> — Message IDs and reaction counts for starred messages.</li>
      <li><strong>Tickets</strong> — Support ticket transcripts including the requesting user and assigned staff.</li>
      <li><strong>Bounties</strong> — Task descriptions, assigned users, and completion status.</li>
      <li><strong>Scheduled messages</strong> — Message content and target channels for timed announcements.</li>
      <li><strong>Member growth tracking</strong> — Daily join/leave counts and hourly activity metrics (aggregated, not per-user).</li>
    </ul>

    <h2>RPG System</h2>
    <ul>
      <li><strong>Player profiles</strong> — Character stats, inventories, pets, crafting recipes, quest progress, guild memberships, and world data tied to your Discord user ID.</li>
    </ul>

    <h2>Dashboard Chat &amp; Messaging</h2>
    <ul>
      <li><strong>Internal chat</strong> — Messages sent through the dashboard's built-in chat channels and direct messages. Limited to the last 500 messages per channel.</li>
      <li><strong>Notifications</strong> — Dashboard notification preferences and read/unread state.</li>
    </ul>

    <h2>Stream &amp; Content Integrations</h2>
    <ul>
      <li><strong>Twitch</strong> — OAuth tokens, stream metadata (viewer counts, titles, game names, duration), and top chatter statistics. Tokens are stored locally.</li>
      <li><strong>YouTube</strong> — Channel and video alert configuration (no user tokens stored).</li>
    </ul>

    <h2>SmartBot / AI Features</h2>
    <ul>
      <li><strong>Language model</strong> — The SmartBot learns from public channel messages to generate contextual replies. It stores Markov chain data (word transition probabilities), TF-IDF scores, and topic embeddings — not raw messages. Training data can be cleared by an admin.</li>
      <li><strong>External AI</strong> — When enabled, message context may be sent to a third-party AI API (e.g. Qwen) for reply generation. No conversation history is stored by the third party beyond their standard API terms.</li>
    </ul>

    <h2>Uploaded Files</h2>
    <p>Images uploaded through the dashboard (e.g. guide images) are stored on the bot's server. Only image files are accepted, with an 8 MB size limit. Uploads are accessible to all dashboard users.</p>

    <h2>Dashboard Audit Trail</h2>
    <p>All configuration changes made through the dashboard are logged with the username, action performed, and timestamp. This audit log is visible to administrators.</p>

    <h2>Cookies</h2>
    <p>We use two essential cookies: <code>session</code> for authentication and <code>_csrf</code> for security. No advertising, analytics, or tracking cookies are used.</p>

    <h2>Data Sharing</h2>
    <p>We do not sell, rent, or share your data with third parties. Data only leaves the server when interacting with the APIs listed below.</p>

    <h2>Third-Party Services</h2>
    <ul>
      <li><strong>Discord API</strong> — Bot operations, OAuth login, member data</li>
      <li><strong>Twitch API</strong> — Stream monitoring and analytics</li>
      <li><strong>YouTube API</strong> — Video and channel alerts</li>
      <li><strong>AI API (optional)</strong> — SmartBot reply generation when the AI engine is enabled</li>
    </ul>

    <h2>Data Retention &amp; Deletion</h2>
    <ul>
      <li>Bot configuration and logs are retained while the bot is active.</li>
      <li>Stream history and analytics are kept indefinitely for trend analysis.</li>
      <li>SmartBot training data can be reset by an administrator at any time.</li>
      <li>Dashboard chat messages are capped at 500 per channel (older messages are automatically discarded).</li>
      <li>Users may request deletion of their data by contacting a server administrator.</li>
    </ul>

    <h2>Data Storage &amp; Security</h2>
    <p>All data is stored locally on the bot's server as JSON files. Passwords are hashed. Sessions use secure HTTP-only cookies. The dashboard is protected by CSRF tokens, rate limiting, and Content Security Policy headers.</p>

    <h2>Contact</h2>
    <p>For questions about this policy or to request data deletion, contact a server administrator through Discord.</p>

    <a class="back" href="/login">\u2190 Back to login</a>
  </div>
</body>
</html>`);
});

// Setup file uploads
const uploadsDir = UPLOADS_PERSIST_DIR;
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir, {
  maxAge: '7d',
  etag: true,
  lastModified: true
}));

// Serve static files from public folder
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir, {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB limit
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

const httpServer = createServer(app);
const io = new Server(httpServer);

// WebSocket connection rate limiting
setupSocketRateLimit(io);

io.use((socket, next) => {
  const cookie = socket.handshake.headers.cookie;
  const token = cookie?.match(/session=([^;]+)/)?.[1];
  if (!token || !activeSessionTokens.has(token)) {
    return next(new Error('Authentication required'));
  }
  socket.session = activeSessionTokens.get(token);
  next();
});
io.on('connection', socket => {
  console.log('Socket connected:', socket.session?.username || 'unknown');
  socket.emit('streamUpdate', streamInfo);

  // Chat room management
  socket.on('joinChat', (data) => {
    if (!data || !data.channel) return;
    const channel = String(data.channel).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 30);
    const allowed = ['general', 'off-topic', 'announcements', 'bot-dev', 'help'];
    if (!allowed.includes(channel)) return;
    // Leave previous chat rooms
    for (const room of socket.rooms) {
      if (room.startsWith('chat_')) socket.leave(room);
    }
    socket.join('chat_' + channel);
    // Broadcast members list
    const accounts = loadAccounts();
    const roomSockets = io.sockets.adapter.rooms.get('chat_' + channel);
    const onlineIds = new Set();
    if (roomSockets) {
      for (const sid of roomSockets) {
        const s = io.sockets.sockets.get(sid);
        if (s && s.session) onlineIds.add(s.session.userId);
      }
    }
    const members = accounts.map(a => ({
      id: a.id,
      username: a.username,
      displayName: a.displayName || a.username,
      avatar: a.customAvatar || null,
      accentColor: a.accentColor || '#5b5bff',
      tier: a.tier || 'viewer',
      bio: a.bio || '',
      online: onlineIds.has(a.id)
    }));
    io.to('chat_' + channel).emit('chatMembers', { channel, members });
  });

  socket.on('chatTyping', (data) => {
    if (!data || !data.channel) return;
    const channel = String(data.channel).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 30);
    socket.to('chat_' + channel).emit('chatTyping', {
      channel,
      username: data.username || socket.session?.username || 'Someone'
    });
  });

  socket.on('disconnect', () => {
    // Update members for any chat rooms they were in
    for (const room of socket.rooms) {
      if (room.startsWith('chat_')) {
        const channel = room.replace('chat_', '');
        const accounts = loadAccounts();
        const roomSockets = io.sockets.adapter.rooms.get(room);
        const onlineIds = new Set();
        if (roomSockets) {
          for (const sid of roomSockets) {
            const s = io.sockets.sockets.get(sid);
            if (s && s.session) onlineIds.add(s.session.userId);
          }
        }
        const members = accounts.map(a => ({
          id: a.id,
          username: a.username,
          displayName: a.displayName || a.username,
          avatar: a.customAvatar || null,
          accentColor: a.accentColor || '#5b5bff',
          tier: a.tier || 'viewer',
          bio: a.bio || '',
          online: onlineIds.has(a.id)
        }));
        io.to(room).emit('chatMembers', { channel, members });
      }
    }
  });
});

// ========== DASHBOARD PUSH NOTIFICATIONS ==========
function pushDashboardNotification(type, data) {
  try {
    io.emit('dashNotification', { type, data, ts: Date.now() });
  } catch {}
}
// Hook into key events for real-time push
const _origPushActivity = typeof pushActivity === 'function' ? pushActivity : null;
// We'll call pushDashboardNotification from key places

/* ======================
   DASHBOARD AUTH - Multi-Account Tiered System
   Tiers: owner > admin > moderator > viewer
====================== */
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD;
if (!DASHBOARD_PASSWORD) {
  console.warn('[SECURITY] DASHBOARD_PASSWORD not set! Using insecure default. Set DASHBOARD_PASSWORD in .env for production.');
}
const _DASH_PASS_FALLBACK = DASHBOARD_PASSWORD || 'changeme123';
const ACCOUNTS_PATH = path.join(DATA_DIR, 'accounts.json');

// Tier hierarchy & permissions
const TIER_LEVELS = { owner: 4, admin: 3, moderator: 2, viewer: 1 };
const TIER_COLORS = { owner: '#ff4444', admin: '#9146ff', moderator: '#4caf50', viewer: '#8b8fa3' };
const TIER_LABELS = { owner: 'Owner', admin: 'Admin', moderator: 'Moderator', viewer: 'Viewer' };
const CATEGORY_TAB_MAP = {
  core: ['overview','health','logs','notifications'],
  config: ['commands','commands-config','config-commands','embeds','config-general','config-notifications','export','backups','webhooks','api-keys','accounts','bot-config'],
  profile: ['profile','profile-customize','profile-security','mail','dms','profile-notifications'],
  smartbot: ['smartbot-config','smartbot-knowledge','smartbot-stats','smartbot-templates'],
  idleon: ['idleon-dashboard','idleon-members','idleon-admin','idleon-guild-mgmt','idleon-reviews','idleon-bot-review'],
  community: ['welcome','audit','customcmds','leveling','suggestions','events','events-giveaways','events-polls','events-reminders','events-schedule','events-birthdays','youtube-alerts','pets','pet-approvals','pet-giveaways','pet-stats','moderation','tickets','reaction-roles','scheduled-msgs','automod','starboard','dash-audit','timezone','bot-messages','guide-indexer'],
  analytics: ['stats','stats-engagement','stats-trends','stats-games','stats-viewers','stats-ai','stats-reports','stats-community','stats-rpg','stats-rpg-events','stats-rpg-economy','stats-rpg-quests','stats-compare','stats-features','member-growth','command-usage','stats-revenue'],
  rpg: ['rpg-editor','rpg-entities','rpg-systems','rpg-ai','rpg-flags','rpg-simulators','rpg-admin','rpg-guild','rpg-guild-stats','rpg-worlds']
};
const TIER_ACCESS = {
  owner: ['core','community','analytics','rpg','config','profile','smartbot','idleon'],
  admin: ['core','community','analytics','rpg','config','profile','smartbot','idleon'],
  moderator: ['core','community','analytics','config','profile','smartbot','idleon'],
  viewer: ['community','analytics','config','profile','idleon']
};
const TIER_CAN_EDIT = { owner: true, admin: true, moderator: true, viewer: false };
const PAGE_ACCESS_MODES = new Set(['full', 'read']);
const ALL_PAGE_SLUGS = new Set(Object.values(CATEGORY_TAB_MAP).flat());
const PAGE_ACCESS_OPTIONS = Array.from(
  new Map(
    Object.entries(CATEGORY_TAB_MAP)
      .flatMap(([category, tabs]) => tabs.map((slug) => [slug, { slug, category }]))
  ).values()
).sort((a, b) => a.category.localeCompare(b.category) || a.slug.localeCompare(b.slug));

function normalizePageSlug(value) {
  const slug = String(value || '').trim().toLowerCase();
  if (!slug) return '';
  return ALL_PAGE_SLUGS.has(slug) ? slug : '';
}

function normalizePageAccessRules(value) {
  const rules = {};
  if (Array.isArray(value)) {
    value.forEach((raw) => {
      const slug = normalizePageSlug(raw);
      if (!slug) return;
      rules[slug] = 'full';
    });
    return rules;
  }
  if (!value || typeof value !== 'object') return rules;
  Object.entries(value).forEach(([rawSlug, rawMode]) => {
    const slug = normalizePageSlug(rawSlug);
    if (!slug) return;
    const mode = String(rawMode || '').trim().toLowerCase();
    rules[slug] = PAGE_ACCESS_MODES.has(mode) ? mode : 'full';
  });
  return rules;
}

function getTierTabs(tier) {
  const categories = TIER_ACCESS[tier] || [];
  const tabs = new Set();
  categories.forEach((cat) => {
    (CATEGORY_TAB_MAP[cat] || []).forEach((tab) => tabs.add(tab));
  });
  return tabs;
}

function buildPageAccessMapForTier(tier, pageAccessRules) {
  const tierTabs = getTierTabs(tier);
  const customRules = normalizePageAccessRules(pageAccessRules);
  const hasCustom = Object.keys(customRules).length > 0;
  const accessMap = {};
  if (!hasCustom) {
    tierTabs.forEach((tab) => { accessMap[tab] = 'full'; });
    return accessMap;
  }
  Object.entries(customRules).forEach(([tab, mode]) => {
    if (!tierTabs.has(tab)) return;
    accessMap[tab] = mode === 'read' ? 'read' : 'full';
  });
  return accessMap;
}

function resolveTabFromPathAndQuery(pathname, queryTab) {
  const routeMap = {
    '/': 'overview',
    '/health': 'health',
    '/bot-status': 'health',
    '/logs': 'logs',
    '/commands': 'config-commands',
    '/config': 'config-commands',
    '/options': 'config-commands',
    '/settings': 'config-commands',
    '/embeds': 'embeds',
    '/export': 'export',
    '/backups': 'backups',
    '/webhooks': 'webhooks',
    '/api-keys': 'api-keys',
    '/accounts': 'accounts',
    '/welcome': 'welcome',
    '/audit': 'audit',
    '/customcmds': 'customcmds',
    '/leveling': 'leveling',
    '/suggestions': 'suggestions',
    '/events': normalizePageSlug(queryTab) || 'events-giveaways',
    '/giveaways': 'events-giveaways',
    '/polls': 'events-polls',
    '/reminders': 'events-reminders',
    '/notifications': 'notifications',
    '/youtube-alerts': 'youtube-alerts',
    '/pets': 'pets',
    '/pet-approvals': 'pet-approvals',
    '/pet-giveaways': 'pet-giveaways',
    '/pet-stats': 'pet-stats',
    '/moderation': 'moderation',
    '/tickets': 'tickets',
    '/reaction-roles': 'reaction-roles',
    '/scheduled-msgs': 'scheduled-msgs',
    '/automod': 'automod',
    '/starboard': 'starboard',
    '/dash-audit': 'dash-audit',
    '/stats': normalizePageSlug(queryTab) || 'stats',
    '/rpg': normalizePageSlug(queryTab) || 'rpg-editor',
    '/idleon-dashboard': 'idleon-dashboard',
    '/idleon-members': 'idleon-members',
    '/idleon-admin': 'idleon-admin',
    '/idleon-guild-mgmt': 'idleon-guild-mgmt',
    '/idleon-reviews': 'idleon-reviews',
    '/idleon-stats': 'idleon-dashboard',
    '/profile': 'profile',
    '/mail': 'profile',
    '/dms': 'profile',
    '/guide-indexer': 'guide-indexer'
  };
  return routeMap[pathname] || '';
}

function resolveTabFromRequest(req) {
  return resolveTabFromPathAndQuery(req.path || '', req.query?.tab || '');
}

function resolveTabFromReferer(req) {
  const referer = String(req.headers?.referer || '').trim();
  if (!referer) return '';
  try {
    const ref = new URL(referer);
    return resolveTabFromPathAndQuery(ref.pathname || '', ref.searchParams.get('tab') || '');
  } catch {
    return '';
  }
}

function resolveAccessForRequest(req, session, effectiveTier) {
  const accessMap = buildPageAccessMapForTier(effectiveTier, session?.pageAccess || session?.channelAccess || []);
  const directTab = normalizePageSlug(resolveTabFromRequest(req));
  if (directTab) {
    return { tab: directTab, mode: accessMap[directTab] || 'none' };
  }
  const refererTab = normalizePageSlug(resolveTabFromReferer(req));
  if (refererTab) {
    return { tab: refererTab, mode: accessMap[refererTab] || 'none' };
  }
  return { tab: '', mode: '' };
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return salt + ':' + hash;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false; // reject unhashed passwords — migration must rehash first
  const test = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(test, 'hex'), Buffer.from(hash, 'hex'));
}

function loadAccounts() {
  try {
    const raw = fs.readFileSync(ACCOUNTS_PATH, 'utf8');
    const data = JSON.parse(raw);
    return data.accounts || [];
  } catch { return []; }
}

function saveAccounts(accounts) {
  fs.writeFileSync(ACCOUNTS_PATH, JSON.stringify({ accounts, initialized: true }, null, 2));
}

// Auto-create owner account from DASHBOARD_PASSWORD if no accounts exist
(function initAccounts() {
  const accounts = loadAccounts();
  if (accounts.length === 0) {
    accounts.push({
      id: crypto.randomUUID(),
      username: 'admin',
      password: hashPassword(DASHBOARD_PASSWORD),
      tier: 'owner',
      createdAt: Date.now(),
      lastLogin: null
    });
    saveAccounts(accounts);
    console.log('[Dashboard] Created default owner account: admin / (your DASHBOARD_PASSWORD)');
  }
})();

// Session management
const activeSessionTokens = new Map(); // token -> { loginTime, guildId, userId, username, tier }
const SESSIONS_PATH = path.join(DATA_DIR, 'sessions.json');
const SESSION_MAX_AGE = 86400000; // 24h in ms

// Restore sessions from disk on startup
(function restoreSessions() {
  try {
    const saved = JSON.parse(fs.readFileSync(SESSIONS_PATH, 'utf8'));
    const now = Date.now();
    let restored = 0;
    for (const [token, data] of Object.entries(saved)) {
      if (data.loginTime && (now - data.loginTime) < SESSION_MAX_AGE) {
        activeSessionTokens.set(token, data);
        restored++;
      }
    }
    if (restored > 0) console.log(`[Sessions] Restored ${restored} active sessions`);
  } catch { /* no sessions file or corrupted */ }
})();

// Cleanup expired sessions every 30 minutes
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [token, data] of activeSessionTokens) {
    if (now - data.loginTime > SESSION_MAX_AGE) {
      activeSessionTokens.delete(token);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    // Persist remaining sessions
    const sessions = {};
    for (const [token, data] of activeSessionTokens) sessions[token] = data;
    fs.promises.writeFile(SESSIONS_PATH, JSON.stringify(sessions, null, 2)).catch(() => {});
  }
}, 1800000);

function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

function getSessionFromCookie(req) {
  const token = req.headers.cookie?.match(/session=([^;]+)/)?.[1];
  if (!token) return null;
  return activeSessionTokens.get(token) || null;
}

function getSelectedGuildId(req) {
  const session = getSessionFromCookie(req);
  return session?.guildId || null;
}

function getUserTier(req) {
  const session = getSessionFromCookie(req);
  return session?.tier || 'viewer';
}

const PREVIEWABLE_TIERS = ['admin', 'moderator', 'viewer'];
function sanitizePreviewTier(value) {
  const v = String(value || '').trim().toLowerCase();
  return PREVIEWABLE_TIERS.includes(v) ? v : null;
}

function getEffectiveTierFromSession(session) {
  if (!session) return 'viewer';
  if (session.tier !== 'owner') return session.tier;
  return sanitizePreviewTier(session.previewTier) || session.tier;
}

function syncPreviewTierFromRequest(req, session) {
  if (!session || session.tier !== 'owner') return;
  if (!req?.query) return;
  if (!Object.prototype.hasOwnProperty.call(req.query, 'previewTier')) return;
  const raw = String(req.query.previewTier || '').trim().toLowerCase();
  if (!raw || raw === 'none' || raw === 'off') {
    session.previewTier = null;
    return;
  }
  session.previewTier = sanitizePreviewTier(raw);
}

function getUserName(req) {
  const session = getSessionFromCookie(req);
  return session?.username || 'Unknown';
}

// ========== API RATE LIMITING ==========
const _apiRateMap = new Map();
function apiRateLimit(maxRequests = 60, windowMs = 60000) {
  return (req, res, next) => {
    const key = (getSessionFromCookie(req)?.username || req.ip || 'anon') + ':' + req.path;
    const now = Date.now();
    let entry = _apiRateMap.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      _apiRateMap.set(key, entry);
    }
    entry.count++;
    if (entry.count > maxRequests) {
      res.setHeader('X-RateLimit-Limit', String(maxRequests));
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ success: false, error: 'Too many requests. Try again later.' });
    }
    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, maxRequests - entry.count)));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));
    _apiRateMap.set(key, entry);
    next();
  };
}
// Cleanup stale rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of _apiRateMap) {
    if (now > entry.resetAt) _apiRateMap.delete(key);
  }
}, 300000);

function requireAuth(req, res, next) {
  const session = getSessionFromCookie(req);
  if (!session) {
    if (req.path.startsWith('/api/') || req.path.startsWith('/upload/')) return res.status(401).json({ success: false, error: 'Not authenticated' });
    return res.redirect('/login');
  }
  if (!session.guildId) {
    if (req.path.startsWith('/api/') || req.path.startsWith('/upload/')) return res.status(401).json({ success: false, error: 'No server selected' });
    return res.redirect('/select-server');
  }
  syncPreviewTierFromRequest(req, session);
  req.guildId = session.guildId;
  req.userTier = session.tier;
  req.previewTier = sanitizePreviewTier(session.previewTier);
  req.effectiveTier = getEffectiveTierFromSession(session);
  req.pageAccessRules = normalizePageAccessRules(session.pageAccess || session.channelAccess || []);
  req.pageAccessMap = buildPageAccessMapForTier(req.effectiveTier, req.pageAccessRules);
  req.userName = session.username;
  return next();
}

function requireAuthOnly(req, res, next) {
  const session = getSessionFromCookie(req);
  if (!session) {
    if (req.path.startsWith('/api/') || req.path.startsWith('/upload/')) return res.status(401).json({ success: false, error: 'Not authenticated' });
    return res.redirect('/login');
  }
  syncPreviewTierFromRequest(req, session);
  req.userTier = session.tier;
  req.previewTier = sanitizePreviewTier(session.previewTier);
  req.effectiveTier = getEffectiveTierFromSession(session);
  req.pageAccessRules = normalizePageAccessRules(session.pageAccess || session.channelAccess || []);
  req.pageAccessMap = buildPageAccessMapForTier(req.effectiveTier, req.pageAccessRules);
  req.userName = session.username;
  return next();
}

function requireTier(minTier) {
  return (req, res, next) => {
    const session = getSessionFromCookie(req);
    if (!session) {
      if (req.path.startsWith('/api/') || req.path.startsWith('/upload/')) return res.status(401).json({ success: false, error: 'Not authenticated' });
      return res.redirect('/login');
    }
    syncPreviewTierFromRequest(req, session);
    const effectiveTier = getEffectiveTierFromSession(session);
    const userLevel = TIER_LEVELS[effectiveTier] || 0;
    const requiredLevel = TIER_LEVELS[minTier] || 0;
    if (userLevel < requiredLevel) {
      if (req.path.startsWith('/api/') || req.path.startsWith('/upload/')) return res.status(403).json({ success: false, error: 'Access denied. Requires ' + TIER_LABELS[minTier] + ' or higher.' });
      return res.status(403).send('<div style="text-align:center;padding:60px;font-family:Segoe UI;color:#ff6b6b;background:#0e0e10;min-height:100vh;display:flex;align-items:center;justify-content:center"><div><h1>🔒 Access Denied</h1><p style="color:#8b8fa3">You need <b>' + TIER_LABELS[minTier] + '</b> access or higher.</p><a href="/" style="color:#9146ff">← Back to Dashboard</a></div></div>');
    }
    req.guildId = session.guildId;
    req.userTier = session.tier;
    req.previewTier = sanitizePreviewTier(session.previewTier);
    req.effectiveTier = effectiveTier;
    req.pageAccessRules = normalizePageAccessRules(session.pageAccess || session.channelAccess || []);
    req.pageAccessMap = buildPageAccessMapForTier(req.effectiveTier, req.pageAccessRules);
    req.userName = session.username;
    return next();
  };
}

function canAccessCategory(tier, category) {
  return (TIER_ACCESS[tier] || []).includes(category);
}

// Login page
app.get('/login', (req, res) => {
  const session = getSessionFromCookie(req);
  if (session) {
    if (!session.guildId) return res.redirect('/select-server');
    return res.redirect(session.tier === 'viewer' ? '/pets' : '/');
  }
  const error = req.query.error === '1';
  const created = req.query.created === '1';
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <meta name="description" content="Private administration dashboard for the nephilheim Discord bot. Authorized access only.">
  <meta name="google-site-verification" content="WEZZE-2M8_bPXsA4aYQiylAAjcxctMCQFFxd6_45Qho" />
  <title>nephilheim Bot — Dashboard Login</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#000;color:#e0e0e0;font-family:'Segoe UI',Tahoma,Geneva,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center}

    .login-wrapper{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:20px;width:100%}

    .login-card{background:#0a0a0a;border:1px solid #1a1a1a;border-radius:12px;padding:40px 36px 32px;width:400px;max-width:100%;animation:fadeIn 0.4s ease-out both}
    @keyframes fadeIn{0%{opacity:0;transform:translateY(12px)}100%{opacity:1;transform:translateY(0)}}

    .login-title{text-align:center;margin-bottom:28px}
    .login-title h1{color:#fff;font-size:22px;font-weight:700;margin:0 0 6px}
    .login-title p{color:#555;font-size:13px;margin:0}

    .login-alert{padding:10px 14px;border-radius:6px;font-size:13px;margin-bottom:16px}
    .login-alert-error{background:rgba(255,60,60,0.1);border:1px solid rgba(255,60,60,0.2);color:#ff6b6b}
    .login-alert-success{background:rgba(67,181,129,0.1);border:1px solid rgba(67,181,129,0.2);color:#43b581}

    .field{margin-bottom:16px}
    .field label{display:block;font-size:12px;font-weight:600;color:#666;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px}
    .field input{width:100%;padding:11px 14px;background:#111;border:1px solid #222;border-radius:8px;color:#e0e0e0;font-size:14px;outline:none;transition:border-color 0.2s;box-sizing:border-box;margin:0}
    .field input:focus{border-color:#9146ff}
    .field input::placeholder{color:#444}
    .input-wrap{position:relative;display:flex;align-items:center}
    .pw-toggle{position:absolute;right:10px;background:none;border:none;cursor:pointer;font-size:14px;padding:4px;opacity:0.4;transition:opacity 0.2s;width:auto;margin:0}
    .pw-toggle:hover{opacity:0.8;background:none;transform:none}

    .login-submit{width:100%;padding:12px;background:#9146ff;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;transition:background 0.2s;margin-top:4px}
    .login-submit:hover{background:#a355ff;transform:none;box-shadow:none}

    .login-divider{display:flex;align-items:center;gap:12px;color:#333;font-size:12px;margin:16px 0}
    .login-divider span{flex:1;height:1px;background:#1a1a1a}

    .discord-login-btn{display:flex;align-items:center;justify-content:center;gap:8px;padding:11px;background:#5865f2;color:#fff;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;transition:background 0.2s;text-align:center}
    .discord-login-btn:hover{background:#4752c4;text-decoration:none}
    .create-account-btn{display:block;padding:11px;background:transparent;border:1px solid #1a1a1a;color:#888;border-radius:8px;font-size:14px;font-weight:500;text-decoration:none;transition:border-color 0.2s;text-align:center}
    .create-account-btn:hover{border-color:#333;color:#ccc;text-decoration:none}

    .login-foot{text-align:center;margin-top:20px}
    .login-foot a{color:#333;font-size:12px;text-decoration:none;transition:color 0.2s}
    .login-foot a:hover{color:#666}
    .login-notice{text-align:center;color:#222;font-size:11px;margin-top:16px}

    @media(max-width:480px){
      .login-card{padding:28px 20px 24px;margin:0 10px}
      .login-title h1{font-size:20px}
    }
  </style>
</head>
<body>
  <div class="login-wrapper">
    <div class="login-card" id="loginCard">
      <div class="login-title">
        <h1>nephilheim Bot</h1>
        <p>Authorized access only</p>
      </div>

      ${error ? '<div class="login-alert login-alert-error">\u26A0\uFE0F Invalid username or password.</div>' : ''}
      ${created ? '<div class="login-alert login-alert-success">\u2705 Account created! Please sign in.</div>' : ''}

      <form method="POST" action="/auth" id="loginForm">
        <div class="field">
          <label for="username">Username</label>
          <div class="input-wrap">
            <input type="text" id="username" name="username" placeholder="Enter your username" required autofocus autocomplete="username">
          </div>
        </div>
        <div class="field">
          <label for="password">Password</label>
          <div class="input-wrap">
            <input type="password" id="password" name="password" placeholder="Enter your password" required autocomplete="current-password">
            <button type="button" class="pw-toggle" id="pwToggle" tabindex="-1" title="Toggle password visibility">\u{1F441}\uFE0F</button>
          </div>
        </div>
        <button type="submit" class="login-submit" id="loginBtn">Sign In</button>
      </form>

      <div style="display:flex;flex-direction:column;gap:10px;margin-top:16px">
        <div class="login-divider"><span></span>or<span></span></div>
        ${DISCORD_CLIENT_ID ? '<a href="/auth/discord" class="discord-login-btn"><svg width="20" height="15" viewBox="0 0 71 55" fill="none"><path d="M60.1 4.9A58.5 58.5 0 0045.4.2a.2.2 0 00-.2.1 40.8 40.8 0 00-1.8 3.7 54 54 0 00-16.2 0A37.4 37.4 0 0025.4.3a.2.2 0 00-.2-.1A58.4 58.4 0 0010.5 5 59.5 59.5 0 00.4 44.7a.2.2 0 00.1.2 58.7 58.7 0 0017.7 9 .2.2 0 00.3-.1 42 42 0 003.6-5.9.2.2 0 00-.1-.3 38.6 38.6 0 01-5.5-2.6.2.2 0 01-.02-.36 30.4 30.4 0 001.1-.9.2.2 0 01.2 0 41.9 41.9 0 0035.6 0 .2.2 0 01.2 0l1.1.9a.2.2 0 01-.01.36 36.2 36.2 0 01-5.5 2.6.2.2 0 00-.1.3 47.1 47.1 0 003.6 5.9.2.2 0 00.3.1 58.5 58.5 0 0017.7-9 .2.2 0 00.1-.2c1.5-15.6-2.6-29.2-10.9-41.2zM23.7 36.7c-3.6 0-6.5-3.3-6.5-7.3s2.9-7.3 6.5-7.3 6.6 3.3 6.5 7.3c0 4-2.9 7.3-6.5 7.3zm24 0c-3.6 0-6.5-3.3-6.5-7.3s2.9-7.3 6.5-7.3 6.6 3.3 6.5 7.3c0 4-2.9 7.3-6.5 7.3z" fill="white"/></svg>Login with Discord</a>' : ''}
        <a href="/signup" class="create-account-btn">Create an Account</a>
      </div>

      <div class="login-foot"><a href="/privacy">Privacy Policy</a></div>
    </div>
    <div class="login-notice">nephilheim Discord community bot</div>
  </div>

  <script src="/login.js"></script>
</body>
</html>`);

});

// ── Signup page ──
app.get('/signup', (req, res) => {
  const session = getSessionFromCookie(req);
  if (session) return res.redirect('/');
  const error = req.query.error || '';
  const success = req.query.created === '1';
  const errorMessages = {
    'missing': 'All fields are required.',
    'username-length': 'Username must be 3-32 characters.',
    'username-chars': 'Username can only contain letters, numbers, _ and -',
    'username-taken': 'Username already exists.',
    'password-short': 'Password must be at least 8 characters.',
    'password-upper': 'Password must contain at least one uppercase letter.',
    'password-lower': 'Password must contain at least one lowercase letter.',
    'password-number': 'Password must contain at least one number.',
    'password-match': 'Passwords do not match.',
    'rate-limit': 'Too many signups. Please try again later.',
  };
  const errorMsg = errorMessages[error] || '';
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>nephilheim Bot — Create Account</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#000;color:#e0e0e0;font-family:'Segoe UI',Tahoma,Geneva,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center}

    .signup-wrapper{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:20px;width:100%}

    .signup-card{background:#0a0a0a;border:1px solid #1a1a1a;border-radius:12px;padding:36px;width:420px;max-width:100%;animation:fadeIn 0.4s ease-out both}
    @keyframes fadeIn{0%{opacity:0;transform:translateY(12px)}100%{opacity:1;transform:translateY(0)}}

    .signup-title{text-align:center;margin-bottom:24px}
    .signup-title h1{color:#fff;font-size:20px;font-weight:700;margin:0 0 4px}
    .signup-title p{color:#555;font-size:13px;margin:0}

    .alert{padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:18px}
    .alert-error{background:rgba(255,50,50,0.1);border:1px solid #2a1010;color:#ff6b6b}
    .alert-info{background:rgba(88,101,242,0.08);border:1px solid #1a1a2a;color:#888}

    .tier-notice{background:#0f0f0f;border:1px solid #1a1a1a;border-radius:8px;padding:10px 14px;font-size:12px;color:#555;margin-bottom:18px;text-align:center}
    .tier-notice strong{color:#9146ff}

    .field{margin-bottom:16px}
    .field label{display:block;font-size:12px;font-weight:600;color:#666;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px}
    .field input{width:100%;padding:12px 14px;background:#111;border:1px solid #222;border-radius:8px;color:#e0e0e0;font-size:14px;outline:none;transition:border-color 0.2s}
    .field input:focus{border-color:#9146ff}
    .field input::placeholder{color:#333}

    .signup-submit{width:100%;padding:13px;background:#9146ff;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;transition:background 0.2s;margin-top:4px}
    .signup-submit:hover{background:#7c3aed}

    .signup-foot{text-align:center;margin-top:20px}
    .signup-foot a{color:#444;font-size:13px;text-decoration:none;transition:color 0.2s}
    .signup-foot a:hover{color:#888}

    @media(max-width:480px){.signup-card{padding:24px 16px}}
  </style>
</head>
<body>
  <div class="signup-wrapper">
    <div class="signup-card">
      <div class="signup-title">
        <h1>Create Account</h1>
        <p>Join the nephilheim dashboard</p>
      </div>

      ${errorMsg ? '<div class="alert alert-error">' + errorMsg + '</div>' : ''}

      <div class="tier-notice">New accounts start with <strong>Viewer</strong> access. An admin can upgrade your permissions.</div>

      <form method="POST" action="/signup" id="signupForm">
        <div class="field">
          <label for="username">Username</label>
          <input type="text" id="username" name="username" placeholder="Choose a username" required minlength="3" maxlength="32" pattern="[a-zA-Z0-9_-]+" autocomplete="username">
        </div>
        <div class="field">
          <label for="password">Password</label>
          <input type="password" id="password" name="password" placeholder="Min 8 chars, upper + lower + number" required minlength="8" autocomplete="new-password">
        </div>
        <div class="field">
          <label for="confirmPassword">Confirm Password</label>
          <input type="password" id="confirmPassword" name="confirmPassword" placeholder="Re-enter your password" required minlength="8" autocomplete="new-password">
        </div>
        <button type="submit" class="signup-submit" id="signupBtn">Create Account</button>
      </form>

      <div class="signup-foot">
        <a href="/login">\u2190 Back to Sign In</a>
      </div>
    </div>
  </div>
  <script src="/signup.js"></script>
</body>
</html>`);
});

// Signup POST handler
app.post('/signup', (req, res) => {
  const { username, password, confirmPassword } = req.body;
  const clientIp = req.ip || req.connection.remoteAddress;

  // Rate limit
  if (!checkSignupRateLimit(clientIp)) {
    addLog('warn', `Signup rate-limited: ${clientIp}`);
    return res.redirect('/signup?error=rate-limit');
  }

  // Validation
  if (!username || !password || !confirmPassword) return res.redirect('/signup?error=missing');
  if (username.length < 3 || username.length > 32) return res.redirect('/signup?error=username-length');
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) return res.redirect('/signup?error=username-chars');
  if (password.length < 8) return res.redirect('/signup?error=password-short');
  if (!/[A-Z]/.test(password)) return res.redirect('/signup?error=password-upper');
  if (!/[a-z]/.test(password)) return res.redirect('/signup?error=password-lower');
  if (!/[0-9]/.test(password)) return res.redirect('/signup?error=password-number');
  if (password !== confirmPassword) return res.redirect('/signup?error=password-match');

  const accounts = loadAccounts();
  if (accounts.find(a => a.username.toLowerCase() === username.toLowerCase().trim())) {
    return res.redirect('/signup?error=username-taken');
  }

  // Always viewer tier — never trust client input for tier
  const newAccount = {
    id: crypto.randomUUID(),
    username: username.trim(),
    password: hashPassword(password),
    tier: 'viewer',
    createdAt: Date.now(),
    lastLogin: null
  };
  accounts.push(newAccount);
  saveAccounts(accounts);

  addLog('info', `New account created via signup: ${sanitizeString(username)} (viewer) from ${clientIp}`);
  dashAudit('system', 'signup', `New account created: ${sanitizeString(username)} (viewer) from ${clientIp}`);

  res.redirect('/login?created=1');
});

// ── Discord OAuth2 Login (optional) ──
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '';
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || '';
const DISCORD_OAUTH_SCOPE = 'identify';

function getDiscordRedirectUri(req) {
  const configured = (process.env.DISCORD_REDIRECT_URI || '').trim();
  if (configured) return configured;
  const forwardedProto = (req.headers['x-forwarded-proto'] || '').toString().split(',')[0].trim();
  const protocol = forwardedProto || req.protocol || 'https';
  const host = req.get('host');
  const renderUrl = (process.env.RENDER_EXTERNAL_URL || '').trim().replace(/\/+$/, '');
  if (renderUrl) return `${renderUrl}/auth/discord/callback`;
  return `${protocol}://${host}/auth/discord/callback`;
}

app.get('/auth/discord', (req, res) => {
  if (!DISCORD_CLIENT_ID) return res.redirect('/login?error=1');
  const clientIp = req.ip || req.connection.remoteAddress;
  const state = generateOAuthState(clientIp);
  const redirectUri = getDiscordRedirectUri(req);
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: DISCORD_OAUTH_SCOPE,
    state,
    prompt: 'consent'
  });
  res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
});

app.get('/auth/discord/callback', async (req, res) => {
  const { code, state } = req.query;
  const clientIp = req.ip || req.connection.remoteAddress;

  if (!code || !state) return res.redirect('/login?error=1');
  if (!validateOAuthState(state, clientIp)) {
    addLog('warn', `Invalid Discord OAuth state from ${clientIp}`);
    return res.redirect('/login?error=1');
  }

  try {
    const redirectUri = getDiscordRedirectUri(req);

    // Exchange code for token
    const tokenRes = await fetch('https://discord.com/api/v10/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      })
    });
    if (!tokenRes.ok) {
      addLog('warn', `Discord OAuth token exchange failed: ${tokenRes.status}`);
      return res.redirect('/login?error=1');
    }
    const tokenData = await tokenRes.json();

    // Fetch Discord user info
    const userRes = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    if (!userRes.ok) {
      addLog('warn', `Discord OAuth user fetch failed: ${userRes.status}`);
      return res.redirect('/login?error=1');
    }
    const discordUser = await userRes.json();
    const discordId = discordUser.id;
    const discordUsername = discordUser.username;
    const discordAvatar = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordId}/${discordUser.avatar}.png`
      : null;

    // Revoke the access token immediately — we only needed identity
    fetch('https://discord.com/api/v10/oauth2/token/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        token: tokenData.access_token
      })
    }).catch(() => {}); // fire-and-forget

    // Find existing account linked to this Discord ID
    const accounts = loadAccounts();
    let account = accounts.find(a => a.discordId === discordId);

    if (!account) {
      // Rate limit new account creation via Discord
      if (!checkSignupRateLimit(clientIp)) {
        addLog('warn', `Discord signup rate-limited: ${clientIp}`);
        return res.redirect('/login?error=1');
      }

      // Create new account with viewer tier
      account = {
        id: crypto.randomUUID(),
        username: `discord_${discordUsername}_${discordId.slice(-4)}`,
        password: hashPassword(crypto.randomBytes(32).toString('hex')), // random pw — Discord login only
        tier: 'viewer',
        discordId,
        discordUsername,
        discordAvatar,
        createdAt: Date.now(),
        lastLogin: Date.now()
      };
      accounts.push(account);
      saveAccounts(accounts);
      addLog('info', `New Discord account created: ${account.username} (discordId: ${discordId}) from ${clientIp}`);
      dashAudit('system', 'discord-signup', `Discord account created: ${account.username} (${discordUsername}#${discordId})`);
    } else {
      // Update Discord info on existing account
      account.discordUsername = discordUsername;
      account.discordAvatar = discordAvatar;
      account.lastLogin = Date.now();
      saveAccounts(accounts);
    }

    // Create session
    const token = generateSessionToken();
    const pageAccess = normalizePageAccessRules(account.pageAccess || account.channelAccess || []);
    activeSessionTokens.set(token, {
      loginTime: Date.now(),
      guildId: null,
      userId: account.id,
      username: account.username,
      tier: account.tier,
      channelAccess: Object.keys(pageAccess),
      pageAccess
    });

    res.setHeader('Set-Cookie', `session=${token}; Path=/; HttpOnly; Secure; Max-Age=86400; SameSite=Strict`);
    res.redirect('/select-server');

  } catch (e) {
    addLog('error', `Discord OAuth callback error: ${e.message}`);
    return res.redirect('/login?error=1');
  }
});

// ── Login brute-force protection ──
const _loginAttempts = new Map(); // ip -> { count, firstAttempt }
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minute lockout

function checkLoginRateLimit(ip) {
  const now = Date.now();
  const record = _loginAttempts.get(ip);
  if (!record) return true;
  if (now - record.firstAttempt > LOGIN_WINDOW_MS) { _loginAttempts.delete(ip); return true; }
  return record.count < LOGIN_MAX_ATTEMPTS;
}
function recordFailedLogin(ip) {
  const now = Date.now();
  const record = _loginAttempts.get(ip) || { count: 0, firstAttempt: now };
  record.count++;
  _loginAttempts.set(ip, record);
}
function clearLoginAttempts(ip) { _loginAttempts.delete(ip); }

// Auth handler
app.post('/auth', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.redirect('/login?error=1');

  // Brute-force protection (IP + username lockout)
  const clientIp = req.ip || req.connection.remoteAddress;
  if (!checkLoginRateLimit(clientIp)) {
    addLog('warn', `Login rate-limited (IP): ${clientIp}`);
    return res.redirect('/login?error=1');
  }
  if (!checkUsernameLockout(username)) {
    addLog('warn', `Login locked out (username): ${username} from ${clientIp}`);
    return res.redirect('/login?error=1');
  }
  
  const accounts = loadAccounts();
  const account = accounts.find(a => a.username.toLowerCase() === username.toLowerCase().trim());
  
  if (!account || !verifyPassword(password, account.password)) {
    recordFailedLogin(clientIp);
    recordUsernameFailedLogin(username);
    addLog('warn', `Failed login attempt: user="${sanitizeString(username)}" ip=${clientIp}`);
    dashAudit('system', 'failed-login', `Failed login for "${sanitizeString(username)}" from ${clientIp}`);
    return res.redirect('/login?error=1');
  }
  clearLoginAttempts(clientIp);
  clearUsernameLockout(username);
  
  // Update last login
  account.lastLogin = Date.now();
  saveAccounts(accounts);
  
  const token = generateSessionToken();
  const pageAccess = normalizePageAccessRules(account.pageAccess || account.channelAccess || []);
  activeSessionTokens.set(token, { 
    loginTime: Date.now(), 
    guildId: null, 
    userId: account.id, 
    username: account.username, 
    tier: account.tier,
    channelAccess: Object.keys(pageAccess),
    pageAccess
  });
  
  // Clean old sessions (older than 24h)
  const cutoff = Date.now() - 86400000;
  for (const [t, s] of activeSessionTokens) { if (s.loginTime < cutoff) activeSessionTokens.delete(t); }
  
  res.setHeader('Set-Cookie', `session=${token}; Path=/; HttpOnly; Secure; Max-Age=86400; SameSite=Strict`);
  res.redirect('/select-server');
});

// Server selection
app.get('/select-server', requireAuthOnly, async (req, res) => {
  // If bot isn't ready yet, show a loading page that auto-retries
  if (!client.isReady()) {
    return res.send(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="robots" content="noindex, nofollow"><meta name="google-site-verification" content="WEZZE-2M8_bPXsA4aYQiylAAjcxctMCQFFxd6_45Qho" /><title>Loading...</title>
<style>*{box-sizing:border-box}body{background:#0e0e10;color:#e0e0e0;font-family:'Segoe UI',Tahoma,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}
.loader{text-align:center}.spinner{width:48px;height:48px;border:4px solid #2a2f3a;border-top-color:#9146ff;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 20px}
@keyframes spin{to{transform:rotate(360deg)}}h2{margin:0 0 8px;color:#fff}p{color:#8b8fa3;font-size:13px}</style>
</head><body><div class="loader"><div class="spinner"></div><h2>Connecting to Discord...</h2><p>Please wait, the bot is starting up.</p></div>
<meta http-equiv="refresh" content="3"></head><body><div class="loader"><div class="spinner"></div><h2>Connecting to Discord...</h2><p>Please wait, the bot is starting up.</p></div>
</body></html>`);
  }

  let guilds = client.guilds.cache;

  try {
    // Fetch guilds from API to refresh cache, then use the cache
    // (cache has full Guild objects with iconURL, memberCount, etc.)
    await client.guilds.fetch();
    guilds = client.guilds.cache;
  } catch (err) {
    addLog('warn', `Failed to refresh guild list for dashboard: ${err.message}`);
  }

  const guildCards = Array.from(guilds.values()).map(g => {
    const memberCount = g.memberCount || g.members?.cache?.size || '?';
    let icon = null;
    try { icon = typeof g.iconURL === 'function' ? g.iconURL({ size: 128, dynamic: true }) : null; } catch(e) {}
    const initials = (g.name || 'Server').split(' ').map(w => w[0]).join('').slice(0,3).toUpperCase();
    return ` 
      <button class="server-card" data-guild-id="${g.id}">
        <div class="server-icon">${icon ? '<img src="' + icon + '" alt="">' : '<span>' + initials + '</span>'}</div>
        <div class="server-info">
          <div class="server-name">${g.name}</div>
          <div class="server-meta">${memberCount} members</div>
        </div>
        <div class="server-arrow">→</div>
      </button>`;
  }).join('');

  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <meta name="google-site-verification" content="WEZZE-2M8_bPXsA4aYQiylAAjcxctMCQFFxd6_45Qho" />
  <title>Select Server</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#000;color:#e0e0e0;font-family:'Segoe UI',Tahoma,Geneva,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center}

    .select-wrapper{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:20px;width:100%}

    .select-box{background:#0a0a0a;border:1px solid #1a1a1a;border-radius:12px;padding:36px;width:460px;max-width:100%;animation:fadeIn 0.4s ease-out both}
    @keyframes fadeIn{0%{opacity:0;transform:translateY(12px)}100%{opacity:1;transform:translateY(0)}}

    .select-header{text-align:center;margin-bottom:20px}
    .select-header h2{color:#fff;font-size:20px;font-weight:700;margin:0 0 4px}
    .select-header p{color:#555;font-size:13px;margin:0}

    .user-badge{text-align:center;margin-bottom:16px;padding:8px 14px;background:#0f0f0f;border:1px solid #1a1a1a;border-radius:8px;font-size:13px;color:#888}
    .user-badge b{color:#ccc}
    .user-badge .tier{font-weight:600;text-transform:uppercase;font-size:11px;letter-spacing:0.5px}

    .server-list{display:flex;flex-direction:column;gap:6px;max-height:400px;overflow-y:auto;padding-right:4px}
    .server-list::-webkit-scrollbar{width:5px}
    .server-list::-webkit-scrollbar-thumb{background:#222;border-radius:3px}
    .server-list::-webkit-scrollbar-track{background:transparent}

    .server-card{display:flex;align-items:center;gap:12px;width:100%;padding:12px 14px;background:#0f0f0f;border:1px solid #1a1a1a;border-radius:8px;cursor:pointer;color:#e0e0e0;font-family:inherit;font-size:14px;text-align:left;transition:border-color 0.2s, background 0.2s}
    .server-card:hover{background:#141414;border-color:#333}

    .server-icon{width:40px;height:40px;border-radius:50%;background:#111;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0}
    .server-icon img{width:100%;height:100%;object-fit:cover}
    .server-icon span{font-size:12px;font-weight:700;color:#9146ff}
    .server-info{flex:1;min-width:0}
    .server-name{font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .server-meta{font-size:12px;color:#555;margin-top:1px}
    .server-arrow{color:#333;font-size:16px;flex-shrink:0;transition:color 0.2s}
    .server-card:hover .server-arrow{color:#9146ff}

    .logout-link{display:block;text-align:center;margin-top:20px;color:#444;font-size:13px;text-decoration:none;transition:color 0.2s}
    .logout-link:hover{color:#888}
    .no-servers{text-align:center;padding:40px 20px;color:#555}

    @media(max-width:520px){.select-box{padding:24px 16px}.select-header h2{font-size:18px}}
  </style>
</head>
<body data-has-guilds="${guildCards ? '1' : '0'}">
  <div class="select-wrapper">
    <div class="select-box">
      <div class="select-header">
        <h2>Select a Server</h2>
        <p>Choose which server to manage</p>
      </div>
      <div class="user-badge" id="userBadge">
        Signed in as <b>${req.userName}</b>
        <span class="tier" style="color:${TIER_COLORS[req.userTier] || '#8b8fa3'}">(${TIER_LABELS[req.userTier] || req.userTier})</span>
      </div>
      <div class="server-list">
        ${guildCards || '<div class="no-servers">No servers found. Retrying...</div>'}
      </div>
      <a href="/logout" class="logout-link">\u2190 Sign out</a>
    </div>
  </div>

  <script src="/select-server.js"></script>
</body>
</html>`);

});

app.post('/api/select-server', requireAuthOnly, async (req, res) => {
  const { guildId } = req.body;
  let guild = client.guilds.cache.get(guildId);
  if (!guild && client.isReady()) {
    guild = await client.guilds.fetch(guildId).catch(() => null);
  }
  if (!guild) return res.json({ success: false, error: 'Server not found' });
  const token = req.headers.cookie?.match(/session=([^;]+)/)?.[1];
  if (!token || !activeSessionTokens.has(token)) return res.json({ success: false, error: 'Session expired' });
  const session = activeSessionTokens.get(token);
  session.guildId = guildId;
  res.json({ success: true });
});

app.get('/logout', (req, res) => {
  const token = req.headers.cookie?.match(/session=([^;]+)/)?.[1];
  if (token) activeSessionTokens.delete(token);
  res.setHeader('Set-Cookie', 'session=; Path=/; HttpOnly; Secure; Max-Age=0; SameSite=Strict');
  res.redirect('/login');
});

app.get('/switch-server', requireAuthOnly, (req, res) => {
  const token = req.headers.cookie?.match(/session=([^;]+)/)?.[1];
  if (token && activeSessionTokens.has(token)) {
    activeSessionTokens.get(token).guildId = null;
  }
  res.redirect('/select-server');
});

// === Account Management API (Owner-only) ===
app.get('/api/accounts', requireAuth, requireTier('admin'), (req, res) => {
  const accounts = loadAccounts().map(a => ({
    id: a.id,
    username: a.username,
    displayName: a.displayName || null,
    tier: a.tier,
    discordId: a.discordId || null,
    discordUsername: a.discordUsername || null,
    discordAvatar: a.discordAvatar || null,
    channelAccess: a.channelAccess || [],
    pageAccess: normalizePageAccessRules(a.pageAccess || a.channelAccess || []),
    createdAt: a.createdAt,
    lastLogin: a.lastLogin
  }));
  res.json({ success: true, accounts });
});

app.post('/api/accounts/create', requireAuth, requireTier('owner'), (req, res) => {
  const { username, password, tier, displayName, channelAccess, pageAccess } = req.body;
  if (!username || !password || !tier) return res.json({ success: false, error: 'Missing fields' });
  if (!['owner','admin','moderator','viewer'].includes(tier)) return res.json({ success: false, error: 'Invalid tier' });
  if (username.length < 3 || username.length > 32) return res.json({ success: false, error: 'Username must be 3-32 characters' });
  if (password.length < 8) return res.json({ success: false, error: 'Password must be at least 8 characters' });
  if (!/[A-Z]/.test(password)) return res.json({ success: false, error: 'Password must contain at least one uppercase letter' });
  if (!/[a-z]/.test(password)) return res.json({ success: false, error: 'Password must contain at least one lowercase letter' });
  if (!/[0-9]/.test(password)) return res.json({ success: false, error: 'Password must contain at least one number' });
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) return res.json({ success: false, error: 'Username can only contain letters, numbers, _ and -' });
  
  const accounts = loadAccounts();
  if (accounts.find(a => a.username.toLowerCase() === username.toLowerCase())) {
    return res.json({ success: false, error: 'Username already exists' });
  }
  
  const newAccount = {
    id: crypto.randomUUID(),
    username: username.trim(),
    password: hashPassword(password),
    tier,
    createdAt: Date.now(),
    lastLogin: null
  };
  if (displayName) newAccount.displayName = displayName.trim().slice(0, 64);
  const normalizedPageAccess = normalizePageAccessRules(pageAccess || channelAccess || []);
  if (Object.keys(normalizedPageAccess).length > 0) {
    newAccount.pageAccess = normalizedPageAccess;
    newAccount.channelAccess = Object.keys(normalizedPageAccess);
  }
  accounts.push(newAccount);
  saveAccounts(accounts);
  dashAudit(getUserName(req), 'create-account', `Created account: ${username} (${tier})`);
  res.json({ success: true });
});

app.post('/api/accounts/delete', requireAuth, requireTier('owner'), (req, res) => {
  const { id } = req.body;
  const session = getSessionFromCookie(req);
  const accounts = loadAccounts();
  const target = accounts.find(a => a.id === id);
  if (!target) return res.json({ success: false, error: 'Account not found' });
  if (target.id === session.userId) return res.json({ success: false, error: 'Cannot delete your own account' });
  
  const remaining = accounts.filter(a => a.id !== id);
  saveAccounts(remaining);
  
  // Invalidate their sessions
  for (const [t, s] of activeSessionTokens) {
    if (s.userId === id) activeSessionTokens.delete(t);
  }
  res.json({ success: true });
});

app.post('/api/accounts/update-tier', requireAuth, requireTier('admin'), (req, res) => {
  const { id, tier } = req.body;
  if (!['owner','admin','moderator','viewer'].includes(tier)) return res.json({ success: false, error: 'Invalid tier' });
  const session = getSessionFromCookie(req);
  if (id === session.userId) return res.json({ success: false, error: 'Cannot change your own tier' });
  
  const accounts = loadAccounts();
  const account = accounts.find(a => a.id === id);
  if (!account) return res.json({ success: false, error: 'Account not found' });

  // Admin cannot promote to owner or change owner accounts
  const callerTier = session.tier;
  if (callerTier === 'admin') {
    if (tier === 'owner') return res.json({ success: false, error: 'Only owners can promote to owner' });
    if (account.tier === 'owner') return res.json({ success: false, error: 'Cannot modify owner accounts' });
  }
  
  account.tier = tier;
  saveAccounts(accounts);
  dashAudit(getUserName(req), 'update-tier', `Changed ${account.username} tier to ${tier}`);
  
  // Update active sessions for this user
  for (const [, s] of activeSessionTokens) {
    if (s.userId === id) s.tier = tier;
  }
  res.json({ success: true });
});

app.post('/api/accounts/reset-password', requireAuth, requireTier('owner'), (req, res) => {
  const { id, newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) return res.json({ success: false, error: 'Password must be at least 8 characters' });
  if (!/[A-Z]/.test(newPassword)) return res.json({ success: false, error: 'Password must contain at least one uppercase letter' });
  if (!/[a-z]/.test(newPassword)) return res.json({ success: false, error: 'Password must contain at least one lowercase letter' });
  if (!/[0-9]/.test(newPassword)) return res.json({ success: false, error: 'Password must contain at least one number' });
  
  const accounts = loadAccounts();
  const account = accounts.find(a => a.id === id);
  if (!account) return res.json({ success: false, error: 'Account not found' });
  
  account.password = hashPassword(newPassword);
  saveAccounts(accounts);
  res.json({ success: true });
});

app.post('/api/accounts/change-own-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) return res.json({ success: false, error: 'New password must be at least 8 characters' });
  if (!/[A-Z]/.test(newPassword)) return res.json({ success: false, error: 'Password must contain at least one uppercase letter' });
  if (!/[a-z]/.test(newPassword)) return res.json({ success: false, error: 'Password must contain at least one lowercase letter' });
  if (!/[0-9]/.test(newPassword)) return res.json({ success: false, error: 'Password must contain at least one number' });
  
  const session = getSessionFromCookie(req);
  const accounts = loadAccounts();
  const account = accounts.find(a => a.id === session.userId);
  if (!account) return res.json({ success: false, error: 'Account not found' });
  if (!verifyPassword(currentPassword, account.password)) return res.json({ success: false, error: 'Current password is incorrect' });
  
  account.password = hashPassword(newPassword);
  saveAccounts(accounts);
  res.json({ success: true });
});

// Discord account linking (for existing local accounts)
app.get('/api/accounts/me', requireAuth, (req, res) => {
  const session = getSessionFromCookie(req);
  const accounts = loadAccounts();
  const account = accounts.find(a => a.id === session.userId);
  if (!account) return res.json({ success: false, error: 'Account not found' });
  res.json({
    success: true,
    id: account.id,
    username: account.username,
    displayName: account.displayName || null,
    bio: account.bio || '',
    accentColor: account.accentColor || '#5b5bff',
    profileEffect: account.profileEffect || 'none',
    customAvatar: account.customAvatar || null,
    avatarAnimated: account.avatarAnimated || false,
    customBanner: account.customBanner || null,
    bannerAnimated: account.bannerAnimated || false,
    tier: account.tier,
    theme: account.theme || 'dark',
    discordId: account.discordId || null,
    discordUsername: account.discordUsername || null,
    discordAvatar: account.discordAvatar || null,
    createdAt: account.createdAt,
    lastLogin: account.lastLogin
  });
});

app.post('/api/accounts/link-discord', requireAuth, (req, res) => {
  if (!DISCORD_CLIENT_ID) return res.json({ success: false, error: 'Discord OAuth not configured' });
  const session = getSessionFromCookie(req);
  const accounts = loadAccounts();
  const account = accounts.find(a => a.id === session.userId);
  if (!account) return res.json({ success: false, error: 'Account not found' });
  if (account.discordId) return res.json({ success: false, error: 'Discord already linked' });
  // Return the OAuth URL — frontend will redirect
  const clientIp = req.ip || req.connection.remoteAddress;
  const state = generateOAuthState(clientIp);
  const redirectUri = getDiscordRedirectUri(req);
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: DISCORD_OAUTH_SCOPE,
    state,
    prompt: 'consent'
  });
  // Store linking intent in state
  activeSessionTokens.get(Array.from(activeSessionTokens.entries()).find(([, s]) => s.userId === session.userId)?.[0] || '').__linkingDiscord = true;
  res.json({ success: true, url: `https://discord.com/oauth2/authorize?${params.toString()}` });
});

app.post('/api/accounts/unlink-discord', requireAuth, (req, res) => {
  const { password } = req.body;
  if (!password) return res.json({ success: false, error: 'Password required to unlink Discord' });
  const session = getSessionFromCookie(req);
  const accounts = loadAccounts();
  const account = accounts.find(a => a.id === session.userId);
  if (!account) return res.json({ success: false, error: 'Account not found' });
  if (!account.discordId) return res.json({ success: false, error: 'No Discord account linked' });
  if (!verifyPassword(password, account.password)) return res.json({ success: false, error: 'Incorrect password' });
  
  dashAudit(session.username, 'unlink-discord', `Unlinked Discord ${account.discordUsername || account.discordId}`);
  delete account.discordId;
  delete account.discordUsername;
  delete account.discordAvatar;
  saveAccounts(accounts);
  res.json({ success: true });
});

// ── Profile customization routes ──
app.post('/api/accounts/update-profile', requireAuth, (req, res) => {
  const { displayName, bio, accentColor, profileEffect } = req.body;
  const session = getSessionFromCookie(req);
  const accounts = loadAccounts();
  const account = accounts.find(a => a.id === session.userId);
  if (!account) return res.json({ success: false, error: 'Account not found' });
  if (displayName !== undefined) account.displayName = String(displayName).slice(0, 64).trim();
  if (bio !== undefined) account.bio = String(bio).slice(0, 280).trim();
  if (accentColor !== undefined && /^#[0-9a-fA-F]{6}$/.test(accentColor)) account.accentColor = accentColor;
  if (profileEffect !== undefined) {
    const allowed = ['none','sparkle','rainbow','fire','ice','neon-pulse','matrix','sakura','lightning','aurora'];
    account.profileEffect = allowed.includes(profileEffect) ? profileEffect : 'none';
  }
  saveAccounts(accounts);
  res.json({ success: true });
});

app.post('/api/accounts/upload-avatar', requireAuth, upload.single('avatar'), (req, res) => {
  if (!req.file) return res.json({ success: false, error: 'No file uploaded' });
  const ext = path.extname(req.file.originalname).toLowerCase();
  const allowedExts = ['.png','.jpg','.jpeg','.gif','.webp'];
  if (!allowedExts.includes(ext)) return res.json({ success: false, error: 'Allowed: png, jpg, gif, webp' });
  const session = getSessionFromCookie(req);
  const accounts = loadAccounts();
  const account = accounts.find(a => a.id === session.userId);
  if (!account) return res.json({ success: false, error: 'Account not found' });
  // Remove old custom avatar if any
  if (account.customAvatar) {
    const oldPath = path.join(UPLOADS_PERSIST_DIR, path.basename(account.customAvatar));
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }
  account.customAvatar = '/uploads/' + req.file.filename;
  account.avatarAnimated = ext === '.gif' || ext === '.webp';
  saveAccounts(accounts);
  res.json({ success: true, url: account.customAvatar, animated: account.avatarAnimated });
});

app.post('/api/accounts/upload-banner', requireAuth, upload.single('banner'), (req, res) => {
  if (!req.file) return res.json({ success: false, error: 'No file uploaded' });
  const ext = path.extname(req.file.originalname).toLowerCase();
  const allowedExts = ['.png','.jpg','.jpeg','.gif','.webp'];
  if (!allowedExts.includes(ext)) return res.json({ success: false, error: 'Allowed: png, jpg, gif, webp' });
  const session = getSessionFromCookie(req);
  const accounts = loadAccounts();
  const account = accounts.find(a => a.id === session.userId);
  if (!account) return res.json({ success: false, error: 'Account not found' });
  if (account.customBanner) {
    const oldPath = path.join(UPLOADS_PERSIST_DIR, path.basename(account.customBanner));
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }
  account.customBanner = '/uploads/' + req.file.filename;
  account.bannerAnimated = ext === '.gif' || ext === '.webp';
  saveAccounts(accounts);
  res.json({ success: true, url: account.customBanner, animated: account.bannerAnimated });
});

app.delete('/api/accounts/remove-avatar', requireAuth, (req, res) => {
  const session = getSessionFromCookie(req);
  const accounts = loadAccounts();
  const account = accounts.find(a => a.id === session.userId);
  if (!account) return res.json({ success: false, error: 'Account not found' });
  if (account.customAvatar) {
    const oldPath = path.join(UPLOADS_PERSIST_DIR, path.basename(account.customAvatar));
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }
  delete account.customAvatar;
  delete account.avatarAnimated;
  saveAccounts(accounts);
  res.json({ success: true });
});

app.delete('/api/accounts/remove-banner', requireAuth, (req, res) => {
  const session = getSessionFromCookie(req);
  const accounts = loadAccounts();
  const account = accounts.find(a => a.id === session.userId);
  if (!account) return res.json({ success: false, error: 'Account not found' });
  if (account.customBanner) {
    const oldPath = path.join(UPLOADS_PERSIST_DIR, path.basename(account.customBanner));
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }
  delete account.customBanner;
  delete account.bannerAnimated;
  saveAccounts(accounts);
  res.json({ success: true });
});

// Global middleware: block viewers from POST/PUT/DELETE API calls (except password change)
app.use('/api', (req, res, next) => {
  if (req.method === 'GET' || req.path === '/select-server') return next();
  if (req.path === '/accounts/change-own-password') return next();
  if (req.path === '/accounts/unlink-discord') return next();
  if (req.path === '/accounts/update-profile') return next();
  if (req.path === '/accounts/upload-avatar') return next();
  if (req.path === '/accounts/upload-banner') return next();
  if (req.path === '/accounts/remove-avatar') return next();
  if (req.path === '/accounts/remove-banner') return next();
  if (req.path === '/theme') return next();
  if (req.path.startsWith('/messaging/')) return next();
  const session = getSessionFromCookie(req);
  if (session) syncPreviewTierFromRequest(req, session);
  const effectiveTier = getEffectiveTierFromSession(session);
  if (session && !TIER_CAN_EDIT[effectiveTier]) {
    return res.status(403).json({ success: false, error: 'Read-only access. Your effective tier in preview does not allow modifications.' });
  }
  return next();
});

app.use((req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const session = getSessionFromCookie(req);
  if (!session) return next();
  syncPreviewTierFromRequest(req, session);
  const effectiveTier = getEffectiveTierFromSession(session);
  if (!TIER_CAN_EDIT[effectiveTier]) {
    if (req.path.startsWith('/api/') || req.path.startsWith('/upload/')) {
      return res.status(403).json({ success: false, error: 'Read-only access. This action is blocked in preview mode.' });
    }
    return res.status(403).send('Read-only access. This action is blocked in preview mode.');
  }
  return next();
});

/* ======================
   FEATURE DATA STORES
====================== */
const MEMBER_GROWTH_PATH = path.join(DATA_DIR, 'member-growth.json');
const CMD_USAGE_PATH = path.join(DATA_DIR, 'command-usage.json');
const DASH_AUDIT_PATH = path.join(DATA_DIR, 'dashboard-audit.json');
const SCHED_MSG_PATH = path.join(DATA_DIR, 'scheduled-messages.json');
const REACTION_ROLES_PATH = path.join(DATA_DIR, 'reaction-roles.json');
const TICKETS_PATH = path.join(DATA_DIR, 'tickets.json');
const STARBOARD_PATH = path.join(DATA_DIR, 'starboard.json');
const AUTOMOD_PATH = path.join(DATA_DIR, 'automod.json');
const API_KEYS_PATH = path.join(DATA_DIR, 'api-keys.json');
const WEBHOOKS_PATH = path.join(DATA_DIR, 'webhooks.json');
const MODERATION_PATH = path.join(DATA_DIR, 'moderation.json');
const PETS_PATH = path.join(DATA_DIR, 'pets.json');
const IDLEON_GP_PATH = path.join(DATA_DIR, 'idleon-gp.json');
const MEMBERS_CACHE_PATH = path.join(DATA_DIR, 'members-cache.json');
const MESSAGING_PATH = path.join(DATA_DIR, 'messaging.json');

function loadJSON(fp, def) { try { return JSON.parse(fs.readFileSync(fp,'utf8')); } catch { return def; } }
// File write queue to prevent race conditions
const _writeQueues = new Map();
const SENSITIVE_FILES = new Set(['accounts.json', 'api-keys.json', 'sessions.json']);
function saveJSON(fp, data) {
  const str = JSON.stringify(data, null, 2);
  const isSensitive = SENSITIVE_FILES.has(path.basename(fp));
  if (!_writeQueues.has(fp)) _writeQueues.set(fp, Promise.resolve());
  const chain = _writeQueues.get(fp).then(() => 
    fs.promises.writeFile(fp, str, isSensitive ? { mode: 0o600 } : undefined)
  ).catch(err => {
    console.error(`[ERROR] saveJSON failed for ${fp}:`, err.message);
    addLog('error', `saveJSON failed: ${path.basename(fp)} - ${err.message}`);
  });
  _writeQueues.set(fp, chain);
  return chain;
}

// ========== MEMBER CACHE SYSTEM ==========
let membersCache = loadJSON(MEMBERS_CACHE_PATH, { members: {}, lastFullSync: null });

function saveMembersCache() {
  saveJSON(MEMBERS_CACHE_PATH, membersCache);
}

function updateMemberCache(member, action) {
  if (!member?.id) return;
  if (action === 'remove') {
    delete membersCache.members[member.id];
  } else {
    membersCache.members[member.id] = {
      id: member.id,
      username: member.user?.username || 'Unknown',
      displayName: member.displayName || member.user?.username || 'Unknown',
      roles: [...member.roles.cache.keys()].filter(r => r !== member.guild?.id),
      joinedAt: member.joinedAt?.getTime() || Date.now(),
      updatedAt: Date.now()
    };
  }
  saveMembersCache();
}

function fullMemberCacheSync(guild) {
  const newCache = {};
  for (const [id, member] of guild.members.cache) {
    if (member.user?.bot) continue;
    newCache[id] = {
      id,
      username: member.user?.username || 'Unknown',
      displayName: member.displayName || member.user?.username || 'Unknown',
      roles: [...member.roles.cache.keys()].filter(r => r !== guild.id),
      joinedAt: member.joinedAt?.getTime() || null,
      updatedAt: Date.now()
    };
  }
  membersCache = { members: newCache, lastFullSync: Date.now() };
  saveMembersCache();
  addLog('info', `Member cache synced: ${Object.keys(newCache).length} members saved`);
}

// Activity feed buffer (in-memory, last 200 events)
const activityFeed = [];
function pushActivity(type, data) {
  const evt = { type, ...data, ts: Date.now() };
  activityFeed.unshift(evt);
  if (activityFeed.length > 200) activityFeed.length = 200;
  io.emit('activity', evt);
}

// Dashboard audit log
function dashAudit(user, action, details, snapshot) {
  const data = loadJSON(DASH_AUDIT_PATH, {entries:[]});
  const entry = { user, action, details, ts: Date.now() };
  if (snapshot) entry.snapshot = snapshot;
  data.entries.unshift(entry);
  if (data.entries.length > 1000) data.entries.length = 1000;
  saveJSON(DASH_AUDIT_PATH, data);
  pushActivity('dash-audit', { user, action, details });
}

// Member growth tracking
function trackMemberGrowth(type) {
  const data = loadJSON(MEMBER_GROWTH_PATH, {daily:[],hourlyActivity:[]});
  const today = new Date().toISOString().slice(0,10);
  let day = data.daily.find(d => d.date === today);
  if (!day) { day = { date: today, joins: 0, leaves: 0 }; data.daily.push(day); }
  if (type === 'join') day.joins++;
  if (type === 'leave') day.leaves++;
  if (data.daily.length > 365) data.daily = data.daily.slice(-365);
  saveJSON(MEMBER_GROWTH_PATH, data);
}

// Command usage tracking
function trackCommand(name, userId) {
  const data = loadJSON(CMD_USAGE_PATH, {commands:{},hourly:[]});
  if (!data.commands[name]) data.commands[name] = { count: 0, users: {}, lastUsed: 0 };
  data.commands[name].count++;
  data.commands[name].lastUsed = Date.now();
  data.commands[name].users[userId] = (data.commands[name].users[userId]||0) + 1;
  const hour = new Date().toISOString().slice(0,13);
  let h = data.hourly.find(x => x.hour === hour);
  if (!h) { h = { hour, count: 0 }; data.hourly.push(h); }
  h.count++;
  if (data.hourly.length > 720) data.hourly = data.hourly.slice(-720);
  saveJSON(CMD_USAGE_PATH, data);
}

// Scheduled messages checker
const scheduledMsgIntervals = new Map();
function checkScheduledMessages() {
  const data = loadJSON(SCHED_MSG_PATH, {messages:[]});
  const now = Date.now();
  let changed = false;
  for (const msg of data.messages) {
    if (msg.sent || msg.sendAt > now) continue;
    const channel = client.channels?.cache?.get(msg.channelId);
    if (channel) {
      if (msg.embed) {
        channel.send({ embeds: [msg.embed] }).catch(() => {});
      } else {
        channel.send(msg.content || 'Scheduled message').catch(() => {});
      }
      msg.sent = true;
      changed = true;
      pushActivity('scheduled-msg', { content: (msg.content||'').slice(0,50), channelId: msg.channelId });
    }
  }
  if (changed) saveJSON(SCHED_MSG_PATH, data);
}
setInterval(checkScheduledMessages, 15000);

// ========== RECURRING SCHEDULED MESSAGES ==========
function checkRecurringMessages() {
  const data = loadJSON(SCHED_MSG_PATH, {messages:[]});
  const now = Date.now();
  let changed = false;
  for (const msg of data.messages) {
    if (!msg.recurring || !msg.intervalMs) continue;
    if (msg.paused) continue;
    const lastSent = msg.lastSentAt || 0;
    if (now - lastSent < msg.intervalMs) continue;
    const channel = client.channels?.cache?.get(msg.channelId);
    if (channel) {
      if (msg.embed) {
        channel.send({ embeds: [msg.embed] }).catch(() => {});
      } else {
        channel.send(msg.content || 'Scheduled message').catch(() => {});
      }
      msg.lastSentAt = now;
      msg.sendCount = (msg.sendCount || 0) + 1;
      changed = true;
      pushActivity('recurring-msg', { content: (msg.content||'').slice(0,50), channelId: msg.channelId });
    }
  }
  if (changed) saveJSON(SCHED_MSG_PATH, data);
}
setInterval(checkRecurringMessages, 60000);

// ========== TEMP BANS CHECKER ==========
async function checkTempBans() {
  const now = Date.now();
  const expired = tempBans.filter(b => b.unbanAt <= now);
  for (const ban of expired) {
    try {
      const guild = client.guilds.cache.get(ban.guildId);
      if (guild) {
        await guild.members.unban(ban.userId, 'Temporary ban expired').catch(() => {});
        addLog('info', `Temp ban expired: unbanned user ${ban.userId}`);
      }
    } catch (e) {
      addLog('error', `Failed to unban temp-banned user ${ban.userId}: ${e.message}`);
    }
  }
  if (expired.length > 0) {
    tempBans = tempBans.filter(b => b.unbanAt > now);
    saveState();
  }
}
setInterval(checkTempBans, 30000);

// ========== TEMP ROLES CHECKER ==========
async function checkTempRoles() {
  const now = Date.now();
  const expired = tempRoles.filter(r => r.removeAt <= now);
  for (const tr of expired) {
    try {
      const guild = client.guilds.cache.get(tr.guildId);
      if (guild) {
        const member = await guild.members.fetch(tr.userId).catch(() => null);
        if (member && member.roles.cache.has(tr.roleId)) {
          await member.roles.remove(tr.roleId, 'Temporary role expired');
          addLog('info', `Temp role ${tr.roleId} removed from ${tr.userId}`);
        }
      }
    } catch (e) {
      addLog('error', `Failed to remove temp role: ${e.message}`);
    }
  }
  if (expired.length > 0) {
    tempRoles = tempRoles.filter(r => r.removeAt > now);
    saveState();
  }
}
setInterval(checkTempRoles, 30000);

// ========== LOG ROTATION ==========
function rotateLogsIfNeeded() {
  try {
    if (!fs.existsSync(LOG_FILE)) return;
    const stat = fs.statSync(LOG_FILE);
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (stat.size < maxSize) return;
    const rotatedPath = LOG_FILE.replace('.json', `-${Date.now()}.json`);
    fs.renameSync(LOG_FILE, rotatedPath);
    fs.writeFileSync(LOG_FILE, JSON.stringify([], null, 2));
    logs.length = 0;
    addLog('info', `Logs rotated (was ${Math.round(stat.size/1024)}KB) → ${path.basename(rotatedPath)}`);
    // Clean up old rotated logs (keep last 3)
    const dir = path.dirname(LOG_FILE);
    const rotated = fs.readdirSync(dir).filter(f => f.startsWith('logs-') && f.endsWith('.json')).sort().reverse();
    for (const old of rotated.slice(3)) {
      fs.unlinkSync(path.join(dir, old));
    }
  } catch (e) {
    addLog('error', `Log rotation failed: ${e.message}`);
  }
}
setInterval(rotateLogsIfNeeded, 60 * 60 * 1000); // Check hourly

// ---- AUTO NEWS FEED ----
// Posts news to a dedicated channel at configured intervals using Qwen AI to summarize
let lastNewsPost = 0;
async function checkNewsFeed() {
  const cfg = smartBot.config;
  if (!cfg.newsChannelId) return;
  const intervalMs = (cfg.newsInterval || 4) * 60 * 60 * 1000;
  if (Date.now() - lastNewsPost < intervalMs) return;

  const channel = client.channels?.cache?.get(cfg.newsChannelId);
  if (!channel) return;

  try {
    // Fetch real news from curated subreddits (tech, science, world events)
    const newsSubreddits = ['worldnews', 'technology', 'science', 'UpliftingNews'];
    const topicMap = {
      tech: 'technology', science: 'science', biomedical: 'science',
      war: 'worldnews', wars: 'worldnews', politics: 'worldnews',
      world: 'worldnews', health: 'science', space: 'space',
      ai: 'artificial', gaming: 'Games', environment: 'environment'
    };
    const topics = cfg.newsTopics && cfg.newsTopics.length > 0 ? cfg.newsTopics : ['top'];
    const allResults = [];
    for (const topic of topics.slice(0, 3)) {
      let url;
      if (topic === 'top') {
        // Rotate between quality news subreddits
        const sub = newsSubreddits[Math.floor(Date.now() / 3600000) % newsSubreddits.length];
        url = `https://www.reddit.com/r/${sub}/hot.json?limit=8`;
      } else {
        const mappedSub = topicMap[topic.toLowerCase()];
        url = mappedSub
          ? `https://www.reddit.com/r/${mappedSub}/hot.json?limit=5`
          : `https://www.reddit.com/search.json?q=${encodeURIComponent(topic)}&sort=new&limit=3&t=day&type=link`;
      }
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url, { headers: { 'User-Agent': 'DiscordBot/1.0' }, signal: controller.signal }).catch(() => null);
      clearTimeout(timer);
      if (!res || !res.ok) continue;
      const data = await res.json().catch(() => null);
      if (data?.data?.children) {
        for (const post of data.data.children.slice(0, 5)) {
          const d = post.data;
          if (d?.title && !d.over_18 && !d.is_self) {
            // Skip personal stories, memes, and low-quality posts
            if (d.link_flair_text && /meme|humor|satire|opinion|personal/i.test(d.link_flair_text)) continue;
            if (d.score < 50) continue; // Only posts with decent engagement
            const postUrl = d.url_overridden_by_dest || (d.permalink ? `https://reddit.com${d.permalink}` : null);
            allResults.push({ source: d.subreddit || 'news', title: d.title, url: postUrl });
          }
        }
      }
    }
    if (allResults.length === 0) return;

    // Deduplicate by title
    const seen = new Set();
    const unique = allResults.filter(r => {
      const key = r.title.toLowerCase().substring(0, 60);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 5);

    // Post plain headline list
    let post = '📰 **News Update**\n';
    for (const r of unique) {
      const link = r.url ? ` — <${r.url}>` : '';
      post += `• **${r.source}**: ${r.title}${link}\n`;
    }
    await channel.send(post).catch(() => {});
    lastNewsPost = Date.now();
  } catch {
    // Silently fail — news is non-critical
  }
}
setInterval(checkNewsFeed, 5 * 60 * 1000); // Check every 5 min (actual posting controlled by newsInterval)

// Auto-mod message spam tracker
const spamTracker = new Map();

/* ======================
   FEATURE API ROUTES
====================== */

// --- Activity Feed API ---
app.get('/api/activity-feed', requireAuth, (req, res) => {
  res.json({ success: true, feed: activityFeed.slice(0, 100) });
});

// --- Dashboard Audit Log API ---
app.get('/api/dashboard-audit', requireAuth, requireTier('admin'), (req, res) => {
  const data = loadJSON(DASH_AUDIT_PATH, {entries:[]});
  res.json({ success: true, entries: data.entries.slice(0, 200) });
});

app.post('/api/dashboard-audit/revert', requireAuth, requireTier('owner'), (req, res) => {
  try {
    const { ts, action, user } = req.body;
    if (!ts || !action) return res.json({ success: false, error: 'Missing ts or action' });
    const data = loadJSON(DASH_AUDIT_PATH, {entries:[]});
    const entry = data.entries.find(e => e.ts === ts && e.action === action);
    if (entry && entry.snapshot) {
      const snap = entry.snapshot;
      let reverted = false;
      if (snap.type === 'state' && snap.key && snap.before !== undefined) {
        const target = snap.key.split('.').reduce((o, k) => o && o[k], { state, dashboardSettings, welcomeSettings, engagementSettings, auditLogSettings, levelingConfig, config, streamGoals });
        if (target !== undefined) {
          const keys = snap.key.split('.');
          const root = keys[0];
          const refs = { state, dashboardSettings, welcomeSettings, engagementSettings, auditLogSettings, levelingConfig, config, streamGoals };
          if (keys.length === 1 && refs[root] !== undefined) {
            Object.assign(refs[root], snap.before);
            reverted = true;
          } else if (keys.length === 2 && refs[root]) {
            refs[root][keys[1]] = snap.before;
            reverted = true;
          }
          if (reverted) {
            saveState();
            if (root === 'config') saveConfig();
          }
        }
      }
      dashAudit(req.userName, 'revert', `Reverted "${action}" by ${user} at ${new Date(ts).toLocaleString()}${reverted ? ' (restored)' : ' (snapshot found but could not auto-restore)'}`);
      addLog('info', `Revert by ${req.userName}: ${action} by ${user} - ${reverted ? 'restored' : 'manual review needed'}`);
      res.json({ success: true, reverted });
    } else {
      dashAudit(req.userName, 'revert-request', `Revert requested for "${action}" by ${user} at ${new Date(ts).toLocaleString()} (no snapshot)`);
      addLog('info', `Revert requested by ${req.userName}: ${action} by ${user} (no snapshot available)`);
      res.json({ success: true, reverted: false, message: 'No snapshot available for this entry - manual revert needed' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Member Growth API ---
app.get('/api/member-growth', requireAuth, (req, res) => {
  const data = loadJSON(MEMBER_GROWTH_PATH, {daily:[]});
  res.json({ success: true, daily: data.daily.slice(-90) });
});

// --- Command Usage API ---
app.get('/api/command-usage', requireAuth, (req, res) => {
  const data = loadJSON(CMD_USAGE_PATH, {commands:{},hourly:[]});
  const sorted = Object.entries(data.commands).sort((a,b) => b[1].count - a[1].count);
  res.json({ success: true, commands: sorted.slice(0,50).map(([n,d])=>({name:n,count:d.count,lastUsed:d.lastUsed,uniqueUsers:Object.keys(d.users).length})), hourly: data.hourly.slice(-168) });
});

// --- Moderation API ---
app.get('/api/moderation', requireAuth, requireTier('moderator'), (req, res) => {
  const data = loadJSON(MODERATION_PATH, {warnings:[],cases:[]});
  res.json({ success: true, warnings: data.warnings.slice(0,200), cases: data.cases.slice(0,200) });
});

app.post('/api/moderation/warn', requireAuth, requireTier('moderator'), async (req, res) => {
  const { userId, reason } = req.body;
  if (!userId || !reason) return res.json({ success: false, error: 'Missing userId or reason' });
  const data = loadJSON(MODERATION_PATH, {warnings:[],cases:[]});
  const warn = { id: crypto.randomUUID(), userId, reason, moderator: req.userName, ts: Date.now() };
  data.warnings.push(warn);
  data.cases.push({ type: 'warn', ...warn });
  saveJSON(MODERATION_PATH, data);
  dashAudit(req.userName, 'warn-user', 'Warned user ' + userId + ': ' + reason);
  pushActivity('moderation', { action: 'warn', userId, reason, moderator: req.userName });

  // ========== MOD AUTO-ESCALATION ==========
  if (modEscalation.enabled) {
    const userWarns = data.warnings.filter(w => (w.odId || w.userId) === userId);
    const thresholds = (modEscalation.warnThresholds || []).sort((a, b) => b.warns - a.warns);
    for (const threshold of thresholds) {
      if (userWarns.length >= threshold.warns) {
        try {
          const guild = client.guilds.cache.first();
          const member = await guild?.members?.fetch(userId).catch(() => null);
          if (!member) break;
          if (threshold.action === 'timeout' && threshold.duration) {
            await member.timeout(threshold.duration * 1000, `Auto-escalation: ${userWarns.length} warnings`);
            data.cases.push({ type: 'timeout', id: crypto.randomUUID(), userId, duration: threshold.duration, reason: `Auto-escalation (${userWarns.length} warnings)`, moderator: 'Auto-Mod', ts: Date.now(), autoEscalation: true });
            addLog('info', `Auto-escalation: ${userWarns.length} warns → timeout ${threshold.duration}s for ${userId}`);
          } else if (threshold.action === 'kick') {
            await member.kick(`Auto-escalation: ${userWarns.length} warnings`);
            data.cases.push({ type: 'kick', id: crypto.randomUUID(), userId, reason: `Auto-escalation (${userWarns.length} warnings)`, moderator: 'Auto-Mod', ts: Date.now(), autoEscalation: true });
            addLog('info', `Auto-escalation: ${userWarns.length} warns → kick for ${userId}`);
          } else if (threshold.action === 'ban') {
            await guild.members.ban(userId, { reason: `Auto-escalation: ${userWarns.length} warnings` });
            data.cases.push({ type: 'ban', id: crypto.randomUUID(), userId, reason: `Auto-escalation (${userWarns.length} warnings)`, moderator: 'Auto-Mod', ts: Date.now(), autoEscalation: true });
            addLog('info', `Auto-escalation: ${userWarns.length} warns → ban for ${userId}`);
          }
          saveJSON(MODERATION_PATH, data);
        } catch (e) {
          addLog('error', `Auto-escalation failed for ${userId}: ${e.message}`);
        }
        break; // Only apply highest matching threshold
      }
    }
  }

  res.json({ success: true, warning: warn });
});

app.post('/api/moderation/timeout', requireAuth, requireTier('moderator'), async (req, res) => {
  const { userId, duration, reason, guildId } = req.body;
  if (!userId) return res.json({ success: false, error: 'Missing userId' });
  try {
    const guild = client.guilds.cache.get(guildId || req.guildId);
    const member = await guild?.members?.fetch(userId).catch(() => null);
    if (!member) return res.json({ success: false, error: 'Member not found' });
    await member.timeout((duration || 60) * 1000, reason || 'Dashboard timeout');
    const data = loadJSON(MODERATION_PATH, {warnings:[],cases:[]});
    data.cases.push({ type: 'timeout', id: crypto.randomUUID(), userId, duration: duration||60, reason: reason||'Dashboard timeout', moderator: req.userName, ts: Date.now() });
    saveJSON(MODERATION_PATH, data);
    dashAudit(req.userName, 'timeout-user', 'Timed out ' + userId + ' for ' + (duration||60) + 's');
    pushActivity('moderation', { action: 'timeout', userId, moderator: req.userName });
    res.json({ success: true });
  } catch(e) { addLog('error', `Timeout failed: ${e.message}`); res.json({ success: false, error: 'Operation failed' }); }
});

app.post('/api/moderation/kick', requireAuth, requireTier('admin'), async (req, res) => {
  const { userId, reason, guildId } = req.body;
  if (!userId) return res.json({ success: false, error: 'Missing userId' });
  try {
    const guild = client.guilds.cache.get(guildId || req.guildId);
    const member = await guild?.members?.fetch(userId).catch(() => null);
    if (!member) return res.json({ success: false, error: 'Member not found' });
    await member.kick(reason || 'Dashboard kick');
    const data = loadJSON(MODERATION_PATH, {warnings:[],cases:[]});
    data.cases.push({ type: 'kick', id: crypto.randomUUID(), userId, reason: reason||'Dashboard kick', moderator: req.userName, ts: Date.now() });
    saveJSON(MODERATION_PATH, data);
    dashAudit(req.userName, 'kick-user', 'Kicked ' + userId);
    res.json({ success: true });
  } catch(e) { addLog('error', `Kick failed: ${e.message}`); res.json({ success: false, error: 'Operation failed' }); }
});

app.post('/api/moderation/ban', requireAuth, requireTier('admin'), async (req, res) => {
  const { userId, reason, deleteMessageDays, guildId } = req.body;
  if (!userId) return res.json({ success: false, error: 'Missing userId' });
  try {
    const guild = client.guilds.cache.get(guildId || req.guildId);
    await guild.members.ban(userId, { reason: reason || 'Dashboard ban', deleteMessageSeconds: (deleteMessageDays||0)*86400 });
    const data = loadJSON(MODERATION_PATH, {warnings:[],cases:[]});
    data.cases.push({ type: 'ban', id: crypto.randomUUID(), userId, reason: reason||'Dashboard ban', moderator: req.userName, ts: Date.now() });
    saveJSON(MODERATION_PATH, data);
    dashAudit(req.userName, 'ban-user', 'Banned ' + userId);
    res.json({ success: true });
  } catch(e) { addLog('error', `Ban failed: ${e.message}`); res.json({ success: false, error: 'Operation failed' }); }
});

app.post('/api/moderation/unban', requireAuth, requireTier('admin'), async (req, res) => {
  const { userId, guildId } = req.body;
  try {
    const guild = client.guilds.cache.get(guildId || req.guildId);
    await guild.members.unban(userId);
    dashAudit(req.userName, 'unban-user', 'Unbanned ' + userId);
    res.json({ success: true });
  } catch(e) { addLog('error', `Unban failed: ${e.message}`); res.json({ success: false, error: 'Operation failed' }); }
});

app.post('/api/moderation/clear-warnings', requireAuth, requireTier('admin'), (req, res) => {
  const { userId } = req.body;
  const data = loadJSON(MODERATION_PATH, {warnings:[],cases:[]});
  data.warnings = data.warnings.filter(w => (w.userId || w.odId) !== userId);
  saveJSON(MODERATION_PATH, data);
  dashAudit(req.userName, 'clear-warnings', 'Cleared warnings for ' + userId);
  res.json({ success: true });
});

// --- Case Discussion API ---
app.get('/api/moderation/case/comments', requireAuth, requireTier('moderator'), (req, res) => {
  const { caseId } = req.query;
  if (!caseId) return res.json({ success: false, error: 'Missing caseId' });
  const data = loadJSON(MODERATION_PATH, { warnings: [], cases: [], caseComments: {} });
  const comments = (data.caseComments || {})[caseId] || [];
  res.json({ success: true, comments });
});

app.post('/api/moderation/case/comment', requireAuth, requireTier('moderator'), (req, res) => {
  const { caseId, text } = req.body;
  if (!caseId || !text) return res.json({ success: false, error: 'Missing caseId or text' });
  const data = loadJSON(MODERATION_PATH, { warnings: [], cases: [], caseComments: {} });
  if (!data.caseComments) data.caseComments = {};
  if (!data.caseComments[caseId]) data.caseComments[caseId] = [];
  data.caseComments[caseId].push({ user: req.userName || 'Unknown', text: String(text).slice(0, 500), ts: Date.now() });
  saveJSON(MODERATION_PATH, data);
  dashAudit(req.userName, 'case-comment', 'Added comment to case ' + caseId);
  res.json({ success: true });
});

// ========== NEW FEATURE API ROUTES ==========

// --- Booster Auto-Roles ---
app.get('/api/booster-roles', requireAuth, requireTier('admin'), (req, res) => {
  res.json({ success: true, roles: boosterAutoRoles });
});
app.post('/api/booster-roles', requireAuth, requireTier('admin'), (req, res) => {
  const { roles } = req.body;
  if (!Array.isArray(roles)) return res.json({ success: false, error: 'roles must be an array' });
  boosterAutoRoles = roles.filter(r => typeof r === 'string' && /^\d{16,22}$/.test(r));
  saveState();
  dashAudit(req.userName, 'booster-roles', `Updated booster auto-roles: ${boosterAutoRoles.length} roles`);
  res.json({ success: true, roles: boosterAutoRoles });
});

// --- Mod Escalation Config ---
app.get('/api/mod-escalation', requireAuth, requireTier('admin'), (req, res) => {
  res.json({ success: true, config: modEscalation });
});
app.post('/api/mod-escalation', requireAuth, requireTier('admin'), (req, res) => {
  const { enabled, warnThresholds } = req.body;
  if (typeof enabled === 'boolean') modEscalation.enabled = enabled;
  if (Array.isArray(warnThresholds)) {
    modEscalation.warnThresholds = warnThresholds.map(t => ({
      warns: Math.max(1, parseInt(t.warns, 10) || 3),
      action: ['timeout', 'kick', 'ban'].includes(t.action) ? t.action : 'timeout',
      duration: parseInt(t.duration, 10) || undefined
    }));
  }
  saveState();
  dashAudit(req.userName, 'mod-escalation', `Updated: enabled=${modEscalation.enabled}`);
  res.json({ success: true, config: modEscalation });
});

// --- Suggestion Management ---
app.get('/api/suggestions', requireAuth, requireTier('moderator'), (req, res) => {
  res.json({ success: true, suggestions, settings: suggestionSettings });
});
app.post('/api/suggestions/settings', requireAuth, requireTier('admin'), (req, res) => {
  const { channelId, statusUpdates, votingEnabled } = req.body;
  if (channelId !== undefined) suggestionSettings.channelId = channelId || null;
  if (typeof statusUpdates === 'boolean') suggestionSettings.statusUpdates = statusUpdates;
  if (typeof votingEnabled === 'boolean') suggestionSettings.votingEnabled = votingEnabled;
  saveState();
  res.json({ success: true, settings: suggestionSettings });
});
app.post('/api/suggestions/status', requireAuth, requireTier('moderator'), async (req, res) => {
  const { id, status, response } = req.body;
  const sug = suggestions.find(s => s.id === id);
  if (!sug) return res.json({ success: false, error: 'Suggestion not found' });
  const oldStatus = sug.status;
  sug.status = status || sug.status;
  if (response) sug.moderatorResponse = response;
  sug.statusHistory = sug.statusHistory || [];
  sug.statusHistory.push({ from: oldStatus, to: sug.status, by: req.userName, ts: Date.now(), response });
  saveState();

  // Update embed in channel if exists
  if (sug.messageId && sug.channelId) {
    try {
      const ch = await client.channels.fetch(sug.channelId);
      const m = await ch.messages.fetch(sug.messageId);
      const colors = { pending: 0x3498DB, approved: 0x2ECC71, denied: 0xE74C3C, implemented: 0x9B59B6 };
      const statusEmoji = { pending: '⏳', approved: '✅', denied: '❌', implemented: '🚀' };
      const embed = EmbedBuilder.from(m.embeds[0])
        .setColor(colors[sug.status] || 0x3498DB)
        .setTitle(`${statusEmoji[sug.status] || '💡'} Suggestion — ${sug.status.toUpperCase()}`);
      if (response) embed.addFields({ name: `Response (${req.userName})`, value: response });
      await m.edit({ embeds: [embed] });
    } catch {}
  }

  // DM user about status change
  if (suggestionSettings.statusUpdates && sug.authorId) {
    try {
      const user = await client.users.fetch(sug.authorId);
      await user.send(`💡 Your suggestion (ID: ${sug.id}) was marked as **${sug.status}**${response ? `\n> ${response}` : ''}`);
    } catch {}
  }

  res.json({ success: true });
});

// --- Temp Bans / Temp Roles Management ---
app.get('/api/temp-bans', requireAuth, requireTier('moderator'), (req, res) => {
  res.json({ success: true, tempBans });
});
app.get('/api/temp-roles', requireAuth, requireTier('moderator'), (req, res) => {
  res.json({ success: true, tempRoles });
});

// --- Ticket Transcript Download ---
app.get('/api/tickets/transcript', requireAuth, requireTier('moderator'), (req, res) => {
  const { ticketId } = req.query;
  const data = loadJSON(TICKETS_PATH, {tickets:[]});
  const ticket = data.tickets.find(t => t.id === ticketId);
  if (!ticket || !ticket.transcript) return res.status(404).json({ error: 'Transcript not found' });
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename="ticket-${ticket.number || ticket.id}.txt"`);
  res.send(ticket.transcript);
});

// --- Recurring Messages API ---
app.post('/api/scheduled-messages/recurring', requireAuth, requireTier('admin'), (req, res) => {
  const { content, channelId, intervalMinutes, embed } = req.body;
  if (!content && !embed) return res.json({ success: false, error: 'Need content or embed' });
  if (!channelId) return res.json({ success: false, error: 'Need channelId' });
  const intervalMs = Math.max(5, parseInt(intervalMinutes, 10) || 60) * 60 * 1000;
  const data = loadJSON(SCHED_MSG_PATH, {messages:[]});
  data.messages.push({
    id: crypto.randomUUID().slice(0, 8),
    content: content || null,
    embed: embed || null,
    channelId,
    recurring: true,
    intervalMs,
    paused: false,
    lastSentAt: 0,
    sendCount: 0,
    createdAt: Date.now(),
    createdBy: req.userName
  });
  saveJSON(SCHED_MSG_PATH, data);
  dashAudit(req.userName, 'recurring-msg', 'Created recurring message');
  res.json({ success: true });
});

// --- AFK Users API ---
app.get('/api/afk-users', requireAuth, (req, res) => {
  res.json({ success: true, afkUsers });
});

// --- SmartBot User Memory API ---
app.get('/api/user-memory', requireAuth, requireTier('admin'), (req, res) => {
  const entries = Object.entries(userMemory).map(([id, data]) => ({ userId: id, ...data }));
  res.json({ success: true, entries });
});
app.post('/api/user-memory/clear', requireAuth, requireTier('admin'), (req, res) => {
  const { userId } = req.body;
  if (userId) {
    delete userMemory[userId];
  } else {
    for (const key of Object.keys(userMemory)) delete userMemory[key];
  }
  saveState();
  res.json({ success: true });
});

// --- Ticket System API ---
app.get('/api/tickets', requireAuth, requireTier('moderator'), (req, res) => {
  const data = loadJSON(TICKETS_PATH, {tickets:[],settings:{}});
  res.json({ success: true, tickets: data.tickets.slice(0,100), settings: data.settings });
});

app.post('/api/tickets/settings', requireAuth, requireTier('admin'), (req, res) => {
  const data = loadJSON(TICKETS_PATH, {tickets:[],settings:{}});
  data.settings = { ...data.settings, ...req.body };
  saveJSON(TICKETS_PATH, data);
  dashAudit(req.userName, 'update-ticket-settings', JSON.stringify(req.body).slice(0,100));
  res.json({ success: true });
});

app.post('/api/tickets/close', requireAuth, requireTier('moderator'), async (req, res) => {
  const { ticketId } = req.body;
  const data = loadJSON(TICKETS_PATH, {tickets:[],settings:{}});
  const ticket = data.tickets.find(t => t.id === ticketId);
  if (!ticket) return res.json({ success: false, error: 'Ticket not found' });
  ticket.status = 'closed';
  ticket.closedBy = req.userName;
  ticket.closedAt = Date.now();

  // ========== TICKET TRANSCRIPT ==========
  let transcript = null;
  const ch = client.channels?.cache?.get(ticket.channelId);
  if (ch) {
    try {
      const messages = await ch.messages.fetch({ limit: 100 });
      const sorted = [...messages.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);
      transcript = sorted.map(m => {
        const ts = new Date(m.createdTimestamp).toISOString();
        const author = m.author?.tag || 'Unknown';
        const content = m.content || (m.embeds.length ? '[embed]' : '') || (m.attachments.size ? '[attachment]' : '[empty]');
        return `[${ts}] ${author}: ${content}`;
      }).join('\n');
      ticket.transcript = transcript;
      ticket.messageCount = sorted.length;
    } catch (e) {
      addLog('error', `Failed to create ticket transcript: ${e.message}`);
    }
    await ch.delete('Ticket closed from dashboard').catch(() => {});
  }

  saveJSON(TICKETS_PATH, data);
  dashAudit(req.userName, 'close-ticket', 'Closed ticket #' + ticket.number);
  res.json({ success: true, transcript: !!transcript });
});

app.post('/api/tickets/send-panel', requireAuth, requireTier('admin'), async (req, res) => {
  const { channelId } = req.body;
  const ch = client.channels?.cache?.get(channelId);
  if (!ch) return res.json({ success: false, error: 'Channel not found' });
  const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = await import('discord.js');
  const embed = new EmbedBuilder().setTitle('🎫 Support Tickets').setDescription('Click the button below to open a support ticket.').setColor(0x9146ff);
  const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_open').setLabel('Open Ticket').setStyle(ButtonStyle.Primary).setEmoji('🎫'));
  await ch.send({ embeds: [embed], components: [row] });
  dashAudit(req.userName, 'send-ticket-panel', 'Sent ticket panel to channel ' + channelId);
  res.json({ success: true });
});

// --- Reaction Roles API ---
app.get('/api/reaction-roles', requireAuth, (req, res) => {
  const data = loadJSON(REACTION_ROLES_PATH, {panels:[]});
  res.json({ success: true, panels: data.panels });
});

app.post('/api/reaction-roles/create', requireAuth, requireTier('admin'), async (req, res) => {
  const { channelId, title, description, roles, mode } = req.body;
  if (!channelId || !roles?.length) return res.json({ success: false, error: 'Missing fields' });
  const ch = client.channels?.cache?.get(channelId);
  if (!ch) return res.json({ success: false, error: 'Channel not found' });
  const guild = ch.guild;
  const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = await import('discord.js');
  const embed = new EmbedBuilder().setTitle(title || '🎭 Reaction Roles').setDescription(description || 'Click a button to get/remove a role!').setColor(0x9146ff);
  let desc = '';
  const rows = [];
  let currentRow = new ActionRowBuilder();
  let count = 0;
  const resolvedRoles = [];
  for (const r of roles.slice(0,25)) {
    const guildRole = guild?.roles?.cache?.get(r.roleId);
    const label = r.label || (guildRole ? guildRole.name : r.roleId);
    resolvedRoles.push({ emoji: r.emoji, roleId: r.roleId, label });
    desc += (r.emoji||'🔹') + ' ' + label + '\n';
    currentRow.addComponents(new ButtonBuilder().setCustomId('rr_' + r.roleId).setLabel(label).setStyle(ButtonStyle.Secondary).setEmoji(r.emoji || undefined));
    count++;
    if (count % 5 === 0) { rows.push(currentRow); currentRow = new ActionRowBuilder(); }
  }
  if (count % 5 !== 0) rows.push(currentRow);
  embed.setDescription(desc || 'Select a role below');
  const msg = await ch.send({ embeds: [embed], components: rows });
  const data = loadJSON(REACTION_ROLES_PATH, {panels:[]});
  data.panels.push({ id: msg.id, channelId, messageId: msg.id, title: title || 'Role Menu', roles: resolvedRoles, mode: mode || 'toggle', createdAt: Date.now() });
  saveJSON(REACTION_ROLES_PATH, data);
  dashAudit(req.userName, 'create-reaction-roles', 'Created panel in ' + channelId);
  res.json({ success: true });
});

app.post('/api/reaction-roles/delete', requireAuth, requireTier('admin'), async (req, res) => {
  const { panelId } = req.body;
  const data = loadJSON(REACTION_ROLES_PATH, {panels:[]});
  const panel = data.panels.find(p => p.id === panelId);
  if (panel) {
    const ch = client.channels?.cache?.get(panel.channelId);
    if (ch) { const m = await ch.messages?.fetch(panel.messageId).catch(()=>null); if (m) m.delete().catch(()=>{}); }
  }
  data.panels = data.panels.filter(p => p.id !== panelId);
  saveJSON(REACTION_ROLES_PATH, data);
  dashAudit(req.userName, 'delete-reaction-roles', 'Deleted panel ' + panelId);
  res.json({ success: true });
});

app.post('/api/reaction-roles/repost', requireAuth, requireTier('admin'), async (req, res) => {
  const { panelId } = req.body;
  if (!panelId) return res.json({ success: false, error: 'Missing panelId' });
  const data = loadJSON(REACTION_ROLES_PATH, {panels:[]});
  const panel = data.panels.find(p => p.id === panelId);
  if (!panel) return res.json({ success: false, error: 'Panel not found' });
  const ch = client.channels?.cache?.get(panel.channelId);
  if (!ch) return res.json({ success: false, error: 'Channel not found' });
  const guild = ch.guild;
  const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = await import('discord.js');
  const embed = new EmbedBuilder().setTitle(panel.title || '🎭 Reaction Roles').setDescription('Click a button to get/remove a role!').setColor(0x9146ff);
  let desc = '';
  const rows = [];
  let currentRow = new ActionRowBuilder();
  let count = 0;
  for (const r of (panel.roles || []).slice(0, 25)) {
    const guildRole = guild?.roles?.cache?.get(r.roleId);
    const label = r.label || (guildRole ? guildRole.name : r.roleId);
    desc += (r.emoji || '🔹') + ' ' + label + '\n';
    currentRow.addComponents(new ButtonBuilder().setCustomId('rr_' + r.roleId).setLabel(label).setStyle(ButtonStyle.Secondary).setEmoji(r.emoji || undefined));
    count++;
    if (count % 5 === 0) { rows.push(currentRow); currentRow = new ActionRowBuilder(); }
  }
  if (count % 5 !== 0) rows.push(currentRow);
  embed.setDescription(desc || 'Select a role below');
  // Delete old message
  const oldMsg = await ch.messages?.fetch(panel.messageId).catch(() => null);
  if (oldMsg) oldMsg.delete().catch(() => {});
  // Send new message (at bottom of channel)
  const newMsg = await ch.send({ embeds: [embed], components: rows });
  panel.messageId = newMsg.id;
  panel.id = newMsg.id;
  // Update the panels array (id changed)
  const idx = data.panels.findIndex(p => p.messageId === panelId || p.id === panelId);
  if (idx >= 0) data.panels[idx] = panel;
  saveJSON(REACTION_ROLES_PATH, data);
  dashAudit(req.userName, 'repost-reaction-roles', 'Reposted panel to bottom in ' + panel.channelId);
  res.json({ success: true });
});

app.post('/api/reaction-roles/edit', requireAuth, requireTier('admin'), async (req, res) => {
  const { panelId, title, channelId, roles } = req.body;
  if (!panelId || !channelId || !roles?.length) return res.json({ success: false, error: 'Missing fields' });
  const data = loadJSON(REACTION_ROLES_PATH, {panels:[]});
  const panel = data.panels.find(p => p.id === panelId);
  if (!panel) return res.json({ success: false, error: 'Panel not found' });
  const ch = client.channels?.cache?.get(panel.channelId);
  if (!ch) return res.json({ success: false, error: 'Original channel not found' });
  const msg = await ch.messages?.fetch(panel.messageId).catch(() => null);
  const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = await import('discord.js');
  const embed = new EmbedBuilder().setTitle(title || '🎭 Reaction Roles').setDescription('Click a button to get/remove a role!').setColor(0x9146ff);
  let desc = '';
  const rows = [];
  let currentRow = new ActionRowBuilder();
  let count = 0;
  const guild = ch.guild;
  const resolvedRoles = [];
  for (const r of roles.slice(0, 25)) {
    const guildRole = guild?.roles?.cache?.get(r.roleId);
    const label = r.label || (guildRole ? guildRole.name : r.roleId);
    resolvedRoles.push({ emoji: r.emoji, roleId: r.roleId, label });
    desc += (r.emoji || '🔹') + ' ' + label + '\n';
    currentRow.addComponents(new ButtonBuilder().setCustomId('rr_' + r.roleId).setLabel(label).setStyle(ButtonStyle.Secondary).setEmoji(r.emoji || undefined));
    count++;
    if (count % 5 === 0) { rows.push(currentRow); currentRow = new ActionRowBuilder(); }
  }
  if (count % 5 !== 0) rows.push(currentRow);
  embed.setDescription(desc || 'Select a role below');
  if (msg) {
    await msg.edit({ embeds: [embed], components: rows }).catch(() => {});
  }
  panel.title = title || panel.title;
  panel.channelId = channelId;
  panel.roles = resolvedRoles;
  panel.updatedAt = Date.now();
  saveJSON(REACTION_ROLES_PATH, data);
  dashAudit(req.userName, 'edit-reaction-roles', 'Edited panel ' + panelId);
  res.json({ success: true });
});

// --- Scheduled Messages API ---
app.get('/api/scheduled-messages', requireAuth, requireTier('moderator'), (req, res) => {
  const data = loadJSON(SCHED_MSG_PATH, {messages:[]});
  res.json({ success: true, messages: data.messages });
});

app.post('/api/scheduled-messages/create', requireAuth, requireTier('moderator'), (req, res) => {
  const { channelId, content, sendAt, embed } = req.body;
  if (!channelId || !sendAt) return res.json({ success: false, error: 'Missing fields' });
  const data = loadJSON(SCHED_MSG_PATH, {messages:[]});
  const msg = { id: crypto.randomUUID(), channelId, content: content || '', embed: embed || null, sendAt: new Date(sendAt).getTime(), sent: false, createdBy: req.userName, createdAt: Date.now() };
  data.messages.push(msg);
  saveJSON(SCHED_MSG_PATH, data);
  dashAudit(req.userName, 'schedule-message', 'Scheduled for ' + new Date(msg.sendAt).toLocaleString());
  res.json({ success: true, message: msg });
});

app.post('/api/scheduled-messages/delete', requireAuth, requireTier('moderator'), (req, res) => {
  const { id } = req.body;
  const data = loadJSON(SCHED_MSG_PATH, {messages:[]});
  data.messages = data.messages.filter(m => m.id !== id);
  saveJSON(SCHED_MSG_PATH, data);
  dashAudit(req.userName, 'delete-scheduled-message', 'Deleted ' + id);
  res.json({ success: true });
});

// --- Auto-Mod API ---
app.get('/api/automod', requireAuth, requireTier('moderator'), (req, res) => {
  const data = loadJSON(AUTOMOD_PATH, {});
  res.json({ success: true, config: data });
});

app.post('/api/automod/save', requireAuth, requireTier('admin'), (req, res) => {
  saveJSON(AUTOMOD_PATH, req.body);
  dashAudit(req.userName, 'update-automod', 'Updated auto-mod settings');
  res.json({ success: true });
});

// --- Starboard API ---
app.get('/api/starboard', requireAuth, (req, res) => {
  const data = loadJSON(STARBOARD_PATH, {});
  res.json({ success: true, config: { ...data, posts: (data.posts||[]).slice(0,50) } });
});

app.post('/api/starboard/save', requireAuth, requireTier('admin'), (req, res) => {
  const old = loadJSON(STARBOARD_PATH, {});
  const updated = { ...old, ...req.body, posts: old.posts || [] };
  saveJSON(STARBOARD_PATH, updated);
  dashAudit(req.userName, 'update-starboard', 'Updated starboard settings');
  res.json({ success: true });
});

app.post('/api/starboard/admin-repost', requireAuth, requireTier('admin'), (req, res) => {
  const { enabled, channelId, emoji } = req.body;
  const old = loadJSON(STARBOARD_PATH, {});
  old.adminRepost = { enabled: !!enabled, channelId: channelId || '', emoji: emoji || '📌' };
  saveJSON(STARBOARD_PATH, old);
  dashAudit(req.userName, 'update-admin-repost', `Admin repost: ${enabled ? 'enabled' : 'disabled'}, emoji: ${emoji || '📌'}`);
  res.json({ success: true });
});

// --- Export API ---
app.get('/api/export/:type', requireAuth, requireTier('moderator'), (req, res) => {
  const { type } = req.params;
  const format = req.query.format || 'json';
  let data;
  switch(type) {
    case 'members': {
      const guild = client.guilds.cache.get(req.guildId);
      data = guild?.members?.cache?.map(m => ({ id: m.id, tag: m.user.tag, displayName: m.displayName, joinedAt: m.joinedAt?.toISOString(), roles: m.roles.cache.map(r=>r.name).join(', ') })) || [];
      break;
    }
    case 'moderation': data = loadJSON(MODERATION_PATH, {warnings:[],cases:[]}).cases; break;
    case 'audit-log': data = loadJSON(DASH_AUDIT_PATH, {entries:[]}).entries; break;
    case 'member-growth': data = loadJSON(MEMBER_GROWTH_PATH, {daily:[]}).daily; break;
    case 'command-usage': { const d = loadJSON(CMD_USAGE_PATH, {commands:{}}); data = Object.entries(d.commands).map(([n,v])=>({command:n,...v})); break; }
    case 'warnings': data = loadJSON(MODERATION_PATH, {warnings:[]}).warnings; break;
    case 'starboard': data = loadJSON(STARBOARD_PATH, {posts:[]}).posts; break;
    default: return res.json({ success: false, error: 'Unknown type' });
  }
  dashAudit(req.userName, 'export-data', 'Exported ' + type + ' as ' + format);
  if (format === 'csv') {
    if (!data.length) return res.send('');
    const keys = Object.keys(data[0]);
    const csv = [keys.join(','), ...data.map(r => keys.map(k => JSON.stringify(r[k]??'')).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=' + type + '.csv');
    return res.send(csv);
  }
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename=' + type + '.json');
  res.json(data);
});

// --- Backup & Restore API ---
app.get('/api/backups', requireAuth, requireTier('owner'), (req, res) => {
  const backupDir = path.join(DATA_DIR, 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json')).sort().reverse();
  res.json({ success: true, backups: files.map(f => ({ name: f, size: fs.statSync(path.join(backupDir,f)).size, date: fs.statSync(path.join(backupDir,f)).mtime })) });
});

app.post('/api/backups/create', requireAuth, requireTier('owner'), (req, res) => {
  const backupDir = path.join(DATA_DIR, 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g,'-');
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json') && f !== 'backups');
  const backup = {};
  for (const f of files) { try { backup[f] = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8')); } catch {} }
  fs.writeFileSync(path.join(backupDir, 'backup-' + ts + '.json'), JSON.stringify(backup, null, 2));
  dashAudit(req.userName, 'create-backup', 'Created backup backup-' + ts);
  res.json({ success: true, name: 'backup-' + ts + '.json' });
});

app.post('/api/backups/restore', requireAuth, requireTier('owner'), (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || /[\\/.]{2}/.test(name)) return res.json({ success: false, error: 'Invalid backup name' });
  const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '');
  const fp = path.join(DATA_DIR, 'backups', safeName);
  if (!fp.startsWith(path.join(DATA_DIR, 'backups')) || !fs.existsSync(fp)) return res.json({ success: false, error: 'Backup not found' });
  try {
    const backup = JSON.parse(fs.readFileSync(fp, 'utf8'));
    for (const [filename, content] of Object.entries(backup)) {
      const safeFile = filename.replace(/[^a-zA-Z0-9._-]/g, '');
      if (!safeFile.endsWith('.json')) continue;
      fs.writeFileSync(path.join(DATA_DIR, safeFile), JSON.stringify(content, null, 2));
    }
    dashAudit(req.userName, 'restore-backup', 'Restored from ' + safeName);
    res.json({ success: true });
  } catch(e) { addLog('error', `Backup restore failed: ${e.message}`); res.json({ success: false, error: 'Restore failed' }); }
});

app.post('/api/backups/delete', requireAuth, requireTier('owner'), (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || /[\\/.]{2}/.test(name)) return res.json({ success: false, error: 'Invalid backup name' });
  const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '');
  const fp = path.join(DATA_DIR, 'backups', safeName);
  if (!fp.startsWith(path.join(DATA_DIR, 'backups'))) return res.json({ success: false, error: 'Invalid path' });
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
  res.json({ success: true });
});

app.post('/api/backups/upload', requireAuth, requireTier('owner'), (req, res) => {
  const { name, backup } = req.body || {};
  if (!name || typeof name !== 'string') return res.json({ success: false, error: 'Missing backup name' });
  if (!backup || typeof backup !== 'object' || Array.isArray(backup)) return res.json({ success: false, error: 'Invalid backup payload' });

  const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileName = safeName.endsWith('.json') ? safeName : `${safeName}.json`;
  const backupDir = path.join(DATA_DIR, 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const fullPath = path.join(backupDir, fileName);
  fs.writeFileSync(fullPath, JSON.stringify(backup, null, 2));
  dashAudit(req.userName, 'upload-backup', 'Uploaded backup ' + fileName);
  res.json({ success: true, name: fileName });
});

// IdleOn GP routes moved to modules/routes/idleon-routes.js

// --- Webhook Integrations API ---
app.get('/api/webhooks', requireAuth, requireTier('admin'), (req, res) => {
  const data = loadJSON(WEBHOOKS_PATH, {webhooks:[]});
  res.json({ success: true, webhooks: data.webhooks });
});

app.post('/api/webhooks/create', requireAuth, requireTier('admin'), (req, res) => {
  const { name, url, events } = req.body;
  if (!name || !url) return res.json({ success: false, error: 'Missing fields' });
  const data = loadJSON(WEBHOOKS_PATH, {webhooks:[]});
  data.webhooks.push({ id: crypto.randomUUID(), name, url, events: events || ['all'], enabled: true, createdAt: Date.now(), lastSent: null, failures: 0 });
  saveJSON(WEBHOOKS_PATH, data);
  dashAudit(req.userName, 'create-webhook', 'Created webhook: ' + name);
  res.json({ success: true });
});

app.post('/api/webhooks/delete', requireAuth, requireTier('admin'), (req, res) => {
  const { id } = req.body;
  const data = loadJSON(WEBHOOKS_PATH, {webhooks:[]});
  data.webhooks = data.webhooks.filter(w => w.id !== id);
  saveJSON(WEBHOOKS_PATH, data);
  res.json({ success: true });
});

app.post('/api/webhooks/toggle', requireAuth, requireTier('admin'), (req, res) => {
  const { id } = req.body;
  const data = loadJSON(WEBHOOKS_PATH, {webhooks:[]});
  const wh = data.webhooks.find(w => w.id === id);
  if (wh) wh.enabled = !wh.enabled;
  saveJSON(WEBHOOKS_PATH, data);
  res.json({ success: true });
});

app.post('/api/webhooks/test', requireAuth, requireTier('admin'), async (req, res) => {
  const { id } = req.body;
  const data = loadJSON(WEBHOOKS_PATH, {webhooks:[]});
  const wh = data.webhooks.find(w => w.id === id);
  if (!wh) return res.json({ success: false, error: 'Webhook not found' });
  try {
    const resp = await fetch(wh.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'test', message: 'Test webhook from dashboard', ts: Date.now() }) });
    wh.lastSent = Date.now();
    if (!resp.ok) wh.failures++;
    saveJSON(WEBHOOKS_PATH, data);
    res.json({ success: resp.ok, status: resp.status });
  } catch(e) { wh.failures++; saveJSON(WEBHOOKS_PATH, data); addLog('error', `Webhook test failed: ${e.message}`); res.json({ success: false, error: 'Webhook test failed' }); }
});

// Fire webhooks for events
function fireWebhooks(event, payload) {
  const data = loadJSON(WEBHOOKS_PATH, {webhooks:[]});
  for (const wh of data.webhooks) {
    if (!wh.enabled) continue;
    if (!wh.events.includes('all') && !wh.events.includes(event)) continue;
    fetch(wh.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event, ...payload, ts: Date.now() }) }).catch(() => {});
  }
}

// --- API Keys API ---
app.get('/api/api-keys', requireAuth, requireTier('owner'), (req, res) => {
  const data = loadJSON(API_KEYS_PATH, {keys:[]});
  res.json({ success: true, keys: data.keys.map(k => ({ ...k, key: k.key.slice(0,8) + '...' })) });
});

app.post('/api/api-keys/create', requireAuth, requireTier('owner'), (req, res) => {
  const { name, permissions } = req.body;
  if (!name) return res.json({ success: false, error: 'Name required' });
  const key = 'dk_' + crypto.randomBytes(24).toString('hex');
  const data = loadJSON(API_KEYS_PATH, {keys:[]});
  data.keys.push({ id: crypto.randomUUID(), name, key, permissions: permissions || ['read'], createdAt: Date.now(), lastUsed: null, uses: 0 });
  saveJSON(API_KEYS_PATH, data);
  dashAudit(req.userName, 'create-api-key', 'Created key: ' + name);
  res.json({ success: true, key });
});

app.post('/api/api-keys/delete', requireAuth, requireTier('owner'), (req, res) => {
  const { id } = req.body;
  const data = loadJSON(API_KEYS_PATH, {keys:[]});
  data.keys = data.keys.filter(k => k.id !== id);
  saveJSON(API_KEYS_PATH, data);
  res.json({ success: true });
});

// Public API (authenticated via API key)
app.get('/api/v1/:resource', apiRateLimit(30, 60000), (req, res) => {
  const apiKey = req.headers['x-api-key'] || req.query.key;
  if (!apiKey) return res.status(401).json({ error: 'API key required' });
  const data = loadJSON(API_KEYS_PATH, {keys:[]});
  const keyObj = data.keys.find(k => {
    try {
      return k.key.length === apiKey.length && crypto.timingSafeEqual(Buffer.from(k.key), Buffer.from(apiKey));
    } catch { return false; }
  });
  if (!keyObj) return res.status(401).json({ error: 'Invalid API key' });
  keyObj.lastUsed = Date.now();
  keyObj.uses++;
  saveJSON(API_KEYS_PATH, data);
  const { resource } = req.params;
  switch(resource) {
    case 'stats': return res.json({ streams: stats.totalStreams, viewers: streamInfo.viewers, isLive: !!streamInfo.startedAt });
    case 'members': { const g = client.guilds.cache.first(); return res.json({ count: g?.memberCount || 0, name: g?.name }); }
    case 'commands': { const d = loadJSON(CMD_USAGE_PATH, {commands:{}}); return res.json(Object.entries(d.commands).map(([n,v])=>({name:n,count:v.count}))); }
    case 'growth': return res.json(loadJSON(MEMBER_GROWTH_PATH, {daily:[]}).daily.slice(-30));
    default: return res.status(404).json({ error: 'Unknown resource' });
  }
});

app.get('/export', requireAuth, requireTier('moderator'), (req, res) => res.send(renderPage('export', req)));
app.get('/backups', requireAuth, requireTier('moderator'), (req, res) => res.send(renderPage('backups', req)));
app.get('/webhooks', requireAuth, requireTier('moderator'), (req, res) => res.send(renderPage('webhooks', req)));
app.get('/api-keys', requireAuth, requireTier('owner'), (req, res) => res.send(renderPage('api-keys', req)));
app.get('/dash-audit', requireAuth, requireTier('owner'), (req, res) => res.send(renderPage('dash-audit', req)));
app.get('/idleon-dashboard', requireAuth, requireTier('viewer'), (req, res) => res.send(renderPage('idleon-dashboard', req)));
app.get('/idleon-members', requireAuth, requireTier('viewer'), (req, res) => res.send(renderPage('idleon-members', req)));
app.get('/idleon-admin', requireAuth, requireTier('admin'), (req, res) => res.send(renderPage('idleon-admin', req)));
app.get('/idleon-guild-mgmt', requireAuth, requireTier('admin'), (req, res) => res.send(renderPage('idleon-guild-mgmt', req)));
app.get('/idleon-reviews', requireAuth, requireTier('admin'), (req, res) => res.send(renderPage('idleon-reviews', req)));
app.get('/idleon-stats', requireAuth, requireTier('viewer'), (req, res) => res.redirect('/idleon-dashboard'));
app.get('/idleon-bot-review', requireAuth, requireTier('viewer'), (req, res) => res.send(renderPage('idleon-bot-review', req)));
app.get('/idleon-main', requireAuth, (req, res) => res.redirect('/idleon-admin'));
app.get('/mail', requireAuth, (req, res) => res.send(renderPage('mail', req)));
app.get('/dms', requireAuth, (req, res) => res.send(renderPage('dms', req)));
app.get('/profile-customize', requireAuth, (req, res) => res.send(renderPage('profile-customize', req)));
app.get('/profile-security', requireAuth, (req, res) => res.send(renderPage('profile-security', req)));
app.get('/profile-notifications', requireAuth, (req, res) => res.send(renderPage('profile-notifications', req)));
app.get('/guide-indexer', requireAuth, requireTier('admin'), (req, res) => res.send(renderPage('guide-indexer', req)));

// --- Theme Preference API ---
app.post('/api/theme', requireAuth, (req, res) => {
  const { theme } = req.body;
  const allowed = ['dark', 'midnight', 'light', 'amoled', 'ocean', 'sunset', 'forest', 'rose', 'cyberpunk', 'nord', 'minimalist'];
  const chosen = allowed.includes(theme) ? theme : 'dark';
  const token = req.headers.cookie?.match(/session=([^;]+)/)?.[1];
  if (token && activeSessionTokens.has(token)) {
    activeSessionTokens.get(token).theme = chosen;
  }
  // Persist to account
  const session = getSessionFromCookie(req);
  if (session) {
    const accounts = loadAccounts();
    const account = accounts.find(a => a.id === session.userId);
    if (account) {
      account.theme = chosen;
      saveAccounts(accounts);
    }
  }
  res.json({ success: true, theme: chosen });
});

/* ======================
   MESSAGING / CHAT / DM SYSTEM
====================== */
function loadMessaging() { return loadJSON(MESSAGING_PATH, { notifications: {}, conversations: [], chatMessages: {} }); }
function saveMessaging(data) { return saveJSON(MESSAGING_PATH, data); }

// ── Notifications / Mail ──
app.get('/api/messaging/notifications', requireAuth, (req, res) => {
  const session = getSessionFromCookie(req);
  const data = loadMessaging();
  const userNotifs = (data.notifications[session.userId] || []).slice(-200).reverse();
  res.json({ success: true, notifications: userNotifs });
});

app.post('/api/messaging/notifications/:id/read', requireAuth, (req, res) => {
  const session = getSessionFromCookie(req);
  const data = loadMessaging();
  const notifs = data.notifications[session.userId] || [];
  const n = notifs.find(x => x.id === req.params.id);
  if (n) { n.read = true; saveMessaging(data); }
  res.json({ success: true });
});

app.post('/api/messaging/notifications/read-all', requireAuth, (req, res) => {
  const session = getSessionFromCookie(req);
  const data = loadMessaging();
  (data.notifications[session.userId] || []).forEach(n => { n.read = true; });
  saveMessaging(data);
  res.json({ success: true });
});

app.delete('/api/messaging/notifications/:id', requireAuth, (req, res) => {
  const session = getSessionFromCookie(req);
  const data = loadMessaging();
  data.notifications[session.userId] = (data.notifications[session.userId] || []).filter(n => n.id !== req.params.id);
  saveMessaging(data);
  res.json({ success: true });
});

app.post('/api/messaging/notifications/send', requireAuth, requireTier('moderator'), (req, res) => {
  const { to, title, body } = req.body;
  if (!title || !body) return res.json({ success: false, error: 'Title and body required' });
  if (String(title).length > 120 || String(body).length > 2000) return res.json({ success: false, error: 'Title max 120, body max 2000 chars' });
  const session = getSessionFromCookie(req);
  const data = loadMessaging();
  const accounts = loadAccounts();
  const notif = {
    id: crypto.randomUUID(),
    type: 'message',
    from: session.username,
    title: String(title).slice(0, 120),
    body: String(body).slice(0, 2000),
    read: false,
    createdAt: Date.now()
  };
  if (to === 'all') {
    accounts.forEach(a => {
      if (!data.notifications[a.id]) data.notifications[a.id] = [];
      data.notifications[a.id].push({ ...notif, id: crypto.randomUUID() });
    });
    // Push real-time to all
    io.emit('newNotification', notif);
  } else {
    const target = accounts.find(a => a.username.toLowerCase() === String(to).toLowerCase());
    if (!target) return res.json({ success: false, error: 'User not found' });
    if (!data.notifications[target.id]) data.notifications[target.id] = [];
    data.notifications[target.id].push(notif);
    // Push to specific user's sockets
    for (const [, s] of io.sockets.sockets) {
      if (s.session && s.session.userId === target.id) s.emit('newNotification', notif);
    }
  }
  saveMessaging(data);
  res.json({ success: true });
});

// ── Direct Messages ──
app.get('/api/messaging/users', requireAuth, (req, res) => {
  const accounts = loadAccounts();
  res.json({
    success: true,
    users: accounts.map(a => ({
      id: a.id,
      username: a.username,
      displayName: a.displayName || null,
      tier: a.tier,
      avatar: a.customAvatar || (a.discordId && a.discordAvatar ? 'https://cdn.discordapp.com/avatars/' + a.discordId + '/' + a.discordAvatar + '.png?size=64' : null)
    }))
  });
});

app.get('/api/messaging/dm/conversations', requireAuth, (req, res) => {
  const session = getSessionFromCookie(req);
  const data = loadMessaging();
  const accounts = loadAccounts();
  const myConvos = (data.conversations || [])
    .filter(c => c.participants.includes(session.userId))
    .map(c => {
      const otherId = c.participants.find(p => p !== session.userId);
      const other = accounts.find(a => a.id === otherId) || {};
      return {
        id: c.id,
        otherUser: other.username || 'Unknown',
        otherDisplayName: other.displayName || other.username || 'Unknown',
        otherAvatar: other.customAvatar || (other.discordId && other.discordAvatar ? 'https://cdn.discordapp.com/avatars/' + other.discordId + '/' + other.discordAvatar + '.png?size=64' : null),
        lastMessage: c.lastMessage || '',
        lastMessageAt: c.lastMessageAt || c.createdAt,
        unread: (c.unreadBy || []).includes(session.userId)
      };
    })
    .sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));
  res.json({ success: true, conversations: myConvos });
});

app.post('/api/messaging/dm/start', requireAuth, (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.json({ success: false, error: 'userId required' });
  const session = getSessionFromCookie(req);
  if (userId === session.userId) return res.json({ success: false, error: 'Cannot message yourself' });
  const accounts = loadAccounts();
  const other = accounts.find(a => a.id === userId);
  if (!other) return res.json({ success: false, error: 'User not found' });
  const data = loadMessaging();
  // Check if convo already exists
  let convo = (data.conversations || []).find(c =>
    c.participants.includes(session.userId) && c.participants.includes(userId)
  );
  if (!convo) {
    convo = {
      id: crypto.randomUUID(),
      participants: [session.userId, userId],
      createdAt: Date.now(),
      lastMessage: '',
      lastMessageAt: Date.now(),
      unreadBy: []
    };
    if (!data.conversations) data.conversations = [];
    data.conversations.push(convo);
    saveMessaging(data);
  }
  res.json({
    success: true,
    conversation: {
      id: convo.id,
      otherUser: other.username,
      otherDisplayName: other.displayName || other.username,
      otherAvatar: other.customAvatar || (other.discordId && other.discordAvatar ? 'https://cdn.discordapp.com/avatars/' + other.discordId + '/' + other.discordAvatar + '.png?size=64' : null),
      lastMessage: convo.lastMessage,
      lastMessageAt: convo.lastMessageAt
    }
  });
});

app.get('/api/messaging/dm/:convoId/messages', requireAuth, (req, res) => {
  const session = getSessionFromCookie(req);
  const data = loadMessaging();
  const convo = (data.conversations || []).find(c => c.id === req.params.convoId);
  if (!convo || !convo.participants.includes(session.userId)) return res.json({ success: false, error: 'Not found' });
  const key = 'dm_' + req.params.convoId;
  const msgs = (data.chatMessages[key] || []).slice(-200);
  res.json({ success: true, messages: msgs });
});

app.post('/api/messaging/dm/:convoId/send', requireAuth, (req, res) => {
  const { body: msgBody } = req.body;
  if (!msgBody || String(msgBody).trim().length === 0) return res.json({ success: false, error: 'Empty message' });
  if (String(msgBody).length > 2000) return res.json({ success: false, error: 'Max 2000 characters' });
  const session = getSessionFromCookie(req);
  const data = loadMessaging();
  const convo = (data.conversations || []).find(c => c.id === req.params.convoId);
  if (!convo || !convo.participants.includes(session.userId)) return res.json({ success: false, error: 'Not found' });
  const message = {
    id: crypto.randomUUID(),
    senderId: session.userId,
    senderName: session.username,
    body: String(msgBody).slice(0, 2000).trim(),
    createdAt: Date.now()
  };
  const key = 'dm_' + req.params.convoId;
  if (!data.chatMessages[key]) data.chatMessages[key] = [];
  data.chatMessages[key].push(message);
  // Keep last 500 messages per convo
  if (data.chatMessages[key].length > 500) data.chatMessages[key] = data.chatMessages[key].slice(-500);
  convo.lastMessage = message.body.slice(0, 80);
  convo.lastMessageAt = message.createdAt;
  // Mark unread for other participant
  const otherId = convo.participants.find(p => p !== session.userId);
  convo.unreadBy = [otherId];
  saveMessaging(data);
  // Push real-time DM to other user's sockets
  for (const [, s] of io.sockets.sockets) {
    if (s.session && s.session.userId === otherId) {
      s.emit('newDM', { conversationId: convo.id, message });
    }
  }
  res.json({ success: true, message });
});

app.post('/api/messaging/dm/:convoId/read', requireAuth, (req, res) => {
  const session = getSessionFromCookie(req);
  const data = loadMessaging();
  const convo = (data.conversations || []).find(c => c.id === req.params.convoId);
  if (convo) {
    convo.unreadBy = (convo.unreadBy || []).filter(id => id !== session.userId);
    saveMessaging(data);
  }
  res.json({ success: true });
});

// ── General Chat Rooms ──
app.get('/api/messaging/chat/:channel/messages', requireAuth, (req, res) => {
  const channel = String(req.params.channel).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 30);
  const allowed = ['general', 'off-topic', 'announcements', 'bot-dev', 'help'];
  if (!allowed.includes(channel)) return res.json({ success: false, error: 'Unknown channel' });
  const data = loadMessaging();
  const key = 'chat_' + channel;
  const msgs = (data.chatMessages[key] || []).slice(-200);
  res.json({ success: true, messages: msgs });
});

app.post('/api/messaging/chat/:channel/send', requireAuth, (req, res) => {
  const { body: msgBody } = req.body;
  if (!msgBody || String(msgBody).trim().length === 0) return res.json({ success: false, error: 'Empty message' });
  if (String(msgBody).length > 2000) return res.json({ success: false, error: 'Max 2000 characters' });
  const channel = String(req.params.channel).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 30);
  const allowed = ['general', 'off-topic', 'announcements', 'bot-dev', 'help'];
  if (!allowed.includes(channel)) return res.json({ success: false, error: 'Unknown channel' });
  // Announcements restricted to admins
  const session = getSessionFromCookie(req);
  if (channel === 'announcements' && !['admin', 'owner'].includes(session.tier)) {
    return res.json({ success: false, error: 'Only admins can post in announcements' });
  }
  const accounts = loadAccounts();
  const account = accounts.find(a => a.id === session.userId);
  const message = {
    id: crypto.randomUUID(),
    userId: session.userId,
    username: session.username,
    displayName: account?.displayName || session.username,
    avatar: account?.customAvatar || null,
    tier: account?.tier || session.tier || 'viewer',
    accentColor: account?.accentColor || '#5b5bff',
    body: String(msgBody).slice(0, 2000).trim(),
    createdAt: Date.now()
  };
  const data = loadMessaging();
  const key = 'chat_' + channel;
  if (!data.chatMessages[key]) data.chatMessages[key] = [];
  data.chatMessages[key].push(message);
  if (data.chatMessages[key].length > 500) data.chatMessages[key] = data.chatMessages[key].slice(-500);
  saveMessaging(data);
  // Support reply-to
  if (req.body.replyTo && typeof req.body.replyTo === 'object') {
    message.replyTo = {
      id: String(req.body.replyTo.id || '').slice(0, 50),
      displayName: String(req.body.replyTo.displayName || '').slice(0, 50),
      body: String(req.body.replyTo.body || '').slice(0, 200)
    };
  }
  // Broadcast to channel room only
  io.to('chat_' + channel).emit('chatMessage', { channel, message });
  res.json({ success: true, message });
});

// Delete own chat message (or admin/owner can delete any)
app.delete('/api/messaging/chat/:channel/:msgId', requireAuth, (req, res) => {
  const channel = String(req.params.channel).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 30);
  const msgId = String(req.params.msgId);
  const allowed = ['general', 'off-topic', 'announcements', 'bot-dev', 'help'];
  if (!allowed.includes(channel)) return res.json({ success: false, error: 'Unknown channel' });
  const session = getSessionFromCookie(req);
  const data = loadMessaging();
  const key = 'chat_' + channel;
  const msgs = data.chatMessages[key] || [];
  const idx = msgs.findIndex(m => m.id === msgId);
  if (idx < 0) return res.json({ success: false, error: 'Message not found' });
  // Only own messages, or admin/owner can delete any
  if (msgs[idx].userId !== session.userId && !['admin', 'owner'].includes(session.tier)) {
    return res.json({ success: false, error: 'Cannot delete this message' });
  }
  msgs.splice(idx, 1);
  saveMessaging(data);
  io.to('chat_' + channel).emit('chatMessageDeleted', { channel, msgId });
  res.json({ success: true });
});

// Edit own chat message
app.patch('/api/messaging/chat/:channel/:msgId', requireAuth, (req, res) => {
  const channel = String(req.params.channel).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 30);
  const msgId = String(req.params.msgId);
  const allowed = ['general', 'off-topic', 'announcements', 'bot-dev', 'help'];
  if (!allowed.includes(channel)) return res.json({ success: false, error: 'Unknown channel' });
  const { body: newBody } = req.body;
  if (!newBody || String(newBody).trim().length === 0) return res.json({ success: false, error: 'Empty message' });
  if (String(newBody).length > 2000) return res.json({ success: false, error: 'Max 2000 characters' });
  const session = getSessionFromCookie(req);
  const data = loadMessaging();
  const key = 'chat_' + channel;
  const msgs = data.chatMessages[key] || [];
  const idx = msgs.findIndex(m => m.id === msgId);
  if (idx < 0) return res.json({ success: false, error: 'Message not found' });
  if (msgs[idx].userId !== session.userId) return res.json({ success: false, error: 'Can only edit own messages' });
  msgs[idx].body = String(newBody).slice(0, 2000).trim();
  msgs[idx].editedAt = Date.now();
  saveMessaging(data);
  io.to('chat_' + channel).emit('chatMessageEdited', { channel, message: msgs[idx] });
  res.json({ success: true, message: msgs[idx] });
});

// Toggle emoji reaction on chat message
app.post('/api/messaging/chat/:channel/:msgId/react', requireAuth, (req, res) => {
  const channel = String(req.params.channel).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 30);
  const msgId = String(req.params.msgId);
  const allowed = ['general', 'off-topic', 'announcements', 'bot-dev', 'help'];
  if (!allowed.includes(channel)) return res.json({ success: false, error: 'Unknown channel' });
  const { emoji } = req.body;
  const allowedEmoji = ['\ud83d\udc4d', '\u2764\ufe0f', '\ud83d\ude02', '\ud83d\ude2e', '\ud83d\ude22', '\ud83d\udd25', '\ud83d\udc4e', '\ud83c\udf89'];
  if (!emoji || !allowedEmoji.includes(emoji)) return res.json({ success: false, error: 'Invalid reaction' });
  const session = getSessionFromCookie(req);
  const data = loadMessaging();
  const key = 'chat_' + channel;
  const msgs = data.chatMessages[key] || [];
  const msg = msgs.find(m => m.id === msgId);
  if (!msg) return res.json({ success: false, error: 'Message not found' });
  if (!msg.reactions) msg.reactions = {};
  if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
  const rIdx = msg.reactions[emoji].indexOf(session.userId);
  if (rIdx >= 0) msg.reactions[emoji].splice(rIdx, 1);
  else msg.reactions[emoji].push(session.userId);
  if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
  saveMessaging(data);
  io.to('chat_' + channel).emit('chatMessageReacted', { channel, msgId, reactions: msg.reactions || {} });
  res.json({ success: true, reactions: msg.reactions || {} });
});

/* ======================
   RPG CONTENT EDITOR API
====================== */
app.use('/api', requireAuth, contentRoutes);

// Serve the content editor dashboard
app.get('/editor', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'rpg', 'dashboard', 'ContentEditor.html'));
});

/* ======================
   DASHBOARD TEMPLATE
====================== */
function renderPage(tab, req, subTab){
  try {
    let html = _renderPageInner(tab, req, subTab);
    // Inject CSP nonce into all <script> tags so inline scripts satisfy the CSP
    const nonce = req?.cspNonce;
    if (nonce) {
      html = html.replace(/<script(?=[\s>])/gi, `<script nonce="${nonce}"`);
    }
    return html;
  } catch(e) {
    console.error(`[RenderPage] CRASH on tab="${tab}":`, e.stack || e.message || e);
    try { addLog('error', `RenderPage crash on tab="${tab}": ${e.message}`); } catch {}
    return `<!DOCTYPE html><html><head><title>Error</title></head><body style="background:#0e0e10;color:#e0e0e0;font-family:sans-serif;padding:40px"><h1 style="color:#ff5555">Dashboard Render Error</h1><p>Tab: <code>${tab}</code></p><pre style="background:#1a1a2e;padding:16px;border-radius:8px;overflow:auto;max-width:800px;color:#ff8888">${(e.stack || e.message || String(e)).replace(/</g,'&lt;')}</pre><a href="/" style="color:#9146ff">Back</a></body></html>`;
  }
}
function _renderPageInner(tab, req, subTab){
  // Get selected server info
  const guildId = req ? getSelectedGuildId(req) : null;
  const guild = guildId ? client.guilds.cache.get(guildId) : client.guilds.cache.first();
  const guildName = guild?.name || 'No Server';
  // Resolve user theme from account
  const _session = req ? getSessionFromCookie(req) : null;
  let userTheme = 'dark';
  if (_session) {
    const _accts = loadAccounts();
    const _acct = _accts.find(a => a.id === _session.userId);
    if (_acct?.theme) userTheme = _acct.theme;
  }
  const guildIcon = guild?.iconURL?.({ size: 64, dynamic: true }) || '';
  const guildInitials = guildName.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  const userTier = req ? (req.userTier || getUserTier(req)) : 'viewer';
  const userName = req ? getUserName(req) : 'Unknown';
  const previewTier = req?.previewTier || null;
  const effectiveTier = req?.effectiveTier || previewTier || userTier;
  const previewQuery = previewTier ? `?previewTier=${previewTier}` : '';
  const userAccess = TIER_ACCESS[effectiveTier] || [];
  const _pam = req?.pageAccessMap || {};
  const _hasCustomAccess = Object.keys(_pam).length > 0;
  // Helper: returns true if the given tab slug is accessible
  const _canSee = (slug) => !_hasCustomAccess || !!_pam[slug];
  // Helper: returns ' 🔒' suffix if the tab is read-only
  const _roTag = (slug) => (_hasCustomAccess && _pam[slug] === 'read') ? ' <span style="font-size:10px;opacity:.6">🔒</span>' : '';
  const _catMap = {core:['overview','health','logs','notifications'],config:['commands','commands-config','config-commands','embeds','config-general','config-notifications','export','backups','accounts','bot-config'],profile:['profile','profile-customize','profile-security','mail','dms','profile-notifications'],smartbot:['smartbot-config','smartbot-knowledge','smartbot-stats','smartbot-templates'],idleon:['idleon-dashboard','idleon-members','idleon-admin','idleon-guild-mgmt','idleon-reviews','idleon-stats','idleon-activity','idleon-bot-review'],community:['welcome','audit','customcmds','leveling','suggestions','events','events-giveaways','events-polls','events-reminders','events-schedule','events-birthdays','youtube-alerts','pets','pet-approvals','pet-giveaways','pet-stats','moderation','tickets','reaction-roles','scheduled-msgs','automod','starboard','dash-audit','timezone','bot-messages','guide-indexer'],analytics:['stats','stats-engagement','stats-trends','stats-games','stats-viewers','stats-ai','stats-reports','stats-community','stats-rpg','stats-rpg-events','stats-rpg-economy','stats-rpg-quests','stats-compare','stats-features','member-growth','command-usage','stats-revenue'],rpg:['rpg-editor','rpg-entities','rpg-systems','rpg-ai','rpg-flags','rpg-simulators','rpg-admin','rpg-guild','rpg-guild-stats']};
  const activeCategory = Object.entries(_catMap).find(([_,t])=>t.includes(tab))?.[0]||'core';
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <meta name="description" content="Private Discord bot administration dashboard for ${guildName}. nephilheim bot management panel.">
  <meta name="google-site-verification" content="WEZZE-2M8_bPXsA4aYQiylAAjcxctMCQFFxd6_45Qho" />
  <link rel="dns-prefetch" href="https://cdn.jsdelivr.net">
  <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
  <link rel="dns-prefetch" href="https://cdnjs.cloudflare.com">
  <title>${guildName} — nephilheim Bot Dashboard</title>
  <link rel="stylesheet" href="/dashboard.css?v=2">
</head>
<body data-theme="${userTheme}">
<div class="topbar">
  <button class="mobile-menu-btn" onclick="document.querySelector('.sidebar').classList.toggle('mobile-open')" aria-label="Menu">☰</button>
  <div class="topbar-tabs">
    ${userAccess.includes('core')?'<a class="topbar-tab '+(activeCategory==='core'?'active':'')+'" href="/'+previewQuery+'">📊 Core</a>':''}
    ${userAccess.includes('community')?'<a class="topbar-tab '+(activeCategory==='community'?'active':'')+'" href="'+(effectiveTier==='viewer'?'/pets':'/welcome')+previewQuery+'">👥 Community</a>':''}
    ${userAccess.includes('analytics')?'<a class="topbar-tab '+(activeCategory==='analytics'?'active':'')+'" href="/stats'+previewQuery+'">📈 Analytics</a>':''}
    ${userAccess.includes('rpg')?'<a class="topbar-tab '+(activeCategory==='rpg'?'active':'')+'" href="/rpg?tab=rpg-editor'+(previewTier?'&previewTier='+previewTier:'')+'">🎮 RPG</a>':''}
    ${userAccess.includes('config')?'<a class="topbar-tab '+(activeCategory==='config'?'active':'')+'" href="/config-general'+previewQuery+'">⚙️ Config</a>':''}
    ${userAccess.includes('smartbot')?'<a class="topbar-tab '+(activeCategory==='smartbot'?'active':'')+'" href="/smartbot-config'+previewQuery+'">🤖 SmartBot</a>':''}
    ${userAccess.includes('idleon')?'<a class="topbar-tab '+(activeCategory==='idleon'?'active':'')+'" href="/idleon-dashboard'+previewQuery+'">🧱 IdleOn</a>':''}
  </div>
  <div class="topbar-right" style="display:flex;align-items:center;gap:12px">
    <a href="/profile${previewQuery}" class="topbar-tab ${activeCategory==='profile'?'active':''}" style="display:flex;align-items:center;gap:6px;font-size:13px;padding:6px 14px;border-radius:8px;text-decoration:none">
      <span style="font-size:14px">👤</span>
      <span style="font-weight:700;color:var(--text-primary)">${userName}</span>
      <span style="color:${TIER_COLORS[effectiveTier]||'#8b8fa3'};font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;padding:2px 8px;background:${TIER_COLORS[effectiveTier]||'#8b8fa3'}20;border-radius:4px">${previewTier ? '👁️ ' : ''}${TIER_LABELS[effectiveTier]||effectiveTier}</span>
    </a>
    <div class="topbar-bell" style="position:relative;cursor:pointer" onclick="window.location.href='/dms${previewQuery}'">
      <span style="font-size:18px;filter:grayscale(0.3)">🔔</span>
      <span id="bellBadge" style="display:none;position:absolute;top:-4px;right:-6px;background:#ef5350;color:#fff;font-size:9px;font-weight:700;min-width:16px;height:16px;border-radius:8px;align-items:center;justify-content:center;padding:0 3px;border:2px solid var(--bg-body)"></span>
    </div>
    <div class="topbar-search">
      <span class="topbar-search-icon">🔍</span>
      <input type="text" placeholder="Search everywhere..." id="globalSearch" autocomplete="off">
      <div class="search-results" id="searchResults"></div>
    </div>
  </div>
</div>
<div class="sidebar">
<div class="sidebar-server">
  <div class="sidebar-server-info">
    <div class="sidebar-server-icon">${guildIcon ? '<img src="' + guildIcon + '" alt="">' : '<span>' + guildInitials + '</span>'}</div>
    <div class="sidebar-server-name" title="${guildName}">${guildName}</div>
  </div>
  <div class="sidebar-server-actions">
    <a href="/switch-server">Switch</a>
    <a href="/logout">Sign out</a>
  </div>
  ${previewTier ? '<div style="margin-top:6px;padding:4px 8px;background:#3498db15;border:1px solid #3498db33;border-radius:4px;font-size:10px;color:#3498db;text-align:center">👁️ Previewing as ' + effectiveTier + ' <a href="/?previewTier=none" style="color:#3498db;margin-left:4px">Exit</a></div>' : ''}
  ${!TIER_CAN_EDIT[effectiveTier] ? '<div style="margin-top:6px;padding:4px 8px;background:#ffca2815;border:1px solid #ffca2833;border-radius:4px;font-size:10px;color:#ffca28;text-align:center">🔒 Read-only access</div>' : ''}
</div>
<div class="sidebar-nav">
${activeCategory==='core'?`
  <div class="sb-cat open">
    <button class="sb-cat-hdr" onclick="this.parentElement.classList.toggle('open')">
      <span>📊 Core</span><span class="sb-chevron">›</span>
    </button>
    <div class="sb-cat-body">
    ${_canSee('overview')?`<a href="/${previewQuery}" class="${tab==='overview'?'active':''}">📊 Overview${_roTag('overview')}</a>`:''}
    ${_canSee('health')?`<a href="/health${previewQuery}" class="${tab==='health'?'active':''}">🛡️ Bot Health${_roTag('health')}</a>`:''}
    ${_canSee('logs')?`<a href="/logs${previewQuery}" class="${tab==='logs'?'active':''}">📋 Logs${_roTag('logs')}</a>`:''}
    ${_canSee('notifications')?`<a href="/notifications${previewQuery}" class="${tab==='notifications'?'active':''}">🔔 Notifications${_roTag('notifications')}</a>`:''}
    </div>
  </div>
`:''}

${activeCategory==='config'?`
  <div class="sb-cat open">
    <button class="sb-cat-hdr" onclick="this.parentElement.classList.toggle('open')">
      <span>⚙️ Config</span><span class="sb-chevron">›</span>
    </button>
    <div class="sb-cat-body">
    <div class="sb-grp open"><button class="sb-grp-hdr" onclick="this.parentElement.classList.toggle('open')"><span>⚙️ Settings</span><span class="sb-grp-chv">›</span></button><div class="sb-grp-body">
    ${_canSee('config-general')?`<a href="/config-general${previewQuery}" class="${tab==='config-general'?'active':''}">⚙️ General${_roTag('config-general')}</a>`:''}
    ${_canSee('config-notifications')?`<a href="/config-notifications${previewQuery}" class="${tab==='config-notifications'?'active':''}">🔔 Notifications${_roTag('config-notifications')}</a>`:''}
    ${_canSee('config-commands')?`<a href="/commands${previewQuery}" class="${tab==='commands'||tab==='commands-config'||tab==='config-commands'?'active':''}">📖 Commands${_roTag('config-commands')}</a>`:''}
    ${_canSee('embeds')?`<a href="/embeds${previewQuery}" class="${tab==='embeds'?'active':''}">✨ Embeds${_roTag('embeds')}</a>`:''}
    ${_canSee('bot-config')?`<a href="/bot-config${previewQuery}" class="${tab==='bot-config'?'active':''}">🤖 Bot Config${_roTag('bot-config')}</a>`:''}
    </div></div>
    <div class="sb-grp open"><button class="sb-grp-hdr" onclick="this.parentElement.classList.toggle('open')"><span>🔧 Tools</span><span class="sb-grp-chv">›</span></button><div class="sb-grp-body">
    ${_canSee('export')?`<a href="/export${previewQuery}" class="${tab==='export'?'active':''}">📤 Export${_roTag('export')}</a>`:''}
    ${_canSee('backups')?`<a href="/backups${previewQuery}" class="${tab==='backups'?'active':''}">💾 Backups${_roTag('backups')}</a>`:''}
    </div></div>
    ${(effectiveTier==='admin'||effectiveTier==='owner')?`<div class="sb-grp open"><button class="sb-grp-hdr" onclick="this.parentElement.classList.toggle('open')"><span>🔐 Access</span><span class="sb-grp-chv">›</span></button><div class="sb-grp-body">
    ${_canSee('accounts')?`<a href="/accounts${previewQuery}" class="${tab==='accounts'?'active':''}">🔐 Accounts${_roTag('accounts')}</a>`:''}
    </div></div>`:''}
    </div>
  </div>
`:''}

${activeCategory==='idleon'?`
  <div class="sb-cat open">
    <button class="sb-cat-hdr" onclick="this.parentElement.classList.toggle('open')">
      <span>🧱 IdleOn</span><span class="sb-chevron">›</span>
    </button>
    <div class="sb-cat-body">
    <div class="sb-grp open"><button class="sb-grp-hdr" onclick="this.parentElement.classList.toggle('open')"><span>🏰 Idleon Guilds</span><span class="sb-grp-chv">›</span></button><div class="sb-grp-body">
    ${_canSee('idleon-dashboard')?`<a href="/idleon-dashboard${previewQuery}" class="${tab==='idleon-dashboard'?'active':''}">📊 Dashboard${_roTag('idleon-dashboard')}</a>`:''}
    ${TIER_LEVELS[userTier] >= TIER_LEVELS.admin && _canSee('idleon-guild-mgmt') ? '<a href="/idleon-guild-mgmt" class="'+(tab==='idleon-guild-mgmt'?'active':'')+'">🏰 Guild Mgmt'+_roTag('idleon-guild-mgmt')+'</a>' : ''}
    ${TIER_LEVELS[userTier] >= TIER_LEVELS.admin && _canSee('idleon-admin') ? '<a href="/idleon-admin" class="'+(tab==='idleon-admin'?'active':'')+'">🛠️ Admin'+_roTag('idleon-admin')+'</a>' : ''}
    </div></div>
    <div class="sb-grp open"><button class="sb-grp-hdr" onclick="this.parentElement.classList.toggle('open')"><span>📈 Guild Analytics</span><span class="sb-grp-chv">›</span></button><div class="sb-grp-body">
    ${_canSee('idleon-members')?`<a href="/idleon-members${previewQuery}" class="${tab==='idleon-members'?'active':''}">👥 Members${_roTag('idleon-members')}</a>`:''}
    ${_canSee('idleon-stats')?`<a href="/idleon-stats${previewQuery}" class="${tab==='idleon-stats'?'active':''}">📊 Stats & Overview${_roTag('idleon-stats')}</a>`:''}
    ${_canSee('idleon-activity')?`<a href="/idleon-activity${previewQuery}" class="${tab==='idleon-activity'?'active':''}">🔥 Activity & Trends${_roTag('idleon-activity')}</a>`:''}
    </div></div>
    <div class="sb-grp open"><button class="sb-grp-hdr" onclick="this.parentElement.classList.toggle('open')"><span>💬 Community</span><span class="sb-grp-chv">›</span></button><div class="sb-grp-body">
    ${TIER_LEVELS[userTier] >= TIER_LEVELS.admin && _canSee('idleon-reviews') ? '<a href="/idleon-reviews" class="'+(tab==='idleon-reviews'?'active':'')+'">🔍 Reviews'+_roTag('idleon-reviews')+'</a>' : ''}
    </div></div>
    <div class="sb-grp open"><button class="sb-grp-hdr" onclick="this.parentElement.classList.toggle('open')"><span>🔍 Tools</span><span class="sb-grp-chv">›</span></button><div class="sb-grp-body">
    ${_canSee('idleon-bot-review')?`<a href="/idleon-bot-review${previewQuery}" class="${tab==='idleon-bot-review'?'active':''}">🔍 Bot Review${_roTag('idleon-bot-review')}</a>`:''}
    </div></div>
    </div>
  </div>
`:''}

${activeCategory==='profile'?`
  <div class="sb-cat open">
    <button class="sb-cat-hdr" onclick="this.parentElement.classList.toggle('open')">
      <span>👤 Profile</span><span class="sb-chevron">›</span>
    </button>
    <div class="sb-cat-body">
    <a href="/profile${previewQuery}" class="${tab==='profile'?'active':''}">👤 Overview</a>
    <a href="/profile-customize${previewQuery}" class="${tab==='profile-customize'?'active':''}">🎨 Appearance</a>
    <a href="/profile-security${previewQuery}" class="${tab==='profile-security'?'active':''}">🔒 Security</a>
    <a href="/mail${previewQuery}" class="${tab==='mail'?'active':''}">📬 Mail</a>
    <a href="/dms${previewQuery}" class="${tab==='dms'?'active':''}">✉️ DMs</a>
    <a href="/profile-notifications${previewQuery}" class="${tab==='profile-notifications'?'active':''}">🔔 Settings</a>
    </div>
  </div>
`:''}

${activeCategory==='smartbot'?`
  <div class="sb-cat open">
    <button class="sb-cat-hdr" onclick="this.parentElement.classList.toggle('open')">
      <span>🤖 SmartBot</span><span class="sb-chevron">›</span>
    </button>
    <div class="sb-cat-body">
    ${_canSee('smartbot-config')?`<a href="/smartbot-config${previewQuery}" class="${tab==='smartbot-config'?'active':''}">⚙️ Configuration${_roTag('smartbot-config')}</a>`:''}
    ${_canSee('smartbot-knowledge')?`<a href="/smartbot-knowledge${previewQuery}" class="${tab==='smartbot-knowledge'?'active':''}">📚 Knowledge Base${_roTag('smartbot-knowledge')}</a>`:''}
    ${_canSee('smartbot-templates')?`<a href="/smartbot-templates${previewQuery}" class="${tab==='smartbot-templates'?'active':''}">💬 Templates${_roTag('smartbot-templates')}</a>`:''}
    ${_canSee('smartbot-stats')?`<a href="/smartbot-stats${previewQuery}" class="${tab==='smartbot-stats'?'active':''}">📊 Stats & Trends${_roTag('smartbot-stats')}</a>`:''}
    </div>
  </div>
`:''}


${activeCategory==='community'?`
  <div class="sb-cat open">
    <button class="sb-cat-hdr" onclick="this.parentElement.classList.toggle('open')">
      <span>👥 Community</span><span class="sb-chevron">›</span>
    </button>
    <div class="sb-cat-body">
    ${effectiveTier!=='viewer'?`<div class="sb-grp open"><button class="sb-grp-hdr" onclick="this.parentElement.classList.toggle('open')"><span>📣 Engagement</span><span class="sb-grp-chv">›</span></button><div class="sb-grp-body">
    ${_canSee('welcome')?`<a href="/welcome${previewTier?'?previewTier='+previewTier:''}" class="${tab==='welcome'?'active':''}">👋 Welcome${_roTag('welcome')}</a>`:''}
    ${_canSee('leveling')?`<a href="/leveling${previewTier?'?previewTier='+previewTier:''}" class="${tab==='leveling'?'active':''}">🏆 Leveling${_roTag('leveling')}</a>`:''}
    ${_canSee('events')?`<a href="/events${previewTier?'?previewTier='+previewTier:''}" class="${tab==='events'||tab==='events-giveaways'||tab==='events-polls'||tab==='events-reminders'||tab==='events-schedule'||tab==='events-birthdays'?'active':''}">📅 Events & Scheduling${_roTag('events')}</a>`:''}
    ${_canSee('youtube-alerts')?`<a href="/youtube-alerts${previewTier?'?previewTier='+previewTier:''}" class="${tab==='youtube-alerts'?'active':''}">📺 YouTube Alerts${_roTag('youtube-alerts')}</a>`:''}
    </div></div>`:''}
    <div class="sb-grp open"><button class="sb-grp-hdr" onclick="this.parentElement.classList.toggle('open')"><span>🐾 Pets</span><span class="sb-grp-chv">›</span></button><div class="sb-grp-body">
    ${_canSee('pets')?`<a href="/pets" class="${tab==='pets'?'active':''}">🐾 Pets${_roTag('pets')}</a>`:''}
    ${(effectiveTier==='admin'||effectiveTier==='owner') && _canSee('pet-approvals')?`<a href="/pet-approvals${previewTier?'?previewTier='+previewTier:''}" class="${tab==='pet-approvals'?'active':''}">✅ Pet Approvals${_roTag('pet-approvals')}</a>`:''}
    ${_canSee('pet-giveaways')?`<a href="/pet-giveaways" class="${tab==='pet-giveaways'?'active':''}">🎁 Pet Giveaways${_roTag('pet-giveaways')}</a>`:''}
    </div></div>
    ${effectiveTier!=='viewer'?`<div class="sb-grp open"><button class="sb-grp-hdr" onclick="this.parentElement.classList.toggle('open')"><span>🛡️ Moderation</span><span class="sb-grp-chv">›</span></button><div class="sb-grp-body">
    ${_canSee('moderation')?`<a href="/moderation${previewTier?'?previewTier='+previewTier:''}" class="${tab==='moderation'||tab==='dash-audit'?'active':''}">⚖️ Moderation & Audit${_roTag('moderation')}</a>`:''}
    ${_canSee('automod')?`<a href="/automod${previewTier?'?previewTier='+previewTier:''}" class="${tab==='automod'?'active':''}">🤖 Auto-Mod${_roTag('automod')}</a>`:''}
    ${_canSee('tickets')?`<a href="/tickets${previewTier?'?previewTier='+previewTier:''}" class="${tab==='tickets'||tab==='suggestions'?'active':''}">🎫 Support & Feedback${_roTag('tickets')}</a>`:''}
    ${_canSee('reaction-roles')?`<a href="/reaction-roles${previewTier?'?previewTier='+previewTier:''}" class="${tab==='reaction-roles'?'active':''}">🎭 Reaction Roles${_roTag('reaction-roles')}</a>`:''}
    ${_canSee('starboard')?`<a href="/starboard${previewTier?'?previewTier='+previewTier:''}" class="${tab==='starboard'?'active':''}">⭐ Highlights${_roTag('starboard')}</a>`:''}
    </div></div>
    <div class="sb-grp open"><button class="sb-grp-hdr" onclick="this.parentElement.classList.toggle('open')"><span>📋 Management</span><span class="sb-grp-chv">›</span></button><div class="sb-grp-body">
    ${_canSee('audit')?`<a href="/audit${previewTier?'?previewTier='+previewTier:''}" class="${tab==='audit'?'active':''}">🕵️ Member Logs/Config${_roTag('audit')}</a>`:''}
    ${_canSee('customcmds')?`<a href="/customcmds${previewTier?'?previewTier='+previewTier:''}" class="${tab==='customcmds'?'active':''}">🏷️ Tags/Custom${_roTag('customcmds')}</a>`:''}
    ${_canSee('timezone')?`<a href="/timezone${previewTier?'?previewTier='+previewTier:''}" class="${tab==='timezone'?'active':''}">🕐 Timezone${_roTag('timezone')}</a>`:''}
    ${_canSee('bot-messages')?`<a href="/bot-messages${previewTier?'?previewTier='+previewTier:''}" class="${tab==='bot-messages'?'active':''}">📨 Bot Messages${_roTag('bot-messages')}</a>`:''}
    ${_canSee('guide-indexer')?`<a href="/guide-indexer${previewTier?'?previewTier='+previewTier:''}" class="${tab==='guide-indexer'?'active':''}">📚 Guide Indexer${_roTag('guide-indexer')}</a>`:''}
    </div></div>`:''}
    </div>
  </div>
`:''}

${activeCategory==='analytics'?`
  <div class="sb-cat open">
    <button class="sb-cat-hdr" onclick="this.parentElement.classList.toggle('open')">
      <span>📈 Analytics</span><span class="sb-chevron">›</span>
    </button>
    <div class="sb-cat-body">
    <div class="sb-grp open"><button class="sb-grp-hdr" onclick="this.parentElement.classList.toggle('open')"><span>📺 Stream</span><span class="sb-grp-chv">›</span></button><div class="sb-grp-body">
    ${_canSee('stats')?`<a href="/stats?tab=stats" class="${tab==='stats'?'active':''}">📈 Dashboard${_roTag('stats')}</a>`:''}
    ${_canSee('stats-engagement')?`<a href="/stats?tab=stats-engagement" class="${tab==='stats-engagement'?'active':''}">👥 Engagement${_roTag('stats-engagement')}</a>`:''}
    ${_canSee('stats-trends')?`<a href="/stats?tab=stats-trends" class="${tab==='stats-trends'?'active':''}">📊 Trends${_roTag('stats-trends')}</a>`:''}
    ${_canSee('stats-viewers')?`<a href="/stats?tab=stats-viewers" class="${tab==='stats-viewers'?'active':''}">👀 Viewer Patterns${_roTag('stats-viewers')}</a>`:''}
    ${_canSee('stats-compare')?`<a href="/stats?tab=stats-compare" class="${tab==='stats-compare'?'active':''}">🆚 Stream Compare${_roTag('stats-compare')}</a>`:''}
    ${_canSee('stats-streaks')?`<a href="/stats?tab=stats-streaks" class="${tab==='stats-streaks'?'active':''}">🏆 Streaks & Milestones${_roTag('stats-streaks')}</a>`:''}
    </div></div>
    <div class="sb-grp open"><button class="sb-grp-hdr" onclick="this.parentElement.classList.toggle('open')"><span>💡 Insights</span><span class="sb-grp-chv">›</span></button><div class="sb-grp-body">
    ${_canSee('stats-games')?`<a href="/stats?tab=stats-games" class="${tab==='stats-games'?'active':''}">🎮 Game Performance${_roTag('stats-games')}</a>`:''}
    ${_canSee('stats-ai')?`<a href="/stats?tab=stats-ai" class="${tab==='stats-ai'?'active':''}">🤖 AI Insights${_roTag('stats-ai')}</a>`:''}
    ${_canSee('stats-reports')?`<a href="/stats?tab=stats-reports" class="${tab==='stats-reports'?'active':''}">📋 Reports${_roTag('stats-reports')}</a>`:''}
    ${_canSee('stats-community')?`<a href="/stats?tab=stats-community" class="${tab==='stats-community'?'active':''}">🤝 Community & Bot${_roTag('stats-community')}</a>`:''}
    ${_canSee('stats-revenue')?`<a href="/stats?tab=stats-revenue" class="${tab==='stats-revenue'?'active':''}">💰 Revenue${_roTag('stats-revenue')}</a>`:''}
    </div></div>
    <div class="sb-grp open"><button class="sb-grp-hdr" onclick="this.parentElement.classList.toggle('open')"><span>⚔️ RPG</span><span class="sb-grp-chv">›</span></button><div class="sb-grp-body">
    ${_canSee('stats-rpg')?`<a href="/stats?tab=stats-rpg" class="${tab==='stats-rpg'?'active':''}">🎮 RPG Analytics${_roTag('stats-rpg')}</a>`:''}
    ${_canSee('stats-rpg-events')?`<a href="/stats?tab=stats-rpg-events" class="${tab==='stats-rpg-events'?'active':''}">⚡ RPG Events${_roTag('stats-rpg-events')}</a>`:''}
    ${_canSee('stats-rpg-economy')?`<a href="/stats?tab=stats-rpg-economy" class="${tab==='stats-rpg-economy'?'active':''}">💰 RPG Economy${_roTag('stats-rpg-economy')}</a>`:''}
    ${_canSee('stats-rpg-quests')?`<a href="/stats?tab=stats-rpg-quests" class="${tab==='stats-rpg-quests'?'active':''}">📜 RPG Quests & Combat${_roTag('stats-rpg-quests')}</a>`:''}
    </div></div>
    <div class="sb-grp open"><button class="sb-grp-hdr" onclick="this.parentElement.classList.toggle('open')"><span>🔧 Features</span><span class="sb-grp-chv">›</span></button><div class="sb-grp-body">
    ${_canSee('stats-features')?`<a href="/stats?tab=stats-features" class="${tab==='stats-features'?'active':''}">📊 Analytics Features${_roTag('stats-features')}</a>`:''}
    ${_canSee('member-growth')?`<a href="/stats?tab=member-growth" class="${tab==='member-growth'?'active':''}">📈 Member Growth${_roTag('member-growth')}</a>`:''}
    ${_canSee('command-usage')?`<a href="/stats?tab=command-usage" class="${tab==='command-usage'?'active':''}">⌨️ Command Usage${_roTag('command-usage')}</a>`:''}
    </div></div>
    </div>
  </div>
`:''}

${activeCategory==='rpg'?`
  <div class="sb-cat open">
    <button class="sb-cat-hdr" onclick="this.parentElement.classList.toggle('open')">
      <span>🎮 RPG</span><span class="sb-chevron">›</span>
    </button>
    <div class="sb-cat-body">
    <div class="sb-grp open"><button class="sb-grp-hdr" onclick="this.parentElement.classList.toggle('open')"><span>📝 Content</span><span class="sb-grp-chv">›</span></button><div class="sb-grp-body">
    ${_canSee('rpg-editor')?`<a href="/rpg?tab=rpg-editor" class="${tab==='rpg-editor'?'active':''}">✏️ Content Editor${_roTag('rpg-editor')}</a>`:''}
    ${_canSee('rpg-entities')?`<a href="/rpg?tab=rpg-entities" class="${tab==='rpg-entities'?'active':''}">👥 Entities${_roTag('rpg-entities')}</a>`:''}
    </div></div>
    <div class="sb-grp open"><button class="sb-grp-hdr" onclick="this.parentElement.classList.toggle('open')"><span>⚙️ Systems</span><span class="sb-grp-chv">›</span></button><div class="sb-grp-body">
    ${_canSee('rpg-systems')?`<a href="/rpg?tab=rpg-systems" class="${tab==='rpg-systems'?'active':''}">⚙️ Systems${_roTag('rpg-systems')}</a>`:''}
    ${_canSee('rpg-ai')?`<a href="/rpg?tab=rpg-ai" class="${tab==='rpg-ai'?'active':''}">🤖 AI & Combat${_roTag('rpg-ai')}</a>`:''}
    ${_canSee('rpg-flags')?`<a href="/rpg?tab=rpg-flags" class="${tab==='rpg-flags'?'active':''}">🚩 Flags & Modifiers${_roTag('rpg-flags')}</a>`:''}
    </div></div>
    <div class="sb-grp open"><button class="sb-grp-hdr" onclick="this.parentElement.classList.toggle('open')"><span>🏛️ Guild</span><span class="sb-grp-chv">›</span></button><div class="sb-grp-body">
    ${_canSee('rpg-guild')?`<a href="/rpg?tab=rpg-guild" class="${tab==='rpg-guild'?'active':''}">🏛️ Adventurers Guild${_roTag('rpg-guild')}</a>`:''}
    ${_canSee('rpg-guild-stats')?`<a href="/rpg?tab=rpg-guild-stats" class="${tab==='rpg-guild-stats'?'active':''}">📊 Guild Stats${_roTag('rpg-guild-stats')}</a>`:''}
    </div></div>
    <div class="sb-grp open"><button class="sb-grp-hdr" onclick="this.parentElement.classList.toggle('open')"><span>🔧 Tools</span><span class="sb-grp-chv">›</span></button><div class="sb-grp-body">
    ${_canSee('rpg-simulators')?`<a href="/rpg?tab=rpg-simulators" class="${tab==='rpg-simulators'?'active':''}">🧪 Simulators${_roTag('rpg-simulators')}</a>`:''}
    ${_canSee('rpg-admin')?`<a href="/rpg?tab=rpg-admin" class="${tab==='rpg-admin'?'active':''}">🔑 Admin${_roTag('rpg-admin')}</a>`:''}
    </div></div>
    </div>
  </div>
`:''}

</div>
</div>
<div class="main">${(_hasCustomAccess && !_pam[tab]) ? `<div style="display:flex;align-items:center;justify-content:center;height:60vh;flex-direction:column">
  <div style="font-size:64px;margin-bottom:20px">🚫</div>
  <h2 style="color:#ff5555;margin:0 0 10px 0">Access Denied</h2>
  <p style="color:#aaa">You don't have permission to view this page.</p>
  <a href="/" style="margin-top:20px;padding:10px 24px;background:#9146ff;color:#fff;text-decoration:none;border-radius:6px">Back to Overview</a>
</div>` : ((_hasCustomAccess && _pam[tab] === 'read') ? `<div style="background:#ffca2815;border:1px solid #ffca2833;border-radius:6px;padding:8px 16px;margin-bottom:16px;display:flex;align-items:center;gap:8px;color:#ffca28;font-size:13px">🔒 <strong>Read-only</strong> — You can view this page but cannot make changes.</div>` : '') + renderTab(tab, userTier, subTab)}</div>
<script>
var _userAccess = ${JSON.stringify(userAccess)};
var _previewTier = ${JSON.stringify(previewTier || '')};
var _pageAccessMap = ${JSON.stringify(_pam)};
var _hasCustomAccess = ${_hasCustomAccess};
function _withPreview(u){
  if(!_previewTier) return u;
  return u.indexOf('?') === -1 ? (u + '?previewTier=' + _previewTier) : (u + '&previewTier=' + _previewTier);
}
var _allPages = [
  {l:'Overview',c:'Core',u:'/',i:'📊',k:'overview dashboard home bot status giveaway stream'},
  {l:'Bot Health',c:'Core',u:'/health',i:'🛡️',k:'health monitoring uptime memory cpu bot status system ping'},
  {l:'Logs',c:'Core',u:'/logs',i:'📋',k:'logs activity stream events history'},
  ${userTier!=='viewer'?`{l:'Welcome',c:'Community',u:'/welcome',i:'👋',k:'welcome greet join message auto role'},
  {l:'Member Logs',c:'Community',u:'/audit',i:'🕵️',k:'audit member logs join leave ban role changes moderation'},
  {l:'Tags/Custom',c:'Community',u:'/customcmds',i:'🏷️',k:'tags custom commands responses auto reply'},
  {l:'Leveling',c:'Community',u:'/leveling',i:'🏆',k:'leveling xp level rank prestige rewards roles'},
  {l:'Suggestions',c:'Community',u:'/suggestions',i:'💡',k:'suggestions feedback ideas vote'},
  {l:'Events',c:'Community',u:'/events',i:'🎪',k:'events giveaways polls reminders schedule'},
  {l:'Notifications',c:'Core',u:'/notifications',i:'🔔',k:'notifications alerts ping'},`:''}
  ${userTier!=='viewer'?`{l:'YouTube Alerts',c:'Community',u:'/youtube-alerts',i:'📺',k:'youtube alerts new video channel role ping'},`:''}
  {l:'Pets',c:'Community',u:'/pets',i:'🐾',k:'pets animals companions collection add remove'},
  ${userTier==='admin'||userTier==='owner'?`{l:'Pet Approvals',c:'Community',u:'/pet-approvals',i:'✅',k:'pet approve reject pending approval admin'},`:''}
  {l:'Pet Giveaways',c:'Community',u:'/pet-giveaways',i:'🎁',k:'pet giveaway trade history confirm'},
  {l:'Pet Stats',c:'Community',u:'/pet-stats',i:'📊',k:'pet statistics analytics graphs charts collection data'},
  ${userTier!=='viewer'?`{l:'Moderation',c:'Community',u:'/moderation',i:'⚖️',k:'moderation warn ban kick timeout mute cases'},
  {l:'Tickets',c:'Community',u:'/tickets',i:'🎫',k:'tickets support help panel open close'},
  {l:'Reaction Roles',c:'Community',u:'/reaction-roles',i:'🎭',k:'reaction roles self assign emoji'},
  {l:'Scheduled Msgs',c:'Community',u:'/scheduled-msgs',i:'📅',k:'scheduled messages timed auto send'},
  {l:'Auto-Mod',c:'Community',u:'/automod',i:'🤖',k:'automod filter spam links caps'},
  {l:'Highlights & Repost',c:'Community',u:'/starboard',i:'⭐',k:'starboard star highlight best messages repost'},`:''}
  ${userTier==='admin'||userTier==='owner'?`{l:'Dashboard Audit',c:'Community',u:'/dash-audit',i:'📝',k:'dashboard audit log edits changes who account activity'},`:''}
  ${userTier==='admin'||userTier==='owner'?`{l:'Monitoring Features',c:'Community',u:'/features-monitoring',i:'📈',k:'monitoring logging backup channel activity heatmap retention health voice'},
  {l:'Dashboard & Bot Features',c:'Community',u:'/features-dashboard',i:'🎨',k:'dashboard themes push notifications prefs changelog smartbot memory status rotation auto-responder'},
  {l:'Guide Indexer',c:'Community',u:'/guide-indexer',i:'📚',k:'guide indexer patch notes forum threads update analysis tips wiki'},`:''}
  {l:'Dashboard',c:'Analytics',u:'/stats?tab=stats',i:'📈',k:'stats dashboard overview numbers summary'},
  {l:'Engagement',c:'Analytics',u:'/stats?tab=stats-engagement',i:'👥',k:'engagement activity viewers chatters'},
  {l:'Streaks & Milestones',c:'Analytics',u:'/stats?tab=stats-streaks',i:'🏆',k:'streaks milestones achievements records'},
  {l:'Trends',c:'Analytics',u:'/stats?tab=stats-trends',i:'📊',k:'trends growth over time graphs charts'},
  {l:'Game Performance',c:'Analytics',u:'/stats?tab=stats-games',i:'🎮',k:'games performance categories played'},
  {l:'Viewer Patterns',c:'Analytics',u:'/stats?tab=stats-viewers',i:'👀',k:'viewers patterns watch time peak hours'},
  {l:'AI Insights',c:'Analytics',u:'/stats?tab=stats-ai',i:'🤖',k:'ai insights predictions analysis'},
  {l:'Reports',c:'Analytics',u:'/stats?tab=stats-reports',i:'📋',k:'reports summary export'},
  {l:'Community & Bot',c:'Analytics',u:'/stats?tab=stats-community',i:'🤝',k:'community bot analytics usage'},
  {l:'RPG Analytics',c:'Analytics',u:'/stats?tab=stats-rpg',i:'🎮',k:'rpg analytics players economy combat'},
  {l:'RPG Events',c:'Analytics',u:'/stats?tab=stats-rpg-events',i:'⚡',k:'rpg events world boss raids'},
  {l:'RPG Economy',c:'Analytics',u:'/stats?tab=stats-rpg-economy',i:'💰',k:'rpg economy gold market trading'},
  {l:'RPG Quests & Combat',c:'Analytics',u:'/stats?tab=stats-rpg-quests',i:'📜',k:'rpg quests combat battles arena'},
  {l:'Stream Compare',c:'Analytics',u:'/stats?tab=stats-compare',i:'🆚',k:'compare streams side by side'},
  {l:'Content Editor',c:'RPG',u:'/rpg?tab=rpg-editor',i:'✏️',k:'rpg content editor items monsters worlds'},
  {l:'Entities',c:'RPG',u:'/rpg?tab=rpg-entities',i:'👥',k:'rpg entities players monsters npcs characters'},
  {l:'Systems',c:'RPG',u:'/rpg?tab=rpg-systems',i:'⚙️',k:'rpg systems crafting gathering professions skills'},
  {l:'AI & Combat',c:'RPG',u:'/rpg?tab=rpg-ai',i:'🤖',k:'rpg ai combat battle simulation'},
  {l:'Flags & Modifiers',c:'RPG',u:'/rpg?tab=rpg-flags',i:'🚩',k:'rpg flags modifiers settings buffs debuffs'},
  {l:'Simulators',c:'RPG',u:'/rpg?tab=rpg-simulators',i:'🧪',k:'rpg simulators test balance'},
  {l:'Adventurers Guild',c:'RPG',u:'/rpg?tab=rpg-guild',i:'🏛️',k:'rpg guild adventurers members'},
  {l:'Guild Stats',c:'RPG',u:'/rpg?tab=rpg-guild-stats',i:'📊',k:'rpg guild stats leaderboard'},
  {l:'Admin',c:'RPG',u:'/rpg?tab=rpg-admin',i:'🔑',k:'rpg admin manage reset'},
  {l:'Config',c:'Config',u:'/commands',i:'⚙️',k:'config commands settings bot configuration'},
  {l:'Embeds',c:'Config',u:'/embeds',i:'✨',k:'embeds custom messages rich embed builder'},
  {l:'Export',c:'Tools',u:'/export',i:'📤',k:'tools export csv json moderation command usage'},
  {l:'Backups',c:'Tools',u:'/backups',i:'💾',k:'backup restore upload data settings snapshot'},
  {l:'SmartBot',c:'SmartBot',u:'/smartbot-config',i:'🤖',k:'smartbot ai smart bot chat config knowledge info replies personality'},
  {l:'SmartBot Knowledge',c:'SmartBot',u:'/smartbot-knowledge',i:'📚',k:'smartbot knowledge base custom entries qa info'},
  {l:'SmartBot News',c:'SmartBot',u:'/smartbot-news',i:'📰',k:'smartbot news feed channel rss auto post'},
  {l:'SmartBot Stats',c:'SmartBot',u:'/smartbot-stats',i:'📊',k:'smartbot stats trends topics replies analytics'},
  {l:'SmartBot Learning',c:'SmartBot',u:'/smartbot-learning',i:'📖',k:'smartbot learning log subjects slang social'},
  {l:'SmartBot Training',c:'SmartBot',u:'/smartbot-training',i:'🏋️',k:'smartbot training practice scenarios rate approve reject feedback'},
  {l:'SmartBot Quotes',c:'SmartBot',u:'/smartbot-quotes',i:'📜',k:'smartbot quotes sayings community add delete manage'}
  ${userAccess.includes('idleon')?',{l:\'IdleOn Stats\',c:\'IdleOn\',u:\'/idleon-stats\',i:\'📊\',k:\'idleon stats leaderboard top gain weekly total trends performance\'}':''},
  ${userAccess.includes('idleon')?',{l:\'Guild Management\',c:\'IdleOn\',u:\'/idleon-guild-mgmt\',i:\'🏰\',k:\'idleon guild management kick waitlist promotion roles ghosts auto-kick recruit\'}':''},
  {l:'Profile',c:'Profile',u:'/profile',i:'👤',k:'profile account overview user'},
  {l:'Appearance',c:'Profile',u:'/profile-customize',i:'🎨',k:'profile customize themes appearance effects'},
  {l:'Security',c:'Profile',u:'/profile-security',i:'🔒',k:'profile security password 2fa sessions'},
  {l:'Mail',c:'Profile',u:'/mail',i:'📬',k:'mail inbox messages send receive'},
  {l:'DMs',c:'Profile',u:'/dms',i:'✉️',k:'dms direct messages conversations chat'},
  {l:'Settings',c:'Profile',u:'/profile-notifications',i:'🔔',k:'profile notifications preferences sidebar landing page compact'},
  {l:'Revenue',c:'Analytics',u:'/stats?tab=stats-revenue',i:'💰',k:'revenue prediction subs ads bits donations income earnings money'}
];

var _curSlug = '${tab}';
</script>
<script src="/dashboard-shell.js?v=1" defer></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js" defer></script>
<script src="/socket.io/socket.io.js" defer></script>
<script src="/dashboard-actions.js?v=7" defer></script>
<script>
(function(){
  // Apply saved sidebar width on every page
  fetch('/api/features/dashboard-prefs',{credentials:'same-origin'})
    .then(r=>r.ok?r.json():null).then(d=>{
      if(!d||!d.success) return;
      var p=d.prefs||{};
      var sb=document.querySelector('.sidebar');
      var mn=document.querySelector('.main');
      if(!sb||!mn) return;
      var w=p.sidebarWidth==='narrow'?180:p.sidebarWidth==='wide'?280:220;
      sb.style.width=w+'px';mn.style.marginLeft=w+'px';
      if(p.compact) document.body.classList.add('compact-mode');
      if(p.animations===false){document.body.style.setProperty('--transition-speed','0s');}
    }).catch(function(){});
  // Bell notification badge
  Promise.all([
    fetch('/api/messaging/notifications',{credentials:'same-origin'}).then(r=>r.ok?r.json():null),
    fetch('/api/messaging/dm/conversations',{credentials:'same-origin'}).then(r=>r.ok?r.json():null)
  ]).then(function(res){
    var notifs=res[0],convos=res[1];
    var count=0;
    if(notifs&&notifs.notifications) count+=notifs.notifications.filter(function(n){return !n.read}).length;
    if(convos&&convos.conversations) count+=convos.conversations.filter(function(c){return c.unread}).length;
    var badge=document.getElementById('bellBadge');
    if(badge&&count>0){badge.textContent=count>99?'99+':count;badge.style.display='flex';}
  }).catch(function(){});
})();
</script>
</body>
</html>`;
}


/* ======================
   STREAM MANAGER (extracted to modules/stream-manager.js)
====================== */
const {
  checkStream, announceLive, computeNextScheduledStream,
  getNextAlertInfo, getNextScheduledStream, maybeDailyReset,
  sendEmbedNotification, sendScheduleAlert, updateStreamInfo,
  fetchChannelInfo, finalizeStreamViewerData, finalizeStreamGameTimeline,
  checkScheduleAlerts, validateTwitchToken, refreshTwitchToken,
  ensureTwitchInitialized, getBroadcasterId, getChannelVIPs,
  buildLiveEmbed, buildOfflineEmbed, processDiscordMsgQueue,
  queueDiscordMessage, trackStreamGameChange,
} = registerStreamManager({
  sv: streamVars,
  addLog, saveState, saveConfig, client, schedule, state,
  streamInfo, chatStats, apiRateLimits, twitchTokens, streamGoals,
  history, currentStreamViewerData, currentStreamGameTimeline,
  viewerGraphHistory, dashboardSettings, botTimezone,
  getTimeZoneParts, zonedTimeToUtcMillis, fetchUserName,
  checkRPGMilestoneEvents, expireRPGEvents, rpgEvents,
  pushDashboardNotification, invalidateAnalyticsCache,
  getNowInBotTimezone, dashAudit, notificationFilters,
  trackApiCall, resetChatStats, smartBot, io, config,
  logNotification,
  getLastResetDate: () => lastResetDate,
  setLastResetDate: (v) => { lastResetDate = v; },
  activityHeatmap, debouncedSaveState,
  engagementSettings, streamMetadata, stats, followerHistory, alertCooldowns,
});

/* ======================
   SCHEDULE CARD (monthly canvas + daily post)
====================== */
const {
  postMonthlySchedule, updateDailyPost, handleDailyReset: handleScheduleDailyReset,
  onStreamEnd: scheduleOnStreamEnd, onStreamStart: scheduleOnStreamStart,
  generateMonthlyCard, SCHEDULE_CHANNEL_ID, THEMES: SCHEDULE_THEMES,
} = registerScheduleCard({
  client, schedule, state, history, streamInfo,
  addLog, saveState, botTimezone, getTimeZoneParts,
  zonedTimeToUtcMillis, computeNextScheduledStream,
  queueDiscordMessage, debouncedSaveState, sv: streamVars, io,
});

/* ======================
   EXPRESS ROUTES (extracted to modules/express-routes.js)
====================== */
const { notifyPetsChange } = registerExpressRoutes(app, {
  addLog, chatStats, checkStream, client, config, dashAudit,
  dashboardSettings, debouncedSaveState, fetchUserName, getUserTier,
  giveaways, history, invalidateAnalyticsCache, leveling,
  loadJSON, LOG_FILE, logs, normalizeYouTubeAlertsSettings,
  PETS_PATH, polls, reminders, renderPage, requireAuth,
  requireTier, rpgEvents, saveAuditLogHistory, saveConfig, saveJSON,
  saveState, schedule, state, stats, streamGoals,
  streamInfo, suggestions, TIER_ACCESS, twitchTokens, upload,
  welcomeSettings, DATA_DIR,
  logSSEClients, activeSessionTokens, streamVars,
  announceLive, getChannelVIPs, sendScheduleAlert,
  membersCache, startTime, apiRateLimits, buildOfflineEmbed,
  ensureTwitchInitialized, refreshTwitchToken, normalizeYouTubeFeed,
  levelingConfig, endPoll,
  postMonthlySchedule, updateDailyPost, generateMonthlyCard,
  computeNextScheduledStream, THEMES: SCHEDULE_THEMES,
});

// ── Stream state watcher → triggers schedule card daily post updates ──
{
  let _prevIsLive = streamVars.isLive;
  const _origEmit = io.emit.bind(io);
  io.emit = function(event, ...args) {
    _origEmit(event, ...args);
    if (event === 'streamUpdate') {
      const nowLive = !!streamVars.isLive;
      if (!_prevIsLive && nowLive) {
        // OFFLINE → LIVE
        scheduleOnStreamStart().catch(err => addLog('error', 'scheduleOnStreamStart: ' + err.message));
      } else if (_prevIsLive && !nowLive) {
        // LIVE → OFFLINE
        scheduleOnStreamEnd().catch(err => addLog('error', 'scheduleOnStreamEnd: ' + err.message));
      }
      _prevIsLive = nowLive;
    }
  };
  // Also run daily reset check every 60s
  setInterval(() => {
    handleScheduleDailyReset().catch(err => addLog('error', 'handleScheduleDailyReset: ' + err.message));
  }, 60000);
}


/* ======================
   FEATURES (modules/features.js — 28 feature roadmap)
====================== */
const featureHooks = registerFeatures(app, {
  addLog, client, config, dashAudit, dashboardSettings,
  debouncedSaveState, giveaways, io, leveling, levelingConfig,
  loadJSON, pushDashboardNotification, reminders,
  requireAuth, requireTier, saveJSON, saveState, smartBot,
  state, streamInfo, suggestions, warnings, welcomeSettings,
  DATA_DIR, pushActivity, fireWebhooks
});

/* ======================
   DISCORD EVENTS (extracted to modules/discord-events.js)
====================== */
const { sendYouTubeVideoAlert, checkYouTubeAlerts } = registerDiscordEvents({
  addAuditLogEntry, addLog, afkUsers, apiRateLimits, auditLogSettings, chatStats, checkStream, client,
  commandUsage, computeNextScheduledStream, config, dashboardSettings, debouncedSaveState,
  ensureTwitchInitialized, fullMemberCacheSync, getAuditExecutor, getXpForLevel, giveaways, getMemberRoleIds,
  history, isExcludedBySettings, leveling, levelingConfig, loadJSON, loadRPGWorlds, log,
  normalizeYouTubeAlertsSettings, notificationHistory, notifyPetsChange,
  PETS_PATH, polls, REACTION_ROLES_PATH, reminders, rpgBot, rpgTestMode, saveJSON, saveState, sendAuditLog,
  schedule, smartBot, STARBOARD_PATH, state, stats, streamInfo, suggestions, suggestionSettings, suggestionCooldowns,
  trackMemberGrowth, truncateLogText, userMemory, weeklyLeveling, welcomeSettings, featureHooks,
  trackCommand, prestige
});
// Make sendYouTubeVideoAlert available to routes (registered before discord-events)
dashboardSettings._sendYouTubeVideoAlert = sendYouTubeVideoAlert;
dashboardSettings._checkYouTubeAlerts = checkYouTubeAlerts;
// ==================== GIVEAWAY HELPER ====================
async function getGiveawayParticipants(giveaway) {
  const channel = await client.channels.fetch(giveaway.channelId);
  let participants = [];
  const allowedRoles = Array.isArray(giveaway.allowedRoleIds) ? giveaway.allowedRoleIds : [];

  if (allowedRoles.length > 0) {
    participants = await getRoleBasedGiveawayParticipants(giveaway);
  } else {
    const msg = await channel.messages.fetch(giveaway.messageId);
    const reaction = msg.reactions.cache.get('🎉');
    if (!reaction) return [];
    const users = await reaction.users.fetch();
    participants = users.filter(u => !u.bot).map(u => u.id);
  }

  return participants;
}

async function endGiveaway(giveaway) {
  try {
    const channel = await client.channels.fetch(giveaway.channelId);
    let participants = [];
    const allowedRoles = Array.isArray(giveaway.allowedRoleIds) ? giveaway.allowedRoleIds : [];

    if (allowedRoles.length > 0) {
      participants = await getRoleBasedGiveawayParticipants(giveaway);
    } else {
      const msg = await channel.messages.fetch(giveaway.messageId);
      const reaction = msg.reactions.cache.get('🎉');
      if (!reaction) {
        await channel.send(`❌ Giveaway ended but no participants found for: **${giveaway.prize}**`);
        giveaway.active = false;
        saveState();
        return;
      }
      const users = await reaction.users.fetch();
      participants = users.filter(u => !u.bot).map(u => u.id);
    }

    const eligible = await getEligibleGiveawayParticipants(giveaway, participants);

    if (eligible.length === 0) {
      await channel.send(`❌ Giveaway ended but no valid participants for: **${giveaway.prize}**`);
      giveaway.active = false;
      saveState();
      return;
    }

    const winners = [];
    const winnerCount = Math.min(giveaway.winners, eligible.length);
    const shuffled = eligible.sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < winnerCount; i++) {
      winners.push(shuffled[i]);
    }

    const winnerMentions = winners.map(id => `<@${id}>`).join(', ');
    const claimContact = (config.giveawayClaimContact || '').trim() || 'Contact <@284616307482165249> or <@150381666257469441> to claim your prize.';
    const resolvedColor = (giveaway.embedColor || config.giveawayDefaultColor || '').replace('#', '').trim();
    const parsedColor = resolvedColor ? parseInt(resolvedColor, 16) : NaN;
    const embedColorInt = Number.isFinite(parsedColor) ? parsedColor : 0xFFD700;
    const embed = new EmbedBuilder()
      .setColor(embedColorInt)
      .setTitle('🎉 Giveaway Ended!')
      .setDescription(`**Prize:** ${giveaway.prize}\n**Winner(s):** ${winnerMentions}\n\nCongratulations!\n\n*${claimContact}*`)
      .setTimestamp();

    if (giveaway.imageUrl) {
      embed.setImage(giveaway.imageUrl);
    }

    await channel.send({ content: winnerMentions, embeds: [embed] });
    
    giveaway.active = false;
    giveaway.winners = winners;
    saveState();
    
    addLog('info', `Giveaway ended: ${giveaway.id} - ${winners.length} winner(s)`);

    if (config.giveawayLogChannelId) {
      try {
        const logChannel = await client.channels.fetch(config.giveawayLogChannelId);
        if (logChannel && logChannel.send) {
          await logChannel.send({ embeds: [new EmbedBuilder()
            .setColor(embedColorInt)
            .setTitle('🎉 Giveaway Ended')
            .setDescription(`**Prize:** ${giveaway.prize}\n**Winners:** ${winnerMentions}\n**ID:** ${giveaway.id}`)
            .setTimestamp()
          ] });
        }
      } catch {}
    }
  } catch (err) {
    addLog('error', `Failed to end giveaway ${giveaway.id}: ${err.message}`);
  }
}

async function getRoleBasedGiveawayParticipants(giveaway) {
  const allowedRoles = Array.isArray(giveaway.allowedRoleIds) ? giveaway.allowedRoleIds : [];
  if (allowedRoles.length === 0) return [];

  const guildId = process.env.GUILD_ID || process.env.DISCORD_GUILD_ID;
  if (!guildId) return [];

  try {
    const guild = await client.guilds.fetch(guildId);
    const ids = new Set();
    for (const roleId of allowedRoles) {
      try {
        const role = await guild.roles.fetch(roleId);
        if (role) {
          role.members.forEach(m => { if (!m.user.bot) ids.add(m.id); });
        }
      } catch {}
    }
    return Array.from(ids);
  } catch {
    return [];
  }
}

async function getEligibleGiveawayParticipants(giveaway, participants) {
  let eligible = participants.slice();
  const excluded = new Set(giveaway.excludedUserIds || []);
  eligible = eligible.filter(id => !excluded.has(id));

  if (giveaway.excludePreviousWinners) {
    const previousWinners = new Set(getAllGiveawayWinnerIds());
    eligible = eligible.filter(id => !previousWinners.has(id));
  }

  const staffRoleIds = Array.isArray(giveaway.excludeStaffRoleIds) ? giveaway.excludeStaffRoleIds : [];
  const minAccountAgeDays = Number(giveaway.minAccountAgeDays) || 0;
  const minLevel = Number(giveaway.minLevel) || 0;
  const minXp = Number(giveaway.minXp) || 0;
  const shouldCheckMembers = (staffRoleIds.length > 0)
    || (giveaway.excludeBots !== false)
    || (minAccountAgeDays > 0)
    || (minLevel > 0)
    || (minXp > 0);
  if (shouldCheckMembers) {
    const guildId = process.env.GUILD_ID || process.env.DISCORD_GUILD_ID;
    const guild = guildId ? await client.guilds.fetch(guildId) : client.guilds.cache.first();
    const filtered = [];

    for (const id of eligible) {
      try {
        const member = guild.members.cache.get(id) || await guild.members.fetch(id);
        if (!member) continue;
        if (giveaway.excludeBots !== false && member.user.bot) continue;
        if (staffRoleIds.length > 0 && member.roles.cache.some(r => staffRoleIds.includes(r.id))) continue;
        if (minAccountAgeDays > 0) {
          const ageMs = Date.now() - member.user.createdTimestamp;
          const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
          if (ageDays < minAccountAgeDays) continue;
        }
        if (minLevel > 0 || minXp > 0) {
          const data = leveling[id] || { level: 0, xp: 0 };
          if (minLevel > 0 && Number(data.level) < minLevel) continue;
          if (minXp > 0 && Number(data.xp) < minXp) continue;
        }
        filtered.push(id);
      } catch {
        // Skip members we can't resolve
      }
    }
    eligible = filtered;
  }

  return eligible;
}

function getAllGiveawayWinnerIds() {
  const ids = new Set();
  for (const g of giveaways) {
    if (Array.isArray(g.winners)) {
      g.winners.forEach(id => ids.add(id));
    } else if (g.winner) {
      ids.add(g.winner);
    }
  }
  return Array.from(ids);
}

// ==================== POLL HELPER ====================
async function endPoll(poll) {
  try {
    const channel = await client.channels.fetch(poll.channelId);
    const msg = await channel.messages.fetch(poll.messageId);
    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    
    const results = [];
    let totalVotes = 0;

    for (let i = 0; i < poll.options.length; i++) {
      const reaction = msg.reactions.cache.get(emojis[i]);
      const count = reaction ? reaction.count - 1 : 0; // -1 for bot's reaction
      results.push({ option: poll.options[i], votes: count });
      totalVotes += count;
    }

    const resultsText = results
      .map(r => {
        const percentage = totalVotes > 0 ? Math.round((r.votes / totalVotes) * 100) : 0;
        const bar = '█'.repeat(Math.floor(percentage / 5));
        return `**${r.option}**\n${bar} ${r.votes} votes (${percentage}%)`;
      })
      .join('\n\n');

    const winner = results.length ? results.slice().sort((a, b) => b.votes - a.votes)[0] : null;

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📊 Poll Ended!')
      .setDescription(`**${poll.question}**\n\n${resultsText}`)
      .addFields({ name: '🏆 Winner', value: winner ? winner.option : 'N/A', inline: true })
      .setFooter({ text: `Total votes: ${totalVotes}` })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    
    poll.active = false;
    poll.results = results;
    saveState();
    
    addLog('info', `Poll ended: ${poll.id} - ${totalVotes} total votes`);
  } catch (err) {
    addLog('error', `Failed to end poll ${poll.id}: ${err.message}`);
    throw err;
  }
}

// ==================== BACKGROUND PROCESSES ====================
async function checkGiveaways() {
  const now = Date.now();
  for (const giveaway of giveaways) {
    if (giveaway.paused) continue;
    if (giveaway.active && giveaway.endTime <= now) {
      await endGiveaway(giveaway);
    }
  }
}

async function checkPolls() {
  const now = Date.now();
  for (const poll of polls) {
    if (poll.active && poll.endTime && poll.endTime <= now) {
      try { await endPoll(poll); } catch (e) { /* already logged */ }
    }
  }
}

async function checkReminders() {
  const now = Date.now();
  for (const reminder of reminders) {
    if (reminder.active && reminder.reminderTime <= now) {
      try {
        if (!reminder.channelId) {
          throw new Error('No channel ID set for reminder');
        }
        
        const channel = await client.channels.fetch(reminder.channelId);
        
        let messageContent = '';
        let embed = new EmbedBuilder()
          .setColor(0xFFA500)
          .setTitle('⏰ Reminder!')
          .setDescription(`You asked to be reminded:\n\n**${reminder.message}**`)
          .setFooter({ text: `Set by ${reminder.createdBy}` })
          .setTimestamp();

        // Only mention user if userId exists (not from dashboard)
        if (reminder.userId) {
          try {
            const user = await client.users.fetch(reminder.userId);
            messageContent = `<@${reminder.userId}>`;
            embed.setDescription(`${user}, you asked to be reminded:\n\n**${reminder.message}**`);
          } catch (err) {
            messageContent = '';
          }
        }

        await channel.send({ content: messageContent, embeds: [embed] });
        
        reminder.active = false;
        saveState();
        
        addLog('info', `Reminder sent: ${reminder.id}`);
      } catch (err) {
        addLog('error', `Failed to send reminder ${reminder.id}: ${err.message}`);
        reminder.active = false;
        saveState();
      }
    }
  }
}



// Check and send schedule alerts automatically


// Interval variables now managed inside stream-manager.js




/* ======================
   STARTUP
====================== */
// Removed - now runs in client.once('ready') event
// RPG API routes loaded from modules/rpg-routes.js
registerRPGRoutes(app, { requireAuth, saveRPGWorlds, rpgBot, DATA_DIR, loadRPGWorlds });

// IdleOn Guild Manager routes
const idleonExports = registerIdleonRoutes(app, {
  addLog, client, dashAudit, debouncedSaveState,
  loadJSON, membersCache, requireAuth, requireTier,
  saveJSON, DATA_DIR, twitchTokens, streamVars
});
// Expose idleon functions for slash commands
client._idleon = idleonExports;

/* ======================
   RUN
====================== */
// Error handler for Discord client
client.on('error', (err) => {
  console.error('[Discord] Client error:', err.message);
  try { addLog('error', `Discord client error: ${err.message}`); } catch {}
});

client.on('warn', (msg) => {
  console.warn('[Discord] Warning:', msg);
  try { addLog('warn', `Discord warning: ${msg}`); } catch {}
});

// Login to Discord with error handling
const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('[FATAL] DISCORD_TOKEN environment variable is not set!');
} else {
  console.log('[Discord] Logging in...');
  client.login(token).then(() => {
    console.log('[Discord] Login successful, waiting for ready event...');
  }).catch(err => {
    console.error('[FATAL] Discord login failed:', err.message);
    try { addLog('error', `Discord login failed: ${err.message}`); } catch {}
  });
}

// Auto-refresh Twitch token on startup if expired
if (twitchTokens.refresh_token && twitchTokens.expires_at) {
  const now = Date.now();
  const bufferMs = 5 * 60 * 1000; // 5 min buffer
  if (now >= twitchTokens.expires_at - bufferMs) {
    console.log('[Twitch] Persisted token expired or expiring soon, attempting auto-refresh...');
    refreshTwitchToken().then(ok => {
      if (ok) console.log('[Twitch] Token refreshed successfully on startup');
      else console.warn('[Twitch] Token refresh failed on startup — re-authorize via dashboard');
    }).catch(() => {});
  } else {
    console.log(`[Twitch] Persisted token valid until ${new Date(twitchTokens.expires_at).toLocaleString()}`);
  }
}

const PORT = Number.parseInt(process.env.PORT || '3000', 10);
httpServer.on('error', (err) => {
  const code = err?.code || 'UNKNOWN';
  const msg = err?.message || String(err);
  try { addLog('error', `HTTP server error (${code}): ${msg}`); } catch {}

  if (code === 'EADDRINUSE') {
    console.error(`Port ${PORT} already in use. Stop the other process or set PORT in .env.`);
  }
});
// SmartBot tabs + API routes loaded from smartbot/routes/
registerSmartBotRoutes(app, { smartBot, requireAuth, debouncedSaveState, saveState, checkNewsFeed });

// ========== GLOBAL ERROR HANDLER ==========
app.use((err, _req, res, _next) => {
  console.error('[Express Error]', err.stack || err.message || err);
  addLog('error', `Express error: ${err.message || 'Unknown error'}`);
  res.status(err.status || 500).json({ success: false, error: 'Internal server error' });
});

// ========== AUTO BACKUP ==========
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

function autoBackup() {
  try {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupPath = path.join(BACKUP_DIR, stamp);
    fs.mkdirSync(backupPath, { recursive: true });
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
    let copied = 0;
    for (const f of files) {
      try {
        fs.copyFileSync(path.join(DATA_DIR, f), path.join(backupPath, f));
        copied++;
      } catch { /* skip individual file errors */ }
    }
    // Keep only last 7 backups
    const backups = fs.readdirSync(BACKUP_DIR).filter(d => {
      try { return fs.statSync(path.join(BACKUP_DIR, d)).isDirectory(); } catch { return false; }
    }).sort();
    while (backups.length > 7) {
      const old = backups.shift();
      fs.rmSync(path.join(BACKUP_DIR, old), { recursive: true, force: true });
    }
    addLog('info', `Auto-backup complete: ${copied} files → backups/${stamp}`);
    console.log(`[Backup] ${copied} files → ${stamp}`);
  } catch (e) {
    addLog('error', `Auto-backup failed: ${e.message}`);
    console.error('[Backup] Failed:', e.message);
  }
}

// Run backup every 12 hours
setInterval(autoBackup, 12 * 60 * 60 * 1000);
// Also run once 60s after startup
setTimeout(autoBackup, 60000);

// ========== METRICS ENDPOINT ==========
app.get('/metrics', requireAuth, requireTier('moderator'), (req, res) => {
  const mem = process.memoryUsage();
  const uptimeSec = Math.floor(process.uptime());
  const cmdData = loadJSON(CMD_USAGE_PATH, { commands: {}, hourly: [] });
  const totalCommands = Object.values(cmdData.commands).reduce((s, c) => s + c.count, 0);
  const growthData = loadJSON(MEMBER_GROWTH_PATH, { daily: [] });
  const today = new Date().toISOString().slice(0, 10);
  const todayGrowth = growthData.daily.find(d => d.date === today) || { joins: 0, leaves: 0 };

  res.json({
    uptime: uptimeSec,
    memory: {
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
      rssMB: Math.round(mem.rss / 1024 / 1024),
      externalMB: Math.round((mem.external || 0) / 1024 / 1024)
    },
    discord: {
      ready: client.isReady(),
      guilds: client.guilds?.cache?.size || 0,
      wsLatencyMs: client.ws?.ping || -1,
      cachedUsers: client.users?.cache?.size || 0
    },
    commands: { total: totalCommands, unique: Object.keys(cmdData.commands).length },
    growth: { todayJoins: todayGrowth.joins, todayLeaves: todayGrowth.leaves },
    activeSessions: activeSessionTokens.size,
    apiCalls: { thisMinute: apiRateLimits.callsThisMinute, total: apiRateLimits.totalCalls },
    logs: { total: logs.length, errors: logs.filter(l => l.type === 'error').length },
    giveaways: { active: giveaways.filter(g => g.active && !g.paused).length, total: giveaways.length },
    polls: { active: polls.filter(p => p.active).length },
    reminders: { active: reminders.filter(r => r.active).length }
  });
});

// ========== GRACEFUL SHUTDOWN ==========
let isShuttingDown = false;
function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n[${signal}] Graceful shutdown initiated...`);
  addLog('info', `Shutdown initiated (${signal})`);
  
  // Save state immediately
  try {
    saveState();
    console.log('[Shutdown] State saved');
  } catch (e) { console.error('[Shutdown] State save failed:', e.message); }

  // Save sessions
  try {
    const sessions = {};
    for (const [token, data] of activeSessionTokens) sessions[token] = data;
    fs.writeFileSync(path.join(DATA_DIR, 'sessions.json'), JSON.stringify(sessions, null, 2));
    console.log('[Shutdown] Sessions saved');
  } catch (e) { console.error('[Shutdown] Session save failed:', e.message); }

  // Close HTTP server
  httpServer.close(() => {
    console.log('[Shutdown] HTTP server closed');
    // Destroy Discord client
    client.destroy();
    console.log('[Shutdown] Discord client destroyed');
    process.exit(0);
  });

  // Force exit after 10s
  setTimeout(() => {
    console.error('[Shutdown] Forced exit after timeout');
    process.exit(1);
  }, 10000);
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

httpServer.listen(PORT, '0.0.0.0', () => {
  log('info', 'Server', `Dashboard on http://localhost:${PORT}`);
});



