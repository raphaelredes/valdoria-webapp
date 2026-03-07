// ═══════════════════════════════════════════════════════
// NARRATION DATA — local lookup tables
// Mirrors backend map_poi_narrations.py + map_generator.py
// Narrations are resolved client-side to save URL payload space.
// ═══════════════════════════════════════════════════════

// --- DM Intro (per biome, with '|' page breaks) ---
const DM_INTROS = {
    forest: "Galhos estalam sob seus pés enquanto a luz do sol se filtra pelas copas das árvores antigas.",
    plains: "O vento sopra livre, trazendo o cheiro de grama e sons distantes de criaturas selvagens.",
    swamp: "O ar úmido envolve você. Cada passo afunda na lama escura enquanto a névoa limita sua visão.",
    cave: "A escuridão te engole. Apenas o eco dos seus passos e o pingar de água quebram o silêncio.",
    desert: "O sol castiga implacável. Dunas douradas se estendem até o horizonte, sem fim à vista.",
    mountain: "O vento gélido corta seu rosto. Pedras soltas rangem sob seus pés no caminho íngreme.",
    snow: "O frio penetra até os ossos. Tudo é branco até onde a vista alcança.",
    volcanic: "O calor é sufocante. Rios de lava brilham ao longe e o chão treme a cada passo.",
    graveyard: "Lápides cobertas de musgo emergem da névoa. Sussurros distantes e indecifráveis enchem o ar.",
};
const DM_DANGER_EXT = {
    5: " O perigo é palpável — cada sombra pode esconder uma ameaça mortal.",
    3: " Seu instinto diz para ficar alerta.",
};

function getDMIntro(biome, dangerLevel) {
    let text = DM_INTROS[biome] || DM_INTROS.forest;
    if (dangerLevel >= 5) text += DM_DANGER_EXT[5];
    else if (dangerLevel >= 3) text += DM_DANGER_EXT[3];
    return text;
}

