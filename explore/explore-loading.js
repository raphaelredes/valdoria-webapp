// EXPLORE Loading — delegates to vProcessing (processing overlay)
if(window._loadDbgSetApp)_loadDbgSetApp('EXPLORE');
(function(){
var _defaultText = 'Gerando mapa...';
var _ctrl = {
    show: function(isRetry) { if(window.vProcessing) vProcessing.show({text: isRetry ? 'Reconectando...' : _defaultText}); },
    hide: function(cb) { if(window.vProcessing) vProcessing.hide(); if(cb) setTimeout(cb, 250); },
    forceHide: function() { if(window.vProcessing) vProcessing.hide(); },
    setProgress: function(pct, label) { if(window.vProcessing && label) vProcessing.setText(label); },
    setTips: function() {},
    getState: function() { return (window.vProcessing && vProcessing.isActive()) ? 'loading' : 'hidden'; },
    cleanup: function() { if(window.vProcessing) vProcessing.hide(); },
    hideLoading: function(cb) { this.hide(cb); },
    hideQuick: function() { this.forceHide(); }
};
window._loadingCtrl = _ctrl;
})();
