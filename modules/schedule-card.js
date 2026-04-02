/**
 * Schedule Card — Canvas-generated monthly stream schedule image
 * + daily status post that auto-updates when the stream ends.
 *
 * Exports a factory that receives shared deps and returns helpers
 * consumed by the API routes and the stream-manager offline hook.
 */
import { createCanvas } from '@napi-rs/canvas';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } from 'discord.js';

const SCHEDULE_CHANNEL_ID = '1462867931020136562';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES  = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

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

  // ─────────────────────────────────────────────
  // 1.  Monthly schedule card (canvas image)
  // ─────────────────────────────────────────────
  function generateMonthlyCard() {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: botTimezone }));
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayDate = now.getDate();

    const weekly = schedule.weekly || {};

    // Canvas dimensions
    const COLS = 7, ROWS = Math.ceil((daysInMonth + firstDay) / 7);
    const CELL_W = 130, CELL_H = 80;
    const PAD_X = 40, PAD_Y = 120;
    const HEADER_H = 40;
    const W = PAD_X * 2 + COLS * CELL_W;
    const H = PAD_Y + HEADER_H + ROWS * CELL_H + 40;

    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    // Background
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#0f0f1a');
    grad.addColorStop(0.5, '#1a1a2e');
    grad.addColorStop(1, '#16213e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Title
    ctx.fillStyle = '#e0e0e0';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`📅  ${MONTH_NAMES[month]} ${year}  Stream Schedule`, W / 2, 50);

    // Subtitle
    ctx.fillStyle = '#8b8fa3';
    ctx.font = '16px sans-serif';
    ctx.fillText(`Timezone: ${botTimezone}`, W / 2, 78);

    // Day-of-week headers
    const headerY = PAD_Y;
    ctx.font = 'bold 14px sans-serif';
    for (let c = 0; c < COLS; c++) {
      const x = PAD_X + c * CELL_W + CELL_W / 2;
      ctx.fillStyle = '#9146ff';
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
          // empty slot
          ctx.fillStyle = '#12121a';
          ctx.globalAlpha = 0.3;
          roundRect(ctx, x + 2, y + 2, CELL_W - 4, CELL_H - 4, 6);
          ctx.fill();
          ctx.globalAlpha = 1;
          continue;
        }

        const dayOfWeek = DAY_NAMES[c];
        const entry = weekly[dayOfWeek];
        const isToday = dayNum === todayDate;
        const isPast = dayNum < todayDate;

        // Cell background
        if (isToday) {
          ctx.fillStyle = '#9146ff33';
          roundRect(ctx, x + 2, y + 2, CELL_W - 4, CELL_H - 4, 6);
          ctx.fill();
          ctx.strokeStyle = '#9146ff';
          ctx.lineWidth = 2;
          roundRect(ctx, x + 2, y + 2, CELL_W - 4, CELL_H - 4, 6);
          ctx.stroke();
        } else if (entry) {
          ctx.fillStyle = isPast ? '#1a2a1a44' : '#1a2a1a';
          roundRect(ctx, x + 2, y + 2, CELL_W - 4, CELL_H - 4, 6);
          ctx.fill();
          ctx.strokeStyle = isPast ? '#4caf5033' : '#4caf5066';
          ctx.lineWidth = 1;
          roundRect(ctx, x + 2, y + 2, CELL_W - 4, CELL_H - 4, 6);
          ctx.stroke();
        } else {
          ctx.fillStyle = isPast ? '#1a1a2488' : '#1a1a24';
          roundRect(ctx, x + 2, y + 2, CELL_W - 4, CELL_H - 4, 6);
          ctx.fill();
        }

        // Day number
        ctx.textAlign = 'left';
        ctx.font = isToday ? 'bold 16px sans-serif' : '14px sans-serif';
        ctx.fillStyle = isToday ? '#e0e0e0' : (isPast ? '#555' : '#b0b0b0');
        ctx.fillText(String(dayNum), x + 8, y + 20);

        // Stream time
        if (entry) {
          const h = entry.hour ?? 0;
          const m = entry.minute ?? 0;
          const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
          ctx.textAlign = 'center';
          ctx.font = 'bold 15px sans-serif';
          ctx.fillStyle = isToday ? '#4caf50' : (isPast ? '#4caf5066' : '#4caf50cc');
          ctx.fillText(`🟢 ${timeStr}`, x + CELL_W / 2, y + 48);
        } else {
          ctx.textAlign = 'center';
          ctx.font = '12px sans-serif';
          ctx.fillStyle = isPast ? '#33333366' : '#333';
          ctx.fillText('—', x + CELL_W / 2, y + 48);
        }

        // "TODAY" badge
        if (isToday) {
          ctx.font = 'bold 10px sans-serif';
          ctx.fillStyle = '#9146ff';
          ctx.textAlign = 'right';
          ctx.fillText('TODAY', x + CELL_W - 8, y + 18);
        }

        dayNum++;
      }
    }

    // Legend at bottom
    const legendY = H - 24;
    ctx.textAlign = 'center';
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#666';
    ctx.fillText('🟢 = Stream scheduled  •  🟣 = Today  •  — = Off day', W / 2, legendY);

    return canvas.toBuffer('image/png');
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
    const todayName = DAY_NAMES[now.getDay()];
    const entry = (schedule.weekly || {})[todayName];

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
      let summary = 'Stream completed for today! ✅';
      if (lastStream && lastStream.endedAt) {
        const durSec = lastStream.duration || 0;
        const dH = Math.floor(durSec / 3600);
        const dM = Math.floor((durSec % 3600) / 60);
        summary = `Today's stream is done!\n⏱️ Duration: ${dH}h ${dM}m\n👥 Peak: ${lastStream.peakViewers || 0} · Avg: ${lastStream.avgViewers || 0}`;
        if (lastStream.game) summary += `\n🎮 ${lastStream.game}`;
      }
      embed.setTitle('✅  Stream Complete')
        .setDescription(summary)
        .setFooter({ text: sp.streamsToday > 1 ? `${sp.streamsToday} streams today` : 'See you next stream!' });
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
    }

    return embed;
  }

  // Helper: find the next upcoming scheduled stream
  function getNextScheduledEntry() {
    const weekly = schedule.weekly || {};
    const nowMs = Date.now();
    const nowParts = getTimeZoneParts(new Date(nowMs), botTimezone);
    const localNow = new Date(Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day, nowParts.hour, nowParts.minute, nowParts.second));
    const localDayIndex = localNow.getUTCDay();

    let best = null;
    for (const [dayName, entry] of Object.entries(weekly)) {
      const dayMap = { sunday:0, monday:1, tuesday:2, wednesday:3, thursday:4, friday:5, saturday:6 };
      const targetIdx = dayMap[dayName];
      if (targetIdx === undefined) continue;
      const h = entry.hour ?? 0;
      const m = entry.minute ?? 0;

      // Check next 7 days
      for (let offset = 0; offset <= 7; offset++) {
        const candidateIdx = (localDayIndex + offset) % 7;
        if (candidateIdx !== targetIdx) continue;
        const candidateLocal = new Date(localNow.getTime());
        candidateLocal.setUTCDate(candidateLocal.getUTCDate() + offset);
        const utcMs = zonedTimeToUtcMillis({
          year: candidateLocal.getUTCFullYear(),
          month: candidateLocal.getUTCMonth() + 1,
          day: candidateLocal.getUTCDate(),
          hour: h, minute: m, second: 0
        }, botTimezone);
        if (utcMs > nowMs) {
          if (!best || utcMs < best.ts) best = { day: dayName, ts: utcMs };
        }
        break;
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
    const imageBuffer = generateMonthlyCard();
    const attachment = new AttachmentBuilder(imageBuffer, { name: 'schedule.png' });

    const monthlyMsg = await channel.send({
      content: '## 📅 Monthly Stream Schedule',
      files: [attachment]
    });
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

    if (sp.lastDailyDate === today) return; // already done today

    const previousDate = sp.lastDailyDate;
    sp.lastDailyDate = today;
    sp.todayStreamDone = false;
    sp.streamsToday = 0;
    saveState();

    await updateDailyPost();

    // Check if we crossed into a new month → auto re-post card
    const prevMonth = previousDate ? parseInt(previousDate.slice(5, 7)) : null;
    const currMonth = now.getMonth() + 1;
    if (prevMonth !== null && prevMonth !== currMonth) {
      addLog('info', 'New month detected — auto-posting new monthly schedule card');
      try { await postMonthlySchedule(); } catch (err) {
        addLog('error', 'Auto monthly schedule post failed: ' + err.message);
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
  };
}
