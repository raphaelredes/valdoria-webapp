/* spa-nav-compat.js — global shims for legacy SPA helpers.
   SPA shell foi removida em 2026-05-12 (commits 1937a383, c7ef553d, 0a41071d),
   mas prologue.js, combat.js, creator-app.js e session-heartbeat.js ainda
   chamam valdoriaSpaNav() / valdoriaSpaClose(). Esses callers ficaram quebrados
   com ReferenceError. Esta shim restaura comportamento esperado:
   - valdoriaSpaNav(url): window.location.replace(url) + transitioning flag.
   - valdoriaSpaClose(): Telegram.WebApp.close() OU window.close() fallback.
   Carrega ANTES de session-heartbeat.js (ver entry HTMLs). */
(function(){
  if (typeof window === 'undefined') return;
  if (typeof window.valdoriaSpaNav !== 'function') {
    window.valdoriaSpaNav = function(url){
      if (!url) { console.warn('[SPA-NAV] valdoriaSpaNav called without url'); return; }
      try { window.__valdoria_transitioning = true; } catch(_){}
      try { window.location.replace(url); }
      catch(e){ console.error('[SPA-NAV] replace failed', e); window.location.href = url; }
    };
  }
  if (typeof window.valdoriaSpaClose !== 'function') {
    window.valdoriaSpaClose = function(){
      try { window.__valdoria_transitioning = true; } catch(_){}
      try {
        var tg = window.Telegram && window.Telegram.WebApp;
        if (tg && typeof tg.close === 'function') { tg.close(); return; }
      } catch(_){}
      try { window.close(); } catch(_){}
    };
  }
})();
