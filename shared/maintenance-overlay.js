/**
 * Valdoria Maintenance Overlay v1.0
 *
 * Tela única bloqueante de manutenção. Aplicada em qualquer momento que o
 * cliente recebe response com `maintenance.active === true` (qualquer endpoint).
 *
 * IMUTÁVEL — Tela única, sem fallback de jogo:
 * - Substitui document.body inteiro com tela de manutenção
 * - Cancela todos os timers, intervals, pending fetches
 * - Desinstala service worker (no-op no projeto, mas safety net)
 * - Bloqueia futuras chamadas API até hide() ser chamado explicitamente
 *
 * API:
 *   vMaintenance.show(info)       — mostra tela bloqueante (info: {start_time, eta, reason})
 *   vMaintenance.hide()           — esconde (raramente usado, normalmente é one-way)
 *   vMaintenance.isActive()       — booleano
 *   vMaintenance.checkResponse(d) — chamado pelo fetch wrapper p/ detectar maintenance no body
 *   vMaintenance.checkStatus(s)   — chamado p/ detectar 503 com maintenance JSON
 *
 * Uso típico (carregar antes de qualquer outro JS):
 *   <script src="../shared/maintenance-overlay.js?v=' + Date.now() + '"></script>
 *
 * Carrega dependência loading-template.js (usa esfera de loading como ícone).
 */
