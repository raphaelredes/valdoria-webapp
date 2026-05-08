/* Server-Log — shared helper para enviar logs do front-end ao server.
   ════════════════════════════════════════════════════════════════════
   X-6.5.51AI (2026-05-07): user pediu "todas as telas devem ter logs
   gerados no servidor". Antes só simulators (combate.html/exploracao.html
   via sim-log-panel) postavam pra /api/sim/log. WebApps de produção
   (character_creator, cidade, prologue, combat, etc) não tinham logs
   server-side persistentes.

   Este helper unifica: chama serverLog(area, level, msg, extra) → POST
   /api/sim/log com payload canonical. Server persiste em
   logs/sim_<area>_<env>.<YYYY-MM-DD>.jsonl via sim_log_sink.write_log.

   USAGE:
     <script src="../shared/server-log.js?v=' + v + '"></script>
     <script>
       window.serverLog('character_creator', 'info', 'submit_start', {char_id, race, class});
       window.serverLog('character_creator', 'error', 'fetch_failed', {status, body});
     </script>

   Áreas conhecidas (whitelist server-side):
     inventory, exploracao, levelup, character_creator, market, world,
     navigate, crafting, dice, combate, hub, pix, cidade, outros.

   Levels: debug | info | warn | error.

   Auto-config:
     - apiBase do URL param ?api=...
     - env do URL param ?env=local|dev|prod (default: 'unknown')

   Defesas:
     - Best-effort: erros de fetch são silenciados (logs não-críticos)
     - Não bloqueia render — fetch async sem await
     - Buffer fila se serverLog é chamado antes do apiBase ser conhecido
       (window.SERVER_LOG_API setável a posteriori)
*/
(function () {
    'use strict';
    if (window.serverLog) return;  // Idempotent

    var _queue = [];
    var _flushing = false;

    /* Auto-detect apiBase + env from URL params (todos os WebApps já passam). */
    function _detectApiBase() {
        try {
            var p = new URLSearchParams(window.location.search);
            return p.get('api') || window.SERVER_LOG_API || '';
        } catch (_) { return ''; }
    }

    function _detectEnv() {
        try {
            var p = new URLSearchParams(window.location.search);
            var env = p.get('env');
            if (env === 'dev' || env === 'prod' || env === 'local') return env;
            /* Fallback heurístico: file:// = local; localhost = local; resto = unknown */
            if (window.location.protocol === 'file:') return 'local';
            if (/^(localhost|127\.|0\.0\.0\.0)/.test(window.location.hostname)) return 'local';
            if (window.location.hostname.indexOf('dev.') === 0) return 'dev';
            if (/lendasdevaldoria\.com\.br$/.test(window.location.hostname)) return 'prod';
            return 'unknown';
        } catch (_) { return 'unknown'; }
    }

    function _buildPayload(area, level, msg, extra) {
        return {
            area: area || 'outros',
            env: _detectEnv(),
            level: level || 'info',
            msg: typeof msg === 'string' ? msg : JSON.stringify(msg),
            ts: Date.now(),
            ua: navigator.userAgent.substring(0, 200),
            href: window.location.href.substring(0, 500),
            extra: extra || null,
        };
    }

    function _send(payload) {
        var apiBase = _detectApiBase();
        if (!apiBase) {
            /* Sem apiBase: enfileira pra retry. Útil em WebApp que ainda não
               carregou os params de URL. */
            _queue.push(payload);
            return;
        }
        var url = apiBase.replace(/\/$/, '') + '/api/sim/log';
        try {
            /* fetch sem await — best-effort, não bloqueia. Errors silenced. */
            fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                /* keepalive: true permite que o request continue mesmo após
                   navegação ou close (útil pra pageunload/beacon-style). */
                keepalive: true,
                /* Credentials omit — endpoint é no-auth. */
                credentials: 'omit',
            }).catch(function () { /* silent */ });
        } catch (_) { /* silent */ }
    }

    function _flushQueue() {
        if (_flushing || _queue.length === 0) return;
        _flushing = true;
        try {
            var apiBase = _detectApiBase();
            if (!apiBase) { _flushing = false; return; }
            while (_queue.length) {
                _send(_queue.shift());
            }
        } finally {
            _flushing = false;
        }
    }

    /* Public API */
    window.serverLog = function (area, level, msg, extra) {
        try {
            var payload = _buildPayload(area, level, msg, extra);
            _send(payload);
        } catch (_) { /* silent */ }
    };

    /* Helper: setar apiBase a posteriori e flushar fila */
    window.serverLog.setApiBase = function (apiBase) {
        window.SERVER_LOG_API = apiBase;
        _flushQueue();
    };

    /* Helper: capturar console.error/warn automaticamente. Opt-in pra evitar
       avalanche de logs em loops infinitos. Chamar em telas que querem
       diagnóstico completo. */
    window.serverLog.captureConsole = function (area) {
        if (window.__serverLog_consoleHooked) return;
        window.__serverLog_consoleHooked = true;
        var origError = console.error.bind(console);
        var origWarn = console.warn.bind(console);
        console.error = function () {
            try {
                var msg = Array.prototype.slice.call(arguments).map(function (a) {
                    return typeof a === 'string' ? a : (a && a.message) || JSON.stringify(a);
                }).join(' ');
                window.serverLog(area, 'error', msg);
            } catch (_) {}
            origError.apply(console, arguments);
        };
        console.warn = function () {
            try {
                var msg = Array.prototype.slice.call(arguments).map(function (a) {
                    return typeof a === 'string' ? a : (a && a.message) || JSON.stringify(a);
                }).join(' ');
                window.serverLog(area, 'warn', msg);
            } catch (_) {}
            origWarn.apply(console, arguments);
        };
    };

    /* Auto-flush queue após DOM ready (URL params podem ter sido updated) */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _flushQueue, { once: true });
    } else {
        setTimeout(_flushQueue, 100);
    }

    /* Enviar log de inicialização pra confirmar que o helper está ativo. */
    setTimeout(function () {
        try {
            var area = window.SERVER_LOG_AREA || 'outros';
            window.serverLog(area, 'info', 'serverLog_init', {
                href: window.location.pathname,
                env: _detectEnv(),
                apiBase: _detectApiBase() ? 'configured' : 'pending',
            });
        } catch (_) {}
    }, 50);
})();
