/**
 * Guidance Editor Tab — Dashboard UI
 *
 * Visual editor for guidance-config.json.
 * Allows admins to:
 *  - Add/edit/remove worlds, categories, and cards
 *  - Set tiers (threshold + label + note) per card
 *  - Assign extractors from the known list
 *  - Preview live evaluation output for any stored account
 *  - Reorder items via drag-and-drop
 */

export function renderGuidanceEditorTab(userTier) {
  const isAdmin = ['owner', 'admin'].includes(userTier);

  return `
<style>
/* ── Guidance Editor ── */
.ge{display:grid;grid-template-columns:280px 1fr;gap:16px;height:calc(100vh - 80px);overflow:hidden}
@media(max-width:900px){.ge{grid-template-columns:1fr;height:auto;overflow:auto}}
.ge-tree{background:#12121c;border:1px solid #2a2a3a;border-radius:8px;overflow-y:scroll;display:flex;flex-direction:column}
.ge-tree-hdr{padding:12px 14px;background:#1a1a2a;border-bottom:1px solid #2a2a3a;font-size:13px;font-weight:700;color:#c4b8f0;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.ge-main{background:#12121c;border:1px solid #2a2a3a;border-radius:8px;overflow-y:scroll;display:flex;flex-direction:column}
.ge-main-hdr{padding:12px 18px;background:#1a1a2a;border-bottom:1px solid #2a2a3a;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
/* ── Uniform header action buttons ── */
.ge-main-hdr .ge-btn{min-width:90px;justify-content:center}
.ge-main-body{padding:16px;flex:1}

/* ── Tree Items ── */
.ge-world{border-bottom:1px solid #1e1e2e}
.ge-world-row{display:flex;align-items:center;padding:8px 14px;cursor:pointer;gap:8px;font-size:13px;font-weight:600;color:#c4b8f0;user-select:none}
.ge-world-row:hover{background:#1a1a2e}
.ge-world-row.active{background:#1e1830;border-left:3px solid #7c3aed}
.ge-world-chv{margin-right:auto;color:#6060a0}
.ge-world-chv.open{transform:rotate(90deg)}
.ge-world-body{display:none;padding-left:12px}
.ge-world-body.open{display:block}
.ge-cat-row{display:flex;align-items:center;padding:6px 10px;cursor:pointer;gap:6px;font-size:12px;color:#a0a0c0;border-radius:4px;margin:1px 4px;user-select:none}
.ge-cat-row:hover{background:#1a1a2e}
.ge-cat-row.active{background:#1c1440;color:#d4b8ff;font-weight:600}
.ge-card-row{display:flex;align-items:center;padding:4px 8px;cursor:pointer;gap:5px;font-size:11px;color:#8080a0;border-radius:3px;margin:1px 4px;padding-left:22px;user-select:none}
.ge-card-row:hover{background:#16162a}
.ge-card-row.active{background:#160f30;color:#c4a8ff}

/* ── Editor Forms ── */
.ge-form-section{margin-bottom:18px}
.ge-form-section h3{font-size:13px;font-weight:700;color:#a0a0c0;margin:0 0 10px;padding-bottom:6px;border-bottom:1px solid #1e1e2e;display:flex;align-items:center;gap:6px}
.ge-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}
.ge-row.full{grid-template-columns:1fr}
.ge-field{display:flex;flex-direction:column;gap:4px}
.ge-field label{font-size:11px;color:#7878a0;font-weight:600}
.ge-field input,.ge-field select,.ge-field textarea{background:#1a1a2a;border:1px solid #2e2e42;border-radius:5px;padding:6px 10px;color:#d0d0e0;font-size:12px;outline:none;width:100%}
.ge-field input:focus,.ge-field select:focus,.ge-field textarea:focus{border-color:#7c3aed}
.ge-field textarea{resize:vertical;min-height:60px;font-family:inherit}
.ge-field select option{background:#1a1a2a}

/* ── Tier editor ── */
.ge-tiers{display:flex;flex-direction:column;gap:6px}
.ge-tier{background:#161622;border:1px solid #2a2a3c;border-radius:5px;padding:6px 8px}
.ge-tier-main{display:grid;grid-template-columns:auto 110px 90px 1fr 1fr auto;gap:6px;align-items:center}
.ge-tier-num{font-size:10px;color:#6060a0;font-weight:700;min-width:18px;text-align:center}
.ge-tier-del{background:none;border:none;color:#604060;font-size:14px;cursor:pointer;padding:0 4px}
.ge-tier-del:hover{color:#ff5555}
.ge-tier-extras{display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding:4px 0 2px 28px}
.ge-tier-extra{display:flex;align-items:center;gap:6px;font-size:11px;color:#8080a0}
.ge-tier-extra label{white-space:nowrap}
.ge-tier-add{background:#1c1c2e;border:1px dashed #3a3a50;border-radius:5px;padding:6px;color:#6060a0;font-size:11px;cursor:pointer;text-align:center;width:100%;margin-top:4px}
.ge-tier-add:hover{background:#1e1e36;color:#a0a0c0}

/* ── Icon picker (emoji or image upload) ── */
.ge-icon-picker{display:flex;align-items:center;gap:8px}
.ge-icon-preview{width:32px;height:32px;border-radius:5px;background:#111;border:1px solid #2a2a3c;display:flex;align-items:center;justify-content:center;font-size:20px;overflow:hidden;flex-shrink:0}
.ge-icon-preview img{width:100%;height:100%;object-fit:contain}
.ge-icon-upload-btn{background:#1c1c2e;border:1px solid #3a3a50;border-radius:4px;padding:3px 8px;color:#8080c0;font-size:10px;cursor:pointer;white-space:nowrap}
.ge-icon-upload-btn:hover{background:#262640;color:#b0b0e0}

/* ── Buttons ── */
.ge-btn{padding:7px 16px;border-radius:6px;border:none;font-size:12px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:5px}
.ge-btn.primary{background:#5b3aed;color:#fff}
.ge-btn.primary:hover{background:#6b4af0}
.ge-btn.danger{background:#3a142a;color:#ff8888;border:1px solid #502030}
.ge-btn.danger:hover{background:#4a1a35}
.ge-btn.secondary{background:#1c1c2e;color:#a0a0c0;border:1px solid #2e2e42}
.ge-btn.secondary:hover{background:#222236}
.ge-btn.success{background:#1a3a20;color:#81c784;border:1px solid #2a5030}
.ge-btn.success:hover{background:#1e4424}
.ge-btn[disabled]{opacity:.4;pointer-events:none}

/* ── Rating bar ── */
.ge-rating{display:flex;align-items:center;gap:8px}
.ge-rating-bar{flex:1;height:6px;background:#1a1a2a;border-radius:3px;overflow:hidden}
.ge-rating-fill{height:100%;background:linear-gradient(90deg,#5b3aed,#c084fc);border-radius:3px;transition:width .4s}
.ge-pct{font-size:11px;color:#9090b0;min-width:36px;text-align:right}

/* ── Preview panel ── */
.ge-preview{background:#110d1e;border:1px solid #2a1840;border-radius:6px;padding:12px}
.ge-preview-world{margin-bottom:10px}
.ge-preview-world-hdr{display:flex;align-items:center;gap:8px;padding:6px 10px;background:#1a1428;border-radius:5px;margin-bottom:6px;cursor:pointer}
.ge-preview-world-hdr span{font-size:12px;font-weight:700;color:#c4a8ff}
.ge-preview-cat{margin-left:10px;margin-bottom:6px}
.ge-preview-cat-hdr{font-size:11px;color:#8080a0;padding:3px 8px;display:flex;align-items:center;gap:6px}
.ge-card-chip{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:12px;font-size:10px;background:#1a1a2a;border:1px solid #2a2a3a;margin:2px;color:#a0a0c0}
.ge-card-chip.t0{border-color:#404040;color:#606060}
.ge-card-chip.t1{border-color:#4060a0;color:#8abcff}
.ge-card-chip.t2{border-color:#4a5a30;color:#a0c870}
.ge-card-chip.t3{border-color:#6050a0;color:#c090ff}
.ge-card-chip.t4{border-color:#a06020;color:#ffcc60}
.ge-card-chip.tmax{border-color:#a08010;color:#ffe060;background:#1e1800}

/* ── Notif ── */
.ge-notif{position:fixed;bottom:24px;right:24px;padding:10px 18px;background:#1a1a2a;border:1px solid #3a3a50;border-radius:8px;color:#e0e0e0;font-size:13px;z-index:9999;display:none;gap:8px;align-items:center;box-shadow:0 4px 20px rgba(0,0,0,.5)}
.ge-notif.show{display:flex}
.ge-notif.ok{border-color:#4caf50;color:#81c784}
.ge-notif.err{border-color:#f44336;color:#ff8888}

/* ── Card Validation Panel ── */
.ge-val-panel{border-radius:6px;padding:9px 13px;margin-bottom:14px;display:flex;flex-direction:column;gap:5px}
.ge-val-panel.ve{background:#170808;border:1px solid #4a1515}
.ge-val-panel.vw{background:#150e04;border:1px solid #4a3010}
.ge-val-panel.vok{background:#081508;border:1px solid #1a3a1a;flex-direction:row;align-items:center;gap:7px}
.ge-val-title{font-size:11px;font-weight:700;display:flex;align-items:center;gap:5px}
.ge-val-title.te{color:#ff8080}
.ge-val-title.tw{color:#ffb74d}
.ge-val-title.tok{color:#81c784;font-size:12px}
.ge-val-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px}
.ge-val-list li{font-size:11px;display:flex;align-items:baseline;gap:5px;padding:1px 0;line-height:1.45}
.ge-val-list li .vi{flex-shrink:0;font-weight:900;font-size:11px;margin-top:1px}
.ge-val-err-item{color:#ff9595}.ge-val-err-item .vi{color:#f44336}
.ge-val-warn-item{color:#ffd090}.ge-val-warn-item .vi{color:#ff9800}
.ge-val-sep{height:1px;background:#2a1a1a;margin:3px 0}

/* ── Field inline error hint ── */
.ge-field-hint{font-size:10px;margin-top:2px;display:none;padding:2px 0 0 2px}
.ge-field-hint.err{display:block;color:#ff7070}
.ge-field-hint.warn{display:block;color:#ffaa44}
.ge-field input.ge-err,.ge-field select.ge-err,.ge-field textarea.ge-err{border-color:#e03030 !important;background:#160808 !important}
.ge-field input.ge-warn,.ge-field select.ge-warn{border-color:#bb6600 !important}

/* ── Move buttons (reorder in tree) ── */
.ge-move-btns{display:none;gap:1px;margin-left:auto}
.ge-world-row:hover .ge-move-btns,.ge-cat-row:hover .ge-move-btns,.ge-card-row:hover .ge-move-btns{display:flex}
.ge-move-btn{background:none;border:none;color:#5060a0;font-size:11px;cursor:pointer;padding:0 3px;line-height:1;border-radius:3px}
.ge-move-btn:hover{color:#c0b0f0;background:#1e1e36}

/* ── Info card ── */
.ge-info-card-editor textarea{background:#1a1a2a;border:1px solid #2e2e42;border-radius:5px;padding:8px 10px;color:#d0d0e0;font-size:12px;width:100%;box-sizing:border-box;font-family:inherit;resize:vertical;min-height:100px}
.ge-info-card-editor textarea:focus{border-color:#7c3aed;outline:none}

/* ── Empty state ── */
.ge-empty{text-align:center;color:#5060a0;padding:40px 20px;font-size:13px}
.ge-empty .ge-empty-icon{font-size:36px;margin-bottom:10px}

/* ── Param Autocomplete ── */
.ge-param-wrap{position:relative;display:inline-block;min-width:180px}
.ge-param-ac{display:none;position:absolute;top:calc(100% + 2px);left:0;right:0;z-index:300;background:#161622;border:1px solid #3a3a50;border-radius:5px;max-height:160px;overflow-y:auto;box-shadow:0 6px 20px rgba(0,0,0,.6)}
.ge-param-ac.open{display:block}
.ge-param-ac-opt{padding:5px 10px;font-size:11px;color:#b0b0d0;cursor:pointer;white-space:nowrap}
.ge-param-ac-opt:hover{background:#1e1e36;color:#e0e0f0}
/* ── Tier type description ── */
.ge-tier-type-info{font-size:9px;color:#5060a0;font-style:italic;white-space:normal;max-width:120px;line-height:1.2;margin-top:2px}

/* ── Extractor Picker ── */
.ge-ext-picker{position:relative;width:100%}
.ge-ext-btn{display:flex;align-items:center;gap:6px;background:#1a1a2a;border:1px solid #2e2e42;border-radius:5px;padding:6px 10px;color:#d0d0e0;font-size:12px;cursor:pointer;width:100%;text-align:left;outline:none}
.ge-ext-btn:hover,.ge-ext-btn:focus{border-color:#7c3aed}
.ge-ext-btn .ge-ext-type{font-size:9px;padding:1px 5px;border-radius:3px;background:#161628;border:1px solid #2a2a3c;margin-left:auto;flex-shrink:0}
.ge-ext-drop{display:none;position:absolute;top:100%;left:0;right:0;z-index:100;background:#161622;border:1px solid #3a3a50;border-radius:6px;margin-top:2px;box-shadow:0 8px 30px rgba(0,0,0,.6);max-height:420px;overflow:hidden;flex-direction:column}
.ge-ext-drop.open{display:flex}
.ge-ext-search{border:none;border-bottom:1px solid #2a2a3c;background:#1a1a2a;color:#d0d0e0;padding:8px 10px;font-size:12px;outline:none;width:100%;box-sizing:border-box}
.ge-ext-list{overflow-y:auto;flex:1;max-height:310px}
.ge-ext-grp{padding:4px 0}
.ge-ext-grp-hdr{font-size:10px;font-weight:700;color:#6060a0;padding:4px 10px;text-transform:uppercase;letter-spacing:.5px;position:sticky;top:0;background:#161622}
.ge-ext-opt{display:flex;align-items:center;gap:6px;padding:5px 10px 5px 18px;cursor:pointer;font-size:11px;color:#b0b0d0}
.ge-ext-opt:hover{background:#1e1e36;color:#e0e0f0}
.ge-ext-opt.selected{background:#1c1440;color:#d4b8ff;font-weight:600}
.ge-ext-opt .ge-ext-type{font-size:9px;padding:1px 4px;border-radius:3px;background:#161628;border:1px solid #2a2a3c;margin-left:auto;flex-shrink:0}
.ge-ext-types{display:flex;gap:4px;flex-wrap:wrap;padding:5px 8px;border-bottom:1px solid #2a2a3c;background:#151520}
.ge-ext-tpill{font-size:10px;padding:2px 8px;border-radius:10px;cursor:pointer;border:1px solid #2a2a3c;color:#707090;background:#161628;white-space:nowrap;user-select:none}
.ge-ext-tpill:hover{border-color:#7c3aed;color:#c0b0f0}
.ge-ext-tpill.active{background:#2a1450;border-color:#7c3aed;color:#d4b8ff;font-weight:600}

/* ── Param Picker (mirrors Extractor Picker) ── */
.ge-pm-picker{position:relative;display:inline-block;min-width:180px;max-width:100%}
.ge-pm-btn{display:flex;align-items:center;gap:6px;background:#1a1a2a;border:1px solid #2e2e42;border-radius:5px;padding:4px 10px;color:#d0d0e0;font-size:11px;cursor:pointer;width:100%;text-align:left;outline:none;overflow:hidden}
.ge-pm-btn:hover,.ge-pm-btn:focus{border-color:#7c3aed}
.ge-pm-btn .ge-pm-val{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ge-pm-btn .ge-pm-clear{opacity:.5;font-size:11px;flex-shrink:0;padding:0 3px;background:none;border:none;color:inherit;cursor:pointer}
.ge-pm-btn .ge-pm-clear:hover{opacity:1;color:#ff8888}
.ge-pm-drop{display:none;position:absolute;top:100%;left:0;min-width:260px;z-index:200;background:#161622;border:1px solid #3a3a50;border-radius:6px;margin-top:2px;box-shadow:0 8px 30px rgba(0,0,0,.7);max-height:340px;overflow:hidden;flex-direction:column}
.ge-pm-drop.open{display:flex}
.ge-pm-search{border:none;border-bottom:1px solid #2a2a3c;background:#1a1a2a;color:#d0d0e0;padding:7px 10px;font-size:11px;outline:none;width:100%;box-sizing:border-box}
.ge-pm-list{overflow-y:auto;flex:1}
.ge-pm-grp{padding:3px 0}
.ge-pm-grp-hdr{font-size:9px;font-weight:700;color:#6060a0;padding:3px 10px;text-transform:uppercase;letter-spacing:.5px;position:sticky;top:0;background:#161622}
.ge-pm-opt{display:flex;align-items:center;gap:6px;padding:5px 10px 5px 18px;cursor:pointer;font-size:11px;color:#b0b0d0;line-height:1.3}
.ge-pm-opt:hover{background:#1e1e36;color:#e0e0f0}
.ge-pm-opt.selected{background:#1c1440;color:#d4b8ff;font-weight:600}
.ge-pm-opt .ge-pm-idx{font-size:9px;color:#4050a0;margin-left:auto;flex-shrink:0}
.ge-pm-empty{padding:16px 10px;font-size:11px;color:#5060a0;text-align:center}
.ge-pm-loading{padding:14px 10px;font-size:11px;color:#5060a0;text-align:center;font-style:italic}

/* ── Custom Extractor Creator ── */
.ge-custom-ext-row{display:flex;align-items:center;padding:6px 10px;cursor:pointer;gap:6px;font-size:12px;color:#a0a0c0;border-radius:4px;margin:1px 4px;user-select:none}
.ge-custom-ext-row:hover{background:#1a1a2e}
.ge-custom-ext-row.active{background:#1c1440;color:#d4b8ff;font-weight:600}
.ge-custom-ext-badge{font-size:9px;padding:1px 5px;border-radius:8px;background:#221840;border:1px solid #3a2870;color:#a080e0;margin-left:auto}
.ge-cx-form{background:#161622;border:1px solid #2a2a3c;border-radius:6px;padding:10px 14px;margin-bottom:8px}
.ge-cx-form input,.ge-cx-form select,.ge-cx-form textarea{background:#111;border:1px solid #2a2a3c;border-radius:4px;padding:5px 8px;color:#d0d0e0;font-size:11px;width:100%;box-sizing:border-box}
.ge-cx-form input:focus,.ge-cx-form select:focus,.ge-cx-form textarea:focus{border-color:#7c3aed;outline:none}
.ge-cx-form label{font-size:10px;color:#7878a0;font-weight:600;display:block;margin-bottom:3px}
.ge-cx-field{margin-bottom:8px}
.ge-cx-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px}
.ge-cx-item{background:#161622;border:1px solid #2a2a3c;border-radius:5px;padding:8px 10px;display:flex;align-items:center;gap:10px;margin-bottom:6px}
.ge-cx-item-info{flex:1;min-width:0}
.ge-cx-item-id{font-size:10px;color:#6060c0;font-family:monospace}
.ge-cx-item-label{font-size:12px;color:#d0d0e0}
.ge-cx-item-desc{font-size:10px;color:#7070a0;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ge-cx-item-btns{display:flex;gap:4px;flex-shrink:0}
.ge-cx-op-pill{font-size:10px;padding:1px 6px;border-radius:4px;background:#1a1a30;border:1px solid #30305a;color:#90a0d0;margin-left:4px}

/* ── Tree search & filter ── */
.ge-tree-search-row{display:flex;align-items:center;gap:6px;padding:5px 8px 4px;border-bottom:1px solid #1e1e2e}
.ge-tree-search{flex:1;background:#0f0f1c;border:1px solid #2a2a3c;border-radius:5px;color:#d0d0e0;font-size:11px;padding:4px 8px;box-sizing:border-box;outline:none}
.ge-tree-search:focus{border-color:#7c3aed}
.ge-tree-filter-btn{background:#1a1a2e;border:1px solid #2a2a3c;border-radius:4px;color:#6060a0;font-size:10px;cursor:pointer;padding:3px 6px;white-space:nowrap;flex-shrink:0}
.ge-tree-filter-btn.active{background:#1c1440;border-color:#7c3aed;color:#c4b8f0}
.ge-tree-filter-btn:hover{border-color:#7c3aed;color:#c4b8f0}

/* ── Category badge (shows card count) ── */
.ge-cat-badge{font-size:9px;padding:1px 5px;border-radius:8px;background:#1c1440;border:1px solid #3a2870;color:#a080e0;margin-left:auto;flex-shrink:0}
.ge-cat-badge.incomplete{background:#1c1200;border-color:#3a2a00;color:#c0a040}
.ge-cat-badge.complete{background:#0c1e10;border-color:#1e4020;color:#60c080}

/* ── Card error highlight in tree ── */
.ge-card-row.has-error{color:#ff9090}
.ge-card-row.has-error .ge-card-icon{color:#ff6060!important}
/* ── Card notes dot in tree ── */
.ge-card-notes-dot{width:5px;height:5px;border-radius:50%;background:#7060a0;flex-shrink:0;margin-left:auto;opacity:.7}

/* ── Dirty bar ── */
.ge-dirty-bar{height:3px;background:linear-gradient(90deg,#c06000,#e08020 60%,transparent);opacity:0;transition:opacity .3s;width:100%;border-radius:3px;margin-top:3px}
.ge-dirty-bar.show{opacity:1}

/* ── Tier validation warning ── */
.ge-tier-warn{font-size:10px;color:#c0a040;background:#1c1800;border:1px solid #3a3000;border-radius:4px;padding:4px 8px;margin:4px 0;display:none}
.ge-tier-warn.show{display:flex;align-items:center;gap:6px}

/* ── Notes textarea ── */
.ge-notes-field{resize:vertical;min-height:40px;font-family:inherit!important}

/* ── Tier template buttons ── */
.ge-tier-tpl-wrap{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px;align-items:center}
.ge-tier-tpl-btn{font-size:10px;padding:2px 8px;border-radius:3px;cursor:pointer;background:#1a1a2e;border:1px solid #2a2a3c;color:#8080a0;white-space:nowrap}
.ge-tier-tpl-btn:hover{border-color:#7c3aed;color:#c4b8f0}

/* ── Undo/Redo (#6) ── */
.ge-undo-btn{background:#1a1a2e;border:1px solid #2a2a3c;border-radius:4px;color:#7070a0;font-size:11px;cursor:pointer;padding:3px 8px}
.ge-undo-btn:hover:not([disabled]){border-color:#7c3aed;color:#c4b8f0}
.ge-undo-btn[disabled]{opacity:.3;pointer-events:none}

/* ── Autosave indicator (#16) ── */
.ge-autosave-badge{font-size:9px;color:#5070a0;padding:1px 6px;border-radius:4px;background:#0f0f1c;border:1px solid #1e1e2a;margin-left:4px;transition:color .3s}
.ge-autosave-badge.active{color:#60c080;border-color:#1e4020}

/* ── Stats panel (#25) ── */
.ge-stats-panel{display:grid;grid-template-columns:repeat(auto-fit,minmax(70px,1fr));gap:8px;padding:10px;background:#0f0f1c;border:1px solid #1e1e2e;border-radius:6px;margin-bottom:12px}
.ge-stat-box{text-align:center}
.ge-stat-num{font-size:18px;font-weight:700;color:#c4b8f0}
.ge-stat-lbl{font-size:9px;color:#5060a0;text-transform:uppercase;letter-spacing:.5px}

/* ── Collapse persistence indicator ── */
.ge-world-row[data-pinned-open]>.ge-world-chv::after{content:'📌';font-size:8px;margin-left:2px}

/* ── Compound conditions builder (#34) ── */
.ge-cond-builder{background:#0f0f1e;border:1px solid #2a2a3c;border-radius:5px;padding:8px}
.ge-cond-row{display:grid;grid-template-columns:1fr auto auto;gap:6px;align-items:center;margin-bottom:5px;font-size:11px}
.ge-cond-del{background:none;border:none;color:#604060;cursor:pointer;font-size:13px;padding:0 3px}
.ge-cond-del:hover{color:#ff8888}
.ge-cond-add{background:#1a1a2e;border:1px dashed #3a3a50;border-radius:4px;padding:4px 8px;color:#5060a0;font-size:10px;cursor:pointer;width:100%;text-align:center;margin-top:3px}
.ge-cond-add:hover{color:#a0a0c0;border-color:#7c3aed}

/* ── Auto-fill hint button ── */
.ge-autofill-hint{font-size:10px;color:#5070a0;cursor:pointer;padding:1px 5px;border-radius:3px;background:#0f0f1e;border:1px solid #2a2a3a}
.ge-autofill-hint:hover{color:#c4b8f0;border-color:#7c3aed}

/* ── Preview card rows ── */
.ge-preview-card-row{display:flex;align-items:center;gap:6px;padding:4px 8px;border-radius:4px;margin:2px 0;font-size:11px;color:#a0a0c0;cursor:pointer}
.ge-preview-card-row:hover{background:#1a1a2a}
.ge-preview-card-row.close-to-next{background:#1c1a10;border:1px solid #3a3010;color:#ffcc60}
.ge-preview-card-row.at-max{background:#0d1e0d;border:1px solid #1a3a1a;color:#60c080}
.ge-preview-world-pct-badge{font-size:10px;font-weight:700;padding:1px 6px;border-radius:8px;background:#1c1440;color:#c4a8ff}

/* ── History panel ── */
.ge-history-item{background:#161622;border:1px solid #2a2a3c;border-radius:5px;padding:8px 12px;display:flex;gap:10px;align-items:center;margin-bottom:6px}
.ge-history-item-ts{font-size:10px;color:#5060a0;flex-shrink:0;min-width:90px}
.ge-history-item-info{flex:1;font-size:11px;color:#a0a0c0}
</style>

<div class="ge" id="geRoot">
  <!-- Tree panel -->
  <div class="ge-tree" id="geTree">
    <div class="ge-tree-hdr">
      <span>📋 Config Tree <span id="geTreeCardCount" style="font-size:9px;color:#4050a0;font-weight:400;margin-left:4px"></span></span>
      <div style="display:flex;gap:4px;align-items:center">
        <button class="ge-btn secondary" style="padding:2px 6px;font-size:12px;line-height:1" onclick="geCollapseAllWorlds()" title="Collapse all">⊟</button>
        <button class="ge-btn secondary" style="padding:2px 6px;font-size:12px;line-height:1" onclick="geExpandAllWorlds()" title="Expand all">⊞</button>
        <button class="ge-btn secondary" style="padding:3px 8px;font-size:10px" onclick="geShowCustomExtractors()" title="Custom Extractors">🔧</button>
        <button class="ge-btn secondary" style="padding:3px 8px;font-size:10px" onclick="geAddWorld()">+ World</button>
      </div>
    </div>
    <div class="ge-tree-search-row">
      <input class="ge-tree-search" id="geTreeSearch" placeholder="🔍 Search…" oninput="geFilterTree(this.value)">
      <button class="ge-tree-filter-btn" id="geTreeIncompleteBtn" title="Show cards with unknown extractors" onclick="geToggleTreeFilter('errors')">⚠ Errors</button>
    </div>
    <div id="geTreeBody" style="flex:1;overflow-y:auto;padding:4px 0">
      <div class="ge-empty"><div class="ge-empty-icon">📡</div>Loading config...</div>
    </div>
  </div>

  <!-- Editor/preview panel -->
  <div class="ge-main" id="geMain">
    <div class="ge-main-hdr">
      <div style="display:flex;flex-direction:column;flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:10px">
          <span id="geMainBreadcrumb" style="font-size:13px;color:#8080a0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">Select an item from the tree</span>
        </div>
        <div class="ge-dirty-bar" id="geDirtyBar"></div>
      </div>
      <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
        <button class="ge-undo-btn" id="geUndoBtn" onclick="geUndo()" title="Undo (Ctrl+Z)" disabled>↩ Undo</button>
        <button class="ge-undo-btn" id="geRedoBtn" onclick="geRedo()" title="Redo (Ctrl+Y)" disabled>↪ Redo</button>
        <button class="ge-btn secondary" onclick="geShowStats()" title="Config stats" style="padding:3px 8px;font-size:10px">📊</button>
        <button class="ge-btn secondary" onclick="geShowHistory()" title="Config history &amp; backups" style="padding:3px 8px;font-size:10px">🕐</button>
        <button class="ge-btn secondary" onclick="geExportConfig()" title="Download config as JSON backup">⬇ Export</button>
        <label class="ge-btn secondary" style="cursor:pointer" title="Restore config from a JSON backup">⬆ Import<input type="file" accept=".json,application/json" style="display:none" onchange="geImportConfig(this)"></label>
        <button class="ge-btn success" onclick="geSaveConfig()" id="geSaveBtn">💾 Save Config</button>
        <span class="ge-autosave-badge" id="geAutosaveBadge" title="Autosave: saves automatically after 60s of inactivity">AS</span>
        <button class="ge-btn secondary" onclick="geTogglePreview()" id="gePreviewBtn">👁 Preview</button>
      </div>
    </div>
    <div class="ge-main-body" id="geMainBody">
      <div class="ge-empty"><div class="ge-empty-icon">🗂️</div>Select a world, category, or card from the tree to edit it.</div>
    </div>
  </div>
</div>

<div class="ge-notif" id="geNotif"></div>

<script>
// ── State ──────────────────────────────────────────────────────────────────
let _geCfg = null;            // full guidance config
let _geExtractors = [];       // list of valid extractor IDs
let _geExtractorMeta = {};    // metadata per extractor ID
let _geSelected = { worldIdx: null, catIdx: null, cardIdx: null };
let _gePreviewData = null;    // last evaluation result
let _gePreviewVisible = false;
let _geDirty = false;
let _geTypeFilter = '';       // active value-type filter in extractor picker
let _geParamOptionsCache = {}; // extId → [{value,label,group}]
let _geCustomExtractors = []; // custom extractor definitions from server
let _geCustomExtView = false; // true when custom extractor panel is shown

// #6: Undo/Redo stacks
let _geUndoStack = [];   // snapshots of _geCfg (JSON strings)
let _geRedoStack = [];

// #38: Collapse state persistence
let _geExpandedWorlds = new Set();

// #16: Autosave
let _geAutosaveTimer = null;
let _geAutosaveEnabled = true;

// ── Tier type descriptions ─────────────────────────────────────────────────
const GE_TIER_TYPE_DESC = {
  gte:          '≥ threshold — met when value is greater than or equal to the threshold. Most common type.',
  unlocked:     '🔓 unlocked — met when the feature is unlocked (value = 1, like a yes/no check).',
  count_of_n:   '✓/N count — met when X out of N items are present. Set a Total (denominator) below.',
  pct:          '% percentage — met when the percentage value (0–100) reaches the threshold.',
  has_item:     '📦 has item — met when a specific item or feature is present. Set a Param below.',
  max_any:      '↑ max — met when the single highest value (best character) reaches the threshold.',
  avg:          '∅ average — met when the average value across all characters reaches the threshold.',
  per_char:     '👤 per char — met when each character individually meets the threshold. Set a Param.',
  compound_and: '& all — met when ALL listed conditions are met simultaneously. Set Conditions JSON.',
  compound_or:  '| any — met when ANY one of the listed conditions is met. Set Conditions JSON.',
  rate:         '⏱ rate — met when the rate (per hour/day/week) reaches the threshold.',
};

// ── Param suggestions per extractor ───────────────────────────────────────
const _GE_RESOURCE_LIST = [
  'OakTree','BirchTree','JungleTree','ForestTree','ToiletTree','PalmTree','StumpTree','Tree7','AlienTree','Tree8','Tree9','Tree10','Tree11','Tree12',
  'Copper','Iron','Gold','Plat','Dementia','Void','Lustre','Starfire','Dreadlo','Godshard','Marble',
  'CopperBar','IronBar','GoldBar','PlatBar','DementiaBar','VoidBar','LustreBar','StarfireBar','DreadloBar','GodshardBar',
  'Fish1','Fish2','Fish3','Fish4','Fish5','Fish6','Fish7','Fish8','Fish9','Fish10','Fish11','Fish12','Fish13',
  'Bug1','Bug2','Bug3','Bug4','Bug5','Bug6','Bug7','Bug8','Bug9','Bug10','Bug11','Bug12','Bug13',
  'Refinery1','Refinery2','Refinery3','Refinery4','Refinery5','Refinery6',
  'FoodHealth1','FoodHealth2','FoodHealth3','FoodHealth4','FoodHealth5','FoodHealth6',
  'FoodPotOr1','FoodPotOr2','FoodPotRe1','FoodPotRe2','FoodPotGr1','FoodPotGr2',
  'CraftMat1','CraftMat2','CraftMat3','CraftMat4','CraftMat5','CraftMat6',
  'Spice1','Spice2','Spice3','Spice4','Spice5','Spice6','Spice7','Spice8','Spice9','Spice10',
  'SailTr1','SailTr2','SailTr3','SailTr4','SailTr5',
  'StampA1','StampA2','StampA3','StampA4','StampA5',
  'StampB1','StampB2','StampB3','StampB4','StampB5',
  'StampC1','StampC2','StampC3','StampC4','StampC5',
  'Quest1','Quest2','Quest3','Quest4','Quest5',
  'Timecandy1','Timecandy2','Timecandy3','Timecandy4',
  'Trophy1','Trophy2','Trophy3','Trophy4','Trophy5',
];
const _GE_STAMP_SLOTS = [];
for (let t=0;t<3;t++) for (let s=0;s<20;s++) _GE_STAMP_SLOTS.push(t+':'+s);
const GE_EXTRACTOR_PARAM_SUGGESTIONS = {
  'stamps.hasStamp':       _GE_STAMP_SLOTS,
  'items.inChest':         _GE_RESOURCE_LIST,
  'items.anywhereQty':     _GE_RESOURCE_LIST,
  'items.inSlab':          _GE_RESOURCE_LIST,
  'chips.hasChip':         ['Bublbo','Yellamo','Mushtato','Crumpleog','Donut','Double','Leek_Neck','Vman_Sleeve','Steak_Pants','Donut2','Shroomy','Hellfire','Steel_Bowtie'],
  'artifacts.hasArtifact': ['Moai','Genie_Lamp','Fauxory_Tusk','Maneki_kat','Silver_Antlers','Trilobite_Rock','Amberite','Frost_Relic','Gummy_Orb','Crystal_Ball','Fury_Relic','Dreamcatcher','Trident','Ashen_Urn','Emerald_Relic','Opera_Mask','Jade_pendant','Dwarven_Anvil','Talking_Skull'],
  'meals.hasMeal':         Array.from({length:70},(_,i)=>String(i)),
};

function geGetParamSuggestions(wi, ci, ki) {
  const card = (wi!=null&&ci!=null&&ki!=null) ? _geCfg?.worlds?.[wi]?.categories?.[ci]?.cards?.[ki] : null;
  const extId = card?.extractor || '';
  return GE_EXTRACTOR_PARAM_SUGGESTIONS[extId] || _GE_RESOURCE_LIST;
}

let _geAcTarget = null; // { input, dropEl }
function geParamAcInput(inputEl, wi, ci, ki) {
  const drop = inputEl.nextElementSibling;
  if (!drop || !drop.classList.contains('ge-param-ac')) return;
  const q = inputEl.value.toLowerCase();
  const all = geGetParamSuggestions(wi, ci, ki);
  const matches = q ? all.filter(s => s.toLowerCase().startsWith(q)).slice(0,30) : all.slice(0,30);
  if (!matches.length) { drop.classList.remove('open'); return; }
  drop.innerHTML = matches.map(s => '<div class="ge-param-ac-opt" onmousedown="event.preventDefault();geParamAcPick(this,\\'' + s + '\\')">' + s + '</div>').join('');
  drop.classList.add('open');
}
function geParamAcPick(optEl, val) {
  const drop = optEl.parentElement;
  const input = drop.previousElementSibling;
  if (input) { input.value = val; input.dispatchEvent(new Event('change',{bubbles:true})); }
  drop.classList.remove('open');
}
function geParamAcClose(inputEl) {
  setTimeout(() => { const drop = inputEl.nextElementSibling; if (drop) drop.classList.remove('open'); }, 120);
}

// ── Param Picker (searchable, grouped — mirrors the extractor picker) ──────

function geParamPickerHTML(extId, currentVal, wi, ci, ki, ti) {
  const pickKey = 'pm_' + wi + '_' + ci + '_' + ki + '_' + ti;
  const meta = _geExtractorMeta[extId];
  const hint = (meta && meta.paramHint) || 'item name or index';
  const label = (currentVal != null && currentVal !== '') ? String(currentVal) : '';
  const q = "'";
  return '<div class="ge-pm-picker" id="ge_pm_' + pickKey + '">'
    + '<button type="button" class="ge-pm-btn" onclick="geToggleParamPick(' + q + pickKey + q + ',' + q + extId + q + ')">'
    + '<span class="ge-pm-val">' + (label || '<span style="color:#5060a0">' + hint + '</span>') + '</span>'
    + (label ? '<button class="ge-pm-clear" type="button" onclick="event.stopPropagation();gePickParam(' + q + pickKey + q + ',' + q + q + ',' + wi + ',' + ci + ',' + ki + ',' + ti + ')" title="Clear">\u2715</button>' : '')
    + '</button>'
    + '<div class="ge-pm-drop" id="ge_pm_drop_' + pickKey + '">'
    + '<input class="ge-pm-search" placeholder="Search\u2026" oninput="geFilterParams(this,' + q + pickKey + q + ')" autocomplete="off">'
    + '<div class="ge-pm-list" id="ge_pm_list_' + pickKey + '"><div class="ge-pm-loading">Loading options\u2026</div></div>'
    + '</div>'
    + '<input type="hidden" id="ge_pm_val_' + pickKey + '" value="' + label + '">'
    + '</div>';
}
async function geToggleParamPick(key, extId) {
  const drop = document.getElementById('ge_pm_drop_' + key);
  if (!drop) return;
  const isOpen = drop.classList.contains('open');
  // Close all other param drops
  document.querySelectorAll('.ge-pm-drop.open').forEach(d => d.classList.remove('open'));
  if (isOpen) return;
  drop.classList.add('open');
  // Focus search
  const search = drop.querySelector('.ge-pm-search');
  if (search) { search.value = ''; search.focus(); }
  // Load options if not cached
  const list = document.getElementById('ge_pm_list_' + key);
  if (_geParamOptionsCache[extId]) {
    geRenderParamList(list, _geParamOptionsCache[extId], key, '');
  } else {
    if (list) list.innerHTML = '<div class="ge-pm-loading">Loading options…</div>';
    try {
      const res = await fetch('/api/guidance/param-options/' + encodeURIComponent(extId));
      const opts = await res.json();
      _geParamOptionsCache[extId] = opts;
      if (search) geRenderParamList(list, opts, key, search.value);
    } catch(e) {
      if (list) list.innerHTML = '<div class="ge-pm-empty">Failed to load options</div>';
    }
  }
}

function geFilterParams(inputEl, key) {
  const drop = inputEl.closest('.ge-pm-drop');
  if (!drop) return;
  const extId = drop.closest('.ge-pm-picker')?.querySelector('input[type=hidden]')?.dataset?.ext;
  // Re-read extId from key (encoded in id)
  const listEl = document.getElementById('ge_pm_list_' + key);
  if (!listEl) return;
  const q = inputEl.value.toLowerCase().trim();
  // Get all opts from DOM (faster than re-fetching)
  const allOpts = listEl.querySelectorAll('.ge-pm-opt');
  let anyGrpVisible = {};
  for (const opt of allOpts) {
    const label = (opt.textContent || '').toLowerCase();
    const val = (opt.dataset.val || '').toLowerCase();
    const grp = opt.closest('.ge-pm-grp');
    const match = !q || label.includes(q) || val.includes(q);
    opt.style.display = match ? '' : 'none';
    if (grp && match) anyGrpVisible[grp.dataset.grp] = true;
  }
  // Show/hide group headers
  listEl.querySelectorAll('.ge-pm-grp').forEach(grp => {
    const hdr = grp.querySelector('.ge-pm-grp-hdr');
    const hasVisible = anyGrpVisible[grp.dataset.grp];
    if (hdr) hdr.style.display = hasVisible ? '' : 'none';
    grp.style.display = hasVisible ? '' : 'none';
  });
}

function geRenderParamList(listEl, opts, key, q) {
  if (!listEl) return;
  const sq = "'";
  if (!opts || !opts.length) {
    listEl.innerHTML = '<div class="ge-pm-empty" style="padding:8px 10px">'
      + '<div style="margin-bottom:6px;color:#7070a0;font-size:11px">No preset options. Type a value:</div>'
      + '<input style="background:#111;border:1px solid #2a2a3c;border-radius:4px;padding:5px 8px;color:#d0d0e0;font-size:11px;width:100%;box-sizing:border-box" placeholder="Enter param value\u2026" id="ge_pm_freetext_' + key + '" oninput="geParamFreetextInput(' + sq + key + sq + ',this.value)">'
      + '</div>';
    return;
  }
  const groups = {};
  for (const o of opts) {
    const g = o.group || 'Options';
    if (!groups[g]) groups[g] = [];
    groups[g].push(o);
  }
  let html = '';
  const curVal = (document.getElementById('ge_pm_val_' + key) || {}).value || '';
  for (const [grp, items] of Object.entries(groups)) {
    html += '<div class="ge-pm-grp" data-grp="' + grp + '">';
    html += '<div class="ge-pm-grp-hdr">' + grp + '</div>';
    for (const item of items) {
      const sel = String(item.value) === curVal ? ' selected' : '';
      const qMatch = !q || item.label.toLowerCase().includes(q) || String(item.value).toLowerCase().includes(q);
      html += '<div class="ge-pm-opt' + sel + '" data-val="' + item.value + '" style="' + (qMatch ? '' : 'display:none') + '" onclick="gePickParamFromOpt(this,' + sq + key + sq + ')">'
        + item.label
        + '<span class="ge-pm-idx">' + item.value + '</span>'
        + '</div>';
    }
    html += '</div>';
  }
  listEl.innerHTML = html;
}
function gePickParamFromOpt(optEl, key) {
  const val = optEl.dataset.val;
  // Parse wi/ci/ki/ti from key (format: pm_wi_ci_ki_ti)
  const parts = key.split('_');
  gePickParam(key, val, parseInt(parts[1]), parseInt(parts[2]), parseInt(parts[3]), parseInt(parts[4]));
}

function gePickParam(key, val, wi, ci, ki, ti) {
  const hidden = document.getElementById('ge_pm_val_' + key);
  const btnVal = document.getElementById('ge_pm_' + key) && document.getElementById('ge_pm_' + key).querySelector('.ge-pm-val');
  const drop = document.getElementById('ge_pm_drop_' + key);
  if (hidden) hidden.value = val;
  if (btnVal) {
    const hint = (_geExtractorMeta[(_geCfg && _geCfg.worlds && _geCfg.worlds[wi] && _geCfg.worlds[wi].categories[ci] && _geCfg.worlds[wi].categories[ci].cards[ki]) ? _geCfg.worlds[wi].categories[ci].cards[ki].extractor : ''] || {}).paramHint || 'item name or index';
    btnVal.innerHTML = val !== '' ? String(val) : '<span style="color:#5060a0">' + hint + '</span>';
  }
  // Update clear button
  const picker = document.getElementById('ge_pm_' + key);
  if (picker) {
    let clearBtn = picker.querySelector('.ge-pm-btn .ge-pm-clear');
    if (val && !clearBtn) {
      const pmBtn = picker.querySelector('.ge-pm-btn');
      clearBtn = document.createElement('button');
      clearBtn.className = 'ge-pm-clear';
      clearBtn.type = 'button';
      clearBtn.innerHTML = '✕';
      clearBtn.title = 'Clear';
      clearBtn.onclick = function(e) { e.stopPropagation(); gePickParam(key, '', wi, ci, ki, ti); };
      pmBtn.appendChild(clearBtn);
    } else if (!val && clearBtn) {
      clearBtn.remove();
    }
  }
  if (drop) drop.classList.remove('open');
  geTierChange(wi, ci, ki, ti, 'param', val);
}

function geParamFreetextInput(key, val) {
  const hidden = document.getElementById('ge_pm_val_' + key);
  if (hidden) hidden.value = val;
  const parts = key.split('_');
  geTierChange(parseInt(parts[1]), parseInt(parts[2]), parseInt(parts[3]), parseInt(parts[4]), 'param', val);
}

// Close param drop on outside click
document.addEventListener('click', function(e) {
  if (!e.target.closest('.ge-pm-picker')) {
    document.querySelectorAll('.ge-pm-drop.open').forEach(d => d.classList.remove('open'));
  }
});

// ── Boot ───────────────────────────────────────────────────────────────────
geInit();

async function geInit() {
  try {
    const [cfgRes, extRes, metaRes, cxRes] = await Promise.all([
      fetch('/api/guidance/config'),
      fetch('/api/guidance/extractors'),
      fetch('/api/guidance/extractor-meta'),
      fetch('/api/guidance/custom-extractors'),
    ]);
    _geCfg = await cfgRes.json();
    _geExtractors = await extRes.json();
    _geExtractorMeta = await metaRes.json();
    _geCustomExtractors = await cxRes.json();
    geRenderTree();
    geShowNotif('Config loaded', 'ok');
  } catch(e) {
    geShowNotif('Failed to load config: ' + e.message, 'err');
    document.getElementById('geTreeBody').innerHTML =
      '<div class="ge-empty"><div class="ge-empty-icon">⚠️</div>Failed to load: ' + e.message + '</div>';
  }
}

// ── Icon helpers (emoji text or image URL) ────────────────────────────────
function geIsImageIcon(icon) {
  return icon && (icon.startsWith('/') || icon.startsWith('http'));
}
function geRenderIcon(icon, fallback, size) {
  size = size || 20;
  if (geIsImageIcon(icon)) return '<img src="' + icon + '" style="width:' + size + 'px;height:' + size + 'px;object-fit:contain;vertical-align:middle">';
  return '<span style="font-size:' + size + 'px;line-height:1">' + (icon || fallback || '') + '</span>';
}
function geIconPickerHTML(fieldId, currentIcon, label) {
  label = label || 'Icon';
  const isImg = geIsImageIcon(currentIcon);
  const preview = isImg
    ? '<img src="' + currentIcon + '" style="width:100%;height:100%;object-fit:contain">'
    : (currentIcon || '');
  return '<div class="ge-field"><label>' + label + '</label>'
    + '<div class="ge-icon-picker">'
    + '<div class="ge-icon-preview" id="' + fieldId + '_preview">' + preview + '</div>'
    + '<input id="' + fieldId + '" value="' + (currentIcon || '') + '" placeholder="Emoji or image URL" style="flex:1;background:#111;border:1px solid #2a2a3c;border-radius:4px;padding:4px 6px;color:#d0d0e0;font-size:12px" oninput="geIconInputChanged(\\'' + fieldId + '\\')">'
    + '<label class="ge-icon-upload-btn" title="Upload PNG/APNG">\uD83D\uDCC2 Upload<input type="file" accept="image/*" style="display:none" onchange="geUploadIcon(\\'' + fieldId + '\\',this)"></label>'
    + '<button class="ge-icon-upload-btn" onclick="document.getElementById(\\'' + fieldId + '\\').value=\\'\\';geIconInputChanged(\\'' + fieldId + '\\')" title="Clear icon" style="color:#ff6060">✕</button>'
    + '</div></div>';
}
async function geUploadIcon(fieldId, fileInput) {
  const file = fileInput.files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append('image', file);
  try {
    const res = await fetch('/upload/image', { method: 'POST', body: fd });
    const data = await res.json();
    if (!data.success) { geShowNotif('Upload failed: ' + (data.error || 'Unknown'), 'err'); return; }
    document.getElementById(fieldId).value = data.url;
    geIconInputChanged(fieldId);
    geMark();
    geShowNotif('Image uploaded', 'ok');
  } catch (e) { geShowNotif('Upload error: ' + e.message, 'err'); }
  fileInput.value = '';
}
function geIconInputChanged(fieldId) {
  const input = document.getElementById(fieldId);
  const preview = document.getElementById(fieldId + '_preview');
  if (!input || !preview) return;
  const val = input.value.trim();
  if (geIsImageIcon(val)) {
    preview.innerHTML = '<img src="' + val + '" style="width:100%;height:100%;object-fit:contain">';
  } else {
    preview.innerHTML = val || '';
  }
  geMark();
}
async function geUploadTierIcon(fieldId, wi, ci, ki, ti, fileInput) {
  const file = fileInput.files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append('image', file);
  try {
    const res = await fetch('/upload/image', { method: 'POST', body: fd });
    const data = await res.json();
    if (!data.success) { geShowNotif('Upload failed: ' + (data.error || 'Unknown'), 'err'); return; }
    document.getElementById(fieldId).value = data.url;
    geTierChange(wi, ci, ki, ti, 'icon', data.url);
    geIconInputChanged(fieldId);
    geShowNotif('Tier icon uploaded', 'ok');
  } catch (e) { geShowNotif('Upload error: ' + e.message, 'err'); }
  fileInput.value = '';
}

// ── Extractor info panel ──────────────────────────────────────────────────
function geShowExtractorInfo(extId) {
  const panel = document.getElementById('ge_extractor_info');
  if (!panel) return;
  const m = _geExtractorMeta[extId];
  if (!m) {
    panel.style.display = 'none';
    return;
  }
  const typeColors = { count: '#60a8ff', max: '#ffc060', sum: '#80d080', score: '#d080ff', pct: '#60c0c0', avg: '#c0a060', bool: '#ff8080' };
  const typeColor = typeColors[m.valueType] || '#8080a0';
  panel.style.display = 'block';
  panel.innerHTML = '<div style="display:flex;align-items:flex-start;gap:10px">'
    + '<div style="flex:1">'
    + '<div style="font-size:12px;font-weight:700;color:#c4b8f0;margin-bottom:3px">' + m.label + '</div>'
    + '<div style="font-size:11px;color:#9090b0;line-height:1.45;margin-bottom:5px">' + m.desc + '</div>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap">'
    + '<span style="font-size:10px;background:#161628;border:1px solid #2a2a3c;border-radius:3px;padding:2px 6px;color:#6080c0">\uD83D\uDDDD ' + m.dataKey + '</span>'
    + '<span style="font-size:10px;background:#161628;border:1px solid #2a2a3c;border-radius:3px;padding:2px 6px;color:' + typeColor + '">' + m.valueType + '</span>'
    + '<span style="font-size:10px;background:#161628;border:1px solid #2a2a3c;border-radius:3px;padding:2px 6px;color:#a0a060">max ~' + (m.maxHint != null ? m.maxHint.toLocaleString() : '?') + '</span>'
    + (m.paramHint ? '<span style="font-size:10px;background:#161628;border:1px solid #2a2a3c;border-radius:3px;padding:2px 6px;color:#c08060">param: ' + m.paramHint + '</span>' : '')
    + '</div></div></div>';
}

// ── Extractor Picker (searchable + grouped) ──────────────────────────────
function geExtractorPickerHTML(currentValue) {
  const m = _geExtractorMeta[currentValue];
  const typeColors = { count: '#60a8ff', max: '#ffc060', sum: '#80d080', score: '#d080ff', pct: '#60c0c0', avg: '#c0a060', bool: '#ff8080' };
  const btnLabel = m ? m.label : (currentValue || 'Select extractor…');
  const btnType = m ? '<span class="ge-ext-type" style="color:' + (typeColors[m.valueType]||'#8080a0') + '">' + m.valueType + '</span>' : '';
  // Build grouped options
  const groups = {};
  for (const id of _geExtractors) {
    const meta = _geExtractorMeta[id];
    const grp = meta ? meta.group : 'Other';
    if (!groups[grp]) groups[grp] = [];
    groups[grp].push(id);
  }
  let listHTML = '';
  for (const [grp, ids] of Object.entries(groups)) {
    listHTML += '<div class="ge-ext-grp" data-group="' + grp + '">';
    listHTML += '<div class="ge-ext-grp-hdr">' + grp + ' <span style="opacity:.5;font-weight:400">(' + ids.length + ')</span></div>';
    for (const id of ids) {
      const em = _geExtractorMeta[id];
      const label = em ? em.label : id;
      const vt = em ? em.valueType : '';
      const desc = em ? (em.desc || '') : '';
      const tc = typeColors[vt] || '#8080a0';
      const sel = id === currentValue ? ' selected' : '';
      listHTML += '<div class="ge-ext-opt' + sel + '" data-id="' + id + '" data-label="' + label.toLowerCase() + '" data-group-name="' + grp.toLowerCase() + '" data-vt="' + vt + '" onclick="gePickExtractor(\\\'' + id + '\\\')" title="' + desc.replace(/"/g,'&#34;') + '">'; 
      listHTML += '<div style="display:flex;flex-direction:column;gap:1px;flex:1;min-width:0">';
      listHTML += '<span>' + label + '</span>';
      if (desc) listHTML += '<span style="font-size:9px;color:#5060a0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + desc + '</span>';
      listHTML += '</div>';
      listHTML += '<span class="ge-ext-type" style="color:' + tc + '">' + vt + '</span>';
      listHTML += '</div>';
    }
    listHTML += '</div>';
  }
  const pills = [['','All'],['count','# Count'],['max','↑ Max'],['sum','Σ Sum'],['avg','∅ Avg'],['pct','% Pct'],['bool','✓ Bool'],['score','★ Score']];
  const pillsHTML = '<div class="ge-ext-types" id="ge_ext_types">'
    + pills.map(function(p){return '<span class="ge-ext-tpill' + (p[0]==='' ? ' active' : '') + '" data-t="' + p[0] + '" onclick="geFilterExtractorType(\\\'' + p[0] + '\\\')">' + p[1] + '</span>';}).join('')
    + '</div>';
  return '<div class="ge-ext-picker" id="ge_ext_picker">'
    + '<button type="button" class="ge-ext-btn" onclick="geToggleExtPicker()">'
    + '<span id="ge_ext_label">' + btnLabel + '</span>' + btnType
    + '</button>'
    + '<div class="ge-ext-drop" id="ge_ext_drop">'
    + '<input class="ge-ext-search" id="ge_ext_search" placeholder="Search extractors…" oninput="geFilterExtractors(this.value)" autocomplete="off">'
    + pillsHTML
    + '<div class="ge-ext-list" id="ge_ext_list">' + listHTML + '</div>'
    + '</div>'
    + '<input type="hidden" id="gf_kextractor" value="' + (currentValue || '') + '">'
    + '</div>';
}

function geToggleExtPicker() {
  const drop = document.getElementById('ge_ext_drop');
  if (!drop) return;
  const isOpen = drop.classList.contains('open');
  drop.classList.toggle('open');
  if (!isOpen) {
    _geTypeFilter = '';
    const pills = document.querySelectorAll('#ge_ext_types .ge-ext-tpill');
    for (const pill of pills) pill.classList.toggle('active', pill.getAttribute('data-t') === '');
    const search = document.getElementById('ge_ext_search');
    if (search) { search.value = ''; geFilterExtractors(''); search.focus(); }
  }
}

function geFilterExtractors(q) {
  q = q.toLowerCase().trim();
  const list = document.getElementById('ge_ext_list');
  if (!list) return;
  const groups = list.querySelectorAll('.ge-ext-grp');
  for (const grp of groups) {
    const opts = grp.querySelectorAll('.ge-ext-opt');
    let anyVisible = false;
    for (const opt of opts) {
      const label = opt.getAttribute('data-label') || '';
      const id = opt.getAttribute('data-id') || '';
      const gn = opt.getAttribute('data-group-name') || '';
      const vt = opt.getAttribute('data-vt') || '';
      const textMatch = !q || label.includes(q) || id.includes(q) || gn.includes(q);
      const typeMatch = !_geTypeFilter || vt === _geTypeFilter;
      const match = textMatch && typeMatch;
      opt.style.display = match ? '' : 'none';
      if (match) anyVisible = true;
    }
    grp.style.display = anyVisible ? '' : 'none';
  }
}

function geFilterExtractorType(t) {
  _geTypeFilter = t;
  const pills = document.querySelectorAll('#ge_ext_types .ge-ext-tpill');
  for (const pill of pills) pill.classList.toggle('active', pill.getAttribute('data-t') === t);
  const search = document.getElementById('ge_ext_search');
  geFilterExtractors(search ? search.value : '');
}

function gePickExtractor(id) {
  document.getElementById('gf_kextractor').value = id;
  const m = _geExtractorMeta[id];
  const typeColors = { count: '#60a8ff', max: '#ffc060', sum: '#80d080', score: '#d080ff', pct: '#60c0c0', avg: '#c0a060', bool: '#ff8080' };
  const btn = document.getElementById('ge_ext_picker').querySelector('.ge-ext-btn');
  btn.innerHTML = '<span id="ge_ext_label">' + (m ? m.label : id) + '</span>'
    + (m ? '<span class="ge-ext-type" style="color:' + (typeColors[m.valueType]||'#8080a0') + '">' + m.valueType + '</span>' : '');
  // Update selected state
  document.querySelectorAll('#ge_ext_list .ge-ext-opt').forEach(o => o.classList.toggle('selected', o.getAttribute('data-id') === id));
  document.getElementById('ge_ext_drop').classList.remove('open');
  geMark();
  geShowExtractorInfo(id);
  // Auto-change tier types: bool extractor → has_item
  if (m && m.valueType === 'bool') {
    const { worldIdx: wi, catIdx: ci, cardIdx: ki } = _geSelected;
    if (wi != null && ci != null && ki != null) {
      const card = _geCfg.worlds[wi].categories[ci].cards[ki];
      let changed = false;
      for (const t of card.tiers) {
        if (!t.type || t.type === 'gte' || t.type === 'unlocked') { t.type = 'has_item'; changed = true; }
      }
      if (changed) geRenderEditor();
      else { const { worldIdx: wi2, catIdx: ci2, cardIdx: ki2 } = _geSelected; if (wi2!=null&&ci2!=null&&ki2!=null) geRenderValidationPanel(wi2,ci2,ki2); }
    }
  } else {
    // Non-bool extractor picked: just re-validate the current card
    const { worldIdx: wi, catIdx: ci, cardIdx: ki } = _geSelected;
    if (wi != null && ci != null && ki != null) geRenderValidationPanel(wi, ci, ki);
  }
}

// Close picker on outside click
document.addEventListener('click', function(e) {
  const picker = document.getElementById('ge_ext_picker');
  if (picker && !picker.contains(e.target)) {
    const drop = document.getElementById('ge_ext_drop');
    if (drop) drop.classList.remove('open');
  }
});

// ── Tree Render ────────────────────────────────────────────────────────────
let _geTreeFilter = '';
let _geTreeFilterMode = ''; // '' | 'errors'

function geRenderTree() {
  const body = document.getElementById('geTreeBody');
  if (!_geCfg?.worlds?.length) {
    body.innerHTML = '<div class="ge-empty"><div class="ge-empty-icon">🌍</div>No worlds yet. Add one!</div>';
    return;
  }

  // Update total card count in header
  let totalCards = 0;
  for (const w of _geCfg.worlds) for (const c of w.categories || []) totalCards += (c.cards || []).length;
  const countEl = document.getElementById('geTreeCardCount');
  if (countEl) countEl.textContent = totalCards ? '(' + totalCards + ')' : '';

  // #38: Sync expanded state — always expand selected world
  if (_geSelected.worldIdx != null) _geExpandedWorlds.add(_geSelected.worldIdx);

  const worldCount = _geCfg.worlds.length;
  body.innerHTML = _geCfg.worlds.map((world, wi) => {
    // #38: Use persistent expanded set, fallback to selected world
    const isWorldOpen = _geExpandedWorlds.has(wi) || _geSelected.worldIdx === wi;
    const wMoves = '<span class="ge-move-btns">'
      + (wi > 0 ? '<button class="ge-move-btn" onclick="event.stopPropagation();geMoveWorld(' + wi + ',-1)" title="Move up">↑</button>' : '')
      + (wi < worldCount-1 ? '<button class="ge-move-btn" onclick="event.stopPropagation();geMoveWorld(' + wi + ',1)" title="Move down">↓</button>' : '')
      + '</span>';
    const catCount = (world.categories || []).length;
    return \`<div class="ge-world" data-wi="\${wi}">
      <div class="ge-world-row \${isWorldOpen && _geSelected.catIdx == null ? 'active' : ''}"
           onclick="geSelectWorld(\${wi})">
        <span style="font-size:16px">\${geRenderIcon(world.icon, '🌍', 16)}</span>
        <span style="flex:1">\${world.label || world.id}</span>
        <span class="ge-world-chv \${isWorldOpen ? 'open' : ''}">›</span>
        \${wMoves}
      </div>
      <div class="ge-world-body \${isWorldOpen ? 'open' : ''}">
        \${(world.categories || []).map((cat, ci) => {
          const isCatOpen = isWorldOpen && _geSelected.catIdx === ci;
          const cMoves = '<span class="ge-move-btns">'
            + (ci > 0 ? '<button class="ge-move-btn" onclick="event.stopPropagation();geMoveCategory(' + wi + ',' + ci + ',-1)" title="Move up">↑</button>' : '')
            + (ci < catCount-1 ? '<button class="ge-move-btn" onclick="event.stopPropagation();geMoveCategory(' + wi + ',' + ci + ',1)" title="Move down">↓</button>' : '')
            + '</span>';
          const cardCount = (cat.cards || []).length;
          const errorCards = (cat.cards || []).filter(function(c) { return c.cardType !== 'info' && c.extractor && !_geExtractors.includes(c.extractor); }).length;
          const badgeClass = errorCards > 0 ? 'incomplete' : (cardCount > 0 ? 'complete' : '');
          const badgeText = cardCount + (errorCards > 0 ? ' ⚠' + errorCards : '');
          return \`<div class="ge-cat-row \${isCatOpen && _geSelected.cardIdx == null ? 'active' : ''}"
                       onclick="geSelectCat(\${wi}, \${ci})">
            <span>\${geRenderIcon(cat.icon, '📂', 14)}</span>
            <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${cat.label || cat.id}</span>
            <span class="ge-cat-badge \${badgeClass}">\${badgeText}</span>
            \${cMoves}
          </div>
          \${(cat.cards || []).map((card, ki) => {
            const kMoves = '<span class="ge-move-btns">'
              + (ki > 0 ? '<button class="ge-move-btn" onclick="event.stopPropagation();geMoveCard(' + wi + ',' + ci + ',' + ki + ',-1)" title="Move up">↑</button>' : '')
              + (ki < cardCount-1 ? '<button class="ge-move-btn" onclick="event.stopPropagation();geMoveCard(' + wi + ',' + ci + ',' + ki + ',1)" title="Move down">↓</button>' : '')
              + '</span>';
            const infoTag = card.cardType === 'info' ? ' <span style="font-size:9px;color:#6060a0;border:1px solid #2a2a3c;border-radius:2px;padding:0 3px">info</span>' : '';
            const hasError = card.cardType !== 'info' && card.extractor && !_geExtractors.includes(card.extractor);
            const notesDot = card.notes && card.notes.trim() ? '<span class="ge-card-notes-dot"></span>' : '';
            return \`<div class="ge-card-row \${hasError ? 'has-error ' : ''}\${isCatOpen && _geSelected.cardIdx === ki ? 'active' : ''}"
                   onclick="geSelectCard(\${wi}, \${ci}, \${ki})">
              <span class="ge-card-icon">\${geRenderIcon(card.icon, '🃏', 14)}</span>
              <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${card.label || card.id}\${infoTag}</span>
              \${notesDot}\${kMoves}
            </div>\`;
          }).join('')}\`;
        }).join('')}
        <div style="padding:4px 8px 8px">
          <button class="ge-tier-add" onclick="geAddCategory(\${wi})">+ Add Category</button>
        </div>
      </div>
    </div>\`;
  }).join('');
  // Apply any active filter
  geApplyTreeFilter();
}

function geFilterTree(q) {
  _geTreeFilter = (q || '').toLowerCase().trim();
  geApplyTreeFilter();
}

function geToggleTreeFilter(mode) {
  _geTreeFilterMode = _geTreeFilterMode === mode ? '' : mode;
  const btn = document.getElementById('geTreeIncompleteBtn');
  if (btn) btn.classList.toggle('active', _geTreeFilterMode === mode);
  geApplyTreeFilter();
}

function geApplyTreeFilter() {
  const body = document.getElementById('geTreeBody');
  if (!body) return;
  const q = _geTreeFilter;
  const errorsOnly = _geTreeFilterMode === 'errors';
  const cardRows = body.querySelectorAll('.ge-card-row');
  for (const row of cardRows) {
    const text = (row.textContent || '').toLowerCase();
    const hasError = row.classList.contains('has-error');
    const qMatch = !q || text.includes(q);
    const errMatch = !errorsOnly || hasError;
    row.style.display = qMatch && errMatch ? '' : 'none';
  }
  // Show/hide category rows based on whether any of their cards are visible
  const catRows = body.querySelectorAll('.ge-cat-row');
  for (const catRow of catRows) {
    // Next siblings until next cat-row are the card rows for this cat
    if (!q && !errorsOnly) { catRow.style.display = ''; continue; }
    let next = catRow.nextElementSibling;
    let anyVisible = false;
    while (next && !next.classList.contains('ge-cat-row') && !next.classList.contains('ge-world-row') && !next.classList.contains('ge-world')) {
      if (next.classList.contains('ge-card-row') && next.style.display !== 'none') { anyVisible = true; break; }
      next = next.nextElementSibling;
    }
    catRow.style.display = anyVisible ? '' : 'none';
  }
}

function geCollapseAllWorlds() {
  _geExpandedWorlds.clear();
  const bodies = document.querySelectorAll('.ge-world-body');
  for (const b of bodies) b.classList.remove('open');
  const chvs = document.querySelectorAll('.ge-world-chv');
  for (const c of chvs) c.classList.remove('open');
}

function geExpandAllWorlds() {
  for (let i = 0; i < (_geCfg?.worlds?.length || 0); i++) _geExpandedWorlds.add(i);
  const bodies = document.querySelectorAll('.ge-world-body');
  for (const b of bodies) b.classList.add('open');
  const chvs = document.querySelectorAll('.ge-world-chv');
  for (const c of chvs) c.classList.add('open');
}


// ── Selection ─────────────────────────────────────────────────────────────
function geSelectWorld(wi) {
  // #38: Toggle collapse if clicking already-selected world with no category open
  if (_geSelected.worldIdx === wi && _geSelected.catIdx == null) {
    if (_geExpandedWorlds.has(wi)) _geExpandedWorlds.delete(wi); else _geExpandedWorlds.add(wi);
  } else {
    _geExpandedWorlds.add(wi);
  }
  _geSelected = { worldIdx: wi, catIdx: null, cardIdx: null };
  geRenderTree();
  geRenderEditor();
}
function geSelectCat(wi, ci) {
  _geSelected = { worldIdx: wi, catIdx: ci, cardIdx: null };
  geRenderTree();
  geRenderEditor();
}
function geSelectCard(wi, ci, ki) {
  _geSelected = { worldIdx: wi, catIdx: ci, cardIdx: ki };
  geRenderTree();
  geRenderEditor();
}

// ── Editor Render ──────────────────────────────────────────────────────────
function geRenderEditor() {
  const { worldIdx: wi, catIdx: ci, cardIdx: ki } = _geSelected;
  const body = document.getElementById('geMainBody');
  const bc   = document.getElementById('geMainBreadcrumb');

  if (wi == null) {
    body.innerHTML = '<div class="ge-empty"><div class="ge-empty-icon">🗂️</div>Select an item to edit.</div>';
    bc.textContent = 'No selection';
    return;
  }

  const world = _geCfg.worlds[wi];
  if (ki != null) {
    const card = world.categories[ci].cards[ki];
    bc.innerHTML = geRenderIcon(world.icon,'🌍',14) + ' ' + world.label + ' › ' + geRenderIcon(world.categories[ci].icon,'📂',14) + ' ' + world.categories[ci].label + ' › ' + geRenderIcon(card.icon,'🃏',14) + ' ' + card.label;
    body.innerHTML = geCardEditorHTML(wi, ci, ki);
    // Pre-fill extractor info panel after DOM injection
    geShowExtractorInfo(card.extractor);
    // Initial validation pass — show any existing issues immediately
    geRenderValidationPanel(wi, ci, ki);
  } else if (ci != null) {
    const cat = world.categories[ci];
    bc.innerHTML = geRenderIcon(world.icon,'🌍',14) + ' ' + world.label + ' › ' + geRenderIcon(cat.icon,'📂',14) + ' ' + cat.label;
    body.innerHTML = geCatEditorHTML(wi, ci);
  } else {
    bc.innerHTML = geRenderIcon(world.icon,'🌍',14) + ' ' + world.label;
    body.innerHTML = geWorldEditorHTML(wi);
  }
}

// ── World Editor ───────────────────────────────────────────────────────────
function geWorldEditorHTML(wi) {
  const w = _geCfg.worlds[wi];
  return \`
<div class="ge-form-section">
  <h3>🌍 World Settings</h3>
  <div class="ge-row">
    <div class="ge-field"><label>ID</label><input id="gf_wid" value="\${w.id}" readonly style="opacity:.6;cursor:not-allowed"></div>
    \${geIconPickerHTML('gf_wicon', w.icon, 'Icon')}
  </div>
  <div class="ge-row">
    <div class="ge-field"><label>Label</label><input id="gf_wlabel" value="\${w.label || ''}" oninput="geMark()"></div>
    <div class="ge-field"><label>Weight (1.0 = normal)</label><input id="gf_wweight" type="number" step="0.1" value="\${w.weight ?? 1.0}" oninput="geMark()"></div>
  </div>
</div>
<div style="display:flex;gap:8px">
  <button class="ge-btn secondary" onclick="geCloneWorld(\${wi})" title="Duplicate this world and all its categories/cards">📋 Clone World</button>
  <button class="ge-btn danger" onclick="geDeleteWorld(\${wi})">🗑 Delete World</button>
</div>
<div class="ge-form-section" style="margin-top:18px">
  <h3>📂 Categories <span style="color:#404060;font-weight:400;font-size:11px">(click a category in the tree to edit)</span></h3>
  \${(w.categories || []).map((c, ci) => \`
  <div style="display:flex;align-items:center;gap:8px;padding:6px;background:#161622;border-radius:5px;margin-bottom:4px">
    <span>\${geRenderIcon(c.icon, '📂', 14)}</span>
    <span style="flex:1;font-size:12px;color:#c0c0d0">\${c.label}</span>
    <span style="font-size:10px;color:#5060a0">\${(c.cards||[]).length} cards</span>
    <button class="ge-btn secondary" style="padding:3px 8px;font-size:10px" onclick="geSelectCat(\${wi},\${ci})">Edit</button>
  </div>\`).join('')}
  <button class="ge-tier-add" style="margin-top:6px" onclick="geAddCategory(\${wi})">+ Add Category</button>
</div>\`;
}

function geSaveWorld(wi) {
  const w = _geCfg.worlds[wi];
  w.icon   = document.getElementById('gf_wicon').value.trim() || w.icon;
  w.label  = document.getElementById('gf_wlabel').value.trim() || w.label;
  w.weight = parseFloat(document.getElementById('gf_wweight').value) || 1.0;
  geRenderTree();
  geMark();
  geShowNotif('World updated', 'ok');
}

// ── Category Editor ────────────────────────────────────────────────────────
function geCatEditorHTML(wi, ci) {
  const cat = _geCfg.worlds[wi].categories[ci];
  const errorCards = (cat.cards || []).filter(function(c) { return c.cardType !== 'info' && c.extractor && !_geExtractors.includes(c.extractor); });
  const errorsBanner = errorCards.length > 0
    ? \`<div style="background:#1c0e0e;border:1px solid #4a1a1a;border-radius:5px;padding:6px 10px;font-size:11px;color:#ff9090;margin-bottom:10px">
        ⚠️ \${errorCards.length} card(s) have unknown extractors: \${errorCards.map(function(c){return c.label;}).join(', ')}
      </div>\`
    : '';
  return \`
\${errorsBanner}
<div class="ge-form-section">
  <h3>📂 Category Settings</h3>
  <div class="ge-row">
    <div class="ge-field"><label>ID</label><input value="\${cat.id}" readonly style="opacity:.6;cursor:not-allowed"></div>
    \${geIconPickerHTML('gf_cicon', cat.icon, 'Icon')}
  </div>
  <div class="ge-row">
    <div class="ge-field"><label>Label</label><input id="gf_clabel" value="\${cat.label || ''}" oninput="geMark()"></div>
    <div class="ge-field"><label>Weight <span style="font-size:9px;color:#5060a0;font-weight:400">(relative to other categories)</span></label><input id="gf_cweight" type="number" step="0.1" value="\${cat.weight ?? 1.0}" oninput="geMark()"></div>
  </div>
</div>
<div style="display:flex;gap:8px;flex-wrap:wrap">
  <button class="ge-btn secondary" onclick="geCloneCategory(\${wi},\${ci})" title="Duplicate this category and all its cards">📋 Duplicate</button>
  <button class="ge-btn secondary" onclick="geExportWorld(\${wi})" title="Export this world to JSON">⬇ Export World</button>
  <button class="ge-btn danger" onclick="geDeleteCat(\${wi},\${ci})">🗑 Delete Category</button>
</div>
<div class="ge-form-section" style="margin-top:18px">
  <h3>🃏 Cards <span style="color:#404060;font-weight:400;font-size:11px">(\${(cat.cards||[]).length} total)</span></h3>
  \${(cat.cards || []).map((card, ki) => {
    const hasErr = card.cardType !== 'info' && card.extractor && !_geExtractors.includes(card.extractor);
    return \`
  <div style="display:flex;align-items:center;gap:8px;padding:6px;background:\${hasErr ? '#1c0e0e' : '#161622'};border:1px solid \${hasErr ? '#4a1a1a' : '#222232'};border-radius:5px;margin-bottom:4px">
    <span>\${geRenderIcon(card.icon, '🃏', 14)}</span>
    <span style="flex:1;font-size:12px;color:\${hasErr ? '#ff9090' : '#c0c0d0'}">\${card.label}\${hasErr ? ' ⚠️' : ''}</span>
    <span style="font-size:10px;color:#5060a0;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${card.extractor || ''}</span>
    <span style="font-size:10px;color:#404060">\${(card.tiers||[]).length} tiers</span>
    <button class="ge-btn secondary" style="padding:3px 8px;font-size:10px" onclick="geSelectCard(\${wi},\${ci},\${ki})">Edit</button>
  </div>\`}).join('')}
  <button class="ge-tier-add" style="margin-top:6px" onclick="geAddCard(\${wi},\${ci})">+ Add Card</button>
  <button class="ge-tier-add" style="margin-top:4px;color:#8080c0" onclick="geAddInfoCard(\${wi},\${ci})">ℹ️ Add Info Card</button>
</div>\`;
}

function geSaveCat(wi, ci) {
  const cat = _geCfg.worlds[wi].categories[ci];
  cat.icon   = document.getElementById('gf_cicon').value.trim() || cat.icon;
  cat.label  = document.getElementById('gf_clabel').value.trim() || cat.label;
  cat.weight = parseFloat(document.getElementById('gf_cweight').value) || 1.0;
  geRenderTree();
  geMark();
  geShowNotif('Category updated', 'ok');
}

// ── Card Editor ────────────────────────────────────────────────────────────
// ── Card Validation ────────────────────────────────────────────────────────
/**
 * Validates a card by reading live DOM field values (for basic text inputs) and
 * the in-memory card tiers (always kept in sync via geTierChange).
 *
 * Returns { errors: string[], warnings: string[] }
 *   errors   → block save
 *   warnings → informational only
 */
function geValidateCardForm(wi, ci, ki) {
  const card = _geCfg.worlds[wi].categories[ci].cards[ki];
  const errors = [];
  const warnings = [];

  if (card.cardType === 'info') {
    const textEl = document.getElementById('gf_ktext');
    if (textEl && !textEl.value.trim()) warnings.push('Info card has no text content.');
    return { errors, warnings };
  }

  // ── Basic fields (read from DOM if available, else card object) ──────────
  const labelEl   = document.getElementById('gf_klabel');
  const label     = labelEl ? labelEl.value.trim() : (card.label || '');
  const extId     = (document.getElementById('gf_kextractor') || {}).value || card.extractor || '';
  const weightEl  = document.getElementById('gf_kweight');
  const rawWeight = weightEl ? weightEl.value : String(card.weight ?? '1');
  const weight    = parseFloat(rawWeight);
  const extMeta   = _geExtractorMeta[extId] || null;

  // 1. Label
  if (!label) errors.push('Label is required — it is shown to users on the review panel.');

  // 2. Extractor
  if (!extId || extId === '__custom__') {
    errors.push('No extractor selected — card cannot be evaluated and will always score 0.');
  } else {
    const knownBuiltIn   = _geExtractors.includes(extId);
    const knownCustom    = (_geCustomExtractors || []).some(cx => cx.id === extId);
    if (!knownBuiltIn && !knownCustom) {
      errors.push('Extractor "' + extId + '" is not in the known extractor list — card will score 0 on evaluation. Check for typos or pick from the dropdown.');
    } else if (extMeta && extMeta.valueType === 'bool') {
      // bool extractor should use has_item tiers
      const hasBoolTier = (card.tiers || []).some(t => t.type === 'has_item' || t.type === 'unlocked');
      if (!hasBoolTier) warnings.push('Extractor "' + (extMeta.label || extId) + '" returns a boolean — consider using "has_item" or "unlocked" tier type.');
    }
    if (extMeta && extMeta.paramHint) {
      const anyParamTier = (card.tiers || []).some(t => t.type === 'has_item' || t.type === 'per_char');
      if (!anyParamTier) warnings.push('Extractor "' + (extMeta.label || extId) + '" expects a param (' + extMeta.paramHint + ') but no tier uses a param type.');
    }
  }

  // 3. Weight
  if (rawWeight.trim() === '' || isNaN(weight)) {
    errors.push('Weight must be a number (0 = exclude from scoring, 1.0 = normal).');
  } else if (weight < 0) {
    errors.push('Weight cannot be negative. Use 0 to exclude from scoring.');
  } else if (weight > 10) {
    warnings.push('Weight ' + weight + ' is unusually high (> 10). This card will dominate category scoring.');
  }

  // 4. Tiers
  const tiers = card.tiers || [];
  if (tiers.length === 0) {
    errors.push('At least one tier is required — without tiers, the card cannot evaluate progress.');
  } else {
    const thresholds = [];

    for (let ti = 0; ti < tiers.length; ti++) {
      const t     = tiers[ti];
      const tNum  = 'Tier ' + (ti + 1);
      const type  = t.type || 'gte';
      const thr   = parseFloat(t.threshold);

      // 4a. Threshold must be numeric
      if (t.threshold === '' || t.threshold == null || isNaN(thr)) {
        errors.push(tNum + ': threshold is missing or not a number.');
      } else {
        thresholds.push({ idx: ti, val: thr });

        // 4b. maxHint overflow — only for gte/count types
        if (extMeta && extMeta.maxHint != null && type === 'gte' && thr > extMeta.maxHint * 2) {
          warnings.push(tNum + ': threshold ' + thr.toLocaleString() + ' is more than 2× the extractor\\'s estimated max (~' + extMeta.maxHint.toLocaleString() + '). This tier may never be reachable.');
        }

        // 4c. pct threshold sanity
        if (type === 'pct' && (thr < 0 || thr > 100)) {
          warnings.push(tNum + ': "pct" type expects threshold 0–100, got ' + thr + '.');
        }

        // 4d. unlocked sanity
        if (type === 'unlocked' && thr !== 0 && thr !== 1) {
          warnings.push(tNum + ': "unlocked" type is designed for threshold 0 or 1, got ' + thr + '.');
        }
      }

      // 4e. Label
      if (!t.label || !String(t.label).trim()) {
        warnings.push(tNum + ' has no label — users will see it as "Tier ' + (ti + 1) + '" with no context.');
      }

      // 4f. Type-specific requirements
      if (type === 'has_item' || type === 'per_char') {
        if (!t.param && t.param !== 0) {
          errors.push(tNum + ': type "' + type + '" requires a param — pick one from the param list below the tier.');
        }
      }
      if (type === 'count_of_n') {
        const total = parseFloat(t.total);
        if (!t.total && t.total !== 0 || isNaN(total) || total <= 0) {
          errors.push(tNum + ': type "count_of_n" requires a positive Total (denominator) to compute the fraction.');
        }
      }
      if (type === 'rate') {
        if (!t.per) {
          errors.push(tNum + ': type "rate" requires a period (/ hour, / day, or / week).');
        }
      }
      if (type === 'compound_and' || type === 'compound_or') {
        if (!Array.isArray(t.conditions) || t.conditions.length === 0) {
          errors.push(tNum + ': "' + type + '" requires at least one condition. Add conditions using the builder.');
        } else {
          for (let ci2 = 0; ci2 < t.conditions.length; ci2++) {
            const cond = t.conditions[ci2];
            if (!cond.extractor) errors.push(tNum + ' condition ' + (ci2 + 1) + ': missing extractor.');
            if (!_geExtractors.includes(cond.extractor) && cond.extractor) {
              errors.push(tNum + ' condition ' + (ci2 + 1) + ': extractor "' + cond.extractor + '" not found.');
            }
            if (cond.threshold === undefined || cond.threshold === null || isNaN(parseFloat(cond.threshold))) {
              errors.push(tNum + ' condition ' + (ci2 + 1) + ': missing or invalid threshold.');
            }
          }
        }
      }
    }

    // 4g. Ascending order
    if (thresholds.length > 1) {
      const outOfOrder = thresholds.some((t2, i) => i > 0 && t2.val <= thresholds[i - 1].val);
      if (outOfOrder) {
        errors.push('Tier thresholds are not in ascending order. Use ↕ Sort or reorder manually — each tier must have a strictly higher threshold than the previous.');
      } else {
        // 4h. Duplicate thresholds
        const seen = new Map();
        for (const t2 of thresholds) {
          if (seen.has(t2.val)) {
            warnings.push('Duplicate threshold ' + t2.val.toLocaleString() + ' on Tier ' + (seen.get(t2.val) + 1) + ' and Tier ' + (t2.idx + 1) + '.');
          } else {
            seen.set(t2.val, t2.idx);
          }
        }
      }
    }

    // 4i. All-zero thresholds
    if (thresholds.length > 0 && thresholds.every(t2 => t2.val === 0)) {
      warnings.push('All tier thresholds are 0 — the card will never show progress past "not started".');
    }
  }

  // 5. displayFormat = 'pct' without maxHint
  const fmt = document.getElementById('gf_kformat') ? document.getElementById('gf_kformat').value : card.displayFormat;
  if (fmt === 'pct' && extId && (!extMeta || extMeta.maxHint == null)) {
    warnings.push('Display format is "%" but the extractor has no maxHint — the progress bar cannot compute a percentage.');
  }

  return { errors, warnings };
}

/**
 * Re-runs validation and updates the inline error panel in the card editor.
 * Safe to call at any time; exits early if the panel div is not present.
 */
function geRenderValidationPanel(wi, ci, ki) {
  const panel = document.getElementById('ge_val_panel');
  if (!panel) return;

  const { errors, warnings } = geValidateCardForm(wi, ci, ki);

  if (errors.length === 0 && warnings.length === 0) {
    panel.className = 'ge-val-panel vok';
    panel.innerHTML = '<span class="ge-val-title tok">✓ Card looks good — no errors or warnings</span>';
    return;
  }

  let html = '';
  if (errors.length > 0) {
    html += '<div class="ge-val-title te">⛔ ' + errors.length + ' error' + (errors.length > 1 ? 's' : '') + ' — card will not save</div>';
    html += '<ul class="ge-val-list">';
    for (const e of errors) html += '<li class="ge-val-err-item"><span class="vi">✗</span><span>' + _geEsc(e) + '</span></li>';
    html += '</ul>';
  }
  if (warnings.length > 0) {
    if (errors.length > 0) html += '<div class="ge-val-sep"></div>';
    html += '<div class="ge-val-title tw">⚠️ ' + warnings.length + ' warning' + (warnings.length > 1 ? 's' : '') + '</div>';
    html += '<ul class="ge-val-list">';
    for (const w of warnings) html += '<li class="ge-val-warn-item"><span class="vi">⚠</span><span>' + _geEsc(w) + '</span></li>';
    html += '</ul>';
  }

  panel.className = 'ge-val-panel ' + (errors.length > 0 ? 've' : 'vw');
  panel.innerHTML = html;
}

function _geEsc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function geCheckTierOrder(wi, ci, ki) {
  // Called when any tier threshold changes — updates the tier warning banner
  const card = _geCfg.worlds[wi].categories[ci].cards[ki];
  const th = (card.tiers || []).map(t => parseFloat(t.threshold) || 0);
  const warn = document.getElementById('ge_tier_warn');
  if (warn) warn.classList.toggle('show', th.some((v, i) => i > 0 && v <= th[i - 1]));
  // Also re-run full validation
  geRenderValidationPanel(wi, ci, ki);
}

function geAutoSortTiers(wi, ci, ki) {
  const card = _geCfg.worlds[wi].categories[ci].cards[ki];
  card.tiers.sort((a, b) => (parseFloat(a.threshold) || 0) - (parseFloat(b.threshold) || 0));
  geMark();
  geRenderEditor();
  geShowNotif('Tiers sorted ascending', 'ok');
}

function geCloneCard(wi, ci, ki) {
  const src = _geCfg.worlds[wi].categories[ci].cards[ki];
  const clone = JSON.parse(JSON.stringify(src));
  clone.id = 'card_' + Date.now();
  clone.label = (src.label || 'Card') + ' (copy)';
  _geCfg.worlds[wi].categories[ci].cards.push(clone);
  _geSelected = { worldIdx: wi, catIdx: ci, cardIdx: _geCfg.worlds[wi].categories[ci].cards.length - 1 };
  geMark();
  geRenderTree();
  geRenderEditor();
  geShowNotif('Card duplicated', 'ok');
}

function geAutoFillMeta(wi, ci, ki) {
  const extId = (document.getElementById('gf_kextractor') || {}).value || '';
  const m = _geExtractorMeta[extId];
  if (!m) { geShowNotif('No metadata for selected extractor', 'err'); return; }
  const lEl = document.getElementById('gf_klabel');
  const uEl = document.getElementById('gf_kunit');
  if (lEl && !lEl.value.trim()) lEl.value = m.label || '';
  if (uEl && !uEl.value.trim() && m.unit) uEl.value = m.unit;
  geMark();
  geShowNotif('Auto-filled from extractor metadata', 'ok');
}

function geCheckCardField(wi, ci, ki) {
  // Lightweight re-validation triggered by any basic field oninput
  geRenderValidationPanel(wi, ci, ki);
}

function geCardEditorHTML(wi, ci, ki) {
  const card = _geCfg.worlds[wi].categories[ci].cards[ki];

  // ── Info card: simplified editor (text + label + icon only) ──────────────
  if (card.cardType === 'info') {
    return \`
<div class="ge-form-section ge-info-card-editor">
  <h3>ℹ️ Info Card Settings</h3>
  <p style="font-size:11px;color:#6060a0;margin:0 0 10px">Info cards display static text — no extractor or tiers needed. Excluded from scoring.</p>
  <div class="ge-row">
    <div class="ge-field"><label>Label</label><input id="gf_klabel" value="\${card.label || ''}" oninput="geMark()"></div>
    \${geIconPickerHTML('gf_kicon', card.icon, 'Icon')}
  </div>
  <div class="ge-field" style="margin-bottom:10px">
    <label>Text Content</label>
    <textarea id="gf_ktext" rows="6" oninput="geMark()">\${card.text ? card.text.replace(/</g,'&lt;').replace(/>/g,'&gt;') : ''}</textarea>
  </div>
</div>
<div style="display:flex;gap:8px">
  <button class="ge-btn secondary" onclick="geExportCard(\${wi},\${ci},\${ki})" title="Download this card as JSON">⬇ Export Card</button>
  <button class="ge-btn danger" onclick="geDeleteCard(\${wi},\${ci},\${ki})">🗑 Delete</button>
</div>\`;
  }

  const tiersHTML = (card.tiers || []).map((t, ti) => {
    const type = t.type || 'gte';
    const typeDesc = GE_TIER_TYPE_DESC[type] || '';
    const typeOpts = ['gte','unlocked','count_of_n','pct','has_item','max_any','avg','per_char','compound_and','compound_or','rate']
      .map(tp => \`<option value="\${tp}" \${type===tp?'selected':''}>\${tp}</option>\`).join('');
    let extra = '';
    if (type === 'count_of_n') extra = \`<div class="ge-tier-extra"><label>Total (denominator):</label><input type="number" value="\${t.total || ''}" placeholder="e.g. 60" onchange="geTierChange(\${wi},\${ci},\${ki},\${ti},'total',this.value)" style="background:#111;border:1px solid #2a2a3c;border-radius:4px;padding:3px 5px;color:#d0d0e0;font-size:11px"></div>\`;
    else if (type === 'rate') extra = \`<div class="ge-tier-extra"><label>Per:</label><select onchange="geTierChange(\${wi},\${ci},\${ki},\${ti},'per',this.value)" style="background:#111;border:1px solid #2a2a3c;border-radius:4px;padding:3px 5px;color:#d0d0e0;font-size:11px"><option value="hour" \${t.per==='hour'?'selected':''}>/ hour</option><option value="day" \${t.per==='day'?'selected':''}>/ day</option><option value="week" \${t.per==='week'?'selected':''}>/ week</option></select></div>\`;
    else if (type === 'has_item' || type === 'per_char') {
      extra = \`<div class="ge-tier-extra"><label>Param:</label>\${geParamPickerHTML(card.extractor, t.param, wi, ci, ki, ti)}</div>\`;
    }
    else if (type === 'compound_and' || type === 'compound_or') extra = \`<div class="ge-tier-extra" style="flex-direction:column;align-items:flex-start;width:100%">\${geCondBuilderHTML(t, wi, ci, ki, ti)}<div style="margin-top:4px;font-size:10px;color:#5060a0">Raw JSON: <textarea rows="2" onchange="geTierChange(\${wi},\${ci},\${ki},\${ti},'conditions',this.value)" style="background:#111;border:1px solid #2a2a3c;border-radius:4px;padding:4px 6px;color:#d0d0e0;font-size:10px;width:100%;box-sizing:border-box;font-family:monospace">\${t.conditions ? JSON.stringify(t.conditions) : '[]'}</textarea></div></div>\`;
    // Tier icon picker
    const tierIconId = 'ge_tier_icon_' + ti;
    const tierIconPreview = geIsImageIcon(t.icon) ? '<img src="' + t.icon + '" style="width:100%;height:100%;object-fit:contain">' : (t.icon || '');
    const tierIconRow = '<div class="ge-tier-extra"><div class="ge-icon-picker" style="gap:4px">'
      + '<div class="ge-icon-preview" id="' + tierIconId + '_preview" style="width:24px;height:24px">' + tierIconPreview + '</div>'
      + '<input id="' + tierIconId + '" value="' + (t.icon || '') + '" placeholder="Tier icon (emoji/image)" style="background:#111;border:1px solid #2a2a3c;border-radius:4px;padding:3px 5px;color:#d0d0e0;font-size:11px;width:120px" oninput="geIconInputChanged(\\'' + tierIconId + '\\');geTierChange(' + wi + ',' + ci + ',' + ki + ',' + ti + ',\\'icon\\',this.value)">'
      + '<label class="ge-icon-upload-btn" style="padding:2px 6px;font-size:9px" title="Upload tier icon">\ud83d\udcc2<input type="file" accept="image/*" style="display:none" onchange="geUploadTierIcon(\\'' + tierIconId + '\\',' + wi + ',' + ci + ',' + ki + ',' + ti + ',this)"></label>'
      + '</div></div>';
    const allExtras = tierIconRow + extra;
    return \`
  <div class="ge-tier" id="ge_tier_\${ti}">
    <div class="ge-tier-main">
      <span class="ge-tier-num">T\${ti + 1}</span>
      <div style="display:flex;flex-direction:column;gap:2px">
        <select style="background:#111;border:1px solid #2a2a3c;border-radius:4px;padding:4px 6px;color:#d0d0e0;font-size:11px" title="\${typeDesc}" onchange="geTierChange(\${wi},\${ci},\${ki},\${ti},'type',this.value);geRenderEditor()">\${typeOpts}</select>
        <span class="ge-tier-type-info">\${typeDesc}</span>
      </div>
      <input type="number" value="\${t.threshold}" placeholder="Threshold" style="background:#111;border:1px solid #2a2a3c;border-radius:4px;padding:4px 6px;color:#d0d0e0;font-size:11px;width:100%" onchange="geTierChange(\${wi},\${ci},\${ki},\${ti},'threshold',this.value);geCheckTierOrder(\${wi},\${ci},\${ki})">
      <input value="\${t.label || ''}" placeholder="Label (e.g. Tier 1)" style="background:#111;border:1px solid #2a2a3c;border-radius:4px;padding:4px 6px;color:#d0d0e0;font-size:11px;width:100%" onchange="geTierChange(\${wi},\${ci},\${ki},\${ti},'label',this.value)">
      <input value="\${t.note || ''}" placeholder="Note (optional)" style="background:#111;border:1px solid #2a2a3c;border-radius:4px;padding:4px 6px;color:#d0d0e0;font-size:11px;width:100%" onchange="geTierChange(\${wi},\${ci},\${ki},\${ti},'note',this.value)">
      <button class="ge-tier-del" onclick="geDeleteTier(\${wi},\${ci},\${ki},\${ti})">✕</button>
    </div><div class="ge-tier-extras" style="display:flex;align-items:center;gap:8px;padding:4px 0 2px 28px;flex-wrap:wrap">\${allExtras}</div>
  </div>\`;
  }).join('');

  // Check if thresholds are ascending for validation warning
  const tierThresholds = (card.tiers || []).map(t => t.threshold || 0);
  const outOfOrder = tierThresholds.some((v, i) => i > 0 && v <= tierThresholds[i-1]);

  return \`
<div id="ge_val_panel" class="ge-val-panel vok"><span class="ge-val-title tok">✓ Card looks good — no errors or warnings</span></div>
<div class="ge-form-section">
  <h3>🃏 Card Settings</h3>
  <div class="ge-row">
    <div class="ge-field"><label>ID</label><input value="\${card.id}" readonly style="opacity:.6;cursor:not-allowed"></div>
    \${geIconPickerHTML('gf_kicon', card.icon, 'Icon')}
  </div>
  <div class="ge-row">
    <div class="ge-field"><label>Label</label><input id="gf_klabel" value="\${card.label || ''}" oninput="geMark();geCheckCardField(\${wi},\${ci},\${ki})"></div>
    <div class="ge-field"><label>Unit (suffix)</label><input id="gf_kunit" value="\${card.unit || ''}" placeholder='e.g. Lv or %' oninput="geMark()"></div>
  </div>
  <div class="ge-row">
    <div class="ge-field">
      <label>Extractor <button class="ge-autofill-hint" onclick="geAutoFillMeta(\${wi},\${ci},\${ki})" title="Auto-fill label and unit from extractor metadata">✨ Auto-fill</button></label>
      \${geExtractorPickerHTML(card.extractor)}
    </div>
    <div class="ge-field"><label>Weight <span style="font-size:9px;color:#5060a0;font-weight:400">(relative to other cards in this category)</span></label><input id="gf_kweight" type="number" step="0.1" value="\${card.weight ?? 1.0}" oninput="geMark();geCheckCardField(\${wi},\${ci},\${ki})"></div>
  </div>
  <div id="ge_extractor_info" style="display:none;background:#0e0e1c;border:1px solid #2a2a3c;border-radius:5px;padding:8px 10px;margin-top:4px"></div>
  <div class="ge-field" style="margin-top:8px">
    <label>Notes <span style="font-size:9px;color:#5060a0;font-weight:400">(admin notes — not shown to users)</span></label>
    <textarea id="gf_knotes" rows="2" class="ge-notes-field" oninput="geMark()" placeholder="Optional notes for this card…">\${(card.notes || '').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</textarea>
  </div>
</div>

<div class="ge-form-section">
  <h3>🎨 Display Options</h3>
  <div class="ge-row">
    <div class="ge-field">
      <label>Progress Bar</label>
      <select id="gf_kshowBar" onchange="geMark()">
        <option value="true"  \${(card.showProgressBar ?? true)  ? 'selected' : ''}>✓ Show progress bar</option>
        <option value="false" \${(card.showProgressBar ?? true)  ? '' : 'selected'}>✗ Badge / tier only</option>
      </select>
    </div>
    <div class="ge-field">
      <label>Progress Style</label>
      <select id="gf_kprogStyle" onchange="geMark()">
        <option value="bar"   \${(card.progressStyle||'bar')==='bar'   ? 'selected':''}>━━ Bar</option>
        <option value="stars" \${(card.progressStyle||'bar')==='stars' ? 'selected':''}>★★★ Stars</option>
        <option value="rings" \${(card.progressStyle||'bar')==='rings' ? 'selected':''}>◎ Rings</option>
        <option value="badge" \${(card.progressStyle||'bar')==='badge' ? 'selected':''}>◉ Badge only</option>
      </select>
    </div>
  </div>
  <div class="ge-row">
    <div class="ge-field">
      <label>Value Format</label>
      <select id="gf_kformat" onchange="geMark()">
        <option value="number" \${(card.displayFormat||'number')==='number' ? 'selected':''}>1234 — raw number</option>
        <option value="abbrev" \${(card.displayFormat||'number')==='abbrev' ? 'selected':''}>1.2k — abbreviated</option>
        <option value="pct"    \${(card.displayFormat||'number')==='pct'    ? 'selected':''}>85% — % of maxHint</option>
      </select>
    </div>
    <div class="ge-field">
      <label>Priority Pin</label>
      <select id="gf_kpinned" onchange="geMark()">
        <option value="false" \${card.pinned ? '' : 'selected'}>— Normal</option>
        <option value="true"  \${card.pinned ? 'selected' : ''}>⭐ Pinned (shows first)</option>
      </select>
    </div>
  </div>
  <div class="ge-row">
    <div class="ge-field">
      <label>Hide When Maxed</label>
      <select id="gf_khideMaxed" onchange="geMark()">
        <option value="false" \${card.hideIfMaxed ? '' : 'selected'}>Keep visible at max tier</option>
        <option value="true"  \${card.hideIfMaxed ? 'selected' : ''}>Hide when max tier reached</option>
      </select>
    </div>
    <div class="ge-field">
      <label>Community Benchmark</label>
      <select id="gf_kbenchmark" onchange="geMark()">
        <option value="true"  \${(card.showBenchmark ?? true) ? 'selected':''}>✓ Show avg comparison</option>
        <option value="false" \${(card.showBenchmark ?? true) ? '' : 'selected'}>✗ Hide benchmark badge</option>
      </select>
    </div>
  </div>
</div>

<div class="ge-form-section">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
    <h3 style="margin:0">🏆 Tiers <span style="color:#404060;font-weight:400;font-size:11px">(ascending thresholds)</span></h3>
    <div style="display:flex;gap:6px;align-items:center">
      <span style="font-size:10px;color:#6060a0">Templates:</span>
      <div class="ge-tier-tpl-wrap" style="margin-bottom:0">
        <button class="ge-tier-tpl-btn" onclick="geTierTemplate(\${wi},\${ci},\${ki},'linear')" title="Linear: evenly spaced thresholds">Linear</button>
        <button class="ge-tier-tpl-btn" onclick="geTierTemplate(\${wi},\${ci},\${ki},'exponential')" title="Exponential: doubling thresholds">Exponential</button>
        <button class="ge-tier-tpl-btn" onclick="geTierTemplate(\${wi},\${ci},\${ki},'bool')" title="Single unlock tier (0/1)">Bool</button>
      </div>
      <button class="ge-btn secondary" style="padding:3px 8px;font-size:10px" onclick="geAutoSuggestThresholds(\${wi},\${ci},\${ki})" title="Auto-suggest thresholds from extractor maxHint">✨ Suggest</button>
      <button class="ge-btn secondary" style="padding:3px 8px;font-size:10px" onclick="geAutoSortTiers(\${wi},\${ci},\${ki})" title="Sort tiers by threshold ascending">↕ Sort</button>
    </div>
  </div>
  <div id="ge_tier_warn" class="ge-tier-warn \${outOfOrder ? 'show' : ''}">⚠️ Tiers are not in ascending threshold order — click Sort or reorder manually.</div>
  <div style="display:grid;grid-template-columns:auto 110px 90px 1fr 1fr auto;gap:6px;padding:0 0 4px;font-size:10px;color:#5060a0;font-weight:700">
    <span></span><span>Type</span><span>Threshold</span><span>Label</span><span>Note</span><span></span>
  </div>
  <div class="ge-tiers" id="ge_tiers_wrap">\${tiersHTML}</div>
  <button class="ge-tier-add" onclick="geAddTier(\${wi},\${ci},\${ki})">+ Add Tier</button>
</div>

<div style="display:flex;gap:8px;flex-wrap:wrap">
  <button class="ge-btn secondary" onclick="geCloneCard(\${wi},\${ci},\${ki})" title="Duplicate this card">📋 Duplicate</button>
  <button class="ge-btn secondary" onclick="geExportCard(\${wi},\${ci},\${ki})" title="Download this card as JSON">⬇ Export Card</button>
  <button class="ge-btn danger" onclick="geDeleteCard(\${wi},\${ci},\${ki})">🗑 Delete Card</button>
</div>\`;
}

function geSaveCard(wi, ci, ki) {
  const card = _geCfg.worlds[wi].categories[ci].cards[ki];
  card.icon  = document.getElementById('gf_kicon').value.trim() || card.icon;
  card.label = document.getElementById('gf_klabel').value.trim() || card.label;

  if (card.cardType === 'info') {
    const ta = document.getElementById('gf_ktext');
    card.text = ta ? ta.value : (card.text || '');
    geRenderTree();
    geMark();
    geShowNotif('Info card updated', 'ok');
    return;
  }

  // Apply DOM → card before validation (so validator reads the newest values)
  card.unit            = document.getElementById('gf_kunit').value.trim();
  card.weight          = parseFloat(document.getElementById('gf_kweight').value) ?? 1.0;
  const sel = document.getElementById('gf_kextractor').value;
  if (sel && sel !== '__custom__') card.extractor = sel;
  const notesEl = document.getElementById('gf_knotes');
  if (notesEl) card.notes = notesEl.value.trim();
  card.showProgressBar = document.getElementById('gf_kshowBar').value === 'true';
  card.progressStyle   = document.getElementById('gf_kprogStyle').value;
  card.displayFormat   = document.getElementById('gf_kformat').value;
  card.pinned          = document.getElementById('gf_kpinned').value === 'true';
  card.hideIfMaxed     = document.getElementById('gf_khideMaxed').value === 'true';
  card.showBenchmark   = document.getElementById('gf_kbenchmark').value === 'true';

  // ── Validation gate ──────────────────────────────────────────────────────
  const { errors, warnings } = geValidateCardForm(wi, ci, ki);
  geRenderValidationPanel(wi, ci, ki);
  if (errors.length > 0) {
    geShowNotif('⛔ ' + errors.length + ' error' + (errors.length > 1 ? 's' : '') + ' — fix before saving', 'err');
    // Scroll panel into view
    const panel = document.getElementById('ge_val_panel');
    if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return false; // signal caller not to persist
  }

  geRenderTree();
  geMark();
  if (warnings.length > 0) {
    geShowNotif('Card saved with ' + warnings.length + ' warning' + (warnings.length > 1 ? 's' : ''), 'ok');
  } else {
    geShowNotif('Card updated', 'ok');
  }
  return true;
}

function geExportCard(wi, ci, ki) {
  const card = _geCfg.worlds[wi].categories[ci].cards[ki];
  const blob = new Blob([JSON.stringify(card, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (card.id || 'card') + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
  geShowNotif('Card exported', 'ok');
}

function geTierChange(wi, ci, ki, ti, field, value) {
  const card = _geCfg.worlds[wi].categories[ci].cards[ki];
  if (field === 'threshold' || field === 'total' || field === 'minChars') card.tiers[ti][field] = parseFloat(value) || 0;
  else if (field === 'conditions') {
    try { card.tiers[ti].conditions = JSON.parse(value); }
    catch (e) {
      // Show parse error inline on the conditions textarea
      const panel = document.getElementById('ge_val_panel');
      if (panel) {
        panel.className = 'ge-val-panel ve';
        panel.innerHTML = '<div class="ge-val-title te">⛔ Tier ' + (ti+1) + ' conditions JSON is invalid</div><ul class="ge-val-list"><li class="ge-val-err-item"><span class="vi">✗</span><span>' + _geEsc(e.message) + '</span></li></ul>';
      }
      return;
    }
  } else {
    card.tiers[ti][field] = value;
  }
  _geDirty = true;
  // Re-validate after any tier mutation
  geRenderValidationPanel(wi, ci, ki);
}

function geAddTier(wi, ci, ki) {
  const card = _geCfg.worlds[wi].categories[ci].cards[ki];
  const last = card.tiers[card.tiers.length - 1];
  card.tiers.push({ label: 'Tier ' + (card.tiers.length + 1), threshold: last ? last.threshold * 2 : 100, type: last?.type || 'gte' });
  geMark();
  geRenderEditor();
  // Scroll to new tier so user can immediately see and spam-add tiers
  setTimeout(() => {
    const wrap = document.getElementById('ge_tiers_wrap');
    if (wrap) { const last = wrap.lastElementChild; if (last) last.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  }, 60);
}

function geDeleteTier(wi, ci, ki, ti) {
  const card = _geCfg.worlds[wi].categories[ci].cards[ki];
  card.tiers.splice(ti, 1);
  geMark();
  geRenderEditor();
}

// ── Add Helpers ────────────────────────────────────────────────────────────
function geAddWorld() {
  const id = 'world_' + Date.now();
  _geCfg.worlds.push({ id, label: 'New World', icon: '🌍', weight: 1.0, categories: [] });
  _geSelected = { worldIdx: _geCfg.worlds.length - 1, catIdx: null, cardIdx: null };
  geMark();
  geRenderTree();
  geRenderEditor();
}

function geAddCategory(wi) {
  const id = 'cat_' + Date.now();
  _geCfg.worlds[wi].categories.push({ id, label: 'New Category', icon: '📂', weight: 1.0, cards: [] });
  const ci = _geCfg.worlds[wi].categories.length - 1;
  _geSelected = { worldIdx: wi, catIdx: ci, cardIdx: null };
  geMark();
  geRenderTree();
  geRenderEditor();
}

function geAddCard(wi, ci) {
  const id = 'card_' + Date.now();
  _geCfg.worlds[wi].categories[ci].cards.push({
    id, label: 'New Card', icon: '🃏', weight: 1.0,
    extractor: _geExtractors[0] || 'stamps.totalLeveled',
    unit: '',
    showProgressBar: true,
    progressStyle: 'bar',
    displayFormat: 'number',
    pinned: false,
    hideIfMaxed: false,
    showBenchmark: true,
    tiers: [
      { label: 'Tier 1', threshold: 10 },
      { label: 'Tier 2', threshold: 50 },
      { label: 'Tier 3', threshold: 100 },
    ]
  });
  const ki = _geCfg.worlds[wi].categories[ci].cards.length - 1;
  _geSelected = { worldIdx: wi, catIdx: ci, cardIdx: ki };
  geMark();
  geRenderTree();
  geRenderEditor();
}

function geAddInfoCard(wi, ci) {
  const id = 'info_' + Date.now();
  _geCfg.worlds[wi].categories[ci].cards.push({
    id,
    cardType: 'info',
    label: 'Info',
    icon: 'ℹ️',
    text: '',
  });
  const ki = _geCfg.worlds[wi].categories[ci].cards.length - 1;
  _geSelected = { worldIdx: wi, catIdx: ci, cardIdx: ki };
  geMark();
  geRenderTree();
  geRenderEditor();
}

// ── Move Helpers ───────────────────────────────────────────────────────────
function geMoveWorld(wi, dir) {
  const arr = _geCfg.worlds;
  const ni = wi + dir;
  if (ni < 0 || ni >= arr.length) return;
  [arr[wi], arr[ni]] = [arr[ni], arr[wi]];
  _geSelected.worldIdx = ni;
  geMark();
  geRenderTree();
  geRenderEditor();
}

function geMoveCategory(wi, ci, dir) {
  const arr = _geCfg.worlds[wi].categories;
  const ni = ci + dir;
  if (ni < 0 || ni >= arr.length) return;
  [arr[ci], arr[ni]] = [arr[ni], arr[ci]];
  _geSelected.catIdx = ni;
  geMark();
  geRenderTree();
  geRenderEditor();
}

function geMoveCard(wi, ci, ki, dir) {
  const arr = _geCfg.worlds[wi].categories[ci].cards;
  const ni = ki + dir;
  if (ni < 0 || ni >= arr.length) return;
  [arr[ki], arr[ni]] = [arr[ni], arr[ki]];
  _geSelected.cardIdx = ni;
  geMark();
  geRenderTree();
  geRenderEditor();
}

// ── Delete Helpers ─────────────────────────────────────────────────────────
function geDeleteWorld(wi) {
  if (!confirm('Delete this world and all its categories/cards?')) return;
  _geCfg.worlds.splice(wi, 1);
  _geSelected = { worldIdx: null, catIdx: null, cardIdx: null };
  geRenderTree();
  geRenderEditor();
  geSaveConfig();
}

function geDeleteCat(wi, ci) {
  if (!confirm('Delete this category and all its cards?')) return;
  _geCfg.worlds[wi].categories.splice(ci, 1);
  _geSelected = { worldIdx: wi, catIdx: null, cardIdx: null };
  geRenderTree();
  geRenderEditor();
  geSaveConfig();
}

function geDeleteCard(wi, ci, ki) {
  if (!confirm('Delete this card?')) return;
  _geCfg.worlds[wi].categories[ci].cards.splice(ki, 1);
  _geSelected = { worldIdx: wi, catIdx: ci, cardIdx: null };
  geRenderTree();
  geRenderEditor();
  geSaveConfig();
}

// ── Apply current editor state to _geCfg before saving ───────────────────
function geApplyCurrentEditor() {
  const { worldIdx: wi, catIdx: ci, cardIdx: ki } = _geSelected;
  if (wi == null) return true;
  if (ki != null) return geSaveCard(wi, ci, ki) !== false;
  else if (ci != null) { geSaveCat(wi, ci); return true; }
  else { geSaveWorld(wi); return true; }
}

// ── Persistence ────────────────────────────────────────────────────────────
async function geSaveConfig() {
  // Apply any unsaved editor form changes first — abort if validation failed
  if (!geApplyCurrentEditor()) { geShowNotif('Fix card errors before saving the config', 'err'); return; }
  const btn = document.getElementById('geSaveBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Saving…';
  try {
    const res = await fetch('/api/guidance/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(_geCfg),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server error');
    _geDirty = false;
    btn.textContent = '✅ Saved';
    const bar = document.getElementById('geDirtyBar');
    if (bar) bar.classList.remove('show');
    geShowNotif('Config saved successfully', 'ok');
    // Auto-refresh owner's cached review with the new config
    try {
      const rr = await fetch('/api/guidance/refresh-my-review', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      const rd = await rr.json();
      if (rd.refreshed && rd.refreshed.length > 0) geShowNotif('Your review will reflect changes on next load', 'ok');
    } catch(e) { /* non-critical */ }
    setTimeout(() => { btn.textContent = '💾 Save Config'; btn.disabled = false; }, 2000);
  } catch(e) {
    btn.textContent = '💾 Save Config';
    btn.disabled = false;
    geShowNotif('Save failed: ' + e.message, 'err');
  }
}

// ── Export / Import ───────────────────────────────────────────────────────
function geExportConfig() {
  const blob = new Blob([JSON.stringify(_geCfg, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'guidance-config-' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
  geShowNotif('Config exported', 'ok');
}

function geImportConfig(fileInput) {
  const file = fileInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const cfg = JSON.parse(e.target.result);
      if (!cfg || !Array.isArray(cfg.worlds)) { geShowNotif('Invalid config JSON: missing worlds array', 'err'); return; }
      if (!confirm('Replace current config with imported file? This will overwrite everything.')) return;
      _geCfg = cfg;
      _geSelected = { worldIdx: null, catIdx: null, cardIdx: null };
      geRenderTree();
      geRenderEditor();
      geSaveConfig();
      geShowNotif('Config imported and saved', 'ok');
    } catch(ex) {
      geShowNotif('Failed to parse JSON: ' + ex.message, 'err');
    }
  };
  reader.readAsText(file);
  fileInput.value = '';
}

// ── Preview ────────────────────────────────────────────────────────────────
function geTogglePreview() {
  _gePreviewVisible = !_gePreviewVisible;
  document.getElementById('gePreviewBtn').textContent = _gePreviewVisible ? '✕ Hide' : '👁 Preview';
  if (_gePreviewVisible) geShowPastePreview();
  else geRenderEditor();
}

function geShowPastePreview() {
  const body = document.getElementById('geMainBody');
  body.innerHTML = \`<div>
    <div style="font-size:13px;color:#a0a0c0;margin-bottom:8px">Paste your IdleOn save JSON to preview your progression rating.<br><small style="color:#6070a0">Export from IdleOn: Settings → Cloud → Copy to clipboard</small></div>
    <textarea id="gePreviewJson" placeholder="Paste your IdleOn save JSON here…" rows="8" style="width:100%;background:#0e0e1c;border:1px solid #2a2a3c;border-radius:5px;padding:8px;color:#d0d0e0;font-size:11px;font-family:monospace;resize:vertical;box-sizing:border-box"></textarea>
    <div style="display:flex;gap:8px;margin-top:8px">
      <button class="ge-btn success" onclick="geRunPreview()">▶ Run Preview</button>
      <button class="ge-btn secondary" onclick="geTogglePreview()">✕ Cancel</button>
    </div>
  </div>\`;
}

async function geRunPreview() {
  const jsonText = document.getElementById('gePreviewJson')?.value?.trim();
  if (!jsonText) { geShowNotif('Paste your IdleOn JSON first', 'err'); return; }
  const body = document.getElementById('geMainBody');
  body.innerHTML = '<div class="ge-empty"><div class="ge-empty-icon">⏳</div>Running evaluation…</div>';
  try {
    const res = await fetch('/api/guidance/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ saveJson: jsonText }),
    });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Evaluation failed'); }
    _gePreviewData = await res.json();
    geRenderPreview();
  } catch(e) {
    body.innerHTML = \`<div class="ge-empty"><div class="ge-empty-icon">⚠️</div><p style="margin-bottom:12px">Preview failed: \${e.message}</p><button class="ge-btn secondary" onclick="geShowPastePreview()">← Try Again</button></div>\`;
  }
}

function geFormatCardValue(card) {
  const v = card.value;
  const dt = card.displayType || 'gte';
  const unit = card.unit ? ' ' + card.unit : '';
  if (dt === 'unlocked' || dt === 'has_item') return v ? '✓' : '✗';
  if (dt === 'pct') return v + '%';
  if (dt === 'count_of_n') return card.total != null ? \`\${v} / \${card.total}\` : \`\${v}\${unit}\`;
  if (dt === 'avg') return 'avg ' + v + unit;
  if (dt === 'max_any') return 'Best: ' + v + unit;
  if (dt === 'rate') return \`\${v}\${unit} / \${card.per || 'hr'}\`;
  if (dt === 'compound_and') return v ? '✓ Met' : '✗ Not met';
  return v + unit;
}

function geRenderPreview() {
  const body = document.getElementById('geMainBody');
  if (!_gePreviewData) return;
  const { globalPct, worlds } = _gePreviewData;

  // Collect all cards (non-info, non-max) sorted by closeness to next tier
  const allCards = [];
  for (const w of worlds) {
    for (const cat of (w.categories || [])) {
      for (const card of (cat.cards || [])) {
        if (card.cardType === 'info' || card.atMax) continue;
        allCards.push({ ...card, worldLabel: w.label, catLabel: cat.label });
      }
    }
  }
  // Cards close to next tier (≥ 75% progress to next)
  const closeCards = allCards.filter(c => c.nextThreshold != null && c.pct >= 0.75).sort((a,b) => b.pct - a.pct).slice(0, 6);

  const closeToNextHTML = closeCards.length > 0 ? \`
<div class="ge-form-section" style="margin-bottom:16px;padding-bottom:10px">
  <h3 style="margin-bottom:8px">🏁 Almost There <span style="font-size:10px;color:#6060a0;font-weight:400">— cards ≥75% to next tier</span></h3>
  \${closeCards.map(function(card) {
    const fmtVal = geFormatCardValue(card);
    const pctStr = Math.round(card.pct * 100) + '%';
    return \`<div class="ge-preview-card-row close-to-next">
      <span>\${geRenderIcon(card.icon,'',13)}</span>
      <span style="flex:1">\${card.worldLabel} › \${card.label}</span>
      <span style="font-size:10px;opacity:.8">\${fmtVal}</span>
      <span style="font-size:10px;min-width:32px;text-align:right">\${pctStr}</span>
      <span style="font-size:9px;color:#c0a040;min-width:60px;text-align:right">→ \${card.nextThreshold != null ? card.nextThreshold : ''}</span>
    </div>\`;
  }).join('')}
</div>\` : '';

  body.innerHTML = \`
<div style="margin-bottom:14px">
  <div style="font-size:13px;color:#a0a0c0;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between">
    <span>🌐 Global Rating</span>
    <span style="color:#c4a8ff;font-weight:700;font-size:16px">\${Math.round(globalPct * 100)}%</span>
  </div>
  <div class="ge-rating"><div class="ge-rating-bar"><div class="ge-rating-fill" style="width:\${globalPct*100}%"></div></div><span class="ge-pct">\${Math.round(globalPct*100)}%</span></div>
  <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
    \${worlds.map(function(w) {
      const pct = Math.round(w.pct * 100);
      return \`<span style="font-size:10px;padding:2px 8px;border-radius:6px;background:#161622;border:1px solid #2a2a3c;color:#c0b0f0">\${geRenderIcon(w.icon,'🌍',11)} \${w.label}: \${pct}%</span>\`;
    }).join('')}
  </div>
</div>
\${closeToNextHTML}
<div class="ge-preview">\${worlds.map(w => \`
  <div class="ge-preview-world">
    <div class="ge-preview-world-hdr" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'':'none'">
      <span style="font-size:16px">\${geRenderIcon(w.icon,'\ud83c\udf0d',16)}</span>
      <span style="flex:1">\${w.label}</span>
      <span class="ge-preview-world-pct-badge">\${Math.round(w.pct*100)}%</span>
    </div>
    <div>\${w.categories.map(cat => \`
      <div class="ge-preview-cat">
        <div class="ge-preview-cat-hdr">
          <span>\${geRenderIcon(cat.icon,'\ud83d\udcc2',14)}</span>
          <span style="flex:1">\${cat.label}</span>
          <span style="font-size:10px;color:#406040">\${Math.round(cat.pct*100)}%</span>
        </div>
        <div style="padding:2px 8px">\${cat.cards.map(card => {
          if (card.cardType === 'info') return '';
          const cls = card.atMax ? 'tmax' : 'ge-card-chip t' + Math.min(card.tierIndex + 1, 4);
          const closeClass = card.atMax ? 'at-max' : (card.pct >= 0.75 && card.nextThreshold != null ? 'close-to-next' : '');
          return \`<div class="ge-preview-card-row \${closeClass}" title="Progress: \${Math.round(card.pct*100)}%">
            <span>\${geRenderIcon(card.icon,'',13)}</span>
            <span class="ge-card-chip \${cls}" style="flex:1;border:none;background:transparent;padding:0">\${card.label}: \${geFormatCardValue(card)} [\${card.tierLabel || 'None'}]</span>
            \${card.nextThreshold != null ? '<span style="font-size:9px;color:#806040;min-width:50px;text-align:right">→ '+card.nextThreshold+'</span>' : '<span style="font-size:9px;color:#406040;min-width:50px;text-align:right">MAX ✓</span>'}
          </div>\`;
        }).join('')}</div>
      </div>\`).join('')}
    </div>
  </div>\`).join('')}
</div>
<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
  <button class="ge-btn secondary" onclick="geExportPreviewReport()">📄 Export Report</button>
  <button class="ge-btn secondary" onclick="geShowPastePreview()">🔄 Re-run</button>
  <button class="ge-btn secondary" onclick="geTogglePreview()">← Back to Editor</button>
</div>\`;
}

// ── Dirty tracking ─────────────────────────────────────────────────────────
function geMark() {
  // #6: Push current state to undo stack before marking dirty
  if (_geCfg) {
    _geUndoStack.push(JSON.stringify(_geCfg));
    if (_geUndoStack.length > 50) _geUndoStack.shift();
    _geRedoStack = [];
    _geUpdateUndoButtons();
  }
  _geDirty = true;
  document.getElementById('geSaveBtn').textContent = '💾 Save Config *';
  const bar = document.getElementById('geDirtyBar');
  if (bar) bar.classList.add('show');
  // #16: Reset autosave timer
  if (_geAutosaveEnabled) {
    clearTimeout(_geAutosaveTimer);
    _geAutosaveTimer = setTimeout(() => {
      if (_geDirty) { geApplyCurrentEditor(); _geAutoSaveNow(); }
    }, 60000);
  }
}

// #6: Undo/redo helpers
function _geUpdateUndoButtons() {
  const u = document.getElementById('geUndoBtn');
  const r = document.getElementById('geRedoBtn');
  if (u) u.disabled = _geUndoStack.length === 0;
  if (r) r.disabled = _geRedoStack.length === 0;
}

function geUndo() {
  if (_geUndoStack.length === 0) return;
  _geRedoStack.push(JSON.stringify(_geCfg));
  _geCfg = JSON.parse(_geUndoStack.pop());
  _geUpdateUndoButtons();
  geRenderTree(); geRenderEditor();
  geShowNotif('Undone', 'ok');
}

function geRedo() {
  if (_geRedoStack.length === 0) return;
  _geUndoStack.push(JSON.stringify(_geCfg));
  _geCfg = JSON.parse(_geRedoStack.pop());
  _geUpdateUndoButtons();
  geRenderTree(); geRenderEditor();
  geShowNotif('Redone', 'ok');
}

// #16: Autosave
async function _geAutoSaveNow() {
  try {
    const res = await fetch('/api/guidance/config', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(_geCfg) });
    if (res.ok) {
      _geDirty = false;
      document.getElementById('geSaveBtn').textContent = '💾 Save Config';
      const bar = document.getElementById('geDirtyBar'); if (bar) bar.classList.remove('show');
      const badge = document.getElementById('geAutosaveBadge');
      if (badge) { badge.classList.add('active'); badge.title = 'Autosaved: ' + new Date().toLocaleTimeString(); setTimeout(() => badge.classList.remove('active'), 3000); }
    }
  } catch { /* non-critical, manual save still works */ }
}

window.addEventListener('beforeunload', e => {
  if (_geDirty) { e.preventDefault(); e.returnValue = ''; }
});

// ── Notifications ──────────────────────────────────────────────────────────
let _geNotifTimer;
function geShowNotif(msg, type = 'ok') {
  const el = document.getElementById('geNotif');
  el.textContent = (type === 'ok' ? '✓ ' : '✗ ') + msg;
  el.className = 'ge-notif show ' + type;
  clearTimeout(_geNotifTimer);
  _geNotifTimer = setTimeout(() => el.classList.remove('show'), 3500);
}

// ── Custom Extractor Creator ───────────────────────────────────────────────

function geShowCustomExtractors() {
  _geCustomExtView = true;
  _geSelected = { worldIdx: null, catIdx: null, cardIdx: null };
  // Deselect tree items
  document.querySelectorAll('.ge-world-row.active,.ge-cat-row.active,.ge-card-row.active').forEach(el => el.classList.remove('active'));
  document.getElementById('geMainBreadcrumb').textContent = '🔧 Custom Extractors';
  document.getElementById('geMainBody').innerHTML = geCustomExtractorsHTML();
}

function geCustomExtractorsHTML() {
  const ops = ['count','sum','max','min','avg','pct','bool','len','value'];
  const filters = ['gt0','gte1','eq1','neq0','all'];
  const paramModes = ['','index','key'];
  const valueTypes = ['count','max','sum','avg','pct','bool','score'];
  const groups = ['Custom'].concat(Object.values(_geExtractorMeta).map(function(m){return m.group;}).filter(function(g,i,a){return a.indexOf(g)===i;})).sort();
  const opDescs = {count:'count items matching filter',sum:'sum all numeric values',max:'highest value',min:'lowest value',avg:'average of positives',pct:'% of items > 0',bool:'1 if truthy',len:'length of array/object',value:'raw numeric value'};
  const filterDescs = {gt0:'> 0',gte1:'>= 1',eq1:'=== 1',neq0:'!== 0',all:'all items'};

  // List of existing custom extractors
  let listHTML;
  if (_geCustomExtractors.length === 0) {
    listHTML = '<div class="ge-empty" style="padding:20px 0"><div class="ge-empty-icon" style="font-size:28px">🔧</div>No custom extractors yet. Create one below.</div>';
  } else {
    const opColors = {count:'#60a8ff',sum:'#80d080',max:'#ffc060',min:'#d0a060',avg:'#c0a060',pct:'#60c0c0',bool:'#ff8080',len:'#a080d0',value:'#d0d080'};
    listHTML = _geCustomExtractors.map(function(d, idx) {
      const opColor = opColors[d.operation] || '#8080a0';
      return '<div class="ge-cx-item" id="ge_cxitem_' + idx + '">'
        + '<div class="ge-cx-item-info">'
        + '<div class="ge-cx-item-id">' + d.id + '</div>'
        + '<div class="ge-cx-item-label">' + d.label + '<span class="ge-cx-op-pill" style="color:' + opColor + '">' + d.operation + '</span></div>'
        + '<div class="ge-cx-item-desc">' + (d.desc || d.dataKey) + '</div>'
        + '</div>'
        + '<div class="ge-cx-item-btns">'
        + '<button class="ge-btn secondary" style="padding:3px 8px;font-size:10px" onclick="geEditCustomExtractor(' + idx + ')">Edit</button>'
        + '<button class="ge-btn danger" style="padding:3px 8px;font-size:10px" onclick="geDeleteCustomExtractor(' + idx + ')">✕</button>'
        + '</div></div>';
    }).join('');
  }

  const groupOpts = groups.map(function(g){return '<option value="' + g + '">' + g + '</option>';}).join('');
  const vtOpts = valueTypes.map(function(v){return '<option value="' + v + '">' + v + '</option>';}).join('');
  const opOpts = ops.map(function(o){return '<option value="' + o + '">' + o + ' \u2014 ' + (opDescs[o]||o) + '</option>';}).join('');
  const filterOpts = filters.map(function(f){return '<option value="' + f + '">' + f + ' \u2014 ' + (filterDescs[f]||f) + '</option>';}).join('');

  return '<div class="ge-form-section">'
    + '<h3>🔧 Custom Extractors <span style="font-size:10px;color:#6060a0;font-weight:400;margin-left:8px">Define new data extractors using any IdleOn save key — no code needed</span></h3>'
    + '<div id="ge_cx_list">' + listHTML + '</div>'
    + '<button class="ge-btn secondary" style="margin-top:8px" onclick="geToggleCustomExtForm(true)" id="ge_cx_new_btn">+ New Custom Extractor</button>'
    + '</div>'
    + '<div class="ge-cx-form" id="ge_cx_form" style="display:none">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'
    + '<span style="font-size:12px;font-weight:700;color:#c4b8f0" id="ge_cx_form_title">New Custom Extractor</span>'
    + '<button class="ge-btn secondary" style="padding:2px 8px;font-size:10px" type="button" onclick="geToggleCustomExtForm(false)">✕ Cancel</button>'
    + '</div>'
    + '<input type="hidden" id="ge_cx_edit_id" value="">'
    + '<div class="ge-cx-row">'
    + '<div class="ge-cx-field"><label>ID <span style="color:#5060a0;font-weight:400">(e.g. custom.myExtractor)</span></label><input id="ge_cx_id" placeholder="custom.myExtractor" pattern="[a-zA-Z0-9._-]+" autocomplete="off"></div>'
    + '<div class="ge-cx-field"><label>Group</label><select id="ge_cx_group">' + groupOpts + '</select></div>'
    + '</div>'
    + '<div class="ge-cx-row">'
    + '<div class="ge-cx-field"><label>Label</label><input id="ge_cx_label" placeholder="e.g. Specific Statue Level"></div>'
    + '<div class="ge-cx-field"><label>Value Type</label><select id="ge_cx_valuetype">' + vtOpts + '</select></div>'
    + '</div>'
    + '<div class="ge-cx-field"><label>Description <span style="color:#5060a0;font-weight:400">(optional tooltip)</span></label><input id="ge_cx_desc" placeholder="What does this extractor measure?"></div>'
    + '<div class="ge-cx-row">'
    + '<div class="ge-cx-field"><label>Save Data Key <span style="color:#5060a0;font-weight:400">(top-level key in save.data)</span></label><input id="ge_cx_datakey" placeholder="e.g. StuG, AchieveReg, ForgeLV"></div>'
    + '<div class="ge-cx-field"><label>Array Path <span style="color:#5060a0;font-weight:400">(optional sub-path, e.g. [4][0])</span></label><input id="ge_cx_arraypath" placeholder="e.g. [4] or .upgrades"></div>'
    + '</div>'
    + '<div class="ge-cx-row">'
    + '<div class="ge-cx-field"><label>Operation</label><select id="ge_cx_operation">' + opOpts + '</select></div>'
    + '<div class="ge-cx-field"><label>Filter <span style="color:#5060a0;font-weight:400">(for count/sum ops)</span></label><select id="ge_cx_filter">' + filterOpts + '</select></div>'
    + '</div>'
    + '<div class="ge-cx-row">'
    + '<div class="ge-cx-field"><label>Param Mode <span style="color:#5060a0;font-weight:400">(optional — how param is used)</span></label><select id="ge_cx_parammode"><option value="">None (no param)</option><option value="index">index — use param as array index</option><option value="key">key — use param as object key</option></select></div>'
    + '<div class="ge-cx-field"><label>Max Hint <span style="color:#5060a0;font-weight:400">(max expected value for display)</span></label><input id="ge_cx_maxhint" type="number" placeholder="e.g. 100"></div>'
    + '</div>'
    + '<div style="display:flex;gap:8px;margin-top:4px">'
    + '<button class="ge-btn primary" onclick="geSaveCustomExtractor()">💾 Save Extractor</button>'
    + '<button class="ge-btn secondary" onclick="geTestCustomExtractorPreview()">🔍 Preview Formula</button>'
    + '</div>'
    + '<div id="ge_cx_preview" style="margin-top:8px;font-size:11px;color:#7070a0;display:none"></div>'
    + '</div>';
}

function geRefreshCustomExtList() {
  const listEl = document.getElementById('ge_cx_list');
  if (!listEl) return;
  if (_geCustomExtractors.length === 0) {
    listEl.innerHTML = '<div class="ge-empty" style="padding:20px 0"><div class="ge-empty-icon" style="font-size:28px">🔧</div>No custom extractors yet. Create one below.</div>';
    return;
  }
  const opColors = {count:'#60a8ff',sum:'#80d080',max:'#ffc060',min:'#d0a060',avg:'#c0a060',pct:'#60c0c0',bool:'#ff8080',len:'#a080d0',value:'#d0d080'};
  listEl.innerHTML = _geCustomExtractors.map(function(d, idx) {
    const opColor = opColors[d.operation] || '#8080a0';
    return '<div class="ge-cx-item" id="ge_cxitem_' + idx + '">'
      + '<div class="ge-cx-item-info">'
      + '<div class="ge-cx-item-id">' + d.id + '</div>'
      + '<div class="ge-cx-item-label">' + d.label + '<span class="ge-cx-op-pill" style="color:' + opColor + '">' + d.operation + '</span></div>'
      + '<div class="ge-cx-item-desc">' + (d.desc || d.dataKey) + '</div>'
      + '</div>'
      + '<div class="ge-cx-item-btns">'
      + '<button class="ge-btn secondary" style="padding:3px 8px;font-size:10px" onclick="geEditCustomExtractor(' + idx + ')">Edit</button>'
      + '<button class="ge-btn danger" style="padding:3px 8px;font-size:10px" onclick="geDeleteCustomExtractor(' + idx + ')">✕</button>'
      + '</div></div>';
  }).join('');
}

function geToggleCustomExtForm(show, def) {
  const form = document.getElementById('ge_cx_form');
  const btn = document.getElementById('ge_cx_new_btn');
  if (!form) return;
  form.style.display = show ? '' : 'none';
  if (btn) btn.style.display = show ? 'none' : '';
  if (!show) {
    document.getElementById('ge_cx_edit_id').value = '';
    document.getElementById('ge_cx_form_title').textContent = 'New Custom Extractor';
    form.querySelectorAll('input,select,textarea').forEach(function(el) {
      if (el.id !== 'ge_cx_edit_id') el.value = el.tagName === 'SELECT' ? (el.options[0] ? el.options[0].value : '') : '';
    });
    document.getElementById('ge_cx_preview').style.display = 'none';
    return;
  }
  if (def) {
    document.getElementById('ge_cx_form_title').textContent = 'Edit Custom Extractor';
    document.getElementById('ge_cx_edit_id').value = def.id;
    document.getElementById('ge_cx_id').value = def.id;
    document.getElementById('ge_cx_id').disabled = true;
    document.getElementById('ge_cx_group').value = def.group || 'Custom';
    document.getElementById('ge_cx_label').value = def.label || '';
    document.getElementById('ge_cx_desc').value = def.desc || '';
    document.getElementById('ge_cx_datakey').value = def.dataKey || '';
    document.getElementById('ge_cx_arraypath').value = def.arrayPath || '';
    document.getElementById('ge_cx_operation').value = def.operation || 'count';
    document.getElementById('ge_cx_filter').value = def.filter || 'gt0';
    document.getElementById('ge_cx_parammode').value = def.paramMode || '';
    document.getElementById('ge_cx_maxhint').value = def.maxHint != null ? def.maxHint : '';
    document.getElementById('ge_cx_valuetype').value = def.valueType || 'count';
  } else {
    document.getElementById('ge_cx_id').disabled = false;
    document.getElementById('ge_cx_form_title').textContent = 'New Custom Extractor';
  }
}

function geEditCustomExtractor(idx) {
  const def = _geCustomExtractors[idx];
  if (!def) return;
  geToggleCustomExtForm(true, def);
  const form = document.getElementById('ge_cx_form');
  if (form) form.scrollIntoView({ behavior: 'smooth' });
}

async function geDeleteCustomExtractor(idx) {
  const def = _geCustomExtractors[idx];
  if (!def) return;
  if (!confirm('Delete custom extractor "' + def.label + '" (' + def.id + ')?\\n\\nAny cards using this extractor will show an error.')) return;
  try {
    const res = await fetch('/api/guidance/custom-extractors/' + encodeURIComponent(def.id), { method: 'DELETE' });
    if (!res.ok) { const j = await res.json(); return geShowNotif(j.error || 'Delete failed', 'err'); }
    _geCustomExtractors.splice(idx, 1);
    _geExtractors = _geExtractors.filter(function(id){return id !== def.id;});
    delete _geExtractorMeta[def.id];
    geRefreshCustomExtList();
    geShowNotif('Deleted ' + def.id, 'ok');
  } catch(e) { geShowNotif('Delete failed: ' + e.message, 'err'); }
}

async function geSaveCustomExtractor() {
  const editId = document.getElementById('ge_cx_edit_id').value.trim();
  const isEdit = !!editId;
  const maxHintRaw = document.getElementById('ge_cx_maxhint').value;
  const def = {
    id:        isEdit ? editId : document.getElementById('ge_cx_id').value.trim(),
    group:     document.getElementById('ge_cx_group').value || 'Custom',
    label:     document.getElementById('ge_cx_label').value.trim(),
    desc:      document.getElementById('ge_cx_desc').value.trim(),
    dataKey:   document.getElementById('ge_cx_datakey').value.trim(),
    arrayPath: document.getElementById('ge_cx_arraypath').value.trim(),
    operation: document.getElementById('ge_cx_operation').value,
    filter:    document.getElementById('ge_cx_filter').value,
    paramMode: document.getElementById('ge_cx_parammode').value,
    maxHint:   maxHintRaw !== '' ? Number(maxHintRaw) : null,
    valueType: document.getElementById('ge_cx_valuetype').value,
  };
  if (!def.id) return geShowNotif('ID is required', 'err');
  if (!def.label) return geShowNotif('Label is required', 'err');
  if (!def.dataKey) return geShowNotif('Data Key is required', 'err');
  if (!/^[a-zA-Z0-9._-]+$/.test(def.id)) return geShowNotif('Invalid ID \u2014 use letters, numbers, . _ -', 'err');

  try {
    const url = '/api/guidance/custom-extractors' + (isEdit ? '/' + encodeURIComponent(def.id) : '');
    const res = await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(def) });
    const j = await res.json();
    if (!res.ok) return geShowNotif(j.error || 'Save failed', 'err');

    if (isEdit) {
      const idx = _geCustomExtractors.findIndex(function(d){return d.id === def.id;});
      if (idx !== -1) _geCustomExtractors[idx] = def;
    } else {
      _geCustomExtractors.push(def);
      _geExtractors.push(def.id);
    }
    _geExtractorMeta[def.id] = {
      group: def.group, label: def.label, desc: def.desc, dataKey: def.dataKey,
      valueType: def.valueType, maxHint: def.maxHint,
      paramHint: def.paramMode ? 'param (' + def.paramMode + ')' : undefined, custom: true,
    };
    delete _geParamOptionsCache[def.id];

    geToggleCustomExtForm(false);
    geRefreshCustomExtList();
    geShowNotif((isEdit ? 'Updated' : 'Created') + ' ' + def.id, 'ok');
  } catch(e) { geShowNotif('Save failed: ' + e.message, 'err'); }
}

function geTestCustomExtractorPreview() {
  const dataKey = document.getElementById('ge_cx_datakey').value.trim();
  const arrayPath = document.getElementById('ge_cx_arraypath').value.trim();
  const operation = document.getElementById('ge_cx_operation').value;
  const filter = document.getElementById('ge_cx_filter').value;
  const previewEl = document.getElementById('ge_cx_preview');
  if (!dataKey) { geShowNotif('Set a Data Key first', 'err'); return; }
  previewEl.style.display = '';
  const pathStr = arrayPath ? ' \u2192 navigate ' + arrayPath : '';
  const filterStr = (filter && operation !== 'value') ? ' \u2192 filter items where: ' + filter : '';
  previewEl.innerHTML = '<strong style="color:#c0b8f0">Formula preview:</strong> '
    + 'read <code style="color:#80c0ff">' + dataKey + '</code>' + pathStr + filterStr + ' \u2192 apply <strong>' + operation + '</strong>';
}

// ── Clone / Duplicate Helpers ─────────────────────────────────────────────
function geCloneCategory(wi, ci) {
  const src = _geCfg.worlds[wi].categories[ci];
  const clone = JSON.parse(JSON.stringify(src));
  const ts = Date.now();
  clone.id = (src.id || 'cat') + '_copy_' + ts;
  clone.label = (src.label || 'Category') + ' (copy)';
  // Re-ID all child cards
  for (const card of (clone.cards || [])) {
    card.id = card.id + '_copy_' + ts;
  }
  _geCfg.worlds[wi].categories.splice(ci + 1, 0, clone);
  const newCi = ci + 1;
  _geSelected = { worldIdx: wi, catIdx: newCi, cardIdx: null };
  geMark();
  geRenderTree();
  geRenderEditor();
  geShowNotif('Category duplicated (' + clone.cards.length + ' cards)', 'ok');
}

// ── Tier Templates ────────────────────────────────────────────────────────
function geTierTemplate(wi, ci, ki, tpl) {
  const card = _geCfg.worlds[wi].categories[ci].cards[ki];
  const meta = _geExtractorMeta[card.extractor];
  const maxHint = meta && meta.maxHint != null ? meta.maxHint : 100;
  if (tpl === 'bool') {
    card.tiers = [{ label: 'Unlocked', threshold: 1, type: 'unlocked' }];
  } else if (tpl === 'linear') {
    const steps = 5;
    card.tiers = Array.from({ length: steps }, (_, i) => ({
      label: 'Tier ' + (i + 1),
      threshold: Math.round(maxHint * (i + 1) / steps),
      type: 'gte'
    }));
  } else if (tpl === 'exponential') {
    const steps = 5;
    card.tiers = Array.from({ length: steps }, (_, i) => ({
      label: 'Tier ' + (i + 1),
      threshold: Math.round(maxHint * Math.pow(2, i - steps + 1) * 2),
      type: 'gte'
    }));
    // Always ensure ascending and not 0
    let base = Math.max(1, Math.round(maxHint / 32));
    card.tiers = Array.from({ length: steps }, (_, i) => ({
      label: 'Tier ' + (i + 1),
      threshold: base * Math.pow(2, i),
      type: 'gte'
    }));
  }
  geMark();
  geRenderEditor();
  geShowNotif('Applied ' + tpl + ' template (' + card.tiers.length + ' tiers)', 'ok');
}

// ── Export per World ──────────────────────────────────────────────────────
function geExportWorld(wi) {
  const world = _geCfg.worlds[wi];
  if (!world) return;
  const blob = new Blob([JSON.stringify(world, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (world.id || 'world') + '-' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
  geShowNotif('World "' + world.label + '" exported', 'ok');
}

// ── Config History Panel ──────────────────────────────────────────────────
async function geShowHistory() {
  _geCustomExtView = false;
  _geSelected = { worldIdx: null, catIdx: null, cardIdx: null };
  document.getElementById('geMainBreadcrumb').textContent = '🕐 Config History & Backups';
  const body = document.getElementById('geMainBody');
  body.innerHTML = '<div class="ge-empty"><div class="ge-empty-icon">⏳</div>Loading history…</div>';
  try {
    const res = await fetch('/api/guidance/config/history');
    const data = await res.json();
    if (!res.ok || !data.versions) {
      body.innerHTML = '<div class="ge-empty"><div class="ge-empty-icon">📂</div><p>No history available yet.</p>'
        + '<button class="ge-btn secondary" style="margin-top:8px" onclick="geCreateBackup()">💾 Create Manual Backup</button></div>';
      return;
    }
    const versions = data.versions;
    body.innerHTML = '<div class="ge-form-section">'
      + '<h3>🕐 Config History</h3>'
      + '<p style="font-size:11px;color:#6060a0;margin:0 0 10px">Auto-backups are created before each save. Click Restore to roll back.</p>'
      + '<div style="margin-bottom:10px"><button class="ge-btn secondary" onclick="geCreateBackup()">💾 Create Manual Backup</button></div>'
      + (versions.length === 0 ? '<div class="ge-empty" style="padding:20px 0">No backups yet.</div>' :
        versions.map(function(v) {
          const dt = new Date(v.ts).toLocaleString();
          const worlds = v.worldCount || '?';
          const cards = v.cardCount || '?';
          return '<div class="ge-history-item">'
            + '<div class="ge-history-item-ts">' + dt + '</div>'
            + '<div class="ge-history-item-info">' + worlds + ' worlds · ' + cards + ' cards' + (v.label ? ' · ' + v.label : '') + '</div>'
            + '<button class="ge-btn secondary ge-history-restore" onclick="geRestoreConfig(\\\'' + v.file + '\\\')" title="Restore this version">↩ Restore</button>'
            + '<button class="ge-btn secondary" style="padding:3px 8px;font-size:10px" onclick="geDownloadBackup(\\\'' + v.file + '\\\')" title="Download">⬇</button>'
            + '</div>';
        }).join(''))
      + '</div>'
      + '<div style="margin-top:8px"><button class="ge-btn secondary" onclick="geRenderEditor()">← Back to Editor</button></div>';
  } catch(e) {
    body.innerHTML = '<div class="ge-empty"><div class="ge-empty-icon">⚠️</div>Failed to load history: ' + e.message + '</div>';
  }
}

async function geCreateBackup() {
  try {
    const res = await fetch('/api/guidance/config/backup', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Backup failed');
    geShowNotif('Backup created: ' + (data.file || ''), 'ok');
    geShowHistory();
  } catch(e) {
    geShowNotif('Backup failed: ' + e.message, 'err');
  }
}

async function geRestoreConfig(filename) {
  if (!confirm('Restore config from backup "' + filename + '"?\\n\\nCurrent config will be overwritten.')) return;
  try {
    const res = await fetch('/api/guidance/config/restore/' + encodeURIComponent(filename), { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Restore failed');
    _geCfg = data.config;
    _geSelected = { worldIdx: null, catIdx: null, cardIdx: null };
    _geDirty = false;
    const bar = document.getElementById('geDirtyBar');
    if (bar) bar.classList.remove('show');
    geRenderTree();
    geRenderEditor();
    geShowNotif('Config restored from ' + filename, 'ok');
  } catch(e) {
    geShowNotif('Restore failed: ' + e.message, 'err');
  }
}

async function geDownloadBackup(filename) {
  try {
    const res = await fetch('/api/guidance/config/backup/' + encodeURIComponent(filename));
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Not found');
    const blob = new Blob([JSON.stringify(data.config, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); URL.revokeObjectURL(a.href);
  } catch(e) {
    geShowNotif('Download failed: ' + e.message, 'err');
  }
}

// ── Preview Report Export ─────────────────────────────────────────────────
function geExportPreviewReport() {
  if (!_gePreviewData) return;
  const { globalPct, worlds } = _gePreviewData;
  let lines = ['IdleOn Guidance Report — ' + new Date().toLocaleString(), '='.repeat(50), '', 'Global Rating: ' + Math.round(globalPct * 100) + '%', ''];
  for (const w of worlds) {
    lines.push('── ' + w.label + ' (' + Math.round(w.pct * 100) + '%)');
    for (const cat of (w.categories || [])) {
      lines.push('  · ' + cat.label + ' (' + Math.round(cat.pct * 100) + '%)');
      for (const card of (cat.cards || [])) {
        if (card.cardType === 'info') continue;
        const val = geFormatCardValue(card);
        const tier = card.tierLabel || 'None';
        const next = card.nextThreshold != null ? ' → ' + card.nextThreshold : ' (MAX)';
        lines.push('    ' + card.label + ': ' + val + ' [' + tier + ']' + next);
      }
    }
    lines.push('');
  }
  const blob = new Blob([lines.join('\\n')], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'guidance-report-' + new Date().toISOString().slice(0,10) + '.txt';
  a.click();
  URL.revokeObjectURL(a.href);
  geShowNotif('Report exported', 'ok');
}

// ── Keyboard Shortcuts (#9, #15) ──────────────────────────────────────────
document.addEventListener('keydown', function(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
    // Ctrl+S still works inside form fields
    if (!(e.ctrlKey && e.key === 's')) return;
  }
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    geApplyCurrentEditor();
    geSaveConfig();
  } else if (e.ctrlKey && e.key === 'z') {
    e.preventDefault();
    geUndo();
  } else if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
    e.preventDefault();
    geRedo();
  }
});

// ── Stats Panel (#25) ─────────────────────────────────────────────────────
function geShowStats() {
  if (!_geCfg) return;
  _geCustomExtView = false;
  _geSelected = { worldIdx: null, catIdx: null, cardIdx: null };
  document.getElementById('geMainBreadcrumb').textContent = '📊 Config Statistics';
  const body = document.getElementById('geMainBody');

  let totalWorlds = _geCfg.worlds.length;
  let totalCats = 0, totalCards = 0, infoCards = 0, errorCards = 0, maxedCards = 0, totalTiers = 0;
  const extractorFreq = {};
  for (const w of _geCfg.worlds) {
    totalCats += (w.categories || []).length;
    for (const cat of (w.categories || [])) {
      for (const card of (cat.cards || [])) {
        totalCards++;
        if (card.cardType === 'info') { infoCards++; continue; }
        totalTiers += (card.tiers || []).length;
        if (card.extractor && !_geExtractors.includes(card.extractor)) errorCards++;
        if (card.extractor) extractorFreq[card.extractor] = (extractorFreq[card.extractor] || 0) + 1;
      }
    }
  }
  const topExtractors = Object.entries(extractorFreq).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const avgTiers = totalCards - infoCards > 0 ? (totalTiers / (totalCards - infoCards)).toFixed(1) : 0;

  body.innerHTML = \`
<div class="ge-stats-panel">
  <div class="ge-stat-box"><div class="ge-stat-num">\${totalWorlds}</div><div class="ge-stat-lbl">Worlds</div></div>
  <div class="ge-stat-box"><div class="ge-stat-num">\${totalCats}</div><div class="ge-stat-lbl">Categories</div></div>
  <div class="ge-stat-box"><div class="ge-stat-num">\${totalCards - infoCards}</div><div class="ge-stat-lbl">Cards</div></div>
  <div class="ge-stat-box"><div class="ge-stat-num">\${infoCards}</div><div class="ge-stat-lbl">Info Cards</div></div>
  <div class="ge-stat-box"><div class="ge-stat-num" style="color:\${errorCards ? '#ff8888' : '#60c080'}">\${errorCards}</div><div class="ge-stat-lbl">Errors</div></div>
  <div class="ge-stat-box"><div class="ge-stat-num">\${totalTiers}</div><div class="ge-stat-lbl">Total Tiers</div></div>
  <div class="ge-stat-box"><div class="ge-stat-num">\${avgTiers}</div><div class="ge-stat-lbl">Avg Tiers</div></div>
  <div class="ge-stat-box"><div class="ge-stat-num">\${_geCustomExtractors.length}</div><div class="ge-stat-lbl">Custom Ext.</div></div>
</div>
\${topExtractors.length ? \`
<div class="ge-form-section">
  <h3>🔝 Most Used Extractors</h3>
  \${topExtractors.map(([id,n]) => {
    const m = _geExtractorMeta[id]; const lbl = m ? m.label : id;
    return \`<div style="display:flex;align-items:center;gap:8px;padding:4px 6px;font-size:11px">
      <span style="flex:1;color:#c0c0d0">\${lbl}</span>
      <span style="font-size:9px;color:#5060a0;font-family:monospace">\${id}</span>
      <span style="font-size:12px;font-weight:700;color:#c4b8f0;min-width:24px;text-align:right">\${n}</span>
    </div>\`;
  }).join('')}
</div>\` : ''}
<div style="display:flex;gap:8px;margin-top:8px">
  <button class="ge-btn secondary" onclick="geRenderEditor()">← Back to Editor</button>
</div>\`;
}

// ── Clone World (#28) ─────────────────────────────────────────────────────
function geCloneWorld(wi) {
  const src = _geCfg.worlds[wi];
  const clone = JSON.parse(JSON.stringify(src));
  const ts = Date.now();
  clone.id = (src.id || 'world') + '_copy_' + ts;
  clone.label = (src.label || 'World') + ' (copy)';
  for (const cat of (clone.categories || [])) {
    cat.id = cat.id + '_copy_' + ts;
    for (const card of (cat.cards || [])) card.id = card.id + '_copy_' + ts;
  }
  _geCfg.worlds.splice(wi + 1, 0, clone);
  _geSelected = { worldIdx: wi + 1, catIdx: null, cardIdx: null };
  geMark();
  geRenderTree();
  geRenderEditor();
  geShowNotif('World duplicated (' + clone.categories.length + ' categories)', 'ok');
}

// ── Threshold Auto-Suggest (#10) ─────────────────────────────────────────
function geAutoSuggestThresholds(wi, ci, ki) {
  const card = _geCfg.worlds[wi].categories[ci].cards[ki];
  const meta = _geExtractorMeta[card.extractor];
  if (!meta || meta.maxHint == null) { geShowNotif('No maxHint for this extractor — use Templates instead', 'err'); return; }
  const max = meta.maxHint;
  const steps = card.tiers.length || 5;
  const suggested = Array.from({length: steps}, (_,i) => Math.round(max * (i + 1) / steps));
  card.tiers.forEach((t, i) => { t.threshold = suggested[i] || t.threshold; });
  geMark();
  geRenderEditor();
  geShowNotif('Applied ' + steps + ' threshold suggestions (max hint: ' + max + ')', 'ok');
}

// ── Compound Conditions Visual Builder (#34) ──────────────────────────────
function geCondBuilderHTML(tier, wi, ci, ki, ti) {
  const conds = tier.conditions || [];
  let rows = conds.map(function(c, i) {
    const extOpts = _geExtractors.slice(0, 80).map(function(id) {
      const m = _geExtractorMeta[id];
      return '<option value="' + id + '"' + (c.extractor === id ? ' selected' : '') + '>' + (m ? m.label : id) + '</option>';
    }).join('');
    return '<div class="ge-cond-row">'
      + '<select style="background:#111;border:1px solid #2a2a3c;border-radius:4px;padding:3px 5px;color:#d0d0e0;font-size:11px" onchange="geCondChange(' + wi + ',' + ci + ',' + ki + ',' + ti + ',' + i + ',\\'extractor\\',this.value)"><option value="">Select extractor</option>' + extOpts + '</select>'
      + '<input type="number" value="' + (c.threshold ?? '') + '" placeholder="≥" style="background:#111;border:1px solid #2a2a3c;border-radius:4px;padding:3px 5px;color:#d0d0e0;font-size:11px;width:60px" onchange="geCondChange(' + wi + ',' + ci + ',' + ki + ',' + ti + ',' + i + ',\\'threshold\\',this.value)">'
      + '<button class="ge-cond-del" onclick="geCondDelete(' + wi + ',' + ci + ',' + ki + ',' + ti + ',' + i + ')">✕</button>'
      + '</div>';
  }).join('');
  return '<div class="ge-cond-builder">'
    + '<div style="font-size:10px;color:#6060a0;margin-bottom:5px">Conditions — ALL must be met:</div>'
    + rows
    + '<button class="ge-cond-add" onclick="geCondAdd(' + wi + ',' + ci + ',' + ki + ',' + ti + ')">+ Add Condition</button>'
    + '</div>';
}

function geCondChange(wi, ci, ki, ti, ci2, field, value) {
  const t = _geCfg.worlds[wi].categories[ci].cards[ki].tiers[ti];
  if (!t.conditions) t.conditions = [];
  if (!t.conditions[ci2]) t.conditions[ci2] = {};
  if (field === 'threshold') t.conditions[ci2][field] = parseFloat(value) || 0;
  else t.conditions[ci2][field] = value;
  _geDirty = true;
  geRenderValidationPanel(wi, ci, ki);
}

function geCondAdd(wi, ci, ki, ti) {
  const t = _geCfg.worlds[wi].categories[ci].cards[ki].tiers[ti];
  if (!t.conditions) t.conditions = [];
  t.conditions.push({ extractor: '', threshold: 0 });
  geMark();
  geRenderEditor();
  // Validation runs after re-render via geRenderValidationPanel in geRenderEditor
}

function geCondDelete(wi, ci, ki, ti, ci2) {
  const t = _geCfg.worlds[wi].categories[ci].cards[ki].tiers[ti];
  if (t.conditions) t.conditions.splice(ci2, 1);
  geMark();
  geRenderEditor();
}

// ── Orphaned Extractor Detection (#23) ───────────────────────────────────
function geGetOrphanedCards() {
  const orphans = [];
  for (let wi = 0; wi < (_geCfg?.worlds?.length || 0); wi++) {
    const world = _geCfg.worlds[wi];
    for (let ci = 0; ci < (world.categories || []).length; ci++) {
      const cat = world.categories[ci];
      for (let ki = 0; ki < (cat.cards || []).length; ki++) {
        const card = cat.cards[ki];
        if (card.cardType === 'info') continue;
        const isCustom = _geCustomExtractors.some(function(c){return c.id === card.extractor;});
        if (card.extractor && !_geExtractors.includes(card.extractor) && !isCustom) {
          orphans.push({ wi, ci, ki, card, world, cat });
        }
      }
    }
  }
  return orphans;
}

</script>
`;
}
