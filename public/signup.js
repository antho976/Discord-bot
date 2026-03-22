/* Signup page interactions – loaded externally to satisfy CSP & Safe Browsing */
(function(){
  'use strict';
  document.getElementById('signupForm').addEventListener('submit',function(){
    var btn=document.getElementById('signupBtn');
    btn.textContent='Creating...';
    btn.style.opacity='.7';
    btn.disabled=true;
  });
})();
