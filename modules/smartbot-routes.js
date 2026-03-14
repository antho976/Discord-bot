/**
 * SmartBot Dashboard Tabs & API Routes
 * Extracted from index.js — SmartBot config, knowledge, news, stats, AI, learning tabs + all /api/smartbot/* routes
 */

// ======================== SMARTBOT DASHBOARD STYLES ========================
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
</script>`;
}

// ======================== TAB RENDER FUNCTIONS ========================

export function renderSmartBotConfigTab(smartBot) {
  const cfg = smartBot.getConfig();
  const stats = smartBot.getStats();
  return `
${_sbStyles()}
<div class="card">
  <h2>⚙️ SmartBot Configuration</h2>
  <p style="opacity:.6;margin-bottom:16px">Configure the AI chat bot that responds naturally in your channels.</p>

  <div class="sb-toggle">
    <label>Enabled</label>
    <input type="checkbox" id="sb-enabled" ${cfg.enabled ? 'checked' : ''} onchange="sbSave()">
  </div>

  <div class="sb-grid">
    <div class="sb-stat"><div class="val">${stats.totalReplies || 0}</div><div class="lbl">Total Replies</div></div>
    <div class="sb-stat"><div class="val">${stats.trainedPairs || 0}</div><div class="lbl">Trained Pairs</div></div>
  </div>
</div>

<div class="card sb-section">
  <h3>💬 Chat Settings</h3>
  <div class="sb-grid">
    <div class="sb-field">
      <label>Reply Chance (0-1)</label>
      <input type="number" id="sb-replyChance" value="${cfg.replyChance}" min="0" max="1" step="0.01">
    </div>
    <div class="sb-field">
      <label>Cooldown (ms)</label>
      <input type="number" id="sb-cooldownMs" value="${cfg.cooldownMs}" min="0" step="1000">
    </div>
    <div class="sb-field">
      <label>Min Messages Between</label>
      <input type="number" id="sb-minMsgBetween" value="${cfg.minMessagesBetween}" min="0">
    </div>
    <div class="sb-field">
      <label>Markov Chance (0-1)</label>
      <input type="number" id="sb-markovChance" value="${cfg.markovChance}" min="0" max="1" step="0.05">
    </div>
    <div class="sb-field">
      <label>Max Response Length</label>
      <input type="number" id="sb-maxLen" value="${cfg.maxResponseLength}" min="10" max="500">
    </div>
    <div class="sb-field">
      <label>Personality</label>
      <select id="sb-personality">
        <option value="chill" ${cfg.personality==='chill'?'selected':''}>Chill</option>
        <option value="hype" ${cfg.personality==='hype'?'selected':''}>Hype</option>
        <option value="sarcastic" ${cfg.personality==='sarcastic'?'selected':''}>Sarcastic</option>
        <option value="adaptive" ${cfg.personality==='adaptive'?'selected':''}>Adaptive</option>
      </select>
    </div>
    <div class="sb-field">
      <label>Reply on @Mention</label>
      <select id="sb-mentionReply">
        <option value="true" ${cfg.mentionAlwaysReply?'selected':''}>Yes</option>
        <option value="false" ${!cfg.mentionAlwaysReply?'selected':''}>No</option>
      </select>
    </div>
    <div class="sb-field">
      <label>Reply on Name Mention</label>
      <select id="sb-nameReply">
        <option value="true" ${cfg.nameAlwaysReply?'selected':''}>Yes</option>
        <option value="false" ${!cfg.nameAlwaysReply?'selected':''}>No</option>
      </select>
    </div>
  </div>
  <button class="sb-save-btn" onclick="sbSave()">💾 Save Settings</button>
</div>

<div class="card sb-section">
  <h3>📢 Channel Whitelist / Blacklist</h3>
  <p style="opacity:.6;margin-bottom:12px;font-size:13px">Control which channels SmartBot can respond in. Leave both empty to respond everywhere.</p>
  <div class="sb-grid">
    <div class="sb-field">
      <label>Allowed Channels (whitelist)</label>
      <select id="sb-allowedChannels" multiple style="min-height:80px"></select>
      <span style="font-size:11px;opacity:.5">Hold Ctrl to select multiple. Empty = all channels.</span>
    </div>
    <div class="sb-field">
      <label>Ignored Channels (blacklist)</label>
      <select id="sb-ignoredChannels" multiple style="min-height:80px"></select>
      <span style="font-size:11px;opacity:.5">SmartBot will never reply in these channels.</span>
    </div>
  </div>
  <button class="sb-save-btn" onclick="sbSaveChannels()">💾 Save Channel Settings</button>
</div>

<div class="card sb-section">
  <h3>🧪 Test SmartBot</h3>
  <p style="opacity:.6;margin-bottom:12px;font-size:13px">Send a test message and see how SmartBot responds.</p>
  <div class="sb-grid">
    <div class="sb-field" style="grid-column:1/-1">
      <label>Test Message</label>
      <input type="text" id="sb-test-msg" placeholder="e.g. hey bot, when's the next stream?" onkeydown="if(event.key==='Enter')sbTest()">
    </div>
  </div>
  <button class="sb-save-btn" onclick="sbTest()" style="background:#3498db">🧪 Test Reply</button>
  <div id="sb-test-result" style="margin-top:12px;display:none;background:#1a1a2e;padding:12px;border-radius:8px;border:1px solid #333">
    <div style="font-size:11px;opacity:.5;margin-bottom:4px">SmartBot Response:</div>
    <div id="sb-test-reply" style="font-size:14px"></div>
  </div>
</div>

${_sbToastScript()}
<script>
function sbSave(){
  fetch('/api/smartbot/config',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      enabled:document.getElementById('sb-enabled').checked,
      replyChance:parseFloat(document.getElementById('sb-replyChance').value),
      cooldownMs:parseInt(document.getElementById('sb-cooldownMs').value),
      minMessagesBetween:parseInt(document.getElementById('sb-minMsgBetween').value),
      markovChance:parseFloat(document.getElementById('sb-markovChance').value),
      maxResponseLength:parseInt(document.getElementById('sb-maxLen').value),
      personality:document.getElementById('sb-personality').value,
      mentionAlwaysReply:document.getElementById('sb-mentionReply').value==='true',
      nameAlwaysReply:document.getElementById('sb-nameReply').value==='true'
    })
  }).then(function(r){return r.json();}).then(function(){sbToast();});
}
function sbSaveChannels(){
  var allowed=Array.from(document.getElementById('sb-allowedChannels').selectedOptions).map(function(o){return o.value;});
  var ignored=Array.from(document.getElementById('sb-ignoredChannels').selectedOptions).map(function(o){return o.value;});
  fetch('/api/smartbot/config',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({allowedChannels:allowed,ignoredChannels:ignored})
  }).then(function(r){return r.json();}).then(function(){sbToast('Channel settings saved!');});
}
function sbTest(){
  var msg=document.getElementById('sb-test-msg').value.trim();
  if(!msg){sbToast('Enter a message first');return;}
  document.getElementById('sb-test-result').style.display='block';
  document.getElementById('sb-test-reply').textContent='Thinking...';
  fetch('/api/smartbot/test',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({message:msg})
  }).then(function(r){return r.json();}).then(function(d){
    document.getElementById('sb-test-reply').textContent=d.reply||'(no reply)';
  }).catch(function(){
    document.getElementById('sb-test-reply').textContent='Error testing.';
  });
}
// Load channel lists
(function(){
  fetch('/api/channels').then(function(r){return r.json();}).then(function(channels){
    var allowed=${JSON.stringify(cfg.allowedChannels||[])};
    var ignored=${JSON.stringify(cfg.ignoredChannels||[])};
    var textChannels=channels.filter(function(c){return c.type===0||c.type===5;});
    var selA=document.getElementById('sb-allowedChannels');
    var selI=document.getElementById('sb-ignoredChannels');
    textChannels.forEach(function(c){
      var optA=document.createElement('option');optA.value=c.id;optA.textContent='#'+c.name;
      if(allowed.includes(c.id))optA.selected=true;selA.appendChild(optA);
      var optI=document.createElement('option');optI.value=c.id;optI.textContent='#'+c.name;
      if(ignored.includes(c.id))optI.selected=true;selI.appendChild(optI);
    });
  });
})();
</script>`;
}

export function renderSmartBotKnowledgeTab(smartBot) {
  const knowledge = smartBot.getKnowledge();
  const customEntries = Object.entries(knowledge.customEntries || {});
  return `
