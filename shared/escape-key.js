(function(){'use strict';var _handlers=[];
function register(checkFn,closeFn){_handlers.push({check:checkFn,close:closeFn});}
function _onKey(e){if(e.key!=='Escape')return;for(var i=_handlers.length-1;i>=0;i--){if(_handlers[i].check()){e.preventDefault();e.stopPropagation();_handlers[i].close();return;}}}
document.addEventListener('keydown',_onKey,true);
window.vEscapeKey={register:register};})();
