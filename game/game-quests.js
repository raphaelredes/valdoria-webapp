/* ═══════════════════════════════════════════════════════════════
   QUEST DIARY & DETAIL — Narrative RPG rendering (no progress bars)
   Philosophy: Tabletop RPG immersion. No numeric counters, no bars.
   Show only the next narrative beat, described as a DM would.
   ═══════════════════════════════════════════════════════════════ */

function renderQuestDiary(container, data) {
    container.innerHTML = '';

    var wrap = document.createElement('div');
    wrap.className = 'quest-diary';

    // Abandon flash message (NPC reaction)
    if (data.flash) {
        var flash = document.createElement('div');
        flash.className = 'quest-flash';
        flash.innerHTML = '\ud83d\udcac <em>\u201c' + _escQ(data.flash) + '\u201d</em>';
        wrap.appendChild(flash);
    }

    // Filter tabs
    var filters = [
        { id: 'all', icon: '\ud83d\udccb', label: 'Todas' },
        { id: 'story', icon: '\u2694\ufe0f', label: 'Story' },
        { id: 'daily', icon: '\ud83d\udd04', label: 'Di\u00e1rias' },
        { id: 'done', icon: '\u2705', label: 'Feitas' },
    ];
    var totalQ = (data.story || []).length + (data.daily || []).length
        + (data.done || []).length + (data.failed || []).length;

    if (totalQ >= 3) {
        var tabRow = document.createElement('div');
        tabRow.className = 'quest-filter-tabs';
        for (var i = 0; i < filters.length; i++) {
            var f = filters[i];
            var tab = document.createElement('button');
            tab.className = 'quest-filter-tab' + (data.filter === f.id ? ' active' : '');
            tab.textContent = f.icon + ' ' + f.label;
            (function(fid) { tab.onclick = function() { doAction('quest_filter_' + fid); }; })(f.id);
            tabRow.appendChild(tab);
        }
        wrap.appendChild(tabRow);
    }

    // Turn-in banner
    if (data.turnin && data.turnin.length > 0) {
        for (var ti = 0; ti < data.turnin.length; ti++) {
            var t = data.turnin[ti];
            var banner = document.createElement('button');
            banner.className = 'quest-turnin-banner';
            var bannerText = t.count > 1
                ? '\ud83d\udcdc Entregar ' + t.count + ' Miss\u00f5es'
                : '\ud83d\udcdc Entregar: ' + _escQ(t.titles[0]);
            banner.innerHTML = '<strong>' + bannerText + '</strong>'
                + '<span class="quest-turnin-loc">' + _escQ(t.loc) + '</span>';
            (function(cb) { banner.onclick = function() { doAction(cb); }; })(t.cb);
            wrap.appendChild(banner);
        }
    }

    // Active Story Quests
    if (data.story && data.story.length > 0) {
        wrap.appendChild(_questSectionHdr('\u2694\ufe0f', 'Jornadas em Andamento'));
        for (var si = 0; si < data.story.length; si++) {
            wrap.appendChild(_renderQCard(data.story[si]));
        }
    }

    // Active Daily Quests
    if (data.daily && data.daily.length > 0) {
        wrap.appendChild(_questSectionHdr('\ud83d\udd04', 'Tarefas do Dia'));
        for (var di = 0; di < data.daily.length; di++) {
            wrap.appendChild(_renderQCard(data.daily[di], true));
        }
    }

    // Completed Quests
    if (data.done && data.done.length > 0) {
        wrap.appendChild(_questSectionHdr('\u2705', 'Feitos Realizados'));
        for (var ci = 0; ci < data.done.length; ci++) {
            var d = data.done[ci];
            var doneCard = document.createElement('div');
            doneCard.className = 'quest-card quest-card--done';
            doneCard.innerHTML = '<div class="quest-card-header">'
                + '<span class="quest-title quest-title--done">' + _escQ(d.title) + '</span></div>'
                + '<div class="quest-rewards-mini">\u2728 ' + d.xp + ' XP \u00b7 \ud83d\udcb0 ' + d.gold + ' GP</div>';
            wrap.appendChild(doneCard);
        }
    }

    // Failed Quests
    if (data.failed && data.failed.length > 0) {
        wrap.appendChild(_questSectionHdr('\u274c', 'Miss\u00f5es Perdidas'));
        for (var fi = 0; fi < data.failed.length; fi++) {
            var fq = data.failed[fi];
            var failCard = document.createElement('div');
            failCard.className = 'quest-card quest-card--failed';
            failCard.innerHTML = '<div class="quest-card-header">'
                + '<span class="quest-title quest-title--failed">\ud83d\udc80 ' + _escQ(fq.title) + '</span></div>';
            if (fq.cb_retry) {
                var retryBtn = document.createElement('button');
                retryBtn.className = 'quest-retry-btn';
                retryBtn.textContent = '\ud83d\udd04 Tentar Novamente';
                (function(cb) {
                    retryBtn.onclick = function(e) { e.stopPropagation(); doAction(cb); };
                })(fq.cb_retry);
                failCard.appendChild(retryBtn);
            }
            wrap.appendChild(failCard);
        }
    }

    // Empty state — immersive medieval themed
    if (totalQ === 0) {
        var empty = document.createElement('div');
        empty.className = 'quest-empty';
        empty.innerHTML = '<div class="quest-empty-scroll">'
            + '<svg class="quest-empty-svg" viewBox="0 0 120 100" width="120" height="100">'
            + '<path d="M20,15 Q60,5 100,15 L100,85 Q60,95 20,85 Z" fill="none" stroke="rgba(196,149,58,0.25)" stroke-width="1.5"/>'
            + '<path d="M15,12 Q15,8 20,8 L100,8 Q105,8 105,12 L105,18 Q60,8 15,18 Z" fill="rgba(196,149,58,0.1)" stroke="rgba(196,149,58,0.2)" stroke-width="0.8"/>'
            + '<path d="M15,88 Q15,92 20,92 L100,92 Q105,92 105,88 L105,82 Q60,92 15,82 Z" fill="rgba(196,149,58,0.1)" stroke="rgba(196,149,58,0.2)" stroke-width="0.8"/>'
            + '<text x="60" y="42" text-anchor="middle" fill="rgba(196,149,58,0.3)" font-size="28" font-family="serif">\u2620</text>'
            + '<line x1="35" y1="55" x2="85" y2="55" stroke="rgba(196,149,58,0.15)" stroke-width="0.8"/>'
            + '<text x="60" y="68" text-anchor="middle" fill="rgba(196,149,58,0.2)" font-size="7" font-family="serif">NENHUMA MISS\u00c3O</text>'
            + '<line x1="35" y1="74" x2="85" y2="74" stroke="rgba(196,149,58,0.15)" stroke-width="0.8"/>'
            + '</svg>'
            + '</div>'
            + '<div class="quest-empty-text">O pergaminho est\u00e1 em branco...</div>'
            + '<div class="quest-empty-hint">Converse com os habitantes de Eldoria ou visite o <b>Quadro de Miss\u00f5es</b> na Guilda dos Aventureiros.</div>'
            + '<div class="quest-empty-cta" onclick="doAction(\'action_city_locations\')">\ud83c\udfe0 Visitar Locais</div>';
        wrap.appendChild(empty);
    }

    container.appendChild(wrap);
}

