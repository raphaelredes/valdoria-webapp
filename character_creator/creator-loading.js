// CREATOR Loading — delegates to vProcessing (processing overlay)
if(window._loadDbgSetApp)_loadDbgSetApp('CREATOR');
(function(){
var _defaultText = 'Preparando a forja de aventureiros...';
function _dismissFullLoading() { var lo = document.getElementById('loading'); if(lo && lo.style.display !== 'none') { lo.style.display = 'none'; } if(typeof hideLoading === 'function') { try { hideLoading(); } catch(e) { /* already hidden */ } } }
var _ctrl = {
    show: function(isRetry) { if(window.vProcessing) vProcessing.show({text: isRetry ? 'Reconectando...' : _defaultText, contentCheck: '.screen-viewport'}); },
    hide: function(cb) { _dismissFullLoading(); if(window.vProcessing) vProcessing.hide(); if(cb) setTimeout(cb, 250); },
    forceHide: function() { _dismissFullLoading(); if(window.vProcessing) vProcessing.hide(); },
    setProgress: function(pct, label) { if(window.vProcessing && label) vProcessing.setText(label); },
    setTips: function() {},
    getState: function() { return (window.vProcessing && vProcessing.isActive()) ? 'loading' : 'hidden'; },
    cleanup: function() { if(window.vProcessing) vProcessing.hide(); },
    hideLoading: function(cb) { this.hide(cb); },
    hideQuick: function() { this.forceHide(); }
};
window._creatorLoadingCtrl = _ctrl;
})();
