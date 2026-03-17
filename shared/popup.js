/* popup.js — Shared Popup Overlay Component (Valdoria Design System)
   API universal para TODOS os popups: vPopup.show(opts), vPopup.hide()
   Cada caller passa header, body HTML, e buttons com data-action.
*/
(function () {
    'use strict';

    var _overlay = null;
    var _busy = false;
    var _onHide = null;

    function _el(id) { return document.getElementById(id); }

    /**
     * Show a popup overlay.
     * @param {Object} opts
     * @param {string} opts.id - Overlay element ID (default: 'v-popup-overlay')
     * @param {string} opts.header - Header HTML
     * @param {string} [opts.headerClass] - Extra CSS class on header (e.g. 'v-popup-header--danger')
     * @param {string} opts.body - Body HTML
     * @param {string} opts.actions - Actions HTML (buttons with data-action)
     * @param {Function} [opts.onAction] - Custom action handler (receives action string). Return true to prevent default close+doAction.
     * @param {Function} [opts.onHide] - Called when popup hides
     * @param {boolean} [opts.closeOnOutside] - Close on overlay click (default: true)
     */
    function show(opts) {
        if (!opts) return;
        var overlayId = opts.id || 'v-popup-overlay';
        _overlay = _el(overlayId);
        if (!_overlay) {
            console.warn('[POPUP] overlay not found:', overlayId);
            return;
        }

        _onHide = opts.onHide || null;

        // Header
        var headerEl = _overlay.querySelector('.v-popup-header');
        if (headerEl) {
            headerEl.innerHTML = opts.header || '';
            headerEl.className = 'v-popup-header' + (opts.headerClass ? ' ' + opts.headerClass : '');
        }

        // Body
        var bodyEl = _overlay.querySelector('.v-popup-body');
        if (bodyEl) bodyEl.innerHTML = opts.body || '';

        // Actions
        var actionsEl = _overlay.querySelector('.v-popup-actions');
        if (actionsEl) {
            actionsEl.innerHTML = opts.actions || '';
            // Bind action buttons
            var btns = actionsEl.querySelectorAll('[data-action]');
            for (var i = 0; i < btns.length; i++) {
                btns[i].addEventListener('click', _makeHandler(opts.onAction));
            }
        }

        // Also bind actions in body (for grids, toggle cards, etc.)
        if (bodyEl) {
            var bodyBtns = bodyEl.querySelectorAll('[data-action]');
            for (var j = 0; j < bodyBtns.length; j++) {
                bodyBtns[j].addEventListener('click', _makeHandler(opts.onAction));
            }
        }

        // Show
        _overlay.style.display = 'flex';
        _overlay.classList.remove('hiding');
        void _overlay.offsetWidth;
        _overlay.classList.add('active');
        _busy = false;

        // Click outside to close
        if (opts.closeOnOutside !== false) {
            _overlay.onclick = function (e) {
                if (e.target === _overlay) hide();
            };
        }
    }

    function hide() {
        if (!_overlay) return;
        _overlay.classList.add('hiding');
        _overlay.classList.remove('active');
        var ov = _overlay;
        var cb = _onHide;
        setTimeout(function () {
            if (ov) ov.style.display = 'none';
            _overlay = null;
            _onHide = null;
            _busy = false;
            if (cb) cb();
        }, 300);
    }

    function isOpen() {
        return _overlay !== null && _overlay.classList.contains('active');
    }

    function _makeHandler(customHandler) {
        return function (e) {
            if (_busy) return;
            var action = e.currentTarget.getAttribute('data-action');
            if (!action) return;
            if (typeof haptic === 'function') haptic('light');

            // Cancel/close
            if (action === 'cancel' || action === 'v-popup-close') {
                hide();
                return;
            }

            // Custom handler can intercept
            if (customHandler) {
                var handled = customHandler(action, e.currentTarget);
                if (handled) return;
            }

            // Default: close popup, then dispatch action
            _busy = true;
            hide();
            setTimeout(function () {
                if (typeof doAction === 'function') doAction(action);
            }, 150);
        };
    }

    // Export
    window.vPopup = {
        show: show,
        hide: hide,
        isOpen: isOpen
    };
})();
