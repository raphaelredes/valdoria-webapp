// ═══════════════════════════════════════════════════════════
//  Toast Notification — Shared Utility
//  Usage: ValdoriaToast.show('Mensagem', 'info')
//  Auto-calculates reading time via text-timing.js if available
// ═══════════════════════════════════════════════════════════

var ValdoriaToast = (function() {
    'use strict';

    var _el = null;
    var _timeout = null;

    function _getOrCreate() {
        if (_el) return _el;
        _el = document.getElementById('v-toast');
        if (!_el) {
            _el = document.createElement('div');
            _el.id = 'v-toast';
            _el.className = 'v-toast';
            document.body.appendChild(_el);
        }
        return _el;
    }

    function _calcDuration(text, type) {
        if (typeof window.calcReadTime === 'function') {
            return window.calcReadTime(text, type === 'warn' ? 'toast-warn' : 'toast');
        }
        var words = (text || '').replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(Boolean).length;
        var base = words * 250;
        if (type === 'warn') return Math.max(2000, Math.min(5000, base));
        return Math.max(1500, Math.min(4000, base));
    }

    /**
     * Show a toast notification.
     * @param {string} text - Message to display
     * @param {string} [type='info'] - 'info' or 'warn' (affects min duration)
     * @param {number} [duration] - Override duration in ms (auto-calculated if omitted)
     */
    function show(text, type, duration) {
        var el = _getOrCreate();
        type = type || 'info';
        duration = duration || _calcDuration(text, type);

        if (_timeout) clearTimeout(_timeout);

        el.textContent = text;
        el.className = 'v-toast v-toast-' + type;
        el.style.display = '';
        el.style.animation = 'none';
        el.offsetHeight; // reflow
        el.style.animation = '';

        _timeout = setTimeout(function() {
            el.classList.add('v-toast-hiding');
            setTimeout(function() {
                el.style.display = 'none';
                el.classList.remove('v-toast-hiding');
            }, 300);
        }, duration);
    }

    return { show: show };
})();
