export default function setup(app, deps, F) {
  const { requireAuth, requireTier, saveState, dashAudit } = deps;

  // F60: Member Notes — private mod-only notes per member
  if (!F.memberNotes) F.memberNotes = { enabled: true, notes: {} };
  // notes: { odId: [{ id, content, author, createdAt, editedAt }] }

  // API routes
  app.get('/api/features/member-notes', requireAuth, requireTier('moderator'), (req, res) => {
    const { userId } = req.query;
    if (userId) {
      res.json({ success: true, notes: F.memberNotes.notes[userId] || [] });
    } else {
      // Return summary: members with notes and note counts
      const summary = {};
      for (const [uid, notes] of Object.entries(F.memberNotes.notes)) {
        if (notes.length > 0) summary[uid] = notes.length;
      }
      res.json({ success: true, summary, total: Object.keys(summary).length });
    }
  });

  app.post('/api/features/member-notes', requireAuth, requireTier('admin'), (req, res) => {
    const { enabled } = req.body;
    if (typeof enabled === 'boolean') F.memberNotes.enabled = enabled;
    saveState();
    res.json({ success: true, config: { enabled: F.memberNotes.enabled } });
  });

  app.post('/api/features/member-notes/add', requireAuth, requireTier('moderator'), (req, res) => {
    const { userId, content } = req.body;
    if (!userId) return res.json({ success: false, error: 'userId required' });
    if (!content || typeof content !== 'string') return res.json({ success: false, error: 'content required' });

    if (!F.memberNotes.notes[userId]) F.memberNotes.notes[userId] = [];

    // Cap notes per user
    if (F.memberNotes.notes[userId].length >= 100) {
      return res.json({ success: false, error: 'Maximum 100 notes per member' });
    }

    const note = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      content: String(content).slice(0, 2000),
      author: req.userName || 'Unknown',
      createdAt: Date.now(),
      editedAt: null
    };
    F.memberNotes.notes[userId].push(note);
    saveState();
    dashAudit(req.userName, 'add-member-note', `Note added for user ${userId}`);
    res.json({ success: true, note });
  });

  app.post('/api/features/member-notes/edit', requireAuth, requireTier('moderator'), (req, res) => {
    const { userId, noteId, content } = req.body;
    if (!userId || !noteId) return res.json({ success: false, error: 'userId and noteId required' });
    if (!content || typeof content !== 'string') return res.json({ success: false, error: 'content required' });

    const notes = F.memberNotes.notes[userId];
    if (!notes) return res.json({ success: false, error: 'No notes for this user' });

    const note = notes.find(n => n.id === noteId);
    if (!note) return res.json({ success: false, error: 'Note not found' });

    note.content = String(content).slice(0, 2000);
    note.editedAt = Date.now();
    saveState();
    dashAudit(req.userName, 'edit-member-note', `Note edited for user ${userId}`);
    res.json({ success: true, note });
  });

  app.post('/api/features/member-notes/delete', requireAuth, requireTier('moderator'), (req, res) => {
    const { userId, noteId } = req.body;
    if (!userId || !noteId) return res.json({ success: false, error: 'userId and noteId required' });

    const notes = F.memberNotes.notes[userId];
    if (!notes) return res.json({ success: false, error: 'No notes for this user' });

    const idx = notes.findIndex(n => n.id === noteId);
    if (idx === -1) return res.json({ success: false, error: 'Note not found' });

    notes.splice(idx, 1);
    if (notes.length === 0) delete F.memberNotes.notes[userId];
    saveState();
    dashAudit(req.userName, 'delete-member-note', `Note deleted for user ${userId}`);
    res.json({ success: true });
  });

  return {
    hooks: {},
    backgroundTasks: [],
    masterData: () => ({ memberNotes: { enabled: F.memberNotes.enabled, members: Object.keys(F.memberNotes.notes).length } })
  };
}
