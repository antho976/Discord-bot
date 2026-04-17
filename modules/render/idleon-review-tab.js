/**
 * Idleon Bot Review Tab — Dashboard Frontend v5
 * World-nav style: compact system cards, priority bar, sticky nav, no alerts.
 */
export function renderIdleonBotReviewTab(userTier) {
  return `
<style>
/* === Base === */
.ibr *{box-sizing:border-box}
.ibr{font-size:14px;color:#d0d0d8;line-height:1.5}

/* === Upload Card === */
.ibr-card{background:#1a1a24;border:1px solid #2e2e40;border-radius:8px;padding:18px;margin-bottom:12px}
.ibr-card h2{margin:0 0 6px;font-size:18px;color:#b794f6}
.ibr-card h3{margin:0 0 8px;font-size:15px;color:#b794f6}
.ibr-sub{color:#8b8fa3;font-size:12px;margin:0 0 12px}
.ibr-drop{border:2px dashed #3a3a50;border-radius:10px;padding:36px 18px;text-align:center;cursor:pointer;transition:all .2s;background:#13131a;position:relative}
.ibr-drop:hover,.ibr-drop.drag-over{border-color:#b794f6;background:#1a1a2e}
.ibr-drop input[type=file]{position:absolute;inset:0;opacity:0;cursor:pointer}
.ibr-drop .icon{font-size:32px;margin-bottom:8px}
.ibr-drop .label{font-size:14px;color:#ccc;font-weight:600}
.ibr-drop .hint{font-size:11px;color:#8b8fa3;margin-top:6px}
.ibr-btn{background:#7c3aed;color:#fff;border:none;border-radius:6px;padding:9px 20px;font-size:14px;cursor:pointer;font-weight:600;transition:all .2s}
.ibr-btn:hover{background:#6d28d9}
.ibr-btn:disabled{opacity:.5;cursor:not-allowed}
.ibr-btn-outline{background:none;border:1px solid #3a3a50;color:#ccc;border-radius:5px;padding:6px 14px;font-size:12px;cursor:pointer;transition:all .2s}
.ibr-btn-outline:hover{border-color:#b794f6;color:#b794f6}

/* === Header === */
.ibr-header{background:#1a1a24;border:1px solid #2e2e40;border-radius:8px;margin-bottom:12px;overflow:hidden}
.ibr-header-top{display:flex;align-items:center;gap:12px;padding:14px 18px;flex-wrap:wrap}
.ibr-header-top .h-title{font-size:17px;font-weight:700;color:#d4c8f0;display:flex;align-items:center;gap:8px}
.ibr-header-top .h-tier{padding:4px 12px;border-radius:5px;font-weight:700;font-size:13px}
.ibr-header-top .h-space{flex:1}
.ibr-kpi-row{display:flex;border-top:1px solid #2e2e40}
.ibr-kpi{flex:1;padding:10px 14px;text-align:center;border-right:1px solid #2e2e40;background:#16161e}
.ibr-kpi:last-child{border-right:none}
.ibr-kpi .val{font-size:20px;font-weight:800}
.ibr-kpi .lbl{font-size:10px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.5px;margin-top:2px}
.ibr-cache-info{font-size:11px;color:#8b8fa3;padding:6px 18px;background:#16161e;border-top:1px solid #2e2e40}

/* === Top Priorities === */
.ibr-prio-bar{background:#1a1a24;border:1px solid #2e2e40;border-radius:8px;margin-bottom:12px;overflow:hidden}
.ibr-prio-bar-hdr{display:flex;align-items:center;gap:10px;padding:10px 14px;background:#1f1f30;border-bottom:1px solid #2e2e40;cursor:pointer;user-select:none}
.ibr-prio-bar-hdr .pb-title{font-size:13px;font-weight:700;color:#ef9a9a}
.ibr-prio-bar-hdr .arrow{font-size:12px;color:#8b8fa3;margin-left:auto;transition:transform .2s}
.ibr-prio-bar-hdr.collapsed .arrow{transform:rotate(-90deg)}
.ibr-prio-items{padding:10px 12px;display:flex;flex-direction:column;gap:6px}
.ibr-prio-items.hidden{display:none}
.ibr-prio-item{display:flex;align-items:flex-start;gap:10px;padding:8px 12px;background:#16161e;border-radius:6px;border-left:3px solid #7c3aed}
.ibr-prio-item.behind{border-left-color:#f44336}
.ibr-prio-num{font-size:15px;font-weight:800;color:#7c3aed;min-width:22px;text-align:center;line-height:1.5}
.ibr-prio-item.behind .ibr-prio-num{color:#f44336}
.ibr-prio-body{flex:1;min-width:0}
.ibr-prio-name{font-size:13px;font-weight:600;color:#d4c8f0}
.ibr-prio-reason{font-size:11px;color:#8b8fa3;margin-top:2px;line-height:1.3}
.ibr-prio-tips-list{margin:4px 0 0;padding:0;list-style:none}
.ibr-prio-tips-list li{font-size:11px;color:#c9a0ff;padding:2px 0 2px 14px;position:relative;line-height:1.3}
.ibr-prio-tips-list li::before{content:'\u25B8';position:absolute;left:0;color:#7c3aed}

/* === Alert Banner === */
.ibr-alert-banner{background:#1a1a24;border:1px solid #5a3a00;border-radius:8px;margin-bottom:12px;overflow:hidden}
.ibr-alert-hdr{display:flex;align-items:center;gap:10px;padding:10px 14px;background:#2a1e0e;border-bottom:1px solid #5a3a00;cursor:pointer;user-select:none}
.ibr-alert-hdr .ab-title{font-size:13px;font-weight:700;color:#ffb74d}
.ibr-alert-hdr .ab-count{font-size:11px;padding:2px 8px;border-radius:10px;background:#5a3a00;color:#ffb74d;font-weight:700}
.ibr-alert-hdr .arrow{font-size:12px;color:#8b8fa3;margin-left:auto;transition:transform .2s}
.ibr-alert-hdr.collapsed .arrow{transform:rotate(-90deg)}
.ibr-alert-scroll{max-height:300px;overflow-y:auto;padding:8px 12px;display:flex;flex-direction:column;gap:6px}
.ibr-alert-scroll.hidden{display:none}
.ibr-alert-item{display:flex;align-items:flex-start;gap:8px;padding:8px 12px;border-radius:6px;font-size:12px;line-height:1.4}
.ibr-alert-item.sev-info{background:#161e28;border-left:3px solid #2196f3}
.ibr-alert-item.sev-warning{background:#1e1a10;border-left:3px solid #ff9800}
.ibr-alert-item.sev-critical{background:#1e1010;border-left:3px solid #f44336}
.ibr-alert-icon{font-size:16px;flex-shrink:0;line-height:1}
.ibr-alert-body{flex:1;min-width:0}
.ibr-alert-label{font-weight:600;color:#d4c8f0}
.ibr-alert-msg{color:#8b8fa3;font-size:11px;margin-top:2px}
.ibr-alert-meta{font-size:10px;color:#6060a0;margin-top:2px}

/* === Quick Wins / Recommendations === */
.ibr-recs-bar{background:#1a1a24;border:1px solid #2e2e40;border-radius:8px;margin-bottom:12px;overflow:hidden}
.ibr-recs-hdr{display:flex;align-items:center;gap:10px;padding:10px 14px;background:#1a1f2a;border-bottom:1px solid #2e2e40;cursor:pointer;user-select:none}
.ibr-recs-hdr .rb-title{font-size:13px;font-weight:700;color:#64b5f6}
.ibr-recs-hdr .rb-count{font-size:11px;padding:2px 8px;border-radius:10px;background:#1a2a3a;color:#64b5f6;font-weight:700}
.ibr-recs-hdr .arrow{font-size:12px;color:#8b8fa3;margin-left:auto;transition:transform .2s}
.ibr-recs-hdr.collapsed .arrow{transform:rotate(-90deg)}
.ibr-recs-items{padding:10px 12px;display:flex;flex-direction:column;gap:6px}
.ibr-recs-items.hidden{display:none}
.ibr-recs-item{display:flex;align-items:center;gap:10px;padding:8px 12px;background:#16161e;border-radius:6px;border-left:3px solid #64b5f6}
.ibr-recs-item.pinned{border-left-color:#ffc107}
.ibr-recs-icon{font-size:15px;flex-shrink:0}
.ibr-recs-body{flex:1;min-width:0}
.ibr-recs-name{font-size:13px;font-weight:600;color:#d4c8f0}
.ibr-recs-detail{font-size:11px;color:#8b8fa3;margin-top:2px}
.ibr-recs-bar-mini{height:4px;background:#2a2a3c;border-radius:2px;margin-top:4px;overflow:hidden}
.ibr-recs-bar-fill{height:100%;border-radius:2px;background:#64b5f6;transition:width .3s}

/* === Benchmark Badge === */
.ibr-bench-badge{display:inline-block;font-size:10px;padding:1px 6px;border-radius:8px;margin-left:6px;font-weight:600}
.ibr-bench-above{background:#1a2a1a;color:#4caf50;border:1px solid #2a3a2a}
.ibr-bench-below{background:#2a1a1a;color:#f44336;border:1px solid #3a2a2a}
.ibr-bench-avg{background:#1a1a2a;color:#8b8fa3;border:1px solid #2a2a3c}

/* === Sticky Nav === */
.ibr-nav{position:sticky;top:64px;z-index:100;background:#13131a;border-bottom:1px solid #2e2e40;padding:8px 14px;margin-bottom:12px;display:flex;gap:4px;overflow-x:auto;scrollbar-width:none}
.ibr-nav::-webkit-scrollbar{display:none}
.ibr-nav-pill{flex-shrink:0;padding:5px 12px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid #2e2e40;background:#1a1a24;color:#8b8fa3;transition:all .18s;text-decoration:none;user-select:none}
.ibr-nav-pill.w1{--nc:#4caf50}.ibr-nav-pill.w2{--nc:#ff9800}.ibr-nav-pill.w3{--nc:#2196f3}
.ibr-nav-pill.w4{--nc:#9c27b0}.ibr-nav-pill.w5{--nc:#00bcd4}.ibr-nav-pill.w6{--nc:#ffc107}
.ibr-nav-pill.w7{--nc:#f44336}.ibr-nav-pill.all{--nc:#b794f6}.ibr-nav-pill.gear{--nc:#78909c}.ibr-nav-pill.chars{--nc:#8d6e63}
.ibr-nav-pill:hover{background:color-mix(in srgb,var(--nc,#7c3aed) 15%,#1a1a24);border-color:var(--nc,#7c3aed);color:var(--nc,#d4c8f0)}
.ibr-nav-pill.active{background:var(--nc,#7c3aed);border-color:var(--nc,#7c3aed);color:#fff}

/* === Settings Bar === */
.ibr-settings{display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:8px 14px;background:#1a1a24;border:1px solid #2e2e40;border-radius:8px;margin-bottom:12px;font-size:12px;color:#8b8fa3}
.ibr-toggle{display:flex;align-items:center;gap:6px;cursor:pointer;user-select:none;color:#ccc}
.ibr-toggle input{display:none}
.ibr-toggle .slider{width:32px;height:18px;background:#3a3a50;border-radius:9px;position:relative;transition:background .2s}
.ibr-toggle .slider::after{content:'';position:absolute;top:2px;left:2px;width:14px;height:14px;background:#888;border-radius:50%;transition:all .2s}
.ibr-toggle input:checked+.slider{background:#7c3aed}
.ibr-toggle input:checked+.slider::after{left:16px;background:#fff}

/* === World Sections === */
.ibr-world-section{margin-bottom:14px;scroll-margin-top:100px}
.ibr-world-hdr2{display:flex;align-items:center;gap:10px;padding:10px 16px;background:#1f1f30;border:1px solid #2e2e40;border-radius:8px 8px 0 0;cursor:pointer;user-select:none;border-left:4px solid #7c3aed;transition:background .18s}
.ibr-world-hdr2:hover{background:#26263a}
.ibr-world-hdr2.collapsed{border-radius:8px}
.ibr-world-hdr2 .wn{font-size:15px;font-weight:700;color:#d4c8f0;flex:1}
.ibr-world-hdr2 .ws{display:flex;gap:6px;align-items:center;font-size:11px;color:#8b8fa3}
.ibr-world-hdr2 .ws .behind-badge{color:#ef9a9a;background:#2a1a1a;padding:1px 6px;border-radius:3px;font-weight:700}
.ibr-world-hdr2 .ws .maxed-badge{color:#81c784;background:#162018;padding:1px 6px;border-radius:3px}
.ibr-world-hdr2 .arrow{font-size:11px;color:#8b8fa3;transition:transform .2s}
.ibr-world-hdr2.collapsed .arrow{transform:rotate(-90deg)}
.ibr-world-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:8px;padding:8px;background:#14141e;border:1px solid #2e2e40;border-top:none;border-radius:0 0 8px 8px}
.ibr-world-grid.hidden{display:none}

/* === System Cards === */
.ibr-sys{background:#1a1a24;border:1px solid #2e2e40;border-radius:7px;overflow:hidden;transition:border-color .18s;cursor:pointer}
.ibr-sys:hover{border-color:#3e3e56}
.ibr-sys.behind{border-left:3px solid #f44336}
.ibr-sys.maxed{border-left:3px solid #4caf50}
.ibr-sys-top{display:flex;align-items:center;gap:7px;padding:8px 10px;background:#1f1f30;border-bottom:1px solid #22223a}
.ibr-sys-top .s-icon{font-size:17px;flex-shrink:0}
.ibr-sys-top .s-name{font-size:13px;font-weight:700;color:#d4c8f0;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ibr-sys-top .s-stars{font-size:11px;flex-shrink:0;letter-spacing:0}
.ibr-sys-top .s-tier{font-size:9px;padding:1px 5px;border-radius:3px;font-weight:700;flex-shrink:0}
.ibr-sys-meta{display:flex;align-items:center;gap:6px;padding:4px 10px;background:#16161e;border-bottom:1px solid #1e1e2e}
.ibr-bar2{flex:1;height:4px;background:#22223a;border-radius:2px;overflow:hidden}
.ibr-bar2-fill{height:100%;border-radius:2px;transition:width .4s}
.ibr-sys-meta .bench{font-size:10px}
.ibr-sys-detail2{padding:5px 10px;font-size:11px;color:#8b8fa3;line-height:1.4;border-bottom:1px solid #1e1e2e}
.ibr-sys-tips2{margin:0;padding:0;list-style:none}
.ibr-sys-tips2.hidden{display:none}
.ibr-sys-tips2 li{display:flex;align-items:flex-start;gap:6px;padding:5px 10px;font-size:11px;color:#d0d0d8;border-bottom:1px solid #1a1a28;line-height:1.3}
.ibr-sys-tips2 li:last-child{border-bottom:none}
.ibr-sys-tips2 .ti{flex-shrink:0;font-size:12px}
.ibr-sys-expand{padding:4px 10px;font-size:10px;color:#8b8fa3;text-align:center;background:#16161e;cursor:pointer;transition:color .15s}
.ibr-sys-expand:hover{color:#b794f6}

/* === Gear Section === */
.ibr-gear-section{background:#1a1a24;border:1px solid #2e2e40;border-radius:8px;margin-bottom:14px;overflow:hidden;scroll-margin-top:100px}
.ibr-gear-hdr{display:flex;align-items:center;gap:10px;padding:11px 16px;background:#1f1f30;border-bottom:1px solid #2e2e40;cursor:pointer;user-select:none}
.ibr-gear-hdr .gt{font-size:15px;font-weight:700;color:#d4c8f0;flex:1}
.ibr-gear-hdr .arrow{font-size:11px;color:#8b8fa3;transition:transform .2s}
.ibr-gear-hdr.collapsed .arrow{transform:rotate(-90deg)}
.ibr-gear-body{padding:0}
.ibr-gear-body.hidden{display:none}
.ibr-gear-active{padding:8px 10px;display:flex;flex-direction:column;gap:6px}
.ibr-gear-item{display:flex;align-items:flex-start;gap:10px;padding:8px 10px;background:#16161e;border-radius:6px;border-left:3px solid #ff9800}
.ibr-gear-item .gi-icon{font-size:20px;flex-shrink:0}
.ibr-gear-item .gi-body{flex:1;min-width:0}
.ibr-gear-item .gi-label{font-size:13px;font-weight:600;color:#d4c8f0}
.ibr-gear-item .gi-curr{font-size:10px;color:#8b8fa3;margin-left:6px}
.ibr-gear-item .gi-rec{font-size:12px;font-weight:600;margin-top:2px}
.ibr-gear-item .gi-chars{font-size:10px;color:#8b8fa3;margin-top:2px}
.ibr-gear-maxed{padding:8px 14px;font-size:12px;color:#4caf50;background:#141e18;border-top:1px solid #1e2a20;line-height:1.6}

/* === Characters Section === */
.ibr-chars-section{background:#1a1a24;border:1px solid #2e2e40;border-radius:8px;margin-bottom:14px;overflow:hidden;scroll-margin-top:100px}
.ibr-chars-hdr{display:flex;align-items:center;gap:10px;padding:11px 16px;background:#1f1f30;border-bottom:1px solid #2e2e40;cursor:pointer;user-select:none}
.ibr-chars-hdr .ct{font-size:15px;font-weight:700;color:#d4c8f0;flex:1}
.ibr-chars-hdr .arrow{font-size:11px;color:#8b8fa3;transition:transform .2s}
.ibr-chars-hdr.collapsed .arrow{transform:rotate(-90deg)}
.ibr-chars-body{padding:10px}
.ibr-chars-body.hidden{display:none}
.ibr-char-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px}
.ibr-char{background:#16161e;border:1px solid #2e2e40;border-radius:6px;overflow:hidden}
.ibr-char-top{display:flex;align-items:flex-start;justify-content:space-between;padding:8px 12px;background:#1f1f30;border-bottom:1px solid #2e2e40}
.ibr-char-top .cn{font-size:13px;font-weight:600;color:#d4c8f0}
.ibr-char-top .cc{font-size:10px;color:#8b8fa3;margin-top:1px}
.ibr-char-top .cl{font-size:17px;font-weight:800;color:#b794f6}
.ibr-char-afk{font-size:10px;color:#8b8fa3;padding:4px 12px 2px}
.ibr-char-skills{display:flex;gap:3px;flex-wrap:wrap;padding:4px 12px 8px}
.ibr-char-skill{font-size:9px;background:#22223a;padding:1px 4px;border-radius:2px;color:#bbb;border:1px solid #2a2a3a}

/* === Loading & Error === */
.ibr-loading{text-align:center;padding:40px;color:#8b8fa3;font-size:14px}
.ibr-loading .spinner{width:32px;height:32px;border:3px solid #3a3a50;border-top-color:#b794f6;border-radius:50%;animation:ibr-spin .8s linear infinite;margin:0 auto 12px}
@keyframes ibr-spin{to{transform:rotate(360deg)}}
.ibr-error{background:#2a1a1a;border:1px solid #5a2a2a;color:#ef9a9a;border-radius:8px;padding:12px;font-size:13px}

/* === Progression History === */
.ibr-hist{background:#1a1a24;border:1px solid #2e2e40;border-radius:8px;margin-bottom:12px;overflow:hidden}
.ibr-hist-hdr{display:flex;align-items:center;gap:8px;padding:9px 14px;background:#1f1f30;border-bottom:1px solid #2e2e40;cursor:pointer;user-select:none}
.ibr-hist-hdr .ht{font-size:13px;font-weight:700;color:#c4b8f0}
.ibr-hist-hdr .arrow{font-size:11px;color:#8b8fa3;margin-left:auto;transition:transform .2s}
.ibr-hist-hdr.collapsed .arrow{transform:rotate(-90deg)}
.ibr-hist-body{padding:10px 14px;display:flex;flex-direction:column;gap:8px}
.ibr-hist-body.hidden{display:none}
.ibr-hist-row{display:flex;align-items:center;gap:10px;font-size:12px}
.ibr-hist-row .ht-ts{color:#8b8fa3;min-width:90px;font-size:11px}
.ibr-hist-row .ht-bar{flex:1;height:8px;background:#22223a;border-radius:4px;overflow:hidden}
.ibr-hist-row .ht-fill{height:100%;border-radius:4px;background:linear-gradient(90deg,#5b3aed,#b794f6);transition:width .4s}
.ibr-hist-row .ht-pct{min-width:38px;text-align:right;color:#c4b8f0;font-weight:700}
.ibr-hist-row .ht-delta{min-width:46px;text-align:right;font-size:11px;font-weight:700}
.ibr-hist-delta-pos{color:#4caf50}
.ibr-hist-delta-neg{color:#f44336}
.ibr-hist-delta-zero{color:#8b8fa3}

/* === Progression History === */
.ibr-hist{background:#1a1a24;border:1px solid #2e2e40;border-radius:8px;margin-bottom:12px;overflow:hidden}
.ibr-hist-hdr{display:flex;align-items:center;gap:8px;padding:9px 14px;background:#1f1f30;border-bottom:1px solid #2e2e40;cursor:pointer;user-select:none}
.ibr-hist-hdr .ht{font-size:13px;font-weight:700;color:#c4b8f0}
.ibr-hist-hdr .arrow{font-size:11px;color:#8b8fa3;margin-left:auto;transition:transform .2s}
.ibr-hist-hdr.collapsed .arrow{transform:rotate(-90deg)}
.ibr-hist-body{padding:10px 14px;display:flex;flex-direction:column;gap:8px}
.ibr-hist-body.hidden{display:none}
.ibr-hist-row{display:flex;align-items:center;gap:10px;font-size:12px}
.ibr-hist-row .ht-ts{color:#8b8fa3;min-width:90px;font-size:11px}
.ibr-hist-row .ht-bar{flex:1;height:8px;background:#22223a;border-radius:4px;overflow:hidden}
.ibr-hist-row .ht-fill{height:100%;border-radius:4px;background:linear-gradient(90deg,#5b3aed,#b794f6);transition:width .4s}
.ibr-hist-row .ht-pct{min-width:38px;text-align:right;color:#c4b8f0;font-weight:700}
.ibr-hist-row .ht-delta{min-width:46px;text-align:right;font-size:11px;font-weight:700}
.ibr-hist-delta-pos{color:#4caf50}
.ibr-hist-delta-neg{color:#f44336}
.ibr-hist-delta-zero{color:#8b8fa3}

/* === Review Filter/Search bar === */
.ibr-filter-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 14px;background:#1a1a24;border:1px solid #2e2e40;border-radius:8px;margin-bottom:12px;font-size:12px}
.ibr-filter-search{flex:1;min-width:160px;background:#13131a;border:1px solid #2e2e40;border-radius:5px;padding:5px 10px;color:#d0d0d8;font-size:12px;outline:none}
.ibr-filter-search:focus{border-color:#b794f6}
.ibr-filter-btn{padding:4px 10px;border-radius:4px;border:1px solid #2e2e40;background:#1f1f30;color:#8b8fa3;font-size:11px;cursor:pointer;white-space:nowrap}
.ibr-filter-btn:hover{border-color:#b794f6;color:#b794f6}
.ibr-filter-btn.active{background:#2a1a50;border-color:#7c3aed;color:#d4c8f0}

/* === Category % ring === */
.ibr-cat-ring{width:32px;height:32px;flex-shrink:0}

/* === Progress Styles === */
.ibr-stars{display:flex;gap:2px;padding:3px 10px}
.ibr-star{font-size:12px;color:#3a3a50}
.ibr-star.filled{color:#ffc107}
.ibr-rings{display:flex;gap:2px;padding:3px 10px;align-items:center}
.ibr-ring-dot{width:10px;height:10px;border-radius:50%;border:2px solid #3a3a50;background:transparent}
.ibr-ring-dot.filled{border-color:#b794f6;background:#b794f6}
.ibr-badge-row{padding:4px 10px}
.ibr-tier-badge{display:inline-block;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;background:#2a1a50;color:#b794f6;border:1px solid #3a2a60}
.ibr-tier-badge.maxed{background:#162018;color:#4caf50;border-color:#2a4030}
.ibr-sub-card.sc-pinned{border-top:2px solid #ffc107}
.ibr-pin-icon{font-size:10px;color:#ffc107;flex-shrink:0}

/* === Guidance-driven Category Sections === */
.ibr-world-cats{display:flex;flex-direction:column;gap:8px;padding:8px;background:#14141e;border:1px solid #2e2e40;border-top:none;border-radius:0 0 8px 8px}
.ibr-world-cats.hidden{display:none}
.ibr-cat-section{border-radius:6px;overflow:hidden;border:1px solid #252535}
.ibr-cat-hdr{display:flex;align-items:center;gap:10px;padding:8px 14px;background:#1c1c2e;cursor:pointer;user-select:none}
.ibr-cat-hdr .cat-icon{font-size:16px;flex-shrink:0}
.ibr-cat-hdr .cat-name{font-size:13px;font-weight:700;color:#d4c8f0;flex:1}
.ibr-cat-hdr .cat-tier{font-size:11px;color:#b794f6;font-weight:600;white-space:nowrap}
.ibr-cat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:6px;padding:6px;background:#13131a}
.ibr-cat-grid.hidden{display:none}

/* === Sub-cards (one per guidance card in a category) === */
.ibr-sub-card{background:#1a1a24;border:1px solid #2e2e40;border-radius:6px;overflow:hidden}
.ibr-sub-card.sc-maxed{border-left:3px solid #4caf50}
.ibr-sub-card.sc-behind{border-left:3px solid #f44336}
.ibr-sub-card.sc-almost{border-left:3px solid #ff9800}
.sc-almost-badge{font-size:9px;color:#ff9800;background:#1e1000;border:1px solid #3a2000;padding:1px 5px;border-radius:3px;flex-shrink:0}
.ibr-sub-card-hdr{display:flex;align-items:center;gap:6px;padding:7px 10px;background:#1f1f30;border-bottom:1px solid #22223a;min-height:36px}
.sc-tier-num{font-size:10px;font-weight:800;color:#7c3aed;white-space:nowrap;flex-shrink:0}
.sc-name{font-size:12px;font-weight:600;color:#d4c8f0;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sc-max-badge{font-size:9px;color:#4caf50;background:#162018;border:1px solid #2a4030;padding:1px 5px;border-radius:3px;flex-shrink:0}
.ibr-sub-bar{height:3px;background:#1e1e2e}
.ibr-sub-bar-fill{height:100%;transition:width .4s}
.ibr-sub-val{padding:4px 10px;font-size:11px;color:#8b8fa3;border-bottom:1px solid #1e1e2e}
.ibr-sub-tiers{padding:2px 0}
.ibr-sub-tier-row{display:flex;align-items:baseline;justify-content:space-between;gap:4px;padding:3px 10px;font-size:11px;border-bottom:1px solid #18182a}
.ibr-sub-tier-row:last-child{border-bottom:none}
.ibr-sub-tier-row .str-lbl{color:#7070a0}
.ibr-sub-tier-row .str-val{color:#c4b8f0;font-weight:600;white-space:nowrap}
</style>

<div class="ibr">

<div class="ibr-card">
  <h2>&#128269; Account Review</h2>
  <p class="ibr-sub">Upload your Idleon save JSON for a personalized analysis. Each review is private.</p>
</div>

<div id="ibrUploadSection">
  <div id="ibrSavedBanner" style="display:none;background:#0e1e0e;border:1px solid #2a4a2a;border-radius:8px;padding:12px 16px;margin-bottom:12px;display:none;align-items:center;gap:12px;flex-wrap:wrap">
    <span style="font-size:20px">💾</span>
    <div style="flex:1;min-width:0">
      <div style="font-size:13px;font-weight:700;color:#6fcf6f">Save data stored</div>
      <div id="ibrSavedBannerInfo" style="font-size:11px;color:#4a8a4a;margin-top:1px">Your last uploaded save is available — results will load automatically.</div>
    </div>
    <button class="ibr-btn" id="ibrReanalyzeFromSaveBtn" style="display:none;background:#1a2a1a;border-color:#3a5a3a;color:#6fcf6f;white-space:nowrap" onclick="ibrReanalyzeFromSave()">&#128260; Re-analyze</button>
    <button class="ibr-btn" onclick="ibrClearSave()" style="background:#2a1a1a;border-color:#5a2a2a;color:#cf6f6f;white-space:nowrap">🗑 Clear save</button>
  </div>
  <div class="ibr-card">
    <h3>&#128228; Upload Your Save</h3>
    <p class="ibr-sub">Export from Idleon (Settings &#8594; Cloud &#8594; Copy to clipboard) or use an IdleonToolbox JSON export.</p>
    <div class="ibr-drop" id="ibrDropZone">
      <input type="file" accept=".json,.txt" id="ibrFileInput">
      <div class="icon">&#128193;</div>
      <div class="label">Drop your JSON file here or click to browse</div>
      <div class="hint">Accepts .json or .txt files</div>
    </div>
    <div style="text-align:center;margin:10px 0;color:#8b8fa3;font-size:12px">&#8212; or paste JSON directly &#8212;</div>
    <textarea id="ibrPasteArea" placeholder="Paste your Idleon JSON here..." style="width:100%;min-height:70px;background:#13131a;border:1px solid #2e2e40;border-radius:8px;padding:10px;color:#ccc;font-size:12px;font-family:monospace;resize:vertical;box-sizing:border-box"></textarea>
    <div style="display:flex;gap:10px;margin-top:10px;align-items:center">
      <button class="ibr-btn" onclick="ibrSubmit()">&#128269; Analyze Account</button>
      <button class="ibr-btn" id="ibrReanalyzeFromSaveBtn" style="display:none;background:#1a2a1a;border-color:#3a5a3a;color:#6fcf6f" onclick="ibrReanalyzeFromSave()">&#128260; Re-analyze saved data</button>
      <span id="ibrStatus" style="font-size:12px;color:#8b8fa3"></span>
    </div>
    <div id="ibrError" style="margin-top:10px;display:none"></div>
  </div>
</div>

<div id="ibrResults" style="display:none"></div>

</div><!-- /.ibr -->

<script>
(function(){
  var dropZone = document.getElementById('ibrDropZone');
  var fileInput = document.getElementById('ibrFileInput');
  var pasteArea = document.getElementById('ibrPasteArea');

  fetch('/api/idleon/review/cached').then(function(r){ return r.json(); }).then(function(d){
    if(d.success && d.cached && d.result){
      // Show saved-data banner (and re-analyze button inside it)
      var banner = document.getElementById('ibrSavedBanner');
      if(banner){ banner.style.display = 'flex'; }
      if(d.hasSavedData){
        var rsb = document.getElementById('ibrReanalyzeFromSaveBtn');
        if(rsb) rsb.style.display = '';
        var info = document.getElementById('ibrSavedBannerInfo');
        if(info && d.analyzedAgo) info.textContent = 'Last uploaded: ' + d.analyzedAgo + ' \u2014 re-analyze anytime without re-pasting.';
      }
      // Load guidance evaluation using the stored save (POST with empty body uses session save)
      fetch('/api/guidance/evaluate', { method:'POST', headers:{'Content-Type':'application/json'}, body:'{}' })
        .then(function(gr){ return gr.json(); }).catch(function(){ return null; })
        .then(function(gd){
          renderResults(d.result, gd && gd.worlds ? gd : null);
          var cacheInfo = 'Showing saved result';
          if(d.analyzedAgo) cacheInfo += ' from ' + d.analyzedAgo;
          if(!d.canReanalyze) cacheInfo += ' \u2014 next analysis in ' + d.cooldownMins + ' min';
          document.getElementById('ibrCacheInfo').textContent = cacheInfo;
          document.getElementById('ibrCacheInfo').style.display = '';
          if(!d.canReanalyze){
            var btn = document.getElementById('ibrReanalyzeBtn');
            if(btn){ btn.disabled = true; btn.title = 'Cooldown: ' + d.cooldownMins + ' min remaining'; }
          }
        });
    } else if(d.success && d.hasSavedData) {
      // Have a save on disk but no cached result — show the banner so they can re-analyze
      var banner = document.getElementById('ibrSavedBanner');
      if(banner){ banner.style.display = 'flex'; }
      var rsb = document.getElementById('ibrReanalyzeFromSaveBtn');
      if(rsb) rsb.style.display = '';
      var info = document.getElementById('ibrSavedBannerInfo');
      if(info) info.textContent = 'You have a stored save \u2014 click Re-analyze to restore your results without re-pasting.';
    }
  }).catch(function(){}).then(function(){
    // If server cache returned nothing, try localStorage as fallback
    var el = document.getElementById('ibrResults');
    if (el && el.style.display === 'none') {
      try {
        var ts = parseInt(localStorage.getItem('ibr_review_ts') || '0', 10);
        var maxAge = 3 * 24 * 60 * 60 * 1000; // 3 days
        if (Date.now() - ts < maxAge) {
          var cachedR = localStorage.getItem('ibr_review_result');
          var cachedG = localStorage.getItem('ibr_guidance_data');
          if (cachedR) {
            var r = JSON.parse(cachedR);
            var gd = cachedG ? JSON.parse(cachedG) : null;
            renderResults(r, gd);
            var ci = document.getElementById('ibrCacheInfo');
            if(ci){ ci.textContent = 'Showing locally cached result \u2014 upload your save again for a fresh analysis.'; ci.style.display = ''; }
          }
        }
      } catch(e){}
    }
  });

  dropZone.addEventListener('dragover', function(e){ e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', function(){ dropZone.classList.remove('drag-over'); });
  dropZone.addEventListener('drop', function(e){
    e.preventDefault(); dropZone.classList.remove('drag-over');
    if(e.dataTransfer.files[0]) readFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', function(){ if(fileInput.files[0]) readFile(fileInput.files[0]); });

  function readFile(file){
    var reader = new FileReader();
    reader.onload = function(e){ pasteArea.value = e.target.result; document.getElementById('ibrStatus').textContent = 'File loaded: ' + file.name; };
    reader.readAsText(file);
  }

  window.ibrSubmit = function(){
    var raw = pasteArea.value.trim();
    if(!raw){ showError('Please paste or upload your JSON first.'); return; }
    var json;
    try{ json = JSON.parse(raw); } catch(e){ showError('Invalid JSON: ' + e.message); return; }
    if(!json.data || !json.charNames){ showError('This does not look like an Idleon save. Make sure it has "data" and "charNames" fields.'); return; }
    document.getElementById('ibrStatus').textContent = 'Analyzing\u2026';
    hideError();
    var reviewP = fetch('/api/idleon/review/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ save: json })
    }).then(function(r){ return r.json(); });
    var guidanceP = fetch('/api/guidance/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ save: json })
    }).then(function(r){ return r.json(); }).catch(function(){ return null; });
    Promise.all([reviewP, guidanceP])
    .then(function(results){
      var d = results[0]; var gd = results[1];
      if(!d.success){ showError(d.error || 'Analysis failed'); return; }
      document.getElementById('ibrStatus').textContent = '';
      // Show re-analyze button since save is now cached
      if(d.hasSavedData){
        var banner = document.getElementById('ibrSavedBanner');
        if(banner){ banner.style.display = 'flex'; }
        var rsb = document.getElementById('ibrReanalyzeFromSaveBtn');
        if(rsb) rsb.style.display = '';
        var binfo = document.getElementById('ibrSavedBannerInfo');
        if(binfo) binfo.textContent = 'Your save is now stored \u2014 results will load automatically next time.';
      }
      renderResults(d.result, gd && gd.worlds ? gd : null);
      var info = '';
      if(d.cached) info = 'Cached result (' + (d.analyzedAgo||'') + ')';
      if(d.cooldownMins) info += ' \u2014 next analysis in ' + d.cooldownMins + ' min';
      if(d.message) info = d.message;
      if(info){ document.getElementById('ibrCacheInfo').textContent = info; document.getElementById('ibrCacheInfo').style.display = ''; }
    })
    .catch(function(e){ showError('Request failed: ' + e.message); });
  };

  window.ibrClearSave = function(){
    if(!confirm('Clear your stored save? You will need to re-paste your JSON to analyze again.')) return;
    fetch('/api/idleon/review/save', { method:'DELETE', headers:{'Content-Type':'application/json'} })
      .then(function(r){ return r.json(); }).catch(function(){ return {}; })
      .then(function(){
        var banner = document.getElementById('ibrSavedBanner');
        if(banner) banner.style.display = 'none';
        var rsb = document.getElementById('ibrReanalyzeFromSaveBtn');
        if(rsb) rsb.style.display = 'none';
        // Also clear localStorage cache
        try { localStorage.removeItem('ibr_review_result'); localStorage.removeItem('ibr_guidance_data'); localStorage.removeItem('ibr_review_ts'); } catch(e){}
      });
  };

  window.ibrReUpload = function(){
    document.getElementById('ibrResults').style.display = 'none';
    document.getElementById('ibrUploadSection').style.display = '';
    pasteArea.value = '';
    document.getElementById('ibrStatus').textContent = '';
  };

  window.ibrReanalyzeFromSave = function(){
    document.getElementById('ibrStatus').textContent = 'Re-analyzing\u2026';
    hideError();
    Promise.all([
      fetch('/api/idleon/review/reanalyze', { method: 'POST', headers: { 'Content-Type': 'application/json' } }).then(function(r){ return r.json(); }),
      fetch('/api/guidance/evaluate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }).then(function(r){ return r.json(); }).catch(function(){ return null; })
    ]).then(function(results){
      var d = results[0]; var gd = results[1];
      if(!d.success){ showError(d.error || 'Re-analysis failed'); return; }
      document.getElementById('ibrStatus').textContent = '';
      renderResults(d.result, gd && gd.worlds ? gd : null);
      var info = d.message || '';
      if(d.cached && d.analyzedAgo) info = 'Cached result (' + d.analyzedAgo + ')';
      if(d.cooldownMins) info += ' \u2014 next analysis in ' + d.cooldownMins + ' min';
      if(info){ document.getElementById('ibrCacheInfo').textContent = info; document.getElementById('ibrCacheInfo').style.display = ''; }
    }).catch(function(e){ showError('Request failed: ' + e.message); });
  };

  function showError(msg){
    var el = document.getElementById('ibrError');
    el.innerHTML = '<div class="ibr-error">\u274C ' + escH(msg) + '</div>';
    el.style.display = '';
    document.getElementById('ibrStatus').textContent = '';
  }
  function hideError(){ document.getElementById('ibrError').style.display = 'none'; }
  function escH(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function ibrIcon(icon, fallback, size) {
    size = size || 16;
    if (icon && (icon.startsWith('/') || icon.startsWith('http')))
      return '<img src="' + icon + '" style="width:' + size + 'px;height:' + size + 'px;object-fit:contain;vertical-align:middle">';
    return icon || fallback || '';
  }

  var tierColors = { locked:'#6b7280', early:'#4caf50', mid:'#2196f3', late:'#ff9800', endgame:'#e91e63', ultra:'#b794f6', maxed:'#fbbf24', behind:'#ef4444' };
  var worldLabels = { W1:'World 1', W2:'World 2', W3:'World 3', W4:'World 4', W5:'World 5', W6:'World 6', W7:'World 7', All:'Cross-World' };
  var worldIcons  = { W1:'\uD83C\uDF3F', W2:'\uD83C\uDFDC\uFE0F', W3:'\u2744\uFE0F', W4:'\uD83D\uDD2E', W5:'\uD83C\uDF0A', W6:'\u2B50', W7:'\uD83D\uDD25', All:'\uD83C\uDF0D' };
  var worldColors = { W1:'#4caf50', W2:'#ff9800', W3:'#2196f3', W4:'#9c27b0', W5:'#00bcd4', W6:'#ffc107', W7:'#f44336', All:'#b794f6' };

  function stars(n){ var s=''; for(var i=0;i<5;i++) s += i<n ? '\u2605' : '\u2606'; return s; }

  function parseTip(t){
    var prefixes = ['\u26A0\uFE0F','\uD83D\uDCA1','\uD83D\uDCCA','\u2B06\uFE0F','\uD83D\uDD04','\u2139\uFE0F','\u2705'];
    for(var i=0;i<prefixes.length;i++){ if(t.indexOf(prefixes[i])===0) return {icon:prefixes[i],text:t.substring(prefixes[i].length).trim()}; }
    return {icon:'\u25B8',text:t};
  }

  function renderResults(r, guidanceData){
    document.getElementById('ibrUploadSection').style.display = 'none';
    var el = document.getElementById('ibrResults');
    el.style.display = '';
    var tc = tierColors[r.tier] || '#ccc';
    var html = '';

    // Persist to localStorage so results survive page refresh even if server session is lost
    try {
      localStorage.setItem('ibr_review_result', JSON.stringify(r));
      if (guidanceData) localStorage.setItem('ibr_guidance_data', JSON.stringify(guidanceData));
      localStorage.setItem('ibr_review_ts', Date.now().toString());
    } catch(e){}
    // Save 3-entry rolling progression snapshot
    try {
      var snap = { ts: Date.now() };
      if(guidanceData && guidanceData.worlds && guidanceData.worlds.length > 0) {
        var wps = {}, wsum = 0, wcnt = guidanceData.worlds.length;
        for(var _si=0; _si<guidanceData.worlds.length; _si++){
          var _sw = guidanceData.worlds[_si];
          wps[_sw.id] = Math.round((_sw.pct||0)*100)/100;
          wsum += _sw.pct || 0;
        }
        snap.globalPct = wcnt > 0 ? Math.round((wsum/wcnt)*100)/100 : 0;
        snap.worlds = wps;
      } else {
        snap.globalPct = r.summary ? Math.round((r.summary.avgScore / 5) * 100) / 100 : 0;
        snap.worlds = {};
      }
      var _hist = JSON.parse(localStorage.getItem('ibr_history') || '[]');
      // Avoid duplicate consecutive snapshots (within 60 s)
      if(_hist.length === 0 || snap.ts - _hist[_hist.length-1].ts > 60000){
        _hist.push(snap);
        if(_hist.length > 3) _hist = _hist.slice(-3);
        localStorage.setItem('ibr_history', JSON.stringify(_hist));
      }
    } catch(e){}

    // ===== PROGRESSION HISTORY TREND =====
    var _histSnaps = [];
    try { _histSnaps = JSON.parse(localStorage.getItem('ibr_history') || '[]'); } catch(e){}
    if(_histSnaps.length >= 2){
      html += '<div class="ibr-hist">';
      html += '<div class="ibr-hist-hdr" onclick="this.classList.toggle(\\'collapsed\\');var b=this.nextElementSibling;b.classList.toggle(\\'hidden\\');this.querySelector(\\'.arrow\\').textContent=b.classList.contains(\\'hidden\\')?\\'\u25ba\\':\\'\u25bc\\'">';
      html += '<span style="font-size:14px">📈</span><span class="ht">Progression History (' + _histSnaps.length + ' runs)</span><span class="arrow">▼</span>';
      html += '</div><div class="ibr-hist-body">';
      for(var _hi=0;_hi<_histSnaps.length;_hi++){
        var _hs = _histSnaps[_hi];
        var _pct = Math.round((_hs.globalPct||0)*100);
        var _prev = _hi > 0 ? Math.round((_histSnaps[_hi-1].globalPct||0)*100) : null;
        var _delta = _prev !== null ? _pct - _prev : null;
        var _dClass = _delta === null ? '' : (_delta > 0 ? 'ibr-hist-delta-pos' : (_delta < 0 ? 'ibr-hist-delta-neg' : 'ibr-hist-delta-zero'));
        var _dText = _delta === null ? '' : (_delta > 0 ? '+' + _delta + '%' : _delta + '%');
        html += '<div class="ibr-hist-row">';
        html += '<span class="ht-ts">' + new Date(_hs.ts).toLocaleDateString() + '</span>';
        html += '<div class="ht-bar"><div class="ht-fill" style="width:' + _pct + '%"></div></div>';
        html += '<span class="ht-pct">' + _pct + '%</span>';
        html += '<span class="ht-delta ' + _dClass + '">' + _dText + '</span>';
        html += '</div>';
      }
      html += '</div></div>';
    }

    // Count total guidance cards — priorities only make sense when categories have content
    var totalGuidanceCards = 0;
    var _gMaxed = 0, _gBehind = 0, _gScorable = 0;
    if(guidanceData && guidanceData.worlds){
      for(var gwi=0;gwi<guidanceData.worlds.length;gwi++){
        var gw = guidanceData.worlds[gwi];
        for(var gci=0;gci<gw.categories.length;gci++){
          var _gcards = gw.categories[gci].cards;
          totalGuidanceCards += _gcards.length;
          for(var _gki=0;_gki<_gcards.length;_gki++){
            var _gc = _gcards[_gki];
            if(_gc.cardType === 'info' || _gc.cardType === 'alert' || _gc.visible === false) continue;
            _gScorable++;
            if(_gc.atMax) _gMaxed++;
            else if(_gc.tierIndex < 0) _gBehind++;
          }
        }
      }
    }
    var _useGuidanceStats = totalGuidanceCards > 0;

    // ===== HEADER =====
    html += '<div class="ibr-header">';
    html += '<div class="ibr-header-top">';
    html += '<div class="h-title">\uD83D\uDD0D Account Review</div>';
    html += '<span class="h-tier" style="background:' + tc + '22;color:' + tc + ';border:1px solid ' + tc + '44">' + escH(r.tierLabel) + '</span>';
    html += '<div class="h-space"></div>';
    html += '<button class="ibr-btn-outline" id="ibrReanalyzeBtn" onclick="ibrReUpload()">\u21BB New Analysis</button>';
    html += '<button class="ibr-btn-outline" onclick="ibrExportReport()" title="Download review as Markdown">\uD83D\uDCE5 Export</button>';
    html += '</div>';
    html += '<div id="ibrCacheInfo" class="ibr-cache-info" style="display:none"></div>';
    html += '<div class="ibr-kpi-row">';
    if(_useGuidanceStats){
      var _gSum2=0, _gCnt2=guidanceData.worlds.length;
      for(var _gi2=0;_gi2<_gCnt2;_gi2++) _gSum2 += guidanceData.worlds[_gi2].pct||0;
      var _gGlobal2 = Math.round(_gSum2/_gCnt2);
      html += '<div class="ibr-kpi"><div class="val" style="color:' + tc + '">' + _gGlobal2 + '%</div><div class="lbl">Progress</div></div>';
      html += '<div class="ibr-kpi"><div class="val" style="color:#4caf50">' + _gMaxed + '</div><div class="lbl">Maxed</div></div>';
      html += '<div class="ibr-kpi"><div class="val" style="color:#f44336">' + _gBehind + '</div><div class="lbl">Behind</div></div>';
      html += '<div class="ibr-kpi"><div class="val" style="color:#2196f3">' + _gScorable + '</div><div class="lbl">Cards</div></div>';
    } else {
      html += '<div class="ibr-kpi"><div class="val" style="color:' + tc + '">' + r.summary.avgScore.toFixed(1) + '</div><div class="lbl">Avg Score</div></div>';
      html += '<div class="ibr-kpi"><div class="val" style="color:#4caf50">' + r.summary.maxedCount + '</div><div class="lbl">Maxed</div></div>';
      html += '<div class="ibr-kpi"><div class="val" style="color:#f44336">' + r.summary.behindCount + '</div><div class="lbl">Behind</div></div>';
      html += '<div class="ibr-kpi"><div class="val" style="color:#2196f3">' + r.summary.totalSystems + '</div><div class="lbl">Systems</div></div>';
    }
    html += '<div class="ibr-kpi"><div class="val" style="color:#b794f6">' + r.characterCount + '</div><div class="lbl">Chars</div></div>';
    if(r.accountAge !== null) html += '<div class="ibr-kpi"><div class="val" style="color:#ff9800">' + Math.floor(r.accountAge/365) + 'y</div><div class="lbl">Age</div></div>';
    if(!_useGuidanceStats && r.summary.percentile !== undefined) html += '<div class="ibr-kpi"><div class="val" style="color:#00bcd4">~' + r.summary.percentile + '%</div><div class="lbl">Percentile</div></div>';
    html += '</div></div>';

    // ===== TOP PRIORITIES ===== (guidance recommendations when active, else legacy priorities)
    var _gRecs = (guidanceData && guidanceData.recommendations) ? guidanceData.recommendations : [];
    if(_useGuidanceStats && _gRecs.length > 0){
      html += '<div class="ibr-prio-bar">';
      html += '<div class="ibr-prio-bar-hdr" onclick="ibrTogglePrio(this)">';
      html += '<span style="font-size:16px">\uD83D\uDD25</span>';
      html += '<span class="pb-title">Top Priorities (' + _gRecs.length + ')</span>';
      html += '<span class="arrow">\u25BC</span>';
      html += '</div>';
      html += '<div class="ibr-prio-items">';
      for(var gri=0;gri<_gRecs.length;gri++){
        var gr = _gRecs[gri];
        var grPct = Math.round((gr.pctToNext||0)*100);
        html += '<div class="ibr-prio-item' + (grPct < 30 ? ' behind' : '') + '">';
        html += '<div class="ibr-prio-num">#' + (gri+1) + '</div>';
        html += '<div class="ibr-prio-body">';
        html += '<div class="ibr-prio-name">' + escH(gr.card.icon||'') + ' ' + escH(gr.card.label||'') + ' <span style="color:#8b8fa3;font-size:9px">' + escH(gr.worldLabel||'') + ' \u203A ' + escH(gr.categoryLabel||'') + '</span></div>';
        html += '<div class="ibr-prio-reason" style="display:flex;align-items:center;gap:6px">';
        html += '<div style="flex:1;height:6px;border-radius:3px;background:#23263a"><div style="width:' + grPct + '%;height:100%;border-radius:3px;background:' + (grPct < 30 ? '#f44336' : grPct < 70 ? '#ff9800' : '#4caf50') + '"></div></div>';
        html += '<span style="font-size:11px;color:#8b8fa3">' + grPct + '% to next tier</span>';
        html += '</div>';
        html += '</div></div>';
      }
      html += '</div></div>';
    } else {
      var showPriorities = r.priorities && r.priorities.length > 0;
      if(showPriorities){
        html += '<div class="ibr-prio-bar">';
        html += '<div class="ibr-prio-bar-hdr" onclick="ibrTogglePrio(this)">';
        html += '<span style="font-size:16px">\uD83D\uDD25</span>';
        html += '<span class="pb-title">Top Priorities (' + r.priorities.length + ')</span>';
        html += '<span class="arrow">\u25BC</span>';
        html += '</div>';
        html += '<div class="ibr-prio-items">';
        for(var pi=0;pi<r.priorities.length;pi++){
          var p = r.priorities[pi];
          html += '<div class="ibr-prio-item' + (p.score <= 2 ? ' behind' : '') + '">';
          html += '<div class="ibr-prio-num">#' + (pi+1) + '</div>';
          html += '<div class="ibr-prio-body">';
          html += '<div class="ibr-prio-name">' + p.icon + ' ' + escH(p.system) + ' <span style="color:#8b8fa3;font-size:9px">' + escH(p.world) + '</span> <span style="font-size:11px">' + stars(p.score) + '</span></div>';
          html += '<div class="ibr-prio-reason">' + escH(p.reason) + '</div>';
          if(p.tips && p.tips.length > 0){
            html += '<ul class="ibr-prio-tips-list">';
            for(var pti=0;pti<Math.min(p.tips.length,3);pti++) html += '<li>' + escH(p.tips[pti]) + '</li>';
            html += '</ul>';
          }
          html += '</div></div>';
        }
        html += '</div></div>';
      }
    }

    // ===== ALERT BANNER (aggregated from all categories) =====
    var allAlerts = (guidanceData && guidanceData.alerts) ? guidanceData.alerts : [];
    if(allAlerts.length > 0){
      html += '<div class="ibr-alert-banner">';
      html += '<div class="ibr-alert-hdr" onclick="ibrToggleAlerts(this)">';
      html += '<span style="font-size:16px">\uD83D\uDD14</span>';
      html += '<span class="ab-title">Alerts</span>';
      html += '<span class="ab-count">' + allAlerts.length + '</span>';
      html += '<span class="arrow">\u25BC</span>';
      html += '</div>';
      html += '<div class="ibr-alert-scroll">';
      for(var ai=0;ai<allAlerts.length;ai++){
        var al = allAlerts[ai];
        var sevCls = 'sev-' + (al.severity || 'warning');
        html += '<div class="ibr-alert-item ' + sevCls + '">';
        html += '<span class="ibr-alert-icon">' + (al.icon || '\u26A0\uFE0F') + '</span>';
        html += '<div class="ibr-alert-body">';
        html += '<div class="ibr-alert-label">' + escH(al.label) + '</div>';
        if(al.message) html += '<div class="ibr-alert-msg">' + escH(al.message) + '</div>';
        html += '<div class="ibr-alert-meta">' + escH(al.categoryLabel || '') + ' \u00B7 ' + escH(al.worldLabel || '') + '</div>';
        html += '</div></div>';
      }
      html += '</div></div>';
    }

    // ===== QUICK WINS / RECOMMENDATIONS =====
    var recs = (guidanceData && guidanceData.recommendations) ? guidanceData.recommendations : [];
    if(recs.length > 0){
      html += '<div class="ibr-recs-bar">';
      html += '<div class="ibr-recs-hdr" onclick="ibrToggleRecs(this)">';
      html += '<span style="font-size:16px">\uD83C\uDFAF</span>';
      html += '<span class="rb-title">Quick Wins</span>';
      html += '<span class="rb-count">' + recs.length + '</span>';
      html += '<span class="arrow">\u25BC</span>';
      html += '</div>';
      html += '<div class="ibr-recs-items">';
      for(var ri=0;ri<Math.min(recs.length,10);ri++){
        var rec = recs[ri];
        var rc = rec.card;
        var rPct = Math.round((rc.pct||0)*100);
        var rFmt = rc.displayFormat || 'number';
        var rVal = rc.value;
        if(rFmt==='pct') rVal = rVal.toFixed(1)+'%';
        else if(rFmt==='abbrev'){
          if(rVal>=1e9) rVal=(rVal/1e9).toFixed(1)+'B';
          else if(rVal>=1e6) rVal=(rVal/1e6).toFixed(1)+'M';
          else if(rVal>=1e3) rVal=(rVal/1e3).toFixed(1)+'K';
          else rVal=Number(rVal).toLocaleString();
        } else rVal=Number(rVal||0).toLocaleString();
        var rUnit = rc.unit ? '\u00a0'+escH(rc.unit) : '';
        html += '<div class="ibr-recs-item' + (rec.pinned ? ' pinned' : '') + '">';
        html += '<span class="ibr-recs-icon">' + (rc.icon||'\uD83C\uDCCF') + '</span>';
        html += '<div class="ibr-recs-body">';
        html += '<div class="ibr-recs-name">' + (rec.pinned?'\uD83D\uDCCC ':'') + escH(rc.label) + ' <span style="color:#606080;font-size:10px">' + escH(rec.categoryLabel) + ' \u00B7 ' + escH(rec.worldLabel) + '</span></div>';
        html += '<div class="ibr-recs-detail">' + rVal + rUnit + ' \u2192 ' + Number(rc.nextThreshold||0).toLocaleString() + rUnit + ' <span style="color:#606080">(gap: ' + Number(rec.gap||0).toLocaleString() + ')</span></div>';
        html += '<div class="ibr-recs-bar-mini"><div class="ibr-recs-bar-fill" style="width:' + rPct + '%"></div></div>';
        html += '</div></div>';
      }
      html += '</div></div>';
    }

    // ===== GROUP SYSTEMS BY WORLD (kept for fallback + priority data) =====
    var worldOrder = ['W1','W2','W3','W4','W5','W6','W7','All'];
    var byWorld = {};
    for(var wi=0;wi<worldOrder.length;wi++) byWorld[worldOrder[wi]] = [];
    for(var j=0;j<r.systems.length;j++){
      var wk = r.systems[j].world || 'All';
      if(!byWorld[wk]) byWorld[wk] = [];
      byWorld[wk].push(r.systems[j]);
    }

    // ===== STICKY NAV =====
    html += '<div class="ibr-nav" id="ibrNav">';
    if(guidanceData && guidanceData.worlds && guidanceData.worlds.length > 0){
      // Nav pills from guidance worlds
      for(var gwi=0;gwi<guidanceData.worlds.length;gwi++){
        var gw = guidanceData.worlds[gwi];
        var gwlc = gw.id.toLowerCase();
        var gwBehind = 0;
        for(var gci=0;gci<gw.categories.length;gci++){
          for(var gki=0;gki<gw.categories[gci].cards.length;gki++){
            if(gw.categories[gci].cards[gki].tierIndex < 0) gwBehind++;
          }
        }
        var gwPct = Math.round(gw.pct||0);
        html += '<a class="ibr-nav-pill ' + gwlc + '" href="#ibr-' + gwlc + '" onclick="ibrNavClick(this)">' + (gw.icon||'') + ' ' + escH(gw.label||gw.id) + ' <span style="opacity:.7;font-size:10px">' + gwPct + '%</span>';
        if(gwBehind) html += ' <span style="opacity:.85;font-size:10px">(' + gwBehind + '\u26A0)</span>';
        html += '</a>';
      }
    } else {
      // Fallback: old system world pills
      for(var wi=0;wi<worldOrder.length;wi++){
        var wKey = worldOrder[wi];
        if(!byWorld[wKey] || byWorld[wKey].length === 0) continue;
        var wBehind = byWorld[wKey].filter(function(x){ return x.behind; }).length;
        var wlc = wKey.toLowerCase();
        html += '<a class="ibr-nav-pill ' + wlc + '" href="#ibr-' + wlc + '" onclick="ibrNavClick(this)">' + (worldIcons[wKey]||'') + ' ' + (worldLabels[wKey]||wKey);
        if(wBehind) html += ' <span style="opacity:.85;font-size:10px">(' + wBehind + '\u26A0)</span>';
        html += '</a>';
      }
    }
    html += '<a class="ibr-nav-pill gear" href="#ibr-gear" onclick="ibrNavClick(this)">\uD83C\uDFAF Gear</a>';
    html += '<a class="ibr-nav-pill chars" href="#ibr-chars" onclick="ibrNavClick(this)">\uD83D\uDC65 Chars</a>';
    html += '</div>';

    // ===== SETTINGS =====
    html += '<div class="ibr-settings">';
    html += '<span>View:</span>';
    html += '<label class="ibr-toggle"><input type="checkbox" id="ibrHideMaxed" onchange="ibrToggleMaxed()"><span class="slider"></span> Hide maxed</label>';
    html += '<label class="ibr-toggle"><input type="checkbox" id="ibrShowTips" onchange="ibrToggleAllTips()"><span class="slider"></span> Expand all tips</label>';
    html += '</div>';
    // ===== FILTER / SEARCH BAR =====
    html += '<div class="ibr-filter-bar" id="ibrFilterBar">';
    html += '<input class="ibr-filter-search" id="ibrSearchInput" type="text" placeholder="\uD83D\uDD0D Search cards\u2026" oninput="ibrSearchCards(this.value)">';
    html += '<button class="ibr-filter-btn" id="ibrAlmostBtn" onclick="ibrToggleAlmostThere(this)" title="Show only cards close to the next tier">\u26A1 Almost There</button>';
    html += '<button class="ibr-filter-btn" id="ibrBehindBtn" onclick="ibrToggleBehindOnly(this)" title="Show only cards not yet started">\u26A0\uFE0F Behind Only</button>';
    html += '</div>';

    // ===== WORLD SECTIONS =====
    if(guidanceData && guidanceData.worlds && guidanceData.worlds.length > 0){
      html += renderGuidanceWorldSections(guidanceData, escH, r);
    } else {
      // Fallback: old system cards per world
      for(var wi=0;wi<worldOrder.length;wi++){
        var wKey = worldOrder[wi];
        var ws = byWorld[wKey];
        if(!ws || ws.length === 0) continue;
        var wAvg = ws.filter(function(x){ return x.systemTier !== 'locked'; }).reduce(function(a,b){ return a+b.score; },0) / (ws.filter(function(x){ return x.systemTier !== 'locked'; }).length || 1);
        var wMaxed = ws.filter(function(x){ return x.score>=5 || x.systemTier==='maxed'; }).length;
        var wBehind = ws.filter(function(x){ return x.behind && x.systemTier !== 'locked'; }).length;
        var wLocked = ws.filter(function(x){ return x.systemTier === 'locked'; }).length;
        var wColor = worldColors[wKey] || '#7c3aed';
        var wlc = wKey.toLowerCase();

        html += '<div class="ibr-world-section" id="ibr-' + wlc + '">';
        html += '<div class="ibr-world-hdr2" style="border-left-color:' + wColor + '" onclick="ibrToggleSection(this)">';
        html += '<span style="font-size:19px">' + (worldIcons[wKey]||'') + '</span>';
        html += '<span class="wn">' + (worldLabels[wKey]||wKey) + '</span>';
        html += '<div class="ws">';
        html += '<span>' + ws.length + ' systems</span>';
        html += '<span>avg ' + wAvg.toFixed(1) + '\u2605</span>';
        if(wMaxed) html += '<span class="maxed-badge">' + wMaxed + ' maxed</span>';
        if(wBehind) html += '<span class="behind-badge">' + wBehind + ' behind</span>';
        if(wLocked) html += '<span style="color:#6b7280;font-size:11px">' + wLocked + ' locked</span>';
        html += '</div>';
        html += '<span class="arrow">\u25BC</span>';
        html += '</div>';

        html += '<div class="ibr-world-grid">';
        for(var si=0;si<ws.length;si++){
          var sys = ws[si];
          var sc = tierColors[sys.systemTier] || '#ccc';
          // 'behind' overrides the tier color when system is noticeably behind account level
          if(sys.behind && sys.systemTier !== 'locked' && sys.score <= 2) sc = tierColors.behind;
          var cls = 'ibr-sys';
          if(sys.behind && sys.systemTier !== 'locked') cls += ' behind';
          if(sys.score >= 5 || sys.systemTier === 'maxed') cls += ' maxed';
          var hasTips = sys.tips && sys.tips.length > 0 && sys.score < 5;

          html += '<div class="' + cls + '" data-score="' + sys.score + '"' + (hasTips ? ' onclick="ibrToggleSysTips(this)"' : '') + '>';
          html += '<div class="ibr-sys-top">';
          html += '<span class="s-icon">' + sys.icon + '</span>';
          html += '<span class="s-name">' + escH(sys.label) + '</span>';
          html += '<span class="s-stars" style="color:' + sc + '">' + (sys.systemTier === 'locked' ? '\uD83D\uDD12' : stars(sys.score)) + '</span>';
          html += '<span class="s-tier" style="background:' + sc + '22;color:' + sc + '">' + escH(sys.systemTier === 'behind' ? 'behind' : sys.systemTier) + '</span>';
          if(sys.behind && sys.systemTier !== 'locked') html += '<span style="font-size:12px">\u26A0\uFE0F</span>';
          html += '</div>';
          html += '<div class="ibr-sys-meta">';
          html += '<div class="ibr-bar2"><div class="ibr-bar2-fill" style="width:' + (sys.score*20) + '%;background:' + sc + '"></div></div>';
          if(sys.benchAvg !== undefined && sys.benchSamples > 0){
            var diff = sys.score - sys.benchAvg;
            var dc = diff > 0 ? '#4caf50' : diff < 0 ? '#f44336' : '#8b8fa3';
            html += '<span class="bench" style="color:' + dc + '">' + (diff>0?'+':'') + diff.toFixed(1) + ' vs avg</span>';
          }
          html += '</div>';
          html += '<div class="ibr-sys-detail2">' + escH(sys.detail) + '</div>';
          if(hasTips){
            html += '<ul class="ibr-sys-tips2 hidden">';
            for(var ti=0;ti<sys.tips.length;ti++){
              var tp = parseTip(sys.tips[ti]);
              html += '<li><span class="ti">' + tp.icon + '</span><span>' + escH(tp.text) + '</span></li>';
            }
            html += '</ul>';
            html += '<div class="ibr-sys-expand">\u25BC ' + sys.tips.length + ' tip' + (sys.tips.length>1?'s':'') + ' \u2014 click to expand</div>';
          }
          html += '</div>';
        }
        html += '</div>';
        html += '</div>';
      }
    }

    // ===== GEAR SECTION =====
    html += '<div class="ibr-gear-section" id="ibr-gear">';
    html += '<div class="ibr-gear-hdr" onclick="ibrToggleSection(this)">';
    html += '<span style="font-size:18px">\uD83C\uDFAF</span>';
    html += '<span class="gt">Gear Progression</span>';
    if(r.gearRecommendations){
      var actG = r.gearRecommendations.filter(function(g){ return g.recommendation; });
      if(actG.length) html += '<span style="color:#ff9800;font-size:12px">' + actG.length + ' upgrade' + (actG.length>1?'s':'') + '</span>';
      else html += '<span style="color:#4caf50;font-size:12px">\u2705 Up to date</span>';
    }
    html += '<span class="arrow">\u25BC</span>';
    html += '</div>';
    html += '<div class="ibr-gear-body">';
    if(r.gearRecommendations && r.gearRecommendations.length > 0){
      var activeRecs = r.gearRecommendations.filter(function(gr){ return gr.recommendation; });
      var maxedRecs  = r.gearRecommendations.filter(function(gr){ return !gr.recommendation; });
      if(activeRecs.length > 0){
        html += '<div style="padding:8px 12px 4px;font-size:11px;font-weight:700;color:#ffb74d;text-transform:uppercase;letter-spacing:.5px">Upgrades Available</div>';
        html += '<div class="ibr-gear-active">';
        for(var gi=0;gi<activeRecs.length;gi++){
          var gr = activeRecs[gi];
          var gc = gr.status==='equip-all'?'#ff9800':gr.status==='next-tier'?'#2196f3':gr.status==='advice'?'#b794f6':'#4caf50';
          html += '<div class="ibr-gear-item" style="border-left-color:' + gc + '">';
          html += '<span class="gi-icon">' + gr.icon + '</span>';
          html += '<div class="gi-body">';
          html += '<div><span class="gi-label">' + escH(gr.label) + '</span>';
          if(gr.currentTier) html += '<span class="gi-curr">Current: ' + escH(gr.currentTier) + '</span>';
          html += '</div>';
          html += '<div class="gi-rec" style="color:' + gc + '">' + escH(gr.recommendation) + '</div>';
          if(gr.charsNeedingUpgrade && gr.charsNeedingUpgrade.length > 0) html += '<div class="gi-chars">Affects: ' + gr.charsNeedingUpgrade.map(function(n){ return escH(n); }).join(', ') + '</div>';
          html += '</div></div>';
        }
        html += '</div>';
      }
      if(maxedRecs.length > 0){
        html += '<div class="ibr-gear-maxed">\u2705 ' + maxedRecs.map(function(g){ return g.icon + ' ' + escH(g.label); }).join(' \u00B7 ') + '</div>';
      }
    } else {
      html += '<div style="padding:18px;font-size:13px;color:#8b8fa3;text-align:center">No gear data \u2014 upload a more detailed save for recommendations.</div>';
    }
    html += '</div></div>';

    // ===== CHARACTERS =====
    html += '<div class="ibr-chars-section" id="ibr-chars">';
    html += '<div class="ibr-chars-hdr" onclick="ibrToggleSection(this)">';
    html += '<span style="font-size:18px">\uD83D\uDC65</span>';
    html += '<span class="ct">Characters (' + r.characterCount + ')</span>';
    html += '<span class="arrow">\u25BC</span>';
    html += '</div>';
    html += '<div class="ibr-chars-body hidden">';
    html += '<div class="ibr-char-grid">';
    var skillNames = ['Lv','Min','Smi','Chp','Fsh','Alc','Cat','Trp','Con','Wor','Cok','Bre','Lab','Sai','Div','Gam','Far','Snk','Sum','Hol','W7'];
    for(var k=0;k<r.characters.length;k++){
      var ch = r.characters[k];
      html += '<div class="ibr-char">';
      html += '<div class="ibr-char-top">';
      html += '<div><div class="cn">' + escH(ch.name) + '</div><div class="cc">' + escH(ch.className) + '</div></div>';
      html += '<div class="cl">Lv ' + ch.level + '</div>';
      html += '</div>';
      html += '<div class="ibr-char-afk">AFK: W' + ch.afkWorld + ' \u00B7 ' + escH(ch.afkTarget) + '</div>';
      html += '<div class="ibr-char-skills">';
      for(var sk=1;sk<Math.min(ch.skills.length,skillNames.length);sk++){
        var sv = ch.skills[sk];
        if(typeof sv === 'number' && sv > 0) html += '<span class="ibr-char-skill">' + skillNames[sk] + ':' + sv + '</span>';
      }
      html += '</div></div>';
    }
    html += '</div></div></div>';

    el.innerHTML = html;
  }

  // ===== GUIDANCE WORLD RENDERING HELPERS =====
  var _wColorMap = { W1:'#4caf50',W2:'#ff9800',W3:'#2196f3',W4:'#9c27b0',W5:'#00bcd4',W6:'#ffc107',W7:'#f44336' };

  function renderGuidanceWorldSections(gd, esc, reviewResult) {
    var bm = (reviewResult && reviewResult.benchmarks) ? reviewResult.benchmarks : {};
    var h = '';
    for(var wi=0;wi<gd.worlds.length;wi++){
      var w = gd.worlds[wi];
      var wlc = w.id.toLowerCase();
      var wColor = _wColorMap[w.id] || '#7c3aed';
      // Aggregate card stats for world header
      var wTotalCards=0, wMaxed=0, wBehind=0;
      for(var ci=0;ci<w.categories.length;ci++){
        for(var ki=0;ki<w.categories[ci].cards.length;ki++){
          var c = w.categories[ci].cards[ki];
          if(c.visible === false) continue;
          wTotalCards++;
          if(c.atMax) wMaxed++;
          else if(c.tierIndex < 0) wBehind++;
        }
      }
      h += '<div class="ibr-world-section" id="ibr-' + wlc + '">';
      h += '<div class="ibr-world-hdr2" style="border-left-color:' + wColor + '" onclick="ibrToggleSection(this)">';
      h += '<span style="font-size:19px">' + ibrIcon(w.icon,'\uD83C\uDF0D',19) + '</span>';
      h += '<span class="wn">' + esc(w.label||w.id) + '</span>';
      var _wpct = Math.round(w.pct||0);
      h += '<div class="ws">';
      h += '<span>' + w.categories.length + ' categor' + (w.categories.length===1?'y':'ies') + '</span>';
      h += '<span style="font-weight:700;color:#b794f6">' + _wpct + '%</span>';
      if(wMaxed) h += '<span class="maxed-badge">' + wMaxed + ' maxed</span>';
      if(wBehind) h += '<span class="behind-badge">' + wBehind + ' not started</span>';
      h += '</div>';
      h += '<span class="arrow">\u25BC</span>';
      h += '</div>';
      h += '<div style="height:4px;background:#1a1a24;border-radius:0"><div style="height:100%;width:' + _wpct + '%;background:linear-gradient(90deg,' + (wColor) + '88,' + wColor + ');transition:width .6s"></div></div>';

      // Category sections (replace ibr-world-grid)
      h += '<div class="ibr-world-cats">';
      for(var ci=0;ci<w.categories.length;ci++){
        var cat = w.categories[ci];
        var sumCurrent=0, sumMax=0;
        for(var ki=0;ki<cat.cards.length;ki++){
          if(cat.cards[ki].cardType === 'info' || cat.cards[ki].cardType === 'alert') continue;
          if(cat.cards[ki].visible === false) continue;
          sumCurrent += Math.max(0, cat.cards[ki].tierIndex + 1);
          sumMax += cat.cards[ki].maxScore;
        }
        h += '<div class="ibr-cat-section">';
        var catPct = sumMax > 0 ? Math.round((sumCurrent/sumMax)*100) : 0;
        var catColor = catPct >= 100 ? '#4caf50' : catPct >= 60 ? '#b794f6' : catPct >= 30 ? '#ff9800' : '#f44336';
        var catSvg = '<svg class="ibr-cat-ring" viewBox="0 0 32 32"><circle cx="16" cy="16" r="13" fill="none" stroke="#2a2a3c" stroke-width="4"/><circle cx="16" cy="16" r="13" fill="none" stroke="' + catColor + '" stroke-width="4" stroke-dasharray="' + Math.round(catPct*0.816) + ' 100" stroke-linecap="round" transform="rotate(-90 16 16)"/><text x="16" y="21" text-anchor="middle" font-size="9" fill="' + catColor + '" font-weight="bold">' + catPct + '</text></svg>';
        h += '<div class="ibr-cat-hdr" onclick="ibrToggleCat(this)">';
        h += catSvg;
        h += '<span class="cat-icon">' + ibrIcon(cat.icon,'\uD83D\uDCC2',16) + '</span>';
        h += '<span class="cat-name">' + esc(cat.label||cat.id) + '</span>';
        h += '<span class="cat-tier">' + sumCurrent + '/' + sumMax + '</span>';
        // Benchmark badge: show community avg comparison if data exists for this category
        var catBm = bm[cat.id];
        if(catBm && catBm.avg !== undefined && catBm.sampleSize > 0){
          var anyShowBm = cat.cards.some(function(c){ return c.showBenchmark !== false; });
          if(anyShowBm){
            var catScore = sumMax > 0 ? (sumCurrent/sumMax)*5 : 0;
            var bmDiff = catScore - catBm.avg;
            var bmCls = bmDiff > 0.3 ? 'ibr-bench-above' : bmDiff < -0.3 ? 'ibr-bench-below' : 'ibr-bench-avg';
            h += '<span class="ibr-bench-badge ' + bmCls + '">' + (bmDiff>0?'+':'') + bmDiff.toFixed(1) + ' vs avg</span>';
          }
        }
        h += '<span style="font-size:10px;color:#8b8fa3;margin-left:auto">\u25BC</span>';
        h += '</div>';
        h += '<div class="ibr-cat-grid">';
        for(var ki=0;ki<cat.cards.length;ki++){
          h += renderSubCard(cat.cards[ki], esc);
        }
        h += '</div>';
        h += '</div>'; // ibr-cat-section
      }
      h += '</div>'; // ibr-world-cats

      h += '</div>'; // ibr-world-section
    }
    return h;
  }

  function renderSubCard(card, esc) {
    // Skip invisible cards (visibleIf condition not met)
    if (card.visible === false) return '';
    // Skip maxed cards if hideIfMaxed is set
    if (card.hideIfMaxed && card.atMax) return '';

    // Info cards: render as a static text box, not a scored card
    if (card.cardType === 'info') {
      var h = '<div style="background:#1a1a24;border:1px solid #2a2a3c;border-left:3px solid #4a6080;border-radius:6px;padding:10px 12px;font-size:12px;color:#9090b8;line-height:1.5">';
      h += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">';
      h += '<span style="font-size:14px">' + ibrIcon(card.icon,'ℹ️',14) + '</span>';
      h += '<span style="font-size:12px;font-weight:600;color:#c4b8f0">' + esc(card.label) + '</span>';
      h += '</div>';
      if (card.text) h += '<div>' + esc(card.text).split(String.fromCharCode(10)).join('<br>') + '</div>';
      h += '</div>';
      return h;
    }

    // Alert cards: render triggered alerts inline in category
    if (card.cardType === 'alert') {
      if (!card.alerts || card.alerts.length === 0) return '';
      var h = '';
      for (var ai = 0; ai < card.alerts.length; ai++) {
        var al = card.alerts[ai];
        var sevCls = 'sev-' + (al.severity || 'warning');
        h += '<div class="ibr-alert-item ' + sevCls + '" style="border-radius:6px">';
        h += '<span class="ibr-alert-icon">' + (al.icon || '\u26A0\uFE0F') + '</span>';
        h += '<div class="ibr-alert-body">';
        h += '<div class="ibr-alert-label">' + esc(al.label) + '</div>';
        if (al.message) h += '<div class="ibr-alert-msg">' + esc(al.message) + '</div>';
        h += '</div></div>';
      }
      return h;
    }

    var isMaxed = !!card.atMax;
    var isBehind = card.tierIndex < 0 && !isMaxed;
    var barPctPre = isMaxed ? 100 : Math.round(card.pct * 100);
    var isAlmost = !isMaxed && !isBehind && barPctPre >= 75;
    var cls = 'ibr-sub-card' + (isMaxed ? ' sc-maxed' : isBehind ? ' sc-behind' : isAlmost ? ' sc-almost' : '');
    if (card.pinned) cls += ' sc-pinned';
    var barColor = isMaxed ? '#4caf50' : isBehind ? '#f44336' : isAlmost ? '#ff9800' : '#b794f6';
    var tierNum = Math.max(0, card.tierIndex + 1);
    var barPct = barPctPre;

    // Display format: number (default), abbrev, pct
    var fmt = card.displayFormat || 'number';
    var rawVal = (typeof card.value === 'number') ? card.value : Number(card.value||0);
    var valStr;
    if (fmt === 'pct') {
      valStr = rawVal.toFixed(1) + '%';
    } else if (fmt === 'abbrev') {
      if (rawVal >= 1e9) valStr = (rawVal/1e9).toFixed(1) + 'B';
      else if (rawVal >= 1e6) valStr = (rawVal/1e6).toFixed(1) + 'M';
      else if (rawVal >= 1e3) valStr = (rawVal/1e3).toFixed(1) + 'K';
      else valStr = rawVal.toLocaleString();
    } else {
      valStr = rawVal.toLocaleString();
    }
    var unitStr = card.unit ? '\u00a0' + esc(card.unit) : '';
    var pStyle = card.progressStyle || 'bar';
    var h = '';
    h += '<div class="' + cls + '" data-label="' + (card.label||'').toLowerCase() + '" data-maxed="' + (isMaxed?1:0) + '" data-behind="' + (isBehind?1:0) + '" data-almost="' + (isAlmost?1:0) + '" data-pct="' + barPct + '" data-pinned="' + (card.pinned?1:0) + '">';
    // Header
    h += '<div class="ibr-sub-card-hdr">';
    if (card.pinned) h += '<span class="ibr-pin-icon">\uD83D\uDCCC</span>';
    h += '<span style="font-size:15px;flex-shrink:0">' + ibrIcon(card.icon,'\uD83C\uDCCF',15) + '</span>';
    if(tierNum > 0) h += '<span class="sc-tier-num">Tier\u00a0' + tierNum + '</span>';
    h += '<span class="sc-name">' + (tierNum > 0 ? '\u00a0\u2014\u00a0' : '') + esc(card.label) + '</span>';
    if(isMaxed) h += '<span class="sc-max-badge">\u2713 MAX</span>';
    if(isAlmost && !isMaxed) h += '<span class="sc-almost-badge">\u26A1 ' + barPct + '%</span>';
    h += '</div>';

    // Progress indicator (bar / stars / rings / badge)
    if (pStyle === 'stars') {
      var maxTiers = card.maxScore || 5;
      h += '<div class="ibr-stars">';
      for (var si = 0; si < maxTiers; si++) {
        h += '<span class="ibr-star' + (si < tierNum ? ' filled' : '') + '">\u2605</span>';
      }
      h += '</div>';
    } else if (pStyle === 'rings') {
      var maxTiers = card.maxScore || 5;
      h += '<div class="ibr-rings">';
      for (var ri = 0; ri < maxTiers; ri++) {
        h += '<span class="ibr-ring-dot' + (ri < tierNum ? ' filled' : '') + '"></span>';
      }
      h += '</div>';
    } else if (pStyle === 'badge') {
      h += '<div class="ibr-badge-row">';
      if (isMaxed) {
        h += '<span class="ibr-tier-badge maxed">\u2713 MAX</span>';
      } else if (tierNum > 0) {
        h += '<span class="ibr-tier-badge">Tier ' + tierNum + '</span>';
      } else {
        h += '<span class="ibr-tier-badge" style="color:#f44336;border-color:#5a2a2a;background:#2a1a1a">Not Started</span>';
      }
      h += '</div>';
    } else {
      // Default: bar
      h += '<div class="ibr-sub-bar"><div class="ibr-sub-bar-fill" style="width:' + barPct + '%;background:' + barColor + '"></div></div>';
    }

    // Current value / Max-tier message
    if (isMaxed) {
      h += '<div class="ibr-sub-val" style="color:#4caf50;font-weight:600">\u2705 Max Tier Reached!';
      // Show tier note if the last tier has one
      if (card.tierLabel && card.tierLabel !== 'None') h += ' <span style="font-weight:400;color:#8b8fa3;font-size:10px">(' + esc(card.tierLabel) + ')</span>';
      if (card.nextNote) h += '<div style="font-size:10px;color:#6fcf6f;margin-top:2px">' + esc(card.nextNote) + '</div>';
      h += '</div>';
    } else {
      h += '<div class="ibr-sub-val">' + valStr + unitStr;
      if(card.tierLabel && card.tierLabel !== 'None') h += ' \u00b7 ' + esc(card.tierLabel);
      h += '</div>';
    }
    // Upcoming tiers (only for non-maxed cards)
    if(!isMaxed && card.upcomingTiers && card.upcomingTiers.length > 0){
      h += '<div class="ibr-sub-tiers">';
      var limit = Math.min(card.upcomingTiers.length, 3);
      for(var i=0;i<limit;i++){
        var ut = card.upcomingTiers[i];
        var isParamType = ut.type === 'has_item' || ut.type === 'per_char' || ut.type === 'unlocked';
        h += '<div class="ibr-sub-tier-row">';
        h += '<span class="str-lbl">To reach ' + esc(ut.label) + '</span>';
        if(isParamType && ut.param != null) {
          h += '<span class="str-val">' + esc(String(ut.param)) + '</span>';
        } else if(ut.type === 'unlocked' || ut.type === 'has_item') {
          h += '<span class="str-val" style="color:#ffc107">Unlock this</span>';
        } else {
          h += '<span class="str-val">' + valStr + ' \u2192 ' + ut.threshold.toLocaleString() + unitStr + '</span>';
        }
        h += '</div>';
        // Show tier note as a hint underneath
        if(ut.note){
          h += '<div style="padding:0 10px 3px;font-size:10px;color:#6060a0;line-height:1.3">\uD83D\uDCA1 ' + esc(ut.note) + '</div>';
        }
      }
      h += '</div>';
    }
    h += '</div>';
    return h;
  }

  window.ibrToggleCat = function(hdr){
    var grid = hdr.nextElementSibling;
    if(!grid) return;
    grid.classList.toggle('hidden');
    var arrow = hdr.querySelector('span:last-child');
    if(arrow) arrow.textContent = grid.classList.contains('hidden') ? '\u25BA' : '\u25BC';
  };

  // Generic section toggle (works for world sections, gear, chars)
  window.ibrToggleSection = function(hdr){
    var body = hdr.nextElementSibling;
    if(!body) return;
    body.classList.toggle('hidden');
    hdr.classList.toggle('collapsed');
  };

  window.ibrTogglePrio = function(hdr){
    var body = hdr.nextElementSibling;
    if(!body) return;
    body.classList.toggle('hidden');
    hdr.classList.toggle('collapsed');
  };

  window.ibrToggleAlerts = function(hdr){
    var body = hdr.nextElementSibling;
    if(!body) return;
    body.classList.toggle('hidden');
    hdr.classList.toggle('collapsed');
  };

  window.ibrToggleRecs = function(hdr){
    var body = hdr.nextElementSibling;
    if(!body) return;
    body.classList.toggle('hidden');
    hdr.classList.toggle('collapsed');
  };

  window.ibrToggleSysTips = function(card){
    var tips = card.querySelector('.ibr-sys-tips2');
    var expand = card.querySelector('.ibr-sys-expand');
    if(!tips) return;
    tips.classList.toggle('hidden');
    if(expand){
      var n = tips.querySelectorAll('li').length;
      expand.textContent = tips.classList.contains('hidden') ? '\u25BC ' + n + ' tip' + (n>1?'s':'') + ' \u2014 click to expand' : '\u25B2 collapse';
    }
  };

  window.ibrNavClick = function(pill){
    var pills = document.querySelectorAll('.ibr-nav-pill');
    for(var i=0;i<pills.length;i++) pills[i].classList.remove('active');
    pill.classList.add('active');
  };

  window.ibrToggleMaxed = function(){
    var hide = document.getElementById('ibrHideMaxed').checked;
    var cards = document.querySelectorAll('.ibr-sys[data-score]');
    for(var i=0;i<cards.length;i++){
      if(parseInt(cards[i].getAttribute('data-score')) >= 5) cards[i].style.display = hide ? 'none' : '';
    }
    // Also hide/show sc-maxed sub-cards
    var subCards = document.querySelectorAll('.ibr-sub-card[data-maxed]');
    for(var j=0;j<subCards.length;j++){
      if(subCards[j].getAttribute('data-maxed') === '1') subCards[j].style.display = hide ? 'none' : '';
    }
  };

  // ===== SEARCH CARDS =====
  window.ibrSearchCards = function(query){
    var q = (query||'').toLowerCase().trim();
    var subCards = document.querySelectorAll('.ibr-sub-card[data-label]');
    for(var i=0;i<subCards.length;i++){
      var lbl = subCards[i].getAttribute('data-label') || '';
      subCards[i].style.display = (!q || lbl.indexOf(q) !== -1) ? '' : 'none';
    }
    var sysCards = document.querySelectorAll('.ibr-sys');
    for(var j=0;j<sysCards.length;j++){
      var nameEl = sysCards[j].querySelector('.s-name');
      var name = nameEl ? nameEl.textContent.toLowerCase() : '';
      sysCards[j].style.display = (!q || name.indexOf(q) !== -1) ? '' : 'none';
    }
  };

  // ===== ALMOST THERE / BEHIND ONLY FILTERS =====
  window._ibrAlmostActive = false;
  window.ibrToggleAlmostThere = function(btn){
    window._ibrAlmostActive = !window._ibrAlmostActive;
    btn.classList.toggle('active', window._ibrAlmostActive);
    if(window._ibrBehindActive){ window._ibrBehindActive = false; var bb=document.getElementById('ibrBehindBtn'); if(bb) bb.classList.remove('active'); }
    _ibrApplyFilter();
  };

  window._ibrBehindActive = false;
  window.ibrToggleBehindOnly = function(btn){
    window._ibrBehindActive = !window._ibrBehindActive;
    btn.classList.toggle('active', window._ibrBehindActive);
    if(window._ibrAlmostActive){ window._ibrAlmostActive = false; var ab=document.getElementById('ibrAlmostBtn'); if(ab) ab.classList.remove('active'); }
    _ibrApplyFilter();
  };

  function _ibrApplyFilter(){
    var query = document.getElementById('ibrSearchInput') ? document.getElementById('ibrSearchInput').value.toLowerCase().trim() : '';
    var subCards = document.querySelectorAll('.ibr-sub-card[data-label]');
    for(var i=0;i<subCards.length;i++){
      var sc = subCards[i];
      var lbl = sc.getAttribute('data-label') || '';
      var isBehind = sc.getAttribute('data-behind') === '1';
      var isAlmost = sc.getAttribute('data-almost') === '1';
      var matchQ = !query || lbl.indexOf(query) !== -1;
      var matchF = true;
      if(window._ibrAlmostActive) matchF = isAlmost;
      if(window._ibrBehindActive) matchF = isBehind;
      sc.style.display = (matchQ && matchF) ? '' : 'none';
    }
  }

  // ===== EXPORT REVIEW REPORT =====
  window.ibrExportReport = function(){
    var lines = [];
    lines.push('# Idleon Account Review');
    lines.push('Generated: ' + new Date().toLocaleString());
    lines.push('');
    var kpiEls = document.querySelectorAll('.ibr-kpi');
    if(kpiEls.length > 0){
      lines.push('## Summary');
      for(var i=0;i<kpiEls.length;i++){
        var valEl = kpiEls[i].querySelector('.val');
        var lblEl = kpiEls[i].querySelector('.lbl');
        if(valEl && lblEl) lines.push('- **' + lblEl.textContent + '**: ' + valEl.textContent);
      }
      lines.push('');
    }
    var prioItems = document.querySelectorAll('.ibr-prio-item');
    if(prioItems.length > 0){
      lines.push('## Top Priorities');
      for(var pi=0;pi<prioItems.length;pi++){
        var pNameEl = prioItems[pi].querySelector('.ibr-prio-name');
        var pReasonEl = prioItems[pi].querySelector('.ibr-prio-reason');
        if(pNameEl) lines.push((pi+1) + '. ' + pNameEl.textContent.replace(/[\u2605\u2606]/g,'').trim());
        if(pReasonEl) lines.push('   ' + pReasonEl.textContent);
      }
      lines.push('');
    }
    var worldSecs = document.querySelectorAll('.ibr-world-section');
    for(var wi=0;wi<worldSecs.length;wi++){
      var wHdr = worldSecs[wi].querySelector('.ibr-world-hdr2 .wn');
      if(!wHdr) continue;
      lines.push('## ' + wHdr.textContent);
      var catSecs = worldSecs[wi].querySelectorAll('.ibr-cat-section');
      for(var ci=0;ci<catSecs.length;ci++){
        var catName = catSecs[ci].querySelector('.cat-name');
        if(catName) lines.push('### ' + catName.textContent);
        var scs = catSecs[ci].querySelectorAll('.ibr-sub-card');
        for(var ki=0;ki<scs.length;ki++){
          if(scs[ki].style.display === 'none') continue;
          var scName = scs[ki].querySelector('.sc-name');
          var scVal = scs[ki].querySelector('.ibr-sub-val');
          var maxBadge = scs[ki].querySelector('.sc-max-badge');
          var almostBadge = scs[ki].querySelector('.sc-almost-badge');
          if(!scName) continue;
          var flags = maxBadge ? ' \u2713 MAX' : almostBadge ? ' \u26A1 ' + almostBadge.textContent.replace('\u26A1','').trim() : '';
          var val = scVal ? ' \u2014 ' + scVal.textContent : '';
          lines.push('- ' + scName.textContent.trim() + val + flags);
        }
      }
      lines.push('');
    }
    var md = lines.join('\\n');
    var blob = new Blob([md], {type:'text/markdown'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'idleon-review-' + new Date().toISOString().slice(0,10) + '.md';
    document.body.appendChild(a); a.click();
    setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
  };

  window.ibrToggleAllTips = function(){
    var show = document.getElementById('ibrShowTips').checked;
    var tipLists = document.querySelectorAll('.ibr-sys-tips2');
    var expandBtns = document.querySelectorAll('.ibr-sys-expand');
    for(var i=0;i<tipLists.length;i++){
      if(show) tipLists[i].classList.remove('hidden'); else tipLists[i].classList.add('hidden');
    }
    for(var i=0;i<expandBtns.length;i++){
      var n = expandBtns[i].parentNode.querySelectorAll('.ibr-sys-tips2 li').length;
      expandBtns[i].textContent = show ? '\u25B2 collapse' : '\u25BC ' + n + ' tip' + (n>1?'s':'') + ' \u2014 click to expand';
    }
  };

})();
</script>
`;
}