${_sbStyles()}
<div class="card">
  <h2>📚 Knowledge Base</h2>
  <p style="opacity:.6;margin-bottom:16px">Set info so the bot can answer questions like "when's the next stream?" or "what game are you playing?"</p>
  <div class="sb-grid">
    <div class="sb-field">
      <label>Streamer Name</label>
      <input type="text" id="sb-streamerName" value="${knowledge.streamerName || ''}" placeholder="e.g. YourName">
    </div>
    <div class="sb-field">
      <label>Stream Schedule</label>
      <input type="text" id="sb-schedule" value="${knowledge.streamSchedule || ''}" placeholder="e.g. Mon/Wed/Fri at 7pm EST">
    </div>
    <div class="sb-field">
      <label>Next Stream</label>
      <input type="text" id="sb-nextStream" value="${knowledge.nextStream || ''}" placeholder="e.g. Tomorrow at 7pm">
    </div>
    <div class="sb-field">
      <label>Server Info</label>
      <textarea id="sb-serverInfo" placeholder="About this Discord server...">${knowledge.serverInfo || ''}</textarea>
    </div>
    <div class="sb-field">
      <label>Rules Summary</label>
      <textarea id="sb-rules" placeholder="Server rules summary...">${knowledge.rules || ''}</textarea>
    </div>
    <div class="sb-field">
      <label>YouTube</label>
      <input type="text" id="sb-social-youtube" value="${(knowledge.socials||{}).youtube || ''}" placeholder="YouTube URL">
    </div>
    <div class="sb-field">
      <label>Twitter / X</label>
      <input type="text" id="sb-social-twitter" value="${(knowledge.socials||{}).twitter || ''}" placeholder="Twitter URL">
    </div>
    <div class="sb-field">
      <label>Instagram</label>
      <input type="text" id="sb-social-instagram" value="${(knowledge.socials||{}).instagram || ''}" placeholder="Instagram URL">
    </div>
    <div class="sb-field">
      <label>TikTok</label>
      <input type="text" id="sb-social-tiktok" value="${(knowledge.socials||{}).tiktok || ''}" placeholder="TikTok URL">
    </div>
  </div>
  <button class="sb-save-btn" onclick="sbSaveKnowledge()">💾 Save Knowledge</button>
</div>

<div class="card sb-section">
  <h3>📝 Custom Info Entries</h3>
  <p style="opacity:.6;margin-bottom:12px;font-size:13px">Add custom Q&A entries. The bot will respond with the answer when someone asks a question containing any of the trigger patterns.</p>
  <div id="sb-custom-list">
    ${customEntries.length === 0 ? '<p style="opacity:.4">No custom entries yet.</p>' :
      customEntries.map(([k, v]) => `
        <div class="sb-custom-row">
          <span class="key">${k}</span>
          <span class="patterns">${(v.patterns||[]).join(', ')}</span>
          <span style="flex:1;font-size:13px">${v.answer.substring(0,60)}${v.answer.length>60?'...':''}</span>
          <button class="del-btn" onclick="sbDelCustom('${k}')">✕</button>
        </div>`).join('')}
  </div>
  <div style="margin-top:12px;display:grid;gap:8px">
    <div class="sb-field">
      <label>Key (unique ID)</label>
      <input type="text" id="sb-custom-key" placeholder="e.g. discord-link">
    </div>
    <div class="sb-field">
      <label>Trigger patterns (comma separated)</label>
      <input type="text" id="sb-custom-patterns" placeholder="e.g. discord link, invite link, join server">
    </div>
    <div class="sb-field">
      <label>Answer</label>
      <textarea id="sb-custom-answer" placeholder="The response the bot will give..."></textarea>
    </div>
    <button class="sb-save-btn" onclick="sbAddCustom()">➕ Add Custom Entry</button>
  </div>
</div>

<div class="card sb-section">
  <h3>📖 Learned Subjects</h3>
  <p style="opacity:.6;margin-bottom:12px;font-size:13px">Subjects the bot has automatically learned from chat conversations.</p>
  <div id="sb-learned-list"><p style="opacity:.4">Loading...</p></div>
</div>

${_sbToastScript()}
<script>
function sbSaveKnowledge(){
  var socials={};
  var yt=document.getElementById('sb-social-youtube').value.trim();if(yt)socials.youtube=yt;
  var tw=document.getElementById('sb-social-twitter').value.trim();if(tw)socials.twitter=tw;
  var ig=document.getElementById('sb-social-instagram').value.trim();if(ig)socials.instagram=ig;
  var tk=document.getElementById('sb-social-tiktok').value.trim();if(tk)socials.tiktok=tk;
  fetch('/api/smartbot/knowledge',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      streamerName:document.getElementById('sb-streamerName').value,
      streamSchedule:document.getElementById('sb-schedule').value,
      nextStream:document.getElementById('sb-nextStream').value,
      serverInfo:document.getElementById('sb-serverInfo').value,
      rules:document.getElementById('sb-rules').value,
      socials:socials
    })
  }).then(function(r){return r.json();}).then(function(){sbToast('Knowledge saved!');});
}
function sbAddCustom(){
  var key=document.getElementById('sb-custom-key').value.trim();
  var patterns=document.getElementById('sb-custom-patterns').value.split(',').map(function(s){return s.trim();}).filter(Boolean);
  var answer=document.getElementById('sb-custom-answer').value.trim();
  if(!key||!patterns.length||!answer){sbToast('Fill all fields');return;}
  fetch('/api/smartbot/knowledge/custom',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({key:key,patterns:patterns,answer:answer})
  }).then(function(r){return r.json();}).then(function(){location.reload();});
}
function sbDelCustom(key){
  if(!confirm('Delete entry "'+key+'"?'))return;
  fetch('/api/smartbot/knowledge/custom/'+encodeURIComponent(key),{method:'DELETE'})
    .then(function(r){return r.json();}).then(function(){location.reload();});
}
// Load learned subjects
(function(){
  fetch('/api/smartbot/learned').then(function(r){return r.json();}).then(function(d){
    var el=document.getElementById('sb-learned-list');
    var subjects=d.subjects||[];
    if(!subjects.length){el.innerHTML='<p style="opacity:.4">No learned subjects yet.</p>';return;}
    var html='<table class="sb-table"><thead><tr><th>Subject</th><th>Mentions</th><th>Sentiment</th><th>Last Seen</th></tr></thead><tbody>';
    subjects.forEach(function(s){
      var sentiment=s.positive>s.negative?'👍 Positive':s.negative>s.positive?'👎 Negative':'😐 Neutral';
      html+='<tr><td><strong>'+s.name+'</strong></td><td>'+s.mentions+'</td><td>'+sentiment+'</td><td>'+new Date(s.lastSeen).toLocaleDateString()+'</td></tr>';
    });
    html+='</tbody></table>';
    el.innerHTML=html;
  }).catch(function(){document.getElementById('sb-learned-list').innerHTML='<p style="opacity:.4">Error loading learned subjects.</p>';});
})();
</script>`;
}

export function renderSmartBotNewsTab(smartBot) {
  const cfg = smartBot.getConfig();
  return `
