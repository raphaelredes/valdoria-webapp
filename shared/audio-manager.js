// ===================================================================
// VALDORIA AUDIO MANAGER v1.0
// Singleton for ambient music and sound effects across all WebApps.
// Handles autoplay restrictions, crossfade, mute toggle, localStorage persistence.
// ===================================================================

const ValdoriaAudio = (() => {
    'use strict';

    const STORAGE_KEY = 'valdoria_audio_muted';
    const VOLUME_KEY = 'valdoria_audio_volume';
    const CROSSFADE_MS = 1200;
    const DEFAULT_VOLUME = 0.25;

    // Base URL for audio files (relative to webapp root)
    const AUDIO_BASE = '../shared/audio/';

    // Track catalog: biome/context -> filename
    const TRACKS = {
        tavern:   'tavern_ambient.mp3',
        city:     'city_day.mp3',
        forest:   'forest_explore.mp3',
        combat:   'combat_tense.mp3',
        desert:   'desert_wind.mp3',
        dungeon:  'dungeon_dark.mp3',
        swamp:    'swamp_mist.mp3',
        mountain: 'mountain_wind.mp3',
        snow:     'snow_silence.mp3',
        victory:  'victory_fanfare.mp3',
        defeat:   'defeat_somber.mp3',
    };

    let _audio = null;          // Current HTMLAudioElement
    let _fadeAudio = null;      // Previous audio being faded out
    let _currentTrack = '';     // Current track key
    let _muted = false;
    let _volume = DEFAULT_VOLUME;
    let _unlocked = false;      // Whether audio context has been unlocked by user gesture
    let _pendingTrack = '';     // Track queued before unlock
    let _fadeTimer = null;

    // -- Init --
    function init() {
        _muted = localStorage.getItem(STORAGE_KEY) === '1';
        const savedVol = parseFloat(localStorage.getItem(VOLUME_KEY));
        if (!isNaN(savedVol) && savedVol >= 0 && savedVol <= 1) {
            _volume = savedVol;
        }

        // Listen for first user gesture to unlock audio
        const unlockEvents = ['click', 'touchstart', 'keydown'];
        const unlockHandler = () => {
            _unlocked = true;
            unlockEvents.forEach(e => document.removeEventListener(e, unlockHandler, { capture: true }));
            // Play pending track if any
            if (_pendingTrack && !_muted) {
                _playTrack(_pendingTrack);
            }
        };
        unlockEvents.forEach(e => document.addEventListener(e, unlockHandler, { capture: true, once: false }));
    }

    // -- Play a track by key (e.g., 'tavern', 'forest') --
    function play(trackKey) {
        if (!trackKey || !TRACKS[trackKey]) {
            console.warn('[AUDIO] Unknown track:', trackKey);
            return;
        }
        if (trackKey === _currentTrack && _audio && !_audio.paused) {
            return; // Already playing this track
        }

        _pendingTrack = trackKey;
        if (!_unlocked || _muted) return;

        _playTrack(trackKey);
    }

    function _playTrack(trackKey) {
        const url = AUDIO_BASE + TRACKS[trackKey];

        // Crossfade: fade out current, fade in new
        if (_audio && !_audio.paused) {
            _crossfadeOut(_audio);
        }

        _audio = new Audio(url);
        _audio.loop = true;
        _audio.volume = 0;
        _currentTrack = trackKey;

        _audio.play().then(() => {
            _crossfadeIn(_audio);
        }).catch(e => {
            // Autoplay blocked - will retry on next user gesture
            console.warn('[AUDIO] Play blocked:', e.message);
            _pendingTrack = trackKey;
            _unlocked = false;
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
            if (current >= target) {
                audio.volume = target;
                clearInterval(timer);
            } else {
                audio.volume = current;
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

        clearTimeout(_fadeTimer);
        const timer = setInterval(() => {
            current -= decrement;
            if (current <= 0) {
                audio.volume = 0;
                audio.pause();
                audio.src = '';
                clearInterval(timer);
                if (_fadeAudio === audio) _fadeAudio = null;
            } else {
                audio.volume = current;
            }
        }, stepMs);
    }

    // -- Stop all audio --
    function stop() {
        if (_audio) {
            _crossfadeOut(_audio);
            _audio = null;
        }
        _currentTrack = '';
        _pendingTrack = '';
    }

    // -- Play a one-shot sound effect (no loop) --
    function playSFX(trackKey) {
        if (_muted || !_unlocked) return;
        const url = AUDIO_BASE + TRACKS[trackKey];
        if (!url) return;

        const sfx = new Audio(url);
        sfx.volume = Math.min(1, _volume * 1.5); // SFX slightly louder
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
    }

    function getVolume() { return _volume; }

    // -- Biome mapping helper --
    // Maps game biome names to audio track keys
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

    // -- Create mute button UI --
    // Returns an HTML button element styled for Valdoria
    function createMuteButton() {
        const btn = document.createElement('button');
        btn.className = 'audio-mute-btn';
        btn.setAttribute('aria-label', 'Alternar som');
        _updateMuteBtn(btn);
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMute();
            _updateMuteBtn(btn);
        });
        return btn;
    }

    function _updateMuteBtn(btn) {
        btn.textContent = _muted ? '\uD83D\uDD07' : '\uD83D\uDD0A';
        btn.title = _muted ? 'Ativar som' : 'Desativar som';
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
