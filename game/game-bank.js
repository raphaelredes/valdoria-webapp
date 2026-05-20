/* ============================================================================
 * game-bank.js — Banco AAA renderer (FULL PADRAO_TAVERNA + PADRAO_ALDRIC)
 * ============================================================================
 *
 * Task #23 (sessão #13, 2026-05-19) — Banco POC do porting REAL:
 *   - Hero panel canonical (.cenario / .cenario-* classes) com banner + crest
 *   - NPC row clicável que abre encounter PADRAO_ALDRIC
 *   - SERVICE_DIALOGUES inline (8 svc dialogues PADRAO_ALDRIC com dice + Renown)
 *   - Cascade demo NPC Living System (about_tavira → desbloqueia Tavira)
 *   - vEncounter.render() (shared/encounter-popup.js) renderiza tudo
 *
 * NÃO usa game-bank.css legacy bnk-* — usa .cenario canonical de PADRAO_TAVERNA
 * + grid de services inline.
 *
 * MAPA_IA:
 *   ~50    _SVC_CONFIG_BANK (faction + reactions canonical)
 *   ~75    ALDWIN_DIALOGUE (greeting principal)
 *   ~110   SERVICE_DIALOGUES_BANK (8 dialogues: deposit/withdraw/loan/estate/
 *          store_item/retrieve_item/invest/insurance + cascade about_tavira/corvus)
 *   ~290   _bnkBuildCenario(data) — hero panel canonical PADRAO_TAVERNA
 *   ~350   _bnkBuildNpcRow(data) — NPC row clicável
 *   ~390   _bnkBuildServiceGrid(services) — grid com PADRAO_ALDRIC clicks
 *   ~440   renderBankHub(container, data) — entry point
 *
 * Doc canonical:
 *   memory/feedback_centralize_in_canonical_webapps.md (porting pattern)
 *   memory/reference_npc_personalities_canonical.md §2 Aldwin
 *   memory/reference_npc_living_system.md (NPC Living API)
 *   simuladores/banco-cofre-final.html (mockup source)
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

/* === SERVICE_DIALOGUES_BANK — 8 svc dialogues PADRAO_ALDRIC ============== */
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
      { type: 'speech', speaker: 'Aldwin de Tholram', text: 'Tavira veio aqui antes da Guilda dos Aventureiros ter aquele nome. <i>(toque suave de melancolia)</i> Uma aventureira de couro queimado, olhar de aço, cicatriz vertical no olho direito que ainda não tinha. Bom cliente. Pagava todas as dívidas no prazo — e nenhuma vez sem ler cada cláusula duas vezes.' },
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

/* === Hero panel canonical PADRAO_TAVERNA — .cenario / .cenario-* ======== */
function _bnkBuildCenario(data) {
  var hero = vCity.el('div', 'cenario bnk-cenario');
  /* Inline styles temporários — futuro: mover pra game-bank.css com .bnk-cenario.
     Por ora inline pra evitar dependência cross-file. */
  hero.style.cssText = [
    'position:relative',
    'padding:14px 14px 12px',
    'margin:0 -2px 12px',
    'border-radius:12px',
    'overflow:hidden',
    'background:radial-gradient(ellipse at 50% 0%,rgba(196,149,58,0.22) 0%,rgba(74,56,40,0.30) 45%,rgba(30,20,12,0.95) 100%)',
    'border:1px solid rgba(196,149,58,0.4)',
    'text-align:center'
  ].join(';');

  /* Brasão (crest) opcional — se PNG canonical existe */
  var crest = vCity.el('div', 'cenario-brasao');
  crest.style.cssText = 'width:48px;height:48px;margin:0 auto 6px;border-radius:50%;background:rgba(196,149,58,0.15);border:1.5px solid rgba(196,149,58,0.55);display:flex;align-items:center;justify-content:center;';
  crest.innerHTML = '<img src="../shared/img/bank/bnk-cofre.png" alt="" style="width:36px;height:36px;object-fit:contain;" onerror="this.style.display=\'none\';">';
  hero.appendChild(crest);

  var titulo = vCity.el('div', 'cenario-titulo');
  var nameEl = vCity.el('div', 'name');
  nameEl.textContent = 'Banco de Eldoria';
  nameEl.style.cssText = 'font-family:Georgia,serif;font-size:18px;font-weight:800;color:#c4953a;letter-spacing:2px;text-shadow:0 0 12px rgba(196,149,58,0.5);text-transform:uppercase;';
  titulo.appendChild(nameEl);
  var subEl = vCity.el('div', 'sub');
  subEl.textContent = 'Casa de Tholram · Cofre Real';
  subEl.style.cssText = 'font-family:Georgia,serif;font-size:11px;color:#b8a888;letter-spacing:1.5px;margin-top:2px;font-style:italic;';
  titulo.appendChild(subEl);
  hero.appendChild(titulo);

  return hero;
}

