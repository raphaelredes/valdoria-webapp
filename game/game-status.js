/**
 * Ficha do personagem (Game Hub) — abas + barras alinhadas ao design system (v-bar-*).
 */
var _CHAR_TABS = [
    { id: 'overview', label: 'Geral' },
    { id: 'attrs', label: 'Atributos' },
    { id: 'combat', label: 'Combate' },
    { id: 'feats', label: 'Feitos' },
];
var _CHAR_TAB_STORAGE_KEY = 'valdoria_char_tab';

function _wrapTabPanel(contentRoot) {
    var outer = document.createElement('div');
    outer.className = 'char-tab-panel';
    outer.appendChild(contentRoot);
    return outer;
}

function renderCharDetails(container, data) {
    if (!container || !data) return;
    container.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'char-details char-details--sheet';

    if (data.alerts && data.alerts.length) {
        var alertBox = document.createElement('div');
        alertBox.className = 'char-details-alerts';
        alertBox.setAttribute('role', 'status');
        for (var ai = 0; ai < data.alerts.length; ai++) {
            var row = document.createElement('div');
            row.className = 'char-details-alert-row';
            row.textContent = data.alerts[ai];
            alertBox.appendChild(row);
        }
        wrap.appendChild(alertBox);
    }

    var identity = document.createElement('div');
    identity.className = 'char-details-identity';
    var titleRow = document.createElement('div');
    titleRow.className = 'char-details-title-row';
    var nameLine = document.createElement('div');
    nameLine.className = 'char-details-name';
    if (data.badge) {
        var badgeSpan = document.createElement('span');
        badgeSpan.className = 'char-details-badge';
        badgeSpan.setAttribute('aria-hidden', 'true');
        badgeSpan.textContent = data.badge;
        nameLine.appendChild(badgeSpan);
        nameLine.appendChild(document.createTextNode('\u00A0'));
    }
    var nameText = document.createElement('span');
    nameText.textContent = data.name || 'Personagem';
    nameLine.appendChild(nameText);
    titleRow.appendChild(nameLine);
    var subLine = document.createElement('div');
    subLine.className = 'char-details-subtitle';
    var subParts = 'Nv. ' + (data.level || 1) + ' · ' + (data.class_name || '');
    if (data.subclass) subParts += ' — ' + data.subclass;
    subLine.textContent = subParts;
    titleRow.appendChild(subLine);
    identity.appendChild(titleRow);
    if (data.active_title) {
        var tit = document.createElement('div');
        tit.className = 'char-details-title-earned';
        tit.textContent = data.active_title;
        identity.appendChild(tit);
    }
    wrap.appendChild(identity);

    var metaEl = document.createElement('div');
    metaEl.className = 'char-details-meta char-details-meta--structured';
    var metaParts = [];
    if (data.race) metaParts.push(data.race);
    if (data.age && data.age > 0) {
        var ageStr = data.age + ' anos';
        if (data.age_category) ageStr += ' (' + data.age_category + ')';
        metaParts.push(ageStr);
    }
    if (data.background) metaParts.push(data.background);
    metaEl.textContent = metaParts.join(' · ');
    wrap.appendChild(metaEl);

    if (data.combat_quick && data.combat_quick.items && data.combat_quick.items.length) {
        var cq = document.createElement('div');
        cq.className = 'char-combat-quick';
        for (var qi = 0; qi < data.combat_quick.items.length; qi++) {
            var it = data.combat_quick.items[qi];
            var chip = document.createElement('div');
            chip.className = 'char-combat-quick-chip';
            chip.innerHTML = '<span class="char-combat-quick-ico">' + (it.icon || '') + '</span>'
                + '<span class="char-combat-quick-lbl">' + (it.label || '') + '</span>'
                + '<span class="char-combat-quick-val">' + (it.value || '') + '</span>';
            cq.appendChild(chip);
        }
        wrap.appendChild(cq);
    }

    var tabRow = document.createElement('div');
    tabRow.className = 'char-tabs char-tabs--pill';
    var savedTab = 'overview';
    try {
        savedTab = localStorage.getItem(_CHAR_TAB_STORAGE_KEY) || 'overview';
    } catch (e) {
        console.warn('[GAME]', e);
    }
    var panels = {};
    for (var ti = 0; ti < _CHAR_TABS.length; ti++) {
        var t = _CHAR_TABS[ti];
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'char-tab' + (savedTab === t.id ? ' active' : '');
        btn.textContent = t.label;
        btn.setAttribute('data-tab', t.id);
        (function (tabId, tabBtn) {
            tabBtn.onclick = function () {
                var allTabs = tabRow.querySelectorAll('.char-tab');
                for (var j = 0; j < allTabs.length; j++) {
                    allTabs[j].classList.toggle('active', allTabs[j].getAttribute('data-tab') === tabId);
                }
                for (var pk in panels) {
                    panels[pk].classList.toggle('active', pk === tabId);
                }
                try {
                    localStorage.setItem(_CHAR_TAB_STORAGE_KEY, tabId);
                } catch (e2) {
                    console.warn('[GAME]', e2);
                }
            };
        })(t.id, btn);
        tabRow.appendChild(btn);
    }
    wrap.appendChild(tabRow);

    panels.overview = _wrapTabPanel(_buildOverviewPanel(data));
    panels.attrs = _wrapTabPanel(_buildAttrsPanel(data));
    panels.combat = _wrapTabPanel(_buildCombatPanel(data));
    panels.feats = _wrapTabPanel(_buildFeatsPanel(data));
    for (var key in panels) {
        if (savedTab === key) {
            panels[key].classList.add('active');
        } else {
            panels[key].classList.remove('active');
        }
        wrap.appendChild(panels[key]);
    }
    container.appendChild(wrap);
}

