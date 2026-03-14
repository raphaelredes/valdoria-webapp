// ===================================================================
// VALDORIA AUDIO MANAGER v1.2
// Singleton for ambient music and sound effects across all WebApps.
// Handles autoplay restrictions, seamless loop crossfade, volume control,
// localStorage persistence, random variant selection, and auto-injected UI.
// ===================================================================

const ValdoriaAudio = (() => {
    'use strict';

    const STORAGE_KEY = 'valdoria_audio_muted';
    const VOLUME_KEY = 'valdoria_audio_volume';
    const CROSSFADE_MS = 1200;
    const DEFAULT_VOLUME = 0.5;
    const NO_LOOP_TRACKS = ['victory', 'defeat'];

    // Base URL for audio files (relative to webapp root)
    const AUDIO_BASE = '../shared/audio/';

    // Track catalog: biome/context -> array of variant filenames
    const TRACKS = {
        tavern:   ['tavern_ambient.mp3', 'tavern_ambient_2.mp3', 'tavern_ambient_3.mp3', 'tavern_ambient_4.mp3'],
        city:     ['city_day.mp3', 'city_day_2.mp3', 'city_day_3.mp3', 'city_day_4.mp3'],
        forest:   ['forest_explore.mp3', 'forest_explore_2.mp3', 'forest_explore_3.mp3', 'forest_explore_4.mp3'],
        combat:   ['combat_tense.mp3', 'combat_tense_2.mp3', 'combat_tense_3.mp3', 'combat_tense_4.mp3'],
        desert:   ['desert_wind.mp3', 'desert_wind_2.mp3', 'desert_wind_3.mp3', 'desert_wind_4.mp3'],
        dungeon:  ['dungeon_dark.mp3', 'dungeon_dark_2.mp3', 'dungeon_dark_3.mp3', 'dungeon_dark_4.mp3'],
        swamp:    ['swamp_mist.mp3', 'swamp_mist_2.mp3', 'swamp_mist_3.mp3', 'swamp_mist_4.mp3'],
        mountain: ['mountain_wind.mp3', 'mountain_wind_2.mp3', 'mountain_wind_3.mp3', 'mountain_wind_4.mp3'],
        snow:     ['snow_silence.mp3', 'snow_silence_2.mp3', 'snow_silence_3.mp3', 'snow_silence_4.mp3'],
        victory:  ['victory_fanfare.mp3', 'victory_fanfare_2.mp3', 'victory_fanfare_3.mp3', 'victory_fanfare_4.mp3'],
        defeat:   ['defeat_somber.mp3', 'defeat_somber_2.mp3', 'defeat_somber_3.mp3', 'defeat_somber_4.mp3'],
    };

    function _pickVariant(trackKey) {
        const variants = TRACKS[trackKey];
        if (!variants || variants.length === 0) return null;
        return variants[Math.floor(Math.random() * variants.length)];
    }

    let _audio = null;
    let _fadeAudio = null;
    let _currentTrack = '';
    let _muted = false;
    let _volume = DEFAULT_VOLUME;
    let _unlocked = false;
    let _pendingTrack = '';
    let _looping = false;
    let _uiInjected = false;

    // -- Init --
    function init() {
        _muted = localStorage.getItem(STORAGE_KEY) === '1';
        const savedVol = parseFloat(localStorage.getItem(VOLUME_KEY));
        if (!isNaN(savedVol) && savedVol >= 0 && savedVol <= 1) {
            _volume = savedVol;
        }

        const unlockEvents = ['click', 'touchstart', 'keydown'];
        const unlockHandler = () => {
            _unlocked = true;
            unlockEvents.forEach(e => document.removeEventListener(e, unlockHandler, { capture: true }));
            if (_pendingTrack && !_muted) {
                _playTrack(_pendingTrack);
            }
        };
        unlockEvents.forEach(e => document.addEventListener(e, unlockHandler, { capture: true, once: false }));

        _injectUI();
    }

    // -- Play a track by key --
    function play(trackKey) {
        if (!trackKey || !TRACKS[trackKey] || TRACKS[trackKey].length === 0) {
            console.warn('[AUDIO] Unknown track:', trackKey);
            return;
        }
        if (trackKey === _currentTrack && _audio && !_audio.paused) {
            return;
        }

        _pendingTrack = trackKey;
        if (!_unlocked || _muted) return;

        _playTrack(trackKey);
    }

    function _playTrack(trackKey) {
        const file = _pickVariant(trackKey);
        if (!file) return;
        const url = AUDIO_BASE + file;

        if (_audio && !_audio.paused) {
            _crossfadeOut(_audio);
        }
        _looping = false;

        const audio = new Audio(url);
        audio.volume = 0;
        audio.preload = 'auto';
        _audio = audio;
        _currentTrack = trackKey;

        if (!NO_LOOP_TRACKS.includes(trackKey)) {
            audio.addEventListener('timeupdate', _onTimeUpdate);
        }

        audio.play().then(() => {
            _crossfadeIn(audio);
        }).catch(e => {
            console.warn('[AUDIO] Play blocked:', e.message);
            _pendingTrack = trackKey;
            _unlocked = false;
        });
    }

    function _onTimeUpdate() {
        const audio = _audio;
        if (!audio || _looping) return;
        const remaining = audio.duration - audio.currentTime;
        if (!isFinite(remaining)) return;

        const fadeSeconds = CROSSFADE_MS / 1000;
        if (remaining <= fadeSeconds + 0.1) {
            _looping = true;
            _loopCrossfade(audio);
        }
    }

    function _loopCrossfade(oldAudio) {
        const trackKey = _currentTrack;
        const file = _pickVariant(trackKey);
        if (!file) return;
        const url = AUDIO_BASE + file;

        const newAudio = new Audio(url);
        newAudio.volume = 0;
        newAudio.preload = 'auto';

        if (!NO_LOOP_TRACKS.includes(trackKey)) {
            newAudio.addEventListener('timeupdate', _onTimeUpdate);
        }

        newAudio.play().then(() => {
            _crossfadeOut(oldAudio);
            _crossfadeIn(newAudio);
            _audio = newAudio;
            _looping = false;
        }).catch(() => {
            oldAudio.currentTime = 0;
            oldAudio.play().catch(() => {});
            _looping = false;
        });
    }

    function _crossfadeIn(audio) {
        if (!audio) return;
        const target = _volume;
        const steps = 20;
        const stepMs = CROSSFADE_MS / steps;
        const increment = target / steps;
        let current = 0;

        const timer = setInterval(() => {
            current += increment;
            if (current >= target || audio !== _audio) {
                try { audio.volume = (audio === _audio) ? target : 0; } catch(e) {}
                clearInterval(timer);
            } else {
                try { audio.volume = current; } catch(e) { clearInterval(timer); }
            }
        }, stepMs);
    }

    function _crossfadeOut(audio) {
        if (!audio) return;
        _fadeAudio = audio;
        const startVol = audio.volume;
        const steps = 15;
        const stepMs = CROSSFADE_MS / steps;
        const decrement = startVol / steps;
        let current = startVol;

        const timer = setInterval(() => {
            current -= decrement;
            if (current <= 0) {
                try {
                    audio.volume = 0;
                    audio.pause();
                    audio.removeEventListener('timeupdate', _onTimeUpdate);
                    audio.src = '';
                } catch(e) {}
                clearInterval(timer);
                if (_fadeAudio === audio) _fadeAudio = null;
            } else {
                try { audio.volume = current; } catch(e) { clearInterval(timer); }
            }
        }, stepMs);
    }

    function stop() {
        if (_audio) {
            _crossfadeOut(_audio);
            _audio = null;
        }
        _currentTrack = '';
        _pendingTrack = '';
        _looping = false;
    }

    function playSFX(trackKey) {
        if (_muted || !_unlocked) return;
        const file = _pickVariant(trackKey);
        if (!file) return;
        const url = AUDIO_BASE + file;

        const sfx = new Audio(url);
        sfx.volume = Math.min(1, _volume * 1.5);
        sfx.play().catch(() => {});
    }

    // -- Mute toggle --
    function toggleMute() {
        _muted = !_muted;
        localStorage.setItem(STORAGE_KEY, _muted ? '1' : '0');

        if (_muted) {
            if (_audio) _audio.volume = 0;
        } else {
            if (_audio && !_audio.paused) {
                _audio.volume = _volume;
            } else if (_pendingTrack) {
                _playTrack(_pendingTrack);
            }
        }
        _syncUI();
        return _muted;
    }

    function isMuted() { return _muted; }

    // -- Volume control --
    function setVolume(val) {
        _volume = Math.max(0, Math.min(1, val));
        localStorage.setItem(VOLUME_KEY, _volume.toString());
        if (_audio && !_muted) {
            _audio.volume = _volume;
        }
        // If volume > 0 and was muted, unmute
        if (_volume > 0 && _muted) {
            _muted = false;
            localStorage.setItem(STORAGE_KEY, '0');
            if (_audio && !_audio.paused) {
                _audio.volume = _volume;
            } else if (_pendingTrack) {
                _playTrack(_pendingTrack);
            }
        }
        // If volume == 0, mute
        if (_volume === 0 && !_muted) {
            _muted = true;
            localStorage.setItem(STORAGE_KEY, '1');
        }
        _syncUI();
    }

    function getVolume() { return _volume; }

    // -- Biome mapping helper --
    function playBiome(biome) {
        const biomeMap = {
            'plains': 'city',
            'forest': 'forest',
            'swamp': 'swamp',
            'mountain': 'mountain',
            'cave': 'dungeon',
            'desert': 'desert',
            'snow': 'snow',
            'volcanic': 'dungeon',
            'city_gates': 'city',
        };
        const track = biomeMap[biome] || 'forest';
        play(track);
    }

    // =============================================
    // AUTO-INJECTED VOLUME CONTROL UI
    // =============================================

    function _injectUI() {
        if (_uiInjected) return;
        _uiInjected = true;

        // Inject CSS
        const style = document.createElement('style');
        style.textContent = `
            .va-ctrl {
                position: fixed;
                top: 8px;
                right: 8px;
                z-index: 200;
                display: flex;
                align-items: center;
                gap: 0;
            }
            .va-btn {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                border: 1px solid rgba(112, 66, 20, 0.4);
                background: rgba(42, 36, 32, 0.85);
                color: var(--v-text, #d4c8b0);
                font-size: 16px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                backdrop-filter: blur(4px);
                -webkit-backdrop-filter: blur(4px);
                transition: opacity 0.2s, transform 0.15s;
                padding: 0;
                line-height: 1;
                flex-shrink: 0;
            }
            .va-btn:active {
                transform: scale(0.9);
                opacity: 0.8;
            }
            .va-slider-wrap {
                overflow: hidden;
                max-width: 0;
                opacity: 0;
                transition: max-width 0.3s ease, opacity 0.25s ease;
                display: flex;
                align-items: center;
            }
            .va-slider-wrap.open {
                max-width: 120px;
                opacity: 1;
            }
            .va-slider {
                -webkit-appearance: none;
                appearance: none;
                width: 100px;
                height: 28px;
                background: rgba(42, 36, 32, 0.85);
                border: 1px solid rgba(112, 66, 20, 0.4);
                border-right: none;
                border-radius: 14px 0 0 14px;
                outline: none;
                margin: 0;
                padding: 0 8px;
                backdrop-filter: blur(4px);
                -webkit-backdrop-filter: blur(4px);
                cursor: pointer;
            }
            .va-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 18px;
                height: 18px;
                border-radius: 50%;
                background: var(--v-text, #d4c8b0);
                border: 2px solid rgba(112, 66, 20, 0.6);
                cursor: pointer;
            }
            .va-slider::-moz-range-thumb {
                width: 18px;
                height: 18px;
                border-radius: 50%;
                background: var(--v-text, #d4c8b0);
                border: 2px solid rgba(112, 66, 20, 0.6);
                cursor: pointer;
            }
            .va-slider::-webkit-slider-runnable-track {
                height: 4px;
                background: rgba(112, 66, 20, 0.4);
                border-radius: 2px;
            }
            .va-slider::-moz-range-track {
                height: 4px;
                background: rgba(112, 66, 20, 0.4);
                border-radius: 2px;
            }
            /* Hide during loading/overlays */
            .loading:not(.hidden) ~ .va-ctrl,
            .dm-overlay.active ~ .va-ctrl,
            .outcome-overlay.active ~ .va-ctrl {
                opacity: 0;
                pointer-events: none;
            }
        `;
        document.head.appendChild(style);

        // Build UI
        const wrap = document.createElement('div');
        wrap.className = 'va-ctrl';
        wrap.id = 'va-ctrl';

        const sliderWrap = document.createElement('div');
        sliderWrap.className = 'va-slider-wrap';
        sliderWrap.id = 'va-slider-wrap';

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.className = 'va-slider';
        slider.id = 'va-slider';
        slider.min = '0';
        slider.max = '100';
        slider.value = String(Math.round(_muted ? 0 : _volume * 100));
        slider.setAttribute('aria-label', 'Volume');

        sliderWrap.appendChild(slider);

        const btn = document.createElement('button');
        btn.className = 'va-btn';
        btn.id = 'va-btn';
        btn.setAttribute('aria-label', 'Ajustar volume');
        _updateBtnIcon(btn);

        wrap.appendChild(sliderWrap);
        wrap.appendChild(btn);
        document.body.appendChild(wrap);

        // Remove old mute button if present
        const oldBtn = document.querySelector('.audio-mute-btn');
        if (oldBtn) oldBtn.remove();

        // Events
        let _sliderOpen = false;
        let _closeTimer = null;

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            _sliderOpen = !_sliderOpen;
            sliderWrap.classList.toggle('open', _sliderOpen);
            if (_closeTimer) clearTimeout(_closeTimer);
            if (_sliderOpen) {
                _closeTimer = setTimeout(() => {
                    _sliderOpen = false;
                    sliderWrap.classList.remove('open');
                }, 4000);
            }
        });

        // Long press to mute/unmute
        let _longPress = null;
        btn.addEventListener('pointerdown', () => {
            _longPress = setTimeout(() => {
                toggleMute();
                slider.value = String(Math.round(_muted ? 0 : _volume * 100));
                _longPress = null;
            }, 500);
        });
        btn.addEventListener('pointerup', () => {
            if (_longPress) clearTimeout(_longPress);
            _longPress = null;
        });
        btn.addEventListener('pointerleave', () => {
            if (_longPress) clearTimeout(_longPress);
            _longPress = null;
        });

        slider.addEventListener('input', (e) => {
            e.stopPropagation();
            const val = parseInt(e.target.value, 10) / 100;
            setVolume(val);
            if (_closeTimer) clearTimeout(_closeTimer);
            _closeTimer = setTimeout(() => {
                _sliderOpen = false;
                sliderWrap.classList.remove('open');
            }, 4000);
        });

        // Prevent slider touches from propagating to game
        slider.addEventListener('touchstart', (e) => e.stopPropagation());
        slider.addEventListener('touchmove', (e) => e.stopPropagation());
        slider.addEventListener('pointerdown', (e) => e.stopPropagation());

        // Close slider on outside click
        document.addEventListener('click', (e) => {
            if (_sliderOpen && !wrap.contains(e.target)) {
                _sliderOpen = false;
                sliderWrap.classList.remove('open');
                if (_closeTimer) clearTimeout(_closeTimer);
            }
        });
    }

    function _updateBtnIcon(btn) {
        if (!btn) return;
        if (_muted || _volume === 0) {
            btn.textContent = '🔇';
            btn.title = 'Som desativado';
        } else if (_volume < 0.5) {
            btn.textContent = '🔉';
            btn.title = 'Volume: ' + Math.round(_volume * 100) + '%';
        } else {
            btn.textContent = '🔊';
            btn.title = 'Volume: ' + Math.round(_volume * 100) + '%';
        }
    }

    function _syncUI() {
        const btn = document.getElementById('va-btn');
        const slider = document.getElementById('va-slider');
        _updateBtnIcon(btn);
        if (slider) {
            slider.value = String(Math.round(_muted ? 0 : _volume * 100));
        }
    }

    // Legacy compat — still exported but now auto-injected
    function createMuteButton() {
        // No-op: UI is auto-injected by init()
        // Return empty element to avoid errors in callers
        const span = document.createElement('span');
        span.style.display = 'none';
        return span;
    }

    // -- Public API --
    return {
        init,
        play,
        playBiome,
        playSFX,
        stop,
        toggleMute,
        isMuted,
        setVolume,
        getVolume,
        createMuteButton,
        TRACKS,
    };
})();

// Auto-init on load
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ValdoriaAudio.init);
    } else {
        ValdoriaAudio.init();
    }
}
