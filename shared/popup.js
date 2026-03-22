(function(){'use strict';var _busy=false;var _zBase=1000;var _stack=[];function _el(id){return document.getElementById(id);}
function show(opts){if(!opts)return;var overlayId=opts.id||'v-popup-overlay';var overlay=_el(overlayId);if(!overlay){console.warn('[POPUP] overlay not found:',overlayId);return;}
var headerEl=overlay.querySelector('.v-popup-header');if(headerEl){headerEl.innerHTML=opts.header||'';headerEl.className='v-popup-header'+(opts.headerClass?' '+opts.headerClass:'');}
var bodyEl=overlay.querySelector('.v-popup-body');if(bodyEl)bodyEl.innerHTML=opts.body||'';var actionsEl=overlay.querySelector('.v-popup-actions');if(actionsEl){actionsEl.innerHTML=opts.actions||'';var btns=actionsEl.querySelectorAll('[data-action]');for(var i=0;i<btns.length;i++){btns[i].addEventListener('click',_makeHandler(opts.onAction));}}
if(bodyEl){var bodyBtns=bodyEl.querySelectorAll('[data-action]');for(var j=0;j<bodyBtns.length;j++){bodyBtns[j].addEventListener('click',_makeHandler(opts.onAction));}}
var existing=-1;for(var s=0;s<_stack.length;s++){if(_stack[s].el===overlay){existing=s;break;}}
if(existing>=0){_stack[existing].onHide=opts.onHide||null;}else{_zBase+=10;_stack.push({el:overlay,onHide:opts.onHide||null,z:_zBase});}
overlay.style.zIndex=_zBase;overlay.style.display='flex';overlay.classList.remove('hiding');void overlay.offsetWidth;overlay.classList.add('active');_busy=false;if(opts.closeOnOutside!==false){overlay.onclick=function(e){if(e.target===overlay)hide();};}}
function hide(){if(_stack.length===0)return;var top=_stack[_stack.length-1];var ov=top.el;var cb=top.onHide;ov.classList.add('hiding');ov.classList.remove('active');setTimeout(function(){if(ov)ov.style.display='none';_stack.pop();if(_stack.length>0){_zBase=_stack[_stack.length-1].z;}else{_zBase=1000;}
_busy=false;if(cb)cb();},300);}
function isOpen(){return _stack.length>0&&_stack[_stack.length-1].el.classList.contains('active');}
function _makeHandler(customHandler){return function(e){if(_busy)return;var action=e.currentTarget.getAttribute('data-action');if(!action)return;if(typeof haptic==='function')haptic('light');if(action==='cancel'||action==='v-popup-close'){hide();return;}
if(customHandler){var handled=customHandler(action,e.currentTarget);if(handled)return;}
_busy=true;hide();setTimeout(function(){if(typeof doAction==='function')doAction(action);},150);};}
window.vPopup={show:show,hide:hide,isOpen:isOpen};})();