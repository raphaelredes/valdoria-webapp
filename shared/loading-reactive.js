/* ── Audio-Reactive Loading Engine (v1.0) ── */
/* Connects Web Audio API AnalyserNode to loading screen visuals */
(function() {
  'use strict';

  /* ── Configuration ── */
  var FFT_SIZE = 256;           /* 128 frequency bins */
  var BASS_END = 10;            /* bins 0-9  ~0-350 Hz */
  var MID_END = 40;             /* bins 10-39 ~350-3kHz */
  var HIGH_END = 80;            /* bins 40-79 ~3k-12kHz */
  var BEAT_THRESHOLD = 1.4;     /* energy multiplier for beat detection */
  var BEAT_COOLDOWN = 200;      /* ms between beats */
  var BURST_COUNT = 6;          /* particles per beat burst */

  /* ── State ── */
  var _analyser = null;
  var _freqData = null;
  var _rafId = null;
  var _running = false;
  var _lastBeatTime = 0;
  var _avgBassEnergy = 0;
  var _beatFlashEl = null;
  var _raysEl = null;
  var _overlay = null;
  var _gemEl = null;
  var _rings = [];
  var _burstPool = [];

  /* ── Performance tier ── */
  var _tier = 'full'; /* full | medium | lite */

  /* ── Detect tier ── */
  function _detectTier() {
    _tier = window._valdoriaPerformanceTier || 'full';
  }

  /* ── Band energy (0-1 normalized) ── */
  function _bandEnergy(start, end) {
    if (!_freqData) return 0;
    var sum = 0;
    var count = Math.min(end, _freqData.length) - start;
    if (count <= 0) return 0;
    for (var i = start; i < Math.min(end, _freqData.length); i++) {
      sum += _freqData[i];
    }
    return (sum / count) / 255;
  }

  /* ── Beat detection via spectral flux on bass ── */
  function _detectBeat(bassEnergy) {
    var now = Date.now();
    if (now - _lastBeatTime < BEAT_COOLDOWN) return false;

    /* Running average (exponential smoothing) */
    _avgBassEnergy = _avgBassEnergy * 0.92 + bassEnergy * 0.08;

    /* Beat = sudden spike above threshold */
    if (bassEnergy > _avgBassEnergy * BEAT_THRESHOLD && bassEnergy > 0.3) {
      _lastBeatTime = now;
      return true;
    }
    return false;
  }

  /* ── Apply bass effects ── */
  function _applyBass(val) {
    /* Ring scale pulse */
    var scale = 1 + val * 0.06;
    for (var i = 0; i < _rings.length; i++) {
      _rings[i].style.transform = 'scale(' + scale + ')';
    }

    /* Aura opacity */
    var auras = _overlay ? _overlay.querySelectorAll('.mc-aura') : [];
    var auraOp = 0.5 + val * 0.4;
    for (var a = 0; a < auras.length; a++) {
      auras[a].style.opacity = auraOp;
    }

    /* Screen tremor on heavy drops (full tier only) */
    if (_tier === 'full' && val > 0.85 && _overlay) {
      _overlay.classList.add('lr-tremor');
      setTimeout(function() {
        if (_overlay) _overlay.classList.remove('lr-tremor');
      }, 150);
    }
  }

  /* ── Apply mid effects ── */
  function _applyMid(val) {
    /* Progress bar glow */
    var fill = _overlay ? _overlay.querySelector('.loading-progress-fill') : null;
    if (fill) {
      var glowIntensity = Math.round(val * 8);
      fill.style.boxShadow = '0 0 ' + glowIntensity + 'px rgba(196, 149, 58, ' + (0.3 + val * 0.4) + ')'; /* noqa: preflight — dynamic alpha per frame */
    }

    /* Title shimmer intensity (via opacity modulation) */
    var title = _overlay ? _overlay.querySelector('.loading-title') : null;
    if (title) {
      title.style.opacity = 0.85 + val * 0.15;
    }
  }

  /* ── Apply high effects ── */
  function _applyHigh(val) {
    /* Gem flash */
    if (_gemEl) {
      var gemGlow = Math.round(val * 15);
      _gemEl.style.filter = 'brightness(' + (1 + val * 0.5) + ')';
      _gemEl.style.boxShadow = '0 0 ' + gemGlow + 'px rgba(196, 149, 58, ' + (val * 0.6) + ')'; /* noqa: preflight — dynamic alpha per frame */
    }

    /* Light rays (full tier only) */
    if (_raysEl && _tier === 'full') {
      _raysEl.style.opacity = val * 0.3;
      var rayScale = 1 + val * 0.2;
      _raysEl.style.transform = 'scale(' + rayScale + ')';
    }
  }

  /* ── Beat burst ── */
  function _onBeat() {
    /* Golden flash */
    if (_beatFlashEl && _tier !== 'lite') {
      _beatFlashEl.classList.add('active');
      setTimeout(function() {
        if (_beatFlashEl) _beatFlashEl.classList.remove('active');
      }, 150);
    }

    /* Gem mega-pulse */
    if (_gemEl) {
      _gemEl.style.transform = 'scale(1.18)';
      setTimeout(function() {
        if (_gemEl) _gemEl.style.transform = '';
      }, 200);
    }

    /* Ring speed boost */
    for (var i = 0; i < _rings.length; i++) {
      var ring = _rings[i];
      var origDur = ring.getAttribute('data-lr-dur');
      if (!origDur) {
        origDur = window.getComputedStyle(ring).animationDuration;
        ring.setAttribute('data-lr-dur', origDur);
      }
      ring.style.animationDuration = '4s';
    }
    setTimeout(function() {
      for (var i = 0; i < _rings.length; i++) {
        var dur = _rings[i].getAttribute('data-lr-dur') || '';
        _rings[i].style.animationDuration = dur;
      }
    }, 300);

    /* Particle burst (full/medium only) */
    if (_tier !== 'lite') {
      _spawnBurst();
    }
  }

  /* ── Burst particle pool ── */
  function _spawnBurst() {
    if (!_overlay) return;
    var mc = _overlay.querySelector('.magic-circle');
    if (!mc) return;
    var rect = mc.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    var count = _tier === 'medium' ? Math.ceil(BURST_COUNT / 2) : BURST_COUNT;

    for (var i = 0; i < count; i++) {
      var angle = (Math.PI * 2 / count) * i + (Math.random() * 0.5);
      var dist = 40 + Math.random() * 60;
      var dx = Math.round(Math.cos(angle) * dist);
      var dy = Math.round(Math.sin(angle) * dist);

      var el = _getBurstEl();
      el.style.left = cx + 'px';
      el.style.top = cy + 'px';
      el.style.setProperty('--lr-dx', dx + 'px');
      el.style.setProperty('--lr-dy', dy + 'px');
      el.classList.remove('active');
      /* Force reflow for animation restart */
      void el.offsetWidth;
      el.classList.add('active');
    }
  }

  function _getBurstEl() {
    /* Reuse from pool or create */
    for (var i = 0; i < _burstPool.length; i++) {
      if (!_burstPool[i].classList.contains('active')) {
        return _burstPool[i];
      }
    }
    var el = document.createElement('div');
    el.className = 'lr-burst';
    document.body.appendChild(el);
    el.addEventListener('animationend', function() { el.classList.remove('active'); });
    _burstPool.push(el);
    return el;
  }

  /* ── Main animation loop ── */
  function _loop() {
    if (!_running || !_analyser) return;

    _analyser.getByteFrequencyData(_freqData);

    var bass = _bandEnergy(0, BASS_END);
    var mid = _bandEnergy(BASS_END, MID_END);
    var high = _bandEnergy(MID_END, HIGH_END);

    _applyBass(bass);
    if (_tier !== 'lite') _applyMid(mid);
    _applyHigh(high);

    if (_detectBeat(bass)) {
      _onBeat();
    }

    _rafId = requestAnimationFrame(_loop);
  }

  /* ── Find DOM elements ── */
  function _cacheElements() {
    _overlay = document.querySelector('.loading-overlay');
    if (!_overlay) return;

    _gemEl = _overlay.querySelector('.mc-gem');
    _rings = [];
    var ringEls = _overlay.querySelectorAll('.mc-ring');
    for (var i = 0; i < ringEls.length; i++) _rings.push(ringEls[i]);

    /* Create beat flash overlay if not exists */
    if (!_beatFlashEl) {
      _beatFlashEl = document.createElement('div');
      _beatFlashEl.className = 'lr-beat-flash';
      document.body.appendChild(_beatFlashEl);
    }

    /* Create rays element if not exists */
    if (!_raysEl && _tier === 'full') {
      var mc = _overlay.querySelector('.magic-circle');
      if (mc) {
        _raysEl = document.createElement('div');
        _raysEl.className = 'lr-rays';
        mc.appendChild(_raysEl);
      }
    }
  }

  /* ── Public API ── */
  window.ValdoriaLoadingReactive = {
    /**
     * Start audio-reactive effects.
     * @param {AnalyserNode} analyser — from ValdoriaAudio.getAnalyser()
     */
    start: function(analyser) {
      if (!analyser) {
        console.warn('[LOADING_REACTIVE] No analyser provided');
        return;
      }
      _detectTier();
      _analyser = analyser;
      _analyser.fftSize = FFT_SIZE;
      _analyser.smoothingTimeConstant = 0.8;
      _freqData = new Uint8Array(_analyser.frequencyBinCount);
      _avgBassEnergy = 0;
      _lastBeatTime = 0;

      _cacheElements();
      _running = true;
      _rafId = requestAnimationFrame(_loop);
      console.log('[LOADING_REACTIVE] Started (tier=' + _tier + ')');
    },

    /** Stop and clean up effects */
    stop: function() {
      _running = false;
      if (_rafId) {
        cancelAnimationFrame(_rafId);
        _rafId = null;
      }

      /* Reset visual state */
      for (var i = 0; i < _rings.length; i++) {
        _rings[i].style.transform = '';
        _rings[i].style.animationDuration = '';
      }
      if (_gemEl) {
        _gemEl.style.filter = '';
        _gemEl.style.boxShadow = '';
        _gemEl.style.transform = '';
      }
      if (_beatFlashEl && _beatFlashEl.parentNode) {
        _beatFlashEl.parentNode.removeChild(_beatFlashEl);
        _beatFlashEl = null;
      }
      if (_raysEl && _raysEl.parentNode) {
        _raysEl.parentNode.removeChild(_raysEl);
        _raysEl = null;
      }
      /* Clean burst pool */
      for (var b = 0; b < _burstPool.length; b++) {
        if (_burstPool[b].parentNode) _burstPool[b].parentNode.removeChild(_burstPool[b]);
      }
      _burstPool = [];
      _rings = [];
      _gemEl = null;
      _overlay = null;
      _analyser = null;
      _freqData = null;
      console.log('[LOADING_REACTIVE] Stopped');
    },

    /** Check if running */
    isActive: function() { return _running; }
  };
})();
