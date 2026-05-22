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
 *   ~310  _tavBuildCenario(data) — cenário canonical PADRAO_TAVERNA
 *   ~360  _tavBuildNpcRow(data) — .row-npc canonical PADRAO_TAVERNA
 *   ~410  _tavBuildRepBar(data) — D&D 5e Renome
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
      // task #62 (2026-05-20) — backend_cb declarado para bot DEV chamar
      // tavern_drinks.buy_drink() server-side (charge gold, apply HP/MP).
      // Backend canonical: src/game/city/tavern_drinks.py:151 "tavern_buy_drink_<id>"
      // task #84 (2026-05-20): resultText específico por bebida (cohesão).
      { id: 'ale',   label: '🍺 Cerveja Comum · 1 V (+1 HP)', cb: 'drinks-confirm', backend_cb: 'tavern_buy_drink_ale',
        resultNarration: 'Grom serve a cerveja em caneca de prata e empurra na sua direção.',
        resultText: '"Ao primeiro gole, o cansaço já alivia." <i>(sorri)</i> "<b>+1 HP recuperado.</b> Boa rodada."' },
      { id: 'cider', label: '🍎 Sidra de Maçã · 2 V (+2 HP)', cb: 'drinks-confirm', backend_cb: 'tavern_buy_drink_cider',
        resultNarration: 'Grom pega um copo de cristal e despeja a sidra dourada, perfumada de maçã.',
        resultText: '"Da pomareira da viúva Helga, esta. <i>(olhar de aprovação)</i> Tem doçura honesta. <b>+2 HP recuperado.</b>"' },
      { id: 'mead',  label: '🍯 Hidromel do Vale · 4 V (+2 MP)', cb: 'drinks-confirm', backend_cb: 'tavern_buy_drink_mead',
        resultNarration: 'Grom puxa do barril de carvalho selado e serve o hidromel em copo de chifre lavrado.',
        resultText: '"Mel selvagem da Cordilheira Etérea. <i>(passa o pano nas mãos)</i> Limpa a mente, abre caminho pra magia. <b>+2 MP recuperado.</b> Bebe devagar."' },
      { id: 'stout', label: '🍺 Stout Anã · 6 V (+3 HP/+1 MP)', cb: 'drinks-confirm', backend_cb: 'tavern_buy_drink_stout',
        resultNarration: 'Grom abre o barril mais escuro com cuidado ritual. O cheiro de malte tostado preenche o ar.',
        resultText: '"Stout Anã, de Karak Norn. <i>(serve em caneca de cobre)</i> Cura o corpo <b>e</b> a alma. <b>+3 HP, +1 MP recuperado.</b> Vai com calma — derruba quem não respeita."' },
      { id: 'back',  label: '↩ "Outra hora."', cb: 'close' }
    ]
  },

  rumor: {
    /* task #84 (2026-05-20) — DIALOGUE COHESION: cada choice traz resultText
       específico (rumor real sobre o inimigo escolhido) em vez de cair no
       generic "Anotado. Bom proveito" que era incoerente. */
    npc: GROM_DIALOGUE.npc,
    script: [
      { type: 'speech', speaker: 'Grom Barba-Cinza', text: 'Cinco moedas, e te conto algo útil. <i>(estende a mão calejada)</i> Sobre o que quer saber?' },
      { type: 'narration', text: 'Você sente o peso da bolsa de moedas. Grom não vende rumor barato — o que ele conta vale a peça de prata.' }
    ],
    choices: [
      { id: 'goblin', label: '👹 Sobre Goblins · 5 V (+2 dano vs)', cb: 'rumor-confirm', backend_cb: 'tavern_rumor_buy_goblin',
        resultNarration: 'Grom recolhe as moedas e abaixa o tom. <i>(olha em volta antes de falar)</i>',
        resultText: '"Goblins. Pequenos, covardes em combate justo, mortais em emboscada. <i>(faz gesto com a mão)</i> Atacam em bando, dez ou mais. Atire flechas longas — eles falham em moral quando perdem o líder. Apontar pro maior primeiro, sempre. <b>Bônus: +2 de dano contra goblins até o próximo descanso longo.</b>"' },
      { id: 'wolf',   label: '🐺 Sobre Lobos · 5 V (+2 dano vs)', cb: 'rumor-confirm', backend_cb: 'tavern_rumor_buy_wolf',
        resultNarration: 'Grom apoia os cotovelos no balcão e respira fundo.',
        resultText: '"Lobos. Caçam em alcateia de seis ou oito, raramente sós. <i>(passa o dedo pela mesa, marcando um círculo)</i> Têm Tactics — flanqueiam pra ganhar Vantagem em ataques. Fique de costas pra uma parede ou árvore. Fogo afugenta, mas eles voltam quando a chama some. <b>+2 de dano contra lobos até o próximo descanso longo.</b>"' },
      { id: 'troll',  label: '👹 Sobre Trolls · 5 V (+2 dano vs)', cb: 'rumor-confirm', backend_cb: 'tavern_rumor_buy_troll',
        resultNarration: 'Grom enxuga as mãos e fica sério. <i>(pega uma caneca de cerveja, bebe um gole)</i>',
        resultText: '"Trolls. <i>(suspira)</i> Esses são osso duro. Regeneração de dez por turno — qualquer ferida que não seja ácido ou fogo se fecha. Se vir um, leve tocha ou óleo. Sem isso, ele não morre — só fica chateado. <b>+2 de dano contra trolls até o próximo descanso longo.</b>"' },
      { id: 'random', label: '🎲 Boato genérico · 5 V (bônus aleatório)', cb: 'rumor-confirm', backend_cb: 'tavern_rumor_buy_random',
        resultNarration: 'Grom dá uma olhada discreta pelas mesas. <i>(volta-se, sussurrando)</i>',
        resultText: '"Boato fresco da estrada. <i>(estala a língua)</i> Aventureiros voltaram falando de runas brilhantes no antigo templo a leste. Quem leu disse que aumentou a sorte de combate. <i>(dá de ombros)</i> Pode ser conversa de bêbado, ou pode ser informação real. Você decide. <b>Bônus mecânico aleatório aplicado (ataque, defesa, save, cura, ou ouro) até o próximo descanso longo. Detalhe: tavern_rumors_data.py.</b>"' },
      { id: 'back',   label: '↩ "Outra hora."', cb: 'close' }
    ]
  },

  carousing: {
    npc: GROM_DIALOGUE.npc,
    script: [
      { type: 'narration', text: 'Grom esfrega o queixo, pensativo. Ele conhece três tipos de festa: a dos trabalhadores honestos, a da classe média comerciante, e a dos nobres que fingem não te ver até pagarem por ti.' },
      { type: 'speech', speaker: 'Grom Barba-Cinza', text: 'Carousing, hein? <i>(ri baixo)</i> Sim, posso te apresentar. Noite na taverna humilde, dez moedas. Festa burguesa, cinquenta. Banquete nobre… duzentos e cinquenta, e ainda precisa fingir que sabe etiqueta.' },
      { type: 'speech', speaker: 'Grom Barba-Cinza', text: 'Sucesso depende de CARISMA. <i>(aponta o livro)</i> A regra é antiga — os mestres de salão a conhecem há séculos.' }
    ],
    choices: [
      // task #62: backend_cb = src/game/city/tavern_carousing.py:111 "tavern_carouse_do_<tier_id>"
      // task #84: resultText específico por tier (cohesão).
      { id: 'lower',  label: '🍺 Farra Humilde · 10 V · DC 10', cb: 'carousing-confirm', backend_cb: 'tavern_carouse_do_lower',
        resultNarration: 'Grom acena pra um grupo de carregadores e estaleiros. <i>(faz sinal pra trazerem mais um banco)</i>',
        resultText: '"Senta com eles, Vossa Senhoria. Bebe a primeira rodada e escuta. <i>(sorri torto)</i> Aqui se faz contato com gente que conhece a estrada — barcos, cargas, atalhos. Teste de Carisma — Classe de Dificuldade 10."' },
      { id: 'middle', label: '🍷 Festa Refinada · 50 V · DC 15', cb: 'carousing-confirm', backend_cb: 'tavern_carouse_do_middle',
        resultNarration: 'Grom te leva pra sala privada nos fundos. Mercadores de tecido riem em volta de um tabuleiro de Conquista.',
        resultText: '"Esses são mercadores médios — vinho importado e mãos que sabem contar moedas. <i>(piscar de olho)</i> Boa conversa abre portas pra contratos. Teste de Carisma — Classe de Dificuldade 15."' },
      { id: 'upper',  label: '👑 Banquete Nobre · 250 V · DC 20', cb: 'carousing-confirm', backend_cb: 'tavern_carouse_do_upper',
        resultNarration: 'Grom faz um gesto solene e abre a porta da Sala Alta. Dentro, três nobres ajustam casacos bordados.',
        resultText: '"Vossa Senhoria precisa lembrar de cada nome, cada título. <i>(voz baixa)</i> Eles testam etiqueta antes de ouvir negócio. Teste de Carisma — Classe de Dificuldade 20. Quem passa fica conhecido nas Casas."' },
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
      // task #62: backend_cb = src/game/city/tavern_pit_fight.py:89 "tavern_pitfight_bet_<amount>"
      // task #84: resultText específico por aposta (cohesão).
      { id: 'bet10',  label: '👊 Apostar 10 V', cb: 'pitfight-confirm', backend_cb: 'tavern_pitfight_bet_10',
        resultNarration: 'Grom anota a aposta de dez moedas no caderno de pedra. <i>(fecha o livro com som seco)</i>',
        resultText: '"Aposta modesta — risco baixo. <i>(serve uma cerveja antes do combate)</i> Vitória paga vinte. Bom pra começar."' },
      { id: 'bet25',  label: '👊 Apostar 25 V', cb: 'pitfight-confirm', backend_cb: 'tavern_pitfight_bet_25',
        resultNarration: 'Grom estuda Vossa Senhoria com olhar de avaliador. <i>(anota a aposta no livro)</i>',
        resultText: '"Vinte e cinco. <i>(sorri com cinismo)</i> Aposta de quem confia nos punhos. Cinquenta de retorno se sobreviver — desconto se cair no segundo round."' },
      { id: 'bet50',  label: '👊 Apostar 50 V', cb: 'pitfight-confirm', backend_cb: 'tavern_pitfight_bet_50',
        resultNarration: 'Grom assobia baixo. Outros apostadores em volta giram a cabeça. <i>(carrega o anel de prata)</i>',
        resultText: '"Cinquenta. <i>(faz gesto de respeito)</i> Vossa Senhoria está confiante. Cem se vencer dois rounds. Se for derrotado cedo, eu cuido das despesas do curandeiro."' },
      { id: 'bet100', label: '👊 Apostar 100 V (alto risco)', cb: 'pitfight-confirm', backend_cb: 'tavern_pitfight_bet_100',
        resultNarration: 'Grom faz uma pausa longa, dedos tamborilando no balcão. <i>(troca olhares com o juiz da arena)</i>',
        resultText: '"Cem moedas. <i>(volta-se)</i> Aposta de quem ou ganha ou se arrepende muito. Duzentas pra Vossa Senhoria se vencer. <i>(voz mais baixa)</i> Se perder... bem, melhor não pensar nisso."' },
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
      // task #70 review (2026-05-20): gather_info era dead-end (no backend
      // handler). Agora chain pra gossip_deep (sub-dialogue PADRAO_ALDRIC
      // com Investigação check + lore real). Aproveita o universal fallback.
      { id: 'gossip_deep',  label: '🔍 "O que você sabe sobre eles?"' },
      { id: 'leave','label': '↩ "Deixa pra lá."', cb: 'close' }
    ]
  },

  /* task #70 review: gossip_deep — sub-dialogue chain do gossip.
     Implementa "investigar" com Investigação DC 13. */
  gossip_deep: {
    npc: GROM_DIALOGUE.npc,
    script: [
      { type: 'speech', speaker: 'Grom Barba-Cinza', text: 'Discrição, antes. <i>(limpa caneca devagar, voz baixa)</i> Eles têm sotaque de Vale-do-Norte mas usam moeda de Eldoria pré-Cisma. <i>(estala dedos)</i> Velho demais pra ser troca normal. E nunca pediram comida — só vinho e mesa no canto.' },
      { type: 'speech', speaker: 'Grom Barba-Cinza', text: 'Se quer mais que isso, vai precisar olhar com cuidado próprio. <i>(devolve caneca à prateleira)</i> Não me envolvo no que não me cabe.' }
    ],
    choices: [
      { id: 'investigate', label: '🔎 "Vou olhar de perto." · Investigação DC 13', cb: 'dice:investigation:13:+1' },
      { id: 'persuade',    label: '💬 "Me conta mais — fica entre nós." · Persuasão DC 14', cb: 'dice:persuasion:14:+1' },
      { id: 'leave',       label: '↩ "Outra hora, Grom."', cb: 'close' }
    ]
  },

  /* task #63 (2026-05-20) — 5 dialogues PADRAO_ALDRIC novos pra svc legacy.
     Cada um segue mecânicas D&D 5e canonical com narrativa imersiva. */

  bard: {
    /* Bardic Inspiration — — bard performs, listener may gain
       inspiration die. Tip 1V/5V escala chance. */
    npc: GROM_DIALOGUE.npc,
    script: [
      { type: 'narration', text: 'No canto da taverna, sobre um tablado modesto, uma jovem de cabelos cor-de-fogo afina o alaúde. Ela usa um broche de prata em forma de pena — símbolo do Conservatório de Eldoria. Suas mãos têm calos diferentes de quem trabalha o metal: marcas de cordas, mistura de violão e harpa.' },
      { type: 'speech', speaker: 'Grom Barba-Cinza', text: 'Lyra Cantarriba. <i>(passa o pano pela caneca)</i> Estudou no Conservatório, voltou ano passado quando o avô caiu doente. Toca pra pagar o quarto. Sabe Inspirar — coisa de bardo de verdade, não dessas balada de cantar Birthday Happy.' },
      { type: 'speech', speaker: 'Grom Barba-Cinza', text: 'Dá uma gorjeta, ela canta pra ti. <i>(ergue dois dedos)</i> Cinco moedas e ela <i>foca</i> em ti — Inspiração Bardica vira teu próximo teste. <b>+1d6 no próximo teste.</b>' }
    ],
    choices: [
      // task #84: resultText por gorjeta — cohesão.
      { id: 'tip_1', label: '🎵 Gorjeta 1 V · só ouvir', cb: 'bard-confirm', backend_cb: 'tavern_bard_tip_1',
        resultNarration: 'Lyra olha pra Vossa Senhoria com gratidão silenciosa. <i>(aceita a moeda, guarda no broche de pena)</i>',
        resultText: '"Obrigada. <i>(começa a tocar uma balada melancólica)</i> Não é toda noite que se ouve com atenção." <i>Você relaxa enquanto a melodia preenche a taverna.</i>' },
      { id: 'tip_5', label: '🎵 Gorjeta 5 V · Inspiração 1d6', cb: 'bard-confirm', backend_cb: 'tavern_bard_tip_5', renownDelta: 1,
        resultNarration: 'Lyra ergue os olhos, focada em Vossa Senhoria. <i>(troca a melodia pra algo mais íntimo e poderoso)</i>',
        resultText: '"Para Vossa Senhoria. <i>(canta com voz cristalina)</i> Que a coragem te acompanhe quando o silêncio falar mais alto que o aço." <b>+1d6 Inspiração Bardica até o próximo descanso longo. +1 Renome da Taverna.</b>' },
      { id: 'flirt', label: '💬 "Toca algo só pra mim?" · Persuasão DC 14', cb: 'dice:persuasion:14:+1' },
      { id: 'request', label: '🎭 "Conhece a Balada de Korrigan?" · História DC 12', cb: 'dice:history:12:+0' },
      { id: 'back',  label: '↩ "Talvez depois."', cb: 'close' }
    ]
  },

  mercenaries: {
    /* Hireling Mercenary — — hire NPC by day rate. Costs vary
       by skill (Skilled vs Unskilled hireling */
    npc: GROM_DIALOGUE.npc,
    script: [
      { type: 'narration', text: 'Grom aponta a porta lateral que dá pro pátio. Lá fora, três figuras esperam encostadas no muro — um homem de couro escuro e olhar paciente, uma orca de armadura escamada com martelo nas costas, e um halfling de capa cinza que ninguém olha duas vezes (que é exatamente o ponto).' },
      { type: 'speech', speaker: 'Grom Barba-Cinza', text: 'Os três tão livres pra serviço. <i>(aponta o livro de tarja)</i> Contratação padrão da cidade — taxa diária varia por habilidade. Os com ofício custam duas, sem ofício metade.' },
      { type: 'speech', speaker: 'Grom Barba-Cinza', text: 'Mas Vossa Senhoria pode pechinchar. <i>(sorri torto)</i> Se souber falar bonito — ou se for amigo de quem aqui já é casa.' }
    ],
    choices: [
      // task #84: resultText específico (cohesão).
      { id: 'browse', label: '⚔ Ver lista de mercenários', cb: 'mercenaries-confirm', backend_cb: 'tavern_mercenaries_open',
        resultNarration: 'Grom abre a porta lateral. Os três mercenários enfileiram-se, prontos pra apresentação.',
        resultText: '"Primeiro, Drelya — orca, martelo de duas mãos, vinte moedas o dia. Atrás dela, Karn — espadachim humano, quinze. Por último, Tarn-Sombra — halfling escarmecedor, dezoito. <i>(cruza os braços)</i> Contrato semanal padrão. Vossa Senhoria escolhe."' },
      { id: 'negotiate', label: '💬 "Desconto, Grom?" · Persuasão DC 15', cb: 'dice:persuasion:15:+2' },
      { id: 'insight', label: '🔍 "Quem aqui é confiável?" · Intuição DC 13', cb: 'dice:insight:13:+1' },
      { id: 'rude',   label: '"Vendendo pessoas, Grom?"', cb: 'opinion-rude', renownDelta: -2 },
      { id: 'back',   label: '↩ "Outro dia."', cb: 'close' }
    ]
  },

  adventurers: {
    /* Hire Adventuring NPC — — skilled hireling com classes.
       Pagamento em dia + lealdade based on treat (Renome). */
    npc: GROM_DIALOGUE.npc,
    script: [
      { type: 'narration', text: 'Grom abre uma gaveta lateral e retira uma pasta encadernada em couro com selo do Conservatório dos Mapas. Dentro, quatro pergaminhos cuidadosamente catalogados — cada um com perfil de um Explorador veterano disponível pra contrato semanal.' },
      { type: 'speech', speaker: 'Grom Barba-Cinza', text: 'Exploradores são diferentes de mercenários. <i>(folha o primeiro pergaminho)</i> Conhecem mapas, sabem ler trilhas, e — o que importa — voltam vivos. São especialistas em viagem por terras selvagens.' },
      { type: 'speech', speaker: 'Grom Barba-Cinza', text: 'A taxa não é barata. Quarenta moedas o dia base, mais bônus de risco. Mas se Vossa Senhoria vai longe — vale cada Valdorita.' }
    ],
    choices: [
      // task #84: resultText específico (cohesão).
      { id: 'browse', label: '🗺 Ver exploradores disponíveis', cb: 'adventurers-confirm', backend_cb: 'tavern_adventurers_open',
        resultNarration: 'Grom abre a pasta e organiza os pergaminhos sobre o balcão. <i>(aponta um a um)</i>',
        resultText: '"Yorath, batedor de Vale-Cinza, conhece as Marcas e a Floresta do Norte. Sira-Vento, anã das montanhas — mapeia minas e túneis. <i>(folha o terceiro)</i> Os outros dois saíram pra missão, voltam em três dias. Quarenta moedas o dia, mais quinze por terra hostil."' },
      { id: 'persuade', label: '💬 "Vale meio do preço?" · Persuasão DC 16', cb: 'dice:persuasion:16:+2' },
      { id: 'history', label: '📜 "Algum já desbravou as Marcas?" · História DC 14', cb: 'dice:history:14:+1' },
      { id: 'back',   label: '↩ "Penso bem."', cb: 'close' }
    ]
  },

  games: {
    /* Gaming Set proficiency — — Dice / Cards / Drinking contest.
       Gambling = DC-based check com loss/win por dado. */
    npc: GROM_DIALOGUE.npc,
    script: [
      { type: 'narration', text: 'Grom estende o braço pro lado direito da sala. Quatro mesas ocupadas — duas com Ossos do Dragão (dados clássicos), uma com baralho marcado de prata, e outra com fileiras de canecas cheias e olhares determinados.' },
      { type: 'speech', speaker: 'Grom Barba-Cinza', text: 'Apostas variam. <i>(sorri com cinismo gentil)</i> Ossos do Dragão são o clássico — proficiência em Dice Set () dá vantagem. Cartas requer Engano <b>ou</b> Percepção pra não ser enganado. Bebida... bem, Constituição contra Constituição até alguém cair.' }
    ],
    choices: [
      // task #84: resultText específico pra ossos (cohesão).
      { id: 'bones',     label: '🐉 Ossos do Dragão · 5 V', cb: 'games-confirm', backend_cb: 'tavern_bones_menu',
        resultNarration: 'Grom te conduz à mesa de Ossos do Dragão. Quatro jogadores abrem espaço com olhares curiosos.',
        resultText: '"Cinco moedas pela entrada — devolvidas em parte se ficar até o final da rodada. <i>(coloca o copo de couro sobre a mesa)</i> Três dados de seis lados. Aposta acompanha. <b>Proficiência em conjunto de dados concede Vantagem em uma rolagem.</b>"' },
      { id: 'cards',     label: '🃏 Cartas · Engano DC 13', cb: 'dice:deception:13:+1' },
      { id: 'drinking',  label: '🍺 Concurso de Bebida · CON DC 15', cb: 'dice:constitution:15:+0' },
      { id: 'observe',   label: '👁 Apenas observar · Intuição DC 11', cb: 'dice:insight:11:+0' },
      { id: 'back',      label: '↩ "Outra hora."', cb: 'close' }
    ]
  },

  bulletin: {
    /* Notice Board / Job board — typical fantasy quest hook + Renome gain
       via accepted jobs. */
    npc: GROM_DIALOGUE.npc,
    script: [
      { type: 'narration', text: 'Grom aponta a parede de cortiça envelhecida ao lado da lareira. Dezenas de pergaminhos pregados ali — alguns com selo de cera lacrada, outros rabiscados a carvão. Os mais antigos têm marcas circulares de canecas de cerveja.' },
      { type: 'speech', speaker: 'Grom Barba-Cinza', text: 'O Mural. <i>(coça a barba ruiva)</i> Aqui se cola tudo: fazendeiro que perdeu vaca, viúva precisando escolta, comerciante atrás de guarda noturno. <i>(aponta um pergaminho dourado no canto)</i> Esse aí ali, do selo nobre, paga bem — mas não vou jurar que voltam todos vivos.' },
      { type: 'speech', speaker: 'Grom Barba-Cinza', text: 'Lê os avisos. Aceita o que cabe na tua espada. <b>Renome sobe com job entregue</b>, cai com prazo quebrado. Casa é firme com a palavra.' }
    ],
    choices: [
      // task #84: resultText específico (cohesão).
      { id: 'read', label: '📋 Ler avisos do Mural', cb: 'bulletin-confirm', backend_cb: 'tavern_bulletin_open',
        resultNarration: 'Grom acompanha Vossa Senhoria até o Mural. <i>(arruma os pergaminhos pra deixar à vista)</i> Dezenas de oportunidades — algumas urgentes, outras esperando há semanas.',
        resultText: '"Lê com calma. <i>(passa o dedo por cinco selos diferentes)</i> Tem trabalho de escolta, caça à recompensa, retorno de criança perdida, e três do selo nobre que ninguém ainda teve coragem. Quem aceita um, o nome fica registrado na Casa. <b>Avisos do Mural carregados — escolha contrato pra aceitar.</b>"' },
      { id: 'investigate', label: '🔍 "Algum cheira a armadilha?" · Investigação DC 14', cb: 'dice:investigation:14:+1' },
      { id: 'noble', label: '👑 "Conta-me do selo nobre." · História DC 13', cb: 'dice:history:13:+0' },
      { id: 'back', label: '↩ "Depois eu leio."', cb: 'close' }
    ]
  }
};

