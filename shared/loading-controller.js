/**
 * ValdoriaLoadingController - Factory genérica para loading screens
 * Substitui boilerplate duplicado em 7+ *-loading.js files
 *
 * Uso:
 *   window._combatLoadingCtrl = ValdoriaLoadingController({
 *     overlayId: 'combatLoading',
 *     tips: COMBAT_TIPS
 *   });
 */
window.ValdoriaLoadingController = function(config) {
    'use strict';
    var tips = config.tips || [];
    var tipEl = document.getElementById(config.tipId || 'loading-tip');
    var progressEl = document.getElementById(config.progressId || 'loading-progress');
    var overlay = document.getElementById(config.overlayId || 'loading');
    var tipIndex = Math.floor(Math.random() * tips.length);
    if (tipEl && tips.length) tipEl.textContent = tips[tipIndex];

    var _loadStart = Date.now();
    var MIN_LOAD_MS = window.__spaRevisit
        ? (window.VALDORIA_SPA_RETURN_MS || 1500)
        : (window.VALDORIA_MIN_LOAD_MS || 5000);
    var _progress = 0;
    var _hiding = false;

    var _progressTimer = setInterval(function() {
        _progress += (90 - _progress) * 0.08;
        if (progressEl) progressEl.style.width = _progress + '%';
    }, 200);

    var _tipInterval = setInterval(function() {
        if (\!tips.length) return;
        tipIndex = (tipIndex + 1) % tips.length;
        if (tipEl) {
            tipEl.classList.add('tip-exit');
            setTimeout(function() {
                tipEl.textContent = tips[tipIndex];
                tipEl.classList.remove('tip-exit');
                tipEl.classList.add('tip-enter');
                setTimeout(function() { tipEl.classList.remove('tip-enter'); }, 350);
            }, 300);
        }
    }, config.tipInterval || 5000);

    /* Escalação de timeout (modelo Nielsen) */
    var _slowTimer = setTimeout(function() {
        if (\!overlay || overlay.classList.contains('hidden')) return;
        if (tipEl) {
            tipEl.classList.add('loading-tip-slow');
            tipEl.textContent = 'Demorando um pouco mais que o esperado...';
        }
    }, 8000);

    var _verySlowTimer = setTimeout(function() {
        if (\!overlay || overlay.classList.contains('hidden')) return;
        if (tipEl) tipEl.textContent = '⏳ Conexão lenta — verifique seu sinal ou tente novamente';
    }, 12000);

    function _cleanup() {
        clearInterval(_tipInterval);
        clearInterval(_progressTimer);
        clearTimeout(_slowTimer);
        clearTimeout(_verySlowTimer);
    }

    return {
        hide: function() {
            if (_hiding) return;
            _cleanup();
            if (\!overlay || overlay.classList.contains('hidden')) return;
            var elapsed = Date.now() - _loadStart;
            var remaining = MIN_LOAD_MS - elapsed;
            if (remaining > 0) {
                var self = this;
                setTimeout(function() { self.hide(); }, remaining);
                return;
            }
            _hiding = true;
            if (progressEl) progressEl.style.width = '100%';

            var waves = overlay.querySelectorAll('.mc-completion-wave');
            waves.forEach(function(w) { w.classList.add('active'); });
            try {
                if (window.Telegram && Telegram.WebApp && Telegram.WebApp.HapticFeedback) {
                    Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
                }
            } catch (_) {}

            setTimeout(function() {
                overlay.classList.add('exit-cinematic');
                setTimeout(function() {
                    overlay.classList.add('hidden');
                    _hiding = false;
                }, 950);
            }, 350);
        },
        setProgress: function(pct) {
            if (progressEl) progressEl.style.width = Math.min(100, pct) + '%';
        },
        cleanup: _cleanup
    };
};
