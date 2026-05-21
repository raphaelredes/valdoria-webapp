/* SPA-NAV COMPAT (2026-05-20) — restaura helpers globais valdoriaSpaNav() e
   valdoriaSpaClose() que prologue.js/combat.js/creator-app.js/session-heartbeat.js
   ainda chamam. SPA shell foi removida em 2026-05-12 (commits 1937a383, c7ef553d,
   0a41071d). Sem essas shims, ReferenceError quebra combat-from-prologue,
   combat-exit, char-creator-redirect, e session reconnect. Definir ANTES do
   early-return-if-no-Telegram pra cobrir contexto browser puro também. */
(function(){if(typeof window==='undefined')return;if(typeof window.valdoriaSpaNav!=='function'){window.valdoriaSpaNav=function(u){if(!u){console.warn('[SPA-NAV] empty url');return;}try{window.__valdoria_transitioning=true;}catch(_){}try{window.location.replace(u);}catch(e){console.error('[SPA-NAV] replace fail',e);window.location.href=u;}};}if(typeof window.valdoriaSpaClose!=='function'){window.valdoriaSpaClose=function(){try{window.__valdoria_transitioning=true;}catch(_){}try{var tg=window.Telegram&&window.Telegram.WebApp;if(tg&&typeof tg.close==='function'){tg.close();return;}}catch(_){}try{window.close();}catch(_){}};}})();
(function(){"use strict";var tg=window.Telegram&&Telegram.WebApp;if(!tg)return;try{tg.ready();}catch(_){console.warn('[WEBAPP_INIT]',_);}
try{tg.expand();}catch(_){console.warn('[WEBAPP_INIT]',_);}
try{tg.disableVerticalSwipes();}catch(_){console.warn('[WEBAPP_INIT]',_);}
try{tg.enableClosingConfirmation();}catch(_){console.warn('[WEBAPP_INIT]',_);}
var BG='#2a2420';try{tg.setHeaderColor(BG);}catch(_){console.warn('[WEBAPP_INIT]',_);}
try{tg.setBackgroundColor(BG);}catch(_){console.warn('[WEBAPP_INIT]',_);}
function applySafeArea(){var root=document.documentElement;try{var csa=tg.contentSafeAreaInset;if(csa){root.style.setProperty('--tg-safe-top',(csa.top||0)+'px');root.style.setProperty('--tg-safe-bottom',(csa.bottom||0)+'px');root.style.setProperty('--tg-safe-left',(csa.left||0)+'px');root.style.setProperty('--tg-safe-right',(csa.right||0)+'px');}}catch(_){console.warn('[WEBAPP_INIT]',_);}
try{var sa=tg.safeAreaInset;if(sa){root.style.setProperty('--tg-device-safe-top',(sa.top||0)+'px');root.style.setProperty('--tg-device-safe-bottom',(sa.bottom||0)+'px');}}catch(_){console.warn('[WEBAPP_INIT]',_);}}
applySafeArea();try{tg.onEvent('viewportChanged',applySafeArea);}catch(_){console.warn('[WEBAPP_INIT]',_);}
try{tg.onEvent('safeAreaChanged',applySafeArea);}catch(_){console.warn('[WEBAPP_INIT]',_);}
try{tg.onEvent('contentSafeAreaChanged',applySafeArea);}catch(_){console.warn('[WEBAPP_INIT]',_);}
if(window.vHaptic){document.addEventListener('click',function(e){var el=e.target.closest('button, [role="button"], .btn-action, .btn-principal, .footer-row .btn-action, .v-popup-btn');if(el){if(el.classList.contains('btn-principal')){vHaptic.medium();}else{vHaptic.tap();}}},{passive:true});}
window.__valdoriaWebAppInit=true;})();