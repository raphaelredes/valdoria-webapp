/**
 * Codex / Compêndio de Valdoria
 * WebApp para visualizar entradas descobertas do jogo.
 */
(function () {
    'use strict';

    var _apiBase = '';
    var _token = '';
    var _entries = [];
    var _progress = {};
    var _currentCategory = 'enemy';
    var _searchTimeout = null;

    var CATEGORIES = [
        { id: 'enemy', label: 'Inimigos', icon: '⚔️' },
        { id: 'location', label: 'Locais', icon: '📍' },
        { id: 'item', label: 'Itens', icon: '🎒' },
        { id: 'class', label: 'Classes', icon: '🛡️' },
        { id: 'race', label: 'Raças', icon: '👤' },
    ];

    // ── Init ──────────────────────────────────────────────────────────

    function init() {
        try {
            // Parse URL params
            var params = new URLSearchParams(window.location.search);
            _token = params.get('token') || '';
            _apiBase = params.get('api') || '';

            if (!_apiBase || !_token) {
                // Try payload from hash
                var hash = window.location.hash.substring(1);
                if (hash) {
                    try {
                        var payload = JSON.parse(atob(hash));
                        _apiBase = payload.api || _apiBase;
                        _token = payload.token || _token;
                    } catch (e) { /* ignore */ }
                }
            }

            if (!_apiBase) {
                showError('Servidor não configurado');
                return;
            }

            _buildTabs();
            _bindEvents();

            // Restore last category from localStorage
            var saved = localStorage.getItem('codex_category');
            if (saved && CATEGORIES.find(function (c) { return c.id === saved; })) {
                _currentCategory = saved;
            }

            _fetchEntries(_currentCategory);
        } catch (e) {
            console.error('[CODEX]', e);
            showError('Erro ao inicializar', e);
        }
    }

    // ── UI builders ──────────────────────────────────────────────────

    function _buildTabs() {
        var tabsEl = document.getElementById('categoryTabs');
        if (!tabsEl) return;
        tabsEl.innerHTML = '';
        CATEGORIES.forEach(function (cat) {
            var btn = document.createElement('button');
            btn.className = 'v-tab' + (cat.id === _currentCategory ? ' active' : '');
            btn.textContent = cat.icon + ' ' + cat.label;
            btn.setAttribute('data-cat', cat.id);
            btn.addEventListener('click', function () {
                _currentCategory = cat.id;
                try{localStorage.setItem('codex_category', cat.id);}catch(e){}
                _updateTabActive();
                _fetchEntries(cat.id);
            });
            tabsEl.appendChild(btn);
        });
    }

    function _updateTabActive() {
        var tabs = document.querySelectorAll('.v-tab');
        tabs.forEach(function (tab) {
            tab.classList.toggle('active', tab.getAttribute('data-cat') === _currentCategory);
        });
    }

    function _renderEntries(entries) {
        var listEl = document.getElementById('entryList');
        if (!listEl) return;

        if (!entries || entries.length === 0) {
            listEl.innerHTML = '<div class="codex-empty">Nenhuma entrada encontrada nesta categoria.</div>';
            return;
        }

        listEl.innerHTML = '';
        entries.forEach(function (entry) {
            var card = document.createElement('div');
            card.className = 'codex-card ' + (entry.unlocked ? 'unlocked' : 'locked');

            card.innerHTML =
                '<span class="codex-card-icon">' + entry.icon + '</span>' +
                '<div class="codex-card-info">' +
                '  <div class="codex-card-title">' + entry.title + '</div>' +
                '  <div class="codex-card-desc">' + entry.short_desc + '</div>' +
                '</div>' +
                (entry.unlocked ? '<span class="codex-card-badge">✅</span>' : '<span class="codex-card-badge">🔒</span>');

            if (entry.unlocked) {
                card.addEventListener('click', function () {
                    _fetchDetail(entry.id);
                });
            }
            listEl.appendChild(card);
        });
    }

    function _renderProgress(progress) {
        if (!progress) return;

        var unlocked = progress.unlocked || 0;
        var total = progress.total || 0;
        var pct = progress.pct || 0;

        var fill = document.getElementById('progressFill');
        var text = document.getElementById('progressText');
        if (fill) fill.style.width = pct + '%';
        if (text) text.textContent = unlocked + '/' + total + ' (' + pct + '%)';
    }

    function _renderDetail(entry) {
        var overlay = document.getElementById('detailOverlay');
        var header = document.getElementById('detailHeader');
        var body = document.getElementById('detailBody');
        var meta = document.getElementById('detailMeta');

        if (!overlay || !header || !body || !meta) return;

        if (entry.locked) {
            header.innerHTML =
                '<span class="icon">❓</span>' +
                '<div class="title">Não Descoberto</div>' +
                '<div class="category">Continue explorando para desbloquear.</div>';
            body.innerHTML = '<p style="text-align:center;color:var(--v-text-dim)">Esta entrada ainda não foi descoberta.</p>';
            meta.innerHTML = '';
        } else {
            var catLabel = (CATEGORIES.find(function (c) { return c.id === entry.category; }) || {}).label || entry.category;
            header.innerHTML =
                '<span class="icon">' + entry.icon + '</span>' +
                '<div class="title">' + entry.title + '</div>' +
                '<div class="category">' + catLabel + '</div>';

            body.innerHTML = entry.long_desc || entry.short_desc || '';

            var metaRows = '';
            if (entry.discovered_via) {
                metaRows += '<div class="meta-row"><span>Descoberto via:</span><span>' + entry.discovered_via + '</span></div>';
            }
            if (entry.views !== undefined) {
                metaRows += '<div class="meta-row"><span>Visualizações:</span><span>' + entry.views + '</span></div>';
            }
            if (entry.difficulty) {
                var stars = '';
                for (var i = 0; i < Math.min(entry.difficulty, 5); i++) stars += '⭐';
                metaRows += '<div class="meta-row"><span>Dificuldade:</span><span>' + stars + '</span></div>';
            }
            meta.innerHTML = metaRows;
        }

        overlay.style.display = 'block';
    }

    // ── Events ───────────────────────────────────────────────────────

    function _bindEvents() {
        // Search
        var searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', function () {
                clearTimeout(_searchTimeout);
                _searchTimeout = setTimeout(function () {
                    _fetchEntries(_currentCategory, searchInput.value.trim());
                }, 300);
            });
        }

        // Detail close
        var detailClose = document.getElementById('detailClose');
        if (detailClose) {
            detailClose.addEventListener('click', function () {
                var overlay = document.getElementById('detailOverlay');
                if (overlay) overlay.style.display = 'none';
            });
        }

        // Back button
        var backBtn = document.getElementById('backBtn');
        if (backBtn) {
            backBtn.addEventListener('click', function () {
                window.__valdoria_transitioning = true;
                var gameUrl = _apiBase.replace('/api/codex', '').replace('/api/game', '');
                // Navigate back to game hub
                var baseUrl = gameUrl.replace(/\/+$/, '');
                // Try transition via sendData
                if (window.Telegram && Telegram.WebApp && Telegram.WebApp.sendData) {
                    Telegram.WebApp.sendData(JSON.stringify({ type: 'codex_close' }));
                } else {
                    // Direct navigation to game hub
                    window.__valdoria_transitioning = true;
                    window.location.replace(baseUrl + '/game/?token=' + _token);
                }
            });
        }
    }

    // ── API ───────────────────────────────────────────────────────────

    function _fetchEntries(category, search) {
        var url = _apiBase + '/list?token=' + encodeURIComponent(_token) +
            '&category=' + encodeURIComponent(category || '');
        if (search) url += '&search=' + encodeURIComponent(search);

        fetchT(url)
            .then(function (r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json();
            })
            .then(function (data) {
                _entries = data.entries || [];
                _progress = data.progress || {};
                _renderEntries(_entries);
                _renderProgress(_progress);
                _hideLoading();
            })
            .catch(function (err) {
                console.error('[CODEX] fetch list error:', err);
                showError('Erro ao carregar compêndio', err);
                _renderProgress({ unlocked: 0, total: 0, pct: 0 });
                _hideLoading();
            });
    }

    function _fetchDetail(entryId) {
        var url = _apiBase + '/entry/' + encodeURIComponent(entryId) +
            '?token=' + encodeURIComponent(_token);

        fetchT(url)
            .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
            .then(function (data) {
                if (data.entry) {
                    _renderDetail(data.entry);
                }
            })
            .catch(function (err) {
                console.error('[CODEX] fetch detail error:', err);
            });
    }

    // ── Helpers ───────────────────────────────────────────────────────

    function _hideLoading() {
        var app = document.getElementById('app');
        function doShow() {
            if (app) app.style.display = 'block';
        }
        if (window._codexLoadingCtrl) {
            window._codexLoadingCtrl.hide(doShow);
        } else {
            var overlay = document.getElementById('loadingOverlay');
            if (overlay) overlay.style.display = 'none';
            doShow();
        }
    }

    function showError(msg, err) {
        console.error('[CODEX]', msg, err || '');
        // Always show the app (with back button) even on error
        _hideLoading();
        if (typeof vToast === 'function') {
            vToast(msg, 'error');
        }
    }

    // ── Bootstrap ────────────────────────────────────────────────────
    window._loadStart = Date.now();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
