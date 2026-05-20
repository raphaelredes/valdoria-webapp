/* ============================================================================
 * game-temple.js — Templo dos Deuses renderer (FULL PADRAO_TAVERNA canonical)
 * ============================================================================
 *
 * Task #26 sessão #14 (2026-05-20) — REFATORADO p/ usar PADRAO_TAVERNA canonical:
 * classes .cenario, .row-npc, .rep-bar, .services, .svc (sem mais tmp-* custom).
 *
 * User mandato: "todas as telas da cidade DEVEM ficar no PADRAO_TAVERNA".
 * CSS canonical em shared/padrao-taverna.css.
 *
 * MAPA_IA:
 *   ~30   _SVC_CONFIG_TEMPLE (faction temple + reactions canonical)
 *   ~55   ALDRIC_DIALOGUE (greeting principal — Padre Aldric)
 *   ~80   SERVICE_DIALOGUES_TEMPLE (6 dialogues PADRAO_ALDRIC inline)
 *   ~280  TEMPLE_CB_TO_DIALOGUE (backend cb → dialogue key map)
 *   ~310  TEMPLE_SVC_META (svc icon path + meta text canonical)
 *   ~340  _tmpBuildCenario(data) — cenário canonical PADRAO_TAVERNA
 *   ~390  _tmpBuildNpcRow(data) — .row-npc canonical PADRAO_TAVERNA
 *   ~440  _tmpBuildRepBar(data) — Renown DMG p.22
 *   ~470  _tmpBuildServices(services) — .services + .svc canonical
 *   ~530  renderTempleHub(container, data) — entry point
 *
 * Doc canonical:
 *   memory/feedback_centralize_in_canonical_webapps.md (porting pattern)
 *   simuladores/templo-deuses-final.html (mockup source)
 *   shared/padrao-taverna.css (CSS canonical compartilhado)
 *   src/game/city/temple.py:22 (TEMPLE_NPCS backend mapping)
 * ============================================================================ */

'use strict';

/* === Per-renderer SVC config — passa pra svc-interactions._dispatchSvcChoice. */
(function() {
  if (!window._SVC_CONFIG_TEMPLE) {
    window._SVC_CONFIG_TEMPLE = {
      faction: 'temple',
      factionLabel: 'Templo dos Quatro',
      reactions: {
        very_negative: 'Padre Aldric baixa o olhar lentamente, expressão grave. <i>(faz o sinal sagrado)</i> "Que os Quatro tenham piedade da tua alma. Vai em paz — mas o Templo já não te chama de irmão."',
        negative: 'Padre Aldric suspira longo. <i>(toca o símbolo sagrado no peito)</i> "Há quem se afaste dos deuses sem perceber. Reflete sobre teus atos — sempre há tempo de retornar ao caminho."',
        neutral: 'Padre Aldric mantém olhar paciente, indecifrável. <i>(volta às orações)</i> "Que tua jornada seja iluminada."',
        positive: 'Padre Aldric assente com aprovação contida. <i>(traça o sinal de bênção em tua testa)</i> "Os Quatro caminham contigo, irmão. Que a luz dos vitrais te guie até o próximo retorno."',
        very_positive: 'Padre Aldric inclina-se, primeira reverência em meses. <i>(coloca uma mão sobre teu ombro)</i> "Palavras como essas honram o Santuário. Tens a graça dos Quatro — e o respeito de seu mais velho servo."'
      },
      confirmMsgs: {
        narration: 'Padre Aldric move-se até o altar e acende uma vela votiva em teu nome. <i>(murmura uma prece em língua antiga)</i>',
        generic: '"Os Quatro recebem tua oferta. Que tua jornada seja bendita." <i>(traça o sinal sagrado entre vocês)</i>'
      }
    };
  }
})();

