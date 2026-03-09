// RPG Dashboard Tabs - extracted from index.js
// All functions are pure HTML/JS template generators with zero external dependencies

export function renderRPGWorldsTab() {
  return `
  <style>
    .worlds-container { display: flex; gap: 20px; min-height: 600px; }
    .worlds-sidebar { width: 280px; background: #0a0e17; border-radius: 8px; padding: 15px; border: 1px solid #2a2a3e; overflow-y: auto; max-height: 600px; }
    .world-item { padding: 12px; margin: 8px 0; background: #1a1f2e; border-radius: 4px; cursor: pointer; border-left: 3px solid transparent; transition: all 0.2s; }
    .world-item.active { border-left-color: #9146ff; background: #2a2f3e; }
    .world-item:hover { background: #2a2f3e; }
    .world-item-name { font-weight: bold; color: #e0e0e0; }
    .world-item-desc { font-size: 11px; color: #888; margin-top: 3px; }
    .content-editor { flex: 1; }
    .entity-type-tabs { display: flex; gap: 8px; margin-bottom: 15px; flex-wrap: wrap; border-bottom: 2px solid #2a2a3e; }
    .entity-type-tab { padding: 10px 15px; cursor: pointer; border-bottom: 3px solid transparent; color: #888; font-size: 13px; transition: all 0.2s; }
    .entity-type-tab.active { color: #f59e0b; border-bottom-color: #f59e0b; }
    .entity-type-tab:hover { color: #e0e0e0; }
    .entity-list-tabs { display: flex; gap: 8px; margin-bottom: 15px; flex-wrap: wrap; }
    .entity-list-tab { padding: 8px 12px; background: #1a1f2e; cursor: pointer; border-radius: 4px; border: 1px solid #2a2a3e; color: #888; font-size: 11px; transition: all 0.2s; }
    .entity-list-tab.active { background: #2a2a3e; color: #f59e0b; border-color: #9146ff; }
    .entity-list-tab:hover { background: #2a2a3e; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .form-group { display: flex; flex-direction: column; }
    .form-group label { font-size: 11px; color: #f59e0b; margin-bottom: 5px; font-weight: bold; text-transform: uppercase; }
    .form-group input, .form-group textarea, .form-group select { background: #1a1f2e; border: 1px solid #2a2a3e; color: #e0e0e0; padding: 8px; border-radius: 4px; font-size: 12px; }
    .form-group input:focus, .form-group textarea:focus, .form-group select:focus { border-color: #9146ff; outline: none; }
    .form-group textarea { min-height: 70px; resize: vertical; }
    .editor-panel { background: #0a0e17; padding: 15px; border-radius: 8px; border: 1px solid #2a2a3e; max-height: 500px; overflow-y: auto; }
    .empty-state { text-align: center; padding: 40px 20px; color: #666; }
  </style>

  <div class="worlds-container">
    <div class="worlds-sidebar">
      <div style="font-weight: bold; color: #f59e0b; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #2a2a3e; text-transform: uppercase; font-size: 12px;">Worlds</div>
      <button class="small" onclick="worldCreateNew()" style="width: 100%; margin-bottom: 12px; background: #9146ff;">+ New World</button>
      <div id="worlds-list" style="max-height: 500px; overflow-y: auto;">
        <div style="color: #666; font-size: 12px; text-align: center; padding: 20px;">No worlds yet</div>
      </div>
    </div>
    
    <div class="content-editor">
      <div id="content-editor-area">
        <div class="empty-state">
          <div style="font-size: 48px; margin-bottom: 10px;">🌍</div>
          <div>Create or select a world to manage its content</div>
        </div>
      </div>
    </div>
  </div>

  <script>
    let worldData = {};
    let currentWorldId = null;
    let currentEntityType = 'monsters';
    let currentEntityId = null;

    const entityConfig = {
      monsters: { title: 'Monsters', icon: '👹', fields: [
        { name: 'name', label: 'Name', type: 'text' }, { name: 'type', label: 'Type', type: 'text' },
        { name: 'level', label: 'Level', type: 'number' }, { name: 'health', label: 'Health', type: 'number' },
        { name: 'mana', label: 'Mana', type: 'number' }, { name: 'strength', label: 'STR', type: 'number' },
        { name: 'intelligence', label: 'INT', type: 'number' }, { name: 'wisdom', label: 'WIS', type: 'number' },
        { name: 'dexterity', label: 'DEX', type: 'number' }, { name: 'constitution', label: 'CON', type: 'number' },
        { name: 'charisma', label: 'CHA', type: 'number' }, { name: 'skills', label: 'Skills', type: 'textarea' },
        { name: 'loot', label: 'Loot', type: 'textarea' }, { name: 'behavior', label: 'Behavior', type: 'text' }
      ] },
      items: { title: 'Items', icon: '🎁', fields: [
        { name: 'name', label: 'Name', type: 'text' }, { name: 'type', label: 'Type', type: 'text' },
        { name: 'rarity', label: 'Rarity', type: 'text' }, { name: 'value', label: 'Gold', type: 'number' },
        { name: 'weight', label: 'Weight', type: 'number' }, { name: 'effect', label: 'Effect', type: 'textarea' },
        { name: 'requirements', label: 'Requirements', type: 'textarea' }, { name: 'crafting', label: 'Crafting', type: 'textarea' }
      ] },
      npcs: { title: 'NPCs', icon: '🤝', fields: [
        { name: 'name', label: 'Name', type: 'text' }, { name: 'title', label: 'Title', type: 'text' },
        { name: 'race', label: 'Race', type: 'text' }, { name: 'age', label: 'Age', type: 'number' },
        { name: 'allegiance', label: 'Faction', type: 'text' }, { name: 'questGiver', label: 'Quest Giver', type: 'checkbox' },
        { name: 'merchant', label: 'Merchant', type: 'checkbox' }, { name: 'sells', label: 'Sells', type: 'textarea' },
        { name: 'buys', label: 'Buys', type: 'textarea' }, { name: 'dialogue', label: 'Dialogue', type: 'textarea' }
      ] },
      locations: { title: 'Locations', icon: '📍', fields: [
        { name: 'name', label: 'Name', type: 'text' }, { name: 'type', label: 'Type', type: 'text' },
        { name: 'level', label: 'Level', type: 'number' }, { name: 'difficulty', label: 'Difficulty', type: 'text' },
        { name: 'areas', label: 'Areas', type: 'number' }, { name: 'inhabitants', label: 'Inhabitants', type: 'textarea' },
        { name: 'treasures', label: 'Treasures', type: 'textarea' }, { name: 'boss', label: 'Boss', type: 'text' },
        { name: 'lore', label: 'Lore', type: 'textarea' }
      ] },
      dungeons: { title: 'Dungeons', icon: '🏛️', fields: [
        { name: 'name', label: 'Name', type: 'text' }, { name: 'level', label: 'Level', type: 'number' },
        { name: 'difficulty', label: 'Difficulty', type: 'text' }, { name: 'floors', label: 'Floors', type: 'number' },
        { name: 'boss', label: 'Boss', type: 'text' }, { name: 'minPlayers', label: 'Min Players', type: 'number' },
        { name: 'maxPlayers', label: 'Max Players', type: 'number' }, { name: 'timeLimit', label: 'Time Limit (min)', type: 'number' },
        { name: 'rewards', label: 'Rewards', type: 'textarea' }, { name: 'description', label: 'Description', type: 'textarea' }
      ] },
      raids: { title: 'Raids', icon: '⚔️', fields: [
        { name: 'name', label: 'Name', type: 'text' }, { name: 'level', label: 'Level', type: 'number' },
        { name: 'difficulty', label: 'Difficulty', type: 'text' }, { name: 'phases', label: 'Phases', type: 'number' },
        { name: 'bosses', label: 'Bosses', type: 'textarea' }, { name: 'minPlayers', label: 'Min Players', type: 'number' },
        { name: 'maxPlayers', label: 'Max Players', type: 'number' }, { name: 'timeLimit', label: 'Time Limit (min)', type: 'number' },
        { name: 'rewards', label: 'Rewards', type: 'textarea' }, { name: 'description', label: 'Description', type: 'textarea' }
      ] },
      worldBosses: { title: 'World Bosses', icon: '👑', fields: [
        { name: 'name', label: 'Name', type: 'text' }, { name: 'level', label: 'Level', type: 'number' },
        { name: 'health', label: 'Health', type: 'number' }, { name: 'mana', label: 'Mana', type: 'number' },
        { name: 'strength', label: 'STR', type: 'number' }, { name: 'intelligence', label: 'INT', type: 'number' },
        { name: 'dexterity', label: 'DEX', type: 'number' }, { name: 'wisdom', label: 'WIS', type: 'number' },
        { name: 'constitution', label: 'CON', type: 'number' }, { name: 'charisma', label: 'CHA', type: 'number' },
        { name: 'abilities', label: 'Abilities', type: 'textarea' }, { name: 'spawnLocation', label: 'Spawn Location', type: 'text' },
        { name: 'respawnTime', label: 'Respawn Time (hours)', type: 'number' }, { name: 'rewards', label: 'Rewards', type: 'textarea' }
      ] },
      quests: { title: 'Quests', icon: '📜', fields: [
        { name: 'name', label: 'Name', type: 'text' }, { name: 'type', label: 'Type', type: 'text' },
        { name: 'level', label: 'Level', type: 'number' }, { name: 'questGiver', label: 'Quest Giver', type: 'text' },
        { name: 'description', label: 'Description', type: 'textarea' }, { name: 'objectives', label: 'Objectives', type: 'textarea' },
        { name: 'rewards', label: 'Rewards', type: 'textarea' }, { name: 'expReward', label: 'EXP Reward', type: 'number' },
        { name: 'goldReward', label: 'Gold Reward', type: 'number' }, { name: 'prerequisites', label: 'Prerequisites', type: 'textarea' },
        { name: 'repeatable', label: 'Repeatable', type: 'checkbox' }, { name: 'timeLimit', label: 'Time Limit (min)', type: 'number' }
      ] }
    };

    async function worldLoad() {
      try {
        const resp = await fetch('/api/rpg/worlds');
        const data = await resp.json();
        worldData = {};
        if (data.worlds && Array.isArray(data.worlds)) {
          data.worlds.forEach(w => { worldData[w.id] = w; });
        }
        worldRender();
      } catch(e) { console.error(e); }
    }

    function worldRender() {
      const list = document.getElementById('worlds-list');
      if (!list) return;
      let html = '';
      Object.keys(worldData).forEach(id => {
        const w = worldData[id];
        html += '<div class="world-item ' + (currentWorldId === id ? 'active' : '') + '" onclick="worldSelect(\\'' + id + '\\')">' +
                '<div class="world-item-name">' + (w.name || 'Unnamed') + ' <span onclick="event.stopPropagation(); worldDelete(\\'' + id + '\\')" style="float: right; color: #e74c3c; cursor: pointer; font-size: 14px;">✕</span></div>' +
                '<div class="world-item-desc">Tier ' + (w.tier || 1) + '</div></div>';
      });
      list.innerHTML = html || '<div style="color: #666; font-size: 12px; text-align: center; padding: 20px;">No worlds</div>';
    }

    function worldCreateNew() {
      const name = prompt('World name:');
      if (!name) return;
      const tier = parseInt(prompt('World tier:', '1')) || 1;
      const newWorld = {
        id: 'world_' + Date.now(),
        name: name,
        tier: tier,
        entities: { monsters: {}, items: {}, npcs: {}, locations: {}, dungeons: {}, raids: {}, worldBosses: {}, quests: {} },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      fetch('/api/rpg/worlds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWorld)
      }).then(r => r.json()).then(data => {
        if (data.success) worldLoad();
      }).catch(e => console.error('Error creating world:', e));
    }

    function worldDelete(id) {
      if (!confirm('Delete this world?')) return;
      fetch('/api/rpg/worlds/' + id, { method: 'DELETE' })
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            if (currentWorldId === id) currentWorldId = null;
            worldLoad();
          }
        }).catch(e => console.error('Error deleting world:', e));
    }

    function worldEdit(id) {
      const world = worldData[id];
      const newName = prompt('World name:', world.name);
      if (!newName) return;
      const newTier = parseInt(prompt('World tier:', world.tier)) || world.tier;
      world.name = newName;
      world.tier = newTier;
      world.updatedAt = new Date().toISOString();
      fetch('/api/rpg/worlds/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(world)
      }).then(r => r.json()).then(data => {
        if (data.success) worldLoad();
      }).catch(e => console.error('Error updating world:', e));
    }

    function worldSelect(id) {
      currentWorldId = id;
      currentEntityType = 'monsters';
      worldRender();
      renderEntityEditor();
    }

    function renderEntityEditor() {
      const area = document.getElementById('content-editor-area');
      if (!area) return;
      if (!currentWorldId) {
        area.innerHTML = '<div class="empty-state"><div style="font-size: 48px;">🌍</div><div>Select a world</div></div>';
        return;
      }
      const world = worldData[currentWorldId];
      if (!world.entities) world.entities = { monsters: {}, items: {}, npcs: {}, locations: {}, dungeons: {}, raids: {}, worldBosses: {}, quests: {} };
      let html = '<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">';
      html += '<h3 style="color: #f59e0b; margin: 0;">' + world.name + ' (Tier ' + (world.tier || 1) + ')</h3>';
      html += '<button class="small" onclick="worldEdit(\\'' + currentWorldId + '\\')" style="background: #f59e0b;">✏️ Edit World</button>';
      html += '</div>';
      html += '<div class="entity-type-tabs">';
      ['monsters', 'items', 'npcs', 'locations', 'dungeons', 'raids', 'worldBosses', 'quests'].forEach(type => {
        const cfg = entityConfig[type];
        html += '<div class="entity-type-tab ' + (currentEntityType === type ? 'active' : '') + '" onclick="switchEntityType(\\'' + type + '\\')">' + cfg.icon + ' ' + cfg.title + '</div>';
      });
      html += '</div>';
      const entities = world.entities[currentEntityType] || {};
      const cfg = entityConfig[currentEntityType];
      html += '<div class="entity-list-tabs"><button class="small" onclick="createEntity()" style="background: #9146ff;">+ New ' + cfg.title.slice(0, -1) + '</button>';
      Object.keys(entities).forEach(id => {
        const e = entities[id];
        html += '<div class="entity-list-tab ' + (currentEntityId === id ? 'active' : '') + '" onclick="selectEntity(\\'' + id + '\\')">' +
                (e.name || 'Unnamed').substring(0, 10) + ' <span onclick="event.stopPropagation(); deleteEntity(\\'' + id + '\\')">✕</span></div>';
      });
      html += '</div>';
      if (currentEntityId && entities[currentEntityId]) {
        const entity = entities[currentEntityId];
        html += '<div class="editor-panel"><h4 style="color: #f59e0b;">' + cfg.title.slice(0, -1) + '</h4><div class="form-grid">';
        cfg.fields.forEach(field => {
          let input = '';
          if (field.type === 'checkbox') input = '<label><input type="checkbox" id="entity_' + field.name + '" ' + (entity[field.name] ? 'checked' : '') + '> ' + field.label + '</label>';
          else if (field.type === 'textarea') input = '<textarea id="entity_' + field.name + '">' + (entity[field.name] || '') + '</textarea>';
          else if (field.type === 'number') input = '<input type="number" id="entity_' + field.name + '" value="' + (entity[field.name] || 0) + '">';
          else input = '<input type="text" id="entity_' + field.name + '" value="' + (entity[field.name] || '') + '">';
          html += '<div class="form-group"><label>' + field.label + '</label>' + input + '</div>';
        });
        html += '</div><button class="small" onclick="saveEntity()" style="margin-top: 12px; background: #28a745;">💾 Save</button></div>';
      } else {
        html += '<div class="empty-state" style="margin-top: 20px;"><div style="font-size: 36px;">' + cfg.icon + '</div></div>';
      }
      area.innerHTML = html;
    }

    function switchEntityType(type) {
      currentEntityType = type;
      currentEntityId = null;
      renderEntityEditor();
    }

    function createEntity() {
      const world = worldData[currentWorldId];
      if (!world.entities[currentEntityType]) world.entities[currentEntityType] = {};
      const id = 'e_' + Date.now();
      world.entities[currentEntityType][id] = { id, name: 'New ' + entityConfig[currentEntityType].title.slice(0, -1) };
      selectEntity(id);
    }

    function selectEntity(id) {
      currentEntityId = id;
      renderEntityEditor();
    }

    function deleteEntity(id) {
      if (!confirm('Delete?')) return;
      const world = worldData[currentWorldId];
      delete world.entities[currentEntityType][id];
      if (currentEntityId === id) currentEntityId = null;
      renderEntityEditor();
    }

    function saveEntity() {
      const world = worldData[currentWorldId];
      const entity = world.entities[currentEntityType][currentEntityId];
      const cfg = entityConfig[currentEntityType];
      cfg.fields.forEach(field => {
        const el = document.getElementById('entity_' + field.name);
        if (el) entity[field.name] = el.type === 'checkbox' ? el.checked : el.value;
      });
      fetch('/api/rpg/worlds/' + currentWorldId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(world)
      }).then(r => r.json()).then(data => {
        if (data.success && typeof showNotification === 'function') showNotification('✅ Saved!');
      });
    }

    // Load worlds on page load
    worldLoad();
  </script>
  `;
}


