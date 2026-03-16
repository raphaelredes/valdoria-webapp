/* ═══════════════════════════════════════════════
   COMBAT-UI — Entity Rendering, Pickers, Action Bars
   Lendas de Valdoria Combat WebApp
   ═══════════════════════════════════════════════ */

// ─── ARIA ANNOUNCER ───
function announce(msg) {
    var el = document.getElementById('combatAnnouncer');
    if (el) { el.textContent = ''; setTimeout(function() { el.textContent = msg; }, 50); }
}

// ─── ENTITY CARD (COMPACT + EXPANDABLE) ───
function renderEntity(e, type, idx, isActiveTurn) {
    const pct = e.mhp > 0 ? (e.hp / e.mhp) : 0;
    const hpClass = pct > 0.60 ? 'hp-high' : pct > 0.25 ? 'hp-mid' : 'hp-low';

    // Compact status icons (show max 3, overflow as +N badge)
    let statusIcons = '';
    if (e.se && e.se.length > 0) {
        if (e.se.length > 3) {
            statusIcons = e.se.slice(0, 3).map(s => STATUS_ICONS[s] || '').join('') + `<span class="status-overflow">+${e.se.length - 3}</span>`;
        } else {
            statusIcons = e.se.map(s => STATUS_ICONS[s] || '').join('');
        }
    }

    // Build expanded details
    let detailsHtml = '';
    if (type === 'enemy') {
        const atkLabel = ATK_TYPE_LABELS[e.at] || e.at || '';
        const dmgIcon = DMG_ICONS[e.dt] || '';

        detailsHtml += `<div class="bar-container">
            <div class="bar-label"><span>❤️ HP</span><span>${e.hp}/${e.mhp}</span></div>
            <div class="bar-track"><div class="bar-fill ${hpClass}" style="transform:scaleX(${pct})"></div></div>
        </div>`;
        detailsHtml += `<div class="stats-row">
            <span class="stat-item">🛡️ CA ${e.ac}</span>
            <span class="stat-item">⚔️ +${e.atk}</span>
            <span class="stat-item">${dmgIcon} ${e.dmg}</span>
            <span class="entity-badge-sm">${atkLabel}</span>
        </div>`;

        if (e.leg) {
            detailsHtml += '<div class="legendary-row">';
            detailsHtml += '<span>👑 Boss</span>';
            if (e.leg.lrm > 0) detailsHtml += `<span title="Anula falha em salvaguarda">⭐ Resist. Lend. ${e.leg.lr}/${e.leg.lrm}</span>`;
            if (e.leg.lam > 0) detailsHtml += `<span>⚡ Ações ${e.leg.la}/${e.leg.lam}</span>`;
            detailsHtml += '</div>';
        }

        if (e.se && e.se.length > 0) {
            detailsHtml += '<div class="status-pills">' + e.se.map(s => `<span class="status-pill${STATUS_BUFFS.has(s) ? ' buff status-buff' : ' status-debuff'}">${STATUS_ICONS[s] || ''} ${STATUS_PT[s] || s}</span>`).join('') + '</div>';
        }
        if (e.img && typeof showImagePopup === 'function') {
            detailsHtml += '<button class="entity-view-btn" data-img="' + escHtml(e.img) + '" data-name="' + escHtml(e.n) + '" data-desc="' + escHtml(e.desc || '') + '" data-ac="' + (e.ac || '') + '" data-atk="' + (e.atk || '') + '" data-dmg="' + escHtml(e.dmg || '') + '">🔍 Ver Criatura</button>';
        }
    } else {
        // Ally expanded — full status panel
        detailsHtml += `<div class="bar-container">
            <div class="bar-label"><span>❤️ HP</span><span>${e.hp}/${e.mhp}</span></div>
            <div class="bar-track"><div class="bar-fill ${hpClass}" style="transform:scaleX(${pct})"></div></div>
        </div>`;
        if (e.mmp > 0) {
            const mpPct = e.mmp > 0 ? (e.mp / e.mmp) : 0;
            detailsHtml += `<div class="bar-container">
                <div class="bar-label"><span>💧 MP</span><span>${e.mp}/${e.mmp}</span></div>
                <div class="bar-track"><div class="bar-fill mp-bar" style="transform:scaleX(${mpPct})"></div></div>
            </div>`;
        }
        const allyStats = [];
        if (e.ac) allyStats.push(`🛡️ CA ${e.ac}`);
        if (e.atk) allyStats.push(`⚔️ +${e.atk}`);
        if (e.dmg) allyStats.push(`🗡️ ${e.dmg}`);
        if (e.pot > 0) allyStats.push(`🧪 ${e.pot}`);
        if (allyStats.length > 0) {
            detailsHtml += '<div class="stats-row">' + allyStats.map(s => `<span class="stat-item">${s}</span>`).join('') + '</div>';
        }
        if (e.conc) {
            detailsHtml += `<div class="stats-row"><span class="stat-item conc-badge">🔮 Conc.: ${escHtml(e.conc)}</span></div>`;
        }
        if (e.se && e.se.length > 0) {
            detailsHtml += '<div class="status-pills">' + e.se.map(s => `<span class="status-pill${STATUS_BUFFS.has(s) ? ' buff status-buff' : ' status-debuff'}">${STATUS_ICONS[s] || ''} ${STATUS_PT[s] || s}</span>`).join('') + '</div>';
        }
    }

    const isDead = e.hp <= 0;
    const activeClass = isActiveTurn ? ' active-turn' : '';
    const deadClass = isDead ? ' dead' : '';
    const hpStateClass = pct > 0.75 ? '' : pct > 0.50 ? ' hp-wounded' : pct > 0.25 ? ' hp-bloodied' : pct > 0 ? ' hp-critical' : '';
    const dataAttr = type === 'enemy' ? ` data-enemy-idx="${idx}"` : '';

    // Feature 9: Position badge
    let posBadge = '';
    if (type === 'enemy' && _currentPositions) {
        const pPos = _currentPositions['player'];
        const ePos = _currentPositions[`enemy_${idx}`];
        if (pPos && ePos) {
            const dx = (pPos.x || 0) - (ePos.x || 0), dy = (pPos.y || 0) - (ePos.y || 0);
            const near = Math.sqrt(dx * dx + dy * dy) <= 1.5;
            posBadge = `<span class="pos-badge ${near ? 'near' : 'far'}">${near ? '⚔ Perto' : '🏹 Longe'}</span>`;
        }
    }

    // Enemy intent badge (Into the Breach pattern: shows next planned action)
    let intentBadge = '';
    if (type === 'enemy' && e.it) {
        const it = e.it;
        const intentCls = it.tp === 'stun' || it.tp === 'skip' ? 'intent-stun' : it.tp === 'skill' ? 'intent-skill' : 'intent-atk';
        const dmgLabel = it.dmg ? ' ' + it.dmg : '';
        intentBadge = '<span class="intent-badge ' + intentCls + '">' + (it.ic || '') + dmgLabel + '</span>';
    }

    // Inline AC badge for enemies (visible in compact view)
    const acBadge = type === 'enemy' && e.ac ? `<span class="ac-badge">🛡${e.ac}</span>` : '';

    return `<div class="entity ${type}${activeClass}${deadClass}${hpStateClass}" role="group" aria-label="${escHtml(e.n)}"${dataAttr}>
        <div class="entity-header">
            <span class="entity-icon${e.img ? ' entity-thumb' : ''}">${e.img ? '<img src="' + escHtml(e.img) + '" loading="lazy" onerror="this.parentNode.textContent=this.dataset.fb" data-fb="' + (e.ico || (type === 'enemy' ? '👹' : '🛡️')) + '">' : (e.ico || (type === 'enemy' ? '👹' : '🛡️'))}</span>
            <span class="compact-name">${escHtml(e.n)}</span>
            ${acBadge}
            <div class="hp-mini"><div class="hp-mini-fill ${hpClass}" style="transform:scaleX(${pct})"></div></div>
            <span class="hp-text-compact">${e.hp}/${e.mhp}</span>
            ${statusIcons ? `<span class="status-icons-compact">${statusIcons}</span>` : ''}
            ${posBadge}
            ${intentBadge}
            <span class="expand-arrow">▸</span>
        </div>
        <div class="entity-details">${detailsHtml}</div>
    </div>`;
}

