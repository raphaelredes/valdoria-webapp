/**
 * vAuthTokenStore — REFACTOR-1 Phase 1 (Sessao #65, 2026-05-29).
 *
 * Centralized helper that persists the Bearer session token in
 * localStorage under the canonical env-prefixed key
 * `valdoria_session_<env>` (matches CLAUDE.md "Environment Isolation"
 * and the cleanup prefix watched by session-heartbeat.js
 * `_forceReauthRedirect`). Read by every gameplay WebApp instead of
 * `URLSearchParams.get('token')` once Phase 2 lands.
 *
 * Why this exists:
 *   - REFACTOR-1 closes the P0-SECURITY finding from Sessao #63 BUG-3:
 *     Bearer token leaking via Referer headers, CDN access logs,
 *     browser history, and error reports. Phase 1 lays the
 *     infrastructure; Phase 2 swaps callers; Phase 3 removes the
 *     legacy `?token=` fallback.
 *   - Why localStorage (not sessionStorage or cookie): the project
 *     already standardizes on env-prefixed localStorage keys via
 *     `ValdoriaEnv.getEnvKey()`. Cookie would require widening CORS
 *     to allow credentials in a cross-origin chain (jogo./prod. and
 *     dev./api. are different origins) and is unreliable in iOS
 *     Telegram WebView. sessionStorage would force re-auth on every
 *     WebApp reopen. localStorage with the same TTL semantics as the
 *     backend session (game scope = 1800s) hits the sweet spot.
 *
 * MAPA_IA — agentes IA grep:
 *   "vAuthTokenStore.setToken"   -> /play/ persists after init-session
 *   "vAuthTokenStore.getToken"   -> every WebApp reads here (Phase 2)
 *   "vAuthTokenStore.clearToken" -> on logout / char switch / 401
 *   "_STORAGE_KEY"               -> resolved key (env-prefixed)
 *
 * Cross-references:
 *   - docs/sistemas/refactor-1-plan.md       (canonical plan)
 *   - docs/sistemas/frontend-session-storage.md (storage contract)
 *   - valdoria-webapp/shared/env-utils.js    (ValdoriaEnv.getEnvKey)
 *   - valdoria-webapp/shared/session-heartbeat.js (compat with the
 *     `valdoria_session*` prefix wipe in `_forceReauthRedirect`)
 *   - CLAUDE.md "Environment Isolation"      (canonical key format)
 *   - CLAUDE.md "Server-Only State"          (tokens are credentials,
 *     not game state — localStorage permitted)
 */
(function (root) {
    'use strict';

    function _envId() {
        try {
            if (root.ValdoriaEnv && typeof root.ValdoriaEnv.id === 'string') {
                return root.ValdoriaEnv.id;
            }
        } catch (_e) { /* fall through */ }
        // Hostname fallback — matches env-utils.js logic so we degrade
        // gracefully if ValdoriaEnv didn't load (it always should, but
        // robustness matters when the rest of the WebApp depends on us).
        try {
            var h = (root.location && root.location.hostname || '').toLowerCase();
            if (h === 'dev.lendasdevaldoria.com.br') return 'dev';
            return 'prod';
        } catch (_e) { return 'prod'; }
    }

    function _resolveKey() {
        var base = 'valdoria_session';
        try {
            if (root.ValdoriaEnv && typeof root.ValdoriaEnv.getEnvKey === 'function') {
                return root.ValdoriaEnv.getEnvKey(base);
            }
        } catch (_e) { /* fall through */ }
        return base + '_' + _envId();
    }

    var _ENV = _envId();
    var _STORAGE_KEY = _resolveKey();
    var _MEMORY = null;  // process-memory mirror — used when localStorage throws

    function _safeStorage() {
        try { return root.localStorage || null; } catch (_e) { return null; }
    }

    function _readRaw() {
        var ss = _safeStorage();
        if (!ss) return null;
        try { return ss.getItem(_STORAGE_KEY); } catch (_e) { return null; }
    }

    function _writeRaw(val) {
        var ss = _safeStorage();
        if (!ss) return false;
        try {
            if (val === null) ss.removeItem(_STORAGE_KEY);
            else ss.setItem(_STORAGE_KEY, val);
            return true;
        } catch (_e) { return false; }
    }

    /**
     * Persist the Bearer token for this WebApp session.
     *
     * @param {string} token Opaque Bearer (>=8 chars, server-issued by
     *                       unified_session_store.create()).
     * @param {Object} [meta] Optional record metadata:
     *                       `{user_id, char_id, env, scope, api_base}`.
     *                       Stored alongside the token for self-check;
     *                       backend validates the token regardless.
     * @returns {boolean} true if persisted to localStorage, false if
     *                    only the in-memory mirror was updated (storage
     *                    quota / disabled / private mode).
     */
    function setToken(token, meta) {
        if (!token || typeof token !== 'string' || token.length < 8) {
            return false;
        }
        var payload = JSON.stringify({
            token: token,
            user_id: (meta && meta.user_id) || null,
            char_id: (meta && meta.char_id) || null,
            env: (meta && meta.env) || _ENV,
            scope: (meta && meta.scope) || 'game',
            api_base: (meta && meta.api_base) || null,
            saved_at: Date.now(),
        });
        _MEMORY = payload;
        return _writeRaw(payload);
    }

    /**
     * Read the current Bearer token (memory cache wins, then
     * localStorage). Returns null if neither has a value or if the
     * stored env doesn't match the current env (defensive).
     */
    function getToken() {
        var raw = _MEMORY || _readRaw();
        if (!raw) return null;
        try {
            var parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object' || !parsed.token) return null;
            if (parsed.env && parsed.env !== _ENV) return null;
            _MEMORY = raw;
            return parsed.token;
        } catch (_e) { return null; }
    }

    /**
     * Read the full token record (token + meta). Used by WebApps that
     * need `user_id` / `char_id` / `api_base` without an extra round
     * trip to the server.
     */
    function getRecord() {
        var raw = _MEMORY || _readRaw();
        if (!raw) return null;
        try {
            var parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object' || !parsed.token) return null;
            if (parsed.env && parsed.env !== _ENV) return null;
            return parsed;
        } catch (_e) { return null; }
    }

    /**
     * Clear the stored token. Called on logout, char switch, or after
     * a 401 from /api/*. Idempotent — no error if nothing was stored.
     */
    function clearToken() {
        _MEMORY = null;
        _writeRaw(null);
    }

    /**
     * Debug helper — returns storage metadata WITHOUT exposing the
     * token value itself. Safe to print to console / send via beacon
     * for diagnostics.
     */
    function debugInfo() {
        var rec = getRecord();
        return {
            env: _ENV,
            storage_key: _STORAGE_KEY,
            has_token: !!(rec && rec.token),
            saved_at: rec && rec.saved_at,
            user_id: rec && rec.user_id,
            char_id: rec && rec.char_id,
            scope: rec && rec.scope,
            api_base: rec && rec.api_base,
        };
    }

    root.vAuthTokenStore = {
        setToken: setToken,
        getToken: getToken,
        getRecord: getRecord,
        clearToken: clearToken,
        debugInfo: debugInfo,
        // Exposed for tests / observability — read-only.
        _env: _ENV,
        _key: _STORAGE_KEY,
    };
})(typeof window !== 'undefined' ? window : this);