export function renderRPGQuestsTab() {
  return `
<div class="card">
  <h2>⚔️ RPG Quests Editor</h2>
  <p style="color:#b0b0b0">Create and manage RPG quests with branching outcomes</p>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-top:15px">
    <div>
      <h3 style="color:#9146ff">Create New Quest</h3>
      <input id="quest-title" placeholder="Quest title" style="margin-bottom:8px">
      <textarea id="quest-description" placeholder="Quest description" style="margin-bottom:8px;height:80px"></textarea>
      <input id="quest-rewards" placeholder="Rewards (e.g., 100 gold, 10 XP)" style="margin-bottom:8px">
      <button onclick="createQuest()" style="margin-top:8px">⚔️ Create Quest</button>
    </div>
    <div>
      <h3 style="color:#9146ff">Existing Quests</h3>
      <div id="quests-list" style="max-height:300px;overflow-y:auto;background:#1a1a1d;padding:10px;border-radius:4px;border:1px solid #3a3a42">
        <p style="color:#999">Loading quests...</p>
      </div>
    </div>
  </div>
</div>

<script>
function loadQuests() {
  fetch('/api/rpg/quests')
    .then(r => r.json())
    .then(data => {
      const list = document.getElementById('quests-list');
      if (!data.quests || data.quests.length === 0) {
        list.innerHTML = '<p style="color:#999;font-style:italic">No quests created yet</p>';
      } else {
        list.innerHTML = data.quests.map(q => \`
          <div style="padding:10px;background:#2a2f3a;border-radius:4px;margin-bottom:8px">
            <div style="font-weight:bold;color:#e0e0e0">\${q.title}</div>
            <div style="font-size:12px;color:#999">\${q.description.substring(0, 50)}...</div>
            <button class="small" style="margin-top:6px;width:auto" onclick="editQuest('\${q.id}')">✏️ Edit</button>
            <button class="small danger" style="margin-top:6px;width:auto;margin-left:4px" onclick="deleteQuest('\${q.id}')">🗑️ Delete</button>
          </div>
        \`).join('');
      }
    })
    .catch(err => {
      document.getElementById('quests-list').innerHTML = '<p style="color:#ef5350">Error loading quests</p>';
    });
}

function createQuest() {
  const title = document.getElementById('quest-title').value;
  const description = document.getElementById('quest-description').value;
  const rewards = document.getElementById('quest-rewards').value;
  
  if (!title || !description) {
    alert('❌ Please fill title and description');
    return;
  }
  
  fetch('/api/rpg/quests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description, rewards })
  })
  .then(r => r.json())
  .then(data => {
    if (data.success) {
      alert('✅ Quest created!');
      document.getElementById('quest-title').value = '';
      document.getElementById('quest-description').value = '';
      document.getElementById('quest-rewards').value = '';
      loadQuests();
    } else {
      alert('❌ Error: ' + (data.error || 'Unknown'));
    }
  })
  .catch(err => alert('❌ Error: ' + err.message));
}

function deleteQuest(id) {
  if (!confirm('Delete this quest?')) return;
  fetch('/api/rpg/quests/' + id, { method: 'DELETE' })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        alert('✅ Quest deleted');
        loadQuests();
      } else {
        alert('❌ Error: ' + (data.error || 'Unknown'));
      }
    })
    .catch(err => alert('❌ Error: ' + err.message));
}

function editQuest(id) {
  alert('✏️ Edit feature coming soon!');
}

loadQuests();
</script>
`;
}

export function renderRPGValidatorsTab() {
  return `
<div class="card">
  <h2>✅ RPG Content Validation</h2>
  <p style="color:#b0b0b0">Validate all RPG content and detect issues</p>
  <div style="margin-top:15px">
    <button onclick="runValidation()" style="margin-right:8px">🔍 Run Full Validation</button>
    <button onclick="checkDependencies()">🔗 Check Dependencies</button>
    <button onclick="checkForCycles()">🔄 Detect Cycles</button>
  </div>
  <div id="validation-results" style="margin-top:15px;padding:15px;background:#1a1a1d;border:1px solid #3a3a42;border-radius:4px;display:none">
    <h3 id="validation-status" style="color:#9146ff;margin-top:0"></h3>
    <div id="validation-output" style="max-height:400px;overflow-y:auto">
      <p style="color:#999">Results will appear here...</p>
    </div>
  </div>
</div>

<script>
function runValidation() {
  const results = document.getElementById('validation-results');
  const status = document.getElementById('validation-status');
  const output = document.getElementById('validation-output');
  
  status.textContent = '⏳ Validating...';
  results.style.display = 'block';
  output.innerHTML = '<p style="color:#999">Validating content...</p>';
  
  fetch('/api/rpg/validate')
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        const issues = data.issues || [];
        const hasErrors = issues.some(i => i.severity === 'error');
        status.textContent = hasErrors ? '❌ Validation Failed' : '✅ Validation Passed';
        status.style.color = hasErrors ? '#ef5350' : '#4caf50';
        
        if (issues.length === 0) {
          output.innerHTML = '<p style="color:#4caf50"><b>✅ All content is valid!</b></p>';
        } else {
          output.innerHTML = '<div>' + issues.map(i => \`
            <div style="padding:10px;margin-bottom:8px;background:\${i.severity === 'error' ? '#2f1a1a' : '#2a2f1f'};border-left:3px solid \${i.severity === 'error' ? '#ef5350' : '#ffca28'};border-radius:4px">
              <div style="font-weight:bold;color:\${i.severity === 'error' ? '#ef5350' : '#ffca28'}">\${i.severity.toUpperCase()}: \${i.message}</div>
              <div style="font-size:12px;color:#999;margin-top:4px">\${i.details || ''}</div>
            </div>
          \`).join('') + '</div>';
        }
      } else {
        status.textContent = '❌ Validation Error';
        status.style.color = '#ef5350';
        output.innerHTML = '<p style="color:#ef5350">Error: ' + (data.error || 'Unknown') + '</p>';
      }
    })
    .catch(err => {
      status.textContent = '❌ Error';
      status.style.color = '#ef5350';
      output.innerHTML = '<p style="color:#ef5350">Error: ' + err.message + '</p>';
    });
}

function checkDependencies() {
  alert('🔗 Dependency check feature coming soon!');
}

function checkForCycles() {
  alert('🔄 Cycle detection feature coming soon!');
}
</script>
`;
}

