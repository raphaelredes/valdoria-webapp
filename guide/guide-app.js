/* ═══════════════════════════════════════════════════════════════
   GUIDE APP — Search + browse help topics
   ═══════════════════════════════════════════════════════════════ */
(function() {
    'use strict';

    /* ─── STATE ─── */
    let activeCat = 'todos';
    let searchTerm = '';

    /* ─── DOM refs ─── */
    const searchInput = document.getElementById('searchInput');
    const searchClear = document.getElementById('searchClear');
    const catFilters  = document.getElementById('catFilters');
    const topicsEl    = document.getElementById('topics');
    const noResults   = document.getElementById('noResults');
    const closeBtn    = document.getElementById('closeBtn');

    /* ─── INIT ─── */
    function init() {
        // Telegram Mini App setup
        if (window.Telegram && Telegram.WebApp) {
            Telegram.WebApp.ready();
            Telegram.WebApp.expand();
            try { Telegram.WebApp.headerColor = '#2a2420'; } catch(e) {}
            try { Telegram.WebApp.backgroundColor = '#2a2420'; } catch(e) {}
        }

        buildCategoryFilters();
        buildTopics();

        // Auto-open context from URL param
        var params = new URLSearchParams(window.location.search);
        var ctx = params.get('ctx');
        if (ctx) {
            var exact = GUIDE_TOPICS.find(function(t) { return t.id === ctx; });
            var prefix = !exact ? GUIDE_TOPICS.find(function(t) {
                return ctx.startsWith(t.id + '_') || ctx.startsWith(t.id);
            }) : null;
            var target = exact || prefix;
            if (target) {
                setTimeout(function() { openAndScrollTo(target.id); }, 250);
            }
        }

        // Events
        searchInput.addEventListener('input', onSearch);
        searchClear.addEventListener('click', clearSearch);
        closeBtn.addEventListener('click', function() {
            if (window.Telegram && Telegram.WebApp) {
                Telegram.WebApp.close();
            } else {
                window.history.back();
            }
        });
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
        filterTopics();
    }

    /* ─── BUILD TOPIC CARDS ─── */
    function buildTopics() {
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
            header.addEventListener('click', (function(c) {
                return function() { toggleCard(c); };
            })(card));

            var body = document.createElement('div');
            body.className = 'topic-body';

            var content = document.createElement('div');
            content.className = 'topic-content';
            content.innerHTML = fmtBody(topic.body);

            body.appendChild(content);
            card.appendChild(header);
            card.appendChild(body);
            topicsEl.appendChild(card);
        }
    }

    function fmtBody(text) {
        return text.replace(/\n/g, '<br>');
    }

    function toggleCard(card) {
        card.classList.toggle('open');
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
        filterTopics();
    }

    function filterTopics() {
        var visibleCount = 0;
        var cards = topicsEl.querySelectorAll('.topic-card');
        var firstMatch = null;

        for (var i = 0; i < cards.length; i++) {
            var card = cards[i];
            var id = card.dataset.id;
            var cat = card.dataset.cat;
            var topic = null;
            for (var j = 0; j < GUIDE_TOPICS.length; j++) {
                if (GUIDE_TOPICS[j].id === id) { topic = GUIDE_TOPICS[j]; break; }
            }
            if (!topic) continue;

            // Category filter
            var catMatch = activeCat === 'todos' || cat === activeCat;

            // Search filter
            var searchMatch = true;
            if (searchTerm) {
                var haystack = (topic.title + ' ' + stripHtml(topic.body)).toLowerCase();
                searchMatch = haystack.indexOf(searchTerm) !== -1;
            }

            var visible = catMatch && searchMatch;
            card.classList.toggle('hidden', !visible);

            if (visible) {
                visibleCount++;
                var contentEl = card.querySelector('.topic-content');

                if (searchTerm) {
                    contentEl.innerHTML = highlightText(fmtBody(topic.body), searchTerm);
                    // Also highlight title
                    var nameEl = card.querySelector('.topic-name');
                    nameEl.innerHTML = highlightText(topic.icon + ' ' + topic.title, searchTerm);

                    // Auto-open matching cards
                    if (!card.classList.contains('open')) {
                        card.classList.add('open');
                    }
                    // Pulse animation
                    card.classList.remove('search-match');
                    void card.offsetWidth; // reflow
                    card.classList.add('search-match');

                    if (!firstMatch) firstMatch = card;
                } else {
                    contentEl.innerHTML = fmtBody(topic.body);
                    // Restore title
                    var nameEl2 = card.querySelector('.topic-name');
                    nameEl2.innerHTML = topic.icon + ' ' + topic.title;
                    card.classList.remove('search-match');
                }
            }
        }

        noResults.classList.toggle('visible', visibleCount === 0);

        // Scroll to first match
        if (firstMatch && searchTerm) {
            setTimeout(function() {
                firstMatch.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
        }
    }

    function stripHtml(html) {
        return html.replace(/<[^>]*>/g, '');
    }

    function highlightText(html, term) {
        if (!term) return html;
        // Escape regex special chars
        var escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Don't highlight inside HTML tags
        var regex = new RegExp('(?![^<]*>)(' + escaped + ')', 'gi');
        return html.replace(regex, '<mark class="search-hl">$1</mark>');
    }

    /* ─── SCROLL TO TOPIC ─── */
    function openAndScrollTo(topicId) {
        var card = topicsEl.querySelector('[data-id="' + topicId + '"]');
        if (!card) return;

        // Ensure category shows
        var topic = null;
        for (var i = 0; i < GUIDE_TOPICS.length; i++) {
            if (GUIDE_TOPICS[i].id === topicId) { topic = GUIDE_TOPICS[i]; break; }
        }
        if (topic && activeCat !== 'todos' && topic.cat !== activeCat) {
            selectCategory('todos');
        }

        // Open card
        card.classList.add('open');

        // Scroll into view
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Pulse animation
        setTimeout(function() {
            card.classList.add('search-match');
        }, 300);
    }

    /* ─── START ─── */
    document.addEventListener('DOMContentLoaded', init);
})();
