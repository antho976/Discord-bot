import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../..');

/**
 * Pet system: SSE, CRUD, giveaways, approvals, auto-cancel
 */
export function registerPetsRoutes(app, deps) {
  const {
    addLog, chatStats, checkStream, client, dashAudit,
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
    membersCache, startTime, apiRateLimits, buildOfflineEmbed
  } = deps;

  // Pets SSE (Server-Sent Events) for instant updates
  const petSSEClients = new Set();
  function notifyPetsChange() {
    for (const client of petSSEClients) {
      try { client.write('data: update\n\n'); } catch (e) { petSSEClients.delete(client); }
    }
  }
  app.get('/api/pets/stream', requireAuth, requireTier('viewer'), (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    res.write('data: connected\n\n');
    petSSEClients.add(res);
    req.on('close', () => { petSSEClients.delete(res); });
  });
  
  // Pets routes
  app.get('/pets', requireAuth, requireTier('viewer'), (req,res)=>res.send(renderPage('pets', req)));
  app.get('/pet-giveaways', requireAuth, requireTier('viewer'), (req,res)=>res.send(renderPage('pet-giveaways', req)));
  app.get('/pet-stats', requireAuth, requireTier('viewer'), (req,res)=>res.send(renderPage('pet-stats', req)));
  app.get('/api/pets', requireAuth, requireTier('viewer'), (req, res) => {
    const petsData = loadJSON(PETS_PATH, { pets: [], catalog: [], pendingPets: [] });
    const giveawaysData = loadJSON(GIVEAWAYS_PATH, { history: [] });
    const pending = (giveawaysData.history || []).filter(g => !g.confirmed).map(g => ({ petId: g.petId, winner: g.winner, giver: g.giver }));
    const pendingApprovals = (petsData.pendingPets || []).filter(p => p.status === 'pending').length;
    res.json({ ...petsData, pendingGiveaways: pending, pendingApprovals });
  });
  app.post('/api/pets/add', requireAuth, requireTier('moderator'), (req, res) => {
    try {
      const { petId, givenBy } = req.body;
      if (!petId) return res.json({ success: false, error: 'Missing petId' });
      const petsData = loadJSON(PETS_PATH, { pets: [], catalog: [] });
      const catalogEntry = (petsData.catalog || []).find(c => c.id === petId);
      if (!catalogEntry) return res.json({ success: false, error: 'Pet not found in catalog' });
      const newPet = {
        id: `pet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        petId,
        addedBy: req.userName || 'Dashboard',
        addedByName: req.userName || 'Dashboard',
        addedAt: new Date().toISOString(),
        ...(givenBy ? { givenBy } : {})
      };
      petsData.pets = petsData.pets || [];
      petsData.pets.push(newPet);
      saveJSON(PETS_PATH, petsData);
      const ownedCount = petsData.pets.filter(p => p.petId === petId).length;
      addLog('info', `Pet "${catalogEntry.name}" added by ${req.userName || 'Dashboard'} (now x${ownedCount})`);
      dashAudit(req.userName || 'Dashboard', 'pet-add', `Added pet "${catalogEntry.name}" (now x${ownedCount})`);
      notifyPetsChange();
      res.json({ success: true, pet: newPet });
    } catch (err) {
      console.error('[Pets] Error adding pet:', err);
      res.status(500).json({ success: false, error: 'Server error: ' + err.message });
    }
  });
  app.delete('/api/pets/:id', requireAuth, requireTier('moderator'), (req, res) => {
    try {
      const petsData = loadJSON(PETS_PATH, { pets: [], catalog: [] });
      const idx = (petsData.pets || []).findIndex(p => p.id === req.params.id);
      if (idx === -1) return res.json({ success: false, error: 'Pet not found' });
      const removed = petsData.pets.splice(idx, 1)[0];
      saveJSON(PETS_PATH, petsData);
      const catEntry = (petsData.catalog || []).find(c => c.id === removed.petId);
      addLog('info', `Pet "${catEntry?.name || removed.petId}" removed by ${req.userName || 'Dashboard'}`);
      dashAudit(req.userName || 'Dashboard', 'pet-remove', `Removed pet "${catEntry?.name || removed.petId}"`);
      notifyPetsChange();
      res.json({ success: true });
    } catch (err) {
      console.error('[Pets] Error removing pet:', err);
      res.status(500).json({ success: false, error: 'Server error: ' + err.message });
    }
  });
  app.post('/api/pets/catalog', requireAuth, requireTier('admin'), (req, res) => {
    const { id, name, emoji, description, imageUrl, animatedUrl, rarity, bonus, hidden } = req.body;
    if (!id || !name) return res.json({ success: false, error: 'Missing id or name' });
    const petsData = loadJSON(PETS_PATH, { pets: [], catalog: [] });
    petsData.catalog = petsData.catalog || [];
    const existing = petsData.catalog.findIndex(c => c.id === id);
    const entry = { id, name, emoji: emoji || '🐾', description: description || '', imageUrl: imageUrl || '', animatedUrl: animatedUrl || '', rarity: rarity || 'common', bonus: bonus || '', hidden: !!hidden };
    if (existing >= 0) {
      petsData.catalog[existing] = entry;
    } else {
      petsData.catalog.push(entry);
    }
    saveJSON(PETS_PATH, petsData);
    dashAudit(req.userName || 'Dashboard', 'pet-catalog', `Updated catalog entry: ${name}`);
    notifyPetsChange();
    res.json({ success: true });
  });
  // Edit individual pet catalog fields (rarity, description, bonus, imageUrl, hidden etc.)
  app.post('/api/pets/catalog/edit', requireAuth, requireTier('moderator'), (req, res) => {
    const { id } = req.body;
    if (!id) return res.json({ success: false, error: 'Missing pet id' });
    const petsData = loadJSON(PETS_PATH, { pets: [], catalog: [] });
    const idx = (petsData.catalog || []).findIndex(c => c.id === id);
    if (idx === -1) return res.json({ success: false, error: 'Pet not found in catalog' });
    const allowed = ['rarity', 'description', 'bonus', 'imageUrl', 'animatedUrl', 'hidden', 'tier', 'tierPoints'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        petsData.catalog[idx][key] = req.body[key];
      }
    }
    saveJSON(PETS_PATH, petsData);
    addLog('info', `Pet "${petsData.catalog[idx].name}" edited by ${req.userName || 'Dashboard'}: ${allowed.filter(k => req.body[k] !== undefined).join(', ')}`);
    dashAudit(req.userName || 'Dashboard', 'pet-catalog-edit', `Edited "${petsData.catalog[idx].name}": ${allowed.filter(k => req.body[k] !== undefined).join(', ')}`);
    notifyPetsChange();
    res.json({ success: true, pet: petsData.catalog[idx] });
  });
  
  // Create new catalog pet
  app.post('/api/pets/catalog/create', requireAuth, requireTier('moderator'), (req, res) => {
    const { name, emoji, category, rarity, tier, description, bonus, imageUrl, animatedUrl } = req.body;
    if (!name || !category) return res.json({ success: false, error: 'Name and category required' });
    const petsData = loadJSON(PETS_PATH, { pets: [], catalog: [], categories: [] });
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);
    const newPet = {
      id, name: name.trim(), emoji: emoji || '🐾', category, rarity: rarity || 'common',
      tier: tier || '', tierPoints: 0, description: description || '', bonus: bonus || '',
      imageUrl: imageUrl || '', animatedUrl: animatedUrl || '', hidden: false
    };
    if (!petsData.catalog) petsData.catalog = [];
    petsData.catalog.push(newPet);
    if (!petsData.categories) petsData.categories = [];
    if (!petsData.categories.includes(category)) petsData.categories.push(category);
    saveJSON(PETS_PATH, petsData);
    addLog('info', `New pet "${name}" created in ${category} by ${req.userName || 'Dashboard'}`);
    dashAudit(req.userName || 'Dashboard', 'pet-catalog-create', `Created pet "${name}" in ${category} (${rarity || 'common'})`);
    notifyPetsChange();
    res.json({ success: true, pet: newPet });
  });
  
  app.post('/api/pets/clear-all', requireAuth, requireTier('admin'), (req, res) => {
    try {
      const petsData = loadJSON(PETS_PATH, { pets: [], catalog: [] });
      const count = (petsData.pets || []).length;
      petsData.pets = [];
      saveJSON(PETS_PATH, petsData);
      addLog('info', `All pets cleared (${count} removed) by ${req.userName || 'Dashboard'}`);
      dashAudit(req.userName || 'Dashboard', 'pets-clear-all', `Cleared all pets (${count} removed)`);
      notifyPetsChange();
      res.json({ success: true, removed: count });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  
  // Delete all pets in a category (catalog entries + owned)
  app.post('/api/pets/catalog/delete-category', requireAuth, requireTier('admin'), (req, res) => {
    try {
      const { category } = req.body;
      if (!category) return res.json({ success: false, error: 'Missing category' });
      const petsData = loadJSON(PETS_PATH, { pets: [], catalog: [], categories: [] });
      const catPetIds = (petsData.catalog || []).filter(p => p.category === category).map(p => p.id);
      if (catPetIds.length === 0) return res.json({ success: false, error: 'No pets found in this category' });
      petsData.catalog = (petsData.catalog || []).filter(p => p.category !== category);
      petsData.pets = (petsData.pets || []).filter(p => !catPetIds.includes(p.petId));
      petsData.categories = (petsData.categories || []).filter(c => c !== category);
      saveJSON(PETS_PATH, petsData);
      addLog('info', `Category "${category}" deleted (${catPetIds.length} pets removed) by ${req.userName || 'Dashboard'}`);
      dashAudit(req.userName || 'Dashboard', 'pet-category-delete', `Deleted category "${category}" (${catPetIds.length} pets)`);
      notifyPetsChange();
      res.json({ success: true, removed: catPetIds.length });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Delete a single pet type from catalog (+ all owned instances)
  app.post('/api/pets/catalog/delete-pet', requireAuth, requireTier('admin'), (req, res) => {
    try {
      const { id } = req.body;
      if (!id) return res.json({ success: false, error: 'Missing pet id' });
      const petsData = loadJSON(PETS_PATH, { pets: [], catalog: [], categories: [] });
      const petEntry = (petsData.catalog || []).find(p => p.id === id);
      if (!petEntry) return res.json({ success: false, error: 'Pet not found in catalog' });
      const removedOwned = (petsData.pets || []).filter(p => p.petId === id).length;
      petsData.catalog = (petsData.catalog || []).filter(p => p.id !== id);
      petsData.pets = (petsData.pets || []).filter(p => p.petId !== id);
      saveJSON(PETS_PATH, petsData);
      addLog('info', `Pet type "${petEntry.name}" deleted (${removedOwned} owned removed) by ${req.userName || 'Dashboard'}`);
      dashAudit(req.userName || 'Dashboard', 'pet-type-delete', `Deleted pet type "${petEntry.name}" from ${petEntry.category} (${removedOwned} owned removed)`);
      notifyPetsChange();
      res.json({ success: true, name: petEntry.name, removedOwned });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  
  // Move a pet to a different category
  app.post('/api/pets/catalog/move', requireAuth, requireTier('moderator'), (req, res) => {
    try {
      const { id, newCategory } = req.body;
      if (!id || !newCategory) return res.json({ success: false, error: 'Missing id or newCategory' });
      const petsData = loadJSON(PETS_PATH, { pets: [], catalog: [], categories: [] });
      const idx = (petsData.catalog || []).findIndex(c => c.id === id);
      if (idx === -1) return res.json({ success: false, error: 'Pet not found' });
      const oldCat = petsData.catalog[idx].category;
      petsData.catalog[idx].category = newCategory;
      if (!petsData.categories) petsData.categories = [];
      if (!petsData.categories.includes(newCategory)) petsData.categories.push(newCategory);
      saveJSON(PETS_PATH, petsData);
      addLog('info', `Pet "${petsData.catalog[idx].name}" moved from "${oldCat}" to "${newCategory}" by ${req.userName || 'Dashboard'}`);
      dashAudit(req.userName || 'Dashboard', 'pet-move', `Moved "${petsData.catalog[idx].name}" from "${oldCat}" to "${newCategory}"`);
      notifyPetsChange();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  
  // Pet giveaway routes
  const GIVEAWAYS_PATH = path.join(DATA_DIR, 'pet-giveaways.json');
  app.post('/api/pets/giveaway', requireAuth, requireTier('moderator'), (req, res) => {
    try {
      const { petId, winner, giver, notes, expirationTime, pingGiver, pingReceiver, pingReason, pingChannel } = req.body;
      if (!petId || !winner || !giver) return res.json({ success: false, error: 'Missing required fields' });
      
      // Check if giver is banned
      const bannedGivers = loadJSON(path.join(DATA_DIR, 'pet-giveaway-bans.json'), { banned: [] });
      if ((bannedGivers.banned || []).some(b => b.userId === giver)) {
        return res.json({ success: false, error: 'This user is banned from giving out pets' });
      }
      
      const petsData = loadJSON(PETS_PATH, { pets: [], catalog: [] });
      const catEntry = (petsData.catalog || []).find(c => c.id === petId);
      if (!catEntry) return res.json({ success: false, error: 'Pet not found' });
  
      const giveaways = loadJSON(GIVEAWAYS_PATH, { history: [] });
      giveaways.history = giveaways.history || [];
      const now = Date.now();
      const expiresAt = expirationTime ? now + (expirationTime * 60 * 1000) : null;
      
      giveaways.history.unshift({
        id: `giveaway-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        petId, petName: catEntry.name, petEmoji: catEntry.emoji, petRarity: catEntry.rarity,
        winner, giver, notes: notes || '',
        submittedBy: req.userName || 'Dashboard',
        submittedAt: new Date().toISOString(),
        confirmed: false, confirmedBy: null, confirmedAt: null,
        expiresAt: expiresAt,
        pingGiver: !!pingGiver,
        pingReceiver: !!pingReceiver,
        pingReason: pingReason || 'pet-ready',
        pingChannel: pingChannel || 'default',
        comments: [],
        warningPingSent: false
      });
      saveJSON(GIVEAWAYS_PATH, giveaways);
      addLog('info', `Pet giveaway submitted: ${catEntry.name} → ${winner} (by ${giver})`);
      dashAudit(req.userName || 'Dashboard', 'pet-giveaway', `Giveaway: ${catEntry.name} → ${winner} (by ${giver})`);
      notifyPetsChange();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  
  app.get('/api/pets/giveaways', requireAuth, requireTier('moderator'), (req, res) => {
    const giveaways = loadJSON(GIVEAWAYS_PATH, { history: [] });
    res.json(giveaways);
  });
  
  app.post('/api/pets/giveaway/confirm', requireAuth, requireTier('admin'), async (req, res) => {
    try {
      const { id } = req.body;
      const giveaways = loadJSON(GIVEAWAYS_PATH, { history: [] });
      const entry = (giveaways.history || []).find(g => g.id === id);
      if (!entry) return res.json({ success: false, error: 'Giveaway not found' });
      entry.confirmed = true;
      entry.confirmedBy = req.userName || 'Dashboard';
      entry.confirmedAt = new Date().toISOString();
      saveJSON(GIVEAWAYS_PATH, giveaways);
  
      // Auto-remove 1 instance of this pet from the giver's owned collection
      const petsData = loadJSON(PETS_PATH, { pets: [], catalog: [] });
      petsData.pets = petsData.pets || [];
      let ownedIdx = petsData.pets.findIndex(p => p.petId === entry.petId && p.givenBy && p.givenBy.trim() === entry.giver);
      if (ownedIdx === -1) ownedIdx = petsData.pets.findIndex(p => p.petId === entry.petId);
      if (ownedIdx !== -1) {
        petsData.pets.splice(ownedIdx, 1);
        saveJSON(PETS_PATH, petsData);
        addLog('info', `Pet "${entry.petName}" auto-removed from collection (giveaway confirmed to ${entry.winner})`);
      }
  
      addLog('info', `Pet giveaway confirmed: ${entry.petName} → ${entry.winner} (confirmed by ${req.userName})`);
      dashAudit(req.userName || 'Dashboard', 'pet-giveaway-confirm', `Confirmed giveaway: ${entry.petName} → ${entry.winner}`);
      notifyPetsChange();
  
      // Send Discord pings if requested
      try {
        const guild = client.guilds.cache.first();
        if (guild && (entry.pingGiver || entry.pingReceiver)) {
          // Use the configured ping channel, fall back to default channel
          let targetChannel = null;
          if (entry.pingChannel && entry.pingChannel !== 'default') {
            try { targetChannel = await client.channels.fetch(entry.pingChannel); } catch {}
          }
          if (!targetChannel) {
            targetChannel = guild.channels.cache.find(c => (c.type === 0 || c.type === 5) && c.permissionsFor(guild.members.me)?.has('SendMessages'));
          }
          if (targetChannel) {
            const parts = [];
            if (entry.pingReceiver && entry.winner) {
              const receiverMember = guild.members.cache.find(m => m.user.username.toLowerCase() === entry.winner.toLowerCase() || m.displayName.toLowerCase() === entry.winner.toLowerCase());
              if (receiverMember) parts.push(`<@${receiverMember.id}>`);
            }
            if (entry.pingGiver && entry.giver) {
              const giverMember = guild.members.cache.find(m => m.user.username.toLowerCase() === entry.giver.toLowerCase() || m.displayName.toLowerCase() === entry.giver.toLowerCase());
              if (giverMember) parts.push(`<@${giverMember.id}>`);
            }
            if (parts.length > 0) {
              targetChannel.send({ content: `${parts.join(' ')} — Pet giveaway confirmed! **${entry.petEmoji || '🐾'} ${entry.petName}** has been given to **${entry.winner}** by **${entry.giver}**.` }).catch(() => {});
            }
          }
        }
      } catch (pingErr) {
        addLog('warn', `Pet giveaway ping failed: ${pingErr.message}`);
      }
  
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  
  app.post('/api/pets/giveaway/delete', requireAuth, requireTier('admin'), (req, res) => {
    try {
      const { id } = req.body;
      const giveaways = loadJSON(GIVEAWAYS_PATH, { history: [] });
      giveaways.history = (giveaways.history || []).filter(g => g.id !== id);
      saveJSON(GIVEAWAYS_PATH, giveaways);
      notifyPetsChange();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  
  // ========== PET GIVEAWAY COMMENTS ==========
  
  app.post('/api/pets/giveaway/:id/comment', requireAuth, (req, res) => {
    try {
      const { comment } = req.body;
      if (!comment || !comment.trim()) return res.json({ success: false, error: 'Comment cannot be empty' });
      
      const giveaways = loadJSON(GIVEAWAYS_PATH, { history: [] });
      const entry = (giveaways.history || []).find(g => g.id === req.params.id);
      if (!entry) return res.json({ success: false, error: 'Giveaway not found' });
      
      if (!entry.comments) entry.comments = [];
      entry.comments.push({
        id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        author: req.userName || 'User',
        text: comment.trim(),
        timestamp: new Date().toISOString()
      });
      
      saveJSON(GIVEAWAYS_PATH, giveaways);
      addLog('info', `Comment added to giveaway ${req.params.id} by ${req.userName}`);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  
  app.delete('/api/pets/giveaway/:id/comment/:commentId', requireAuth, (req, res) => {
    try {
      const giveaways = loadJSON(GIVEAWAYS_PATH, { history: [] });
      const entry = (giveaways.history || []).find(g => g.id === req.params.id);
      if (!entry) return res.json({ success: false, error: 'Giveaway not found' });
      
      if (!entry.comments) entry.comments = [];
      const idx = entry.comments.findIndex(c => c.id === req.params.commentId);
      if (idx === -1) return res.json({ success: false, error: 'Comment not found' });
      
      entry.comments.splice(idx, 1);
      saveJSON(GIVEAWAYS_PATH, giveaways);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  
  // ========== PET GIVEAWAY BAN SYSTEM ==========
  
  app.post('/api/pets/giveaway/ban/add', requireAuth, requireTier('admin'), (req, res) => {
    try {
      const { userId, reason } = req.body;
      if (!userId) return res.json({ success: false, error: 'User ID required' });
      
      const bans = loadJSON(path.join(DATA_DIR, 'pet-giveaway-bans.json'), { banned: [] });
      bans.banned = bans.banned || [];
      
      if (bans.banned.some(b => b.userId === userId)) {
        return res.json({ success: false, error: 'User already banned' });
      }
      
      bans.banned.push({
        userId,
        reason: reason || 'No reason provided',
        bannedAt: new Date().toISOString(),
        bannedBy: req.userName || 'Admin'
      });
      
      saveJSON(path.join(DATA_DIR, 'pet-giveaway-bans.json'), bans);
      addLog('info', `User ${userId} banned from giving pets by ${req.userName}`);
      dashAudit(req.userName || 'Dashboard', 'pet-giveaway-ban', `Banned user ${userId} from pet giveaways`);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  
  app.post('/api/pets/giveaway/ban/remove', requireAuth, requireTier('admin'), (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.json({ success: false, error: 'User ID required' });
      
      const bans = loadJSON(path.join(DATA_DIR, 'pet-giveaway-bans.json'), { banned: [] });
      bans.banned = (bans.banned || []).filter(b => b.userId !== userId);
      
      saveJSON(path.join(DATA_DIR, 'pet-giveaway-bans.json'), bans);
      addLog('info', `User ${userId} unbanned from giving pets by ${req.userName}`);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  
  app.get('/api/pets/giveaway/bans', requireAuth, requireTier('moderator'), (req, res) => {
    const bans = loadJSON(path.join(DATA_DIR, 'pet-giveaway-bans.json'), { banned: [] });
    res.json(bans);
  });
  
  // ========== PENDING PET APPROVALS ==========
  app.get('/pet-approvals', requireAuth, requireTier('admin'), (req, res) => res.send(renderPage('pet-approvals', req)));
  
  app.get('/api/pets/pending', requireAuth, requireTier('moderator'), (req, res) => {
    try {
      const petsData = loadJSON(PETS_PATH, { pets: [], catalog: [], pendingPets: [] });
      const pending = (petsData.pendingPets || []).filter(p => p.status === 'pending');
      const catalog = petsData.catalog || [];
      const enriched = pending.map(p => {
        const cat = catalog.find(c => c.id === p.petId);
        return { ...p, petName: cat?.name || p.petId, petEmoji: cat?.emoji || '🐾', petRarity: cat?.rarity || 'common', petCategory: cat?.category || 'Other', petImage: cat?.animatedUrl || cat?.imageUrl || '', petBonus: cat?.bonus || '' };
      });
      res.json({ pending: enriched, total: enriched.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  
  app.post('/api/pets/pending/approve', requireAuth, requireTier('admin'), (req, res) => {
    try {
      const { id } = req.body;
      if (!id) return res.json({ success: false, error: 'Missing pending pet id' });
      const petsData = loadJSON(PETS_PATH, { pets: [], catalog: [], pendingPets: [] });
      const pendingIdx = (petsData.pendingPets || []).findIndex(p => p.id === id && p.status === 'pending');
      if (pendingIdx === -1) return res.json({ success: false, error: 'Pending pet not found' });
      const pending = petsData.pendingPets[pendingIdx];
      pending.status = 'approved';
      pending.approvedBy = req.userName || 'Dashboard';
      pending.approvedAt = new Date().toISOString();
      // Add to actual pets
      petsData.pets = petsData.pets || [];
      const newPet = {
        id: `pet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        petId: pending.petId,
        addedBy: pending.requestedBy,
        addedByName: pending.requestedByName,
        givenBy: pending.givenBy || pending.requestedByName,
        addedAt: new Date().toISOString(),
        approvedBy: req.userName || 'Dashboard'
      };
      petsData.pets.push(newPet);
      saveJSON(PETS_PATH, petsData);
      const catEntry = (petsData.catalog || []).find(c => c.id === pending.petId);
      addLog('info', `Pet "${catEntry?.name || pending.petId}" approved by ${req.userName || 'Dashboard'} (requested by ${pending.requestedByName})`);
      dashAudit(req.userName || 'Dashboard', 'pet-approve', `Approved "${catEntry?.name || pending.petId}" (requested by ${pending.requestedByName})`);
      notifyPetsChange();
      res.json({ success: true, pet: newPet });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  
  app.post('/api/pets/pending/approve-all', requireAuth, requireTier('admin'), (req, res) => {
    try {
      const petsData = loadJSON(PETS_PATH, { pets: [], catalog: [], pendingPets: [] });
      const pendingList = (petsData.pendingPets || []).filter(p => p.status === 'pending');
      if (pendingList.length === 0) return res.json({ success: false, error: 'No pending pets' });
      let approved = 0;
      for (const pending of pendingList) {
        pending.status = 'approved';
        pending.approvedBy = req.userName || 'Dashboard';
        pending.approvedAt = new Date().toISOString();
        petsData.pets = petsData.pets || [];
        petsData.pets.push({
          id: `pet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${approved}`,
          petId: pending.petId,
          addedBy: pending.requestedBy,
          addedByName: pending.requestedByName,
          givenBy: pending.givenBy || pending.requestedByName,
          addedAt: new Date().toISOString(),
          approvedBy: req.userName || 'Dashboard'
        });
        approved++;
      }
      saveJSON(PETS_PATH, petsData);
      addLog('info', `${approved} pending pets approved by ${req.userName || 'Dashboard'}`);
      dashAudit(req.userName || 'Dashboard', 'pet-approve-all', `Approved ${approved} pending pets`);
      notifyPetsChange();
      res.json({ success: true, approved });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  
  app.post('/api/pets/pending/reject', requireAuth, requireTier('admin'), (req, res) => {
    try {
      const { id, reason } = req.body;
      if (!id) return res.json({ success: false, error: 'Missing pending pet id' });
      const petsData = loadJSON(PETS_PATH, { pets: [], catalog: [], pendingPets: [] });
      const pendingIdx = (petsData.pendingPets || []).findIndex(p => p.id === id && p.status === 'pending');
      if (pendingIdx === -1) return res.json({ success: false, error: 'Pending pet not found' });
      const pending = petsData.pendingPets[pendingIdx];
      pending.status = 'rejected';
      pending.rejectedBy = req.userName || 'Dashboard';
      pending.rejectedAt = new Date().toISOString();
      pending.rejectReason = reason || '';
      saveJSON(PETS_PATH, petsData);
      const catEntry = (petsData.catalog || []).find(c => c.id === pending.petId);
      addLog('info', `Pet "${catEntry?.name || pending.petId}" rejected by ${req.userName || 'Dashboard'} (requested by ${pending.requestedByName})${reason ? ': ' + reason : ''}`);
      dashAudit(req.userName || 'Dashboard', 'pet-reject', `Rejected "${catEntry?.name || pending.petId}" (requested by ${pending.requestedByName})`);
      notifyPetsChange();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  
  app.post('/api/pets/pending/reject-all', requireAuth, requireTier('admin'), (req, res) => {
    try {
      const { reason } = req.body || {};
      const petsData = loadJSON(PETS_PATH, { pets: [], catalog: [], pendingPets: [] });
      const pendingList = (petsData.pendingPets || []).filter(p => p.status === 'pending');
      if (pendingList.length === 0) return res.json({ success: false, error: 'No pending pets' });
      let rejected = 0;
      for (const pending of pendingList) {
        pending.status = 'rejected';
        pending.rejectedBy = req.userName || 'Dashboard';
        pending.rejectedAt = new Date().toISOString();
        pending.rejectReason = reason || '';
        rejected++;
      }
      saveJSON(PETS_PATH, petsData);
      addLog('info', `${rejected} pending pets rejected by ${req.userName || 'Dashboard'}`);
      dashAudit(req.userName || 'Dashboard', 'pet-reject-all', `Rejected ${rejected} pending pets`);
      notifyPetsChange();
      res.json({ success: true, rejected });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  
  // ========== PET GIVEAWAY STATS ==========
  
  app.get('/api/pets/giveaway/stats', requireAuth, requireTier('moderator'), (req, res) => {
    try {
      const giveaways = loadJSON(GIVEAWAYS_PATH, { history: [] });
      const history = giveaways.history || [];
      
      const giverStats = {};
      const petStats = {};
      const rarityStats = {};
      let totalGiveaways = 0;
      let confirmedGiveaways = 0;
      
      history.forEach(g => {
        totalGiveaways++;
        if (g.confirmed) confirmedGiveaways++;
        
        giverStats[g.giver] = (giverStats[g.giver] || 0) + 1;
        petStats[g.petName] = (petStats[g.petName] || 0) + 1;
        rarityStats[g.petRarity] = (rarityStats[g.petRarity] || 0) + 1;
      });
      
      const topGivers = Object.entries(giverStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));
      
      const topPets = Object.entries(petStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));
      
      const rarityBreakdown = Object.entries(rarityStats)
        .map(([rarity, count]) => ({ rarity, count }));
      
      res.json({
        totalGiveaways,
        confirmedGiveaways,
        pendingGiveaways: totalGiveaways - confirmedGiveaways,
        confirmationRate: totalGiveaways > 0 ? Math.round((confirmedGiveaways / totalGiveaways) * 100) : 0,
        topGivers,
        topPets,
        rarityBreakdown
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  
  // ========== PET GIVEAWAY WARNINGS & AUTO-CANCEL ==========
  // Check for expiring giveaways every 5 minutes
  setInterval(async () => {
    try {
      const giveaways = loadJSON(GIVEAWAYS_PATH, { history: [] });
      const history = giveaways.history || [];
      const now = Date.now();
      const fifteenMinutes = 15 * 60 * 1000;
      
      let changed = false;
      const toRemove = [];
      
      for (const g of history) {
        // Skip confirmed giveaways
        if (g.confirmed) continue;
        
        // Auto-cancel expired giveaways
        if (g.expiresAt && g.expiresAt <= now) {
          toRemove.push(g.id);
          changed = true;
          
          const cancelMsg = `❌ **Pet Giveaway Expired!** The ${g.petName} giveaway from **${g.giver}** to **${g.winner}** has expired and been automatically cancelled.`;
          
          if (g.pingReceiver) {
            try {
              const user = await client.users.fetch(g.winner).catch(() => null);
              if (user) await user.send(cancelMsg);
            } catch {}
          }
          
          if (g.pingGiver) {
            try {
              const user = await client.users.fetch(g.giver).catch(() => null);
              if (user) await user.send(`❌ Your pet giveaway of **${g.petName}** to **${g.winner}** has expired and been cancelled.`);
            } catch {}
          }
          
          addLog('info', `Pet giveaway auto-cancelled (expired): ${g.petName} from ${g.giver} to ${g.winner}`);
          continue;
        }
        
        // Send warning 15 minutes before expiration
        if (g.expiresAt && !g.warningPingSent && g.expiresAt - now <= fifteenMinutes && g.expiresAt - now > 0) {
          g.warningPingSent = true;
          changed = true;
          
          const timeLeft = Math.round((g.expiresAt - now) / 60000);
          const warningMsg = `⏰ **Pet Giveaway Expiring Soon!** The ${g.petName} giveaway from **${g.giver}** to **${g.winner}** expires in ${timeLeft} minutes. Please claim it soon!`;
          
          if (g.pingReceiver) {
            try {
              const user = await client.users.fetch(g.winner).catch(() => null);
              if (user) await user.send(warningMsg);
            } catch {}
          }
          
          if (g.pingGiver) {
            try {
              const user = await client.users.fetch(g.giver).catch(() => null);
              if (user) await user.send(`⏰ Your pet giveaway of **${g.petName}** to **${g.winner}** expires in ${timeLeft} minutes!`);
            } catch {}
          }
        }
      }
      
      // Remove expired giveaways
      if (toRemove.length > 0) {
        giveaways.history = history.filter(g => !toRemove.includes(g.id));
        changed = true;
      }
      
      if (changed) saveJSON(GIVEAWAYS_PATH, giveaways);
    } catch (err) {
      console.error('[PetGiveaway] Warning/Auto-cancel check error:', err.message);
    }
  }, 5 * 60 * 1000);

  return { notifyPetsChange };
}