${_sbStyles()}
<div class="card">
  <h2>📰 News Feed Channel</h2>
  <p style="opacity:.6;margin-bottom:16px">Set a channel where news headlines are automatically posted. Uses Reddit (free) for content.</p>
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
  <h3>🔗 Additional RSS Sources</h3>
  <p style="opacity:.6;margin-bottom:12px;font-size:13px">Add custom RSS feed URLs to include in the news posts.</p>
  <div class="sb-field" style="margin-bottom:12px">
    <label>RSS Feed URLs (one per line)</label>
    <textarea id="sb-rssFeeds" rows="4" placeholder="https://example.com/feed.xml">${(cfg.rssFeeds || []).join('\\n')}</textarea>
  </div>
  <button class="sb-save-btn" onclick="sbSaveRSS()">💾 Save RSS Sources</button>
</div>

<div class="card sb-section">
  <h3>🛡️ News Filters</h3>
  <p style="opacity:.6;margin-bottom:12px;font-size:13px">Filter out unwanted content from news posts.</p>
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

${_sbToastScript()}
<script>
function sbSaveNews(){
  var topics=document.getElementById('sb-newsTopics').value.split(',').map(function(s){return s.trim();}).filter(Boolean);
  fetch('/api/smartbot/config',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      newsChannelId:document.getElementById('sb-newsChannel').value,
      newsInterval:parseInt(document.getElementById('sb-newsInterval').value)||4,
      newsTopics:topics
    })
  }).then(function(r){return r.json();}).then(function(){sbToast('News settings saved!');});
}
function sbSaveRSS(){
  var feeds=document.getElementById('sb-rssFeeds').value.split('\\n').map(function(s){return s.trim();}).filter(Boolean);
  fetch('/api/smartbot/config',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({rssFeeds:feeds})
  }).then(function(r){return r.json();}).then(function(){sbToast('RSS sources saved!');});
}
function sbSaveFilters(){
  var blocked=document.getElementById('sb-newsBlocked').value.split(',').map(function(s){return s.trim();}).filter(Boolean);
  fetch('/api/smartbot/config',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      newsBlockedKeywords:blocked,
      newsNsfwFilter:document.getElementById('sb-newsNsfw').value==='true'
    })
  }).then(function(r){return r.json();}).then(function(){sbToast('Filters saved!');});
}
function sbPostNow(){
  fetch('/api/smartbot/news/post',{method:'POST'})
    .then(function(r){return r.json();}).then(function(d){
      sbToast(d.success?'News posted!':'Failed: '+(d.error||'unknown'));
    });
}
// Load news channel dropdown + last news
(function(){
  fetch('/api/channels').then(function(r){return r.json();}).then(function(channels){
    var sel=document.getElementById('sb-newsChannel');
    if(!sel)return;
    var currentId='${cfg.newsChannelId || ''}';
    var textChannels=channels.filter(function(c){return c.type===0||c.type===5;});
    textChannels.forEach(function(c){
      var opt=document.createElement('option');
      opt.value=c.id;
      opt.textContent='#'+c.name;
      if(c.id===currentId)opt.selected=true;
      sel.appendChild(opt);
    });
  });
  fetch('/api/smartbot/news/last').then(function(r){return r.json();}).then(function(d){
    var el=document.getElementById('sb-last-news');
    if(!d.post){el.innerHTML='<p style="opacity:.4">No news posted yet.</p>';return;}
    el.innerHTML='<div style="background:#1a1a2e;padding:12px;border-radius:8px;border:1px solid #333"><div style="font-size:11px;opacity:.5;margin-bottom:4px">Posted '+new Date(d.post.timestamp).toLocaleString()+'</div><div style="font-size:14px">'+d.post.content.substring(0,500)+'</div></div>';
  }).catch(function(){document.getElementById('sb-last-news').innerHTML='<p style="opacity:.4">Unable to load last post.</p>';});
})();
</script>

<!-- ── RSS Feeds Feature ── -->
<div class="card" style="margin-top:16px;border-left:3px solid #ff9800">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
    <div style="display:flex;align-items:center;gap:8px">
      <span style="font-size:18px">📡</span>
      <div>
        <strong style="color:#e0e0e0;font-size:14px">RSS Feeds</strong>
        <div style="color:#8b8fa3;font-size:11px;margin-top:2px">Auto-post updates from RSS/Atom feeds to Discord channels.</div>
      </div>
    </div>
    <label style="position:relative;display:inline-block;width:44px;height:24px;cursor:pointer;flex-shrink:0">
      <input type="checkbox" id="if_rss_enabled" style="opacity:0;width:0;height:0">
      <span style="position:absolute;top:0;left:0;right:0;bottom:0;background:#3a3a42;border-radius:12px;transition:.3s"></span>
      <span id="if_rss_slider" style="position:absolute;top:2px;left:2px;width:20px;height:20px;background:#888;border-radius:50%;transition:.3s"></span>
    </label>
  </div>
  <div style="padding-top:8px;border-top:1px solid #2a2f3a">
    <div id="rss_feeds_list" style="margin-bottom:8px"><div style="color:#8b8fa3;font-size:12px">Loading feeds...</div></div>
    <div style="color:#8b8fa3;font-size:11px;margin-bottom:6px">Add a new RSS feed:</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <div><label style="font-size:11px;color:#8b8fa3;display:block;margin-bottom:3px">Feed URL</label><input id="if_rss_url" placeholder="https://example.com/feed.xml" style="width:100%;padding:8px 10px;border:1px solid #3a3a42;border-radius:6px;background:#1d2028;color:#e0e0e0;font-size:12px"></div>
      <div><label style="font-size:11px;color:#8b8fa3;display:block;margin-bottom:3px">Channel ID</label><input id="if_rss_ch" placeholder="Channel to post in" style="width:100%;padding:8px 10px;border:1px solid #3a3a42;border-radius:6px;background:#1d2028;color:#e0e0e0;font-size:12px"></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
      <div><label style="font-size:11px;color:#8b8fa3;display:block;margin-bottom:3px">Label</label><input id="if_rss_label" placeholder="My Feed" style="width:100%;padding:8px 10px;border:1px solid #3a3a42;border-radius:6px;background:#1d2028;color:#e0e0e0;font-size:12px"></div>
      <div><label style="font-size:11px;color:#8b8fa3;display:block;margin-bottom:3px">Check Interval (min, 5-1440)</label><input id="if_rss_interval" type="number" min="5" max="1440" value="30" style="width:100%;padding:8px 10px;border:1px solid #3a3a42;border-radius:6px;background:#1d2028;color:#e0e0e0;font-size:12px"></div>
    </div>
    <div style="display:flex;gap:8px;align-items:center;margin-top:8px">
      <button onclick="saveRssFeed()" style="padding:6px 16px;background:#5b5bff;color:#fff;border:none;border-radius:6px;font-size:12px;cursor:pointer;font-weight:600">💾 Save</button>
      <span id="if_rss_status" style="font-size:12px"></span>
    </div>
  </div>
