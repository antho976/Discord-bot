/* Login page interactions – loaded externally to satisfy CSP & Safe Browsing */
(function(){
  'use strict';

  // === CONSTELLATION CANVAS ===
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

  // === 3D TILT + GLOW ON CARD ===
  var card=document.getElementById('loginCard'),glow=document.getElementById('cardGlow');
  card.addEventListener('mousemove',function(e){
    var rect=card.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;
    var rx=((y-rect.height/2)/(rect.height/2))*-8,ry=((x-rect.width/2)/(rect.width/2))*8;
    card.style.transform='perspective(1000px) rotateX('+rx+'deg) rotateY('+ry+'deg)';
    glow.style.left=x+'px';glow.style.top=y+'px';
  });
  card.addEventListener('mouseleave',function(){card.style.transform='perspective(1000px) rotateX(0) rotateY(0)';});

  // === CLICK RIPPLE ===
  document.addEventListener('click',function(e){
    var r=document.createElement('div');r.className='click-ripple';
    r.style.width=r.style.height='200px';r.style.left=(e.clientX-100)+'px';r.style.top=(e.clientY-100)+'px';
    document.body.appendChild(r);r.addEventListener('animationend',function(){r.remove()});
  });

  // === LOGO CLICK (spin) + TRIPLE CLICK (matrix rain) ===
  var logo=document.getElementById('loginLogo'),logoClicks=0,logoTimer=null;
  logo.addEventListener('click',function(){
    logoClicks++;logo.classList.remove('clicked');void logo.offsetWidth;logo.classList.add('clicked');
    setTimeout(function(){logo.classList.remove('clicked')},600);
    clearTimeout(logoTimer);
    logoTimer=setTimeout(function(){if(logoClicks>=3)startMatrixRain();logoClicks=0},400);
  });

  // === STATUS BAR GLITCH (easter egg) ===
  var sb=document.getElementById('statusBar');
  sb.addEventListener('mouseenter',function(){sb.classList.add('glitch');setTimeout(function(){sb.classList.remove('glitch')},900)});

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

  // === KONAMI CODE (easter egg: EPIC fireworks) ===
  var konamiCode=[38,38,40,40,37,39,37,39,66,65],konamiIdx=0,konamiProgress=null;
  document.addEventListener('keydown',function(e){
    if(e.keyCode===konamiCode[konamiIdx]){
      konamiIdx++;
      if(!konamiProgress){konamiProgress=document.createElement('div');konamiProgress.style.cssText='position:fixed;bottom:10px;left:50%;transform:translateX(-50%);z-index:200;font-size:10px;color:rgba(145,70,255,0.3);font-family:monospace;pointer-events:none;transition:opacity 0.3s';document.body.appendChild(konamiProgress)}
      konamiProgress.textContent='\u2588'.repeat(konamiIdx)+'\u2591'.repeat(10-konamiIdx);konamiProgress.style.opacity='1';
      if(konamiIdx===konamiCode.length){konamiIdx=0;konamiProgress.style.opacity='0';setTimeout(function(){if(konamiProgress){konamiProgress.remove();konamiProgress=null}},300);launchEpicFireworks()}
    }else{konamiIdx=0;if(konamiProgress){konamiProgress.style.opacity='0'}}
  });

  function launchEpicFireworks(){
    var W=window.innerWidth,H=window.innerHeight;
    var colors=['#9146ff','#5865f2','#ff6b6b','#43b581','#faa61a','#b388ff','#ff69b4','#00d4ff','#ff4500','#ffd700'];

    var flash=document.createElement('div');flash.className='konami-flash';document.body.appendChild(flash);setTimeout(function(){flash.remove()},400);
    document.body.classList.add('konami-shake');setTimeout(function(){document.body.classList.remove('konami-shake')},500);

    var ring=document.createElement('div');ring.className='konami-ring';ring.style.left=W/2+'px';ring.style.top=H/2+'px';ring.style.marginLeft='-0px';ring.style.marginTop='-0px';document.body.appendChild(ring);setTimeout(function(){ring.remove()},1200);

    setTimeout(function(){
      var txt=document.createElement('div');txt.className='konami-text';txt.textContent='KONAMI';document.body.appendChild(txt);setTimeout(function(){txt.remove()},2500);
    },200);

    for(var wave=0;wave<12;wave++){(function(w){setTimeout(function(){
      var cx=W*0.15+Math.random()*W*0.7,cy=H*0.1+Math.random()*H*0.5;
      var r=document.createElement('div');r.className='konami-ring';r.style.left=cx+'px';r.style.top=cy+'px';r.style.borderColor=colors[w%colors.length]+'cc';
      document.body.appendChild(r);setTimeout(function(){r.remove()},1200);
      for(var i=0;i<40;i++){
        var s=document.createElement('div');s.className='firework large';
        var angle=(Math.PI*2/40)*i+Math.random()*0.2,dist=80+Math.random()*120;
        var col=colors[Math.floor(Math.random()*colors.length)];
        s.style.left=cx+'px';s.style.top=cy+'px';s.style.background=col;s.style.color=col;
        s.style.setProperty('--tx',Math.cos(angle)*dist+'px');s.style.setProperty('--ty',Math.sin(angle)*dist+'px');
        s.style.animation='fireworkBurstSlow '+(0.8+Math.random()*0.6)+'s ease-out forwards';
        document.body.appendChild(s);setTimeout(function(){s.remove()},1400);
      }
      for(var t=0;t<20;t++){(function(t){setTimeout(function(){
        var ts=document.createElement('div');ts.className='firework trail';
        var ta=(Math.PI*2/20)*t+Math.random()*0.5,td=40+Math.random()*60;
        ts.style.left=cx+'px';ts.style.top=cy+'px';ts.style.background=colors[Math.floor(Math.random()*colors.length)];
        ts.style.setProperty('--tx',Math.cos(ta)*td+'px');ts.style.setProperty('--ty',Math.sin(ta)*td+'px');
        ts.style.animation='fireworkBurst 0.5s ease-out forwards';
        document.body.appendChild(ts);setTimeout(function(){ts.remove()},500);
      },100+t*15)})(t)}
    },w<3?w*300:800+w*350)})(wave)}

    setTimeout(function(){
      var f2=document.createElement('div');f2.className='konami-flash';f2.style.background='rgba(250,166,26,0.3)';document.body.appendChild(f2);setTimeout(function(){f2.remove()},400);
      document.body.classList.add('konami-shake');setTimeout(function(){document.body.classList.remove('konami-shake')},500);
      for(var g=0;g<80;g++){(function(g){setTimeout(function(){
        var s=document.createElement('div');s.className='firework large';
        s.style.left=Math.random()*W+'px';s.style.top='-10px';
        s.style.background=Math.random()>0.3?'#ffd700':'#faa61a';s.style.color='#ffd700';
        s.style.setProperty('--tx',(Math.random()-0.5)*100+'px');s.style.setProperty('--ty',(H*0.5+Math.random()*H*0.5)+'px');
        s.style.animation='fireworkBurstSlow '+(1+Math.random()*1)+'s ease-in forwards';
        document.body.appendChild(s);setTimeout(function(){s.remove()},2000);
      },g*25)})(g)}
    },4500);

    setTimeout(function(){
      for(var r=0;r<3;r++){(function(r){setTimeout(function(){
        var ring=document.createElement('div');ring.className='konami-ring';
        ring.style.left=W/2+'px';ring.style.top=H/2+'px';
        ring.style.borderColor=['#ffd700','#9146ff','#ff6b6b'][r];
        document.body.appendChild(ring);setTimeout(function(){ring.remove()},1200);
      },r*200)})(r)}
    },5500);
  }

  // === SHOOTING STARS (5 rapid background clicks) ===
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

  // === ERROR SHAKE (read from data attribute) ===
  if(document.body.dataset.hasError==='1'){
    card.classList.add('shake');card.style.boxShadow='0 20px 60px rgba(0,0,0,0.4),0 0 40px rgba(255,77,77,0.15)';
    setTimeout(function(){card.classList.remove('shake');card.style.boxShadow=''},600);
  }

  // === BUTTON MAGNETIC EFFECT ===
  var loginBtn=document.getElementById('loginBtn');
  card.addEventListener('mousemove',function(e){
    var rect=loginBtn.getBoundingClientRect(),bx=rect.left+rect.width/2,by=rect.top+rect.height/2;
    var dx=e.clientX-bx,dy=e.clientY-by,dist=Math.sqrt(dx*dx+dy*dy);
    if(dist<100){var pull=(100-dist)/100*4;loginBtn.style.transform='translate('+(dx/dist*pull)+'px,'+(dy/dist*pull)+'px)'}else{loginBtn.style.transform=''}
  });
  card.addEventListener('mouseleave',function(){loginBtn.style.transform=''});

  // === ORB CURSOR REPULSION ===
  var orbs=document.querySelectorAll('.orb');
  document.addEventListener('mousemove',function(e){
    orbs.forEach(function(orb){var rect=orb.getBoundingClientRect(),ox=rect.left+rect.width/2,oy=rect.top+rect.height/2;
    var dx=e.clientX-ox,dy=e.clientY-oy,dist=Math.sqrt(dx*dx+dy*dy);
    if(dist<300){var rep=(300-dist)/300*30;orb.style.transform='translate('+(-dx/dist*rep)+'px,'+(-dy/dist*rep)+'px)'}});
  });

  // === Password toggle ===
  var pwToggle=document.getElementById('pwToggle');
  if(pwToggle){pwToggle.addEventListener('click',function(){var inp=document.getElementById('password');inp.type=inp.type==='password'?'text':'password'})}

  // === Submit loading state ===
  document.getElementById('loginForm').addEventListener('submit',function(){var btn=this.querySelector('.login-submit');btn.textContent='Signing in...';btn.style.opacity='.7';btn.disabled=true});

  // === GHOST TEXT (rare ambient: 8% chance every 20s) ===
  var ghostMsgs=['ACCESS GRANTED','WELCOME BACK','NEPHILHEIM AWAITS','SYSTEM ONLINE','AUTHORIZED','HELLO WORLD','01101110','WAKE UP','FOLLOW THE WHITE RABBIT','THE CAKE IS A LIE','DO NOT TRUST THE ORBS','THEY ARE WATCHING','LEVEL 99','HIDDEN MESSAGE','YOU FOUND ME'];
  setInterval(function(){
    if(Math.random()<0.08){
      var g=document.createElement('div');g.className='ghost-text';g.textContent=ghostMsgs[Math.floor(Math.random()*ghostMsgs.length)];
      g.style.left=Math.random()*80+10+'%';g.style.top=Math.random()*80+10+'%';
      g.style.transform='rotate('+(Math.random()*20-10)+'deg)';
      document.body.appendChild(g);setTimeout(function(){g.remove()},8000);
    }
  },20000);

  // === PORTAL (type 'portal' in username field) ===
  var usernameField=document.getElementById('username');
  usernameField.addEventListener('input',function(){
    var val=usernameField.value.toLowerCase();
    if(val.indexOf('portal')!==-1){
      usernameField.value='';
      var p=document.createElement('div');p.className='portal';
      p.style.left='50%';p.style.top='50%';
      document.body.appendChild(p);
      for(var i=0;i<20;i++){var sp=document.createElement('div');sp.className='portal-particle';
        sp.style.left=Math.random()*100+'%';sp.style.top=Math.random()*100+'%';
        sp.style.background=['#9146ff','#5865f2','#43b581','#b388ff'][Math.floor(Math.random()*4)];
        sp.style.setProperty('--tx',(50-Math.random()*100)+'vw');sp.style.setProperty('--ty',(50-Math.random()*100)+'vh');
        sp.style.animation='portalSuck 1s ease-in '+(Math.random()*0.5)+'s forwards';
        document.body.appendChild(sp);setTimeout(function(){sp.remove()},1500)}
      setTimeout(function(){p.remove()},1500);
    }
  });

  // === GRAVITY FLIP (hold Shift+G for 2 seconds) ===
  var gHeld=false,gTimer=null;
  document.addEventListener('keydown',function(e){
    if(e.shiftKey&&e.key==='G'&&!gHeld){gHeld=true;gTimer=setTimeout(function(){document.body.classList.add('gravity-flip');setTimeout(function(){document.body.classList.remove('gravity-flip')},2000)},2000)}
  });
  document.addEventListener('keyup',function(e){if(e.key==='G'){gHeld=false;clearTimeout(gTimer)}});

  // === AURORA BOREALIS (rare: 5% chance every 30s) ===
  setInterval(function(){
    if(Math.random()<0.05){
      var a=document.createElement('div');a.className='aurora';
      for(var i=0;i<3;i++){var b=document.createElement('div');b.className='aurora-band';a.appendChild(b)}
      document.body.appendChild(a);setTimeout(function(){a.remove()},6000);
    }
  },30000);

  // === PASSWORD FIELD HEARTBEAT (3 clicks) ===
  var pwField=document.getElementById('password'),pwClicks=0,pwTimer;
  pwField.addEventListener('click',function(){
    pwClicks++;clearTimeout(pwTimer);pwTimer=setTimeout(function(){pwClicks=0},600);
    if(pwClicks>=3){pwClicks=0;card.classList.add('heartbeat');setTimeout(function(){card.classList.remove('heartbeat')},800)}
  });

  // === ALT+MOUSE = CURSOR TRAIL ===
  document.addEventListener('mousemove',function(e){
    if(e.altKey){
      var t=document.createElement('div');t.className='cursor-trail';t.style.left=e.clientX-3+'px';t.style.top=e.clientY-3+'px';
      t.style.background=['rgba(145,70,255,0.7)','rgba(88,101,242,0.7)','rgba(67,181,129,0.7)','rgba(255,107,107,0.7)'][Math.floor(Math.random()*4)];
      document.body.appendChild(t);setTimeout(function(){t.remove()},600);
    }
  });

  // === RARE GLITCH ON CARD HOVER (2% chance) ===
  card.addEventListener('mouseenter',function(){
    if(Math.random()<0.02){card.classList.add('glitch-card');setTimeout(function(){card.classList.remove('glitch-card')},300)}
  });

  // === TYPE 'nephilheim' IN PASSWORD = RAINBOW LOGO ===
  pwField.addEventListener('input',function(){
    if(pwField.value.toLowerCase().indexOf('nephilheim')!==-1){
      logo.classList.add('rainbow');setTimeout(function(){logo.classList.remove('rainbow')},2000);
    }
  });

  // === AMBIENT SHOOTING STAR (rare: 10% chance every 45s) ===
  setInterval(function(){
    if(Math.random()<0.1){
      var star=document.createElement('div');star.className='shooting-star';
      star.style.left=Math.random()*60+'%';star.style.top=Math.random()*40+'%';
      star.style.transform='rotate('+(Math.random()*30-15)+'deg)';
      document.body.appendChild(star);setTimeout(function(){star.remove()},800);
    }
  },45000);

  // === DOUBLE-CLICK PRIVACY LINK = FLIP TEXT ===
  var privacyLink=document.querySelector('.login-foot a');
  if(privacyLink){privacyLink.addEventListener('dblclick',function(e){
    e.preventDefault();privacyLink.style.transition='transform 0.4s';privacyLink.style.transform='scaleY(-1)';
    setTimeout(function(){privacyLink.style.transform=''},800);
  })}

  // === IDLE DETECTION: LOGO SLEEPS AFTER 60s ===
  var idleTimer,sleeping=false;
  function wake(){if(sleeping){sleeping=false;logo.textContent='\u{1F916}';logo.style.animation='logoPulse 3s ease-in-out infinite'}clearTimeout(idleTimer);idleTimer=setTimeout(goSleep,60000)}
  function goSleep(){sleeping=true;logo.textContent='\u{1F634}';logo.style.animation='none'}
  document.addEventListener('mousemove',wake);document.addEventListener('keydown',wake);wake();

  // === TYPE 'hello' IN USERNAME = WAVING HAND ===
  usernameField.addEventListener('input',function(){
    if(usernameField.value.toLowerCase()==='hello'){
      var wave=document.createElement('div');
      wave.textContent='\u{1F44B}';wave.style.cssText='position:fixed;font-size:60px;z-index:200;pointer-events:none;top:50%;left:50%;transform:translate(-50%,-50%);animation:waveHand 1.5s ease-out forwards';
      var s=document.createElement('style');s.textContent='@keyframes waveHand{0%{transform:translate(-50%,-50%) rotate(0) scale(0)}30%{transform:translate(-50%,-50%) rotate(20deg) scale(1.2)}50%{transform:translate(-50%,-50%) rotate(-15deg) scale(1)}70%{transform:translate(-50%,-50%) rotate(20deg) scale(1)}100%{transform:translate(-50%,-50%) rotate(0) scale(0);opacity:0}}';
      document.head.appendChild(s);document.body.appendChild(wave);setTimeout(function(){wave.remove()},1500);
    }
  });

  // === RANDOM ORBS COLOR SHIFT (rare 3% every 25s) ===
  var orbColors=[['rgba(255,107,107,0.15)','rgba(255,107,107,0.12)','rgba(255,107,107,0.1)'],['rgba(67,181,129,0.15)','rgba(67,181,129,0.12)','rgba(67,181,129,0.1)'],['rgba(250,166,26,0.15)','rgba(250,166,26,0.12)','rgba(250,166,26,0.1)']];
  setInterval(function(){
    if(Math.random()<0.03){
      var c=orbColors[Math.floor(Math.random()*orbColors.length)];
      document.querySelectorAll('.orb').forEach(function(orb,i){orb.style.transition='background 3s';orb.style.background=c[i]||c[0]});
      setTimeout(function(){document.querySelectorAll('.orb').forEach(function(orb){orb.style.background=''})},6000);
    }
  },25000);
})();