export function renderRPGSimulatorsTab() {
  return `
<div class="card">
  <h2>🎲 RPG Simulators & Testing</h2>
  <p style="color:#b0b0b0">Test quests, combat, and world scenarios</p>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-top:15px">
    <div style="background:#2a2f3a;padding:15px;border-radius:6px;border:1px solid #3a3a42">
      <div style="font-weight:bold;color:#e0e0e0">⚔️ Combat Simulator</div>
      <p style="font-size:13px;color:#999;margin:8px 0">Simulate turn-based combat between characters</p>
      <button class="small" onclick="simulateCombat()" style="width:100%;margin-top:8px">🎲 Simulate Combat</button>
    </div>
    <div style="background:#2a2f3a;padding:15px;border-radius:6px;border:1px solid #3a3a42">
      <div style="font-weight:bold;color:#e0e0e0">⚔️ Quest Simulator</div>
      <p style="font-size:13px;color:#999;margin:8px 0">Preview quest outcomes and branching</p>
      <button class="small" onclick="simulateQuest()" style="width:100%;margin-top:8px">🎲 Simulate Quest</button>
    </div>
    <div style="background:#2a2f3a;padding:15px;border-radius:6px;border:1px solid #3a3a42">
      <div style="font-weight:bold;color:#e0e0e0">🌍 World State Simulator</div>
      <p style="font-size:13px;color:#999;margin:8px 0">Generate and preview daily world states</p>
      <button class="small" onclick="simulateWorldState()" style="width:100%;margin-top:8px">🎲 Simulate World</button>
    </div>
    <div style="background:#2a2f3a;padding:15px;border-radius:6px;border:1px solid #3a3a42">
      <div style="font-weight:bold;color:#e0e0e0">🚩 Flag Tester</div>
      <p style="font-size:13px;color:#999;margin:8px 0">Test flag conditions and cascades</p>
      <button class="small" onclick="testFlags()" style="width:100%;margin-top:8px">🎲 Test Flags</button>
    </div>
    <div style="background:#2a2f3a;padding:15px;border-radius:6px;border:1px solid #3a3a42">
      <div style="font-weight:bold;color:#e0e0e0">📊 Level Analysis</div>
      <p style="font-size:13px;color:#999;margin:8px 0">Analyze player stats at any level</p>
      <button class="small" onclick="openLevelAnalyzer()" style="width:100%;margin-top:8px">📊 Analyze Level</button>
    </div>
  </div>

  <div id="level-analyzer" style="margin-top:20px;padding:15px;background:#1a1a1d;border:1px solid #3a3a42;border-radius:4px;display:none">
    <h3 style="color:#9146ff;margin-top:0">📊 Level Analysis Tool</h3>
    <p style="color:#b0b0b0;font-size:13px;margin:8px 0">Includes stats from all quests below this level + weapon bonuses</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:15px;margin-top:15px">
      <div>
        <label style="color:#b0b0b0;display:block;margin-bottom:6px;font-weight:500">Player Level</label>
        <input type="number" id="analysisLevel" min="1" max="999" value="50" style="width:100%;padding:10px;background:#2a2f3a;border:1px solid #3a3a42;border-radius:4px;color:#e0e0e0">
      </div>
      <div>
        <label style="color:#b0b0b0;display:block;margin-bottom:6px;font-weight:500">Select Quest</label>
        <select id="analysisQuest" style="width:100%;padding:10px;background:#2a2f3a;border:1px solid #3a3a42;border-radius:4px;color:#e0e0e0">
          <option value="">Loading quests...</option>
        </select>
      </div>
      <div>
        <label style="color:#b0b0b0;display:block;margin-bottom:6px;font-weight:500">Weapon (Optional)</label>
        <select id="analysisWeapon" style="width:100%;padding:10px;background:#2a2f3a;border:1px solid #3a3a42;border-radius:4px;color:#e0e0e0">
          <option value="">None</option>
          <option value="iron_sword">Iron Sword</option>
          <option value="steel_sword">Steel Sword</option>
          <option value="wooden_staff">Wooden Staff</option>
          <option value="iron_axe">Iron Axe</option>
        </select>
      </div>
    </div>
    <button onclick="analyzeLevel()" style="width:100%;margin-top:15px;padding:12px;background:#9146ff;border:none;border-radius:4px;color:white;font-weight:bold;cursor:pointer">
      🔍 Analyze Level & Quest Difficulty
    </button>
    <div id="analysis-results" style="margin-top:15px;display:none">
      <div style="background:#0a0a0c;padding:15px;border-radius:4px;border:1px solid #3a3a42">
        <h4 style="color:#9146ff;margin-top:0">Analysis Results</h4>
        <div id="analysis-content" style="color:#e0e0e0;line-height:1.6"></div>
      </div>
    </div>
  </div>
  
  <div id="simulator-results" style="margin-top:20px;padding:15px;background:#1a1a1d;border:1px solid #3a3a42;border-radius:4px;display:none">
    <h3 id="simulator-title" style="color:#9146ff;margin-top:0">Simulation Results</h3>
    <div id="simulator-output" style="max-height:500px;overflow-y:auto">
      <p style="color:#999">Results will appear here...</p>
    </div>
  </div>
</div>

<script>
function showResults(title, content) {
  const results = document.getElementById('simulator-results');
  document.getElementById('simulator-title').textContent = title;
  document.getElementById('simulator-output').innerHTML = content;
  results.style.display = 'block';
  results.scrollIntoView({ behavior: 'smooth' });
}

function simulateCombat() {
  fetch('/api/rpg/simulators/combat')
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        const html = '<pre style="background:#0a0a0c;padding:12px;border-radius:4px;overflow-x:auto;color:#6ab7ff">' + 
          JSON.stringify(data.result, null, 2) + '</pre>';
        showResults('⚔️ Combat Simulation', html);
      } else {
        showResults('❌ Error', '<p style="color:#ef5350">' + (data.error || 'Unknown error') + '</p>');
      }
    })
    .catch(err => showResults('❌ Error', '<p style="color:#ef5350">' + err.message + '</p>'));
}

function simulateQuest() {
  fetch('/api/rpg/simulators/quest')
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        const html = '<pre style="background:#0a0a0c;padding:12px;border-radius:4px;overflow-x:auto;color:#6ab7ff">' + 
          JSON.stringify(data.result, null, 2) + '</pre>';
        showResults('⚔️ Quest Simulation', html);
      } else {
        showResults('❌ Error', '<p style="color:#ef5350">' + (data.error || 'Unknown error') + '</p>');
      }
    })
    .catch(err => showResults('❌ Error', '<p style="color:#ef5350">' + err.message + '</p>'));
}

function simulateWorldState() {
  fetch('/api/rpg/simulators/world')
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        const html = '<pre style="background:#0a0a0c;padding:12px;border-radius:4px;overflow-x:auto;color:#6ab7ff">' + 
          JSON.stringify(data.result, null, 2) + '</pre>';
        showResults('🌍 World State Simulation', html);
      } else {
        showResults('❌ Error', '<p style="color:#ef5350">' + (data.error || 'Unknown error') + '</p>');
      }
    })
    .catch(err => showResults('❌ Error', '<p style="color:#ef5350">' + err.message + '</p>'));
}

function testFlags() {
  fetch('/api/rpg/simulators/flags')
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        const html = '<pre style="background:#0a0a0c;padding:12px;border-radius:4px;overflow-x:auto;color:#6ab7ff">' + 
          JSON.stringify(data.result, null, 2) + '</pre>';
        showResults('🚩 Flag Test Results', html);
      } else {
        showResults('❌ Error', '<p style="color:#ef5350">' + (data.error || 'Unknown error') + '</p>');
      }
    })
    .catch(err => showResults('❌ Error', '<p style="color:#ef5350">' + err.message + '</p>'));
}

function openLevelAnalyzer() {
  const analyzer = document.getElementById('level-analyzer');
  analyzer.style.display = 'block';
  analyzer.scrollIntoView({ behavior: 'smooth' });
  
  // Load quests
  fetch('/api/rpg/quests')
    .then(r => r.json())
    .then(data => {
      if (data.quests && data.quests.length > 0) {
        const select = document.getElementById('analysisQuest');
        select.innerHTML = '<option value="">Choose a quest...</option>';
        data.quests.forEach(quest => {
          const option = document.createElement('option');
          option.value = JSON.stringify(quest);
          option.textContent = quest.name + ' (Lvl ' + quest.minLevel + ')';
          select.appendChild(option);
        });
      } else {
        const select = document.getElementById('analysisQuest');
        select.innerHTML = '<option value="">No quests found</option>';
        console.error('No quests loaded from API', data);
      }
    })
    .catch(err => {
      console.error('Failed to load quests:', err);
      const select = document.getElementById('analysisQuest');
      select.innerHTML = '<option value="">Error loading quests</option>';
    });
}

function analyzeLevel() {
  const level = parseInt(document.getElementById('analysisLevel').value);
  const questData = document.getElementById('analysisQuest').value;
  const weaponId = document.getElementById('analysisWeapon').value;
  
  if (!questData) {
    alert('Please select a quest');
    return;
  }
  
  const quest = JSON.parse(questData);
  
  fetch('/api/rpg/analyze-level', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ level, quest, weaponId: weaponId || null })
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        displayAnalysisResults(data.analysis);
      } else {
        alert('Error: ' + (data.error || 'Unknown error'));
      }
    })
    .catch(err => alert('Error: ' + err.message));
}

function displayAnalysisResults(analysis) {
  const content = document.getElementById('analysis-content');
  const results = document.getElementById('analysis-results');
  
  let html = '<table style="width:100%;border-collapse:collapse">';
  html += '<tr style="background:#2a2f3a"><td style="padding:8px;border:1px solid #3a3a42;color:#9146ff"><strong>Stat</strong></td><td style="padding:8px;border:1px solid #3a3a42;color:#9146ff"><strong>Value</strong></td></tr>';
  
  // Player stats
  html += '<tr><td colspan="2" style="padding:10px;border:1px solid #3a3a42;background:#1f2a1f;color:#b0b0b0"><strong>📊 Player Stats at Level ' + analysis.playerLevel + '</strong></td></tr>';
  html += '<tr><td style="padding:8px;border:1px solid #3a3a42">Health</td><td style="padding:8px;border:1px solid #3a3a42;color:#57f287">' + analysis.playerStats.health + '</td></tr>';
  html += '<tr><td style="padding:8px;border:1px solid #3a3a42">Attack Power</td><td style="padding:8px;border:1px solid #3a3a42;color:#57f287">' + analysis.playerStats.attackPower + '</td></tr>';
  html += '<tr><td style="padding:8px;border:1px solid #3a3a42">Defense</td><td style="padding:8px;border:1px solid #3a3a42;color:#57f287">' + analysis.playerStats.defense + '</td></tr>';
  html += '<tr><td style="padding:8px;border:1px solid #3a3a42">Critical Chance</td><td style="padding:8px;border:1px solid #3a3a42;color:#57f287">' + (analysis.playerStats.critChance * 100).toFixed(1) + '%</td></tr>';
  
  // Quest stat rewards
  if (analysis.completedQuestsBelow && analysis.completedQuestsBelow > 0) {
    html += '<tr><td colspan="2" style="padding:10px;border:1px solid #3a3a42;background:#1f2a1f;color:#b0b0b0"><strong>🎁 Bonuses from ' + analysis.completedQuestsBelow + ' Quest(s) Below This Level</strong></td></tr>';
    if (Object.keys(analysis.questStatRewards).length > 0) {
      Object.entries(analysis.questStatRewards).forEach(([stat, value]) => {
        if (value > 0) {
          html += '<tr><td style="padding:8px;border:1px solid #3a3a42">' + stat.charAt(0).toUpperCase() + stat.slice(1) + '</td><td style="padding:8px;border:1px solid #3a3a42;color:#57f287">+' + value + '</td></tr>';
        }
      });
    } else {
      html += '<tr><td colspan="2" style="padding:8px;border:1px solid #3a3a42">No stat rewards from quests</td></tr>';
    }
  }
  
  // Enemy stats
  html += '<tr><td colspan="2" style="padding:10px;border:1px solid #3a3a42;background:#2a1a1a;color:#b0b0b0"><strong>⚔️ Quest Requirements</strong></td></tr>';
  html += '<tr><td style="padding:8px;border:1px solid #3a3a42">Quest Name</td><td style="padding:8px;border:1px solid #3a3a42;color:#9aa4ff"><strong>' + analysis.quest.name + '</strong></td></tr>';
  html += '<tr><td style="padding:8px;border:1px solid #3a3a42">Recommended Level</td><td style="padding:8px;border:1px solid #3a3a42;color:#ffca28">' + analysis.quest.minLevel + '</td></tr>';
  if (analysis.quest.type === 'combat' && analysis.enemyStats) {
    html += '<tr><td style="padding:8px;border:1px solid #3a3a42">Enemy Health</td><td style="padding:8px;border:1px solid #3a3a42;color:#ef5350">' + analysis.enemyStats.health + '</td></tr>';
    html += '<tr><td style="padding:8px;border:1px solid #3a3a42">Enemy Attack</td><td style="padding:8px;border:1px solid #3a3a42;color:#ef5350">' + analysis.enemyStats.attackPower + '</td></tr>';
    html += '<tr><td style="padding:8px;border:1px solid #3a3a42">Enemy Defense</td><td style="padding:8px;border:1px solid #3a3a42;color:#ef5350">' + analysis.enemyStats.defense + '</td></tr>';
  }
  
  // Difficulty assessment
  html += '<tr><td colspan="2" style="padding:10px;border:1px solid #3a3a42;background:#1a1f2a;color:#b0b0b0"><strong>📈 Difficulty Assessment</strong></td></tr>';
  const difficulty = analysis.difficulty;
  const diffColor = difficulty === 'Too Easy' ? '#57f287' : (difficulty === 'Moderate' ? '#ffca28' : '#ef5350');
  html += '<tr><td style="padding:8px;border:1px solid #3a3a42">Difficulty</td><td style="padding:8px;border:1px solid #3a3a42;color:' + diffColor + '"><strong>' + difficulty + '</strong></td></tr>';
  html += '<tr><td style="padding:8px;border:1px solid #3a3a42">Expected Outcome</td><td style="padding:8px;border:1px solid #3a3a42;color:#6ab7ff">' + analysis.outcome + '</td></tr>';
  
  if (analysis.damageComparison) {
    html += '<tr><td style="padding:8px;border:1px solid #3a3a42">Player DPS</td><td style="padding:8px;border:1px solid #3a3a42;color:#57f287">' + analysis.damageComparison.playerDPS.toFixed(2) + '</td></tr>';
    if (analysis.enemyStats) {
      html += '<tr><td style="padding:8px;border:1px solid #3a3a42">Enemy DPS</td><td style="padding:8px;border:1px solid #3a3a42;color:#ef5350">' + analysis.damageComparison.enemyDPS.toFixed(2) + '</td></tr>';
      html += '<tr><td style="padding:8px;border:1px solid #3a3a42">Estimated Turns to Win</td><td style="padding:8px;border:1px solid #3a3a42;color:#9aa4ff">' + Math.ceil(analysis.damageComparison.turnsToWin) + '</td></tr>';
    }
  }
  
  // Rewards section
  if (analysis.questRewards) {
    html += '<tr><td colspan="2" style="padding:10px;border:1px solid #3a3a42;background:#1a2a1f;color:#b0b0b0"><strong>🎁 Rewards</strong></td></tr>';
    html += '<tr><td style="padding:8px;border:1px solid #3a3a42">XP Reward</td><td style="padding:8px;border:1px solid #3a3a42;color:#6ab7ff">💛 ' + analysis.questRewards.xp + ' XP</td></tr>';
    html += '<tr><td style="padding:8px;border:1px solid #3a3a42">Gold Reward</td><td style="padding:8px;border:1px solid #3a3a42;color:#ffd700">🪙 ' + analysis.questRewards.gold + ' Gold</td></tr>';
    if (analysis.questRewards.items && analysis.questRewards.items.length > 0) {
      html += '<tr><td style="padding:8px;border:1px solid #3a3a42">Items</td><td style="padding:8px;border:1px solid #3a3a42;color:#9aa4ff">📦 ' + analysis.questRewards.items.length + ' item(s)</td></tr>';
    }
  }
  
  // Value assessment
  if (analysis.rewardEfficiency !== undefined) {
    html += '<tr><td colspan="2" style="padding:10px;border:1px solid #3a3a42;background:#2a1f1a;color:#b0b0b0"><strong>💰 Value Assessment</strong></td></tr>';
    html += '<tr><td style="padding:8px;border:1px solid #3a3a42">Reward Efficiency</td><td style="padding:8px;border:1px solid #3a3a42;color:#ffca28">' + analysis.rewardEfficiency + '</td></tr>';
    html += '<tr><td style="padding:8px;border:1px solid #3a3a42">Overall Value</td><td style="padding:8px;border:1px solid #3a3a42;color:#ffca28"><strong>' + analysis.valueAssessment + '</strong></td></tr>';
  }
  
  html += '</table>';
  
  content.innerHTML = html;
  results.style.display = 'block';
}
</script>
`;
}

