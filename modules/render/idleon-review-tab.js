/**
 * Idleon Bot Review Tab — Dashboard Frontend v5
 * World-nav style: compact system cards, priority bar, sticky nav, no alerts.
 */
export function renderIdleonBotReviewTab(userTier) {
  return `
<style>
/* === Base === */
.ibr *{box-sizing:border-box}
.ibr{font-size:14px;color:#d0d0d8;line-height:1.5}

/* === Upload Card === */
.ibr-card{background:#1a1a24;border:1px solid #2e2e40;border-radius:8px;padding:18px;margin-bottom:12px}
.ibr-card h2{margin:0 0 6px;font-size:18px;color:#b794f6}
.ibr-card h3{margin:0 0 8px;font-size:15px;color:#b794f6}
.ibr-sub{color:#8b8fa3;font-size:12px;margin:0 0 12px}
.ibr-drop{border:2px dashed #3a3a50;border-radius:10px;padding:36px 18px;text-align:center;cursor:pointer;transition:all .2s;background:#13131a;position:relative}
.ibr-drop:hover,.ibr-drop.drag-over{border-color:#b794f6;background:#1a1a2e}
.ibr-drop input[type=file]{position:absolute;inset:0;opacity:0;cursor:pointer}
.ibr-drop .icon{font-size:32px;margin-bottom:8px}
.ibr-drop .label{font-size:14px;color:#ccc;font-weight:600}
.ibr-drop .hint{font-size:11px;color:#8b8fa3;margin-top:6px}
.ibr-btn{background:#7c3aed;color:#fff;border:none;border-radius:6px;padding:9px 20px;font-size:14px;cursor:pointer;font-weight:600;transition:all .2s}
.ibr-btn:hover{background:#6d28d9}
.ibr-btn:disabled{opacity:.5;cursor:not-allowed}
.ibr-btn-outline{background:none;border:1px solid #3a3a50;color:#ccc;border-radius:5px;padding:6px 14px;font-size:12px;cursor:pointer;transition:all .2s}
.ibr-btn-outline:hover{border-color:#b794f6;color:#b794f6}

/* === Header === */
.ibr-header{background:#1a1a24;border:1px solid #2e2e40;border-radius:8px;margin-bottom:12px;overflow:hidden}
.ibr-header-top{display:flex;align-items:center;gap:12px;padding:14px 18px;flex-wrap:wrap}
.ibr-header-top .h-title{font-size:17px;font-weight:700;color:#d4c8f0;display:flex;align-items:center;gap:8px}
.ibr-header-top .h-tier{padding:4px 12px;border-radius:5px;font-weight:700;font-size:13px}
.ibr-header-top .h-space{flex:1}
.ibr-kpi-row{display:flex;border-top:1px solid #2e2e40}
.ibr-kpi{flex:1;padding:10px 14px;text-align:center;border-right:1px solid #2e2e40;background:#16161e}
.ibr-kpi:last-child{border-right:none}
.ibr-kpi .val{font-size:20px;font-weight:800}
.ibr-kpi .lbl{font-size:10px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.5px;margin-top:2px}
.ibr-cache-info{font-size:11px;color:#8b8fa3;padding:6px 18px;background:#16161e;border-top:1px solid #2e2e40}

/* === Top Priorities === */
.ibr-prio-bar{background:#1a1a24;border:1px solid #2e2e40;border-radius:8px;margin-bottom:12px;overflow:hidden}
.ibr-prio-bar-hdr{display:flex;align-items:center;gap:10px;padding:10px 14px;background:#1f1f30;border-bottom:1px solid #2e2e40;cursor:pointer;user-select:none}
.ibr-prio-bar-hdr .pb-title{font-size:13px;font-weight:700;color:#ef9a9a}
.ibr-prio-bar-hdr .arrow{font-size:12px;color:#8b8fa3;margin-left:auto;transition:transform .2s}
.ibr-prio-bar-hdr.collapsed .arrow{transform:rotate(-90deg)}
.ibr-prio-items{padding:10px 12px;display:flex;flex-direction:column;gap:6px}
.ibr-prio-items.hidden{display:none}
.ibr-prio-item{display:flex;align-items:flex-start;gap:10px;padding:8px 12px;background:#16161e;border-radius:6px;border-left:3px solid #7c3aed}
.ibr-prio-item.behind{border-left-color:#f44336}
.ibr-prio-num{font-size:15px;font-weight:800;color:#7c3aed;min-width:22px;text-align:center;line-height:1.5}
.ibr-prio-item.behind .ibr-prio-num{color:#f44336}
.ibr-prio-body{flex:1;min-width:0}
.ibr-prio-name{font-size:13px;font-weight:600;color:#d4c8f0}
.ibr-prio-reason{font-size:11px;color:#8b8fa3;margin-top:2px;line-height:1.3}
.ibr-prio-tips-list{margin:4px 0 0;padding:0;list-style:none}
.ibr-prio-tips-list li{font-size:11px;color:#c9a0ff;padding:2px 0 2px 14px;position:relative;line-height:1.3}
.ibr-prio-tips-list li::before{content:'\u25B8';position:absolute;left:0;color:#7c3aed}

/* === Sticky Nav === */
.ibr-nav{position:sticky;top:64px;z-index:100;background:#13131a;border-bottom:1px solid #2e2e40;padding:8px 14px;margin-bottom:12px;display:flex;gap:4px;overflow-x:auto;scrollbar-width:none}
.ibr-nav::-webkit-scrollbar{display:none}
.ibr-nav-pill{flex-shrink:0;padding:5px 12px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid #2e2e40;background:#1a1a24;color:#8b8fa3;transition:all .18s;text-decoration:none;user-select:none}
.ibr-nav-pill.w1{--nc:#4caf50}.ibr-nav-pill.w2{--nc:#ff9800}.ibr-nav-pill.w3{--nc:#2196f3}
.ibr-nav-pill.w4{--nc:#9c27b0}.ibr-nav-pill.w5{--nc:#00bcd4}.ibr-nav-pill.w6{--nc:#ffc107}
.ibr-nav-pill.w7{--nc:#f44336}.ibr-nav-pill.all{--nc:#b794f6}.ibr-nav-pill.gear{--nc:#78909c}.ibr-nav-pill.chars{--nc:#8d6e63}
.ibr-nav-pill:hover{background:color-mix(in srgb,var(--nc,#7c3aed) 15%,#1a1a24);border-color:var(--nc,#7c3aed);color:var(--nc,#d4c8f0)}
.ibr-nav-pill.active{background:var(--nc,#7c3aed);border-color:var(--nc,#7c3aed);color:#fff}

/* === Settings Bar === */
.ibr-settings{display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:8px 14px;background:#1a1a24;border:1px solid #2e2e40;border-radius:8px;margin-bottom:12px;font-size:12px;color:#8b8fa3}
.ibr-toggle{display:flex;align-items:center;gap:6px;cursor:pointer;user-select:none;color:#ccc}
.ibr-toggle input{display:none}
.ibr-toggle .slider{width:32px;height:18px;background:#3a3a50;border-radius:9px;position:relative;transition:background .2s}
.ibr-toggle .slider::after{content:'';position:absolute;top:2px;left:2px;width:14px;height:14px;background:#888;border-radius:50%;transition:all .2s}
.ibr-toggle input:checked+.slider{background:#7c3aed}
.ibr-toggle input:checked+.slider::after{left:16px;background:#fff}

/* === World Sections === */
.ibr-world-section{margin-bottom:14px;scroll-margin-top:100px}
.ibr-world-hdr2{display:flex;align-items:center;gap:10px;padding:10px 16px;background:#1f1f30;border:1px solid #2e2e40;border-radius:8px 8px 0 0;cursor:pointer;user-select:none;border-left:4px solid #7c3aed;transition:background .18s}
.ibr-world-hdr2:hover{background:#26263a}
.ibr-world-hdr2.collapsed{border-radius:8px}
.ibr-world-hdr2 .wn{font-size:15px;font-weight:700;color:#d4c8f0;flex:1}
.ibr-world-hdr2 .ws{display:flex;gap:6px;align-items:center;font-size:11px;color:#8b8fa3}
.ibr-world-hdr2 .ws .behind-badge{color:#ef9a9a;background:#2a1a1a;padding:1px 6px;border-radius:3px;font-weight:700}
.ibr-world-hdr2 .ws .maxed-badge{color:#81c784;background:#162018;padding:1px 6px;border-radius:3px}
.ibr-world-hdr2 .arrow{font-size:11px;color:#8b8fa3;transition:transform .2s}
.ibr-world-hdr2.collapsed .arrow{transform:rotate(-90deg)}
.ibr-world-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:8px;padding:8px;background:#14141e;border:1px solid #2e2e40;border-top:none;border-radius:0 0 8px 8px}
.ibr-world-grid.hidden{display:none}

/* === System Cards === */
.ibr-sys{background:#1a1a24;border:1px solid #2e2e40;border-radius:7px;overflow:hidden;transition:border-color .18s;cursor:pointer}
.ibr-sys:hover{border-color:#3e3e56}
.ibr-sys.behind{border-left:3px solid #f44336}
.ibr-sys.maxed{border-left:3px solid #4caf50}
.ibr-sys-top{display:flex;align-items:center;gap:7px;padding:8px 10px;background:#1f1f30;border-bottom:1px solid #22223a}
.ibr-sys-top .s-icon{font-size:17px;flex-shrink:0}
.ibr-sys-top .s-name{font-size:13px;font-weight:700;color:#d4c8f0;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ibr-sys-top .s-stars{font-size:11px;flex-shrink:0;letter-spacing:0}
.ibr-sys-top .s-tier{font-size:9px;padding:1px 5px;border-radius:3px;font-weight:700;flex-shrink:0}
.ibr-sys-meta{display:flex;align-items:center;gap:6px;padding:4px 10px;background:#16161e;border-bottom:1px solid #1e1e2e}
.ibr-bar2{flex:1;height:4px;background:#22223a;border-radius:2px;overflow:hidden}
.ibr-bar2-fill{height:100%;border-radius:2px;transition:width .4s}
.ibr-sys-meta .bench{font-size:10px}
.ibr-sys-detail2{padding:5px 10px;font-size:11px;color:#8b8fa3;line-height:1.4;border-bottom:1px solid #1e1e2e}
.ibr-sys-tips2{margin:0;padding:0;list-style:none}
.ibr-sys-tips2.hidden{display:none}
.ibr-sys-tips2 li{display:flex;align-items:flex-start;gap:6px;padding:5px 10px;font-size:11px;color:#d0d0d8;border-bottom:1px solid #1a1a28;line-height:1.3}
.ibr-sys-tips2 li:last-child{border-bottom:none}
.ibr-sys-tips2 .ti{flex-shrink:0;font-size:12px}
.ibr-sys-expand{padding:4px 10px;font-size:10px;color:#8b8fa3;text-align:center;background:#16161e;cursor:pointer;transition:color .15s}
.ibr-sys-expand:hover{color:#b794f6}

/* === Gear Section === */
.ibr-gear-section{background:#1a1a24;border:1px solid #2e2e40;border-radius:8px;margin-bottom:14px;overflow:hidden;scroll-margin-top:100px}
.ibr-gear-hdr{display:flex;align-items:center;gap:10px;padding:11px 16px;background:#1f1f30;border-bottom:1px solid #2e2e40;cursor:pointer;user-select:none}
.ibr-gear-hdr .gt{font-size:15px;font-weight:700;color:#d4c8f0;flex:1}
.ibr-gear-hdr .arrow{font-size:11px;color:#8b8fa3;transition:transform .2s}
.ibr-gear-hdr.collapsed .arrow{transform:rotate(-90deg)}
.ibr-gear-body{padding:0}
.ibr-gear-body.hidden{display:none}
.ibr-gear-active{padding:8px 10px;display:flex;flex-direction:column;gap:6px}
.ibr-gear-item{display:flex;align-items:flex-start;gap:10px;padding:8px 10px;background:#16161e;border-radius:6px;border-left:3px solid #ff9800}
.ibr-gear-item .gi-icon{font-size:20px;flex-shrink:0}
.ibr-gear-item .gi-body{flex:1;min-width:0}
.ibr-gear-item .gi-label{font-size:13px;font-weight:600;color:#d4c8f0}
.ibr-gear-item .gi-curr{font-size:10px;color:#8b8fa3;margin-left:6px}
.ibr-gear-item .gi-rec{font-size:12px;font-weight:600;margin-top:2px}
.ibr-gear-item .gi-chars{font-size:10px;color:#8b8fa3;margin-top:2px}
.ibr-gear-maxed{padding:8px 14px;font-size:12px;color:#4caf50;background:#141e18;border-top:1px solid #1e2a20;line-height:1.6}

/* === Characters Section === */
.ibr-chars-section{background:#1a1a24;border:1px solid #2e2e40;border-radius:8px;margin-bottom:14px;overflow:hidden;scroll-margin-top:100px}
.ibr-chars-hdr{display:flex;align-items:center;gap:10px;padding:11px 16px;background:#1f1f30;border-bottom:1px solid #2e2e40;cursor:pointer;user-select:none}
.ibr-chars-hdr .ct{font-size:15px;font-weight:700;color:#d4c8f0;flex:1}
.ibr-chars-hdr .arrow{font-size:11px;color:#8b8fa3;transition:transform .2s}
.ibr-chars-hdr.collapsed .arrow{transform:rotate(-90deg)}
.ibr-chars-body{padding:10px}
.ibr-chars-body.hidden{display:none}
.ibr-char-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px}
.ibr-char{background:#16161e;border:1px solid #2e2e40;border-radius:6px;overflow:hidden}
.ibr-char-top{display:flex;align-items:flex-start;justify-content:space-between;padding:8px 12px;background:#1f1f30;border-bottom:1px solid #2e2e40}
.ibr-char-top .cn{font-size:13px;font-weight:600;color:#d4c8f0}
.ibr-char-top .cc{font-size:10px;color:#8b8fa3;margin-top:1px}
.ibr-char-top .cl{font-size:17px;font-weight:800;color:#b794f6}
.ibr-char-afk{font-size:10px;color:#8b8fa3;padding:4px 12px 2px}
.ibr-char-skills{display:flex;gap:3px;flex-wrap:wrap;padding:4px 12px 8px}
.ibr-char-skill{font-size:9px;background:#22223a;padding:1px 4px;border-radius:2px;color:#bbb;border:1px solid #2a2a3a}

/* === Loading & Error === */
.ibr-loading{text-align:center;padding:40px;color:#8b8fa3;font-size:14px}
.ibr-loading .spinner{width:32px;height:32px;border:3px solid #3a3a50;border-top-color:#b794f6;border-radius:50%;animation:ibr-spin .8s linear infinite;margin:0 auto 12px}
@keyframes ibr-spin{to{transform:rotate(360deg)}}
.ibr-error{background:#2a1a1a;border:1px solid #5a2a2a;color:#ef9a9a;border-radius:8px;padding:12px;font-size:13px}
</style>

<div class="ibr">

<div class="ibr-card">
  <h2>&#128269; Account Review</h2>
  <p class="ibr-sub">Upload your Idleon save JSON for a personalized analysis. Each review is private.</p>
</div>

<div id="ibrUploadSection">
  <div class="ibr-card">
    <h3>&#128228; Upload Your Save</h3>
    <p class="ibr-sub">Export from Idleon (Settings &#8594; Cloud &#8594; Copy to clipboard) or use an IdleonToolbox JSON export.</p>
    <div class="ibr-drop" id="ibrDropZone">
      <input type="file" accept=".json,.txt" id="ibrFileInput">
      <div class="icon">&#128193;</div>
      <div class="label">Drop your JSON file here or click to browse</div>
      <div class="hint">Accepts .json or .txt files</div>
    </div>
    <div style="text-align:center;margin:10px 0;color:#8b8fa3;font-size:12px">&#8212; or paste JSON directly &#8212;</div>
    <textarea id="ibrPasteArea" placeholder="Paste your Idleon JSON here..." style="width:100%;min-height:70px;background:#13131a;border:1px solid #2e2e40;border-radius:8px;padding:10px;color:#ccc;font-size:12px;font-family:monospace;resize:vertical;box-sizing:border-box"></textarea>
    <div style="display:flex;gap:10px;margin-top:10px;align-items:center">
      <button class="ibr-btn" onclick="ibrSubmit()">&#128269; Analyze Account</button>
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
      if(!d.canReanalyze) info += ' \u2014 next analysis in ' + d.cooldownMins + ' min';
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
    reader.onload = function(e){ pasteArea.value = e.target.result; document.getElementById('ibrStatus').textContent = 'File loaded: ' + file.name; };
    reader.readAsText(file);
  }

  window.ibrSubmit = function(){
    var raw = pasteArea.value.trim();
    if(!raw){ showError('Please paste or upload your JSON first.'); return; }
    var json;
    try{ json = JSON.parse(raw); } catch(e){ showError('Invalid JSON: ' + e.message); return; }
    if(!json.data || !json.charNames){ showError('This does not look like an Idleon save. Make sure it has "data" and "charNames" fields.'); return; }
    document.getElementById('ibrStatus').textContent = 'Analyzing\u2026';
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
      if(d.cooldownMins) info += ' \u2014 next analysis in ' + d.cooldownMins + ' min';
      if(d.message) info = d.message;
      if(info){ document.getElementById('ibrCacheInfo').textContent = info; document.getElementById('ibrCacheInfo').style.display = ''; }
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
    el.innerHTML = '<div class="ibr-error">\u274C ' + escH(msg) + '</div>';
    el.style.display = '';
    document.getElementById('ibrStatus').textContent = '';
  }
  function hideError(){ document.getElementById('ibrError').style.display = 'none'; }
  function escH(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  var tierColors = { early:'#4caf50', mid:'#2196f3', late:'#ff9800', endgame:'#e91e63', ultra:'#b794f6' };
  var worldLabels = { W1:'World 1', W2:'World 2', W3:'World 3', W4:'World 4', W5:'World 5', W6:'World 6', W7:'World 7', All:'Cross-World' };
  var worldIcons  = { W1:'\uD83C\uDF3F', W2:'\uD83C\uDFDC\uFE0F', W3:'\u2744\uFE0F', W4:'\uD83D\uDD2E', W5:'\uD83C\uDF0A', W6:'\u2B50', W7:'\uD83D\uDD25', All:'\uD83C\uDF0D' };
  var worldColors = { W1:'#4caf50', W2:'#ff9800', W3:'#2196f3', W4:'#9c27b0', W5:'#00bcd4', W6:'#ffc107', W7:'#f44336', All:'#b794f6' };

  function stars(n){ var s=''; for(var i=0;i<5;i++) s += i<n ? '\u2605' : '\u2606'; return s; }

  function parseTip(t){
    var prefixes = ['\u26A0\uFE0F','\uD83D\uDCA1','\uD83D\uDCCA','\u2B06\uFE0F','\uD83D\uDD04','\u2139\uFE0F','\u2705'];
    for(var i=0;i<prefixes.length;i++){ if(t.indexOf(prefixes[i])===0) return {icon:prefixes[i],text:t.substring(prefixes[i].length).trim()}; }
    return {icon:'\u25B8',text:t};
  }

  function renderResults(r){
    document.getElementById('ibrUploadSection').style.display = 'none';
    var el = document.getElementById('ibrResults');
    el.style.display = '';
    var tc = tierColors[r.tier] || '#ccc';
    var html = '';

    // ===== HEADER =====
    html += '<div class="ibr-header">';
    html += '<div class="ibr-header-top">';
    html += '<div class="h-title">\uD83D\uDD0D Account Review</div>';
    html += '<span class="h-tier" style="background:' + tc + '22;color:' + tc + ';border:1px solid ' + tc + '44">' + escH(r.tierLabel) + '</span>';
    html += '<div class="h-space"></div>';
    html += '<button class="ibr-btn-outline" id="ibrReanalyzeBtn" onclick="ibrReUpload()">\u21BB New Analysis</button>';
    html += '</div>';
    html += '<div id="ibrCacheInfo" class="ibr-cache-info" style="display:none"></div>';
    html += '<div class="ibr-kpi-row">';
    html += '<div class="ibr-kpi"><div class="val" style="color:' + tc + '">' + r.summary.avgScore.toFixed(1) + '</div><div class="lbl">Avg Score</div></div>';
    html += '<div class="ibr-kpi"><div class="val" style="color:#4caf50">' + r.summary.maxedCount + '</div><div class="lbl">Maxed</div></div>';
    html += '<div class="ibr-kpi"><div class="val" style="color:#f44336">' + r.summary.behindCount + '</div><div class="lbl">Behind</div></div>';
    html += '<div class="ibr-kpi"><div class="val" style="color:#2196f3">' + r.summary.totalSystems + '</div><div class="lbl">Systems</div></div>';
    html += '<div class="ibr-kpi"><div class="val" style="color:#b794f6">' + r.characterCount + '</div><div class="lbl">Chars</div></div>';
    if(r.accountAge !== null) html += '<div class="ibr-kpi"><div class="val" style="color:#ff9800">' + Math.floor(r.accountAge/365) + 'y</div><div class="lbl">Age</div></div>';
    html += '</div></div>';

    // ===== TOP PRIORITIES =====
    if(r.priorities && r.priorities.length > 0){
      html += '<div class="ibr-prio-bar">';
      html += '<div class="ibr-prio-bar-hdr" onclick="ibrTogglePrio(this)">';
      html += '<span style="font-size:16px">\uD83D\uDD25</span>';
      html += '<span class="pb-title">Top Priorities (' + r.priorities.length + ')</span>';
      html += '<span class="arrow">\u25BC</span>';
      html += '</div>';
      html += '<div class="ibr-prio-items">';
      for(var pi=0;pi<r.priorities.length;pi++){
        var p = r.priorities[pi];
        html += '<div class="ibr-prio-item' + (p.score <= 2 ? ' behind' : '') + '">';
        html += '<div class="ibr-prio-num">#' + (pi+1) + '</div>';
        html += '<div class="ibr-prio-body">';
        html += '<div class="ibr-prio-name">' + p.icon + ' ' + escH(p.system) + ' <span style="color:#8b8fa3;font-size:9px">' + escH(p.world) + '</span> <span style="font-size:11px">' + stars(p.score) + '</span></div>';
        html += '<div class="ibr-prio-reason">' + escH(p.reason) + '</div>';
        if(p.tips && p.tips.length > 0){
          html += '<ul class="ibr-prio-tips-list">';
          for(var pti=0;pti<Math.min(p.tips.length,3);pti++) html += '<li>' + escH(p.tips[pti]) + '</li>';
          html += '</ul>';
        }
        html += '</div></div>';
      }
      html += '</div></div>';
    }

    // ===== GROUP SYSTEMS BY WORLD =====
    var worldOrder = ['W1','W2','W3','W4','W5','W6','W7','All'];
    var byWorld = {};
    for(var wi=0;wi<worldOrder.length;wi++) byWorld[worldOrder[wi]] = [];
    for(var j=0;j<r.systems.length;j++){
      var wk = r.systems[j].world || 'All';
      if(!byWorld[wk]) byWorld[wk] = [];
      byWorld[wk].push(r.systems[j]);
    }

    // ===== STICKY NAV =====
    html += '<div class="ibr-nav" id="ibrNav">';
    for(var wi=0;wi<worldOrder.length;wi++){
      var wKey = worldOrder[wi];
      if(!byWorld[wKey] || byWorld[wKey].length === 0) continue;
      var wBehind = byWorld[wKey].filter(function(x){ return x.behind; }).length;
      var wlc = wKey.toLowerCase();
      html += '<a class="ibr-nav-pill ' + wlc + '" href="#ibr-' + wlc + '" onclick="ibrNavClick(this)">' + (worldIcons[wKey]||'') + ' ' + (worldLabels[wKey]||wKey);
      if(wBehind) html += ' <span style="opacity:.85;font-size:10px">(' + wBehind + '\u26A0)</span>';
      html += '</a>';
    }
    html += '<a class="ibr-nav-pill gear" href="#ibr-gear" onclick="ibrNavClick(this)">\uD83C\uDFAF Gear</a>';
    html += '<a class="ibr-nav-pill chars" href="#ibr-chars" onclick="ibrNavClick(this)">\uD83D\uDC65 Chars</a>';
    html += '</div>';

    // ===== SETTINGS =====
    html += '<div class="ibr-settings">';
    html += '<span>View:</span>';
    html += '<label class="ibr-toggle"><input type="checkbox" id="ibrHideMaxed" onchange="ibrToggleMaxed()"><span class="slider"></span> Hide maxed</label>';
    html += '<label class="ibr-toggle"><input type="checkbox" id="ibrShowTips" onchange="ibrToggleAllTips()"><span class="slider"></span> Expand all tips</label>';
    html += '</div>';

    // ===== WORLD SECTIONS =====
    for(var wi=0;wi<worldOrder.length;wi++){
      var wKey = worldOrder[wi];
      var ws = byWorld[wKey];
      if(!ws || ws.length === 0) continue;
      var wAvg = ws.reduce(function(a,b){ return a+b.score; },0)/ws.length;
      var wMaxed = ws.filter(function(x){ return x.score>=5; }).length;
      var wBehind = ws.filter(function(x){ return x.behind; }).length;
      var wColor = worldColors[wKey] || '#7c3aed';
      var wlc = wKey.toLowerCase();

      html += '<div class="ibr-world-section" id="ibr-' + wlc + '">';
      html += '<div class="ibr-world-hdr2" style="border-left-color:' + wColor + '" onclick="ibrToggleSection(this)">';
      html += '<span style="font-size:19px">' + (worldIcons[wKey]||'') + '</span>';
      html += '<span class="wn">' + (worldLabels[wKey]||wKey) + '</span>';
      html += '<div class="ws">';
      html += '<span>' + ws.length + ' systems</span>';
      html += '<span>avg ' + wAvg.toFixed(1) + '\u2605</span>';
      if(wMaxed) html += '<span class="maxed-badge">' + wMaxed + ' maxed</span>';
      if(wBehind) html += '<span class="behind-badge">' + wBehind + ' behind</span>';
      html += '</div>';
      html += '<span class="arrow">\u25BC</span>';
      html += '</div>';

      html += '<div class="ibr-world-grid">';
      for(var si=0;si<ws.length;si++){
        var sys = ws[si];
        var sc = tierColors[sys.systemTier] || '#ccc';
        var cls = 'ibr-sys';
        if(sys.behind) cls += ' behind';
        if(sys.score >= 5) cls += ' maxed';
        var hasTips = sys.tips && sys.tips.length > 0 && sys.score < 5;

        html += '<div class="' + cls + '" data-score="' + sys.score + '"' + (hasTips ? ' onclick="ibrToggleSysTips(this)"' : '') + '>';

        // Top row
        html += '<div class="ibr-sys-top">';
        html += '<span class="s-icon">' + sys.icon + '</span>';
        html += '<span class="s-name">' + escH(sys.label) + '</span>';
        html += '<span class="s-stars" style="color:' + sc + '">' + stars(sys.score) + '</span>';
        html += '<span class="s-tier" style="background:' + sc + '22;color:' + sc + '">' + escH(sys.systemTier) + '</span>';
        if(sys.behind) html += '<span style="font-size:12px">\u26A0\uFE0F</span>';
        html += '</div>';

        // Bar row
        html += '<div class="ibr-sys-meta">';
        html += '<div class="ibr-bar2"><div class="ibr-bar2-fill" style="width:' + (sys.score*20) + '%;background:' + sc + '"></div></div>';
        if(sys.benchAvg !== undefined && sys.benchSamples > 0){
          var diff = sys.score - sys.benchAvg;
          var dc = diff > 0 ? '#4caf50' : diff < 0 ? '#f44336' : '#8b8fa3';
          html += '<span class="bench" style="color:' + dc + '">' + (diff>0?'+':'') + diff.toFixed(1) + ' vs avg</span>';
        }
        html += '</div>';

        // Detail
        html += '<div class="ibr-sys-detail2">' + escH(sys.detail) + '</div>';

        // Tips (collapsible by clicking card)
        if(hasTips){
          html += '<ul class="ibr-sys-tips2 hidden">';
          for(var ti=0;ti<sys.tips.length;ti++){
            var tp = parseTip(sys.tips[ti]);
            html += '<li><span class="ti">' + tp.icon + '</span><span>' + escH(tp.text) + '</span></li>';
          }
          html += '</ul>';
          html += '<div class="ibr-sys-expand">\u25BC ' + sys.tips.length + ' tip' + (sys.tips.length>1?'s':'') + ' \u2014 click to expand</div>';
        }

        html += '</div>'; // close ibr-sys
      }

      html += '</div>'; // close world-grid
      html += '</div>'; // close world-section
    }

    // ===== GEAR SECTION =====
    html += '<div class="ibr-gear-section" id="ibr-gear">';
    html += '<div class="ibr-gear-hdr" onclick="ibrToggleSection(this)">';
    html += '<span style="font-size:18px">\uD83C\uDFAF</span>';
    html += '<span class="gt">Gear Progression</span>';
    if(r.gearRecommendations){
      var actG = r.gearRecommendations.filter(function(g){ return g.recommendation; });
      if(actG.length) html += '<span style="color:#ff9800;font-size:12px">' + actG.length + ' upgrade' + (actG.length>1?'s':'') + '</span>';
      else html += '<span style="color:#4caf50;font-size:12px">\u2705 Up to date</span>';
    }
    html += '<span class="arrow">\u25BC</span>';
    html += '</div>';
    html += '<div class="ibr-gear-body">';
    if(r.gearRecommendations && r.gearRecommendations.length > 0){
      var activeRecs = r.gearRecommendations.filter(function(gr){ return gr.recommendation; });
      var maxedRecs  = r.gearRecommendations.filter(function(gr){ return !gr.recommendation; });
      if(activeRecs.length > 0){
        html += '<div style="padding:8px 12px 4px;font-size:11px;font-weight:700;color:#ffb74d;text-transform:uppercase;letter-spacing:.5px">Upgrades Available</div>';
        html += '<div class="ibr-gear-active">';
        for(var gi=0;gi<activeRecs.length;gi++){
          var gr = activeRecs[gi];
          var gc = gr.status==='equip-all'?'#ff9800':gr.status==='next-tier'?'#2196f3':gr.status==='advice'?'#b794f6':'#4caf50';
          html += '<div class="ibr-gear-item" style="border-left-color:' + gc + '">';
          html += '<span class="gi-icon">' + gr.icon + '</span>';
          html += '<div class="gi-body">';
          html += '<div><span class="gi-label">' + escH(gr.label) + '</span>';
          if(gr.currentTier) html += '<span class="gi-curr">Current: ' + escH(gr.currentTier) + '</span>';
          html += '</div>';
          html += '<div class="gi-rec" style="color:' + gc + '">' + escH(gr.recommendation) + '</div>';
          if(gr.charsNeedingUpgrade && gr.charsNeedingUpgrade.length > 0) html += '<div class="gi-chars">Affects: ' + gr.charsNeedingUpgrade.map(function(n){ return escH(n); }).join(', ') + '</div>';
          html += '</div></div>';
        }
        html += '</div>';
      }
      if(maxedRecs.length > 0){
        html += '<div class="ibr-gear-maxed">\u2705 ' + maxedRecs.map(function(g){ return g.icon + ' ' + escH(g.label); }).join(' \u00B7 ') + '</div>';
      }
    } else {
      html += '<div style="padding:18px;font-size:13px;color:#8b8fa3;text-align:center">No gear data \u2014 upload a more detailed save for recommendations.</div>';
    }
    html += '</div></div>';

    // ===== CHARACTERS =====
    html += '<div class="ibr-chars-section" id="ibr-chars">';
    html += '<div class="ibr-chars-hdr" onclick="ibrToggleSection(this)">';
    html += '<span style="font-size:18px">\uD83D\uDC65</span>';
    html += '<span class="ct">Characters (' + r.characterCount + ')</span>';
    html += '<span class="arrow">\u25BC</span>';
    html += '</div>';
    html += '<div class="ibr-chars-body hidden">';
    html += '<div class="ibr-char-grid">';
    var skillNames = ['Lv','Min','Smi','Chp','Fsh','Alc','Cat','Trp','Con','Wor','Cok','Bre','Lab','Sai','Div','Gam','Far','Snk','Sum','Hol','W7'];
    for(var k=0;k<r.characters.length;k++){
      var ch = r.characters[k];
      html += '<div class="ibr-char">';
      html += '<div class="ibr-char-top">';
      html += '<div><div class="cn">' + escH(ch.name) + '</div><div class="cc">' + escH(ch.className) + '</div></div>';
      html += '<div class="cl">Lv ' + ch.level + '</div>';
      html += '</div>';
      html += '<div class="ibr-char-afk">AFK: W' + ch.afkWorld + ' \u00B7 ' + escH(ch.afkTarget) + '</div>';
      html += '<div class="ibr-char-skills">';
      for(var sk=1;sk<Math.min(ch.skills.length,skillNames.length);sk++){
        var sv = ch.skills[sk];
        if(typeof sv === 'number' && sv > 0) html += '<span class="ibr-char-skill">' + skillNames[sk] + ':' + sv + '</span>';
      }
      html += '</div></div>';
    }
    html += '</div></div></div>';

    el.innerHTML = html;
  }

  // Generic section toggle (works for world sections, gear, chars)
  window.ibrToggleSection = function(hdr){
    var body = hdr.nextElementSibling;
    if(!body) return;
    body.classList.toggle('hidden');
    hdr.classList.toggle('collapsed');
  };

  window.ibrTogglePrio = function(hdr){
    var body = hdr.nextElementSibling;
    if(!body) return;
    body.classList.toggle('hidden');
    hdr.classList.toggle('collapsed');
  };

  window.ibrToggleSysTips = function(card){
    var tips = card.querySelector('.ibr-sys-tips2');
    var expand = card.querySelector('.ibr-sys-expand');
    if(!tips) return;
    tips.classList.toggle('hidden');
    if(expand){
      var n = tips.querySelectorAll('li').length;
      expand.textContent = tips.classList.contains('hidden') ? '\u25BC ' + n + ' tip' + (n>1?'s':'') + ' \u2014 click to expand' : '\u25B2 collapse';
    }
  };

  window.ibrNavClick = function(pill){
    var pills = document.querySelectorAll('.ibr-nav-pill');
    for(var i=0;i<pills.length;i++) pills[i].classList.remove('active');
    pill.classList.add('active');
  };

  window.ibrToggleMaxed = function(){
    var hide = document.getElementById('ibrHideMaxed').checked;
    var cards = document.querySelectorAll('.ibr-sys[data-score]');
    for(var i=0;i<cards.length;i++){
      if(parseInt(cards[i].getAttribute('data-score')) >= 5) cards[i].style.display = hide ? 'none' : '';
    }
  };

  window.ibrToggleAllTips = function(){
    var show = document.getElementById('ibrShowTips').checked;
    var tipLists = document.querySelectorAll('.ibr-sys-tips2');
    var expandBtns = document.querySelectorAll('.ibr-sys-expand');
    for(var i=0;i<tipLists.length;i++){
      if(show) tipLists[i].classList.remove('hidden'); else tipLists[i].classList.add('hidden');
    }
    for(var i=0;i<expandBtns.length;i++){
      var n = expandBtns[i].parentNode.querySelectorAll('.ibr-sys-tips2 li').length;
      expandBtns[i].textContent = show ? '\u25B2 collapse' : '\u25BC ' + n + ' tip' + (n>1?'s':'') + ' \u2014 click to expand';
    }
  };

})();
</script>
`;
}
