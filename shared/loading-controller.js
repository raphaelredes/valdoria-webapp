// == LOAD-DBG Relay Engine ==
(function(){var _q=[],_api='',_flushing=false,_t0=Date.now(),_app='';
window._loadDbg=function(msg){var el=Date.now()-_t0;var full='[LOAD-DBG] ['+(_app||'?')+'] +'+el+'ms '+msg;console.warn(full);_q.push({level:'warn',msg:full.substring(0,500)});if(_q.length>80)_q.shift();if(_api&&_q.length>=20)_flush();};
window._loadDbgSetApp=function(n){_app=n;};
window._loadDbgSetApi=function(b){_api=(b||'').replace(/\/$/,'');if(_api&&_q.length)_flush();};
function _flush(){if(_flushing||!_api||!_q.length)return;if(document.visibilityState==='hidden')return;_flushing=true;var entries=_q.splice(0,25);fetch(_api+'/api/game/log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({entries:entries})}).catch(function(){_q=entries.concat(_q);if(_q.length>80)_q.length=80;}).finally(function(){_flushing=false;});}
window.addEventListener('pagehide',function(){if(!_api||!_q.length)return;try{navigator.sendBeacon(_api+'/api/game/log',JSON.stringify({entries:_q.splice(0,25)}));}catch(e){/* sendBeacon on pagehide - intentionally silent */}});
setInterval(function(){if(_api&&_q.length)_flush();},3000);
})();
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
    window._loadingGuardBypass = true;
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
    var AUTO_RETRY_MAX = config.autoRetryMax !== undefined ? config.autoRetryMax : 0;
    var onRetry = config.onRetry || function() { location.reload(); };
    var onTimeout = config.onTimeout || null;

    var _autoRetryCount = 0;
    var tipIndex = Math.floor(Math.random() * tips.length);
    if (tipEl && tips.length) tipEl.textContent = tips[tipIndex];
    var _loadStart = Date.now();
    var MIN_LOAD_MS = window.__spaRevisit
        ? (window.VALDORIA_SPA_RETURN_MS || 1500)
        : (window.VALDORIA_MIN_LOAD_MS || 5000);
    if(window._loadDbg)_loadDbg('ctrl.init overlay='+(config.overlayId||'loading')+' tier='+(window._valdoriaPerformanceTier||'?')+' minLoad='+MIN_LOAD_MS+'ms');
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
            console.warn('[LOADING] Manual retry button clicked');
            // Reset exhausted state visual
            if (overlay) {
                var _rings2 = overlay.querySelectorAll('.mc-ring');
                _rings2.forEach(function(r) { r.style.animationPlayState = ''; });
                var _gem2 = overlay.querySelector('.mc-gem');
                if (_gem2) _gem2.classList.remove('gem-error');
            }
            if (typeof onRetry === 'function') onRetry();
        });
    }

    _timers.progress = setInterval(function() {
        var ceil = (_realProgress >= 0) ? Math.min(_realProgress + 15, 90) : 90;
        if (_progress >= ceil) return;
        _progress += (ceil - _progress) * 0.08;
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
        console.warn('[LOADING] state: loading->slow (8s)');
        if(window._loadDbg)_loadDbg('state: loading->slow (8s)');
        if (tipEl) {
            tipEl.classList.add('loading-tip-slow');
            tipEl.textContent = 'Demorando um pouco mais que o esperado...';
        }
    }, 8000);

    _timers.verySlow = setTimeout(function() {
        if (_state !== 'slow' && _state !== 'loading') return;
        _state = 'very_slow';
        console.warn('[LOADING] state: slow->very_slow (12s)');
        if(window._loadDbg)_loadDbg('state: slow->very_slow (12s)');
        if (tipEl) tipEl.textContent = '\u23F3 Conex\u00e3o lenta \u2014 verifique seu sinal ou tente novamente';
    }, 12000);

    _timers.retry = setTimeout(function() {
        if (_state === 'hiding' || _state === 'hidden') return;
        if (retryBtn) retryBtn.style.display = '';
    }, RETRY_DELAY_MS);

    _timers.timeout = setTimeout(function() { _handleTimeout(); }, TIMEOUT_MS);

    function _handleTimeout() {
        if (_state === 'hiding' || _state === 'hidden') return;
        if (_autoRetryCount < AUTO_RETRY_MAX) {
            _autoRetryCount++;
            console.warn('[LOADING] AUTO_RETRY attempt ' + _autoRetryCount + '/' + AUTO_RETRY_MAX);
            if(window._loadDbg)_loadDbg('AUTO_RETRY attempt ' + _autoRetryCount + '/' + AUTO_RETRY_MAX);
            if (tipEl) {
                tipEl.classList.remove('loading-tip-slow');
                tipEl.textContent = 'Reconectando... (tentativa ' + (_autoRetryCount + 1) + '/' + (AUTO_RETRY_MAX + 1) + ')';
            }
            if (typeof onRetry === 'function') onRetry();
            return;
        }
        _state = 'exhausted';
        console.warn('[LOADING] EXHAUSTED after ' + AUTO_RETRY_MAX + ' auto-retries — manual retry only');
        if(window._loadDbg)_loadDbg('state: EXHAUSTED after ' + AUTO_RETRY_MAX + ' auto-retries ('+TIMEOUT_MS+'ms)');
        if (tipEl) tipEl.textContent = '⚠️ Servidor indisponível. Toque para tentar novamente.';
        if (retryBtn) retryBtn.style.display = '';
        // Circuit breaker visual: stop rings, error gem
        if (overlay) {
            var _rings = overlay.querySelectorAll('.mc-ring');
            _rings.forEach(function(r) { r.style.animationPlayState = 'paused'; });
            var _gem = overlay.querySelector('.mc-gem');
            if (_gem) _gem.classList.add('gem-error');
        }
        if (typeof onTimeout === 'function') onTimeout();
    }

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
                if(window._loadDbg)_loadDbg('hidden total='+(Date.now()-_loadStart)+'ms');
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
            if (_state === 'hiding' || _state === 'hidden') { if (cb) cb(); return; }
            console.warn('[LOADING] hide() state=' + _state + ' elapsed=' + (Date.now() - _loadStart) + 'ms');
            if(window._loadDbg){var _el=Date.now()-_loadStart;_loadDbg('hide() state='+_state+' elapsed='+_el+'ms remaining='+(MIN_LOAD_MS-_el)+'ms');}
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
            console.warn('[LOADING] forceHide() total=' + (Date.now() - _loadStart) + 'ms');
            if(window._loadDbg)_loadDbg('forceHide() total='+(Date.now()-_loadStart)+'ms');
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
            console.warn('[LOADING] show(' + (isRetry ? 'retry' : 'init') + ') prevState=' + _state);
            if(window._loadDbg)_loadDbg('show('+(isRetry?'retry':'init')+')');
            // Idempotent: if already loading and not a retry, skip reset to prevent
            // animation restart (flash) and progress/timer reset (visual glitch)
            if (_state === 'loading' && !isRetry) {
                console.warn('[LOADING] show() skipped — already in loading state');
                if(window._loadDbg)_loadDbg('show() SKIPPED (already loading)');
                return;
            }
            if (_state === 'hiding') this.forceHide();
            _cleanup();
            _state = 'loading';
            _loadStart = Date.now();
            _progress = 0;
            _realProgress = -1;
            if (overlay) {
                overlay.style.display = '';
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
                var ceil = (_realProgress >= 0) ? Math.min(_realProgress + 15, 90) : 90;
                if (_progress >= ceil) return;
                _progress += (ceil - _progress) * 0.08;
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
            if (!isRetry) _autoRetryCount = 0;
            _timers.timeout = setTimeout(function() { _handleTimeout(); }, TIMEOUT_MS);
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
            if (stageEl && stageName){stageEl.textContent = stageName;if(window._loadDbg)_loadDbg('progress='+Math.round(pct)+'% stage='+stageName);}
            if (HAS_RING_ACCEL) _updateRingSpeed(_progress);
            if (HAS_GEM_PHASE) _updateGemPhase(_progress);
        },

        setTips: function(newTips) {
            if (!newTips || !newTips.length) return;
            tips = newTips;
            tipIndex = Math.floor(Math.random() * tips.length);
            if (tipEl && tips.length) tipEl.textContent = tips[tipIndex];
        },

        getState: function() { return _state; },

        resetTimers: function() {
            ['slow', 'verySlow', 'retry', 'timeout'].forEach(function(k) {
                if (_timers[k]) { clearTimeout(_timers[k]); delete _timers[k]; }
            });
            _state = 'loading';
            _autoRetryCount = 0;
            if (tipEl) {
                tipEl.classList.remove('loading-tip-slow');
                if (tips.length) {
                    tipIndex = Math.floor(Math.random() * tips.length);
                    tipEl.textContent = tips[tipIndex];
                }
            }
            if (retryBtn) retryBtn.style.display = 'none';
            _timers.slow = setTimeout(function() {
                if (_state !== 'loading') return;
                _state = 'slow';
                if(window._loadDbg)_loadDbg('state: loading->slow (8s) [reset]');
                if (tipEl) { tipEl.classList.add('loading-tip-slow'); tipEl.textContent = 'Demorando um pouco mais que o esperado...'; }
            }, 8000);
            _timers.verySlow = setTimeout(function() {
                if (_state !== 'slow' && _state !== 'loading') return;
                _state = 'very_slow';
                if(window._loadDbg)_loadDbg('state: slow->very_slow (12s) [reset]');
                if (tipEl) tipEl.textContent = '⏳ Conexão lenta — verifique seu sinal ou tente novamente';
            }, 12000);
            _timers.retry = setTimeout(function() {
                if (_state === 'hiding' || _state === 'hidden') return;
                if (retryBtn) retryBtn.style.display = '';
            }, RETRY_DELAY_MS);
            _timers.timeout = setTimeout(function() { _handleTimeout(); }, TIMEOUT_MS);
            if(window._loadDbg)_loadDbg('resetTimers() fresh '+TIMEOUT_MS+'ms budget');
        },

        cleanup: _cleanup,

        // Aliases for backward compatibility (explore uses hideLoading/hideQuick)
        hideLoading: function(cb) { this.hide(cb); },
        hideQuick: function() { this.forceHide(); }
    };
};