function _questSectionHdr(icon, label) {
    var el = document.createElement('div');
    el.className = 'quest-section-hdr';
    el.innerHTML = '<span class="quest-section-icon">' + icon + '</span>'
        + '<span class="quest-section-label">' + label + '</span>';
    return el;
}

function _renderQCard(q, isDaily) {
    var card = document.createElement('div');
    card.className = 'quest-card' + (q.ready ? ' quest-card--ready' : '');
    card.onclick = function() { doAction(q.cb); };

    // Header: NPC icon + title + category badge + ready badge
    var hdr = document.createElement('div');
    hdr.className = 'quest-card-header';

    // NPC role icon (replaces difficulty dot)
    var npcIcon = q.npc_icon || '\u2694\ufe0f';
    var catBadge = '';
    if (q.cat === 'daily') {
        catBadge = '<span class="quest-cat-badge quest-cat--daily">DI\u00c1RIA</span>';
    } else if (q.cat === 'story') {
        catBadge = '<span class="quest-cat-badge quest-cat--story">STORY</span>';
    } else if (q.cat === 'side') {
        catBadge = '<span class="quest-cat-badge quest-cat--side">SIDE</span>';
    }
    hdr.innerHTML = '<span class="quest-npc-icon">' + npcIcon + '</span>'
        + '<span class="quest-title">' + _escQ(q.title) + '</span>'
        + catBadge
        + (q.ready ? '<span class="quest-ready-badge">\u2705</span>' : '');
    card.appendChild(hdr);

    // Chain indicator (Part X of Y)
    if (q.chain) {
        var chainEl = document.createElement('div');
        chainEl.className = 'quest-chain-badge';
        chainEl.textContent = 'Cap\u00edtulo ' + q.chain.part + ' de ' + q.chain.total;
        card.appendChild(chainEl);
    }

    // Narrative objective (immersive, no target icon)
    if (q.obj) {
        var objEl = document.createElement('div');
        objEl.className = 'quest-objective';
        objEl.innerHTML = '<em>' + _escQ(q.obj) + '</em>';
        card.appendChild(objEl);
    }

    // NPC giver name (subtle)
    if (q.npc) {
        var npcEl = document.createElement('div');
        npcEl.className = 'quest-card-npc';
        npcEl.textContent = q.npc;
        card.appendChild(npcEl);
    }

    return card;
}


