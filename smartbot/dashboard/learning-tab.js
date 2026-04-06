import { sbStyles } from './styles.js';
function renderLearningTab(smartBot) {
  const pairsCount = smartBot.pairStore?.trainedPairs?.size || 0;
  const learnedCount = smartBot.learnedKnowledge?.subjects?.size || 0;
  const pendingCount = smartBot.learnedKnowledge?.pendingSubjects?.size || 0;
  const logCount = smartBot.learningLog?.entries?.length || 0;
  const slangCount = smartBot.slangTracker?.expressions?.size || 0;

  return `
${sbStyles()}
<div class="card">
  <h2>📖 Learning & Social</h2>
  <p style="opacity:.6;margin-bottom:16px">View what SmartBot has learned from conversations, server slang, and more.</p>
  <div class="sb-grid">
    <div class="sb-stat"><div class="val">${learnedCount}</div><div class="lbl">Learned Subjects</div></div>
    <div class="sb-stat"><div class="val">${pendingCount}</div><div class="lbl">Pending Subjects</div></div>
    <div class="sb-stat"><div class="val">${logCount}</div><div class="lbl">Log Entries</div></div>
    <div class="sb-stat"><div class="val">${slangCount}</div><div class="lbl">Server Expressions</div></div>
    <div class="sb-stat"><div class="val">${pairsCount}</div><div class="lbl">Trained Pairs</div></div>
  </div>
</div>

<div class="card sb-section">
  <h3>📋 Learning Log (Recent)</h3>
  <div id="sb-learn-log"><p style="opacity:.4">Loading...</p></div>
</div>

<div class="card sb-section">
  <h3>🗣️ Server Slang</h3>
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

export { renderLearningTab };