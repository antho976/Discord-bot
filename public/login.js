/* Login page — clean minimal interactions */
(function(){
  'use strict';

  // === Password toggle ===
  var pwToggle = document.getElementById('pwToggle');
  if (pwToggle) {
    pwToggle.addEventListener('click', function() {
      var inp = document.getElementById('password');
      inp.type = inp.type === 'password' ? 'text' : 'password';
    });
  }

  // === Submit loading state ===
  var form = document.getElementById('loginForm');
  if (form) {
    form.addEventListener('submit', function() {
      var btn = this.querySelector('.login-submit');
      btn.textContent = 'Signing in...';
      btn.style.opacity = '.7';
      btn.disabled = true;
    });
  }
})();
