/**
 * Script to extract stream/Twitch functions from index.js into modules/stream-manager.js
 * 
 * Strategy:
 * - Mutable primitive state stored in streamVars object (shared by reference)
 * - Object/array references passed directly (schedule, streamInfo, etc.)
 * - Factory function pattern like other modules
 * 
 * Usage: node scripts/extract-stream-manager.js
 */
import fs from 'fs';

const INDEX = 'index.js';
const lines = fs.readFileSync(INDEX, 'utf-8').split('\n');
console.log(`Read ${lines.length} lines from index.js`);

// ========== STEP 1: Identify stream function lines ==========
// Stream functions: 5994-6585 AND 6883-7867
// Non-stream (stays): 6586-6882 (giveaway/poll/reminder helpers)
// Also extract state vars section: offlineDetectedAt, lastStreamCheckAt,
// normalizeSchedule, suppressNextAnnounce, isCheckingStream, streamInfo init,
// chatStats, apiRateLimits, trackApiCall, resetChatStats, TWITCH_ACCESS_TOKEN, BROADCASTER_ID

// Map the exact ranges to extract
const streamFuncRanges = [];

// Find exact function boundaries using regex
const funcStartRe = /^(async )?function (\w+)/;
const funcLines = [];
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(funcStartRe);
  if (m) funcLines.push({ name: m[2], line: i }); // 0-based
}

// Stream functions to extract
const streamFuncNames = new Set([
  'computeNextScheduledStream', 'getNextAlertInfo', 'getNextScheduledStream',
  'maybeDailyReset', 'processDiscordMsgQueue', 'queueDiscordMessage',
  'sendEmbedNotification', 'buildLiveEmbed', 'buildOfflineEmbed',
  'announceLive', 'sendScheduleAlert', 'trackStreamGameChange',
  'updateStreamInfo', 'fetchChannelInfo',
  'finalizeStreamViewerData', 'finalizeStreamGameTimeline',
  'checkScheduleAlerts', 'checkStream',
  'validateTwitchToken', 'refreshTwitchToken', 'ensureTwitchInitialized',
  'getBroadcasterId', 'getChannelVIPs',
]);

// Find boundaries for each stream function
for (const sf of funcLines) {
  if (streamFuncNames.has(sf.name)) {
    // Find end: look for the next top-level function or section header
    let endLine = sf.line;
    let braceDepth = 0;
    let started = false;
    for (let j = sf.line; j < lines.length; j++) {
      const line = lines[j];
      for (const ch of line) {
        if (ch === '{') { braceDepth++; started = true; }
        if (ch === '}') braceDepth--;
      }
      if (started && braceDepth === 0) {
        endLine = j;
        break;
      }
    }
    streamFuncRanges.push({ name: sf.name, start: sf.line, end: endLine });
  }
}

// Sort by start line
streamFuncRanges.sort((a, b) => a.start - b.start);

console.log(`Found ${streamFuncRanges.length} stream functions:`);
for (const r of streamFuncRanges) {
  console.log(`  ${r.name}: lines ${r.start + 1}-${r.end + 1} (${r.end - r.start + 1} lines)`);
}

// ========== STEP 2: Extract and transform functions ==========
// Mutable primitives that become streamVars.X:
const primitiveVars = [
  'isLive', 'lastStreamId', 'announcementMessageId', 
  'suppressNextAnnounce', 'BROADCASTER_ID', 'TWITCH_ACCESS_TOKEN',
  'isCheckingStream', 'offlineDetectedAt', 'lastStreamCheckAt'
];

function transformLine(line) {
  let result = line;
  for (const varName of primitiveVars) {
    // Replace bare variable references with sv.varName
    // Use word boundary, avoid replacing in strings/property access/declarations
    // Pattern: standalone varName not preceded by . or followed by :
    const re = new RegExp(`(?<![.'"\\w])\\b${varName}\\b(?!\\s*[:])`, 'g');
    result = result.replace(re, `sv.${varName}`);
  }
  return result;
}

