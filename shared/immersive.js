// ═══════════════════════════════════════════════════════════
//  Immersive Mode — Shared Utility
//  Collapsible bottom panel toggle (localStorage-based)
//  Usage: ValdoriaImmersive.init()
//         ValdoriaImmersive.updateEligibility(screenData)
// ═══════════════════════════════════════════════════════════

var ValdoriaImmersive = (function() {
    'use strict';

    var KEY = 'valdoria_immersive';
    var _collapsed = false;
    var _eligible = false;

    function init() {
        try { _collapsed = localStorage.getItem(KEY) === '1'; } catch (e) { _collapsed = false; }

        var toggleBtn = document.getElementById('immersive-toggle');
        var restoreBtn = document.getElementById('immersive-restore');

        if (toggleBtn) {
            toggleBtn.onclick = function() {
                if (typeof haptic === 'function') haptic('light');
                _set(true);
            };
        }
        if (restoreBtn) {
            restoreBtn.onclick = function() {
                if (typeof haptic === 'function') haptic('light');
                _set(false);
            };
        }
    }

    function _set(collapsed) {
        _collapsed = collapsed;
        try { localStorage.setItem(KEY, collapsed ? '1' : '0'); } catch (e) { /* */ }
        _apply();
    }

    function _apply() {
        var toggle = document.getElementById('immersive-toggle');
        var restore = document.getElementById('immersive-restore');
        var panel = document.getElementById('bottom-panel');
        var screen = document.getElementById('screen');

        if (!_eligible) {
            if (toggle) toggle.style.display = 'none';
            if (restore) restore.style.display = 'none';
            if (panel) panel.classList.remove('immersive-collapsed');
            if (screen) screen.classList.remove('immersive-full');
            if (typeof updateBottomPadding === 'function') updateBottomPadding();
            return;
        }

        if (_collapsed) {
            if (toggle) toggle.style.display = 'none';
            if (panel) panel.classList.add('immersive-collapsed');
            if (restore) restore.style.display = '';
            if (screen) screen.classList.add('immersive-full');
        } else {
            if (panel) panel.classList.remove('immersive-collapsed');
            if (toggle) toggle.style.display = '';
            if (restore) restore.style.display = 'none';
            if (screen) screen.classList.remove('immersive-full');
            if (typeof updateBottomPadding === 'function') updateBottomPadding();
        }
    }

    function updateEligibility(screenData) {
        _eligible = !!(screenData && screenData.immersive);
        // Auto-expand on navigation — buttons must always be visible
        if (_collapsed && _eligible) {
            _collapsed = false;
        }
        _apply();
    }

    function isCollapsed() { return _collapsed; }

    return {
        init: init,
        updateEligibility: updateEligibility,
        isCollapsed: isCollapsed
    };
})();
