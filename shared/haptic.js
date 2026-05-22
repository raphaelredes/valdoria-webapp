/* haptic.js — Telegram WebApp HapticFeedback (tg 6.1+) wrapper.
   2026-05-21: respeita localStorage 'valdoria_haptic' (settings toggle).
   Quando user desativa em Configurações → todas funções viram no-op. */
(function(){
  "use strict";
  var tg = window.Telegram && Telegram.WebApp;
  var _ver = tg && tg.version ? parseFloat(tg.version) : 0;
  var hf = tg && tg.HapticFeedback && _ver >= 6.1 ? tg.HapticFeedback : null;
  window.vReducedMotion = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false;

  // Check if user disabled vibration in Settings — respect their choice.
  function _enabled(){
    try { return localStorage.getItem('valdoria_haptic') !== '0'; }
    catch(_){ return true; /* default ON if storage blocked */ }
  }

  function impact(type){
    if (!_enabled()) return;
    try { if (hf) hf.impactOccurred(type || "light"); } catch(_){ console.warn('[HAPTIC]', _); }
  }
  function notify(type){
    if (!_enabled()) return;
    try { if (hf) hf.notificationOccurred(type || "success"); } catch(_){ console.warn('[HAPTIC]', _); }
  }
  function select(){
    if (!_enabled()) return;
    try { if (hf) hf.selectionChanged(); } catch(_){ console.warn('[HAPTIC]', _); }
  }

  // 2026-05-21: vHaptic é BOTH function AND object — backward compat com colisão histórica
  // entre cidade.html (function vHaptic('light')) e haptic.js (object vHaptic.tap()).
  var vh = function(kind){
    if (!_enabled()) return;
    if (kind === 'heavy')        impact('heavy');
    else if (kind === 'medium')  impact('medium');
    else if (kind === 'success') notify('success');
    else if (kind === 'warning') notify('warning');
    else if (kind === 'error')   notify('error');
    else if (kind === 'select')  select();
    else                          impact('light'); /* default 'light' */
  };
  vh.tap     = function(){ impact("light"); };
  vh.medium  = function(){ impact("medium"); };
  vh.heavy   = function(){ impact("heavy"); };
  vh.success = function(){ notify("success"); };
  vh.warning = function(){ notify("warning"); };
  vh.error   = function(){ notify("error"); };
  vh.select  = select;
  vh.impact  = impact;
  vh.notify  = notify;
  vh.burst   = function(pattern){
    if (!_enabled()) return;
    try {
      if (!hf) return;
      if (pattern === "crit"){
        hf.impactOccurred("heavy");
        setTimeout(function(){ hf.impactOccurred("heavy"); }, 100);
        setTimeout(function(){ hf.impactOccurred("heavy"); }, 200);
      } else if (pattern === "kill"){
        hf.impactOccurred("heavy");
        setTimeout(function(){ hf.notificationOccurred("success"); }, 120);
        setTimeout(function(){ hf.impactOccurred("heavy"); }, 280);
        setTimeout(function(){ hf.impactOccurred("medium"); }, 400);
      } else if (pattern === "miss"){
        hf.impactOccurred("light");
        setTimeout(function(){ hf.impactOccurred("light"); }, 80);
      }
    } catch(_){ console.warn('[HAPTIC]', _); }
  };
  window.vHaptic = vh;
})();