</div>
<script>
(function(){
  var en=document.getElementById('if_rss_enabled'),sl=document.getElementById('if_rss_slider');
  fetch('/api/features/rss-feeds').then(function(r){return r.json()}).then(function(d){
    var c=d.config||d;
    if(en){en.checked=!!c.enabled;if(sl){sl.style.transform=c.enabled?'translateX(20px)':'translateX(0)';sl.style.background=c.enabled?'#4caf50':'#888';}en.addEventListener('change',function(){if(sl){sl.style.transform=this.checked?'translateX(20px)':'translateX(0)';sl.style.background=this.checked?'#4caf50':'#888';}});}
    var list=document.getElementById('rss_feeds_list');
    if(c.feeds&&c.feeds.length){
      list.innerHTML=c.feeds.map(function(f,i){return '<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 8px;background:#1d2028;border-radius:4px;margin-bottom:4px"><div style="font-size:12px;color:#e0e0e0"><strong>'+(f.label||'Feed '+(i+1))+'</strong><span style="color:#8b8fa3;margin-left:8px">'+f.url.substring(0,50)+'</span></div><button onclick="removeRssFeed('+i+')" style="background:none;border:none;color:#ef5350;cursor:pointer;font-size:14px">\\u2716</button></div>'}).join('');
    } else { list.innerHTML='<div style="color:#8b8fa3;font-size:12px;font-style:italic">No RSS feeds configured yet.</div>'; }
  }).catch(function(){document.getElementById('rss_feeds_list').innerHTML='<div style="color:#8b8fa3;font-size:12px">Unable to load.</div>';});
})();
function saveRssFeed(){
  var body={enabled:document.getElementById('if_rss_enabled').checked};
  var url=document.getElementById('if_rss_url').value.trim();
  if(url){body.addFeed={url:url,channelId:document.getElementById('if_rss_ch').value.trim(),label:document.getElementById('if_rss_label').value.slice(0,50),intervalMin:parseInt(document.getElementById('if_rss_interval').value)||30};}
  fetch('/api/features/rss-feeds',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(function(r){return r.json()}).then(function(d){var st=document.getElementById('if_rss_status');if(d.success){st.innerHTML='<span style="color:#2ecc71">\\u2705 Saved!</span>';setTimeout(function(){location.reload()},1000);}else{st.innerHTML='<span style="color:#ef5350">\\u274c '+(d.error||'Error')+'</span>';}}).catch(function(e){alert(e.message);});
}
function removeRssFeed(idx){
  fetch('/api/features/rss-feeds',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({removeFeedIndex:idx})}).then(function(r){return r.json()}).then(function(d){if(d.success)location.reload();else alert(d.error||'Error');}).catch(function(e){alert(e.message);});
}
</script>`;
}

export function renderSmartBotStatsTab(smartBot) {
  const stats = smartBot.getStats();
  const cfg = smartBot.getConfig();
  return `
${_sbStyles()}
<div class="card">
  <h2>📊 SmartBot Statistics</h2>
  <p style="opacity:.6;margin-bottom:16px">Overview of SmartBot activity and performance metrics.</p>
  <div class="sb-grid">
    <div class="sb-stat"><div class="val">${stats.totalReplies || 0}</div><div class="lbl">Total Replies</div></div>
    <div class="sb-stat"><div class="val">${stats.templateReplies || 0}</div><div class="lbl">Template Replies</div></div>
    <div class="sb-stat"><div class="val">${stats.markovReplies || 0}</div><div class="lbl">Markov Replies</div></div>
    <div class="sb-stat"><div class="val">${stats.mentionReplies || 0}</div><div class="lbl">Mention Replies</div></div>
    <div class="sb-stat"><div class="val">${stats.trainedPairHits || 0}</div><div class="lbl">Trained Pair Hits</div></div>
    <div class="sb-stat"><div class="val">${stats.learnedSubjects || 0}</div><div class="lbl">Learned Subjects</div></div>
    <div class="sb-stat"><div class="val">${stats.serverExpressions || 0}</div><div class="lbl">Server Expressions</div></div>
  </div>
</div>

<div class="card sb-section">
  <h3>📈 Reply Type Breakdown</h3>
  <div style="margin-top:12px">
    ${(() => {
      const total = (stats.totalReplies || 1);
      const templatePct = Math.round(((stats.templateReplies || 0) / total) * 100);
      const markovPct = Math.round(((stats.markovReplies || 0) / total) * 100);
      const trainedPct = Math.round(((stats.trainedPairHits || 0) / total) * 100);
      const otherPct = Math.max(0, 100 - templatePct - markovPct - trainedPct);
      return `
      <div style="margin-bottom:10px"><span style="opacity:.6;font-size:13px">Template (${templatePct}%)</span><div class="sb-progress"><div class="sb-progress-bar" style="width:${templatePct}%;background:#9146ff"></div></div></div>
      <div style="margin-bottom:10px"><span style="opacity:.6;font-size:13px">Markov (${markovPct}%)</span><div class="sb-progress"><div class="sb-progress-bar" style="width:${markovPct}%;background:#3498db"></div></div></div>
      <div style="margin-bottom:10px"><span style="opacity:.6;font-size:13px">Trained Pairs (${trainedPct}%)</span><div class="sb-progress"><div class="sb-progress-bar" style="width:${trainedPct}%;background:#22c55e"></div></div></div>
      <div style="margin-bottom:10px"><span style="opacity:.6;font-size:13px">Other (${otherPct}%)</span><div class="sb-progress"><div class="sb-progress-bar" style="width:${otherPct}%;background:#8b8fa3"></div></div></div>`;
    })()}
  </div>
</div>

<div class="card sb-section">
  <h3>📊 Topic Breakdown</h3>
  <div class="sb-grid">
    ${Object.entries(stats.topicReplies || {}).sort((a,b)=>b[1]-a[1]).map(([t,c])=>`
      <div class="sb-stat"><div class="val">${c}</div><div class="lbl">${t}</div></div>
    `).join('') || '<p style="opacity:.4">No topic data yet.</p>'}
  </div>
</div>

<div class="card sb-section">
  <h3>🏆 Top SmartBot Users</h3>
  <div id="sb-top-users"><p style="opacity:.4">Loading...</p></div>
</div>

<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
<script>
(function(){
  fetch('/api/smartbot/top-users').then(function(r){return r.json();}).then(function(d){
    var el=document.getElementById('sb-top-users');
    var users=d.users||[];
    if(!users.length){el.innerHTML='<p style="opacity:.4">No user data yet.</p>';return;}
    var html='<table class="sb-table"><thead><tr><th>#</th><th>User</th><th>Interactions</th></tr></thead><tbody>';
    users.forEach(function(u,i){
      html+='<tr><td>'+(i+1)+'</td><td>'+u.id+'</td><td>'+u.count+'</td></tr>';
    });
    html+='</tbody></table>';el.innerHTML=html;
  });
})();
</script>`;
}

export function renderSmartBotLearningTab(smartBot) {
  const stats = smartBot.getStats();
  return `