// ─── PLAYER CARD (always shows HP + resource bars unless compact) ───
function renderPlayerCard(p, isCompact = false) {
    const hpPct = p.mhp > 0 ? (p.hp / p.mhp) : 0;
    const hpClass = hpPct > 0.60 ? 'hp-high' : hpPct > 0.25 ? 'hp-mid' : 'hp-low';
    const mpPct = p.mmp > 0 ? (p.mp / p.mmp) : 0;
    const resClass = RES_CLASS_MAP[p.res] || 'mp';
    const resIcon = RES_ICON_MAP[p.res] || '💧';
    // Low resource warning classes
    const resLowCls = mpPct <= 0.10 && mpPct > 0 ? ' res-critical' : mpPct <= 0.25 && mpPct > 0 ? ' res-low' : '';

    // Compact badges for status, cover, concentration
    const badges = [];
    if (p.se && p.se.length > 0) {
        p.se.forEach(s => badges.push(`<span class="mini-badge status${STATUS_BUFFS.has(s) ? ' buff status-buff' : ' status-debuff'}">${STATUS_ICONS[s] || ''} ${STATUS_PT[s] || s}</span>`));
    }
    if (p.cov) {
        badges.push(`<span class="mini-badge cover">${p.cov.ico} +${p.cov.ac} CA</span>`);
    }
    if (p.conc) {
        badges.push(`<span class="mini-badge conc">🔮 ${escHtml(p.conc)}</span>`);
    }
    const badgesHtml = badges.length > 0 ? `<div class="player-badge-row">${badges.join('')}</div>` : '';

    const concClass = p.conc ? ' concentrating' : '';
    const dangerClass = hpPct <= 0.25 && hpPct > 0 ? ' hp-danger' : '';
    return `<div class="entity player${concClass}${dangerClass}">
        <div class="entity-header">
            <span class="entity-icon">${p.ico || '👤'}</span>
            <span class="compact-name">${escHtml(p.n)}</span>
            <span class="player-header-stats">🛡${p.ac} ⚔+${p.atk} 🗡${p.dmg}</span>
        </div>
        <div class="player-bars" style="${isCompact ? 'display:none;' : ''}">
            <div class="bar-row">
                <span class="bar-icon">❤️</span>
                <div class="bar-track"><div class="bar-fill ${hpClass}" style="width:${hpPct * 100}%"></div></div>
                <span class="bar-val">${p.hp}/${p.mhp}</span>
            </div>
            <div class="bar-row">
                <span class="bar-icon">${resIcon}</span>
                <div class="bar-track"><div class="bar-fill ${resClass}${resLowCls}" style="transform:scaleX(${mpPct})"></div></div>
                <span class="bar-val">${p.mp}/${p.mmp}</span>
            </div>
            ${badgesHtml}
        </div>
    </div>`;
}


