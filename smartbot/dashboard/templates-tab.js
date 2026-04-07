import { sbStyles, sbToastScript } from './styles.js';
import { TEMPLATES, FOCUSED_TEMPLATES } from '../data/templates.js';

function renderTemplatesTab(smartBot) {
  const topicKeys = Object.keys(TEMPLATES);
  const topicOptions = topicKeys.map(k => `<option value="${k}">${k.replace(/_/g, ' ')}</option>`).join('');

  // Build broad templates summary
  const broadRows = topicKeys
    .filter(k => Array.isArray(TEMPLATES[k]) && TEMPLATES[k].length > 0)
    .map(k => {
      const responses = TEMPLATES[k];
      const preview = responses.slice(0, 3).map(r => `<span class="sb-chip">${esc(r.length > 60 ? r.slice(0, 57) + '...' : r)}</span>`).join('');
      const more = responses.length > 3 ? `<span style="opacity:.5">+${responses.length - 3} more</span>` : '';
      return `<tr data-topic="${k}">
        <td style="font-weight:600">${k.replace(/_/g, ' ')}</td>
        <td>${responses.length}</td>
        <td>${preview} ${more}</td>
        <td>
          <button class="sb-sm-btn" onclick="viewBroad('${k}')">View</button>
          <button class="sb-sm-btn sb-del" onclick="clearBroad('${k}')">Clear</button>
        </td>
      </tr>`;
    }).join('');

  // Build focused templates summary
  const focusedEntries = [...FOCUSED_TEMPLATES.entries()];
  const focusedRows = focusedEntries.map(([q, answers], i) => {
    const preview = answers.slice(0, 2).map(a => `<span class="sb-chip">${esc(a.length > 50 ? a.slice(0, 47) + '...' : a)}</span>`).join('');
    const more = answers.length > 2 ? `<span style="opacity:.5">+${answers.length - 2} more</span>` : '';
    return `<tr>
      <td style="font-weight:600">${esc(q)}</td>
      <td>${answers.length}</td>
      <td>${preview} ${more}</td>
      <td>
        <button class="sb-sm-btn" onclick="viewFocused(${i})">View</button>
        <button class="sb-sm-btn sb-del" onclick="delFocused(${i})">Delete</button>
      </td>
    </tr>`;
  }).join('');

  return `
${sbStyles()}
<style>
  .sb-chip{display:inline-block;background:#2a2a4a;padding:2px 8px;border-radius:10px;font-size:12px;margin:2px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .sb-sm-btn{padding:4px 10px;border:none;border-radius:6px;cursor:pointer;font-size:12px;background:#3498db;color:#fff}
  .sb-sm-btn.sb-del{background:#e74c3c}
  .sb-tabs{display:flex;gap:4px;margin-bottom:16px}
  .sb-tab{padding:8px 16px;border-radius:8px 8px 0 0;cursor:pointer;background:#1a1a2e;border:1px solid #333;border-bottom:none;font-size:14px;color:#ccc}
  .sb-tab.active{background:#2d2d44;color:#fff;font-weight:600}
  .sb-panel{display:none;padding:16px;background:#2d2d44;border-radius:0 8px 8px 8px;border:1px solid #333}
  .sb-panel.active{display:block}
  table.sb-table{width:100%;border-collapse:collapse;font-size:13px}
  .sb-table th,.sb-table td{text-align:left;padding:8px;border-bottom:1px solid #333}
  .sb-table th{opacity:.6;font-weight:400;font-size:12px}
  .sb-modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:999;display:none}
  .sb-modal{background:#1e1e36;border-radius:12px;padding:24px;min-width:400px;max-width:600px;max-height:80vh;overflow-y:auto;border:1px solid #444}
  .sb-modal h3{margin-top:0}
  .sb-modal-close{float:right;cursor:pointer;font-size:20px;background:none;border:none;color:#fff;opacity:.6}
  .sb-modal-close:hover{opacity:1}
  .sb-response-item{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #333}
  .sb-response-item .text{flex:1;font-size:13px;word-break:break-word}
  .sb-response-item button{flex-shrink:0}
  textarea.sb-area{width:100%;min-height:80px;background:#12122a;border:1px solid #444;border-radius:8px;color:#fff;padding:8px;font-size:13px;resize:vertical}
  .sb-suggest-btn{padding:6px 14px;border:none;border-radius:6px;cursor:pointer;font-size:13px;background:#9b59b6;color:#fff;display:inline-flex;align-items:center;gap:6px}
  .sb-suggest-btn:hover{background:#8e44ad}
  .sb-suggest-btn:disabled{opacity:.5;cursor:wait}
  .sb-suggestions{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
  .sb-suggestion{display:inline-block;background:#1a1a3e;border:1px solid #555;padding:4px 10px;border-radius:8px;font-size:12px;cursor:pointer;transition:all .15s}
  .sb-suggestion:hover{background:#3498db;border-color:#3498db;color:#fff}
</style>

<div class="card">
  <h2>📝 Template Manager</h2>
  <p style="opacity:.6;margin-bottom:16px">Create and manage response templates. Broad templates map a topic to possible responses. Focused templates map a specific question to possible answers.</p>
  <div class="sb-grid">
    <div class="sb-stat"><div class="val">${topicKeys.filter(k => TEMPLATES[k]?.length > 0).length}</div><div class="lbl">Active Topics</div></div>
    <div class="sb-stat"><div class="val">${topicKeys.reduce((s, k) => s + (TEMPLATES[k]?.length || 0), 0)}</div><div class="lbl">Broad Responses</div></div>
    <div class="sb-stat"><div class="val">${FOCUSED_TEMPLATES.size}</div><div class="lbl">Focused Q&As</div></div>
  </div>
</div>

<div class="card">
  <div class="sb-tabs">
    <div class="sb-tab active" onclick="switchTab('broad')">📦 Broad Templates</div>
    <div class="sb-tab" onclick="switchTab('focused')">🎯 Focused Templates</div>
  </div>

  <!-- BROAD PANEL -->
  <div id="panel-broad" class="sb-panel active">
    <h3>Add Responses to a Topic</h3>
    <div class="sb-grid" style="margin-bottom:12px">
      <div class="sb-field">
        <label>Topic</label>
        <select id="tpl-topic">${topicOptions}</select>
      </div>
    </div>
    <div class="sb-field">
      <label>Responses <span style="opacity:.5">(one per line)</span></label>
      <textarea class="sb-area" id="tpl-responses" placeholder="haha nice shot!&#10;that's some solid gameplay right there&#10;ooh clutch moment"></textarea>
    </div>
    <button class="sb-save-btn" onclick="addBroad()" style="margin-top:8px">➕ Add Responses</button>
    <button class="sb-suggest-btn" onclick="suggestBroad()" style="margin-top:8px" id="suggest-broad-btn">✨ Suggest Replies</button>
    <div class="sb-suggestions" id="suggest-broad-results"></div>

    <h3 style="margin-top:24px">Add Custom Topic</h3>
    <div class="sb-grid">
      <div class="sb-field">
        <label>Topic Name</label>
        <input type="text" id="tpl-new-topic" placeholder="e.g. anime">
      </div>
    </div>
    <button class="sb-save-btn" onclick="addTopic()" style="background:#2ecc71;margin-top:8px">➕ Create Topic</button>

    <h3 style="margin-top:24px">Current Broad Templates</h3>
    ${broadRows
      ? `<table class="sb-table"><thead><tr><th>Topic</th><th>#</th><th>Preview</th><th>Actions</th></tr></thead><tbody>${broadRows}</tbody></table>`
      : '<p style="opacity:.5">No broad templates yet. Add some above!</p>'}
  </div>

  <!-- FOCUSED PANEL -->
  <div id="panel-focused" class="sb-panel">
    <h3>Add Focused Q&A</h3>
    <div class="sb-field" style="margin-bottom:8px">
      <label>Question / Trigger</label>
      <input type="text" id="tpl-question" placeholder="e.g. what game are you playing?">
    </div>
    <div class="sb-field">
      <label>Answers <span style="opacity:.5">(one per line)</span></label>
      <textarea class="sb-area" id="tpl-answers" placeholder="I'm grinding Idleon right now!&#10;Playing some Valorant today&#10;Nothing at the moment, just vibing"></textarea>
    </div>
    <button class="sb-save-btn" onclick="addFocused()" style="margin-top:8px">➕ Add Focused Template</button>
    <button class="sb-suggest-btn" onclick="suggestFocused()" style="margin-top:8px" id="suggest-focused-btn">✨ Suggest Answers</button>
    <div class="sb-suggestions" id="suggest-focused-results"></div>

    <h3 style="margin-top:24px">Current Focused Templates</h3>
    ${focusedRows
      ? `<table class="sb-table"><thead><tr><th>Question</th><th>#</th><th>Preview</th><th>Actions</th></tr></thead><tbody>${focusedRows}</tbody></table>`
      : '<p style="opacity:.5">No focused templates yet. Add some above!</p>'}
  </div>
