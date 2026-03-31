/**
 * IdleOn Firebase Integration
 *
 * Handles: Google Device-Code OAuth, Firebase Auth, Firestore/RTDB reads,
 * guild data polling, diff-based snapshot storage, and token encryption.
 *
 * Firebase project: idlemmo (public IdleOn game backend)
 * Only client SDK is used — we have no service account.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, getApp as getExistingApp } from 'firebase/app';
import { getAuth, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { getDatabase, ref, get, child } from 'firebase/database';
import { getFirestore, doc, getDoc, getDocs, collection, query as fsQuery, where, orderBy, limit as fsLimit, startAt, endAt } from 'firebase/firestore';

// ── Firebase Config (public, same as in-game client) ──────────────────
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAU62kOE6xhSrFqoXQPv6_WHxYilmoUxDk',
  authDomain: 'idlemmo.firebaseapp.com',
  databaseURL: 'https://idlemmo.firebaseio.com',
  storageBucket: 'idlemmo.appspot.com',
  projectId: 'idlemmo'
};

// Google OAuth Device-Code flow constants (set via env vars)
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_DEVICE_CODE_URL = 'https://oauth2.googleapis.com/device/code';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

// ── Module state ──────────────────────────────────────────────────────
let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;
let firestore = null;
let pollTimer = null;
let pendingDeviceAuth = null; // in-progress device-code flow
let _deps = null;
let _tokenPath = '';
let _snapshotDir = '';

// ── Encryption helpers (AES-256-GCM) ─────────────────────────────────
function getEncryptionKey() {
  const envKey = process.env.IDLEON_TOKEN_SECRET || process.env.SESSION_SECRET || 'default-idleon-encryption-key-change-me';
  return crypto.createHash('sha256').update(envKey).digest();
}

function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(blob) {
  const parts = blob.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted blob');
  const iv = Buffer.from(parts[0], 'hex');
  const tag = Buffer.from(parts[1], 'hex');
  const data = Buffer.from(parts[2], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), iv);
  decipher.setAuthTag(tag);
  return decipher.update(data, 'utf8') + decipher.final('utf8');
}

// ── Token persistence ────────────────────────────────────────────────
function loadTokens() {
  try {
    if (!fs.existsSync(_tokenPath)) return null;
    const raw = JSON.parse(fs.readFileSync(_tokenPath, 'utf8'));
    return {
      refreshToken: decrypt(raw.refreshToken),
      email: raw.email || '',
      connectedAt: raw.connectedAt || 0
    };
  } catch {
    return null;
  }
}

function saveTokens(refreshToken, email) {
  const data = {
    refreshToken: encrypt(refreshToken),
    email: email || '',
    connectedAt: Date.now()
  };
  fs.writeFileSync(_tokenPath, JSON.stringify(data, null, 2));
}

function deleteTokens() {
  if (fs.existsSync(_tokenPath)) fs.unlinkSync(_tokenPath);
}

// ── Snapshot persistence (diffs + weekly full) ────────────────────────
function loadLatestSnapshot(guildId) {
  const file = path.join(_snapshotDir, `guild-${guildId}-latest.json`);
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch { /* corrupt file */ }
  return null;
}

function saveSnapshot(guildId, snapshot) {
  if (!fs.existsSync(_snapshotDir)) fs.mkdirSync(_snapshotDir, { recursive: true });
  const file = path.join(_snapshotDir, `guild-${guildId}-latest.json`);
  fs.writeFileSync(file, JSON.stringify(snapshot, null, 2));
}

