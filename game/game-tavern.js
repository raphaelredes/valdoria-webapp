/* ============================================================================
 * game-tavern.js — Taverna do Javali Negro (FULL PADRAO_TAVERNA canonical)
 * ============================================================================
 *
 * Task #27 sessão #14 (2026-05-20) — REFATORADO p/ usar PADRAO_TAVERNA canonical:
 * classes .cenario, .row-npc, .rep-bar, .services, .svc (sem mais tav-* custom).
 *
 * User mandato: "todas as telas da cidade DEVEM ficar no PADRAO_TAVERNA".
 * CSS canonical em shared/padrao-taverna.css.
 *
 * MAPA_IA:
 *   ~30   _SVC_CONFIG_TAVERN (faction tavern + reactions canonical)
 *   ~55   GROM_DIALOGUE (greeting principal — Grom Barba-Cinza)
 *   ~80   SERVICE_DIALOGUES_TAVERN (5 dialogues PADRAO_ALDRIC inline)
 *   ~240  TAVERN_CB_TO_DIALOGUE (backend cb → dialogue key map)
 *   ~270  TAVERN_SVC_META (svc icon path + meta text canonical)
 *   ~310  _tavBuildCenario(data) — hero canonical PADRAO_TAVERNA
 *   ~360  _tavBuildNpcRow(data) — .row-npc canonical PADRAO_TAVERNA
 *   ~410  _tavBuildRepBar(data) — D&D 5e Renown DMG p.22
 *   ~440  _tavBuildServices(services) — .services + .svc canonical
 *   ~500  renderTavernHub(container, data) — entry point
 *
 * Doc canonical:
 *   memory/feedback_centralize_in_canonical_webapps.md (porting pattern)
 *   simuladores/taverna-javali-final.html (mockup source — 1729 linhas)
 *   shared/padrao-taverna.css (CSS canonical compartilhado)
 *   src/game/city/tavern.py:130-179 (backend data shape)
 * ============================================================================ */

'use strict';

