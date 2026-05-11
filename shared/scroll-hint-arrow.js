/* Scroll Hint Arrow — Universal Auto-Instrumenter (2026-05-11)
 *
 * Detecta containers scrollable e attacha uma seta dourada animada
 * indicando ao jogador que ha mais conteudo abaixo. Auto-esconde
 * quando chega ao fim. Requer shared/scroll-hint-arrow.css carregado.
 *
 * Uso basico (auto-attach):
 *   <element data-scroll-hint> ... </element>
 *   Carregue scroll-hint-arrow.js e tudo se conecta sozinho.
 *
 * API JS:
 *   vScrollHint.register('.minha-classe')  — adiciona seletor ao scan
 *   vScrollHint.attach(el)                 — attacha manualmente a 1 elem
 *   vScrollHint.refresh()                  — re-scan body (uteis em DOM dinamico)
 *
 * Pattern extraido de simuladores/combate.html (X-6.5.51AB).
 * Funciona em qualquer container com overflow-y: auto/scroll.
 */
(function () {
    'use strict';

    if (window.vScrollHint && window.vScrollHint.__loaded) return;

    // Seletores auto-detectados sempre. Adicione mais via .register().
    var SELECTORS = ['[data-scroll-hint]'];

    function attach(el) {
        if (!el || el.__scrollHinted) return;
        if (!(el instanceof Element)) return;
        el.__scrollHinted = true;

        // Host precisa de position: relative pra seta absoluta funcionar
        try {
            var cs = window.getComputedStyle(el);
            if (cs && cs.position === 'static') el.style.position = 'relative';
        } catch (_e) { /* fallback ok */ }

        var arrow = document.createElement('div');
        arrow.className = 'v-scroll-hint-arrow v-scroll-hint-hidden';
        arrow.setAttribute('aria-hidden', 'true');
        arrow.innerHTML = '<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M8 12L2 6h12z" fill="currentColor"/></svg>';
        el.appendChild(arrow);

        var ro = null;

        function update() {
            if (!el.isConnected) {
                try { ro && ro.disconnect(); } catch (_e) { /* ok */ }
                return;
            }
            var atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 6;
            var hasScroll = el.scrollHeight > el.clientHeight + 4;
            if (hasScroll && !atBottom) {
                arrow.classList.remove('v-scroll-hint-hidden');
            } else {
                arrow.classList.add('v-scroll-hint-hidden');
            }
        }

        el.addEventListener('scroll', update, { passive: true });
        try {
            ro = new ResizeObserver(update);
            ro.observe(el);
        } catch (_eRO) { /* sem ResizeObserver: scroll listener basta */ }

        // 2 updates iniciais cobrem conteudo carregado tardiamente
        setTimeout(update, 80);
        setTimeout(update, 400);
    }

    function scanRoot(root) {
        if (!root || !root.querySelectorAll) return;
        SELECTORS.forEach(function (sel) {
            try {
                if (root.matches && root.matches(sel)) attach(root);
                root.querySelectorAll(sel).forEach(attach);
            } catch (_eSel) { /* seletor invalido */ }
        });
    }

    function register(selector) {
        if (typeof selector !== 'string' || !selector) return;
        if (SELECTORS.indexOf(selector) !== -1) return;
        SELECTORS.push(selector);
        // Re-scan apos novo seletor registrado
        try { scanRoot(document.body); } catch (_eS) { /* ok */ }
    }

    function refresh() {
        try { scanRoot(document.body); } catch (_eR) { /* ok */ }
    }

    // MutationObserver: pega popups e novos elementos dinamicos
    var observer = null;
    function ensureObserver() {
        if (observer) return;
        try {
            observer = new MutationObserver(function (muts) {
                muts.forEach(function (m) {
                    if (!m.addedNodes) return;
                    m.addedNodes.forEach(function (n) {
                        if (n.nodeType === 1) scanRoot(n);
                    });
                });
            });
            observer.observe(document.body, { childList: true, subtree: true });
        } catch (_eO) { /* observer falhou — funciona sem ele, mas sem dinamica */ }
    }

    function init() {
        scanRoot(document.body);
        ensureObserver();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }

    window.vScrollHint = {
        __loaded: true,
        attach: attach,
        register: register,
        refresh: refresh
    };
})();
