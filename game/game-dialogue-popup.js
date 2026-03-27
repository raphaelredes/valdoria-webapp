/**
 * game-dialogue-popup.js -- Popup fullscreen dedicado para conversas NPC
 * Exports: showDialoguePopup(data), hideDialoguePopup(), isDialoguePopupOpen()
 */
(function () {
'use strict';

var _dlgStack = [];
var _MAX_DEPTH = 8;
var _overlayEl = null;
var _skipBound = false;
var _SKIP_CBS = {'action_universal_back':1,'action_toggle_footer':1,'main_menu':1,'action_menu':1};

function _ensureDOM() {
    if (_overlayEl) return;
    _overlayEl = document.getElementById('dlg-popup-overlay');
}

window.showDialoguePopup = function (data) {
    _ensureDOM();
    if (!_overlayEl) { console.error('[DLG-POPUP] overlay not found'); return; }
    if (_dlgStack.length > 0) {
        var top = _dlgStack[_dlgStack.length - 1];
        var sameScreen = top.screen_id && data.screen_id && top.screen_id === data.screen_id;
        var sameSpeaker = top.dialogue && data.dialogue && top.dialogue.speaker === data.dialogue.speaker;
        if (sameScreen && sameSpeaker) {
            _dlgStack[_dlgStack.length - 1] = data;
        } else if (_dlgStack.length >= _MAX_DEPTH) {
            _dlgStack[_dlgStack.length - 1] = data;
        } else {
            _dlgStack.push(data);
        }
    } else {
        _dlgStack.push(data);
    }
    _render();
};

window.hideDialoguePopup = function () {
    _dlgStack = [];
    _hide();
    if (typeof clearMoodAmbient === 'function') clearMoodAmbient();
};

window.isDialoguePopupOpen = function () {
    _ensureDOM();
    return _dlgStack.length > 0 && _overlayEl && _overlayEl.classList.contains('active');
};

function _render() {
    if (_dlgStack.length === 0) return;
    var data = _dlgStack[_dlgStack.length - 1];
    var d = data.dialogue || {};
    var mood = d.mood || 'neutral';
    if (window.vTypewriter) vTypewriter.skip();
    var card = _overlayEl.querySelector('.dlg-popup-card');
    if (!card) return;
    card.className = 'dlg-popup-card dlg-popup-mood-' + mood;
    if (typeof applyMoodAmbient === 'function') applyMoodAmbient(mood);

    var iconEl = card.querySelector('.dlg-popup-mood-icon');
    var speakerEl = card.querySelector('.dlg-popup-speaker');
    var titleEl = card.querySelector('.dlg-popup-title');
    var badgeEl = card.querySelector('.dlg-popup-mood-badge');
    if (iconEl) iconEl.textContent = (typeof MOOD_ICONS !== 'undefined' && MOOD_ICONS[mood]) || '\ud83d\udde3';
    if (speakerEl) speakerEl.textContent = d.speaker || '';
    if (titleEl) {
        var npcTitle = d.title || '';
        titleEl.textContent = npcTitle;
        titleEl.style.display = npcTitle ? '' : 'none';
    }
    if (badgeEl) {
        var label = (typeof MOOD_LABELS !== 'undefined' && MOOD_LABELS[mood]) || '';
        badgeEl.textContent = label;
        badgeEl.style.display = label ? '' : 'none';
    }

    var textEl = card.querySelector('.dlg-popup-text');
    var skipEl = card.querySelector('.dlg-popup-skip-hint');
    var dialogueText = data.dialogue_text || _extractText(data.text || '');
    if (textEl) textEl.textContent = '';
    if (skipEl) { skipEl.style.display = ''; skipEl.style.animation = ''; }

    var choicesEl = card.querySelector('.dlg-popup-choices');
    if (choicesEl) choicesEl.innerHTML = '';
    _buildChoices(choicesEl, data.buttons || []);
    _buildFooter(card.querySelector('.dlg-popup-footer'));

    _overlayEl.style.display = 'flex';
    requestAnimationFrame(function () {
        _overlayEl.classList.add('active');
        _overlayEl.classList.remove('hiding');
    });

    var bodyEl = card.querySelector('.dlg-popup-body');
    if (textEl && dialogueText) {
        if (window.vTypewriter) {
            vTypewriter.write(textEl, dialogueText, {
                cursorClass: 'dlg-cursor',
                onDone: function () {
                    if (skipEl) skipEl.style.display = 'none';
                    _revealChoices(choicesEl);
                    var _fc = choicesEl && choicesEl.querySelector('.dlg-popup-choice');
                    if (_fc) setTimeout(function(){ _fc.focus(); }, 100);
                }
            });
        } else {
            textEl.textContent = dialogueText;
            if (skipEl) skipEl.style.display = 'none';
            _revealChoices(choicesEl);
            var _fc2 = choicesEl && choicesEl.querySelector('.dlg-popup-choice');
            if (_fc2) setTimeout(function(){ _fc2.focus(); }, 100);
        }
    }

    if (!_skipBound && bodyEl) {
        _skipBound = true;
        bodyEl.addEventListener('click', function () {
            if (window.vTypewriter) vTypewriter.skip();
            var _sk = _overlayEl && _overlayEl.querySelector('.dlg-popup-skip-hint');
            if (_sk) _sk.style.display = 'none';
            var _ch = _overlayEl && _overlayEl.querySelector('.dlg-popup-choices');
            if (_ch) _revealChoices(_ch);
        });
    }
}

function _buildChoices(container, buttons) {
    if (!container || !buttons) return;
    for (var r = 0; r < buttons.length; r++) {
        var row = buttons[r];
        if (!row) continue;
        for (var b = 0; b < row.length; b++) {
            var bd = row[b];
            if (!bd || bd.is_back || _SKIP_CBS[bd.cb]) continue;
            var btn = document.createElement('button');
            btn.className = 'dlg-popup-choice';
            btn.textContent = bd.text || '';
            if (bd.cb) btn.setAttribute('data-action', bd.cb);
            btn.addEventListener('click', _onChoiceClick);
            container.appendChild(btn);
        }
    }
}

function _revealChoices(container) {
    if (!container) return;
    var choices = container.querySelectorAll('.dlg-popup-choice');
    var isLite = document.body.classList.contains('perf-lite');
    for (var i = 0; i < choices.length; i++) {
        if (choices[i].classList.contains('visible')) continue;
        if (isLite) {
            choices[i].classList.add('visible');
        } else {
            (function (el, idx) {
                el.style.transition = 'opacity var(--v-transition-base,0.2s),transform var(--v-transition-base,0.2s)';
                setTimeout(function () { el.classList.add('visible'); }, 80 + idx * 80);
            })(choices[i], i);
        }
    }
}

function _onChoiceClick(e) {
    var cb = e.currentTarget.getAttribute('data-action');
    if (cb && typeof doAction === 'function') {
        if (typeof haptic === 'function') haptic('light');
        doAction(cb);
    }
}

function _buildFooter(container) {
    if (!container) return;
    container.innerHTML = '';
    if (_dlgStack.length > 1) {
        var backBtn = document.createElement('button');
        backBtn.className = 'dlg-popup-footer-btn';
        backBtn.textContent = '\u2b05\ufe0f Voltar';
        backBtn.addEventListener('click', function () {
            if (_dlgStack.length > 1) { _dlgStack.pop(); _render(); }
        });
        container.appendChild(backBtn);
    }
    var closeBtn = document.createElement('button');
    closeBtn.className = 'dlg-popup-footer-btn';
    closeBtn.textContent = '\ud83c\udfe0 Fechar';
    closeBtn.addEventListener('click', function () { window.hideDialoguePopup(); if (typeof doAction === 'function') doAction('action_universal_back'); });
    container.appendChild(closeBtn);
}

function _hide() {
    _ensureDOM();
    if (!_overlayEl) return;
    if (window.vTypewriter) vTypewriter.skip();
    _overlayEl.classList.add('hiding');
    _overlayEl.classList.remove('active');
    setTimeout(function () {
        _overlayEl.style.display = 'none';
        _overlayEl.classList.remove('hiding');
    }, 320);
}

function _extractText(rawText) {
    if (typeof extractDialogueText === 'function') return extractDialogueText(rawText);
    return rawText.replace(/<[^>]+>/g, '').trim();
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && window.isDialoguePopupOpen && isDialoguePopupOpen()) {
        window.hideDialoguePopup();
        if (typeof doAction === 'function') doAction('action_universal_back');
    }
});

console.log('[DLG-POPUP] loaded, showDialoguePopup=' + typeof window.showDialoguePopup);
})();
