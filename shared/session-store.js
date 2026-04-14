/**
 * SessionStore — centralized game session localStorage access.
 *
 * Sub-projeto C (2026-04-14): encapsulates save/restore/clear/isValid for
 * the game's session record, freeing game-core.js from 66+ inline
 * localStorage calls. Built on top of EnvStorage for cross-env isolation.
 *
 * Session record shape:
 *   { token, apiBase, uid, charId, env, ts }
 *
 * Key format:
 *   v_{env}_session          — no charId
 *   v_{env}_session_{charId} — char-bound session
 *
 * Validity rules:
 *   - ts within 30 minutes (aligned with backend _SESSION_TTL)
 *   - env matches current env (enforced by EnvStorage prefix; also re-checked)
 *   - charId matches expected (when provided)
 *
 * Spec: docs/superpowers/specs/2026-04-14-subproject-c-frontend-storage-design.md
 */
var SessionStore = (function () {
    'use strict';

    var TTL_MS = 30 * 60 * 1000;  // 30 min — matches backend _SESSION_TTL
    var BASE_KEY = 'session';

    function _env() {
        if (window.ValdoriaEnv && ValdoriaEnv.id) return ValdoriaEnv.id;
        try {
            var p = new URLSearchParams(window.location.search).get('env');
            if (p === 'prod' || p === 'dev') return p;
        } catch (_) { /* ignored */ }
        return 'dev';
    }

    function _key(charId) {
        return charId ? (BASE_KEY + '_' + charId) : BASE_KEY;
    }

    function _storage() {
        return window.EnvStorage || {
            get: function (k) { return localStorage.getItem('v_' + _env() + '_' + k); },
            set: function (k, v) { localStorage.setItem('v_' + _env() + '_' + k, v); },
            remove: function (k) { localStorage.removeItem('v_' + _env() + '_' + k); },
        };
    }

    function save(data) {
        if (!data || !data.token) return false;
        try {
            var record = {
                token: data.token,
                apiBase: data.apiBase || '',
                uid: data.uid || 0,
                charId: data.charId || '',
                env: data.env || _env(),
                ts: Date.now(),
            };
            _storage().set(_key(data.charId), JSON.stringify(record));
            return true;
        } catch (e) {
            console.warn('[SESSION_STORE] save failed:', e);
            return false;
        }
    }

    function restore(opts) {
        opts = opts || {};
        var expectedCharId = opts.charId || '';
        try {
            var raw = _storage().get(_key(expectedCharId));
            if (!raw) return null;
            var data = JSON.parse(raw);
            if (!isValid(data, opts)) {
                _storage().remove(_key(expectedCharId));
                return null;
            }
            return data;
        } catch (e) {
            console.warn('[SESSION_STORE] restore failed:', e);
            return null;
        }
    }

    function isValid(data, opts) {
        opts = opts || {};
        if (!data || !data.token) return false;
        if (Date.now() - (data.ts || 0) > TTL_MS) return false;
        var currentEnv = opts.env || _env();
        if (data.env && data.env !== currentEnv) {
            console.warn('[SESSION_STORE] env mismatch: stored=' + data.env + ' current=' + currentEnv);
            return false;
        }
        if (opts.charId && data.charId && data.charId !== opts.charId) {
            console.warn('[SESSION_STORE] charId mismatch: stored=' + data.charId + ' expected=' + opts.charId);
            return false;
        }
        return true;
    }

    function clear(charId) {
        try {
            _storage().remove(_key(charId));
            // Also clear the unscoped key in case legacy data sits there.
            if (charId) _storage().remove(_key(''));
            return true;
        } catch (e) {
            console.warn('[SESSION_STORE] clear failed:', e);
            return false;
        }
    }

    function clearAll() {
        try {
            var ls = window.localStorage;
            if (!ls) return;
            var prefix = 'v_' + _env() + '_' + BASE_KEY;
            var toRemove = [];
            for (var i = 0; i < ls.length; i++) {
                var k = ls.key(i);
                if (k && k.indexOf(prefix) === 0) toRemove.push(k);
            }
            toRemove.forEach(function (k) { ls.removeItem(k); });
        } catch (e) {
            console.warn('[SESSION_STORE] clearAll failed:', e);
        }
    }

    return {
        save: save,
        restore: restore,
        isValid: isValid,
        clear: clear,
        clearAll: clearAll,
        TTL_MS: TTL_MS,
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SessionStore;
}