/* === NPC row clicável — open ALDWIN_DIALOGUE encounter ================== */
function _bnkBuildNpcRow(data) {
  var row = vCity.el('div', 'bnk-npc-row');
  row.style.cssText = [
    'display:flex',
    'align-items:center',
    'gap:10px',
    'padding:9px 11px',
    'margin-bottom:10px',
    'background:rgba(74,56,40,0.25)',
    'border:1px solid rgba(196,149,58,0.35)',
    'border-radius:9px',
    'cursor:pointer',
    'transition:all 0.15s ease'
  ].join(';');
  row.addEventListener('mouseenter', function(){
    row.style.background = 'rgba(196,149,58,0.18)';
    row.style.borderColor = '#c4953a';
  });
  row.addEventListener('mouseleave', function(){
    row.style.background = 'rgba(74,56,40,0.25)';
    row.style.borderColor = 'rgba(196,149,58,0.35)';
  });

  var portrait = vCity.el('img');
  portrait.src = '../shared/img/npcs/banqueiro.png';
  portrait.alt = 'Aldwin de Tholram';
  portrait.loading = 'lazy';
  portrait.style.cssText = 'width:46px;height:46px;border-radius:50%;border:1.5px solid #c4953a;object-fit:cover;flex-shrink:0;';
  portrait.onerror = function(){ this.style.display = 'none'; };
  row.appendChild(portrait);

  var info = vCity.el('div');
  info.style.cssText = 'flex:1;min-width:0;';
  var name = vCity.el('div');
  name.textContent = 'Aldwin de Tholram';
  name.style.cssText = 'font-weight:700;font-size:13px;color:#d4c8b0;letter-spacing:0.5px;';
  info.appendChild(name);
  var quote = vCity.el('div');
  quote.innerHTML = '"Bem-vindo, cliente. O cofre real abre na quarta hora."';
  quote.style.cssText = 'font-size:11px;color:#a09484;font-style:italic;line-height:1.4;margin-top:2px;';
  info.appendChild(quote);
  row.appendChild(info);

  var chev = vCity.el('div');
  chev.textContent = '›';
  chev.style.cssText = 'font-size:20px;color:#c4953a;font-weight:700;flex-shrink:0;';
  row.appendChild(chev);

  row.addEventListener('click', function(){
    if (typeof window.vEncounter === 'object' && window.vEncounter.render) {
      // Set _SVC_CONFIG (svc-interactions dispatch lê do global)
      window._SVC_CONFIG = window._SVC_CONFIG_BANK;
      window.vEncounter.render(ALDWIN_DIALOGUE, { dialogues: SERVICE_DIALOGUES_BANK });
    }
  });

  return row;
}

/* === Service grid com PADRAO_ALDRIC clicks (substitui vCity.serviceGrid) === */
function _bnkBuildServiceGrid(services) {
  var grid = vCity.el('div', 'bnk-svc-grid');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(2,1fr);gap:8px;';
  (services || []).forEach(function(svc) {
    var card = vCity.el('div', 'bnk-svc-card');
    card.style.cssText = [
      'display:flex',
      'flex-direction:column',
      'align-items:center',
      'gap:4px',
      'padding:10px 8px',
      'background:rgba(74,56,40,0.25)',
      'border:1px solid rgba(196,149,58,0.35)',
      'border-radius:8px',
      'cursor:pointer',
      'text-align:center',
      'transition:all 0.15s ease'
    ].join(';');
    if (svc.disabled) {
      card.style.opacity = '0.4';
      card.style.cursor = 'default';
    }
    card.addEventListener('mouseenter', function(){
      if (svc.disabled) return;
      card.style.background = 'rgba(196,149,58,0.18)';
      card.style.borderColor = '#c4953a';
    });
    card.addEventListener('mouseleave', function(){
      card.style.background = 'rgba(74,56,40,0.25)';
      card.style.borderColor = 'rgba(196,149,58,0.35)';
    });

    /* Icon */
    var ico = vCity.el('div');
    ico.style.cssText = 'width:32px;height:32px;display:flex;align-items:center;justify-content:center;';
    var icoStr = svc.icon || '';
    if (icoStr.indexOf('<svg') >= 0) {
      ico.innerHTML = icoStr;
    } else {
      ico.style.fontSize = '24px';
      ico.textContent = icoStr;
    }
    card.appendChild(ico);

    var name = vCity.el('div');
    name.textContent = svc.label || '';
    name.style.cssText = 'font-size:12px;font-weight:600;color:#d4c8b0;letter-spacing:0.3px;';
    card.appendChild(name);

    if (svc.cost !== undefined && svc.cost !== null) {
      var price = vCity.el('div');
      price.style.cssText = 'font-size:10px;color:' + (svc.cost === 0 ? '#7ad06b' : '#c4953a') + ';';
      if (svc.cost === 0) {
        price.textContent = 'Grátis';
      } else {
        price.textContent = String(svc.cost) + ' V';
      }
      card.appendChild(price);
    }

    /* Click — abre PADRAO_ALDRIC se SERVICE_DIALOGUES_BANK match, senão default vCity.act */
    if (svc.cb && !svc.disabled) {
      card.addEventListener('click', function(){
        // Match cb diretamente ou strip prefix 'bank_' (backend usa bank_deposit, etc.)
        var key = svc.cb;
        var stripped = key.indexOf('bank_') === 0 ? key.substring(5) : key;
        var dialogue = SERVICE_DIALOGUES_BANK[key] || SERVICE_DIALOGUES_BANK[stripped];
        if (dialogue && typeof window.vEncounter === 'object' && window.vEncounter.render) {
          window._SVC_CONFIG = window._SVC_CONFIG_BANK;
          window.vEncounter.render(dialogue, { dialogues: SERVICE_DIALOGUES_BANK });
        } else if (typeof vCity.act === 'function') {
          vCity.act(svc.cb);
        }
      });
    }
    grid.appendChild(card);
  });
  return grid;
}

