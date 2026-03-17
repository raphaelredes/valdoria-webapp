var DeviceId=(function(){'use strict';var KEY='valdoria_device_id';function get(){try{var id=localStorage.getItem(KEY);if(!id){id=_generate();localStorage.setItem(KEY,id);}
return id;}catch(e){return'';}}
function reset(){try{localStorage.removeItem(KEY);}catch(e){}}
function _generate(){if(typeof crypto!=='undefined'&&crypto.randomUUID){return crypto.randomUUID();}
return'did_'+Date.now()+'_'+Math.random().toString(36).substring(2,11);}
return{get:get,reset:reset};})();