/**
 * Schedule Card — Canvas-generated monthly stream schedule image
 * + daily status post that auto-updates when the stream ends.
 *
 * Exports a factory that receives shared deps and returns helpers
 * consumed by the API routes and the stream-manager offline hook.
 */
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { join } from 'path';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } from 'discord.js';

const SCHEDULE_CHANNEL_ID = '1462867931020136562';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES  = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const THEMES = {
  midnight: {
    name: 'Midnight', bg: ['#0f0f1a', '#1a1a2e', '#16213e'],
    accent: '#9146ff', scheduled: '#4caf50', today: '#9146ff',
    text: '#e0e0e0', subtext: '#8b8fa3', cellBg: '#1a1a24',
    cellScheduled: '#1a2a1a', header: '#9146ff', legend: '#666666',
  },
  ocean: {
    name: 'Ocean', bg: ['#0a1628', '#0d2137', '#0a3050'],
    accent: '#00bcd4', scheduled: '#26c6da', today: '#00bcd4',
    text: '#e0f7fa', subtext: '#80cbc4', cellBg: '#0d1f2d',
    cellScheduled: '#0d2a2a', header: '#00bcd4', legend: '#5f8a8a',
  },
  sunset: {
    name: 'Sunset', bg: ['#1a0a05', '#2e1408', '#3e200a'],
    accent: '#ff9800', scheduled: '#ffb74d', today: '#ff9800',
    text: '#fff3e0', subtext: '#ffcc80', cellBg: '#1f150a',
    cellScheduled: '#2a1f0d', header: '#ff9800', legend: '#8a7050',
  },
  forest: {
    name: 'Forest', bg: ['#0a1a0f', '#132e18', '#0f3e16'],
    accent: '#66bb6a', scheduled: '#aed581', today: '#66bb6a',
    text: '#e8f5e9', subtext: '#a5d6a7', cellBg: '#0f1f14',
    cellScheduled: '#1a2a1a', header: '#66bb6a', legend: '#5a8a5a',
  },
  neon: {
    name: 'Neon Pink', bg: ['#1a0a1a', '#2e0a2e', '#3e103e'],
    accent: '#e91e63', scheduled: '#f06292', today: '#e91e63',
    text: '#fce4ec', subtext: '#f48fb1', cellBg: '#1f0a1f',
    cellScheduled: '#2a0d1f', header: '#e91e63', legend: '#8a507a',
  },
  logo: {
    name: 'Custom Logo', bg: ['#0a0a0a', '#111111', '#0d0d0d'],
    accent: '#e0e0e0', scheduled: '#4caf50', today: '#e0e0e0',
    text: '#ffffff', subtext: '#999999', cellBg: '#1a1a1a',
    cellScheduled: '#1a2a1a', header: '#e0e0e0', legend: '#666666',
    logoPath: 'assets/schedule-logo.png',
  },
};

