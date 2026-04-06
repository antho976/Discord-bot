function sbStyles() {
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

function sbToastScript() {
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

export { sbStyles, sbToastScript };