/* ═════════════════���═══════════════════════════���═════════
   FRAGMENTOS DE VALDORIA — Grimorio Interativo
   Logica de navegacao, swipe, indice, e efeito especial.

   SECURITY NOTE: innerHTML is used intentionally for
   fragment content which is hardcoded in fragments-data.js
   (a first-party trusted source, not user input).
   ══════════════════════��═══════════════════════════════��� */
(function () {
    'use strict';

    /* ─���─ STATE ─── */
    var _currentPage = -1; /* -1 = cover, 0 = index, 1..N = fragments */
    var _totalPages = 0;
    var _touchStartX = 0;
    var _touchStartY = 0;
    var _swiping = false;
    var SWIPE_THRESHOLD = 50;

    /* ─── ELEMENTS ─── */
    var $cover = document.getElementById('cover');
    var $pageIndex = document.getElementById('page-index');
    var $pageFrag = document.getElementById('page-fragment');
    var $btnStart = document.getElementById('btn-start');
    var $btnIndex = document.getElementById('btn-index');
    var $indexList = document.getElementById('index-list');
    var $parchment = document.getElementById('parchment');
    var $fragIcon = document.getElementById('frag-icon');
    var $fragType = document.getElementById('frag-type');
    var $fragEra = document.getElementById('frag-era');
    var $fragTitle = document.getElementById('frag-title');
    var $fragAuthor = document.getElementById('frag-author');
    var $fragContent = document.getElementById('frag-content');
    var $fragNotes = document.getElementById('frag-notes');
    var $pageCounter = document.getElementById('page-counter');
    var $pageCounterFrag = document.getElementById('page-counter-frag');
    /* Right page elements (for spread mode) */
    var $parchmentR = document.getElementById('parchment-right');
    var $fragTitleR = document.getElementById('frag-title-r');
    var $fragAuthorR = document.getElementById('frag-author-r');
    var $fragContentR = document.getElementById('frag-content-r');
    var $fragNotesR = document.getElementById('frag-notes-r');

    /* ─── FRAGMENT TYPE CONFIG ─── */
    var _types = (typeof FRAGMENT_TYPES !== 'undefined') ? FRAGMENT_TYPES : {};
    var _fragments = (typeof FRAGMENTS !== 'undefined') ? FRAGMENTS : [];
    _totalPages = _fragments.length;

    /* ─── SPREAD MODE DETECTION ─── */
    function isSpreadMode() {
        return window.innerWidth >= 768;
    }
    /* In spread mode, navigate by 2 pages at a time */
    function getStep() {
        return isSpreadMode() ? 2 : 1;
    }

    /* ─── INIT ─── */
    function init() {
        buildIndex();
        bindEvents();
        restoreState();
    }

    /* ─── INDEX (grouped by type with section headers) ─── */
    function buildIndex() {
        if (!$indexList || !_fragments.length) return;

        /* Group fragments by type, preserving original order within each group */
        var typeOrder = ['diary', 'prophecy', 'confession', 'religious', 'letter', 'record', 'strange'];
        var groups = {};
        for (var t = 0; t < typeOrder.length; t++) groups[typeOrder[t]] = [];

        for (var i = 0; i < _fragments.length; i++) {
            var f = _fragments[i];
            var type = f.type || 'strange';
            if (!groups[type]) groups[type] = [];
            groups[type].push({ frag: f, idx: i + 1 });
        }

        /* Build HTML — trusted first-party data from fragments-data.js */
        var html = '';
        for (var g = 0; g < typeOrder.length; g++) {
            var key = typeOrder[g];
            var items = groups[key];
            if (!items || !items.length) continue;

            var typeInfo = _types[key] || { icon: '\u25C6', label: '???' };
            html += '<div class="index-section">'
                + '<div class="index-section-header">'
                + '<span class="index-section-icon">' + typeInfo.icon + '</span>'
                + '<span class="index-section-label">' + escHtml(typeInfo.label) + '</span>'
                + '<span class="index-section-count">' + items.length + '</span>'
                + '</div>';

            for (var j = 0; j < items.length; j++) {
                var item = items[j];
                html += '<div class="index-item" data-idx="' + item.idx + '">'
                    + '<span class="index-item-num">' + item.idx + '</span>'
                    + '<span class="index-item-title">' + escHtml(item.frag.title) + '</span>'
                    + '<span class="index-item-era">' + escHtml(item.frag.era || '') + '</span>'
                    + '</div>';
            }
            html += '</div>';
        }
        $indexList.innerHTML = html; /* safe: built from trusted static data */
    }

    /* ─── NAVIGATION ─── */
    function goToPage(page) {
        if (page < -1) page = -1;
        if (page > _totalPages) page = _totalPages;
        /* In spread mode, align to odd pages so left page = odd, right = even */
        if (isSpreadMode() && page > 0 && page % 2 === 0) {
            page = page - 1;
        }

        /* hide current */
        var $old = getActivePage();
        if ($old) {
            $old.classList.remove('active');
            $old.classList.add('transitioning-out');
            setTimeout(function () { $old.classList.remove('transitioning-out'); }, 350);
        }

        _currentPage = page;
        saveState();
        playPageSound();

        /* show target */
        setTimeout(function () {
            var $target;
            if (page === -1) {
                $target = $cover;
                updateProgressBar(0, _totalPages);
            } else if (page === 0) {
                $target = $pageIndex;
                updatePageCounter($pageCounter, 0, _totalPages);
                updateProgressBar(0, _totalPages);
            } else {
                $target = $pageFrag;
                renderFragment(page - 1);
                updatePageCounter($pageCounterFrag, page, _totalPages);
                updateProgressBar(page, _totalPages);
            }
            if ($target) {
                $target.classList.add('active');
                /* scroll content to top */
                var parch = $target.querySelector('.page-parchment');
                if (parch) parch.scrollTop = 0;
            }
        }, 180);
    }

    function getActivePage() {
        if (_currentPage === -1) return $cover;
        if (_currentPage === 0) return $pageIndex;
        return $pageFrag;
    }

    function nextPage() {
        if (_currentPage === -1) goToPage(0); /* cover -> index */
        else if (_currentPage === 0) goToPage(1); /* index -> first fragment */
        else if (_currentPage < _totalPages) goToPage(Math.min(_currentPage + getStep(), _totalPages));
    }

    function prevPage() {
        if (_currentPage === 0) goToPage(-1); /* index -> cover */
        else if (_currentPage === 1) goToPage(0); /* first fragment -> index */
        else if (_currentPage > 1) goToPage(Math.max(_currentPage - getStep(), 1));
    }

    /* ��── RENDER FRAGMENT ─── */
    function renderFragment(idx) {
        var f = _fragments[idx];
        if (!f) return;

        var typeInfo = _types[f.type] || { icon: '\u25C6', label: '???', font: 'MedievalSharp' };

        /* header */
        $fragIcon.textContent = typeInfo.icon;
        $fragType.textContent = typeInfo.label;
        $fragEra.textContent = f.era || '';
        $fragTitle.textContent = f.title;
        $fragAuthor.textContent = f.author ? '\u2014 ' + f.author : '';

        /* content — safe: from trusted first-party fragments-data.js, contains only
           static HTML with <p>, <span class="faded">, etc. No user input involved. */
        $fragContent.innerHTML = f.content || '';
        $fragContent.setAttribute('data-font', typeInfo.font || 'MedievalSharp');

        /* notes — same trusted source */
        $fragNotes.innerHTML = f.notes || '';

        /* condition class on wrapper */
        $pageFrag.className = 'page fragment-page active';
        if (f.condition) {
            $pageFrag.classList.add('condition-' + f.condition);
        }

        /* paragraph separators for long fragments */
        addParagraphSeparators();

        /* "Read more" button if fragment has expanded text */
        addReadMoreButton(idx);

        /* special effect for fragment #30 (last) */
        if (idx === _fragments.length - 1 && f.type === 'strange') {
            applyTypewriterEffect();
        }

        /* ─── RIGHT PAGE (spread mode) ─── */
        if (isSpreadMode() && $parchmentR) {
            var nextIdx = idx + 1;
            if (nextIdx < _fragments.length) {
                var fr = _fragments[nextIdx];
                var tiR = _types[fr.type] || { icon: '\u25C6', label: '???', font: 'MedievalSharp' };
                $fragTitleR.textContent = fr.title;
                $fragAuthorR.textContent = fr.author ? '\u2014 ' + fr.author : '';
                /* safe: trusted first-party data */
                $fragContentR.innerHTML = fr.content || '';
                $fragContentR.setAttribute('data-font', tiR.font || 'MedievalSharp');
                $fragNotesR.innerHTML = fr.notes || '';
                $parchmentR.style.display = '';
                /* condition on right page */
                $parchmentR.className = 'page-parchment spread-right';
                if (fr.condition) $parchmentR.classList.add('condition-' + fr.condition);
            } else {
                /* No more fragments — hide right page */
                $parchmentR.style.display = 'none';
            }
        } else if ($parchmentR) {
            $parchmentR.style.display = '';
        }
    }

    /* ─── TYPEWRITER (Fragment #30) ─── */
    function applyTypewriterEffect() {
        var paragraphs = $fragContent.querySelectorAll('p');
        for (var i = 0; i < paragraphs.length; i++) {
            var p = paragraphs[i];
            p.classList.add('typewriter-line');
            p.style.animationDelay = (i * 1.2) + 's';
            /* progressive clarity: earlier paragraphs are more faded */
            var clarity = Math.min(6, Math.max(1, Math.ceil((i + 1) / paragraphs.length * 6)));
            if (i < 3) {
                p.classList.add('progressive-clarity-' + Math.min(clarity, 3));
            }
        }
    }

    /* ─── PAGE COUNTER ─── */
    function updatePageCounter($el, current, total) {
        if (!$el) return;
        if (current === 0) {
            $el.textContent = '\u00cdndice';
        } else if (isSpreadMode() && current < total) {
            $el.textContent = current + '-' + (current + 1) + ' / ' + total;
        } else {
            $el.textContent = current + ' / ' + total;
        }
    }

    /* ─── EVENTS ─── */
    function bindEvents() {
        /* cover button */
        if ($btnStart) $btnStart.addEventListener('click', function () { goToPage(0); });

        /* index toggle */
        if ($btnIndex) $btnIndex.addEventListener('click', function () {
            if (_currentPage === 0) {
                /* already on index, go to last viewed fragment or first */
                goToPage(1);
            } else {
                goToPage(0);
            }
        });

        /* index item click */
        if ($indexList) $indexList.addEventListener('click', function (e) {
            var item = e.target.closest('.index-item');
            if (item) {
                var idx = parseInt(item.getAttribute('data-idx'), 10);
                if (idx > 0) goToPage(idx);
            }
        });

        /* nav arrows */
        document.querySelectorAll('.nav-arrow').forEach(function (btn) {
            btn.addEventListener('click', function () {
                if (this.getAttribute('data-dir') === 'next') nextPage();
                else prevPage();
            });
        });

        /* swipe */
        var container = document.getElementById('book-container');
        if (container) {
            container.addEventListener('touchstart', onTouchStart, { passive: true });
            container.addEventListener('touchmove', onTouchMove, { passive: false });
            container.addEventListener('touchend', onTouchEnd, { passive: true });
        }

        /* keyboard */
        document.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); nextPage(); }
            if (e.key === 'ArrowLeft') { e.preventDefault(); prevPage(); }
            if (e.key === 'Escape') { e.preventDefault(); goToPage(0); }
        });
    }

    /* ─── TOUCH / SWIPE ─── */
    function onTouchStart(e) {
        if (!e.touches.length) return;
        _touchStartX = e.touches[0].clientX;
        _touchStartY = e.touches[0].clientY;
        _swiping = true;
    }

    function onTouchMove(e) {
        if (!_swiping || !e.touches.length) return;
        var dx = e.touches[0].clientX - _touchStartX;
        var dy = e.touches[0].clientY - _touchStartY;
        /* if horizontal swipe is dominant, prevent vertical scroll */
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 20) {
            e.preventDefault();
        }
    }

    function onTouchEnd(e) {
        if (!_swiping) return;
        _swiping = false;
        var touch = e.changedTouches[0];
        if (!touch) return;
        var dx = touch.clientX - _touchStartX;
        var dy = touch.clientY - _touchStartY;
        /* only horizontal swipe */
        if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
            if (dx < 0) nextPage();  /* swipe left = next */
            else prevPage();          /* swipe right = prev */
        }
    }

    /* ─── STATE PERSISTENCE ─── */
    function saveState() {
        try { sessionStorage.setItem('valdoria_lore_page', _currentPage); } catch (e) { /* noop */ }
    }

    function restoreState() {
        try {
            var saved = sessionStorage.getItem('valdoria_lore_page');
            if (saved !== null) {
                var p = parseInt(saved, 10);
                if (!isNaN(p) && p >= -1 && p <= _totalPages) {
                    goToPage(p);
                    return;
                }
            }
        } catch (e) { /* noop */ }
        /* default: show cover */
        goToPage(-1);
    }

    /* ─── PAGE TURN SOUND — realistic paper flip synthesis ─── */
    var _audioCtx = null;
    function playPageSound() {
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        try {
            if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            var sr = _audioCtx.sampleRate;
            var now = _audioCtx.currentTime;

            /*
             * Realistic page turn = 3 layers:
             * 1. Initial lift "shh" (high-freq noise, quick attack)
             * 2. Swoosh through air (mid-freq sweep, longer)
             * 3. Soft landing "fwp" (low thud, quick decay)
             */
            var duration = 0.35; /* 350ms total */
            var bufSize = Math.floor(sr * duration);
            var buf = _audioCtx.createBuffer(1, bufSize, sr);
            var ch = buf.getChannelData(0);

            for (var i = 0; i < bufSize; i++) {
                var t = i / sr; /* time in seconds */
                var p = i / bufSize; /* progress 0-1 */

                /* Envelope: quick attack, sustained swoosh, soft landing */
                var env;
                if (p < 0.08) {
                    env = p / 0.08; /* attack: 0 -> 1 in 28ms */
                } else if (p < 0.15) {
                    env = 1.0; /* peak: full amplitude */
                } else if (p < 0.7) {
                    env = 1.0 - (p - 0.15) * 0.7; /* slow decay during swoosh */
                } else {
                    env = 0.6 * (1.0 - (p - 0.7) / 0.3); /* final fade */
                }

                /* Layer 1: high-freq crinkle (paper fibers) */
                var crinkle = (Math.random() * 2 - 1) * 0.4;
                /* Shape: more crinkle at start (lifting paper) */
                crinkle *= (1.0 - p * 0.6);

                /* Layer 2: mid-freq swoosh (air movement) */
                var swoosh = (Math.random() * 2 - 1) * 0.3;
                /* Shape: peaks in middle (paper moving through air) */
                var swooshEnv = Math.sin(p * Math.PI);
                swoosh *= swooshEnv;

                /* Layer 3: low thud at landing (paper settling) */
                var thud = 0;
                if (p > 0.65 && p < 0.85) {
                    var tp = (p - 0.65) / 0.2;
                    thud = Math.sin(tp * Math.PI * 3) * (1 - tp) * 0.5;
                }

                ch[i] = (crinkle + swoosh + thud) * env * 0.08;
            }

            var src = _audioCtx.createBufferSource();
            src.buffer = buf;

            /* Filter chain for realistic paper texture */
            /* Highpass: remove rumble */
            var hp = _audioCtx.createBiquadFilter();
            hp.type = 'highpass';
            hp.frequency.value = 800;
            hp.Q.value = 0.3;

            /* Bandpass: paper resonance (1.5-6kHz range) */
            var bp = _audioCtx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.value = 2500;
            bp.Q.value = 0.4;

            /* Lowpass: smooth harsh edges */
            var lp = _audioCtx.createBiquadFilter();
            lp.type = 'lowpass';
            lp.frequency.value = 8000;
            lp.Q.value = 0.3;
            /* Sweep lowpass down during the turn for realism */
            lp.frequency.setValueAtTime(8000, now);
            lp.frequency.linearRampToValueAtTime(3000, now + duration);

            /* Gain control */
            var gain = _audioCtx.createGain();
            gain.gain.value = 0.25;

            src.connect(hp);
            hp.connect(bp);
            bp.connect(lp);
            lp.connect(gain);
            gain.connect(_audioCtx.destination);
            src.start();
        } catch (e) { /* audio not available — silent fallback */ }
    }

    /* ─── PROGRESS BAR ─── */
    var $progressBar = document.getElementById('progress-bar');
    function updateProgressBar(current, total) {
        if (!$progressBar || total <= 0) return;
        var pct = Math.round((current / total) * 100);
        $progressBar.style.width = pct + '%';
    }

    /* ─── PARAGRAPH SEPARATORS ─── */
    function addParagraphSeparators() {
        var paragraphs = $fragContent.querySelectorAll('p');
        if (paragraphs.length < 4) return;
        /* Insert ornamental separator every 3 paragraphs */
        for (var i = 3; i < paragraphs.length; i += 4) {
            var sep = document.createElement('div');
            sep.className = 'para-separator';
            sep.textContent = '\u25C6 \u25C6 \u25C6';
            /* safe: textContent with static chars, no user input */
            paragraphs[i].parentNode.insertBefore(sep, paragraphs[i]);
        }
    }

    /* ─── INTERACTIVE WORDS (tooltips) ─── */
    var $tooltip = document.getElementById('lore-tooltip');
    var $tooltipTitle = document.getElementById('tooltip-title');
    var $tooltipText = document.getElementById('tooltip-text');
    var $tooltipRefs = document.getElementById('tooltip-refs');
    var $tooltipClose = document.querySelector('.lore-tooltip-close');

    /* LORE_TOOLTIPS defined in fragments-data.js — trusted first-party data */
    var _tooltips = (typeof LORE_TOOLTIPS !== 'undefined') ? LORE_TOOLTIPS : {};

    function showTooltip(key) {
        var data = _tooltips[key];
        if (!data || !$tooltip) return;
        $tooltipTitle.textContent = data.title || key;
        $tooltipText.textContent = data.text || '';
        $tooltipRefs.textContent = data.refs || '';
        $tooltip.classList.add('visible');
    }
    function hideTooltip() {
        if ($tooltip) $tooltip.classList.remove('visible');
    }

    /* Delegate click on .lore-link elements */
    document.addEventListener('click', function (e) {
        var link = e.target.closest('.lore-link');
        if (link) {
            e.preventDefault();
            showTooltip(link.getAttribute('data-lore'));
            return;
        }
        if ($tooltip && $tooltip.classList.contains('visible') && !e.target.closest('.lore-tooltip')) {
            hideTooltip();
        }
    });
    if ($tooltipClose) $tooltipClose.addEventListener('click', hideTooltip);

    /* ─── DRAWER (half-sheet for expanded text) ─── */
    var $drawer = document.getElementById('lore-drawer');
    var $drawerOverlay = document.getElementById('drawer-overlay');
    var $drawerBody = document.getElementById('drawer-body');
    var $drawerTitle = document.getElementById('drawer-title');
    var $drawerClose = document.getElementById('drawer-close');

    function openDrawer(fragmentIdx) {
        var f = _fragments[fragmentIdx];
        if (!f || !$drawer) return;
        /* Use expanded content if available, otherwise full content.
           SECURITY NOTE: content is from trusted first-party fragments-data.js,
           not user input — contains only static HTML with <p>, <span class="faded">, etc. */
        var expanded = f.expanded || f.content;
        $drawerTitle.textContent = f.title;
        $drawerBody.innerHTML = expanded; /* safe: trusted static data */
        $drawer.classList.add('visible');
        if ($drawerOverlay) $drawerOverlay.classList.add('visible');
        $drawerBody.scrollTop = 0;
    }
    function closeDrawer() {
        if ($drawer) $drawer.classList.remove('visible');
        if ($drawerOverlay) $drawerOverlay.classList.remove('visible');
    }

    if ($drawerClose) $drawerClose.addEventListener('click', closeDrawer);
    if ($drawerOverlay) $drawerOverlay.addEventListener('click', closeDrawer);

    /* Add "Read more" button if fragment has expanded content */
    function addReadMoreButton(idx) {
        var f = _fragments[idx];
        if (!f || !f.expanded) return;
        var btn = document.createElement('button');
        btn.className = 'read-more-btn';
        btn.textContent = 'Continuar lendo \u25B8';
        btn.addEventListener('click', function () { openDrawer(idx); });
        $fragContent.appendChild(btn);
    }

    /* ─── UTILS ─── */
    function escHtml(str) {
        var d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    /* ─── BOOT ─── */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
