/**
 * Guidance Editor Tab — Dashboard UI
 *
 * Visual editor for guidance-config.json.
 * Allows admins to:
 *  - Add/edit/remove worlds, categories, and cards
 *  - Set tiers (threshold + label + note) per card
 *  - Assign extractors from the known list
 *  - Preview live evaluation output for any stored account
 *  - Reorder items via drag-and-drop
 */

export function renderGuidanceEditorTab(userTier) {
  const isAdmin = ['owner', 'admin'].includes(userTier);

  return `
<style>
/* ── Guidance Editor ── */
.ge{display:grid;grid-template-columns:280px 1fr;gap:16px;height:calc(100vh - 80px);overflow:hidden}
@media(max-width:900px){.ge{grid-template-columns:1fr;height:auto;overflow:auto}}
.ge-tree{background:#12121c;border:1px solid #2a2a3a;border-radius:8px;overflow-y:auto;display:flex;flex-direction:column}
.ge-tree-hdr{padding:12px 14px;background:#1a1a2a;border-bottom:1px solid #2a2a3a;font-size:13px;font-weight:700;color:#c4b8f0;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.ge-main{background:#12121c;border:1px solid #2a2a3a;border-radius:8px;overflow-y:auto;display:flex;flex-direction:column}
.ge-main-hdr{padding:12px 18px;background:#1a1a2a;border-bottom:1px solid #2a2a3a;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.ge-main-body{padding:16px;flex:1}

/* ── Tree Items ── */
.ge-world{border-bottom:1px solid #1e1e2e}
.ge-world-row{display:flex;align-items:center;padding:8px 14px;cursor:pointer;gap:8px;font-size:13px;font-weight:600;color:#c4b8f0;user-select:none}
.ge-world-row:hover{background:#1a1a2e}
.ge-world-row.active{background:#1e1830;border-left:3px solid #7c3aed}
.ge-world-chv{margin-right:auto;color:#6060a0}
.ge-world-chv.open{transform:rotate(90deg)}
.ge-world-body{display:none;padding-left:12px}
.ge-world-body.open{display:block}
.ge-cat-row{display:flex;align-items:center;padding:6px 10px;cursor:pointer;gap:6px;font-size:12px;color:#a0a0c0;border-radius:4px;margin:1px 4px;user-select:none}
.ge-cat-row:hover{background:#1a1a2e}
.ge-cat-row.active{background:#1c1440;color:#d4b8ff;font-weight:600}
.ge-card-row{display:flex;align-items:center;padding:4px 8px;cursor:pointer;gap:5px;font-size:11px;color:#8080a0;border-radius:3px;margin:1px 4px;padding-left:22px;user-select:none}
.ge-card-row:hover{background:#16162a}
.ge-card-row.active{background:#160f30;color:#c4a8ff}

/* ── Editor Forms ── */
.ge-form-section{margin-bottom:18px}
.ge-form-section h3{font-size:13px;font-weight:700;color:#a0a0c0;margin:0 0 10px;padding-bottom:6px;border-bottom:1px solid #1e1e2e;display:flex;align-items:center;gap:6px}
.ge-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}
.ge-row.full{grid-template-columns:1fr}
.ge-field{display:flex;flex-direction:column;gap:4px}
.ge-field label{font-size:11px;color:#7878a0;font-weight:600}
.ge-field input,.ge-field select,.ge-field textarea{background:#1a1a2a;border:1px solid #2e2e42;border-radius:5px;padding:6px 10px;color:#d0d0e0;font-size:12px;outline:none;width:100%}
.ge-field input:focus,.ge-field select:focus,.ge-field textarea:focus{border-color:#7c3aed}
.ge-field textarea{resize:vertical;min-height:60px;font-family:inherit}
.ge-field select option{background:#1a1a2a}

/* ── Tier editor ── */
.ge-tiers{display:flex;flex-direction:column;gap:6px}
.ge-tier{background:#161622;border:1px solid #2a2a3c;border-radius:5px;padding:6px 8px}
.ge-tier-main{display:grid;grid-template-columns:auto 110px 90px 1fr 1fr auto;gap:6px;align-items:center}
.ge-tier-num{font-size:10px;color:#6060a0;font-weight:700;min-width:18px;text-align:center}
.ge-tier-del{background:none;border:none;color:#604060;font-size:14px;cursor:pointer;padding:0 4px}
.ge-tier-del:hover{color:#ff5555}
.ge-tier-extras{display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding:4px 0 2px 28px}
.ge-tier-extra{display:flex;align-items:center;gap:6px;font-size:11px;color:#8080a0}
.ge-tier-extra label{white-space:nowrap}
.ge-tier-add{background:#1c1c2e;border:1px dashed #3a3a50;border-radius:5px;padding:6px;color:#6060a0;font-size:11px;cursor:pointer;text-align:center;width:100%;margin-top:4px}
.ge-tier-add:hover{background:#1e1e36;color:#a0a0c0}

/* ── Icon picker (emoji or image upload) ── */
.ge-icon-picker{display:flex;align-items:center;gap:8px}
.ge-icon-preview{width:32px;height:32px;border-radius:5px;background:#111;border:1px solid #2a2a3c;display:flex;align-items:center;justify-content:center;font-size:20px;overflow:hidden;flex-shrink:0}
.ge-icon-preview img{width:100%;height:100%;object-fit:contain}
.ge-icon-upload-btn{background:#1c1c2e;border:1px solid #3a3a50;border-radius:4px;padding:3px 8px;color:#8080c0;font-size:10px;cursor:pointer;white-space:nowrap}
.ge-icon-upload-btn:hover{background:#262640;color:#b0b0e0}

/* ── Buttons ── */
.ge-btn{padding:7px 16px;border-radius:6px;border:none;font-size:12px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:5px}
.ge-btn.primary{background:#5b3aed;color:#fff}
.ge-btn.primary:hover{background:#6b4af0}
.ge-btn.danger{background:#3a142a;color:#ff8888;border:1px solid #502030}
.ge-btn.danger:hover{background:#4a1a35}
.ge-btn.secondary{background:#1c1c2e;color:#a0a0c0;border:1px solid #2e2e42}
.ge-btn.secondary:hover{background:#222236}
.ge-btn.success{background:#1a3a20;color:#81c784;border:1px solid #2a5030}
.ge-btn.success:hover{background:#1e4424}
.ge-btn[disabled]{opacity:.4;pointer-events:none}

/* ── Rating bar ── */
.ge-rating{display:flex;align-items:center;gap:8px}
.ge-rating-bar{flex:1;height:6px;background:#1a1a2a;border-radius:3px;overflow:hidden}
.ge-rating-fill{height:100%;background:linear-gradient(90deg,#5b3aed,#c084fc);border-radius:3px;transition:width .4s}
.ge-pct{font-size:11px;color:#9090b0;min-width:36px;text-align:right}

/* ── Preview panel ── */
.ge-preview{background:#110d1e;border:1px solid #2a1840;border-radius:6px;padding:12px}
.ge-preview-world{margin-bottom:10px}
.ge-preview-world-hdr{display:flex;align-items:center;gap:8px;padding:6px 10px;background:#1a1428;border-radius:5px;margin-bottom:6px;cursor:pointer}
.ge-preview-world-hdr span{font-size:12px;font-weight:700;color:#c4a8ff}
.ge-preview-cat{margin-left:10px;margin-bottom:6px}
.ge-preview-cat-hdr{font-size:11px;color:#8080a0;padding:3px 8px;display:flex;align-items:center;gap:6px}
.ge-card-chip{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:12px;font-size:10px;background:#1a1a2a;border:1px solid #2a2a3a;margin:2px;color:#a0a0c0}
.ge-card-chip.t0{border-color:#404040;color:#606060}
.ge-card-chip.t1{border-color:#4060a0;color:#8abcff}
.ge-card-chip.t2{border-color:#4a5a30;color:#a0c870}
.ge-card-chip.t3{border-color:#6050a0;color:#c090ff}
.ge-card-chip.t4{border-color:#a06020;color:#ffcc60}
.ge-card-chip.tmax{border-color:#a08010;color:#ffe060;background:#1e1800}

/* ── Notif ── */
.ge-notif{position:fixed;bottom:24px;right:24px;padding:10px 18px;background:#1a1a2a;border:1px solid #3a3a50;border-radius:8px;color:#e0e0e0;font-size:13px;z-index:9999;display:none;gap:8px;align-items:center;box-shadow:0 4px 20px rgba(0,0,0,.5)}
.ge-notif.show{display:flex}
.ge-notif.ok{border-color:#4caf50;color:#81c784}
.ge-notif.err{border-color:#f44336;color:#ff8888}

/* ── Empty state ── */
.ge-empty{text-align:center;color:#5060a0;padding:40px 20px;font-size:13px}
.ge-empty .ge-empty-icon{font-size:36px;margin-bottom:10px}
</style>

<div class="ge" id="geRoot">
  <!-- Tree panel -->
  <div class="ge-tree" id="geTree">
    <div class="ge-tree-hdr">
      <span>📋 Config Tree</span>
      <div style="display:flex;gap:6px">
        <button class="ge-btn secondary" style="padding:3px 8px;font-size:10px" onclick="geAddWorld()">+ World</button>
      </div>
    </div>
    <div id="geTreeBody" style="flex:1;overflow-y:auto;padding:4px 0">
      <div class="ge-empty"><div class="ge-empty-icon">📡</div>Loading config...</div>
    </div>
  </div>

  <!-- Editor/preview panel -->
  <div class="ge-main" id="geMain">
    <div class="ge-main-hdr">
      <div style="display:flex;align-items:center;gap:10px">
        <span id="geMainBreadcrumb" style="font-size:13px;color:#8080a0">Select an item from the tree</span>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <button class="ge-btn success" onclick="geSaveConfig()" id="geSaveBtn">💾 Save Config</button>
        <button class="ge-btn secondary" onclick="geTogglePreview()" id="gePreviewBtn">👁 Preview</button>
      </div>
    </div>
    <div class="ge-main-body" id="geMainBody">
      <div class="ge-empty"><div class="ge-empty-icon">🗂️</div>Select a world, category, or card from the tree to edit it.</div>
    </div>
  </div>
</div>

<div class="ge-notif" id="geNotif"></div>

<script>
// ── State ──────────────────────────────────────────────────────────────────
let _geCfg = null;            // full guidance config
let _geExtractors = [];       // list of valid extractor IDs
let _geExtractorMeta = {};    // metadata per extractor ID
let _geSelected = { worldIdx: null, catIdx: null, cardIdx: null };
let _gePreviewData = null;    // last evaluation result
let _gePreviewVisible = false;
let _geDirty = false;

// ── Boot ───────────────────────────────────────────────────────────────────
geInit();

async function geInit() {
  try {
    const [cfgRes, extRes, metaRes] = await Promise.all([
      fetch('/api/guidance/config'),
      fetch('/api/guidance/extractors'),
      fetch('/api/guidance/extractor-meta'),
    ]);
    _geCfg = await cfgRes.json();
    _geExtractors = await extRes.json();
    _geExtractorMeta = await metaRes.json();
    geRenderTree();
    geShowNotif('Config loaded', 'ok');
  } catch(e) {
    geShowNotif('Failed to load config: ' + e.message, 'err');
    document.getElementById('geTreeBody').innerHTML =
      '<div class="ge-empty"><div class="ge-empty-icon">⚠️</div>Failed to load: ' + e.message + '</div>';
  }
}

// ── Icon helpers (emoji text or image URL) ────────────────────────────────
function geIsImageIcon(icon) {
  return icon && (icon.startsWith('/') || icon.startsWith('http'));
}
function geRenderIcon(icon, fallback, size) {
  size = size || 20;
  if (geIsImageIcon(icon)) return '<img src="' + icon + '" style="width:' + size + 'px;height:' + size + 'px;object-fit:contain;vertical-align:middle">';
  return '<span style="font-size:' + size + 'px;line-height:1">' + (icon || fallback || '') + '</span>';
}
function geIconPickerHTML(fieldId, currentIcon, label) {
  label = label || 'Icon';
  const isImg = geIsImageIcon(currentIcon);
  const preview = isImg
    ? '<img src="' + currentIcon + '" style="width:100%;height:100%;object-fit:contain">'
    : (currentIcon || '');
  return '<div class="ge-field"><label>' + label + '</label>'
    + '<div class="ge-icon-picker">'
    + '<div class="ge-icon-preview" id="' + fieldId + '_preview">' + preview + '</div>'
    + '<input id="' + fieldId + '" value="' + (currentIcon || '') + '" placeholder="Emoji or image URL" style="flex:1;background:#111;border:1px solid #2a2a3c;border-radius:4px;padding:4px 6px;color:#d0d0e0;font-size:12px" oninput="geIconInputChanged(\\'' + fieldId + '\\')">'
    + '<label class="ge-icon-upload-btn" title="Upload PNG/APNG">\uD83D\uDCC2 Upload<input type="file" accept="image/*" style="display:none" onchange="geUploadIcon(\\'' + fieldId + '\\',this)"></label>'
    + '<button class="ge-icon-upload-btn" onclick="document.getElementById(\\'' + fieldId + '\\').value=\\'\\';geIconInputChanged(\\'' + fieldId + '\\')" title="Clear icon" style="color:#ff6060">✕</button>'
    + '</div></div>';
}
async function geUploadIcon(fieldId, fileInput) {
  const file = fileInput.files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append('image', file);
  try {
    const res = await fetch('/upload/image', { method: 'POST', body: fd });
    const data = await res.json();
    if (!data.success) { geShowNotif('Upload failed: ' + (data.error || 'Unknown'), 'err'); return; }
    document.getElementById(fieldId).value = data.url;
    geIconInputChanged(fieldId);
    geMark();
    geShowNotif('Image uploaded', 'ok');
  } catch (e) { geShowNotif('Upload error: ' + e.message, 'err'); }
  fileInput.value = '';
}
function geIconInputChanged(fieldId) {
  const input = document.getElementById(fieldId);
  const preview = document.getElementById(fieldId + '_preview');
  if (!input || !preview) return;
  const val = input.value.trim();
  if (geIsImageIcon(val)) {
    preview.innerHTML = '<img src="' + val + '" style="width:100%;height:100%;object-fit:contain">';
  } else {
    preview.innerHTML = val || '';
  }
  geMark();
}
async function geUploadTierIcon(fieldId, wi, ci, ki, ti, fileInput) {
  const file = fileInput.files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append('image', file);
  try {
    const res = await fetch('/upload/image', { method: 'POST', body: fd });
    const data = await res.json();
    if (!data.success) { geShowNotif('Upload failed: ' + (data.error || 'Unknown'), 'err'); return; }
    document.getElementById(fieldId).value = data.url;
    geTierChange(wi, ci, ki, ti, 'icon', data.url);
    geIconInputChanged(fieldId);
    geShowNotif('Tier icon uploaded', 'ok');
  } catch (e) { geShowNotif('Upload error: ' + e.message, 'err'); }
  fileInput.value = '';
}

// ── Extractor info panel ──────────────────────────────────────────────────
function geShowExtractorInfo(extId) {
  const panel = document.getElementById('ge_extractor_info');
  if (!panel) return;
  const m = _geExtractorMeta[extId];
  if (!m) {
    panel.style.display = 'none';
    return;
  }
  const typeColors = { count: '#60a8ff', max: '#ffc060', sum: '#80d080', score: '#d080ff' };
  const typeColor = typeColors[m.valueType] || '#8080a0';
  panel.style.display = 'block';
  panel.innerHTML = '<div style="display:flex;align-items:flex-start;gap:10px">'
    + '<div style="flex:1">'
    + '<div style="font-size:12px;font-weight:700;color:#c4b8f0;margin-bottom:3px">' + m.label + '</div>'
    + '<div style="font-size:11px;color:#9090b0;line-height:1.45;margin-bottom:5px">' + m.desc + '</div>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap">'
    + '<span style="font-size:10px;background:#161628;border:1px solid #2a2a3c;border-radius:3px;padding:2px 6px;color:#6080c0">\uD83D\uDDDD ' + m.dataKey + '</span>'
    + '<span style="font-size:10px;background:#161628;border:1px solid #2a2a3c;border-radius:3px;padding:2px 6px;color:' + typeColor + '">' + m.valueType + '</span>'
    + '<span style="font-size:10px;background:#161628;border:1px solid #2a2a3c;border-radius:3px;padding:2px 6px;color:#a0a060">max ~' + (m.maxHint != null ? m.maxHint.toLocaleString() : '?') + '</span>'
    + '</div></div></div>';
}

// ── Tree Render ────────────────────────────────────────────────────────────
function geRenderTree() {
  const body = document.getElementById('geTreeBody');
  if (!_geCfg?.worlds?.length) {
    body.innerHTML = '<div class="ge-empty"><div class="ge-empty-icon">🌍</div>No worlds yet. Add one!</div>';
    return;
  }
  body.innerHTML = _geCfg.worlds.map((world, wi) => {
    const isWorldOpen = _geSelected.worldIdx === wi;
    return \`<div class="ge-world" data-wi="\${wi}">
      <div class="ge-world-row \${isWorldOpen && _geSelected.catIdx == null ? 'active' : ''}"
           onclick="geSelectWorld(\${wi})">
        <span style="font-size:16px">\${geRenderIcon(world.icon, '🌍', 16)}</span>
        <span>\${world.label || world.id}</span>
        <span class="ge-world-chv \${isWorldOpen ? 'open' : ''}">›</span>
      </div>
      <div class="ge-world-body \${isWorldOpen ? 'open' : ''}">
        \${(world.categories || []).map((cat, ci) => {
          const isCatOpen = isWorldOpen && _geSelected.catIdx === ci;
          return \`<div class="ge-cat-row \${isCatOpen && _geSelected.cardIdx == null ? 'active' : ''}"
                       onclick="geSelectCat(\${wi}, \${ci})">
            <span>\${geRenderIcon(cat.icon, '📂', 14)}</span>
            <span style="flex:1">\${cat.label || cat.id}</span>
            <span style="font-size:10px;color:#404060">\${(cat.cards || []).length}c</span>
          </div>
          \${(cat.cards || []).map((card, ki) =>
            \`<div class="ge-card-row \${isCatOpen && _geSelected.cardIdx === ki ? 'active' : ''}"
                   onclick="geSelectCard(\${wi}, \${ci}, \${ki})">
              <span>\${geRenderIcon(card.icon, '🃏', 14)}</span>
              <span>\${card.label || card.id}</span>
            </div>\`
          ).join('')}\`;
        }).join('')}
        <div style="padding:4px 8px 8px">
          <button class="ge-tier-add" onclick="geAddCategory(\${wi})">+ Add Category</button>
        </div>
      </div>
    </div>\`;
  }).join('');
}

// ── Selection ─────────────────────────────────────────────────────────────
function geSelectWorld(wi) {
  _geSelected = { worldIdx: wi, catIdx: null, cardIdx: null };
  geRenderTree();
  geRenderEditor();
}
function geSelectCat(wi, ci) {
  _geSelected = { worldIdx: wi, catIdx: ci, cardIdx: null };
  geRenderTree();
  geRenderEditor();
}
function geSelectCard(wi, ci, ki) {
  _geSelected = { worldIdx: wi, catIdx: ci, cardIdx: ki };
  geRenderTree();
  geRenderEditor();
}

// ── Editor Render ──────────────────────────────────────────────────────────
function geRenderEditor() {
  const { worldIdx: wi, catIdx: ci, cardIdx: ki } = _geSelected;
  const body = document.getElementById('geMainBody');
  const bc   = document.getElementById('geMainBreadcrumb');

  if (wi == null) {
    body.innerHTML = '<div class="ge-empty"><div class="ge-empty-icon">🗂️</div>Select an item to edit.</div>';
    bc.textContent = 'No selection';
    return;
  }

  const world = _geCfg.worlds[wi];
  if (ki != null) {
    const card = world.categories[ci].cards[ki];
    bc.innerHTML = geRenderIcon(world.icon,'🌍',14) + ' ' + world.label + ' › ' + geRenderIcon(world.categories[ci].icon,'📂',14) + ' ' + world.categories[ci].label + ' › ' + geRenderIcon(card.icon,'🃏',14) + ' ' + card.label;
    body.innerHTML = geCardEditorHTML(wi, ci, ki);
    // Pre-fill extractor info panel after DOM injection
    geShowExtractorInfo(card.extractor);
  } else if (ci != null) {
    const cat = world.categories[ci];
    bc.innerHTML = geRenderIcon(world.icon,'🌍',14) + ' ' + world.label + ' › ' + geRenderIcon(cat.icon,'📂',14) + ' ' + cat.label;
    body.innerHTML = geCatEditorHTML(wi, ci);
  } else {
    bc.innerHTML = geRenderIcon(world.icon,'🌍',14) + ' ' + world.label;
    body.innerHTML = geWorldEditorHTML(wi);
  }
}

// ── World Editor ───────────────────────────────────────────────────────────
function geWorldEditorHTML(wi) {
  const w = _geCfg.worlds[wi];
  return \`
<div class="ge-form-section">
  <h3>🌍 World Settings</h3>
  <div class="ge-row">
    <div class="ge-field"><label>ID</label><input id="gf_wid" value="\${w.id}" readonly style="opacity:.6;cursor:not-allowed"></div>
    \${geIconPickerHTML('gf_wicon', w.icon, 'Icon')}
  </div>
  <div class="ge-row">
    <div class="ge-field"><label>Label</label><input id="gf_wlabel" value="\${w.label || ''}" oninput="geMark()"></div>
    <div class="ge-field"><label>Weight (1.0 = normal)</label><input id="gf_wweight" type="number" step="0.1" value="\${w.weight ?? 1.0}" oninput="geMark()"></div>
  </div>
</div>
<div style="display:flex;gap:8px">
  <button class="ge-btn primary" onclick="geSaveWorld(\${wi})">💾 Apply</button>
  <button class="ge-btn danger" onclick="geDeleteWorld(\${wi})">🗑 Delete World</button>
</div>
<div class="ge-form-section" style="margin-top:18px">
  <h3>📂 Categories <span style="color:#404060;font-weight:400;font-size:11px">(click a category in the tree to edit)</span></h3>
  \${(w.categories || []).map((c, ci) => \`
  <div style="display:flex;align-items:center;gap:8px;padding:6px;background:#161622;border-radius:5px;margin-bottom:4px">
    <span>\${geRenderIcon(c.icon, '📂', 14)}</span>
    <span style="flex:1;font-size:12px;color:#c0c0d0">\${c.label}</span>
    <span style="font-size:10px;color:#5060a0">\${(c.cards||[]).length} cards</span>
    <button class="ge-btn secondary" style="padding:3px 8px;font-size:10px" onclick="geSelectCat(\${wi},\${ci})">Edit</button>
  </div>\`).join('')}
  <button class="ge-tier-add" style="margin-top:6px" onclick="geAddCategory(\${wi})">+ Add Category</button>
</div>\`;
}

function geSaveWorld(wi) {
  const w = _geCfg.worlds[wi];
  w.icon   = document.getElementById('gf_wicon').value.trim() || w.icon;
  w.label  = document.getElementById('gf_wlabel').value.trim() || w.label;
  w.weight = parseFloat(document.getElementById('gf_wweight').value) || 1.0;
  geRenderTree();
  geMark();
  geShowNotif('World updated', 'ok');
}

// ── Category Editor ────────────────────────────────────────────────────────
function geCatEditorHTML(wi, ci) {
  const cat = _geCfg.worlds[wi].categories[ci];
  return \`
<div class="ge-form-section">
  <h3>📂 Category Settings</h3>
  <div class="ge-row">
    <div class="ge-field"><label>ID</label><input value="\${cat.id}" readonly style="opacity:.6;cursor:not-allowed"></div>
    \${geIconPickerHTML('gf_cicon', cat.icon, 'Icon')}
  </div>
  <div class="ge-row">
    <div class="ge-field"><label>Label</label><input id="gf_clabel" value="\${cat.label || ''}" oninput="geMark()"></div>
    <div class="ge-field"><label>Weight</label><input id="gf_cweight" type="number" step="0.1" value="\${cat.weight ?? 1.0}" oninput="geMark()"></div>
  </div>
</div>
<div style="display:flex;gap:8px">
  <button class="ge-btn primary" onclick="geSaveCat(\${wi},\${ci})">💾 Apply</button>
  <button class="ge-btn danger" onclick="geDeleteCat(\${wi},\${ci})">🗑 Delete Category</button>
</div>
<div class="ge-form-section" style="margin-top:18px">
  <h3>🃏 Cards</h3>
  \${(cat.cards || []).map((card, ki) => \`
  <div style="display:flex;align-items:center;gap:8px;padding:6px;background:#161622;border-radius:5px;margin-bottom:4px">
    <span>\${geRenderIcon(card.icon, '🃏', 14)}</span>
    <span style="flex:1;font-size:12px;color:#c0c0d0">\${card.label}</span>
    <span style="font-size:10px;color:#5060a0">\${card.extractor}</span>
    <span style="font-size:10px;color:#404060">\${(card.tiers||[]).length} tiers</span>
    <button class="ge-btn secondary" style="padding:3px 8px;font-size:10px" onclick="geSelectCard(\${wi},\${ci},\${ki})">Edit</button>
  </div>\`).join('')}
  <button class="ge-tier-add" style="margin-top:6px" onclick="geAddCard(\${wi},\${ci})">+ Add Card</button>
</div>\`;
}

function geSaveCat(wi, ci) {
  const cat = _geCfg.worlds[wi].categories[ci];
  cat.icon   = document.getElementById('gf_cicon').value.trim() || cat.icon;
  cat.label  = document.getElementById('gf_clabel').value.trim() || cat.label;
  cat.weight = parseFloat(document.getElementById('gf_cweight').value) || 1.0;
  geRenderTree();
  geMark();
  geShowNotif('Category updated', 'ok');
}

// ── Card Editor ────────────────────────────────────────────────────────────
function geCardEditorHTML(wi, ci, ki) {
  const card = _geCfg.worlds[wi].categories[ci].cards[ki];
  const extractorOpts = _geExtractors.map(e =>
    \`<option value="\${e}" \${card.extractor === e ? 'selected' : ''}>\${e}</option>\`
  ).join('');

  const tiersHTML = (card.tiers || []).map((t, ti) => {
    const type = t.type || 'gte';
    const typeOpts = ['gte','unlocked','count_of_n','pct','has_item','max_any','avg','per_char','compound_and','rate']
      .map(tp => \`<option value="\${tp}" \${type===tp?'selected':''}>\${tp}</option>\`).join('');
    let extra = '';
    if (type === 'count_of_n') extra = \`<div class="ge-tier-extra"><label>Total (denominator):</label><input type="number" value="\${t.total || ''}" placeholder="e.g. 60" onchange="geTierChange(\${wi},\${ci},\${ki},\${ti},'total',this.value)" style="background:#111;border:1px solid #2a2a3c;border-radius:4px;padding:3px 5px;color:#d0d0e0;font-size:11px"></div>\`;
    else if (type === 'rate') extra = \`<div class="ge-tier-extra"><label>Per:</label><select onchange="geTierChange(\${wi},\${ci},\${ki},\${ti},'per',this.value)" style="background:#111;border:1px solid #2a2a3c;border-radius:4px;padding:3px 5px;color:#d0d0e0;font-size:11px"><option value="hour" \${t.per==='hour'?'selected':''}>/ hour</option><option value="day" \${t.per==='day'?'selected':''}>/ day</option><option value="week" \${t.per==='week'?'selected':''}>/ week</option></select></div>\`;
    else if (type === 'has_item' || type === 'per_char') extra = \`<div class="ge-tier-extra"><label>Param:</label><input value="\${t.param || ''}" placeholder="item name or index" onchange="geTierChange(\${wi},\${ci},\${ki},\${ti},'param',this.value)" style="background:#111;border:1px solid #2a2a3c;border-radius:4px;padding:3px 5px;color:#d0d0e0;font-size:11px;min-width:160px"></div>\`;
    else if (type === 'compound_and') extra = \`<div class="ge-tier-extra" style="flex-direction:column;align-items:flex-start"><label>Conditions (JSON [{extractor,threshold},…]):</label><textarea rows="3" onchange="geTierChange(\${wi},\${ci},\${ki},\${ti},'conditions',this.value)" style="background:#111;border:1px solid #2a2a3c;border-radius:4px;padding:4px 6px;color:#d0d0e0;font-size:11px;width:100%;box-sizing:border-box;font-family:monospace">\${t.conditions ? JSON.stringify(t.conditions,null,2) : '[]'}</textarea></div>\`;
    // Tier icon picker
    const tierIconId = 'ge_tier_icon_' + ti;
    const tierIconPreview = geIsImageIcon(t.icon) ? '<img src="' + t.icon + '" style="width:100%;height:100%;object-fit:contain">' : (t.icon || '');
    const tierIconRow = '<div class="ge-tier-extra"><div class="ge-icon-picker" style="gap:4px">'
      + '<div class="ge-icon-preview" id="' + tierIconId + '_preview" style="width:24px;height:24px">' + tierIconPreview + '</div>'
      + '<input id="' + tierIconId + '" value="' + (t.icon || '') + '" placeholder="Tier icon (emoji/image)" style="background:#111;border:1px solid #2a2a3c;border-radius:4px;padding:3px 5px;color:#d0d0e0;font-size:11px;width:120px" oninput="geIconInputChanged(\\'' + tierIconId + '\\');geTierChange(' + wi + ',' + ci + ',' + ki + ',' + ti + ',\\'icon\\',this.value)">'
      + '<label class="ge-icon-upload-btn" style="padding:2px 6px;font-size:9px" title="Upload tier icon">\ud83d\udcc2<input type="file" accept="image/*" style="display:none" onchange="geUploadTierIcon(\\'' + tierIconId + '\\',' + wi + ',' + ci + ',' + ki + ',' + ti + ',this)"></label>'
      + '</div></div>';
    const allExtras = tierIconRow + extra;
    return \`
  <div class="ge-tier" id="ge_tier_\${ti}">
    <div class="ge-tier-main">
      <span class="ge-tier-num">T\${ti + 1}</span>
      <select style="background:#111;border:1px solid #2a2a3c;border-radius:4px;padding:4px 6px;color:#d0d0e0;font-size:11px" onchange="geTierChange(\${wi},\${ci},\${ki},\${ti},'type',this.value);geRenderEditor()">\${typeOpts}</select>
      <input type="number" value="\${t.threshold}" placeholder="Threshold" style="background:#111;border:1px solid #2a2a3c;border-radius:4px;padding:4px 6px;color:#d0d0e0;font-size:11px;width:100%" onchange="geTierChange(\${wi},\${ci},\${ki},\${ti},'threshold',this.value)">
      <input value="\${t.label || ''}" placeholder="Label (e.g. Tier 1)" style="background:#111;border:1px solid #2a2a3c;border-radius:4px;padding:4px 6px;color:#d0d0e0;font-size:11px;width:100%" onchange="geTierChange(\${wi},\${ci},\${ki},\${ti},'label',this.value)">
      <input value="\${t.note || ''}" placeholder="Note (optional)" style="background:#111;border:1px solid #2a2a3c;border-radius:4px;padding:4px 6px;color:#d0d0e0;font-size:11px;width:100%" onchange="geTierChange(\${wi},\${ci},\${ki},\${ti},'note',this.value)">
      <button class="ge-tier-del" onclick="geDeleteTier(\${wi},\${ci},\${ki},\${ti})">✕</button>
    </div><div class="ge-tier-extras" style="display:flex;align-items:center;gap:8px;padding:4px 0 2px 28px;flex-wrap:wrap">\${allExtras}</div>
  </div>\`;
  }).join('');

  return \`
<div class="ge-form-section">
  <h3>🃏 Card Settings</h3>
  <div class="ge-row">
    <div class="ge-field"><label>ID</label><input value="\${card.id}" readonly style="opacity:.6;cursor:not-allowed"></div>
    \${geIconPickerHTML('gf_kicon', card.icon, 'Icon')}
  </div>
  <div class="ge-row">
    <div class="ge-field"><label>Label</label><input id="gf_klabel" value="\${card.label || ''}" oninput="geMark()"></div>
    <div class="ge-field"><label>Unit (suffix)</label><input id="gf_kunit" value="\${card.unit || ''}" placeholder='e.g. Lv or %' oninput="geMark()"></div>
  </div>
  <div class="ge-row">
    <div class="ge-field">
      <label>Extractor</label>
      <select id="gf_kextractor" onchange="geMark();geShowExtractorInfo(this.value)">
        \${extractorOpts}
        <option value="__custom__">Custom (type below)…</option>
      </select>
    </div>
    <div class="ge-field"><label>Weight</label><input id="gf_kweight" type="number" step="0.1" value="\${card.weight ?? 1.0}" oninput="geMark()"></div>
  </div>
  <div id="ge_extractor_info" style="display:none;background:#0e0e1c;border:1px solid #2a2a3c;border-radius:5px;padding:8px 10px;margin-top:4px"></div>
</div>

<div class="ge-form-section">
  <h3>🎨 Display Options</h3>
  <div class="ge-row">
    <div class="ge-field">
      <label>Progress Bar</label>
      <select id="gf_kshowBar" onchange="geMark()">
        <option value="true"  \${(card.showProgressBar ?? true)  ? 'selected' : ''}>✓ Show progress bar</option>
        <option value="false" \${(card.showProgressBar ?? true)  ? '' : 'selected'}>✗ Badge / tier only</option>
      </select>
    </div>
    <div class="ge-field">
      <label>Progress Style</label>
      <select id="gf_kprogStyle" onchange="geMark()">
        <option value="bar"   \${(card.progressStyle||'bar')==='bar'   ? 'selected':''}>━━ Bar</option>
        <option value="stars" \${(card.progressStyle||'bar')==='stars' ? 'selected':''}>★★★ Stars</option>
        <option value="rings" \${(card.progressStyle||'bar')==='rings' ? 'selected':''}>◎ Rings</option>
        <option value="badge" \${(card.progressStyle||'bar')==='badge' ? 'selected':''}>◉ Badge only</option>
      </select>
    </div>
  </div>
  <div class="ge-row">
    <div class="ge-field">
      <label>Value Format</label>
      <select id="gf_kformat" onchange="geMark()">
        <option value="number" \${(card.displayFormat||'number')==='number' ? 'selected':''}>1234 — raw number</option>
        <option value="abbrev" \${(card.displayFormat||'number')==='abbrev' ? 'selected':''}>1.2k — abbreviated</option>
        <option value="pct"    \${(card.displayFormat||'number')==='pct'    ? 'selected':''}>85% — % of maxHint</option>
      </select>
    </div>
    <div class="ge-field">
      <label>Priority Pin</label>
      <select id="gf_kpinned" onchange="geMark()">
        <option value="false" \${card.pinned ? '' : 'selected'}>— Normal</option>
        <option value="true"  \${card.pinned ? 'selected' : ''}>⭐ Pinned (shows first)</option>
      </select>
    </div>
  </div>
  <div class="ge-row">
    <div class="ge-field">
      <label>Hide When Maxed</label>
      <select id="gf_khideMaxed" onchange="geMark()">
        <option value="false" \${card.hideIfMaxed ? '' : 'selected'}>Keep visible at max tier</option>
        <option value="true"  \${card.hideIfMaxed ? 'selected' : ''}>Hide when max tier reached</option>
      </select>
    </div>
    <div class="ge-field">
      <label>Community Benchmark</label>
      <select id="gf_kbenchmark" onchange="geMark()">
        <option value="true"  \${(card.showBenchmark ?? true) ? 'selected':''}>✓ Show avg comparison</option>
        <option value="false" \${(card.showBenchmark ?? true) ? '' : 'selected'}>✗ Hide benchmark badge</option>
      </select>
    </div>
  </div>
</div>

<div class="ge-form-section">
  <h3>🏆 Tiers <span style="color:#404060;font-weight:400;font-size:11px">(ascending thresholds — highest met = current tier)</span></h3>
  <div style="display:grid;grid-template-columns:auto 110px 90px 1fr 1fr auto;gap:6px;padding:0 0 4px;font-size:10px;color:#5060a0;font-weight:700">
    <span></span><span>Type</span><span>Threshold</span><span>Label</span><span>Note</span><span></span>
  </div>
  <div class="ge-tiers" id="ge_tiers_wrap">\${tiersHTML}</div>
  <button class="ge-tier-add" onclick="geAddTier(\${wi},\${ci},\${ki})">+ Add Tier</button>
</div>

<div style="display:flex;gap:8px">
  <button class="ge-btn primary" onclick="geSaveCard(\${wi},\${ci},\${ki})">💾 Apply</button>
  <button class="ge-btn danger" onclick="geDeleteCard(\${wi},\${ci},\${ki})">🗑 Delete Card</button>
</div>\`;
}

function geSaveCard(wi, ci, ki) {
  const card = _geCfg.worlds[wi].categories[ci].cards[ki];
  card.icon            = document.getElementById('gf_kicon').value.trim() || card.icon;
  card.label           = document.getElementById('gf_klabel').value.trim() || card.label;
  card.unit            = document.getElementById('gf_kunit').value.trim();
  card.weight          = parseFloat(document.getElementById('gf_kweight').value) || 1.0;
  const sel = document.getElementById('gf_kextractor').value;
  if (sel !== '__custom__') card.extractor = sel;
  // Display options
  card.showProgressBar = document.getElementById('gf_kshowBar').value === 'true';
  card.progressStyle   = document.getElementById('gf_kprogStyle').value;
  card.displayFormat   = document.getElementById('gf_kformat').value;
  card.pinned          = document.getElementById('gf_kpinned').value === 'true';
  card.hideIfMaxed     = document.getElementById('gf_khideMaxed').value === 'true';
  card.showBenchmark   = document.getElementById('gf_kbenchmark').value === 'true';
  geRenderTree();
  geMark();
  geShowNotif('Card updated', 'ok');
}

function geTierChange(wi, ci, ki, ti, field, value) {
  const card = _geCfg.worlds[wi].categories[ci].cards[ki];
  if (field === 'threshold' || field === 'total' || field === 'minChars') card.tiers[ti][field] = parseFloat(value) || 0;
  else if (field === 'conditions') { try { card.tiers[ti].conditions = JSON.parse(value); } catch { /* keep old value */ } }
  else card.tiers[ti][field] = value;
  _geDirty = true;
}

function geAddTier(wi, ci, ki) {
  const card = _geCfg.worlds[wi].categories[ci].cards[ki];
  const last = card.tiers[card.tiers.length - 1];
  card.tiers.push({ label: 'Tier ' + (card.tiers.length + 1), threshold: last ? last.threshold * 2 : 100, type: last?.type || 'gte' });
  geMark();
  geRenderEditor();
}

function geDeleteTier(wi, ci, ki, ti) {
  const card = _geCfg.worlds[wi].categories[ci].cards[ki];
  card.tiers.splice(ti, 1);
  geMark();
  geRenderEditor();
}

// ── Add Helpers ────────────────────────────────────────────────────────────
function geAddWorld() {
  const id = 'world_' + Date.now();
  _geCfg.worlds.push({ id, label: 'New World', icon: '🌍', weight: 1.0, categories: [] });
  _geSelected = { worldIdx: _geCfg.worlds.length - 1, catIdx: null, cardIdx: null };
  geMark();
  geRenderTree();
  geRenderEditor();
}

function geAddCategory(wi) {
  const id = 'cat_' + Date.now();
  _geCfg.worlds[wi].categories.push({ id, label: 'New Category', icon: '📂', weight: 1.0, cards: [] });
  const ci = _geCfg.worlds[wi].categories.length - 1;
  _geSelected = { worldIdx: wi, catIdx: ci, cardIdx: null };
  geMark();
  geRenderTree();
  geRenderEditor();
}

function geAddCard(wi, ci) {
  const id = 'card_' + Date.now();
  _geCfg.worlds[wi].categories[ci].cards.push({
    id, label: 'New Card', icon: '🃏', weight: 1.0,
    extractor: _geExtractors[0] || 'stamps.totalLeveled',
    unit: '',
    showProgressBar: true,
    progressStyle: 'bar',
    displayFormat: 'number',
    pinned: false,
    hideIfMaxed: false,
    showBenchmark: true,
    tiers: [
      { label: 'Tier 1', threshold: 10 },
      { label: 'Tier 2', threshold: 50 },
      { label: 'Tier 3', threshold: 100 },
    ]
  });
  const ki = _geCfg.worlds[wi].categories[ci].cards.length - 1;
  _geSelected = { worldIdx: wi, catIdx: ci, cardIdx: ki };
  geMark();
  geRenderTree();
  geRenderEditor();
}

// ── Delete Helpers ─────────────────────────────────────────────────────────
function geDeleteWorld(wi) {
  if (!confirm('Delete this world and all its categories/cards?')) return;
  _geCfg.worlds.splice(wi, 1);
  _geSelected = { worldIdx: null, catIdx: null, cardIdx: null };
  geRenderTree();
  geRenderEditor();
  geSaveConfig();
}

function geDeleteCat(wi, ci) {
  if (!confirm('Delete this category and all its cards?')) return;
  _geCfg.worlds[wi].categories.splice(ci, 1);
  _geSelected = { worldIdx: wi, catIdx: null, cardIdx: null };
  geRenderTree();
  geRenderEditor();
  geSaveConfig();
}

function geDeleteCard(wi, ci, ki) {
  if (!confirm('Delete this card?')) return;
  _geCfg.worlds[wi].categories[ci].cards.splice(ki, 1);
  _geSelected = { worldIdx: wi, catIdx: ci, cardIdx: null };
  geRenderTree();
  geRenderEditor();
  geSaveConfig();
}

// ── Persistence ────────────────────────────────────────────────────────────
async function geSaveConfig() {
  const btn = document.getElementById('geSaveBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Saving…';
  try {
    const res = await fetch('/api/guidance/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(_geCfg),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server error');
    _geDirty = false;
    btn.textContent = '✅ Saved';
    geShowNotif('Config saved successfully', 'ok');
    // Auto-refresh owner's cached review with the new config
    try {
      const rr = await fetch('/api/guidance/refresh-my-review', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      const rd = await rr.json();
      if (rd.refreshed && rd.refreshed.length > 0) geShowNotif('Your review will reflect changes on next load', 'ok');
    } catch(e) { /* non-critical */ }
    setTimeout(() => { btn.textContent = '💾 Save Config'; btn.disabled = false; }, 2000);
  } catch(e) {
    btn.textContent = '💾 Save Config';
    btn.disabled = false;
    geShowNotif('Save failed: ' + e.message, 'err');
  }
}

// ── Preview ────────────────────────────────────────────────────────────────
function geTogglePreview() {
  _gePreviewVisible = !_gePreviewVisible;
  document.getElementById('gePreviewBtn').textContent = _gePreviewVisible ? '✕ Hide Preview' : '👁 Preview';
  if (_gePreviewVisible) geLoadPreview();
}

async function geLoadPreview() {
  const body = document.getElementById('geMainBody');
  body.innerHTML = '<div class="ge-empty"><div class="ge-empty-icon">⏳</div>Running evaluation…</div>';
  // We need a save to evaluate — try fetching the current linked account if any
  // Otherwise show a message
  try {
    const meRes = await fetch('/api/me');
    if (!meRes.ok) throw new Error('Not authenticated');
    const me = await meRes.json();
    const uid = me.uid || me.id;
    if (!uid) throw new Error('No UID');
    const evalRes = await fetch('/api/guidance/evaluate/' + uid);
    if (!evalRes.ok) {
      const err = await evalRes.json();
      throw new Error(err.error || 'Evaluation failed');
    }
    _gePreviewData = await evalRes.json();
    geRenderPreview();
  } catch(e) {
    body.innerHTML = \`<div class="ge-empty">
      <div class="ge-empty-icon">⚠️</div>
      <p>Preview requires a linked IdleOn account.<br><small style="color:#5060a0">\${e.message}</small></p>
      <p style="margin-top:12px;font-size:12px;color:#6060a0">Link your save on the IdleOn Dashboard, then return here.</p>
    </div>\`;
  }
}

function geFormatCardValue(card) {
  const v = card.value;
  const dt = card.displayType || 'gte';
  const unit = card.unit ? ' ' + card.unit : '';
  if (dt === 'unlocked' || dt === 'has_item') return v ? '✓' : '✗';
  if (dt === 'pct') return v + '%';
  if (dt === 'count_of_n') return card.total != null ? \`\${v} / \${card.total}\` : \`\${v}\${unit}\`;
  if (dt === 'avg') return 'avg ' + v + unit;
  if (dt === 'max_any') return 'Best: ' + v + unit;
  if (dt === 'rate') return \`\${v}\${unit} / \${card.per || 'hr'}\`;
  if (dt === 'compound_and') return v ? '✓ Met' : '✗ Not met';
  return v + unit;
}

function geRenderPreview() {
  const body = document.getElementById('geMainBody');
  if (!_gePreviewData) return;
  const { globalPct, worlds } = _gePreviewData;
  body.innerHTML = \`
<div style="margin-bottom:16px">
  <div style="font-size:13px;color:#a0a0c0;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between">
    <span>🌐 Global Rating</span>
    <span style="color:#c4a8ff;font-weight:700">\${Math.round(globalPct * 100)}%</span>
  </div>
  <div class="ge-rating"><div class="ge-rating-bar"><div class="ge-rating-fill" style="width:\${globalPct*100}%"></div></div><span class="ge-pct">\${Math.round(globalPct*100)}%</span></div>
</div>
<div class="ge-preview">\${worlds.map(w => \`
  <div class="ge-preview-world">
    <div class="ge-preview-world-hdr" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'':'none'">
      <span style="font-size:16px">\${geRenderIcon(w.icon,'\ud83c\udf0d',16)}</span>
      <span style="flex:1">\${w.label}</span>
      <span style="font-size:10px;color:#7060a0">\${Math.round(w.pct*100)}%</span>
    </div>
    <div>\${w.categories.map(cat => \`
      <div class="ge-preview-cat">
        <div class="ge-preview-cat-hdr">
          <span>\${geRenderIcon(cat.icon,'\ud83d\udcc2',14)}</span>
          <span style="flex:1">\${cat.label}</span>
          <span style="font-size:10px;color:#406040">\${Math.round(cat.pct*100)}%</span>
        </div>
        <div style="padding:2px 8px">\${cat.cards.map(card => {
          const cls = card.atMax ? 'tmax' : 'ge-card-chip t' + Math.min(card.tierIndex + 1, 4);
          return \`<span class="ge-card-chip \${cls}">\${geRenderIcon(card.icon,'',14)} \${card.label}: \${geFormatCardValue(card)} [\${card.tierLabel}]\${card.nextThreshold != null ? ' → '+card.nextThreshold : ''}</span>\`;
        }).join('')}</div>
      </div>\`).join('')}
    </div>
  </div>\`).join('')}
</div>
<button class="ge-btn secondary" style="margin-top:12px" onclick="geTogglePreview()">← Back to Editor</button>\`;
}

// ── Dirty tracking ─────────────────────────────────────────────────────────
function geMark() {
  _geDirty = true;
  document.getElementById('geSaveBtn').textContent = '💾 Save Config *';
}

window.addEventListener('beforeunload', e => {
  if (_geDirty) { e.preventDefault(); e.returnValue = ''; }
});

// ── Notifications ──────────────────────────────────────────────────────────
let _geNotifTimer;
function geShowNotif(msg, type = 'ok') {
  const el = document.getElementById('geNotif');
  el.textContent = (type === 'ok' ? '✓ ' : '✗ ') + msg;
  el.className = 'ge-notif show ' + type;
  clearTimeout(_geNotifTimer);
  _geNotifTimer = setTimeout(() => el.classList.remove('show'), 3500);
}
</script>
`;
}
