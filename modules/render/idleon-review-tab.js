/**
 * Idleon Bot Review Tab — Dashboard Frontend v2
 * Compact design with world-separated sections and hide-maxed toggle.
 */
export function renderIdleonBotReviewTab(userTier) {
  return `
<style>
.ibr-card{background:#17171b;border:1px solid #3a3a42;border-radius:10px;padding:14px;margin-bottom:10px}
.ibr-card h2{margin:0 0 4px;font-size:15px;color:#b794f6}.ibr-card h3{margin:0 0 6px;font-size:13px;color:#b794f6}
.ibr-sub{color:#8b8fa3;font-size:11px;margin:0 0 10px}
.ibr-drop{border:2px dashed #3a3a42;border-radius:10px;padding:30px 16px;text-align:center;cursor:pointer;transition:all .2s;background:#111116;position:relative}
.ibr-drop:hover,.ibr-drop.drag-over{border-color:#b794f6;background:#1a1a2e}
.ibr-drop input[type=file]{position:absolute;inset:0;opacity:0;cursor:pointer}
.ibr-drop .icon{font-size:28px;margin-bottom:6px}
.ibr-drop .label{font-size:13px;color:#ccc;font-weight:600}.ibr-drop .hint{font-size:10px;color:#8b8fa3;margin-top:4px}
.ibr-btn{background:#7c3aed;color:#fff;border:none;border-radius:8px;padding:7px 16px;font-size:12px;cursor:pointer;font-weight:600;transition:all .2s}
.ibr-btn:hover{background:#6d28d9}.ibr-btn:disabled{opacity:.5;cursor:not-allowed}
.ibr-btn-outline{background:none;border:1px solid #3a3a42;color:#ccc;border-radius:6px;padding:5px 12px;font-size:11px;cursor:pointer;transition:all .2s}
.ibr-btn-outline:hover{border-color:#b794f6;color:#b794f6}
.ibr-tier-badge{display:inline-flex;align-items:center;gap:5px;padding:4px 12px;border-radius:16px;font-weight:700;font-size:13px}
.ibr-kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:6px;margin:8px 0}
.ibr-kpi{background:#111116;border:1px solid #23232b;border-radius:8px;padding:8px;text-align:center}
.ibr-kpi .val{font-size:18px;font-weight:800}.ibr-kpi .lbl{font-size:9px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.4px;margin-top:2px}
.ibr-world-section{margin-bottom:8px}
.ibr-world-hdr{display:flex;align-items:center;gap:8px;padding:6px 10px;background:#111116;border:1px solid #23232b;border-radius:8px;cursor:pointer;user-select:none;margin-bottom:6px;transition:border-color .2s}
.ibr-world-hdr:hover{border-color:#3a3a42}
.ibr-world-hdr .wname{font-size:13px;font-weight:700;color:#ccc;flex:1}
.ibr-world-hdr .wstats{font-size:10px;color:#8b8fa3}
.ibr-world-hdr .warrow{font-size:12px;color:#8b8fa3;transition:transform .2s}
.ibr-world-hdr.collapsed .warrow{transform:rotate(-90deg)}
.ibr-world-body{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:6px}
.ibr-world-body.hidden{display:none}
.ibr-sys{background:#111116;border:1px solid #23232b;border-radius:8px;padding:8px 10px;transition:border-color .2s}
.ibr-sys:hover{border-color:#3a3a42}
.ibr-sys .hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:3px}
.ibr-sys .hdr .name{font-size:12px;font-weight:600;display:flex;align-items:center;gap:4px}
.ibr-sys .stars{font-size:13px;letter-spacing:1px}
.ibr-sys .detail{font-size:10px;color:#8b8fa3;margin-top:2px;line-height:1.3}
.ibr-sys .tier-tag{font-size:9px;padding:1px 5px;border-radius:3px;font-weight:600;display:inline-block;margin-top:2px}
.ibr-sys.behind{border-left:3px solid #f44336}
.ibr-sys.maxed-sys{border-left:3px solid #4caf50}
.ibr-prio{display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:1px solid #23232b}
.ibr-prio:last-child{border-bottom:none}
.ibr-prio .rank{font-size:16px;font-weight:800;color:#b794f6;min-width:24px}
.ibr-prio .info{flex:1}.ibr-prio .info .name{font-size:12px;font-weight:600;margin-bottom:2px}
.ibr-prio .info .reason{font-size:10px;color:#8b8fa3}
.ibr-char-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:6px;margin-top:8px}
.ibr-char{background:#111116;border:1px solid #23232b;border-radius:6px;padding:8px}
.ibr-char .name{font-size:12px;font-weight:600;color:#ccc}.ibr-char .cls{font-size:10px;color:#8b8fa3}
.ibr-char .lv{font-size:16px;font-weight:800;color:#b794f6;margin:2px 0}
.ibr-char .afk{font-size:9px;color:#8b8fa3}
.ibr-equip-row{display:flex;gap:4px;margin-top:6px;flex-wrap:wrap}
.ibr-equip-item{position:relative;width:32px;height:32px;background:#23232b;border:1px solid #3a3a42;border-radius:4px;overflow:hidden}
.ibr-equip-item img{width:100%;height:100%;object-fit:contain;image-rendering:pixelated}
.ibr-equip-item .slot-label{position:absolute;bottom:0;left:0;right:0;font-size:6px;text-align:center;background:rgba(0,0,0,.7);color:#8b8fa3;line-height:1;padding:1px 0}
.ibr-equip-section{margin-top:4px}
.ibr-equip-section .sect-title{font-size:9px;color:#8b8fa3;margin-bottom:2px;text-transform:uppercase;letter-spacing:.3px}
.ibr-skills-bar{display:flex;gap:2px;margin-top:4px;flex-wrap:wrap}
.ibr-skill{font-size:8px;background:#23232b;padding:1px 3px;border-radius:2px;color:#aaa}
.ibr-loading{text-align:center;padding:30px;color:#8b8fa3}
.ibr-loading .spinner{width:28px;height:28px;border:3px solid #3a3a42;border-top-color:#b794f6;border-radius:50%;animation:ibr-spin .8s linear infinite;margin:0 auto 10px}
@keyframes ibr-spin{to{transform:rotate(360deg)}}
.ibr-error{background:#2a1a1a;border:1px solid #5a2a2a;color:#ef9a9a;border-radius:8px;padding:10px;font-size:12px}
.ibr-bar{height:4px;background:#23232b;border-radius:2px;overflow:hidden;margin-top:4px}
.ibr-bar-fill{height:100%;border-radius:2px;transition:width .5s}
.ibr-tips{margin-top:4px;padding:0;list-style:none}
.ibr-tips li{font-size:10px;color:#c9a0ff;padding:2px 0 2px 14px;position:relative;line-height:1.3}
.ibr-tips li::before{content:'💡';position:absolute;left:0;font-size:9px}
.ibr-sys .ibr-tips{border-top:1px solid #23232b;margin-top:4px;padding-top:4px}
.ibr-settings{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:8px}
.ibr-toggle{display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;color:#ccc;user-select:none}
.ibr-toggle input{display:none}
.ibr-toggle .slider{width:32px;height:18px;background:#3a3a42;border-radius:9px;position:relative;transition:background .2s}
.ibr-toggle .slider::after{content:'';position:absolute;top:2px;left:2px;width:14px;height:14px;background:#888;border-radius:50%;transition:all .2s}
.ibr-toggle input:checked+.slider{background:#7c3aed}
.ibr-toggle input:checked+.slider::after{left:16px;background:#fff}
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
    <textarea id="ibrPasteArea" placeholder="Paste your Idleon JSON here..." style="width:100%;min-height:60px;background:#111116;border:1px solid #3a3a42;border-radius:8px;padding:8px;color:#ccc;font-size:11px;font-family:monospace;resize:vertical;box-sizing:border-box"></textarea>
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
    el.innerHTML = '<div class="ibr-error">❌ ' + escH(msg) + '</div>';
    el.style.display = '';
    document.getElementById('ibrStatus').textContent = '';
  }
  function hideError(){ document.getElementById('ibrError').style.display = 'none'; }
  function escH(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  var tierColors = { early:'#4caf50', mid:'#2196f3', late:'#ff9800', endgame:'#e91e63', ultra:'#b794f6' };
  var worldLabels = { W1:'World 1', W2:'World 2', W3:'World 3', W4:'World 4', W5:'World 5', W6:'World 6', W7:'World 7', All:'Cross-World' };

  function stars(n){
    var s = '';
    for(var i=0;i<5;i++) s += i < n ? '⭐' : '☆';
    return s;
  }

  function renderResults(r){
    document.getElementById('ibrUploadSection').style.display = 'none';
    var el = document.getElementById('ibrResults');
    el.style.display = '';
    var tc = tierColors[r.tier] || '#ccc';

    var html = '';

    // === Header card ===
    html += '<div class="ibr-card">';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">';
    html += '<div>';
    html += '<h2 style="margin:0">🔍 Account Review</h2>';
    html += '<p class="ibr-sub" style="margin:2px 0 0">' + r.characterCount + ' characters</p>';
    html += '</div>';
    html += '<div style="display:flex;align-items:center;gap:8px">';
    html += '<span class="ibr-tier-badge" style="background:' + tc + '22;color:' + tc + ';border:1px solid ' + tc + '44">' + escH(r.tierLabel) + '</span>';
    html += '<button class="ibr-btn-outline" id="ibrReanalyzeBtn" onclick="ibrReUpload()">↻ New Analysis</button>';
    html += '</div></div>';
    html += '<div id="ibrCacheInfo" style="display:none;font-size:10px;color:#8b8fa3;margin-top:4px"></div>';

    // KPI row
    html += '<div class="ibr-kpi-grid">';
    html += '<div class="ibr-kpi"><div class="val" style="color:' + tc + '">' + r.summary.avgScore.toFixed(1) + '</div><div class="lbl">Avg Score</div></div>';
    html += '<div class="ibr-kpi"><div class="val" style="color:#4caf50">' + r.summary.maxedCount + '</div><div class="lbl">Maxed</div></div>';
    html += '<div class="ibr-kpi"><div class="val" style="color:#f44336">' + r.summary.behindCount + '</div><div class="lbl">Behind</div></div>';
    html += '<div class="ibr-kpi"><div class="val" style="color:#2196f3">' + r.summary.totalSystems + '</div><div class="lbl">Total</div></div>';
    if(r.accountAge !== null) html += '<div class="ibr-kpi"><div class="val" style="color:#ff9800">' + Math.floor(r.accountAge/365) + 'y</div><div class="lbl">Age</div></div>';
    if(r.benchmarkSampleCount !== undefined) html += '<div class="ibr-kpi"><div class="val" style="color:#b794f6">' + r.benchmarkSampleCount + '</div><div class="lbl">Accounts in Tier</div></div>';
    html += '</div></div>';

    // === Settings bar ===
    html += '<div class="ibr-settings">';
    html += '<label class="ibr-toggle"><input type="checkbox" id="ibrHideMaxed" onchange="ibrToggleMaxed()"><span class="slider"></span> Hide maxed (5★)</label>';
    html += '</div>';

    // === Gear Progression Recommendations ===
    if(r.gearRecommendations && r.gearRecommendations.length > 0){
      var activeRecs = r.gearRecommendations.filter(function(gr){ return gr.recommendation; });
      var maxedRecs = r.gearRecommendations.filter(function(gr){ return !gr.recommendation; });
      html += '<div class="ibr-card">';
      html += '<div class="ibr-world-hdr" onclick="ibrToggleWorld(this)">';
      html += '<span class="wname">🎯 Gear Progression (' + activeRecs.length + ' upgrades available)</span>';
      html += '<span class="warrow">▼</span>';
      html += '</div>';
      html += '<div class="ibr-world-body" style="display:block">';
      if(activeRecs.length > 0){
        for(var gi=0;gi<activeRecs.length;gi++){
          var gr = activeRecs[gi];
          var statusColor = gr.status === 'equip-all' ? '#ff9800' : gr.status === 'next-tier' ? '#2196f3' : gr.status === 'advice' ? '#b794f6' : '#4caf50';
          html += '<div style="display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:1px solid #23232b">';
          html += '<span style="font-size:18px">' + gr.icon + '</span>';
          html += '<div style="flex:1">';
          html += '<div style="font-size:12px;font-weight:600;color:#ccc">' + escH(gr.label);
          if(gr.currentTier) html += ' <span style="font-size:9px;color:#8b8fa3">Current: ' + escH(gr.currentTier) + '</span>';
          html += '</div>';
          html += '<div style="font-size:11px;color:' + statusColor + ';margin-top:2px;font-weight:600">' + escH(gr.recommendation) + '</div>';
          if(gr.charsNeedingUpgrade && gr.charsNeedingUpgrade.length > 0){
            html += '<div style="font-size:9px;color:#8b8fa3;margin-top:2px">Missing: ' + gr.charsNeedingUpgrade.map(function(n){return escH(n)}).join(', ') + '</div>';
          }
          html += '</div></div>';
        }
      }
      if(maxedRecs.length > 0){
        html += '<div style="margin-top:6px;font-size:10px;color:#4caf50">';
        html += '✅ Maxed: ' + maxedRecs.map(function(gr){return gr.icon + ' ' + escH(gr.label)}).join(' · ');
        html += '</div>';
      }
      html += '</div></div>';
    }

    // === Build priorities into separate variable ===
    var prioHtml = '';
    if(r.priorities && r.priorities.length > 0){
      prioHtml += '<div class="ibr-card" style="position:sticky;top:64px">';
      prioHtml += '<h3>🔥 Top Priorities</h3>';
      for(var i=0;i<r.priorities.length;i++){
        var p = r.priorities[i];
        prioHtml += '<div class="ibr-prio">';
        prioHtml += '<div class="rank">#' + (i+1) + '</div>';
        prioHtml += '<div class="info">';
        prioHtml += '<div class="name">' + p.icon + ' ' + escH(p.system) + ' <span style="color:#8b8fa3;font-size:9px">' + p.world + '</span> ' + stars(p.score) + '</div>';
        prioHtml += '<div class="reason">' + escH(p.reason) + '</div>';
        if(p.tips && p.tips.length > 0){
          prioHtml += '<ul class="ibr-tips">';
          for(var ti=0;ti<p.tips.length;ti++) prioHtml += '<li>' + escH(p.tips[ti]) + '</li>';
          prioHtml += '</ul>';
        }
        prioHtml += '</div></div>';
      }
      prioHtml += '</div>';
    }

    // === Split layout: Systems (left) + Priorities (right sidebar) ===
    html += '<div class="layout-split-wide">';
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

    html += '<div class="ibr-card">';
    html += '<h3>📊 All Systems</h3>';

    for(var w=0;w<worldOrder.length;w++){
      var wKey = worldOrder[w];
      var ws = byWorld[wKey];
      if(!ws || ws.length === 0) continue;
      var wAvg = ws.reduce(function(a,b){ return a + b.score; }, 0) / ws.length;
      var wMaxed = ws.filter(function(x){ return x.score >= 5; }).length;

      html += '<div class="ibr-world-section" data-world="' + wKey + '">';
      html += '<div class="ibr-world-hdr" onclick="ibrToggleWorld(this)">';
      html += '<span class="wname">' + (worldLabels[wKey] || wKey) + '</span>';
      html += '<span class="wstats">' + wMaxed + '/' + ws.length + ' maxed · avg ' + wAvg.toFixed(1) + '</span>';
      html += '<span class="warrow">▼</span>';
      html += '</div>';
      html += '<div class="ibr-world-body">';

      for(var si=0;si<ws.length;si++){
        var sys = ws[si];
        var sc = tierColors[sys.systemTier] || '#ccc';
        var cls = 'ibr-sys';
        if(sys.behind) cls += ' behind';
        if(sys.score >= 5) cls += ' maxed-sys';
        html += '<div class="' + cls + '" data-score="' + sys.score + '">';
        html += '<div class="hdr">';
        html += '<span class="name">' + sys.icon + ' ' + escH(sys.label) + '</span>';
        html += '<span class="stars">' + stars(sys.score) + '</span>';
        html += '</div>';
        html += '<div class="ibr-bar"><div class="ibr-bar-fill" style="width:' + (sys.score*20) + '%;background:' + sc + '"></div></div>';
        html += '<div class="detail">' + escH(sys.detail) + '</div>';
        html += '<span class="tier-tag" style="background:' + sc + '22;color:' + sc + '">' + escH(sys.systemTier) + '</span>';
        if(sys.behind) html += ' <span style="color:#f44336;font-size:9px">⚠ behind</span>';
        // Benchmark comparison
        if(sys.benchAvg !== undefined && sys.benchSamples > 0){
          var diff = sys.score - sys.benchAvg;
          var diffColor = diff > 0 ? '#4caf50' : diff < 0 ? '#f44336' : '#8b8fa3';
          var diffSign = diff > 0 ? '+' : '';
          html += ' <span style="font-size:9px;color:' + diffColor + '" title="vs ' + sys.benchSamples + ' accounts in your tier">';
          html += diffSign + diff.toFixed(1) + ' vs avg';
          html += '</span>';
        }
        if(sys.tips && sys.tips.length > 0 && sys.score < 5){
          html += '<ul class="ibr-tips">';
          for(var ti=0;ti<sys.tips.length;ti++) html += '<li>' + escH(sys.tips[ti]) + '</li>';
          html += '</ul>';
        }
        if(sys.breakdown && sys.breakdown.sources){
          html += '<div class="ibr-breakdown" style="margin-top:4px;padding:4px 6px;background:#0d0d12;border-radius:4px;font-size:10px;color:#8b8fa3">';
          var srcKeys = Object.keys(sys.breakdown.sources);
          for(var bi=0;bi<srcKeys.length;bi++){
            var bk = srcKeys[bi], bv = sys.breakdown.sources[bk];
            if(bv > 0) html += '<span style="margin-right:8px">' + escH(bk) + ': <b style="color:#ccc">' + bv + '</b></span>';
          }
          if(sys.breakdown.prismaMulti) html += '<div style="margin-top:2px;color:#b794f6;font-weight:600">Multi: ' + sys.breakdown.prismaMulti.toFixed(2) + 'x</div>';
          if(sys.breakdown.exaltedTotal) html += '<div style="margin-top:2px;color:#b794f6;font-weight:600">Total: ' + sys.breakdown.exaltedTotal + '%</div>';
          html += '</div>';
        }
        html += '</div>';
      }
      html += '</div></div>';
    }
    html += '</div>';
    html += '</div>'; // close left column
    html += '<div>' + prioHtml + '</div>'; // right sidebar: priorities
    html += '</div>'; // close layout-split-wide

    // === Characters (collapsed by default) ===
    html += '<div class="ibr-card">';
    html += '<div class="ibr-world-hdr" onclick="ibrToggleWorld(this)" style="margin-bottom:0">';
    html += '<span class="wname">👥 Characters (' + r.characters.length + ')</span>';
    html += '<span class="warrow">▼</span>';
    html += '</div>';
    html += '<div class="ibr-world-body hidden ibr-char-grid" style="margin-top:6px">';
    var skillNames = ['Lv','Min','Smi','Chp','Fsh','Alc','Cat','Trp','Con','Wor','Cok','Bre','Lab','Sai','Div','Gam','Far','Snk','Sum','Hol','W7'];
    for(var k=0;k<r.characters.length;k++){
      var c = r.characters[k];
      html += '<div class="ibr-char">';
      html += '<div style="display:flex;justify-content:space-between;align-items:flex-start">';
      html += '<div><div class="name">' + escH(c.name) + '</div><div class="cls">' + escH(c.className) + '</div></div>';
      html += '<div class="lv">Lv ' + c.level + '</div>';
      html += '</div>';
      html += '<div class="afk">AFK: ' + escH(c.afkTarget) + ' (W' + c.afkWorld + ')</div>';
      if(c.equipment){
        var imgBase = 'https://idleontoolbox.com/data/';
        if(c.equipment.armor && c.equipment.armor.length > 0){
          html += '<div class="ibr-equip-section"><div class="sect-title">⚔️ Armor</div><div class="ibr-equip-row">';
          for(var ei=0;ei<c.equipment.armor.length;ei++){
            var eq = c.equipment.armor[ei];
            html += '<div class="ibr-equip-item" title="' + escH(eq.slot) + ': ' + escH(eq.rawName.replace(/_/g,' ')) + '">';
            html += '<img src="' + imgBase + escH(eq.rawName) + '.png" alt="' + escH(eq.rawName) + '" onerror="this.style.display=\x27none\x27">';
            html += '<div class="slot-label">' + escH(eq.slot.substring(0,4)) + '</div>';
            html += '</div>';
          }
          html += '</div></div>';
        }
        if(c.equipment.tools && c.equipment.tools.length > 0){
          html += '<div class="ibr-equip-section"><div class="sect-title">🔧 Tools</div><div class="ibr-equip-row">';
          for(var ti2=0;ti2<c.equipment.tools.length;ti2++){
            var tl = c.equipment.tools[ti2];
            html += '<div class="ibr-equip-item" title="' + escH(tl.slot) + ': ' + escH(tl.rawName.replace(/_/g,' ')) + '">';
            html += '<img src="' + imgBase + escH(tl.rawName) + '.png" alt="' + escH(tl.rawName) + '" onerror="this.style.display=\x27none\x27">';
            html += '<div class="slot-label">' + escH(tl.slot.substring(0,4)) + '</div>';
            html += '</div>';
          }
          html += '</div></div>';
        }
      }
      html += '<div class="ibr-skills-bar">';
      for(var si2=1;si2<Math.min(c.skills.length, skillNames.length);si2++){
        var sv2 = c.skills[si2];
        if(typeof sv2 === 'number' && sv2 > 0) html += '<span class="ibr-skill">' + skillNames[si2] + ':' + sv2 + '</span>';
      }
      html += '</div></div>';
    }
    html += '</div></div>';

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
