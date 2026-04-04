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

    /* ─── FRAGMENT TYPE CONFIG ─── */
    var _types = (typeof FRAGMENT_TYPES !== 'undefined') ? FRAGMENT_TYPES : {};
    var _fragments = (typeof FRAGMENTS !== 'undefined') ? FRAGMENTS : [];
    _totalPages = _fragments.length;

    /* ─── INIT ─── */
    function init() {
        buildIndex();
        bindEvents();
        restoreState();
    }

    /* ─── INDEX ─── */
    function buildIndex() {
        if (!$indexList || !_fragments.length) return;
        /* Content is from trusted first-party fragments-data.js, not user input */
        var html = '';
        for (var i = 0; i < _fragments.length; i++) {
            var f = _fragments[i];
            var typeInfo = _types[f.type] || { icon: '\u25C6', label: '???' };
            html += '<div class="index-item" data-idx="' + (i + 1) + '">'
                + '<span class="index-item-num">' + (i + 1) + '.</span>'
                + '<span class="index-item-icon">' + typeInfo.icon + '</span>'
                + '<span class="index-item-title">' + escHtml(f.title) + '</span>'
                + '</div>';
        }
        $indexList.innerHTML = html; /* safe: built from trusted static data */
    }

    /* ─── NAVIGATION ─── */
    function goToPage(page) {
        if (page < -1) page = -1;
        if (page > _totalPages) page = _totalPages;

        /* hide current */
        var $old = getActivePage();
        if ($old) {
            $old.classList.remove('active');
            $old.classList.add('transitioning-out');
            setTimeout(function () { $old.classList.remove('transitioning-out'); }, 350);
        }

        _currentPage = page;
        saveState();

        /* show target */
        setTimeout(function () {
            var $target;
            if (page === -1) {
                $target = $cover;
                $btnIndex.classList.remove('visible');
            } else if (page === 0) {
                $target = $pageIndex;
                updatePageCounter($pageCounter, 0, _totalPages);
                $btnIndex.classList.add('visible');
            } else {
                $target = $pageFrag;
                renderFragment(page - 1);
                updatePageCounter($pageCounterFrag, page, _totalPages);
                $btnIndex.classList.add('visible');
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
        else if (_currentPage < _totalPages) goToPage(_currentPage + 1);
    }

    function prevPage() {
        if (_currentPage === 0) goToPage(-1); /* index -> cover */
        else if (_currentPage > 0) goToPage(_currentPage - 1);
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

        /* special effect for fragment #30 (last) */
        if (idx === _fragments.length - 1 && f.type === 'strange') {
            applyTypewriterEffect();
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
