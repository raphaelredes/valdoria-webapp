/* game-quest-popup.js — Quest Detail Popup Overlay for Game Hub */
/* Shows quest details in a popup overlay instead of changing screens */

(function () {
    'use strict';

    var _overlay = null;
    var _currentData = null;
    var _busy = false;

    function _el(id) { return document.getElementById(id); }

    function _esc(text) {
        if (!text) return '';
        return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function _renderBody(q) {
        var h = '';

        // NPC icon
        var npcIcon = q.npc_icon || '\u2694\uFE0F';
        h += '<div style="text-align:center;margin-bottom:8px;">';
        h += '<span style="font-size:28px;">' + npcIcon + '</span>';
        h += '</div>';

        // Ready banner
        if (q.ready) {
            h += '<div style="text-align:center;padding:6px 12px;margin-bottom:10px;'
                + 'background:rgba(76,175,80,0.12);border:1px solid rgba(76,175,80,0.3);'
                + 'border-radius:6px;color:#81c784;font-size:13px;font-weight:600;">'
                + '\u2705 Pronta para entrega</div>';
        }

        // Chain indicator
        if (q.chain) {
            h += '<div style="text-align:center;font-size:12px;color:var(--v-text-dim);margin-bottom:8px;">'
                + '\ud83d\udd17 Cap\u00edtulo ' + q.chain.part + ' de ' + q.chain.total;
            if (q.chain.next_title) {
                h += ' \u2192 Pr\u00f3ximo: <em>' + _esc(q.chain.next_title) + '</em>';
            }
            h += '</div>';
        }

        // Description
        if (q.desc) {
            h += '<div style="font-size:13px;line-height:1.6;color:var(--v-text);margin-bottom:10px;'
                + 'padding:8px 10px;background:rgba(74,56,40,0.15);border-radius:6px;'
                + 'border-left:2px solid var(--v-gold-dim);">'
                + _esc(q.desc) + '</div>';
        }

        // Current objective
        if (q.obj && q.status === 'active') {
            h += '<div style="margin-bottom:10px;">';
            h += '<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;'
                + 'color:var(--v-gold-dim);margin-bottom:4px;">\ud83d\udcdc O que voc\u00ea sabe</div>';
            if (q.ready) {
                h += '<div style="font-size:13px;color:var(--v-text);font-style:italic;">'
                    + 'A miss\u00e3o est\u00e1 cumprida. Resta apenas reportar o feito.</div>';
            } else {
                h += '<div style="font-size:13px;color:var(--v-text);font-style:italic;">'
                    + _esc(q.obj) + '</div>';
            }
            h += '</div>';
        }

        // Journey timeline
        if (q.objectives && q.objectives.length > 0) {
            var hasCompleted = false;
            for (var ci = 0; ci < q.objectives.length; ci++) {
                if (q.objectives[ci].state === 'done') { hasCompleted = true; break; }
            }
            if (hasCompleted) {
                h += '<div style="margin-bottom:10px;padding:8px;background:rgba(74,56,40,0.1);border-radius:6px;">';
                h += '<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;'
                    + 'color:var(--v-gold-dim);margin-bottom:6px;">\ud83d\udcd6 Sua Jornada</div>';
                for (var i = 0; i < q.objectives.length; i++) {
                    var o = q.objectives[i];
                    if (o.state === 'future') continue;
                    var marker = o.state === 'done' ? '\u2705' : '\u25b8';
                    var color = o.state === 'done' ? 'var(--v-text-dim)' : 'var(--v-text)';
                    h += '<div style="font-size:12px;color:' + color + ';padding:2px 0;">'
                        + marker + ' <em>' + _esc(o.text) + '</em></div>';
                }
                h += '</div>';
            }
        }

        // Hint
        if (q.hint) {
            h += '<div style="font-size:12px;color:var(--v-info,#5b9bd5);font-style:italic;'
                + 'margin-bottom:10px;padding:6px 10px;background:rgba(91,155,213,0.08);'
                + 'border-radius:6px;">\ud83d\udcd6 ' + _esc(q.hint) + '</div>';
        }

        // NPC giver
        if (q.npc) {
            h += '<div style="font-size:12px;color:var(--v-text-dim);margin-bottom:10px;">'
                + (q.npc_icon || '\ud83d\udc64') + ' ' + _esc(q.npc) + '</div>';
        }

        // Rewards
        var rewHtml = '';
        if (q.xp) rewHtml += '<span style="margin-right:10px;">\u2728 ' + q.xp + ' XP</span>';
        if (q.gold) rewHtml += '<span style="margin-right:10px;">\ud83d\udcb0 ' + q.gold + ' GP</span>';
        if (q.items && q.items.length > 0) {
            for (var ii = 0; ii < q.items.length; ii++) {
                rewHtml += '<span style="margin-right:10px;">\ud83c\udf81 ' + _esc(q.items[ii]) + '</span>';
            }
        }
        if (rewHtml) {
            h += '<div style="margin-top:6px;padding:8px 10px;background:rgba(196,149,58,0.08);'
                + 'border-radius:6px;border:1px solid rgba(196,149,58,0.15);">';
            h += '<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;'
                + 'color:var(--v-gold-dim);margin-bottom:4px;">\ud83d\udc8e Recompensas</div>';
            h += '<div style="font-size:13px;color:var(--v-text);">' + rewHtml + '</div>';
            h += '</div>';
        }

        return h;
    }

    function _renderActions(q) {
        var h = '';

        if (q.can_turnin && q.turnin_cb) {
            h += '<button class="qp-btn qp-btn--turnin" data-action="' + q.turnin_cb + '">'
                + '\ud83d\udcdc Entregar Miss\u00e3o</button>';
        }

        if (q.can_abandon && q.abandon_cb) {
            h += '<button class="qp-btn qp-btn--abandon" data-action="' + q.abandon_cb + '">'
                + '\u274c Abandonar</button>';
        }

        h += '<button class="qp-btn qp-btn--close" data-action="cancel">'
            + '\ud83c\udfe0 Voltar</button>';

        return h;
    }

    window.showQuestPopup = function (data) {
        _currentData = data;
        _overlay = _el('quest-popup-overlay');
        if (!_overlay) {
            console.warn('[QUEST-POPUP] overlay element not found');
            return;
        }

        _el('qp-header').innerHTML = '\u2694\uFE0F ' + _esc(data.title || 'Detalhes da Miss\u00e3o');
        _el('qp-body').innerHTML = _renderBody(data);
        _el('qp-actions').innerHTML = _renderActions(data);

        _overlay.style.display = 'flex';
        _overlay.classList.remove('hiding');
        void _overlay.offsetWidth;
        _overlay.classList.add('active');
        _busy = false;

        _overlay.querySelectorAll('[data-action]').forEach(function (btn) {
            btn.addEventListener('click', _handleAction);
        });

        _overlay.onclick = function (e) {
            if (e.target === _overlay) hideQuestPopup();
        };
    };

    window.hideQuestPopup = function () {
        if (!_overlay) return;
        _overlay.classList.add('hiding');
        _overlay.classList.remove('active');
        setTimeout(function () {
            if (_overlay) _overlay.style.display = 'none';
            _overlay = null;
            _currentData = null;
            _busy = false;
        }, 300);
    };

    function _handleAction(e) {
        if (_busy) return;
        var action = e.currentTarget.getAttribute('data-action');
        if (!action) return;

        if (action === 'cancel') {
            hideQuestPopup();
            return;
        }

        _busy = true;
        hideQuestPopup();
        setTimeout(function () {
            if (typeof doAction === 'function') doAction(action);
        }, 150);
    }
})();
