import { sbStyles, sbToastScript } from './styles.js';
function renderConfigTab(smartBot) {
  const cfg = smartBot.config;
  const stats = smartBot.stats;
  return `
${sbStyles()}
<div class="card">
  <h2>⚙️ SmartBot Configuration</h2>
  <p style="opacity:.6;margin-bottom:16px">Configure the AI chat bot that responds naturally in your channels.</p>
  <div class="sb-toggle">
    <label>Enabled</label>
    <input type="checkbox" id="sb-enabled" ${cfg.enabled ? 'checked' : ''} onchange="sbSave()">
  </div>
  <div class="sb-grid">
    <div class="sb-stat"><div class="val">${stats.totalReplies || 0}</div><div class="lbl">Total Replies</div></div>
    <div class="sb-stat"><div class="val">${smartBot.pairStore?.trainedPairs?.size || 0}</div><div class="lbl">Trained Pairs</div></div>
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
      <label>AI Mode</label>
      <select id="sb-aiMode">
        <option value="off" ${cfg.aiMode==='off'?'selected':''}>Off (templates only)</option>
        <option value="direct" ${cfg.aiMode==='direct'||!cfg.aiMode?'selected':''}>Direct (AI for mentions/replies)</option>
        <option value="smart" ${cfg.aiMode==='smart'?'selected':''}>Smart (AI + fallback)</option>
        <option value="always" ${cfg.aiMode==='always'?'selected':''}>Always (AI for everything)</option>
      </select>
      <span style="font-size:11px;opacity:.5">Requires Groq or HuggingFace API key.</span>
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

${sbToastScript()}
<script>
function sbSave(){
  fetch('/api/smartbot/config',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      enabled:document.getElementById('sb-enabled').checked,
      replyChance:parseFloat(document.getElementById('sb-replyChance').value),
      cooldownMs:parseInt(document.getElementById('sb-cooldownMs').value),
      minMessagesBetween:parseInt(document.getElementById('sb-minMsgBetween').value),
      markovChance:parseFloat(document.getElementById('sb-markovChance').value),
      maxResponseLength:parseInt(document.getElementById('sb-maxLen').value),
      personality:document.getElementById('sb-personality').value,
      aiMode:document.getElementById('sb-aiMode').value,
      mentionAlwaysReply:document.getElementById('sb-mentionReply').value==='true',
      nameAlwaysReply:document.getElementById('sb-nameReply').value==='true'
    })
  }).then(function(r){return r.json();}).then(function(){sbToast();});
}
function sbSaveChannels(){
  var allowed=Array.from(document.getElementById('sb-allowedChannels').selectedOptions).map(function(o){return o.value;});
  var ignored=Array.from(document.getElementById('sb-ignoredChannels').selectedOptions).map(function(o){return o.value;});
  fetch('/api/smartbot/config',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({allowedChannels:allowed,ignoredChannels:ignored})
  }).then(function(r){return r.json();}).then(function(){sbToast('Channel settings saved!');});
}
function sbTest(){
  var msg=document.getElementById('sb-test-msg').value.trim();
  if(!msg){sbToast('Enter a message first');return;}
  document.getElementById('sb-test-result').style.display='block';
  document.getElementById('sb-test-reply').textContent='Thinking...';
  fetch('/api/smartbot/test',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({message:msg})
  }).then(function(r){return r.json();}).then(function(d){
    document.getElementById('sb-test-reply').textContent=d.reply||'(no reply)';
  }).catch(function(){document.getElementById('sb-test-reply').textContent='Error testing.';});
}
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

export { renderConfigTab };