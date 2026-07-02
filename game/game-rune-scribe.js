/* ============================================================================
 * game-rune-scribe.js — Escriba Rúnico (PADRAO_TAVERNA canonical)
 * ============================================================================
 *
 * Task #36 sessão #14 (2026-05-20) — REFATORADO p/ PADRAO_TAVERNA canonical.
 * NPC: Eirik (Escriba Rúnico) — canonical _NPC_NAME (market_rune_scribe.py L24).
 *   (sessão #73: nome visível alinhado a "Eirik"; a const THESSIL_DIALOGUE e o
 *    asset mestre-thessil.webp mantêm o nome legado — só strings visíveis mudaram.)
 * Source: simuladores/escriba-runico-final.html
 * ============================================================================ */
'use strict';

/* task #75 (2026-05-20): IIFE wrap pra prevenir colisões de globais entre
   renderers (regra estabelecida após bug Garrick/Vorhan task #70). Apenas
   renderRuneScribe é exposto via window no final. */
(function() {

if (!window._SVC_CONFIG_RUNES) {
  window._SVC_CONFIG_RUNES = {
    faction: 'runes',
    factionLabel: 'Câmara do Escriba',
    reactions: {
      very_negative: 'Eirik fecha o livro de glifos com um clack ressonante. <i>(volta-se para a parede de runas)</i> "Não."',
      negative: 'Eirik suspira, decepcionado. <i>(continua escrevendo)</i> "Cada palavra tem peso. As tuas perderam o seu."',
      neutral: 'Eirik acena com leveza. <i>(volta ao manuscrito)</i> "Sigamos."',
      positive: 'Eirik sorri discretamente. <i>(traça um pequeno glifo no ar)</i> "Há sabedoria em ti que poucos cultivam."',
      very_positive: 'Eirik curva-se levemente. <i>(rara cortesia entre arcanistas)</i> "És dos poucos que entendem o peso de cada runa. A Câmara honra teu nome."'
    },
    confirmMsgs: {
      narration: 'Eirik traça o glifo no pergaminho com pena de corvo. <i>(murmura uma sílaba em língua antiga)</i>',
      generic: '"Selado em runa." <i>(toca a runa com a ponta do indicador)</i>'
    }
  };
}

var THESSIL_DIALOGUE = {
  npc: {
    name: 'Eirik',
    desc: 'Escriba Rúnico · trinta e dois anos decifrando glifos antigos',
    portrait: '../shared/img/npcs/eirik-escriba.webp'
  },
  script: [
    { type: 'narration', text: 'A câmara de Eirik é um santuário de pergaminhos e glifos. Estantes alcançam o teto, abarrotadas de manuscritos encadernados em couro escuro. Um cheiro de pena queimada, tinta de carvão e algo metálico — magia em estado bruto — paira no ar. Eirik ergue os olhos de um pergaminho aberto, traça um glifo no ar, e te reconhece.' },
    { type: 'speech', speaker: 'Eirik', text: 'A Câmara está aberta. <i>(pousa a pena de corvo no tinteiro)</i> Trazes fragmentos? Três do mesmo tier forjam uma runa aleatória. É lei antiga, não tradição minha. O que precisas?' }
  ],
  choices: [
    // task #70 (2026-05-20): cb's alinhadas com backend canonical em market_rune_scribe.py.
    // Antes: 'rune_craft'/'rune_inspect'/'rune_learn' → não dispatched (silent close).
    // Agora: 'rune_scribe_menu' (hub), 'rune_scribe_catalog' (lista runas),
    // 'rune_scribe_intro_1' (tutorial). Backend canonical handlers.
    { id: 'craft',   label: '"Quero forjar runas."', cb: 'rune_scribe_menu' },
    { id: 'catalog', label: '"Mostra o catálogo de runas."', cb: 'rune_scribe_catalog' },
    { id: 'learn',   label: '"Ensina-me sobre os glifos."', cb: 'rune_scribe_intro_1' },
    { id: 'leave',   label: '"Volto outra hora, Mestre."', cb: 'close' }
  ]
};

function _rnsEl(tag, cls, text) {
  var el = document.createElement(tag);
  if (cls) el.className = cls;
  // task #70 review (2026-05-20): suporta HTML inline (e.g. badge com vi-coin).
  if (text != null) {
    if (typeof text === 'string' && /<(span|b|i|em|strong|br)\b[^>]*>/.test(text)) {
      el.innerHTML = text;
    } else {
      el.textContent = text;
    }
  }
  return el;
}

function renderRuneScribe(container, data) {
  if (!container || !data) return;
  console.warn('[CITY-RUNE] renderRuneScribe (PADRAO_TAVERNA) type=' + data.type);
  while (container.firstChild) container.removeChild(container.firstChild);

  var root = vCity.el('div', 'rns-hub');

  /* === 1. Cenario canonical === */
  var cenarioEl = vCity.el('div', 'cenario');
  var bg = _rnsEl('img', 'cenario-bg');
  bg.src = '../shared/img/runas/runas-banner.webp';
  bg.loading = 'lazy';
  bg.onerror = function(){ this.style.display = 'none'; };
  cenarioEl.appendChild(bg);
  cenarioEl.appendChild(vCity.el('div', 'candle-glow l'));
  cenarioEl.appendChild(vCity.el('div', 'candle-glow r'));
  var crest = _rnsEl('img', 'cenario-brasao');
  crest.src = '../shared/img/runas/runas-crest.webp';
  crest.alt = 'Brasão do Escriba';
  crest.loading = 'lazy';
  crest.onerror = function(){ this.style.display = 'none'; };
  cenarioEl.appendChild(crest);
  var titulo = vCity.el('div', 'cenario-titulo');
  titulo.appendChild(_rnsEl('div', 'name', 'Escriba Rúnico'));
  titulo.appendChild(_rnsEl('div', 'sub', 'Eirik · Guardião dos Glifos'));
  cenarioEl.appendChild(titulo);
  root.appendChild(cenarioEl);

  /* === 2. Body container === */
  var body = vCity.el('div', 'rns-body');
  body.style.cssText = 'padding:8px 12px 0;display:flex;flex-direction:column;gap:7px;';

  /* === 2a. NPC row Eirik === */
  var npcRow = vCity.el('div', 'row-npc');
  var portraitWrap = vCity.el('div', 'npc-portrait');
  var img = _rnsEl('img');
  img.src = '../shared/img/npcs/eirik-escriba.webp';
  img.alt = 'Eirik';
  img.loading = 'lazy';
  img.onerror = function(){ this.style.display = 'none'; };
  portraitWrap.appendChild(img);
  npcRow.appendChild(portraitWrap);
  var info = vCity.el('div', 'npc-info');
  info.appendChild(_rnsEl('div', 'name', 'Eirik'));
  info.appendChild(_rnsEl('div', 'quote', '"Trazes fragmentos? Três do mesmo tier forjam uma runa."'));
  npcRow.appendChild(info);
  npcRow.appendChild(_rnsEl('div', 'npc-chev', '›'));
  npcRow.addEventListener('click', function(){
    // sessão #76: o retrato/nome do Eirik abre DIRETO a conversa (talkOptions
    // Q&A: Quem é você / tipos de runas / forja / fragmentos) — o MESMO diálogo
    // do antigo botão "Conversar com Eirik" (removido do menu de ações). Routing:
    // rune_npc_rune_eirik → RUNE_NPCS[0] → _showSharedNpcDialogue (cidade.html).
    window._SVC_CONFIG = window._SVC_CONFIG_RUNES;  // reações por reputação
    if (typeof vCity === 'object' && typeof vCity.act === 'function') {
      vCity.act('rune_npc_rune_eirik');
    } else if (typeof window.vEncounter === 'object' && window.vEncounter.render) {
      window.vEncounter.render(THESSIL_DIALOGUE);  // fallback legado (file:// sem dispatch)
    }
  });
  body.appendChild(npcRow);

  /* === 2b. Rep bar === */
  var renome = (data.renome && typeof data.renome.runes === 'number') ? data.renome.runes : (window._PLAYER_RENOWN && window._PLAYER_RENOWN.runes) || 0;
  var tierLbl = 'NEUTRO';
  if (renome >= 25) tierLbl = 'AMIGÁVEL';
  else if (renome >= 10) tierLbl = 'CORDIAL';
  else if (renome < 0 && renome >= -10) tierLbl = 'FRIO';
  else if (renome < -10) tierLbl = 'HOSTIL';
  var pct = Math.max(0, Math.min(100, Math.round((renome + 10) / 40 * 100)));
  var repBar = vCity.el('div', 'rep-bar');
  repBar.appendChild(_rnsEl('span', 'label', 'Reputação'));
  var track = vCity.el('div', 'bar');
  var fill = vCity.el('div', 'fill');
  fill.style.width = pct + '%';
  track.appendChild(fill);
  repBar.appendChild(track);
  repBar.appendChild(_rnsEl('span', 'value', tierLbl + ' · ' + renome));
  body.appendChild(repBar);

  /* === 2c. Recipe info === */
  var recipe = _rnsEl('div', 'rns-recipe', 'Receita: 3 fragmentos do mesmo tier = 1 runa aleatória');
  recipe.style.cssText = 'text-align:center;font-style:italic;font-size:calc(12px * var(--v-font-scale, 1));color:#a09484;padding:6px 8px;background:rgba(0,0,0,0.18);border-left:2px solid rgba(196,149,58,0.3);border-radius:4px;';
  body.appendChild(recipe);

  if (data.type === 'craft_menu') {
    /* === 2d. Section: Fragmentos === */
    var sectionLbl = vCity.el('div', 'pt-section-label');
    sectionLbl.textContent = '⚜ Fragmentos & Forja ⚜';
    body.appendChild(sectionLbl);

    /* === 2e. Tier cards === */
    if (data.tiers && data.tiers.length) {
      var grid = vCity.el('div', 'services');
      grid.style.cssText = 'grid-template-columns:1fr;'; // 1 column for tier cards (more info per row)
      for (var i = 0; i < data.tiers.length; i++) {
        var t = data.tiers[i];
        var card = vCity.el('div', 'svc');
        card.style.cssText = 'flex-direction:column;align-items:stretch;gap:6px;padding:10px;';

        var hdr = _rnsEl('div', '');
        hdr.style.cssText = 'display:flex;align-items:center;gap:8px;';
        var emoji = _rnsEl('span', '');
        emoji.innerHTML = t.frag_emoji;
        emoji.style.cssText = 'font-size:calc(18px * var(--v-font-scale, 1));';
        hdr.appendChild(emoji);
        var name = _rnsEl('span', 'svc-name', t.frag_name);
        name.style.flex = '1';
        hdr.appendChild(name);
        var badge = _rnsEl('span', 'svc-badge', 'Tier ' + t.tier);
        hdr.appendChild(badge);
        card.appendChild(hdr);

        /* Progress bar */
        var progWrap = _rnsEl('div', '');
        progWrap.style.cssText = 'display:flex;align-items:center;gap:8px;';
        var progBar = _rnsEl('div', '');
        progBar.style.cssText = 'flex:1;height:8px;background:rgba(0,0,0,0.4);border-radius:4px;overflow:hidden;border:1px solid rgba(196,149,58,0.3);';
        var progFill = _rnsEl('div', '');
        var fillPct = Math.min(100, Math.floor(t.count / t.cost * 100));
        progFill.style.cssText = 'height:100%;background:linear-gradient(90deg,#c4953a,#f4d896);width:' + fillPct + '%;transition:width 0.3s;';
        progBar.appendChild(progFill);
        progWrap.appendChild(progBar);
        var progText = _rnsEl('span', '', t.count + '/' + t.cost);
        progText.style.cssText = 'font-size:calc(11px * var(--v-font-scale, 1));color:#a09484;min-width:40px;text-align:right;';
        progWrap.appendChild(progText);
        card.appendChild(progWrap);

        /* Craft button */
        var btn = vCity.el('button', 'v-popup-btn');
        if (t.can_craft) {
          btn.textContent = 'Forjar Runa Tier ' + t.tier;
          btn.classList.add('v-popup-btn--primary');
          btn.addEventListener('click', (function(cb){ return function(){ vCity.act(cb); }; })(t.cb));
        } else if (t.locked_level) {
          btn.textContent = 'Nível ' + t.min_level + ' necessário';
          btn.disabled = true;
          btn.style.opacity = '0.5';
        } else {
          btn.textContent = 'Faltam ' + Math.max(0, t.cost - t.count) + ' fragmentos';
          btn.disabled = true;
          btn.style.opacity = '0.5';
        }
        card.appendChild(btn);

        /* sessão #76: tier_actions (Inscrever / Ver Inscritas) DENTRO do card de
           cada fragmento — movidos do rodapé global a pedido do user. Row
           secundária, visual tênue. textContent (sem innerHTML) por segurança. */
        if (t.tier_actions && t.tier_actions.length) {
          var taRow = vCity.el('div', '');
          taRow.style.cssText = 'display:flex;gap:5px;margin-top:2px;';
          for (var sa = 0; sa < t.tier_actions.length; sa++) {
            var saItem = t.tier_actions[sa];
            var saBtn = vCity.el('button', 'v-popup-btn');
            saBtn.style.cssText = 'flex:1;padding:5px 6px;font-size:calc(11px * var(--v-font-scale, 1));background:rgba(196,149,58,0.10);border:1px solid rgba(196,149,58,0.35);';
            saBtn.textContent = saItem.label;
            saBtn.addEventListener('click', (function(cb){ return function(){ vCity.act(cb); }; })(saItem.cb));
            taRow.appendChild(saBtn);
          }
          card.appendChild(taRow);
        }

        grid.appendChild(card);
      }
      body.appendChild(grid);
    }

    /* === 2f. Quick actions === */
    if (data.actions && data.actions.length) {
      var qRow = vCity.el('div', 'rns-actions-row');
      qRow.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;';
      for (var a = 0; a < data.actions.length; a++) {
        var act = data.actions[a];
        var aBtn = vCity.el('button', 'v-popup-btn');
        aBtn.style.cssText = 'flex:1;font-size:calc(11px * var(--v-font-scale, 1));padding:6px 8px;';
        aBtn.innerHTML = act.icon + ' ' + act.label;
        aBtn.addEventListener('click', (function(cb){ return function(){ vCity.act(cb); }; })(act.cb));
        qRow.appendChild(aBtn);
      }
      body.appendChild(qRow);
    }
  }

  root.appendChild(body);
  container.appendChild(root);
}

/* task #75: expose public API. Privadas: THESSIL_DIALOGUE, _rnsEl. */
window.renderRuneScribe = renderRuneScribe;

})(); /* end IIFE task #75 */
