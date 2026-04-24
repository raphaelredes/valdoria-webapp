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

    // X-6.5.18c (2026-04-24) FIX CRÍTICO: preserva snap/delta/map_id ao
    // redirecionar do path legado /explore/ pro /exploracao/. Antes o redirect
    // descartava esses params → simulador caía em defaults random (Wilzen
    // nv9 Bárbaro aparecia como Paladino 12/12 HP).
    //
    // DUPLA FONTE de params:
    //  1. window.__spaRouteParams — SPA router (game-transitions.js passa
    //     params via este objeto, não via URL). É a fonte PRIMÁRIA quando
    //     chegamos aqui via SPA.
    //  2. location.search — cold start direto ou fallback.
    //
    // Merge: __spaRouteParams sobrescreve URL (SPA tem dado mais fresco).
    var qs = new URLSearchParams(location.search);
    var spaP = window.__spaRouteParams || {};
    function _pick(key) {
      var v = spaP[key];
      if (v != null && v !== '') return v;
      return qs.get(key);
    }

    var params = new URLSearchParams();
    // Auth core (token, api, uid, char) — essencial
    if (_pick('token')) params.set('token', _pick('token'));
    if (_pick('api')) params.set('api', _pick('api'));
    if (_pick('uid')) params.set('uid', _pick('uid'));
    if (_pick('char')) params.set('char', _pick('char'));
    // X-6.5.18c: preservar contexto de profile + sessão do server
    if (_pick('snap')) params.set('snap', _pick('snap'));        // perfil b64
    if (_pick('delta')) params.set('delta', _pick('delta'));     // retorno combate
    if (_pick('map_id')) params.set('map_id', _pick('map_id'));  // mapa ativo
    // Origem da navegação (return = legacy; o = novo)
    params.set('o', _pick('o') || _pick('return') || 'navigate');
    params.set('_cb', String(Date.now()));
    var newUrl = '/exploracao/?' + params.toString() + (location.hash || '');
    var _snapLen = (_pick('snap') || '').length;
    if (window._loadDbg) _loadDbg('[EXPLORE-LEGACY] redirect -> ' + newUrl.slice(0, 120) + '...');
    console.info('[EXPLORE-LEGACY] redirecting to /exploracao/'
      + ' snap=' + (_snapLen ? 'yes(' + _snapLen + ')' : 'no')
      + ' delta=' + (_pick('delta') ? 'yes' : 'no')
      + ' map=' + (_pick('map_id') || '?')
      + ' src=' + (spaP.snap ? 'spaRoute' : (qs.get('snap') ? 'urlSearch' : 'none')));
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