// --- POI Narrations (order must match backend map_poi_narrations.py) ---
const POI_NARRATIONS = {
    discovery: {
        forest: [
            "Raios de sol filtram pelas copas e iluminam uma clareira coberta de musgos vibrantes.",
            "Cogumelos luminescentes formam um anel perfeito entre raízes ancestrais.",
            "Uma nascente borbulha entre pedras cobertas de musgo, cristalina e pura.",
            "Pegadas éllficas, quase invisíveis, levam até uma árvore marcada com runas.",
            "Um ninho de falcão abandonado contém penas iridescentes e restos de couro.",
            "Flores roxas raras crescem ao redor de um totem de madeira entalhada.",
        ],
        plains: [
            "O vento revela uma pedra antiga coberta de inscrições quase apagadas.",
            "Um campo de flores selvagens se estende até o horizonte, escondendo algo entre as hastes.",
            "Rastros de uma caravana levam até provisões esquecidas na grama alta.",
            "Uma colina oferece vista panorâmica — e um marco antigo no topo.",
            "Ossos de um animal grande marcam um antigo campo de caça.",
        ],
        swamp: [
            "Uma poça brilha com um verde fosforescente, emitindo um cheiro adocicado.",
            "Raízes de mangue entrelaçadas formam um arco natural sobre águas paradas.",
            "Libélulas gigantes voam em círculos ao redor de orquídeas raras e luminosas.",
            "Uma trilha seca emerge da lama, marcada por pegadas de garras grandes.",
            "Musgo brilhante cobre troncos caídos, emanando um calor suave ao toque.",
        ],
        cave: [
            "Cristais azulados crescem nas paredes, emitindo uma luz fraca mas constante.",
            "Uma câmara se abre revelando estalactites que pingam água mineral brilhante.",
            "Fungos luminosos cobrem o teto como estrelas subterrâneas.",
            "Um veio de minério cintila na parede, parcialmente exposto pela erosão.",
            "Pinturas rupestres retratam criaturas desconhecidas e rituais esquecidos.",
        ],
        desert: [
            "Um oásis minúsculo surge entre as dunas, com uma palmeira solitária e água fresca.",
            "Ruínas de arenito emergem da areia, revelando fragmentos de cerâmica decorada.",
            "Um cacto medicinal raro floresce sob o sol escaldante, suas flores carmesim brilhando.",
            "Fósseis expostos pela erosão revelam criaturas de uma era esquecida.",
            "Uma pedra polida pelo vento forma uma lente natural que concentra luz.",
        ],
        mountain: [
            "Uma nascente glacial jorra da rocha, formando um riacho que desaparece na neve.",
            "Ervas alpinas raras crescem em uma fenda protegida do vento cortante.",
            "Um ninho de águia abandonado contém penas e pequenas gemas de quartzo.",
            "Uma gruta natural oferece abrigo e contém restos de uma fogueira antiga.",
            "A vista do pico revela vales distantes e caminhos esquecidos.",
        ],
        snow: [
            "Um lago congelado perfeitamente transparente revela pedras coloridas no fundo.",
            "Pegadas frescas na neve levam até uma cova com provisões preservadas pelo frio.",
            "Aurora boreal ilumina a neve, revelando padrões que parecem runas naturais.",
            "Um pinheiro milenar resiste à tempestade, seus galhos cobertos de cristais de gelo.",
            "Uma caverna de gelo reflete luz em arco-íris hipnotizantes.",
        ],
        volcanic: [
            "Um gêiser libera vapor quente que cheira a enxofre e minerais raros.",
            "Obsidiana pura e negra forma uma lâmina natural, cortante e bela.",
            "Uma fonte termal borbulha com água morna rica em propriedades curativas.",
            "Cinza vulcânica fértil nutre um arbusto solitário com frutos estranhos.",
            "Cristais de fogo crescem em uma fenda, pulsando com calor interno.",
        ],
        graveyard: [
            "Uma lápide intacta conta a história de um herói esquecido em versos elegantes.",
            "Flores frescas adornam uma tumba — alguém ainda visita este lugar.",
            "Uma estátua de anjo chora lágrimas que brilham à luz da lua.",
            "Oferendas intactas cercam um altar funerário coberto de musgo.",
            "Uma cripta entreaberta revela um interior iluminado por velas eternas.",
        ],
    },
    search: {
        forest: [
            "Um tronco oco parece esconder algo em seu interior escuro e úmido.",
            "Raízes suspensas criam um espaço oculto sob uma árvore centenária.",
            "Uma pedra marcada com um X antigo se destaca entre o musgo.",
            "Galhos quebrados indicam que algo foi arrastado recentemente por aqui.",
        ],
        plains: [
            "Ruínas baixas de pedra escondem compartimentos sob lajes soltas.",
            "Um poço abandonado tem algo brilhando no fundo escuro.",
            "Uma carroça tombada ainda contém baús semi-intactos.",
            "Pedras empilhadas marcam um esconderijo improvisado.",
        ],
        swamp: [
            "Bolhas de gás escapam da lama ao redor de um objeto semi-submerso.",
            "Cipós entrelaçados formam uma rede que prende algo brilhante.",
            "Uma carcaça encalhada de barco esconde compartimentos intactos.",
            "Troncos submersos escondem cavidades cheias de surpresas.",
        ],
        cave: [
            "Uma fenda estreita na parede emite uma corrente de ar morno.",
            "Um nicho na rocha contém objetos envolvidos em panos velhos.",
            "Ossos antigos ao lado de uma mochila corroída chamam sua atenção.",
            "Água gotejando criou uma poça cristalina com algo no fundo.",
        ],
        desert: [
            "Areia revolvida indica que algo foi enterrado aqui recentemente.",
            "Um baú semi-enterrado surge após o vento mover as dunas.",
            "Pedras esculpidas formam um esconderijo camuflado na paisagem.",
            "Rastros de roedores convergem para uma toca com brilho metálico.",
        ],
        mountain: [
            "Uma trilha desmoronada revela uma passagem secreta na rocha.",
            "Uma fenda na rocha contém sacos de couro preservados.",
            "Um acampamento abandonado tem equipamento deixado às pressas.",
            "Pedregulhos soltos escondem uma cavidade com suprimentos.",
        ],
        snow: [
            "Um monte de neve tem forma suspeita — algo foi coberto aqui.",
            "Gelo translúcido preserva objetos visíveis mas inalcançáveis... quase.",
            "Um abrigo soterrado tem a entrada parcialmente exposta.",
            "Troncos cobertos de neve escondem fardos de viajantes perdidos.",
        ],
        volcanic: [
            "Uma fenda fumegante tem brilho metálico em suas paredes internas.",
            "Rocha derretida solidificou ao redor de objetos, criando um molde natural.",
            "Fragmentos de cristal vulcânico emergem de uma cratera menor.",
            "Uma estrutura calcinada mantém um cofre de ferro ainda intacto.",
        ],
        graveyard: [
            "Uma cova revolvida expõe um baú de madeira reforçado com ferro.",
            "Um ossuário antigo tem compartimentos ocultos atrás das paredes.",
            "Uma tumba profanada revela passagens secretas sob o mármore.",
            "Um caixão exposto pela erosão contém mais que restos mortais.",
        ],
    },
    mystery: {
        forest: [
            "Um brilho esverdeado pulsa entre as árvores, como se a própria floresta respirasse.",
            "Runas luminosas aparecem na casca de um carvalho ancestral ao seu toque.",
            "Um círculo de cogumelos emite uma vibração que faz o ar tremer.",
            "Vozes distantes cantam em uma língua esquecida entre as folhas.",
        ],
        plains: [
            "Um pilar solitário ergue-se no meio do campo, coberto de símbolos que mudam com a luz.",
            "O vento carrega fragmentos de uma melodia impossível vinda de lugar nenhum.",
            "A grama forma espirais perfeitas ao redor de uma pedra que flutua levemente.",
        ],
        swamp: [
            "Luzes fantasmagóricas dançam sobre as águas estagnadas, guiando e enganando.",
            "Seu reflexo na água parada não acompanha seus movimentos — ele sorri.",
            "Sussurros emergem da névoa, formando palavras quase compreensíveis.",
        ],
        cave: [
            "Ecos de suas pisadas voltam transformados em música, como se a caverna cantasse.",
            "Uma luz sem origem emana de uma fissura, projetando sombras impossíveis.",
            "Glifos antigos brilham na rocha quando você os toca, reagindo ao seu calor.",
        ],
        desert: [
            "Uma miragem persiste mesmo quando você fecha os olhos — ela é real.",
            "Um obelisco solitário irradia calor sobrenatural que distorce o ar.",
            "Areia forma padrões geométricos sozinha, como se algo desenhasse de baixo.",
        ],
        mountain: [
            "O vento uiva frases em uma língua antiga ao passar pelas fendas da rocha.",
            "Um altar de pedra natural emana uma energia que faz seus pelos se arrepiarem.",
            "A névoa se move contra o vento, envolvendo um ponto específico da trilha.",
        ],
        snow: [
            "A geada forma padrões que parecem mapas — ou talvez avisos.",
            "Um canto melódico ecoa na neve, vindo de todos os lados ao mesmo tempo.",
            "Um cristal de gelo flutua no ar, girando lentamente, pulsando com luz azul.",
        ],
        volcanic: [
            "Uma chama arde sem combustível, fria ao toque mas que aquece a alma.",
            "Sussurros emergem da lava como bolhas, trazendo visões fugídias.",
            "Marcas de fogo aparecem no chão formando um círculo arcano pulsante.",
        ],
        graveyard: [
            "Uma vela acende-se sozinha sobre uma tumba, sua chama dança sem vento.",
            "Um nome brilha em uma lápide, mudando a cada vez que você desvia o olhar.",
            "Uma sombra sem corpo move-se entre as lápides com propósito.",
        ],
    },
    danger: {
        forest: [
            "Galhos se partem nas sombras. Olhos brilhantes observam da escuridão da mata.",
            "Um rosnado baixo ecoa entre as árvores. Algo se move nas moitas.",
            "Teias pegajosas cobrem o caminho. O predador está perto.",
        ],
        plains: [
            "A grama alta se move contra o vento. Algo se aproxima rapidamente.",
            "Pegadas frescas no solo úmido. O predador ainda está por perto.",
            "Um silêncio antinatural cai sobre o campo. Perigo iminente.",
        ],
        swamp: [
            "Bolhas sobem da lama escura. Olhos emergem da superfície pantanosa.",
            "O pântano gurgulha e algo grande se move sob as águas turvas.",
            "Um sibilo ameaçador vem de trás dos juncos encharcados.",
        ],
        cave: [
            "Algo arranha as paredes na escuridão além do alcance da sua tocha.",
            "Um rugido cavernoso ecoa pelos túneis, cada vez mais próximo.",
            "Olhos brilham no teto da caverna — dezenas deles.",
        ],
        desert: [
            "A areia treme sob seus pés. Algo se move logo abaixo da superfície.",
            "Um ninho agitado revela criaturas agressivas protegendo seu território.",
            "A tempestade de areia esconde uma forma ameaçadora que se aproxima.",
        ],
        mountain: [
            "Pedras rolam da encosta — ou foram empurradas. Algo espera nas alturas.",
            "Um covil escondido entre as rochas emana calor e cheiro de predador.",
            "A ponte de rocha instável tem marcas de garras. Não está desocupada.",
        ],
        snow: [
            "Pegadas enormes marcam a neve fresca. O que as fez está por perto.",
            "O gelo range e algo emerge da nevasca, olhos brilhando na escuridão.",
            "Uma fissura no gelo revela um covil ocupado. Olhos refletem sua luz.",
        ],
        volcanic: [
            "Chamas dançam em um padrão antinatural. Uma criatura de fogo materializa-se.",
            "O calor aumenta drasticamente. Algo se move entre as rochas incandescentes.",
            "Gases tóxicos disfarçam a criatura que espreita entre fendas vulcânicas.",
        ],
        graveyard: [
            "A terra se move. Uma mão esquelética emerge da cova ao seu lado.",
            "Gemidos ecoam das tumbas abertas. Os mortos estão inquietos esta noite.",
            "Olhos espectrais brilham na escuridão entre as lápides rachadas.",
        ],
    },
};

