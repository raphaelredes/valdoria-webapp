/* ═══════════════════════════════════════════════════════════════
   GUIDE APP v3 — Lightweight search + accordion navigation
   Optimized: debounced search, pre-built index, cached DOM refs
   ═══════════════════════════════════════════════════════════════ */
(function() {
    'use strict';

    /* ─── PRE-BUILT SEARCH INDEX (computed once) ─── */
    var _index = []; // [{id, plain, topic}]
    var _topicMap = {}; // id → topic (O(1) lookup)
    for (var k = 0; k < GUIDE_TOPICS.length; k++) {
        var t = GUIDE_TOPICS[k];
        _index.push({
            id: t.id,
            plain: (t.title + ' ' + t.body.replace(/<[^>]*>/g, '')).toLowerCase(),
            topic: t
        });
        _topicMap[t.id] = t;
    }

    /* --- CROSS-REFERENCES --- */
    var _crossRefs = {
        'combat': ['advantage', 'death', 'skills'],
        'exploration': ['world_map', 'camp', 'advantage'],
        'inn': ['exhaustion', 'camp'],
        'death': ['combat', 'inn', 'bank'],
        'classes': ['races', 'levelup', 'skills'],
        'races': ['classes', 'levelup'],
        'allies': ['guild', 'tavern', 'combat'],
        'world_map': ['exploration', 'travel'],
        'advantage': ['combat', 'event_trap'],
        'exhaustion': ['inn', 'death'],
        'levelup': ['classes', 'skills'],
        'skills': ['combat', 'levelup'],
        'inventory': ['market', 'workshop'],
        'market': ['inventory', 'black_market']
    };

    // Global function for cross-ref links
    window._openTopic = function(topicId) {
        openAndScrollTo(topicId);
    };


    /* ─── STATE ─── */
    var activeCat = 'todos';
    var searchTerm = '';
    var _searchWords = []; // split terms for multi-word AND search
    var _debounceTimer = null;
    var _openCardId = null;
    var _priorCat = null; // category before search override

    /* ─── DOM refs ─── */
    var searchInput = document.getElementById('searchInput');
    var searchClear = document.getElementById('searchClear');
    var catFilters  = document.getElementById('catFilters');
    var topicsEl    = document.getElementById('topics');
    var noResults   = document.getElementById('noResults');
    var closeBtn    = document.getElementById('closeBtn');
    var resultCount = document.getElementById('resultCount');

    /* ─── PER-CARD CACHED REFS (set during buildTopics) ─── */
    var _cardRefs = []; // [{card, nameEl, contentEl}]

    /* ─── INIT ─── */
    var _returnUrl = null;

    function _goBack() {
        if (_returnUrl) {
            window.location.replace(_returnUrl);
        } else if (window.Telegram && Telegram.WebApp) {
            try { Telegram.WebApp.close(); } catch(e) { console.warn('[GUIDE] close failed:', e); }
        } else {
            window.history.back();
        }
    }

    function init() {
        // Detect return URL from Game Hub transition
        var params = new URLSearchParams(window.location.search);
        var ret = params.get('ret');
        if (ret) {
            _returnUrl = ret;
            if (closeBtn) closeBtn.innerHTML = '🔙 Voltar';
        }

        if (window.Telegram && Telegram.WebApp) {
            Telegram.WebApp.ready();
            Telegram.WebApp.expand();
            try { Telegram.WebApp.headerColor = '#2a2420'; } catch(e) { /* Telegram API optional */ }
            try { Telegram.WebApp.backgroundColor = '#2a2420'; } catch(e) { /* Telegram API optional */ }
            if (Telegram.WebApp.BackButton) {
                Telegram.WebApp.BackButton.show();
                Telegram.WebApp.BackButton.onClick(_goBack);
            }
        }

        buildCategoryFilters();
        buildTopics();

        // Context param — auto-open relevant card
        var ctx = params.get('ctx');
        if (ctx) {
            var target = findTopicForCtx(ctx);
            if (target) {
                setTimeout(function() { openAndScrollTo(target.id); }, 200);
            }
        }

        // Search: debounced input
        searchInput.addEventListener('input', function() {
            clearTimeout(_debounceTimer);
            _debounceTimer = setTimeout(onSearch, 180);
        });
        searchClear.addEventListener('click', clearSearch);

        // Dismiss keyboard on scroll (mobile UX)
        topicsEl.addEventListener('touchmove', function() {
            if (document.activeElement === searchInput) searchInput.blur();
        }, { passive: true });

        closeBtn.addEventListener('click', _goBack);
    }

    function findTopicForCtx(ctx) {
        if (_topicMap[ctx]) return _topicMap[ctx];
        for (var j = 0; j < _index.length; j++) {
            if (ctx.indexOf(_index[j].id) === 0) return _index[j].topic;
        }
        return null;
    }

    /* ─── CATEGORY PILLS ─── */
    function buildCategoryFilters() {
        for (var key in GUIDE_CATEGORIES) {
            if (!GUIDE_CATEGORIES.hasOwnProperty(key)) continue;
            var pill = document.createElement('button');
            pill.className = 'cat-pill' + (key === 'todos' ? ' active' : '');
            pill.textContent = GUIDE_CATEGORIES[key];
            pill.dataset.cat = key;
            pill.addEventListener('click', (function(k) {
                return function() { selectCategory(k); };
            })(key));
            catFilters.appendChild(pill);
        }
    }

    function selectCategory(cat) {
        activeCat = cat;
        _priorCat = null; // manual selection clears saved
        _highlightPill(cat);
        _openCardId = null;
        filterTopics();
        window.scrollTo(0, 0);
    }

    function _highlightPill(cat) {
        var pills = catFilters.querySelectorAll('.cat-pill');
        for (var i = 0; i < pills.length; i++) {
            pills[i].classList.toggle('active', pills[i].dataset.cat === cat);
        }
    }

    /* ─── BUILD TOPIC CARDS (cache DOM refs) ─── */
    function buildTopics() {
        var frag = document.createDocumentFragment();
        for (var i = 0; i < GUIDE_TOPICS.length; i++) {
            var topic = GUIDE_TOPICS[i];
            var card = document.createElement('div');
            card.className = 'topic-card';
            card.dataset.id = topic.id;
            card.dataset.cat = topic.cat;

            var header = document.createElement('div');
            header.className = 'topic-header';
            header.innerHTML =
                '<span class="topic-name">' + topic.icon + ' ' + topic.title + '</span>' +
                '<span class="topic-arrow">\u25b8</span>';
            header.addEventListener('click', (function(c, tid) {
                return function() { toggleCard(c, tid); };
            })(card, topic.id));

            var body = document.createElement('div');
            body.className = 'topic-body';

            var inner = document.createElement('div');
            inner.className = 'topic-body-inner';

            var content = document.createElement('div');
            content.className = 'topic-content';

            inner.appendChild(content);
            body.appendChild(inner);
            card.appendChild(header);
            card.appendChild(body);
            frag.appendChild(card);

            // Cache refs — avoid querySelector per filter cycle
            _cardRefs.push({
                card: card,
                nameEl: header.querySelector('.topic-name'),
                contentEl: content
            });
        }
        topicsEl.appendChild(frag);
    }

    function fmtBody(text) {
        return text.replace(/\n/g, '<br>');
    }

    /* ─── ACCORDION TOGGLE ─── */
    function toggleCard(card, topicId) {
        var isOpen = card.classList.contains('open');

        if (isOpen) {
            card.classList.remove('open');
            _openCardId = null;
            return;
        }

        // Accordion: close previous (only when not searching)
        if (!searchTerm && _openCardId && _openCardId !== topicId) {
            var prev = topicsEl.querySelector('.topic-card.open');
            if (prev) prev.classList.remove('open');
        }

        // Lazy-render body content
        var idx = _getCardIndex(topicId);
        var ref = idx >= 0 ? _cardRefs[idx] : null;
        if (ref && !ref.contentEl.innerHTML) {
            var topic = _topicMap[topicId];
            if (topic) {
                var html = searchTerm
                    ? highlightText(fmtBody(topic.body), _searchWords)
                    : fmtBody(topic.body);
                // Append cross-references
                var refs = _crossRefs[topicId];
                if (refs && refs.length && !searchTerm) {
                    var links = [];
                    for (var r = 0; r < refs.length; r++) {
                        var rt = _topicMap[refs[r]];
                        if (rt) links.push('<a onclick="_openTopic(\'' + refs[r] + '\')">' + rt.icon + ' ' + rt.title + '</a>');
                    }
                    if (links.length) {
                        html += '<div class="topic-related">Veja tamb\u00e9m: ' + links.join(' \u00b7 ') + '</div>';
                    }
                }
                ref.contentEl.innerHTML = html;
            }
        }

        card.classList.add('open');
        _openCardId = topicId;

        setTimeout(function() {
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 50);
    }

    function _getCardIndex(topicId) {
        for (var i = 0; i < _index.length; i++) {
            if (_index[i].id === topicId) return i;
        }
        return -1;
    }

    /* ─── SEARCH ─── */
    function onSearch() {
        var raw = searchInput.value.trim().toLowerCase();
        searchClear.classList.toggle('visible', raw.length > 0);

        if (raw !== searchTerm) {
            searchTerm = raw;
            _searchWords = raw ? raw.split(/\s+/).filter(Boolean) : [];

            // Auto-switch to "Todos" when searching, save prior category
            if (searchTerm && activeCat !== 'todos') {
                _priorCat = activeCat;
                activeCat = 'todos';
                _highlightPill('todos');
            }

            filterTopics();
        }
    }

    function clearSearch() {
        searchInput.value = '';
        searchTerm = '';
        _searchWords = [];
        searchClear.classList.remove('visible');
        _openCardId = null;

        // Restore prior category
        if (_priorCat) {
            activeCat = _priorCat;
            _highlightPill(_priorCat);
            _priorCat = null;
        }

        filterTopics();
        searchInput.blur();
        window.scrollTo(0, 0);
    }

    function filterTopics() {
        var visibleCount = 0;
        var firstMatch = null;

        for (var i = 0; i < _cardRefs.length; i++) {
            var ref = _cardRefs[i];
            var card = ref.card;
            var entry = _index[i];
            var cat = entry.topic.cat;

            var catMatch = activeCat === 'todos' || cat === activeCat;

            // Multi-word AND search
            var searchMatch = true;
            if (_searchWords.length) {
                for (var w = 0; w < _searchWords.length; w++) {
                    if (entry.plain.indexOf(_searchWords[w]) === -1) {
                        searchMatch = false;
                        break;
                    }
                }
            }

            var visible = catMatch && searchMatch;
            card.classList.toggle('hidden', !visible);

            if (visible) {
                visibleCount++;
                var topic = entry.topic;

                if (searchTerm) {
                    ref.nameEl.innerHTML = highlightText(topic.icon + ' ' + topic.title, _searchWords);
                    ref.contentEl.innerHTML = highlightText(fmtBody(topic.body), _searchWords);
                    card.classList.add('open');
                    if (!card.dataset.pulsed) {
                        card.classList.add('search-match');
                        card.dataset.pulsed = '1';
                    }
                    if (!firstMatch) firstMatch = card;
                } else {
                    ref.nameEl.innerHTML = topic.icon + ' ' + topic.title;
                    if (card.dataset.id !== _openCardId) {
                        card.classList.remove('open');
                        ref.contentEl.innerHTML = '';
                    } else {
                        ref.contentEl.innerHTML = fmtBody(topic.body);
                    }
                    card.classList.remove('search-match');
                    delete card.dataset.pulsed;
                }
            }
        }

        if (resultCount) {
            if (searchTerm) {
                resultCount.textContent = visibleCount + (visibleCount === 1 ? ' resultado' : ' resultados');
                resultCount.classList.add('visible');
            } else {
                resultCount.classList.remove('visible');
            }
        }

        noResults.classList.toggle('visible', visibleCount === 0);

        if (firstMatch && searchTerm) {
            setTimeout(function() {
                firstMatch.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 80);
        }
    }

    function highlightText(html, words) {
        if (!words || !words.length) return html;
        for (var i = 0; i < words.length; i++) {
            var escaped = words[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            var regex = new RegExp('(?![^<]*>)(' + escaped + ')', 'gi');
            html = html.replace(regex, '<mark class="search-hl">$1</mark>');
        }
        return html;
    }

    /* ─── SCROLL TO TOPIC (from URL ctx) ─── */
    function openAndScrollTo(topicId) {
        var idx = _getCardIndex(topicId);
        if (idx === -1) return;
        var ref = _cardRefs[idx];
        var card = ref.card;

        var topic = _topicMap[topicId];
        if (topic && activeCat !== 'todos' && topic.cat !== activeCat) {
            selectCategory('todos');
        }

        if (!ref.contentEl.innerHTML) {
            ref.contentEl.innerHTML = fmtBody(topic.body);
        }

        card.classList.add('open');
        _openCardId = topicId;

        card.scrollIntoView({ behavior: 'smooth', block: 'start' });

        setTimeout(function() {
            card.classList.add('search-match');
        }, 250);
    }

    /* ─── START ─── */
    document.addEventListener('DOMContentLoaded', init);
})();
