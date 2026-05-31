/* ============================================================================
 * game-inn.js — Estalagem do Grifo Dourado (PADRAO_TAVERNA canonical)
 * ============================================================================
 *
 * Task #37 sessão #14 (2026-05-20) — NOVO arquivo (extraído de _renderInnHubAAA
 * inline em cidade/index.html linha 13929). Implementação canonical seguindo
 * pattern Banco POC com .cenario, .row-npc, .rep-bar, .services, .svc.
 *
 * NPC: Martha (estalajadeira, 28 anos atrás do balcão).
 * Source: simuladores/estalagem-grifo-final.html
 *
 * Dispatch: cidade/index.html linha 40080 (key === 'inn').
 * ============================================================================ */
'use strict';

/* task #75 (2026-05-20): IIFE wrap pra prevenir colisões de globais entre
   renderers (regra estabelecida após bug Garrick/Vorhan task #70). Apenas
   renderInnHub é exposto via window. */
(function() {

/* 2026-05-20 — INN_SVC_META map svc.cb -> PNG path canonical.
   Keys são os cb REAIS do backend (verificados via Chrome MCP DOM inspect):
   nav:inn_rest, nav:inn_meals, inn_short_rest, inn_relaxation, inn_allies,
   inn_cellar_quest. Sem class v-asset-png para evitar items-resolver auto-swap
   que substituía PNG da estalagem por PNGs genéricos (sono/mochila/grupo). */
var INN_SVC_META = {
  // === Menu principal Estalagem (cb reais backend) ===
  'nav:inn_rest':           { icon: '<img src="../shared/img/services/svc-dormir-comum.png" alt="">' },
  'nav:inn_meals':          { icon: '<img src="../shared/img/services/svc-comer.png" alt="">' },
  'inn_short_rest':         { icon: '<img src="../shared/img/services/svc-descanso-curto.png" alt="">' },
  'inn_relaxation':         { icon: '<img src="../shared/img/services/svc-relaxar.png" alt="">' },
  'inn_allies':             { icon: '<img src="../shared/img/services/svc-aliados.png" alt="">' },
  'inn_cellar_quest':       { icon: '<img src="../shared/img/services/svc-investigar-adega.png" alt="">' },
  /* legacy/sub-menu cb names (caso backend mude) */
  'inn_room_menu':          { icon: '<img src="../shared/img/services/svc-dormir-comum.png" alt="">' },
  'inn_meal_menu':          { icon: '<img src="../shared/img/services/svc-comer.png" alt="">' },
  'inn_relaxation_menu':    { icon: '<img src="../shared/img/services/svc-relaxar.png" alt="">' },
  'inn_allies_menu':        { icon: '<img src="../shared/img/services/svc-aliados.png" alt="">' },
  'inn_cellar_menu':        { icon: '<img src="../shared/img/services/svc-investigar-adega.png" alt="">' },
  'inn_investigate_cellar': { icon: '<img src="../shared/img/services/svc-investigar-adega.png" alt="">' },
  // === Tipos de quarto (sub-menu Quartos/Descanso) ===
  'inn_room_stable':        { icon: '<img src="../shared/img/services/svc-estabulo.png" alt="">' },
  'inn_room_common':        { icon: '<img src="../shared/img/services/svc-dormir-comum.png" alt="">' },
  'inn_room_modest':        { icon: '<img src="../shared/img/services/svc-dormir-confortavel.png" alt="">' },
  'inn_room_wealthy':       { icon: '<img src="../shared/img/services/svc-dormir-confortavel.png" alt="">' },
  'inn_room_royal':         { icon: '<img src="../shared/img/services/svc-dormir-real.png" alt="">' },
  'inn_sleep_common':       { icon: '<img src="../shared/img/services/svc-dormir-comum.png" alt="">' },
  'inn_sleep_private':      { icon: '<img src="../shared/img/services/svc-dormir-confortavel.png" alt="">' },
  'inn_sleep_royal':        { icon: '<img src="../shared/img/services/svc-dormir-real.png" alt="">' }
};


if (!window._SVC_CONFIG_INN) {
  window._SVC_CONFIG_INN = {
    faction: 'inn',
    factionLabel: 'Estalagem Grifo Dourado',
    reactions: {
      very_negative: 'Martha vira o rosto. <i>(passa o pano pelo balcão com força)</i> "Procura outro lugar pra dormir."',
      negative: 'Martha suspira, paciente. <i>(continua enxugando os copos)</i> "Quem busca cama precisa de paz."',
      neutral: 'Martha acena com um aceno breve. <i>(volta às tarefas)</i> "Anotado."',
      positive: 'Martha sorri com gentileza. <i>(prepara uma caneca de chá quente)</i> "Boa alma. A Estalagem reserva o melhor pra ti."',
      very_positive: 'Martha dá um abraço discreto. <i>(rara mostra de afeto)</i> "És da família. Quarto real por conta da casa esta noite."'
    },
    confirmMsgs: {
      narration: 'Martha anota teu nome no livro de hóspedes. <i>(passa a pena no tinteiro)</i>',
      generic: '"Quarto preparado. Que tenhas sonhos tranquilos."'
    }
  };
}

var MARTHA_DIALOGUE = {
  npc: {
    name: 'Martha',
    desc: 'Estalajadeira · vinte e oito anos atrás do balcão do Grifo Dourado',
    portrait: '../shared/img/npcs/estalajadeira.webp'
  },
  script: [
    { type: 'narration', text: 'A Estalagem do Grifo Dourado respira em calma. Lareira de pedra crepita ao fundo, lançando luz alaranjada sobre tapetes vermelhos. Martha está atrás do balcão de carvalho — vestido de linho azul-marinho, avental branco impecável, cabelo grisalho preso em coque. Ela ergue os olhos do livro de hóspedes e sorri maternal.' },
    { type: 'speech', speaker: 'Martha', text: 'Bem-vindo ao Grifo Dourado, aventureiro. <i>(fecha o livro de couro)</i> Aqui se descansa em paz, come-se bem, e ninguém pergunta de onde tu vens — só pra onde vais. O que te trouxe a esta hora?' }
  ],
  choices: [
    { id: 'sleep',   label: '🛏 "Preciso de um quarto."', cb: 'sleep' },
    { id: 'meal',    label: '🍲 "Uma refeição quente."', cb: 'meal' },
    { id: 'bath',    label: '🛁 "Banho quente, por favor."', cb: 'bath' },
    { id: 'rumors',  label: '💬 "Que histórias circulam por aqui?"', cb: 'rumors' },
    { id: 'leave',   label: '↩ "Volto depois, Martha."', cb: 'close' }
  ]
};

/* task #64 (2026-05-20) — SERVICE_DIALOGUES_INN com mecânicas D&D 5e:
   Descanso Longo — recupera HP, Dados de Vida, spell slots em 8h sono.
   Cada tier de quarto modifica qualidade do descanso (gold pps por turno). */
var SERVICE_DIALOGUES_INN = {
  sleep: {
    npc: MARTHA_DIALOGUE.npc,
    script: [
      { type: 'narration', text: 'Martha abre o livro de hóspedes — pergaminho amarelado encadernado em couro castanho, ferrolho de prata gasto pelos dedos. Folheia até a página em branco e pega a pena de ganso do tinteiro. As escadas de madeira range ao fundo conforme outro hóspede sobe pro quarto.' },
      { type: 'speech', speaker: 'Martha', text: 'Três quartos disponíveis hoje, aventureiro. <i>(coloca o monóculo)</i> Comum: cinco moedas a noite, dormitório compartilhado. Privado: vinte moedas, com fechadura e janela. Real: cem moedas, cama de penas e banheira própria. <b>Descanso Longo restaura HP/MP completo</b> — mas só se dormires oito horas sem interrupção.' }
    ],
    choices: [
      // task #84: resultText específico por quarto (cohesão).
      { id: 's_common', label: '🛏 Comum · 5V · Descanso Longo básico', cb: 'sleep-confirm', backend_cb: 'inn_sleep_common', renownDelta: 0,
        resultNarration: 'Martha te entrega uma chave de ferro simples. <i>(aponta a escada estreita)</i> O dormitório fica no andar de cima.',
        resultText: '"Cinco moedas, quarto comum — dois beliches, lençóis limpos. <i>(sorri honesta)</i> Não é luxo, mas é seguro." <b>Descanso Longo completo. HP/MP restaurados.</b>' },
      { id: 's_private', label: '🛏 Privado · 20V · Descanso Longo seguro', cb: 'sleep-confirm', backend_cb: 'inn_sleep_private', renownDelta: 1,
        resultNarration: 'Martha pega a chave de bronze com selo da casa. <i>(sobe a escada à frente, mostrando o caminho)</i>',
        resultText: '"Vinte moedas — quarto privado, segundo andar, janela pra Praça. Fechadura nova, instalada esse ano." <i>(entrega a chave com leve sorriso)</i> <b>Descanso Longo completo + segurança garantida. +1 Renome.</b>' },
      { id: 's_royal', label: '👑 Real · 100V · Descanso Longo + buff', cb: 'sleep-confirm', backend_cb: 'inn_sleep_royal', renownDelta: 3,
        resultNarration: 'Martha curva-se ligeiramente — gesto raro. Chama Joana pra preparar o quarto Real com banho de pétalas e lençóis de seda.',
        resultText: '"Cem moedas, o melhor da casa. <i>(serve um vinho de cortesia)</i> Cama de penas, banheira própria, lareira acesa. Vossa Senhoria desperta com vigor extra amanhã." <b>Descanso Longo + Inspiração 1d6 ao acordar. +3 Renome.</b>' },
      { id: 's_persuade', label: '💬 "Sou amigo da casa, Martha?" · Persuasão DC 14', cb: 'dice:persuasion:14:+1' },
      { id: 'back',    label: '↩ "Outra hora."', cb: 'close' }
    ]
  },

  meal: {
    npc: MARTHA_DIALOGUE.npc,
    script: [
      { type: 'narration', text: 'Vindo da cozinha aos fundos, o cheiro do ensopado de carneiro com cebola e pão fresco. Martha aponta o quadro de menu encostado na parede — três pratos do dia, escritos a giz amarelo com a caligrafia caprichada do filho mais novo.' },
      { type: 'speech', speaker: 'Martha', text: 'Cozinha simples, mas honesta. <i>(começa a esfregar a tábua de cortar)</i> Sopa do dia, três moedas. Ensopado de carneiro, oito. Banquete completo com vinho do Vale, vinte. <b>Refeição farta recupera 1 hit die imediatamente (mecânica caseira D&D 5e alimentação heroica).</b>' }
    ],
    choices: [
      // task #84: resultText específico por refeição (cohesão).
      { id: 'm_soup', label: '🍲 Sopa do Dia · 3V · +1 HP', cb: 'meal-confirm', backend_cb: 'inn_meal_soup', renownDelta: 0,
        resultNarration: 'Joana traz uma tigela de barro com a sopa fumegante — caldo claro com legumes da horta e farro.',
        resultText: '"Sopa simples, mas faz bem. <i>(coloca pão na lateral)</i> Come com calma, aventureiro." <b>+1 HP recuperado.</b>' },
      { id: 'm_stew', label: '🍖 Ensopado · 8V · +1 hit die', cb: 'meal-confirm', backend_cb: 'inn_meal_stew', renownDelta: 1,
        resultNarration: 'Joana traz uma travessa de barro grande — ensopado de carneiro com cebolas caramelizadas, pão preto fresco e uma jarra de cerveja escura.',
        resultText: '"Ensopado da nossa casa. <i>(sorri orgulhosa)</i> Carne marinada três dias em ervas. Vai te recuperar bem." <b>+1 hit die recuperado</b>' },
      { id: 'm_feast', label: '🍷 Banquete · 20V · +2 Dados de Vida + vinho', cb: 'meal-confirm', backend_cb: 'inn_meal_feast', renownDelta: 2,
        resultNarration: 'Martha em pessoa supervisiona o banquete. Joana traz três pratos: peixe assado com ervas, leitão recheado, e bolo de mel. Vinho do Vale em copo de cristal.',
        resultText: '"Vossa Senhoria honra a casa com esse pedido. <i>(serve o vinho)</i> Vai comer como nobre essa noite." <b>+2 Dados de Vida recuperados + Inspiração 1d4 do vinho do Vale. +2 Renome.</b>' },
      { id: 'm_taste', label: '👃 "Está temperado bem?" · Investigação DC 11', cb: 'dice:investigation:11:+0' },
      { id: 'back',   label: '↩ "Não, obrigado."', cb: 'close' }
    ]
  },

  bath: {
    npc: MARTHA_DIALOGUE.npc,
    script: [
      { type: 'narration', text: 'Martha aponta a porta lateral que dá pro pátio dos fundos. Vapores se erguem de uma fonte de cobre — banheira aquecida por brasas, com toalhas brancas dobradas em pilha sobre um banco de carvalho. O cheiro de sabão de lavanda e mirra é evidente.' },
      { type: 'speech', speaker: 'Martha', text: 'Banho quente em vinte minutos. <i>(pega uma toalha)</i> Cinco moedas inclui sabão de lavanda e óleo de mirra. Cuidado especial — mais cinco, com Joana esfregando as costas. <b>Banho quente concede inspiração 1d4 ao próximo teste por sentir-se renovado.</b>' }
    ],
    choices: [
      // task #84: resultText específico por banho (cohesão).
      { id: 'b_basic', label: '🛁 Banho simples · 5V · limpa exhaustion', cb: 'bath-confirm', backend_cb: 'inn_bath_basic', renownDelta: 0,
        resultNarration: 'Joana enche a banheira de cobre com água quente. Sabão de lavanda e óleo de mirra perfumam o ar.',
        resultText: '"Pronto, aventureiro. <i>(estende toalha branca)</i> Vinte minutos no calor — vai sair outra pessoa." <b>Um nível de Exaustão removido.</b>' },
      { id: 'b_lux',   label: '🛁 Banho de luxo · 10V · +Inspiração 1d4', cb: 'bath-confirm', backend_cb: 'inn_bath_luxury', renownDelta: 1,
        resultNarration: 'Joana esfrega tuas costas com escova de cerdas macias, massagem inclusa. Pétalas de rosa flutuam na água quente. Velas perfumadas ardem na borda.',
        resultText: '"Tratamento completo, Vossa Senhoria. <i>(sorri educada)</i> Pernas leves, mente limpa. Pra próximo desafio." <b>Exaustão removida + Inspiração 1d4. +1 Renome.</b>' },
      { id: 'b_insight', label: '👁 "Algo me diz pra ficar atento..." · Intuição DC 12', cb: 'dice:insight:12:+1' },
      { id: 'back',    label: '↩ "Fica pra próxima."', cb: 'close' }
    ]
  },

  rumors: {
    npc: MARTHA_DIALOGUE.npc,
    script: [
      { type: 'narration', text: 'Martha abaixa a voz, joga um olhar pra mesa do canto onde dois mercadores conversam baixo. Pega um pano e finge limpar o balcão enquanto fala — gesto ensaiado, anos de prática.' },
      { type: 'speech', speaker: 'Martha', text: 'Hospedaria ouve mais que qualquer taverna. <i>(esfrega o balcão devagar)</i> Cama recolhe sussurros. <b>Gather Information (Investigation/Persuasion)</b> — eu te conto o que ouvi essa semana, mas o que te interessa? Política do Conde? Movimento de mercadores? Ou pessoas desaparecidas?' }
    ],
    choices: [
      { id: 'r_politics', label: '👑 Política do Conde · História DC 13', cb: 'dice:history:13:+1' },
      { id: 'r_trade',    label: '💰 Movimento de mercadores · Persuasão DC 12', cb: 'dice:persuasion:12:+1' },
      { id: 'r_missing',  label: '👤 Pessoas desaparecidas · Intuição DC 14', cb: 'dice:insight:14:+0' },
      { id: 'r_pay',      label: '🪙 "Toma 5V pelo seu tempo."', cb: 'rumors-confirm', backend_cb: 'inn_rumors_pay', renownDelta: 2,
        resultNarration: 'Martha recolhe as cinco Valdoritas com o gesto comum dos donos de hospedaria. Olha em volta, baixa a voz outra vez.',
        resultText: '"Bem, ouvi essa semana três coisas que valem cinco. <i>(esfrega o balcão, sussurrando)</i> Caravana de gnomos chega quinta. Conde está doente. Garota da pousada do leste sumiu — terceira em dois meses." <b>+2 Renome da Estalagem. Conjuntos de informação registrados.</b>' },
      { id: 'back',       label: '↩ "Não preciso saber agora."', cb: 'close' }
    ]
  }
};

function _innEl(tag, cls, text) {
  var el = document.createElement(tag);
  if (cls) el.className = cls;
  // task #70 review (2026-05-20): se text contém tag HTML inline, usar innerHTML.
  // Bug reportado em Chrome MCP — badge "Relaxar" mostrava
  // `10 <span class="vi vi-coin sm"></span>` como texto literal porque backend
  // envia HTML inline (vi-coin span) mas _innEl forçava textContent.
  // Detect via regex de tag inline conhecida (span, b, i, em, strong, br).
  if (text != null) {
    if (typeof text === 'string' && /<(span|b|i|em|strong|br)\b[^>]*>/.test(text)) {
      el.innerHTML = text;
    } else {
      el.textContent = text;
    }
  }
  return el;
}

function renderInnHub(container, data) {
  if (!container || !data) return;
  console.warn('[CITY-INN] renderInnHub (PADRAO_TAVERNA) services=' + (data.services ? data.services.length : 0));
  while (container.firstChild) container.removeChild(container.firstChild);

  var root = vCity.el('div', 'inn-hub');

  /* === 1. Cenario canonical === */
  var cenarioEl = vCity.el('div', 'cenario');
  var bg = _innEl('img', 'cenario-bg');
  bg.src = '../shared/img/estalagem/estalagem-banner.webp';
  bg.loading = 'lazy';
  bg.onerror = function(){ this.style.display = 'none'; };
  cenarioEl.appendChild(bg);
  cenarioEl.appendChild(vCity.el('div', 'candle-glow l'));
  cenarioEl.appendChild(vCity.el('div', 'candle-glow r'));
  var crest = _innEl('img', 'cenario-brasao');
  crest.src = '../shared/img/estalagem/estalagem-crest.webp';
  crest.alt = 'Brasão do Grifo Dourado';
  crest.loading = 'lazy';
  crest.onerror = function(){ this.style.display = 'none'; };
  cenarioEl.appendChild(crest);
  var titulo = vCity.el('div', 'cenario-titulo');
  titulo.appendChild(_innEl('div', 'name', 'Grifo Dourado'));
  titulo.appendChild(_innEl('div', 'sub', 'Estalagem de Martha · Praça Central'));
  cenarioEl.appendChild(titulo);
  root.appendChild(cenarioEl);

  /* === 2. Body container === */
  var body = vCity.el('div', 'inn-body');
  body.style.cssText = 'padding:8px 12px 0;display:flex;flex-direction:column;gap:7px;';

  /* === 2a. NPC row Martha === */
  var npcRow = vCity.el('div', 'row-npc');
  var portraitWrap = vCity.el('div', 'npc-portrait');
  var img = _innEl('img');
  img.src = '../shared/img/npcs/estalajadeira.webp';
  img.alt = 'Martha';
  img.loading = 'lazy';
  img.onerror = function(){ this.style.display = 'none'; };
  portraitWrap.appendChild(img);
  npcRow.appendChild(portraitWrap);
  var info = vCity.el('div', 'npc-info');
  info.appendChild(_innEl('div', 'name', 'Martha'));
  info.appendChild(_innEl('div', 'quote', '"Aqui se descansa em paz."'));
  npcRow.appendChild(info);
  npcRow.appendChild(_innEl('div', 'npc-chev', '›'));
  npcRow.addEventListener('click', function(){
    if (typeof window.vEncounter === 'object' && window.vEncounter.render) {
      window._SVC_CONFIG = window._SVC_CONFIG_INN;
      // task #64 (2026-05-20): passa SERVICE_DIALOGUES_INN para chain via cb
      // ('sleep', 'meal', 'bath', 'rumors' agora abrem sub-dialogues PADRAO_ALDRIC).
      window.vEncounter.render(MARTHA_DIALOGUE, { dialogues: SERVICE_DIALOGUES_INN });
    }
  });
  body.appendChild(npcRow);

  /* === 2b. Rep bar === */
  var renome = (data.renome && typeof data.renome.inn === 'number') ? data.renome.inn : (window._PLAYER_RENOWN && window._PLAYER_RENOWN.inn) || 0;
  var tierLbl = 'NEUTRO';
  if (renome >= 25) tierLbl = 'AMIGÁVEL';
  else if (renome >= 10) tierLbl = 'CORDIAL';
  else if (renome < 0 && renome >= -10) tierLbl = 'FRIO';
  else if (renome < -10) tierLbl = 'HOSTIL';
  var pct = Math.max(0, Math.min(100, Math.round((renome + 10) / 40 * 100)));
  var repBar = vCity.el('div', 'rep-bar');
  repBar.appendChild(_innEl('span', 'label', 'Reputação'));
  var track = vCity.el('div', 'bar');
  var fill = vCity.el('div', 'fill');
  fill.style.width = pct + '%';
  track.appendChild(fill);
  repBar.appendChild(track);
  repBar.appendChild(_innEl('span', 'value', tierLbl + ' · ' + renome));
  body.appendChild(repBar);

  /* === 2c. Flavor === */
  if (data.flavor) {
    var flavor = vCity.el('div', 'inn-flavor');
    flavor.style.cssText = 'font-style:italic;font-size:calc(12px * var(--v-font-scale, 1));color:#a09484;padding:6px 10px;border-left:2px solid rgba(196,149,58,0.3);background:rgba(0,0,0,0.18);border-radius:4px;';
    flavor.innerHTML = data.flavor;
    body.appendChild(flavor);
  }

  /* === 2d. Section label === */
  var sectionLbl = vCity.el('div', 'pt-section-label');
  sectionLbl.textContent = '⚜ Serviços do Grifo ⚜';
  body.appendChild(sectionLbl);

  /* === 2e. Services grid (.services + .svc canonical) === */
  if (data.services && data.services.length) {
    var grid = vCity.el('div', 'services');
    for (var i = 0; i < data.services.length; i++) {
      var svc = data.services[i];
      var card = vCity.el('div', 'svc');
      if (svc.disabled) card.classList.add('disabled');
      card.setAttribute('data-svc', svc.cb || '');

      var ico = vCity.el('div', 'svc-ico');
      /* 2026-05-20: INN_SVC_META map cb -> PNG path (igual TAVERN_SVC_META).
         PNG canonical OpenAI quality=low gerado em scripts/_gen_inn_lyana_pngs.py.
         Fallback pro emoji em svc.icon quando META não tem entry. */
      var _innMeta = INN_SVC_META[svc.cb || ''];
      if (_innMeta && _innMeta.icon) {
        ico.innerHTML = _innMeta.icon;
        ico.style.cssText = 'width:42px;height:42px;display:flex;align-items:center;justify-content:center;';
        var _innMetaImg = ico.querySelector('img');
        if (_innMetaImg) _innMetaImg.style.cssText = 'width:38px;height:38px;object-fit:contain;';
      } else {
        ico.innerHTML = svc.icon || '🛏';
        ico.style.cssText = 'font-size:calc(20px * var(--v-font-scale, 1));';
      }
      card.appendChild(ico);

      var txt = vCity.el('div', 'svc-text');
      txt.appendChild(_innEl('div', 'svc-name', svc.label || ''));
      var metaText = svc.cost !== undefined ? (svc.cost === 0 ? 'Grátis' : String(svc.cost) + ' V') : '';
      if (svc.desc) metaText = svc.desc + (metaText ? ' · ' + metaText : '');
      txt.appendChild(_innEl('div', 'svc-meta', metaText));
      card.appendChild(txt);

      if (svc.badge) {
        var badge = _innEl('div', 'svc-badge', svc.badge);
        card.appendChild(badge);
      }

      if (svc.cb && !svc.disabled) {
        card.addEventListener('click', (function(cb){ return function(){
          if (typeof doAction === 'function') doAction(cb);
          else if (typeof vCity !== 'undefined' && typeof vCity.act === 'function') vCity.act(cb);
        }; })(svc.cb));
      }
      grid.appendChild(card);
    }
    body.appendChild(grid);
  }

  /* === 2f. Wandering NPCs === */
  if (data.wandering_npcs && data.wandering_npcs.length) {
    var wnLbl = vCity.el('div', 'pt-section-label');
    wnLbl.textContent = '🚶 Hóspedes';
    body.appendChild(wnLbl);
    body.appendChild(vCity.actionList(data.wandering_npcs));
  }

  /* === 2g. Gold balance === */
  if (data.gold !== undefined) {
    body.appendChild(vCity.goldBalance(data.gold));
  }

  root.appendChild(body);
  container.appendChild(root);
}

window.renderInnHub = renderInnHub;

})(); /* end IIFE task #75 */