function _makeVBarRow(iconHtml, cur, max, fillClass, labelText) {
    var pct = max > 0 ? Math.min(100, Math.round((cur / max) * 100)) : 0;
    var row = document.createElement('div');
    row.className = 'v-bar char-details-vbar';
    var iconWrap = document.createElement('span');
    iconWrap.className = 'v-bar-icon';
    iconWrap.innerHTML = iconHtml;
    row.appendChild(iconWrap);
    var track = document.createElement('div');
    track.className = 'v-bar-track v-bar-track--lg';
    var fill = document.createElement('div');
    fill.className = 'v-bar-fill ' + fillClass;
    fill.style.width = pct + '%';
    track.appendChild(fill);
    row.appendChild(track);
    var lab = document.createElement('span');
    lab.className = 'v-bar-label';
    lab.textContent = labelText;
    row.appendChild(lab);
    return row;
}

function _buildOverviewPanel(data) {
    var panel = document.createElement('div');
    panel.className = 'char-panel-inner';

    var hpCls = typeof vBarHpClass === 'function'
        ? vBarHpClass(data.hp.cur, data.hp.max)
        : 'hp';
    panel.appendChild(_makeVBarRow('&#10084;&#65039;', data.hp.cur, data.hp.max, hpCls,
        data.hp.cur + '/' + data.hp.max));

    var mpIcon = data.mp && data.mp.icon ? data.mp.icon : '&#128167;';
    panel.appendChild(_makeVBarRow(mpIcon, data.mp.cur, data.mp.max, 'mp',
        data.mp.cur + '/' + data.mp.max));

    var xpLabel = _abbreviate(data.xp.cur) + '/' + _abbreviate(data.xp.max) + ' XP';
    panel.appendChild(_makeVBarRow('&#10024;', data.xp.cur, data.xp.max, 'xp', xpLabel));

    var hdLabel = data.hd.cur + '/' + data.hd.max + ' (' + data.hd.die + ')';
    panel.appendChild(_makeVBarRow('&#127922;', data.hd.cur, data.hd.max, 'hd', hdLabel));

    var resRow = document.createElement('div');
    resRow.className = 'char-resources char-resources--sheet';
    var goldBadge = document.createElement('div');
    goldBadge.className = 'char-resource-badge char-resource-badge--gold';
    goldBadge.innerHTML = '<span class="char-resource-label">Valdoritas</span>'
        + '<span class="val">' + data.gold + '</span> <span class="vi vi-coin sm"></span>';
    resRow.appendChild(goldBadge);
    resRow.appendChild(_makeResourceBadge('&#128188;', data.items, 'Itens'));
    if (data.potions > 0) {
        resRow.appendChild(_makeResourceBadge('&#129514;', data.potions, 'Poções'));
    }
    panel.appendChild(resRow);

    var sumRow = document.createElement('div');
    sumRow.className = 'char-summary-row';
    sumRow.appendChild(_makeSummaryBadge('&#127775;', data.skill_count + ' habilidade(s)'));
    sumRow.appendChild(_makeSummaryBadge('&#128737;&#65039;', data.equipped_count + ' equipado(s)'));
    panel.appendChild(sumRow);

    if (data.conditions && data.conditions.length > 0) {
        var condDiv = document.createElement('div');
        condDiv.className = 'char-conditions';
        condDiv.textContent = data.conditions.join(' · ');
        panel.appendChild(condDiv);
    }
    return panel;
}

function _makeResourceBadge(icon, val, label) {
    var badge = document.createElement('div');
    badge.className = 'char-resource-badge';
    badge.innerHTML = '<span class="char-resource-ico">' + icon + '</span>'
        + '<span class="val">' + val + '</span> <span class="char-resource-label">' + label + '</span>';
    return badge;
}

