/**
 * SPA Watchdog Sentinel — detects blank screens per-route
 *
 * Industry pattern (Fortnite/Roblox/Genshin): each route "feeds" the watchdog
 * when it renders successfully. If no feed within timeout, recovery fires.
 *
 * API:
 *   SpaWatchdog.start(routeName, checkFn, timeoutMs)
 *   SpaWatchdog.feed()    — resets timer (route rendered OK)
 *   SpaWatchdog.stop()    — cancels (router calls on cleanup)
 */
(function(){"use strict";
var _timer=null;
var _routeName=null;
var _checkFn=null;
var _timeoutMs=0;
var _fired=false;

function _onFire(){
    _timer=null;
    if(_fired)return;
    var ok=false;
    try{ok=_checkFn?_checkFn():true;}catch(e){console.error("[WATCHDOG] checkFn error:",e);ok=false;}
    if(ok){
        /* Content is visible — restart timer for continued monitoring */
        _timer=setTimeout(_onFire,_timeoutMs);
        return;
    }
    _fired=true;
    console.error("[WATCHDOG] blank screen detected route="+_routeName);
    if(window.ValdoriaErrors)ValdoriaErrors.log("WATCHDOG: blank_screen route="+_routeName);
    _showRecovery(_routeName);
}

function _showRecovery(route){
    if(window.vPopup){
        try{
            vPopup.show({
                header:"\u26a0\ufe0f Tela em Branco",
                body:'<div style="text-align:center;color:var(--v-text-dim);font-size:var(--v-font-sm)">A tela ficou em branco.<br>Isso pode ser um erro tempor\u00e1rio.</div>',
                actions:[
                    {label:"Recarregar",cls:"v-popup-btn v-popup-btn--primary",action:"reload"},
                    {label:"Voltar ao Jogo",cls:"v-popup-btn v-popup-btn--secondary",action:"back"}
                ],
                onAction:function(a){
                    if(a==="reload"){vPopup.hide();if(window._hardReload)_hardReload();else location.reload();return true;}
                    if(a==="back"){vPopup.hide();if(window.SpaRouter&&route!=="game"){SpaRouter.navigate("game");}else if(window._hardReload){_hardReload();}else{location.reload();}return true;}
                },
                closeOnOutside:false
            });
            return;
        }catch(e){console.warn("[WATCHDOG] vPopup error:",e);}
    }
    if(typeof showError==="function"){showError("A tela ficou em branco. Tente novamente.");return;}
    if(window._hardReload)_hardReload();else location.reload();
}

window.SpaWatchdog={
    start:function(routeName,checkFn,timeoutMs){
        this.stop();
        _routeName=routeName;
        _checkFn=checkFn;
        _timeoutMs=timeoutMs||25000;
        _fired=false;
        _timer=setTimeout(_onFire,_timeoutMs);
        if(window._loadDbg)_loadDbg("watchdog start route="+routeName+" timeout="+_timeoutMs+"ms");
    },
    feed:function(){
        if(!_timer&&!_fired)return;
        if(_fired)return;
        clearTimeout(_timer);
        _timer=setTimeout(_onFire,_timeoutMs);
    },
    stop:function(){
        if(_timer){clearTimeout(_timer);_timer=null;}
        _routeName=null;
        _checkFn=null;
        _fired=false;
    },
    isActive:function(){return!!_timer;},
    routeName:function(){return _routeName;}
};
})();
