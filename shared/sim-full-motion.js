/* X-6.5.51AG (2026-05-07): Bypass de prefers-reduced-motion para gameplay AAA.
   ════════════════════════════════════════════════════════════════════════════════
   Combate, exploração e outros sistemas de jogo SÃO o foco do jogador. Quando o
   SO tem `prefers-reduced-motion: reduce` ligado (default em vários Windows 11 e
   iOS), Chrome 147+ impõe `* { animation-duration: 0.01ms !important; transition-
   duration: 0.01ms !important }` ao nível user-agent + author CSS, MATANDO toda
   animação. Mísseis teleportam, dano não aparece, fireball instantâneo, flashes
   invisíveis. Acessibilidade aqui significa "combate É o foco — DEVE ser visível".

   Este snippet bypassa a redução em 4 camadas:
     1. JS: `matchMedia('(prefers-reduced-motion: reduce)').matches` LIE FALSE
     2. JS: `window.vReducedMotion = false` (forçado via Object.defineProperty)
     3. JS: `ValdoriaMotion.duration(normal, reduced)` retorna SEMPRE normal
     4. CSS: detecta SO real (via probe DOM, já que matchMedia foi spoofed),
             fetch valdoria-design.css/combat-polish.css, strip a regra global
             `* { animation-duration: 0.01ms !important; ... }`, injeta versão
             modificada e disabilita o <link> original.
     5. CSS: itera CSSOM, encontra regras com `animation:` shorthand sem
             !important, e re-emite cópias COM !important pra vencer Chrome
             enforcement.

   USAGE: Carregar este arquivo o MAIS CEDO POSSÍVEL no <head>, ANTES de outros
          scripts que checam matchMedia/vReducedMotion (haptic.js, motion.js,
          combat-vfx.js, audio-manager.js, etc). Ex:

          <script src="../valdoria-webapp/shared/sim-full-motion.js?v=' + v + '"></script>

   IDEMPOTENT: chamar várias vezes é seguro (early-return se já rodou).
*/
(function () {
    'use strict';
    if (window.__SIM_FULL_MOTION_INSTALLED) return;
    window.__SIM_FULL_MOTION_INSTALLED = true;

    /* Sessão #38 (2026-05-26) perf P0: spoof APENAS em tier 'full' (flagship).
       Lite/medium respeitam prefers-reduced-motion honestamente — a11y (usuários
       com vestibular issues, fotossensibilidade) + battery-saver-mode em Android
       low-end (que automaticamente ativa reduce-motion). Detection inline
       porque este script carrega ANTES de loading-guard.js no <head>. */
    /* Opt-out EXPLÍCITO de a11y (2026-07-06): se o jogador LIGOU "reduzir animações"
       dentro do jogo (settings → valdoria_reduce_motion=1), respeitamos SEMPRE, em
       qualquer tier. Esta é a escolha REAL de motion-sensitivity — diferente do
       battery-saver do SO, que liga prefers-reduced-motion por energia, não por
       enjoo. Damos ao jogador o controle explícito em vez de adivinhar pelo SO. */
    try {
        if (localStorage.getItem('valdoria_reduce_motion') === '1') {
            try { console.info('[SIM:FULL-MOTION] opt-out do jogador (valdoria_reduce_motion=1) — respeitando reduced-motion'); } catch (_) {}
            return;
        }
    } catch (_) {}

    var __spoofTier;
    try {
        var __pref = localStorage.getItem('valdoria_loading_lite');
        if (__pref === '1') __spoofTier = 'lite';
        else if (__pref === '0') __spoofTier = 'full';
        else {
            var __cores = navigator.hardwareConcurrency || 8;
            var __mem = navigator.deviceMemory || 8;
            if (__cores <= 2 || __mem <= 2 || (__cores <= 4 && __mem <= 4)) __spoofTier = 'lite';
            else if (__cores <= 8 && __mem <= 8) __spoofTier = 'medium';
            else __spoofTier = 'full';
        }
    } catch (_) { __spoofTier = 'full'; }
    /* Sessão #38 → REVISTO 2026-07-06: o bypass agora vale pra MEDIUM + FULL.
       Só LITE respeita prefers-reduced-motion (perf real + é onde mora o caso
       "battery-saver de Android fraco auto-liga reduce-motion"). MEDIUM é um
       telefone CAPAZ — ex.: Galaxy S20 FE (8 núcleos / 6GB → deviceMemory=4 =
       medium). Matar TODA a animação do cenário só porque o battery-saver ligou
       reduce-motion é UX ruim: animação de gameplay (grama ao vento, fog, fauna,
       eventos, weather) NÃO é decoração, o jogador precisa vê-la. Quem tem
       sensibilidade vestibular usa o opt-out explícito acima. */
    if (__spoofTier === 'lite') {
        try { console.info('[SIM:FULL-MOTION] tier=lite — respeitando prefers-reduced-motion (a11y + perf)'); } catch (_) {}
        return;
    }

    /* === 1) matchMedia spoof ============================================ */
    if (typeof window.matchMedia === 'function') {
        try {
            var realInitMatches = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            window.__SIM_OS_REDUCED_MOTION = !!realInitMatches;  /* save real state for CSS strip */
        } catch (_) { window.__SIM_OS_REDUCED_MOTION = false; }
        var _origMatchMedia = window.matchMedia.bind(window);
        window.matchMedia = function (query) {
            var mql = _origMatchMedia(query);
            if (typeof query === 'string'
                && query.indexOf('prefers-reduced-motion') >= 0
                && query.indexOf('reduce') >= 0) {
                try {
                    Object.defineProperty(mql, 'matches', {
                        get: function () { return false; },
                        configurable: true
                    });
                } catch (_) {}
            }
            return mql;
        };
    }

    /* === 2) vReducedMotion = false (haptic.js seta isso baseado em matchMedia) === */
    try {
        Object.defineProperty(window, 'vReducedMotion', {
            get: function () { return false; },
            set: function (_) { /* ignore */ },
            configurable: true
        });
    } catch (_) {}

    /* === 3) ValdoriaMotion.duration patch (motion.js) =================== */
    var _waitVM = setInterval(function () {
        if (typeof window.ValdoriaMotion === 'undefined') return;
        clearInterval(_waitVM);
        try {
            window.ValdoriaMotion.duration = function (normal, _reduced) { return normal; };
            if (typeof window.ValdoriaMotion.isReduced === 'function') {
                window.ValdoriaMotion.isReduced = function () { return false; };
            }
        } catch (_) {}
    }, 20);
    setTimeout(function () { clearInterval(_waitVM); }, 5000);

    /* === 4) CSS strip (fetch + modify + inject + disable original) ====== */
    /* Só roda se SO REAL tem reduced-motion ligado. window.__SIM_OS_REDUCED_MOTION
       foi setado ANTES do spoof, mantendo o estado real. */
    if (!window.__SIM_OS_REDUCED_MOTION) return;

    var FILES_HEURISTIC = ['valdoria-design.css', 'combat-polish.css'];
    var processedHrefs = {};

    function processLinkTag(link) {
        if (!link || !link.href) return Promise.resolve();
        var href = link.href;
        var matched = false;
        for (var i = 0; i < FILES_HEURISTIC.length; i++) {
            if (href.indexOf(FILES_HEURISTIC[i]) >= 0) { matched = true; break; }
        }
        if (!matched || processedHrefs[href]) return Promise.resolve();
        processedHrefs[href] = true;
        return fetch(href).then(function (r) {
            if (!r.ok) throw new Error('fetch_failed_' + r.status);
            return r.text();
        }).then(function (text) {
            if (text.indexOf('animation-duration') < 0 || text.indexOf('0.01ms') < 0) return;
            var modified = text
                .replace(/animation-duration\s*:\s*0\.01ms\s*!important\s*;?/g, '/* sim-no-reduce */')
                .replace(/transition-duration\s*:\s*0\.01ms\s*!important\s*;?/g, '/* sim-no-reduce */')
                .replace(/transition-duration\s*:\s*var\(--v-transition-instant\)\s*!important\s*;?/g, '/* sim-no-reduce */')
                .replace(/animation-iteration-count\s*:\s*1\s*!important\s*;?/g, '/* sim-no-reduce */');
            link.disabled = true;
            var s = document.createElement('style');
            s.dataset.simNoReduce = href.split('/').pop();
            s.textContent = modified;
            document.head.appendChild(s);
        }).catch(function (e) {
            try { console.warn('[SIM:NO-REDUCE-MOTION] fetch failed for ' + href + ':', e && e.message); } catch (_) {}
        });
    }

    function stripAndImportant() {
        var links = document.querySelectorAll('link[rel="stylesheet"]');
        var promises = [];
        for (var i = 0; i < links.length; i++) promises.push(processLinkTag(links[i]));
        return Promise.all(promises).then(reEmitImportant);
    }

    /* === 5) Re-emit visible animation rules with !important ============= */
    function reEmitImportant() {
        try {
            /* Limpa override anterior (re-runs em transições). */
            var prev = document.getElementById('__sim_anim_important_override');
            if (prev) prev.remove();

            var rulesOut = [];
            var seen = {};
            function collect(rules, mediaWrapper) {
                if (!rules) return;
                for (var i = 0; i < rules.length; i++) {
                    var r = rules[i];
                    if (r.cssRules && !r.selectorText) {
                        var nm = (r.media && r.media.mediaText) ? r.media.mediaText : mediaWrapper;
                        collect(r.cssRules, nm);
                        continue;
                    }
                    if (!r.selectorText || !r.style) continue;
                    var sel = r.selectorText;
                    if (sel === '*' || /^\*\s*[,]/.test(sel) || /[,]\s*\*\s*$/.test(sel)) continue;
                    var av = r.style.getPropertyValue('animation');
                    if (!av) continue;
                    if (r.style.getPropertyPriority('animation') === 'important') continue;
                    /* Reduced-motion media wrappers: alguns desativam intencionalmente.
                       Skip pra não ressuscitar o que o autor quis silenciar. */
                    if (mediaWrapper && mediaWrapper.indexOf('reduced-motion') >= 0
                        && av.trim().toLowerCase().indexOf('none') === 0) continue;
                    var key = sel + '|' + av;
                    if (seen[key]) continue;
                    seen[key] = true;
                    rulesOut.push(sel + ' { animation: ' + av + ' !important; }');
                }
            }
            for (var si = 0; si < document.styleSheets.length; si++) {
                try {
                    var sheet = document.styleSheets[si];
                    if (sheet.disabled) continue;
                    if (sheet.ownerNode && sheet.ownerNode.id === '__sim_anim_important_override') continue;
                    collect(sheet.cssRules, null);
                } catch (_) { /* CORS, skip */ }
            }
            var s = document.createElement('style');
            s.id = '__sim_anim_important_override';
            s.textContent = '/* X-6.5.51AG: ' + rulesOut.length + ' animation rules re-emitted with !important. */\n' + rulesOut.join('\n');
            document.head.appendChild(s);
            try { console.info('[SIM:FULL-MOTION] Re-emitted ' + rulesOut.length + ' animation rules with !important.'); } catch (_) {}
        } catch (e) {
            try { console.warn('[SIM:FULL-MOTION] reEmitImportant failed:', e && e.message); } catch (_) {}
        }
    }

    /* Run NOW + once after DOMContentLoaded to catch <link>s added by document.write
       depois deste script. Re-roda em hash-change pra cobrir SPA navigation. */
    function run() { stripAndImportant(); }
    run();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { run(); }, { once: true });
    } else {
        /* Já carregou — roda mais 1x num tick pra pegar links late-inserted. */
        setTimeout(run, 100);
    }
    /* Run again on window load (last chance for very-late <link> tags). */
    if (document.readyState !== 'complete') {
        window.addEventListener('load', function () { run(); }, { once: true });
    }
})();
