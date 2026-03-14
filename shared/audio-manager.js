// ===================================================================
// VALDORIA AUDIO MANAGER v1.1
// Singleton for ambient music and sound effects across all WebApps.
// Handles autoplay restrictions, seamless loop crossfade, mute toggle,
// localStorage persistence, and random variant selection.
// ===================================================================

const ValdoriaAudio = (() => {
    'use strict';

    const STORAGE_KEY = 'valdoria_audio_muted';
    const VOLUME_KEY = 'valdoria_audio_volume';
    const CROSSFADE_MS = 1200;
    const DEFAULT_VOLUME = 0.25;
    const NO_LOOP_TRACKS = ['victory', 'defeat'];

    // Base URL for audio files (relative to webapp root)
    const AUDIO_BASE = '../shared/audio/';

    // Track catalog: biome/context -> array of variant filenames
    // Naming: base.mp3, base_2.mp3, base_3.mp3 (up to 3 variants)
    // A random variant is picked each time a track starts or loops.
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

    // Pick a random file from a track's variant array
    function _pickVariant(trackKey) {
        const variants = TRACKS[trackKey];
        if (!variants || variants.length === 0) return null;
        return variants[Math.floor(Math.random() * variants.length)];
    }

    let _audio = null;          // Current HTMLAudioElement
    let _fadeAudio = null;      // Previous audio being faded out
    let _currentTrack = '';     // Current track key
    let _muted = false;
    let _volume = DEFAULT_VOLUME;
    let _unlocked = false;      // Whether audio context has been unlocked by user gesture
    let _pendingTrack = '';     // Track queued before unlock
    let _looping = false;       // Whether loop crossfade is already in progress

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
            if (_pendingTrack && !_muted) {
                _playTrack(_pendingTrack);
            }
        };
        unlockEvents.forEach(e => document.addEventListener(e, unlockHandler, { capture: true, once: false }));
    }

    // -- Play a track by key (e.g., 'tavern', 'forest') --
    function play(trackKey) {
        if (!trackKey || !TRACKS[trackKey] || TRACKS[trackKey].length === 0) {
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
        const file = _pickVariant(trackKey);
        if (!file) return;
        const url = AUDIO_BASE + file;

        // Crossfade out current track
        if (_audio && !_audio.paused) {
            _crossfadeOut(_audio);
        }
        _looping = false;

        const audio = new Audio(url);
        audio.volume = 0;
        audio.preload = 'auto';
        _audio = audio;
        _currentTrack = trackKey;

        // Seamless loop via crossfade (not audio.loop) to avoid MP3 gap
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

    // Seamless loop: when near end, crossfade to a new Audio instance
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
            // Fallback: restart old audio from beginning
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

    // -- Stop all audio --
    function stop() {
        if (_audio) {
            _crossfadeOut(_audio);
            _audio = null;
        }
        _currentTrack = '';
        _pendingTrack = '';
        _looping = false;
    }

    // -- Play a one-shot sound effect (no loop) --
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
        btn.textContent = _muted ? '🔇' : '🔊';
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