function saveDiff(guildId, diff) {
  if (!diff || !diff.changes.length) return;
  const file = path.join(_snapshotDir, `guild-${guildId}-diffs.json`);
  let diffs = [];
  try {
    if (fs.existsSync(file)) diffs = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch { diffs = []; }
  diffs.push(diff);
  // Keep last 2000 diff entries (~6 months at 1h polling)
  if (diffs.length > 2000) diffs = diffs.slice(-2000);
  fs.writeFileSync(file, JSON.stringify(diffs, null, 2));
}

function loadDiffHistory(guildId) {
  const file = path.join(_snapshotDir, `guild-${guildId}-diffs.json`);
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch { /* corrupt */ }
  return [];
}

// ── Firebase init / auth ─────────────────────────────────────────────
function initFirebase() {
  if (firebaseApp) return;
  const apps = getApps();
  firebaseApp = apps.length > 0 ? getExistingApp() : initializeApp(FIREBASE_CONFIG);
  firebaseAuth = getAuth(firebaseApp);
  firebaseDb = getDatabase(firebaseApp);
  firestore = getFirestore(firebaseApp);
}

async function authenticateWithRefreshToken(refreshToken) {
  // Exchange refresh token for id_token via Google token endpoint
  const body = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  const data = await res.json();
  if (data.error) throw new Error(`Token refresh failed: ${data.error_description || data.error}`);

  // Sign in to Firebase with the Google credential
  const credential = GoogleAuthProvider.credential(data.id_token, null);
  const result = await signInWithCredential(firebaseAuth, credential);
  return result.user;
}

// ── Device-Code OAuth Flow ───────────────────────────────────────────
async function startDeviceCodeFlow() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables are required for Firebase auth');
  }
  const res = await fetch(GOOGLE_DEVICE_CODE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `client_id=${GOOGLE_CLIENT_ID}&scope=email%20profile`
  });
  const data = await res.json();
  if (data.error) throw new Error(`Device code error: ${data.error_description || data.error}`);

  pendingDeviceAuth = {
    deviceCode: data.device_code,
    userCode: data.user_code,
    verificationUrl: data.verification_url,
    expiresAt: Date.now() + ((data.expires_in || 1800) * 1000),
    interval: (data.interval || 5) * 1000,
    resolved: false,
    error: null
  };

  // Start background polling for user completion
  pollDeviceCode(data.device_code, data.interval || 5);

  return {
    userCode: data.user_code,
    verificationUrl: data.verification_url,
    expiresIn: data.expires_in || 1800
  };
}

function pollDeviceCode(deviceCode, intervalSec) {
  const pollInterval = Math.max(5, intervalSec) * 1000;
  const poll = async () => {
    if (!pendingDeviceAuth || pendingDeviceAuth.resolved) return;
    if (Date.now() > pendingDeviceAuth.expiresAt) {
      pendingDeviceAuth.resolved = true;
      pendingDeviceAuth.error = 'Code expired';
      return;
    }

    try {
      const body = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
      });

      const res = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
      });
      const data = await res.json();

      if (data.error === 'authorization_pending') {
        setTimeout(poll, pollInterval);
        return;
      }
      if (data.error === 'slow_down') {
        setTimeout(poll, pollInterval + 5000);
        return;
      }
      if (data.error) {
        pendingDeviceAuth.resolved = true;
        pendingDeviceAuth.error = data.error_description || data.error;
        return;
      }

      // Success — we got tokens
      if (data.refresh_token) {
        initFirebase();
        const credential = GoogleAuthProvider.credential(data.id_token, null);
        const result = await signInWithCredential(firebaseAuth, credential);
        saveTokens(data.refresh_token, result.user.email || '');

        pendingDeviceAuth.resolved = true;
        pendingDeviceAuth.email = result.user.email || '';

        if (_deps?.addLog) _deps.addLog(`[IdleOn Firebase] Google account connected: ${result.user.email}`);
        if (_deps?.dashAudit) _deps.dashAudit('system', 'idleon-firebase-connect', `Google account connected: ${result.user.email}`);
      }
    } catch (e) {
      pendingDeviceAuth.resolved = true;
      pendingDeviceAuth.error = e.message;
    }
  };

  setTimeout(poll, pollInterval);
}

// ── Data Fetching ────────────────────────────────────────────────────
async function ensureAuthenticated() {
  initFirebase();
  // Check if already signed in
  if (firebaseAuth.currentUser) return firebaseAuth.currentUser;
  // Try stored refresh token
  const tokens = loadTokens();
  if (!tokens) throw new Error('Not connected — please link a Google account first');
  return await authenticateWithRefreshToken(tokens.refreshToken);
}

