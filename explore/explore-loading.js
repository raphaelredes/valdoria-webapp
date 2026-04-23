// EXPLORE Loading — delegates to vProcessing (processing overlay)
// Also hides shell #loading overlay (magic circle from app.html) on cold start

// [FASE 3 canonical 2026-04-22] REDIRECT LEGADO -> NOVO SIMULADOR
// Se por qualquer fluxo edge-case (cache mini app, URL antiga, cenario de
// fallback do navigate_api_routes) o SPA tentar carregar o explore legado,
// redireciona INSTANTANEAMENTE pra /exploracao/ (novo simulador autonomo).
// Feature flag VALDORIA_USE_NEW_EXPLORACAO=1 em DEV ja faz navigate ir
// direto pra /exploracao/; isso e so um fallback pra garantir zero
// chance do jogador ver a tela antiga. Ver docs/sistemas/exploracao-master-index.md
(function() {
  try {
    if (location.pathname.indexOf('/exploracao/') >= 0) return; // ja esta no novo, nao re-redireciona
    var qs = new URLSearchParams(location.search);
    // Preserva apenas auth params; perfil vai hidratar via defaults
    // (snap ausente -> simulador usa setupChoices default).
    var params = new URLSearchParams();
    if (qs.get('token')) params.set('token', qs.get('token'));
    if (qs.get('api')) params.set('api', qs.get('api'));
    if (qs.get('uid')) params.set('uid', qs.get('uid'));
    if (qs.get('char')) params.set('char', qs.get('char'));
    params.set('o', qs.get('return') || 'navigate');
    params.set('_cb', String(Date.now()));
    var newUrl = '/exploracao/?' + params.toString() + (location.hash || '');
    if (window._loadDbg) _loadDbg('[EXPLORE-LEGACY] redirect -> ' + newUrl);
    console.info('[EXPLORE-LEGACY] redirecting to /exploracao/ (no snap; defaults)');
    // location.replace evita entry no browser history (user nao pode voltar pra /explore/)
    location.replace(newUrl);
    // Throw pra interromper execucao do resto do explore-loading.js
    throw new Error('redirecting-to-exploracao');
  } catch (e) {
    if (e && e.message === 'redirecting-to-exploracao') throw e;
    console.warn('[EXPLORE-LEGACY] redirect attempt failed, loading legacy', e);
  }
})();

if(window._loadDbgSetApp)_loadDbgSetApp('EXPLORE');
(function(){
var _defaultText = 'Gerando mapa...';
/* #explore-canvas nunca existiu no DOM — o mapa hex é #iso-map dentro de #map-viewport */
var _contentSelector = '#map-viewport';
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
