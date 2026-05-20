/* ============================================================================
 * version-check.js — Auto-detect new deploys + force reload (Telegram-friendly)
 * ============================================================================
 *
 * PROBLEMA QUE RESOLVE:
 * - Telegram WebApp (Desktop/Mobile) cacheia HTML/JS/CSS de forma agressiva
 * - Após push de novo código, players continuam vendo versão antiga
 * - Solução manual: "feche e reabra o Telegram completamente" — ruim de UX
 *
 * SOLUÇÃO:
 * - Polling periódico de /bundle-version.js (no-cache)
 * - Compara VBUNDLE_HASH carregado vs servidor
 * - Se diff: mostra banner + auto-reload em 10s
 *
 * LGPD COMPLIANCE:
 * - localStorage usa APENAS:
 *     * valdoria_last_reload_ts (timestamp, prevenir loops de reload)
 *     * valdoria_skipped_version (versão que user clicou "depois", session-only)
 * - SEM PII (Personal Identifiable Information)
 * - SEM tracking, SEM analytics
 * - Enquadra-se em "armazenamento estritamente necessário" (LGPD Art. 7º, IX)
 *   por ser técnico/funcional — não requer consentimento explícito
 *
 * MAPA_IA:
 *   ~40   _config — intervalos, IDs, paths
 *   ~70   _checkServerVersion() — fetch /bundle-version.js fresh
 *   ~110  _detectStale() — compara hashes + decide action
 *   ~150  _showUpdateBanner() — UI de notificação
 *   ~210  _forceReload() — location.replace com cache-bust
 *   ~250  _wireEvents() — boot + intervalos + visibility
 *
 * Doc: docs/sistemas/version-check.md (futuro)
 * ============================================================================ */

'use strict';