/* === ALDRIC_DIALOGUE (greeting principal — opens on NPC row click) ====== */
var ALDRIC_DIALOGUE = {
  npc: {
    name: 'Padre Aldric',
    desc: 'Sumo Sacerdote · trinta anos servindo o Templo dos Quatro',
    portrait: '../shared/img/npcs/padre-aldric.png'
  },
  script: [
    { type: 'narration', text: 'O salão do Templo de Eldoria respira em paz solene. Vitrais redondos onde sol e lua se entrelaçam projetam discos de luz dourada e prateada sobre o mármore antigo. Diante do altar principal, Padre Aldric — vestes de linho branco bordadas em fio de ouro, barba grisalha, terço de contas de âmbar nas mãos — ergue os olhos da oração em silêncio. Ele te reconhece. Sorri.' },
    { type: 'speech', speaker: 'Padre Aldric', text: 'Bem-vindo ao Santuário dos Quatro, irmão. <i>(fecha o terço com gesto reverente)</i> Que os deuses te guiem em tua jornada. O Templo está aberto a todos — sejam eles peregrinos, doentes, ou apenas almas em busca de paz.' },
    { type: 'speech', speaker: 'Padre Aldric', text: 'O Santuário oferece quatro grandes dons. <i>(estende a mão indicando os altares)</i> Cura para o corpo, bênçãos para a jornada, oração para o espírito, e — quando a hora chegar — confissão para a alma. Cada um tem seu preço; nenhum tem seu valor verdadeiro em moedas.' },
    { type: 'speech', speaker: 'Padre Aldric', text: 'O que te traz hoje ao Templo, irmão? <i>(entrelaça as mãos sobre o terço)</i> Conta-me — e que os Quatro nos ouçam.' }
  ],
  choices: [
    { id: 'heal',    label: '❤️ "Preciso de cura."', cb: 'heal' },
    { id: 'bless',   label: '✨ "Vim buscar uma bênção."', cb: 'bless' },
    { id: 'confess', label: '🕯️ "Quero me confessar."', cb: 'confess' },
    { id: 'donate',  label: '🪙 "Trouxe uma oferta ao Santuário."', cb: 'donate' },
    { id: 'leave',   label: '↩ "Volto outra hora, Padre."', cb: 'close' }
  ]
};

