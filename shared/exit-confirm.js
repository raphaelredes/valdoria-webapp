(function(){"use strict";var tg=window.Telegram&&Telegram.WebApp;var _popupVisible=false;var _overlay=null;var _savedHeartbeatCfg=null;function _ensureDOM(){if(_overlay)return;var div=document.createElement('div');div.innerHTML='<div id="v-exit-overlay" class="v-exit-overlay" style="display:none">'+'<div class="v-exit-box">'+'<div class="v-exit-icon">\u2694\uFE0F</div>'+'<div class="v-exit-title">Encerrar Aventura?</div>'+'<div class="v-exit-msg">Deseja realmente sair do jogo?</div>'+'<div class="v-exit-buttons">'+'<button id="v-exit-stay" class="v-exit-btn v-exit-btn-stay">Continuar Jogando</button>'+'<button id="v-exit-leave" class="v-exit-btn v-exit-btn-leave">Sair</button>'+'</div>'+'</div>'+'</div>';document.body.appendChild(div.firstChild);_overlay=document.getElementById('v-exit-overlay');document.getElementById('v-exit-stay').addEventListener('click',function(){_hide();});document.getElementById('v-exit-leave').addEventListener('click',function(){if(_overlay)_overlay.style.display='none';_popupVisible=false;_doExit();});_overlay.addEventListener('click',function(e){if(e.target===_overlay)_hide();});}
function _resolveHeartbeatCfg(){var api='',tk='',uid=0;if(window.S){api=S.apiBase||S.api||'';tk=S.token||'';uid=parseInt(S.uid)||0;}
if(!api&&typeof apiBase!=='undefined')api=apiBase;if(!tk&&typeof token!=='undefined')tk=token;if(!uid&&typeof userId!=='undefined')uid=parseInt(userId)||0;if(api&&tk&&uid)return{apiBase:api,token:tk,uid:uid};return null;}
function _show(){_ensureDOM();_overlay.style.display='';_popupVisible=true;if(window.vHaptic)vHaptic.medium();if(window.SessionHeartbeat){_savedHeartbeatCfg=_resolveHeartbeatCfg();SessionHeartbeat.stop();}}
function _hide(){if(!_overlay)return;_overlay.style.display='none';_popupVisible=false;if(window.SessionHeartbeat&&_savedHeartbeatCfg){try{SessionHeartbeat.init(_savedHeartbeatCfg);}catch(e){}
_savedHeartbeatCfg=null;}}
function _doExit(){if(window.__valdoriaExitAction){try{window.__valdoriaExitAction();}catch(e){console.warn('[EXIT-CONFIRM] custom exit failed:',e);}
return;}
if(tg){try{tg.close();}catch(e){console.warn('[EXIT-CONFIRM] tg.close:',e);}}}
function showExitConfirm(){if(window.__valdoriaExitBypass){_doExit();return;}
if(_popupVisible){_hide();return;}
_show();}
function isExitPopupVisible(){return _popupVisible;}
function hideExitConfirm(){_hide();}
window.ValdoriaExitConfirm={show:showExitConfirm,hide:hideExitConfirm,isVisible:isExitPopupVisible,};if(tg&&tg.BackButton){try{tg.BackButton.show();}catch(e){}
try{tg.BackButton.onClick(function(){showExitConfirm();});}catch(e){}}
if(!window.__valdoriaPopstateTrap){window.__valdoriaPopstateTrap=true;history.replaceState({screen:'valdoria_init'},'');history.pushState({screen:'valdoria_app'},'');window.addEventListener('popstate',function(){history.pushState({screen:'valdoria_app'},'');if(window.__valdoria_transitioning)return;showExitConfirm();});}})();