// --- Random Encounter Narrations (order must match backend) ---
const ENCOUNTER_NARRATIONS = {
    ambush: {
        forest: [
            "Flechas voam das árvores! Emboscada!",
            "Galhos se partem e sombras saltam da folhagem densa!",
            "Um rugido gutural ecoa entre os troncos — lobos cercam você!",
            "Cipós se movem como serpentes, mas são mãos que os puxam!",
            "A folhagem explode e criaturas famintas avançam dos arbustos!",
        ],
        plains: [
            "Bandidos surgem da grama alta brandindo armas enferrujadas!",
            "Lanças emergem da vegetação rasteira! Uma patrulha hostil!",
            "O solo treme — cavaleiros surgem galopando na sua direção!",
            "Figuras encapuzadas se erguem entre as colinas, cercando você!",
        ],
        swamp: [
            "A lama explode e garras escamosas emergem da água turva!",
            "Algo agarra seu tornozelo — tentáculos viscosos puxam você!",
            "Olhos se abrem na superfície do pântano. Dezenas deles!",
            "Criaturas anfíbias saltam dos juncos com dentes à mostra!",
        ],
        cave: [
            "Pedras caem do teto — não é desmoronamento, é emboscada!",
            "Criaturas saltam da escuridão com olhos fosforescentes!",
            "O silêncio é quebrado por guinchos agudos. Morcegos gigantes!",
            "Estalactites se soltam — não, são criaturas camufladas!",
        ],
        desert: [
            "Areia explode! Algo ataca de baixo da superfície quente!",
            "Figuras surgem das dunas como miragens que se tornaram reais!",
            "Escorpiões gigantes emergem da areia em formação de ataque!",
            "Nômades hostis aparecem do nada, lâminas cintilando ao sol!",
        ],
        mountain: [
            "Rochas rolam em sua direção! Não foi acidente — é emboscada!",
            "Algo salta das alturas com um grito que ecoa entre os picos!",
            "Criaturas alpinas descem a encosta em velocidade aterrorizante!",
            "Uma avalanche de pedras cobre a retaguarda — e garras surgem!",
        ],
        snow: [
            "A neve explode! Algo camuflado de branco ataca ferozmente!",
            "Figuras brancas saltam da nevasca como fantasmas de gelo!",
            "O uivo do vento mascara o rugido da criatura que se aproxima!",
            "Gelo se parte e uma besta paleolítica emerge faminta!",
        ],
        volcanic: [
            "Lava espirra! Algo emerge das chamas como um demônio!",
            "O chão racha e garras incandescentes surgem das fendas!",
            "Uma criatura de obsidiana se desprende da rocha derretida!",
            "Gases quentes anunciam a chegada de elementais furiosos!",
        ],
        graveyard: [
            "Mãos esqueléticas agarram seu pé desde uma cova aberta!",
            "Sombras atacam sem aviso, frias como o toque da morte!",
            "A terra se abre e mortos-vivos emergem com gemidos terríveis!",
            "Uma presença fantasmagórica materializa-se entre as lápides!",
        ],
    },
    trap: {
        forest: [
            "O chão cede — uma cova de estacas escondida por folhas!",
            "Uma rede de cipós se fecha ao seu redor como uma armadilha!",
            "Espinhos envenenados disparam de um tronco oco quando você passa!",
            "Uma raiz se enrola em seu pé — armadilha de caçador!",
        ],
        plains: [
            "Você pisa em algo — um mecanismo antigo range e dispara!",
            "Espinhos surgem da grama em um padrão deliberado!",
            "Uma cova camuflada se abre sob seus pés! Lascas pontiagudas!",
            "Fios quase invisíveis cruzam o caminho — armadilha de caravana!",
        ],
        swamp: [
            "Areia movediça! O pântano te puxa cada vez mais para baixo!",
            "Esporos tóxicos explodem de fungos ao serem pisados!",
            "Cipós venenosos se contraem ao toque, prendendo sua mão!",
            "Gás pútrido escapa de uma bolha na lama — queima os olhos!",
        ],
        cave: [
            "O chão desmorona revelando um fosso repleto de estalagmites!",
            "Gás venenoso escapa de uma fenda com um sibilo agudo!",
            "Cristais explodem em estilhaços cortantes ao menor tremor!",
            "Uma rocha cai do teto — o impacto revela mais fendas instáveis!",
        ],
        desert: [
            "A areia colapsa! Um buraco de areia movediça se abre!",
            "Espinhos de cacto voam disparados por uma rajada súbita!",
            "O calor refletido por cristais enterrados queima seus olhos!",
            "Uma placa de arenito cede e lâminas de pedra surgem!",
        ],
        mountain: [
            "A trilha desmorona sob seus pés revelando o abismo!",
            "Uma rocha balança perigosamente — e mais pedras se soltam!",
            "Gelo fino esconde uma fenda profunda na encosta!",
            "Pedregulhos soltos formam uma cascata mortal ao seu toque!",
        ],
        snow: [
            "O gelo racha! Águas geladas mortais logo abaixo!",
            "Uma avalanche de neve começa — a encosta inteira se move!",
            "Estacas de gelo se soltam do teto da caverna de gelo!",
            "A neve cede revelando uma fenda glacial de metros de profundidade!",
        ],
        volcanic: [
            "O chão se abre e lava borbulha em jatos incandescentes!",
            "Gases vulcânicos sulfúricos envolvem você — quase não respira!",
            "Cristais de obsidiana explodem com o calor, lançando estilhaços!",
            "Uma poça de magma camuflada por cinzas quase engole seu pé!",
        ],
        graveyard: [
            "O chão da cripta cede sob o peso dos séculos!",
            "Uma maldição invisível envolve o ar — seus músculos congelam!",
            "Lâminas enferrujadas disparam da parede de um sarcófago antigo!",
            "Runas funerárias brilham e uma onda de energia fria te atinge!",
        ],
    },
    hidden: {
        forest: [
            "Algo brilha entre as raízes de um carvalho ancestral...",
            "Um reflexo metálico cintila na folhagem úmida ao lado da trilha.",
            "Cogumelos luminescentes formam uma trilha até um ponto específico...",
            "Um pássaro pousa em uma pedra e voa — revelando algo embaixo.",
        ],
        plains: [
            "A brisa revela algo escondido na grama alta e dourada...",
            "Uma marca no chão indica escavação recente entre as flores.",
            "Pedras empilhadas com propósito marcam algo enterrado aqui.",
            "O reflexo do sol em um objeto metálico atrai seu olhar.",
        ],
        swamp: [
            "Algo flutua na poça à sua frente, brilhando fracamente...",
            "Um brilho esverdeado sob a lama chama sua atenção...",
            "Raízes de mangue envolvem algo que não pertence à natureza.",
            "Bolhas sobem de um ponto específico — algo afundou ali.",
        ],
        cave: [
            "Algo cintila na parede escura da caverna, como uma estrela...",
            "Uma corrente de ar morno traz um cheiro doce e metálico.",
            "Veios de minério reluzem na rocha ao redor de algo enterrado.",
            "Fungos bioluminescentes formam um círculo ao redor de um nicho.",
        ],
        desert: [
            "A areia brilha em um ponto específico sob o sol escaldante...",
            "O vento forte expõe algo enterrado há séculos nas dunas.",
            "Um escaravelho dourado pousa repetidamente no mesmo lugar...",
            "Fragmentos de cerâmica emergem da areia, decorados com ouro.",
        ],
        mountain: [
            "Uma fenda na rocha tem algo preso dentro, reluzente...",
            "Gelo derretido pela primavera revela um objeto preservado.",
            "Quartzo cristalino brilha ao lado de algo que não é natural.",
            "Uma gruta rasa esconde algo envolvido em peles curtidas.",
        ],
        snow: [
            "Algo escuro se destaca contra a neve branca imaculada...",
            "O gelo transparente preservou algo intacto por eras.",
            "Pegadas na neve levam a um monte suspeitamente irregular.",
            "A luz do sol revela um brilho azulado sob a camada de gelo.",
        ],
        volcanic: [
            "Cristais raros brilham entre as cinzas vulcânicas escuras...",
            "A lava solidificou ao redor de algo, criando um molde perfeito.",
            "Obsidiana polida naturalmente reflete algo escondido na fenda.",
            "Minerais raros afloram de uma fissura recém-aberta pelo tremor.",
        ],
        graveyard: [
            "Uma lápide tem um compartimento oculto mal disfarçado...",
            "Algo brilha na cova parcialmente aberta pela erosão.",
            "Oferendas intactas cercam uma tumba — e algo mais valioso.",
            "O musgo foi removido recentemente de uma inscrição reveladora.",
        ],
    },
    sound: {
        forest: [
            "Um rugido ecoa pela floresta. Silêncio mortal se segue.",
            "Galhos quebram ao longe em ritmo rápido — algo se aproxima.",
            "Corvos decolam em pânico. Algo perturbou a mata.",
            "O uivo de um lobo solitário ecoa, mais perto do que deveria.",
        ],
        plains: [
            "Um uivo distante corta o silêncio dos campos abertos.",
            "Trovão em céu limpo. Antinatural. Seu instinto grita perigo.",
            "O som de cascos no horizonte — galopando na sua direção.",
            "O vento traz ecos de metal batendo em metal. Combate próximo.",
        ],
        swamp: [
            "Um gurgulho profundo vem das águas pantanosas turvas.",
            "Sapos param de coaxar. Todos ao mesmo tempo. De repente.",
            "Algo grande se move sob as águas com um chapinhar ritmado.",
            "Um gemido borbulhante ecoa entre os juncos encharcados.",
        ],
        cave: [
            "Um estrondo ecoa pelos túneis, reverberando infinitamente.",
            "Algo arrasta pesadamente no escuro, muito além da sua tocha.",
            "Pingos de água param. Silêncio absoluto. Depois... arranhões.",
            "Ecos distorcidos retornam seus passos — mas com ritmo diferente.",
        ],
        desert: [
            "O vento traz um lamento distante, como almas perdidas no calor.",
            "Areia sibila como se estivesse viva, formando espirais ao seu redor.",
            "Um estalo seco ecoa — ossos de algo grande enterrado na areia.",
            "O silêncio do deserto é rompido por um sibilo subterrâneo.",
        ],
        mountain: [
            "Pedras desmoronam ao longe. Ou talvez mais perto do que parece.",
            "Um grito ecoa entre os picos, distorcido pelo vento cortante.",
            "O rugido do vento nas passagens soa como uma voz antiga.",
            "Rochas rangem umas contra as outras — algo se move na encosta.",
        ],
        snow: [
            "O silêncio da neve é quebrado por um uivo feroz e próximo.",
            "Gelo estala ritmicamente, como passos pesados se aproximando.",
            "O vento traz um som que não deveria existir — uma melodia triste.",
            "Algo range sob a neve congelada, cada vez mais audível.",
        ],
        volcanic: [
            "A terra treme brevemente. O chão estala sob seus pés.",
            "Um rugido sobe do interior da montanha como uma fera acordando.",
            "Gêiseres ativam em sequência, cada vez mais perto de você.",
            "O borbulhar da lava muda de tom — algo grande se moveu lá dentro.",
        ],
        graveyard: [
            "Sussurros incompreensíveis enchem o ar gelado entre as tumbas.",
            "Uma risada distante, fria e sem corpo ecoa do nada.",
            "Ossos rangem dentro de uma cripta fechada. Não deviam se mover.",
            "Um coro fantasmagórico sussurra seu nome entre as lápides.",
        ],
    },
};

// --- Type short→full mappings ---
const _POI_TYPE_MAP = {dis: 'discovery', sea: 'search', mys: 'mystery', dan: 'danger'};
const _ENC_TYPE_MAP = {amb: 'ambush', trp: 'trap', hid: 'hidden', snd: 'sound'};

function lookupPOINarr(typeShort, biome, idx) {
    const fullType = _POI_TYPE_MAP[typeShort];
    if (!fullType || idx == null || idx < 0) return null;
    const pool = (POI_NARRATIONS[fullType] || {})[biome]
              || (POI_NARRATIONS[fullType] || {}).forest;
    return (pool && idx < pool.length) ? pool[idx] : null;
}

function lookupEncNarr(typeShort, biome, idx) {
    const fullType = _ENC_TYPE_MAP[typeShort];
    if (!fullType || idx == null || idx < 0) return null;
    const pool = (ENCOUNTER_NARRATIONS[fullType] || {})[biome]
              || (ENCOUNTER_NARRATIONS[fullType] || {}).forest;
    return (pool && idx < pool.length) ? pool[idx] : null;
}