/* === SERVICE_DIALOGUES_TEMPLE — dialogues PADRAO_ALDRIC =============== */
var SERVICE_DIALOGUES_TEMPLE = {
  heal: {
    npc: {
      name: 'Irmã Elara',
      desc: 'Sacerdotisa · curandeira sênior do Templo',
      portrait: '../shared/img/npcs/irma-elara.png'
    },
    script: [
      { type: 'narration', text: 'Irmã Elara vem ao teu encontro com passos calmos. As vestes de linho azul-celeste — cor de céu antes do amanhecer — flutuam suaves contra o piso de mármore. Ela carrega uma bacia de água benta numa mão, e sob a outra, atadores de seda branca. Olhos castanhos quentes te observam com a paciência maternal de quem cura há décadas.' },
      { type: 'speech', speaker: 'Irmã Elara', text: 'Mostre-me onde dói, irmão. <i>(coloca a bacia sobre uma pedra plana, pega tua mão com firmeza gentil)</i> Os Quatro ouvem mesmo o suspiro do mais humilde — e a magia divina não pergunta dívidas antes de fluir. Cura Maior, dois dados de oito mais Sabedoria. PHB página duzentos e trinta.' }
    ],
    choices: [
      // task #64 (2026-05-20) — backend_cb canonical: temple_services.py:46 "temple_pay_<service>"
      // task #84 (2026-05-20): resultText específico por serviço — cohesão.
      { id: 'h_cure',  label: '❤️ Cure Wounds 1º · 30V · 1d8+3', cb: 'heal-confirm', backend_cb: 'temple_pay_heal',
        resultNarration: 'Irmã Elara coloca as mãos sobre teus ferimentos. Uma luz dourada e morna pulsa de suas palmas.',
        resultText: '"Os Quatro escutam." <i>(murmura prece de cura)</i> <b>+1d8+3 HP recuperado.</b> "Que o sangue circule e a carne se feche, em nome da Mãe-Auroral."' },
      { id: 'h_mass',  label: '❤️ Mass Cure 5º · 80V · 3d8+4 (6 alvos)', cb: 'heal-confirm', backend_cb: 'temple_pay_mass_cure',
        resultNarration: 'Irmã Elara ergue ambas as mãos. Uma onda dourada se expande do altar — atinge todos os feridos ao alcance.',
        resultText: '"Magia de quinto círculo, dom dos Quatro." <i>(voz firme em ritual)</i> <b>+3d8+4 HP em até 6 alvos. PHB p.207.</b> "Sejam todos restaurados — corpo, espírito, e o juramento que os trouxe aqui."' },
      { id: 'h_pray',  label: '🙏 Tentar prece pessoal · Religião DC 14', cb: 'dice:religion:14:+1' },
      { id: 'back',    label: '↩ "Outra hora."', cb: 'close' }
    ]
  },

  cure_poison: {
    npc: ALDRIC_DIALOGUE.npc,
    script: [
      { type: 'narration', text: 'Padre Aldric pede que te sentes no banco de pedra ao lado do altar. Ele acende ervas secas num pequeno braseiro de bronze — fumaça branca e adocicada se ergue, ondulando contra os vitrais. Murmura uma prece em língua antiga enquanto coloca a palma da mão sobre tua testa.' },
      { type: 'speech', speaker: 'Padre Aldric', text: 'Veneno é traição da natureza — o corpo se torna inimigo de si mesmo. <i>(traça o sinal sagrado em tua testa)</i> Purificação Menor, magia de segundo círculo, quarenta Valdoritas. Em cinco minutos, o veneno se torna mais leve que a fumaça. PHB página duzentos e quarenta e cinco.' }
    ],
    choices: [
      { id: 'p_pay',   label: '🧪 Pagar 40V — purificar veneno', cb: 'cure_poison-confirm', backend_cb: 'temple_pay_cure_poison',
        resultNarration: 'Padre Aldric ergue o braseiro acima de tua cabeça. A fumaça branca encurva-se ao redor — atraída pelo veneno em teu sangue.',
        resultText: '"Veneno purificado, em nome do Pai-da-Aurora." <i>(traça o sinal sagrado em tua testa)</i> <b>Condição Envenenado removida.</b> "Vai com cuidado — a próxima dose vai exigir mais que prata."' },
      { id: 'p_persuade', label: '💬 "Há quem pague isso?" · Persuasão DC 15', cb: 'dice:persuasion:15:+0' },
      { id: 'back',    label: '↩ "Outra hora."', cb: 'close' }
    ]
  },

  bless: {
    npc: {
      name: 'Acólito Theron',
      desc: 'Iniciado · três meses servindo o Templo',
      portrait: '../shared/img/npcs/acolito-theron.png'
    },
    script: [
      { type: 'narration', text: 'Theron tem dezesseis anos, talvez dezessete — magro, espinhento, vestido com manto branco de iniciado que ainda lhe fica largo nos ombros. Quando você se aproxima, ele endireita-se nervoso, força um sorriso forçado, e tenta parecer mais experiente do que é.' },
      { type: 'speech', speaker: 'Acólito Theron', text: 'B-bênção da Clareza, irmão! <i>(consulta um pergaminho dobrado, depois enrola apressado)</i> A Irmã Elara me ensinou ontem. Magia de primeiro círculo, concentração, vinte e cinco Valdoritas. Adiciona um dado de quatro a teus ataques e tuas salvaguardas, por um minuto. PHB página duzentos e dezenove.' }
    ],
    choices: [
      { id: 'b_pay',   label: '✨ Pagar 25V — Bênção (+1d4 atk/save 1min)', cb: 'bless-confirm', backend_cb: 'temple_pay_bless', renownDelta: 1,
        resultNarration: 'Theron sussurra a prece três vezes — uma pra cada Quatro menos o Silencioso. Uma luz pálida pousa sobre teus ombros.',
        resultText: '"P-pronto! <i>(suspira aliviado)</i> Pela primeira vez deu certo!" <b>+1d4 em ataques e salvaguardas por 1 minuto (até 3 rolagens). PHB p.219.</b>' },
      { id: 'b_guide', label: '✨ Orientação · 5V · +1d4 perícia única', cb: 'bless-confirm', backend_cb: 'temple_pay_guidance', renownDelta: 1,
        resultNarration: 'Theron passa o polegar úmido sobre tua testa, deixando um sinal que reluz brevemente.',
        resultText: '"O-orientação, irmão. <i>(pisca esperançoso)</i> Funciona uma vez só, depois passa. Mas funciona bem!" <b>+1d4 na próxima perícia que tentar. PHB p.248.</b>' },
      { id: 'b_persuade', label: '💬 "Bênção a um irmão?" · Persuasão DC 13', cb: 'dice:persuasion:13:+1' },
      { id: 'back',    label: '↩ "Outra hora."', cb: 'close' }
    ]
  },

  remove_curse: {
    npc: {
      name: 'Sacerdotisa Miriel',
      desc: 'Sacerdotisa · especialista em maldições e magia profunda',
      portrait: '../shared/img/npcs/sacerdotisa-miriel.png'
    },
    script: [
      { type: 'narration', text: 'Sacerdotisa Miriel não te recebe no salão principal — ela te conduz a uma câmara lateral selada por símbolos dourados. As paredes pulsam suavemente com runas em níveis quase imperceptíveis. Miriel tira o véu de prata da cabeça e olha direto nos teus olhos.' },
      { type: 'speech', speaker: 'Sacerdotisa Miriel', text: 'Maldição é parasita de alma. <i>(traça runas no ar com o indicador)</i> Remove Curse, terceiro círculo, noventa Valdoritas. Vai doer mais que o corte que a recebeu — mas em dez minutos serás livre. PHB página duzentos e quarenta e seis.' }
    ],
    choices: [
      { id: 'rc_pay', label: '🔮 Pagar 90V — Remove Curse', cb: 'remove_curse-confirm', backend_cb: 'temple_pay_remove_curse', renownDelta: 2,
        resultNarration: 'Miriel sela a câmara com runas douradas no chão. Tua pele formiga — depois queima. As runas pulsam em sincronia com teu coração.',
        resultText: '"Quem te amaldiçoou foi habilidoso, mas todo nó pode ser desfeito." <i>(traça o último símbolo)</i> <b>Maldição removida. PHB p.246.</b> "Cuida pra não cruzar com quem te marcou — segunda vez a magia custa o dobro."' },
      { id: 'rc_arcana', label: '📖 "Que tipo de maldição?" · Arcana DC 15', cb: 'dice:arcana:15:+2' },
      { id: 'back',   label: '↩ "Vou pensar."', cb: 'close' }
    ]
  },

  greater_restoration: {
    npc: {
      name: 'Sumo-Sacerdote Varek',
      desc: 'Sumo-Sacerdote · quarenta anos servindo os Quatro',
      portrait: '../shared/img/npcs/padre-aldric.png'
    },
    script: [
      { type: 'narration', text: 'Sumo-Sacerdote Varek aparece raramente no salão público — sua presença significa que algo grave foi pedido. Ele se aproxima do altar trazendo um cetro de prata e ônix. As vestes púrpura debruadas em fio de platina arrastam-se solenes contra o mármore.' },
      { type: 'speech', speaker: 'Sumo-Sacerdote Varek', text: 'Restauração Maior é magia de quinto círculo. <i>(ergue o cetro contra a luz dos vitrais)</i> Quatrocentas e cinquenta Valdoritas. Remove uma condição: exaustão, petrificação, maldição, encantamento, ou redução de atributo. Os Quatro não devolvem o que jamais foi tirado — apenas restauram o que ainda pode ser. PHB página duzentos e quarenta e seis.' }
    ],
    choices: [
      { id: 'gr_pay', label: '🌟 Pagar 450V — Greater Restoration', cb: 'greater_restoration-confirm', backend_cb: 'temple_pay_greater_restoration', renownDelta: 3,
        resultNarration: 'Varek ergue o cetro de prata e ônix ao alto. Os vitrais de cima da câmara reagem — luz colorida pousa em ti como manto de seda.',
        resultText: '"Os Quatro restauram o que ainda pode ser." <i>(toca tua fronte com o cetro)</i> <b>Uma condição removida: exaustão, petrificação, maldição, encantamento, ou redução de atributo. PHB p.246.</b> "Vai com cautela — magia desta ordem deixa marcas no espírito."' },
      { id: 'back',   label: '↩ "Vou ponderar."', cb: 'close' }
    ]
  },

  raise_dead: {
    npc: {
      name: 'Oráculo Orenthia',
      desc: 'Oráculo · vidente dos Quatro, comunica-se com o Plano dos Mortos',
      portrait: '../shared/img/npcs/sacerdotisa-miriel.png'
    },
    script: [
      { type: 'narration', text: 'Oráculo Orenthia espera-te na cripta sob o Templo. Velas de cera negra ardem em silêncio. Ela traz uma máscara de prata sem olhos — apenas duas fendas verticais por onde algo brilha. Seu vestido é de linho cinzento, sem ornamentos. Ela não fala alto — sua voz parece vir de longe.' },
      { type: 'speech', speaker: 'Oráculo Orenthia', text: 'Reviver os caídos é privilégio dos Quatro, não direito dos vivos. <i>(toca tua testa com dedos gélidos)</i> Mil Valdoritas. O corpo deve estar diante de mim, e a alma ainda não dispersa. O caído retorna com penalidade de menos quatro em todas as rolagens por quatro descansos longos — o preço de cruzar a porta duas vezes. PHB página duzentos e setenta.' }
    ],
    choices: [
      { id: 'rd_pay', label: '💀 Pagar 1000V — Raise Dead', cb: 'raise_dead-confirm', backend_cb: 'temple_pay_raise_dead', renownDelta: 5,
        resultNarration: 'Orenthia se posiciona sobre o corpo. As velas negras dobram a intensidade — então, súbito, todas se apagam ao mesmo tempo. Silêncio absoluto. Por meio segundo eternos.',
        resultText: '"Volta, irmão. <i>(voz dupla — a dela e algo mais)</i> O caminho ainda não terminou pra ti." <b>Personagem revive com 1 HP. Penalidade: -4 em todas as rolagens por 4 descansos longos. PHB p.270.</b> "Não fale do que viu lá. Os Quatro ouvem o que se diz."' },
      { id: 'rd_insight', label: '🔮 "Ela voltará... a mesma?" · Intuição DC 16', cb: 'dice:insight:16:+1' },
      { id: 'back',   label: '↩ "Não estou pronto."', cb: 'close' }
    ]
  },

  confess: {
    npc: ALDRIC_DIALOGUE.npc,
    script: [
      { type: 'narration', text: 'Padre Aldric te conduz à pequena sala de confissão atrás do altar. Apenas dois bancos de madeira escura, uma vela única, e um símbolo dos Quatro entalhado na parede. Ele se senta, fecha os olhos, espera. Quando finalmente falas, ele apenas escuta — paciente, sem julgar.' },
      { type: 'speech', speaker: 'Padre Aldric', text: 'Os Quatro já sabem, irmão. <i>(suspira longo)</i> Sempre souberam. A confissão não é pra eles, é pra ti. Vais carregar trinta dias de bênção — a alma mais leve faz teu corpo mais ágil. Vantagem em salvaguardas de Sabedoria. Três Valdoritas como oferta — ou dez, e o Santuário se lembrará de ti. Vai em paz.' }
    ],
    choices: [
      { id: 'c_pay',    label: '🕯️ Pagar 3V — Confissão (bênção 30 dias)', cb: 'confess-confirm', backend_cb: 'temple_pay_confess_humble', renownDelta: 1,
        resultNarration: 'Padre Aldric abençoa três velas — uma pra cada Quatro presente. Depois sopra a primeira pra liberar tua alma.',
        resultText: '"Vai em paz, irmão." <i>(traça o sinal sobre tua testa)</i> <b>Vantagem em salvaguardas de Sabedoria por 30 dias.</b> "Volta sempre que precisar — a porta do confessionário não se fecha pra ninguém."' },
      { id: 'c_donate', label: '💰 Pagar 10V — Confissão + reputação', cb: 'confess-confirm', backend_cb: 'temple_pay_confess_devout', renownDelta: 3,
        resultNarration: 'Padre Aldric abre o cofrinho do Santuário e deposita as moedas com gesto cuidadoso. Depois te abençoa com prece dobrada.',
        resultText: '"Tua oferta é lembrada, e tua alma, igual." <i>(faz o sinal duas vezes)</i> <b>Vantagem em saves WIS 30 dias + reconhecimento entre os clérigos. +3 Renown do Templo.</b> "O Sumo-Sacerdote saberá teu nome."' },
      { id: 'back',     label: '↩ "Outra hora."', cb: 'close' }
    ]
  },

  donate: {
    npc: {
      name: 'Acólito Theron',
      desc: 'Iniciado · responsável por receber oferendas hoje',
      portrait: '../shared/img/npcs/acolito-theron.png'
    },
    script: [
      { type: 'narration', text: 'Theron quase pula de empolgação quando você abre a bolsa. Ele segura um cesto de oferendas com as duas mãos, equilibrando-se pra que as moedas caiam direito. Os olhos brilham. Atrás dele, Irmã Elara sorri discretamente — é a primeira doação grande que Theron recebe sozinho.' },
      { type: 'speech', speaker: 'Acólito Theron', text: 'D-doações vão pra alimentar os pobres do bairro e manter as velas acesas, irmão! <i>(tenta soar profissional, mas a voz trai a empolgação)</i> E sobe tua reputação com o Santuário! A Irmã Elara me ensinou — quanto mais doas, mais os Quatro lembram do teu nome.' }
    ],
    choices: [
      { id: 'd_5',    label: '🪙 Doar 5V — oferta humilde', cb: 'donate-confirm', backend_cb: 'temple_pay_donate_5', renownDelta: 1,
        resultNarration: 'Theron coloca as cinco moedas no cesto e te dá um sorriso emocionado. Irmã Elara observa de longe, satisfeita.',
        resultText: '"Os pobres do bairro vão ter pão essa semana, irmão!" <i>(curva-se desajeitado)</i> <b>+1 Renown do Templo.</b> "Os Quatro lembrarão."' },
      { id: 'd_25',   label: '🪙 Doar 25V — oferta digna', cb: 'donate-confirm', backend_cb: 'temple_pay_donate_25', renownDelta: 2,
        resultNarration: 'Theron quase deixa o cesto cair quando as vinte e cinco moedas tilintam dentro. Irmã Elara aproxima-se, sorrindo discreta.',
        resultText: '"V-Vinte e cinco! <i>(emocionado)</i> Vai pagar o ferreiro de manter o sino da Capela em ordem por um ano!" <b>+2 Renown do Templo.</b>' },
      { id: 'd_100',  label: '🪙 Doar 100V — oferta generosa', cb: 'donate-confirm', backend_cb: 'temple_pay_donate_100', renownDelta: 5,
        resultNarration: 'Irmã Elara intervém pessoalmente — toca o braço de Theron com gentileza e assume o cesto. As cem Valdoritas brilham como rio de prata.',
        resultText: '"Cem Valdoritas. <i>(sorri com gratidão profunda)</i> Vossa Senhoria honra o Santuário. Os Quatro hão de lembrar — e o Sumo-Sacerdote, também." <b>+5 Renown do Templo. Acesso a serviços de tier superior desbloqueado.</b>' },
      { id: 'back',   label: '↩ "Outra hora."', cb: 'close' }
    ]
  }
};