export function renderRPGEntitiesTab() {
  return `
<div class="card">
  <h2>👥 Entities Editor</h2>
  <p style="color:#b0b0b0">Create and manage Classes, Skills, Items, and Professions</p>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-top:15px">
    <div style="background:#2a2f3a;padding:15px;border-radius:6px;border:1px solid #3a3a42">
      <div style="font-weight:bold;color:#e0e0e0">📚 Classes</div>
      <p style="font-size:13px;color:#999;margin:8px 0">Define playable character classes</p>
      <button class="small" onclick="manageClasses()" style="width:100%;margin-top:8px">✏️ Manage Classes</button>
    </div>
    <div style="background:#2a2f3a;padding:15px;border-radius:6px;border:1px solid #3a3a42">
      <div style="font-weight:bold;color:#e0e0e0">⚡ Skills</div>
      <p style="font-size:13px;color:#999;margin:8px 0">Define skills and abilities</p>
      <button class="small" onclick="manageSkills()" style="width:100%;margin-top:8px">✏️ Manage Skills</button>
    </div>
    <div style="background:#2a2f3a;padding:15px;border-radius:6px;border:1px solid #3a3a42">
      <div style="font-weight:bold;color:#e0e0e0">🎁 Items</div>
      <p style="font-size:13px;color:#999;margin:8px 0">Create equipment and inventory items</p>
      <button class="small" onclick="manageItems()" style="width:100%;margin-top:8px">✏️ Manage Items</button>
    </div>
    <div style="background:#2a2f3a;padding:15px;border-radius:6px;border:1px solid #3a3a42">
      <div style="font-weight:bold;color:#e0e0e0">💼 Professions</div>
      <p style="font-size:13px;color:#999;margin:8px 0">Define character professions and trades</p>
      <button class="small" onclick="manageProfessions()" style="width:100%;margin-top:8px">✏️ Manage Professions</button>
    </div>
  </div>
</div>

<script>
function manageClasses() { alert('📚 Classes management coming soon!'); }
function manageSkills() { alert('⚡ Skills management coming soon!'); }
function manageItems() { alert('🎁 Items management coming soon!'); }
function manageProfessions() { alert('💼 Professions management coming soon!'); }
</script>
`;
}

export function renderRPGSystemsTab() {
  return `
<div class="card">
  <h2>⚙️ Game Systems</h2>
  <p style="color:#b0b0b0">Configure core game systems and mechanics</p>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px;margin-top:15px">
    <div style="background:#2a2f3a;padding:15px;border-radius:6px;border:1px solid #3a3a42">
      <div style="font-weight:bold;color:#e0e0e0">🏆 Leveling System</div>
      <p style="font-size:13px;color:#999;margin:8px 0">EXP curves, level caps, progression</p>
      <button class="small" onclick="configureLeveling()" style="width:100%;margin-top:8px">⚙️ Configure</button>
    </div>
    <div style="background:#2a2f3a;padding:15px;border-radius:6px;border:1px solid #3a3a42">
      <div style="font-weight:bold;color:#e0e0e0">💰 Economy</div>
      <p style="font-size:13px;color:#999;margin:8px 0">Currency, prices, shops, vendors</p>
      <button class="small" onclick="configureEconomy()" style="width:100%;margin-top:8px">⚙️ Configure</button>
    </div>
    <div style="background:#2a2f3a;padding:15px;border-radius:6px;border:1px solid #3a3a42">
      <div style="font-weight:bold;color:#e0e0e0">🎯 Combat Mechanics</div>
      <p style="font-size:13px;color:#999;margin:8px 0">Damage, resistance, critical hits</p>
      <button class="small" onclick="configureCombat()" style="width:100%;margin-top:8px">⚙️ Configure</button>
    </div>
    <div style="background:#2a2f3a;padding:15px;border-radius:6px;border:1px solid #3a3a42">
      <div style="font-weight:bold;color:#e0e0e0">🎒 Inventory</div>
      <p style="font-size:13px;color:#999;margin:8px 0">Slots, weight, stacking rules</p>
      <button class="small" onclick="configureInventory()" style="width:100%;margin-top:8px">⚙️ Configure</button>
    </div>
  </div>
</div>

<script>
function configureLeveling() { alert('🏆 Leveling configuration coming soon!'); }
function configureEconomy() { alert('💰 Economy configuration coming soon!'); }
function configureCombat() { alert('🎯 Combat configuration coming soon!'); }
function configureInventory() { alert('🎒 Inventory configuration coming soon!'); }
</script>
`;
}

export function renderRPGAITab() {
  return `
<div class="card">
  <h2>🤖 AI & Combat Editor</h2>
  <p style="color:#b0b0b0">Configure AI behavior profiles and combat settings</p>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-top:15px">
    <div>
      <h3 style="color:#9146ff">AI Behavior Profiles</h3>
      <div style="background:#1a1a1d;padding:10px;border:1px solid #3a3a42;border-radius:4px;margin-bottom:8px">
        <div style="padding:10px;background:#2a2f3a;border-radius:4px;margin-bottom:6px">
          <div style="font-weight:bold;color:#e0e0e0">⚔️ Aggressive</div>
          <div style="font-size:12px;color:#999">High risk, offensive tactics</div>
        </div>
        <div style="padding:10px;background:#2a2f3a;border-radius:4px;margin-bottom:6px">
          <div style="font-weight:bold;color:#e0e0e0">🛡️ Defensive</div>
          <div style="font-size:12px;color:#999">Low risk, protective stance</div>
        </div>
        <div style="padding:10px;background:#2a2f3a;border-radius:4px;margin-bottom:6px">
          <div style="font-weight:bold;color:#e0e0e0">🎯 Balanced</div>
          <div style="font-size:12px;color:#999">Mixed offense and defense</div>
        </div>
        <div style="padding:10px;background:#2a2f3a;border-radius:4px;margin-bottom:6px">
          <div style="font-weight:bold;color:#e0e0e0">💚 Healer</div>
          <div style="font-size:12px;color:#999">Support and healing priority</div>
        </div>
        <div style="padding:10px;background:#2a2f3a;border-radius:4px;">
          <div style="font-weight:bold;color:#e0e0e0">💨 Evasive</div>
          <div style="font-size:12px;color:#999">Speed and avoidance focused</div>
        </div>
      </div>
    </div>
    <div>
      <h3 style="color:#9146ff">Combat Settings</h3>
      <div style="background:#1a1a1d;padding:12px;border:1px solid #3a3a42;border-radius:4px">
        <label style="display:block;margin-bottom:10px;color:#b0b0b0">
          <input type="checkbox" style="margin-right:8px">Crit Damage Enabled
        </label>
        <label style="display:block;margin-bottom:10px;color:#b0b0b0">
          <input type="checkbox" style="margin-right:8px">Elemental Effects
        </label>
        <label style="display:block;margin-bottom:10px;color:#b0b0b0">
          <input type="checkbox" style="margin-right:8px">Status Effects
        </label>
        <label style="display:block;margin-bottom:10px;color:#b0b0b0">
          <input type="checkbox" style="margin-right:8px">Skill Synergies
        </label>
        <button class="small" style="width:100%;margin-top:8px">💾 Save AI Settings</button>
      </div>
    </div>
  </div>
</div>
`;
}

export function renderRPGFlagsTab() {
  return `
<div class="card">
  <h2>🚩 Flags & Modifiers</h2>
  <p style="color:#b0b0b0">Manage global flags and modifier stacks</p>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-top:15px">
    <div>
      <h3 style="color:#9146ff">📋 Global Flags</h3>
      <div style="background:#1a1a1d;padding:12px;border:1px solid #3a3a42;border-radius:4px;max-height:400px;overflow-y:auto">
        <div id="flags-list">
          <p style="color:#999">Loading flags...</p>
        </div>
      </div>
      <button class="small" style="width:100%;margin-top:8px;background:#4caf50" onclick="createFlag()">➕ Create Flag</button>
    </div>
    <div>
      <h3 style="color:#9146ff">📊 Modifier Stacks</h3>
      <div style="background:#1a1a1d;padding:12px;border:1px solid #3a3a42;border-radius:4px;max-height:400px;overflow-y:auto">
        <div id="modifiers-list">
          <p style="color:#999">Loading modifiers...</p>
        </div>
      </div>
      <button class="small" style="width:100%;margin-top:8px;background:#4caf50" onclick="createModifier()">➕ Create Modifier</button>
    </div>
  </div>
</div>

<script>
function loadFlags() {
  fetch('/api/rpg/flags')
    .then(r => r.json())
    .then(data => {
      const list = document.getElementById('flags-list');
      if (!data.flags || data.flags.length === 0) {
        list.innerHTML = '<p style="color:#999">No custom flags yet</p>';
      } else {
        list.innerHTML = data.flags.map(f => \`
          <div style="padding:8px;background:#2a2f3a;border-radius:4px;margin-bottom:6px;font-size:12px">
            <div style="font-weight:bold;color:#e0e0e0">\${f.name}</div>
            <div style="color:#999">\${f.description || 'No description'}</div>
          </div>
        \`).join('');
      }
    })
    .catch(() => {
      document.getElementById('flags-list').innerHTML = '<p style="color:#ef5350">Error loading flags</p>';
    });
}

function createFlag() { alert('🚩 Create flag feature coming soon!'); }
function createModifier() { alert('📊 Create modifier feature coming soon!'); }

loadFlags();
</script>
`;
}

