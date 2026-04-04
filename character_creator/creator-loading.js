// CREATOR Loading — delegates to vProcessing (processing overlay)
if(window._loadDbgSetApp)_loadDbgSetApp('CREATOR');
(function(){
var _defaultText = 'Preparando a forja de aventureiros...';
var _ctrl = {
    show: function(isRetry) { if(window.vProcessing) vProcessing.show({text: isRetry ? 'Reconectando...' : _defaultText, contentCheck: '.screen-viewport'}); },
    hide: function(cb) { if(window.vProcessing) vProcessing.hide(); if(cb) setTimeout(cb, 250); },
    forceHide: function() { if(window.vProcessing) vProcessing.hide(); },
    setProgress: function(pct, label) { if(window.vProcessing && label) vProcessing.setText(label); },
    setTips: function() {},
    getState: function() { return (window.vProcessing && vProcessing.isActive()) ? 'loading' : 'hidden'; },
    cleanup: function() { if(window.vProcessing) vProcessing.hide(); },
    hideLoading: function(cb) { this.hide(cb); },
    hideQuick: function() { this.forceHide(); }
};
window._creatorLoadingCtrl = _ctrl;
})();
