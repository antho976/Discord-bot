/**
 * Messaging System Render Tabs
 * Mail/Notifications, Direct Messages, and General Chat
 */

// ====================== NOTIFICATIONS / MAIL TAB ======================
export function renderNotificationsMailTab() {
  return `
<style>
.mail-container{display:grid;grid-template-columns:320px 1fr;height:calc(100vh - 140px);gap:0;border:1px solid var(--border-main);border-radius:12px;overflow:hidden;background:var(--bg-card)}
.mail-sidebar{background:var(--bg-input);border-right:1px solid var(--border-main);display:flex;flex-direction:column}
.mail-sidebar-hdr{padding:14px 16px;border-bottom:1px solid var(--border-main);display:flex;align-items:center;justify-content:space-between}
.mail-sidebar-hdr h3{margin:0;font-size:14px;color:var(--text-primary)}
.mail-filters{display:flex;gap:4px;padding:8px 12px;border-bottom:1px solid var(--border-main)}
.mail-filter-btn{padding:4px 10px;border:1px solid var(--border-input);border-radius:12px;background:none;color:var(--text-secondary);font-size:11px;cursor:pointer;transition:all 0.2s;white-space:nowrap}
.mail-filter-btn:hover{background:var(--bg-hover);color:var(--text-primary);transform:none}
.mail-filter-btn.active{background:var(--accent);color:#fff;border-color:var(--accent);transform:none}
.mail-list{flex:1;overflow-y:auto;padding:4px}
.mail-item{padding:10px 14px;border-radius:8px;cursor:pointer;margin:2px 0;transition:background 0.15s;display:flex;gap:10px;align-items:flex-start;position:relative}
.mail-item:hover{background:var(--bg-hover)}
.mail-item.active{background:var(--accent);background:rgba(91,91,255,0.15)}
.mail-item.unread .mail-item-title{font-weight:700}
.mail-item.unread::before{content:'';position:absolute;left:4px;top:50%;transform:translateY(-50%);width:6px;height:6px;border-radius:50%;background:var(--accent)}
.mail-item-avatar{width:36px;height:36px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:14px;color:#fff;flex-shrink:0}
.mail-item-content{flex:1;min-width:0}
.mail-item-title{font-size:13px;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mail-item-preview{font-size:11px;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
.mail-item-time{font-size:10px;color:var(--text-muted);flex-shrink:0}
.mail-detail{padding:24px;overflow-y:auto;display:flex;flex-direction:column}
.mail-detail-empty{display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-secondary);font-size:14px;flex-direction:column;gap:8px}
.mail-detail-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--border-main)}
.mail-detail-body{flex:1;font-size:13px;color:var(--text-primary);line-height:1.6;white-space:pre-wrap;word-break:break-word}
.mail-compose-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000}
.mail-compose-box{background:var(--bg-card);border-radius:12px;border:1px solid var(--border-main);width:500px;max-width:90vw;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.5)}
.mail-compose-box .hdr{padding:16px;border-bottom:1px solid var(--border-main);display:flex;align-items:center;justify-content:space-between}
.mail-compose-box .body{padding:16px;flex:1;display:flex;flex-direction:column;gap:10px}
.mail-compose-box .ftr{padding:12px 16px;border-top:1px solid var(--border-main);display:flex;justify-content:flex-end;gap:8px}
.notif-badge{background:#ef5350;color:#fff;font-size:9px;font-weight:700;padding:1px 5px;border-radius:8px;margin-left:6px}
@media(max-width:768px){.mail-container{grid-template-columns:1fr;height:auto}.mail-sidebar{max-height:300px}}
</style>

<div class="mail-container">
  <!-- Sidebar: message list -->
  <div class="mail-sidebar">
    <div class="mail-sidebar-hdr">
      <h3>📬 Notifications</h3>
      <div style="display:flex;gap:6px">
        <button onclick="mailMarkAllRead()" title="Mark all read" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:14px;padding:4px;transform:none">✓✓</button>
        <button onclick="mailCompose('notification')" title="New notification" style="background:var(--accent);border:none;color:#fff;cursor:pointer;font-size:11px;padding:4px 10px;border-radius:6px;font-weight:600;transform:none">+ New</button>
      </div>
    </div>
    <div class="mail-filters">
      <button class="mail-filter-btn active" onclick="mailFilterClick(this,'all')">All</button>
      <button class="mail-filter-btn" onclick="mailFilterClick(this,'unread')">Unread</button>
      <button class="mail-filter-btn" onclick="mailFilterClick(this,'system')">System</button>
      <button class="mail-filter-btn" onclick="mailFilterClick(this,'mention')">Mentions</button>
    </div>
    <div class="mail-list" id="mailList">
      <div style="padding:20px;text-align:center;color:var(--text-secondary);font-size:12px">Loading...</div>
    </div>
  </div>
  <!-- Detail view -->
  <div class="mail-detail" id="mailDetail">
    <div class="mail-detail-empty">
      <div style="font-size:36px">📬</div>
      <div>Select a notification to read</div>
    </div>
  </div>
</div>

<div id="mailComposeOverlay" style="display:none"></div>

<script>
(function(){
  var _mails=[], _filter='all', _selectedId=null;

  function loadMail(){
    fetch('/api/messaging/notifications').then(function(r){return r.json()}).then(function(d){
      if(d.success){_mails=d.notifications||[];renderMailList();}
    }).catch(function(){
      document.getElementById('mailList').innerHTML='<div style="padding:20px;text-align:center;color:#ef5350;font-size:12px">Failed to load</div>';
    });
  }

  function renderMailList(){
    var el=document.getElementById('mailList');
    var filtered=_mails;
    if(_filter==='unread')filtered=_mails.filter(function(m){return !m.read;});
    else if(_filter==='system')filtered=_mails.filter(function(m){return m.type==='system';});
    else if(_filter==='mention')filtered=_mails.filter(function(m){return m.type==='mention';});

    if(!filtered.length){el.innerHTML='<div style="padding:20px;text-align:center;color:var(--text-secondary);font-size:12px">No notifications</div>';return;}
    var html='';
    filtered.forEach(function(m){
      var icons={system:'⚙️',mention:'@',message:'✉️',alert:'⚠️',info:'ℹ️'};
      var icon=icons[m.type]||'📩';
      var cls='mail-item'+(m.read?'':' unread')+(_selectedId===m.id?' active':'');
      var time=_timeAgo(m.createdAt);
      html+='<div class="'+cls+'" onclick="mailSelect(\\''+m.id+'\\')"><div class="mail-item-avatar">'+icon+'</div><div class="mail-item-content"><div class="mail-item-title">'+_esc(m.title)+'</div><div class="mail-item-preview">'+_esc(m.preview||m.body.slice(0,60))+'</div></div><div class="mail-item-time">'+time+'</div></div>';
    });
    el.innerHTML=html;
  }

  function showDetail(m){
    var el=document.getElementById('mailDetail');
    var time=new Date(m.createdAt).toLocaleString();
    el.innerHTML='<div class="mail-detail-hdr"><div><div style="font-size:16px;font-weight:700;color:var(--text-primary)">'+_esc(m.title)+'</div><div style="font-size:11px;color:var(--text-secondary);margin-top:2px">From: '+(m.from||'System')+' · '+time+'</div></div><div style="display:flex;gap:6px"><button onclick="mailDelete(\\''+m.id+'\\')\')" style="background:#ef5350;border:none;color:#fff;padding:4px 10px;border-radius:6px;font-size:11px;cursor:pointer;transform:none">🗑️</button></div></div><div class="mail-detail-body">'+_esc(m.body)+'</div>';
  }

  window.mailSelect=function(id){
    _selectedId=id;
    var m=_mails.find(function(x){return x.id===id;});
    if(!m)return;
    if(!m.read){m.read=true;fetch('/api/messaging/notifications/'+id+'/read',{method:'POST'});}
    showDetail(m);
    renderMailList();
  };

  window.mailFilterClick=function(btn,f){
    _filter=f;
    document.querySelectorAll('.mail-filter-btn').forEach(function(b){b.classList.remove('active')});
    btn.classList.add('active');
    renderMailList();
  };

  window.mailMarkAllRead=function(){
    fetch('/api/messaging/notifications/read-all',{method:'POST'}).then(function(r){return r.json()}).then(function(d){
      if(d.success){_mails.forEach(function(m){m.read=true;});renderMailList();}
    });
  };

  window.mailDelete=function(id){
    fetch('/api/messaging/notifications/'+id,{method:'DELETE'}).then(function(r){return r.json()}).then(function(d){
      if(d.success){_mails=_mails.filter(function(m){return m.id!==id;});_selectedId=null;renderMailList();document.getElementById('mailDetail').innerHTML='<div class="mail-detail-empty"><div style="font-size:36px">📬</div><div>Select a notification to read</div></div>';}
    });
  };

  window.mailCompose=function(type){
    document.getElementById('mailComposeOverlay').style.display='flex';
    document.getElementById('mailComposeOverlay').innerHTML='<div class="mail-compose-overlay" onclick="if(event.target===this)mailCloseCompose()"><div class="mail-compose-box"><div class="hdr"><h3 style="margin:0;font-size:15px">✉️ Send Notification</h3><button onclick="mailCloseCompose()" style="background:none;border:none;color:var(--text-secondary);font-size:18px;cursor:pointer;transform:none">✕</button></div><div class="body"><div><label style="font-size:11px;color:var(--text-secondary);display:block;margin-bottom:3px">To (username or "all")</label><input id="mailTo" placeholder="Username or all" style="width:100%;padding:8px 10px;border:1px solid var(--border-input);border-radius:6px;background:var(--bg-input);color:var(--text-primary);font-size:12px"></div><div><label style="font-size:11px;color:var(--text-secondary);display:block;margin-bottom:3px">Title</label><input id="mailTitle" placeholder="Subject" maxlength="120" style="width:100%;padding:8px 10px;border:1px solid var(--border-input);border-radius:6px;background:var(--bg-input);color:var(--text-primary);font-size:12px"></div><div><label style="font-size:11px;color:var(--text-secondary);display:block;margin-bottom:3px">Message</label><textarea id="mailBody" rows="5" maxlength="2000" placeholder="Write your message..." style="width:100%;padding:8px 10px;border:1px solid var(--border-input);border-radius:6px;background:var(--bg-input);color:var(--text-primary);font-size:12px;resize:vertical"></textarea></div></div><div class="ftr"><button onclick="mailCloseCompose()" style="padding:6px 14px;background:var(--bg-input);color:var(--text-primary);border:1px solid var(--border-input);border-radius:6px;font-size:12px;cursor:pointer;transform:none">Cancel</button><button onclick="mailSendNotification()" style="padding:6px 14px;background:var(--accent);color:#fff;border:none;border-radius:6px;font-size:12px;cursor:pointer;font-weight:600;transform:none">Send</button></div></div></div>';
  };

  window.mailCloseCompose=function(){document.getElementById('mailComposeOverlay').style.display='none';document.getElementById('mailComposeOverlay').innerHTML='';};

  window.mailSendNotification=function(){
    var to=document.getElementById('mailTo').value.trim();
    var title=document.getElementById('mailTitle').value.trim();
    var body=document.getElementById('mailBody').value.trim();
    if(!title||!body)return alert('Title and message required');
    fetch('/api/messaging/notifications/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:to||'all',title:title,body:body})})
      .then(function(r){return r.json()}).then(function(d){
        if(d.success){mailCloseCompose();loadMail();}
        else alert(d.error||'Failed to send');
      });
  };

  // Listen for real-time notifications
  if(typeof io!=='undefined'){
    var sock=io();
    sock.on('newNotification',function(n){
      _mails.unshift(n);
      renderMailList();
    });
  }

  function _esc(s){return s?String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'):''}
  function _timeAgo(ts){var s=Math.floor((Date.now()-ts)/1000);if(s<60)return 'now';if(s<3600)return Math.floor(s/60)+'m';if(s<86400)return Math.floor(s/3600)+'h';if(s<604800)return Math.floor(s/86400)+'d';return new Date(ts).toLocaleDateString('en',{month:'short',day:'numeric'});}

  loadMail();
})();
</script>`;
}


