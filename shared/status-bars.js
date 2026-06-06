/**
 * status-bars.js — FONTE UNICA dos thresholds de barra de status (HP).
 *
 * ROLE: M5 do plano single-source (docs/sistemas/single-source-consolidation-plan.md).
 * Antes o threshold de cor de HP DIVERGIA entre os pilares: cidade tinha um ponto a
 * 50% e outros a 60%; exploracao marcava 'warn' abaixo de 50%; combate usava 60%.
 * MESMO HP%, cor diferente dependendo da tela. O CLAUDE.md (Design System) exige este
 * .js — existia so o status-bars.css. Threshold CANONICO D&D-agnostico: 60 / 25.
 *
 * As classes retornadas existem no status-bars.css (e nos estilos inline dos 3 HTML):
 *   hp-high (verde, >60%) · hp-mid (laranja, 25-60%) · hp-low (vermelho pulsante, <=25%).
 *
 * API (window):
 *   vBarHpTier(pct)   -> 'high' | 'mid' | 'low'   (sem prefixo; p/ componentes com
 *                                                   prefixo proprio: 'bar-'+tier, 'fill-hp-'+tier)
 *   vBarHpClass(pct)  -> 'hp-high' | 'hp-mid' | 'hp-low'  (classe pronta do status-bars.css)
 *   vBarMpClass()     -> 'mp'   (MP e cor unica; helper p/ consistencia de API)
 *   VBAR_HP_HIGH=60, VBAR_HP_LOW=25  (as constantes do threshold, p/ quem precisar do numero)
 *
 * pct = percentual 0..100. ES5 only (Android WebView 2GB). Idempotente.
 */
(function (global) {
    'use strict';
    if (global.vBarHpClass) return;

    var HP_HIGH = 60;  // > 60% -> verde
    var HP_LOW = 25;   // <= 25% -> vermelho (critico)

    function vBarHpTier(pct) {
        pct = +pct || 0;
        return pct > HP_HIGH ? 'high' : (pct > HP_LOW ? 'mid' : 'low');
    }
    function vBarHpClass(pct) {
        return 'hp-' + vBarHpTier(pct);
    }
    function vBarMpClass() {
        return 'mp';  // MP e cor unica (sem threshold) — helper de API
    }

    global.vBarHpTier = vBarHpTier;
    global.vBarHpClass = vBarHpClass;
    global.vBarMpClass = vBarMpClass;
    global.VBAR_HP_HIGH = HP_HIGH;
    global.VBAR_HP_LOW = HP_LOW;
})(typeof window !== 'undefined' ? window : this);
