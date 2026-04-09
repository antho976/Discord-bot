/**
 * Idleon Bot Review Tab — Dashboard Frontend
 * Allows users to upload their Idleon JSON save for per-user account analysis.
 * Each user gets their own review session (stored server-side by userId).
 */
export function renderIdleonBotReviewTab(userTier) {
  return `
<style>
.ibr-card{background:#17171b;border:1px solid #3a3a42;border-radius:10px;padding:16px;margin-bottom:12px}
.ibr-card h2{margin:0 0 6px;font-size:16px;color:#b794f6}.ibr-card h3{margin:0 0 8px;font-size:14px;color:#b794f6}
.ibr-sub{color:#8b8fa3;font-size:12px;margin:0 0 12px}
.ibr-drop{border:2px dashed #3a3a42;border-radius:12px;padding:40px 20px;text-align:center;cursor:pointer;transition:all .2s;background:#111116;position:relative}
.ibr-drop:hover,.ibr-drop.drag-over{border-color:#b794f6;background:#1a1a2e}
.ibr-drop input[type=file]{position:absolute;inset:0;opacity:0;cursor:pointer}
.ibr-drop .icon{font-size:36px;margin-bottom:8px}
.ibr-drop .label{font-size:14px;color:#ccc;font-weight:600}.ibr-drop .hint{font-size:11px;color:#8b8fa3;margin-top:6px}
.ibr-btn{background:#7c3aed;color:#fff;border:none;border-radius:8px;padding:8px 18px;font-size:13px;cursor:pointer;font-weight:600;transition:all .2s}
.ibr-btn:hover{background:#6d28d9}.ibr-btn:disabled{opacity:.5;cursor:not-allowed}
.ibr-btn-outline{background:none;border:1px solid #3a3a42;color:#ccc;border-radius:8px;padding:6px 14px;font-size:12px;cursor:pointer;transition:all .2s}
.ibr-btn-outline:hover{border-color:#b794f6;color:#b794f6}
.ibr-tier-badge{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:20px;font-weight:700;font-size:14px}
.ibr-kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin:12px 0}
.ibr-kpi{background:#111116;border:1px solid #23232b;border-radius:10px;padding:12px;text-align:center}
.ibr-kpi .val{font-size:22px;font-weight:800}.ibr-kpi .lbl{font-size:10px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.5px;margin-top:4px}
.ibr-sys-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px;margin-top:12px}
.ibr-sys{background:#111116;border:1px solid #23232b;border-radius:10px;padding:12px;transition:border-color .2s}
.ibr-sys:hover{border-color:#3a3a42}
.ibr-sys .hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
.ibr-sys .hdr .name{font-size:13px;font-weight:600;display:flex;align-items:center;gap:6px}
.ibr-sys .hdr .world{font-size:10px;color:#8b8fa3;background:#23232b;padding:2px 6px;border-radius:4px}
.ibr-sys .stars{font-size:16px;letter-spacing:2px}
.ibr-sys .detail{font-size:11px;color:#8b8fa3;margin-top:4px}
.ibr-sys .tier-tag{font-size:10px;padding:2px 6px;border-radius:4px;font-weight:600;margin-top:4px;display:inline-block}
.ibr-sys.behind{border-left:3px solid #f44336}
.ibr-prio{display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid #23232b}
.ibr-prio:last-child{border-bottom:none}
.ibr-prio .rank{font-size:18px;font-weight:800;color:#b794f6;min-width:28px}
.ibr-prio .info{flex:1}.ibr-prio .info .name{font-size:13px;font-weight:600;margin-bottom:2px}
.ibr-prio .info .reason{font-size:11px;color:#8b8fa3}
.ibr-char-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:8px;margin-top:10px}
.ibr-char{background:#111116;border:1px solid #23232b;border-radius:8px;padding:10px}
.ibr-char .name{font-size:13px;font-weight:600;color:#ccc}.ibr-char .cls{font-size:11px;color:#8b8fa3}
.ibr-char .lv{font-size:18px;font-weight:800;color:#b794f6;margin:4px 0}
.ibr-char .afk{font-size:10px;color:#8b8fa3}
.ibr-skills-bar{display:flex;gap:2px;margin-top:6px;flex-wrap:wrap}
.ibr-skill{font-size:9px;background:#23232b;padding:2px 4px;border-radius:3px;color:#aaa}
.ibr-loading{text-align:center;padding:40px;color:#8b8fa3}
.ibr-loading .spinner{width:32px;height:32px;border:3px solid #3a3a42;border-top-color:#b794f6;border-radius:50%;animation:ibr-spin .8s linear infinite;margin:0 auto 12px}
@keyframes ibr-spin{to{transform:rotate(360deg)}}
.ibr-error{background:#2a1a1a;border:1px solid #5a2a2a;color:#ef9a9a;border-radius:8px;padding:12px;font-size:13px}
.ibr-bar{height:6px;background:#23232b;border-radius:3px;overflow:hidden;margin-top:6px}
.ibr-bar-fill{height:100%;border-radius:3px;transition:width .5s}
.ibr-tips{margin-top:8px;padding:0;list-style:none}
.ibr-tips li{font-size:11px;color:#c9a0ff;padding:3px 0 3px 16px;position:relative;line-height:1.4}
.ibr-tips li::before{content:'💡';position:absolute;left:0;font-size:10px}
.ibr-sys .ibr-tips{border-top:1px solid #23232b;margin-top:8px;padding-top:6px}
</style>

<div class="ibr-card">
  <h2>🔍 Account Review</h2>
  <p class="ibr-sub">Upload your Idleon save JSON to get a personalized account analysis with scoring and priorities. Each person's review is private to them.</p>
</div>

<div id="ibrUploadSection">
  <div class="ibr-card">
    <h3>📤 Upload Your Save</h3>
    <p class="ibr-sub">Export your save from Idleon (Settings → Cloud → Copy to clipboard) or use your IdleonToolbox JSON export, then paste or upload it here.</p>
    <div class="ibr-drop" id="ibrDropZone">
      <input type="file" accept=".json,.txt" id="ibrFileInput">
      <div class="icon">📁</div>
      <div class="label">Drop your JSON file here or click to browse</div>
      <div class="hint">Accepts .json or .txt files</div>
    </div>
    <div style="text-align:center;margin:12px 0;color:#8b8fa3;font-size:12px">— or paste JSON directly —</div>
    <textarea id="ibrPasteArea" placeholder="Paste your Idleon JSON here..." style="width:100%;min-height:80px;background:#111116;border:1px solid #3a3a42;border-radius:8px;padding:10px;color:#ccc;font-size:12px;font-family:monospace;resize:vertical;box-sizing:border-box"></textarea>
    <div style="display:flex;gap:8px;margin-top:10px;align-items:center">
      <button class="ibr-btn" onclick="ibrSubmit()">🔍 Analyze Account</button>
      <span id="ibrStatus" style="font-size:12px;color:#8b8fa3"></span>
    </div>
    <div id="ibrError" style="margin-top:10px;display:none"></div>
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
  var ibrJsonData = null;

  // Drag & drop
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

  // Make submit available globally
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

    // === Header ===
    html += '<div class="ibr-card">';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">';
    html += '<div>';
    html += '<h2 style="margin:0">🔍 Account Review</h2>';
    html += '<p class="ibr-sub" style="margin:4px 0 0">Analysis of ' + r.characterCount + ' characters</p>';
    html += '</div>';
    html += '<div style="display:flex;align-items:center;gap:10px">';
    html += '<span class="ibr-tier-badge" style="background:' + tc + '22;color:' + tc + ';border:1px solid ' + tc + '44">' + escH(r.tierLabel) + '</span>';
    html += '<button class="ibr-btn-outline" onclick="ibrReUpload()">↻ New Upload</button>';
    html += '</div>';
    html += '</div>';

    // KPI row
    html += '<div class="ibr-kpi-grid">';
    html += '<div class="ibr-kpi"><div class="val" style="color:' + tc + '">' + r.summary.avgScore.toFixed(1) + '/5</div><div class="lbl">Avg Score</div></div>';
    html += '<div class="ibr-kpi"><div class="val" style="color:#4caf50">' + r.summary.maxedCount + '</div><div class="lbl">Systems Maxed</div></div>';
    html += '<div class="ibr-kpi"><div class="val" style="color:#f44336">' + r.summary.behindCount + '</div><div class="lbl">Behind Tier</div></div>';
    html += '<div class="ibr-kpi"><div class="val" style="color:#2196f3">' + r.summary.totalSystems + '</div><div class="lbl">Systems Tracked</div></div>';
    if(r.accountAge !== null) html += '<div class="ibr-kpi"><div class="val" style="color:#ff9800">' + Math.floor(r.accountAge/365) + 'y ' + (r.accountAge%365) + 'd</div><div class="lbl">Account Age</div></div>';
    html += '</div>';
    html += '</div>';

    // === Priorities ===
    if(r.priorities && r.priorities.length > 0){
      html += '<div class="ibr-card">';
      html += '<h3>🔥 Top Priorities</h3>';
      html += '<p class="ibr-sub">Systems that need the most attention for your tier.</p>';
      for(var i=0;i<r.priorities.length;i++){
        var p = r.priorities[i];
        html += '<div class="ibr-prio">';
        html += '<div class="rank">#' + (i+1) + '</div>';
        html += '<div class="info">';
        html += '<div class="name">' + p.icon + ' ' + escH(p.system) + ' <span style="color:#8b8fa3;font-size:10px">' + p.world + '</span></div>';
        html += '<div class="reason">' + escH(p.reason) + '</div>';
        html += '<div style="margin-top:4px">' + stars(p.score) + '</div>';
        if(p.tips && p.tips.length > 0){
          html += '<ul class="ibr-tips">';
          for(var ti=0;ti<p.tips.length;ti++) html += '<li>' + escH(p.tips[ti]) + '</li>';
          html += '</ul>';
        }
        html += '</div>';
        html += '</div>';
      }
      html += '</div>';
    }

    // === All Systems ===
    html += '<div class="ibr-card">';
    html += '<h3>📊 System Scores</h3>';
    html += '<p class="ibr-sub">Detailed scoring for every tracked system.</p>';
    html += '<div class="ibr-sys-grid">';
    for(var j=0;j<r.systems.length;j++){
      var s = r.systems[j];
      var sc = tierColors[s.systemTier] || '#ccc';
      html += '<div class="ibr-sys' + (s.behind ? ' behind' : '') + '">';
      html += '<div class="hdr">';
      html += '<span class="name">' + s.icon + ' ' + escH(s.label) + '</span>';
      html += '<span class="world">' + s.world + '</span>';
      html += '</div>';
      html += '<div class="stars">' + stars(s.score) + '</div>';
      html += '<div class="ibr-bar"><div class="ibr-bar-fill" style="width:' + (s.score*20) + '%;background:' + sc + '"></div></div>';
      html += '<div class="detail">' + escH(s.detail) + '</div>';
      html += '<span class="tier-tag" style="background:' + sc + '22;color:' + sc + '">' + escH(s.systemTier) + '</span>';
      if(s.behind) html += ' <span style="color:#f44336;font-size:10px">⚠ behind your tier</span>';
      if(s.tips && s.tips.length > 0){
        html += '<ul class="ibr-tips">';
        for(var ti=0;ti<s.tips.length;ti++) html += '<li>' + escH(s.tips[ti]) + '</li>';
        html += '</ul>';
      }
      html += '</div>';
    }
    html += '</div>';
    html += '</div>';

    // === Characters ===
    html += '<div class="ibr-card">';
    html += '<h3>👥 Characters</h3>';
    html += '<p class="ibr-sub">Overview of all characters in this account.</p>';
    html += '<div class="ibr-char-grid">';
    var skillNames = ['Lv','Min','Smi','Chp','Fsh','Alc','Cat','Trp','Con','Wor','Cok','Bre','Lab','Sai','Div','Gam','Far','Snk','Sum','Hol','W7'];
    for(var k=0;k<r.characters.length;k++){
      var c = r.characters[k];
      html += '<div class="ibr-char">';
      html += '<div style="display:flex;justify-content:space-between;align-items:flex-start">';
      html += '<div><div class="name">' + escH(c.name) + '</div><div class="cls">' + escH(c.className) + '</div></div>';
      html += '<div class="lv">Lv ' + c.level + '</div>';
      html += '</div>';
      html += '<div class="afk">AFK: ' + escH(c.afkTarget) + ' (W' + c.afkWorld + ')</div>';
      // Top skills
      html += '<div class="ibr-skills-bar">';
      for(var si=1;si<Math.min(c.skills.length, skillNames.length);si++){
        var sv = c.skills[si];
        if(typeof sv === 'number' && sv > 0){
          html += '<span class="ibr-skill">' + skillNames[si] + ':' + sv + '</span>';
        }
      }
      html += '</div>';
      html += '</div>';
    }
    html += '</div>';
    html += '</div>';

    el.innerHTML = html;
  }
})();
</script>
`;
}