/* === Backend cb → dialogue key map ====================================
 * Backend envia cb = "temple_interact_menu_npc_temple_<X>" (temple.py:224)
 * Mapeia npc_id → dialogue service key. */
var TEMPLE_CB_TO_DIALOGUE = {
  // Backend cb pattern (canonical via Bot)
  'temple_interact_menu_npc_temple_elara':     'heal',
  'temple_interact_menu_npc_temple_aldric':    'cure_poison',
  'temple_interact_menu_npc_temple_theron':    'bless',
  'temple_interact_menu_npc_temple_miriel':    'remove_curse',
  'temple_interact_menu_npc_temple_varek':     'greater_restoration',
  'temple_interact_menu_npc_temple_orenthia':  'raise_dead',
  // task #85 (2026-05-20): Simulador uses temple_dialogue_<sid> pattern.
  // Aliases pra rotear svc clicks direto pra PADRAO_ALDRIC em vez de cair
  // no legacy _showNpcDialoguePopup via ACTION_HANDLERS.
  'temple_dialogue_heal':                      'heal',
  'temple_dialogue_cure_poison':               'cure_poison',
  'temple_dialogue_bless':                     'bless',
  'temple_dialogue_remove_curse':              'remove_curse',
  'temple_dialogue_greater_restoration':       'greater_restoration',
  'temple_dialogue_raise_dead':                'raise_dead'
};