(function() {
'use strict';

if (window.vMaintenance) return;  // idempotente

var _active = false;
var _el = null;
var _retryTimer = null;

function _buildHTML(info) {
    info = info || {};
    var lines = [];
    if (info.start_time) {
        lines.push('<div class="v-maint-line">Inicio da manutencao: ' + _esc(info.start_time) + '</div>');
    }
    if (info.eta) {
        lines.push('<div class="v-maint-line">Previsao de retorno: ~' + _esc(info.eta) + '</div>');
    }
    if (info.reason) {
        lines.push('<div class="v-maint-line v-maint-reason">' + _esc(info.reason) + '</div>');
    }

    return '<div id="v-maint-overlay" class="v-maint-overlay">' +
        '<div class="v-maint-card">' +
            '<div class="v-maint-icon">' +
                '<div class="v-maint-orb"><div class="v-maint-orb-core"></div></div>' +
            '</div>' +
            '<h1 class="v-maint-title">Servidor em Manutencao</h1>' +
            '<div class="v-maint-subtitle">Lendas de Valdoria esta temporariamente indisponivel.</div>' +
            (lines.length ? '<div class="v-maint-info">' + lines.join('') + '</div>' : '') +
            '<div class="v-maint-help">' +
                'Tente novamente em alguns minutos.' +
            '</div>' +
            '<button class="v-maint-retry" id="v-maint-retry">Tentar Novamente</button>' +
        '</div>' +
    '</div>';
}

function _esc(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, function(c) {
        return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
}

function _injectStyles() {
    if (document.getElementById('v-maint-styles')) return;
    var style = document.createElement('style');
    style.id = 'v-maint-styles';
    style.textContent = [
        '.v-maint-overlay {',
        '  position: fixed; inset: 0;',
        '  background: #1a1510;',
        '  display: flex; align-items: center; justify-content: center;',
        '  z-index: 2147483647;',  // max int — overpower any other overlay
        '  font-family: "Cinzel", "MedievalSharp", serif;',
        '  color: #d4c8b0;',
        '  padding: 24px;',
        '  overflow: hidden;',
        '}',
        '.v-maint-card {',
        '  max-width: 420px; width: 100%; text-align: center;',
        '  padding: 32px 24px;',
        '}',
        '.v-maint-icon {',
        '  width: 96px; height: 96px;',
        '  margin: 0 auto 24px;',
        '  position: relative;',
        '}',
        '.v-maint-orb {',
        '  position: absolute; inset: 0;',
        '  border-radius: 50%;',
        '  background: radial-gradient(circle at 35% 30%, #fff4d0 0%, #e8c45a 25%, #c4953a 55%, #8b6420 80%, #5a3e10 100%);',
        '  box-shadow: 0 0 40px rgba(196,149,58,0.5), inset -10px -10px 20px rgba(90,62,16,0.6);',
        '  animation: v-maint-pulse 3s ease-in-out infinite;',
        '}',
        '.v-maint-orb-core {',
        '  position: absolute; top: 25%; left: 30%;',
        '  width: 25%; height: 20%;',
        '  background: rgba(255,244,208,0.7);',
        '  border-radius: 50%;',
        '  filter: blur(4px);',
        '}',
        '@keyframes v-maint-pulse {',
        '  0%, 100% { box-shadow: 0 0 40px rgba(196,149,58,0.5), inset -10px -10px 20px rgba(90,62,16,0.6); }',
        '  50% { box-shadow: 0 0 60px rgba(196,149,58,0.8), inset -10px -10px 20px rgba(90,62,16,0.4); }',
        '}',
        '.v-maint-title {',
        '  font-size: 24px; font-weight: 700;',
        '  letter-spacing: 3px; text-transform: uppercase;',
        '  color: #c4953a;',
        '  margin: 0 0 12px;',
        '  text-shadow: 0 0 20px rgba(196,149,58,0.4);',
        '}',
        '.v-maint-subtitle {',
        '  font-size: 14px; line-height: 1.5;',
        '  color: #a09484;',
        '  margin-bottom: 20px;',
        '}',
        '.v-maint-info {',
        '  background: rgba(74, 56, 40, 0.3);',
        '  border: 1px solid rgba(196,149,58,0.2);',
        '  border-radius: 8px;',
        '  padding: 16px;',
        '  margin-bottom: 20px;',
        '  text-align: left;',
        '}',
        '.v-maint-line {',
        '  font-size: 13px; line-height: 1.6;',
        '  color: #d4c8b0;',
        '  margin-bottom: 4px;',
        '}',
        '.v-maint-reason {',
        '  font-style: italic; color: #a09484;',
        '  margin-top: 8px; padding-top: 8px;',
        '  border-top: 1px solid rgba(196,149,58,0.15);',
        '}',
        '.v-maint-help {',
        '  font-size: 13px; color: #a09484;',
        '  margin-bottom: 24px; line-height: 1.5;',
        '}',
        '.v-maint-retry {',
        '  background: linear-gradient(180deg, #c4953a 0%, #8b6420 100%);',
        '  color: #1a1510;',
        '  border: 1px solid #c4953a;',
        '  padding: 12px 32px;',
        '  font-family: inherit; font-size: 14px;',
        '  font-weight: 700; letter-spacing: 2px;',
        '  text-transform: uppercase;',
        '  border-radius: 4px;',
        '  cursor: pointer;',
        '  box-shadow: 0 4px 12px rgba(0,0,0,0.4);',
        '  min-height: 44px;',  // touch target
        '}',
        '.v-maint-retry:hover {',
        '  filter: brightness(1.1);',
        '}',
        '.v-maint-retry:active {',
        '  transform: translateY(1px);',
        '}',
    ].join('\n');
    document.head.appendChild(style);
}

function _cancelOngoing() {
    // Cancel ALL setTimeout/setInterval that the app may have started.
    // Heuristic: kill IDs from 1 to 1000 (covers virtually all timers).
    // This is brutal but appropriate — we're entering maintenance UI.
    try {
        var i;
        var maxId = setTimeout(function(){}, 0);
        for (i = 1; i <= maxId; i++) {
            try { clearTimeout(i); } catch (e) {}
            try { clearInterval(i); } catch (e) {}
        }
    } catch (e) {
        if (window._dbg) console.warn('[MAINT] cancel timers failed:', e);
    }
    // Stop any AbortController-based fetch we know about
    try {
        if (window.ApiDiscovery && window.ApiDiscovery.stop) {
            window.ApiDiscovery.stop();
        }
    } catch (e) {}
    // Hide other overlays
    try {
        if (window.vConnection && window.vConnection.isActive && window.vConnection.isActive()) {
            window.vConnection.hide();
        }
    } catch (e) {}
    try {
        if (window.vProcessing && window.vProcessing.isActive && window.vProcessing.isActive()) {
            window.vProcessing.hide();
        }
    } catch (e) {}
}

function _disableInteractions() {
    // Replace window.fetch with a maintenance-aware variant
    if (window._origFetch) return;  // already patched
    window._origFetch = window.fetch;
    window.fetch = function(url, opts) {
        // Allow probes during maintenance (so retry button works)
        var u = String(url || '');
        var isProbe = (u.indexOf('/api/game/health') >= 0 ||
                       u.indexOf('/api/game/status') >= 0);
        if (isProbe) {
            return window._origFetch.call(window, url, opts);
        }
        // Block everything else during maintenance
        if (_active) {
            return Promise.reject(new Error('maintenance_active'));
        }
        return window._origFetch.call(window, url, opts);
    };
}

function _enableInteractions() {
    if (window._origFetch) {
        window.fetch = window._origFetch;
        delete window._origFetch;
    }
}

function show(info) {
    if (_active) {
        // Update info if already showing
        _updateInfo(info);
        return;
    }
    _active = true;
    _injectStyles();
    _cancelOngoing();
    _disableInteractions();

    // Replace ALL existing UI with maintenance screen
    var wrap = document.createElement('div');
    wrap.innerHTML = _buildHTML(info);
    _el = wrap.firstChild;
    document.body.appendChild(_el);

    // Wire retry — checks server status, hides if back online
    var retryBtn = document.getElementById('v-maint-retry');
    if (retryBtn) {
        retryBtn.addEventListener('click', _retry);
    }

    // Auto-poll every 30s in background (if server comes back, refresh page)
    if (_retryTimer) clearInterval(_retryTimer);
    _retryTimer = setInterval(function() {
        _checkBackgroundStatus();
    }, 30000);

    if (window.console && console.warn) {
        console.warn('[MAINT] Maintenance overlay active');
    }
}

function _retry() {
    var btn = document.getElementById('v-maint-retry');
    if (btn) btn.disabled = true;

    _checkServer().then(function(stillMaintenance) {
        if (btn) btn.disabled = false;
        if (!stillMaintenance) {
            // Server is back — reload page to restart cleanly
            try { window.location.reload(); } catch (e) {}
        } else {
            // Still in maintenance — show small feedback
            if (btn) {
                var orig = btn.textContent;
                btn.textContent = 'Ainda em manutencao';
                setTimeout(function() {
                    btn.textContent = orig;
                }, 2000);
            }
        }
    });
}

function _checkServer() {
    // Hit health endpoint (allowed during maintenance — returns flag)
    var apiBase = (window._VALDORIA_API_BASE || window._API_BASE || '').replace(/\/$/, '');
    if (!apiBase) {
        // Try common locations
        try {
            var url = new URL(window.location.href);
            apiBase = url.searchParams.get('api') || '';
        } catch (e) {}
    }
    if (!apiBase) return Promise.resolve(true);  // can't check, assume still maint

    var orig = window._origFetch || window.fetch;
    return orig.call(window, apiBase + '/api/game/health', {cache: 'no-store'})
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data && data.maintenance && data.maintenance.active === false) {
                return false;  // not in maintenance anymore
            }
            return true;  // still in maintenance
        })
        .catch(function() { return true; });
}