(function() {
  var _config = {
    bundleUrl: '/bundle-version.js',
    pollIntervalMs: 60 * 1000,           // Check every 1 min when active
    initialDelayMs: 5 * 1000,            // First check 5s after load
    autoReloadDelayMs: 10 * 1000,        // Auto-reload 10s after banner shown
    reloadLoopProtectionMs: 30 * 1000,   // Don't auto-reload more than once per 30s
    bannerId: 'v-update-banner',
    storageKey: {
      lastReloadTs: 'valdoria_last_reload_ts',
      skippedVersion: 'valdoria_skipped_version'
    }
  };

  var _state = {
    clientHash: null,
    isReloading: false,
    pollerId: null,
    bannerShownAt: null
  };

  /* === Fetch server version (no-cache, no-store) ===
   * Returns: { hash: string } or null on error */
  function _checkServerVersion() {
    var url = _config.bundleUrl + '?_t=' + Date.now();
    return fetch(url, {
      cache: 'no-store',
      credentials: 'omit',
      headers: { 'Cache-Control': 'no-cache' }
    })
    .then(function(res) {
      if (!res.ok) return null;
      return res.text();
    })
    .then(function(text) {
      if (!text) return null;
      var match = text.match(/VBUNDLE_HASH\s*=\s*['"]([a-f0-9]+)['"]/i);
      return match ? { hash: match[1] } : null;
    })
    .catch(function(err) {
      console.warn('[VERSION-CHECK] fetch failed:', err && err.message);
      return null;
    });
  }

  /* === Decide if stale + show banner ===
   * Returns: 'fresh' | 'stale-soft' | 'stale-force' */
  function _detectStale() {
    if (_state.isReloading) return Promise.resolve('reloading');
    if (!_state.clientHash) return Promise.resolve('no-baseline');

    return _checkServerVersion().then(function(server) {
      if (!server) return 'fetch-error';
      if (server.hash === _state.clientHash) return 'fresh';

      // Mismatch detected
      console.warn('[VERSION-CHECK] mismatch — client=' + _state.clientHash + ' server=' + server.hash);

      // Reload loop protection: don't auto-reload twice in 30s
      var lastReload = parseInt(localStorage.getItem(_config.storageKey.lastReloadTs) || '0', 10);
      var sinceLastReload = Date.now() - lastReload;
      if (sinceLastReload < _config.reloadLoopProtectionMs) {
        console.warn('[VERSION-CHECK] loop protection active (last reload ' + sinceLastReload + 'ms ago)');
        return 'stale-soft';
      }

      // User dismissed this specific version before
      var skippedFor = sessionStorage.getItem(_config.storageKey.skippedVersion);
      if (skippedFor === server.hash) {
        console.warn('[VERSION-CHECK] user dismissed this version');
        return 'stale-soft';
      }

      _showUpdateBanner(server.hash);
      return 'stale-force';
    });
  }

  /* === Banner UI (auto-reload countdown) === */
  function _showUpdateBanner(newHash) {
    if (document.getElementById(_config.bannerId)) return;
    _state.bannerShownAt = Date.now();

    // Inject CSS once
    if (!document.getElementById('v-update-banner-style')) {
      var st = document.createElement('style');
      st.id = 'v-update-banner-style';
      st.textContent = ''
        + '.v-update-banner{'
        +   'position:fixed;top:8px;left:50%;transform:translateX(-50%);'
        +   'z-index:99999;'
        +   'display:flex;align-items:center;gap:10px;'
        +   'padding:8px 14px;'
        +   'background:linear-gradient(180deg,#3a2e22,#2a2218);'
        +   'border:1px solid rgba(196,149,58,0.7);border-radius:8px;'
        +   'box-shadow:0 4px 16px rgba(0,0,0,0.7),0 0 24px rgba(196,149,58,0.25);'
        +   'color:#d4c8b0;font-family:Cinzel,serif;font-size:12px;letter-spacing:0.6px;'
        +   'animation:vupbnr-in 0.3s ease-out;'
        +   'max-width:calc(100vw - 16px)'
        + '}'
        + '.v-update-banner-icon{color:#c4953a;font-size:14px}'
        + '.v-update-banner-text{flex:1;min-width:0}'
        + '.v-update-banner-countdown{color:#c4953a;font-weight:700;margin-left:4px}'
        + '.v-update-banner-btn{'
        +   'padding:5px 10px;background:rgba(196,149,58,0.25);'
        +   'border:1px solid #c4953a;border-radius:5px;'
        +   'color:#c4953a;font-family:inherit;font-size:11px;font-weight:700;'
        +   'cursor:pointer;letter-spacing:0.8px;text-transform:uppercase'
        + '}'
        + '.v-update-banner-btn:hover{background:rgba(196,149,58,0.45);color:#fff4d0}'
        + '.v-update-banner-dismiss{'
        +   'background:transparent;border:none;color:#9b8e7c;'
        +   'cursor:pointer;font-size:14px;padding:0 4px'
        + '}'
        + '@keyframes vupbnr-in{from{opacity:0;transform:translate(-50%,-12px)}to{opacity:1;transform:translate(-50%,0)}}';
      document.head.appendChild(st);
    }

    var banner = document.createElement('div');
    banner.id = _config.bannerId;
    banner.className = 'v-update-banner';
    banner.innerHTML = ''
      + '<span class="v-update-banner-icon">✨</span>'
      + '<span class="v-update-banner-text">Nova versão disponível'
      +   '<span class="v-update-banner-countdown" id="v-upd-cd">10s</span>'
      + '</span>'
      + '<button class="v-update-banner-btn" id="v-upd-reload">Atualizar</button>'
      + '<button class="v-update-banner-dismiss" id="v-upd-dismiss" title="Adiar">×</button>';
    document.body.appendChild(banner);

    // Wire buttons
    document.getElementById('v-upd-reload').addEventListener('click', _forceReload);
    document.getElementById('v-upd-dismiss').addEventListener('click', function() {
      sessionStorage.setItem(_config.storageKey.skippedVersion, newHash);
      banner.remove();
      if (window.__vUpdateCountdownInt) {
        clearInterval(window.__vUpdateCountdownInt);
        window.__vUpdateCountdownInt = null;
      }
    });

    // Countdown
    var secondsLeft = Math.round(_config.autoReloadDelayMs / 1000);
    var cdEl = document.getElementById('v-upd-cd');
    window.__vUpdateCountdownInt = setInterval(function() {
      secondsLeft -= 1;
      if (cdEl) cdEl.textContent = secondsLeft + 's';
      if (secondsLeft <= 0) {
        clearInterval(window.__vUpdateCountdownInt);
        window.__vUpdateCountdownInt = null;
        _forceReload();
      }
    }, 1000);
  }

  /* === Force reload with cache-bust ===
   * Uses location.replace + unique query to bypass Telegram WebView cache. */
  function _forceReload() {
    if (_state.isReloading) return;
    _state.isReloading = true;

    try {
      localStorage.setItem(_config.storageKey.lastReloadTs, String(Date.now()));
    } catch(e) {}

    console.warn('[VERSION-CHECK] forcing reload');

    try {
      var u = new URL(window.location.href);
      u.searchParams.set('_v', Date.now());
      // Use replace to avoid trapping user in back-button loop
      window.location.replace(u.toString());
    } catch(e) {
      // Fallback for environments where URL constructor is restricted
      var sep = window.location.href.indexOf('?') >= 0 ? '&' : '?';
      window.location.replace(window.location.href + sep + '_v=' + Date.now());
    }
  }

  /* === Boot + event wiring === */
  function _start() {
    // Capture baseline
    _state.clientHash = window.VBUNDLE_HASH;
    if (!_state.clientHash) {
      console.warn('[VERSION-CHECK] no VBUNDLE_HASH — skipping (likely simulator file://)');
      return;
    }

    console.log('[VERSION-CHECK] baseline=' + _state.clientHash);

    // Initial check after settle period
    setTimeout(function() {
      _detectStale();
    }, _config.initialDelayMs);

    // Periodic polling
    _state.pollerId = setInterval(function() {
      if (!document.hidden) _detectStale();
    }, _config.pollIntervalMs);

    // Re-check when page becomes visible (user back from another app)
    document.addEventListener('visibilitychange', function() {
      if (!document.hidden) _detectStale();
    });

    // Re-check on window focus (user back from another tab)
    window.addEventListener('focus', function() {
      _detectStale();
    });
  }

  // Public API
  window.vVersionCheck = {
    check: function() { return _detectStale(); },
    reload: _forceReload,
    getClientHash: function() { return _state.clientHash; },
    _config: _config // expose for debug
  };

  // Boot when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _start);
  } else {
    _start();
  }
})();
