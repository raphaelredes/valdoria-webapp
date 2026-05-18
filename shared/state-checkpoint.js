/**
 * state-checkpoint.js — AAA state persistence for Lendas de Valdoria.
 *
 * USER REQUEST 2026-05-04: persistir HP/MP/posição durante atividade
 * (sem esperar handle_finish). Padrão WoW + Genshin Impact: heartbeat
 * 30s + sendBeacon ao fechar (pagehide).
 *
 * Combina com o sistema de displacement existente (single-device):
 * a mesma session é validada → state-checkpoint só salva se sessão
 * é a "owner" do dispositivo. Latest-wins kicka heartbeat antigo.
 *
 * Uso:
 *   ValdoriaCheckpoint.start({
 *     api: '/api/game/state-checkpoint',
 *     token: 'xxx',
 *     userId: 12345,
 *     area: 'exploracao',
 *     getState: function() { return { hp: S.hp, mp: S.mp, col: S.col, row: S.row }; }
 *   });
 *
 * MAPA_IA:
 *   ~10  config + state vars
 *   ~50  start({api, token, userId, area, getState})
 *   ~90  _sendCheckpoint (POST)
 *   ~130 _sendBeacon (pagehide last save)
 *   ~160 stop()
 */

(function () {
  'use strict';

  if (typeof window === 'undefined') return;
  if (window.ValdoriaCheckpoint) return; // already loaded

  // ── Config ────────────────────────────────────────────────────────
  var HEARTBEAT_INTERVAL_MS = 30000;  // 30s — AAA standard (WoW, Genshin)
  var BEACON_PATH = '/api/game/state-checkpoint';

  // ── State ─────────────────────────────────────────────────────────
  var _config = null;       // {api, token, userId, area, getState}
  var _intervalId = null;
  var _pageHideHandler = null;
  var _visibilityHandler = null;
  var _lastSendT = 0;
  var _enabled = false;

  /**
   * Start the checkpoint loop.
   * @param {Object} cfg
   * @param {string} cfg.api — base URL of API (ex: 'https://api.lendasdevaldoria.com.br')
   * @param {string} cfg.token — session token
   * @param {number} cfg.userId — telegram user_id
   * @param {string} cfg.area — 'cidade' | 'exploracao' | 'combate'
   * @param {function} cfg.getState — returns object with current state delta
   * @param {number} [cfg.intervalMs=30000] — override heartbeat interval
   */
  function start(cfg) {
    if (!cfg || !cfg.api || !cfg.token || !cfg.userId || !cfg.area) {
      console.warn('[CHECKPOINT] start: missing required config', cfg);
      return false;
    }
    if (typeof cfg.getState !== 'function') {
      console.warn('[CHECKPOINT] start: getState must be a function');
      return false;
    }

    if (_enabled) stop(); // restart with new config

    _config = {
      api: cfg.api.replace(/\/$/, ''),  // strip trailing slash
      token: String(cfg.token),
      userId: parseInt(cfg.userId, 10),
      area: String(cfg.area),
      getState: cfg.getState,
      intervalMs: cfg.intervalMs || HEARTBEAT_INTERVAL_MS,
    };
    _enabled = true;

    // Heartbeat 30s — POST com state delta
    _intervalId = setInterval(_sendCheckpoint, _config.intervalMs);

    // pagehide → sendBeacon (last save antes de fechar)
    _pageHideHandler = function () {
      _sendBeacon();
    };
    window.addEventListener('pagehide', _pageHideHandler);
    window.addEventListener('beforeunload', _pageHideHandler);

    // Visibility — quando tab volta, save imediato (pode ter perdido tempo)
    _visibilityHandler = function () {
      if (document.visibilityState === 'visible' && _enabled) {
        var since = Date.now() - _lastSendT;
        if (since > _config.intervalMs * 0.5) {
          _sendCheckpoint();
        }
      }
    };
    document.addEventListener('visibilitychange', _visibilityHandler);

    console.info('[CHECKPOINT] started area=' + _config.area
      + ' interval=' + _config.intervalMs + 'ms uid=' + _config.userId);

    // First save imediato pra registrar liveness
    setTimeout(_sendCheckpoint, 500);
    return true;
  }

  /**
   * Send checkpoint via fetch (normal heartbeat).
   * Fail-safe: timeout 5s, ignora erros transitórios.
   */
  function _sendCheckpoint() {
    if (!_enabled || !_config) return;
    var stateDelta;
    try {
      stateDelta = _config.getState() || {};
    } catch (e) {
      console.warn('[CHECKPOINT] getState threw:', e);
      return;
    }
    var body = Object.assign({
      token: _config.token,
      user_id: _config.userId,
      area: _config.area,
    }, stateDelta);

    var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timeoutId = ctrl ? setTimeout(function () { ctrl.abort(); }, 5000) : null;

    fetch(_config.api + BEACON_PATH, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + _config.token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: ctrl ? ctrl.signal : undefined,
    }).then(function (r) {
      if (timeoutId) clearTimeout(timeoutId);
      _lastSendT = Date.now();
      if (!r.ok) return null;
      return r.json();
    }).then(function (j) {
      if (!j) return;
      // Displacement detection — sinaliza módulo de heartbeat existente
      if (j.status === 'displaced') {
        console.warn('[CHECKPOINT] displaced — stopping heartbeat');
        stop();
        // Delega pro displacement handler do session-heartbeat existente
        try {
          if (window.ValdoriaSessionHeartbeat
              && typeof window.ValdoriaSessionHeartbeat.handleDisplaced === 'function') {
            window.ValdoriaSessionHeartbeat.handleDisplaced(j);
          }
        } catch (e) { /* fallback silencioso */ }
      } else if (j.status === 'expired') {
        console.warn('[CHECKPOINT] session expired');
        stop();
      } else if (j.saved) {
        // Log debug-only — não polui console
        // console.debug('[CHECKPOINT] saved');
      }
    }).catch(function (e) {
      if (timeoutId) clearTimeout(timeoutId);
      // Network error — silencioso. Próximo heartbeat tenta de novo.
      if (e && e.name !== 'AbortError') {
        /* 2026-05-18 preflight fix (check_webapp_console_debug): trocado
           console.debug por console.warn em prod. Erros de network silenciosos
           passam batido — warn dá visibilidade sem poluir o console. */
        console.warn('[CHECKPOINT] error:', e.message || e);
      }
    });
  }

  /**
   * Last-chance save no pagehide via sendBeacon (entrega garantida).
   * sendBeacon NÃO permite custom headers — token vai no body.
   */
  function _sendBeacon() {
    if (!_enabled || !_config || !navigator.sendBeacon) return;
    var stateDelta;
    try {
      stateDelta = _config.getState() || {};
    } catch (e) {
      return;
    }
    var body = Object.assign({
      token: _config.token,
      user_id: _config.userId,
      area: _config.area,
    }, stateDelta);

    try {
      var blob = new Blob([JSON.stringify(body)], {
        type: 'application/json'
      });
      var url = _config.api + BEACON_PATH + '?token=' + encodeURIComponent(_config.token)
              + '&uid=' + _config.userId;
      navigator.sendBeacon(url, blob);
      console.info('[CHECKPOINT] beacon sent area=' + _config.area);
    } catch (e) {
      console.warn('[CHECKPOINT] beacon failed:', e);
    }
  }

  /** Force an immediate checkpoint (não espera intervalo). */
  function flush() {
    _sendCheckpoint();
  }

  /** Stop the heartbeat loop. Called on logout, displacement, etc. */
  function stop() {
    _enabled = false;
    if (_intervalId) {
      clearInterval(_intervalId);
      _intervalId = null;
    }
    if (_pageHideHandler) {
      window.removeEventListener('pagehide', _pageHideHandler);
      window.removeEventListener('beforeunload', _pageHideHandler);
      _pageHideHandler = null;
    }
    if (_visibilityHandler) {
      document.removeEventListener('visibilitychange', _visibilityHandler);
      _visibilityHandler = null;
    }
    _config = null;
    console.info('[CHECKPOINT] stopped');
  }

  /** Returns true if checkpoint heartbeat is running. */
  function isActive() {
    return _enabled;
  }

  // Public API
  window.ValdoriaCheckpoint = {
    start: start,
    stop: stop,
    flush: flush,
    isActive: isActive,
  };
})();
