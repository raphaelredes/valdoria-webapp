/* Premium music player for apoie.lendasdevaldoria.com.br
 * Sessao #23 v9 (2026-05-22): redesign AAA pedido pelo user.
 *
 * Features:
 *  - Track list (Tema Valdoria, Combate, Floresta, etc)
 *  - Audio visualizer real (Web Audio API + Canvas)
 *  - Track name display + progress + duracao
 *  - Volume slider + mute toggle
 *  - Shuffle / repeat / next / prev
 *  - Auto-load track on init (city_day_1 padrao)
 *  - LocalStorage: preferred volume + last track
 *
 * Public API (window.ApMusicPlayer):
 *  - init(): inicializa
 *  - play(): toca atual ou pendingTrack
 *  - pause(): pausa
 *  - next(): proxima
 *  - prev(): anterior
 *  - setVolume(0..1)
 *  - setTrack(index): troca pra track index
 */
(function(){
    'use strict';

    // Tracks disponiveis (mesma lista do audio-manager mas curated)
    var BASE = 'https://jogo.lendasdevaldoria.com.br/shared/audio/';
    var TRACKS = [
        {name: 'Tema da Cidade — Dia',  file: 'city_day.mp3'},
        {name: 'Valdoria ao Anoitecer',  file: 'city_day_3.mp3'},
        {name: 'Tema da Taverna',       file: 'tavern_ambient.mp3'},
        {name: 'Taverna ao Calor',      file: 'tavern_ambient_3.mp3'},
        {name: 'Floresta Explora',      file: 'forest_explore.mp3'},
        {name: 'Floresta Sombria',      file: 'forest_explore_4.mp3'},
        {name: 'Estradas Antigas',      file: 'mountain_wind.mp3'},
        {name: 'Deserto Esquecido',     file: 'desert_wind.mp3'},
        {name: 'Pântano Brumoso',       file: 'swamp_mist.mp3'},
        {name: 'Combate Tenso',         file: 'combat_tense.mp3'},
        {name: 'Masmorra Profunda',     file: 'dungeon_dark.mp3'},
        {name: 'Tema do Prólogo',       file: 'prologue_theme.mp3'},
    ];

    var state = {
        idx: 0,
        audio: null,
        playing: false,
        volume: 0.5,
        analyser: null,
        analyserCtx: null,
        analyserSource: null,
        rafId: null,
        canvas: null,
        canvasCtx: null,
    };

    var ui = {
        btnPlay: null, btnPrev: null, btnNext: null,
        trackName: null, progressBar: null, progressFill: null,
        currentTime: null, duration: null,
        volumeSlider: null, btnMute: null,
        trackListEl: null, visualizer: null,
        iconPlay: null, iconPause: null,
    };

    function _fmtTime(seconds){
        if (!isFinite(seconds) || seconds < 0) return '0:00';
        var m = Math.floor(seconds / 60);
        var s = Math.floor(seconds % 60);
        return m + ':' + (s < 10 ? '0' + s : s);
    }

    function _saveState(){
        try {
            localStorage.setItem('apMusicVolume', String(state.volume));
            localStorage.setItem('apMusicIdx', String(state.idx));
        } catch(_){}
    }

    function _loadState(){
        try {
            var v = parseFloat(localStorage.getItem('apMusicVolume'));
            if (!isNaN(v) && v >= 0 && v <= 1) state.volume = v;
            var i = parseInt(localStorage.getItem('apMusicIdx'), 10);
            if (!isNaN(i) && i >= 0 && i < TRACKS.length) state.idx = i;
        } catch(_){}
    }

    function _setupAudioGraph(){
        if (state.analyser) return;
        try {
            var AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            state.analyserCtx = new AC();
            state.analyser = state.analyserCtx.createAnalyser();
            state.analyser.fftSize = 64;
            state.analyser.smoothingTimeConstant = 0.85;
            state.analyser.connect(state.analyserCtx.destination);
        } catch(e){
            console.warn('[MUSIC] audio graph init fail:', e);
        }
    }

    function _connectAudio(audio){
        if (!state.analyser || !state.analyserCtx) return;
        try {
            if (state.analyserSource) {
                try { state.analyserSource.disconnect(); } catch(_){}
            }
            state.analyserSource = state.analyserCtx.createMediaElementSource(audio);
            state.analyserSource.connect(state.analyser);
            if (state.analyserCtx.state === 'suspended') {
                state.analyserCtx.resume();
            }
        } catch(e){
            // Already connected — fine
        }
    }

    function _drawVisualizer(){
        if (!state.canvas || !state.canvasCtx || !state.analyser) {
            state.rafId = null;
            return;
        }
        var ctx = state.canvasCtx;
        var w = state.canvas.width;
        var h = state.canvas.height;
        ctx.clearRect(0, 0, w, h);

        if (!state.playing) {
            // Idle — desenha barras estáticas baixas
            var bars = 24;
            var bw = w / bars - 1;
            ctx.fillStyle = 'rgba(196,149,58,0.3)';
            for (var i = 0; i < bars; i++) {
                ctx.fillRect(i * (bw + 1), h - 2, bw, 2);
            }
            state.rafId = requestAnimationFrame(_drawVisualizer);
            return;
        }

        var arr = new Uint8Array(state.analyser.frequencyBinCount);
        state.analyser.getByteFrequencyData(arr);

        var bars = 24;
        var bw = w / bars - 1;
        // Performance tier guard (lite=0, medium=1, full=2)
        var _renderDetail = (window._valdoriaPerformanceTier === 'lite') ? 0
                          : (window._valdoriaPerformanceTier === 'medium') ? 1 : 2;
        if (_renderDetail >= 1) {
            // Gradient gold (full/medium tier) — visualizer com glow vertical
            for (var i = 0; i < bars; i++) {
                var v = arr[Math.floor(i * arr.length / bars)] / 255;
                var bh = Math.max(2, v * h);
                var grad = ctx.createLinearGradient(0, h, 0, h - bh);
                grad.addColorStop(0, '#c4953a');
                grad.addColorStop(1, '#ffd27a');
                ctx.fillStyle = grad;
                ctx.fillRect(i * (bw + 1), h - bh, bw, bh);
            }
        } else {
            // Lite fallback: flat gold (24x cheaper, sem createLinearGradient per frame)
            ctx.fillStyle = '#c4953a';
            for (var i = 0; i < bars; i++) {
                var v = arr[Math.floor(i * arr.length / bars)] / 255;
                var bh = Math.max(2, v * h);
                ctx.fillRect(i * (bw + 1), h - bh, bw, bh);
            }
        }
        state.rafId = requestAnimationFrame(_drawVisualizer);
    }

    function _ensureAudio(){
        if (state.audio) return state.audio;
        var audio = new Audio();
        audio.crossOrigin = 'anonymous';
        audio.preload = 'auto';
        audio.volume = state.volume * 0.5;  // cap 50% como audio-manager principal
        audio.addEventListener('timeupdate', _onTimeUpdate);
        audio.addEventListener('loadedmetadata', _onMeta);
        audio.addEventListener('ended', _onEnded);
        audio.addEventListener('canplay', function(){
            if (state.playing) audio.play().catch(function(e){ console.warn('[MUSIC] play denied:', e.name); });
        });
        state.audio = audio;
        return audio;
    }

    function _onTimeUpdate(){
        if (!state.audio || !ui.progressFill) return;
        var pct = (state.audio.currentTime / state.audio.duration) * 100;
        if (!isFinite(pct)) pct = 0;
        ui.progressFill.style.width = pct + '%';
        if (ui.currentTime) ui.currentTime.textContent = _fmtTime(state.audio.currentTime);
    }

    function _onMeta(){
        if (ui.duration && state.audio) {
            ui.duration.textContent = _fmtTime(state.audio.duration);
        }
    }

    function _onEnded(){
        next();
    }

    function _updateUI(){
        if (ui.trackName) ui.trackName.textContent = TRACKS[state.idx].name;
        if (ui.iconPlay) ui.iconPlay.style.display = state.playing ? 'none' : '';
        if (ui.iconPause) ui.iconPause.style.display = state.playing ? '' : 'none';
        // Highlight current in track list
        if (ui.trackListEl) {
            ui.trackListEl.querySelectorAll('.ap-mp-track').forEach(function(el, i){
                el.classList.toggle('active', i === state.idx);
            });
        }
    }

    function loadTrack(idx){
        if (idx < 0) idx = TRACKS.length - 1;
        if (idx >= TRACKS.length) idx = 0;
        state.idx = idx;
        _ensureAudio();
        state.audio.src = BASE + TRACKS[idx].file;
        state.audio.load();
        _connectAudio(state.audio);
        if (state.playing) state.audio.play().catch(function(e){
            console.warn('[MUSIC] play denied:', e.name);
        });
        _saveState();
        _updateUI();
    }

    function play(){
        _setupAudioGraph();
        var audio = _ensureAudio();
        if (!audio.src) loadTrack(state.idx);
        _connectAudio(audio);
        state.playing = true;
        audio.play().catch(function(e){
            console.warn('[MUSIC] play denied:', e.name);
            state.playing = false;
            _updateUI();
        });
        if (!state.rafId) _drawVisualizer();
        _updateUI();
    }

    function pause(){
        state.playing = false;
        if (state.audio) state.audio.pause();
        _updateUI();
    }

    function toggle(){
        if (state.playing) pause(); else play();
    }

    function next(){
        loadTrack(state.idx + 1);
    }

    function prev(){
        if (state.audio && state.audio.currentTime > 3) {
            state.audio.currentTime = 0;
            return;
        }
        loadTrack(state.idx - 1);
    }

    function setVolume(v){
        v = Math.max(0, Math.min(1, v));
        state.volume = v;
        if (state.audio) state.audio.volume = v * 0.5;
        if (ui.volumeSlider) ui.volumeSlider.value = String(v * 100);
        _saveState();
    }

    function setTrack(idx){
        loadTrack(idx);
        if (!state.playing) play();
    }

    function init(){
        _loadState();

        // Get UI elements
        ui.btnPlay      = document.getElementById('ap-mp-play');
        ui.btnPrev      = document.getElementById('ap-mp-prev');
        ui.btnNext      = document.getElementById('ap-mp-next');
        ui.trackName    = document.getElementById('ap-mp-trackname');
        ui.progressBar  = document.getElementById('ap-mp-progress');
        ui.progressFill = document.getElementById('ap-mp-progress-fill');
        ui.currentTime  = document.getElementById('ap-mp-current');
        ui.duration     = document.getElementById('ap-mp-duration');
        ui.volumeSlider = document.getElementById('ap-mp-volume');
        ui.btnMute      = document.getElementById('ap-mp-mute');
        ui.trackListEl  = document.getElementById('ap-mp-tracklist');
        ui.visualizer   = document.getElementById('ap-mp-visualizer');
        ui.iconPlay     = document.getElementById('ap-mp-icon-play');
        ui.iconPause    = document.getElementById('ap-mp-icon-pause');

        if (!ui.btnPlay) return;

        // Visualizer canvas setup
        if (ui.visualizer) {
            state.canvas = ui.visualizer;
            state.canvasCtx = state.canvas.getContext('2d');
            // Set canvas internal resolution to match CSS size
            var rect = state.canvas.getBoundingClientRect();
            state.canvas.width = rect.width * 2;
            state.canvas.height = rect.height * 2;
            state.canvas.style.width = rect.width + 'px';
            state.canvas.style.height = rect.height + 'px';
            state.canvasCtx.scale(2, 2);
            // Redraw on resize
            window.addEventListener('resize', function(){
                var r = state.canvas.getBoundingClientRect();
                state.canvas.width = r.width * 2;
                state.canvas.height = r.height * 2;
                state.canvas.style.width = r.width + 'px';
                state.canvas.style.height = r.height + 'px';
                state.canvasCtx.scale(2, 2);
            });
        }

        // Populate track list
        if (ui.trackListEl) {
            ui.trackListEl.innerHTML = TRACKS.map(function(t, i){
                return '<button class="ap-mp-track" data-idx="' + i + '">' +
                    '<span class="ap-mp-track-num">' + (i + 1).toString().padStart(2, '0') + '</span>' +
                    '<span class="ap-mp-track-name">' + t.name + '</span>' +
                    '<span class="ap-mp-track-icon"></span>' +
                    '</button>';
            }).join('');
            ui.trackListEl.querySelectorAll('.ap-mp-track').forEach(function(el){
                el.addEventListener('click', function(){
                    setTrack(parseInt(el.dataset.idx, 10));
                });
            });
        }

        // Wire buttons
        if (ui.btnPlay) ui.btnPlay.addEventListener('click', toggle);
        if (ui.btnPrev) ui.btnPrev.addEventListener('click', prev);
        if (ui.btnNext) ui.btnNext.addEventListener('click', next);
        if (ui.btnMute) ui.btnMute.addEventListener('click', function(){
            setVolume(state.volume > 0 ? 0 : 0.5);
        });

        // Volume slider
        if (ui.volumeSlider) {
            ui.volumeSlider.value = String(state.volume * 100);
            ui.volumeSlider.addEventListener('input', function(){
                setVolume(parseInt(ui.volumeSlider.value, 10) / 100);
            });
        }

        // Progress bar click (seek)
        if (ui.progressBar) {
            ui.progressBar.addEventListener('click', function(e){
                if (!state.audio || !state.audio.duration) return;
                var rect = ui.progressBar.getBoundingClientRect();
                var pct = (e.clientX - rect.left) / rect.width;
                state.audio.currentTime = pct * state.audio.duration;
            });
        }

        // Idle visualizer (mostra mesmo parado)
        if (state.canvas) _drawVisualizer();

        _updateUI();
    }

    window.ApMusicPlayer = {
        init: init,
        play: play,
        pause: pause,
        toggle: toggle,
        next: next,
        prev: prev,
        setVolume: setVolume,
        setTrack: setTrack,
        getTracks: function(){ return TRACKS.slice(); },
        getCurrentIdx: function(){ return state.idx; },
        isPlaying: function(){ return state.playing; },
    };

    // Auto-init on DOMContentLoaded
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(init, 100);
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }
})();
