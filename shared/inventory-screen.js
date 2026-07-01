/**
 * inventory-screen.js — Mochila canonical compartilhada (chassi headless).
 *
 * Padrão "headless component": este módulo fornece visual + interações
 * genéricas (tabs, filter, grid, search, sort, detail). Cada simulador
 * injeta seus dados (player, items) e callbacks (onItemUse, onItemEquip,
 * onSellJunk, onFuseGems, etc.). Lógica de domínio fica nos simuladores.
 *
 * MAPA_IA — navegação rápida (linhas aproximadas, ±20; atualizado 2026-07-01):
 *   ~60    CATEGORIES (match order vs displayOrder) + _displayCategories
 *   ~90    _state (open/config/overlay/activeCategory/activeTab/...)
 *   ~105   window.vInventory API (open/close/refresh/isOpen/setCategory)
 *   ~160   _normalizeConfig (defaults + inCombat flag)
 *   ~312   _slotCombatCost (D&D 5e PHB p.139/144/190)
 *   ~360   _findSlotAlternatives (ring1/ring2↔ring, amulet↔necklace)
 *   ~375   _buildOverlay (esqueleto HTML)
 *   ~440   _render (master) — aplica equip-mode class
 *   ~480   _renderHeader / _renderTabs (displayOrder) / _renderFilter
 *   ~586   _renderSearchBar / _renderActionBar (bulk)
 *   ~654   _renderGrid + _buildMeta (cells com badges)
 *   ~726   _renderLoadout + _showEmptySlotPicker
 *   ~882   _renderFooter (toggle Equipados ↔ Voltar à Mochila)
 *   ~981   _showDetail (modal com swap list quando equipped)
 *   ~1097  _renderSwapList + _wireSwapList (cost badges D&D 5e)
 *   ~1198  _buildDetailActions (Equipar por SLOT — fonte única alinhada à
 *          execução, 2026-07-01; Usar sem thrown fora de combate; Vender/
 *          Largar via cfg.protectedSellTags — paridade economy/protected_tags)
 *   ~1249  _filterItems / _matchesCategoryRaw / _primaryCategory
 *   ~1292  _countByCategory / _sortItems
 *   ~1332  _slotLabel / _tagLabel (PT-BR) / _resolveItemIcon (sprite-aware
 *          + variantes slug + fallback ic-it-base-*) / UI_ICONS / _uiIcon
 *   ~1566  _esc / _slugify (utils)
 *
 * Ícones de items: 2026-05-19 — SVG sprite REMOVIDO. PNGs OpenAI direto via
 * `<img src="/shared/img/items/{slug}.png">` (items-resolver.js + manifest).
 *
 * Regras CLAUDE.md aplicadas:
 *  - "Items Existentes — NUNCA recriar SVG novo (2026-05-14)"
 *  - "PT-BR obrigatório em todo texto visível"
 *  - "Valdoritas como moeda canonical"
 *  - "Smartphone-first (390×844 target)"
 */