// ─── ACTION BAR ───
function renderActionBar(acts, enemies, player, toastHtml) {
    if (!acts) return '';
    const hitChance = acts.hit || 50;
    const fleeChance = acts.flee || 50;
    const hasSkills = acts.skills && acts.skills.length > 0;
    const itemCount = acts.items || 0;
    const hitCh = hitChance >= 65 ? 'ch-high' : hitChance >= 40 ? 'ch-mid' : 'ch-low';
    const fleeCh = fleeChance >= 65 ? 'ch-high' : fleeChance >= 40 ? 'ch-mid' : 'ch-low';

    let skillBtnText = '🧠 Habilidade';
    if (hasSkills && acts.skills.length === 1) {
        const sk = acts.skills[0];
        const skCh = sk.ch >= 65 ? 'ch-high' : sk.ch >= 40 ? 'ch-mid' : 'ch-low';
        skillBtnText = `🧠 ${sk.n} <span class="action-chance ${skCh}">${sk.ch}%</span>`;
    } else if (!hasSkills) {
        skillBtnText = `🚫 Sem ${player.res || 'Mana'}`;
    }

    return `<div class="action-bar">${toastHtml || ''}<div class="action-grid action-grid-5">
        <button class="action-btn primary" data-action="attack">⚔️ Atacar <span class="action-chance ${hitCh}">${hitChance}%</span></button>
        <button class="action-btn ${hasSkills ? '' : 'disabled'}" data-action="skill">${skillBtnText}</button>
        <button class="action-btn ${itemCount > 0 ? '' : 'disabled'}" data-action="items">🎒 Itens <span class="action-chance">(${itemCount})</span></button>
        <button class="action-btn danger" data-action="flee">🏃 Fugir <span class="action-chance ${fleeCh}">${fleeChance}%</span></button>
        <button class="action-btn pass-btn" data-action="pass">⏭️ Pular</button>
    </div></div>`;
}