// Build the module content
const funcBodies = [];
for (const r of streamFuncRanges) {
  const bodyLines = lines.slice(r.start, r.end + 1);
  const transformed = bodyLines.map(l => transformLine(l));
  funcBodies.push(transformed.join('\n'));
}

// Also handle comments/section headers between functions
// We need to include section comments
const sectionHeaders = [];
for (let i = Math.min(...streamFuncRanges.map(r => r.start)) - 5; i < Math.max(...streamFuncRanges.map(r => r.end)) + 1; i++) {
  if (i < 0) continue;
  const line = lines[i];
  if (line.startsWith('/* ====') || line.startsWith('// ====') || 
      (line.startsWith('   ') && lines[i-1]?.startsWith('/* ===='))) {
    // Check if this is within a stream function range or between two
    const isInFunc = streamFuncRanges.some(r => i >= r.start && i <= r.end);
    if (!isInFunc) {
      sectionHeaders.push({ line: i, text: line });
    }
  }
}

// ========== STEP 3: Build the module file ==========
// Identify which deps each function needs by scanning for specific identifiers
const depsNeeded = new Set();
const depIdentifiers = [
  'addLog', 'saveState', 'saveConfig', 'client', 'schedule', 'state', 
  'streamInfo', 'chatStats', 'apiRateLimits', 'twitchTokens', 'streamGoals',
  'history', 'currentStreamViewerData', 'currentStreamGameTimeline', 
  'viewerGraphHistory', 'dashboardSettings', 'botTimezone',
  'getTimeZoneParts', 'zonedTimeToUtcMillis', 'fetchUserName',
  'checkRPGMilestoneEvents', 'expireRPGEvents', 'rpgEvents',
  'pushDashboardNotification', 'invalidateAnalyticsCache',
  'getNowInBotTimezone', 'dashAudit', 'notificationFilters',
  'trackApiCall', 'resetChatStats', 'smartBot', 'io', 'config'
];

for (const r of streamFuncRanges) {
  for (let i = r.start; i <= r.end; i++) {
    for (const dep of depIdentifiers) {
      if (lines[i].includes(dep)) depsNeeded.add(dep);
    }
  }
}

console.log(`\nDeps needed: ${[...depsNeeded].join(', ')}`);

// Build the module content
const moduleContent = `/**
 * Stream Manager — extracted from index.js
 * Handles Twitch stream detection, live announcements, schedule alerts,
 * stream info tracking, and Twitch API integration.
 * 
 * Pattern: Factory function receives dependencies + shared streamVars object.
 * Mutable primitives (isLive, lastStreamId, etc.) live on streamVars.
 */
import { EmbedBuilder } from 'discord.js';

// Discord message queue (rate-limit protection)
const discordMsgQueue = [];
let discordMsgQueueTimer = null;

export function registerStreamManager({
  sv,   // streamVars — mutable primitive state
  addLog, saveState, saveConfig, client, schedule, state,
  streamInfo, chatStats, apiRateLimits, twitchTokens, streamGoals,
  history, currentStreamViewerData, currentStreamGameTimeline,
  viewerGraphHistory, dashboardSettings, botTimezone,
  getTimeZoneParts, zonedTimeToUtcMillis, fetchUserName,
  checkRPGMilestoneEvents, expireRPGEvents, rpgEvents,
  pushDashboardNotification, invalidateAnalyticsCache,
  getNowInBotTimezone, dashAudit, notificationFilters,
  trackApiCall, resetChatStats, smartBot, io, config,
}) {

${funcBodies.join('\n\n')}

  return {
    computeNextScheduledStream,
    getNextAlertInfo,
    getNextScheduledStream,
    maybeDailyReset,
    processDiscordMsgQueue,
    queueDiscordMessage,
    sendEmbedNotification,
    buildLiveEmbed,
    buildOfflineEmbed,
    announceLive,
    sendScheduleAlert,
    trackStreamGameChange,
    updateStreamInfo,
    fetchChannelInfo,
    finalizeStreamViewerData,
    finalizeStreamGameTimeline,
    checkScheduleAlerts,
    checkStream,
    validateTwitchToken,
    refreshTwitchToken,
    ensureTwitchInitialized,
    getBroadcasterId,
    getChannelVIPs,
  };
}
`;