function _checkBackgroundStatus() {
    _checkServer().then(function(stillMaintenance) {
        if (!stillMaintenance) {
            try { window.location.reload(); } catch (e) {}
        }
    });
}

function _updateInfo(info) {
    if (!_el || !info) return;
    // Re-render card body with new info
    var card = _el.querySelector('.v-maint-card');
    if (card) {
        card.innerHTML = _buildHTML(info).match(/<div class="v-maint-card">([\s\S]+)<\/div>\s*<\/div>/)[1];
        var btn = document.getElementById('v-maint-retry');
        if (btn) btn.addEventListener('click', _retry);
    }
}

function hide() {
    if (!_active) return;
    _active = false;
    _enableInteractions();
    if (_retryTimer) {
        clearInterval(_retryTimer);
        _retryTimer = null;
    }
    if (_el && _el.parentNode) {
        _el.parentNode.removeChild(_el);
        _el = null;
    }
}

function isActive() {
    return _active;
}

/**
 * Inspect any response body for maintenance flag and trigger overlay.
 * Returns true if maintenance was detected (caller should abort).
 */
function checkResponse(data) {
    if (!data || typeof data !== 'object') return false;
    var m = data.maintenance;
    if (m === true || (m && m.active === true)) {
        var info = (typeof m === 'object') ? m : {};
        show(info);
        return true;
    }
    return false;
}

/**
 * Inspect HTTP response (Response object) for 503 + maintenance JSON.
 * Returns a Promise<boolean> — true if maintenance detected.
 */
function checkStatus(response) {
    if (!response) return Promise.resolve(false);
    if (response.status !== 503) return Promise.resolve(false);
    return response.clone().json().then(function(data) {
        return checkResponse(data);
    }).catch(function() { return false; });
}

window.vMaintenance = {
    show: show,
    hide: hide,
    isActive: isActive,
    checkResponse: checkResponse,
    checkStatus: checkStatus,
};

// Auto-bootstrap: monkey-patch fetch to detect maintenance globally.
// Idempotent — safe to load multiple times.
(function _autoPatch() {
    if (window._VALDORIA_FETCH_MAINT_PATCHED) return;
    window._VALDORIA_FETCH_MAINT_PATCHED = true;

    var origFetch = window.fetch;
    window.fetch = function(url, opts) {
        var promise = origFetch.call(window, url, opts);
        return promise.then(function(response) {
            // Only inspect API responses
            var u = String(url || '');
            if (u.indexOf('/api/') < 0) return response;

            // Skip the probe endpoints themselves (they're allowed in maintenance)
            if (u.indexOf('/api/game/status') >= 0) return response;

            if (response.status === 503) {
                return response.clone().json().then(function(data) {
                    if (data && data.maintenance && data.maintenance.active) {
                        show(data.maintenance);
                    }
                    return response;
                }).catch(function() { return response; });
            }

            // Also check 200 responses — health endpoint returns 200 with maintenance flag
            if (response.ok) {
                return response.clone().json().then(function(data) {
                    if (data && data.maintenance && (data.maintenance === true || data.maintenance.active)) {
                        var info = (typeof data.maintenance === 'object') ? data.maintenance : {};
                        show(info);
                    }
                    return response;
                }).catch(function() { return response; });
            }

            return response;
        });
    };
})();

})();
