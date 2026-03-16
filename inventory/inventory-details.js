// ═════════════════════════════════════════════════════════
//  INVENTORY — Details & Modals
//  Loadouts, item detail modal, slot modal, gem/rune actions
//  Depends on: inventory.js (state, SVGs), inventory-tabs.js
// ═════════════════════════════════════════════════════════

// ── Loadouts ──
function buildLoadoutBar() {
    const ldout = D.ldout || {};
    const names = Object.keys(ldout);
    let html = '<div style="display:flex;gap:4px;margin:6px 0;flex-wrap:wrap;align-items:center;">';
    html += `<span class="btn-sell-junk" onclick="promptSaveLoadout()" style="border-color:var(--v-gold);">${vi('save', 13)} Salvar</span>`;
    names.forEach(n => {
        html += `<span class="btn-sell-junk" style="border-color:var(--v-text-dim);display:inline-flex;align-items:center;gap:2px;">
                <span onclick="doLoadLoadout('${esc(n)}')" style="cursor:pointer;">${vi('sword', 13)} ${n}</span>
                <span onclick="event.stopPropagation();doDeleteLoadout('${esc(n)}')" style="cursor:pointer;color:var(--v-danger);opacity:0.6;font-size:14px;padding:0 2px;">×</span>
            </span>`;
    });
    html += '</div>';
    return names.length > 0 || true ? html : '';
}

function promptSaveLoadout() {
    const ldout = D.ldout = D.ldout || {};
    if (Object.keys(ldout).length >= 5) { toast(`${vi('warn', 13)} Máximo 5 loadouts`, 'err'); return; }
    showInputModal('Salvar Loadout', 'Nome do loadout', 20, (name) => {
        ldout[name] = Object.assign({}, localEq);
        addOp({ t: 'save_loadout', name });
        haptic('medium');
        toast(`${vi('save', 13)} '${esc(name)}' salvo`, 'ok');
        renderTab();
        updateBottomBar();
    });
}

