/**
 * Idleon Bot Review Tab — Dashboard Frontend v4
 * AutoReview-inspired: large system panels, prominent tips, alerts next to gear.
 */
export function renderIdleonBotReviewTab(userTier) {
  return `
<style>
/* ===== Base Reset ===== */
.ibr *{box-sizing:border-box}
.ibr{font-size:14px;color:#d0d0d8;line-height:1.5}

/* ===== Panel System ===== */
.ibr-panel{background:#1a1a24;border:1px solid #2e2e40;border-radius:8px;margin-bottom:12px;overflow:hidden}
.ibr-panel-hdr{display:flex;align-items:center;justify-content:space-between;padding:12px 18px;background:#1f1f30;border-bottom:1px solid #2e2e40;cursor:pointer;user-select:none}
.ibr-panel-hdr .p-left{display:flex;align-items:center;gap:10px}
.ibr-panel-hdr .p-icon{font-size:26px}
.ibr-panel-hdr .p-title{font-size:16px;font-weight:700;color:#d4c8f0}
.ibr-panel-hdr .p-sub{font-size:11px;color:#8b8fa3;font-weight:400}
.ibr-panel-hdr .p-right{display:flex;align-items:center;gap:10px;font-size:12px;color:#8b8fa3}
.ibr-panel-hdr .p-badge{padding:3px 10px;border-radius:4px;font-weight:700;font-size:12px}
.ibr-panel-hdr .arrow{font-size:14px;color:#8b8fa3;transition:transform .2s}
.ibr-panel-hdr.collapsed .arrow{transform:rotate(-90deg)}
.ibr-panel-body{padding:0}
.ibr-panel-body.hidden{display:none}

/* ===== Strip Headers (like AutoReview section bars) ===== */
.ibr-strip{padding:8px 18px;font-size:13px;font-weight:700;border-bottom:1px solid #2a2a3a;display:flex;align-items:center;justify-content:space-between}
.ibr-strip.purple{background:#1c1630;color:#c4a8ff;border-left:4px solid #7c3aed}
.ibr-strip.green{background:#162018;color:#81c784;border-left:4px solid #4caf50}
.ibr-strip.orange{background:#201c14;color:#ffb74d;border-left:4px solid #ff9800}
.ibr-strip.red{background:#201414;color:#ef9a9a;border-left:4px solid #f44336}
.ibr-strip.blue{background:#141820;color:#90caf9;border-left:4px solid #2196f3}

/* ===== Info Rows ===== */
.ibr-row{display:flex;align-items:center;gap:10px;padding:8px 18px;border-bottom:1px solid #1e1e2e;transition:background .15s;font-size:13px}
.ibr-row:last-child{border-bottom:none}
.ibr-row:hover{background:#1e1e2c}
.ibr-row .r-icon{font-size:18px;flex-shrink:0;width:24px;text-align:center}
.ibr-row .r-text{flex:1;color:#d0d0d8}
.ibr-row .r-sub{font-size:11px;color:#8b8fa3;margin-top:1px}
.ibr-row .r-val{font-weight:700;font-size:14px;white-space:nowrap;color:#b794f6}
.ibr-row .r-val.green{color:#4caf50}.ibr-row .r-val.red{color:#f44336}.ibr-row .r-val.orange{color:#ff9800}
.ibr-row .r-check{color:#4caf50;font-size:18px}

/* ===== Upload Section ===== */
.ibr-card{background:#1a1a24;border:1px solid #2e2e40;border-radius:8px;padding:18px;margin-bottom:12px}
.ibr-card h2{margin:0 0 6px;font-size:18px;color:#b794f6}.ibr-card h3{margin:0 0 8px;font-size:15px;color:#b794f6}
.ibr-sub{color:#8b8fa3;font-size:12px;margin:0 0 12px}
.ibr-drop{border:2px dashed #3a3a50;border-radius:10px;padding:36px 18px;text-align:center;cursor:pointer;transition:all .2s;background:#13131a;position:relative}
.ibr-drop:hover,.ibr-drop.drag-over{border-color:#b794f6;background:#1a1a2e}
.ibr-drop input[type=file]{position:absolute;inset:0;opacity:0;cursor:pointer}
.ibr-drop .icon{font-size:32px;margin-bottom:8px}
.ibr-drop .label{font-size:14px;color:#ccc;font-weight:600}.ibr-drop .hint{font-size:11px;color:#8b8fa3;margin-top:6px}
.ibr-btn{background:#7c3aed;color:#fff;border:none;border-radius:6px;padding:9px 20px;font-size:14px;cursor:pointer;font-weight:600;transition:all .2s}
.ibr-btn:hover{background:#6d28d9}.ibr-btn:disabled{opacity:.5;cursor:not-allowed}
.ibr-btn-outline{background:none;border:1px solid #3a3a50;color:#ccc;border-radius:5px;padding:6px 14px;font-size:12px;cursor:pointer;transition:all .2s}
.ibr-btn-outline:hover{border-color:#b794f6;color:#b794f6}

/* ===== KPI Grid ===== */
.ibr-kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:0;border-top:1px solid #2e2e40}
.ibr-kpi{padding:14px 18px;text-align:center;border-right:1px solid #2e2e40;background:#16161e}
.ibr-kpi:last-child{border-right:none}
.ibr-kpi .val{font-size:24px;font-weight:800}.ibr-kpi .lbl{font-size:10px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.5px;margin-top:3px}

/* ===== Top Row: Gear + Alerts side by side ===== */
.ibr-top-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
@media(max-width:900px){.ibr-top-row{grid-template-columns:1fr}}

/* ===== Settings ===== */
.ibr-settings{display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:10px 18px;background:#1a1a24;border:1px solid #2e2e40;border-radius:8px;margin-bottom:12px}
.ibr-toggle{display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;color:#ccc;user-select:none}
.ibr-toggle input{display:none}
.ibr-toggle .slider{width:36px;height:20px;background:#3a3a50;border-radius:10px;position:relative;transition:background .2s}
.ibr-toggle .slider::after{content:'';position:absolute;top:2px;left:2px;width:16px;height:16px;background:#888;border-radius:50%;transition:all .2s}
.ibr-toggle input:checked+.slider{background:#7c3aed}
.ibr-toggle input:checked+.slider::after{left:18px;background:#fff}

/* ===== World Section ===== */
.ibr-world{margin-bottom:14px}
.ibr-world-hdr{display:flex;align-items:center;gap:10px;padding:12px 18px;background:#1f1f30;border:1px solid #2e2e40;border-radius:8px;cursor:pointer;user-select:none;margin-bottom:8px;border-left:4px solid #7c3aed;transition:all .2s}
.ibr-world-hdr:hover{background:#26263a}
.ibr-world-hdr .wname{font-size:16px;font-weight:700;color:#d4c8f0;flex:1}
.ibr-world-hdr .wstats{font-size:11px;color:#8b8fa3;background:#16161e;padding:3px 10px;border-radius:4px}
.ibr-world-hdr .arrow{font-size:14px;color:#8b8fa3;transition:transform .2s}
.ibr-world-hdr.collapsed .arrow{transform:rotate(-90deg)}
.ibr-world-body{display:grid;grid-template-columns:repeat(auto-fill,minmax(380px,1fr));gap:10px}
.ibr-world-body.hidden{display:none}

/* ===== System Card (AutoReview-size) ===== */
.ibr-sys{background:#1a1a24;border:1px solid #2e2e40;border-radius:8px;overflow:hidden;transition:border-color .2s}
.ibr-sys:hover{border-color:#3e3e56}
.ibr-sys.behind{border-left:4px solid #f44336}
.ibr-sys.maxed{border-left:4px solid #4caf50}

/* System header */
.ibr-sys-hdr{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:#1f1f30;border-bottom:1px solid #2e2e40}
.ibr-sys-hdr .s-left{display:flex;align-items:center;gap:8px}
.ibr-sys-hdr .s-icon{font-size:22px}
.ibr-sys-hdr .s-name{font-size:15px;font-weight:700;color:#d4c8f0}
.ibr-sys-hdr .s-right{display:flex;align-items:center;gap:8px}
.ibr-sys-hdr .s-stars{font-size:14px;letter-spacing:1px}
.ibr-sys-hdr .s-tier{font-size:10px;padding:2px 8px;border-radius:4px;font-weight:700}

/* Score bar */
.ibr-sys-bar{display:flex;align-items:center;gap:10px;padding:8px 16px;background:#16161e;border-bottom:1px solid #22223a;font-size:12px}
.ibr-bar{flex:1;height:6px;background:#22223a;border-radius:3px;overflow:hidden}
.ibr-bar-fill{height:100%;border-radius:3px;transition:width .5s}
.ibr-sys-bar .bench{font-size:11px}
.ibr-sys-bar .behind-tag{color:#f44336;font-weight:700;font-size:11px}

/* Detail */
.ibr-sys-detail{padding:10px 16px;font-size:13px;color:#aaa;border-bottom:1px solid #1e1e2e;line-height:1.5}

/* Tips — big, readable, AutoReview-style rows */
.ibr-sys-tips{margin:0;padding:0;list-style:none}
.ibr-sys-tips li{display:flex;align-items:flex-start;gap:8px;padding:8px 16px;font-size:13px;color:#d0d0d8;border-bottom:1px solid #1a1a28;line-height:1.4}
.ibr-sys-tips li:last-child{border-bottom:none}
.ibr-sys-tips .tip-icon{flex-shrink:0;font-size:15px;margin-top:1px}
.ibr-sys-tips .tip-text{flex:1}

/* Breakdown */
.ibr-sys-bk{padding:8px 16px;background:#13131c;border-top:1px solid #1e1e2e;display:flex;flex-wrap:wrap;gap:12px;font-size:12px;color:#8b8fa3}
.ibr-sys-bk .bk-item{display:flex;align-items:center;gap:4px}
.ibr-sys-bk .bk-item b{color:#d0d0d8;font-size:13px}
.ibr-sys-bk .bk-highlight{color:#b794f6;font-weight:700}

/* ===== Gear Rows ===== */
.ibr-gear-row{display:flex;align-items:flex-start;gap:12px;padding:10px 18px;border-bottom:1px solid #1e1e2e}
.ibr-gear-row:last-child{border-bottom:none}
.ibr-gear-row:hover{background:#1e1e2c}
.ibr-gear-row .g-icon{font-size:22px;flex-shrink:0}
.ibr-gear-row .g-info{flex:1}
.ibr-gear-row .g-label{font-size:14px;font-weight:600;color:#d0d0d8}
.ibr-gear-row .g-current{font-size:11px;color:#8b8fa3;margin-left:8px}
.ibr-gear-row .g-rec{font-size:13px;font-weight:600;margin-top:3px}
.ibr-gear-row .g-missing{font-size:11px;color:#8b8fa3;margin-top:2px}
.ibr-gear-maxed{padding:10px 18px;font-size:12px;color:#4caf50;background:#141e18;border-top:1px solid #1e2a20}

/* ===== Priority Rows ===== */
.ibr-prio{display:flex;align-items:flex-start;gap:12px;padding:10px 18px;border-bottom:1px solid #1e1e2e}
.ibr-prio:last-child{border-bottom:none}
.ibr-prio:hover{background:#1e1e2c}
.ibr-prio .p-rank{font-size:20px;font-weight:800;color:#7c3aed;min-width:32px;text-align:center;background:#16161e;padding:6px;border-radius:6px}
.ibr-prio .p-body{flex:1}
.ibr-prio .p-name{font-size:14px;font-weight:600;color:#d4c8f0;margin-bottom:2px}
.ibr-prio .p-reason{font-size:12px;color:#8b8fa3;line-height:1.4}
.ibr-prio-tips{margin:4px 0 0;padding:0;list-style:none}
.ibr-prio-tips li{font-size:12px;color:#c9a0ff;padding:3px 0 3px 16px;position:relative;line-height:1.3}
.ibr-prio-tips li::before{content:'\\25B8';position:absolute;left:0;color:#7c3aed}

/* ===== Character Cards ===== */
.ibr-char-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;padding:12px}
.ibr-char{background:#16161e;border:1px solid #2e2e40;border-radius:8px;overflow:hidden}
.ibr-char-hdr{display:flex;justify-content:space-between;align-items:flex-start;padding:10px 14px;background:#1f1f30;border-bottom:1px solid #2e2e40}
.ibr-char-hdr .name{font-size:14px;font-weight:600;color:#d4c8f0}.ibr-char-hdr .cls{font-size:11px;color:#8b8fa3}
.ibr-char-hdr .lv{font-size:20px;font-weight:800;color:#b794f6}
.ibr-char-body{padding:8px 14px}
.ibr-char .afk{font-size:11px;color:#8b8fa3;padding:2px 14px 6px}
.ibr-equip-section{margin-bottom:8px}
.ibr-equip-section .sect-title{font-size:10px;color:#8b8fa3;margin-bottom:4px;text-transform:uppercase;letter-spacing:.3px;padding:4px 0;border-bottom:1px solid #22223a}
.ibr-equip-row{display:flex;gap:5px;flex-wrap:wrap;padding:4px 0}
.ibr-equip-item{position:relative;width:38px;height:38px;background:#22223a;border:1px solid #3a3a4a;border-radius:5px;overflow:hidden}
.ibr-equip-item img{width:100%;height:100%;object-fit:contain;image-rendering:pixelated}
.ibr-equip-item .slot-label{position:absolute;bottom:0;left:0;right:0;font-size:7px;text-align:center;background:rgba(0,0,0,.7);color:#8b8fa3;line-height:1;padding:1px 0}
.ibr-skills-bar{display:flex;gap:3px;flex-wrap:wrap;padding:6px 14px 10px}
.ibr-skill{font-size:10px;background:#22223a;padding:2px 5px;border-radius:3px;color:#bbb;border:1px solid #2a2a3a}

/* ===== Loading & Error ===== */
.ibr-loading{text-align:center;padding:40px;color:#8b8fa3;font-size:14px}
.ibr-loading .spinner{width:32px;height:32px;border:3px solid #3a3a50;border-top-color:#b794f6;border-radius:50%;animation:ibr-spin .8s linear infinite;margin:0 auto 12px}
@keyframes ibr-spin{to{transform:rotate(360deg)}}
.ibr-error{background:#2a1a1a;border:1px solid #5a2a2a;color:#ef9a9a;border-radius:8px;padding:12px;font-size:13px}
</style>

<div class="ibr">

<div class="ibr-card">
  <h2>\\uD83D\\uDD0D Account Review</h2>
  <p class="ibr-sub">Upload your Idleon save JSON for a personalized analysis. Each review is private.</p>
</div>

<div id="ibrUploadSection">
  <div class="ibr-card">
    <h3>\\uD83D\\uDCE4 Upload Your Save</h3>
    <p class="ibr-sub">Export your save from Idleon (Settings \\u2192 Cloud \\u2192 Copy to clipboard) or use your IdleonToolbox JSON export.</p>
    <div class="ibr-drop" id="ibrDropZone">
      <input type="file" accept=".json,.txt" id="ibrFileInput">
      <div class="icon">\\uD83D\\uDCC1</div>
      <div class="label">Drop your JSON file here or click to browse</div>
      <div class="hint">Accepts .json or .txt files</div>
    </div>
    <div style="text-align:center;margin:10px 0;color:#8b8fa3;font-size:12px">\\u2014 or paste JSON directly \\u2014</div>
    <textarea id="ibrPasteArea" placeholder="Paste your Idleon JSON here..." style="width:100%;min-height:70px;background:#13131a;border:1px solid #2e2e40;border-radius:8px;padding:10px;color:#ccc;font-size:12px;font-family:monospace;resize:vertical;box-sizing:border-box"></textarea>
    <div style="display:flex;gap:10px;margin-top:10px;align-items:center">
      <button class="ibr-btn" onclick="ibrSubmit()">\\uD83D\\uDD0D Analyze Account</button>
      <span id="ibrStatus" style="font-size:12px;color:#8b8fa3"></span>
    </div>
    <div id="ibrError" style="margin-top:10px;display:none"></div>
  </div>
</div>

<div id="ibrResults" style="display:none"></div>

</div><!-- /.ibr -->

<script>
(function(){
  var dropZone = document.getElementById('ibrDropZone');
  var fileInput = document.getElementById('ibrFileInput');
  var pasteArea = document.getElementById('ibrPasteArea');

  fetch('/api/idleon/review/cached').then(function(r){ return r.json(); }).then(function(d){
    if(d.success && d.cached && d.result){
      renderResults(d.result);
      var info = 'Showing cached result';
      if(d.analyzedAgo) info += ' (' + d.analyzedAgo + ')';
      if(!d.canReanalyze) info += ' \\u2014 next analysis in ' + d.cooldownMins + ' min';
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
    if(e.dataTransfer.files[0]) readFile(e.dataTransfer.files[0]);
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
      if(d.cooldownMins) info += ' \\u2014 next analysis in ' + d.cooldownMins + ' min';
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

  // Parse tip emoji prefix for structured display
  function parseTip(t){
    var icons = {'\\u26A0\\uFE0F':'\\u26A0\\uFE0F','\\uD83D\\uDCA1':'\\uD83D\\uDCA1','\\uD83D\\uDCCA':'\\uD83D\\uDCCA','\\u2B06\\uFE0F':'\\u2B06\\uFE0F','\\uD83D\\uDD04':'\\uD83D\\uDD04','\\u2139\\uFE0F':'\\u2139\\uFE0F','\\u2705':'\\u2705'};
    for(var k in icons){ if(t.indexOf(k)===0) return {icon:icons[k],text:t.substring(k.length).trim()}; }
    return {icon:'\\u25B8',text:t};
  }

  function renderResults(r){
    document.getElementById('ibrUploadSection').style.display = 'none';
    var el = document.getElementById('ibrResults');
    el.style.display = '';
    var tc = tierColors[r.tier] || '#ccc';
    var html = '';

    // ========== HEADER PANEL ==========
    html += '<div class="ibr-panel">';
    html += '<div class="ibr-panel-hdr" style="cursor:default">';
    html += '<div class="p-left"><span class="p-icon">\\uD83D\\uDD0D</span><div><div class="p-title">Account Review</div><div class="p-sub">' + r.characterCount + ' characters analyzed</div></div></div>';
    html += '<div class="p-right">';
    html += '<span class="p-badge" style="background:' + tc + '22;color:' + tc + ';border:1px solid ' + tc + '44">' + escH(r.tierLabel) + '</span>';
    html += '<button class="ibr-btn-outline" id="ibrReanalyzeBtn" onclick="ibrReUpload()">\\u21BB New Analysis</button>';
    html += '</div></div>';
    html += '<div id="ibrCacheInfo" style="display:none;font-size:11px;color:#8b8fa3;padding:8px 18px;background:#16161e;border-bottom:1px solid #2e2e40"></div>';
    html += '<div class="ibr-kpi-grid">';
    html += '<div class="ibr-kpi"><div class="val" style="color:' + tc + '">' + r.summary.avgScore.toFixed(1) + '</div><div class="lbl">Avg Score</div></div>';
    html += '<div class="ibr-kpi"><div class="val" style="color:#4caf50">' + r.summary.maxedCount + '</div><div class="lbl">Maxed</div></div>';
    html += '<div class="ibr-kpi"><div class="val" style="color:#f44336">' + r.summary.behindCount + '</div><div class="lbl">Behind</div></div>';
    html += '<div class="ibr-kpi"><div class="val" style="color:#2196f3">' + r.summary.totalSystems + '</div><div class="lbl">Systems</div></div>';
    if(r.accountAge !== null) html += '<div class="ibr-kpi"><div class="val" style="color:#ff9800">' + Math.floor(r.accountAge/365) + 'y</div><div class="lbl">Age</div></div>';
    if(r.benchmarkSampleCount !== undefined) html += '<div class="ibr-kpi"><div class="val" style="color:#b794f6">' + r.benchmarkSampleCount + '</div><div class="lbl">In Tier</div></div>';
    html += '</div></div>';

    // ========== TOP ROW: Gear (left) + Alerts (right) ==========
    html += '<div class="ibr-top-row">';

    // --- Gear Progression ---
    html += '<div class="ibr-panel" style="margin-bottom:0">';
    html += '<div class="ibr-panel-hdr" onclick="ibrToggle(this)">';
    html += '<div class="p-left"><span class="p-icon">\\uD83C\\uDFAF</span><div class="p-title">Gear Progression</div></div>';
    html += '<div class="p-right">';
    if(r.gearRecommendations){
      var actG = r.gearRecommendations.filter(function(g){return g.recommendation});
      var maxG = r.gearRecommendations.filter(function(g){return !g.recommendation});
      if(actG.length) html += '<span style="color:#ff9800">' + actG.length + ' upgrades</span>';
      if(maxG.length) html += '<span style="color:#4caf50">' + maxG.length + ' maxed</span>';
    }
    html += '<span class="arrow">\\u25BC</span></div></div>';
    html += '<div class="ibr-panel-body">';
    if(r.gearRecommendations && r.gearRecommendations.length > 0){
      var activeRecs = r.gearRecommendations.filter(function(gr){ return gr.recommendation; });
      var maxedRecs = r.gearRecommendations.filter(function(gr){ return !gr.recommendation; });
      if(activeRecs.length > 0){
        html += '<div class="ibr-strip orange">Upgrades Available</div>';
        for(var gi=0;gi<activeRecs.length;gi++){
          var gr = activeRecs[gi];
          var sc2 = gr.status==='equip-all'?'#ff9800':gr.status==='next-tier'?'#2196f3':gr.status==='advice'?'#b794f6':'#4caf50';
          html += '<div class="ibr-gear-row"><span class="g-icon">' + gr.icon + '</span><div class="g-info">';
          html += '<div><span class="g-label">' + escH(gr.label) + '</span>';
          if(gr.currentTier) html += '<span class="g-current">Current: ' + escH(gr.currentTier) + '</span>';
          html += '</div>';
          html += '<div class="g-rec" style="color:' + sc2 + '">' + escH(gr.recommendation) + '</div>';
          if(gr.charsNeedingUpgrade && gr.charsNeedingUpgrade.length > 0) html += '<div class="g-missing">Missing: ' + gr.charsNeedingUpgrade.map(function(n){return escH(n)}).join(', ') + '</div>';
          html += '</div></div>';
        }
      }
      if(maxedRecs.length > 0){
        html += '<div class="ibr-gear-maxed">\\u2705 ' + maxedRecs.map(function(g){return g.icon+' '+escH(g.label)}).join(' \\u00B7 ') + '</div>';
      }
    } else {
      html += '<div class="ibr-row"><span class="r-text" style="color:#8b8fa3">No gear data available</span></div>';
    }
    html += '</div></div>';

    // --- Alerts / Priorities ---
    html += '<div class="ibr-panel" style="margin-bottom:0">';
    html += '<div class="ibr-panel-hdr" onclick="ibrToggle(this)">';
    html += '<div class="p-left"><span class="p-icon">\\uD83D\\uDD25</span><div class="p-title">Top Priorities</div></div>';
    html += '<div class="p-right">';
    if(r.priorities) html += '<span style="color:#ef9a9a">' + r.priorities.length + ' alerts</span>';
    html += '<span class="arrow">\\u25BC</span></div></div>';
    html += '<div class="ibr-panel-body">';
    if(r.priorities && r.priorities.length > 0){
      for(var pi=0;pi<r.priorities.length;pi++){
        var p = r.priorities[pi];
        html += '<div class="ibr-prio">';
        html += '<div class="p-rank">#' + (pi+1) + '</div>';
        html += '<div class="p-body">';
        html += '<div class="p-name">' + p.icon + ' ' + escH(p.system) + ' <span style="color:#8b8fa3;font-size:10px">' + p.world + '</span> ' + stars(p.score) + '</div>';
        html += '<div class="p-reason">' + escH(p.reason) + '</div>';
        if(p.tips && p.tips.length > 0){
          html += '<ul class="ibr-prio-tips">';
          for(var pti=0;pti<p.tips.length;pti++) html += '<li>' + escH(p.tips[pti]) + '</li>';
          html += '</ul>';
        }
        html += '</div></div>';
      }
    } else {
      html += '<div class="ibr-row"><span class="r-text" style="color:#4caf50">\\u2705 No critical alerts \\u2014 looking good!</span></div>';
    }
    html += '</div></div>';

    html += '</div>'; // close top-row

    // ========== SETTINGS ==========
    html += '<div class="ibr-settings">';
    html += '<label class="ibr-toggle"><input type="checkbox" id="ibrHideMaxed" onchange="ibrToggleMaxed()"><span class="slider"></span> Hide maxed (5\\u2605)</label>';
    html += '</div>';

    // ========== SYSTEMS BY WORLD ==========
    var worldOrder = ['W1','W2','W3','W4','W5','W6','W7','All'];
    var byWorld = {};
    for(var w=0;w<worldOrder.length;w++) byWorld[worldOrder[w]] = [];
    for(var j=0;j<r.systems.length;j++){
      var s = r.systems[j];
      var wk = s.world || 'All';
      if(!byWorld[wk]) byWorld[wk] = [];
      byWorld[wk].push(s);
    }

    for(var w=0;w<worldOrder.length;w++){
      var wKey = worldOrder[w];
      var ws = byWorld[wKey];
      if(!ws || ws.length === 0) continue;
      var wAvg = ws.reduce(function(a,b){ return a + b.score; },0) / ws.length;
      var wMaxed = ws.filter(function(x){ return x.score >= 5; }).length;
      var wBehind = ws.filter(function(x){ return x.behind; }).length;
      var wIcon = worldIcons[wKey] || '';

      html += '<div class="ibr-world" data-world="' + wKey + '">';

      // World header
      html += '<div class="ibr-world-hdr" onclick="ibrToggle(this)">';
      html += '<span class="wname">' + wIcon + ' ' + (worldLabels[wKey]||wKey) + '</span>';
      html += '<span class="wstats">' + ws.length + ' systems \\u00B7 ' + wMaxed + ' maxed \\u00B7 avg ' + wAvg.toFixed(1) + (wBehind?' \\u00B7 <span style=\\"color:#f44336\\">' + wBehind + ' behind</span>':'') + '</span>';
      html += '<span class="arrow">\\u25BC</span>';
      html += '</div>';

      // World body — grid of system cards
      html += '<div class="ibr-world-body">';

      for(var si=0;si<ws.length;si++){
        var sys = ws[si];
        var sc = tierColors[sys.systemTier] || '#ccc';
        var cls = 'ibr-sys';
        if(sys.behind) cls += ' behind';
        if(sys.score >= 5) cls += ' maxed';

        html += '<div class="' + cls + '" data-score="' + sys.score + '">';

        // --- System header ---
        html += '<div class="ibr-sys-hdr">';
        html += '<div class="s-left"><span class="s-icon">' + sys.icon + '</span><span class="s-name">' + escH(sys.label) + '</span></div>';
        html += '<div class="s-right">';
        html += '<span class="s-stars">' + stars(sys.score) + '</span>';
        html += '<span class="s-tier" style="background:' + sc + '22;color:' + sc + '">' + escH(sys.systemTier) + '</span>';
        html += '</div></div>';

        // --- Score bar ---
        html += '<div class="ibr-sys-bar">';
        html += '<div class="ibr-bar"><div class="ibr-bar-fill" style="width:' + (sys.score*20) + '%;background:' + sc + '"></div></div>';
        if(sys.behind) html += '<span class="behind-tag">\\u26A0 Behind</span>';
        if(sys.benchAvg !== undefined && sys.benchSamples > 0){
          var diff = sys.score - sys.benchAvg;
          var dc = diff > 0 ? '#4caf50' : diff < 0 ? '#f44336' : '#8b8fa3';
          html += '<span class="bench" style="color:' + dc + '" title="vs ' + sys.benchSamples + ' accounts">' + (diff>0?'+':'') + diff.toFixed(1) + ' vs avg</span>';
        }
        html += '</div>';

        // --- Detail ---
        html += '<div class="ibr-sys-detail">' + escH(sys.detail) + '</div>';

        // --- Tips (AutoReview-style big rows) ---
        if(sys.tips && sys.tips.length > 0 && sys.score < 5){
          html += '<ul class="ibr-sys-tips">';
          for(var ti=0;ti<sys.tips.length;ti++){
            var tp = parseTip(sys.tips[ti]);
            html += '<li><span class="tip-icon">' + tp.icon + '</span><span class="tip-text">' + escH(tp.text) + '</span></li>';
          }
          html += '</ul>';
        }

        // --- Breakdown ---
        if(sys.breakdown && sys.breakdown.sources){
          html += '<div class="ibr-sys-bk">';
          var srcKeys = Object.keys(sys.breakdown.sources);
          for(var bi=0;bi<srcKeys.length;bi++){
            var bk = srcKeys[bi], bv = sys.breakdown.sources[bk];
            if(typeof bv === 'number' && bv > 0) html += '<span class="bk-item">' + escH(bk) + ': <b>' + bv + '</b></span>';
            else if(typeof bv === 'string') html += '<span class="bk-item">' + escH(bk) + ': <b>' + escH(bv) + '</b></span>';
          }
          if(sys.breakdown.prismaMulti) html += '<span class="bk-highlight">Multi: ' + sys.breakdown.prismaMulti.toFixed(2) + 'x</span>';
          if(sys.breakdown.exaltedTotal) html += '<span class="bk-highlight">Total: ' + sys.breakdown.exaltedTotal + '%</span>';
          html += '</div>';
        }

        html += '</div>'; // close ibr-sys
      }

      html += '</div>'; // close world-body
      html += '</div>'; // close world
    }

    // ========== CHARACTERS ==========
    html += '<div class="ibr-panel">';
    html += '<div class="ibr-panel-hdr" onclick="ibrToggle(this)">';
    html += '<div class="p-left"><span class="p-icon">\\uD83D\\uDC65</span><div class="p-title">Characters</div></div>';
    html += '<div class="p-right"><span>' + r.characters.length + ' total</span><span class="arrow">\\u25BC</span></div></div>';
    html += '<div class="ibr-panel-body hidden">';
    html += '<div class="ibr-char-grid">';
    var skillNames = ['Lv','Min','Smi','Chp','Fsh','Alc','Cat','Trp','Con','Wor','Cok','Bre','Lab','Sai','Div','Gam','Far','Snk','Sum','Hol','W7'];
    for(var k=0;k<r.characters.length;k++){
      var c = r.characters[k];
      html += '<div class="ibr-char">';
      html += '<div class="ibr-char-hdr"><div><div class="name">' + escH(c.name) + '</div><div class="cls">' + escH(c.className) + '</div></div><div class="lv">Lv ' + c.level + '</div></div>';
      html += '<div class="afk">AFK: ' + escH(c.afkTarget) + ' (W' + c.afkWorld + ')</div>';
      if(c.equipment){
        html += '<div class="ibr-char-body">';
        var imgBase = 'https://idleontoolbox.com/data/';
        if(c.equipment.armor && c.equipment.armor.length > 0){
          html += '<div class="ibr-equip-section"><div class="sect-title">\\u2694\\uFE0F Armor</div><div class="ibr-equip-row">';
          for(var ei=0;ei<c.equipment.armor.length;ei++){
            var eq = c.equipment.armor[ei];
            html += '<div class="ibr-equip-item" title="' + escH(eq.slot) + ': ' + escH(eq.rawName.replace(/_/g,' ')) + '">';
            html += '<img src="' + imgBase + escH(eq.rawName) + '.png" alt="' + escH(eq.rawName) + '" onerror="this.style.display=\\\\x27none\\\\x27">';
            html += '<div class="slot-label">' + escH(eq.slot.substring(0,4)) + '</div></div>';
          }
          html += '</div></div>';
        }
        if(c.equipment.tools && c.equipment.tools.length > 0){
          html += '<div class="ibr-equip-section"><div class="sect-title">\\uD83D\\uDD27 Tools</div><div class="ibr-equip-row">';
          for(var ti2=0;ti2<c.equipment.tools.length;ti2++){
            var tl = c.equipment.tools[ti2];
            html += '<div class="ibr-equip-item" title="' + escH(tl.slot) + ': ' + escH(tl.rawName.replace(/_/g,' ')) + '">';
            html += '<img src="' + imgBase + escH(tl.rawName) + '.png" alt="' + escH(tl.rawName) + '" onerror="this.style.display=\\\\x27none\\\\x27">';
            html += '<div class="slot-label">' + escH(tl.slot.substring(0,4)) + '</div></div>';
          }
          html += '</div></div>';
        }
        html += '</div>';
      }
      html += '<div class="ibr-skills-bar">';
      for(var si2=1;si2<Math.min(c.skills.length, skillNames.length);si2++){
        var sv2 = c.skills[si2];
        if(typeof sv2 === 'number' && sv2 > 0) html += '<span class="ibr-skill">' + skillNames[si2] + ':' + sv2 + '</span>';
      }
      html += '</div></div>';
    }
    html += '</div></div></div>';

    el.innerHTML = html;
  }

  window.ibrToggle = function(hdr){
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