function _makeSummaryBadge(icon, text) {
    var badge = document.createElement('div');
    badge.className = 'char-summary-badge';
    badge.innerHTML = '<span class="char-summary-ico">' + icon + '</span><span>' + text + '</span>';
    return badge;
}

function _abbreviate(n) {
    if (n >= 1000) {
        if (n % 1000 === 0) return (n / 1000) + 'k';
        return (n / 1000).toFixed(1).replace('.0', '') + 'k';
    }
    return '' + n;
}

function _buildAttrsPanel(data) {
    var panel = document.createElement('div');
    panel.className = 'char-panel-inner';
    var grid = document.createElement('div');
    grid.className = 'char-attr-grid';
    for (var i = 0; i < data.attrs.length; i++) {
        var a = data.attrs[i];
        var card = document.createElement('div');
        card.className = 'char-attr-card';
        var iconEl = document.createElement('span');
        iconEl.className = 'char-attr-icon';
        iconEl.textContent = a.icon;
        card.appendChild(iconEl);
        var labelEl = document.createElement('div');
        labelEl.className = 'char-attr-label';
        labelEl.textContent = a.label;
        card.appendChild(labelEl);
        var valEl = document.createElement('div');
        valEl.className = 'char-attr-val';
        valEl.textContent = a.val;
        card.appendChild(valEl);
        var modEl = document.createElement('div');
        modEl.className = 'char-attr-mod';
        modEl.textContent = (a.mod >= 0 ? '+' : '') + a.mod;
        card.appendChild(modEl);
        grid.appendChild(card);
    }
    panel.appendChild(grid);
    return panel;
}

function _buildCombatPanel(data) {
    var panel = document.createElement('div');
    panel.className = 'char-panel-inner';
    var grid = document.createElement('div');
    grid.className = 'char-combat-grid';
    var c = data.combat;
    var dexSign = c.ac.dex_mod >= 0 ? '+' : '';
    grid.appendChild(_makeCombatCard('&#128737;&#65039;', 'Defesa (CA)', c.ac.total,
        '10 ' + dexSign + c.ac.dex_mod + '(DES) + ' + c.ac.equip_ac + '(Itens)'));
    grid.appendChild(_makeCombatCard('&#127919;', 'Ataque', (c.atk.total >= 0 ? '+' : '') + c.atk.total,
        (c.atk.stat_mod >= 0 ? '+' : '') + c.atk.stat_mod + '(' + c.atk.stat + ') + '
        + c.atk.prof + '(Prof.) + ' + c.atk.item_bonus + '(Item)'));
    grid.appendChild(_makeCombatCard('&#128165;', 'Dano', c.dmg.die + ' ' + (c.dmg.bonus >= 0 ? '+' : '') + c.dmg.bonus,
        c.dmg.die + '(Arma) + ' + c.dmg.bonus + '(Bônus)'));
    grid.appendChild(_makeCombatCard('&#128203;', 'Proficiência', '+' + c.prof, ''));
    panel.appendChild(grid);
    return panel;
}

function _makeCombatCard(icon, label, val, formula) {
    var card = document.createElement('div');
    card.className = 'char-combat-card';
    var iconEl = document.createElement('span');
    iconEl.className = 'char-combat-icon';
    iconEl.innerHTML = icon;
    card.appendChild(iconEl);
    var info = document.createElement('div');
    info.className = 'char-combat-info';
    var labelEl = document.createElement('div');
    labelEl.className = 'char-combat-label';
    labelEl.textContent = label;
    info.appendChild(labelEl);
    var valEl = document.createElement('div');
    valEl.className = 'char-combat-val';
    valEl.textContent = val;
    info.appendChild(valEl);
    if (formula) {
        var formulaEl = document.createElement('div');
        formulaEl.className = 'char-combat-formula';
        formulaEl.textContent = formula;
        info.appendChild(formulaEl);
    }
    card.appendChild(info);
    return card;
}

function _buildFeatsPanel(data) {
    var panel = document.createElement('div');
    panel.className = 'char-panel-inner';
    if (!data.feats || data.feats.length === 0) {
        var empty = document.createElement('div');
        empty.className = 'char-feats-empty';
        empty.textContent = 'Nenhum feito registrado ainda. Explore Valdoria e conquiste glória!';
        panel.appendChild(empty);
        return panel;
    }
    var list = document.createElement('div');
    list.className = 'char-feats-list';
    for (var i = 0; i < data.feats.length; i++) {
        var item = document.createElement('div');
        item.className = 'char-feat-item';
        item.textContent = data.feats[i];
        list.appendChild(item);
    }
    panel.appendChild(list);
    return panel;
}