/* === renderBankHub — entry point canonical =============================== */
function renderBankHub(container, data) {
  if (!container || !data) return;
  console.warn('[CITY-BANK] renderBankHub gold=' + (data.gold || 0)
    + ' bank=' + (data.bank_gold || 0)
    + ' services=' + (data.services ? data.services.length : 0));
  while (container.firstChild) container.removeChild(container.firstChild);

  /* NPC Living: registra visita ao Banco */
  try {
    if (typeof window._npcMarkVisit === 'function') {
      window._npcMarkVisit('aldwin', 'enter_bank');
    }
  } catch (e) { console.warn('[CITY-BANK] _npcMarkVisit fail:', e); }

  var root = vCity.el('div', 'bnk-hub bnk-hub-aaa');

  /* 1. Hero cenário (canonical PADRAO_TAVERNA — substitui banner antigo) */
  root.appendChild(_bnkBuildCenario(data));

  /* 2. NPC row clicável → opens encounter PADRAO_ALDRIC */
  root.appendChild(_bnkBuildNpcRow(data));

  /* 3. Loan overdue alert */
  if (data.loan_overdue && data.loan_debt > 0) {
    root.appendChild(vCity.statusAlert(
      'Empréstimo vencido: ' + data.loan_debt + ' <span class="vi vi-coin sm"></span> — serviços bloqueados',
      'danger'
    ));
  }

  /* 4. NPC greeting (canonical Aldwin de BANK_GREETINGS em cidade/index.html) */
  if (data.greeting) {
    var greet = vCity.el('div', 'bnk-greeting');
    greet.style.cssText = 'padding:10px 12px;margin-bottom:12px;background:rgba(0,0,0,0.25);border-left:2px solid rgba(196,149,58,0.5);font-style:italic;color:#b8a888;font-size:12px;line-height:1.5;';
    greet.textContent = vCity.stripTags(data.greeting);
    root.appendChild(greet);
  }

  /* 5. Balance cards (Bolsa + Cofre) */
  var balances = vCity.el('div', 'bnk-balance-row');
  balances.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;';

  function _balanceCard(label, value, img) {
    var c = vCity.el('div');
    c.style.cssText = 'padding:10px 8px;background:rgba(74,56,40,0.25);border:1px solid rgba(196,149,58,0.35);border-radius:8px;text-align:center;';
    if (img) {
      var i = vCity.el('div');
      i.innerHTML = '<img src="' + img + '" style="width:36px;height:36px;object-fit:contain;" loading="lazy" onerror="this.style.display=\'none\';">';
      c.appendChild(i);
    }
    var lbl = vCity.el('div');
    lbl.textContent = label;
    lbl.style.cssText = 'font-size:10px;color:#a09484;letter-spacing:1.5px;margin-top:4px;';
    c.appendChild(lbl);
    var val = vCity.el('div');
    val.textContent = String(value) + ' ';
    val.appendChild(vCity.coin('sm'));
    val.style.cssText = 'font-size:15px;font-weight:700;color:#c4953a;margin-top:2px;';
    c.appendChild(val);
    return c;
  }
  balances.appendChild(_balanceCard('BOLSA', data.gold || 0, '../shared/img/bank/bnk-bolsa.png'));
  balances.appendChild(_balanceCard('COFRE', data.bank_gold || 0, '../shared/img/bank/bnk-cofre.png'));
  root.appendChild(balances);

  /* 6. Loan debt indicator (non-overdue) */
  if (data.loan_debt > 0 && !data.loan_overdue) {
    root.appendChild(vCity.statusAlert(
      'Empréstimo ativo: ' + data.loan_debt + ' <span class="vi vi-coin sm"></span> restantes',
      'warn'
    ));
  }

  /* 7. Services grid com PADRAO_ALDRIC clicks */
  if (data.services && data.services.length) {
    root.appendChild(vCity.sectionLabel('⚜ Serviços do Banco ⚜'));
    root.appendChild(_bnkBuildServiceGrid(data.services));
  }

  container.appendChild(root);
}
