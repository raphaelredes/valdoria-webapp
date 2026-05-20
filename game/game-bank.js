/* ============================================================================
 * game-bank.js — Banco AAA renderer (FULL PADRAO_TAVERNA canonical)
 * ============================================================================
 *
 * Task #23 sessão #13 (2026-05-19) — REFATORADO p/ usar PADRAO_TAVERNA canonical:
 * classes .cenario, .row-npc, .rep-bar, .services, .svc (sem mais bnk-* custom).
 *
 * User mandato: "todas as telas da cidade DEVEM ficar no PADRAO_TAVERNA".
 * CSS canonical em shared/padrao-taverna.css (extraído do mockup banco-cofre-final.html).
 *
 * MAPA_IA:
 *   ~30    _SVC_CONFIG_BANK (faction + reactions canonical)
 *   ~55    ALDWIN_DIALOGUE (greeting principal)
 *   ~90    SERVICE_DIALOGUES_BANK (10 dialogues PADRAO_ALDRIC inline)
 *   ~260   BANK_CB_TO_DIALOGUE (backend cb → dialogue key map)
 *   ~290   BANK_SVC_META (svc icon path + meta text canonical)
 *   ~320   _bnkBuildCenario(data) — cenário canonical PADRAO_TAVERNA
 *   ~370   _bnkBuildNpcRow(data) — .row-npc canonical PADRAO_TAVERNA
 *   ~420   _bnkBuildServices(services) — .services + .svc canonical
 *   ~490   renderBankHub(container, data) — entry point
 *
 * Doc canonical:
 *   memory/feedback_centralize_in_canonical_webapps.md (porting pattern)
 *   memory/reference_npc_personalities_canonical.md §2 Aldwin
 *   memory/reference_npc_living_system.md (NPC Living API)
 *   simuladores/banco-cofre-final.html (mockup source)
 *   shared/padrao-taverna.css (CSS canonical compartilhado)
 * ============================================================================ */

'use strict';

/* === Per-renderer SVC config — passa pra svc-interactions._dispatchSvcChoice. */
(function() {
  if (!window._SVC_CONFIG_BANK) {
    window._SVC_CONFIG_BANK = {
      faction: 'bank',
      factionLabel: 'Casa de Tholram',
      reactions: {
        very_negative: 'Aldwin fecha o livro-razão com som seco. Os óculos meia-lua descem pelo nariz. <i>(voz cortante)</i> "Vossa Senhoria escolheu como tratar a Casa de Tholram. Eu não esquecerei."',
        negative: 'Aldwin pausa, tamborila os dedos sobre o balcão. <i>(sorri sem calor)</i> "Cada um tem sua opinião. Mas o preço é o preço."',
        neutral: 'Aldwin mantém o olhar neutro, indecifrável. <i>(volta ao livro-razão)</i> "Anotado."',
        positive: 'Aldwin acena com aprovação contida. <i>(ajusta óculos)</i> "Cliente prudente. Aventureiros que poupam vivem mais — e clientes que respeitam, recebem reciprocidade."',
        very_positive: 'Aldwin curva-se levemente, primeira vez em meses. <i>(sorri com cortesia rara)</i> "Palavras como essas honram a Casa. Vossa Senhoria sempre será bem-vindo."'
      },
      confirmMsgs: {
        narration: 'Aldwin anota o valor no livro-razão com caligrafia impecável. <i>(passa o monóculo pelos números)</i>',
        generic: '"Registrado e selado." <i>(guarda a pena no tinteiro)</i> A Casa de Tholram honra todo selo que entra por aquela porta. Que Vossa Senhoria tenha jornada próspera.'
      }
    };
  }
})();

