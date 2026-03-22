(function(){'use strict';var _transitioning=false;
function open(id){if(_transitioning)return;var el=document.getElementById(id);if(!el)return;_transitioning=true;el.classList.add('active');var parent=el.closest('.screen');if(parent){parent.scrollTop=0;parent.classList.add('sub-open');}
setTimeout(function(){_transitioning=false;},350);}
function close(id){var el=document.getElementById(id);if(!el)return;el.classList.remove('active');var parent=el.closest('.screen');if(parent&&!parent.querySelector('.v-drawer.active,.sub-screen.active')){parent.classList.remove('sub-open');}}
function closeAll(){document.querySelectorAll('.v-drawer.active,.sub-screen.active').forEach(function(s){s.classList.remove('active');var parent=s.closest('.screen');if(parent)parent.classList.remove('sub-open');});}
function isOpen(){return!!document.querySelector('.v-drawer.active,.sub-screen.active');}
function getTopOpen(){return document.querySelector('.v-drawer.active,.sub-screen.active');}
window.vDrawer={open:open,close:close,closeAll:closeAll,isOpen:isOpen,getTopOpen:getTopOpen};})();
