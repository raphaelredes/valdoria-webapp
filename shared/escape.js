/* shared/escape.js — escaper de HTML canônico do projeto (A1.1, auditoria #90).
   window.vEsc(s): escapa & < > " ' — cobertura COMPLETA (segura em atributo).
   String(s == null ? '' : s) preserva 0/false (NÃO usar !s, que viraria '').
   Consumidores delegam via `typeof vEsc==='function' ? vEsc(s) : <fallback>`. */
(function(){'use strict';
var MAP={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'};
function vEsc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return MAP[c];});}
window.vEsc=vEsc;
})();
