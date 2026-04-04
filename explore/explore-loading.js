// EXPLORE Loading — delegates to vProcessing (processing overlay)
// Also hides shell #loading overlay (magic circle from app.html) on cold start
if(window._loadDbgSetApp)_loadDbgSetApp('EXPLORE');
(function(){
var _defaultText = 'Gerando mapa...';
var _contentSelector = '#explore-canvas';
function _hideShellLoading() {
    var lo = document.getElementById('loading');
    if (lo && !lo.classList.contains('hidden')) {
        lo.classList.add('hidden');
        lo.style.display = 'none';
        if(window._loadDbg)_loadDbg('shell #loading hidden by explore stub');
    }
}
var _ctrl = {
    show: function(isRetry) { if(window.vProcessing) vProcessing.show({text: isRetry ? 'Reconectando...' : _defaultText, contentCheck: _contentSelector}); },
    hide: function(cb) { _hideShellLoading(); if(window.vProcessing) vProcessing.hide(); if(cb) setTimeout(cb, 250); },
    forceHide: function() { _hideShellLoading(); if(window.vProcessing) vProcessing.hide(); },
    setProgress: function(pct, label) { if(window.vProcessing && label) vProcessing.setText(label); },
    setTips: function() {},
    getState: function() { return (window.vProcessing && vProcessing.isActive()) ? 'loading' : 'hidden'; },
    cleanup: function() { _hideShellLoading(); if(window.vProcessing) vProcessing.hide(); },
    hideLoading: function(cb) { this.hide(cb); },
    hideQuick: function() { this.forceHide(); }
};
window._loadingCtrl = _ctrl;
})();