/* === ALDWIN_DIALOGUE (greeting principal — opens on NPC row click) ====== */
var ALDWIN_DIALOGUE = {
  npc: {
    name: 'Aldwin de Tholram',
    desc: 'Banqueiro · vinte e dois anos atrás do balcão de mármore do Cofre Real',
    portrait: '../shared/img/npcs/banqueiro.png'
  },
  script: [
    { type: 'narration', text: 'O salão principal do Banco de Eldoria respira em silêncio. Lustres de ferro forjado sustentam velas de cera virgem que pingam lentas sobre bandejas de bronze. Atrás de um balcão de mogno escuro, Aldwin — vestes de veludo azul-marinho debruadas a fio de ouro, monóculo pendurado no peito, dedos finos manchados de tinta sépia — ergue os olhos do livro de tarja com a precisão de quem soma fortunas há vinte e dois anos.' },
    { type: 'speech', speaker: 'Aldwin de Tholram', text: 'Bem-vindo. <i>(fecha o livro com um clique de fivela de prata)</i> Sente-se, por favor. O cofre está aberto até a oitava hora, e a Casa de Tholram honra todo selo que entra por aquela porta.' },
    { type: 'speech', speaker: 'Aldwin de Tholram', text: 'O Cofre Real opera pelo padrão Tholram. <i>(passa o monóculo pelos números do livro)</i> Cem peças de cobre fazem dez de prata; dez de prata, uma de ouro; cem de ouro, uma de platina. <i>(sorri com cortesia medida)</i> Os números são velhos. As pessoas, não.' },
    { type: 'speech', speaker: 'Aldwin de Tholram', text: 'O que traz Vossa Senhoria à Casa de Tholram? <i>(entrelaça os dedos sobre o balcão)</i> Depósito, retirada, ou negócio de maior peso? Tudo passa por aqui — só uma coisa nunca sai: a discrição.' }
  ],
  choices: [
    { id: 'deposit', label: '🪙 "Quero depositar Valdoritas."', cb: 'deposit' },
    { id: 'withdraw', label: '🪙 "Preciso retirar do meu cofre."', cb: 'withdraw' },
    { id: 'loan',   label: '📜 "Vim falar sobre um empréstimo."', cb: 'loan' },
    { id: 'leave',  label: '↩ "Volto outra hora, Mestre Aldwin."', cb: 'close' }
  ]
};

