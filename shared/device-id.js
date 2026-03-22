var DeviceId=(function(){'use strict';var KEY='valdoria_device_id';function get(){try{var id=localStorage.getItem(KEY);if(!id){try{id=sessionStorage.getItem(KEY);}catch(e){console.warn('[DEVICE_ID]',e);}}
if(!id){id=_generate();}
try{localStorage.setItem(KEY,id);sessionStorage.setItem(KEY,id);}catch(e){console.warn('[DEVICE_ID]',e);}
return id;}catch(e){return'';}}
function reset(){try{localStorage.removeItem(KEY);sessionStorage.removeItem(KEY);}catch(e){console.warn('[DEVICE_ID]',e);}}
function _generate(){if(typeof crypto!=='undefined'&&crypto.randomUUID){return crypto.randomUUID();}
return'did_'+Date.now()+'_'+Math.random().toString(36).substring(2,11);}
return{get:get,reset:reset};})();