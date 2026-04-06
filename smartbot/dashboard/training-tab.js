import { sbStyles, sbToastScript } from './styles.js';
/**
 * Reworked Training Tab — Hand-made Q&A pairs with multiple answer variations per question.
 * No auto-generation. No pre-existing data. User adds everything manually.
 */
function renderTrainingTab(smartBot) {
  const pairsCount = smartBot.pairStore?.trainedPairs?.size || 0;
  const stats = smartBot._trainingStats || { totalSessions: 0, approved: 0, rejected: 0 };

  return `
${sbStyles()}
${sbToastScript()}
<style>
.tr-pair{background:#1a1a2e;border-radius:8px;padding:14px;margin-bottom:10px;border-left:3px solid #9146ff;position:relative}
.tr-pair .tr-del{position:absolute;top:8px;right:8px;background:#ef5350;border:0;color:#fff;border-radius:4px;padding:3px 10px;cursor:pointer;font-size:11px;opacity:.7}
.tr-pair .tr-del:hover{opacity:1}
.tr-pair-q{color:#3498db;font-size:14px;font-weight:600;margin-bottom:8px}
.tr-pair-a{color:#b0b0c0;font-size:13px;padding:4px 0 4px 12px;border-left:2px solid #333;margin-bottom:4px;display:flex;align-items:center;gap:8px}
.tr-pair-a .del-var{background:none;border:none;color:#ef5350;cursor:pointer;font-size:14px;opacity:.5;padding:0 4px}
.tr-pair-a .del-var:hover{opacity:1}
.tr-pair-meta{font-size:10px;color:#555;margin-top:6px}
.tr-add-var{display:flex;gap:6px;margin-top:8px}
.tr-add-var input{flex:1;background:#0d0d1a;border:1px solid #333;color:#e0e0e0;border-radius:6px;padding:6px 10px;font-size:13px}
.tr-add-var button{background:#22c55e;color:#fff;border:0;border-radius:6px;padding:6px 14px;cursor:pointer;font-size:12px;font-weight:600;white-space:nowrap}
.tr-add-var button:hover{background:#16a34a}
</style>

<div class="card">
  <h2>🏋️ SmartBot Training</h2>
  <p style="opacity:.6;margin-bottom:16px;font-size:13px">Create question-response pairs manually. Each question can have multiple answer variations — the bot picks one at random when matched.</p>
  <div class="sb-grid" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr))">
    <div class="sb-stat"><div class="val" id="tr-pairs" style="color:#9146ff">${pairsCount}</div><div class="lbl">Trained Pairs</div></div>
    <div class="sb-stat"><div class="val" id="tr-approved" style="color:#22c55e">${stats.approved}</div><div class="lbl">Approved</div></div>
    <div class="sb-stat"><div class="val" id="tr-rejected" style="color:#ef5350">${stats.rejected}</div><div class="lbl">Rejected</div></div>
  </div>
</div>

<!-- ADD NEW PAIR -->
<div class="card sb-section">
  <h3>➕ Add New Pair</h3>
  <p style="opacity:.5;font-size:12px;margin-bottom:12px">Type a question/trigger message, then add one or more answer variations.</p>
  <div class="sb-field" style="margin-bottom:10px">
    <label>Question / Trigger</label>
    <input type="text" id="tr-new-q" placeholder="e.g. when is the next stream" maxlength="300">
  </div>
  <div id="tr-new-answers">
    <div class="sb-field" style="margin-bottom:6px">
      <label>Answer Variation #1</label>
      <input type="text" class="tr-new-ans" placeholder="e.g. We usually stream Mon/Wed/Fri at 7pm!" maxlength="500">
    </div>
  </div>
  <button onclick="trAddAnswerField()" style="background:none;border:1px dashed #555;color:#8b8fa3;border-radius:6px;padding:6px 14px;cursor:pointer;font-size:12px;margin-top:4px">+ Add Another Variation</button>
  <div style="margin-top:12px">
    <button class="sb-save-btn" onclick="trAddPair()">💾 Save Pair</button>
  </div>
</div>

<!-- TEST BOT -->
<div class="card sb-section">
  <h3>🧪 Test Pair Matching</h3>
  <div style="display:flex;gap:8px">
    <input type="text" id="tr-test-msg" placeholder="Type a message to test matching..." style="flex:1;background:#0d0d1a;border:1px solid #333;color:#e0e0e0;border-radius:6px;padding:8px 12px;font-size:14px" onkeydown="if(event.key==='Enter')trTest()">
    <button class="sb-save-btn" onclick="trTest()" style="background:#3498db;margin-top:0">Test</button>
  </div>
  <div id="tr-test-result" style="display:none;margin-top:10px;background:#1a1a2e;padding:12px;border-radius:8px;border:1px solid #333">
    <div style="font-size:11px;opacity:.5;margin-bottom:4px">Bot Response:</div>
    <div id="tr-test-reply" style="font-size:14px"></div>
  </div>
</div>

<!-- PAIRS LIBRARY -->
<div class="card sb-section">
  <h3>📚 Trained Pairs Library <span id="tr-lib-count" style="font-size:12px;opacity:.5">(${pairsCount})</span></h3>
  <div style="margin-bottom:10px">
    <input type="text" id="tr-search" placeholder="🔍 Search pairs..." oninput="clearTimeout(window._trSrch);window._trSrch=setTimeout(trLoadPairs,300)" style="width:100%;padding:8px 12px;background:#0d0d1a;border:1px solid #333;color:#e0e0e0;border-radius:6px;font-size:13px">
  </div>
  <div id="tr-pairs-list" style="max-height:600px;overflow-y:auto">
    <div style="color:#8b8fa3;font-size:12px;padding:8px">Loading...</div>
  </div>
</div>

<!-- CONVERSATION REVIEW -->
<div class="card sb-section">
  <h3>💬 Conversation Review <span id="tr-conv-count" style="font-size:12px;opacity:.5"></span></h3>
  <p style="opacity:.5;font-size:12px;margin-bottom:8px">Approve good bot replies to train as new pairs, or dismiss bad ones.</p>
  <div style="display:flex;gap:8px;margin-bottom:10px">
    <button class="sb-save-btn" onclick="trConvLoad()" style="background:#3498db;padding:6px 14px;font-size:12px;margin-top:0">🔄 Refresh</button>
    <button class="sb-save-btn" onclick="trConvBulk('approve')" style="background:#22c55e;padding:6px 14px;font-size:12px;margin-top:0">✅ Approve All</button>
    <button class="sb-save-btn" onclick="trConvBulk('reject')" style="background:#ef5350;padding:6px 14px;font-size:12px;margin-top:0">🗑️ Dismiss All</button>
  </div>
  <div id="tr-conv-list" style="max-height:500px;overflow-y:auto">
    <div style="color:#8b8fa3;font-size:12px;padding:8px">Loading conversations...</div>
  </div>
</div>

<!-- CANDIDATE PAIRS -->
<div class="card sb-section">
  <h3>🔍 Candidate Pairs <span id="tr-cand-count" style="font-size:12px;opacity:.5"></span></h3>
  <p style="opacity:.5;font-size:12px;margin-bottom:8px">Auto-extracted Q&A from chat. Approve to add as trained pairs.</p>
  <div id="tr-cand-list" style="max-height:400px;overflow-y:auto">
    <div style="color:#8b8fa3;font-size:12px;padding:8px">Loading...</div>
  </div>
</div>

<script>
function esc(s){var d=document.createElement('div');d.textContent=s;return d.innerHTML;}
var _ansCount=1;

function trAddAnswerField(){
  _ansCount++;
  var div=document.createElement('div');
  div.className='sb-field';
  div.style.marginBottom='6px';
  div.innerHTML='<label>Answer Variation #'+_ansCount+'</label><input type="text" class="tr-new-ans" placeholder="Another possible response..." maxlength="500">';
  document.getElementById('tr-new-answers').appendChild(div);
  div.querySelector('input').focus();
}

function trAddPair(){
  var q=document.getElementById('tr-new-q').value.trim();
  if(!q){sbToast('Enter a question');return;}
  var ansInputs=document.querySelectorAll('.tr-new-ans');
  var answers=[];
  ansInputs.forEach(function(inp){var v=inp.value.trim();if(v)answers.push(v);});
  if(!answers.length){sbToast('Add at least one answer');return;}
  fetch('/api/smartbot/training/pairs',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({question:q,answers:answers})
  }).then(function(r){return r.json();}).then(function(d){
    if(d.success){
      sbToast('Pair added!');
      document.getElementById('tr-new-q').value='';
      var container=document.getElementById('tr-new-answers');
      container.innerHTML='<div class="sb-field" style="margin-bottom:6px"><label>Answer Variation #1</label><input type="text" class="tr-new-ans" placeholder="e.g. We usually stream Mon/Wed/Fri at 7pm!" maxlength="500"></div>';
      _ansCount=1;
      trLoadPairs();
    } else sbToast(d.error||'Error');
  }).catch(function(e){sbToast('Error: '+e.message);});
}

function trTest(){
  var msg=document.getElementById('tr-test-msg').value.trim();
  if(!msg){sbToast('Enter a message');return;}
  document.getElementById('tr-test-result').style.display='block';
  document.getElementById('tr-test-reply').textContent='Thinking...';
  fetch('/api/smartbot/test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg})
  }).then(function(r){return r.json();}).then(function(d){
    document.getElementById('tr-test-reply').textContent=d.reply||'(no reply)';
  }).catch(function(){document.getElementById('tr-test-reply').textContent='Error';});
}

function trLoadPairs(){
  var search=document.getElementById('tr-search').value.trim();
  var url='/api/smartbot/training/pairs?limit=50';
  if(search)url+='&search='+encodeURIComponent(search);
  fetch(url).then(function(r){return r.json();}).then(function(d){
    var el=document.getElementById('tr-pairs-list');
    var pairs=d.pairs||[];
    document.getElementById('tr-lib-count').textContent='('+d.total+')';
    if(!pairs.length){el.innerHTML='<p style="opacity:.4;padding:12px">No trained pairs yet. Add one above!</p>';return;}
    var html='';
    pairs.forEach(function(p){
      var answers=(p.responses||[p.response]).filter(Boolean);
      html+='<div class="tr-pair">';
      html+='<button class="tr-del" onclick="trDelPair(\''+esc(p.key).replace(/'/g,"\\\\'")+'\')">Delete</button>';
      html+='<div class="tr-pair-q">Q: '+esc(p.key)+'</div>';
      answers.forEach(function(a,i){
        html+='<div class="tr-pair-a"><span style="flex:1">'+esc(a)+'</span>';
        if(answers.length>1)html+='<button class="del-var" onclick="trDelVariation(\''+esc(p.key).replace(/'/g,"\\\\'")+'\','+i+')" title="Remove this variation">✕</button>';
        html+='</div>';
      });
      html+='<div class="tr-add-var"><input type="text" placeholder="Add variation..." id="var-'+esc(p.key).replace(/[^a-z0-9]/gi,'-')+'" maxlength="500"><button onclick="trAddVariation(\''+esc(p.key).replace(/'/g,"\\\\'")+'\',this)">+ Add</button></div>';
      html+='<div class="tr-pair-meta">Uses: '+(p.uses||0)+' · Score: '+(p.score||0)+' · Created: '+new Date(p.createdAt||Date.now()).toLocaleDateString()+'</div>';
      html+='</div>';
    });
    el.innerHTML=html;
  });
}

function trDelPair(key){
  if(!confirm('Delete pair "'+key+'"?'))return;
  fetch('/api/smartbot/training/pairs',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:key})
  }).then(function(r){return r.json();}).then(function(d){
    if(d.success){sbToast('Deleted');trLoadPairs();}else sbToast(d.error||'Error');
  });
}

function trAddVariation(key,btn){
  var input=btn.parentElement.querySelector('input');
  var val=input.value.trim();
  if(!val){sbToast('Enter a variation');return;}
  fetch('/api/smartbot/training/pairs/variation',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({key:key,answer:val})
  }).then(function(r){return r.json();}).then(function(d){
    if(d.success){sbToast('Variation added');trLoadPairs();}else sbToast(d.error||'Error');
  });
}

function trDelVariation(key,index){
  fetch('/api/smartbot/training/pairs/variation',{
    method:'DELETE',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({key:key,index:index})
  }).then(function(r){return r.json();}).then(function(d){
    if(d.success){sbToast('Variation removed');trLoadPairs();}else sbToast(d.error||'Error');
  });
}

// Conversation review
var _convPage=0;
function trConvLoad(){
  fetch('/api/smartbot/training/conversations?limit=20&offset='+(_convPage*20)).then(function(r){return r.json();}).then(function(d){
    var el=document.getElementById('tr-conv-list');
    var convs=d.conversations||[];
    document.getElementById('tr-conv-count').textContent='('+d.total+')';
    if(!convs.length){el.innerHTML='<p style="opacity:.4;padding:12px">No conversations to review.</p>';return;}
    var html='';
    convs.forEach(function(c,i){
      html+='<div style="background:#12121e;border-radius:8px;padding:12px;margin-bottom:8px;border:1px solid #222" id="conv-'+i+'">';
      html+='<div style="font-size:12px;color:#3498db;margin-bottom:4px">'+esc(c.username||'User')+': '+esc(c.userMessage)+'</div>';
      html+='<div style="font-size:13px;color:#b0b0c0;margin-bottom:6px;border-left:2px solid #9146ff;padding-left:10px">'+esc(c.botReply)+'</div>';
      html+='<div style="font-size:10px;color:#555;margin-bottom:8px">'+new Date(c.timestamp).toLocaleString()+' · '+c.reason+'</div>';
      html+='<div style="display:flex;gap:6px">';
      html+='<button onclick="trConvAction('+i+',\'approve\')" style="background:#22c55e;color:#fff;border:0;border-radius:4px;padding:4px 12px;cursor:pointer;font-size:11px">✅ Approve</button>';
      html+='<button onclick="trConvAction('+i+',\'reject\')" style="background:#ef5350;color:#fff;border:0;border-radius:4px;padding:4px 12px;cursor:pointer;font-size:11px">🗑️ Dismiss</button>';
      html+='</div></div>';
    });
    el.innerHTML=html;
  });
}

function trConvAction(i,action){
  fetch('/api/smartbot/training/conversations/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({index:i})
  }).then(function(r){return r.json();}).then(function(d){
    if(d.success){document.getElementById('conv-'+i).style.opacity='.3';sbToast(action==='approve'?'Approved!':'Dismissed');}
  });
}

function trConvBulk(action){
  fetch('/api/smartbot/training/conversations/bulk',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:action})
  }).then(function(r){return r.json();}).then(function(d){
    if(d.success){sbToast((d.count||0)+' '+action+'d');trConvLoad();}
  });
}

// Candidate pairs
function trCandLoad(){
  fetch('/api/smartbot/training/candidates').then(function(r){return r.json();}).then(function(d){
    var el=document.getElementById('tr-cand-list');
    var cands=d.candidates||[];
    document.getElementById('tr-cand-count').textContent='('+cands.length+')';
    if(!cands.length){el.innerHTML='<p style="opacity:.4;padding:12px">No candidate pairs.</p>';return;}
    var html='';
    cands.forEach(function(c,i){
      html+='<div style="background:#12121e;border-radius:8px;padding:12px;margin-bottom:8px;border:1px solid #222" id="cand-'+i+'">';
      html+='<div style="font-size:12px;color:#3498db;margin-bottom:4px">Q: '+esc(c.question)+'</div>';
      html+='<div style="font-size:13px;color:#22c55e;margin-bottom:6px">A: '+esc(c.answer)+'</div>';
      html+='<div style="display:flex;gap:6px">';
      html+='<button onclick="trCandAction('+i+',\'approve\')" style="background:#22c55e;color:#fff;border:0;border-radius:4px;padding:4px 12px;cursor:pointer;font-size:11px">✅ Approve</button>';
      html+='<button onclick="trCandAction('+i+',\'reject\')" style="background:#ef5350;color:#fff;border:0;border-radius:4px;padding:4px 12px;cursor:pointer;font-size:11px">🗑️ Reject</button>';
      html+='</div></div>';
    });
    el.innerHTML=html;
  });
}

function trCandAction(i,action){
  fetch('/api/smartbot/training/candidates/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({index:i})
  }).then(function(r){return r.json();}).then(function(d){
    if(d.success){document.getElementById('cand-'+i).style.opacity='.3';sbToast(action==='approve'?'Added to pairs!':'Rejected');}
  });
}

// Initial load
trLoadPairs();
trConvLoad();
trCandLoad();
</script>`;
}

export { renderTrainingTab };