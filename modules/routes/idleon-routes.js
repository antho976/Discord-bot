import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
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
    saveJSON, DATA_DIR, twitchTokens, streamVars
  } = deps;

  const IDLEON_GP_PATH = path.join(DATA_DIR, 'idleon-gp.json');

  // --- Helpers ---
  function loadIdleon() {
    return loadJSON(IDLEON_GP_PATH, {
      members: [], guilds: [], entries: [], notes: '',
      config: defaultConfig(), kickLog: [], waitlist: [], importLog: [],
      accountReviews: [],
      updatedAt: null
    });
  }

  function saveIdleon(data) {
    data.updatedAt = Date.now();
    return saveJSON(IDLEON_GP_PATH, data);
  }

  // --- Fuzzy name matching (case-insensitive, ~95% similarity threshold) ---
  // Normalized Levenshtein similarity: 1.0 = identical, 0.0 = completely different
  function nameSimilarity(a, b) {
    a = String(a).toLowerCase().trim();
    b = String(b).toLowerCase().trim();
    if (a === b) return 1;
    if (!a || !b) return 0;
    const lenA = a.length, lenB = b.length;
    if (Math.abs(lenA - lenB) > Math.max(lenA, lenB) * 0.2) return 0; // Quick reject if lengths differ too much
    // Levenshtein distance via single-row DP
    const row = Array.from({ length: lenB + 1 }, (_, i) => i);
    for (let i = 1; i <= lenA; i++) {
      let prev = i;
      for (let j = 1; j <= lenB; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        const val = Math.min(row[j] + 1, prev + 1, row[j - 1] + cost);
        row[j - 1] = prev;
        prev = val;
      }
      row[lenB] = prev;
    }
    return 1 - row[lenB] / Math.max(lenA, lenB);
  }

  // Check if name fuzzy-matches any name in a Set (case-insensitive, >=0.85 similarity)
  // Returns the matched name or null
  function fuzzyMatchInSet(name, nameSet, threshold = 0.85) {
    const lower = String(name).toLowerCase().trim();
    if (nameSet.has(lower)) return lower;
    for (const existing of nameSet) {
      if (nameSimilarity(lower, existing) >= threshold) return existing;
    }
    return null;
  }

  // Find existing review entry by fuzzy name match
  function findReviewByFuzzyName(reviews, name, threshold = 0.85) {
    const lower = String(name).toLowerCase().trim();
    return reviews.find(e => {
      if (e.status === 'completed') return false;
      return nameSimilarity(e.name.toLowerCase(), lower) >= threshold;
    }) || null;
  }

  function defaultConfig() {
    return {
      warningDays: 7,
      kickThresholdDays: 14,
      minWeeklyGp: 0,
      probationWeeks: 2,
      probationMinGp: 500,
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
      guildOverrides: {},
      // Account Review settings
      reviewChannelId: '',
      reviewTwitchRewardId: '',
      // Promotion list settings
      promotionThreadId: '',
      promotionPingEnabled: false,
      promotionPingAfterHours: 48,
      promotionPingChannelId: '',
      // Guild invite embed settings
      guildInviteChannelId: '',
      guildInviteAutoPost: false
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
    // Use end of that week (Sunday = weekStart + 6 days) since GP could be earned any day during the week
    const lastDate = new Date(lastWeek.weekStart + 'T00:00:00Z');
    lastDate.setDate(lastDate.getDate() + 6);
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
    // Firebase-derived weekly GP: difference between current Firebase total and week-start snapshot
    const fbWeekStart = Number(m._firebaseGpWeekStartTotal || 0);
    const fbCurrent = Number(m._firebaseGpTotal || 0);
    const firebaseWeeklyGp = fbCurrent > fbWeekStart ? fbCurrent - fbWeekStart : 0;
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
        const deltaGp = cur ? cur.gp : 0;
        // If delta-tracked weekly equals all-time GP, it's a data artifact from
        // the initial import dumping cumulative GP as a single delta.
        // In that case, trust the Firebase-derived weekly GP instead.
        const allTime = memberAllTimeGp(m);
        if (m._firebaseGpWeekKey && deltaGp > 0 && deltaGp >= allTime && firebaseWeeklyGp < deltaGp) {
          return firebaseWeeklyGp;
        }
        return Math.max(deltaGp, firebaseWeeklyGp);
      })(),
      firebaseWeeklyGp,
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
  app.get('/api/idleon/gp', requireAuth, requireTier('viewer'), async (req, res) => {
    const data = loadIdleon();
    const cfg = { ...defaultConfig(), ...(data.config || {}) };
    const enriched = (data.members || []).map(m => enrichMember(m, cfg));

    // Resolve missing discordName from discordId for reviews that only have IDs
    const reviews = data.accountReviews || [];
    let reviewsDirty = false;
    const guild = client?.guilds?.cache?.first();
    if (guild) {
      for (const rv of reviews) {
        if (rv.discordId && !rv.discordName) {
          const member = await guild.members.fetch(rv.discordId).catch(() => null);
          if (member) {
            rv.discordName = member.displayName || member.user?.globalName || member.user?.username || '';
            if (rv.discordName) reviewsDirty = true;
          }
        }
      }
      if (reviewsDirty) saveIdleon(data);
    }

    res.json({
      success: true,
      members: enriched,
      guilds: data.guilds || [],
      config: cfg,
      kickLog: (data.kickLog || []).slice(-200),
      waitlist: data.waitlist || [],
      promotionList: data.promotionList || [],
      importLog: (data.importLog || []).slice(-50),
      accountReviews: reviews,
      notes: data.notes || '',
      updatedAt: data.updatedAt
    });
  });

  // --- Comprehensive Stats ---
  app.get('/api/idleon/stats', requireAuth, requireTier('viewer'), (req, res) => {
    const data = loadIdleon();
    const cfg = { ...defaultConfig(), ...(data.config || {}) };
    const active = (data.members || []).filter(m => m.status !== 'kicked');
    const enriched = active.map(m => enrichMember(m, cfg));

    // Overall stats
    const totalMembers = active.length;
    const totalAllTime = enriched.reduce((s, m) => s + (m.allTimeGp || 0), 0);
    const totalWeekly = enriched.reduce((s, m) => s + (m.weeklyGp || 0), 0);
    const activeThisWeek = enriched.filter(m => (m.weeklyGp || 0) > 0).length;
    const avgWeeklyPerActive = activeThisWeek ? Math.round(totalWeekly / activeThisWeek) : 0;
    const avgRisk = totalMembers ? Math.round(enriched.reduce((s, m) => s + m.kickRiskScore, 0) / totalMembers) : 0;
    const medianRisk = totalMembers ? enriched.map(m => m.kickRiskScore).sort((a, b) => a - b)[Math.floor(totalMembers / 2)] : 0;

    // Status distribution
    const statusDist = {};
    active.forEach(m => { const s = m.status || 'active'; statusDist[s] = (statusDist[s] || 0) + 1; });

    // Risk distribution (buckets)
    const riskBuckets = { safe: 0, low: 0, medium: 0, high: 0, critical: 0 };
    enriched.forEach(m => {
      if (m.kickRiskScore >= 70) riskBuckets.critical++;
      else if (m.kickRiskScore >= 40) riskBuckets.high++;
      else if (m.kickRiskScore >= 20) riskBuckets.medium++;
      else if (m.kickRiskScore > 0) riskBuckets.low++;
      else riskBuckets.safe++;
    });

    // Streak stats
    const streaks = enriched.map(m => m.streakCurrent || 0);
    const avgStreak = totalMembers ? (streaks.reduce((a, b) => a + b, 0) / totalMembers).toFixed(1) : 0;
    const maxStreak = Math.max(0, ...streaks);
    const zeroStreaks = streaks.filter(s => s === 0).length;

    // Per-guild stats
    const guildStats = (data.guilds || []).map(g => {
      const gm = enriched.filter(m => m.guildId === g.id);
      const gWeekly = gm.reduce((s, m) => s + (m.weeklyGp || 0), 0);
      const gAllTime = gm.reduce((s, m) => s + (m.allTimeGp || 0), 0);
      const gActive = gm.filter(m => (m.weeklyGp || 0) > 0).length;
      const gAvgRisk = gm.length ? Math.round(gm.reduce((s, m) => s + m.kickRiskScore, 0) / gm.length) : 0;
      return {
        id: g.id, name: g.name,
        members: gm.length, weeklyGp: gWeekly, allTimeGp: gAllTime,
        activeThisWeek: gActive, avgRisk: gAvgRisk,
        totalGp: g.totalGp || gAllTime
      };
    });

    // Weekly GP history (aggregated across all members, last 16 weeks)
    const weeklyHistory = {};
    active.forEach(m => {
      normalizeWeeklyHistory(m.weeklyHistory).forEach(h => {
        weeklyHistory[h.weekStart] = (weeklyHistory[h.weekStart] || 0) + h.gp;
      });
    });
    const weeklyTrend = Object.entries(weeklyHistory)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-16)
      .map(([week, gp]) => ({ week, gp }));

    // Top contributors (all-time and weekly)
    const topAllTime = enriched.slice().sort((a, b) => (b.allTimeGp || 0) - (a.allTimeGp || 0)).slice(0, 10)
      .map(m => ({ name: m.name, guild: m.guildId, gp: m.allTimeGp }));
    const topWeekly = enriched.slice().sort((a, b) => (b.weeklyGp || 0) - (a.weeklyGp || 0)).slice(0, 10)
      .map(m => ({ name: m.name, guild: m.guildId, gp: m.weeklyGp }));
    const topStreaks = enriched.slice().sort((a, b) => (b.streakCurrent || 0) - (a.streakCurrent || 0)).slice(0, 10)
      .map(m => ({ name: m.name, guild: m.guildId, streak: m.streakCurrent, best: m.streakBest }));
    const mostAtRisk = enriched.filter(m => m.status !== 'loa' && m.status !== 'exempt')
      .sort((a, b) => b.kickRiskScore - a.kickRiskScore).slice(0, 10)
      .map(m => ({ name: m.name, guild: m.guildId, risk: m.kickRiskScore, days: m.daysAway }));

    // Level distribution from Firebase
    const levelBuckets = {};
    active.forEach(m => {
      const lv = m._firebaseLevel || 0;
      const bucket = lv === 0 ? 'Unknown' : lv < 100 ? '1-99' : lv < 200 ? '100-199' : lv < 300 ? '200-299' : lv < 400 ? '300-399' : '400+';
      levelBuckets[bucket] = (levelBuckets[bucket] || 0) + 1;
    });

    // Kick stats
    const kickLog = data.kickLog || [];
    const now = Date.now();
    const kickStats = {
      total: kickLog.length,
      last7d: kickLog.filter(k => now - k.date < 7 * 86400000).length,
      last30d: kickLog.filter(k => now - k.date < 30 * 86400000).length,
    };

    // Bonus distribution
    const bonusNames = ['GP Bonus','EXP Bonus','Dungeon Bonus','Drop Bonus','Skill EXP','Damage Bonus','Carry Cap','Mining Bonus','Fishing Bonus','Chopping Bonus','Catching Bonus','Trapping Bonus','Worship Bonus'];
    const bonusDist = {};
    active.forEach(m => {
      const idx = m._firebaseBonusIndex ?? m.wantedBonusIndex ?? -1;
      if (idx >= 0 && idx < bonusNames.length) {
        const name = bonusNames[idx];
        bonusDist[name] = (bonusDist[name] || 0) + 1;
      }
    });

    res.json({
      success: true,
      overview: { totalMembers, totalAllTime, totalWeekly, activeThisWeek, avgWeeklyPerActive, avgRisk, medianRisk },
      statusDist, riskBuckets, levelBuckets, bonusDist,
      streakStats: { avg: Number(avgStreak), max: maxStreak, zeroCount: zeroStreaks },
      guildStats, weeklyTrend, kickStats,
      leaderboards: { topAllTime, topWeekly, topStreaks, mostAtRisk }
    });
  });

  // --- Guild Level & Bonus Info ---
  app.get('/api/idleon/guild-info', requireAuth, requireTier('viewer'), (req, res) => {
    const data = loadIdleon();
    const cfg = { ...defaultConfig(), ...(data.config || {}) };
    const active = (data.members || []).filter(m => m.status !== 'kicked');

    // IdleOn guild level thresholds (GP needed per level — approximate formula)
    // Level N requires roughly: 5000 * N * (N + 1) / 2 total GP
    function gpForLevel(lv) { return Math.round(5000 * lv * (lv + 1) / 2); }
    function levelFromGp(gp) { let lv = 0; while (gpForLevel(lv + 1) <= gp) lv++; return lv; }

    const bonusNames = ['GP Bonus','EXP Bonus','Dungeon Bonus','Drop Bonus','Skill EXP','Damage Bonus','Carry Cap','Mining Bonus','Fishing Bonus','Chopping Bonus','Catching Bonus','Trapping Bonus','Worship Bonus'];

    const guilds = (data.guilds || []).map(g => {
      const guildMembers = active.filter(m => m.guildId === g.id);
      const totalGp = g.totalGp || guildMembers.reduce((s, m) => s + memberAllTimeGp(m), 0);
      const currentLevel = levelFromGp(totalGp);
      const nextLevelGp = gpForLevel(currentLevel + 1);
      const gpNeeded = Math.max(0, nextLevelGp - totalGp);

      // Weekly GP rate for prediction
      const weeklyHist = {};
      guildMembers.forEach(m => {
        normalizeWeeklyHistory(m.weeklyHistory).forEach(h => {
          weeklyHist[h.weekStart] = (weeklyHist[h.weekStart] || 0) + h.gp;
        });
      });
      const weeks = Object.entries(weeklyHist).sort((a, b) => a[0].localeCompare(b[0])).slice(-4);
      const avgWeeklyGp = weeks.length ? Math.round(weeks.reduce((s, w) => s + w[1], 0) / weeks.length) : 0;
      const weeksToNextLevel = avgWeeklyGp > 0 ? Math.ceil(gpNeeded / avgWeeklyGp) : null;

      // Bonus distribution per guild
      const bonuses = {};
      guildMembers.forEach(m => {
        const idx = m._firebaseBonusIndex ?? m.wantedBonusIndex ?? -1;
        if (idx >= 0 && idx < bonusNames.length) {
          const name = bonusNames[idx];
          bonuses[name] = (bonuses[name] || 0) + 1;
        }
      });

      // Bonus levels from Firebase (array index = bonus type)
      const bonusLevels = Array.isArray(g.bonusLevels) ? g.bonusLevels : [];

      return {
        id: g.id, name: g.name,
        totalGp, currentLevel, nextLevelGp, gpNeeded,
        avgWeeklyGp, weeksToNextLevel,
        members: guildMembers.length,
        bonuses, bonusLevels, bonusNames
      };
    });

    res.json({ success: true, guilds, bonusNames });
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
      reviewChannelId: String(cfg.reviewChannelId || '').slice(0, 25),
      reviewTwitchRewardId: String(cfg.reviewTwitchRewardId || '').slice(0, 60),
      promotionThreadId: String(cfg.promotionThreadId || '').slice(0, 25),
      promotionPingEnabled: !!cfg.promotionPingEnabled,
      promotionPingAfterHours: Math.max(1, Math.min(720, Number(cfg.promotionPingAfterHours) || 48)),
      promotionPingChannelId: String(cfg.promotionPingChannelId || '').slice(0, 25),
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
    const { id, removeMembers } = req.body || {};
    data.guilds = (data.guilds || []).filter(g => g.id !== id);
    let cleared = 0;
    if (removeMembers) {
      // Fully remove members that belonged to this guild
      const before = (data.members || []).length;
      data.members = (data.members || []).filter(m => m.guildId !== id);
      cleared = before - data.members.length;
    } else {
      // Just clear guildId on members that belonged to the deleted guild
      for (const m of (data.members || [])) {
        if (m.guildId === id) { m.guildId = ''; cleared++; }
      }
    }
    saveIdleon(data);
    res.json({ success: true, membersCleared: cleared, removed: !!removeMembers });
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
    // Auto-remove waitlisted members who are already in the guild
    const memberNames = new Set((data.members || []).filter(m => m.status !== 'kicked').map(m => m.name.toLowerCase()));
    const before = (data.waitlist || []).length;
    data.waitlist = (data.waitlist || []).filter(w => {
      const lower = w.name.toLowerCase();
      // Remove if they're already an active guild member
      if (memberNames.has(lower)) return false;
      // Also auto-remove entries that were confirmed over 24h ago
      if (w.status === 'confirmed' && w.confirmedAt && Date.now() - w.confirmedAt > 86400000) return false;
      return true;
    });
    if (data.waitlist.length < before) saveIdleon(data);
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
    if (status) {
      entry.status = String(status).slice(0, 20);
      if (status === 'confirmed') entry.confirmedAt = Date.now();
    }
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

  // --- Promotion List ---
  app.get('/api/idleon/promotion-list', requireAuth, requireTier('viewer'), (req, res) => {
    const data = loadIdleon();
    res.json({ success: true, promotionList: data.promotionList || [] });
  });

  app.post('/api/idleon/promotion-list', requireAuth, requireTier('admin'), (req, res) => {
    const { name, targetGuild, notes } = req.body || {};
    if (!name) return res.json({ success: false, error: 'Name required' });
    const data = loadIdleon();
    if (!Array.isArray(data.promotionList)) data.promotionList = [];
    if (data.promotionList.length >= 200) return res.json({ success: false, error: 'Promotion list full (200 max)' });
    if (data.promotionList.some(p => p.name.toLowerCase() === name.toLowerCase().trim())) {
      return res.json({ success: false, error: 'Already on promotion list' });
    }
    data.promotionList.push({
      id: crypto.randomUUID(),
      name: String(name).trim().slice(0, 50),
      targetGuild: String(targetGuild || '').trim().slice(0, 50),
      notes: String(notes || '').slice(0, 500),
      addedAt: Date.now(),
      status: 'waiting',
      source: 'manual'
    });
    saveIdleon(data);
    res.json({ success: true });
  });

  app.post('/api/idleon/promotion-list/update', requireAuth, requireTier('admin'), (req, res) => {
    const { id, status, notes } = req.body || {};
    const data = loadIdleon();
    const entry = (data.promotionList || []).find(p => p.id === id);
    if (!entry) return res.json({ success: false, error: 'Not found' });
    if (status) entry.status = String(status).slice(0, 20);
    if (notes !== undefined) entry.notes = String(notes).slice(0, 500);
    saveIdleon(data);
    res.json({ success: true });
  });

  app.post('/api/idleon/promotion-list/delete', requireAuth, requireTier('admin'), (req, res) => {
    const { id } = req.body || {};
    const data = loadIdleon();
    data.promotionList = (data.promotionList || []).filter(p => p.id !== id);
    saveIdleon(data);
    res.json({ success: true });
  });

  // --- Scan promotion forum thread ---
  app.post('/api/idleon/scan-promotion', requireAuth, requireTier('admin'), async (req, res) => {
    const data = loadIdleon();
    const cfg = { ...defaultConfig(), ...(data.config || {}) };
    const threadId = cfg.promotionThreadId || req.body?.threadId;
    if (!threadId) return res.json({ success: false, error: 'No promotion thread configured' });

    try {
      const channel = await client.channels.fetch(threadId).catch(() => null);
      if (!channel) return res.json({ success: false, error: 'Thread/channel not found' });

      if (!Array.isArray(data.promotionList)) data.promotionList = [];
      const existingNames = new Set(data.promotionList.map(p => p.name.toLowerCase()));
      const added = [];

      const messages = await channel.messages.fetch({ limit: 100 }).catch(() => new Map());
      // Pattern: "Name - GuildName" or "Name -> GuildName"
      const promoPattern = /^([A-Za-z0-9_ ]{2,30})\s*[-–—>→]+\s*([A-Za-z0-9_ ]{2,30})$/gm;

      for (const [, msg] of messages) {
        if (msg.author?.bot) continue;
        const content = msg.content || '';
        promoPattern.lastIndex = 0;
        let match;
        while ((match = promoPattern.exec(content)) !== null) {
          const name = match[1].trim();
          const guild = match[2].trim();
          if (existingNames.has(name.toLowerCase())) continue;
          existingNames.add(name.toLowerCase());
          data.promotionList.push({
            id: crypto.randomUUID(),
            name,
            targetGuild: guild,
            notes: 'From promotion thread by ' + (msg.author?.username || 'unknown'),
            addedAt: Date.now(),
            status: 'waiting',
            source: 'forum',
            discordId: msg.author?.id || '',
            messageUrl: msg.url || ''
          });
          added.push(name + ' → ' + guild);
        }
      }

      if (data.promotionList.length > 200) data.promotionList = data.promotionList.slice(-200);
      saveIdleon(data);
      dashAudit(req.userName, 'idleon-scan-promotion', 'Scanned promotion thread: found ' + added.length + ' new entries');
      res.json({ success: true, added, total: data.promotionList.length });
    } catch (e) {
      res.json({ success: false, error: e.message });
    }
  });

  // --- Kick log ---
  app.get('/api/idleon/kick-log', requireAuth, requireTier('viewer'), (req, res) => {
    const data = loadIdleon();
    res.json({ success: true, kickLog: (data.kickLog || []).slice(-200) });
  });

  // --- Ghost detection (Discord ↔ Idleon) ---
  // --- Fuzzy matching helpers ---
  function levenshtein(a, b) {
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[m][n];
  }

  function similarityScore(a, b) {
    const al = a.toLowerCase().replace(/[^a-z0-9]/g, '');
    const bl = b.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!al || !bl) return 0;
    // Exact match
    if (al === bl) return 100;
    // Substring match
    if (al.includes(bl) || bl.includes(al)) return 85;
    // Common prefix bonus
    let prefix = 0;
    for (let i = 0; i < Math.min(al.length, bl.length); i++) {
      if (al[i] === bl[i]) prefix++; else break;
    }
    // Deduplicate repeated chars for comparison (lukkkaso → lukaso)
    const dedup = s => s.replace(/(.)\1+/g, '$1');
    const ad = dedup(al), bd = dedup(bl);
    if (ad === bd) return 90;
    if (ad.includes(bd) || bd.includes(ad)) return 80;
    // Levenshtein on original
    const dist = levenshtein(al, bl);
    const maxLen = Math.max(al.length, bl.length);
    const levScore = Math.round((1 - dist / maxLen) * 100);
    // Levenshtein on deduped
    const distD = levenshtein(ad, bd);
    const maxLenD = Math.max(ad.length, bd.length);
    const levScoreD = Math.round((1 - distD / maxLenD) * 100);
    // Best of both + prefix bonus
    const best = Math.max(levScore, levScoreD);
    const prefixBonus = Math.min(prefix * 3, 15);
    return Math.min(100, best + prefixBonus);
  }

  app.get('/api/idleon/ghosts', requireAuth, requireTier('admin'), (req, res) => {
    const data = loadIdleon();
    const members = membersCache?.members || {};
    const cfg = { ...defaultConfig(), ...(data.config || {}) };
    const discordList = Object.values(members);
    const ignored = new Set((data.ghostIgnored || []).map(String));

    // Find Idleon members not linked to any Discord member
    const unlinked = data.members
      .filter(m => m.status !== 'kicked' && !m.discordId)
      .map(m => {
        const nameLower = m.name.toLowerCase();
        // Score all Discord members and pick top 3
        const scored = discordList.map(dm => {
          const uScore = dm.username ? similarityScore(nameLower, dm.username) : 0;
          const dScore = dm.displayName ? similarityScore(nameLower, dm.displayName) : 0;
          const best = Math.max(uScore, dScore);
          return { id: dm.id, username: dm.username, displayName: dm.displayName, score: best };
        }).filter(s => s.score >= 40).sort((a, b) => b.score - a.score).slice(0, 3);

        return {
          idleonName: m.name,
          guildId: m.guildId,
          ignored: ignored.has(m.name),
          suggestions: scored
        };
      });

    // Find Discord members with milestone roles but not in Idleon data
    const milestoneRoleIds = new Set((cfg.roleMilestones || []).map(r => r.roleId));
    const idleonDiscordIds = new Set(data.members.filter(m => m.discordId).map(m => m.discordId));
    const discordGhosts = milestoneRoleIds.size > 0
      ? discordList
        .filter(dm => dm.roles?.some(r => milestoneRoleIds.has(r)) && !idleonDiscordIds.has(dm.id))
        .map(dm => ({ id: dm.id, username: dm.username, displayName: dm.displayName, roles: dm.roles, ignored: ignored.has(dm.id) }))
      : [];

    // Stats
    const linked = data.members.filter(m => m.status !== 'kicked' && m.discordId).length;
    const totalActive = data.members.filter(m => m.status !== 'kicked').length;

    // All Discord members for manual search
    const allDiscord = discordList.map(dm => ({ id: dm.id, username: dm.username, displayName: dm.displayName }));

    res.json({ success: true, unlinked, discordGhosts, allDiscord, stats: { linked, totalActive, unlinked: unlinked.length, ghosts: discordGhosts.length } });
  });

  // --- Manual link a member to a Discord user ---
  app.post('/api/idleon/link-member', requireAuth, requireTier('admin'), (req, res) => {
    const { idleonName, discordId } = req.body || {};
    if (!idleonName || !discordId) return res.json({ success: false, error: 'Missing idleonName or discordId' });
    const data = loadIdleon();
    const member = data.members.find(m => m.name === idleonName && m.status !== 'kicked');
    if (!member) return res.json({ success: false, error: 'Member not found' });
    const dm = (membersCache?.members || {})[discordId];
    member.discordId = discordId;
    addTimeline(member, 'manual-linked', `Linked to Discord: ${dm?.username || discordId} by ${req.userName}`);
    saveIdleon(data);
    dashAudit(req.userName, 'idleon-link-member', `Linked ${idleonName} → ${dm?.username || discordId}`);
    res.json({ success: true });
  });

  // --- Ignore/unignore ghost entries ---
  app.post('/api/idleon/ghost-ignore', requireAuth, requireTier('admin'), (req, res) => {
    const { key, ignore } = req.body || {};
    if (!key) return res.json({ success: false, error: 'Missing key' });
    const data = loadIdleon();
    if (!data.ghostIgnored) data.ghostIgnored = [];
    if (ignore) {
      if (!data.ghostIgnored.includes(key)) data.ghostIgnored.push(key);
    } else {
      data.ghostIgnored = data.ghostIgnored.filter(k => k !== key);
    }
    saveIdleon(data);
    res.json({ success: true });
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
        /(?:ign|in[- ]?game(?:\s*name)?|account(?:\s*name)?|player(?:\s*name)?|idleon(?:\s*name)?|username|character(?:\s*name)?)\s*[:=\-]?\s*([A-Za-z0-9_]{3,25})/gi,
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
            // Skip common words / Discord artifacts
            if (['the','and','for','not','you','all','can','had','her','was','one','two','are','but','this','that','with','have','from','they','been','will','here','there','what','when','where','which','your','just','more','also','into','them','then','than','some','only','like','over','such','make','back','come','could','each','very','want','look','most','does','did','get','has','him','his','how','its','let','may','new','now','old','see','way','who','any','few','got','use','our','out','own','say','too','yet','ign','hey','lol','yes','pls','thx','nah','idk','nope','sure','okay','yeah','help','guild','join','invite','please','thanks','hello','would','could','should','about'].includes(lower)) continue;
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

  // --- Guild invite embed (slots, bonuses, level) ---
  const IDLEON_GUILD_MAX_MEMBERS = 100;
  const BONUS_NAMES = ['GP Bonus','EXP Bonus','Dungeon Bonus','Drop Bonus','Skill EXP','Damage Bonus','Carry Cap','Mining Bonus','Fishing Bonus','Chopping Bonus','Catching Bonus','Trapping Bonus','Worship Bonus'];

  function gpForGuildLevel(lv) { return Math.round(5000 * lv * (lv + 1) / 2); }
  function guildLevelFromGp(gp) { let lv = 0; while (gpForGuildLevel(lv + 1) <= gp) lv++; return lv; }

  function buildGuildInviteEmbeds(data) {
    const cfg = { ...defaultConfig(), ...(data.config || {}) };
    const guilds = data.guilds || [];
    if (!guilds.length) return [];

    const activeMembers = (data.members || []).filter(m => m.status !== 'kicked');

    return guilds.map(g => {
      const guildMembers = activeMembers.filter(m => m.guildId === g.id);
      const memberCount = guildMembers.length;
      const maxMembers = Number(g.maxMembers) || IDLEON_GUILD_MAX_MEMBERS;
      const slotsLeft = Math.max(0, maxMembers - memberCount);
      const totalGp = g.totalGp || guildMembers.reduce((s, m) => s + memberAllTimeGp(m), 0);
      const level = guildLevelFromGp(totalGp);
      const nextLevelGp = gpForGuildLevel(level + 1);
      const gpNeeded = Math.max(0, nextLevelGp - totalGp);
      const bonusLevels = Array.isArray(g.bonusLevels) ? g.bonusLevels : [];
      const totalBonusLevels = bonusLevels.reduce((s, v) => s + v, 0);

      // Build bonus list (only show non-zero)
      const bonusLines = bonusLevels
        .map((lv, i) => lv > 0 ? `> **${BONUS_NAMES[i] || `Bonus #${i}`}** — Lv. ${lv}` : null)
        .filter(Boolean);

      // Color based on slots
      const color = slotsLeft === 0 ? 0xf44336 : slotsLeft <= 5 ? 0xff9800 : slotsLeft <= 15 ? 0xffc107 : 0x4caf50;

      const fields = [
        { name: '📊 Guild Level', value: `**${level}**\n${totalGp.toLocaleString()} / ${nextLevelGp.toLocaleString()} GP\n${gpNeeded.toLocaleString()} to next level`, inline: true },
        { name: '👥 Members', value: `**${memberCount}** / ${maxMembers}\n🪑 **${slotsLeft}** slot${slotsLeft !== 1 ? 's' : ''} available`, inline: true },
        { name: '💎 Total GP', value: totalGp.toLocaleString(), inline: true }
      ];

      if (bonusLines.length) {
        fields.push({
          name: `⬆️ Guild Bonuses (${totalBonusLevels} total levels)`,
          value: bonusLines.join('\n'),
          inline: false
        });
      }

      // Weekly GP rate
      const weeklyHist = {};
      guildMembers.forEach(m => {
        normalizeWeeklyHistory(m.weeklyHistory).forEach(h => {
          weeklyHist[h.weekStart] = (weeklyHist[h.weekStart] || 0) + h.gp;
        });
      });
      const weeks = Object.entries(weeklyHist).sort((a, b) => a[0].localeCompare(b[0])).slice(-4);
      const avgWeeklyGp = weeks.length ? Math.round(weeks.reduce((s, w) => s + w[1], 0) / weeks.length) : 0;
      if (avgWeeklyGp > 0) {
        fields.push({ name: '📈 Avg Weekly GP', value: avgWeeklyGp.toLocaleString(), inline: true });
      }

      return {
        color,
        title: `🏰 ${g.name}`,
        description: slotsLeft === 0
          ? '🔴 **Guild is currently full!** Join the waitlist below.'
          : slotsLeft <= 5
            ? `🟡 **Only ${slotsLeft} slot${slotsLeft !== 1 ? 's' : ''} left!** Apply soon.`
            : `🟢 **${slotsLeft} slots available** — Come join us!`,
        fields,
        footer: { text: `Updated ${new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` },
        timestamp: new Date().toISOString()
      };
    });
  }

  // Post guild invite embed(s) to configured channel/thread
  async function postGuildInviteEmbeds(channelId, data) {
    if (!channelId) throw new Error('No invite embed channel configured');
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) throw new Error('Channel not found');

    const embeds = buildGuildInviteEmbeds(data);
    if (!embeds.length) throw new Error('No guilds configured');

    // Check if there's an existing bot message we can edit (avoid spam)
    let existingMsg = null;
    try {
      const messages = await channel.messages.fetch({ limit: 20 });
      existingMsg = messages.find(m => m.author.id === client.user.id && m.embeds?.length && m.embeds[0]?.title?.startsWith('🏰'));
    } catch { /* ignore — may not have message history permission */ }

    if (existingMsg) {
      await existingMsg.edit({ embeds });
      return { edited: true, messageId: existingMsg.id, guildCount: embeds.length };
    } else {
      const sent = await channel.send({ embeds });
      return { edited: false, messageId: sent.id, guildCount: embeds.length };
    }
  }

  app.post('/api/idleon/post-guild-embed', requireAuth, requireTier('admin'), async (req, res) => {
    try {
      const data = loadIdleon();
      const cfg = { ...defaultConfig(), ...(data.config || {}) };
      const channelId = req.body?.channelId || cfg.guildInviteChannelId;
      const result = await postGuildInviteEmbeds(channelId, data);
      dashAudit(req.userName, 'idleon-post-guild-embed', `Posted guild embed to ${channelId} (${result.edited ? 'edited' : 'new'})`);
      res.json({ success: true, ...result });
    } catch (e) {
      res.json({ success: false, error: e.message });
    }
  });

  // Preview endpoint (returns embed data without posting)
  app.get('/api/idleon/guild-embed-preview', requireAuth, requireTier('viewer'), (req, res) => {
    const data = loadIdleon();
    const embeds = buildGuildInviteEmbeds(data);
    res.json({ success: true, embeds });
  });

  // --- LOA expiry check (called by background timer) ---
  function checkLoaExpiry() {
    const data = loadIdleon();
    const cfg = { ...defaultConfig(), ...(data.config || {}) };
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
        // Use the lower of per-member threshold and current config threshold
        const threshold = Math.min(m.probationMinGp || 0, cfg.probationMinGp || 0);
        const recentGp = memberRangeGp(m, Math.ceil((now - (m.joinedTracking || now)) / (7 * 86400000)) || 2);
        if (recentGp >= threshold) {
          m.status = 'active';
          addTimeline(m, 'probation-passed', `Passed probation with ${recentGp.toLocaleString()} GP`);
        } else {
          m.status = 'watchlist';
          addTimeline(m, 'probation-failed', `Failed probation (${recentGp.toLocaleString()} GP < ${threshold.toLocaleString()} required)`);
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
  // Run once immediately on startup to clear any past-due items
  try { checkLoaExpiry(); } catch (e) {
    console.error('[IdleOn] LOA check startup error:', e.message);
  }
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

  // ── Export data (CSV or JSON) ──
  app.get('/api/idleon/export', requireAuth, requireTier('admin'), (req, res) => {
    try {
      const data = loadIdleon();
      const cfg = { ...defaultConfig(), ...(data.config || {}) };
      const format = String(req.query.format || 'json').toLowerCase();
      const active = data.members.filter(m => m.status !== 'kicked');
      const enriched = active.map(m => enrichMember(m, cfg));

      if (format === 'csv') {
        const headers = ['Name', 'Guild', 'Status', 'WeeklyGP', 'AllTimeGP', 'DaysAway', 'Streak', 'Risk', 'DiscordLinked'];
        const rows = enriched.map(m => [
          `"${String(m.name || '').replace(/"/g, '""')}"`,
          `"${String((data.guilds || []).find(g => g.id === m.guildId)?.name || m.guildId || '').replace(/"/g, '""')}"`,
          m.status || 'active', m.weeklyGp || 0, m.allTimeGp || 0, m.daysAway || 0,
          m.streakCurrent || 0, m.kickRiskScore || 0, m.discordId ? 'Yes' : 'No'
        ].join(','));
        const csv = [headers.join(','), ...rows].join('\n');
        res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="idleon-members.csv"' });
        return res.send(csv);
      }
      res.json({ success: true, members: enriched, guilds: data.guilds, exportedAt: Date.now() });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
  });

  // ── Backup data ──
  app.post('/api/idleon/backup', requireAuth, requireTier('admin'), (req, res) => {
    try {
      const data = loadIdleon();
      const backupDir = path.join(DATA_DIR, 'idleon-backups');
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const backupPath = path.join(backupDir, `backup-${stamp}.json`);
      fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
      // Keep only last 20 backups
      const files = fs.readdirSync(backupDir).filter(f => f.startsWith('backup-')).sort();
      while (files.length > 20) { fs.unlinkSync(path.join(backupDir, files.shift())); }
      res.json({ success: true, file: `backup-${stamp}.json`, size: fs.statSync(backupPath).size });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
  });

  // ── Restore from backup ──
  app.post('/api/idleon/restore', requireAuth, requireTier('owner'), (req, res) => {
    try {
      const { filename } = req.body;
      if (!filename || !/^backup-[\w-]+\.json$/.test(filename)) return res.json({ success: false, error: 'Invalid filename' });
      const backupDir = path.join(DATA_DIR, 'idleon-backups');
      const backupPath = path.join(backupDir, filename);
      if (!fs.existsSync(backupPath)) return res.json({ success: false, error: 'Backup not found' });
      const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
      if (!backupData.members || !Array.isArray(backupData.members)) return res.json({ success: false, error: 'Invalid backup data' });
      saveIdleon(backupData);
      addLog?.(`[IdleOn] Data restored from ${filename} by ${req.session?.user || '?'}`);
      res.json({ success: true, members: backupData.members.length });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
  });

  // ── List backups ──
  app.get('/api/idleon/backups', requireAuth, requireTier('admin'), (req, res) => {
    try {
      const backupDir = path.join(DATA_DIR, 'idleon-backups');
      if (!fs.existsSync(backupDir)) return res.json({ success: true, backups: [] });
      const files = fs.readdirSync(backupDir).filter(f => f.startsWith('backup-') && f.endsWith('.json')).sort().reverse();
      const backups = files.map(f => {
        const stat = fs.statSync(path.join(backupDir, f));
        return { filename: f, size: stat.size, date: stat.mtimeMs };
      });
      res.json({ success: true, backups });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
  });

  // ── Data integrity check ──
  app.get('/api/idleon/integrity', requireAuth, requireTier('admin'), (req, res) => {
    try {
      const data = loadIdleon();
      const cfg = { ...defaultConfig(), ...(data.config || {}) };
      const issues = [];
      const names = new Set();
      for (const m of data.members) {
        if (!m.name) issues.push({ type: 'error', msg: 'Member with no name found' });
        if (names.has(m.name?.toLowerCase())) issues.push({ type: 'warn', msg: `Duplicate member name: ${m.name}` });
        names.add(m.name?.toLowerCase());
        if (m.guildId && !(data.guilds || []).find(g => g.id === m.guildId)) issues.push({ type: 'warn', msg: `${m.name} assigned to unknown guild: ${m.guildId}` });
        const hist = normalizeWeeklyHistory(m.weeklyHistory);
        const weekSeen = new Set();
        for (const h of hist) {
          if (weekSeen.has(h.weekStart)) issues.push({ type: 'warn', msg: `${m.name} has duplicate week entry: ${h.weekStart}` });
          weekSeen.add(h.weekStart);
        }
        if (m.status === 'loa' && !m.loaEnd) issues.push({ type: 'info', msg: `${m.name} on LOA with no end date` });
        if (m.status === 'probation' && !m.probationEnd) issues.push({ type: 'info', msg: `${m.name} on probation with no end date` });
      }
      const kickedNames = new Set(data.members.filter(m => m.status === 'kicked').map(m => m.name?.toLowerCase()));
      for (const w of data.waitlist || []) {
        if (kickedNames.has(w.name?.toLowerCase())) issues.push({ type: 'info', msg: `Waitlisted member "${w.name}" was previously kicked` });
      }
      if (!data.guilds?.length) issues.push({ type: 'warn', msg: 'No guilds configured' });
      res.json({ success: true, issues, total: data.members.length, checked: Date.now() });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
  });

  // ── Fix orphaned guild references ──
  app.post('/api/idleon/integrity/fix-orphans', requireAuth, requireTier('admin'), (req, res) => {
    try {
      const data = loadIdleon();
      const guildIds = new Set((data.guilds || []).map(g => g.id));
      let cleared = 0;
      for (const m of data.members) {
        if (m.guildId && !guildIds.has(m.guildId)) {
          m.guildId = '';
          cleared++;
        }
      }
      if (cleared > 0) saveIdleon(data);
      res.json({ success: true, membersCleared: cleared });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
  });

  // ── Undo kick (revert to previous status) ──
  app.post('/api/idleon/undo-kick', requireAuth, requireTier('admin'), (req, res) => {
    try {
      const { name } = req.body;
      const data = loadIdleon();
      const member = findMemberByName(data.members, name);
      if (!member) return res.json({ success: false, error: 'Member not found' });
      if (member.status !== 'kicked') return res.json({ success: false, error: 'Member is not kicked' });
      // Find last status before kick in timeline
      const kickEvent = [...(member.timeline || [])].reverse().find(e => e.event === 'status_change' && e.details?.includes('kicked'));
      const prevStatus = kickEvent?.details?.match(/from (\w+)/)?.[1] || 'active';
      member.status = prevStatus;
      addTimeline(member, 'undo-kick', `Reverted to ${prevStatus} by ${req.session?.user || '?'}`);
      // Remove from kick log
      data.kickLog = (data.kickLog || []).filter(l => l.name?.toLowerCase() !== member.name.toLowerCase() || Date.now() - l.date > 60000);
      saveIdleon(data);
      res.json({ success: true, newStatus: prevStatus });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
  });

  // ── Member comparison ──
  app.get('/api/idleon/compare', requireAuth, requireTier('viewer'), (req, res) => {
    try {
      const names = String(req.query.names || '').split(',').map(n => n.trim()).filter(Boolean).slice(0, 5);
      if (names.length < 2) return res.json({ success: false, error: 'Need at least 2 member names' });
      const data = loadIdleon();
      const cfg = { ...defaultConfig(), ...(data.config || {}) };
      const results = names.map(n => {
        const m = findMemberByName(data.members, n);
        if (!m) return { name: n, found: false };
        const enriched = enrichMember(m, cfg);
        return { name: m.name, found: true, weeklyGp: enriched.weeklyGp, allTimeGp: enriched.allTimeGp, daysAway: enriched.daysAway, streak: enriched.streakCurrent, risk: enriched.kickRiskScore, status: m.status || 'active', weeklyHistory: normalizeWeeklyHistory(m.weeklyHistory).slice(-16) };
      });
      res.json({ success: true, members: results });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
  });

  // ── Config reset to defaults ──
  app.post('/api/idleon/config/reset', requireAuth, requireTier('owner'), (req, res) => {
    try {
      const data = loadIdleon();
      data.config = defaultConfig();
      saveIdleon(data);
      addLog?.(`[IdleOn] Config reset to defaults by ${req.session?.user || '?'}`);
      res.json({ success: true, config: data.config });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
  });

  // ── Role sync dry run ──
  app.post('/api/idleon/sync-roles-dry', requireAuth, requireTier('admin'), (req, res) => {
    try {
      const data = loadIdleon();
      const cfg = { ...defaultConfig(), ...(data.config || {}) };
      const milestones = (cfg.roleMilestones || []).sort((a, b) => b.gpThreshold - a.gpThreshold);
      if (!milestones.length) return res.json({ success: true, changes: [], message: 'No milestones configured' });
      const changes = [];
      const active = data.members.filter(m => m.status !== 'kicked' && m.discordId);
      for (const m of active) {
        const gp = memberAllTimeGp(m);
        const eligible = milestones.filter(ms => gp >= ms.gpThreshold);
        for (const ms of eligible) {
          changes.push({ member: m.name, allTimeGp: gp, action: 'add', role: ms.roleName || ms.roleId, threshold: ms.gpThreshold });
        }
      }
      res.json({ success: true, changes, total: changes.length });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
  });

  // ── Kick log stats ──
  app.get('/api/idleon/kick-stats', requireAuth, requireTier('viewer'), (req, res) => {
    try {
      const data = loadIdleon();
      const logs = data.kickLog || [];
      const now = Date.now();
      const week = logs.filter(l => now - l.date < 7 * 86400000).length;
      const month = logs.filter(l => now - l.date < 30 * 86400000).length;
      const reasons = {};
      logs.forEach(l => { const r = l.reason || 'No reason'; reasons[r] = (reasons[r] || 0) + 1; });
      const topReasons = Object.entries(reasons).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([reason, count]) => ({ reason, count }));
      const byMonth = {};
      logs.forEach(l => { const k = new Date(l.date).toISOString().slice(0, 7); byMonth[k] = (byMonth[k] || 0) + 1; });
      res.json({ success: true, total: logs.length, thisWeek: week, thisMonth: month, topReasons, byMonth });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
  });

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
        accountReviews: [],
        roleMilestones: []
      };
      saveIdleon(freshData);
      res.json({ success: true, message: 'All IdleOn member/guild data cleared. Config preserved.' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ══════════════════════════════════════════════════════════════
  // ── Account Review Queue (with Twitch redemption priority) ──
  // ══════════════════════════════════════════════════════════════

  // GET all reviews (sorted: redeemed first, then by requestedAt)
  app.get('/api/idleon/account-reviews', requireAuth, requireTier('viewer'), (req, res) => {
    const data = loadIdleon();
    const reviews = (data.accountReviews || [])
      .filter(r => r.status !== 'completed')
      .sort((a, b) => {
        // Redeemed first
        if (a.priority === 'redeemed' && b.priority !== 'redeemed') return -1;
        if (b.priority === 'redeemed' && a.priority !== 'redeemed') return 1;
        // Then by requestedAt (oldest first)
        return (a.requestedAt || 0) - (b.requestedAt || 0);
      });
    const completed = (data.accountReviews || []).filter(r => r.status === 'completed').slice(-50);
    res.json({ success: true, reviews, completed });
  });

  // POST add review manually
  app.post('/api/idleon/account-reviews', requireAuth, requireTier('admin'), (req, res) => {
    const { name, twitchName, notes, priority } = req.body || {};
    if (!name) return res.json({ success: false, error: 'Name required' });
    const data = loadIdleon();
    if (!Array.isArray(data.accountReviews)) data.accountReviews = [];
    if (data.accountReviews.length >= 500) return res.json({ success: false, error: 'Queue full (500 max)' });
    // Dedup by fuzzy name match
    const lower = String(name).trim().toLowerCase();
    const fuzzyHit = findReviewByFuzzyName(data.accountReviews, lower);
    if (fuzzyHit) {
      return res.json({ success: false, error: `Already in queue (matched "${fuzzyHit.name}")` });
    }
    data.accountReviews.push({
      id: crypto.randomUUID(),
      name: String(name).trim().slice(0, 50),
      twitchName: String(twitchName || '').trim().slice(0, 50),
      discordId: String(req.body.discordId || '').trim().slice(0, 25),
      discordName: String(req.body.discordName || '').trim().slice(0, 50),
      requestedAt: Date.now(),
      priority: priority === 'redeemed' ? 'redeemed' : 'normal',
      status: 'pending',
      redeemedAt: priority === 'redeemed' ? Date.now() : null,
      completedAt: null,
      completedBy: '',
      notes: String(notes || '').slice(0, 500),
      source: 'manual',
      messageUrl: ''
    });
    saveIdleon(data);
    dashAudit(req.userName, 'idleon-review-add', `Added ${name} to review queue`);
    res.json({ success: true });
  });

  // POST update review (status, notes, priority)
  // When completing: optionally posts a closing message to the Discord thread & deletes it
  app.post('/api/idleon/account-reviews/update', requireAuth, requireTier('admin'), async (req, res) => {
    const { id, status, notes, priority, completionMessage, deleteThread } = req.body || {};
    const data = loadIdleon();
    const entry = (data.accountReviews || []).find(r => r.id === id);
    if (!entry) return res.json({ success: false, error: 'Not found' });

    let threadResult = null;

    if (status) {
      entry.status = String(status).slice(0, 20);
      if (status === 'completed') {
        entry.completedAt = Date.now();
        entry.completedBy = req.userName || '';

        // Post closing message & delete thread if requested
        if (entry.messageUrl) {
          try {
            // Extract thread/channel ID from Discord message URL
            // Format: https://discord.com/channels/GUILD_ID/CHANNEL_ID/MESSAGE_ID
            const urlParts = entry.messageUrl.split('/');
            const channelId = urlParts[urlParts.length - 2];

            if (channelId) {
              const thread = await client.channels.fetch(channelId).catch(() => null);
              if (thread) {
                // Send closing message as embed with a delete button
                if (completionMessage) {
                  const safeMsg = String(completionMessage).slice(0, 4000);
                  const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                      .setCustomId(`rv_delete_thread_${thread.id}`)
                      .setLabel('Delete Thread')
                      .setStyle(ButtonStyle.Danger)
                      .setEmoji('🗑️')
                  );
                  await thread.send({
                    embeds: [{
                      color: 0x4caf50,
                      title: 'Account Review Complete',
                      description: safeMsg,
                      footer: { text: `Completed by ${req.userName || 'Staff'} via Dashboard` },
                      timestamp: new Date().toISOString()
                    }],
                    components: [row]
                  }).catch(() => null);
                  threadResult = 'message_sent';
                }
              } else {
                threadResult = 'thread_not_found';
              }
            }
          } catch (e) {
            threadResult = 'thread_error: ' + e.message;
          }
        }
      }
    }
    if (notes !== undefined) entry.notes = String(notes).slice(0, 500);
    if (req.body.name !== undefined) entry.name = String(req.body.name).trim().slice(0, 50);
    if (req.body.twitchName !== undefined) entry.twitchName = String(req.body.twitchName).trim().slice(0, 50);
    if (req.body.redeemedBy !== undefined) entry.redeemedBy = String(req.body.redeemedBy).trim().slice(0, 50);
    if (priority === 'redeemed' || priority === 'normal') {
      entry.priority = priority;
      if (priority === 'redeemed' && !entry.redeemedAt) entry.redeemedAt = Date.now();
    }
    saveIdleon(data);
    dashAudit(req.userName, 'idleon-review-complete', `Review ${entry.name} → ${status || 'updated'}${threadResult ? ' (thread: ' + threadResult + ')' : ''}`);
    res.json({ success: true, threadResult });
  });

  // POST delete review
  app.post('/api/idleon/account-reviews/delete', requireAuth, requireTier('admin'), (req, res) => {
    const { id } = req.body || {};
    const data = loadIdleon();
    data.accountReviews = (data.accountReviews || []).filter(r => r.id !== id);
    saveIdleon(data);
    res.json({ success: true });
  });

  // POST scan Discord channel for review requests
  app.post('/api/idleon/account-reviews/scan', requireAuth, requireTier('admin'), async (req, res) => {
    const data = loadIdleon();
    const cfg = { ...defaultConfig(), ...(data.config || {}) };
    const channelId = cfg.reviewChannelId || req.body?.channelId;
    if (!channelId) return res.json({ success: false, error: 'No review channel configured' });

    try {
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel) return res.json({ success: false, error: 'Channel not found' });

      if (!Array.isArray(data.accountReviews)) data.accountReviews = [];
      const existingNames = new Set(
        data.accountReviews.filter(r => r.status !== 'completed').map(r => r.name.toLowerCase())
      );
      const existingDiscordIds = new Set(
        data.accountReviews.filter(r => r.status !== 'completed' && r.discordId).map(r => r.discordId)
      );
      const added = [];
      const skipped = [];

      // Build a set of tag IDs that mean "completed" so we can skip those threads
      const completedTagNames = new Set(['completed', 'done', 'finished', 'closed', 'resolved']);
      let completedTagIds = new Set();
      if (channel.availableTags) {
        for (const tag of channel.availableTags) {
          if (completedTagNames.has(tag.name.toLowerCase())) completedTagIds.add(tag.id);
        }
      }

      // Collect entries from forum threads or text channel messages
      const entries = [];
      if (channel.threads) {
        // Forum channel — fetch active + archived threads
        const active = await channel.threads.fetchActive().catch(() => ({ threads: new Map() }));
        const archived = await channel.threads.fetchArchived({ limit: 30 }).catch(() => ({ threads: new Map() }));
        const allThreads = [...active.threads.values(), ...archived.threads.values()];

        for (const thread of allThreads) {
          // Skip threads tagged as completed
          if (thread.appliedTags && thread.appliedTags.some(tid => completedTagIds.has(tid))) continue;

          // Get the opening message of the thread
          const starter = await thread.fetchStarterMessage().catch(() => null);
          if (!starter || starter.author?.bot) continue;

          // Resolve guild member for best display name (nickname > globalName > username)
          let threadAuthorName = starter.author?.displayName || starter.author?.username || '';
          if (starter.author?.id && channel.guild) {
            const member = await channel.guild.members.fetch(starter.author.id).catch(() => null);
            if (member) threadAuthorName = member.displayName || threadAuthorName;
          }

          // Also check thread replies for toolbox links (from anyone, not just the author)
          let threadContent = starter.content || '';
          const toolboxRe = /https?:\/\/(?:www\.)?(?:idleontoolbox|idleonefficiency)\.com\/(?:\?profile=|profile\/|\?profile%3D)([A-Za-z0-9_-]+)/i;
          // Broader check: any URL from these domains counts as "link posted"
          const anyToolboxRe = /https?:\/\/(?:www\.)?(?:idleontoolbox|idleonefficiency)\.com/i;
          if (!anyToolboxRe.test(threadContent) && !anyToolboxRe.test(thread.name || '')) {
            const replies = await thread.messages.fetch({ limit: 20 }).catch(() => new Map());
            for (const [, reply] of replies) {
              if (reply.id === starter.id) continue;
              if (reply.author?.bot) continue;
              if (anyToolboxRe.test(reply.content || '')) {
                threadContent = threadContent + '\n' + reply.content;
                break;
              }
            }
          }

          entries.push({
            author: threadAuthorName,
            authorId: starter.author?.id || '',
            content: threadContent,
            timestamp: starter.createdTimestamp || thread.createdTimestamp,
            threadName: thread.name || '',
            url: starter.url || thread.url || '',
            thread: thread
          });
        }
      } else {
        // Regular text channel
        const fetched = await channel.messages.fetch({ limit: 100 }).catch(() => new Map());
        const now = Date.now();
        const thirtyDaysAgo = now - 30 * 86400000;
        for (const [, msg] of fetched) {
          if (msg.author?.bot || msg.createdTimestamp < thirtyDaysAgo) continue;

          // Resolve guild member for best display name (nickname > globalName > username)
          let msgAuthorName = msg.author?.displayName || msg.author?.username || '';
          if (msg.author?.id && channel.guild) {
            const member = await channel.guild.members.fetch(msg.author.id).catch(() => null);
            if (member) msgAuthorName = member.displayName || msgAuthorName;
          }

          entries.push({
            author: msgAuthorName,
            authorId: msg.author?.id || '',
            content: msg.content || '',
            timestamp: msg.createdTimestamp,
            threadName: '',
            url: msg.url || ''
          });
        }
      }

      for (const entry of entries) {
        const content = entry.content;
        if (content.length < 2 && !entry.threadName) continue;

        // 1) Extract idleontoolbox or idleonefficiency profile link → use profile name as the entry name
        const toolboxMatch = content.match(/https?:\/\/(?:www\.)?(?:idleontoolbox|idleonefficiency)\.com\/(?:\?profile=|profile\/|\?profile%3D)([A-Za-z0-9_-]+)/i);
        const threadNameToolboxMatch = (entry.threadName || '').match(/https?:\/\/(?:www\.)?(?:idleontoolbox|idleonefficiency)\.com\/(?:\?profile=|profile\/|\?profile%3D)([A-Za-z0-9_-]+)/i);
        // Broader check: any URL from these domains (even non-profile paths) means they posted a link
        const anyLinkInContent = /https?:\/\/(?:www\.)?(?:idleontoolbox|idleonefficiency)\.com/i.test(content);
        const anyLinkInThreadName = /https?:\/\/(?:www\.)?(?:idleontoolbox|idleonefficiency)\.com/i.test(entry.threadName || '');
        const profileName = (toolboxMatch ? toolboxMatch[1] : null) || (threadNameToolboxMatch ? threadNameToolboxMatch[1] : null);
        const profileUrl = toolboxMatch ? toolboxMatch[0] : (threadNameToolboxMatch ? threadNameToolboxMatch[0] : '');

        // 2) Name priority: profile name from link > thread title > author display name
        const name = profileName || entry.threadName || entry.author || '';
        if (!name || name.length < 2) continue;

        const lower = name.toLowerCase();
        // Dedup by fuzzy name match or by discordId
        const fuzzyName = fuzzyMatchInSet(lower, existingNames);
        const existingById = entry.authorId && existingDiscordIds.has(entry.authorId);

        // Auto-detect paid/redeemed keywords for priority
        const fullText = (entry.threadName + ' ' + content).toLowerCase();
        const paidMatch = fullText.match(/(?:paid|redeemed?|bought|purchased)\s+(?:by|from)\s+([\w]+)/i);
        const isPriority = /\b(paid|redeem(?:ed)?|bought|purchased|channel\s*points?)\b|\b\d+k\b|\d+k?\s*(?:points|pts)\b|\bpoints\s*redeemed?\b|\(paid\)/i.test(fullText);

        // If duplicate, still update priority and link if needed
        if (fuzzyName || existingById) {
          const existing = data.accountReviews.find(r => {
            if (r.status === 'completed') return false;
            if (existingById && r.discordId === entry.authorId) return true;
            if (fuzzyName && r.name.toLowerCase() === fuzzyName) return true;
            return false;
          });
          if (existing) {
            if (isPriority && existing.priority !== 'redeemed') {
              existing.priority = 'redeemed';
              existing.redeemedAt = existing.redeemedAt || entry.timestamp;
              if (paidMatch && !existing.redeemedBy) existing.redeemedBy = paidMatch[1].slice(0, 50);
            }
            // Update notes with profile link if the existing entry has none
            if (profileUrl) {
              const existingHasLink = /https?:\/\/(?:www\.)?(?:idleontoolbox|idleonefficiency)\.com/i.test(existing.notes || '');
              if (!existingHasLink) {
                existing.notes = (profileUrl + '\n' + (existing.notes || '')).slice(0, 500);
              }
            }
          }
          skipped.push(name);
          continue;
        }

        existingNames.add(lower);
        if (entry.authorId) existingDiscordIds.add(entry.authorId);

        data.accountReviews.push({
          id: crypto.randomUUID(),
          name: name.slice(0, 50),
          twitchName: '',
          discordId: entry.authorId,
          discordName: entry.author.slice(0, 50),
          requestedAt: entry.timestamp,
          priority: isPriority ? 'redeemed' : 'normal',
          status: 'pending',
          redeemedAt: isPriority ? entry.timestamp : null,
          redeemedBy: paidMatch ? paidMatch[1].slice(0, 50) : '',
          completedAt: null,
          completedBy: '',
          notes: (profileUrl ? profileUrl + '\n' : '') + content.slice(0, 500),
          source: 'scan',
          messageUrl: entry.url
        });
        added.push(name);

        // Ping thread maker if no toolbox/efficiency link was found anywhere
        // Use broad domain check so ANY idleontoolbox/idleonefficiency URL counts
        if (!anyLinkInContent && !anyLinkInThreadName && entry.thread && entry.authorId) {
          entry.thread.send(`<@${entry.authorId}> Hey! Please include your IdleonToolbox profile link (e.g. \`https://idleontoolbox.com/?profile=YourName\`) so we can review your account. Thanks!`).catch(() => {});
        } else if (!anyLinkInContent && anyLinkInThreadName && entry.thread && entry.authorId) {
          // Link was posted in the thread name only — can't be clicked there
          entry.thread.send(`<@${entry.authorId}> We found your profile link in the thread name, but links there can't be clicked! Please post it as a message in this thread instead. Thanks!`).catch(() => {});
        }
      }

      // Cap at 500
      if (data.accountReviews.length > 500) data.accountReviews = data.accountReviews.slice(-500);
      saveIdleon(data);
      dashAudit(req.userName, 'idleon-review-scan', `Review scan: ${added.length} added, ${skipped.length} skipped`);
      res.json({ success: true, added, skipped: skipped.length, total: data.accountReviews.filter(r => r.status !== 'completed').length });
    } catch (e) {
      res.json({ success: false, error: e.message });
    }
  });

  // GET list of Twitch custom rewards (so user can pick the reward ID from a dropdown)
  app.get('/api/idleon/twitch-rewards', requireAuth, requireTier('admin'), async (req, res) => {
    const accessToken = (twitchTokens && twitchTokens.access_token) || (streamVars && streamVars.TWITCH_ACCESS_TOKEN) || process.env.TWITCH_ACCESS_TOKEN || '';
    const clientId = process.env.TWITCH_CLIENT_ID || '';
    const broadcasterId = (streamVars && streamVars.BROADCASTER_ID) || process.env.BROADCASTER_ID || '';
    if (!accessToken || !clientId || !broadcasterId) {
      return res.json({ success: false, error: 'Twitch credentials not configured (need TWITCH_ACCESS_TOKEN, TWITCH_CLIENT_ID, BROADCASTER_ID)' });
    }
    try {
      // only_manageable_rewards=true → only rewards created by this Client-ID (bot can read redemptions for these)
      const url = `https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${encodeURIComponent(broadcasterId)}&only_manageable_rewards=true`;
      const resp = await fetch(url, {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Client-ID': clientId }
      });
      if (!resp.ok) {
        const errBody = await resp.text().catch(() => '');
        return res.json({ success: false, error: `Twitch API error ${resp.status}: ${errBody.slice(0, 200)}` });
      }
      const body = await resp.json();
      const rewards = (body.data || []).map(r => ({
        id: r.id,
        title: r.title,
        cost: r.cost,
        enabled: r.is_enabled,
        color: r.background_color || ''
      }));
      res.json({ success: true, rewards });
    } catch (e) {
      res.json({ success: false, error: e.message });
    }
  });

  // POST create a Twitch custom reward (so it's owned by this Client-ID and redemptions can be read)
  app.post('/api/idleon/twitch-rewards/create', requireAuth, requireTier('admin'), async (req, res) => {
    const accessToken = (twitchTokens && twitchTokens.access_token) || (streamVars && streamVars.TWITCH_ACCESS_TOKEN) || process.env.TWITCH_ACCESS_TOKEN || '';
    const clientId = process.env.TWITCH_CLIENT_ID || '';
    const broadcasterId = (streamVars && streamVars.BROADCASTER_ID) || process.env.BROADCASTER_ID || '';
    if (!accessToken || !clientId || !broadcasterId) {
      return res.json({ success: false, error: 'Twitch credentials not configured' });
    }
    const title = String(req.body.title || 'Account Review').slice(0, 45);
    const cost = Math.max(1, Math.min(1000000000, Number(req.body.cost) || 10000));
    try {
      const url = `https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${encodeURIComponent(broadcasterId)}`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Client-ID': clientId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          cost,
          prompt: 'Enter the name of the account you want reviewed',
          is_user_input_required: true,
          is_enabled: true,
          should_redemptions_skip_request_queue: false
        })
      });
      if (!resp.ok) {
        const errBody = await resp.text().catch(() => '');
        return res.json({ success: false, error: `Twitch API error ${resp.status}: ${errBody.slice(0, 200)}` });
      }
      const body = await resp.json();
      const reward = (body.data || [])[0];
      if (!reward) return res.json({ success: false, error: 'No reward returned by Twitch' });
      // Auto-save the reward ID to config
      const data = loadIdleon();
      if (!data.config) data.config = {};
      data.config.reviewTwitchRewardId = reward.id;
      saveIdleon(data);
      addLog('info', `Created Twitch reward "${reward.title}" (${reward.id}) — ${reward.cost} pts`);
      res.json({ success: true, reward: { id: reward.id, title: reward.title, cost: reward.cost } });
    } catch (e) {
      res.json({ success: false, error: e.message });
    }
  });

  // POST sync Twitch channel point redemptions → upgrade/add as 'redeemed' priority
  app.post('/api/idleon/account-reviews/sync-twitch', requireAuth, requireTier('admin'), async (req, res) => {
    const data = loadIdleon();
    const cfg = { ...defaultConfig(), ...(data.config || {}) };
    const rewardId = cfg.reviewTwitchRewardId || req.body?.rewardId;
    if (!rewardId) return res.json({ success: false, error: 'No Twitch reward ID configured. Set it in IdleOn config.' });

    const accessToken = (twitchTokens && twitchTokens.access_token) || (streamVars && streamVars.TWITCH_ACCESS_TOKEN) || process.env.TWITCH_ACCESS_TOKEN || '';
    const clientId = process.env.TWITCH_CLIENT_ID || '';
    const broadcasterId = (streamVars && streamVars.BROADCASTER_ID) || process.env.BROADCASTER_ID || '';
    if (!accessToken || !clientId || !broadcasterId) {
      return res.json({ success: false, error: 'Twitch credentials not configured (need TWITCH_ACCESS_TOKEN, TWITCH_CLIENT_ID, BROADCASTER_ID)' });
    }

    try {
      // Fetch unfulfilled redemptions from Twitch API
      const url = `https://api.twitch.tv/helix/channel_points/custom_rewards/redemptions?broadcaster_id=${encodeURIComponent(broadcasterId)}&reward_id=${encodeURIComponent(rewardId)}&status=UNFULFILLED&first=50`;
      const resp = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Client-ID': clientId
        }
      });
      if (!resp.ok) {
        const errBody = await resp.text().catch(() => '');
        return res.json({ success: false, error: `Twitch API error ${resp.status}: ${errBody.slice(0, 200)}` });
      }
      const twitchData = await resp.json();
      const redemptions = twitchData.data || [];

      if (!Array.isArray(data.accountReviews)) data.accountReviews = [];
      const existingNames = new Set(
        data.accountReviews.filter(r => r.status !== 'completed').map(r => r.name.toLowerCase())
      );
      const existingTwitch = new Set(
        data.accountReviews.filter(r => r.status !== 'completed' && r.twitchName).map(r => r.twitchName.toLowerCase())
      );

      let added = 0, upgraded = 0;
      for (const r of redemptions) {
        const twitchLogin = (r.user_login || r.user_name || '').toLowerCase();
        const twitchDisplay = r.user_name || r.user_login || '';
        const redeemedAt = r.redeemed_at ? new Date(r.redeemed_at).getTime() : Date.now();
        // User input from the redemption (optional text the person typed when redeeming)
        const userInput = (r.user_input || '').trim();

        if (!twitchLogin) continue;

        // Parse user_input: viewer enters their Discord name (could be multi-word)
        // Formats: "DiscordName", "for DiscordName", "review for DiscordName", "DiscordName (some note)"
        let beneficiary = '';
        let extraNote = '';
        if (userInput) {
          // Strip common prefixes (including combined like "review for")
          let cleaned = userInput
            .replace(/^(?:reviewing\s+for|review\s+for|for|pour|reviewing|review)\s+/i, '')
            .trim();
          // If has parentheses at end, split into name + note
          const parenMatch = cleaned.match(/^(.+?)\s*\((.+)\)\s*$/);
          if (parenMatch) {
            beneficiary = parenMatch[1].trim();
            extraNote = parenMatch[2].trim();
          } else {
            // Separate name from trailing notes using explicit separators only
            // e.g. "IamEdgar - need help" → name=IamEdgar, note=need help
            // e.g. "IamEdgar, check alchemy" → name=IamEdgar, note=check alchemy
            // Names can have spaces (e.g. "John Doe") so we only split on , - –
            const sepMatch = cleaned.match(/^([^,\-–]+?)\s*[,\-–]\s+(.+)$/);
            if (sepMatch) {
              beneficiary = sepMatch[1].trim();
              extraNote = sepMatch[2].trim();
            } else {
              // Entire input is the name (can have spaces, numbers, special chars)
              beneficiary = cleaned;
            }
          }
        }

        // The review name is the beneficiary (who to review), fallback to redeemer
        const entryName = beneficiary || twitchDisplay;
        const isForSomeoneElse = beneficiary && beneficiary.toLowerCase() !== twitchLogin && beneficiary.toLowerCase() !== twitchDisplay.toLowerCase();

        // Check if already in queue by Twitch name
        if (existingTwitch.has(twitchLogin)) {
          // Upgrade to redeemed if not already
          const existing = data.accountReviews.find(
            e => e.status !== 'completed' && e.twitchName && e.twitchName.toLowerCase() === twitchLogin
          );
          if (existing && existing.priority !== 'redeemed') {
            existing.priority = 'redeemed';
            existing.redeemedAt = redeemedAt;
            if (!existing.redeemedBy) existing.redeemedBy = twitchDisplay;
            upgraded++;
          }
          continue;
        }

        // Check by fuzzy name match (beneficiary or redeemer)
        const namesToCheck = [twitchLogin, twitchDisplay.toLowerCase()];
        if (beneficiary) namesToCheck.push(beneficiary.toLowerCase());

        let fuzzyHit = null;
        for (const n of namesToCheck) {
          fuzzyHit = findReviewByFuzzyName(data.accountReviews, n);
          if (fuzzyHit) break;
        }
        if (!fuzzyHit) {
          // Also check if the full entryName matches any existing name
          fuzzyHit = findReviewByFuzzyName(data.accountReviews, entryName);
        }

        if (fuzzyHit) {
          fuzzyHit.twitchName = twitchDisplay;
          if (!fuzzyHit.redeemedBy) fuzzyHit.redeemedBy = twitchDisplay;
          if (fuzzyHit.priority !== 'redeemed') {
            fuzzyHit.priority = 'redeemed';
            fuzzyHit.redeemedAt = redeemedAt;
            upgraded++;
          }
          continue;
        }

        // New entry from Twitch
        const notesParts = [];
        if (isForSomeoneElse) notesParts.push(`Redeemed by ${twitchDisplay} for ${beneficiary}`);
        if (extraNote) notesParts.push(extraNote);
        if (userInput && !isForSomeoneElse) notesParts.push(`Twitch input: ${userInput.slice(0, 300)}`);

        data.accountReviews.push({
          id: crypto.randomUUID(),
          name: entryName.slice(0, 50),
          twitchName: twitchDisplay.slice(0, 50),
          redeemedBy: twitchDisplay.slice(0, 50),
          discordId: '',
          requestedAt: redeemedAt,
          priority: 'redeemed',
          status: 'pending',
          redeemedAt,
          completedAt: null,
          completedBy: '',
          notes: notesParts.join('\n').slice(0, 500),
          source: 'twitch',
          messageUrl: ''
        });
        existingTwitch.add(twitchLogin);
        added++;
      }

      if (data.accountReviews.length > 500) data.accountReviews = data.accountReviews.slice(-500);
      saveIdleon(data);
      dashAudit(req.userName, 'idleon-review-twitch-sync', `Twitch sync: ${added} added, ${upgraded} upgraded, ${redemptions.length} total redemptions`);
      res.json({ success: true, added, upgraded, totalRedemptions: redemptions.length });
    } catch (e) {
      res.json({ success: false, error: e.message });
    }
  });

  // POST ping a reviewer in their Discord thread ("it's your turn")
  app.post('/api/idleon/account-reviews/ping', requireAuth, requireTier('admin'), async (req, res) => {
    const { id } = req.body || {};
    const data = loadIdleon();
    const entry = (data.accountReviews || []).find(r => r.id === id);
    if (!entry) return res.json({ success: false, error: 'Review not found' });
    if (!entry.messageUrl) return res.json({ success: false, error: 'No Discord thread linked to this review' });

    try {
      const urlParts = entry.messageUrl.split('/');
      const channelId = urlParts[urlParts.length - 2];
      if (!channelId) return res.json({ success: false, error: 'Could not parse thread ID from URL' });

      const thread = await client.channels.fetch(channelId).catch(() => null);
      if (!thread) return res.json({ success: false, error: 'Thread not found (may have been deleted)' });

      const mention = entry.discordId ? `<@${entry.discordId}>` : `**${entry.name}**`;
      await thread.send({
        content: `${mention} — We're ready for you! It's your turn for your account review. Please be available so we can get started! 🎮`,
        embeds: [{
          color: 0x4fc3f7,
          title: '🔔 Your Account Review is Ready',
          description: `Hey ${mention}, a reviewer is waiting for you.\nPlease respond in this thread so we can begin your account review!`,
          footer: { text: `Pinged by ${req.userName || 'Staff'} via Dashboard` },
          timestamp: new Date().toISOString()
        }]
      });

      entry.lastPingedAt = Date.now();
      saveIdleon(data);
      dashAudit(req.userName, 'idleon-review-ping', `Pinged ${entry.name} for account review`);
      res.json({ success: true });
    } catch (e) {
      res.json({ success: false, error: e.message });
    }
  });

  // POST clear completed reviews
  app.post('/api/idleon/account-reviews/clear-completed', requireAuth, requireTier('admin'), (req, res) => {
    const data = loadIdleon();
    const before = (data.accountReviews || []).length;
    data.accountReviews = (data.accountReviews || []).filter(r => r.status !== 'completed');
    saveIdleon(data);
    dashAudit(req.userName, 'idleon-review-clear', `Cleared ${before - data.accountReviews.length} completed reviews`);
    res.json({ success: true, cleared: before - data.accountReviews.length });
  });

  // Get review feedback: find a review by name or Discord ID and return the completion message from the thread
  async function getReviewFeedback(nameOrId) {
    const data = loadIdleon();
    const reviews = data.accountReviews || [];
    const query = String(nameOrId).trim().toLowerCase();
    // Find review by name (exact or partial) or by discordId
    const review = reviews.find(r => r.name.toLowerCase() === query || r.discordId === nameOrId)
      || reviews.find(r => r.name.toLowerCase().includes(query));
    if (!review) return { found: false, error: 'No review found for that name.' };
    if (review.status !== 'completed') return { found: true, name: review.name, error: 'Review is not completed yet (status: ' + (review.status || 'pending') + ').' };
    if (!review.messageUrl) return { found: true, name: review.name, error: 'No Discord thread linked to this review.' };

    // Try to fetch the completion message from the thread
    try {
      const urlParts = review.messageUrl.split('/');
      const channelId = urlParts[urlParts.length - 2];
      if (!channelId) return { found: true, name: review.name, error: 'Could not resolve thread from URL.' };
      const thread = await client.channels.fetch(channelId).catch(() => null);
      if (!thread) return { found: true, name: review.name, error: 'Thread not found (may have been deleted).' };

      // Fetch recent messages, look for the completion embed from the bot
      const messages = await thread.messages.fetch({ limit: 20 });
      let feedback = null;
      for (const msg of messages.values()) {
        if (msg.author.id === client.user.id && msg.embeds.length > 0) {
          const embed = msg.embeds.find(e => e.title === 'Account Review Complete');
          if (embed) {
            feedback = embed.description || '(no message)';
            break;
          }
        }
      }
      if (!feedback) return { found: true, name: review.name, completedBy: review.completedBy, error: 'No feedback message found in the thread.' };
      return { found: true, name: review.name, completedBy: review.completedBy, completedAt: review.completedAt, feedback };
    } catch (e) {
      return { found: true, name: review.name, error: 'Error fetching thread: ' + e.message };
    }
  }

  // Return functions for slash commands
  return { getGuildHealth, getLeaderboard, getMemberQuickStats, checkLoaExpiry, getReviewFeedback };
}
