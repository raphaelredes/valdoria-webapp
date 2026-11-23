/* ============================================================================
 * npc-relations-data.js — NPC relations matrix + events timeline (pure data)
 * ============================================================================
 *
 * Sincronizado com src/game/social/inter_npc_relations.py (BASE_NPC_RELATIONS).
 * 66 NPCs canonicos, 290 arestas 100% simetricas (reciprocidade bidirecional).
 * ============================================================================ */

(function(){
  'use strict';

  window.NPC_IDS = [
      "aldric",
      "aldwin",
      "tavira",
      "braun",
      "vorhan",
      "martha",
      "grom",
      "miriel",
      "elara",
      "aldwynn",
      "theron",
      "garrick",
      "thorne",
      "thessil",
      "corvus",
      "velithra",
      "mirena",
      "bjorn",
      "garlen",
      "unique_survivor_wolves",
      "unique_survivor_blizzard",
      "unique_noble_exile",
      "unique_pilgrim_lost",
      "unique_orphan_doll",
      "unique_seer_blind",
      "unique_bard_broken",
      "unique_thief_repentant",
      "unique_wizard_failed",
      "unique_guard_veteran",
      "unique_gourmet",
      "unique_monk_peace",
      "unique_smith_apprentice",
      "unique_alchemist_student",
      "unique_hunter_traine",
      "unique_cleric_acolyte",
      "unique_baker_master",
      "unique_fisher_old",
      "unique_farmer_lost",
      "unique_miner_gold",
      "unique_woodcutter",
      "unique_gravedigger",
      "unique_librarian",
      "unique_painter_visionary",
      "unique_sculptor",
      "unique_dancer_exotic",
      "unique_juggler_fire",
      "unique_snake_charmer",
      "unique_illusionist",
      "unique_beast_tamer",
      "cook_berta",
      "fruit_seller",
      "carpenter",
      "street_urchin",
      "baker_greta",
      "old_sailor",
      "seamstress",
      "shrewd_beggar",
      "wandering_troubadour",
      "crippled_veteran",
      "apprentice_healer",
      "square_bounty_officer",
      "sylthara",
      "shadow_vulto",
      "lyra_bard",
      "olmiro",
      "eirik"
  ];

  window.NPC_DISPLAY_NAMES = {
      "aldric": "Guarda Aldric",
      "aldwin": "Aldwin de Tholram",
      "aldwynn": "Padre Aldwynn",
      "apprentice_healer": "Nyssa",
      "baker_greta": "Greta, a Padeira",
      "bjorn": "Bjorn",
      "braun": "Quartelmestre Braun",
      "carpenter": "Mestre Wenn",
      "cook_berta": "Berta",
      "corvus": "Corvus",
      "crippled_veteran": "Drax, o Veterano",
      "eirik": "Eirik",
      "elara": "Irmã Elara",
      "fruit_seller": "Tessa",
      "garlen": "Garlen",
      "garrick": "Mestre Garrick",
      "grom": "Grom, o Caolho",
      "lyra_bard": "Lyra Cantarriba",
      "martha": "Martha",
      "mirena": "Mirena",
      "miriel": "Sacerdotisa Miriel",
      "old_sailor": "Bram, o Marinheiro",
      "olmiro": "Olmiro, o Festeiro",
      "seamstress": "Lyra, a Costureira",
      "shadow_vulto": "O Vulto",
      "shrewd_beggar": "Kira",
      "square_bounty_officer": "Capitão Kaelen",
      "street_urchin": "Pequeno Pip",
      "sylthara": "Sylthara",
      "tavira": "Mestra Tavira",
      "theron": "Acólito Theron",
      "thessil": "Escriba Thessil",
      "thorne": "Thorne",
      "unique_alchemist_student": "Aprendiz Elgoran",
      "unique_baker_master": "Mestre Padeiro",
      "unique_bard_broken": "Soravel, o Triste",
      "unique_beast_tamer": "Domador Vordek",
      "unique_cleric_acolyte": "Acólito Theron",
      "unique_dancer_exotic": "Bailarina Solenne",
      "unique_farmer_lost": "Fazendeiro Tobren",
      "unique_fisher_old": "Velho do Rio",
      "unique_gourmet": "Korvian",
      "unique_gravedigger": "Coveiro Nathren",
      "unique_guard_veteran": "Capitão Draven",
      "unique_hunter_traine": "Caçadora Novata",
      "unique_illusionist": "Mistério",
      "unique_juggler_fire": "Pyros",
      "unique_librarian": "Bibliotecária Melvyn",
      "unique_miner_gold": "Garimpeiro Brask",
      "unique_monk_peace": "Thenlo",
      "unique_noble_exile": "Lord Valerius",
      "unique_orphan_doll": "Mina",
      "unique_painter_visionary": "Visionário Caelus",
      "unique_pilgrim_lost": "Irmão Silas",
      "unique_sculptor": "Escultor Halveg",
      "unique_seer_blind": "Velha Tessara",
      "unique_smith_apprentice": "Jovem Ferreiro",
      "unique_snake_charmer": "Encantador Sithek",
      "unique_survivor_blizzard": "Mara das Neves",
      "unique_survivor_wolves": "Ancião Kaelen",
      "unique_thief_repentant": "Mão Leve",
      "unique_wizard_failed": "Thumblen",
      "unique_woodcutter": "Lenhador Korven",
      "velithra": "Velithra",
      "vorhan": "Mestre Vorhan",
      "wandering_troubadour": "Olen, o Trovador"
  };

  window.NPC_RELATIONS = {
      "aldric": {
          "unique_guard_veteran": {
              "type": "peer",
              "strength": 0.85,
              "reveal_threshold": 1,
              "gossip": "Capitão Draven comanda as companhias regulares; nós cuidamos da barreira e do rastrilho. Disciplina nos portões salva a cidade."
          },
          "tavira": {
              "type": "peer",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "Tavira envia batedores da Guilda para limpar as rotas antes que os problemas cheguem à ponte levadiça."
          },
          "corvus": {
              "type": "peer",
              "strength": 0.7,
              "reveal_threshold": 1,
              "gossip": "Corvus traz cartas topográficas das trilhas que ajudam a antecipar emboscadas nas estradas."
          },
          "martha": {
              "type": "old_friend",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "Martha envia caldos quentes para as sentinelas da madrugada há vinte anos. Sem ela, a guarnição congelaria no inverno."
          },
          "thorne": {
              "type": "peer",
              "strength": 0.85,
              "reveal_threshold": 1,
              "gossip": "O armeiro Thorne é rigoroso na têmpera do aço. Nenhum escudo das sentinelas passa sem o crivo de sua forja."
          },
          "street_urchin": {
              "type": "mentor",
              "strength": 0.75,
              "reveal_threshold": 1,
              "gossip": "O garoto Pip tem pernas rápidas e coração bom. Mantenho-o longe de más companhias e ele me avisa de estranhos na entrada."
          },
          "shrewd_beggar": {
              "type": "peer",
              "strength": 0.65,
              "reveal_threshold": 1,
              "gossip": "Kira observa as esquinas com astúcia. Tolero sua presença na praça porque seus avisos sobre contrabandistas nunca falharam."
          },
          "crippled_veteran": {
              "type": "old_friend",
              "strength": 0.85,
              "reveal_threshold": 1,
              "gossip": "Drax marchou ao meu lado no cerco aos vales cinzentos. As feras da guerra cobraram caro, mas a lealdade dele permanece intacta."
          },
          "square_bounty_officer": {
              "type": "peer",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "Aldric coordena despachos com o Capitão Vane para conter bandos armados que se aproximam dos muros."
          },
          "sylthara": {
              "type": "peer",
              "strength": 0.7,
              "reveal_threshold": 1,
              "gossip": "Aldric respeita os limites do bosque protegido por Sylthara para não atrair a ira dos guardiões silvestres."
          }
      },
      "aldwin": {
          "vorhan": {
              "type": "debtor",
              "strength": 0.65,
              "reveal_threshold": 1,
              "gossip": "Vorhan organiza a Arena com bravura, mas atrasa a prestação de contas quando os custos de unguentos dos gladiadores sobem."
          },
          "tavira": {
              "type": "old_friend",
              "strength": 0.85,
              "reveal_threshold": 1,
              "gossip": "Tavira veio aqui antes da Guilda — uma aventureira de couro queimado e olhar de aço. Bom cliente. Pagava todas as dívidas no prazo."
          },
          "corvus": {
              "type": "creditor",
              "strength": 0.4,
              "reveal_threshold": 1,
              "gossip": "O livreiro Corvus deve à Casa de Tholram um empréstimo antigo. Educado, mas o atraso preocupa."
          },
          "garrick": {
              "type": "peer",
              "strength": 0.6,
              "reveal_threshold": 1,
              "gossip": "Mestre Garrick deposita o lucro semanal aqui. Anão prudente — sabe que ouro vale mais guardado que gasto."
          },
          "unique_noble_exile": {
              "type": "creditor",
              "strength": 0.65,
              "reveal_threshold": 1,
              "gossip": "Lord Valerius teve as contas de sua linhagem congeladas após o exílio. Uma tragédia aristocrática."
          },
          "unique_miner_gold": {
              "type": "peer",
              "strength": 0.75,
              "reveal_threshold": 1,
              "gossip": "O garimpeiro Brask deposita pepitas brutas no cofre. Trabalho árduo e honesto."
          },
          "shadow_vulto": {
              "type": "rival",
              "strength": 0.4,
              "reveal_threshold": 1,
              "gossip": "Aldwin desaprova a circulação clandestina de mercadorias que foge aos tributos municipais do banco."
          }
      },
      "tavira": {
          "aldric": {
              "type": "peer",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "Guarda Aldric é a sentinela dos portões. Se ele diz que a estrada está fechada, nenhum aventureiro meu sai sem reforço."
          },
          "aldwin": {
              "type": "old_friend",
              "strength": 0.85,
              "reveal_threshold": 1,
              "gossip": "Aldwin? Conheci antes da Casa de Tholram ter aquele nome. Velho. Mantém memórias mais firmes que os números."
          },
          "braun": {
              "type": "peer",
              "strength": 0.9,
              "reveal_threshold": 1,
              "gossip": "Braun? Meu quartelmestre desde a primeira missão. Confio nele com o estoque mais que com minha sombra."
          },
          "vorhan": {
              "type": "rival",
              "strength": 0.7,
              "reveal_threshold": 1,
              "gossip": "O Vorhan da Arena? Já fomos parceiros num contrato no norte. Ele venceu a aposta — eu nunca paguei."
          },
          "unique_guard_veteran": {
              "type": "peer",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "Capitão Draven mantém os portões seguros para nossos aventureiros partirem e voltarem em paz."
          },
          "unique_bard_broken": {
              "type": "peer",
              "strength": 0.6,
              "reveal_threshold": 1,
              "gossip": "Soravel cantava as marchas da Guilda antes da tragédia do dragão. Espero que recupere sua melodia."
          },
          "unique_painter_visionary": {
              "type": "peer",
              "strength": 0.7,
              "reveal_threshold": 1,
              "gossip": "O pintor capturou o espírito das nossas expedições no mural do salão. A coragem dos aventureiros merece ser lembrada."
          },
          "unique_sculptor": {
              "type": "peer",
              "strength": 0.75,
              "reveal_threshold": 1,
              "gossip": "As gárgulas que o escultor entalhou para nosso pórtico vigiam a entrada da Guilda com a firmeza de sentinelas de pedra."
          },
          "unique_dancer_exotic": {
              "type": "peer",
              "strength": 0.7,
              "reveal_threshold": 1,
              "gossip": "A arte dos palcos itinerantes mantém viva a esperança nos entrepostos. A Guilda sempre protegerá a passagem de artistas."
          },
          "unique_juggler_fire": {
              "type": "peer",
              "strength": 0.7,
              "reveal_threshold": 1,
              "gossip": "O malabarista de fogo anima nossos banquetes de retorno. Ver as tochas girando no ar espanta as sombras dos ermos."
          },
          "unique_snake_charmer": {
              "type": "peer",
              "strength": 0.7,
              "reveal_threshold": 1,
              "gossip": "O encantador de serpentes respeita o perímetro da praça e extrai venenos úteis para nossos antídotos."
          },
          "carpenter": {
              "type": "peer",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "Mestre Wenn prepara hastes de carvalho e suportes de armas para a Guilda. Uma lança com cabo entalhado por ele nunca racha na estocada."
          },
          "wandering_troubadour": {
              "type": "peer",
              "strength": 0.75,
              "reveal_threshold": 1,
              "gossip": "Olen canta as façanhas das comitivas que voltam dos ermos. Boa publicidade para atrair andarilhos corajosos para nossos editais."
          },
          "square_bounty_officer": {
              "type": "peer",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "Tavira alinha os editais de caçada da guilda com as ordens de segurança expedidas pela milícia."
          }
      },
      "braun": {
          "tavira": {
              "type": "peer",
              "strength": 0.9,
              "reveal_threshold": 1,
              "gossip": "A Mestra é dura — mas justa. Devolveu para a Guilda mais do que tomou. Eu sigo onde ela manda."
          },
          "vorhan": {
              "type": "old_friend",
              "strength": 0.75,
              "reveal_threshold": 1,
              "gossip": "Vorhan? Outro meio-orc nesta cidade. Lutamos no Norte juntos. Cicatrizes iguais."
          },
          "unique_woodcutter": {
              "type": "peer",
              "strength": 0.7,
              "reveal_threshold": 1,
              "gossip": "Lenhador Korven garante o suprimento de madeira para as fortificações e carretas da Guilda."
          }
      },
      "vorhan": {
          "aldwin": {
              "type": "creditor",
              "strength": 0.65,
              "reveal_threshold": 1,
              "gossip": "Aldwin quer juros sobre o sangue da areia. Quem sangra na arena precisa de médico antes de pagar comissão bancária."
          },
          "tavira": {
              "type": "rival",
              "strength": 0.7,
              "reveal_threshold": 1,
              "gossip": "A Mestra me deve uma aposta. Vinte Valdoritas. Cobro toda vez que ela aparece."
          },
          "braun": {
              "type": "old_friend",
              "strength": 0.75,
              "reveal_threshold": 1,
              "gossip": "Braun? Sangue dos Sete Picos. Já o vi quebrar um trasgo com a mão esquerda. Confio nele."
          },
          "grom": {
              "type": "peer",
              "strength": 0.6,
              "reveal_threshold": 1,
              "gossip": "Grom serve uma bebida forte na taverna. Não pergunta de onde vêm os ferimentos, apenas enche a caneca."
          },
          "unique_guard_veteran": {
              "type": "old_friend",
              "strength": 0.75,
              "reveal_threshold": 1,
              "gossip": "Draven é aço puro. Já marchamos lado a lado antes de eu assumir a arena."
          },
          "unique_monk_peace": {
              "type": "rival",
              "strength": 0.5,
              "reveal_threshold": 1,
              "gossip": "Aquele monge Thenlo senta perto da arena e prega paz. Respeito sua disciplina, mas o ferro fala mais alto."
          },
          "unique_juggler_fire": {
              "type": "peer",
              "strength": 0.7,
              "reveal_threshold": 1,
              "gossip": "Aquele malabarista abre os espetáculos noturnos do coliseu com tochas cruzadas. O homem tem pulso firme e sabe lidar com labaredas."
          },
          "unique_beast_tamer": {
              "type": "peer",
              "strength": 0.75,
              "reveal_threshold": 1,
              "gossip": "O domador entende o instinto das feras melhor que muito guerreiro. Ajuda a acalmar os mastins dos fossos quando o sangue ferve."
          },
          "crippled_veteran": {
              "type": "old_friend",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "Drax sangrou nas trincheiras e ainda tem o olhar firme de um combatente. Tem lugar de honra reservado na primeira fileira da Arena."
          }
      },
      "martha": {
          "grom": {
              "type": "rival",
              "strength": 0.55,
              "reveal_threshold": 1,
              "gossip": "Aquele caolho da taverna rouba meus hóspedes para o hidromel barato. Mas minha sopa é inegavelmente melhor."
          },
          "aldwynn": {
              "type": "old_friend",
              "strength": 0.7,
              "reveal_threshold": 1,
              "gossip": "Padre Aldwynn vem aqui aos domingos. Sopa quente e silêncio reconfortante. Bom homem."
          },
          "aldric": {
              "type": "old_friend",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "O Guarda Aldric cuida dos portões faça chuva ou faça sol. Minha sopa quente é o mínimo para quem passa as noites de vigília."
          },
          "unique_orphan_doll": {
              "type": "mentor",
              "strength": 0.9,
              "reveal_threshold": 1,
              "gossip": "A pequena Mina precisa de um teto e comida quente. Enquanto eu estiver de pé, ninguém a deixará desamparada."
          },
          "unique_survivor_blizzard": {
              "type": "old_friend",
              "strength": 0.75,
              "reveal_threshold": 1,
              "gossip": "Mara ainda treme ao lembrar das montanhas. O caldo quente da minha lareira é o único que aquece seu peito."
          },
          "unique_baker_master": {
              "type": "peer",
              "strength": 0.85,
              "reveal_threshold": 1,
              "gossip": "O Mestre Padeiro me entrega pães de centeio frescos toda manhã. Sem ele, o café da estalagem seria pobre."
          },
          "unique_fisher_old": {
              "type": "peer",
              "strength": 0.75,
              "reveal_threshold": 1,
              "gossip": "O velho pescador traz peixes limpos do rio ao entardecer. Bom parceiro de longa data."
          },
          "unique_gourmet": {
              "type": "rival",
              "strength": 0.65,
              "reveal_threshold": 1,
              "gossip": "Korvian critica meu tempero rústico, mas quando a barriga aperta é a minha sopa que ele pede."
          },
          "unique_survivor_wolves": {
              "type": "old_friend",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "Aquele andarilho sobreviveu à matilha nas montanhas. Um prato quente e silêncio curam mais que sermão."
          },
          "unique_bard_broken": {
              "type": "old_friend",
              "strength": 0.75,
              "reveal_threshold": 1,
              "gossip": "O bardo perdeu o ritmo de sua música nas estradas frias. Aqui na estalagem ele sempre tem água fresca e respeito."
          },
          "unique_farmer_lost": {
              "type": "peer",
              "strength": 0.75,
              "reveal_threshold": 1,
              "gossip": "O camponês traz abóboras e trigo moído da melhor qualidade. Mesmo em tempos de geada, honro suas sacas."
          },
          "unique_painter_visionary": {
              "type": "peer",
              "strength": 0.75,
              "reveal_threshold": 1,
              "gossip": "A tela que o pintor me deu ilumina o refeitório com as cores do pôr do sol. Arte honesta faz bem à alma dos viajantes."
          },
          "unique_dancer_exotic": {
              "type": "peer",
              "strength": 0.75,
              "reveal_threshold": 1,
              "gossip": "A dançarina traz alegria ao nosso pátio nas tardes ensolaradas. Os hóspedes descansam felizes com a música dela."
          },
          "cook_berta": {
              "type": "peer",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "Berta tem um coração de ouro. Sempre que sobram caldos e pães na estalagem, mando para as panelas comunitárias dela na praça."
          },
          "seamstress": {
              "type": "peer",
              "strength": 0.75,
              "reveal_threshold": 1,
              "gossip": "Lyra cuida dos lençóis e tapeçarias da estalagem com pontos firmes. Trabalho impecável e honesto."
          },
          "wandering_troubadour": {
              "type": "peer",
              "strength": 0.7,
              "reveal_threshold": 1,
              "gossip": "Olen traz baladas antigas para a lareira nas noites frias. Os hóspedes pedem mais cerveja e esquecem o cansaço da marcha."
          },
          "street_urchin": {
              "type": "peer",
              "strength": 0.75,
              "reveal_threshold": 1,
              "gossip": "O pequeno Pip entrega recados rápidos entre a estalagem e o mercado. Sempre guardo um prato de ensopado fumegante para ele."
          },
          "lyra_bard": {
              "type": "peer",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "Martha convida Lyra para cantar na lareira da estalagem nas noites frias, retribuindo com farto ensopado."
          },
          "olmiro": {
              "type": "peer",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "Martha fornece tortas e assados coloniais para as feiras e festejos organizados por Olmiro."
          }
      },
      "grom": {
          "martha": {
              "type": "rival",
              "strength": 0.55,
              "reveal_threshold": 1,
              "gossip": "Martha cobra o triplo por cama de palha. Aqui um bom barril resolve dor e sono."
          },
          "vorhan": {
              "type": "peer",
              "strength": 0.6,
              "reveal_threshold": 1,
              "gossip": "O campeão da Arena bebe aqui de vez em quando. Paga em ouro de aposta ganha. Quieto para um guerreiro."
          },
          "unique_baker_master": {
              "type": "peer",
              "strength": 0.7,
              "reveal_threshold": 1,
              "gossip": "Os pães salgados do Mestre Padeiro ajudam a vender mais hidromel. Troca justa de balcão."
          },
          "unique_hunter_traine": {
              "type": "peer",
              "strength": 0.6,
              "reveal_threshold": 1,
              "gossip": "A jovem caçadora vem aqui ouvir relatos dos ermos. Tem coragem, falta calejamento."
          },
          "unique_gourmet": {
              "type": "peer",
              "strength": 0.65,
              "reveal_threshold": 1,
              "gossip": "O mestre de paladar fino veio reclamar da cerveja, mas bebeu o caneco inteiro. Disse que meu hidromel defumado tem caráter."
          },
          "baker_greta": {
              "type": "peer",
              "strength": 0.75,
              "reveal_threshold": 1,
              "gossip": "O pão de centeio da Greta é denso e sustenta os fregueses. Fornada limpa, sem enrolação."
          },
          "old_sailor": {
              "type": "old_friend",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "Bram senta no canto do balcão toda noite de neblina. Já perdeu muito no mar bravio, mas tem causos que deixam a taverna em silêncio."
          },
          "cook_berta": {
              "type": "peer",
              "strength": 0.7,
              "reveal_threshold": 1,
              "gossip": "Berta faz maravilhas com os ossos e sobras defumadas do meu javali. Ninguém na praça passa aperto enquanto a panela dela chiar."
          },
          "wandering_troubadour": {
              "type": "peer",
              "strength": 0.7,
              "reveal_threshold": 1,
              "gossip": "Olen sabe como animar a caneca dos estivadores. Quando ele puxa o alaúde, o barril seca duas vezes mais rápido."
          },
          "shadow_vulto": {
              "type": "wary",
              "strength": 0.5,
              "reveal_threshold": 1,
              "gossip": "Grom tolera a presença sombria no beco dos fundos desde que nenhuma lâmina seja desembainhada sob seu teto."
          },
          "lyra_bard": {
              "type": "old_friend",
              "strength": 0.85,
              "reveal_threshold": 1,
              "gossip": "Grom aprecia a presença de Lyra na taverna; suas canções acalmam os ânimos exaltados e aumentam os brindes."
          }
      },
      "miriel": {
          "aldwynn": {
              "type": "mentor",
              "strength": 0.85,
              "reveal_threshold": 1,
              "gossip": "Padre Aldwynn é a coluna de serenidade deste templo. Sua paciência ancora o santuário contra as tempestades do mundo."
          },
          "theron": {
              "type": "peer",
              "strength": 0.7,
              "reveal_threshold": 1,
              "gossip": "O noviço Theron aprende a liturgia sob minha guarda. Tem zelo, mas precisa de firmeza nas mãos."
          },
          "elara": {
              "type": "peer",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "A doçura de Elara ampara os enfermos onde meu rigor litúrgico às vezes soa distante. Somos duas mãos do mesmo altar."
          }
      },
      "elara": {
          "aldwynn": {
              "type": "mentor",
              "strength": 0.9,
              "reveal_threshold": 1,
              "gossip": "Padre Aldwynn foi quem me acolheu na fé. Sua paciência ensina mais que mil sermões solenes."
          },
          "miriel": {
              "type": "peer",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "Sacerdotisa Miriel veio do Sul. Rígida e disciplinada — mas cura com devoção incomparável."
          },
          "theron": {
              "type": "mentor",
              "strength": 0.7,
              "reveal_threshold": 1,
              "gossip": "O pequeno Theron tem bom coração. Irá longe se aprender a dominar sua ansiedade."
          },
          "unique_orphan_doll": {
              "type": "mentor",
              "strength": 0.85,
              "reveal_threshold": 1,
              "gossip": "A pequenina Mina é uma centelha inocente. Ilumino suas preces todos os dias com bênçãos protetoras."
          },
          "unique_pilgrim_lost": {
              "type": "old_friend",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "Irmão Silas sobreviveu à tempestade pela graça da fé. O Templo sempre acolherá seus passos."
          },
          "unique_monk_peace": {
              "type": "peer",
              "strength": 0.75,
              "reveal_threshold": 1,
              "gossip": "Thenlo busca a quietude do espírito assim como nós. Suas palavras trazem serenidade à praça."
          },
          "unique_cleric_acolyte": {
              "type": "mentor",
              "strength": 0.85,
              "reveal_threshold": 1,
              "gossip": "O jovem acólito cuida das flores e do altar com devoção pura. Vejo nele a continuação da nossa missão de consolo."
          },
          "apprentice_healer": {
              "type": "mentor",
              "strength": 0.9,
              "reveal_threshold": 1,
              "gossip": "Nyssa tem mãos suaves e dedicação sincera aos feridos. Ensino-lhe os segredos dos bálsamos e a compaixão da fé nos Quatro."
          },
          "sylthara": {
              "type": "peer",
              "strength": 0.85,
              "reveal_threshold": 1,
              "gossip": "Elara e Sylthara mantêm intercâmbio de ervas raras de cura e infusões que purificam febres das estradas."
          }
      },
      "aldwynn": {
          "miriel": {
              "type": "peer",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "Sacerdotisa Miriel traz a têmpera inquebrantável do Sul. Seu rigor litúrgico complementa a doçura da Irmã Elara."
          },
          "elara": {
              "type": "mentor",
              "strength": 0.9,
              "reveal_threshold": 1,
              "gossip": "Irmã Elara cresceu com retidão na fé. Hoje ilumina os caminhos onde eu apenas contemplo."
          },
          "martha": {
              "type": "old_friend",
              "strength": 0.7,
              "reveal_threshold": 1,
              "gossip": "Martha alimenta corpo e alma dos cansados da estrada. Domingos sem a sopa dela seriam vazios."
          },
          "unique_pilgrim_lost": {
              "type": "mentor",
              "strength": 0.85,
              "reveal_threshold": 1,
              "gossip": "Silas carrega as marcas do deserto e da dúvida. Acompanho suas orações para restaurar sua crença."
          },
          "unique_cleric_acolyte": {
              "type": "mentor",
              "strength": 0.85,
              "reveal_threshold": 1,
              "gossip": "Theron serve ao altar com dedicação sincera. A juventude dele renova este santuário."
          },
          "unique_thief_repentant": {
              "type": "mentor",
              "strength": 0.7,
              "reveal_threshold": 1,
              "gossip": "Mão Leve encontrou remorso sincero. O caminho do arrependimento é mais duro que o do pecado."
          },
          "unique_gravedigger": {
              "type": "peer",
              "strength": 0.75,
              "reveal_threshold": 1,
              "gossip": "Coveiro Nathren cuida dos jazigos com o silêncio e o respeito que os ancestrais merecem."
          },
          "unique_seer_blind": {
              "type": "rival",
              "strength": 0.7,
              "reveal_threshold": 1,
              "gossip": "Cassia vê sombras e presságios na poeira da praça. Rezo para que sua visão não atraia desespero desnecessário sobre os fiéis."
          },
          "theron": {
              "type": "mentor",
              "strength": 0.85,
              "reveal_threshold": 1,
              "gossip": "O noviço Theron carrega a dedicação da juventude. Seus passos no santuário me lembram de quando cheguei a Valdoria."
          },
          "eirik": {
              "type": "peer",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "Aldwynn e Eirik preservam os registros dos patronos divinos e as bênçãos rúnicas inscritas nos altares."
          }
      },
      "theron": {
          "aldwynn": {
              "type": "mentor",
              "strength": 0.85,
              "reveal_threshold": 1,
              "gossip": "Padre Aldwynn é a coluna de serenidade deste templo. Sua paciência ancora o santuário contra as tempestades do mundo."
          },
          "miriel": {
              "type": "mentor",
              "strength": 0.6,
              "reveal_threshold": 1,
              "gossip": "Sacerdotisa Miriel é severa, mas ensina coragem genuína diante da dor."
          },
          "elara": {
              "type": "mentor",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "Irmã Elara me guia com carinho. Espero honrar os ensinamentos dela."
          },
          "unique_cleric_acolyte": {
              "type": "peer",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "Compartilho as vigílias e o cuidado com as velas sagradas com Theron."
          }
      },
      "garrick": {
          "thorne": {
              "type": "mentor",
              "strength": 0.85,
              "reveal_threshold": 1,
              "gossip": "Thorne foi meu aprendiz por sete invernos. Hoje tem tenda no Mercado — a marca do meu martelo vive nas peças dele."
          },
          "aldwin": {
              "type": "peer",
              "strength": 0.6,
              "reveal_threshold": 1,
              "gossip": "Banqueiro Aldwin guarda o ouro da forja. Confio na palavra dele mais que na de nobres."
          },
          "unique_survivor_wolves": {
              "type": "old_friend",
              "strength": 0.85,
              "reveal_threshold": 1,
              "gossip": "Ancião Kaelen perdeu sua forja para as feras gélidas. Conheço o peso de ver o trabalho de uma vida virar cinzas."
          },
          "unique_smith_apprentice": {
              "type": "mentor",
              "strength": 0.9,
              "reveal_threshold": 1,
              "gossip": "O jovem tem pulso firme e vontade de aprender. Se não quebrar o braço antes da hora, será um grande ferreiro."
          },
          "unique_miner_gold": {
              "type": "peer",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "Brask extrai o minério mais puro das montanhas. Cada lâmina minha agradece ao aço que ele desenterra."
          },
          "unique_woodcutter": {
              "type": "peer",
              "strength": 0.75,
              "reveal_threshold": 1,
              "gossip": "Korven fornece carvão e lenha dura para manter as brasas vivas dia e noite."
          },
          "unique_sculptor": {
              "type": "peer",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "O escultor entende de peso e corte no granito. Forjo os cinzéis dele com aço enriquecido para não lascarem na pedra."
          },
          "garlen": {
              "type": "peer",
              "strength": 0.75,
              "reveal_threshold": 1,
              "gossip": "Garlen entende de couro curtido e reforço de malha. Forneço rebites e fivelas de aço para suas couraças."
          },
          "carpenter": {
              "type": "peer",
              "strength": 0.85,
              "reveal_threshold": 1,
              "gossip": "Wenn entende de veios de carvalho tão bem quanto entendo de veios de ferro. Ferro e madeira juntos fazem carroças e pontes eternas."
          }
      },
      "thorne": {
          "garrick": {
              "type": "mentor",
              "strength": 0.85,
              "reveal_threshold": 1,
              "gossip": "Mestre Garrick ensinou tudo o que sei sobre têmpera. Minha banca no Mercado é a extensão da bigorna dele."
          },
          "aldric": {
              "type": "peer",
              "strength": 0.85,
              "reveal_threshold": 1,
              "gossip": "Aldric conhece cada pedra dos portões melhor do que qualquer oficial. Veterano leal e indispensável."
          },
          "unique_guard_veteran": {
              "type": "peer",
              "strength": 0.75,
              "reveal_threshold": 1,
              "gossip": "Capitão Draven inspeciona o armamento das patrulhas na minha banca. Parceria antiga e respeitosa."
          },
          "carpenter": {
              "type": "peer",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "Wenn fornece o freixo e o carvalho mais secos do vale para os fustes de bestas e cabos de machado da minha forja."
          },
          "baker_greta": {
              "type": "peer",
              "strength": 0.7,
              "reveal_threshold": 1,
              "gossip": "Consertei a porta da fornalha da Greta mês passado. Forno bom exige ferro grosso e solda limpa."
          }
      },
      "thessil": {
          "corvus": {
              "type": "rival",
              "strength": 0.5,
              "reveal_threshold": 1,
              "gossip": "Corvus guarda tomos cujas runas nem ele ousa pronunciar. Desconfio dos seus motivos, mas não do seu acervo."
          },
          "unique_librarian": {
              "type": "peer",
              "strength": 0.85,
              "reveal_threshold": 1,
              "gossip": "Melvyn e eu cruzamos catálogos rúnicos há décadas. O arquivo dela guarda tesouros esquecidos."
          },
          "unique_seer_blind": {
              "type": "peer",
              "strength": 0.7,
              "reveal_threshold": 1,
              "gossip": "Velha Tessara enxerga padrões onde outros só veem névoa. Suas visões coincidem com certas profecias rúnicas."
          },
          "unique_wizard_failed": {
              "type": "mentor",
              "strength": 0.6,
              "reveal_threshold": 1,
              "gossip": "Thumblen tem talento caótico sem ancoragem teórica. Se ele estudasse runas antes de atear fogo em si mesmo, seria brilhante."
          },
          "unique_noble_exile": {
              "type": "peer",
              "strength": 0.75,
              "reveal_threshold": 1,
              "gossip": "Lord Valerius ainda preserva medalhões com heráldica e runas protetoras de sua linhagem ancestral."
          },
          "unique_illusionist": {
              "type": "peer",
              "strength": 0.7,
              "reveal_threshold": 1,
              "gossip": "O ilusionista brinca com luz e reflexos na praça. Seus truques me fazem sorrir enquanto estudo as runas ancestrais."
          },
          "sylthara": {
              "type": "peer",
              "strength": 0.7,
              "reveal_threshold": 1,
              "gossip": "Thessil consulta a druida sobre a ressonância das correntes telúricas que cruzam o subsolo da cidade."
          },
          "eirik": {
              "type": "peer",
              "strength": 0.85,
              "reveal_threshold": 1,
              "gossip": "Thessil e Eirik transcrevem juntos fragmentos de estelas rúnicas e tabuletas arcanas no santuário."
          }
      },
      "corvus": {
          "thessil": {
              "type": "rival",
              "strength": 0.5,
              "reveal_threshold": 1,
              "gossip": "Thessil teme páginas antigas cujo poder não consegue domesticar. Um erudito prudente demais."
          },
          "aldwin": {
              "type": "creditor",
              "strength": 0.4,
              "reveal_threshold": 1,
              "gossip": "Tenho uma pendência antiga na Casa de Tholram. Honrarei o valor assim que vender tomos suficientes."
          },
          "unique_thief_repentant": {
              "type": "rival",
              "strength": 0.75,
              "reveal_threshold": 1,
              "gossip": "Mão Leve sabe onde certas gazuas foram forjadas. É sábio manter silêncio sobre segredos passados."
          },
          "unique_noble_exile": {
              "type": "peer",
              "strength": 0.6,
              "reveal_threshold": 1,
              "gossip": "Lord Valerius possui um brasão decadente que atrai colecionadores. O infortúnio alheio sempre gera páginas raras."
          },
          "unique_librarian": {
              "type": "rival",
              "strength": 0.65,
              "reveal_threshold": 1,
              "gossip": "Melvyn protege os arquivos da cidade como uma leoa. Meus compradores pagariam fortunas por certos tomos que ela tranca."
          },
          "aldric": {
              "type": "peer",
              "strength": 0.7,
              "reveal_threshold": 1,
              "gossip": "O Guarda Aldric me consulta antes de enviar patrulhas para as trilhas do leste. Batedor que sabe ler relevo não morre em emboscada."
          },
          "unique_seer_blind": {
              "type": "peer",
              "strength": 0.7,
              "reveal_threshold": 1,
              "gossip": "Cassia percebe contornos de acontecimentos antes mesmo de a tinta secar nos meus mapas. Há verdades que os olhos físicos não alcançam."
          },
          "unique_illusionist": {
              "type": "peer",
              "strength": 0.65,
              "reveal_threshold": 1,
              "gossip": "O ilusionista comprou um espelho com prisma óptico na minha loja. Ele compreende refrações que a maioria dos tolos chama de bruxaria."
          },
          "old_sailor": {
              "type": "peer",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "Bram navegou pela costa dos corais e pelas bocas do estuário. Os registros de maré dele completam minhas cartas costeiras."
          },
          "street_urchin": {
              "type": "peer",
              "strength": 0.7,
              "reveal_threshold": 1,
              "gossip": "Pip corre com meus rolos de pergaminho entre as oficinas sem amassar um único selo de cera. Garoto pontual."
          },
          "shrewd_beggar": {
              "type": "peer",
              "strength": 0.65,
              "reveal_threshold": 1,
              "gossip": "Kira acha moedas cunhadas em dinastias mortas em bueiros e entulhos antigos. Pago justo por qualquer relíquia legível."
          },
          "shadow_vulto": {
              "type": "peer",
              "strength": 0.65,
              "reveal_threshold": 1,
              "gossip": "Corvus pesquisa anotações obscuras sobre as galerias antigas por onde o Vulto transita sem ser visto."
          },
          "eirik": {
              "type": "peer",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "Corvus recorre a Eirik para decifrar inscrições antigas gravadas em marcos de pedra encontrados nas estradas."
          }
      },
      "velithra": {
          "mirena": {
              "type": "rival",
              "strength": 0.6,
              "reveal_threshold": 1,
              "gossip": "Mirena insiste que chapas pesadas são a única proteção. Meus elixires salvam onde o ferro dobra."
          },
          "unique_alchemist_student": {
              "type": "mentor",
              "strength": 0.85,
              "reveal_threshold": 1,
              "gossip": "Elgoran tem curiosidade febril. Já quase destruiu minhas retortas três vezes, mas a intuição alquímica dele é rara."
          },
          "unique_wizard_failed": {
              "type": "peer",
              "strength": 0.6,
              "reveal_threshold": 1,
              "gossip": "Thumblen compra reagentes voláteis com frequência suspeita. Cobro adiantado para cobrir eventuais vidrarias quebradas."
          },
          "unique_snake_charmer": {
              "type": "peer",
              "strength": 0.75,
              "reveal_threshold": 1,
              "gossip": "O veneno fresco que ele extrai das víboras é a base dos antídotos mais potentes que destilo no meu caldeirão."
          }
      },
      "mirena": {
          "velithra": {
              "type": "rival",
              "strength": 0.6,
              "reveal_threshold": 1,
              "gossip": "Velithra confia em frascos de vidro. Uma lâmina veloz quebra o vidro antes do gole. Aço é certeza."
          },
          "unique_farmer_lost": {
              "type": "peer",
              "strength": 0.6,
              "reveal_threshold": 1,
              "gossip": "Fazendeiro Tobren precisa de tecidos resistentes para o trabalho no campo. Sempre dou um desconto justo."
          },
          "fruit_seller": {
              "type": "peer",
              "strength": 0.75,
              "reveal_threshold": 1,
              "gossip": "Tessa escolhe cítricos e bagas frescas que uso na destilação de elixires de resistência. Matéria-prima sempre limpa."
          },
          "apprentice_healer": {
              "type": "peer",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "A jovem Nyssa busca comigo tinturas e calêndula para seus ungüentos. Estudiosa compenetrada, com grande futuro nas artes de cura."
          }
      },
      "bjorn": {
          "garlen": {
              "type": "peer",
              "strength": 0.7,
              "reveal_threshold": 1,
              "gossip": "Garlen viaja desenhando montanhas; minhas rações garantem que ele não desmaie na subida. Parceria firme."
          },
          "unique_hunter_traine": {
              "type": "mentor",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "A jovem caçadora aprende rápido a ler pegadas na neve. Logo estará guiando caravanas nos ermos."
          },
          "unique_survivor_blizzard": {
              "type": "old_friend",
              "strength": 0.7,
              "reveal_threshold": 1,
              "gossip": "Mara conheceu o pior inverno do norte. Nossas peles e carnes secas a ajudam a não esquecer a força dos sobreviventes."
          },
          "unique_beast_tamer": {
              "type": "peer",
              "strength": 0.75,
              "reveal_threshold": 1,
              "gossip": "O domador sabe que couro curtido em banha de foca não assa o lombo dos animais de tração. Sempre trocamos dicas de arreio."
          },
          "fruit_seller": {
              "type": "peer",
              "strength": 0.7,
              "reveal_threshold": 1,
              "gossip": "Costurei a lona encerada da tenda de Tessa para suportar os ventos do outono. Toldo firme protege as maçãs da chuva."
          },
          "seamstress": {
              "type": "peer",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "Lyra e eu trocamos carretéis de linha reforçada e tiras de couro curtido. Ela é a melhor agulha da cidade baixa."
          }
      },
      "garlen": {
          "bjorn": {
              "type": "peer",
              "strength": 0.7,
              "reveal_threshold": 1,
              "gossip": "Bjorn tem o melhor queijo defumado das estradas. Nenhum mapa meu foi feito de estômago vazio."
          },
          "garrick": {
              "type": "peer",
              "strength": 0.75,
              "reveal_threshold": 1,
              "gossip": "Garrick forja as fivelas e rebites da minha couraçaria. Sem o metal dele, as placas de couro não teriam firmeza."
          }
      },
      "unique_survivor_wolves": {
          "garrick": {
              "type": "old_friend",
              "strength": 0.85,
              "reveal_threshold": 0,
              "gossip": "Mestre Garrick me ofereceu carvão e consolo quando perdi tudo para a matilha."
          },
          "martha": {
              "type": "old_friend",
              "strength": 0.7,
              "reveal_threshold": 0,
              "gossip": "Martha me deu uma tigela quente quando cheguei sem nada além de cicatrizes."
          }
      },
      "unique_survivor_blizzard": {
          "martha": {
              "type": "old_friend",
              "strength": 0.75,
              "reveal_threshold": 0,
              "gossip": "O fogo da estalagem de Martha é o único lugar onde a nevasca não parece me alcançar."
          },
          "bjorn": {
              "type": "peer",
              "strength": 0.7,
              "reveal_threshold": 0,
              "gossip": "Bjorn sabe o valor de uma capa grossa e de provisões que não congelam."
          }
      },
      "unique_noble_exile": {
          "aldwin": {
              "type": "creditor",
              "strength": 0.65,
              "reveal_threshold": 0,
              "gossip": "Aldwin conhece as antigas glórias da Casa Corvo. Trata-me com a cortesia que outros esqueceram."
          },
          "corvus": {
              "type": "rival",
              "strength": 0.6,
              "reveal_threshold": 0,
              "gossip": "Corvus cobiça os últimos anéis e pergaminhos da minha família como um corvo sobre carniça."
          },
          "thessil": {
              "type": "peer",
              "strength": 0.5,
              "reveal_threshold": 0,
              "gossip": "Thessil ainda aprecia a história heráldica das antigas linhagens de Valdoria."
          }
      },
      "unique_pilgrim_lost": {
          "aldwynn": {
              "type": "mentor",
              "strength": 0.85,
              "reveal_threshold": 0,
              "gossip": "Padre Aldwynn me acolheu como um pai espiritual quando o deserto quase devorou minha sanidade."
          },
          "elara": {
              "type": "mentor",
              "strength": 0.8,
              "reveal_threshold": 0,
              "gossip": "Irmã Elara curou minhas feridas com orações e paciência inabalável."
          }
      },
      "unique_orphan_doll": {
          "martha": {
              "type": "mentor",
              "strength": 0.9,
              "reveal_threshold": 0,
              "gossip": "Tia Martha me dá ensopado quentinho e deixa eu dormir perto do fogão quando tá frio."
          },
          "elara": {
              "type": "mentor",
              "strength": 0.85,
              "reveal_threshold": 0,
              "gossip": "Irmã Elara acendeu uma vela bonita para a minha mãe no altar grande do Templo."
          }
      },
      "unique_seer_blind": {
          "thessil": {
              "type": "peer",
              "strength": 0.7,
              "reveal_threshold": 0,
              "gossip": "Thessil lê nos glifos o que meus olhos cegos contemplam nas correntes do tempo."
          },
          "corvus": {
              "type": "peer",
              "strength": 0.6,
              "reveal_threshold": 0,
              "gossip": "Corvus busca respostas nas sombras. Ele sabe que a escuridão guarda mais verdades que a luz do meio-dia."
          },
          "aldwynn": {
              "type": "rival",
              "strength": 0.5,
              "reveal_threshold": 0,
              "gossip": "O bom padre teme o que não cabe nos cânones sagrados. Eu não temo o que já vi."
          }
      },
      "unique_bard_broken": {
          "martha": {
              "type": "old_friend",
              "strength": 0.75,
              "reveal_threshold": 0,
              "gossip": "Martha nunca me cobrou pela caneca d'água enquanto meus dedos tremiam sem conseguir tocar."
          },
          "tavira": {
              "type": "peer",
              "strength": 0.6,
              "reveal_threshold": 0,
              "gossip": "A Mestra da Guilda respeita os que marcharam e caíram. Ela entende o peso do luto."
          }
      },
      "unique_thief_repentant": {
          "aldwynn": {
              "type": "mentor",
              "strength": 0.7,
              "reveal_threshold": 0,
              "gossip": "Padre Aldwynn não chamou os guardas quando confessei meus roubos. Ofereceu penitência e trabalho honesto."
          },
          "corvus": {
              "type": "rival",
              "strength": 0.75,
              "reveal_threshold": 0,
              "gossip": "Corvus sabe quem eu era antes de queimar minhas gazuas. Desconfio que ele ainda quer cobrar velhos favores."
          }
      },
      "unique_wizard_failed": {
          "thessil": {
              "type": "mentor",
              "strength": 0.6,
              "reveal_threshold": 0,
              "gossip": "Mestre Thessil me disse que se eu canalizar magia rúnica em vez de fogo bruto, meu chapéu não queima."
          },
          "velithra": {
              "type": "peer",
              "strength": 0.6,
              "reveal_threshold": 0,
              "gossip": "Velithra me vende pós azuis fascinantes, embora me proíba de misturá-los dentro da loja."
          },
          "eirik": {
              "type": "mentor",
              "strength": 0.75,
              "reveal_threshold": 0,
              "gossip": "Eirik me ensina a ter paciência com o traçado dos glifos para evitar combustões acidentais de pergaminhos."
          }
      },
      "unique_guard_veteran": {
          "aldric": {
              "type": "peer",
              "strength": 0.85,
              "reveal_threshold": 0,
              "gossip": "Aldric conhece cada pedra dos portões melhor do que qualquer oficial. Veterano leal e indispensável."
          },
          "tavira": {
              "type": "peer",
              "strength": 0.8,
              "reveal_threshold": 0,
              "gossip": "A Guarda e a Guilda precisam caminhar juntas. Tavira sabe disso melhor que qualquer nobre do conselho."
          },
          "vorhan": {
              "type": "old_friend",
              "strength": 0.75,
              "reveal_threshold": 0,
              "gossip": "Vorhan lutou nas trincheiras do norte comigo. Homem duro, mas de palavra inabalável."
          },
          "thorne": {
              "type": "peer",
              "strength": 0.75,
              "reveal_threshold": 0,
              "gossip": "O aço de Thorne nunca falhou com meus homens em patrulha noturna."
          }
      },
      "unique_gourmet": {
          "martha": {
              "type": "rival",
              "strength": 0.65,
              "reveal_threshold": 0,
              "gossip": "Martha tem mão pesada no sal, mas devo admitir que seu ensopado tem alma de lareira."
          },
          "grom": {
              "type": "peer",
              "strength": 0.6,
              "reveal_threshold": 0,
              "gossip": "Grom tem um hidromel defumado que combina perfeitamente com carne de caça assada."
          }
      },
      "unique_monk_peace": {
          "elara": {
              "type": "peer",
              "strength": 0.75,
              "reveal_threshold": 0,
              "gossip": "Irmã Elara compreende que a verdadeira força repousa no silêncio entre duas respirações."
          },
          "vorhan": {
              "type": "rival",
              "strength": 0.5,
              "reveal_threshold": 0,
              "gossip": "Vorhan busca o ápice pelo embate físico; eu o busco pela imobilidade serena. Caminhos opostos da mesma busca."
          }
      },
      "unique_smith_apprentice": {
          "garrick": {
              "type": "mentor",
              "strength": 0.9,
              "reveal_threshold": 0,
              "gossip": "Mestre Garrick é exigente e rígido, mas seu martelo me ensinou a respeitar o coração do metal."
          }
      },
      "unique_alchemist_student": {
          "velithra": {
              "type": "mentor",
              "strength": 0.85,
              "reveal_threshold": 0,
              "gossip": "Mestra Velithra é a mente alquímica mais brilhante de Valdoria. Um dia farei uma poção digna de sua aprovação!"
          }
      },
      "unique_hunter_traine": {
          "bjorn": {
              "type": "mentor",
              "strength": 0.8,
              "reveal_threshold": 0,
              "gossip": "Bjorn me ensinou a rastrear sem quebrar gravetos na neve. Devo minha mira aos conselhos dele."
          },
          "grom": {
              "type": "peer",
              "strength": 0.6,
              "reveal_threshold": 0,
              "gossip": "Grom sempre me conta onde as matilhas foram vistas pelos batedores da taverna."
          }
      },
      "unique_cleric_acolyte": {
          "aldwynn": {
              "type": "mentor",
              "strength": 0.85,
              "reveal_threshold": 0,
              "gossip": "Padre Aldwynn me ensina que a devoção se constrói no serviço humilde, vela por vela."
          },
          "elara": {
              "type": "mentor",
              "strength": 0.8,
              "reveal_threshold": 0,
              "gossip": "Irmã Elara é o exemplo vivo de graça e acolhimento no Templo da Alvorada."
          },
          "theron": {
              "type": "peer",
              "strength": 0.8,
              "reveal_threshold": 0,
              "gossip": "Theron e eu dividimos as tarefas do altar e o acendimento das lamparinas votivas."
          }
      },
      "unique_baker_master": {
          "martha": {
              "type": "peer",
              "strength": 0.85,
              "reveal_threshold": 0,
              "gossip": "Martha e eu mantemos o estômago de Valdoria funcionando. Sem pão e sopa, a cidade desmorona."
          },
          "grom": {
              "type": "peer",
              "strength": 0.7,
              "reveal_threshold": 0,
              "gossip": "Grom encomenda dezenas de pães crocantes toda semana para acompanhar os barris de cerveja."
          },
          "baker_greta": {
              "type": "friendly_rival",
              "strength": 0.65,
              "reveal_threshold": 0,
              "gossip": "Greta atende os operários com pães pesados e rústicos. Não tem a delicadeza dos meus folhados reais, mas reconheço sua dedicação."
          }
      },
      "unique_fisher_old": {
          "martha": {
              "type": "peer",
              "strength": 0.75,
              "reveal_threshold": 0,
              "gossip": "Entrego meus melhores peixes direto na cozinha da dona Martha antes do sol se pôr."
          }
      },
      "unique_farmer_lost": {
          "martha": {
              "type": "peer",
              "strength": 0.7,
              "reveal_threshold": 0,
              "gossip": "Martha sempre compra meus sacos de grãos mesmo quando a geada reduz a colheita."
          },
          "mirena": {
              "type": "peer",
              "strength": 0.6,
              "reveal_threshold": 0,
              "gossip": "Mirena me vendeu luvas de couro grossas que salvam minhas mãos no arado."
          }
      },
      "unique_miner_gold": {
          "aldwin": {
              "type": "peer",
              "strength": 0.75,
              "reveal_threshold": 0,
              "gossip": "Aldwin pesa meu ouro com balança justa. Nunca me faltou uma moeda no depósito."
          },
          "garrick": {
              "type": "peer",
              "strength": 0.8,
              "reveal_threshold": 0,
              "gossip": "Mestre Garrick sabe distinguir ferro bom de escória só de bater a unha na pedra."
          }
      },
      "unique_woodcutter": {
          "garrick": {
              "type": "peer",
              "strength": 0.75,
              "reveal_threshold": 0,
              "gossip": "Levo achas de carvalho seco para a forja de Garrick toda terça-feira. Aquele forno consome florestas!"
          },
          "braun": {
              "type": "peer",
              "strength": 0.7,
              "reveal_threshold": 0,
              "gossip": "Braun compra toras inteiras para reformar carroças da Guilda. Homem direto no pagamento."
          }
      },
      "unique_gravedigger": {
          "aldwynn": {
              "type": "peer",
              "strength": 0.75,
              "reveal_threshold": 0,
              "gossip": "O Padre abençoa a terra antes de eu cavar. Trabalho tranquilo, ninguém reclama do vizinho no jazigo."
          }
      },
      "unique_librarian": {
          "thessil": {
              "type": "peer",
              "strength": 0.85,
              "reveal_threshold": 0,
              "gossip": "Thessil é a única pessoa na cidade autorizada a manusear os pergaminhos da Terceira Era do arquivo."
          },
          "corvus": {
              "type": "rival",
              "strength": 0.65,
              "reveal_threshold": 0,
              "gossip": "Corvus vive tentando comprar meus códices antigos. Enquanto eu respirar, nada sai do acervo municipal!"
          }
      },
      "unique_painter_visionary": {
          "tavira": {
              "type": "peer",
              "strength": 0.6,
              "reveal_threshold": 0,
              "gossip": "A Mestra da Guilda me permitiu pintar o mural comemorativo da expedição nos salões de pedra."
          },
          "martha": {
              "type": "peer",
              "strength": 0.6,
              "reveal_threshold": 0,
              "gossip": "Dona Martha pendurou uma das minhas telas na sala de refeições. Dá vida ao salão."
          }
      },
      "unique_sculptor": {
          "garrick": {
              "type": "peer",
              "strength": 0.65,
              "reveal_threshold": 0,
              "gossip": "Garrick forja meus cinzéis de aço temperado. Sem ferramenta dele, o granito não cede."
          },
          "tavira": {
              "type": "peer",
              "strength": 0.6,
              "reveal_threshold": 0,
              "gossip": "A Guilda encomendou as gárgulas do pórtico comigo. Trabalho que resistirá a séculos."
          }
      },
      "unique_dancer_exotic": {
          "tavira": {
              "type": "peer",
              "strength": 0.65,
              "reveal_threshold": 0,
              "gossip": "A Guilda protege os artistas que viajam entre vilarejos. Danço com tranquilidade sob essa bandeira."
          },
          "martha": {
              "type": "peer",
              "strength": 0.65,
              "reveal_threshold": 0,
              "gossip": "Martha me cede espaço no pátio da estalagem nos fins de tarde ensolarados."
          },
          "olmiro": {
              "type": "peer",
              "strength": 0.85,
              "reveal_threshold": 0,
              "gossip": "Olmiro sempre reserva o palco principal da Praça do Festival para minhas coreografias orientais."
          }
      },
      "unique_juggler_fire": {
          "vorhan": {
              "type": "peer",
              "strength": 0.6,
              "reveal_threshold": 0,
              "gossip": "Vorhan já me contratou para abrir o espetáculo noturno do Coliseu com tochas cruzadas."
          },
          "tavira": {
              "type": "peer",
              "strength": 0.6,
              "reveal_threshold": 0,
              "gossip": "Apresento-me nos festivais da Guilda para alegrar quem retorna das expedições."
          },
          "olmiro": {
              "type": "peer",
              "strength": 0.8,
              "reveal_threshold": 0,
              "gossip": "Olmiro prepara os tablados e tochas com segurança para que meus números de fogo iluminem a praça sem perigo."
          }
      },
      "unique_snake_charmer": {
          "velithra": {
              "type": "peer",
              "strength": 0.65,
              "reveal_threshold": 0,
              "gossip": "Extraio veneno fresco das minhas víboras para as poções curativas e antídotos de Velithra."
          },
          "tavira": {
              "type": "peer",
              "strength": 0.6,
              "reveal_threshold": 0,
              "gossip": "A Guilda mantém a segurança para que minhas cobras não assustem as crianças da praça."
          }
      },
      "unique_illusionist": {
          "thessil": {
              "type": "peer",
              "strength": 0.65,
              "reveal_threshold": 0,
              "gossip": "Thessil assiste aos meus truques com um sorriso intrigado, tentando decifrar as runas de luz."
          },
          "corvus": {
              "type": "peer",
              "strength": 0.6,
              "reveal_threshold": 0,
              "gossip": "Corvus me vendeu o espelho encantado que uso no meu truque das cartas flutuantes."
          }
      },
      "unique_beast_tamer": {
          "bjorn": {
              "type": "peer",
              "strength": 0.7,
              "reveal_threshold": 0,
              "gossip": "Bjorn me fornece arreios resistentes e petiscos desidratados para acalmar meus animais."
          },
          "vorhan": {
              "type": "peer",
              "strength": 0.65,
              "reveal_threshold": 0,
              "gossip": "Ajudo a treinar e alimentar os cães de guarda que patrulham os fundos da Arena."
          }
      },
      "cook_berta": {
          "martha": {
              "type": "peer",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "Dona Martha é generosa como poucas. Sempre nos envia caldo gordo e pães da estalagem para ajudar quem mais precisa na praça."
          },
          "fruit_seller": {
              "type": "peer",
              "strength": 0.85,
              "reveal_threshold": 1,
              "gossip": "Tessa me reserva os legumes mais frescos e as maçãs mais doces da feira logo ao amanhecer."
          },
          "baker_greta": {
              "type": "peer",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "Greta nunca deixa o tacho sem pão de centeio. Pão de verdade, que sustenta os braços de quem trabalha."
          },
          "street_urchin": {
              "type": "mentor",
              "strength": 0.75,
              "reveal_threshold": 1,
              "gossip": "O menino Pip corre a praça toda entregando recados. Quando o vejo ofegante, chamo logo para um prato fundo de ensopado quente."
          },
          "grom": {
              "type": "peer",
              "strength": 0.7,
              "reveal_threshold": 1,
              "gossip": "Grom manda sobras defumadas e ossos de tutano da taverna que dão um sabor inigualável ao caldeirão comunitário."
          },
          "carpenter": {
              "type": "peer",
              "strength": 0.7,
              "reveal_threshold": 1,
              "gossip": "Wenn consertou minhas tábuas de corte e fez bancos sólidos para os trabalhadores comerem sentados. Carpinteiro de mão cheia."
          }
      },
      "fruit_seller": {
          "cook_berta": {
              "type": "peer",
              "strength": 0.85,
              "reveal_threshold": 1,
              "gossip": "Berta alimenta toda a gente humilde da praça. Faço questão de separar minhas melhores caixas de frutas e tubérculos para a panela dela."
          },
          "bjorn": {
              "type": "peer",
              "strength": 0.7,
              "reveal_threshold": 1,
              "gossip": "Mestre Bjorn fez a lona reforçada da minha banca com costura dupla. Nem o temporal da última semana derrubou minhas frutas."
          },
          "mirena": {
              "type": "peer",
              "strength": 0.75,
              "reveal_threshold": 1,
              "gossip": "Mirena sabe o valor de bagas e cascas frescas para suas misturas. Negociamos com honestidade e respeito mútuo."
          },
          "seamstress": {
              "type": "peer",
              "strength": 0.75,
              "reveal_threshold": 1,
              "gossip": "Lyra reforçou meus aventais com bolsos fundos de couro. Ótima vizinha de praça e costura primorosa."
          },
          "sylthara": {
              "type": "peer",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "Tessa agradece a vitalidade dos pomares e a doçura dos frutos que brotam das bênçãos da terra."
          }
      },
      "carpenter": {
          "garrick": {
              "type": "peer",
              "strength": 0.85,
              "reveal_threshold": 1,
              "gossip": "Mestre Garrick forja as ferragens e cravos mais resistentes que já vi. Quando unimos o aço dele com meu carvalho, nada verga."
          },
          "tavira": {
              "type": "peer",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "Tavira exige cabos de lança e escudos reforçados para os membros da comitiva da guilda. Sei que uma falha na madeira custa vidas, por isso trabalho com rigor."
          },
          "thorne": {
              "type": "peer",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "O ferreiro Thorne me fornece peças temperadas para fustes de bestas. Homem sério, de pouca conversa e ofício impecável."
          },
          "cook_berta": {
              "type": "peer",
              "strength": 0.7,
              "reveal_threshold": 1,
              "gossip": "Entalhei conchas e bancos pesados para a cozinha da praça de Berta. Toda panela generosa merece mesa firme."
          }
      },
      "street_urchin": {
          "aldric": {
              "type": "mentor",
              "strength": 0.75,
              "reveal_threshold": 1,
              "gossip": "O guarda Aldric é severo mas tem bom coração. Ele me ensinou a nunca me envolver com batedores de carteira e me paga por avisos legítimos."
          },
          "shrewd_beggar": {
              "type": "peer",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "Kira me ensinou a me mover pelas sombras dos becos quando mercenários brutos cruzam a praça. Ela vê tudo antes de todo mundo."
          },
          "martha": {
              "type": "peer",
              "strength": 0.75,
              "reveal_threshold": 1,
              "gossip": "A senhora Martha me dá tarefas leves na estalagem e sempre serve uma tigela cheia que me dá forças para o dia todo."
          },
          "corvus": {
              "type": "peer",
              "strength": 0.7,
              "reveal_threshold": 1,
              "gossip": "Mestre Corvus me confia rolos de pergaminho raros. Sei que não posso amassar as bordas e sempre chego a tempo."
          },
          "cook_berta": {
              "type": "peer",
              "strength": 0.75,
              "reveal_threshold": 1,
              "gossip": "Dona Berta nunca me deixa de estômago vazio. O ensopado dela afasta qualquer frio do peito."
          }
      },
      "baker_greta": {
          "grom": {
              "type": "peer",
              "strength": 0.75,
              "reveal_threshold": 1,
              "gossip": "Grom compra dezenas de broas de centeio para a taverna toda madrugada. Pagamento em dia e cerveja fresca em troca."
          },
          "cook_berta": {
              "type": "peer",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "Nenhum pedaço de pão é desperdiçado aqui. O que sobra vai direto para as panelas comunitárias de Berta."
          },
          "unique_baker_master": {
              "type": "friendly_rival",
              "strength": 0.65,
              "reveal_threshold": 1,
              "gossip": "Mestre Orlan assa doces finos com açúcar branco para nobres perfumados; eu asso centeio maciço que alimenta os trabalhadores da terra."
          },
          "thorne": {
              "type": "peer",
              "strength": 0.7,
              "reveal_threshold": 1,
              "gossip": "Mestre Thorne consertou as dobradiças da minha fornalha de pedra com ferro batido que vai durar mais vinte anos."
          }
      },
      "old_sailor": {
          "grom": {
              "type": "old_friend",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "Grom é o melhor ouvinte para quem já viu vagas de trinta pés no oceano. A cerveja dele esquenta os ossos cansados da maresia."
          },
          "corvus": {
              "type": "peer",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "O cartógrafo Corvus anota cada detalhe dos meus relatos de recifes e baías. Bom ver o mar antigo registrado em tintas vivas."
          },
          "crippled_veteran": {
              "type": "old_friend",
              "strength": 0.85,
              "reveal_threshold": 1,
              "gossip": "Drax e eu entendemos o peso das cicatrizes. Sentamos juntos ao sol da tarde e dividimos o fumo do cachimbo em silêncio fraterno."
          }
      },
      "seamstress": {
          "martha": {
              "type": "peer",
              "strength": 0.75,
              "reveal_threshold": 1,
              "gossip": "Martha confia em mim para remendar as roupas de cama da estalagem. Trabalho honesto e acolhimento caloroso."
          },
          "bjorn": {
              "type": "peer",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "Bjorn me fornece retalhos de couro tratado e fios encerados. Trocamos agulhas e conselhos sobre tecidos pesados."
          },
          "fruit_seller": {
              "type": "peer",
              "strength": 0.75,
              "reveal_threshold": 1,
              "gossip": "Tessa é uma doçura de moça. Conserto suas sacolas de feira e ela me traz peras frescas do pomar."
          },
          "apprentice_healer": {
              "type": "peer",
              "strength": 0.75,
              "reveal_threshold": 1,
              "gossip": "A jovem Nyssa precisa de tiras de linho alvo e ataduras esterilizadas. Preparo cada rolo com o máximo de zelo."
          }
      },
      "shrewd_beggar": {
          "aldric": {
              "type": "peer",
              "strength": 0.65,
              "reveal_threshold": 1,
              "gossip": "Aldric finge que não me vê perto da fonte, e eu aviso os vigias quando vejo contrabandistas com adagas sob as capas."
          },
          "street_urchin": {
              "type": "mentor",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "Pip é ligeiro demais para o próprio bem. Fico de olho para garantir que nenhum salteador aproveite a ingenuidade do garoto."
          },
          "corvus": {
              "type": "peer",
              "strength": 0.65,
              "reveal_threshold": 1,
              "gossip": "O velho cartógrafo sabe que objetos estranhos surgem nos esgotos da cidade velha. Ele paga justo por curiosidades de bronze."
          },
          "square_bounty_officer": {
              "type": "wary",
              "strength": 0.5,
              "reveal_threshold": 1,
              "gossip": "Kira evita os soldados de Vane, mas vende sussurros pontuais quando o perigo ameaça toda a praça."
          },
          "shadow_vulto": {
              "type": "peer",
              "strength": 0.75,
              "reveal_threshold": 1,
              "gossip": "Kira recebe moedas de cobre sem brasão para vigiar movimentos estranhos e deixar mensagens em frestas de pedra."
          }
      },
      "wandering_troubadour": {
          "martha": {
              "type": "peer",
              "strength": 0.7,
              "reveal_threshold": 1,
              "gossip": "Dona Martha me dá um canto quente junto à lareira e um prato farto em troca das minhas baladas sobre os vales."
          },
          "grom": {
              "type": "peer",
              "strength": 0.7,
              "reveal_threshold": 1,
              "gossip": "Na taverna de Grom, as canções sobre batalhas antigas fazem os copos baterem com força nas mesas de carvalho."
          },
          "tavira": {
              "type": "peer",
              "strength": 0.75,
              "reveal_threshold": 1,
              "gossip": "Mestra Tavira gosta das odes que componho sobre os aventureiros da Guilda. É assim que os grandes feitos ganham asas pelas estradas."
          },
          "lyra_bard": {
              "type": "peer",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "Olen e Lyra improvisam duetos nos finais de tarde, combinando melodias errantes com a acústica da taverna."
          },
          "olmiro": {
              "type": "peer",
              "strength": 0.85,
              "reveal_threshold": 1,
              "gossip": "Olen apresenta suas cantigas nos palanques de Olmiro na praça das festividades."
          }
      },
      "crippled_veteran": {
          "aldric": {
              "type": "old_friend",
              "strength": 0.85,
              "reveal_threshold": 1,
              "gossip": "Aldric e eu seguramos a linha de lanças quando as feras desceram as colinas. Amizade nascida no sangue nunca enferruja."
          },
          "vorhan": {
              "type": "old_friend",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "Vorhan me respeita como guerreiro, mesmo que minha perna não me deixe mais empunhar o escudo. Sempre assisto às lutas a convite dele."
          },
          "old_sailor": {
              "type": "old_friend",
              "strength": 0.85,
              "reveal_threshold": 1,
              "gossip": "Bram enfrentou monstros das ondas enquanto enfrentei invasores nos desfiladeiros. Homens velhos que sabem o valor da paz."
          },
          "apprentice_healer": {
              "type": "peer",
              "strength": 0.75,
              "reveal_threshold": 1,
              "gossip": "A pequena Nyssa cuida das dores da minha perna mutilada com compressas mornas de ervas. Menina de ouro."
          },
          "square_bounty_officer": {
              "type": "peer",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "Drax serviu com a milícia de Vane em campanhas passadas e confia no discernimento do oficial."
          }
      },
      "apprentice_healer": {
          "elara": {
              "type": "mentor",
              "strength": 0.9,
              "reveal_threshold": 1,
              "gossip": "Irmã Elara é minha mestra e meu maior exemplo. Sob a tutela dela, aprendo que curar uma ferida é também acalmar a alma aflita."
          },
          "mirena": {
              "type": "peer",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "Mirena me ensina as dosagens corretas dos extratos vegetais e me vende frascos limpos para as infusões."
          },
          "seamstress": {
              "type": "peer",
              "strength": 0.75,
              "reveal_threshold": 1,
              "gossip": "Dona Lyra corta e engoma as ataduras de linho que usamos para estancar sangramentos na tenda de cuidados."
          },
          "crippled_veteran": {
              "type": "peer",
              "strength": 0.75,
              "reveal_threshold": 1,
              "gossip": "Seu Drax tem paciência de monge. Aplico unguentos nas juntas dele toda semana para amenizar as dores das velhas batalhas."
          }
      },
      "square_bounty_officer": {
          "aldric": {
              "type": "peer",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "O Capitão Vane confia na vigilância de Aldric nas muralhas para antecipar ameaças antes dos editais."
          },
          "crippled_veteran": {
              "type": "peer",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "Vane busca auxiliar Drax com pequenos proventos e valoriza as observações táticas do antigo combatente."
          },
          "tavira": {
              "type": "peer",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "O capitão encaminha missões de alto risco para a Guilda dos Aventureiros quando as forças regulares escasseiam."
          },
          "shrewd_beggar": {
              "type": "wary",
              "strength": 0.5,
              "reveal_threshold": 1,
              "gossip": "Vane tolera a presença de Kira na praça por reconhecer a utilidade preventiva de seus avisos discretos."
          }
      },
      "sylthara": {
          "aldric": {
              "type": "peer",
              "strength": 0.7,
              "reveal_threshold": 1,
              "gossip": "Sylthara avisa as sentinelas dos portões quando espíritos da floresta se agitam em direção à civilização."
          },
          "elara": {
              "type": "peer",
              "strength": 0.85,
              "reveal_threshold": 1,
              "gossip": "A druida envia seiva viva e bálsamos puros para que Elara acolha e cure os feridos no santuário."
          },
          "fruit_seller": {
              "type": "peer",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "Sylthara aprecia o cuidado de Tessa com os frutos e sementes silvestres que alimentam a gente da praça."
          },
          "thessil": {
              "type": "peer",
              "strength": 0.7,
              "reveal_threshold": 1,
              "gossip": "A druida adverte Thessil para manter respeito sagrado pelas forças antigas que não cabem em compêndios."
          }
      },
      "shadow_vulto": {
          "corvus": {
              "type": "peer",
              "strength": 0.65,
              "reveal_threshold": 1,
              "gossip": "O Vulto adquire mapas e anotações topográficas de Corvus para antecipar patrulhas pelas galerias."
          },
          "shrewd_beggar": {
              "type": "peer",
              "strength": 0.75,
              "reveal_threshold": 1,
              "gossip": "O Vulto remunera o silêncio e a lealdade de Kira para manter as rotas do mercado clandestino operacionais."
          },
          "aldwin": {
              "type": "rival",
              "strength": 0.4,
              "reveal_threshold": 1,
              "gossip": "O intermediário das sombras observa a rigidez dos cofres de Aldwin como um obstáculo a ser contornado."
          },
          "grom": {
              "type": "wary",
              "strength": 0.5,
              "reveal_threshold": 1,
              "gossip": "O Vulto mantém postura estritamente discreta nos fundos da taverna para preservar seu porto de negócios."
          }
      },
      "lyra_bard": {
          "wandering_troubadour": {
              "type": "peer",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "Lyra aprimora as estrofes rústicas de Olen, tecendo harmonias elegantes com o alaúde no balcão."
          },
          "olmiro": {
              "type": "peer",
              "strength": 0.85,
              "reveal_threshold": 1,
              "gossip": "A bardisa colabora com Olmiro compondo sonetos vibrantes para embalar os cortejos festivos da cidade."
          },
          "grom": {
              "type": "old_friend",
              "strength": 0.85,
              "reveal_threshold": 1,
              "gossip": "Lyra encontra na taverna de Grom um teto generoso e plateia calorosa que aplaude suas interpretações."
          },
          "martha": {
              "type": "peer",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "A cantora dedica canções suaves aos viajantes cansados que repousam sob o cuidado acolhedor de Martha."
          }
      },
      "olmiro": {
          "wandering_troubadour": {
              "type": "peer",
              "strength": 0.85,
              "reveal_threshold": 1,
              "gossip": "Olmiro acolhe os trovadores de estrada dando espaço e aplausos nas festas públicas."
          },
          "lyra_bard": {
              "type": "peer",
              "strength": 0.85,
              "reveal_threshold": 1,
              "gossip": "Olmiro sempre abre espaço nos tablados da Praça do Festival para o talento musical refinado de Lyra."
          },
          "martha": {
              "type": "peer",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "Olmiro celebra os banquetes de colheita com as receitas tradicionais servidas por Martha."
          },
          "unique_dancer_exotic": {
              "type": "peer",
              "strength": 0.85,
              "reveal_threshold": 1,
              "gossip": "Olmiro se orgulha das coreografias encantadoras de Sariyah que hipnotizam as multidões do festival."
          },
          "unique_juggler_fire": {
              "type": "peer",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "Olmiro coordena a segurança dos tablados para que os números de fogo de Ignis impressionem a todos."
          }
      },
      "eirik": {
          "thessil": {
              "type": "peer",
              "strength": 0.85,
              "reveal_threshold": 1,
              "gossip": "Eirik compartilha os segredos das gravuras de pedra com Thessil, fortalecendo a sabedoria do santuário."
          },
          "corvus": {
              "type": "peer",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "O escriba rúnico ajuda Corvus a identificar símbolos ancestrais desenhados nas margens de cartas antigas."
          },
          "aldwynn": {
              "type": "peer",
              "strength": 0.8,
              "reveal_threshold": 1,
              "gossip": "Eirik zela pelas inscrições sagradas em comunhão com o trabalho de fé conduzido por Aldwynn."
          },
          "unique_wizard_failed": {
              "type": "mentor",
              "strength": 0.75,
              "reveal_threshold": 1,
              "gossip": "Eirik orienta Thumblen com calma e firmeza na caligrafia rúnica para que o rapaz recupere sua confiança."
          }
      }
  };

  window.NPC_EVENTS_TIMELINE = [

    {
      id: 'festival_moon',
      name: 'Festival da Lua',
      frequency: 'monthly',
      duration_days: 1,
      affected_npcs: ['elara', 'aldwynn', 'miriel', 'theron'],
      effects: {
        closed_services: ['heal', 'cure_poison', 'bless', 'raise_dead'],
        mood_shift: '+1',
        dialogue_override: 'O Templo está fechado para o Festival da Lua. Volte amanhã.'
      },
      narrative: 'Os sacerdotes ocupados em vigília lunar — Templo fechado por hoje.'
    },

    {
      id: 'caravan_north',
      name: 'Caravana do Norte',
      frequency: 'seasonal',
      duration_days: 7,
      affected_npcs: ['garlen', 'bjorn'],
      effects: {
        closed_services: ['mapas', 'mantimentos'],
        dialogue_override: 'Saiu com a caravana. Volta em uma semana.'
      },
      narrative: 'Caravana sazonal — Garlen e Bjorn fora por uma semana.'
    },

    {
      id: 'tournament_annual',
      name: 'Torneio Anual',
      frequency: 'annual',
      duration_days: 3,
      affected_npcs: ['vorhan', 'braun'],
      effects: {
        mood_shift: '+2',
        dialogue_override: 'Treinando pro Torneio Anual. Toda atenção em afiar lâminas.'
      },
      narrative: 'Vorhan e Braun preparando o Torneio Anual — falas focadas em combate.'
    },

    {
      id: 'inspection_count',
      name: 'Inspeção do Conde',
      frequency: 'variable',
      duration_days: 2,
      affected_npcs: ['aldwin', 'tavira'],
      effects: {
        mood_shift: '-1',
        dialogue_override: 'Inspeção do Conde — fala curto, fala sério. Não há tempo pra rodeios.'
      },
      narrative: 'Conde Valdor vem inspecionar — Aldwin checa cofres, Tavira ajeita guarda.'
    },

    {
      id: 'market_fair',
      name: 'Feira de Valdoria',
      frequency: 'monthly',
      duration_days: 2,
      affected_npcs: ['thorne', 'mirena', 'velithra', 'corvus', 'bjorn', 'garlen'],
      effects: {
        mood_shift: '+1'
        // Sem closed_services — Feira POTENCIALIZA o Mercado, não fecha
      },
      narrative: 'Feira mensal — Mercado movimentado, NPCs animados, preços negociáveis.'
    },

    {
      id: 'old_war_memorial',
      name: 'Memória da Guerra Antiga',
      frequency: 'annual',
      duration_days: 1,
      affected_npcs: ['vorhan', 'braun'],
      effects: {
        mood_shift: '-2',
        dialogue_override: 'Hoje não. Hoje é dia de lembrar dos caídos no Norte.'
      },
      narrative: 'Aniversário da Guerra do Norte — meio-orcs em luto silencioso.'
    }

  ];

  // === Helpers ==============================================================
  // _getRelation(speakerNpcId, targetNpcId) — atalho pra NPC_RELATIONS lookup
  window._getRelation = function(speakerNpcId, targetNpcId){
    const rels = window.NPC_RELATIONS[speakerNpcId];
    return (rels && rels[targetNpcId]) ? rels[targetNpcId] : null;
  };

  // _getActiveEvents() — retorna lista de eventos atualmente "ativos"
  // (estratégia simples: usa Math.floor(Date.now() / period) % N — para
  // simulação. Backend real teria calendar persistente.)
  //
  // Para dev/test, pode forçar via window._npcForceActiveEvents = ['festival_moon']
  window._getActiveEvents = function(){
    if (window._npcForceActiveEvents) {
      return window.NPC_EVENTS_TIMELINE.filter(e =>
        window._npcForceActiveEvents.indexOf(e.id) !== -1
      );
    }
    // Default: nenhum evento ativo (mockup mode normal)
    return [];
  };

  // _isNpcEventActive(npcId) — retorna evento ativo afetando o NPC, se houver
  window._isNpcEventActive = function(npcId){
    const events = window._getActiveEvents();
    for (let i = 0; i < events.length; i++) {
      if (events[i].affected_npcs.indexOf(npcId) !== -1) return events[i];
    }
    return null;
  };

  // === Bootstrap log ========================================================
  if (typeof window._logCity === 'function') {
    window._logCity('[NPC-LIVING] npc-relations-data.js loaded — ' +
      Object.keys(window.NPC_RELATIONS).length + ' speakers, ' +
      window.NPC_EVENTS_TIMELINE.length + ' events');
  }

})();
