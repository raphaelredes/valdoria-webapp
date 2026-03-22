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
if(window.vHaptic){document.addEventListener('click',function(e){var el=e.target.closest('button, [role="button"], .btn-action, .btn-hero, .footer-row .btn-action');if(el){if(el.classList.contains('btn-hero')){vHaptic.medium();}else{vHaptic.tap();}}},{passive:true});}
window.__valdoriaWebAppInit=true;})();