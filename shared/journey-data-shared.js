/**
 * journey-data-shared.js — FONTE UNICA dos dados + regra da VIAGEM (cidade <-> exploracao).
 *
 * ROLE: elimina a divergencia da viagem entre cidade e exploracao. Antes a cidade tinha
 * dados RICOS (script[], sNarr_by_class, anti-repeat 24h) + math D&D correta, e a exploracao
 * dados POBRES (narr single-line) + check SEM proficiencia -> MESMO personagem, ODDS
 * DIFERENTES por onde a viagem comecava (bug H1/A1 do plano). Agora os dois consomem ESTES
 * dados (base = versao rica da cidade, sessao #77) e ESTA regra (via DndRules) -> odds IGUAIS.
 *
 * Plano: docs/sistemas/single-source-consolidation-plan.md (FASE 2). Requer dnd-rules-shared.js.
 *
 * SERVER E A AUTORIDADE (SUPREME RULE #0): a viagem da cidade-mock e o combate de exploracao
 * sao client-side por design (sandbox); este modulo e o fix CERTO p/ esse sandbox. Em gameplay
 * REMOTE a resolucao final de check/loot/XP deve vir do backend; resolveJourneyCheck e interim.
 *
 * API (window.JourneyData):
 *   HAZARDS / SAFE / DEPARTURES        dados ricos por bioma (base = cidade)
 *   RISK_CHANCE                        55 (chance de hazard por etapa)
 *   stepsForDistance(dist)             3/4/5 por distancia Manhattan (exploracao map->map)
 *   pickFreshHazard(biome, player, sessionUsed)   anti-repeat sessao + localStorage 24h char-namespaced
 *   pickFreshSafe(biome, player, sessionUsed)
 *   pickDeparture(biome)               variante de partida (script[])
 *   resolveJourneyCheck(player, choice)  -> DndRules.resolveSkillCheck (ODDS IGUAIS) | null se sem teste
 *   successPctForChoice(player, choice)  -> DndRules.successPct (preview, MESMAS odds) | null
 *   pickNarrative(choice, player, success)  sNarr_by_class > _by_alignment > _by_background > default
 *
 * CHAVE p/ odds iguais: _journeyView() REMOVE player.prof antes do check. Na exploracao
 * player.prof e a lista de SAVE proficiencies da classe (NAO skill profs); usa-la falsearia o
 * teste de pericia. Sem ela DndRules cai em skills[] reais -> whitelist por classe, igual a
 * cidade (_classHasSkillProficiency). Os dois lados convergem.
 *
 * Per-hazard shape: { title, script:[{type:'narration'|'speech', text, speaker?}], npc?,
 *   choices:[{ i, t, stat|null, dc?, desc?, sNarr, sNarr_by_class?, sNarr_by_alignment?, fNarr, dmg? }] }
 *
 * ES5 only (Android WebView 2GB). Dados sao literais; codigo sem const/let/arrow/template literals.
 */
