/**
 * ValdoriaTransitionLoader v1.0 — magic-circle loader pra transições entre WebApps
 *
 * 2026-05-13 USER REQUEST: "use a mesma tela de carregamento que aparece logo após
 * TOQUE PARA INICIAR como padrão para carregamento entre cidade, exploração e
 * combate, assim não fica a tela parada para o jogador, mas sim um carregamento
 * real acontecendo".
 *
 * Substitui IIFE duplicada que vivia em simuladores/cidade.html, exploracao.html
 * e combate.html (bugbot LOW PR #90 — code duplication).
 *
 * API:
 *   window._vTransitionLoader.show(label)
 *     → popula #loading overlay com ValdoriaLoadingHTML (icon=magic-circle) +
 *       seta .loading-stage com `label` contextual ("Viajando para Floresta…",
 *       "Retornando à cidade…", etc) + .loading-tip com flavor genérico random.
 *   window._vTransitionLoader.hide()
 *     → seta #loading display:none, cancela retries pendentes do show().
 *
 * RACE CONDITION FIX (bugbot LOW PR #90, commit 87bb5bfb):
 *   show() inicia retry loop pra esperar ValdoriaLoadingHTML carregar.
 *   hide() entre retries setava display:none mas o próximo _populate ressurgia.
 *   Fix: flag _showActive set por show(), checada antes de cada retry, limpa
 *   por hide() → cancela retries.
 *
 * AUTO-HIDE (destino de transição):
 *   Quando page carrega com ?nointro=1, simulador chama show() no IIFE de
 *   intro e seta window.__vTransitionLoaderShownAtBoot=true. Este script
 *   instala window.load handler que esconde 600ms após load completar.
 *
 * DEPENDÊNCIAS:
 *   - loading-template.js (window.ValdoriaLoadingHTML) — deve carregar antes
 *   - DOM ter #loading element
 *
 * USO nos simuladores:
 *   <script src="../valdoria-webapp/shared/loading-template.js?v=..."></script>
 *   <script src="../valdoria-webapp/shared/transition-loader.js?v=..."></script>
 *   ...
 *   if (window._vTransitionLoader) window._vTransitionLoader.show('Carregando…');
 */
(function(global){
    'use strict';

    var _hidden = false;
    var _showActive = false;

    /* Tips genéricos rotativos (igual /play/) — diferente do label contextual
       passado pra show(). Stage mostra contexto, tip mostra flavor. */
    var _flavorTips = [
        'Reunindo o grupo…',
        'Consultando o Mestre…',
        'Despertando os runeiros…',
        'Conectando aos ventos de Valdória…',
        'Buscando o caminho…'
    ];

    function _populate(label) {
        if (typeof global.ValdoriaLoadingHTML !== 'function') return false;
        var ld = document.getElementById('loading');
        if (!ld) return false;
        var tmp = document.createElement('div');
        var flavor = _flavorTips[Math.floor(Math.random() * _flavorTips.length)];
        tmp.innerHTML = global.ValdoriaLoadingHTML({
            overlayId: 'loading',
            title: 'LENDAS DE VALDORIA',
            defaultTip: flavor,
            hasStage: true,
            hasRetry: false,
            icon: 'magic-circle',
            particleSet: 'standard',
            tier: global._valdoriaPerformanceTier || 'full'
        });
        var ov = tmp.firstElementChild;
        if (!ov) return false;
        ov.style.background = '#1a1510';
        ov.style.display = '';
        if (ld.parentNode) ld.parentNode.replaceChild(ov, ld);
        var st = document.getElementById('loading-stage');
        if (st && label) st.textContent = label;
        _hidden = false;
        return true;
    }

    function show(label) {
        _showActive = true;
        function _try(retries) {
            if (!_showActive) return;  /* hide() cancelou — abort */
            if (_populate(label)) return;
            if (retries <= 0) return;
            setTimeout(function(){ _try(retries - 1); }, 60);
        }
        _try(15);  /* ~900ms retry window pra ValdoriaLoadingHTML carregar */
    }

    function hide() {
        _showActive = false;  /* cancela retries pendentes do show() */
        if (_hidden) return;
        _hidden = true;
        var ld = document.getElementById('loading');
        if (ld) ld.style.display = 'none';
    }

    global._vTransitionLoader = { show: show, hide: hide };

    /* Auto-hide quando page carregar completo — cobre simulador-destino que
       chamou show() via ?nointro=1 no IIFE de intro. */
    global.addEventListener('load', function(){
        setTimeout(function(){
            if (global.__vTransitionLoaderShownAtBoot && global._vTransitionLoader) {
                global._vTransitionLoader.hide();
            }
        }, 600);
    });
})(typeof window !== 'undefined' ? window : globalThis);
