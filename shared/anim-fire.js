/**
 * anim-fire.js — Helper padronizado para fogueira reaproveitável (X-6.5.51BO 2026-05-15)
 *
 * Reaproveita CampFire (valdoria-webapp/explore/explore-camp-fire.js) — sistema
 * canvas 2D additive-blended particle, perf-tier aware (20/35/55 particles).
 * Adiciona helper vFire.attach() que monta o HTML completo (logs + canvas +
 * ground glow + sparks) com a estrutura de anim-fire.css.
 *
 * USAGE:
 *   var fire = vFire.attach(containerEl, {
 *     width: 40,         // largura visual (px). Default 160.
 *     height: 50,        // altura visual (px). Default 180.
 *     canvasSize: 60,    // resolução interna do canvas. Default = width.
 *     sparks: 4          // número de faíscas (0-6). Default 6.
 *   });
 *   // Ao destruir a tela:
 *   fire.destroy();
 *
 * IMPORTAR:
 *   <link rel="stylesheet" href="../valdoria-webapp/shared/anim-fire.css">
 *   <script src="../valdoria-webapp/explore/explore-camp-fire.js"></script>  // CampFire engine
 *   <script src="../valdoria-webapp/shared/anim-fire.js"></script>           // vFire wrapper
 *
 * INSTÂNCIAS MÚLTIPLAS: CampFire é singleton (uma fogueira ativa por vez).
 * Chamar vFire.attach() de novo destrói a anterior automaticamente.
 */
(function () {
    'use strict';

    if (window.vFire) return;  // idempotente

    function _spark() {
        var s = document.createElement('span');
        s.className = 'vfire-spark';
        return s;
    }

    function attach(container, opts) {
        if (!container) return { destroy: function () {} };
        opts = opts || {};
        var W = opts.width || 160;
        var H = opts.height || 180;
        var canvasSize = opts.canvasSize || W;
        var sparkCount = (opts.sparks == null) ? 6 : Math.max(0, Math.min(6, opts.sparks));

        // Limpa qualquer conteúdo prévio (e destrói CampFire anterior se houver)
        if (window.CampFire && typeof CampFire.destroy === 'function') {
            CampFire.destroy();
        }
        container.innerHTML = '';

        // Monta estrutura
        var area = document.createElement('div');
        area.className = 'vfire-area';
        area.style.setProperty('--vfire-w', W + 'px');
        area.style.setProperty('--vfire-h', H + 'px');

        var glow = document.createElement('div');
        glow.className = 'vfire-ground-glow';
        area.appendChild(glow);

        var logs = document.createElement('div');
        logs.className = 'vfire-logs';
        for (var i = 0; i < 3; i++) {
            var log = document.createElement('div');
            log.className = 'vfire-log';
            logs.appendChild(log);
        }
        var emb = document.createElement('div');
        emb.className = 'vfire-log-ember';
        logs.appendChild(emb);
        area.appendChild(logs);

        var canvas = document.createElement('canvas');
        canvas.className = 'vfire-canvas';
        canvas.width = canvasSize;
        canvas.height = canvasSize;
        area.appendChild(canvas);

        if (sparkCount > 0) {
            var embers = document.createElement('div');
            embers.className = 'vfire-embers';
            for (var j = 0; j < sparkCount; j++) embers.appendChild(_spark());
            area.appendChild(embers);
        }

        container.appendChild(area);

        // Inicializa CampFire no canvas
        if (window.CampFire && typeof CampFire.init === 'function') {
            CampFire.init(canvas);
        } else {
            console.warn('[vFire] CampFire engine not loaded — fire canvas will be static');
        }

        return {
            destroy: function () {
                if (window.CampFire && typeof CampFire.destroy === 'function') {
                    CampFire.destroy();
                }
                if (area.parentNode) area.parentNode.removeChild(area);
            }
        };
    }

    window.vFire = { attach: attach };
})();