/* ═══════════════════════════════════════════════════════════════
   QUEST DETAIL — Narrative RPG detail (no progress bars)
   ═══════════════════════════════════════════════════════════════ */

function renderQuestDetail(container, q) {
    container.innerHTML = '';

    var wrap = document.createElement('div');
    wrap.className = 'quest-detail';

    // Title + NPC icon
    var titleBlock = document.createElement('div');
    titleBlock.className = 'quest-detail-title';
    var npcIcon = q.npc_icon || '\u2694\ufe0f';
    titleBlock.innerHTML = '<span class="quest-detail-icon">' + npcIcon + '</span>'
        + '<h2>' + _escQ(q.title) + '</h2>'
        + (q.ready ? '<div class="quest-ready-banner">\u2705 Pronta para entrega</div>' : '');
    wrap.appendChild(titleBlock);

    // Chain indicator
    if (q.chain) {
        var chainEl = document.createElement('div');
        chainEl.className = 'quest-chain-indicator';
        chainEl.innerHTML = '\ud83d\udd17 <span>Cap\u00edtulo ' + q.chain.part + ' de ' + q.chain.total + '</span>';
        if (q.chain.next_title) {
            chainEl.innerHTML += '<span class="quest-chain-next">\u2192 Pr\u00f3ximo: ' + _escQ(q.chain.next_title) + '</span>';
        }
        wrap.appendChild(chainEl);
    }

    // Description (narrative)
    if (q.desc) {
        var descEl = document.createElement('div');
        descEl.className = 'quest-detail-desc';
        descEl.textContent = q.desc;
        wrap.appendChild(descEl);
    }

    // Current narrative beat (replaces "Objetivo Atual" with immersive framing)
    if (q.obj && q.status === 'active') {
        var objBlock = document.createElement('div');
        objBlock.className = 'quest-detail-objective';
        if (q.ready) {
            objBlock.innerHTML = '<div class="quest-detail-obj-label">\ud83d\udcdc O que voc\u00ea sabe</div>'
                + '<div class="quest-detail-obj-text"><em>A miss\u00e3o est\u00e1 cumprida. Resta apenas reportar o feito.</em></div>';
        } else {
            objBlock.innerHTML = '<div class="quest-detail-obj-label">\ud83d\udcdc O que voc\u00ea sabe</div>'
                + '<div class="quest-detail-obj-text"><em>' + _escQ(q.obj) + '</em></div>';
        }
        wrap.appendChild(objBlock);
    }

    // Journey so far — narrative timeline (only completed + current, no future spoilers)
    if (q.objectives && q.objectives.length > 0) {
        var hasCompleted = false;
        for (var ci = 0; ci < q.objectives.length; ci++) {
            if (q.objectives[ci].state === 'done') { hasCompleted = true; break; }
        }
        if (hasCompleted) {
            var timeline = document.createElement('div');
            timeline.className = 'quest-timeline';
            var tlHdr = document.createElement('div');
            tlHdr.className = 'quest-timeline-header';
            tlHdr.textContent = '\ud83d\udcd6 Sua Jornada At\u00e9 Aqui';
            timeline.appendChild(tlHdr);
            for (var i = 0; i < q.objectives.length; i++) {
                var o = q.objectives[i];
                if (o.state === 'future') continue; // Don't reveal future steps
                var step = document.createElement('div');
                step.className = 'quest-step quest-step--' + o.state;
                var marker = o.state === 'done' ? '\u2705' : '\u25b8';
                step.innerHTML = '<span class="quest-step-marker">' + marker + '</span>'
                    + '<span class="quest-step-text"><em>' + _escQ(o.text) + '</em></span>';
                timeline.appendChild(step);
            }
            wrap.appendChild(timeline);
        }
    }

    // Hint (atmospheric, more prominent)
    if (q.hint) {
        var hintEl = document.createElement('div');
        hintEl.className = 'quest-detail-hint';
        hintEl.innerHTML = '\ud83d\udcd6 <em>' + _escQ(q.hint) + '</em>';
        wrap.appendChild(hintEl);
    }

    // NPC info with role icon
    if (q.npc) {
        var npcBlock = document.createElement('div');
        npcBlock.className = 'quest-detail-npc';
        var npcIc = q.npc_icon || '\ud83d\udc64';
        npcBlock.innerHTML = npcIc + ' ' + _escQ(q.npc);
        wrap.appendChild(npcBlock);
    }

    // Rewards (kept — these are promised, not progress)
    var rewBlock = document.createElement('div');
    rewBlock.className = 'quest-detail-rewards';
    rewBlock.innerHTML = '<div class="quest-detail-rewards-label">\ud83d\udc8e Recompensas Prometidas</div>';
    var rewList = document.createElement('div');
    rewList.className = 'quest-detail-rewards-list';
    if (q.xp) rewList.innerHTML += '<span class="quest-reward-item">\u2728 ' + q.xp + ' XP</span>';
    if (q.gold) rewList.innerHTML += '<span class="quest-reward-item">\ud83d\udcb0 ' + q.gold + ' GP</span>';
    if (q.items && q.items.length > 0) {
        for (var ii = 0; ii < q.items.length; ii++) {
            rewList.innerHTML += '<span class="quest-reward-item">\ud83c\udf81 ' + _escQ(q.items[ii]) + '</span>';
        }
    }
    rewBlock.appendChild(rewList);
    wrap.appendChild(rewBlock);

    // Action buttons (styled, inside the card)
    if (q.can_turnin && q.turnin_cb) {
        var turninBtn = document.createElement('button');
        turninBtn.className = 'quest-action-btn quest-action-btn--turnin';
        turninBtn.innerHTML = '\ud83d\udcdc Entregar Miss\u00e3o';
        turninBtn.onclick = function() { doAction(q.turnin_cb); };
        wrap.appendChild(turninBtn);
    }
    if (q.can_abandon) {
        var abandonBtn = document.createElement('button');
        abandonBtn.className = 'quest-action-btn quest-action-btn--abandon';
        abandonBtn.innerHTML = '\u274c Abandonar';
        abandonBtn.onclick = function() { doAction(q.abandon_cb); };
        wrap.appendChild(abandonBtn);
    }

    container.appendChild(wrap);
}

