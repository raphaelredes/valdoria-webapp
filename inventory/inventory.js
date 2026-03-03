    /* ═══════════════════════════════════════════════════════════
       INVENTORY WEBAPP — Lendas de Valdoria v2
       ═══════════════════════════════════════════════════════════ */

    const tg = window.Telegram?.WebApp;
    const _vBg = getComputedStyle(document.documentElement)
        .getPropertyValue('--v-bg').trim() || '#2b2830';
    if (tg) { tg.ready(); tg.expand(); tg.setHeaderColor(_vBg); tg.setBackgroundColor(_vBg); }

    // ── State ──
    let D = null;           // Decoded payload
    let activeTab = 'items';
    let activeFilter = 'all';
    let searchQuery = '';
    let sortMode = 'default'; // default, name, rarity, value
    let pendingOps = [];    // Batch operations to send
    let localEq = {};       // Local copy of equipment (player)
    let localInv = [];      // Local copy of inventory [{n,q,id}]
    let localAllyEq = {};   // npc_id → {slot: item}
    let localGems = {};     // slot → [gem|null, ...]
    let localRunes = {};    // slot → rune_name|null
    let localGold = 0;
    let localHP = 0;
    let localMP = 0;
    let localPotions = 0;       // Basic potion counter
    let localFavs = [];         // Local favorites list
    let localAC = 0;            // Dynamic AC (recalculated on equip/unequip)
    let activeTarget = 'player'; // 'player' or npc_id
    let selectionMode = false;
    let selectedItems = new Set(); // item names selected for batch ops

    // ── SVG Icon System (medieval line art) ──
    const _IC = {
        // Equipment slots
        helm:'<path d="M6 19h12M7 19v-3c0-5 2-9 5-11 3 2 5 6 5 11v3"/><path d="M7 12h10"/>',
        chest:'<path d="M8 4h8l2 6v10H6V10z"/><path d="M6 10h12"/><line x1="12" y1="10" x2="12" y2="20"/>',
        pauldron:'<path d="M4 14c0-5 3-9 8-10 5 1 8 5 8 10"/><path d="M7 10c0-3 2-5 5-6 3 1 5 3 5 6"/>',
        sword:'<line x1="5" y1="19" x2="19" y2="5"/><line x1="14" y1="5" x2="19" y2="10"/><line x1="5" y1="15" x2="9" y2="19"/><circle cx="7" cy="17" r="1"/>',
        shield:'<path d="M12 3L4 7v5c0 5 3.5 9.7 8 11 4.5-1.3 8-6 8-11V7z"/>',
        gauntlet:'<path d="M8 20V10l-2-3v-2h2l1 2h6l1-2h2v2l-2 3v10z"/><path d="M8 14h8"/>',
        greaves:'<path d="M8 4v14l-1 3h3l1-3h2l1 3h3l-1-3V4z"/><path d="M8 10h8"/>',
        boot:'<path d="M8 4v12l-2 2v2h12v-2l-2-4V4z"/><path d="M6 18h12"/>',
        cloak:'<path d="M9 4c-4 3-5 8-5 12h4c0-2 1-3 4-3s4 1 4 3h4c0-4-1-9-5-12"/><path d="M10 4h4"/>',
        belt:'<rect x="4" y="10" width="16" height="4" rx="1"/><rect x="10" y="9" width="4" height="6" rx="1"/>',
        ring:'<circle cx="12" cy="13" r="5"/><circle cx="12" cy="8" r="2"/>',
        pendant:'<path d="M8 4h8"/><path d="M10 4v4l2 3 2-3V4"/><circle cx="12" cy="15" r="3"/>',
        scroll:'<path d="M7 5c-1 0-2 1-2 2v10c0 1 1 2 2 2"/><path d="M17 5c1 0 2 1 2 2v10c0 1-1 2-2 2"/><rect x="7" y="5" width="10" height="14" rx="1"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="15" x2="13" y2="15"/>',
        // Tabs
        bag:'<path d="M6 9h12v11H6z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/><line x1="10" y1="13" x2="14" y2="13"/>',
        armorTab:'<path d="M8 4h8l1 4h-10zM7 8v12h10V8"/><path d="M7 12h10"/><circle cx="12" cy="16" r="1.5"/>',
        people:'<circle cx="8" cy="8" r="3"/><path d="M3 19c0-3 2-5 5-5s5 2 5 5"/><circle cx="16" cy="8" r="3"/><path d="M13 19c0-3 2-5 5-5"/>',
        vault:'<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M6 8V6a6 6 0 0 1 12 0v2"/><circle cx="12" cy="15" r="2"/><line x1="12" y1="17" x2="12" y2="19"/>',
        // Stats
        heart:'<path d="M12 21C8 17 3 13.5 3 9a4.5 4.5 0 0 1 9 0 4.5 4.5 0 0 1 9 0c0 4.5-5 8-9 12z"/>',
        orb:'<circle cx="12" cy="12" r="7"/><path d="M12 5c-2 2-3 4-3 7s1 5 3 7"/><path d="M12 5c2 2 3 4 3 7s-1 5-3 7"/><path d="M5 12h14"/>',
        coin:'<circle cx="12" cy="12" r="7"/><text x="12" y="16" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor" stroke="none">G</text>',
        flask:'<path d="M10 3h4v4l3 8v3a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-3l3-8z"/><line x1="9" y1="3" x2="15" y2="3"/><path d="M8 15h8"/>',
        // Filters/Actions
        star:'<path d="M12 3l2.5 5.5L20 9.5l-4 4 1 5.5L12 16.5 7 19l1-5.5-4-4 5.5-1z"/>',
        star_f:'<path d="M12 3l2.5 5.5L20 9.5l-4 4 1 5.5L12 16.5 7 19l1-5.5-4-4 5.5-1z"/>',
        gem:'<path d="M5 9l7-5 7 5-7 11z"/><path d="M5 9h14"/><line x1="12" y1="4" x2="12" y2="20"/>',
        check:'<polyline points="4 12 9 17 20 6"/>',
        check_f:'<path d="M4 12l5 5L20 6"/>',
        sparkle:'<path d="M12 2v4M12 18v4M2 12h4M18 12h4"/><path d="M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>',
        lock:'<rect x="6" y="11" width="12" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/><circle cx="12" cy="16" r="1.5"/>',
        trash:'<path d="M4 7h16"/><path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7"/><path d="M9 4h6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
        save:'<path d="M7 3h10l4 4v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><rect x="8" y="13" width="8" height="6"/><line x1="9" y1="15" x2="15" y2="15"/><line x1="9" y1="17" x2="13" y2="17"/>',
        warn:'<path d="M12 3L2 20h20z"/><line x1="12" y1="10" x2="12" y2="14"/><circle cx="12" cy="17" r="1" fill="currentColor" stroke="none"/>',
        listIcon:'<rect x="4" y="3" width="16" height="18" rx="2"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="13" y2="16"/>',
        abc:'<text x="4" y="16" font-size="11" font-weight="bold" fill="currentColor" stroke="none">Az</text>',
        hammer:'<path d="M6 6h6v4H6z"/><line x1="9" y1="10" x2="9" y2="20"/><path d="M7 10h4"/>',
        target:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>',
        person:'<circle cx="12" cy="7" r="4"/><path d="M5 21c0-4 3-7 7-7s7 3 7 7"/>',
        backpack:'<rect x="6" y="8" width="12" height="13" rx="2"/><path d="M9 8V5a3 3 0 0 1 6 0v3"/><path d="M6 13h12"/><rect x="9" y="15" width="6" height="3" rx="1"/>',
        quill:'<path d="M18 3c-3 1-6 5-8 10l-2 6 6-2c5-2 9-5 10-8"/><path d="M8 13l3 3"/>',
        food:'<circle cx="10" cy="10" r="5"/><path d="M14 14l6 6"/><line x1="14" y1="7" x2="17" y2="7"/>',
        stealth:'<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/><line x1="4" y1="20" x2="20" y2="4" stroke-width="2"/>',
        tent:'<path d="M3 20L12 4l9 16z"/><line x1="12" y1="4" x2="12" y2="20"/><path d="M8 20c0-2 2-4 4-4s4 2 4 4"/>',
    };
    function vi(name, sz) {
        const p = _IC[name]; if (!p) return '';
        const s = sz || 24;
        return `<svg class="vi" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
    }
    function vi_f(name, sz) {
        const p = _IC[name+'_f'] || _IC[name]; if (!p) return '';
        const s = sz || 24;
        return `<svg class="vi" width="${s}" height="${s}" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
    }
    const SLOT_ICONS = {
        head:'helm', chest:'chest', shoulders:'pauldron',
        main_hand:'sword', off_hand:'shield', hands:'gauntlet',
        legs:'greaves', feet:'boot', cloak:'cloak', belt:'belt',
        ring_1:'ring', ring_2:'ring', necklace:'pendant',
        amulet:'pendant', map:'scroll',
    };

    const SLOT_NAMES = {
        head: 'Cabeça', chest: 'Tronco', shoulders: 'Ombros',
        main_hand: 'M.Principal', off_hand: 'M.Secundária',
        hands: 'Mãos', legs: 'Pernas', feet: 'Botas',
        cloak: 'Capa', belt: 'Cinto',
        ring_1: 'Anel 1', ring_2: 'Anel 2',
        necklace: 'Pescoço', map: 'Mapa',
    };
    const SLOT_ORDER = [
        'head', 'necklace', 'shoulders', 'cloak',
        'chest', 'main_hand', 'off_hand', 'belt',
        'hands', 'ring_1', 'legs', 'ring_2',
        'feet', 'map',
    ];
    const RARITY_ORDER = { common: 0, uncommon: 1, rare: 2, very_rare: 3, legendary: 4 };
    const RARITY_FALLBACK = {
        common:    { l: 'Comum',      c: '#9e9e9e' },
        uncommon:  { l: 'Incomum',    c: '#4caf50' },
        rare:      { l: 'Raro',       c: '#2196f3' },
        very_rare: { l: 'Muito Raro', c: '#9c27b0' },
        legendary: { l: 'Lendário',   c: '#ff9800' },
    };
    const RUNE_ELIGIBLE = new Set([
        'main_hand','off_hand','chest','head','hands','feet','legs','cloak','necklace'
    ]);
    const TAG_LABELS = {
        weapon:'Arma', simple_weapon:'Arma Simples', martial_weapon:'Arma Marcial',
        armor:'Armadura', shield:'Escudo', clothing:'Vestimenta',
        light_armor:'Armadura Leve', medium_armor:'Armadura Média', heavy_armor:'Armadura Pesada',
        consumable:'Consumível', potion:'Poção', food:'Alimento',
        gem:'Gema', socketable:'Encaixável', rune:'Runa',
        tool:'Ferramenta', camping:'Acampamento',
        junk:'Sucata', bone:'Osso', monster_part:'Despojo', trophy:'Troféu',
        valuable:'Tesouro', material:'Material', metal:'Metal', leather:'Couro',
        alchemy:'Alquimia', accessory:'Acessório',
        quest:'Missão', mission_item:'Item de Missão', key:'Chave',
        map:'Mapa', map_fragment:'Fragmento de Mapa',
        no_sell:'Invendável', no_discard:'Indescartável',
        story_item:'Item de História', unique:'Único',
        two_handed:'Duas Mãos', versatile:'Versátil', finesse:'Acuidade',
        ranged:'À Distância', thrown:'Arremesso', ammunition:'Munição',
        melee:'Corpo a Corpo', reach:'Alcance', loading:'Recarga',
        light:'Leve', heavy:'Pesada',
    };
    const SORT_LABELS = {
        default: `${vi('listIcon',13)} Padrão`, name: `${vi('abc',13)} Nome`,
        rarity: `${vi('sparkle',13)} Raridade`, value: `${vi('coin',13)} Valor`,
    };
    const SORT_CYCLE = ['default','name','rarity','value'];

    // ── Rarity config (from payload or fallback) ──
    function getRarityConfig() { return D?.ref?.rar || RARITY_FALLBACK; }
    function getRarityLabel(r) { return (getRarityConfig()[r] || RARITY_FALLBACK.common).l; }
    function getRarityColor(r) { return (getRarityConfig()[r] || RARITY_FALLBACK.common).c; }

    // ── UTF-8 Base64 Decode ──
    function decodeBase64Utf8(b64) {
        const raw = b64.replace(/-/g, '+').replace(/_/g, '/');
        const binary = atob(raw);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return new TextDecoder().decode(bytes);
    }

    // ── Init ──
    function init() {
        const params = new URLSearchParams(location.search);
        const b64 = params.get('data');
        if (!b64) { hideLoading(); showError('Dados não encontrados.'); return; }
        try {
            D = JSON.parse(decodeBase64Utf8(b64));
        } catch(e) { console.error('[INVENTORY] Erro ao decodificar dados', e); hideLoading(); showError('Erro ao decodificar dados.'); return; }

        // Init local state from payload
        localEq = Object.assign({}, D.eq || {});
        localInv = (D.inv || []).map(i => ({...i}));
        localGold = D.p.g || 0;
        localHP = D.p.hp || 0;
        localMP = D.p.mp || 0;
        localPotions = D.p.pot || 0;
        localFavs = D.fav ? [...D.fav] : [];
        localGems = {};
        if (D.gems) {
            for (const [k,v] of Object.entries(D.gems))
                localGems[k] = [...v];
        }
        localRunes = D.runes ? {...D.runes} : {};
        localAllyEq = {};
        if (D.allies) {
            for (const a of D.allies)
                localAllyEq[a.id] = Object.assign({}, a.eq || {});
        }

        // Dynamic body padding based on bottom bar height
        const bar = document.getElementById('bottomBar');
        document.body.style.paddingBottom = (bar ? bar.offsetHeight + 12 : 80) + 'px';

        hideLoading();
        updateHeader();
        buildTabs();
        renderTab();
        initSwipeToDismiss();
        initBackButton();
    }

    function hideLoading() {
        document.getElementById('loadingOverlay').classList.add('hidden');
    }

    function showError(msg) {
        console.error('[INVENTORY]', msg);
        document.getElementById('mainContent').innerHTML =
            `<div class="empty-state"><div class="icon">${vi('warn',32)}</div><p>${msg}</p></div>`;
    }

    // ── Haptic feedback ──
    function haptic(type) {
        try { tg?.HapticFeedback?.impactOccurred?.(type || 'light'); } catch(e) {}
    }
    function hapticNotify(type) {
        try { tg?.HapticFeedback?.notificationOccurred?.(type || 'error'); } catch(e) {}
    }

    // ── Header ──
    let _acDirty = true, _acCached = 0;
    function calcLocalAC() {
        if (!_acDirty) return _acCached;
        // Base AC from server (includes DEX, class features, unarmored defense)
        // We adjust by calculating the delta between original equipment bonuses and current
        let origEqAC = 0;
        for (const item of Object.values(D.eq || {})) {
            if (!item) continue;
            const it = getItemData(item);
            origEqAC += it.ac || 0;
            // Original gem bonuses
            const origGems = (D.gems || {})[getSlotForItem(item, D.eq)] || [];
            origGems.forEach(g => { if (g) { const gd = getItemData(g); origEqAC += gd.gb?.ac_bonus || 0; } });
        }
        let newEqAC = 0;
        for (const [slot, item] of Object.entries(localEq)) {
            if (!item) continue;
            const it = getItemData(item);
            newEqAC += it.ac || 0;
            const gems = localGems[slot] || [];
            gems.forEach(g => { if (g) { const gd = getItemData(g); newEqAC += gd.gb?.ac_bonus || 0; } });
        }
        localAC = D.p.ac + (newEqAC - origEqAC);
        _acCached = localAC;
        _acDirty = false;
        return localAC;
    }

    function getSlotForItem(itemName, eq) {
        for (const [slot, name] of Object.entries(eq || {})) { if (name === itemName) return slot; }
        return '';
    }

    function updateHeader() {
        calcLocalAC();
        const s = document.getElementById('headerStats');
        const potStr = localPotions > 0 ? `<span class="hs-hp">${vi('flask',12)} ${localPotions}</span>` : '';
        let buffsStr = '';
        if (D.buffs && D.buffs.length > 0) {
            buffsStr = D.buffs.map(b =>
                `<span style="font-size:10px;opacity:0.8;">${b.i}${b.c}</span>`
            ).join('');
        }
        s.innerHTML = `
            <span>${D.p.n}</span>
            <span class="hs-hp">${vi('heart',12)} ${localHP}/${D.p.mhp}</span>
            <span class="hs-mp">${vi('orb',12)} ${localMP}/${D.p.mmp}</span>
            <span class="hs-gold">${vi('coin',12)} ${localGold}</span>
            <span class="hs-ac">${vi('shield',12)} ${localAC}</span>
            ${potStr}${buffsStr}
        `;
    }

    function animateStat(cls) {
        const el = document.querySelector(`.${cls}`);
        if (el) { el.classList.remove('stat-pop');
            void el.offsetWidth; el.classList.add('stat-pop'); }
    }

    // ── Tabs ──
    function buildTabs() {
        const bar = document.getElementById('tabsBar');
        const tabs = [
            {id:'items', label:`${vi('bag',15)} Itens`},
            {id:'equip', label:`${vi('armorTab',15)} Equipamento`},
        ];
        if (D.allies && D.allies.length > 0) tabs.push({id:'allies', label:`${vi('people',15)} Aliados`});
        if (D.bank) tabs.push({id:'bank', label:`${vi('vault',15)} Cofre`});
        bar.innerHTML = tabs.map(t =>
            `<div class="tab ${t.id===activeTab?'active':''}" onclick="switchTab('${t.id}')">${t.label}</div>`
        ).join('');
    }

    function switchTab(id) {
        activeTab = id;
        activeTarget = 'player';
        if (selectionMode) { selectionMode = false; selectedItems.clear(); updateSelectionBar(); }
        buildTabs();
        renderTab();
        haptic('light');
    }

    function renderTab() {
        const c = document.getElementById('mainContent');
        c.classList.remove('tab-entering');
        void c.offsetWidth;
        c.classList.add('tab-entering');
        if (activeTab === 'items') renderItemsTab(c);
        else if (activeTab === 'equip') renderEquipTab(c);
        else if (activeTab === 'allies') renderAlliesTab(c);
        else if (activeTab === 'bank') renderBankTab(c);
    }

    // ══════════════════════════════════════════════════════════
    //  TAB 1: ITEMS
    // ══════════════════════════════════════════════════════════
    function renderItemsTab(c) {
        const counts = getFilterCounts();
        const filters = [
            {id:'all', label:'Todos', cnt: counts.all},
            {id:'fav', label:`${vi_f('star',13)} Favoritos`, cnt: counts.fav},
            {id:'equip', label:`${vi('sword',13)} Equip`, cnt: counts.equip},
            {id:'use', label:`${vi('flask',13)} Consumíveis`, cnt: counts.use},
            {id:'gem', label:`${vi('gem',13)} Gemas`, cnt: counts.gem},
            {id:'rune', label:`${vi('orb',13)} Runas`, cnt: counts.rune},
            {id:'misc', label:`${vi('bag',13)} Outros`, cnt: counts.misc},
        ];

        let html = '';

        // Search bar + sort
        html += `<div class="search-bar">
            <div class="search-wrap">
                <input type="text" placeholder="Buscar item..." value="${esc(searchQuery)}"
                    oninput="onSearch(this.value)" id="searchInput">
                <button class="search-clear ${searchQuery?'visible':''}" onclick="clearSearch()" id="searchClear">&times;</button>
            </div>
            <div class="sort-btn ${selectionMode?'active':''}" onclick="toggleSelectionMode()" title="Modo seleção">
                ${selectionMode ? vi_f('check',14) : vi('check',14)}
            </div>
            <div class="sort-btn ${sortMode!=='default'?'active':''}" onclick="cycleSort()">
                ${SORT_LABELS[sortMode]}
            </div>
        </div>`;

        // Filters with counts
        html += '<div class="filters">';
        filters.forEach(f => {
            const cntBadge = f.cnt > 0 ? `<span class="filter-count">(${f.cnt})</span>` : '';
            html += `<div class="filter-btn ${f.id===activeFilter?'active':''}"
                onclick="setFilter('${f.id}')">${f.label}${cntBadge}</div>`;
        });
        html += '</div>';

        // Quick action: Sell Junk
        const junkCount = getJunkItems().reduce((sum, j) => sum + j.q, 0);
        if (junkCount > 0 && !searchQuery) {
            let junkGP = 0;
            getJunkItems().forEach(inv => {
                const jit = getItemData(inv.n);
                junkGP += Math.max(1, Math.floor((jit.v || 1) * 0.6)) * inv.q;
            });
            html += `<div style="text-align:right;margin-bottom:6px;">
                <span class="btn-sell-junk" onclick="doSellJunk()">${vi('coin',13)} Vender Lixo (${junkCount}) · ${junkGP}gp</span>
            </div>`;
        }

        // Potion counter card (basic potions, separate from inventory)
        if (localPotions > 0 && (activeFilter === 'all' || activeFilter === 'use')
            && (!searchQuery || 'poção de cura'.includes(searchQuery))) {
            html += `<div style="margin-bottom:10px;"><div class="item-grid">
                <div class="item-card rarity-common fade-in" onclick="doUsePotion()" style="grid-column: span 2;
                    display:flex;align-items:center;gap:12px;padding:12px;">
                    <span style="font-size:28px;">${vi('flask',28)}</span>
                    <div style="flex:1;">
                        <div class="ic-name" style="font-size:14px;">Poção de Cura</div>
                        <div class="ic-meta">Cura 2d4+2 HP</div>
                    </div>
                    <span class="ic-qty" style="font-size:13px;">x${localPotions}</span>
                </div>
            </div></div>`;
        }

        // Truncation warning
        if (D.trunc) {
            html += `<div style="background:rgba(255,152,0,0.1);border:1px solid var(--v-warning);border-radius:var(--v-radius);padding:8px 12px;margin-bottom:10px;font-size:12px;color:var(--v-warning);text-align:center;">
                ${vi('warn',13)} Mostrando 40 de ${D.trunc} itens. Use o bot para gerenciar os demais.
            </div>`;
        }

        const items = getSortedFilteredItems();
        if (!items.length && localPotions <= 0) {
            const emptyMsg = searchQuery ? 'Nenhum item encontrado para a busca.' : 'Nenhum item encontrado.';
            html += `<div class="empty-state"><div class="icon">${vi('bag',32)}</div><p>${emptyMsg}</p></div>`;
        } else if (items.length) {
            html += '<div class="item-grid">';
            items.forEach(inv => {
                const it = getItemData(inv.n);
                const rarity = it.r || 'common';
                const equipped = isEquippedAnywhere(inv.n);
                const setId = it.si || '';
                const tags = it.t || [];
                const canSelect = selectionMode && !equipped && !isProtected(tags);
                const isSelected = selectedItems.has(inv.n);
                const clickAction = canSelect
                    ? `toggleSelectItem('${esc(inv.n)}')`
                    : (selectionMode ? '' : `openItemDetail('${esc(inv.n)}')`);
                html += `<div class="item-card rarity-${rarity} ${equipped?'equipped-marker':''} fade-in"
                    onclick="${clickAction}" ${selectionMode && !canSelect ? 'style="opacity:0.4;"' : ''}>
                    ${selectionMode ? `<div class="sel-check ${isSelected?'active':''}">${isSelected ? vi_f('check',12) : ''}</div>` : ''}
                    <div class="ic-badges">
                        ${inv.q > 1 ? `<span class="ic-qty">x${inv.q}</span>` : ''}
                        ${equipped ? '<span class="ic-eq-badge">Equipado</span>' : ''}
                        ${setId ? `<span class="ic-set-badge">${getSetIcon(setId)}</span>` : ''}
                    </div>
                    ${!selectionMode && isFav(inv.n) ? `<span class="ic-fav">${vi_f('star',14)}</span>` : ''}
                    <div class="ic-emoji">${it.e||'📦'}</div>
                    <div class="ic-name v-rarity-${rarity}">${inv.n}</div>
                    <div class="ic-meta">${getItemShortDesc(inv.n, it)}</div>
                </div>`;
            });
            html += '</div>';
        }
        c.innerHTML = html;
    }

    let _searchTimer = null;
    function onSearch(val) {
        clearTimeout(_searchTimer);
        const clearBtn = document.getElementById('searchClear');
        if (clearBtn) clearBtn.classList.toggle('visible', val.trim().length > 0);
        _searchTimer = setTimeout(() => {
            searchQuery = val.toLowerCase().trim();
            renderTab();
            const inp = document.getElementById('searchInput');
            if (inp) { inp.focus(); inp.selectionStart = inp.selectionEnd = inp.value.length; }
        }, 150);
    }

    function clearSearch() {
        searchQuery = '';
        renderTab();
        const inp = document.getElementById('searchInput');
        if (inp) { inp.focus(); }
    }

    function cycleSort() {
        const idx = SORT_CYCLE.indexOf(sortMode);
        sortMode = SORT_CYCLE[(idx + 1) % SORT_CYCLE.length];
        haptic('light');
        renderTab();
    }

    function setFilter(f) {
        activeFilter = f;
        renderTab();
    }

    function getFilterCounts() {
        const all = localInv.filter(i => i.q > 0);
        const counts = { all: all.length, fav: 0, equip: 0, use: 0, gem: 0, rune: 0, misc: 0 };
        all.forEach(inv => {
            const it = getItemData(inv.n);
            const tags = it.t || [];
            if (isFav(inv.n)) counts.fav++;
            if (it.s) counts.equip++;
            if (tags.includes('consumable') || tags.includes('food') || tags.includes('potion')) counts.use++;
            if (tags.includes('gem') || tags.includes('socketable')) counts.gem++;
            if (tags.includes('rune')) counts.rune++;
            if (!it.s && !tags.includes('consumable') && !tags.includes('food')
                && !tags.includes('potion') && !tags.includes('gem')
                && !tags.includes('socketable') && !tags.includes('rune')) counts.misc++;
        });
        return counts;
    }

    function getSortedFilteredItems() {
        let items = getFilteredItems();
        // Search
        if (searchQuery) {
            items = items.filter(inv => inv.n.toLowerCase().includes(searchQuery));
        }
        // Sort
        if (sortMode === 'name') {
            items.sort((a, b) => a.n.localeCompare(b.n));
        } else if (sortMode === 'rarity') {
            items.sort((a, b) => {
                const ra = RARITY_ORDER[getItemData(a.n).r || 'common'] || 0;
                const rb = RARITY_ORDER[getItemData(b.n).r || 'common'] || 0;
                return rb - ra; // Higher rarity first
            });
        } else if (sortMode === 'value') {
            items.sort((a, b) => (getItemData(b.n).v || 0) - (getItemData(a.n).v || 0));
        }
        return items;
    }

    function getFilteredItems() {
        let items = localInv.filter(i => i.q > 0);
        if (activeFilter === 'all') return items;
        return items.filter(inv => {
            const it = getItemData(inv.n);
            const tags = it.t || [];
            if (activeFilter === 'fav') return isFav(inv.n);
            if (activeFilter === 'equip') return !!it.s;
            if (activeFilter === 'use') return tags.includes('consumable') || tags.includes('food') || tags.includes('potion');
            if (activeFilter === 'gem') return tags.includes('gem') || tags.includes('socketable');
            if (activeFilter === 'rune') return tags.includes('rune');
            if (activeFilter === 'misc') return !it.s && !tags.includes('consumable') && !tags.includes('food')
                && !tags.includes('potion') && !tags.includes('gem') && !tags.includes('socketable') && !tags.includes('rune');
            return true;
        });
    }

    // ══════════════════════════════════════════════════════════
    //  TAB 2: EQUIPMENT
    // ══════════════════════════════════════════════════════════
    function renderEquipTab(c) {
        let html = '';

        // Stats summary
        if (activeTarget === 'player') {
            html += buildStatsSummary();
            html += buildSetProgress();
            html += buildLoadoutBar();
        }

        html += '<div class="equip-grid">';
        const eq = activeTarget === 'player' ? localEq : (localAllyEq[activeTarget] || {});

        const SLOT_GROUPS = [
            { label: `${vi('sword',13)} Armas`, slots: ['main_hand', 'off_hand'] },
            { label: `${vi('chest',13)} Armadura`, slots: ['head', 'chest', 'shoulders', 'hands', 'legs', 'feet'] },
            { label: `${vi('sparkle',13)} Acessórios`, slots: ['necklace', 'ring_1', 'ring_2', 'belt', 'cloak', 'map'] },
        ];

        SLOT_GROUPS.forEach(group => {
            html += `<div class="equip-group-label">${group.label}</div>`;
            group.slots.forEach(slot => {
                renderEquipSlot(slot);
            });
        });

        function renderEquipSlot(slot) {
            const item = eq[slot] || null;
            const it = item ? getItemData(item) : null;
            const filled = item ? 'filled' : '';
            const icon = item ? (it?.e || '📦') : getSlotEmptyIcon(slot);
            const label = SLOT_NAMES[slot] || slot;
            const nameDisplay = item ? item : '—';
            const rarity = item ? (it?.r || 'common') : '';

            // Gem/Rune badges for player slots
            let badges = '';
            if (activeTarget === 'player' && item) {
                const sockets = it?.sk || 0;
                const gems = localGems[slot] || [];
                const rune = localRunes[slot];
                if (sockets > 0) {
                    badges += '<div class="es-badges">';
                    for (let i = 0; i < sockets; i++) {
                        const gFilled = gems[i] ? 'filled' : '';
                        badges += `<div class="es-gem-dot ${gFilled}"></div>`;
                    }
                    if (rune) badges += `<span class="es-rune-dot">${vi('orb',10)}</span>`;
                    badges += '</div>';
                } else if (rune) {
                    badges += `<div class="es-badges"><span class="es-rune-dot">${vi('orb',10)}</span></div>`;
                }
            }

            // Upgrade available indicator
            let upgradeBadge = '';
            if (activeTarget === 'player') {
                const compat = getCompatibleItems(slot);
                const hasUpgrade = compat.some(ci => {
                    const cit = getItemData(ci.name);
                    if (ci.name === item) return false;
                    const { cls } = compareItemsDetailed(cit, it || {ac:0,b:0,hb:0,mb:0}, slot);
                    return cls === 'better';
                });
                if (hasUpgrade) upgradeBadge = '<span style="position:absolute;top:4px;right:6px;font-size:10px;color:var(--v-success);font-weight:700;background:rgba(76,175,80,0.15);padding:1px 5px;border-radius:8px;">⬆</span>';
            }

            html += `<div class="equip-slot ${filled}" onclick="openSlotModal('${slot}')"
                style="position:relative;${rarity && item ? `border-left:3px solid ${getRarityColor(rarity)}` : ''}">
                ${upgradeBadge}
                <div class="es-label">${label}</div>
                <div class="es-icon">${icon}</div>
                <div class="es-item">${nameDisplay}</div>
                ${badges}
            </div>`;
        }
        html += '</div>';
        c.innerHTML = html;
    }

    function buildStatsSummary() {
        let totalAC = 0, totalHP = 0, totalMP = 0, totalATK = 0;
        for (const [slot, item] of Object.entries(localEq)) {
            if (!item) continue;
            const it = getItemData(item);
            totalAC += it.ac || 0;
            totalHP += it.hb || 0;
            totalMP += it.mb || 0;
            totalATK += it.b || 0;
            // Gem bonuses
            const gems = localGems[slot] || [];
            gems.forEach(g => {
                if (!g) return;
                const gd = getItemData(g);
                if (gd.gb) {
                    totalHP += gd.gb.hp_bonus || 0;
                    totalMP += gd.gb.mp_bonus || 0;
                    totalAC += gd.gb.ac_bonus || 0;
                }
            });
        }
        const parts = [];
        if (totalAC) parts.push(`${vi('shield',13)} CA <b>+${totalAC}</b>`);
        if (totalATK) parts.push(`${vi('sword',13)} ATK <b>+${totalATK}</b>`);
        if (totalHP) parts.push(`${vi('heart',13)} HP <b>+${totalHP}</b>`);
        if (totalMP) parts.push(`${vi('orb',13)} MP <b>+${totalMP}</b>`);
        if (!parts.length) return '';
        return `<div class="stats-summary">${parts.map(p => `<div class="ss-item">${p}</div>`).join('')}</div>`;
    }

    function buildSetProgress() {
        if (!D.sets) return '';
        const owned = new Set();
        // Player equipped + inventory
        for (const item of Object.values(localEq)) { if (item) owned.add(item); }
        localInv.forEach(i => { if (i.q > 0) owned.add(i.n); });

        let html = '';
        for (const [sid, sdef] of Object.entries(D.sets)) {
            const count = sdef.pcs.filter(p => owned.has(p)).length;
            if (count === 0) continue;

            html += `<div class="set-progress fade-in">
                <div class="set-title">${sdef.i} ${sdef.n} (${count}/${sdef.pcs.length})</div>
                <div class="set-pieces">`;
            sdef.pcs.forEach(p => {
                const cls = owned.has(p) ? 'owned' : 'missing';
                const icon = owned.has(p) ? vi_f('check',13) : vi('check',13);
                html += `<div class="set-piece ${cls}">${icon} ${p}</div>`;
            });
            html += '</div>';
            // Thresholds
            for (const [th, label] of Object.entries(sdef.th)) {
                const active = count >= parseInt(th);
                html += `<div class="set-bonus ${active?'active':'inactive'}">${active?vi('sparkle',13):vi('lock',13)} ${th}/${sdef.pcs.length}: ${label}</div>`;
            }
            // Equip set button — only if player has unequipped pieces
            const equipped = new Set(Object.values(localEq).filter(Boolean));
            const canEquipPieces = sdef.pcs.filter(p => owned.has(p) && !equipped.has(p));
            if (canEquipPieces.length > 0) {
                html += `<button class="btn-equip" style="width:100%;margin-top:6px;font-size:11px;padding:6px;" onclick="doEquipSet('${esc(sid)}')">${vi('sword',13)} Equipar Set (${canEquipPieces.length})</button>`;
            }
            html += '</div>';
        }
        return html;
    }

    function getSlotEmptyIcon(slot) {
        return vi(SLOT_ICONS[slot] || 'bag', 20);
    }

    // ══════════════════════════════════════════════════════════
    //  TAB 3: ALLIES
    // ══════════════════════════════════════════════════════════
    function renderAlliesTab(c) {
        if (!D.allies || !D.allies.length) {
            c.innerHTML = `<div class="empty-state"><div class="icon">${vi('people',32)}</div><p>Nenhum aliado no grupo.</p></div>`;
            return;
        }
        let html = '';
        D.allies.forEach(a => {
            html += `<div class="ally-card fade-in" onclick="openAllyEquip('${esc(a.id)}')">
                <div class="ally-header">
                    <span class="ally-name">${a.n}</span>
                    <span class="ally-class">${a.c || 'Aliado'}</span>
                </div>
                <div class="ally-stats">
                    <span class="ally-hp">${vi('heart',12)} ${a.hp}/${a.mhp}</span>
                    <span class="ally-ac">${vi('shield',12)} ${a.ac}</span>
                </div>
            </div>`;
        });
        c.innerHTML = html;
    }

    function openAllyEquip(npcId) {
        activeTarget = npcId;
        activeTab = 'equip';
        buildTabs();
        renderTab();
        // Show back button to allies
        const c = document.getElementById('mainContent');
        const ally = D.allies.find(a => a.id === npcId);
        const allyName = ally ? ally.n : npcId;
        c.innerHTML = `<div style="margin-bottom:10px;">
            <span style="font-size:13px;color:var(--v-text-dim);cursor:pointer;"
                onclick="switchTab('allies')">← Aliados</span>
            <span style="font-size:14px;color:var(--v-gold);margin-left:8px;font-weight:600;">
                ${allyName}
            </span>
        </div>` + c.innerHTML;
    }

    // ── Loadouts ──
    function buildLoadoutBar() {
        const ldout = D.ldout || {};
        const names = Object.keys(ldout);
        let html = '<div style="display:flex;gap:4px;margin:6px 0;flex-wrap:wrap;align-items:center;">';
        html += `<span class="btn-sell-junk" onclick="promptSaveLoadout()" style="border-color:var(--v-gold);">${vi('save',13)} Salvar</span>`;
        names.forEach(n => {
            html += `<span class="btn-sell-junk" style="border-color:var(--v-text-dim);display:inline-flex;align-items:center;gap:2px;">
                <span onclick="doLoadLoadout('${esc(n)}')" style="cursor:pointer;">${vi('sword',13)} ${n}</span>
                <span onclick="event.stopPropagation();doDeleteLoadout('${esc(n)}')" style="cursor:pointer;color:var(--v-danger);opacity:0.6;font-size:14px;padding:0 2px;">×</span>
            </span>`;
        });
        html += '</div>';
        return names.length > 0 || true ? html : '';
    }

    function promptSaveLoadout() {
        const ldout = D.ldout = D.ldout || {};
        if (Object.keys(ldout).length >= 5) { toast(`${vi('warn',13)} Máximo 5 loadouts`, 'err'); return; }
        showInputModal('Salvar Loadout', 'Nome do loadout', 20, (name) => {
            ldout[name] = Object.assign({}, localEq);
            addOp({t:'save_loadout', name});
            haptic('medium');
            toast(`${vi('save',13)} '${esc(name)}' salvo`, 'ok');
            renderTab();
            updateBottomBar();
        });
    }

    function showInputModal(title, placeholder, maxLen, onConfirm) {
        const html = `<div class="modal-handle"></div>
            <div class="modal-title">${vi('save',16)} ${title}</div>
            <div style="padding:0 4px;">
                <input type="text" id="inputModalField" placeholder="${placeholder}" maxlength="${maxLen}"
                    style="width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid var(--v-border);border-radius:var(--v-radius);
                    background:var(--v-bg-card);color:var(--v-text-bright);font-size:14px;outline:none;"
                    oninput="document.getElementById('inputModalCount').textContent=this.value.length+'/${maxLen}'">
                <div id="inputModalCount" style="text-align:right;font-size:11px;color:var(--v-text-dim);margin-top:4px;">0/${maxLen}</div>
            </div>
            <div class="detail-actions" style="margin-top:8px;">
                <button class="btn-unequip" onclick="closeModal()">Cancelar</button>
                <button class="btn-equip" id="inputModalConfirm">Confirmar</button>
            </div>`;
        showModal(html);
        const field = document.getElementById('inputModalField');
        const btn = document.getElementById('inputModalConfirm');
        setTimeout(() => field.focus(), 100);
        btn.onclick = () => {
            const val = field.value.trim().slice(0, maxLen);
            if (!val) { hapticNotify('error'); return; }
            closeModal();
            onConfirm(val);
        };
        field.onkeydown = (e) => { if (e.key === 'Enter') btn.click(); };
    }

    function doLoadLoadout(name) {
        const ldout = (D.ldout || {})[name];
        if (!ldout) return;
        _acDirty = true;
        for (const [slot, itemName] of Object.entries(ldout)) {
            if (!itemName) continue;
            const inv = localInv.find(i => i.n === itemName && i.q > 0);
            if (!inv) continue;
            const it = getItemData(itemName);
            if (!it?.s) continue;
            if (!checkProficiency(it, 'player', itemName)) continue;
            addOp({t:'equip', item: itemName, slot, tgt: 'player'});
            localEq[slot] = itemName;
        }
        closeModal();
        haptic('medium');
        toast(`${vi('sword',13)} Loadout '${esc(name)}' aplicado`, 'ok');
        updateHeader();
        renderTab();
        updateBottomBar();
    }

    function doDeleteLoadout(name) {
        if (!D.ldout || !D.ldout[name]) return;
        delete D.ldout[name];
        addOp({t:'delete_loadout', name});
        haptic('medium');
        toast(`${vi('trash',13)} Loadout '${esc(name)}' removido`, 'ok');
        renderTab();
        updateBottomBar();
    }

    // ══════════════════════════════════════════════════════════
    //  TAB 4: BANK (read-only)
    // ══════════════════════════════════════════════════════════
    function renderBankTab(c) {
        if (!D.bank) {
            c.innerHTML = `<div class="empty-state"><div class="icon">${vi('vault',32)}</div><p>Cofre vazio.</p></div>`;
            return;
        }
        let html = `<div class="vault-header">
            <div class="vault-amount">${vi('coin',22)} ${D.bank.g || 0} GP</div>
            <div class="vault-sub">Ouro guardado no cofre</div>
        </div>`;
        const items = D.bank.i || [];
        if (items.length > 0) {
            html += `<div class="section-title">${vi('bag',14)} Itens Guardados (${items.length})</div>`;
            html += '<div class="item-grid">';
            items.forEach(bi => {
                const it = getItemData(bi.n);
                const emoji = it?.e || '📦';
                const rarity = it?.r || 'common';
                html += `<div class="item-card rarity-${rarity} fade-in">
                    <div class="ic-badges">
                        ${bi.q > 1 ? `<span class="ic-qty">x${bi.q}</span>` : ''}
                    </div>
                    <div class="ic-emoji">${emoji}</div>
                    <div class="ic-name v-rarity-${rarity}">${bi.n}</div>
                    <div class="ic-meta">${getItemShortDesc(bi.n, it || {})}</div>
                </div>`;
            });
            html += '</div>';
        } else if (!D.bank.g) {
            html += `<div class="empty-state"><div class="icon">${vi('vault',32)}</div><p>Cofre vazio.</p></div>`;
        }
        c.innerHTML = html;
    }

    // ══════════════════════════════════════════════════════════
    //  ITEM DETAIL MODAL
    // ══════════════════════════════════════════════════════════
    function openItemDetail(name) {
        const it = getItemData(name);
        const inv = localInv.find(i => i.n === name);
        const qty = inv ? inv.q : 0;
        const rarity = it.r || 'common';
        const tags = it.t || [];
        const rarColor = getRarityColor(rarity);

        let html = '<div class="modal-handle"></div>';
        html += `<div class="modal-title">${it.e||'📦'} ${name}</div>`;
        html += `<div style="text-align:center;margin-bottom:10px;">
            <span class="detail-rarity-badge" style="background:${rarColor}22;color:${rarColor};border:1px solid ${rarColor}44;">
                ${getRarityLabel(rarity)}
            </span></div>`;

        if (it.desc) html += `<div class="detail-desc">"${it.desc}"</div>`;

        // Stats
        if (it.s) html += detailRow('Slot', SLOT_NAMES[it.s] || it.s);
        if (it.dd) {
            let dmgStr = it.dd + (it.b ? ` +${it.b}` : '');
            if (it.dt) dmgStr += ` (${it.dt})`;
            html += detailRow('Dano', dmgStr, it.b ? 'bonus' : '');
        }
        if (it.vd) html += detailRow('Versátil', it.vd);
        if (it.ac) html += detailRow('CA', `+${it.ac}`, 'bonus');
        if (it.hb) html += detailRow('HP Bônus', `+${it.hb}`, 'bonus');
        if (it.mb) html += detailRow('MP Bônus', `+${it.mb}`, 'bonus');
        if (it.ib) html += detailRow('INT Bônus', `+${it.ib}`, 'bonus');
        if (it.sb) html += detailRow('Bônus de Salvaguarda', `+${it.sb}`, 'bonus');
        if (it.sk) html += detailRow('Engastes', `${it.sk} ${vi('gem',13)}`);
        if (it.sr) html += detailRow('Força Req.', it.sr);
        if (it.th) html += detailRow('Duas Mãos', 'Sim');
        if (it.heal) {
            const avg = avgDice(it.heal);
            const m = (it.heal || '').match(/(\d+)d(\d+)\+?(\d+)?/);
            const lo = m ? parseInt(m[1]) + parseInt(m[3] || 0) : avg;
            const hi = m ? parseInt(m[1]) * parseInt(m[2]) + parseInt(m[3] || 0) : avg;
            const preview = Math.min(D.p.mhp, localHP + avg) - localHP;
            html += detailRow('Cura', `${it.heal} (${lo}–${hi})`);
            if (preview > 0) html += detailRow('Preview', `${vi('heart',12)} ${localHP} → ~${localHP + preview}`, 'bonus');
        }
        if (it.v) html += detailRow('Valor', `${it.v} GP`);
        if (qty > 1) html += detailRow('Quantidade', `x${qty}`);

        // Gem bonus
        if (it.gb) {
            let parts = [];
            if (it.gb.hp_bonus) parts.push(`+${it.gb.hp_bonus} HP`);
            if (it.gb.mp_bonus) parts.push(`+${it.gb.mp_bonus} MP`);
            if (it.gb.ac_bonus) parts.push(`+${it.gb.ac_bonus} CA`);
            if (it.gb.save_bonus) parts.push(`+${it.gb.save_bonus} Salv.`);
            if (parts.length) html += detailRow('Bônus Gema', parts.join(', '), 'bonus');
        }

        // Rune effect
        if (it.re) {
            html += detailRow('Runa', `${it.re.tr}: ${it.re.ch}% ${it.re.ef}`);
        }

        // Set info
        if (it.si && D.sets && D.sets[it.si]) {
            const sdef = D.sets[it.si];
            const owned = sdef.pcs.filter(p =>
                Object.values(localEq).includes(p) || localInv.some(i => i.n === p && i.q > 0)
            ).length;
            html += detailRow('Conjunto', `${sdef.i} ${sdef.n} (${owned}/${sdef.pcs.length})`);
        }

        // Tags
        if (tags.length) {
            html += '<div class="detail-tags">';
            tags.slice(0, 8).forEach(t => { html += `<span class="detail-tag">${TAG_LABELS[t] || t}</span>`; });
            html += '</div>';
        }

        // Comparison with equipped (if equippable) — always show
        if (it.s) {
            const slot = resolveSlot(it);
            const eq = activeTarget === 'player' ? localEq : (localAllyEq[activeTarget] || {});
            const currentItem = eq[slot];
            if (currentItem === name) {
                html += `<div style="margin-top:8px;padding:8px;background:var(--v-bg-card);border-radius:var(--v-radius);font-size:12px;text-align:center;">
                    <span style="color:var(--v-success);">${vi_f('check',13)} Equipado neste slot</span>
                </div>`;
            } else {
                const currentIt = currentItem ? getItemData(currentItem) : {ac:0,b:0,hb:0,mb:0};
                const delta = getStatDelta(it, currentIt, slot);
                if (currentItem) {
                    html += `<div style="margin-top:8px;padding:8px;background:var(--v-bg-card);border-radius:var(--v-radius);font-size:12px;">
                        <span style="color:var(--v-text-dim);">vs ${currentItem}:</span> ${delta || '<span style="color:var(--v-text-dim);">sem diferença</span>'}
                    </div>`;
                } else if (delta) {
                    html += `<div style="margin-top:8px;padding:8px;background:var(--v-bg-card);border-radius:var(--v-radius);font-size:12px;">
                        <span style="color:var(--v-success);">${vi('sword',12)} Slot vazio — equipar dá:</span> ${delta}
                    </div>`;
                }
            }
        }

        // Action buttons
        html += '<div class="detail-actions">';
        const favIcon = isFav(name) ? vi_f('star',16) : vi('star',16);
        html += `<button class="btn-unequip" onclick="doToggleFav('${esc(name)}');openItemDetail('${esc(name)}')"
            style="flex:0 0 44px;padding:10px;">${favIcon}</button>`;
        if (it.s && !isProtected(tags)) {
            const canEquip = checkProficiency(it, activeTarget, name);
            if (canEquip) {
                html += `<button class="btn-equip" onclick="doEquip('${esc(name)}')">${vi('sword',13)} Equipar</button>`;
            } else {
                html += `<button class="btn-disabled" disabled>${vi('lock',13)} Sem proficiência</button>`;
            }
        }
        if (isConsumable(tags) && qty > 0) {
            const isCamping = tags.includes('camping');
            const isFood = tags.includes('food');
            const isPotion = tags.includes('potion');
            const hasAllies = D.allies && D.allies.length > 0;
            if (isCamping) {
                html += `<button class="btn-use" onclick="showCampConfirm('${esc(name)}')">${vi('tent',13)} Acampar ▸</button>`;
            } else if ((isFood || isPotion) && hasAllies) {
                html += `<button class="btn-use" onclick="showTargetPicker('${esc(name)}')">${vi('flask',13)} Usar ▸</button>`;
            } else {
                html += `<button class="btn-use" onclick="doUse('${esc(name)}')">${vi('flask',13)} Usar</button>`;
            }
        }
        if (canSell(it, tags) && qty > 0 && !isEquippedAnywhere(name)) {
            const sellPrice = Math.max(1, Math.floor((it.v || 1) * 0.5));
            html += `<button class="btn-sell" onclick="doSell('${esc(name)}',${sellPrice})">${vi('coin',13)} ${sellPrice}gp</button>`;
        }
        if (canDiscard(it, tags) && qty > 0 && !isEquippedAnywhere(name)) {
            html += `<button class="btn-discard" onclick="doDiscard('${esc(name)}')" style="flex:0 0 44px;padding:10px;">${vi('trash',14)}</button>`;
        }
        html += '</div>';

        showModal(html);
    }

    function detailRow(label, val, cls) {
        const valClass = cls ? `detail-val ${cls}` : 'detail-val';
        return `<div class="detail-row"><span class="detail-label">${label}</span><span class="${valClass}">${val}</span></div>`;
    }

    // ══════════════════════════════════════════════════════════
    //  SLOT MODAL (Equipment detail + gem/rune + compatible items)
    // ══════════════════════════════════════════════════════════
    function openSlotModal(slot) {
        const eq = activeTarget === 'player' ? localEq : (localAllyEq[activeTarget] || {});
        const item = eq[slot] || null;
        const it = item ? getItemData(item) : null;

        let html = '<div class="modal-handle"></div>';
        html += `<div class="modal-title">${SLOT_NAMES[slot] || slot}</div>`;

        if (item) {
            const rarity = it?.r || 'common';
            const rarColor = getRarityColor(rarity);
            // Current equipped item info
            html += `<div style="text-align:center;font-size:18px;margin-bottom:4px;">${it?.e||'📦'}</div>`;
            html += `<div style="text-align:center;font-size:14px;font-weight:600;margin-bottom:2px;" class="v-rarity-${rarity}">${item}</div>`;
            html += `<div style="text-align:center;margin-bottom:6px;">
                <span class="detail-rarity-badge" style="background:${rarColor}22;color:${rarColor};border:1px solid ${rarColor}44;font-size:10px;">
                    ${getRarityLabel(rarity)}
                </span></div>`;
            if (it?.dd) html += `<div style="text-align:center;font-size:12px;color:var(--v-text-dim);">Dano: ${it.dd}${it.b ? ' +'+it.b : ''}</div>`;
            if (it?.ac) html += `<div style="text-align:center;font-size:12px;color:var(--v-text-dim);">CA: +${it.ac}</div>`;
            if (it?.hb) html += `<div style="text-align:center;font-size:12px;color:var(--v-text-dim);">HP: +${it.hb}</div>`;
            if (it?.mb) html += `<div style="text-align:center;font-size:12px;color:var(--v-text-dim);">MP: +${it.mb}</div>`;
            if (it?.sp) html += `<div style="text-align:center;font-size:11px;color:#ef5350;">${vi('stealth',12)} Desvantagem em Furtividade</div>`;

            // Gems section (player only)
            if (activeTarget === 'player') {
                const sockets = it?.sk || 0;
                if (sockets > 0) {
                    html += `<div class="section-title">${vi('gem',14)} Gemas</div>`;
                    html += '<div class="gem-grid">';
                    const gems = localGems[slot] || [];
                    for (let i = 0; i < sockets; i++) {
                        const gem = gems[i] || null;
                        const gemData = gem ? getItemData(gem) : null;
                        const filled = gem ? 'filled' : '';
                        const icon = gem ? (gemData?.e || '💎') : '+';
                        html += `<div class="gem-socket ${filled}" onclick="gemAction('${slot}',${i},'${esc(gem||'')}')"
                            title="${gem || 'Vazio'}">${icon}</div>`;
                    }
                    html += '</div>';
                    // Show gem names below sockets + extract all button
                    const gemsInSlot = localGems[slot] || [];
                    const gemNames = gemsInSlot.filter(Boolean);
                    if (gemNames.length) {
                        html += `<div style="text-align:center;font-size:11px;color:var(--v-text-dim);margin-top:4px;">
                            ${gemNames.join(' · ')}</div>`;
                    }
                    if (gemNames.length > 1) {
                        html += `<div style="text-align:center;margin-top:6px;">
                            <button class="btn-unequip" style="font-size:11px;padding:4px 12px;"
                                onclick="doExtractAllGems('${slot}')">${vi('gem',12)} Extrair Todas (${gemNames.length})</button>
                        </div>`;
                    }
                }

                // Rune section
                if (RUNE_ELIGIBLE.has(slot)) {
                    html += `<div class="section-title">${vi('orb',14)} Runa</div>`;
                    const rune = localRunes[slot] || null;
                    if (rune) {
                        const runeData = getItemData(rune);
                        html += `<div class="rune-slot filled" onclick="runeAction('${slot}')">
                            <div style="font-size:16px;">${runeData?.e||'🔮'} ${rune}</div>
                            <div style="font-size:11px;color:var(--v-text-dim);margin-top:2px;">Toque para substituir</div>
                        </div>`;
                    } else {
                        html += `<div class="rune-slot" onclick="runeAction('${slot}')">
                            <div style="font-size:14px;color:var(--v-text-dim);">+ Inscrever Runa</div>
                        </div>`;
                    }
                }
            }

            // Unequip button
            html += `<div class="detail-actions" style="margin-top:14px;">
                <button class="btn-unequip" onclick="doUnequip('${slot}')">${vi('bag',13)} Desequipar</button>
            </div>`;
        } else {
            html += '<div style="text-align:center;color:var(--v-text-dim);padding:12px;">Slot vazio</div>';
        }

        // Compatible items from inventory — sorted by stat delta (upgrades first)
        html += `<div class="section-title">${vi('bag',14)} Itens Compatíveis</div>`;
        const compatItems = getCompatibleItems(slot);
        if (compatItems.length === 0) {
            html += '<div style="font-size:12px;color:var(--v-text-dim);text-align:center;">Nenhum item compatível no inventário.</div>';
        } else {
            // Pre-compute deltas for sorting
            const withDelta = compatItems.map(ci => {
                const cit = getItemData(ci.name);
                const { cls: compCls, delta, score } = compareItemsDetailed(cit, it, slot);
                return { ci, cit, compCls, delta, score: score || 0 };
            });
            withDelta.sort((a, b) => b.score - a.score);

            html += '<div class="compat-list">';
            withDelta.forEach(({ ci, cit, compCls, delta }) => {
                html += `<div class="compat-item ${compCls}" onclick="doEquip('${esc(ci.name)}','${slot}')">
                    <span class="compat-emoji">${cit?.e||'📦'}</span>
                    <div class="compat-info">
                        <div class="compat-name v-rarity-${cit?.r||'common'}">${ci.name}</div>
                        <div class="compat-stats">${getItemShortDesc(ci.name, cit)}</div>
                    </div>
                    ${delta}
                </div>`;
            });
            html += '</div>';
        }

        showModal(html);
    }

    // ══════════════════════════════════════════════════════════
    //  GEM & RUNE ACTIONS
    // ══════════════════════════════════════════════════════════
    function gemAction(slot, idx, currentGem) {
        if (currentGem) {
            // Confirm before removing gem
            const confirmHtml = `<div class="modal-handle"></div>
                <div class="modal-title">${vi('gem',16)} Remover Gema?</div>
                <div style="text-align:center;font-size:13px;color:var(--v-text-dim);margin-bottom:12px;">
                    Remover <b style="color:var(--v-text-bright)">${currentGem}</b> do socket?
                </div>
                <div class="detail-actions">
                    <button class="btn-unequip" onclick="openSlotModal('${slot}')">Cancelar</button>
                    <button class="btn-equip" onclick="doGemRemove('${slot}',${idx},'${esc(currentGem)}')">Remover</button>
                </div>`;
            showModal(confirmHtml);
        } else {
            showGemSelect(slot, idx);
        }
    }

    function doGemRemove(slot, idx, gemName) {
        _acDirty = true;
        addOp({t:'gem_remove', slot, idx});
        const gems = localGems[slot] || [];
        gems[idx] = null;
        localGems[slot] = gems;
        addToLocalInv(gemName);
        haptic('medium');
        toast(`${vi('gem',13)} ${esc(gemName)} removida`, 'ok');
        openSlotModal(slot);
    }

    function showGemSelect(slot, idx) {
        const gems = localInv.filter(i => {
            const it = getItemData(i.n);
            return it && (it.t||[]).some(t => t === 'gem' || t === 'socketable');
        });

        let html = '<div class="modal-handle"></div>';
        html += `<div class="modal-title">${vi('gem',16)} Selecionar Gema</div>`;
        if (!gems.length) {
            html += '<div style="text-align:center;color:var(--v-text-dim);">Nenhuma gema disponível.</div>';
        } else {
            gems.forEach(g => {
                const it = getItemData(g.n);
                let desc = '';
                if (it.gb) {
                    let parts = [];
                    if (it.gb.hp_bonus) parts.push(`+${it.gb.hp_bonus} HP`);
                    if (it.gb.mp_bonus) parts.push(`+${it.gb.mp_bonus} MP`);
                    if (it.gb.ac_bonus) parts.push(`+${it.gb.ac_bonus} CA`);
                    if (it.gb.save_bonus) parts.push(`+${it.gb.save_bonus} Salv.`);
                    desc = parts.join(' · ');
                }
                const tierBadge = it.gt ? `<span style="font-size:10px;color:var(--v-text-dim);"> T${it.gt}</span>` : '';
                html += `<div class="select-item" onclick="doGemInsert('${slot}',${idx},'${esc(g.n)}')">
                    <span class="si-emoji">${it.e||'💎'}</span>
                    <div><div class="si-name">${g.n}${tierBadge}</div>
                    <div class="si-desc">${desc}</div></div>
                </div>`;
            });
        }
        html += `<div class="detail-actions" style="margin-top:12px;">
            <button class="btn-unequip" onclick="openSlotModal('${slot}')">← Voltar</button>
        </div>`;
        showModal(html);
    }

    function doGemInsert(slot, idx, gemName) {
        _acDirty = true;
        addOp({t:'gem_insert', slot, gem: gemName, idx});
        const sockets = (getItemData(localEq[slot]) || {}).sk || 0;
        if (!localGems[slot]) localGems[slot] = Array(sockets).fill(null);
        localGems[slot][idx] = gemName;
        removeFromLocalInv(gemName);
        haptic('medium');
        toast(`${vi('gem',13)} ${esc(gemName)} encaixada`, 'ok');
        openSlotModal(slot);
    }

    function runeAction(slot) {
        showRuneSelect(slot);
    }

    function showRuneSelect(slot) {
        const currentRune = localRunes[slot] || null;
        const runes = localInv.filter(i => {
            const it = getItemData(i.n);
            return it && (it.t||[]).includes('rune');
        });

        let html = '<div class="modal-handle"></div>';
        html += `<div class="modal-title">${vi('orb',16)} Inscrever Runa</div>`;

        if (currentRune) {
            html += `<div style="background:var(--v-bg-card);border:1px solid var(--v-warning);border-radius:var(--v-radius);padding:10px;margin-bottom:10px;font-size:12px;color:var(--v-warning);text-align:center;">
                ${vi('warn',13)} Runa atual (${currentRune}) será <b>destruída</b> ao inscrever outra.
            </div>`;
        }

        if (!runes.length) {
            html += '<div style="text-align:center;color:var(--v-text-dim);">Nenhuma runa disponível.</div>';
        } else {
            runes.forEach(r => {
                const it = getItemData(r.n);
                let desc = '';
                if (it.re) desc = `${it.re.tr}: ${it.re.ch}% ${it.re.ef}`;
                const tierBadge = it.rt ? `<span style="font-size:10px;color:var(--v-text-dim);"> T${it.rt}</span>` : '';
                html += `<div class="select-item" onclick="doRuneInscribe('${slot}','${esc(r.n)}')">
                    <span class="si-emoji">${it.e||'🔮'}</span>
                    <div><div class="si-name">${r.n}${tierBadge}</div>
                    <div class="si-desc">${desc}</div></div>
                </div>`;
            });
        }
        // Fragment crafting section
        if (D.frags) {
            const tierNames = {1:'Menor', 2:'Maior', 3:'Ancestral'};
            let hasFrags = false;
            for (const [t, cnt] of Object.entries(D.frags)) {
                if (cnt >= 3) { hasFrags = true; break; }
            }
            if (hasFrags) {
                html += `<div class="section-title" style="margin-top:10px;">${vi('hammer',14)} Forjar Runa</div>`;
                for (const [t, cnt] of Object.entries(D.frags)) {
                    if (cnt >= 3) {
                        html += `<button class="btn-equip" style="width:100%;margin-bottom:4px;font-size:11px;padding:6px;" onclick="doRuneCraft(${t},'${slot}')">${vi('hammer',12)} Forjar T${t} ${tierNames[t]||''} (${cnt}/3)</button>`;
                    } else if (cnt > 0) {
                        html += `<div style="font-size:11px;color:var(--v-text-dim);text-align:center;margin-bottom:4px;">T${t} ${tierNames[t]||''}: ${cnt}/3 fragmentos</div>`;
                    }
                }
            }
        }
        html += `<div class="detail-actions" style="margin-top:12px;">
            <button class="btn-unequip" onclick="openSlotModal('${slot}')">← Voltar</button>
        </div>`;
        showModal(html);
    }

    function doRuneCraft(tier, slot) {
        addOp({t:'rune_craft', tier: tier});
        // Decrement local fragment count
        if (D.frags && D.frags[String(tier)]) {
            D.frags[String(tier)] -= 3;
            if (D.frags[String(tier)] <= 0) delete D.frags[String(tier)];
        }
        closeModal();
        haptic('heavy');
        toast(`${vi('hammer',13)} Runa forjada! Confirme para aplicar.`, 'ok');
        updateHeader();
        renderTab();
        updateBottomBar();
    }

    function doRuneInscribe(slot, runeName) {
        const oldRune = localRunes[slot];
        if (oldRune) {
            // Confirm overwrite — old rune is destroyed
            const html = `<div class="modal-handle"></div>
                <div class="modal-title">${vi('warn',16)} Substituir Runa?</div>
                <div style="text-align:center;padding:8px;font-size:13px;color:var(--v-warning);">
                    <b>${esc(oldRune)}</b> será <b>destruída</b> permanentemente.
                </div>
                <div class="detail-actions">
                    <button class="btn-unequip" onclick="showRuneSelect('${slot}')">Cancelar</button>
                    <button class="btn-equip" onclick="_confirmRuneInscribe('${slot}','${esc(runeName)}')">${vi('orb',13)} Inscrever</button>
                </div>`;
            showModal(html);
            hapticNotify('warning');
            return;
        }
        _confirmRuneInscribe(slot, runeName);
    }

    function _confirmRuneInscribe(slot, runeName) {
        _acDirty = true;
        addOp({t:'rune_inscribe', slot, rune: runeName});
        localRunes[slot] = runeName;
        removeFromLocalInv(runeName);
        haptic('heavy');
        toast(`${vi('orb',13)} ${esc(runeName)} inscrita`, 'ok');
        openSlotModal(slot);
    }

    // ══════════════════════════════════════════════════════════
    //  ACTIONS: Equip / Unequip / Use
    // ══════════════════════════════════════════════════════════
    function doEquip(name, slot) {
        const it = getItemData(name);
        if (!it || !it.s) { console.warn('[INVENTORY] doEquip: invalid item or no slot', name); return; }

        const targetSlot = slot || resolveSlot(it);
        if (!targetSlot) { console.warn('[INVENTORY] doEquip: could not resolve slot', name); return; }

        // Check proficiency
        if (!checkProficiency(it, activeTarget, name)) {
            toast(`${vi('lock',13)} Sem proficiência`, 'err');
            return;
        }

        const eq = activeTarget === 'player' ? localEq : (localAllyEq[activeTarget] || {});

        // Two-handed logic — auto-unequip conflicting slot (Fix 5: clear gems/runes too)
        if ((it.t||[]).includes('two_handed') && targetSlot === 'main_hand') {
            if (eq.off_hand) {
                addToLocalInv(eq.off_hand);
                if (activeTarget === 'player') { returnLocalGems('off_hand'); delete localRunes['off_hand']; }
                eq.off_hand = null;
            }
        } else if (targetSlot === 'off_hand') {
            const mh = eq.main_hand;
            if (mh) {
                const mhData = getItemData(mh);
                if ((mhData?.t||[]).includes('two_handed')) {
                    addToLocalInv(mh);
                    if (activeTarget === 'player') { returnLocalGems('main_hand'); delete localRunes['main_hand']; }
                    eq.main_hand = null;
                }
            }
        }

        // Local state: return old item (Fix 3: backend handles unequip internally)
        const old = eq[targetSlot];
        if (old) {
            addToLocalInv(old);
            if (activeTarget === 'player') { returnLocalGems(targetSlot); delete localRunes[targetSlot]; }
        }

        // Single equip op — backend handles unequip of old item + gems/runes
        addOp({t:'equip', item: name, slot: targetSlot, tgt: activeTarget});
        eq[targetSlot] = name;

        closeModal();
        _acDirty = true;
        haptic('medium');
        toast(`${vi('sword',13)} ${esc(name)} equipado`, 'ok');
        updateHeader();
        animateStat('hs-ac');
        renderTab();
        updateBottomBar();
    }

    function returnLocalGems(slot) {
        const gems = localGems[slot] || [];
        gems.forEach(g => { if (g) addToLocalInv(g); });
        delete localGems[slot];
    }

    function doUnequip(slot) {
        const eq = activeTarget === 'player' ? localEq : (localAllyEq[activeTarget] || {});
        const item = eq[slot];
        if (!item) { console.warn('[INVENTORY] doUnequip: slot empty', slot); return; }

        addOp({t:'unequip', slot, tgt: activeTarget});

        // Return gems & destroy rune locally (player only)
        // Fix 4: No explicit gem_remove ops — backend handles gems in unequip
        if (activeTarget === 'player') {
            returnLocalGems(slot);
            delete localRunes[slot];
        }

        eq[slot] = null;
        addToLocalInv(item);

        closeModal();
        _acDirty = true;
        haptic('light');
        toast(`${vi('bag',13)} ${esc(item)} desequipado`, 'ok');
        updateHeader();
        renderTab();
        updateBottomBar();
    }

    function doEquipSet(sid) {
        const sdef = D.sets?.[sid];
        if (!sdef) return;
        _acDirty = true;
        const equipped = new Set(Object.values(localEq).filter(Boolean));
        const owned = new Set();
        localInv.forEach(i => { if (i.q > 0) owned.add(i.n); });
        let count = 0;
        activeTarget = 'player';
        for (const pieceName of sdef.pcs) {
            if (owned.has(pieceName) && !equipped.has(pieceName)) {
                const pit = getItemData(pieceName);
                if (!pit?.s) continue;
                if (!checkProficiency(pit, 'player', pieceName)) continue;
                const targetSlot = pit.s === 'ring' ? (!localEq.ring_1 ? 'ring_1' : 'ring_2') : pit.s;
                addOp({t:'equip', item: pieceName, slot: targetSlot, tgt: 'player'});
                localEq[targetSlot] = pieceName;
                count++;
            }
        }
        if (count > 0) {
            closeModal();
            haptic('medium');
            toast(`${vi('sword',13)} ${count} peça(s) de ${esc(sdef.n)} equipada(s)`, 'ok');
            updateHeader();
            renderTab();
            updateBottomBar();
        }
    }

    function doUse(name) {
        const it = getItemData(name);
        const tags = it?.t || [];

        // Named potion or potion tag
        if (name === 'potion' || tags.includes('potion')) {
            addOp({t:'use', item: name, tgt: activeTarget});
            removeFromLocalInv(name);
            const estHeal = it.heal ? avgDice(it.heal) : 7;
            if (activeTarget === 'player') {
                localHP = Math.min(D.p.mhp, localHP + estHeal);
            }
            closeModal();
            haptic('medium');
            toast(`${vi('flask',13)} ${esc(name)} (~+${estHeal} HP)`, 'ok');
            animateStat('hs-hp');
            updateHeader();
            renderTab();
            updateBottomBar();
            return;
        }

        // Other consumable/food
        if (tags.includes('consumable') || tags.includes('food')) {
            addOp({t:'use', item: name, tgt: activeTarget});
            removeFromLocalInv(name);
            let tgtLabel = '';
            if (activeTarget !== 'player' && D.allies) {
                const ally = D.allies.find(a => a.id === activeTarget);
                if (ally) tgtLabel = ` → ${ally.n}`;
            }
            closeModal();
            haptic('medium');
            toast(`${vi('food',13)} ${esc(name)} usado${tgtLabel}`, 'ok');
            updateHeader();
            renderTab();
            updateBottomBar();
            return;
        }
    }

    function showTargetPicker(name) {
        let html = `<div class="modal-title">${vi('target',16)} Alvo</div>`;
        html += `<div style="font-size:12px;color:var(--v-text-muted);text-align:center;margin-bottom:8px;">Quem vai consumir ${name}?</div>`;
        const hpPct = Math.round(localHP / D.p.mhp * 100);
        html += `<button class="btn-use" style="width:100%;margin-bottom:6px;" onclick="activeTarget='player';doUse('${esc(name)}')">
            ${vi('person',14)} ${D.p.n} <span style="opacity:0.7;font-size:11px;">${vi('heart',11)} ${localHP}/${D.p.mhp} (${hpPct}%)</span></button>`;
        (D.allies || []).forEach(a => {
            const aHp = a.hp, aMhp = a.mhp;
            const aPct = Math.round(aHp / aMhp * 100);
            const injured = aHp < aMhp ? '' : 'opacity:0.5;';
            html += `<button class="btn-use" style="width:100%;margin-bottom:6px;${injured}" onclick="activeTarget='${esc(a.id)}';doUse('${esc(name)}')">
                ${vi('person',14)} ${a.n} <span style="opacity:0.7;font-size:11px;">${vi('heart',11)} ${aHp}/${aMhp} (${aPct}%)</span></button>`;
        });
        html += `<button class="btn-unequip" style="width:100%;margin-top:4px;" onclick="closeModal()">Cancelar</button>`;
        showModal(html);
    }

    function doUsePotion() {
        if (localPotions <= 0) return;
        addOp({t:'use', item: 'potion', tgt: 'player'});
        localPotions--;
        localHP = Math.min(D.p.mhp, localHP + 7);
        haptic('medium');
        toast(`${vi('flask',13)} Poção de Cura usada (~+7 HP)`, 'ok');
        animateStat('hs-hp');
        updateHeader();
        renderTab();
        updateBottomBar();
    }

    function showCampConfirm(name) {
        const isTent = name === 'Barraca';
        const tentUses = D.p.tu || 0;
        const hpGain = D.p.mhp - localHP;
        const mpGain = D.p.mmp - localMP;
        const maxHD = D.p.mhd || D.p.l || 1;
        const curHD = D.p.hd || 0;
        const hdGain = Math.min(maxHD - curHD, Math.max(1, Math.floor((maxHD + 1) / 2)));

        let html = '<div style="text-align:center;padding:12px;">';
        html += `<div style="font-size:20px;margin-bottom:8px;">${vi('tent',18)} Descanso Longo</div>`;
        if (isTent && tentUses > 0) {
            const bars = Array.from({length: 5}, (_, i) =>
                `<span style="color:${i < tentUses ? 'var(--v-success)' : 'var(--v-text-dim)'}">${i < tentUses ? '■' : '□'}</span>`
            ).join('');
            html += `<div style="font-size:13px;margin-bottom:8px;">Barraca: ${bars} <span style="opacity:0.7">${tentUses}/5 usos</span></div>`;
        }
        html += '<div style="font-size:13px;color:var(--v-text-dim);margin-bottom:12px;">';
        html += `Recuperação estimada:<br>`;
        html += `${vi('heart',12)} +${hpGain} HP &nbsp; ${vi('orb',12)} +${mpGain} MP`;
        if (hdGain > 0) html += ` &nbsp; 🎲 +${hdGain} HD`;
        html += '</div>';
        html += `<div class="detail-actions">
            <button class="btn-unequip" onclick="closeModal()">Cancelar</button>
            <button class="btn-use" onclick="doCamp('${esc(name)}')">${vi('tent',13)} Acampar</button>
        </div>`;
        html += '</div>';
        showModal(html);
    }

    function doCamp(name) {
        addOp({t:'use', item: name, tgt: 'player'});
        const hpGain = D.p.mhp - localHP;
        const mpGain = D.p.mmp - localMP;
        localHP = D.p.mhp;
        localMP = D.p.mmp;
        // Tent durability
        if (name === 'Barraca' && D.p.tu != null) {
            D.p.tu--;
            if (D.p.tu <= 0) {
                removeFromLocalInv(name);
                // Check for another tent
                const another = localInv.find(i => i.n === 'Barraca' && i.q > 0);
                D.p.tu = another ? 5 : null;
            }
        }
        closeModal();
        haptic('heavy');
        let msg = `${vi('tent',13)} Descanso Longo: +${hpGain} HP, +${mpGain} MP`;
        toast(msg, 'ok');
        animateStat('hs-hp');
        animateStat('hs-mp');
        updateHeader();
        renderTab();
        updateBottomBar();
    }

    function doToggleFav(name) {
        const idx = localFavs.indexOf(name);
        if (idx >= 0) {
            localFavs.splice(idx, 1);
            addOp({t:'toggle_fav', item: name, val: false});
            toast(`${vi('star',13)} ${esc(name)} removido dos favoritos`, 'ok');
        } else {
            localFavs.push(name);
            addOp({t:'toggle_fav', item: name, val: true});
            toast(`${vi_f('star',13)} ${esc(name)} favoritado`, 'ok');
        }
        haptic('light');
        renderTab();
        updateBottomBar();
    }

    function doSell(name, price) {
        addOp({t:'sell', item: name});
        removeFromLocalInv(name);
        localGold += price;
        closeModal();
        haptic('medium');
        toast(`${vi('coin',13)} ${esc(name)} vendido por ${price} GP`, 'ok');
        animateStat('hs-gold');
        updateHeader();
        renderTab();
        updateBottomBar();
    }

    function canDiscard(it, tags) {
        return !tags.some(t => SELL_PROTECTED.has(t));
    }

    function doDiscard(name) {
        addOp({t:'discard', item: name});
        removeFromLocalInv(name);
        closeModal();
        haptic('heavy');
        toast(`${vi('trash',13)} ${esc(name)} descartado`, 'warn');
        updateHeader();
        renderTab();
        updateBottomBar();
    }

    // ── Selection Mode (batch discard/sell) ──
    function toggleSelectionMode() {
        selectionMode = !selectionMode;
        selectedItems.clear();
        updateSelectionBar();
        renderTab();
    }

    function toggleSelectItem(name) {
        if (selectedItems.has(name)) selectedItems.delete(name);
        else selectedItems.add(name);
        haptic('light');
        updateSelectionBar();
        renderTab();
    }

    function updateSelectionBar() {
        const bar = document.getElementById('selectionBar');
        if (!bar) return;
        if (selectionMode && selectedItems.size > 0) {
            bar.classList.remove('hidden');
            bar.innerHTML = `
                <span class="sel-count">${selectedItems.size} selecionado(s)</span>
                <button class="btn-sell" style="padding:6px 10px;font-size:12px;" onclick="sellSelected()">${vi('coin',12)} Vender</button>
                <button style="padding:6px 10px;font-size:12px;background:var(--v-danger);color:#fff;border:none;border-radius:6px;cursor:pointer;" onclick="discardSelected()">${vi('trash',12)} Descartar</button>`;
        } else {
            bar.classList.add('hidden');
            bar.innerHTML = '';
        }
    }

    function sellSelected() {
        const names = [...selectedItems];
        let totalGP = 0;
        const sellable = [];
        names.forEach(name => {
            const it = getItemData(name);
            const tags = it.t || [];
            if (isProtected(tags)) return;
            const inv = localInv.find(i => i.n === name);
            if (!inv || inv.q <= 0) return;
            const price = Math.max(1, Math.floor((it.v || 1) * 0.5));
            sellable.push({name, price, qty: 1});
            totalGP += price;
        });
        if (!sellable.length) { toast(`${vi('warn',13)} Nenhum item vendível`, 'warn'); return; }
        let html = '<div style="text-align:center;padding:12px;">';
        html += `<div style="font-size:20px;margin-bottom:8px;">${vi('coin',18)} Vender Selecionados</div>`;
        html += `<div style="font-size:13px;color:var(--v-text-dim);margin-bottom:12px;">
            Vender <b>${sellable.length}</b> item(ns) por <b>${totalGP} GP</b>? (50% do valor)</div>`;
        html += '<div style="font-size:12px;color:var(--v-text-dim);margin-bottom:14px;">';
        sellable.forEach(s => {
            const it = getItemData(s.name);
            html += `${it.e||'📦'} ${s.name} → ${s.price} GP<br>`;
        });
        html += '</div>';
        html += `<div class="detail-actions">
            <button class="btn-unequip" onclick="closeModal()">Cancelar</button>
            <button class="btn-sell" onclick="confirmSellSelected()">${vi('coin',13)} Vender ${totalGP} GP</button>
        </div></div>`;
        showModal(html);
    }

    function confirmSellSelected() {
        let totalGP = 0;
        [...selectedItems].forEach(name => {
            const it = getItemData(name);
            const tags = it.t || [];
            if (isProtected(tags)) return;
            const inv = localInv.find(i => i.n === name);
            if (!inv || inv.q <= 0) return;
            const price = Math.max(1, Math.floor((it.v || 1) * 0.5));
            addOp({t:'sell', item: name});
            removeFromLocalInv(name);
            totalGP += price;
            localGold += price;
        });
        selectedItems.clear();
        selectionMode = false;
        closeModal();
        updateSelectionBar();
        haptic('medium');
        toast(`${vi('coin',13)} Vendidos: +${totalGP} GP`, 'ok');
        animateStat('hs-gold');
        updateHeader();
        renderTab();
        updateBottomBar();
    }

    function discardSelected() {
        const names = [...selectedItems];
        const discardable = [];
        names.forEach(name => {
            const it = getItemData(name);
            const tags = it.t || [];
            if (isProtected(tags)) return;
            const inv = localInv.find(i => i.n === name);
            if (!inv || inv.q <= 0) return;
            discardable.push(name);
        });
        if (!discardable.length) { toast(`${vi('warn',13)} Nenhum item descartável`, 'warn'); return; }
        let html = '<div style="text-align:center;padding:12px;">';
        html += `<div style="font-size:20px;margin-bottom:8px;">${vi('trash',18)} Descartar Selecionados</div>`;
        html += `<div style="font-size:13px;color:var(--v-text-dim);margin-bottom:12px;">
            Descartar <b>${discardable.length}</b> item(ns)? <b>Ação irreversível!</b></div>`;
        html += '<div style="font-size:12px;color:var(--v-text-dim);margin-bottom:14px;">';
        discardable.forEach(name => {
            const it = getItemData(name);
            html += `${it.e||'📦'} ${name}<br>`;
        });
        html += '</div>';
        html += `<div class="detail-actions">
            <button class="btn-unequip" onclick="closeModal()">Cancelar</button>
            <button style="padding:10px 16px;font-size:13px;background:var(--v-danger);color:#fff;border:none;border-radius:8px;cursor:pointer;" onclick="confirmDiscardSelected()">${vi('trash',13)} Descartar</button>
        </div></div>`;
        showModal(html);
    }

    function confirmDiscardSelected() {
        let count = 0;
        [...selectedItems].forEach(name => {
            const it = getItemData(name);
            const tags = it.t || [];
            if (isProtected(tags)) return;
            const inv = localInv.find(i => i.n === name);
            if (!inv || inv.q <= 0) return;
            addOp({t:'discard', item: name});
            removeFromLocalInv(name);
            count++;
        });
        selectedItems.clear();
        selectionMode = false;
        closeModal();
        updateSelectionBar();
        haptic('heavy');
        toast(`${vi('trash',13)} ${count} item(ns) descartado(s)`, 'warn');
        updateHeader();
        renderTab();
        updateBottomBar();
    }

    function doExtractAllGems(slot) {
        const gems = localGems[slot] || [];
        let count = 0;
        for (let i = 0; i < gems.length; i++) {
            if (gems[i]) {
                addOp({t:'gem_remove', slot, idx: i});
                addToLocalInv(gems[i]);
                count++;
            }
        }
        localGems[slot] = gems.map(() => null);
        closeModal();
        haptic('medium');
        toast(`${vi('gem',13)} ${count} gema(s) extraída(s)`, 'ok');
        renderTab();
        updateBottomBar();
    }

    const JUNK_TAGS = new Set(['junk', 'monster_part']);
    function getJunkItems() {
        return localInv.filter(inv => {
            if (inv.q <= 0) return false;
            const it = getItemData(inv.n);
            const tags = it.t || [];
            if (!tags.some(t => JUNK_TAGS.has(t))) return false;
            if (isEquippedAnywhere(inv.n)) return false;
            if (isFav(inv.n)) return false;
            if (tags.some(t => SELL_PROTECTED.has(t))) return false;
            return true;
        });
    }

    function doSellJunk() {
        const junk = getJunkItems();
        if (!junk.length) { toast('Nenhum lixo para vender.', 'warn'); return; }
        let totalGP = 0;
        let totalItems = 0;
        junk.forEach(inv => {
            const it = getItemData(inv.n);
            const price = Math.max(1, Math.floor((it.v || 1) * 0.6));
            totalGP += price * inv.q;
            totalItems += inv.q;
        });
        // Confirm modal
        let html = '<div style="text-align:center;padding:12px;">';
        html += `<div style="font-size:20px;margin-bottom:8px;">${vi('coin',18)} Vender Lixo</div>`;
        html += `<div style="font-size:13px;color:var(--v-text-dim);margin-bottom:12px;">
            Vender <b>${totalItems}</b> itens de despojos por <b>${totalGP} GP</b>? (60% do valor)</div>`;
        html += '<div style="font-size:12px;color:var(--v-text-dim);margin-bottom:14px;">';
        junk.forEach(inv => {
            const it = getItemData(inv.n);
            html += `${it.e||'📦'} ${inv.n} x${inv.q}<br>`;
        });
        html += '</div>';
        html += `<div class="detail-actions">
            <button class="btn-unequip" onclick="closeModal()">Cancelar</button>
            <button class="btn-sell" onclick="confirmSellJunk()">${vi('coin',13)} Vender ${totalGP} GP</button>
        </div>`;
        html += '</div>';
        showModal(html);
    }

    function confirmSellJunk() {
        addOp({t:'sell_junk'});
        const junk = getJunkItems();
        let totalGP = 0;
        junk.forEach(inv => {
            const it = getItemData(inv.n);
            const price = Math.max(1, Math.floor((it.v || 1) * 0.6));
            totalGP += price * inv.q;
        });
        // Remove all junk from local inventory
        const junkNames = new Set(junk.map(j => j.n));
        localInv = localInv.filter(inv => !junkNames.has(inv.n));
        localGold += totalGP;
        closeModal();
        haptic('medium');
        toast(`${vi('coin',13)} Lixo vendido: +${totalGP} GP`, 'ok');
        animateStat('hs-gold');
        updateHeader();
        renderTab();
        updateBottomBar();
    }

    // ══════════════════════════════════════════════════════════
    //  CONFIRM & SEND
    // ══════════════════════════════════════════════════════════
    function showConfirmModal() {
        if (!pendingOps.length) return;

        let html = '<div class="modal-handle"></div>';
        html += `<div class="modal-title">${vi('listIcon',16)} Confirmar Alterações</div>`;
        html += `<div style="font-size:12px;color:var(--v-text-dim);text-align:center;margin-bottom:8px;">${pendingOps.length} operação(ões)</div>`;
        html += '<div class="confirm-ops-list">';
        pendingOps.forEach(op => {
            html += `<div class="confirm-op">${formatOp(op)}</div>`;
        });
        html += '</div>';
        html += `<div class="detail-actions" style="margin-top:12px;">
            <button class="btn-unequip" onclick="closeModal()">Cancelar</button>
            <button class="btn-equip" onclick="sendOps()">${vi_f('check',13)} Confirmar</button>
        </div>`;
        showModal(html);
    }

    function formatOp(op) {
        const tgtLabel = op.tgt && op.tgt !== 'player' ? ` → ${getAllyName(op.tgt)}` : '';
        switch(op.t) {
            case 'equip': return `${vi('sword',13)} Equipar ${op.item}${tgtLabel}`;
            case 'unequip': return `${vi('bag',13)} Desequipar ${SLOT_NAMES[op.slot]||op.slot}${tgtLabel}`;
            case 'use': return `${vi('flask',13)} Usar ${op.item}${tgtLabel}`;
            case 'gem_insert': return `${vi('gem',13)} Encaixar ${op.gem} em ${SLOT_NAMES[op.slot]||op.slot}`;
            case 'gem_remove': return `${vi('gem',13)} Remover gema de ${SLOT_NAMES[op.slot]||op.slot}`;
            case 'rune_inscribe': return `${vi('orb',13)} Inscrever ${op.rune} em ${SLOT_NAMES[op.slot]||op.slot}`;
            case 'sell': return `${vi('coin',13)} Vender ${op.item}`;
            case 'discard': return `${vi('trash',13)} Descartar ${op.item}`;
            case 'sell_junk': return `${vi('coin',13)} Vender lixo`;
            case 'save_loadout': return `${vi('save',13)} Salvar loadout '${op.name}'`;
            case 'load_loadout': return `${vi('sword',13)} Carregar loadout '${op.name}'`;
            case 'delete_loadout': return `${vi('trash',13)} Deletar loadout '${op.name}'`;
            case 'rune_craft': return `${vi('hammer',13)} Forjar runa T${op.tier}`;
            case 'toggle_fav': return `${op.val ? vi_f('star',13) : vi('star',13)} ${op.val ? 'Favoritar' : 'Desfavoritar'} ${op.item}`;
            default: return `? ${op.t}`;
        }
    }

    // ── API communication (fetch mode) ──
    const _urlParams = new URLSearchParams(location.search);
    const _apiBase = _urlParams.get('api') || '';
    const _apiToken = _urlParams.get('token') || '';
    const _apiUid = _urlParams.get('uid') || '';

    let _sendRetries = 0;
    function sendOps() {
        if (!pendingOps.length) return;

        closeModal();
        const overlay = document.getElementById('loadingOverlay');
        overlay.querySelector('.loading-text').textContent = 'Aplicando alterações...';
        overlay.classList.remove('hidden');

        if (_apiBase) {
            // API mode: send via fetch() — reliable
            _sendViaAPI(overlay);
        } else if (tg) {
            // Legacy mode: sendData (may not work from inline buttons)
            _sendViaSendData(overlay);
        } else {
            console.warn('[INVENTORY] sendData (dev mode):', JSON.stringify({ops: pendingOps}).slice(0, 200));
            overlay.classList.add('hidden');
            toast('Dados enviados (dev)', 'ok');
        }
    }

    async function _sendViaAPI(overlay) {
        try {
            const resp = await fetch(_apiBase + '/api/inventory/apply', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + _apiToken,
                },
                body: JSON.stringify({user_id: _apiUid, ops: pendingOps}),
            });
            const result = await resp.json();
            if (resp.ok && result.ok) {
                pendingOps = [];
                overlay.classList.add('hidden');
                if (result.summary) toast(result.summary, 'ok');
                else toast(`${vi('check',13)} Alterações salvas!`, 'ok');
                updateBottomBar();
                // Close webapp after brief delay so user sees the toast
                setTimeout(() => { try { tg.close(); } catch(_) {} }, 800);
            } else {
                console.error('[INVENTORY] API error:', result.error || resp.status);
                overlay.classList.add('hidden');
                toast(`${vi('warn',13)} Erro: ${result.error || 'falha no servidor'}`, 'err');
            }
        } catch(e) {
            console.error('[INVENTORY] fetch failed:', e);
            overlay.classList.add('hidden');
            toast(`${vi('warn',13)} Sem conexão. Tente novamente.`, 'err');
        }
    }

    function _sendViaSendData(overlay) {
        const token = _urlParams.get('token') || '';
        const data = {
            action: 'inventory_batch',
            token: token,
            ops: pendingOps,
        };
        try {
            tg.sendData(JSON.stringify(data));
            _sendRetries = 0;
            // Safety: close webapp if sendData didn't auto-close
            setTimeout(() => { try { tg.close(); } catch(_) {} }, 300);
            // Extra safety: if still open after 2s, hide overlay and inform user
            setTimeout(() => {
                if (document.visibilityState !== 'hidden') {
                    overlay.classList.add('hidden');
                    pendingOps = [];
                    updateBottomBar();
                    toast(`${vi('check',13)} Enviado! Feche a mochila.`, 'ok');
                }
            }, 2000);
        } catch(e) {
            console.error('[INVENTORY] sendData failed (attempt ' + (_sendRetries+1) + ')', e);
            overlay.classList.add('hidden');
            _sendRetries++;
            if (_sendRetries >= 3) {
                toast(`${vi('warn',13)} Falha ao enviar. Feche e reabra a mochila.`, 'err');
            } else {
                toast(`${vi('warn',13)} Erro ao enviar. Toque em Confirmar para tentar novamente.`, 'err');
            }
        }
    }

    // ══════════════════════════════════════════════════════════
    //  HELPERS
    // ══════════════════════════════════════════════════════════
    function getItemData(name) {
        const d = (D.items || {})[name];
        if (!d && name) console.warn('[INVENTORY] Item not in DB:', name);
        return d || {};
    }

    function avgDice(formula) {
        const m = (formula || '').match(/(\d+)d(\d+)\+?(\d+)?/);
        if (!m) return 4;
        return Math.round(parseInt(m[1]) * (parseInt(m[2]) + 1) / 2 + parseInt(m[3] || 0));
    }

    function getItemShortDesc(name, it) {
        let parts = [];
        if (it.dd) parts.push(it.dd + (it.b ? `+${it.b}` : ''));
        if (it.ac) parts.push(`CA+${it.ac}`);
        if (it.hb) parts.push(`HP+${it.hb}`);
        if (it.mb) parts.push(`MP+${it.mb}`);
        if (it.ib) parts.push(`INT+${it.ib}`);
        if (it.sb) parts.push(`Salv.+${it.sb}`);
        if (it.sp) parts.push(`Furt${vi('stealth',11)}`);
        if (it.heal) parts.push(it.heal);
        if (!parts.length && it.v) parts.push(`${it.v}gp`);
        return parts.join(' · ');
    }

    function isEquippedAnywhere(name) {
        for (const v of Object.values(localEq)) { if (v === name) return true; }
        for (const aeq of Object.values(localAllyEq)) {
            for (const v of Object.values(aeq)) { if (v === name) return true; }
        }
        return false;
    }

    function isFav(name) { return localFavs.includes(name); }

    function isProtected(tags) {
        const prot = ['quest','mission_item','key','map','map_fragment','no_sell','no_discard','story_item','unique'];
        return tags.some(t => prot.includes(t));
    }

    function isConsumable(tags) {
        return tags.some(t => ['consumable','food','potion','camping'].includes(t));
    }

    const SELL_PROTECTED = new Set([
        'quest','mission_item','key','map','map_fragment',
        'no_sell','no_discard','story_item','unique'
    ]);
    function canSell(it, tags) {
        if (!it.v || it.v <= 0) return false;
        return !tags.some(t => SELL_PROTECTED.has(t));
    }

    function checkProficiency(it, target, itemName) {
        const tags = it.t || [];
        if (tags.includes('clothing')) return true;
        if (!tags.includes('armor') && !tags.includes('weapon')) return true;

        let profs = [];
        if (target === 'player') {
            profs = D.p.prof || [];
        } else {
            const ally = (D.allies || []).find(a => a.id === target);
            profs = ally ? (ally.prof || []) : [];
        }
        // Match tag (category) OR specific weapon/item name
        return tags.some(t => profs.includes(t)) || (itemName && profs.includes(itemName));
    }

    function resolveSlot(it) {
        const slot = it.s;
        if (!slot) return null;
        if (slot === 'ring') {
            const eq = activeTarget === 'player' ? localEq : (localAllyEq[activeTarget] || {});
            if (!eq.ring_1) return 'ring_1';
            if (!eq.ring_2) return 'ring_2';
            return 'ring_1';
        }
        return slot;
    }

    function getCompatibleItems(slot) {
        const result = [];
        const targetProfs = activeTarget === 'player'
            ? (D.p.prof || [])
            : ((D.allies || []).find(a => a.id === activeTarget)?.prof || []);

        localInv.forEach(inv => {
            if (inv.q <= 0) return;
            const it = getItemData(inv.n);
            if (!it.s) return;

            // Slot match
            let slotMatch = false;
            if (it.s === 'ring' && (slot === 'ring_1' || slot === 'ring_2')) slotMatch = true;
            else if (it.s === slot) slotMatch = true;
            if (!slotMatch) return;

            // Proficiency
            const tags = it.t || [];
            if (tags.includes('clothing')) { result.push({name: inv.n}); return; }
            if (!tags.includes('armor') && !tags.includes('weapon')) { result.push({name: inv.n}); return; }
            if (tags.some(t => targetProfs.includes(t))) result.push({name: inv.n});
        });
        return result;
    }

    function compareItemsDetailed(newIt, oldIt, slot) {
        if (!newIt) return { cls: '', delta: '', score: 0 };
        if (!oldIt) oldIt = {ac:0,b:0,hb:0,mb:0};

        // Calculate stat differences
        const diffs = [];
        const acDiff = (newIt.ac||0) - (oldIt.ac||0);
        const atkDiff = (newIt.b||0) - (oldIt.b||0);
        const hpDiff = (newIt.hb||0) - (oldIt.hb||0);
        const mpDiff = (newIt.mb||0) - (oldIt.mb||0);

        const dmgDiff = (newIt.dd ? avgDice(newIt.dd) : 0) - (oldIt.dd ? avgDice(oldIt.dd) : 0);

        if (dmgDiff !== 0) diffs.push({ label: 'Dano', val: dmgDiff });
        if (acDiff !== 0) diffs.push({ label: 'CA', val: acDiff });
        if (atkDiff !== 0) diffs.push({ label: 'ATK', val: atkDiff });
        if (hpDiff !== 0) diffs.push({ label: 'HP', val: hpDiff });
        if (mpDiff !== 0) diffs.push({ label: 'MP', val: mpDiff });

        if (!diffs.length) return { cls: '', delta: '', score: 0 };

        // Overall assessment: sum of positive and negative
        const totalVal = diffs.reduce((s, d) => s + d.val, 0);
        const cls = totalVal > 0 ? 'better' : totalVal < 0 ? 'worse' : '';

        // Build delta badge
        const deltaHtml = diffs.map(d => {
            const sign = d.val > 0 ? '+' : '';
            const dcls = d.val > 0 ? 'up' : 'down';
            return `<span class="compat-delta ${dcls}">${sign}${d.val} ${d.label}</span>`;
        }).join(' ');

        return { cls, delta: `<div style="display:flex;gap:3px;flex-wrap:wrap;justify-content:flex-end;">${deltaHtml}</div>`, score: totalVal };
    }

    function getStatDelta(newIt, oldIt, slot) {
        const diffs = [];
        const check = (label, nv, ov) => { if (nv !== ov) diffs.push({ label, val: nv - ov }); };
        check('Dano', newIt.dd ? avgDice(newIt.dd) : 0, oldIt.dd ? avgDice(oldIt.dd) : 0);
        check('CA', newIt.ac||0, oldIt.ac||0);
        check('ATK', newIt.b||0, oldIt.b||0);
        check('HP', newIt.hb||0, oldIt.hb||0);
        check('MP', newIt.mb||0, oldIt.mb||0);
        if (!diffs.length) return '';
        return diffs.map(d => {
            const sign = d.val > 0 ? '+' : '';
            const color = d.val > 0 ? 'var(--v-success)' : 'var(--v-danger)';
            return `<span style="color:${color};font-weight:600;">${sign}${d.val} ${d.label}</span>`;
        }).join(' ');
    }

    function getSetIcon(setId) {
        if (D.sets && D.sets[setId]) return D.sets[setId].i;
        return '🔗';
    }

    function getAllyName(npcId) {
        const ally = (D.allies || []).find(a => a.id === npcId);
        return ally ? ally.n : npcId;
    }

    // ── Local inventory management ──
    function addToLocalInv(name) {
        const existing = localInv.find(i => i.n === name);
        if (existing) { existing.q++; }
        else { localInv.push({n: name, q: 1, id: 'new'}); }
    }

    function removeFromLocalInv(name) {
        const existing = localInv.find(i => i.n === name);
        if (existing) {
            existing.q--;
            if (existing.q <= 0) {
                localInv = localInv.filter(i => i.n !== name);
            }
        } else {
            console.warn('[INVENTORY] removeFromLocalInv: not found:', name);
        }
    }

    // ── Operations ──
    function addOp(op) {
        pendingOps.push(op);
        updateBottomBar();
    }

    function updateBottomBar() {
        const count = document.getElementById('opsCount');
        const btn = document.getElementById('confirmBtn');
        if (pendingOps.length > 0) {
            count.innerHTML = `${vi('quill',13)} ${pendingOps.length} alteração(ões) · <span style="color:var(--v-text-dim);cursor:pointer;text-decoration:underline;" onclick="resetAllOps()">descartar</span>`;
            btn.classList.remove('hidden');
        } else {
            count.textContent = '';
            btn.classList.add('hidden');
        }
    }

    function resetAllOps() {
        pendingOps = [];
        localEq = Object.assign({}, D.eq || {});
        localInv = (D.inv || []).map(i => ({...i}));
        localGold = D.p.g || 0;
        localHP = D.p.hp || 0;
        localMP = D.p.mp || 0;
        localPotions = D.p.pot || 0;
        localFavs = D.fav ? [...D.fav] : [];
        localGems = {};
        if (D.gems) {
            for (const [k,v] of Object.entries(D.gems))
                localGems[k] = [...v];
        }
        localRunes = D.runes ? {...D.runes} : {};
        localAllyEq = {};
        if (D.allies) {
            for (const a of D.allies)
                localAllyEq[a.id] = Object.assign({}, a.eq || {});
        }
        closeModal();
        updateHeader();
        renderTab();
        updateBottomBar();
        haptic('light');
        toast(`${vi('sparkle',13)} Alterações descartadas`, 'warn');
    }

    // ── Modal ──
    let _modalOpen = false;
    function showModal(html) {
        document.getElementById('modalContent').innerHTML = html;
        document.getElementById('modalOverlay').classList.add('visible');
        if (!_modalOpen) {
            _modalOpen = true;
            history.pushState({modal: true}, '');
        }
    }

    function closeModal() {
        document.getElementById('modalOverlay').classList.remove('visible');
        if (_modalOpen) {
            _modalOpen = false;
            // Pop the modal state we pushed, without triggering popstate handler
            try { history.back(); } catch(e) {}
        }
    }

    function closeModalOutside(e) {
        if (e.target === document.getElementById('modalOverlay')) closeModal();
    }

    // ── Swipe to dismiss ──
    function initSwipeToDismiss() {
        const modal = document.getElementById('modalContent');
        let startY = 0, currentY = 0, isDragging = false;

        modal.addEventListener('touchstart', e => {
            const handle = modal.querySelector('.modal-handle');
            if (!handle) return;
            // Only activate if touching near the top (handle area)
            const rect = modal.getBoundingClientRect();
            const touchY = e.touches[0].clientY - rect.top;
            if (touchY > 40) return;
            startY = e.touches[0].clientY;
            isDragging = true;
            modal.style.transition = 'none';
        }, { passive: true });

        modal.addEventListener('touchmove', e => {
            if (!isDragging) return;
            currentY = e.touches[0].clientY;
            const diff = currentY - startY;
            if (diff > 0) {
                modal.style.transform = `translateY(${diff}px)`;
            }
        }, { passive: true });

        modal.addEventListener('touchend', () => {
            if (!isDragging) return;
            isDragging = false;
            modal.style.transition = 'transform 0.3s ease-out';
            const diff = currentY - startY;
            if (diff > 100) {
                closeModal();
            }
            modal.style.transform = '';
        }, { passive: true });
    }

    // ── Back button (Telegram + Android native) ──
    function initBackButton() {
        if (tg?.BackButton) {
            tg.BackButton.show();
            tg.BackButton.onClick(() => {
                if (_modalOpen) {
                    _modalOpen = false;
                    document.getElementById('modalOverlay').classList.remove('visible');
                } else {
                    tg.close();
                }
            });
        }
        // Android native back (popstate)
        window.addEventListener('popstate', (e) => {
            if (_modalOpen) {
                _modalOpen = false;
                document.getElementById('modalOverlay').classList.remove('visible');
            }
        });
    }

    // ── Toast ──
    function toast(msg, type) {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();
        if (type === 'err') hapticNotify('error');
        else if (type === 'warn') hapticNotify('warning');
        const el = document.createElement('div');
        el.className = `toast toast-${type||'ok'}`;
        el.innerHTML = msg;
        // Dynamic position above bottom bar (Fix 12)
        const bar = document.getElementById('bottomBar');
        const barH = bar ? bar.offsetHeight : 80;
        el.style.bottom = (barH + 12) + 'px';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 2000);
    }

    // ── Escape for onclick attributes & HTML context ──
    function esc(s) {
        return (s||'').replace(/\\/g, '\\\\').replace(/&/g,'&amp;').replace(/</g,'&lt;')
            .replace(/>/g,'&gt;').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    }

    // ── Start ──
    init();