/* === Service icon meta ================================================== */
var TEMPLE_SVC_META = {
  'temple_interact_menu_npc_temple_elara':    { icon: '../shared/img/services/svc-cura.png',         meta: 'PHB p.230' },
  'temple_interact_menu_npc_temple_aldric':   { icon: '../shared/img/services/svc-pocoes.png',       meta: 'PHB p.245' },
  'temple_interact_menu_npc_temple_theron':   { icon: '../shared/img/services/svc-bencao.png',       meta: 'PHB p.219' },
  'temple_interact_menu_npc_temple_miriel':   { icon: '../shared/img/services/svc-bencao.png',       meta: 'PHB p.246' },
  'temple_interact_menu_npc_temple_varek':    { icon: '../shared/img/services/svc-bencao.png',       meta: 'PHB p.246' },
  'temple_interact_menu_npc_temple_orenthia': { icon: '../shared/img/services/svc-ressuscitar.png',  meta: 'PHB p.270' }
};

/* === Cenário canonical (PADRAO_TAVERNA — usa .cenario CSS classes) === */
function _tmpBuildCenario(data) {
  var cenarioEl = vCity.el('div', 'cenario');

  // Banner background
  var bg = vCity.el('img', 'cenario-bg');
  bg.src = '../shared/img/templo/templo-banner.png';
  bg.alt = '';
  bg.loading = 'lazy';
  bg.onerror = function(){ this.style.display = 'none'; };
  cenarioEl.appendChild(bg);

  // Candle glows (atmosfera)
  cenarioEl.appendChild(vCity.el('div', 'candle-glow l'));
  cenarioEl.appendChild(vCity.el('div', 'candle-glow r'));

  // Brasão (crest)
  var crest = vCity.el('img', 'cenario-brasao');
  crest.src = '../shared/img/templo/templo-crest.png';
  crest.alt = 'Brasão do Templo dos Quatro';
  crest.loading = 'lazy';
  crest.onerror = function(){ this.style.display = 'none'; };
  cenarioEl.appendChild(crest);

  // Título
  var titulo = vCity.el('div', 'cenario-titulo');
  var nameEl = vCity.el('div', 'name');
  nameEl.textContent = 'Templo dos Quatro';
  titulo.appendChild(nameEl);
  var subEl = vCity.el('div', 'sub');
  subEl.textContent = 'Santuário de Eldoria · Casa dos Deuses';
  titulo.appendChild(subEl);
  cenarioEl.appendChild(titulo);

  return cenarioEl;
}