// ─── BONUS ACTION BAR (D&D 5e PHB p.189) ───
function renderBonusActionBar(acts, enemies, player, toastHtml) {
    if (!acts) return '';
    const hasSkills = acts.skills && acts.skills.length > 0;
    const resName = player.res || 'Mana';

    let skillsHtml = '';
    if (hasSkills) {
        if (acts.skills.length === 1) {
            const sk = acts.skills[0];
            skillsHtml = `<button class="action-btn ba-btn" data-action="bonus_use_single" data-skill-id="${sk.id}" data-tg="${sk.tg || 'single'}">⚡ ${escHtml(sk.n)} <span class="action-chance">${sk.c} ${resName} · ${sk.ch}%</span></button>`;
        } else {
            skillsHtml = `<button class="action-btn ba-btn" data-action="bonus_skill_pick">⚡ Habilidade Bonus <span class="action-chance">(${acts.skills.length})</span></button>`;
        }
    }

    return `<div class="action-bar">${toastHtml || ''}<div class="ba-header">
        <div class="ba-label">⚡ AÇÃO BÔNUS</div>
        <div class="ba-hint">Use uma habilidade bônus ou pule.</div>
    </div><div class="action-grid">
        ${skillsHtml}
        <button class="action-btn" data-action="bonus_skip">⏭️ Pular</button>
    </div></div>`;
}

// ─── REACTION BAR (D&D 5e PHB p.190) ───
function renderReactionBar(acts, player, toastHtml) {
    if (!acts) return '';
    const hasSkills = acts.skills && acts.skills.length > 0;
    const dmg = acts.damage_taken || 0;
    const resName = player.res || 'Mana';

    let skillsHtml = '';
    if (hasSkills) {
        acts.skills.forEach(sk => {
            const ico = sk.ico || '⚡';
            const effText = sk.eff ? ` · ${escHtml(sk.eff)}` : '';
            skillsHtml += `<button class="action-btn reaction-btn" data-action="reaction_use" data-skill-id="${sk.id}">${ico} ${escHtml(sk.n)} <span class="action-chance">${sk.c} ${resName}${effText}</span></button>`;
        });
    }

    return `<div class="action-bar">${toastHtml || ''}<div class="ba-header reaction-header">
        <div class="ba-label">⚡ REAÇÃO</div>
        <div class="ba-hint">Você recebeu ${dmg} de dano. Reagir?</div>
    </div><div class="action-grid">
        ${skillsHtml}
        <button class="action-btn" data-action="reaction_skip">⏭️ Não reagir</button>
    </div></div>`;
}


// ─── EXPAND / COLLAPSE (accordion) — event delegation to avoid listener leaks ───
let _expandDelegated = false;
function bindExpandCollapse() {
    if (_expandDelegated) return;
    _expandDelegated = true;
    // Delegate to document.body — survives innerHTML replacement of #arena
    document.body.addEventListener('click', (ev) => {
        const entity = ev.target.closest('.entity:not(.player)');
        if (!entity || ev.target.closest('.action-btn') || ev.target.closest('.skill-item') || ev.target.closest('.target-item') || ev.target.closest('.item-entry') || ev.target.closest('.entity-view-btn')) return;
        const wasExpanded = entity.classList.contains('expanded');
        document.querySelectorAll('.entity.expanded').forEach(e => e.classList.remove('expanded'));
        if (!wasExpanded) entity.classList.add('expanded');
    });
}

// ─── FEED TOGGLE ───
function bindFeedToggle() {
    const toggle = document.getElementById('feedToggle');
    if (!toggle) return;
    toggle.addEventListener('click', () => {
        const feed = document.getElementById('combatFeed');
        if (!feed) return;
        const expanded = feed.classList.toggle('feed-expanded');
        toggle.textContent = expanded ? '▼ Recolher' : toggle.dataset.label || '▲ Mostrar mais';
    });
    toggle.dataset.label = toggle.textContent;
}

