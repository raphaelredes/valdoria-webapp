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
    const DEFAULT_VOLUME = 0.3;
    const NO_LOOP_TRACKS = ['victory', 'defeat', 'levelup'];

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
        levelup:  ['levelup_theme.mp3', 'levelup_theme_2.mp3', 'levelup_theme_3.mp3', 'levelup_theme_4.mp3'],
        prologue: ['prologue_theme.mp3', 'prologue_theme_2.mp3', 'prologue_theme_3.mp3', 'prologue_theme_4.mp3'],
        boss:     ['boss_battle.mp3', 'boss_battle_2.mp3', 'boss_battle_3.mp3', 'boss_battle_4.mp3'],
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
            _syncUI();
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
        _syncUI();
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
    // AUTO-INJECTED VOLUME CONTROL UI v2.0
    // Medieval theme, bottom-right position, SVG icons,
    // first-time hint, auto-detect bottom bar offset
    // =============================================

    const HINT_KEY = 'valdoria_audio_hint_seen';

    // SVG speaker icons (inline, 18x18, parchment color via currentColor)
    const _SVG_MUTED = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';
    const _SVG_LOW = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';
    const _SVG_HIGH = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>';

    function _updateBottomOffset() {
        var bar = document.getElementById('bottom-panel') || document.getElementById('bottom-bar');
        if (bar && bar.offsetHeight > 0) {
            document.documentElement.style.setProperty('--va-bottom-offset', (bar.offsetHeight + 8) + 'px');
        }
    }

    function _injectUI() {
        if (_uiInjected) return;
        _uiInjected = true;

        // Inject CSS
        const style = document.createElement('style');
        style.textContent = `
            .va-ctrl {
                position: fixed;
                bottom: var(--va-bottom-offset, 8px);
                right: 8px;
                z-index: 200;
                display: flex;
                align-items: center;
                gap: 0;
                transition: bottom 0.3s ease;
            }
            .va-btn {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                border: 1px solid var(--v-border, #4a3828);
                background: var(--v-bg-raised, #332a22);
                color: var(--v-text-dim, #8a7a68);
                font-size: 15px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                transition: opacity 0.2s, transform 0.15s, box-shadow 0.3s, color 0.3s;
                padding: 0;
                line-height: 1;
                flex-shrink: 0;
            }
            .va-btn:active {
                transform: scale(0.9);
                opacity: 0.8;
            }
            .va-btn.va-playing {
                color: var(--v-gold, #c4953a);
                border-color: rgba(196,149,58,0.4);
                box-shadow: 0 0 8px rgba(196,149,58,0.2);
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
                background: var(--v-bg-raised, #332a22);
                border: 1px solid var(--v-border, #4a3828);
                border-right: none;
                border-radius: 14px 0 0 14px;
                outline: none;
                margin: 0;
                padding: 0 8px;
                cursor: pointer;
            }
            .va-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 18px;
                height: 18px;
                border-radius: 50%;
                background: var(--v-gold, #c4953a);
                border: 2px solid var(--v-border, #4a3828);
                cursor: pointer;
            }
            .va-slider::-moz-range-thumb {
                width: 18px;
                height: 18px;
                border-radius: 50%;
                background: var(--v-gold, #c4953a);
                border: 2px solid var(--v-border, #4a3828);
                cursor: pointer;
            }
            .va-slider::-webkit-slider-runnable-track {
                height: 4px;
                border-radius: 2px;
                background: inherit;
            }
            .va-slider::-moz-range-track {
                height: 4px;
                border-radius: 2px;
                background: rgba(112, 66, 20, 0.4);
            }
            /* Hide during loading/overlays */
            .loading:not(.hidden) ~ .va-ctrl,
            .dm-overlay.active ~ .va-ctrl,
            .outcome-overlay.active ~ .va-ctrl {
                opacity: 0;
                pointer-events: none;
            }
            /* First-time hint */
            .va-hint {
                position: absolute;
                bottom: 100%;
                right: 0;
                margin-bottom: 8px;
                background: var(--v-bg-raised, #332a22);
                border: 1px solid rgba(196,149,58,0.4);
                border-radius: 8px;
                padding: 6px 12px;
                font-family: var(--v-font, 'MedievalSharp', 'Cinzel', serif);
                font-size: 12px;
                color: var(--v-gold, #c4953a);
                white-space: nowrap;
                pointer-events: none;
                opacity: 0;
                animation: vaHintIn 0.4s 0.8s ease forwards, vaHintOut 0.5s 5s ease forwards;
                box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            }
            .va-hint::after {
                content: '';
                position: absolute;
                top: 100%;
                right: 12px;
                border: 5px solid transparent;
                border-top-color: rgba(196,149,58,0.4);
            }
            .va-btn.va-hint-pulse {
                animation: vaGlowPulse 1.5s ease infinite !important;
            }
            @keyframes vaGlowPulse {
                0%,100% { box-shadow: 0 2px 6px rgba(0,0,0,0.3); }
                50% { box-shadow: 0 0 0 6px rgba(196,149,58,0.25), 0 0 12px rgba(196,149,58,0.15); }
            }
            @keyframes vaHintIn { to { opacity: 1; } }
            @keyframes vaHintOut { to { opacity: 0; visibility: hidden; } }
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

        // Set initial slider fill gradient
        function _updateSliderFill() {
            const pct = slider.value;
            slider.style.background = 'linear-gradient(to right, rgba(196,149,58,0.6) 0%, rgba(196,149,58,0.6) ' + pct + '%, rgba(112,66,20,0.3) ' + pct + '%, rgba(112,66,20,0.3) 100%)';
        }
        _updateSliderFill();

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

        // Auto-detect bottom bar offset
        setTimeout(_updateBottomOffset, 300);
        setTimeout(_updateBottomOffset, 1000);
        window.addEventListener('resize', _updateBottomOffset);
        // Watch for panel changes (immersive toggle, footer render)
        const _mo = new MutationObserver(() => { setTimeout(_updateBottomOffset, 50); });
        const _bp = document.getElementById('bottom-panel') || document.getElementById('bottom-bar');
        if (_bp) _mo.observe(_bp, { attributes: true, childList: true, attributeFilter: ['class', 'style'] });

        // Events
        let _sliderOpen = false;
        let _closeTimer = null;

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            _dismissHint(btn);
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
                _dismissHint(btn);
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
            _updateSliderFill();
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

        // Show first-time hint after a short delay
        _showFirstTimeHint(btn, wrap);
    }

    // -- First-time audio hint --
    let _hintDismissed = false;
    function _showFirstTimeHint(btn, wrap) {
        try {
            if (localStorage.getItem(HINT_KEY)) return;
        } catch(e) { return; }

        // Wait for loading to finish before showing hint
        const _tryShow = () => {
            const loading = document.querySelector('.loading:not(.hidden), .loading-overlay:not(.hidden), #loading:not([style*="display: none"]), #v-err-overlay:not([style*="display: none"])');
            if (loading) { setTimeout(_tryShow, 1000); return; }

            if (_hintDismissed) return;
            const hint = document.createElement('div');
            hint.className = 'va-hint';
            hint.textContent = '\u266B Toque para ajustar o som';
            wrap.appendChild(hint);
            btn.classList.add('va-hint-pulse');

            // Auto-dismiss after 5.5s (matches animation)
            setTimeout(() => { _dismissHint(btn); }, 5500);
        };
        setTimeout(_tryShow, 1500);
    }

    function _dismissHint(btn) {
        if (_hintDismissed) return;
        _hintDismissed = true;
        try { localStorage.setItem(HINT_KEY, '1'); } catch(e) {}
        if (btn) btn.classList.remove('va-hint-pulse');
        const hint = document.querySelector('.va-hint');
        if (hint) hint.remove();
    }

    // -- SVG icon update --
    function _updateBtnIcon(btn) {
        if (!btn) return;
        if (_muted || _volume === 0) {
            btn.innerHTML = _SVG_MUTED;
            btn.title = 'Som desativado';
            btn.classList.remove('va-playing');
        } else if (_volume < 0.5) {
            btn.innerHTML = _SVG_LOW;
            btn.title = 'Volume: ' + Math.round(_volume * 100) + '%';
            btn.classList.toggle('va-playing', !!(_audio && !_audio.paused));
        } else {
            btn.innerHTML = _SVG_HIGH;
            btn.title = 'Volume: ' + Math.round(_volume * 100) + '%';
            btn.classList.toggle('va-playing', !!(_audio && !_audio.paused));
        }
    }

    function _syncUI() {
        const btn = document.getElementById('va-btn');
        const slider = document.getElementById('va-slider');
        _updateBtnIcon(btn);
        if (slider) {
            slider.value = String(Math.round(_muted ? 0 : _volume * 100));
            // Update fill gradient
            const pct = slider.value;
            slider.style.background = 'linear-gradient(to right, rgba(196,149,58,0.6) 0%, rgba(196,149,58,0.6) ' + pct + '%, rgba(112,66,20,0.3) ' + pct + '%, rgba(112,66,20,0.3) 100%)';
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