/* === NPC row canonical (.row-npc — Padre Aldric main entry) =============== */
function _tmpBuildNpcRow(data) {
  var row = vCity.el('div', 'row-npc');

  // Portrait
  var portraitWrap = vCity.el('div', 'npc-portrait');
  var img = vCity.el('img');
  img.src = '../shared/img/npcs/padre-aldric.png';
  img.alt = 'Padre Aldric';
  img.loading = 'lazy';
  img.onerror = function(){ this.style.display = 'none'; };
  portraitWrap.appendChild(img);
  row.appendChild(portraitWrap);

  // Info (nome + quote)
  var info = vCity.el('div', 'npc-info');
  var name = vCity.el('div', 'name');
  name.textContent = 'Padre Aldric';
  info.appendChild(name);
  var quote = vCity.el('div', 'quote');
  quote.textContent = '"Bem-vindo ao Santuário dos Quatro, irmão."';
  info.appendChild(quote);
  row.appendChild(info);

  // Chevron
  var chev = vCity.el('div', 'npc-chev');
  chev.textContent = '›';
  row.appendChild(chev);

  // Click → open ALDRIC_DIALOGUE PADRAO_ALDRIC
  row.addEventListener('click', function(){
    if (typeof window.vEncounter === 'object' && window.vEncounter.render) {
      window._SVC_CONFIG = window._SVC_CONFIG_TEMPLE;
      window.vEncounter.render(ALDRIC_DIALOGUE, { dialogues: SERVICE_DIALOGUES_TEMPLE });
    }
  });

  return row;
}

