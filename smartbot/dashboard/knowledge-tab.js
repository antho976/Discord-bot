import { sbStyles, sbToastScript } from './styles.js';
function renderKnowledgeTab(smartBot) {
  const knowledge = smartBot.knowledge;
  const customEntries = Object.entries(knowledge.customEntries || {});
  const facts = Object.entries(knowledge.facts || {});
  return `
${sbStyles()}
<style>
  .kb-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;margin-bottom:16px}
  .kb-summary .item{background:#1a1a2e;padding:12px;border-radius:10px;text-align:center}
  .kb-summary .item .val{font-size:22px;font-weight:700}
  .kb-summary .item .lbl{font-size:11px;opacity:.5;margin-top:2px}
</style>

<div class="card">
  <h2>📚 Knowledge Base</h2>
  <p style="opacity:.6;margin-bottom:16px">Everything the bot knows — stream info, socials, custom Q&A, facts, and more.</p>
  <div class="kb-summary">
    <div class="item"><div class="val">${customEntries.length}</div><div class="lbl">Custom Q&As</div></div>
    <div class="item"><div class="val">${facts.length}</div><div class="lbl">Facts</div></div>
    <div class="item"><div class="val">${knowledge.streamerName ? '✓' : '—'}</div><div class="lbl">Streamer</div></div>
    <div class="item"><div class="val">${knowledge.streamSchedule ? '✓' : '—'}</div><div class="lbl">Schedule</div></div>
    <div class="item"><div class="val">${knowledge.currentGame || '—'}</div><div class="lbl">Current Game</div></div>
  </div>
</div>

<div class="card sb-section">
  <h3>🎮 Stream & Creator Info</h3>
  <p style="opacity:.6;margin-bottom:12px;font-size:13px">Basic info the bot uses when responding about you or your stream.</p>
  <div class="sb-grid">
    <div class="sb-field">
      <label>Streamer / Creator Name</label>
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
      <label>Current Game</label>
      <input type="text" id="sb-currentGame" value="${knowledge.currentGame || ''}" placeholder="e.g. Legends of Idleon">
    </div>
    <div class="sb-field">
      <label>Stream Title</label>
      <input type="text" id="sb-streamTitle" value="${knowledge.streamTitle || ''}" placeholder="e.g. Chill grinding session">
    </div>
  </div>
  <button class="sb-save-btn" onclick="sbSaveKnowledge()">💾 Save Stream Info</button>
</div>

<div class="card sb-section">
  <h3>🌐 Server & Community</h3>
  <div class="sb-grid">
    <div class="sb-field">
      <label>Server Info</label>
      <textarea id="sb-serverInfo" placeholder="About this Discord server...">${knowledge.serverInfo || ''}</textarea>
    </div>
    <div class="sb-field">
      <label>Rules Summary</label>
      <textarea id="sb-rules" placeholder="Server rules summary...">${knowledge.rules || ''}</textarea>
    </div>
  </div>
  <button class="sb-save-btn" onclick="sbSaveKnowledge()">💾 Save Server Info</button>
</div>

<div class="card sb-section">
  <h3>🔗 Socials & Links</h3>
  <p style="opacity:.6;margin-bottom:12px;font-size:13px">Social links the bot can share when asked.</p>
  <div class="sb-grid">
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
    <div class="sb-field">
      <label>Twitch</label>
      <input type="text" id="sb-social-twitch" value="${(knowledge.socials||{}).twitch || ''}" placeholder="Twitch URL">
    </div>
    <div class="sb-field">
      <label>Website</label>
      <input type="text" id="sb-social-website" value="${(knowledge.socials||{}).website || ''}" placeholder="Website URL">
    </div>
  </div>
  <button class="sb-save-btn" onclick="sbSaveKnowledge()">💾 Save Socials</button>
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
  <h3>🧠 Bot Facts</h3>
  <p style="opacity:.6;margin-bottom:12px;font-size:13px">Add facts the bot can share when asked. Great for sub goals, merch links, upcoming events, etc.</p>
  <div id="sb-facts-list">
    ${facts.length === 0 ? '<p style="opacity:.4">No facts yet. Add one below.</p>' :
      facts.map(([k, v]) => `
        <div class="sb-custom-row">
          <span class="key">${k}</span>
          <span style="flex:1;font-size:13px">${String(v).substring(0, 80)}${String(v).length > 80 ? '...' : ''}</span>
          <button class="del-btn" onclick="sbDelFact('${k.replace(/'/g, "\\'")}')">✕</button>
        </div>`).join('')}
  </div>
  <div style="margin-top:12px;display:grid;gap:8px">
    <div class="sb-field">
      <label>Fact Key (topic/trigger word)</label>
      <input type="text" id="sb-fact-key" placeholder="e.g. sub goal, merch, discord nitro">
    </div>
    <div class="sb-field">
      <label>Fact Value (the info)</label>
      <textarea id="sb-fact-value" placeholder="e.g. We're at 450/500 subs this month!"></textarea>
    </div>
    <button class="sb-save-btn" onclick="sbAddFact()">➕ Add Fact</button>
  </div>
</div>

${sbToastScript()}
<script>
function sbSaveKnowledge(){
  var socials={};
  var yt=document.getElementById('sb-social-youtube').value.trim();if(yt)socials.youtube=yt;
  var tw=document.getElementById('sb-social-twitter').value.trim();if(tw)socials.twitter=tw;
  var ig=document.getElementById('sb-social-instagram').value.trim();if(ig)socials.instagram=ig;
  var tk=document.getElementById('sb-social-tiktok').value.trim();if(tk)socials.tiktok=tk;
  var ttv=document.getElementById('sb-social-twitch').value.trim();if(ttv)socials.twitch=ttv;
  var web=document.getElementById('sb-social-website').value.trim();if(web)socials.website=web;
  fetch('/api/smartbot/knowledge',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      streamerName:document.getElementById('sb-streamerName').value,
      streamSchedule:document.getElementById('sb-schedule').value,
      nextStream:document.getElementById('sb-nextStream').value,
      currentGame:document.getElementById('sb-currentGame').value,
      streamTitle:document.getElementById('sb-streamTitle').value,
      serverInfo:document.getElementById('sb-serverInfo').value,
      rules:document.getElementById('sb-rules').value,
      socials:socials
    })
  }).then(function(r){return r.json();}).then(function(){sbToast('Saved!');});
}
function sbAddCustom(){
  var key=document.getElementById('sb-custom-key').value.trim();
  var patterns=document.getElementById('sb-custom-patterns').value.split(',').map(function(s){return s.trim();}).filter(Boolean);
  var answer=document.getElementById('sb-custom-answer').value.trim();
  if(!key||!patterns.length||!answer){sbToast('Fill all fields');return;}
  fetch('/api/smartbot/knowledge/custom',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({key:key,patterns:patterns,answer:answer})
  }).then(function(r){return r.json();}).then(function(){location.reload();});
}
function sbDelCustom(key){
  if(!confirm('Delete entry "'+key+'"?'))return;
  fetch('/api/smartbot/knowledge/custom/'+encodeURIComponent(key),{method:'DELETE'})
    .then(function(r){return r.json();}).then(function(){location.reload();});
}
function sbAddFact(){
  var key=document.getElementById('sb-fact-key').value.trim();
  var value=document.getElementById('sb-fact-value').value.trim();
  if(!key||!value){sbToast('Fill both key and value');return;}
  fetch('/api/smartbot/facts',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({key:key,value:value})
  }).then(function(r){return r.json();}).then(function(d){
    if(d.success){location.reload();}else{sbToast(d.error||'Error');}
  });
}
function sbDelFact(key){
  if(!confirm('Delete fact "'+key+'"?'))return;
  fetch('/api/smartbot/facts/'+encodeURIComponent(key),{method:'DELETE'})
    .then(function(r){return r.json();}).then(function(){location.reload();});
}
</script>`;
}

export { renderKnowledgeTab };