/* ===================================================================
   DEVICE ID — Persistent device identifier via localStorage
   Each WebView/browser engine has its own localStorage, so each
   physical device gets a unique ID. Used by the server to detect
   multi-device access and enforce single-active-device per character.
   Usage: DeviceId.get()  → returns persistent UUID string
          DeviceId.reset() → clears stored ID (next get() generates new)
   =================================================================== */

// eslint-disable-next-line no-unused-vars
var DeviceId = (function () {
    'use strict';

    var KEY = 'valdoria_device_id';

    function get() {
        try {
            var id = localStorage.getItem(KEY);
            if (!id) {
                id = _generate();
                localStorage.setItem(KEY, id);
            }
            return id;
        } catch (e) {
            // localStorage unavailable (private browsing, quota exceeded)
            return '';
        }
    }

    function reset() {
        try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    }

    function _generate() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        // Fallback for older WebViews
        return 'did_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    return { get: get, reset: reset };
})();