/* === Reputation bar canonical (.rep-bar — D&D 5e Renown DMG p.22) ========== */
function _tmpBuildRepBar(data) {
  var renown = 0;
  if (data && data.renown && typeof data.renown.temple === 'number') renown = data.renown.temple;
  else if (window._PLAYER_RENOWN && typeof window._PLAYER_RENOWN.temple === 'number') renown = window._PLAYER_RENOWN.temple;

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

/* === Services canonical (.services + .svc PADRAO_TAVERNA) ================= */
function _tmpBuildServices(services) {
  var grid = vCity.el('div', 'services');
  (services || []).forEach(function(svc) {
    var card = vCity.el('div', 'svc');
    if (svc.disabled) card.classList.add('disabled');
    card.setAttribute('data-svc', svc.cb || '');

    var meta = TEMPLE_SVC_META[svc.cb] || {};

    // Badge (top-right — quest indicator)
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

    // Click → PADRAO_ALDRIC dialogue ou fallback vCity.act
    if (svc.cb && !svc.disabled) {
      card.addEventListener('click', function(){
        var dialogueKey = TEMPLE_CB_TO_DIALOGUE[svc.cb] || svc.cb;
        var dialogue = SERVICE_DIALOGUES_TEMPLE[dialogueKey];
        if (dialogue && typeof window.vEncounter === 'object' && window.vEncounter.render) {
          window._SVC_CONFIG = window._SVC_CONFIG_TEMPLE;
          window.vEncounter.render(dialogue, { dialogues: SERVICE_DIALOGUES_TEMPLE });
        } else if (typeof vCity.act === 'function') {
          console.warn('[TEMPLE] no dialogue mapped for cb=' + svc.cb + ', fallback vCity.act');
          vCity.act(svc.cb);
        }
      });
    }

    grid.appendChild(card);
  });
  return grid;
}

/* === renderTempleHub entry point ========================================== */
function renderTempleHub(container, data) {
  if (!container || !data) return;
  console.warn('[CITY-TEMPLE] renderTempleHub services=' + (data.services ? data.services.length : 0) + ' debt=' + (data.debt || 0));
  while (container.firstChild) container.removeChild(container.firstChild);

  var root = vCity.el('div', 'tmp-hub');

  /* 1. Cenário canonical (PADRAO_TAVERNA) */
  root.appendChild(_tmpBuildCenario(data));

  /* 2. Body container */
  var body = vCity.el('div', 'tmp-body');
  body.style.cssText = 'padding:8px 12px 0;display:flex;flex-direction:column;gap:7px;';

  /* 2a. NPC row (Padre Aldric main entry) */
  body.appendChild(_tmpBuildNpcRow(data));

  /* 2b. Reputation bar */
  body.appendChild(_tmpBuildRepBar(data));

  /* 2c. Debt alert (if active) */
  if (data.debt && data.debt > 0) {
    body.appendChild(vCity.statusAlert(
      'Dívida ativa: ' + data.debt + ' <span class="vi vi-coin sm"></span> — serviços bloqueados',
      'danger'
    ));
  }

  /* 2d. Pay Debt button (if debt + button data) */
  if (data.pay_debt && data.pay_debt.cb) {
    var pd = data.pay_debt;
    var payBtn = vCity.el('button', 'v-popup-btn v-popup-btn--primary tmp-pay-btn');
    if (pd.disabled) payBtn.classList.add('disabled');
    if (pd.icon) {
      var iconSpan = vCity.el('span', 'tmp-pay-icon');
      iconSpan.innerHTML = pd.icon + ' ';
      payBtn.appendChild(iconSpan);
    }
    var labelSpan = vCity.el('span', 'tmp-pay-label');
    labelSpan.textContent = pd.label || 'Pagar Dívida';
    payBtn.appendChild(labelSpan);
    if (pd.disabled) {
      var warn = vCity.el('span', 'tmp-pay-warn');
      warn.textContent = ' — Ouro insuficiente';
      payBtn.appendChild(warn);
    }
    (function(cb, disabled) {
      payBtn.addEventListener('click', function() {
        if (disabled) return;
        if (typeof doAction === 'function') doAction(cb);
      });
    })(pd.cb, !!pd.disabled);
    body.appendChild(payBtn);
  }

  /* 2e. Section label */
  var sectionLbl = vCity.el('div', 'pt-section-label');
  sectionLbl.textContent = '⚜ Serviços Sagrados ⚜';
  body.appendChild(sectionLbl);

  /* 2f. Services grid (PADRAO_TAVERNA canonical) */
  if (data.services && data.services.length) {
    body.appendChild(_tmpBuildServices(data.services));
  }

  /* 2g. Flavor text (after services) */
  if (data.flavor) {
    var flavor = vCity.el('div', 'tmp-flavor');
    flavor.textContent = vCity.stripTags(data.flavor);
    body.appendChild(flavor);
  }

  /* 2h. Downtime button */
  if (data.downtime) {
    var dtLbl = vCity.el('div', 'pt-section-label');
    dtLbl.textContent = '🙏 Atividade';
    body.appendChild(dtLbl);
    body.appendChild(vCity.serviceGrid([data.downtime]));
  }

  /* 2i. Wandering NPCs */
  if (data.wandering_npcs && data.wandering_npcs.length) {
    var wnLbl = vCity.el('div', 'pt-section-label');
    wnLbl.textContent = '🚶 Viajantes';
    body.appendChild(wnLbl);
    body.appendChild(vCity.actionList(data.wandering_npcs));
  }

  /* 2j. Gold balance */
  if (data.gold !== undefined) {
    body.appendChild(vCity.goldBalance(data.gold));
  }

  root.appendChild(body);
  container.appendChild(root);
}
