/**
 * Idleon Bot Review Tab — Dashboard Frontend v3
 * AutoReview-inspired panel layout with dark theme.
 */
export function renderIdleonBotReviewTab(userTier) {
  return `
<style>
/* === Panel System (AutoReview-inspired) === */
.ibr-panel{background:#1a1a22;border:1px solid #2a2a3a;border-radius:6px;margin-bottom:10px;overflow:hidden}
.ibr-panel-title{display:flex;align-items:center;justify-content:space-between;padding:8px 14px;background:#1f1f2e;border-bottom:1px solid #2a2a3a;font-size:13px;font-weight:700;color:#d4c8f0}
.ibr-panel-title .panel-icon{font-size:22px;margin-right:8px}
.ibr-panel-title .panel-right{display:flex;align-items:center;gap:8px}
.ibr-panel-body{padding:0}

/* Sub-header strips (like autoreview's section headers) */
.ibr-strip{display:flex;align-items:center;justify-content:space-between;padding:5px 14px;background:#16161e;border-bottom:1px solid #22223a;font-size:11px;font-weight:600;color:#9d8ec4}
.ibr-strip.accent{background:#1a1528;border-left:3px solid #7c3aed}
.ibr-strip.green{background:#141e18;border-left:3px solid #4caf50;color:#81c784}
.ibr-strip.orange{background:#1e1a14;border-left:3px solid #ff9800;color:#ffb74d}
.ibr-strip.red{background:#1e1414;border-left:3px solid #f44336;color:#ef9a9a}

/* Info rows (icon + text + value) */
.ibr-info-row{display:flex;align-items:center;gap:8px;padding:6px 14px;font-size:12px;border-bottom:1px solid #1e1e2a;transition:background .15s}
.ibr-info-row:last-child{border-bottom:none}
.ibr-info-row:hover{background:#1e1e28}
.ibr-info-row .row-icon{font-size:15px;flex-shrink:0;width:20px;text-align:center}
.ibr-info-row .row-text{flex:1;color:#ccc;line-height:1.3}
.ibr-info-row .row-sub{font-size:10px;color:#8b8fa3}
.ibr-info-row .row-val{font-weight:700;color:#b794f6;white-space:nowrap;font-size:13px}
.ibr-info-row .row-val.green{color:#4caf50}.ibr-info-row .row-val.red{color:#f44336}
.ibr-info-row .row-val.orange{color:#ff9800}
.ibr-info-row .row-check{color:#4caf50;font-size:16px;margin-left:4px}

/* Progress arrow */
.ibr-progress{display:inline-flex;align-items:center;gap:4px;font-size:12px}
.ibr-progress .cur{color:#aaa}.ibr-progress .arr{color:#b794f6;font-weight:700}
.ibr-progress .tgt{color:#b794f6;font-weight:700}

/* === Upload Section === */
.ibr-card{background:#1a1a22;border:1px solid #2a2a3a;border-radius:6px;padding:14px;margin-bottom:10px}
.ibr-card h2{margin:0 0 4px;font-size:15px;color:#b794f6}.ibr-card h3{margin:0 0 6px;font-size:13px;color:#b794f6}
.ibr-sub{color:#8b8fa3;font-size:11px;margin:0 0 10px}
.ibr-drop{border:2px dashed #3a3a42;border-radius:8px;padding:30px 16px;text-align:center;cursor:pointer;transition:all .2s;background:#111116;position:relative}
.ibr-drop:hover,.ibr-drop.drag-over{border-color:#b794f6;background:#1a1a2e}
.ibr-drop input[type=file]{position:absolute;inset:0;opacity:0;cursor:pointer}
.ibr-drop .icon{font-size:28px;margin-bottom:6px}
.ibr-drop .label{font-size:13px;color:#ccc;font-weight:600}.ibr-drop .hint{font-size:10px;color:#8b8fa3;margin-top:4px}
.ibr-btn{background:#7c3aed;color:#fff;border:none;border-radius:6px;padding:7px 16px;font-size:12px;cursor:pointer;font-weight:600;transition:all .2s}
.ibr-btn:hover{background:#6d28d9}.ibr-btn:disabled{opacity:.5;cursor:not-allowed}
.ibr-btn-outline{background:none;border:1px solid #3a3a42;color:#ccc;border-radius:4px;padding:5px 12px;font-size:11px;cursor:pointer;transition:all .2s}
.ibr-btn-outline:hover{border-color:#b794f6;color:#b794f6}

/* === KPI Grid === */
.ibr-kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:0;border-top:1px solid #2a2a3a}
.ibr-kpi{padding:10px 14px;text-align:center;border-right:1px solid #2a2a3a;background:#16161e}
.ibr-kpi:last-child{border-right:none}
.ibr-kpi .val{font-size:20px;font-weight:800}.ibr-kpi .lbl{font-size:9px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.5px;margin-top:2px}

/* === Tier Badge === */
.ibr-tier-badge{display:inline-flex;align-items:center;gap:5px;padding:4px 12px;border-radius:4px;font-weight:700;font-size:13px}

/* === Settings Bar === */
.ibr-settings{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:8px 14px;background:#1a1a22;border:1px solid #2a2a3a;border-radius:6px;margin-bottom:10px}
.ibr-toggle{display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;color:#ccc;user-select:none}
.ibr-toggle input{display:none}
.ibr-toggle .slider{width:32px;height:18px;background:#3a3a42;border-radius:9px;position:relative;transition:background .2s}
.ibr-toggle .slider::after{content:'';position:absolute;top:2px;left:2px;width:14px;height:14px;background:#888;border-radius:50%;transition:all .2s}
.ibr-toggle input:checked+.slider{background:#7c3aed}
.ibr-toggle input:checked+.slider::after{left:16px;background:#fff}

/* === System Cards (AutoReview panel style) === */
.ibr-world-section{margin-bottom:10px}
.ibr-world-hdr{display:flex;align-items:center;gap:8px;padding:8px 14px;background:#1f1f2e;border:1px solid #2a2a3a;border-radius:6px;cursor:pointer;user-select:none;margin-bottom:6px;transition:all .2s;border-left:3px solid #7c3aed}
.ibr-world-hdr:hover{background:#24243a;border-color:#3a3a52}
.ibr-world-hdr .wname{font-size:14px;font-weight:700;color:#d4c8f0;flex:1}
.ibr-world-hdr .wstats{font-size:10px;color:#8b8fa3;background:#16161e;padding:2px 8px;border-radius:4px}
.ibr-world-hdr .warrow{font-size:12px;color:#8b8fa3;transition:transform .2s}
.ibr-world-hdr.collapsed .warrow{transform:rotate(-90deg)}
.ibr-world-body{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:8px}
.ibr-world-body.hidden{display:none}

.ibr-sys{background:#1a1a22;border:1px solid #2a2a3a;border-radius:6px;overflow:hidden;transition:border-color .2s}
.ibr-sys:hover{border-color:#3a3a52}
.ibr-sys.behind{border-left:3px solid #f44336}
.ibr-sys.maxed-sys{border-left:3px solid #4caf50}

.ibr-sys-title{display:flex;align-items:center;justify-content:space-between;padding:7px 10px;background:#1f1f2e;border-bottom:1px solid #2a2a3a}
.ibr-sys-title .name{font-size:12px;font-weight:600;color:#d4c8f0;display:flex;align-items:center;gap:4px}
.ibr-sys-title .stars{font-size:12px;letter-spacing:1px}

.ibr-sys-body{padding:0}
.ibr-sys-score{display:flex;align-items:center;gap:8px;padding:5px 10px;background:#16161e;border-bottom:1px solid #22223a;font-size:10px}
.ibr-sys-score .tier-tag{font-size:9px;padding:1px 6px;border-radius:3px;font-weight:600}
.ibr-sys-score .score-bar{flex:1;height:4px;background:#22223a;border-radius:2px;overflow:hidden}
.ibr-sys-score .score-bar-fill{height:100%;border-radius:2px;transition:width .5s}

.ibr-sys-detail{padding:6px 10px;font-size:10px;color:#8b8fa3;line-height:1.4;border-bottom:1px solid #1e1e2a}
.ibr-sys-meta{padding:4px 10px;font-size:9px;color:#8b8fa3;display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.ibr-sys-bench{font-size:9px}
.ibr-sys-behind{color:#f44336;font-size:9px;font-weight:600}

.ibr-sys-tips{padding:0;margin:0;list-style:none;border-top:1px solid #1e1e2a}
.ibr-sys-tips li{padding:4px 10px;font-size:10px;color:#c9a0ff;border-bottom:1px solid #1a1a24;display:flex;align-items:flex-start;gap:4px;line-height:1.3}
.ibr-sys-tips li:last-child{border-bottom:none}
.ibr-sys-tips li::before{content:'\\25B8';color:#7c3aed;flex-shrink:0;margin-top:1px}

.ibr-sys-breakdown{padding:5px 10px;background:#12121a;border-top:1px solid #1e1e2a;font-size:10px;color:#8b8fa3;display:flex;flex-wrap:wrap;gap:6px}
.ibr-sys-breakdown b{color:#ccc}

/* === Priority Panel === */
.ibr-prio{display:flex;align-items:flex-start;gap:10px;padding:8px 14px;border-bottom:1px solid #1e1e2a}
.ibr-prio:last-child{border-bottom:none}
.ibr-prio:hover{background:#1e1e28}
.ibr-prio .rank{font-size:18px;font-weight:800;color:#7c3aed;min-width:28px;text-align:center;background:#16161e;padding:4px;border-radius:4px}
.ibr-prio .info{flex:1}.ibr-prio .info .name{font-size:12px;font-weight:600;margin-bottom:2px;color:#d4c8f0}
.ibr-prio .info .reason{font-size:10px;color:#8b8fa3;line-height:1.3}
.ibr-prio-tips{margin:4px 0 0;padding:0;list-style:none}
.ibr-prio-tips li{font-size:10px;color:#c9a0ff;padding:2px 0 2px 12px;position:relative;line-height:1.3}
.ibr-prio-tips li::before{content:'\\25B8';position:absolute;left:0;color:#7c3aed}

/* === Gear Recommendation Rows === */
.ibr-gear-row{display:flex;align-items:flex-start;gap:10px;padding:8px 14px;border-bottom:1px solid #1e1e2a}
.ibr-gear-row:last-child{border-bottom:none}
.ibr-gear-row:hover{background:#1e1e28}
.ibr-gear-row .gear-icon{font-size:20px;flex-shrink:0}
.ibr-gear-row .gear-info{flex:1}
.ibr-gear-row .gear-label{font-size:12px;font-weight:600;color:#ccc}
.ibr-gear-row .gear-current{font-size:9px;color:#8b8fa3;margin-left:6px}
.ibr-gear-row .gear-rec{font-size:11px;font-weight:600;margin-top:2px}
.ibr-gear-row .gear-missing{font-size:9px;color:#8b8fa3;margin-top:2px}
.ibr-gear-maxed{padding:6px 14px;font-size:10px;color:#4caf50;background:#141e18;border-top:1px solid #1e2a20}

/* === Character Cards === */
.ibr-char-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:8px;padding:10px}
.ibr-char{background:#16161e;border:1px solid #2a2a3a;border-radius:6px;overflow:hidden}
.ibr-char-hdr{display:flex;justify-content:space-between;align-items:flex-start;padding:8px 10px;background:#1f1f2e;border-bottom:1px solid #2a2a3a}
.ibr-char-hdr .name{font-size:12px;font-weight:600;color:#d4c8f0}.ibr-char-hdr .cls{font-size:10px;color:#8b8fa3}
.ibr-char-hdr .lv{font-size:18px;font-weight:800;color:#b794f6}
.ibr-char-body{padding:6px 10px}
.ibr-char .afk{font-size:9px;color:#8b8fa3;padding:0 10px 6px}
.ibr-equip-section{margin-bottom:6px}
.ibr-equip-section .sect-title{font-size:9px;color:#8b8fa3;margin-bottom:3px;text-transform:uppercase;letter-spacing:.3px;padding:3px 0;border-bottom:1px solid #22223a}
.ibr-equip-row{display:flex;gap:4px;flex-wrap:wrap;padding:4px 0}
.ibr-equip-item{position:relative;width:34px;height:34px;background:#22223a;border:1px solid #3a3a4a;border-radius:4px;overflow:hidden}
.ibr-equip-item img{width:100%;height:100%;object-fit:contain;image-rendering:pixelated}
.ibr-equip-item .slot-label{position:absolute;bottom:0;left:0;right:0;font-size:6px;text-align:center;background:rgba(0,0,0,.7);color:#8b8fa3;line-height:1;padding:1px 0}
.ibr-skills-bar{display:flex;gap:2px;flex-wrap:wrap;padding:4px 10px 8px}
.ibr-skill{font-size:8px;background:#22223a;padding:2px 4px;border-radius:2px;color:#aaa;border:1px solid #2a2a3a}

/* === Layout === */
.ibr-split{display:grid;grid-template-columns:1fr 320px;gap:10px;align-items:start}
@media(max-width:900px){.ibr-split{grid-template-columns:1fr}}

/* === Loading & Error === */
.ibr-loading{text-align:center;padding:30px;color:#8b8fa3}
.ibr-loading .spinner{width:28px;height:28px;border:3px solid #3a3a42;border-top-color:#b794f6;border-radius:50%;animation:ibr-spin .8s linear infinite;margin:0 auto 10px}
@keyframes ibr-spin{to{transform:rotate(360deg)}}
.ibr-error{background:#2a1a1a;border:1px solid #5a2a2a;color:#ef9a9a;border-radius:6px;padding:10px;font-size:12px}
</style>

<div class="ibr-card">
  <h2>🔍 Account Review</h2>
  <p class="ibr-sub">Upload your Idleon save JSON for a personalized analysis. Each review is private.</p>
</div>

<div id="ibrUploadSection">
  <div class="ibr-card">
    <h3>📤 Upload Your Save</h3>
    <p class="ibr-sub">Export your save from Idleon (Settings → Cloud → Copy to clipboard) or use your IdleonToolbox JSON export.</p>
    <div class="ibr-drop" id="ibrDropZone">
      <input type="file" accept=".json,.txt" id="ibrFileInput">
      <div class="icon">📁</div>
      <div class="label">Drop your JSON file here or click to browse</div>
      <div class="hint">Accepts .json or .txt files</div>
    </div>
    <div style="text-align:center;margin:8px 0;color:#8b8fa3;font-size:11px">— or paste JSON directly —</div>
    <textarea id="ibrPasteArea" placeholder="Paste your Idleon JSON here..." style="width:100%;min-height:60px;background:#111116;border:1px solid #2a2a3a;border-radius:6px;padding:8px;color:#ccc;font-size:11px;font-family:monospace;resize:vertical;box-sizing:border-box"></textarea>
    <div style="display:flex;gap:8px;margin-top:8px;align-items:center">
      <button class="ibr-btn" onclick="ibrSubmit()">🔍 Analyze Account</button>
      <span id="ibrStatus" style="font-size:11px;color:#8b8fa3"></span>
    </div>
    <div id="ibrError" style="margin-top:8px;display:none"></div>
  </div>
</div>

<div id="ibrResults" style="display:none">
  <!-- Populated by JS after analysis -->
</div>

<script>
(function(){
  var dropZone = document.getElementById('ibrDropZone');
  var fileInput = document.getElementById('ibrFileInput');
  var pasteArea = document.getElementById('ibrPasteArea');

  // Auto-load cached result on page load
  fetch('/api/idleon/review/cached').then(function(r){ return r.json(); }).then(function(d){
    if(d.success && d.cached && d.result){
      renderResults(d.result);
      var info = 'Showing cached result';
      if(d.analyzedAgo) info += ' (' + d.analyzedAgo + ')';
      if(!d.canReanalyze) info += ' — next analysis in ' + d.cooldownMins + ' min';
      document.getElementById('ibrCacheInfo').textContent = info;
      document.getElementById('ibrCacheInfo').style.display = '';
      if(!d.canReanalyze){
        var btn = document.getElementById('ibrReanalyzeBtn');
        if(btn){ btn.disabled = true; btn.title = 'Cooldown: ' + d.cooldownMins + ' min remaining'; }
      }
    }
  }).catch(function(){});

  dropZone.addEventListener('dragover', function(e){ e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', function(){ dropZone.classList.remove('drag-over'); });
  dropZone.addEventListener('drop', function(e){
    e.preventDefault(); dropZone.classList.remove('drag-over');
    var file = e.dataTransfer.files[0];
    if(file) readFile(file);
  });
  fileInput.addEventListener('change', function(){ if(fileInput.files[0]) readFile(fileInput.files[0]); });

  function readFile(file){
    var reader = new FileReader();
    reader.onload = function(e){
      pasteArea.value = e.target.result;
      document.getElementById('ibrStatus').textContent = 'File loaded: ' + file.name;
    };
    reader.readAsText(file);
  }

  window.ibrSubmit = function(){
    var raw = pasteArea.value.trim();
    if(!raw){ showError('Please paste or upload your JSON first.'); return; }
    var json;
    try{ json = JSON.parse(raw); } catch(e){ showError('Invalid JSON: ' + e.message); return; }
    if(!json.data || !json.charNames){ showError('This doesn\\'t look like an Idleon save. Make sure it has "data" and "charNames" fields.'); return; }
    document.getElementById('ibrStatus').textContent = 'Analyzing...';
    hideError();
    fetch('/api/idleon/review/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ save: json })
    })
    .then(function(r){ return r.json(); })
    .then(function(d){
      if(!d.success){ showError(d.error || 'Analysis failed'); return; }
      document.getElementById('ibrStatus').textContent = '';
      renderResults(d.result);
      var info = '';
      if(d.cached) info = 'Cached result (' + (d.analyzedAgo||'') + ')';
      if(d.cooldownMins) info += ' — next analysis in ' + d.cooldownMins + ' min';
      if(d.message) info = d.message;
      if(info){
        document.getElementById('ibrCacheInfo').textContent = info;
        document.getElementById('ibrCacheInfo').style.display = '';
      }
    })
    .catch(function(e){ showError('Request failed: ' + e.message); });
  };

  window.ibrReUpload = function(){
    document.getElementById('ibrResults').style.display = 'none';
    document.getElementById('ibrUploadSection').style.display = '';
    pasteArea.value = '';
    document.getElementById('ibrStatus').textContent = '';
  };

  function showError(msg){
    var el = document.getElementById('ibrError');
    el.innerHTML = '<div class="ibr-error">\\u274C ' + escH(msg) + '</div>';
    el.style.display = '';
    document.getElementById('ibrStatus').textContent = '';
  }
  function hideError(){ document.getElementById('ibrError').style.display = 'none'; }
  function escH(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  var tierColors = { early:'#4caf50', mid:'#2196f3', late:'#ff9800', endgame:'#e91e63', ultra:'#b794f6' };
  var worldLabels = { W1:'World 1', W2:'World 2', W3:'World 3', W4:'World 4', W5:'World 5', W6:'World 6', W7:'World 7', All:'Cross-World' };
  var worldIcons = { W1:'\\uD83C\\uDF3F', W2:'\\uD83C\\uDFDC\\uFE0F', W3:'\\u2744\\uFE0F', W4:'\\uD83D\\uDD2E', W5:'\\uD83C\\uDF0A', W6:'\\u2B50', W7:'\\uD83D\\uDD25', All:'\\uD83C\\uDF0D' };

  function stars(n){
    var s = '';
    for(var i=0;i<5;i++) s += i < n ? '\\u2B50' : '\\u2606';
    return s;
  }

  function renderResults(r){
    document.getElementById('ibrUploadSection').style.display = 'none';
    var el = document.getElementById('ibrResults');
    el.style.display = '';
    var tc = tierColors[r.tier] || '#ccc';

    var html = '';

    // === Header Panel ===
    html += '<div class="ibr-panel">';
    html += '<div class="ibr-panel-title">';
    html += '<div style="display:flex;align-items:center;gap:8px">';
    html += '<span class="panel-icon">\\uD83D\\uDD0D</span>';
    html += '<div>';
    html += '<div style="font-size:15px">Account Review</div>';
    html += '<div style="font-size:10px;color:#8b8fa3;font-weight:400">' + r.characterCount + ' characters analyzed</div>';
    html += '</div></div>';
    html += '<div class="panel-right">';
    html += '<span class="ibr-tier-badge" style="background:' + tc + '22;color:' + tc + ';border:1px solid ' + tc + '44">' + escH(r.tierLabel) + '</span>';
    html += '<button class="ibr-btn-outline" id="ibrReanalyzeBtn" onclick="ibrReUpload()">\\u21BB New Analysis</button>';
    html += '</div>';
    html += '</div>';
    html += '<div id="ibrCacheInfo" style="display:none;font-size:10px;color:#8b8fa3;padding:6px 14px;background:#16161e;border-bottom:1px solid #2a2a3a"></div>';

    // KPI strip
    html += '<div class="ibr-kpi-grid">';
    html += '<div class="ibr-kpi"><div class="val" style="color:' + tc + '">' + r.summary.avgScore.toFixed(1) + '</div><div class="lbl">Avg Score</div></div>';
    html += '<div class="ibr-kpi"><div class="val" style="color:#4caf50">' + r.summary.maxedCount + '</div><div class="lbl">Maxed</div></div>';
    html += '<div class="ibr-kpi"><div class="val" style="color:#f44336">' + r.summary.behindCount + '</div><div class="lbl">Behind</div></div>';
    html += '<div class="ibr-kpi"><div class="val" style="color:#2196f3">' + r.summary.totalSystems + '</div><div class="lbl">Systems</div></div>';
    if(r.accountAge !== null) html += '<div class="ibr-kpi"><div class="val" style="color:#ff9800">' + Math.floor(r.accountAge/365) + 'y</div><div class="lbl">Age</div></div>';
    if(r.benchmarkSampleCount !== undefined) html += '<div class="ibr-kpi"><div class="val" style="color:#b794f6">' + r.benchmarkSampleCount + '</div><div class="lbl">In Tier</div></div>';
    html += '</div></div>';

    // === Settings bar ===
    html += '<div class="ibr-settings">';
    html += '<label class="ibr-toggle"><input type="checkbox" id="ibrHideMaxed" onchange="ibrToggleMaxed()"><span class="slider"></span> Hide maxed (5\\u2605)</label>';
    html += '</div>';

    // === Gear Progression Panel ===
    if(r.gearRecommendations && r.gearRecommendations.length > 0){
      var activeRecs = r.gearRecommendations.filter(function(gr){ return gr.recommendation; });
      var maxedRecs = r.gearRecommendations.filter(function(gr){ return !gr.recommendation; });
      html += '<div class="ibr-panel">';
      html += '<div class="ibr-panel-title" style="cursor:pointer" onclick="ibrToggleWorld(this)">';
      html += '<span>\\uD83C\\uDFAF Gear Progression</span>';
      html += '<div class="panel-right">';
      if(activeRecs.length > 0) html += '<span style="font-size:10px;color:#ff9800">' + activeRecs.length + ' upgrades</span>';
      if(maxedRecs.length > 0) html += '<span style="font-size:10px;color:#4caf50">' + maxedRecs.length + ' maxed</span>';
      html += '<span class="warrow">\\u25BC</span></div>';
      html += '</div>';
      html += '<div class="ibr-panel-body">';
      if(activeRecs.length > 0){
        html += '<div class="ibr-strip accent">Upgrades Available</div>';
        for(var gi=0;gi<activeRecs.length;gi++){
          var gr = activeRecs[gi];
          var statusColor = gr.status === 'equip-all' ? '#ff9800' : gr.status === 'next-tier' ? '#2196f3' : gr.status === 'advice' ? '#b794f6' : '#4caf50';
          html += '<div class="ibr-gear-row">';
          html += '<span class="gear-icon">' + gr.icon + '</span>';
          html += '<div class="gear-info">';
          html += '<div><span class="gear-label">' + escH(gr.label) + '</span>';
          if(gr.currentTier) html += '<span class="gear-current">Current: ' + escH(gr.currentTier) + '</span>';
          html += '</div>';
          html += '<div class="gear-rec" style="color:' + statusColor + '">' + escH(gr.recommendation) + '</div>';
          if(gr.charsNeedingUpgrade && gr.charsNeedingUpgrade.length > 0){
            html += '<div class="gear-missing">Missing: ' + gr.charsNeedingUpgrade.map(function(n){return escH(n)}).join(', ') + '</div>';
          }
          html += '</div></div>';
        }
      }
      if(maxedRecs.length > 0){
        html += '<div class="ibr-gear-maxed">';
        html += '\\u2705 ' + maxedRecs.map(function(gr){return gr.icon + ' ' + escH(gr.label)}).join(' \\u00B7 ');
        html += '</div>';
      }
      html += '</div></div>';
    }

    // === Build priorities panel ===
    var prioHtml = '';
    if(r.priorities && r.priorities.length > 0){
      prioHtml += '<div class="ibr-panel" style="position:sticky;top:64px">';
      prioHtml += '<div class="ibr-panel-title">';
      prioHtml += '<span>\\uD83D\\uDD25 Top Priorities</span>';
      prioHtml += '<span style="font-size:10px;color:#8b8fa3">' + r.priorities.length + ' items</span>';
      prioHtml += '</div>';
      prioHtml += '<div class="ibr-panel-body">';
      for(var i=0;i<r.priorities.length;i++){
        var p = r.priorities[i];
        prioHtml += '<div class="ibr-prio">';
        prioHtml += '<div class="rank">#' + (i+1) + '</div>';
        prioHtml += '<div class="info">';
        prioHtml += '<div class="name">' + p.icon + ' ' + escH(p.system) + ' <span style="color:#8b8fa3;font-size:9px">' + p.world + '</span> ' + stars(p.score) + '</div>';
        prioHtml += '<div class="reason">' + escH(p.reason) + '</div>';
        if(p.tips && p.tips.length > 0){
          prioHtml += '<ul class="ibr-prio-tips">';
          for(var ti=0;ti<p.tips.length;ti++) prioHtml += '<li>' + escH(p.tips[ti]) + '</li>';
          prioHtml += '</ul>';
        }
        prioHtml += '</div></div>';
      }
      prioHtml += '</div></div>';
    }

    // === Split layout: Systems (left) + Priorities (right) ===
    html += '<div class="ibr-split">';
    html += '<div>';

    // === Systems by world ===
    var worldOrder = ['W1','W2','W3','W4','W5','W6','W7','All'];
    var byWorld = {};
    for(var w=0;w<worldOrder.length;w++) byWorld[worldOrder[w]] = [];
    for(var j=0;j<r.systems.length;j++){
      var s = r.systems[j];
      var wk = s.world || 'All';
      if(!byWorld[wk]) byWorld[wk] = [];
      byWorld[wk].push(s);
    }

    html += '<div class="ibr-panel">';
    html += '<div class="ibr-panel-title"><span>\\uD83D\\uDCCA All Systems</span><span style="font-size:10px;color:#8b8fa3">' + r.systems.length + ' total</span></div>';
    html += '<div class="ibr-panel-body">';

    for(var w=0;w<worldOrder.length;w++){
      var wKey = worldOrder[w];
      var ws = byWorld[wKey];
      if(!ws || ws.length === 0) continue;
      var wAvg = ws.reduce(function(a,b){ return a + b.score; }, 0) / ws.length;
      var wMaxed = ws.filter(function(x){ return x.score >= 5; }).length;
      var wIcon = worldIcons[wKey] || '';

      html += '<div class="ibr-world-section" data-world="' + wKey + '">';
      html += '<div class="ibr-world-hdr" onclick="ibrToggleWorld(this)">';
      html += '<span class="wname">' + wIcon + ' ' + (worldLabels[wKey] || wKey) + '</span>';
      html += '<span class="wstats">' + wMaxed + '/' + ws.length + ' maxed \\u00B7 avg ' + wAvg.toFixed(1) + '</span>';
      html += '<span class="warrow">\\u25BC</span>';
      html += '</div>';
      html += '<div class="ibr-world-body">';

      for(var si=0;si<ws.length;si++){
        var sys = ws[si];
        var sc = tierColors[sys.systemTier] || '#ccc';
        var cls = 'ibr-sys';
        if(sys.behind) cls += ' behind';
        if(sys.score >= 5) cls += ' maxed-sys';

        html += '<div class="' + cls + '" data-score="' + sys.score + '">';

        // Title bar
        html += '<div class="ibr-sys-title">';
        html += '<span class="name">' + sys.icon + ' ' + escH(sys.label) + '</span>';
        html += '<span class="stars">' + stars(sys.score) + '</span>';
        html += '</div>';

        // Score strip
        html += '<div class="ibr-sys-score">';
        html += '<span class="tier-tag" style="background:' + sc + '22;color:' + sc + '">' + escH(sys.systemTier) + '</span>';
        html += '<div class="score-bar"><div class="score-bar-fill" style="width:' + (sys.score*20) + '%;background:' + sc + '"></div></div>';
        if(sys.behind) html += '<span class="ibr-sys-behind">\\u26A0 behind</span>';
        if(sys.benchAvg !== undefined && sys.benchSamples > 0){
          var diff = sys.score - sys.benchAvg;
          var diffColor = diff > 0 ? '#4caf50' : diff < 0 ? '#f44336' : '#8b8fa3';
          var diffSign = diff > 0 ? '+' : '';
          html += '<span class="ibr-sys-bench" style="color:' + diffColor + '" title="vs ' + sys.benchSamples + ' accounts in your tier">';
          html += diffSign + diff.toFixed(1) + ' vs avg';
          html += '</span>';
        }
        html += '</div>';

        // Detail
        html += '<div class="ibr-sys-detail">' + escH(sys.detail) + '</div>';

        // Tips
        if(sys.tips && sys.tips.length > 0 && sys.score < 5){
          html += '<ul class="ibr-sys-tips">';
          for(var ti=0;ti<sys.tips.length;ti++) html += '<li>' + escH(sys.tips[ti]) + '</li>';
          html += '</ul>';
        }

        // Breakdown
        if(sys.breakdown && sys.breakdown.sources){
          html += '<div class="ibr-sys-breakdown">';
          var srcKeys = Object.keys(sys.breakdown.sources);
          for(var bi=0;bi<srcKeys.length;bi++){
            var bk = srcKeys[bi], bv = sys.breakdown.sources[bk];
            if(bv > 0) html += '<span>' + escH(bk) + ': <b>' + bv + '</b></span>';
          }
          if(sys.breakdown.prismaMulti) html += '<span style="color:#b794f6;font-weight:600">Multi: ' + sys.breakdown.prismaMulti.toFixed(2) + 'x</span>';
          if(sys.breakdown.exaltedTotal) html += '<span style="color:#b794f6;font-weight:600">Total: ' + sys.breakdown.exaltedTotal + '%</span>';
          html += '</div>';
        }

        html += '</div>'; // close ibr-sys
      }
      html += '</div></div>'; // close world-body & world-section
    }
    html += '</div></div>'; // close panel-body & panel

    html += '</div>'; // close left column
    html += '<div>' + prioHtml + '</div>'; // right sidebar: priorities
    html += '</div>'; // close ibr-split

    // === Characters Panel ===
    html += '<div class="ibr-panel">';
    html += '<div class="ibr-panel-title" style="cursor:pointer" onclick="ibrToggleWorld(this)">';
    html += '<span>\\uD83D\\uDC65 Characters</span>';
    html += '<div class="panel-right">';
    html += '<span style="font-size:10px;color:#8b8fa3">' + r.characters.length + ' total</span>';
    html += '<span class="warrow">\\u25BC</span>';
    html += '</div></div>';
    html += '<div class="ibr-panel-body hidden">';
    html += '<div class="ibr-char-grid">';
    var skillNames = ['Lv','Min','Smi','Chp','Fsh','Alc','Cat','Trp','Con','Wor','Cok','Bre','Lab','Sai','Div','Gam','Far','Snk','Sum','Hol','W7'];
    for(var k=0;k<r.characters.length;k++){
      var c = r.characters[k];
      html += '<div class="ibr-char">';

      // Header
      html += '<div class="ibr-char-hdr">';
      html += '<div><div class="name">' + escH(c.name) + '</div><div class="cls">' + escH(c.className) + '</div></div>';
      html += '<div class="lv">Lv ' + c.level + '</div>';
      html += '</div>';

      // AFK info
      html += '<div class="afk">AFK: ' + escH(c.afkTarget) + ' (W' + c.afkWorld + ')</div>';

      // Equipment
      if(c.equipment){
        html += '<div class="ibr-char-body">';
        var imgBase = 'https://idleontoolbox.com/data/';
        if(c.equipment.armor && c.equipment.armor.length > 0){
          html += '<div class="ibr-equip-section"><div class="sect-title">\\u2694\\uFE0F Armor</div><div class="ibr-equip-row">';
          for(var ei=0;ei<c.equipment.armor.length;ei++){
            var eq = c.equipment.armor[ei];
            html += '<div class="ibr-equip-item" title="' + escH(eq.slot) + ': ' + escH(eq.rawName.replace(/_/g,' ')) + '">';
            html += '<img src="' + imgBase + escH(eq.rawName) + '.png" alt="' + escH(eq.rawName) + '" onerror="this.style.display=\\\\x27none\\\\x27">';
            html += '<div class="slot-label">' + escH(eq.slot.substring(0,4)) + '</div>';
            html += '</div>';
          }
          html += '</div></div>';
        }
        if(c.equipment.tools && c.equipment.tools.length > 0){
          html += '<div class="ibr-equip-section"><div class="sect-title">\\uD83D\\uDD27 Tools</div><div class="ibr-equip-row">';
          for(var ti2=0;ti2<c.equipment.tools.length;ti2++){
            var tl = c.equipment.tools[ti2];
            html += '<div class="ibr-equip-item" title="' + escH(tl.slot) + ': ' + escH(tl.rawName.replace(/_/g,' ')) + '">';
            html += '<img src="' + imgBase + escH(tl.rawName) + '.png" alt="' + escH(tl.rawName) + '" onerror="this.style.display=\\\\x27none\\\\x27">';
            html += '<div class="slot-label">' + escH(tl.slot.substring(0,4)) + '</div>';
            html += '</div>';
          }
          html += '</div></div>';
        }
        html += '</div>';
      }

      // Skills bar
      html += '<div class="ibr-skills-bar">';
      for(var si2=1;si2<Math.min(c.skills.length, skillNames.length);si2++){
        var sv2 = c.skills[si2];
        if(typeof sv2 === 'number' && sv2 > 0) html += '<span class="ibr-skill">' + skillNames[si2] + ':' + sv2 + '</span>';
      }
      html += '</div>';

      html += '</div>'; // close ibr-char
    }
    html += '</div></div></div>'; // close grid, body, panel

    el.innerHTML = html;
  }

  window.ibrToggleWorld = function(hdr){
    var body = hdr.nextElementSibling;
    if(!body) return;
    body.classList.toggle('hidden');
    hdr.classList.toggle('collapsed');
  };

  window.ibrToggleMaxed = function(){
    var hide = document.getElementById('ibrHideMaxed').checked;
    var cards = document.querySelectorAll('.ibr-sys[data-score]');
    for(var i=0;i<cards.length;i++){
      if(parseInt(cards[i].getAttribute('data-score')) >= 5){
        cards[i].style.display = hide ? 'none' : '';
      }
    }
  };
})();
</script>
`;
}
