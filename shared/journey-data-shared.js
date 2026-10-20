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
          fNarr: 'A corda corta sua perna ao apertar. Sangue quente escorre — o nó travou no movimento errado.', dmg: 3,
          condition: { id: 'sprained', icon: '🦶', label: 'Torção no Tornozelo (−3m)', desc: 'Deslocamento reduzido em 3m (-2 hexes) e desvantagem em testes de Destreza no mapa.' } },
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
          fNarr: 'A corda lacera sua pele antes de ceder — sangue desce pela bota.', dmg: 4 },
        { i: '🤝', t: 'Companheiro trava a alavanca', stat: 'str', dc: 10,
          requires_ally: true,
          desc: 'Seu companheiro corre e firma o galho curvado com ambas as mãos.',
          sNarr: 'Seu companheiro de grupo trava a madeira curvada antes do chicoteio; você desata o laço com calma e agradece o trabalho em equipe.',
          sNarr_by_ally: 'Seu companheiro de grupo trava a madeira curvada antes do chicoteio; você desata o laço com calma e agradece o trabalho em equipe.',
          fNarr: 'Seu aliado escorrega nas folhas úmidas e o galho bate de raspão no seu ombro antes de soltar.', dmg: 2,
          fNarr_by_ally: 'Seu aliado escorrega nas folhas úmidas e o galho bate de raspão no seu ombro antes de soltar.' },
        { i: '🌿', t: 'Instinto silvestre aguçado', stat: 'wis', dc: 10,
          requires_subrace: ['wood', 'forest_gnome'],
          desc: 'Percepção natural detecta o gatilho disfarçado pela folhagem.',
          sNarr: 'Seus sentidos de habitante das matas percebem o arranjo falso das folhas secas antes de descarregar todo o peso; você desvia com um passo leve.',
          fNarr: 'A folhagem falsa engana seus passos e a corda tensiona no tornozelo.', dmg: 2 }
      ] },

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
          fNarr: 'O galho é mais pesado do que parece — torce seu pulso e te empurra contra um tronco lateral.', dmg: 2,
          condition: { id: 'bruised', icon: '💥', label: 'Contusão Muscular (−1)', desc: 'Penalidade em testes físicos de Força e testes atléticos no mapa.' } },
        { i: '🛡', t: 'Guarda marcial com escudo', stat: 'str', dc: 10,
          requires_class: ['guerreiro', 'paladino', 'clerigo'],
          desc: 'Fincar a postura defensiva e aparar o impacto no rebordo de aço.',
          sNarr: 'Você crava as botas e ergue o escudo em ângulo oblíquo; a madeira podre se estilhaça em pedaços inofensivos contra o metal reforçado.',
          fNarr: 'O impacto quebra as fibras do escudo e choca com força o seu ombro.', dmg: 2 },
        { i: '🤝', t: 'Puxão salvador de aliado', stat: 'dex', dc: 10,
          requires_ally: true,
          desc: 'Seu companheiro percebe o estalo e puxa você pelo cinturão a tempo.',
          sNarr: 'Seu parceiro de viagem reage com velocidade espantosa, arrancando você da linha de queda um segundo antes do estrondo no solo.',
          sNarr_by_ally: 'Seu parceiro de viagem reage com velocidade espantosa, arrancando você da linha de queda um segundo antes do estrondo no solo.',
          fNarr: 'O puxão desequilibra vocês dois; caem juntos na terra enquanto galhos menores riscam suas capas.', dmg: 1,
          fNarr_by_ally: 'O puxão desequilibra vocês dois; caem juntos na terra enquanto galhos menores riscam suas capas.' },
        { i: '✨', t: 'Pulso arcano de repulsão', stat: 'int', dc: 11,
          requires_class: ['mago', 'feiticeiro', 'bruxo'],
          desc: 'Erguer um anteparo místico cinético para defletir o tronco.',
          sNarr: 'Com uma palavra de comando, uma barreira translúcida de energia desvia o galho para longe do caminho.',
          fNarr: 'A concentração falha no susto e lascas de casca cortam seu braço.', dmg: 2 }
      ] },

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
          fNarr: 'Por um instante você reconhece a voz da sua mãe. Você para. Quando volta a si, sangue escorre do nariz e há horas que você não anda.', dmg: 3,
          condition: { id: 'exhaustion', icon: '⏳', label: 'Exausto (Fadiga Nv. 1)', desc: 'Exaustão Nível 1: Desvantagem em testes de atributo e perícias durante a exploração.' } },
        { i: '🙏', t: 'Prece de proteção sagrada', stat: 'wis', dc: 11,
          requires_class: ['clerigo', 'paladino'],
          desc: 'Invocar bênção radiante que purifica o ar de espíritos zombeteiros.',
          sNarr: 'Uma aura morna de serenidade afasta as ilusões auditivas; a floresta curva-se em silêncio respeitoso.',
          fNarr: 'Os ecos perturbam sua mente por um instante antes de se dissiparem.', dmg: 2 },
        { i: '🤝', t: 'Manter conversa firme com aliados', stat: 'cha', dc: 10,
          requires_ally: true,
          desc: 'Conversar com seu companheiro em voz alta para quebrar o encanto ilusório.',
          sNarr: 'O som familiar e confiante de seus companheiros rompe o transe; as vozes sombrias perdem todo o poder sobre vocês.',
          sNarr_by_ally: 'O som familiar e confiante de seus companheiros rompe o transe; as vozes sombrias perdem todo o poder sobre vocês.',
          fNarr: 'As vozes fazem vocês hesitarem na trilha antes de retomarem o ritmo.', dmg: 1,
          fNarr_by_ally: 'As vozes fazem vocês hesitarem na trilha antes de retomarem o ritmo.' },
        { i: '🧝', t: 'Cântico ancestral em élfico', stat: 'int', dc: 10,
          requires_race: ['elf', 'halfelf'],
          desc: 'Responder aos espíritos silvestres com versos poéticos na língua antiga.',
          sNarr: 'Ao ouvir as frases harmônicas dos elfos, os ecos da mata se acalmam em um murmúrio dócil de folhas dançantes.',
          fNarr: 'A lembrança dos versos hesita e um arrepio gélido percorre sua espinha.', dmg: 2 }
      ] },

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
          fNarr: 'Você afunda até as canelas. Vinte minutos de pânico depois, sai sujo, exausto, com algo se mexendo dentro da bota.', dmg: 2,
          condition: { id: 'exhaustion', icon: '⏳', label: 'Exausto (Fadiga Nv. 1)', desc: 'Exaustão Nível 1: Desvantagem em testes de atributo e perícias durante a exploração.' } },
        { i: '💪', t: 'Salto atlético sobre as pedras', stat: 'str', dc: 12,
          desc: 'Impulso vigoroso para alcançar a margem de pedras secas.',
          sNarr: 'Com força atlética explosiva, você projeta o corpo além da lama viscosa e aterrissa com firmeza sobre terra seca.',
          fNarr: 'O solo escorrega sob a sola da bota e você atola até a canela, perdendo o fôlego.', dmg: 2 },
        { i: '🧗', t: 'Passos leves e acrobáticos', stat: 'dex', dc: 11,
          requires_class: ['ladino', 'monge', 'bardo'],
          desc: 'Distribuir o peso com agilidade sobre galhos e saliências superficiais.',
          sNarr: 'Tocando apenas as pontas dos pés com agilidade dançante, você transpõe o atoleiro antes que o lodo possa puxá-lo.',
          fNarr: 'Uma raiz fina quebra sob a pisada rápida e a lama espirra em suas vestes.', dmg: 1 },
        { i: '🤝', t: 'Apoio com corda de aliado', stat: 'str', dc: 10,
          requires_ally: true,
          desc: 'Seu companheiro finca uma estaca ou segura uma corda firme da outra margem.',
          sNarr: 'Trabalhando em equipe com uma corda de escalada, vocês cruzam a depressão lodosa sem risco de afundar.',
          sNarr_by_ally: 'Trabalhando em equipe com uma corda de escalada, vocês cruzam a depressão lodosa sem risco de afundar.',
          fNarr: 'A corda estica bruscamente e puxa seu companheiro para a borda da poça lamacenta.', dmg: 1,
          fNarr_by_ally: 'A corda estica bruscamente e puxa seu companheiro para a borda da poça lamacenta.' },
        { i: '👣', t: 'Passo leve de pequenino', stat: 'dex', dc: 10,
          requires_race: ['halfling', 'gnome'],
          desc: 'Aproveitar o peso reduzido e o equilíbrio natural para não afundar.',
          sNarr: 'Sua estatura diminuta e leveza de passos mal deixam marcas na lama; você passa correndo como se o lodo fosse chão batido.',
          fNarr: 'Uma poça funda engole sua bota menor, exigindo puxão enérgico.', dmg: 1 }
      ] },

    { title: 'Círculo de Pedras Rúnicas',
      script: [
        { type: 'narration', text: 'Monólitos ancestrais cobertos de líquen formam uma clareira circular entre as faias antigas.' },
        { type: 'narration', text: 'O ar dentro do círculo vibra com ressonância mágica suave, e runas gastas pelo tempo brilham tênues sob o dossel.' }
      ],
      choices: [
        { i: '🌿', t: 'Comunhão com os espíritos da mata', stat: 'wis', dc: 11,
          desc: 'Respirar fundo e harmonizar-se com a energia pacífica do local.',
          sNarr: 'Uma onda de calma revigorante percorre seus membros; a floresta parece reconhecer sua intenção pacífica.',
          sNarr_by_class: {
            druida: 'Você toca o monólito central e ouve os ecos de druidas de eras passadas, renovando sua comunhão natural.',
            patrulheiro: 'Você reconhece o santuário como marco seguro dos guardiões da fronteira; o descanso é pleno.'
          },
          fNarr: 'A energia mágica oscila e causa um leve formigamento de desorientação.', dmg: 1 },
        { i: '📜', t: 'Decifrar inscrições arcanas', stat: 'int', dc: 12,
          desc: 'Examinar os glifos talhados na rocha com olhar acadêmico.',
          sNarr: 'Você decifra fragmentos de um poema élfico de proteção; a compreensão do encantamento amplia seus horizontes.',
          sNarr_by_class: {
            mago: 'A geometria das runas é impecável. Você anota os princípios de contenção em seu grimório com fascínio.',
            bardo: 'Você reconhece a melodia gravada em notas rúnicas e assobia um compasso alegre em homenagem.'
          },
          fNarr: 'As runas são complexas demais e o esforço mental deixa uma leve enxaqueca.', dmg: 1 },
        { i: '🤝', t: 'Descanso protegido com companheiros', stat: null,
          requires_ally: true,
          desc: 'Aproveitar a santidade do círculo para conferir mantimentos e equipamentos em grupo.',
          sNarr: 'Abrigados no interior das pedras protetoras, você e seus companheiros recuperam o fôlego com total segurança.',
          sNarr_by_ally: 'Abrigados no interior das pedras protetoras, você e seus companheiros recuperam o fôlego com total segurança.',
          fNarr: '' },
        { i: '🚶', t: 'Passar com respeito e seguir', stat: null,
          desc: 'Fazer uma reverência discreta e continuar a jornada sem tocar nas pedras.',
          sNarr: 'Você cruza a clareira em silêncio reverente; as pedras permanecem imóveis enquanto você retoma a trilha.',
          fNarr: '' }
      ] }
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
          fNarr: 'Não há abrigo. Você se agacha e espera, cuspindo areia.', dmg: 1 },
        { i: '🤝', t: 'Formação cerrada com aliados', stat: 'con', dc: 10,
          requires_ally: true,
          desc: 'Avançar ombro a ombro com mantos entrelaçados para dividir a força da ventania.',
          sNarr: 'Unidos em formação cerrada, vocês protegem a respiração uns dos outros e mantêm o rumo sem desviar um único passo.',
          sNarr_by_ally: 'Unidos em formação cerrada, vocês protegem a respiração uns dos outros e mantêm o rumo sem desviar um único passo.',
          fNarr: 'Uma rajada lateral desequilibra a fila e areia fina invade as mochilas.', dmg: 1,
          fNarr_by_ally: 'Uma rajada lateral desequilibra a fila e areia fina invade as mochilas.' },
        { i: '🗿', t: 'Vigor maciço inabalável', stat: 'con', dc: 9,
          requires_race: ['dwarf', 'halforc', 'dragonborn'],
          desc: 'Fincar os pés no solo e cortar a tempestade como um bloco de rocha.',
          sNarr: 'Sua compleição física formidável simplesmente ignora o açoite das rajadas; você marcha imperturbável pelo vendaval.',
          fNarr: 'A poeira espirra forte contra seus olhos, forçando uma pausa curta.', dmg: 1 },
        { i: '✨', t: 'Desvio arcano da poeira', stat: 'int', dc: 11,
          requires_class: ['mago', 'druida', 'feiticeiro'],
          desc: 'Canalizar um vórtice de ar contrário para abrir passagem limpa.',
          sNarr: 'Com um gesto circular, você molda uma corrente de ar que lança a poeira para cima, mantendo o grupo em uma bolha de ar limpo.',
          fNarr: 'A força da rajada sobrepuja a concentração mágica e joga terra em suas vestes.', dmg: 2 }
      ] },

    { title: 'Bandidos da Estrada',
      npc: { name: 'Kragor, o Líder Fora-da-Lei', desc: 'Veterano de guerra desempregado', portrait: '../shared/img/npcs/kragor-bandido.webp' },
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
          fNarr: 'Uma flecha o atinge nas costas antes de você sumir. O ferimento não é fatal mas sangra muito.', dmg: 4 },
        { i: '⚔️', t: 'Intimidação militar em comitiva', stat: 'str', dc: 11,
          requires_ally: true,
          desc: 'Você e seus companheiros desembainham as armas ao mesmo tempo em formação marcial perfeita.',
          sNarr: 'O som sincronizado do aço sendo desembainhado pelo seu grupo gela a espinha dos assaltantes; vendo que a luta custará caro, eles abaixam as lâminas e recuam.',
          sNarr_by_ally: 'O som sincronizado do aço sendo desembainhado pelo seu grupo gela a espinha dos assaltantes; vendo que a luta custará caro, eles abaixam as lâminas e recuam.',
          fNarr: 'Os veteranos aceitam a provocação e cerram fileiras para avançar!', dmg: 3,
          fNarr_by_ally: 'Os veteranos aceitam a provocação e cerram fileiras para avançar!' },
        { i: '🎖', t: 'Código de honra militar', stat: 'cha', dc: 10,
          requires_background: ['soldier', 'noble', 'folk_hero'],
          desc: 'Evocar os antigos regimentos da coroa ou o dever para com o povo.',
          sNarr: 'Você recita a antiga saudação dos regimentos de fronteira; o líder arregala os olhos, bate continência com a mão enluvada e dá passagem com respeito sincero.',
          fNarr: 'O líder balança a cabeça amargurado: "Honra não enche a barriga dos nossos filhos, viajante."', dmg: 2 }
      ] },

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
          sNarr: 'Você corre. Quando para, está cerca de dois marcos adiante e o som dos cascos sumiu.',
          fNarr: 'Você cansa antes do esperado. As pernas pesam pelo resto da jornada.', dmg: 2 },
        { i: '🐎', t: 'Acalmar o animal com empatia', stat: 'wis', dc: 10,
          requires_class: ['druida', 'patrulheiro', 'bardo'],
          desc: 'Emitir um som cadenciado e estender a mão para conter o pânico da fera.',
          sNarr: 'O animal desacelera em círculos, bufa aliviado ao sentir sua serenidade e sinaliza a colina antes de galopar em segurança para o vale.',
          fNarr: 'O cavalo relincha em susto e quase atinge sua bagagem ao desviar bruscamente.', dmg: 1 },
        { i: '🤝', t: 'Cobertura em flanco com aliados', stat: 'wis', dc: 10,
          requires_ally: true,
          desc: 'Seu companheiro vigia os arbustos altos enquanto você analisa o rastro sem ser surpreendido.',
          sNarr: 'Graças à vigília atenta de seus companheiros, você confirma com segurança total que o predador já se afastou vários marcos ao norte.',
          sNarr_by_ally: 'Graças à vigília atenta de seus companheiros, você confirma com segurança total que o predador já se afastou vários marcos ao norte.',
          fNarr: 'O vento no capim alto gera um falso alarme, assustando o grupo por instantes.', dmg: 0,
          fNarr_by_ally: 'O vento no capim alto gera um falso alarme, assustando o grupo por instantes.' },
        { i: '🏹', t: 'Instinto de caçador de fronteira', stat: 'wis', dc: 10,
          requires_background: ['outlander', 'hermit'],
          desc: 'Reconhecer imediatamente os hábitos do predador pelo odor e tipo de pisada.',
          sNarr: 'Você sente o cheiro característico no vento e sabe a idade e direção da fera; orienta a marcha contornando a rota sem qualquer perigo.',
          fNarr: 'O vento sopra em redemoinho e dilui os odores da estepe.', dmg: 1 }
      ] },

    { title: 'Monólito dos Antigos Reis',
      script: [
        { type: 'narration', text: 'Uma coluna colossal de pedra calcária se ergue solitária no meio da vastidão da planície.' },
        { type: 'narration', text: 'Entalhes de cavaleiros de armadura pesada e espadas erguidas decoram a base, guardando a memória dos antigos monarcas de Valdoria.' }
      ],
      choices: [
        { i: '📜', t: 'Estudar os anais históricos', stat: 'int', dc: 11,
          desc: 'Decifrar os nomes dos generais e batalhas gravados na pedra.',
          sNarr: 'Você reconhece a genealogia da dinastia fundadora; as lições táticas gravadas ali inspiram confiança marcial para o resto da viagem.',
          sNarr_by_class: {
            mago: 'A clareza dos glifos históricos enriquece seus estudos arcanos sobre as defesas do reino.',
            bardo: 'Você memoriza a balada dos antigos reis e ganha novas estrofes para suas canções de estrada.'
          },
          fNarr: 'A erosão apagou as palavras essenciais, restando apenas poeira calcária.', dmg: 0 },
        { i: '🙏', t: 'Homenagem aos guerreiros caídos', stat: 'wis', dc: 10,
          desc: 'Fazer uma saudação respeitosa em honra aos antigos defensores da planície.',
          sNarr: 'Uma brisa suave e reconfortante sopra pelos campos, como se o espírito dos guerreiros abençoasse a comitiva de aventureiros.',
          sNarr_by_class: {
            paladino: 'Seu juramento ressoa com os ideais gravados na rocha; uma bênção radiante acalma seu coração.',
            clerigo: 'Você entoa uma bênção de repouso eterno para as almas dos bravos caídos.'
          },
          fNarr: 'A pedra permanece fria e silenciosa sob o céu aberto.', dmg: 0 },
        { i: '🤝', t: 'Companheiro ajuda a inspecionar o topo', stat: 'str', dc: 10,
          requires_ally: true,
          desc: 'Apoiar os ombros de seu aliado para alcançar os relevos mais altos do monumento.',
          sNarr: 'Trabalhando juntos, vocês alcançam um nicho elevado onde encontram um antigo marco de pedra com água de chuva limpa e fresca.',
          sNarr_by_ally: 'Trabalhando juntos, vocês alcançam um nicho elevado onde encontram um antigo marco de pedra com água de chuva limpa e fresca.',
          fNarr: 'A pedra calcária esfarela na quina e você desce deslizando com poeira nos braços.', dmg: 1,
          fNarr_by_ally: 'A pedra calcária esfarela na quina e você desce deslizando com poeira nos braços.' },
        { i: '🚶', t: 'Contemplar de longe e seguir', stat: null,
          desc: 'Seguir a viagem mantendo o monumento como ponto de referência no horizonte.',
          sNarr: 'A silhueta imponente da coluna guia seus passos em linha reta pela vastidão dos trigais.',
          fNarr: '' }
      ] },

    { title: 'O Marco Esquecido do Pioneiro',
      script: [
        { type: 'narration', text: 'À margem da antiga trilha de terra batida, ergue-se um monólito de basalto negro parcialmente tombado, salpicado por líquens acinzentados.' },
        { type: 'narration', text: 'Na face de pedra voltada para o norte, runas profundas e a flor-de-lis de Valdoria resistem ao tempo: <i>«Marco VII — Fundação do Primeiro Círculo — 1 Hora de Marcha aos Portões»</i>.' },
        { type: 'narration', text: 'Na base da rocha, um pequeno nicho vedado com chumbo antigo parece ter cedido à erosão das chuvas.' }
      ],
      choices: [
        { i: '🔍', t: 'Examinar o nicho e decifrar as runas', stat: 'int', dc: 10,
          desc: 'Investigar os entalhes geométricos e a cavidade vedada na base da pedra.',
          giveItem: 'Placa do Marco Primordial',
          flag: 'found_marco_relic',
          sNarr: 'Você raspa o musgo com cuidado. O texto narra como os primeiros batedores da fundação de Valdoria fincaram esses marcos a cada hora de marcha a pé para traçar os caminhos seguros das terras ermas. Dentro do nicho, você encontra a <b>Placa do Marco Primordial</b> de cobre oxidado! <i>(Missão: Leve a placa ao Mestre Cartógrafo Corvus na cidade para aprender os segredos das antigas rotas)</i>.',
          sNarr_by_class: {
            mago: 'Você reconhece a caligrafia geométrica dos primeiros escribas arcanos da corte fundadora.',
            ladino: 'Com perícia sutil, você abre o lacre de chumbo sem danificar a relíquia antiga.'
          },
          fNarr: 'A erosão pelo vento desgastou a maioria dos numerais, mas a estrutura ainda confirma que você está no traçado original de marcha da fundação.', dmg: 0 },
        { i: '🧭', t: 'Usar o alinhamento como guia de marcha', stat: 'wis', dc: 11,
          desc: 'Calcular a direção exata que a face entalhada aponta em direção a Valdoria.',
          isShortcut: true,
          sNarr: 'A inclinação da pedra aponta exatamente o corredor de terreno firme desbravado pelos antigos batedores. Você ganha tempo e encurta o caminho!',
          fNarr: 'A estepe ondulada confunde suas medições visuais no horizonte.', dmg: 1 },
        { i: '🙏', t: 'Prece aos batedores pioneiros', stat: 'wis', dc: 10,
          requires_background: ['outlander', 'soldier', 'folk_hero', 'hermit'],
          desc: 'Deixar uma pequena oferenda de ervas em homenagem aos andarilhos que desbravaram as primeiras trilhas.',
          sNarr: 'Uma sensação de foco e serenidade preenche seu peito. Os passos parecem mais leves sob a bênção dos antigos batedores da estrada.',
          fNarr: 'O vento dispersa as folhas secas pela planície.', dmg: 0 },
        { i: '➡️', t: 'Registrar mentalmente e seguir', stat: null,
          desc: 'Anotar a posição da pedra como referência e retomar a caminhada.',
          sNarr: 'Você memoriza a silhueta do marco e retoma o passo com ritmo constante.',
          fNarr: '' }
      ] }
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
          fNarr: 'Você afunda mais antes de escapar. Lama nos pulmões — tosse molhada por horas.', dmg: 4 },
        { i: '🤝', t: 'Tracionamento sincronizado com aliado', stat: 'str', dc: 10,
          requires_ally: true,
          desc: 'Seu companheiro finca as botas em raiz firme e estende a haste da lança.',
          sNarr: 'Seu aliado estende a haste com firmeza e puxa seu peso em um movimento fluido, livrando suas pernas da sucção sem esforço.',
          sNarr_by_ally: 'Seu aliado estende a haste com firmeza e puxa seu peso em um movimento fluido, livrando suas pernas da sucção sem esforço.',
          fNarr: 'A lama puxa com força inesperada e seu companheiro quase escorrega junto.', dmg: 2,
          fNarr_by_ally: 'A lama puxa com força inesperada e seu companheiro quase escorrega junto.' },
        { i: '✨', t: 'Passo leve ou levitação mística', stat: 'int', dc: 11,
          requires_class: ['mago', 'bruxo', 'feiticeiro', 'monge'],
          desc: 'Canalizar energia mística para anular a densidade sob a sola dos pés.',
          sNarr: 'Seus pés mal tocam a lama lodosa; uma película de energia mágica desliza seu corpo para terra firme.',
          fNarr: 'A concentração quebra com a frieza do lodo e a lama engole suas botas.', dmg: 2 }
      ] },

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
          fNarr: 'A margem é traiçoeira. Você escorrega e cai na água. Não foi a nuvem, mas foi feio.', dmg: 2 },
        { i: '🌿', t: 'Filtro de ervas purificadoras', stat: 'wis', dc: 10,
          requires_class: ['druida', 'clerigo', 'patrulheiro'],
          desc: 'Umedecer um tecido com folhas balsâmicas para respirar através do filtro.',
          sNarr: 'As ervas medicinais neutralizam o aroma doce e letal; vocês cruzam a cortina de miasma com os pulmões protegidos.',
          fNarr: 'O miasma satura o tecido rápido demais e a garganta começa a arder.', dmg: 2 },
        { i: '🍺', t: 'Resistência anã a toxinas', stat: 'con', dc: 9,
          requires_race: 'dwarf',
          desc: 'Fisiologia resistente de anão habituado a vapores de minas e gases pesados.',
          sNarr: 'Seu sangue resistente pigarreia e ignora a névoa tóxica; você caminha com passos firmes sem vacilar a vista.',
          fNarr: 'A fumaça acre faz seus olhos lacrimejarem na saída.', dmg: 1 },
        { i: '🤝', t: 'Orientação mútua pelas correntes de ar', stat: 'wis', dc: 10,
          requires_ally: true,
          desc: 'Avançar em linha com o companheiro monitorando as lufadas de vento limpo.',
          sNarr: 'Comunicando-se em sussurros rápidos, vocês seguem as brechas de ar fresco e contornam a bolsa de gás sem respirar a névoa.',
          sNarr_by_ally: 'Comunicando-se em sussurros rápidos, vocês seguem as brechas de ar fresco e contornam a bolsa de gás sem respirar a névoa.',
          fNarr: 'Uma rajada repentina joga uma golfada de vapor nos rostos do grupo.', dmg: 2,
          fNarr_by_ally: 'Uma rajada repentina joga uma golfada de vapor nos rostos do grupo.' }
      ] },

    { title: 'Caçador Solitário',
      npc: { name: 'Tark, o Caçador do Pântano', desc: 'Eremita que protege o ecossistema', portrait: '../shared/img/npcs/tark-cacador.webp' },
      script: [
        { type: 'narration', text: 'Você ouve uma flecha cravar numa árvore a um metro do seu rosto. Aviso, não erro.' },
        { type: 'speech', speaker: 'Caçador do Pântano', text: '— Pare aí. <i>(a voz vem das sombras das árvores)</i> Esse pântano não é estrada. Quem cruza paga.' },
        { type: 'speech', speaker: 'Caçador do Pântano', text: '— Não quero ouro. Quero promessa: o que você caçar aqui, você come ou usa. Nada de troféus, nada de venda. Concorda?' }
      ],
      choices: [
        { i: '🤝', t: 'Concordar', stat: null,
          desc: 'Aceitar os termos do pântano.',
          sNarr: 'Você concorda em voz alta. A flecha some da árvore ao seu lado — recolhida sem você ver. "Boa jornada, viajante. O pântano se lembra."',
          fNarr: '' },
        { i: '🗣', t: 'Negociar isenção', stat: 'cha', dc: 14,
          desc: 'Explicar que está só de passagem, não vai caçar nada.',
          sNarr: 'Você explica seu propósito com clareza. Ele aceita — silêncio do mato como assinatura. "Cruze rápido então. E olhe pra trás antes de entrar nas raízes grandes."',
          fNarr: 'Ele não acredita. Outra flecha — esta passa raspando o ombro. Você corre.', dmg: 3 },
        { i: '🏹', t: 'Sinal de respeito entre batedores', stat: 'wis', dc: 10,
          requires_class: ['patrulheiro', 'druida', 'ladino'],
          desc: 'Responder com o sinal gestual mudo dos rastreadores de fronteira.',
          sNarr: 'Ao ver seu gesto profissional, o caçador abaixa o arco e acena: "Um companheiro de trilha. As raízes ao norte estão secas hoje."',
          fNarr: 'O eremita desconfia do sinal e exige passos rápidos.', dmg: 0 },
        { i: '👥', t: 'Apresentar a comitiva pacífica', stat: 'cha', dc: 11,
          requires_ally: true,
          desc: 'Garantir a postura serena e inofensiva de todo o grupo de viajantes.',
          sNarr: 'A compostura equilibrada de seus companheiros tranquiliza o caçador, que recolhe sua flecha e indica a trilha segura.',
          sNarr_by_ally: 'A compostura equilibrada de seus companheiros tranquiliza o caçador, que recolhe sua flecha e indica a trilha segura.',
          fNarr: 'O caçador mantém a flecha mirada até vocês sumirem na névoa.', dmg: 0,
          fNarr_by_ally: 'O caçador mantém a flecha mirada até vocês sumirem na névoa.' }
      ] },

    { title: 'Fogo-Fátuo da Charneca',
      script: [
        { type: 'narration', text: 'Pequenas esferas de luz azulada dançam sobre as poças escuras, cintilando em ritmo hipnótico.' },
        { type: 'narration', text: 'Uma canção inaudível parece sussurrar em sua mente, convidando você a desviar da trilha em direção à água funda.' }
      ],
      choices: [
        { i: '🧠', t: 'Resistir ao encanto hipnótico', stat: 'wis', dc: 12,
          desc: 'Firmar os olhos nas próprias botas e ignorar as luzes ilusórias.',
          sNarr: 'Você fecha a mente para a atração ilusória; as chamas frias percebem sua resistência e se dissipam no charco.',
          sNarr_by_class: {
            monge: 'Sua mente vazia e disciplinada é imune a truques luminosos; você caminha com serenidade absoluta.',
            mago: 'Você reconhece a tecitura de encantamento menor e desfaz o feitiço com um simples gesto de dispersão.'
          },
          fNarr: 'Por instantes você dá dois passos em direção ao charco, molhando as canelas antes de despertar.', dmg: 2 },
        { i: '🙏', t: 'Purificação com luz sagrada', stat: 'wis', dc: 10,
          requires_class: ['clerigo', 'paladino'],
          desc: 'Erguer um símbolo sagrado e emitir um brilho radiante que afasta as aparições.',
          sNarr: 'A luz divina ofusca os fogos-fátuos, que se dissolvem soltando um assobio sibilante de derrota.',
          fNarr: 'A luz sagrada vacila na névoa densa antes de clarear o caminho.', dmg: 1 },
        { i: '🤝', t: 'Companheiro alerta o perigo', stat: 'dex', dc: 10,
          requires_ally: true,
          desc: 'Seu aliado percebe o transe e puxa seu ombro de volta para a trilha seca.',
          sNarr: 'A mão firme de seu companheiro rompe o fascínio instantaneamente: "Não olhe para a água funda, amigo!" Vocês passam em segurança.',
          sNarr_by_ally: 'A mão firme de seu companheiro rompe o fascínio instantaneamente: "Não olhe para a água funda, amigo!" Vocês passam em segurança.',
          fNarr: 'Vocês dois hesitam por alguns segundos antes de se recomporem.', dmg: 1,
          fNarr_by_ally: 'Vocês dois hesitam por alguns segundos antes de se recomporem.' },
        { i: '🧝', t: 'Firmeza élfica contra encantos', stat: 'wis', dc: 9,
          requires_race: 'elf',
          desc: 'Imunidade inata dos elfos a efeitos mágicos de fascínio.',
          sNarr: 'Seu sangue de elfo acha a dança luminosa risível; você cruza a charneca sorrindo da tentativa vã dos espíritos.',
          fNarr: 'A luminescência irrita sua visão periférica por alguns momentos.', dmg: 1 }
      ] }
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
          fNarr: 'Pedras vêm com a neve. Quebra de costela. Você sobrevive mas dói cada respiração.', dmg: 4 },
        { i: '🤝', t: 'Fixar âncora de corda com o grupo', stat: 'str', dc: 11,
          requires_ally: true,
          desc: 'Você e seu aliado cravam apoios na rocha e ancoram o grupo com corda de escalada.',
          sNarr: 'Cravando os apoios de aço na rocha nua, vocês suportam a torrente de neve presos com segurança enquanto o turbilhão despenca no desfiladeiro.',
          sNarr_by_ally: 'Cravando os apoios de aço na rocha nua, vocês suportam a torrente de neve presos com segurança enquanto o turbilhão despenca no desfiladeiro.',
          fNarr: 'Um dos apoios cede na neve fofa e puxa o ombro de seu companheiro.', dmg: 3,
          fNarr_by_ally: 'Um dos apoios cede na neve fofa e puxa o ombro de seu companheiro.' },
        { i: '✨', t: 'Cúpula mística de deflexão', stat: 'int', dc: 11,
          requires_class: ['mago', 'feiticeiro', 'bruxo'],
          desc: 'Criar um escudo arcano em cunha para dividir o fluxo de neve para as laterais.',
          sNarr: 'Um arco cintilante de força divide a massa de gelo como a proa de um navio quebrando ondas congeladas.',
          fNarr: 'A pressão violenta racha a barreira mística e estilhaços de gelo batem em suas costas.', dmg: 3 }
      ] },

    { title: 'Fenda Profunda',
      script: [
        { type: 'narration', text: 'O caminho corta uma fenda. Quatro metros de largura — possível. O fundo se perde em escuridão azul, ar gelado subindo.' },
        { type: 'narration', text: 'Cair seria queda livre por mais tempo do que se quer pensar.' }
      ],
      choices: [
        { i: '🧗', t: 'Saltar com ímpeto', stat: 'str', dc: 12,
          desc: 'Recuo, corrida, salto de fé.',
          sNarr: 'Salto perfeito. Pés firmes do outro lado. Você se permite olhar pra trás, suspirar, seguir.',
          fNarr: 'Você escorrega na borda do salto e bate o ombro ao subir. Por um instante, achou que seria fim de tudo.', dmg: 3 },
        { i: '🤸', t: 'Salto acrobático preciso', stat: 'dex', dc: 11,
          requires_class: ['monge', 'ladino', 'bardo'],
          desc: 'Impulso suave e aterrissagem equilibrada tocando a quina de pedra sem ruído.',
          sNarr: 'Com agilidade acrobática graciosa, você pousa do outro lado da fenda com a leveza de um felino.',
          fNarr: 'A borda de pedra esfarela sob seus dedos e você rala os joelhos ao se puxar.', dmg: 2 },
        { i: '🤝', t: 'Ponte de corda estendida com aliados', stat: 'str', dc: 10,
          requires_ally: true,
          desc: 'Um aventureiro cruza com a ponta da corda e firma a ancoragem para o restante passar.',
          sNarr: 'Trabalhando em equipe com técnica militar de montanha, todos cruzam o abismo sustentados pela corda esticada.',
          sNarr_by_ally: 'Trabalhando em equipe com técnica militar de montanha, todos cruzam o abismo sustentados pela corda esticada.',
          fNarr: 'A corda estica perigosamente contra a pedra afiada antes de todos passarem.', dmg: 1,
          fNarr_by_ally: 'A corda estica perigosamente contra a pedra afiada antes de todos passarem.' },
        { i: '⛏', t: 'Localizar ponte de pedra natural', stat: 'wis', dc: 10,
          requires_race: 'dwarf',
          desc: 'Olhos acostumados a desfiladeiros encontram uma viga de granito firme logo abaixo.',
          sNarr: 'Seus sentidos de anão revelam uma borda oculta de pedra maciça dois passos abaixo; você atravessa com firmeza inabalável.',
          fNarr: 'A descida até a viga oculta desgasta suas botas e canelas.', dmg: 1 }
      ] },

    { title: 'Vento Cortante',
      script: [
        { type: 'narration', text: 'Em altitude, o vento muda de natureza. Não é o vento das planícies. É <i>cortante</i> — cristais de gelo carregados.' },
        { type: 'narration', text: 'Sua roupa não é suficiente. O frio entra direto.' }
      ],
      choices: [
        { i: '🛡', t: 'Encolher e perseverar', stat: 'con', dc: 11,
          desc: 'Capa fechada, cabeça baixa, andar lento.',
          sNarr: 'Você se encolhe contra o vento. Cada passo dói mas você não para. O frio fica, mas o pior passa.',
          fNarr: 'Os dedos ficam dormentes. Você sente algo que pode ser perda permanente.', dmg: 3 },
        { i: '🔥', t: 'Tocha ou fagulha de reaquecimento', stat: 'wis', dc: 11,
          desc: 'Encontrar uma concavidade na pedra e abrigar uma chama breve para manter o calor.',
          sNarr: 'Você abriga a chama sob a pedra e reaquece mãos e solas das botas antes que o torpor se instale.',
          fNarr: 'O vento uivante sopra forte demais e apaga as fagulhas repetidas vezes.', dmg: 2 },
        { i: '🤝', t: 'Partilhar mantos e revezar vanguarda', stat: 'con', dc: 10,
          requires_ally: true,
          desc: 'Revezar quem vai à frente abrindo caminho no vento frio com os mantos do grupo.',
          sNarr: 'Revezando a vanguarda e agrupando os mantos pesados, vocês mantêm o calor vital e cruzam a crista com vigor renovado.',
          sNarr_by_ally: 'Revezando a vanguarda e agrupando os mantos pesados, vocês mantêm o calor vital e cruzam a crista com vigor renovado.',
          fNarr: 'O vento gélido castiga o rosto dos companheiros antes de alcançarem a descida.', dmg: 1,
          fNarr_by_ally: 'O vento gélido castiga o rosto dos companheiros antes de alcançarem a descida.' },
        { i: '🏔', t: 'Resistência nativa às alturas', stat: 'con', dc: 9,
          requires_subrace: ['mountain', 'goliath', 'wood'],
          desc: 'Sangue acostumado ao ar rarefeito e aos cumes nevados.',
          sNarr: 'Seu organismo conhece a fúria das altas encostas; seus pulmões adaptam-se ao ar frio e sua pele tolera o vento sem tremer.',
          fNarr: 'A ventania resseca suas narinas e lábios.', dmg: 1 }
      ] },

    { title: 'A Ponte de Cordas Pênsil',
      script: [
        { type: 'narration', text: 'Uma ponte suspensa de cordas e tábuas antigas balança sobre um abismo vertiginoso de névoa e pedras pontiagudas.' },
        { type: 'narration', text: 'O vento da ravina faz a estrutura gemer a cada rajada, e várias tábuas apodrecidas revelam o vazio abaixo.' }
      ],
      choices: [
        { i: '🚶', t: 'Passagem lenta e cuidadosa', stat: 'dex', dc: 12,
          desc: 'Testar cada tábua antes de apoiar o peso, segurando firme nos cabos laterais.',
          sNarr: 'Passo a passo disciplinado, você contorna duas ripas podres e chega à outra margem com o coração acelerado mas são e salvo.',
          fNarr: 'Uma tábua se quebra ao meio sob seu pé; você se segura no cabo lateral por puro reflexo enquanto lascas caem no abismo.', dmg: 2 },
        { i: '⚓', t: 'Reforço de nós e ancoragem firme', stat: 'str', dc: 11,
          requires_class: ['guerreiro', 'paladino', 'patrulheiro'],
          desc: 'Apertar as amarras principais nos troncos de suporte antes de cruzar.',
          sNarr: 'Com força e conhecimento de ancoragens, você tensiona os cabos frouxos; a ponte fica mais estável e o caminho torna-se seguro.',
          fNarr: 'Uma das cordas secundárias rompe com estalo alto e açoita seu braço.', dmg: 2 },
        { i: '🤝', t: 'Avanço coordenado em fila com aliados', stat: 'dex', dc: 10,
          requires_ally: true,
          desc: 'Avançar espaçados mantendo a corda de segurança entre os aventureiros.',
          sNarr: 'Com disciplina e equilíbrio mútuo, o grupo avança compassadamente, compensando o balanço do vento até o outro lado.',
          sNarr_by_ally: 'Com disciplina e equilíbrio mútuo, o grupo avança compassadamente, compensando o balanço do vento até o outro lado.',
          fNarr: 'O vento balança a ponte bruscamente e assusta a comitiva por instantes.', dmg: 1,
          fNarr_by_ally: 'O vento balança a ponte bruscamente e assusta a comitiva por instantes.' },
        { i: '🪨', t: 'Contorno pela garganta de pedras', stat: 'con', dc: 11,
          desc: 'Evitar a ponte suspensa e descer pela encosta íngreme de seixos.',
          sNarr: 'Você escolhe o chão sólido e contorna a ravina pelas pedras; demora mais tempo, mas poupa os nervos.',
          fNarr: 'Pedras soltas escorregam na descida e arranham suas botas.', dmg: 1 }
      ] }
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
          fNarr: 'A areia rasga sua pele através do tecido. Pequenos cortes em todo lugar.', dmg: 4 },
        { i: '🏜', t: 'Escavar trincheira na duna', stat: 'str', dc: 11,
          desc: 'Cavar depressão rápida na encosta protegida do vento para se abrigar.',
          sNarr: 'Em minutos de esforço vigoroso, você escava uma vala sob a lona de viagem; a areia passa rugindo por cima sem atingir você.',
          fNarr: 'A areia fofa desaba duas vezes sobre seus braços antes de conseguir firmar o abrigo.', dmg: 2 },
        { i: '🤝', t: 'Tenda de emergência com companheiro', stat: 'dex', dc: 10,
          requires_ally: true,
          desc: 'Armar uma cobertura dupla com estacas firmes ao lado de seu parceiro.',
          sNarr: 'Em perfeita sincronia de acampamento, vocês cravam as estacas e protegem as mochilas e os olhos sob a lona firme.',
          sNarr_by_ally: 'Em perfeita sincronia de acampamento, vocês cravam as estacas e protegem as mochilas e os olhos sob a lona firme.',
          fNarr: 'Uma das estacas solta no vento e o pólen de areia invade a tenda improvisada.', dmg: 1,
          fNarr_by_ally: 'Uma das estacas solta no vento e o pólen de areia invade a tenda improvisada.' },
        { i: '✨', t: 'Domo arcano de retenção', stat: 'int', dc: 11,
          requires_class: ['mago', 'druida', 'feiticeiro', 'clerigo'],
          desc: 'Modelar uma barreira esférica mágica que deflete os grãos incandescentes.',
          sNarr: 'Um arco tênue de energia translúcida desvia o vendaval de poeira para os lados, mantendo o ar respirável e fresco.',
          fNarr: 'A força da ventania quebra a barreira mágica antes do fim da tempestade.', dmg: 2 }
      ] },

    { title: 'Espelhismo Mortal',
      script: [
        { type: 'narration', text: 'Você vê um oásis a noventa metros — palmeiras, água azul. Bonito demais.' },
        { type: 'narration', text: 'Você sabe que pode ser miragem. Ou pode ser real e te salvar a vida.' }
      ],
      choices: [
        { i: '🧠', t: 'Verificar antes de seguir', stat: 'wis', dc: 12,
          desc: 'Observar os reflexos, o vento, sinais de que é miragem.',
          sNarr: 'A imagem treme demais nas bordas. Não há sinais reais — sem pegadas, sem aves. Miragem. Você guarda água e segue.',
          fNarr: 'Você corre pro oásis e descobre que era miragem só ao chegar. Hora de sol perdida, cantil quase vazio.', dmg: 3 },
        { i: '🧭', t: 'Navegação solar e bússola', stat: 'int', dc: 11,
          desc: 'Manter a linha de marcha pelas sombras projetadas no solo, ignorando o brilho ao longe.',
          sNarr: 'Conferindo as sombras do sol com precisão matemática, você confirma que o brilho fica fora da rota e mantém o passo firme.',
          fNarr: 'A reverberação do calor faz suas medições hesitarem por uma milha.', dmg: 1 },
        { i: '🤝', t: 'Conferência mútua com companheiros', stat: 'wis', dc: 10,
          requires_ally: true,
          desc: 'Pedir que o parceiro analise a visão do oásis por outro ângulo.',
          sNarr: 'Seu parceiro de viagem observa a ausência de qualquer ave no céu daquele ponto: "É ilusão de calor, amigo. Mantenha o rumo."',
          sNarr_by_ally: 'Seu parceiro de viagem observa a ausência de qualquer ave no céu daquele ponto: "É ilusão de calor, amigo. Mantenha o rumo."',
          fNarr: 'Vocês debatem debaixo do sol inclemente antes de concordarem com a rota original.', dmg: 1,
          fNarr_by_ally: 'Vocês debatem debaixo do sol inclemente antes de concordarem com a rota original.' },
        { i: '👁', t: 'Percepção mística aguçada', stat: 'wis', dc: 10,
          requires_class: ['mago', 'bruxo', 'clerigo', 'monge'],
          desc: 'Fechar os olhos físicos e sentir as correntes térmicas do solo desértico.',
          sNarr: 'Seus sentidos sobrenaturais dissipam a imagem enganosa; sob as palmeiras imaginárias não há nada além de areia escaldante.',
          fNarr: 'O calor causa uma leve pontada de enxaqueca ao tentar concentrar o olhar.', dmg: 1 }
      ] }
  ],

  snow: [
    { title: 'Lobo Solitário',
      npc: { name: 'Presa-Cinzenta, o Lobo Solitário', desc: 'Velho macho, sozinho é mais perigoso por isso', portrait: '../shared/img/npcs/presa-cinzenta-lobo.webp' },
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
          fNarr: 'Você escorrega no gelo. Ele avança no instante da queda — mordida superficial.', dmg: 3 },
        { i: '🤝', t: 'Guarda dupla com parceiro', stat: 'wis', dc: 10,
          requires_ally: true,
          desc: 'Você e seu companheiro assumem postura de combate cobrindo os flancos.',
          sNarr: 'Vendo dois combatentes sincronizados prontos para a retaliação, o lobo veterano calcula que o risco é alto demais e desaparece entre os pinheiros.',
          sNarr_by_ally: 'Vendo dois combatentes sincronizados prontos para a retaliação, o lobo veterano calcula que o risco é alto demais e desaparece entre os pinheiros.',
          fNarr: 'A fera rosna e ameaça o flanco antes de bater em retirada.', dmg: 1,
          fNarr_by_ally: 'A fera rosna e ameaça o flanco antes de bater em retirada.' }
      ] },

    { title: 'Tempestade Branca',
      script: [
        { type: 'narration', text: 'A neve dobra de intensidade em segundos. Você não vê a três passos.' },
        { type: 'narration', text: 'Aqui é fácil rodar em círculos e morrer congelado a vinte metros do destino.' }
      ],
      choices: [
        { i: '🗺', t: 'Buscar marcadores', stat: 'wis', dc: 12,
          desc: 'Pedras grandes, troncos, qualquer linha visual pra orientar-se.',
          sNarr: 'Você identifica uma linha de pedras à esquerda. Segue por elas, passo a passo. Quando a tempestade abre, está exatamente onde devia estar.',
          fNarr: 'Você roda em círculos por horas. Quando se orienta, está exausto e a uma quilômetro do caminho.', dmg: 4 },
        { i: '❄️', t: 'Passos firmes e resistência', stat: 'con', dc: 11,
          desc: 'Manter a cadência de marcha sem parar, aquecendo os pulmões pelo tecido da gola.',
          sNarr: 'Com disciplina e vigor físico, você corta a camada fofa sem hesitar até avistar a borda da depressão.',
          fNarr: 'O vento gelado entorpece as pontas dos dedos e desacelera seu avanço.', dmg: 3 },
        { i: '🤝', t: 'Corda guia entre companheiros', stat: 'dex', dc: 10,
          requires_ally: true,
          desc: 'Ligar os aventureiros com uma corda de escalada para impedir qualquer dispersão no nevoeiro branco.',
          sNarr: 'Atados com segurança, vocês marcham juntos em ritmo constante; ninguém se perde e o grupo supera a nevasca unido.',
          sNarr_by_ally: 'Atados com segurança, vocês marcham juntos em ritmo constante; ninguém se perde e o grupo supera a nevasca unido.',
          fNarr: 'A neve puxa a ponta da corda e vocês precisam parar para reatar as amarras no frio.', dmg: 1,
          fNarr_by_ally: 'A neve puxa a ponta da corda e vocês precisam parar para reatar as amarras no frio.' },
        { i: '🔥', t: 'Farol místico de calor', stat: 'int', dc: 10,
          requires_class: ['mago', 'feiticeiro', 'druida', 'clerigo'],
          desc: 'Manter uma pequena esfera mágica de fogo brando que derrete os flocos e ilumina a trilha.',
          sNarr: 'A centelha mágica irradia conforto térmico suficiente para guiar a respiração e manter a rota desimpedida.',
          fNarr: 'O turbilhão de vento apaga a chama mística com um assobio cortante.', dmg: 2 }
      ] }
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
          fNarr: 'A rocha trinca em ângulo irregular e lascas cortam seu braço.', dmg: 2 },
        { i: '🛡', t: 'Aparar estilhaços com escudo', stat: 'str', dc: 11,
          requires_class: ['guerreiro', 'paladino', 'barbaro'],
          desc: 'Fincar a postura marcial e desviar as pontas de pedra com a chapa de metal.',
          sNarr: 'Você ergue o escudo firme; o bloco principal espatifa-se ao lado enquanto os fragmentos afiados ricocheteiam no aço.',
          fNarr: 'O impacto de uma lasca pesada amassa a borda do escudo e choca seu pulso.', dmg: 2 },
        { i: '🤝', t: 'Puxão salvador de parceiro', stat: 'dex', dc: 10,
          requires_ally: true,
          desc: 'Seu parceiro de grupo puxa seu braço para trás no exato instante do desabamento.',
          sNarr: 'Com reflexos admiráveis, seu aliado arranca você da zona de impacto; a lança de pedra estilhaça onde seus pés estavam.',
          sNarr_by_ally: 'Com reflexos admiráveis, seu aliado arranca você da zona de impacto; a lança de pedra estilhaça onde seus pés estavam.',
          fNarr: 'O puxão rápido faz vocês dois caírem sobre o cascalho pontiagudo.', dmg: 1,
          fNarr_by_ally: 'O puxão rápido faz vocês dois caírem sobre o cascalho pontiagudo.' },
        { i: '👁', t: 'Visão no escuro apurada', stat: 'wis', dc: 10,
          requires_race: ['elf', 'dwarf', 'gnome', 'tiefling', 'halforc'],
          desc: 'Perceber a rachadura na abóbada escura antes mesmo da pedra se soltar.',
          sNarr: 'Sua visão aguçada nas trevas nota a queda da poeira segundos antes do estalo; você simplesmente dá dois passos calmos para o lado.',
          fNarr: 'A poeira caindo da fissura queima levemente os olhos.', dmg: 1 }
      ] },

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
          desc: 'Girar com a arma em punho e atacar a criatura das sombras.' },
        { i: '🤫', t: 'Silêncio absoluto e camuflagem', stat: 'dex', dc: 11,
          requires_class: ['ladino', 'monge', 'patrulheiro'],
          desc: 'Paralisar cada músculo e esperar a criatura entregar sua posição pelo ruído.',
          sNarr: 'Você some na penumbra sem emitir respiração; desorientado pela ausência de passos, o perseguidor rasteja para outra galeria.',
          fNarr: 'Uma gota pinga no seu elmo de aço e revela sua posição com um eco agudo.', dmg: 1 },
        { i: '🤝', t: 'Pinça de emboscada com aliado', stat: 'wis', dc: 10,
          requires_ally: true,
          desc: 'Sinalizar silenciosamente para seu parceiro cobrir a retaguarda.',
          sNarr: 'Vocês viram em guarda sincronizada cobrindo as duas bocas do túnel; percebendo a desvantagem, a besta recua e foge.',
          sNarr_by_ally: 'Vocês viram em guarda sincronizada cobrindo as duas bocas do túnel; percebendo a desvantagem, a besta recua e foge.',
          fNarr: 'O perseguidor quase contorna sua posição antes de se evadir pelas fendas.', dmg: 1,
          fNarr_by_ally: 'O perseguidor quase contorna sua posição antes de se evadir pelas fendas.' },
        { i: '✨', t: 'Clarão mágico de revelação', stat: 'int', dc: 10,
          requires_class: ['clerigo', 'mago', 'feiticeiro', 'bardo'],
          desc: 'Projetar um estalo luminoso que preenche toda a galeria subterrânea.',
          sNarr: 'Uma onda súbita de luz radiante ilumina cada recanto; a criatura das sombras guincha ofuscada e foge túnel adentro.',
          fNarr: 'A luz rebate nas estalactites brancas e ofusca sua visão por instantes.', dmg: 1 }
      ] }
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
          desc: 'Desembainhar sua arma e purificar as aparições em combate.' },
        { i: '🤝', t: 'Círculo de bravura com aliados', stat: 'cha', dc: 10,
          requires_ally: true,
          desc: 'Unir as costas e entoar palavras de lealdade e coragem compartilhada.',
          sNarr: 'O calor da bravura mútua do grupo repele as aparições gélidas; os espectros recuam respeitosos perante a vida inabalável de vocês.',
          sNarr_by_ally: 'O calor da bravura mútua do grupo repele as aparições gélidas; os espectros recuam respeitosos perante a vida inabalável de vocês.',
          fNarr: 'O arrepio espectral drena o calor dos companheiros antes de deixarem as lápides.', dmg: 2,
          fNarr_by_ally: 'O arrepio espectral drena o calor dos companheiros antes de deixarem as lápides.' }
      ] },

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
          fNarr: 'Sua oração é fraca ou errada. A trinca abre mais um centímetro. Você apressa o passo.', dmg: 2 },
        { i: '🔨', t: 'Conter a trinca com laje pesada', stat: 'str', dc: 11,
          desc: 'Apoiar um bloco de mármore caído sobre a fenda para sufocar o que quer que tente emergir.',
          sNarr: 'Com força concentrada, você posiciona a laje firme sobre a fissura; a vibração cessa e o túmulo volta ao repouso eterno.',
          fNarr: 'A pedra desliza e prende seus dedos antes de assentar no mármore.', dmg: 1 },
        { i: '🤝', t: 'Vigília atenta com aliados', stat: 'wis', dc: 10,
          requires_ally: true,
          desc: 'O grupo passa em formação de guarda com armas prontas sem quebrar o ritmo dos passos.',
          sNarr: 'Com disciplina e olhos atentos em cada nicho fúnebre, a comitiva contorna o mausoléu e segue viagem em segurança.',
          sNarr_by_ally: 'Com disciplina e olhos atentos em cada nicho fúnebre, a comitiva contorna o mausoléu e segue viagem em segurança.',
          fNarr: 'Um estalo seco atrás da lápide assusta a comitiva por um segundo.', dmg: 0,
          fNarr_by_ally: 'Um estalo seco atrás da lápide assusta a comitiva por um segundo.' },
        { i: '📜', t: 'Reforço de runas de confinamento', stat: 'int', dc: 11,
          requires_class: ['mago', 'bruxo', 'bardo'],
          desc: 'Traçar caracteres arcanos de aprisionamento para selar a fenda.',
          sNarr: 'As linhas de giz místico brilham em azul safira e fecham a energia espectral no interior da pedra.',
          fNarr: 'O encantamento absorve mais energia mágica do que o previsto, deixando você cansado.', dmg: 2 }
      ] }
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
          fNarr: 'O vapor superaquecido atinge seus olhos por um instante, forçando um desvio repentino.', dmg: 2 },
        { i: '🪨', t: 'Avanço pela crista de basalto fria', stat: 'wis', dc: 11,
          desc: 'Identificar as rochas mais escuras e antigas que suportam o peso sem fundir.',
          sNarr: 'Seus passos encontram a crista sólida de pedra antiga; você transpõe a brecha térmica sem pisar na crosta derretida.',
          fNarr: 'A sola da bota chia no calor intenso e fumaça sobe no ar.', dmg: 2 },
        { i: '🤝', t: 'Salto amparado por companheiro', stat: 'dex', dc: 10,
          requires_ally: true,
          desc: 'Seu parceiro estende a mão da outra borda firme para segurar seu impulso.',
          sNarr: 'Com sincronia perfeita, seu aliado segura seu braço no final do salto e firma você em solo seguro.',
          sNarr_by_ally: 'Com sincronia perfeita, seu aliado segura seu braço no final do salto e firma você em solo seguro.',
          fNarr: 'O calor ascendente faz a pegada escorregar e vocês caem juntos no cascalho quente.', dmg: 2,
          fNarr_by_ally: 'O calor ascendente faz a pegada escorregar e vocês caem juntos no cascalho quente.' },
        { i: '💪', t: 'Potência muscular atlética', stat: 'str', dc: 11,
          requires_class: ['guerreiro', 'barbaro', 'monge'],
          desc: 'Impulso vigoroso e arranque formidável sobre o fluxo de magma.',
          sNarr: 'Com força física superior, você transpõe o vão de fogo como uma flecha humana e aterrissa com solidez inabalável.',
          fNarr: 'A aterrissagem sobre pedra quente queima a barra de suas perneiras.', dmg: 2 }
      ] },

    { title: 'Cinzas Quentes',
      script: [
        { type: 'narration', text: 'Cinzas caem como neve preta sobre você. Algumas ainda estão quentes — pequenas brasas voando.' },
        { type: 'narration', text: 'Sua roupa começa a chiar. Você precisa de cobertura.' }
      ],
      choices: [
        { i: '🛡', t: 'Cobertura completa', stat: 'con', dc: 12,
          desc: 'Manto encharcado de cantil, cabeça encolhida.',
          sNarr: 'Você molha o manto e se cobre. Cinzas queimam o tecido externo, mas você passa sem queimar pele.',
          fNarr: 'Algumas brasas pegam no cabelo. Você apaga rapidamente, mas o susto fica.', dmg: 3 },
        { i: '🏃', t: 'Corrida entre marquises de pedra', stat: 'dex', dc: 11,
          desc: 'Disparar velozmente abrigando-se de saliência em saliência.',
          sNarr: 'Em saltos velozes, você cruza a chuva de detritos pulando de teto em teto de rocha basáltica.',
          fNarr: 'Cinzas abrasivas atingem sua nuca antes do próximo abrigo.', dmg: 2 },
        { i: '🤝', t: 'Toldo blindado com o grupo', stat: 'con', dc: 10,
          requires_ally: true,
          desc: 'Erguer mantos de couro reforçados em conjunto para proteger a comitiva.',
          sNarr: 'Avançando em marcha compacta protegidos pelo couro esticado, o grupo supera a tempestade de cinzas sem uma única queimadura.',
          sNarr_by_ally: 'Avançando em marcha compacta protegidos pelo couro esticado, o grupo supera a tempestade de cinzas sem uma única queimadura.',
          fNarr: 'O couro fumaça e o cheiro acre de queimado invade a respiração.', dmg: 1,
          fNarr_by_ally: 'O couro fumaça e o cheiro acre de queimado invade a respiração.' },
        { i: '🔥', t: 'Imunidade inata a brasas', stat: 'con', dc: 9,
          requires_race: ['tiefling', 'dragonborn'],
          desc: 'Fisiologia resistente ao fogo que suporta fagulhas incandescentes.',
          sNarr: 'Sua compleição ancestral ignora as fagulhas quentes; você marcha pela chuva negra com serenidade régia.',
          fNarr: 'A fuligem irrita seus olhos por alguns passos.', dmg: 1 }
      ] }
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
          desc: 'Desembainhar sua arma e interceptar os lobos em combate aberto.' },
        { i: '🤝', t: 'Emboscada coordenada com aliados', stat: 'wis', dc: 10,
          requires_ally: true,
          desc: 'Posicionar seu companheiro na cobertura alta e cruzar as flechas caso a matilha desvie.',
          sNarr: 'Com cobertura mútua perfeita, vocês permanecem imóveis até a matilha passar concentrada no rastro; nenhum lobo nota a comitiva.',
          sNarr_by_ally: 'Com cobertura mútua perfeita, vocês permanecem imóveis até a matilha passar concentrada no rastro; nenhum lobo nota a comitiva.',
          fNarr: 'Um galho quebra sob a bota de seu parceiro e um dos lobos rosna desconfiado antes de seguir a caça.', dmg: 1,
          fNarr_by_ally: 'Um galho quebra sob a bota de seu parceiro e um dos lobos rosna desconfiado antes de seguir a caça.' },
        { i: '🍃', t: 'Desviar o rastro com ervas aromáticas', stat: 'wis', dc: 11,
          requires_class: ['druida', 'patrulheiro'],
          desc: 'Esmagar folhas de menta silvestre para mascarar seu odor corporal.',
          sNarr: 'O aroma penetrante das ervas apaga seu rastro no ar úmido; a matilha passa rente aos arbustos sem notar a presença de mortais.',
          fNarr: 'O vento sopra as folhas secas e o aroma não se espalha a tempo.', dmg: 2 }
      ] },

    { title: 'O Andarilho Cego',
      npc: { name: 'Velho Andarilho', desc: 'Eremita cego que conhece a floresta de cor', portrait: '../shared/img/npcs/velho-andarilho.webp' },
      script: [
        { type: 'narration', text: 'Um velho de barba branca caminha sozinho na trilha, bastão de madeira tateando o chão. Os olhos são leitosos — cego.' },
        { type: 'speech', speaker: 'Velho Andarilho', text: '— Pare, viajante. <i>(a voz é serena)</i> Sinto seus passos há quinze minutos. Você anda com pressa, mas sem rumo claro.' },
        { type: 'speech', speaker: 'Velho Andarilho', text: '— A floresta me conta coisas. <b>Adiante há perigo</b> — não preciso vê-lo pra saber. Posso te indicar atalho seguro, em troca de uma palavra de gentileza ou uma moeda. Você decide.' }
      ],
      choices: [
        { i: '🤝', t: 'Aceitar gentileza', stat: 'cha', dc: 11,
          desc: 'Conversar honestamente, ouvir as histórias dele em troca da rota segura.',
          sNarr: 'Você senta com ele dez minutos. Ele conta como ficou cego — uma rixa antiga com uma bruxa local. No fim, descreve um atalho que economiza quase um marco e evita um ninho de aranhas.',
          sNarr_by_alignment: {
            good: 'Você se conecta genuinamente. O velho sorri pela primeira vez em meses. "Tu tens coração limpo. Que a floresta te abrace."'
          },
          fNarr: 'Você é educado mas distante. Ele te indica o atalho mas avisa: "O caminho é teu, mas a floresta sente quem vem com pressa demais."', dmg: 0 },
        { i: '🪙', t: 'Pagar uma moeda', stat: null,
          desc: 'Transação direta, sem meias palavras.',
          sNarr: 'Ele aceita a moeda com leve aceno. "Direita na primeira bifurcação após o carvalho rachado. Boa jornada." A trilha indicada corta quase um marco de mata fechada.',
          fNarr: '' },
        { i: '➡️', t: 'Ignorar e seguir', stat: 'wis', dc: 12,
          desc: 'Confiar na sua própria orientação, deixar o velho.',
          sNarr: 'Você sente que está no rumo certo. Cumprimenta o velho e segue. Sua intuição estava certa — chega bem.',
          fNarr: 'A trilha que você escolhe leva ao ninho de aranhas que ele teria avisado. Picadas múltiplas.', dmg: 4 },
        { i: '📜', t: 'Trocar bênção de eremita ou peregrino', stat: 'wis', dc: 10,
          requires_background: ['acolyte', 'hermit', 'sage'],
          desc: 'Compartilhar uma prece ou ditado antigo de peregrinação.',
          sNarr: 'Ao ouvir seu provérbio de estrada, o ancião abre um sorriso iluminado: "Bendito seja o andarilho que honra as velhas palavras." Ele indica a vereda secreta das faias douradas.',
          fNarr: 'O ancião ouve em silêncio e apenas balança o bastão de madeira.', dmg: 0 },
        { i: '👥', t: 'Apresentar a comitiva com cordialidade', stat: 'cha', dc: 10,
          requires_ally: true,
          desc: 'Apresentar seus companheiros e oferecer um gole de água do cantil.',
          sNarr: 'A cortesia do grupo alegra o coração solitário do andarilho: "Raras vezes vejo um bando viajar com tanta harmonia. Vão pela margem do córrego raso."',
          sNarr_by_ally: 'A cortesia do grupo alegra o coração solitário do andarilho: "Raras vezes vejo um bando viajar com tanta harmonia. Vão pela margem do córrego raso."',
          fNarr: 'O velho agradece a água mas retira-se apressado pelas sombras.', dmg: 0,
          fNarr_by_ally: 'O velho agradece a água mas retira-se apressado pelas sombras.' }
      ] },

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
          fNarr: '' },
        { i: '🌿', t: 'Coletar amostra para unguento', stat: 'int', dc: 11,
          requires_class: ['druida', 'clerigo', 'patrulheiro'],
          desc: 'Usar luvas para colher a toxina com segurança para estudo ou preparo de antídotos.',
          sNarr: 'Com técnica impecável de boticário, você extrai o veneno vegetal sem encostar na pele; seu conhecimento botânico se aprofunda.',
          fNarr: 'Um pólen volátil escapa da haste e irrita suas narinas por alguns minutos.', dmg: 1 },
        { i: '🤝', t: 'Consultar experiência do parceiro', stat: 'wis', dc: 10,
          requires_ally: true,
          desc: 'Pedir que seu aliado confirme as características da espécie antes de qualquer decisão.',
          sNarr: 'Seu companheiro analisa o talo com olhar atento e avisa na hora: "É o chapéu-da-morte, amigo. Jogue fora!" Vocês descartam o perigo a tempo.',
          sNarr_by_ally: 'Seu companheiro analisa o talo com olhar atento e avisa na hora: "É o chapéu-da-morte, amigo. Jogue fora!" Vocês descartam o perigo a tempo.',
          fNarr: 'Seu parceiro fica na dúvida e vocês decidem não arriscar a ingestão.', dmg: 0,
          fNarr_by_ally: 'Seu parceiro fica na dúvida e vocês decidem não arriscar a ingestão.' },
        { i: '🍄', t: 'Olfato apurado para toxinas', stat: 'wis', dc: 10,
          requires_race: ['dwarf', 'halfling'],
          desc: 'Sentidos aguçados reconhecem o cheiro doce e amargo característico do veneno.',
          sNarr: 'Seu paladar e olfato treinados detectam o rastro amargo característico das espécies mortais; você descarta o fungo sem hesitar.',
          fNarr: 'O cheiro amargo enjoa seu estômago temporariamente.', dmg: 1 }
      ] },

    { title: 'Encontro com Fada',
      npc: { name: 'Aurélia, a Fada da Trilha', desc: 'Pequena criatura mágica de luz dourada', portrait: '../shared/img/npcs/aurelia-fada.webp' },
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
          fNarr: '' },
        { i: '🧝', t: 'Saudação férica em dialeto silvestre', stat: 'cha', dc: 10,
          requires_race: ['elf', 'gnome'],
          desc: 'Responder no tom melódico das criaturas da corte das fadas.',
          sNarr: 'Ao ouvir seu dialeto férico fluente, os olhos da fada brilham de encanto. Ela assobia alegre e sopra pó de estrelas que renova o fôlego da comitiva.',
          fNarr: 'A fada ri de sua pronúncia travessa e bate asas para o alto.', dmg: 0 },
        { i: '🎶', t: 'Verso poético de encantamento', stat: 'cha', dc: 11,
          requires_class: ['bardo', 'bruxo'],
          desc: 'Propor uma rima engenhosa em troca do segredo do atalho.',
          sNarr: 'Sua estrofe encanta a criaturinha, que gira no ar rindo: "Que viajante espirituoso!" O atalho mágico se abre reluzente diante de vocês.',
          fNarr: 'A fada acha a rima previsível demais e voa embora zombando baixinho.', dmg: 0 },
        { i: '🤝', t: 'Resgate cuidadoso em dupla', stat: 'dex', dc: 10,
          requires_ally: true,
          desc: 'Seu parceiro afasta a raiz curvada enquanto você retira a criatura ilesa.',
          sNarr: 'Com o companheiro erguendo a casca com cuidado, o sapo salta livre e feliz; a fada aplaude e guia o grupo pela senda dourada.',
          sNarr_by_ally: 'Com o companheiro erguendo a casca com cuidado, o sapo salta livre e feliz; a fada aplaude e guia o grupo pela senda dourada.',
          fNarr: 'A raiz range e fecha a abertura antes de você tirar as mãos.', dmg: 0,
          fNarr_by_ally: 'A raiz range e fecha a abertura antes de você tirar as mãos.' }
      ] },

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
          fNarr: 'Você não consegue tirar conclusão clara. Decide na intuição — e erra. A trilha escolhida demora muito mais.', dmg: 0 },
        { i: '🧭', t: 'Consultar carta topográfica e relevo', stat: 'int', dc: 11,
          desc: 'Analisar a drenagem de água e as curvas de nível do mapa da região.',
          sNarr: 'Você identifica a inclinação natural do vale e percebe que a trilha da esquerda corta uma curva inteira de colina; a rota é rápida e perfeita.',
          fNarr: 'A vegetação nova alterou os marcos antigos do mapa, custando tempo de conferência.', dmg: 0 },
        { i: '🤝', t: 'Batedor aliado faz reconhecimento', stat: 'dex', dc: 10,
          requires_ally: true,
          desc: 'Seu companheiro corre cem metros à frente pela curva para conferir a passagem.',
          sNarr: 'Seu aliado retorna com sinal de polegar erguido: "A passagem da esquerda está limpa e seca!" Vocês avançam sem dúvidas.',
          sNarr_by_ally: 'Seu aliado retorna com sinal de polegar erguido: "A passagem da esquerda está limpa e seca!" Vocês avançam sem dúvidas.',
          fNarr: 'Seu parceiro volta sem certezas após encontrar uma bifurcação secundária.', dmg: 0,
          fNarr_by_ally: 'Seu parceiro volta sem certezas após encontrar uma bifurcação secundária.' },
        { i: '👁', t: 'Instinto de ladino para armadilhas', stat: 'wis', dc: 10,
          requires_class: ['ladino', 'ladrao', 'patrulheiro'],
          desc: 'Varredura rápida por fios de tropeço, folhagens falsas ou gatilhos na trilha curta.',
          sNarr: 'Você nota um galho quebrado artificialmente e desvia de uma vala rasa oculta, seguindo pela rota mais rápida com segurança.',
          fNarr: 'O excesso de cautela retarda a marcha por quase uma hora.', dmg: 0 },
        { i: '⛏', t: 'Instinto telúrico da pedra', stat: 'wis', dc: 10,
          requires_race: 'dwarf',
          desc: 'Sentir a firmeza do substrato rochoso sob as camadas de terra.',
          sNarr: 'Seus pés sentem a laje de granito que sustenta o caminho da esquerda; o chão é firme como o pátio de uma cidadela anã.',
          fNarr: 'A terra fofa esconde raízes soltas sob a bota.', dmg: 0 }
      ] },

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
          fNarr: 'Várias mordidas em sequência. Inchaço, ardor, mas você passa. Vai descansar mal hoje.', dmg: 3 },
        { i: '🤸', t: 'Rastejo acrobático por baixo das teias', stat: 'dex', dc: 11,
          requires_class: ['ladino', 'monge', 'bardo'],
          desc: 'Deslizar rente ao solo sob as linhas de teia sem tocar nos filamentos.',
          sNarr: 'Com flexibilidade impecável, você rasteja sob a teia principal sem romper um único fio e emerge do outro lado ileso.',
          fNarr: 'Sua mochila esbarra em um galho e teias caem em seus ombros.', dmg: 1 },
        { i: '🤝', t: 'Desobstrução coordenada com varas longas', stat: 'dex', dc: 10,
          requires_ally: true,
          desc: 'Você e seu companheiro usam varas de carvalho para enrolar os fios antes da passagem.',
          sNarr: 'Trabalhando em equipe, vocês enrolam as teias nas hastes de madeira como meadas de lã e abrem um corredor amplo e limpo.',
          sNarr_by_ally: 'Trabalhando em equipe, vocês enrolam as teias nas hastes de madeira como meadas de lã e abrem um corredor amplo e limpo.',
          fNarr: 'Uma das varas parte e aranhas caem nas mangas de seu companheiro.', dmg: 2,
          fNarr_by_ally: 'Uma das varas parte e aranhas caem nas mangas de seu companheiro.' },
        { i: '🌿', t: 'Repelente natural de menta silvestre', stat: 'wis', dc: 10,
          requires_class: ['druida', 'patrulheiro'],
          desc: 'Esmagar folhas de menta e cânfora cujo óleo repele aracnídeos.',
          sNarr: 'O vapor herbal faz os aracnídeos recuarem apressados para o topo dos galhos; vocês cruzam sem levar uma picada.',
          fNarr: 'As folhas secas soltam pouco óleo e algumas aranhas insistem em se aproximar.', dmg: 1 }
      ] },

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
          fNarr: 'Você arranha demais e quebra um pedaço da pedra. Constrangido, deixa-a quebrada e segue.', dmg: 1 },
        { i: '🕯', t: 'Bênção e consagração do repouso', stat: 'wis', dc: 10,
          requires_class: ['paladino', 'clerigo'],
          desc: 'Canalizar uma prece formal de descanso eterno sobre o túmulo esquecido.',
          sNarr: 'Um calor suave irradia do mármore; uma sensação de conforto e proteção acompanha a comitiva pelo resto da tarde.',
          fNarr: 'A pedra continua fria e úmida sob o musgo.', dmg: 0 },
        { i: '🤝', t: 'Flores silvestres e tributo do grupo', stat: null,
          requires_ally: true,
          desc: 'Colher pequenas flores da margem e depositar com seus aliados em silêncio respeitoso.',
          sNarr: 'O tributo conjunto traz paz e solenidade ao coração de todos os viajantes; a mata parece abrir passagem calma adiante.',
          sNarr_by_ally: 'O tributo conjunto traz paz e solenidade ao coração de todos os viajantes; a mata parece abrir passagem calma adiante.',
          fNarr: '' },
        { i: '🎖', t: 'Reconhecer heráldica antiga', stat: 'int', dc: 11,
          requires_background: ['noble', 'sage', 'soldier'],
          desc: 'Identificar o brasão de armas da família fundadora esculpido na base.',
          sNarr: 'Você reconhece a flor-de-lis dos primeiros pioneiros de Valdoria; a memória dos feitos dos mortais do passado revigora seu espírito.',
          fNarr: 'A heráldica foi corrompida pelas raízes invasoras.', dmg: 0 }
      ] }
  ],

  plains: [
    { title: 'Mendigo de Estrada',
      npc: { name: 'Gildas, o Mendigo da Estrada', desc: 'Velho com olhos vivos demais pra ser apenas mendigo', portrait: '../shared/img/npcs/gildas-mendigo.webp' },
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
          fNarr: 'Ele cala-se assim que percebe sua intenção. Você sai sem nada além de constrangimento.', dmg: 0 },
        { i: '🍞', t: 'Partilhar provisões com aliados', stat: null,
          requires_ally: true,
          desc: 'Oferecer pão e queijo da ração compartilhada do grupo.',
          sNarr: 'Comovido com a generosidade da comitiva, o velho divide seu mapa rústico desenhado em couro: "Tomem a trilha das oliveiras, amigos. Evita o atoleiro do rio."',
          sNarr_by_ally: 'Comovido com a generosidade da comitiva, o velho divide seu mapa rústico desenhado em couro: "Tomem a trilha das oliveiras, amigos. Evita o atoleiro do rio."',
          fNarr: '' },
        { i: '🙏', t: 'Cura e alívio das feridas', stat: 'wis', dc: 10,
          requires_class: ['clerigo', 'paladino', 'druida'],
          desc: 'Impor as mãos sobre os tornozelos inchados do mendigo com magia de alívio.',
          sNarr: 'A dor nas pernas do velho arrefece; em lágrimas de gratidão, ele avisa sobre bandidos entocados na próxima colina antes de abençoar sua marcha.',
          fNarr: 'A bênção acalma o ancião, embora ele mal consiga articular palavras de volta.', dmg: 0 },
        { i: '🌾', t: 'Solidariedade de protetor do povo', stat: 'cha', dc: 10,
          requires_background: ['folk_hero', 'acolyte'],
          desc: 'Tratar o homem com a dignidade devida aos cidadãos de Valdoria.',
          sNarr: 'O ancião reconhece em você a alma de um defensor legítimo do povo simples: "O vale precisa de almas como a tua. Vá sob os bons ventos."',
          fNarr: 'O velho aceita o cumprimento em silêncio melancólico.', dmg: 0 }
      ] },

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
          fNarr: '' },
        { i: '🤝', t: 'Companheiro faz base para escalada', stat: 'str', dc: 10,
          requires_ally: true,
          desc: 'Subir nos ombros de seu aliado para alcançar os galhos baixos com segurança.',
          sNarr: 'Com o apoio sólido de seu companheiro, você deposita o ovo no ninho sem esforço perigoso; ambos descem ilesos sob o olhar das aves.',
          sNarr_by_ally: 'Com o apoio sólido de seu companheiro, você deposita o ovo no ninho sem esforço perigoso; ambos descem ilesos sob o olhar das aves.',
          fNarr: 'A base oscila na descida e vocês caem juntos no capim alto.', dmg: 1,
          fNarr_by_ally: 'A base oscila na descida e vocês caem juntos no capim alto.' },
        { i: '🪶', t: 'Escalada leve de elfo silvestre', stat: 'dex', dc: 10,
          requires_subrace: 'wood',
          desc: 'Subir pelos nós do tronco com a agilidade natural dos elfos da floresta.',
          sNarr: 'Seus pés leves mal tocam a casca; você devolve o ovo ao ninho com a suavidade de uma brisa e desce com um salto perfeito.',
          fNarr: 'Um ramo estala sob a bota e você arranha o pulso.', dmg: 1 },
        { i: '✨', t: 'Mão mágica ou levitação suave', stat: 'int', dc: 10,
          requires_class: ['mago', 'feiticeiro', 'bardo'],
          desc: 'Guiar o ovo pelo ar envolvido em uma película mística de força.',
          sNarr: 'Uma mão translúcida de energia ergue o ovo suavemente e o acomoda de volta no centro das palhas aquecidas.',
          fNarr: 'A magia vacila com o vento da estepe e o ovo quase escorrega antes de assentar.', dmg: 0 }
      ] },

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
          fNarr: 'Você não consegue ler direito as marcas. Segue cauteloso e perde tempo olhando pra trás.', dmg: 1 },
        { i: '🏹', t: 'Leitura de rastro de caçador', stat: 'wis', dc: 10,
          requires_class: ['patrulheiro', 'barbaro', 'druida'],
          desc: 'Examinar o padrão de sangue e a direção do vento para deduzir a posição da fera.',
          sNarr: 'Você percebe que a presa foi abatida por predador solitário já saciado; orienta o grupo pela rota oposta sem risco.',
          fNarr: 'O vento espalha o odor da carcaça e confunde as pegadas.', dmg: 1 },
        { i: '🤝', t: 'Vigília com flechas armadas do grupo', stat: 'wis', dc: 10,
          requires_ally: true,
          desc: 'Companheiro cobre o trigal com arco armado enquanto você inspeciona o caminho.',
          sNarr: 'Com armas apontadas e passos cautelosos, vocês contornam a clareira ensanguentada com guarda impecável.',
          sNarr_by_ally: 'Com armas apontadas e passos cautelosos, vocês contornam a clareira ensanguentada com guarda impecável.',
          fNarr: 'Um corvo grasna alto no capim e sobressalta os companheiros por instantes.', dmg: 0,
          fNarr_by_ally: 'Um corvo grasna alto no capim e sobressalta os companheiros por instantes.' },
        { i: '🏃', t: 'Desvio rápido contra o vento', stat: 'dex', dc: 11,
          desc: 'Ganhar distância imediatamente sem tocar na cena.',
          sNarr: 'Você acelera o passo contornando o trigal; em minutos o cheiro de sangue fica para trás no horizonte.',
          fNarr: 'A corrida no terreno acidentado quase provoca uma torção no tornozelo.', dmg: 1 }
      ] },

    { title: 'Mulher do Poço',
      npc: { name: 'Maren, a Camponesa do Poço', desc: 'Camponesa carregando dois baldes pesados', portrait: '../shared/img/npcs/maren-camponesa.webp' },
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
          fNarr: 'Você quase derruba um balde. Ela ri — "deixa pra eu mesma, viajante. Boa intenção contou." Você segue.', dmg: 0 },
        { i: '🤝', t: 'Grupo ajuda no transporte da água', stat: null,
          requires_ally: true,
          desc: 'Você e seus companheiros dividem os baldes e escoltam a mulher até a chácara.',
          sNarr: 'Impressionada com a gentileza de toda a comitiva, a camponesa oferece água limpa aromatizada com hortelã e queijo fresco para a jornada.',
          sNarr_by_ally: 'Impressionada com a gentileza de toda a comitiva, a camponesa oferece água limpa aromatizada com hortelã e queijo fresco para a jornada.',
          fNarr: '' },
        { i: '🎶', t: 'Cantar balada alegre de estrada', stat: 'cha', dc: 10,
          requires_class: 'bardo',
          desc: 'Animar a caminhada da trabalhadora com versos ritmados sobre Valdoria.',
          sNarr: 'Seu canto ilumina o rosto cansado da mulher, que ri e canta junto; a alegria partilhada deixa seus passos leves pelo resto da tarde.',
          fNarr: 'O ritmo quebra no meio da canção, mas ela agradece a intenção com um sorriso.', dmg: 0 },
        { i: '✨', t: 'Purificação e bênção da fonte', stat: 'wis', dc: 10,
          requires_class: ['clerigo', 'paladino', 'druida'],
          desc: 'Traçar uma bênção de pureza sobre a água dos baldes.',
          sNarr: 'A água adquire um brilho cristalino e doce; a mulher agradece a graça divina com uma reverência humilde.',
          fNarr: 'A bênção é sussurrada e a camponesa segue seu caminho satisfeita.', dmg: 0 }
      ] },

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
          fNarr: 'O abrigo escolhido é insuficiente. Chove forte sobre você. Você fica calado mas continua.', dmg: 1 },
        { i: '🤝', t: 'Montar toldo de marcha com aliados', stat: 'dex', dc: 10,
          requires_ally: true,
          desc: 'Unir as capas impermeáveis e armar um abrigo rápido estaiado no capim.',
          sNarr: 'Trabalhando em equipe antes do primeiro raio, o grupo ergue uma tenda resistente onde todos aguardam a chuvarada protegidos e secos.',
          sNarr_by_ally: 'Trabalhando em equipe antes do primeiro raio, o grupo ergue uma tenda resistente onde todos aguardam a chuvarada protegidos e secos.',
          fNarr: 'Uma rajada de vento arranca a estaca e a chuva molha as mochilas dos companheiros.', dmg: 1,
          fNarr_by_ally: 'Uma rajada de vento arranca a estaca e a chuva molha as mochilas dos companheiros.' },
        { i: '🌦', t: 'Previsão do curso das nuvens', stat: 'wis', dc: 10,
          requires_class: ['druida', 'patrulheiro'],
          desc: 'Ler a trajetória do vento e ajustar a rota para a borda seca da tempestade.',
          sNarr: 'Você reconhece que a massa de nuvens segue para o sul; uma leve correção de azimute mantém o grupo sob garoa branda e inofensiva.',
          fNarr: 'A frente fria muda de repente e despeja água sobre sua capa.', dmg: 1 },
        { i: '💪', t: 'Marcha forçada atlética', stat: 'con', dc: 11,
          requires_class: ['barbaro', 'guerreiro'],
          desc: 'Manter passo acelerado sustentado por vigor físico superior.',
          sNarr: 'Com ritmo de marcha inabalável, você cobre o terreno em tempo recorde antes que o céu desabe.',
          fNarr: 'O esforço acelerado drena suas energias e cansa as pernas.', dmg: 2 }
      ] },

    { title: 'Bivaque dos Guardas da Fronteira',
      npc: { name: 'Bravok, o Sargento da Fronteira', desc: 'Veterano em vigília nas terras abertas', portrait: '../shared/img/npcs/bravok-sargento.webp' },
      script: [
        { type: 'narration', text: 'Uma paliçada de estacas e uma tenda com as cores de Valdoria marcam o posto avançado da patrulha real.' },
        { type: 'speech', speaker: 'Sargento da Fronteira', text: '— Alto lá! <i>(o sentinela bate o cabo da alabarda no chão)</i> Identifiquem-se, viajantes. A fronteira leste está em estado de alerta.' }
      ],
      choices: [
        { i: '🎖', t: 'Apresentar credenciais militares ou nobres', stat: 'cha', dc: 10,
          requires_background: ['soldier', 'noble', 'folk_hero'],
          desc: 'Declarar seu serviço militar, brasão de linhagem ou reputação entre os defensores.',
          tag_by_background: {
            soldier: 'SOLDADO',
            noble: 'NOBRE',
            folk_hero: 'DEFENSOR DO POVO'
          },
          speech_by_background: {
            soldier: '"Descanse, sargento. Já servi sob as cores do reino na fronteira e conheço o peso desta vigília. Olhe minhas credenciais de serviço."',
            noble: '"Mantenha a guarda baixa, sargento. Trago as insígnias da minha Casa e salvo-conduto emitido pelas cortes de Valdoria."',
            folk_hero: '"Guarde a alabarda, sargento. Venho em socorro das vilas da fronteira e minha reputação precede meus passos."'
          },
          tag: 'CREDENCIAL',
          speech: '"Trago credenciais oficiais de Valdoria. Estamos em missão legítima e pedimos passagem regulamentar."',
          sNarr: 'O sargento perfila em continência: "Honra a quem serve o reino. Passem com a bênção dos postos de guarda."',
          fNarr: 'O sentinela confere seus pertences com desconfiança burocrática antes de liberar a passagem.', dmg: 0 },
        { i: '👥', t: 'Apresentar comitiva de aventureiros em ordem', stat: 'cha', dc: 11,
          requires_ally: true,
          tag: 'LÍDER DO GRUPO',
          speech: '"Tranquilize seus homens, sargento. Esta comitiva responde ao meu comando. Viemos em missão pacífica e cooperamos com a inspeção."',
          desc: 'Explicar a missão pacífica do grupo e cooperar com a inspeção da patrulha.',
          sNarr: 'A disciplina e cordialidade de seus companheiros tranquilizam os soldados, que oferecem água fresca de cantil e indicam a rota patrulhada.',
          sNarr_by_ally: 'A disciplina e cordialidade de seus companheiros tranquilizam os soldados, que oferecem água fresca de cantil e indicam a rota patrulhada.',
          fNarr: 'A inspeção da bagagem do grupo demora meia hora antes da liberação.', dmg: 0,
          fNarr_by_ally: 'A inspeção da bagagem do grupo demora meia hora antes da liberação.' },
        { i: '🗣', t: 'Diplomacia cortês e relato de estrada', stat: 'cha', dc: 12,
          tag: 'PERSUASÃO',
          speech: '"Trago notícias e rumores das trilhas do oeste, sargento. Bandos armados e movimentações suspeitas. Podemos trocar relatos por livre passagem."',
          desc: 'Compartilhar notícias e rumores das trilhas em troca de salvo-conduto.',
          sNarr: 'Os guardas apreciam as informações sobre o tráfego recente e carimbam sua passagem sem embaraços.',
          fNarr: 'O sargento resmunga mas dá passagem após advertir sobre bandos armados adiante.', dmg: 0 },
        { i: '🚶', t: 'Contornar o posto pela estepe aberta', stat: 'dex', dc: 11,
          tag: 'FURTIVIDADE',
          speech: '*Sinalizar para recuar devagar pela estepe, contornando a paliçada fora da linha de visão das sentinelas.*',
          desc: 'Evitar o entrevero militar e seguir pela orla dos trigais.',
          sNarr: 'Você contorna a paliçada fora da linha de visão das sentinelas e segue a jornada sem interrupções.',
          fNarr: 'Um guarda grita aviso da torre, forçando você a apressar o passo na terra batida.', dmg: 0 },
        { i: '⚔️', t: 'Intimidação marcial resoluta', stat: 'cha', dc: 12,
          requires_class: ['barbaro', 'guerreiro', 'paladino'],
          tag: 'INTIMIDAÇÃO',
          speech: '"Abaixe essa alabarda antes que eu a tome de você, sargento. Não temos tempo para atrasos e você não vai querer testar meu aço."',
          desc: 'Impor respeito militar com firmeza de quem não aceita ser atrasado.',
          sNarr: 'O sargento engole em seco perante sua imponência marcial: "Muito bem... abram a cancela! Passem sem criar tumulto."',
          fNarr: 'Os sentinelas cerram fileiras e apontam lanças com cautela, forçando você a moderar o tom antes de liberarem a passagem.', dmg: 0 }
      ] }
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
          fNarr: 'Sua hesitação fala mais alto que o respeito. Luz se distancia — neutra. Você passa sem ajuda nem ameaça.', dmg: 0 },
        { i: '✨', t: 'Comunhão mística ancestral', stat: 'wis', dc: 10,
          requires_class: ['clerigo', 'mago', 'bruxo'],
          desc: 'Canalizar energia arcana ou sagrada em harmonia com o espírito guardião.',
          sNarr: 'O lampião flutua suavemente à frente de seus passos, iluminando pedras firmes sobre o lodo traiçoeiro.',
          fNarr: 'O espírito pisca de forma intermitente e sobe para o dossel enevoado.', dmg: 0 },
        { i: '🤝', t: 'Vigília com companheiros unidos', stat: 'wis', dc: 10,
          requires_ally: true,
          desc: 'O grupo mantém contato visual e marcha firme sem se desviar para a luz.',
          sNarr: 'Unidos em formação calma, a comitiva cruza a clareira enevoada; a luz parece zelar pelos viajantes antes de sumir.',
          sNarr_by_ally: 'Unidos em formação calma, a comitiva cruza a clareira enevoada; a luz parece zelar pelos viajantes antes de sumir.',
          fNarr: 'A bruma se adensa por instantes antes de dispersar.', dmg: 0,
          fNarr_by_ally: 'A bruma se adensa por instantes antes de dispersar.' },
        { i: '🧝', t: 'Reconhecimento de elfo das matas', stat: 'wis', dc: 9,
          requires_race: 'elf',
          desc: 'Sensibilidade élfica para entidades pacíficas da natureza.',
          sNarr: 'Seus olhos compreendem a natureza inofensiva do espírito; você passa com um aceno familiar e segue em paz.',
          fNarr: 'A luz pulsa e segue seu rumo pelas copas.', dmg: 0 }
      ] },

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
          fNarr: 'A adaga desvia. A cobra ataca defensiva. Você se afasta antes de mais bote mas leva mordida no braço.', dmg: 6 },
        { i: '🤝', t: 'Imobilização com vara em pinça por aliado', stat: 'dex', dc: 10,
          requires_ally: true,
          desc: 'Seu parceiro prende a cabeça do réptil com um galho bifurcado enquanto vocês passam.',
          sNarr: 'Com técnica serena de caçadores, seu aliado trava a serpente na lama e vocês transpõem a trilha em total segurança.',
          sNarr_by_ally: 'Com técnica serena de caçadores, seu aliado trava a serpente na lama e vocês transpõem a trilha em total segurança.',
          fNarr: 'A serpente escapa da pinça de madeira e silva agressiva antes de sumir nas folhas.', dmg: 2,
          fNarr_by_ally: 'A serpente escapa da pinça de madeira e silva agressiva antes de sumir nas folhas.' },
        { i: '🌿', t: 'Tranquilizar a serpente', stat: 'wis', dc: 10,
          requires_class: ['druida', 'patrulheiro'],
          desc: 'Compreender o comportamento do réptil e contornar sem acionar sua postura de ataque.',
          sNarr: 'Você lê os movimentos da cauda e respeita o território da cobra; ela captura sua presa e ignora sua passagem.',
          fNarr: 'A cobra nota sua aproximação e ergue a cabeça em aviso antes de você recuar.', dmg: 1 },
        { i: '🤸', t: 'Salto esquivo acrobático', stat: 'dex', dc: 11,
          requires_class: ['monge', 'ladino'],
          desc: 'Transpor a raiz curvada em um salto silencioso e ligeiro.',
          sNarr: 'Com agilidade felina, você salta sobre o galho sem produzir vibração no solo e segue viagem ileso.',
          fNarr: 'A aterrissagem estala uma folha seca e você recua no susto.', dmg: 1 }
      ] },

    { title: 'Pescador Solitário',
      npc: { name: 'Branoc, o Pescador do Pântano', desc: 'Homem velho com canas no ombro', portrait: '../shared/img/npcs/branoc-pescador.webp' },
      script: [
        { type: 'narration', text: 'Você vê uma figura solitária à beira da água, pescando. Cana de bambu, paciência infinita.' },
        { type: 'speech', speaker: 'Pescador do Pântano', text: '— Quieto aí, viajante! <i>(sussurra sem virar)</i> Tem uma carpa-fantasma vindo. Vinte minutos esperando ela. Fica quieto cinco minutos comigo, eu te dou rota segura depois.' }
      ],
      choices: [
        { i: '🤐', t: 'Esperar em silêncio', stat: 'wis', dc: 11,
          speech: '"Ficarei imóvel e em silêncio absoluto. Não vou atrapalhar sua pescaria."',
          desc: 'Cinco minutos de paciência aguardando a carpa fisgar a isca.',
          xp: 5,
          xpReason: 'Bondade e paciência observadas',
          sNarr: 'Você fica quieto. A linha tensiona. Ele puxa devagar — uma carpa enorme, escamas prateadas como se carregassem luz própria. "Hoje os deuses fartaram." O velho aponta um caminho seco e seguro através do pântano.',
          fNarr: 'Você se mexe demais. A carpa foge. Ele balança a cabeça, mas sem rancor: "Tudo bem. Segue em paz, jovem."', dmg: 0 },
        { i: '🤝', t: 'Oferecer isca ou anzol da mochila', stat: null,
          requires_ally: true,
          speech: '"Trago anzóis reforçados na bagagem. Pegue um de presente para sua pescaria."',
          desc: 'Seu parceiro tira uma isca e anzol da bolsa de viagem e oferece gentilmente ao veterano.',
          sNarr: 'O ancião aceita o anzol reforçado com um largo sorriso desdentado: "Que a comitiva de vocês tenha a bênção das águas calmas! Vão pelo banco de areia."',
          sNarr_by_ally: 'O ancião aceita o anzol reforçado com um largo sorriso desdentado: "Que a comitiva de vocês tenha a bênção das águas calmas! Vão pelo banco de areia."',
          fNarr: '' },
        { i: '🎣', t: 'Histórias de águas e pescaria', stat: 'cha', dc: 10,
          requires_background: ['sailor', 'folk_hero'],
          speech: '"Águas calmas escondem os peixes mais manhosos. Conheço a paciência que os rios exigem."',
          desc: 'Trocar cumprimentos de quem conhece a paciência dos rios e mares.',
          sNarr: 'O pescador reconhece o companheiro de águas: "Ah, quem já puxou rede sabe respeitar o peixe!" A conversa rende um atalho precioso.',
          fNarr: 'O velho faz sinal de silêncio com o dedo nos lábios, concentrado na linha.', dmg: 0 },
        { i: '🚶', t: 'Acenar e seguir devagar', stat: null,
          speech: '"Boa pescaria, companheiro. Passaremos contornando a margem para não perturbar a água."',
          desc: 'Passar na ponta dos pés para não atrapalhar a pesca.',
          sNarr: 'Você passa como uma sombra sem fazer ondulações na margem; o pescador acena a cabeça em silencioso agradecimento.',
          fNarr: '' }
      ] }
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
          fNarr: '' },
        { i: '🤝', t: 'Socorro em equipe com aliados', stat: 'dex', dc: 10,
          requires_ally: true,
          desc: 'Seu parceiro imobiliza gentilmente o bico da ave com uma capa grossa enquanto você ajusta os ossos da asa.',
          sNarr: 'Com trabalho conjunto perfeito, a asa é imobilizada com talas firmes; a nobre ave bufa com calma e pousa firme em um rochedo seguro.',
          sNarr_by_ally: 'Com trabalho conjunto perfeito, a asa é imobilizada com talas firmes; a nobre ave bufa com calma e pousa firme em um rochedo seguro.',
          fNarr: 'A ave se debate e bica a manga de seu companheiro antes de vocês soltarem.', dmg: 1,
          fNarr_by_ally: 'A ave se debate e bica a manga de seu companheiro antes de vocês soltarem.' },
        { i: '🙏', t: 'Prece de cura e restauração divina', stat: 'wis', dc: 10,
          requires_class: ['clerigo', 'paladino'],
          desc: 'Impor as mãos com energia sagrada sobre a fratura do animal.',
          sNarr: 'Uma luz radiante reconstitui a fibra óssea da asa; a águia emite um grito triunfante e ganha os céus em voo majestoso.',
          fNarr: 'A magia fecha o ferimento superficial mas a asa ainda requer repouso.', dmg: 0 },
        { i: '🏹', t: 'Empatia de caçador da montanha', stat: 'wis', dc: 10,
          requires_class: ['patrulheiro', 'barbaro'],
          desc: 'Usar tiras de couro e carne de ração para tranquilizar a fera dos picos.',
          sNarr: 'A ave aceita a carne com calma e permite o curativo rápido; seu olhar firme agradece o socorro dos mortais.',
          fNarr: 'A ave rejeita a aproximação e agita as garras afiadas.', dmg: 1 }
      ] }
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
          desc: 'Desembainhar as armas e combater o grupo armado.' },
        { i: '🤝', t: 'Aproximação em delegação com aliados', stat: 'cha', dc: 10,
          requires_ally: true,
          desc: 'Avançar em postura diplomática com as armas embainhadas e saudações abertas.',
          sNarr: 'Ao verem a compostura pacífica e equilibrada da sua comitiva, os mercadores acenam com lenços brancos e oferecem tâmaras e água fresca.',
          sNarr_by_ally: 'Ao verem a compostura pacífica e equilibrada da sua comitiva, os mercadores acenam com lenços brancos e oferecem tâmaras e água fresca.',
          fNarr: 'A caravana apressa o passo temendo um grupo armado e passa a distância.', dmg: 0,
          fNarr_by_ally: 'A caravana apressa o passo temendo um grupo armado e passa a distância.' },
        { i: '🪙', t: 'Diálogo comercial de guilda', stat: 'cha', dc: 10,
          requires_background: ['guild_artisan', 'charlatan', 'noble'],
          desc: 'Exibir selos comerciais ou trocar cumprimentos formais das rotas de comércio.',
          sNarr: 'Eles reconhecem o jargão mercantil das guildas e acolhem você com honras; vocês negociam suprimentos com grande vantagem.',
          fNarr: 'Os mascates estão receosos e recusam trocas demoradas no calor.', dmg: 0 }
      ] }
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
    'A trilha sobe um morrinho. Do alto, você vê o trajeto inteiro à frente — três pontos altos antes do destino.',
    'Pequenos pássaros voam baixo e agitados entre os troncos, buscando abrigo nas folhagens. Pássaros voando baixo significa chuva — e logo uma chuva calma começa a gotejar pelas copas.',
    'O vento traz o cheiro inconfundível de terra molhada. Começou a chover na mata, lavando o dossel das árvores com um sussurro rítmico e constante.'
  ],
  plains: [
    'O vento ondula o trigal dourado em ondas, longe até onde a vista alcança. O céu hoje é cobalto sem nuvens.',
    'Uma estrada de terra clara se estende ao horizonte. Pegadas frescas — alguém passou há horas. Não muitos.',
    'Andorinhas cruzam o céu em V bem alto. O tempo segue firme sob o sol aberto — pássaros baixos trariam chuva, mas estes voam alto e tranquilos.',
    'Você passa um marco antigo de pedra com inscrições gastas. A direção certa, confirma o símbolo do reino mal visível.',
    'Um agricultor solitário no campo distante levanta o chapéu pra você. Você responde com aceno — código universal de "tudo bem aqui".',
    'O cheiro do trigo maduro é doce, quase inebriante. Você lembra de coisas que não devia lembrar — boas e ruins.',
    'Uma carroça abandonada na lateral da trilha. Sem rodas, sem cavalos. Algum mercador desistiu há meses, talvez anos.',
    'O vento muda de direção brevemente — você sente perfume de flores selvagens vindo do leste. Boa direção, dizem os antigos.',
    'Andorinhas voam baixo em círculos rápidos rente ao capim. Pássaros voando baixo significa chuva, dizem os camponeses — e em minutos começou a chover, refrescando o solo poeirento da estrada.',
    'Nuvens cinzentas cobrem o horizonte e gotas pesadas começam a cair. Começou a chover sobre a planície aberta, transformando a poeira em terra fértil e úmida.'
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
    'A trilha serpenteia em zigue-zague encosta acima. Cada curva revela um novo horizonte mais distante que o anterior.',
    'Nuvens baixas e densas engolem a encosta da montanha. Uma névoa fria se espalha pelas rochas, cobrindo o caminho de bruma espessa.'
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
      { type: 'narration', text: 'Liberdade tem um preço: vocês são <b>visíveis</b> a muitos marcos de distância. Quem precisa se esconder, escolhe outras rotas.' }
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
        if (t.cls === 'mago') return 'Você mantém a mente afiada e o grimório protegido da poeira, calculando mentalmente as variáveis da viagem.';
        if (t.cls === 'clerigo') return 'Com a mão no símbolo divino, você faz uma oração silenciosa de passagem aos espíritos do caminho.';
        if (t.cls === 'paladino') return 'Sua postura ereta e determinação moral inspiram coragem diante da vastidão incerta das terras selvagens.';
        if (t.cls === 'barbaro') return 'O ar livre dos ermos infla seus pulmões; longe das muralhas de pedra, você se sente verdadeiramente vivo.';
        if (t.cls === 'druida') return 'Você toca a relva na beira da estrada e agradece a acolhida da terra no início da viagem.';
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

    /* -------- dinâmica de grupo vs solo (singular / plural) -------- */
    function _isParty(player) {
        if (player) {
            if (Array.isArray(player.allies) && player.allies.length > 0) return true;
            if (Array.isArray(player.party) && player.party.length > 1) return true;
            if (typeof player.party_count === 'number' && player.party_count > 1) return true;
            if (typeof player.allies_count === 'number' && player.allies_count > 0) return true;
        }
        if (typeof window !== 'undefined' && window.S) {
            if (Array.isArray(window.S.allies) && window.S.allies.length > 0) return true;
            if (Array.isArray(window.S.party) && window.S.party.length > 1) return true;
        }
        return false;
    }

    function _adaptPartyNarrative(text, isGroup) {
        if (!text || typeof text !== 'string') return text;
        if (isGroup) return text;
        var t = text;
        // Frases contextuais específicas
        t = t.replace(/Vocês seguem, e a paisagem branca os engole devagar/g, 'Você segue, e a paisagem branca o engole devagar');
        t = t.replace(/Vocês baixam a cabeça e avançam em fila/g, 'Você baixa a cabeça e avança com firmeza');
        t = t.replace(/virem o primeiro morro/g, 'ver o primeiro morro');
        t = t.replace(/vocês percebem juntos, sem palavras/g, 'você percebe em silêncio');
        t = t.replace(/Vocês ajustam as mochilas, conferem armas, e seguem/g, 'Você ajusta a mochila, confere as armas, e segue');
        t = t.replace(/Vocês ajustam as mochilas/g, 'Você ajusta a mochila');
        t = t.replace(/Vocês ajustam armas e seguem/g, 'Você ajusta a arma e segue');
        t = t.replace(/Armas firmes, vocês cruzam a fronteira/g, 'Arma firme, você cruza a fronteira');
        t = t.replace(/chegada de vocês/g, 'sua chegada');
        t = t.replace(/Tochas acesas\. Olhares trocados/g, 'Tocha acesa. Olhar atento');
        t = t.replace(/Vocês acendem mais uma tocha/g, 'Você ergue a tocha');
        t = t.replace(/\bVocês são\b/g, 'Você é');
        t = t.replace(/\bvocês são\b/g, 'você é');
        t = t.replace(/\bvisíveis\b/g, 'visível');
        t = t.replace(/cruza vocês em direção/g, 'cruza seu caminho em direção');
        t = t.replace(/Vocês embrulham rostos/g, 'Você protege o rosto');
        t = t.replace(/Vocês molham panos e os amarram sobre o rosto/g, 'Você molha um pano e o amarra sobre o rosto');
        t = t.replace(/Vocês conversam dez minutos/g, 'Você conversa dez minutos');

        // Verbos e pronomes diretos
        t = t.replace(/\bVocês seguem\b/g, 'Você segue');
        t = t.replace(/\bvocês seguem\b/g, 'você segue');
        t = t.replace(/\bVocês mantêm\b/g, 'Você mantém');
        t = t.replace(/\bvocês mantêm\b/g, 'você mantém');
        t = t.replace(/\bVocês cruzam\b/g, 'Você cruza');
        t = t.replace(/\bvocês cruzam\b/g, 'você cruza');
        t = t.replace(/\bVocês entram\b/g, 'Você entra');
        t = t.replace(/\bvocês entram\b/g, 'você entra');
        t = t.replace(/\bVocês passam\b/g, 'Você passa');
        t = t.replace(/\bvocês passam\b/g, 'você passa');
        t = t.replace(/\bVocês avançam\b/g, 'Você avança');
        t = t.replace(/\bvocês avançam\b/g, 'você avança');
        t = t.replace(/\bVocês atravessam\b/g, 'Você atravessa');
        t = t.replace(/\bvocês atravessam\b/g, 'você atravessa');
        t = t.replace(/\bVocês apertam\b/g, 'Você aperta');
        t = t.replace(/\bvocês apertam\b/g, 'você aperta');
        t = t.replace(/\bVocês hesitam\b/g, 'Você hesita');
        t = t.replace(/\bvocês hesitam\b/g, 'você hesita');
        t = t.replace(/\bVocês descem\b/g, 'Você desce');
        t = t.replace(/\bvocês descem\b/g, 'você desce');
        t = t.replace(/\bVocês percebem\b/g, 'Você percebe');
        t = t.replace(/\bvocês percebem\b/g, 'você percebe');
        t = t.replace(/\bvocês perceberem\b/g, 'você perceber');
        t = t.replace(/\bvocês esperem\b/g, 'você esperar');
        t = t.replace(/\bvocês sobem\b/g, 'você sobe');
        t = t.replace(/\bvocês chegaram\b/g, 'você chegou');
        t = t.replace(/\bvocês ouvirão\b/g, 'você ouvirá');

        // Sintagmas preposicionais
        t = t.replace(/\batrás de vocês\b/g, 'atrás de você');
        t = t.replace(/\bjunto com vocês\b/g, 'junto com você');
        t = t.replace(/\bantes de vocês\b/g, 'antes de você');
        t = t.replace(/\bcontra vocês\b/g, 'contra você');

        return t;
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
        var isGrp = _isParty(player);
        var baseLines = (pool[pick] || []).map(function (line) {
            return {
                type: line.type || 'narration',
                text: _adaptPartyNarrative(line.text, isGrp)
            };
        });
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
        var isGrp = _isParty(player);
        var chosen = pool[Math.floor(Math.random() * pool.length)] || [];
        return chosen.map(function (line) {
            return {
                type: line.type || 'narration',
                text: _adaptPartyNarrative(line.text, isGrp)
            };
        });
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

    /* -------- narrativa por traco (by_subclass > by_subrace > by_class > by_race > by_alignment > by_background > by_ally > default) -------- */
    function _traits(player) {
        var p = player || {};
        var ck = (global.DndRules && DndRules.classKey) ? DndRules.classKey(p.cls || p.class || p.hero_class || p.char_class) : String(p.cls || p.class || p.hero_class || p.char_class || '').toLowerCase();
        var rk = (global.DndRules && DndRules.raceKey) ? DndRules.raceKey(p.race || p.raca) : String(p.race || p.raca || '').toLowerCase();
        var srk = (global.DndRules && DndRules.subraceKey) ? DndRules.subraceKey(p.subrace || p.sub_race) : String(p.subrace || p.sub_race || '').toLowerCase();
        var sck = (global.DndRules && DndRules.subclassKey) ? DndRules.subclassKey(p.subclass || p.sub_class) : String(p.subclass || p.sub_class || '').toLowerCase();

        // Coleta aliados ativos no grupo
        var rawAllies = [];
        if (Array.isArray(p.allies)) rawAllies = p.allies;
        else if (global.GROUP_MEMBERS && Array.isArray(global.GROUP_MEMBERS)) {
            rawAllies = global.GROUP_MEMBERS.filter(function(m, idx) { return idx > 0 && m && !m.dead; });
        }
        var partyClasses = [ck];
        var partyRaces = [rk];
        var partySubclasses = sck ? [sck] : [];
        var partySubraces = srk ? [srk] : [];
        var allyClasses = [];
        var allyRaces = [];
        var allyNames = [];

        rawAllies.forEach(function(a) {
            if (!a) return;
            var aCls = (global.DndRules && DndRules.classKey) ? DndRules.classKey(a.cls || a.class) : String(a.cls || a.class || '').toLowerCase();
            var aRace = (global.DndRules && DndRules.raceKey) ? DndRules.raceKey(a.race || a.raca) : String(a.race || a.raca || '').toLowerCase();
            var aSubcls = (global.DndRules && DndRules.subclassKey) ? DndRules.subclassKey(a.subclass || a.sub_class) : String(a.subclass || a.sub_class || '').toLowerCase();
            var aSubrace = (global.DndRules && DndRules.subraceKey) ? DndRules.subraceKey(a.subrace || a.sub_race) : String(a.subrace || a.sub_race || '').toLowerCase();
            if (aCls) { partyClasses.push(aCls); allyClasses.push(aCls); }
            if (aRace) { partyRaces.push(aRace); allyRaces.push(aRace); }
            if (aSubcls) partySubclasses.push(aSubcls);
            if (aSubrace) partySubraces.push(aSubrace);
            if (a.name) allyNames.push(a.name);
        });

        return {
            cls: ck,
            race: rk,
            subrace: srk,
            subclass: sck,
            alignment: String(p.alignment || '').toLowerCase(),
            bg: String(p.bg || p.background || '').toLowerCase(),
            name: p.name || 'Viajante',
            allies: rawAllies,
            hasAllies: rawAllies.length > 0,
            allyNames: allyNames,
            partyClasses: partyClasses,
            partyRaces: partyRaces,
            partySubclasses: partySubclasses,
            partySubraces: partySubraces,
            allyClasses: allyClasses,
            allyRaces: allyRaces
        };
    }

    function canTakeChoice(player, choice) {
        if (!choice) return false;
        var t = _traits(player);
        function _match(req, listOrVal) {
            if (!req) return true;
            var reqList = (Array.isArray(req)) ? req : [req];
            var valList = (Array.isArray(listOrVal)) ? listOrVal : [listOrVal];
            for (var rIdx = 0; rIdx < reqList.length; rIdx++) {
                var rItem = String(reqList[rIdx]).toLowerCase();
                for (var vIdx = 0; vIdx < valList.length; vIdx++) {
                    if (String(valList[vIdx]).toLowerCase() === rItem) return true;
                }
            }
            return false;
        }

        // Requer presença de aliados no grupo
        if (choice.requires_ally === true && !t.hasAllies) return false;
        if (choice.only_solo === true && t.hasAllies) return false;

        // Requer classe específica de um aliado
        if (choice.requires_ally_class && !_match(choice.requires_ally_class, t.allyClasses)) return false;

        // Requer classe no grupo (jogador ou aliado)
        if (choice.requires_party_class && !_match(choice.requires_party_class, t.partyClasses)) return false;

        // Requer raça no grupo (jogador ou aliado)
        if (choice.requires_party_race && !_match(choice.requires_party_race, t.partyRaces)) return false;

        // Requer sub-raça no grupo (jogador ou aliado)
        if (choice.requires_party_subrace && !_match(choice.requires_party_subrace, t.partySubraces)) return false;

        // Requer sub-classe no grupo (jogador ou aliado)
        if (choice.requires_party_subclass && !_match(choice.requires_party_subclass, t.partySubclasses)) return false;

        // Requer classe do próprio aventureiro
        var reqCls = choice.requires_class || choice.only_class;
        if (reqCls) {
            var cActual = (t.cls === 'ladrao') ? 'ladino' : t.cls;
            var reqList = (Array.isArray(reqCls)) ? reqCls : [reqCls];
            var matchedCls = false;
            for (var cIdx = 0; cIdx < reqList.length; cIdx++) {
                var rc = String(reqList[cIdx]).toLowerCase();
                if (rc === 'ladrao') rc = 'ladino';
                if (rc === cActual) { matchedCls = true; break; }
            }
            if (!matchedCls) return false;
        }

        // Requer raça do próprio aventureiro
        var reqRace = choice.requires_race || choice.only_race;
        if (reqRace && !_match(reqRace, t.race)) return false;

        // Requer sub-raça do próprio aventureiro
        var reqSubrace = choice.requires_subrace || choice.only_subrace;
        if (reqSubrace && !_match(reqSubrace, t.subrace)) return false;

        // Requer sub-classe do próprio aventureiro
        var reqSubclass = choice.requires_subclass || choice.only_subclass;
        if (reqSubclass && !_match(reqSubclass, t.subclass)) return false;

        // Requer antecedente
        var reqBg = choice.requires_background || choice.requires_bg;
        if (reqBg && !_match(reqBg, t.bg)) return false;

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
            if (choice.sNarr_by_ally && t.hasAllies) return choice.sNarr_by_ally;
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

        if (choice.fNarr_by_ally && t.hasAllies) return choice.fNarr_by_ally;
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

    /* -------- Baldur's Gate 3 Dialogue Choice Voice Engine (D&D 5e) -------- */
    function pickChoiceVoice(choice, player, hazard) {
        if (!choice) return { tag: '', speech: '' };
        var t = _traits(player);
        var clsKey = t.cls;
        var clsAlt = (clsKey === 'ladino') ? 'ladrao' : (clsKey === 'ladrao' ? 'ladino' : clsKey);

        function _findIn(obj, key, alt) {
            if (!obj) return null;
            if (key && obj[key]) return obj[key];
            if (alt && obj[alt]) return obj[alt];
            return null;
        }

        // 1. Resolve Tag (BG3-style D&D 5e badge)
        var resolvedTag = '';
        if (choice.tag_by_background && t.bg && choice.tag_by_background[t.bg]) {
            resolvedTag = choice.tag_by_background[t.bg];
        } else if (choice.tag_by_subclass && t.subclass && choice.tag_by_subclass[t.subclass]) {
            resolvedTag = choice.tag_by_subclass[t.subclass];
        } else if (choice.tag_by_class) {
            var tagCls = _findIn(choice.tag_by_class, clsKey, clsAlt);
            if (tagCls) resolvedTag = tagCls;
        } else if (choice.tag_by_race && t.race && choice.tag_by_race[t.race]) {
            resolvedTag = choice.tag_by_race[t.race];
        }

        if (!resolvedTag && choice.tag) {
            resolvedTag = choice.tag;
        }

        if (!resolvedTag) {
            var reqBg = choice.requires_background || choice.requires_bg;
            if (reqBg) {
                var bgKey = (Array.isArray(reqBg)) ? (t.bg && reqBg.indexOf(t.bg) >= 0 ? t.bg : reqBg[0]) : reqBg;
                var BG_MAP = {
                    soldier: 'SOLDADO',
                    noble: 'NOBRE',
                    folk_hero: 'DEFENSOR DO POVO',
                    acolyte: 'ACÓLITO',
                    criminal: 'CRIMINOSO',
                    sage: 'SÁBIO',
                    outlander: 'ANDARILHO',
                    guild_artisan: 'ARTESÃO',
                    urchin: 'ÓRFÃO',
                    hermit: 'EREMITA',
                    charlatan: 'CHARLATÃO',
                    sailor: 'MARINHEIRO',
                    entertainer: 'ARTISTA'
                };
                resolvedTag = BG_MAP[bgKey] || String(bgKey).toUpperCase();
            } else if (choice.requires_class) {
                var cReq = (Array.isArray(choice.requires_class)) ? (t.cls && choice.requires_class.indexOf(t.cls) >= 0 ? t.cls : choice.requires_class[0]) : choice.requires_class;
                var CLS_MAP = {
                    guerreiro: 'GUERREIRO',
                    barbaro: 'BÁRBARO',
                    paladino: 'PALADINO',
                    clerigo: 'CLÉRIGO',
                    ladino: 'LADINO',
                    ladrao: 'LADINO',
                    mago: 'MAGO',
                    bruxo: 'BRUXO',
                    feiticeiro: 'FEITICEIRO',
                    patrulheiro: 'PATRULHEIRO',
                    bardo: 'BARDO',
                    druida: 'DRUIDA',
                    monge: 'MONGE'
                };
                resolvedTag = CLS_MAP[cReq] || String(cReq).toUpperCase();
            } else if (choice.requires_race) {
                var rReq = (Array.isArray(choice.requires_race)) ? (t.race && choice.requires_race.indexOf(t.race) >= 0 ? t.race : choice.requires_race[0]) : choice.requires_race;
                var RACE_MAP = {
                    human: 'HUMANO',
                    elf: 'ELFO',
                    dwarf: 'ANÃO',
                    halforc: 'MEIO-ORC',
                    halfling: 'HALFLING',
                    gnome: 'GNOMO',
                    tiefling: 'TIEFLING',
                    dragonborn: 'DRACONATO'
                };
                resolvedTag = RACE_MAP[rReq] || String(rReq).toUpperCase();
            } else if (choice.requires_ally && t.hasAllies) {
                resolvedTag = 'LÍDER DO GRUPO';
            } else if (choice.isCombat) {
                resolvedTag = 'COMBATE';
            } else if (choice.stat || choice.skill) {
                var sKey = String(choice.stat || choice.skill).toLowerCase();
                var cDesc = ((choice.t || '') + ' ' + (choice.desc || '') + ' ' + (choice.label || '')).toLowerCase();
                if (sKey === 'cha' || sKey === 'charisma' || sKey === 'persuasion' || sKey === 'deception' || sKey === 'intimidation') {
                    if (cDesc.indexOf('ment') >= 0 || cDesc.indexOf('fing') >= 0 || cDesc.indexOf('disfar') >= 0 || sKey === 'deception') resolvedTag = 'ENGANAÇÃO';
                    else if (cDesc.indexOf('amea') >= 0 || cDesc.indexOf('intimid') >= 0 || cDesc.indexOf('força') >= 0 || sKey === 'intimidation') resolvedTag = 'INTIMIDAÇÃO';
                    else resolvedTag = 'PERSUASÃO';
                } else if (sKey === 'dex' || sKey === 'dexterity' || sKey === 'stealth' || sKey === 'sleight_of_hand' || sKey === 'acrobatics') {
                    if (cDesc.indexOf('furtiv') >= 0 || cDesc.indexOf('sombra') >= 0 || cDesc.indexOf('escond') >= 0 || cDesc.indexOf('contorn') >= 0 || sKey === 'stealth') resolvedTag = 'FURTIVIDADE';
                    else if (cDesc.indexOf('corda') >= 0 || cDesc.indexOf('gatilho') >= 0 || cDesc.indexOf('armadilha') >= 0 || cDesc.indexOf('destrav') >= 0 || cDesc.indexOf('desarm') >= 0 || sKey === 'sleight_of_hand') resolvedTag = 'LADINAGEM';
                    else resolvedTag = 'ACROBACIA';
                } else if (sKey === 'str' || sKey === 'strength' || sKey === 'athletics') {
                    resolvedTag = 'ATLETISMO';
                } else if (sKey === 'wis' || sKey === 'wisdom' || sKey === 'perception' || sKey === 'survival' || sKey === 'insight') {
                    if (cDesc.indexOf('olhar') >= 0 || cDesc.indexOf('notar') >= 0 || cDesc.indexOf('perceb') >= 0 || cDesc.indexOf('vigia') >= 0 || cDesc.indexOf('estud') >= 0 || sKey === 'perception') resolvedTag = 'PERCEPÇÃO';
                    else if (cDesc.indexOf('trilha') >= 0 || cDesc.indexOf('sobreviv') >= 0 || cDesc.indexOf('rastro') >= 0 || cDesc.indexOf('clima') >= 0 || sKey === 'survival') resolvedTag = 'SOBREVIVÊNCIA';
                    else resolvedTag = 'INTUIÇÃO';
                } else if (sKey === 'int' || sKey === 'intelligence' || sKey === 'arcana' || sKey === 'investigation' || sKey === 'history') {
                    if (cDesc.indexOf('magi') >= 0 || cDesc.indexOf('arcan') >= 0 || cDesc.indexOf('runa') >= 0 || sKey === 'arcana') resolvedTag = 'ARCANISMO';
                    else if (cDesc.indexOf('investig') >= 0 || cDesc.indexOf('examin') >= 0 || sKey === 'investigation') resolvedTag = 'INVESTIGAÇÃO';
                    else resolvedTag = 'HISTÓRIA';
                } else if (sKey === 'con' || sKey === 'constitution') {
                    resolvedTag = 'CONSTITUIÇÃO';
                }
            }
        }
        if (!resolvedTag) resolvedTag = (choice.badge ? String(choice.badge).replace(/^\[|\]$/g, '') : '');
        if (resolvedTag && resolvedTag.toUpperCase() === 'AÇÃO') resolvedTag = '';

        // 2. Resolve Speech (1st-person dialogue in quotes or active 1st-person action)
        var resolvedSpeech = '';
        if (choice.speech_by_ally && t.hasAllies) resolvedSpeech = choice.speech_by_ally;
        if (!resolvedSpeech && choice.speech_by_background && t.bg) resolvedSpeech = choice.speech_by_background[t.bg];
        if (!resolvedSpeech && choice.speech_by_subclass && t.subclass) resolvedSpeech = choice.speech_by_subclass[t.subclass];
        if (!resolvedSpeech && choice.speech_by_subrace && t.subrace) resolvedSpeech = choice.speech_by_subrace[t.subrace];
        if (!resolvedSpeech && choice.speech_by_class) resolvedSpeech = _findIn(choice.speech_by_class, clsKey, clsAlt);
        if (!resolvedSpeech && choice.speech_by_race && t.race) resolvedSpeech = choice.speech_by_race[t.race];
        if (!resolvedSpeech && choice.speech) resolvedSpeech = choice.speech;

        // If no explicit speech provided, do not fabricate quotes around action description:
        // Actions (e.g. stealth, athletics, passing quietly) are physical intents, not spoken dialogue.
        if (!resolvedSpeech) {
            resolvedSpeech = '';
        }

        return {
            tag: resolvedTag.toUpperCase(),
            speech: resolvedSpeech
        };
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
        if (t.race === 'elf') return 'Com a graça e acuidade élficas, sua vista perscruta muitos marcos de distância em busca de qualquer alteração no relevo.';
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
        if (t.subclass === 'war') return 'Você ora pelo favor da divindade das batalhas, empunhando a fé como um escudo inquebrantável na viagem.';
        if (t.subclass === 'vengeance') return 'O peso do seu juramento de vingança guia seu passo inflexível; nada entre os portões e o destino deterá sua marcha.';
        if (t.subclass === 'devotion') return 'Sua lâmina brilha com honra e retidão; você parte como um bastião de luz contra os perigos dos ermos.';
        if (t.subclass === 'berserker') return 'O sangue ferve na expectativa da violência; seus músculos tremem com fúria contida a cada passada decidida.';
        if (t.subclass === 'lore') return 'Você recorda baladas antigas sobre as ruínas e perigos desta região, buscando pistas históricas úteis para a viagem.';
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

    function _getPreparationChoices(t, biome, player) {
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
                desc: 'Invoca o favor divino para resguardar a viagem contra infortúnios (Vantagem no 1º teste com Sabedoria).',
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
                label: 'Postura de Marcha: Ritmo constante a caminho',
                desc: 'Marca um compasso animado para manter o ânimo e a mente afiados (Vantagem no 1º teste com Carisma).',
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

        // Postura Cartográfica e Conhecimento de Rotas (Ordem do Usuário 2026-10)
        var hasCorvus = !!(player && (player.corvus_route_knowledge || player.cartographer_advice || (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('valdoria_corvus_route_knowledge'))));
        var hasVeteran = !!(player && (player.veteran_path_tips || (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('valdoria_veteran_path_tips'))));
        if (hasCorvus) {
            preps.push({
                id: 'prep_corvus_map',
                label: 'Cartas e Anotações de Mestre Corvus: Atalhos e marcos de relevo',
                desc: 'Anotações cartográficas detalhadas sobre o relevo, ravinas e atalhos de Valdoria (Vantagem no 1º teste com Inteligência ou Sabedoria e orientação aprimorada).',
                isPrep: true,
                stat: 'wis',
                prepText: 'Você desdobra as cartas e notas de Mestre Corvus, conferindo marcações de relevo e marcos de pedras que indicam trilhas mais seguras.'
            });
        }
        if (hasVeteran) {
            preps.push({
                id: 'prep_veteran_trail',
                label: 'Conselhos de Batedores Veteranos: Trilhas batidas e desvios',
                desc: 'Instruções práticas transmitidas por veteranos experientes sobre passagens firmes (Vantagem no 1º teste com Percepção ou Sobrevivência).',
                isPrep: true,
                stat: 'wis',
                prepText: 'Os relatos práticos de velhos batedores ecoam em sua memória, revelando quais gargantas evitar e onde o solo sustenta o passo.'
            });
        }

        return preps;
    }

    function getConfirmationContent(player, j) {
        var t = _traits(player);
        var dest = (j && j.displayName) || 'destino desconhecido';
        var steps = (j && j.total) || 3;
        var estDist = steps * 3;
        var biome = (j && j.biome) || 'plains';
        var isReturn = (dest === 'Valdoria' || (j && j.isReturn) || (j && j.opts && (j.opts.direction === 'return' || j.opts.isReturn)));

        var script = [
            {
                type: 'narration',
                text: isReturn
                    ? ('Você contempla a jornada de regresso a <b>' + dest + '</b> a partir das terras ermas. O caminho de volta estima uma distância aproximada de <b>~' + estDist + ' marcos</b> por trilhas que podem variar conforme o relevo e os imprevistos da rota.')
                    : ('Você contempla a rota para <b>' + dest + '</b> além dos portões. A viagem pelas terras ermas estima uma distância aproximada de <b>~' + estDist + ' marcos</b> de marcha contínua por caminhos sujeitos a desvios e imprevistos.')
            }
        ];

        var rFlavor = _getRaceConfirmationNarration(t, biome);
        if (rFlavor) script.push({ type: 'narration', text: rFlavor });

        var cFlavor = _getClassConfirmationNarration(t, biome);
        if (cFlavor) script.push({ type: 'narration', text: cFlavor });

        var choices = [
            {
                id: 'jrn_go',
                label: isReturn ? 'Iniciar marcha de retorno' : 'Partir em marcha padrão',
                desc: isReturn
                    ? 'Avançar com determinação pela estrada de volta aos portões de Valdoria.'
                    : 'Avançar no ritmo comum da estrada, sem preparação tática especial.'
            }
        ];

        var prepChoices = _getPreparationChoices(t, biome, player);
        for (var i = 0; i < prepChoices.length; i++) {
            choices.push(prepChoices[i]);
        }

        choices.push({
            id: 'jrn_cancel',
            label: isReturn ? 'Continuar na exploração' : 'Permanecer na cidade',
            desc: isReturn
                ? 'Suspender o retorno e continuar explorando as terras ermas.'
                : 'Suspender a viagem e continuar em segurança dentro dos muros da cidade.'
        });

        return {
            script: script,
            choices: choices,
            choicesTitle: isReturn ? 'Retorno a Valdoria' : 'Preparação de Viagem',
            choicesSubtitle: isReturn ? ('Regresso a ' + dest) : ('Rumo a ' + dest),
            compact: true
        };
    }

    function _extractJourneyText(input) {
        if (!input) return '';
        if (typeof input === 'string') return input;
        if (Array.isArray(input)) {
            return input.map(_extractJourneyText).join(' ');
        }
        if (typeof input === 'object') {
            var parts = [];
            if (input.title) parts.push(input.title);
            if (input.text) parts.push(input.text);
            if (input.narr) parts.push(input.narr);
            if (input.speech) parts.push(input.speech);
            if (input.sNarr) parts.push(input.sNarr);
            if (input.fNarr) parts.push(input.fNarr);
            if (input.script) parts.push(_extractJourneyText(input.script));
            if (input.choices && Array.isArray(input.choices)) {
                for (var i = 0; i < input.choices.length; i++) {
                    var ch = input.choices[i];
                    if (ch) {
                        if (ch.sNarr) parts.push(ch.sNarr);
                        if (ch.fNarr) parts.push(ch.fNarr);
                    }
                }
            }
            return parts.join(' ');
        }
        return String(input);
    }

    /**
     * Detecta condição climática ('r', 't', 'f', 's') a partir de textos narrativos
     * ocorridos durante a jornada (partida, eventos seguros, perigos e desfechos).
     */
    function detectWeather(input) {
        var raw = _extractJourneyText(input);
        if (!raw) return null;
        var norm = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        // 1. Tempestade / Tormenta / Raios / Trovões / Vendaval
        var isStorm = /\b(tempestad\w*|torment\w*|trova\w*|trovo\w*|relampag\w*|vendaval\w*)\b/.test(norm);

        // 2. Detecção de Pássaros:
        var birdLow = /\b(passaro\w*|andorinha\w*)\b.*?\b(baixo\w*)\b|\b(voa\w*)\s+(baixo\w*)\b/.test(norm);
        var birdHigh = /\b(passaro\w*|andorinha\w*)\b.*?\b(alto\w*)\b|\b(voa\w*)\s+(alto\w*)\b/.test(norm);
        var birdLowProverb = /passaro\w*.*?(voa\w*\s+)?baixo\w*.*?(significa\w*|traz\w*|prenuncia\w*).*?chuv\w*/.test(norm);

        // 3. Chuva / Garoa / Chuvisco / Gotas / Pingos
        var isRain = /\b(chuv\w*|chov\w*|garoa\w*|pingos?|gotas?\s+pesadas?)\b/.test(norm);

        // 4. Névoa / Neblina / Bruma / Nevoeiro
        var isFog = /\b(nevoa\w*|neblina\w*|bruma\w*|nevoeiro\w*)\b/.test(norm);

        // 5. Céu limpo / Sol / Tempo bom / Sem nuvens
        var isClear = /\b(ceu\s+(aberto|limpo|azul|cobalto)|sol\s+(aberto|radiante|forte|dourado)|tempo\s+(bom|firme|aberto)|sem\s+nuvens)\b/.test(norm);

        // Se pássaros voam alto e não há menção de chuva ou tempestade ativa:
        if (birdHigh && /\b(estes|mas|porem|enquanto)\s+(voa\w*|est\w*)\s+alto\b/.test(norm) && !/\b(comec\w*|chove\s+forte|gotas\s+pesadas|temporal)\b/.test(norm)) {
            return 's';
        }
        if (birdHigh && !birdLow && !isRain && !isStorm) {
            return 's';
        }

        // Tempestade prevalece sobre chuva comum:
        if (isStorm) {
            return 't';
        }

        // Chuva direta ou sinal de pássaros voando baixo:
        if (isRain || birdLow || birdLowProverb) {
            if (/\b(chuva\s+passou|sol\s+(voltou|abriu)|tempo\s+abriu)\b/.test(norm)) {
                return 's';
            }
            return 'r';
        }

        // Névoa / neblina:
        if (isFog) {
            return 'f';
        }

        // Céu limpo / sol aberto:
        if (isClear) {
            return 's';
        }

        return null;
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
        pickNarrative: pickNarrative,
        pickChoiceVoice: pickChoiceVoice,
        detectWeather: detectWeather,
        isParty: _isParty,
        adaptPartyNarrative: _adaptPartyNarrative
    };
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = global.JourneyData;
    }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));