function showInputModal(title, placeholder, maxLen, onConfirm) {
    const html = `<div class="modal-handle"></div>
            <div class="modal-title">${vi('save', 16)} ${title}</div>
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
    const results = { ok: [], noItem: [], noProf: [] };
    for (const [slot, itemName] of Object.entries(ldout)) {
        if (!itemName) continue;
        const inv = localInv.find(i => i.n === itemName && i.q > 0);
        if (!inv) { results.noItem.push(itemName); continue; }
        const it = getItemData(itemName);
        if (!it?.s) { results.noItem.push(itemName); continue; }
        if (!checkProficiency(it, 'player', itemName)) { results.noProf.push(itemName); continue; }
        addOp({ t: 'equip', item: itemName, slot, tgt: 'player' });
        localEq[slot] = itemName;
        results.ok.push(itemName);
    }
    closeModal();
    haptic('medium');
    updateHeader();
    renderTab();
    updateBottomBar();
    // Show feedback modal
    const total = Object.values(ldout).filter(Boolean).length;
    _showLoadoutFeedback(name, results, total);
}

function _showLoadoutFeedback(name, results, total) {
    let html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">' + vi('sword', 16) + ' Loadout \'' + esc(name) + '\'</div>';
    html += '<div style="text-align:center;font-size:14px;margin-bottom:10px;">';
    html += '<b>' + results.ok.length + '</b> de <b>' + total + '</b> itens equipados</div>';
    if (results.ok.length > 0) {
        html += '<div style="font-size:12px;margin-bottom:6px;">';
        results.ok.forEach(function(n) {
            var it = getItemData(n);
            html += '<div style="color:var(--v-success);">' + vi_f('check', 12) + ' ' + (it.e || '') + ' ' + n + '</div>';
        });
        html += '</div>';
    }
    if (results.noItem.length > 0) {
        html += '<div style="font-size:12px;margin-bottom:6px;">';
        results.noItem.forEach(function(n) {
            var it = getItemData(n);
            html += '<div style="color:var(--v-danger);">' + vi('warn', 12) + ' ' + (it.e || '') + ' ' + n + ' — n\u00e3o encontrado</div>';
        });
        html += '</div>';
    }
    if (results.noProf.length > 0) {
        html += '<div style="font-size:12px;margin-bottom:6px;">';
        results.noProf.forEach(function(n) {
            var it = getItemData(n);
            html += '<div style="color:var(--v-warning);">' + vi('lock', 12) + ' ' + (it.e || '') + ' ' + n + ' — sem profici\u00eancia</div>';
        });
        html += '</div>';
    }
    html += '<div class="detail-actions" style="margin-top:10px;">';
    html += '<button class="btn-equip" onclick="closeModal()">' + vi_f('check', 13) + ' OK</button>';
    html += '</div>';
    showModal(html);
}

function doDeleteLoadout(name) {
    if (!D.ldout || !D.ldout[name]) return;
    delete D.ldout[name];
    addOp({ t: 'delete_loadout', name });
    haptic('medium');
    toast(`${vi('trash', 13)} Loadout '${esc(name)}' removido`, 'ok');
    renderTab();
    updateBottomBar();
}

// ══════════════════════════════════════════════════════════
//  TAB 4: BANK (read-only)
// ══════════════════════════════════════════════════════════
function renderBankTab(c) {
    if (!D.bank) {
        c.innerHTML = `<div class="empty-state"><div class="icon">${vi('vault', 32)}</div><p>Cofre vazio.</p></div>`;
        return;
    }
    let html = `<div class="vault-header">
            <div class="vault-amount">${vi('coin', 22)} ${D.bank.g || 0} GP</div>
            <div class="vault-sub">Ouro guardado no cofre</div>
        </div>`;
    const items = D.bank.i || [];
    if (items.length > 0) {
        html += `<div class="section-title">${vi('bag', 14)} Itens Guardados (${items.length})</div>`;
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
        html += `<div class="empty-state"><div class="icon">${vi('vault', 32)}</div><p>Cofre vazio.</p></div>`;
    }
    c.innerHTML = html;
}

// ══════════════════════════════════════════════════════════
//  ITEM DETAIL MODAL
// ══════════════════════════════════════════════════════════
function openItemDetail(name) {
    // Phase 3: Mark item as viewed (removes blue dot)
    if (typeof markItemViewed === 'function') markItemViewed(name);
    const it = getItemData(name);
    const inv = localInv.find(i => i.n === name);
    const qty = inv ? inv.q : 0;
    const rarity = it.r || 'common';
    const tags = it.t || [];
    const rarColor = getRarityColor(rarity);

    let html = '<div class="modal-handle"></div>';
    html += `<div class="modal-title">${it.e || '📦'} ${name}</div>`;
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
    if (it.sk) html += detailRow('Engastes', `${it.sk} ${vi('gem', 13)}`);
    if (it.sr) html += detailRow('Força Req.', it.sr);
    if (it.th) html += detailRow('Duas Mãos', 'Sim');
    if (it.heal) {
        const avg = avgDice(it.heal);
        const m = (it.heal || '').match(/(\d+)d(\d+)\+?(\d+)?/);
        const lo = m ? parseInt(m[1]) + parseInt(m[3] || 0) : avg;
        const hi = m ? parseInt(m[1]) * parseInt(m[2]) + parseInt(m[3] || 0) : avg;
        const preview = Math.min(D.p.mhp, localHP + avg) - localHP;
        html += detailRow('Cura', `${it.heal} (${lo}–${hi})`);
        if (preview > 0) html += detailRow('Preview', `${vi('heart', 12)} ${localHP} → ~${localHP + preview}`, 'bonus');
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

    // Comparison with equipped (if equippable) — Diablo IV style panel
    if (it.s) {
        const slot = resolveSlot(it);
        const eq = activeTarget === 'player' ? localEq : (localAllyEq[activeTarget] || {});
        const currentItem = eq[slot];
        if (currentItem === name) {
            html += `<div style="margin-top:8px;padding:8px;background:var(--v-bg-card);border-radius:var(--v-radius);font-size:12px;text-align:center;">
                    <span style="color:var(--v-success);">${vi_f('check', 13)} Equipado neste slot</span>
                </div>`;
        } else {
            html += _buildComparisonPanel(it, currentItem, slot);
        }
    }

    // Action buttons
    html += '<div class="detail-actions">';
    const favIcon = isFav(name) ? vi_f('star', 16) : vi('star', 16);
    html += `<button class="btn-unequip" onclick="doToggleFav('${esc(name)}');openItemDetail('${esc(name)}')"
            style="flex:0 0 44px;padding:10px;">${favIcon}</button>`;
    const lockIcon = isLocked(name) ? vi('lock', 16) : vi('unlock', 16);
    const lockCls = isLocked(name) ? 'border-color:var(--v-gold-dim)!important;color:var(--v-gold);' : '';
    html += `<button class="btn-unequip" onclick="doToggleLock('${esc(name)}');openItemDetail('${esc(name)}')"
            style="flex:0 0 44px;padding:10px;${lockCls}">${lockIcon}</button>`;
    if (it.s && !isProtected(tags)) {
        const canEquip = checkProficiency(it, activeTarget, name);
        if (canEquip) {
            html += `<button class="btn-equip" onclick="showEquipConfirm('${esc(name)}')">${vi('sword', 13)} Equipar</button>`;
        } else {
            html += `<button class="btn-disabled" disabled>${vi('lock', 13)} Sem proficiência</button>`;
        }
    }
    if (isConsumable(tags) && qty > 0) {
        const isCamping = tags.includes('camping');
        const isFood = tags.includes('food');
        const isPotion = tags.includes('potion');
        const hasAllies = D.allies && D.allies.length > 0;
        if (isCamping) {
            html += `<button class="btn-use" onclick="showCampConfirm('${esc(name)}')">${vi('tent', 13)} Acampar ▸</button>`;
        } else if ((isFood || isPotion) && hasAllies) {
            html += `<button class="btn-use" onclick="showTargetPicker('${esc(name)}')">${vi('flask', 13)} Usar ▸</button>`;
        } else {
            html += `<button class="btn-use" onclick="showUseConfirm('${esc(name)}')">${vi('flask', 13)} Usar</button>`;
        }
    }
    if (canSell(it, tags) && qty > 0 && !isEquippedAnywhere(name) && !isLocked(name)) {
        const sellPrice = Math.max(1, Math.floor((it.v || 1) * 0.5));
        html += `<button class="btn-sell" onclick="showSellConfirm('${esc(name)}',${sellPrice})">${vi('coin', 13)} ${sellPrice}gp</button>`;
    }
    if (canDiscard(it, tags) && qty > 0 && !isEquippedAnywhere(name) && !isLocked(name)) {
        html += `<button class="btn-discard" onclick="showDiscardConfirm('${esc(name)}')" style="flex:0 0 44px;padding:10px;">${vi('trash', 14)}</button>`;
    }
    html += '</div>';

    showModal(html);
}

// ── Diablo IV-style Comparison Panel ──
function _buildComparisonPanel(newIt, currentItemName, slot) {
    const curIt = currentItemName ? getItemData(currentItemName) : null;
    const stats = [
        { key: 'ac', label: 'CA', icon: 'shield' },
        { key: 'b', label: 'ATK', icon: 'sword' },
        { key: 'hb', label: 'HP', icon: 'heart' },
        { key: 'mb', label: 'MP', icon: 'orb' },
    ];

    let newDmg = 0, curDmg = 0;
    if (newIt.dd) { const m = newIt.dd.match(/(\d+)d(\d+)/); if (m) newDmg = parseInt(m[1]) * (parseInt(m[2]) + 1) / 2; }
    if (curIt && curIt.dd) { const m = curIt.dd.match(/(\d+)d(\d+)/); if (m) curDmg = parseInt(m[1]) * (parseInt(m[2]) + 1) / 2; }
    const showDmg = newDmg > 0 || curDmg > 0;

    let totalDelta = 0;
    let rows = '';

    stats.forEach(s => {
        const nv = newIt[s.key] || 0;
        const cv = curIt ? (curIt[s.key] || 0) : 0;
        const d = nv - cv;
        if (nv === 0 && cv === 0) return;
        totalDelta += d;
        const cls = d > 0 ? 'cp-up' : d < 0 ? 'cp-down' : 'cp-same';
        const sign = d > 0 ? '+' : '';
        rows += `<div class="cp-row">
            <span class="cp-label">${vi(s.icon, 12)} ${s.label}</span>
            <span class="cp-cur">${cv}</span>
            <span class="cp-arrow">→</span>
            <span class="cp-new ${cls}">${nv}</span>
            <span class="cp-delta ${cls}">${d !== 0 ? sign + d : '—'}</span>
        </div>`;
    });

    if (showDmg) {
        const d = Math.round((newDmg + (newIt.b || 0)) - (curDmg + (curIt ? curIt.b || 0 : 0)));
        totalDelta += d;
        const cls = d > 0 ? 'cp-up' : d < 0 ? 'cp-down' : 'cp-same';
        const sign = d > 0 ? '+' : '';
        const nvStr = newDmg > 0 ? newIt.dd + (newIt.b ? '+' + newIt.b : '') : '—';
        const cvStr = curDmg > 0 ? curIt.dd + (curIt.b ? '+' + curIt.b : '') : '—';
        rows += `<div class="cp-row">
            <span class="cp-label">${vi('target', 12)} Dano</span>
            <span class="cp-cur">${cvStr}</span>
            <span class="cp-arrow">→</span>
            <span class="cp-new ${cls}">${nvStr}</span>
            <span class="cp-delta ${cls}">${d !== 0 ? sign + d : '—'}</span>
        </div>`;
    }

    if (!rows) return '';

    const summaryClass = totalDelta > 0 ? 'cp-up' : totalDelta < 0 ? 'cp-down' : 'cp-same';
    const summarySign = totalDelta > 0 ? '+' : '';
    const summaryText = totalDelta > 0 ? 'Melhoria' : totalDelta < 0 ? 'Perda' : 'Equivalente';
    const vsLabel = currentItemName ? `vs ${currentItemName}` : 'Slot vazio';

    return `<div class="comparison-panel">
        <div class="cp-header">
            <span class="cp-title">${vi('sword', 13)} Comparação</span>
            <span class="cp-vs">${vsLabel}</span>
        </div>
        ${rows}
        <div class="cp-summary ${summaryClass}">
            ${summaryText}: <b>${summarySign}${totalDelta}</b>
        </div>
    </div>`;
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
        html += `<div style="text-align:center;font-size:18px;margin-bottom:4px;">${it?.e || '📦'}</div>`;
        html += `<div style="text-align:center;font-size:14px;font-weight:600;margin-bottom:2px;" class="v-rarity-${rarity}">${item}</div>`;
        html += `<div style="text-align:center;margin-bottom:6px;">
                <span class="detail-rarity-badge" style="background:${rarColor}22;color:${rarColor};border:1px solid ${rarColor}44;font-size:10px;">
                    ${getRarityLabel(rarity)}
                </span></div>`;
        if (it?.dd) html += `<div style="text-align:center;font-size:12px;color:var(--v-text-dim);">Dano: ${it.dd}${it.b ? ' +' + it.b : ''}</div>`;
        if (it?.ac) html += `<div style="text-align:center;font-size:12px;color:var(--v-text-dim);">CA: +${it.ac}</div>`;
        if (it?.hb) html += `<div style="text-align:center;font-size:12px;color:var(--v-text-dim);">HP: +${it.hb}</div>`;
        if (it?.mb) html += `<div style="text-align:center;font-size:12px;color:var(--v-text-dim);">MP: +${it.mb}</div>`;
        if (it?.sp) html += `<div style="text-align:center;font-size:11px;color:#ef5350;">${vi('stealth', 12)} Desvantagem em Furtividade</div>`;

        // Gems section (player only)
        if (activeTarget === 'player') {
            const sockets = it?.sk || 0;
            if (sockets > 0) {
                html += `<div class="section-title">${vi('gem', 14)} Gemas</div>`;
                html += '<div class="gem-grid">';
                const gems = localGems[slot] || [];
                for (let i = 0; i < sockets; i++) {
                    const gem = gems[i] || null;
                    const gemData = gem ? getItemData(gem) : null;
                    const filled = gem ? 'filled' : '';
                    const icon = gem ? (gemData?.e || '💎') : '+';
                    html += `<div class="gem-socket ${filled}" onclick="gemAction('${slot}',${i},'${esc(gem || '')}')"
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
                                onclick="doExtractAllGems('${slot}')">${vi('gem', 12)} Extrair Todas (${gemNames.length})</button>
                        </div>`;
                }
            }

            // Rune section
            if (RUNE_ELIGIBLE.has(slot)) {
                html += `<div class="section-title">${vi('orb', 14)} Runa</div>`;
                const rune = localRunes[slot] || null;
                if (rune) {
                    const runeData = getItemData(rune);
                    html += `<div class="rune-slot filled" onclick="runeAction('${slot}')">
                            <div style="font-size:16px;">${runeData?.e || '🔮'} ${rune}</div>
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
                <button class="btn-unequip" onclick="doUnequip('${slot}')">${vi('bag', 13)} Desequipar</button>
            </div>`;
    } else {
        html += '<div style="text-align:center;color:var(--v-text-dim);padding:12px;">Slot vazio</div>';
    }

    // Compatible items — compact 4-col quick-preview grid
    html += `<div class="section-title">${vi('bag', 14)} Itens Compatíveis</div>`;
    const compatItems = getCompatibleItems(slot);
    if (compatItems.length === 0) {
        html += '<div style="font-size:12px;color:var(--v-text-dim);text-align:center;">Nenhum item compatível no inventário.</div>';
    } else {
        const withDelta = compatItems.map(ci => {
            const cit = getItemData(ci.name);
            const { cls: compCls, delta, score } = compareItemsDetailed(cit, it, slot);
            return { ci, cit, compCls, delta, score: score || 0 };
        });
        withDelta.sort((a, b) => b.score - a.score);

        html += '<div class="compat-quick-grid">';
        withDelta.forEach(({ ci, cit, compCls, score }) => {
            const arrow = compCls === 'better' ? '<span class="cq-badge cq-up">▲</span>'
                        : compCls === 'worse' ? '<span class="cq-badge cq-down">▼</span>'
                        : '';
            const rarity = cit?.r || 'common';
            html += `<div class="cq-item rarity-${rarity}" onclick="doEquip('${esc(ci.name)}','${slot}')">
                    ${arrow}
                    <div class="cq-emoji">${cit?.e || '📦'}</div>
                    <div class="cq-name v-rarity-${rarity}">${ci.name}</div>
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
                <div class="modal-title">${vi('gem', 16)} Remover Gema?</div>
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
    addOp({ t: 'gem_remove', slot, idx });
    const gems = localGems[slot] || [];
    gems[idx] = null;
    localGems[slot] = gems;
    addToLocalInv(gemName);
    haptic('medium');
    toast(`${vi('gem', 13)} ${esc(gemName)} removida`, 'ok');
    openSlotModal(slot);
}

