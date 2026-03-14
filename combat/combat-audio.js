/* ═══════════════════════════════════════════════
   COMBAT-AUDIO — Haptic + Procedural SFX
   Lendas de Valdoria Combat WebApp
   ═══════════════════════════════════════════════ */

// ─── FEATURE 4: HAPTIC FEEDBACK ───
function haptic(type) { try { tg?.HapticFeedback?.impactOccurred(type || 'light'); } catch (e) { console.warn('[COMBAT] haptic:', e); } }
function hapticNotify(type) { try { tg?.HapticFeedback?.notificationOccurred(type || 'success'); } catch (e) { console.warn('[COMBAT] haptic:', e); } }
function hapticSelect() { try { tg?.HapticFeedback?.selectionChanged(); } catch (e) { console.warn('[COMBAT] haptic:', e); } }
function hapticBurst(pattern) {
    // Distinct multi-pulse haptic patterns for dramatic moments
    // pattern: 'crit' = 3x heavy, 'kill' = heavy+notify+heavy, 'miss' = 2x light
    try {
        const hf = tg?.HapticFeedback;
        if (!hf) return;
        if (pattern === 'crit') {
            hf.impactOccurred('heavy');
            setTimeout(() => hf.impactOccurred('heavy'), 100);
            setTimeout(() => hf.impactOccurred('heavy'), 200);
        } else if (pattern === 'kill') {
            hf.impactOccurred('heavy');
            setTimeout(() => hf.notificationOccurred('success'), 120);
            setTimeout(() => hf.impactOccurred('heavy'), 280);
            setTimeout(() => hf.impactOccurred('medium'), 400);
        } else if (pattern === 'miss') {
            hf.impactOccurred('light');
            setTimeout(() => hf.impactOccurred('light'), 80);
        }
    } catch (e) { console.warn('[COMBAT] hapticBurst:', e); }
}

// ─── FEATURE 8: PROCEDURAL SFX (Web Audio API) ───
function _ensureAudio() {
    if (_audioCtx) return _audioCtx;
    try {
        _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        return _audioCtx;
    } catch (e) { console.warn('[COMBAT] AudioContext unavailable', e); return null; }
}

function _sfxNoise(dur, vol) {
    const ctx = _ensureAudio();
    if (!ctx || !_audioUnlocked) return;
    if (typeof ValdoriaAudio !== 'undefined' && ValdoriaAudio.isSFXMuted()) return;
    try {
        const bufSize = ctx.sampleRate * dur;
        const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        src.connect(gain); gain.connect(ctx.destination);
        src.start(); src.stop(ctx.currentTime + dur);
    } catch (e) { console.warn('[COMBAT] sfxNoise', e); }
}

function _sfxTone(freq, dur, vol, type) {
    const ctx = _ensureAudio();
    if (!ctx || !_audioUnlocked) return;
    if (typeof ValdoriaAudio !== 'undefined' && ValdoriaAudio.isSFXMuted()) return;
    try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type || 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.5, ctx.currentTime + dur);
        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(); osc.stop(ctx.currentTime + dur);
    } catch (e) { console.warn('[COMBAT] sfxTone', e); }
}

function sfxDiceRoll() { _sfxNoise(0.15, 0.08); }
function sfxHit() { _sfxTone(120, 0.25, 0.12, 'sawtooth'); }
function sfxCrit() { _sfxTone(220, 0.4, 0.18, 'sawtooth'); setTimeout(() => _sfxTone(330, 0.3, 0.12, 'sine'), 80); }
function sfxMiss() { _sfxTone(300, 0.2, 0.06, 'sine'); }
function sfxPlayerHit() { _sfxTone(80, 0.3, 0.15, 'sawtooth'); }
function sfxTimerTick() { _sfxTone(600, 0.08, 0.1, 'square'); }


// ─── SFX BY DAMAGE TYPE (Web Audio oscillator profiles) ───
function sfxDamageType(dt) {
    const ctx = _ensureAudio();
    if (!ctx || !_audioUnlocked) return;
    try {
        const profiles = {
            fire:      { type: 'sawtooth', f0: 180, f1: 80, dur: 0.35, vol: 0.12 },
            cold:      { type: 'sine',     f0: 400, f1: 200, dur: 0.3, vol: 0.10 },
            lightning: { type: 'square',   f0: 800, f1: 200, dur: 0.15, vol: 0.10 },
            thunder:   { type: 'sawtooth', f0: 60,  f1: 30,  dur: 0.5, vol: 0.14 },
            necrotic:  { type: 'triangle', f0: 60,  f1: 55,  dur: 0.5, vol: 0.10 },
            radiant:   { type: 'sine',     f0: 600, f1: 900, dur: 0.4, vol: 0.09 },
            poison:    { type: 'triangle', f0: 150, f1: 100, dur: 0.4, vol: 0.08 },
            acid:      { type: 'sawtooth', f0: 250, f1: 120, dur: 0.35, vol: 0.10 },
            psychic:   { type: 'sine',     f0: 500, f1: 700, dur: 0.35, vol: 0.08 },
            force:     { type: 'square',   f0: 300, f1: 150, dur: 0.25, vol: 0.10 },
        };
        const p = profiles[dt];
        if (!p) return; // slashing/piercing/bludgeoning use sfxHit()
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = p.type;
        osc.frequency.setValueAtTime(p.f0, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(Math.max(p.f1, 20), ctx.currentTime + p.dur);
        gain.gain.setValueAtTime(p.vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + p.dur);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(); osc.stop(ctx.currentTime + p.dur);
    } catch (e) { console.warn('[COMBAT] sfxDamageType', e); }
}
