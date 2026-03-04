#!/usr/bin/env python3
"""Replace login page and server select page with interactive redesigns."""

import re

FILE = '/workspaces/Discord-bot/index.js'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")

# ═══════════════════════════════════════════════════════════════
# STEP 1: Replace LOGIN PAGE (lines 2324-2504, 1-indexed)
# ═══════════════════════════════════════════════════════════════

# Find exact start: "const error = req.query.error === '1'" in the login route
login_start = None
for i, line in enumerate(lines):
    if "const error = req.query.error === '1'" in line and i > 2300 and i < 2400:
        login_start = i
        break

# Find exact end: "</html>`);", scanning after login_start
login_end = None
for i in range(login_start, min(login_start + 250, len(lines))):
    if lines[i].strip() == "</html>`);":
        login_end = i
        break

print(f"Login page: lines {login_start+1} to {login_end+1}")

NEW_LOGIN = r'''  const error = req.query.error === '1';
  const created = req.query.created === '1';
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <meta name="description" content="Private administration dashboard for the nephilheim Discord bot. Authorized access only.">
  <meta name="google-site-verification" content="WEZZE-2M8_bPXsA4aYQiylAAjcxctMCQFFxd6_45Qho" />
  <title>nephilheim Bot — Dashboard Login</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#08080c;color:#e0e0e0;font-family:'Segoe UI',Tahoma,Geneva,sans-serif;min-height:100vh;overflow:hidden;position:relative}

    /* Canvas constellation */
    #constellation{position:fixed;top:0;left:0;width:100%;height:100%;z-index:0}

    /* Animated gradient background */
    .bg-gradient{position:fixed;inset:0;background:radial-gradient(ellipse at 20% 50%,rgba(145,70,255,0.12) 0%,transparent 60%),radial-gradient(ellipse at 80% 20%,rgba(88,101,242,0.1) 0%,transparent 60%),radial-gradient(ellipse at 50% 80%,rgba(157,78,221,0.08) 0%,transparent 60%),#08080c;z-index:0}

    /* Interactive orbs */
    .orb{position:fixed;border-radius:50%;filter:blur(80px);z-index:0;pointer-events:none;transition:transform 0.4s ease-out}
    .orb-1{width:400px;height:400px;background:rgba(145,70,255,0.15);top:-100px;left:-100px;animation:orbFloat 18s ease-in-out infinite}
    .orb-2{width:300px;height:300px;background:rgba(88,101,242,0.12);bottom:-80px;right:-80px;animation:orbFloat 22s ease-in-out infinite reverse}
    .orb-3{width:200px;height:200px;background:rgba(157,78,221,0.1);top:50%;left:60%;animation:orbFloat 25s ease-in-out infinite 3s}
    @keyframes orbFloat{0%,100%{transform:translate(0,0) scale(1)}25%{transform:translate(40px,-30px) scale(1.05)}50%{transform:translate(-20px,40px) scale(0.95)}75%{transform:translate(30px,20px) scale(1.02)}}

    /* Grid overlay */
    .grid-overlay{position:fixed;inset:0;background-image:linear-gradient(rgba(145,70,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(145,70,255,0.03) 1px,transparent 1px);background-size:60px 60px;z-index:0;pointer-events:none}

    /* Click ripple */
    .click-ripple{position:fixed;border-radius:50%;border:1px solid rgba(145,70,255,0.5);transform:scale(0);animation:rippleExpand 0.8s ease-out forwards;pointer-events:none;z-index:1}
    @keyframes rippleExpand{0%{transform:scale(0);opacity:1}100%{transform:scale(1);opacity:0}}

    /* Login wrapper */
    .login-wrapper{position:relative;z-index:10;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:20px;perspective:1200px}

    /* Login card */
    .login-card{background:rgba(22,22,30,0.75);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid rgba(145,70,255,0.15);border-radius:20px;padding:44px 40px 36px;width:420px;max-width:100%;position:relative;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.4),0 0 40px rgba(145,70,255,0.05);transform-style:preserve-3d;transition:box-shadow 0.3s ease;animation:cardEntrance 0.8s cubic-bezier(0.16,1,0.3,1) both}
    @keyframes cardEntrance{0%{opacity:0;transform:translateY(40px) rotateX(10deg) scale(0.95)}100%{opacity:1;transform:translateY(0) rotateX(0) scale(1)}}

    /* Dynamic glow following cursor */
    .card-glow{position:absolute;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,rgba(145,70,255,0.3) 0%,transparent 70%);pointer-events:none;transition:opacity 0.3s;opacity:0;z-index:0;transform:translate(-50%,-50%)}
    .login-card:hover .card-glow{opacity:1}

    /* Top shimmer line */
    .login-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#9146ff,#5865f2,#9146ff,transparent);background-size:200% 100%;animation:shimmerLine 3s linear infinite}
    @keyframes shimmerLine{0%{background-position:200% 0}100%{background-position:-200% 0}}

    /* Logo */
    .login-logo{font-size:52px;text-align:center;margin-bottom:6px;cursor:pointer;user-select:none;position:relative;z-index:2;animation:logoPulse 3s ease-in-out infinite;transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1),filter 0.3s}
    .login-logo:hover{transform:scale(1.15) rotate(5deg);filter:brightness(1.2)}
    .login-logo.clicked{animation:logoSpin 0.6s cubic-bezier(0.34,1.56,0.64,1)}
    .login-logo.rainbow{animation:logoRainbow 2s linear;filter:saturate(2) brightness(1.3)}
    @keyframes logoPulse{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
    @keyframes logoSpin{0%{transform:scale(1) rotate(0)}40%{transform:scale(1.3) rotate(360deg)}70%{transform:scale(0.9) rotate(380deg)}100%{transform:scale(1) rotate(360deg)}}
    @keyframes logoRainbow{0%{filter:hue-rotate(0deg) saturate(2) brightness(1.3)}100%{filter:hue-rotate(360deg) saturate(2) brightness(1.3)}}

    /* Title */
    .login-title{text-align:center;margin-bottom:24px;position:relative;z-index:2}
    .login-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(145,70,255,0.15);border:1px solid rgba(145,70,255,0.25);color:#b388ff;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;padding:4px 14px;border-radius:20px;margin-bottom:14px}
    .login-badge::before{content:'';width:6px;height:6px;background:#b388ff;border-radius:50%;animation:badgeDot 2s ease-in-out infinite}
    @keyframes badgeDot{0%,100%{opacity:1}50%{opacity:0.3}}
    .login-title h1{color:#fff;font-size:26px;font-weight:700;margin:0 0 6px;letter-spacing:-0.3px}
    .login-title p{color:#8b8fa3;font-size:13px;margin:0}

    /* Status bar (glitch easter egg on hover) */
    .status-bar{display:flex;align-items:center;justify-content:center;gap:8px;padding:8px 16px;background:rgba(255,255,255,0.03);border-radius:8px;margin-bottom:24px;font-size:12px;color:#8b8fa3;cursor:default;position:relative;z-index:2;transition:all 0.3s}
    .status-bar:hover{background:rgba(255,255,255,0.06)}
    .status-bar.glitch{animation:glitchText 0.3s steps(2) 3}
    @keyframes glitchText{0%{transform:translate(0);filter:none}25%{transform:translate(-2px,1px);filter:hue-rotate(90deg)}50%{transform:translate(2px,-1px);filter:hue-rotate(180deg)}75%{transform:translate(-1px,-1px);filter:hue-rotate(270deg)}100%{transform:translate(0);filter:none}}
    .status-dot{width:7px;height:7px;border-radius:50%;background:#43b581;animation:statusPulse 2s ease-in-out infinite}
    @keyframes statusPulse{0%,100%{box-shadow:0 0 0 0 rgba(67,181,129,0.4)}50%{box-shadow:0 0 0 6px rgba(67,181,129,0)}}

    /* Alerts */
    .login-alert{padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:18px;animation:alertSlide 0.4s cubic-bezier(0.16,1,0.3,1);position:relative;z-index:2}
    @keyframes alertSlide{0%{opacity:0;transform:translateY(-10px)}100%{opacity:1;transform:translateY(0)}}
    .login-alert-error{background:rgba(255,77,77,0.12);border:1px solid rgba(255,77,77,0.25);color:#ff6b6b}
    .login-alert-success{background:rgba(67,181,129,0.12);border:1px solid rgba(67,181,129,0.25);color:#43b581}

    /* Form fields */
    .field{margin-bottom:18px;position:relative;z-index:2}
    .field label{display:block;font-size:12px;font-weight:600;color:#b0b3c5;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px}
    .input-wrap{position:relative;display:flex;align-items:center;transition:transform 0.2s}
    .input-wrap:focus-within{transform:translateX(2px)}
    .input-icon{position:absolute;left:14px;font-size:14px;z-index:1;transition:transform 0.3s}
    .input-wrap:focus-within .input-icon{transform:scale(1.2) rotate(-10deg)}
    .field input{width:100%;padding:12px 14px 12px 40px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:#e0e0e0;font-size:14px;outline:none;transition:all 0.3s}
    .field input:focus{border-color:#9146ff;box-shadow:0 0 0 3px rgba(145,70,255,0.15),0 0 20px rgba(145,70,255,0.1);background:rgba(255,255,255,0.07)}
    .field input::placeholder{color:#4a4d5e}
    .pw-toggle{position:absolute;right:10px;background:none;border:none;cursor:pointer;font-size:14px;padding:4px;opacity:0.5;transition:all 0.3s}
    .pw-toggle:hover{opacity:1;transform:scale(1.2)}

    /* Submit button */
    .login-submit{width:100%;padding:13px;background:linear-gradient(135deg,#9146ff 0%,#5865f2 100%);color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;transition:all 0.3s;position:relative;overflow:hidden;z-index:2;letter-spacing:0.3px}
    .login-submit:hover{transform:translateY(-2px);box-shadow:0 8px 25px rgba(145,70,255,0.35)}
    .login-submit:active{transform:translateY(0) scale(0.98)}
    .login-submit::before{content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent);transition:left 0.5s}
    .login-submit:hover::before{left:100%}

    /* Card shake on error */
    .login-card.shake{animation:cardShake 0.5s cubic-bezier(0.36,0.07,0.19,0.97)}
    @keyframes cardShake{0%,100%{transform:translateX(0)}10%,50%,90%{transform:translateX(-4px)}30%,70%{transform:translateX(4px)}20%,60%{transform:translateX(-2px)}40%,80%{transform:translateX(2px)}}

    /* Footer */
    .login-foot{text-align:center;margin-top:20px;position:relative;z-index:2}
    .login-foot a{color:#5a5d72;font-size:12px;text-decoration:none;transition:color 0.3s}
    .login-foot a:hover{color:#9146ff}
    .login-notice{text-align:center;color:#3a3d50;font-size:11px;margin-top:20px;position:relative;z-index:2}

    /* Shooting stars (easter egg: 5 rapid bg clicks) */
    .shooting-star{position:fixed;width:80px;height:1px;background:linear-gradient(90deg,rgba(145,70,255,0.8),transparent);z-index:5;animation:shootingStar 0.8s ease-out forwards;pointer-events:none}
    @keyframes shootingStar{0%{transform:translateX(0) scaleX(1);opacity:1}100%{transform:translateX(300px) scaleX(0.3);opacity:0}}

    /* Fireworks (Konami code easter egg) */
    .firework{position:fixed;width:4px;height:4px;border-radius:50%;z-index:100;pointer-events:none}
    @keyframes fireworkBurst{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(var(--tx),var(--ty)) scale(0);opacity:0}}

    /* Matrix rain (triple-click logo easter egg) */
    #matrixCanvas{position:fixed;top:0;left:0;width:100%;height:100%;z-index:50;pointer-events:none;opacity:0;transition:opacity 0.3s}
    #matrixCanvas.active{opacity:0.7}

    /* Responsive */
    @media(max-width:480px){
      .login-card{padding:32px 24px 28px;margin:0 10px}
      .login-title h1{font-size:22px}
      .login-logo{font-size:44px}
    }
  </style>
</head>
<body>
  <div class="bg-gradient"></div>
  <div class="orb orb-1"></div>
  <div class="orb orb-2"></div>
  <div class="orb orb-3"></div>
  <div class="grid-overlay"></div>
  <canvas id="constellation"></canvas>
  <canvas id="matrixCanvas"></canvas>

  <div class="login-wrapper">
    <div class="login-card" id="loginCard">
      <div class="card-glow" id="cardGlow"></div>
      <div class="login-logo" id="loginLogo">\u{1F916}</div>
      <div class="login-title">
        <span class="login-badge">Dashboard</span>
        <h1>nephilheim Bot</h1>
        <p>Authorized access only</p>
      </div>

      <div class="status-bar" id="statusBar">
        <span class="status-dot"></span>
        <span class="status-text">Systems operational</span>
      </div>

      \${error ? '<div class="login-alert login-alert-error">\u26A0\uFE0F Invalid username or password.</div>' : ''}
      \${created ? '<div class="login-alert login-alert-success">\u2705 Account created! Please sign in.</div>' : ''}

      <form method="POST" action="/auth" id="loginForm">
        <div class="field">
          <label for="username">Username</label>
          <div class="input-wrap">
            <span class="input-icon">\u{1F464}</span>
            <input type="text" id="username" name="username" placeholder="Enter your username" required autofocus autocomplete="username">
          </div>
        </div>
        <div class="field">
          <label for="password">Password</label>
          <div class="input-wrap">
            <span class="input-icon">\u{1F512}</span>
            <input type="password" id="password" name="password" placeholder="Enter your password" required autocomplete="current-password">
            <button type="button" class="pw-toggle" onclick="togglePw()" tabindex="-1" title="Toggle password visibility">\u{1F441}\uFE0F</button>
          </div>
        </div>
        <button type="submit" class="login-submit" id="loginBtn">
          Sign In \u2192
        </button>
      </form>

      <div class="login-foot"><a href="/privacy">Privacy Policy</a></div>
    </div>
    <div class="login-notice">Private administration panel \u2014 nephilheim Discord community bot</div>
  </div>

  <script>
    // === CONSTELLATION CANVAS ===
    (function(){
      var canvas=document.getElementById('constellation'),ctx=canvas.getContext('2d');
      var w,h,mouse={x:-1000,y:-1000},nodes=[];
      function resize(){w=canvas.width=window.innerWidth;h=canvas.height=window.innerHeight}
      resize();window.addEventListener('resize',resize);
      for(var i=0;i<80;i++){nodes.push({x:Math.random()*w,y:Math.random()*h,vx:(Math.random()-0.5)*0.5,vy:(Math.random()-0.5)*0.5,r:1+Math.random()*2,a:0.15+Math.random()*0.35})}
      document.addEventListener('mousemove',function(e){mouse.x=e.clientX;mouse.y=e.clientY});
      document.addEventListener('mouseleave',function(){mouse.x=-1000;mouse.y=-1000});
      function loop(){
        ctx.clearRect(0,0,w,h);
        for(var i=0;i<nodes.length;i++){
          var n=nodes[i];n.x+=n.vx;n.y+=n.vy;
          if(n.x<0||n.x>w)n.vx*=-1;if(n.y<0||n.y>h)n.vy*=-1;
          var dx=mouse.x-n.x,dy=mouse.y-n.y,dist=Math.sqrt(dx*dx+dy*dy);
          if(dist<200){var f=(200-dist)/200*0.02;n.vx+=dx*f*0.01;n.vy+=dy*f*0.01}
          n.vx*=0.99;n.vy*=0.99;
          var al=dist<200?n.a+(1-dist/200)*0.5:n.a,gl=dist<150;
          ctx.beginPath();ctx.arc(n.x,n.y,gl?n.r*1.5:n.r,0,Math.PI*2);ctx.fillStyle='rgba(145,70,255,'+al+')';ctx.fill();
          if(gl){ctx.beginPath();ctx.arc(n.x,n.y,n.r*4,0,Math.PI*2);ctx.fillStyle='rgba(145,70,255,'+(al*0.2)+')';ctx.fill()}
          for(var j=i+1;j<nodes.length;j++){var n2=nodes[j],dx2=n.x-n2.x,dy2=n.y-n2.y,d=Math.sqrt(dx2*dx2+dy2*dy2);if(d<150){ctx.beginPath();ctx.moveTo(n.x,n.y);ctx.lineTo(n2.x,n2.y);ctx.strokeStyle='rgba(145,70,255,'+((1-d/150)*0.15)+')';ctx.lineWidth=0.5;ctx.stroke()}}
          if(dist<200){ctx.beginPath();ctx.moveTo(n.x,n.y);ctx.lineTo(mouse.x,mouse.y);ctx.strokeStyle='rgba(145,70,255,'+((1-dist/200)*0.3)+')';ctx.lineWidth=0.8;ctx.stroke()}
        }
        requestAnimationFrame(loop);
      }
      loop();
    })();

    // === 3D TILT + GLOW ON CARD ===
    (function(){
      var card=document.getElementById('loginCard'),glow=document.getElementById('cardGlow');
      card.addEventListener('mousemove',function(e){
        var rect=card.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;
        var rx=((y-rect.height/2)/(rect.height/2))*-8,ry=((x-rect.width/2)/(rect.width/2))*8;
        card.style.transform='perspective(1000px) rotateX('+rx+'deg) rotateY('+ry+'deg)';
        glow.style.left=x+'px';glow.style.top=y+'px';
      });
      card.addEventListener('mouseleave',function(){card.style.transform='perspective(1000px) rotateX(0) rotateY(0)';});
    })();

    // === CLICK RIPPLE ===
    document.addEventListener('click',function(e){
      var r=document.createElement('div');r.className='click-ripple';
      r.style.width=r.style.height='200px';r.style.left=(e.clientX-100)+'px';r.style.top=(e.clientY-100)+'px';
      document.body.appendChild(r);r.addEventListener('animationend',function(){r.remove()});
    });

    // === LOGO CLICK (spin) + TRIPLE CLICK (matrix rain) ===
    (function(){
      var logo=document.getElementById('loginLogo'),clicks=0,timer=null;
      logo.addEventListener('click',function(){
        clicks++;logo.classList.remove('clicked');void logo.offsetWidth;logo.classList.add('clicked');
        setTimeout(function(){logo.classList.remove('clicked')},600);
        clearTimeout(timer);
        timer=setTimeout(function(){if(clicks>=3)startMatrixRain();clicks=0},400);
      });
    })();

    // === STATUS BAR GLITCH (easter egg) ===
    (function(){
      var sb=document.getElementById('statusBar');
      sb.addEventListener('mouseenter',function(){sb.classList.add('glitch');setTimeout(function(){sb.classList.remove('glitch')},900)});
    })();

    // === MATRIX RAIN (easter egg) ===
    function startMatrixRain(){
      var mc=document.getElementById('matrixCanvas'),mctx=mc.getContext('2d');
      mc.width=window.innerWidth;mc.height=window.innerHeight;mc.classList.add('active');
      var chars='NEPHILHEIM01\u30A2\u30A4\u30A6\u30A8\u30AA\u30AB\u30AD\u30AF\u30B1\u30B3\u30B5\u30B7\u30B9\u30BB\u30BD>',fs=14,cols=Math.floor(mc.width/fs),drops=Array(cols).fill(1);
      var iv=setInterval(function(){
        mctx.fillStyle='rgba(0,0,0,0.05)';mctx.fillRect(0,0,mc.width,mc.height);
        mctx.fillStyle='#9146ff';mctx.font=fs+'px monospace';
        for(var i=0;i<drops.length;i++){var t=chars[Math.floor(Math.random()*chars.length)];mctx.fillText(t,i*fs,drops[i]*fs);if(drops[i]*fs>mc.height&&Math.random()>0.975)drops[i]=0;drops[i]++}
      },40);
      setTimeout(function(){clearInterval(iv);mc.classList.remove('active');setTimeout(function(){mctx.clearRect(0,0,mc.width,mc.height)},300)},3000);
    }

    // === KONAMI CODE (easter egg: fireworks) ===
    (function(){
      var code=[38,38,40,40,37,39,37,39,66,65],idx=0;
      document.addEventListener('keydown',function(e){if(e.keyCode===code[idx]){idx++;if(idx===code.length){idx=0;launchFireworks()}}else{idx=0}});
    })();
    function launchFireworks(){
      var colors=['#9146ff','#5865f2','#ff6b6b','#43b581','#faa61a','#b388ff'];
      for(var f=0;f<5;f++){(function(f){setTimeout(function(){
        var cx=Math.random()*window.innerWidth,cy=Math.random()*window.innerHeight*0.6;
        for(var i=0;i<30;i++){var s=document.createElement('div');s.className='firework';var angle=(Math.PI*2/30)*i,dist=60+Math.random()*80;
        s.style.left=cx+'px';s.style.top=cy+'px';s.style.background=colors[Math.floor(Math.random()*colors.length)];
        s.style.setProperty('--tx',Math.cos(angle)*dist+'px');s.style.setProperty('--ty',Math.sin(angle)*dist+'px');
        s.style.animation='fireworkBurst 0.8s ease-out forwards';document.body.appendChild(s);setTimeout(function(){s.remove()},800)}
      },f*400)})(f)}
    }

    // === SHOOTING STARS (easter egg: 5 rapid background clicks) ===
    (function(){
      var bgClicks=0,bgTimer=null;
      document.addEventListener('click',function(e){
        if(e.target===document.body||e.target.classList.contains('bg-gradient')||e.target.classList.contains('grid-overlay')||e.target.tagName==='CANVAS'){
          bgClicks++;clearTimeout(bgTimer);bgTimer=setTimeout(function(){bgClicks=0},1200);
          if(bgClicks>=5){bgClicks=0;for(var i=0;i<6;i++){(function(i){setTimeout(function(){
            var star=document.createElement('div');star.className='shooting-star';
            star.style.left=Math.random()*window.innerWidth*0.5+'px';star.style.top=Math.random()*window.innerHeight*0.5+'px';
            star.style.transform='rotate('+(Math.random()*30-15)+'deg)';document.body.appendChild(star);setTimeout(function(){star.remove()},800)
          },i*150)})(i)}}
        }
      });
    })();

    // === ERROR SHAKE ===
    \${error ? "(function(){var c=document.getElementById('loginCard');c.classList.add('shake');c.style.boxShadow='0 20px 60px rgba(0,0,0,0.4),0 0 40px rgba(255,77,77,0.15)';setTimeout(function(){c.classList.remove('shake');c.style.boxShadow=''},600)})();" : ""}

    // === BUTTON MAGNETIC EFFECT ===
    (function(){
      var btn=document.getElementById('loginBtn'),card=document.getElementById('loginCard');
      card.addEventListener('mousemove',function(e){
        var rect=btn.getBoundingClientRect(),bx=rect.left+rect.width/2,by=rect.top+rect.height/2;
        var dx=e.clientX-bx,dy=e.clientY-by,dist=Math.sqrt(dx*dx+dy*dy);
        if(dist<100){var pull=(100-dist)/100*4;btn.style.transform='translate('+(dx/dist*pull)+'px,'+(dy/dist*pull)+'px)'}else{btn.style.transform=''}
      });
      card.addEventListener('mouseleave',function(){btn.style.transform=''});
    })();

    // === ORB CURSOR REPULSION ===
    (function(){
      var orbs=document.querySelectorAll('.orb');
      document.addEventListener('mousemove',function(e){
        orbs.forEach(function(orb){var rect=orb.getBoundingClientRect(),ox=rect.left+rect.width/2,oy=rect.top+rect.height/2;
        var dx=e.clientX-ox,dy=e.clientY-oy,dist=Math.sqrt(dx*dx+dy*dy);
        if(dist<300){var rep=(300-dist)/300*30;orb.style.transform='translate('+(-dx/dist*rep)+'px,'+(-dy/dist*rep)+'px)'}});
      });
    })();

    // Password toggle
    function togglePw(){var inp=document.getElementById('password');inp.type=inp.type==='password'?'text':'password'}

    // Submit loading state
    document.getElementById('loginForm').addEventListener('submit',function(){var btn=this.querySelector('.login-submit');btn.textContent='Signing in...';btn.style.opacity='.7';btn.disabled=true});
  </script>
</body>
</html>`);
'''