/* === SERVICE_DIALOGUES_BANK — 10 svc dialogues PADRAO_ALDRIC ============ */
var SERVICE_DIALOGUES_BANK = {
  deposit: {
    npc: ALDWIN_DIALOGUE.npc,
    script: [
      { type: 'narration', text: 'Aldwin abre uma gaveta interna do balcão e retira uma caixa de bronze polido, forrada de veludo púrpura. Pousa-a entre vocês com cuidado litúrgico — é nela que as moedas serão pesadas antes de ir ao cofre.' },
      { type: 'speech', speaker: 'Aldwin de Tholram', text: 'Depósito é direito de cidadão, não favor. <i>(prepara a balança de prato)</i> A Casa cobra meio por cento sobre cada cem Valdoritas — taxa que mantém o cofre selado, os guardas pagos, e o ferro das portas afiado. Quanto Vossa Senhoria deseja confiar a nós hoje?' }
    ],
    choices: [
      { id: 'd_50',   label: '🪙 Depositar 50 V · taxa 0V',  cb: 'deposit-confirm', renownDelta: +1 },
      { id: 'd_100',  label: '🪙 Depositar 100 V · taxa 1V', cb: 'deposit-confirm', renownDelta: +1 },
      { id: 'd_500',  label: '💰 Depositar 500 V · taxa 3V', cb: 'deposit-confirm', renownDelta: +2 },
      { id: 'd_1000', label: '💰 Depositar 1000 V · taxa 5V', cb: 'deposit-confirm', renownDelta: +3 },
      { id: 'back',   label: '↩ Voltar', cb: 'close' }
    ]
  },
  withdraw: {
    npc: ALDWIN_DIALOGUE.npc,
    script: [
      { type: 'speech', speaker: 'Aldwin de Tholram', text: 'Retirada exige selo e contra-selo. <i>(estende a mão, palma pra cima)</i> O selo Vossa Senhoria possui — o anel da Casa, marcado quando da abertura da conta. O contra-selo está aqui, na minha gaveta.' },
      { type: 'speech', speaker: 'Aldwin de Tholram', text: 'Dois por cento de taxa em retiradas — política da Casa, não decisão minha. <i>(coloca o carimbo sobre o lacre)</i> Quanto Vossa Senhoria precisa hoje? O cofre não fecha até a oitava hora.' }
    ],
    choices: [
      { id: 'w_50',   label: '🪙 Retirar 50 V · taxa 1V',   cb: 'withdraw-confirm', renownDelta: 0 },
      { id: 'w_100',  label: '🪙 Retirar 100 V · taxa 2V',  cb: 'withdraw-confirm', renownDelta: 0 },
      { id: 'w_500',  label: '💰 Retirar 500 V · taxa 10V', cb: 'withdraw-confirm', renownDelta: 0 },
      { id: 'w_max',  label: '💰 Retirar saldo total · taxa 2%', cb: 'withdraw-confirm', renownDelta: 0 },
      { id: 'back',   label: '↩ Voltar', cb: 'close' }
    ]
  },
  loan: {
    npc: ALDWIN_DIALOGUE.npc,
    script: [
      { type: 'narration', text: 'Aldwin para, monóculo já na mão. Pousa-o lentamente sobre o livro de tarja, abre uma gaveta inferior do balcão, retira três contratos lacrados em pergaminho amarelado. Aldwin tem o olhar de quem já viu cada tipo de aventureiro entrar pela porta jurando que pagaria.' },
      { type: 'speech', speaker: 'Aldwin de Tholram', text: 'Empréstimo é coisa séria, Vossa Senhoria. <i>(separa os três contratos sobre o mármore)</i> A Casa cobra dez por cento ao mês sobre o principal — juros simples, não compostos. Atraso paga vinte por cento de multa, e a terceira falta significa que o brasão da Casa vai à sua porta com dois guardas e um oficial do Conde.' }
    ],
    choices: [
      { id: 'l_100',  label: '📜 Pedir 100 V · 30 dias · juros 10V',   cb: 'loan-confirm', renownDelta: 0 },
      { id: 'l_500',  label: '📜 Pedir 500 V · 30 dias · juros 50V',   cb: 'loan-confirm', renownDelta: 0 },
      { id: 'l_1000', label: '📜 Pedir 1000 V · 60 dias · juros 200V', cb: 'loan-confirm', renownDelta: 0 },
      { id: 'back',   label: '↩ Voltar', cb: 'close' }
    ]
  },
  store_item: {
    npc: ALDWIN_DIALOGUE.npc,
    script: [
      { type: 'narration', text: 'Aldwin levanta-se com gesto lento e caminha até uma das três portas de aço polido atrás do balcão. Cada porta tem fechadura de seis cilindros e fenda pra carta selada. Ele gira uma chave de bronze pesado e a porta abre com ranger lento — dentro, um cofre vazio aguardando.' },
      { type: 'speech', speaker: 'Aldwin de Tholram', text: 'Guardar item é diferente de guardar ouro. <i>(ajusta o monóculo)</i> Item ocupa espaço — cinco Valdoritas por semana, independente do valor. <i>(tamborila dedos)</i> O cofre é selado com o anel da Casa. Apenas Vossa Senhoria, portando o selo correspondente, pode abri-lo.' }
    ],
    choices: [
      { id: 's_short', label: '🗝️ Guardar 1 semana · 5V', cb: 'store-confirm', renownDelta: 0 },
      { id: 's_month', label: '🗝️ Guardar 1 mês · 18V (10% desconto)', cb: 'store-confirm', renownDelta: +1 },
      { id: 's_year',  label: '🗝️ Guardar 1 ano · 200V (Honored+)', cb: 'store-confirm', renownDelta: +3 },
      { id: 's_persuade', label: '🎲 "Sou cliente antigo, dispense a primeira semana" · Persuasão DC 16', cb: 'dice:persuasion:16:+2' },
      { id: 'back', label: '↩ Voltar', cb: 'close' }
    ]
  },
  retrieve_item: {
    npc: ALDWIN_DIALOGUE.npc,
    script: [
      { type: 'speech', speaker: 'Aldwin de Tholram', text: 'Retirada de item requer selo, contra-selo e identidade verificada. <i>(estende a mão calejada)</i> Vossa Senhoria possui o selo — o anel; eu tenho o contra-selo. A identidade, o tempo me ensinou a reconhecer.' },
      { type: 'speech', speaker: 'Aldwin de Tholram', text: 'A taxa de retirada é uma Valdorita por item — política da Casa, não decisão minha. <i>(sorri com cortesia medida)</i> Se há mais de um item, posso fazer combo de cinco itens por três Valdoritas.' }
    ],
    choices: [
      { id: 'r_single', label: '🗝️ Retirar 1 item · 1V', cb: 'retrieve-confirm', renownDelta: 0 },
      { id: 'r_bundle', label: '🗝️ Retirar até 5 itens · 3V', cb: 'retrieve-confirm', renownDelta: +1 },
      { id: 'r_all',    label: '🗝️ Esvaziar cofre · 2% do valor total', cb: 'retrieve-confirm', renownDelta: 0 },
      { id: 'r_insight', label: '🎲 "Você confere por dentro também?" · Insight DC 12', cb: 'dice:insight:12:+1' },
      { id: 'back', label: '↩ Voltar', cb: 'close' }
    ]
  },
  invest: {
    npc: ALDWIN_DIALOGUE.npc,
    script: [
      { type: 'narration', text: 'Aldwin abre uma gaveta lateral do balcão e retira um pequeno livro encadernado em couro verde-musgo — não é o livro-razão comum, é o registro de Investimentos da Casa de Tholram. Folheia até a página onde estão listadas as oportunidades de mês. Algumas têm marcas pequenas de cera dourada — pré-aprovadas.' },
      { type: 'speech', speaker: 'Aldwin de Tholram', text: 'Investir é confiar prudência ao tempo. <i>(ajusta óculos meia-lua)</i> A Casa oferece três modalidades: rendimento conservador (cinco por cento ao mês, sem risco), médio (dez por cento, risco moderado — caravana de comércio), e alto (vinte por cento, mas com risco real).' }
    ],
    choices: [
      { id: 'i_safe', label: '📜 Conservador · 100V × 5% mês',  cb: 'invest-confirm', renownDelta: +1 },
      { id: 'i_med',  label: '📜 Médio · 500V × 10% (caravana)', cb: 'invest-confirm', renownDelta: +2 },
      { id: 'i_high', label: '📜 Alto · 1000V × 20% (risco real)', cb: 'invest-confirm', renownDelta: +2 },
      { id: 'i_persuade', label: '🎲 "Posso ter taxa preferencial?" · Persuasão DC 16', cb: 'dice:persuasion:16:+2' },
      { id: 'about_tavira', label: '"E os bons clientes antigos? Como a Mestra Tavira?"', cb: 'about_tavira' },
      { id: 'i_rude', label: '"Cinco por cento é miséria. Você está roubando."', cb: 'opinion-rude', renownDelta: -2 },
      { id: 'back', label: '↩ Voltar', cb: 'close' }
    ]
  },
  insurance: {
    npc: ALDWIN_DIALOGUE.npc,
    script: [
      { type: 'narration', text: 'Aldwin desenrola um pergaminho oficial selado com a marca do Conde de Eldoria. É um Seguro de Aventureiros — documento legal que garante compensação aos herdeiros, ou ressurreição patrocinada, caso o portador morra em missão.' },
      { type: 'speech', speaker: 'Aldwin de Tholram', text: 'O Seguro de Aventureiros não é luxo — é sabedoria. <i>(toca o lacre real)</i> Cinquenta Valdoritas mensais. Em caso de morte verificada, a Casa contrata Revivify no Templo (até 300V em diamante), e o que sobra é entregue ao herdeiro nomeado. Carta selada pelo próprio Conde.' }
    ],
    choices: [
      { id: 'in_buy', label: '✉ Adquirir Seguro · 50V/mês · 3 meses min.', cb: 'insurance-confirm', renownDelta: +3 },
      { id: 'in_test', label: '🎲 "Confio em você, não em papéis" · Engano DC 15', cb: 'dice:deception:15:+0' },
      { id: 'in_insight', label: '🎲 "Já houve fraude com este Seguro?" · Insight DC 14', cb: 'dice:insight:14:+2' },
      { id: 'in_rude', label: '"Vocês banqueiros só vendem medo."', cb: 'opinion-rude', renownDelta: -3 },
      { id: 'back', label: '↩ Voltar', cb: 'close' }
    ]
  },
  estate: {
    npc: ALDWIN_DIALOGUE.npc,
    script: [
      { type: 'narration', text: 'Aldwin pousa o livro de tarja, abre uma gaveta lateral, retira um mapa enrolado com fita carmesim. Desenrola-o sobre o balcão de mármore — Eldoria e seus arredores, marcados em tinta sépia, com pequenos selos vermelhos indicando propriedades disponíveis.' },
      { type: 'speech', speaker: 'Aldwin de Tholram', text: 'Comprar terreno é investir em pedra que dura mais que a memória. <i>(aponta quatro regiões marcadas)</i> Casa modesta na cidade baixa, mil Valdoritas. Quinta nas margens, cinco mil. Torre fortificada, quinze mil — leva cem dias. Stronghold completo no Quarteirão dos Cravos, cinquenta mil, quatrocentos dias.' }
    ],
    choices: [
      { id: 'e_house',  label: '🏠 Casa (Hovel) · 1000V (DMG p.157)', cb: 'estate-confirm', renownDelta: +2 },
      { id: 'e_farm',   label: '🌾 Quinta (Cottage) · 5000V', cb: 'estate-confirm', renownDelta: +3 },
      { id: 'e_tower',  label: '🗼 Torre · 15000V · 100 dias', cb: 'estate-confirm', renownDelta: +3 },
      { id: 'e_stronghold', label: '🏰 Stronghold · 50000V · 400 dias · DC 20 Persuasão', cb: 'dice:persuasion:20:+3' },
      { id: 'back',     label: '↩ Voltar', cb: 'close' }
    ]
  },
  /* Cascade demo NPC Living System — Aldwin reminisces about Tavira */
  about_tavira: {
    npcId: 'aldwin',
    npc: ALDWIN_DIALOGUE.npc,
    script: [
      { type: 'narration', text: 'Aldwin pausa, ajusta os óculos meia-lua com gesto vagaroso e olha para um ponto no balcão de carvalho — não para você, mas para uma marca de pena antiga incrustada na madeira, como se rememorasse a assinatura de outra época.' },
      { type: 'speech', speaker: 'Aldwin de Tholram', text: 'Tavira veio aqui antes da Guilda dos Aventureiros ter aquele nome. <i>(toque suave de melancolia)</i> Uma aventureira de couro queimado, olhar de aço, cicatriz vertical no olho direito que ainda não tinha. Bom cliente. Pagava todas as dívidas no prazo.' },
      { type: 'speech', speaker: 'Aldwin de Tholram', text: 'Hoje ela é Mestra da Guilda. Se a procurar, mencione que <i>velhos clientes guardam memórias</i>. <i>(volta o monóculo ao bolso)</i> Ela vai entender.' }
    ],
    choices: [
      { id: 'thank',  label: '"Obrigado. Vou procurá-la."',                  cb: 'cascade:tavira:gossip_aldwin_aventureira', renownDelta: +1 },
      { id: 'corvus', label: '"E o livreiro Corvus? Ouvi que ele te deve."', cb: 'about_corvus' },
      { id: 'leave',  label: '↩ Voltar',                                     cb: 'close' }
    ]
  },
  about_corvus: {
    npcId: 'aldwin',
    npc: ALDWIN_DIALOGUE.npc,
    script: [
      { type: 'narration', text: 'Aldwin guarda o livro-razão devagar. O ranger das fivelas de prata soa mais firme que de costume. Há uma sombra fina cruzando seu rosto — algo entre desgosto e contenção profissional.' },
      { type: 'speech', speaker: 'Aldwin de Tholram', text: 'Corvus é educado. Livros raros levam tempo para vender — eu entendo. <i>(ajusta colete)</i> Mas a Casa de Tholram não opera por simpatia. Ele deve, e os números não esquecem o que a paciência tenta apagar.' },
      { type: 'speech', speaker: 'Aldwin de Tholram', text: 'Se o vir no Mercado, não mencione nosso assunto. <i>(meia pausa)</i> A discrição, Vossa Senhoria, é metade do crédito.' }
    ],
    choices: [
      { id: 'discrete', label: '"Serei discreto."',          cb: 'cascade:corvus:gossip_aldwin_loan', renownDelta: +1 },
      { id: 'press',    label: '"Por que não pressionas?"',  cb: 'opinion-rude',                      renownDelta: -1 },
      { id: 'leave',    label: '↩ Voltar',                   cb: 'close' }
    ]
  }
};