export function renderRPGGuildTab() {
  return `
<div class="card">
  <h2>🏛️ Adventurers Guild Management</h2>
  <p style="color:#b0b0b0">Manage daily, weekly, and limited quests, bounties, and guild ranks</p>
  <button class="primary" onclick="showQuestScheduleCalendar()" style="margin-top:10px">📅 View Quest Schedule</button>
</div>

<div class="card">
  <h3>📅 Daily Quests</h3>
  <p style="color:#888;font-size:13px">Reset every 24 hours • Available to all guild members</p>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin:10px 0">
    <button class="small" onclick="quickAddQuest('daily', 'kill')" title="Quick: Kill enemies">⚔️ Kill Quest</button>
    <button class="small" onclick="quickAddQuest('daily', 'gather')" title="Quick: Gather resources">🌿 Gather Quest</button>
    <button class="small" onclick="quickAddQuest('daily', 'craft')" title="Quick: Craft items">🔨 Craft Quest</button>
    <button class="small" onclick="quickAddQuest('daily', 'explore')" title="Quick: Explore">🗺️ Explore Quest</button>
  </div>
  <div id="dailyQuestsList" style="margin-top:15px"></div>
  <button class="primary" onclick="showAddQuestModal('daily')" style="margin-top:15px">➕ Add Daily Quest (Custom)</button>
</div>

<div class="card">
  <h3>📆 Weekly Quests</h3>
  <p style="color:#888;font-size:13px">Reset every 7 days • Higher rewards and difficulty</p>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin:10px 0">
    <button class="small" onclick="quickAddQuest('weekly', 'kill')" title="Quick: Kill enemies">⚔️ Boss Hunt</button>
    <button class="small" onclick="quickAddQuest('weekly', 'gather')" title="Quick: Gather resources">🏔️ Ore Run</button>
    <button class="small" onclick="quickAddQuest('weekly', 'explore')" title="Quick: Explore">🌍 Expedition</button>
    <button class="small" onclick="showAddQuestModal('weekly')" title="Custom quest">✏️ Custom</button>
  </div>
  <div id="weeklyQuestsList" style="margin-top:15px"></div>
  <button class="primary" onclick="showAddQuestModal('weekly')" style="margin-top:15px">➕ Add Weekly Quest (Custom)</button>
</div>

<div class="card">
  <h3>⏳ Limited Quests</h3>
  <p style="color:#888;font-size:13px">First-come first-served • Limited number of claims</p>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin:10px 0">
    <button class="small" onclick="quickAddQuest('limited', 'kill')" title="Quick: Limited boss">💀 Boss Raid</button>
    <button class="small" onclick="quickAddQuest('limited', 'gather')" title="Quick: Limited gather">💎 Treasure Hunt</button>
    <button class="small" onclick="showAddQuestModal('limited')" title="Custom quest">✏️ Custom</button>
  </div>
  <div id="limitedQuestsList" style="margin-top:15px"></div>
  <button class="primary" onclick="showAddQuestModal('limited')" style="margin-top:15px">➕ Add Limited Quest (Custom)</button>
</div>

<div class="card">
  <h3>💰 Bounty Board</h3>
  <p style="color:#888;font-size:13px">Player and NPC bounties</p>
  <div id="bountiesList" style="margin-top:15px"></div>
  <button class="primary" onclick="showAddBountyModal()" style="margin-top:15px">➕ Add Bounty</button>
</div>

<!-- Quest Modal -->
<div id="questModal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:1000;align-items:center;justify-content:center">
  <div style="background:#1e1e1e;padding:30px;border-radius:8px;width:90%;max-width:600px;max-height:90vh;overflow-y:auto">
    <h3 id="questModalTitle">Add Quest</h3>
    <form id="questForm" onsubmit="saveQuest(event)">
      <input type="hidden" id="questType">
      <input type="hidden" id="questId">
      
      <label>Quest ID:</label>
      <input type="text" id="questIdInput" required style="width:100%;padding:8px;margin-bottom:15px;background:#2a2a2a;border:1px solid #444;color:#fff;border-radius:4px">
      
      <label>Title:</label>
      <input type="text" id="questTitle" required style="width:100%;padding:8px;margin-bottom:15px;background:#2a2a2a;border:1px solid #444;color:#fff;border-radius:4px">
      
      <label>Description:</label>
      <textarea id="questDescription" required rows="3" style="width:100%;padding:8px;margin-bottom:15px;background:#2a2a2a;border:1px solid #444;color:#fff;border-radius:4px"></textarea>
      
      <label>Objective Type:</label>
      <select id="questObjectiveType" style="width:100%;padding:8px;margin-bottom:15px;background:#2a2a2a;border:1px solid #444;color:#fff;border-radius:4px">
        <option value="kill">Kill Enemies</option>
        <option value="gather">Gather Resources</option>
        <option value="explore">Explore Locations</option>
        <option value="craft">Craft Items</option>
        <option value="deliver">Deliver Items</option>
      </select>
      
      <label>Target:</label>
      <input type="text" id="questTarget" required placeholder="e.g., goblin, iron_ore, ancient_ruins" style="width:100%;padding:8px;margin-bottom:15px;background:#2a2a2a;border:1px solid #444;color:#fff;border-radius:4px">
      
      <label>Count Required:</label>
      <input type="number" id="questCount" required min="1" value="1" style="width:100%;padding:8px;margin-bottom:15px;background:#2a2a2a;border:1px solid #444;color:#fff;border-radius:4px">
      
      <label>Minimum Rank:</label>
      <select id="questMinRank" style="width:100%;padding:8px;margin-bottom:15px;background:#2a2a2a;border:1px solid #444;color:#fff;border-radius:4px">
        <option value="F">F Rank</option>
        <option value="E">E Rank</option>
        <option value="D">D Rank</option>
        <option value="C">C Rank</option>
        <option value="B">B Rank</option>
        <option value="A">A Rank</option>
        <option value="S">S Rank</option>
      </select>
      
      <label>Gold Reward:</label>
      <input type="number" id="questGoldReward" required min="0" value="100" style="width:100%;padding:8px;margin-bottom:15px;background:#2a2a2a;border:1px solid #444;color:#fff;border-radius:4px">
      
      <label>Guild XP Reward:</label>
      <input type="number" id="questXPReward" required min="0" value="50" style="width:100%;padding:8px;margin-bottom:15px;background:#2a2a2a;border:1px solid #444;color:#fff;border-radius:4px">
      
      <label>Item Rewards (comma-separated item IDs, optional):</label>
      <input type="text" id="questItemRewards" placeholder="e.g., iron_sword, health_potion, rare_gem" style="width:100%;padding:8px;margin-bottom:15px;background:#2a2a2a;border:1px solid #444;color:#fff;border-radius:4px">
      <small style="color:#aaa;display:block;margin-top:-10px;margin-bottom:15px">Format: item_id:quantity, item_id:quantity (e.g., iron_sword:1, health_potion:5)</small>
      
      <div id="limitedQuestFields" style="display:none">
        <label>Max Claims:</label>
        <input type="number" id="questMaxClaims" min="1" value="10" style="width:100%;padding:8px;margin-bottom:15px;background:#2a2a2a;border:1px solid #444;color:#fff;border-radius:4px">
        
        <label>Available Until (optional):</label>
        <input type="datetime-local" id="questExpiresAt" style="width:100%;padding:8px;margin-bottom:15px;background:#2a2a2a;border:1px solid #444;color:#fff;border-radius:4px">
      </div>
      
      <div style="display:flex;gap:10px;margin-top:20px">
        <button type="submit" class="primary" style="flex:1">💾 Save Quest</button>
        <button type="button" class="secondary" onclick="closeQuestModal()" style="flex:1">❌ Cancel</button>
      </div>
    </form>
  </div>
</div>

<!-- Bounty Modal -->
<div id="bountyModal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:1000;align-items:center;justify-content:center">
  <div style="background:#1e1e1e;padding:30px;border-radius:8px;width:90%;max-width:600px;max-height:90vh;overflow-y:auto">
    <h3>Add Bounty</h3>
    <form id="bountyForm" onsubmit="saveBounty(event)">
      <input type="hidden" id="bountyId">
      
      <label>Bounty Type:</label>
      <select id="bountyType" onchange="toggleBountyFields()" style="width:100%;padding:8px;margin-bottom:15px;background:#2a2a2a;border:1px solid #444;color:#fff;border-radius:4px">
        <option value="npc">NPC Bounty</option>
        <option value="player">Player Bounty</option>
      </select>
      
      <div id="npcBountyFields">
        <label>Target Name:</label>
        <input type="text" id="bountyTargetName" required placeholder="e.g., Bandit Leader" style="width:100%;padding:8px;margin-bottom:15px;background:#2a2a2a;border:1px solid #444;color:#fff;border-radius:4px">
        
        <label>Description:</label>
        <textarea id="bountyDescription" required rows="3" style="width:100%;padding:8px;margin-bottom:15px;background:#2a2a2a;border:1px solid #444;color:#fff;border-radius:4px"></textarea>
        
        <label>Minimum Rank:</label>
        <select id="bountyMinRank" style="width:100%;padding:8px;margin-bottom:15px;background:#2a2a2a;border:1px solid #444;color:#fff;border-radius:4px">
          <option value="F">F Rank</option>
          <option value="E">E Rank</option>
          <option value="D">D Rank</option>
          <option value="C">C Rank</option>
          <option value="B">B Rank</option>
          <option value="A">A Rank</option>
          <option value="S">S Rank</option>
        </select>
        
        <label>Gold Reward:</label>
        <input type="number" id="bountyReward" required min="0" value="500" style="width:100%;padding:8px;margin-bottom:15px;background:#2a2a2a;border:1px solid #444;color:#fff;border-radius:4px">
      </div>
      
      <div id="playerBountyFields" style="display:none">
        <label>Target Player ID:</label>
        <input type="text" id="bountyTargetId" placeholder="Discord User ID" style="width:100%;padding:8px;margin-bottom:15px;background:#2a2a2a;border:1px solid #444;color:#fff;border-radius:4px">
        
        <label>Reason:</label>
        <textarea id="bountyReason" rows="2" style="width:100%;padding:8px;margin-bottom:15px;background:#2a2a2a;border:1px solid #444;color:#fff;border-radius:4px"></textarea>
      </div>
      
      <div style="display:flex;gap:10px;margin-top:20px">
        <button type="submit" class="primary" style="flex:1">💾 Save Bounty</button>
        <button type="button" class="secondary" onclick="closeBountyModal()" style="flex:1">❌ Cancel</button>
      </div>
    </form>
  </div>
</div>

<script>
let guildQuests = { daily: [], weekly: [], limited: [] };
let guildBounties = [];

// Load guild data
async function loadGuildData() {
  try {
    const [questsRes, bountiesRes] = await Promise.all([
      fetch('/api/rpg/guild/quests'),
      fetch('/api/rpg/guild/bounties')
    ]);
    
    if (questsRes.ok) guildQuests = await questsRes.json();
    if (bountiesRes.ok) guildBounties = await bountiesRes.json();
    
    renderDailyQuests();
    renderWeeklyQuests();
    renderLimitedQuests();
    renderBounties();
  } catch (error) {
    console.error('Error loading guild data:', error);
  }
}

function renderDailyQuests() {
  const container = document.getElementById('dailyQuestsList');
  if (!guildQuests.daily || guildQuests.daily.length === 0) {
    container.innerHTML = '<p style="color:#888">No daily quests configured</p>';
    return;
  }
  
  container.innerHTML = guildQuests.daily.map(quest => \`
    <div style="background:#2a2f3a;padding:15px;border-radius:6px;border:1px solid #3a3a42;margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:start">
        <div style="flex:1">
          <div style="font-weight:bold;color:#4da6ff;margin-bottom:5px">\${quest.title}</div>
          <div style="color:#999;font-size:13px;margin-bottom:8px">\${quest.description}</div>
          <div style="display:flex;gap:15px;font-size:12px;color:#b0b0b0">
            <span>📋 \${quest.objective.type}: \${quest.objective.target} (\${quest.objective.count})</span>
            <span>🎖️ Min Rank: \${quest.minRank}</span>
            <span>💰 \${quest.rewards.gold}g</span>
            <span>⭐ \${quest.rewards.guildXP} XP</span>
          </div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="small" onclick="editQuest('daily', '\${quest.id}')">✏️</button>
          <button class="small danger" onclick="deleteQuest('daily', '\${quest.id}')">🗑️</button>
        </div>
      </div>
    </div>
  \`).join('');
}

function renderWeeklyQuests() {
  const container = document.getElementById('weeklyQuestsList');
  if (!guildQuests.weekly || guildQuests.weekly.length === 0) {
    container.innerHTML = '<p style="color:#888">No weekly quests configured</p>';
    return;
  }
  
  container.innerHTML = guildQuests.weekly.map(quest => \`
    <div style="background:#2a2f3a;padding:15px;border-radius:6px;border:1px solid #3a3a42;margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:start">
        <div style="flex:1">
          <div style="font-weight:bold;color:#9d4edd;margin-bottom:5px">\${quest.title}</div>
          <div style="color:#999;font-size:13px;margin-bottom:8px">\${quest.description}</div>
          <div style="display:flex;gap:15px;font-size:12px;color:#b0b0b0">
            <span>📋 \${quest.objective.type}: \${quest.objective.target} (\${quest.objective.count})</span>
            <span>🎖️ Min Rank: \${quest.minRank}</span>
            <span>💰 \${quest.rewards.gold}g</span>
            <span>⭐ \${quest.rewards.guildXP} XP</span>
          </div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="small" onclick="editQuest('weekly', '\${quest.id}')">✏️</button>
          <button class="small danger" onclick="deleteQuest('weekly', '\${quest.id}')">🗑️</button>
        </div>
      </div>
    </div>
  \`).join('');
}

function renderLimitedQuests() {
  const container = document.getElementById('limitedQuestsList');
  if (!guildQuests.limited || guildQuests.limited.length === 0) {
    container.innerHTML = '<p style="color:#888">No limited quests configured</p>';
    return;
  }
  
  container.innerHTML = guildQuests.limited.map(quest => {
    const claimProgress = \`\${quest.claimedCount || 0}/\${quest.maxClaims}\`;
    const isExpired = quest.expiresAt && new Date(quest.expiresAt) < new Date();
    const expiryText = quest.expiresAt ? \`Expires: \${new Date(quest.expiresAt).toLocaleDateString()}\` : 'No expiry';
    
    return \`
      <div style="background:#2a2f3a;padding:15px;border-radius:6px;border:1px solid #3a3a42;margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;align-items:start">
          <div style="flex:1">
            <div style="font-weight:bold;color:#f72585;margin-bottom:5px">\${quest.title} \${isExpired ? '<span style="color:#ff6b6b">(EXPIRED)</span>' : ''}</div>
            <div style="color:#999;font-size:13px;margin-bottom:8px">\${quest.description}</div>
            <div style="display:flex;gap:15px;font-size:12px;color:#b0b0b0">
              <span>📋 \${quest.objective.type}: \${quest.objective.target} (\${quest.objective.count})</span>
              <span>🎖️ Min Rank: \${quest.minRank}</span>
              <span>💰 \${quest.rewards.gold}g</span>
              <span>⭐ \${quest.rewards.guildXP} XP</span>
            </div>
            <div style="margin-top:8px;font-size:12px;color:#b0b0b0">
              <span>📊 Claims: \${claimProgress}</span> • <span>\${expiryText}</span>
            </div>
          </div>
          <div style="display:flex;gap:8px">
            <button class="small" onclick="editQuest('limited', '\${quest.id}')">✏️</button>
            <button class="small danger" onclick="deleteQuest('limited', '\${quest.id}')">🗑️</button>
          </div>
        </div>
      </div>
    \`;
  }).join('');
}

function renderBounties() {
  const container = document.getElementById('bountiesList');
  if (!guildBounties || guildBounties.length === 0) {
    container.innerHTML = '<p style="color:#888">No bounties available</p>';
    return;
  }
  
  container.innerHTML = guildBounties.map(bounty => {
    const isPlayerBounty = bounty.type === 'player';
    const statusColor = bounty.status === 'active' ? '#4ade80' : bounty.status === 'claimed' ? '#fbbf24' : '#999';
    
    return \`
      <div style="background:#2a2f3a;padding:15px;border-radius:6px;border:1px solid #3a3a42;margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;align-items:start">
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:5px">
              <span style="font-weight:bold;color:#ffd700">\${isPlayerBounty ? '👤 Player' : '💀 NPC'}: \${bounty.targetName || bounty.targetId}</span>
              <span style="color:\${statusColor};font-size:12px;text-transform:uppercase">\${bounty.status}</span>
            </div>
            <div style="color:#999;font-size:13px;margin-bottom:8px">\${bounty.description || bounty.reason || 'No description'}</div>
            <div style="display:flex;gap:15px;font-size:12px;color:#b0b0b0">
              \${!isPlayerBounty ? \`<span>🎖️ Min Rank: \${bounty.minRank}</span>\` : ''}
              <span>💰 Reward: \${bounty.reward}g</span>
              \${bounty.claimedBy ? \`<span>👤 Claimed by: \${bounty.claimedBy}</span>\` : ''}
            </div>
          </div>
          <div style="display:flex;gap:8px">
            <button class="small" onclick="editBounty('\${bounty.id}')">✏️</button>
            <button class="small danger" onclick="deleteBounty('\${bounty.id}')">🗑️</button>
          </div>
        </div>
      </div>
    \`;
  }).join('');
}

// Quest Modal Functions
function showAddQuestModal(type) {
  document.getElementById('questModalTitle').textContent = \`Add \${type.charAt(0).toUpperCase() + type.slice(1)} Quest\`;
  document.getElementById('questType').value = type;
  document.getElementById('questId').value = '';
  document.getElementById('questForm').reset();
  document.getElementById('limitedQuestFields').style.display = type === 'limited' ? 'block' : 'none';
  document.getElementById('questModal').style.display = 'flex';
}

// Helper to parse item rewards from input string
function parseItemRewards(itemString) {
  if (!itemString || !itemString.trim()) return [];
  
  const items = itemString.split(',').map(str => str.trim()).filter(Boolean);
  return items.map(item => {
    const [id, qty] = item.split(':');
    return {
      id: id.trim(),
      quantity: qty ? parseInt(qty.trim()) : 1
    };
  });
}

// Helper to format item rewards for display
function formatItemRewards(items) {
  if (!items || items.length === 0) return '';
  return items.map(item => \`\${item.id}:\${item.quantity || 1}\`).join(', ');
}

function editQuest(type, questId) {
  const quest = guildQuests[type].find(q => q.id === questId);
  if (!quest) return;
  
  document.getElementById('questModalTitle').textContent = \`Edit \${type.charAt(0).toUpperCase() + type.slice(1)} Quest\`;
  document.getElementById('questType').value = type;
  document.getElementById('questId').value = questId;
  document.getElementById('questIdInput').value = quest.id;
  document.getElementById('questTitle').value = quest.title;
  document.getElementById('questDescription').value = quest.description;
  document.getElementById('questObjectiveType').value = quest.objective.type;
  document.getElementById('questTarget').value = quest.objective.target;
  document.getElementById('questCount').value = quest.objective.count;
  document.getElementById('questMinRank').value = quest.minRank;
  document.getElementById('questGoldReward').value = quest.rewards.gold;
  document.getElementById('questXPReward').value = quest.rewards.guildXP;
  document.getElementById('questItemRewards').value = formatItemRewards(quest.rewards.items || []);
  
  if (type === 'limited') {
    document.getElementById('questMaxClaims').value = quest.maxClaims;
    if (quest.expiresAt) {
      const date = new Date(quest.expiresAt);
      document.getElementById('questExpiresAt').value = date.toISOString().slice(0, 16);
    }
  }
  
  document.getElementById('limitedQuestFields').style.display = type === 'limited' ? 'block' : 'none';
  document.getElementById('questModal').style.display = 'flex';
}

function closeQuestModal() {
  document.getElementById('questModal').style.display = 'none';
  document.getElementById('questForm').reset();
}

async function saveQuest(event) {
  event.preventDefault();
  
  const type = document.getElementById('questType').value;
  const questId = document.getElementById('questId').value;
  const isEditing = !!questId;
  
  const questData = {
    id: document.getElementById('questIdInput').value,
    title: document.getElementById('questTitle').value,
    description: document.getElementById('questDescription').value,
    objective: {
      type: document.getElementById('questObjectiveType').value,
      target: document.getElementById('questTarget').value,
      count: parseInt(document.getElementById('questCount').value)
    },
    minRank: document.getElementById('questMinRank').value,
    rewards: {
      gold: parseInt(document.getElementById('questGoldReward').value),
      guildXP: parseInt(document.getElementById('questXPReward').value),
      items: parseItemRewards(document.getElementById('questItemRewards').value)
    }
  };
  
  if (type === 'limited') {
    questData.maxClaims = parseInt(document.getElementById('questMaxClaims').value);
    questData.claimedCount = 0;
    const expiresAt = document.getElementById('questExpiresAt').value;
    if (expiresAt) {
      questData.expiresAt = new Date(expiresAt).toISOString();
    }
  }
  
  try {
    const url = isEditing 
      ? \`/api/rpg/guild/quests/\${type}/\${questId}\`
      : \`/api/rpg/guild/quests/\${type}\`;
    
    const method = isEditing ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(questData)
    });
    
    if (response.ok) {
      closeQuestModal();
      await loadGuildData();
    } else {
      const error = await response.json();
      alert('Error: ' + (error.message || 'Failed to save quest'));
    }
  } catch (error) {
    console.error('Error saving quest:', error);
    alert('Error: ' + error.message);
  }
}

async function deleteQuest(type, questId) {
  if (!confirm(\`Delete this \${type} quest?\`)) return;
  
  try {
    const response = await fetch(\`/api/rpg/guild/quests/\${type}/\${questId}\`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      await loadGuildData();
    } else {
      alert('Failed to delete quest');
    }
  } catch (error) {
    console.error('Error deleting quest:', error);
    alert('Error: ' + error.message);
  }
}

// Rank Buff Visualization
function showRankVisualization() {
  const ranks = ['F', 'E', 'D', 'C', 'B', 'A', 'S'];
  const rankData = {
    'F': { xp: 0, marketTax: 30, shopDiscount: 0, questXP: 0 },
    'E': { xp: 500, marketTax: 25, shopDiscount: 5, questXP: 10 },
    'D': { xp: 1500, marketTax: 20, shopDiscount: 10, questXP: 20 },
    'C': { xp: 3500, marketTax: 15, shopDiscount: 15, questXP: 30 },
    'B': { xp: 7000, marketTax: 10, shopDiscount: 20, questXP: 40 },
    'A': { xp: 12000, marketTax: 5, shopDiscount: 25, questXP: 50 },
    'S': { xp: 20000, marketTax: 0, shopDiscount: 30, questXP: 50 }
  };

  const rankCards = ranks.map(rank => {
    const data = rankData[rank];
    const colors = { 'F': '#999', 'E': '#4db8ff', 'D': '#66ff66', 'C': '#ffff33', 'B': '#ff6633', 'A': '#ff33ff', 'S': '#ffaa00' };
    const color = colors[rank];
    
    return \`
      <div style="background:linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0));padding:20px;border-radius:8px;border-left:4px solid \${color};margin-bottom:15px">
        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:15px">
          <h3 style="margin:0;color:\${color};font-size:1.2em">Rank \${rank}</h3>
          <span style="background:\${color};color:#000;padding:4px 12px;border-radius:20px;font-weight:bold">XP: \${data.xp}</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:12px">
          <div style="background:rgba(255,255,255,0.05);padding:12px;border-radius:6px">
            <div style="font-size:12px;color:#aaa">Market Tax</div>
            <div style="font-size:20px;color:#4caf50;font-weight:bold">-\${data.marketTax}%</div>
          </div>
          <div style="background:rgba(255,255,255,0.05);padding:12px;border-radius:6px">
            <div style="font-size:12px;color:#aaa">Shop Discount</div>
            <div style="font-size:20px;color:#2196f3;font-weight:bold">-\${data.shopDiscount}%</div>
          </div>
          <div style="background:rgba(255,255,255,0.05);padding:12px;border-radius:6px">
            <div style="font-size:12px;color:#aaa">Quest XP Bonus</div>
            <div style="font-size:20px;color:#ff9800;font-weight:bold">+\${data.questXP}%</div>
          </div>
        </div>
        <div style="margin-top:12px;font-size:13px;color:#aaa">
          <strong>Passive Effects:</strong> \${rank === 'S' ? 'Max rank - All bonuses capped!' : rank === 'A' ? 'Elite member status' : rank === 'B' ? 'Strong reputation' : 'Progressing...'}
        </div>
      </div>
    \`;
  }).join('');

  const modal = \`
    <div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px">
      <div style="background:#1e1e1e;padding:30px;border-radius:8px;max-width:700px;width:100%;max-height:80vh;overflow-y:auto">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <h2 style="margin:0">🎖️ Guild Rank System</h2>
          <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background:none;border:none;color:#ccc;font-size:24px;cursor:pointer">✕</button>
        </div>
        
        <div style="background:#2a2f3a;padding:15px;border-radius:6px;margin-bottom:20px">
          <p style="margin:0;color:#aaa;font-size:14px">
            <strong>Rank Progression:</strong> Complete quests and earn Guild XP to rank up. Each rank grants passive bonuses to market taxes, shop discounts, and quest rewards. S-rank is the ultimate achievement with all bonuses maxed!
          </p>
        </div>

        \${rankCards}

        <button onclick="this.parentElement.parentElement.remove()" style="width:100%;padding:12px;background:#2196f3;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:bold;margin-top:20px">Close</button>
      </div>
    </div>
  \`;
  
  document.body.insertAdjacentHTML('beforeend', modal);
}

// Bounty Modal Functions
function showAddBountyModal() {
  document.getElementById('bountyId').value = '';
  document.getElementById('bountyForm').reset();
  document.getElementById('npcBountyFields').style.display = 'block';
  document.getElementById('playerBountyFields').style.display = 'none';
  document.getElementById('bountyModal').style.display = 'flex';
}

function toggleBountyFields() {
  const type = document.getElementById('bountyType').value;
  document.getElementById('npcBountyFields').style.display = type === 'npc' ? 'block' : 'none';
  document.getElementById('playerBountyFields').style.display = type === 'player' ? 'block' : 'none';
}

function editBounty(bountyId) {
  const bounty = guildBounties.find(b => b.id === bountyId);
  if (!bounty) return;
  
  document.getElementById('bountyId').value = bountyId;
  document.getElementById('bountyType').value = bounty.type;
  toggleBountyFields();
  
  if (bounty.type === 'npc') {
    document.getElementById('bountyTargetName').value = bounty.targetName;
    document.getElementById('bountyDescription').value = bounty.description;
    document.getElementById('bountyMinRank').value = bounty.minRank;
    document.getElementById('bountyReward').value = bounty.reward;
  } else {
    document.getElementById('bountyTargetId').value = bounty.targetId;
    document.getElementById('bountyReason').value = bounty.reason || '';
  }
  
  document.getElementById('bountyModal').style.display = 'flex';
}

function closeBountyModal() {
  document.getElementById('bountyModal').style.display = 'none';
  document.getElementById('bountyForm').reset();
}

async function saveBounty(event) {
  event.preventDefault();
  
  const bountyId = document.getElementById('bountyId').value;
  const isEditing = !!bountyId;
  const type = document.getElementById('bountyType').value;
  
  const bountyData = {
    type,
    status: 'active'
  };
  
  if (type === 'npc') {
    bountyData.targetName = document.getElementById('bountyTargetName').value;
    bountyData.description = document.getElementById('bountyDescription').value;
    bountyData.minRank = document.getElementById('bountyMinRank').value;
    bountyData.reward = parseInt(document.getElementById('bountyReward').value);
  } else {
    bountyData.targetId = document.getElementById('bountyTargetId').value;
    bountyData.reason = document.getElementById('bountyReason').value;
    bountyData.reward = 0; // Player bounties set reward when created
  }
  
  try {
    const url = isEditing 
      ? \`/api/rpg/guild/bounties/\${bountyId}\`
      : '/api/rpg/guild/bounties';
    
    const method = isEditing ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bountyData)
    });
    
    if (response.ok) {
      closeBountyModal();
      await loadGuildData();
    } else {
      const error = await response.json();
      alert('Error: ' + (error.message || 'Failed to save bounty'));
    }
  } catch (error) {
    console.error('Error saving bounty:', error);
    alert('Error: ' + error.message);
  }
}

async function deleteBounty(bountyId) {
  if (!confirm('Delete this bounty?')) return;
  
  try {
    const response = await fetch(\`/api/rpg/guild/bounties/\${bountyId}\`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      await loadGuildData();
    } else {
      alert('Failed to delete bounty');
    }
  } catch (error) {
    console.error('Error deleting bounty:', error);
    alert('Error: ' + error.message);
  }
}

// Load data on page load
loadGuildData();

// Quest Schedule Calendar
function showQuestScheduleCalendar() {
  const dailyReset = new Date();
  dailyReset.setHours(24, 0, 0, 0);
  const dailyMs = dailyReset.getTime() - Date.now();
  const dailyHours = Math.floor(dailyMs / (1000 * 60 * 60));
  const dailyMins = Math.floor((dailyMs % (1000 * 60 * 60)) / (1000 * 60));

  const weeklyReset = new Date();
  weeklyReset.setDate(weeklyReset.getDate() + (7 - weeklyReset.getDay()));
  weeklyReset.setHours(0, 0, 0, 0);
  const weeklyMs = weeklyReset.getTime() - Date.now();
  const weeklyDays = Math.floor(weeklyMs / (1000 * 60 * 60 * 24));
  const weeklyHours = Math.floor((weeklyMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  const calendar = \`
    <div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px">
      <div style="background:#1e1e1e;padding:30px;border-radius:8px;max-width:600px;width:100%;max-height:80vh;overflow-y:auto">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <h2 style="margin:0">📅 Quest Schedule</h2>
          <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background:none;border:none;color:#ccc;font-size:24px;cursor:pointer">✕</button>
        </div>
        
        <div style="background:#2a2f3a;padding:20px;border-radius:6px;border-left:4px solid #3498db;margin-bottom:20px">
          <h3 style="margin-top:0;color:#3498db">📅 Daily Quests</h3>
          <div style="font-size:14px;color:#b0b0b0">
            <div style="margin:10px 0"><strong>Next Reset:</strong> \${dailyHours}h \${dailyMins}m</div>
            <div style="margin:10px 0"><strong>Frequency:</strong> Every 24 hours</div>
            <div style="margin:10px 0"><strong>Status:</strong> <span style="color:#4ade80">Active</span></div>
          </div>
        </div>
        
        <div style="background:#2a2f3a;padding:20px;border-radius:6px;border-left:4px solid #9b59b6;margin-bottom:20px">
          <h3 style="margin-top:0;color:#9b59b6">📆 Weekly Quests</h3>
          <div style="font-size:14px;color:#b0b0b0">
            <div style="margin:10px 0"><strong>Next Reset:</strong> \${weeklyDays}d \${weeklyHours}h</div>
            <div style="margin:10px 0"><strong>Frequency:</strong> Every 7 days</div>
            <div style="margin:10px 0"><strong>Status:</strong> <span style="color:#4ade80">Active</span></div>
          </div>
        </div>
        
        <div style="background:#2a2f3a;padding:20px;border-radius:6px;border-left:4px solid #f39c12;margin-bottom:20px">
          <h3 style="margin-top:0;color:#f39c12">⏳ Limited Quests</h3>
          <div style="font-size:14px;color:#b0b0b0">
            <div style="margin:10px 0"><strong>Status:</strong> <span style="color:#f39c12">First-come first-served</span></div>
            <div style="margin:10px 0"><strong>Max Claims:</strong> Configurable per quest</div>
            <div id="limitedQuestTimers"></div>
          </div>
        </div>
        
        <button onclick="this.parentElement.parentElement.remove()" style="width:100%;padding:12px;background:#2196f3;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:bold;margin-top:20px">Close</button>
      </div>
    </div>
  \`;
  
  document.body.insertAdjacentHTML('beforeend', calendar);
  
  // Load limited quest timers
  const limitedTimers = [];
  if (guildQuests.limited) {
    guildQuests.limited.slice(0, 5).forEach(q => {
      if (q.expiresAt) {
        const expiryTime = new Date(q.expiresAt);
        const timeLeft = expiryTime.getTime() - Date.now();
        if (timeLeft > 0) {
          const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
          const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          limitedTimers.push(\`<div style="margin:8px 0">• \${q.title}: <span style="color:#f39c12">\${days}d \${hours}h</span></div>\`);
        }
      } else {
        limitedTimers.push(\`<div style="margin:8px 0">• \${q.title}: <span style="color:#4ade80">No expiry</span></div>\`);
      }
    });
  }
  document.getElementById('limitedQuestTimers').innerHTML = limitedTimers.join('') || '<div style="color:#888">No limited quests</div>';
}

// Quick Add Templates
async function quickAddQuest(type, questType) {
  const templates = {
    daily: {
      kill: { description: 'Defeat 5 enemies', objective: { type: 'kill', target: 'enemy', count: 5 }, rewards: { gold: 100, guildXP: 50 } },
      gather: { description: 'Collect 10 materials', objective: { type: 'gather', target: 'material', count: 10 }, rewards: { gold: 80, guildXP: 40 } },
      craft: { description: 'Craft 3 items', objective: { type: 'craft', target: 'item', count: 3 }, rewards: { gold: 90, guildXP: 45 } },
      explore: { description: 'Explore 2 locations', objective: { type: 'explore', target: 'location', count: 2 }, rewards: { gold: 70, guildXP: 35 } }
    },
    weekly: {
      kill: { description: 'Defeat 25 enemies', objective: { type: 'kill', target: 'boss', count: 1 }, rewards: { gold: 500, guildXP: 100 } },
      gather: { description: 'Collect 50 rare materials', objective: { type: 'gather', target: 'material', count: 50 }, rewards: { gold: 400, guildXP: 80 } },
      explore: { description: 'Complete 5 dungeons', objective: { type: 'explore', target: 'dungeon', count: 5 }, rewards: { gold: 600, guildXP: 120 } }
    },
    limited: {
      kill: { description: 'Rare boss spawned! Quick, defeat it!', objective: { type: 'kill', target: 'rare_boss', count: 1 }, rewards: { gold: 1000, guildXP: 200 }, maxClaims: 5 },
      gather: { description: 'Treasure discovered! Limited time only!', objective: { type: 'gather', target: 'treasure', count: 1 }, rewards: { gold: 800, guildXP: 150 }, maxClaims: 10 }
    }
  };

  const template = templates[type]?.[questType];
  if (!template) return;

  const questId = \`quest_\${type}_\${questType}_\${Date.now()}\`;
  const title = \`\${type === 'daily' ? '📅' : type === 'weekly' ? '📆' : '⏳'} \${questType.charAt(0).toUpperCase() + questType.slice(1)} Quest\`;

  const questData = {
    id: questId,
    title,
    description: template.description,
    objective: template.objective,
    minRank: 'F',
    rewards: template.rewards
  };

  if (type === 'limited') {
    questData.maxClaims = template.maxClaims;
    questData.claimedCount = 0;
  }

  try {
    const response = await fetch(\`/api/rpg/guild/quests/\${type}\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(questData)
    });

    if (response.ok) {
      alert(\`✅ \${title} created!\`);
      await loadGuildData();
    } else {
      alert('Error creating quest');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error: ' + error.message);
  }
}
</script>
`;
}