</div>

<!-- Modal for viewing/editing -->
<div class="sb-modal-overlay" id="tpl-modal">
  <div class="sb-modal">
    <button class="sb-modal-close" onclick="closeModal()">&times;</button>
    <h3 id="modal-title">Template</h3>
    <div id="modal-body"></div>
  </div>
</div>

${sbToastScript()}
<script>
var _focusedList=${JSON.stringify(focusedEntries.map(([q, a]) => ({q, a})))};

function esc(s){var d=document.createElement('div');d.textContent=s;return d.innerHTML;}

function switchTab(t){
  document.querySelectorAll('.sb-tab').forEach(function(el,i){el.classList.toggle('active', (t==='broad'?i===0:i===1));});
  document.getElementById('panel-broad').classList.toggle('active', t==='broad');
  document.getElementById('panel-focused').classList.toggle('active', t==='focused');
}

function addBroad(){
  var topic=document.getElementById('tpl-topic').value;
  var lines=document.getElementById('tpl-responses').value.split('\\n').map(function(l){return l.trim();}).filter(Boolean);
  if(!lines.length){sbToast('Enter at least one response');return;}
  fetch('/api/smartbot/templates/broad',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({topic:topic,responses:lines})})
    .then(function(r){return r.json();}).then(function(d){
      if(d.success){sbToast('Added '+lines.length+' responses to '+topic);document.getElementById('tpl-responses').value='';setTimeout(function(){location.reload();},800);}
      else sbToast(d.error||'Error','error');
    });
}