/* ═══════════════════════════════════════════════════════════════
   QUEST TURN-IN — Reward reveal screen
   ═══════════════════════════════════════════════════════════════ */

function renderQuestTurnin(container, data) {
    container.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'quest-turnin';

    // NPC header
    if (data.npc) {
        var npcEl = document.createElement('div');
        npcEl.className = 'quest-turnin-npc';
        npcEl.innerHTML = '\ud83d\udc64 <b>' + _escQ(data.npc) + '</b>';
        wrap.appendChild(npcEl);
    }

    // Dialogue
    if (data.dialogue) {
        var dlg = document.createElement('div');
        dlg.className = 'quest-turnin-dialogue';
        dlg.innerHTML = '\ud83d\udcac <em>\u201c' + _escQ(data.dialogue) + '\u201d</em>';
        wrap.appendChild(dlg);
    }

    // Completed quests list with staggered reveal
    if (data.quests && data.quests.length > 0) {
        var qList = document.createElement('div');
        qList.className = 'quest-turnin-list';
        for (var i = 0; i < data.quests.length; i++) {
            var qItem = document.createElement('div');
            qItem.className = 'quest-turnin-item';
            qItem.style.animationDelay = (i * 0.15) + 's';
            qItem.innerHTML = '\u2705 <b>' + _escQ(data.quests[i].title) + '</b>';
            if (data.quests[i].narrative) {
                qItem.innerHTML += '<div class="quest-turnin-narrative">' + _escQ(data.quests[i].narrative) + '</div>';
            }
            qList.appendChild(qItem);
        }
        wrap.appendChild(qList);
    }

    // Rewards section with staggered reveal
    var rewBlock = document.createElement('div');
    rewBlock.className = 'quest-turnin-rewards';
    rewBlock.innerHTML = '<div class="quest-turnin-rewards-label">\ud83d\udc8e Recompensas</div>';

    var rewItems = document.createElement('div');
    rewItems.className = 'quest-turnin-rewards-grid';
    var delay = (data.quests ? data.quests.length : 0) * 0.15 + 0.3;

    if (data.xp) {
        var xpEl = document.createElement('div');
        xpEl.className = 'quest-turnin-reward-item quest-turnin-reveal';
        xpEl.style.animationDelay = delay + 's';
        xpEl.innerHTML = '<span class="quest-turnin-reward-icon">\u2728</span>'
            + '<span class="quest-turnin-reward-val">+' + data.xp + '</span>'
            + '<span class="quest-turnin-reward-lbl">XP</span>';
        rewItems.appendChild(xpEl);
        delay += 0.2;
    }
    if (data.gold) {
        var goldEl = document.createElement('div');
        goldEl.className = 'quest-turnin-reward-item quest-turnin-reveal';
        goldEl.style.animationDelay = delay + 's';
        goldEl.innerHTML = '<span class="quest-turnin-reward-icon">\ud83d\udcb0</span>'
            + '<span class="quest-turnin-reward-val">+' + data.gold + '</span>'
            + '<span class="quest-turnin-reward-lbl">GP</span>';
        rewItems.appendChild(goldEl);
        delay += 0.2;
    }
    if (data.items && data.items.length > 0) {
        for (var ii = 0; ii < data.items.length; ii++) {
            var itemEl = document.createElement('div');
            itemEl.className = 'quest-turnin-reward-item quest-turnin-reveal';
            itemEl.style.animationDelay = delay + 's';
            itemEl.innerHTML = '<span class="quest-turnin-reward-icon">\ud83c\udf81</span>'
                + '<span class="quest-turnin-reward-val">' + _escQ(data.items[ii]) + '</span>';
            rewItems.appendChild(itemEl);
            delay += 0.2;
        }
    }
    rewBlock.appendChild(rewItems);
    wrap.appendChild(rewBlock);

    // Level up banner
    if (data.leveled) {
        var lvl = document.createElement('div');
        lvl.className = 'quest-turnin-levelup quest-turnin-reveal';
        lvl.style.animationDelay = (delay + 0.3) + 's';
        lvl.innerHTML = '\ud83c\udf89 <b>LEVEL UP!</b> N\u00edvel ' + data.level;
        wrap.appendChild(lvl);
    }

    // Current gold
    if (data.current_gold !== undefined) {
        var goldLine = document.createElement('div');
        goldLine.className = 'quest-turnin-gold';
        goldLine.innerHTML = '\ud83d\udcb0 <b>Seu Ouro:</b> ' + data.current_gold + ' GP';
        wrap.appendChild(goldLine);
    }

    container.appendChild(wrap);
}