export function renderRPGAdminTab() {
  const rpgAccess = getRpgSettings();
  const rpgAccessChannels = Array.isArray(rpgAccess.allowedChannelIds)
    ? rpgAccess.allowedChannelIds.join(', ')
    : '';
  return `
<div class="card">
  <h2>🔑 RPG Admin Panel</h2>
  <p style="color:#b0b0b0">Backup, restore, and manage RPG content</p>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-top:15px">
    <div style="background:#2a2f3a;padding:15px;border-radius:6px;border:1px solid #3a3a42">
      <div style="font-weight:bold;color:#e0e0e0">💾 Backup</div>
      <p style="font-size:13px;color:#999;margin:8px 0">Create content backup</p>
      <button class="small" onclick="backupContent()" style="width:100%;margin-top:8px">💾 Backup Now</button>
    </div>
    <div style="background:#2a2f3a;padding:15px;border-radius:6px;border:1px solid #3a3a42">
      <div style="font-weight:bold;color:#e0e0e0">♻️ Restore</div>
      <p style="font-size:13px;color:#999;margin:8px 0">Restore from backup</p>
      <button class="small" onclick="restoreContent()" style="width:100%;margin-top:8px">♻️ Restore</button>
    </div>
    <div style="background:#2a2f3a;padding:15px;border-radius:6px;border:1px solid #3a3a42">
      <div style="font-weight:bold;color:#e0e0e0">⬇️ Export</div>
      <p style="font-size:13px;color:#999;margin:8px 0">Export all content to JSON</p>
      <button class="small" onclick="exportContent()" style="width:100%;margin-top:8px">⬇️ Export</button>
    </div>
    <div style="background:#2a2f3a;padding:15px;border-radius:6px;border:1px solid #3a3a42">
      <div style="font-weight:bold;color:#e0e0e0">⬆️ Import</div>
      <p style="font-size:13px;color:#999;margin:8px 0">Import content from JSON</p>
      <button class="small" onclick="importContent()" style="width:100%;margin-top:8px">⬆️ Import</button>
    </div>
    <div style="background:#2a2f3a;padding:15px;border-radius:6px;border:1px solid #3a3a42">
      <div style="font-weight:bold;color:#e0e0e0">📊 Statistics</div>
      <p style="font-size:13px;color:#999;margin:8px 0">Content statistics</p>
      <button class="small" onclick="viewStats()" style="width:100%;margin-top:8px">📊 View Stats</button>
    </div>
    <div style="background:#2a2f3a;padding:15px;border-radius:6px;border:1px solid #3a3a42">
      <div style="font-weight:bold;color:#e0e0e0">🧹 Cleanup</div>
      <p style="font-size:13px;color:#999;margin:8px 0">Remove orphaned content</p>
      <button class="small danger" onclick="cleanupContent()" style="width:100%;margin-top:8px">🧹 Cleanup</button>
    </div>
  </div>
</div>

<div class="card">
  <h2>🔒 RPG Channel Access</h2>
  <p style="color:#b0b0b0">Restrict RPG commands and interactions to specific channels</p>

  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin-top:10px">
    <div style="background:#2a2f3a;padding:12px;border-radius:6px;border:1px solid #3a3a42">
      <label style="display:flex;align-items:center;gap:10px">
        <input type="checkbox" id="rpgAccessEnabled" ${rpgAccess.channelRestrictionEnabled ? 'checked' : ''}>
        <span style="font-weight:600;color:#e0e0e0">Enable channel restriction</span>
      </label>
      <p style="font-size:12px;color:#999;margin:8px 0 0">When enabled, RPG works only in the allowed channels.</p>
    </div>
    <div style="background:#2a2f3a;padding:12px;border-radius:6px;border:1px solid #3a3a42">
      <label style="font-weight:600;color:#e0e0e0">Allowed Channel IDs</label>
      <input type="text" id="rpgAccessChannels" value="${rpgAccessChannels}" placeholder="123..., 456..." style="width:100%;margin-top:8px;padding:10px;background:#1a1f2e;border:1px solid #3a3a42;border-radius:4px;color:#e0e0e0" oninput="updateRpgAccessPreview()">
      <div id="rpgAccessPreview" style="margin-top:8px;color:#8fd18f;font-size:12px"></div>
    </div>
  </div>

  <div style="margin-top:12px">
    <button class="small" onclick="saveRpgAccessSettings()" style="background:#4caf50">💾 Save Access Settings</button>
  </div>
</div>

<div class="card">
  <h2>👥 Player Management</h2>
  <p style="color:#b0b0b0">View and manage player data</p>
  
  <div style="display:flex;gap:10px;margin:15px 0;flex-wrap:wrap">
    <button class="small" onclick="loadAllPlayers()" style="background:#4caf50">👥 Load All Players</button>
    <button class="small" onclick="backupPlayers()" style="background:#2196f3">💾 Backup Players</button>
    <button class="small danger" onclick="resetAllPlayers()" style="background:#ff9800">🔄 Reset All Players</button>
    <button class="small danger" onclick="deleteAllPlayers()">🗑️ Delete All Players</button>
  </div>

  <div id="playerStats" style="background:#2a2f3a;padding:15px;border-radius:6px;margin:15px 0;display:none">
    <h3 style="margin-top:0;color:#9146ff">📊 Player Statistics</h3>
    <div id="playerStatsContent"></div>
  </div>

  <div style="margin:15px 0">
    <input type="text" id="playerSearch" placeholder="Search by User ID or Username..." 
      oninput="filterPlayers(this.value)" 
      style="width:100%;padding:10px;background:#2a2f3a;border:1px solid #3a3a42;border-radius:4px;color:#e0e0e0">
  </div>

  <div id="playersList" style="max-height:600px;overflow-y:auto"></div>
</div>

<script>
let allPlayers = {};

function splitIdTokens(value) {
  const out = [];
  let buf = '';
  const text = value || '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === ',' || ch === ' ' || ch === '\\n' || ch === '\\t' || ch === '\\r') {
      const trimmed = buf.trim();
      if (trimmed) out.push(trimmed);
      buf = '';
      continue;
    }
    buf += ch;
  }
  const last = buf.trim();
  if (last) out.push(last);
  return out;
}

function updateRpgAccessPreview() {
  const input = document.getElementById('rpgAccessChannels');
  const preview = document.getElementById('rpgAccessPreview');
  if (!input || !preview) return;
  const ids = splitIdTokens(input.value);
  if (!ids.length) {
    preview.textContent = 'No channels set';
    preview.style.color = '#999';
    return;
  }
  preview.textContent = 'Checking channels...';
  preview.style.color = '#9ad0ff';

  const checks = ids.slice(0, 5).map(id =>
    fetch('/channel/info/' + encodeURIComponent(id))
      .then(r => r.json())
      .then(data => data && data.name ? '#' + data.name : id)
      .catch(() => id)
  );

  Promise.all(checks).then(names => {
    preview.textContent = 'Allowed: ' + names.join(', ') + (ids.length > 5 ? ' +' + (ids.length - 5) + ' more' : '');
    preview.style.color = '#8fd18f';
  });
}

function saveRpgAccessSettings() {
  const enabled = document.getElementById('rpgAccessEnabled').checked;
  const channelIds = splitIdTokens(document.getElementById('rpgAccessChannels').value);
  fetch('/api/rpg/settings/access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channelRestrictionEnabled: enabled,
      allowedChannelIds: channelIds
    })
  })
  .then(r => r.json())
  .then(data => {
    if (data && data.success) {
      alert('✅ RPG access settings saved');
      updateRpgAccessPreview();
    } else {
      alert('❌ Error: ' + (data.error || 'Unknown error'));
    }
  })
  .catch(err => alert('❌ Error: ' + err.message));
}

function saveRpgAccessSettings() {
  const enabled = document.getElementById('rpgAccessEnabled').checked;
  const channelIds = splitIdTokens(document.getElementById('rpgAccessChannels').value);
  fetch('/api/rpg/settings/access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channelRestrictionEnabled: enabled,
      allowedChannelIds: channelIds
    })
  })
  .then(r => r.json())
  .then(data => {
    if (data && data.success) {
      alert('✅ RPG access settings saved');
      updateRpgAccessPreview();
    } else {
      alert('❌ Error: ' + (data.error || 'Unknown error'));
    }
  })
  .catch(err => alert('❌ Error: ' + err.message));
}

document.addEventListener('DOMContentLoaded', function() {
  updateRpgAccessPreview();
});

async function loadAllPlayers() {
  try {
    const response = await fetch('/api/rpg/players/list');
    const data = await response.json();
    
    if (data.success) {
      allPlayers = data.players;
      displayPlayerStats(data.stats);
      displayPlayers(allPlayers);
      document.getElementById('playerStats').style.display = 'block';
    } else {
      alert('❌ Error: ' + data.message);
    }
  } catch (err) {
    alert('❌ Error loading players: ' + err.message);
  }
}
window.loadAllPlayers = loadAllPlayers;

function displayPlayerStats(stats) {
  const content = document.getElementById('playerStatsContent');
  const totalGold = stats.totalGold != null ? stats.totalGold.toLocaleString() : '0';
  content.innerHTML = [
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px">',
    '  <div style="background:#1a1f2e;padding:12px;border-radius:4px">',
    '    <div style="color:#999;font-size:12px">Total Players</div>',
    '    <div style="font-size:24px;font-weight:bold;color:#4caf50">' + stats.totalPlayers + '</div>',
    '  </div>',
    '  <div style="background:#1a1f2e;padding:12px;border-radius:4px">',
    '    <div style="color:#999;font-size:12px">Avg Level</div>',
    '    <div style="font-size:24px;font-weight:bold;color:#2196f3">' + stats.avgLevel + '</div>',
    '  </div>',
    '  <div style="background:#1a1f2e;padding:12px;border-radius:4px">',
    '    <div style="color:#999;font-size:12px">Max Level</div>',
    '    <div style="font-size:24px;font-weight:bold;color:#ff9800">' + stats.maxLevel + '</div>',
    '  </div>',
    '  <div style="background:#1a1f2e;padding:12px;border-radius:4px">',
    '    <div style="color:#999;font-size:12px">Total Gold</div>',
    '    <div style="font-size:24px;font-weight:bold;color:#ffd700">' + totalGold + '</div>',
    '  </div>',
    '</div>'
  ].join('');
}

function displayPlayers(players) {
  const list = document.getElementById('playersList');
  const playerArray = Object.entries(players);
  
  if (playerArray.length === 0) {
    list.innerHTML = '<p style="text-align:center;color:#999;padding:20px">No players found</p>';
    return;
  }

  let html = '';
  playerArray.forEach(([userId, player]) => {
    const level = player.level || 1;
    const gold = player.gold || 0;
    const className = player.class || 'None';
    const hp = player.hp || 0;
    const maxHp = player.maxHp || 100;
    
    html += '<div class="player-card" data-user-id="' + userId + '" style="background:#2a2f3a;padding:15px;margin:10px 0;border-radius:6px;border:1px solid #3a3a42">' +
      '<div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:10px">' +
      '<div>' +
      '<div style="font-weight:bold;color:#9146ff;font-size:16px">' + (player.username || 'Unknown') + '</div>' +
      '<div style="color:#999;font-size:12px">ID: ' + userId + '</div>' +
      '</div>' +
      '<div style="display:flex;gap:6px">' +
      '<button class="small" data-action="view" data-user-id="' + userId + '" style="background:#2196f3;margin:0">👁️ View</button>' +
      '<button class="small" data-action="reset" data-user-id="' + userId + '" style="background:#ff9800;margin:0">🔄 Reset</button>' +
      '<button class="small danger" data-action="delete" data-user-id="' + userId + '" style="margin:0">🗑️</button>' +
      '</div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;font-size:13px">' +
      '<div><span style="color:#999">Level:</span> <span style="color:#4caf50;font-weight:bold">' + level + '</span></div>' +
      '<div><span style="color:#999">Class:</span> <span style="color:#2196f3">' + className + '</span></div>' +
      '<div><span style="color:#999">Gold:</span> <span style="color:#ffd700">' + gold.toLocaleString() + '</span></div>' +
      '<div><span style="color:#999">HP:</span> <span style="color:#ef5350">' + hp + '/' + maxHp + '</span></div>' +
      '</div>' +
      '</div>';
  });
  
  list.innerHTML = html;
  
  // Add event delegation for player action buttons
  list.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', function() {
      const action = this.getAttribute('data-action');
      const userId = this.getAttribute('data-user-id');
      if (action === 'view') viewPlayer(userId);
      else if (action === 'reset') resetPlayer(userId);
      else if (action === 'delete') deletePlayer(userId);
    });
  });
}

function filterPlayers(searchTerm) {
  const cards = document.querySelectorAll('.player-card');
  const term = searchTerm.toLowerCase();
  
  cards.forEach(card => {
    const userId = card.getAttribute('data-user-id');
    const username = card.querySelector('.player-card > div > div > div').textContent.toLowerCase();
    const matches = userId.includes(term) || username.includes(term);
    card.style.display = matches ? 'block' : 'none';
  });
}

async function viewPlayer(userId) {
  try {
    const response = await fetch('/api/rpg/players/' + userId);
    const data = await response.json();
    
    if (data.success) {
      const player = data.player;
      const json = JSON.stringify(player, null, 2);
      alert('Player Data:\\n\\n' + json.substring(0, 1000) + (json.length > 1000 ? '\\n\\n...truncated' : ''));
    } else {
      alert('❌ Error: ' + data.message);
    }
  } catch (err) {
    alert('❌ Error: ' + err.message);
  }
}

async function resetPlayer(userId) {
  if (!confirm('⚠️ Are you sure you want to reset this player? This cannot be undone!')) return;
  
  try {
    const response = await fetch('/api/rpg/players/' + userId + '/reset', { method: 'POST' });
    const data = await response.json();
    
    if (data.success) {
      alert('✅ Player reset successfully!');
      loadAllPlayers();
    } else {
      alert('❌ Error: ' + data.message);
    }
  } catch (err) {
    alert('❌ Error: ' + err.message);
  }
}

async function deletePlayer(userId) {
  if (!confirm('⚠️ Are you sure you want to DELETE this player? This cannot be undone!')) return;
  
  try {
    const response = await fetch('/api/rpg/players/' + userId, { method: 'DELETE' });
    const data = await response.json();
    
    if (data.success) {
      alert('✅ Player deleted successfully!');
      loadAllPlayers();
    } else {
      alert('❌ Error: ' + data.message);
    }
  } catch (err) {
    alert('❌ Error: ' + err.message);
  }
}

async function backupPlayers() {
  try {
    const response = await fetch('/api/rpg/players/backup', { method: 'POST' });
    const data = await response.json();
    
    if (data.success) {
      alert('✅ Players backup created: ' + data.backupPath);
    } else {
      alert('❌ Error: ' + data.message);
    }
  } catch (err) {
    alert('❌ Error: ' + err.message);
  }
}

async function resetAllPlayers() {
  const confirmation = prompt('⚠️ TYPE "RESET ALL" TO CONFIRM. This will reset ALL player data!');
  if (confirmation !== 'RESET ALL') return;
  
  try {
    const response = await fetch('/api/rpg/players/reset-all', { method: 'POST' });
    const data = await response.json();
    
    if (data.success) {
      alert('✅ All players reset! ' + data.count + ' players affected.');
      loadAllPlayers();
    } else {
      alert('❌ Error: ' + data.message);
    }
  } catch (err) {
    alert('❌ Error: ' + err.message);
  }
}

async function deleteAllPlayers() {
  const confirmation = prompt('⚠️ TYPE "DELETE ALL" TO CONFIRM. This will DELETE ALL player data permanently!');
  if (confirmation !== 'DELETE ALL') return;
  
  try {
    const response = await fetch('/api/rpg/players/delete-all', { method: 'POST' });
    const data = await response.json();
    
    if (data.success) {
      alert('✅ All players deleted! ' + data.count + ' players removed.');
      allPlayers = {};
      document.getElementById('playersList').innerHTML = '<p style="text-align:center;color:#999;padding:20px">No players found</p>';
      document.getElementById('playerStats').style.display = 'none';
    } else {
      alert('❌ Error: ' + data.message);
    }
  } catch (err) {
    alert('❌ Error: ' + err.message);
  }
}

function backupContent() { alert('💾 Backup feature coming soon!'); }
function restoreContent() { alert('♻️ Restore feature coming soon!'); }
function exportContent() { alert('⬇️ Export feature coming soon!'); }
function importContent() { alert('⬆️ Import feature coming soon!'); }
function viewStats() { alert('📊 Statistics feature coming soon!'); }
function cleanupContent() { alert('🧹 Cleanup feature coming soon!'); }

// Expose functions to global window object for onclick handlers
window.updateRpgAccessPreview = updateRpgAccessPreview;
window.saveRpgAccessSettings = saveRpgAccessSettings;
window.viewPlayer = viewPlayer;
window.resetPlayer = resetPlayer;
window.deletePlayer = deletePlayer;
window.backupPlayers = backupPlayers;
window.resetAllPlayers = resetAllPlayers;
window.deleteAllPlayers = deleteAllPlayers;
window.backupContent = backupContent;
window.restoreContent = restoreContent;
window.exportContent = exportContent;
window.importContent = importContent;
window.viewStats = viewStats;
window.cleanupContent = cleanupContent;
</script>
`;
}

