/* shared/toast.js — Canonical toast component
   Usage: vToast(text)  or  vToast(text, 'err')  or  vToast(text, 'warn', 5000)
   Types: 'ok' (default golden), 'warn' (orange), 'err' (red), 'info' (green)
   Duration: auto-calculated from text length (Human Reading Time rule) */

/* eslint-disable no-unused-vars */

var _vToastTimeout = null;
var _vToastEl = null;

/**
 * Show a toast notification.
 * @param {string} text - Message text (HTML stripped for duration calc)
 * @param {string} [type='ok'] - 'ok'|'warn'|'err'|'info'
 * @param {number} [duration] - Override duration in ms (auto-calculated if omitted)
 */
function vToast(text, type, duration) {
    if (!text) return;
    type = type || 'ok';

    // Calculate duration from text if not provided
    if (duration === undefined || duration === null) {
        var clean = (text || '').replace(/<[^>]*>/g, '');
        var words = clean.trim().split(/\s+/).filter(Boolean).length;
        var isImportant = (type === 'err' || type === 'warn');
        var minMs = isImportant ? 2000 : 1500;
        var maxMs = isImportant ? 5000 : 4000;
        // Use calcReadTime if available (shared/text-timing.js)
        if (typeof calcReadTime === 'function') {
            duration = calcReadTime(clean, isImportant ? 'toast-warn' : 'toast');
        } else {
            duration = Math.max(minMs, Math.min(maxMs, words * 250));
        }
    }

    // Haptic feedback for errors/warnings
    if (type === 'err' && typeof hapticNotify === 'function') hapticNotify('error');
    else if (type === 'warn' && typeof hapticNotify === 'function') hapticNotify('warning');

    // Clear existing toast
    if (_vToastTimeout) clearTimeout(_vToastTimeout);

    // Create or reuse toast element
    if (!_vToastEl) {
        _vToastEl = document.createElement('div');
        _vToastEl.id = 'v-shared-toast';
        document.body.appendChild(_vToastEl);
    }

    // Dynamic positioning: above bottom panel if present
    var panel = document.getElementById('bottom-panel') || document.getElementById('bottomPanel');
    if (panel && panel.offsetHeight > 0) {
        _vToastEl.style.bottom = (panel.offsetHeight + 12) + 'px';
    }

    // Set content and show
    _vToastEl.className = 'v-toast v-toast-' + type;
    _vToastEl.innerHTML = text;
    _vToastEl.style.display = '';

    // Auto-hide after duration
    _vToastTimeout = setTimeout(function () {
        _vToastEl.classList.add('v-toast-hiding');
        setTimeout(function () {
            if (_vToastEl) _vToastEl.style.display = 'none';
            if (_vToastEl) _vToastEl.classList.remove('v-toast-hiding');
        }, 300);
    }, duration);
}

/**
 * Convenience aliases for backward compatibility.
 * WebApps can call showToast(text, duration) or toast(msg, type).
 */
function showToast(text, duration) {
    vToast(text, 'ok', duration);
}
