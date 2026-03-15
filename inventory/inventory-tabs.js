// ═════════════════════════════════════════════════════════
//  INVENTORY — Tab Rendering
//  Items tab, Equipment tab, Auto-Equip, Allies tab, Bank tab
//  Depends on: inventory.js (state, SVGs, rarity, header globals)
// ═════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════
//  TAB 1: ITEMS
// ══════════════════════════════════════════════════════════
function renderItemsTab(c) {
    // Handle stripped items (payload too large)
    if (D.items_stripped) {
        c.innerHTML = '<div class="empty-state"><div class="icon">' + vi('warn', 32) + '</div>'
            + '<p>Inventário muito grande para exibir aqui. Use o bot para gerenciar seus itens.</p></div>';
        return;
    }
    const counts = getFilterCounts();
    const filters = [
        { id: 'all', label: 'Todos', cnt: counts.all },
        { id: 'fav', label: `${vi_f('star', 13)} Favoritos`, cnt: counts.fav },
        { id: 'equip', label: `${vi('sword', 13)} Equip`, cnt: counts.equip },
        { id: 'use', label: `${vi('flask', 13)} Consumíveis`, cnt: counts.use },
        { id: 'gem', label: `${vi('gem', 13)} Gemas`, cnt: counts.gem },
        { id: 'rune', label: `${vi('orb', 13)} Runas`, cnt: counts.rune },
        { id: 'misc', label: `${vi('bag', 13)} Outros`, cnt: counts.misc },
    ];

    let html = '';

    // Search bar + sort
    html += `<div class="search-bar">
            <div class="search-wrap">
                <input type="text" placeholder="Buscar item..." value="${esc(searchQuery)}"
                    oninput="onSearch(this.value)" id="searchInput">
                <button class="search-clear ${searchQuery ? 'visible' : ''}" onclick="clearSearch()" id="searchClear">&times;</button>
            </div>
            <div class="sort-btn ${selectionMode ? 'active' : ''}" onclick="toggleSelectionMode()" title="Modo seleção">
                ${selectionMode ? vi_f('check', 14) : vi('check', 14)}
            </div>
            <div class="sort-btn ${sortMode !== 'default' ? 'active' : ''}" onclick="cycleSort()">
                ${SORT_LABELS[sortMode]}
            </div>
        </div>`;

    // Filters with counts
    html += '<div class="filters">';
    filters.forEach(f => {
        const cntBadge = f.cnt > 0 ? `<span class="filter-count">(${f.cnt})</span>` : '';
        html += `<div class="filter-btn ${f.id === activeFilter ? 'active' : ''}"
                onclick="setFilter('${f.id}')">${f.label}${cntBadge}</div>`;
    });
    html += '</div>';

    // Quick action: Sell Junk
    const _junkItems = getJunkItems();
    const junkCount = _junkItems.reduce((sum, j) => sum + j.q, 0);
    if (junkCount > 0 && !searchQuery) {
        let junkGP = 0;
        _junkItems.forEach(inv => {
            const jit = getItemData(inv.n);
            junkGP += Math.max(1, Math.floor((jit.v || 1) * 0.6)) * inv.q;
        });
        html += `<div style="text-align:right;margin-bottom:6px;">
                <span class="btn-sell-junk" onclick="doSellJunk()">${vi('coin', 13)} Vender Lixo (${junkCount}) · ${junkGP}gp</span>
            </div>`;
    }

    // Potion counter card (basic potions, separate from inventory)
    if (localPotions > 0 && (activeFilter === 'all' || activeFilter === 'use')
        && (!searchQuery || 'poção de cura'.includes(searchQuery))) {
        html += `<div style="margin-bottom:10px;"><div class="item-grid">
                <div class="item-card rarity-common fade-in" onclick="showPotionConfirm()" style="grid-column: span 2;
                    display:flex;align-items:center;gap:12px;padding:12px;">
                    <span style="font-size:clamp(22px,6vw,28px);">${vi('flask', 28)}</span>
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
                ${vi('warn', 13)} Mostrando 40 de ${D.trunc} itens. Use o bot para gerenciar os demais.
            </div>`;
    }

    const items = getSortedFilteredItems();
    if (!items.length && localPotions <= 0) {
        const emptyMsg = searchQuery ? 'Nenhum item encontrado para a busca.' : 'Nenhum item encontrado.';
        html += `<div class="empty-state"><div class="icon">${vi('bag', 32)}</div><p>${emptyMsg}</p></div>`;
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
            html += `<div class="item-card rarity-${rarity} ${equipped ? 'equipped-marker' : ''} fade-in"
                    onclick="${clickAction}" ${selectionMode && !canSelect ? 'style="opacity:0.4;"' : ''}>
                    ${selectionMode ? `<div class="sel-check ${isSelected ? 'active' : ''}">${isSelected ? vi_f('check', 12) : ''}</div>` : ''}
                    <div class="ic-badges">
                        ${inv.q > 1 ? `<span class="ic-qty">x${inv.q}</span>` : ''}
                        ${equipped ? '<span class="ic-eq-badge">Equipado</span>' : ''}
                        ${setId ? `<span class="ic-set-badge">${getSetIcon(setId)}</span>` : ''}
                    </div>
                    ${!selectionMode && isFav(inv.n) ? `<span class="ic-fav">${vi_f('star', 14)}</span>` : ''}
                    <div class="ic-emoji">${it.e || '📦'}</div>
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
    const eq = activeTarget === 'player' ? localEq : (localAllyEq[activeTarget] || {});

    // Sub-navigation: show who's equipment we're viewing
    if (D.allies && D.allies.length > 0) {
        html += '<div class="ally-equip-nav">';
        const playerActive = activeTarget === 'player' ? ' active' : '';
        const pName = D.p?.n || 'Personagem';
        html += `<button class="ally-equip-nav-btn${playerActive}" onclick="switchEquipTarget('player')">${pName}</button>`;
        D.allies.forEach(a => {
            const allyActive = activeTarget === a.id ? ' active' : '';
            html += `<button class="ally-equip-nav-btn${allyActive}" onclick="switchEquipTarget('${esc(a.id)}')">${a.ico || '⚔️'} ${a.n}</button>`;
        });
        html += '</div>';
    }

    // Stats summary + sets + loadouts (player only)
    if (activeTarget === 'player') {
        html += buildStatsSummary();
        html += buildSetProgress();
        html += buildLoadoutBar();
    } else {
        // Show ally header with stats
        const ally = D.allies.find(a => a.id === activeTarget);
        if (ally) {
            const hpPct = ally.mhp > 0 ? Math.round((ally.hp / ally.mhp) * 100) : 0;
            html += `<div class="ally-equip-header">
                <span>${ally.ico} <b>${ally.n}</b> · ${ally.c} Lv${ally.l}</span>
                <span>❤️ ${ally.hp}/${ally.mhp} · ${vi('shield', 12)} CA ${ally.ac}</span>
            </div>`;
        }
    }

    // Auto-equip button (player only)
    if (activeTarget === 'player') {
        html += `<div class="auto-equip-row">
            <button class="auto-equip-btn" onclick="doAutoEquip()">
                ${vi('sparkle', 14)} Auto-Equipar
            </button>
        </div>`;
    }

    // Body silhouette with slot positions
    html += '<div class="body-equip">';
    html += _buildBodySilhouette(eq);
    html += '</div>';

    c.innerHTML = html;
}

function _buildBodySilhouette(eq) {
    // Layout: body SVG in center, slots arranged around it
    // Left column: head, shoulders, chest, hands, legs, feet
    // Right column: necklace, cloak, main_hand, off_hand, belt, rings
    // The body silhouette is a CSS background, slots are positioned on a grid

    const LEFT_SLOTS = [
        { slot: 'head',      row: 1 },
        { slot: 'shoulders', row: 2 },
        { slot: 'chest',     row: 3 },
        { slot: 'hands',     row: 4 },
        { slot: 'legs',      row: 5 },
        { slot: 'feet',      row: 6 },
    ];
    const RIGHT_SLOTS = [
        { slot: 'necklace',  row: 1 },
        { slot: 'cloak',     row: 2 },
        { slot: 'main_hand', row: 3 },
        { slot: 'off_hand',  row: 4 },
        { slot: 'belt',      row: 5 },
        { slot: 'ring_1',    row: 6 },
    ];
    const BOTTOM_SLOTS = ['ring_2', 'map'];

    let html = '<div class="body-grid">';

    // Left column
    html += '<div class="body-col body-col-left">';
    LEFT_SLOTS.forEach(s => { html += _buildBodySlot(s.slot, eq); });
    html += '</div>';

    // Center body silhouette
    html += `<div class="body-center">
        <svg class="body-svg" viewBox="0 0 80 180" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Outer glow -->
            <defs>
                <filter id="glow"><feGaussianBlur stdDeviation="1.5" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            </defs>
            <g filter="url(#glow)" opacity="0.85">
                <!-- Head -->
                <circle cx="40" cy="16" r="10" stroke="rgba(196,149,58,0.35)" stroke-width="1.2" fill="rgba(196,149,58,0.04)"/>
                <!-- Neck -->
                <line x1="40" y1="26" x2="40" y2="34" stroke="rgba(196,149,58,0.25)" stroke-width="1"/>
                <!-- Shoulders + Torso outline -->
                <path d="M18 38 Q22 34 40 34 Q58 34 62 38 L60 56 L56 88 L50 92 L30 92 L24 88 L20 56 Z"
                      stroke="rgba(196,149,58,0.3)" stroke-width="1.2" fill="rgba(196,149,58,0.03)" stroke-linejoin="round"/>
                <!-- Belt -->
                <line x1="26" y1="86" x2="54" y2="86" stroke="rgba(196,149,58,0.2)" stroke-width="1"/>
                <!-- Left Arm -->
                <path d="M20 40 Q14 55 10 72 Q8 78 12 82" stroke="rgba(196,149,58,0.25)" stroke-width="1" fill="none" stroke-linecap="round"/>
                <!-- Right Arm -->
                <path d="M60 40 Q66 55 70 72 Q72 78 68 82" stroke="rgba(196,149,58,0.25)" stroke-width="1" fill="none" stroke-linecap="round"/>
                <!-- Left Leg -->
                <path d="M32 92 Q30 120 28 148 Q27 156 24 164" stroke="rgba(196,149,58,0.25)" stroke-width="1" fill="none"/>
                <!-- Right Leg -->
                <path d="M48 92 Q50 120 52 148 Q53 156 56 164" stroke="rgba(196,149,58,0.25)" stroke-width="1" fill="none"/>
                <!-- Feet -->
                <path d="M24 164 Q20 168 18 168 L30 168" stroke="rgba(196,149,58,0.2)" stroke-width="0.8" fill="none"/>
                <path d="M56 164 Q60 168 62 168 L50 168" stroke="rgba(196,149,58,0.2)" stroke-width="0.8" fill="none"/>
            </g>
        </svg>
    </div>`;

    // Right column
    html += '<div class="body-col body-col-right">';
    RIGHT_SLOTS.forEach(s => { html += _buildBodySlot(s.slot, eq); });
    html += '</div>';

    html += '</div>'; // close body-grid

    // Bottom row for remaining slots
    html += '<div class="body-bottom-row">';
    BOTTOM_SLOTS.forEach(s => { html += _buildBodySlot(s, eq); });
    html += '</div>';

    return html;
}

function _buildBodySlot(slot, eq) {
    const item = eq[slot] || null;
    const it = item ? getItemData(item) : null;
    const filled = item ? 'filled' : '';
    const icon = item ? (it?.e || '📦') : getSlotEmptyIcon(slot);
    const label = SLOT_NAMES[slot] || slot;
    const shortName = item ? (item.length > 14 ? item.slice(0, 12) + '…' : item) : '—';
    const rarity = item ? (it?.r || 'common') : '';
    const rarityBorder = rarity && item ? `border-color:${getRarityColor(rarity)};` : '';

    // Upgrade indicator (uses cached compat list)
    let upgradeDot = '';
    if (activeTarget === 'player' && !item) {
        if (_getCompatCached(slot).length > 0) upgradeDot = '<span class="bs-upgrade-dot"></span>';
    } else if (activeTarget === 'player' && item) {
        const hasUpgrade = _getCompatCached(slot).some(ci => {
            if (ci.name === item) return false;
            const cit = getItemData(ci.name);
            const { cls } = compareItemsDetailed(cit, it || { ac: 0, b: 0, hb: 0, mb: 0 }, slot);
            return cls === 'better';
        });
        if (hasUpgrade) upgradeDot = '<span class="bs-upgrade-dot"></span>';
    }

    // Gem/rune indicators
    let gemDots = '';
    if (activeTarget === 'player' && item) {
        const sockets = it?.sk || 0;
        const gems = localGems[slot] || [];
        const rune = localRunes[slot];
        if (sockets > 0 || rune) {
            gemDots = '<div class="bs-gems">';
            for (let i = 0; i < sockets; i++) {
                gemDots += `<span class="bs-gem ${gems[i] ? 'bs-gem-filled' : ''}"></span>`;
            }
            if (rune) gemDots += `<span class="bs-rune">${vi('orb', 8)}</span>`;
            gemDots += '</div>';
        }
    }

    return `<div class="body-slot ${filled}" onclick="openSlotModal('${slot}')" style="${rarityBorder}">
        ${upgradeDot}
        <div class="bs-icon">${icon}</div>
        <div class="bs-text">
            <div class="bs-label">${label}</div>
            <div class="bs-name">${shortName}</div>
        </div>
        ${gemDots}
    </div>`;
}

// ─── Auto-Equip Logic ───
function doAutoEquip() {
    _invalidateEquipCache();
    if (activeTarget !== 'player') return;
    haptic('medium');

    const SLOT_LIST = ['head', 'chest', 'shoulders', 'hands', 'legs', 'feet',
                       'main_hand', 'off_hand', 'necklace', 'ring_1', 'ring_2',
                       'belt', 'cloak', 'map'];
    let equipped = 0;

    SLOT_LIST.forEach(slot => {
        const currentItem = localEq[slot] || null;
        const currentData = currentItem ? getItemData(currentItem) : { ac: 0, b: 0, hb: 0, mb: 0 };
        const compat = getCompatibleItems(slot);
        if (!compat.length) return;

        // Find best item for this slot
        let bestName = currentItem;
        let bestScore = _calcItemScore(currentData, slot);

        compat.forEach(ci => {
            if (ci.name === currentItem) return;
            // Skip items already equipped in other slots
            const alreadyEquipped = Object.entries(localEq).some(
                ([s, n]) => s !== slot && n === ci.name
            );
            if (alreadyEquipped) return;

            const cit = getItemData(ci.name);
            const score = _calcItemScore(cit, slot);
            if (score > bestScore) {
                bestScore = score;
                bestName = ci.name;
            }
        });

        if (bestName && bestName !== currentItem) {
            // Queue equip operation
            if (currentItem) {
                pendingOps.push({ t: 'unequip', slot, target: 'player' });
                localEq[slot] = null;
            }
            pendingOps.push({ t: 'equip', item: bestName, slot, target: 'player' });
            localEq[slot] = bestName;
            // Remove from inventory
            const invItem = localInv.find(i => i.n === bestName);
            if (invItem && invItem.q > 0) invItem.q--;
            equipped++;
        }
    });

    if (equipped > 0) {
        localAC = calcLocalAC();
        updateHeader();
        renderTab();
        toast(`⚔️ ${equipped} equipamento(s) otimizado(s)!`, 'ok');
    } else {
        toast('✅ Já está com os melhores equipamentos!', 'ok');
    }
}

function _calcItemScore(it, slot) {
    if (!it) return 0;
    let score = 0;
    // Weapon slots prioritize damage bonus
    if (slot === 'main_hand' || slot === 'off_hand') {
        score += (it.b || 0) * 10;
        // Parse damage die (e.g., "1d8" = avg 4.5)
        if (it.dd) {
            const dm = it.dd.match(/(\d+)d(\d+)/);
            if (dm) score += parseInt(dm[1]) * (parseInt(dm[2]) + 1) / 2;
        }
    }
    // Armor slots prioritize AC
    score += (it.ac || 0) * 8;
    // HP/MP bonuses are always good
    score += (it.hb || 0) * 3;
    score += (it.mb || 0) * 3;
    // General bonus
    score += (it.b || 0) * 5;
    // Rarity as tiebreaker
    const rarityScores = { common: 0, uncommon: 1, rare: 2, very_rare: 3, legendary: 4 };
    score += (rarityScores[it.r] || 0) * 0.5;
    return score;
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
    if (totalAC) parts.push(`${vi('shield', 13)} CA <b>+${totalAC}</b>`);
    if (totalATK) parts.push(`${vi('sword', 13)} ATK <b>+${totalATK}</b>`);
    if (totalHP) parts.push(`${vi('heart', 13)} HP <b>+${totalHP}</b>`);
    if (totalMP) parts.push(`${vi('orb', 13)} MP <b>+${totalMP}</b>`);
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
            const icon = owned.has(p) ? vi_f('check', 13) : vi('check', 13);
            html += `<div class="set-piece ${cls}">${icon} ${p}</div>`;
        });
        html += '</div>';
        // Thresholds
        for (const [th, label] of Object.entries(sdef.th)) {
            const active = count >= parseInt(th);
            html += `<div class="set-bonus ${active ? 'active' : 'inactive'}">${active ? vi('sparkle', 13) : vi('lock', 13)} ${th}/${sdef.pcs.length}: ${label}</div>`;
        }
        // Equip set button — only if player has unequipped pieces
        const equipped = new Set(Object.values(localEq).filter(Boolean));
        const canEquipPieces = sdef.pcs.filter(p => owned.has(p) && !equipped.has(p));
        if (canEquipPieces.length > 0) {
            html += `<button class="btn-equip" style="width:100%;margin-top:6px;font-size:11px;padding:6px;" onclick="doEquipSet('${esc(sid)}')">${vi('sword', 13)} Equipar Set (${canEquipPieces.length})</button>`;
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
        c.innerHTML = `<div class="empty-state"><div class="icon">${vi('people', 32)}</div><p>Nenhum aliado no grupo.</p></div>`;
        return;
    }
    let html = '';
    D.allies.forEach(a => {
        const hpPct = a.mhp > 0 ? Math.round((a.hp / a.mhp) * 100) : 0;
        const hpCls = hpPct > 75 ? 'bar-high' : hpPct > 40 ? 'bar-mid' : 'bar-low';
        let mpBar = '';
        if (a.mmp > 0) {
            const mpPct = a.mmp > 0 ? Math.round((a.mp / a.mmp) * 100) : 0;
            mpBar = `<div class="ally-bar-row">
                <span class="ally-bar-label">${a.res || '💧'} ${a.mp}/${a.mmp}</span>
                <div class="ally-bar-track"><div class="ally-bar-fill ally-bar-mp" style="width:${mpPct}%"></div></div>
            </div>`;
        }
        const lvlBadge = a.l > 0 ? `<span class="ally-lvl-badge">Lv${a.l}</span>` : '';
        const affBadge = a.aff > 0 ? `<span class="ally-aff-badge">❤️${a.aff}</span>` : '';
        const deadClass = a.hp <= 0 ? ' ally-dead' : '';
        html += `<div class="ally-card fade-in${deadClass}" onclick="openAllyEquip('${esc(a.id)}')">
                <div class="ally-header">
                    <span class="ally-ico">${a.ico || '⚔️'}</span>
                    <div class="ally-name-col">
                        <span class="ally-name">${a.n} ${lvlBadge}${affBadge}</span>
                        <span class="ally-class">${a.c || 'Aliado'}</span>
                    </div>
                    <span class="ally-ac">${vi('shield', 12)} ${a.ac}</span>
                </div>
                <div class="ally-bars">
                    <div class="ally-bar-row">
                        <span class="ally-bar-label">❤️ ${a.hp}/${a.mhp}</span>
                        <div class="ally-bar-track"><div class="ally-bar-fill ${hpCls}" style="width:${hpPct}%"></div></div>
                    </div>
                    ${mpBar}
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
}

function switchEquipTarget(target) {
    haptic('light');
    activeTarget = target;
    activeTab = 'equip';
    buildTabs();
    renderTab();
}

