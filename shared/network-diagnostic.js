/**
 * Network Diagnostic v1.0 — Demand #53
 *
 * Distinguishes LOCAL (player's internet) vs REMOTE (server down) network
 * failures, enabling user-friendly PT-BR error messages that point to the
 * real cause.
 *
 * Detection strategy (ordered, fail-fast):
 *   1. navigator.onLine === false → 'offline_local' (guaranteed no network)
 *      Only trust `false`, never `true` (navigator.onLine is unreliable when true).
 *   2. Probe Cloudflare's public trace endpoint with `no-cors` → if fail =
 *      'offline_local' (player's internet is down even though OS reports online)
 *   3. Probe backend /api/game/health → if fails = 'server_down';
 *      if returns overall:'degraded' = 'server_degraded';
 *      if elapsed_ms > 2000 = 'server_slow'; else 'server_ok'
 *
 * Research references:
 *   - navigator.onLine is unreliable when TRUE; only `false` is authoritative.
 *     See MDN + dev.to/maxmonteil 10-line reliable detection pattern.
 *   - AbortSignal.timeout() is the modern pattern (cleaner than AbortController).
 *   - Cloudflare /cdn-cgi/trace is lightweight but blocked by CORS from non-CF
 *     origins. Solution: mode: 'no-cors' — request succeeds or fails, but we
 *     can't read body (which is fine — we only need yes/no).
 *   - Health check best practices (Azure, AWS, Microservices.io): deep health
 *     check should probe all critical dependencies; return JSON with per-
 *     dependency status codes.
 *
 * API:
 *   ValdoriaNetworkDiag.diagnose({apiBase, token, uid}) → Promise<Diagnosis>
 *
 *   Diagnosis = {
 *     category: 'offline_local' | 'offline_internet' | 'server_down' |
 *               'server_degraded' | 'server_slow' | 'server_ok',
 *     detail: string (PT-BR user-friendly description),
 *     hint: string (PT-BR actionable hint),
 *     action: 'retry' | 'wait' | 'refresh' | 'check_wifi' | 'check_internet',
 *     healthData: object | null (raw /api/game/health response when available)
 *   }
 *
 *   ValdoriaNetworkDiag.getMessage(category) → {title, hint, action}
 *     — Lookup table for UI rendering without running diagnosis.
 *
 *   ValdoriaNetworkDiag.friendlyMessage(diagnosis) → string
 *     — Returns a single short PT-BR string summarizing the diagnosis.
 */