// ─── FEED DETAIL TOGGLE (Solasta-style D&D math expand) ───
function bindFeedDetail() {
    document.querySelectorAll('.feed-entry.has-detail').forEach(function(el) {
        el.addEventListener('click', function(ev) {
            ev.stopPropagation();
            var existing = el.querySelector('.feed-detail-expanded');
            if (existing) {
                existing.remove();
                var arrow = el.querySelector('.feed-expand-icon');
                if (arrow) arrow.textContent = '▸';
                return;
            }
            var detailText = el.getAttribute('data-detail') || '';
            if (!detailText) return;
            var div = document.createElement('div');
            div.className = 'feed-detail-expanded';
            detailText.split('\n').forEach(function(line) {
                var p = document.createElement('div');
                p.textContent = line;
                div.appendChild(p);
            });
            el.appendChild(div);
            var arrow = el.querySelector('.feed-expand-icon');
            if (arrow) arrow.textContent = '▾';
        });
    });
}

// ─── BIND ACTIONS ───
function bindActions(state) {
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Feature 4+8: Haptic + audio unlock on user gesture
            hapticSelect();
            if (!_audioUnlocked) {
                _audioUnlocked = true;
                if (_audioCtx && _audioCtx.state === 'suspended') _audioCtx.resume().catch(() => { /* audio resume optional */ });
            }
            const action = btn.dataset.action;
            if (btn.classList.contains('disabled')) {
                btn.classList.add('disabled-shake');
                setTimeout(() => btn.classList.remove('disabled-shake'), 400);
                if (action === 'skill') showCombatToast('Sem recurso suficiente para habilidades');
                else if (action === 'items') showCombatToast('Nenhum item utilizável em combate');
                return;
            }

            const enemies = state.e || [];
            const skills = state.acts?.skills || [];

            if (action === 'attack') {
                if (enemies.length > 1) {
                    showTargetPicker(enemies, 'attack');
                } else {
                    sendAction({ type: 'attack', target: 0 });
                }
            } else if (action === 'skill') {
                if (skills.length === 1) {
                    if (enemies.length > 1) {
                        showTargetPicker(enemies, 'skill', skills[0].id);
                    } else {
                        sendAction({ type: 'skill', skill_id: skills[0].id, target: 0 });
                    }
                } else if (skills.length > 1) {
                    showSkillPicker(skills, enemies, 'skill');
                }
            } else if (action === 'flee') {
                sendAction({ type: 'flee' });
            } else if (action === 'pass') {
                sendAction({ type: 'pass' });
            } else if (action === 'items') {
                const items = state.acts?.item_list || [];
                if (items.length > 0) {
                    showItemPicker(items, enemies, state.a || []);
                }
            } else if (action === 'initiative') {
                sendAction({ type: 'initiative' });
            } else if (action === 'proceed') {
                sendAction({ type: 'proceed' });
            } else if (action === 'restore') {
                sendAction({ type: 'restore' });
            }
            // D&D 5e: Bonus Action actions
            else if (action === 'bonus_skip') {
                sendAction({ type: 'bonus_skip' });
            } else if (action === 'bonus_use_single') {
                const skillId = btn.dataset.skillId;
                const tg = btn.dataset.tg || 'single';
                if (tg === 'all' || tg === 'self') {
                    sendAction({ type: 'bonus_use', skill_id: skillId, target: 0 });
                } else if (enemies.length > 1) {
                    showTargetPicker(enemies, 'bonus_use', skillId);
                } else {
                    sendAction({ type: 'bonus_use', skill_id: skillId, target: 0 });
                }
            } else if (action === 'bonus_skill_pick') {
                showSkillPicker(skills, enemies, 'bonus_use');
            }
            // D&D 5e: Reaction actions
            else if (action === 'reaction_skip') {
                sendAction({ type: 'reaction_skip' });
            } else if (action === 'reaction_use') {
                const skillId = btn.dataset.skillId;
                sendAction({ type: 'reaction_use', skill_id: skillId });
            }
            // Spectator mode: player unconscious, advance round
            else if (action === 'continue_spectator') {
                sendAction({ type: 'continue_spectator' });
            }
        });
    });
}

// ─── LOADING INDICATOR (CSS d20 spin — lightweight, no WebGL) ───
function _showActionLoading(show) {
    let el = document.getElementById('actionLoading');
    if (show) {
        if (!el) {
            el = document.createElement('div');
            el.id = 'actionLoading';
            el.className = 'action-loading';
            el.innerHTML = '<div class="loading-d20-icon"></div><span>Resolvendo<span class="loading-dots"></span></span>';
            const bar = document.querySelector('.action-bar');
            if (bar) bar.prepend(el);
        }
        el.style.display = 'flex';
    } else if (el) {
        el.remove();
    }
}

