/**
 * EnvStorage — Centralized environment-namespaced localStorage access.
 *
 * CROSS-ENV ISOLATION (Auth0 + Uber SLATE pattern, 2026-04-12):
 * All localStorage keys are automatically prefixed with the current env
 * (v_dev_ or v_prod_) to prevent cross-environment contamination.
 *
 * UI preference keys (font, audio, immersive, etc.) are SHARED across envs
 * because they don't affect game state.
 *
 * Usage:
 *   EnvStorage.set('session', JSON.stringify(data));  // saves as v_prod_session
 *   EnvStorage.get('session');                        // reads v_prod_session
 *   EnvStorage.remove('session');                     // removes v_prod_session
 *   EnvStorage.raw('valdoria_font');                  // raw access (no prefix)
 *
 * At startup, call EnvStorage.purgeOtherEnvs() to remove all keys from
 * the OTHER env. Also call EnvStorage.migrateLegacy() once to move old
 * unsuffixed keys (valdoria_session, etc.) to the new prefixed format.
 *
 * References:
 * - Auth0: https://auth0.com/blog/secure-browser-storage-the-facts/
 * - Uber SLATE: https://www.uber.com/blog/simplifying-developer-testing-through-slate/
 * - Twelve-Factor App Factor III: https://12factor.net/config
 * - ISO 27001:2022 Annex A 8.31
 */