# ═══════════════════════════════════════════════════════════════
# STEP 2: Replace SERVER SELECT PAGE
# ═══════════════════════════════════════════════════════════════

# Find exact start: "res.send(`<!DOCTYPE html>" after the guildCards join
select_start = None
for i in range(login_end + 10, min(login_end + 300, len(lines))):
    if 'res.send(`<!DOCTYPE html>' in lines[i] and i > login_end + 50:
        select_start = i
        break

# Find exact end: "</html>`);", scanning after select_start
select_end = None
for i in range(select_start, min(select_start + 200, len(lines))):
    if lines[i].strip() == "</html>`);":
        select_end = i
        break

print(f"Server select page: lines {select_start+1} to {select_end+1}")

NEW_SELECT = r'''  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <meta name="google-site-verification" content="WEZZE-2M8_bPXsA4aYQiylAAjcxctMCQFFxd6_45Qho" />
  <title>Select Server</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#08080c;color:#e0e0e0;font-family:'Segoe UI',Tahoma,Geneva,sans-serif;min-height:100vh;overflow:hidden;position:relative}

    /* Canvas constellation */
    #constellation{position:fixed;top:0;left:0;width:100%;height:100%;z-index:0}
    .bg-gradient{position:fixed;inset:0;background:radial-gradient(ellipse at 20% 50%,rgba(145,70,255,0.12) 0%,transparent 60%),radial-gradient(ellipse at 80% 20%,rgba(88,101,242,0.1) 0%,transparent 60%),radial-gradient(ellipse at 50% 80%,rgba(157,78,221,0.08) 0%,transparent 60%),#08080c;z-index:0}
    .orb{position:fixed;border-radius:50%;filter:blur(80px);z-index:0;pointer-events:none;transition:transform 0.4s ease-out}
    .orb-1{width:400px;height:400px;background:rgba(145,70,255,0.15);top:-100px;left:-100px;animation:orbFloat 18s ease-in-out infinite}
    .orb-2{width:300px;height:300px;background:rgba(88,101,242,0.12);bottom:-80px;right:-80px;animation:orbFloat 22s ease-in-out infinite reverse}
    .orb-3{width:200px;height:200px;background:rgba(157,78,221,0.1);top:50%;left:60%;animation:orbFloat 25s ease-in-out infinite 3s}
    @keyframes orbFloat{0%,100%{transform:translate(0,0) scale(1)}25%{transform:translate(40px,-30px) scale(1.05)}50%{transform:translate(-20px,40px) scale(0.95)}75%{transform:translate(30px,20px) scale(1.02)}}
    .grid-overlay{position:fixed;inset:0;background-image:linear-gradient(rgba(145,70,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(145,70,255,0.03) 1px,transparent 1px);background-size:60px 60px;z-index:0;pointer-events:none}

    /* Click ripple */
    .click-ripple{position:fixed;border-radius:50%;border:1px solid rgba(145,70,255,0.5);transform:scale(0);animation:rippleExpand 0.8s ease-out forwards;pointer-events:none;z-index:1}
    @keyframes rippleExpand{0%{transform:scale(0);opacity:1}100%{transform:scale(1);opacity:0}}

    /* Wrapper */
    .select-wrapper{position:relative;z-index:10;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:20px;perspective:1200px}

    /* Select box glassmorphism */
    .select-box{background:rgba(22,22,30,0.75);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid rgba(145,70,255,0.15);border-radius:20px;padding:40px;width:500px;max-width:100%;position:relative;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.4),0 0 40px rgba(145,70,255,0.05);animation:cardEntrance 0.8s cubic-bezier(0.16,1,0.3,1) both}
    @keyframes cardEntrance{0%{opacity:0;transform:translateY(40px) scale(0.95)}100%{opacity:1;transform:translateY(0) scale(1)}}
    .select-box::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#9146ff,#5865f2,#9146ff,transparent);background-size:200% 100%;animation:shimmerLine 3s linear infinite}
    @keyframes shimmerLine{0%{background-position:200% 0}100%{background-position:-200% 0}}

    /* Header */
    .select-header{text-align:center;margin-bottom:24px}
    .select-icon{font-size:52px;display:block;margin-bottom:8px;cursor:pointer;transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1);animation:iconFloat 3s ease-in-out infinite}
    .select-icon:hover{transform:scale(1.15) rotate(-5deg)}
    @keyframes iconFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
    .select-header h2{color:#fff;font-size:24px;font-weight:700;margin:0 0 6px}
    .select-header p{color:#8b8fa3;font-size:13px;margin:0}

    /* User badge (triple-click = confetti easter egg) */
    .user-badge{text-align:center;margin-bottom:20px;padding:10px 16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:10px;font-size:13px;transition:all 0.3s;cursor:default}
    .user-badge:hover{background:rgba(145,70,255,0.08);border-color:rgba(145,70,255,0.2)}
    .user-badge .tier{font-weight:600;text-transform:uppercase;font-size:11px;letter-spacing:0.5px}

    /* Server list */
    .server-list{display:flex;flex-direction:column;gap:8px;max-height:400px;overflow-y:auto;padding-right:4px}
    .server-list::-webkit-scrollbar{width:6px}
    .server-list::-webkit-scrollbar-thumb{background:#3a3a42;border-radius:3px}
    .server-list::-webkit-scrollbar-track{background:transparent}

    /* Server cards with 3D tilt */
    .server-card{display:flex;align-items:center;gap:14px;width:100%;padding:14px 16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:12px;cursor:pointer;color:#e0e0e0;font-family:inherit;font-size:14px;text-align:left;position:relative;overflow:hidden;transition:all 0.3s cubic-bezier(0.25,0.46,0.45,0.94);transform-style:preserve-3d;opacity:0;animation:cardSlideIn 0.5s cubic-bezier(0.16,1,0.3,1) forwards}
    @keyframes cardSlideIn{0%{opacity:0;transform:translateX(-20px) scale(0.95)}100%{opacity:1;transform:translateX(0) scale(1)}}
    .server-card::before{content:'';position:absolute;top:0;left:0;width:100%;height:100%;background:radial-gradient(circle at var(--mx,50%) var(--my,50%),rgba(145,70,255,0.12) 0%,transparent 60%);opacity:0;transition:opacity 0.3s;pointer-events:none}
    .server-card:hover::before{opacity:1}
    .server-card:hover{background:rgba(145,70,255,0.08);border-color:rgba(145,70,255,0.3);transform:translateY(-2px) scale(1.01);box-shadow:0 8px 25px rgba(0,0,0,0.3),0 0 20px rgba(145,70,255,0.08)}

    /* Card click animation */
    .server-card.selecting{animation:cardSelect 0.4s ease-out forwards;pointer-events:none}
    @keyframes cardSelect{0%{transform:scale(1);box-shadow:0 0 0 rgba(145,70,255,0)}50%{transform:scale(1.03);box-shadow:0 0 30px rgba(145,70,255,0.3);border-color:rgba(145,70,255,0.6)}100%{transform:scale(0.97);opacity:0.7}}

    /* Server icon */
    .server-icon{width:48px;height:48px;border-radius:50%;background:rgba(145,70,255,0.1);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;transition:all 0.3s;border:2px solid transparent}
    .server-card:hover .server-icon{border-color:rgba(145,70,255,0.4);box-shadow:0 0 15px rgba(145,70,255,0.2);transform:rotate(5deg) scale(1.05)}
    .server-icon img{width:100%;height:100%;object-fit:cover}
    .server-icon span{font-size:14px;font-weight:700;color:#9146ff}
    .server-info{flex:1;min-width:0}
    .server-name{font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .server-meta{font-size:12px;color:#8b8fa3;margin-top:2px}
    .server-arrow{color:#8b8fa3;font-size:18px;flex-shrink:0;transition:all 0.3s}
    .server-card:hover .server-arrow{transform:translateX(4px);color:#9146ff}

    /* Logout link */
    .logout-link{display:block;text-align:center;margin-top:20px;color:#8b8fa3;font-size:13px;text-decoration:none;transition:all 0.3s}
    .logout-link:hover{color:#ff6b6b;transform:translateX(-3px)}
    .no-servers{text-align:center;padding:40px 20px;color:#72767d}

    /* Confetti (easter egg) */
    .confetti-piece{position:fixed;width:8px;height:8px;z-index:100;pointer-events:none;animation:confettiFall var(--duration) ease-out forwards}
    @keyframes confettiFall{0%{transform:translate(0,0) rotate(0deg) scale(1);opacity:1}100%{transform:translate(var(--tx),var(--ty)) rotate(var(--rot)) scale(0.5);opacity:0}}

    @media(max-width:520px){.select-box{padding:28px 20px}.select-header h2{font-size:20px}}
  </style>
</head>
<body>
  <div class="bg-gradient"></div>
  <div class="orb orb-1"></div>
  <div class="orb orb-2"></div>
  <div class="orb orb-3"></div>
  <div class="grid-overlay"></div>
  <canvas id="constellation"></canvas>

  <div class="select-wrapper">
    <div class="select-box">
      <div class="select-header">
        <span class="select-icon" id="selectIcon">\u{1F5A5}\uFE0F</span>
        <h2>Select a Server</h2>
        <p>Choose which server you want to manage</p>
      </div>
      <div class="user-badge" id="userBadge">
        Signed in as <b>\${req.userName}</b>
        <span class="tier" style="color:\${TIER_COLORS[req.userTier] || '#8b8fa3'}">(\ ${TIER_LABELS[req.userTier] || req.userTier})</span>
      </div>
      <div class="server-list">
        \${guildCards || '<div class="no-servers">No servers found. Retrying...</div>'}
      </div>
      <a href="/logout" class="logout-link">\u2190 Sign out</a>
    </div>
  </div>

  <script>
    // === CONSTELLATION CANVAS ===
    (function(){
      var canvas=document.getElementById('constellation'),ctx=canvas.getContext('2d');
      var w,h,mouse={x:-1000,y:-1000},nodes=[];
      function resize(){w=canvas.width=window.innerWidth;h=canvas.height=window.innerHeight}
      resize();window.addEventListener('resize',resize);
      for(var i=0;i<80;i++){nodes.push({x:Math.random()*w,y:Math.random()*h,vx:(Math.random()-0.5)*0.5,vy:(Math.random()-0.5)*0.5,r:1+Math.random()*2,a:0.15+Math.random()*0.35})}
      document.addEventListener('mousemove',function(e){mouse.x=e.clientX;mouse.y=e.clientY});
      document.addEventListener('mouseleave',function(){mouse.x=-1000;mouse.y=-1000});
      function loop(){
        ctx.clearRect(0,0,w,h);
        for(var i=0;i<nodes.length;i++){
          var n=nodes[i];n.x+=n.vx;n.y+=n.vy;
          if(n.x<0||n.x>w)n.vx*=-1;if(n.y<0||n.y>h)n.vy*=-1;
          var dx=mouse.x-n.x,dy=mouse.y-n.y,dist=Math.sqrt(dx*dx+dy*dy);
          if(dist<200){var f=(200-dist)/200*0.02;n.vx+=dx*f*0.01;n.vy+=dy*f*0.01}
          n.vx*=0.99;n.vy*=0.99;
          var al=dist<200?n.a+(1-dist/200)*0.5:n.a,gl=dist<150;
          ctx.beginPath();ctx.arc(n.x,n.y,gl?n.r*1.5:n.r,0,Math.PI*2);ctx.fillStyle='rgba(145,70,255,'+al+')';ctx.fill();
          if(gl){ctx.beginPath();ctx.arc(n.x,n.y,n.r*4,0,Math.PI*2);ctx.fillStyle='rgba(145,70,255,'+(al*0.2)+')';ctx.fill()}
          for(var j=i+1;j<nodes.length;j++){var n2=nodes[j],dx2=n.x-n2.x,dy2=n.y-n2.y,d=Math.sqrt(dx2*dx2+dy2*dy2);if(d<150){ctx.beginPath();ctx.moveTo(n.x,n.y);ctx.lineTo(n2.x,n2.y);ctx.strokeStyle='rgba(145,70,255,'+((1-d/150)*0.15)+')';ctx.lineWidth=0.5;ctx.stroke()}}
          if(dist<200){ctx.beginPath();ctx.moveTo(n.x,n.y);ctx.lineTo(mouse.x,mouse.y);ctx.strokeStyle='rgba(145,70,255,'+((1-dist/200)*0.3)+')';ctx.lineWidth=0.8;ctx.stroke()}
        }
        requestAnimationFrame(loop);
      }
      loop();
    })();

    // === CLICK RIPPLE ===
    document.addEventListener('click',function(e){
      var r=document.createElement('div');r.className='click-ripple';
      r.style.width=r.style.height='200px';r.style.left=(e.clientX-100)+'px';r.style.top=(e.clientY-100)+'px';
      document.body.appendChild(r);r.addEventListener('animationend',function(){r.remove()});
    });

    // === SERVER CARD 3D TILT + GLOW ===
    document.querySelectorAll('.server-card').forEach(function(card,i){
      card.style.animationDelay=(i*0.08)+'s';
      card.addEventListener('mousemove',function(e){
        var rect=card.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;
        var rx=((y-rect.height/2)/(rect.height/2))*-5,ry=((x-rect.width/2)/(rect.width/2))*5;
        card.style.transform='perspective(800px) rotateX('+rx+'deg) rotateY('+ry+'deg) translateY(-2px)';
        card.style.setProperty('--mx',(x/rect.width*100)+'%');
        card.style.setProperty('--my',(y/rect.height*100)+'%');
      });
      card.addEventListener('mouseleave',function(){card.style.transform=''});
    });

    // === SERVER SELECTION WITH ANIMATION ===
    function selectServer(guildId){
      var cards=document.querySelectorAll('.server-card');
      var clicked=null;
      cards.forEach(function(c){if(c.getAttribute('onclick')&&c.getAttribute('onclick').indexOf(guildId)!==-1)clicked=c});
      if(clicked){clicked.classList.add('selecting');cards.forEach(function(c){if(c!==clicked)c.style.opacity='0.3'})}
      setTimeout(function(){
        fetch('/api/select-server',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({guildId:guildId})})
          .then(function(r){return r.json()})
          .then(function(d){if(d.success)window.location.href='/';else{alert(d.error||'Error');if(clicked){clicked.classList.remove('selecting');cards.forEach(function(c){c.style.opacity=''})}}});
      },400);
    }

    // === ORB CURSOR REPULSION ===
    (function(){
      var orbs=document.querySelectorAll('.orb');
      document.addEventListener('mousemove',function(e){
        orbs.forEach(function(orb){var rect=orb.getBoundingClientRect(),ox=rect.left+rect.width/2,oy=rect.top+rect.height/2;
        var dx=e.clientX-ox,dy=e.clientY-oy,dist=Math.sqrt(dx*dx+dy*dy);
        if(dist<300){var rep=(300-dist)/300*30;orb.style.transform='translate('+(-dx/dist*rep)+'px,'+(-dy/dist*rep)+'px)'}});
      });
    })();

    // === BADGE TRIPLE-CLICK CONFETTI (easter egg) ===
    (function(){
      var badge=document.getElementById('userBadge'),clicks=0,timer;
      badge.addEventListener('click',function(){
        clicks++;clearTimeout(timer);timer=setTimeout(function(){clicks=0},500);
        if(clicks>=3){clicks=0;
          var colors=['#9146ff','#5865f2','#ff6b6b','#43b581','#faa61a','#b388ff'];
          var rect=badge.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
          for(var i=0;i<40;i++){var p=document.createElement('div');p.className='confetti-piece';
            p.style.left=cx+'px';p.style.top=cy+'px';p.style.background=colors[Math.floor(Math.random()*colors.length)];
            p.style.borderRadius=Math.random()>0.5?'50%':'0';
            p.style.setProperty('--tx',(Math.random()-0.5)*300+'px');p.style.setProperty('--ty',-(100+Math.random()*200)+'px');
            p.style.setProperty('--rot',(Math.random()*720)+'deg');p.style.setProperty('--duration',(0.6+Math.random()*0.8)+'s');
            document.body.appendChild(p);setTimeout(function(){p.remove()},1500)}}
      });
    })();

    // === ICON DOUBLE-CLICK BOUNCE (easter egg) ===
    (function(){
      var icon=document.getElementById('selectIcon');
      var s=document.createElement('style');s.textContent='@keyframes iconBounce{0%{transform:scale(1)}30%{transform:scale(1.4) rotate(10deg)}60%{transform:scale(0.9) rotate(-5deg)}100%{transform:scale(1) rotate(0)}}';
      document.head.appendChild(s);
      icon.addEventListener('dblclick',function(){
        icon.style.animation='none';icon.offsetHeight;
        icon.style.animation='iconBounce 0.5s cubic-bezier(0.34,1.56,0.64,1)';
        setTimeout(function(){icon.style.animation='iconFloat 3s ease-in-out infinite'},500);
      });
    })();

    \${guildCards ? '' : 'setTimeout(function(){location.reload()},3000);'}
  </script>
</body>
</html>`);
'''