// ─── SEND ACTION ───
let _actionSent = false;
let _actionSentTimer = null;
async function sendAction(actionData) {
    if (_actionSent || _cinematicInProgress) return;
    haptic('medium');
    _actionSent = true;
    // Safety net: force-reset after 30s to prevent permanent action block
    clearTimeout(_actionSentTimer);
    _actionSentTimer = setTimeout(() => {
        if (_actionSent) {
            console.warn('[COMBAT] Action safety timeout — force reset');
            _actionSent = false;
            _showActionLoading(false);
            document.querySelectorAll('.action-btn').forEach(b => b.classList.remove('disabled'));
            startPolling();
        }
    }, 30000);
    _lastAnimatedRoll = null; // Reset dedup — next render will animate dice
    _initDiceAnimated = false; // Reset initiative dice animation for new combat
    document.querySelectorAll('.action-btn').forEach(b => b.classList.add('disabled'));
    _showActionLoading(true);
    stopTimer();
    stopPolling();

    if (isApiMode && api) {
        try {
            const result = await api.sendAction(actionData);
            clearTimeout(_actionSentTimer);
            _showActionLoading(false);
            _actionSent = false;
            if (!result) { showError('Sem resposta do servidor. Verifique sua conex\u00e3o.'); return; }
            _playCinematicResult(result, actionData.type);
        } catch (e) {
            clearTimeout(_actionSentTimer);
            _showActionLoading(false);
            _actionSent = false;
            console.error('[COMBAT] API sendAction error', e);
            const msg = (e.status === 401 || e.status === 403) ? 'Sessão expirada.'
                : e.status === 429 ? 'Muitas ações. Aguarde um momento.'
                    : 'Erro de conexão. Tente novamente.';
            showError(msg);
            // Re-enable action buttons so player can retry
            document.querySelectorAll('.action-btn').forEach(b => b.classList.remove('disabled'));
            // Don't poll immediately on rate-limit; wait 5s before resuming
            if (e.status === 429) {
                setTimeout(() => startPolling(), 5000);
            } else if (e.status !== 401 && e.status !== 403) {
                startPolling();
            }
        }
    } else {
        if (!tg) { console.warn('[COMBAT] No Telegram WebApp', actionData); _actionSent = false; return; }
        const payload = {
            action: 'combat_action',
            token: token,
            ...actionData,
        };
        tg.sendData(JSON.stringify(payload)); // noqa: preflight -- sendData is correct fallback when isApiMode=false (no API URL)
        setTimeout(() => { try { tg.close(); } catch (e) { console.warn('[COMBAT] tg.close() failed', e); } }, 1000);
    }
}



