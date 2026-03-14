import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import {
  initIdleonFirebase, getFirebaseStatus, firebaseStartAuth, firebaseCheckAuth,
  firebaseDisconnect, firebaseSearchGuilds, firebaseRefreshGuilds,
  firebaseStartPolling, firebaseStopPolling, getSnapshotHistory
} from '../idleon-firebase.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../..');

/**
 * Idleon Guild Manager v2 — Complete API routes
 * Covers: GP tracking, inactivity detection, kick risk scoring, role milestones,
 * multi-guild management, watchlist/kick queue, LOA, waitlist, member linking,
 * forum/channel scraping, weekly digest, and member timeline.
 */
export function registerIdleonRoutes(app, deps) {
  const {
    addLog, client, dashAudit, debouncedSaveState,
    loadJSON, membersCache, requireAuth, requireTier,
    saveJSON, DATA_DIR
  } = deps;

  const IDLEON_GP_PATH = path.join(DATA_DIR, 'idleon-gp.json');

  // --- Helpers ---
  function loadIdleon() {
    return loadJSON(IDLEON_GP_PATH, {
      members: [], guilds: [], entries: [], notes: '',
      config: defaultConfig(), kickLog: [], waitlist: [], importLog: [],
      updatedAt: null
    });
  }

  function saveIdleon(data) {
    data.updatedAt = Date.now();
    return saveJSON(IDLEON_GP_PATH, data);
  }

  function defaultConfig() {
    return {
      warningDays: 7,
      kickThresholdDays: 14,
      minWeeklyGp: 0,
      probationWeeks: 2,
      probationMinGp: 5000,
      warningDmsEnabled: false,
      digestChannelId: '',
      digestDay: 1, // Monday
      forumChannelId: '',
      loaChannelId: '',
      roleMilestones: [],
      // Auto-kick settings
      autoKickEnabled: false,
      autoKickMinRisk: 70,         // minimum risk score to auto-kick
      autoKickGraceDays: 3,        // days after warning before kick
      autoKickMaxPerCycle: 5,      // max kicks per cycle
      autoKickLogChannelId: '',    // Discord channel for kick logs
      // Per-guild overrides: { guildId: { warningDays, kickThresholdDays, ... } }
      guildOverrides: {}
    };
  }

  function weekKeyFromDate(d) {
    const x = new Date(d || Date.now());
    x.setHours(0, 0, 0, 0);
    const wd = (x.getDay() + 6) % 7;
    x.setDate(x.getDate() - wd);
    return x.toISOString().slice(0, 10);
  }

  function currentWeekKey() { return weekKeyFromDate(Date.now()); }

  function normalizeWeeklyHistory(raw) {
    return (Array.isArray(raw) ? raw : []).map(h => ({
      weekStart: String(h.weekStart || '').slice(0, 10),
      gp: Math.max(0, Number(h.gp || 0))
    })).filter(h => /^\d{4}-\d{2}-\d{2}$/.test(h.weekStart) && Number.isFinite(h.gp));
  }

  function historySum(m) {
    return normalizeWeeklyHistory(m.weeklyHistory).reduce((sum, h) => sum + h.gp, 0);
  }

  function memberAllTimeGp(m) {
    const hist = normalizeWeeklyHistory(m.weeklyHistory);
    const histTotal = hist.reduce((sum, h) => sum + h.gp, 0);
    const baseline = Number(m.allTimeBaseline);
    if (Number.isFinite(baseline)) return Math.max(0, baseline) + histTotal;
    return Number(m.totalGp || 0);
  }

  function memberRangeGp(m, weeks) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const wd = (now.getDay() + 6) % 7;
    now.setDate(now.getDate() - wd - ((Math.max(1, weeks) - 1) * 7));
    const cutoff = now.toISOString().slice(0, 10);
    return normalizeWeeklyHistory(m.weeklyHistory)
      .filter(h => h.weekStart >= cutoff)
      .reduce((sum, h) => sum + h.gp, 0);
  }

  function daysSinceLastGp(m) {
    const hist = normalizeWeeklyHistory(m.weeklyHistory).filter(h => h.gp > 0);
    if (!hist.length) {
      // Fall back to updatedAt if no history
      if (m.joinedTracking) return Math.floor((Date.now() - m.joinedTracking) / 86400000);
      return m.updatedAt ? Math.floor((Date.now() - m.updatedAt) / 86400000) : 999;
    }
    const lastWeek = hist.sort((a, b) => b.weekStart.localeCompare(a.weekStart))[0];
    const lastDate = new Date(lastWeek.weekStart + 'T00:00:00Z');
    return Math.max(0, Math.floor((Date.now() - lastDate.getTime()) / 86400000));
  }

  function computeStreak(m) {
    const hist = normalizeWeeklyHistory(m.weeklyHistory).sort((a, b) => b.weekStart.localeCompare(a.weekStart));
    let current = 0;
    let best = Number(m.streakBest || 0);
    // Check consecutive weeks with gp > 0
    const weekKeys = [];
    let wk = new Date();
    wk.setHours(0, 0, 0, 0);
    const wd = (wk.getDay() + 6) % 7;
    wk.setDate(wk.getDate() - wd);
    for (let i = 0; i < 156; i++) {
      weekKeys.push(wk.toISOString().slice(0, 10));
      wk.setDate(wk.getDate() - 7);
    }
    const histMap = {};
    hist.forEach(h => { histMap[h.weekStart] = h.gp; });
    for (const k of weekKeys) {
      if ((histMap[k] || 0) > 0) current++;
      else break;
    }
    // Compute best streak from all history
    let streak = 0;
    for (const k of weekKeys) {
      if ((histMap[k] || 0) > 0) {
        streak++;
        if (streak > best) best = streak;
      } else {
        streak = 0;
      }
    }
    return { current, best };
  }

  function computeKickRisk(m, cfg) {
    const days = daysSinceLastGp(m);
    const threshold = cfg.kickThresholdDays || 14;
    // 40% inactivity
    const inactivityScore = Math.min(1, days / Math.max(1, threshold)) * 40;
    // 25% GP trend (last 4 weeks vs prior 4 weeks)
    const recent4w = memberRangeGp(m, 4);
    const prior4w = memberRangeGp(m, 8) - recent4w;
    let trendScore = 0;
    if (prior4w > 0) {
      const ratio = recent4w / prior4w;
      trendScore = Math.max(0, 1 - ratio) * 25;
    } else if (recent4w === 0) {
      trendScore = 25;
    }
    // 20% historical contribution (more history = lower risk)
    const allTime = memberAllTimeGp(m);
    const contribScore = Math.max(0, 20 - Math.min(20, allTime / 5000));
    // 15% consistency
    const { current } = computeStreak(m);
    const consistencyScore = Math.max(0, 15 - Math.min(15, current * 3));
    const total = Math.round(Math.min(100, inactivityScore + trendScore + contribScore + consistencyScore));
    // LOA members get 0 risk
    if (m.status === 'loa') return 0;
    if (m.status === 'exempt') return Math.min(total, 10);
    return total;
  }

  function getInactivityStatus(days, cfg) {
    const warn = cfg.warningDays || 7;
    const kick = cfg.kickThresholdDays || 14;
    if (days >= kick) return 'red';
    if (days >= warn) return 'orange';
    if (days >= Math.ceil(warn / 2)) return 'yellow';
    return 'green';
  }

  function enrichMember(m, cfg) {
    const days = daysSinceLastGp(m);
    const streak = computeStreak(m);
    const risk = computeKickRisk(m, cfg);
    return {
      ...m,
      daysAway: days,
      inactivityStatus: getInactivityStatus(days, cfg),
      kickRiskScore: risk,
      streakCurrent: streak.current,
      streakBest: Math.max(streak.best, Number(m.streakBest || 0)),
      allTimeGp: memberAllTimeGp(m),
      weeklyGp: (() => {
        const wk = currentWeekKey();
        const hist = normalizeWeeklyHistory(m.weeklyHistory);
        const cur = hist.find(h => h.weekStart === wk);
        return cur ? cur.gp : 0;
      })(),
      gp4w: memberRangeGp(m, 4),
      gp12w: memberRangeGp(m, 12)
    };
  }

  function normalizeMember(raw) {
    return {
      name: String(raw.name || '').trim(),
      guildId: String(raw.guildId || '').trim(),
      totalGp: Math.max(0, Number(raw.totalGp || 0)),
      weeklyGp: Math.max(0, Number(raw.weeklyGp || 0)),
      allTimeBaseline: Number.isFinite(Number(raw.allTimeBaseline)) ? Math.max(0, Number(raw.allTimeBaseline)) : 0,
      weeklyHistory: normalizeWeeklyHistory(raw.weeklyHistory).slice(-156),
      discordId: String(raw.discordId || '').trim(),
      lastGpDate: Number(raw.lastGpDate || 0) || null,
      joinedTracking: Number(raw.joinedTracking || 0) || Date.now(),
      status: ['active', 'probation', 'watchlist', 'loa', 'kicked', 'exempt'].includes(raw.status) ? raw.status : 'active',
      loaStart: Number(raw.loaStart || 0) || null,
      loaEnd: Number(raw.loaEnd || 0) || null,
      loaReason: String(raw.loaReason || '').slice(0, 300),
      streakCurrent: Number(raw.streakCurrent || 0),
      streakBest: Number(raw.streakBest || 0),
      notes: (Array.isArray(raw.notes) ? raw.notes : []).slice(-50).map(n => ({
        text: String(n.text || '').slice(0, 500),
        date: Number(n.date || Date.now()),
        author: String(n.author || '').slice(0, 50)
      })),
      timeline: (Array.isArray(raw.timeline) ? raw.timeline : []).slice(-200).map(e => ({
        event: String(e.event || '').slice(0, 50),
        date: Number(e.date || Date.now()),
        details: String(e.details || '').slice(0, 500)
      })),
      probationEnd: Number(raw.probationEnd || 0) || null,
      probationMinGp: Number(raw.probationMinGp || 0),
      updatedAt: Number(raw.updatedAt || Date.now())
    };
  }

  function addTimeline(member, event, details) {
    if (!Array.isArray(member.timeline)) member.timeline = [];
    member.timeline.push({ event, date: Date.now(), details });
    if (member.timeline.length > 200) member.timeline = member.timeline.slice(-200);
  }

  function findMemberByName(members, name) {
    const lower = String(name || '').toLowerCase().trim();
    return members.find(m => String(m.name || '').toLowerCase().trim() === lower);
  }

  // ================================================================
  // API ENDPOINTS
  // ================================================================

  // --- Load all data (enriched) ---
  app.get('/api/idleon/gp', requireAuth, requireTier('viewer'), (req, res) => {
    const data = loadIdleon();
    const cfg = { ...defaultConfig(), ...(data.config || {}) };
    const enriched = (data.members || []).map(m => enrichMember(m, cfg));
    res.json({
      success: true,
      members: enriched,
      guilds: data.guilds || [],
      config: cfg,
      kickLog: (data.kickLog || []).slice(-200),
      waitlist: data.waitlist || [],
      importLog: (data.importLog || []).slice(-50),
      notes: data.notes || '',
      updatedAt: data.updatedAt
    });
  });

  // --- Save full data (admin) ---
  app.post('/api/idleon/gp/save', requireAuth, requireTier('admin'), (req, res) => {
    const payload = req.body || {};
    const members = Array.isArray(payload.members) ? payload.members : [];
    const guilds = Array.isArray(payload.guilds) ? payload.guilds : [];

    const normalizedMembers = members.map(normalizeMember)
      .filter(m => m.name)
      .slice(0, 1000);

    const normalizedGuilds = guilds
      .map(g => ({ id: String(g.id || '').trim(), name: String(g.name || '').trim() }))
      .filter(g => g.id && g.name)
      .slice(0, 10);

    const existing = loadIdleon();
    const output = {
      ...existing,
      members: normalizedMembers,
      guilds: normalizedGuilds,
      notes: typeof payload.notes === 'string' ? payload.notes.slice(0, 5000) : (existing.notes || '')
    };
    saveIdleon(output);
    dashAudit(req.userName, 'idleon-gp-save', `Saved IdleOn GP data (${normalizedMembers.length} members)`);
    res.json({ success: true });
  });

  // --- Import GP data (the main flow) ---
  app.post('/api/idleon/import', requireAuth, requireTier('admin'), (req, res) => {
    try {
      const { members: imported, guildId } = req.body || {};
      if (!Array.isArray(imported) || !imported.length) {
        return res.json({ success: false, error: 'No member data provided' });
      }

      const data = loadIdleon();
      const cfg = { ...defaultConfig(), ...(data.config || {}) };
      const wk = currentWeekKey();
      const map = {};
      data.members.forEach(m => { map[String(m.name || '').toLowerCase()] = m; });

      const diff = { added: [], returned: [], disappeared: [], updated: 0 };
      const importedNames = new Set();

      for (const incoming of imported.slice(0, 1000)) {
        const name = String(incoming.name || incoming.member || incoming.player || incoming.username || '').trim();
        if (!name) continue;
        const key = name.toLowerCase();
        importedNames.add(key);

        const weeklyVal = Math.max(0, Number(incoming.gpEarned ?? incoming.weeklyGp ?? incoming.weekly ?? 0) || 0);
        const hasTotal = incoming.totalGp != null || incoming.gpTotal != null || incoming.currentGp != null || incoming.gp != null;
        const totalVal = Math.max(0, Number(incoming.totalGp ?? incoming.gpTotal ?? incoming.currentGp ?? incoming.gp ?? 0) || 0);

        let existing = map[key];
        if (!existing) {
          // Check if they were previously kicked (returned player)
          const wasKicked = (data.kickLog || []).find(k => String(k.memberName || '').toLowerCase() === key);
          existing = normalizeMember({
            name,
            guildId: guildId || '',
            joinedTracking: Date.now(),
            status: cfg.probationWeeks > 0 ? 'probation' : 'active',
            probationEnd: cfg.probationWeeks > 0 ? Date.now() + (cfg.probationWeeks * 7 * 86400000) : null,
            probationMinGp: cfg.probationMinGp || 0
          });
          addTimeline(existing, 'joined', wasKicked ? `Returned (previously kicked ${new Date(wasKicked.date).toLocaleDateString()})` : 'First import detection');
          if (wasKicked) {
            diff.returned.push(name);
          } else {
            diff.added.push(name);
          }
          map[key] = existing;
          data.members.push(existing);
        }

        if (guildId) existing.guildId = guildId;

        // Ensure baseline
        const hist = normalizeWeeklyHistory(existing.weeklyHistory);
        const histTotal = hist.reduce((s, h) => s + h.gp, 0);
        if (!Number.isFinite(Number(existing.allTimeBaseline))) {
          existing.allTimeBaseline = hist.length
            ? Math.max(0, Number(existing.totalGp || 0) - histTotal)
            : Math.max(0, Number(existing.totalGp || 0) - Number(existing.weeklyGp || 0));
        }
        existing.allTimeBaseline = Math.max(0, Number(existing.allTimeBaseline || 0));

        // Add to current week
        let weekEntry = hist.find(h => h.weekStart === wk);
        if (!weekEntry) {
          weekEntry = { weekStart: wk, gp: 0 };
          hist.push(weekEntry);
        }
        weekEntry.gp += weeklyVal;
        existing.weeklyHistory = hist.slice(-156);

        // Update baseline from total if provided
        if (hasTotal && totalVal > 0) {
          const newHistTotal = existing.weeklyHistory.reduce((s, h) => s + h.gp, 0);
          const proposedBaseline = Math.max(0, totalVal - newHistTotal);
          existing.allTimeBaseline = Math.max(Number(existing.allTimeBaseline || 0), proposedBaseline);
        }

        // Update computed fields
        existing.totalGp = Number(existing.allTimeBaseline || 0) + existing.weeklyHistory.reduce((s, h) => s + h.gp, 0);
        existing.weeklyGp = weekEntry.gp;
        existing.updatedAt = Date.now();
        if (weeklyVal > 0) existing.lastGpDate = Date.now();

        // Update streak
        const streak = computeStreak(existing);
        existing.streakCurrent = streak.current;
        existing.streakBest = Math.max(streak.best, Number(existing.streakBest || 0));

        diff.updated++;
      }

      // Detect disappeared members (in data but not in this import from same guild)
      if (guildId) {
        for (const m of data.members) {
          if (m.guildId === guildId && !importedNames.has(m.name.toLowerCase()) && m.status !== 'kicked') {
            diff.disappeared.push(m.name);
          }
        }
      }

      // Log the import
      if (!Array.isArray(data.importLog)) data.importLog = [];
      data.importLog.push({
        date: Date.now(),
        weekKey: wk,
        guildId: guildId || 'unknown',
        count: imported.length,
        added: diff.added.length,
        returned: diff.returned.length,
        disappeared: diff.disappeared.length,
        importedBy: req.userName || 'system'
      });
      if (data.importLog.length > 100) data.importLog = data.importLog.slice(-100);

      saveIdleon(data);
      dashAudit(req.userName, 'idleon-import', `Imported ${imported.length} members for week ${wk} (guild: ${guildId || 'N/A'})`);

      res.json({ success: true, weekKey: wk, diff });
    } catch (e) {
      res.json({ success: false, error: e.message });
    }
  });

  // --- Config ---
  app.get('/api/idleon/config', requireAuth, requireTier('admin'), (req, res) => {
    const data = loadIdleon();
    res.json({ success: true, config: { ...defaultConfig(), ...(data.config || {}) } });
  });

  app.post('/api/idleon/config', requireAuth, requireTier('admin'), (req, res) => {
    const data = loadIdleon();
    const cfg = req.body || {};
    const validated = {
      warningDays: Math.max(1, Math.min(60, Number(cfg.warningDays) || 7)),
      kickThresholdDays: Math.max(1, Math.min(90, Number(cfg.kickThresholdDays) || 14)),
      minWeeklyGp: Math.max(0, Math.min(999999, Number(cfg.minWeeklyGp) || 0)),
      probationWeeks: Math.max(0, Math.min(12, Number(cfg.probationWeeks) || 2)),
      probationMinGp: Math.max(0, Math.min(999999, Number(cfg.probationMinGp) || 5000)),
      warningDmsEnabled: !!cfg.warningDmsEnabled,
      digestChannelId: String(cfg.digestChannelId || '').slice(0, 25),
      digestDay: Math.max(0, Math.min(6, Number(cfg.digestDay) || 1)),
      forumChannelId: String(cfg.forumChannelId || '').slice(0, 25),
      loaChannelId: String(cfg.loaChannelId || '').slice(0, 25),
      autoKickEnabled: !!cfg.autoKickEnabled,
      autoKickMinRisk: Math.max(30, Math.min(100, Number(cfg.autoKickMinRisk) || 70)),
      autoKickGraceDays: Math.max(1, Math.min(14, Number(cfg.autoKickGraceDays) || 3)),
      autoKickMaxPerCycle: Math.max(1, Math.min(20, Number(cfg.autoKickMaxPerCycle) || 5)),
      autoKickLogChannelId: String(cfg.autoKickLogChannelId || '').slice(0, 25),
      roleMilestones: (Array.isArray(cfg.roleMilestones) ? cfg.roleMilestones : []).slice(0, 20).map(r => ({
        gpThreshold: Math.max(0, Number(r.gpThreshold || 0)),
        roleId: String(r.roleId || '').slice(0, 25),
        roleName: String(r.roleName || '').slice(0, 50)
      })).filter(r => r.gpThreshold > 0 && r.roleId),
      guildOverrides: typeof cfg.guildOverrides === 'object' && cfg.guildOverrides ? cfg.guildOverrides : {}
    };
    data.config = validated;
    saveIdleon(data);
    dashAudit(req.userName, 'idleon-config', 'Updated IdleOn config');
    res.json({ success: true, config: validated });
  });

  // --- Guilds CRUD ---
  app.post('/api/idleon/guilds', requireAuth, requireTier('admin'), (req, res) => {
    const data = loadIdleon();
    const { id, name } = req.body || {};
    const gId = String(id || crypto.randomUUID()).trim().slice(0, 50);
    const gName = String(name || '').trim().slice(0, 100);
    if (!gName) return res.json({ success: false, error: 'Guild name required' });
    if (!Array.isArray(data.guilds)) data.guilds = [];
    if (data.guilds.length >= 10) return res.json({ success: false, error: 'Max 10 guilds' });
    const existing = data.guilds.find(g => g.id === gId);
    if (existing) {
      existing.name = gName;
    } else {
      data.guilds.push({ id: gId, name: gName });
    }
    saveIdleon(data);
    res.json({ success: true, guilds: data.guilds });
  });

  app.post('/api/idleon/guilds/delete', requireAuth, requireTier('admin'), (req, res) => {
    const data = loadIdleon();
    const { id } = req.body || {};
    data.guilds = (data.guilds || []).filter(g => g.id !== id);
    saveIdleon(data);
    res.json({ success: true });
  });

  // --- Member actions ---
  app.post('/api/idleon/member/note', requireAuth, requireTier('admin'), (req, res) => {
    const { name, text } = req.body || {};
    if (!name || !text) return res.json({ success: false, error: 'Name and text required' });
    const data = loadIdleon();
    const member = findMemberByName(data.members, name);
    if (!member) return res.json({ success: false, error: 'Member not found' });
    if (!Array.isArray(member.notes)) member.notes = [];
    member.notes.push({ text: String(text).slice(0, 500), date: Date.now(), author: req.userName || 'admin' });
    if (member.notes.length > 50) member.notes = member.notes.slice(-50);
    addTimeline(member, 'note', text.slice(0, 100));
    saveIdleon(data);
    res.json({ success: true });
  });

  app.post('/api/idleon/member/status', requireAuth, requireTier('admin'), (req, res) => {
    const { name, status, loaEnd, loaReason } = req.body || {};
    if (!name) return res.json({ success: false, error: 'Name required' });
    const validStatuses = ['active', 'probation', 'watchlist', 'loa', 'kicked', 'exempt'];
    if (!validStatuses.includes(status)) return res.json({ success: false, error: 'Invalid status' });
    const data = loadIdleon();
    const member = findMemberByName(data.members, name);
    if (!member) return res.json({ success: false, error: 'Member not found' });
    const oldStatus = member.status;
    member.status = status;
    if (status === 'loa') {
      member.loaStart = Date.now();
      member.loaEnd = Number(loaEnd) || (Date.now() + 14 * 86400000);
      member.loaReason = String(loaReason || '').slice(0, 300);
    } else {
      member.loaStart = null;
      member.loaEnd = null;
      member.loaReason = '';
    }
    addTimeline(member, 'status-change', `${oldStatus} → ${status}${status === 'loa' ? ` (${member.loaReason})` : ''}`);
    if (status === 'kicked') {
      if (!Array.isArray(data.kickLog)) data.kickLog = [];
      data.kickLog.push({
        memberName: member.name,
        date: Date.now(),
        reason: member.notes?.length ? member.notes[member.notes.length - 1].text : 'Inactivity',
        kickedBy: req.userName || 'admin',
        guildId: member.guildId || '',
        allTimeGp: memberAllTimeGp(member),
        daysInactive: daysSinceLastGp(member)
      });
      if (data.kickLog.length > 500) data.kickLog = data.kickLog.slice(-500);
    }
    saveIdleon(data);
    dashAudit(req.userName, 'idleon-member-status', `${member.name}: ${oldStatus} → ${status}`);
    res.json({ success: true });
  });

  app.post('/api/idleon/member/link', requireAuth, requireTier('admin'), (req, res) => {
    const { name, discordId } = req.body || {};
    if (!name) return res.json({ success: false, error: 'Name required' });
    const data = loadIdleon();
    const member = findMemberByName(data.members, name);
    if (!member) return res.json({ success: false, error: 'Member not found' });
    member.discordId = String(discordId || '').trim().slice(0, 25);
    addTimeline(member, 'linked', discordId ? `Linked to Discord ${discordId}` : 'Discord link removed');
    saveIdleon(data);
    res.json({ success: true });
  });

  app.post('/api/idleon/member/transfer', requireAuth, requireTier('admin'), (req, res) => {
    const { name, toGuildId } = req.body || {};
    if (!name || !toGuildId) return res.json({ success: false, error: 'Name and target guild required' });
    const data = loadIdleon();
    const member = findMemberByName(data.members, name);
    if (!member) return res.json({ success: false, error: 'Member not found' });
    const oldGuild = member.guildId;
    member.guildId = String(toGuildId).trim();
    addTimeline(member, 'transfer', `Transferred from ${oldGuild || '(none)'} to ${member.guildId}`);
    saveIdleon(data);
    dashAudit(req.userName, 'idleon-transfer', `${member.name}: guild ${oldGuild} → ${member.guildId}`);
    res.json({ success: true });
  });

  // --- Bulk actions ---
  app.post('/api/idleon/bulk-action', requireAuth, requireTier('admin'), (req, res) => {
    const { names, action, extra } = req.body || {};
    if (!Array.isArray(names) || !names.length || !action) {
      return res.json({ success: false, error: 'Names array and action required' });
    }
    const validActions = ['watchlist', 'active', 'kicked', 'exempt', 'loa'];
    if (!validActions.includes(action)) return res.json({ success: false, error: 'Invalid action' });
    const data = loadIdleon();
    let count = 0;
    for (const name of names.slice(0, 100)) {
      const member = findMemberByName(data.members, name);
      if (!member) continue;
      const oldStatus = member.status;
      member.status = action;
      if (action === 'loa') {
        member.loaStart = Date.now();
        member.loaEnd = Number(extra?.loaEnd) || (Date.now() + 14 * 86400000);
        member.loaReason = String(extra?.loaReason || 'Bulk LOA').slice(0, 300);
      }
      if (action === 'kicked') {
        if (!Array.isArray(data.kickLog)) data.kickLog = [];
        data.kickLog.push({
          memberName: member.name, date: Date.now(),
          reason: 'Bulk kick action', kickedBy: req.userName || 'admin',
          guildId: member.guildId || '', allTimeGp: memberAllTimeGp(member),
          daysInactive: daysSinceLastGp(member)
        });
      }
      addTimeline(member, 'bulk-action', `${oldStatus} → ${action}`);
      count++;
    }
    if (data.kickLog?.length > 500) data.kickLog = data.kickLog.slice(-500);
    saveIdleon(data);
    dashAudit(req.userName, 'idleon-bulk', `Bulk ${action} on ${count} members`);
    res.json({ success: true, affected: count });
  });

  // --- Smart kick order ---
  app.get('/api/idleon/kick-candidates', requireAuth, requireTier('admin'), (req, res) => {
    const count = Math.max(1, Math.min(50, Number(req.query.count) || 5));
    const guildId = req.query.guildId || '';
    const data = loadIdleon();
    const cfg = { ...defaultConfig(), ...(data.config || {}) };

    let candidates = data.members
      .filter(m => m.status !== 'kicked' && m.status !== 'loa' && m.status !== 'exempt')
      .filter(m => !guildId || m.guildId === guildId)
      .map(m => enrichMember(m, cfg))
      .sort((a, b) => b.kickRiskScore - a.kickRiskScore);

    const result = candidates.slice(0, count);

    // Projection: what happens if we kick these
    const activeMembers = data.members.filter(m => m.status !== 'kicked');
    const currentTotalGp = activeMembers.reduce((s, m) => s + memberAllTimeGp(m), 0);
    const currentAvgGp = activeMembers.length ? currentTotalGp / activeMembers.length : 0;
    const kickGp = result.reduce((s, m) => s + m.allTimeGp, 0);
    const afterCount = activeMembers.length - result.length;
    const afterAvgGp = afterCount > 0 ? (currentTotalGp - kickGp) / afterCount : 0;

    res.json({
      success: true,
      candidates: result,
      projection: {
        currentMembers: activeMembers.length,
        afterMembers: afterCount,
        currentAvgGp: Math.round(currentAvgGp),
        afterAvgGp: Math.round(afterAvgGp),
        avgGpChange: Math.round(afterAvgGp - currentAvgGp),
        avgGpChangePercent: currentAvgGp > 0 ? ((afterAvgGp - currentAvgGp) / currentAvgGp * 100).toFixed(1) : '0'
      },
      nextOnWaitlist: (data.waitlist || []).filter(w => w.status !== 'recruited').slice(0, count)
    });
  });

  // --- Waitlist ---
  app.get('/api/idleon/waitlist', requireAuth, requireTier('viewer'), (req, res) => {
    const data = loadIdleon();
    res.json({ success: true, waitlist: data.waitlist || [] });
  });

  app.post('/api/idleon/waitlist', requireAuth, requireTier('admin'), (req, res) => {
    const { name, notes, priority, source } = req.body || {};
    if (!name) return res.json({ success: false, error: 'Name required' });
    const data = loadIdleon();
    if (!Array.isArray(data.waitlist)) data.waitlist = [];
    if (data.waitlist.length >= 200) return res.json({ success: false, error: 'Waitlist full (200 max)' });
    // Check for duplicate
    if (data.waitlist.some(w => w.name.toLowerCase() === name.toLowerCase().trim())) {
      return res.json({ success: false, error: 'Already on waitlist' });
    }
    data.waitlist.push({
      id: crypto.randomUUID(),
      name: String(name).trim().slice(0, 50),
      addedAt: Date.now(),
      notes: String(notes || '').slice(0, 500),
      priority: Math.max(0, Math.min(10, Number(priority) || 5)),
      source: String(source || 'manual').slice(0, 50),
      status: 'waiting'
    });
    saveIdleon(data);
    res.json({ success: true });
  });

  app.post('/api/idleon/waitlist/update', requireAuth, requireTier('admin'), (req, res) => {
    const { id, status, notes } = req.body || {};
    const data = loadIdleon();
    const entry = (data.waitlist || []).find(w => w.id === id);
    if (!entry) return res.json({ success: false, error: 'Not found' });
    if (status) entry.status = String(status).slice(0, 20);
    if (notes !== undefined) entry.notes = String(notes).slice(0, 500);
    saveIdleon(data);
    res.json({ success: true });
  });

  app.post('/api/idleon/waitlist/delete', requireAuth, requireTier('admin'), (req, res) => {
    const { id } = req.body || {};
    const data = loadIdleon();
    data.waitlist = (data.waitlist || []).filter(w => w.id !== id);
    saveIdleon(data);
    res.json({ success: true });
  });

  // --- Kick log ---
  app.get('/api/idleon/kick-log', requireAuth, requireTier('viewer'), (req, res) => {
    const data = loadIdleon();
    res.json({ success: true, kickLog: (data.kickLog || []).slice(-200) });
  });

  // --- Ghost detection (Discord ↔ Idleon) ---
  app.get('/api/idleon/ghosts', requireAuth, requireTier('admin'), (req, res) => {
    const data = loadIdleon();
    const members = membersCache?.members || {};
    const cfg = { ...defaultConfig(), ...(data.config || {}) };

    // Find Idleon members not linked to any Discord member
    const unlinked = data.members
      .filter(m => m.status !== 'kicked' && !m.discordId)
      .map(m => {
        // Try auto-match by name
        const match = Object.values(members).find(dm =>
          dm.username?.toLowerCase() === m.name.toLowerCase() ||
          dm.displayName?.toLowerCase() === m.name.toLowerCase()
        );
        return {
          idleonName: m.name,
          guildId: m.guildId,
          suggestedDiscord: match ? { id: match.id, username: match.username, displayName: match.displayName } : null
        };
      });

    // Find Discord members with milestone roles but not in Idleon data
    const milestoneRoleIds = new Set((cfg.roleMilestones || []).map(r => r.roleId));
    const idleonDiscordIds = new Set(data.members.filter(m => m.discordId).map(m => m.discordId));
    const discordGhosts = milestoneRoleIds.size > 0
      ? Object.values(members)
        .filter(dm => dm.roles?.some(r => milestoneRoleIds.has(r)) && !idleonDiscordIds.has(dm.id))
        .map(dm => ({ id: dm.id, username: dm.username, displayName: dm.displayName, roles: dm.roles }))
      : [];

    res.json({ success: true, unlinked, discordGhosts });
  });

  // --- Auto-link members by name matching ---
  app.post('/api/idleon/auto-link', requireAuth, requireTier('admin'), (req, res) => {
    const data = loadIdleon();
    const members = membersCache?.members || {};
    let linked = 0;

    for (const m of data.members) {
      if (m.discordId || m.status === 'kicked') continue;
      const match = Object.values(members).find(dm =>
        dm.username?.toLowerCase() === m.name.toLowerCase() ||
        dm.displayName?.toLowerCase() === m.name.toLowerCase()
      );
      if (match) {
        m.discordId = match.id;
        addTimeline(m, 'auto-linked', `Matched to Discord: ${match.username} (${match.id})`);
        linked++;
      }
    }

    if (linked > 0) {
      saveIdleon(data);
      dashAudit(req.userName, 'idleon-auto-link', `Auto-linked ${linked} members`);
    }
    res.json({ success: true, linked });
  });

  // --- Role sync ---
  app.post('/api/idleon/sync-roles', requireAuth, requireTier('admin'), async (req, res) => {
    const data = loadIdleon();
    const cfg = { ...defaultConfig(), ...(data.config || {}) };
    const milestones = (cfg.roleMilestones || []).sort((a, b) => a.gpThreshold - b.gpThreshold);
    if (!milestones.length) return res.json({ success: false, error: 'No role milestones configured' });

    const guild = client?.guilds?.cache?.first();
    if (!guild) return res.json({ success: false, error: 'No Discord guild available' });

    const results = { added: [], removed: [], skipped: [], errors: [] };
    const BATCH_SIZE = 5;
    const BATCH_DELAY = 1500;
    let opsInBatch = 0;

    for (const m of data.members) {
      if (!m.discordId || m.status === 'kicked') continue;
      const allTime = memberAllTimeGp(m);

      try {
        let member = guild.members.cache.get(m.discordId);
        if (!member) {
          member = await guild.members.fetch(m.discordId).catch(() => null);
        }
        if (!member) {
          results.skipped.push({ name: m.name, reason: 'Not in server' });
          continue;
        }

        for (const milestone of milestones) {
          const role = guild.roles.cache.get(milestone.roleId);
          if (!role) continue;
          const hasRole = member.roles.cache.has(milestone.roleId);

          if (allTime >= milestone.gpThreshold && !hasRole) {
            if (opsInBatch >= BATCH_SIZE) {
              await new Promise(r => setTimeout(r, BATCH_DELAY));
              opsInBatch = 0;
            }
            await member.roles.add(role, `IdleOn GP milestone: ${milestone.gpThreshold.toLocaleString()} GP`);
            results.added.push({ name: m.name, role: role.name, gp: allTime });
            addTimeline(m, 'role-earned', `Earned role ${role.name} (${milestone.gpThreshold.toLocaleString()} GP)`);
            opsInBatch++;
          } else if (allTime < milestone.gpThreshold && hasRole) {
            if (opsInBatch >= BATCH_SIZE) {
              await new Promise(r => setTimeout(r, BATCH_DELAY));
              opsInBatch = 0;
            }
            await member.roles.remove(role, `IdleOn GP below milestone: ${milestone.gpThreshold.toLocaleString()} GP`);
            results.removed.push({ name: m.name, role: role.name, gp: allTime });
            opsInBatch++;
          }
        }
      } catch (e) {
        results.errors.push({ name: m.name, error: e.message });
      }
    }

    saveIdleon(data);
    dashAudit(req.userName, 'idleon-sync-roles', `Synced roles: ${results.added.length} added, ${results.removed.length} removed`);
    res.json({ success: true, results });
  });

  // --- Send warning DMs ---
  app.post('/api/idleon/send-warnings', requireAuth, requireTier('admin'), async (req, res) => {
    const data = loadIdleon();
    const cfg = { ...defaultConfig(), ...(data.config || {}) };
    if (!cfg.warningDmsEnabled) return res.json({ success: false, error: 'Warning DMs are disabled in config' });

    const guild = client?.guilds?.cache?.first();
    if (!guild) return res.json({ success: false, error: 'No Discord guild available' });

    const results = { sent: [], failed: [], skipped: [] };
    const now = Date.now();

    for (const m of data.members) {
      if (!m.discordId || m.status === 'kicked' || m.status === 'loa' || m.status === 'exempt') continue;
      const days = daysSinceLastGp(m);
      const status = getInactivityStatus(days, cfg);
      if (status !== 'orange' && status !== 'red') continue;

      // Don't warn if already warned in last 3 days
      const lastWarning = (m.timeline || []).filter(e => e.event === 'warning-dm').pop();
      if (lastWarning && (now - lastWarning.date) < 3 * 86400000) {
        results.skipped.push({ name: m.name, reason: 'Already warned recently' });
        continue;
      }

      try {
        const user = await client.users.fetch(m.discordId).catch(() => null);
        if (!user) { results.failed.push({ name: m.name, reason: 'User not found' }); continue; }

        const guildName = (data.guilds || []).find(g => g.id === m.guildId)?.name || 'the guild';
        const isLastChance = status === 'red';
        const msg = isLastChance
          ? `⚠️ **Last chance warning** — You haven't earned any GP in **${days} days** in **${guildName}**. You may be removed for inactivity soon. If you're taking a break, please let an officer know!`
          : `👋 Hey! You haven't earned GP in **${days} days** in **${guildName}**. Just a friendly heads-up — if you'll be away for a while, let an officer know so we can mark you as on leave!`;

        await user.send(msg).catch(() => { throw new Error('DMs disabled'); });
        addTimeline(m, 'warning-dm', `${isLastChance ? 'Final' : 'First'} warning sent (${days} days inactive)`);
        results.sent.push({ name: m.name, days, level: isLastChance ? 'final' : 'warning' });
      } catch (e) {
        results.failed.push({ name: m.name, reason: e.message });
      }
    }

    saveIdleon(data);
    dashAudit(req.userName, 'idleon-warnings', `Sent ${results.sent.length} warning DMs`);
    res.json({ success: true, results });
  });

  // --- Auto-kick status ---
  app.get('/api/idleon/auto-kick-status', requireAuth, requireTier('admin'), (req, res) => {
    const data = loadIdleon();
    const cfg = { ...defaultConfig(), ...(data.config || {}) };
    const minRisk = cfg.autoKickMinRisk || 70;
    const graceMs = (cfg.autoKickGraceDays || 3) * 86400000;
    const now = Date.now();

    const atRisk = data.members.filter(m =>
      m.status !== 'kicked' && m.status !== 'loa' && m.status !== 'exempt' &&
      computeKickRisk(m, cfg) >= minRisk
    ).map(m => {
      const lastWarn = (m.timeline || []).filter(e => e.event === 'auto-kick-warning').pop();
      return {
        name: m.name,
        risk: computeKickRisk(m, cfg),
        warned: !!lastWarn,
        warnedAt: lastWarn?.date || null,
        graceExpires: lastWarn ? lastWarn.date + graceMs : null,
        willKick: lastWarn && (now - lastWarn.date >= graceMs) && computeKickRisk(m, cfg) >= minRisk
      };
    }).sort((a, b) => b.risk - a.risk);

    res.json({
      success: true,
      enabled: !!cfg.autoKickEnabled,
      minRisk,
      graceDays: cfg.autoKickGraceDays || 3,
      maxPerCycle: cfg.autoKickMaxPerCycle || 5,
      atRisk
    });
  });

  // --- Forum channel scraping (waitlist) ---
  app.post('/api/idleon/scan-forum', requireAuth, requireTier('admin'), async (req, res) => {
    const data = loadIdleon();
    const cfg = { ...defaultConfig(), ...(data.config || {}) };
    const channelId = cfg.forumChannelId || req.body?.channelId;
    if (!channelId) return res.json({ success: false, error: 'No forum channel configured' });

    try {
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel) return res.json({ success: false, error: 'Channel not found' });

      if (!Array.isArray(data.waitlist)) data.waitlist = [];
      const existingNames = new Set(data.waitlist.map(w => w.name.toLowerCase()));
      const memberNames = new Set(data.members.map(m => m.name.toLowerCase()));
      const added = [];

      // Handle forum channels (threads) or text channels
      let messages = [];
      if (channel.threads) {
        // Forum channel — fetch active threads
        const threads = await channel.threads.fetchActive().catch(() => ({ threads: new Map() }));
        for (const [, thread] of threads.threads) {
          const msgs = await thread.messages.fetch({ limit: 10 }).catch(() => new Map());
          for (const [, msg] of msgs) {
            if (!msg.author?.bot) messages.push(msg);
          }
        }
        // Also fetch archived threads from last 30 days
        const archived = await channel.threads.fetchArchived({ limit: 20 }).catch(() => ({ threads: new Map() }));
        for (const [, thread] of archived.threads) {
          const msgs = await thread.messages.fetch({ limit: 5 }).catch(() => new Map());
          for (const [, msg] of msgs) {
            if (!msg.author?.bot) messages.push(msg);
          }
        }
      } else {
        // Regular text channel
        const fetched = await channel.messages.fetch({ limit: 100 }).catch(() => new Map());
        for (const [, msg] of fetched) {
          if (!msg.author?.bot) messages.push(msg);
        }
      }

      // Extract account names from messages
      // Pattern: look for lines like "IGN: PlayerName" or "Account: PlayerName" or just standalone names
      const namePatterns = [
        /(?:ign|in[- ]?game(?:\s*name)?|account(?:\s*name)?|player(?:\s*name)?|idleon(?:\s*name)?|username)\s*[:=\-]?\s*([A-Za-z0-9_]{3,25})/gi,
        /^([A-Za-z0-9_]{3,25})$/gm
      ];

      for (const msg of messages) {
        const content = msg.content || '';
        for (const pattern of namePatterns) {
          pattern.lastIndex = 0;
          let match;
          while ((match = pattern.exec(content)) !== null) {
            const name = (match[1] || match[0]).trim();
            if (name.length < 3 || name.length > 25) continue;
            const lower = name.toLowerCase();
            if (existingNames.has(lower) || memberNames.has(lower)) continue;
            // Skip common words
            if (['the', 'and', 'for', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one'].includes(lower)) continue;
            existingNames.add(lower);
            data.waitlist.push({
              id: crypto.randomUUID(),
              name,
              addedAt: Date.now(),
              notes: `From forum post by ${msg.author?.username || 'unknown'} (${new Date(msg.createdTimestamp).toLocaleDateString()})`,
              priority: 5,
              source: 'forum',
              status: 'waiting',
              discordId: msg.author?.id || '',
              messageUrl: msg.url || ''
            });
            added.push(name);
          }
        }
      }

      if (data.waitlist.length > 200) data.waitlist = data.waitlist.slice(-200);
      saveIdleon(data);
      dashAudit(req.userName, 'idleon-scan-forum', `Scanned forum: found ${added.length} new waitlist entries`);
      res.json({ success: true, added, total: data.waitlist.length });
    } catch (e) {
      res.json({ success: false, error: e.message });
    }
  });

  // --- LOA channel scraping ---
  app.post('/api/idleon/scan-loa', requireAuth, requireTier('admin'), async (req, res) => {
    const data = loadIdleon();
    const cfg = { ...defaultConfig(), ...(data.config || {}) };
    const channelId = cfg.loaChannelId || req.body?.channelId;
    if (!channelId) return res.json({ success: false, error: 'No LOA channel configured' });

    try {
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel) return res.json({ success: false, error: 'Channel not found' });

      const messages = await channel.messages.fetch({ limit: 100 }).catch(() => new Map());
      const results = { matched: [], unmatched: [] };
      const now = Date.now();
      const thirtyDaysAgo = now - 30 * 86400000;

      for (const [, msg] of messages) {
        if (msg.author?.bot || msg.createdTimestamp < thirtyDaysAgo) continue;
        const content = msg.content || '';

        // Try to match author to a member
        const authorId = msg.author?.id;
        let member = data.members.find(m => m.discordId === authorId && m.status !== 'kicked');
        if (!member) {
          // Try by name
          const authorName = msg.author?.username || '';
          member = data.members.find(m =>
            m.name.toLowerCase() === authorName.toLowerCase() && m.status !== 'kicked'
          );
        }

        if (!member) {
          results.unmatched.push({
            author: msg.author?.username || 'unknown',
            content: content.slice(0, 200),
            date: msg.createdTimestamp
          });
          continue;
        }

        // Already on LOA? Skip
        if (member.status === 'loa') continue;

        // Parse duration from message
        let loaDays = 14; // default 2 weeks
        const durationMatch = content.match(/(\d+)\s*(day|week|month|jour|semaine|mois)/i);
        if (durationMatch) {
          const num = Number(durationMatch[1]);
          const unit = durationMatch[2].toLowerCase();
          if (unit.startsWith('week') || unit.startsWith('semaine')) loaDays = num * 7;
          else if (unit.startsWith('month') || unit.startsWith('mois')) loaDays = num * 30;
          else loaDays = num;
        }
        loaDays = Math.max(1, Math.min(90, loaDays));

        member.status = 'loa';
        member.loaStart = msg.createdTimestamp;
        member.loaEnd = msg.createdTimestamp + loaDays * 86400000;
        member.loaReason = content.slice(0, 300);
        addTimeline(member, 'loa-from-channel', `Auto-detected LOA from #${channel.name}: ${content.slice(0, 100)}`);
        results.matched.push({ name: member.name, days: loaDays, reason: content.slice(0, 100) });
      }

      saveIdleon(data);
      dashAudit(req.userName, 'idleon-scan-loa', `LOA scan: ${results.matched.length} matched, ${results.unmatched.length} unmatched`);
      res.json({ success: true, results });
    } catch (e) {
      res.json({ success: false, error: e.message });
    }
  });

  // --- Weekly digest (manual trigger or scheduled) ---
  app.post('/api/idleon/digest', requireAuth, requireTier('admin'), async (req, res) => {
    const data = loadIdleon();
    const cfg = { ...defaultConfig(), ...(data.config || {}) };
    const channelId = cfg.digestChannelId || req.body?.channelId;
    if (!channelId) return res.json({ success: false, error: 'No digest channel configured' });

    try {
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel) return res.json({ success: false, error: 'Channel not found' });

      const activeMembers = data.members.filter(m => m.status !== 'kicked');
      const totalGp = activeMembers.reduce((s, m) => s + memberAllTimeGp(m), 0);
      const weeklyGp = activeMembers.reduce((s, m) => {
        const wk = currentWeekKey();
        const hist = normalizeWeeklyHistory(m.weeklyHistory);
        const cur = hist.find(h => h.weekStart === wk);
        return s + (cur ? cur.gp : 0);
      }, 0);
      const active = activeMembers.filter(m => daysSinceLastGp(m) < (cfg.warningDays || 7)).length;
      const atRisk = activeMembers.filter(m => {
        const d = daysSinceLastGp(m);
        return d >= (cfg.warningDays || 7) && d < (cfg.kickThresholdDays || 14);
      }).length;
      const inactive = activeMembers.filter(m => daysSinceLastGp(m) >= (cfg.kickThresholdDays || 14)).length;
      const healthPct = activeMembers.length > 0 ? Math.round((active / activeMembers.length) * 100) : 0;

      // Top 5 this week
      const top5 = activeMembers.slice().sort((a, b) => {
        const wk = currentWeekKey();
        const aWk = normalizeWeeklyHistory(a.weeklyHistory).find(h => h.weekStart === wk)?.gp || 0;
        const bWk = normalizeWeeklyHistory(b.weeklyHistory).find(h => h.weekStart === wk)?.gp || 0;
        return bWk - aWk;
      }).slice(0, 5);

      // Recent kicks
      const recentKicks = (data.kickLog || []).filter(k => k.date > Date.now() - 7 * 86400000);

      const embed = {
        color: healthPct >= 80 ? 0x4caf50 : healthPct >= 60 ? 0xff9800 : 0xf44336,
        title: '📊 Weekly IdleOn Guild Report',
        description: `Week of **${currentWeekKey()}**`,
        fields: [
          { name: '👥 Members', value: `${activeMembers.length} total`, inline: true },
          { name: '💚 Active', value: `${active} (${healthPct}%)`, inline: true },
          { name: '⚠️ At Risk', value: `${atRisk}`, inline: true },
          { name: '🔴 Inactive', value: `${inactive}`, inline: true },
          { name: '📈 Weekly GP', value: weeklyGp.toLocaleString(), inline: true },
          { name: '🏆 All-Time GP', value: totalGp.toLocaleString(), inline: true },
          {
            name: '🥇 Top 5 This Week',
            value: top5.map((m, i) => {
              const wk = currentWeekKey();
              const gp = normalizeWeeklyHistory(m.weeklyHistory).find(h => h.weekStart === wk)?.gp || 0;
              return `${['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][i]} **${m.name}** — ${gp.toLocaleString()} GP`;
            }).join('\n') || 'No activity yet'
          }
        ],
        footer: { text: `Guild Health: ${healthPct}%${recentKicks.length ? ` | ${recentKicks.length} kicks this week` : ''}` },
        timestamp: new Date().toISOString()
      };

      await channel.send({ embeds: [embed] });
      res.json({ success: true, healthPct });
    } catch (e) {
      res.json({ success: false, error: e.message });
    }
  });

  // --- LOA expiry check (called by background timer) ---
  function checkLoaExpiry() {
    const data = loadIdleon();
    const now = Date.now();
    let changed = false;
    for (const m of data.members) {
      if (m.status === 'loa' && m.loaEnd && m.loaEnd < now) {
        m.status = 'active';
        m.loaStart = null;
        m.loaEnd = null;
        m.loaReason = '';
        addTimeline(m, 'loa-expired', 'Leave of absence ended automatically');
        changed = true;
      }
      // Probation check
      if (m.status === 'probation' && m.probationEnd && m.probationEnd < now) {
        const recentGp = memberRangeGp(m, Math.ceil((now - (m.joinedTracking || now)) / (7 * 86400000)) || 2);
        if (recentGp >= (m.probationMinGp || 0)) {
          m.status = 'active';
          addTimeline(m, 'probation-passed', `Passed probation with ${recentGp.toLocaleString()} GP`);
        } else {
          m.status = 'watchlist';
          addTimeline(m, 'probation-failed', `Failed probation (${recentGp.toLocaleString()} GP < ${(m.probationMinGp || 0).toLocaleString()} required)`);
        }
        m.probationEnd = null;
        changed = true;
      }
    }
    if (changed) saveIdleon(data);
    return changed;
  }

  // --- GP projection ---
  app.get('/api/idleon/projections', requireAuth, requireTier('viewer'), (req, res) => {
    const data = loadIdleon();
    const cfg = { ...defaultConfig(), ...(data.config || {}) };
    const milestones = (cfg.roleMilestones || []).sort((a, b) => a.gpThreshold - b.gpThreshold);

    const projections = data.members
      .filter(m => m.status !== 'kicked')
      .map(m => {
        // Linear regression on last 8 weeks
        const hist = normalizeWeeklyHistory(m.weeklyHistory)
          .sort((a, b) => b.weekStart.localeCompare(a.weekStart))
          .slice(0, 8);
        if (hist.length < 2) return { name: m.name, weeklyAvg: 0, trend: 'insufficient', nextMilestone: null };

        const weeklyAvg = hist.reduce((s, h) => s + h.gp, 0) / hist.length;
        const allTime = memberAllTimeGp(m);

        // Find next milestone
        let nextMilestone = null;
        for (const ms of milestones) {
          if (allTime < ms.gpThreshold) {
            const remaining = ms.gpThreshold - allTime;
            const weeksToReach = weeklyAvg > 0 ? Math.ceil(remaining / weeklyAvg) : Infinity;
            nextMilestone = {
              roleName: ms.roleName,
              gpNeeded: remaining,
              weeksToReach: weeksToReach === Infinity ? null : weeksToReach
            };
            break;
          }
        }

        // Trend: compare first half vs second half
        const mid = Math.floor(hist.length / 2);
        const recentAvg = hist.slice(0, mid).reduce((s, h) => s + h.gp, 0) / Math.max(1, mid);
        const olderAvg = hist.slice(mid).reduce((s, h) => s + h.gp, 0) / Math.max(1, hist.length - mid);
        const trend = recentAvg > olderAvg * 1.1 ? 'rising' : recentAvg < olderAvg * 0.9 ? 'falling' : 'stable';

        return { name: m.name, weeklyAvg: Math.round(weeklyAvg), trend, nextMilestone, allTimeGp: allTime };
      });

    res.json({ success: true, projections });
  });

  // --- Member profile (single member detailed view) ---
  app.get('/api/idleon/member/:name', requireAuth, requireTier('viewer'), (req, res) => {
    const memberName = decodeURIComponent(req.params.name);
    const data = loadIdleon();
    const cfg = { ...defaultConfig(), ...(data.config || {}) };
    const member = findMemberByName(data.members, memberName);
    if (!member) return res.json({ success: false, error: 'Member not found' });

    const enriched = enrichMember(member, cfg);
    // Add Discord info if linked
    let discordInfo = null;
    if (member.discordId && membersCache?.members?.[member.discordId]) {
      const dm = membersCache.members[member.discordId];
      discordInfo = { username: dm.username, displayName: dm.displayName, roles: dm.roles, joinedAt: dm.joinedAt };
    }

    res.json({ success: true, member: enriched, discordInfo });
  });

  // --- Reset current week ---
  app.post('/api/idleon/reset-week', requireAuth, requireTier('admin'), (req, res) => {
    const { guildId } = req.body || {};
    const data = loadIdleon();
    const wk = currentWeekKey();
    let count = 0;
    for (const m of data.members) {
      if (guildId && m.guildId !== guildId) continue;
      const hist = normalizeWeeklyHistory(m.weeklyHistory);
      const entry = hist.find(h => h.weekStart === wk);
      if (entry) {
        entry.gp = 0;
        count++;
      }
      m.weeklyHistory = hist;
      m.weeklyGp = 0;
      m.updatedAt = Date.now();
    }
    saveIdleon(data);
    dashAudit(req.userName, 'idleon-reset-week', `Reset week ${wk} for ${count} members`);
    res.json({ success: true, reset: count });
  });

  // ================================================================
  // FIREBASE INTEGRATION ENDPOINTS
  // ================================================================

  // Initialize Firebase module
  initIdleonFirebase(deps);

  // --- Firebase connection status ---
  app.get('/api/idleon/firebase/status', requireAuth, requireTier('admin'), (req, res) => {
    res.json({ success: true, ...getFirebaseStatus() });
  });

  // --- Start Google device-code auth ---
  app.post('/api/idleon/firebase/start-auth', requireAuth, requireTier('admin'), async (req, res) => {
    try {
      const result = await firebaseStartAuth();
      dashAudit(req.userName, 'idleon-firebase-auth-start', 'Started Google device-code flow');
      res.json({ success: true, ...result });
    } catch (e) {
      res.json({ success: false, error: e.message });
    }
  });

  // --- Check device-code auth progress ---
  app.get('/api/idleon/firebase/check-auth', requireAuth, requireTier('admin'), (req, res) => {
    res.json({ success: true, ...firebaseCheckAuth() });
  });

  // --- Disconnect Google account ---
  app.post('/api/idleon/firebase/disconnect', requireAuth, requireTier('admin'), (req, res) => {
    firebaseDisconnect();
    dashAudit(req.userName, 'idleon-firebase-disconnect', 'Disconnected Google account');
    addLog('[IdleOn Firebase] Google account disconnected by ' + (req.userName || 'admin'));
    res.json({ success: true });
  });

  // --- Search guilds by name ---
  app.post('/api/idleon/firebase/search-guild', requireAuth, requireTier('admin'), async (req, res) => {
    try {
      const name = String(req.body?.name || '').trim();
      if (!name || name.length < 2) return res.json({ success: false, error: 'Name must be at least 2 characters' });
      const results = await firebaseSearchGuilds(name);
      res.json({ success: true, guilds: results });
    } catch (e) {
      res.json({ success: false, error: e.message });
    }
  });

  // --- Add guild from Firebase search ---
  app.post('/api/idleon/firebase/add-guild', requireAuth, requireTier('admin'), (req, res) => {
    const { id, name } = req.body || {};
    if (!id || !name) return res.json({ success: false, error: 'Guild ID and name required' });
    const data = loadIdleon();
    if (!Array.isArray(data.guilds)) data.guilds = [];
    if (data.guilds.find(g => g.id === id)) return res.json({ success: false, error: 'Guild already added' });
    if (data.guilds.length >= 10) return res.json({ success: false, error: 'Max 10 guilds' });
    data.guilds.push({ id: String(id).slice(0, 50), name: String(name).slice(0, 100), source: 'firebase' });
    saveIdleon(data);
    dashAudit(req.userName, 'idleon-firebase-add-guild', `Added guild from Firebase: ${name} (${id})`);
    res.json({ success: true, guilds: data.guilds });
  });

  // --- Force refresh / poll now ---
  app.post('/api/idleon/firebase/refresh', requireAuth, requireTier('admin'), async (req, res) => {
    try {
      const result = await firebaseRefreshGuilds();
      dashAudit(req.userName, 'idleon-firebase-refresh', `Manual Firebase refresh: ${result.results?.length || 0} guilds`);
      res.json({ success: true, ...result });
    } catch (e) {
      res.json({ success: false, error: e.message });
    }
  });

  // --- Start / stop polling ---
  app.post('/api/idleon/firebase/polling', requireAuth, requireTier('admin'), (req, res) => {
    const { action, intervalMinutes } = req.body || {};
    if (action === 'start') {
      const ms = Math.max(15, Math.min(1440, Number(intervalMinutes) || 60)) * 60000;
      firebaseStartPolling(ms);
      dashAudit(req.userName, 'idleon-firebase-polling', `Started polling every ${Math.round(ms / 60000)} min`);
      res.json({ success: true, polling: true, intervalMinutes: Math.round(ms / 60000) });
    } else if (action === 'stop') {
      firebaseStopPolling();
      dashAudit(req.userName, 'idleon-firebase-polling', 'Stopped polling');
      res.json({ success: true, polling: false });
    } else {
      res.json({ success: false, error: 'action must be start or stop' });
    }
  });

  // --- Snapshot history for a guild ---
  app.get('/api/idleon/firebase/snapshots/:guildId', requireAuth, requireTier('viewer'), (req, res) => {
    const guildId = String(req.params.guildId || '').slice(0, 50);
    if (!guildId) return res.json({ success: false, error: 'Guild ID required' });
    const history = getSnapshotHistory(guildId);
    res.json({ success: true, ...history });
  });

  // --- Export data for Discord commands ---
  function getGuildHealth() {
    const data = loadIdleon();
    const cfg = { ...defaultConfig(), ...(data.config || {}) };
    const active = data.members.filter(m => m.status !== 'kicked');
    const healthy = active.filter(m => daysSinceLastGp(m) < (cfg.warningDays || 7)).length;
    return {
      total: active.length,
      healthy,
      atRisk: active.filter(m => { const d = daysSinceLastGp(m); return d >= (cfg.warningDays || 7) && d < (cfg.kickThresholdDays || 14); }).length,
      inactive: active.filter(m => daysSinceLastGp(m) >= (cfg.kickThresholdDays || 14)).length,
      healthPct: active.length ? Math.round((healthy / active.length) * 100) : 0,
      totalGp: active.reduce((s, m) => s + memberAllTimeGp(m), 0),
      weeklyGp: (() => {
        const wk = currentWeekKey();
        return active.reduce((s, m) => {
          const cur = normalizeWeeklyHistory(m.weeklyHistory).find(h => h.weekStart === wk);
          return s + (cur ? cur.gp : 0);
        }, 0);
      })()
    };
  }

  function getLeaderboard(type, limit) {
    const data = loadIdleon();
    const wk = currentWeekKey();
    const active = data.members.filter(m => m.status !== 'kicked');
    let sorted;
    switch (type) {
      case 'alltime':
        sorted = active.sort((a, b) => memberAllTimeGp(b) - memberAllTimeGp(a));
        break;
      case '4w':
        sorted = active.sort((a, b) => memberRangeGp(b, 4) - memberRangeGp(a, 4));
        break;
      default: // weekly
        sorted = active.sort((a, b) => {
          const aGp = normalizeWeeklyHistory(a.weeklyHistory).find(h => h.weekStart === wk)?.gp || 0;
          const bGp = normalizeWeeklyHistory(b.weeklyHistory).find(h => h.weekStart === wk)?.gp || 0;
          return bGp - aGp;
        });
    }
    return sorted.slice(0, limit || 10).map((m, i) => ({
      rank: i + 1,
      name: m.name,
      weeklyGp: normalizeWeeklyHistory(m.weeklyHistory).find(h => h.weekStart === wk)?.gp || 0,
      allTimeGp: memberAllTimeGp(m),
      gp4w: memberRangeGp(m, 4)
    }));
  }

  function getMemberQuickStats(name) {
    const data = loadIdleon();
    const cfg = { ...defaultConfig(), ...(data.config || {}) };
    const member = findMemberByName(data.members, name);
    if (!member) return null;
    return enrichMember(member, cfg);
  }

  // Start background timer — check LOA/probation expiry every hour
  setInterval(() => {
    try { checkLoaExpiry(); } catch (e) {
      console.error('[IdleOn] LOA check error:', e.message);
    }
  }, 3600000);

  // Weekly digest timer — check daily if today is digest day
  setInterval(() => {
    try {
      const data = loadIdleon();
      const cfg = { ...defaultConfig(), ...(data.config || {}) };
      if (!cfg.digestChannelId) return;
      const today = new Date().getDay();
      if (today !== (cfg.digestDay ?? 1)) return;
      const hour = new Date().getHours();
      if (hour !== 10) return; // 10 AM

      const channel = client?.channels?.cache?.get(cfg.digestChannelId);
      if (!channel) return;

      // Check if digest already sent today
      const lastDigest = (data.importLog || []).find(l => l.importedBy === 'digest-auto');
      if (lastDigest && Date.now() - lastDigest.date < 20 * 3600000) return;

      // Same logic as manual digest endpoint
      const activeMembers = data.members.filter(m => m.status !== 'kicked');
      const active = activeMembers.filter(m => daysSinceLastGp(m) < (cfg.warningDays || 7)).length;
      const healthPct = activeMembers.length > 0 ? Math.round((active / activeMembers.length) * 100) : 0;
      const wk = currentWeekKey();
      const weeklyGp = activeMembers.reduce((s, m) => {
        const cur = normalizeWeeklyHistory(m.weeklyHistory).find(h => h.weekStart === wk);
        return s + (cur ? cur.gp : 0);
      }, 0);

      const top5 = activeMembers.sort((a, b) => {
        const aGp = normalizeWeeklyHistory(a.weeklyHistory).find(h => h.weekStart === wk)?.gp || 0;
        const bGp = normalizeWeeklyHistory(b.weeklyHistory).find(h => h.weekStart === wk)?.gp || 0;
        return bGp - aGp;
      }).slice(0, 5);

      channel.send({
        embeds: [{
          color: healthPct >= 80 ? 0x4caf50 : healthPct >= 60 ? 0xff9800 : 0xf44336,
          title: '📊 Weekly IdleOn Guild Report',
          description: `Auto-generated for week **${wk}**`,
          fields: [
            { name: '👥 Members', value: `${activeMembers.length}`, inline: true },
            { name: '💚 Health', value: `${healthPct}%`, inline: true },
            { name: '📈 Weekly GP', value: weeklyGp.toLocaleString(), inline: true },
            {
              name: '🥇 Top 5',
              value: top5.map((m, i) => {
                const gp = normalizeWeeklyHistory(m.weeklyHistory).find(h => h.weekStart === wk)?.gp || 0;
                return `${i + 1}. **${m.name}** — ${gp.toLocaleString()}`;
              }).join('\n') || 'No data'
            }
          ],
          timestamp: new Date().toISOString()
        }]
      }).catch(() => {});

      // Mark as sent
      if (!Array.isArray(data.importLog)) data.importLog = [];
      data.importLog.push({ date: Date.now(), importedBy: 'digest-auto', count: 0, weekKey: wk });
      saveIdleon(data);
    } catch (e) {
      console.error('[IdleOn] Weekly digest error:', e.message);
    }
  }, 3600000); // Check every hour

  // Auto-kick timer — runs every 6 hours
  setInterval(async () => {
    try {
      const data = loadIdleon();
      const cfg = { ...defaultConfig(), ...(data.config || {}) };
      if (!cfg.autoKickEnabled) return;

      const now = Date.now();
      const graceMs = (cfg.autoKickGraceDays || 3) * 86400000;
      const minRisk = cfg.autoKickMinRisk || 70;
      const maxKicks = cfg.autoKickMaxPerCycle || 5;

      // Phase 1: Send warnings to high-risk members not yet warned
      const warnable = data.members.filter(m =>
        m.status !== 'kicked' && m.status !== 'loa' && m.status !== 'exempt' &&
        computeKickRisk(m, cfg) >= minRisk
      );

      const guild = client?.guilds?.cache?.first();
      let warnsSent = 0;
      for (const m of warnable) {
        const lastWarn = (m.timeline || []).filter(e => e.event === 'auto-kick-warning').pop();
        if (lastWarn) continue; // already warned
        m.timeline = m.timeline || [];
        m.timeline.push({ event: 'auto-kick-warning', date: now, details: `Auto-warning: risk score ${computeKickRisk(m, cfg)}` });

        // Try to DM if linked
        if (m.discordId && guild && cfg.warningDmsEnabled) {
          try {
            const user = await client.users.fetch(m.discordId).catch(() => null);
            if (user) {
              const guildName = (data.guilds || []).find(g => g.id === m.guildId)?.name || 'the guild';
              await user.send(`⚠️ **Auto-kick warning** — Your activity in **${guildName}** is below the threshold (risk score: ${computeKickRisk(m, cfg)}). You have **${cfg.autoKickGraceDays} days** to improve before automatic removal.`).catch(() => {});
            }
          } catch { /* DM failed, still log timeline */ }
        }
        warnsSent++;
      }

      // Phase 2: Kick members whose grace period expired
      const kickable = data.members.filter(m => {
        if (m.status === 'kicked' || m.status === 'loa' || m.status === 'exempt') return false;
        const lastWarn = (m.timeline || []).filter(e => e.event === 'auto-kick-warning').pop();
        if (!lastWarn) return false;
        if (now - lastWarn.date < graceMs) return false;
        // Re-check risk — member may have improved during grace period
        return computeKickRisk(m, cfg) >= minRisk;
      }).sort((a, b) => computeKickRisk(b, cfg) - computeKickRisk(a, cfg))
        .slice(0, maxKicks);

      let kicked = 0;
      for (const m of kickable) {
        const oldStatus = m.status;
        m.status = 'kicked';
        m.timeline = m.timeline || [];
        m.timeline.push({ event: 'auto-kicked', date: now, details: `Auto-kicked: risk ${computeKickRisk(m, cfg)}, was ${oldStatus}` });
        if (!Array.isArray(data.kickLog)) data.kickLog = [];
        data.kickLog.push({ name: m.name, date: now, reason: 'auto-kick', risk: computeKickRisk(m, cfg), by: 'system' });
        kicked++;
      }

      if (warnsSent > 0 || kicked > 0) {
        saveIdleon(data);
        if (_deps?.addLog) addLog(`[IdleOn Auto-Kick] Warned: ${warnsSent}, Kicked: ${kicked}`);

        // Post to log channel if configured
        const logChId = cfg.autoKickLogChannelId;
        if (logChId && (warnsSent > 0 || kicked > 0)) {
          const logCh = client?.channels?.cache?.get(logChId);
          if (logCh) {
            const lines = [];
            if (warnsSent > 0) lines.push(`⚠️ Warned **${warnsSent}** member(s)`);
            if (kicked > 0) lines.push(`🚫 Auto-kicked **${kicked}** member(s): ${kickable.map(m => m.name).join(', ')}`);
            logCh.send({ embeds: [{ color: 0xf44336, title: '🤖 Auto-Kick Report', description: lines.join('\n'), timestamp: new Date().toISOString() }] }).catch(() => {});
          }
        }
      }
    } catch (e) {
      console.error('[IdleOn] Auto-kick error:', e.message);
    }
  }, 6 * 3600000); // Every 6 hours

  // ── Reset / Clear all IdleOn data ──
  app.post('/api/idleon/reset-all', requireAuth, requireTier('owner'), (req, res) => {
    try {
      const freshData = {
        members: [],
        guilds: [],
        config: loadIdleon().config || {},
        kickLog: [],
        waitlist: [],
        importLog: [],
        roleMilestones: []
      };
      saveIdleon(freshData);
      res.json({ success: true, message: 'All IdleOn member/guild data cleared. Config preserved.' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Return functions for slash commands
  return { getGuildHealth, getLeaderboard, getMemberQuickStats, checkLoaExpiry };
}