// ====================== DIRECT MESSAGES TAB ======================
export function renderDMsTab() {
  return `
<style>
.dm-container{display:grid;grid-template-columns:280px 1fr;height:calc(100vh - 140px);gap:0;border:1px solid var(--border-main);border-radius:12px;overflow:hidden;background:var(--bg-card)}
.dm-convos{background:var(--bg-input);border-right:1px solid var(--border-main);display:flex;flex-direction:column}
.dm-convos-hdr{padding:14px 16px;border-bottom:1px solid var(--border-main);display:flex;align-items:center;justify-content:space-between}
.dm-convos-hdr h3{margin:0;font-size:14px;color:var(--text-primary)}
.dm-search{padding:8px 12px;border-bottom:1px solid var(--border-main)}
.dm-search input{width:100%;padding:8px 10px;border:1px solid var(--border-input);border-radius:8px;background:var(--bg-card);color:var(--text-primary);font-size:12px}
.dm-convo-list{flex:1;overflow-y:auto;padding:4px}
.dm-convo-item{padding:10px 12px;border-radius:8px;cursor:pointer;margin:2px 0;transition:background 0.15s;display:flex;gap:10px;align-items:center}
.dm-convo-item:hover{background:var(--bg-hover)}
.dm-convo-item.active{background:rgba(91,91,255,0.15)}
.dm-convo-item.has-unread .dm-convo-name{font-weight:700}
.dm-convo-avatar{width:40px;height:40px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:16px;color:#fff;flex-shrink:0;overflow:hidden}
.dm-convo-avatar img{width:100%;height:100%;object-fit:cover}
.dm-convo-info{flex:1;min-width:0}
.dm-convo-name{font-size:13px;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dm-convo-last{font-size:11px;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px}
.dm-convo-meta{display:flex;flex-direction:column;align-items:flex-end;gap:2px;flex-shrink:0}
.dm-convo-time{font-size:10px;color:var(--text-muted)}
.dm-unread-dot{width:8px;height:8px;border-radius:50%;background:var(--accent)}
.dm-chat{display:flex;flex-direction:column;height:100%}
.dm-chat-hdr{padding:12px 16px;border-bottom:1px solid var(--border-main);display:flex;align-items:center;gap:10px}
.dm-chat-hdr-name{font-size:14px;font-weight:600;color:var(--text-primary)}
.dm-chat-hdr-status{font-size:11px;color:var(--text-secondary)}
.dm-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:4px}
.dm-msg{display:flex;gap:10px;max-width:80%;animation:dmFadeIn 0.2s ease}
.dm-msg.own{margin-left:auto;flex-direction:row-reverse}
.dm-msg-avatar{width:32px;height:32px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:12px;color:#fff;flex-shrink:0;margin-top:2px;overflow:hidden}
.dm-msg-avatar img{width:100%;height:100%;object-fit:cover}
.dm-msg-bubble{padding:8px 12px;border-radius:12px;font-size:13px;line-height:1.5;max-width:100%;word-break:break-word;white-space:pre-wrap}
.dm-msg:not(.own) .dm-msg-bubble{background:var(--bg-input);color:var(--text-primary);border-top-left-radius:4px}
.dm-msg.own .dm-msg-bubble{background:var(--accent);color:#fff;border-top-right-radius:4px}
.dm-msg-time{font-size:9px;color:var(--text-muted);margin-top:2px}
.dm-msg.own .dm-msg-time{text-align:right}
.dm-input-bar{padding:12px 16px;border-top:1px solid var(--border-main);display:flex;gap:8px;align-items:flex-end}
.dm-input-bar textarea{flex:1;padding:10px 14px;border:1px solid var(--border-input);border-radius:10px;background:var(--bg-input);color:var(--text-primary);font-size:13px;resize:none;min-height:20px;max-height:120px;line-height:1.4;font-family:inherit}
.dm-input-bar textarea:focus{border-color:var(--accent);outline:none}
.dm-send-btn{width:36px;height:36px;border-radius:50%;background:var(--accent);border:none;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;transition:background 0.2s}
.dm-send-btn:hover{background:var(--accent-hover);transform:none}
.dm-empty{display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-secondary);font-size:14px;flex-direction:column;gap:8px}
.dm-day-sep{text-align:center;font-size:10px;color:var(--text-muted);padding:8px 0;position:relative}
.dm-day-sep::before{content:'';position:absolute;left:0;right:0;top:50%;height:1px;background:var(--border-main)}
.dm-day-sep span{background:var(--bg-card);padding:0 12px;position:relative}
@keyframes dmFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@media(max-width:768px){.dm-container{grid-template-columns:1fr;height:auto}.dm-convos{max-height:200px}}
</style>

<div class="dm-container">
  <div class="dm-convos">
    <div class="dm-convos-hdr">
      <h3>💬 Messages</h3>
      <button onclick="dmNewConvo()" style="background:var(--accent);border:none;color:#fff;cursor:pointer;font-size:11px;padding:4px 10px;border-radius:6px;font-weight:600;transform:none">+ New DM</button>
    </div>
    <div class="dm-search"><input id="dmSearchInput" placeholder="Search conversations..." oninput="dmSearchConvos(this.value)"></div>
    <div class="dm-convo-list" id="dmConvoList">
      <div style="padding:20px;text-align:center;color:var(--text-secondary);font-size:12px">Loading...</div>
    </div>
  </div>
  <div class="dm-chat" id="dmChatArea">
    <div class="dm-empty">
      <div style="font-size:48px">💬</div>
      <div>Select a conversation or start a new one</div>
    </div>
  </div>
</div>

<div id="dmNewConvoOverlay" style="display:none"></div>

<script>
(function(){
  var _convos=[], _activeConvo=null, _msgs=[], _myUser=null, _dmSock=null;

  // Get current user
  fetch('/api/accounts/me').then(function(r){return r.json()}).then(function(d){
    if(d.success) _myUser={id:d.id,username:d.username,displayName:d.displayName,customAvatar:d.customAvatar,discordAvatar:d.discordAvatar,discordId:d.discordId};
  });

  function loadConvos(){
    fetch('/api/messaging/dm/conversations').then(function(r){return r.json()}).then(function(d){
      if(d.success){_convos=d.conversations||[];renderConvoList();}
    });
  }

  function renderConvoList(filter){
    var el=document.getElementById('dmConvoList');
    var list=filter?_convos.filter(function(c){return c.otherUser.toLowerCase().indexOf(filter.toLowerCase())>=0;}):_convos;
    if(!list.length){el.innerHTML='<div style="padding:20px;text-align:center;color:var(--text-secondary);font-size:12px">'+(filter?'No results':'No conversations yet')+'</div>';return;}
    var html='';
    list.forEach(function(c){
      var active=_activeConvo&&_activeConvo.id===c.id;
      var cls='dm-convo-item'+(active?' active':'')+(c.unread?' has-unread':'');
      var av=c.otherAvatar?'<img src="'+_esc(c.otherAvatar)+'">':c.otherUser[0].toUpperCase();
      html+='<div class="'+cls+'" onclick="dmSelectConvo(\\''+c.id+'\\')"><div class="dm-convo-avatar">'+av+'</div><div class="dm-convo-info"><div class="dm-convo-name">'+_esc(c.otherDisplayName||c.otherUser)+'</div><div class="dm-convo-last">'+_esc(c.lastMessage||'')+'</div></div><div class="dm-convo-meta"><div class="dm-convo-time">'+(c.lastMessageAt?_timeAgo(c.lastMessageAt):'')+'</div>'+(c.unread?'<div class="dm-unread-dot"></div>':'')+'</div></div>';
    });
    el.innerHTML=html;
  }

  function loadMessages(convoId){
    fetch('/api/messaging/dm/'+convoId+'/messages').then(function(r){return r.json()}).then(function(d){
      if(d.success){_msgs=d.messages||[];renderChat();}
    });
  }

  function renderChat(){
    if(!_activeConvo||!_myUser)return;
    var area=document.getElementById('dmChatArea');
    var otherName=_activeConvo.otherDisplayName||_activeConvo.otherUser;
    var html='<div class="dm-chat-hdr"><div class="dm-convo-avatar" style="width:32px;height:32px;font-size:12px">'+(_activeConvo.otherAvatar?'<img src="'+_esc(_activeConvo.otherAvatar)+'">':otherName[0].toUpperCase())+'</div><div><div class="dm-chat-hdr-name">'+_esc(otherName)+'</div><div class="dm-chat-hdr-status">Direct Message</div></div></div>';
    html+='<div class="dm-messages" id="dmMsgScroll">';
    if(!_msgs.length){
      html+='<div style="text-align:center;color:var(--text-secondary);font-size:12px;padding:40px 0">No messages yet. Say hello! 👋</div>';
    } else {
      var lastDay='';
      _msgs.forEach(function(m){
        var day=new Date(m.createdAt).toLocaleDateString();
        if(day!==lastDay){html+='<div class="dm-day-sep"><span>'+day+'</span></div>';lastDay=day;}
        var isOwn=m.senderId===_myUser.id;
        var cls='dm-msg'+(isOwn?' own':'');
        var time=new Date(m.createdAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
        var avHtml=isOwn?(_myUser.customAvatar?'<img src="'+_myUser.customAvatar+'">':_myUser.username[0].toUpperCase()):(_activeConvo.otherAvatar?'<img src="'+_esc(_activeConvo.otherAvatar)+'">':(_activeConvo.otherUser||'?')[0].toUpperCase());
        html+='<div class="'+cls+'"><div class="dm-msg-avatar">'+avHtml+'</div><div><div class="dm-msg-bubble">'+_esc(m.body)+'</div><div class="dm-msg-time">'+time+'</div></div></div>';
      });
    }
    html+='</div>';
    html+='<div class="dm-input-bar"><textarea id="dmInput" rows="1" placeholder="Type a message..." onkeydown="if(event.key===\\'Enter\\'&&!event.shiftKey){event.preventDefault();dmSend();}"></textarea><button class="dm-send-btn" onclick="dmSend()">➤</button></div>';
    area.innerHTML=html;
    var scroll=document.getElementById('dmMsgScroll');
    if(scroll)scroll.scrollTop=scroll.scrollHeight;
  }

  window.dmSelectConvo=function(id){
    var c=_convos.find(function(x){return x.id===id;});
    if(!c)return;
    _activeConvo=c;
    if(c.unread){c.unread=false;fetch('/api/messaging/dm/'+id+'/read',{method:'POST'});}
    renderConvoList();
    loadMessages(id);
  };

  window.dmSearchConvos=function(q){renderConvoList(q);};

  window.dmSend=function(){
    if(!_activeConvo||!_myUser)return;
    var input=document.getElementById('dmInput');
    var text=input.value.trim();
    if(!text)return;
    input.value='';
    // Optimistic add
    var newMsg={id:'tmp-'+Date.now(),senderId:_myUser.id,body:text,createdAt:Date.now()};
    _msgs.push(newMsg);
    renderChat();
    fetch('/api/messaging/dm/'+_activeConvo.id+'/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({body:text})})
      .then(function(r){return r.json()}).then(function(d){
        if(d.success&&d.message){var idx=_msgs.findIndex(function(m){return m.id===newMsg.id;});if(idx>=0)_msgs[idx]=d.message;}
      });
  };

  window.dmNewConvo=function(){
    // Fetch user list
    fetch('/api/messaging/users').then(function(r){return r.json()}).then(function(d){
      if(!d.success)return alert('Failed to load users');
      var users=d.users||[];
      document.getElementById('dmNewConvoOverlay').style.display='flex';
      var html='<div class="mail-compose-overlay" onclick="if(event.target===this)dmCloseNewConvo()"><div class="mail-compose-box" style="width:380px"><div class="hdr"><h3 style="margin:0;font-size:15px">💬 New Conversation</h3><button onclick="dmCloseNewConvo()" style="background:none;border:none;color:var(--text-secondary);font-size:18px;cursor:pointer;transform:none">✕</button></div><div class="body"><div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px">Select a user to message:</div><div id="dmUserPickList" style="max-height:300px;overflow-y:auto;display:flex;flex-direction:column;gap:4px">';
      users.forEach(function(u){
        if(_myUser&&u.id===_myUser.id)return;
        html+='<div style="padding:8px 12px;border-radius:8px;cursor:pointer;display:flex;align-items:center;gap:10px;transition:background 0.15s" onmouseover="this.style.background=\\'var(--bg-hover)\\'" onmouseout="this.style.background=\\'none\\'" onclick="dmStartConvoWith(\\''+u.id+'\\',\\''+_esc(u.username)+'\\')"><div class="dm-convo-avatar" style="width:32px;height:32px;font-size:12px">'+(u.avatar?'<img src="'+_esc(u.avatar)+'">':u.username[0].toUpperCase())+'</div><div><div style="font-size:13px;font-weight:600;color:var(--text-primary)">'+_esc(u.displayName||u.username)+'</div><div style="font-size:11px;color:var(--text-secondary)">'+_esc(u.tier)+'</div></div></div>';
      });
      html+='</div></div></div></div>';
      document.getElementById('dmNewConvoOverlay').innerHTML=html;
    });
  };

  window.dmCloseNewConvo=function(){document.getElementById('dmNewConvoOverlay').style.display='none';document.getElementById('dmNewConvoOverlay').innerHTML='';};

  window.dmStartConvoWith=function(userId,username){
    fetch('/api/messaging/dm/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:userId})})
      .then(function(r){return r.json()}).then(function(d){
        if(d.success&&d.conversation){
          dmCloseNewConvo();
          // Add or update conversation in list
          var exists=_convos.find(function(c){return c.id===d.conversation.id;});
          if(!exists){_convos.unshift(d.conversation);}
          _activeConvo=d.conversation;
          renderConvoList();
          loadMessages(d.conversation.id);
        }else{alert(d.error||'Failed to create conversation');}
      });
  };

  // Real-time DM
  if(typeof io!=='undefined'){
    _dmSock=io();
    _dmSock.on('newDM',function(data){
      if(_activeConvo&&data.conversationId===_activeConvo.id){
        _msgs.push(data.message);renderChat();
      }
      // Update convo list
      var c=_convos.find(function(x){return x.id===data.conversationId;});
      if(c){c.lastMessage=data.message.body;c.lastMessageAt=data.message.createdAt;if(!_activeConvo||_activeConvo.id!==data.conversationId)c.unread=true;}
      else{loadConvos();}
      renderConvoList();
    });
  }

  function _esc(s){return s?String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'):''}
  function _timeAgo(ts){var s=Math.floor((Date.now()-ts)/1000);if(s<60)return 'now';if(s<3600)return Math.floor(s/60)+'m';if(s<86400)return Math.floor(s/3600)+'h';return new Date(ts).toLocaleDateString('en',{month:'short',day:'numeric'});}

  loadConvos();
})();
</script>`;
}