/* === Backend cb → dialogue key map ====================================
 * task #59 (2026-05-20): FIX cb keys mismatch. Audit via Chrome MCP descobriu
 * que backend envia cb com sufixo "_open" / "_buy" (não "_menu"):
 *   'tavern_drinks_open', 'tavern_rumor_buy', 'tavern_carousing_open',
 *   'tavern_pitfight_open', 'tavern_gather_open'
 * Antes mapeavam pra keys ANTIGAS ('tavern_drink_menu', 'tavern_rumor', etc)
 * que NUNCA batiam. Resultado: TODOS os svc cards caíam no fallback vCity.act
 * (legacy drill-down) em vez de abrirem PADRAO_ALDRIC encounter.
 * Backend tavern.py:153-165 confirma os cb codes corretos. */
var TAVERN_CB_TO_DIALOGUE = {
  'tavern_drinks_open':         'drinks',
  'tavern_rumor_buy':           'rumor',
  'tavern_carousing_open':      'carousing',
  'tavern_pitfight_open':       'pitfight',
  'tavern_gather_open':         'gossip',
  // task #63 (2026-05-20) — migration completa: 5 svc legacy agora PADRAO_ALDRIC.
  // Cada dialogue tem narrativa imersiva + skill check choices (dice:*) +
  // mecânicas D&D 5e canonical (PHB/XGtE refs nos comments).
  'tavern_bard_open':           'bard',
  'tavern_mercenaries_open':    'mercenaries',
  'tavern_adventurers_open':    'adventurers',
  'tavern_games_open':          'games',
  'tavern_bulletin_open':       'bulletin'
  // Migração
  // incremental — adicionar entry aqui + dialogue em SERVICE_DIALOGUES_TAVERN.
};

