/* Select-server page — clean minimal interactions */
(function(){
  'use strict';

  // === SERVER SELECTION (uses data-guild-id) ===
  function selectServer(guildId) {
    var cards = document.querySelectorAll('.server-card');
    var clicked = null;
    cards.forEach(function(c) { if (c.dataset.guildId === guildId) clicked = c; });
    if (clicked) {
      clicked.style.opacity = '0.6';
      cards.forEach(function(c) { if (c !== clicked) c.style.opacity = '0.3'; });
    }
    var csrf = (document.cookie.match(/(?:^|;\s*)_csrf=([^;]*)/) || [])[1] || '';
    fetch('/api/select-server', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      body: JSON.stringify({ guildId: guildId })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (d.success) {
        window.location.href = '/';
      } else {
        alert(d.error || 'Error');
        if (clicked) {
          clicked.style.opacity = '';
          cards.forEach(function(c) { c.style.opacity = ''; });
        }
      }
    });
  }

  // Bind click to all server-card buttons
  document.querySelectorAll('.server-card[data-guild-id]').forEach(function(card) {
    card.addEventListener('click', function() { selectServer(card.dataset.guildId); });
  });

  // === AUTO-RELOAD if no guilds found ===
  if (document.body.dataset.hasGuilds !== '1') {
    setTimeout(function() { location.reload(); }, 3000);
  }
})();