// ========== STEP 4: Write the module ==========
fs.writeFileSync('modules/stream-manager.js', moduleContent, 'utf-8');
console.log(`\nWrote modules/stream-manager.js (${moduleContent.split('\n').length} lines)`);

// ========== STEP 5: Report what to remove from index.js ==========
console.log('\n=== Lines to remove from index.js ===');
for (const r of streamFuncRanges) {
  console.log(`Lines ${r.start + 1}-${r.end + 1}: ${r.name} (${r.end - r.start + 1} lines)`);
}

const totalExtracted = streamFuncRanges.reduce((sum, r) => sum + (r.end - r.start + 1), 0);
console.log(`\nTotal lines to extract: ${totalExtracted}`);

// ========== STEP 6: Actually remove lines and update index.js ==========
// Build set of line numbers to remove
const linesToRemove = new Set();
for (const r of streamFuncRanges) {
  for (let i = r.start; i <= r.end; i++) {
    linesToRemove.add(i);
  }
  // Also remove section comment headers that precede stream functions
  // Look backward from each function for section comments
  for (let i = r.start - 1; i >= Math.max(0, r.start - 5); i--) {
    const l = lines[i].trim();
    if (l === '' || l.startsWith('/*') || l.startsWith('*') || l.startsWith('//') || l.startsWith('===')) {
      // Check if this comment is associated with this stream function
      if (l.includes('TWITCH') || l.includes('STREAM') || l.includes('SCHEDULE') || 
          l.includes('MESSAGE QUEUE') || l.includes('ALERT') || l.includes('Stream')) {
        linesToRemove.add(i);
      }
    }
    if (l !== '' && !l.startsWith('/*') && !l.startsWith('*') && !l.startsWith('//') && !l.startsWith('===')) {
      break;
    }
  }
}

// Also remove the specific stream state variable lines (1873-1951)
// But keep those in index.js as part of streamVars object instead.
// We'll transform them in the output.

// Build new index.js lines
const newLines = [];
// Track where we need to insert streamVars and module registration
let insertedStreamVarsId = false;
let removedCount = 0;

for (let i = 0; i < lines.length; i++) {
  if (linesToRemove.has(i)) {
    removedCount++;
    continue;
  }
  
  // Transform remaining stream variable references 
  let line = lines[i];
  
  // Check if this line references stream primitives and isn't in a removed section
  if (!linesToRemove.has(i)) {
    // Replace standalone variable references to primitive stream vars
    for (const varName of primitiveVars) {
      if (line.includes(varName)) {
        // Don't replace in: variable declarations (let/const/var), import statements,
        // the streamVars object creation, or string literals
        if (line.match(/^\s*(let|const|var)\s/) && line.includes(varName)) {
          // This is a declaration — skip transform but might need removal
          continue;
        }
      }
    }
  }
  
  newLines.push(line);
}

console.log(`\nRemoved ${removedCount} lines from index.js`);
console.log(`New index.js: ${newLines.length} lines (was ${lines.length})`);

// Write the updated index.js
fs.copyFileSync(INDEX, INDEX + '.bak');
console.log(`Backed up to ${INDEX}.bak`);
fs.writeFileSync(INDEX, newLines.join('\n'), 'utf-8');
console.log(`Wrote updated index.js`);

// ========== STEP 7: Summary ==========
console.log('\n=== MANUAL STEPS NEEDED ===');
console.log('1. Replace primitive stream var declarations in index.js with streamVars object');
console.log('2. Update non-stream references from isLive → streamVars.isLive, etc.');
console.log('3. Add registerStreamManager import and call in index.js');
console.log('4. Update express-routes and discord-events registrations to pass streamVars');