var EnvStorage = (function() {
    'use strict';

    /* Resolve env: prefer ValdoriaEnv (loaded by env-utils.js before us),
     * fall back to URL param, then to hostname-based detection. */
    var _env = 'dev';
    if (window.ValdoriaEnv && ValdoriaEnv.id) {
        _env = ValdoriaEnv.id;
    } else {
        try {
            var _ep = new URLSearchParams(window.location.search).get('env');
            if (_ep === 'prod' || _ep === 'dev') _env = _ep;
            else if (window.location.hostname === 'jogo.lendasdevaldoria.com.br') _env = 'prod';
        } catch (_) { /* URLSearchParams not available */ }
    }

    var _PREFIX = 'v_' + _env + '_';

    /* Keys that are SHARED across envs (UI preferences only — no game state).
     * These are stored WITHOUT env prefix so changing env doesn't reset prefs.
     * Per CLAUDE.md "Server-Only State" rule: localStorage is ONLY for UI prefs. */
    var _SHARED_SUFFIXES = [
        'font', 'immersive', 'immersive_hint',
        'audio_muted', 'audio_volume', 'audio_music_muted',
        'audio_sfx_muted', 'audio_sfx_volume', 'audio_resume', 'audio_resume_ts',
        'loading_lite', 'device_id', 'cookies',
        'swipe_hint', 'codex_category', 'pending_toast',
        'inv_sort', 'inv_filter', 'inv_viewed', 'inv_view', 'ql_sort',
        'nav_tutorial_v2', 'social_tab', 'guild_tab',
        'census_collapsed', 'settings_audio_collapsed',
    ];

    /* Build lookup set for O(1) check */
    var _SHARED_KEYS = {};
    for (var _si = 0; _si < _SHARED_SUFFIXES.length; _si++) {
        _SHARED_KEYS['valdoria_' + _SHARED_SUFFIXES[_si]] = true;
    }

    /**
     * Compute the actual localStorage key for a logical key.
     * Shared keys (UI prefs) → stored as-is (no prefix).
     * Env-specific keys → prefixed with v_{env}_ to prevent cross-env collision.
     */
    function _key(k) {
        if (_SHARED_KEYS[k]) return k;
        return _PREFIX + k;
    }

    /**
     * Legacy key mapping: old unsuffixed keys → new prefixed keys.
     * Used by migrateLegacy() to move data from pre-fix format.
     *
     * IMPORTANT: Only includes keys managed by game-core.js.
     * web_token, web_user_id, api_base, dev_device are managed by
     * web-auth.js which has its OWN migration logic (key_{env} format).
     * Do NOT migrate those here — EnvStorage uses v_{env}_{key} format
     * which is INCOMPATIBLE with web-auth.js's {key}_{env} format.
     */
    var _LEGACY_KEYS = [
        'valdoria_session',
        'valdoria_game_screen',
        'valdoria_init_crash',
    ];

    return {
        /** Get a value from env-namespaced localStorage. */
        get: function(k) {
            try { return localStorage.getItem(_key(k)); }
            catch (_) { return null; }
        },

        /** Set a value in env-namespaced localStorage. */
        set: function(k, v) {
            try { localStorage.setItem(_key(k), v); }
            catch (_) { /* quota exceeded or disabled */ }
        },

        /** Remove a key from env-namespaced localStorage. */
        remove: function(k) {
            try { localStorage.removeItem(_key(k)); }
            catch (_) { /* disabled */ }
        },

        /** Raw get — direct localStorage access WITHOUT prefix (for shared/legacy keys). */
        rawGet: function(k) {
            try { return localStorage.getItem(k); }
            catch (_) { return null; }
        },

        /** Raw set — direct localStorage access WITHOUT prefix. */
        rawSet: function(k, v) {
            try { localStorage.setItem(k, v); }
            catch (_) { /* quota exceeded */ }
        },

        /** Raw remove — direct localStorage access WITHOUT prefix. */
        rawRemove: function(k) {
            try { localStorage.removeItem(k); }
            catch (_) { /* disabled */ }
        },

        /** Expose key computation for debugging. */
        key: _key,

        /** Current environment. */
        env: _env,

        /** Prefix used for env-specific keys. */
        prefix: _PREFIX,

        /**
         * Purge ALL localStorage keys belonging to the OTHER environment.
         * Also removes legacy unsuffixed session/screen keys.
         * Called at game startup (game-core.js init).
         *
         * Returns the number of keys purged.
         */
        purgeOtherEnvs: function() {
            try {
                var other = (_env === 'prod') ? 'dev' : 'prod';
                var otherPrefix = 'v_' + other + '_';
                /* Also purge old-format keys with other env suffix */
                var otherSessionPrefix = 'valdoria_session_' + other;
                var otherScreenPrefix = 'valdoria_game_screen_' + other;
                /* Legacy unsuffixed keys (pre-fix format) */
                var legacyExact = ['valdoria_session', 'valdoria_game_screen'];

                /* Old-format auth keys use {key}_{env} suffix (written by web-auth.js) */
                var otherSuffix = '_' + other;

                var toPurge = [];
                for (var i = 0; i < localStorage.length; i++) {
                    var k = localStorage.key(i);
                    if (!k) continue;
                    /* New-format other env: v_dev_* or v_prod_* */
                    if (k.indexOf(otherPrefix) === 0) { toPurge.push(k); continue; }
                    /* Old-format other env: valdoria_session_dev_*, valdoria_game_screen_dev_* */
                    if (k.indexOf(otherSessionPrefix) === 0) { toPurge.push(k); continue; }
                    if (k.indexOf(otherScreenPrefix) === 0) { toPurge.push(k); continue; }
                    /* Old-format auth keys: valdoria_web_token_prod, valdoria_api_base_prod, etc. */
                    if (k.indexOf('valdoria_') === 0 && k.length > otherSuffix.length &&
                        k.substring(k.length - otherSuffix.length) === otherSuffix) {
                        toPurge.push(k); continue;
                    }
                    /* Legacy unsuffixed: valdoria_session, valdoria_game_screen (exact match) */
                    for (var li = 0; li < legacyExact.length; li++) {
                        if (k === legacyExact[li]) { toPurge.push(k); break; }
                    }
                }
                for (var pi = 0; pi < toPurge.length; pi++) {
                    try { localStorage.removeItem(toPurge[pi]); } catch (_) {}
                }
                if (toPurge.length > 0) {
                    console.warn('[ENV_STORAGE] Purged ' + toPurge.length + ' cross-env/legacy keys:', toPurge);
                }
                return toPurge.length;
            } catch (_) {
                return 0;
            }
        },

        /**
         * Migrate legacy unsuffixed keys to new env-prefixed format.
         * Reads old key, writes to new prefixed key, removes old key.
         * Safe to call multiple times (idempotent).
         */
        migrateLegacy: function() {
            var migrated = 0;
            for (var mi = 0; mi < _LEGACY_KEYS.length; mi++) {
                var oldKey = _LEGACY_KEYS[mi];
                var newKey = _key(oldKey);
                try {
                    var val = localStorage.getItem(oldKey);
                    if (val !== null && localStorage.getItem(newKey) === null) {
                        localStorage.setItem(newKey, val);
                        migrated++;
                    }
                    if (val !== null) {
                        localStorage.removeItem(oldKey);
                    }
                } catch (_) { /* disabled */ }
            }
            if (migrated > 0) {
                console.info('[ENV_STORAGE] Migrated ' + migrated + ' legacy keys to env-prefixed format');
            }
            return migrated;
        },

        /** Check if a key is shared (no env prefix). */
        isShared: function(k) { return !!_SHARED_KEYS[k]; }
    };
})();
