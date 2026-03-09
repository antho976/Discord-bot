import path from 'path';

export default function setup(app, deps, F) {
  const { addLog, client, loadJSON, saveJSON, requireAuth, requireTier, saveState, dashAudit, DATA_DIR } = deps;

  if (!F.ticketIdleTimeout) F.ticketIdleTimeout = { enabled: false, warnAfterMinutes: 1440, closeAfterMinutes: 4320, warnMessage: '⚠️ This ticket will be auto-closed due to inactivity.' };

  async function checkTicketIdleTimeout() {
    if (!F.ticketIdleTimeout.enabled) return;
    try {
      const TICKETS_PATH = path.join(DATA_DIR, 'tickets.json');
      const data = loadJSON(TICKETS_PATH, { tickets: [], settings: {} });
      const now = Date.now();
      const warnMs = (F.ticketIdleTimeout.warnAfterMinutes || 1440) * 60000;
      const closeMs = (F.ticketIdleTimeout.closeAfterMinutes || 4320) * 60000;
      for (const ticket of data.tickets) {
        if (ticket.status !== 'open') continue;
        const lastActivity = ticket.lastActivity || ticket.createdAt || now;
        const idle = now - lastActivity;
        if (idle >= closeMs) {
          ticket.status = 'closed';
          ticket.closedBy = 'Auto-close (idle)';
          ticket.closedAt = now;
          const ch = client.channels?.cache?.get(ticket.channelId);
          if (ch) {
            await ch.send('🔒 **This ticket has been auto-closed due to inactivity.**');
            setTimeout(() => ch.delete('Idle ticket auto-close').catch(() => {}), 5000);
          }
          addLog('info', `Ticket #${ticket.number} auto-closed (idle ${Math.floor(idle / 60000)}min)`);
        } else if (idle >= warnMs && !ticket.idleWarned) {
          ticket.idleWarned = true;
          const ch = client.channels?.cache?.get(ticket.channelId);
          if (ch) await ch.send(F.ticketIdleTimeout.warnMessage || '⚠️ This ticket will be auto-closed due to inactivity.');
        }
      }
      saveJSON(TICKETS_PATH, data);
    } catch (e) {
      addLog('error', `Ticket idle check failed: ${e.message}`);
    }
  }

  app.get('/api/features/ticket-idle', requireAuth, requireTier('admin'), (req, res) => {
    res.json({ success: true, config: F.ticketIdleTimeout });
  });
  app.post('/api/features/ticket-idle', requireAuth, requireTier('admin'), (req, res) => {
    const { enabled, warnAfterMinutes, closeAfterMinutes, warnMessage } = req.body;
    if (typeof enabled === 'boolean') F.ticketIdleTimeout.enabled = enabled;
    if (warnAfterMinutes != null) F.ticketIdleTimeout.warnAfterMinutes = Math.max(30, Math.min(10080, parseInt(warnAfterMinutes) || 1440));
    if (closeAfterMinutes != null) F.ticketIdleTimeout.closeAfterMinutes = Math.max(60, Math.min(43200, parseInt(closeAfterMinutes) || 4320));
    if (typeof warnMessage === 'string') F.ticketIdleTimeout.warnMessage = warnMessage.slice(0, 500);
    saveState();
    dashAudit(req.userName, 'update-ticket-idle', `Ticket idle: enabled=${F.ticketIdleTimeout.enabled}`);
    res.json({ success: true, config: F.ticketIdleTimeout });
  });

  return {
    hooks: {},
    backgroundTasks: [{ fn: checkTicketIdleTimeout, intervalMs: 1800000 }],
    masterData: () => ({ ticketIdleTimeout: { enabled: F.ticketIdleTimeout.enabled } })
  };
}