(function () {
  'use strict';

  if (window.vInventory && window.vInventory.__loaded) return;

  /**
   * Custom scroll arrow pro vInventory (não usa shared/scroll-hint-arrow.js).
   *
   * Motivo: shared insere arrow como child do scrolling container — arrow rola
   * com o conteúdo. Aqui inserimos no PAINEL (position relative parent), absoluta
   * acima do footer. Listener no grid muda direção:
   *   - Topo/meio    → ▼ (anima bounce, não-clickable, indica "há mais abaixo")
   *   - Bottom       → ▲ (clickable, scroll-to-top suave — timeline pattern)
   *   - Sem overflow → oculta
   *
   * Regra do user 2026-05-14: "seta deve acompanhar o scrolling até não ter
   * como fazer mais, e quando chegar no final mostrar seta pra cima que sobe
   * toda a tela, assim como sites com timeline".
   */
  function _vinvAttachScrollArrow(scrollEl, panelEl) {
    if (!scrollEl || !panelEl || panelEl.__vinvScrollArrow) return;
    panelEl.__vinvScrollArrow = true;

    var arrow = document.createElement('div');
    arrow.className = 'vinv-scroll-arrow down hidden';
    arrow.setAttribute('role', 'button');
    arrow.setAttribute('aria-label', 'Rolar');
    arrow.innerHTML = '<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M8 12L2 6h12z" fill="currentColor"/></svg>';
    panelEl.appendChild(arrow);

    function update() {
      if (!scrollEl.isConnected) return;
      var atBottom = scrollEl.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight - 6;
      var hasScroll = scrollEl.scrollHeight > scrollEl.clientHeight + 4;
      if (!hasScroll) {
        arrow.classList.add('hidden');
        return;
      }
      arrow.classList.remove('hidden');
      if (atBottom) {
        arrow.classList.remove('down');
        arrow.classList.add('up');
        arrow.setAttribute('aria-label', 'Voltar ao topo');
      } else {
        arrow.classList.remove('up');
        arrow.classList.add('down');
        arrow.setAttribute('aria-label', 'Há mais itens abaixo — rolar');
      }
    }

    arrow.addEventListener('click', function () {
      if (arrow.classList.contains('up')) {
        scrollEl.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        // Down click: scroll down by a viewport
        scrollEl.scrollBy({ top: scrollEl.clientHeight * 0.8, behavior: 'smooth' });
      }
    });

    scrollEl.addEventListener('scroll', update, { passive: true });
    try {
      var ro = new ResizeObserver(update);
      ro.observe(scrollEl);
    } catch (_) { /* ok */ }

    // Updates iniciais
    setTimeout(update, 80);
    setTimeout(update, 400);
  }

  // ============================================================
  //  ICON RESOLVER — PNG (AI-generated) when manifest has it,
  //  fallback to SVG sprite. Requires items-resolver.js loaded (vItems).
  //
  //  FIX 2026-05-16 (a): this function was previously nested INSIDE
  //  _vinvAttachScrollArrow (block-scoped) — _renderGrid + _renderLoadout
  //  couldn't access it. Movido pra top-level do módulo.
  //
  //  FIX 2026-05-16 (b): SLUG MISMATCH — sprite IDs (HeraldicItems) STRIP
  //  connectives PT-BR ("de"/"do"/"da"). PNG manifest preserva. Ex:
  //    item name      = "Poção de Cura"
  //    sprite iconId  = "ic-it-pocao-cura"        (sem "de")
  //    PNG manifest   = "pocao-de-cura"           (com "de")
  //  Antigo fix: strip "ic-it-" → "pocao-cura" → MISS no manifest → fallback
  //  pro SVG sprite (drawing antigo). Resultado: 80%+ items renderizando
  //  os SVG velhos em vez dos PNGs novos (user reportou bug em DEV).
  //  Novo fix: tenta MÚLTIPLOS slug candidatos:
  //    1. slug do NOME (preserva connectives) — match com manifest
  //    2. slug strippado do sprite iconId (também strip "ic-it-base-")
  //    3. fallback SVG sprite com iconId original
  // ============================================================
  function _iconSrc(iconId, altText) {
    var candidates = [];

    // 1) Slug do item NAME (full — preserva "de"/"do"/"da" — bate com PNG manifest)
    if (altText) {
      var nameSlug = _slugify(altText);
      if (nameSlug) candidates.push(nameSlug);
      // 1b) 2026-06-12 (user): variante de encantamento ("Espada Longa +1") reusa
      //     a arte da BASE ("espada-longa") — não geramos arte quase idêntica por
      //     nível de +N. Strip " +N" do nome antes do slug.
      var baseName = String(altText).replace(/\s*\+\d+\s*$/, '').trim();
      if (baseName && baseName !== altText) {
        var baseSlug = _slugify(baseName);
        if (baseSlug && candidates.indexOf(baseSlug) < 0) candidates.push(baseSlug);
      }
    }

    // 2) Slug strippado do sprite iconId (Heraldic convention — sem connectives;
    //    também strip "ic-it-base-" pra cobrir fallbacks genéricos)
    if (iconId) {
      var spriteSlug = String(iconId).replace(/^ic-it-(base-)?/, '');
      if (spriteSlug && candidates.indexOf(spriteSlug) < 0) {
        candidates.push(spriteSlug);
      }
    }

    // 3) Tenta cada candidato contra o PNG manifest
    if (window.vItems && typeof window.vItems.iconHTML === 'function'
        && typeof window.vItems.has === 'function') {
      for (var i = 0; i < candidates.length; i++) {
        if (window.vItems.has(candidates[i])) {
          return window.vItems.iconHTML(candidates[i], altText || candidates[i]);
        }
      }
      // 3.5) Fallback por palavra-chave do NOME → ic-it-base-* → PNG (sessão #67).
      //      O sprite SVG foi removido (2026-05-19); itens sem PNG direto (ex:
      //      "Pergaminho de Bênção", "Pão Élfico") ficavam em branco. _fallbackIconByName
      //      mapeia o nome pro base mais próximo (scroll/bread/etc) e resolveSlug
      //      (BASE_TO_SLUG) o converte num slug real do manifest (pergaminho-antigo,
      //      racoes-de-7-dias, ...). Reusa PNG existente — nunca cria asset novo.
      var _nameBase = _fallbackIconByName(altText);  // 'ic-it-base-scroll' | ''
      if (_nameBase && typeof window.vItems.resolveSlug === 'function') {
        var _baseSlug = _nameBase.replace(/^ic-it-/, '');         // 'base-scroll'
        var _pngSlug = window.vItems.resolveSlug(_baseSlug);      // 'pergaminho-antigo'
        if (_pngSlug && window.vItems.has(_pngSlug)) {
          return window.vItems.iconHTML(_pngSlug, altText || _pngSlug);
        }
      }
    }

    // 4) Final fallback: SVG sprite com iconId original
    return '<svg viewBox="0 0 120 120"><use href="#' + iconId + '"/></svg>';
  }

  // ============================================================
  //  CATEGORIAS CANÔNICAS (4 tabs sem "Todos")
  //  Quando nenhuma ativa → mostra tudo (filtro é filtro, não tab).
  //
  //  ORDEM DO ARRAY = match priority (first match wins).
  //  Pra garantir que items com `tags: ['tool', 'quest']` (mapa)
  //  fiquem em Tesouros e não em Consumíveis, treasures vem ANTES.
  //
  //  `displayOrder` controla ordem das tabs visualmente —
  //  mantém UX Armas/Armaduras/Consumíveis/Tesouros que o user aprovou.
  // ============================================================
  // Sessao #37 v13 (2026-05-25): labels abreviadas pra caber em modo Maior.
  // Antes: 'Armaduras', 'Consumíveis' truncavam pra 'Arma...', 'Consu...'.
  // Agora: 'Defesa', 'Poções' (semantica preservada, mais curto).
  var CATEGORIES = [
    { id: 'weapons',     label: 'Armas',    displayOrder: 1, match: ['weapon', 'simple_weapon', 'martial_weapon'] },
    { id: 'armor',       label: 'Defesa',   displayOrder: 2, match: ['armor', 'shield', 'light_armor', 'medium_armor', 'heavy_armor', 'clothing'] },
    { id: 'treasures',   label: 'Tesouros', displayOrder: 4, match: ['valuable', 'gem', 'accessory', 'magic', 'paper', 'key', 'map', 'quest'] },
    { id: 'consumables', label: 'Poções',   displayOrder: 3, match: ['consumable', 'potion', 'food', 'forage', 'survival', 'tool'] },
  ];

  /** Retorna ARRAY na ordem visual (Armas, Armaduras, Consumíveis, Tesouros) */
  function _displayCategories() {
    return CATEGORIES.slice().sort(function (a, b) { return a.displayOrder - b.displayOrder; });
  }

  // ============================================================
  //  STATE
  // ============================================================
  var _state = {
    open: false,
    config: null,
    overlay: null,
    activeCategory: null,   // null = mostra tudo
    activeTab: 'items',     // 'items' | 'equip' | 'allies'
    search: '',
    searchOpen: false,
    sort: 'default',        // 'default' | 'name' | 'rarity' | 'value'
    selectedItem: null,
  };

  // ============================================================
  //  PUBLIC API
  // ============================================================
  window.vInventory = {
    __loaded: true,

    /**
     * Abre a mochila com a config fornecida.
     * @param {object} config — ver README de schema (player, callbacks, etc.)
     */
    open: function (config) {
      _state.config = _normalizeConfig(config);
      _state.activeCategory = config.defaultCategory || null;
      _state.activeTab = config.defaultTab || 'items';
      _state.search = '';
      _state.searchOpen = false;
      _state.sort = config.defaultSort || 'default';
      _state.selectedItem = null;

      if (!_state.overlay) _state.overlay = _buildOverlay();
      // Fix 2026-05-14: reset detail state ao abrir mochila — evita modal
      // persistir entre open() consecutivos (bug detectado em E2E test).
      var detailEl = _state.overlay.querySelector('[data-region="detail"]');
      if (detailEl) detailEl.classList.remove('active');
      _render();
      _state.overlay.classList.add('active');
      _state.open = true;

    },

    close: function () {
      if (!_state.open) return;
      _state.open = false;
      if (_state.overlay) {
        _state.overlay.classList.remove('active');
        // Fix 2026-05-14: fecha detail junto pra evitar persistência
        var detailEl = _state.overlay.querySelector('[data-region="detail"]');
        if (detailEl) detailEl.classList.remove('active');
      }
      var cfg = _state.config;
      if (cfg && typeof cfg.onClose === 'function') {
        try { cfg.onClose(); } catch (e) { console.error('[vInventory] onClose:', e); }
      }
    },

    refresh: function (newPlayer) {
      if (!_state.open) return;
      if (newPlayer && _state.config) _state.config.player = newPlayer;
      _render();
    },

    isOpen: function () { return _state.open; },

    /** Setter manual de categoria (útil pra deep-link a um filtro) */
    setCategory: function (cat) {
      _state.activeCategory = cat;
      _state.search = '';
      _state.activeTab = 'items';  // sai de equip-mode se estiver
      if (_state.open) _render();
    },
  };

  // ============================================================
  //  CONFIG NORMALIZATION (defaults + sanitização)
  // ============================================================
  function _normalizeConfig(cfg) {
    cfg = cfg || {};
    cfg.player = cfg.player || { gold: 0, items: [] };
    cfg.player.items = cfg.player.items || [];
    cfg.tabs = cfg.tabs || ['items'];
    cfg.showSearch = (cfg.showSearch !== false);
    cfg.showSort = (cfg.showSort !== false);
    cfg.showBulkActions = cfg.showBulkActions || {};
    cfg.title = cfg.title || 'MOCHILA';
    cfg.inCombat = !!cfg.inCombat;  // 2026-05-14: D&D 5e combat rules
    cfg.primaryAction = cfg.primaryAction || { label: 'Equipados', onClick: null };
    cfg.secondaryAction = cfg.secondaryAction || { label: 'Voltar', icon: 'back' };
    return cfg;
  }

  // ============================================================
  //  D&D 5e — CUSTO DE TROCA DE EQUIPAMENTO EM COMBATE
  //  Fontes: PHB p.139 (Other Activity), p.144 (Armor),
  //          p.190 (Object Interaction)
  // ============================================================
  function _slotCombatCost(slot) {
    switch (slot) {
      case 'main_hand':
        return {
          kind: 'free',
          label: 'Grátis',
          tip: 'Free Object Interaction (PHB p.190) — 1 sacar/guardar grátis por turno'
        };
      case 'off_hand':
        return {
          kind: 'action',
          label: '1 Ação',
          tip: 'Sacar arma secundária ou equipar escudo consome a Ação (PHB p.144, p.190)'
        };
      case 'cloak':
      case 'amulet':
      case 'ring':
      case 'ring1':
      case 'ring2':
        return {
          kind: 'action',
          label: '1 Ação',
          tip: 'Trocar acessório requer Use an Object (PHB p.190)'
        };
      case 'head':
        return {
          kind: 'blocked',
          label: 'Impossível',
          tip: 'Vestir elmo: 1 minuto (PHB p.144 — Donning and Doffing). Impraticável em combate.'
        };
      case 'chest':
        return {
          kind: 'blocked',
          label: 'Impossível',
          tip: 'Vestir armadura: 5–10 minutos (PHB p.144). Impossível em combate.'
        };
      case 'feet':
        return {
          kind: 'blocked',
          label: 'Impossível',
          tip: 'Trocar botas: 1 minuto (PHB p.144 — equivalente armadura leve).'
        };
      default:
        return { kind: 'action', label: '1 Ação', tip: 'Use an Object — consome a Ação (PHB p.190)' };
    }
  }

  /** Acha alternativas pro mesmo slot (não-equipadas) */
  function _findSlotAlternatives(slot, items) {
    if (!slot) return [];
    return (items || []).filter(function (it) {
      if (it.equipped) return false;
      if (it.qty != null && it.qty <= 0) return false;
      var itSlot = it.slot;
      // ring1/ring2 → ambos slots ring
      if ((slot === 'ring1' || slot === 'ring2') && itSlot === 'ring') return true;
      // amulet↔necklace: dados usam 'necklace', paper-doll usa 'amulet' —
      // aceita ambos independente do pre-mapping do caller (2026-07-01).
      if ((slot === 'amulet' || slot === 'necklace')
        && (itSlot === 'amulet' || itSlot === 'necklace')) return true;
      return itSlot === slot;
    });
  }

  // ============================================================
  //  OVERLAY BUILDER (esqueleto)
  // ============================================================
  function _buildOverlay() {
    var ov = document.createElement('div');
    ov.className = 'vinv-overlay';
    ov.setAttribute('data-vinv-root', '1');
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('aria-label', 'Mochila');
    ov.innerHTML = ''
      + '<div class="vinv-panel" role="document">'
      +   '<div class="vinv-header" data-region="header"></div>'
      +   '<div class="vinv-tabs" data-region="tabs" role="tablist" aria-label="Categorias"></div>'
      +   '<div class="vinv-filter" data-region="filter"></div>'
      +   '<div class="vinv-search-bar" data-region="search" role="search"></div>'
      +   '<div class="vinv-action-bar" data-region="actions" style="display:none"></div>'
      +   '<div class="vinv-grid" data-region="grid" role="list" aria-label="Itens"></div>'
      +   '<div class="vinv-footer" data-region="footer"></div>'
      +   '<div class="vinv-detail-overlay" data-region="detail" role="dialog" aria-modal="true" aria-label="Detalhe do item">'
      +     '<div class="vinv-detail-card" data-region="detail-card"></div>'
      +   '</div>'
      + '</div>';
    // 2026-05-17: mount inside simulator frame container (#frame em exploracao,
    // #app em combate/cidade) ao invés de body. Isso garante que a mochila fica
    // CONFINADA ao frame visual do simulador, não centralizada no viewport do
    // browser (issue: monitor wide, mochila aparecia fora do "celular virtual").
    // Quando rodando como WebApp (sem #frame nem #app), fallback pra body.
    var _vinvHost = document.getElementById('frame')
                 || document.getElementById('app')
                 || document.body;
    _vinvHost.appendChild(ov);
    // Marca o host pra CSS aplicar position:absolute quando overlay é child de #frame/#app
    if (_vinvHost !== document.body) {
      _vinvHost.classList.add('vinv-host');
      ov.classList.add('vinv-overlay--contained');
    }

    // Click no overlay externo → fecha
    ov.addEventListener('click', function (e) {
      if (e.target === ov) window.vInventory.close();
    });
    // ESC fecha (a11y + keyboard navigation)
    document.addEventListener('keydown', _onKeyDown);

    return ov;
  }

  function _onKeyDown(e) {
    if (!_state.open) return;
    if (e.key === 'Escape' || e.keyCode === 27) {
      // Se detail aberto, fecha detail primeiro
      var detail = _state.overlay && _state.overlay.querySelector('[data-region="detail"]');
      if (detail && detail.classList.contains('active')) {
        _hideDetail();
      } else {
        window.vInventory.close();
      }
      e.preventDefault();
    }
  }

  // ============================================================
  //  RENDER (master)
  // ============================================================
  function _render() {
    var cfg = _state.config;
    var root = _state.overlay;
    if (!root) return;

    // Estado "hide-filters" — esconde tabs/filter/search/action quando
    // activeTab !== 'items' (equip ou allies). `equip-mode` mantido
    // pra back compat com CSS customizado de simuladores.
    var panel = root.querySelector('.vinv-panel');
    if (panel) {
      panel.classList.toggle('hide-filters', _state.activeTab !== 'items');
      panel.classList.toggle('equip-mode', _state.activeTab === 'equip');
      panel.classList.toggle('allies-mode', _state.activeTab === 'allies');
    }

    _renderHeader(root.querySelector('[data-region="header"]'), cfg);
    _renderTabs(root.querySelector('[data-region="tabs"]'), cfg);
    _renderFilter(root.querySelector('[data-region="filter"]'), cfg);
    _renderSearchBar(root.querySelector('[data-region="search"]'), cfg);
    _renderActionBar(root.querySelector('[data-region="actions"]'), cfg);

    // Body changes by tab
    var gridEl = root.querySelector('[data-region="grid"]');
    if (_state.activeTab === 'equip') {
      _renderLoadout(gridEl, cfg);
    } else if (_state.activeTab === 'allies') {
      _renderAllies(gridEl, cfg);
    } else {
      // Restaura className padrão (loadout/allies podem ter sobrescrito)
      gridEl.className = 'vinv-grid';
      _renderGrid(gridEl, cfg);
    }

    _renderFooter(root.querySelector('[data-region="footer"]'), cfg);

    // Attach scroll arrow no painel uma vez (idempotente — flag interna).
    // Listener é re-disparado pelo próprio scroll do gridEl.
    var panelEl = root.querySelector('.vinv-panel');
    _vinvAttachScrollArrow(gridEl, panelEl);
  }

  // ============================================================
  //  RENDER — HEADER
  // ============================================================
  function _renderHeader(el, cfg) {
    var gold = (cfg.player.gold || 0).toLocaleString('pt-BR');
    el.innerHTML = ''
      + '<div class="vinv-header-title">'
      +   '<span>' + _esc(cfg.title) + '</span>'
      + '</div>'
      + '<div class="vinv-wallet">'
      +   '<span class="vinv-coin">V</span><span>' + gold + '</span>'
      + '</div>';
  }

  // ============================================================
  //  RENDER — TABS (4 categorias, nenhuma ativa = mostra tudo)
  // ============================================================
  function _renderTabs(el, cfg) {
    var counts = _countByCategory(cfg.player.items);
    var html = '';
    // Itera em displayOrder (Armas, Armaduras, Consumíveis, Tesouros)
    // — match order do array é diferente (precedência).
    _displayCategories().forEach(function (cat) {
      var n = counts[cat.id] || 0;
      var isActive = (_state.activeCategory === cat.id);
      var active = isActive ? ' active' : '';
      html += '<button class="vinv-tab' + active + '" data-cat="' + cat.id + '"'
        +   ' role="tab" aria-selected="' + isActive + '"'
        +   ' aria-label="' + _esc(cat.label) + ' — ' + n + ' itens">'
        +   '<span class="vinv-tab-label">' + _esc(cat.label) + '</span>'
        +   '<span class="vinv-tcount" aria-hidden="true">' + n + '</span>'
        + '</button>';
    });
    el.innerHTML = html;

    // Eventos
    el.querySelectorAll('.vinv-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var cat = btn.dataset.cat;
        // Toggle: clicar na ativa volta pra "nenhuma" (mostra tudo)
        if (_state.activeCategory === cat) _state.activeCategory = null;
        else _state.activeCategory = cat;
        // Defensivo: sair de equip-mode ao filtrar por categoria
        _state.activeTab = 'items';
        _render();
      });
    });
  }

  // ============================================================
  //  RENDER — FILTER BAR (sort + search trigger + contador)
  // ============================================================
  function _renderFilter(el, cfg) {
    var filtered = _filterItems(cfg.player.items);
    var totalQty = filtered.reduce(function (s, it) { return s + (it.qty || 1); }, 0);
    var contextLabel = _state.activeCategory
      ? _categoryLabel(_state.activeCategory) + ' · ' + filtered.length + ' itens'
      : totalQty + ' itens';

    var sortLabel = {
      default: 'Recentes',
      name: 'A-Z',
      rarity: 'Raridade',
      value: 'Valor',
    }[_state.sort] || 'Recentes';

    el.innerHTML = ''
      + '<div class="vinv-filter-left">'
      +   (cfg.showSort
        ? '<button class="vinv-sort" data-action="sort">'
          + _uiIcon('sort', 12) + '<span>' + sortLabel + '</span>'
          + '</button>'
          + '<span style="color:var(--vinv-text-muted)">·</span>'
        : '')
      +   '<span>' + _esc(contextLabel) + '</span>'
      + '</div>'
      + (cfg.showSearch
        ? '<button class="vinv-search-toggle" data-action="search">'
          + _uiIcon('search', 12) + '<span>' + (_state.searchOpen ? 'Fechar' : 'Buscar') + '</span>'
          + '</button>'
        : '');

    var sortBtn = el.querySelector('[data-action="sort"]');
    if (sortBtn) sortBtn.addEventListener('click', function () {
      var cycle = ['default', 'name', 'rarity', 'value'];
      var idx = cycle.indexOf(_state.sort);
      _state.sort = cycle[(idx + 1) % cycle.length];
      _render();
    });

    var searchBtn = el.querySelector('[data-action="search"]');
    if (searchBtn) searchBtn.addEventListener('click', function () {
      _state.searchOpen = !_state.searchOpen;
      _render();
      if (_state.searchOpen) {
        var input = _state.overlay.querySelector('.vinv-search-input input');
        if (input) input.focus();
      }
    });
  }

  // ============================================================
  //  RENDER — SEARCH BAR
  // ============================================================
  function _renderSearchBar(el, cfg) {
    if (!cfg.showSearch || !_state.searchOpen) {
      el.classList.remove('active');
      el.innerHTML = '';
      return;
    }
    el.classList.add('active');
    el.innerHTML = ''
      + '<div class="vinv-search-input">'
      +   _uiIcon('search', 13)
      +   '<input type="text" placeholder="Buscar item, raridade, tag..." value="' + _esc(_state.search) + '"/>'
      + '</div>';
    var input = el.querySelector('input');
    input.addEventListener('input', function (e) {
      _state.search = e.target.value;
      _renderGrid(_state.overlay.querySelector('[data-region="grid"]'), cfg);
      _renderFilter(_state.overlay.querySelector('[data-region="filter"]'), cfg);
    });
  }

  // ============================================================
  //  RENDER — ACTION BAR (bulk actions opcional)
  // ============================================================
  function _renderActionBar(el, cfg) {
    var actions = [];
    var bulk = cfg.showBulkActions || {};

    if (bulk.junk && typeof cfg.onSellJunk === 'function') {
      var junkInfo = (typeof cfg.computeJunk === 'function') ? cfg.computeJunk() : null;
      if (junkInfo && junkInfo.count > 0) {
        actions.push({
          label: 'Vender Lixo (' + junkInfo.count + ') · ' + junkInfo.gold + ' V',
          handler: cfg.onSellJunk,
        });
      }
    }
    if (bulk.fusion && typeof cfg.onFuseGems === 'function') {
      var fusionInfo = (typeof cfg.computeFusions === 'function') ? cfg.computeFusions() : null;
      if (fusionInfo && fusionInfo.length > 0) {
        actions.push({
          label: 'Fundir Gemas (' + fusionInfo.length + ')',
          handler: cfg.onFuseGems,
        });
      }
    }

    if (actions.length === 0) {
      el.style.display = 'none';
      el.innerHTML = '';
      return;
    }
    el.style.display = 'flex';
    el.innerHTML = actions.map(function (a, i) {
      return '<button class="vinv-action-btn" data-idx="' + i + '">' + _esc(a.label) + '</button>';
    }).join('');
    el.querySelectorAll('.vinv-action-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var a = actions[parseInt(btn.dataset.idx, 10)];
        if (a && typeof a.handler === 'function') {
          try { a.handler(); } catch (e) { console.error('[vInventory] bulk action:', e); }
        }
      });
    });
  }

  // ============================================================
  //  RENDER — GRID (item cells)
  // ============================================================
  function _renderGrid(el, cfg) {
    var items = _filterItems(cfg.player.items);
    items = _sortItems(items);

    if (items.length === 0) {
      el.innerHTML = '<div class="vinv-empty">— Nenhum item' + (_state.search ? ' encontrado' : ' nesta categoria') + ' —</div>';
      return;
    }

    var html = '';
    items.forEach(function (it) {
      var rarity = it.rarity || 'common';
      var equipped = !!it.equipped;
      var fav = !!it.favorite;
      var iconId = _resolveItemIcon(it);
      var qtyBadge = (it.qty && it.qty > 1)
        ? '<span class="vinv-badge stack">×' + it.qty + '</span>'
        : '';
      var equipBadge = equipped
        ? '<span class="vinv-badge equip">' + _uiIcon('check', 11) + '</span>'
        : '';
      var questBadge = (rarity === 'quest')
        ? '<span class="vinv-badge quest">' + _uiIcon('locked', 9) + '</span>'
        : '';
      var favBadge = fav ? '<span class="vinv-badge fav">★</span>' : '';

      var metaHtml = _buildMeta(it);

      var ariaLabel = it.name + (it.qty > 1 ? ' (×' + it.qty + ')' : '')
        + (equipped ? ' — equipado' : '')
        + (rarity !== 'common' ? ' — ' + rarity : '');
      html += '<div class="vinv-cell r-' + rarity + (equipped ? ' equipped' : '') + '"'
        +   ' data-iid="' + _esc(it.id || it.name) + '"'
        +   ' role="listitem" tabindex="0"'
        +   ' aria-label="' + _esc(ariaLabel) + '">'
        +   qtyBadge
        +   (equipBadge || questBadge)
        +   favBadge
        +   '<div class="vinv-icon" aria-hidden="true">' + _iconSrc(iconId, it.name) + '</div>'
        +   '<div class="vinv-name">' + _esc(it.name) + '</div>'
        +   (metaHtml ? '<div class="vinv-meta">' + metaHtml + '</div>' : '')
        + '</div>';
    });
    el.innerHTML = html;

    el.querySelectorAll('.vinv-cell').forEach(function (cell) {
      cell.addEventListener('click', function () {
        var iid = cell.dataset.iid;
        var it = _findItem(iid, cfg.player.items);
        if (it) _showDetail(it);
        if (typeof cfg.onItemClick === 'function') {
          try { cfg.onItemClick(it); } catch (e) { console.error('[vInventory] onItemClick:', e); }
        }
      });
    });
  }

  function _buildMeta(it) {
    var parts = [];
    if (it.meta) return _esc(it.meta);
    if (it.dmg_die) parts.push('<span class="vinv-die">' + _esc(it.dmg_die) + '</span>');
    if (it.ac_bonus) parts.push('<span class="vinv-ac">+' + it.ac_bonus + ' CA</span>');
    if (it.bonus) parts.push('+' + it.bonus + ' ATQ');
    if (it.value && !parts.length) parts.push('<span class="vinv-coin mini">V</span>' + it.value);
    if (it.rarity === 'quest' && !parts.length) parts.push('<span style="color:var(--vinv-r-quest)">Missão</span>');
    return parts.join(' ');
  }

  // ============================================================
  //  RENDER — LOADOUT (tab 'equip' opcional)
  //  Slots filled são CLICÁVEIS — abre detail com swap options.
  // ============================================================
  function _renderLoadout(el, cfg) {
    el.className = 'vinv-loadout';
    var loadout = cfg.player.loadout || {};
    /* 2026-06-12 (user): botão AUTO-EQUIPAR no topo da aba Equipados. O caller
       (cidade) implementa a inteligência D&D (proficiências por classe,
       Unarmored Defense, finesse, foco de conjurador) em cfg.onAutoEquip e faz
       o refresh com o player atualizado. Só aparece quando o callback existe. */
    var autoHtml = '';
    if (typeof cfg.onAutoEquip === 'function') {
      autoHtml = '<button type="button" class="vinv-btn primary vinv-autoequip" '
        + 'data-action="auto-equip" style="width:100%;margin:0 0 8px;">'
        + '⚔ Auto-Equipar (melhor conjunto)</button>';
    }
    // 2026-06-12 (user): paper-doll medieval com TODOS os slots vestíveis do
    // ITEMS_DB, centralizado como uma silhueta — Cabeça no topo-CENTRO e Botas no
    // rodapé-CENTRO (coluna do meio, junto de amuleto/peito/cinto); acessórios e
    // armas nas laterais. Os `spacer` ocupam as células laterais da 1ª linha pra
    // manter a Cabeça centrada. Grid 3-col (.vinv-loadout-avatar).
    //   [   ] Cabeça [   ]
    //   Ombros Amuleto Capa
    //   MãoEsq Peito  MãoDir
    //   Mãos   Cinto  Pernas
    //   AnelI  Botas  AnelII
    var slotDef = [
      { spacer: true }, { key: 'head', label: 'Cabeça' }, { spacer: true },
      { key: 'shoulders', label: 'Ombros' },
      { key: 'amulet',    label: 'Amuleto' },
      { key: 'cloak',     label: 'Capa' },
      { key: 'off_hand',  label: 'Mão Esq.' },
      { key: 'chest',     label: 'Peito' },
      { key: 'main_hand', label: 'Mão Dir.' },
      { key: 'hands',     label: 'Mãos' },
      { key: 'belt',      label: 'Cinto' },
      { key: 'legs',      label: 'Pernas' },
      { key: 'ring1',     label: 'Anel I' },
      { key: 'feet',      label: 'Botas' },
      { key: 'ring2',     label: 'Anel II' },
    ];
    var html = autoHtml + '<div class="vinv-loadout-avatar">';
    slotDef.forEach(function (s) {
      // célula invisível (mantém Cabeça/Botas centradas na coluna do meio)
      if (s.spacer) { html += '<div class="vinv-slot-spacer" aria-hidden="true"></div>'; return; }
      var it = loadout[s.key];
      if (it) {
        var iconId = _resolveItemIcon(it);
        var rarity = it.rarity || 'common';
        html += '<div class="vinv-slot filled r-' + rarity + '" data-slot="' + s.key + '">'
          +   '<div class="vinv-slot-icon">' + _iconSrc(iconId, (it && it.name) || iconId) + '</div>'
          +   '<div class="vinv-slot-label">' + _esc(s.label) + '</div>'
          + '</div>';
      } else {
        html += '<div class="vinv-slot empty" data-slot="' + s.key + '">'
          +   '<div class="vinv-slot-empty-glyph">+</div>'
          +   '<div class="vinv-slot-label">' + _esc(s.label) + '</div>'
          + '</div>';
      }
    });
    html += '</div>';

    // Stats consolidados
    var stats = cfg.player.stats || {};
    if (stats.ca || stats.dano || stats.atq || stats.pv || stats.pm || stats.peso) {
      html += '<div class="vinv-loadout-stats">'
        +   '<div class="vinv-loadout-stats-title">Atributos do Equipamento</div>'
        +   '<div class="vinv-loadout-stats-grid">';
      if (stats.ca) html += _statRow('CA', stats.ca);
      if (stats.dano) html += _statRow('DANO', stats.dano);
      if (stats.atq) html += _statRow('ATQ', stats.atq);
      if (stats.pv) html += _statRow('PV', stats.pv);
      if (stats.pm) html += _statRow('PM', stats.pm);
      if (stats.peso) html += _statRow('PESO', stats.peso);
      html += '</div></div>';
    }

    el.innerHTML = html;

    // Slots clicáveis — abre detail do item com swap context
    el.querySelectorAll('.vinv-slot.filled').forEach(function (slotEl) {
      slotEl.addEventListener('click', function () {
        var key = slotEl.dataset.slot;
        var it = loadout[key];
        if (it) _showDetail(it, { fromLoadout: true, slotKey: key });
      });
    });
    el.querySelectorAll('.vinv-slot.empty').forEach(function (slotEl) {
      slotEl.addEventListener('click', function () {
        var key = slotEl.dataset.slot;
        _showEmptySlotPicker(key, cfg);
      });
    });
    var autoBtn = el.querySelector('[data-action="auto-equip"]');
    if (autoBtn) {
      autoBtn.addEventListener('click', function () {
        try { cfg.onAutoEquip(); }
        catch (e) { console.error('[vInventory] onAutoEquip:', e); }
      });
    }
  }

  /** Abre seletor pra slot vazio (lista de items compatíveis) */
  function _showEmptySlotPicker(slotKey, cfg) {
    var alternatives = _findSlotAlternatives(slotKey, cfg.player.items);
    /* 2026-06-12 (user): o popup SEMPRE abre ao tocar num slot vazio — lista os
       equipamentos possíveis pro slot; sem compatíveis, estado vazio honesto.
       Antes o `return` silencioso fazia o toque parecer quebrado. */
    // Reusa detail card pra render a lista
    var card = _state.overlay.querySelector('[data-region="detail-card"]');
    var ov = _state.overlay.querySelector('[data-region="detail"]');
    if (!card || !ov) return;

    var cost = cfg.inCombat ? _slotCombatCost(slotKey) : null;
    var listHtml = (alternatives.length === 0)
      ? '<div class="vinv-empty" style="padding:18px 10px;text-align:center;">'
        + 'Nenhum item compatível com este slot na mochila.</div>'
      : _renderSwapList(null, slotKey, alternatives, cost, cfg);
    card.innerHTML = ''
      + '<div class="vinv-detail-close" data-action="close-detail">' + _uiIcon('close', 13) + '</div>'
      + '<div class="vinv-detail-header">'
      +   '<div class="vinv-detail-portrait" style="background:transparent">'
      +     '<div style="font-size:48px;color:var(--vinv-gold);opacity:0.7">+</div>'
      +   '</div>'
      +   '<div class="vinv-detail-name">Slot Vazio: ' + _esc(_slotLabel(slotKey)) + '</div>'
      +   '<div class="vinv-detail-rarity common">SEM ITEM EQUIPADO</div>'
      + '</div>'
      + listHtml;

    ov.classList.add('active');
    card.querySelector('[data-action="close-detail"]').addEventListener('click', _hideDetail);
    if (alternatives.length > 0) _wireSwapList(card, null, slotKey, cfg);
  }

  function _statRow(label, val) {
    return '<div class="vinv-lstat"><span class="vinv-l">' + _esc(label) + '</span>'
      + '<span class="vinv-v">' + _esc(String(val)) + '</span></div>';
  }

  // ============================================================
  //  RENDER — ALLIES (delegate ao simulador via callbacks)
  //  cfg.renderAlliesTab() retorna HTML; onAlliesRendered(el) wire events.
  // ============================================================
  function _renderAllies(el, cfg) {
    el.className = 'vinv-grid';
    if (typeof cfg.renderAlliesTab === 'function') {
      el.innerHTML = cfg.renderAlliesTab();
      if (typeof cfg.onAlliesRendered === 'function') {
        try { cfg.onAlliesRendered(el); }
        catch (e) { console.error('[vInventory] onAlliesRendered:', e); }
      }
    } else {
      el.innerHTML = '<div class="vinv-empty">Aliados em breve...</div>';
    }
  }

  // ============================================================
  //  RENDER — FOOTER (encumbrance + nav)
  // ============================================================
  function _renderFooter(el, cfg) {
    var enc = cfg.encumbrance;
    var encHtml = '';
    if (enc) {
      // Aceita number ou string PT-BR ("8,2") — converte pra calcular pct
      var currentNum = (typeof enc.current === 'number')
        ? enc.current
        : parseFloat(String(enc.current).replace(',', '.'));
      var maxNum = (typeof enc.max === 'number')
        ? enc.max
        : parseFloat(String(enc.max).replace(',', '.'));
      var pct = 0;
      if (isFinite(currentNum) && isFinite(maxNum) && maxNum > 0) {
        pct = Math.max(0, Math.min(100, Math.round((currentNum / maxNum) * 100)));
      }
      var fillCls = pct >= 100 ? ' over' : (pct >= 75 ? ' warn' : '');
      // Display preserva formato original (string ou number)
      var displayCurrent = (typeof enc.current === 'number')
        ? enc.current.toLocaleString('pt-BR')
        : enc.current;
      encHtml = '<div class="vinv-encumbrance">'
        +   '<div class="vinv-enc-row">'
        +     '<span>Carga</span>'
        +     '<span class="vinv-val">' + _esc(String(displayCurrent)) + ' / ' + _esc(String(enc.max)) + ' ' + _esc(enc.unit || 'kg') + '</span>'
        +   '</div>'
        +   '<div class="vinv-enc-bar"><div class="vinv-enc-fill' + fillCls + '" style="width:' + pct + '%"></div></div>'
        + '</div>';
    }

    var secAct = cfg.secondaryAction || {};
    var primAct = cfg.primaryAction || {};

    // Toggle cíclico do botão primário do footer.
    // Tabs habilitadas: items → equip → allies → items (loop).
    // Label muda conforme estado atual.
    var tabs = cfg.tabs || ['items'];
    var hasEquip = tabs.indexOf('equip') !== -1;
    var hasAllies = tabs.indexOf('allies') !== -1;
    var cur = _state.activeTab;
    var primLabel, primDefault;
    if (cur === 'items') {
      if (hasEquip) {
        primLabel = primAct.label || 'Equipados';
        primDefault = function () { _state.activeTab = 'equip'; _render(); };
      } else if (hasAllies) {
        primLabel = primAct.label || 'Aliados';
        primDefault = function () { _state.activeTab = 'allies'; _render(); };
      } else {
        primLabel = primAct.label || 'Equipados';
        primDefault = null;
      }
    } else if (cur === 'equip') {
      if (hasAllies) {
        primLabel = 'Aliados';
        primDefault = function () { _state.activeTab = 'allies'; _render(); };
      } else {
        primLabel = 'Voltar à Mochila';
        primDefault = function () { _state.activeTab = 'items'; _render(); };
      }
    } else if (cur === 'allies') {
      primLabel = 'Voltar à Mochila';
      primDefault = function () { _state.activeTab = 'items'; _render(); };
    } else {
      primLabel = primAct.label || 'Equipados';
      primDefault = null;
    }

    el.innerHTML = encHtml
      + '<div class="vinv-nav">'
      +   '<button class="vinv-btn" data-action="secondary">'
      +     (secAct.icon ? _uiIcon(secAct.icon, 13) : '')
      +     _esc(secAct.label || 'Voltar')
      +   '</button>'
      +   '<button class="vinv-btn primary" data-action="primary">'
      +     _esc(primLabel)
      +   '</button>'
      + '</div>';

    el.querySelector('[data-action="secondary"]').addEventListener('click', function () {
      // 2026-06-12 (user): nas abas Equipados/Aliados, "Voltar" volta pra MOCHILA
      // (items) — antes fechava o inventário inteiro. Só fecha quando já está na
      // lista de itens.
      if (_state.activeTab !== 'items') { _state.activeTab = 'items'; _render(); return; }
      if (typeof secAct.onClick === 'function') secAct.onClick();
      else window.vInventory.close();
    });
    el.querySelector('[data-action="primary"]').addEventListener('click', function () {
      // Custom onClick sobrescreve toggle padrão
      if (typeof primAct.onClick === 'function') primAct.onClick();
      else if (primDefault) primDefault();
    });
  }

  // ============================================================
  //  DETAIL MODAL
  //  @param {object} [ctx]  Contexto opcional:
  //    - fromLoadout: true se veio do clique num slot
  //    - slotKey: nome do slot (pra swap list)
  // ============================================================
  function _showDetail(it, ctx) {
    var cfg = _state.config;
    ctx = ctx || {};
    _state.selectedItem = it;
    var ov = _state.overlay.querySelector('[data-region="detail"]');
    var card = _state.overlay.querySelector('[data-region="detail-card"]');
    if (!ov || !card) return;

    var iconId = _resolveItemIcon(it);
    var rarity = it.rarity || 'common';
    var rarityLabel = {
      common: 'COMUM', uncommon: 'INCOMUM', rare: 'RARO',
      epic: 'ÉPICO', legendary: 'LENDÁRIO', quest: 'MISSÃO',
    }[rarity];

    var statsHtml = '';
    if (it.type) statsHtml += _detailStat('Tipo', it.type);
    if (it.slot) statsHtml += _detailStat('Slot', _slotLabel(it.slot));
    if (it.dmg_die) statsHtml += _detailStat('Dano', it.dmg_die);
    if (it.ac_bonus) statsHtml += _detailStat('CA', '+' + it.ac_bonus);
    if (it.bonus) statsHtml += _detailStat('Ataque', '+' + it.bonus);
    if (it.weight) statsHtml += _detailStat('Peso', it.weight + ' kg');
    if (it.value) statsHtml += _detailStat('Valor',
      '<span class="vinv-coin mini">V</span>' + it.value, 'gold');

    var tagsHtml = '';
    if (it.tags && it.tags.length) {
      tagsHtml = '<div class="vinv-detail-tags">'
        + it.tags.slice(0, 6).map(function (t) {
            return '<span class="vinv-dtag">' + _esc(_tagLabel(t)) + '</span>';
          }).join('')
        + '</div>';
    }

    // Swap list: se item equipado E há callback onItemSwap (ou onItemEquip
    // como fallback). Sem callback → read-only mode (sem swap UI).
    var swapHtml = '';
    var slotKey = ctx.slotKey || (it.equipped ? it.slot : null);
    var canSwap = (typeof cfg.onItemSwap === 'function')
      || (typeof cfg.onItemEquip === 'function');
    if (it.equipped && slotKey && canSwap) {
      var alternatives = _findSlotAlternatives(slotKey, cfg.player.items);
      var cost = cfg.inCombat ? _slotCombatCost(slotKey) : null;
      swapHtml = _renderSwapList(it, slotKey, alternatives, cost, cfg);
    } else if (it.equipped && slotKey && cfg.inCombat) {
      // Mesmo sem swap, exibe cost badge informativo (read-only D&D 5e)
      var infoCost = _slotCombatCost(slotKey);
      swapHtml = '<div class="vinv-swap-list">'
        +   '<div class="vinv-swap-title">Trocar em Combate'
        +     ' <span class="vinv-cost-badge ' + infoCost.kind + '" title="' + _esc(infoCost.tip) + '">'
        +       _esc(infoCost.label) + '</span>'
        +   '</div>'
        +   '<div class="vinv-swap-tip">' + _esc(infoCost.tip) + '</div>'
        +   '<div class="vinv-swap-empty">Volte à cidade para trocar.</div>'
        + '</div>';
    }

    var actions = _buildDetailActions(it, cfg, ctx);

    // 2026-06-12 (user): a imagem do equipamento é CLICÁVEL → abre o lightbox
    // ampliado (delegação .v-zoomable em lightbox.js, igual aos retratos de NPC e
    // ao avatar da Ficha). Só quando há <img> real (item com WebP); ícone SVG
    // heráldico não amplia (o lightbox faz no-op gracioso sem <img>).
    var _detailIcon = _iconSrc(iconId, it.name);
    var _portraitCls = 'vinv-detail-portrait';
    var _portraitAttr = '';
    if (_detailIcon.indexOf('<img') >= 0) {
      _portraitCls += ' v-zoomable';
      _portraitAttr = ' data-zoom-name="' + _esc(it.name) + '"'
        + ' data-zoom-desc="' + _esc(it.desc || '') + '" title="Toque para ampliar"';
    }
    card.innerHTML = ''
      + '<div class="vinv-detail-close" data-action="close-detail">' + _uiIcon('close', 13) + '</div>'
      + '<div class="vinv-detail-header">'
      +   '<div class="' + _portraitCls + '"' + _portraitAttr + '>' + _detailIcon + '</div>'
      +   '<div class="vinv-detail-name">' + _esc(it.name) + '</div>'
      +   '<div class="vinv-detail-rarity ' + rarity + '">' + rarityLabel + '</div>'
      +   (it.equipped ? '<div style="margin-top:6px"><span class="vinv-cost-badge action" style="background:rgba(196,149,58,0.2);color:var(--vinv-gold);border:1px solid var(--vinv-gold)">EQUIPADO</span></div>' : '')
      + '</div>'
      + (statsHtml
        ? '<div class="vinv-detail-stats">' + statsHtml + '</div>'
        : '')
      + (it.desc
        ? '<div class="vinv-detail-desc"><div class="vinv-detail-desc-text">' + _esc(it.desc) + '</div></div>'
        : '<div class="vinv-detail-desc" style="flex:0 0 auto;min-height:0;padding:0"></div>')
      + tagsHtml
      + swapHtml
      + actions;

    ov.classList.add('active');

    // Wire events
    card.querySelector('[data-action="close-detail"]').addEventListener('click', _hideDetail);
    card.querySelectorAll('[data-detail-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var act = btn.dataset.detailAction;
        var fn = cfg['on' + act.charAt(0).toUpperCase() + act.slice(1)];
        if (typeof fn === 'function') {
          var result = fn(it);
          if (result && result.then) {
            result.then(function () { window.vInventory.refresh(); _hideDetail(); });
          } else {
            window.vInventory.refresh();
            _hideDetail();
          }
        } else {
          _hideDetail();
        }
      });
    });
    _wireSwapList(card, it, slotKey, cfg);
  }

  // ============================================================
  //  SWAP LIST (alternativas pro mesmo slot + custo D&D 5e)
  // ============================================================
  function _renderSwapList(currentItem, slotKey, alternatives, cost, cfg) {
    if (!alternatives || alternatives.length === 0) {
      if (cfg.inCombat && cost) {
        return '<div class="vinv-swap-list">'
          +   '<div class="vinv-swap-title">Trocar Equipamento'
          +     ' <span class="vinv-cost-badge ' + cost.kind + '">' + _esc(cost.label) + '</span>'
          +   '</div>'
          +   '<div class="vinv-swap-empty">Nenhum item alternativo pra este slot.</div>'
          + (cost.kind === 'blocked'
              ? '<div class="vinv-swap-tip">' + _esc(cost.tip) + '</div>'
              : '')
          + '</div>';
      }
      return '<div class="vinv-swap-list">'
        +   '<div class="vinv-swap-title">Trocar Equipamento</div>'
        +   '<div class="vinv-swap-empty">Nenhum item alternativo pra este slot.</div>'
        + '</div>';
    }

    var blocked = (cfg.inCombat && cost && cost.kind === 'blocked');
    var title = currentItem ? 'Trocar Por' : 'Equipar';
    var html = '<div class="vinv-swap-list">'
      +   '<div class="vinv-swap-title">' + title;
    if (cfg.inCombat && cost) {
      html += ' <span class="vinv-cost-badge ' + cost.kind + '" title="' + _esc(cost.tip) + '">'
        + _esc(cost.label) + '</span>';
    }
    html += '</div>';
    if (blocked) {
      html += '<div class="vinv-swap-tip">' + _esc(cost.tip) + '</div>';
    }
    alternatives.forEach(function (alt, i) {
      var iconId = _resolveItemIcon(alt);
      var altRarity = alt.rarity || 'common';
      html += '<div class="vinv-swap-row r-' + altRarity + (blocked ? ' blocked' : '') + '" data-swap-idx="' + i + '">'
        // 2026-06-12 (review): usa o NOME do alternativo (alt.name) — antes usava
        // `it` (não existe neste escopo) → o slug do PNG saía errado e a swap list
        // mostrava ícone do item atual / fallback SVG em vez do ícone do alternativo.
        +   _iconSrc(iconId, alt.name || iconId)
        +   '<div class="vinv-swap-info">'
        +     '<div class="vinv-swap-name">' + _esc(alt.name) + '</div>'
        +     '<div class="vinv-swap-meta">' + _buildMeta(alt) + '</div>'
        +   '</div>'
        + '</div>';
    });
    html += '</div>';
    return html;
  }

  function _wireSwapList(card, currentItem, slotKey, cfg) {
    var rows = card.querySelectorAll('.vinv-swap-row');
    if (rows.length === 0) return;
    var alternatives = _findSlotAlternatives(slotKey, cfg.player.items);
    var cost = cfg.inCombat ? _slotCombatCost(slotKey) : null;
    var blocked = (cfg.inCombat && cost && cost.kind === 'blocked');

    rows.forEach(function (row) {
      row.addEventListener('click', function () {
        if (blocked) {
          // Mostra tip como toast
          if (typeof cfg.onSwapBlocked === 'function') {
            cfg.onSwapBlocked(slotKey, cost.tip);
          } else {
            console.warn('[vInventory swap blocked]', cost.tip);
          }
          return;
        }
        var idx = parseInt(row.dataset.swapIdx, 10);
        var newItem = alternatives[idx];
        if (!newItem) return;
        if (typeof cfg.onItemSwap === 'function') {
          var result = cfg.onItemSwap(currentItem, newItem, slotKey, cost);
          if (result && result.then) {
            result.then(function () { window.vInventory.refresh(); _hideDetail(); });
          } else {
            window.vInventory.refresh();
            _hideDetail();
          }
        } else if (typeof cfg.onItemEquip === 'function') {
          // Fallback: chama onItemEquip do novo item
          var r = cfg.onItemEquip(newItem);
          if (r && r.then) r.then(function () { window.vInventory.refresh(); _hideDetail(); });
          else { window.vInventory.refresh(); _hideDetail(); }
        }
      });
    });
  }

  function _hideDetail() {
    var ov = _state.overlay && _state.overlay.querySelector('[data-region="detail"]');
    if (ov) ov.classList.remove('active');
    _state.selectedItem = null;
  }

  function _detailStat(label, val, cls) {
    return '<div class="vinv-detail-stat">'
      +   '<span class="vinv-lbl">' + _esc(label) + '</span>'
      +   '<span class="vinv-val' + (cls ? ' ' + cls : '') + '">' + val + '</span>'
      + '</div>';
  }

  function _buildDetailActions(it, cfg, ctx) {
    ctx = ctx || {};
    var btns = [];
    var isEquipped = !!it.equipped;
    // 2026-07-01 (bug "Roupas Comuns"): o SLOT é a fonte única de equipabilidade —
    // alinhado à execução (_equipItem exige slot). Antes o botão decidia por TAG
    // (_equipTags) e itens com tag mas SEM slot (Roupas Comuns, trinkets) mostravam
    // "Equipar" morto ("não pode ser equipado"); e focos de conjurador (Grimório,
    // Foco Arcano, Símbolo Sagrado — slot off_hand SEM tag) nunca ganhavam o botão.
    // 'map' segue excluído (Mapa não é vestível via detail).
    var isEquippable = !!(cfg.onItemEquip && it.slot && it.slot !== 'map');
    // 2026-07-01: fora de combate, `thrown` não é consumível na cidade (paridade
    // com _useInventoryItem / apply_use — INV-CITY-05); em combate segue usável
    // (PHB p.148, arremesso é ataque).
    var canUse = (cfg.onItemUse && it.tags && (it.tags.indexOf('consumable') !== -1
      || it.tags.indexOf('potion') !== -1 || it.tags.indexOf('food') !== -1)
      && (cfg.inCombat || it.tags.indexOf('thrown') === -1));
    // 2026-07-01: Vender/Largar validam a lista canônica de tags protegidas
    // (economy/protected_tags — REG-01/REG-02): antes só quest/no_sell/no_discard
    // e o clique em chave/mapa falhava com toast (botão morto).
    var _protectedTags = cfg.protectedSellTags || ['quest', 'mission_item', 'key',
      'map', 'map_fragment', 'no_sell', 'no_discard', 'story_item', 'unique', 'starter_map'];
    var _isProtected = it.rarity === 'quest' || (it.tags && it.tags.some(function (t) {
      return _protectedTags.indexOf(t) !== -1;
    }));
    var canSell = !!(cfg.onItemSell && !_isProtected);
    var canDrop = !!(cfg.onItemDrop && !_isProtected
      && (!it.tags || it.tags.indexOf('no_discard') === -1));

    if (isEquipped && cfg.onItemUnequip) {
      btns.push({ act: 'ItemUnequip', label: 'Desequipar', cls: '' });
    } else if (isEquippable && !isEquipped) {
      btns.push({ act: 'ItemEquip', label: 'Equipar', cls: 'primary' });
    }
    // 2026-07-01 (UNEQUIP-ALLY-INVERSE): cópia equipada num ALIADO — o detail
    // antes não mostrava nada (equipped lê só o loadout do player) e o Equipar
    // podia falhar no pool sem explicação. O adapter injeta it.allyEquipped
    // ({id, name, slot}) e o caller passa onItemUnequipAlly.
    if (it.allyEquipped && !isEquipped && cfg.onItemUnequipAlly) {
      btns.push({ act: 'ItemUnequipAlly',
        label: 'Desequipar de ' + (it.allyEquipped.name || 'aliado'), cls: '' });
    }
    if (canUse) btns.push({ act: 'ItemUse', label: 'Usar', cls: 'primary' });
    if (canSell) btns.push({ act: 'ItemSell', label: 'Vender', cls: '' });
    if (canDrop) btns.push({ act: 'ItemDrop', label: 'Largar', cls: 'danger' });

    if (btns.length === 0) return '';

    return '<div class="vinv-detail-actions">'
      + btns.map(function (b) {
          return '<button class="vinv-btn ' + b.cls + '" data-detail-action="' + b.act + '">'
            + _esc(b.label) + '</button>';
        }).join('')
      + '</div>';
  }

  // ============================================================
  //  HELPERS — filter / sort / count
  // ============================================================
  function _filterItems(items) {
    var cat = _state.activeCategory;
    var search = (_state.search || '').toLowerCase().trim();
    return (items || []).filter(function (it) {
      if (!it || (it.qty != null && it.qty <= 0)) return false;
      if (cat) {
        var def = CATEGORIES.find(function (c) { return c.id === cat; });
        if (def && !_matchesCategory(it, def)) return false;
      }
      if (search) {
        var hay = (it.name + ' ' + (it.rarity || '') + ' ' + ((it.tags || []).join(' '))).toLowerCase();
        if (hay.indexOf(search) === -1) return false;
      }
      return true;
    });
  }

  /** Match cru (qualquer tag bate) — usado internamente pra precedência */
  function _matchesCategoryRaw(it, catDef) {
    var tags = it.tags || [];
    for (var i = 0; i < catDef.match.length; i++) {
      if (tags.indexOf(catDef.match[i]) !== -1) return true;
    }
    return (it.category === catDef.id);
  }

  /**
   * Match com precedência: item conta APENAS na primeira categoria
   * que match (na ordem do array CATEGORIES). Resolve duplicatas
   * (ex: mapa com tags ['tool', 'quest'] vai SÓ pra Tesouros).
   */
  function _matchesCategory(it, catDef) {
    return _primaryCategory(it) === catDef.id;
  }

  /** Retorna o ID da categoria primária do item (first-match-wins) */
  function _primaryCategory(it) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (_matchesCategoryRaw(it, CATEGORIES[i])) return CATEGORIES[i].id;
    }
    return null;
  }

  function _countByCategory(items) {
    var counts = {};
    CATEGORIES.forEach(function (c) { counts[c.id] = 0; });
    (items || []).forEach(function (it) {
      if (!it || (it.qty != null && it.qty <= 0)) return;
      var cat = _primaryCategory(it);
      if (cat) counts[cat]++;
    });
    return counts;
  }

  function _sortItems(items) {
    var sort = _state.sort;
    if (sort === 'default') return items;
    var rarityOrder = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4, quest: -1 };
    var arr = items.slice();
    arr.sort(function (a, b) {
      if (sort === 'name') return (a.name || '').localeCompare(b.name || '', 'pt-BR');
      if (sort === 'value') return (b.value || 0) - (a.value || 0);
      if (sort === 'rarity') {
        var ra = rarityOrder[a.rarity || 'common'];
        var rb = rarityOrder[b.rarity || 'common'];
        return ra - rb;
      }
      return 0;
    });
    return arr;
  }

  function _findItem(iid, items) {
    return (items || []).find(function (it) {
      return (it.id === iid) || (it.name === iid);
    });
  }

  function _categoryLabel(catId) {
    var c = CATEGORIES.find(function (x) { return x.id === catId; });
    return c ? c.label : catId;
  }

  function _slotLabel(slot) {
    // 2026-06-12 (user): labels alinhados ao slotDef do paper-doll (mesma palavra
    // que o jogador clicou) + os 4 slots novos — antes shoulders/belt/hands/legs
    // caíam no fallback `|| slot` (mostrava a key crua "shoulders" no picker).
    return ({
      head: 'Cabeça', chest: 'Peito', feet: 'Botas',
      main_hand: 'Mão Dir.', off_hand: 'Mão Esq.',
      ring: 'Anel', ring1: 'Anel I', ring2: 'Anel II',
      amulet: 'Amuleto', cloak: 'Capa', map: 'Mapa',
      shoulders: 'Ombros', belt: 'Cinto', hands: 'Mãos', legs: 'Pernas',
    })[slot] || slot;
  }

  var _TAG_LABELS = {
    weapon: 'Arma', simple_weapon: 'Arma Simples', martial_weapon: 'Arma Marcial',
    versatile: 'Versátil', finesse: 'Acuidade', light: 'Leve', heavy: 'Pesada',
    two_handed: 'Duas Mãos', thrown: 'Arremesso', ranged: 'À Distância', reach: 'Alcance',
    armor: 'Armadura', light_armor: 'Armadura Leve', medium_armor: 'Armadura Média',
    heavy_armor: 'Armadura Pesada', shield: 'Escudo', clothing: 'Vestimenta',
    consumable: 'Consumível', potion: 'Poção', healing: 'Cura', food: 'Comida',
    forage: 'Forrageio', alchemy: 'Alquimia', antidote: 'Antídoto', poison: 'Veneno',
    scroll: 'Pergaminho', field_kit: 'Kit de Campo',
    camping: 'Acampamento', tool: 'Ferramenta', map: 'Mapa',
    gem: 'Gema', socketable: 'Encaixável', valuable: 'Valioso',
    magic: 'Mágico', arcane: 'Arcano', holy: 'Sagrado',
    attunement: 'Sintonização', inscribable: 'Inscritível',
    monster_part: 'Parte de Monstro', material: 'Material',
    leather: 'Couro', bone: 'Osso', metal: 'Metal', wood: 'Madeira', fabric: 'Tecido',
    junk: 'Sucata', trophy: 'Troféu', no_sell: 'Não Vendável', no_discard: 'Indispensável',
    crafting: 'Artesanato', accessory: 'Acessório',
    set: 'Conjunto',
    set_lobo_selvagem: 'Conj. Lobo Selvagem',
    set_protetor_ancestral: 'Conj. Protetor Ancestral',
    set_arcanista: 'Conj. Arcanista',
    rune: 'Runa', rune_fragment: 'Fragmento de Runa',
    quest: 'Missão', unavailable: 'Indisponível', fairy: 'Feérico',
  };
  function _tagLabel(t) {
    if (!t) return '';
    var key = String(t).toLowerCase();
    if (_TAG_LABELS[key]) return _TAG_LABELS[key];
    return key.replace(/_/g, ' ');
  }

  // ============================================================
  //  HELPERS — Resolução robusta de iconId vs sprite canonical
  //  Bug histórico: adapters chamavam HeraldicItems.idFromName
  //  (inexistente) e caíam num slug ingênuo que não bate com
  //  alguns IDs do sprite (ex: "Poção de Cura" → "pocao-de-cura"
  //  mas sprite tem "pocao-cura"). Centralizar aqui evita repetir
  //  fix em 3 simuladores. Sempre reusa `ic-it-*` existente —
  //  regra "Items Existentes — NUNCA recriar SVG novo".
  // ============================================================
  function _spriteHasIcon(id) {
    if (!id) return false;
    try { return !!document.getElementById(id); } catch (_) { return false; }
  }
  function _heraldicResolve(name) {
    try {
      if (window.HeraldicItems && typeof HeraldicItems.resolve === 'function') {
        var r = HeraldicItems.resolve(name);
        if (r) return r;
      }
    } catch (_) {}
    return '';
  }
  function _slugVariants(name) {
    if (!name) return [];
    var base = _slugify(name);
    if (!base) return [];
    var v = [base];
    // Remove artigos/preposições pt-br comuns ("de", "do", "da", "dos", "das", "em", "a", "o")
    var stripped = base
      .replace(/(^|-)(de|do|da|dos|das|em|a|o)-/g, '$1')
      .replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (stripped && stripped !== base) v.push(stripped);
    return v;
  }
  function _fallbackIconByName(name) {
    if (!name) return '';
    var n = String(name).toLowerCase();
    // Keywords pt-BR canonical → ic-it-base-* mais próximo visualmente.
    // Ordem importa: prefixos mais específicos primeiro.
    if (/\bespada\s+longa\b/.test(n)) return 'ic-it-base-longsword';
    if (/\bespada\s+curta\b/.test(n)) return 'ic-it-base-shortsword';
    if (/\bmontante\b/.test(n)) return 'ic-it-base-greatsword';
    if (/\bmachado\s+grande\b/.test(n)) return 'ic-it-base-greataxe';
    if (/\bmachado\b/.test(n)) return 'ic-it-base-handaxe';
    if (/\bmartelo\b/.test(n)) return 'ic-it-base-warhammer';
    if (/\barco\b/.test(n)) return 'ic-it-base-shortbow';
    if (/\bbesta\b/.test(n)) return 'ic-it-base-light-crossbow';
    if (/\badaga\b/.test(n)) return 'ic-it-base-dagger';
    if (/\bclava\b/.test(n)) return 'ic-it-base-club';
    if (/\bmaça\b/.test(n) || /\bmaca\b/.test(n)) return 'ic-it-base-mace';
    if (/\blança\b/.test(n) || /\blanca\b/.test(n)) return 'ic-it-base-spear';
    if (/\bcajado\b/.test(n) || /\bbordão\b/.test(n) || /\bbordao\b/.test(n)) return 'ic-it-base-mage-staff';
    if (/\bvarinha\b/.test(n)) return 'ic-it-base-wand';
    if (/\bescudo\b/.test(n)) return 'ic-it-base-shield-round';
    if (/\belmo\b/.test(n)) return 'ic-it-base-iron-helm';
    if (/\bbotas\b/.test(n)) return 'ic-it-base-boot';
    if (/\bcapa\b/.test(n) || /\bmanto\b/.test(n)) return 'ic-it-base-cloak';
    if (/\bcota\b.*malha/.test(n)) return 'ic-it-base-chainmail-tunic';
    if (/\bpeitoral\b|couraça|couraca/.test(n)) return 'ic-it-base-breastplate';
    if (/\barmadura\b/.test(n)) return 'ic-it-base-padded-armor';
    if (/\bpergaminho\b/.test(n)) return 'ic-it-base-scroll';
    if (/\bgrimório\b|\bgrimorio\b|\btomo\b/.test(n)) return 'ic-it-base-tome';
    if (/\bmapa\b/.test(n)) return 'ic-it-base-map';
    /* 2026-06-21 (user "poção de mana com desenho de poção de vida"): poções de
       mana/recurso NÃO podem cair no frasco vermelho de cura. Roteia mana/recurso/
       arcano pro WebP de poção de mana (azul) antes do fallback genérico. */
    if ((/\bpoção\b|\bpocao\b|\belixir\b/.test(n)) && /\bmana\b|recurso|arcan/.test(n)) return 'ic-it-base-potion-mana';
    if (/\bpoção\b|\bpocao\b/.test(n)) return 'ic-it-base-potion-vial';
    if (/\banel\b/.test(n)) return 'ic-it-base-ring-band';
    if (/\bamuleto\b|\bpingente\b/.test(n)) return 'ic-it-base-amulet';
    if (/\btocha\b/.test(n)) return 'ic-it-base-torch';
    if (/\bvela\b/.test(n)) return 'ic-it-base-candle';
    if (/\bcorda\b/.test(n)) return 'ic-it-base-rope';
    if (/\btenda\b|\bbarraca\b/.test(n)) return 'ic-it-base-tent';
    if (/\bração\b|\bracao\b|\brações\b|\bracoes\b/.test(n)) return 'ic-it-base-bag-rations';
    if (/\bpão\b|\bpao\b/.test(n)) return 'ic-it-base-bread';
    if (/\bcarne\b/.test(n)) return 'ic-it-base-meat-cooked';
    if (/\bchave\b/.test(n)) return 'ic-it-base-key';
    if (/\bosso\b|\bcrânio\b|\bcranio\b/.test(n)) return 'ic-it-base-bone';
    if (/\bgarra\b/.test(n)) return 'ic-it-base-claw';
    if (/\bpresa\b|\bdente\b/.test(n)) return 'ic-it-base-fang';
    if (/\borelha\b|\bolho\b/.test(n)) return 'ic-it-base-ear';
    if (/\bpele\b|\bcouro\b/.test(n)) return 'ic-it-base-pelt';
    if (/\berva\b/.test(n)) return 'ic-it-base-herb-leaf';
    if (/\brubi|safira|esmeralda|ametista|turquesa|jade|ônix|onix|quartzo|topázio|topazio|pérola|perola/.test(n)) return 'ic-it-base-gem-faceted';
    if (/\bgema\b|\bcristal\b/.test(n)) return 'ic-it-base-gem-faceted';
    if (/\bruna\b/.test(n)) return 'ic-it-base-rune-stone';
    if (/\bfragmento\b/.test(n)) return 'ic-it-base-rune-fragment';
    if (/\borbe\b/.test(n)) return 'ic-it-base-orb';
    if (/\bbussola\b|\bbússola\b/.test(n)) return 'ic-it-base-compass';
    if (/\bluneta\b/.test(n)) return 'ic-it-base-spyglass';
    if (/\bkit\b/.test(n)) return 'ic-it-base-lantern';
    if (/\bmochila\b|\bsaco\b/.test(n)) return 'ic-it-base-coin-pouch';
    return '';
  }
  function _fallbackIconByMeta(it) {
    var byName = _fallbackIconByName(it.name);
    if (byName && _spriteHasIcon(byName)) return byName;
    var tags = (it.tags || []).join('|').toLowerCase();
    var slot = (it.slot || '').toLowerCase();
    // Slot tem prioridade — mais específico que tag genérica
    if (slot === 'main_hand' || /\bweapon\b/.test(tags)) {
      if (/\bsimple_weapon|martial_weapon\b/.test(tags) && /\bfinesse\b/.test(tags))
        return 'ic-it-base-dagger';
      if (/\branged\b/.test(tags)) return 'ic-it-base-shortbow';
      if (/\btwo_handed\b/.test(tags)) return 'ic-it-base-greatsword';
      return 'ic-it-base-shortsword';
    }
    if (slot === 'off_hand' || /\bshield\b/.test(tags)) return 'ic-it-base-shield-round';
    if (slot === 'head') return 'ic-it-base-iron-helm';
    if (slot === 'chest' || /\barmor\b/.test(tags)) {
      if (/\bheavy_armor\b/.test(tags)) return 'ic-it-base-breastplate';
      if (/\blight_armor\b/.test(tags)) return 'ic-it-base-hide-armor';
      return 'ic-it-base-leather-chest';
    }
    if (slot === 'feet') return 'ic-it-base-boot';
    if (slot === 'hands') return 'ic-it-base-glove';
    if (slot === 'cloak') return 'ic-it-base-cloak';
    if (slot === 'ring1' || slot === 'ring2' || slot === 'ring') return 'ic-it-base-ring-band';
    if (slot === 'amulet' || slot === 'necklace') return 'ic-it-base-amulet';
    if (/\bpotion|healing\b/.test(tags)) return 'ic-it-base-potion-vial';
    if (/\bscroll\b/.test(tags)) return 'ic-it-base-scroll';
    if (/\bfood|ration\b/.test(tags)) return 'ic-it-base-bread';
    if (/\bgem|valuable\b/.test(tags)) return 'ic-it-base-gem-faceted';
    if (/\brune_fragment\b/.test(tags)) return 'ic-it-base-rune-fragment';
    if (/\brune\b/.test(tags)) return 'ic-it-base-rune-stone';
    if (/\bmap\b/.test(tags)) return 'ic-it-base-map';
    if (/\bbone|monster_part\b/.test(tags)) return 'ic-it-base-bone';
    if (/\bcamping\b/.test(tags)) return 'ic-it-base-tent';
    if (/\btool\b/.test(tags)) return 'ic-it-base-lantern';
    if (/\bconsumable\b/.test(tags)) return 'ic-it-base-potion-vial';
    return 'ic-it-base-coin-pouch';
  }
  function _resolveItemIcon(it) {
    if (!it) return 'ic-it-base-coin-pouch';
    // 1) Hint do adapter — só usa se o sprite realmente tem
    var hinted = it.iconId;
    if (hinted && _spriteHasIcon(hinted)) return hinted;
    // 2) HeraldicItems.resolve(name) — conhece o set completo de IDs
    var resolved = _heraldicResolve(it.name);
    if (resolved && _spriteHasIcon(resolved)) return resolved;
    // 3) Variantes de slug (drop "de"/"do"/"da")
    var variants = _slugVariants(it.name);
    for (var i = 0; i < variants.length; i++) {
      var alt = 'ic-it-' + variants[i];
      if (_spriteHasIcon(alt)) return alt;
    }
    // 4) Fallback por slot/tag — sempre retorna ic-it-base-* existente
    return _fallbackIconByMeta(it);
  }

  // ============================================================
  //  HELPERS — UI icons (inline, prefix vui-*)
  // ============================================================
  var UI_ICONS = {
    back: 'M10 6 L4 12 L10 18 M4 12 L20 12',
    close: 'M6 6 L18 18 M18 6 L6 18',
    check: 'M5 12 L10 17 L20 7',
    search: ':circle:10:10:6;M14.5 14.5 L20 20',
    sort: 'M4 7 L11 7 M4 12 L9 12 M4 17 L7 17;M17 5 L17 19 M14 16 L17 19 L20 16',
    filter: 'M4 5 L20 5 L14 12 L14 19 L10 17 L10 12 Z',
    backpack: ':rect:6:6:12:15;M8 6 L8 4 Q8 2 12 2 Q16 2 16 4 L16 6;:rect:8:10:8:6;:circle:12:13:1.1',
    locked: ':rect:6:11:12:9;M8 11 L8 8 Q8 4 12 4 Q16 4 16 8 L16 11;:circle:12:15:1.3',
  };
  function _uiIcon(name, size) {
    size = size || 16;
    var def = UI_ICONS[name];
    if (!def) return '';
    var parts = def.split(';');
    var inner = parts.map(function (p) {
      if (p.indexOf(':circle:') === 0) {
        var c = p.split(':'); // ['', 'circle', cx, cy, r]
        return '<circle cx="' + c[2] + '" cy="' + c[3] + '" r="' + c[4]
          + '" fill="none" stroke="currentColor" stroke-width="1.8"/>';
      }
      if (p.indexOf(':rect:') === 0) {
        var r = p.split(':');
        return '<rect x="' + r[2] + '" y="' + r[3] + '" width="' + r[4] + '" height="' + r[5]
          + '" rx="2" fill="currentColor" opacity="0.85" stroke="#3a1f08" stroke-width="0.6"/>';
      }
      return '<path d="' + p + '" stroke="currentColor" stroke-width="2" fill="none" '
        + 'stroke-linecap="round" stroke-linejoin="round"/>';
    }).join('');
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" aria-hidden="true">'
      + inner + '</svg>';
  }

  // ============================================================
  //  UTIL — escape, slugify
  // ============================================================
  function _esc(s) {
    // A1.1: delega ao escaper canônico (window.vEsc); fallback local idêntico.
    if (typeof vEsc === 'function') return vEsc(s);
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function _slugify(s) {
    return String(s || '').toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
})();
