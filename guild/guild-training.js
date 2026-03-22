/* guild-training.js -- Training tab */
(function(){
'use strict';

var _trainingData = null;

window.renderTrainingTab = function() {
    guildAction('training_menu').then(function(resp) {
        if (!resp || resp.error) return;
        _trainingData = resp;
        _renderTraining();
    }).catch(function(e) { console.error('[GUILD]', e); });
};

function _renderTraining() {
    var el = document.getElementById('guild-training');
    if (!el || !_trainingData) return;
    var d = _trainingData;
    var html = '';

    if (d.active) {
        var a = d.active;
        var pct = a.total ? Math.round((a.done / a.total) * 100) : 0;
        html += '<div class="guild-detail-section"><div class="guild-detail-section-title">Treinamento Ativo</div>';
        html += '<div class="guild-training-card active-training">';
        html += '<div class="guild-training-name">&#x1F4DA; ' + _esc(a.n || a.name || '') + '</div>';
        html += '<div class="guild-training-meta">' + _esc(a.cat || '') + ' &middot; ' + (a.done || 0) + '/' + (a.total || 1) + ' sessoes</div>';
        html += '<div class="guild-training-progress"><div class="guild-training-progress-fill" style="width:' + pct + '%"></div></div>';
        html += '</div>';
        var canPay = (G.data && G.data.gold || 0) >= (d.cost || 25);
        html += '<button class="guild-action-btn primary"' + (!canPay ? ' disabled title="Ouro insuficiente"' : '') + ' onclick="_advanceTraining()">&#x23E9; Avançar (' + (d.cost || 25) + ' GP)</button>';
        html += '<button class="guild-action-btn danger" onclick="_abandonTraining()">&#x274C; Abandonar</button>';
        html += '</div>';
    }

    if (!d.can_train && !d.active) {
        html += '<div class="guild-empty"><span class="guild-empty-icon">&#x23F3;</span>Treinamento em cooldown.';
        if (d.cooldown) html += '<br>' + _esc(String(d.cooldown));
        html += '</div>';
        el.innerHTML = html;
        return;
    }

    if (!d.active) {
        var cats = [
            { key: 'languages', label: 'Idiomas', items: d.languages || [] },
            { key: 'tools', label: 'Ferramentas', items: d.tools || [] }
        ];
        for (var c = 0; c < cats.length; c++) {
            var cat = cats[c];
            var available = cat.items.filter(function(x) { return !x.known; });
            if (!available.length) continue;
            html += '<div class="guild-training-group-title">' + cat.label + '</div>';
            for (var j = 0; j < available.length; j++) {
                var opt = available[j];
                html += '<div class="guild-training-card" onclick="_startTraining(\'' + _esc(cat.key) + '\',\'' + _esc(opt.id) + '\',\'' + _esc(opt.n || opt.name || '') + '\')">';
                html += '<div class="guild-training-name">&#x1F4DA; ' + _esc(opt.n || opt.name || '') + '</div>';
                html += '<div class="guild-training-meta">' + (d.sessions_total || '?') + ' sessoes &middot; ' + (d.cost || 25) + ' GP/sessao</div>';
                html += '</div>';
            }
        }

        var known = [];
        for (var c2 = 0; c2 < cats.length; c2++) {
            var ki = cats[c2].items.filter(function(x) { return x.known; });
            for (var k = 0; k < ki.length; k++) known.push({ label: cats[c2].label, item: ki[k] });
        }
        if (known.length) {
            html += '<div class="guild-training-group-title v-popup-mt-lg">Ja aprendidos</div>';
            for (var kk = 0; kk < known.length; kk++) {
                html += '<div class="guild-training-card v-popup-disabled">';
                html += '<div class="guild-training-name">&#x2705; ' + _esc(known[kk].item.n || known[kk].item.name || '') + '</div>';
                html += '<div class="guild-training-meta">' + _esc(known[kk].label) + '</div></div>';
            }
        }
    }

    if (!html) html = '<div class="guild-empty"><span class="guild-empty-icon">&#x1F4DA;</span>Nenhuma opção de treinamento disponível.</div>';
    el.innerHTML = html;
}

window._startTraining = function(category, itemId, name) {
    var _cat = category, _name = name;
    if (typeof vPopup !== 'undefined') {
        vPopup.show({
            header: 'Iniciar Treinamento',
            body: 'Treinar <b>' + _esc(name) + '</b>?<br>Sessoes: ' + (_trainingData && _trainingData.sessions_total || '?') + '<br>Custo por sessao: ' + (_trainingData && _trainingData.cost || 25) + ' GP',
            actions: '<button class="v-popup-btn v-popup-btn--success" data-action="confirm">Iniciar</button>'
                   + '<button class="v-popup-btn v-popup-btn--cancel" data-action="cancel">Cancelar</button>',
            onAction: function(action) {
                if (action === 'confirm') {
                    guildAction('train_start_' + _cat, { name: _name }).then(function(d) {
                        if (d && d.ok) renderTrainingTab();
                    }).catch(function(e) { console.error('[GUILD]', e); });
                    return true;
                }
            }
        });
    } else {
        guildAction('train_start_' + category, { name: name }).then(function(d) {
            if (d && d.ok) renderTrainingTab();
        }).catch(function(e) { console.error('[GUILD]', e); });
    }
};

window._advanceTraining = function() {
    guildAction('train_session').then(function(d) {
        if (d) {
            if (d.completed && typeof vToast === 'function') vToast('Treinamento concluído!', 'success');
            if (d.complication && typeof vToast === 'function') vToast('Complicação! ' + d.complication, 'warning');
            renderTrainingTab();
            if (window._renderPlayerInfo) _renderPlayerInfo();
        }
    }).catch(function(e) { console.error('[GUILD]', e); });
};

window._abandonTraining = function() {
    if (typeof vPopup !== 'undefined') {
        vPopup.show({
            header: '⚠️ Abandonar Treinamento',
            headerClass: 'v-popup-header--danger',
            body: 'Tem certeza? Todo o progresso será perdido.',
            actions: '<button class="v-popup-btn v-popup-btn--danger" data-action="confirm">Abandonar</button>'
                   + '<button class="v-popup-btn v-popup-btn--cancel" data-action="cancel">Cancelar</button>',
            onAction: function(action) {
                if (action === 'confirm') {
                    guildAction('train_start_abandon').then(function() { renderTrainingTab(); }).catch(function(e) { console.error('[GUILD]', e); });
                    return true;
                }
            }
        });
    } else if (confirm('Abandonar treinamento?')) {
        guildAction('train_start_abandon').then(function() { renderTrainingTab(); }).catch(function(e) { console.error('[GUILD]', e); });
    }
};

})();
