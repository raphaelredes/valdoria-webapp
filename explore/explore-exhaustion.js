/* =================================================================
 * Exhaustion + Risk Warning + Death Save UI — Explore WebApp
 * Added 2026-04-11 — addresses user feedback:
 *   1. Add visible exhaustion indicator on the floating HUD
 *   2. Warn before moves that will kill the player
 *      (exhaustion max OR HP critical)
 *   3. Redesign Derrotado / Death Saves screen with proper medieval theming
 *
 * Public API:
 *   ValdoriaRisk.updateExhaustionFloat()  — sync pips to S.exhaustion
 *   ValdoriaRisk.checkPreMoveRisk()       — returns true if move should be blocked
 *   ValdoriaRisk.renderDeathSaves(state)  — renders death saves overlay
 *   ValdoriaRisk.showDeathFinal(summary)  — renders final death screen
 *
 * All DOM manipulation uses createElement + textContent (no innerHTML)
 * for XSS safety. Matches the project's security stance.
 * ================================================================= */

(function() {
    'use strict';

    var TAG = '[EXPLORE:RISK]';

    /* ---------- utils ---------- */
    function $(id) { return document.getElementById(id); }
    function log(msg, data) {
        try {
            if (data !== undefined) console.info(TAG + ' ' + msg, data);
            else console.info(TAG + ' ' + msg);
        } catch (e) {
            /* noop */
        }
    }
    function logWarn(msg, data) {
        try {
            if (data !== undefined) console.warn(TAG + ' ' + msg, data);
            else console.warn(TAG + ' ' + msg);
        } catch (e) {
            /* noop */
        }
    }

    /* Read exhaustion level from S (global exploration state) */
    function getExhLevel() {
        try {
            return (typeof S !== 'undefined' && S && typeof S.exhaustion === 'number') ? S.exhaustion : 0;
        } catch (e) { return 0; }
    }

    /* Read current / max HP from S.charData */
    function getHp() {
        try {
            if (typeof S === 'undefined' || !S || !S.charData) return { cur: 0, max: 0, pct: 1 };
            var cur = S.charData.hp || 0;
            var max = S.charData.mh || 1;
            return { cur: cur, max: max, pct: max > 0 ? cur / max : 1 };
        } catch (e) { return { cur: 0, max: 0, pct: 1 }; }
    }

    /* =============================================================
     * 1. Floating HUD — Exhaustion Pips Row
     * ============================================================= */

    function updateExhaustionFloat() {
        var host = $('hud-float-exhaustion');
        if (!host) return;
        var lvl = getExhLevel();
        if (lvl <= 0) {
            host.style.display = 'none';
            host.classList.remove('critical');
            return;
        }
        host.style.display = 'flex';
        /* Pips update */
        var pips = host.querySelectorAll('.hud-float-exh-pip');
        for (var i = 0; i < pips.length; i++) {
            pips[i].classList.remove('filled', 'critical');
            if (i < lvl) {
                pips[i].classList.add('filled');
                if (i >= 4) pips[i].classList.add('critical');
            }
        }
        /* Label */
        var label = $('hud-float-exh-label');
        if (label) label.textContent = lvl + '/6';
        /* Critical styling at level 5+ (move blocked) */
        if (lvl >= 5) host.classList.add('critical');
        else host.classList.remove('critical');
        log('exhaustion_float_update lvl=' + lvl + ' critical=' + (lvl >= 5));
    }

    /* Hook into addExhaustion / removeExhaustion called by explore-core */
    function installExhaustionHook() {
        /* Patch updateExhaustionHUD to also call our float updater */
        var orig = window.updateExhaustionHUD;
        if (typeof orig === 'function' && !orig._riskPatched) {
            window.updateExhaustionHUD = function() {
                try { orig.apply(this, arguments); } catch (e) { logWarn('updateExhaustionHUD base error', e); }
                updateExhaustionFloat();
            };
            window.updateExhaustionHUD._riskPatched = true;
            log('updateExhaustionHUD hook installed');
        } else if (!orig) {
            /* explore-core not ready yet — retry soon */
            setTimeout(installExhaustionHook, 200);
        }
    }

    /* =============================================================
     * 2. Pre-Move Risk Warning Popup
     * ============================================================= */

    var RISK_CONTENT = {
        exhaustion_max: {
            icon: '😩',
            title: 'Exaustão Extrema',
            lead_html: [
                'Seu personagem está ',
                ['strong', 'esgotado demais'],
                ' para dar mais um passo. Forçar o movimento agora seria fatal.',
            ],
            pips_total: 6,
            pips_filled: 5,
            pips_critical_idx: 4,
            pips_caption_text: 'Nível 5 de 6 — ',
            pips_caption_danger: 'Velocidade = 0',
            steps: [
                { icon: '🌙', text_html: ['Realizar um ', ['strong', 'Descanso Longo'], ' (8 h no acampamento) — reduz 1 nível de exaustão por repouso'] },
                { icon: '🍖', text_html: ['Garantir ', ['strong', 'comida e água'], ' antes de descansar — sem suprimentos, o descanso falha'] },
                { icon: '🏕️', text_html: ['Tocar em ', ['strong', '🏕️ Acampar'], ' no canto inferior direito para abrir o menu de descanso'] },
            ],
            hint_html: ['Em último caso: ', ['strong', '🏕️ Retornar à cidade'], ' para descanso completo no templo ou estalagem.'],
        },
        hp_critical: {
            icon: '💔',
            title: 'HP Crítico',
            lead_html: [
                'Seu personagem está com ',
                ['strong', 'HP crítico'],
                '. Um único dano de tropeço, armadilha ou emboscada pode ser fatal.',
            ],
            pips_total: 0,
            pips_filled: 0,
            pips_critical_idx: -1,
            pips_caption_text: '',
            pips_caption_danger: '',
            steps: [
                { icon: '🧪', text_html: ['Usar uma ', ['strong', 'poção de cura'], ' da mochila (🎒 Mochila → Poções)'] },
                { icon: '🌙', text_html: ['Realizar um ', ['strong', 'Descanso Longo'], ' (8 h) — recupera HP máximo completo'] },
                { icon: '💤', text_html: ['Realizar um ', ['strong', 'Descanso Curto'], ' (1 h) — gasta Dado de Vida para recuperar parte do HP'] },
                { icon: '🏕️', text_html: ['Tocar em ', ['strong', '🏕️ Acampar'], ' no canto inferior direito'] },
            ],
            hint_html: ['Em último caso: ', ['strong', '🏕️ Retornar à cidade'], ' para cura completa no templo.'],
        },
    };

    /* Helper: build a fragment from a mixed array of strings + ['tagname', text] */
    function buildFragment(parts) {
        var frag = document.createDocumentFragment();
        for (var i = 0; i < parts.length; i++) {
            var p = parts[i];
            if (typeof p === 'string') {
                frag.appendChild(document.createTextNode(p));
            } else if (Array.isArray(p) && p.length === 2) {
                var el = document.createElement(p[0]);
                el.textContent = p[1];
                frag.appendChild(el);
            }
        }
        return frag;
    }

    /* Build the pips row for a given total/filled/critical index */
    function buildPipsRow(total, filled, criticalIdx) {
        var host = $('exh-warn-pips-row');
        if (!host) return;
        while (host.firstChild) host.removeChild(host.firstChild);
        for (var i = 0; i < total; i++) {
            var pip = document.createElement('span');
            pip.className = 'exh-warn-pip';
            if (i < filled) {
                pip.classList.add('filled');
                if (i === criticalIdx) pip.classList.add('critical');
            }
            host.appendChild(pip);
        }
    }

    /* Show the risk warning popup for mode = 'exhaustion_max' or 'hp_critical' */
    function showRiskWarning(mode) {
        var cfg = RISK_CONTENT[mode];
        if (!cfg) { logWarn('showRiskWarning unknown mode=' + mode); return; }
        var overlay = $('exh-warn-overlay');
        if (!overlay) return;
        log('showRiskWarning mode=' + mode);

        var icon = $('exh-warn-seal-icon');
        if (icon) icon.textContent = cfg.icon;

        var title = $('exh-warn-title');
        if (title) title.textContent = cfg.title;

        var lead = $('exh-warn-lead');
        if (lead) {
            while (lead.firstChild) lead.removeChild(lead.firstChild);
            lead.appendChild(buildFragment(cfg.lead_html));
        }

        buildPipsRow(cfg.pips_total, cfg.pips_filled, cfg.pips_critical_idx);
        var caption = $('exh-warn-pips-caption');
        if (caption) {
            while (caption.firstChild) caption.removeChild(caption.firstChild);
            if (cfg.pips_caption_text) {
                caption.appendChild(document.createTextNode(cfg.pips_caption_text));
                var span = document.createElement('span');
                span.className = 'exh-warn-danger';
                span.textContent = cfg.pips_caption_danger;
                caption.appendChild(span);
                caption.style.display = '';
            } else {
                caption.style.display = 'none';
            }
        }

        var stepsEl = $('exh-warn-steps');
        if (stepsEl) {
            while (stepsEl.firstChild) stepsEl.removeChild(stepsEl.firstChild);
            for (var i = 0; i < cfg.steps.length; i++) {
                var step = cfg.steps[i];
                var li = document.createElement('li');
                var iconSpan = document.createElement('span');
                iconSpan.className = 'exh-warn-step-icon';
                iconSpan.textContent = step.icon;
                li.appendChild(iconSpan);
                var textSpan = document.createElement('span');
                textSpan.appendChild(buildFragment(step.text_html));
                li.appendChild(textSpan);
                stepsEl.appendChild(li);
            }
        }

        var hint = $('exh-warn-hint');
        if (hint) {
            while (hint.firstChild) hint.removeChild(hint.firstChild);
            hint.appendChild(buildFragment(cfg.hint_html));
        }

        /* Wire buttons (re-wire each time to capture new mode) */
        var campBtn = $('exh-warn-camp-btn');
        var closeBtn = $('exh-warn-close-btn');
        if (campBtn) {
            campBtn.onclick = function() {
                hideRiskWarning();
                try {
                    if (typeof showCampOverlay === 'function') showCampOverlay();
                } catch (e) { logWarn('showCampOverlay error', e); }
            };
        }
        if (closeBtn) {
            closeBtn.onclick = hideRiskWarning;
        }

        overlay.classList.add('active');
        if (window.vHaptic && typeof vHaptic.notify === 'function') {
            try { vHaptic.notify('warning'); } catch (e) { /* noop */ }
        }
    }

    function hideRiskWarning() {
        var overlay = $('exh-warn-overlay');
        if (overlay) overlay.classList.remove('active');
    }

    /* Called by the movement handler (installed via hook) BEFORE moving.
     * Returns true if the move should be BLOCKED (warning shown). */
    function checkPreMoveRisk() {
        var lvl = getExhLevel();
        if (lvl >= 5) {
            showRiskWarning('exhaustion_max');
            return true;
        }
        var hp = getHp();
        /* HP critical = <= 25% AND max > 0 */
        if (hp.max > 0 && hp.pct <= 0.25) {
            /* One-shot: only show once per critical HP session — use sessionStorage */
            var key = 'valdoria_explore_hp_critical_warned';
            var warned = false;
            try { warned = sessionStorage.getItem(key) === '1'; } catch (e) { /* noop */ }
            if (!warned) {
                showRiskWarning('hp_critical');
                try { sessionStorage.setItem(key, '1'); } catch (e) { /* noop */ }
                return true;
            }
        } else {
            /* HP recovered — clear the one-shot flag */
            try { sessionStorage.removeItem('valdoria_explore_hp_critical_warned'); } catch (e) { /* noop */ }
        }
        return false;
    }

    /* Hook movePlayerCanvas to check risk BEFORE moving */
    function installMoveHook() {
        var orig = window.movePlayerCanvas;
        if (typeof orig === 'function' && !orig._riskPatched) {
            window.movePlayerCanvas = function(col, row) {
                /* Only block the FIRST risky move — after user dismisses the warning,
                 * subsequent moves proceed (they've been informed). */
                if (checkPreMoveRisk()) {
                    logWarn('move_blocked_risk col=' + col + ' row=' + row);
                    return;
                }
                return orig.apply(this, arguments);
            };
            window.movePlayerCanvas._riskPatched = true;
            log('movePlayerCanvas hook installed');
        } else if (!orig) {
            setTimeout(installMoveHook, 200);
        }
    }

    /* =============================================================
     * 3. Redesigned Death Saves / Derrotado screen
     * ============================================================= */

    function renderDeathSaves(opts) {
        /* opts: { successes, failures, rollNum, roll, narration, final, outcome, summaryHtml } */
        var successPips = document.querySelectorAll('#death-saves-success-pips .death-pip');
        var failurePips = document.querySelectorAll('#death-saves-failure-pips .death-pip');
        for (var i = 0; i < 3; i++) {
            if (successPips[i]) {
                successPips[i].classList.toggle('filled', i < (opts.successes || 0));
            }
            if (failurePips[i]) {
                failurePips[i].classList.toggle('filled', i < (opts.failures || 0));
            }
        }

        var narr = $('death-narration');
        if (narr) narr.textContent = opts.narration || '';

        var dice = $('death-dice-area');
        if (dice) {
            while (dice.firstChild) dice.removeChild(dice.firstChild);
            if (typeof opts.roll === 'number') {
                var chip = document.createElement('div');
                chip.className = 'dice-result';
                if (opts.roll === 20) chip.classList.add('crit');
                else if (opts.roll === 1) chip.classList.add('fumble');
                else if (opts.roll >= 10) chip.classList.add('success');
                else chip.classList.add('failure');
                chip.textContent = String(opts.roll);
                dice.appendChild(chip);
            }
        }

        var outcomeEl = $('death-outcome');
        if (outcomeEl) {
            outcomeEl.textContent = '';
            outcomeEl.classList.remove('stabilized', 'deceased');
            if (opts.outcome === 'stabilized') {
                outcomeEl.textContent = 'Estabilizado — você acorda com 1 HP';
                outcomeEl.classList.add('stabilized');
            } else if (opts.outcome === 'deceased') {
                outcomeEl.textContent = 'Você sucumbe aos ferimentos';
                outcomeEl.classList.add('deceased');
            }
        }

        var phase = $('death-phase');
        if (phase) {
            if (opts.final) phase.textContent = opts.outcome === 'stabilized' ? 'Estabilizado' : 'Jornada Encerrada';
            else phase.textContent = 'Salvaguardas contra a Morte';
        }

        var skipBtn = $('death-skip-btn');
        if (skipBtn && opts.final) {
            skipBtn.classList.add('visible');
        }
    }

    function showDeathFinal(summary) {
        /* summary: { xpEarned, goldEarned, hpReduced, extraLines } */
        var sumEl = $('death-summary');
        if (sumEl) {
            while (sumEl.firstChild) sumEl.removeChild(sumEl.firstChild);
            var lines = [];
            if (summary && summary.xpEarned > 0) lines.push('+' + summary.xpEarned + ' XP ganho');
            if (summary && summary.goldEarned > 0) lines.push('+' + summary.goldEarned + ' Valdoritas');
            for (var i = 0; i < lines.length; i++) {
                var div = document.createElement('div');
                div.className = 'reward-line';
                div.textContent = lines[i];
                sumEl.appendChild(div);
            }
            if (summary && summary.extraLines && summary.extraLines.length) {
                for (var j = 0; j < summary.extraLines.length; j++) {
                    var d2 = document.createElement('div');
                    d2.textContent = summary.extraLines[j];
                    sumEl.appendChild(d2);
                }
            }
        }
        var skipBtn = $('death-skip-btn');
        if (skipBtn) {
            skipBtn.classList.add('visible');
            skipBtn.textContent = 'Retornar à Cidade';
        }
    }

    /* Export as ValdoriaRisk global so explore-events-rest.js can use the new renderer */
    window.ValdoriaRisk = {
        updateExhaustionFloat: updateExhaustionFloat,
        checkPreMoveRisk: checkPreMoveRisk,
        showRiskWarning: showRiskWarning,
        hideRiskWarning: hideRiskWarning,
        renderDeathSaves: renderDeathSaves,
        showDeathFinal: showDeathFinal,
    };

    /* Boot */
    function boot() {
        installExhaustionHook();
        installMoveHook();
        /* Initial sync once S is available */
        setTimeout(updateExhaustionFloat, 400);
        setTimeout(updateExhaustionFloat, 1500);
        log('ValdoriaRisk boot complete');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