// ── Retry with exponential backoff for Firebase rate limits ──────────
async function withBackoff(fn, maxRetries = 3) {
  let delay = 1000;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const msg = String(e.message || e.code || '');
      const isRateLimit = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota');
      if (!isRateLimit || attempt === maxRetries) throw e;
      if (_deps?.addLog) _deps.addLog(`[IdleOn Firebase] Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(r => setTimeout(r, delay));
      delay *= 2;
    }
  }
}

async function fetchGuildData(guildId) {
  await ensureAuthenticated();
  const dbRef = ref(firebaseDb);
  return withBackoff(async () => {
    const snapshot = await get(child(dbRef, `_guild/${guildId}`));
    if (!snapshot.exists()) throw new Error(`Guild ${guildId} not found in Firebase`);
    return snapshot.val();
  });
}

async function searchGuildsByName(searchName) {
  await ensureAuthenticated();
  const col = collection(firestore, '_guildStat');

  // Use Firestore prefix range query on the 'n' field to avoid loading the entire collection
  const q = fsQuery(col, orderBy('n'), startAt(searchName), endAt(searchName + '\uf8ff'), fsLimit(20));
  let docs;
  try {
    docs = await withBackoff(() => getDocs(q));
  } catch {
    // Fallback: if the index doesn't exist or orderBy fails, try a broader query with a limit
    docs = await withBackoff(() => getDocs(fsQuery(col, fsLimit(500))));
  }

  const results = [];
  const searchLower = searchName.toLowerCase();
  docs.forEach((d) => {
    const data = d.data();
    const name = data.n || '';
    if (name.toLowerCase().includes(searchLower)) {
      results.push({
        id: d.id,
        name: name,
        icon: data.i || 0,
        stats: data.stats || []
      });
    }
  });
  return results.slice(0, 20);
}

async function fetchGuildMembers(guildId) {
  const raw = await fetchGuildData(guildId);

  // Log all available top-level keys for debugging (helps discover new fields)
  if (raw) {
    const knownKeys = new Set(['m', 'p', 'b']);
    const extraKeys = Object.keys(raw).filter(k => !knownKeys.has(k));
    if (extraKeys.length) {
      console.log(`[IdleOn Firebase] Guild ${guildId} has extra fields: ${extraKeys.join(', ')}`);
    }
  }

  const members = Object.values(raw.m || {}).map(m => {
    // Log extra per-member fields once for discovery
    const knownMemberKeys = new Set(['a', 'd', 'e', 'f', 'g']);
    const extraMKeys = Object.keys(m).filter(k => !knownMemberKeys.has(k));

    return {
      name: String(m.a || ''),
      level: Number(m.d || 0),
      gpEarned: Number(m.e || 0),
      wantedBonusIndex: Number(m.f || 0),
      rank: Number(m.g || 5), // 0=King, 1=Leader, 2-4=Officer, 5+=Member
      _extraFields: extraMKeys.length ? extraMKeys.reduce((o, k) => { o[k] = m[k]; return o; }, {}) : undefined
    };
  }).filter(m => m.name);

  // raw.b = array of guild bonus levels (13 entries, one per bonus type)
  const bonusLevels = Array.isArray(raw.b) ? raw.b.map(v => Number(v || 0)) : [];

  return {
    members,
    totalGp: Number(raw.p || 0),
    bonusLevels,
    memberCount: members.length
  };
}

// ── Diff & Snapshot Logic ────────────────────────────────────────────
function computeSnapshotDiff(guildId, previous, current) {
  if (!previous) return { timestamp: Date.now(), guildId, changes: [], isFirst: true };

  const prevMap = {};
  (previous.members || []).forEach(m => { prevMap[m.name] = m; });
  const curMap = {};
  (current.members || []).forEach(m => { curMap[m.name] = m; });

  const changes = [];

  // Check for GP changes, new members, level changes
  for (const m of current.members) {
    const prev = prevMap[m.name];
    if (!prev) {
      changes.push({ type: 'joined', name: m.name, gpEarned: m.gpEarned, level: m.level });
    } else {
      if (m.gpEarned !== prev.gpEarned) {
        changes.push({ type: 'gp_change', name: m.name, from: prev.gpEarned, to: m.gpEarned, delta: m.gpEarned - prev.gpEarned });
      }
      if (m.level !== prev.level) {
        changes.push({ type: 'level_change', name: m.name, from: prev.level, to: m.level });
      }
      if (m.rank !== prev.rank) {
        changes.push({ type: 'rank_change', name: m.name, from: prev.rank, to: m.rank });
      }
    }
  }

  // Check for members who left
  for (const name of Object.keys(prevMap)) {
    if (!curMap[name]) {
      changes.push({ type: 'left', name, gpEarned: prevMap[name].gpEarned });
    }
  }

  return { timestamp: Date.now(), guildId, changes };
}

// ── Guild Poll & Import ──────────────────────────────────────────────
async function pollGuild(guildId, guildName) {
  const data = await fetchGuildMembers(guildId);
  const previous = loadLatestSnapshot(guildId);
  const diff = computeSnapshotDiff(guildId, previous, data);

  // Save new snapshot and diff
  saveSnapshot(guildId, { ...data, fetchedAt: Date.now() });
  saveDiff(guildId, diff);

  return { data, diff };
}

async function pollAllGuilds() {
  if (!_deps) return { results: [], error: 'Module not initialized' };
  const tokens = loadTokens();
  if (!tokens) return { results: [], error: 'Not connected' };

  const { loadJSON, saveJSON, DATA_DIR } = _deps;
  const gpPath = path.join(DATA_DIR, 'idleon-gp.json');
  const idleonData = loadJSON(gpPath, { members: [], guilds: [], config: {}, kickLog: [], waitlist: [], importLog: [], updatedAt: null });
  const guilds = idleonData.guilds || [];
  if (!guilds.length) return { results: [], error: 'No guilds configured' };

  const results = [];
  for (let i = 0; i < guilds.length; i++) {
    const guild = guilds[i];
    try {
      if (i > 0) await new Promise(r => setTimeout(r, 500)); // throttle between guilds
      const { data, diff } = await pollGuild(guild.id, guild.name);
      results.push({ guildId: guild.id, guildName: guild.name, memberCount: data.memberCount, changes: diff.changes.length, success: true });

      // Feed into the existing import system
      importFirebaseData(idleonData, guild.id, data);
    } catch (e) {
      results.push({ guildId: guild.id, guildName: guild.name, success: false, error: e.message });
    }
  }

  // Save updated data
  idleonData.updatedAt = Date.now();
  saveJSON(gpPath, idleonData);

  // Log
  if (_deps?.addLog) _deps.addLog(`[IdleOn Firebase] Polled ${results.length} guild(s): ${results.filter(r => r.success).length} ok, ${results.filter(r => !r.success).length} failed`);

  return { results, polledAt: Date.now() };
}

// ── Bridge: Firebase data → existing import format ───────────────────
function importFirebaseData(idleonData, guildId, firebaseData) {
  const config = { ...(defaultConfigFallback()), ...(idleonData.config || {}) };
  const wk = currentWeekKey();
  const map = {};
  (idleonData.members || []).forEach(m => { map[String(m.name || '').toLowerCase()] = m; });

  // Store guild-level totalGp and bonus levels
  const guild = (idleonData.guilds || []).find(g => g.id === guildId);
  if (guild) {
    if (firebaseData.totalGp) guild.totalGp = firebaseData.totalGp;
    if (firebaseData.bonusLevels && firebaseData.bonusLevels.length) guild.bonusLevels = firebaseData.bonusLevels;
  }

  const importedNames = new Set();

  for (const fbMember of firebaseData.members) {
    const name = fbMember.name;
    if (!name) continue;
    const key = name.toLowerCase();
    importedNames.add(key);

    let existing = map[key];
    if (!existing) {
      // New member
      existing = {
        name,
        guildId,
        totalGp: 0,
        weeklyGp: 0,
        allTimeBaseline: 0,
        weeklyHistory: [],
        discordId: '',
        lastGpDate: null,
        joinedTracking: Date.now(),
        status: config.probationWeeks > 0 ? 'probation' : 'active',
        loaStart: null, loaEnd: null, loaReason: '',
        streakCurrent: 0, streakBest: 0,
        notes: [], timeline: [],
        probationEnd: config.probationWeeks > 0 ? Date.now() + (config.probationWeeks * 7 * 86400000) : null,
        probationMinGp: config.probationMinGp || 0,
        updatedAt: Date.now()
      };
      existing.timeline.push({ event: 'joined', date: Date.now(), details: 'Detected via Firebase poll' });
      map[key] = existing;
      if (!Array.isArray(idleonData.members)) idleonData.members = [];
      idleonData.members.push(existing);
    }

    // Update guild assignment
    existing.guildId = guildId;

    // Firebase gives us *total* gpEarned (cumulative, never resets), not weekly delta.
    // Compare with previous known total to compute the delta.
    const prevTotal = Number(existing._firebaseGpTotal || 0);
    const currentTotal = fbMember.gpEarned;

    // Track the Firebase total at the start of each week for accurate weekly GP
    // When a new week starts, snapshot the previous Firebase total as the week-start baseline
    const prevWeekKey = existing._firebaseGpWeekKey || '';
    if (prevWeekKey && prevWeekKey !== wk) {
      // New week started — save the last total as this week's start baseline
      existing._firebaseGpWeekStartTotal = prevTotal;
    } else if (!existing._firebaseGpWeekStartTotal && existing._firebaseGpWeekStartTotal !== 0) {
      // First time tracking — use current total as week start (conservative)
      existing._firebaseGpWeekStartTotal = prevTotal || currentTotal;
    }
    existing._firebaseGpWeekKey = wk;

    if (prevTotal === 0 && existing.weeklyHistory.length === 0) {
      // First time seeing this member — set baseline, no weekly credit yet
      existing.allTimeBaseline = currentTotal;
      existing.totalGp = currentTotal;
      existing._firebaseGpWeekStartTotal = currentTotal;
    } else if (currentTotal > prevTotal) {
      // GP increased — credit the delta to the current week
      const delta = currentTotal - prevTotal;
      let hist = Array.isArray(existing.weeklyHistory) ? existing.weeklyHistory : [];
      let weekEntry = hist.find(h => h.weekStart === wk);
      if (!weekEntry) {
        weekEntry = { weekStart: wk, gp: 0 };
        hist.push(weekEntry);
      }
      weekEntry.gp += delta;
      existing.weeklyHistory = hist.slice(-156);
      existing.totalGp = (Number(existing.allTimeBaseline) || 0) + hist.reduce((s, h) => s + h.gp, 0);
      existing.weeklyGp = weekEntry.gp;
      existing.lastGpDate = Date.now();
    }

    // Legacy fix: if allTimeBaseline was never set (left at 0) but member has
    // cumulative GP, the initial import dumped everything as weekly deltas.
    // Fix the baseline and clear the bogus current-week history entry.
    if (existing.allTimeBaseline === 0 && currentTotal > 0 && prevTotal > 0) {
      const hist = Array.isArray(existing.weeklyHistory) ? existing.weeklyHistory : [];
      const curWeek = hist.find(h => h.weekStart === wk);
      if (curWeek && curWeek.gp >= currentTotal) {
        // Current week's "delta" is >= cumulative total — clearly an artifact
        curWeek.gp = 0;
        existing.allTimeBaseline = currentTotal;
        existing.totalGp = existing.allTimeBaseline + hist.reduce((s, h) => s + h.gp, 0);
        existing.weeklyGp = 0;
      }
    }

    // Always update snapshot total for next diff comparison
    existing._firebaseGpTotal = currentTotal;

    // Update level, rank, and bonus from Firebase
    existing._firebaseLevel = fbMember.level;
    existing._firebaseRank = fbMember.rank;
    existing._firebaseBonusIndex = fbMember.wantedBonusIndex;

    existing.updatedAt = Date.now();
  }

  // Detect members who left the guild
  for (const m of idleonData.members) {
    if (m.guildId === guildId && !importedNames.has(m.name.toLowerCase()) && m.status !== 'kicked') {
      if (m.status !== 'loa') {
        m.timeline = m.timeline || [];
        m.timeline.push({ event: 'left', date: Date.now(), details: 'Not found in Firebase guild data' });
      }
    }
  }

  // Update import log
  if (!Array.isArray(idleonData.importLog)) idleonData.importLog = [];
  idleonData.importLog.push({
    date: Date.now(),
    weekKey: wk,
    guildId,
    count: firebaseData.memberCount,
    added: 0,
    source: 'firebase',
    importedBy: 'firebase-poll'
  });
  if (idleonData.importLog.length > 200) idleonData.importLog = idleonData.importLog.slice(-200);
}

// Minimal config fallback (avoids importing from idleon-routes)
function defaultConfigFallback() {
  return { warningDays: 7, kickThresholdDays: 14, minWeeklyGp: 0, probationWeeks: 2, probationMinGp: 5000 };
}

function currentWeekKey() {
  const x = new Date();
  x.setHours(0, 0, 0, 0);
  const wd = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - wd);
  return x.toISOString().slice(0, 10);
}

// ── Polling Timer ────────────────────────────────────────────────────
function startPolling(intervalMs) {
  stopPolling();
  const interval = Math.max(60000, intervalMs || 3600000); // min 1 minute, default 1 hour
  pollTimer = setInterval(async () => {
    try {
      await pollAllGuilds();
    } catch (e) {
      if (_deps?.addLog) _deps.addLog(`[IdleOn Firebase] Poll error: ${e.message}`);
    }
  }, interval);
  if (_deps?.addLog) _deps.addLog(`[IdleOn Firebase] Polling started (every ${Math.round(interval / 60000)} min)`);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

// ── Public API ───────────────────────────────────────────────────────
export function initIdleonFirebase(deps) {
  _deps = deps;
  _tokenPath = path.join(deps.DATA_DIR, 'idleon-firebase-tokens.json');
  _snapshotDir = path.join(deps.DATA_DIR, 'idleon-snapshots');

  // Auto-start polling if we have stored tokens and guilds
  const tokens = loadTokens();
  if (tokens) {
    try {
      initFirebase();
      // Don't authenticate yet — will auth lazily on first poll
      const gpPath = path.join(deps.DATA_DIR, 'idleon-gp.json');
      const gpData = deps.loadJSON(gpPath, { guilds: [] });
      if (gpData.guilds?.length > 0) {
        startPolling(3600000); // 1 hour
        if (deps.addLog) deps.addLog(`[IdleOn Firebase] Auto-started polling for ${gpData.guilds.length} guild(s) (connected as ${tokens.email})`);
      }
    } catch (e) {
      if (deps.addLog) deps.addLog(`[IdleOn Firebase] Init warning: ${e.message}`);
    }
  }
}

export function getFirebaseStatus() {
  const tokens = loadTokens();
  return {
    connected: !!tokens,
    email: tokens?.email || '',
    connectedAt: tokens?.connectedAt || null,
    polling: !!pollTimer,
    pendingAuth: pendingDeviceAuth && !pendingDeviceAuth.resolved ? {
      userCode: pendingDeviceAuth.userCode,
      verificationUrl: pendingDeviceAuth.verificationUrl,
      expiresAt: pendingDeviceAuth.expiresAt
    } : null
  };
}

export async function firebaseStartAuth() {
  initFirebase();
  return await startDeviceCodeFlow();
}

export function firebaseCheckAuth() {
  if (!pendingDeviceAuth) return { status: 'none' };
  if (!pendingDeviceAuth.resolved) return { status: 'pending', userCode: pendingDeviceAuth.userCode, verificationUrl: pendingDeviceAuth.verificationUrl };
  if (pendingDeviceAuth.error) return { status: 'error', error: pendingDeviceAuth.error };
  return { status: 'success', email: pendingDeviceAuth.email };
}

export function firebaseDisconnect() {
  stopPolling();
  deleteTokens();
  pendingDeviceAuth = null;
  if (firebaseAuth?.currentUser) {
    firebaseAuth.signOut().catch(() => {});
  }
}

export async function firebaseSearchGuilds(name) {
  return await searchGuildsByName(name);
}

export async function firebaseRefreshGuilds() {
  return await pollAllGuilds();
}

export function firebaseStartPolling(intervalMs) {
  startPolling(intervalMs || 3600000);
}

export function firebaseStopPolling() {
  stopPolling();
}

export function getSnapshotHistory(guildId) {
  return {
    latest: loadLatestSnapshot(guildId),
    diffs: loadDiffHistory(guildId)
  };
}
