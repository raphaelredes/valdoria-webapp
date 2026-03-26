(function(){
'use strict';
var _overlay = null, _built = false;

function _build() {
    _overlay = document.getElementById('settings-overlay');
    if (!_overlay) return;
    _overlay.innerHTML = '<div class="settings-popup-header">'
        + '<div class="settings-popup-title">CONFIGURA\u00c7\u00d5ES</div>'
        + '<button class="settings-close-btn">\u00d7</button>'
        + '</div>'
        + '<div id="settings-popup-content"></div>'
        + '<button class="settings-popup-close-bottom">Fechar</button>';
    _overlay.querySelector('.settings-close-btn').onclick = function() { window.hideSettingsPopup(); };
    _overlay.querySelector('.settings-popup-close-bottom').onclick = function() { window.hideSettingsPopup(); };
    _built = true;
}

window.showSettingsPopup = function() {
    if (!_built) _build();
    if (!_overlay) return;
    var bp = document.getElementById('bottom-panel');
    var it = document.getElementById('immersive-toggle');
    var ir = document.getElementById('immersive-restore');
    if (bp) bp.style.display = 'none';
    if (it) it.style.display = 'none';
    if (ir) ir.style.display = 'none';
    _overlay.classList.add('active');
    _overlay.style.display = 'flex';
    requestAnimationFrame(function() { _overlay.style.opacity = '1'; });
    _fetchSettings();
    if (window.vEscapeKey) vEscapeKey.push(function() { window.hideSettingsPopup(); });
};

function _fetchSettings() {
    var contentEl = document.getElementById('settings-popup-content');
    if (!contentEl) return;
    contentEl.innerHTML = '<div class="settings-loading">Carregando...</div>';
    if (!window.S || !S.apiBase || !S.token) return;
    if (typeof apiCall !== 'function') return;
    apiCall('/api/game/action', { cb: 'action_settings', sv: S.screenVersion }).then(function(data) {
        if (!data || !window.isSettingsPopupOpen || !isSettingsPopupOpen()) return;
        if (data.sv !== undefined) S.screenVersion = data.sv;
        contentEl.innerHTML = '';
        if (data.settings_data && typeof injectGameSettings === 'function') injectGameSettings(contentEl, data.settings_data);
        if (typeof injectFontPicker === 'function') injectFontPicker(contentEl);
        if (typeof injectAudioSettings === 'function') injectAudioSettings(contentEl);
    }).catch(function(e) {
        console.error('[GAME] Settings fetch error:', e);
        if (contentEl) contentEl.innerHTML = '<div class="settings-loading">Erro ao carregar configura\u00e7\u00f5es.</div>';
    });
}

window.hideSettingsPopup = function() {
    if (!_overlay) return;
    _overlay.style.opacity = '0';
    _overlay.classList.add('hiding');
    setTimeout(function() {
        _overlay.classList.remove('active', 'hiding');
        _overlay.style.display = 'none';
        var bp = document.getElementById('bottom-panel');
        var it = document.getElementById('immersive-toggle');
        var ir = document.getElementById('immersive-restore');
        if (bp) bp.style.display = '';
        if (it) it.style.display = '';
        if (ir) ir.style.display = '';
    }, 220);
    if (window.vEscapeKey) vEscapeKey.pop();
};

window.isSettingsPopupOpen = function() {
    return _overlay && _overlay.classList.contains('active');
};

if (typeof vEscapeKey !== 'undefined') {
    vEscapeKey.register(function() {
        return typeof window.isSettingsPopupOpen === 'function' && window.isSettingsPopupOpen();
    }, function() {
        if (typeof window.hideSettingsPopup === 'function') window.hideSettingsPopup();
    });
}
})();
