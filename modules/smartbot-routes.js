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
    <div class="sb-stat"><div class="val">${stats.ai?.enabled ? '✅ ON' : '❌ OFF'}</div><div class="lbl">Qwen AI</div></div>
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
  <p style="opacity:.6;margin-bottom:16px">Set a channel where news headlines are automatically posted. Uses Reddit (free) + Qwen AI summaries when available.</p>
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
    <div class="sb-stat"><div class="val">${(stats.ai?.groqCalls || 0) + (stats.ai?.hfCalls || 0)}</div><div class="lbl">AI Replies</div></div>
    <div class="sb-stat"><div class="val">${stats.ai?.cacheHits || 0}</div><div class="lbl">Cache Hits</div></div>
    <div class="sb-stat"><div class="val">${stats.learnedSubjects || 0}</div><div class="lbl">Learned Subjects</div></div>
    <div class="sb-stat"><div class="val">${stats.communityOpinions || 0}</div><div class="lbl">Community Opinions</div></div>
    <div class="sb-stat"><div class="val">${stats.trackedExperts || 0}</div><div class="lbl">Tracked Experts</div></div>
    <div class="sb-stat"><div class="val">${stats.serverExpressions || 0}</div><div class="lbl">Server Expressions</div></div>
    <div class="sb-stat"><div class="val">${stats.insideJokes || 0}</div><div class="lbl">Inside Jokes</div></div>
    <div class="sb-stat"><div class="val">${stats.wordGraphEdges || 0}</div><div class="lbl">Word Graph Edges</div></div>
  </div>
</div>