export function renderRPGGuildStatsTab() {
  return `
<div class="card">
  <h2>📊 Guild Statistics & Leaderboard</h2>
  <p style="color:#b0b0b0">View player rankings, quest completion rates, and guild analytics</p>
  <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:15px;margin-top:15px">
    <button class="primary" onclick="showGuildLeaderboard()" style="padding:12px;background:#2196f3;border:none;border-radius:6px;color:#fff;cursor:pointer;font-weight:bold">👑 Leaderboard</button>
    <button class="primary" onclick="showGuildOverviewStats()" style="padding:12px;background:#4caf50;border:none;border-radius:6px;color:#fff;cursor:pointer;font-weight:bold">📈 Overview</button>
    <button class="primary" onclick="showGuildRankDistribution()" style="padding:12px;background:#ff9800;border:none;border-radius:6px;color:#fff;cursor:pointer;font-weight:bold">📊 Rank Distribution</button>
  </div>
</div>
  `;
}

// Show Guild Leaderboard
function showGuildLeaderboard() {
  fetch('/api/rpg/guild/statistics/leaderboard')
    .then(r => r.json())
    .then(data => {
      if (!data.success) {
        alert('Error loading leaderboard');
        return;
      }

      const leaderboard = data.leaderboard || [];
      const rows = leaderboard.slice(0, 20).map((player, idx) => `
        <tr>
          <td style="color:#ffaa00;font-weight:bold">#${idx + 1}</td>
          <td>${player.username}</td>
          <td>${player.rank}</td>
          <td style="color:#4caf50">${player.guildXP.toLocaleString()}</td>
          <td>${player.level}</td>
          <td>${player.totalQuestsCompleted}</td>
        </tr>
      `).join('');

      const modal = `
        <div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px">
          <div style="background:#1e1e1e;padding:30px;border-radius:8px;max-width:900px;width:100%;max-height:80vh;overflow-y:auto">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
              <h2 style="margin:0">👑 Guild Leaderboard</h2>
              <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background:none;border:none;color:#ccc;font-size:24px;cursor:pointer">✕</button>
            </div>
            
            <table style="width:100%;border-collapse:collapse">
              <thead>
                <tr style="border-bottom:2px solid #404040">
                  <th style="padding:10px;text-align:left;color:#ffaa00">#</th>
                  <th style="padding:10px;text-align:left">Player</th>
                  <th style="padding:10px;text-align:left">Rank</th>
                  <th style="padding:10px;text-align:left;color:#4caf50">Guild XP</th>
                  <th style="padding:10px;text-align:left">Level</th>
                  <th style="padding:10px;text-align:left">Quests</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>

            <button onclick="this.parentElement.parentElement.remove()" style="width:100%;padding:12px;background:#2196f3;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:bold;margin-top:20px">Close</button>
          </div>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', modal);
    })
    .catch(err => console.error('Leaderboard error:', err));
}

// Show Guild Overview Stats
function showGuildOverviewStats() {
  fetch('/api/rpg/guild/statistics/overview')
    .then(r => r.json())
    .then(data => {
      if (!data.success) {
        alert('Error loading statistics');
        return;
      }

      const stats = data.statistics || {};
      const rankDist = stats.rankDistribution || [];
      const rankCards = rankDist.map(r => `
        <div style="background:linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0));padding:15px;border-radius:6px;text-align:center">
          <div style="font-size:24px;font-weight:bold;color:#ffaa00">Rank ${r.rank}</div>
          <div style="color:#aaa;font-size:14px">Players: ${r.count}</div>
          <div style="color:#4caf50;font-size:13px">${r.percentage}%</div>
        </div>
      `).join('');

      const modal = `
        <div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px">
          <div style="background:#1e1e1e;padding:30px;border-radius:8px;max-width:800px;width:100%;max-height:80vh;overflow-y:auto">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
              <h2 style="margin:0">📈 Guild Overview</h2>
              <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background:none;border:none;color:#ccc;font-size:24px;cursor:pointer">✕</button>
            </div>
            
            <div style="display:grid;grid-template-columns:repeat(2, 1fr);gap:15px;margin-bottom:20px">
              <div style="background:#2a2f3a;padding:15px;border-radius:6px">
                <div style="font-size:12px;color:#aaa">Total Players</div>
                <div style="font-size:28px;font-weight:bold;color:#2196f3">${stats.totalPlayers || 0}</div>
              </div>
              <div style="background:#2a2f3a;padding:15px;border-radius:6px">
                <div style="font-size:12px;color:#aaa">Avg Guild XP</div>
                <div style="font-size:28px;font-weight:bold;color:#4caf50">${stats.averageRankXP || 0}</div>
              </div>
              <div style="background:#2a2f3a;padding:15px;border-radius:6px">
                <div style="font-size:12px;color:#aaa">Daily Completion</div>
                <div style="font-size:28px;font-weight:bold;color:#ff9800">${stats.completionRates?.dailyCompletionRate || '0%'}</div>
              </div>
              <div style="background:#2a2f3a;padding:15px;border-radius:6px">
                <div style="font-size:12px;color:#aaa">Weekly Completion</div>
                <div style="font-size:28px;font-weight:bold;color:#ff9800">${stats.completionRates?.weeklyCompletionRate || '0%'}</div>
              </div>
            </div>

            <h3 style="color:#aaa;margin:20px 0 15px 0">Rank Distribution</h3>
            <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:10px">
              ${rankCards}
            </div>

            <button onclick="this.parentElement.parentElement.remove()" style="width:100%;padding:12px;background:#2196f3;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:bold;margin-top:20px">Close</button>
          </div>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', modal);
    })
    .catch(err => console.error('Stats error:', err));
}

