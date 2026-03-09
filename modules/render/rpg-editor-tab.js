/**
 * RPG Editor Dashboard Tab
 * Extracted from index.js — the full RPG content editor UI
 */

export function renderRPGEditorTab() {
  return `
<!-- v2.1 -->
<style>
  .editor-tabs { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
  .editor-tabs button { padding: 10px 16px; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.2); color: #e0e0e0; cursor: pointer; border-radius: 6px; font-weight: bold; transition: all 0.3s; }
  .editor-tabs button:hover, .editor-tabs button.active { background: rgba(255,255,255,0.2); border-color: #9146ff; }
  .editor-section { display: none; }
  .editor-section.active { display: block; }
  .items-grid { display: grid; gap: 12px; margin-top: 15px; }
  .item-card { background: #2a2f3a; border: 1px solid #3a3f4a; border-radius: 6px; padding: 15px; cursor: pointer; transition: all 0.2s; }
  .item-card:hover { border-color: #9146ff; background: #2f3440; }
  .item-card.selected { border-color: #9146ff; background: #35394a; box-shadow: 0 0 10px rgba(145,70,255,0.3); }
  .item-card h3 { color: #9146ff; margin-bottom: 8px; font-size: 1.1em; }
  .item-card p { opacity: 0.8; margin: 4px 0; font-size: 0.9em; }
  .item-actions { display: flex; gap: 8px; margin-top: 12px; }
  .btn-edit { padding: 6px 12px; background: #2196f3; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85em; }
  .btn-delete { padding: 6px 12px; background: #ef5350; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85em; }
  .btn-create { padding: 10px 20px; background: #9146ff; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; margin-bottom: 15px; }
  .btn-view { padding: 6px 12px; background: #4caf50; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85em; }
  .quest-types { display: flex; gap: 8px; margin-bottom: 15px; }
  .quest-types button { padding: 8px 14px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #b0b0b0; cursor: pointer; border-radius: 4px; font-size: 0.9em; }
  .quest-types button.active { background: rgba(145,70,255,0.3); border-color: #9146ff; color: #fff; }
  .world-content { margin-top: 20px; padding: 20px; background: #1f2329; border-radius: 8px; border: 2px solid #9146ff; }
  .world-content h3 { color: #9146ff; margin-bottom: 15px; }
  .content-tabs { display: flex; gap: 8px; margin-bottom: 15px; border-bottom: 1px solid rgba(145,70,255,0.3); }
  .content-tabs button { padding: 8px 16px; background: transparent; border: none; border-bottom: 3px solid transparent; color: #b0b0b0; cursor: pointer; font-weight: bold; }
  .content-tabs button.active { color: #9146ff; border-bottom-color: #9146ff; }
  .content-section-inner { display: none; }
  .content-section-inner.active { display: block; }
  .back-btn { padding: 8px 16px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #e0e0e0; border-radius: 4px; cursor: pointer; margin-bottom: 15px; }
  .modal { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 10000; justify-content: center; align-items: flex-start; overflow-y: auto; padding: 20px; }
  .modal.active { display: flex; }
  .modal-content { background: #1a1d23; border-radius: 8px; padding: 25px; width: 90%; max-width: 600px; border: 2px solid #9146ff; margin: 20px auto; max-height: none !important; }
  .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid rgba(145,70,255,0.3); }
  .modal-header h3 { color: #9146ff; margin: 0; }
  .close-modal { background: none; border: none; color: #e0e0e0; font-size: 24px; cursor: pointer; }
  .form-group { margin-bottom: 15px; }
  .form-group label { display: block; margin-bottom: 5px; color: #9146ff; font-weight: bold; font-size: 0.9em; }
  .form-group input, .form-group textarea, .form-group select { width: 100%; padding: 8px 12px; background: #2a2f3a; border: 1px solid #3a3f4a; border-radius: 4px; color: #e0e0e0; font-family: inherit; }
  .form-group textarea { min-height: 80px; resize: vertical; }
  .reward-selector { background: #2a2f3a; border: 1px solid #3a3f4a; border-radius: 4px; padding: 15px; max-height: 300px; overflow-y: auto; }
  .reward-item { display: flex; align-items: center; gap: 10px; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 4px; margin-bottom: 8px; }
  .reward-item input[type="checkbox"] { width: auto; }
  .reward-item label { flex: 1; margin: 0; font-weight: normal; color: #e0e0e0; }
  .reward-item input[type="number"] { width: 80px; padding: 4px 8px; }
  .btn-submit { padding: 10px 20px; background: #9146ff; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; width: 100%; margin-top: 10px; }
  .btn-cancel { padding: 10px 20px; background: rgba(255,255,255,0.1); color: #e0e0e0; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; cursor: pointer; width: 100%; margin-top: 10px; }
</style>

<div class="card">
  <h2>✏️ RPG Content Editor</h2>
  <p style="color:#b0b0b0;margin-bottom:20px">Select a world to manage its content, or create standalone rewards</p>
  
  <div class="editor-tabs">
    <button class="active" onclick="switchEditorTab('worlds')">🌍 Worlds</button>
    <button onclick="switchEditorTab('npcs')">🧙 NPCs</button>
    <button onclick="switchEditorTab('items')">📦 Items</button>
    <button onclick="switchEditorTab('materials')">🧱 Materials</button>
    <button onclick="switchEditorTab('rewards')">🎁 Rewards (Global)</button>
  </div>
  
  <!-- WORLDS TAB -->
  <div id="editor-worlds" class="editor-section active">
    <button class="btn-create" onclick="createWorld()">+ New World</button>
    <div class="items-grid" id="worlds-list">Loading...</div>
    
    <!-- World Content Management (shown when world is selected) -->
    <div id="world-content-panel" class="world-content" style="display:none">
      <button class="back-btn" onclick="closeWorldContent()">← Back to Worlds</button>
      <h3 id="world-content-title">World Content</h3>
      
      <div class="content-tabs">
        <button class="active" onclick="switchContentTab('quests')">📜 Quests</button>
        <button onclick="switchContentTab('town-defence')">🛡️ Town Defence</button>
        <button onclick="switchContentTab('bosses')">👹 Bosses</button>
        <button onclick="switchContentTab('dungeons')">🏰 Dungeons</button>
        <button onclick="switchContentTab('raids')">⚡ Raids</button>
      </div>
      
      <div id="world-quests" class="content-section-inner active">
        <div class="quest-types">
          <button class="active" onclick="switchQuestType('side', this)">Side</button>
          <button onclick="switchQuestType('main', this)">Main</button>
          <button onclick="switchQuestType('daily', this)">Daily</button>
        </div>
        <button class="btn-create" onclick="createWorldQuest()">+ New Quest</button>
        <div class="items-grid" id="world-quests-list">No quests yet</div>
      </div>
      
      <div id="world-town-defence" class="content-section-inner">
        <button class="btn-create" onclick="createTownDefenceQuest()">+ New Town Defence Quest</button>
        <div class="items-grid" id="town-defence-list">Loading town defence quests...</div>
      </div>
      
      <div id="world-bosses" class="content-section-inner">
        <button class="btn-create" onclick="createWorldBoss()">+ New Boss</button>
        <div class="items-grid" id="world-bosses-list">No bosses yet</div>
      </div>
      
      <div id="world-dungeons" class="content-section-inner">
        <button class="btn-create" onclick="createWorldDungeon()">+ New Dungeon</button>
        <div class="items-grid" id="world-dungeons-list">No dungeons yet</div>
      </div>
      
      <div id="world-raids" class="content-section-inner">
        <button class="btn-create" onclick="createWorldRaid()">+ New Raid</button>
        <div class="items-grid" id="world-raids-list">No raids yet</div>
      </div>
    </div>
  </div>
  
  <!-- NPCs TAB -->
  <div id="editor-npcs" class="editor-section">
    <button class="btn-create" onclick="createNPC()">+ New NPC</button>
    <div style="margin-bottom:15px">
      <label>Filter by World:</label>
      <select id="npc-world-filter" onchange="loadNPCs()" style="padding:8px 12px;background:#2a2f3a;border:1px solid #3a3f4a;border-radius:4px;color:#e0e0e0">
        <option value="">All Worlds</option>
      </select>
    </div>
    <div class="items-grid" id="npcs-list">Loading...</div>
  </div>
  
  <!-- ITEMS TAB -->
  <div id="editor-items" class="editor-section">
    <button class="btn-create" onclick="createItem()">+ New Item</button>
    <div style="display:flex;gap:15px;margin-bottom:15px;flex-wrap:wrap">
      <div>
        <label>Category:</label>
        <select id="item-category-filter" onchange="loadItems()" style="padding:8px 12px;background:#2a2f3a;border:1px solid #3a3f4a;border-radius:4px;color:#e0e0e0">
          <option value="">All Categories</option>
          <option value="weapon">Weapon</option>
          <option value="armor">Armor</option>
          <option value="consumable">Consumable</option>
          <option value="equipment">Equipment</option>
          <option value="gathering">Gathering</option>
          <option value="talent">Talent</option>
          <option value="misc">Miscellaneous</option>
        </select>
      </div>
      <div>
        <label>Rarity:</label>
        <select id="item-rarity-filter" onchange="loadItems()" style="padding:8px 12px;background:#2a2f3a;border:1px solid #3a3f4a;border-radius:4px;color:#e0e0e0">
          <option value="">All Rarities</option>
          <option value="common" style="color:#9d9d9d">Common</option>
          <option value="uncommon" style="color:#1eff00">Uncommon</option>
          <option value="rare" style="color:#0070dd">Rare</option>
          <option value="epic" style="color:#a335ee">Epic</option>
          <option value="legendary" style="color:#ff8000">Legendary</option>
        </select>
      </div>
      <div>
        <label>Class:</label>
        <select id="item-class-filter" onchange="loadItems()" style="padding:8px 12px;background:#2a2f3a;border:1px solid #3a3f4a;border-radius:4px;color:#e0e0e0">
          <option value="">All Classes</option>
          <option value="none">No Restriction</option>
          <option value="warrior">Warrior</option>
          <option value="mage">Mage</option>
          <option value="rogue">Rogue</option>
          <option value="paladin">Paladin</option>
          <option value="ranger">Ranger</option>
          <option value="druid">Druid</option>
        </select>
      </div>
      <div>
        <label>Type:</label>
        <select id="item-type-filter" onchange="loadItems()" style="padding:8px 12px;background:#2a2f3a;border:1px solid #3a3f4a;border-radius:4px;color:#e0e0e0">
          <option value="">All Types</option>
          <optgroup label="Weapons">
            <option value="fist">Fist</option>
            <option value="sword">Sword</option>
            <option value="axe">Axe</option>
            <option value="bow">Bow</option>
            <option value="staff">Staff</option>
            <option value="dagger">Dagger</option>
            <option value="hammer">Hammer</option>
            <option value="spear">Spear</option>
            <option value="wand">Wand</option>
          </optgroup>
          <optgroup label="Armor">
            <option value="helm">Helm</option>
            <option value="chest">Chest</option>
            <option value="legs">Legs</option>
            <option value="boots">Boots</option>
            <option value="gloves">Gloves</option>
            <option value="shield">Shield</option>
            <option value="cloak">Cloak</option>
            <option value="ring">Ring</option>
            <option value="amulet">Amulet</option>
          </optgroup>
        </select>
      </div>
    </div>
    <div class="items-grid" id="items-list">Loading...</div>
  </div>

  <!-- MATERIALS TAB -->
  <div id="editor-materials" class="editor-section">
    <button class="btn-create" onclick="createMaterial()">+ New Material</button>
    <div style="display:flex;gap:8px;margin:15px 0;flex-wrap:wrap;align-items:center">
      <select id="material-source-filter" onchange="loadMaterials()" style="padding:8px 12px;background:#2a2f3a;border:1px solid #3a3f4a;border-radius:4px;color:#e0e0e0">
        <option value="">All Sources</option>
        <option value="adventure">Adventure</option>
        <option value="high_level_adventure">High Level Adventure</option>
        <option value="dungeons">Dungeons</option>
        <option value="raids">Raids</option>
        <option value="bosses">Bosses</option>
        <option value="gathering">Gathering</option>
        <option value="quests">Quests</option>
        <option value="vendor">Vendor</option>
      </select>
      <select id="material-rarity-filter" onchange="loadMaterials()" style="padding:8px 12px;background:#2a2f3a;border:1px solid #3a3f4a;border-radius:4px;color:#e0e0e0">
        <option value="">All Rarities</option>
        <option value="common">Common</option>
        <option value="uncommon">Uncommon</option>
        <option value="rare">Rare</option>
        <option value="epic">Epic</option>
        <option value="legendary">Legendary</option>
      </select>
    </div>
    <div class="items-grid" id="materials-list">Loading...</div>
  </div>
  
  <!-- REWARDS TAB -->
  <div id="editor-rewards" class="editor-section">
    <button class="btn-create" onclick="createReward()">+ New Reward</button>
    <div class="items-grid" id="rewards-list">Loading...</div>
  </div>
</div>

<!-- MODALS -->
<div id="worldModal" class="modal" style="align-items: flex-start !important; overflow-y: visible !important;">
  <div class="modal-content" style="max-height: none !important;">
    <div class="modal-header">
      <h3>Create World</h3>
      <button class="close-modal" onclick="closeWorldModal()">&times;</button>
    </div>
    <div class="form-group">
      <label>World Name *</label>
      <input type="text" id="worldName" required>
    </div>
    <div class="form-group">
      <label>Tier *</label>
      <input type="number" id="worldTier" value="1" min="1" required>
      <small style="color:#999;display:block;margin-top:4px">World tier determines unlock order (Tier 1 is the starting world)</small>
    </div>
    <div class="form-group">
      <label>Description</label>
      <textarea id="worldDescription"></textarea>
    </div>
    <div class="form-group">
      <label>Min Level</label>
      <input type="number" id="worldMinLevel" value="1" min="1">
    </div>
    <div class="form-group">
      <label>Max Level</label>
      <input type="number" id="worldMaxLevel" value="50" min="1">
    </div>
    <div class="form-group">
      <label>World Boss (Optional)</label>
      <select id="worldBossSelect">
        <option value="">No Boss</option>
      </select>
    </div>
    <div class="form-group">
      <label>Next World After Boss Defeat (Optional)</label>
      <select id="worldNextWorldSelect">
        <option value="">None</option>
      </select>
    </div>
    <button class="btn-submit" onclick="submitWorld()">Create World</button>
    <button class="btn-cancel" onclick="closeWorldModal()">Cancel</button>
  </div>
</div>

<div id="bossModal" class="modal" style="align-items: flex-start !important; overflow-y: visible !important;">
  <div class="modal-content" style="max-height: none !important;">
    <div class="modal-header">
      <h3>Create Boss</h3>
      <button class="close-modal" onclick="closeBossModal()">&times;</button>
    </div>
    <div class="form-group">
      <label>Boss Name *</label>
      <input type="text" id="bossName" required>
    </div>
    <div class="form-group">
      <label>Description</label>
      <textarea id="bossDescription"></textarea>
    </div>
    <div class="form-group">
      <label>HP (exact value) *</label>
      <input type="number" id="bossHP" value="100" required>
    </div>
    <div class="form-group">
      <label>Level *</label>
      <input type="number" id="bossLevel" value="10" required>
    </div>
    <div class="form-group">
      <label>Select Rewards (with drop chance %)</label>
      <div class="reward-selector" id="bossRewardSelector">Loading rewards...</div>
    </div>
    <button class="btn-submit" onclick="submitBoss()">Create Boss</button>
    <button class="btn-cancel" onclick="closeBossModal()">Cancel</button>
  </div>
</div>

<div id="questModal" class="modal" style="align-items: flex-start !important; overflow-y: visible !important;">
  <div class="modal-content" style="max-height: none !important;">
    <div class="modal-header">
      <h3>Create Quest</h3>
      <button class="close-modal" onclick="closeQuestModal()">&times;</button>
    </div>
    <div class="form-group">
      <label>Quest Title *</label>
      <input type="text" id="questTitle" required>
    </div>
    <div class="form-group">
      <label>Description</label>
      <textarea id="questDescription"></textarea>
    </div>
    <div class="form-group">
      <label>Quest Type</label>
      <select id="questType" onchange="toggleQuestTypeFields()">
        <option value="side">Side Quest (Standard)</option>
        <option value="main">Main Quest (Story)</option>
        <option value="choice">Choice Quest (Multiple Branches)</option>
        <option value="daily">Daily Quest</option>
        <option value="repeatable">Repeatable Quest</option>
        <option value="class-unlock">Class Unlock Quest</option>
      </select>
    </div>
    <div class="form-group">
      <label>Min Level</label>
      <input type="number" id="questMinLevel" value="1" min="1">
    </div>
    <div class="form-group">
      <label>Unlocks Quest (optional)</label>
      <input type="text" id="questUnlocks" placeholder="Quest ID that completes this quest to unlock">
    </div>
    
    <!-- Standard Quest Fields -->
    <div id="standardQuestFields">
      <div class="form-group">
        <label>Objectives (comma-separated)</label>
        <textarea id="questObjectives" placeholder="Kill 10 goblins, Collect 5 items"></textarea>
      </div>
      <div class="form-group">
        <label>Select Tasks</label>
        <div class="task-selector" id="questTaskSelector">Loading tasks...</div>
      </div>
      <div class="form-group">
        <label>Select Rewards (with drop chance %)</label>
        <div class="reward-selector" id="questRewardSelector">Loading rewards...</div>
      </div>
    </div>
    
    <!-- Choice Quest Fields -->
    <div id="choiceQuestFields" style="display:none;">
      <div class="form-group">
        <label>Quest Branches</label>
        <p style="color:#888;font-size:12px;margin-bottom:10px">Define the choices players can make</p>
        <div id="questBranchesContainer"></div>
        <button type="button" class="small" onclick="addQuestBranch()" style="margin-top:10px;background:#4a4f5a">+ Add Branch</button>
      </div>
    </div>
    
    <button class="btn-submit" onclick="submitQuest()">Create Quest</button>
    <button class="btn-cancel" onclick="closeQuestModal()">Cancel</button>
  </div>
</div>

<div id="dungeonModal" class="modal" style="align-items: flex-start !important; overflow-y: visible !important;">
  <div class="modal-content" style="max-height: none !important;">
    <div class="modal-header">
      <h3>Create Dungeon</h3>
      <button class="close-modal" onclick="closeDungeonModal()">&times;</button>
    </div>
    <div class="form-group">
      <label>Dungeon Name *</label>
      <input type="text" id="dungeonName" required>
    </div>
    <div class="form-group">
      <label>Description</label>
      <textarea id="dungeonDescription"></textarea>
    </div>
    <div class="form-group">
      <label>Difficulty</label>
      <select id="dungeonDifficulty">
        <option value="easy">Easy</option>
        <option value="normal" selected>Normal</option>
        <option value="hard">Hard</option>
      </select>
    </div>
    <div class="form-group">
      <label>Min Level</label>
      <input type="number" id="dungeonMinLevel" value="10">
    </div>
    <div class="form-group">
      <label>Bosses in Dungeon</label>
      <div id="dungeonBossSelector" style="background: #2a2f3a; border: 1px solid #3a3f4a; border-radius: 4px; padding: 10px; margin-bottom: 10px; max-height: 200px; overflow-y: auto;">
        <p style="opacity:0.6;margin:0">Loading bosses...</p>
      </div>
      <button type="button" style="width: 100%; padding: 8px; background: #3a3f4a; border: 1px solid #4a5f5a; border-radius: 4px; color: #e0e0e0; cursor: pointer; margin-top: 8px;" onclick="addBossToDungeon()">+ Add Boss</button>
    </div>
    <div class="form-group">
      <label>Select Rewards (with drop chance %)</label>
      <div class="reward-selector" id="dungeonRewardSelector">Loading rewards...</div>
    </div>
    <button class="btn-submit" onclick="submitDungeon()">Create Dungeon</button>
    <button class="btn-cancel" onclick="closeDungeonModal()">Cancel</button>
  </div>
</div>

<div id="raidModal" class="modal" style="align-items: flex-start !important; overflow-y: visible !important;">
  <div class="modal-content" style="max-height: none !important;">
    <div class="modal-header">
      <h3>Create Multi-Layer Raid</h3>
      <button class="close-modal" onclick="closeRaidModal()">&times;</button>
    </div>
    <div class="form-group">
      <label>Raid Name *</label>
      <input type="text" id="raidName" required>
    </div>
    <div class="form-group">
      <label>Description</label>
      <textarea id="raidDescription"></textarea>
    </div>
    <div class="form-group">
      <label>Number of Layers (Common → Legendary)</label>
      <input type="number" id="raidLayers" value="1" min="1" max="5">
    </div>
    <div class="form-group">
      <label>Max Team Size</label>
      <input type="number" id="raidTeamSize" value="4" min="1" max="10">
    </div>
    <div class="form-group">
      <label>Min Level</label>
      <input type="number" id="raidMinLevel" value="20">
    </div>
    <div class="form-group">
      <label>Bosses in Raid</label>
      <div id="raidBossSelector" style="background: #2a2f3a; border: 1px solid #3a3f4a; border-radius: 4px; padding: 10px; margin-bottom: 10px; max-height: 200px; overflow-y: auto;">
        <p style="opacity:0.6;margin:0">Loading bosses...</p>
      </div>
      <button type="button" style="width: 100%; padding: 8px; background: #3a3f4a; border: 1px solid #4a5f5a; border-radius: 4px; color: #e0e0e0; cursor: pointer; margin-top: 8px;" onclick="addBossToRaid()">+ Add Boss</button>
    </div>
    <div id="raidLayerRewards" style="border: 1px solid #3a3f4a; border-radius: 4px; padding: 15px; margin: 15px 0; background: #25282f;">
      <h4 style="margin-top: 0; color: #4ac1ff;">Layer Reward Packages</h4>
      <div id="raidLayerRewardsList"></div>
    </div>
    <button class="btn-submit" onclick="submitRaid()">Create Raid</button>
    <button class="btn-cancel" onclick="closeRaidModal()">Cancel</button>
  </div>
</div>

<div id="defenseQuestModal" class="modal" style="align-items: flex-start !important; overflow-y: visible !important;">
  <div class="modal-content" style="max-height: none !important;">
    <div class="modal-header">
      <h3>Town Defence Quest</h3>
      <button class="close-modal" onclick="closeDefenseQuestModal()">&times;</button>
    </div>
    <div class="form-group">
      <label>Quest Name *</label>
      <input type="text" id="defenseQuestTitle" required>
    </div>
    <div class="form-group">
      <label>Description</label>
      <textarea id="defenseQuestDescription"></textarea>
    </div>
    <div class="form-group">
      <label>Quest Type</label>
      <select id="defenseQuestType" onchange="toggleDefenseQuestTypeFields()">
        <option value="combat">Combat Quest</option>
        <option value="choice">Choice Quest</option>
      </select>
    </div>
    <div class="form-group">
      <label>Min Level</label>
      <input type="number" id="defenseQuestMinLevel" value="1" min="1">
    </div>
    <div class="form-group">
      <label>Unlocks Quest ID (optional)</label>
      <input type="text" id="defenseQuestUnlocks" placeholder="defense_shadowport">
    </div>
    
    <!-- Combat Quest Fields -->
    <div id="defenseQuestCombatFields">
      <h4 style="color:#9146ff;margin-top:15px">Enemy Details</h4>
      <div class="form-group">
        <label>Enemy Name *</label>
        <input type="text" id="defenseEnemyName" required>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="form-group">
          <label>Enemy Level</label>
          <input type="number" id="defenseEnemyLevel" value="1" min="1">
        </div>
        <div class="form-group">
          <label>Enemy HP</label>
          <input type="number" id="defenseEnemyHP" value="100" min="1">
        </div>
      </div>
      <h4 style="color:#9146ff;margin-top:15px">Enemy Stats</h4>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="form-group">
          <label>Strength</label>
          <input type="number" id="defenseEnemyStr" value="5" min="0">
        </div>
        <div class="form-group">
          <label>Defense</label>
          <input type="number" id="defenseEnemyDef" value="5" min="0">
        </div>
        <div class="form-group">
          <label>Intelligence</label>
          <input type="number" id="defenseEnemyInt" value="5" min="0">
        </div>
        <div class="form-group">
          <label>Agility</label>
          <input type="number" id="defenseEnemyAgi" value="5" min="0">
        </div>
      </div>
      <div class="form-group">
        <label>Skills (comma-separated)</label>
        <input type="text" id="defenseEnemySkills" placeholder="slash, shield_bash, fireball">
      </div>
    </div>
    
    <!-- Choice Quest Fields -->
    <div id="defenseQuestChoiceFields" style="display:none;">
      <p style="color:#888;font-size:12px;margin:10px 0">Choice quests with branches and outcomes should be created in the code file for now.</p>
    </div>
    
    <h4 style="color:#9146ff;margin-top:15px">Rewards</h4>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="form-group">
        <label>XP Reward</label>
        <input type="number" id="defenseRewardXP" value="100" min="0">
      </div>
      <div class="form-group">
        <label>Gold Reward</label>
        <input type="number" id="defenseRewardGold" value="50" min="0">
      </div>
    </div>
    <div class="form-group">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
        <input type="checkbox" id="defenseRewardUnlockClass" style="width:auto;margin:0">
        <span>Unlock Class on Completion</span>
      </label>
    </div>
    <div class="form-group">
      <label>Items (comma-separated: item_id x quantity)</label>
      <input type="text" id="defenseRewardItems" placeholder="health_potion x3, steel_sword x1">
    </div>
    
    <button class="btn-submit" onclick="submitDefenseQuest()">Save Town Defence Quest</button>
    <button class="btn-cancel" onclick="closeDefenseQuestModal()">Cancel</button>
  </div>
</div>

<div id="npcModal" class="modal" style="align-items: flex-start !important; overflow-y: visible !important;">
  <div class="modal-content" style="max-height: none !important;">
    <div class="modal-header">
      <h3>Create NPC</h3>
      <button class="close-modal" onclick="closeNPCModal()">&times;</button>
    </div>
    <div class="form-group">
      <label>NPC Name *</label>
      <input type="text" id="npcName" required>
    </div>
    <div class="form-group">
      <label>Description</label>
      <textarea id="npcDescription" placeholder="A brief description of the NPC"></textarea>
    </div>
    <div class="form-group">
      <label>NPC Type *</label>
      <select id="npcType" required>
        <option value="">-- Select Type --</option>
        <option value="merchant">Merchant (Sells Items)</option>
        <option value="questgiver">Quest Giver</option>
        <option value="innkeeper">Innkeeper</option>
        <option value="trainer">Trainer</option>
        <option value="generic">Generic NPC</option>
      </select>
    </div>
    <div class="form-group">
      <label>World *</label>
      <select id="npcWorld" required>
        <option value="">-- Select World --</option>
      </select>
    </div>
    <div class="form-group">
      <label>Location Description</label>
      <input type="text" id="npcLocation" placeholder="e.g., 'Tavern in the town center'">
    </div>
    <div class="form-group">
      <label>Dialogue Text</label>
      <textarea id="npcDialogue" placeholder="What the NPC says when interacted with"></textarea>
    </div>
    <div id="npcMerchantItems" class="form-group" style="display:none">
      <label>Items for Sale (comma-separated item IDs)</label>
      <input type="text" id="npcItems" placeholder="sword,shield,potion">
    </div>
    <div id="npcQuestGiverQuests" class="form-group" style="display:none">
      <label>Quests Offered</label>
      <div class="reward-selector" id="npcQuestSelector" style="max-height:200px;overflow-y:auto">
        <p style="opacity:0.6;margin:0">Loading quests...</p>
      </div>
    </div>
    <button class="btn-submit" onclick="submitNPC()">Create NPC</button>
    <button class="btn-cancel" onclick="closeNPCModal()">Cancel</button>
  </div>
</div>

<div id="itemModal" class="modal" style="align-items: flex-start !important; overflow-y: visible !important;">
  <div class="modal-content" style="max-height: none !important;">
    <div class="modal-header">
      <h3>Create Item</h3>
      <button class="close-modal" onclick="closeItemModal()">&times;</button>
    </div>
    <div class="form-group">
      <label>Item Name *</label>
      <input type="text" id="itemName" required>
    </div>
    <div class="form-group">
      <label>Description</label>
      <textarea id="itemDescription" placeholder="What is this item used for?"></textarea>
    </div>
    <div class="form-group">
      <label>Category *</label>
      <select id="itemCategory" required onchange="updateItemFormFields()">
        <option value="">-- Select Category --</option>
        <option value="weapon">Weapon</option>
        <option value="armor">Armor</option>
        <option value="consumable">Consumable</option>
        <option value="equipment">Equipment</option>
        <option value="gathering">Gathering</option>
        <option value="talent">Talent</option>
        <option value="misc">Miscellaneous</option>
      </select>
    </div>
    <div class="form-group" id="itemTypeGroup" style="display:none">
      <label>Item Type</label>
      <select id="itemType">
        <option value="">-- Select Type --</option>
      </select>
    </div>
    <div class="form-group">
      <label>Rarity *</label>
      <select id="itemRarity" required onchange="updateRarityColor()">
        <option value="">-- Select Rarity --</option>
        <option value="common">Common (Gray)</option>
        <option value="uncommon">Uncommon (Green)</option>
        <option value="rare">Rare (Blue)</option>
        <option value="epic">Epic (Purple)</option>
        <option value="legendary">Legendary (Orange)</option>
      </select>
      <div id="rarityPreview" style="margin-top:8px;padding:8px;border-radius:4px;background:#2a2f3a;color:#e0e0e0"></div>
    </div>
    <div class="form-group">
      <label>Value (Gold)</label>
      <input type="number" id="itemValue" value="10" min="0">
    </div>
    <div id="itemCombatStats" style="display:none">
      <div class="form-group">
        <label>Damage</label>
        <input type="number" id="itemDamage" value="0" min="0">
      </div>
      <div class="form-group">
        <label>Defense</label>
        <input type="number" id="itemDefense" value="0" min="0">
      </div>
    </div>
    <div id="itemHealingStats" style="display:none">
      <div class="form-group">
        <label>Heals HP</label>
        <input type="number" id="itemHeals" value="0" min="0">
      </div>
      <div class="form-group">
        <label>Restores Mana</label>
        <input type="number" id="itemRestoresMana" value="0" min="0">
      </div>
    </div>
    <div style="background:#3a3f4a;padding:12px;border-radius:4px;margin:15px 0">
      <h4 style="margin-top:0">Stat Bonuses</h4>
      <div class="form-group">
        <label>Strength Bonus</label>
        <input type="number" id="itemStrength" value="0" min="0">
      </div>
      <div class="form-group">
        <label>Intelligence Bonus</label>
        <input type="number" id="itemIntelligence" value="0" min="0">
      </div>
      <div class="form-group">
        <label>Wisdom Bonus</label>
        <input type="number" id="itemWisdom" value="0" min="0">
      </div>
      <div class="form-group">
        <label>Agility Bonus</label>
        <input type="number" id="itemAgility" value="0" min="0">
      </div>
      <div class="form-group">
        <label>Luck Bonus</label>
        <input type="number" id="itemLuck" value="0" min="0">
      </div>
      <div class="form-group">
        <label>HP Bonus</label>
        <input type="number" id="itemHP" value="0" min="0">
      </div>
      <div class="form-group">
        <label>Mana Bonus</label>
        <input type="number" id="itemMana" value="0" min="0">
      </div>
    </div>
    <div class="form-group">
      <label>Class Restriction (Optional - leave empty for all classes)</label>
      <select id="itemClassRestriction">
        <option value="">All Classes</option>
        <option value="warrior">Warrior</option>
        <option value="mage">Mage</option>
        <option value="rogue">Rogue</option>
        <option value="paladin">Paladin</option>
        <option value="ranger">Ranger</option>
        <option value="druid">Druid</option>
      </select>
    </div>
    <div class="form-group">
      <label>Level Requirement</label>
      <input type="number" id="itemLevelRequirement" value="1" min="1">
    </div>
    <div style="background:#3a3f4a;padding:12px;border-radius:4px;margin:15px 0">
      <h4 style="margin-top:0;color:#00d4ff;">⚙️ Recipe Materials (Resources needed to craft this item)</h4>
      <div class="form-group">
        <label>Add Material</label>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <select id="recipeMaterialSelect" style="flex:1;min-width:220px"></select>
          <input type="number" id="recipeMaterialQty" value="1" min="1" style="width:110px">
          <button type="button" class="btn-create" onclick="addMaterialToRecipe()" style="width:auto;padding:8px 14px">Add</button>
        </div>
      </div>
      <div class="form-group">
        <label>Selected Materials</label>
        <div id="recipeMaterialsList" class="reward-selector" style="max-height:220px"></div>
        <textarea id="itemRecipeMaterials" style="display:none"></textarea>
        <small style="color: #888;">Materials are saved automatically. Use the dropdown above to add materials.</small>
      </div>
      <div class="form-group">
        <label>Recipe Level Required</label>
        <input type="number" id="itemRecipeLevel" value="1" min="1">
      </div>
      <div class="form-group">
        <label>Craft Time (seconds)</label>
        <input type="number" id="itemCraftTime" value="5" min="1">
      </div>
    </div>
    <button class="btn-submit" onclick="submitItem()">Create Item</button>
    <button class="btn-cancel" onclick="closeItemModal()">Cancel</button>
  </div>
</div>

<!-- MATERIAL MODAL -->
<div id="materialModal" class="modal">
  <div class="modal-content">
    <div class="modal-header">
      <h3 id="materialModalTitle">Create Material</h3>
      <button class="close-modal" onclick="closeMaterialModal()">&times;</button>
    </div>
    <div class="form-group">
      <label>Material Name *</label>
      <input type="text" id="materialName" placeholder="Copper Ore">
    </div>
    <div class="form-group">
      <label>Material ID (optional)</label>
      <input type="text" id="materialId" placeholder="copper_ore">
    </div>
    <div class="form-group">
      <label>Rarity</label>
      <select id="materialRarity">
        <option value="common">Common</option>
        <option value="uncommon">Uncommon</option>
        <option value="rare">Rare</option>
        <option value="epic">Epic</option>
        <option value="legendary">Legendary</option>
      </select>
    </div>
    <div class="form-group">
      <label>Value (Gold)</label>
      <input type="number" id="materialValue" value="1" min="0">
    </div>
    <div class="form-group">
      <label>Drop Chance (%)</label>
      <input type="number" id="materialDropChance" value="100" min="0" max="100" placeholder="100">
    </div>
    <div class="form-group">
      <label>Gathering Level Required</label>
      <input type="number" id="materialAdventureLevel" value="1" min="1" placeholder="1" title="Minimum level needed to gather/obtain this material (Mining, Fishing, etc.)">
      <small style="color:#999;display:block;margin-top:4px">The gathering level (Mining=5, Fishing=3, etc.) player needs to obtain this material</small>
    </div>
    <div class="form-group">
      <label>Where to get it (select multiple)</label>
      <div style="background:#2a2f3a;padding:10px;border-radius:4px;max-height:150px;overflow-y:auto">
        <label style="display:block;margin-bottom:8px"><input type="checkbox" name="materialSource" value="adventure"> Adventure</label>
        <label style="display:block;margin-bottom:8px"><input type="checkbox" name="materialSource" value="high_level_adventure"> High Level Adventure</label>
        <label style="display:block;margin-bottom:8px"><input type="checkbox" name="materialSource" value="dungeons"> Dungeons</label>
        <label style="display:block;margin-bottom:8px"><input type="checkbox" name="materialSource" value="raids"> Raids</label>
        <label style="display:block;margin-bottom:8px"><input type="checkbox" name="materialSource" value="bosses"> Bosses</label>
        <label style="display:block;margin-bottom:8px"><input type="checkbox" name="materialSource" value="gathering"> Gathering</label>
        <label style="display:block;margin-bottom:8px"><input type="checkbox" name="materialSource" value="quests"> Quests</label>
        <label style="display:block;margin-bottom:0"><input type="checkbox" name="materialSource" value="vendor"> Vendor</label>
      </div>
    </div>
    <div id="gatheringCustomField" class="form-group" style="display:none">
      <label>Gathering Type</label>
      <select id="materialGatheringType">
        <option value="">-- Select Type --</option>
        <option value="Mining">Mining</option>
        <option value="Chopping">Chopping</option>
        <option value="Fishing">Fishing</option>
        <option value="Wildcrafting">Wildcrafting</option>
        <option value="Foraging">Foraging</option>
        <option value="Hunting">Hunting</option>
        <option value="Farming">Farming</option>
        <option value="Herbing">Herbing</option>
      </select>
    </div>
    <button class="btn-submit" onclick="submitMaterial()">Save Material</button>
    <button class="btn-cancel" onclick="closeMaterialModal()">Cancel</button>
  </div>
</div>

<div id="rewardPackageModal" class="modal" style="align-items: flex-start !important; overflow-y: visible !important;">
  <div class="modal-content" style="max-height: none !important;">
    <div class="modal-header">
      <h3 id="rewardPackageModalTitle">Create Reward Package</h3>
      <button class="close-modal" onclick="closeRewardPackageModal()">&times;</button>
    </div>
    <div class="form-group">
      <label>Reward ID *</label>
      <input type="text" id="rewardPackageId" required placeholder="reward_dungeon_1">
    </div>
    <div class="form-group">
      <label>Display Name *</label>
      <input type="text" id="rewardPackageName" required placeholder="Dungeon Clear Reward">
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px">
      <div class="form-group">
        <label>XP Reward</label>
        <input type="number" id="rewardPackageXP" value="0" min="0">
      </div>
      <div class="form-group">
        <label>Gold Reward</label>
        <input type="number" id="rewardPackageGold" value="0" min="0">
      </div>
    </div>
    <div class="form-group">
      <label>Select Items</label>
      <div style="margin-bottom:8px">
        <input type="text" id="rewardItemSearch" placeholder="🔍 Search items..." style="width:100%;padding:8px;background:#1a1f2e;border:1px solid #3a3f4a;border-radius:4px;color:#e0e0e0" oninput="filterRewardItems()">
      </div>
      <div id="rewardItemSelector" style="background:#2a2f3a;border:1px solid #3a3f4a;border-radius:4px;padding:10px;max-height:200px;overflow-y:auto">
        <p style="opacity:0.6;margin:0">Loading items...</p>
      </div>
    </div>
    <div class="form-group">
      <label>Select Materials</label>
      <div style="margin-bottom:8px">
        <input type="text" id="rewardMaterialSearch" placeholder="🔍 Search materials..." style="width:100%;padding:8px;background:#1a1f2e;border:1px solid #3a3f4a;border-radius:4px;color:#e0e0e0" oninput="filterRewardMaterials()">
      </div>
      <div id="rewardMaterialSelector" style="background:#2a2f3a;border:1px solid #3a3f4a;border-radius:4px;padding:10px;max-height:200px;overflow-y:auto">
        <p style="opacity:0.6;margin:0">Loading materials...</p>
      </div>
    </div>
    <button class="btn-submit" onclick="submitRewardPackage()" id="rewardPackageSubmitBtn">Create Reward Package</button>
    <button class="btn-cancel" onclick="closeRewardPackageModal()">Cancel</button>
  </div>
</div>

<script>
let currentEditorTab = 'worlds';
let currentQuestType = 'side';
let selectedWorldId = null;
let currentContentTab = 'quests';
let availableRewards = {};
let editingId = null; // Track if we're editing (vs creating)
let materialsCache = {};
let currentRecipeMaterials = {};
let editingMaterialId = null;

// Load all rewards for selectors
function loadAvailableRewards() {
  return fetch('/api/rewards', { credentials: 'include' })
    .then(r => r.json())
    .then(rewards => {
      availableRewards = rewards;
      return rewards;
    })
    .catch(err => {
      console.error('Error loading rewards:', err);
      return {};
    });
}

function renderRewardSelector(containerId, selectedRewards = {}) {
  const container = document.getElementById(containerId);
  const rewards = Object.entries(availableRewards);
  
  if (!rewards.length) {
    container.innerHTML = '<p style="opacity:0.6">No rewards available. Create rewards first!</p>';
    return;
  }
  
  const rewardsList = rewards.map(([id, reward]) => ({
    id,
    name: reward.name || id,
    xp: reward.xp || 0,
    gold: reward.gold || 0
  }));
  
  // Create search bar
  const searchHTML = '<div style="margin-bottom: 12px;"><input type="text" id="rewardSearch" placeholder="Search rewards..." style="width: 100%; padding: 8px 12px; background: #1a1f2e; border: 1px solid #3a3f4a; border-radius: 4px; color: #e0e0e0; font-size: 14px;" oninput="filterRewardsList(this.value, ' + "'" + containerId + "'" + ')"></div>';
  
  // Create rewards grid with click-to-select
  const rewardsHTML = rewardsList.map(reward => {
    const isSelected = selectedRewards[reward.id] !== undefined;
    const dropChance = selectedRewards[reward.id] || 100;
    const bgColor = isSelected ? '#2a3f3a' : '#1a1f2e';
    const borderColor = isSelected ? '#00aa00' : '#3a3f4a';
    const textColor = isSelected ? '#00ff00' : '#e0e0e0';
    const checkColor = isSelected ? '#00ff00' : '#666';
    const displayInput = isSelected ? 'block' : 'none';
    const checkMark = isSelected ? '✓' : '+';
    
    let html = '<div class="reward-card" onclick="toggleReward(this, ' + "'" + reward.id + "'" + ')" data-reward-id="' + reward.id + '" data-selected="' + isSelected + '" style="padding: 12px; margin: 8px 0; background: ' + bgColor + '; border: 2px solid ' + borderColor + '; border-radius: 6px; cursor: pointer; transition: all 0.2s; user-select: none;">';
    html += '<div style="display: flex; justify-content: space-between; align-items: start;">';
    html += '<div>';
    html += '<div style="font-weight: bold; color: ' + textColor + '">' + reward.name + '</div>';
    html += '<div style="font-size: 12px; color: #999; margin-top: 4px;">XP: ' + reward.xp + ' | Gold: ' + reward.gold + '</div>';
    html += '</div>';
    html += '<div style="color: ' + checkColor + '; font-size: 18px; font-weight: bold;">' + checkMark + '</div>';
    html += '</div>';
    html += '<input type="number" class="chance-input" min="1" max="100" value="' + dropChance + '" placeholder="%" data-reward-id="' + reward.id + '" style="width: 100%; margin-top: 8px; padding: 6px; background: #0a0f1e; border: 1px solid #3a3f4a; border-radius: 4px; color: #e0e0e0; display: ' + displayInput + ';">';
    html += '</div>';
    return html;
  }).join('');
  
  container.innerHTML = searchHTML + '<div id="rewardsGrid">' + rewardsHTML + '</div>';
}

function toggleReward(element, rewardId) {
  const isSelected = element.getAttribute('data-selected') === 'true';
  const chanceInput = element.querySelector('.chance-input');
  
  if (isSelected) {
    // Deselect
    element.setAttribute('data-selected', 'false');
    element.style.background = '#1a1f2e';
    element.style.borderColor = '#3a3f4a';
    element.querySelector('div:last-child').textContent = '+';
    element.querySelector('div:last-child').style.color = '#666';
    chanceInput.style.display = 'none';
  } else {
    // Select
    element.setAttribute('data-selected', 'true');
    element.style.background = '#2a3f3a';
    element.style.borderColor = '#00aa00';
    element.querySelector('div:last-child').textContent = '✓';
    element.querySelector('div:last-child').style.color = '#00ff00';
    chanceInput.style.display = 'block';
  }
}

function filterRewardsList(searchTerm, containerId) {
  const container = document.getElementById(containerId);
  const grid = container.querySelector('#rewardsGrid');
  const cards = grid.querySelectorAll('.reward-card');
  
  cards.forEach(card => {
    const rewardName = card.querySelector('div > div:first-child').textContent.toLowerCase();
    const matches = rewardName.includes(searchTerm.toLowerCase());
    card.style.display = matches ? 'block' : 'none';
  });
}

function toggleRewardChance(checkbox) {
  const rewardId = checkbox.getAttribute('data-reward-id');
  const chanceInput = document.getElementById('chance_' + rewardId);
  chanceInput.style.display = checkbox.checked ? 'block' : 'none';
}

function getSelectedRewards(containerId) {
  const container = document.getElementById(containerId);
  const selectedCards = container.querySelectorAll('.reward-card[data-selected="true"]');
  const selectedRewards = {};
  
  selectedCards.forEach(card => {
    const rewardId = card.getAttribute('data-reward-id');
    const chanceInput = card.querySelector('.chance-input');
    const chance = parseInt(chanceInput.value) || 100;
    selectedRewards[rewardId] = chance;
  });
  
  return selectedRewards;
}

// Predefined task options for quest creation
const availableTasks = [
  { id: 'kill_goblins', name: 'Kill Goblins', description: 'Eliminate goblin threats', hasCount: true, defaultCount: 10 },
  { id: 'kill_wolves', name: 'Kill Wolves', description: 'Hunt wild beasts', hasCount: true, defaultCount: 15 },
  { id: 'kill_bandits', name: 'Kill Bandits', description: 'Clear bandit camps', hasCount: true, defaultCount: 8 },
  { id: 'kill_undead', name: 'Kill Undead', description: 'Destroy undead creatures', hasCount: true, defaultCount: 20 },
  { id: 'kill_dragons', name: 'Kill Dragons', description: 'Slay mighty dragons', hasCount: true, defaultCount: 1 },
  { id: 'collect_herbs', name: 'Collect Healing Herbs', description: 'Gather medicinal plants', hasCount: true, defaultCount: 5 },
  { id: 'collect_ore', name: 'Collect Iron Ore', description: 'Mine resources', hasCount: true, defaultCount: 10 },
  { id: 'gather_wood', name: 'Gather Wood', description: 'Collect timber', hasCount: true, defaultCount: 20 },
  { id: 'collect_crystals', name: 'Collect Magic Crystals', description: 'Find rare crystals', hasCount: true, defaultCount: 3 },
  { id: 'collect_pelts', name: 'Collect Animal Pelts', description: 'Hunt and skin animals', hasCount: true, defaultCount: 12 },
  { id: 'defeat_boss', name: 'Defeat Boss', description: 'Eliminate the boss', hasCount: false },
  { id: 'explore_cave', name: 'Explore Dark Cave', description: 'Venture into the cave', hasCount: false },
  { id: 'explore_ruins', name: 'Explore Ancient Ruins', description: 'Discover lost ruins', hasCount: false },
  { id: 'craft_weapon', name: 'Craft Weapon', description: 'Forge a weapon', hasCount: true, defaultCount: 1 },
  { id: 'craft_armor', name: 'Craft Armor', description: 'Create armor pieces', hasCount: true, defaultCount: 1 },
  { id: 'craft_potions', name: 'Craft Potions', description: 'Brew healing potions', hasCount: true, defaultCount: 5 },
  { id: 'reach_level', name: 'Reach Level', description: 'Gain experience', hasCount: true, defaultCount: 10 },
  { id: 'earn_gold', name: 'Earn Gold', description: 'Accumulate wealth', hasCount: true, defaultCount: 1000 },
  { id: 'spend_gold', name: 'Spend Gold', description: 'Purchase items', hasCount: true, defaultCount: 500 },
  { id: 'complete_dungeon', name: 'Complete Dungeon', description: 'Finish dungeons', hasCount: true, defaultCount: 3 },
  { id: 'complete_raids', name: 'Complete Raids', description: 'Finish raid encounters', hasCount: true, defaultCount: 1 },
  { id: 'talk_npc', name: 'Talk to NPC', description: 'Speak with NPC', hasCount: false },
  { id: 'find_artifact', name: 'Find Ancient Artifact', description: 'Discover rare item', hasCount: false },
  { id: 'escort_npc', name: 'Escort Traveler', description: 'Protect NPC during travel', hasCount: false },
  { id: 'defend_village', name: 'Defend Village', description: 'Protect settlement from attack', hasCount: false },
  { id: 'hunt_rare_creature', name: 'Hunt Rare Creature', description: 'Track and defeat', hasCount: false },
  { id: 'deliver_package', name: 'Deliver Package', description: 'Complete delivery mission', hasCount: false },
  { id: 'learn_skill', name: 'Learn New Skill', description: 'Train with master', hasCount: false },
  { id: 'win_tournament', name: 'Win Arena Tournament', description: 'Defeat all challengers', hasCount: false },
  { id: 'solve_puzzle', name: 'Solve Ancient Puzzle', description: 'Unlock secrets', hasCount: false },
  { id: 'deal_damage', name: 'Deal Damage', description: 'Deal total damage in combat', hasCount: true, defaultCount: 10000 },
  { id: 'use_abilities', name: 'Use Abilities', description: 'Cast spells or use skills', hasCount: true, defaultCount: 20 },
  { id: 'heal_allies', name: 'Heal Allies', description: 'Restore ally health', hasCount: true, defaultCount: 10 },
  { id: 'critical_hits', name: 'Land Critical Hits', description: 'Score critical strikes', hasCount: true, defaultCount: 15 },
  { id: 'block_attacks', name: 'Block Attacks', description: 'Successfully block enemy hits', hasCount: true, defaultCount: 25 },
  { id: 'dodge_attacks', name: 'Dodge Attacks', description: 'Evade enemy attacks', hasCount: true, defaultCount: 30 },
  { id: 'upgrade_equipment', name: 'Upgrade Equipment', description: 'Enhance your gear', hasCount: true, defaultCount: 3 },
  { id: 'trade_items', name: 'Trade Items', description: 'Buy or sell with vendors', hasCount: true, defaultCount: 10 }
];

function renderTaskSelector(selectedTasks = []) {
  const container = document.getElementById('questTaskSelector');
  
  // Create search bar
  const searchHTML = '<div style="margin-bottom: 12px;"><input type="text" id="taskSearch" placeholder="Search tasks..." style="width: 100%; padding: 8px 12px; background: #1a1f2e; border: 1px solid #3a3f4a; border-radius: 4px; color: #e0e0e0; font-size: 14px;" oninput="filterTasksList(this.value)"></div>';
  
  // Create tasks grid with click-to-select (no checkboxes)
  const tasksHTML = availableTasks.map(task => {
    const isSelected = selectedTasks.includes(task.id);
    const bgColor = isSelected ? '#2a3f3a' : '#1a1f2e';
    const borderColor = isSelected ? '#00aa00' : '#3a3f4a';
    const textColor = isSelected ? '#00ff00' : '#e0e0e0';
    const checkColor = isSelected ? '#00ff00' : '#666';
    const checkMark = isSelected ? '✓' : '+';
    const displayInput = isSelected && task.hasCount ? 'block' : 'none';
    
    let html = '<div class="task-card" onclick="toggleTask(this, ' + "'" + task.id + "'" + ')" data-task-id="' + task.id + '" data-selected="' + isSelected + '" data-has-count="' + task.hasCount + '" style="padding: 12px; margin: 8px 0; background: ' + bgColor + '; border: 2px solid ' + borderColor + '; border-radius: 6px; cursor: pointer; transition: all 0.2s; user-select: none;">';
    html += '<div style="display: flex; justify-content: space-between; align-items: start;">';
    html += '<div style="flex: 1;">';
    html += '<div style="font-weight: bold; color: ' + textColor + '">' + task.name + '</div>';
    html += '<div style="font-size: 12px; color: #999; margin-top: 4px;">' + task.description + '</div>';
    html += '</div>';
    html += '<div style="color: ' + checkColor + '; font-size: 18px; font-weight: bold; margin-left: 10px;">' + checkMark + '</div>';
    html += '</div>';
    if (task.hasCount) {
      html += '<input type="number" class="count-input" min="1" value="' + (task.defaultCount || 1) + '" placeholder="Count" onclick="event.stopPropagation()" data-task-id="' + task.id + '" style="width: 100%; margin-top: 8px; padding: 6px; background: #0a0f1e; border: 1px solid #3a3f4a; border-radius: 4px; color: #e0e0e0; display: ' + displayInput + ';">';
    }
    html += '</div>';
    return html;
  }).join('');
  
  container.innerHTML = searchHTML + '<div id="tasksGrid" style="max-height: 300px; overflow-y: auto;">' + tasksHTML + '</div>';
}

function toggleTask(element, taskId) {
  const isSelected = element.getAttribute('data-selected') === 'true';
  const hasCount = element.getAttribute('data-has-count') === 'true';
  const nameDiv = element.querySelector('div > div > div:first-child');
  const checkMark = element.querySelector('div > div:last-child');
  const countInput = element.querySelector('.count-input');
  
  if (isSelected) {
    // Deselect
    element.setAttribute('data-selected', 'false');
    element.style.background = '#1a1f2e';
    element.style.borderColor = '#3a3f4a';
    nameDiv.style.color = '#e0e0e0';
    checkMark.textContent = '+';
    checkMark.style.color = '#666';
    if (countInput) countInput.style.display = 'none';
  } else {
    // Select
    element.setAttribute('data-selected', 'true');
    element.style.background = '#2a3f3a';
    element.style.borderColor = '#00aa00';
    nameDiv.style.color = '#00ff00';
    checkMark.textContent = '✓';
    checkMark.style.color = '#00ff00';
    if (countInput) countInput.style.display = 'block';
  }
}

function filterTasksList(searchTerm) {
  const grid = document.getElementById('tasksGrid');
  const cards = grid.querySelectorAll('.task-card');
  
  cards.forEach(card => {
    const taskName = card.querySelector('div > div > div:first-child').textContent.toLowerCase();
    const taskDesc = card.querySelector('div > div > div:nth-child(2)').textContent.toLowerCase();
    const matches = taskName.includes(searchTerm.toLowerCase()) || taskDesc.includes(searchTerm.toLowerCase());
    card.style.display = matches ? 'block' : 'none';
  });
}

function getSelectedTasks() {
  const container = document.getElementById('questTaskSelector');
  const selectedCards = container.querySelectorAll('.task-card[data-selected="true"]');
  const selectedTasks = [];
  
  selectedCards.forEach(card => {
    const taskId = card.getAttribute('data-task-id');
    const taskData = availableTasks.find(t => t.id === taskId);
    if (taskData) {
      let taskName = taskData.name;
      if (taskData.hasCount) {
        const countInput = card.querySelector('.count-input');
        const count = countInput ? (parseInt(countInput.value) || taskData.defaultCount) : taskData.defaultCount;
        taskName = taskName + ' (' + count + ')';
      }
      selectedTasks.push(taskName);
    }
  });
  
  return selectedTasks;
}

function switchEditorTab(tab) {
  currentEditorTab = tab;
  document.querySelectorAll('.editor-section').forEach(e => e.classList.remove('active'));
  document.getElementById('editor-' + tab).classList.add('active');
  document.querySelectorAll('.editor-tabs button').forEach(b => {
    b.classList.toggle('active', b.textContent.toLowerCase().includes(tab));
  });
  
  if (tab === 'worlds') loadWorlds();
  if (tab === 'npcs') loadNPCs();
  if (tab === 'items') loadItems();
  if (tab === 'materials') loadMaterials();
  if (tab === 'rewards') loadRewards();
}

function switchQuestType(type, el) {
  currentQuestType = type;
  document.querySelectorAll('.quest-types button').forEach(b => b.classList.remove('active'));
  if (el && el.classList) el.classList.add('active');
  if (selectedWorldId) loadWorldQuests(selectedWorldId, type);
}

function switchContentTab(tab) {
  currentContentTab = tab;
  document.querySelectorAll('.content-section-inner').forEach(e => e.classList.remove('active'));
  document.getElementById('world-' + tab).classList.add('active');
  document.querySelectorAll('.content-tabs button').forEach(b => {
    b.classList.toggle('active', b.textContent.toLowerCase().includes(tab));
  });
  
  if (selectedWorldId) {
    if (tab === 'quests') loadWorldQuests(selectedWorldId, currentQuestType);
    if (tab === 'town-defence') loadTownDefenceQuests();
    if (tab === 'bosses') loadWorldBosses(selectedWorldId);
    if (tab === 'dungeons') loadWorldDungeons(selectedWorldId);
    if (tab === 'raids') loadWorldRaids(selectedWorldId);
  }
}

function loadWorlds() {
  fetch('/api/editor/worlds', { credentials: 'include' })
    .then(r => {
      if (!r.ok) throw new Error('Failed to load worlds');
      return r.json();
    })
    .then(worlds => {
      const container = document.getElementById('worlds-list');
      if (!worlds || !worlds.length) {
        container.innerHTML = '<p style="text-align:center;opacity:0.6">No worlds yet. Create your first world!</p>';
        return;
      }
      container.innerHTML = worlds.map(w => \`
        <div class="item-card" onclick="selectWorld('\${w.id}', '\${w.name}')">
          <h3>\${w.name}</h3>
          <p>\${w.description || 'No description'}</p>
          <p><strong>Level:</strong> \${w.minLevel || 1} - \${w.maxLevel || 50}</p>
          <div class="item-actions" onclick="event.stopPropagation()">
            <button class="btn-view" onclick="selectWorld('\${w.id}', '\${w.name}')">Manage Content</button>
            <button class="btn-edit" onclick="editWorld('\${w.id}')">Edit</button>
          </div>
        </div>
      \`).join('');
    })
    .catch(err => {
      const container = document.getElementById('worlds-list');
      container.innerHTML = '<p style="color: #ff6b6b; text-align:center;">Error loading worlds: ' + err.message + '</p>';
      console.error('Error loading worlds:', err);
    });
}

function selectWorld(worldId, worldName) {
  selectedWorldId = worldId;
  document.getElementById('world-content-title').textContent = worldName + ' - Content';
  document.getElementById('world-content-panel').style.display = 'block';
  document.getElementById('worlds-list').style.display = 'none';
  document.querySelector('.btn-create').style.display = 'none';
  
  // Load initial content
  loadWorldQuests(worldId, currentQuestType);
}

function closeWorldContent() {
  selectedWorldId = null;
  document.getElementById('world-content-panel').style.display = 'none';
  document.getElementById('worlds-list').style.display = 'grid';
  document.querySelector('.btn-create').style.display = 'block';
}

// Helper function to format reward display
function formatRewardsDisplay(rewards) {
  if (!rewards || Object.keys(rewards).length === 0) return '';
  const rewardParts = [];
  for (const [rewardId, dropChance] of Object.entries(rewards)) {
    const reward = availableRewards[rewardId];
    const rewardName = reward?.name || rewardId;
    rewardParts.push(rewardName + ' (' + (dropChance || 100) + '%)');
  }
  return rewardParts.length > 0 ? '<p><strong>Rewards:</strong> ' + rewardParts.join(', ') + '</p>' : '';
}

function loadWorldQuests(worldId, type) {
  loadAvailableRewards().then(() => {
    fetch('/api/editor/quests?worldId=' + worldId, { credentials: 'include' })
      .then(r => {
        if (!r.ok) throw new Error('Server returned ' + r.status);
        return r.json();
      })
      .then(data => {
        // Filter out NPC-exclusive quests and town defence quests (starting with defense_)
        const quests = (data[type] || []).filter(q => !q.npcId && (!q.id || !q.id.startsWith('defense_')));
        const container = document.getElementById('world-quests-list');
        if (!quests.length) {
          container.innerHTML = '<p style="opacity:0.6">No ' + type + ' quests for this world yet</p>';
          return;
        }
        container.innerHTML = quests.map(q => \`
          <div class="item-card">
            <h3>\${q.title || q.name}</h3>
            <p style="opacity:0.7;font-size:0.85em">ID: <code>\${q.id}</code></p>
            <p>\${q.description || 'No description'}</p>
            \${q.objectives ? '<p><strong>Objectives:</strong> ' + q.objectives.join(', ') + '</p>' : ''}
            \${formatRewardsDisplay(q.rewards || {})}
            <div class="item-actions">
              <button class="btn-edit" onclick="editQuest('\${q.id}')">Edit</button>
              <button class="btn-delete" onclick="deleteQuest('\${q.id}')">Delete</button>
            </div>
          </div>
        \`).join('');
      })
      .catch(err => {
        console.error('Error loading quests:', err);
        const container = document.getElementById('world-quests-list');
        container.innerHTML = '<p style="color:#ff6b6b">Error loading quests: ' + err.message + '</p>';
      });
  });
}

function loadWorldBosses(worldId) {
  loadAvailableRewards().then(() => {
    fetch('/api/editor/bosses?worldId=' + worldId, { credentials: 'include' })
      .then(r => r.json())
      .then(bosses => {
        const container = document.getElementById('world-bosses-list');
        if (!bosses.length) {
          container.innerHTML = '<p style="opacity:0.6">No bosses for this world yet</p>';
          return;
        }
        container.innerHTML = bosses.map(b => \`
          <div class="item-card">
            <h3>\${b.name}</h3>
            <p>\${b.description || 'No description'}</p>
            <p><strong>HP:</strong> \${b.hp} | <strong>Level:</strong> \${b.level}</p>
            \${formatRewardsDisplay(b.rewards || {})}
            <div class="item-actions">
              <button class="btn-edit" onclick="editBoss('\${b.id}')">Edit</button>
              <button class="btn-delete" onclick="deleteBoss('\${b.id}')">Delete</button>
            </div>
          </div>
        \`).join('');
      });
  });
}

function loadWorldDungeons(worldId) {
  loadAvailableRewards().then(() => {
    fetch('/api/editor/dungeons?worldId=' + worldId, { credentials: 'include' })
      .then(r => r.json())
      .then(dungeons => {
        const container = document.getElementById('world-dungeons-list');
        if (!dungeons.length) {
          container.innerHTML = '<p style="opacity:0.6">No dungeons for this world yet</p>';
          return;
        }
        
        // Load boss names for each dungeon
        Promise.all(dungeons.map(d => {
          if (!d.bosses || d.bosses.length === 0) return Promise.resolve({ ...d, bossNames: [] });
          return Promise.all(d.bosses.map(bossId => fetch('/api/editor/bosses/' + bossId, { credentials: 'include' }).then(r => r.json()).catch(() => null)))
            .then(bosses => ({ ...d, bossNames: bosses.filter(b => b).map(b => b.name) }));
        })).then(dungeonsWithBosses => {
          container.innerHTML = dungeonsWithBosses.map(d => {
            const bossesDisplay = d.bossNames && d.bossNames.length > 0 ? '<p><strong>Bosses:</strong> ' + d.bossNames.join(', ') + '</p>' : '';
            return '<div class="item-card"><h3>' + d.name + '</h3><p>' + (d.description || 'No description') + '</p><p><strong>Difficulty:</strong> ' + (d.difficulty || 'normal') + '</p>' + bossesDisplay + formatRewardsDisplay(d.rewards || {}) + '<div class="item-actions"><button class="btn-edit dungeon-edit" data-id="' + d.id + '">Edit</button><button class="btn-delete dungeon-delete" data-id="' + d.id + '">Delete</button></div></div>';
          }).join('');
          document.querySelectorAll('.dungeon-edit').forEach(btn => btn.addEventListener('click', function() { editDungeon(this.getAttribute('data-id')); }));
          document.querySelectorAll('.dungeon-delete').forEach(btn => btn.addEventListener('click', function() { deleteDungeon(this.getAttribute('data-id')); }));
        });
      });
  });
}

function loadWorldRaids(worldId) {
  loadAvailableRewards().then(() => {
    fetch('/api/editor/raids?worldId=' + worldId, { credentials: 'include' })
      .then(r => r.json())
      .then(raids => {
        const container = document.getElementById('world-raids-list');
        if (!raids.length) {
          container.innerHTML = '<p style="opacity:0.6">No raids for this world yet</p>';
          return;
        }
        
        // Load boss names for each raid
        Promise.all(raids.map(r => {
          if (!r.bosses || r.bosses.length === 0) return Promise.resolve({ ...r, bossNames: [] });
          return Promise.all(r.bosses.map(bossId => fetch('/api/editor/bosses/' + bossId, { credentials: 'include' }).then(res => res.json()).catch(() => null)))
            .then(bosses => ({ ...r, bossNames: bosses.filter(b => b).map(b => b.name) }));
        })).then(raidsWithBosses => {
          container.innerHTML = raidsWithBosses.map(r => {
            const bossesDisplay = r.bossNames && r.bossNames.length > 0 ? '<p><strong>Bosses:</strong> ' + r.bossNames.join(', ') + '</p>' : '';
            return '<div class="item-card"><h3>' + r.name + '</h3><p>' + (r.description || 'No description') + '</p><p><strong>Floors:</strong> ' + (r.floors?.length || 1) + ' | <strong>Min Level:</strong> ' + r.minLevel + '</p>' + bossesDisplay + formatRewardsDisplay(r.rewards || {}) + '<div class="item-actions"><button class="btn-edit raid-edit" data-id="' + r.id + '">Edit</button><button class="btn-delete raid-delete" data-id="' + r.id + '">Delete</button></div></div>';
          }).join('');
          document.querySelectorAll('.raid-edit').forEach(btn => btn.addEventListener('click', function() { editRaid(this.getAttribute('data-id')); }));
          document.querySelectorAll('.raid-delete').forEach(btn => btn.addEventListener('click', function() { deleteRaid(this.getAttribute('data-id')); }));
        });
      });
  });
}

// Town Defence Quest Management
function loadTownDefenceQuests() {
  fetch('/api/defense-quests', { credentials: 'include' })
    .then(r => r.json())
    .then(quests => {
      const container = document.getElementById('town-defence-list');
      if (!quests || !quests.length) {
        container.innerHTML = '<p style="opacity:0.6">No town defence quests found</p>';
        return;
      }
      
      container.innerHTML = quests.map(q => \`
        <div class="item-card">
          <h3>\${q.name}</h3>
          <p style="opacity:0.7;font-size:0.85em">ID: <code>\${q.id}</code></p>
          <p>\${q.description || 'No description'}</p>
          <p><strong>Type:</strong> \${q.type} | <strong>Min Level:</strong> \${q.minLevel}</p>
          \${q.unlocks ? '<p><strong>Unlocks:</strong> ' + q.unlocks + '</p>' : ''}
          \${q.type === 'combat' && q.enemy ? '<p><strong>Enemy:</strong> ' + q.enemy.name + ' (Lvl ' + q.enemy.level + ', ' + q.enemy.hp + ' HP)</p>' : ''}
          \${q.type === 'choice' && q.branches ? '<p><strong>Choices:</strong> ' + q.branches.length + ' branches</p>' : ''}
          \${q.reward ? '<p><strong>Reward:</strong> ' + q.reward.xp + ' XP, ' + q.reward.gold + ' Gold' + (q.reward.unlockClass ? ', <strong>🎓 Class Unlock</strong>' : '') + '</p>' : ''}
          <div class="item-actions">
            <button class="btn-view" onclick="viewTownDefenceQuest('\${q.id}')">View Details</button>
            <button class="btn-edit" onclick="editTownDefenceQuest('\${q.id}')">Edit</button>
            <button class="btn-delete" onclick="deleteTownDefenceQuest('\${q.id}')">Delete</button>
          </div>
        </div>
      \`).join('');
    })
    .catch(err => {
      console.error('Error loading town defence quests:', err);
      document.getElementById('town-defence-list').innerHTML = '<p style="color:#ff6b6b">Error loading town defence quests</p>';
    });
}

function createTownDefenceQuest() {
  editingDefenseQuestId = null;
  
  // Reset form
  document.getElementById('defenseQuestTitle').value = '';
  document.getElementById('defenseQuestDescription').value = '';
  document.getElementById('defenseQuestType').value = 'combat';
  document.getElementById('defenseQuestMinLevel').value = '1';
  document.getElementById('defenseQuestUnlocks').value = '';
  document.getElementById('defenseEnemyName').value = '';
  document.getElementById('defenseEnemyLevel').value = '1';
  document.getElementById('defenseEnemyHP').value = '100';
  document.getElementById('defenseEnemyStr').value = '5';
  document.getElementById('defenseEnemyDef').value = '5';
  document.getElementById('defenseEnemyInt').value = '5';
  document.getElementById('defenseEnemyAgi').value = '5';
  document.getElementById('defenseEnemySkills').value = '';
  document.getElementById('defenseRewardXP').value = '100';
  document.getElementById('defenseRewardGold').value = '50';
  document.getElementById('defenseRewardUnlockClass').checked = false;
  document.getElementById('defenseRewardItems').value = '';
  
  toggleDefenseQuestTypeFields();
  document.getElementById('defenseQuestModal').classList.add('active');
}

function viewTownDefenceQuest(questId) {
  fetch('/api/defense-quests/' + questId, { credentials: 'include' })
    .then(r => r.json())
    .then(quest => {
      let detailsHTML = '<div style="background:#1a1d23;padding:20px;border-radius:8px;border:2px solid #9146ff">';
      detailsHTML += '<h2 style="color:#9146ff;margin-bottom:15px">' + quest.name + '</h2>';
      detailsHTML += '<p style="margin-bottom:10px">' + quest.description + '</p>';
      detailsHTML += '<p><strong>Type:</strong> ' + quest.type + '</p>';
      detailsHTML += '<p><strong>Min Level:</strong> ' + quest.minLevel + '</p>';
      
      if (quest.unlocks) {
        detailsHTML += '<p><strong>Unlocks:</strong> ' + quest.unlocks + '</p>';
      }
      
      if (quest.type === 'combat' && quest.enemy) {
        detailsHTML += '<h3 style="color:#9146ff;margin-top:15px">Enemy</h3>';
        detailsHTML += '<p><strong>Name:</strong> ' + quest.enemy.name + '</p>';
        detailsHTML += '<p><strong>Level:</strong> ' + quest.enemy.level + '</p>';
        detailsHTML += '<p><strong>HP:</strong> ' + quest.enemy.hp + '</p>';
        detailsHTML += '<p><strong>Stats:</strong> STR ' + quest.enemy.stats.strength + ', DEF ' + quest.enemy.stats.defense + ', INT ' + quest.enemy.stats.intelligence + ', AGI ' + quest.enemy.stats.agility + '</p>';
        if (quest.enemy.skills) {
          detailsHTML += '<p><strong>Skills:</strong> ' + quest.enemy.skills.join(', ') + '</p>';
        }
      }
      
      if (quest.type === 'choice' && quest.branches) {
        detailsHTML += '<h3 style="color:#9146ff;margin-top:15px">Choices</h3>';
        quest.branches.forEach((branch, idx) => {
          detailsHTML += '<div style="background:rgba(255,255,255,0.05);padding:10px;border-radius:4px;margin-bottom:10px">';
          detailsHTML += '<p><strong>' + (idx + 1) + '. ' + branch.title + '</strong></p>';
          detailsHTML += '<p style="font-size:0.9em;opacity:0.8">' + branch.description + '</p>';
          detailsHTML += '</div>';
        });
        
        if (quest.outcomes) {
          detailsHTML += '<h3 style="color:#9146ff;margin-top:15px">Outcomes</h3>';
          quest.outcomes.forEach((outcome, idx) => {
            detailsHTML += '<div style="background:rgba(255,255,255,0.05);padding:10px;border-radius:4px;margin-bottom:10px">';
            detailsHTML += '<p><strong>' + outcome.title + '</strong> ' + (outcome.isNegative ? '❌' : '✅') + '</p>';
            detailsHTML += '<p style="font-size:0.9em;opacity:0.8">' + outcome.description + '</p>';
            if (outcome.reward) {
              detailsHTML += '<p style="font-size:0.85em"><strong>Reward:</strong> ' + outcome.reward.xp + ' XP, ' + outcome.reward.gold + ' Gold</p>';
            }
            detailsHTML += '</div>';
          });
        }
      }
      
      if (quest.reward) {
        detailsHTML += '<h3 style="color:#9146ff;margin-top:15px">Rewards</h3>';
        detailsHTML += '<p><strong>XP:</strong> ' + quest.reward.xp + '</p>';
        detailsHTML += '<p><strong>Gold:</strong> ' + quest.reward.gold + '</p>';
        if (quest.reward.unlockClass) {
          detailsHTML += '<p style="color:#ffa500"><strong>🎓 Class Unlock: Enabled</strong></p>';
        }
        if (quest.reward.items && quest.reward.items.length > 0) {
          detailsHTML += '<p><strong>Items:</strong></p><ul>';
          quest.reward.items.forEach(item => {
            detailsHTML += '<li>' + item.id + ' x' + (item.quantity || 1) + '</li>';
          });
          detailsHTML += '</ul>';
        }
      }
      
      detailsHTML += '<button onclick="closeTownDefenceDetails()" style="margin-top:20px;padding:10px 20px;background:#9146ff;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:bold">Close</button>';
      detailsHTML += '</div>';
      
      const modal = document.createElement('div');
      modal.id = 'townDefenceDetailsModal';
      modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:10000;display:flex;justify-content:center;align-items:flex-start;overflow-y:auto;padding:20px';
      modal.innerHTML = '<div style="width:90%;max-width:800px;margin:20px auto">' + detailsHTML + '</div>';
      document.body.appendChild(modal);
    })
    .catch(err => {
      console.error('Error loading quest details:', err);
      alert('Failed to load quest details');
    });
}

function closeTownDefenceDetails() {
  const modal = document.getElementById('townDefenceDetailsModal');
  if (modal) modal.remove();
}

function editTownDefenceQuest(questId) {
  fetch('/api/defense-quests/' + questId, { credentials: 'include' })
    .then(r => r.json())
    .then(quest => {
      editingDefenseQuestId = questId;
      
      // Populate the defense quest modal
      document.getElementById('defenseQuestTitle').value = quest.name || '';
      document.getElementById('defenseQuestDescription').value = quest.description || '';
      document.getElementById('defenseQuestType').value = quest.type || 'combat';
      document.getElementById('defenseQuestMinLevel').value = quest.minLevel || 1;
      document.getElementById('defenseQuestUnlocks').value = quest.unlocks || '';
      
      // Enemy details for combat quests
      if (quest.type === 'combat' && quest.enemy) {
        document.getElementById('defenseEnemyName').value = quest.enemy.name || '';
        document.getElementById('defenseEnemyLevel').value = quest.enemy.level || 1;
        document.getElementById('defenseEnemyHP').value = quest.enemy.hp || 100;
        document.getElementById('defenseEnemyStr').value = quest.enemy.stats?.strength || 0;
        document.getElementById('defenseEnemyDef').value = quest.enemy.stats?.defense || 0;
        document.getElementById('defenseEnemyInt').value = quest.enemy.stats?.intelligence || 0;
        document.getElementById('defenseEnemyAgi').value = quest.enemy.stats?.agility || 0;
        document.getElementById('defenseEnemySkills').value = quest.enemy.skills?.join(', ') || '';
      }
      
      // Reward details
      if (quest.reward) {
        document.getElementById('defenseRewardXP').value = quest.reward.xp || 0;
        document.getElementById('defenseRewardGold').value = quest.reward.gold || 0;
        document.getElementById('defenseRewardUnlockClass').checked = quest.reward.unlockClass || false;
        document.getElementById('defenseRewardItems').value = quest.reward.items?.map(i => i.id + ' x' + (i.quantity || 1)).join(', ') || '';
      }
      
      toggleDefenseQuestTypeFields();
      document.getElementById('defenseQuestModal').classList.add('active');
    })
    .catch(err => {
      console.error('Error loading defense quest:', err);
      alert('Failed to load quest for editing');
    });
}

function deleteTownDefenceQuest(questId) {
  if (!confirm('Are you sure you want to delete this town defence quest?')) return;
  
  fetch('/api/defense-quests/' + questId, {
    method: 'DELETE',
    credentials: 'include'
  })
    .then(r => r.json())
    .then(() => {
      loadTownDefenceQuests();
    })
    .catch(err => {
      console.error('Error deleting defense quest:', err);
      alert('Failed to delete quest');
    });
}

function toggleDefenseQuestTypeFields() {
  const type = document.getElementById('defenseQuestType').value;
  document.getElementById('defenseQuestCombatFields').style.display = type === 'combat' ? 'block' : 'none';
  document.getElementById('defenseQuestChoiceFields').style.display = type === 'choice' ? 'block' : 'none';
}

function closeDefenseQuestModal() {
  document.getElementById('defenseQuestModal').classList.remove('active');
  editingDefenseQuestId = null;
}

let editingDefenseQuestId = null;

function submitDefenseQuest() {
  const name = document.getElementById('defenseQuestTitle').value;
  if (!name) {
    alert('Please enter a quest name');
    return;
  }
  
  const type = document.getElementById('defenseQuestType').value;
  const questData = {
    id: editingDefenseQuestId || 'defense_' + Date.now(),
    name: name,
    description: document.getElementById('defenseQuestDescription').value,
    type: type,
    minLevel: parseInt(document.getElementById('defenseQuestMinLevel').value) || 1,
    unlocks: document.getElementById('defenseQuestUnlocks').value || null
  };
  
  // Add enemy for combat quests
  if (type === 'combat') {
    const enemyName = document.getElementById('defenseEnemyName').value;
    if (!enemyName) {
      alert('Please enter an enemy name for combat quests');
      return;
    }
    
    questData.enemy = {
      name: enemyName,
      level: parseInt(document.getElementById('defenseEnemyLevel').value) || 1,
      hp: parseInt(document.getElementById('defenseEnemyHP').value) || 100,
      stats: {
        strength: parseInt(document.getElementById('defenseEnemyStr').value) || 5,
        defense: parseInt(document.getElementById('defenseEnemyDef').value) || 5,
        intelligence: parseInt(document.getElementById('defenseEnemyInt').value) || 5,
        agility: parseInt(document.getElementById('defenseEnemyAgi').value) || 5
      },
      skills: document.getElementById('defenseEnemySkills').value.split(',').map(s => s.trim()).filter(s => s)
    };
  }
  
  // Add rewards
  const itemsStr = document.getElementById('defenseRewardItems').value;
  const items = [];
  if (itemsStr) {
    itemsStr.split(',').forEach(itemStr => {
      const parts = itemStr.trim().split(/\s*x\s*/);
      if (parts.length === 2) {
        items.push({ id: parts[0].trim(), quantity: parseInt(parts[1]) || 1 });
      } else if (parts.length === 1 && parts[0]) {
        items.push({ id: parts[0].trim(), quantity: 1 });
      }
    });
  }
  
  questData.reward = {
    xp: parseInt(document.getElementById('defenseRewardXP').value) || 0,
    gold: parseInt(document.getElementById('defenseRewardGold').value) || 0,
    unlockClass: document.getElementById('defenseRewardUnlockClass').checked,
    items: items
  };
  
  const method = editingDefenseQuestId ? 'PUT' : 'POST';
  const url = editingDefenseQuestId ? '/api/defense-quests/' + editingDefenseQuestId : '/api/defense-quests';
  
  fetch(url, {
    method: method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(questData)
  })
    .then(r => {
      if (!r.ok) {
        return r.json().then(err => {
          throw new Error(err?.error || 'Failed to save quest');
        });
      }
      return r.json();
    })
    .then(() => {
      closeDefenseQuestModal();
      loadTownDefenceQuests();
    })
    .catch(err => {
      console.error('Error saving defense quest:', err);
      alert('Error saving quest: ' + err.message);
    });
}

// Create functions
function createWorld() {
  loadWorldBossesForWorldModal();
  loadAvailableWorlds();
  document.getElementById('worldModal').classList.add('active');
}

function closeWorldModal() {
  document.getElementById('worldModal').classList.remove('active');
  document.getElementById('worldName').value = '';
  document.getElementById('worldTier').value = '1';
  document.getElementById('worldDescription').value = '';
  document.getElementById('worldMinLevel').value = '1';
  document.getElementById('worldMaxLevel').value = '50';
  document.getElementById('worldBossSelect').value = '';
  document.getElementById('worldNextWorldSelect').value = '';
}

function loadWorldBossesForWorldModal() {
  // Load all bosses for the world boss selector
  fetch('/api/editor/bosses', { credentials: 'include' })
    .then(r => r.json())
    .then(bosses => {
      const select = document.getElementById('worldBossSelect');
      const currentValue = select.value;
      select.innerHTML = '<option value="">No Boss</option>';
      if (Array.isArray(bosses)) {
        bosses.forEach(boss => {
          select.innerHTML += '<option value="' + (boss.id || '') + '">' + (boss.name || 'Unknown') + ' (HP: ' + (boss.hp || 0) + ', Lvl: ' + (boss.level || 1) + ')</option>';
        });
      }
      select.value = currentValue;
    })
    .catch(err => console.error('Error loading bosses:', err));
}

function loadAvailableWorlds() {
  return fetch('/api/editor/worlds', { credentials: 'include' })
    .then(r => r.json())
    .then(worlds => {
      const select = document.getElementById('worldNextWorldSelect');
      if (select) {
        const currentValue = select.value;
        select.innerHTML = '<option value="">None</option>';
        if (Array.isArray(worlds)) {
          worlds.forEach(world => {
            select.innerHTML += '<option value="' + (world.id || '') + '">' + (world.name || 'Unknown') + '</option>';
          });
        }
        select.value = currentValue;
      }
      return worlds || [];
    });
}

function submitWorld() {
  const name = document.getElementById('worldName').value;
  if (!name) {
    alert('Please enter a world name');
    return;
  }
  
  const method = editingId ? 'PUT' : 'POST';
  const url = editingId ? '/api/editor/worlds/' + editingId : '/api/editor/worlds';
  
  fetch(url, {
    method: method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: editingId,
      name,
      tier: parseInt(document.getElementById('worldTier').value) || 1,
      description: document.getElementById('worldDescription').value,
      minLevel: parseInt(document.getElementById('worldMinLevel').value) || 1,
      maxLevel: parseInt(document.getElementById('worldMaxLevel').value) || 50,
      worldBoss: document.getElementById('worldBossSelect').value || null,
      nextWorldId: document.getElementById('worldNextWorldSelect').value || null
    })
  }).then(r => r.json()).then(() => {
    editingId = null;
    closeWorldModal();
    loadWorlds();
  }).catch(err => alert('Error saving world: ' + err.message));
}

function toggleQuestCondition(type) {
  const checkbox = document.getElementById('questCond' + type.charAt(0).toUpperCase() + type.slice(1));
  const fields = document.getElementById('questCond' + type.charAt(0).toUpperCase() + type.slice(1) + 'Fields');
  if (fields) fields.style.display = checkbox && checkbox.checked ? 'block' : 'none';
}

function toggleQuestTypeFields() {
  const questType = document.getElementById('questType').value;
  const standardFields = document.getElementById('standardQuestFields');
  const choiceFields = document.getElementById('choiceQuestFields');
  
  if (questType === 'choice') {
    standardFields.style.display = 'none';
    choiceFields.style.display = 'block';
    // Initialize with one empty branch if none exist
    if (document.querySelectorAll('.quest-branch-card').length === 0) {
      addQuestBranch();
    }
  } else {
    standardFields.style.display = 'block';
    choiceFields.style.display = 'none';
  }
}

let branchCounter = 0;

function addQuestBranch() {
  branchCounter++;
  const container = document.getElementById('questBranchesContainer');
  const branchId = 'branch_' + branchCounter;
  
  const branchHtml = \`<div class="quest-branch-card" data-branch-id="\${branchId}" style="background:#2a2f3a;border:1px solid #3a3f4a;border-radius:8px;padding:15px;margin-bottom:15px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
    <h4 style="margin:0;color:#9146ff">Branch \${branchCounter}</h4>
    <button type="button" class="small danger" onclick="removeQuestBranch('\${branchId}')" style="padding:4px 8px">✕</button>
    </div>
    <div class="form-group" style="margin-bottom:10px">
    <label style="font-size:12px">Branch Title *</label>
    <input type="text" class="branch-title" placeholder="e.g. ⚡ Use the Artifact" style="width:100%">
    </div>
    <div class="form-group" style="margin-bottom:10px">
    <label style="font-size:12px">Branch Description</label>
    <textarea class="branch-description" placeholder="What happens when player chooses this" style="width:100%;min-height:60px"></textarea>
    </div>
    <div style="border-top:1px solid #4a4f5a;padding-top:10px;margin-top:10px">
    <h5 style="margin:0 0 10px 0;color:#ffca28">Outcome</h5>
    <div class="form-group" style="margin-bottom:10px">
    <label style="font-size:12px">Outcome Title</label>
    <input type="text" class="outcome-title" placeholder="e.g. Corrupted Power">
    </div>
    <div class="form-group" style="margin-bottom:10px">
    <label style="font-size:12px">Outcome Description</label>
    <textarea class="outcome-description" placeholder="Describe what happens after this choice" style="min-height:60px"></textarea>
    </div>
    <div class="form-group" style="margin-bottom:10px">
    <label><input type="checkbox" class="outcome-negative"> Negative Outcome (bad for player)</label>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
    <div class="form-group">
    <label style="font-size:12px">XP Reward</label>
    <input type="number" class="outcome-xp" value="500" min="0">
    </div>
    <div class="form-group">
    <label style="font-size:12px">Gold Reward</label>
    <input type="number" class="outcome-gold" value="250" min="0">
    </div>
    </div>
    <div class="form-group" style="margin-bottom:10px">
    <label style="font-size:12px">Item Rewards (comma-separated item IDs)</label>
    <input type="text" class="outcome-items" placeholder="e.g. cursed_amulet, ancient_fang">
    </div>
    <div class="form-group" style="margin-bottom:10px">
    <label style="font-size:12px">Flags to Set (comma-separated)</label>
    <input type="text" class="outcome-flags" placeholder="e.g. quest_artifact_used, cursed_player">
    </div>
    <div class="form-group">
    <label style="font-size:12px">Permanent Buff/Debuff Name (optional)</label>
    <input type="text" class="outcome-buff-name" placeholder="e.g. Cursed, Blessed">
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px">
    <div class="form-group">
    <label style="font-size:11px">STR</label>
    <input type="number" class="buff-str" value="0">
    </div>
    <div class="form-group">
    <label style="font-size:11px">INT</label>
    <input type="number" class="buff-int" value="0">
    </div>
    <div class="form-group">
    <label style="font-size:11px">WIS</label>
    <input type="number" class="buff-wis" value="0">
    </div>
    <div class="form-group">
    <label style="font-size:11px">AGI</label>
    <input type="number" class="buff-agi" value="0">
    </div>
    <div class="form-group">
    <label style="font-size:11px">DEF</label>
    <input type="number" class="buff-def" value="0">
    </div>
    <div class="form-group">
    <label style="font-size:11px">HP</label>
    <input type="number" class="buff-hp" value="0">
    </div>
    </div>
    </div>
    </div>\`;
  
  container.insertAdjacentHTML('beforeend', branchHtml);
}

function removeQuestBranch(branchId) {
  const card = document.querySelector('[data-branch-id="' + branchId + '"]');
  if (card) card.remove();
}

function getQuestBranches() {
  const branches = [];
  const outcomes = [];
  
  document.querySelectorAll('.quest-branch-card').forEach((card, index) => {
    const branchId = 'branch_' + (index + 1);
    const title = card.querySelector('.branch-title').value;
    const description = card.querySelector('.branch-description').value;
    
    if (!title) return;
    
    branches.push({
      id: branchId,
      title: title,
      description: description
    });
    
    const outcomeTitle = card.querySelector('.outcome-title').value;
    const outcomeDesc = card.querySelector('.outcome-description').value;
    const isNegative = card.querySelector('.outcome-negative').checked;
    const xp = parseInt(card.querySelector('.outcome-xp').value) || 0;
    const gold = parseInt(card.querySelector('.outcome-gold').value) || 0;
    const itemsStr = card.querySelector('.outcome-items').value;
    const flagsStr = card.querySelector('.outcome-flags').value;
    const buffName = card.querySelector('.outcome-buff-name').value;
    
    const items = itemsStr ? itemsStr.split(',').map(s => ({ id: s.trim(), quantity: 1 })).filter(i => i.id) : [];
    const flags = flagsStr ? flagsStr.split(',').map(s => s.trim()).filter(f => f) : [];
    
    const outcome = {
      id: 'outcome_' + (index + 1),
      branchId: branchId,
      title: outcomeTitle || title + ' Result',
      description: outcomeDesc,
      isNegative: isNegative,
      reward: { xp, gold, items },
      flagsSet: flags
    };
    
    // Add buff/debuff if specified
    if (buffName) {
      const buff = {
        name: buffName,
        effect: {
          strength: parseInt(card.querySelector('.buff-str').value) || 0,
          intelligence: parseInt(card.querySelector('.buff-int').value) || 0,
          wisdom: parseInt(card.querySelector('.buff-wis').value) || 0,
          agility: parseInt(card.querySelector('.buff-agi').value) || 0,
          defense: parseInt(card.querySelector('.buff-def').value) || 0,
          hp: parseInt(card.querySelector('.buff-hp').value) || 0
        }
      };
      
      if (isNegative) {
        outcome.consequences = { permanentDebuff: buff };
      } else {
        outcome.bonuses = { permanentBuff: buff };
      }
    }
    
    outcomes.push(outcome);
  });
  
  return { branches, outcomes };
}

function createWorldQuest() {
  branchCounter = 0;
  editingId = null;
  
  // Reset form
  document.getElementById('questTitle').value = '';
  document.getElementById('questDescription').value = '';
  document.getElementById('questType').value = 'side';
  document.getElementById('questMinLevel').value = '1';
  document.getElementById('questUnlocks').value = '';
  document.getElementById('questObjectives').value = '';
  document.getElementById('questBranchesContainer').innerHTML = '';
  
  // Show standard fields by default
  toggleQuestTypeFields();

  // Render tasks immediately so selector doesn't stay in loading state
  renderTaskSelector();
  document.getElementById('questModal').classList.add('active');

  loadAvailableRewards()
    .then(() => {
      renderRewardSelector('questRewardSelector');
    })
    .catch(() => {
      // Keep modal usable even if rewards fail to load
      const rewardContainer = document.getElementById('questRewardSelector');
      if (rewardContainer) rewardContainer.innerHTML = '<p style="opacity:0.6">Rewards failed to load</p>';
    });
}

function closeQuestModal() {
  document.getElementById('questModal').classList.remove('active');
  document.getElementById('questTitle').value = '';
  document.getElementById('questDescription').value = '';
  document.getElementById('questObjectives').value = '';
  document.getElementById('questBranchesContainer').innerHTML = '';
  branchCounter = 0;
}

function submitQuest() {
  const title = document.getElementById('questTitle').value;
  if (!title) {
    alert('Please enter a quest title');
    return;
  }
  if (!selectedWorldId) {
    alert('Please select a world before creating a quest');
    return;
  }
  
  const questType = document.getElementById('questType').value;
  const minLevel = parseInt(document.getElementById('questMinLevel').value) || 1;
  const unlocks = document.getElementById('questUnlocks').value || null;
  const description = document.getElementById('questDescription').value;
  
  let questData = {
    id: editingId,
    title,
    name: title,
    description,
    type: questType,
    minLevel,
    unlocks,
    worldId: selectedWorldId
  };
  
  if (questType === 'choice') {
    // Choice quest - get branches and outcomes
    const { branches, outcomes } = getQuestBranches();
    
    if (branches.length === 0) {
      alert('Please add at least one branch for a choice quest');
      return;
    }
    
    questData.branches = branches;
    questData.outcomes = outcomes;
  } else {
    // Standard quest - get objectives, tasks, and rewards
    const objectives = document.getElementById('questObjectives').value;
    const rewards = getSelectedRewards('questRewardSelector');
    const selectedTasks = getSelectedTasks();
    
    let allObjectives = [];
    if (objectives) {
      allObjectives = objectives.split(',').map(o => o.trim()).filter(o => o);
    }
    allObjectives = allObjectives.concat(selectedTasks);
    
    questData.objectives = allObjectives;
    questData.rewards = rewards;
    
    // Add class unlock flag for class-unlock type quests
    if (questType === 'class-unlock') {
      questData.rewards = questData.rewards || {};
      questData.rewards.unlockClass = true;
    }
  }
  
  const method = editingId ? 'PUT' : 'POST';
  const url = editingId ? '/api/editor/quests/' + editingId : '/api/editor/quests';
  
  fetch(url, {
    method: method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(questData)
  }).then(r => {
    if (!r.ok) {
      return r.json().then(err => {
        throw new Error(err?.error || 'Failed to save quest');
      });
    }
    return r.json();
  }).then(() => {
    editingId = null;
    closeQuestModal();
    loadWorldQuests(selectedWorldId, currentQuestType);
  }).catch(err => alert('Error saving quest: ' + err.message));
}

function createWorldBoss() {
  loadAvailableRewards().then(() => {
    renderRewardSelector('bossRewardSelector');
    document.getElementById('bossModal').classList.add('active');
  });
}

function closeBossModal() {
  document.getElementById('bossModal').classList.remove('active');
  document.getElementById('bossName').value = '';
  document.getElementById('bossDescription').value = '';
  document.getElementById('bossHP').value = '100';
  document.getElementById('bossLevel').value = '10';
}

function submitBoss() {
  const name = document.getElementById('bossName').value;
  if (!name) {
    alert('Please enter a boss name');
    return;
  }
  
  const rewards = getSelectedRewards('bossRewardSelector');
  const method = editingId ? 'PUT' : 'POST';
  const url = editingId ? '/api/editor/bosses/' + editingId : '/api/editor/bosses';
  
  fetch(url, {
    method: method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: editingId,
      name,
      description: document.getElementById('bossDescription').value,
      worldId: selectedWorldId,
      hp: parseInt(document.getElementById('bossHP').value) || 100,
      level: parseInt(document.getElementById('bossLevel').value) || 10,
      rewards: rewards
    })
  }).then(r => r.json()).then(() => {
    editingId = null;
    closeBossModal();
    loadWorldBosses(selectedWorldId);
  }).catch(err => alert('Error saving boss: ' + err.message));
}

// Boss selection for dungeons and raids
let selectedBossesForDungeon = [];
let selectedBossesForRaid = [];

function loadWorldBossesForModal(containerId, selectedList) {
  fetch('/api/editor/bosses?worldId=' + selectedWorldId, { credentials: 'include' })
    .then(r => r.json())
    .then(bosses => {
      if (!Array.isArray(bosses)) bosses = [];
      const container = document.getElementById(containerId);
      
      if (bosses.length === 0) {
        container.innerHTML = '<p style="opacity:0.6;margin:0">No bosses created yet. Create one first!</p>';
        return;
      }
      
      container.innerHTML = bosses.map(boss => {
        const bossIdEscaped = (boss.id || '').replace(/"/g, '&quot;');
        return '<div style="display: flex; align-items: center; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 4px; margin-bottom: 8px;">' +
          '<input type="checkbox" data-boss-id="' + bossIdEscaped + '" data-container="' + containerId + '" data-list="' + selectedList + '" onchange="toggleBossForModal(this)" data-boss-id="' + bossIdEscaped + '">' +
          '<label style="margin: 0 0 0 8px; flex: 1; cursor: pointer;">' + (boss.name || 'Unknown') + ' (HP: ' + (boss.hp || 0) + ', Lvl: ' + (boss.level || 1) + ')</label>' +
          '</div>';
      }).join('');
      
      // Check previously selected bosses
      const list = selectedList === 'dungeon' ? selectedBossesForDungeon : selectedBossesForRaid;
      list.forEach(bossId => {
        const checkbox = container.querySelector('input[data-boss-id="' + (bossId || '').replace(/"/g, '&quot;') + '"]');
        if (checkbox) checkbox.checked = true;
      });
    })
    .catch(err => {
      const container = document.getElementById(containerId);
      container.innerHTML = '<p style="color:#ff6b6b;margin:0">Error loading bosses: ' + err.message + '</p>';
    });
}

function toggleBossForModal(checkbox) {
  const bossId = checkbox.getAttribute('data-boss-id');
  const selectedList = checkbox.getAttribute('data-list');
  const list = selectedList === 'dungeon' ? selectedBossesForDungeon : selectedBossesForRaid;
  
  if (checkbox.checked) {
    if (!list.includes(bossId)) list.push(bossId);
  } else {
    const idx = list.indexOf(bossId);
    if (idx > -1) list.splice(idx, 1);
  }
}

function addBossToDungeon() {
  alert('Bosses selected: ' + selectedBossesForDungeon.join(', ') || 'None');
}

function addBossToRaid() {
  alert('Bosses selected: ' + selectedBossesForRaid.join(', ') || 'None');
}

function createWorldDungeon() {
  selectedBossesForDungeon = [];
  loadAvailableRewards().then(() => {
    renderRewardSelector('dungeonRewardSelector');
    loadWorldBossesForModal('dungeonBossSelector', 'dungeon');
    document.getElementById('dungeonModal').classList.add('active');
  });
}

function closeDungeonModal() {
  document.getElementById('dungeonModal').classList.remove('active');
  document.getElementById('dungeonName').value = '';
  document.getElementById('dungeonDescription').value = '';
}

function submitDungeon() {
  const name = document.getElementById('dungeonName').value;
  if (!name) {
    alert('Please enter a dungeon name');
    return;
  }
  
  const rewards = getSelectedRewards('dungeonRewardSelector');
  const method = editingId ? 'PUT' : 'POST';
  const url = editingId ? '/api/editor/dungeons/' + editingId : '/api/editor/dungeons';
  
  fetch(url, {
    method: method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      id: editingId,
      name,
      description: document.getElementById('dungeonDescription').value,
      worldId: selectedWorldId,
      difficulty: document.getElementById('dungeonDifficulty').value,
      minLevel: parseInt(document.getElementById('dungeonMinLevel').value) || 10,
      bosses: selectedBossesForDungeon,
      rewards: rewards
    })
  }).then(r => r.json()).then(() => {
    editingId = null;
    closeDungeonModal();
    loadWorldDungeons(selectedWorldId);
  }).catch(err => alert('Error saving dungeon: ' + err.message));
}

function createWorldRaid() {
  selectedBossesForRaid = [];
  loadAvailableRewards().then(() => {
    renderRaidLayerRewards();
    loadWorldBossesForModal('raidBossSelector', 'raid');
    document.getElementById('raidModal').classList.add('active');
  });
}

function closeRaidModal() {
  document.getElementById('raidModal').classList.remove('active');
  document.getElementById('raidName').value = '';
  document.getElementById('raidDescription').value = '';
  document.getElementById('raidLayers').value = '1';
  document.getElementById('raidTeamSize').value = '4';
  document.getElementById('raidLayerRewardsList').innerHTML = '';
}

function renderRaidLayerRewards() {
  const numLayers = parseInt(document.getElementById('raidLayers')?.value) || 1;
  const container = document.getElementById('raidLayerRewardsList');
  const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  
  let html = '';
  for (let i = 0; i < numLayers; i++) {
    const rarity = rarities[Math.min(i, rarities.length - 1)];
    const rarityColor = {
      'common': '#95a5a6',
      'uncommon': '#27ae60',
      'rare': '#3498db',
      'epic': '#9b59b6',
      'legendary': '#f39c12'
    }[rarity] || '#95a5a6';
    
    html += '<div style="background: #1f2229; border-left: 4px solid ' + rarityColor + '; padding: 12px; margin: 10px 0; border-radius: 4px;">';
    html += '<h5 style="margin: 0 0 10px 0; color: ' + rarityColor + ';">Layer ' + (i + 1) + ' - ' + rarity.toUpperCase() + '</h5>';
    html += '<input type="text" id="raidLayer' + i + 'Name" placeholder="Display Name (optional)" style="width: 100%; margin-bottom: 8px; padding: 6px; background: #2a2f3a; border: 1px solid #3a3f4a; color: #e0e0e0;">';
    html += '<label style="font-size: 12px; opacity: 0.8;">Base XP Reward</label>';
    html += '<input type="number" id="raidLayer' + i + 'XP" value="' + (500 * (i + 1)) + '" style="width: 100%; margin-bottom: 8px; padding: 6px; background: #2a2f3a; border: 1px solid #3a3f4a; color: #e0e0e0;">';
    html += '<label style="font-size: 12px; opacity: 0.8;">Base Gold Reward</label>';
    html += '<input type="number" id="raidLayer' + i + 'Gold" value="' + (250 * (i + 1)) + '" style="width: 100%; margin-bottom: 8px; padding: 6px; background: #2a2f3a; border: 1px solid #3a3f4a; color: #e0e0e0;">';
    
    html += '<label style="font-size: 12px; opacity: 0.8; margin-top: 8px; display: block;">Items (with quantities)</label>';
    html += '<input type="text" id="raidLayer' + i + 'ItemSearch" placeholder="Search items..." style="width: 100%; margin-bottom: 4px; padding: 4px; background: #2a2f3a; border: 1px solid #3a3f4a; color: #e0e0e0; font-size: 12px;" oninput="filterLayerItems(' + i + ')">';
    html += '<div id="raidLayer' + i + 'Items" style="background: #25282f; border: 1px solid #2a3f4a; border-radius: 4px; padding: 8px; max-height: 150px; overflow-y: auto; margin-bottom: 8px;">Loading...</div>';
    
    html += '<label style="font-size: 12px; opacity: 0.8; display: block;">Materials (with quantities)</label>';
    html += '<input type="text" id="raidLayer' + i + 'MaterialSearch" placeholder="Search materials..." style="width: 100%; margin-bottom: 4px; padding: 4px; background: #2a2f3a; border: 1px solid #3a3f4a; color: #e0e0e0; font-size: 12px;" oninput="filterLayerMaterials(' + i + ')">';
    html += '<div id="raidLayer' + i + 'Materials" style="background: #25282f; border: 1px solid #2a3f4a; border-radius: 4px; padding: 8px; max-height: 150px; overflow-y: auto;">Loading...</div>';
    html += '</div>';
  }
  
  container.innerHTML = html;
  
  // Load items and materials for each layer
  Promise.all([
    fetch('/api/items', { credentials: 'include' }).then(r => r.json()),
    fetch('/api/materials', { credentials: 'include' }).then(r => r.json())
  ]).then(([items, materials]) => {
    for (let i = 0; i < numLayers; i++) {
      renderLayerItemSelector(i, items, []);
      renderLayerMaterialSelector(i, materials, []);
    }
  });
}

// Update rewards when layer count changes
document.addEventListener('DOMContentLoaded', () => {
  const layersInput = document.getElementById('raidLayers');
  if (layersInput) {
    layersInput.addEventListener('change', renderRaidLayerRewards);
  }
});

function renderLayerItemSelector(layerIndex, items, selectedItems) {
  const container = document.getElementById('raidLayer' + layerIndex + 'Items');
  if (!items || items.length === 0) {
    container.innerHTML = '<p style="opacity:0.6;margin:0;font-size:12px">No items available</p>';
    return;
  }
  
  container.innerHTML = items.map(item => {
    const itemData = selectedItems.find(i => typeof i === 'object' ? i.id === item.id : i === item.id);
    const isChecked = !!itemData;
    const quantity = (itemData && typeof itemData === 'object') ? itemData.quantity : 1;
    const bgColor = isChecked ? '#2a3f3a' : 'rgba(255,255,255,0.03)';
    
    return '<div style="display:block;padding:6px;margin-bottom:3px;background:' + bgColor + ';border-radius:3px" class="layer-item-option" data-layer="' + layerIndex + '">' +
      '<label style="display:flex;align-items:center;cursor:pointer;margin-bottom:4px;font-size:12px">' +
      '<input type="checkbox" value="' + item.id + '" ' + (isChecked ? 'checked' : '') + ' style="margin-right:6px" onchange="toggleLayerItem(' + layerIndex + ', this)">' +
      item.name + ' <span style="opacity:0.5;font-size:11px;margin-left:auto">(' + item.id + ')</span>' +
      '</label>' +
      (isChecked ? '<input type="number" class="layer-item-qty" data-item-id="' + item.id + '" value="' + quantity + '" min="1" max="999" style="width:100%;padding:3px;background:#0a0f1e;border:1px solid #3a3f4a;border-radius:2px;color:#e0e0e0;font-size:11px" placeholder="Qty">' : '') +
      '</div>';
  }).join('');
}

function renderLayerMaterialSelector(layerIndex, materials, selectedMaterials) {
  const container = document.getElementById('raidLayer' + layerIndex + 'Materials');
  const matArray = Object.entries(materials).map(([id, mat]) => ({ id, ...mat }));
  
  if (matArray.length === 0) {
    container.innerHTML = '<p style="opacity:0.6;margin:0;font-size:12px">No materials available</p>';
    return;
  }
  
  container.innerHTML = matArray.map(mat => {
    const matData = selectedMaterials.find(m => typeof m === 'object' ? m.id === mat.id : m === mat.id);
    const isChecked = !!matData;
    const quantity = (matData && typeof matData === 'object') ? matData.quantity : 1;
    const bgColor = isChecked ? '#2a3f3a' : 'rgba(255,255,255,0.03)';
    
    return '<div style="display:block;padding:6px;margin-bottom:3px;background:' + bgColor + ';border-radius:3px" class="layer-material-option" data-layer="' + layerIndex + '">' +
      '<label style="display:flex;align-items:center;cursor:pointer;margin-bottom:4px;font-size:12px">' +
      '<input type="checkbox" value="' + mat.id + '" ' + (isChecked ? 'checked' : '') + ' style="margin-right:6px" onchange="toggleLayerMaterial(' + layerIndex + ', this)">' +
      mat.name + ' <span style="opacity:0.5;font-size:11px;margin-left:auto">(' + mat.id + ')</span>' +
      '</label>' +
      (isChecked ? '<input type="number" class="layer-material-qty" data-material-id="' + mat.id + '" value="' + quantity + '" min="1" max="999" style="width:100%;padding:3px;background:#0a0f1e;border:1px solid #3a3f4a;border-radius:2px;color:#e0e0e0;font-size:11px" placeholder="Qty">' : '') +
      '</div>';
  }).join('');
}

function toggleLayerItem(layerIndex, checkbox) {
  const itemDiv = checkbox.closest('.layer-item-option');
  const itemId = checkbox.value;
  const qtyInput = itemDiv.querySelector('.layer-item-qty');
  
  if (checkbox.checked) {
    if (!qtyInput) {
      const qtyHtml = '<input type="number" class="layer-item-qty" data-item-id="' + itemId + '" value="1" min="1" max="999" style="width:100%;padding:3px;background:#0a0f1e;border:1px solid #3a3f4a;border-radius:2px;color:#e0e0e0;font-size:11px" placeholder="Qty">';
      itemDiv.innerHTML += qtyHtml;
    }
    itemDiv.style.background = '#2a3f3a';
  } else {
    if (qtyInput) qtyInput.remove();
    itemDiv.style.background = 'rgba(255,255,255,0.03)';
  }
}

function toggleLayerMaterial(layerIndex, checkbox) {
  const matDiv = checkbox.closest('.layer-material-option');
  const matId = checkbox.value;
  const qtyInput = matDiv.querySelector('.layer-material-qty');
  
  if (checkbox.checked) {
    if (!qtyInput) {
      const qtyHtml = '<input type="number" class="layer-material-qty" data-material-id="' + matId + '" value="1" min="1" max="999" style="width:100%;padding:3px;background:#0a0f1e;border:1px solid #3a3f4a;border-radius:2px;color:#e0e0e0;font-size:11px" placeholder="Qty">';
      matDiv.innerHTML += qtyHtml;
    }
    matDiv.style.background = '#2a3f3a';
  } else {
    if (qtyInput) qtyInput.remove();
    matDiv.style.background = 'rgba(255,255,255,0.03)';
  }
}

function filterLayerItems(layerIndex) {
  const search = document.getElementById('raidLayer' + layerIndex + 'ItemSearch').value.toLowerCase();
  const options = document.querySelectorAll('#raidLayer' + layerIndex + 'Items .layer-item-option');
  options.forEach(opt => {
    const text = opt.textContent.toLowerCase();
    opt.style.display = text.includes(search) ? 'block' : 'none';
  });
}

function filterLayerMaterials(layerIndex) {
  const search = document.getElementById('raidLayer' + layerIndex + 'MaterialSearch').value.toLowerCase();
  const options = document.querySelectorAll('#raidLayer' + layerIndex + 'Materials .layer-material-option');
  options.forEach(opt => {
    const text = opt.textContent.toLowerCase();
    opt.style.display = text.includes(search) ? 'block' : 'none';
  });
}

function submitRaid() {
  const name = document.getElementById('raidName').value;
  if (!name) {
    alert('Please enter a raid name');
    return;
  }
  
  const numLayers = parseInt(document.getElementById('raidLayers')?.value) || 1;
  
  // Build layers with rarity-based packages
  const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  const layers = [];
  
  for (let i = 0; i < numLayers; i++) {
    const rarity = rarities[Math.min(i, rarities.length - 1)];
    const baseXP = parseInt(document.getElementById('raidLayer' + i + 'XP')?.value) || 500;
    const baseGold = parseInt(document.getElementById('raidLayer' + i + 'Gold')?.value) || 250;
    const layerName = document.getElementById('raidLayer' + i + 'Name')?.value.trim() || ('Layer ' + (i + 1) + ' - ' + (rarity.charAt(0).toUpperCase() + rarity.slice(1)));
    
    // Collect items with quantities
    const layerItems = [];
    document.querySelectorAll('#raidLayer' + i + 'Items input[type="checkbox"]:checked').forEach(function(cb) {
      const qtyInput = cb.closest('.layer-item-option').querySelector('.layer-item-qty');
      const quantity = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
      layerItems.push({ id: cb.value, quantity: quantity });
    });
    
    // Collect materials with quantities
    const layerMaterials = [];
    document.querySelectorAll('#raidLayer' + i + 'Materials input[type="checkbox"]:checked').forEach(function(cb) {
      const qtyInput = cb.closest('.layer-material-option').querySelector('.layer-material-qty');
      const quantity = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
      layerMaterials.push({ id: cb.value, quantity: quantity });
    });
    
    layers.push({
      id: 'layer_' + (i + 1),
      name: layerName,
      level: i + 1,
      bosses: selectedBossesForRaid.slice(0, Math.ceil(selectedBossesForRaid.length * (i + 1) / numLayers)) || [],
      rewardPackages: [
        {
          id: 'pkg_' + Date.now() + '_' + i + '_' + rarity,
          name: (rarity.charAt(0).toUpperCase() + rarity.slice(1)) + ' Rewards',
          rarity: rarity,
          dropChance: 100,
          items: layerItems,
          materials: layerMaterials,
          xp: baseXP,
          gold: baseGold,
        },
      ],
    });
  }
  
  const method = editingId ? 'PUT' : 'POST';
  const url = editingId ? '/api/editor/raids/' + editingId : '/api/editor/raids';
  
  fetch(url, {
    method: method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: editingId,
      name: name,
      description: document.getElementById('raidDescription').value,
      worldId: selectedWorldId,
      minLevel: parseInt(document.getElementById('raidMinLevel').value) || 20,
      maxPartySize: parseInt(document.getElementById('raidTeamSize')?.value) || 4,
      bosses: selectedBossesForRaid,
      layers: layers,
      floors: Array.from({length: numLayers}, function(_, i) {
        return {
          id: 'floor_' + (i + 1),
          name: 'Floor ' + (i + 1),
          bosses: [],
          rewards: {}
        };
      }),
    })
  }).then(r => r.json()).then(() => {
    editingId = null;
    closeRaidModal();
    loadWorldRaids(selectedWorldId);
  }).catch(err => alert('Error saving raid: ' + err.message));
}

// Edit/Delete functions
function editWorld(id) {
  editingId = id;
  fetch('/api/editor/worlds/' + id, { credentials: 'include' })
    .then(r => r.json())
    .then(world => {
      document.getElementById('worldName').value = world.name || '';
      document.getElementById('worldTier').value = world.tier || '1';
      document.getElementById('worldDescription').value = world.description || '';
      document.getElementById('worldMinLevel').value = world.minLevel || '1';
      document.getElementById('worldMaxLevel').value = world.maxLevel || '50';
      document.getElementById('worldBossSelect').value = world.worldBoss || '';
      document.getElementById('worldNextWorldSelect').value = world.nextWorldId || '';
      
      loadWorldBossesForWorldModal();
      loadAvailableWorlds();
      document.getElementById('worldModal').classList.add('active');
    })
    .catch(err => console.error('Error loading world:', err));
}

function editQuest(id) {
  editingId = id;
  fetch('/api/editor/quests/' + id, { credentials: 'include' })
    .then(r => r.json())
    .then(quest => {
      document.getElementById('questTitle').value = quest.title || '';
      document.getElementById('questDescription').value = quest.description || '';
      document.getElementById('questObjectives').value = quest.objectives || '';
      
      loadAvailableRewards().then(() => {
        renderRewardSelector('questRewardSelector', quest.rewards || {});
        document.getElementById('questModal').classList.add('active');
      });
    })
    .catch(err => console.error('Error loading quest:', err));
}

function editBoss(id) {
  editingId = id;
  fetch('/api/editor/bosses/' + id, { credentials: 'include' })
    .then(r => r.json())
    .then(boss => {
      document.getElementById('bossName').value = boss.name || '';
      document.getElementById('bossDescription').value = boss.description || '';
      document.getElementById('bossHP').value = boss.hp || '100';
      document.getElementById('bossLevel').value = boss.level || '10';
      
      loadAvailableRewards().then(() => {
        renderRewardSelector('bossRewardSelector', boss.rewards || {});
        document.getElementById('bossModal').classList.add('active');
      });
    })
    .catch(err => console.error('Error loading boss:', err));
}

function editDungeon(id) {
  editingId = id;
  fetch('/api/editor/dungeons/' + id, { credentials: 'include' })
    .then(r => r.json())
    .then(dungeon => {
      document.getElementById('dungeonName').value = dungeon.name || '';
      document.getElementById('dungeonDescription').value = dungeon.description || '';
      document.getElementById('dungeonDifficulty').value = dungeon.difficulty || 'normal';
      document.getElementById('dungeonMinLevel').value = dungeon.minLevel || '1';
      
      // Load bosses for selection
      selectedBossesForDungeon = dungeon.bosses || [];
      loadWorldBossesForModal('dungeonBossSelector', selectedBossesForDungeon, 'dungeonBossSelector');
      
      loadAvailableRewards().then(() => {
        renderRewardSelector('dungeonRewardSelector', dungeon.rewards || {});
        document.getElementById('dungeonModal').classList.add('active');
      });
    })
    .catch(err => console.error('Error loading dungeon:', err));
}

function editRaid(id) {
  editingId = id;
  fetch('/api/editor/raids/' + id, { credentials: 'include' })
    .then(r => r.json())
    .then(raid => {
      document.getElementById('raidName').value = raid.name || '';
      document.getElementById('raidDescription').value = raid.description || '';
      document.getElementById('raidTeamSize').value = raid.maxPartySize || '4';
      document.getElementById('raidMinLevel').value = raid.minLevel || '1';
      
      // Set layer count from layers array or floors array (legacy)
      const numLayers = (raid.layers || raid.floors || []).length;
      document.getElementById('raidLayers').value = numLayers || '1';
      
      // Load bosses for selection
      selectedBossesForRaid = raid.bosses || [];
      loadWorldBossesForModal('raidBossSelector', selectedBossesForRaid, 'raidBossSelector');
      
      // Load items and materials then render layers
      Promise.all([
        fetch('/api/items', { credentials: 'include' }).then(r => r.json()),
        fetch('/api/materials', { credentials: 'include' }).then(r => r.json())
      ]).then(([items, materials]) => {
        // Render layers with their reward packages
        renderRaidLayerRewards();
        
        // Load existing layer reward packages if they exist
        if (raid.layers && Array.isArray(raid.layers)) {
          setTimeout(function() {
            raid.layers.forEach(function(layer, layerIdx) {
              // Set layer name
              const nameInput = document.getElementById('raidLayer' + layerIdx + 'Name');
              if (nameInput && layer.name) nameInput.value = layer.name;
              
              // Set XP and Gold
              const xpInput = document.getElementById('raidLayer' + layerIdx + 'XP');
              const goldInput = document.getElementById('raidLayer' + layerIdx + 'Gold');
              
              if (layer.rewardPackages && layer.rewardPackages.length > 0) {
                const pkg = layer.rewardPackages[0];
                if (xpInput) xpInput.value = pkg.xp || 0;
                if (goldInput) goldInput.value = pkg.gold || 0;
                
                // Load items with quantities
                if (pkg.items) {
                  renderLayerItemSelector(layerIdx, items, pkg.items);
                }
                
                // Load materials with quantities
                if (pkg.materials) {
                  renderLayerMaterialSelector(layerIdx, materials, pkg.materials);
                }
              }
            });
          }, 100);
        }
        
        document.getElementById('raidModal').classList.add('active');
      });
    })
    .catch(err => console.error('Error loading raid:', err));
}

function deleteQuest(id) {
  if (!confirm('Delete this quest?')) return;
  fetch('/api/editor/quests/' + id, { method: 'DELETE', credentials: 'include' })
    .then(() => loadWorldQuests(selectedWorldId, currentQuestType));
}

function deleteBoss(id) {
  if (!confirm('Delete this boss?')) return;
  fetch('/api/editor/bosses/' + id, { method: 'DELETE', credentials: 'include' })
    .then(() => loadWorldBosses(selectedWorldId));
}

function deleteDungeon(id) {
  if (!confirm('Delete this dungeon?')) return;
  fetch('/api/editor/dungeons/' + id, { method: 'DELETE', credentials: 'include' })
    .then(() => loadWorldDungeons(selectedWorldId));
}

function deleteRaid(id) {
  if (!confirm('Delete this raid?')) return;
  fetch('/api/editor/raids/' + id, { method: 'DELETE', credentials: 'include' })
    .then(() => loadWorldRaids(selectedWorldId));
}

// Rewards (global)
function loadRewards() {
  fetch('/api/rewards', { credentials: 'include' })
    .then(r => r.json())
    .then(rewards => {
      const container = document.getElementById('rewards-list');
      const items = Object.entries(rewards).map(([id, r]) => ({ id, ...r }));
      if (!items.length) {
        container.innerHTML = '<p style="text-align:center;opacity:0.6">No rewards yet. Create your first reward!</p>';
        return;
      }
      container.innerHTML = items.map(r => {
        const itemsDisplay = r.items?.map(item => {
          if (typeof item === 'object') return item.id + ' x' + (item.quantity || 1);
          return item;
        }).join(', ');
        const materialsDisplay = r.materials?.map(mat => {
          if (typeof mat === 'object') return mat.id + ' x' + (mat.quantity || 1);
          return mat;
        }).join(', ');
        
        return \`
        <div class="item-card">
          <h3>\${r.name || r.id}</h3>
          <p><strong>ID:</strong> \${r.id}</p>
          <p>XP: \${r.xp || 0} | Gold: \${r.gold || 0}</p>
          \${itemsDisplay ? '<p><strong>Items:</strong> ' + itemsDisplay + '</p>' : ''}
          \${materialsDisplay ? '<p><strong>Materials:</strong> ' + materialsDisplay + '</p>' : ''}
          <div class="item-actions">
            <button class="btn-edit" onclick="editReward('\${r.id}')">Edit</button>
            <button class="btn-delete" onclick="deleteReward('\${r.id}')">Delete</button>
          </div>
        </div>
      \`;
      }).join('');
    });
}

function createReward() {
  editingId = null;
  document.getElementById('rewardPackageModalTitle').textContent = 'Create Reward Package';
  document.getElementById('rewardPackageId').value = '';
  document.getElementById('rewardPackageId').readOnly = false;
  document.getElementById('rewardPackageName').value = '';
  document.getElementById('rewardPackageXP').value = '0';
  document.getElementById('rewardPackageGold').value = '0';
  
  // Load items and materials for selection
  Promise.all([
    fetch('/api/items', { credentials: 'include' }).then(r => r.json()),
    fetch('/api/materials', { credentials: 'include' }).then(r => r.json())
  ]).then(([items, materials]) => {
    renderRewardItemSelector(items, []);
    renderRewardMaterialSelector(materials, []);
    document.getElementById('rewardPackageSubmitBtn').textContent = 'Create Reward Package';
    document.getElementById('rewardPackageModal').classList.add('active');
  });
}

function renderRewardItemSelector(items, selectedItems = []) {
  const container = document.getElementById('rewardItemSelector');
  if (!items || items.length === 0) {
    container.innerHTML = '<p style="opacity:0.6;margin:0">No items available</p>';
    return;
  }
  
  container.innerHTML = items.map(item => {
    const itemData = selectedItems.find(i => typeof i === 'object' ? i.id === item.id : i === item.id);
    const isChecked = !!itemData;
    const quantity = (itemData && typeof itemData === 'object') ? itemData.quantity : 1;
    const bgColor = isChecked ? '#2a3f3a' : 'rgba(255,255,255,0.05)';
    
    return '<div style="display:block;padding:8px;margin-bottom:4px;background:' + bgColor + ';border-radius:4px" class="reward-item-option">' +
      '<label style="display:flex;align-items:center;cursor:pointer;margin-bottom:6px">' +
      '<input type="checkbox" value="' + item.id + '" ' + (isChecked ? 'checked' : '') + ' style="margin-right:8px" onchange="toggleRewardItem(this)">' +
      item.name + ' <span style="opacity:0.6;font-size:12px;margin-left:auto">(' + item.id + ')</span>' +
      '</label>' +
      (isChecked ? '<input type="number" class="item-qty" data-item-id="' + item.id + '" value="' + quantity + '" min="1" max="999" style="width:100%;padding:4px;background:#0a0f1e;border:1px solid #3a3f4a;border-radius:3px;color:#e0e0e0;font-size:12px" placeholder="Qty">' : '') +
      '</div>';
  }).join('');
}

function renderRewardMaterialSelector(materials, selectedMaterials = []) {
  const container = document.getElementById('rewardMaterialSelector');
  const matArray = Object.entries(materials).map(([id, mat]) => ({ id, ...mat }));
  
  if (matArray.length === 0) {
    container.innerHTML = '<p style="opacity:0.6;margin:0">No materials available</p>';
    return;
  }
  
  container.innerHTML = matArray.map(mat => {
    const matData = selectedMaterials.find(m => typeof m === 'object' ? m.id === mat.id : m === mat.id);
    const isChecked = !!matData;
    const quantity = (matData && typeof matData === 'object') ? matData.quantity : 1;
    const bgColor = isChecked ? '#2a3f3a' : 'rgba(255,255,255,0.05)';
    
    return '<div style="display:block;padding:8px;margin-bottom:4px;background:' + bgColor + ';border-radius:4px" class="reward-material-option">' +
      '<label style="display:flex;align-items:center;cursor:pointer;margin-bottom:6px">' +
      '<input type="checkbox" value="' + mat.id + '" ' + (isChecked ? 'checked' : '') + ' style="margin-right:8px" onchange="toggleRewardMaterial(this)">' +
      mat.name + ' <span style="opacity:0.6;font-size:12px;margin-left:auto">(' + mat.id + ')</span>' +
      '</label>' +
      (isChecked ? '<input type="number" class="material-qty" data-material-id="' + mat.id + '" value="' + quantity + '" min="1" max="999" style="width:100%;padding:4px;background:#0a0f1e;border:1px solid #3a3f4a;border-radius:3px;color:#e0e0e0;font-size:12px" placeholder="Qty">' : '') +
      '</div>';
  }).join('');
}

function toggleRewardItem(checkbox) {
  const itemDiv = checkbox.closest('.reward-item-option');
  const itemId = checkbox.value;
  const qtyInput = itemDiv.querySelector('.item-qty');
  
  if (checkbox.checked) {
    if (!qtyInput) {
      // Create quantity input
      const qtyHtml = '<input type="number" class="item-qty" data-item-id="' + itemId + '" value="1" min="1" max="999" style="width:100%;padding:4px;background:#0a0f1e;border:1px solid #3a3f4a;border-radius:3px;color:#e0e0e0;font-size:12px" placeholder="Qty">';
      itemDiv.innerHTML += qtyHtml;
    }
    itemDiv.style.background = '#2a3f3a';
  } else {
    if (qtyInput) qtyInput.remove();
    itemDiv.style.background = 'rgba(255,255,255,0.05)';
  }
}

function toggleRewardMaterial(checkbox) {
  const matDiv = checkbox.closest('.reward-material-option');
  const matId = checkbox.value;
  const qtyInput = matDiv.querySelector('.material-qty');
  
  if (checkbox.checked) {
    if (!qtyInput) {
      // Create quantity input
      const qtyHtml = '<input type="number" class="material-qty" data-material-id="' + matId + '" value="1" min="1" max="999" style="width:100%;padding:4px;background:#0a0f1e;border:1px solid #3a3f4a;border-radius:3px;color:#e0e0e0;font-size:12px" placeholder="Qty">';
      matDiv.innerHTML += qtyHtml;
    }
    matDiv.style.background = '#2a3f3a';
  } else {
    if (qtyInput) qtyInput.remove();
    matDiv.style.background = 'rgba(255,255,255,0.05)';
  }
}

function filterRewardItems() {
  const search = document.getElementById('rewardItemSearch').value.toLowerCase();
  const options = document.querySelectorAll('.reward-item-option');
  options.forEach(opt => {
    const text = opt.textContent.toLowerCase();
    opt.style.display = text.includes(search) ? 'block' : 'none';
  });
}

function filterRewardMaterials() {
  const search = document.getElementById('rewardMaterialSearch').value.toLowerCase();
  const options = document.querySelectorAll('.reward-material-option');
  options.forEach(opt => {
    const text = opt.textContent.toLowerCase();
    opt.style.display = text.includes(search) ? 'block' : 'none';
  });
}

function submitRewardPackage() {
  const id = document.getElementById('rewardPackageId').value.trim();
  const name = document.getElementById('rewardPackageName').value.trim();
  
  if (!id || !name) {
    alert('Please provide both Reward ID and Name');
    return;
  }
  
  const xp = parseInt(document.getElementById('rewardPackageXP').value) || 0;
  const gold = parseInt(document.getElementById('rewardPackageGold').value) || 0;
  
  // Collect items with quantities
  const selectedItems = [];
  document.querySelectorAll('#rewardItemSelector input[type="checkbox"]:checked').forEach(cb => {
    const qtyInput = cb.closest('.reward-item-option').querySelector('.item-qty');
    const quantity = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
    selectedItems.push({
      id: cb.value,
      quantity: quantity
    });
  });
  
  // Collect materials with quantities
  const selectedMaterials = [];
  document.querySelectorAll('#rewardMaterialSelector input[type="checkbox"]:checked').forEach(cb => {
    const qtyInput = cb.closest('.reward-material-option').querySelector('.material-qty');
    const quantity = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
    selectedMaterials.push({
      id: cb.value,
      quantity: quantity
    });
  });
  
  fetch('/api/rewards', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id,
      name,
      xp,
      gold,
      items: selectedItems,
      materials: selectedMaterials
    })
  })
  .then(r => r.json())
  .then(() => {
    closeRewardPackageModal();
    loadRewards();
  })
  .catch(err => alert('Error saving reward: ' + err.message));
}

function closeRewardPackageModal() {
  document.getElementById('rewardPackageModal').classList.remove('active');
  editingId = null;
  
  // Clear form
  document.getElementById('rewardPackageId').value = '';
  document.getElementById('rewardPackageId').readOnly = false;
  document.getElementById('rewardPackageName').value = '';
  document.getElementById('rewardPackageXP').value = '0';
  document.getElementById('rewardPackageGold').value = '0';
  
  // Clear search fields
  const itemSearch = document.getElementById('rewardItemSearch');
  const matSearch = document.getElementById('rewardMaterialSearch');
  if (itemSearch) itemSearch.value = '';
  if (matSearch) matSearch.value = '';
  
  // Clear selectors
  document.getElementById('rewardItemSelector').innerHTML = '<p style="opacity:0.6;margin:0">Loading items...</p>';
  document.getElementById('rewardMaterialSelector').innerHTML = '<p style="opacity:0.6;margin:0">Loading materials...</p>';
  
  // Reset title
  document.getElementById('rewardPackageModalTitle').textContent = 'Create Reward Package';
}

function editReward(id) {
  editingId = id;
  
  // Set modal title
  document.getElementById('rewardPackageModalTitle').textContent = 'Edit Reward Package';
  
  fetch('/api/rewards', { credentials: 'include' })
    .then(r => r.json())
    .then(rewards => {
      const reward = rewards[id];
      if (!reward) {
        alert('Reward not found');
        return;
      }
      
      document.getElementById('rewardPackageId').value = id;
      document.getElementById('rewardPackageId').readOnly = true;
      document.getElementById('rewardPackageName').value = reward.name || '';
      document.getElementById('rewardPackageXP').value = reward.xp || 0;
      document.getElementById('rewardPackageGold').value = reward.gold || 0;
      
      // Load items and materials for selection
      Promise.all([
        fetch('/api/items', { credentials: 'include' }).then(r => r.json()),
        fetch('/api/materials', { credentials: 'include' }).then(r => r.json())
      ]).then(([items, materials]) => {
        renderRewardItemSelector(items, reward.items || []);
        renderRewardMaterialSelector(materials, reward.materials || []);
        document.getElementById('rewardPackageSubmitBtn').textContent = 'Save Reward Package';
        document.getElementById('rewardPackageModal').classList.add('active');
      });
    })
    .catch(err => alert('Error loading reward: ' + err.message));
}

function deleteReward(id) {
  if (!confirm('Delete this reward?')) return;
  fetch('/api/rewards/' + id, { method: 'DELETE', credentials: 'include' }).then(() => loadRewards());
}

// ========== NPC FUNCTIONS ==========

function loadNPCs() {
  const worldFilter = document.getElementById('npc-world-filter')?.value || '';
  const url = '/api/npcs' + (worldFilter ? '?worldId=' + worldFilter : '');
  
  fetch(url, { method: 'GET', credentials: 'include' })
    .then(res => res.json())
    .then(npcs => {
      const container = document.getElementById('npcs-list');
      if (!npcs || npcs.length === 0) {
        container.innerHTML = '<p style="opacity:0.6">No NPCs yet. Create one to get started!</p>';
        return;
      }
      
      container.innerHTML = npcs.map(npc => {
        let html = '<div class="item-card" style="position:relative">' +
          '<h3>' + npc.name + '</h3>' +
          '<p style="opacity:0.7">Type: <strong>' + npc.type + '</strong></p>' +
          '<p>' + (npc.description || '(No description)') + '</p>';
        
        if (npc.location) {
          html += '<p style="opacity:0.7">📍 ' + npc.location + '</p>';
        }
        
        html += '<div class="item-actions">' +
          '<button class="btn-edit npc-edit" data-npc-id="' + npc.id + '">Edit</button>' +
          '<button class="btn-delete npc-delete" data-npc-id="' + npc.id + '">Delete</button>' +
          '</div></div>';
        return html;
      }).join('');
      
      // Attach event listeners for NPCs
      document.querySelectorAll('.npc-edit').forEach(btn => btn.addEventListener('click', function() { editNPC(this.getAttribute('data-npc-id')); }));
      document.querySelectorAll('.npc-delete').forEach(btn => btn.addEventListener('click', function() { deleteNPC(this.getAttribute('data-npc-id')); }));
    })
    .catch(err => {
      console.error('Error loading NPCs:', err);
      document.getElementById('npcs-list').innerHTML = '<p style="color:#ff6b6b">Error loading NPCs</p>';
    });
  
  // Load world filter options
  loadAvailableWorlds().then(worlds => {
    const filter = document.getElementById('npc-world-filter');
    if (filter) {
      const currentValue = filter.value;
      filter.innerHTML = '<option value="">All Worlds</option>' + 
        worlds.map(w => '<option value="' + w.id + '">' + w.name + '</option>').join('');
      filter.value = currentValue;
    }
  });
}

function loadNPCQuestSelector(selectedQuests = []) {
  if (!selectedWorldId) {
    const container = document.getElementById('npcQuestSelector');
    if (container) container.innerHTML = '<p style="opacity:0.6;margin:0">Select a world first to see available quests.</p>';
    return;
  }
  fetch('/api/editor/quests?worldId=' + selectedWorldId, { credentials: 'include' })
    .then(r => {
      if (!r.ok) throw new Error('Failed to load quests: ' + r.status);
      return r.json();
    })
    .then(data => {
      const container = document.getElementById('npcQuestSelector');
      if (!container) return;
      
      // Flatten all quest types into a single array
      const allQuests = [];
      if (data.main) allQuests.push(...data.main);
      if (data.side) allQuests.push(...data.side);
      if (data.daily) allQuests.push(...data.daily);
      
      if (!allQuests.length) {
        container.innerHTML = '<p style="opacity:0.6;margin:0">No quests available. Create quests first!</p>';
        return;
      }
      
      container.innerHTML = allQuests.map(quest => {
        const isSelected = selectedQuests.includes(quest.id);
        return '<div class="reward-item" style="margin-bottom:8px">' +
          '<input type="checkbox" id="quest_' + quest.id + '" ' + (isSelected ? 'checked' : '') + '>' +
          '<label for="quest_' + quest.id + '" style="flex:1;margin:0">' + quest.title + ' <code style="opacity:0.6">(' + quest.id + ')</code></label>' +
          '</div>';
      }).join('');
    })
    .catch(err => console.error('Error loading quests for selector:', err));
}

function getSelectedNPCQuests() {
  const container = document.getElementById('npcQuestSelector');
  if (!container) return [];
  const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked');
  return Array.from(checkboxes).map(cb => cb.id.replace('quest_', ''));
}

function createNPC() {
  editingId = null;
  document.getElementById('npcModal').querySelector('.modal-header h3').textContent = 'Create NPC';
  document.getElementById('npcName').value = '';
  document.getElementById('npcDescription').value = '';
  document.getElementById('npcType').value = '';
  document.getElementById('npcWorld').value = '';
  document.getElementById('npcLocation').value = '';
  document.getElementById('npcDialogue').value = '';
  document.getElementById('npcItems').value = '';
  
  // Load world options
  loadAvailableWorlds().then(worlds => {
    const select = document.getElementById('npcWorld');
    select.innerHTML = '<option value="">-- Select World --</option>' + 
      worlds.map(w => '<option value="' + w.id + '">' + w.name + '</option>').join('');
  });
  
  // Load quest selector
  loadNPCQuestSelector([]);
  
  document.getElementById('npcModal').classList.add('active');
}

function editNPC(npcId) {
  editingId = npcId;
  document.getElementById('npcModal').querySelector('.modal-header h3').textContent = 'Edit NPC';
  
  fetch('/api/npcs/' + npcId, { method: 'GET', credentials: 'include' })
    .then(res => res.json())
    .then(npc => {
      document.getElementById('npcName').value = npc.name || '';
      document.getElementById('npcDescription').value = npc.description || '';
      document.getElementById('npcType').value = npc.type || '';
      document.getElementById('npcLocation').value = npc.location || '';
      document.getElementById('npcDialogue').value = npc.dialogueText || '';
      document.getElementById('npcItems').value = (npc.inventory || []).join(',');
      
      // Load world options
      loadAvailableWorlds().then(worlds => {
        const select = document.getElementById('npcWorld');
        select.innerHTML = '<option value="">-- Select World --</option>' + 
          worlds.map(w => '<option value="' + w.id + '">' + w.name + '</option>').join('');
        select.value = npc.worldId || '';
        updateNPCTypeFields();
      });
      
      // Load quest selector with pre-selected quests
      loadNPCQuestSelector(npc.quests || []);
      // Load world options
      loadAvailableWorlds().then(worlds => {
        const select = document.getElementById('npcWorld');
        select.innerHTML = '<option value="">-- Select World --</option>' + 
          worlds.map(w => '<option value="' + w.id + '">' + w.name + '</option>').join('');
        select.value = npc.worldId || '';
        updateNPCTypeFields();
      });
      
      document.getElementById('npcModal').classList.add('active');
    })
    .catch(err => console.error('Error loading NPC:', err));
}

function closeNPCModal() {
  editingId = null;
  document.getElementById('npcModal').classList.remove('active');
}

function submitNPC() {
  const npcData = {
    name: document.getElementById('npcName').value?.trim(),
    description: document.getElementById('npcDescription').value?.trim(),
    type: document.getElementById('npcType').value,
    worldId: document.getElementById('npcWorld').value,
    location: document.getElementById('npcLocation').value?.trim(),
    dialogueText: document.getElementById('npcDialogue').value?.trim(),
    inventory: document.getElementById('npcItems').value?.split(',').filter(x => x.trim()),
    quests: getSelectedNPCQuests(),
  };
  
  if (!npcData.name || !npcData.type || !npcData.worldId) {
    alert('Please fill in Name, Type, and World fields');
    return;
  }
  
  const method = editingId ? 'PUT' : 'POST';
  const url = '/api/npcs' + (editingId ? '/' + editingId : '');
  
  fetch(url, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(npcData)
  })
    .then(res => res.json())
    .then(result => {
      if (result.success || result.npc) {
        closeNPCModal();
        loadNPCs();
      } else {
        alert('Error saving NPC');
      }
    })
    .catch(err => {
      console.error('Error submitting NPC:', err);
      alert('Error saving NPC: ' + err.message);
    });
}

function deleteNPC(npcId) {
  if (!confirm('Delete this NPC? This action cannot be undone.')) return;
  
  fetch('/api/npcs/' + npcId, { method: 'DELETE', credentials: 'include' })
    .then(res => res.json())
    .then(result => {
      if (result.success) {
        loadNPCs();
      } else {
        alert('Error deleting NPC');
      }
    })
    .catch(err => {
      console.error('Error deleting NPC:', err);
      alert('Error deleting NPC');
    });
}

function updateNPCTypeFields() {
  const type = document.getElementById('npcType').value;
  document.getElementById('npcMerchantItems').style.display = type === 'merchant' ? 'block' : 'none';
  document.getElementById('npcQuestGiverQuests').style.display = type === 'questgiver' ? 'block' : 'none';
}

// Attach the type change handler
const npcTypeSelect = document.getElementById('npcType');
if (npcTypeSelect) {
  npcTypeSelect.addEventListener('change', updateNPCTypeFields);
}

// ========== ITEM MANAGEMENT ==========

function loadItems() {
  const categoryFilter = document.getElementById('item-category-filter').value;
  const rarityFilter = document.getElementById('item-rarity-filter').value;
  const classFilter = document.getElementById('item-class-filter').value;
  const typeFilter = document.getElementById('item-type-filter').value;
  
  // Rarity order (worst to best)
  const rarityOrder = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
  
  fetch('/api/items', { credentials: 'include' })
    .then(res => res.json())
    .then(items => {
      const container = document.getElementById('items-list');
      
      // Apply client-side filters
      let filteredItems = items;
      
      if (categoryFilter) {
        filteredItems = filteredItems.filter(item => item.category === categoryFilter);
      }
      
      if (rarityFilter) {
        filteredItems = filteredItems.filter(item => item.rarity === rarityFilter);
      }
      
      if (classFilter) {
        if (classFilter === 'none') {
          filteredItems = filteredItems.filter(item => !item.classRestriction);
        } else {
          filteredItems = filteredItems.filter(item => item.classRestriction === classFilter);
        }
      }
      
      if (typeFilter) {
        filteredItems = filteredItems.filter(item => item.itemType === typeFilter);
      }
      
      // Sort by rarity (worst to best)
      filteredItems.sort((a, b) => {
        const rarityA = rarityOrder[a.rarity] ?? -1;
        const rarityB = rarityOrder[b.rarity] ?? -1;
        return rarityA - rarityB;
      });
      
      if (!filteredItems || filteredItems.length === 0) {
        container.innerHTML = '<p style="opacity:0.6">No items match the selected filters.</p>';
        return;
      }
      
      const rarityColors = {
        common: '#9d9d9d',
        uncommon: '#1eff00',
        rare: '#0070dd',
        epic: '#a335ee',
        legendary: '#ff8000'
      };
      
      container.innerHTML = filteredItems.map(item => {
        const color = rarityColors[item.rarity] || '#9d9d9d';
        const stats = [];
        if (item.damage > 0) stats.push('🗡️ ' + item.damage);
        if (item.defense > 0) stats.push('🛡️ ' + item.defense);
        if (item.heals > 0) stats.push('❤️ +' + item.heals);
        if (item.restoresMana > 0) stats.push('💧 +' + item.restoresMana);
        
        return '<div class="item-card" data-item-id="' + item.id + '">' +
          '<h4 style="color:' + color + '">' + item.name + '</h4>' +
          '<p class="item-category">' + (item.category || 'misc').toUpperCase() + '</p>' +
          '<p class="item-description">' + (item.description || '') + '</p>' +
          (stats.length ? '<p class="item-stats">' + stats.join(' | ') + '</p>' : '') +
          '<p class="item-value">💰 ' + (item.value || 0) + ' gold</p>' +
          (item.classRestriction ? '<p class="item-class">Class: ' + item.classRestriction + '</p>' : '') +
          '<div class="item-actions">' +
            '<button class="btn-edit item-edit">Edit</button> ' +
            '<button class="btn-delete item-delete">Delete</button>' +
          '</div>' +
        '</div>';
      }).join('');
      
      // Attach event listeners
      document.querySelectorAll('.item-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const itemId = e.target.closest('.item-card').dataset.itemId;
          editItem(itemId);
        });
      });
      
      document.querySelectorAll('.item-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const itemId = e.target.closest('.item-card').dataset.itemId;
          deleteItem(itemId);
        });
      });
    })
    .catch(err => {
      console.error('Error loading items:', err);
      document.getElementById('items-list').innerHTML = '<p style="color:#ff4444">Error loading items</p>';
    });
}

function loadMaterials() {
  const sourceFilter = document.getElementById('material-source-filter')?.value || '';
  const rarityFilter = document.getElementById('material-rarity-filter')?.value || '';
  
  // Rarity order (worst to best)
  const rarityOrder = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
  
  fetch('/api/materials', { credentials: 'include' })
    .then(r => r.json())
    .then(data => {
      const materials = data.materials || data || {};
      materialsCache = materials;
      const container = document.getElementById('materials-list');
      let entries = Object.entries(materials);
      
      // Apply filters
      if (sourceFilter) {
        entries = entries.filter(([id, m]) => {
          const sources = Array.isArray(m.source) ? m.source : [m.source];
          return sources.includes(sourceFilter);
        });
      }
      
      if (rarityFilter) {
        entries = entries.filter(([id, m]) => m.rarity === rarityFilter);
      }
      
      // Sort by rarity (worst to best)
      entries.sort((a, b) => {
        const rarityA = rarityOrder[a[1].rarity] ?? -1;
        const rarityB = rarityOrder[b[1].rarity] ?? -1;
        return rarityA - rarityB;
      });
      
      if (!entries.length) {
        container.innerHTML = '<p style="text-align:center;opacity:0.6">No materials match filters</p>';
        return;
      }
      container.innerHTML = entries.map(([id, m]) => {
        const sources = Array.isArray(m.source) ? m.source : [m.source];
        
        // Build sources display with gathering type if applicable
        let sourcesDisplay = sources.map(source => {
          if (source === 'gathering' && m.gatheringType) {
            return source + ' (' + m.gatheringType + ')';
          }
          return source;
        }).join(', ');
        
        let info = '<p><strong>Rarity:</strong> ' + (m.rarity || 'common') + '</p>' +
          '<p><strong>Value:</strong> ' + (m.value || 1) + ' gold</p>' +
          '<p><strong>Drop Chance:</strong> ' + (m.dropChance || 100) + '%</p>' +
          '<p><strong>Adventure Lvl:</strong> ' + (m.adventureLevel || 1) + '</p>' +
          '<p><strong>Sources:</strong> ' + sourcesDisplay + '</p>';
        
        return '<div class="item-card" data-material-id="' + id + '">' +
          '<h4>' + (m.name || id) + '</h4>' +
          '<p><strong>ID:</strong> ' + id + '</p>' +
          info +
          '<div class="item-actions">' +
            '<button class="btn-edit" data-material-id="' + id + '" onclick="editMaterialFromCard(this)">Edit</button>' +
            '<button class="btn-delete" data-material-id="' + id + '" onclick="deleteMaterialFromCard(this)">Delete</button>' +
          '</div>' +
        '</div>';
      }).join('');
    })
    .catch(err => {
      console.error('Error loading materials:', err);
      document.getElementById('materials-list').innerHTML = '<p style="color:#ff4444">Error loading materials</p>';
    });
}

function editMaterialFromCard(button) {
  const id = button.getAttribute('data-material-id');
  editMaterial(id);
}

function deleteMaterialFromCard(button) {
  const id = button.getAttribute('data-material-id');
  deleteMaterial(id);
}

function createMaterial() {
  editingMaterialId = null;
  document.getElementById('materialModalTitle').textContent = 'Create Material';
  document.getElementById('materialName').value = '';
  document.getElementById('materialId').value = '';
  document.getElementById('materialRarity').value = 'common';
  document.getElementById('materialValue').value = '1';
  document.getElementById('materialDropChance').value = '100';
  document.getElementById('materialAdventureLevel').value = '1';
  document.getElementById('materialGatheringType').value = '';
  // Uncheck all source checkboxes
  document.querySelectorAll('input[name="materialSource"]').forEach(cb => {
    cb.checked = false;
    cb.onchange = updateMaterialSourceFields;
  });
  // Check adventure by default
  document.querySelector('input[name="materialSource"][value="adventure"]').checked = true;
  updateMaterialSourceFields();
  document.getElementById('materialModal').classList.add('active');
}

function editMaterial(materialId) {
  editingMaterialId = materialId;
  document.getElementById('materialModalTitle').textContent = 'Edit Material';
  const material = materialsCache[materialId];
  if (material) {
    document.getElementById('materialName').value = material.name || '';
    document.getElementById('materialId').value = materialId;
    document.getElementById('materialRarity').value = material.rarity || 'common';
    document.getElementById('materialValue').value = material.value || 1;
    document.getElementById('materialDropChance').value = material.dropChance || 100;
    document.getElementById('materialAdventureLevel').value = material.adventureLevel || 1;
    document.getElementById('materialGatheringType').value = material.gatheringType || '';
    
    // Set multiple sources
    const sources = Array.isArray(material.source) ? material.source : (material.source ? [material.source] : []);
    document.querySelectorAll('input[name="materialSource"]').forEach(cb => {
      cb.checked = sources.includes(cb.value);
      cb.onchange = updateMaterialSourceFields;
    });
    
    updateMaterialSourceFields();
    document.getElementById('materialModal').classList.add('active');
  } else {
    loadMaterials();
  }
}

function updateMaterialSourceFields() {
  const sourceCheckboxes = document.querySelectorAll('input[name="materialSource"]:checked');
  const gatheringField = document.getElementById('gatheringCustomField');
  let hasGathering = false;
  sourceCheckboxes.forEach(cb => {
    if (cb.value === 'gathering') hasGathering = true;
  });
  gatheringField.style.display = hasGathering ? 'block' : 'none';
}

function closeMaterialModal() {
  editingMaterialId = null;
  document.getElementById('materialModal').classList.remove('active');
}

function submitMaterial() {
  const name = document.getElementById('materialName').value.trim();
  const customId = document.getElementById('materialId').value.trim();
  if (!name) {
    alert('Please enter a material name');
    return;
  }

  // Get all selected sources
  const sources = [];
  document.querySelectorAll('input[name="materialSource"]:checked').forEach(cb => {
    sources.push(cb.value);
  });
  
  if (sources.length === 0) {
    alert('Please select at least one source');
    return;
  }

  const payload = {
    id: customId || undefined,
    name,
    rarity: document.getElementById('materialRarity').value,
    value: parseInt(document.getElementById('materialValue').value) || 1,
    dropChance: parseInt(document.getElementById('materialDropChance').value) || 100,
    adventureLevel: parseInt(document.getElementById('materialAdventureLevel').value) || 1,
    source: sources
  };
  
  // Add custom gathering type if gathering source is selected
  if (sources.includes('gathering')) {
    const gatheringType = document.getElementById('materialGatheringType').value.trim();
    if (gatheringType) {
      payload.gatheringType = gatheringType;
    }
  }

  const method = editingMaterialId ? 'PUT' : 'POST';
  const url = editingMaterialId ? '/api/materials/' + editingMaterialId : '/api/materials';

  fetch(url, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(res => {
      if (!res.ok) {
        return res.text().then(text => {
          console.error('API Error Response:', res.status, res.statusText, text);
          throw new Error('HTTP ' + res.status + ': ' + res.statusText);
        });
      }
      return res.json();
    })
    .then(result => {
      if (result.success || result.material) {
        closeMaterialModal();
        loadMaterials();
        loadMaterialsForSelector();
      } else {
        alert('Error saving material: ' + (result.error || 'Unknown error'));
      }
    })
    .catch(err => {
      console.error('Error saving material:', err);
      alert('Error saving material: ' + err.message);
    });
}

function deleteMaterial(materialId) {
  if (!confirm('Delete this material?')) return;
  fetch('/api/materials/' + materialId, { method: 'DELETE', credentials: 'include' })
    .then(res => {
      if (!res.ok) {
        return res.text().then(text => {
          console.error('API Error Response:', res.status, res.statusText, text);
          throw new Error('HTTP ' + res.status + ': ' + res.statusText);
        });
      }
      return res.json();
    })
    .then(result => {
      if (result.success) {
        loadMaterials();
        loadMaterialsForSelector();
      } else {
        alert('Error deleting material: ' + (result.error || 'Unknown error'));
      }
    })
    .catch(err => {
      console.error('Error deleting material:', err);
      alert('Error deleting material: ' + err.message);
    });
}

function loadMaterialsForSelector() {
  const select = document.getElementById('recipeMaterialSelect');
  if (!select) return;
  fetch('/api/materials', { credentials: 'include' })
    .then(r => {
      if (!r.ok) {
        return r.text().then(text => {
          console.error('API Error:', r.status, r.statusText, text);
          throw new Error('HTTP ' + r.status + ': ' + r.statusText);
        });
      }
      return r.json();
    })
    .then(data => {
      // Handle both formats: direct materials object or wrapped in { materials: ... }
      const materials = (data && data.materials) ? data.materials : (data || {});
      console.log('Loaded materials:', Object.keys(materials).length, materials);
      materialsCache = materials;
      const entries = Object.entries(materials);
      select.innerHTML = entries.length
        ? entries.map(([id, m]) => '<option value="' + id + '">' + (m.name || id) + ' (' + id + ')</option>').join('')
        : '<option value="">No materials available</option>';
    })
    .catch(err => {
      console.error('Error loading materials for selector:', err);
      select.innerHTML = '<option value="">Error loading materials</option>';
    });
}

function addMaterialToRecipe() {
  const select = document.getElementById('recipeMaterialSelect');
  const qtyInput = document.getElementById('recipeMaterialQty');
  if (!select || !qtyInput) return;
  const id = select.value;
  const qty = Math.max(1, parseInt(qtyInput.value) || 1);
  if (!id) return;
  currentRecipeMaterials[id] = qty;
  renderRecipeMaterialsList();
}

function removeMaterialFromRecipe(button) {
  const id = button.getAttribute('data-material-id');
  delete currentRecipeMaterials[id];
  renderRecipeMaterialsList();
}

function renderRecipeMaterialsList() {
  const list = document.getElementById('recipeMaterialsList');
  if (!list) return;
  const entries = Object.entries(currentRecipeMaterials);
  if (!entries.length) {
    list.innerHTML = '<p style="opacity:0.6">No materials selected</p>';
    syncRecipeMaterialsTextarea();
    return;
  }
  list.innerHTML = entries.map(([id, qty]) => {
    const name = materialsCache[id]?.name || id;
    return '<div class="reward-item" style="justify-content:space-between">' +
      '<label>' + name + ' (' + id + ')</label>' +
      '<input type="number" min="1" value="' + qty + '" data-material-id="' + id + '" onchange="updateMaterialQuantity(this)" style="width:80px">' +
      '<button type="button" class="btn-cancel" style="width:auto;padding:6px 10px" data-material-id="' + id + '" onclick="removeMaterialFromRecipe(this)">Remove</button>' +
      '</div>';
  }).join('');
  syncRecipeMaterialsTextarea();
}

function updateMaterialQuantity(input) {
  const id = input.getAttribute('data-material-id');
  currentRecipeMaterials[id] = parseInt(input.value) || 1;
  syncRecipeMaterialsTextarea();
}

function syncRecipeMaterialsTextarea() {
  const textarea = document.getElementById('itemRecipeMaterials');
  if (textarea) textarea.value = JSON.stringify(currentRecipeMaterials);
}

function setRecipeMaterialsFromObject(materials) {
  currentRecipeMaterials = materials && typeof materials === 'object' ? { ...materials } : {};
  renderRecipeMaterialsList();
}

function createItem() {
  editingId = null;
  document.getElementById('itemModal').querySelector('.modal-header h3').textContent = 'Create Item';
  document.getElementById('itemName').value = '';
  document.getElementById('itemDescription').value = '';
  document.getElementById('itemCategory').value = '';
  document.getElementById('itemType').value = '';
  document.getElementById('itemRarity').value = '';
  document.getElementById('itemValue').value = '10';
  document.getElementById('itemDamage').value = '0';
  document.getElementById('itemDefense').value = '0';
  document.getElementById('itemHeals').value = '0';
  document.getElementById('itemRestoresMana').value = '0';
  document.getElementById('itemStrength').value = '0';
  document.getElementById('itemIntelligence').value = '0';
  document.getElementById('itemWisdom').value = '0';
  document.getElementById('itemAgility').value = '0';
  document.getElementById('itemLuck').value = '0';
  document.getElementById('itemHP').value = '0';
  document.getElementById('itemMana').value = '0';
  document.getElementById('itemClassRestriction').value = '';
  document.getElementById('itemLevelRequirement').value = '1';
  document.getElementById('itemRecipeLevel').value = '1';
  document.getElementById('itemCraftTime').value = '5';
  setRecipeMaterialsFromObject({});
  loadMaterialsForSelector();
  
  updateItemFormFields();
  updateRarityColor();
  
  document.getElementById('itemModal').classList.add('active');
}

function editItem(itemId) {
  editingId = itemId;
  document.getElementById('itemModal').querySelector('.modal-header h3').textContent = 'Edit Item';
  
  fetch('/api/items/' + itemId, { method: 'GET', credentials: 'include' })
    .then(res => res.json())
    .then(item => {
      document.getElementById('itemName').value = item.name || '';
      document.getElementById('itemDescription').value = item.description || '';
      document.getElementById('itemCategory').value = item.category || '';
      document.getElementById('itemType').value = item.itemType || '';
      document.getElementById('itemRarity').value = item.rarity || '';
      document.getElementById('itemValue').value = item.value || 10;
      document.getElementById('itemDamage').value = item.damage || 0;
      document.getElementById('itemDefense').value = item.defense || 0;
      document.getElementById('itemHeals').value = item.heals || 0;
      document.getElementById('itemRestoresMana').value = item.restoresMana || 0;
      document.getElementById('itemStrength').value = item.strength || 0;
      document.getElementById('itemIntelligence').value = item.intelligence || 0;
      document.getElementById('itemWisdom').value = item.wisdom || 0;
      document.getElementById('itemAgility').value = item.agility || 0;
      document.getElementById('itemLuck').value = item.luck || 0;
      document.getElementById('itemHP').value = item.hp || 0;
      document.getElementById('itemMana').value = item.mana || 0;
      document.getElementById('itemClassRestriction').value = item.classRestriction || '';
      document.getElementById('itemLevelRequirement').value = item.levelRequirement || 1;
      loadMaterialsForSelector();
      setRecipeMaterialsFromObject({});
      fetch('/api/recipes/by-item/' + itemId, { credentials: 'include' })
        .then(res => res.ok ? res.json() : null)
        .then(recipe => {
          if (recipe && recipe.materials) {
            setRecipeMaterialsFromObject(recipe.materials);
            document.getElementById('itemRecipeLevel').value = recipe.level || 1;
            document.getElementById('itemCraftTime').value = recipe.craftTime || 5;
          } else {
            document.getElementById('itemRecipeLevel').value = 1;
            document.getElementById('itemCraftTime').value = 5;
          }
        })
        .catch(() => {
          document.getElementById('itemRecipeLevel').value = 1;
          document.getElementById('itemCraftTime').value = 5;
        });
      
      updateItemFormFields();
      updateRarityColor();
      
      document.getElementById('itemModal').classList.add('active');
    })
    .catch(err => console.error('Error loading item:', err));
}

function closeItemModal() {
  editingId = null;
  document.getElementById('itemModal').classList.remove('active');
}

function submitItem() {
  const itemData = {
    name: document.getElementById('itemName').value?.trim(),
    description: document.getElementById('itemDescription').value?.trim(),
    category: document.getElementById('itemCategory').value,
    itemType: document.getElementById('itemType').value || null,
    rarity: document.getElementById('itemRarity').value,
    value: parseInt(document.getElementById('itemValue').value) || 0,
    damage: parseInt(document.getElementById('itemDamage').value) || 0,
    defense: parseInt(document.getElementById('itemDefense').value) || 0,
    heals: parseInt(document.getElementById('itemHeals').value) || 0,
    restoresMana: parseInt(document.getElementById('itemRestoresMana').value) || 0,
    strength: parseInt(document.getElementById('itemStrength').value) || 0,
    intelligence: parseInt(document.getElementById('itemIntelligence').value) || 0,
    wisdom: parseInt(document.getElementById('itemWisdom').value) || 0,
    agility: parseInt(document.getElementById('itemAgility').value) || 0,
    luck: parseInt(document.getElementById('itemLuck').value) || 0,
    hp: parseInt(document.getElementById('itemHP').value) || 0,
    mana: parseInt(document.getElementById('itemMana').value) || 0,
    classRestriction: document.getElementById('itemClassRestriction').value || null,
    levelRequirement: parseInt(document.getElementById('itemLevelRequirement').value) || 1,
  };
  
  if (!itemData.name || !itemData.category || !itemData.rarity) {
    alert('Please fill in Name, Category, and Rarity fields');
    return;
  }
  
  const method = editingId ? 'PUT' : 'POST';
  const url = '/api/items' + (editingId ? '/' + editingId : '');
  
  fetch(url, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(itemData)
  })
    .then(res => res.json())
    .then(async result => {
      if (result.success || result.item) {
        // Get the item ID (from result or from editingId)
        const itemId = result.item?.id || editingId;
        
        // Try to create recipe with materials if provided
        const materials = currentRecipeMaterials || {};
        if (itemId && Object.keys(materials).length) {
          const recipeData = {
            id: 'recipe_' + itemId,
            name: 'Craft ' + itemData.name,
            profession: 'blacksmith',
            level: parseInt(document.getElementById('itemRecipeLevel').value) || 1,
            craftTime: parseInt(document.getElementById('itemCraftTime').value) || 5,
            materials: materials,
            output: {
              item: itemId,
              quantity: 1
            }
          };

          await fetch('/api/recipes', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(recipeData)
          });
          // Recipe creation success is optional, don't block item save
        }
        
        closeItemModal();
        loadItems();
      } else {
        alert('Error saving item');
      }
    })
    .catch(err => {
      console.error('Error submitting item:', err);
      alert('Error saving item: ' + err.message);
    });
}

function deleteItem(itemId) {
  if (!confirm('Delete this item? This action cannot be undone.')) return;
  
  fetch('/api/items/' + itemId, { method: 'DELETE', credentials: 'include' })
    .then(res => res.json())
    .then(result => {
      if (result.success) {
        loadItems();
      } else {
        alert('Error deleting item');
      }
    })
    .catch(err => {
      console.error('Error deleting item:', err);
      alert('Error deleting item');
    });
}

function updateItemFormFields() {
  const category = document.getElementById('itemCategory').value;
  
  // Show/hide item type selector based on category
  const typeGroup = document.getElementById('itemTypeGroup');
  const typeSelect = document.getElementById('itemType');
  
  if (category === 'weapon') {
    typeGroup.style.display = 'block';
    typeSelect.innerHTML = '<option value="">-- Select Type --</option>' +
      '<option value="fist">Fist</option>' +
      '<option value="sword">Sword</option>' +
      '<option value="axe">Axe</option>' +
      '<option value="bow">Bow</option>' +
      '<option value="staff">Staff</option>' +
      '<option value="dagger">Dagger</option>' +
      '<option value="hammer">Hammer</option>' +
      '<option value="spear">Spear</option>' +
      '<option value="wand">Wand</option>';
  } else if (category === 'armor') {
    typeGroup.style.display = 'block';
    typeSelect.innerHTML = '<option value="">-- Select Type --</option>' +
      '<option value="helm">Helm</option>' +
      '<option value="chest">Chest</option>' +
      '<option value="legs">Legs</option>' +
      '<option value="boots">Boots</option>' +
      '<option value="gloves">Gloves</option>' +
      '<option value="shield">Shield</option>' +
      '<option value="cloak">Cloak</option>' +
      '<option value="ring">Ring</option>' +
      '<option value="amulet">Amulet</option>';
  } else {
    typeGroup.style.display = 'none';
    typeSelect.value = '';
  }
  
  // Show/hide combat stats for weapons and armor
  const combatStats = document.getElementById('itemCombatStats');
  combatStats.style.display = (category === 'weapon' || category === 'armor' || category === 'equipment') ? 'block' : 'none';
  
  // Show/hide healing stats for consumables
  const healingStats = document.getElementById('itemHealingStats');
  healingStats.style.display = (category === 'consumable') ? 'block' : 'none';
}

function updateRarityColor() {
  const rarity = document.getElementById('itemRarity').value;
  const preview = document.getElementById('rarityPreview');
  
  const rarityColors = {
    common: { color: '#9d9d9d', text: 'Common (Gray)' },
    uncommon: { color: '#1eff00', text: 'Uncommon (Green)' },
    rare: { color: '#0070dd', text: 'Rare (Blue)' },
    epic: { color: '#a335ee', text: 'Epic (Purple)' },
    legendary: { color: '#ff8000', text: 'Legendary (Orange)' }
  };
  
  if (rarity && rarityColors[rarity]) {
    preview.innerHTML = '<strong style="color:' + rarityColors[rarity].color + '">' + rarityColors[rarity].text + '</strong>';
  } else {
    preview.innerHTML = '';
  }
}

// Load initial content
loadWorlds();
</script>
`;
}
