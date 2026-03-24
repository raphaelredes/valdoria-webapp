/**
 * ValdoriaLoadingController v2.0 - Unified loading system
 * State machine + retry + timeout + ring/gem effects + stage text
 *
 * Usage:
 *   window._ctrl = ValdoriaLoadingController({
 *     overlayId: 'combatLoading',
 *     tips: TIPS_ARRAY,
 *     onRetry: function() { location.reload(); }
 *   });
 */
window.ValdoriaLoadingController = function(config) {
    'use strict';

    var _state = 'loading';
    var tips = config.tips || [];
    var tipEl = document.getElementById(config.tipId || 'loading-tip');
    var progressEl = document.getElementById(config.progressId || 'loading-progress');
    var overlay = document.getElementById(config.overlayId || 'loading')
        || document.getElementById('loading');
    var stageEl = document.getElementById(config.stageId || 'loading-stage');
    var retryBtn = document.getElementById(config.retryId || 'loading-retry');

    var TIP_INTERVAL = config.tipInterval || 5000;
    var TIMEOUT_MS = config.timeoutMs || 15000;
    var RETRY_DELAY_MS = config.retryDelayMs || 10000;
    var HAS_RING_ACCEL = config.hasRingAccel !== false;
    var HAS_GEM_PHASE = config.hasGemPhase !== false;
    var onRetry = config.onRetry || function() { location.reload(); };
    var onTimeout = config.onTimeout || null;

    var tipIndex = Math.floor(Math.random() * tips.length);
    if (tipEl && tips.length) tipEl.textContent = tips[tipIndex];
    var _loadStart = Date.now();
    var MIN_LOAD_MS = window.__spaRevisit
        ? (window.VALDORIA_SPA_RETURN_MS || 1500)
        : (window.VALDORIA_MIN_LOAD_MS || 5000);
    var _progress = 0;
    var _realProgress = -1;
    var _timers = {};
    var _hideCb = null;
    var _cinematicTimers = [];
    var _animEndHandler = null;

    if (!retryBtn && overlay) {
        retryBtn = document.createElement('button');
        retryBtn.id = config.retryId || 'loading-retry';
        retryBtn.className = 'loading-retry';
        retryBtn.textContent = 'Tentar novamente';
        retryBtn.style.display = 'none';
        var tipArea = overlay.querySelector('.loading-tip-area');
        if (tipArea) tipArea.appendChild(retryBtn);
        else overlay.appendChild(retryBtn);
    }
    if (retryBtn) {
        retryBtn.style.display = 'none';
        retryBtn.addEventListener('click', function() {
            if (typeof onRetry === 'function') onRetry();
        });
    }

    _timers.progress = setInterval(function() {
        if (_realProgress >= 0) return;
        _progress += (90 - _progress) * 0.08;
        if (progressEl) { progressEl.style.width = _progress + '%'; progressEl.setAttribute('aria-valuenow', Math.round(_progress)); }
        if (HAS_RING_ACCEL) _updateRingSpeed(_progress);
        if (HAS_GEM_PHASE) _updateGemPhase(_progress);
    }, 200);

    _timers.tip = setInterval(function() {
        if (!tips.length || _state === 'hiding' || _state === 'hidden') return;
        tipIndex = (tipIndex + 1) % tips.length;
        if (tipEl) {
            tipEl.classList.add('tip-exit');
            setTimeout(function() {
                if (_state === 'hiding' || _state === 'hidden') return;
                if (!tipEl) return;
                tipEl.textContent = tips[tipIndex];
                tipEl.classList.remove('tip-exit');
                tipEl.classList.add('tip-enter');
                setTimeout(function() {
                    if (_state === 'hiding' || _state === 'hidden') return;
                    if (tipEl) tipEl.classList.remove('tip-enter');
                }, 350);
            }, 300);
        }
    }, TIP_INTERVAL);

    _timers.slow = setTimeout(function() {
        if (_state !== 'loading') return;
        _state = 'slow';
        if (tipEl) {
            tipEl.classList.add('loading-tip-slow');
            tipEl.textContent = 'Demorando um pouco mais que o esperado...';
        }
    }, 8000);

    _timers.verySlow = setTimeout(function() {
        if (_state !== 'slow' && _state !== 'loading') return;
        _state = 'very_slow';
        if (tipEl) tipEl.textContent = '\u23F3 Conex\u00e3o lenta \u2014 verifique seu sinal ou tente novamente';
    }, 12000);

    _timers.retry = setTimeout(function() {
        if (_state === 'hiding' || _state === 'hidden') return;
        if (retryBtn) retryBtn.style.display = '';
    }, RETRY_DELAY_MS);

    _timers.timeout = setTimeout(function() {
        if (_state === 'hiding' || _state === 'hidden') return;
        if (tipEl) tipEl.textContent = '\u26A0\uFE0F Tempo esgotado. Tente novamente.';
        if (retryBtn) retryBtn.style.display = '';
        if (typeof onTimeout === 'function') onTimeout();
    }, TIMEOUT_MS);

    function _updateRingSpeed(pct) {
        if (!overlay) return;
        var factor = 1 + (pct / 100) * 1.5;
        var outer = overlay.querySelector('.mc-outer');
        var mid = overlay.querySelector('.mc-mid');
        var inner = overlay.querySelector('.mc-inner');
        if (outer) outer.style.animationDuration = Math.max(8, 30 / factor) + 's';
        if (mid) mid.style.animationDuration = Math.max(6, 24 / factor) + 's';
        if (inner) inner.style.animationDuration = Math.max(4, 16 / factor) + 's';
    }

    function _updateGemPhase(pct) {
        if (!overlay) return;
        var circle = overlay.querySelector('.magic-circle');
        if (!circle) return;
        if (pct >= 90) circle.setAttribute('data-phase', '2');
        else if (pct >= 50) circle.setAttribute('data-phase', '1');
        else circle.removeAttribute('data-phase');
    }

    function _cleanup() {
        Object.keys(_timers).forEach(function(k) {
            if (typeof _timers[k] === 'number') {
                clearTimeout(_timers[k]);
                clearInterval(_timers[k]);
            }
        });
        _timers = {};
    }

    function _cinematicExit(cb) {
        _hideCb = cb;
        if (!overlay || overlay.classList.contains('hidden')) { if (cb) cb(); return; }
        if (progressEl) progressEl.style.width = '100%';
        if (HAS_RING_ACCEL) _updateRingSpeed(100);
        if (HAS_GEM_PHASE) _updateGemPhase(100);
        var waves = overlay.querySelectorAll('.mc-completion-wave');
        waves.forEach(function(w) { w.classList.add('active'); });
        try {
            if (window.Telegram && Telegram.WebApp && Telegram.WebApp.HapticFeedback) {
                Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
            }
        } catch(_){console.warn('[LOADING]',_);}
        _cinematicTimers.push(setTimeout(function() {
            overlay.classList.add('exit-cinematic');
            var _exitDone = false;
            function _finishCinematic() {
                if (_exitDone) return;
                _exitDone = true;
                overlay.classList.add('hidden');
                overlay.style.display = 'none';
                _state = 'hidden';
                if (retryBtn) retryBtn.style.display = 'none';
                _hideCb = null;
                _cinematicTimers = [];
                if (cb) cb();
            }
            _animEndHandler = function(e) {
                if (e.target === overlay) {
                    overlay.removeEventListener('animationend', _animEndHandler);
                    _animEndHandler = null;
                    _finishCinematic();
                }
            };
            overlay.addEventListener('animationend', _animEndHandler);
            _cinematicTimers.push(setTimeout(_finishCinematic, 950));
        }, 350));
    }

    return {
        hide: function(cb) {
            if (_state === 'hiding' || _state === 'hidden') return;
            _cleanup();
            if (!overlay || overlay.classList.contains('hidden')) {
                _state = 'hidden';
                if (cb) cb();
                return;
            }
            var elapsed = Date.now() - _loadStart;
            var remaining = MIN_LOAD_MS - elapsed;
            if (remaining > 0) {
                var self = this;
                setTimeout(function() { self.hide(cb); }, remaining);
                return;
            }
            _state = 'hiding';
            _cinematicExit(cb);
        },

        forceHide: function() {
            _cleanup();
            _cinematicTimers.forEach(function(t) { clearTimeout(t); });
            _cinematicTimers = [];
            if (_animEndHandler && overlay) {
                overlay.removeEventListener('animationend', _animEndHandler);
                _animEndHandler = null;
            }
            if (overlay) {
                overlay.classList.add('hidden');
                overlay.classList.remove('exit-cinematic');
                overlay.style.display = 'none';
            }
            if (retryBtn) retryBtn.style.display = 'none';
            _state = 'hidden';
            if (_hideCb) { try { _hideCb(); } catch(e){console.warn('[LOADING_CONTROLLER]',e);} _hideCb = null; }
        },

        show: function(isRetry) {
            if (_state === 'hiding') this.forceHide();
            _cleanup();
            _state = 'loading';
            _loadStart = Date.now();
            _progress = 0;
            _realProgress = -1;
            if (overlay) {
                overlay.classList.remove('hidden', 'exit-cinematic');
                var waves = overlay.querySelectorAll('.mc-completion-wave');
                waves.forEach(function(w) { w.classList.remove('active'); });
                overlay.style.animation = 'none'; void overlay.offsetHeight; overlay.style.animation = '';
                var _rings = overlay.querySelectorAll('.mc-ring');
                _rings.forEach(function(r) { r.style.animationDuration = ''; r.style.animation = 'none'; void r.offsetHeight; r.style.animation = ''; });
            }
            if (progressEl) progressEl.style.width = '0%';
            if (retryBtn) retryBtn.style.display = 'none';
            if (tipEl) {
                tipEl.classList.remove('loading-tip-slow');
                if (isRetry) {
                    tipEl.textContent = 'Reconectando...';
                } else if (tips.length) {
                    tipIndex = Math.floor(Math.random() * tips.length);
                    tipEl.textContent = tips[tipIndex];
                }
            }
            if (stageEl) stageEl.textContent = '';
            if (HAS_GEM_PHASE && overlay) {
                var circle = overlay.querySelector('.magic-circle');
                if (circle) circle.removeAttribute('data-phase');
            }
            _timers.progress = setInterval(function() {
                if (_realProgress >= 0) return;
                _progress += (90 - _progress) * 0.08;
                if (progressEl) { progressEl.style.width = _progress + '%'; progressEl.setAttribute('aria-valuenow', Math.round(_progress)); }
                if (HAS_RING_ACCEL) _updateRingSpeed(_progress);
                if (HAS_GEM_PHASE) _updateGemPhase(_progress);
            }, 200);
            _timers.tip = setInterval(function() {
                if (!tips.length || _state === 'hiding' || _state === 'hidden') return;
                tipIndex = (tipIndex + 1) % tips.length;
                if (tipEl) {
                    tipEl.classList.add('tip-exit');
                    setTimeout(function() {
                        if (_state === 'hiding' || _state === 'hidden') return;
                        if (!tipEl) return;
                        tipEl.textContent = tips[tipIndex];
                        tipEl.classList.remove('tip-exit');
                        tipEl.classList.add('tip-enter');
                        setTimeout(function() {
                            if (_state === 'hiding' || _state === 'hidden') return;
                            if (tipEl) tipEl.classList.remove('tip-enter');
                        }, 350);
                    }, 300);
                }
            }, TIP_INTERVAL);
            _timers.slow = setTimeout(function() {
                if (_state !== 'loading') return;
                _state = 'slow';
                if (tipEl) {
                    tipEl.classList.add('loading-tip-slow');
                    tipEl.textContent = 'Demorando um pouco mais que o esperado...';
                }
            }, 8000);
            _timers.verySlow = setTimeout(function() {
                if (_state !== 'slow' && _state !== 'loading') return;
                _state = 'very_slow';
                if (tipEl) tipEl.textContent = '\u23F3 Conex\u00e3o lenta \u2014 verifique seu sinal ou tente novamente';
            }, 12000);
            _timers.retry = setTimeout(function() {
                if (_state === 'hiding' || _state === 'hidden') return;
                if (retryBtn) retryBtn.style.display = '';
            }, RETRY_DELAY_MS);
            _timers.timeout = setTimeout(function() {
                if (_state === 'hiding' || _state === 'hidden') return;
                if (tipEl) tipEl.textContent = '\u26A0\uFE0F Tempo esgotado. Tente novamente.';
                if (retryBtn) retryBtn.style.display = '';
                if (typeof onTimeout === 'function') onTimeout();
            }, TIMEOUT_MS);
            _timers.gemHint = setTimeout(function() {
                if (_state === 'hiding' || _state === 'hidden') return;
                var gemEl = overlay ? overlay.querySelector('.mc-gem') : null;
                if (gemEl) {
                    gemEl.classList.add('gem-hint');
                    setTimeout(function() {
                        if (_state === 'hiding' || _state === 'hidden') return;
                        gemEl.classList.remove('gem-hint');
                    }, 1500);
                }
            }, 4000);
        },

        setProgress: function(pct, stageName) {
            pct = Math.max(0, Math.min(100, pct || 0));
            if (isNaN(pct)) pct = 0;
            _realProgress = pct;
            _progress = _realProgress;
            if (progressEl) { progressEl.style.width = _progress + '%'; progressEl.setAttribute('aria-valuenow', Math.round(_progress)); }
            if (stageEl && stageName) stageEl.textContent = stageName;
            if (HAS_RING_ACCEL) _updateRingSpeed(_progress);
            if (HAS_GEM_PHASE) _updateGemPhase(_progress);
        },

        getState: function() { return _state; },

        cleanup: _cleanup,

        // Aliases for backward compatibility (explore uses hideLoading/hideQuick)
        hideLoading: function(cb) { this.hide(cb); },
        hideQuick: function() { this.forceHide(); }
    };
};