(function (global) {
    'use strict';
    if (global.JourneyData) return;

    /* ============ DADOS (ricos, extraidos de cidade.html sessao #77) ============ */
var HAZARDS = {
  forest: [
    { title: 'Armadilha de Caçador',
      script: [
        { type: 'narration', text: 'Você caminha entre carvalhos antigos quando algo brilha entre as folhas — tarde demais.' },
        { type: 'narration', text: 'Um laço de corda trançada se prende ao seu pé. Acima, um galho dobrado em tensão: armadilha de caçador, projetada pra puxar a presa pro alto quando o gatilho ativa.' },
        { type: 'narration', text: 'Você tem segundos antes do galho soltar.' }
      ],
      choices: [
        { i: '🔍', t: 'Desarmar gatilho', stat: 'dex', dc: 12,
          desc: 'Seguir o cordão até o nó-mestre antes do galho soltar.',
          sNarr: 'Suas mãos ágeis seguem o cordão até o nó cego e desfazem-no com cuidado. O galho fica tenso mas firme — armadilha neutralizada.',
          sNarr_by_class: {
            ladrao: 'Você reconhece o nó imediatamente — trabalho de caçador veterano. Em três movimentos precisos, o gatilho é neutralizado. Profissional reconhece profissional.',
            patrulheiro: 'Você sorri ao ver a armadilha — usaria a mesma. Desfaz o gatilho com afeto profissional, e até guarda o cordão pra reusar.'
          },
          sNarr_by_subrace: {
            wood: 'Seus pés leves de elfo silvestre mal chegaram a tensionar o laço. Você se abaixa com calma e desfaz o nó com destreza natural.'
          },
          sNarr_by_race: {
            elf: 'Com graça élfica, você encontra o ponto de alívio do gatilho antes do galho subir.'
          },
          fNarr: 'A corda corta sua perna ao apertar. Sangue quente escorre — o nó travou no movimento errado.', dmg: 3 },
        { i: '🗡', t: 'Cortar cordão mestre', stat: 'dex', dc: 11,
          requires_class: ['ladino', 'ladrao', 'patrulheiro'],
          desc: 'Lâmina afiada desfaz o laço antes da tensão subir.',
          sNarr: 'Um talho rápido na fibra mestra desativa o mecanismo instantaneamente.',
          sNarr_by_subclass: {
            assassin: 'Com precisão cirúrgica de lâmina curta, você decepa a corda no ângulo cego sem produzir som.'
          },
          fNarr: 'A corda chicoteia e corta seu antebraço antes de partir.', dmg: 2 },
        { i: '💪', t: 'Romper a corda', stat: 'str', dc: 13,
          desc: 'Esforço bruto: arrebentar a corda antes do galho soltar.',
          sNarr: 'Você arrebenta a corda com força contínua — o galho dobrado solta-se com estalo seco e açoita o ar onde sua cabeça estaria.',
          sNarr_by_class: {
            barbaro: 'Sua fúria desperta. Um único arranco e a corda se parte como linha. O galho açoita inutilmente o ar atrás de você.',
            guerreiro: 'Disciplina muscular. Você tensiona o quadril, transfere o peso, e a corda cede no terceiro puxão.'
          },
          sNarr_by_race: {
            dwarf: 'Com a compleição atarracada de anão, você planta as solas no chão e arrebenta a corda no primeiro arranque.',
            halforc: 'Um rugido curto e a fibra da corda se rompe sob a força bruta dos seus braços.'
          },
          fNarr: 'A corda lacera sua pele antes de ceder — sangue desce pela bota.', dmg: 4 } ] },

    { title: 'Galho Despencando',
      script: [
        { type: 'narration', text: 'Um estalo seco no alto. Você ergue os olhos a tempo de ver um galho enorme se soltando do tronco — a árvore inteira parece ter morrido em silêncio nas últimas semanas.' },
        { type: 'narration', text: 'Folhas mortas chovem antes do peso real chegar. Você precisa decidir agora.' }
      ],
      choices: [
        { i: '🧗', t: 'Saltar pro lado', stat: 'dex', dc: 11,
          desc: 'Aproveitar os reflexos pra sair da zona de impacto.',
          sNarr: 'Salto leve, pés firmes a três metros do impacto. O galho atinge o chão com um baque que ecoa pela mata.',
          fNarr: 'Você tropeça e arranha o joelho contra a casca dura. O galho passa raspando — sorte de não acertar em cheio.', dmg: 2 },
        { i: '💪', t: 'Empurrar pra desviar', stat: 'str', dc: 12,
          desc: 'Tentar redirecionar o galho com força bruta enquanto cai.',
          sNarr: 'Você crava os ombros no galho e o desvia — ele cai paralelo à trilha. Suor escorre, mas você está inteiro.',
          fNarr: 'O galho é mais pesado do que parece — torce seu pulso e te empurra contra um tronco lateral.', dmg: 2 } ] },

    { title: 'Os Sussurros',
      script: [
        { type: 'narration', text: 'A trilha estreita. Folhas paradas mesmo quando deveria haver vento.' },
        { type: 'narration', text: 'Você ouve sussurros — não vento, não animal. <i>Vozes</i>, distantes mas íntimas, chamando seu nome.' },
        { type: 'narration', text: 'Os antigos chamam isso de "Eco da Floresta". Não responde, eles dizem. Quem responde, segue.' }
      ],
      choices: [
        { i: '🧠', t: 'Resistir e seguir', stat: 'wis', dc: 13,
          desc: 'Manter o foco. Não ouvir, não responder — só andar.',
          sNarr: 'Você fixa os olhos na trilha e murmura uma oração antiga. Os sussurros desbotam, mas o frio fica nos ossos.',
          sNarr_by_class: {
            clerigo: 'Sua fé ergue uma barreira invisível. Os sussurros se calam diante da palavra divina que você sussurra de volta.',
            mago: 'Você reconhece a frequência — magia antiga, persuasão sutil. Cancelar é trivial pra quem estuda os princípios.'
          },
          sNarr_by_alignment: {
            lawful: 'Você ancora-se em código e dever. As vozes não têm âncora pra te puxar.',
            chaotic: 'Você ri das vozes em alta voz. O choque do som humano dispersa o feitiço.'
          },
          fNarr: 'Por um instante você reconhece a voz da sua mãe. Você para. Quando volta a si, sangue escorre do nariz e há horas que você não anda.', dmg: 3 } ] },

    { title: 'Atoleiro Profundo',
      script: [
        { type: 'narration', text: 'A trilha desaparece em lama negra entre raízes torcidas. Cheira a folha morta e algo doce — apodrecimento prolongado.' },
        { type: 'narration', text: 'Seu pé já afundou até o tornozelo antes de você notar.' }
      ],
      choices: [
        { i: '🔍', t: 'Ler o terreno', stat: 'wis', dc: 12,
          desc: 'Encontrar trilha firme nas raízes mais grossas.',
          sNarr: 'Você lê o desenho das raízes — as antigas suportam peso, as jovens cedem. Cruzando pelas mais grossas, sai limpo.',
          sNarr_by_class: {
            patrulheiro: 'Você lê o pântano como página aberta. Em segundos identifica a trilha de javali que cruza o atoleiro — pisa firme onde eles pisaram, sem afundar.',
            druida: 'A floresta te diz onde pisar. As raízes da carvalho-mãe se firmam ligeiramente onde sua bota toca, oferecendo apoio.'
          },
          fNarr: 'Você afunda até as canelas. Vinte minutos de pânico depois, sai sujo, exausto, com algo se mexendo dentro da bota.', dmg: 2 } ] }
  ],

  plains: [
    { title: 'Vendaval de Poeira',
      script: [
        { type: 'narration', text: 'O céu fica amarelo de poeira a oeste. Em segundos, o vento muda de direção e bate forte no peito.' },
        { type: 'narration', text: 'A visibilidade despenca. Você sente areia nos dentes antes mesmo de fechar a boca.' }
      ],
      choices: [
        { i: '🛡', t: 'Resistir e seguir', stat: 'con', dc: 11,
          desc: 'Baixar a cabeça contra o vento e avançar contra a tempestade.',
          sNarr: 'Você baixa a cabeça e segue passo a passo. Quando o vento amaina, está mais perto do destino do que esperava.',
          fNarr: 'O vento o derruba; areia entra nos olhos e nas botas. Você perde tempo precioso esperando passar.', dmg: 2 },
        { i: '🗺', t: 'Buscar abrigo natural', stat: 'wis', dc: 12,
          desc: 'Procurar uma elevação ou pedra que sirva de quebra-vento.',
          sNarr: 'Você reconhece a forma de uma rocha mãe a vinte metros e se abriga atrás dela. O vento passa por cima sem te tocar.',
          fNarr: 'Não há abrigo. Você se agacha e espera, cuspindo areia.', dmg: 1 } ] },

    { title: 'Bandidos da Estrada',
      npc: { name: 'Líder dos Bandidos', desc: 'Veterano de guerra desempregado', portrait: '../shared/img/npcs/trail/lider-dos-bandidos.webp' },
      script: [
        { type: 'narration', text: 'Três figuras saem do trigal alto à esquerda. Um homem grisalho de armadura remendada à frente — os outros dois flanqueiam, espadas curtas.' },
        { type: 'speech', speaker: 'Líder dos Bandidos', text: '— Pare aí, viajante. <i>(o tom é cansado, não cruel)</i> Quem cruza nossas terras paga pedágio. Bolsa pra dentro do saco — ou cabeça pra dentro do trigal.' },
        { type: 'speech', speaker: 'Líder dos Bandidos', text: '— Não somos cruéis. Servimos numa guerra que acabou e o reino esqueceu. <b>Família precisa comer.</b> Decida rápido.' }
      ],
      choices: [
        { i: '🗣', t: 'Negociar com palavras', stat: 'cha', dc: 13,
          desc: 'Reconhecer a humanidade deles, oferecer uma compensação digna.',
          sNarr: 'Você reconhece o brasão na armadura dele — um regimento que serviu na fronteira norte. Sua voz muda de tom: você fala como quem entende. Ele baixa a espada. Você paga uma moeda — chama de "donativo aos veteranos".',
          sNarr_by_class: {
            paladino: 'Sua aura é inconfundível. O líder cospe no chão mas baixa a espada — não enfrenta um paladino na rota. "Passe. Mas se vir o senhor de Valdoria, lembre que esquecemos quem nos esqueceu."',
            bardo: 'Você canta. Apenas isso — uma canção que ele lutou ouvindo, três décadas atrás. Os olhos dele se enchem. "Passe, viajante. Hoje a estrada é sua."'
          },
          sNarr_by_subclass: {
            lore: 'Você recita a antiga anistia dos soldados do vale; surpresos por alguém recordar suas batalhas com exatidão, eles guardam as armas e desejam boa viagem.'
          },
          sNarr_by_race: {
            halfelf: 'Sua habilidade diplomática natural e tom conciliador desarmam a agressividade dos veteranos sem derramar sangue.',
            dragonborn: 'Sua presença nobre e olhar firme fazem os homens repensarem a tolice de tentar extorquir um guerreiro draconato.'
          },
          sNarr_by_alignment: {
            good: 'Você não vê inimigos — vê veteranos abandonados. Oferece dois pães da mochila e o nome de um templo que abriga ex-soldados. O líder aceita devagar.',
            evil: 'Você os intimida com cálculo frio: descreve a tortura que receberão se forem capturados. Eles recuam, pálidos.'
          },
          fNarr: 'Sua lábia é fraca. O líder cospe e avança. Sangue antes da fuga.', dmg: 5 },
        { i: '⚔️', t: 'Enfrentar os bandidos', isCombat: true, enemyId: 'bandit_leader',
          desc: 'Desembainhar as armas e combater o bando em confronto direto.' },
        { i: '🏃', t: 'Romper e fugir', stat: 'dex', dc: 12,
          desc: 'Surpreender com velocidade — ganhar a brecha entre os dois flanqueadores.',
          sNarr: 'Você dispara entre eles antes que percebam. Vinte metros depois, no trigal alto, eles desistem.',
          fNarr: 'Uma flecha o atinge nas costas antes de você sumir. O ferimento não é fatal mas sangra muito.', dmg: 4 } ] },

    { title: 'Cavalo Selvagem',
      script: [
        { type: 'narration', text: 'Você ouve cascos antes de ver. Um cavalo selvagem cruza a trilha em galope, olhos arregalados — fugindo de algo.' },
        { type: 'narration', text: 'Atrás dele, marcas de garras na grama. Algo grande, predador. Já passou.' }
      ],
      choices: [
        { i: '🔍', t: 'Investigar as marcas', stat: 'wis', dc: 12,
          desc: 'Identificar o predador antes de seguir.',
          sNarr: 'Garras de urso. Tamanho médio. Não está caçando — fugindo do incêndio que você não vê. Você acelera, agradecendo o aviso.',
          fNarr: 'Você não consegue ler as marcas direito. Segue cauteloso, com mão na arma o resto da etapa.', dmg: 1 },
        { i: '🏃', t: 'Continuar rápido', stat: 'dex', dc: 11,
          desc: 'Confiar que o predador já passou e ganhar distância.',
          sNarr: 'Você corre. Quando para, está duas léguas adiante e o som dos cascos sumiu.',
          fNarr: 'Você cansa antes do esperado. As pernas pesam pelo resto da jornada.', dmg: 2 } ] }
  ],

  swamp: [
    { title: 'Areia Movediça',
      script: [
        { type: 'narration', text: 'Seus pés afundam na lama sem aviso. Não é lama comum — sucção real, puxando pra baixo.' },
        { type: 'narration', text: 'Cada movimento te puxa mais fundo. Você sente o joelho desaparecer.' }
      ],
      choices: [
        { i: '🧠', t: 'Manter calma', stat: 'wis', dc: 12,
          desc: 'Movimentos lentos e deliberados. Não lutar contra a sucção.',
          sNarr: 'Você respira fundo, deita o peso pra trás, e se solta como uma planta saindo da terra. Lento. Contínuo. Vinte minutos depois, está livre.',
          sNarr_by_class: {
            druida: 'A lama te conhece. Você sussurra à terra e ela amolece, te oferecendo apoio sólido pra subir.',
            monge: 'Você esvazia a mente. O corpo encontra o ritmo certo: tensionar, relaxar, deslizar. Sai limpo, focado.'
          },
          sNarr_by_subrace: {
            lightfoot: 'Sua leveza de halfling impede que você afunde além do calcanhar; com calma, você desliza para solo seguro.'
          },
          sNarr_by_race: {
            gnome: 'Com tamanho pequeno e movimentos contínuos, você evita criar vácuo na lama e emerge ileso.'
          },
          fNarr: 'O pânico vence. Você se agita e afunda — só sai porque um galho próximo cede ao seu agarro.', dmg: 3 },
        { i: '🌿', t: 'Tracionar com raízes pantanosas', stat: 'wis', dc: 11,
          requires_class: ['druida', 'patrulheiro'],
          desc: 'Encontrar cipós resistentes ocultos sob a vegetação aquática.',
          sNarr: 'Seus olhos treinados encontram cipós firmes quase invisíveis na lama. Puxando-se com cadência, você se liberta com facilidade.',
          fNarr: 'O cipó se rompe sob seu peso e você bebe lama antes de alcançar uma raiz sólida.', dmg: 2 },
        { i: '💪', t: 'Forçar saída', stat: 'str', dc: 13,
          desc: 'Não há tempo: arrancar-se da lama com força bruta.',
          sNarr: 'Com esforço brutal você se liberta. Músculos queimam, mas você está inteiro.',
          fNarr: 'Você afunda mais antes de escapar. Lama nos pulmões — tosse molhada por horas.', dmg: 4 } ] },

    { title: 'Gás do Pântano',
      script: [
        { type: 'narration', text: 'Uma nuvem verde-pálida sobe das poças apodrecidas a três metros de você. O cheiro chega antes — doce, errado, como flores podres.' },
        { type: 'narration', text: 'Cabeça leve. Visão tremula. Você reconhece o gás de relatos: alucinógeno e tóxico em doses altas.' }
      ],
      choices: [
        { i: '🛡', t: 'Prender respiração', stat: 'con', dc: 13,
          desc: 'Atravessar a faixa contaminada sem inspirar.',
          sNarr: 'Você enche os pulmões antes da nuvem e atravessa a faixa contaminada. Quando expira, está limpo do outro lado.',
          fNarr: 'O gás queima seus pulmões — tosse cortando o peito. Você vê coisas pelo resto da etapa.', dmg: 4 },
        { i: '🗺', t: 'Rodear pela margem', stat: 'wis', dc: 11,
          desc: 'Subir pela margem mais alta do pântano e contornar.',
          sNarr: 'Você sobe pela margem e contorna a nuvem. Custa tempo, mas não custa pulmão.',
          fNarr: 'A margem é traiçoeira. Você escorrega e cai na água. Não foi a nuvem, mas foi feio.', dmg: 2 } ] },

    { title: 'Caçador Solitário',
      npc: { name: 'Caçador do Pântano', desc: 'Eremita que protege o ecossistema', portrait: '../shared/img/npcs/trail/cacador-do-pantano.webp' },
      script: [
        { type: 'narration', text: 'Você ouve uma flecha cravar numa árvore a um metro do seu rosto. Aviso, não erro.' },
        { type: 'speech', speaker: 'Caçador do Pântano', text: '— Pare aí. <i>(a voz vem das sombras das árvores)</i> Esse pântano não é estrada. Quem cruza paga.' },
        { type: 'speech', speaker: 'Caçador do Pântano', text: '— Não quero ouro. Quero promessa: o que você caçar aqui, você come ou usa. Nada de troféus, nada de venda. Concorda?' }
      ],
      choices: [
        { i: '🤝', t: 'Concordar', stat: null,
          desc: 'Aceitar os termos do pântano.',
          sNarr: 'Você concorda em voz alta. A flecha some da árvore ao seu lado — recolhida sem você ver. "Boa jornada, viajante. O pântano se lembra."',
          fNarr: '' },  // sem fail (concordar = always success)
        { i: '🗣', t: 'Negociar isenção', stat: 'cha', dc: 14,
          desc: 'Explicar que está só de passagem, não vai caçar nada.',
          sNarr: 'Você explica seu propósito com clareza. Ele aceita — silêncio do mato como assinatura. "Cruze rápido então. E olhe pra trás antes de entrar nas raízes grandes."',
          fNarr: 'Ele não acredita. Outra flecha — esta passa raspando o ombro. Você corre.', dmg: 3 } ] }
  ],

  mountain: [
    { title: 'Avalanche',
      script: [
        { type: 'narration', text: 'Um trovão sem nuvens — não, é neve. A montanha inteira se movendo na encosta acima.' },
        { type: 'narration', text: 'Você tem três segundos. Talvez quatro.' }
      ],
      choices: [
        { i: '🏃', t: 'Correr lateral', stat: 'dex', dc: 13,
          desc: 'Procurar a borda lateral do desabamento — fora da linha de queda.',
          sNarr: 'Você dispara em diagonal pra fora da linha de queda. A neve passa rugindo a três metros de você.',
          sNarr_by_subrace: {
            wood: 'Seus reflexos élficos te lançam encosta abaixo em saltos leves, desviando com maestria da avalanche.'
          },
          fNarr: 'A força da neve o derruba e arrasta vinte metros. Você emerge de cabeça pra baixo, gelo nos cabelos.', dmg: 5 },
        { i: '🏔', t: 'Reconhecer a fenda de abrigo', stat: 'int', dc: 11,
          requires_race: 'dwarf',
          desc: 'Identificar a cavidade natural segura na parede da montanha.',
          sNarr: 'Seus instintos telúricos localizam uma reentrância protegida na rocha. A torrente de neve passa por cima sem atingir você.',
          sNarr_by_subrace: {
            mountain: 'Como anão da montanha, você conhece cada tipo de fenda de desabamento; abrigado como uma pedra, você sai impecável.'
          },
          fNarr: 'A fenda é rasa demais e o turbilhão de gelo açoita suas costas.', dmg: 3 },
        { i: '🛡', t: 'Proteger-se em rocha', stat: 'con', dc: 12,
          desc: 'Encontrar uma rocha grande e ancorar-se nela.',
          sNarr: 'Você se prensa contra uma rocha-mãe. A neve quebra ao redor mas não te leva. Cinco minutos enterrado, depois você cava pra fora.',
          sNarr_by_class: {
            barbaro: 'Você crava as mãos na pedra e aguenta o impacto gelado com músculos retesados, rugindo contra a neve.'
          },
          fNarr: 'Pedras vêm com a neve. Quebra de costela. Você sobrevive mas dói cada respiração.', dmg: 4 } ] },

    { title: 'Fenda Profunda',
      script: [
        { type: 'narration', text: 'O caminho corta uma fenda. Quatro metros de largura — possível. O fundo se perde em escuridão azul, ar gelado subindo.' },
        { type: 'narration', text: 'Cair seria queda livre por mais tempo do que se quer pensar.' }
      ],
      choices: [
        { i: '🧗', t: 'Saltar', stat: 'str', dc: 12,
          desc: 'Recuo, corrida, salto de fé.',
          sNarr: 'Salto perfeito. Pés firmes do outro lado. Você se permite olhar pra trás, suspirar, seguir.',
          fNarr: 'Você escorrega na borda do salto e bate o ombro ao subir. Por um instante, achou que seria fim de tudo.', dmg: 3 } ] },

    { title: 'Vento Cortante',
      script: [
        { type: 'narration', text: 'Em altitude, o vento muda de natureza. Não é o vento das planícies. É <i>cortante</i> — cristais de gelo carregados.' },
        { type: 'narration', text: 'Sua roupa não é suficiente. O frio entra direto.' }
      ],
      choices: [
        { i: '🛡', t: 'Encolher e perseverar', stat: 'con', dc: 11,
          desc: 'Capa fechada, cabeça baixa, andar lento.',
          sNarr: 'Você se encolhe contra o vento. Cada passo dói mas você não para. O frio fica, mas o pior passa.',
          fNarr: 'Os dedos ficam dormentes. Você sente algo que pode ser perda permanente.', dmg: 3 } ] }
  ],

  desert: [
    { title: 'Tempestade de Areia',
      script: [
        { type: 'narration', text: 'O céu escurece a oeste num minuto. Areia dourada se ergue como muralha, vinda na sua direção.' },
        { type: 'narration', text: 'Você reconhece o sinal: há quem morra de tempestade de areia em pé. Decisão agora.' }
      ],
      choices: [
        { i: '🛡', t: 'Cobrir-se completamente', stat: 'con', dc: 12,
          desc: 'Manto sobre cabeça e rosto, deitar-se contra o vento.',
          sNarr: 'Você se enrola no manto e deita atrás de uma duna. A tempestade ruge por uma hora — quando passa, areia te cobre como cobertor.',
          sNarr_by_class: {
            patrulheiro: 'Você reconhece os ventos antes da maioria. Encontra abrigo perfeito atrás de uma rocha — emerge limpo.'
          },
          fNarr: 'A areia rasga sua pele através do tecido. Pequenos cortes em todo lugar.', dmg: 4 } ] },

    { title: 'Espelhismo Mortal',
      script: [
        { type: 'narration', text: 'Você vê um oásis a noventa metros — palmeiras, água azul. Bonito demais.' },
        { type: 'narration', text: 'Você sabe que pode ser miragem. Ou pode ser real e te salvar a vida.' }
      ],
      choices: [
        { i: '🧠', t: 'Verificar antes de seguir', stat: 'wis', dc: 12,
          desc: 'Observar os reflexos, o vento, sinais de que é miragem.',
          sNarr: 'A imagem treme demais nas bordas. Não há sinais reais — sem pegadas, sem aves. Miragem. Você guarda água e segue.',
          fNarr: 'Você corre pro oásis e descobre que era miragem só ao chegar. Hora de sol perdida, cantil quase vazio.', dmg: 3 } ] }
  ],

  snow: [
    { title: 'Lobo Solitário',
      npc: { name: 'Lobo Alfa', desc: 'Velho macho, sozinho — mais perigoso por isso', portrait: '../shared/img/npcs/trail/lobo-alfa.webp' },
      script: [
        { type: 'narration', text: 'Olhos amarelos brilham na neve à frente. Um lobo enorme, sozinho — o que é incomum. Lobos sozinhos são velhos, expulsos, ou famintos.' },
        { type: 'narration', text: 'Este parece os três. Ele não rosna. Apenas observa. Calcula.' },
        { type: 'narration', text: 'Você sente cheiro de sangue velho na pelagem dele. Não é seu primeiro humano.' }
      ],
      choices: [
        { i: '🗣', t: 'Intimidar', stat: 'cha', dc: 14,
          desc: 'Ergue o corpo todo, ruge baixo do peito, mostre que custa caro.',
          sNarr: 'Você ergue os braços, o corpo dobra de tamanho. Ruge baixo, do diafragma. O lobo hesita — então recua, três passos. Vira. Vai embora.',
          sNarr_by_class: {
            druida: 'Você fala — não com palavras. O lobo ouve no idioma dele. Compreende: não é presa hoje. Recua respeitoso.',
            barbaro: 'Sua aura primal é igual à dele, mas mais forte. O lobo reconhece um predador maior. Recua sem virar de costas.'
          },
          sNarr_by_subclass: {
            hunter: 'Você ergue o arco em silêncio absoluto. O lobo veterano reconhece a postura de um caçador mortal e se retira.'
          },
          sNarr_by_subrace: {
            mountain: 'Firme como um rochedo invernal, você bate a arma no escudo. O som metálico ecoa e afugenta a fera.'
          },
          fNarr: 'Ele ataca antes de fugir — dentes na sua perna. Sangue na neve, mas você sobrevive.', dmg: 4 },
        { i: '🐺', t: 'Impor domínio territorial', stat: 'cha', dc: 12,
          requires_race: ['dragonborn', 'halforc'],
          desc: 'Exibir imponência e ferocidade inabaláveis perante a fera.',
          sNarr: 'Sua presença avassaladora e postura ameaçadora fazem o lobo vacilar e recuar com a cauda entre as pernas.',
          fNarr: 'O lobo avança em investida rápida antes de se afastar, mordendo de raspão.', dmg: 3 },
        { i: '⚔️', t: 'Enfrentar a fera', isCombat: true, enemyId: 'dire_wolf',
          desc: 'Ficar em posição de guarda e combater o lobo feroz.' },
        { i: '🏃', t: 'Recuar devagar', stat: 'wis', dc: 12,
          desc: 'Não correr. Recuar passo a passo, sem virar de costas.',
          sNarr: 'Você recua sem provocar, olhando ele direto sem ameaça. O lobo perde interesse — não vale o esforço hoje.',
          fNarr: 'Você escorrega no gelo. Ele avança no instante da queda — mordida superficial.', dmg: 3 } ] },

    { title: 'Tempestade Branca',
      script: [
        { type: 'narration', text: 'A neve dobra de intensidade em segundos. Você não vê a três passos.' },
        { type: 'narration', text: 'Aqui é fácil rodar em círculos e morrer congelado a vinte metros do destino.' }
      ],
      choices: [
        { i: '🗺', t: 'Buscar marcadores', stat: 'wis', dc: 12,
          desc: 'Pedras grandes, troncos, qualquer linha visual pra orientar-se.',
          sNarr: 'Você identifica uma linha de pedras à esquerda. Segue por elas, passo a passo. Quando a tempestade abre, está exatamente onde devia estar.',
          fNarr: 'Você roda em círculos por horas. Quando se orienta, está exausto e a uma quilômetro do caminho.', dmg: 4 } ] }
  ],

  cave: [
    { title: 'Estalactite',
      script: [
        { type: 'narration', text: 'Um som no escuro — pedra raspando pedra. Você ergue a tocha e vê: a estalactite acima trincou. Vai cair.' },
        { type: 'narration', text: 'Imensa. Pesada. Imediata.' }
      ],
      choices: [
        { i: '🏃', t: 'Esquivar', stat: 'dex', dc: 13,
          desc: 'Sair da zona de impacto antes do peso chegar.',
          sNarr: 'Você se joga pro lado a tempo. A pedra crava no chão onde você estava e se quebra em três pedaços enormes.',
          sNarr_by_subclass: {
            shadow: 'Você se funde à sombra da caverna em um salto fluido; a estalactite desaba no vazio.'
          },
          sNarr_by_subrace: {
            drow: 'Habituado às ameaças da escuridão subterrânea, seu corpo reage por instinto puro, desviando com perfeição.'
          },
          fNarr: 'A pedra raspa em você antes de quebrar. Sangue do ombro.', dmg: 4 },
        { i: '⛏', t: 'Prever a fratura da rocha', stat: 'int', dc: 10,
          requires_race: 'dwarf',
          desc: 'Conhecimento de pedra: identificar o ponto cego da queda.',
          sNarr: 'Seus olhos acostumados à pedra profunda calculam o ângulo exato do impacto. Você recua um passo e a rocha se espatifa sem te tocar.',
          fNarr: 'A rocha trinca em ângulo irregular e lascas cortam seu braço.', dmg: 2 } ] },

    { title: 'Eco Estranho',
      script: [
        { type: 'narration', text: 'Você ouve seus passos voltando como eco — mas os ecos não estão sincronizados. Há mais ecos do que passos.' },
        { type: 'narration', text: 'Você para. Os ecos param. Mas há um milissegundo a mais, um eco que se atrasa. Algo está te imitando.' }
      ],
      choices: [
        { i: '🧠', t: 'Identificar a fonte', stat: 'int', dc: 13,
          desc: 'Pensar friamente. Bater pedras em ritmos errados pra mapear o intruso.',
          sNarr: 'Você bate pedras em ritmo irregular. O imitador erra um pulso. Você localiza a direção e sai pelo lado oposto, em silêncio.',
          sNarr_by_subrace: {
            drow: 'Acostumado à escuridão do subterrâneo profundo, você distingue o ruído de garras na pedra e antecipa a criatura com facilidade.'
          },
          fNarr: 'Você não localiza. Quando segue, sente algo seguindo a passos atrás. Não vira pra ver.', dmg: 3 },
        { i: '⚔️', t: 'Investir contra o perseguidor', isCombat: true, enemyId: 'troglodyte',
          desc: 'Girar com a arma em punho e atacar a criatura das sombras.' } ] }
  ],

  graveyard: [
    { title: 'Espíritos Inquietos',
      script: [
        { type: 'narration', text: 'O ar fica gelado, denso. Vultos translúcidos cercam você — não veem você, mas sentem você.' },
        { type: 'narration', text: 'Sussurros sem palavras. Mãos sem corpos passando rente ao seu rosto.' },
        { type: 'narration', text: 'Eles testam quem cruza. Quem cede ao medo, fica. Quem resiste, passa.' }
      ],
      choices: [
        { i: '🧠', t: 'Resistir mentalmente', stat: 'wis', dc: 13,
          desc: 'Manter a mente firme. Não pensar. Não lembrar. Apenas andar.',
          sNarr: 'Sua vontade afasta os espíritos. Eles dispersam-se em fumaça relutante. O frio fica, mas você passa.',
          sNarr_by_class: {
            clerigo: 'Sua presença divina é insuportável pra eles. Os espíritos se dissolvem como cera ao sol — alguns sussurrando "obrigado".',
            paladino: 'Você ergue a mão e fala uma palavra de juramento. Os espíritos se afastam — alguns se ajoelhando antes de sumir.'
          },
          sNarr_by_race: {
            elf: 'Sua mente imune ao sono encantado repele com facilidade o assédio dos espíritos.'
          },
          sNarr_by_subrace: {
            high: 'Sua disciplina mental de alto elfo ergue uma barreira impenetrável contra as sombras da névoa.'
          },
          fNarr: 'O medo paralisa você por instantes. Quando volta a si, sente lágrimas no rosto. Você lembrou de coisas que não devia.', dmg: 3 },
        { i: '🕯', t: 'Canalizar autoridade espiritual ou arcana', stat: 'wis', dc: 11,
          requires_class: ['clerigo', 'paladino', 'bruxo', 'mago'],
          desc: 'Impor reverência ou expulsar as almas com poder sobrenatural.',
          sNarr: 'Sua autoridade ecoa pelo cemitério. As almas errantes reconhecem o poder em sua voz e abrem passagem com respeito fúnebre.',
          sNarr_by_subclass: {
            devotion: 'A luz de seu juramento dissipa a aflição das almas, trazendo-lhes um instante de paz antes de sumirem.',
            fiend: 'Sua marca infernal arde no ar; os espíritos menores recuam aterrorizados perante o fogo sobrenatural.'
          },
          fNarr: 'As vozes das almas ecoam estridentes na sua mente, drenando sua concentração.', dmg: 3 },
        { i: '🏃', t: 'Correr através', stat: 'dex', dc: 12,
          desc: 'Velocidade pura. Não dar tempo deles te tocarem.',
          sNarr: 'Você corre. Vinte segundos depois, está do outro lado, ofegante mas inteiro.',
          fNarr: 'Um toque gelado nas costas drena sua energia. Você chega exausto.', dmg: 4 },
        { i: '⚔️', t: 'Banir os espectros pela lâmina', isCombat: true, enemyId: 'skeleton',
          desc: 'Desembainhar sua arma e purificar as aparições em combate.' } ] },

    { title: 'Lápide Trincada',
      script: [
        { type: 'narration', text: 'Você passa por uma lápide trincada de cima a baixo. A inscrição é antiga: "DESPERTE-ME E EU FAREI MAIS DO QUE SEU MELHOR INIMIGO".' },
        { type: 'narration', text: 'A trinca é nova. Recente. Algo tentando sair.' }
      ],
      choices: [
        { i: '🚶', t: 'Apenas seguir', stat: null,
          desc: 'Não fazer ruído. Não olhar duas vezes. Passar.',
          sNarr: 'Você passa em silêncio. A lápide não se move. Mas você jura ter ouvido um suspiro às suas costas, vinte passos depois.',
          fNarr: '' },
        { i: '🗣', t: 'Falar uma oração', stat: 'wis', dc: 12,
          desc: 'Bênção sussurrada — pacificar o que está dentro.',
          sNarr: 'Você sussurra a oração que sua avó ensinou. A trinca para de avançar. Você sente paz como uma mão pousada no ombro.',
          fNarr: 'Sua oração é fraca ou errada. A trinca abre mais um centímetro. Você apressa o passo.', dmg: 2 } ] }
  ],

  volcanic: [
    { title: 'Erupção Lateral',
      script: [
        { type: 'narration', text: 'A terra treme. Vinte metros à frente, o solo se rompe — lava escorre por uma fissura nova.' },
        { type: 'narration', text: 'O calor chega antes do líquido. Você sente o ar queimando sua pele.' }
      ],
      choices: [
        { i: '🏃', t: 'Saltar pra terra firme', stat: 'dex', dc: 13,
          desc: 'Identificar uma rocha mais alta, salto de fé sobre a fissura.',
          sNarr: 'Você salta pra terra firme antes da lava chegar. Aterrissa pesado, mas inteiro.',
          sNarr_by_subclass: {
            champion: 'Com força atlética inabalável, você transpõe a brecha de lava em um único salto magistral.'
          },
          sNarr_by_subrace: {
            rock: 'Você calcula o ponto de aterrissagem mais estável na rocha vulcânica e salta com precisão geométrica.'
          },
          fNarr: 'Faíscas queimam suas pernas. Você cruza, mas dói cada passo pelo resto da etapa.', dmg: 5 },
        { i: '🔥', t: 'Avançar pela fumaça térmica', stat: 'con', dc: 10,
          requires_race: ['tiefling', 'dragonborn'],
          desc: 'Aproveitar resistência inata ao calor para cruzar sem recuar.',
          sNarr: 'Seu sangue resistente ao fogo ignora o bafo abrasador da lava. Você atravessa as cinzas incandescentes com passos firmes.',
          fNarr: 'O vapor superaquecido atinge seus olhos por um instante, forçando um desvio repentino.', dmg: 2 } ] },

    { title: 'Cinzas Quentes',
      script: [
        { type: 'narration', text: 'Cinzas caem como neve preta sobre você. Algumas ainda estão quentes — pequenas brasas voando.' },
        { type: 'narration', text: 'Sua roupa começa a chiar. Você precisa de cobertura.' }
      ],
      choices: [
        { i: '🛡', t: 'Cobertura completa', stat: 'con', dc: 12,
          desc: 'Manto encharcado de cantil, cabeça encolhida.',
          sNarr: 'Você molha o manto e se cobre. Cinzas queimam o tecido externo, mas você passa sem queimar pele.',
          fNarr: 'Algumas brasas pegam no cabelo. Você apaga rapidamente, mas o susto fica.', dmg: 3 } ] }
  ]
};

var HAZARDS_EXTRA = {
  forest: [
    { title: 'O Veado Sangrado',
      script: [
        { type: 'narration', text: 'Um veado emerge da mata correndo, ferida aberta no flanco. Não te vê — está em pânico.' },
        { type: 'narration', text: 'Atrás dele, uivos. Lobos caçando. O veado é a presa, mas você cruzou a trilha de caça deles.' }
      ],
      choices: [
        { i: '🌿', t: 'Esconder-se na vegetação', stat: 'dex', dc: 12,
          desc: 'Camuflagem entre samambaias até o bando passar.',
          sNarr: 'Você se afunda nas samambaias. Quatro lobos cruzam a trilha em fila silenciosa, focados no rastro de sangue.',
          sNarr_by_class: {
            patrulheiro: 'Você se torna parte da floresta — lobos passam a um metro sem te perceber. Você nota dois com pelagem prateada — bando incomum.',
            druida: 'Você sussurra à floresta e ela te abriga. Os lobos sentem a ausência onde você está.'
          },
          fNarr: 'Um galho range sob seu pé. O lobo da retaguarda desvia da caça e te encara.', dmg: 4 },
        { i: '🏹', t: 'Subir uma árvore', stat: 'str', dc: 13,
          desc: 'Tronco grosso a três metros — escalada rápida.',
          sNarr: 'Você sobe rápido, agarra galho firme. Os lobos passam embaixo, sem olhar pra cima.',
          fNarr: 'A casca cede sob seus dedos. Você cai e bate as costas contra raízes.', dmg: 5 },
        { i: '⚔️', t: 'Enfrentar a matilha de lobos', isCombat: true, enemyId: 'dire_wolf',
          desc: 'Desembainhar sua arma e interceptar os lobos em combate aberto.' } ] },

    { title: 'O Andarilho Cego',
      npc: { name: 'Velho Andarilho', desc: 'Eremita cego que conhece a floresta de cor', portrait: '../shared/img/npcs/velho-andarilho.webp' },
      script: [
        { type: 'narration', text: 'Um velho de barba branca caminha sozinho na trilha, bastão de madeira tateando o chão. Os olhos são leitosos — cego.' },
        { type: 'speech', speaker: 'Velho Andarilho', text: '— Pare, viajante. <i>(a voz é serena)</i> Sinto teus passos há quinze minutos. Andas com pressa, mas sem rumo claro.' },
        { type: 'speech', speaker: 'Velho Andarilho', text: '— A floresta me conta coisas. <b>Adiante há perigo</b> — não preciso vê-lo pra saber. Posso te indicar atalho seguro, em troca de uma palavra de gentileza ou uma moeda. Você decide.' }
      ],
      choices: [
        { i: '🤝', t: 'Aceitar gentileza', stat: 'cha', dc: 11,
          desc: 'Conversar honestamente, ouvir as histórias dele em troca da rota segura.',
          sNarr: 'Você senta com ele dez minutos. Ele conta como ficou cego — uma rixa antiga com uma bruxa local. No fim, descreve um atalho que economiza meia légua e evita um ninho de aranhas.',
          sNarr_by_alignment: {
            good: 'Você se conecta genuinamente. O velho sorri pela primeira vez em meses. "Tu tens coração limpo. Que a floresta te abrace."'
          },
          fNarr: 'Você é educado mas distante. Ele te indica o atalho mas avisa: "O caminho é teu, mas a floresta sente quem vem com pressa demais."', dmg: 0 },
        { i: '🪙', t: 'Pagar uma moeda', stat: null,
          desc: 'Transação direta, sem meias palavras.',
          sNarr: 'Ele aceita a moeda com leve aceno. "Direita na primeira bifurcação após o carvalho rachado. Boa jornada." A trilha indicada corta meia légua de mata fechada.',
          fNarr: '' },
        { i: '➡️', t: 'Ignorar e seguir', stat: 'wis', dc: 12,
          desc: 'Confiar na sua própria orientação, deixar o velho.',
          sNarr: 'Você sente que está no rumo certo. Cumprimenta o velho e segue. Sua intuição estava certa — chega bem.',
          fNarr: 'A trilha que você escolhe leva ao ninho de aranhas que ele teria avisado. Picadas múltiplas.', dmg: 4 } ] },

    { title: 'Cogumelo Errado',
      script: [
        { type: 'narration', text: 'Você está com fome. Um talhão de cogumelos brancos cresce ao lado da trilha — gordos, frescos, tentadores.' },
        { type: 'narration', text: 'Algo te puxa pra trás na memória: ouviste alguém falar sobre cogumelos da floresta, mas o quê exatamente?' }
      ],
      choices: [
        { i: '🧠', t: 'Examinar com atenção', stat: 'int', dc: 13,
          desc: 'Identificar a espécie pela cor das lamelas, cheiro, base do talo.',
          sNarr: 'Você ergue um cogumelo, examina a base. Lamelas brancas com manchas amareladas. Anel duplo no talo. <b>Amanita phalloides</b> — o "anjo destruidor". Mortal. Você descarta com cuidado e busca uma alternativa segura.',
          sNarr_by_class: {
            druida: 'Você reconhece de imediato — chapéu verde-oliva, esporada branca como neve. Anjo destruidor. Você sabe os 3 cogumelos comestíveis a vinte metros de distância. Almoça.',
            patrulheiro: 'Anjo destruidor. Você não come essa floresta há vinte anos por idiotice.'
          },
          fNarr: 'Você não tem certeza, mas a fome aperta. Come dois. Em vinte minutos, dor abdominal severa começa.', dmg: 6 },
        { i: '🚶', t: 'Não comer', stat: null,
          desc: 'Manter prudência — não vale o risco.',
          sNarr: 'Você passa direto. Estômago reclama mas você sabe que essa é a decisão certa. Aguenta até o destino.',
          fNarr: '' } ] },

    { title: 'Encontro com Fada',
      npc: { name: 'Fada da Trilha', desc: 'Pequena criatura mágica de luz dourada', portrait: '../shared/img/npcs/trail/fada-da-trilha.webp' },
      script: [
        { type: 'narration', text: 'Uma luz dourada flutua à sua frente. Não é vagalume — tem forma humana minúscula, asas translúcidas batendo rápido.' },
        { type: 'speech', speaker: 'Fada da Trilha', text: '— Aventureiro grandalhão! <i>(voz fina, ágil)</i> Tenho um pedido — e uma oferta. Decide rápido, tenho mais cinco trilhas pra cuidar essa noite.' },
        { type: 'speech', speaker: 'Fada da Trilha', text: '— Um sapo está preso numa raiz oca a vinte metros. Liberte-o e eu te abro um atalho mágico até o destino — chega bem mais rápido. Recuse e eu sigo viagem — sem rancor, mas sem ajuda.' }
      ],
      choices: [
        { i: '🐸', t: 'Libertar o sapo', stat: 'dex', dc: 11,
          desc: 'Movimentos delicados, mãos pequenas, paciência.',
          sNarr: 'Você se ajoelha e tira o sapo da raiz com cuidado. Ele coaxa agradecido e some na samambaia. A fada pisca rápido. "Combinado!" Ela acena a varinha — luz dourada desenha no ar uma trilha curta que você não tinha visto. Você atravessa em minutos o que levaria horas.',
          sNarr_by_class: {
            druida: 'Você fala com o sapo enquanto solta. Ele explica como caiu. A fada se impressiona: "Druida raro. Volte aqui, sou Lirimel — devo-lhe três favores agora."'
          },
          fNarr: 'Você puxa com força demais. O sapo se assusta e foge antes de você liberá-lo direito. A fada balança a cabeça e voa embora.', dmg: 0 },
        { i: '➡️', t: 'Recusar e seguir', stat: null,
          desc: 'Você não tem tempo pra missões de fada.',
          sNarr: 'A fada dá de ombros. "Justo. Outra hora então." Some em piscar de luz dourada.',
          fNarr: '' } ] },

    { title: 'Trilha Bifurcada',
      script: [
        { type: 'narration', text: 'A trilha se divide em duas. À esquerda, mais curta mas com terreno irregular. À direita, mais longa mas com pegadas frescas — de quem? Difícil dizer.' },
        { type: 'narration', text: 'Você precisa decidir.' }
      ],
      choices: [
        { i: '🔍', t: 'Estudar as pegadas', stat: 'wis', dc: 13,
          desc: 'Identificar quem passou recentemente.',
          sNarr: 'Botas humanas, número 41-42, peso ~75kg, andando rápido. Provavelmente comerciante ou mensageiro com pressa. Direção correta. Você segue à direita com confiança.',
          sNarr_by_class: {
            patrulheiro: 'Você lê as pegadas como livro. Caçador, sozinho, há uma hora. Profissional. Se ele passou, é seguro.',
            ladrao: 'Pegadas falsas. Alguém passou em zigue-zague pra parecer mais. Provavelmente armadilha. Esquerda então.'
          },
          fNarr: 'Você não consegue tirar conclusão clara. Decide na intuição — e erra. A trilha escolhida demora muito mais.', dmg: 0 } ] },

    { title: 'Ninho de Aranhas Pequenas',
      script: [
        { type: 'narration', text: 'Teias finas atravessam a trilha em altura de cabeça. Você não vê as aranhas mas sente o cheiro doce-azedo do veneno delas no ar.' },
        { type: 'narration', text: 'Aranhas pequenas — não fatais, mas dolorosas em conjunto.' }
      ],
      choices: [
        { i: '🔥', t: 'Queimar com tocha', stat: 'dex', dc: 11,
          desc: 'Acender uma tocha e queimar as teias rapidamente.',
          sNarr: 'O fogo crepita pelas teias e abre passagem. Você atravessa rápido enquanto aranhas caem chamuscadas no chão.',
          fNarr: 'A tocha solta faísca em folha seca. Você apaga antes de virar incêndio mas perde tempo precioso.', dmg: 2 },
        { i: '🛡', t: 'Forçar passagem', stat: 'con', dc: 13,
          desc: 'Avançar empurrando as teias, aceitando algumas mordidas.',
          sNarr: 'Você passa pisando duro. Algumas aranhas mordem mas são mordidas leves — sua armadura aguenta a maioria.',
          fNarr: 'Várias mordidas em sequência. Inchaço, ardor, mas você passa. Vai descansar mal hoje.', dmg: 3 } ] },

    { title: 'Túmulo Coberto de Musgo',
      script: [
        { type: 'narration', text: 'Uma pedra retangular cresce do solo, coberta de musgo. Você se aproxima — é uma lápide antiga, talvez cinquenta anos esquecida.' },
        { type: 'narration', text: 'Inscrição quase ilegível: "Aqui descansa <i>(nome apagado)</i> — Que sua alma encontre paz mais doce que esta floresta."' }
      ],
      choices: [
        { i: '🙏', t: 'Oração silenciosa', stat: null,
          desc: 'Respeito pelo ancestral desconhecido.',
          sNarr: 'Você sussurra uma oração genérica de paz. Sente algo leve passar — não medo, mas gratidão. Por dois passos, você sente o caminho mais leve.',
          fNarr: '' },
        { i: '🔍', t: 'Ler a inscrição completa', stat: 'int', dc: 14,
          desc: 'Decifrar o nome apagado pelos séculos.',
          sNarr: 'Você arranha o musgo cuidadosamente. <b>Mara, a Curandeira de Valdoria — 1247-1289</b>. Lendária. Você sente que a história dela merece ser contada quando voltar à cidade.',
          fNarr: 'Você arranha demais e quebra um pedaço da pedra. Constrangido, deixa-a quebrada e segue.', dmg: 1 } ] }
  ],

  plains: [
    { title: 'Mendigo de Estrada',
      npc: { name: 'Mendigo de Estrada', desc: 'Velho com olhos vivos demais pra ser apenas mendigo', portrait: '../shared/img/npcs/trail/mendigo-de-estrada.webp' },
      script: [
        { type: 'narration', text: 'Um homem maltrapilho está sentado na borda da trilha. Quando você se aproxima, ele ergue o olhar — verde brilhante, lúcido demais pra alguém em condição assim.' },
        { type: 'speech', speaker: 'Mendigo de Estrada', text: '— Aventureiro... <i>(estende mão sem desespero)</i> Uma moeda? Eu te conto uma história em troca. Toda história tem valor de moeda — mais ou menos.' }
      ],
      choices: [
        { i: '🪙', t: 'Dar uma moeda', stat: null,
          desc: 'Compaixão simples.',
          sNarr: 'Ele guarda a moeda e fecha os olhos. "Há um carrinho de mercador caído cinco minutos à frente. Maçãs derramadas. O dono pagou bem caro pelas maçãs — guarda alguma pra ele encontrar de volta. Boa jornada." Você cruza o local — ele estava certo.',
          fNarr: '' },
        { i: '🗣', t: 'Conversar sem dar nada', stat: 'cha', dc: 12,
          desc: 'Tentar extrair informação sem custo.',
          sNarr: 'Vocês conversam dez minutos. Ele percebe que você quer informação grátis mas decide te dar mesmo assim — "porque é jovem e tem coração no lugar". Aviso útil.',
          fNarr: 'Ele cala-se assim que percebe sua intenção. Você sai sem nada além de constrangimento.', dmg: 0 } ] },

    { title: 'Ovo Caído',
      script: [
        { type: 'narration', text: 'Um ovo grande — maior que ovo de galinha — está no meio da trilha, intacto. Você ergue os olhos: ninho de algum pássaro grande à dez metros de altura.' },
        { type: 'narration', text: 'A mãe está longe, ou caçando. Você tem a opção de tentar devolver, levar, ou ignorar.' }
      ],
      choices: [
        { i: '🪺', t: 'Devolver ao ninho', stat: 'str', dc: 14,
          desc: 'Escalada perigosa segurando o ovo.',
          sNarr: 'Você sobe com cuidado, ovo na bolsa. Coloca de volta no ninho. Pequeno chip na casca mas vivo. Quando desce, vê três falcões circulando — não atacaram. Talvez tenham notado.',
          sNarr_by_class: {
            patrulheiro: 'Você sobe devagar pra não pôr mãe em pânico se ela voltar. Coloca o ovo. Em cinco minutos a mãe volta — não te ataca, fica em alerta. Boa decisão.',
            druida: 'Você sente a presença da mãe-falcão a cem metros. Ela sente você de volta. Sobe permitido. Coloca. Desce. Permitido. Carma positivo.'
          },
          fNarr: 'Você escorrega na descida. O ovo sobrevive na bolsa mas o ombro não.', dmg: 3 },
        { i: '🍳', t: 'Levar pra comer depois', stat: null,
          desc: 'Calorias gratuitas pra estrada.',
          sNarr: 'Você guarda o ovo. Mais tarde, vai assar uma proteína decente.',
          sNarr_by_alignment: {
            evil: 'Pragmático. Carma neutro — sobrevivência primeiro.',
            good: 'Você se sente um pouco culpado mas o estômago aperta.'
          },
          fNarr: '' } ] },

    { title: 'Carcaça de Ovelha',
      script: [
        { type: 'narration', text: 'Uma ovelha morta no meio do trigal. Sangue ainda fresco mas começando a coalhar — meia hora, talvez uma. Lobos? Predador maior?' },
        { type: 'narration', text: 'Marcas de garra grandes demais pra lobo. Algo se agitou aqui há pouco.' }
      ],
      choices: [
        { i: '🔍', t: 'Investigar com cuidado', stat: 'wis', dc: 13,
          desc: 'Identificar o predador antes de seguir.',
          sNarr: 'Garras de urso. Marcas frescas mas o predador foi embora — você vê o rastro indo na direção contrária à sua. Você passa em segurança mas com mão na arma.',
          sNarr_by_class: {
            patrulheiro: 'Urso pardo, macho, pesando uns 280kg. Já se afastou rumo norte. Você está seguro, mas evita parar nesta área.',
            ladrao: 'Não é caça natural. As marcas são forçadas — alguém matou a ovelha e dispôs as marcas pra parecer urso. Estranho. Você passa rápido.'
          },
          fNarr: 'Você não consegue ler direito as marcas. Segue cauteloso e perde tempo olhando pra trás.', dmg: 1 } ] },

    { title: 'Mulher do Poço',
      npc: { name: 'Mulher do Poço', desc: 'Camponesa carregando dois baldes pesados', portrait: '../shared/img/npcs/trail/mulher-do-poco-v2.webp' },
      script: [
        { type: 'narration', text: 'Uma camponesa caminha pela trilha com dois baldes de água, balança difícil. Ela tropeça quando você passa, mas não derrama — equilibrio de quem fez isso muitas vezes.' },
        { type: 'speech', speaker: 'Mulher do Poço', text: '— Bom dia, viajante! <i>(sorriso cansado)</i> Vem dos Portões? Diga-me, ainda há festa esta noite na praça? Ouvi rumor de bardo novo.' }
      ],
      choices: [
        { i: '🗣', t: 'Conversar gentilmente', stat: null,
          desc: 'Atualizar ela sobre eventos da cidade.',
          sNarr: 'Você passa cinco minutos. Ela te conta dos bandidos do trigal — onde se escondem, quando atacam, quantos são. "Sabe-se quem vem peço descanso na minha casa, dos vai vir." Atalho útil pra próximas vezes.',
          fNarr: '' },
        { i: '💪', t: 'Ajudar com os baldes', stat: 'str', dc: 11,
          desc: 'Carregar até a casa dela — ato de bondade simples.',
          sNarr: 'Você ergue os baldes com facilidade. Ela aponta a casinha a uma centena de metros. Em troca, ela te dá pão fresco da manhã. <i>+5 HP recuperados quando comer.</i>',
          fNarr: 'Você quase derruba um balde. Ela ri — "deixa pra eu mesma, viajante. Boa intenção contou." Você segue.', dmg: 0 } ] },

    { title: 'Tempestade Distante',
      script: [
        { type: 'narration', text: 'O céu escurece dramaticamente a oeste. Trovões ainda longe, mas vindo na sua direção.' },
        { type: 'narration', text: 'Você tem 10-15 minutos antes da chuva forte chegar.' }
      ],
      choices: [
        { i: '🏃', t: 'Correr até o destino', stat: 'con', dc: 13,
          desc: 'Acelerar o passo — chegar antes da tempestade.',
          sNarr: 'Você galopa. Pulmões queimando, suor escorrendo. Quando alcança abrigo no destino, a chuva chega ofegante atrás. Conseguiu.',
          fNarr: 'Você cansa antes do esperado. A chuva te alcança no meio do caminho — calado e gelado.', dmg: 3 },
        { i: '🌳', t: 'Buscar abrigo natural', stat: 'wis', dc: 12,
          desc: 'Procurar uma árvore grande ou rocha protetora.',
          sNarr: 'Você encontra um carvalho enorme com galhos baixos densos. Espera vinte minutos da tempestade passar protegido. Sai apenas levemente úmido.',
          fNarr: 'O abrigo escolhido é insuficiente. Chove forte sobre você. Você fica calado mas continua.', dmg: 1 } ] }
  ],

  swamp: [
    { title: 'Lampião Cego',
      script: [
        { type: 'narration', text: 'Uma luz mortiça flutua a vinte metros de altura, lentamente. Não é fogo-fátuo — muito grande, muito constante. Forma algo entre lanterna e olho.' },
        { type: 'narration', text: 'Algumas tribos do pântano falam de lampiões cegos — espíritos antigos que guiam ou desviam viajantes, dependendo da intenção.' }
      ],
      choices: [
        { i: '🙏', t: 'Acenar com respeito', stat: 'cha', dc: 12,
          desc: 'Cumprimentar o espírito formalmente, sem medo.',
          sNarr: 'Você ergue a mão e faz menção respeitosa. A luz pulsa duas vezes — aceitação. Por uma hora, ela acompanha você de longe, e quando chega ao destino, dissipa-se. Caminho seguro.',
          sNarr_by_class: {
            clerigo: 'Sua aura divina é reconhecida. O lampião baixa devagar, fica a três metros, e quando você prossegue, vai junto — protegendo. Espírito amigo.',
            druida: 'Você sussurra o nome antigo (que druidas aprendem novatos). Luz brilha quente. "Prossiga, conhecedor."'
          },
          fNarr: 'Sua hesitação fala mais alto que o respeito. Luz se distancia — neutra. Você passa sem ajuda nem ameaça.', dmg: 0 } ] },

    { title: 'Cobra-Coral',
      script: [
        { type: 'narration', text: 'Listras vermelhas e amarelas se movem entre as raízes. Cobra-coral, um metro de comprimento. Letal.' },
        { type: 'narration', text: 'Ela ainda não te viu — concentrada num lagarto à sua frente.' }
      ],
      choices: [
        { i: '🤫', t: 'Passar em silêncio', stat: 'dex', dc: 13,
          desc: 'Movimentos lentos, sem som, ampla volta.',
          sNarr: 'Cada passo deliberado. A cobra continua focada no lagarto. Você passa sem ela jamais saber.',
          fNarr: 'Um galho range. Ela vira instantânea. Bote rápido. Sangue.', dmg: 5 },
        { i: '⚔', t: 'Matar à distância', stat: 'dex', dc: 14,
          desc: 'Adaga arremessada — uma chance só.',
          sNarr: 'A adaga voa pura. Cobra morta antes do bote. Você recolhe o veneno (uso futuro?) e prossegue.',
          fNarr: 'A adaga desvia. A cobra ataca defensiva. Você se afasta antes de mais bote mas leva mordida no braço.', dmg: 6 } ] },

    { title: 'Pescador Solitário',
      npc: { name: 'Pescador do Pântano', desc: 'Homem velho com canas no ombro', portrait: '../shared/img/npcs/trail/pescador-do-pantano.webp' },
      script: [
        { type: 'narration', text: 'Você vê uma figura solitária à beira da água, pescando. Cana de bambu, paciência infinita.' },
        { type: 'speech', speaker: 'Pescador do Pântano', text: '— Quieto aí, viajante! <i>(sussurra sem virar)</i> Tem uma carpa-fantasma vindo. Vinte minutos esperando ela. Fica quieto cinco minutos comigo, eu te dou rota segura depois.' }
      ],
      choices: [
        { i: '🤐', t: 'Esperar em silêncio', stat: 'wis', dc: 11,
          desc: 'Cinco minutos de absoluta paciência.',
          sNarr: 'Você fica quieto. A linha tensiona. Ele puxa devagar — uma carpa enorme, escamas prateadas como se carregassem luz própria. "Hoje os deuses fartaram." Te indica caminho seco através do pântano. <i>+5 XP por bondade observada.</i>',
          fNarr: 'Você se mexe demais. A carpa foge. Ele balança a cabeça mas sem rancor. "Tudo bem. Sigue, jovem."', dmg: 0 } ] }
  ],

  mountain: [
    { title: 'Águia Caída',
      script: [
        { type: 'narration', text: 'Uma águia enorme está caída numa pedra, asa torcida. Não morta — só ferida. Ela te encara com olhos amarelos furiosos.' },
        { type: 'narration', text: 'Você poderia ajudá-la ou apenas seguir. As duas opções têm consequências.' }
      ],
      choices: [
        { i: '🩹', t: 'Tentar ajudar', stat: 'wis', dc: 14,
          desc: 'Aproximar-se com cuidado, alinhar a asa, fazer talas com galhos.',
          sNarr: 'Movimentos calmos. Ela debate-se mas você acalma com voz baixa. A asa volta no lugar — provavelmente vai voar de novo em uma semana. Quando você sai, ela emite grasnido baixo. Reconhecimento.',
          sNarr_by_class: {
            druida: 'A águia te reconhece como aliado de animais. Permite imediatamente. Você cura mais rápido — e ela voa apenas cinco minutos depois, te seguindo um pouco antes de partir.'
          },
          fNarr: 'Ela te bica forte. Você desiste e segue. Quando volta a olhar, ela morreu sozinha. Pena.', dmg: 3 },
        { i: '➡️', t: 'Não interferir', stat: null,
          desc: 'Natureza segue seu curso.',
          sNarr: 'Você segue. Quando passa de novo no caminho de volta dias depois, ainda vê a águia em uma pedra próxima — viveu. Forte.',
          fNarr: '' } ] }
  ],

  desert: [
    { title: 'Caravana Distante',
      script: [
        { type: 'narration', text: 'Você vê uma caravana três quilômetros adiante — pequenos pontos escuros no horizonte. Cinco camelos, talvez seis figuras humanas. Eles também te viram.' },
        { type: 'narration', text: 'Mercadores legítimos, ou bandidos vestidos? No deserto, nem sempre dá pra saber até estar perto.' }
      ],
      choices: [
        { i: '🌵', t: 'Aproximar-se cauteloso', stat: 'wis', dc: 13,
          desc: 'Avançar com mão na arma, ler sinais.',
          sNarr: 'Mercadores. Bandeirinhas com símbolo de Pormeria — guilda mercantil legítima. Você cruza com eles, troca duas palavras de gentileza. Eles te oferecem água em troca de notícias. Boa troca.',
          fNarr: 'Bandidos. Você percebe tarde demais. Eles avançam — você precisa correr ou lutar.', dmg: 4 },
        { i: '🏜', t: 'Desviar — rota alternativa', stat: 'wis', dc: 12,
          desc: 'Não vale arriscar. Tomar volta longa pelas dunas.',
          sNarr: 'Você toma rota mais longa pelas dunas. Cansativo, mas chega seguro.',
          fNarr: 'Você se perde nas dunas. Acaba voltando ao caminho original — onde a caravana já passou.', dmg: 2 },
        { i: '⚔️', t: 'Enfrentar os bandidos do deserto', isCombat: true, enemyId: 'bandit_leader',
          desc: 'Desembainhar as armas e combater o grupo armado.' } ] }
  ]
};

// Merge HAZARDS_EXTRA into HAZARDS (replica do _mergeJourneyHazards da cidade).
(function _mergeExtra() {
    Object.keys(HAZARDS_EXTRA).forEach(function (biome) {
        if (!HAZARDS[biome]) HAZARDS[biome] = [];
        HAZARDS_EXTRA[biome].forEach(function (h) { HAZARDS[biome].push(h); });
    });
})();

var SAFE = {
  forest: [
    'A trilha serpenteia entre carvalhos ancestrais. Folhas estalam sob suas botas em ritmo constante — passo, passo, passo.',
    'Pássaros cantam ao longe — bom sinal, dizem os caçadores. Predadores silenciariam tudo. A música segue.',
    'Raios de sol filtram pelas copas, manchando o chão de luz dourada que se move com o vento. Por um instante, parece sagrado.',
    'Você cruza um riacho raso. A água é fria e clara — você bebe um gole apoiando-se nas pedras grandes.',
    'Uma cervinha pequena cruza a trilha vinte metros à frente, te encara, e desaparece sem pressa. Não há predadores na área.',
    'Você passa por uma árvore com cordas atadas em galhos baixos — oferendas dos antigos camponeses. Algumas são novas.',
    'O ar muda — fica adocicado. Você cruza um talhão de cogumelos cor-de-lua, intactos. Bom sinal de solo limpo.',
    'A trilha sobe um morrinho. Do alto, você vê o trajeto inteiro à frente — três pontos altos antes do destino.'
  ],
  plains: [
    'O vento ondula o trigal dourado em ondas, longe até onde a vista alcança. O céu hoje é cobalto sem nuvens.',
    'Uma estrada de terra clara se estende ao horizonte. Pegadas frescas — alguém passou há horas. Não muitos.',
    'Andorinhas cruzam o céu em V. O tempo está bom hoje, dizem os agricultores: pássaros baixos significam chuva, e estes voam alto.',
    'Você passa um marco antigo de pedra com inscrições gastas. A direção certa, confirma o símbolo do reino mal visível.',
    'Um agricultor solitário no campo distante levanta o chapéu pra você. Você responde com aceno — código universal de "tudo bem aqui".',
    'O cheiro do trigo maduro é doce, quase inebriante. Você lembra de coisas que não devia lembrar — boas e ruins.',
    'Uma carroça abandonada na lateral da trilha. Sem rodas, sem cavalos. Algum mercador desistiu há meses, talvez anos.',
    'O vento muda de direção brevemente — você sente perfume de flores selvagens vindo do leste. Boa direção, dizem os antigos.'
  ],
  swamp: [
    'Sapos coaxam nas poças escuras. Você pisa em raízes pra evitar a lama — passo a passo, passo a passo.',
    'Árvores retorcidas formam arcos sobre o caminho. A névoa não dissipa nem ao meio-dia. Tudo é úmido, tudo é prata.',
    'Luzes estranhas piscam ao longe entre as árvores. Não siga, dizem os antigos. Você ignora. Sabe disso há anos.',
    'Você cruza um totem de madeira tortuosa, com penas e ossinhos. Marca de território de algo. Você passa rápido.',
    'O cheiro forte de barro e folha apodrecida fica nas roupas. Levará dias pra sair, mesmo lavando.',
    'Uma garça branca enorme se ergue de uma poça à sua direita e voa em silêncio. Por um instante, você esquece o pântano.',
    'Você ouve algo se mexendo na água a quinze metros — não para ver. Em pântano, quem olha demais é quem encontra.',
    'A trilha cruza um tronco caído antigo. Você passa por cima — a casca está coberta de musgo grosso e fungos azuis bioluminescentes.'
  ],
  mountain: [
    'O ar fica rarefeito a cada cem metros de altitude. Cada passo pesa mais que o anterior, mas a vista compensa.',
    'Picos nevados brilham ao longe sob o sol pálido. Beleza que mata, dizem os escaladores veteranos.',
    'Águias circulam acima, observando. Esperam alguém cair. Você não vai dar essa satisfação.',
    'Você cruza uma pedra-marco com símbolos antigos — runas anãs, talvez. O caminho continua.',
    'Vento entre as fendas faz a montanha cantar. Som baixo, contínuo. Algo entre música e gemido.',
    'Você passa por uma cabana abandonada de pedra, sem teto. Caçador, pastor, eremita — quem sabe, e quem sabe há quanto.',
    'Um carneiro selvagem te observa do topo de uma rocha vinte metros acima. Imóvel. Soberano. Vai onde ele quer.',
    'A trilha serpenteia em zigue-zague encosta acima. Cada curva revela um novo horizonte mais distante que o anterior.'
  ],
  desert: [
    'A estrada se estende sob o sol abrasador. Sua sombra é a única companhia — escura, fiel, em movimento sincronizado.',
    'Dunas mudam de forma com o vento — caminhos somem em minutos aqui. Marcadores são sagrados.',
    'Miragens dançam no horizonte. Lagos onde só há areia, palmeiras que evaporam ao se aproximar.',
    'Você passa por um esqueleto branco — camelo, talvez bode — limpo pelo sol. Não desperdício, apenas tempo.',
    'O calor cria ondas no ar. Tudo a cinquenta metros parece ondular como debaixo d\'água.',
    'Um cacto antigo, curvado pelo vento, marca uma reentrância sombreada. Você descansa cinco minutos antes de seguir.',
    'Areia entra por todo lugar — cabelo, dentes, dobras de roupa. Você se acostuma. Tem que.',
    'Você ouve um chocalhar distante — cobra, talvez, ou apenas seu medo. O som não volta.'
  ],
  snow: [
    'A neve range sob seus pés. Cada passo afunda até a canela, com som seco e satisfatório.',
    'O hálito embaça no ar gelado. Você conta os passos pra não pensar no frio. Já chegou ao trecentos.',
    'Lobos uivam ao longe — talvez três, talvez cinco. Hora de andar mais rápido, mas não correr.',
    'Você passa por um abeto carregado de neve. Um ramo cede ao seu lado, soltando uma cascata branca silenciosa.',
    'Pegadas frescas cruzam sua trilha — humanas, indo na direção oposta. Alguém saiu antes de você. Boa ou má notícia, depende.',
    'A neve fica perfeitamente lisa por um trecho. Você é o primeiro a marcá-la. Bonito e solitário.',
    'Você vê uma pequena bandeira gasta cravada num poste. Marcador antigo, congelado. Direção certa.',
    'O céu rosa-prateado da tarde gelada é tão bonito que você para um instante apenas pra olhar.'
  ],
  cave: [
    'Gotas ecoam nos túneis. O som vem de todos os lados aqui dentro — você se acostuma a isso ou enlouquece.',
    'Cristais nas paredes refletem a luz da sua tocha em mil estrelas falsas. Beleza inesperada.',
    'O ar é frio e denso. Cheira a pedra úmida e a algo que você prefere não nomear.',
    'Você passa por inscrições antigas talhadas na parede — runas, ou apenas tentativas de quem se perdeu.',
    'Um morcego cruza voando — silencioso, rápido, único. Bom sinal: morcegos só vivem onde há saída.',
    'Sua tocha estala. Você verifica o reservatório — ainda há óleo pra duas horas. Suficiente, talvez.',
    'O túnel se alarga numa câmara natural. Você pode até esticar os braços inteiros sem tocar parede.',
    'Você encontra uma marca de tinta antiga no chão — flecha apontando direção. Alguém marcou pra outros. Você agradece em silêncio.'
  ],
  graveyard: [
    'Lápides marcam o caminho. Algumas são tão antigas que os nomes sumiram. Outras têm flores secas.',
    'Corvos observam em silêncio dos galhos secos. Não voam quando você passa — você não é ameaça nem presa.',
    'A névoa se arrasta entre as cruzes como se procurasse algo perdido. Talvez procure mesmo.',
    'Você passa por uma tumba aberta — vazia há séculos. Por quê? Alguém saiu. Alguém entrou. Ninguém sabe.',
    'O cheiro é estranho aqui — não decomposição, mas algo mais antigo. Mineral. Esquecido.',
    'Uma estátua quebrada de um anjo de pedra te observa com olhos faltando. A asa esquerda caiu há décadas.',
    'O silêncio é completo. Você não ouve nem o seu próprio passo, como se o lugar absorvesse som.',
    'Você passa por um banco de pedra perto de uma sepultura recente. Alguém senta aqui. Talvez ainda venha.'
  ],
  volcanic: [
    'Cinzas caem como neve preta. O ar cheira a enxofre e ferro queimado.',
    'Brasas brilham no chão sob suas botas — cuidado pra não pisar errado, sola sempre molhada.',
    'O calor faz o ar tremular. Cada respiração pesa, escalda, pesa.',
    'Você passa por uma fissura humeante. Sem lava visível, mas o calor saindo é insuportável a um metro.',
    'Cristais negros — obsidiana — nascem do solo aqui e ali. Cortados pela mão da terra mesma.',
    'Um lago de lava distante brilha como uma jóia ferida. Bonito de longe, mortal de perto.',
    'Você ouve a montanha respirar — som baixo, profundo, do peito do mundo. Ela está viva.',
    'O céu acima é alaranjado mesmo ao meio-dia, filtrado pelas cinzas. Um eclipse permanente.'
  ]
};

var DEPARTURES = {
  forest: [
    [
      { type: 'narration', text: 'Os portões de Valdoria fecham-se atrás de vocês com um eco grave de ferro. À frente, a estrada serpenteia rumo à <b>linha verde</b> da floresta — antiga, viva, paciente.' },
      { type: 'narration', text: 'Cheira a chuva no solo úmido, mesmo sem chuva caindo. O ar adoça nos pulmões; as copas distantes parecem respirar lentamente.' },
      { type: 'narration', text: 'O caminho não promete velocidade — promete <i>encontros</i>. Vocês ajustam as mochilas, conferem armas, e seguem.' }
    ],
    [
      { type: 'narration', text: 'A última muralha de Valdoria desbota nas suas costas. Você sente o peso do conforto urbano se afastar a cada passo.' },
      { type: 'narration', text: 'A trilha cruza um campo aberto e mergulha num <i>corredor de carvalhos</i>. A luz muda — dourada para verde-musgo. O silêncio muda também: não é vazio, é <b>atenção</b>.' },
      { type: 'narration', text: 'Algo na floresta sabe que vocês chegaram. Algo sempre sabe.' }
    ],
    [
      { type: 'narration', text: 'Um sino tardio toca em algum templo da cidade — o último som humano que vocês ouvirão por horas.' },
      { type: 'narration', text: 'A floresta engole o caminho aos poucos. Galhos baixos roçam capacetes. Raízes erguem o solo como dedos antigos pedindo passagem.' },
      { type: 'narration', text: '<i>Cada aventureiro experiente para um instante aqui</i> — pra lembrar que o mato não esquece quem entra.' }
    ]
  ],
  plains: [
    [
      { type: 'narration', text: 'Os portões ficam pra trás. À frente, o horizonte se estende plano como um pergaminho dourado — <b>Campos Verdes</b> não tem segredo, só distância.' },
      { type: 'narration', text: 'O vento ondula o trigal em padrões hipnóticos. Camponeses distantes acenam de cabeça baixa, sem parar o trabalho.' },
      { type: 'narration', text: 'A estrada é boa. Mas <i>boa estrada é onde bandidos esperam</i> — diziam os veteranos. Vocês mantêm a mão perto da empunhadura.' }
    ],
    [
      { type: 'narration', text: 'Vocês cruzam a ponte de pedra que marca a fronteira da cidade. O rio corre baixo embaixo — promessa de água potável até o destino.' },
      { type: 'narration', text: 'O céu é amplo demais aqui. Sem florestas que oprimam, sem montanhas que orientem — só a estrada, o sol e o canto distante das cotovias.' },
      { type: 'narration', text: 'Liberdade tem um preço: vocês são <b>visíveis</b> a léguas de distância. Quem precisa se esconder, escolhe outras rotas.' }
    ],
    [
      { type: 'narration', text: 'A última carroça de mercadores cruza vocês em direção à cidade. O carroceiro inclina o chapéu, mas o olhar é <i>de aviso</i>: "Cuidado com o leste."' },
      { type: 'narration', text: 'A estrada se desenrola plana até onde a vista alcança. Marcadores de pedra antigos pontuam a trilha — alguns inteiros, outros caídos há gerações.' },
      { type: 'narration', text: 'Vocês seguem em ritmo firme. As planícies não perdoam quem para sem motivo.' }
    ]
  ],
  swamp: [
    [
      { type: 'narration', text: 'O solo muda sob os pés antes mesmo de vocês perceberem — terra firme dá lugar a <i>turfa fofa</i> que afunda um centímetro por passo.' },
      { type: 'narration', text: 'O cheiro chega primeiro: barro doce de apodrecimento, água parada, algo orgânico que o cérebro identifica como "evitar".' },
      { type: 'narration', text: 'A neblina não dissipa — só muda de altura. <b>Pântano</b>, dizem os antigos, <i>é a terra que se recusa a escolher entre água e terra</i>. Vocês entram.' }
    ],
    [
      { type: 'narration', text: 'Os portões de Valdoria sumiram dentro de uma neblina baixa que não devia existir nessa hora. Pântano começa cedo aqui, vocês percebem.' },
      { type: 'narration', text: 'Sapos calam quando vocês passam. Voltam a coaxar três metros depois. <i>Um sistema de aviso natural</i> — funcionando contra vocês.' },
      { type: 'narration', text: 'A trilha some e reaparece entre raízes. Quem chega vivo aqui caminha devagar e ouve mais que olha.' }
    ]
  ],
  mountain: [
    [
      { type: 'narration', text: 'A estrada inclina antes que vocês esperem. Em meia hora, Valdoria é um ponto distante de luz amarela ao pé do vale.' },
      { type: 'narration', text: 'O ar fica fino. Cada respiração custa um pouco mais. As primeiras rochas das <b>Montanhas</b> assomam à frente como dentes velhos de um mundo antigo.' },
      { type: 'narration', text: 'Águias circulam alto. Elas <i>já sabem</i> antes de vocês — sempre sabem.' }
    ],
    [
      { type: 'narration', text: 'A trilha de cabras é estreita, mas firme. Vocês ajustam as mochilas — o que era confortável na cidade aqui castiga ombros.' },
      { type: 'narration', text: 'Vento gélido desce dos picos mesmo agora. Capas tremulam, dedos engelidam. Cada metro de altitude é um grau a menos.' },
      { type: 'narration', text: '<i>Montanhas não negociam.</i> Quem entra aceita os termos delas.' }
    ]
  ],
  desert: [
    [
      { type: 'narration', text: 'Vocês atravessam o último oásis de palmeiras antes do <b>Deserto Dourado</b>. A última água por horas. Cada cantil é selado e contado.' },
      { type: 'narration', text: 'O calor bate como uma porta. Areia entra na boca antes de qualquer fala. O sol é uma moeda branca pregada no céu azul-metal.' },
      { type: 'narration', text: '<i>Não corra</i> — diz a regra antiga. <i>O deserto não vence quem caminha; vence quem corre.</i>' }
    ],
    [
      { type: 'narration', text: 'A estrada de pedra termina onde a areia começa. A partir daqui, marcos são as <b>únicas referências</b> — esquecer um significa morrer.' },
      { type: 'narration', text: 'Vocês embrulham rostos contra o vento abrasivo. A sombra própria é a única companhia constante; tudo mais aqui muda, evapora ou some.' },
      { type: 'narration', text: 'Pegadas de camelos antigos cruzam a trilha — semanas, talvez meses. <i>Quem passou, passou inteiro?</i> O deserto não responde.' }
    ]
  ],
  snow: [
    [
      { type: 'narration', text: 'A neve range sob as botas desde o primeiro passo fora dos portões. Capuzes erguidos, cachecóis amarrados, exalações brancas como pequenos fantasmas.' },
      { type: 'narration', text: 'O céu é prata baixo e pesado. <i>Vai nevar antes do fim do dia</i>, vocês percebem juntos, sem palavras.' },
      { type: 'narration', text: 'O frio aqui não é desconforto — é <b>predador</b>. Quem não anda, vira pedra.' }
    ],
    [
      { type: 'narration', text: 'O vento corta antes mesmo de virem o primeiro morro — agulhas de gelo na pele exposta. Vocês baixam a cabeça e avançam em fila, cada passo afundando até o tornozelo.' },
      { type: 'narration', text: 'A brancura apaga a estrada; só uma intuição teimosa aponta o rumo. <i>Aqui o mapa mente</i> — quem confia demais no que vê, se perde.' },
      { type: 'narration', text: 'O silêncio da neve é total, quase sólido. Até a respiração soa intrusa. Vocês seguem, e a paisagem branca os engole devagar.' }
    ],
    [
      { type: 'narration', text: 'Os flocos caem mansos no começo, quase gentis, pousando nos cílios. Mas há um peso no ar — a calmaria que vem antes da nevasca de verdade.' },
      { type: 'narration', text: 'Pegadas antigas, meio cobertas, cruzam o caminho e somem. <i>Quem passou por aqui? E voltou?</i> Ninguém pergunta em voz alta.' },
      { type: 'narration', text: 'O frio entra pelas juntas como um hóspede mal-educado. Vocês apertam o passo — parar é o único erro que a neve não perdoa.' }
    ]
  ],
  cave: [
    [
      { type: 'narration', text: 'A entrada da caverna se abre como uma boca antiga. <b>Frio</b> que vem de dentro encontra <i>calor</i> que vem de fora — neblina nasce no limiar exato.' },
      { type: 'narration', text: 'Tochas acesas. Olhares trocados. <i>Quem desce, desce inteiro?</i> A piada veterana cai sem graça hoje.' },
      { type: 'narration', text: 'O som dos passos muda assim que vocês atravessam — agora ecoa contra paredes invisíveis. A caverna registra cada movimento.' }
    ],
    [
      { type: 'narration', text: 'A escuridão lá dentro não é ausência de luz — é uma presença, espessa, que as tochas só conseguem empurrar um palmo à frente. Vocês hesitam no limiar.' },
      { type: 'narration', text: 'Uma corrente de ar gelado sopra de dentro, carregando um cheiro de terra molhada e algo mais antigo. <i>A montanha exala.</i>' },
      { type: 'narration', text: 'Os ecos começam antes dos passos, como se a caverna ensaiasse a chegada de vocês. Armas firmes, vocês cruzam a fronteira de pedra.' }
    ],
    [
      { type: 'narration', text: 'Estalactites pingam num ritmo lento e paciente, contando um tempo que não é o dos homens. Cada gota soa como uma porta distante se fechando.' },
      { type: 'narration', text: 'A luz do dia morre três passos adentro, engolida sem resistência. Vocês acendem mais uma tocha — e ainda assim a treva parece rir.' },
      { type: 'narration', text: 'O chão é traiçoeiro, liso de limo e cheio de fendas. <i>Aqui se anda olhando os pés e os ombros ao mesmo tempo.</i> Vocês descem com cuidado.' }
    ]
  ],
  graveyard: [
    [
      { type: 'narration', text: 'O caminho até o cemitério é silencioso por convenção. Não cantam, não conversam alto — <i>respeito</i>, dizem os ortodoxos. <b>Medo</b>, sabem os realistas.' },
      { type: 'narration', text: 'Corvos pousam nas cercas baixas, contando os que entram. Não há sino, não há sentinela. Só o vento entre as lápides distantes.' },
      { type: 'narration', text: 'O ar muda na fronteira do campo santo. Fica <i>denso</i>, como se respirasse pra fora do solo. Vocês ajustam armas e seguem.' }
    ],
    [
      { type: 'narration', text: 'A névoa se acumula baixa entre as lápides, na altura dos joelhos, como um lençol que ninguém ousou recolher. Os pés somem nela a cada passo.' },
      { type: 'narration', text: 'As datas nas pedras vão ficando mais antigas conforme vocês avançam — e mais apagadas. <i>No fundo do campo, ninguém mais lê os nomes.</i>' },
      { type: 'narration', text: 'Um sino quebrado pende de um portão enferrujado, sem badalo, mudo. Vocês passam por baixo dele, e o silêncio parece ficar ainda mais fundo.' }
    ],
    [
      { type: 'narration', text: 'Flores murchas marcam algumas covas; outras, abandonadas, deixaram a terra afundar. O cemitério tem hierarquias até entre os esquecidos.' },
      { type: 'narration', text: 'O ar é parado, sem o menor sopro — nem os corvos batem asas. <i>É como se o lugar prendesse a respiração junto com vocês.</i>' },
      { type: 'narration', text: 'Uma estátua de anjo, de rosto comido pelo tempo, aponta vagamente para o leste. Vocês seguem a direção dela, sem saber bem por quê.' }
    ]
  ],
  volcanic: [
    [
      { type: 'narration', text: 'A trilha sobe entre rochas escuras. Cinzas finas começam a cair três quilômetros antes — neve negra que se acumula nos ombros.' },
      { type: 'narration', text: 'O cheiro de enxofre já irrita os olhos. <b>Cratera Vulcânica</b> à frente, fumegando como uma ferida aberta da própria terra.' },
      { type: 'narration', text: '<i>O calor vem de baixo</i> — é o que assusta. Não é sol, é o coração do mundo respirando.' }
    ],
    [
      { type: 'narration', text: 'O solo esquenta sob as solas conforme vocês sobem; em alguns trechos, é preciso desviar de fissuras que respiram um ar quente e vermelho.' },
      { type: 'narration', text: 'O céu some atrás de uma cortina de fumaça parda. <i>O sol vira uma moeda baça</i>, e o mundo inteiro ganha cor de brasa apagada.' },
      { type: 'narration', text: 'Cada inspiração arde um pouco. Vocês molham panos e os amarram sobre o rosto — a montanha cobra pedágio em fôlego.' }
    ],
    [
      { type: 'narration', text: 'Rios finos de rocha alaranjada escorrem ao longe, lentos como mel ardente. A beleza é hipnótica e o perigo, óbvio.' },
      { type: 'narration', text: 'O chão treme de leve, um ronco surdo que vem das entranhas. <i>A terra aqui não dorme</i> — apenas cochila entre fúrias.' },
      { type: 'narration', text: 'O calor distorce o ar à frente, fazendo a trilha dançar como miragem. Vocês avançam pelo que parece sólido, torcendo para que seja.' }
    ]
  ]
};

    /* ============ LOGICA ============ */

    /* -------- politica de risco / etapas -------- */
    var RISK_CHANCE = 55;
    /* #3 (user 2026-06-16): combate RARO de viagem (emboscada). Chance por etapa,
       SÓ dispara em jornada com opts.onCombat (exploração REMOTE/LOCAL com combate
       real — nunca na cidade mock). Vence -> retoma a viagem até o destino; perde
       -> templo (padrão). Mantido baixo p/ ser "raro". */
    var RARE_COMBAT_CHANCE = 7;

    function stepsForDistance(dist) {
        if (typeof dist !== 'number') return 3;
        if (dist <= 6) return 3;
        if (dist <= 14) return 4;
        return 5;
    }

    /* -------- anti-repeticao (char-namespaced, TTL 24h) — base = cidade -------- */
    function _charKey(player) {
        if (global._charId) return global._charId;
        if (player && (player.char_id || player.charId || player.id)) return (player.char_id || player.charId || player.id);
        return 'default';
    }
    function _usageKey(player) { return 'valdoria_journey_used_v1_' + _charKey(player); }
    function _getUsage(player) {
        try {
            var raw = global.localStorage ? global.localStorage.getItem(_usageKey(player)) : null;
            if (raw) {
                var data = JSON.parse(raw);
                if (data && Date.now() - (data.lastReset || 0) < 24 * 60 * 60 * 1000) {
                    data.hazards = data.hazards || {};
                    data.safe = data.safe || {};
                    data.departures = data.departures || {};  // B3.5 #90
                    return data;
                }
            }
        } catch (e) {}
        return { hazards: {}, safe: {}, departures: {}, lastReset: Date.now() };
    }
    function _saveUsage(player, data) {
        try { if (global.localStorage) global.localStorage.setItem(_usageKey(player), JSON.stringify(data)); } catch (e) {}
    }
    function _markHazardUsed(player, biome, title) {
        var d = _getUsage(player);
        d.hazards[biome] = d.hazards[biome] || [];
        if (d.hazards[biome].indexOf(title) < 0) d.hazards[biome].push(title);
        _saveUsage(player, d);
    }
    function _markSafeUsed(player, biome, text) {
        var d = _getUsage(player);
        d.safe[biome] = d.safe[biome] || [];
        if (d.safe[biome].indexOf(text) < 0) d.safe[biome].push(text);
        _saveUsage(player, d);
    }
    function _isHazardUsed(player, biome, title) { return (_getUsage(player).hazards[biome] || []).indexOf(title) >= 0; }
    function _isSafeUsed(player, biome, text) { return (_getUsage(player).safe[biome] || []).indexOf(text) >= 0; }

    // sessionUsed: array mantido pelo CALLER (a jornada) com titulos/textos ja usados nesta viagem.
    function pickFreshHazard(biome, player, sessionUsed) {
        var pool = HAZARDS[biome] || HAZARDS.forest || [];
        sessionUsed = sessionUsed || [];
        var avail = pool.filter(function (h) { return sessionUsed.indexOf(h.title) < 0 && !_isHazardUsed(player, biome, h.title); });
        if (!avail.length) avail = pool.filter(function (h) { return sessionUsed.indexOf(h.title) < 0; });
        if (!avail.length) { sessionUsed.length = 0; avail = pool.slice(); }
        if (!avail.length) return null;
        var h = avail[Math.floor(Math.random() * avail.length)];
        sessionUsed.push(h.title);
        _markHazardUsed(player, biome, h.title);
        return h;
    }
    function pickFreshSafe(biome, player, sessionUsed) {
        var pool = SAFE[biome] || SAFE.forest || [];
        sessionUsed = sessionUsed || [];
        var avail = pool.filter(function (t) { return sessionUsed.indexOf(t) < 0 && !_isSafeUsed(player, biome, t); });
        if (!avail.length) avail = pool.filter(function (t) { return sessionUsed.indexOf(t) < 0; });
        if (!avail.length) { sessionUsed.length = 0; avail = pool.slice(); }
        if (!avail.length) return '';
        var t = avail[Math.floor(Math.random() * avail.length)];
        sessionUsed.push(t);
        _markSafeUsed(player, biome, t);
        return t;
    }

    function _markDepartureUsed(player, biome, idx) {
        var d = _getUsage(player);
        d.departures = d.departures || {};
        d.departures[biome] = d.departures[biome] || [];
        if (d.departures[biome].indexOf(idx) < 0) d.departures[biome].push(idx);
        _saveUsage(player, d);
    }
    function _isDepartureUsed(player, biome, idx) {
        return ((_getUsage(player).departures || {})[biome] || []).indexOf(idx) >= 0;
    }

    function _getDepartureFlavor(t, biome) {
        if (!t) return '';
        // 1. Subclasse
        if (t.subclass === 'gloom_stalker') return 'Seus olhos se adaptam rapidamente aos contrastes do horizonte; a escuridão da trilha é o seu terreno natural.';
        if (t.subclass === 'hunter') return 'Você estuda a direção do vento e as quebras nas ramagens à margem da trilha, já antecipando os rastros da fauna local.';
        if (t.subclass === 'assassin') return 'Você memoriza os pontos cegos e potenciais abrigos ao longo da partida; a furtividade é sua primeira linha de defesa.';
        if (t.subclass === 'thief') return 'Seus pés encontram o atalho mais suave no leito da estrada, sem produzir o menor ruído de cascalho ou metal.';
        if (t.subclass === 'champion') return 'Cada passada carrega a firmeza de um combatente treinado; você respira o ar dos ermos pronto para qualquer confronto.';
        if (t.subclass === 'battle_master') return 'Você avalia os gargalos naturais da estrada e as linhas de visão, traçando mentalmente planos de combate tático.';
        if (t.subclass === 'evoker') return 'Você sente a energia mágica vibrando sob a pele, pronta para ser canalizada em chamas ou raios se perigos surgirem.';
        if (t.subclass === 'abjurer') return 'Uma barreira translúcida e sutil pulsa levemente ao seu redor, reforçando sua segurança contra emboscadas arcanas.';
        if (t.subclass === 'life') return 'Uma sensação de vigor e calor no peito renova suas energias, abençoando o início desta longa caminhada.';
        if (t.subclass === 'war') return 'O aço de sua arma reverbera com devoção; você marcha com a postura firme de quem caminha sob a bênção dos deuses da guerra.';
        if (t.subclass === 'berserker') return 'A pulsação acelera com o chamado dos ermos; a expectativa de perigo desperta sua fúria interior.';
        if (t.subclass === 'moon') return 'Você fareja as correntes de ar e sente o solo vivo sob seus pés, em perfeita harmonia com o bioma.';
        if (t.subclass === 'shadow') return 'Seus movimentos fluem como uma brisa silenciosa, fundindo sua silhueta com as sombras da estrada.';
        if (t.subclass === 'lore') return 'Você recorda os relatos e baladas antigas sobre as terras além dos portões, prevenido contra lendas que se provam reais.';
        if (t.subclass === 'devotion') return 'A santidade de sua causa ilumina seus passos; sua presença inspira determinação e serenidade.';
        if (t.subclass === 'vengeance') return 'Sua mandíbula cerrada e passos pesados denotam determinação implacável; o dever não permite hesitação.';

        // 2. Sub-raça
        if (t.subrace === 'wood') return 'Com o passo leve dos elfos silvestres, você se move em silêncio absoluto entre as primeiras árvores e arbustos.';
        if (t.subrace === 'high') return 'Sua percepção refinada de alto elfo capta o fluxo sutil das correntes e da magia ambiental deste caminho.';
        if (t.subrace === 'drow') return 'Seus olhos treinados no subterrâneo buscam instintivamente as sombras mais densas para avançar com discrição.';
        if (t.subrace === 'mountain') return 'Com o vigor inato dos anões da montanha, você mede a firmeza do terreno rochoso a cada passada convicta.';
        if (t.subrace === 'hill') return 'Sua robustez e intuição telúrica de anão da colina garantem estabilidade inabalável diante de qualquer relevo.';
        if (t.subrace === 'lightfoot') return 'Sua marcha ágil de halfling pés-leves não deixa rastros profundos na terra fresca da saída da cidade.';
        if (t.subrace === 'stout') return 'Seu passo firme e constituição inabalável de halfling robusto desdenham as primeiras rajadas de vento.';
        if (t.subrace === 'rock') return 'Sua curiosidade de gnomo da rocha analisa o desgaste das pedras no caminho com aguçada precisão analítica.';
        if (t.subrace === 'forest') return 'Os pequenos sussurros da relva e dos pássaros acolhem seus passos de gnomo da floresta na partida.';

        // 3. Classe
        if (t.cls === 'patrulheiro') return 'Seu olhar de patrulheiro examina o horizonte aberto, identificando rotas naturais e possíveis trilhas de caça.';
        if (t.cls === 'ladino' || t.cls === 'ladrao') return 'Seu instinto de ladino mantém um olho na rota e outro nos pontos de fuga ao longo da estrada.';
        if (t.cls === 'guerreiro') return 'O peso familiar da armadura e a empunhadura da arma transmitem a costumeira confiança marcial para a marcha.';
        if (t.cls === 'mago') return 'Você mantém a mente afiada e o grimório protegido da poeira, calculando mentalmente as variáveis da travessia.';
        if (t.cls === 'clerigo') return 'Com a mão no símbolo divino, você faz uma oração silenciosa de passagem aos espíritos do caminho.';
        if (t.cls === 'paladino') return 'Sua postura ereta e determinação moral inspiram coragem diante da vastidão incerta das terras selvagens.';
        if (t.cls === 'barbaro') return 'O ar livre dos ermos infla seus pulmões; longe das muralhas de pedra, você se sente verdadeiramente vivo.';
        if (t.cls === 'druida') return 'Você toca a relva na beira da estrada e agradece a acolhida da terra no início da travessia.';
        if (t.cls === 'bardo') return 'Você marca um compasso rítmico com os pés, transformando a fadiga da marcha em melodia estimulante.';
        if (t.cls === 'monge') return 'Seu passo é sereno e ritmado, sincronizando respiração e movimento num estado contínuo de vigília meditativa.';
        if (t.cls === 'bruxo') return 'Uma presença invisível parece acompanhar sua sombra na estrada, sussurrando cautela em segredo.';
        if (t.cls === 'feiticeiro') return 'A magia inata corre pulsante em suas veias; você mantém a centelha sobrenatural alerta e sob controle cuidadoso.';

        // 4. Raça
        if (t.race === 'dragonborn') return 'Sua postura altiva de draconato e olhar faiscante deixam claro que nenhuma criatura menor deve cruzar seu caminho.';
        if (t.race === 'halforc') return 'Sua tenacidade de meio-orc acolhe a rusticidade da estrada como um velho desafio a ser superado.';
        if (t.race === 'tiefling') return 'Suas pupilas sem íris refletem a claridade do céu aberto enquanto você avança com postura desafiadora.';
        if (t.race === 'halfelf') return 'Adaptável e equilibrado, você encara a vastidão adiante com a serenidade dos elfos e a ousadia humana.';
        if (t.race === 'human') return 'Com determinação incansável, você aperta as correias da bagagem e foca no horizonte à frente.';
        return '';
    }

    // B3.5 #90: partida 'Rumo a...' com anti-repeat (sessão + 24h char-namespaced)
    // — antes pickDeparture sorteava puro, igual à queixa "eventos de Rumo a…
    // repetiam". Mesmo mecanismo do pickFreshHazard/pickFreshSafe, por índice.
    function pickFreshDeparture(biome, player, sessionUsed) {
        var pool = DEPARTURES[biome] || DEPARTURES.forest || [];
        if (!pool.length) return [];
        sessionUsed = sessionUsed || [];
        var idxs = [];
        var i;
        for (i = 0; i < pool.length; i++) {
            if (sessionUsed.indexOf(i) < 0 && !_isDepartureUsed(player, biome, i)) idxs.push(i);
        }
        if (!idxs.length) {
            for (i = 0; i < pool.length; i++) if (sessionUsed.indexOf(i) < 0) idxs.push(i);
        }
        if (!idxs.length) { sessionUsed.length = 0; for (i = 0; i < pool.length; i++) idxs.push(i); }
        var pick = idxs[Math.floor(Math.random() * idxs.length)];
        sessionUsed.push(pick);
        _markDepartureUsed(player, biome, pick);
        var baseLines = (pool[pick] || []).slice();
        if (player) {
            var flavor = _getDepartureFlavor(_traits(player), biome);
            if (flavor) baseLines.push({ type: 'narration', text: flavor });
        }
        return baseLines;
    }

    function pickDeparture(biome, player, sessionUsed) {
        // B3.5 #90: com player, delega ao anti-repeat; sem player = back-compat random.
        if (player) return pickFreshDeparture(biome, player, sessionUsed);
        var pool = DEPARTURES[biome] || DEPARTURES.forest || [];
        if (!pool.length) return [];
        return pool[Math.floor(Math.random() * pool.length)];
    }

    /* -------- regra (DndRules — odds IGUAIS cidade<->exploracao) -------- */
    function _journeyView(player) {
        if (!player || typeof player !== 'object') return player;
        var v = {}, k;
        for (k in player) { if (Object.prototype.hasOwnProperty.call(player, k)) v[k] = player[k]; }
        delete v.prof;  // ignora SAVE-prof array; check de pericia usa skills[] reais -> whitelist
        return v;
    }
    function _hasCheck(choice) { return !!(choice && choice.stat && choice.dc != null); }

    function resolveJourneyCheck(player, choice, checkOpts) {
        if (!_hasCheck(choice)) return null;  // escolha sem teste (stat:null) -> auto-sucesso (caller)
        if (!(global.DndRules && DndRules.resolveSkillCheck)) return null;
        var chk = { stat: choice.stat, skill: choice.skill, dc: choice.dc };
        if (checkOpts) {
            if (checkOpts.advantage) chk.advantage = true;
            if (checkOpts.disadvantage) chk.disadvantage = true;
        }
        return DndRules.resolveSkillCheck(_journeyView(player), chk);
    }
    function successPctForChoice(player, choice) {
        if (!_hasCheck(choice)) return null;
        if (!(global.DndRules && DndRules.successPct)) return null;
        return DndRules.successPct(_journeyView(player), { stat: choice.stat, skill: choice.skill, dc: choice.dc });
    }

    /* -------- narrativa por traco (by_subclass > by_subrace > by_class > by_race > by_alignment > by_background > default) -------- */
    function _traits(player) {
        var p = player || {};
        var ck = (global.DndRules && DndRules.classKey) ? DndRules.classKey(p.cls || p.class || p.hero_class || p.char_class) : String(p.cls || p.class || p.hero_class || p.char_class || '').toLowerCase();
        var rk = (global.DndRules && DndRules.raceKey) ? DndRules.raceKey(p.race || p.raca) : String(p.race || p.raca || '').toLowerCase();
        var srk = (global.DndRules && DndRules.subraceKey) ? DndRules.subraceKey(p.subrace || p.sub_race) : String(p.subrace || p.sub_race || '').toLowerCase();
        var sck = (global.DndRules && DndRules.subclassKey) ? DndRules.subclassKey(p.subclass || p.sub_class) : String(p.subclass || p.sub_class || '').toLowerCase();
        return {
            cls: ck,
            race: rk,
            subrace: srk,
            subclass: sck,
            alignment: String(p.alignment || '').toLowerCase(),
            bg: String(p.bg || p.background || '').toLowerCase(),
            name: p.name || 'Viajante'
        };
    }

    function canTakeChoice(player, choice) {
        if (!choice) return false;
        var t = _traits(player);
        function _match(req, actual) {
            if (!req) return true;
            if (!actual) return false;
            if (Array.isArray ? Array.isArray(req) : (req instanceof Array)) {
                var i;
                for (i = 0; i < req.length; i++) {
                    if (String(req[i]).toLowerCase() === actual) return true;
                }
                return false;
            }
            return String(req).toLowerCase() === actual;
        }
        var reqCls = choice.requires_class || choice.only_class;
        if (reqCls) {
            var cActual = (t.cls === 'ladrao') ? 'ladino' : t.cls;
            var reqList = (Array.isArray && Array.isArray(reqCls)) ? reqCls : [reqCls];
            var matchedCls = false;
            for (var cIdx = 0; cIdx < reqList.length; cIdx++) {
                var rc = String(reqList[cIdx]).toLowerCase();
                if (rc === 'ladrao') rc = 'ladino';
                if (rc === cActual) { matchedCls = true; break; }
            }
            if (!matchedCls) return false;
        }
        var reqRace = choice.requires_race || choice.only_race;
        if (reqRace && !_match(reqRace, t.race)) return false;
        var reqSubrace = choice.requires_subrace || choice.only_subrace;
        if (reqSubrace && !_match(reqSubrace, t.subrace)) return false;
        var reqSubclass = choice.requires_subclass || choice.only_subclass;
        if (reqSubclass && !_match(reqSubclass, t.subclass)) return false;
        return true;
    }

    function pickNarrative(choice, player, success) {
        if (!choice) return '';
        var t = _traits(player);
        var clsKey = t.cls;
        var clsAlt = (clsKey === 'ladino') ? 'ladrao' : (clsKey === 'ladrao' ? 'ladino' : clsKey);

        function _findIn(obj, key, alt) {
            if (!obj) return null;
            if (key && obj[key]) return obj[key];
            if (alt && obj[alt]) return obj[alt];
            return null;
        }

        if (success) {
            var snSc = _findIn(choice.sNarr_by_subclass, t.subclass);
            if (snSc) return snSc;
            var snSr = _findIn(choice.sNarr_by_subrace, t.subrace);
            if (snSr) return snSr;
            var snCl = _findIn(choice.sNarr_by_class, clsKey, clsAlt);
            if (snCl) return snCl;
            var snRc = _findIn(choice.sNarr_by_race, t.race);
            if (snRc) return snRc;
            var snAl = _findIn(choice.sNarr_by_alignment, t.alignment);
            if (snAl) return snAl;
            var snBg = _findIn(choice.sNarr_by_background, t.bg);
            if (snBg) return snBg;
            return choice.sNarr || '';
        }

        var fnSc = _findIn(choice.fNarr_by_subclass, t.subclass);
        if (fnSc) return fnSc;
        var fnSr = _findIn(choice.fNarr_by_subrace, t.subrace);
        if (fnSr) return fnSr;
        var fnCl = _findIn(choice.fNarr_by_class, clsKey, clsAlt);
        if (fnCl) return fnCl;
        var fnRc = _findIn(choice.fNarr_by_race, t.race);
        if (fnRc) return fnRc;
        var fnAl = _findIn(choice.fNarr_by_alignment, t.alignment);
        if (fnAl) return fnAl;
        var fnBg = _findIn(choice.fNarr_by_background, t.bg);
        if (fnBg) return fnBg;
        return choice.fNarr || '';
    }

    /* -------- Confirmação e Preparação Sensorial PADRAO_ALDRIC (D&D 5e) -------- */
    function _getRaceConfirmationNarration(t, biome) {
        if (!t) return '';
        if (t.subrace === 'mountain') return 'Seus instintos de anão da montanha avaliam a inclinação e a consistência das rochas; você reconhece os perigos da pedra fria.';
        if (t.subrace === 'hill') return 'Seu sangue de anão da colina sente a firmeza da terra e a vibração do solo sob as solas das botas.';
        if (t.subrace === 'wood') return 'Seus sentidos de elfo silvestre captam o menor rumor da brisa e a dança das copas distantes além dos muros.';
        if (t.subrace === 'high') return 'Sua mente refinada de alto elfo detecta as correntes invisíveis e a ressonância ancestral que permeiam a estrada.';
        if (t.subrace === 'drow') return 'Seus olhos habituados à escuridão calculam cada dobra do terreno onde emboscadores poderiam buscar refúgio.';
        if (t.subrace === 'lightfoot') return 'Com a leveza inata dos pés-leves, você antecipa trilhas discretas que pouparão esforço e evitarão olhares indiscretos.';
        if (t.subrace === 'stout') return 'Com o vigor robusto do seu povo, você ajusta as fivelas com entusiasmo, inabalável perante o cansaço da caminhada.';
        if (t.subrace === 'rock') return 'Seus olhos de gnomo da rocha examinam a mecânica das fivelas e a durabilidade dos apetrechos de marcha com precisão de artífice.';
        if (t.subrace === 'forest') return 'Sua empatia de gnomo da floresta o faz notar os cantos dos pequenos pássaros prevendo as condições do tempo.';

        if (t.race === 'dwarf') return 'Com a solidez do povo anão, você crava o pé no chão da saída e verifica o peso da bagagem com satisfação prática.';
        if (t.race === 'elf') return 'Com a graça e acuidade élficas, sua vista perscruta léguas de distância em busca de qualquer alteração no relevo.';
        if (t.race === 'halfling') return 'Seu otimismo e passos ligeiros de halfling encontram conforto mesmo nas estradas mais rústicas.';
        if (t.race === 'dragonborn') return 'Seu porte régio de draconato impõe respeito à estrada; o calor elemental em seu peito arde perante o desafio.';
        if (t.race === 'halforc') return 'A tenacidade de meio-orc vibra em seus músculos. Cicatrizes antigas lembram que as terras selvagens são seu verdadeiro lar.';
        if (t.race === 'tiefling') return 'Sua herança tiefling desperta uma percepção aguçada para variações térmicas e vibrações sinistras da terra.';
        if (t.race === 'halfelf') return 'Unindo a diplomacia dos homens à agilidade élfica, você analisa a rota com equilíbrio pragmático e flexibilidade.';
        if (t.race === 'gnome') return 'Sua mente ágil de gnomo já calcula mentalmente atalhos e estimativas de recursos para a viagem.';
        if (t.race === 'human') return 'Com a determinação e capacidade de adaptação dos humanos, você revisa seus cantis, ciente de que a resiliência supera qualquer terreno.';
        return '';
    }

    function _getClassConfirmationNarration(t, biome) {
        if (!t) return '';
        if (t.subclass === 'champion') return 'Você flexiona os punhos e afrouxa a lâmina na bainha com a serenidade de um campeão talhado para confrontos diretos.';
        if (t.subclass === 'battle_master') return 'Você repassa esquemas táticos de emboscada e linhas de defesa para manter o controle absoluto diante de perigos na rota.';
        if (t.subclass === 'assassin') return 'Você checa os punhais ocultos e a mobilidade das juntas; na estrada erma, quem ataca primeiro sobrevive.';
        if (t.subclass === 'thief') return 'Você verifica as gazuas e alivia os cantos das bolsas para mover-se tão silencioso quanto uma sombra viajante.';
        if (t.subclass === 'gloom_stalker') return 'Você sintoniza sua visão às sombras mais escuras do trajeto, antecipando onde os predadores espreitam.';
        if (t.subclass === 'hunter') return 'Você estuda a direção do vento e as marcas no chão, já calculando o alcance e as trajetórias do seu arco.';
        if (t.subclass === 'evoker') return 'Centelhas sutis formigam na ponta dos seus dedos; você mentaliza encantamentos rápidos de destruição protetora.';
        if (t.subclass === 'abjurer') return 'Fios invisíveis de proteção abjurativa envolvem sua pele; você traça runas de defesa para repelir perigos súbitos.';
        if (t.subclass === 'necromancer') return 'Você percebe os resquícios de vida e morte ao longo da rota com a impassibilidade de quem domina os véus do além.';
        if (t.subclass === 'life') return 'Você toca o relicário sagrado, emanando uma centelha de vitalidade curativa para sustentar o corpo contra a fadiga.';
        if (t.subclass === 'war') return 'Você ora pelo favor da divindade das batalhas, empunhando a fé como um escudo inquebrantável na travessia.';
        if (t.subclass === 'vengeance') return 'O peso do seu juramento de vingança guia seu passo inflexível; nada entre os portões e o destino deterá sua marcha.';
        if (t.subclass === 'devotion') return 'Sua lâmina brilha com honra e retidão; você parte como um bastião de luz contra os perigos dos ermos.';
        if (t.subclass === 'berserker') return 'O sangue ferve na expectativa da violência; seus músculos tremem com fúria contida a cada passada decidida.';
        if (t.subclass === 'lore') return 'Você recorda baladas antigas sobre as ruínas e perigos desta região, buscando pistas históricas úteis para a travessia.';
        if (t.subclass === 'moon') return 'Você sente o chamado da fera interior e o influxo dos ciclos selvagens protegendo sua forma mortal.';
        if (t.subclass === 'shadow') return 'Você respira com calma monástica, alinhando seus passos com a escuridão do terreno para passar despercebido.';
        if (t.subclass === 'fiend') return 'Um calor sulfuroso reconforta seus sentidos; seu patrono infernal cobra bravura e desdém pelo perigo.';
        if (t.subclass === 'fey') return 'Ecos zombeteiros do reino feérico dançam ao redor da sua mente, afiando seus reflexos contra ciladas e ilusões.';

        if (t.cls === 'guerreiro') return 'Você confere o peso do aço e a amarração da armadura, pronto para reagir em fração de segundo a qualquer emboscada.';
        if (t.cls === 'ladino' || t.cls === 'ladrao') return 'Você confere as lâminas curtas e elimina qualquer ponto de reflexo metálico ou ruído no equipamento.';
        if (t.cls === 'patrulheiro') return 'Você inspeciona as marcas na saída dos portões e fareja o ar para antecipar o clima e as feras da região.';
        if (t.cls === 'mago') return 'Você ajusta o grimório e revisa seus componentes arcanos na algibeira, atento às correntes invisíveis da Trama Mágica — a rede de energia primordial que permeia o mundo —, pronto para pressentir qualquer anomalia na estrada.';
        if (t.cls === 'clerigo') return 'Você murmura uma prece de proteção divina para abençoar a senda e afastar as aflições do caminho.';
        if (t.cls === 'paladino') return 'Sua armadura brilha com convicção sagrada; você firma a postura com prontidão honrada.';
        if (t.cls === 'barbaro') return 'Seus instintos selvagens farejam a liberdade dos descampados; você avança sem medo de perigos ou intempéries.';
        if (t.cls === 'druida') return 'Você mergulha a mente nos ritmos da terra, árvores e chuvas, pronto para harmonizar com os caprichos naturais do bioma.';
        if (t.cls === 'bardo') return 'Você afina os sentidos e mentaliza uma cadência de marcha para manter a prontidão e a moral afiadas.';
        if (t.cls === 'monge') return 'Seu equilíbrio interno e fluxo de ki operam em sintonia perfeita; o corpo é sua arma e seu escudo.';
        if (t.cls === 'bruxo') return 'Você toca o canalizador do seu pacto misterioso, atraindo olhares arcanos que vigiam seus passos nas sombras.';
        if (t.cls === 'feiticeiro') return 'A magia inata corre pulsante em suas veias; você mantém a centelha sobrenatural alerta e sob controle cuidadoso.';
        return '';
    }

    function _getPreparationChoices(t, biome) {
        var preps = [];
        if (!t) return preps;

        // Postura Primária (Classe / Subclasse)
        if (t.cls === 'patrulheiro') {
            preps.push({
                id: 'prep_scout',
                label: 'Postura de Batedor: Rastreio e vigilância avançada',
                desc: 'Analisa pegadas, relevo e fauna para antecipar perigos da trilha (Vantagem no 1º teste com Sabedoria).',
                isPrep: true,
                stat: 'wis',
                prepText: 'Você assume a vanguarda como batedor experiente, estudando pegadas frescas, galhos quebrados e o voo das aves para antecipar armadilhas e emboscadas.'
            });
        } else if (t.cls === 'ladino' || t.cls === 'ladrao') {
            preps.push({
                id: 'prep_stealth',
                label: 'Postura de Infiltração: Marcha velada pelas sombras',
                desc: 'Avança com passos amortecidos e discretos para evitar emboscadas (Vantagem no 1º teste com Destreza).',
                isPrep: true,
                stat: 'dex',
                prepText: 'Você amortece cada fivela metálica com tiras de tecido e avança de cobertura em cobertura, movendo-se com extrema sutileza.'
            });
        } else if (t.cls === 'guerreiro') {
            preps.push({
                id: 'prep_guard',
                label: 'Postura de Sentinela: Guarda alta e prontidão de armas',
                desc: 'Mantém armas a postos e postura firme para reagir a emboscadas na estrada (Vantagem no 1º teste com Força).',
                isPrep: true,
                stat: 'str',
                prepText: 'Você mantém a empunhadura firme e postura marcial impecável, pronto para desembainhar e reagir em fração de segundo a qualquer assalto.'
            });
        } else if (t.cls === 'barbaro') {
            preps.push({
                id: 'prep_primal',
                label: 'Postura Primal: Sentidos selvagens à flor da pele',
                desc: 'Aguça os sentidos e confia no vigor bruto para resistir aos ermos (Vantagem no 1º teste com Constituição).',
                isPrep: true,
                stat: 'con',
                prepText: 'Você aguça os ouvidos e dilata as narinas contra o vento, farejando predadores e confiando nos reflexos brutos do seu corpo.'
            });
        } else if (t.cls === 'mago') {
            preps.push({
                id: 'prep_arcane',
                label: 'Postura de Vigília Arcana: Sentir energias e perigos mágicos',
                desc: 'Sintoniza a Trama Mágica (fluxo de energia arcana do mundo) para pressentir anomalias e armadilhas (Vantagem no 1º teste com Inteligência).',
                isPrep: true,
                stat: 'int',
                prepText: 'Você expande sua percepção mística ao longo da Trama Mágica — o fluxo invisível de energia pura que permeia o mundo —, pressentindo perturbações arcanas e armadilhas antes que se manifestem na estrada.'
            });
        } else if (t.cls === 'clerigo') {
            preps.push({
                id: 'prep_sacred',
                label: 'Postura Litúrgica: Bênção de proteção aos caminhantes',
                desc: 'Invoca o favor divino para resguardar a travessia contra infortúnios (Vantagem no 1º teste com Sabedoria).',
                isPrep: true,
                stat: 'wis',
                prepText: 'Você unge seu cajado ou escudo com uma prece sagrada, invocando o manto protetor da sua divindade sobre a rota.'
            });
        } else if (t.cls === 'paladino') {
            preps.push({
                id: 'prep_bastion',
                label: 'Postura de Bastião: Juramento de vigília inabalável',
                desc: 'Irradia a convicção do seu juramento para repelir o medo e ameaças (Vantagem no 1º teste com Carisma).',
                isPrep: true,
                stat: 'cha',
                prepText: 'Você firma o peitoral e canaliza o fervor do seu juramento sagrado, irradiando determinação que espanta o medo e a hesitação.'
            });
        } else if (t.cls === 'druida') {
            preps.push({
                id: 'prep_communion',
                label: 'Postura de Comunhão: Harmonia com as forças do bioma',
                desc: 'Sintoniza com árvores, solo e fauna para decifrar alertas da natureza (Vantagem no 1º teste com Sabedoria).',
                isPrep: true,
                stat: 'wis',
                prepText: 'Você sintoniza sua audição com o murmúrio das folhas e a terra úmida, compreendendo os sinais de alerta que a natureza emite.'
            });
        } else if (t.cls === 'bardo') {
            preps.push({
                id: 'prep_tempo',
                label: 'Postura de Cadência: Ritmo estimulante de travessia',
                desc: 'Marca um compasso marcial animado para manter o ânimo e a mente afiados (Vantagem no 1º teste com Carisma).',
                isPrep: true,
                stat: 'cha',
                prepText: 'Você marca mentalmente um compasso marcial vigoroso, mantendo o ânimo elevado e a mente ágil diante de imprevistos.'
            });
        } else if (t.cls === 'monge') {
            preps.push({
                id: 'prep_focus',
                label: 'Postura Meditativa: Passo sereno e fluxo de ki',
                desc: 'Sincroniza respiração e reflexos corporais para esquivar de perigos (Vantagem no 1º teste com Destreza).',
                isPrep: true,
                stat: 'dex',
                prepText: 'Você sincroniza sua respiração ao ritmo das passadas, com a mente serena e o corpo preparado para desviar de qualquer ameaça.'
            });
        } else if (t.cls === 'bruxo') {
            preps.push({
                id: 'prep_omen',
                label: 'Postura Sobrenatural: Presságios e visões do pacto',
                desc: 'Abre a mente aos sussurros do patrono para prever armadilhas e traições (Vantagem no 1º teste com Carisma).',
                isPrep: true,
                stat: 'cha',
                prepText: 'Você abre sua mente aos sussurros do patrono de outro mundo, captando alertas ocultos sobre armadilhas e traições na trilha.'
            });
        } else if (t.cls === 'feiticeiro') {
            preps.push({
                id: 'prep_flare',
                label: 'Postura Elemental: Prontidão da centelha inata',
                desc: 'Mantém a magia instintiva pronta para reação ou barreira emergencial (Vantagem no 1º teste com Constituição).',
                isPrep: true,
                stat: 'con',
                prepText: 'Você mantém sua centelha mágica em ponto de ignição, pronta para rebentar num escudo instintivo ou rajada de pura energia.'
            });
        }

        // Postura Secundária (Raça / Sub-raça)
        if (t.race === 'dwarf') {
            preps.push({
                id: 'prep_stone',
                label: 'Postura da Rocha: Julgar a firmeza e estabilidade do solo',
                desc: 'Tradição anã de engenharia de rochas para evitar deslizamentos e quedas (Vantagem no 1º teste com Constituição).',
                isPrep: true,
                stat: 'con',
                prepText: 'Com séculos de tradição anã em minas e desfiladeiros, você lê a densidade do solo e evita deslizamentos ou terreno traiçoeiro.'
            });
        } else if (t.race === 'elf') {
            preps.push({
                id: 'prep_keen',
                label: 'Postura da Corça: Sentidos élficos despertos',
                desc: 'Visão e audição aguçadas para captar ruídos e presenças à distância (Vantagem no 1º teste com Sabedoria).',
                isPrep: true,
                stat: 'wis',
                prepText: 'Sua visão e audição élficas captam o menor tremor nas folhagens e o eco de passos a grandes distâncias.'
            });
        } else if (t.race === 'halfling') {
            preps.push({
                id: 'prep_luck',
                label: 'Postura Oportuna: Intuição para passagens seguras',
                desc: 'Astúcia e sorte tradicional para escolher atalhos discretos e desviar de perigos (Vantagem no 1º teste com Destreza).',
                isPrep: true,
                stat: 'dex',
                prepText: 'A célebre sorte e astúcia do seu povo apontam trilhas secundárias e atalhos menos visados pelos perigos da estrada.'
            });
        } else if (t.race === 'dragonborn') {
            preps.push({
                id: 'prep_dragon',
                label: 'Postura Régia: Imposição e bravura dracônica',
                desc: 'Marcha imponente para intimidar predadores e criaturas menores na rota (Vantagem no 1º teste com Carisma).',
                isPrep: true,
                stat: 'cha',
                prepText: 'Você infla o peito e marcha com imponência imutável, coagindo feras menores a manterem distância da sua rota.'
            });
        } else if (t.race === 'halforc') {
            preps.push({
                id: 'prep_tenacity',
                label: 'Postura Feroz: Resiliência contra intempéries',
                desc: 'Resistência muscular brutal para absorver impactos e a fadiga da marcha (Vantagem no 1º teste com Constituição).',
                isPrep: true,
                stat: 'con',
                prepText: 'Seu sangue resistente de meio-orc endurece sua casca contra a fadiga, preparado para absorver o impacto de qualquer perigo.'
            });
        } else if (t.race === 'tiefling') {
            preps.push({
                id: 'prep_infernal',
                label: 'Postura Infernal: Rastreio de calor e auras hostis',
                desc: 'Percepção sobrenatural para detectar variações térmicas e venenos no ar (Vantagem no 1º teste com Inteligência).',
                isPrep: true,
                stat: 'int',
                prepText: 'Sua percepção sobrenatural de tiefling detecta variações súbitas de temperatura e resquícios venenosos no ar.'
            });
        } else if (t.race === 'gnome') {
            preps.push({
                id: 'prep_ingenuity',
                label: 'Postura de Engenho: Análise minuciosa de suprimentos e rota',
                desc: 'Cálculo metódico de peso, rota e contingências para antecipar imprevistos (Vantagem no 1º teste com Inteligência).',
                isPrep: true,
                stat: 'int',
                prepText: 'Você reavalia com meticulosidade gnomica as cargas da mochila, pontos de apoio e probabilidades de tempo ao longo da rota.'
            });
        } else if (t.race === 'halfelf') {
            preps.push({
                id: 'prep_adapt',
                label: 'Postura Versátil: Adaptação reflexiva ao terreno',
                desc: 'Flexibilidade de marcha para se adaptar com agilidade às mudanças do caminho (Vantagem no 1º teste com Sabedoria).',
                isPrep: true,
                stat: 'wis',
                prepText: 'Com o equilíbrio dos dois mundos, você ajusta seu ritmo de marcha com flexibilidade às surpresas do caminho.'
            });
        } else {
            preps.push({
                id: 'prep_grit',
                label: 'Postura Obstinada: Determinação férrea de caminhada',
                desc: 'Fôlego e disciplina constantes para manter o ritmo sem esmorecer (Vantagem no 1º teste com Constituição).',
                isPrep: true,
                stat: 'con',
                prepText: 'Sua disciplina e determinação humana recusam a exaustão, mantendo passos firmes mesmo sob vento forte e terreno pedregoso.'
            });
        }

        return preps;
    }

    function getConfirmationContent(player, j) {
        var t = _traits(player);
        var dest = (j && j.displayName) || 'destino desconhecido';
        var steps = (j && j.total) || 3;
        var biome = (j && j.biome) || 'plains';

        var script = [
            { type: 'narration', text: 'Você contempla a rota para <b>' + dest + '</b> além dos portões. A travessia pelas terras ermas exigirá <b>' + steps + ' etapas</b> de marcha contínua.' }
        ];

        var rFlavor = _getRaceConfirmationNarration(t, biome);
        if (rFlavor) script.push({ type: 'narration', text: rFlavor });

        var cFlavor = _getClassConfirmationNarration(t, biome);
        if (cFlavor) script.push({ type: 'narration', text: cFlavor });

        var choices = [
            {
                id: 'jrn_go',
                label: 'Partir em marcha padrão',
                desc: 'Avançar no ritmo comum da estrada, sem preparação tática especial.'
            }
        ];

        var prepChoices = _getPreparationChoices(t, biome);
        for (var i = 0; i < prepChoices.length; i++) {
            choices.push(prepChoices[i]);
        }

        choices.push({
            id: 'jrn_cancel',
            label: 'Permanecer na cidade',
            desc: 'Suspender a viagem e continuar em segurança dentro dos muros da cidade.'
        });

        return {
            script: script,
            choices: choices,
            choicesTitle: 'Preparação de Viagem',
            choicesSubtitle: 'Rumo a ' + dest,
            compact: true
        };
    }

    global.JourneyData = {
        HAZARDS: HAZARDS,
        HAZARDS_EXTRA: HAZARDS_EXTRA,
        SAFE: SAFE,
        DEPARTURES: DEPARTURES,
        RISK_CHANCE: RISK_CHANCE,
        RARE_COMBAT_CHANCE: RARE_COMBAT_CHANCE,
        stepsForDistance: stepsForDistance,
        pickFreshHazard: pickFreshHazard,
        pickFreshSafe: pickFreshSafe,
        pickDeparture: pickDeparture,
        pickFreshDeparture: pickFreshDeparture,
        resolveJourneyCheck: resolveJourneyCheck,
        successPctForChoice: successPctForChoice,
        canTakeChoice: canTakeChoice,
        getConfirmationContent: getConfirmationContent,
        pickNarrative: pickNarrative
    };
})(typeof window !== 'undefined' ? window : this);
