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
import { renderSmartBotConfigTab, renderSmartBotKnowledgeTab, renderSmartBotNewsTab, renderSmartBotStatsTab, renderSmartBotLearningTab, registerSmartBotRoutes } from './modules/smartbot-routes.js';
import { registerRPGRoutes } from './modules/rpg-routes.js';
import { renderRPGEditorTab } from './modules/render/rpg-editor-tab.js';
import { initAnalyticsTabs, renderHealthTab, renderAnalyticsTab, renderEngagementStatsTab, renderStreaksMilestonesTab, renderTrendsStatsTab, renderGamePerformanceTab, renderViewerPatternsTab, renderAIInsightsTab, renderReportsTab, renderCommunityStatsTab, renderRPGEconomyTab, renderRPGQuestsCombatTab, renderStreamCompareTab, renderRPGAnalyticsTab, renderRPGEventsTab } from './modules/render/analytics-tabs.js';
import { initConfigTabs, renderSuggestionsTab, renderCommandsAndConfigTab, renderCommandsTab, renderConfigGeneralTab, renderConfigNotificationsTab, renderConfigTab, renderSettingsTab, renderCommandsTabContent, renderLevelingTab, renderNotificationsTab, renderYouTubeAlertsTab, renderCustomCommandsTab, renderGiveawaysTab, renderPollsTab, renderRemindersTab, renderEmbedsTab, renderWelcomeTab, renderProfileTab } from './modules/render/config-tabs.js';
import { initCommunityTabs, renderEventsTab, renderTab, renderModerationTab, renderTicketsTab, renderReactionRolesTab, renderScheduledMsgsTab, renderAutomodTab, renderStarboardTab, renderBotStatusTab, renderPetsTab, renderPetApprovalsTab, renderPetGiveawaysTab, renderPetStatsTab, renderIdleonDashboardTab, renderIdleonMembersTab, renderIdleonAdminTab, renderIdleonReviewsTab, renderToolsExportTab, renderToolsBackupsTab, renderAccountsTab, renderAuditLogTab, renderGuideIndexerTab } from './modules/render/community-tabs.js';
import { initRpgTabs, renderRPGWorldsTab, renderRPGQuestsTab, renderRPGValidatorsTab, renderRPGSimulatorsTab, renderRPGEntitiesTab, renderRPGSystemsTab, renderRPGAITab, renderRPGFlagsTab, renderRPGGuildTab, renderRPGAdminTab, renderRPGGuildStatsTab } from './modules/render/rpg-tabs.js';
import SmartBot from './smart-bot.js';
import contentRoutes from './Discord bot - test branch/rpg/api/content-routes.js';
import { ITEMS } from './Discord bot - test branch/rpg/data/items.js';
import { RECIPES } from './Discord bot - test branch/rpg/data/professions.js';
import { registerExpressRoutes } from './modules/express-routes.js';
import { registerIdleonRoutes } from './modules/routes/idleon-routes.js';
import { registerDiscordEvents } from './modules/discord-events.js';
import { registerStreamManager } from './modules/stream-manager.js';
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
    weekly: {}
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
  <meta name="description" content="Privacy policy for the nephilheim Discord bot dashboard.">
  <title>Privacy Policy — nephilheim Bot Dashboard</title>
  <style>
    body { background: #0e0e10; color: #e0e0e0; font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 700px; margin: 0 auto; padding: 40px 20px; line-height: 1.7; }
    h1 { color: #fff; font-size: 24px; border-bottom: 1px solid #2a2f3a; padding-bottom: 12px; }
    h2 { color: #9146ff; font-size: 18px; margin-top: 28px; }
    a { color: #9146ff; }
    .back { display: inline-block; margin-top: 24px; color: #8b8fa3; text-decoration: none; font-size: 13px; }
    .back:hover { color: #fff; }
  </style>
</head>
<body>
  <h1>Privacy Policy</h1>
  <p><em>Last updated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</em></p>
  <p>This website is a <strong>private administration dashboard</strong> for the <strong>nephilheim Discord bot</strong>. It is not intended for public use.</p>

  <h2>What This Site Does</h2>
  <p>This dashboard allows authorized server administrators and moderators to configure and manage the nephilheim Discord bot for their community. Access is restricted to approved accounts only.</p>

  <h2>Data Collected</h2>
  <p>This dashboard and bot process data necessary for Discord bot operation:</p>
  <ul>
    <li><strong>Login credentials</strong> — Username and hashed password for dashboard access (no external data is collected)</li>
    <li><strong>Session cookies</strong> — A secure, HTTP-only session cookie to maintain your login</li>
    <li><strong>Bot configuration</strong> — Settings you configure through the dashboard for your Discord server</li>
    <li><strong>Discord member data</strong> — Usernames, roles, message counts, and join dates as needed for leveling, moderation, and server management features</li>
    <li><strong>Twitch integration</strong> — OAuth tokens and stream metadata (viewer counts, stream titles, game names) for stream analytics. Tokens are stored locally and not shared</li>
    <li><strong>RPG &amp; game data</strong> — Player stats, inventories, and quest progress for the RPG system</li>
    <li><strong>Moderation logs</strong> — Warnings, bans, mutes, and audit actions for server moderation</li>
  </ul>
  <p>We do not collect, sell, or share any personal data with third parties. No analytics or tracking scripts are used on this site. All data is stored locally on the bot's server.</p>

  <h2>Cookies</h2>
  <p>This site uses a single essential session cookie (<code>session</code>) required for authentication. No advertising or tracking cookies are used.</p>

  <h2>Data Retention</h2>
  <p>Bot configuration and logs are retained for as long as the bot is active. Stream history and analytics data are kept indefinitely for trend analysis. Users can request data deletion by contacting the server administrator.</p>

  <h2>Third-Party Services</h2>
  <ul>
    <li><strong>Discord API</strong> — Used for bot operations and authentication</li>
    <li><strong>Twitch API</strong> — Used for stream monitoring and analytics (when connected)</li>
    <li><strong>YouTube API</strong> — Used for video/channel alerts (when enabled)</li>
  </ul>

  <h2>Contact</h2>
  <p>For questions about this dashboard or to request data deletion, contact the server administrator through Discord.</p>

  <a class="back" href="/login">← Back to login</a>
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
  smartbot: ['smartbot-config','smartbot-knowledge','smartbot-news','smartbot-stats','smartbot-learning','smartbot-training'],
  idleon: ['idleon-dashboard','idleon-members','idleon-admin','idleon-reviews'],
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
    body{background:#08080c;color:#e0e0e0;font-family:'Segoe UI',Tahoma,Geneva,sans-serif;min-height:100vh;overflow:hidden;position:relative}

    /* Canvas constellation */
    #constellation{position:fixed;top:0;left:0;width:100%;height:100%;z-index:0}

    /* Animated gradient background */
    .bg-gradient{position:fixed;inset:0;background:radial-gradient(ellipse at 20% 50%,rgba(145,70,255,0.12) 0%,transparent 60%),radial-gradient(ellipse at 80% 20%,rgba(88,101,242,0.1) 0%,transparent 60%),radial-gradient(ellipse at 50% 80%,rgba(157,78,221,0.08) 0%,transparent 60%),#08080c;z-index:0}

    /* Interactive orbs */
    .orb{position:fixed;border-radius:50%;filter:blur(80px);z-index:0;pointer-events:none;transition:transform 0.4s ease-out}
    .orb-1{width:400px;height:400px;background:rgba(145,70,255,0.15);top:-100px;left:-100px;animation:orbFloat 18s ease-in-out infinite}
    .orb-2{width:300px;height:300px;background:rgba(88,101,242,0.12);bottom:-80px;right:-80px;animation:orbFloat 22s ease-in-out infinite reverse}
    .orb-3{width:200px;height:200px;background:rgba(157,78,221,0.1);top:50%;left:60%;animation:orbFloat 25s ease-in-out infinite 3s}
    @keyframes orbFloat{0%,100%{transform:translate(0,0) scale(1)}25%{transform:translate(40px,-30px) scale(1.05)}50%{transform:translate(-20px,40px) scale(0.95)}75%{transform:translate(30px,20px) scale(1.02)}}

    /* Grid overlay */
    .grid-overlay{position:fixed;inset:0;background-image:linear-gradient(rgba(145,70,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(145,70,255,0.03) 1px,transparent 1px);background-size:60px 60px;z-index:0;pointer-events:none}

    /* Click ripple */
    .click-ripple{position:fixed;border-radius:50%;border:1px solid rgba(145,70,255,0.5);transform:scale(0);animation:rippleExpand 0.8s ease-out forwards;pointer-events:none;z-index:1}
    @keyframes rippleExpand{0%{transform:scale(0);opacity:1}100%{transform:scale(1);opacity:0}}

    /* Login wrapper */
    .login-wrapper{position:relative;z-index:10;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:20px;perspective:1200px}

    /* Login card */
    .login-card{background:rgba(22,22,30,0.75);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid rgba(145,70,255,0.15);border-radius:20px;padding:44px 40px 36px;width:420px;max-width:100%;position:relative;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.4),0 0 40px rgba(145,70,255,0.05);transform-style:preserve-3d;transition:box-shadow 0.3s ease;animation:cardEntrance 0.8s cubic-bezier(0.16,1,0.3,1) both}
    @keyframes cardEntrance{0%{opacity:0;transform:translateY(40px) rotateX(10deg) scale(0.95)}100%{opacity:1;transform:translateY(0) rotateX(0) scale(1)}}

    /* Dynamic glow following cursor */
    .card-glow{position:absolute;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,rgba(145,70,255,0.3) 0%,transparent 70%);pointer-events:none;transition:opacity 0.3s;opacity:0;z-index:0;transform:translate(-50%,-50%)}
    .login-card:hover .card-glow{opacity:1}

    /* Top shimmer line */
    .login-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#9146ff,#5865f2,#9146ff,transparent);background-size:200% 100%;animation:shimmerLine 3s linear infinite}
    @keyframes shimmerLine{0%{background-position:200% 0}100%{background-position:-200% 0}}

    /* Logo */
    .login-logo{font-size:52px;text-align:center;margin-bottom:6px;cursor:pointer;user-select:none;position:relative;z-index:2;animation:logoPulse 3s ease-in-out infinite;transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1),filter 0.3s}
    .login-logo:hover{transform:scale(1.15) rotate(5deg);filter:brightness(1.2)}
    .login-logo.clicked{animation:logoSpin 0.6s cubic-bezier(0.34,1.56,0.64,1)}
    .login-logo.rainbow{animation:logoRainbow 2s linear;filter:saturate(2) brightness(1.3)}
    @keyframes logoPulse{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
    @keyframes logoSpin{0%{transform:scale(1) rotate(0)}40%{transform:scale(1.3) rotate(360deg)}70%{transform:scale(0.9) rotate(380deg)}100%{transform:scale(1) rotate(360deg)}}
    @keyframes logoRainbow{0%{filter:hue-rotate(0deg) saturate(2) brightness(1.3)}100%{filter:hue-rotate(360deg) saturate(2) brightness(1.3)}}

    /* Title */
    .login-title{text-align:center;margin-bottom:24px;position:relative;z-index:2}
    .login-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(145,70,255,0.15);border:1px solid rgba(145,70,255,0.25);color:#b388ff;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;padding:4px 14px;border-radius:20px;margin-bottom:14px}
    .login-badge::before{content:'';width:6px;height:6px;background:#b388ff;border-radius:50%;animation:badgeDot 2s ease-in-out infinite}
    @keyframes badgeDot{0%,100%{opacity:1}50%{opacity:0.3}}
    .login-title h1{color:#fff;font-size:26px;font-weight:700;margin:0 0 6px;letter-spacing:-0.3px}
    .login-title p{color:#8b8fa3;font-size:13px;margin:0}

    /* Status bar (glitch easter egg on hover) */
    .status-bar{display:flex;align-items:center;justify-content:center;gap:8px;padding:8px 16px;background:rgba(255,255,255,0.03);border-radius:8px;margin-bottom:24px;font-size:12px;color:#8b8fa3;cursor:default;position:relative;z-index:2;transition:all 0.3s}
    .status-bar:hover{background:rgba(255,255,255,0.06)}
    .status-bar.glitch{animation:glitchText 0.3s steps(2) 3}
    @keyframes glitchText{0%{transform:translate(0);filter:none}25%{transform:translate(-2px,1px);filter:hue-rotate(90deg)}50%{transform:translate(2px,-1px);filter:hue-rotate(180deg)}75%{transform:translate(-1px,-1px);filter:hue-rotate(270deg)}100%{transform:translate(0);filter:none}}
    .status-dot{width:7px;height:7px;border-radius:50%;background:#43b581;animation:statusPulse 2s ease-in-out infinite}
    @keyframes statusPulse{0%,100%{box-shadow:0 0 0 0 rgba(67,181,129,0.4)}50%{box-shadow:0 0 0 6px rgba(67,181,129,0)}}

    /* Alerts */
    .login-alert{padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:18px;animation:alertSlide 0.4s cubic-bezier(0.16,1,0.3,1);position:relative;z-index:2}
    @keyframes alertSlide{0%{opacity:0;transform:translateY(-10px)}100%{opacity:1;transform:translateY(0)}}
    .login-alert-error{background:rgba(255,77,77,0.12);border:1px solid rgba(255,77,77,0.25);color:#ff6b6b}
    .login-alert-success{background:rgba(67,181,129,0.12);border:1px solid rgba(67,181,129,0.25);color:#43b581}

    /* Form fields */
    .field{margin-bottom:18px;position:relative;z-index:2}
    .field label{display:block;font-size:12px;font-weight:600;color:#b0b3c5;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px}
    .input-wrap{position:relative;display:flex;align-items:center;transition:transform 0.2s}
    .input-wrap:focus-within{transform:translateX(2px)}
    .input-icon{position:absolute;left:14px;font-size:14px;z-index:1;transition:transform 0.3s}
    .input-wrap:focus-within .input-icon{transform:scale(1.2) rotate(-10deg)}
    .field input{width:100%;padding:12px 14px 12px 40px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:#e0e0e0;font-size:14px;outline:none;transition:all 0.3s}
    .field input:focus{border-color:#9146ff;box-shadow:0 0 0 3px rgba(145,70,255,0.15),0 0 20px rgba(145,70,255,0.1);background:rgba(255,255,255,0.07)}
    .field input::placeholder{color:#4a4d5e}
    .pw-toggle{position:absolute;right:10px;background:none;border:none;cursor:pointer;font-size:14px;padding:4px;opacity:0.5;transition:all 0.3s}
    .pw-toggle:hover{opacity:1;transform:scale(1.2)}

    /* Submit button */
    .login-submit{width:100%;padding:13px;background:linear-gradient(135deg,#9146ff 0%,#5865f2 100%);color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;transition:all 0.3s;position:relative;overflow:hidden;z-index:2;letter-spacing:0.3px}
    .login-submit:hover{transform:translateY(-2px);box-shadow:0 8px 25px rgba(145,70,255,0.35)}
    .login-submit:active{transform:translateY(0) scale(0.98)}
    .login-submit::before{content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent);transition:left 0.5s}
    .login-submit:hover::before{left:100%}

    /* Card shake on error */
    .login-card.shake{animation:cardShake 0.5s cubic-bezier(0.36,0.07,0.19,0.97)}
    @keyframes cardShake{0%,100%{transform:translateX(0)}10%,50%,90%{transform:translateX(-4px)}30%,70%{transform:translateX(4px)}20%,60%{transform:translateX(-2px)}40%,80%{transform:translateX(2px)}}

    /* Footer */
    .login-foot{text-align:center;margin-top:20px;position:relative;z-index:2}
    .login-foot a{color:#5a5d72;font-size:12px;text-decoration:none;transition:color 0.3s}
    .login-foot a:hover{color:#9146ff}
    .login-notice{text-align:center;color:#3a3d50;font-size:11px;margin-top:20px;position:relative;z-index:2}

    /* Shooting stars (easter egg: 5 rapid bg clicks) */
    .shooting-star{position:fixed;width:80px;height:1px;background:linear-gradient(90deg,rgba(145,70,255,0.8),transparent);z-index:5;animation:shootingStar 0.8s ease-out forwards;pointer-events:none}
    @keyframes shootingStar{0%{transform:translateX(0) scaleX(1);opacity:1}100%{transform:translateX(300px) scaleX(0.3);opacity:0}}

    /* Fireworks (Konami code easter egg) */
    .firework{position:fixed;width:4px;height:4px;border-radius:50%;z-index:100;pointer-events:none}
    .firework.large{width:6px;height:6px;box-shadow:0 0 6px currentColor,0 0 12px currentColor}
    .firework.trail{width:2px;height:2px;opacity:0.6}
    @keyframes fireworkBurst{0%{transform:translate(0,0) scale(1);opacity:1}60%{opacity:0.8}100%{transform:translate(var(--tx),var(--ty)) scale(0);opacity:0}}
    @keyframes fireworkBurstSlow{0%{transform:translate(0,0) scale(1.5);opacity:1}40%{opacity:1}100%{transform:translate(var(--tx),var(--ty)) scale(0);opacity:0}}

    /* Konami flash overlay */
    .konami-flash{position:fixed;inset:0;background:white;z-index:200;pointer-events:none;animation:konamiFlash 0.4s ease-out forwards}
    @keyframes konamiFlash{0%{opacity:0.7}100%{opacity:0}}

    /* Konami screen shake */
    body.konami-shake{animation:konamiShake 0.5s ease-out}
    @keyframes konamiShake{0%,100%{transform:translate(0)}10%{transform:translate(-5px,3px)}20%{transform:translate(5px,-3px)}30%{transform:translate(-3px,5px)}40%{transform:translate(3px,-5px)}50%{transform:translate(-2px,2px)}60%{transform:translate(2px,-2px)}70%{transform:translate(-1px,1px)}}

    /* Konami text reveal */
    .konami-text{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:150;pointer-events:none;font-size:0;color:#fff;font-weight:900;letter-spacing:20px;text-shadow:0 0 20px #9146ff,0 0 40px #5865f2,0 0 80px #9146ff;animation:konamiTextReveal 2.5s cubic-bezier(0.16,1,0.3,1) forwards;font-family:'Segoe UI',sans-serif}
    @keyframes konamiTextReveal{0%{font-size:0;opacity:0;letter-spacing:80px;filter:blur(10px)}15%{font-size:72px;opacity:1;letter-spacing:30px;filter:blur(0)}50%{font-size:72px;opacity:1;letter-spacing:20px}70%{font-size:72px;opacity:0.8;letter-spacing:15px}100%{font-size:80px;opacity:0;letter-spacing:5px;transform:translate(-50%,-50%) scale(1.5);filter:blur(8px)}}

    /* Konami ring shockwave */
    .konami-ring{position:fixed;border-radius:50%;border:2px solid rgba(145,70,255,0.8);z-index:120;pointer-events:none;animation:konamiRing 1.2s ease-out forwards}
    @keyframes konamiRing{0%{width:0;height:0;opacity:1;border-width:3px}100%{width:800px;height:800px;opacity:0;border-width:1px}}

    /* Matrix rain (triple-click logo easter egg) */
    #matrixCanvas{position:fixed;top:0;left:0;width:100%;height:100%;z-index:50;pointer-events:none;opacity:0;transition:opacity 0.3s}
    #matrixCanvas.active{opacity:0.7}

    /* Ghost text (rare ambient event) */
    .ghost-text{position:fixed;font-size:14px;color:rgba(145,70,255,0.08);font-family:monospace;pointer-events:none;z-index:1;animation:ghostDrift 8s ease-in-out forwards;white-space:nowrap}
    @keyframes ghostDrift{0%{opacity:0;transform:translateY(20px)}15%{opacity:1}85%{opacity:1}100%{opacity:0;transform:translateY(-40px)}}

    /* Portal effect (type 'portal' in username) */
    .portal{position:fixed;width:0;height:0;border-radius:50%;border:2px solid rgba(145,70,255,0.6);box-shadow:0 0 30px rgba(145,70,255,0.3),inset 0 0 30px rgba(88,101,242,0.2);z-index:60;pointer-events:none;animation:portalOpen 1.5s ease-out forwards}
    @keyframes portalOpen{0%{width:0;height:0;opacity:0}50%{width:200px;height:200px;opacity:1;transform:translate(-50%,-50%) rotate(0deg)}80%{width:220px;height:220px;opacity:0.8;transform:translate(-50%,-50%) rotate(180deg)}100%{width:0;height:0;opacity:0;transform:translate(-50%,-50%) rotate(360deg)}}
    .portal-particle{position:fixed;width:3px;height:3px;border-radius:50%;z-index:61;pointer-events:none}
    @keyframes portalSuck{0%{opacity:1}100%{transform:translate(var(--tx),var(--ty)) scale(0);opacity:0}}

    /* Gravity flip (secret: hold Shift+G for 2s) */
    body.gravity-flip .login-wrapper{animation:gravityFlip 2s ease-in-out}
    @keyframes gravityFlip{0%{transform:perspective(1200px) rotateX(0)}50%{transform:perspective(1200px) rotateX(180deg)}100%{transform:perspective(1200px) rotateX(360deg)}}

    /* Aurora borealis (rare ambient: 5% chance every 30s) */
    .aurora{position:fixed;top:-50%;left:0;width:100%;height:100%;z-index:0;pointer-events:none;opacity:0;animation:auroraFade 6s ease-in-out forwards}
    @keyframes auroraFade{0%{opacity:0}30%{opacity:1}70%{opacity:1}100%{opacity:0}}
    .aurora-band{position:absolute;width:200%;height:60%;filter:blur(60px);opacity:0.15;animation:auroraWave 4s ease-in-out infinite}
    .aurora-band:nth-child(1){top:10%;left:-50%;background:linear-gradient(90deg,transparent,#9146ff,#5865f2,#43b581,transparent);animation-delay:0s}
    .aurora-band:nth-child(2){top:25%;left:-30%;background:linear-gradient(90deg,transparent,#5865f2,#9d4edd,transparent);animation-delay:1s}
    .aurora-band:nth-child(3){top:5%;left:-40%;background:linear-gradient(90deg,transparent,#43b581,#9146ff,transparent);animation-delay:2s}
    @keyframes auroraWave{0%,100%{transform:translateX(-10%) skewX(-5deg)}50%{transform:translateX(10%) skewX(5deg)}}

    /* Heartbeat (click password field x3) */
    .login-card.heartbeat{animation:heartbeat 0.8s ease-in-out}
    @keyframes heartbeat{0%{box-shadow:0 20px 60px rgba(0,0,0,0.4),0 0 40px rgba(145,70,255,0.05)}15%{box-shadow:0 20px 60px rgba(0,0,0,0.4),0 0 60px rgba(255,50,50,0.2)}30%{box-shadow:0 20px 60px rgba(0,0,0,0.4),0 0 40px rgba(145,70,255,0.05)}45%{box-shadow:0 20px 60px rgba(0,0,0,0.4),0 0 60px rgba(255,50,50,0.2)}100%{box-shadow:0 20px 60px rgba(0,0,0,0.4),0 0 40px rgba(145,70,255,0.05)}}

    /* Cursor trail (hold Alt+move mouse) */
    .cursor-trail{position:fixed;width:6px;height:6px;border-radius:50%;background:rgba(145,70,255,0.6);pointer-events:none;z-index:100;animation:trailFade 0.6s ease-out forwards}
    @keyframes trailFade{0%{transform:scale(1);opacity:0.8}100%{transform:scale(0);opacity:0}}

    /* Glitch card (rare: 2% chance on hover) */
    .login-card.glitch-card{animation:cardGlitch 0.3s steps(2)}
    @keyframes cardGlitch{0%{clip-path:inset(0)}20%{clip-path:inset(20% 0 40% 0);transform:translate(-3px,0)}40%{clip-path:inset(60% 0 10% 0);transform:translate(3px,0)}60%{clip-path:inset(30% 0 30% 0);transform:translate(-2px,0)}80%{clip-path:inset(10% 0 60% 0);transform:translate(2px,0)}100%{clip-path:inset(0);transform:translate(0)}}

    /* Responsive */
    @media(max-width:480px){
      .login-card{padding:32px 24px 28px;margin:0 10px}
      .login-title h1{font-size:22px}
      .login-logo{font-size:44px}
    }
  </style>
</head>
<body>
  <div class="bg-gradient"></div>
  <div class="orb orb-1"></div>
  <div class="orb orb-2"></div>
  <div class="orb orb-3"></div>
  <div class="grid-overlay"></div>
  <canvas id="constellation"></canvas>
  <canvas id="matrixCanvas"></canvas>

  <div class="login-wrapper">
    <div class="login-card" id="loginCard">
      <div class="card-glow" id="cardGlow"></div>
      <div class="login-logo" id="loginLogo">\u{1F916}</div>
      <div class="login-title">
        <span class="login-badge">Dashboard</span>
        <h1>nephilheim Bot</h1>
        <p>Authorized access only</p>
      </div>

      <div class="status-bar" id="statusBar">
        <span class="status-dot"></span>
        <span class="status-text">Systems operational</span>
      </div>

      ${error ? '<div class="login-alert login-alert-error">\u26A0\uFE0F Invalid username or password.</div>' : ''}
      ${created ? '<div class="login-alert login-alert-success">\u2705 Account created! Please sign in.</div>' : ''}

      <form method="POST" action="/auth" id="loginForm">
        <div class="field">
          <label for="username">Username</label>
          <div class="input-wrap">
            <span class="input-icon">\u{1F464}</span>
            <input type="text" id="username" name="username" placeholder="Enter your username" required autofocus autocomplete="username">
          </div>
        </div>
        <div class="field">
          <label for="password">Password</label>
          <div class="input-wrap">
            <span class="input-icon">\u{1F512}</span>
            <input type="password" id="password" name="password" placeholder="Enter your password" required autocomplete="current-password">
            <button type="button" class="pw-toggle" onclick="togglePw()" tabindex="-1" title="Toggle password visibility">\u{1F441}\uFE0F</button>
          </div>
        </div>
        <button type="submit" class="login-submit" id="loginBtn">
          Sign In \u2192
        </button>
      </form>

      <div style="display:flex;flex-direction:column;gap:10px;margin-top:16px;position:relative;z-index:2">
        <div style="display:flex;align-items:center;gap:12px;color:#4a4d5e;font-size:12px"><div style="flex:1;height:1px;background:#2a2f3a"></div><span>or</span><div style="flex:1;height:1px;background:#2a2f3a"></div></div>
        ${DISCORD_CLIENT_ID ? '<a href="/auth/discord" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;background:#5865f2;color:#fff;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;transition:all 0.3s;text-align:center" onmouseover="this.style.background=\'#4752c4\';this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.background=\'#5865f2\';this.style.transform=\'none\'"><svg width="20" height="15" viewBox="0 0 71 55" fill="none"><path d="M60.1 4.9A58.5 58.5 0 0045.4.2a.2.2 0 00-.2.1 40.8 40.8 0 00-1.8 3.7 54 54 0 00-16.2 0A37.4 37.4 0 0025.4.3a.2.2 0 00-.2-.1A58.4 58.4 0 0010.5 5 59.5 59.5 0 00.4 44.7a.2.2 0 00.1.2 58.7 58.7 0 0017.7 9 .2.2 0 00.3-.1 42 42 0 003.6-5.9.2.2 0 00-.1-.3 38.6 38.6 0 01-5.5-2.6.2.2 0 01-.02-.36 30.4 30.4 0 001.1-.9.2.2 0 01.2 0 41.9 41.9 0 0035.6 0 .2.2 0 01.2 0l1.1.9a.2.2 0 01-.01.36 36.2 36.2 0 01-5.5 2.6.2.2 0 00-.1.3 47.1 47.1 0 003.6 5.9.2.2 0 00.3.1 58.5 58.5 0 0017.7-9 .2.2 0 00.1-.2c1.5-15.6-2.6-29.2-10.9-41.2zM23.7 36.7c-3.6 0-6.5-3.3-6.5-7.3s2.9-7.3 6.5-7.3 6.6 3.3 6.5 7.3c0 4-2.9 7.3-6.5 7.3zm24 0c-3.6 0-6.5-3.3-6.5-7.3s2.9-7.3 6.5-7.3 6.6 3.3 6.5 7.3c0 4-2.9 7.3-6.5 7.3z" fill="white"/></svg>Login with Discord</a>' : ''}
        <a href="/signup" style="display:block;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);color:#b0b3c5;border-radius:10px;font-size:14px;font-weight:500;text-decoration:none;transition:all 0.3s;text-align:center" onmouseover="this.style.borderColor='#9146ff';this.style.color='#e0e0e0'" onmouseout="this.style.borderColor='rgba(255,255,255,0.08)';this.style.color='#b0b3c5'">Create an Account</a>
      </div>

      <div class="login-foot"><a href="/privacy">Privacy Policy</a></div>
    </div>
    <div class="login-notice">Private administration panel \u2014 nephilheim Discord community bot</div>
  </div>

  <script>
    // === CONSTELLATION CANVAS ===
    (function(){
      var canvas=document.getElementById('constellation'),ctx=canvas.getContext('2d');
      var w,h,mouse={x:-1000,y:-1000},nodes=[];
      function resize(){w=canvas.width=window.innerWidth;h=canvas.height=window.innerHeight}
      resize();window.addEventListener('resize',resize);
      for(var i=0;i<80;i++){nodes.push({x:Math.random()*w,y:Math.random()*h,vx:(Math.random()-0.5)*0.5,vy:(Math.random()-0.5)*0.5,r:1+Math.random()*2,a:0.15+Math.random()*0.35})}
      document.addEventListener('mousemove',function(e){mouse.x=e.clientX;mouse.y=e.clientY});
      document.addEventListener('mouseleave',function(){mouse.x=-1000;mouse.y=-1000});
      function loop(){
        ctx.clearRect(0,0,w,h);
        for(var i=0;i<nodes.length;i++){
          var n=nodes[i];n.x+=n.vx;n.y+=n.vy;
          if(n.x<0||n.x>w)n.vx*=-1;if(n.y<0||n.y>h)n.vy*=-1;
          var dx=mouse.x-n.x,dy=mouse.y-n.y,dist=Math.sqrt(dx*dx+dy*dy);
          if(dist<200){var f=(200-dist)/200*0.02;n.vx+=dx*f*0.01;n.vy+=dy*f*0.01}
          n.vx*=0.99;n.vy*=0.99;
          var al=dist<200?n.a+(1-dist/200)*0.5:n.a,gl=dist<150;
          ctx.beginPath();ctx.arc(n.x,n.y,gl?n.r*1.5:n.r,0,Math.PI*2);ctx.fillStyle='rgba(145,70,255,'+al+')';ctx.fill();
          if(gl){ctx.beginPath();ctx.arc(n.x,n.y,n.r*4,0,Math.PI*2);ctx.fillStyle='rgba(145,70,255,'+(al*0.2)+')';ctx.fill()}
          for(var j=i+1;j<nodes.length;j++){var n2=nodes[j],dx2=n.x-n2.x,dy2=n.y-n2.y,d=Math.sqrt(dx2*dx2+dy2*dy2);if(d<150){ctx.beginPath();ctx.moveTo(n.x,n.y);ctx.lineTo(n2.x,n2.y);ctx.strokeStyle='rgba(145,70,255,'+((1-d/150)*0.15)+')';ctx.lineWidth=0.5;ctx.stroke()}}
          if(dist<200){ctx.beginPath();ctx.moveTo(n.x,n.y);ctx.lineTo(mouse.x,mouse.y);ctx.strokeStyle='rgba(145,70,255,'+((1-dist/200)*0.3)+')';ctx.lineWidth=0.8;ctx.stroke()}
        }
        requestAnimationFrame(loop);
      }
      loop();
    })();

    // === 3D TILT + GLOW ON CARD ===
    (function(){
      var card=document.getElementById('loginCard'),glow=document.getElementById('cardGlow');
      card.addEventListener('mousemove',function(e){
        var rect=card.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;
        var rx=((y-rect.height/2)/(rect.height/2))*-8,ry=((x-rect.width/2)/(rect.width/2))*8;
        card.style.transform='perspective(1000px) rotateX('+rx+'deg) rotateY('+ry+'deg)';
        glow.style.left=x+'px';glow.style.top=y+'px';
      });
      card.addEventListener('mouseleave',function(){card.style.transform='perspective(1000px) rotateX(0) rotateY(0)';});
    })();

    // === CLICK RIPPLE ===
    document.addEventListener('click',function(e){
      var r=document.createElement('div');r.className='click-ripple';
      r.style.width=r.style.height='200px';r.style.left=(e.clientX-100)+'px';r.style.top=(e.clientY-100)+'px';
      document.body.appendChild(r);r.addEventListener('animationend',function(){r.remove()});
    });

    // === LOGO CLICK (spin) + TRIPLE CLICK (matrix rain) ===
    (function(){
      var logo=document.getElementById('loginLogo'),clicks=0,timer=null;
      logo.addEventListener('click',function(){
        clicks++;logo.classList.remove('clicked');void logo.offsetWidth;logo.classList.add('clicked');
        setTimeout(function(){logo.classList.remove('clicked')},600);
        clearTimeout(timer);
        timer=setTimeout(function(){if(clicks>=3)startMatrixRain();clicks=0},400);
      });
    })();

    // === STATUS BAR GLITCH (easter egg) ===
    (function(){
      var sb=document.getElementById('statusBar');
      sb.addEventListener('mouseenter',function(){sb.classList.add('glitch');setTimeout(function(){sb.classList.remove('glitch')},900)});
    })();

    // === MATRIX RAIN (easter egg) ===
    function startMatrixRain(){
      var mc=document.getElementById('matrixCanvas'),mctx=mc.getContext('2d');
      mc.width=window.innerWidth;mc.height=window.innerHeight;mc.classList.add('active');
      var chars='NEPHILHEIM01\u30A2\u30A4\u30A6\u30A8\u30AA\u30AB\u30AD\u30AF\u30B1\u30B3\u30B5\u30B7\u30B9\u30BB\u30BD>',fs=14,cols=Math.floor(mc.width/fs),drops=Array(cols).fill(1);
      var iv=setInterval(function(){
        mctx.fillStyle='rgba(0,0,0,0.05)';mctx.fillRect(0,0,mc.width,mc.height);
        mctx.fillStyle='#9146ff';mctx.font=fs+'px monospace';
        for(var i=0;i<drops.length;i++){var t=chars[Math.floor(Math.random()*chars.length)];mctx.fillText(t,i*fs,drops[i]*fs);if(drops[i]*fs>mc.height&&Math.random()>0.975)drops[i]=0;drops[i]++}
      },40);
      setTimeout(function(){clearInterval(iv);mc.classList.remove('active');setTimeout(function(){mctx.clearRect(0,0,mc.width,mc.height)},300)},3000);
    }

    // === KONAMI CODE (easter egg: EPIC fireworks) ===
    (function(){
      var code=[38,38,40,40,37,39,37,39,66,65],idx=0,progress=null;
      // Show subtle progress hint
      document.addEventListener('keydown',function(e){
        if(e.keyCode===code[idx]){
          idx++;
          if(!progress){progress=document.createElement('div');progress.style.cssText='position:fixed;bottom:10px;left:50%;transform:translateX(-50%);z-index:200;font-size:10px;color:rgba(145,70,255,0.3);font-family:monospace;pointer-events:none;transition:opacity 0.3s';document.body.appendChild(progress)}
          progress.textContent='\u2588'.repeat(idx)+'\u2591'.repeat(10-idx);progress.style.opacity='1';
          if(idx===code.length){idx=0;progress.style.opacity='0';setTimeout(function(){if(progress){progress.remove();progress=null}},300);launchEpicFireworks()}
        }else{idx=0;if(progress){progress.style.opacity='0'}}
      });
    })();

    function launchEpicFireworks(){
      var W=window.innerWidth,H=window.innerHeight;
      var colors=['#9146ff','#5865f2','#ff6b6b','#43b581','#faa61a','#b388ff','#ff69b4','#00d4ff','#ff4500','#ffd700'];

      // Phase 1: Screen flash + shake
      var flash=document.createElement('div');flash.className='konami-flash';document.body.appendChild(flash);setTimeout(function(){flash.remove()},400);
      document.body.classList.add('konami-shake');setTimeout(function(){document.body.classList.remove('konami-shake')},500);

      // Phase 2: Central shockwave ring
      var ring=document.createElement('div');ring.className='konami-ring';ring.style.left=W/2+'px';ring.style.top=H/2+'px';ring.style.marginLeft='-0px';ring.style.marginTop='-0px';document.body.appendChild(ring);setTimeout(function(){ring.remove()},1200);

      // Phase 3: "KONAMI" text reveal
      setTimeout(function(){
        var txt=document.createElement('div');txt.className='konami-text';txt.textContent='KONAMI';document.body.appendChild(txt);setTimeout(function(){txt.remove()},2500);
      },200);

      // Phase 4: Massive firework waves (12 bursts over 4 seconds)
      for(var wave=0;wave<12;wave++){(function(w){setTimeout(function(){
        var cx=W*0.15+Math.random()*W*0.7,cy=H*0.1+Math.random()*H*0.5;

        // Central ring at burst point
        var r=document.createElement('div');r.className='konami-ring';r.style.left=cx+'px';r.style.top=cy+'px';r.style.borderColor=colors[w%colors.length]+'cc';
        document.body.appendChild(r);setTimeout(function(){r.remove()},1200);

        // Main burst: 40 large particles
        for(var i=0;i<40;i++){
          var s=document.createElement('div');s.className='firework large';
          var angle=(Math.PI*2/40)*i+Math.random()*0.2,dist=80+Math.random()*120;
          var col=colors[Math.floor(Math.random()*colors.length)];
          s.style.left=cx+'px';s.style.top=cy+'px';s.style.background=col;s.style.color=col;
          s.style.setProperty('--tx',Math.cos(angle)*dist+'px');s.style.setProperty('--ty',Math.sin(angle)*dist+'px');
          s.style.animation='fireworkBurstSlow '+(0.8+Math.random()*0.6)+'s ease-out forwards';
          document.body.appendChild(s);setTimeout(function(){s.remove()},1400);
        }

        // Trail particles: 20 smaller sparks with delay
        for(var t=0;t<20;t++){(function(t){setTimeout(function(){
          var ts=document.createElement('div');ts.className='firework trail';
          var ta=(Math.PI*2/20)*t+Math.random()*0.5,td=40+Math.random()*60;
          ts.style.left=cx+'px';ts.style.top=cy+'px';ts.style.background=colors[Math.floor(Math.random()*colors.length)];
          ts.style.setProperty('--tx',Math.cos(ta)*td+'px');ts.style.setProperty('--ty',Math.sin(ta)*td+'px');
          ts.style.animation='fireworkBurst 0.5s ease-out forwards';
          document.body.appendChild(ts);setTimeout(function(){ts.remove()},500);
        },100+t*15)})(t)}

      },w<3?w*300:800+w*350)})(wave)}

      // Phase 5: Grand finale — golden rain after 4.5s
      setTimeout(function(){
        // Second flash
        var f2=document.createElement('div');f2.className='konami-flash';f2.style.background='rgba(250,166,26,0.3)';document.body.appendChild(f2);setTimeout(function(){f2.remove()},400);
        document.body.classList.add('konami-shake');setTimeout(function(){document.body.classList.remove('konami-shake')},500);

        // Golden cascade from top
        for(var g=0;g<80;g++){(function(g){setTimeout(function(){
          var s=document.createElement('div');s.className='firework large';
          s.style.left=Math.random()*W+'px';s.style.top='-10px';
          s.style.background=Math.random()>0.3?'#ffd700':'#faa61a';s.style.color='#ffd700';
          s.style.setProperty('--tx',(Math.random()-0.5)*100+'px');s.style.setProperty('--ty',(H*0.5+Math.random()*H*0.5)+'px');
          s.style.animation='fireworkBurstSlow '+(1+Math.random()*1)+'s ease-in forwards';
          document.body.appendChild(s);setTimeout(function(){s.remove()},2000);
        },g*25)})(g)}
      },4500);

      // Phase 6: Final triple shockwave at 5.5s
      setTimeout(function(){
        for(var r=0;r<3;r++){(function(r){setTimeout(function(){
          var ring=document.createElement('div');ring.className='konami-ring';
          ring.style.left=W/2+'px';ring.style.top=H/2+'px';
          ring.style.borderColor=['#ffd700','#9146ff','#ff6b6b'][r];
          document.body.appendChild(ring);setTimeout(function(){ring.remove()},1200);
        },r*200)})(r)}
      },5500);
    }

    // === SHOOTING STARS (easter egg: 5 rapid background clicks) ===
    (function(){
      var bgClicks=0,bgTimer=null;
      document.addEventListener('click',function(e){
        if(e.target===document.body||e.target.classList.contains('bg-gradient')||e.target.classList.contains('grid-overlay')||e.target.tagName==='CANVAS'){
          bgClicks++;clearTimeout(bgTimer);bgTimer=setTimeout(function(){bgClicks=0},1200);
          if(bgClicks>=5){bgClicks=0;for(var i=0;i<6;i++){(function(i){setTimeout(function(){
            var star=document.createElement('div');star.className='shooting-star';
            star.style.left=Math.random()*window.innerWidth*0.5+'px';star.style.top=Math.random()*window.innerHeight*0.5+'px';
            star.style.transform='rotate('+(Math.random()*30-15)+'deg)';document.body.appendChild(star);setTimeout(function(){star.remove()},800)
          },i*150)})(i)}}
        }
      });
    })();

    // === ERROR SHAKE ===
    ${error ? "(function(){var c=document.getElementById('loginCard');c.classList.add('shake');c.style.boxShadow='0 20px 60px rgba(0,0,0,0.4),0 0 40px rgba(255,77,77,0.15)';setTimeout(function(){c.classList.remove('shake');c.style.boxShadow=''},600)})();" : ""}

    // === BUTTON MAGNETIC EFFECT ===
    (function(){
      var btn=document.getElementById('loginBtn'),card=document.getElementById('loginCard');
      card.addEventListener('mousemove',function(e){
        var rect=btn.getBoundingClientRect(),bx=rect.left+rect.width/2,by=rect.top+rect.height/2;
        var dx=e.clientX-bx,dy=e.clientY-by,dist=Math.sqrt(dx*dx+dy*dy);
        if(dist<100){var pull=(100-dist)/100*4;btn.style.transform='translate('+(dx/dist*pull)+'px,'+(dy/dist*pull)+'px)'}else{btn.style.transform=''}
      });
      card.addEventListener('mouseleave',function(){btn.style.transform=''});
    })();

    // === ORB CURSOR REPULSION ===
    (function(){
      var orbs=document.querySelectorAll('.orb');
      document.addEventListener('mousemove',function(e){
        orbs.forEach(function(orb){var rect=orb.getBoundingClientRect(),ox=rect.left+rect.width/2,oy=rect.top+rect.height/2;
        var dx=e.clientX-ox,dy=e.clientY-oy,dist=Math.sqrt(dx*dx+dy*dy);
        if(dist<300){var rep=(300-dist)/300*30;orb.style.transform='translate('+(-dx/dist*rep)+'px,'+(-dy/dist*rep)+'px)'}});
      });
    })();

    // Password toggle
    function togglePw(){var inp=document.getElementById('password');inp.type=inp.type==='password'?'text':'password'}

    // Submit loading state
    document.getElementById('loginForm').addEventListener('submit',function(){var btn=this.querySelector('.login-submit');btn.textContent='Signing in...';btn.style.opacity='.7';btn.disabled=true});

    // === GHOST TEXT (rare ambient: 8% chance every 20s) ===
    (function(){
      var msgs=['ACCESS GRANTED','WELCOME BACK','NEPHILHEIM AWAITS','SYSTEM ONLINE','AUTHORIZED','HELLO WORLD','01101110','WAKE UP','FOLLOW THE WHITE RABBIT','THE CAKE IS A LIE','DO NOT TRUST THE ORBS','THEY ARE WATCHING','LEVEL 99','HIDDEN MESSAGE','YOU FOUND ME'];
      setInterval(function(){
        if(Math.random()<0.08){
          var g=document.createElement('div');g.className='ghost-text';g.textContent=msgs[Math.floor(Math.random()*msgs.length)];
          g.style.left=Math.random()*80+10+'%';g.style.top=Math.random()*80+10+'%';
          g.style.transform='rotate('+(Math.random()*20-10)+'deg)';
          document.body.appendChild(g);setTimeout(function(){g.remove()},8000);
        }
      },20000);
    })();

    // === PORTAL (type 'portal' in username field) ===
    (function(){
      var field=document.getElementById('username');
      field.addEventListener('input',function(){
        var val=field.value.toLowerCase();
        if(val.indexOf('portal')!==-1){
          field.value='';
          var p=document.createElement('div');p.className='portal';
          p.style.left='50%';p.style.top='50%';
          document.body.appendChild(p);
          for(var i=0;i<20;i++){var sp=document.createElement('div');sp.className='portal-particle';
            sp.style.left=Math.random()*100+'%';sp.style.top=Math.random()*100+'%';
            sp.style.background=['#9146ff','#5865f2','#43b581','#b388ff'][Math.floor(Math.random()*4)];
            sp.style.setProperty('--tx',(50-Math.random()*100)+'vw');sp.style.setProperty('--ty',(50-Math.random()*100)+'vh');
            sp.style.animation='portalSuck 1s ease-in '+(Math.random()*0.5)+'s forwards';
            document.body.appendChild(sp);setTimeout(function(){sp.remove()},1500)}
          setTimeout(function(){p.remove()},1500);
        }
      });
    })();

    // === GRAVITY FLIP (hold Shift+G for 2 seconds) ===
    (function(){
      var held=false,timer=null;
      document.addEventListener('keydown',function(e){
        if(e.shiftKey&&e.key==='G'&&!held){held=true;timer=setTimeout(function(){document.body.classList.add('gravity-flip');setTimeout(function(){document.body.classList.remove('gravity-flip')},2000)},2000)}
      });
      document.addEventListener('keyup',function(e){if(e.key==='G'){held=false;clearTimeout(timer)}});
    })();

    // === AURORA BOREALIS (rare: 5% chance every 30s) ===
    (function(){
      setInterval(function(){
        if(Math.random()<0.05){
          var a=document.createElement('div');a.className='aurora';
          for(var i=0;i<3;i++){var b=document.createElement('div');b.className='aurora-band';a.appendChild(b)}
          document.body.appendChild(a);setTimeout(function(){a.remove()},6000);
        }
      },30000);
    })();

    // === PASSWORD FIELD HEARTBEAT (3 clicks on password field) ===
    (function(){
      var pw=document.getElementById('password'),clicks=0,timer;
      pw.addEventListener('click',function(){
        clicks++;clearTimeout(timer);timer=setTimeout(function(){clicks=0},600);
        if(clicks>=3){clicks=0;var card=document.getElementById('loginCard');card.classList.add('heartbeat');setTimeout(function(){card.classList.remove('heartbeat')},800)}
      });
    })();

    // === ALT+MOUSE = CURSOR TRAIL ===
    (function(){
      document.addEventListener('mousemove',function(e){
        if(e.altKey){
          var t=document.createElement('div');t.className='cursor-trail';t.style.left=e.clientX-3+'px';t.style.top=e.clientY-3+'px';
          t.style.background=['rgba(145,70,255,0.7)','rgba(88,101,242,0.7)','rgba(67,181,129,0.7)','rgba(255,107,107,0.7)'][Math.floor(Math.random()*4)];
          document.body.appendChild(t);setTimeout(function(){t.remove()},600);
        }
      });
    })();

    // === RARE GLITCH ON CARD HOVER (2% chance) ===
    (function(){
      var card=document.getElementById('loginCard');
      card.addEventListener('mouseenter',function(){
        if(Math.random()<0.02){card.classList.add('glitch-card');setTimeout(function(){card.classList.remove('glitch-card')},300)}
      });
    })();

    // === TYPE 'nephilheim' IN PASSWORD = RAINBOW LOGO ===
    (function(){
      var pw=document.getElementById('password');
      pw.addEventListener('input',function(){
        if(pw.value.toLowerCase().indexOf('nephilheim')!==-1){
          var logo=document.getElementById('loginLogo');
          logo.classList.add('rainbow');setTimeout(function(){logo.classList.remove('rainbow')},2000);
        }
      });
    })();

    // === AMBIENT SHOOTING STAR (rare: 10% chance every 45s) ===
    (function(){
      setInterval(function(){
        if(Math.random()<0.1){
          var star=document.createElement('div');star.className='shooting-star';
          star.style.left=Math.random()*60+'%';star.style.top=Math.random()*40+'%';
          star.style.transform='rotate('+(Math.random()*30-15)+'deg)';
          document.body.appendChild(star);setTimeout(function(){star.remove()},800);
        }
      },45000);
    })();

    // === DOUBLE-CLICK PRIVACY LINK = FLIP TEXT ===
    (function(){
      var link=document.querySelector('.login-foot a');
      link.addEventListener('dblclick',function(e){
        e.preventDefault();link.style.transition='transform 0.4s';link.style.transform='scaleY(-1)';
        setTimeout(function(){link.style.transform=''},800);
      });
    })();

    // === IDLE DETECTION: LOGO SLEEPS AFTER 60s ===
    (function(){
      var logo=document.getElementById('loginLogo'),idle,sleeping=false;
      function wake(){if(sleeping){sleeping=false;logo.textContent='\u{1F916}';logo.style.animation='logoPulse 3s ease-in-out infinite'}clearTimeout(idle);idle=setTimeout(goSleep,60000)}
      function goSleep(){sleeping=true;logo.textContent='\u{1F634}';logo.style.animation='none'}
      document.addEventListener('mousemove',wake);document.addEventListener('keydown',wake);wake();
    })();

    // === TYPE 'hello' IN USERNAME = WAVING HAND APPEARS ===
    (function(){
      var field=document.getElementById('username');
      field.addEventListener('input',function(){
        if(field.value.toLowerCase()==='hello'){
          var wave=document.createElement('div');
          wave.textContent='\u{1F44B}';wave.style.cssText='position:fixed;font-size:60px;z-index:200;pointer-events:none;top:50%;left:50%;transform:translate(-50%,-50%);animation:waveHand 1.5s ease-out forwards';
          var s=document.createElement('style');s.textContent='@keyframes waveHand{0%{transform:translate(-50%,-50%) rotate(0) scale(0)}30%{transform:translate(-50%,-50%) rotate(20deg) scale(1.2)}50%{transform:translate(-50%,-50%) rotate(-15deg) scale(1)}70%{transform:translate(-50%,-50%) rotate(20deg) scale(1)}100%{transform:translate(-50%,-50%) rotate(0) scale(0);opacity:0}}';
          document.head.appendChild(s);document.body.appendChild(wave);setTimeout(function(){wave.remove()},1500);
        }
      });
    })();

    // === RANDOM ORBS COLOR SHIFT (rare 3% every 25s) ===
    (function(){
      var colors=[['rgba(255,107,107,0.15)','rgba(255,107,107,0.12)','rgba(255,107,107,0.1)'],['rgba(67,181,129,0.15)','rgba(67,181,129,0.12)','rgba(67,181,129,0.1)'],['rgba(250,166,26,0.15)','rgba(250,166,26,0.12)','rgba(250,166,26,0.1)']];
      setInterval(function(){
        if(Math.random()<0.03){
          var c=colors[Math.floor(Math.random()*colors.length)];
          document.querySelectorAll('.orb').forEach(function(orb,i){orb.style.transition='background 3s';orb.style.background=c[i]||c[0]});
          setTimeout(function(){document.querySelectorAll('.orb').forEach(function(orb,i){orb.style.background=''})},6000);
        }
      },25000);
    })();
  </script>
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
    body{background:#08080c;color:#e0e0e0;font-family:'Segoe UI',Tahoma,Geneva,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center}
    .bg-gradient{position:fixed;inset:0;background:radial-gradient(ellipse at 20% 50%,rgba(145,70,255,0.12) 0%,transparent 60%),radial-gradient(ellipse at 80% 20%,rgba(88,101,242,0.1) 0%,transparent 60%),#08080c;z-index:0}
    .signup-wrapper{position:relative;z-index:10;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:20px}
    .signup-card{background:rgba(22,22,30,0.85);backdrop-filter:blur(24px);border:1px solid rgba(145,70,255,0.15);border-radius:20px;padding:40px;width:420px;max-width:100%;position:relative;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.4);animation:cardEntrance 0.8s cubic-bezier(0.16,1,0.3,1) both}
    @keyframes cardEntrance{0%{opacity:0;transform:translateY(40px) scale(0.95)}100%{opacity:1;transform:translateY(0) scale(1)}}
    .signup-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#9146ff,#5865f2,#9146ff,transparent);background-size:200% 100%;animation:shimmerLine 3s linear infinite}
    @keyframes shimmerLine{0%{background-position:200% 0}100%{background-position:-200% 0}}
    .signup-logo{font-size:44px;text-align:center;margin-bottom:6px}
    .signup-title{text-align:center;margin-bottom:24px}
    .signup-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(145,70,255,0.15);border:1px solid rgba(145,70,255,0.25);color:#b388ff;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;padding:4px 14px;border-radius:20px;margin-bottom:14px}
    .signup-title h1{color:#fff;font-size:24px;font-weight:700;margin:0 0 6px}
    .signup-title p{color:#8b8fa3;font-size:13px;margin:0}
    .alert{padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:18px;animation:alertSlide 0.4s cubic-bezier(0.16,1,0.3,1)}
    @keyframes alertSlide{0%{opacity:0;transform:translateY(-10px)}100%{opacity:1;transform:translateY(0)}}
    .alert-error{background:rgba(255,77,77,0.12);border:1px solid rgba(255,77,77,0.25);color:#ff6b6b}
    .alert-info{background:rgba(88,101,242,0.12);border:1px solid rgba(88,101,242,0.25);color:#8b8fa3}
    .field{margin-bottom:16px}
    .field label{display:block;font-size:12px;font-weight:600;color:#b0b3c5;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px}
    .field input{width:100%;padding:12px 14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:#e0e0e0;font-size:14px;outline:none;transition:all 0.3s}
    .field input:focus{border-color:#9146ff;box-shadow:0 0 0 3px rgba(145,70,255,0.15)}
    .field input::placeholder{color:#4a4d5e}
    .signup-submit{width:100%;padding:13px;background:linear-gradient(135deg,#9146ff 0%,#5865f2 100%);color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;transition:all 0.3s;margin-top:4px}
    .signup-submit:hover{transform:translateY(-2px);box-shadow:0 8px 25px rgba(145,70,255,0.35)}
    .signup-foot{text-align:center;margin-top:20px}
    .signup-foot a{color:#9146ff;font-size:13px;text-decoration:none;transition:color 0.3s}
    .signup-foot a:hover{color:#b388ff}
    .tier-notice{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:10px 14px;font-size:12px;color:#8b8fa3;margin-bottom:18px;text-align:center}
    .tier-notice strong{color:#b388ff}
    @media(max-width:480px){.signup-card{padding:28px 20px;margin:0 10px}}
  </style>
</head>
<body>
  <div class="bg-gradient"></div>
  <div class="signup-wrapper">
    <div class="signup-card">
      <div class="signup-logo">\u{1F4DD}</div>
      <div class="signup-title">
        <span class="signup-badge">New Account</span>
        <h1>Create Account</h1>
        <p>Join the nephilheim dashboard</p>
      </div>

      ${errorMsg ? '<div class="alert alert-error">\u26A0\uFE0F ' + errorMsg + '</div>' : ''}

      <div class="tier-notice">\u{1F512} New accounts start with <strong>Viewer</strong> access. An admin can upgrade your permissions.</div>

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
        <button type="submit" class="signup-submit" id="signupBtn">Create Account \u2192</button>
      </form>

      <div class="signup-foot">
        <a href="/login">\u2190 Back to Sign In</a>
      </div>
    </div>
  </div>
  <script>
    document.getElementById('signupForm').addEventListener('submit',function(){var btn=document.getElementById('signupBtn');btn.textContent='Creating...';btn.style.opacity='.7';btn.disabled=true});
  </script>
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
<script>setTimeout(()=>location.reload(),3000);</script></body></html>`);
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
      <button class="server-card" onclick="selectServer('${g.id}')">
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
    body{background:#08080c;color:#e0e0e0;font-family:'Segoe UI',Tahoma,Geneva,sans-serif;min-height:100vh;overflow:hidden;position:relative}

    /* Canvas constellation */
    #constellation{position:fixed;top:0;left:0;width:100%;height:100%;z-index:0}
    .bg-gradient{position:fixed;inset:0;background:radial-gradient(ellipse at 20% 50%,rgba(145,70,255,0.12) 0%,transparent 60%),radial-gradient(ellipse at 80% 20%,rgba(88,101,242,0.1) 0%,transparent 60%),radial-gradient(ellipse at 50% 80%,rgba(157,78,221,0.08) 0%,transparent 60%),#08080c;z-index:0}
    .orb{position:fixed;border-radius:50%;filter:blur(80px);z-index:0;pointer-events:none;transition:transform 0.4s ease-out}
    .orb-1{width:400px;height:400px;background:rgba(145,70,255,0.15);top:-100px;left:-100px;animation:orbFloat 18s ease-in-out infinite}
    .orb-2{width:300px;height:300px;background:rgba(88,101,242,0.12);bottom:-80px;right:-80px;animation:orbFloat 22s ease-in-out infinite reverse}
    .orb-3{width:200px;height:200px;background:rgba(157,78,221,0.1);top:50%;left:60%;animation:orbFloat 25s ease-in-out infinite 3s}
    @keyframes orbFloat{0%,100%{transform:translate(0,0) scale(1)}25%{transform:translate(40px,-30px) scale(1.05)}50%{transform:translate(-20px,40px) scale(0.95)}75%{transform:translate(30px,20px) scale(1.02)}}
    .grid-overlay{position:fixed;inset:0;background-image:linear-gradient(rgba(145,70,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(145,70,255,0.03) 1px,transparent 1px);background-size:60px 60px;z-index:0;pointer-events:none}

    /* Click ripple */
    .click-ripple{position:fixed;border-radius:50%;border:1px solid rgba(145,70,255,0.5);transform:scale(0);animation:rippleExpand 0.8s ease-out forwards;pointer-events:none;z-index:1}
    @keyframes rippleExpand{0%{transform:scale(0);opacity:1}100%{transform:scale(1);opacity:0}}

    /* Wrapper */
    .select-wrapper{position:relative;z-index:10;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:20px;perspective:1200px}

    /* Select box glassmorphism */
    .select-box{background:rgba(22,22,30,0.75);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid rgba(145,70,255,0.15);border-radius:20px;padding:40px;width:500px;max-width:100%;position:relative;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.4),0 0 40px rgba(145,70,255,0.05);animation:cardEntrance 0.8s cubic-bezier(0.16,1,0.3,1) both}
    @keyframes cardEntrance{0%{opacity:0;transform:translateY(40px) scale(0.95)}100%{opacity:1;transform:translateY(0) scale(1)}}
    .select-box::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#9146ff,#5865f2,#9146ff,transparent);background-size:200% 100%;animation:shimmerLine 3s linear infinite}
    @keyframes shimmerLine{0%{background-position:200% 0}100%{background-position:-200% 0}}

    /* Header */
    .select-header{text-align:center;margin-bottom:24px}
    .select-icon{font-size:52px;display:block;margin-bottom:8px;cursor:pointer;transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1);animation:iconFloat 3s ease-in-out infinite}
    .select-icon:hover{transform:scale(1.15) rotate(-5deg)}
    @keyframes iconFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
    .select-header h2{color:#fff;font-size:24px;font-weight:700;margin:0 0 6px}
    .select-header p{color:#8b8fa3;font-size:13px;margin:0}

    /* User badge (triple-click = confetti easter egg) */
    .user-badge{text-align:center;margin-bottom:20px;padding:10px 16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:10px;font-size:13px;transition:all 0.3s;cursor:default}
    .user-badge:hover{background:rgba(145,70,255,0.08);border-color:rgba(145,70,255,0.2)}
    .user-badge .tier{font-weight:600;text-transform:uppercase;font-size:11px;letter-spacing:0.5px}

    /* Server list */
    .server-list{display:flex;flex-direction:column;gap:8px;max-height:400px;overflow-y:auto;padding-right:4px}
    .server-list::-webkit-scrollbar{width:6px}
    .server-list::-webkit-scrollbar-thumb{background:#3a3a42;border-radius:3px}
    .server-list::-webkit-scrollbar-track{background:transparent}

    /* Server cards with 3D tilt */
    .server-card{display:flex;align-items:center;gap:14px;width:100%;padding:14px 16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:12px;cursor:pointer;color:#e0e0e0;font-family:inherit;font-size:14px;text-align:left;position:relative;overflow:hidden;transition:all 0.3s cubic-bezier(0.25,0.46,0.45,0.94);transform-style:preserve-3d;opacity:0;animation:cardSlideIn 0.5s cubic-bezier(0.16,1,0.3,1) forwards}
    @keyframes cardSlideIn{0%{opacity:0;transform:translateX(-20px) scale(0.95)}100%{opacity:1;transform:translateX(0) scale(1)}}
    .server-card::before{content:'';position:absolute;top:0;left:0;width:100%;height:100%;background:radial-gradient(circle at var(--mx,50%) var(--my,50%),rgba(145,70,255,0.12) 0%,transparent 60%);opacity:0;transition:opacity 0.3s;pointer-events:none}
    .server-card:hover::before{opacity:1}
    .server-card:hover{background:rgba(145,70,255,0.08);border-color:rgba(145,70,255,0.3);transform:translateY(-2px) scale(1.01);box-shadow:0 8px 25px rgba(0,0,0,0.3),0 0 20px rgba(145,70,255,0.08)}

    /* Card click animation */
    .server-card.selecting{animation:cardSelect 0.4s ease-out forwards;pointer-events:none}
    @keyframes cardSelect{0%{transform:scale(1);box-shadow:0 0 0 rgba(145,70,255,0)}50%{transform:scale(1.03);box-shadow:0 0 30px rgba(145,70,255,0.3);border-color:rgba(145,70,255,0.6)}100%{transform:scale(0.97);opacity:0.7}}

    /* Server icon */
    .server-icon{width:48px;height:48px;border-radius:50%;background:rgba(145,70,255,0.1);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;transition:all 0.3s;border:2px solid transparent}
    .server-card:hover .server-icon{border-color:rgba(145,70,255,0.4);box-shadow:0 0 15px rgba(145,70,255,0.2);transform:rotate(5deg) scale(1.05)}
    .server-icon img{width:100%;height:100%;object-fit:cover}
    .server-icon span{font-size:14px;font-weight:700;color:#9146ff}
    .server-info{flex:1;min-width:0}
    .server-name{font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .server-meta{font-size:12px;color:#8b8fa3;margin-top:2px}
    .server-arrow{color:#8b8fa3;font-size:18px;flex-shrink:0;transition:all 0.3s}
    .server-card:hover .server-arrow{transform:translateX(4px);color:#9146ff}

    /* Logout link */
    .logout-link{display:block;text-align:center;margin-top:20px;color:#8b8fa3;font-size:13px;text-decoration:none;transition:all 0.3s}
    .logout-link:hover{color:#ff6b6b;transform:translateX(-3px)}
    .no-servers{text-align:center;padding:40px 20px;color:#72767d}

    /* Confetti (easter egg) */
    .confetti-piece{position:fixed;width:8px;height:8px;z-index:100;pointer-events:none;animation:confettiFall var(--duration) ease-out forwards}
    @keyframes confettiFall{0%{transform:translate(0,0) rotate(0deg) scale(1);opacity:1}100%{transform:translate(var(--tx),var(--ty)) rotate(var(--rot)) scale(0.5);opacity:0}}

    /* Ghost text (server page) */
    .ghost-text{position:fixed;font-size:14px;color:rgba(145,70,255,0.08);font-family:monospace;pointer-events:none;z-index:1;animation:ghostDrift 8s ease-in-out forwards;white-space:nowrap}
    @keyframes ghostDrift{0%{opacity:0;transform:translateY(20px)}15%{opacity:1}85%{opacity:1}100%{opacity:0;transform:translateY(-40px)}}

    /* Cursor trail */
    .cursor-trail{position:fixed;width:6px;height:6px;border-radius:50%;pointer-events:none;z-index:100;animation:trailFade 0.6s ease-out forwards}
    @keyframes trailFade{0%{transform:scale(1);opacity:0.8}100%{transform:scale(0);opacity:0}}

    /* Aurora (server page) */
    .aurora{position:fixed;top:-50%;left:0;width:100%;height:100%;z-index:0;pointer-events:none;opacity:0;animation:auroraFade 6s ease-in-out forwards}
    @keyframes auroraFade{0%{opacity:0}30%{opacity:1}70%{opacity:1}100%{opacity:0}}
    .aurora-band{position:absolute;width:200%;height:60%;filter:blur(60px);opacity:0.15;animation:auroraWave 4s ease-in-out infinite}
    .aurora-band:nth-child(1){top:10%;left:-50%;background:linear-gradient(90deg,transparent,#9146ff,#5865f2,#43b581,transparent)}
    .aurora-band:nth-child(2){top:25%;left:-30%;background:linear-gradient(90deg,transparent,#5865f2,#9d4edd,transparent);animation-delay:1s}
    .aurora-band:nth-child(3){top:5%;left:-40%;background:linear-gradient(90deg,transparent,#43b581,#9146ff,transparent);animation-delay:2s}
    @keyframes auroraWave{0%,100%{transform:translateX(-10%) skewX(-5deg)}50%{transform:translateX(10%) skewX(5deg)}}

    /* Server card glow pulse (rare) */
    .server-card.glow-pulse{animation:serverGlowPulse 1s ease-in-out}
    @keyframes serverGlowPulse{0%{box-shadow:0 0 0 rgba(145,70,255,0)}50%{box-shadow:0 0 25px rgba(145,70,255,0.3),0 0 50px rgba(145,70,255,0.1)}100%{box-shadow:0 0 0 rgba(145,70,255,0)}}

    /* Shooting star (server page) */
    .shooting-star{position:fixed;width:80px;height:1px;background:linear-gradient(90deg,rgba(145,70,255,0.8),transparent);z-index:5;animation:shootingStar 0.8s ease-out forwards;pointer-events:none}
    @keyframes shootingStar{0%{transform:translateX(0) scaleX(1);opacity:1}100%{transform:translateX(300px) scaleX(0.3);opacity:0}}

    /* Hover counter badge */
    .hover-count{position:fixed;bottom:20px;right:20px;background:rgba(145,70,255,0.1);border:1px solid rgba(145,70,255,0.2);border-radius:8px;padding:6px 12px;font-size:11px;color:rgba(145,70,255,0.5);z-index:200;opacity:0;transition:opacity 0.5s;pointer-events:none;font-family:monospace}

    @media(max-width:520px){.select-box{padding:28px 20px}.select-header h2{font-size:20px}}
  </style>
</head>
<body>
  <div class="bg-gradient"></div>
  <div class="orb orb-1"></div>
  <div class="orb orb-2"></div>
  <div class="orb orb-3"></div>
  <div class="grid-overlay"></div>
  <canvas id="constellation"></canvas>

  <div class="select-wrapper">
    <div class="select-box">
      <div class="select-header">
        <span class="select-icon" id="selectIcon">\u{1F5A5}\uFE0F</span>
        <h2>Select a Server</h2>
        <p>Choose which server you want to manage</p>
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

  <script>
    // === CONSTELLATION CANVAS ===
    (function(){
      var canvas=document.getElementById('constellation'),ctx=canvas.getContext('2d');
      var w,h,mouse={x:-1000,y:-1000},nodes=[];
      function resize(){w=canvas.width=window.innerWidth;h=canvas.height=window.innerHeight}
      resize();window.addEventListener('resize',resize);
      for(var i=0;i<80;i++){nodes.push({x:Math.random()*w,y:Math.random()*h,vx:(Math.random()-0.5)*0.5,vy:(Math.random()-0.5)*0.5,r:1+Math.random()*2,a:0.15+Math.random()*0.35})}
      document.addEventListener('mousemove',function(e){mouse.x=e.clientX;mouse.y=e.clientY});
      document.addEventListener('mouseleave',function(){mouse.x=-1000;mouse.y=-1000});
      function loop(){
        ctx.clearRect(0,0,w,h);
        for(var i=0;i<nodes.length;i++){
          var n=nodes[i];n.x+=n.vx;n.y+=n.vy;
          if(n.x<0||n.x>w)n.vx*=-1;if(n.y<0||n.y>h)n.vy*=-1;
          var dx=mouse.x-n.x,dy=mouse.y-n.y,dist=Math.sqrt(dx*dx+dy*dy);
          if(dist<200){var f=(200-dist)/200*0.02;n.vx+=dx*f*0.01;n.vy+=dy*f*0.01}
          n.vx*=0.99;n.vy*=0.99;
          var al=dist<200?n.a+(1-dist/200)*0.5:n.a,gl=dist<150;
          ctx.beginPath();ctx.arc(n.x,n.y,gl?n.r*1.5:n.r,0,Math.PI*2);ctx.fillStyle='rgba(145,70,255,'+al+')';ctx.fill();
          if(gl){ctx.beginPath();ctx.arc(n.x,n.y,n.r*4,0,Math.PI*2);ctx.fillStyle='rgba(145,70,255,'+(al*0.2)+')';ctx.fill()}
          for(var j=i+1;j<nodes.length;j++){var n2=nodes[j],dx2=n.x-n2.x,dy2=n.y-n2.y,d=Math.sqrt(dx2*dx2+dy2*dy2);if(d<150){ctx.beginPath();ctx.moveTo(n.x,n.y);ctx.lineTo(n2.x,n2.y);ctx.strokeStyle='rgba(145,70,255,'+((1-d/150)*0.15)+')';ctx.lineWidth=0.5;ctx.stroke()}}
          if(dist<200){ctx.beginPath();ctx.moveTo(n.x,n.y);ctx.lineTo(mouse.x,mouse.y);ctx.strokeStyle='rgba(145,70,255,'+((1-dist/200)*0.3)+')';ctx.lineWidth=0.8;ctx.stroke()}
        }
        requestAnimationFrame(loop);
      }
      loop();
    })();

    // === CLICK RIPPLE ===
    document.addEventListener('click',function(e){
      var r=document.createElement('div');r.className='click-ripple';
      r.style.width=r.style.height='200px';r.style.left=(e.clientX-100)+'px';r.style.top=(e.clientY-100)+'px';
      document.body.appendChild(r);r.addEventListener('animationend',function(){r.remove()});
    });

    // === SERVER CARD 3D TILT + GLOW ===
    document.querySelectorAll('.server-card').forEach(function(card,i){
      card.style.animationDelay=(i*0.08)+'s';
      card.addEventListener('mousemove',function(e){
        var rect=card.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;
        var rx=((y-rect.height/2)/(rect.height/2))*-5,ry=((x-rect.width/2)/(rect.width/2))*5;
        card.style.transform='perspective(800px) rotateX('+rx+'deg) rotateY('+ry+'deg) translateY(-2px)';
        card.style.setProperty('--mx',(x/rect.width*100)+'%');
        card.style.setProperty('--my',(y/rect.height*100)+'%');
      });
      card.addEventListener('mouseleave',function(){card.style.transform=''});
    });

    // === SERVER SELECTION WITH ANIMATION ===
    function selectServer(guildId){
      var cards=document.querySelectorAll('.server-card');
      var clicked=null;
      cards.forEach(function(c){if(c.getAttribute('onclick')&&c.getAttribute('onclick').indexOf(guildId)!==-1)clicked=c});
      if(clicked){clicked.classList.add('selecting');cards.forEach(function(c){if(c!==clicked)c.style.opacity='0.3'})}
      var csrf=(document.cookie.match(/(?:^|;\\s*)_csrf=([^;]*)/)||[])[1]||'';
      setTimeout(function(){
        fetch('/api/select-server',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({guildId:guildId})})
          .then(function(r){return r.json()})
          .then(function(d){if(d.success)window.location.href='/';else{alert(d.error||'Error');if(clicked){clicked.classList.remove('selecting');cards.forEach(function(c){c.style.opacity=''})}}});
      },400);
    }

    // === ORB CURSOR REPULSION ===
    (function(){
      var orbs=document.querySelectorAll('.orb');
      document.addEventListener('mousemove',function(e){
        orbs.forEach(function(orb){var rect=orb.getBoundingClientRect(),ox=rect.left+rect.width/2,oy=rect.top+rect.height/2;
        var dx=e.clientX-ox,dy=e.clientY-oy,dist=Math.sqrt(dx*dx+dy*dy);
        if(dist<300){var rep=(300-dist)/300*30;orb.style.transform='translate('+(-dx/dist*rep)+'px,'+(-dy/dist*rep)+'px)'}});
      });
    })();

    // === BADGE TRIPLE-CLICK CONFETTI (easter egg) ===
    (function(){
      var badge=document.getElementById('userBadge'),clicks=0,timer;
      badge.addEventListener('click',function(){
        clicks++;clearTimeout(timer);timer=setTimeout(function(){clicks=0},500);
        if(clicks>=3){clicks=0;
          var colors=['#9146ff','#5865f2','#ff6b6b','#43b581','#faa61a','#b388ff'];
          var rect=badge.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
          for(var i=0;i<40;i++){var p=document.createElement('div');p.className='confetti-piece';
            p.style.left=cx+'px';p.style.top=cy+'px';p.style.background=colors[Math.floor(Math.random()*colors.length)];
            p.style.borderRadius=Math.random()>0.5?'50%':'0';
            p.style.setProperty('--tx',(Math.random()-0.5)*300+'px');p.style.setProperty('--ty',-(100+Math.random()*200)+'px');
            p.style.setProperty('--rot',(Math.random()*720)+'deg');p.style.setProperty('--duration',(0.6+Math.random()*0.8)+'s');
            document.body.appendChild(p);setTimeout(function(){p.remove()},1500)}}
      });
    })();

    // === ICON DOUBLE-CLICK BOUNCE (easter egg) ===
    (function(){
      var icon=document.getElementById('selectIcon');
      var s=document.createElement('style');s.textContent='@keyframes iconBounce{0%{transform:scale(1)}30%{transform:scale(1.4) rotate(10deg)}60%{transform:scale(0.9) rotate(-5deg)}100%{transform:scale(1) rotate(0)}}';
      document.head.appendChild(s);
      icon.addEventListener('dblclick',function(){
        icon.style.animation='none';icon.offsetHeight;
        icon.style.animation='iconBounce 0.5s cubic-bezier(0.34,1.56,0.64,1)';
        setTimeout(function(){icon.style.animation='iconFloat 3s ease-in-out infinite'},500);
      });
    })();

    // === GHOST TEXT (rare ambient: 8% every 20s) ===
    (function(){
      var msgs=['CHOOSE WISELY','THE SERVERS ARE ALIVE','WELCOME COMMANDER','WHICH REALM CALLS YOU?','ALL SYSTEMS NOMINAL','THEY REMEMBER YOU','POWER LEVEL: MAXIMUM','SELECT YOUR DESTINY','THE BOTS ARE LISTENING','01001000 01001001'];
      setInterval(function(){
        if(Math.random()<0.08){
          var g=document.createElement('div');g.className='ghost-text';g.textContent=msgs[Math.floor(Math.random()*msgs.length)];
          g.style.left=Math.random()*80+10+'%';g.style.top=Math.random()*80+10+'%';
          g.style.transform='rotate('+(Math.random()*20-10)+'deg)';
          document.body.appendChild(g);setTimeout(function(){g.remove()},8000);
        }
      },20000);
    })();

    // === ALT+MOUSE = CURSOR TRAIL ===
    (function(){
      document.addEventListener('mousemove',function(e){
        if(e.altKey){
          var t=document.createElement('div');t.className='cursor-trail';t.style.left=e.clientX-3+'px';t.style.top=e.clientY-3+'px';
          t.style.background=['rgba(145,70,255,0.7)','rgba(88,101,242,0.7)','rgba(67,181,129,0.7)','rgba(255,107,107,0.7)'][Math.floor(Math.random()*4)];
          document.body.appendChild(t);setTimeout(function(){t.remove()},600);
        }
      });
    })();

    // === AURORA BOREALIS (rare: 5% every 30s) ===
    (function(){
      setInterval(function(){
        if(Math.random()<0.05){
          var a=document.createElement('div');a.className='aurora';
          for(var i=0;i<3;i++){var b=document.createElement('div');b.className='aurora-band';a.appendChild(b)}
          document.body.appendChild(a);setTimeout(function(){a.remove()},6000);
        }
      },30000);
    })();

    // === AMBIENT SHOOTING STAR (rare: 10% every 45s) ===
    (function(){
      setInterval(function(){
        if(Math.random()<0.1){
          var star=document.createElement('div');star.className='shooting-star';
          star.style.left=Math.random()*60+'%';star.style.top=Math.random()*40+'%';
          star.style.transform='rotate('+(Math.random()*30-15)+'deg)';
          document.body.appendChild(star);setTimeout(function(){star.remove()},800);
        }
      },45000);
    })();

    // === RANDOM CARD GLOW PULSE (rare: one random card glows every 15s, 12% chance) ===
    (function(){
      var cards=document.querySelectorAll('.server-card');
      if(cards.length>0){
        setInterval(function(){
          if(Math.random()<0.12){
            var c=cards[Math.floor(Math.random()*cards.length)];
            c.classList.add('glow-pulse');setTimeout(function(){c.classList.remove('glow-pulse')},1000);
          }
        },15000);
      }
    })();

    // === HOVER COUNTER (hidden stat: shows after 10+ hovers on cards) ===
    (function(){
      var count=0,badge=document.createElement('div');badge.className='hover-count';document.body.appendChild(badge);
      document.querySelectorAll('.server-card').forEach(function(card){
        card.addEventListener('mouseenter',function(){
          count++;
          if(count>=10){badge.textContent='Hovers: '+count;badge.style.opacity='1';setTimeout(function(){badge.style.opacity='0'},2000)}
          if(count===50){badge.textContent='\u{1F3C6} Hover master: '+count;badge.style.color='#faa61a';badge.style.borderColor='rgba(250,166,26,0.3)';badge.style.opacity='1';setTimeout(function(){badge.style.opacity='0'},3000)}
          if(count===100){badge.textContent='\u{1F451} Hover legend: '+count+'!!';badge.style.color='#ff6b6b';badge.style.borderColor='rgba(255,107,107,0.3)';badge.style.opacity='1';
            for(var i=0;i<30;i++){var p=document.createElement('div');p.className='confetti-piece';p.style.left=window.innerWidth/2+'px';p.style.top=window.innerHeight/2+'px';p.style.background=['#9146ff','#5865f2','#ff6b6b','#43b581','#faa61a'][Math.floor(Math.random()*5)];p.style.borderRadius=Math.random()>0.5?'50%':'0';p.style.setProperty('--tx',(Math.random()-0.5)*400+'px');p.style.setProperty('--ty',(Math.random()-0.5)*400+'px');p.style.setProperty('--rot',(Math.random()*720)+'deg');p.style.setProperty('--duration',(0.8+Math.random()*0.6)+'s');document.body.appendChild(p);setTimeout(function(){p.remove()},1500)}}
        });
      });
    })();

    // === RAPID CLICK SAME SERVER (7 times) = DISCO MODE ===
    (function(){
      var lastId=null,clickCount=0,clickTimer;
      document.querySelectorAll('.server-card').forEach(function(card){
        card.addEventListener('mousedown',function(e){
          e.stopPropagation();
          var id=card.getAttribute('onclick');
          if(id===lastId){clickCount++}else{clickCount=1;lastId=id}
          clearTimeout(clickTimer);clickTimer=setTimeout(function(){clickCount=0},800);
          if(clickCount>=7){
            clickCount=0;
            var colors=['#9146ff','#ff6b6b','#43b581','#faa61a','#5865f2','#ff69b4'];var ci=0;
            var disco=setInterval(function(){
              document.querySelectorAll('.server-card').forEach(function(c){c.style.borderColor=colors[ci%colors.length];c.style.boxShadow='0 0 15px '+colors[ci%colors.length]+'40'});
              ci++;
            },150);
            setTimeout(function(){clearInterval(disco);document.querySelectorAll('.server-card').forEach(function(c){c.style.borderColor='';c.style.boxShadow=''})},3000);
          }
        },true);
      });
    })();

    // === LOGOUT LINK HOVER 5 TIMES = SAD EMOJI ===
    (function(){
      var link=document.querySelector('.logout-link'),hovers=0,timer;
      link.addEventListener('mouseenter',function(){
        hovers++;clearTimeout(timer);timer=setTimeout(function(){hovers=0},3000);
        if(hovers>=5){
          hovers=0;var sad=document.createElement('div');
          sad.textContent='\u{1F622}';sad.style.cssText='position:fixed;font-size:50px;pointer-events:none;z-index:200;left:50%;top:50%;transform:translate(-50%,-50%);animation:sadFade 1.5s ease-out forwards';
          var st=document.createElement('style');st.textContent='@keyframes sadFade{0%{transform:translate(-50%,-50%) scale(0)}30%{transform:translate(-50%,-50%) scale(1.3)}60%{transform:translate(-50%,-50%) scale(1)}100%{transform:translate(-50%,-120%) scale(0.5);opacity:0}}';
          document.head.appendChild(st);document.body.appendChild(sad);setTimeout(function(){sad.remove()},1500);
        }
      });
    })();

    // === ORB CURSOR REPULSION ===
    (function(){
      var orbs=document.querySelectorAll('.orb');
      document.addEventListener('mousemove',function(e){
        orbs.forEach(function(orb){var rect=orb.getBoundingClientRect(),ox=rect.left+rect.width/2,oy=rect.top+rect.height/2;
        var dx=e.clientX-ox,dy=e.clientY-oy,dist=Math.sqrt(dx*dx+dy*dy);
        if(dist<300){var rep=(300-dist)/300*30;orb.style.transform='translate('+(-dx/dist*rep)+'px,'+(-dy/dist*rep)+'px)'}});
      });
    })();

    // === ICON 5-CLICKS = TRANSFORMS INTO RANDOM EMOJI ===
    (function(){
      var icon=document.getElementById('selectIcon'),clicks=0,timer;
      var emojis=['\u{1F680}','\u{1F47E}','\u{1F525}','\u{2728}','\u{1F308}','\u{1F3AE}','\u{1F47D}','\u{1F4A5}','\u{1F31F}','\u{1F3B2}'];
      icon.addEventListener('click',function(){
        clicks++;clearTimeout(timer);timer=setTimeout(function(){clicks=0},600);
        if(clicks>=5){clicks=0;icon.textContent=emojis[Math.floor(Math.random()*emojis.length)];setTimeout(function(){icon.textContent='\u{1F5A5}\uFE0F'},3000)}
      });
    })();

    // === IDLE: CARDS DIM AFTER 45s, WAKE ON MOVE ===
    (function(){
      var idle,dimmed=false;
      function dimCards(){dimmed=true;document.querySelectorAll('.server-card').forEach(function(c,i){c.style.transition='opacity 2s '+i*0.1+'s';c.style.opacity='0.3'})}
      function wakeCards(){if(dimmed){dimmed=false;document.querySelectorAll('.server-card').forEach(function(c){c.style.transition='opacity 0.3s';c.style.opacity=''})}}
      function resetIdle(){wakeCards();clearTimeout(idle);idle=setTimeout(dimCards,45000)}
      document.addEventListener('mousemove',resetIdle);document.addEventListener('keydown',resetIdle);resetIdle();
    })();

    ${guildCards ? '' : 'setTimeout(function(){location.reload()},3000);'}
  </script>
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
  const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = await import('discord.js');
  const embed = new EmbedBuilder().setTitle(title || '🎭 Reaction Roles').setDescription(description || 'Click a button to get/remove a role!').setColor(0x9146ff);
  let desc = '';
  const rows = [];
  let currentRow = new ActionRowBuilder();
  let count = 0;
  for (const r of roles.slice(0,25)) {
    desc += (r.emoji||'🔹') + ' ' + (r.label||r.roleId) + '\n';
    currentRow.addComponents(new ButtonBuilder().setCustomId('rr_' + r.roleId).setLabel(r.label || 'Role').setStyle(ButtonStyle.Secondary).setEmoji(r.emoji || undefined));
    count++;
    if (count % 5 === 0) { rows.push(currentRow); currentRow = new ActionRowBuilder(); }
  }
  if (count % 5 !== 0) rows.push(currentRow);
  embed.setDescription(desc || 'Select a role below');
  const msg = await ch.send({ embeds: [embed], components: rows });
  const data = loadJSON(REACTION_ROLES_PATH, {panels:[]});
  data.panels.push({ id: msg.id, channelId, messageId: msg.id, roles, mode: mode || 'toggle', createdAt: Date.now() });
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
  for (const r of roles.slice(0, 25)) {
    desc += (r.emoji || '🔹') + ' ' + (r.label || r.roleId) + '\n';
    currentRow.addComponents(new ButtonBuilder().setCustomId('rr_' + r.roleId).setLabel(r.label || 'Role').setStyle(ButtonStyle.Secondary).setEmoji(r.emoji || undefined));
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
  panel.roles = roles;
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
app.get('/idleon-reviews', requireAuth, requireTier('admin'), (req, res) => res.send(renderPage('idleon-reviews', req)));
app.get('/idleon-stats', requireAuth, requireTier('viewer'), (req, res) => res.redirect('/idleon-dashboard'));
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
  const allowed = ['dark', 'midnight', 'light', 'amoled', 'ocean', 'sunset', 'forest', 'rose', 'cyberpunk', 'nord'];
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
  try { return _renderPageInner(tab, req, subTab); } catch(e) {
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
  const _catMap = {core:['overview','health','logs','notifications'],config:['commands','commands-config','config-commands','embeds','config-general','config-notifications','export','backups','accounts','bot-config'],profile:['profile','profile-customize','profile-security','mail','dms','profile-notifications'],smartbot:['smartbot-config','smartbot-knowledge','smartbot-news','smartbot-stats','smartbot-learning','smartbot-training'],idleon:['idleon-dashboard','idleon-members','idleon-admin','idleon-reviews'],community:['welcome','audit','customcmds','leveling','suggestions','events','events-giveaways','events-polls','events-reminders','events-schedule','events-birthdays','youtube-alerts','pets','pet-approvals','pet-giveaways','pet-stats','moderation','tickets','reaction-roles','scheduled-msgs','automod','starboard','dash-audit','timezone','bot-messages','guide-indexer'],analytics:['stats','stats-engagement','stats-trends','stats-games','stats-viewers','stats-ai','stats-reports','stats-community','stats-rpg','stats-rpg-events','stats-rpg-economy','stats-rpg-quests','stats-compare','stats-features','member-growth','command-usage','stats-revenue'],rpg:['rpg-editor','rpg-entities','rpg-systems','rpg-ai','rpg-flags','rpg-simulators','rpg-admin','rpg-guild','rpg-guild-stats']};
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
    ${_canSee('idleon-dashboard')?`<a href="/idleon-dashboard${previewQuery}" class="${tab==='idleon-dashboard'?'active':''}">📊 Dashboard${_roTag('idleon-dashboard')}</a>`:''}
    ${_canSee('idleon-members')?`<a href="/idleon-members${previewQuery}" class="${tab==='idleon-members'?'active':''}">👥 Members${_roTag('idleon-members')}</a>`:''}
    ${TIER_LEVELS[userTier] >= TIER_LEVELS.admin && _canSee('idleon-admin') ? '<a href="/idleon-admin" class="'+(tab==='idleon-admin'?'active':'')+'">🛠️ Admin'+_roTag('idleon-admin')+'</a>' : ''}
    ${TIER_LEVELS[userTier] >= TIER_LEVELS.admin && _canSee('idleon-reviews') ? '<a href="/idleon-reviews" class="'+(tab==='idleon-reviews'?'active':'')+'">🔍 Reviews'+_roTag('idleon-reviews')+'</a>' : ''}
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
    ${_canSee('smartbot-news')?`<a href="/smartbot-news${previewQuery}" class="${tab==='smartbot-news'?'active':''}">📰 News Feed${_roTag('smartbot-news')}</a>`:''}
    ${_canSee('smartbot-stats')?`<a href="/smartbot-stats${previewQuery}" class="${tab==='smartbot-stats'?'active':''}">📊 Stats & Trends${_roTag('smartbot-stats')}</a>`:''}
    ${_canSee('smartbot-learning')?`<a href="/smartbot-learning${previewQuery}" class="${tab==='smartbot-learning'?'active':''}">📖 Learning & Social${_roTag('smartbot-learning')}</a>`:''}
    ${_canSee('smartbot-training')?`<a href="/smartbot-training${previewQuery}" class="${tab==='smartbot-training'?'active':''}">🏋️ Training${_roTag('smartbot-training')}</a>`:''}
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
  {l:'SmartBot Training',c:'SmartBot',u:'/smartbot-training',i:'🏋️',k:'smartbot training practice scenarios rate approve reject feedback'}
  ${userAccess.includes('idleon')?',{l:\'IdleOn Stats\',c:\'IdleOn\',u:\'/idleon-stats\',i:\'📊\',k:\'idleon stats leaderboard top gain weekly total trends performance\'}':''},
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
});


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
const { sendYouTubeVideoAlert } = registerDiscordEvents({
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
// SmartBot tabs + API routes loaded from modules/smartbot-routes.js
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



