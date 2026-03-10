// ═══════════════════════════════════════════════════════
// NARRATION DATA — local lookup tables
// Mirrors backend map_poi_narrations.py + map_generator.py
// Narrations are resolved client-side to save URL payload space.
// Narration pools for explore webapp POI events.
// ═══════════════════════════════════════════════════════

// --- DM Intro (per biome, with '|' page breaks) ---
const DM_INTROS = {
    forest: "Galhos estalam sob seus pés enquanto a luz do sol se filtra pelas copas das árvores antigas. O aroma de musgo e terra úmida envolve você como um abraço da própria floresta.|Pássaros silenciam à sua passagem. A mata observa, julgando se você é amigo ou intruso.",
    plains: "O vento sopra livre e incessante, trazendo o cheiro de grama selvagem e o som distante de trovões além do horizonte.|O campo se estende infinito. Aqui, nada se esconde — mas a vastidão tem seus próprios perigos.",
    swamp: "O ar úmido e pesado envolve você como uma mortalha quente. Cada passo afunda na lama escura enquanto a névoa limita sua visão a poucos metros.|Sons guturais ecoam nas águas paradas. O pântano está vivo — e observa.",
    cave: "A escuridão te engole por completo. Apenas o eco distorcido dos seus passos e o pingar constante de água quebram o silêncio opressivo.|O ar é frio e mineral. Você sente o peso de toneladas de rocha sobre sua cabeça.",
    desert: "O sol castiga sem piedade. Dunas douradas se estendem até onde a vista alcança, ondulando no calor como um oceano congelado no tempo.|Sua sombra é sua única companhia. O silêncio do deserto é ensurdecedor.",
    mountain: "O vento gélido corta seu rosto enquanto pedras soltas rangem sob seus pés no caminho íngreme. O ar rarefeito faz cada respiração um esforço.|Nuvens passam abaixo de você. A montanha testa quem ousa escalá-la.",
    snow: "O frio penetra até os ossos. Tudo é branco e silencioso até onde a vista alcança, uma vastidão imaculada que esconde seus segredos sob camadas de gelo.|Cada respiração forma cristais no ar. O inverno é belo — e mortal.",
    volcanic: "O calor é sufocante e implacável. Rios de lava brilham ao longe como veias da terra e o chão treme sob seus pés a cada erupção menor.|O ar cheira a enxofre e metal fundido. Poucos se aventuram aqui — e menos voltam.",
    graveyard: "Lápides cobertas de musgo emergem da névoa como dentes de uma criatura adormecida. Sussurros distantes e indecifráveis enchem o ar gelado.|O silêncio aqui é diferente — respeitoso, pesado. Os mortos têm suas próprias histórias.",
};
const DM_DANGER_EXT = {
    5: " O perigo é palpável — cada sombra pode esconder uma ameaça mortal. Seu corpo inteiro grita para voltar.",
    3: " Seu instinto diz para ficar alerta. Algo não está certo neste lugar.",
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
            "Raios de sol filtram pelas copas e iluminam uma clareira coberta de musgos vibrantes. O ar aqui é diferente — mais denso, mais antigo.|Você se ajoelha para examinar o solo. Entre as raízes, pequenas flores azuis pulsam com uma luminosidade tênue, como se guardassem um segredo.",
            "Cogumelos luminescentes formam um anel perfeito entre raízes ancestrais. Cada um pulsa com uma luz azulada e suave, como velas de um ritual esquecido.|Algo nesse círculo parece intencional. A natureza não costuma ser tão simétrica. Ao centro, uma marca no solo sugere que algo foi enterrado ali.",
            "Uma nascente borbulha entre pedras cobertas de musgo, sua água tão cristalina que você pode ver cada seixo no fundo.|O som da água corrente traz uma paz inesperada. Mas ao olhar mais de perto, você nota algo brilhando entre as pedras submersas.",
            "Pegadas finas, quase invisíveis, marcam o chão úmido. Alguém passou por aqui recentemente — alguém leve e silencioso.|As pegadas terminam diante de uma árvore imponente. Runas entalhadas na casca pulsam com um brilho esverdeado fraco. Você sente que algo o observa.",
            "Um ninho de falcão abandonado contém penas iridescentes e restos de couro.",
            "Flores roxas raras crescem ao redor de um totem de madeira entalhada.",
            "Trepadeiras formam um arco natural sobre uma clareira banhada por luz dourada.",
            "Marcas de garras profundas em um tronco indicam o território de algo grande.",
            "Uma teia de aranha gigante brilha com orvalho, cada fio uma joia natural.",
            "Frutas carmesim pendem de galhos baixos, seu aroma doce enchendo o ar.",
            "Um riacho serpenteia entre pedras cobertas de musgo fosforescente.",
            "Raízes entrelaçadas formam uma escada natural descendo para a escuridão.",
        ],
        plains: [
            "O vento sopra forte e revela uma pedra semienterrada na grama. Inscrições cobrem sua superfície, desgastadas pelo tempo mas ainda legíveis.|Você se aproxima e traça os símbolos com os dedos. São marcas de uma civilização que habitou estas planícies séculos atrás.",
            "Um campo de flores selvagens se estende até o horizonte, pintando a paisagem de roxo e dourado. O perfume é quase intoxicante.|Ao caminhar entre as hastes altas, algo metálico brilha ao nível do solo. As flores parecem ter crescido ao redor de um objeto deliberadamente.",
            "Rodas de carroça deixaram sulcos fundos na terra mole. Alguém passou por aqui com pressa, abandonando suprimentos pelo caminho.|Entre a grama alta, você encontra caixas de madeira entreabertas. O conteúdo está intacto — quem quer que fosse, tinha mais medo do que ganância.",
            "Uma colina oferece vista panorâmica — e um marco antigo no topo.",
            "Ossos de um animal grande marcam um antigo campo de caça.",
            "Uma torre de pedra solitária ergue-se no campo, sem porta ou janela visível.",
            "Flores de fogo alaranjadas balançam ao vento, liberando pólen cintilante.",
            "Um círculo de terra escura marca onde uma fogueira ardeu por séculos.",
            "Trilhas de animais convergem para um ponto — algo os atrai ali.",
            "Uma árvore solitária no meio do campo tem raízes expostas como tentáculos.",
        ],
        swamp: [
            "Uma poça brilha com um verde fosforescente intenso, seu reflexo dançando nas árvores ao redor. O cheiro é adocicado, quase hipnótico.|Bolhas sobem lentamente à superfície, cada uma carregando um brilho próprio. Este lugar tem algo de sobrenatural — belo e perigoso em partes iguais.",
            "Raízes de mangue se entrelaçam formando um arco natural majestoso sobre as águas paradas. Parece uma porta feita pela própria natureza.|Ao passar sob o arco, o ar muda. Mais frio, mais úmido. Do outro lado, a vegetação é diferente — mais antiga, mais densa. Algo se esconde aqui.",
            "Libélulas gigantes voam em círculos ao redor de orquídeas raras e luminosas.",
            "Uma trilha seca emerge da lama, marcada por pegadas de garras grandes.",
            "Musgo brilhante cobre troncos caídos, emanando um calor suave ao toque.",
            "Vaga-lumes formam espirais hipnóticas sobre as águas escuras e paradas.",
            "Uma árvore petrificada ergue-se como um monumento em meio à lama.",
            "Nenúfares gigantes flutuam como plataformas sobre a água turva.",
            "O ar fica denso e doce ao redor de flores carnívoras que se movem.",
            "Uma ponte de troncos caídos conecta ilhotas de terra seca no pântano.",
        ],
        cave: [
            "Cristais azulados crescem nas paredes como veias de luz na escuridão. Cada um pulsa com um ritmo próprio, quase como uma respiração.|Você estende a mão e toca um cristal. Ele vibra sob seus dedos e emite um som grave, como um sino distante. A caverna inteira parece responder.",
            "A passagem se alarga repentinamente e você se vê em uma câmara imensa. Estalactites centenárias pendem do teto como candelabros de pedra.|Gotas de água mineral caem em uma poça cristalina, cada impacto criando ondas que refletem a luz dos cristais nas paredes. O silêncio aqui é sagrado.",
            "Fungos luminosos cobrem o teto como estrelas subterrâneas.",
            "Um veio de minério cintila na parede, parcialmente exposto pela erosão.",
            "Pinturas rupestres retratam criaturas desconhecidas e rituais esquecidos.",
            "Uma cachoeira subterrânea cria um arco-íris permanente na escuridão.",
            "Formações de sal cristalizado brilham como diamantes nas paredes.",
            "Um lago subterrâneo reflete o teto como um espelho perfeito e imóvel.",
            "Colunas naturais de estalagmites e estalactites formam um salão de pedra.",
            "Correntes de ar trazem cheiros de superfície — uma saída próxima talvez.",
        ],
        desert: [
            "Entre as dunas sem fim, uma mancha verde aparece como uma miragem — mas esta é real. Uma palmeira solitária se ergue sobre uma poça de água cristalina.|Você se ajoelha e bebe. A água é fresca e pura, impossível neste calor. A sombra da palmeira traz alívio imediato. Algo neste oásis parece protegido.",
            "O vento afastou a areia de estruturas antigas. Paredes de arenito vermelho emergem como ossos de um gigante, fragmentos de cerâmica espalhados ao redor.|Você reconhece padrões nas cerâmicas — símbolos de proteção, talvez. Quem quer que tenha vivido aqui, tentou manter algo afastado.",
            "Um cacto medicinal raro floresce sob o sol escaldante, suas flores carmesim brilhando.",
            "Fósseis expostos pela erosão revelam criaturas de uma era esquecida.",
            "Uma pedra polida pelo vento forma uma lente natural que concentra luz.",
            "Rochas empilhadas por ventos milenares formam arcos naturais majestosos.",
            "Uma flor do deserto abre suas pétalas apenas sob a luz da lua cheia.",
            "Pegadas fossilizadas na rocha contam histórias de criaturas extintas.",
            "Uma formação rochosa cria sombra permanente — oásis de frescor no calor.",
            "Cristais de halita emergem do solo como dentes de um animal gigante.",
        ],
        mountain: [
            "Água gelada jorra de uma fenda na rocha com força surpreendente. O riacho serpenteia brevemente antes de desaparecer sob uma camada de neve.|O gelo ao redor da nascente forma cristais de formas impossíveis. A temperatura aqui é mais baixa que nos arredores — algo antinatural.",
            "Ervas alpinas raras crescem em uma fenda protegida do vento cortante. Suas folhas prateadas brilham como metal e exalam um aroma medicinal intenso.|Ao colher com cuidado, você nota raízes que se entrelagam com cristais de quartzo. A planta parece nutrir-se da própria montanha.",
            "Um ninho de águia abandonado contém penas e pequenas gemas de quartzo.",
            "Uma gruta natural oferece abrigo e contém restos de uma fogueira antiga.",
            "A vista do pico revela vales distantes e caminhos esquecidos.",
            "Uma cachoeira congelada forma cortinas de gelo que brilham ao sol.",
            "Cabras montesas observam do alto — guardiãs silenciosas da trilha.",
            "Um altiplano escondido entre picos oferece vista para vales infinitos.",
            "Liquens coloridos cobrem a rocha como uma tapeçaria natural viva.",
            "Cristais de ametista brotam de uma fenda na encosta íngreme.",
        ],
        snow: [
            "Um lago congelado perfeitamente transparente se estende diante de você. Pedras coloridas no fundo criam um mosaico natural sob a camada de gelo.|Ao se aproximar da borda, o gelo range baixinho. Formas escuras se movem nas profundezas — peixes congelados no tempo, ou talvez algo mais.",
            "Pegadas frescas na neve formam uma trilha solitária que se perde entre os pinheiros. Quem quer que tenha passado, estava com pressa.|As pegadas terminam junto a uma cova rasa coberta de galhos. Dentro, provisões cuidadosamente embrulhadas foram preservadas pelo frio — um esconderijo de viajante.",
            "Aurora boreal ilumina a neve, revelando padrões que parecem runas naturais.",
            "Um pinheiro milenar resiste à tempestade, seus galhos cobertos de cristais de gelo.",
            "Uma caverna de gelo reflete luz em arco-íris hipnotizantes.",
            "Uma raposa polar observa de longe, branca como a neve que a cerca.",
            "Gelo esculpido pelo vento forma figuras que parecem dançarinas imóveis.",
            "Um pinheiro coberto de neve tem formato perfeito como um sino gigante.",
            "Pegadas de urso no gelo indicam que você não está sozinho aqui.",
            "Cristais de neve gigantes cobrem o chão como joias espalhadas.",
        ],
        volcanic: [
            "Um gêiser erupciona em intervalos regulares, lançando colunas de vapor que cheiram a enxofre e minerais antigos. O calor é reconfortante neste terreno hostil.|Entre as fendas ao redor, cristais de enxofre amarelo formam padrões geométricos impossíveis. O chão treme levemente — a terra respira aqui.",
            "Obsidiana negra como a noite se projeta da rocha vulcânica em lâminas afiadas. Sua superfície é tão polida que reflete seu rosto distorcido.|Ao examinar as formações, você nota que algumas lâminas foram quebradas deliberadamente. Alguém esteve aqui antes — colhendo a pedra para armas.",
            "Uma fonte termal borbulha com água morna rica em propriedades curativas.",
            "Cinza vulcânica fértil nutre um arbusto solitário com frutos estranhos.",
            "Cristais de fogo crescem em uma fenda, pulsando com calor interno.",
            "Minerais coloridos formam veios brilhantes na rocha escura e quente.",
            "Uma fenda emite vapor que cheira a enxofre e metal fundido.",
            "Rochas vulcânicas formam torres naturais como sentinelas petrificadas.",
            "Um rio de lava solidificada cria uma trilha negra e brilhante.",
            "Gêiseres menores borbulham ritmicamente como a respiração da montanha.",
        ],
        graveyard: [
            "Uma lápide de mármore branco se destaca entre as demais, surpreendentemente legível apesar dos séculos. Versos elegantes contam a história de um guerreiro que caiu protegendo os inocentes.|Flores frescas foram depositadas na base — alguém ainda se lembra. Ao lado da lápide, a terra parece ter sido revolvida recentemente.",
            "Um buquê de flores brancas e roxas decora um túmulo antigo, suas pétalas ainda úmidas de orvalho. Alguém esteve aqui esta manhã.|O nome na lápide está ilegível, mas o cuidado do visitante sugere um vínculo profundo. Entre as flores, algo metálico brilha — uma oferenda junto às pétalas.",
            "Uma estátua de anjo chora lágrimas que brilham à luz da lua.",
            "Oferendas intactas cercam um altar funerário coberto de musgo.",
            "Uma cripta entreaberta revela um interior iluminado por velas eternas.",
            "Uma árvore morta tem galhos que parecem braços suplicando ao céu.",
            "Névoa rasteira cobre o chão, ocultando lápides e raízes expostas.",
            "Um mausoléu de mármore branco destoa da escuridão ao redor.",
            "Velas flamejam sem cera em um altar esquecido entre as tumbas.",
            "Corvos observam em silêncio absoluto — juízes imóveis da morte.",
        ],
    },
    search: {
        forest: [
            "Um tronco oco emite sons arranhados e insistentes do seu interior escuro. Você se agacha para investigar, o coração acelerando.|Olhos brilham na escuridão do tronco — pequenos, mas cautelosos. Uma criatura observa você com inteligência animal, protegendo algo atrás de si.",
            "Raízes expostas de uma árvore gigante formam um dossel natural sobre uma depressão no solo. O chão abaixo é macio, coberto de folhas secas.|Ao escavar gentilmente, seus dedos encontram algo duro e liso. Não é uma pedra — a superfície é trabalhada demais. Alguém escondeu isso aqui.",
            "Uma pedra marcada com um X antigo se destaca entre o musgo.",
            "Galhos quebrados indicam que algo foi arrastado recentemente por aqui.",
            "Cascas de árvore empilhadas indicam acampamento recente.",
            "Um buraco de animal tem brilho metálico em seu interior escuro.",
        ],
        plains: [
            "Ruínas baixas de pedra escondem compartimentos sob lajes soltas.",
            "Um poço abandonado tem algo brilhando no fundo escuro.",
            "Uma carroça tombada ainda contém baús semi-intactos.",
            "Pedras empilhadas marcam um esconderijo improvisado.",
            "Sulcos na terra indicam que algo pesado foi arrastado e abandonado.",
            "Uma depressão circular no campo parece artificial.",
        ],
        swamp: [
            "Bolhas de gás escapam da lama ao redor de um objeto semi-submerso.",
            "Cipós entrelaçados formam uma rede que prende algo brilhante.",
            "Uma carcaça encalhada de barco esconde compartimentos intactos.",
            "Troncos submersos escondem cavidades cheias de surpresas.",
            "Uma jangada abandonada tem compartimentos selados com resina.",
            "Pegadas na lama levam a um monte de folhas arrumado.",
        ],
        cave: [
            "Uma fenda estreita na parede deixa passar uma corrente de ar constante e morno. O vento que vem de dentro cheira a mineral e água subterrânea.|Você ilumina a abertura. A fenda se alarga alguns metros à frente, revelando o que parece ser uma câmara oculta. Algo brilha lá dentro.",
            "Um nicho na rocha contém objetos envolvidos em panos velhos.",
            "Ossos antigos ao lado de uma mochila corroída chamam sua atenção.",
            "Água gotejando criou uma poça cristalina com algo no fundo.",
            "Marcas de picareta na parede indicam mineração abandonada.",
            "Uma corrente de ar quente vem de uma fissura avermelhada.",
        ],
        desert: [
            "Areia revolvida indica que algo foi enterrado aqui recentemente.",
            "Um baú semi-enterrado surge após o vento mover as dunas.",
            "Pedras esculpidas formam um esconderijo camuflado na paisagem.",
            "Rastros de roedores convergem para uma toca com brilho metálico.",
            "Um montículo de areia tem forma geométrica — algo enterrado.",
            "Fragmentos de vidro vulcânico indicam comércio antigo nesta rota.",
        ],
        mountain: [
            "Uma trilha desmoronada revela uma passagem secreta na rocha.",
            "Uma fenda na rocha contém sacos de couro preservados.",
            "Um acampamento abandonado tem equipamento deixado às pressas.",
            "Pedregulhos soltos escondem uma cavidade com suprimentos.",
            "Um cairn de pedras marca algo — mensagem de viajantes.",
            "Musgo arrancado revela símbolos entalhados na rocha.",
        ],
        snow: [
            "Um monte de neve tem forma suspeita — algo foi coberto aqui.",
            "Gelo translúcido preserva objetos visíveis mas inalcançáveis... quase.",
            "Um abrigo soterrado tem a entrada parcialmente exposta.",
            "Troncos cobertos de neve escondem fardos de viajantes perdidos.",
            "Marcas de treno na neve levam a um abrigo colapsado.",
            "Uma luva congelada aponta para algo sob a neve compactada.",
        ],
        volcanic: [
            "Uma fenda fumegante tem brilho metálico em suas paredes internas.",
            "Rocha derretida solidificou ao redor de objetos, criando um molde natural.",
            "Fragmentos de cristal vulcânico emergem de uma cratera menor.",
            "Uma estrutura calcinada mantém um cofre de ferro ainda intacto.",
            "Cinzas acumuladas formam um monte sobre algo rígido embaixo.",
            "Uma rachadura recente libera vapor e revela cavidades internas.",
        ],
        graveyard: [
            "Uma cova revolvida expõe um baú de madeira reforçado com ferro.",
            "Um ossuário antigo tem compartimentos ocultos atrás das paredes.",
            "Uma tumba profanada revela passagens secretas sob o mármore.",
            "Um caixão exposto pela erosão contém mais que restos mortais.",
            "Velas derretidas formam um caminho até uma cripta aberta.",
            "Raízes levantaram uma laje, revelando um compartimento abaixo.",
        ],
    },
    mystery: {
        forest: [
            "Um brilho esverdeado pulsa entre as árvores, como se a própria floresta respirasse.",
            "Runas luminosas aparecem na casca de um carvalho ancestral ao seu toque.",
            "Um círculo de cogumelos emite uma vibração que faz o ar tremer.",
            "Vozes distantes cantam em uma língua esquecida entre as folhas.",
            "Folhas caem em espiral invertida, desafiando a gravidade num ponto.",
            "Uma clareira pulsa com energia verde — árvores se curvam em reverência.",
        ],
        plains: [
            "Um pilar solitário ergue-se no meio do campo, coberto de símbolos que mudam com a luz.",
            "O vento carrega fragmentos de uma melodia impossível vinda de lugar nenhum.",
            "A grama forma espirais perfeitas ao redor de uma pedra que flutua levemente.",
            "O chão vibra em ondas concêntricas a partir de uma pedra rachada.",
            "Flores se abrem e fecham em ritmo, como se respirassem em sincronia.",
        ],
        swamp: [
            "Luzes fantasmagóricas dançam sobre as águas estagnadas, guiando e enganando.",
            "Seu reflexo na água parada não acompanha seus movimentos — ele sorri.",
            "Sussurros emergem da névoa, formando palavras quase compreensíveis.",
            "A água do pântano gira em redemoinho ao redor de uma luz submersa.",
            "Sapos coaxam em uníssono formando uma melodia hipnótica antiga.",
        ],
        cave: [
            "Ecos de suas pisadas voltam transformados em música, como se a caverna cantasse.",
            "Uma luz sem origem emana de uma fissura, projetando sombras impossíveis.",
            "Glifos antigos brilham na rocha quando você os toca, reagindo ao seu calor.",
            "Cristais pulsam em sequência como um coração de pedra batendo.",
            "A escuridão não é uniforme — manchas de sombra se movem com propósito.",
        ],
        desert: [
            "Uma miragem persiste mesmo quando você fecha os olhos — ela é real.",
            "Um obelisco solitário irradia calor sobrenatural que distorce o ar.",
            "Areia forma padrões geométricos sozinha, como se algo desenhasse de baixo.",
            "Grãos de areia flutuam formando símbolos no ar quente e parado.",
            "O horizonte se distorce num ponto específico como uma lente viva.",
        ],
        mountain: [
            "O vento uiva frases em uma língua antiga ao passar pelas fendas da rocha.",
            "Um altar de pedra natural emana uma energia que faz seus pelos se arrepiarem.",
            "A névoa se move contra o vento, envolvendo um ponto específico da trilha.",
            "Pedras flutuam acima do solo ao redor de um ponto magnético.",
            "O eco retorna suas palavras numa língua diferente da que você falou.",
        ],
        snow: [
            "A geada forma padrões que parecem mapas — ou talvez avisos.",
            "Um canto melódico ecoa na neve, vindo de todos os lados ao mesmo tempo.",
            "Um cristal de gelo flutua no ar, girando lentamente, pulsando com luz azul.",
            "A neve derrete em círculo perfeito apesar do frio intenso ao redor.",
            "Flocos de neve sobem ao invés de cair num raio de poucos metros.",
        ],
        volcanic: [
            "Uma chama arde sem combustível, fria ao toque mas que aquece a alma.",
            "Sussurros emergem da lava como bolhas, trazendo visões fugídias.",
            "Marcas de fogo aparecem no chão formando um círculo arcano pulsante.",
            "Chamas brotam da rocha em cores impossíveis — azul, verde, prata.",
            "A lava endurece e racha formando runas que brilham com luz própria.",
        ],
        graveyard: [
            "Uma vela acende-se sozinha sobre uma tumba, sua chama dança sem vento.",
            "Um nome brilha em uma lápide, mudando a cada vez que você desvia o olhar.",
            "Uma sombra sem corpo move-se entre as lápides com propósito.",
            "Flores negras crescem em velocidade antinatural ao redor de uma tumba.",
            "Uma brisa gelada sopra de dentro da terra — direção impossível.",
        ],
    },
    danger: {
        forest: [
            "Galhos se partem nas sombras. Olhos brilhantes observam da escuridão da mata.",
            "Um rosnado baixo ecoa entre as árvores. Algo se move nas moitas.",
            "Teias pegajosas cobrem o caminho. O predador está perto.",
            "O silêncio absoluto da floresta é o pior sinal — pássaros fugiram.",
            "Pegadas frescas na lama úmida levam diretamente na sua direção.",
        ],
        plains: [
            "A grama alta se move contra o vento. Algo se aproxima rapidamente.",
            "Pegadas frescas no solo úmido. O predador ainda está por perto.",
            "Um silêncio antinatural cai sobre o campo. Perigo iminente.",
            "Uma nuvem de poeira se ergue no horizonte — algo corre na sua direção.",
            "O solo treme ritmicamente como passos pesados se aproximando.",
        ],
        swamp: [
            "Bolhas sobem da lama escura. Olhos emergem da superfície pantanosa.",
            "O pântano gurgulha e algo grande se move sob as águas turvas.",
            "Um sibilo ameaçador vem de trás dos juncos encharcados.",
            "A névoa se adensa e formas escuras se movem em sua periferia.",
            "O cheiro de sangue paira no ar úmido — algo caçou aqui.",
        ],
        cave: [
            "Algo arranha as paredes na escuridão além do alcance da sua tocha.",
            "Um rugido cavernoso ecoa pelos túneis, cada vez mais próximo.",
            "Olhos brilham no teto da caverna — dezenas deles.",
            "Sua tocha vacila e projeta sombras que não correspondem a nada.",
            "Um cheiro ácido queima seu nariz — algo venenoso está próximo.",
        ],
        desert: [
            "A areia treme sob seus pés. Algo se move logo abaixo da superfície.",
            "Um ninho agitado revela criaturas agressivas protegendo seu território.",
            "A tempestade de areia esconde uma forma ameaçadora que se aproxima.",
            "O silêncio é rompido por um chiado ritmado — escamas em areia.",
            "Uma sombra se move contra a direção do sol — impossível, mas real.",
        ],
        mountain: [
            "Pedras rolam da encosta — ou foram empurradas. Algo espera nas alturas.",
            "Um covil escondido entre as rochas emana calor e cheiro de predador.",
            "A ponte de rocha instável tem marcas de garras. Não está desocupada.",
            "Cascalho rola de cima em cascata — algo grande na encosta.",
            "Um rugido ecoa entre os desfiladeiros, impossível de localizar.",
        ],
        snow: [
            "Pegadas enormes marcam a neve fresca. O que as fez está por perto.",
            "O gelo range e algo emerge da nevasca, olhos brilhando na escuridão.",
            "Uma fissura no gelo revela um covil ocupado. Olhos refletem sua luz.",
            "A nevasca se intensifica de repente — camuflagem para predadores.",
            "Marcas vermelhas na neve branca traçam um rastro sinistro.",
        ],
        volcanic: [
            "Chamas dançam em um padrão antinatural. Uma criatura de fogo materializa-se.",
            "O calor aumenta drasticamente. Algo se move entre as rochas incandescentes.",
            "Gases tóxicos disfarçam a criatura que espreita entre fendas vulcânicas.",
            "O calor do ar muda de direção — algo respira fogo nas proximidades.",
            "Pedras estalam e racham como se algo emergisse da própria rocha.",
        ],
        graveyard: [
            "A terra se move. Uma mão esquelética emerge da cova ao seu lado.",
            "Gemidos ecoam das tumbas abertas. Os mortos estão inquietos esta noite.",
            "Olhos espectrais brilham na escuridão entre as lápides rachadas.",
            "Um frio sobrenatural atinge seus ossos — presença maligna se aproxima.",
            "As lápides tremem enquanto algo se arrasta sob a terra.",
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
            "A areia explode como um gêiser marrom. Algo enorme se lança de baixo da superfície, areia cascateando de seu corpo blindado.|Mandíbulas enormes se abrem com um estalo. A criatura do deserto estava à espreita, sentindo as vibrações dos seus passos.",
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
            "A neve explode numa erupção branca. Algo perfeitamente camuflado se ergue — garras, pelo branco, olhos vermelhos de fúria.|A criatura rugia enquanto fragmentos de gelo caíam ao redor. Estava enterrada ali, esperando que algo passasse ao alcance.",
            "Figuras brancas saltam da nevasca como fantasmas de gelo!",
            "O uivo do vento mascara o rugido da criatura que se aproxima!",
            "Gelo se parte e uma besta paleolítica emerge faminta!",
        ],
        volcanic: [
            "Lava espirra em arcos incandescentes. Uma silhueta se ergue das chamas como se o fogo fosse seu berço — brasas em vez de olhos.|A criatura se move pela rocha derretida como se caminhasse sobre grama. O calor que emana dela é insuportável mesmo a distância.",
            "O chão racha e garras incandescentes surgem das fendas!",
            "Uma criatura de obsidiana se desprende da rocha derretida!",
            "Gases quentes anunciam a chegada de elementais furiosos!",
        ],
        graveyard: [
            "Mãos descarnadas rompem a terra e agarram seu pé com força sobrenatural. Dedos de osso se cravam na bota enquanto mais braços emergem.|O solo estremece ao redor. Não é um — são muitos. Os mortos deste lugar não descansam em paz.",
            "O ar gela instantaneamente. Sombras se desprendem das lápides e tomam forma — silhuetas escuras que flutuam sem som.|Um frio sobrenatural penetra seus ossos quando a primeira sombra passa através de você. A dor não é física — é algo pior.",
            "A terra se abre e mortos-vivos emergem com gemidos terríveis!",
            "Uma presença fantasmagórica materializa-se entre as lápides!",
        ],
    },
    trap: {
        forest: [
            "As folhas sob seus pés rangem e o chão desaparece. Você cai — e vê estacas afiadas se aproximando rapidamente.|A armadilha estava perfeitamente camuflada. Folhas, galhos e terra cobriam um fosso de dois metros com pontas de madeira endurecida.",
            "Cipós se movem como cobras vivas, fechando-se ao seu redor antes que você possa reagir. Não é natural — é uma armadilha!|A rede se aperta a cada movimento. Resistência só piora. Alguém montou isso com experiência de caçador.",
            "Espinhos envenenados disparam de um tronco oco quando você passa!",
            "Uma raiz se enrola em seu pé — armadilha de caçador!",
            "Dardos de madeira voam de buracos camuflados no tronco ao seu lado!",
            "Uma liana tensionada dispara uma pedra pesada na sua direção!",
        ],
        plains: [
            "Você pisa em algo — um mecanismo antigo range e dispara!",
            "Espinhos surgem da grama em um padrão deliberado!",
            "Uma cova camuflada se abre sob seus pés! Lascas pontiagudas!",
            "Fios quase invisíveis cruzam o caminho — armadilha de caravana!",
            "Uma pedra plana bascula e revela estacas afiadas logo abaixo!",
            "A grama esconde um laço de corda que prende seu tornozelo!",
        ],
        swamp: [
            "Areia movediça! O pântano te puxa cada vez mais para baixo!",
            "Esporos tóxicos explodem de fungos ao serem pisados!",
            "Cipós venenosos se contraem ao toque, prendendo sua mão!",
            "Gás pútrido escapa de uma bolha na lama — queima os olhos!",
            "Sanguessugas gigantes caem dos galhos ao sentirem seu calor!",
            "Um tronco submerso gira e te derruba na água turva!",
        ],
        cave: [
            "O chão de pedra se estilhaça sob seus pés com um estalo seco. Fragmentos caem no escuro — e ecoam por longos segundos antes de atingir o fundo.|Estalagmites afiadas como lanças se erguem do fosso lá embaixo. Um passo em falso e você teria sido empalado.",
            "Um sibilo agudo corta o silêncio da caverna. Gás esverdeado escapa de uma fenda na parede, expandindo-se rapidamente pelo corredor.|O cheiro é ácido e queima as narinas. Seus olhos lacrimejam e a tontura chega em ondas. Você precisa sair desta nuvem — agora.",
            "Cristais explodem em estilhaços cortantes ao menor tremor!",
            "Uma rocha cai do teto — o impacto revela mais fendas instáveis!",
            "Teias pegajosas e resistentes cobrem a passagem de ponta a ponta!",
            "Um alçapão de pedra se abre sob seus pés com um rangido!",
        ],
        desert: [
            "A areia colapsa! Um buraco de areia movediça se abre!",
            "Espinhos de cacto voam disparados por uma rajada súbita!",
            "O calor refletido por cristais enterrados queima seus olhos!",
            "Uma placa de arenito cede e lâminas de pedra surgem!",
            "Escorpiões irrompem da areia ao redor dos seus pés!",
            "Uma duna inteira desliza revelando ruínas afiadas sob a areia!",
        ],
        mountain: [
            "A trilha desmorona sob seus pés revelando o abismo!",
            "Uma rocha balança perigosamente — e mais pedras se soltam!",
            "Gelo fino esconde uma fenda profunda na encosta!",
            "Pedregulhos soltos formam uma cascata mortal ao seu toque!",
            "Uma cornija de pedra se despedaça ao primeiro passo!",
            "Vento cortante carrega fragmentos de rocha contra o seu rosto!",
        ],
        snow: [
            "O gelo racha sob seus pés com o som de vidro se partindo. Água negra e gelada é visível pelas fissuras que se espalham em estrela.|Cada segundo conta. A água abaixo é tão fria que mataria em minutos. O gelo range — você precisa redistribuir seu peso ou encontrar terreno firme.",
            "Uma avalanche de neve começa — a encosta inteira se move!",
            "Estacas de gelo se soltam do teto da caverna de gelo!",
            "A neve cede revelando uma fenda glacial de metros de profundidade!",
            "Uma camada de gelo fino se estilhaça e você afunda até a cintura!",
            "Cristais de gelo afiados se desprendem em rajada cortante!",
        ],
        volcanic: [
            "Uma fissura se abre no chão vulcânico com um rugido de rocha partida. Lava borbulha em jatos que cospem brasas ao seu redor.|O calor é instantâneo e sufocante. O río de magma se alarga a cada segundo, cortando sua rota de fuga.",
            "Gases vulcânicos sulfúricos envolvem você — quase não respira!",
            "Cristais de obsidiana explodem com o calor, lançando estilhaços!",
            "Uma poça de magma camuflada por cinzas quase engole seu pé!",
            "O solo range e uma coluna de vapor escaldante irrompe da fissura!",
            "Brasas vulcânicas rolam encosta abaixo na sua direção!",
        ],
        graveyard: [
            "O chão da cripta cede sob o peso dos séculos!",
            "Uma maldição invisível envolve o ar — seus músculos congelam!",
            "Lâminas enferrujadas disparam da parede de um sarcófago antigo!",
            "Runas funerárias brilham e uma onda de energia fria te atinge!",
            "Ossadas se erguem do chão formando estacas afiadas!",
            "Uma porta de tumba se fecha atrás de você com força sobrenatural!",
        ],
    },
    hidden: {
        forest: [
            "Algo brilha entre as raízes de um carvalho ancestral...",
            "Um reflexo metálico cintila na folhagem úmida ao lado da trilha.",
            "Cogumelos luminescentes formam uma trilha até um ponto específico...",
            "Um pássaro pousa em uma pedra e voa — revelando algo embaixo.",
            "Musgo foi arrancado recentemente de uma cavidade no tronco...",
            "Uma toca abandonada tem algo reluzente no fundo escuro.",
        ],
        plains: [
            "A brisa revela algo escondido na grama alta e dourada...",
            "Uma marca no chão indica escavação recente entre as flores.",
            "Pedras empilhadas com propósito marcam algo enterrado aqui.",
            "O reflexo do sol em um objeto metálico atrai seu olhar.",
            "Uma toca de raposa abandonada revela algo deixado para trás...",
            "Flores crescem em círculo perfeito ao redor de algo semienterrado.",
        ],
        swamp: [
            "Algo flutua na poça à sua frente, brilhando fracamente...",
            "Um brilho esverdeado sob a lama chama sua atenção...",
            "Raízes de mangue envolvem algo que não pertence à natureza.",
            "Bolhas sobem de um ponto específico — algo afundou ali.",
            "Um galho quebrado aponta para algo enroscado entre as raízes.",
            "Vaga-lumes se reúnem sobre um ponto na margem lamacenta...",
        ],
        cave: [
            "Algo cintila na parede escura da caverna, como uma estrela...",
            "Uma corrente de ar morno traz um cheiro doce e metálico.",
            "Veios de minério reluzem na rocha ao redor de algo enterrado.",
            "Fungos bioluminescentes formam um círculo ao redor de um nicho.",
            "Marcas de garras na parede terminam ao lado de uma fenda estreita...",
            "Gotas de água caem sobre algo metálico com um tinido rítmico.",
        ],
        desert: [
            "A areia brilha em um ponto específico sob o sol escaldante...",
            "O vento forte expõe algo enterrado há séculos nas dunas.",
            "Um escaravelho dourado pousa repetidamente no mesmo lugar...",
            "Fragmentos de cerâmica emergem da areia, decorados com ouro.",
            "A sombra de uma rocha esconde marcas de escavação recente...",
            "Um lagarto foge revelando algo parcialmente coberto pela areia.",
        ],
        mountain: [
            "Uma fenda na rocha tem algo preso dentro, reluzente...",
            "Gelo derretido pela primavera revela um objeto preservado.",
            "Quartzo cristalino brilha ao lado de algo que não é natural.",
            "Uma gruta rasa esconde algo envolvido em peles curtidas.",
            "Líquen foi raspado de uma pedra revelando símbolos e um nicho.",
            "Uma águia circunda repetidamente o mesmo ponto na encosta...",
        ],
        snow: [
            "Algo escuro se destaca contra a neve branca imaculada...",
            "O gelo transparente preservou algo intacto por eras.",
            "Pegadas na neve levam a um monte suspeitamente irregular.",
            "A luz do sol revela um brilho azulado sob a camada de gelo.",
            "Neve derretida ao redor de um objeto quente demais para congelar...",
            "Um abrigo de pedras empilhadas esconde algo dentro.",
        ],
        volcanic: [
            "Cristais raros brilham entre as cinzas vulcânicas escuras...",
            "A lava solidificou ao redor de algo, criando um molde perfeito.",
            "Obsidiana polida naturalmente reflete algo escondido na fenda.",
            "Minerais raros afloram de uma fissura recém-aberta pelo tremor.",
            "Cinzas quentes cobrem algo que brilha com luz própria...",
            "Uma formação de basalto tem uma cavidade artificial esculpida.",
        ],
        graveyard: [
            "Uma lápide tem um compartimento oculto mal disfarçado...",
            "Algo brilha na cova parcialmente aberta pela erosão.",
            "Oferendas intactas cercam uma tumba — e algo mais valioso.",
            "O musgo foi removido recentemente de uma inscrição reveladora.",
            "Uma estátua funerária segura algo que não faz parte da escultura...",
            "Raízes levantaram uma laje revelando um compartimento selado.",
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

// ═══════════════════════════════════════════════════════
// AMBIENT NARRATIONS (atmospheric moments, no choices)
// ═══════════════════════════════════════════════════════
const AMBIENT_NARRATIONS = {
    forest: [
        "Uma revoada de pássaros corta o céu acima das copas, seus cantos ecoando entre os troncos.|Você para por um momento. O silêncio que se segue é profundo, quase sagrado.",
        "Uma chuva fina começa a cair sem aviso, cada gota brilhando como cristal ao passar pelos raios de sol.|O cheiro de terra molhada preenche seus pulmões. A floresta parece respirar ao seu redor.",
        "Um cervo majestoso surge entre as árvores, seus chifres decorados com musgo. Ele o observa por um instante — e desaparece.|Algo naquele olhar parecia inteligente demais para um animal comum.",
        "O vento traz o som distante de sinos — nenhuma aldeia está perto o suficiente para explicá-los.|As notas metálicas se misturam com o farfalhar das folhas, criando uma melodia que arrepia.",
        "Raízes expostas formam um padrão no chão que parece quase intencional — círculos dentro de círculos.|Talvez seja apenas a natureza seguindo suas próprias regras. Ou talvez não.",
    ],
    plains: [
        "O horizonte se estende até onde a vista alcança, um mar dourado de gramíneas dançando ao vento.|Por um instante, você se sente pequeno diante da vastidão. Mas também livre.",
        "Uma águia solitaria circula no alto, sua sombra deslizando sobre o campo como um fantasma.|Ela grita uma vez — um som que parece anunciar algo. Então desaparece além das nuvens.",
        "O chão vibra sob seus pés — uma manada distânte galopando além do horizonte.|O trovão de cascos some tão rápido quanto surgiu, deixando apenas silêncio e poeira.",
        "Flores selvagens brotam em um círculo perfeito ao redor de uma pedra antiga.|O aroma é doce e incomum, como se as flores não pertençessem a esta estação.",
        "Uma torre de pedra em ruínas se ergue no horizonte, solitaria contra o céu vermelho do entardecer.|Quem a construiu? Para quê? As respostas se perderam com o tempo.",
    ],
    swamp: [
        "Bolhas emergem da lama com estálidos úmidos, liberando um gás que brilha brevemente na escuridão.|O pântano tem sua própria linguagem. Esses sons são avisos — ou convites.",
        "Vaga-lumes formam espirais hipnóticas sobre a água escura, suas luzes pulsando em unissonância.|Dizem que seguir as luzes do pântano é loucura. Mas a beleza é difícil de ignorar.",
        "Um tronco cai na água ao longe, quebrando o silêncio opressivo do pântano.|Nenúfares se agitam na onda resultante. Algo grande se move sob a superfície.",
        "O nevoeiro se adensa até que você mal vê três passos à frente.|Sons se distorcem na névoa — o que parece perto está longe, e o que parece longe pode estar ao seu lado.",
        "Uma orquídea rara floresce em um tronco apodrecido, sua beleza contrastando com a decadência ao redor.|A vida encontra um caminho, mesmo nos lugares mais esquecidos.",
    ],
    cave: [
        "Uma gota d’água cai do teto e ecoa pela caverna como um sino de cristal.|O eco se multiplica nas paredes, criando uma sinfonia involuntária de uma única nota.",
        "Cristais azulados pulsam nas paredes com uma luz própria, como se respirassem.|A escuridão entre eles parece mais profunda por contraste — quase viva.",
        "O chão treme brevemente — um lembrete de que esta montanha está viva, de um jeito geológico e lento.|Poeira fina cai do teto. O tremor passa tão rápido quanto veio.",
        "Um morcego cruza seu caminho como um fantasma silencioso e desaparece na escuridão.|Você quase pode sentir o ar deslocado por suas asas contra seu rosto.",
        "Uma câmara se abre revelando estalactites gigantes, cada uma pingando água cristalina em uma poça perfeita.|O reflexo na água é tão nítido que parece um portal para outro mundo.",
    ],
    desert: [
        "O sol se põe sobre as dunas, pintando o céu em tons de fogo e ouro.|Por um breve instante, o calor dá trégua e o deserto revela sua beleza austera.",
        "Uma miragem se forma no horizonte — árvores, água, sombra. Tudo mentira do calor.|Seu corpo sabe que é falso. Mas seus olhos insistem em acreditar.",
        "Um escorpião cruza a areia na sua frente, sua cauda erguida como um estandarte de aviso.|Ambos param. Ambos avaliam. O escorpião decide que você não vale o esforço.",
        "O vento esculpe a areia em ondas perfeitas, apagando seus rastros em minutos.|Nada permanece no deserto por muito tempo — nem pegadas, nem memórias.",
        "Estrelas começam a surgir antes mesmo do sol se pôr completamente, tão limpo é o céu.|A Via Láctea se desenha como um rio de luz sobre a imensidão árida.",
    ],
    mountain: [
        "O vento uiva entre os picos como um lobo ancestral, carregando cristais de gelo.|Aqui em cima, o mundo parece diferente — mais honesto, mais brutal, mais livre.",
        "Uma cabra montês observa você de um penhasco impossível, equilibrada onde nenhum humano poderia ficar.|Ela bale uma vez, como se zombasse da sua cautela, e salta para outro pico.",
        "Nuvens passam abaixo de você, criando a ilusão de que a montanha flutua.|Por um instante mágico, você está acima do mundo, acima das preocupações mortais.",
        "Uma águia pousa em uma rocha próxima, suas garras arranhando a pedra como aço.|Ela o observa com olhos dourados e antigos antes de abrir as asas e mergulhar no vale.",
        "A vista do pico revela vales, rios e florestas que se estendem até o infinito.|De aqui de cima, todas as distâncias parecem possíveis. Todos os caminhos, alcangáveis.",
    ],
    snow: [
        "Flocos de neve dançam ao redor como espíritos inquietos, cada um único e efêmero.|O mundo inteiro parece feito de silêncio e brancura — uma paz que beira o sobrenatural.",
        "Seus passos rangem na neve fresca, o único som em quilômetros.|Cada pegada é uma marca efêmera que a próxima nevasca apagará sem cerimônia.",
        "Uma aurora boreal se forma no céu, cortinas de verde e roxo ondulando como tecido divino.|Você para, hipnotizado. Nenhuma magia mortal poderia criar algo tão vasto e belo.",
        "O gelo estala sob seus pés com sons que lembram ossos quebrando.|A superfície parece sólida, mas cada estalo é um lembrete de que nada aqui é permanente.",
        "Uma raposa polar cruza seu caminho, branca como a neve que a cerca. Seus olhos negros brilham.|Ela para, te observa, e então desaparece como se nunca tivesse existido.",
    ],
    volcanic: [
        "O chão pulsa com calor, como se a terra tivesse um coração batendo logo abaixo.|Vapor escapa por fendas na rocha, trazendo o cheiro acre de enxofre e minérios fundidos.",
        "Um gêiser erupciona ao longe, lançando água fervente e vapor a metros de altura.|A demonstração de força é breve mas impressionante — a terra lembrando quem manda aqui.",
        "Rios de lava fluem ao longe como veias de fogo na carne escura da montanha.|A luz alaranjada pinta tudo ao redor, transformando a paisagem em um quadro infernal.",
        "Cinzas vulcânicas flutuam no ar como neve negra, cobrindo tudo em uma camada fina.|O mundo aqui parece estar eternamente entre a criação e a destruição.",
        "Uma flor de fogo brota de uma fenda na rocha quente, suas pétalas vermelhas brilhando.|Vida encontra um caminho mesmo no coração do vulcão.",
    ],
    graveyard: [
        "Um corvo pousa em uma lápide quebrada e o observa com olhos que parecem saber demais.|Ele grasna uma vez — um som que ecoa entre as tumbas como uma sentença.",
        "O névoa se arrasta entre os túmulos como dedos espectrais procurando algo perdido.|Nomes nas lápides estão apagados pelo tempo. Até a morte esquece, com o tempo suficiente.",
        "Uma vela acende sozinha dentro de uma cripta entreaberta, sua chama azulada tremulando.|Quem a acendeu? Não há sinais de presença viva nas redondezas.",
        "O chão frio emite um gemido quando você pisa — tubulações antigas sob as tumbas.|Ou talvez não sejam tubulações. Alguns sons não têm explicação confortável.",
        "Flores selvagens crescem em uma única tumba, a única com vegetação em todo o cemitério.|Alguém cuida desta. Ou algo cuida — as flores parecem frescas demais para este lugar.",
    ],
};

function lookupAmbientNarr(biome, idx) {
    const pool = AMBIENT_NARRATIONS[biome] || AMBIENT_NARRATIONS.forest;
    return (pool && idx != null && idx >= 0 && idx < pool.length) ? pool[idx] : null;
}
