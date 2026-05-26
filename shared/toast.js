/* Sessao #38 (2026-05-25): toast canonical — centro da tela, fundo opaco,
   barra de progresso esvaziando, duracao 2-5s via Human Reading Time
   (CLAUDE.md MASTER RULE — words * 250ms + min/max por categoria). */
(function () {
    if (window.__vToastLoaded) return;
    window.__vToastLoaded = true;

    var _vToastTimeout = null;
    var _vToastBarRaf = null;
    var _vToastEl = null;

    function _ensureEl() {
        if (_vToastEl && _vToastEl.isConnected) return _vToastEl;
        _vToastEl = document.getElementById('v-shared-toast');
        if (!_vToastEl) {
            _vToastEl = document.createElement('div');
            _vToastEl.id = 'v-shared-toast';
            _vToastEl.innerHTML = '<div class="v-toast-msg"></div><div class="v-toast-bar"><div class="v-toast-bar-fill"></div></div>';
            document.body.appendChild(_vToastEl);
        } else if (!_vToastEl.querySelector('.v-toast-bar')) {
            // Migrate old DOM (texto direto sem .v-toast-msg/.v-toast-bar)
            _vToastEl.innerHTML = '<div class="v-toast-msg"></div><div class="v-toast-bar"><div class="v-toast-bar-fill"></div></div>';
        }
        return _vToastEl;
    }

    function vToast(text, type, duration) {
        if (!text) return;
        type = type || 'ok';

        // Calcula duracao via Human Reading Time (CLAUDE.md MASTER RULE)
        if (duration === undefined || duration === null) {
            var clean = (text || '').replace(/<[^>]*>/g, '');
            var isImportant = (type === 'err' || type === 'warn');
            if (typeof calcReadTime === 'function') {
                duration = calcReadTime(clean, isImportant ? 'toast-warn' : 'toast');
            } else {
                // Fallback: words*250ms, clamped a 2-5s
                var words = clean.trim().split(/\s+/).filter(Boolean).length;
                var minMs = isImportant ? 2000 : 1500;
                var maxMs = isImportant ? 5000 : 4000;
                duration = Math.max(minMs, Math.min(maxMs, words * 250));
            }
        }

        // Haptic feedback
        if (type === 'err' && typeof hapticNotify === 'function') hapticNotify('error');
        else if (type === 'warn' && typeof hapticNotify === 'function') hapticNotify('warning');

        // Reset timers
        if (_vToastTimeout) { clearTimeout(_vToastTimeout); _vToastTimeout = null; }
        if (_vToastBarRaf) { cancelAnimationFrame(_vToastBarRaf); _vToastBarRaf = null; }

        var el = _ensureEl();
        el.className = 'v-toast v-toast-' + type;
        var msgEl = el.querySelector('.v-toast-msg');
        var barFill = el.querySelector('.v-toast-bar-fill');
        if (msgEl) msgEl.innerHTML = text;
        if (barFill) barFill.style.width = '100%';

        el.style.display = '';

        // Elevated z-index quando ha popup overlay aberto
        if (document.querySelector('.v-popup-overlay.active')) {
            el.classList.add('v-toast-elevated');
        } else {
            el.classList.remove('v-toast-elevated');
        }

        // Barra de progresso esvaziando — animacao linear via rAF.
        // Evita CSS transition pra precisao + sincronia perfeita com timeout.
        if (barFill) {
            var startTs = performance.now();
            var totalMs = duration;
            function _tick(ts) {
                var elapsed = ts - startTs;
                var pct = Math.max(0, 1 - (elapsed / totalMs));
                barFill.style.width = (pct * 100).toFixed(2) + '%';
                if (elapsed < totalMs) {
                    _vToastBarRaf = requestAnimationFrame(_tick);
                } else {
                    barFill.style.width = '0%';
                }
            }
            _vToastBarRaf = requestAnimationFrame(_tick);
        }

        _vToastTimeout = setTimeout(function () {
            var hideEl = _vToastEl || document.getElementById('v-shared-toast');
            if (!hideEl) return;
            hideEl.classList.add('v-toast-hiding');
            setTimeout(function () {
                var e2 = _vToastEl || document.getElementById('v-shared-toast');
                if (e2) {
                    e2.style.display = 'none';
                    e2.classList.remove('v-toast-hiding');
                }
            }, 300);
        }, duration);
    }

    function showToast(text, duration) { vToast(text, 'ok', duration); }

    window.vToast = vToast;
    window.showToast = showToast;
})();
