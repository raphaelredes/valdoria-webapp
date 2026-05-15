/* game-tavern.js — Tavern AAA hub renderer
 *
 * X-6.5.51BH (2026-05-15): redesign AAA do hub da Taverna.
 *  - Header cerimonial com placa pendurada + lanterna piscando
 *  - Scene atmosférica (lareira + embers + smoke layers)
 *  - Quote/flavor em pergaminho pequeno
 *  - NPC cards com portrait + greeting preview (PADRAO_ALDRIC-friendly)
 *  - Services em grid de prateleira de balcão (wooden shelf)
 *
 * API: renderTavernHub(container, data)
 *   data: { flavor, npcs:[{icon,label,cb,badge?}], services:[{icon,label,cb,badge?}] }
 *
 * Dependências:
 *   vCity (game-city-shared.js): el, sectionLabel, act
 *   - act(label, cb) dispara o callback (mesmo handler dos botoes legados)
 *
 * Compatível com simuladores/cidade.html (usado via _renderCityPopup).
 */
'use strict';

(function () {
  function _el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  // canonical: dispatch click no mesmo broker do hub (vCity.act fallback)
  function _fire(cb) {
    if (typeof window.handleAction === 'function') { window.handleAction(cb); return; }
    if (window.vCity && typeof window.vCity.act === 'function') { window.vCity.act(cb); return; }
    // Cidade simulator fallback
    if (window.ACTION_HANDLERS && typeof window.ACTION_HANDLERS[cb] === 'function') {
      window.ACTION_HANDLERS[cb](window.CITY_MOCK_PLAYER || {});
      return;
    }
    console.warn('[CITY-TAVERN] no broker for cb=' + cb);
  }

  function renderTavernHub(container, data) {
    if (!container || !data) return;
    while (container.firstChild) container.removeChild(container.firstChild);

    var root = _el('div', 'tav-hub-aaa');

    // === 1) HERO: tavern sign + atmosphere ===
    var hero = _el('div', 'tav-hero');
    hero.innerHTML =
      '<div class="tav-hero-bg"></div>'
      // lanternas penduradas nas pontas
      + '<div class="tav-lantern tav-lantern-l">'
      +   '<svg viewBox="0 0 24 36" aria-hidden="true">'
      +     '<line x1="12" y1="0" x2="12" y2="8" stroke="#3a2818" stroke-width="1"/>'
      +     '<rect x="4" y="8" width="16" height="22" rx="2" fill="#3a2818" stroke="#1a0e06" stroke-width="0.6"/>'
      +     '<rect x="6" y="12" width="12" height="14" fill="url(#tav-lantern-grad)" opacity="0.95"/>'
      +     '<defs><radialGradient id="tav-lantern-grad" cx="50%" cy="50%" r="60%">'
      +       '<stop offset="0%" stop-color="#fff4c0"/><stop offset="60%" stop-color="#ffb060"/><stop offset="100%" stop-color="#8a4a18"/>'
      +     '</radialGradient></defs>'
      +   '</svg>'
      + '</div>'
      + '<div class="tav-lantern tav-lantern-r">'
      +   '<svg viewBox="0 0 24 36" aria-hidden="true">'
      +     '<line x1="12" y1="0" x2="12" y2="8" stroke="#3a2818" stroke-width="1"/>'
      +     '<rect x="4" y="8" width="16" height="22" rx="2" fill="#3a2818" stroke="#1a0e06" stroke-width="0.6"/>'
      +     '<rect x="6" y="12" width="12" height="14" fill="url(#tav-lantern-grad)" opacity="0.95"/>'
      +   '</svg>'
      + '</div>'
      // Placa central
      + '<div class="tav-sign">'
      +   '<div class="tav-sign-chain"></div>'
      +   '<div class="tav-sign-plate">'
      +     '<svg class="tav-sign-icon" viewBox="0 0 120 120" aria-hidden="true"><use href="#ic-cerveja"/></svg>'
      +     '<div class="tav-sign-text">TAVERNA</div>'
      +     '<div class="tav-sign-sub">◆ do Javali ◆</div>'
      +   '</div>'
      + '</div>'
      // embers + smoke
      + '<span class="tav-ember tav-ember-1"></span>'
      + '<span class="tav-ember tav-ember-2"></span>'
      + '<span class="tav-ember tav-ember-3"></span>'
      + '<div class="tav-smoke"></div>';
    root.appendChild(hero);

    // === 2) FLAVOR (mood quote, parchment look) ===
    if (data.flavor) {
      var fl = _el('div', 'tav-flavor');
      fl.innerHTML =
        '<span class="tav-flavor-mark">❝</span>'
        + '<span class="tav-flavor-text">' + data.flavor + '</span>'  /* noqa: innerHTML — server-controlled */
        + '<span class="tav-flavor-mark tav-flavor-mark-end">❞</span>';
      root.appendChild(fl);
    }

    // === 3) NPCs como portrait cards ===
    if (data.npcs && data.npcs.length) {
      var npcSec = _el('div', 'tav-section');
      npcSec.appendChild(_el('div', 'tav-section-title', '<span class="tav-section-mark">◈</span> Presentes nesta hora'));

      var npcGrid = _el('div', 'tav-npc-grid');
      data.npcs.forEach(function (n, idx) {
        var card = _el('button', 'tav-npc-card');
        card.type = 'button';
        // 2026-05-15: auto-split "Nome — Papel" para evitar truncamento.
        // _buildTavernMockData passa label = `${name} — ${role}` (incluindo
        // <svg> no role). Antes: tudo numa única linha com ellipsis cortando
        // "Grom Barba-Cinza — Tave..." Agora: nome em destaque + papel abaixo.
        var fullLabel = n.label || 'Aventureiro';
        var npcName = fullLabel;
        var npcRole = n.subtitle || '';
        if (!n.subtitle) {
          var splitIdx = fullLabel.indexOf(' — ');
          if (splitIdx > 0) {
            npcName = fullLabel.slice(0, splitIdx);
            npcRole = fullLabel.slice(splitIdx + 3);
          }
        }
        card.setAttribute('aria-label', fullLabel.replace(/<[^>]+>/g, ''));
        card.innerHTML =
          '<div class="tav-npc-portrait">'
          +   (n.icon || '<svg viewBox="0 0 120 120"><use href="#ic-aldeao"/></svg>')
          + '</div>'
          + '<div class="tav-npc-info">'
          +   '<div class="tav-npc-name">' + npcName + '</div>'
          + (npcRole ? '<div class="tav-npc-sub">' + npcRole + '</div>' : '')
          + (n.badge ? '<div class="tav-npc-badge">' + n.badge + '</div>' : '')
          + '</div>'
          + '<div class="tav-npc-chevron">›</div>';
        card.style.animationDelay = (idx * 60) + 'ms';
        card.addEventListener('click', function () { _fire(n.cb); });
        npcGrid.appendChild(card);
      });
      npcSec.appendChild(npcGrid);
      root.appendChild(npcSec);
    }

    // === 4) SERVIÇOS (shelf grid) ===
    if (data.services && data.services.length) {
      var svcSec = _el('div', 'tav-section');
      svcSec.appendChild(_el('div', 'tav-section-title', '<span class="tav-section-mark">◈</span> No balcão e na sala'));

      var svcGrid = _el('div', 'tav-svc-grid');
      data.services.forEach(function (s, idx) {
        var card = _el('button', 'tav-svc-card');
        card.type = 'button';
        card.setAttribute('aria-label', (s.label || '').replace(/<[^>]+>/g, ''));
        card.innerHTML =
          '<div class="tav-svc-icon">' + (s.icon || '') + '</div>'
          + '<div class="tav-svc-label">' + (s.label || '') + '</div>'
          + (s.badge ? '<div class="tav-svc-badge">' + s.badge + '</div>' : '')
          + '<div class="tav-svc-glow"></div>';
        card.style.animationDelay = (200 + idx * 40) + 'ms';
        card.addEventListener('click', function () { _fire(s.cb); });
        svcGrid.appendChild(card);
      });
      svcSec.appendChild(svcGrid);
      root.appendChild(svcSec);
    }

    container.appendChild(root);
  }

  /* expose */
  window.renderTavernHub = renderTavernHub;
})();
