/* ═══════════════════════════════════════════════════════════════
   GUIDE APP v2 — Lightweight search + accordion navigation
   Optimized: debounced search, pre-built index, zero forced reflows
   ═══════════════════════════════════════════════════════════════ */
(function() {
    'use strict';

    /* ─── PRE-BUILT SEARCH INDEX (computed once) ─── */
    var _index = []; // [{id, plain, topic}]  plain = lowercase stripped text
    for (var k = 0; k < GUIDE_TOPICS.length; k++) {
        var t = GUIDE_TOPICS[k];
        _index.push({
            id: t.id,
            plain: (t.title + ' ' + t.body.replace(/<[^>]*>/g, '')).toLowerCase(),
            topic: t
        });
    }

    /* ─── STATE ─── */
    var activeCat = 'todos';
    var searchTerm = '';
    var _debounceTimer = null;
    var _openCardId = null; // accordion: only one card open at a time

    /* ─── DOM refs ─── */
    var searchInput = document.getElementById('searchInput');
    var searchClear = document.getElementById('searchClear');
    var catFilters  = document.getElementById('catFilters');
    var topicsEl    = document.getElementById('topics');
    var noResults   = document.getElementById('noResults');
    var closeBtn    = document.getElementById('closeBtn');
    var resultCount = document.getElementById('resultCount');

    /* ─── INIT ─── */
    function init() {
        if (window.Telegram && Telegram.WebApp) {
            Telegram.WebApp.ready();
            Telegram.WebApp.expand();
            try { Telegram.WebApp.headerColor = '#2a2420'; } catch(e) {}
            try { Telegram.WebApp.backgroundColor = '#2a2420'; } catch(e) {}
        }

        buildCategoryFilters();
        buildTopics();

        // Context param — auto-open relevant card
        var params = new URLSearchParams(window.location.search);
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

        closeBtn.addEventListener('click', function() {
            if (window.Telegram && Telegram.WebApp) {
                Telegram.WebApp.close();
            } else {
                window.history.back();
            }
        });
    }

    function findTopicForCtx(ctx) {
        for (var i = 0; i < _index.length; i++) {
            if (_index[i].id === ctx) return _index[i].topic;
        }
        // Prefix match
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
        var pills = catFilters.querySelectorAll('.cat-pill');
        for (var i = 0; i < pills.length; i++) {
            pills[i].classList.toggle('active', pills[i].dataset.cat === cat);
        }
        _openCardId = null; // collapse all on category switch
        filterTopics();
        // Scroll to top on category change
        topicsEl.scrollTop = 0;
        window.scrollTo(0, 0);
    }

    /* ─── BUILD TOPIC CARDS ─── */
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
            // Body is rendered only when card opens (lazy)

            inner.appendChild(content);
            body.appendChild(inner);
            card.appendChild(header);
            card.appendChild(body);
            frag.appendChild(card);
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
            // Close this card
            card.classList.remove('open');
            _openCardId = null;
            return;
        }

        // Close previously open card (accordion — only during non-search)
        if (!searchTerm && _openCardId && _openCardId !== topicId) {
            var prev = topicsEl.querySelector('.topic-card.open');
            if (prev) prev.classList.remove('open');
        }

        // Lazy-render body content
        var contentEl = card.querySelector('.topic-content');
        if (!contentEl.innerHTML) {
            var topic = findTopicById(topicId);
            if (topic) {
                contentEl.innerHTML = searchTerm
                    ? highlightText(fmtBody(topic.body), searchTerm)
                    : fmtBody(topic.body);
            }
        }

        card.classList.add('open');
        _openCardId = topicId;

        // Smooth scroll card header into view
        setTimeout(function() {
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 50);
    }

    function findTopicById(id) {
        for (var i = 0; i < GUIDE_TOPICS.length; i++) {
            if (GUIDE_TOPICS[i].id === id) return GUIDE_TOPICS[i];
        }
        return null;
    }

    /* ─── SEARCH ─── */
    function onSearch() {
        searchTerm = searchInput.value.trim().toLowerCase();
        searchClear.classList.toggle('visible', searchTerm.length > 0);
        filterTopics();
    }

    function clearSearch() {
        searchInput.value = '';
        searchTerm = '';
        searchClear.classList.remove('visible');
        _openCardId = null; // collapse all when clearing
        filterTopics();
        searchInput.blur(); // dismiss keyboard
        window.scrollTo(0, 0);
    }

    function filterTopics() {
        var visibleCount = 0;
        var cards = topicsEl.querySelectorAll('.topic-card');
        var firstMatch = null;

        for (var i = 0; i < cards.length; i++) {
            var card = cards[i];
            var id = card.dataset.id;
            var cat = card.dataset.cat;
            var entry = _index[i]; // cards are built in same order as _index

            // Category filter
            var catMatch = activeCat === 'todos' || cat === activeCat;

            // Search filter — uses pre-built plain text index
            var searchMatch = true;
            if (searchTerm) {
                searchMatch = entry.plain.indexOf(searchTerm) !== -1;
            }

            var visible = catMatch && searchMatch;
            card.classList.toggle('hidden', !visible);

            if (visible) {
                visibleCount++;
                var contentEl = card.querySelector('.topic-content');
                var nameEl = card.querySelector('.topic-name');
                var topic = entry.topic;

                if (searchTerm) {
                    // Highlight title
                    nameEl.innerHTML = highlightText(topic.icon + ' ' + topic.title, searchTerm);
                    // Render + highlight body content
                    contentEl.innerHTML = highlightText(fmtBody(topic.body), searchTerm);
                    // Auto-open matching cards during search
                    card.classList.add('open');
                    // Pulse — only on first render (avoid re-triggering)
                    if (!card.dataset.pulsed) {
                        card.classList.add('search-match');
                        card.dataset.pulsed = '1';
                    }
                    if (!firstMatch) firstMatch = card;
                } else {
                    // Restore title
                    nameEl.innerHTML = topic.icon + ' ' + topic.title;
                    // Close all cards and clear content (lazy re-render on open)
                    if (card.dataset.id !== _openCardId) {
                        card.classList.remove('open');
                        contentEl.innerHTML = '';
                    } else {
                        // Keep open card, but remove highlights
                        contentEl.innerHTML = fmtBody(topic.body);
                    }
                    card.classList.remove('search-match');
                    delete card.dataset.pulsed;
                }
            }
        }

        // Update result count
        if (resultCount) {
            if (searchTerm) {
                resultCount.textContent = visibleCount + (visibleCount === 1 ? ' resultado' : ' resultados');
                resultCount.classList.add('visible');
            } else {
                resultCount.classList.remove('visible');
            }
        }

        noResults.classList.toggle('visible', visibleCount === 0);

        // Scroll to first match
        if (firstMatch && searchTerm) {
            setTimeout(function() {
                firstMatch.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 80);
        }
    }

    function highlightText(html, term) {
        if (!term) return html;
        var escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        var regex = new RegExp('(?![^<]*>)(' + escaped + ')', 'gi');
        return html.replace(regex, '<mark class="search-hl">$1</mark>');
    }

    /* ─── SCROLL TO TOPIC (from URL ctx) ─── */
    function openAndScrollTo(topicId) {
        var card = topicsEl.querySelector('[data-id="' + topicId + '"]');
        if (!card) return;

        var topic = findTopicById(topicId);
        if (topic && activeCat !== 'todos' && topic.cat !== activeCat) {
            selectCategory('todos');
        }

        // Lazy render
        var contentEl = card.querySelector('.topic-content');
        if (!contentEl.innerHTML) {
            contentEl.innerHTML = fmtBody(topic.body);
        }

        card.classList.add('open');
        _openCardId = topicId;

        card.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Pulse
        setTimeout(function() {
            card.classList.add('search-match');
        }, 250);
    }

    /* ─── START ─── */
    document.addEventListener('DOMContentLoaded', init);
})();