// ─── SKILL PICKER ───
function showSkillPicker(skills, enemies, actionType) {
    if (!skills || skills.length === 0) return;
    actionType = actionType || 'skill';
    const panel = document.getElementById('skillPanel');
    const overlay = document.getElementById('skillOverlay');
    _overlayOpen = true;
    const title = actionType === 'bonus_use' ? '⚡ Ação Bônus' : 'Habilidades';
    let html = `<div class="skill-panel-title">${title}</div>`;
    skills.forEach(sk => {
        const typeBadge = sk.tp === 'saving_throw' ? ' · <span class="sk-type sk-type-st">ST</span>' :
            sk.tp === 'auto' ? ' · <span class="sk-type sk-type-auto">Auto</span>' :
                sk.tp === 'heal' ? ' · <span class="sk-type sk-type-heal">Cura</span>' : '';
        const tgtBadge = sk.tg === 'all' ? ' · <span class="sk-aoe">AOE</span>' :
            sk.tg === 'self' ? ' · <span class="sk-aoe">Próprio</span>' : '';
        const effLine = sk.eff ? `<div class="skill-effect">${escHtml(sk.eff)}</div>` : '';
        const skCls = sk.tp === 'heal' ? 'sk-heal' : sk.tp === 'saving_throw' ? 'sk-save' : sk.tp === 'auto' ? 'sk-buff' : 'sk-damage';
        html += `<div class="skill-item ${skCls}" data-skill-id="${sk.id}" data-tg="${sk.tg || 'single'}">
            <div>
                <div class="skill-name">${escHtml(sk.n)}</div>
                ${effLine}
                <div class="skill-meta">Custo: ${sk.c} · Chance: ${sk.ch}%${typeBadge}${tgtBadge}</div>
            </div>
        </div>`;
    });
    html += '<div class="skill-close" id="skillClose">Cancelar</div>';
    panel.innerHTML = html;
    // Force animation re-trigger (Telegram WebView doesn't re-trigger on display change)
    panel.style.animation = 'none';
    panel.offsetHeight;
    panel.style.animation = '';
    overlay.classList.add('active');
    // Focus first item + Escape to close
    const _firstItem = panel.querySelector('.skill-item');
    if (_firstItem) _firstItem.focus();
    overlay.onkeydown = (e) => { if (e.key === 'Escape') _closeOverlay(overlay); };

    // Event delegation (prevents listener leaks on re-open)
    panel.onclick = (e) => {
        const item = e.target.closest('.skill-item');
        if (e.target.closest('#skillClose')) { _closeOverlay(overlay); return; }
        if (!item) return;
        haptic('light');
        const skillId = item.dataset.skillId;
        const tg = item.dataset.tg || 'single';
        overlay.classList.remove('active');
        if (tg === 'all' || tg === 'self') {
            _overlayOpen = false;
            sendAction({ type: actionType, skill_id: skillId, target: 0 });
        } else if (enemies.length > 1) {
            showTargetPicker(enemies, actionType, skillId);
        } else {
            _overlayOpen = false;
            sendAction({ type: actionType, skill_id: skillId, target: 0 });
        }
    };
    overlay.onclick = (e) => { if (e.target === overlay) _closeOverlay(overlay); };
}

// ─── TARGET PICKER ───
function _closeOverlay(overlay) {
    overlay.classList.remove('active');
    _overlayOpen = false;
}

function showTargetPicker(enemies, actionType, skillId) {
    const panel = document.getElementById('targetPanel');
    const overlay = document.getElementById('targetOverlay');
    _overlayOpen = true;
    let html = '<div class="skill-panel-title">Escolher Alvo</div>';
    enemies.forEach((e, i) => {
        const pct = e.mhp > 0 ? Math.round((e.hp / e.mhp) * 100) : 0;
        // Feature 6: Damage preview
        let previewHtml = '';
        const acts = currentState && currentState.acts;
        if (acts) {
            let chText = '', dmgText = '';
            if (actionType === 'attack') {
                chText = `${acts.hit || '?'}%`;
                dmgText = currentState.p ? currentState.p.dmg : '';
            } else if ((actionType === 'skill' || actionType === 'bonus_use') && skillId && acts.skills) {
                const sk = acts.skills.find(s => s.id === skillId);
                if (sk) { chText = `${sk.ch}%`; dmgText = sk.eff || ''; }
            }
            if (chText) {
                const chVal = parseInt(chText);
                const chCls = chVal >= 65 ? 'prev-hit' : chVal >= 40 ? 'prev-mid' : 'prev-miss';
                const chLabel = chVal >= 65 ? '\u{1F3AF} Prov\u00e1vel' : chVal >= 40 ? '\u26A0\uFE0F Arriscado' : '\u274C Dif\u00edcil';
                previewHtml = `<div class="target-preview"><span class="${chCls}">${chLabel} \u00b7 ${chText}</span>${dmgText ? ` \u00b7 ${escHtml(dmgText)}` : ''}</div>`;
            }
        }
        const hpColor = pct > 50 ? 'var(--v-hp-high, #5a8a3c)' : pct > 25 ? 'var(--v-hp-mid, #b88a2a)' : 'var(--v-hp-low, #a63a2a)';
        html += `<div class="target-item" data-target="${i}">
            <div><span>${e.ico || '👹'}</span> <b>${escHtml(e.n)}</b>${previewHtml}</div>
            <div class="skill-meta">${e.hp}/${e.mhp} HP (${pct}%)</div>
            <div class="target-hp-bar"><div class="target-hp-fill" style="transform:scaleX(${pct/100});background:${hpColor}"></div></div>
        </div>`;
    });
    html += '<div class="skill-close" id="targetClose">Cancelar</div>';
    panel.innerHTML = html;
    panel.style.animation = 'none';
    panel.offsetHeight;
    panel.style.animation = '';
    overlay.classList.add('active');
    // Focus first item + Escape to close
    const _firstTarget = panel.querySelector('.target-item');
    if (_firstTarget) _firstTarget.focus();
    overlay.onkeydown = (e) => { if (e.key === 'Escape') _closeOverlay(overlay); };

    // Event delegation (prevents listener leaks on re-open)
    panel.onclick = (e) => {
        const item = e.target.closest('.target-item');
        if (e.target.closest('#targetClose')) { _closeOverlay(overlay); return; }
        if (!item || _actionSent) return;
        haptic('medium');
        const target = parseInt(item.dataset.target);
        overlay.classList.remove('active');
        _overlayOpen = false;
        if (actionType === 'skill' || actionType === 'bonus_use') {
            sendAction({ type: actionType, skill_id: skillId, target: target });
        } else {
            sendAction({ type: 'attack', target: target });
        }
    };
    overlay.onclick = (e) => { if (e.target === overlay) _closeOverlay(overlay); };
}