// Show Rank Distribution Chart
function showGuildRankDistribution() {
  fetch('/api/rpg/guild/statistics/overview')
    .then(r => r.json())
    .then(data => {
      if (!data.success) {
        alert('Error loading statistics');
        return;
      }

      const stats = data.statistics || {};
      const rankData = stats.rankDistribution || [];
      const completionByRank = stats.completionByRank || [];

      const rankBars = rankData.map(r => {
        const barWidth = r.percentage * 2;
        return `
          <div style="margin-bottom:15px">
            <div style="display:flex;justify-content:space-between;margin-bottom:5px">
              <strong style="color:#ffaa00">Rank ${r.rank}</strong>
              <span style="color:#aaa">${r.count} players (${r.percentage}%)</span>
            </div>
            <div style="background:#404040;border-radius:4px;height:20px;overflow:hidden">
              <div style="background:linear-gradient(90deg, #2196f3, #4caf50);width:${barWidth}%;height:100%;transition:all 0.3s"></div>
            </div>
          </div>
        `;
      }).join('');

      const completionBars = completionByRank.map(c => {
        return `
          <div style="margin-bottom:15px">
            <div style="display:flex;justify-content:space-between;margin-bottom:5px">
              <strong style="color:#ffaa00">Rank ${c.rank}</strong>
              <span style="color:#aaa">Avg: ${c.average} quests</span>
            </div>
          </div>
        `;
      }).join('');

      const modal = `
        <div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px">
          <div style="background:#1e1e1e;padding:30px;border-radius:8px;max-width:700px;width:100%;max-height:80vh;overflow-y:auto">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
              <h2 style="margin:0">📊 Rank Distribution</h2>
              <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background:none;border:none;color:#ccc;font-size:24px;cursor:pointer">✕</button>
            </div>
            
            <h3 style="color:#aaa;margin:0 0 15px 0">Player Distribution by Rank</h3>
            ${rankBars}

            <h3 style="color:#aaa;margin:30px 0 15px 0">Average Quest Completion by Rank</h3>
            ${completionBars}

            <button onclick="this.parentElement.parentElement.remove()" style="width:100%;padding:12px;background:#2196f3;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:bold;margin-top:20px">Close</button>
          </div>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', modal);
    })
    .catch(err => console.error('Distribution error:', err));
}