/* ═══════════════════════════════════════════════════════════════
   QUEST ABANDON — Styled confirmation overlay
   ═══════════════════════════════════════════════════════════════ */

function renderQuestAbandon(container, data) {
    container.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'quest-abandon';

    // Warning icon
    var iconEl = document.createElement('div');
    iconEl.className = 'quest-abandon-icon';
    iconEl.textContent = '\u26a0\ufe0f';
    wrap.appendChild(iconEl);

    // Title
    var titleEl = document.createElement('div');
    titleEl.className = 'quest-abandon-title';
    titleEl.textContent = 'Abandonar Miss\u00e3o?';
    wrap.appendChild(titleEl);

    // Quest name
    var nameEl = document.createElement('div');
    nameEl.className = 'quest-abandon-name';
    nameEl.innerHTML = '\ud83d\udcdc ' + _escQ(data.title);
    wrap.appendChild(nameEl);

    // Warning text (narrative, no mention of "progress")
    var warnEl = document.createElement('div');
    warnEl.className = 'quest-abandon-warn';
    warnEl.textContent = data.is_daily
        ? 'Ao desistir, tudo que foi feito se perder\u00e1. Tarefas di\u00e1rias abandonadas contam para o limite do dia.'
        : 'Ao desistir, voc\u00ea perder\u00e1 tudo que conquistou nesta jornada. Poder\u00e1 retom\u00e1-la mais tarde.';
    wrap.appendChild(warnEl);

    container.appendChild(wrap);
}

