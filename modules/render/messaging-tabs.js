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
.chat-container{display:grid;grid-template-columns:220px 1fr 200px;height:calc(100vh - 140px);gap:0;border:1px solid var(--border-main);border-radius:12px;overflow:hidden;background:var(--bg-card)}
.chat-channels{background:var(--bg-input);border-right:1px solid var(--border-main);display:flex;flex-direction:column}
.chat-channels-hdr{padding:14px 16px;border-bottom:1px solid var(--border-main)}
.chat-channels-hdr h3{margin:0;font-size:14px;color:var(--text-primary)}
.chat-ch-list{flex:1;overflow-y:auto;padding:6px}
.chat-ch-item{padding:8px 12px;border-radius:8px;cursor:pointer;font-size:13px;color:var(--text-secondary);transition:all 0.15s;display:flex;align-items:center;gap:6px}
.chat-ch-item:hover{background:var(--bg-hover);color:var(--text-primary)}
.chat-ch-item.active{background:rgba(91,91,255,0.15);color:var(--text-primary);font-weight:600}
.chat-main{display:flex;flex-direction:column;height:100%}
.chat-main-hdr{padding:12px 16px;border-bottom:1px solid var(--border-main);display:flex;align-items:center;gap:8px}
.chat-main-hdr-name{font-size:14px;font-weight:600;color:var(--text-primary)}
.chat-main-hdr-desc{font-size:11px;color:var(--text-secondary)}
.chat-feed{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:6px}
.chat-msg{display:flex;gap:10px;animation:dmFadeIn 0.2s ease}
.chat-msg-avatar{width:36px;height:36px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:14px;color:#fff;flex-shrink:0;margin-top:2px;overflow:hidden}
.chat-msg-avatar img{width:100%;height:100%;object-fit:cover}
.chat-msg-content{flex:1;min-width:0}
.chat-msg-header{display:flex;align-items:baseline;gap:6px}
.chat-msg-name{font-size:13px;font-weight:600;color:var(--text-primary)}
.chat-msg-ts{font-size:10px;color:var(--text-muted)}
.chat-msg-body{font-size:13px;color:var(--text-primary);line-height:1.5;margin-top:2px;white-space:pre-wrap;word-break:break-word}
.chat-input-bar{padding:12px 16px;border-top:1px solid var(--border-main);display:flex;gap:8px;align-items:flex-end}
.chat-input-bar textarea{flex:1;padding:10px 14px;border:1px solid var(--border-input);border-radius:10px;background:var(--bg-input);color:var(--text-primary);font-size:13px;resize:none;min-height:20px;max-height:120px;line-height:1.4;font-family:inherit}
.chat-input-bar textarea:focus{border-color:var(--accent);outline:none}
.chat-members{background:var(--bg-input);border-left:1px solid var(--border-main);display:flex;flex-direction:column}
.chat-members-hdr{padding:12px 16px;border-bottom:1px solid var(--border-main);font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px}
.chat-members-list{flex:1;overflow-y:auto;padding:6px}
.chat-member{padding:6px 10px;display:flex;align-items:center;gap:8px;border-radius:6px;font-size:12px;color:var(--text-primary)}
.chat-member-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.chat-member-dot.online{background:#2ecc71}
.chat-member-dot.offline{background:#666}
.chat-typing{padding:4px 16px;font-size:11px;color:var(--text-secondary);font-style:italic;min-height:20px}
@media(max-width:900px){.chat-container{grid-template-columns:1fr;height:auto}.chat-channels,.chat-members{display:none}}
</style>

<div class="chat-container">
  <!-- Channels sidebar -->
  <div class="chat-channels">
    <div class="chat-channels-hdr"><h3>💬 Channels</h3></div>
    <div class="chat-ch-list" id="chatChannelList">
      <div class="chat-ch-item active" onclick="chatSwitchChannel('general')" data-ch="general"># general</div>
      <div class="chat-ch-item" onclick="chatSwitchChannel('off-topic')" data-ch="off-topic"># off-topic</div>
      <div class="chat-ch-item" onclick="chatSwitchChannel('announcements')" data-ch="announcements">📢 announcements</div>
      <div class="chat-ch-item" onclick="chatSwitchChannel('bot-dev')" data-ch="bot-dev">🤖 bot-dev</div>
      <div class="chat-ch-item" onclick="chatSwitchChannel('help')" data-ch="help">❓ help</div>
    </div>
  </div>

  <!-- Main chat area -->
  <div class="chat-main">
    <div class="chat-main-hdr">
      <span style="font-size:16px">#</span>
      <div>
        <div class="chat-main-hdr-name" id="chatChName">general</div>
        <div class="chat-main-hdr-desc" id="chatChDesc">General discussion for the dashboard team</div>
      </div>
    </div>
    <div class="chat-feed" id="chatFeed">
      <div style="text-align:center;color:var(--text-secondary);font-size:12px;padding:20px 0">Loading messages...</div>
    </div>
    <div class="chat-typing" id="chatTyping"></div>
    <div class="chat-input-bar">
      <textarea id="chatInput" rows="1" placeholder="Message #general" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();chatSendMsg();}" oninput="chatNotifyTyping()"></textarea>
      <button class="dm-send-btn" onclick="chatSendMsg()">➤</button>
    </div>
  </div>

  <!-- Online members -->
  <div class="chat-members">
    <div class="chat-members-hdr">Online — <span id="chatOnlineCount">0</span></div>
    <div class="chat-members-list" id="chatMembersList"></div>
  </div>
</div>

<script>
(function(){
  var _channel='general', _messages=[], _myUser=null, _chatSock=null, _typingTimeout=null, _typingUsers={};
  var channelDescs={general:'General discussion for the dashboard team','off-topic':'Casual chat and fun stuff',announcements:'Important announcements','bot-dev':'Bot development discussion',help:'Ask for help here'};

  fetch('/api/accounts/me').then(function(r){return r.json()}).then(function(d){
    if(d.success) _myUser={id:d.id,username:d.username,displayName:d.displayName,customAvatar:d.customAvatar};
  });

  function loadChannel(ch){
    _channel=ch;
    document.getElementById('chatChName').textContent=ch;
    document.getElementById('chatChDesc').textContent=channelDescs[ch]||'';
    document.getElementById('chatInput').placeholder='Message #'+ch;
    document.querySelectorAll('.chat-ch-item').forEach(function(el){el.classList.toggle('active',el.getAttribute('data-ch')===ch);});
    fetch('/api/messaging/chat/'+encodeURIComponent(ch)+'/messages').then(function(r){return r.json()}).then(function(d){
      if(d.success){_messages=d.messages||[];renderFeed();}
    });
    // Join room via socket
    if(_chatSock){_chatSock.emit('joinChat',{channel:ch});}
  }

  function renderFeed(){
    var el=document.getElementById('chatFeed');
    if(!_messages.length){el.innerHTML='<div style="text-align:center;color:var(--text-secondary);font-size:12px;padding:40px 0">No messages yet. Start the conversation! 🎉</div>';return;}
    var html='',lastDay='';
    _messages.forEach(function(m){
      var day=new Date(m.createdAt).toLocaleDateString();
      if(day!==lastDay){html+='<div class="dm-day-sep"><span>'+day+'</span></div>';lastDay=day;}
      var time=new Date(m.createdAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
      var av=m.avatar?'<img src="'+_esc(m.avatar)+'">':((m.displayName||m.username||'?')[0].toUpperCase());
      html+='<div class="chat-msg"><div class="chat-msg-avatar">'+av+'</div><div class="chat-msg-content"><div class="chat-msg-header"><span class="chat-msg-name">'+_esc(m.displayName||m.username)+'</span><span class="chat-msg-ts">'+time+'</span></div><div class="chat-msg-body">'+_esc(m.body)+'</div></div></div>';
    });
    el.innerHTML=html;
    el.scrollTop=el.scrollHeight;
  }

  function renderMembers(members){
    var el=document.getElementById('chatMembersList');
    var online=(members||[]).filter(function(m){return m.online;});
    var offline=(members||[]).filter(function(m){return !m.online;});
    document.getElementById('chatOnlineCount').textContent=online.length;
    var html='';
    online.forEach(function(m){html+='<div class="chat-member"><div class="chat-member-dot online"></div>'+_esc(m.displayName||m.username)+'</div>';});
    offline.forEach(function(m){html+='<div class="chat-member"><div class="chat-member-dot offline"></div><span style="opacity:0.5">'+_esc(m.displayName||m.username)+'</span></div>';});
    el.innerHTML=html||'<div style="padding:8px;color:var(--text-secondary);font-size:11px">No users</div>';
  }

  window.chatSwitchChannel=function(ch){loadChannel(ch);};

  window.chatSendMsg=function(){
    if(!_myUser)return;
    var input=document.getElementById('chatInput');
    var text=input.value.trim();
    if(!text)return;
    input.value='';
    // Optimistic add
    var msg={id:'tmp-'+Date.now(),username:_myUser.username,displayName:_myUser.displayName,avatar:_myUser.customAvatar,body:text,createdAt:Date.now()};
    _messages.push(msg);renderFeed();
    fetch('/api/messaging/chat/'+encodeURIComponent(_channel)+'/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({body:text})})
      .then(function(r){return r.json()}).then(function(d){
        if(d.success&&d.message){var idx=_messages.findIndex(function(m){return m.id===msg.id;});if(idx>=0)_messages[idx]=d.message;}
      });
  };

  window.chatNotifyTyping=function(){
    if(_chatSock&&_myUser){
      _chatSock.emit('chatTyping',{channel:_channel,username:_myUser.displayName||_myUser.username});
    }
  };

  // Real-time chat
  if(typeof io!=='undefined'){
    _chatSock=io();
    _chatSock.emit('joinChat',{channel:_channel});

    _chatSock.on('chatMessage',function(data){
      if(data.channel===_channel){
        // Don't duplicate optimistic messages
        if(!_messages.find(function(m){return m.id===data.message.id;})){
          _messages.push(data.message);renderFeed();
        }
      }
    });

    _chatSock.on('chatTyping',function(data){
      if(data.channel!==_channel)return;
      _typingUsers[data.username]=Date.now();
      updateTyping();
      setTimeout(function(){delete _typingUsers[data.username];updateTyping();},3000);
    });

    _chatSock.on('chatMembers',function(data){
      if(data.channel===_channel)renderMembers(data.members);
    });

    // Request members on connect
    _chatSock.on('connect',function(){
      _chatSock.emit('joinChat',{channel:_channel});
    });
  }

  function updateTyping(){
    var el=document.getElementById('chatTyping');
    var names=Object.keys(_typingUsers).filter(function(u){return _myUser&&u!==(_myUser.displayName||_myUser.username)&&(Date.now()-_typingUsers[u])<3000;});
    if(names.length===0)el.textContent='';
    else if(names.length===1)el.textContent=names[0]+' is typing...';
    else if(names.length<=3)el.textContent=names.join(', ')+' are typing...';
    else el.textContent=names.length+' people are typing...';
  }

  function _esc(s){return s?String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'):''}

  loadChannel('general');
  // Poll members every 30s
  setInterval(function(){if(_chatSock)_chatSock.emit('joinChat',{channel:_channel});},30000);
})();
</script>`;
}