(function() {

/* === Per-renderer SVC config — passa pra svc-interactions._dispatchSvcChoice. */
if (!window._SVC_CONFIG_TAVERN) {
  window._SVC_CONFIG_TAVERN = {
    faction: 'tavern',
    factionLabel: 'Taverna do Javali Negro',
    reactions: {
      very_negative: 'Grom para a mão no meio do gesto. <i>(fecha o livro de tarja com som seco)</i> "Não és bem-vindo na minha casa. Sai antes que eu chame o segurança."',
      negative: 'Grom suspira longo, balança a cabeça. <i>(passa o pano pelo balcão num gesto cansado)</i> "Cada um com seus modos. Mas aqui tem regras."',
      neutral: 'Grom continua enxugando a caneca. <i>(mantém o olhar no balcão)</i> "Tudo bem."',
      positive: 'Grom sorri de canto. <i>(serve teu copo com mais cuidado que o normal)</i> "Tens cabeça boa pra um aventureiro. Aqui sempre cabe um bom amigo."',
      very_positive: 'Grom dá uma palmada em teu ombro. <i>(ri alto)</i> "Por essas e outras, és da família. Próxima rodada por conta da casa, peixinho!"'
    },
    confirmMsgs: {
      narration: 'Grom anota o pedido no livro de tarja. <i>(passa o lápis carvão atrás da orelha)</i>',
      generic: '"Anotado. Bom proveito." <i>(volta a enxugar a caneca de prata)</i>'
    }
  };
}

/* === GROM_DIALOGUE (greeting principal — opens on NPC row click) ====== */
var GROM_DIALOGUE = {
  npc: {
    name: 'Grom Barba-Cinza',
    desc: 'Taverneiro · trinta e seis anos no balcão d\'O Javali Negro',
    portrait: '../shared/img/npcs/taverneiro.png'
  },
  script: [
    { type: 'narration', text: 'O carvalho polido do balcão reflete as chamas dos candelabros pendurados. Atrás dele, Grom — corpulento, barba ruiva trançada com um anel de prata, avental de couro marcado pelo brasão da cervejaria — ergue os olhos do livro de tarja e sorri largo ao reconhecer você.' },
    { type: 'speech', speaker: 'Grom Barba-Cinza', text: 'Ah! <i>(larga a caneca de prata que estava enxugando)</i> Pensei que tinha sido pego pelos lobos a essa hora. Senta antes que eu mude de ideia.' },
    { type: 'narration', text: 'Ele aponta um banco de couro escuro a seu lado, depois gira pra estante atrás dele. Vinte barris de carvalho repousam empilhados até o teto, marcados a fogo com símbolos de cervejarias do norte ao sul.' },
    { type: 'speech', speaker: 'Grom Barba-Cinza', text: 'Diz o que veio buscar. <i>(cruza os braços)</i> Boato, bebida, ou briga? Aqui tem das três — só uma é grátis.' }
  ],
  choices: [
    { id: 'drinks',  label: '🍺 "Uma cerveja, por favor."', cb: 'drinks' },
    { id: 'rumor',   label: '💬 "Conta um boato. Pago bem."', cb: 'rumor' },
    { id: 'carousing', label: '🍻 "Quero socializar."', cb: 'carousing' },
    { id: 'pitfight', label: '🥊 "Onde fica a rinha?"', cb: 'pitfight' },
    { id: 'leave',   label: '↩ "Volto mais tarde, Grom."', cb: 'close' }
  ]
};

/* === SERVICE_DIALOGUES_TAVERN — dialogues PADRAO_ALDRIC =============== */
var SERVICE_DIALOGUES_TAVERN = {
  drinks: {
    npc: GROM_DIALOGUE.npc,
    script: [
      { type: 'narration', text: 'Grom puxa uma caneca da prateleira e pousa-a no balcão com cuidado ritual. Quatro torneiras de bronze polido brilham atrás dele — cada uma marcada com a runa do barril correspondente.' },
      { type: 'speech', speaker: 'Grom Barba-Cinza', text: 'Cerveja comum por uma moeda, sidra de maçã por duas. Hidromel do vale custa quatro — fermentação de mel selvagem. Stout Anã, seis. <i>(sorri)</i> Essa última vai te derrubar se não souber respirar.' }
    ],
    choices: [
      { id: 'ale',   label: '🍺 Cerveja Comum · 1 V (+1 HP)', cb: 'drinks-confirm' },
      { id: 'cider', label: '🍎 Sidra de Maçã · 2 V (+2 HP)', cb: 'drinks-confirm' },
      { id: 'mead',  label: '🍯 Hidromel do Vale · 4 V (+2 MP)', cb: 'drinks-confirm' },
      { id: 'stout', label: '🍺 Stout Anã · 6 V (+3 HP/+1 MP)', cb: 'drinks-confirm' },
      { id: 'back',  label: '↩ "Outra hora."', cb: 'close' }
    ]
  },

  rumor: {
    npc: GROM_DIALOGUE.npc,
    script: [
      { type: 'speech', speaker: 'Grom Barba-Cinza', text: 'Cinco moedas, e te conto algo útil. <i>(estende a mão calejada)</i> Sobre o que quer saber?' },
      { type: 'narration', text: 'Você sente o peso da bolsa de moedas. Grom não vende rumor barato — o que ele conta vale a peça de prata.' }
    ],
    choices: [
      { id: 'goblin', label: '👹 Sobre Goblins · 5 V (+2 dano vs)', cb: 'rumor-confirm' },
      { id: 'wolf',   label: '🐺 Sobre Lobos · 5 V', cb: 'rumor-confirm' },
      { id: 'troll',  label: '👹 Sobre Trolls · 5 V', cb: 'rumor-confirm' },
      { id: 'random', label: '🎲 Boato genérico · 5 V', cb: 'rumor-confirm' },
      { id: 'back',   label: '↩ "Outra hora."', cb: 'close' }
    ]
  },

  carousing: {
    npc: GROM_DIALOGUE.npc,
    script: [
      { type: 'narration', text: 'Grom esfrega o queixo, pensativo. Ele conhece três tipos de festa: a dos trabalhadores honestos, a da classe média comerciante, e a dos nobres que fingem não te ver até pagarem por ti.' },
      { type: 'speech', speaker: 'Grom Barba-Cinza', text: 'Carousing, hein? <i>(ri baixo)</i> Sim, posso te apresentar. Noite na taverna humilde, dez moedas. Festa burguesa, cinquenta. Banquete nobre… duzentos e cinquenta, e ainda precisa fingir que sabe etiqueta.' },
      { type: 'speech', speaker: 'Grom Barba-Cinza', text: 'Sucesso depende de CARISMA. <i>(aponta o livro)</i> A regra é antiga — Xanathar página 128.' }
    ],
    choices: [
      { id: 'lower',  label: '🍺 Farra Humilde · 10 V · DC 10', cb: 'carousing-confirm' },
      { id: 'middle', label: '🍷 Festa Refinada · 50 V · DC 15', cb: 'carousing-confirm' },
      { id: 'upper',  label: '👑 Banquete Nobre · 250 V · DC 20', cb: 'carousing-confirm' },
      { id: 'back',   label: '↩ "Vou pensar."', cb: 'close' }
    ]
  },

  pitfight: {
    npc: GROM_DIALOGUE.npc,
    script: [
      { type: 'narration', text: 'Grom inclina a cabeça pra direita, indicando a porta de carvalho ferrada que dá pro porão. De lá vem o som abafado de gritos e o cheiro de suor velho.' },
      { type: 'speech', speaker: 'Grom Barba-Cinza', text: 'Pit fighting? <i>(sorri torto)</i> Entrada vinte e cinco moedas. Aposta sua escolha. Três rounds — Força, Destreza, Constituição. Você ganha dois dos três, leva o prêmio. Perde mais que dois, sai pelos próprios pés.' }
    ],
    choices: [
      { id: 'bet10',  label: '👊 Apostar 10 V', cb: 'pitfight-confirm' },
      { id: 'bet25',  label: '👊 Apostar 25 V', cb: 'pitfight-confirm' },
      { id: 'bet50',  label: '👊 Apostar 50 V', cb: 'pitfight-confirm' },
      { id: 'bet100', label: '👊 Apostar 100 V (alto risco)', cb: 'pitfight-confirm' },
      { id: 'back',   label: '↩ "Vou pensar."', cb: 'close' }
    ]
  },

  gossip: {
    npc: GROM_DIALOGUE.npc,
    script: [
      { type: 'narration', text: 'Grom dá uma olhada discreta pro casal nobre nas mesas do canto. Eles fingem não notar — mas é ensaiado demais pra ser natural.' },
      { type: 'speech', speaker: 'Grom Barba-Cinza', text: 'Aqueles? <i>(volta-se pra você, baixo)</i> Vem aqui três vezes por semana. Dizem que são mercadores de tecidos, mas paga em moedas de prata pura — e mercador raramente carrega prata pura. <i>(estala os dedos)</i> Aqui se aprende rápido que nem tudo é o que parece.' }
    ],
    choices: [
      { id: 'ask',  label: '🔍 "O que você sabe sobre eles?"', cb: 'gather_info' },
      { id: 'leave','label': '↩ "Deixa pra lá."', cb: 'close' }
    ]
  }
};

/* === Backend cb → dialogue key map ====================================
 * Backend envia cb = "tavern_drink_menu", "tavern_rumor" etc. (tavern.py:153-165) */
var TAVERN_CB_TO_DIALOGUE = {
  'tavern_drink_menu':       'drinks',
  'tavern_rumor':            'rumor',
  'tavern_carousing_menu':   'carousing',
  'tavern_pitfight_menu':    'pitfight',
  'tavern_gather_menu':      'gossip'
  // Outros services (mercenaries, adventurers, games, board, bard) ainda usam
  // fallback vCity.act (backend handler tradicional). Migração incremental.
};

/* === Service icon meta ================================================== */
var TAVERN_SVC_META = {
  'tavern_drink_menu':         { icon: '../shared/img/services/svc-bebidas.png',      meta: '+1-3 HP/MP' },
  'tavern_rumor':              { icon: '../shared/img/services/svc-rumores.png',      meta: '5 V · info útil' },
  'tavern_mercenaries_menu':   { icon: '../shared/img/services/svc-mercenarios.png',  meta: 'XGtE p.130' },
  'tavern_adventurers_menu':   { icon: '../shared/img/services/svc-exploradores.png', meta: 'XGtE p.131' },
  'tavern_games_menu':         { icon: '../shared/img/services/svc-dados.png',        meta: 'XGtE p.128' },
  'tavern_carousing_menu':     { icon: '../shared/img/services/svc-socializar.png',   meta: 'XGtE p.128' },
  'tavern_gather_menu':        { icon: '../shared/img/services/svc-informacoes.png',  meta: 'DC 10/15/20' },
  'tavern_pitfight_menu':      { icon: '../shared/img/services/svc-rinha.png',        meta: 'apostas' },
  'tavern_board_menu':         { icon: '../shared/img/services/svc-mural.png',        meta: 'jobs locais' },
  'tavern_bard_listen':        { icon: '../shared/img/services/svc-bardo.png',        meta: 'inspiration 1d6' }
};

/* === Hero CENARIO canonical ============================================== */
function _tavBuildCenario(data) {
  var hero = vCity.el('div', 'cenario');

  // Banner background — fallback CSS-only if PNG missing
  var bg = vCity.el('img', 'cenario-bg');
  bg.src = '../shared/img/taverna/taverna-banner.png';
  bg.alt = '';
  bg.loading = 'lazy';
  bg.onerror = function(){ this.style.display = 'none'; };
  hero.appendChild(bg);

  hero.appendChild(vCity.el('div', 'candle-glow l'));
  hero.appendChild(vCity.el('div', 'candle-glow r'));

  // Brasão
  var crest = vCity.el('img', 'cenario-brasao');
  crest.src = '../shared/img/taverna/taverna-crest.png';
  crest.alt = 'Brasão do Javali Negro';
  crest.loading = 'lazy';
  crest.onerror = function(){ this.style.display = 'none'; };
  hero.appendChild(crest);

  // Título
  var titulo = vCity.el('div', 'cenario-titulo');
  var nameEl = vCity.el('div', 'name');
  nameEl.textContent = 'Taverna do Javali Negro';
  titulo.appendChild(nameEl);
  var subEl = vCity.el('div', 'sub');
  subEl.textContent = 'Estabelecimento de Grom Barba-Cinza · Bairro do Mercado';
  titulo.appendChild(subEl);
  hero.appendChild(titulo);

  return hero;
}

/* === NPC row canonical — Grom main entry =================================== */
function _tavBuildNpcRow(data) {
  var row = vCity.el('div', 'row-npc');

  // Portrait
  var portraitWrap = vCity.el('div', 'npc-portrait');
  var img = vCity.el('img');
  img.src = '../shared/img/npcs/taverneiro.png';
  img.alt = 'Grom Barba-Cinza';
  img.loading = 'lazy';
  img.onerror = function(){ this.style.display = 'none'; };
  portraitWrap.appendChild(img);
  row.appendChild(portraitWrap);

  // Info
  var info = vCity.el('div', 'npc-info');
  var name = vCity.el('div', 'name');
  name.textContent = 'Grom Barba-Cinza';
  info.appendChild(name);
  var quote = vCity.el('div', 'quote');
  quote.textContent = '"Senta antes que eu mude de ideia."';
  info.appendChild(quote);
  row.appendChild(info);

  // Chevron
  var chev = vCity.el('div', 'npc-chev');
  chev.textContent = '›';
  row.appendChild(chev);

  // Click → GROM_DIALOGUE
  row.addEventListener('click', function(){
    if (typeof window.vEncounter === 'object' && window.vEncounter.render) {
      window._SVC_CONFIG = window._SVC_CONFIG_TAVERN;
      window.vEncounter.render(GROM_DIALOGUE, { dialogues: SERVICE_DIALOGUES_TAVERN });
    }
  });

  return row;
}

/* === Reputation bar canonical (.rep-bar) ================================== */
function _tavBuildRepBar(data) {
  var renown = 0;
  if (data && data.renown && typeof data.renown.tavern === 'number') renown = data.renown.tavern;
  else if (window._PLAYER_RENOWN && typeof window._PLAYER_RENOWN.tavern === 'number') renown = window._PLAYER_RENOWN.tavern;

  var tier = 'NEUTRO';
  if (renown >= 25) tier = 'AMIGÁVEL';
  else if (renown >= 10) tier = 'CORDIAL';
  else if (renown < 0 && renown >= -10) tier = 'FRIO';
  else if (renown < -10) tier = 'HOSTIL';

  var pct = Math.max(0, Math.min(100, Math.round((renown + 10) / 40 * 100)));

  var bar = vCity.el('div', 'rep-bar');
  var lbl = vCity.el('span', 'label');
  lbl.textContent = 'Reputação';
  bar.appendChild(lbl);
  var track = vCity.el('div', 'bar');
  var fill = vCity.el('div', 'fill');
  fill.style.width = pct + '%';
  track.appendChild(fill);
  bar.appendChild(track);
  var val = vCity.el('span', 'value');
  val.textContent = tier + ' · ' + renown;
  bar.appendChild(val);
  return bar;
}

/* === Services canonical (.services + .svc PADRAO_TAVERNA) ================ */
function _tavBuildServices(services) {
  var grid = vCity.el('div', 'services');
  (services || []).forEach(function(svc) {
    var card = vCity.el('div', 'svc');
    if (svc.disabled) card.classList.add('disabled');
    card.setAttribute('data-svc', svc.cb || '');

    var meta = TAVERN_SVC_META[svc.cb] || {};

    if (svc.badge) {
      var badge = vCity.el('div', 'svc-badge');
      badge.textContent = svc.badge;
      card.appendChild(badge);
    }

    // Icon
    var ico = vCity.el('div', 'svc-ico');
    if (meta.icon) {
      var img = vCity.el('img');
      img.src = meta.icon;
      img.alt = '';
      img.loading = 'lazy';
      img.onerror = function(){ this.style.display = 'none'; };
      ico.appendChild(img);
    }
    card.appendChild(ico);

    // Text block
    var txt = vCity.el('div', 'svc-text');
    var name = vCity.el('div', 'svc-name');
    name.textContent = svc.label || '';
    txt.appendChild(name);
    var metaTxt = vCity.el('div', 'svc-meta');
    var costText = svc.cost !== undefined ? (svc.cost === 0 ? 'Grátis' : String(svc.cost) + ' V') : '';
    metaTxt.textContent = (meta.meta && costText) ? (costText + ' · ' + meta.meta) : (meta.meta || costText);
    txt.appendChild(metaTxt);
    card.appendChild(txt);

    // Click → dialogue ou fallback vCity.act
    if (svc.cb && !svc.disabled) {
      card.addEventListener('click', function(){
        var dialogueKey = TAVERN_CB_TO_DIALOGUE[svc.cb];
        var dialogue = dialogueKey ? SERVICE_DIALOGUES_TAVERN[dialogueKey] : null;
        if (dialogue && typeof window.vEncounter === 'object' && window.vEncounter.render) {
          window._SVC_CONFIG = window._SVC_CONFIG_TAVERN;
          window.vEncounter.render(dialogue, { dialogues: SERVICE_DIALOGUES_TAVERN });
        } else if (typeof vCity.act === 'function') {
          vCity.act(svc.cb);
        } else if (typeof window.handleAction === 'function') {
          window.handleAction(svc.cb);
        }
      });
    }

    grid.appendChild(card);
  });
  return grid;
}

/* === renderTavernHub entry point ========================================== */
function renderTavernHub(container, data) {
  if (!container || !data) return;
  console.warn('[CITY-TAVERN] renderTavernHub services=' + (data.services ? data.services.length : 0) + ' npcs=' + (data.npcs ? data.npcs.length : 0));
  while (container.firstChild) container.removeChild(container.firstChild);

  var root = vCity.el('div', 'tav-hub');

  /* 1. Hero CENARIO (PADRAO_TAVERNA) */
  root.appendChild(_tavBuildCenario(data));

  /* 2. Body container */
  var body = vCity.el('div', 'tav-body');
  body.style.cssText = 'padding:8px 12px 0;display:flex;flex-direction:column;gap:7px;';

  /* 2a. NPC row (Grom main entry) */
  body.appendChild(_tavBuildNpcRow(data));

  /* 2b. Reputation bar */
  body.appendChild(_tavBuildRepBar(data));

  /* 2c. Flavor text (atmosfera) */
  if (data.flavor) {
    var flavor = vCity.el('div', 'tav-flavor');
    flavor.style.cssText = 'font-style:italic;font-size:12px;color:#a09484;padding:6px 10px;border-left:2px solid rgba(196,149,58,0.3);background:rgba(0,0,0,0.18);border-radius:4px';
    flavor.textContent = vCity.stripTags(data.flavor);
    body.appendChild(flavor);
  }

  /* 2d. Section label */
  var sectionLbl = vCity.el('div', 'pt-section-label');
  sectionLbl.textContent = '⚜ No balcão e na sala ⚜';
  body.appendChild(sectionLbl);

  /* 2e. Services grid (PADRAO_TAVERNA canonical) */
  if (data.services && data.services.length) {
    body.appendChild(_tavBuildServices(data.services));
  }

  /* 2f. Wandering NPCs (extra cards — wandering adventurers, etc.) */
  if (data.npcs && data.npcs.length) {
    var npcLbl = vCity.el('div', 'pt-section-label');
    npcLbl.textContent = '🚶 Presentes nesta hora';
    body.appendChild(npcLbl);
    body.appendChild(vCity.actionList(data.npcs));
  }

  root.appendChild(body);
  container.appendChild(root);
}

/* expose */
window.renderTavernHub = renderTavernHub;

})();