export function registerScheduleCard({
  client, schedule, state, history, streamInfo,
  addLog, saveState, botTimezone, getTimeZoneParts,
  zonedTimeToUtcMillis, computeNextScheduledStream,
  queueDiscordMessage, debouncedSaveState, sv, io,
}) {

  // ─── State for daily post tracking ───
  // state.schedulePost = { monthlyMsgId, dailyMsgId, lastDailyDate, todayStreamDone, streamsToday }
  if (!state.schedulePost) {
    state.schedulePost = {
      monthlyMsgId: null,
      dailyMsgId: null,
      lastDailyDate: null,
      todayStreamDone: false,
      streamsToday: 0,
    };
  }
  const sp = state.schedulePost;
  if (!sp.theme) sp.theme = 'midnight';
  if (sp.themeIndex == null) sp.themeIndex = 0;

  const THEME_IDS = Object.keys(THEMES);

  function nextTheme() {
    sp.themeIndex = ((sp.themeIndex || 0) + 1) % THEME_IDS.length;
    sp.theme = THEME_IDS[sp.themeIndex];
    saveState();
    return sp.theme;
  }

  // ─────────────────────────────────────────────
  // 1.  Monthly schedule card (canvas image)
  // ─────────────────────────────────────────────
  // World timezone display zones
  const DISPLAY_ZONES = [
    { label: 'Los Angeles', tz: 'America/Los_Angeles' },
    { label: 'New York', tz: 'America/New_York' },
    { label: 'London', tz: 'Europe/London' },
    { label: 'Paris', tz: 'Europe/Paris' },
    { label: 'Tokyo', tz: 'Asia/Tokyo' },
  ];

  async function generateMonthlyCard(themeId) {
    const theme = THEMES[themeId || sp.theme || 'midnight'] || THEMES.midnight;
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: botTimezone }));
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayDate = now.getDate();

    const days = schedule.days || {};

    // Determine today's stream hour for timezone section (or default 21:00)
    const todayKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(todayDate).padStart(2, '0')}`;
    const todayEntry = days[todayKey] || null;
    const tzHour = todayEntry ? (todayEntry.hour ?? 21) : 21;
    const tzMinute = todayEntry ? (todayEntry.minute ?? 0) : 0;
    const tzLabel = todayEntry ? "Today's Stream" : 'Default Time (no stream today)';

    // Canvas dimensions
    const COLS = 7, ROWS = Math.ceil((daysInMonth + firstDay) / 7);
    const CELL_W = 130, CELL_H = 80;
    const PAD_X = 40, PAD_Y = 120;
    const HEADER_H = 40;
    const TZ_SECTION_H = 110;
    const W = PAD_X * 2 + COLS * CELL_W;
    const H = PAD_Y + HEADER_H + ROWS * CELL_H + TZ_SECTION_H + 50;

    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    // Background
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, theme.bg[0]);
    grad.addColorStop(0.5, theme.bg[1]);
    grad.addColorStop(1, theme.bg[2]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Logo overlay for logo theme
    if (theme.logoPath) {
      try {
        const logoImg = await loadImage(join(process.cwd(), theme.logoPath));
        const logoSize = Math.min(W, H) * 0.55;
        ctx.globalAlpha = 0.06;
        ctx.drawImage(logoImg, (W - logoSize) / 2, (H - logoSize) / 2, logoSize, logoSize);
        ctx.globalAlpha = 1;
      } catch { /* logo file not found, skip */ }
    }

    // Title (text only — canvas cannot render emoji)
    ctx.fillStyle = theme.text;
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${MONTH_NAMES[month]} ${year}  \u2014  Stream Schedule`, W / 2, 50);

    // Subtitle
    ctx.fillStyle = theme.subtext;
    ctx.font = '16px sans-serif';
    ctx.fillText(`Timezone: ${botTimezone}`, W / 2, 78);

    // Last updated
    ctx.fillStyle = theme.legend || theme.subtext;
    ctx.font = '11px sans-serif';
    ctx.fillText(`Last updated: ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`, W / 2, 98);

    // Day-of-week headers
    const headerY = PAD_Y;
    ctx.font = 'bold 14px sans-serif';
    for (let c = 0; c < COLS; c++) {
      const x = PAD_X + c * CELL_W + CELL_W / 2;
      ctx.fillStyle = theme.header;
      ctx.fillText(DAY_LABELS[c], x, headerY + 24);
    }

    // Day cells
    let dayNum = 1;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const idx = r * COLS + c;
        const x = PAD_X + c * CELL_W;
        const y = PAD_Y + HEADER_H + r * CELL_H;

        if (idx < firstDay || dayNum > daysInMonth) {
          ctx.fillStyle = theme.bg[0];
          ctx.globalAlpha = 0.3;
          roundRect(ctx, x + 2, y + 2, CELL_W - 4, CELL_H - 4, 6);
          ctx.fill();
          ctx.globalAlpha = 1;
          continue;
        }

        // Build date key for this day
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
        const entry = days[dateKey] || null;
        const isToday = dayNum === todayDate;
        const isPast = dayNum < todayDate;

        // Cell background
        if (isToday) {
          ctx.fillStyle = theme.today + '33';
          roundRect(ctx, x + 2, y + 2, CELL_W - 4, CELL_H - 4, 6);
          ctx.fill();
          ctx.strokeStyle = theme.today;
          ctx.lineWidth = 2;
          roundRect(ctx, x + 2, y + 2, CELL_W - 4, CELL_H - 4, 6);
          ctx.stroke();
        } else if (entry) {
          ctx.fillStyle = isPast ? theme.cellScheduled + '44' : theme.cellScheduled;
          roundRect(ctx, x + 2, y + 2, CELL_W - 4, CELL_H - 4, 6);
          ctx.fill();
          ctx.strokeStyle = theme.scheduled + (isPast ? '33' : '66');
          ctx.lineWidth = 1;
          roundRect(ctx, x + 2, y + 2, CELL_W - 4, CELL_H - 4, 6);
          ctx.stroke();
        } else {
          ctx.fillStyle = isPast ? theme.cellBg + '88' : theme.cellBg;
          roundRect(ctx, x + 2, y + 2, CELL_W - 4, CELL_H - 4, 6);
          ctx.fill();
        }

        // Day number
        ctx.textAlign = 'left';
        ctx.font = isToday ? 'bold 16px sans-serif' : '14px sans-serif';
        ctx.fillStyle = isToday ? theme.text : (isPast ? '#555' : theme.subtext);
        ctx.fillText(String(dayNum), x + 8, y + 20);

        // Stream time — drawn circle + text (no emoji)
        if (entry) {
          const h = entry.hour ?? 0;
          const m = entry.minute ?? 0;
          const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
          const cellCx = x + CELL_W / 2;
          drawCircle(ctx, cellCx - 28, y + 46, 5, isPast ? theme.scheduled + '66' : theme.scheduled);
          ctx.textAlign = 'center';
          ctx.font = 'bold 15px sans-serif';
          ctx.fillStyle = isToday ? theme.scheduled : (isPast ? theme.scheduled + '66' : theme.scheduled + 'cc');
          ctx.fillText(timeStr, cellCx + 4, y + 50);
        } else {
          ctx.textAlign = 'center';
          ctx.font = '12px sans-serif';
          ctx.fillStyle = isPast ? '#33333366' : '#333';
          ctx.fillText('\u2014', x + CELL_W / 2, y + 48);
        }

        // "TODAY" badge
        if (isToday) {
          ctx.font = 'bold 10px sans-serif';
          ctx.fillStyle = theme.today;
          ctx.textAlign = 'right';
          ctx.fillText('TODAY', x + CELL_W - 8, y + 18);
        }

        dayNum++;
      }
    }

    // ── World Timezone Section ──
    {
      const tzBaseY = PAD_Y + HEADER_H + ROWS * CELL_H + 14;

      // Background bar
      ctx.fillStyle = theme.bg[0] + 'cc';
      roundRect(ctx, PAD_X, tzBaseY - 6, W - PAD_X * 2, 96, 8);
      ctx.fill();
      ctx.strokeStyle = theme.accent + '44';
      ctx.lineWidth = 1;
      roundRect(ctx, PAD_X, tzBaseY - 6, W - PAD_X * 2, 96, 8);
      ctx.stroke();

      // Section title
      const srcTimeStr = `${tzHour.toString().padStart(2, '0')}:${tzMinute.toString().padStart(2, '0')}`;
      ctx.textAlign = 'center';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillStyle = theme.accent;
      ctx.fillText(`WORLD TIMES  \u2014  ${tzLabel}  (${srcTimeStr} ${botTimezone})`, W / 2, tzBaseY + 14);

      // Divider
      ctx.strokeStyle = theme.accent + '33';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD_X + 20, tzBaseY + 22);
      ctx.lineTo(W - PAD_X - 20, tzBaseY + 22);
      ctx.stroke();

      // Compute UTC for today at the stream hour
      const utcMs = zonedTimeToUtcMillis({
        year, month: month + 1, day: todayDate,
        hour: tzHour, minute: tzMinute, second: 0
      }, botTimezone);

      const colW = (W - PAD_X * 2 - 40) / DISPLAY_ZONES.length;
      const tzRowY = tzBaseY + 50;
      for (let i = 0; i < DISPLAY_ZONES.length; i++) {
        const dz = DISPLAY_ZONES[i];
        const cx = PAD_X + 20 + colW * i + colW / 2;
        const parts = getTimeZoneParts(new Date(utcMs), dz.tz);
        const tStr = `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`;
        drawCircle(ctx, cx, tzRowY - 12, 4, theme.accent);
        ctx.textAlign = 'center';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillStyle = theme.text;
        ctx.fillText(tStr, cx, tzRowY + 8);
        ctx.font = '12px sans-serif';
        ctx.fillStyle = theme.subtext;
        ctx.fillText(dz.label, cx, tzRowY + 24);
      }
    }

    // ── Legend (colored circles, no emoji) ──
    const legendY = H - 18;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    const legendParts = [
      { type: 'circle', color: theme.scheduled },
      { type: 'text', text: ' Scheduled   ' },
      { type: 'text', text: '\u2022   ' },
      { type: 'circle', color: theme.today },
      { type: 'text', text: ' Today   ' },
      { type: 'text', text: '\u2022   ' },
      { type: 'text', text: '\u2014 Off day' },
    ];
    let totalLW = 0;
    for (const p of legendParts) totalLW += p.type === 'circle' ? 12 : ctx.measureText(p.text).width;
    let lx = (W - totalLW) / 2;
    for (const p of legendParts) {
      if (p.type === 'circle') {
        drawCircle(ctx, lx + 5, legendY - 4, 5, p.color);
        lx += 12;
      } else {
        ctx.fillStyle = theme.legend;
        ctx.fillText(p.text, lx, legendY);
        lx += ctx.measureText(p.text).width;
      }
    }

    return canvas.toBuffer('image/png');
  }

  // Helper: filled circle
  function drawCircle(ctx, x, y, radius, color) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  // Helper: rounded rectangle path
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ─────────────────────────────────────────────
  // 2.  Daily hours post (embed below the card)
  // ─────────────────────────────────────────────
  function buildDailyEmbed() {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: botTimezone }));
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const entry = (schedule.days || {})[todayStr];

    const embed = new EmbedBuilder()
      .setColor(sv.isLive ? 0x4caf50 : (entry ? 0x9146ff : 0x2f3136))
      .setTimestamp();

    if (sv.isLive) {
      // Currently live
      const startMs = streamInfo.startedAt ? new Date(streamInfo.startedAt).getTime() : Date.now();
      const elapsed = Date.now() - startMs;
      const hrs = Math.floor(elapsed / 3600000);
      const mins = Math.floor((elapsed % 3600000) / 60000);
      embed.setTitle('🔴  LIVE NOW')
        .setDescription(`**${streamInfo.title || 'Streaming'}**\n🎮 ${streamInfo.game || 'Unknown'}\n⏱️ Uptime: ${hrs}h ${mins}m\n👀 Viewers: ${streamInfo.viewers || 0}`)
        .setFooter({ text: sp.streamsToday > 1 ? `Stream #${sp.streamsToday} today` : 'Live stream' });
    } else if (sp.todayStreamDone) {
      // Stream done for today
      const lastStream = history.length > 0 ? history[history.length - 1] : null;
      const hoursSinceEnd = sp.streamEndedAt ? (Date.now() - sp.streamEndedAt) / 3600000 : 999;

      if (hoursSinceEnd < 1 || !sp.postStreamTransitioned) {
        // Within 1hr (or not yet transitioned): full Stream Complete
        let summary = 'Stream completed for today! ✅';
        if (lastStream && lastStream.endedAt) {
          const durSec = lastStream.duration || 0;
          const dH = Math.floor(durSec / 3600);
          const dM = Math.floor((durSec % 3600) / 60);
          summary = `Today's stream is done!\n⏱️ Duration: ${dH}h ${dM}m\n👥 Peak: ${lastStream.peakViewers || 0} · Avg: ${lastStream.avgViewers || 0}`;
          if (lastStream.game) summary += `\n🎮 ${lastStream.game}`;
        }
        const nextEntry = getNextScheduledEntry();
        let footerText = sp.streamsToday > 1 ? `${sp.streamsToday} streams today` : 'See you next stream!';
        if (nextEntry) {
          const nextDate = new Date(nextEntry.ts).toLocaleString('en-US', { timeZone: botTimezone, weekday: 'long', hour: 'numeric', minute: '2-digit' });
          footerText += ` • ${nextDate}`;
        }
        embed.setTitle('✅  Stream Complete')
          .setDescription(summary)
          .setFooter({ text: footerText });
      } else {
        // After 1hr: transition to "Next Stream" with brief recap
        let desc = '';
        if (lastStream && lastStream.endedAt) {
          const durSec = lastStream.duration || 0;
          const dH = Math.floor(durSec / 3600);
          const dM = Math.floor((durSec % 3600) / 60);
          desc += `✅ Earlier today: ${dH}h ${dM}m · Peak: ${lastStream.peakViewers || 0} · 🎮 ${lastStream.game || 'Unknown'}\n\n`;
        }
        const nextEntry = getNextScheduledEntry();
        if (nextEntry) {
          const unixTs = Math.floor(nextEntry.ts / 1000);
          desc += `📅 **Next stream:** <t:${unixTs}:F>\n⏰ Starting <t:${unixTs}:R>`;
          embed.setColor(0x9146ff);
        } else {
          desc += 'No upcoming stream scheduled yet.';
        }
        embed.setTitle('📅  Next Stream')
          .setDescription(desc)
          .setFooter({ text: 'Stream complete — see you next time!' });
      }
    } else if (entry) {
      // Scheduled for today
      const h = entry.hour ?? 0;
      const m = entry.minute ?? 0;
      const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

      // Build a Discord timestamp for the scheduled time (today)
      const nowParts = getTimeZoneParts(new Date(), botTimezone);
      const scheduledUtcMs = zonedTimeToUtcMillis({
        year: nowParts.year, month: nowParts.month, day: nowParts.day,
        hour: h, minute: m, second: 0
      }, botTimezone);
      const unixTs = Math.floor(scheduledUtcMs / 1000);
      const isPast = Date.now() > scheduledUtcMs;

      embed.setTitle(`📅  Today's Stream`)
        .setDescription(
          `**Scheduled at** ${timeStr} (${botTimezone})\n` +
          `<t:${unixTs}:R>\n\n` +
          (isPast ? '⏳ Stream should be starting soon...' : `⏰ Starting <t:${unixTs}:R>`)
        );

      // Yesterday's stream recap
      if (sp.yesterdayStream) {
        const ys = sp.yesterdayStream;
        const ydH = Math.floor((ys.duration || 0) / 3600);
        const ydM = Math.floor(((ys.duration || 0) % 3600) / 60);
        embed.addFields({
          name: "Yesterday's stream",
          value: `⏱️ ${ydH}h ${ydM}m · 👥 Peak: ${ys.peakViewers || 0} · Avg: ${ys.avgViewers || 0}${ys.game ? ' · 🎮 ' + ys.game : ''}`,
          inline: false
        });
      }
    } else {
      // No stream today
      embed.setTitle('📅  No Stream Today')
        .setDescription('No stream is scheduled for today.\nCheck the monthly schedule above! 👆');

      // Show next scheduled
      const nextEntry = getNextScheduledEntry();
      if (nextEntry) {
        embed.addFields({
          name: 'Next stream',
          value: `<t:${Math.floor(nextEntry.ts / 1000)}:F> (<t:${Math.floor(nextEntry.ts / 1000)}:R>)`,
          inline: false
        });
      }

      // Yesterday's stream recap
      if (sp.yesterdayStream) {
        const ys = sp.yesterdayStream;
        const dH = Math.floor((ys.duration || 0) / 3600);
        const dM = Math.floor(((ys.duration || 0) % 3600) / 60);
        embed.addFields({
          name: "Yesterday's stream",
          value: `⏱️ ${dH}h ${dM}m · 👥 Peak: ${ys.peakViewers || 0} · Avg: ${ys.avgViewers || 0}${ys.game ? ' · 🎮 ' + ys.game : ''}`,
          inline: false
        });
      }
    }

    return embed;
  }

  // Helper: find the next upcoming scheduled stream
  function getNextScheduledEntry() {
    const days = schedule.days || {};
    const nowMs = Date.now();
    const nowParts = getTimeZoneParts(new Date(nowMs), botTimezone);
    const todayStr = `${nowParts.year}-${String(nowParts.month).padStart(2, '0')}-${String(nowParts.day).padStart(2, '0')}`;

    let best = null;
    for (const [dateStr, entry] of Object.entries(days)) {
      if (!entry || dateStr < todayStr) continue;
      const h = entry.hour ?? 0;
      const m = entry.minute ?? 0;
      const [y, mo, d] = dateStr.split('-').map(Number);
      const utcMs = zonedTimeToUtcMillis({
        year: y, month: mo, day: d,
        hour: h, minute: m, second: 0
      }, botTimezone);
      if (utcMs > nowMs) {
        if (!best || utcMs < best.ts) best = { day: dateStr, ts: utcMs };
      }
    }
    return best;
  }

  // ─────────────────────────────────────────────
  // 3.  Send / update Discord posts
  // ─────────────────────────────────────────────

  async function getScheduleChannel() {
    try {
      return await client.channels.fetch(SCHEDULE_CHANNEL_ID);
    } catch (err) {
      addLog('error', `Cannot fetch schedule channel ${SCHEDULE_CHANNEL_ID}: ${err.message}`);
      return null;
    }
  }

  /**
   * Post the monthly card + daily embed to the channel.
   * Called from the dashboard "Send to Discord" button.
   */
  async function postMonthlySchedule() {
    const channel = await getScheduleChannel();
    if (!channel) throw new Error('Schedule channel not found');

    // Delete old monthly message
    if (sp.monthlyMsgId) {
      try {
        const old = await channel.messages.fetch(sp.monthlyMsgId).catch(() => null);
        if (old) await old.delete();
      } catch {}
    }
    // Delete old daily message
    if (sp.dailyMsgId) {
      try {
        const old = await channel.messages.fetch(sp.dailyMsgId).catch(() => null);
        if (old) await old.delete();
      } catch {}
    }

    // Generate canvas image
    const imageBuffer = await generateMonthlyCard();
    const attachment = new AttachmentBuilder(imageBuffer, { name: 'schedule.png' });

    const monthlyMsg = await channel.send({ files: [attachment] });
    sp.monthlyMsgId = monthlyMsg.id;

    // Post daily embed below
    const dailyEmbed = buildDailyEmbed();
    const dailyMsg = await channel.send({ embeds: [dailyEmbed] });
    sp.dailyMsgId = dailyMsg.id;

    const now = new Date(new Date().toLocaleString('en-US', { timeZone: botTimezone }));
    sp.lastDailyDate = now.toISOString().slice(0, 10);
    sp.todayStreamDone = false;
    sp.streamsToday = 0;

    saveState();
    addLog('info', 'Monthly schedule card + daily post sent to Discord');

    return { monthlyMsgId: sp.monthlyMsgId, dailyMsgId: sp.dailyMsgId };
  }

  /**
   * Update only the daily embed (called by cron / stream-end / etc.)
   */
  async function updateDailyPost() {
    const channel = await getScheduleChannel();
    if (!channel) return;
    if (!sp.dailyMsgId) return;

    try {
      const msg = await channel.messages.fetch(sp.dailyMsgId).catch(() => null);
      if (!msg) {
        addLog('warn', 'Daily schedule message not found, skipping update');
        return;
      }
      const embed = buildDailyEmbed();
      await msg.edit({ embeds: [embed] });
      addLog('info', 'Daily schedule post updated');
    } catch (err) {
      addLog('error', 'Failed to update daily schedule post: ' + err.message);
    }
  }

  /**
   * Called at the start of each day (from maybeDailyReset or a cron-like check).
   * Refreshes the daily embed for the new day.
   */
  async function handleDailyReset() {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: botTimezone }));
    const today = now.toISOString().slice(0, 10);

    // Auto-transition: 1hr after stream ended, update to show next stream
    if (sp.todayStreamDone && sp.streamEndedAt && !sp.postStreamTransitioned) {
      if (Date.now() - sp.streamEndedAt >= 3600000) {
        sp.postStreamTransitioned = true;
        saveState();
        await updateDailyPost();
        addLog('info', 'Post-stream transition — daily embed now shows next stream');
      }
    }

    if (sp.lastDailyDate === today) return; // already done today

    // Save yesterday's stream recap before resetting
    if (sp.todayStreamDone && history.length > 0) {
      const last = history[history.length - 1];
      sp.yesterdayStream = {
        duration: last.duration || 0,
        peakViewers: last.peakViewers || 0,
        avgViewers: last.avgViewers || 0,
        game: last.game || null,
      };
    } else {
      sp.yesterdayStream = null;
    }

    const previousDate = sp.lastDailyDate;
    sp.lastDailyDate = today;
    sp.todayStreamDone = false;
    sp.streamsToday = 0;
    sp.streamEndedAt = null;
    sp.postStreamTransitioned = false;
    saveState();

    await updateDailyPost();

    // Re-post with next theme so the "TODAY" tile, world times, and theme cycle
    if (sp.monthlyMsgId) {
      nextTheme();
      addLog('info', `New day detected — re-posting schedule with theme "${sp.theme}" (deletes old messages)`);
      try { await postMonthlySchedule(); } catch (err) {
        addLog('error', 'Auto daily schedule card repost failed: ' + err.message);
      }
    }
  }

  // ─────────────────────────────────────────────
  // 4.  Stream-end hook (called from stream-manager)
  // ─────────────────────────────────────────────

  /**
   * Called when the bot detects a stream went offline.
   * Updates the daily embed. Handles fallback for 2+ streams/day.
   */
  async function onStreamEnd() {
    try {
      sp.streamsToday = (sp.streamsToday || 0) + 1;

      // Only mark "done" on the FIRST stream end of the day.
      // If a second stream starts and ends, we still update but don't break the card.
      if (!sp.todayStreamDone) {
        sp.todayStreamDone = true;
      }
      // ^ Fallback: even if streamsToday > 1, todayStreamDone stays true
      //   and the embed will show the latest completed stream info.

      sp.streamEndedAt = Date.now();
      sp.postStreamTransitioned = false;

      saveState();
      await updateDailyPost();
    } catch (err) {
      addLog('error', 'onStreamEnd schedule update failed: ' + err.message);
    }
  }

  /**
   * Called when bot detects a new LIVE transition.
   * If this is a second stream the same day, update the daily post.
   */
  async function onStreamStart() {
    try {
      // If the daily embed was already marked "done", we need to flip it back
      if (sp.todayStreamDone) {
        sp.todayStreamDone = false;
        saveState();
        addLog('info', `Stream #${(sp.streamsToday || 0) + 1} today detected — updating daily post`);
      }
      await updateDailyPost();
    } catch (err) {
      addLog('error', 'onStreamStart schedule update failed: ' + err.message);
    }
  }

  return {
    generateMonthlyCard,
    buildDailyEmbed,
    postMonthlySchedule,
    updateDailyPost,
    handleDailyReset,
    onStreamEnd,
    onStreamStart,
    SCHEDULE_CHANNEL_ID,
    THEMES,
  };
}
