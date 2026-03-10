/* ═══════════════════════════════════════════════════════════════
   QUEST DIARY & DETAIL — Rich card rendering for quest screens
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
        wrap.appendChild(_questSectionHdr('\u2694\ufe0f', 'Miss\u00f5es Ativas'));
        for (var si = 0; si < data.story.length; si++) {
            wrap.appendChild(_renderQCard(data.story[si]));
        }
    }

    // Active Daily Quests
    if (data.daily && data.daily.length > 0) {
        wrap.appendChild(_questSectionHdr('\ud83d\udd04', 'Miss\u00f5es Di\u00e1rias'));
        for (var di = 0; di < data.daily.length; di++) {
            wrap.appendChild(_renderQCard(data.daily[di], true));
        }
    }

    // Completed Quests
    if (data.done && data.done.length > 0) {
        wrap.appendChild(_questSectionHdr('\u2705', 'Completadas'));
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
        wrap.appendChild(_questSectionHdr('\u274c', 'Falhadas'));
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

    // Empty state
    if (totalQ === 0) {
        var empty = document.createElement('div');
        empty.className = 'quest-empty';
        empty.innerHTML = '<div class="quest-empty-icon">\ud83d\udcdc</div>'
            + '<div class="quest-empty-text">Voc\u00ea n\u00e3o possui miss\u00f5es no momento.</div>'
            + '<div class="quest-empty-hint">Converse com os habitantes da cidade ou visite o Quadro de Miss\u00f5es na Guilda.</div>';
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

    // Header: difficulty + title + ready badge
    var hdr = document.createElement('div');
    hdr.className = 'quest-card-header';
    hdr.innerHTML = '<span class="quest-diff">' + q.diff + '</span>'
        + '<span class="quest-title">' + _escQ(q.title) + '</span>'
        + (q.ready ? '<span class="quest-ready-badge">\u2705</span>' : '');
    card.appendChild(hdr);

    // Objective text
    if (q.obj) {
        var objEl = document.createElement('div');
        objEl.className = 'quest-objective';
        objEl.textContent = '\ud83c\udfaf ' + q.obj;
        card.appendChild(objEl);
    }

    // Progress bar
    var progWrap = document.createElement('div');
    progWrap.className = 'quest-progress';
    var track = document.createElement('div');
    track.className = 'quest-progress-track';
    var fill = document.createElement('div');
    fill.className = 'quest-progress-fill' + (q.ready ? ' quest-progress--ready' : '');
    fill.style.width = q.pct + '%';
    track.appendChild(fill);
    progWrap.appendChild(track);

    var progLabel = document.createElement('span');
    progLabel.className = 'quest-progress-label';
    progLabel.textContent = (isDaily && q.goal)
        ? (q.cur + '/' + q.goal)
        : (q.stage + '/' + q.total);
    progWrap.appendChild(progLabel);
    card.appendChild(progWrap);

    // Rewards row
    var rParts = [];
    if (q.xp) rParts.push('\u2728 ' + q.xp);
    if (q.gold) rParts.push('\ud83d\udcb0 ' + q.gold);
    if (q.items && q.items.length > 0) rParts.push('\ud83c\udf81 ' + q.items.length);
    if (rParts.length > 0) {
        var rew = document.createElement('div');
        rew.className = 'quest-rewards-mini';
        rew.textContent = rParts.join(' \u00b7 ');
        card.appendChild(rew);
    }

    return card;
}


/* ═══════════════════════════════════════════════════════════════
   QUEST DETAIL — Rich card rendering for quest detail screen
   ═══════════════════════════════════════════════════════════════ */

function renderQuestDetail(container, q) {
    container.innerHTML = '';

    var wrap = document.createElement('div');
    wrap.className = 'quest-detail';

    // Title + difficulty
    var titleBlock = document.createElement('div');
    titleBlock.className = 'quest-detail-title';
    titleBlock.innerHTML = '<span class="quest-diff quest-diff--lg">' + q.diff + '</span>'
        + '<h2>' + _escQ(q.title) + '</h2>'
        + (q.ready ? '<div class="quest-ready-banner">\u2705 Pronta para entrega</div>' : '');
    wrap.appendChild(titleBlock);

    // Description
    if (q.desc) {
        var descEl = document.createElement('div');
        descEl.className = 'quest-detail-desc';
        descEl.textContent = q.desc;
        wrap.appendChild(descEl);
    }

    // Current objective
    if (q.obj && q.status === 'active') {
        var objBlock = document.createElement('div');
        objBlock.className = 'quest-detail-objective';
        objBlock.innerHTML = '<div class="quest-detail-obj-label">\ud83c\udfaf Objetivo Atual</div>'
            + '<div class="quest-detail-obj-text">' + _escQ(q.obj) + '</div>';
        wrap.appendChild(objBlock);
    }

    // Progress bar (large)
    var progBlock = document.createElement('div');
    progBlock.className = 'quest-detail-progress';
    var trk = document.createElement('div');
    trk.className = 'quest-progress-track quest-progress-track--lg';
    var fl = document.createElement('div');
    fl.className = 'quest-progress-fill' + (q.ready ? ' quest-progress--ready' : '');
    fl.style.width = q.pct + '%';
    trk.appendChild(fl);
    progBlock.appendChild(trk);
    var plbl = document.createElement('div');
    plbl.className = 'quest-detail-progress-label';
    plbl.textContent = (q.cat === 'daily' && q.goal)
        ? (q.cur + '/' + q.goal + ' (meta di\u00e1ria)')
        : (q.stage + '/' + q.total + ' etapas');
    progBlock.appendChild(plbl);
    wrap.appendChild(progBlock);

    // Objectives timeline
    if (q.objectives && q.objectives.length > 0) {
        var timeline = document.createElement('div');
        timeline.className = 'quest-timeline';
        var tlHdr = document.createElement('div');
        tlHdr.className = 'quest-timeline-header';
        tlHdr.textContent = '\ud83d\udcdc Etapas';
        timeline.appendChild(tlHdr);
        for (var i = 0; i < q.objectives.length; i++) {
            var o = q.objectives[i];
            var step = document.createElement('div');
            step.className = 'quest-step quest-step--' + o.state;
            var marker = o.state === 'done' ? '\u2705'
                : (o.state === 'current' ? '\u25b8' : '\u25cb');
            step.innerHTML = '<span class="quest-step-marker">' + marker + '</span>'
                + '<span class="quest-step-text">' + _escQ(o.text) + '</span>';
            timeline.appendChild(step);
        }
        wrap.appendChild(timeline);
    }

    // Rewards
    var rewBlock = document.createElement('div');
    rewBlock.className = 'quest-detail-rewards';
    rewBlock.innerHTML = '<div class="quest-detail-rewards-label">\ud83d\udc8e Recompensas</div>';
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

    // NPC info
    if (q.npc) {
        var npcBlock = document.createElement('div');
        npcBlock.className = 'quest-detail-npc';
        npcBlock.textContent = '\ud83d\udc64 Dado por: ' + q.npc;
        wrap.appendChild(npcBlock);
    }

    // Hint
    if (q.hint) {
        var hintEl = document.createElement('div');
        hintEl.className = 'quest-detail-hint';
        hintEl.innerHTML = '\ud83d\udcd6 <em>' + _escQ(q.hint) + '</em>';
        wrap.appendChild(hintEl);
    }

    container.appendChild(wrap);
}

function _escQ(text) {
    if (!text) return '';
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
