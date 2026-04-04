/* ── Version Check — Detect stale WebApp and prompt reload (v1.0) ── */
/* Compares embedded __APP_VERSION with server /api/webapp/version.
   If mismatch, shows "Atualização Disponível" overlay.
   Fails silently on network errors (game still works with cached version). */
(function() {
  'use strict';

  var _CHECK_TIMEOUT = 5000; /* ms — don't block loading */
  var _checked = false;

  /**
   * Check if current WebApp is up-to-date.
   * Call once during init, after API base URL is known.
   * @param {string} apiBase — e.g. 'https://xxx.trycloudflare.com'
   */
  window.checkWebAppVersion = function(apiBase) {
    if (_checked) return;
    _checked = true;

    var clientVersion = window.__APP_VERSION || '';
    if (!clientVersion || !apiBase) {
      console.log('[VERSION] Skipped — no client version or API base');
      return;
    }

    var url = apiBase.replace(/\/+$/, '') + '/api/webapp/version';
    console.log('[VERSION] Checking: client=' + clientVersion + ' server=' + url);

    var ctrl = new AbortController();
    var timer = setTimeout(function() { ctrl.abort(); }, _CHECK_TIMEOUT);

    fetch(url, {
      cache: 'no-store',
      signal: ctrl.signal,
      headers: { 'Accept': 'application/json' }
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      clearTimeout(timer);
      var serverVersion = data && data.v;
      console.log('[VERSION] Server version: ' + serverVersion);

      if (!serverVersion || serverVersion === 'unknown') return;
      if (serverVersion === clientVersion) {
        console.log('[VERSION] Up to date');
        return;
      }

      console.warn('[VERSION] MISMATCH — client=' + clientVersion + ' server=' + serverVersion);
      _showUpdateOverlay();
    })
    .catch(function(e) {
      clearTimeout(timer);
      /* Fail silently — network error or timeout, game still works */
      console.warn('[VERSION] Check failed (non-blocking):', e.name || e);
    });
  };

  /** Show "Atualização Disponível" overlay */
  function _showUpdateOverlay() {
    /* Build overlay via DOM (safe, no user input) */
    var overlay = document.createElement('div');
    overlay.className = 'vc-overlay';

    var icon = document.createElement('div');
    icon.className = 'vc-icon';
    icon.textContent = '\u2728'; /* sparkles */
    overlay.appendChild(icon);

    var title = document.createElement('div');
    title.className = 'vc-title';
    title.textContent = 'Nova Vers\u00E3o Dispon\u00EDvel';
    overlay.appendChild(title);

    var msg = document.createElement('div');
    msg.className = 'vc-msg';
    msg.textContent = 'Uma atualiza\u00E7\u00E3o do jogo est\u00E1 pronta. Toque para carregar a vers\u00E3o mais recente.';
    overlay.appendChild(msg);

    var btn = document.createElement('button');
    btn.className = 'vc-btn';
    btn.textContent = 'Atualizar';
    btn.addEventListener('click', function() {
      /* Force reload bypassing all caches */
      var loc = window.location;
      var sep = loc.href.indexOf('?') >= 0 ? '&' : '?';
      window.location.replace(loc.href + sep + '_v=' + Date.now());
    });
    overlay.appendChild(btn);

    document.body.appendChild(overlay);
    console.log('[VERSION] Update overlay shown');

    /* Haptic feedback */
    try {
      if (window.Telegram && Telegram.WebApp && Telegram.WebApp.HapticFeedback) {
        Telegram.WebApp.HapticFeedback.notificationOccurred('warning');
      }
    } catch(e) { /* noop */ }
  }
})();