${_sbStyles()}
<div class="card">
  <h2>📖 Learning & Social</h2>
  <p style="opacity:.6;margin-bottom:16px">View what SmartBot has learned from conversations, server slang, and more.</p>
  <div class="sb-grid">
    <div class="sb-stat"><div class="val">${stats.learnedSubjects || 0}</div><div class="lbl">Learned Subjects</div></div>
    <div class="sb-stat"><div class="val">${stats.pendingSubjects || 0}</div><div class="lbl">Pending Subjects</div></div>
    <div class="sb-stat"><div class="val">${stats.learningLogEntries || 0}</div><div class="lbl">Log Entries</div></div>
    <div class="sb-stat"><div class="val">${stats.serverExpressions || 0}</div><div class="lbl">Server Expressions</div></div>
    <div class="sb-stat"><div class="val">${stats.trainedPairs || 0}</div><div class="lbl">Trained Pairs</div></div>
  </div>
</div>

<div class="card sb-section">
  <h3>📋 Learning Log (Recent)</h3>
  <div id="sb-learn-log"><p style="opacity:.4">Loading...</p></div>
</div>

<div class="card sb-section">
  <h3>�️ Server Slang</h3>
  <div id="sb-slang"><p style="opacity:.4">Loading...</p></div>
</div>

<div class="card sb-section">
  <h3>👍 Feedback Scores</h3>
  <div id="sb-feedback"><p style="opacity:.4">Loading...</p></div>
</div>