// ─── ITEM PICKER ───
function showItemPicker(items, enemies, allies) {
    const panel = document.getElementById('itemPanel');
    const overlay = document.getElementById('itemOverlay');
    let html = '<div class="skill-panel-title">🎒 Itens de Combate</div>';
    items.forEach(it => {
        const isThrown = !!it.tdmg;
        const effText = isThrown ? `${it.tdmg} ${it.ttype || ''}` : (it.heal ? `Cura ${it.heal}` : '');
        const typeBadge = isThrown ? '<span class="sk-aoe">Arremesso</span>' : '<span class="sk-type sk-type-heal">Cura</span>';
        const itemCls = isThrown ? 'item-thrown' : 'item-heal';
        html += `<div class="skill-item item-entry ${itemCls}" data-item="${escHtml(it.n)}" data-thrown="${isThrown}">
            <div>
                <div class="skill-name">${it.ico} ${escHtml(it.n)} <span class="action-chance">x${it.q}</span></div>
                <div class="skill-meta">${effText} · ${typeBadge}</div>
            </div>
        </div>`;
    });
    // Full inventory access via transition (API mode only)
    if (isApiMode) {
        html += '<div class="skill-item" id="itemFullInventory" style="text-align:center;color:var(--v-gold);font-size:12px;padding:10px;cursor:pointer;opacity:0.8">📦 Ver Mochila Completa</div>';
    }
    html += '<div class="skill-close" id="itemClose">Cancelar</div>';
    panel.innerHTML = html;
    _overlayOpen = true;
    panel.style.animation = 'none';
    panel.offsetHeight;
    panel.style.animation = '';
    overlay.classList.add('active');
    // Focus first item + Escape to close
    const _firstEntry = panel.querySelector('.item-entry');
    if (_firstEntry) _firstEntry.focus();
    overlay.onkeydown = (e) => { if (e.key === 'Escape') _closeOverlay(overlay); };

    // Event delegation (prevents listener leaks on re-open)
    panel.onclick = (e) => {
        const item = e.target.closest('.item-entry');
        if (e.target.closest('#itemClose')) { _closeOverlay(overlay); return; }
        if (e.target.closest('#itemFullInventory')) { _closeOverlay(overlay); transitionToInventoryFromArena(); return; }
        if (!item || _actionSent) return;
        haptic('medium');
        const itemName = item.dataset.item;
        const isThrown = item.dataset.thrown === 'true';
        overlay.classList.remove('active');
        _overlayOpen = false;
        if (isThrown) {
            sendAction({ type: 'use_item', item_key: itemName, item_target: -2 });
        } else {
            sendAction({ type: 'use_item', item_key: itemName, item_target: -1 });
        }
    };
    // Backdrop tap to close (standard mobile UX)
    overlay.onclick = (e) => { if (e.target === overlay) _closeOverlay(overlay); };
}

// ═══════════════════════════════════════════════════
// OVERLAY-ONLY DICE SYSTEM — All dice rolls use fullscreen 3D overlay
// Replaces inline dice boxes (dice1/dice2) with immersive overlay
// ═══════════════════════════════════════════════════

// Ensure the full-screen dice overlay exists as a persistent element outside #app

