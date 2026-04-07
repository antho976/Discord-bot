import { sbStyles } from './styles.js';
function renderStatsTab(smartBot) {
  const stats = smartBot.stats;
  const total = stats.totalReplies || 1;
  const templatePct = Math.round(((stats.templateReplies || 0) / total) * 100);
  const markovPct = Math.round(((stats.markovReplies || 0) / total) * 100);
  const trainedPct = Math.round(((stats.trainedPairHits || 0) / total) * 100);
  const otherPct = Math.max(0, 100 - templatePct - markovPct - trainedPct);

  return `
${sbStyles()}
<div class="card">
  <h2>📊 SmartBot Statistics</h2>
  <p style="opacity:.6;margin-bottom:16px">Overview of SmartBot activity and performance metrics.</p>
  <div class="sb-grid">
    <div class="sb-stat"><div class="val">${stats.totalReplies || 0}</div><div class="lbl">Total Replies</div></div>
    <div class="sb-stat"><div class="val">${stats.templateReplies || 0}</div><div class="lbl">Template Replies</div></div>
    <div class="sb-stat"><div class="val">${stats.markovReplies || 0}</div><div class="lbl">Markov Replies</div></div>
    <div class="sb-stat"><div class="val">${stats.mentionReplies || 0}</div><div class="lbl">Mention Replies</div></div>
    <div class="sb-stat"><div class="val">${stats.trainedPairHits || 0}</div><div class="lbl">Trained Pair Hits</div></div>
    <div class="sb-stat"><div class="val">${smartBot.pairStore?.trainedPairs?.size || 0}</div><div class="lbl">Trained Pairs</div></div>
  </div>
</div>

<div class="card sb-section">
  <h3>📈 Reply Type Breakdown</h3>
  <div style="margin-top:12px">
    <div style="margin-bottom:10px"><span style="opacity:.6;font-size:13px">Template (${templatePct}%)</span><div class="sb-progress"><div class="sb-progress-bar" style="width:${templatePct}%;background:#9146ff"></div></div></div>
    <div style="margin-bottom:10px"><span style="opacity:.6;font-size:13px">Markov (${markovPct}%)</span><div class="sb-progress"><div class="sb-progress-bar" style="width:${markovPct}%;background:#3498db"></div></div></div>
    <div style="margin-bottom:10px"><span style="opacity:.6;font-size:13px">Trained Pairs (${trainedPct}%)</span><div class="sb-progress"><div class="sb-progress-bar" style="width:${trainedPct}%;background:#22c55e"></div></div></div>
    <div style="margin-bottom:10px"><span style="opacity:.6;font-size:13px">Other (${otherPct}%)</span><div class="sb-progress"><div class="sb-progress-bar" style="width:${otherPct}%;background:#8b8fa3"></div></div></div>
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

<script>
(function(){
  fetch('/api/smartbot/top-users').then(function(r){return r.json();}).then(function(d){
    var el=document.getElementById('sb-top-users');
    var users=d.users||[];
    if(!users.length){el.innerHTML='<p style="opacity:.4">No user data yet.</p>';return;}
    var html='<table class="sb-table"><thead><tr><th>#</th><th>User</th><th>Interactions</th></tr></thead><tbody>';
    users.forEach(function(u,i){html+='<tr><td>'+(i+1)+'</td><td>'+u.id+'</td><td>'+u.count+'</td></tr>';});
    html+='</tbody></table>';el.innerHTML=html;
  });
})();
</script>`;
}

export { renderStatsTab };