/* === Backend cb → dialogue key ============================================ */
var BANK_CB_TO_DIALOGUE = {
  'bank_deposit_menu':       'deposit',
  'bank_withdraw_menu':      'withdraw',
  'bank_deposit_item_menu':  'store_item',
  'bank_withdraw_item_menu': 'retrieve_item',
  'bank_insurance_menu':     'insurance',
  'bank_invest_menu':        'invest',
  'bank_loans_menu':         'loan',
  'bank_property_menu':      'estate'
};

/* === Svc icon + meta canonical (PADRAO_TAVERNA — mockup banco-cofre-final) === */
var BANK_SVC_META = {
  'bank_deposit_menu':       { icon: '../shared/img/services/svc-depositar.png',  meta: 'Cofre Real' },
  'bank_withdraw_menu':      { icon: '../shared/img/services/svc-retirar.png',    meta: '2% taxa' },
  'bank_deposit_item_menu':  { icon: '../shared/img/services/svc-guardar.png',    meta: '5V/semana' },
  'bank_withdraw_item_menu': { icon: '../shared/img/services/svc-recuperar.png',  meta: 'Chave + selo' },
  'bank_insurance_menu':     { icon: '../shared/img/services/svc-seguro.png',     meta: 'Carta selada' },
  'bank_invest_menu':        { icon: '../shared/img/services/svc-investir.png',   meta: 'Juros mensais', badge: '5%' },
  'bank_loans_menu':         { icon: '../shared/img/services/svc-emprestimo.png', meta: '10% ao mês' },
  'bank_property_menu':      { icon: '../shared/img/services/svc-terreno.png',    meta: 'DMG p.157' }
};

