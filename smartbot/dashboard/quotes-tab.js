import { sbStyles, sbToastScript } from './styles.js';
function renderQuotesTab(smartBot) {
  const quotesCount = smartBot.quoteManager?.quotes?.length || 0;
  const embedStats = smartBot.embedder ? {
    enabled: smartBot.embedder.enabled,
    ready: smartBot.embedder.isReady(),
    pairsCached: smartBot.embedder._pairEmbeddings?.size || 0,
    apiCalls: smartBot.embedder._apiCalls || 0,
    cacheHits: smartBot.embedder._cacheHits || 0,
    contextChannels: smartBot.embedder._channelContexts?.size || 0,
  } : {};

  return `
${sbStyles()}
${sbToastScript()}
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
  <h2 style="margin:0">📜 Quotes</h2>
  <span style="color:#8b8fa3;font-size:13px">${quotesCount} quote${quotesCount !== 1 ? 's' : ''}</span>
</div>

<div class="sb-section">
  <h3>Add New Quote</h3>
  <div class="sb-grid">
    <div class="sb-field" style="grid-column:1/-1">
      <label>Quote Text</label>
      <textarea id="q-text" placeholder="Enter a quote..." rows="2" maxlength="500"></textarea>
    </div>
    <div class="sb-field">
      <label>Added By</label>
      <input type="text" id="q-addedby" placeholder="Who said this?" maxlength="100">
    </div>
    <div class="sb-field">
      <label>Tags (comma-separated)</label>
      <input type="text" id="q-tags" placeholder="funny, gaming, wisdom..." maxlength="200">
    </div>
  </div>
  <button class="sb-save-btn" onclick="qAdd()">Add Quote</button>
</div>

<div class="sb-section">
  <h3>All Quotes</h3>
  <div style="margin-bottom:12px">
    <input type="text" id="q-search" placeholder="Search quotes..." style="background:#1a1a2e;border:1px solid #333;border-radius:6px;padding:8px 12px;color:#e0e0e0;width:100%;max-width:400px;font-size:14px" oninput="qFilter()">
  </div>
  <div id="q-list" style="max-height:500px;overflow-y:auto"></div>
</div>

<div class="sb-section" style="margin-top:24px">
  <h3>🧠 Embeddings Status</h3>
  <div class="sb-grid">
    <div class="sb-stat"><div class="val">${embedStats.enabled ? '✅' : '❌'}</div><div class="lbl">Enabled</div></div>
    <div class="sb-stat"><div class="val">${embedStats.ready ? '✅' : '⏳'}</div><div class="lbl">Ready</div></div>
    <div class="sb-stat"><div class="val">${embedStats.pairsCached || 0}</div><div class="lbl">Pairs Embedded</div></div>
    <div class="sb-stat"><div class="val">${embedStats.apiCalls || 0}</div><div class="lbl">API Calls</div></div>
    <div class="sb-stat"><div class="val">${embedStats.cacheHits || 0}</div><div class="lbl">Cache Hits</div></div>
    <div class="sb-stat"><div class="val">${embedStats.contextChannels || 0}</div><div class="lbl">Context Channels</div></div>
  </div>
</div>

<script>
var _qData=[];
function esc(s){var d=document.createElement('div');d.textContent=s;return d.innerHTML;}

function qLoad(){
  fetch('/api/smartbot/quotes').then(function(r){return r.json()}).then(function(d){
    if(!d.success)return;
    _qData=d.quotes||[];
    qRender(_qData);
  });
}

function qRender(quotes){
  var el=document.getElementById('q-list');
  if(!quotes||!quotes.length){el.innerHTML='<div style="color:#8b8fa3;font-size:13px;padding:12px">No quotes yet. Add one above!</div>';return;}
  var html='';
  quotes.forEach(function(q){
    var tags=(q.tags&&q.tags.length>0)?q.tags.map(function(t){return '<span style="background:#9146ff22;color:#9146ff;padding:1px 6px;border-radius:8px;font-size:10px;margin-right:4px">'+esc(t)+'</span>'}).join(''):'';
    html+='<div style="background:#1a1a2e;border-radius:8px;padding:12px 14px;margin-bottom:8px;border-left:3px solid #9146ff;position:relative">'
      +'<div style="font-size:14px;color:#e0e0e0;margin-bottom:6px">"'+esc(q.text)+'"</div>'
      +'<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">'
      +'<span style="font-size:11px;color:#8b8fa3">— '+esc(q.addedBy||'unknown')+'</span>'
      +'<span style="font-size:10px;color:#555">'+new Date(q.addedAt).toLocaleDateString()+'</span>'
      +(q.uses>0?'<span style="font-size:10px;color:#555">Used '+q.uses+'x</span>':'')
      +tags+'</div>'
      +'<button onclick="qDel('+q.id+')" style="position:absolute;top:8px;right:8px;background:#ef5350;border:0;color:#fff;border-radius:4px;padding:2px 8px;cursor:pointer;font-size:11px;opacity:.7" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=.7">✕</button>'
      +'</div>';
  });
  el.innerHTML=html;
}

function qAdd(){
  var text=document.getElementById('q-text').value.trim();
  var addedBy=document.getElementById('q-addedby').value.trim();
  var tagsRaw=document.getElementById('q-tags').value.trim();
  if(!text){sbToast('Enter quote text');return;}
  var tags=tagsRaw?tagsRaw.split(',').map(function(t){return t.trim()}).filter(Boolean):[];
  fetch('/api/smartbot/quotes',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({text:text,addedBy:addedBy||undefined,tags:tags})
  }).then(function(r){return r.json()}).then(function(d){
    if(d.success){sbToast('Quote added!');document.getElementById('q-text').value='';document.getElementById('q-addedby').value='';document.getElementById('q-tags').value='';qLoad();}
    else sbToast(d.error||'Failed');
  });
}

function qDel(id){
  if(!confirm('Delete this quote?'))return;
  fetch('/api/smartbot/quotes/'+id,{method:'DELETE'}).then(function(r){return r.json()}).then(function(d){
    if(d.success){sbToast('Deleted');qLoad();}else sbToast(d.error||'Failed');
  });
}

function qFilter(){
  var search=document.getElementById('q-search').value.toLowerCase().trim();
  if(!search){qRender(_qData);return;}
  var filtered=_qData.filter(function(q){
    return q.text.toLowerCase().includes(search)||(q.addedBy||'').toLowerCase().includes(search)
      ||(q.tags||[]).some(function(t){return t.toLowerCase().includes(search)});
  });
  qRender(filtered);
}

qLoad();
</script>`;
}

export { renderQuotesTab };