<script>
(function(){
  fetch('/api/smartbot/learning-log').then(function(r){return r.json();}).then(function(d){
    var el=document.getElementById('sb-learn-log');
    var entries=d.entries||[];
    if(!entries.length){el.innerHTML='<p style="opacity:.4">No learning log entries yet.</p>';return;}
    var html='<table class="sb-table"><thead><tr><th>Time</th><th>Type</th><th>Details</th></tr></thead><tbody>';
    entries.forEach(function(e){
      html+='<tr><td style="white-space:nowrap">'+new Date(e.timestamp).toLocaleString()+'</td><td><span class="sb-badge" style="background:#9146ff30;color:#9146ff">'+e.type+'</span></td><td style="font-size:12px">'+e.details+'</td></tr>';
    });
    html+='</tbody></table>';el.innerHTML=html;
  });
  fetch('/api/smartbot/slang').then(function(r){return r.json();}).then(function(d){
    var el=document.getElementById('sb-slang');
    var expressions=d.expressions||[];
    if(!expressions.length){el.innerHTML='<p style="opacity:.4">No server slang tracked yet.</p>';return;}
    var html='<div class="sb-grid">';
    expressions.forEach(function(e){
      html+='<div class="sb-stat"><div class="val">'+e.count+'</div><div class="lbl">"'+e.phrase+'" ('+e.users+' users)</div></div>';
    });
    html+='</div>';el.innerHTML=html;
  });
  fetch('/api/smartbot/feedback').then(function(r){return r.json();}).then(function(d){
    var el=document.getElementById('sb-feedback');
    var templates=d.templates||[];
    if(!templates.length){el.innerHTML='<p style="opacity:.4">No feedback data yet.</p>';return;}
    var html='<table class="sb-table"><thead><tr><th>Template</th><th>👍</th><th>👎</th><th>Uses</th><th>Score</th></tr></thead><tbody>';
    templates.forEach(function(t){
      var score=t.uses>=3?((t.positive-t.negative)/t.uses).toFixed(2):'—';
      var color=parseFloat(score)>0?'#22c55e':parseFloat(score)<0?'#e74c3c':'#8b8fa3';
      html+='<tr><td>'+t.key+'</td><td>'+t.positive+'</td><td>'+t.negative+'</td><td>'+t.uses+'</td><td style="color:'+color+';font-weight:600">'+score+'</td></tr>';
    });
    html+='</tbody></table>';el.innerHTML=html;
  });
})();
</script>`;
}

// ======================== SMART BOT API ROUTES ========================

export function registerSmartBotRoutes(app, { smartBot, requireAuth, debouncedSaveState, saveState, checkNewsFeed }) {
  app.get('/api/smartbot/config', requireAuth, (req, res) => {
    res.json({ success: true, config: smartBot.getConfig(), stats: smartBot.getStats() });
  });

  app.post('/api/smartbot/config', requireAuth, (req, res) => {
    const allowed = ['enabled', 'replyChance', 'cooldownMs', 'minMessagesBetween',
      'markovChance', 'maxResponseLength', 'personality', 'mentionAlwaysReply',
      'nameAlwaysReply', 'allowedChannels', 'ignoredChannels',
      'newsChannelId', 'newsInterval', 'newsTopics',
      'rssFeeds', 'newsBlockedKeywords', 'newsNsfwFilter'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    // Server-side validation on numeric config values
    if (updates.replyChance !== undefined) updates.replyChance = Math.max(0, Math.min(1, Number(updates.replyChance) || 0));
    if (updates.cooldownMs !== undefined) updates.cooldownMs = Math.max(1000, Math.min(300000, Math.round(Number(updates.cooldownMs) || 30000)));
    if (updates.minMessagesBetween !== undefined) updates.minMessagesBetween = Math.max(0, Math.min(50, Math.round(Number(updates.minMessagesBetween) || 4)));
    if (updates.markovChance !== undefined) updates.markovChance = Math.max(0, Math.min(1, Number(updates.markovChance) || 0));
    if (updates.maxResponseLength !== undefined) updates.maxResponseLength = Math.max(20, Math.min(500, Math.round(Number(updates.maxResponseLength) || 200)));
    if (updates.newsInterval !== undefined) updates.newsInterval = Math.max(1, Math.min(24, Math.round(Number(updates.newsInterval) || 4)));
    smartBot.updateConfig(updates);
    saveState();
    res.json({ success: true, config: smartBot.getConfig() });
  });

  app.get('/api/smartbot/stats', requireAuth, (req, res) => {
    res.json({ success: true, stats: smartBot.getStats() });
  });

  app.get('/api/smartbot/knowledge', requireAuth, (req, res) => {
    res.json({ success: true, knowledge: smartBot.getKnowledge() });
  });

  app.post('/api/smartbot/knowledge', requireAuth, (req, res) => {
    const allowed = ['streamSchedule', 'nextStream', 'isLive', 'currentGame',
      'streamTitle', 'viewerCount', 'streamerName', 'socials', 'serverInfo', 'rules'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) smartBot.setKnowledge(key, req.body[key]);
    }
    saveState();
    res.json({ success: true, knowledge: smartBot.getKnowledge() });
  });

  app.post('/api/smartbot/knowledge/custom', requireAuth, (req, res) => {
    const { key, patterns, answer } = req.body;
    if (!key || !patterns || !answer) return res.status(400).json({ success: false, error: 'key, patterns, and answer required' });
    smartBot.setCustomEntry(key, patterns, answer);
    saveState();
    res.json({ success: true, knowledge: smartBot.getKnowledge() });
  });

  app.delete('/api/smartbot/knowledge/custom/:key', requireAuth, (req, res) => {
    smartBot.removeCustomEntry(req.params.key);
    saveState();
    res.json({ success: true, knowledge: smartBot.getKnowledge() });
  });

  app.post('/api/smartbot/test', requireAuth, async (req, res) => {
    const msg = String(req.body.message || '').trim();
    if (!msg) return res.status(400).json({ success: false, error: 'message required' });
    try {
      const fakeMsg = {
        content: msg, author: { id: 'dashboard-test', username: 'DashboardTest', bot: false },
        member: { displayName: 'DashboardTest' },
        channel: { id: 'test-channel', name: 'dashboard-test', send: async () => {} },
        guild: { id: 'test', name: 'Test', members: { fetch: async () => null } },
        mentions: { has: () => false }, reply: async (txt) => txt, react: async () => {}
      };
      const reply = await smartBot.generateReply(fakeMsg, 'mention');
      const text = typeof reply === 'string' ? reply : (reply?.content || reply?.text || JSON.stringify(reply) || '(no reply)');
      res.json({ success: true, reply: text });
    } catch (e) { res.json({ success: true, reply: '(error: ' + e.message + ')' }); }
  });

  app.get('/api/smartbot/top-users', requireAuth, (req, res) => {
    const prefs = smartBot.userPreferences;
    const users = [];
    for (const [id, data] of prefs) {
      users.push({ id, count: data.messageCount || data.interactions || 0 });
    }
    users.sort((a, b) => b.count - a.count);
    res.json({ success: true, users: users.slice(0, 20) });
  });

  app.get('/api/smartbot/reply-history', requireAuth, (req, res) => {
    const stats = smartBot.stats;
    const dailyReplies = stats.dailyReplies || {};
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key, count: dailyReplies[key] || 0 });
    }
    res.json({ success: true, history: days });
  });

  app.get('/api/smartbot/learning-log', requireAuth, (req, res) => {
    const entries = smartBot.learningLog.getRecent(50);
    res.json({ success: true, entries });
  });

  app.get('/api/smartbot/learned', requireAuth, (req, res) => {
    const subjects = [];
    for (const [name, data] of smartBot.learnedKnowledge.subjects) {
      subjects.push({
        name, mentions: data.mentions,
        positive: (data.sentiments || {}).positive || 0,
        negative: (data.sentiments || {}).negative || 0,
        neutral: (data.sentiments || {}).neutral || 0,
        lastSeen: data.lastSeen, users: data.users || 0
      });
    }
    subjects.sort((a, b) => b.mentions - a.mentions);
    res.json({ success: true, subjects: subjects.slice(0, 100) });
  });

  app.get('/api/smartbot/slang', requireAuth, (req, res) => {
    const expressions = smartBot.slangTracker.getPopular();
    res.json({ success: true, expressions });
  });

  app.get('/api/smartbot/feedback', requireAuth, (req, res) => {
    const templates = [];
    for (const [key, data] of smartBot.feedback.templateScores) {
      templates.push({ key, ...data });
    }
    templates.sort((a, b) => b.uses - a.uses);
    res.json({ success: true, templates: templates.slice(0, 50) });
  });

  app.post('/api/smartbot/news/post', requireAuth, async (req, res) => {
    try {
      if (typeof checkNewsFeed === 'function') { await checkNewsFeed(true); }
      res.json({ success: true });
    } catch (e) { res.json({ success: false, error: 'News post failed' }); }
  });

  app.get('/api/smartbot/news/last', requireAuth, (req, res) => {
    res.json({ success: true, post: smartBot.config?.lastNewsPost || null });
  });

  // ======================== TRAINING API ========================

  // Training scenario pool — common chat messages to test the bot against
  const TRAINING_SCENARIOS = [
    // Greetings & casual
    'hey whats up', 'good morning everyone', 'yo anyone here', 'sup chat', 'gn guys',
    'just got here what did i miss', 'im so bored rn', 'whats everyone doing',
    // Stream related
    'when is the next stream', 'what game are you playing today', 'that was a great stream',
    'are you streaming tonight', 'love the content keep it up', 'how long have you been streaming',
    // Questions
    'whats your favorite game', 'do you like minecraft', 'what do you think about fortnite',
    'anyone played the new cod', 'whats the best anime this season', 'is valorant worth playing',
    'pc or console', 'what music do you listen to', 'any movie recommendations',
    // Opinions / debates
    'xbox or playstation', 'cats or dogs', 'pineapple on pizza yes or no',
    'whats the best food', 'is water wet', 'midnight snack suggestions',
    // Emotional / vibes
    'im having a bad day', 'lets gooo just got a clutch', 'that was so funny lmao',
    'im so hyped for this', 'this is cringe ngl', 'thats actually insane',
    // Help / commands
    'how does leveling work', 'how do i get roles', 'what are the server rules',
    'who are the mods here', 'how do i enter the giveaway',
    // Random
    'tell me something interesting', 'say something random', 'make me laugh',
    'whats 2 + 2', 'do you have feelings', 'are you a real person',
    'what time is it', 'how old are you', 'where are you from',
    // Topics
    'the new update is trash', 'this game is so broken', 'that play was insane',
    'who wants to play together', 'drop your favorite emoji', 'unpopular opinion time',
  ];

  // Training state stored on smartBot
  if (!smartBot._trainingStats) {
    smartBot._trainingStats = { totalSessions: 0, approved: 0, rejected: 0, log: [] };
  }

  // Helper: normalize text for pair matching — MUST match SmartBot._normalizeForMatch
  function _normPair(text) {
    let t = String(text).toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
    // Expand contractions (must match smart-bot.js CONTRACTIONS map)
    const contractions = {
      'cant': 'can not', 'dont': 'do not', 'doesnt': 'does not', 'didnt': 'did not',
      'wont': 'will not', 'isnt': 'is not', 'arent': 'are not', 'wasnt': 'was not',
      'werent': 'were not', 'havent': 'have not', 'hasnt': 'has not', 'hadnt': 'had not',
      'shouldnt': 'should not', 'wouldnt': 'would not', 'couldnt': 'could not',
      'mustnt': 'must not', 'ive': 'i have', 'youve': 'you have', 'weve': 'we have',
      'theyve': 'they have', 'youre': 'you are', 'theyre': 'they are', 'were': 'we are',
      'hes': 'he is', 'shes': 'she is', 'thats': 'that is', 'whats': 'what is',
      'whos': 'who is', 'wheres': 'where is', 'heres': 'here is', 'theres': 'there is',
      'ill': 'i will', 'youll': 'you will', 'hell': 'he will', 'shell': 'she will',
      'well': 'we will', 'theyll': 'they will', 'id': 'i would', 'youd': 'you would',
      'hed': 'he would', 'shed': 'she would', 'wed': 'we would', 'theyd': 'they would',
      'im': 'i am', 'gonna': 'going to', 'wanna': 'want to', 'gotta': 'got to',
      'lemme': 'let me', 'gimme': 'give me', 'kinda': 'kind of', 'sorta': 'sort of',
    };
    t = t.replace(/\b\w+\b/g, w => contractions[w] || w);
    return t;
  }

  app.post('/api/smartbot/training/generate', requireAuth, async (req, res) => {
    try {
      // Pick a scenario: 50% from pool, 50% markov-generated
      let scenario;
      const markovStats = smartBot.markov?.getStats();
      if (Math.random() < 0.5 && markovStats && markovStats.totalTrained > 50) {
        scenario = smartBot.markov.generate(15);
      }
      if (!scenario) {
        scenario = TRAINING_SCENARIOS[Math.floor(Math.random() * TRAINING_SCENARIOS.length)];
      }

      // Get bot reply via the same mechanism as /api/smartbot/test
      const fakeMsg = {
        content: scenario,
        author: { id: 'training-user', username: 'TrainingUser', bot: false },
        member: { displayName: 'TrainingUser' },
        channel: { id: 'training-channel', name: 'training', send: async () => {} },
        guild: { id: 'training', name: 'Training', members: { fetch: async () => null } },
        mentions: { has: () => false }, reply: async (txt) => txt, react: async () => {}
      };
      const reply = await smartBot.generateReply(fakeMsg, 'mention');
      const text = typeof reply === 'string' ? reply : (reply?.content || reply?.text || JSON.stringify(reply) || '(no reply generated)');

      res.json({ success: true, scenario, reply: text });
    } catch (e) {
      res.json({ success: false, error: e.message });
    }
  });

  // Batch generate — 5 scenarios at once
  app.post('/api/smartbot/training/generate-batch', requireAuth, async (req, res) => {
    try {
      const count = Math.min(parseInt(req.body.count) || 5, 10);
      const results = [];
      const markovStats = smartBot.markov?.getStats();
      for (let i = 0; i < count; i++) {
        let scenario;
        if (Math.random() < 0.5 && markovStats && markovStats.totalTrained > 50) {
          scenario = smartBot.markov.generate(15);
        }
        if (!scenario) {
          scenario = TRAINING_SCENARIOS[Math.floor(Math.random() * TRAINING_SCENARIOS.length)];
        }
        const fakeMsg = {
          content: scenario,
          author: { id: 'training-user', username: 'TrainingUser', bot: false },
          member: { displayName: 'TrainingUser' },
          channel: { id: 'training-channel', name: 'training', send: async () => {} },
          guild: { id: 'training', name: 'Training', members: { fetch: async () => null } },
          mentions: { has: () => false }, reply: async (txt) => txt, react: async () => {}
        };
        const reply = await smartBot.generateReply(fakeMsg, 'mention');
        const text = typeof reply === 'string' ? reply : (reply?.content || reply?.text || JSON.stringify(reply) || '(no reply)');
        results.push({ scenario, reply: text });
      }
      res.json({ success: true, results });
    } catch (e) {
      res.json({ success: false, error: e.message });
    }
  });

  app.post('/api/smartbot/training/rate', requireAuth, (req, res) => {
    const { scenario, reply, approved, correction } = req.body;
    if (!scenario || typeof approved !== 'boolean') {
      return res.status(400).json({ success: false, error: 'scenario and approved required' });
    }

    const stats = smartBot._trainingStats;
    stats.totalSessions++;
    if (approved) stats.approved++;
    else stats.rejected++;

    const safeScenario = String(scenario).slice(0, 200);
    const safeReply = String(reply || '').slice(0, 400);
    const safeCorrection = correction ? String(correction).slice(0, 400) : null;

    // Record in training log (keep last 200)
    stats.log.push({
      ts: Date.now(),
      scenario: safeScenario,
      reply: safeReply,
      approved,
      correction: safeCorrection,
      user: req.userName || 'unknown'
    });
    if (stats.log.length > 200) stats.log.splice(0, stats.log.length - 200);

    // Feed into existing feedback system
    const templateKey = `training:${safeScenario.substring(0, 40)}`;
    smartBot.feedback.recordFeedback(templateKey, 'training', approved);
    smartBot.feedback.recordChannelFeedback('training-channel', approved);

    // Save as trained pair
    const normKey = _normPair(safeScenario);
    if (normKey.length >= 3) {
      if (approved) {
        // Approved — save scenario→reply as a trained pair
        const existing = smartBot.trainedPairs.get(normKey);
        smartBot.trainedPairs.set(normKey, {
          pattern: safeScenario,
          response: safeReply,
          score: existing ? Math.min(existing.score + 1, 10) : 1,
          uses: existing ? existing.uses : 0,
          created: existing ? existing.created : Date.now(),
          trainedBy: req.userName || 'unknown',
          channelId: 'training-dashboard'
        });
      } else if (safeCorrection) {
        // Rejected with correction — save scenario→correction as a trained pair
        smartBot.trainedPairs.set(normKey, {
          pattern: safeScenario,
          response: safeCorrection,
          score: 2, // higher confidence since user wrote it
          uses: 0,
          created: Date.now(),
          trainedBy: req.userName || 'unknown',
          channelId: 'training-dashboard'
        });
      } else {
        // Rejected without correction — downvote existing pair if any
        const existing = smartBot.trainedPairs.get(normKey);
        if (existing) {
          existing.score = Math.max(existing.score - 1, -5);
        }
      }
    }

    smartBot._rebuildPairIndex();
    debouncedSaveState();
    res.json({
      success: true,
      stats: { totalSessions: stats.totalSessions, approved: stats.approved, rejected: stats.rejected },
      pairsCount: smartBot.trainedPairs.size
    });
  });

  // Batch rate — rate multiple scenarios at once
  app.post('/api/smartbot/training/rate-batch', requireAuth, (req, res) => {
    const { ratings } = req.body;
    if (!Array.isArray(ratings)) return res.status(400).json({ success: false, error: 'ratings array required' });

    const stats = smartBot._trainingStats;
    for (const r of ratings) {
      if (!r.scenario || typeof r.approved !== 'boolean') continue;
      stats.totalSessions++;
      if (r.approved) stats.approved++;
      else stats.rejected++;

      const safeScenario = String(r.scenario).slice(0, 200);
      const safeReply = String(r.reply || '').slice(0, 400);
      const safeCorrection = r.correction ? String(r.correction).slice(0, 400) : null;

      stats.log.push({
        ts: Date.now(),
        scenario: safeScenario,
        reply: safeReply,
        approved: r.approved,
        correction: safeCorrection,
        user: req.userName || 'unknown'
      });

      const normKey = _normPair(safeScenario);
      if (normKey.length >= 3) {
        if (r.approved) {
          const existing = smartBot.trainedPairs.get(normKey);
          smartBot.trainedPairs.set(normKey, {
            pattern: safeScenario, response: safeReply,
            score: existing ? Math.min(existing.score + 1, 10) : 1,
            uses: existing ? existing.uses : 0, created: existing ? existing.created : Date.now(),
            trainedBy: req.userName || 'unknown', channelId: 'training-dashboard'
          });
        } else if (safeCorrection) {
          smartBot.trainedPairs.set(normKey, {
            pattern: safeScenario, response: safeCorrection,
            score: 2, uses: 0, created: Date.now(),
            trainedBy: req.userName || 'unknown', channelId: 'training-dashboard'
          });
        } else {
          const existing = smartBot.trainedPairs.get(normKey);
          if (existing) existing.score = Math.max(existing.score - 1, -5);
        }
      }

      const templateKey = `training:${safeScenario.substring(0, 40)}`;
      smartBot.feedback.recordFeedback(templateKey, 'training', r.approved);
    }
    if (stats.log.length > 200) stats.log.splice(0, stats.log.length - 200);
    smartBot._rebuildPairIndex();
    debouncedSaveState();
    res.json({
      success: true,
      stats: { totalSessions: stats.totalSessions, approved: stats.approved, rejected: stats.rejected },
      pairsCount: smartBot.trainedPairs.size
    });
  });

  app.get('/api/smartbot/training/stats', requireAuth, (req, res) => {
    const stats = smartBot._trainingStats;
    res.json({
      success: true,
      stats: { totalSessions: stats.totalSessions, approved: stats.approved, rejected: stats.rejected },
      pairsCount: smartBot.trainedPairs.size,
      log: (stats.log || []).slice(-50).reverse()
    });
  });

  // Trained pairs CRUD — with search and pagination
  app.get('/api/smartbot/training/pairs', requireAuth, (req, res) => {
    const search = (req.query.search || '').toLowerCase().trim();
    const pairs = [];
    for (const [key, val] of smartBot.trainedPairs) {
      if (search && !key.includes(search) && !(val.pattern || '').toLowerCase().includes(search) && !(val.response || '').toLowerCase().includes(search)) continue;
      pairs.push({ key, ...val });
    }
    pairs.sort((a, b) => (b.score || 0) - (a.score || 0));
    const page = Math.max(0, parseInt(req.query.page) || 0);
    const pageSize = 50;
    res.json({
      success: true,
      pairs: pairs.slice(page * pageSize, (page + 1) * pageSize),
      total: pairs.length, page, pageSize,
    });
  });

  app.delete('/api/smartbot/training/pairs', requireAuth, (req, res) => {
    const { key } = req.body;
    if (!key) return res.status(400).json({ success: false, error: 'key required' });
    smartBot.trainedPairs.delete(key);
    smartBot._rebuildPairIndex();
    debouncedSaveState();
    res.json({ success: true, pairsCount: smartBot.trainedPairs.size });
  });

  app.post('/api/smartbot/training/pairs/edit', requireAuth, (req, res) => {
    const { key, response } = req.body;
    if (!key || !response) return res.status(400).json({ success: false, error: 'key and response required' });
    const pair = smartBot.trainedPairs.get(key);
    if (!pair) return res.status(404).json({ success: false, error: 'pair not found' });
    pair.response = String(response).slice(0, 400);
    smartBot._rebuildPairIndex();
    debouncedSaveState();
    res.json({ success: true, pairsCount: smartBot.trainedPairs.size });
  });

  // Import chat history into Markov chain
  app.post('/api/smartbot/training/import', requireAuth, (req, res) => {
    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, error: 'messages array required' });
    }
    let imported = 0;
    for (const msg of messages.slice(0, 5000)) {
      const text = String(msg).trim();
      if (text.length < 5 || text.length > 500) continue;
      // Skip bot commands, links-only, etc
      if (text.startsWith('!') || text.startsWith('/') || /^https?:\/\/\S+$/.test(text)) continue;
      smartBot.markov.train(text);
      imported++;
    }
    debouncedSaveState();
    res.json({ success: true, imported, markovStats: smartBot.markov?.getStats() });
  });

  // Custom scenario — user types their own scenario and gets a reply
  app.post('/api/smartbot/training/custom', requireAuth, async (req, res) => {
    try {
      const scenario = String(req.body.scenario || '').trim().slice(0, 300);
      if (!scenario) return res.status(400).json({ success: false, error: 'scenario required' });
      const fakeMsg = {
        content: scenario,
        author: { id: 'training-user', username: 'TrainingUser', bot: false },
        member: { displayName: 'TrainingUser' },
        channel: { id: 'training-channel', name: 'training', send: async () => {} },
        guild: { id: 'training', name: 'Training', members: { fetch: async () => null } },
        mentions: { has: () => false }, reply: async (txt) => txt, react: async () => {}
      };
      const reply = await smartBot.generateReply(fakeMsg, 'mention');
      const text = typeof reply === 'string' ? reply : (reply?.content || reply?.text || '(no reply)');
      res.json({ success: true, scenario, reply: text });
    } catch (e) {
      res.json({ success: false, error: e.message });
    }
  });

  // (7C) Manual trained pairs backup
  app.post('/api/smartbot/training/backup', requireAuth, async (req, res) => {
    try {
      const { writeFile } = await import('fs/promises');
      const pairsObj = Object.fromEntries(smartBot.trainedPairs);
      const backupPath = './data/trained-pairs-backup.json';
      await writeFile(backupPath, JSON.stringify({ timestamp: Date.now(), count: smartBot.trainedPairs.size, pairs: pairsObj }, null, 2));
      res.json({ success: true, count: smartBot.trainedPairs.size, path: backupPath });
    } catch (e) {
      res.json({ success: false, error: e.message });
    }
  });

  // (10) Candidate pairs API — review QA candidates and corrections from auto-learning
  app.get('/api/smartbot/training/candidates', requireAuth, (req, res) => {
    const qa = smartBot._candidatePairs?.get('qa') || [];
    const corrections = smartBot._candidatePairs?.get('corrections') || [];
    res.json({ success: true, qa: qa.slice(-50), corrections: corrections.slice(-50) });
  });

  app.post('/api/smartbot/training/candidates/approve', requireAuth, (req, res) => {
    const { type, index } = req.body;
    if (!type || index === undefined) return res.status(400).json({ success: false, error: 'type and index required' });
    const list = smartBot._candidatePairs?.get(type);
    if (!list || !list[index]) return res.status(404).json({ success: false, error: 'candidate not found' });

    const candidate = list[index];
    if (type === 'qa') {
      const normKey = _normPair(candidate.question);
      if (normKey.length >= 3) {
        smartBot.trainedPairs.set(normKey, {
          pattern: candidate.question,
          response: candidate.answer,
          score: 1,
          uses: 0,
          created: Date.now(),
          source: 'qa_candidate'
        });
        smartBot._rebuildPairIndex();
      }
    } else if (type === 'corrections') {
      const normKey = _normPair(candidate.originalTopic || candidate.originalReply || '');
      if (normKey.length >= 3 && candidate.correction) {
        smartBot.trainedPairs.set(normKey, {
          pattern: candidate.originalTopic || candidate.originalReply,
          response: candidate.correction,
          score: 2,
          uses: 0,
          created: Date.now(),
          source: 'user_correction'
        });
        smartBot._rebuildPairIndex();
      }
    }
    list.splice(index, 1);
    saveState();
    res.json({ success: true, pairsCount: smartBot.trainedPairs.size });
  });

  app.post('/api/smartbot/training/candidates/reject', requireAuth, (req, res) => {
    const { type, index } = req.body;
    if (!type || index === undefined) return res.status(400).json({ success: false, error: 'type and index required' });
    const list = smartBot._candidatePairs?.get(type);
    if (!list || !list[index]) return res.status(404).json({ success: false, error: 'candidate not found' });
    list.splice(index, 1);
    res.json({ success: true });
  });
}

// ======================== TRAINING TAB ========================

export function renderSmartBotTrainingTab(smartBot) {
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
        '<button class="tr-del" onclick="trDeletePair(\\''+esc(p.key).replace(/'/g,"\\\\'")+'\\')">×</button>'+
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
        '<button onclick="trApproveCand(\\'qa\\','+i+')" style="background:#22c55e;border:0;color:#fff;border-radius:4px;padding:4px 12px;cursor:pointer;font-size:11px;margin-right:6px">✅ Approve</button>'+
        '<button onclick="trRejectCand(\\'qa\\','+i+')" style="background:#ef5350;border:0;color:#fff;border-radius:4px;padding:4px 12px;cursor:pointer;font-size:11px">❌ Reject</button>'+
      '</div>';
    });
    corr.forEach(function(c,i){
      html+='<div style="background:#1a1a2e;border-radius:8px;padding:10px 14px;margin-bottom:8px;border-left:3px solid #f59e0b">'+
        '<div style="font-size:10px;color:#555;margin-bottom:4px">User Correction · '+new Date(c.timestamp).toLocaleString()+'</div>'+
        '<div style="color:#ef5350;font-size:13px;margin-bottom:4px">❌ Bot said: '+esc(c.originalReply)+'</div>'+
        '<div style="color:#22c55e;font-size:13px;margin-bottom:8px">✅ Should be: '+esc(c.correction)+'</div>'+
        '<button onclick="trApproveCand(\\'corrections\\','+i+')" style="background:#22c55e;border:0;color:#fff;border-radius:4px;padding:4px 12px;cursor:pointer;font-size:11px;margin-right:6px">✅ Approve</button>'+
        '<button onclick="trRejectCand(\\'corrections\\','+i+')" style="background:#ef5350;border:0;color:#fff;border-radius:4px;padding:4px 12px;cursor:pointer;font-size:11px">❌ Reject</button>'+
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
