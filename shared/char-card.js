/* ============================================================================
 * char-card.js — window.vCharCard.build(member) -> card DOM estilo COMBATE.
 * ============================================================================
 * sessão #90 (user 2026-06-15): padronização — o Grupo da exploração (e futuramente
 * cidade/Hall) usam o MESMO card visual do combate. Réplica fiel; combate intocado.
 * Estilo em shared/char-card.css. Usa HeraldicIcons p/ o crest (se carregado) e
 * vBarHpTier (status-bars.js) p/ o threshold de cor do PV (fallback 60/25 embutido).
 *
 * member = {
 *   name, cls, clsKey, level, letter?,        // identidade
 *   hp, hpMax,                                 // PV
 *   res: { label, kind, value, max },          // recurso (kind: mp|furia|vigor|energia|ki|foco|inspiration|pact)
 *   ac?,                                        // CA (opcional)
 *   isSelf?                                     // destaque dourado
 * }
 * ========================================================================== */
(function (global) {
  'use strict';

  function _hpTier(pct) { return pct > 60 ? 'high' : (pct >= 25 ? 'mid' : 'low'); }

  function _el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }

  // label + valor com a barra ATRÁS (igual .c-stat do combate). --bar-pct dirige a largura.
  function _statBar(modCls, labelTxt, valTxt, pct, fillCls, valExtraCls) {
    var stat = _el('div', 'vcc-stat' + (modCls ? ' ' + modCls : ''));
    stat.style.setProperty('--bar-pct', Math.max(0, Math.min(100, pct || 0)) + '%');
    var bar = _el('div', 'vcc-bar');
    bar.appendChild(_el('span', 'vcc-bar-fill ' + fillCls));
    stat.appendChild(bar);
    stat.appendChild(_el('span', 'vcc-stat-label', labelTxt));
    stat.appendChild(_el('span', 'vcc-stat-val' + (valExtraCls ? ' ' + valExtraCls : ''), valTxt));
    return stat;
  }

  function _appendHeraldic(port, clsKey, letter) {
    // MESMO crest do combate: <svg><use href="#ic-classe"> — o icons-resolver
    // (window.vIcons) troca por WebP (cobre as 12 classes, com ou sem <symbol>
    // inline). Só emite o <use> se for resolvível (vIcons mapeia a classe OU há
    // <symbol id="ic-classe">), senão cai na LETRA — nunca caixa vazia.
    // DOM-safe (fragment, sem innerHTML).
    var key = clsKey ? String(clsKey).toLowerCase() : '';
    var iconId = key ? ('ic-' + key) : '';
    var resolvable = !!iconId && (
      (global.vIcons && typeof global.vIcons.has === 'function' && global.vIcons.has(key)) ||
      (typeof document.getElementById === 'function' && !!document.getElementById(iconId))
    );
    if (resolvable) {
      try {
        var frag = document.createRange().createContextualFragment(
          '<svg viewBox="0 0 120 120" aria-hidden="true"><use href="#' + iconId + '"/></svg>');
        port.appendChild(frag);
        return;
      } catch (e) { /* fallback letra */ }
    }
    port.textContent = letter || '?';
  }

  function build(m) {
    m = m || {};
    var card = _el('div', 'vcc-card' + (m.isSelf ? ' is-self' : ''));

    card.appendChild(_el('div', 'vcc-name', m.name || '—'));
    var tag = (m.cls || '—');
    if (m.level != null) tag += '  ·  Nv ' + m.level;
    card.appendChild(_el('div', 'vcc-class-tag', tag));

    var port = _el('div', 'vcc-portrait');
    _appendHeraldic(port, m.clsKey, m.letter);
    card.appendChild(port);

    var stats = _el('div', 'vcc-stats');
    var hp = (m.hp != null) ? m.hp : 0;
    var mhp = m.hpMax || m.mhp || (hp > 0 ? hp : 1);
    var hpPct = mhp > 0 ? Math.round(hp / mhp * 100) : 0;
    var thr = (typeof global.vBarHpTier === 'function') ? global.vBarHpTier(hpPct) : _hpTier(hpPct);
    stats.appendChild(_statBar('vcc-stat--hp', 'PV', hp + '/' + mhp, hpPct,
      'vcc-bar--hp-' + thr, thr === 'low' ? 'vcc-stat-val--hp-low' : ''));

    if (m.res && m.res.max > 0) {
      var rPct = Math.round((m.res.value || 0) / m.res.max * 100);
      stats.appendChild(_statBar('vcc-stat--res', m.res.label || 'REC',
        (m.res.value || 0) + '/' + m.res.max, rPct, 'vcc-bar--' + (m.res.kind || 'mp'), ''));
    }

    if (m.ac != null) {
      var acStat = _el('div', 'vcc-stat vcc-stat--ac');
      acStat.appendChild(_el('span', 'vcc-stat-label', 'CA'));
      acStat.appendChild(_el('span', 'vcc-stat-val', String(m.ac)));
      stats.appendChild(acStat);
    }

    card.appendChild(stats);
    return card;
  }

  global.vCharCard = { build: build };
})(typeof window !== 'undefined' ? window : this);
