/**
 * DiceRoller — Shared dice animation component for Valdoria WebApps.
 *
 * Usage:
 *   // Single roll
 *   DiceRoller.roll({ sides: 20, result: 18, label: 'Kalfin', container: '#dice' });
 *
 *   // Sequential initiative-style roll
 *   DiceRoller.rollSequence([
 *     { sides: 20, result: 18, label: 'Kalfin', type: 'player', icon: '\u{1F464}', formula: 'd20+2' },
 *     { sides: 20, result: 14, label: 'Lobo',   type: 'enemy',  icon: '\u{1F479}' },
 *   ], { container: '#dice-area', onComplete: () => {} });
 */
const DiceRoller = (() => {
    'use strict';

    // ─── Haptic helpers (Telegram WebApp) ───
    function haptic(style) {
        try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.(style); } catch(_) {}
    }

    // ─── Build a single entry DOM node ───
    function _buildEntry(item) {
        const row = document.createElement('div');
        row.className = 'dr-entry';
        if (item.type) row.classList.add('dr-' + item.type);

        // Icon
        const ico = document.createElement('span');
        ico.className = 'dr-icon';
        ico.textContent = item.icon || '\u{1F3B2}';
        row.appendChild(ico);

        // Name
        const name = document.createElement('span');
        name.className = 'dr-name';
        name.textContent = item.label || '';
        row.appendChild(name);

        // Dice box
        const box = document.createElement('div');
        box.className = 'dr-dice-box';

        const emoji = document.createElement('span');
        emoji.className = 'dr-dice-emoji';
        emoji.textContent = '\u{1F3B2}';
        box.appendChild(emoji);

        const val = document.createElement('span');
        val.className = 'dr-dice-value';
        val.textContent = '';
        box.appendChild(val);

        if (item.formula) {
            const f = document.createElement('span');
            f.className = 'dr-formula';
            f.textContent = '(' + item.formula + ')';
            box.appendChild(f);
        }

        row.appendChild(box);
        return { row, emoji, val };
    }

    // ─── Animate cycling numbers then reveal ───
    function _animateEntry(entry, item, duration, onDone) {
        const { row, emoji, val } = entry;
        const sides = item.sides || 20;
        const result = item.result;

        // Phase 1: appear + shake
        row.classList.add('dr-visible');
        emoji.classList.add('dr-shaking');
        val.classList.add('dr-cycling');
        haptic('light');

        let cycleMs = 80;
        let elapsed = 0;
        const cycleInterval = setInterval(() => {
            val.textContent = Math.floor(Math.random() * sides) + 1;
            elapsed += cycleMs;
            // Accelerate toward end
            if (elapsed > duration * 0.6 && cycleMs > 50) {
                clearInterval(cycleInterval);
                cycleMs = 50;
                // Continue faster...
                const fastInterval = setInterval(() => {
                    val.textContent = Math.floor(Math.random() * sides) + 1;
                }, cycleMs);
                setTimeout(() => {
                    clearInterval(fastInterval);
                    _revealEntry(entry, item, onDone);
                }, duration - elapsed);
            }
        }, cycleMs);

        // Safety: ensure reveal happens
        setTimeout(() => {
            clearInterval(cycleInterval);
            _revealEntry(entry, item, onDone);
        }, duration + 50);
    }

    let _revealedSet = new Set(); // prevent double-reveal
    function _revealEntry(entry, item, onDone) {
        const key = entry.row;
        if (_revealedSet.has(key)) return;
        _revealedSet.add(key);

        const { emoji, val } = entry;
        emoji.classList.remove('dr-shaking');
        val.classList.remove('dr-cycling');

        // Show result
        val.textContent = item.result;
        emoji.classList.add('dr-slamming');

        // Type-based color
        const typeClass = item.type ? ('dr-' + item.type + '-val') : '';
        if (typeClass) val.classList.add(typeClass);

        // Haptic
        haptic('medium');

        // Glow for high rolls
        if (item.result >= 18) {
            emoji.classList.add('dr-glow');
        }

        if (onDone) setTimeout(onDone, 100);
    }

    // ─── Calculate per-entry duration based on count ───
    function _entryDuration(count) {
        // More entries = faster animation per entry
        // 1-2: 700ms, 3-4: 550ms, 5+: 450ms
        if (count <= 2) return 700;
        if (count <= 4) return 550;
        return 450;
    }

    function _entryDelay(count) {
        // Overlap between entries
        if (count <= 2) return 800;
        if (count <= 4) return 650;
        return 500;
    }

    // ═══════════════════════════════════════════
    //  PUBLIC API
    // ═══════════════════════════════════════════

    /**
     * Roll a single die with animation.
     * @param {Object} opts - { sides, result, label, icon, type, formula, container }
     * @returns {Promise} resolves when animation is complete
     */
    function roll(opts) {
        return new Promise(resolve => {
            const container = typeof opts.container === 'string'
                ? document.querySelector(opts.container)
                : opts.container;
            if (!container) { resolve(); return; }

            const wrap = document.createElement('div');
            wrap.className = 'dr-container';

            const entry = _buildEntry(opts);
            wrap.appendChild(entry.row);
            container.appendChild(wrap);

            _animateEntry(entry, opts, 700, resolve);
        });
    }

    /**
     * Roll multiple dice sequentially (initiative-style).
     * @param {Array} items - [{ sides, result, label, type, icon, formula }, ...]
     * @param {Object} opts - { container, title, onComplete, skipBtn }
     * @returns {Object} { skip() } to programmatically skip animation
     */
    function rollSequence(items, opts = {}) {
        _revealedSet = new Set();
        const container = typeof opts.container === 'string'
            ? document.querySelector(opts.container)
            : opts.container;
        if (!container || !items.length) {
            if (opts.onComplete) opts.onComplete();
            return { skip: () => {} };
        }

        const count = items.length;
        const dur = _entryDuration(count);
        const delay = _entryDelay(count);
        let _skipped = false;
        let _done = false;

        // Build DOM
        const wrap = document.createElement('div');
        wrap.className = 'dr-container';

        if (opts.title) {
            const t = document.createElement('div');
            t.className = 'dr-title';
            t.textContent = opts.title;
            wrap.appendChild(t);
        }

        const entries = items.map(item => {
            const e = _buildEntry(item);
            wrap.appendChild(e.row);
            return e;
        });

        container.innerHTML = '';
        container.appendChild(wrap);

        // Skip function: reveal all immediately
        function skipAll() {
            if (_done) return;
            _skipped = true;
            entries.forEach((entry, i) => {
                _revealEntry(entry, items[i], null);
                entry.row.classList.add('dr-visible');
            });
            _finish();
        }

        function _finish() {
            if (_done) return;
            _done = true;
            if (opts.onComplete) opts.onComplete();
        }

        // Animate sequentially
        let idx = 0;
        function next() {
            if (_skipped || idx >= entries.length) {
                if (!_skipped) _finish();
                return;
            }
            const i = idx++;
            _animateEntry(entries[i], items[i], dur, () => {
                if (i === entries.length - 1) _finish();
            });
            // Start next entry with overlap
            if (idx < entries.length) {
                setTimeout(next, delay);
            }
        }
        next();

        // Auto-complete safety net
        const totalTime = delay * count + dur + 200;
        setTimeout(() => { if (!_done) skipAll(); }, totalTime);

        return { skip: skipAll };
    }

    return { roll, rollSequence };
})();
