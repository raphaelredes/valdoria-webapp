/**
 * Console Collector — captura console.error/warn em ring buffer.
 * error-reporter.js usa window.__valdoria_getConsoleBuffer() para
 * incluir logs do console no report de erro enviado ao admin.
 *
 * Carregar ANTES de error-reporter.js em cada WebApp.
 */
(function(){
'use strict';
var _MAX=50;
var _buf=[];
var _origError=console.error;
var _origWarn=console.warn;
function _push(level,args){
var msg='';
try{msg=Array.prototype.slice.call(args).map(function(a){
return typeof a==='string'?a:(a&&a.message?a.message:JSON.stringify(a));
}).join(' ').substring(0,200);}catch(e){msg='[unserializable]';}
_buf.push({ts:new Date().toISOString(),level:level,msg:msg});
if(_buf.length>_MAX)_buf.shift();
}
console.error=function(){_push('E',arguments);_origError.apply(console,arguments);};
console.warn=function(){_push('W',arguments);_origWarn.apply(console,arguments);};
window.__valdoria_getConsoleBuffer=function(){return _buf.slice();};
})();