function addTopic(){
  var name=document.getElementById('tpl-new-topic').value.trim();
  if(!name){sbToast('Enter a topic name');return;}
  fetch('/api/smartbot/templates/broad/topic',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({topic:name})})
    .then(function(r){return r.json();}).then(function(d){
      if(d.success){sbToast('Topic created: '+d.topic);document.getElementById('tpl-new-topic').value='';setTimeout(function(){location.reload();},800);}
      else sbToast(d.error||'Error','error');
    });
}

function clearBroad(topic){
  if(!confirm('Remove all responses from '+topic+'?'))return;
  fetch('/api/smartbot/templates/broad/clear',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({topic:topic})})
    .then(function(r){return r.json();}).then(function(d){
      if(d.success){sbToast('Cleared '+topic);setTimeout(function(){location.reload();},600);}
    });
}

function viewBroad(topic){
  fetch('/api/smartbot/templates').then(function(r){return r.json();}).then(function(d){
    var list=d.broad[topic]||[];
    document.getElementById('modal-title').textContent='📦 '+topic.replace(/_/g,' ')+' ('+list.length+')';
    var html='';
    list.forEach(function(r,i){
      html+='<div class="sb-response-item"><span class="text">'+esc(r)+'</span><button class="sb-sm-btn sb-del" onclick="delBroadItem(\\''+topic+'\\','+i+')">✕</button></div>';
    });
    if(!list.length) html='<p style="opacity:.5">No responses.</p>';
    document.getElementById('modal-body').innerHTML=html;
    document.getElementById('tpl-modal').style.display='flex';
  });
}

function delBroadItem(topic,idx){
  fetch('/api/smartbot/templates/broad',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({topic:topic,index:idx})})
    .then(function(r){return r.json();}).then(function(d){
      if(d.success){sbToast('Deleted');viewBroad(topic);}
    });
}

function addFocused(){
  var q=document.getElementById('tpl-question').value.trim();
  var lines=document.getElementById('tpl-answers').value.split('\\n').map(function(l){return l.trim();}).filter(Boolean);
  if(!q){sbToast('Enter a question');return;}
  if(!lines.length){sbToast('Enter at least one answer');return;}
  fetch('/api/smartbot/templates/focused',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:q,answers:lines})})
    .then(function(r){return r.json();}).then(function(d){
      if(d.success){sbToast('Added focused template');document.getElementById('tpl-question').value='';document.getElementById('tpl-answers').value='';setTimeout(function(){location.reload();},800);}
      else sbToast(d.error||'Error','error');
    });
}