/* === Cenário canonical (PADRAO_TAVERNA — usa .cenario CSS classes) ===
 * Estrutura: .cenario > .cenario-bg img + .candle-glow.l/r + .cenario-brasao img + .cenario-titulo
 * CSS canonical em shared/padrao-taverna.css. */
function _bnkBuildCenario(data) {
  var cenarioEl = vCity.el('div', 'cenario');

  // Banner background (PNG canonical do mockup — /banco/ não /bank/)
  var bg = vCity.el('img', 'cenario-bg');
  bg.src = '../shared/img/banco/banco-banner.png';
  bg.alt = '';
  bg.loading = 'lazy';
  bg.onerror = function(){ this.style.display = 'none'; };
  cenarioEl.appendChild(bg);

  // Candle glows (atmosfera)
  cenarioEl.appendChild(vCity.el('div', 'candle-glow l'));
  cenarioEl.appendChild(vCity.el('div', 'candle-glow r'));

  // Brasão (crest)
  var crest = vCity.el('img', 'cenario-brasao');
  crest.src = '../shared/img/banco/banco-crest.png';
  crest.alt = 'Brasão do Banco de Eldoria';
  crest.loading = 'lazy';
  crest.onerror = function(){ this.style.display = 'none'; };
  cenarioEl.appendChild(crest);

  // Título
  var titulo = vCity.el('div', 'cenario-titulo');
  var nameEl = vCity.el('div', 'name');
  nameEl.textContent = 'Banco de Eldoria';
  titulo.appendChild(nameEl);
  var subEl = vCity.el('div', 'sub');
  subEl.textContent = 'Casa de Tholram · Cofre Real';
  titulo.appendChild(subEl);
  cenarioEl.appendChild(titulo);

  return cenarioEl;
}