function showGemSelect(slot, idx) {
    const gems = localInv.filter(i => {
        const it = getItemData(i.n);
        return it && (it.t || []).some(t => t === 'gem' || t === 'socketable');
    });

    let html = '<div class="modal-handle"></div>';
    html += `<div class="modal-title">${vi('gem', 16)} Selecionar Gema</div>`;
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
                    <span class="si-emoji">${it.e || '💎'}</span>
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
    addOp({ t: 'gem_insert', slot, gem: gemName, idx });
    const sockets = (getItemData(localEq[slot]) || {}).sk || 0;
    if (!localGems[slot]) localGems[slot] = Array(sockets).fill(null);
    localGems[slot][idx] = gemName;
    removeFromLocalInv(gemName);
    haptic('medium');
    toast(`${vi('gem', 13)} ${esc(gemName)} encaixada`, 'ok');
    openSlotModal(slot);
}

function runeAction(slot) {
    showRuneSelect(slot);
}

function showRuneSelect(slot) {
    const currentRune = localRunes[slot] || null;
    const runes = localInv.filter(i => {
        const it = getItemData(i.n);
        return it && (it.t || []).includes('rune');
    });

    let html = '<div class="modal-handle"></div>';
    html += `<div class="modal-title">${vi('orb', 16)} Inscrever Runa</div>`;

    if (currentRune) {
        html += `<div style="background:var(--v-bg-card);border:1px solid var(--v-warning);border-radius:var(--v-radius);padding:10px;margin-bottom:10px;font-size:12px;color:var(--v-warning);text-align:center;">
                ${vi('warn', 13)} Runa atual (${currentRune}) será <b>destruída</b> ao inscrever outra.
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
                    <span class="si-emoji">${it.e || '🔮'}</span>
                    <div><div class="si-name">${r.n}${tierBadge}</div>
                    <div class="si-desc">${desc}</div></div>
                </div>`;
        });
    }
    // Fragment crafting section
    if (D.frags) {
        const tierNames = { 1: 'Menor', 2: 'Maior', 3: 'Ancestral' };
        let hasFrags = false;
        for (const [t, cnt] of Object.entries(D.frags)) {
            if (cnt >= 3) { hasFrags = true; break; }
        }
        if (hasFrags) {
            html += `<div class="section-title" style="margin-top:10px;">${vi('hammer', 14)} Forjar Runa</div>`;
            for (const [t, cnt] of Object.entries(D.frags)) {
                if (cnt >= 3) {
                    html += `<button class="btn-equip" style="width:100%;margin-bottom:4px;font-size:11px;padding:6px;" onclick="doRuneCraft(${t},'${slot}')">${vi('hammer', 12)} Forjar T${t} ${tierNames[t] || ''} (${cnt}/3)</button>`;
                } else if (cnt > 0) {
                    html += `<div style="font-size:11px;color:var(--v-text-dim);text-align:center;margin-bottom:4px;">T${t} ${tierNames[t] || ''}: ${cnt}/3 fragmentos</div>`;
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
    addOp({ t: 'rune_craft', tier: tier });
    // Decrement local fragment count
    if (D.frags && D.frags[String(tier)]) {
        D.frags[String(tier)] -= 3;
        if (D.frags[String(tier)] <= 0) delete D.frags[String(tier)];
    }
    closeModal();
    haptic('heavy');
    toast(`${vi('hammer', 13)} Runa forjada! Confirme para aplicar.`, 'ok');
    updateHeader();
    renderTab();
    updateBottomBar();
}

function doRuneInscribe(slot, runeName) {
    const oldRune = localRunes[slot];
    if (oldRune) {
        // Confirm overwrite — old rune is destroyed
        const html = `<div class="modal-handle"></div>
                <div class="modal-title">${vi('warn', 16)} Substituir Runa?</div>
                <div style="text-align:center;padding:8px;font-size:13px;color:var(--v-warning);">
                    <b>${esc(oldRune)}</b> será <b>destruída</b> permanentemente.
                </div>
                <div class="detail-actions">
                    <button class="btn-unequip" onclick="showRuneSelect('${slot}')">Cancelar</button>
                    <button class="btn-equip" onclick="_confirmRuneInscribe('${slot}','${esc(runeName)}')">${vi('orb', 13)} Inscrever</button>
                </div>`;
        showModal(html);
        hapticNotify('warning');
        return;
    }
    _confirmRuneInscribe(slot, runeName);
}

function _confirmRuneInscribe(slot, runeName) {
    _acDirty = true;
    addOp({ t: 'rune_inscribe', slot, rune: runeName });
    localRunes[slot] = runeName;
    removeFromLocalInv(runeName);
    haptic('heavy');
    toast(`${vi('orb', 13)} ${esc(runeName)} inscrita`, 'ok');
    openSlotModal(slot);
}