/* ═══════════════════════════════════════════════════════════════
   QUEST TRACKER — Narrative mini-widget for City Hub
   ═══════════════════════════════════════════════════════════════ */

function renderQuestTracker(container, data) {
    if (!data.quests || data.quests.length === 0) return;

    var wrap = document.createElement('div');
    wrap.className = 'quest-tracker';
    wrap.innerHTML = '<div class="quest-tracker-hdr">\ud83d\udcdc Jornadas</div>';

    for (var i = 0; i < data.quests.length; i++) {
        var q = data.quests[i];
        var row = document.createElement('div');
        row.className = 'quest-tracker-row' + (q.ready ? ' quest-tracker-row--ready' : '');
        row.onclick = (function(cb) { return function() { doAction(cb); }; })(q.cb);
        // Narrative status instead of X/Y counter
        var statusText = q.ready ? 'Conclu\u00edda' : (q.obj || '...');
        row.innerHTML = '<span class="quest-tracker-title">' + _escQ(q.title) + '</span>'
            + '<span class="quest-tracker-status">' + (q.ready ? '\u2705' : '\u25b8') + '</span>';
        wrap.appendChild(row);
    }

    // Insert after content starts
    var firstBlock = container.querySelector('.text-block, .v-bar-row');
    if (firstBlock && firstBlock.nextSibling) {
        container.insertBefore(wrap, firstBlock.nextSibling.nextSibling || null);
    } else {
        container.appendChild(wrap);
    }
}

function _escQ(text) {
    if (!text) return '';
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
