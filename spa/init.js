(function(){"use strict";function bootstrap(){var params=new URLSearchParams(window.location.search);var route=params.get("route")||"game";var routeParams={};params.forEach(function(val,key){if(key!=="route")routeParams[key]=val;});
/* Skip title screen + loading overlay for non-game routes (e.g. character_creator from web login) */
if(route!=="game"){if(window.__introTitle){try{window.__introTitle.hide();}catch(e){}};var _ts=document.getElementById("title-screen");if(_ts)_ts.remove();var _lo=document.getElementById("loading");if(_lo)_lo.style.display="none";}
SpaRouter.navigate(route,routeParams);}
if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",bootstrap);}else{bootstrap();}})();