// ====================== GENERAL CHAT TAB ======================
export function renderChatRoomTab() {
  return `
<style>
/* ═══════ Discord-style Chat Layout ═══════ */
.cr{display:grid;grid-template-columns:240px 1fr 260px;height:calc(100vh - 120px);background:var(--bg-body);border-radius:12px;overflow:hidden;border:1px solid var(--border-main)}
/* ─── Channel sidebar ─── */
.cr-channels{background:var(--bg-sidebar);display:flex;flex-direction:column;border-right:1px solid var(--border-main)}
.cr-ch-hdr{padding:14px 16px;font-size:13px;font-weight:700;color:var(--text-primary);letter-spacing:0.3px;border-bottom:1px solid var(--border-main);display:flex;align-items:center;gap:8px}
.cr-ch-cat{padding:18px 10px 4px 10px;font-size:10px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:1px;display:flex;align-items:center;gap:4px}
.cr-ch-cat::before{content:'';flex:0 0 6px;height:6px;display:inline-block}
.cr-ch{display:flex;align-items:center;gap:8px;padding:7px 12px;margin:1px 8px;border-radius:6px;cursor:pointer;color:var(--text-secondary);font-size:13.5px;transition:background .12s,color .12s;position:relative}
.cr-ch:hover{background:var(--bg-hover);color:var(--text-primary)}
.cr-ch.active{background:var(--bg-hover);color:var(--text-primary);font-weight:600}
.cr-ch .ch-hash{font-size:18px;opacity:.5;font-weight:400;width:20px;text-align:center;flex-shrink:0}
.cr-ch .ch-icon{font-size:15px;width:20px;text-align:center;flex-shrink:0}
.cr-ch .ch-unread{background:var(--accent);color:#fff;font-size:9px;font-weight:700;padding:1px 5px;border-radius:8px;margin-left:auto;min-width:14px;text-align:center;animation:crUnreadPop .2s ease}
@keyframes crUnreadPop{from{transform:scale(0)}60%{transform:scale(1.2)}to{transform:scale(1)}}
/* ─── Main chat ─── */
.cr-main{display:flex;flex-direction:column;background:var(--bg-card);min-width:0}
.cr-hdr{padding:12px 16px;border-bottom:1px solid var(--border-main);display:flex;align-items:center;gap:10px;background:var(--bg-card);flex-shrink:0}
.cr-hdr-hash{font-size:20px;color:var(--text-secondary);font-weight:300}
.cr-hdr-name{font-size:15px;font-weight:700;color:var(--text-primary)}
.cr-hdr-divider{width:1px;height:20px;background:var(--border-main);margin:0 4px}
.cr-hdr-desc{font-size:12px;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0}
.cr-hdr-actions{display:flex;gap:6px;flex-shrink:0}
.cr-hdr-btn{background:none;border:none;color:var(--text-secondary);font-size:16px;cursor:pointer;padding:4px 6px;border-radius:4px;transition:color .15s,background .15s}
.cr-hdr-btn:hover{color:var(--text-primary);background:var(--bg-hover)}
/* ─── Connection status ─── */
.cr-conn{font-size:10px;padding:4px 10px;text-align:center;font-weight:600;display:none}
.cr-conn.disconnected{display:block;background:#ef535022;color:#ef5350}
.cr-conn.reconnecting{display:block;background:#f39c1222;color:#f39c12}
/* ─── Message feed ─── */
.cr-feed{flex:1;overflow-y:auto;padding:0;display:flex;flex-direction:column}
.cr-feed::-webkit-scrollbar{width:6px}
.cr-feed::-webkit-scrollbar-thumb{background:var(--scrollbar-thumb);border-radius:3px}
.cr-feed::-webkit-scrollbar-thumb:hover{background:var(--scrollbar-hover)}
.cr-welcome{padding:40px 20px 20px;border-bottom:1px solid var(--border-main)}
.cr-welcome-icon{font-size:42px;width:68px;height:68px;display:flex;align-items:center;justify-content:center;background:var(--bg-input);border-radius:50%;margin-bottom:10px}
.cr-welcome h2{margin:0;font-size:28px;color:var(--text-primary);font-weight:800}
.cr-welcome p{margin:6px 0 0;font-size:13px;color:var(--text-secondary);line-height:1.5}
.cr-day{display:flex;align-items:center;gap:8px;padding:4px 16px;margin:16px 0 4px}
.cr-day::before,.cr-day::after{content:'';flex:1;height:1px;background:var(--border-main)}
.cr-day span{font-size:11px;font-weight:600;color:var(--text-secondary);white-space:nowrap}
/* ─── Message bubble ─── */
.cr-msg{display:flex;gap:14px;padding:3px 20px;position:relative;transition:background .1s}
.cr-msg:hover{background:rgba(255,255,255,.03)}
.cr-msg:hover .cr-msg-actions{opacity:1;transform:translateY(0)}
.cr-msg.cr-msg-start{padding-top:14px;margin-top:0}
.cr-msg-av{width:40px;height:40px;border-radius:50%;flex-shrink:0;overflow:hidden;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:#fff;background:var(--accent);transition:opacity .15s}
.cr-msg-av:hover{opacity:.85}
.cr-msg-av img{width:100%;height:100%;object-fit:cover}
.cr-msg-av-hide{visibility:hidden;width:40px;flex-shrink:0}
.cr-msg-body{flex:1;min-width:0}
.cr-msg-meta{display:flex;align-items:baseline;gap:6px;margin-bottom:1px}
.cr-msg-name{font-size:13.5px;font-weight:600;cursor:pointer;transition:text-decoration .1s}
.cr-msg-name:hover{text-decoration:underline}
.cr-msg-tier{font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px;text-transform:uppercase;letter-spacing:.4px;vertical-align:middle}
.cr-msg-ts{font-size:10.5px;color:var(--text-muted);margin-left:2px}
.cr-msg-ts-inline{font-size:10px;color:transparent;width:40px;text-align:center;flex-shrink:0;cursor:default;transition:color .1s;line-height:1.4em;padding-top:1px}
.cr-msg:hover .cr-msg-ts-inline{color:var(--text-muted)}
.cr-msg-text{font-size:13.5px;color:var(--text-primary);line-height:1.45;white-space:pre-wrap;word-break:break-word}
.cr-msg-text a{color:var(--accent);text-decoration:none}
.cr-msg-text a:hover{text-decoration:underline}
.cr-msg-edited{font-size:10px;color:var(--text-muted);margin-left:4px;cursor:default}
/* ─── Reply reference ─── */
.cr-reply-ref{display:flex;align-items:center;gap:6px;padding:2px 0 4px;font-size:11.5px;color:var(--text-secondary);cursor:pointer;transition:opacity .12s}
.cr-reply-ref:hover{opacity:.8}
.cr-reply-ref::before{content:'';width:2px;height:12px;background:var(--accent);border-radius:1px;flex-shrink:0}
.cr-reply-ref-name{font-weight:600;color:var(--text-primary);font-size:11px}
.cr-reply-ref-text{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:400px}
/* ─── Reactions ─── */
.cr-reactions{display:flex;flex-wrap:wrap;gap:4px;padding:4px 0 2px}
.cr-react-pill{display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:10px;font-size:12px;cursor:pointer;border:1px solid var(--border-main);background:var(--bg-input);transition:background .12s,border-color .12s;user-select:none}
.cr-react-pill:hover{background:var(--bg-hover);border-color:var(--text-muted)}
.cr-react-pill.mine{border-color:var(--accent);background:rgba(91,91,255,.1)}
.cr-react-pill .rcount{font-size:10px;font-weight:600;color:var(--text-secondary)}
.cr-react-add{display:inline-flex;align-items:center;justify-content:center;width:28px;height:24px;border-radius:10px;font-size:14px;cursor:pointer;border:1px solid var(--border-main);background:var(--bg-input);transition:background .12s;opacity:.5;position:relative}
.cr-react-add:hover{opacity:1;background:var(--bg-hover)}
.cr-react-picker{position:absolute;bottom:30px;left:0;display:flex;gap:2px;padding:6px 8px;background:var(--bg-card);border:1px solid var(--border-main);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.3);z-index:10;animation:crPopIn .12s ease}
.cr-react-picker span{font-size:18px;cursor:pointer;padding:3px;border-radius:4px;transition:background .1s}
.cr-react-picker span:hover{background:var(--bg-hover)}
/* ─── Message hover actions ─── */
.cr-msg-actions{position:absolute;top:-14px;right:16px;display:flex;gap:2px;padding:2px 4px;background:var(--bg-card);border:1px solid var(--border-main);border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,.2);opacity:0;transform:translateY(4px);transition:opacity .12s,transform .12s;z-index:5}
.cr-msg-action{background:none;border:none;color:var(--text-secondary);font-size:15px;cursor:pointer;padding:4px 6px;border-radius:4px;display:flex;align-items:center;justify-content:center;transition:background .12s,color .12s}
.cr-msg-action:hover{background:var(--bg-hover);color:var(--text-primary)}
.cr-msg-action.danger:hover{background:#ef535020;color:#ef5350}
/* ─── Typing ─── */
.cr-typing{padding:2px 20px 8px;font-size:11.5px;color:var(--text-secondary);min-height:16px;display:flex;align-items:center;gap:6px}
.cr-typing-dots{display:inline-flex;gap:3px}
.cr-typing-dots span{width:4px;height:4px;border-radius:50%;background:var(--text-secondary);animation:crTypeDot 1.4s infinite}
.cr-typing-dots span:nth-child(2){animation-delay:.2s}
.cr-typing-dots span:nth-child(3){animation-delay:.4s}
@keyframes crTypeDot{0%,60%,100%{opacity:.3;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}
/* ─── Reply preview bar above input ─── */
.cr-reply-bar{display:none;padding:8px 16px;background:var(--bg-input);border-left:3px solid var(--accent);margin:0 16px;border-radius:6px 6px 0 0;font-size:12px;color:var(--text-secondary);align-items:center;gap:8px}
.cr-reply-bar.active{display:flex}
.cr-reply-bar-text{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.cr-reply-bar-close{background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:16px;padding:0 4px;border-radius:4px;transition:color .12s}
.cr-reply-bar-close:hover{color:var(--text-primary)}
/* ─── Edit mode ─── */
.cr-edit-bar{display:none;padding:8px 16px;background:var(--bg-input);border-left:3px solid #f39c12;margin:0 16px;border-radius:6px 6px 0 0;font-size:12px;color:#f39c12;align-items:center;gap:8px;font-weight:600}
.cr-edit-bar.active{display:flex}
.cr-edit-bar span{flex:1}
.cr-edit-bar button{background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:16px;padding:0 4px}
.cr-edit-bar button:hover{color:var(--text-primary)}
/* ─── Input area ─── */
.cr-input-wrap{padding:0 16px 20px;flex-shrink:0}
.cr-input-box{display:flex;align-items:flex-end;gap:0;background:var(--bg-input);border-radius:10px;border:1px solid var(--border-input);padding:4px 12px;transition:border-color .2s}
.cr-input-box.editing{border-color:#f39c12}
.cr-input-box:focus-within{border-color:var(--accent)}
.cr-input-box.editing:focus-within{border-color:#f39c12}
.cr-input-box textarea{flex:1;border:none;background:none;color:var(--text-primary);font-size:13.5px;resize:none;min-height:22px;max-height:140px;line-height:1.45;font-family:inherit;padding:8px 0;outline:none}
.cr-input-box textarea::placeholder{color:var(--text-muted)}
.cr-input-box .cr-send{background:none;border:none;color:var(--accent);font-size:20px;cursor:pointer;padding:6px 2px;opacity:.5;transition:opacity .15s}
.cr-input-box .cr-send:hover{opacity:1}
.cr-input-box textarea:not(:placeholder-shown)~.cr-send{opacity:1}
/* ─── Members sidebar ─── */
.cr-members{background:var(--bg-sidebar);border-left:1px solid var(--border-main);display:flex;flex-direction:column;overflow:hidden}
.cr-members-search{padding:10px 12px;border-bottom:1px solid var(--border-main)}
.cr-members-search input{width:100%;padding:6px 10px;border:1px solid var(--border-input);border-radius:6px;background:var(--bg-input);color:var(--text-primary);font-size:12px;outline:none}
.cr-members-search input:focus{border-color:var(--accent)}
.cr-members-list{flex:1;overflow-y:auto;padding:6px 8px}
.cr-members-list::-webkit-scrollbar{width:4px}
.cr-members-list::-webkit-scrollbar-thumb{background:var(--scrollbar-thumb);border-radius:2px}
.cr-mem-group{padding:16px 8px 4px;font-size:10px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.8px}
.cr-mem{display:flex;align-items:center;gap:10px;padding:6px 8px;border-radius:6px;cursor:pointer;transition:background .12s;position:relative}
.cr-mem:hover{background:var(--bg-hover)}
.cr-mem-av{width:32px;height:32px;border-radius:50%;flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;position:relative}
.cr-mem-av img{width:100%;height:100%;object-fit:cover}
.cr-mem-status{position:absolute;bottom:-1px;right:-1px;width:10px;height:10px;border-radius:50%;border:2px solid var(--bg-sidebar)}
.cr-mem-status.online{background:#2ecc71}
.cr-mem-status.idle{background:#f39c12}
.cr-mem-status.offline{background:#666}
.cr-mem-info{flex:1;min-width:0}
.cr-mem-name{font-size:12.5px;font-weight:500;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cr-mem.offline .cr-mem-name{opacity:.45}
.cr-mem.offline .cr-mem-av{opacity:.45}
/* ─── Profile Popup Card ─── */
.cr-popup-overlay{position:fixed;inset:0;z-index:900;background:transparent}
.cr-popup{position:fixed;z-index:901;width:320px;background:var(--bg-card);border:1px solid var(--border-main);border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.45);overflow:hidden;animation:crPopIn .15s ease}
@keyframes crPopIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
.cr-popup-banner{height:80px;background:linear-gradient(135deg,var(--accent),#ec4899);position:relative}
.cr-popup-banner img{width:100%;height:100%;object-fit:cover}
.cr-popup-av{width:64px;height:64px;border-radius:50%;border:4px solid var(--bg-card);position:absolute;bottom:-28px;left:16px;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:#fff;background:var(--accent)}
.cr-popup-av img{width:100%;height:100%;object-fit:cover}
.cr-popup-body{padding:36px 16px 16px}
.cr-popup-name{font-size:18px;font-weight:700;color:var(--text-primary)}
.cr-popup-user{font-size:12px;color:var(--text-secondary);margin-top:1px}
.cr-popup-tier{display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;text-transform:uppercase;margin-top:6px}
.cr-popup-divider{height:1px;background:var(--border-main);margin:12px 0}
.cr-popup-section-title{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;color:var(--text-secondary);margin-bottom:6px}
.cr-popup-bio{font-size:12px;color:var(--text-primary);line-height:1.5;white-space:pre-wrap;word-break:break-word}
.cr-popup-actions{display:flex;gap:6px;margin-top:12px}
.cr-popup-btn{flex:1;padding:8px;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;text-align:center;transition:opacity .15s}
.cr-popup-btn:hover{opacity:.85}
/* ─── Toast ─── */
.cr-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:8px 18px;border-radius:8px;font-size:12px;font-weight:600;z-index:999;pointer-events:none;animation:crToastIn .25s ease}
.cr-toast.error{background:#ef5350;color:#fff}
.cr-toast.success{background:#2ecc71;color:#fff}
@keyframes crToastIn{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
/* ─── Mobile ─── */
@media(max-width:960px){.cr{grid-template-columns:1fr;height:calc(100vh - 120px)}.cr-channels,.cr-members{display:none}.cr-hdr-btn.toggle-members,.cr-hdr-btn.toggle-channels{display:flex}
  .cr-channels.mobile-open,.cr-members.mobile-open{display:flex;position:fixed;top:0;bottom:0;z-index:800;width:280px;box-shadow:0 0 40px rgba(0,0,0,.5)}
  .cr-channels.mobile-open{left:0}.cr-members.mobile-open{right:0}}
@media(min-width:961px){.cr-hdr-btn.toggle-members,.cr-hdr-btn.toggle-channels{display:none}}
</style>

<div class="cr">
  <!-- ═══ Channel List ═══ -->
  <div class="cr-channels" id="crChannels">
    <div class="cr-ch-hdr">💬 Chat Rooms</div>
    <div class="cr-ch-cat">Text Channels</div>
    <div id="crChList">
      <div class="cr-ch active" onclick="crSwitch('general')" data-ch="general"><span class="ch-hash">#</span>general</div>
      <div class="cr-ch" onclick="crSwitch('off-topic')" data-ch="off-topic"><span class="ch-hash">#</span>off-topic</div>
      <div class="cr-ch" onclick="crSwitch('bot-dev')" data-ch="bot-dev"><span class="ch-icon">🤖</span>bot-dev</div>
      <div class="cr-ch" onclick="crSwitch('help')" data-ch="help"><span class="ch-icon">❓</span>help</div>
    </div>
    <div class="cr-ch-cat">Restricted</div>
    <div class="cr-ch" onclick="crSwitch('announcements')" data-ch="announcements"><span class="ch-icon">📢</span>announcements</div>
  </div>

  <!-- ═══ Main Chat ═══ -->
  <div class="cr-main">
    <div class="cr-hdr">
      <button class="cr-hdr-btn toggle-channels" onclick="document.getElementById('crChannels').classList.toggle('mobile-open')">☰</button>
      <span class="cr-hdr-hash">#</span>
      <span class="cr-hdr-name" id="crChName">general</span>
      <span class="cr-hdr-divider"></span>
      <span class="cr-hdr-desc" id="crChDesc">General discussion for the dashboard team</span>
      <div class="cr-hdr-actions">
        <button class="cr-hdr-btn toggle-members" onclick="document.getElementById('crMembers').classList.toggle('mobile-open')" title="Members">👥</button>
      </div>
    </div>
    <div class="cr-conn" id="crConn"></div>
    <div class="cr-feed" id="crFeed">
      <div style="flex:1"></div>
      <div style="text-align:center;color:var(--text-secondary);font-size:12px;padding:40px 0">Loading messages...</div>
    </div>
    <div class="cr-typing" id="crTyping"></div>
    <div class="cr-reply-bar" id="crReplyBar">
      <span>↩ Replying to <strong id="crReplyName"></strong></span>
      <span class="cr-reply-bar-text" id="crReplyText"></span>
      <button class="cr-reply-bar-close" onclick="crCancelReply()" title="Cancel">✕</button>
    </div>
    <div class="cr-edit-bar" id="crEditBar">
      <span>✏️ Editing message</span>
      <button onclick="crCancelEdit()" title="Cancel">✕</button>
    </div>
    <div class="cr-input-wrap">
      <div class="cr-input-box" id="crInputBox">
        <textarea id="crInput" rows="1" placeholder="Message #general" onkeydown="crKeyDown(event)" oninput="crTypingNotify();crAutoResize(this)"></textarea>
        <button class="cr-send" onclick="crSend()" title="Send">➤</button>
      </div>
    </div>
  </div>

  <!-- ═══ Members ═══ -->
  <div class="cr-members" id="crMembers">
    <div class="cr-members-search"><input type="text" placeholder="Search members..." id="crMemSearch" oninput="crFilterMembers(this.value)"></div>
    <div class="cr-members-list" id="crMemList"></div>
  </div>
</div>

<div id="crPopupOverlay" style="display:none"></div>

<script>
(function(){
  var _ch='general',_msgs=[],_me=null,_sock=null,_typingTO=null,_typingSent=false,_typing={},_members=[],_memberFilter='';
  var _replyTo=null,_editingId=null,_unread={},_openPicker=null;
  var _chDescs={general:'General discussion for the dashboard team','off-topic':'Casual chat and fun stuff',announcements:'Important announcements (admin only)','bot-dev':'Bot development discussion',help:'Ask for help here'};
  var _tierColors={owner:'#ff4444',admin:'#9146ff',moderator:'#4caf50',viewer:'#8b8fa3'};

  fetch('/api/accounts/me').then(function(r){return r.json()}).then(function(d){
    if(d.success) _me={id:d.id,username:d.username,displayName:d.displayName,customAvatar:d.customAvatar,tier:d.tier,accentColor:d.accentColor||'#5b5bff'};
  }).catch(function(){});

  function _esc(s){return s?String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'):''}

  /* ─── Linkify URLs in escaped text ─── */
  function _linkify(escaped){
    return escaped.replace(/(https?:\\/\\/[^\\s<&]+)/gi,function(url){
      return '<a href="'+url+'" target="_blank" rel="noopener noreferrer">'+url+'</a>';
    });
  }

  /* ─── Toast notification ─── */
  function _toast(msg,type){
    var t=document.createElement('div');t.className='cr-toast '+(type||'error');t.textContent=msg;
    document.body.appendChild(t);setTimeout(function(){t.remove()},3000);
  }

  /* ─── Unread badges ─── */
  function _updateUnread(){
    document.querySelectorAll('.cr-ch').forEach(function(el){
      var ch=el.getAttribute('data-ch');if(!ch)return;
      var badge=el.querySelector('.ch-unread');
      var count=_unread[ch]||0;
      if(count>0){
        if(!badge){badge=document.createElement('span');badge.className='ch-unread';el.appendChild(badge);}
        badge.textContent=count>99?'99+':count;
      } else if(badge){badge.remove();}
    });
  }

  function loadCh(ch){
    _ch=ch;
    _unread[ch]=0;_updateUnread();
    _replyTo=null;_editingId=null;_updateReplyBar();_updateEditBar();
    document.getElementById('crChName').textContent=ch;
    document.getElementById('crChDesc').textContent=_chDescs[ch]||'';
    document.getElementById('crInput').placeholder='Message #'+ch;
    document.querySelectorAll('.cr-ch').forEach(function(el){el.classList.toggle('active',el.getAttribute('data-ch')===ch)});
    document.getElementById('crChannels').classList.remove('mobile-open');
    var feed=document.getElementById('crFeed');
    feed.innerHTML='<div style="flex:1"></div><div style="text-align:center;color:var(--text-secondary);font-size:12px;padding:40px 0">Loading messages...</div>';
    fetch('/api/messaging/chat/'+encodeURIComponent(ch)+'/messages').then(function(r){return r.json()}).then(function(d){
      if(d.success){_msgs=d.messages||[];renderFeed();}
      else{feed.innerHTML='<div style="flex:1"></div><div style="text-align:center;color:var(--text-secondary);font-size:12px;padding:40px 0">Failed to load messages</div>';}
    }).catch(function(){
      feed.innerHTML='<div style="flex:1"></div><div style="text-align:center;color:#ef5350;font-size:12px;padding:40px 0">Connection error — try refreshing</div>';
    });
    if(_sock) _sock.emit('joinChat',{channel:ch});
  }

  function renderFeed(){
    var el=document.getElementById('crFeed');
    if(!_msgs.length){
      el.innerHTML='<div style="flex:1"></div><div class="cr-welcome"><div class="cr-welcome-icon">#</div><h2>Welcome to #'+_esc(_ch)+'</h2><p>'+_esc(_chDescs[_ch]||'This is the start of the channel.')+'</p></div>';
      return;
    }
    var html='<div style="flex:1"></div>';
    html+='<div class="cr-welcome"><div class="cr-welcome-icon">#</div><h2>Welcome to #'+_esc(_ch)+'</h2><p>'+_esc(_chDescs[_ch]||'')+'</p></div>';
    var lastDay='',lastUser='',lastTime=0;
    _msgs.forEach(function(m){
      var date=new Date(m.createdAt);
      var day=date.toLocaleDateString(undefined,{weekday:'long',year:'numeric',month:'long',day:'numeric'});
      if(day!==lastDay){html+='<div class="cr-day"><span>'+_esc(day)+'</span></div>';lastDay=day;lastUser='';lastTime=0;}
      var sameGroup=(m.userId===lastUser && (m.createdAt-lastTime)<420000 && !m.replyTo);
      var time=date.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
      var color=_tierColors[m.tier]||'#8b8fa3';
      var isOwn=_me && m.userId===_me.id;
      var canDel=isOwn || (_me && (_me.tier==='admin'||_me.tier==='owner'));
      var bodyHtml=_linkify(_esc(m.body));
      var editTag=m.editedAt?'<span class="cr-msg-edited" title="Edited">(edited)</span>':'';
      var reactionsHtml=_renderReactions(m);
      var replyHtml='';
      if(m.replyTo){
        replyHtml='<div class="cr-reply-ref" onclick="crScrollTo(\\''+_esc(m.replyTo.id)+'\\')"><span class="cr-reply-ref-name">'+_esc(m.replyTo.displayName)+'</span><span class="cr-reply-ref-text">'+_esc(m.replyTo.body)+'</span></div>';
      }
      if(sameGroup){
        html+='<div class="cr-msg" data-mid="'+_esc(m.id)+'" data-uid="'+_esc(m.userId)+'">'
          +'<span class="cr-msg-ts-inline">'+time+'</span>'
          +'<div class="cr-msg-body"><div class="cr-msg-text">'+bodyHtml+editTag+'</div>'+reactionsHtml+'</div>'
          +_buildActions(m,isOwn,canDel)
          +'</div>';
      } else {
        var avHtml=m.avatar?'<img src="'+_esc(m.avatar)+'" alt="">':((m.displayName||m.username||'?')[0].toUpperCase());
        var tierBadge='';
        if(m.tier && m.tier!=='viewer'){tierBadge=' <span class="cr-msg-tier" style="background:'+color+'22;color:'+color+'">'+_esc(m.tier)+'</span>';}
        html+='<div class="cr-msg cr-msg-start" data-mid="'+_esc(m.id)+'" data-uid="'+_esc(m.userId)+'">'
          +'<div class="cr-msg-av" style="background:'+(m.accentColor||color)+'" onclick="crShowProfile(\\''+_esc(m.userId)+'\\',event)">'+avHtml+'</div>'
          +'<div class="cr-msg-body">'
          +replyHtml
          +'<div class="cr-msg-meta"><span class="cr-msg-name" style="color:'+color+'" onclick="crShowProfile(\\''+_esc(m.userId)+'\\',event)">'+_esc(m.displayName||m.username)+tierBadge+'</span><span class="cr-msg-ts">'+_esc(time)+'</span></div>'
          +'<div class="cr-msg-text">'+bodyHtml+editTag+'</div>'
          +reactionsHtml
          +'</div>'
          +_buildActions(m,isOwn,canDel)
          +'</div>';
      }
      lastUser=m.userId;lastTime=m.createdAt;
    });
    el.innerHTML=html;
    el.scrollTop=el.scrollHeight;
  }

  function _buildActions(m,isOwn,canDel){
    var h='<div class="cr-msg-actions">';
    h+='<button class="cr-msg-action" onclick="crReply(\\''+_esc(m.id)+'\\')\" title="Reply">↩</button>';
    h+='<button class="cr-msg-action" onclick="crTogglePicker(\\''+_esc(m.id)+'\\',event)" title="React">😀</button>';
    if(isOwn) h+='<button class="cr-msg-action" onclick="crEdit(\\''+_esc(m.id)+'\\')\" title="Edit">✏️</button>';
    if(canDel) h+='<button class="cr-msg-action danger" onclick="crDeleteMsg(\\''+_esc(m.id)+'\\')\" title="Delete">🗑️</button>';
    h+='</div>';
    return h;
  }

  /* ─── Reactions rendering ─── */
  var _emojiList=['👍','❤️','😂','😮','😢','🔥','👎','🎉'];
  function _renderReactions(m){
    if(!m.reactions || !Object.keys(m.reactions).length) return '';
    var h='<div class="cr-reactions">';
    for(var emoji in m.reactions){
      if(!m.reactions.hasOwnProperty(emoji))continue;
      var users=m.reactions[emoji];
      var isMine=_me && users.indexOf(_me.id)>=0;
      h+='<span class="cr-react-pill'+(isMine?' mine':'')+'" onclick="crReact(\\''+_esc(m.id)+'\\',\\''+_esc(emoji)+'\\')">'+emoji+' <span class="rcount">'+users.length+'</span></span>';
    }
    h+='</div>';
    return h;
  }

  /* ─── Reply ─── */
  window.crReply=function(mid){
    var m=_msgs.find(function(x){return x.id===mid});
    if(!m)return;
    _replyTo={id:m.id,displayName:m.displayName||m.username,body:m.body};
    _editingId=null;_updateEditBar();_updateReplyBar();
    document.getElementById('crInput').focus();
  };
  window.crCancelReply=function(){_replyTo=null;_updateReplyBar();};
  function _updateReplyBar(){
    var bar=document.getElementById('crReplyBar');
    if(_replyTo){
      bar.classList.add('active');
      document.getElementById('crReplyName').textContent=_replyTo.displayName;
      document.getElementById('crReplyText').textContent=_replyTo.body.slice(0,120);
    } else {bar.classList.remove('active');}
  }

  /* ─── Edit ─── */
  window.crEdit=function(mid){
    var m=_msgs.find(function(x){return x.id===mid});
    if(!m||!_me||m.userId!==_me.id)return;
    _editingId=mid;_replyTo=null;_updateReplyBar();_updateEditBar();
    var input=document.getElementById('crInput');
    input.value=m.body;input.focus();crAutoResize(input);
    document.getElementById('crInputBox').classList.add('editing');
  };
  window.crCancelEdit=function(){
    _editingId=null;_updateEditBar();
    var input=document.getElementById('crInput');input.value='';input.style.height='auto';
    document.getElementById('crInputBox').classList.remove('editing');
  };
  function _updateEditBar(){
    var bar=document.getElementById('crEditBar');
    if(_editingId){bar.classList.add('active');}else{bar.classList.remove('active');document.getElementById('crInputBox').classList.remove('editing');}
  }

  /* ─── Reactions toggle ─── */
  window.crReact=function(mid,emoji){
    fetch('/api/messaging/chat/'+encodeURIComponent(_ch)+'/'+encodeURIComponent(mid)+'/react',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({emoji:emoji})})
      .then(function(r){return r.json()}).then(function(d){
        if(d.success){var m=_msgs.find(function(x){return x.id===mid});if(m){m.reactions=d.reactions;renderFeed();}}
      }).catch(function(){_toast('Failed to react','error');});
  };

  /* ─── Emoji picker ─── */
  window.crTogglePicker=function(mid,ev){
    ev&&ev.stopPropagation();
    // Close any existing pickers
    document.querySelectorAll('.cr-react-picker').forEach(function(p){p.remove()});
    var btn=ev.currentTarget;
    var picker=document.createElement('div');picker.className='cr-react-picker';
    _emojiList.forEach(function(e){
      var sp=document.createElement('span');sp.textContent=e;
      sp.onclick=function(ev2){ev2.stopPropagation();picker.remove();crReact(mid,e);};
      picker.appendChild(sp);
    });
    btn.style.position='relative';btn.appendChild(picker);
    _openPicker=picker;
  };

  /* ─── Scroll to message (for reply references) ─── */
  window.crScrollTo=function(mid){
    var el=document.querySelector('[data-mid="'+mid+'"]');
    if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.style.background='rgba(91,91,255,.12)';setTimeout(function(){el.style.background=''},1500);}
  };

  /* ─── Members ─── */
  function renderMembers(members){
    _members=members||[];
    var el=document.getElementById('crMemList');
    var online=_members.filter(function(m){return m.online});
    var offline=_members.filter(function(m){return !m.online});
    var q=_memberFilter.toLowerCase();
    if(q){
      online=online.filter(function(m){return (m.displayName||m.username).toLowerCase().indexOf(q)>=0});
      offline=offline.filter(function(m){return (m.displayName||m.username).toLowerCase().indexOf(q)>=0});
    }
    var groups={owner:[],admin:[],moderator:[],viewer:[]};
    online.forEach(function(m){(groups[m.tier]||groups.viewer).push(m)});
    var html='';
    ['owner','admin','moderator','viewer'].forEach(function(tier){
      var list=groups[tier];
      if(!list.length) return;
      var label=tier==='owner'?'\\u{1F451} Owner':tier==='admin'?'\\u2699\\uFE0F Admin':tier==='moderator'?'\\u{1F6E1}\\uFE0F Moderator':'\\u{1F441}\\uFE0F Viewer';
      html+='<div class="cr-mem-group">'+label+' \\u2014 '+list.length+'</div>';
      list.forEach(function(m){html+=_renderMember(m,true)});
    });
    if(offline.length){
      html+='<div class="cr-mem-group">Offline \\u2014 '+offline.length+'</div>';
      offline.forEach(function(m){html+=_renderMember(m,false)});
    }
    el.innerHTML=html||'<div style="padding:16px;color:var(--text-secondary);font-size:12px;text-align:center">No members</div>';
  }

  function _renderMember(m,isOnline){
    var av=m.avatar?'<img src="'+_esc(m.avatar)+'" alt="">':((m.displayName||m.username||'?')[0].toUpperCase());
    var color=_tierColors[m.tier]||'#8b8fa3';
    var statusCls=isOnline?'online':'offline';
    return '<div class="cr-mem '+(isOnline?'':'offline')+'" onclick="crShowProfile(\\''+_esc(m.id)+'\\',event)">'
      +'<div class="cr-mem-av" style="background:'+(m.accentColor||color)+'">'+av+'<div class="cr-mem-status '+statusCls+'"></div></div>'
      +'<div class="cr-mem-info"><div class="cr-mem-name" style="'+(isOnline?'color:'+color:'')+'">'+_esc(m.displayName||m.username)+'</div></div>'
      +'</div>';
  }

  window.crFilterMembers=function(q){_memberFilter=q;renderMembers(_members);};

  /* ─── Profile popup ─── */
  window.crShowProfile=function(uid,ev){
    ev&&ev.stopPropagation();
    var m=_members.find(function(x){return x.id===uid});
    if(!m) return;
    var color=_tierColors[m.tier]||'#8b8fa3';
    var av=m.avatar?'<img src="'+_esc(m.avatar)+'" alt="">':((m.displayName||m.username||'?')[0].toUpperCase());
    var tierLabel=(m.tier||'viewer').charAt(0).toUpperCase()+(m.tier||'viewer').slice(1);
    var x=ev?Math.min(ev.clientX,window.innerWidth-340):200;
    var y=ev?Math.min(ev.clientY,window.innerHeight-400):200;
    if(y<10)y=10;
    var html='<div class="cr-popup-overlay" onclick="crCloseProfile()"></div>'
      +'<div class="cr-popup" style="left:'+x+'px;top:'+y+'px">'
      +'<div class="cr-popup-banner" style="background:linear-gradient(135deg,'+(m.accentColor||'#5b5bff')+',#ec4899)"></div>'
      +'<div class="cr-popup-av" style="background:'+(m.accentColor||color)+'">'+av+'</div>'
      +'<div class="cr-popup-body">'
      +'<div class="cr-popup-name">'+_esc(m.displayName||m.username)+'</div>'
      +'<div class="cr-popup-user">'+_esc(m.username)+'</div>'
      +'<div class="cr-popup-tier" style="background:'+color+'22;color:'+color+'">'+_esc(tierLabel)+'</div>'
      +(m.bio?'<div class="cr-popup-divider"></div><div class="cr-popup-section-title">About Me</div><div class="cr-popup-bio">'+_esc(m.bio)+'</div>':'')
      +'<div class="cr-popup-divider"></div>'
      +'<div class="cr-popup-actions">'
      +'<button class="cr-popup-btn" style="background:var(--accent);color:#fff" onclick="window.location.href=\\'/dms\\'">Message</button>'
      +'<button class="cr-popup-btn" style="background:var(--bg-input);color:var(--text-primary)" onclick="crCloseProfile()">Close</button>'
      +'</div></div></div>';
    var over=document.getElementById('crPopupOverlay');
    over.innerHTML=html;over.style.display='block';
  };

  window.crCloseProfile=function(){
    var over=document.getElementById('crPopupOverlay');
    over.innerHTML='';over.style.display='none';
  };

  /* ─── Key handler ─── */
  window.crKeyDown=function(event){
    if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();crSend();}
    if(event.key==='Escape'){
      if(_editingId){crCancelEdit();return;}
      if(_replyTo){crCancelReply();return;}
    }
  };

  /* ─── Global Escape key ─── */
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'){
      crCloseProfile();
      if(_openPicker){_openPicker.remove();_openPicker=null;}
    }
  });

  /* ─── Click outside to close picker ─── */
  document.addEventListener('click',function(){
    if(_openPicker){_openPicker.remove();_openPicker=null;}
  });

  /* ─── Sending / Editing ─── */
  window.crSend=function(){
    if(!_me)return;
    var input=document.getElementById('crInput');
    var text=input.value.trim();
    if(!text) return;

    // Edit mode
    if(_editingId){
      var eid=_editingId;
      crCancelEdit();
      input.value='';input.style.height='auto';
      fetch('/api/messaging/chat/'+encodeURIComponent(_ch)+'/'+encodeURIComponent(eid),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({body:text})})
        .then(function(r){return r.json()}).then(function(d){
          if(d.success&&d.message){var idx=_msgs.findIndex(function(m){return m.id===eid});if(idx>=0){_msgs[idx]=d.message;renderFeed();}}
          else if(!d.success){_toast(d.error||'Edit failed','error');}
        }).catch(function(){_toast('Edit failed','error');});
      return;
    }

    input.value='';input.style.height='auto';
    var payload={body:text};
    if(_replyTo) payload.replyTo={id:_replyTo.id,displayName:_replyTo.displayName,body:_replyTo.body};
    var msg={id:'tmp-'+Date.now(),userId:_me.id,username:_me.username,displayName:_me.displayName,avatar:_me.customAvatar,tier:_me.tier,accentColor:_me.accentColor,body:text,createdAt:Date.now(),replyTo:_replyTo||undefined};
    _replyTo=null;_updateReplyBar();
    _msgs.push(msg);renderFeed();
    fetch('/api/messaging/chat/'+encodeURIComponent(_ch)+'/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
      .then(function(r){return r.json()}).then(function(d){
        if(d.success&&d.message){var idx=_msgs.findIndex(function(m){return m.id===msg.id});if(idx>=0)_msgs[idx]=d.message;renderFeed();}
        else if(!d.success){_msgs=_msgs.filter(function(m){return m.id!==msg.id});renderFeed();_toast(d.error||'Send failed','error');}
      }).catch(function(){_msgs=_msgs.filter(function(m){return m.id!==msg.id});renderFeed();_toast('Send failed','error');});
  };

  /* ─── Delete ─── */
  window.crDeleteMsg=function(id){
    if(!confirm('Delete this message?')) return;
    fetch('/api/messaging/chat/'+encodeURIComponent(_ch)+'/'+encodeURIComponent(id),{method:'DELETE'})
      .then(function(r){return r.json()}).then(function(d){
        if(d.success){_msgs=_msgs.filter(function(m){return m.id!==id});renderFeed();}
        else{_toast(d.error||'Delete failed','error');}
      }).catch(function(){_toast('Delete failed','error');});
  };

  /* ─── Channel switch ─── */
  window.crSwitch=function(ch){loadCh(ch);};

  /* ─── Typing (properly debounced) ─── */
  window.crTypingNotify=function(){
    if(_sock&&_me&&!_typingSent){
      _typingSent=true;
      _sock.emit('chatTyping',{channel:_ch,username:_me.displayName||_me.username});
      clearTimeout(_typingTO);
      _typingTO=setTimeout(function(){_typingSent=false;},2500);
    }
  };

  function updateTyping(){
    var el=document.getElementById('crTyping');
    var names=Object.keys(_typing).filter(function(u){return _me&&u!==(_me.displayName||_me.username)&&(Date.now()-_typing[u])<3500});
    if(!names.length){el.innerHTML='';return;}
    var dots='<span class="cr-typing-dots"><span></span><span></span><span></span></span>';
    if(names.length===1) el.innerHTML=dots+' <strong>'+_esc(names[0])+'</strong> is typing...';
    else if(names.length<=3) el.innerHTML=dots+' <strong>'+names.map(_esc).join('</strong>, <strong>')+'</strong> are typing...';
    else el.innerHTML=dots+' <strong>'+names.length+' people</strong> are typing...';
  }

  /* ─── Auto-resize textarea ─── */
  window.crAutoResize=function(el){el.style.height='auto';el.style.height=Math.min(el.scrollHeight,140)+'px'};

  /* ─── Socket ─── */
  if(typeof io!=='undefined'){
    _sock=io();
    var connEl=document.getElementById('crConn');
    _sock.emit('joinChat',{channel:_ch});
    _sock.on('chatMessage',function(data){
      if(data.channel===_ch){
        if(!_msgs.find(function(m){return m.id===data.message.id})){_msgs.push(data.message);renderFeed();}
      } else {
        _unread[data.channel]=(_unread[data.channel]||0)+1;_updateUnread();
      }
    });
    _sock.on('chatMessageDeleted',function(data){
      if(data.channel===_ch){_msgs=_msgs.filter(function(m){return m.id!==data.msgId});renderFeed();}
    });
    _sock.on('chatMessageEdited',function(data){
      if(data.channel===_ch){
        var idx=_msgs.findIndex(function(m){return m.id===data.message.id});
        if(idx>=0){_msgs[idx]=data.message;renderFeed();}
      }
    });
    _sock.on('chatMessageReacted',function(data){
      if(data.channel===_ch){
        var m=_msgs.find(function(x){return x.id===data.msgId});
        if(m){m.reactions=data.reactions;renderFeed();}
      }
    });
    _sock.on('chatTyping',function(data){
      if(data.channel!==_ch)return;
      _typing[data.username]=Date.now();updateTyping();
      setTimeout(function(){delete _typing[data.username];updateTyping()},3500);
    });
    _sock.on('chatMembers',function(data){
      if(data.channel===_ch) renderMembers(data.members);
    });
    _sock.on('connect',function(){
      connEl.className='cr-conn';connEl.textContent='';
      _sock.emit('joinChat',{channel:_ch});
    });
    _sock.on('disconnect',function(){
      connEl.className='cr-conn disconnected';connEl.textContent='Disconnected — reconnecting...';
    });
    _sock.on('reconnecting',function(){
      connEl.className='cr-conn reconnecting';connEl.textContent='Reconnecting...';
    });
  }

  loadCh('general');
  setInterval(function(){if(_sock)_sock.emit('joinChat',{channel:_ch})},30000);
})();
</script>`;
}