/* === NPC row canonical (PADRAO_TAVERNA — .row-npc CSS) ====================
 * Estrutura: .row-npc > .npc-portrait img + .npc-info (.name, .quote) + .npc-chev
 * Click abre ALDWIN_DIALOGUE encounter PADRAO_ALDRIC. */
function _bnkBuildNpcRow(data) {
  var row = vCity.el('div', 'row-npc');

  // Portrait
  var portraitWrap = vCity.el('div', 'npc-portrait');
  var img = vCity.el('img');
  img.src = '../shared/img/npcs/banqueiro.png';
  img.alt = 'Aldwin de Tholram';
  img.loading = 'lazy';
  img.onerror = function(){ this.style.display = 'none'; };
  portraitWrap.appendChild(img);
  row.appendChild(portraitWrap);

  // Info (nome + quote)
  var info = vCity.el('div', 'npc-info');
  var name = vCity.el('div', 'name');
  name.textContent = 'Aldwin de Tholram';
  info.appendChild(name);
  var quote = vCity.el('div', 'quote');
  quote.textContent = '"Bem-vindo, cliente. O cofre real abre na quarta hora."';
  info.appendChild(quote);
  row.appendChild(info);

  // Chevron
  var chev = vCity.el('div', 'npc-chev');
  chev.textContent = '›';
  row.appendChild(chev);

  // Click → open encounter PADRAO_ALDRIC
  row.addEventListener('click', function(){
    if (typeof window.vEncounter === 'object' && window.vEncounter.render) {
      window._SVC_CONFIG = window._SVC_CONFIG_BANK;
      window.vEncounter.render(ALDWIN_DIALOGUE, { dialogues: SERVICE_DIALOGUES_BANK });
    }
  });

  return row;
}