/* === Service icon meta ================================================== */
/* Sessão #23 (2026-05-22): user pediu remover XGtE p.XXX e termos em inglês
   visíveis. Refs D&D mantidas SOMENTE em comentários, NUNCA em meta player-facing. */
var TAVERN_SVC_META = {
  /* 2026-05-20: keys MATCH actual svc.cb values em renderTavernHub (verified via Chrome MCP).
     Keys antigas (tavern_drink_menu, tavern_rumor, etc) eram mismatch — meta.icon undefined,
     img nunca era criado, svc-ico ficava vazio (sem PNG). */
  'tavern_drinks_open':        { icon: '../shared/img/services/svc-bebidas.png',      meta: 'Recupera HP/MP' },
  'tavern_rumor_buy':          { icon: '../shared/img/services/svc-rumores.png',      meta: '5 V · pistas' },
  'tavern_mercenaries_open':   { icon: '../shared/img/services/svc-mercenarios.png',  meta: 'Contratar por dia' },
  'tavern_adventurers_open':   { icon: '../shared/img/services/svc-exploradores.png', meta: 'Especialistas de campo' },
  'tavern_games_open':         { icon: '../shared/img/services/svc-dados.png',        meta: 'Apostar nos dados' },
  'tavern_carousing_open':     { icon: '../shared/img/services/svc-socializar.png',   meta: 'Fazer contatos' },
  'tavern_gather_open':        { icon: '../shared/img/services/svc-informacoes.png',  meta: 'Investigar boatos' },
  'tavern_pitfight_open':      { icon: '../shared/img/services/svc-rinha.png',        meta: 'Combate de aposta' },
  'tavern_bulletin_open':      { icon: '../shared/img/services/svc-mural.png',        meta: 'Tarefas locais' },
  'tavern_bard_open':          { icon: '../shared/img/services/svc-bardo.png',        meta: 'Inspiração: +1d6' }
};