<div class="card sb-section">
  <h3>📈 Reply Type Breakdown</h3>
  <div style="margin-top:12px">
    ${(() => {
      const total = (stats.totalReplies || 1);
      const templatePct = Math.round(((stats.templateReplies || 0) / total) * 100);
      const markovPct = Math.round(((stats.markovReplies || 0) / total) * 100);
      const aiPct = Math.round((((stats.ai?.groqCalls || 0) + (stats.ai?.hfCalls || 0)) / total) * 100);
      const otherPct = Math.max(0, 100 - templatePct - markovPct - aiPct);
      return `
      <div style="margin-bottom:10px"><span style="opacity:.6;font-size:13px">Template (${templatePct}%)</span><div class="sb-progress"><div class="sb-progress-bar" style="width:${templatePct}%;background:#9146ff"></div></div></div>
      <div style="margin-bottom:10px"><span style="opacity:.6;font-size:13px">Markov (${markovPct}%)</span><div class="sb-progress"><div class="sb-progress-bar" style="width:${markovPct}%;background:#3498db"></div></div></div>
      <div style="margin-bottom:10px"><span style="opacity:.6;font-size:13px">AI / Qwen (${aiPct}%)</span><div class="sb-progress"><div class="sb-progress-bar" style="width:${aiPct}%;background:#22c55e"></div></div></div>
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
  <h3>🔥 Trending Topics (24h)</h3>
  <div id="sb-trending"><p style="opacity:.4">Loading...</p></div>
</div>

<div class="card sb-section">
  <h3>📈 Replies Per Day (Last 7 Days)</h3>
  <canvas id="sb-replies-chart" height="200"></canvas>
</div>

<div class="card sb-section">
  <h3>🏆 Top SmartBot Users</h3>
  <div id="sb-top-users"><p style="opacity:.4">Loading...</p></div>
</div>

<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
<script>
(function(){
  fetch('/api/smartbot/trending').then(function(r){return r.json();}).then(function(d){
    var el=document.getElementById('sb-trending');
    var topics=d.trending||[];
    if(!topics.length){el.innerHTML='<p style="opacity:.4">No trending topics yet.</p>';return;}
    var html='<div class="sb-grid">';
    topics.forEach(function(t,i){
      html+='<div class="sb-stat"><div class="val">'+t[1]+'</div><div class="lbl">'+(i+1)+'. '+t[0]+'</div></div>';
    });
    html+='</div>';el.innerHTML=html;
  });
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
  fetch('/api/smartbot/reply-history').then(function(r){return r.json();}).then(function(d){
    var data=d.history||[];
    if(!data.length)return;
    var ctx=document.getElementById('sb-replies-chart').getContext('2d');
    new Chart(ctx,{type:'bar',data:{
      labels:data.map(function(d){return d.date;}),
      datasets:[{label:'Replies',data:data.map(function(d){return d.count;}),backgroundColor:'#9146ff80',borderColor:'#9146ff',borderWidth:1}]
    },options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{color:'#8b8fa3'}},x:{ticks:{color:'#8b8fa3'}}}}});
  });
})();
</script>`;
}

export function renderSmartBotAITab(smartBot) {
  const cfg = smartBot.getConfig();
  const stats = smartBot.getStats();
  const aiStats = stats.ai || {};
  return `
${_sbStyles()}
<div class="card">
  <h2>🧠 AI Settings (Qwen)</h2>
  <p style="opacity:.6;margin-bottom:16px">Configure the Qwen AI integration powered by Groq and HuggingFace APIs.</p>
  <div class="sb-grid">
    <div class="sb-stat"><div class="val">${aiStats.enabled ? '✅ ON' : '❌ OFF'}</div><div class="lbl">AI Status</div></div>
    <div class="sb-stat"><div class="val">${aiStats.hasGroq ? '✅' : '❌'}</div><div class="lbl">Groq API Key</div></div>
    <div class="sb-stat"><div class="val">${aiStats.hasHF ? '✅' : '❌'}</div><div class="lbl">HuggingFace Key</div></div>
    <div class="sb-stat"><div class="val">${aiStats.groqCalls || 0}</div><div class="lbl">Groq Calls</div></div>
    <div class="sb-stat"><div class="val">${aiStats.hfCalls || 0}</div><div class="lbl">HF Calls</div></div>
    <div class="sb-stat"><div class="val">${aiStats.cacheHits || 0}</div><div class="lbl">Cache Hits</div></div>
    <div class="sb-stat"><div class="val">${aiStats.failures || 0}</div><div class="lbl">Failures</div></div>
  </div>
</div>

<div class="card sb-section">
  <h3>⚙️ Model Configuration</h3>
  <div class="sb-grid">
    <div class="sb-field">
      <label>Groq Model</label>
      <select id="sb-ai-model">
        <option value="qwen/qwen3-32b" ${(aiStats.groqModel||'qwen/qwen3-32b')==='qwen/qwen3-32b'?'selected':''}>Qwen 3 32B (Recommended)</option>
        <option value="qwen-2.5-32b" ${(aiStats.groqModel||'')==='qwen-2.5-32b'?'selected':''}>Qwen 2.5 32B</option>
        <option value="qwen-qwq-32b" ${(aiStats.groqModel||'')==='qwen-qwq-32b'?'selected':''}>Qwen QWQ 32B (Reasoning)</option>
        <option value="llama-3.3-70b-versatile" ${(aiStats.groqModel||'')==='llama-3.3-70b-versatile'?'selected':''}>Llama 3.3 70B</option>
        <option value="gemma2-9b-it" ${(aiStats.groqModel||'')==='gemma2-9b-it'?'selected':''}>Gemma 2 9B</option>
        <option value="mixtral-8x7b-32768" ${(aiStats.groqModel||'')==='mixtral-8x7b-32768'?'selected':''}>Mixtral 8x7B</option>
      </select>
    </div>
    <div class="sb-field">
      <label>Temperature (${aiStats.temperature || 0.85})</label>
      <input type="range" id="sb-ai-temp" min="0" max="2" step="0.05" value="${aiStats.temperature || 0.85}" oninput="this.previousElementSibling.textContent='Temperature ('+this.value+')'">
    </div>
    <div class="sb-field">
      <label>Max Tokens</label>
      <input type="number" id="sb-ai-tokens" value="${aiStats.maxTokens || 150}" min="50" max="500" step="10">
    </div>
    <div class="sb-field">
      <label>Server Context in Prompts</label>
      <select id="sb-ai-context">
        <option value="true" ${cfg.aiServerContext !== false?'selected':''}>Include server name & info</option>
        <option value="false" ${cfg.aiServerContext === false?'selected':''}>Generic (no server info)</option>
      </select>
    </div>
    <div class="sb-field">
      <label>AI for Comparisons</label>
      <select id="sb-ai-compare">
        <option value="true" ${cfg.aiComparisons !== false?'selected':''}>Yes — use AI for "X vs Y" questions</option>
        <option value="false" ${cfg.aiComparisons === false?'selected':''}>No — use templates only</option>
      </select>
    </div>
  </div>
  <button class="sb-save-btn" onclick="sbSaveAI()">💾 Save AI Settings</button>
</div>

${_sbToastScript()}
<script>
function sbSaveAI(){
  fetch('/api/smartbot/ai/config',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      groqModel:document.getElementById('sb-ai-model').value,
      temperature:parseFloat(document.getElementById('sb-ai-temp').value),
      maxTokens:parseInt(document.getElementById('sb-ai-tokens').value),
      aiServerContext:document.getElementById('sb-ai-context').value==='true',
      aiComparisons:document.getElementById('sb-ai-compare').value==='true'
    })
  }).then(function(r){return r.json();}).then(function(){sbToast('AI settings saved!');});
}
</script>`;
}

export function renderSmartBotLearningTab(smartBot) {
  const stats = smartBot.getStats();
  return `
${_sbStyles()}
<div class="card">
  <h2>📖 Learning & Social</h2>
  <p style="opacity:.6;margin-bottom:16px">View what SmartBot has learned from conversations, community opinions, expertise, server slang, and more.</p>
  <div class="sb-grid">
    <div class="sb-stat"><div class="val">${stats.learnedSubjects || 0}</div><div class="lbl">Learned Subjects</div></div>
    <div class="sb-stat"><div class="val">${stats.pendingSubjects || 0}</div><div class="lbl">Pending Subjects</div></div>
    <div class="sb-stat"><div class="val">${stats.learningLogEntries || 0}</div><div class="lbl">Log Entries</div></div>
    <div class="sb-stat"><div class="val">${stats.communityOpinions || 0}</div><div class="lbl">Community Opinions</div></div>
    <div class="sb-stat"><div class="val">${stats.trackedExperts || 0}</div><div class="lbl">Topic Experts</div></div>
    <div class="sb-stat"><div class="val">${stats.serverExpressions || 0}</div><div class="lbl">Server Expressions</div></div>
    <div class="sb-stat"><div class="val">${stats.insideJokes || 0}</div><div class="lbl">Inside Jokes</div></div>
    <div class="sb-stat"><div class="val">${stats.socialPairs || 0}</div><div class="lbl">Social Connections</div></div>
  </div>
</div>

<div class="card sb-section">
  <h3>📋 Learning Log (Recent)</h3>
  <div id="sb-learn-log"><p style="opacity:.4">Loading...</p></div>
</div>

<div class="card sb-section">
  <h3>💬 Community Opinions</h3>
  <div id="sb-opinions"><p style="opacity:.4">Loading...</p></div>
</div>

<div class="card sb-section">
  <h3>🎓 Topic Experts</h3>
  <div id="sb-experts"><p style="opacity:.4">Loading...</p></div>
</div>

<div class="card sb-section">
  <h3>🗣️ Server Slang</h3>
  <div id="sb-slang"><p style="opacity:.4">Loading...</p></div>
</div>

<div class="card sb-section">
  <h3>😂 Inside Jokes</h3>
  <div id="sb-jokes"><p style="opacity:.4">Loading...</p></div>
</div>

<div class="card sb-section">
  <h3>👥 Feedback Scores</h3>
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
  fetch('/api/smartbot/opinions').then(function(r){return r.json();}).then(function(d){
    var el=document.getElementById('sb-opinions');
    var opinions=d.opinions||[];
    if(!opinions.length){el.innerHTML='<p style="opacity:.4">No community opinions yet.</p>';return;}
    var html='<table class="sb-table"><thead><tr><th>Subject</th><th>👍</th><th>👎</th><th>😐</th><th>Total</th><th>Mood</th></tr></thead><tbody>';
    opinions.forEach(function(o){
      var mood=o.positive>o.negative?'<span style="color:#22c55e">Positive</span>':o.negative>o.positive?'<span style="color:#e74c3c">Negative</span>':'<span style="color:#8b8fa3">Mixed</span>';
      html+='<tr><td><strong>'+o.subject+'</strong></td><td>'+o.positive+'</td><td>'+o.negative+'</td><td>'+o.neutral+'</td><td>'+o.total+'</td><td>'+mood+'</td></tr>';
    });
    html+='</tbody></table>';el.innerHTML=html;
  });
  fetch('/api/smartbot/expertise').then(function(r){return r.json();}).then(function(d){
    var el=document.getElementById('sb-experts');
    var experts=d.experts||[];
    if(!experts.length){el.innerHTML='<p style="opacity:.4">No topic experts yet.</p>';return;}
    var html='<table class="sb-table"><thead><tr><th>Topic</th><th>User</th><th>Messages</th><th>Helpful</th></tr></thead><tbody>';
    experts.forEach(function(e){
      html+='<tr><td><strong>'+e.topic+'</strong></td><td>'+e.userId+'</td><td>'+e.messages+'</td><td>'+e.helpfulCount+'</td></tr>';
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
  fetch('/api/smartbot/inside-jokes').then(function(r){return r.json();}).then(function(d){
    var el=document.getElementById('sb-jokes');
    var jokes=d.jokes||[];
    if(!jokes.length){el.innerHTML='<p style="opacity:.4">No inside jokes yet.</p>';return;}
    var html='<table class="sb-table"><thead><tr><th>Quote</th><th>Author</th><th>Uses</th><th>Reactions</th></tr></thead><tbody>';
    jokes.forEach(function(j){
      html+='<tr><td>"'+j.original+'"</td><td>'+j.author+'</td><td>'+j.uses+'</td><td>'+j.reactions+'</td></tr>';
    });
    html+='</tbody></table>';el.innerHTML=html;
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
      'rssFeeds', 'newsBlockedKeywords', 'newsNsfwFilter',
      'aiServerContext', 'aiComparisons'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
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

  app.get('/api/smartbot/trending', requireAuth, (req, res) => {
    const trending = smartBot.trending.getTrending(24);
    res.json({ success: true, trending });
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

  app.get('/api/smartbot/opinions', requireAuth, (req, res) => {
    const opinions = [];
    for (const [subject, data] of smartBot.communityOpinions.opinions) {
      opinions.push({ subject, ...data });
    }
    opinions.sort((a, b) => b.total - a.total);
    res.json({ success: true, opinions: opinions.slice(0, 50) });
  });

  app.get('/api/smartbot/expertise', requireAuth, (req, res) => {
    const experts = [];
    for (const [, data] of smartBot.expertise.experts) {
      experts.push(data);
    }
    experts.sort((a, b) => b.messages - a.messages);
    res.json({ success: true, experts: experts.slice(0, 50) });
  });

  app.get('/api/smartbot/slang', requireAuth, (req, res) => {
    const expressions = smartBot.slangTracker.getPopular();
    res.json({ success: true, expressions });
  });

  app.get('/api/smartbot/inside-jokes', requireAuth, (req, res) => {
    const jokes = [];
    for (const [, data] of smartBot.insideJokes.quotes) {
      jokes.push(data);
    }
    jokes.sort((a, b) => b.reactions - a.reactions);
    res.json({ success: true, jokes: jokes.slice(0, 30) });
  });

  app.get('/api/smartbot/feedback', requireAuth, (req, res) => {
    const templates = [];
    for (const [key, data] of smartBot.feedback.templateScores) {
      templates.push({ key, ...data });
    }
    templates.sort((a, b) => b.uses - a.uses);
    res.json({ success: true, templates: templates.slice(0, 50) });
  });

  app.post('/api/smartbot/ai/config', requireAuth, (req, res) => {
    const { groqModel, temperature, maxTokens, aiServerContext, aiComparisons } = req.body;
    if (groqModel) smartBot.ai.groqModel = String(groqModel);
    if (temperature !== undefined) smartBot.ai.temperature = Math.max(0, Math.min(2, parseFloat(temperature) || 0.85));
    if (maxTokens !== undefined) smartBot.ai.maxTokens = Math.max(50, Math.min(500, parseInt(maxTokens) || 150));
    if (aiServerContext !== undefined) smartBot.updateConfig({ aiServerContext });
    if (aiComparisons !== undefined) smartBot.updateConfig({ aiComparisons });
    saveState();
    res.json({ success: true, ai: smartBot.ai.getStats() });
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
}
