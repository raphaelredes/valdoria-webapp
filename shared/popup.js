(function(){'use strict';var _busy=false;var _zBase=1000;var _stack=[];function _escHandler(e){if(e.key==='Escape'&&_stack.length>0)hide();}
function _el(id){return document.getElementById(id);}
function _actionsToHtml(arr){var h='';for(var i=0;i<arr.length;i++){var a=arr[i];h+='<button class="'+(a.cls||'v-popup-btn')+'" data-action="'+(a.action||'cancel')+'">'+(a.html||a.label||'')+'</button>';}return h;}
function _ensureCardStructure(overlay){if(overlay.querySelector('.v-popup-card'))return;console.warn('[POPUP] overlay '+overlay.id+' missing card structure \u2014 auto-injecting');var card=document.createElement('div');card.className='v-popup-card';var hdr=document.createElement('div');hdr.className='v-popup-header';var body=document.createElement('div');body.className='v-popup-body';var actions=document.createElement('div');actions.className='v-popup-actions';card.appendChild(hdr);card.appendChild(body);card.appendChild(actions);overlay.appendChild(card);}
function show(opts){if(!opts)return;var overlayId=opts.id||'v-popup-overlay';var overlay=_el(overlayId);if(!overlay){console.warn('[POPUP] overlay not found:',overlayId);return;}
/* Self-heal: if overlay has no card structure, build it via DOM (fix for #51). */
_ensureCardStructure(overlay);
var headerEl=overlay.querySelector('.v-popup-header');if(headerEl){headerEl.innerHTML=opts.header||'';headerEl.className='v-popup-header'+(opts.headerClass?' '+opts.headerClass:'');}
var bodyEl=overlay.querySelector('.v-popup-body');if(bodyEl){if(opts.bodyEl){bodyEl.innerHTML='';bodyEl.appendChild(opts.bodyEl);}else{bodyEl.innerHTML=opts.body||'';}}var actionsEl=overlay.querySelector('.v-popup-actions');if(actionsEl){actionsEl.innerHTML=Array.isArray(opts.actions)?_actionsToHtml(opts.actions):(opts.actions||'');var btns=actionsEl.querySelectorAll('[data-action]');for(var i=0;i<btns.length;i++){btns[i].addEventListener('click',_makeHandler(opts.onAction));}}
if(bodyEl){var bodyBtns=bodyEl.querySelectorAll('[data-action]');for(var j=0;j<bodyBtns.length;j++){bodyBtns[j].addEventListener('click',_makeHandler(opts.onAction));}}
var existing=-1;for(var s=0;s<_stack.length;s++){if(_stack[s].el===overlay){existing=s;break;}}
if(existing>=0){_stack[existing].onHide=opts.onHide||null;}else{_zBase+=10;_stack.push({el:overlay,onHide:opts.onHide||null,z:_zBase});}
overlay.style.zIndex=_zBase;overlay.style.display='flex';overlay.classList.remove('hiding');void overlay.offsetWidth;overlay.classList.add('active');_busy=false;if(opts.onReady&&typeof opts.onReady==='function'){opts.onReady(overlay);}var _body=overlay.querySelector('.v-popup-body');if(_body){if(_body.scrollHeight>_body.clientHeight){_body.classList.add('has-scroll');}else{_body.classList.remove('has-scroll');}}
if(opts.closeOnOutside!==false){overlay.onclick=function(e){if(e.target===overlay)hide();};}
if(_stack.length===1)document.addEventListener('keydown',_escHandler);}
function hide(){if(_stack.length===0)return;var top=_stack[_stack.length-1];var ov=top.el;var cb=top.onHide;ov.classList.add('hiding');ov.classList.remove('active');setTimeout(function(){if(ov.classList.contains('active')){_busy=false;return;}ov.style.display='none';_stack.pop();if(_stack.length>0){_zBase=_stack[_stack.length-1].z;}else{_zBase=1000;document.removeEventListener('keydown',_escHandler);}
_busy=false;if(cb)cb();},300);}
function isOpen(){return _stack.length>0&&_stack[_stack.length-1].el.classList.contains('active');}
function _makeHandler(customHandler){return function(e){if(_busy)return;var action=e.currentTarget.getAttribute('data-action');if(!action)return;if(typeof haptic==='function')haptic('light');if(action==='cancel'||action==='dismiss'||action==='v-popup-close'){hide();return;}
if(customHandler){var handled=customHandler(action,e.currentTarget);if(handled)return;}
_busy=true;hide();setTimeout(function(){if(typeof doAction==='function')doAction(action);},150);};}
window.vPopup={show:show,hide:hide,isOpen:isOpen};})();
