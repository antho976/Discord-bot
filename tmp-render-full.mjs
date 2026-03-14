
function _sbStyles() {
  return `<style>
  .sb-toggle{display:flex;align-items:center;gap:12px;margin-bottom:16px}
  .sb-toggle label{font-weight:600;font-size:15px}
  .sb-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;margin-bottom:20px}
  .sb-field{display:flex;flex-direction:column;gap:4px}
  .sb-field label{font-size:13px;opacity:.7;font-weight:500}
  .sb-field input,.sb-field select,.sb-field textarea{background:#1a1a2e;border:1px solid #333;border-radius:6px;padding:8px 10px;color:#e0e0e0;font-size:14px}
  .sb-field textarea{min-height:60px;resize:vertical}
  .sb-stat{background:#1a1a2e;border-radius:8px;padding:14px;text-align:center}
  .sb-stat .val{font-size:24px;font-weight:700;color:#9146ff}
  .sb-stat .lbl{font-size:12px;opacity:.6;margin-top:2px}
  .sb-section{margin-top:20px}
  .sb-section h3{margin-bottom:12px;font-size:16px}
  .sb-save-btn{background:#9146ff;color:#fff;border:none;border-radius:6px;padding:10px 24px;font-size:14px;font-weight:600;cursor:pointer;margin-top:12px}
  .sb-save-btn:hover{background:#7c3aed}
  .sb-custom-row{display:flex;gap:8px;align-items:center;margin-bottom:8px;background:#1a1a2e;padding:8px 12px;border-radius:6px}
  .sb-custom-row .key{font-weight:600;min-width:100px}
  .sb-custom-row .patterns{opacity:.6;font-size:12px;flex:1}
  .sb-custom-row .del-btn{background:#e74c3c;color:#fff;border:none;border-radius:4px;padding:4px 10px;cursor:pointer;font-size:12px}
  .sb-toast{position:fixed;bottom:24px;right:24px;background:#22c55e;color:#fff;padding:12px 20px;border-radius:8px;font-weight:600;z-index:9999;display:none}
  .sb-table{width:100%;border-collapse:collapse;margin-top:12px}
  .sb-table th,.sb-table td{padding:8px 12px;text-align:left;border-bottom:1px solid #333;font-size:13px}
  .sb-table th{opacity:.6;font-size:11px;text-transform:uppercase;letter-spacing:0.5px}
  .sb-table tr:hover{background:#ffffff08}
  .sb-badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600}
  .sb-progress{height:6px;background:#333;border-radius:3px;overflow:hidden;margin-top:4px}
  .sb-progress-bar{height:100%;background:#9146ff;border-radius:3px;transition:width .3s}
</style>`;
}
function _sbToastScript() {
  return `<div class="sb-toast" id="sb-toast">Saved!</div>
<script>
function sbToast(msg){
  var t=document.getElementById('sb-toast');
  t.textContent=msg||'Saved!';
  t.style.display='block';
  setTimeout(function(){t.style.display='none';},2000);
}
function renderSmartBotTrainingTab(smartBot) {
  const stats = smartBot._trainingStats || { totalSessions: 0, approved: 0, rejected: 0 };
  const approvalRate = stats.totalSessions > 0 ? Math.round((stats.approved / stats.totalSessions) * 100) : 0;
  const pairsCount = smartBot.trainedPairs?.size || 0;
  return `
${_sbStyles()}
${_sbToastScript()}
<style>
.tr-pair{background:#1a1a2e;border-radius:8px;padding:10px 14px;margin-bottom:8px;border-left:3px solid #9146ff;position:relative}
.tr-pair .tr-del{position:absolute;top:8px;right:8px;background:#ef5350;border:0;color:#fff;border-radius:4px;padding:2px 8px;cursor:pointer;font-size:11px;opacity:.7}
.tr-pair .tr-del:hover{opacity:1}
.tr-pair-q{color:#3498db;font-size:13px;margin-bottom:4px}
.tr-pair-a{color:#b0b0c0;font-size:13px}
.tr-pair-meta{font-size:10px;color:#555;margin-top:4px}
.tr-batch-item{background:#12121e;border-radius:8px;padding:14px;margin-bottom:10px;border:1px solid #222}
.tr-batch-item.rated-good{border-color:#22c55e;opacity:.7}
.tr-batch-item.rated-bad{border-color:#ef5350;opacity:.7}
.tr-batch-btns{display:flex;gap:8px;margin-top:10px}
.tr-batch-btns button{padding:6px 14px;border:0;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;color:#fff}
.tr-correction{margin-top:8px;display:none}
.tr-correction textarea{width:100%;background:#0d0d1a;border:1px solid #333;color:#e0e0e0;border-radius:6px;padding:8px;font-size:13px;resize:vertical;min-height:50px}
.tr-mode-btns{display:flex;gap:8px;margin-bottom:16px}
.tr-mode-btn{padding:10px 20px;border:2px solid #333;border-radius:8px;background:transparent;color:#e0e0e0;cursor:pointer;font-size:14px;font-weight:600;transition:all .2s}
.tr-mode-btn.active{border-color:#9146ff;background:#9146ff22;color:#fff}
.tr-mode-btn:hover{border-color:#9146ff}
.tr-kbd{display:inline-block;background:#222;border:1px solid #444;border-radius:4px;padding:1px 6px;font-size:10px;font-family:monospace;color:#aaa;margin-left:4px}
.tr-import-area{width:100%;min-height:120px;background:#0d0d1a;border:1px solid #333;color:#e0e0e0;border-radius:8px;padding:10px;font-size:12px;font-family:monospace;resize:vertical}
</style>

<div class="card">
  <h2 style="margin:0 0 4px">🏋️ SmartBot Training</h2>
  <p style="opacity:.6;margin-bottom:16px;font-size:13px">Train the bot with curated response pairs. Approve good replies, correct bad ones, and build a response library that bypasses AI entirely.</p>
  <div class="sb-grid" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr))">
    <div class="sb-stat"><div class="val" id="tr-total">${stats.totalSessions}</div><div class="lbl">Sessions</div></div>
    <div class="sb-stat"><div class="val" id="tr-approved" style="color:#22c55e">${stats.approved}</div><div class="lbl">Approved</div></div>
    <div class="sb-stat"><div class="val" id="tr-rejected" style="color:#ef5350">${stats.rejected}</div><div class="lbl">Rejected</div></div>
    <div class="sb-stat"><div class="val" id="tr-rate" style="color:#fbbf24">${approvalRate}%</div><div class="lbl">Rate</div></div>
    <div class="sb-stat"><div class="val" id="tr-pairs" style="color:#9146ff">${pairsCount}</div><div class="lbl">Trained Pairs</div></div>
  </div>
</div>

<div class="card sb-section">
  <h3>💬 Training Mode</h3>
  <div class="tr-mode-btns">
    <button class="tr-mode-btn active" onclick="trSetMode('single')" id="tr-mode-single">Single</button>
    <button class="tr-mode-btn" onclick="trSetMode('batch')" id="tr-mode-batch">Batch (5)</button>
    <button class="tr-mode-btn" onclick="trSetMode('custom')" id="tr-mode-custom">Custom</button>
  </div>

  <!-- SINGLE MODE -->
  <div id="tr-single-mode">
    <p style="opacity:.5;font-size:12px;margin-bottom:10px">
      Keyboard: <span class="tr-kbd">Y</span> approve &nbsp; <span class="tr-kbd">N</span> reject &nbsp; <span class="tr-kbd">Space</span> generate &nbsp; <span class="tr-kbd">C</span> correct
    </p>
    <div id="tr-scenario-box" style="display:none;margin-bottom:16px">
      <div style="margin-bottom:10px">
        <label style="font-size:11px;opacity:.5;text-transform:uppercase;letter-spacing:.5px">User Message</label>
        <div id="tr-scenario" style="background:#1a1a2e;padding:12px 16px;border-radius:8px;border-left:3px solid #3498db;margin-top:4px;font-size:14px;color:#e0e0e0"></div>
      </div>
      <div>
        <label style="font-size:11px;opacity:.5;text-transform:uppercase;letter-spacing:.5px">Bot Reply</label>
        <div id="tr-reply" style="background:#1a1a2e;padding:12px 16px;border-radius:8px;border-left:3px solid #9146ff;margin-top:4px;font-size:14px;color:#e0e0e0"></div>
      </div>
      <div class="tr-correction" id="tr-correction-box">
        <label style="font-size:11px;opacity:.5;text-transform:uppercase;letter-spacing:.5px">✏️ Write the correct reply (what the bot SHOULD say)</label>
        <textarea id="tr-correction-input" placeholder="Type what the bot should have replied..." rows="2"></textarea>
        <button class="sb-save-btn" onclick="trSubmitCorrection()" style="background:#f59e0b;margin-top:6px;font-size:12px;padding:8px 16px">💾 Save Correction & Reject</button>
      </div>
      <div style="display:flex;gap:10px;margin-top:14px">
        <button class="sb-save-btn" onclick="trRate(true)" style="background:#22c55e;flex:1;text-align:center">👍 Approve <span class="tr-kbd">Y</span></button>
        <button class="sb-save-btn" onclick="trShowCorrection()" id="tr-reject-btn" style="background:#ef5350;flex:1;text-align:center">👎 Reject <span class="tr-kbd">N</span></button>
        <button class="sb-save-btn" onclick="trGenerate()" style="background:#3a3a42;width:auto;padding:10px 16px" title="Skip">🔄</button>
      </div>
    </div>
    <div id="tr-loading" style="display:none;text-align:center;padding:20px;color:#8b8fa3">
      <div style="font-size:24px;margin-bottom:8px">⏳</div>Generating...
    </div>
    <button class="sb-save-btn" id="tr-gen-btn" onclick="trGenerate()" style="background:#9146ff;width:100%;text-align:center;font-size:15px;padding:14px">🎲 Generate Scenario <span class="tr-kbd">Space</span></button>
  </div>

  <!-- BATCH MODE -->
  <div id="tr-batch-mode" style="display:none">
    <p style="opacity:.5;font-size:12px;margin-bottom:10px">Review 5 scenarios at once. Approve or reject each, then submit all ratings.</p>
    <div id="tr-batch-items"></div>
    <div id="tr-batch-loading" style="display:none;text-align:center;padding:20px;color:#8b8fa3">
      <div style="font-size:24px;margin-bottom:8px">⏳</div>Generating 5 scenarios...
    </div>
    <div style="display:flex;gap:10px;margin-top:12px">
      <button class="sb-save-btn" id="tr-batch-gen-btn" onclick="trBatchGenerate()" style="background:#9146ff;flex:1;text-align:center;font-size:14px;padding:12px">🎲 Generate Batch</button>
      <button class="sb-save-btn" id="tr-batch-submit-btn" onclick="trBatchSubmit()" style="background:#22c55e;flex:1;text-align:center;font-size:14px;padding:12px;display:none">📤 Submit All Ratings</button>
    </div>
  </div>

  <!-- CUSTOM MODE -->
  <div id="tr-custom-mode" style="display:none">
    <p style="opacity:.5;font-size:12px;margin-bottom:10px">Type a specific message to test how the bot responds, then approve or correct.</p>
    <div style="display:flex;gap:8px;margin-bottom:12px">
      <input type="text" id="tr-custom-input" placeholder="Type a message to test..." style="flex:1;background:#0d0d1a;border:1px solid #333;color:#e0e0e0;border-radius:8px;padding:10px 14px;font-size:14px">
      <button class="sb-save-btn" onclick="trCustomGenerate()" style="background:#9146ff;padding:10px 18px">Test</button>
    </div>
    <div id="tr-custom-result" style="display:none">
      <div style="margin-bottom:10px">
        <label style="font-size:11px;opacity:.5;text-transform:uppercase;letter-spacing:.5px">Bot Reply</label>
        <div id="tr-custom-reply" style="background:#1a1a2e;padding:12px 16px;border-radius:8px;border-left:3px solid #9146ff;margin-top:4px;font-size:14px;color:#e0e0e0"></div>
      </div>
      <div class="tr-correction" id="tr-custom-correction-box">
        <label style="font-size:11px;opacity:.5;text-transform:uppercase;letter-spacing:.5px">✏️ Write the correct reply</label>
        <textarea id="tr-custom-correction" placeholder="Type what the bot should have replied..." rows="2"></textarea>
        <button class="sb-save-btn" onclick="trCustomSubmitCorrection()" style="background:#f59e0b;margin-top:6px;font-size:12px;padding:8px 16px">💾 Save Correction & Reject</button>
      </div>
      <div style="display:flex;gap:10px;margin-top:10px">
        <button class="sb-save-btn" onclick="trCustomRate(true)" style="background:#22c55e;flex:1;text-align:center">👍 Approve</button>
        <button class="sb-save-btn" onclick="trCustomShowCorrection()" style="background:#ef5350;flex:1;text-align:center">👎 Reject / Correct</button>
      </div>
    </div>
  </div>
</div>

<!-- TRAINED PAIRS LIBRARY -->
<div class="card sb-section">
  <h3>📚 Trained Response Pairs <span id="tr-pairs-count" style="font-size:12px;opacity:.5">(${pairsCount})</span></h3>
  <p style="opacity:.5;font-size:12px;margin-bottom:8px">These curated responses are used directly when a matching message is detected — no AI needed.</p>
  <div style="margin-bottom:10px"><input type="text" id="tr-pairs-search" placeholder="🔍 Search pairs..." oninput="clearTimeout(window._trSearchTimer);window._trSearchTimer=setTimeout(trLoadPairs,300)" style="width:100%;padding:8px 12px;background:#0d0d1a;border:1px solid #333;color:#e0e0e0;border-radius:6px;font-size:13px"></div>
  <div id="tr-pairs-list" style="max-height:500px;overflow-y:auto">
    <div style="color:#8b8fa3;font-size:12px;padding:8px">Loading...</div>
  </div>
</div>

<!-- CANDIDATE PAIRS REVIEW -->
<div class="card sb-section">
  <h3>🔍 Candidate Pairs <span id="tr-cand-count" style="font-size:12px;opacity:.5"></span></h3>
  <p style="opacity:.5;font-size:12px;margin-bottom:8px">Auto-extracted Q&A pairs and user corrections awaiting your review. Approve to add to trained pairs, reject to discard.</p>
  <div id="tr-cand-list" style="max-height:400px;overflow-y:auto">
    <div style="color:#8b8fa3;font-size:12px;padding:8px">Loading...</div>
  </div>
</div>

<!-- CHAT HISTORY IMPORT -->
<div class="card sb-section">
  <h3>📥 Import Chat History</h3>
  <p style="opacity:.5;font-size:12px;margin-bottom:12px">Paste chat messages (one per line) to bulk-train the Markov chain. This teaches the bot natural speech patterns from your community.</p>
  <textarea id="tr-import-area" class="tr-import-area" placeholder="Paste chat messages here, one per line...&#10;&#10;hey whats up everyone&#10;anyone playing valorant tonight&#10;that stream was so good&#10;..."></textarea>
  <div style="display:flex;gap:10px;align-items:center;margin-top:10px">
    <button class="sb-save-btn" onclick="trImport()" style="background:#3498db;padding:10px 20px">📥 Import Messages</button>
    <span id="tr-import-status" style="font-size:12px;color:#8b8fa3"></span>
  </div>
</div>

<!-- TRAINING LOG -->
<div class="card sb-section">
  <h3>📋 Recent Training Log</h3>
  <div id="tr-log" style="max-height:400px;overflow-y:auto">
    <div style="color:#8b8fa3;font-size:12px;padding:8px">Loading...</div>
  </div>
</div>

<script>
var _trScenario='', _trReply='', _trMode='single', _trBatchData=[], _trCustomScenario='', _trCustomReply='';

function trSetMode(mode) {
  _trMode = mode;
  ['single','batch','custom'].forEach(function(m) {
    document.getElementById('tr-'+m+'-mode').style.display = m===mode?'block':'none';
    document.getElementById('tr-mode-'+m).classList.toggle('active', m===mode);
  });
}

// ---- SINGLE MODE ----
function trGenerate() {
  document.getElementById('tr-scenario-box').style.display='none';
  document.getElementById('tr-correction-box').style.display='none';
  document.getElementById('tr-loading').style.display='block';
  document.getElementById('tr-gen-btn').style.display='none';
  fetch('/api/smartbot/training/generate',{method:'POST',headers:{'Content-Type':'application/json'}})
    .then(function(r){return r.json()}).then(function(d){
      document.getElementById('tr-loading').style.display='none';
      if(!d.success){alert(d.error||'Failed');document.getElementById('tr-gen-btn').style.display='block';return}
      _trScenario=d.scenario; _trReply=d.reply;
      document.getElementById('tr-scenario').textContent=d.scenario;
      document.getElementById('tr-reply').textContent=d.reply;
      document.getElementById('tr-scenario-box').style.display='block';
      document.getElementById('tr-correction-box').style.display='none';
      document.getElementById('tr-correction-input').value='';
    }).catch(function(e){
      document.getElementById('tr-loading').style.display='none';
      document.getElementById('tr-gen-btn').style.display='block';
      alert('Error: '+e.message);
    });
}

function trRate(approved, correction) {
  var body = {scenario:_trScenario, reply:_trReply, approved:approved};
  if(correction) body.correction = correction;
  fetch('/api/smartbot/training/rate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
    .then(function(r){return r.json()}).then(function(d){
      if(d.success){
        trUpdateStats(d.stats, d.pairsCount);
        sbToast(approved?'👍 Approved & saved as pair':'👎 Rejected'+(correction?' + correction saved':''));
        trLoadLog(); trLoadPairs();
      }
      trGenerate();
    }).catch(function(e){alert(e.message)});
}

function trShowCorrection() {
  var box=document.getElementById('tr-correction-box');
  if(box.style.display==='block'){
    // Already showing — just reject without correction
    trRate(false);
  } else {
    box.style.display='block';
    document.getElementById('tr-correction-input').focus();
  }
}

function trSubmitCorrection() {
  var text=document.getElementById('tr-correction-input').value.trim();
  if(!text){trRate(false);return}
  trRate(false, text);
}

// ---- BATCH MODE ----
function trBatchGenerate() {
  document.getElementById('tr-batch-items').innerHTML='';
  document.getElementById('tr-batch-loading').style.display='block';
  document.getElementById('tr-batch-gen-btn').style.display='none';
  document.getElementById('tr-batch-submit-btn').style.display='none';
  _trBatchData=[];
  fetch('/api/smartbot/training/generate-batch',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({count:5})})
    .then(function(r){return r.json()}).then(function(d){
      document.getElementById('tr-batch-loading').style.display='none';
      if(!d.success||!d.results){alert(d.error||'Failed');document.getElementById('tr-batch-gen-btn').style.display='block';return}
      _trBatchData=d.results.map(function(r,i){return{scenario:r.scenario,reply:r.reply,approved:null,correction:null,idx:i}});
      var html='';
      _trBatchData.forEach(function(item,i){
        html+='<div class="tr-batch-item" id="tr-bi-'+i+'">'+
          '<div style="font-size:11px;opacity:.4;margin-bottom:4px">#'+(i+1)+'</div>'+
          '<div style="color:#3498db;font-size:13px;margin-bottom:6px">"'+esc(item.scenario)+'"</div>'+
          '<div style="color:#b0b0c0;font-size:13px;border-left:2px solid #9146ff;padding-left:10px">'+esc(item.reply)+'</div>'+
          '<div class="tr-correction" id="tr-bc-'+i+'">'+
            '<textarea id="tr-bci-'+i+'" placeholder="What should the bot say instead?" rows="2" style="width:100%;background:#0d0d1a;border:1px solid #333;color:#e0e0e0;border-radius:6px;padding:8px;font-size:12px;resize:vertical;margin-top:6px"></textarea>'+
          '</div>'+
          '<div class="tr-batch-btns">'+
            '<button onclick="trBatchRate('+i+',true)" style="background:#22c55e" id="tr-ba-'+i+'">👍</button>'+
            '<button onclick="trBatchReject('+i+')" style="background:#ef5350" id="tr-br-'+i+'">👎</button>'+
            '<button onclick="trBatchCorrect('+i+')" style="background:#f59e0b;font-size:11px" id="tr-bw-'+i+'">✏️ Write correct</button>'+
          '</div>'+
        '</div>';
      });
      document.getElementById('tr-batch-items').innerHTML=html;
      document.getElementById('tr-batch-gen-btn').style.display='block';
      document.getElementById('tr-batch-submit-btn').style.display='block';
    }).catch(function(e){
      document.getElementById('tr-batch-loading').style.display='none';
      document.getElementById('tr-batch-gen-btn').style.display='block';
      alert(e.message);
    });
}

function trBatchRate(idx,approved) {
  _trBatchData[idx].approved=approved;
  _trBatchData[idx].correction=null;
  var el=document.getElementById('tr-bi-'+idx);
  el.className='tr-batch-item '+(approved?'rated-good':'rated-bad');
  document.getElementById('tr-bc-'+idx).style.display='none';
}

function trBatchReject(idx) {
  _trBatchData[idx].approved=false;
  _trBatchData[idx].correction=null;
  var el=document.getElementById('tr-bi-'+idx);
  el.className='tr-batch-item rated-bad';
  document.getElementById('tr-bc-'+idx).style.display='none';
}

function trBatchCorrect(idx) {
  var box=document.getElementById('tr-bc-'+idx);
  if(box.style.display==='block'){
    // Save correction and mark as rejected
    var txt=document.getElementById('tr-bci-'+idx).value.trim();
    _trBatchData[idx].approved=false;
    _trBatchData[idx].correction=txt||null;
    document.getElementById('tr-bi-'+idx).className='tr-batch-item rated-bad';
    box.style.display='none';
  } else {
    box.style.display='block';
    document.getElementById('tr-bci-'+idx).focus();
  }
}

function trBatchSubmit() {
  var ratings=_trBatchData.filter(function(r){return r.approved!==null}).map(function(r){
    var obj={scenario:r.scenario,reply:r.reply,approved:r.approved};
    if(r.correction) obj.correction=r.correction;
    return obj;
  });
  if(ratings.length===0){sbToast('Rate at least one scenario first');return}
  fetch('/api/smartbot/training/rate-batch',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ratings:ratings})})
    .then(function(r){return r.json()}).then(function(d){
      if(d.success){
        trUpdateStats(d.stats, d.pairsCount);
        sbToast('Submitted '+ratings.length+' ratings!');
        trLoadLog(); trLoadPairs();
      }
    }).catch(function(e){alert(e.message)});
}

// ---- CUSTOM MODE ----
function trCustomGenerate() {
  var input=document.getElementById('tr-custom-input').value.trim();
  if(!input){sbToast('Type a message first');return}
  document.getElementById('tr-custom-result').style.display='none';
  document.getElementById('tr-custom-correction-box').style.display='none';
  fetch('/api/smartbot/training/custom',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scenario:input})})
    .then(function(r){return r.json()}).then(function(d){
      if(!d.success){alert(d.error||'Failed');return}
      _trCustomScenario=d.scenario; _trCustomReply=d.reply;
      document.getElementById('tr-custom-reply').textContent=d.reply;
      document.getElementById('tr-custom-result').style.display='block';
    }).catch(function(e){alert(e.message)});
}

function trCustomRate(approved, correction) {
  var body={scenario:_trCustomScenario,reply:_trCustomReply,approved:approved};
  if(correction) body.correction=correction;
  fetch('/api/smartbot/training/rate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
    .then(function(r){return r.json()}).then(function(d){
      if(d.success){
        trUpdateStats(d.stats, d.pairsCount);
        sbToast(approved?'👍 Approved':'👎 Rejected'+(correction?' + correction saved':''));
        trLoadLog(); trLoadPairs();
      }
      document.getElementById('tr-custom-result').style.display='none';
      document.getElementById('tr-custom-input').value='';
      document.getElementById('tr-custom-input').focus();
    }).catch(function(e){alert(e.message)});
}

function trCustomShowCorrection() {
  var box=document.getElementById('tr-custom-correction-box');
  if(box.style.display==='block'){
    var txt=document.getElementById('tr-custom-correction').value.trim();
    trCustomRate(false, txt||null);
  } else {
    box.style.display='block';
    document.getElementById('tr-custom-correction').focus();
  }
}

function trCustomSubmitCorrection() {
  var txt=document.getElementById('tr-custom-correction').value.trim();
  trCustomRate(false, txt||null);
}

// ---- HELPERS ----
function trUpdateStats(s, pairs) {
  if(s) {
    document.getElementById('tr-total').textContent=s.totalSessions;
    document.getElementById('tr-approved').textContent=s.approved;
    document.getElementById('tr-rejected').textContent=s.rejected;
    var rate=s.totalSessions>0?Math.round((s.approved/s.totalSessions)*100):0;
    document.getElementById('tr-rate').textContent=rate+'%';
  }
  if(typeof pairs==='number') {
    document.getElementById('tr-pairs').textContent=pairs;
    document.getElementById('tr-pairs-count').textContent='('+pairs+')';
  }
}

function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

function trLoadLog() {
  fetch('/api/smartbot/training/stats').then(function(r){return r.json()}).then(function(d){
    var el=document.getElementById('tr-log');
    if(!d.success||!d.log||d.log.length===0){el.innerHTML='<div style="color:#8b8fa3;font-size:12px;padding:8px">No sessions yet.</div>';return}
    el.innerHTML=d.log.map(function(e){
      var time=new Date(e.ts).toLocaleString([],{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
      var icon=e.approved?'👍':'👎';
      var color=e.approved?'#22c55e':'#ef5350';
      var corr=e.correction?'<div style="color:#f59e0b;font-size:11px;margin-top:2px">✏️ Correction: '+esc(e.correction)+'</div>':'';
      return '<div style="padding:8px 12px;border-bottom:1px solid #1a1a2e;font-size:12px">'+
        '<div style="display:flex;justify-content:space-between;margin-bottom:4px">'+
          '<span style="color:#8b8fa3">'+time+'</span>'+
          '<span style="color:'+color+';font-weight:600">'+icon+' '+(e.approved?'Approved':'Rejected')+'</span>'+
        '</div>'+
        '<div style="color:#3498db;margin-bottom:2px">"'+esc(e.scenario)+'"</div>'+
        '<div style="color:#9146ff">'+esc(e.reply)+'</div>'+corr+
      '</div>';
    }).join('');
  }).catch(function(){});
}

function trLoadPairs() {
  var search=document.getElementById('tr-pairs-search')?document.getElementById('tr-pairs-search').value:'';
  fetch('/api/smartbot/training/pairs?search='+encodeURIComponent(search)).then(function(r){return r.json()}).then(function(d){
    var el=document.getElementById('tr-pairs-list');
    if(!d.success||!d.pairs||d.pairs.length===0){el.innerHTML='<div style="color:#8b8fa3;font-size:12px;padding:8px">'+(search?'No pairs matching "'+esc(search)+'"':'No trained pairs yet. Approve scenarios or write corrections to build your response library.')+'</div>';return}
    el.innerHTML=d.pairs.map(function(p){
      return '<div class="tr-pair" id="trp-'+esc(p.key)+'">'+
        '<button class="tr-del" onclick="trDeletePair(\''+esc(p.key).replace(/'/g,"\\'")+'\')">×</button>'+
        '<div class="tr-pair-q">💬 '+esc(p.pattern)+'</div>'+
        '<div class="tr-pair-a">🤖 '+esc(p.response)+'</div>'+
        '<div class="tr-pair-meta">Score: '+p.score+' · Uses: '+(p.uses||0)+(p.feedbackScore?' · FB: '+p.feedbackScore:'')+' · '+(p.source||'dashboard')+' · '+new Date(p.created).toLocaleDateString()+'</div>'+
      '</div>';
    }).join('')+(d.total>d.pairs.length?'<div style="color:#8b8fa3;font-size:12px;text-align:center;padding:8px">Showing '+d.pairs.length+' of '+d.total+' pairs</div>':'');
    document.getElementById('tr-pairs-count').textContent='('+d.total+')';
  }).catch(function(){});
}

function trDeletePair(key) {
  if(!confirm('Delete this trained pair?')) return;
  fetch('/api/smartbot/training/pairs',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:key})})
    .then(function(r){return r.json()}).then(function(d){
      if(d.success){sbToast('Pair deleted');trLoadPairs();document.getElementById('tr-pairs').textContent=d.pairsCount}
    }).catch(function(e){alert(e.message)});
}

function trImport() {
  var text=document.getElementById('tr-import-area').value.trim();
  if(!text){sbToast('Paste some messages first');return}
  var lines=text.split('\\n').map(function(l){return l.trim()}).filter(function(l){return l.length>3});
  if(lines.length===0){sbToast('No valid messages found');return}
  document.getElementById('tr-import-status').textContent='Importing '+lines.length+' messages...';
  fetch('/api/smartbot/training/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:lines})})
    .then(function(r){return r.json()}).then(function(d){
      if(d.success){
        document.getElementById('tr-import-status').textContent='✅ Imported '+d.imported+' messages into Markov chain ('+((d.markovStats||{}).totalTrained||'?')+' total entries)';
        document.getElementById('tr-import-area').value='';
        sbToast('Imported '+d.imported+' messages!');
      } else {
        document.getElementById('tr-import-status').textContent='❌ '+(d.error||'Failed');
      }
    }).catch(function(e){document.getElementById('tr-import-status').textContent='❌ '+e.message});
}

// ---- KEYBOARD SHORTCUTS ----
document.addEventListener('keydown', function(e) {
  if(_trMode!=='single') return;
  if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.tagName==='SELECT') return;
  var box=document.getElementById('tr-scenario-box');
  if(!box||box.style.display==='none') {
    if(e.code==='Space'){e.preventDefault();trGenerate();} return;
  }
  if(e.key==='y'||e.key==='Y'){e.preventDefault();trRate(true);}
  else if(e.key==='n'||e.key==='N'){e.preventDefault();trShowCorrection();}
  else if(e.key==='c'||e.key==='C'){e.preventDefault();document.getElementById('tr-correction-box').style.display='block';document.getElementById('tr-correction-input').focus();}
  else if(e.code==='Space'){e.preventDefault();trGenerate();}
});

// Enter in correction textarea submits it
document.addEventListener('keydown', function(e) {
  if(e.key==='Enter'&&!e.shiftKey&&e.target.id==='tr-correction-input'){e.preventDefault();trSubmitCorrection();}
  if(e.key==='Enter'&&!e.shiftKey&&e.target.id==='tr-custom-input'){e.preventDefault();trCustomGenerate();}
});

// Init
trLoadLog();
trLoadPairs();
trLoadCandidates();

function trLoadCandidates() {
  fetch('/api/smartbot/training/candidates').then(function(r){return r.json()}).then(function(d){
    var el=document.getElementById('tr-cand-list');
    if(!d.success){el.innerHTML='<div style="color:#8b8fa3;font-size:12px;padding:8px">Failed to load.</div>';return}
    var qa=d.qa||[], corr=d.corrections||[];
    if(qa.length===0&&corr.length===0){el.innerHTML='<div style="color:#8b8fa3;font-size:12px;padding:8px">No candidates yet. The bot auto-extracts Q&A pairs from conversations.</div>';document.getElementById('tr-cand-count').textContent='';return}
    document.getElementById('tr-cand-count').textContent='('+(qa.length+corr.length)+')';
    var html='';
    qa.forEach(function(c,i){
      html+='<div style="background:#1a1a2e;border-radius:8px;padding:10px 14px;margin-bottom:8px;border-left:3px solid #3498db">'+
        '<div style="font-size:10px;color:#555;margin-bottom:4px">Q&A Candidate · '+new Date(c.timestamp).toLocaleString()+'</div>'+
        '<div style="color:#3498db;font-size:13px;margin-bottom:4px">💬 '+esc(c.question)+'</div>'+
        '<div style="color:#b0b0c0;font-size:13px;margin-bottom:8px">🤖 '+esc(c.answer)+'</div>'+
        '<button onclick="trApproveCand(\'qa\','+i+')" style="background:#22c55e;border:0;color:#fff;border-radius:4px;padding:4px 12px;cursor:pointer;font-size:11px;margin-right:6px">✅ Approve</button>'+
        '<button onclick="trRejectCand(\'qa\','+i+')" style="background:#ef5350;border:0;color:#fff;border-radius:4px;padding:4px 12px;cursor:pointer;font-size:11px">❌ Reject</button>'+
      '</div>';
    });
    corr.forEach(function(c,i){
      html+='<div style="background:#1a1a2e;border-radius:8px;padding:10px 14px;margin-bottom:8px;border-left:3px solid #f59e0b">'+
        '<div style="font-size:10px;color:#555;margin-bottom:4px">User Correction · '+new Date(c.timestamp).toLocaleString()+'</div>'+
        '<div style="color:#ef5350;font-size:13px;margin-bottom:4px">❌ Bot said: '+esc(c.originalReply)+'</div>'+
        '<div style="color:#22c55e;font-size:13px;margin-bottom:8px">✅ Should be: '+esc(c.correction)+'</div>'+
        '<button onclick="trApproveCand(\'corrections\','+i+')" style="background:#22c55e;border:0;color:#fff;border-radius:4px;padding:4px 12px;cursor:pointer;font-size:11px;margin-right:6px">✅ Approve</button>'+
        '<button onclick="trRejectCand(\'corrections\','+i+')" style="background:#ef5350;border:0;color:#fff;border-radius:4px;padding:4px 12px;cursor:pointer;font-size:11px">❌ Reject</button>'+
      '</div>';
    });
    el.innerHTML=html;
  }).catch(function(){});
}

function trApproveCand(type,index) {
  fetch('/api/smartbot/training/candidates/approve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:type,index:index})})
    .then(function(r){return r.json()}).then(function(d){
      if(d.success){sbToast('Candidate approved!');trLoadCandidates();trLoadPairs();document.getElementById('tr-pairs').textContent=d.pairsCount}
      else sbToast(d.error||'Failed');
    }).catch(function(e){alert(e.message)});
}

function trRejectCand(type,index) {
  fetch('/api/smartbot/training/candidates/reject',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:type,index:index})})
    .then(function(r){return r.json()}).then(function(d){
      if(d.success){sbToast('Candidate rejected');trLoadCandidates();}
    }).catch(function(e){alert(e.message)});
}
</script>`;
}

const smartBot = { _trainingStats: { totalSessions: 0, approved: 0, rejected: 0 }, trainedPairs: new Map() };
const tabContent = renderSmartBotTrainingTab(smartBot);

// Now build a simplified page shell around it
const page = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <meta name="description" content="Test">
  <meta name="google-site-verification" content="x" />
  <link rel="dns-prefetch" href="https://cdn.jsdelivr.net">
  <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
  <link rel="dns-prefetch" href="https://cdnjs.cloudflare.com">
  <title>Test</title>
  <link rel="stylesheet" href="/dashboard.css?v=2">
</head>
<body data-theme="dark">
<div class="topbar">
  <button class="mobile-menu-btn" onclick="document.querySelector('.sidebar').classList.toggle('mobile-open')" aria-label="Menu">☰</button>
  <div class="topbar-tabs">
    <a class="topbar-tab " href="/">📊 Core</a>
    <a class="topbar-tab " href="/welcome">👥 Community</a>
    <a class="topbar-tab " href="/stats">📈 Analytics</a>
    <a class="topbar-tab " href="/rpg?tab=rpg-editor">🎮 RPG</a>
    <a class="topbar-tab " href="/config-general">⚙️ Config</a>
    <a class="topbar-tab active" href="/smartbot-config">🤖 SmartBot</a>
  </div>
  <div class="topbar-right" style="display:flex;align-items:center;gap:12px">
    <a href="/profile" class="topbar-tab " style="display:flex;align-items:center;gap:6px;font-size:13px;padding:6px 14px;border-radius:8px;text-decoration:none">
      <span style="font-size:14px">👤</span>
      <span style="font-weight:700;color:var(--text-primary)">TestUser</span>
      <span style="color:#22c55e;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;padding:2px 8px;background:#22c55e20;border-radius:4px">admin</span>
    </a>
    <div class="topbar-bell" style="position:relative;cursor:pointer" onclick="window.location.href='/dms'">
      <span style="font-size:18px;filter:grayscale(0.3)">🔔</span>
      <span id="bellBadge" style="display:none;position:absolute;top:-4px;right:-6px;background:#ef5350;color:#fff;font-size:9px;font-weight:700;min-width:16px;height:16px;border-radius:8px;align-items:center;justify-content:center;padding:0 3px;border:2px solid var(--bg-body)"></span>
    </div>
    <div class="topbar-search">
      <span class="topbar-search-icon">🔍</span>
      <input type="text" placeholder="Search everywhere..." id="globalSearch" autocomplete="off">
      <div class="search-results" id="searchResults"></div>
    </div>
  </div>
</div>
<div class="sidebar">
<div class="sidebar-server">
  <div class="sidebar-server-info">
    <div class="sidebar-server-icon"><span>TS</span></div>
    <div class="sidebar-server-name" title="Test Server">Test Server</div>
  </div>
  <div class="sidebar-server-actions">
    <a href="/switch-server">Switch</a>
    <a href="/logout">Sign out</a>
  </div>
</div>
<div class="sidebar-nav">

  <div class="sb-cat open">
    <button class="sb-cat-hdr" onclick="this.parentElement.classList.toggle('open')">
      <span>🤖 SmartBot</span><span class="sb-chevron">›</span>
    </button>
    <div class="sb-cat-body">
    <a href="/smartbot-config" class="">⚙️ Configuration</a>
    <a href="/smartbot-knowledge" class="">📚 Knowledge Base</a>
    <a href="/smartbot-news" class="">📰 News Feed</a>
    <a href="/smartbot-stats" class="">📊 Stats & Trends</a>
    <a href="/smartbot-learning" class="">📖 Learning & Social</a>
    <a href="/smartbot-training" class="active">🏋️ Training</a>
    </div>
  </div>

</div>
</div>
<div class="main">${tabContent}</div>
<script>
var _userAccess = ["core","community","analytics","rpg","config","smartbot","profile"];
var _previewTier = "";
var _pageAccessMap = {};
var _hasCustomAccess = false;
function _withPreview(u){
  if(!_previewTier) return u;
  return u.indexOf('?') === -1 ? (u + '?previewTier=' + _previewTier) : (u + '&previewTier=' + _previewTier);
}
var _allPages = [
  {l:'Overview',c:'Core',u:'/',i:'📊',k:'overview'},
  {l:'SmartBot Training',c:'SmartBot',u:'/smartbot-training',i:'🏋️',k:'smartbot training'},
  {l:'Profile',c:'Profile',u:'/profile',i:'👤',k:'profile'}
];
var _curSlug = 'smartbot-training';
</script>
<script src="/dashboard-shell.js?v=1" defer></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js" defer></script>
<script src="/socket.io/socket.io.js" defer></script>
<script src="/dashboard-actions.js?v=7" defer></script>
<script>
(function(){
  fetch('/api/features/dashboard-prefs',{credentials:'same-origin'})
    .then(function(r){return r.ok?r.json():null}).then(function(d){
      if(!d||!d.success) return;
      var p=d.prefs||{};
      var sb=document.querySelector('.sidebar');
      var mn=document.querySelector('.main');
      if(!sb||!mn) return;
      var w=p.sidebarWidth==='narrow'?180:p.sidebarWidth==='wide'?280:220;
      sb.style.width=w+'px';mn.style.marginLeft=w+'px';
    }).catch(function(){});
})();
</script>
</body>
</html>`;

process.stdout.write(page);