var ValdoriaNetworkDiag = (function () {
    'use strict';

    // ── Public message templates (PT-BR, medieval-friendly but direct) ──
    var MESSAGES = {
        'offline_local': {
            title: 'Sem Conexão',
            detail: 'Sua conexão caiu.',
            hint: 'Verifique o Wi-Fi ou os dados móveis.',
            action: 'check_wifi',
            friendly: '📱 Sua conexão caiu. Verifique o Wi-Fi ou dados móveis.',
        },
        'offline_internet': {
            title: 'Internet Instável',
            detail: 'Sua rede responde, mas a internet está lenta ou intermitente.',
            hint: 'Tente novamente em alguns segundos ou mude de rede.',
            action: 'check_internet',
            friendly: '🌐 Internet lenta ou intermitente. Tente novamente em alguns segundos.',
        },
        'server_down': {
            title: 'Servidor Fora do Ar',
            detail: 'Nosso servidor está fora do ar.',
            hint: 'Estamos trabalhando nisso. Tente novamente em alguns minutos.',
            action: 'wait',
            friendly: '⚔️ Nosso servidor está fora do ar. Estamos trabalhando nisso — tente em alguns minutos.',
        },
        'server_degraded': {
            title: 'Servidor Degradado',
            detail: 'O servidor está com problemas em um subsistema.',
            hint: 'Você pode continuar jogando, mas algumas ações podem falhar.',
            action: 'retry',
            friendly: '⚠️ Servidor com problemas parciais. Algumas ações podem demorar ou falhar.',
        },
        'server_slow': {
            title: 'Servidor Lento',
            detail: 'Sua internet está OK, mas o servidor pode demorar a responder.',
            hint: 'Aguarde — estamos processando...',
            action: 'wait',
            friendly: '🐢 Servidor sobrecarregado. Aguarde — sua internet está OK.',
        },
        'server_ok': {
            title: 'Conectado',
            detail: 'Tudo certo.',
            hint: '',
            action: 'retry',
            friendly: '✅ Conexão restaurada.',
        },
    };

    // ── Probe timeouts (ms) ──
    var TIMEOUT_CLOUDFLARE = 2500;   // Cloudflare trace probe
    var TIMEOUT_HEALTH = 5000;       // Backend /api/game/health probe
    var SLOW_THRESHOLD_MS = 2000;    // health elapsed above this = slow

    // ── Helpers ──
    function _log(msg) {
        try {
            console.warn('[NETWORK]', msg);
            if (window.ValdoriaErrors && ValdoriaErrors.log) {
                ValdoriaErrors.log('NETWORK: ' + msg);
            }
        } catch (e) { /* ignore */ }
    }

    function _abortSignal(ms) {
        // Prefer AbortSignal.timeout() (modern, cleaner) with fallback to AbortController
        if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) {
            try { return AbortSignal.timeout(ms); } catch (e) { /* fallthrough */ }
        }
        var ctrl = new AbortController();
        setTimeout(function () { try { ctrl.abort(); } catch (e) { /* ignore */ } }, ms);
        return ctrl.signal;
    }

    /**
     * Probe Cloudflare trace endpoint with no-cors. Used to detect if the
     * player's internet works AT ALL (independent of our server).
     *
     * Returns Promise<boolean> — true if internet is reachable, false otherwise.
     */
    function _probeInternet() {
        // Use 1.1.1.1 (Cloudflare DNS) — most reliable, globally distributed.
        // no-cors mode means we can't read the response body or status, but
        // fetch() will reject on network failure and resolve on success.
        return new Promise(function (resolve) {
            try {
                fetch('https://1.1.1.1/cdn-cgi/trace', {
                    method: 'GET',
                    mode: 'no-cors',
                    cache: 'no-store',
                    signal: _abortSignal(TIMEOUT_CLOUDFLARE),
                }).then(function () {
                    _log('cloudflare probe OK');
                    resolve(true);
                }).catch(function (err) {
                    _log('cloudflare probe FAIL: ' + (err && err.name) + ' ' + (err && err.message));
                    resolve(false);
                });
            } catch (e) {
                _log('cloudflare probe EXCEPTION: ' + e.message);
                resolve(false);
            }
        });
    }

    /**
     * Probe backend /api/game/health with full response parsing.
     *
     * Returns Promise<{ok, elapsed_ms, data, error}>
     *   - ok: true if response received (may be degraded)
     *   - elapsed_ms: total roundtrip time
     *   - data: parsed JSON response (or null on failure)
     *   - error: error message if request failed
     */
    function _probeHealth(apiBase, token) {
        var start = Date.now();
        return new Promise(function (resolve) {
            if (!apiBase) {
                resolve({ ok: false, elapsed_ms: 0, data: null, error: 'no_api_base' });
                return;
            }
            var url = apiBase.replace(/\/$/, '') + '/api/game/health';
            var opts = {
                method: 'GET',
                cache: 'no-store',
                signal: _abortSignal(TIMEOUT_HEALTH),
            };
            if (token) {
                opts.headers = { 'Authorization': 'Bearer ' + token };
            }
            fetch(url, opts).then(function (resp) {
                var elapsed = Date.now() - start;
                if (!resp.ok) {
                    _log('health probe http ' + resp.status + ' elapsed=' + elapsed + 'ms');
                    resolve({ ok: false, elapsed_ms: elapsed, data: null, error: 'http_' + resp.status });
                    return;
                }
                return resp.json().then(function (data) {
                    _log('health probe OK elapsed=' + elapsed + 'ms overall=' + (data && data.overall));
                    resolve({ ok: true, elapsed_ms: elapsed, data: data, error: null });
                }).catch(function (parseErr) {
                    _log('health probe JSON parse error: ' + parseErr.message);
                    resolve({ ok: false, elapsed_ms: elapsed, data: null, error: 'parse_error' });
                });
            }).catch(function (err) {
                var elapsed = Date.now() - start;
                var errName = (err && err.name) || 'Unknown';
                var errMsg = (err && err.message) || '';
                _log('health probe FAIL ' + errName + ': ' + errMsg + ' elapsed=' + elapsed + 'ms');
                resolve({ ok: false, elapsed_ms: elapsed, data: null, error: errName + ':' + errMsg });
            });
        });
    }

    /**
     * Run full diagnosis. Returns a category and actionable message.
     *
     * Strategy:
     *   1. Check navigator.onLine === false → offline_local (fast path)
     *   2. Probe Cloudflare (internet works?)
     *   3. If internet OK → probe our /api/game/health
     *   4. Classify based on health response
     *
     * Total time budget: ~7.5s worst case (2.5s CF + 5s health).
     */
    function diagnose(cfg) {
        cfg = cfg || {};
        var apiBase = cfg.apiBase || '';
        var token = cfg.token || '';
        _log('diagnose start apiBase=' + (apiBase ? 'set' : 'none') + ' onLine=' + navigator.onLine);

        return new Promise(function (resolve) {
            // ── Fast path: navigator.onLine === false is authoritative ──
            // (but navigator.onLine === true is unreliable — keep probing)
            if (navigator.onLine === false) {
                _log('navigator.onLine=false — offline_local');
                resolve(_buildDiagnosis('offline_local', null));
                return;
            }

            // ── Step 2: Probe internet via Cloudflare ──
            _probeInternet().then(function (internetOk) {
                if (!internetOk) {
                    _log('cloudflare failed AND navigator.onLine=true — offline_internet (captive portal or ISP issue)');
                    resolve(_buildDiagnosis('offline_internet', null));
                    return;
                }

                // ── Step 3: Probe backend health ──
                _probeHealth(apiBase, token).then(function (healthResult) {
                    if (!healthResult.ok) {
                        _log('internet ok but server health FAIL — server_down');
                        resolve(_buildDiagnosis('server_down', null));
                        return;
                    }
                    var data = healthResult.data || {};
                    var overall = data.overall || (data.initialized ? 'ok' : 'down');

                    // ── Step 4: Classify based on health response ──
                    if (overall === 'down' || data.initialized === false) {
                        _log('health responded but overall=down — server_down');
                        resolve(_buildDiagnosis('server_down', data));
                        return;
                    }
                    if (overall === 'degraded') {
                        _log('health overall=degraded — server_degraded');
                        resolve(_buildDiagnosis('server_degraded', data));
                        return;
                    }
                    // Slow threshold: either health took >2s OR db is slow
                    if (healthResult.elapsed_ms > SLOW_THRESHOLD_MS || data.db === 'slow') {
                        _log('health slow elapsed=' + healthResult.elapsed_ms + 'ms db=' + data.db);
                        resolve(_buildDiagnosis('server_slow', data));
                        return;
                    }
                    _log('all probes OK — server_ok');
                    resolve(_buildDiagnosis('server_ok', data));
                });
            });
        });
    }

    function _buildDiagnosis(category, healthData) {
        var tpl = MESSAGES[category] || MESSAGES['server_down'];
        return {
            category: category,
            title: tpl.title,
            detail: tpl.detail,
            hint: tpl.hint,
            action: tpl.action,
            friendly: tpl.friendly,
            healthData: healthData,
        };
    }

    function getMessage(category) {
        return MESSAGES[category] || MESSAGES['server_down'];
    }

    function friendlyMessage(diagnosis) {
        if (!diagnosis) return MESSAGES['server_down'].friendly;
        var tpl = MESSAGES[diagnosis.category] || MESSAGES['server_down'];
        return tpl.friendly;
    }

    // Expose public API
    return {
        diagnose: diagnose,
        getMessage: getMessage,
        friendlyMessage: friendlyMessage,
        // Exposed for integration tests only
        _probeInternet: _probeInternet,
        _probeHealth: _probeHealth,
        MESSAGES: MESSAGES,
    };
})();
