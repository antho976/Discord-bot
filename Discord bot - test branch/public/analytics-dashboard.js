/**
 * Analytics Dashboard - Ultimate Stream Statistics
 * Comprehensive analytics with achievements, goals, predictions & more
 */

class AnalyticsDashboard {
  constructor(data) {
    this.history = data.history || [];
    this.viewerGraphHistory = data.viewerGraphHistory || [];
    this.currentStreamViewerData = data.currentStreamViewerData || [];
    this.currentStreamGameTimeline = data.currentStreamGameTimeline || [];
    this.lastStreamId = data.lastStreamId;
    this.isLive = data.isLive;
    this.currentStartedAt = data.currentStartedAt;
    this.stats = data.stats || {};
    this.goals = this.loadGoals();
    
    this.filteredHistory = [...this.history];
    this.currentFilter = 'all';
    this.sortColumn = 'date';
    this.sortDirection = 'desc';
    this.chart = null;
  }

  init() {
    console.log('[Analytics] Initializing with', this.history.length, 'streams');
    this.setupEventListeners();
    this.render();
  }

  setupEventListeners() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.currentFilter = e.target.dataset.filter;
        this.applyFilter();
        this.render();
      });
    });

    const exportBtn = document.querySelector('.export-btn');
    if (exportBtn) exportBtn.addEventListener('click', () => this.exportCSV());

    const chartSelect = document.getElementById('chart-type-select');
    if (chartSelect) chartSelect.addEventListener('change', (e) => this.renderChart(e.target.value));

    const closeBtn = document.querySelector('.modal-close');
    if (closeBtn) closeBtn.addEventListener('click', () => document.getElementById('stream-detail-modal').style.display = 'none');

    window.addEventListener('click', (e) => {
      const modal = document.getElementById('stream-detail-modal');
      if (e.target === modal) modal.style.display = 'none';
    });
  }

  applyFilter() {
    const now = new Date();
    switch (this.currentFilter) {
      case 'week': this.filteredHistory = this.history.filter(s => new Date(s.startedAt) >= new Date(now - 7*24*60*60*1000)); break;
      case '30days': this.filteredHistory = this.history.filter(s => new Date(s.startedAt) >= new Date(now - 30*24*60*60*1000)); break;
      case 'month': this.filteredHistory = this.history.filter(s => { const d = new Date(s.startedAt); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }); break;
      default: this.filteredHistory = [...this.history];
    }
  }

  render() {
    this.renderLiveStats();
    this.renderMetricsCards();
    this.renderConsistencyScore();
    this.renderAchievements();
    this.renderGoalsTracker();
    this.renderStreaksAndRecords();
    this.renderPredictions();
    this.renderContributionGraph();
    this.renderMonthlyReportCard();
    this.renderTimeAnalysis();
    this.renderGrowthStats();
    this.renderStreamsTable();
    this.renderStreamComparison();
    this.renderDurationStats();
    this.renderGamingStats();
    this.renderTitleAnalysis();
    this.renderPersonalBests();
    this.renderChart('viewers');
    this.renderAIInsights();
  }

  // ==================== CALCULATIONS ====================
  
  calculateMetrics() {
    const streams = this.filteredHistory;
    if (streams.length === 0) return { totalStreams: 0, totalHours: 0, avgDuration: 0, avgViewers: 0, peakViewers: 0, totalGames: 0, trends: { viewers: 0 } };
    const totalSec = streams.reduce((sum, s) => sum + (s.duration || 0), 0);
    const viewers = streams.map(s => s.peakViewers || s.viewers || 0);
    const avgViewers = viewers.reduce((a, b) => a + b, 0) / viewers.length;
    const games = new Set(streams.flatMap(s => s.gameTimeline ? s.gameTimeline.map(g => g.game) : [s.game]).filter(Boolean));
    const half = Math.floor(streams.length / 2);
    const recent = streams.slice(0, half), older = streams.slice(half);
    const recentAvg = recent.length ? recent.reduce((s, h) => s + (h.peakViewers || h.viewers || 0), 0) / recent.length : 0;
    const olderAvg = older.length ? older.reduce((s, h) => s + (h.peakViewers || h.viewers || 0), 0) / older.length : 0;
    return { totalStreams: streams.length, totalHours: totalSec / 3600, avgDuration: totalSec / streams.length, avgViewers, peakViewers: Math.max(...viewers, 0), totalGames: games.size, trends: { viewers: olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg * 100) : 0 } };
  }

  calculateStreaks() {
    if (this.history.length === 0) return { current: 0, longest: 0, lastStreamDays: null, weekStreak: 0, monthStreak: 0 };
    const sorted = [...this.history].sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const lastStreamDate = new Date(sorted[0].startedAt);
    const lastStreamDays = Math.floor((today - lastStreamDate) / 86400000);
    const streamDates = [...new Set(sorted.map(s => { const d = new Date(s.startedAt); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }))].map(ds => { const [y, m, d] = ds.split('-').map(Number); return new Date(y, m, d); }).sort((a, b) => b - a);
    let currentStreak = 0, longestStreak = 0, tempStreak = 1;
    if (Math.floor((today - streamDates[0]) / 86400000) <= 1) { currentStreak = 1; for (let i = 1; i < streamDates.length; i++) { if (Math.floor((streamDates[i-1] - streamDates[i]) / 86400000) === 1) currentStreak++; else break; } }
    for (let i = 1; i < streamDates.length; i++) { if (Math.floor((streamDates[i-1] - streamDates[i]) / 86400000) === 1) tempStreak++; else { longestStreak = Math.max(longestStreak, tempStreak); tempStreak = 1; } }
    longestStreak = Math.max(longestStreak, tempStreak);
    // Week streak (weeks with at least 1 stream)
    const weekSet = new Set(sorted.map(s => { const d = new Date(s.startedAt); const startOfYear = new Date(d.getFullYear(), 0, 1); return `${d.getFullYear()}-${Math.ceil(((d - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7)}`; }));
    // Month streak
    const monthSet = new Set(sorted.map(s => { const d = new Date(s.startedAt); return `${d.getFullYear()}-${d.getMonth()}`; }));
    return { current: currentStreak, longest: longestStreak, lastStreamDays, weekStreak: weekSet.size, monthStreak: monthSet.size };
  }

  calculateConsistencyScore() {
    if (this.history.length < 5) return { score: 0, grade: 'N/A', breakdown: {} };
    const now = new Date();
    const last30 = this.history.filter(s => new Date(s.startedAt) >= new Date(now - 30*24*60*60*1000));
    const streamsPerWeek = last30.length / 4.3;
    const frequencyScore = Math.min(streamsPerWeek / 3 * 40, 40);
    const durations = last30.map(s => s.duration || 0).filter(d => d > 0);
    const avgDuration = durations.length ? durations.reduce((a,b) => a+b, 0) / durations.length : 0;
    const durationVariance = durations.length > 1 ? Math.sqrt(durations.reduce((sum, d) => sum + Math.pow(d - avgDuration, 2), 0) / durations.length) / avgDuration : 1;
    const consistencyScore = Math.max(0, 30 - durationVariance * 30);
    const streaks = this.calculateStreaks();
    const streakScore = Math.min(streaks.current * 5, 20);
    const growth = this.calculateGrowth();
    const growthScore = growth && growth.weeklyGrowth > 0 ? Math.min(growth.weeklyGrowth / 2, 10) : 0;
    const total = Math.round(frequencyScore + consistencyScore + streakScore + growthScore);
    const grade = total >= 90 ? 'S' : total >= 80 ? 'A' : total >= 70 ? 'B' : total >= 60 ? 'C' : total >= 50 ? 'D' : 'F';
    return { score: total, grade, breakdown: { frequency: Math.round(frequencyScore), consistency: Math.round(consistencyScore), streak: Math.round(streakScore), growth: Math.round(growthScore) } };
  }

  calculateAchievements() {
    const achievements = [];
    const metrics = this.calculateMetrics();
    const streaks = this.calculateStreaks();
    const allTimeMetrics = { totalStreams: this.history.length, totalHours: this.history.reduce((s, h) => s + (h.duration || 0), 0) / 3600, peakViewers: this.history.length ? Math.max(...this.history.map(s => s.peakViewers || 0)) : 0 };
    // Stream count achievements
    const streamMilestones = [{n:1,t:'First Steps',d:'Complete your first stream',i:'🎬'},{n:10,t:'Getting Started',d:'Complete 10 streams',i:'📺'},{n:25,t:'Regular',d:'Complete 25 streams',i:'🎯'},{n:50,t:'Dedicated',d:'Complete 50 streams',i:'💪'},{n:100,t:'Centurion',d:'Complete 100 streams',i:'💯'},{n:250,t:'Veteran',d:'Complete 250 streams',i:'⭐'},{n:500,t:'Legend',d:'Complete 500 streams',i:'🏆'}];
    streamMilestones.forEach(m => achievements.push({ ...m, unlocked: allTimeMetrics.totalStreams >= m.n, progress: Math.min(allTimeMetrics.totalStreams / m.n * 100, 100) }));
    // Hours achievements
    const hourMilestones = [{n:10,t:'10 Hours',d:'Stream for 10 hours total',i:'⏰'},{n:50,t:'50 Hours',d:'Stream for 50 hours total',i:'⏳'},{n:100,t:'Century Hours',d:'Stream for 100 hours',i:'💫'},{n:500,t:'500 Hours',d:'Stream for 500 hours',i:'🌟'},{n:1000,t:'1000 Hours',d:'Stream for 1000 hours',i:'👑'}];
    hourMilestones.forEach(m => achievements.push({ ...m, unlocked: allTimeMetrics.totalHours >= m.n, progress: Math.min(allTimeMetrics.totalHours / m.n * 100, 100) }));
    // Viewer achievements
    const viewerMilestones = [{n:10,t:'First Crowd',d:'Reach 10 peak viewers',i:'👥'},{n:25,t:'Growing',d:'Reach 25 peak viewers',i:'📈'},{n:50,t:'Popular',d:'Reach 50 peak viewers',i:'🔥'},{n:100,t:'Hundred Club',d:'Reach 100 peak viewers',i:'💥'},{n:500,t:'Star Power',d:'Reach 500 peak viewers',i:'⚡'}];
    viewerMilestones.forEach(m => achievements.push({ ...m, unlocked: allTimeMetrics.peakViewers >= m.n, progress: Math.min(allTimeMetrics.peakViewers / m.n * 100, 100) }));
    // Streak achievements
    const streakMilestones = [{n:3,t:'Hat Trick',d:'3-day stream streak',i:'🎩'},{n:7,t:'Week Warrior',d:'7-day stream streak',i:'📅'},{n:14,t:'Two Weeks',d:'14-day stream streak',i:'🗓️'},{n:30,t:'Monthly Master',d:'30-day stream streak',i:'📆'}];
    streakMilestones.forEach(m => achievements.push({ ...m, unlocked: streaks.longest >= m.n, progress: Math.min(streaks.longest / m.n * 100, 100) }));
    // Special achievements
    const longestStream = this.history.length ? Math.max(...this.history.map(s => s.duration || 0)) : 0;
    achievements.push({ n: 4, t: 'Marathon', d: 'Stream for 4+ hours', i: '🏃', unlocked: longestStream >= 4*3600, progress: Math.min(longestStream / (4*3600) * 100, 100) });
    achievements.push({ n: 8, t: 'Ultra Marathon', d: 'Stream for 8+ hours', i: '🦸', unlocked: longestStream >= 8*3600, progress: Math.min(longestStream / (8*3600) * 100, 100) });
    const gamesPlayed = new Set(this.history.flatMap(s => s.gameTimeline ? s.gameTimeline.map(g => g.game) : [s.game]).filter(Boolean)).size;
    achievements.push({ n: 10, t: 'Variety Gamer', d: 'Play 10 different games', i: '🎮', unlocked: gamesPlayed >= 10, progress: Math.min(gamesPlayed / 10 * 100, 100) });
    return achievements;
  }

  loadGoals() {
    try { return JSON.parse(localStorage.getItem('streamGoals') || '{}'); } catch { return {}; }
  }

  saveGoals() {
    try { localStorage.setItem('streamGoals', JSON.stringify(this.goals)); } catch {}
  }

  calculateGoalProgress() {
    const now = new Date();
    const thisWeek = this.history.filter(s => new Date(s.startedAt) >= new Date(now - 7*24*60*60*1000));
    const thisMonth = this.history.filter(s => { const d = new Date(s.startedAt); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
    const weekHours = thisWeek.reduce((s, h) => s + (h.duration || 0), 0) / 3600;
    const monthHours = thisMonth.reduce((s, h) => s + (h.duration || 0), 0) / 3600;
    return {
      streamsWeek: { current: thisWeek.length, goal: this.goals.streamsPerWeek || 3 },
      streamsMonth: { current: thisMonth.length, goal: this.goals.streamsPerMonth || 12 },
      hoursWeek: { current: weekHours, goal: this.goals.hoursPerWeek || 10 },
      hoursMonth: { current: monthHours, goal: this.goals.hoursPerMonth || 40 },
      peakViewers: { current: this.history.length ? Math.max(...this.history.map(s => s.peakViewers || 0)) : 0, goal: this.goals.peakViewerGoal || 50 }
    };
  }

  calculatePredictions() {
    if (this.history.length < 5) return null;
    const sorted = [...this.history].sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));
    const metrics = this.calculateMetrics();
    const growth = this.calculateGrowth();
    const avgStreamsPerWeek = this.history.length / Math.max(1, this.getWeeksSinceFirst());
    const avgViewersGrowthPerStream = growth ? growth.rolling7 - growth.rolling30 : 0;
    const predictions = [];
    // Next milestone predictions
    const currentPeak = Math.max(...this.history.map(s => s.peakViewers || 0));
    const viewerMilestones = [25, 50, 75, 100, 150, 200, 500, 1000].filter(m => m > currentPeak);
    if (viewerMilestones.length > 0 && avgViewersGrowthPerStream > 0) {
      const nextMilestone = viewerMilestones[0];
      const streamsNeeded = Math.ceil((nextMilestone - metrics.avgViewers) / avgViewersGrowthPerStream);
      const weeksNeeded = streamsNeeded / avgStreamsPerWeek;
      predictions.push({ type: 'viewers', milestone: nextMilestone, streams: streamsNeeded, weeks: Math.round(weeksNeeded), date: new Date(Date.now() + weeksNeeded * 7 * 86400000) });
    }
    const currentHours = this.history.reduce((s, h) => s + (h.duration || 0), 0) / 3600;
    const hourMilestones = [50, 100, 250, 500, 1000].filter(m => m > currentHours);
    if (hourMilestones.length > 0) {
      const avgHoursPerStream = currentHours / this.history.length;
      const nextMilestone = hourMilestones[0];
      const hoursNeeded = nextMilestone - currentHours;
      const streamsNeeded = Math.ceil(hoursNeeded / avgHoursPerStream);
      const weeksNeeded = streamsNeeded / avgStreamsPerWeek;
      predictions.push({ type: 'hours', milestone: nextMilestone, streams: streamsNeeded, weeks: Math.round(weeksNeeded), date: new Date(Date.now() + weeksNeeded * 7 * 86400000) });
    }
    const streamMilestones = [25, 50, 100, 250, 500].filter(m => m > this.history.length);
    if (streamMilestones.length > 0) {
      const nextMilestone = streamMilestones[0];
      const streamsNeeded = nextMilestone - this.history.length;
      const weeksNeeded = streamsNeeded / avgStreamsPerWeek;
      predictions.push({ type: 'streams', milestone: nextMilestone, streams: streamsNeeded, weeks: Math.round(weeksNeeded), date: new Date(Date.now() + weeksNeeded * 7 * 86400000) });
    }
    return predictions;
  }

  calculateRecords() {
    if (this.history.length === 0) return null;
    const sorted = [...this.history];
    return {
      highestViewers: sorted.reduce((max, s) => (s.peakViewers || 0) > (max.peakViewers || 0) ? s : max, sorted[0]),
      longestStream: sorted.reduce((max, s) => (s.duration || 0) > (max.duration || 0) ? s : max, sorted[0]),
      mostGamesInStream: sorted.reduce((max, s) => (s.gameTimeline?.length || 1) > (max.gameTimeline?.length || 1) ? s : max, sorted[0])
    };
  }

  calculateTimeStats() {
    if (this.filteredHistory.length === 0) return null;
    const hourCounts = Array(24).fill(0), hourViewers = Array(24).fill().map(() => []);
    const dayCounts = Array(7).fill(0), dayViewers = Array(7).fill().map(() => []);
    this.filteredHistory.forEach(s => { const d = new Date(s.startedAt); hourCounts[d.getHours()]++; hourViewers[d.getHours()].push(s.peakViewers || 0); dayCounts[d.getDay()]++; dayViewers[d.getDay()].push(s.peakViewers || 0); });
    const avgByHour = hourViewers.map(arr => arr.length ? arr.reduce((a,b) => a+b, 0) / arr.length : 0);
    const avgByDay = dayViewers.map(arr => arr.length ? arr.reduce((a,b) => a+b, 0) / arr.length : 0);
    const bestHour = avgByHour.indexOf(Math.max(...avgByHour));
    const bestDay = avgByDay.indexOf(Math.max(...avgByDay));
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return { hourCounts, dayCounts, avgByHour, avgByDay, bestHour, bestDay: days[bestDay], avgStartHour: this.filteredHistory.reduce((sum, s) => sum + new Date(s.startedAt).getHours(), 0) / this.filteredHistory.length };
  }

  calculateGrowth() {
    if (this.history.length < 2) return null;
    const sorted = [...this.history].sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));
    const now = new Date();
    const thisWeek = sorted.filter(s => new Date(s.startedAt) >= new Date(now - 7*86400000));
    const lastWeek = sorted.filter(s => { const d = new Date(s.startedAt); return d >= new Date(now - 14*86400000) && d < new Date(now - 7*86400000); });
    const thisWeekAvg = thisWeek.length ? thisWeek.reduce((s, h) => s + (h.peakViewers || 0), 0) / thisWeek.length : 0;
    const lastWeekAvg = lastWeek.length ? lastWeek.reduce((s, h) => s + (h.peakViewers || 0), 0) / lastWeek.length : 0;
    const weeklyGrowth = lastWeekAvg > 0 ? ((thisWeekAvg - lastWeekAvg) / lastWeekAvg * 100) : 0;
    const thisMonth = sorted.filter(s => { const d = new Date(s.startedAt); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
    const lastMonth = sorted.filter(s => { const d = new Date(s.startedAt); const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1); return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear(); });
    const thisMonthAvg = thisMonth.length ? thisMonth.reduce((s, h) => s + (h.peakViewers || 0), 0) / thisMonth.length : 0;
    const lastMonthAvg = lastMonth.length ? lastMonth.reduce((s, h) => s + (h.peakViewers || 0), 0) / lastMonth.length : 0;
    const monthlyGrowth = lastMonthAvg > 0 ? ((thisMonthAvg - lastMonthAvg) / lastMonthAvg * 100) : 0;
    const last7 = sorted.slice(-7), last30 = sorted.slice(-30);
    return { weeklyGrowth, monthlyGrowth, rolling7: last7.length ? last7.reduce((s, h) => s + (h.peakViewers || 0), 0) / last7.length : 0, rolling30: last30.length ? last30.reduce((s, h) => s + (h.peakViewers || 0), 0) / last30.length : 0, thisWeekStreams: thisWeek.length, lastWeekStreams: lastWeek.length, thisMonthStreams: thisMonth.length, lastMonthStreams: lastMonth.length };
  }

  calculateTitleAnalysis() {
    if (this.history.length < 5) return null;
    const wordStats = {};
    this.history.forEach(s => {
      if (!s.title) return;
      const words = s.title.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2);
      words.forEach(word => {
        if (!wordStats[word]) wordStats[word] = { count: 0, totalViewers: 0 };
        wordStats[word].count++;
        wordStats[word].totalViewers += s.peakViewers || 0;
      });
    });
    const avgViewers = this.history.reduce((s, h) => s + (h.peakViewers || 0), 0) / this.history.length;
    const analyzed = Object.entries(wordStats).filter(([_, s]) => s.count >= 2).map(([word, s]) => ({ word, count: s.count, avgViewers: s.totalViewers / s.count, impact: ((s.totalViewers / s.count) - avgViewers) / avgViewers * 100 })).sort((a, b) => b.impact - a.impact);
    return { best: analyzed.slice(0, 5), worst: analyzed.slice(-5).reverse(), avgViewers };
  }

  calculateMonthlyReports() {
    const reports = {};
    this.history.forEach(s => {
      const d = new Date(s.startedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!reports[key]) reports[key] = { streams: 0, totalDuration: 0, totalViewers: 0, peakViewers: 0, games: new Set() };
      reports[key].streams++;
      reports[key].totalDuration += s.duration || 0;
      reports[key].totalViewers += s.peakViewers || 0;
      reports[key].peakViewers = Math.max(reports[key].peakViewers, s.peakViewers || 0);
      if (s.game) reports[key].games.add(s.game);
    });
    return Object.entries(reports).map(([month, data]) => ({
      month,
      label: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      streams: data.streams,
      hours: data.totalDuration / 3600,
      avgViewers: data.totalViewers / data.streams,
      peakViewers: data.peakViewers,
      games: data.games.size,
      score: Math.min(100, Math.round((data.streams / 12 * 30) + (data.totalDuration / 3600000 / 30 * 30) + (data.totalViewers / data.streams / 50 * 40)))
    })).sort((a, b) => b.month.localeCompare(a.month));
  }

  calculatePersonalBests() {
    if (this.history.length === 0) return [];
    const bests = [];
    const sorted = [...this.history].sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));
    let currentBestViewers = 0, currentBestDuration = 0;
    sorted.forEach(s => {
      if ((s.peakViewers || 0) > currentBestViewers) {
        currentBestViewers = s.peakViewers;
        bests.push({ type: 'viewers', value: currentBestViewers, date: s.startedAt, stream: s });
      }
      if ((s.duration || 0) > currentBestDuration) {
        currentBestDuration = s.duration;
        bests.push({ type: 'duration', value: currentBestDuration, date: s.startedAt, stream: s });
      }
    });
    return bests.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
  }

  getWeeksSinceFirst() {
    if (this.history.length === 0) return 1;
    const sorted = [...this.history].sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));
    return Math.max(1, (Date.now() - new Date(sorted[0].startedAt)) / (7 * 86400000));
  }

  // Duration is stored in SECONDS in history
  formatDuration(sec) { if (!sec) return '0m'; const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60); return h > 0 ? `${h}h ${m}m` : `${m}m`; }
  formatDurationMs(ms) { if (!ms) return '0m'; const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000); return h > 0 ? `${h}h ${m}m` : `${m}m`; }
  formatHour(hour) { if (hour === 0) return '12 AM'; if (hour < 12) return `${hour} AM`; if (hour === 12) return '12 PM'; return `${hour - 12} PM`; }

  // ==================== RENDER METHODS ====================

  renderLiveStats() {
    const container = document.getElementById('live-stats');
    if (!container) return;
    if (!this.isLive) { container.style.display = 'none'; return; }
    container.style.display = 'block';
    const duration = this.currentStartedAt ? Date.now() - new Date(this.currentStartedAt) : 0;
    const currentViewers = this.currentStreamViewerData.length ? this.currentStreamViewerData[this.currentStreamViewerData.length - 1].viewers : 0;
    const peakViewers = this.currentStreamViewerData.length ? Math.max(...this.currentStreamViewerData.map(d => d.viewers)) : 0;
    container.innerHTML = `
      <div class="live-indicator">🔴 LIVE NOW</div>
      <div class="live-stats-grid">
        <div class="live-stat"><span class="live-stat-value">${this.formatDurationMs(duration)}</span><span class="live-stat-label">Duration</span></div>
        <div class="live-stat"><span class="live-stat-value">${currentViewers}</span><span class="live-stat-label">Current Viewers</span></div>
        <div class="live-stat"><span class="live-stat-value">${peakViewers}</span><span class="live-stat-label">Peak Viewers</span></div>
        <div class="live-stat"><span class="live-stat-value">${this.currentStreamGameTimeline.length || 1}</span><span class="live-stat-label">Games Played</span></div>
      </div>
    `;
  }

  renderMetricsCards() {
    const container = document.getElementById('metrics-cards');
    if (!container) return;
    const metrics = this.calculateMetrics();
    const streaks = this.calculateStreaks();
    const trendArrow = (v) => v > 5 ? `<span class="trend-up">↑${v.toFixed(0)}%</span>` : v < -5 ? `<span class="trend-down">↓${Math.abs(v).toFixed(0)}%</span>` : `<span class="trend-neutral">→</span>`;
    container.innerHTML = `
      <div class="metric-card" data-metric="streams"><div class="metric-icon">📺</div><div class="metric-value">${metrics.totalStreams}</div><div class="metric-label">Streams</div></div>
      <div class="metric-card" data-metric="hours"><div class="metric-icon">⏰</div><div class="metric-value">${metrics.totalHours.toFixed(1)}</div><div class="metric-label">Hours</div></div>
      <div class="metric-card" data-metric="avgViewers"><div class="metric-icon">👥</div><div class="metric-value">${Math.round(metrics.avgViewers)}</div><div class="metric-label">Avg Viewers</div>${trendArrow(metrics.trends.viewers)}</div>
      <div class="metric-card" data-metric="peakViewers"><div class="metric-icon">🔥</div><div class="metric-value">${metrics.peakViewers}</div><div class="metric-label">Peak</div></div>
      <div class="metric-card" data-metric="avgDuration"><div class="metric-icon">⏱️</div><div class="metric-value">${this.formatDuration(metrics.avgDuration)}</div><div class="metric-label">Avg Duration</div></div>
      <div class="metric-card" data-metric="games"><div class="metric-icon">🎮</div><div class="metric-value">${metrics.totalGames}</div><div class="metric-label">Games</div></div>
      <div class="metric-card" data-metric="streak"><div class="metric-icon">🔥</div><div class="metric-value">${streaks.current}</div><div class="metric-label">Day Streak</div></div>
      <div class="metric-card" data-metric="lastStream"><div class="metric-icon">📅</div><div class="metric-value">${streaks.lastStreamDays === 0 ? 'Today' : streaks.lastStreamDays === 1 ? '1d' : streaks.lastStreamDays + 'd'}</div><div class="metric-label">Last Stream</div></div>
    `;
    container.querySelectorAll('.metric-card').forEach(card => card.addEventListener('click', () => this.showMetricDetails(card.dataset.metric)));
  }

  renderConsistencyScore() {
    const container = document.getElementById('consistency-score');
    if (!container) return;
    const score = this.calculateConsistencyScore();
    if (score.score === 0) { container.innerHTML = '<p class="no-data">Stream more to get your consistency score!</p>'; return; }
    const gradeColors = { S: '#ffd700', A: '#4caf50', B: '#2196f3', C: '#ff9800', D: '#ef5350', F: '#9e9e9e' };
    container.innerHTML = `
      <div class="score-display">
        <div class="score-circle" style="border-color: ${gradeColors[score.grade]}">
          <span class="score-grade">${score.grade}</span>
          <span class="score-number">${score.score}/100</span>
        </div>
        <div class="score-breakdown">
          <div class="breakdown-item"><span>Frequency</span><div class="breakdown-bar"><div style="width:${score.breakdown.frequency/40*100}%;background:#9146ff"></div></div><span>${score.breakdown.frequency}/40</span></div>
          <div class="breakdown-item"><span>Consistency</span><div class="breakdown-bar"><div style="width:${score.breakdown.consistency/30*100}%;background:#00b894"></div></div><span>${score.breakdown.consistency}/30</span></div>
          <div class="breakdown-item"><span>Streak</span><div class="breakdown-bar"><div style="width:${score.breakdown.streak/20*100}%;background:#0984e3"></div></div><span>${score.breakdown.streak}/20</span></div>
          <div class="breakdown-item"><span>Growth</span><div class="breakdown-bar"><div style="width:${score.breakdown.growth/10*100}%;background:#fdcb6e"></div></div><span>${score.breakdown.growth}/10</span></div>
        </div>
      </div>
    `;
  }

  renderAchievements() {
    const container = document.getElementById('achievements-content');
    if (!container) return;
    const achievements = this.calculateAchievements();
    const unlocked = achievements.filter(a => a.unlocked);
    const locked = achievements.filter(a => !a.unlocked).sort((a, b) => b.progress - a.progress);
    container.innerHTML = `
      <div class="achievements-summary">${unlocked.length}/${achievements.length} Unlocked</div>
      <div class="achievements-grid">
        ${unlocked.slice(0, 8).map(a => `<div class="achievement unlocked"><span class="ach-icon">${a.i}</span><span class="ach-title">${a.t}</span></div>`).join('')}
        ${locked.slice(0, 4).map(a => `<div class="achievement locked"><span class="ach-icon">${a.i}</span><span class="ach-title">${a.t}</span><div class="ach-progress"><div style="width:${a.progress}%"></div></div></div>`).join('')}
      </div>
      <button class="small-btn" onclick="window.dashboardInstance.showAllAchievements()">View All Achievements</button>
    `;
    window.dashboardInstance = this;
  }

  showAllAchievements() {
    const modal = document.getElementById('stream-detail-modal');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    const achievements = this.calculateAchievements();
    title.textContent = '🏅 All Achievements';
    body.innerHTML = `<div class="all-achievements">${achievements.map(a => `
      <div class="achievement-row ${a.unlocked ? 'unlocked' : 'locked'}">
        <span class="ach-icon">${a.i}</span>
        <div class="ach-info"><strong>${a.t}</strong><p>${a.d}</p></div>
        ${a.unlocked ? '<span class="ach-check">✓</span>' : `<div class="ach-progress-bar"><div style="width:${a.progress}%"></div></div><span class="ach-percent">${Math.round(a.progress)}%</span>`}
      </div>
    `).join('')}</div>`;
    modal.style.display = 'flex';
  }

  renderGoalsTracker() {
    const container = document.getElementById('goals-tracker');
    if (!container) return;
    const progress = this.calculateGoalProgress();
    const renderGoal = (label, icon, current, goal) => {
      const pct = Math.min(current / goal * 100, 100);
      const complete = current >= goal;
      return `<div class="goal-item ${complete ? 'complete' : ''}"><div class="goal-header"><span>${icon} ${label}</span><span>${typeof current === 'number' && current % 1 !== 0 ? current.toFixed(1) : current}/${goal}</span></div><div class="goal-bar"><div style="width:${pct}%"></div></div></div>`;
    };
    container.innerHTML = `
      <div class="goals-grid">
        ${renderGoal('Streams/Week', '📺', progress.streamsWeek.current, progress.streamsWeek.goal)}
        ${renderGoal('Streams/Month', '📅', progress.streamsMonth.current, progress.streamsMonth.goal)}
        ${renderGoal('Hours/Week', '⏰', progress.hoursWeek.current, progress.hoursWeek.goal)}
        ${renderGoal('Hours/Month', '⏳', progress.hoursMonth.current, progress.hoursMonth.goal)}
        ${renderGoal('Peak Viewers', '👥', progress.peakViewers.current, progress.peakViewers.goal)}
      </div>
      <button class="small-btn" onclick="window.dashboardInstance.editGoals()">⚙️ Edit Goals</button>
    `;
  }

  editGoals() {
    const modal = document.getElementById('stream-detail-modal');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    title.textContent = '🎯 Edit Goals';
    body.innerHTML = `
      <div class="goals-form">
        <label>Streams per Week<input type="number" id="goal-spw" value="${this.goals.streamsPerWeek || 3}" min="1" max="14"></label>
        <label>Streams per Month<input type="number" id="goal-spm" value="${this.goals.streamsPerMonth || 12}" min="1" max="60"></label>
        <label>Hours per Week<input type="number" id="goal-hpw" value="${this.goals.hoursPerWeek || 10}" min="1" max="100"></label>
        <label>Hours per Month<input type="number" id="goal-hpm" value="${this.goals.hoursPerMonth || 40}" min="1" max="400"></label>
        <label>Peak Viewers Goal<input type="number" id="goal-pv" value="${this.goals.peakViewerGoal || 50}" min="1" max="10000"></label>
        <button class="primary-btn" onclick="window.dashboardInstance.saveGoalsFromForm()">Save Goals</button>
      </div>
    `;
    modal.style.display = 'flex';
  }

  saveGoalsFromForm() {
    this.goals = {
      streamsPerWeek: parseInt(document.getElementById('goal-spw').value) || 3,
      streamsPerMonth: parseInt(document.getElementById('goal-spm').value) || 12,
      hoursPerWeek: parseInt(document.getElementById('goal-hpw').value) || 10,
      hoursPerMonth: parseInt(document.getElementById('goal-hpm').value) || 40,
      peakViewerGoal: parseInt(document.getElementById('goal-pv').value) || 50
    };
    this.saveGoals();
    document.getElementById('stream-detail-modal').style.display = 'none';
    this.renderGoalsTracker();
  }

  renderStreaksAndRecords() {
    const container = document.getElementById('streaks-records');
    if (!container) return;
    const streaks = this.calculateStreaks();
    const records = this.calculateRecords();
    if (!records) { container.innerHTML = '<p class="no-data">Not enough data.</p>'; return; }
    container.innerHTML = `
      <div class="records-grid">
        <div class="record-card"><div class="record-icon">🏆</div><div class="record-title">Longest Streak</div><div class="record-value">${streaks.longest} days</div></div>
        <div class="record-card"><div class="record-icon">👀</div><div class="record-title">Viewer Record</div><div class="record-value">${records.highestViewers.peakViewers || 0}</div><div class="record-detail">${new Date(records.highestViewers.startedAt).toLocaleDateString()}</div></div>
        <div class="record-card"><div class="record-icon">⏱️</div><div class="record-title">Longest Stream</div><div class="record-value">${this.formatDuration(records.longestStream.duration)}</div><div class="record-detail">${new Date(records.longestStream.startedAt).toLocaleDateString()}</div></div>
        <div class="record-card"><div class="record-icon">📅</div><div class="record-title">Weeks Active</div><div class="record-value">${streaks.weekStreak}</div></div>
      </div>
    `;
  }

  renderPredictions() {
    const container = document.getElementById('predictions-content');
    if (!container) return;
    const predictions = this.calculatePredictions();
    if (!predictions || predictions.length === 0) { container.innerHTML = '<p class="no-data">Need more data for predictions.</p>'; return; }
    const icons = { viewers: '👥', hours: '⏰', streams: '📺' };
    container.innerHTML = `
      <div class="predictions-list">
        ${predictions.map(p => `
          <div class="prediction-card">
            <span class="pred-icon">${icons[p.type]}</span>
            <div class="pred-info">
              <strong>${p.milestone} ${p.type}</strong>
              <span>~${p.streams} streams (${p.weeks} weeks)</span>
              <span class="pred-date">Est. ${p.date.toLocaleDateString()}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderContributionGraph() {
    const container = document.getElementById('contribution-graph');
    if (!container) return;
    const now = new Date();
    const weeks = 53; // Full year
    const data = {};
    const monthData = {};
    
    // Collect stream data by date and month
    this.history.forEach(s => {
      const d = new Date(s.startedAt);
      const key = d.toISOString().split('T')[0];
      const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
      data[key] = (data[key] || 0) + 1;
      if (!monthData[monthKey]) monthData[monthKey] = { streams: 0, hours: 0 };
      monthData[monthKey].streams++;
      monthData[monthKey].hours += (s.duration || 0) / 3600;
    });
    
    const maxStreams = Math.max(...Object.values(data), 1);
    const totalDays = weeks * 7;
    const streamDays = Object.keys(data).length;
    const totalStreamsYear = Object.values(data).reduce((a, b) => a + b, 0);
    
    // Calculate month labels positions
    const monthLabels = [];
    let lastMonth = -1;
    for (let w = weeks - 1; w >= 0; w--) {
      const date = new Date(now - (w * 7) * 86400000);
      if (date.getMonth() !== lastMonth) {
        monthLabels.push({ week: weeks - 1 - w, label: date.toLocaleDateString('en-US', { month: 'short' }) });
        lastMonth = date.getMonth();
      }
    }
    
    // Build HTML
    let html = '<div class="contrib-stats">';
    html += `<div class="contrib-stat"><span class="contrib-stat-value">${totalStreamsYear}</span><span class="contrib-stat-label">streams this year</span></div>`;
    html += `<div class="contrib-stat"><span class="contrib-stat-value">${streamDays}</span><span class="contrib-stat-label">days streamed</span></div>`;
    html += `<div class="contrib-stat"><span class="contrib-stat-value">${Math.round(streamDays / totalDays * 100)}%</span><span class="contrib-stat-label">activity rate</span></div>`;
    html += '</div>';
    
    // Month labels row
    html += '<div class="contrib-months">';
    let monthPos = 0;
    for (let w = 0; w < weeks; w++) {
      const monthLabel = monthLabels.find(m => m.week === w);
      html += `<div class="contrib-month-label">${monthLabel ? monthLabel.label : ''}</div>`;
    }
    html += '</div>';
    
    html += '<div class="contrib-graph-full">';
    const days = ['Sun', 'Mon', '', 'Wed', '', 'Fri', ''];
    html += '<div class="contrib-days">' + days.map(d => `<div class="contrib-day-label">${d}</div>`).join('') + '</div>';
    html += '<div class="contrib-weeks">';
    for (let w = weeks - 1; w >= 0; w--) {
      html += '<div class="contrib-week">';
      for (let d = 0; d < 7; d++) {
        const date = new Date(now - (w * 7 + (6 - d)) * 86400000);
        const key = date.toISOString().split('T')[0];
        const count = data[key] || 0;
        const intensity = count / maxStreams;
        const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        html += `<div class="contrib-cell" style="background-color: ${count ? `rgba(145, 71, 255, ${0.3 + intensity * 0.7})` : '#2a2f3a'}" title="${dateStr}: ${count} stream(s)"></div>`;
      }
      html += '</div>';
    }
    html += '</div></div>';
    html += `<div class="contrib-legend"><span>Less</span>${[0, 0.25, 0.5, 0.75, 1].map(v => `<div class="contrib-cell" style="background-color: rgba(145, 71, 255, ${v || 0.1})"></div>`).join('')}<span>More</span></div>`;
    container.innerHTML = html;
  }

  renderMonthlyReportCard() {
    const container = document.getElementById('monthly-reports');
    if (!container) return;
    const reports = this.calculateMonthlyReports();
    if (reports.length === 0) { container.innerHTML = '<p class="no-data">No monthly data yet.</p>'; return; }
    container.innerHTML = `
      <div class="monthly-cards">
        ${reports.slice(0, 6).map(r => `
          <div class="month-card">
            <div class="month-header"><span>${r.label}</span><span class="month-score">${r.score}</span></div>
            <div class="month-stats">
              <span>📺 ${r.streams}</span><span>⏰ ${r.hours.toFixed(1)}h</span><span>👥 ${Math.round(r.avgViewers)}</span><span>🔥 ${r.peakViewers}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderStreamComparison() {
    const container = document.getElementById('stream-comparison');
    if (!container) return;
    if (this.history.length < 2) { container.innerHTML = '<p class="no-data">Need at least 2 streams to compare.</p>'; return; }
    const recent = [...this.history].sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
    container.innerHTML = `
      <div class="comparison-selects">
        <select id="compare-a">${recent.slice(0, 20).map((s, i) => `<option value="${i}">${new Date(s.startedAt).toLocaleDateString()} - ${s.game || 'Unknown'}</option>`).join('')}</select>
        <span>vs</span>
        <select id="compare-b">${recent.slice(0, 20).map((s, i) => `<option value="${i}" ${i === 1 ? 'selected' : ''}>${new Date(s.startedAt).toLocaleDateString()} - ${s.game || 'Unknown'}</option>`).join('')}</select>
        <button class="small-btn" onclick="window.dashboardInstance.compareStreams()">Compare</button>
      </div>
      <div id="comparison-result"></div>
    `;
    window.dashboardInstance = this;
    this.compareStreams();
  }

  compareStreams() {
    const recent = [...this.history].sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
    const a = recent[parseInt(document.getElementById('compare-a').value)];
    const b = recent[parseInt(document.getElementById('compare-b').value)];
    const result = document.getElementById('comparison-result');
    const compare = (va, vb, format = v => v) => {
      const diff = va - vb;
      return `<td>${format(va)}</td><td>${format(vb)}</td><td class="${diff > 0 ? 'better' : diff < 0 ? 'worse' : ''}">${diff > 0 ? '+' : ''}${format(diff)}</td>`;
    };
    result.innerHTML = `
      <table class="comparison-table">
        <tr><th>Metric</th><th>Stream A</th><th>Stream B</th><th>Diff</th></tr>
        <tr><td>Duration</td>${compare(a.duration || 0, b.duration || 0, v => this.formatDuration(Math.abs(v)))}</tr>
        <tr><td>Peak Viewers</td>${compare(a.peakViewers || 0, b.peakViewers || 0)}</tr>
        <tr><td>Game</td><td>${a.game || '-'}</td><td>${b.game || '-'}</td><td>-</td></tr>
      </table>
    `;
  }

  renderTitleAnalysis() {
    const container = document.getElementById('title-analysis');
    if (!container) return;
    const analysis = this.calculateTitleAnalysis();
    if (!analysis) { container.innerHTML = '<p class="no-data">Need more streams with titles.</p>'; return; }
    container.innerHTML = `
      <div class="title-analysis-grid">
        <div class="title-col"><h4>🚀 Best Words</h4>${analysis.best.map(w => `<div class="word-item good"><span>${w.word}</span><span>+${w.impact.toFixed(0)}%</span></div>`).join('')}</div>
        <div class="title-col"><h4>📉 Avoid</h4>${analysis.worst.map(w => `<div class="word-item bad"><span>${w.word}</span><span>${w.impact.toFixed(0)}%</span></div>`).join('')}</div>
      </div>
      <p class="analysis-note">Based on ${this.history.length} stream titles. Words used 2+ times.</p>
    `;
  }

  renderPersonalBests() {
    const container = document.getElementById('personal-bests');
    if (!container) return;
    const bests = this.calculatePersonalBests();
    if (bests.length === 0) { container.innerHTML = '<p class="no-data">No personal bests yet.</p>'; return; }
    container.innerHTML = `
      <div class="bests-timeline">
        ${bests.map(b => `
          <div class="best-item">
            <span class="best-icon">${b.type === 'viewers' ? '👀' : '⏱️'}</span>
            <div class="best-info">
              <strong>New ${b.type === 'viewers' ? 'Viewer' : 'Duration'} Record!</strong>
              <span>${b.type === 'viewers' ? b.value + ' viewers' : this.formatDuration(b.value)}</span>
            </div>
            <span class="best-date">${new Date(b.date).toLocaleDateString()}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderTimeAnalysis() {
    const container = document.getElementById('time-analysis');
    if (!container) return;
    const stats = this.calculateTimeStats();
    if (!stats) { container.innerHTML = '<p class="no-data">Not enough data.</p>'; return; }
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const maxDay = Math.max(...stats.dayCounts, 1);
    container.innerHTML = `
      <div class="time-stats-summary">
        <div class="time-stat-box"><span class="time-stat-icon">📅</span><span class="time-stat-label">Best Day</span><span class="time-stat-value">${stats.bestDay}</span></div>
        <div class="time-stat-box"><span class="time-stat-icon">🕐</span><span class="time-stat-label">Best Time</span><span class="time-stat-value">${this.formatHour(stats.bestHour)}</span></div>
        <div class="time-stat-box"><span class="time-stat-icon">⏰</span><span class="time-stat-label">Avg Start</span><span class="time-stat-value">${this.formatHour(Math.round(stats.avgStartHour))}</span></div>
      </div>
      <h4 style="margin:15px 0 8px;color:#888;font-size:12px">STREAMS BY DAY</h4>
      <div class="day-chart">${days.map((d, i) => `<div class="day-bar-container"><div class="day-bar" style="height:${(stats.dayCounts[i]/maxDay*100)||5}%"><span class="day-count">${stats.dayCounts[i]}</span></div><span class="day-label">${d}</span></div>`).join('')}</div>
    `;
  }

  renderGrowthStats() {
    const container = document.getElementById('growth-stats');
    if (!container) return;
    const growth = this.calculateGrowth();
    if (!growth) { container.innerHTML = '<p class="no-data">Not enough data.</p>'; return; }
    const gi = v => v > 0 ? `<span class="growth-positive">+${v.toFixed(0)}%</span>` : v < 0 ? `<span class="growth-negative">${v.toFixed(0)}%</span>` : `<span class="growth-neutral">0%</span>`;
    container.innerHTML = `
      <div class="growth-grid">
        <div class="growth-card"><div class="growth-header"><span>📈 Weekly</span>${gi(growth.weeklyGrowth)}</div><div class="growth-detail">${growth.thisWeekStreams} vs ${growth.lastWeekStreams} streams</div></div>
        <div class="growth-card"><div class="growth-header"><span>📊 Monthly</span>${gi(growth.monthlyGrowth)}</div><div class="growth-detail">${growth.thisMonthStreams} vs ${growth.lastMonthStreams} streams</div></div>
      </div>
      <div class="rolling-grid"><div class="rolling-item"><span class="rolling-label">7-Stream Avg</span><span class="rolling-value">${Math.round(growth.rolling7)}</span></div><div class="rolling-item"><span class="rolling-label">30-Stream Avg</span><span class="rolling-value">${Math.round(growth.rolling30)}</span></div></div>
    `;
  }

  showMetricDetails(metric) {
    const modal = document.getElementById('stream-detail-modal');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    const metrics = this.calculateMetrics();
    let content = '<p>Details coming soon!</p>';
    switch (metric) {
      case 'peakViewers':
        const top = [...this.filteredHistory].sort((a, b) => (b.peakViewers || 0) - (a.peakViewers || 0)).slice(0, 5);
        content = `<h4>Top 5 Streams</h4><ol class="top-list">${top.map(s => `<li><strong>${s.peakViewers || 0}</strong> - ${new Date(s.startedAt).toLocaleDateString()} (${s.game || '-'})</li>`).join('')}</ol>`;
        title.textContent = '🔥 Peak Viewers';
        break;
      default:
        title.textContent = 'Details';
    }
    body.innerHTML = content;
    modal.style.display = 'flex';
  }

  renderStreamsTable() {
    const container = document.getElementById('streams-table');
    if (!container) return;
    if (this.filteredHistory.length === 0) { container.innerHTML = '<p class="no-data">No streams.</p>'; return; }
    const sorted = [...this.filteredHistory].sort((a, b) => { let av, bv; switch(this.sortColumn) { case 'date': av = new Date(a.startedAt); bv = new Date(b.startedAt); break; case 'duration': av = a.duration||0; bv = b.duration||0; break; case 'viewers': av = a.peakViewers||0; bv = b.peakViewers||0; break; default: av = 0; bv = 0; } return this.sortDirection === 'asc' ? av - bv : bv - av; });
    const avgV = this.filteredHistory.reduce((s, h) => s + (h.peakViewers || 0), 0) / this.filteredHistory.length || 1;
    const avgD = this.filteredHistory.reduce((s, h) => s + (h.duration || 0), 0) / this.filteredHistory.length || 1;
    const rowClass = s => { const sc = ((s.peakViewers||0)/avgV + (s.duration||0)/avgD)/2; return sc >= 1.3 ? 'row-excellent' : sc >= 1 ? 'row-good' : sc >= 0.7 ? 'row-average' : 'row-below'; };
    const icon = c => this.sortColumn !== c ? '↕' : this.sortDirection === 'asc' ? '↑' : '↓';
    container.innerHTML = `
      <table class="streams-table"><thead><tr><th class="sortable" data-sort="date">Date ${icon('date')}</th><th class="sortable" data-sort="duration">Duration ${icon('duration')}</th><th class="sortable" data-sort="viewers">Viewers ${icon('viewers')}</th><th>Game</th></tr></thead>
      <tbody>${sorted.slice(0,20).map(s => `<tr class="${rowClass(s)}" data-id="${s.id}"><td>${new Date(s.startedAt).toLocaleDateString()}</td><td>${this.formatDuration(s.duration)}</td><td>${s.peakViewers||0}</td><td>${(s.game||'-').substring(0,20)}</td></tr>`).join('')}</tbody></table>
      ${this.filteredHistory.length > 20 ? `<p class="table-note">Showing 20/${this.filteredHistory.length}</p>` : ''}
    `;
    container.querySelectorAll('.sortable').forEach(th => th.addEventListener('click', () => { const c = th.dataset.sort; if (this.sortColumn === c) this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc'; else { this.sortColumn = c; this.sortDirection = 'desc'; } this.renderStreamsTable(); }));
    container.querySelectorAll('tbody tr').forEach(r => r.addEventListener('click', () => { const s = this.filteredHistory.find(x => x.id === r.dataset.id); if (s) this.showStreamDetails(s); }));
  }

  showStreamDetails(s) {
    const modal = document.getElementById('stream-detail-modal');
    document.getElementById('modal-title').textContent = `📺 ${new Date(s.startedAt).toLocaleDateString()}`;
    document.getElementById('modal-body').innerHTML = `<div class="stream-detail-grid"><div class="detail-item"><span class="detail-label">Title</span><span class="detail-value">${s.title||'-'}</span></div><div class="detail-item"><span class="detail-label">Duration</span><span class="detail-value">${this.formatDuration(s.duration)}</span></div><div class="detail-item"><span class="detail-label">Peak</span><span class="detail-value">${s.peakViewers||0}</span></div><div class="detail-item"><span class="detail-label">Game</span><span class="detail-value">${s.game||'-'}</span></div></div>`;
    modal.style.display = 'flex';
  }

  renderDurationStats() {
    const container = document.getElementById('duration-content');
    if (!container) return;
    const durations = this.filteredHistory.map(s => s.duration || 0).filter(d => d > 0);
    if (durations.length === 0) { container.innerHTML = '<p class="no-data">No data.</p>'; return; }
    const avg = durations.reduce((a,b)=>a+b,0)/durations.length, max = Math.max(...durations), min = Math.min(...durations), total = durations.reduce((a,b)=>a+b,0);
    const ranges = [{l:'<1h',a:0,b:3600},{l:'1-2h',a:3600,b:7200},{l:'2-3h',a:7200,b:10800},{l:'3-4h',a:10800,b:14400},{l:'4h+',a:14400,b:Infinity}];
    const dist = ranges.map(r => ({ l: r.l, c: durations.filter(d => d >= r.a && d < r.b).length }));
    const mc = Math.max(...dist.map(d => d.c), 1);
    container.innerHTML = `<div class="duration-stats-grid"><div class="stat-box"><div class="stat-value">${this.formatDuration(avg)}</div><div class="stat-label">Avg</div></div><div class="stat-box"><div class="stat-value">${this.formatDuration(max)}</div><div class="stat-label">Max</div></div><div class="stat-box"><div class="stat-value">${this.formatDuration(min)}</div><div class="stat-label">Min</div></div><div class="stat-box"><div class="stat-value">${this.formatDuration(total)}</div><div class="stat-label">Total</div></div></div><div class="distribution-chart">${dist.map(d=>`<div class="dist-bar-container"><div class="dist-bar" style="height:${Math.max(d.c/mc*100,5)}%"><span class="dist-count">${d.c}</span></div><span class="dist-label">${d.l}</span></div>`).join('')}</div>`;
  }

  renderGamingStats() {
    const container = document.getElementById('gaming-content');
    if (!container) return;
    const gs = {};
    this.filteredHistory.forEach(s => { const g = s.game || 'Unknown'; if (!gs[g]) gs[g] = { n: 0, v: 0, d: 0 }; gs[g].n++; gs[g].v += s.peakViewers || 0; gs[g].d += s.duration || 0; });
    const sorted = Object.entries(gs).map(([n, s]) => ({ n, ...s, avg: s.v / s.n })).sort((a, b) => b.n - a.n).slice(0, 8);
    if (sorted.length === 0) { container.innerHTML = '<p class="no-data">No games.</p>'; return; }
    const maxN = sorted[0].n;
    const best = [...sorted].sort((a, b) => b.avg - a.avg)[0];
    container.innerHTML = `<div class="game-highlight"><span class="game-highlight-label">🏆 Best Game</span><span class="game-highlight-name">${best.n}</span><span class="game-highlight-stat">${Math.round(best.avg)} avg viewers</span></div><div class="game-stats-list">${sorted.map(g=>`<div class="game-stat-row"><div class="game-name">${g.n}</div><div class="game-bar-container"><div class="game-bar" style="width:${g.n/maxN*100}%"></div></div><div class="game-details"><span>${g.n}x</span><span>${Math.round(g.avg)} avg</span></div></div>`).join('')}</div>`;
  }

  renderChart(type) {
    const canvas = document.getElementById('main-chart');
    const heatmap = document.getElementById('heatmap-container');
    if (!canvas) return;
    if (type === 'heatmap') { canvas.parentElement.style.display = 'none'; if (heatmap) { heatmap.style.display = 'block'; this.renderHeatmap(); } return; }
    canvas.parentElement.style.display = 'block'; if (heatmap) heatmap.style.display = 'none';
    if (typeof Chart === 'undefined') return;
    if (this.chart) this.chart.destroy();
    const sorted = [...this.filteredHistory].sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));
    if (sorted.length === 0) return;
    let cfg;
    switch (type) {
      case 'viewers': cfg = { type: 'line', data: { labels: sorted.map(s => new Date(s.startedAt).toLocaleDateString()), datasets: [{ label: 'Peak Viewers', data: sorted.map(s => s.peakViewers || 0), borderColor: '#9147ff', backgroundColor: 'rgba(145,71,255,0.1)', fill: true, tension: 0.3 }] }, options: this.chartOpts('Peak Viewers') }; break;
      case 'viewersBar': cfg = { type: 'bar', data: { labels: sorted.map(s => new Date(s.startedAt).toLocaleDateString()), datasets: [{ label: 'Viewers', data: sorted.map(s => s.peakViewers || 0), backgroundColor: '#9147ff' }] }, options: this.chartOpts('Viewers') }; break;
      case 'growth': const ra = sorted.map((_, i) => { const sl = sorted.slice(Math.max(0, i-6), i+1); return sl.reduce((s,h) => s + (h.peakViewers||0), 0) / sl.length; }); cfg = { type: 'line', data: { labels: sorted.map(s => new Date(s.startedAt).toLocaleDateString()), datasets: [{ label: 'Peak', data: sorted.map(s => s.peakViewers || 0), borderColor: 'rgba(145,71,255,0.3)', fill: false, pointRadius: 2 }, { label: '7-Avg', data: ra, borderColor: '#00b894', borderWidth: 3, fill: false }] }, options: this.chartOpts('Growth') }; break;
      case 'duration': cfg = { type: 'bar', data: { labels: sorted.map(s => new Date(s.startedAt).toLocaleDateString()), datasets: [{ label: 'Hours', data: sorted.map(s => (s.duration || 0) / 3600000), backgroundColor: '#00b894' }] }, options: this.chartOpts('Duration') }; break;
      case 'games': const gt = {}; this.filteredHistory.forEach(s => { gt[s.game || 'Unknown'] = (gt[s.game || 'Unknown'] || 0) + (s.duration || 0); }); const tg = Object.entries(gt).sort((a, b) => b[1] - a[1]).slice(0, 8); cfg = { type: 'bar', data: { labels: tg.map(g => g[0]), datasets: [{ label: 'Hours', data: tg.map(g => g[1] / 3600000), backgroundColor: ['#9147ff','#00b894','#0984e3','#e17055','#fdcb6e','#6c5ce7','#00cec9','#ff7675'] }] }, options: { ...this.chartOpts('Games'), indexAxis: 'y' } }; break;
      default: return;
    }
    this.chart = new Chart(canvas.getContext('2d'), cfg);
  }

  chartOpts(t) { return { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#e0e0e0' } }, title: { display: true, text: t, color: '#e0e0e0' } }, scales: { x: { ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,0.05)' } }, y: { ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,0.05)' } } } }; }

  renderHeatmap() {
    const container = document.getElementById('heatmap-grid');
    if (!container) return;
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const data = Array(7).fill(null).map(() => Array(24).fill(0));
    this.filteredHistory.forEach(s => { const d = new Date(s.startedAt); data[d.getDay()][d.getHours()]++; });
    const max = Math.max(...data.flat(), 1);
    container.innerHTML = `<div class="heatmap-header"><div class="heatmap-corner"></div>${[...Array(24)].map((_,i)=>`<div class="heatmap-hour">${i}</div>`).join('')}</div>${days.map((d,i)=>`<div class="heatmap-row"><div class="heatmap-day">${d}</div>${data[i].map(c=>`<div class="heatmap-cell" style="background:rgba(145,71,255,${c/max})" title="${c}"></div>`).join('')}</div>`).join('')}`;
  }

  renderAIInsights() {
    const container = document.getElementById('insights-content');
    if (!container) return;
    const insights = this.generateInsights();
    container.innerHTML = `<div class="insights-list">${insights.map(i => `<div class="insight-item ${i.type}"><span class="insight-icon">${i.icon}</span><p>${i.text}</p></div>`).join('')}</div>`;
  }

  generateInsights() {
    if (this.filteredHistory.length < 3) return [{ icon: '📊', text: 'Stream more to unlock insights!', type: 'info' }];
    const insights = [];
    const metrics = this.calculateMetrics();
    const growth = this.calculateGrowth();
    const time = this.calculateTimeStats();
    const streaks = this.calculateStreaks();
    const score = this.calculateConsistencyScore();
    if (metrics.trends.viewers > 15) insights.push({ icon: '🚀', text: `Viewership up ${metrics.trends.viewers.toFixed(0)}%!`, type: 'positive' });
    else if (metrics.trends.viewers < -10) insights.push({ icon: '📉', text: `Views down ${Math.abs(metrics.trends.viewers).toFixed(0)}%. Try new content!`, type: 'warning' });
    if (time) insights.push({ icon: '📅', text: `${time.bestDay} at ${this.formatHour(time.bestHour)} is your sweet spot.`, type: 'info' });
    if (streaks.current >= 3) insights.push({ icon: '🔥', text: `${streaks.current} day streak! Keep going!`, type: 'positive' });
    else if (streaks.lastStreamDays > 3) insights.push({ icon: '⚠️', text: `${streaks.lastStreamDays} days since streaming. Stay consistent!`, type: 'warning' });
    if (score.grade === 'S' || score.grade === 'A') insights.push({ icon: '⭐', text: `${score.grade} consistency! You're crushing it.`, type: 'positive' });
    else if (score.grade === 'D' || score.grade === 'F') insights.push({ icon: '💪', text: 'Work on streaming consistency for growth.', type: 'suggestion' });
    if (growth?.weeklyGrowth > 20) insights.push({ icon: '📈', text: `This week is ${growth.weeklyGrowth.toFixed(0)}% better!`, type: 'positive' });
    const title = this.calculateTitleAnalysis();
    if (title?.best[0]) insights.push({ icon: '💡', text: `Try using "${title.best[0].word}" in titles (+${title.best[0].impact.toFixed(0)}% viewers).`, type: 'suggestion' });
    return insights.slice(0, 6);
  }

  exportCSV() {
    if (this.filteredHistory.length === 0) { alert('No data!'); return; }
    const rows = [['Date','Title','Game','Duration','Viewers','ID'], ...this.filteredHistory.map(s => [new Date(s.startedAt).toISOString(), `"${(s.title||'').replace(/"/g,'""')}"`, `"${(s.game||'').replace(/"/g,'""')}"`, Math.round((s.duration||0)/60000), s.peakViewers||0, s.id])];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows.map(r=>r.join(',')).join('\n')], { type: 'text/csv' }));
    a.download = `streams-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }
}