/* === Reputation bar canonical (.rep-bar — D&D 5e Renown DMG p.22) ======== */
function _bnkBuildRepBar(data) {
  // Compute renown
  var renown = 0;
  if (data && data.renown && typeof data.renown.bank === 'number') renown = data.renown.bank;
  else if (window._PLAYER_RENOWN && typeof window._PLAYER_RENOWN.bank === 'number') renown = window._PLAYER_RENOWN.bank;

  // Tier label (DMG p.22)
  var tier = 'NEUTRO';
  if (renown >= 25) tier = 'AMIGÁVEL';
  else if (renown >= 10) tier = 'CORDIAL';
  else if (renown < 0 && renown >= -10) tier = 'FRIO';
  else if (renown < -10) tier = 'HOSTIL';

  // Bar fill % (clamp 0-100, mapping [-10, +30] → [0, 100])
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

/* === Services canonical (.services + .svc PADRAO_TAVERNA) ================
 * Click no svc abre PADRAO_ALDRIC dialogue via vEncounter.render. */
function _bnkBuildServices(services) {
  var grid = vCity.el('div', 'services');
  (services || []).forEach(function(svc) {
    var card = vCity.el('div', 'svc');
    if (svc.disabled) card.classList.add('disabled');
    card.setAttribute('data-svc', svc.cb || '');

    // Lookup meta canonical
    var meta = BANK_SVC_META[svc.cb] || {};

    // Badge (top-right)
    if (meta.badge) {
      var badge = vCity.el('div', 'svc-badge');
      badge.textContent = meta.badge;
      card.appendChild(badge);
    }

    // Icon (.svc-ico)
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

    // Text block (.svc-text > .svc-name + .svc-meta)
    var txt = vCity.el('div', 'svc-text');
    var name = vCity.el('div', 'svc-name');
    name.textContent = svc.label || '';
    txt.appendChild(name);
    var metaTxt = vCity.el('div', 'svc-meta');
    metaTxt.textContent = meta.meta || (svc.cost !== undefined ? (svc.cost === 0 ? 'Grátis' : String(svc.cost) + ' V') : '');
    txt.appendChild(metaTxt);
    card.appendChild(txt);

    // Click handler — abre PADRAO_ALDRIC dialogue ou fallback vCity.act
    if (svc.cb && !svc.disabled) {
      card.addEventListener('click', function(){
        var dialogueKey = BANK_CB_TO_DIALOGUE[svc.cb] || svc.cb;
        var dialogue = SERVICE_DIALOGUES_BANK[dialogueKey];
        if (dialogue && typeof window.vEncounter === 'object' && window.vEncounter.render) {
          window._SVC_CONFIG = window._SVC_CONFIG_BANK;
          window.vEncounter.render(dialogue, { dialogues: SERVICE_DIALOGUES_BANK });
        } else if (typeof vCity.act === 'function') {
          console.warn('[BANK] no dialogue mapped for cb=' + svc.cb + ', fallback vCity.act');
          vCity.act(svc.cb);
        }
      });
    }

    grid.appendChild(card);
  });
  return grid;
}

/* === renderBankHub — entry point canonical ===============================
 * Estrutura PADRAO_TAVERNA: .cenario + .row-npc + .rep-bar + .pt-section-label + .services */
function renderBankHub(container, data) {
  if (!container || !data) return;
  console.warn('[CITY-BANK] renderBankHub (PADRAO_TAVERNA) gold=' + (data.gold || 0)
    + ' bank=' + (data.bank_gold || 0)
    + ' services=' + (data.services ? data.services.length : 0));
  while (container.firstChild) container.removeChild(container.firstChild);

  /* NPC Living: registra visita ao Banco */
  try {
    if (typeof window._npcMarkVisit === 'function') {
      window._npcMarkVisit('aldwin', 'enter_bank');
    }
  } catch (e) { console.warn('[CITY-BANK] _npcMarkVisit fail:', e); }

  var root = vCity.el('div', 'bnk-hub');

  /* 1. Cenário canonical (PADRAO_TAVERNA) */
  root.appendChild(_bnkBuildCenario(data));

  /* 2. Body container (PADRAO_TAVERNA — padding + gap canonical) */
  var body = vCity.el('div', 'bnk-body');
  body.style.cssText = 'padding:8px 12px 0;display:flex;flex-direction:column;gap:7px;';

  /* 2a. NPC row */
  body.appendChild(_bnkBuildNpcRow(data));

  /* 2b. Rep bar (Reputação canonical) */
  body.appendChild(_bnkBuildRepBar(data));

  /* 2c. Loan overdue alert (se houver) */
  if (data.loan_overdue && data.loan_debt > 0) {
    body.appendChild(vCity.statusAlert(
      'Empréstimo vencido: ' + data.loan_debt + ' <span class="vi vi-coin sm"></span> — serviços bloqueados',
      'danger'
    ));
  }

  /* 2d. Section label */
  var sectionLbl = vCity.el('div', 'pt-section-label');
  sectionLbl.textContent = '⚜ Serviços do Banco ⚜';
  body.appendChild(sectionLbl);

  /* 2e. Services grid (PADRAO_TAVERNA canonical) */
  if (data.services && data.services.length) {
    body.appendChild(_bnkBuildServices(data.services));
  }

  /* 2f. Loan debt indicator (non-overdue) */
  if (data.loan_debt > 0 && !data.loan_overdue) {
    body.appendChild(vCity.statusAlert(
      'Empréstimo ativo: ' + data.loan_debt + ' <span class="vi vi-coin sm"></span> restantes',
      'warn'
    ));
  }

  root.appendChild(body);
  container.appendChild(root);
}