/* === Cenário canonical ============================================== */
function _tavBuildCenario(data) {
  var cenarioEl = vCity.el('div', 'cenario');

  // Banner background — filename canonical: javali-negro-banner.png
  var bg = vCity.el('img', 'cenario-bg');
  bg.src = '../shared/img/taverna/javali-negro-banner.png';
  bg.alt = '';
  bg.loading = 'lazy';
  bg.onerror = function(){ this.style.display = 'none'; };
  cenarioEl.appendChild(bg);

  cenarioEl.appendChild(vCity.el('div', 'candle-glow l'));
  cenarioEl.appendChild(vCity.el('div', 'candle-glow r'));

  // Brasão — filename canonical: javali-negro-crest.png
  var crest = vCity.el('img', 'cenario-brasao');
  crest.src = '../shared/img/taverna/javali-negro-crest.png';
  crest.alt = 'Brasão do Javali Negro';
  crest.loading = 'lazy';
  crest.onerror = function(){ this.style.display = 'none'; };
  cenarioEl.appendChild(crest);

  // Título
  var titulo = vCity.el('div', 'cenario-titulo');
  var nameEl = vCity.el('div', 'name');
  nameEl.textContent = 'Taverna do Javali Negro';
  titulo.appendChild(nameEl);
  var subEl = vCity.el('div', 'sub');
  subEl.textContent = 'Estabelecimento de Grom Barba-Cinza · Bairro do Mercado';
  titulo.appendChild(subEl);
  cenarioEl.appendChild(titulo);

  return cenarioEl;
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
  var renome = 0;
  if (data && data.renome && typeof data.renome.tavern === 'number') renome = data.renome.tavern;
  else if (window._PLAYER_RENOWN && typeof window._PLAYER_RENOWN.tavern === 'number') renome = window._PLAYER_RENOWN.tavern;

  var tier = 'NEUTRO';
  if (renome >= 25) tier = 'AMIGÁVEL';
  else if (renome >= 10) tier = 'CORDIAL';
  else if (renome < 0 && renome >= -10) tier = 'FRIO';
  else if (renome < -10) tier = 'HOSTIL';

  var pct = Math.max(0, Math.min(100, Math.round((renome + 10) / 40 * 100)));

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
  val.textContent = tier + ' · ' + renome;
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

  /* 1. Cenário canonical (PADRAO_TAVERNA) */
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
