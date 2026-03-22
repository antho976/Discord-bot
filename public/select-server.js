/* Select-server page interactions – loaded externally to satisfy CSP & Safe Browsing */
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

  // === SERVER SELECTION WITH ANIMATION (uses data-guild-id) ===
  function selectServer(guildId){
    var cards=document.querySelectorAll('.server-card');
    var clicked=null;
    cards.forEach(function(c){if(c.dataset.guildId===guildId)clicked=c});
    if(clicked){clicked.classList.add('selecting');cards.forEach(function(c){if(c!==clicked)c.style.opacity='0.3'})}
    var csrf=(document.cookie.match(/(?:^|;\s*)_csrf=([^;]*)/)||[])[1]||'';
    setTimeout(function(){
      fetch('/api/select-server',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({guildId:guildId})})
        .then(function(r){return r.json()})
        .then(function(d){if(d.success)window.location.href='/';else{alert(d.error||'Error');if(clicked){clicked.classList.remove('selecting');cards.forEach(function(c){c.style.opacity=''})}}});
    },400);
  }

  // Bind click to all server-card buttons via data-guild-id
  document.querySelectorAll('.server-card[data-guild-id]').forEach(function(card){
    card.addEventListener('click',function(){selectServer(card.dataset.guildId)});
  });

  // === ORB CURSOR REPULSION ===
  var orbs=document.querySelectorAll('.orb');
  document.addEventListener('mousemove',function(e){
    orbs.forEach(function(orb){var rect=orb.getBoundingClientRect(),ox=rect.left+rect.width/2,oy=rect.top+rect.height/2;
    var dx=e.clientX-ox,dy=e.clientY-oy,dist=Math.sqrt(dx*dx+dy*dy);
    if(dist<300){var rep=(300-dist)/300*30;orb.style.transform='translate('+(-dx/dist*rep)+'px,'+(-dy/dist*rep)+'px)'}});
  });

  // === BADGE TRIPLE-CLICK CONFETTI ===
  var badge=document.getElementById('userBadge'),badgeClicks=0,badgeTimer;
  badge.addEventListener('click',function(){
    badgeClicks++;clearTimeout(badgeTimer);badgeTimer=setTimeout(function(){badgeClicks=0},500);
    if(badgeClicks>=3){badgeClicks=0;
      var colors=['#9146ff','#5865f2','#ff6b6b','#43b581','#faa61a','#b388ff'];
      var rect=badge.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
      for(var i=0;i<40;i++){var p=document.createElement('div');p.className='confetti-piece';
        p.style.left=cx+'px';p.style.top=cy+'px';p.style.background=colors[Math.floor(Math.random()*colors.length)];
        p.style.borderRadius=Math.random()>0.5?'50%':'0';
        p.style.setProperty('--tx',(Math.random()-0.5)*300+'px');p.style.setProperty('--ty',-(100+Math.random()*200)+'px');
        p.style.setProperty('--rot',(Math.random()*720)+'deg');p.style.setProperty('--duration',(0.6+Math.random()*0.8)+'s');
        document.body.appendChild(p);setTimeout(function(){p.remove()},1500)}}
  });

  // === ICON DOUBLE-CLICK BOUNCE ===
  var icon=document.getElementById('selectIcon');
  var bounceStyle=document.createElement('style');bounceStyle.textContent='@keyframes iconBounce{0%{transform:scale(1)}30%{transform:scale(1.4) rotate(10deg)}60%{transform:scale(0.9) rotate(-5deg)}100%{transform:scale(1) rotate(0)}}';
  document.head.appendChild(bounceStyle);
  icon.addEventListener('dblclick',function(){
    icon.style.animation='none';icon.offsetHeight;
    icon.style.animation='iconBounce 0.5s cubic-bezier(0.34,1.56,0.64,1)';
    setTimeout(function(){icon.style.animation='iconFloat 3s ease-in-out infinite'},500);
  });

  // === GHOST TEXT (rare ambient: 8% every 20s) ===
  var ghostMsgs=['CHOOSE WISELY','THE SERVERS ARE ALIVE','WELCOME COMMANDER','WHICH REALM CALLS YOU?','ALL SYSTEMS NOMINAL','THEY REMEMBER YOU','POWER LEVEL: MAXIMUM','SELECT YOUR DESTINY','THE BOTS ARE LISTENING','01001000 01001001'];
  setInterval(function(){
    if(Math.random()<0.08){
      var g=document.createElement('div');g.className='ghost-text';g.textContent=ghostMsgs[Math.floor(Math.random()*ghostMsgs.length)];
      g.style.left=Math.random()*80+10+'%';g.style.top=Math.random()*80+10+'%';
      g.style.transform='rotate('+(Math.random()*20-10)+'deg)';
      document.body.appendChild(g);setTimeout(function(){g.remove()},8000);
    }
  },20000);

  // === ALT+MOUSE = CURSOR TRAIL ===
  document.addEventListener('mousemove',function(e){
    if(e.altKey){
      var t=document.createElement('div');t.className='cursor-trail';t.style.left=e.clientX-3+'px';t.style.top=e.clientY-3+'px';
      t.style.background=['rgba(145,70,255,0.7)','rgba(88,101,242,0.7)','rgba(67,181,129,0.7)','rgba(255,107,107,0.7)'][Math.floor(Math.random()*4)];
      document.body.appendChild(t);setTimeout(function(){t.remove()},600);
    }
  });

  // === AURORA BOREALIS (rare: 5% every 30s) ===
  setInterval(function(){
    if(Math.random()<0.05){
      var a=document.createElement('div');a.className='aurora';
      for(var i=0;i<3;i++){var b=document.createElement('div');b.className='aurora-band';a.appendChild(b)}
      document.body.appendChild(a);setTimeout(function(){a.remove()},6000);
    }
  },30000);

  // === AMBIENT SHOOTING STAR (rare: 10% every 45s) ===
  setInterval(function(){
    if(Math.random()<0.1){
      var star=document.createElement('div');star.className='shooting-star';
      star.style.left=Math.random()*60+'%';star.style.top=Math.random()*40+'%';
      star.style.transform='rotate('+(Math.random()*30-15)+'deg)';
      document.body.appendChild(star);setTimeout(function(){star.remove()},800);
    }
  },45000);

  // === RANDOM CARD GLOW PULSE (rare: 12% every 15s) ===
  var allCards=document.querySelectorAll('.server-card');
  if(allCards.length>0){
    setInterval(function(){
      if(Math.random()<0.12){
        var c=allCards[Math.floor(Math.random()*allCards.length)];
        c.classList.add('glow-pulse');setTimeout(function(){c.classList.remove('glow-pulse')},1000);
      }
    },15000);
  }

  // === HOVER COUNTER ===
  var hoverCount=0,hoverBadge=document.createElement('div');hoverBadge.className='hover-count';document.body.appendChild(hoverBadge);
  allCards.forEach(function(card){
    card.addEventListener('mouseenter',function(){
      hoverCount++;
      if(hoverCount>=10){hoverBadge.textContent='Hovers: '+hoverCount;hoverBadge.style.opacity='1';setTimeout(function(){hoverBadge.style.opacity='0'},2000)}
      if(hoverCount===50){hoverBadge.textContent='\u{1F3C6} Hover master: '+hoverCount;hoverBadge.style.color='#faa61a';hoverBadge.style.borderColor='rgba(250,166,26,0.3)';hoverBadge.style.opacity='1';setTimeout(function(){hoverBadge.style.opacity='0'},3000)}
      if(hoverCount===100){hoverBadge.textContent='\u{1F451} Hover legend: '+hoverCount+'!!';hoverBadge.style.color='#ff6b6b';hoverBadge.style.borderColor='rgba(255,107,107,0.3)';hoverBadge.style.opacity='1';
        for(var i=0;i<30;i++){var p=document.createElement('div');p.className='confetti-piece';p.style.left=window.innerWidth/2+'px';p.style.top=window.innerHeight/2+'px';p.style.background=['#9146ff','#5865f2','#ff6b6b','#43b581','#faa61a'][Math.floor(Math.random()*5)];p.style.borderRadius=Math.random()>0.5?'50%':'0';p.style.setProperty('--tx',(Math.random()-0.5)*400+'px');p.style.setProperty('--ty',(Math.random()-0.5)*400+'px');p.style.setProperty('--rot',(Math.random()*720)+'deg');p.style.setProperty('--duration',(0.8+Math.random()*0.6)+'s');document.body.appendChild(p);setTimeout(function(){p.remove()},1500)}}
    });
  });

  // === RAPID CLICK SAME SERVER (7 times) = DISCO MODE ===
  var lastCardId=null,rapidClicks=0,rapidTimer;
  allCards.forEach(function(card){
    card.addEventListener('mousedown',function(e){
      e.stopPropagation();
      var id=card.dataset.guildId;
      if(id===lastCardId){rapidClicks++}else{rapidClicks=1;lastCardId=id}
      clearTimeout(rapidTimer);rapidTimer=setTimeout(function(){rapidClicks=0},800);
      if(rapidClicks>=7){
        rapidClicks=0;
        var colors=['#9146ff','#ff6b6b','#43b581','#faa61a','#5865f2','#ff69b4'];var ci=0;
        var disco=setInterval(function(){
          allCards.forEach(function(c){c.style.borderColor=colors[ci%colors.length];c.style.boxShadow='0 0 15px '+colors[ci%colors.length]+'40'});
          ci++;
        },150);
        setTimeout(function(){clearInterval(disco);allCards.forEach(function(c){c.style.borderColor='';c.style.boxShadow=''})},3000);
      }
    },true);
  });

  // === LOGOUT LINK HOVER 5 TIMES = SAD EMOJI ===
  var logoutLink=document.querySelector('.logout-link'),logoutHovers=0,logoutTimer;
  if(logoutLink){logoutLink.addEventListener('mouseenter',function(){
    logoutHovers++;clearTimeout(logoutTimer);logoutTimer=setTimeout(function(){logoutHovers=0},3000);
    if(logoutHovers>=5){
      logoutHovers=0;var sad=document.createElement('div');
      sad.textContent='\u{1F622}';sad.style.cssText='position:fixed;font-size:50px;pointer-events:none;z-index:200;left:50%;top:50%;transform:translate(-50%,-50%);animation:sadFade 1.5s ease-out forwards';
      var st=document.createElement('style');st.textContent='@keyframes sadFade{0%{transform:translate(-50%,-50%) scale(0)}30%{transform:translate(-50%,-50%) scale(1.3)}60%{transform:translate(-50%,-50%) scale(1)}100%{transform:translate(-50%,-120%) scale(0.5);opacity:0}}';
      document.head.appendChild(st);document.body.appendChild(sad);setTimeout(function(){sad.remove()},1500);
    }
  })}

  // === ICON 5-CLICKS = RANDOM EMOJI ===
  var iconClicks=0,iconTimer;
  var emojis=['\u{1F680}','\u{1F47E}','\u{1F525}','\u{2728}','\u{1F308}','\u{1F3AE}','\u{1F47D}','\u{1F4A5}','\u{1F31F}','\u{1F3B2}'];
  icon.addEventListener('click',function(){
    iconClicks++;clearTimeout(iconTimer);iconTimer=setTimeout(function(){iconClicks=0},600);
    if(iconClicks>=5){iconClicks=0;icon.textContent=emojis[Math.floor(Math.random()*emojis.length)];setTimeout(function(){icon.textContent='\u{1F5A5}\uFE0F'},3000)}
  });

  // === IDLE: CARDS DIM AFTER 45s ===
  var idleTimeout,dimmed=false;
  function dimCards(){dimmed=true;allCards.forEach(function(c,i){c.style.transition='opacity 2s '+i*0.1+'s';c.style.opacity='0.3'})}
  function wakeCards(){if(dimmed){dimmed=false;allCards.forEach(function(c){c.style.transition='opacity 0.3s';c.style.opacity=''})}}
  function resetIdle(){wakeCards();clearTimeout(idleTimeout);idleTimeout=setTimeout(dimCards,45000)}
  document.addEventListener('mousemove',resetIdle);document.addEventListener('keydown',resetIdle);resetIdle();

  // === AUTO-RELOAD if no guilds found ===
  if(document.body.dataset.hasGuilds!=='1'){
    setTimeout(function(){location.reload()},3000);
  }
})();
