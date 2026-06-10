/* shared/coin-utils.js — fonte ÚNICA do ícone da moeda Valdorita (A1.9, #90).
 *
 * ROLE: o markup do v-coin (`<span class="vi vi-coin...">`) e o conversor
 * texto→ícone (_coinify) viviam presos no IIFE de encounter-popup.js
 * (inacessíveis a outros webapps) + o helper DOM coin() duplicado em
 * game-city-shared.js. Aqui é o canônico; encounter-popup/game-city-shared
 * delegam. Regra IMMUTABLE (sessão #72): custo em moeda nas ESCOLHAS DE AÇÃO
 * usa o ÍCONE (nunca "Valdoritas" por extenso); só fala/narração de NPC pode
 * usar o texto por extenso.
 *
 * window.vCoin:
 *   html(size?)   string '<span class="vi vi-coin [size]" aria-label="Valdoritas"></span>'
 *                 size: ''|'sm'|'lg' (default 'sm' — inline em labels)
 *   coinify(s)    converte "<n> Valdoritas/Valdorita/V" no ícone (size sm)
 *   el(size?)     elemento DOM <span class="vi vi-coin [size]">
 *
 * ES5 only (Android WebView 2GB). Idempotente (guard window.vCoin).
 */
(function (global) {
  'use strict';
  if (global.vCoin) return;

  function html(size) {
    var cls = 'vi vi-coin' + (size === undefined ? ' sm' : (size ? ' ' + size : ''));
    return '<span class="' + cls + '" aria-label="Valdoritas"></span>';
  }

  var _ICON = html('sm');
  function coinify(s) {
    return String(s == null ? '' : s)
      .replace(/(\d+)\s*[Vv]aldoritas?\b/g, '$1 ' + _ICON)
      .replace(/(\d+)\s*V\b(?![a-zA-Z])/g, '$1 ' + _ICON);
  }

  function el(size) {
    var c = (typeof document !== 'undefined') ? document.createElement('span') : null;
    if (c) c.className = 'vi vi-coin' + (size ? ' ' + size : '');
    return c;
  }

  global.vCoin = { html: html, coinify: coinify, el: el };
})(typeof window !== 'undefined' ? window : this);