# ═══════════════════════════════════════════════════════════════
# APPLY REPLACEMENTS
# ═══════════════════════════════════════════════════════════════

# Replace login page (lines login_start to login_end inclusive)
new_lines = lines[:login_start]
new_lines.append(NEW_LOGIN + '\n')
new_lines.extend(lines[login_end + 1:])

# Recalculate offset
offset = len(new_lines) - len(lines)
print(f"Login replacement offset: {offset} lines")

# Find server select page in new_lines
new_select_start = None
for i in range(login_start + 100, len(new_lines)):
    if 'res.send(`<!DOCTYPE html>' in new_lines[i]:
        # Make sure this is the select-server one, not loading page
        # Check if "Select Server" title is within next 20 lines
        snippet = ''.join(new_lines[i:i+20])
        if 'Select Server' in snippet:
            new_select_start = i
            break

new_select_end = None
for i in range(new_select_start, min(new_select_start + 200, len(new_lines))):
    if new_lines[i].strip() == "</html>`);":
        new_select_end = i
        break

print(f"Server select page (new coords): lines {new_select_start+1} to {new_select_end+1}")

# Replace server select page
final_lines = new_lines[:new_select_start]
final_lines.append(NEW_SELECT + '\n')
final_lines.extend(new_lines[new_select_end + 1:])

with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(final_lines)

print(f"Done! New file has {len(final_lines)} lines (was {len(lines)})")
