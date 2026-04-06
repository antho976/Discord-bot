import { sbStyles, sbToastScript } from './styles.js';
function renderNewsTab(smartBot) {
  const cfg = smartBot.config;
  return `
${sbStyles()}
<div class="card">
  <h2>📰 News Feed Channel</h2>
  <p style="opacity:.6;margin-bottom:16px">Set a channel where news headlines are automatically posted.</p>
  <div class="sb-grid">
    <div class="sb-field">
      <label>News Channel</label>
      <select id="sb-newsChannel"><option value="">None (disabled)</option></select>
    </div>
    <div class="sb-field">
      <label>Post Interval (hours)</label>
      <input type="number" id="sb-newsInterval" value="${cfg.newsInterval || 4}" min="1" max="24" step="1">
    </div>
    <div class="sb-field">
      <label>Topics (comma separated, empty = general)</label>
      <input type="text" id="sb-newsTopics" value="${(cfg.newsTopics || []).join(', ')}" placeholder="e.g. gaming, tech, music">
    </div>
  </div>
  <button class="sb-save-btn" onclick="sbSaveNews()">💾 Save News Settings</button>
  <button class="sb-save-btn" onclick="sbPostNow()" style="background:#3498db;margin-left:8px">📤 Post Now</button>
</div>

<div class="card sb-section">
  <h3>🔗 RSS Sources</h3>
  <p style="opacity:.6;margin-bottom:12px;font-size:13px">Add custom RSS feed URLs to include in news posts.</p>
  <div class="sb-field" style="margin-bottom:12px">
    <label>RSS Feed URLs (one per line)</label>
    <textarea id="sb-rssFeeds" rows="4" placeholder="https://example.com/feed.xml">${(cfg.rssFeeds || []).join('\\n')}</textarea>
  </div>
  <button class="sb-save-btn" onclick="sbSaveRSS()">💾 Save RSS Sources</button>
</div>

<div class="card sb-section">
  <h3>🛡️ News Filters</h3>
  <div class="sb-grid">
    <div class="sb-field">
      <label>Blocked Keywords (comma separated)</label>
      <input type="text" id="sb-newsBlocked" value="${(cfg.newsBlockedKeywords || []).join(', ')}" placeholder="e.g. nsfw, politics, drama">
    </div>
    <div class="sb-field">
      <label>NSFW Filter</label>
      <select id="sb-newsNsfw">
        <option value="true" ${cfg.newsNsfwFilter !== false?'selected':''}>Enabled</option>
        <option value="false" ${cfg.newsNsfwFilter === false?'selected':''}>Disabled</option>
      </select>
    </div>
  </div>
  <button class="sb-save-btn" onclick="sbSaveFilters()">💾 Save Filters</button>
</div>

<div class="card sb-section">
  <h3>📋 Last News Post</h3>
  <div id="sb-last-news"><p style="opacity:.4">Loading...</p></div>
</div>

${sbToastScript()}
<script>
function sbSaveNews(){
  var topics=document.getElementById('sb-newsTopics').value.split(',').map(function(s){return s.trim();}).filter(Boolean);
  fetch('/api/smartbot/config',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({newsChannelId:document.getElementById('sb-newsChannel').value,newsInterval:parseInt(document.getElementById('sb-newsInterval').value)||4,newsTopics:topics})
  }).then(function(r){return r.json();}).then(function(){sbToast('News settings saved!');});
}
function sbSaveRSS(){
  var feeds=document.getElementById('sb-rssFeeds').value.split('\\n').map(function(s){return s.trim();}).filter(Boolean);
  fetch('/api/smartbot/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rssFeeds:feeds})
  }).then(function(r){return r.json();}).then(function(){sbToast('RSS sources saved!');});
}
function sbSaveFilters(){
  var blocked=document.getElementById('sb-newsBlocked').value.split(',').map(function(s){return s.trim();}).filter(Boolean);
  fetch('/api/smartbot/config',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({newsBlockedKeywords:blocked,newsNsfwFilter:document.getElementById('sb-newsNsfw').value==='true'})
  }).then(function(r){return r.json();}).then(function(){sbToast('Filters saved!');});
}
function sbPostNow(){
  fetch('/api/smartbot/news/post',{method:'POST'}).then(function(r){return r.json();}).then(function(d){
    sbToast(d.success?'News posted!':'Failed: '+(d.error||'unknown'));
  });
}
(function(){
  fetch('/api/channels').then(function(r){return r.json();}).then(function(channels){
    var sel=document.getElementById('sb-newsChannel');
    if(!sel)return;
    var currentId='${cfg.newsChannelId || ''}';
    channels.filter(function(c){return c.type===0||c.type===5;}).forEach(function(c){
      var opt=document.createElement('option');opt.value=c.id;opt.textContent='#'+c.name;
      if(c.id===currentId)opt.selected=true;sel.appendChild(opt);
    });
  });
  fetch('/api/smartbot/news/last').then(function(r){return r.json();}).then(function(d){
    var el=document.getElementById('sb-last-news');
    if(!d.post){el.innerHTML='<p style="opacity:.4">No news posted yet.</p>';return;}
    el.innerHTML='<div style="background:#1a1a2e;padding:12px;border-radius:8px;border:1px solid #333"><div style="font-size:11px;opacity:.5;margin-bottom:4px">Posted '+new Date(d.post.timestamp).toLocaleString()+'</div><div style="font-size:14px">'+d.post.content.substring(0,500)+'</div></div>';
  }).catch(function(){document.getElementById('sb-last-news').innerHTML='<p style="opacity:.4">Unable to load.</p>';});
})();
</script>`;
}

export { renderNewsTab };