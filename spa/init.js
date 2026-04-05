(function(){"use strict";function bootstrap(){var params=new URLSearchParams(window.location.search);var route=params.get("route")||"game";var routeParams={};params.forEach(function(val,key){if(key!=="route")routeParams[key]=val;});
/* Skip title screen for non-game routes (e.g. character_creator from web login) */
if(route!=="game"&&window.__introTitle){try{window.__introTitle.hide();}catch(e){}var el=document.getElementById("title-screen");if(el)el.remove();}
SpaRouter.navigate(route,routeParams);}
if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",bootstrap);}else{bootstrap();}})();