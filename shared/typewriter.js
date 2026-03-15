/* ========================================================
   VALDORIA SHARED TYPEWRITER v1.0
   Unified typewriter animation for narration and dialogue.
   Supports pagination, tap-to-skip, configurable cursor.
   ======================================================== */
(function() {
    "use strict";

    var _iv = null;
    var _el = null;
    var _fullText = '';
    var _cb = null;
    var _PAGE_MAX = 160;

    /* ── Page splitting ─────────────────────────────── */
    function _splitPages(text) {
        if (!text) return [''];
        if (text.indexOf('|') !== -1) {
            return text.split('|').map(function(p) { return p.trim(); }).filter(Boolean);
        }
        if (text.length <= _PAGE_MAX) return [text];
        var pages = [];
        var remaining = text;
        while (remaining.length > _PAGE_MAX) {
            var cut = remaining.lastIndexOf('. ', _PAGE_MAX);
            if (cut < _PAGE_MAX * 0.4) cut = remaining.lastIndexOf(', ', _PAGE_MAX);
            if (cut < _PAGE_MAX * 0.4) cut = remaining.lastIndexOf(' ', _PAGE_MAX);
            if (cut <= 0) cut = _PAGE_MAX;
            else cut += 1;
            pages.push(remaining.slice(0, cut).trim());
            remaining = remaining.slice(cut).trim();
        }
        if (remaining) pages.push(remaining);
        return pages;
    }

    /* ── Continue button between pages ──────────────── */
    function _showContinue(el, pages, idx, total, onDone, opts) {
        if (total > 1) {
            var ind = document.createElement('div');
            ind.className = opts.pageClass || 'dm-page-indicator';
            ind.textContent = (idx + 1) + ' / ' + total;
            el.appendChild(ind);
        }
        var btn = document.createElement('button');
        btn.className = opts.continueClass || 'dm-continue-btn';
        btn.innerHTML = '<span>Continuar\u2026</span> <span style="font-size:16px">\u25B8</span>';
        btn.addEventListener('click', function() {
            _typePage(el, pages, idx + 1, onDone, opts);
        });
        el.appendChild(btn);
    }

    /* ── Single page typewriter ─────────────────────── */
    function _typePage(el, pages, pageIdx, onDone, opts) {
        var text = pages[pageIdx] || '';
        var isLast = pageIdx >= pages.length - 1;
        var total = pages.length;
        var i = 0;
        var _done = false;
        el.innerHTML = '';

        var span = document.createElement('span');
        el.appendChild(span);
        var cursor = document.createElement('span');
        cursor.className = opts.cursorClass || 'cursor';
        el.appendChild(cursor);

        _el = el;
        _fullText = text;
        _cb = onDone;

        var skipTyping = function() {
            if (_done) return;
            _done = true;
            clearInterval(_iv);
            _iv = null;
            span.textContent = text;
            cursor.remove();
            el.removeEventListener('click', skipTyping);
            if (isLast) {
                if (onDone) onDone();
            } else {
                _showContinue(el, pages, pageIdx, total, onDone, opts);
            }
        };
        el.addEventListener('click', skipTyping);

        _iv = setInterval(function() {
            if (i >= text.length) {
                if (_done) return;
                _done = true;
                clearInterval(_iv);
                _iv = null;
                cursor.remove();
                el.removeEventListener('click', skipTyping);
                if (opts.paginate) {
                    var postMs = Math.max(600, Math.min(1500, text.length * 8));
                    setTimeout(function() {
                        if (isLast) { if (onDone) onDone(); }
                        else { _showContinue(el, pages, pageIdx, total, onDone, opts); }
                    }, postMs);
                } else {
                    if (onDone) onDone();
                }
                return;
            }
            span.textContent += text[i];
            i++;
        }, opts.speed || 35);
    }

    /* ── Public API ─────────────────────────────────── */
    window.vTypewriter = {
        /**
         * Write text with typewriter effect.
         * @param {HTMLElement} el - Target element
         * @param {string} text - Text to type
         * @param {Object} [opts] - Options
         * @param {boolean} opts.paginate - Enable pagination (default: false)
         * @param {string} opts.cursorClass - CSS class for cursor (default: 'cursor')
         * @param {number} opts.speed - ms per character (default: 35)
         * @param {Function} opts.onDone - Callback when complete
         * @param {string} opts.pageClass - CSS class for page indicator
         * @param {string} opts.continueClass - CSS class for continue button
         */
        write: function(el, text, opts) {
            opts = opts || {};
            vTypewriter.skip(); // Cancel any running typewriter
            if (opts.paginate) {
                var pages = _splitPages(text);
                _typePage(el, pages, 0, opts.onDone, opts);
            } else {
                _typePage(el, [text], 0, opts.onDone, opts);
            }
        },

        /** Skip current typewriter — instant-reveal text */
        skip: function() {
            if (!_iv) return;
            clearInterval(_iv);
            _iv = null;
            if (_el && _fullText) {
                _el.textContent = _fullText;
            }
            if (_cb) {
                var cb = _cb;
                _cb = null;
                cb();
            }
        },

        /** Check if typewriter is running */
        isRunning: function() {
            return _iv !== null;
        }
    };
})();
