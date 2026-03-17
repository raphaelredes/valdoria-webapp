var ValdoriaMotion=(function(){'use strict';var _mql=null;var _reduced=false;function init(){if(typeof window.matchMedia!=='function')return;_mql=window.matchMedia('(prefers-reduced-motion: reduce)');_reduced=_mql.matches;try{_mql.addEventListener('change',function(e){_reduced=e.matches;});}catch(_){_mql.addListener(function(e){_reduced=e.matches;});}}
function prefersReduced(){return _reduced;}
function duration(normalMs,reducedMs){return _reduced?(reducedMs||0):normalMs;}
if(typeof document!=='undefined'){init();}
return{prefersReduced:prefersReduced,duration:duration};})();