function viewFocused(i){
  var entry=_focusedList[i];if(!entry)return;
  document.getElementById('modal-title').textContent='🎯 '+entry.q;
  var html='';
  entry.a.forEach(function(a,ai){
    html+='<div class="sb-response-item"><span class="text">'+esc(a)+'</span><button class="sb-sm-btn sb-del" onclick="delFocusedAnswer('+i+','+ai+')">✕</button></div>';
  });
  document.getElementById('modal-body').innerHTML=html;
  document.getElementById('tpl-modal').style.display='flex';
}

function delFocused(i){
  var entry=_focusedList[i];if(!entry)return;
  if(!confirm('Delete focused template: '+entry.q+'?'))return;
  fetch('/api/smartbot/templates/focused',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:entry.q})})
    .then(function(r){return r.json();}).then(function(d){
      if(d.success){sbToast('Deleted');setTimeout(function(){location.reload();},600);}
    });
}

function delFocusedAnswer(i,ai){
  var entry=_focusedList[i];if(!entry)return;
  fetch('/api/smartbot/templates/focused/answer',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:entry.q,index:ai})})
    .then(function(r){return r.json();}).then(function(d){
      if(d.success){sbToast('Deleted answer');viewFocused(i);}
    });
}

function closeModal(){document.getElementById('tpl-modal').style.display='none';}
document.getElementById('tpl-modal').addEventListener('click',function(e){if(e.target===this)closeModal();});

function suggestBroad(){
  var topic=document.getElementById('tpl-topic').value;
  if(!topic){sbToast('Select a topic first');return;}
  var btn=document.getElementById('suggest-broad-btn');
  btn.disabled=true;btn.textContent='⏳ Generating...';
  document.getElementById('suggest-broad-results').innerHTML='';
  fetch('/api/smartbot/templates/suggest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'broad',topic:topic,count:5})})
    .then(function(r){return r.json();}).then(function(d){
      btn.disabled=false;btn.innerHTML='✨ Suggest Replies';
      if(!d.success){sbToast(d.error||'Error','error');return;}
      var container=document.getElementById('suggest-broad-results');
      container.innerHTML='<span style="opacity:.5;font-size:12px;width:100%">Click to add to textarea:</span>';
      d.suggestions.forEach(function(s){
        var chip=document.createElement('span');
        chip.className='sb-suggestion';chip.textContent=s;
        chip.onclick=function(){
          var ta=document.getElementById('tpl-responses');
          ta.value=(ta.value?ta.value+'\\n':'')+s;
          chip.style.opacity='.4';chip.style.pointerEvents='none';
          sbToast('Added');
        };
        container.appendChild(chip);
      });
    }).catch(function(){btn.disabled=false;btn.innerHTML='✨ Suggest Replies';sbToast('Request failed','error');});
}

function suggestFocused(){
  var q=document.getElementById('tpl-question').value.trim();
  if(!q){sbToast('Enter a question first');return;}
  var btn=document.getElementById('suggest-focused-btn');
  btn.disabled=true;btn.textContent='⏳ Generating...';
  document.getElementById('suggest-focused-results').innerHTML='';
  fetch('/api/smartbot/templates/suggest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'focused',question:q,count:5})})
    .then(function(r){return r.json();}).then(function(d){
      btn.disabled=false;btn.innerHTML='✨ Suggest Answers';
      if(!d.success){sbToast(d.error||'Error','error');return;}
      var container=document.getElementById('suggest-focused-results');
      container.innerHTML='<span style="opacity:.5;font-size:12px;width:100%">Click to add to textarea:</span>';
      d.suggestions.forEach(function(s){
        var chip=document.createElement('span');
        chip.className='sb-suggestion';chip.textContent=s;
        chip.onclick=function(){
          var ta=document.getElementById('tpl-answers');
          ta.value=(ta.value?ta.value+'\\n':'')+s;
          chip.style.opacity='.4';chip.style.pointerEvents='none';
          sbToast('Added');
        };
        container.appendChild(chip);
      });
    }).catch(function(){btn.disabled=false;btn.innerHTML='✨ Suggest Answers';sbToast('Request failed','error');});
}
</script>`;
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export { renderTemplatesTab };
