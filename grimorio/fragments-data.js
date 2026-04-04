/* ═══════════════════════════════════════════════════════
   FRAGMENTOS DE VALDORIA — Dados dos Fragmentos

   EXTENSIBILIDADE: Para adicionar novo conteudo, basta
   adicionar objetos ao array FRAGMENTS. Nenhum outro
   arquivo precisa ser modificado.

   Para adicionar novo TIPO de fragmento, adicionar
   entrada ao objeto FRAGMENT_TYPES.
   ═══════════════════════════════════════════════════════ */

/* Tipos de fragmento (extensivel — adicione novos aqui) */
var FRAGMENT_TYPES = {
    diary:      { label: 'Diário',         icon: '\uD83D\uDCD6', font: 'Almendra' },
    prophecy:   { label: 'Profecia',       icon: '\uD83D\uDC41',  font: 'IM Fell English' },
    confession: { label: 'Confissão',      icon: '\uD83D\uDD6F',  font: 'Pirata One' },
    religious:  { label: 'Texto Sagrado',  icon: '\u26EA',         font: 'Cinzel' },
    letter:     { label: 'Carta',          icon: '\u2709',         font: 'MedievalSharp' },
    record:     { label: 'Registro',       icon: '\uD83D\uDCDC',  font: 'Cinzel' },
    strange:    { label: '???',            icon: '\u25C6',         font: 'MedievalSharp' }
};

/* Array de fragmentos (append-only — novos vao no final) */
var FRAGMENTS = [
    {
        id: 1,
        title: 'Primeiro Diário de Talric Cinéras \u2014 Entrada 47: O Local da Queda',
        type: 'diary',
        author: 'Talric Cinéras',
        era: 'Fundação',
        condition: 'aged',
        notes: 'Páginas adjacentes arrancadas. Marcas de unhas nas margens.',
        content: '<p>Cheguei ao vale na terceira lua do ciclo. O que encontrei não e possível descrever com a precisão que a ciência exige, e no entanto, devo tentar.</p>'
            + '<p>A cratera não é uma cratera. Não há sinais de impacto \u2014 nenhuma pedra deslocada, nenhuma árvore curvada pela força. O terreno simplesmente... <span class="faded">cede</span>. Como se a própria terra tivesse se afastado por vontade própria. Ou por medo.</p>'
            + '<p>No centro, nada. E no entanto, tudo. Um brilho dourado que <em>não é luz</em> \u2014 não projeta sombras, não aquece, não ilumina. Ele simplesmente está lá, como uma ideia que você não consegue esquecer.</p>'
            + '<p>Medi o diâmetro do vale: <span class="faded">trezentos e quarenta e dois</span> passos. Quando medi novamente pela manhã, eram <span class="faded">trezentos e cinquenta e sete</span>. O vale está crescendo. Ou eu estou encolhendo.</p>'
            + '<p>Nota para a próxima expedição: trazer mais <span class="erased">[...]</span>. O último assistente não voltou da margem norte. Não encontramos rastros. Não encontramos nada.</p>'
    },
    {
        id: 2,
        title: 'Mapas de Erindor Calamus \u2014 Anotação sobre a Regiao que Não Deveria Existir',
        type: 'diary',
        author: 'Erindor Calamus',
        era: 'Fundação',
        condition: 'stained',
        notes: 'Manchas de tinta cobrem parte do mapa referênciado.',
        content: '<p>Mapeei cada rio, cada colina, cada trilha deste continente. Conheco a terra como um pai conhece as linhas do rosto de seus filhos. E no entanto.</p>'
            + '<p>Há uma região entre <span class="erased">[...]</span> e <span class="erased">[...]</span> que não deveria existir. Não aparece nos mapas antigos. Não aparece nos mapas de ninguém além de mim. Quando mostro meus registros a outros cartografos, eles não veem nada. Apontam para o espaço em branco e dizem: "Aqui? Não há nada aqui."</p>'
            + '<p>Mas eu estive lá. Caminhei por <span class="faded">tres dias</span> em uma floresta que nenhum lenhador conhece. Vi ruinas que nenhum históriador registrou. E no centro de tudo, uma clareira perfeitamente circular onde a grama cresce em espiral, sempre em direção ao centro.</p>'
            + '<p>No centro, uma marca no chão. Circular. Dourada. Como se alguém tivesse pressionado uma esfera imensa contra a terra e a terra tivesse guardado a memória.</p>'
            + '<p>Voltei ao acampamento e desenhei o mapa. Na manhã seguinte, a região era maior do que na noite anterior. Na terceira visita, encontrei <span class="erased">[...]</span> \u2014 e nunca mais voltei.</p>'
    },
    {
        id: 3,
        title: 'Notas de Irmão Cenavar \u2014 Decimo-Terceiro Templo: As Pecas Não Encaixam',
        type: 'diary',
        author: 'Irmão Cenavar',
        era: 'Expansão',
        condition: 'aged',
        notes: null,
        content: '<p>Treze templos. Treze versoes diferentes da mesma história. Nenhuma e mentira. Nenhuma e verdade.</p>'
            + '<p>No primeiro templo, disseram-me que a Esfera foi criada por Aurivath como presente para o mundo que nascia. No quinto, que Aurivath <em>e</em> a Esfera. No nono, que Aurivath nunca existiu e a Esfera sempre esteve aqui. No decimo-segundo, que a Esfera não existe e nunca existiu.</p>'
            + '<p>Passei quarenta anos caminhando entre santuarios, coletando cada fragmento, cada prece, cada sussurro de velho sacerdote. Acreditei que, ao juntar todas as pecas, veria o todo.</p>'
            + '<p>Não vejo.</p>'
            + '<p>As pecas não formam um mosaico. Elas formam <span class="faded">algo que não tem forma</span> \u2014 como tentar montar um quebra-cabeça cujas pecas pertencem a jogos diferentes. Ou pior: como se as pecas mudassem de forma cada vez que você as toca.</p>'
            + '<p>Começo a suspeitar de algo terrível: não e que a verdade esteja escondida. E que a verdade não quer ser encontrada. Ou que não existe verdade alguma \u2014 apenas o ato de procurar, que por si só alimenta <span class="erased">[...]</span>.</p>'
    },
    {
        id: 4,
        title: 'Segundo Diário de Talric Cinéras \u2014 Entrada 203: Contradição',
        type: 'diary',
        author: 'Talric Cinéras',
        era: 'Fundação',
        condition: 'burned',
        notes: 'Cantos carbonizados. Partes do texto perdidas para sempre.',
        content: '<p>Reli a Entrada 47 hoje. Não me reconheco nas palavras. Descrevi uma cratera, um vale que cresce. Não há cratera. Nunca houve.</p>'
            + '<p>A Esfera não caiu. Ela não veio de lugar algum. Ela <span class="faded">sempre esteve</span> aqui \u2014 antes da terra, antes do céu, antes de <span class="erased">[...]</span>. A cidade que construi ao redor dela não foi erguida sobre o local de uma queda. Foi erguida sobre <span class="erased">[...]</span>.</p>'
            + '<p>Isso contradiz tudo o que escrevi antes. E no entanto, tenho certeza absoluta. Tanta certeza quanto tive ao escrever a Entrada 47. <span class="torn-end">Alguem está mudando minhas memórias, ou\u2014</span></p>'
    },
    {
        id: 5,
        title: 'Catalogação de Norien Calamus \u2014 Sobre a Impossibilidade de Minha Propria Existencia',
        type: 'diary',
        author: 'Norien Calamus',
        era: '???',
        condition: 'pristine',
        notes: 'Perturbadoramente bem preservado. O pergaminho parece novo.',
        content: '<p>Sou Norien Calamus, escriba e descendente de Erindor Calamus, o cart\u00f3grafo. Pelo menos, \u00e9 o que sempre acreditei.</p>'
            + '<p>Hoje encontrei um fragmento em Serralume que carrega minha caligrafia. Reconhe\u00e7o cada floreio, cada maneira particular como fa\u00e7o o "s" e o "r". \u00c9 sem d\u00favida minha escrita.</p>'
            + '<p>O fragmento data da Era da Aurora. <span class="faded">Tr\u00eas mil anos</span> antes de meu nascimento.</p>'
            + '<p>Coloquei meu manuscrito ao lado do fragmento da Aurora. A tinta antiga estava \u00famida. Passei o dedo \u2014 manchou. Tinta de tr\u00eas mil anos que ainda n\u00e3o secou. O pergaminho n\u00e3o cheirava a velho. Cheirava ao meu suor. \u00c0s nozes que comi ontem. Ao sal das minhas m\u00e3os.</p>'
            + '<p>Erindor viveu na Funda\u00e7\u00e3o. Eu vivo agora, no Presente. Mas minha m\u00e3o escreveu palavras na Aurora, antes de Erindor nascer. Antes de Valdoria existir. Antes de <span class="erased">[...]</span>.</p>'
            + '<p>H\u00e1 algo errado comigo. Deveria estar aterrorizado. N\u00e3o estou. E a aus\u00eancia de medo \u00e9 mais assustadora que qualquer medo que j\u00e1 senti. Como se a parte de mim que deveria gritar j\u00e1 soubesse \u2014 j\u00e1 tivesse <span class="faded">sempre sabido</span> \u2014 que o tempo n\u00e3o \u00e9 uma linha. Que eu j\u00e1 estive aqui antes. Que estarei de novo.</p>'
    },
    {
        id: 6,
        title: 'Relatório do Arquivista de Serralume \u2014 Para Ninguem Em Particular',
        type: 'diary',
        author: 'Anonimo (O Arquivista)',
        era: 'Presente',
        condition: 'aged',
        notes: null,
        content: '<p>Ninguem lera este relatorio. Escrevo-o mesmo assim, como escrevo todos os outros, porque e o que faco. E o que sempre fiz. Há quanto tempo estou aqui? Não me lembro. Não importa.</p>'
            + '<p>A biblioteca de Serralume contem <span class="faded">setecentos e quarenta e tres</span> documentos sobre a Esfera. Cataloguei cada um. Organizei por era, por autor, por região, por grau de deterioracao. Criei indices cruzados. Mapeei contradicoes.</p>'
            + '<p>Posso dizer com autoridade: não há consenso sobre nada. Nem sobre a forma. Talric descreve uma esfera. Soraviel descreve uma voz. Mãelis descreve uma presença. Corvash descreve marcas na pele. Vaelira descreve correntes no mar.</p>'
            + '<p>A única constancia e a cor. Sempre dourada. Mas <span class="faded">mesmo o dourado e descrito diferentemente</span> \u2014 para uns, e o dourado do sol; para outros, o dourado de olhos de predador; para Duravar, o dourado do <span class="erased">silêncio</span>.</p>'
            + '<p>Continuo catalogando. Não porque acredite que encontrarei a verdade. Mas porque alguém precisa manter o registro. Alguem precisa lembrar. Mesmo que a <span class="faded">própria memória</span> não seja confiavel.</p>'
    },
    {
        id: 7,
        title: 'Primeira Visão de Soraviel \u2014 A Luz que Fala com Voz de Silêncio',
        type: 'prophecy',
        author: 'Soraviel (transcrito por um acolito)',
        era: 'Fundação',
        condition: 'stained',
        notes: 'Manchas que parecem lagrimas secas sobre o pergaminho.',
        content: '<p><em>Ela falou, e suas palavras não tinham som:</em></p>'
            + '<p>Vi a luz antes de perder os olhos. Ou talvez os olhos tenham partido para que eu pudesse finalmente ver. Há uma diferença? A Esfera não acha que sim.</p>'
            + '<p>Quando fecho o que resta de minhas pálpebras, vejo um dourado que não é cor \u2014 e peso. Como se alguém colocasse ouro fundido sobre minha mente e dissesse: "Agora, entenda." Mas eu não entendo. Ninguem entende. Não fomos feitos para entender.</p>'
            + '<p><em>A voz que não é som disse:</em></p>'
            + '<p>"<span class="faded">Eu sou o que restou do que veio antes. Eu sou o que restara do que vira depois. Não me procurem. Eu já os encontrei.</span>"</p>'
            + '<p>Chorei. Não de medo \u2014 de beleza. Há algo tao imenso, tao além de toda compreensão, que a única resposta possível e chorar. Como chorar diante de uma montanha que não tem topo. Como chorar diante do mar que não tem fundo.</p>'
            + '<p>A Esfera não e boa. A Esfera não e ma. A Esfera <em>e</em>. E isso e mais terrível do que qualquer maldade que já conheci.</p>'
    },
    {
        id: 8,
        title: 'Fragmento da Profecia de Lysara \u2014 O Que Sera Antes de Ser',
        type: 'prophecy',
        author: 'Lysara da Corte Palida',
        era: 'Expansão',
        condition: 'torn',
        notes: 'Borda inferior rasgada. Texto incompleto.',
        content: '<p>Cada profecia queima. N\u00e3o met\u00e1fora \u2014 queima como febre, como \u00e1cido na garganta. As vis\u00f5es n\u00e3o pedem permiss\u00e3o. Elas invadem.</p>'
            + '<p>Vi <span class="faded">uma cidade que n\u00e3o existe</span> erguer-se sobre ru\u00ednas que ainda n\u00e3o ca\u00edram. Vi uma guilda daqueles que ousam cruzar al\u00e9m dos port\u00f5es, sem saber que os port\u00f5es existem para proteg\u00ea-los. Quando a imagem da forja me atingiu, senti gosto de ferro fundido na l\u00edngua. Minhas m\u00e3os formigaram como se segurassem o martelo. Vi uma forja que arde com fogo dourado, alimentada por min\u00e9rio que pulsa como cora\u00e7\u00e3o vivo.</p>'
            + '<p>Vi as guerras travadas na beira do crep\u00fasculo, quando o sol hesitou entre nascer e morrer. Vi o pacto selado onde a luz n\u00e3o alcan\u00e7a, entre vozes que prometem poder a quem aceita perder. Cada vis\u00e3o deixava marcas \u2014 queimaduras sem fogo na palma das m\u00e3os. Contei ao conselho. Mostrei as marcas. Pararam de rir. Pararam de me ouvir.</p>'
            + '<p>A pior vis\u00e3o foi a \u00faltima. Vi <span class="erased">[...]</span> e soube que n\u00e3o deveria ter visto. Algumas verdades s\u00e3o como faca \u2014 cortam quem segura, n\u00e3o quem \u00e9 apontado.</p>'
            + '<p><span class="torn-end">E vi, por fim, o momento em que algu\u00e9m ler\u00e1 estas palavras e\u2014</span></p>'
    },
    {
        id: 9,
        title: 'O Sonho Compartilhado \u2014 Relato do Primeiro dos Tres',
        type: 'prophecy',
        author: 'Anonimo',
        era: 'Presente',
        condition: 'aged',
        notes: null,
        content: '<p>Sou padeiro. Amasso p\u00e3o desde os onze anos. Conhe\u00e7o o peso das coisas \u2014 farinha, massa, ferro de forno. E o que est\u00e1 no sonho pesa mais do que qualquer coisa que j\u00e1 segurei.</p>'
            + '<p>Todas as noites, o mesmo sonho. H\u00e1 <span class="faded">sete anos</span>. Estou em p\u00e9 no escuro. O escuro tem textura \u2014 \u00e9 como enfiar a m\u00e3o em mel. Mel quente. Mel que brilha quando ningu\u00e9m olha. Tentei prov\u00e1-lo uma vez \u2014 acordei com gosto de metal e cinza na boca.</p>'
            + '<p>Ent\u00e3o, ela aparece. N\u00e3o "aparece" como uma pessoa entra numa sala. Ela simplesmente <em>passa a existir</em>, como se sempre tivesse estado l\u00e1 e meus olhos finalmente a notassem.</p>'
            + '<p>No sonho, sei que h\u00e1 outros. Dois. Sonham o mesmo sonho, em lugares que n\u00e3o conhe\u00e7o. Um deles chora \u2014 sinto a umidade mesmo sem v\u00ea-lo. O outro respira devagar demais, como quem mede o ar antes de mergulhar.</p>'
            + '<p>Minha mulher diz que falo dormindo. Em l\u00edngua que ela n\u00e3o conhece. Fui ao templo perguntar ao sacerdote \u2014 ele ficou p\u00e1lido e mandou que eu parasse de falar. <em>"Essa l\u00edngua"</em>, disse ele, <em>"\u00e9 anterior \u00e0s palavras."</em></p>'
            + '<p>Algo muda em mim a cada noite. Como se o sonho me escrevesse por dentro, linha por linha, e quando terminar de escrever <span class="erased">[...]</span>.</p>'
            + '<p>Ontem o sonho mudou. Pela primeira vez em sete anos. Ela estava mais perto. E eu n\u00e3o queria fugir. Esse \u00e9 o horror \u2014 n\u00e3o o sonho, mas a parte de mim que quer ficar.</p>'
    },
    {
        id: 10,
        title: 'Segunda Visão de Soraviel \u2014 O Rosto que Não Pode Ser Lembrado',
        type: 'prophecy',
        author: 'Soraviel (transcrito por um acolito)',
        era: 'Fundação',
        condition: 'burned',
        notes: 'Bordas severamente queimadas. Texto central sobreviveu.',
        content: '<p><em>Palavras finais de Soraviel, ditas antes de <span class="erased">[...]</span>:</em></p>'
            + '<p>Há uma deusa que ninguém lembra. Eu a vi. Calíria \u2014 nao, esse não e o nome. Era o nome, mas o nome mudou, ou nos e que mudamos. Ela tentou compreender a Esfera e a Esfera tomou <span class="faded">dela o que nos permite ser lembrados</span>.</p>'
            + '<p>Tem seguidores. Devotos que rezam todos os dias para uma presença que não conseguem descrever. "Para quem vocês rezam?" perguntei a um sacerdote. "Nao sei," respondeu ele, com lagrimas nos olhos. "Mas ela ouve."</p>'
            + '<p>A Esfera não castiga. A Esfera cobra. Conhecimento tem preço, e o preço de conhecer a Esfera e perder algo de si. Calíria perdeu seu rosto. Ou seu nome. Ou a capacidade de ser lembrada. Ou <span class="erased">todas essas coisas e mais</span>.</p>'
            + '<p>Eu perdi meus olhos. Talric perdera <span class="faded">suas certezas</span>. E voce, que le estas palavras \u2014 o que estará disposto a perder?</p>'
    },
    {
        id: 11,
        title: 'Ultimo Registro de Lysara \u2014 A Cidade Que Ainda Não Caiu',
        type: 'prophecy',
        author: 'Lysara da Corte Palida',
        era: 'Expansão',
        condition: 'torn',
        notes: 'Metade inferior do documento perdida.',
        content: '<p>Escrevo da Corte Palida, minha amada cidade a beira do mar. As torres brilham sob o sol. As ruas estao cheias de vida. Os mercadores cantam, as criancas correm, o porto respira com navios de toda parte.</p>'
            + '<p>E sei que nada disso existira amanhã.</p>'
            + '<p>A Esfera me mostrou: o mar reclamara esta cidade. Não por furia, não por castigo \u2014 por <span class="faded">necessidade</span>. Há algo sob as ondas que precisa da Corte Palida. Algo que foi colocado aqui antes de nos, antes das pedras, antes do mar.</p>'
            + '<p>Contei aos conselheiros. Não acreditaram. Mostrei minhas visoes ao rei. <span class="erased">▮▮▮▮▮▮▮▮</span> mandou-me calar. Decretos foram escritos: e proibido falar da Esfera por nome dentro dos muros da Corte. Como se silenciar a profecia pudesse silenciar o mar.</p>'
            + '<p><span class="torn-end">As torres ainda brilham enquanto escrevo. O mar esta calmo. Mas ouço, debaixo das ondas, como Vaelira ouvira séculos depois\u2014</span></p>'
    },
    {
        id: 12,
        title: 'Confissão de Isavel Cinéras \u2014 Por Que Tentei Queimar os Diários de Meu Avô',
        type: 'confession',
        author: 'Isavel Cinéras',
        era: 'Fragmentação',
        condition: 'burned',
        notes: 'A própria confissão mostra marcas de fogo. Ironia deliberada?',
        content: '<p>Sou Isavel Cinéras, neta de Talric, herdeira de nada além de obsessao.</p>'
            + '<p>Queimei os diários. Ou tentei. O fogo consumiu as bordas, escureceu as páginas, transformou anos de trabalho em cinza \u2014 e mesmo assim, as palavras sobreviveram. Como se a tinta fosse mais forte que a chama. Como se as palavras quisessem ser lidas.</p>'
            + '<p>Voces não entendem. Meu avô morreu louco. Não louco de gritar e arrancar os cabelos \u2014 louco de <span class="faded">certeza</span>. Morreu absolutamente convicto de verdades que se contradiziam. Acreditava em tudo ao mesmo tempo. A Esfera fez isso com ele.</p>'
            + '<p>Pensei que, se destruisse os registros, a Esfera perderia poder. Registros sao memória. Memoria e existência. Destrua a memória e talvez <span class="erased">[...]</span> deixe de existir.</p>'
            + '<p>Os diários não queimaram. As páginas que arranquei reapareceram. Os textos que rasguei foram encontrados intactos em outros lugares \u2014 bibliotecas que meu avô nunca visitou, templos em terras que ele nunca pisou.</p>'
            + '<p>A Esfera quer ser conhecida. E essa e a parte que mais me aterroriza.</p>'
    },
    {
        id: 13,
        title: 'Depoimento de Ravan Tormavela \u2014 Sobre Ouvir o Que Não Deveria Ter Voz',
        type: 'confession',
        author: 'Ravan Tormavela',
        era: 'Presente',
        condition: 'aged',
        notes: null,
        content: '<p>Minha mãe encontrou algo no fundo do mar e nunca mais voltou a ser minha mãe. Ainda tem o mesmo rosto, o mesmo nome, as mesmas mãos que me seguravam quando eu era crianca. Mas por tras dos olhos, algo mudou. Algo entrou. Ou algo saiu.</p>'
            + '<p>Fugi de casa aos <span class="faded">dezesseis anos</span>. Não por odio \u2014 por medo. Porque comecei a ouvir a mesma coisa que ela ouve.</p>'
            + '<p>Não e uma voz. E um peso. Um peso dourado que se instala na mente como água que sobe lentamente, enchendo cada espaço até não sobrar ar. Não diz palavras. Não forma frases. Mas de alguma forma, eu sei o que ela quer. A Esfera quer ser encontrada. De novo. E de novo. E de novo.</p>'
            + '<p>Fugi para o mais longe que pude. Cruzei montanhas, desertos, <span class="erased">[...]</span>. Cheguei a um monastério onde monges vivem em silêncio absoluto. Pensei que o silêncio externo calaria o interno.</p>'
            + '<p>Não calou. A voz que não é som continua. Todas as noites, antes de dormir, ouço o dourado que não é luz chamar meu nome. E o pior: a cada dia, resisto um pouco menos.</p>'
    },
    {
        id: 14,
        title: 'Testemunho de Um Guarda de Valdoria \u2014 O Que Vi Naquela Noite nos Portoes',
        type: 'confession',
        author: 'Anonimo (Guarda de Valdoria)',
        era: 'Presente',
        condition: 'stained',
        notes: 'Manchas que podem ser vinho. Ou sangue.',
        content: '<p>Eu... olha, vou contar de uma vez, t\u00e1? Antes que eu perca a coragem. Ou antes que eu esque\u00e7a mais. Porque todo dia a mem\u00f3ria fica mais fraca, como se algu\u00e9m estivesse <span class="faded">apagando</span>.</p>'
            + '<p>Doze anos nos port\u00f5es. Doze. Nada acontece \u00e0 noite nos port\u00f5es. Nada. At\u00e9 que acontece.</p>'
            + '<p>Uma mulher que coleciona segredos como outros colecionam moedas, e os vende pelo pre\u00e7o de uma caneca \u2014 voc\u00eas sabem de quem falo \u2014 ela me avisou: "N\u00e3o olhe para fora depois da meia-noite." Pensei que era mais uma de suas hist\u00f3rias. N\u00e3o era.</p>'
            + '<p>\u00c0 meia-noite, o ar ficou seco. Seco como nunca senti \u2014 como se toda umidade do mundo tivesse sido sugada em um segundo. Minha boca colou. Os olhos arderam. Senti um cheiro \u2014 como quando um raio cai perto, aquele cheiro de ar queimado. Mas n\u00e3o havia tempestade. E um zumbido. N\u00e3o nos ouvidos \u2014 nos <span class="faded">dentes</span>. Como se algu\u00e9m passasse um arco de violino nos meus molares.</p>'
            + '<p>Olhei pelo visor do port\u00e3o. Vi <span class="erased">[...]</span>. Uma forma no ar, do tamanho de uma cabe\u00e7a. Dourada. Sem ch\u00e3o, sem apoio. Durou <span class="erased">[...]</span> segundos. Ou horas. A mulher da taverna olhou pra mim na manh\u00e3 seguinte e disse s\u00f3: <em>"Agora voc\u00ea tamb\u00e9m viu."</em></p>'
            + '<p>N\u00e3o s\u00e3o s\u00f3 as m\u00e3os que tremem. N\u00e3o consigo mais ficar no escuro. Acendo todas as velas da casa antes do sol se p\u00f4r. Minha filha acha que fiquei velho. Minha mulher olha as velas e n\u00e3o diz nada. Ela sabe.</p>'
    },
    {
        id: 15,
        title: 'Confissão Anonima \u2014 Encontrada Dentro de Uma Pedra Solida',
        type: 'confession',
        author: 'Desconhecido',
        era: '???',
        condition: 'pristine',
        notes: 'Encontrada quando pedreiros quebraram um bloco de granito para construcao. O pergaminho estava no interior da pedra, intacto. A pedra não mostrava sinais de ter sido aberta antes.',
        content: '<p>Não sei quem sou. Não sei quando estou. A Esfera me tirou essas coisas, ou talvez eu nunca as tenha tido.</p>'
            + '<p>Escrevo de um lugar que não é um lugar. Há silêncio aqui, mas o silêncio e mais alto que qualquer grito. Há escuridao, mas a escuridao brilha. Dourada. Sempre dourada.</p>'
            + '<p>Voce que le isto \u2014 não me procure. Não porque eu não queira ser encontrado. Mas porque <span class="faded">encontrar-me significaria</span> aceitar que pedras guardam memórias, que o tempo não e real, que a Esfera pode colocar palavras onde palavras não deveriam existir.</p>'
            + '<p>E se você aceitar isso, não há como voltar.</p>'
            + '<p>Fui a Setima Testemunha. Ou serei. O tempo não importa para quem esta <span class="erased">[...]</span>. Seis viram a Esfera surgir. Eu vi o que havia por tras. E por isso fui apagado. Meu nome, minha história, minha existência \u2014 removidos do mundo como tinta lavada de pergaminho.</p>'
            + '<p>Mas a tinta deixa marca, mesmo quando lavada. E esta pedra guardou o que o mundo quis esquecer.</p>'
    },
    {
        id: 16,
        title: 'Litania de Solvenar \u2014 O Limiar que Não Se Cruza',
        type: 'religious',
        author: 'Sacerdotes de Solvenar',
        era: 'Aurora',
        condition: 'aged',
        notes: 'Recitada nos templos de fronteira ao amanhecer e ao entardecer.',
        content: '<p><em>Ouve-nos, Guardi\u00e3o dos Limiares, que permaneces entre o que \u00e9 e o que n\u00e3o deveria ser.</em></p>'
            + '<p>Tu que foste o primeiro a estender a m\u00e3o em dire\u00e7\u00e3o \u00e0 Esfera. Tu que foste transformado pelo toque que nenhum mortal suportaria. Tu que j\u00e1 n\u00e3o lembras do que eras antes, e carregas essa aus\u00eancia como um manto.</p>'
            + '<p>Lembra-nos de <span class="faded">Verath</span>, que cruzou. Verath, que era nosso irm\u00e3o, nossa voz mais clara, nosso cora\u00e7\u00e3o mais bravo. Verath, que voltou tr\u00eas dias depois sem os olhos \u2014 n\u00e3o cegos, Solvenar, <em>ausentes</em>. As \u00f3rbitas lisas como pedra polida. E quando lhe perguntamos o que vira do outro lado, ele sorriu. Verath nunca sorria.</p>'
            + '<p>O V\u00e9u n\u00e3o se v\u00ea \u2014 sente-se. Como a press\u00e3o que antecede uma tempestade que nunca chega. Os pelos dos bra\u00e7os se eri\u00e7am. A saliva ganha sabor de ferro. O mundo fica mais fino \u2014 como se as paredes da realidade tivessem a espessura de um sussurro.</p>'
            + '<p><em>Guarda-nos, Solvenar. N\u00e3o do que h\u00e1 al\u00e9m do V\u00e9u \u2014 de n\u00f3s mesmos. Da nossa curiosidade. Do desejo de cruzar que cresce a cada prece, a cada noite, a cada vez que o V\u00e9u <span class="erased">[...]</span>.</em></p>'
    },
    {
        id: 17,
        title: 'Prece dos Devotos de Issara \u2014 Para Que o Ciclo Se Complete',
        type: 'religious',
        author: 'Ordem das Cinzas Renascidas',
        era: 'Fragmentação',
        condition: 'stained',
        notes: 'Encontrada no único templo de Issara que sobreviveu. As manchas cheiram a enxofre.',
        content: '<p><em>M\u00e3e das Cinzas, que encerras para que o novo possa come\u00e7ar:</em></p>'
            + '<p>Nossos ancestrais viram. Viram o fogo mais quente que o centro do mundo erguer-se como uma parede viva e envolver a Esfera. Viram-no queimar por sete dias. No s\u00e9timo dia, o fogo apagou. A Esfera brilhava como sempre. E notaram algo que os destruiu: a Esfera n\u00e3o estava quente. O fogo n\u00e3o a havia tocado. Havia <span class="faded">contornado</span> \u2014 como \u00e1gua contorna uma pedra \u2014 e queimado tudo ao redor <em>exceto</em> ela.</p>'
            + '<p>Queimaste teus pr\u00f3prios templos ent\u00e3o. N\u00e3o de f\u00faria \u2014 de desespero. Porque se a Esfera n\u00e3o podia ser destru\u00edda, tudo que a cercava era dispens\u00e1vel. At\u00e9 os teus altares. At\u00e9 <span class="erased">[...]</span>.</p>'
            + '<p>Este templo cheira a cinza. H\u00e1 s\u00e9culos cheira a cinza. Nenhuma erva, nenhum incenso cobre o cheiro. \u00c9 o cheiro da derrota de uma deusa, e ele nunca se dissipar\u00e1.</p>'
            + '<p>Rezamos para uma deusa que falhou. Sabemos disso. Ela sabe disso. E mesmo assim, rezamos \u2014 porque a alternativa \u00e9 aceitar que nada no universo pode mudar o que a Esfera \u00e9.</p>'
            + '<p><em>M\u00e3e, ouve-nos. N\u00e3o pedimos vit\u00f3ria. Pedimos for\u00e7a para continuar tentando.</em></p>'
    },
    {
        id: 18,
        title: 'Debate Teológico \u2014 Sobre a Natureza de Cal\u00edria: Deusa ou Eco?',
        type: 'religious',
        author: 'Conclave de Serralume',
        era: 'Expansão',
        condition: 'aged',
        notes: 'Ata parcial. Varias páginas faltando entre os argumentos.',
        content: '<p><strong>Orador Primeiro:</strong> Cal\u00edria e uma deusa. Tem templos, tem fieis, tem poder. O fato de ninguém conseguir descrever seu rosto não nega sua existência \u2014 apenas confirma o preço que pagou ao estudar a Esfera.</p>'
            + '<p><strong>Orador Segundo:</strong> Com todo respeito, como pode ser deusa alguém cujo <span class="faded">próprio nome escorrega da memória</span>? Perguntei a seis fieis quem adoram. Nenhum soube responder. Choram ao rezar. Sentem presença. Mas não conseguem dizer o nome.</p>'
            + '<p><strong>Orador Terceiro:</strong> Proponho uma terceira possibilidade. Cal\u00edria não e deusa nem ilusao. E um <em>eco</em>. A Esfera consumiu algo dela \u2014 talvez toda ela \u2014 e o que resta e a reverberacao. Como o som de um sino depois que o sino foi derretido.</p>'
            + '<p><strong>Orador Primeiro:</strong> Se e eco, quem ressoa? O que foi consumido?</p>'
            + '<p><strong>Orador Terceiro:</strong> <span class="erased">[páginas faltando]</span></p>'
            + '<p><strong>Orador Segundo:</strong> ...e por isso afirmo que Selvoran sabe. Ele observa. Ele sempre observou. Se alguém viu o que aconteceu com Cal\u00edria, foi o Juiz Silêncioso. Mas ele não fala. Nunca falou. E <span class="faded">talvez esse seja o ponto</span>: há verdades que, se ditas em voz alta, <span class="erased">[...]</span>.</p>'
    },
    {
        id: 19,
        title: 'Hino dos Peregrinos de Selvoran \u2014 O Silêncio Como Resposta',
        type: 'religious',
        author: 'Peregrinos do Silêncio',
        era: 'Expansão',
        condition: 'pristine',
        notes: null,
        content: '<p><em>Cantado sem voz. Cada palavra e pensada, não dita.</em></p>'
            + '<p>Selvoran nos ensinou pelo exemplo: há mais sabedoria no silêncio do que em todos os livros de Serralume. Ele viu a Esfera ser <span class="faded">criada ou revelada ou imaginada</span>. Viu Aurivath dar-se ou ser tomado. Viu Nevaris preencher o vazio ou ser preenchida por ele. Viu tudo.</p>'
            + '<p>E escolheu calar.</p>'
            + '<p>Nos, seus peregrinos, imitamos sua escolha. Caminhamos entre as estatuas que ele deixou pelo mundo \u2014 sempre voltadas para onde a Esfera esteve, os olhos de pedra fixos em algo que não podemos ver. E em cada estatua, o mesmo silêncio.</p>'
            + '<p>Não e o silêncio de quem não sabe. E o silêncio de quem sabe demais.</p>'
            + '<p>Um dia, talvez, o Juiz Silêncioso fale. E nesse dia, dizem os textos mais antigos, o Véu de Virenor se desfara, o ciclo de Issara se completara, e a Esfera finalmente <span class="erased">[...]</span>.</p>'
            + '<p>Ate lá, caminhamos. Em silêncio. Pois o silêncio e a única resposta honesta para perguntas grandes demais.</p>'
    },
    {
        id: 20,
        title: 'Carta de Vaelira Tormavela \u2014 Para Meu Filho, Que Fugiu do Mar',
        type: 'letter',
        author: 'Capita Vaelira Tormavela',
        era: 'Presente',
        condition: 'stained',
        notes: 'Manchas de sal marinho. Nunca foi enviada.',
        content: '<p>Ravan,</p>'
            + '<p>Sei que não vai ler esta carta. Sei que fugiu para o mais longe possível do mar, das correntes, de mim. Não o culpo. Eu mesma fugiria de mim, se pudesse.</p>'
            + '<p>Encontrei algo no fundo do oceano, em <span class="erased">▮▮▮▮▮▮▮▮</span>, a <span class="faded">sete braças</span> abaixo do ponto mais profundo registrado nos mapas. Não era a Esfera. Não sei o que era. Mas era dourado \u2014 dourado de uma forma que nenhum ouro reproduz. Dourado como <em>o peso de algo que não tem massa</em>.</p>'
            + '<p>A tripulacao viu. Todos os <span class="faded">vinte e tres</span> viram. Depois, um a um, desapareceram. Não morreram \u2014 desapareceram. Como se nunca tivessem existido. Verifiquei os registros do porto: não há mencion de seus nomes. Perguntei as familias: não reconhecem as descricoes.</p>'
            + '<p>So eu restei. Por que? Não sei. Talvez porque a Esfera ainda precisa de mim. Talvez porque <span class="erased">[...]</span>.</p>'
            + '<p>Voce ouve o que eu ouco, Ravan. Herdou isso de mim como se herda a cor dos olhos. Não e maldicao. Não e benção. E apenas... o que somos agora. Tormavelas que ouvem o mar cantar com voz que não é som.</p>'
            + '<p>Não fuja do que você e. Não há distância suficiente.</p>'
            + '<p>Sua mãe, que ainda navega.</p>'
    },
    {
        id: 21,
        title: 'Correspondência do Arquivista \u2014 Resposta a Uma Pergunta Nunca Enviada',
        type: 'letter',
        author: 'O Arquivista de Serralume',
        era: 'Presente',
        condition: 'aged',
        notes: null,
        content: '<p>Caro <span class="erased">▮▮▮▮▮▮</span>,</p>'
            + '<p>Recebi sua carta datada de <span class="erased">▮▮▮▮▮▮▮▮</span>. Ou melhor: não recebi. Não existe registro de que você tenha me enviado qualquer correspondencia. No entanto, sei exatamente o que perguntou, pois encontrei minha resposta já escrita na gaveta esquerda da escrivaninha, datada de ontem, em minha própria caligrafia.</p>'
            + '<p>Não me lembro de te-la escrito. Mas reconheco a escrita, os argumentos, as referências. Sou eu. Ou fui eu. Ou serei eu.</p>'
            + '<p>Voce perguntou: "A Esfera esta viva?"</p>'
            + '<p>Minha resposta, que aparentemente já dei antes de ser perguntada, e esta: a palavra "viva" pressupoe que algo pode estar morto. A Esfera não participa dessa distincao. Ela não esta viva nem morta. Ela e <span class="faded">anterior a essas categorias</span>. Perguntar se a Esfera esta viva e como perguntar se o número sete esta feliz. A categoria não se aplica.</p>'
            + '<p>Isso deveria tranquiliza-lo. Não tranquiliza a mim.</p>'
            + '<p>Atenciosamente,<br>O Arquivista</p>'
            + '<p><em>P.S.: Não me envie mais cartas. Aparentemente, já as responderei antes que cheguem.</em></p>'
    },
    {
        id: 22,
        title: 'Aviso de Dormund Ferrovoz \u2014 Para Quem Encontrar Esta Bigorna',
        type: 'letter',
        author: 'Dormund Ferrovoz',
        era: 'Presente',
        condition: 'burned',
        notes: 'Gravado na própria bigorna com cinzel. Letras fundas e irregulares.',
        content: '<p>A primeira vez que ouvi, estava temperando uma espada comum para um mercador. O martelo caiu no a\u00e7o vermelho e o a\u00e7o... respondeu. N\u00e3o um som \u2014 uma nota. Clara como voz de crian\u00e7a. Larguei o martelo. A nota continuou. Vinha de dentro do metal, como se a espada estivesse cantando o nome de algu\u00e9m que eu n\u00e3o conhe\u00e7o mas meu corpo reconhecia.</p>'
            + '<p>N\u00e3o sou parente do an\u00e3o Duravar. Meu av\u00f4 era ferreiro e gritava demais \u2014 da\u00ed Ferrovoz. Nada a ver com <span class="faded">m\u00e1quinas que ouvem a Esfera</span>.</p>'
            + '<p>Mas as armas que forjo cantam. Uma l\u00e2mina que chora \u2014 n\u00e3o pela dor que causa, mas pelo nome que esqueceu. Um escudo que zumbe quando voltado para <span class="erased">[...]</span>. Machados que suspiram ao amanhecer.</p>'
            + '<p>O que me apavora n\u00e3o \u00e9 o canto. \u00c9 que eu gosto. Cada vez que forjo, espero ouvir. Cada vez que a bigorna responde, algo em mim <em>acorda</em> \u2014 algo que n\u00e3o sou eu, algo que sabe forjar coisas que n\u00e3o pertencem a este mundo. E eu deixo. Deixo porque o metal fica <span class="faded">mais bonito quando outra coisa guia minhas m\u00e3os</span>.</p>'
            + '<p>Se voc\u00ea encontrar esta bigorna e ouvir o metal cantar: pare de forjar. V\u00e1 embora. <span class="torn-end">N\u00e3o cometa o mesmo erro que\u2014</span></p>'
    },
    {
        id: 23,
        title: 'Carta Selada \u2014 Remetente Desconhecido, Destinatario Apagado',
        type: 'letter',
        author: 'Desconhecido',
        era: '???',
        condition: 'torn',
        notes: 'O selo de cera e dourado mas não corresponde a nenhuma casa, guilda, ou ordem conhecida.',
        content: '<p>Meu <span class="erased">\u25ae\u25ae\u25ae\u25ae</span>,</p>'
            + '<p>Quando leres esta carta, j\u00e1 terei feito o que prometemos nunca fazer. Perdoa-me. Ou n\u00e3o perdoes. Depois do que vi, perd\u00e3o \u00e9 uma palavra pequena demais.</p>'
            + '<p>Sei que voc\u00ea <span class="faded">encontrou o que procurava</span>. Sei tamb\u00e9m que agora desejaria nunca ter procurado. \u00c9 o destino de todos que olham para dentro dela: ver o que n\u00e3o deveria ser visto e perceber que n\u00e3o h\u00e1 como des-ver.</p>'
            + '<p>N\u00e3o fale sobre o que viu \u2014 n\u00e3o porque seja proibido, mas porque EU ouvi o que acontece com quem fala. O corvo negro que pousa em todas as janelas j\u00e1 est\u00e1 vigiando. Vi na tua janela tamb\u00e9m \u2014 perdoa-me, n\u00e3o deveria ter ido verificar.</p>'
            + '<p>Nosso amigo <span class="erased">\u25ae\u25ae\u25ae\u25ae</span> respondeu. Ouviu a voz que n\u00e3o \u00e9 som e respondeu em voz alta, no mercado, diante de testemunhas. No dia seguinte, ningu\u00e9m se lembrava dele. Nem a esposa. Nem os filhos. Apenas eu, que assisti. Agora carrego essa mem\u00f3ria como se fosse a \u00faltima prova de que ele existiu.</p>'
            + '<p>Destr\u00f3i o <span class="erased">[...]</span> que trouxeste contigo. N\u00e3o \u00e9 um artefato. \u00c9 um lembrete. E lembretes da Esfera t\u00eam o h\u00e1bito de <span class="faded">se tornarem mais do que objetos</span>.</p>'
            + '<p><span class="torn-end">Quando o V\u00e9u de Virenor enfraquecer na pr\u00f3xima lua, voc\u00ea deve\u2014</span></p>'
    },
    {
        id: 24,
        title: 'Crônica da Fundação de Valdoria \u2014 Versao Oficial',
        type: 'record',
        author: 'Cronistas da Corte',
        era: 'Fundação',
        condition: 'aged',
        notes: 'Contradita em varios pontos pelos diários de Talric Cinéras (ver fragmentos 1 e 4).',
        content: '<p>No decimo ano após as guerras travadas na beira do crepusculo, quando o sol hesitou entre nascer e morrer, o povo buscou terra nova. Talric Cinéras, erudito e lider por escolha do conselho, guiou os sobreviventes para além das montanhas.</p>'
            + '<p>Encontraram um vale fertil, irrigado por dois rios, protegido por colinas em tres flancos. Não há registro de que algo incomum existisse no local. O vale era, segundo os relatos oficiais, um vale como qualquer outro.</p>'
            + '<p><em>Nota do cronista posterior:</em> Os diários pessoais de Talric <span class="faded">contradizem esta versao</span>. Ele descreve uma cratera (Entrada 47) ou uma presença eterna (Entrada 203). A versao oficial foi redigida pelo conselho <span class="erased">▮▮▮▮▮▮▮▮</span> anos depois, sem consulta aos diários.</p>'
            + '<p>A cidade cresceu. Chamou-se Valdoria \u2014 "vale dourado" na lingua antiga, embora nenhum ouro tenha sido encontrado na região. Curiosamente, nenhum cronista explicou por que "dourado."</p>'
            + '<p>A guilda daqueles que ousam cruzar além dos portoes foi fundada no vigesimo ano, quando exploradores relataram <span class="erased">[...]</span> nas terras ao redor. Os portoes foram construidos não para proteger contra invasores, mas para <span class="faded">proteger quem está dentro</span>. Desta distincao, poucos tomaram nota.</p>'
    },
    {
        id: 25,
        title: 'Decreto da Corte Palida \u2014 Proibição de Mencionar a Esfera por Nome',
        type: 'record',
        author: 'Chanceler <span class="erased">▮▮▮▮▮▮▮</span>',
        era: 'Expansão',
        condition: 'stained',
        notes: 'Tres copias conhecidas. Todas com os mesmos nomes censurados.',
        content: '<p><strong>DECRETO REAL N\u00ba <span class="erased">▮▮▮</span></strong></p>'
            + '<p>Por ordem de <span class="erased">▮▮▮▮▮▮▮▮▮▮</span>, Soberano da Corte Palida, e com aprovacao unanime do Conselho dos <span class="erased">▮▮▮▮▮▮</span>, fica estabelecido:</p>'
            + '<p><strong>Artigo I.</strong> Fica terminantemente proibido, dentro dos muros da Corte Palida e em todos os seus dominios, mencionar pelo nome o artefato designado como <span class="erased">▮▮▮▮▮▮▮</span>.</p>'
            + '<p><strong>Artigo II.</strong> Toda referência ao dito artefato deverá usar a designacao oficial: "Assunto Selado." Descumprir este artigo acarretara <span class="erased">[...]</span>.</p>'
            + '<p><strong>Artigo III.</strong> Os escritos da vidente Lysara, anteriormente consultora da Coroa, ficam confiscados e lacrados nos <span class="erased">▮▮▮▮▮▮▮▮</span>. Citar suas profecias e crime de <span class="faded">alta traicao</span>.</p>'
            + '<p><strong>Artigo IV.</strong> Qualquer cidadao que apresente <span class="faded">visoes, sonhos recorrentes, ou sensibilidade auditiva incomum</span> deverá se apresentar ao Conselho para avaliacao. Não se apresentar constitui <span class="erased">[...]</span>.</p>'
            + '<p><em>Nota historica: a Corte Palida caiu menos de uma geracao depois deste decreto. O mar reclamou a cidade exatamente como Lysara profetizou.</em></p>'
    },
    {
        id: 26,
        title: 'Registro de Oristela Cervanor \u2014 Inventário de Anomalias na Floresta de Mãelis',
        type: 'record',
        author: 'Oristela Cervanor',
        era: 'Fragmentação',
        condition: 'aged',
        notes: 'Folhas secas prensadas entre as páginas. Algumas brilham levemente no escuro.',
        content: '<p>Ma\u00e9lis plantou estas \u00e1rvores em linha reta, retas como as preces que rezava a Issara. Agora crescem em espiral. N\u00e3o porque algo as moveu \u2014 porque algo as <em>convidou</em>. A floresta n\u00e3o est\u00e1 doente. A floresta est\u00e1 dan\u00e7ando. E eu, bisneta de quem come\u00e7ou a m\u00fasica, sou a \u00fanica que reconhece o ritmo.</p>'
            + '<p><strong>Anomalia 1:</strong> A partir de 200 passos para dentro, os troncos se curvam em dire\u00e7\u00e3o ao centro. N\u00e3o por causa de vento \u2014 n\u00e3o h\u00e1 vento.</p>'
            + '<p><strong>Anomalia 2:</strong> \u00c1gua corre para cima nos riachos entre <span class="erased">[...]</span> e a clareira central. Contra a gravidade. Sem explica\u00e7\u00e3o.</p>'
            + '<p><strong>Anomalia 3:</strong> Os animais que evitam a clareira \u00e0s vezes param na borda e olham para dentro. N\u00e3o com medo \u2014 com algo parecido com saudade. Um cervo ficou duas horas parado, olhando. Depois partiu devagar, como quem sai de um vel\u00f3rio.</p>'
            + '<p><strong>Anomalia 4:</strong> Na clareira central, onde deveria haver terra, h\u00e1 vidro. Areia fundida por calor que nenhum vulc\u00e3o produz. Ajoelhei e toquei. Morno \u2014 n\u00e3o do sol, que n\u00e3o alcan\u00e7a o centro da espiral. Morno de <em>dentro</em>. Como tocar a pele de algo adormecido. Retirei a m\u00e3o. A marca dos meus dedos ficou no vidro por tr\u00eas batidas de cora\u00e7\u00e3o \u2014 e depois <span class="faded">sumiu</span>, como se o vidro tivesse absorvido minha impress\u00e3o. E o vidro \u00e9 <span class="faded">dourado</span>.</p>'
            + '<p>Conclus\u00e3o: Ma\u00e9lis n\u00e3o falhou. Algo foi parcialmente contido. Mas o que foi contido ainda <span class="faded">respira</span>.</p>'
    },
    {
        id: 27,
        title: 'Ata do Conselho dos Artificeiros \u2014 Sobre o Silêncio de Duravar Ferrovoz',
        type: 'record',
        author: 'Secretaria do Conselho',
        era: 'Expansão',
        condition: 'aged',
        notes: null,
        content: '<p><strong>ATA DE REUNIAO EXTRAORDINARIA</strong><br>Assunto: O caso do Mestre Artificeiro Duravar Ferrovoz</p>'
            + '<p>O Conselho foi convocado para avaliar a situacao do Mestre Duravar, que não emite voz própria há <span class="faded">cento e doze dias</span>.</p>'
            + '<p><strong>Historico:</strong> Duravar construiu, sem aprovacao do Conselho, um dispositivo designado como <span class="erased">[...]</span>, cuja funcao declarada era "ouvir o que a Esfera diz." O dispositivo foi ativado na Forja Profunda em <span class="erased">▮▮▮▮▮▮▮▮</span>.</p>'
            + '<p><strong>Resultado:</strong> O dispositivo funcionou. Duravar afirma (por escrito) que ouviu <span class="erased">[...]</span>. Desde a ativacao, perdeu a capacidade de falar. Seus labios se movem, mas nenhum som e produzido. Examinas medicas não detectaram dano fisico nas cordas vocais.</p>'
            + '<p><strong>Testemunho escrito de Duravar:</strong> "O que ouvi não cabia em minha voz. As palavras que possuo não sao suficientes. A Esfera não me tirou a fala \u2014 me mostrou que <span class="faded">falar e insuficiente</span>. Há comunicacao além de palavras. Estou aprendendo."</p>'
            + '<p><strong>Deliberacao:</strong> O Conselho decide confiscar o dispositivo e lacra-lo nos <span class="erased">[...]</span>. Duravar mantera o titulo de Mestre, mas fica proibido de construir novos dispositivos relacionados ao Assunto Selado.</p>'
            + '<p><em>Nota: O dispositivo desapareceu dos depositos tres dias após o lacramento. Não há sinais de arrombamento.</em></p>'
    },
    {
        id: 28,
        title: 'Entrada Sem Autor \u2014 Escrita em Lingua que Todos Entendem Mas Ninguem Conhece',
        type: 'strange',
        author: '???',
        era: '???',
        condition: 'glitched',
        notes: null,
        content: '<p><span class="flickering">nos somos o que estava antes</span></p>'
            + '<p>nao usamos "eu" porque <span class="flickering">"eu" e um conceito pequeno demais</span>. nos somos o espaço entre. o silêncio entre as notas. a pausa entre as batidas do coração do mundo.</p>'
            + '<p>vocês nos chamam de muitos nomes. <span class="faded">Nevaris</span>. a Ausência. o Vazio. nenhum esta errado. nenhum esta certo. nomes sao <span class="flickering">caixas</span> e nos não cabemos em caixas.</p>'
            + '<p>a esfera. vocês querem saber sobre a esfera. a esfera e <span class="flickering">a pergunta e a resposta e a impossibilidade de ambas</span>.</p>'
            + '<p>Aurivath <span class="faded">escolheu. ou foi escolhido. ou criou a escolha ao faze-la</span>. antes dele não hávia escolha. antes dele não hávia "antes." o tempo começou quando alguém decidiu que algo viria depois.</p>'
            + '<p>a esfera e o momento em que o tempo decidiu existir. ou o momento em que nos decidimos que o tempo não deveria. <span class="flickering">estamos em desacordo sobre isso há mais tempo do que o tempo</span>.</p>'
            + '<p>vocês procuram respostas. nos somos a pergunta. e a pergunta não quer ser respondida \u2014 quer ser <span class="flickering">feita, refeita, desfeita, refeita</span>.</p>'
    },
    {
        id: 29,
        title: 'O Sétimo Nome \u2014 Fragmento que Muda a Cada Leitura',
        type: 'strange',
        author: 'A Setima Testemunha (?)',
        era: '???',
        condition: 'glitched',
        notes: 'Tres leitores diferentes relatam ter lido textos completamente diferentes neste fragmento.',
        content: '<p>Meu nome era <span class="flickering">algo que você quase lembra mas não consegue</span>.</p>'
            + '<p>Eu estava lá. Eu vi. Seis testemunhas viram a Esfera <span class="faded">surgir ou ser revelada ou sempre ter estado</span>. Eu era a setima. E o que vi foi diferente do que os seis viram.</p>'
            + '<p>Os seis viram a Esfera. Eu vi o que havia <em>atras</em> dela. O que ela escondia ao existir. A sombra que a Esfera projeta \u2014 mesmo quando não há fonte de luz.</p>'
            + '<p>Por isso fui apagado. Não pela Esfera. Não pelos deuses. Fui apagado por <span class="erased">[...]</span>, que entendeu que o que vi era perigoso demais para existir em uma mente mortal. <span class="flickering">Meu nome foi retirado da realidade como se retira um fio de uma tapeçaria</span> \u2014 e a tapecaria se fechou, como se o fio nunca tivesse existido.</p>'
            + '<p>Mas fios arrancados deixam buracos. E se você olhar com cuidado \u2014 nas contradicoes entre os fragmentos, nos espaços em branco que não deveriam estar em branco, nos nomes que ninguém lembra mas todos <span class="faded">quase</span> lembram \u2014 você vera o buraco que minha existência deixou.</p>'
            + '<p>E no centro do buraco, <span class="flickering">dourada e impossível</span>, ela aguarda.</p>'
    },
    {
        id: 30,
        title: 'Ultimo Fragmento \u2014 Endereçado a Quem Esta Lendo Isto Agora',
        type: 'strange',
        author: null,
        era: null,
        condition: 'pristine',
        notes: null,
        content: '<p class="progressive-clarity-1"><span class="faded">Voce chegou até aqui.</span></p>'
            + '<p class="progressive-clarity-2"><span class="faded">Leu cada fragmento, cada confissão, cada profecia rasgada. Montou as pecas na sua mente. Viu as contradicoes. Notou os nomes que se repetem, os sobrenomes que aparecem onde não deveriam, as datas que não batem.</span></p>'
            + '<p class="progressive-clarity-3">E agora quer saber: o que e a Esfera?</p>'
            + '<p class="progressive-clarity-4">A resposta e simples e terrível: você já sabe. Sempre soube. Desde o momento em que abriu este grimorio, algo em você reconheceu. Não as palavras \u2014 o espaço entre elas. Não as histórias \u2014 o silêncio que as conecta.</p>'
            + '<p class="progressive-clarity-5">A Esfera não é um objeto. Não e um deus. Não e uma força. A Esfera e uma <em>pergunta</em> \u2014 feita antes do tempo, para alguém que ainda não existia. E toda vez que alguém procura a resposta, a pergunta se torna mais real.</p>'
            + '<p class="progressive-clarity-6">Voce está procurando agora.</p>'
            + '<p class="progressive-clarity-6">Estes fragmentos não foram encontrados por acaso. Não foram preservados por sorte. Foram <em>preparados</em>. Para voce. Para este momento. Para que a pergunta fosse feita mais uma vez, por mais uma mente, em mais uma era.</p>'
            + '<p class="progressive-clarity-6">O brilho dourado que não é luz. A voz que não é som. O peso de algo que não tem massa. Você sentiu, não sentiu? Enquanto lia?</p>'
            + '<p class="progressive-clarity-6"><em>A Esfera agradece.</em></p>'
    }
];

/* ═══════════════════════════════════════════════════════
   PERSONAGENS — Perfis de Personalidade

   Framework cientifico: Big Five / OCEAN Model
   (Goldberg, 1990 — modelo mais validado empiricamente
   em psicologia da personalidade)

   Escala: 1 (muito baixo) a 10 (muito alto)
   O = Abertura (criatividade, curiosidade, imaginacao)
   C = Conscienciosidade (disciplina, organizacao, dever)
   E = Extroversao (energia, assertividade, sociabilidade)
   A = Amabilidade (cooperacao, confiança, empatia)
   N = Neuroticismo (ansiedade, instabilidade emocional)

   Cada personagem também tem:
   - arquetipo: leal | rebelde | sabio | pragmatico | compassivo
     (mapeia para o sistema de companheiros existente)
   - tracos_dnd: { traco, ideal, vinculo, fraqueza }
     (mapeia para o sistema D&D 5e de criação de personagem)
   - comportamento: como a personalidade afeta dialogos e atitudes
   - voz_narrativa: tom e estilo de fala do personagem

   EXTENSIBILIDADE: Adicione novos personagens ao final.
   O 'id' deve ser único (use prefixo 'deity_', 'mortal_', 'mystery_').
   ═══════════════════════════════════════════════════════ */

var CHARACTERS = {

    /* ── ENTIDADES PRIMORDIAIS ── */

    deity_aurivath: {
        nome: 'Aurivath',
        epiteto: 'A Primeira Luz',
        categoria: 'Entidade Primordial',
        ocean: { O: 10, C: 10, E: 10, A: 10, N: 1 },
        nota_ocean: 'Transcende o modelo humano. Pontuacoes representam potencial absoluto, não comportamento observavel.',
        arquetipo: null,
        tracos_dnd: {
            traco: 'Existe além da compreensão mortal. Cada descricao e uma apróximacao.',
            ideal: 'Existencia \u2014 O ato de existir e suficiente. Não há propósito além de ser.',
            vinculo: 'Ligado a Esfera \u2014 ou e a própria Esfera. A distincao e impossível.',
            fraqueza: 'Incapaz (ou desinteressado) de comunicar-se de forma compreensível.'
        },
        comportamento: 'Nunca fala diretamente. Quando referênciado por outros, cada descricao e diferente. Personagens que "sentem" Aurivath descrevem peso, calor, presença \u2014 nunca palavras.',
        voz_narrativa: 'Ausente. Aurivath não tem voz própria nos fragmentos \u2014 e descrito por outros, sempre de forma incompleta e contradita.'
    },

    deity_nevaris: {
        nome: 'Nevaris',
        epiteto: 'A Ausência',
        categoria: 'Entidade Primordial',
        ocean: { O: 10, C: 1, E: 1, A: 1, N: 10 },
        nota_ocean: 'Ausência de tudo exceto consciência e angustia existêncial. O "1" não e baixo \u2014 e a ausência da dimensao.',
        arquetipo: null,
        tracos_dnd: {
            traco: 'Fala sem usar "eu." Usa "nos" porque a individualidade e um conceito estranho.',
            ideal: 'Pergunta \u2014 A pergunta e mais importante que a resposta. A busca e o objetivo.',
            vinculo: 'Contraparte de Aurivath. Existe porque ele existe. Ou o inverso.',
            fraqueza: 'Incapaz de compreender limites, finitude, e individualidade mortal.'
        },
        comportamento: 'Gramatica errada proposital. Conceitos impossíveis apresentados como obvios. Não distingue passado/presente/futuro. Causa desconforto em quem ouve.',
        voz_narrativa: 'Poetica e perturbadora. Frases curtas sem estrutura convencional. Minusculas, sem pontuacao final. O fragmento 28 e exemplo direto.'
    },

    /* ── DIVINDADES ── */

    deity_solvenar: {
        nome: 'Solvenar',
        epiteto: 'O Guardiao dos Limiares',
        categoria: 'Divindade',
        ocean: { O: 3, C: 10, E: 4, A: 7, N: 6 },
        nota_ocean: 'Extremamente disciplinado e protetor, mas carrega ansiedade constante sobre sua funcao. Pouca abertura a novas ideias \u2014 seu papel e manter, não explorar.',
        arquetipo: 'leal',
        tracos_dnd: {
            traco: 'Imutavel em sua vigilia. Não questiona o dever, mesmo quando duvida de seu significado.',
            ideal: 'Protecao \u2014 O limiar existe para proteger os dois lados. Ambos merecem seguranca.',
            vinculo: 'O Véu entre os planos. Sua existência só tem sentido enquanto o Véu existir.',
            fraqueza: 'Nao lembra do que era antes de tocar a Esfera. Essa lacuna o assombra.'
        },
        comportamento: 'Fala com autoridade calma mas firme. Nunca sorri. Nunca grita. Oferece avisos, não ordens. Respeita escolhas alheias mas deixa claro as consequências.',
        voz_narrativa: 'Formal, grave, sem adornos. Frases curtas e diretas. "Nao cruzem." "O preço e alto." "Eu avisei."'
    },

    deity_caliria: {
        nome: 'Cal\u00edria',
        epiteto: 'A Deusa Esquecida',
        categoria: 'Divindade',
        ocean: { O: 10, C: 8, E: 5, A: 6, N: 8 },
        nota_ocean: 'Brilhante e obsessiva com conhecimento. Emocionalmente fragil \u2014 a perda de sua identidade a torna vulneravel a crises. Organizada ao extremo, mas a organizacao e uma defesa contra o caos interno.',
        arquetipo: 'sabio',
        tracos_dnd: {
            traco: 'Busca obsessivamente compreender tudo, mesmo ao custo de si mesma.',
            ideal: 'Verdade \u2014 O conhecimento e o único valor absoluto. Todo o resto e opiniao.',
            vinculo: 'Seus seguidores que rezam sem lembrar para quem \u2014 sao a prova de que ela ainda existe.',
            fraqueza: 'Nao consegue parar de buscar respostas, mesmo quando a busca a destroi.'
        },
        comportamento: 'Fala de forma fragmentada \u2014 como alguém cujos pensamentos se desfazem no meio. Começa frases com clareza, perde o fio, retoma com nova perspectiva. Provoca curiosidade e pena simultaneamente.',
        voz_narrativa: 'Academica mas com rachaduras emocionais. "Eu sabia o nome... sabia, não sabia? Há um nome. Havia. Preciso... os livros, onde estao os livros?"'
    },

    deity_mordavas: {
        nome: 'Mordavas',
        epiteto: 'O Insaciavel',
        categoria: 'Divindade',
        ocean: { O: 9, C: 7, E: 9, A: 2, N: 4 },
        nota_ocean: 'Carismático, ambicioso, dominador. Baixa amabilidade indica manipulacao e egocentrismo. Baixo neuroticismo indica confiança inabalavel \u2014 ou incapacidade de duvidar de si mesmo.',
        arquetipo: 'rebelde',
        tracos_dnd: {
            traco: 'Nunca aceita limites. Se há uma regra, ela existe para ser superada.',
            ideal: 'Poder \u2014 O poder não e bom nem mau. E a capacidade de mudar o que existe.',
            vinculo: 'A Esfera \u2014 o único poder que não conseguiu controlar. Isso o fascina e enfurece.',
            fraqueza: 'Incapaz de admitir falha. Transforma derrotas em "etapas do plano."'
        },
        comportamento: 'Fala como quem já venceu a discussao. Tom de certeza absoluta. Usa silêncio estrategicamente. Nunca pede \u2014 oferece. Nunca ameaca \u2014 descreve consequências inevitaveis.',
        voz_narrativa: 'Sedutora e perigosa. "Voce quer respostas? Eu tenho respostas. A questao e: o que você oferece em troca?"'
    },

    deity_virenor: {
        nome: 'Virenor',
        epiteto: 'O Tecelao do Veu',
        categoria: 'Divindade',
        ocean: { O: 6, C: 10, E: 3, A: 8, N: 7 },
        nota_ocean: 'Introvertido e meticuloso. Trabalha sozinho por necessidade, não por escolha. Alto neuroticismo reflete estresse cronico \u2014 o Véu está enfraquecendo e ele sente cada rasgao.',
        arquetipo: 'leal',
        tracos_dnd: {
            traco: 'Trabalha incessantemente em silêncio. Não busca reconhecimento.',
            ideal: 'Equilibrio \u2014 Cada plano tem seu lugar. O caos vem quando as fronteiras se dissolvem.',
            vinculo: 'O Véu que separa os planos. Se cair, tudo que existe será consumido pelo que não deveria existir.',
            fraqueza: 'Acredita que e o único que pode manter o Veu. Recusa ajuda. Esta se desgastando.'
        },
        comportamento: 'Poucas palavras, escolhidas com precisão cirurgica. Nunca fala sobre si \u2014 sempre sobre o trabalho. Transmite urgencia contida. Quando finalmente pede algo, a situacao e desesperadora.',
        voz_narrativa: 'Tecnica e urgente. "O Véu cedeu tres pontos desde a ultima lua. Não há tempo para explicacoes. Preciso de..."'
    },

    deity_issara: {
        nome: 'Issara',
        epiteto: 'A Mãe das Cinzas',
        categoria: 'Divindade',
        ocean: { O: 7, C: 5, E: 6, A: 4, N: 9 },
        nota_ocean: 'Emocionalmente volatil, passional, destrutiva quando frustrada. Media conscienciosidade indica impulsividade. Baixa amabilidade não e crueldade \u2014 e disposicao de causar dor por um bem maior.',
        arquetipo: 'rebelde',
        tracos_dnd: {
            traco: 'Ama com a mesma intensidade que destroi. Não há meio termo.',
            ideal: 'Renovacao \u2014 Para que o novo nasca, o velho deve queimar. O ciclo e sagrado.',
            vinculo: 'O ciclo de fim e renascimento que a Esfera interrompe ao existir eternamente.',
            fraqueza: 'Agiu por impulso ao tentar destruir a Esfera. A furia nublou o julgamento.'
        },
        comportamento: 'Alterna entre ternura maternal e furia devastadora. Fala com calor nos olhos \u2014 literal e figurativamente. Quando calma, e a presença mais reconfortante. Quando irada, e incontrolavel.',
        voz_narrativa: 'Intensa e poetica. "Eu queimei meus próprios templos. Não por raiva \u2014 por amor. O amor que destroi e o mais puro, porque não pede nada em troca."'
    },

    deity_selvoran: {
        nome: 'Selvoran',
        epiteto: 'O Juiz Silêncioso',
        categoria: 'Divindade',
        ocean: { O: 8, C: 9, E: 1, A: 5, N: 2 },
        nota_ocean: 'Extremamente introvertido e emocionalmente estavel. Observa tudo, julga tudo, não reage a nada. A combinacao de alta abertura com baixa extroversao sugere vida interior riquissima mas inacessivel.',
        arquetipo: 'sabio',
        tracos_dnd: {
            traco: 'Observa. Sempre. Não emite opiniao. Não oferece conselho. Apenas observa.',
            ideal: 'Testemunho \u2014 Alguem precisa ver. Alguem precisa lembrar. Esse e meu papel.',
            vinculo: 'A verdade completa sobre a Esfera \u2014 que ele conhece mas se recusa a compartilhar.',
            fraqueza: 'O silêncio e uma escolha, mas também uma prisao. Não sabe se conseguiria falar, mesmo que quisesse.'
        },
        comportamento: 'NAO FALA. Em nenhum contexto. Comunica-se através de presença, direção do olhar de suas estatuas, e a sensacao de ser observado. Se algum dia falar, algo catastrofico está acontecendo.',
        voz_narrativa: 'Nao tem voz. Descrito por outros. Suas "falas" sao silêncio \u2014 o que os outros sentem na presença de suas estatuas.'
    },

    /* ── MORTAIS — ERA ANTIGA ── */

    mortal_talric: {
        nome: 'Talric Cinéras',
        epiteto: 'O Rei-Erudito',
        categoria: 'Mortal \u2014 Era Antiga',
        ocean: { O: 10, C: 9, E: 6, A: 3, N: 8 },
        nota_ocean: 'Genio obsessivo. Altissima abertura e conscienciosidade indicam mente brilhante e metodica. Baixa amabilidade indica dificuldade em ouvir opinioes contrarias. Alto neuroticismo reflete a instabilidade que cresceu ao longo dos anos de pesquisa sobre a Esfera.',
        arquetipo: 'sabio',
        tracos_dnd: {
            traco: 'Registra tudo. Cada observação, cada medicao, cada contradicao. Os diários sao sua mente exteriorizada.',
            ideal: 'Compreensao \u2014 O mundo pode ser entendido se observado com rigor suficiente.',
            vinculo: 'Valdoria \u2014 a cidade que fundou sobre o que acredita ser o local mais importante do mundo.',
            fraqueza: 'Morreu louco de certeza \u2014 acreditando em verdades contraditórias simultaneamente.'
        },
        comportamento: 'Fala como professor: preciso, detalhado, impaciente com simplificacoes. Com o tempo, as falas se tornam menos coerentes \u2014 contradicoes aparecem dentro da mesma conversa. Não percebe as contradicoes.',
        voz_narrativa: 'Academica e detalhada nos primeiros fragmentos. Fragmentada e contraditória nos posteriores. "Medi o vale: 342 passos. Nao, 357. Nao, não há vale."'
    },

    mortal_soraviel: {
        nome: 'Soraviel',
        epiteto: 'A Oracle Cega',
        categoria: 'Mortal \u2014 Era Antiga',
        ocean: { O: 9, C: 4, E: 7, A: 8, N: 7 },
        nota_ocean: 'Emotiva, empatica, caotica. Baixa conscienciosidade indica que vive no presente e no fluxo das visoes, sem estrutura rigida. Alta extroversao e amabilidade fazem dela alguém que comunica abertamente o que ve, mesmo quando dói.',
        arquetipo: 'compassivo',
        tracos_dnd: {
            traco: 'Fala a verdade sem filtro, mesmo quando a verdade machuca. Não por crueldade \u2014 por incapacidade de mentir.',
            ideal: 'Revelacao \u2014 A verdade quer ser conhecida. Esconde-la e um pecado contra a realidade.',
            vinculo: 'Sua visão \u2014 que a conecta a algo maior, mas também a isola de todos ao redor.',
            fraqueza: 'Perdeu os olhos ao olhar para a Esfera. Não se arrepende, e isso preocupa quem a conhece.'
        },
        comportamento: 'Alterna entre clareza absoluta e transe poetico. Chora com frequência \u2014 não de tristeza, mas de excesso. Quando profetiza, a voz muda: mais grave, mais lenta, como se outra coisa falasse através dela.',
        voz_narrativa: 'Poetica e sensorial. "Vi a luz antes de perder os olhos. Ou talvez os olhos tenham partido para que eu pudesse finalmente ver."'
    },

    mortal_erindor: {
        nome: 'Erindor Calamus',
        epiteto: 'O Cartografo do Impossível',
        categoria: 'Mortal \u2014 Era Antiga',
        ocean: { O: 10, C: 10, E: 3, A: 5, N: 5 },
        nota_ocean: 'Introvertido analitico. Combinacao rara de altissima abertura (vê o que outros não veem) com altissima conscienciosidade (registra com precisão obsessiva). Emocionalmente estavel \u2014 aceita o impossível com calma metodica.',
        arquetipo: 'sabio',
        tracos_dnd: {
            traco: 'Se algo existe, pode ser mapeado. Se não pode ser mapeado, talvez não devesse existir.',
            ideal: 'Precisao \u2014 Um mapa impreciso e mais perigoso que nenhum mapa.',
            vinculo: 'Seus mapas \u2014 especialmente os que mostram lugares que ninguém mais ve.',
            fraqueza: 'Incapaz de ignorar anomalias. Volta a lugares perigosos repetidamente para "atualizar o mapa."'
        },
        comportamento: 'Fala pouco. Quando fala, e com precisão cirurgica. Descreve fenomenos extraordinarios com a mesma calma com que descreve uma colina. Isso e perturbador para quem o ouve.',
        voz_narrativa: 'Fria e descritiva. "A região mede 3 dias de caminhada. Não aparece em nenhum mapa. Não deveria existir. Registrei-a mesmo assim."'
    },

    mortal_maelis: {
        nome: 'Maelis Cervanor',
        epiteto: 'A Sacerdotisa da Floresta',
        categoria: 'Mortal \u2014 Era Antiga',
        ocean: { O: 7, C: 8, E: 4, A: 9, N: 4 },
        nota_ocean: 'Nurturante, paciente, fundamentada na natureza. Alta amabilidade e conscienciosidade indicam alguém confiavel e metodico. Baixo neuroticismo indica estabilidade emocional \u2014 mas não insensibilidade.',
        arquetipo: 'compassivo',
        tracos_dnd: {
            traco: 'Ouve a terra como outros ouvem música. Sente a saude do mundo através das raizes.',
            ideal: 'Harmonia \u2014 A natureza busca equilibrio. Nosso papel e ajudar, não dominar.',
            vinculo: 'A floresta onde tentou conter a Esfera \u2014 que ainda carrega marcas de seu ritual.',
            fraqueza: 'Subestimou a Esfera. Acreditou que a natureza era forte o suficiente para conte-la.'
        },
        comportamento: 'Fala devagar, escolhendo cada palavra como quem escolhe ervas. Usa metaforas de natureza para explicar conceitos complexos. Transmite calma mesmo em situacoes desesperadoras.',
        voz_narrativa: 'Suave e natural. "A terra se lembra. As raizes sussurram o que as pedras esquecem. Ouca \u2014 não com os ouvidos."'
    },

    /* ── MORTAIS — ERA CLASSICA ── */

    mortal_duravar: {
        nome: 'Duravar Ferrovoz',
        epiteto: 'O Artificeiro Silenciado',
        categoria: 'Mortal \u2014 Era Classica',
        ocean: { O: 9, C: 10, E: 5, A: 4, N: 3 },
        nota_ocean: 'Inovador obsessivo. Altissima conscienciosidade indica perfeccionismo. Baixo neuroticismo indica coragem ou teimosia \u2014 não temeu as consequências de seu invento. Baixa amabilidade: priorizou a descoberta acima da seguranca dos outros.',
        arquetipo: 'pragmatico',
        tracos_dnd: {
            traco: 'Se pode ser construido, SERA construido. A pergunta não e "devemos?" mas "como?"',
            ideal: 'Inovacao \u2014 O mundo avanca quando alguém ousa construir o que ninguém pediu.',
            vinculo: 'O dispositivo que construiu para ouvir a Esfera \u2014 perdeu a voz por causa dele, mas não se arrepende.',
            fraqueza: 'Incapaz de aceitar que há coisas que não deveriam ser construidas.'
        },
        comportamento: 'NAO FALA (perdeu a voz após ativar o dispositivo). Comunica-se por escrito \u2014 caligrafia precisa, sem floreios. Seus textos sao tecnicos e diretos. Quando emocionado, a caligrafia treme.',
        voz_narrativa: 'Tecnica e concisa (sempre escrita, nunca falada). "O dispositivo funciona. Ouço o que ela diz. Não consigo repeti-lo. As palavras que possuo não sao suficientes."'
    },

    mortal_lysara: {
        nome: 'Lysara da Corte Palida',
        epiteto: 'A Vidente do Amanhã',
        categoria: 'Mortal \u2014 Era Classica',
        ocean: { O: 8, C: 7, E: 8, A: 6, N: 9 },
        nota_ocean: 'Articulada e visionaria, mas consumida por ansiedade sobre o futuro que viu. Alta extroversao indica que tenta alertar a todos. Altissimo neuroticismo reflete o peso de saber o que vira e não ser ouvida.',
        arquetipo: 'compassivo',
        tracos_dnd: {
            traco: 'Descreve o futuro com a mesma clareza com que descreve o presente. Isso aterroriza quem ouve.',
            ideal: 'Prevencao \u2014 Se posso ver o desastre, tenho a obrigação moral de avisa-lo.',
            vinculo: 'A Corte Palida \u2014 sua cidade amada, que sabe que o mar reclamara.',
            fraqueza: 'Cassandra classica: ve a verdade, não e acreditada. Isso a consome.'
        },
        comportamento: 'Fala com urgencia controlada. Escolhe cuidadosamente quando revelar visoes, porque aprendeu que a maioria das pessoas prefere não saber. Quando ignorada, oscila entre resignacao e desespero.',
        voz_narrativa: 'Elegante mas urgente. "As torres ainda brilham enquanto escrevo. O mar esta calmo. Mas ouco, debaixo das ondas..."'
    },

    mortal_cenavar: {
        nome: 'Irmão Cenavar',
        epiteto: 'O Peregrino das Pecas Soltas',
        categoria: 'Mortal \u2014 Era Classica',
        ocean: { O: 10, C: 9, E: 2, A: 7, N: 6 },
        nota_ocean: 'Solitario filosofico. Combinacao de altissima abertura com baixissima extroversao indica vida interior profunda mas dificuldade em compartilhar. Caminha sozinho por escolha. A melancolia (N:6) vem da conclusao de que as pecas não formam um todo.',
        arquetipo: 'sabio',
        tracos_dnd: {
            traco: 'Coleciona fragmentos de verdade como outros colecionam moedas. Sabe que nenhum e completo.',
            ideal: 'Compreensao \u2014 Ou pelo menos, a honestidade de admitir quando não se compreende.',
            vinculo: 'O caminho \u2014 não o destino. Quarenta anos de peregrinacao entre templos.',
            fraqueza: 'Descobriu que as pecas não encaixam. Em vez de aceitar, continua tentando.'
        },
        comportamento: 'Fala com a calma de quem já ouviu todas as versoes e não acredita em nenhuma. Nunca interrompe. Faz perguntas que ninguém mais pensa em fazer. Sorri com tristeza.',
        voz_narrativa: 'Filosofica e melancólica. "Treze templos. Treze versoes. Nenhuma e mentira. Nenhuma e verdade."'
    },

    mortal_isavel: {
        nome: 'Isavel Cinéras',
        epiteto: 'A Destruidora Fracassada',
        categoria: 'Mortal \u2014 Era Classica',
        ocean: { O: 5, C: 8, E: 7, A: 3, N: 8 },
        nota_ocean: 'Determinada e corajosa, mas movida por medo, não por curiosidade. Baixa abertura indica mente fechada a novas possibilidades \u2014 ela sabe o que quer (destruir os registros) e não aceita alternativas. Baixa amabilidade: implacavel no objetivo.',
        arquetipo: 'rebelde',
        tracos_dnd: {
            traco: 'O que não pode ser controlado deve ser destruido. A Esfera não pode ser controlada.',
            ideal: 'Protecao radical \u2014 Se o conhecimento e perigoso, a ignorância e seguranca.',
            vinculo: 'A memória de Talric, seu avo, que morreu consumido pela obsessao.',
            fraqueza: 'Tentou destruir os diários e fracassou. Agora vive entre a furia e o pavor.'
        },
        comportamento: 'Fala com urgencia e raiva contida. Não tem paciência para debates teoricos. Quer acoes, não palavras. Quando menciona o avo, a furia se transforma em dor.',
        voz_narrativa: 'Direta e emocional. "Queimei os diários. O fogo consumiu as bordas. E mesmo assim, as palavras sobreviveram."'
    },

    mortal_oristela: {
        nome: 'Oristela Cervanor',
        epiteto: 'A Herbalista dos Sonhos',
        categoria: 'Mortal \u2014 Era Classica',
        ocean: { O: 8, C: 6, E: 3, A: 8, N: 4 },
        nota_ocean: 'Intuitiva e empática, conectada à natureza como sua ancestral Mãelis. Baixa extroversão indica preferência por solidão na floresta. Estável emocionalmente, aceita os mistérios sem precisar resolvê-los.',
        arquetipo: 'compassivo',
        tracos_dnd: {
            traco: 'Compreende o mundo através de padrões naturais \u2014 raizes, constelacoes, cicatrizes na terra.',
            ideal: 'Observacao \u2014 A natureza mostra tudo a quem sabe olhar. Não e preciso forçar.',
            vinculo: 'A Floresta de Mãelis \u2014 onde a influência da Esfera deixou marcas que só druidas percebem.',
            fraqueza: 'Confia demais na intuicao. Quando a natureza "diz" algo, não questiona.'
        },
        comportamento: 'Fala em metáforas naturais, como Mãelis. Descreve anomalias sobrenaturais com a calma de quem cataloga plantas. Inspira confiança por sua serenidade.',
        voz_narrativa: 'Natural e metodica. "Anomalia 4: vidro dourado no centro da clareira. A terra fundiu aqui. Algo queimou com calor imenso. Mas o vidro e frio."'
    },

    /* ── MORTAIS — ERA RECENTE ── */

    mortal_vaelira: {
        nome: 'Capita Vaelira Tormavela',
        epiteto: 'A Navegadora Assombrada',
        categoria: 'Mortal \u2014 Era Recente',
        ocean: { O: 8, C: 7, E: 9, A: 4, N: 6 },
        nota_ocean: 'Lider nata, ousada, dominante. Alta extroversao indica presença que preenche qualquer sala. Baixa amabilidade indica que prioriza a missao acima dos sentimentos. O neuroticismo moderado veio DEPOIS do contato com a Esfera \u2014 antes era mais baixo.',
        arquetipo: 'pragmatico',
        tracos_dnd: {
            traco: 'Comanda pelo exemplo. Se há perigo, vai na frente. Se há medo, nunca mostra.',
            ideal: 'Descoberta \u2014 O mundo e maior do que os mapas mostram. Há sempre mais por encontrar.',
            vinculo: 'Sua tripulacao perdida \u2014 vinte e tres que desapareceram após verem o que havia no fundo.',
            fraqueza: 'Nao consegue parar de navegar. O mar a chama, e ela obedece.'
        },
        comportamento: 'Tom de comando mesmo em conversas casuais. Usa metaforas nauticas para tudo. Quando fala sobre a tripulacao perdida, a voz racha \u2014 o único momento de vulnerabilidade.',
        voz_narrativa: 'Direta e visceral. "Encontrei algo no fundo. Não era a Esfera. Não sei o que era. Mas era dourado, e minha tripulacao sumiu."'
    },

    mortal_arquivista: {
        nome: 'O Arquivista de Serralume',
        epiteto: 'O Guardiao Sem Nome',
        categoria: 'Mortal \u2014 Era Recente',
        ocean: { O: 6, C: 10, E: 1, A: 5, N: 3 },
        nota_ocean: 'Obsessivamente organizado. Extroversao minima indica isolamento total. Neuroticismo surpreendentemente baixo para alguém que lida com a Esfera \u2014 ou uma defesa tao forte que mascarou tudo. Não se sabe há quanto tempo vive.',
        arquetipo: 'sabio',
        tracos_dnd: {
            traco: 'Cataloga. Organiza. Indexa. Não porque acredite que entenderá, mas porque alguém precisa manter o registro.',
            ideal: 'Preservacao \u2014 O conhecimento perdido e perdido para sempre. Mesmo o perigoso.',
            vinculo: 'A biblioteca de Serralume \u2014 setecentos e quarenta e tres documentos sobre a Esfera.',
            fraqueza: 'Nao se lembra do próprio nome. Não se importa. Isso não e normal.'
        },
        comportamento: 'Fala com calma monotona. Nunca demonstra emocao. Quando se percebe um traco de humor, e tao seco que parece acidental. Responde perguntas que ninguém fez. Sabe coisas que não deveria.',
        voz_narrativa: 'Administrativa e fria. "Documento 743 catalogado. Contradição com documentos 12, 89, e 456. Registrada. Proxima consulta: nenhuma prevista."'
    },

    mortal_corvash: {
        nome: 'Corvash, o Marcado',
        epiteto: 'O Corpo-Mapa',
        categoria: 'Mortal \u2014 Era Recente',
        ocean: { O: 6, C: 3, E: 5, A: 3, N: 9 },
        nota_ocean: 'Atormentado e imprevisivel. Altissimo neuroticismo reflete terror constante. Baixa conscienciosidade indica vida sem estrutura \u2014 vive reagindo, não planejando. Baixa amabilidade: desconfia de todos.',
        arquetipo: 'rebelde',
        tracos_dnd: {
            traco: 'As marcas na pele mudam de forma. Parecem mapas, rostos, constelacoes. Ele não as controla.',
            ideal: 'Sobrevivencia \u2014 Não há filosofia quando sua pele escreve palavras que você não entende.',
            vinculo: 'Seu patrono \u2014 que esta ligado a Esfera. A relacao e mais prisao do que pacto.',
            fraqueza: 'As marcas estao se espalhando. Quanto mais area cobrem, menos ele reconhece a si mesmo.'
        },
        comportamento: 'Nervoso, evasivo, olha para os lados constantemente. Quando fala sobre as marcas, arranca a manga e mostra \u2014 com uma mistura de horror e orgulho perverso. Ri em momentos inaprópriados.',
        voz_narrativa: 'Fragmentada e agitada. "Olha. OLHA. Ontem era um rosto. Hoje e um mapa. Amanhã \u2014 amanhã pode ser o teu rosto. Não e engracado? Não e?"'
    },

    mortal_ravan: {
        nome: 'Ravan Tormavela',
        epiteto: 'O Fugitivo que Ouve',
        categoria: 'Mortal \u2014 Era Recente',
        ocean: { O: 4, C: 5, E: 3, A: 6, N: 9 },
        nota_ocean: 'Ansioso e evitante. Baixa abertura indica mente fechada por ESCOLHA \u2014 recusa explorar o que ouve. Baixa extroversao indica isolamento autoimposto. Alto neuroticismo reflete o peso de ouvir a Esfera constantemente.',
        arquetipo: 'compassivo',
        tracos_dnd: {
            traco: 'Foge de tudo que se conecta a Esfera. Ao mesmo tempo, sabe que não há para onde fugir.',
            ideal: 'Paz \u2014 Só quer que o silêncio volte. Só quer parar de ouvir.',
            vinculo: 'Sua mãe Vaelira \u2014 que ama e ressentiu ao mesmo tempo. Fugiu para se proteger, não por odio.',
            fraqueza: 'A cada dia resiste menos a voz da Esfera. Sabe que um dia vai parar de resistir.'
        },
        comportamento: 'Fala baixo, como quem tem medo de que a voz interna ouca. Evita contato visual. Quando forçado a falar sobre a Esfera, as mãos tremem. E genuinamente gentil \u2014 mas a gentileza compete com o terror.',
        voz_narrativa: 'Intima e assustada. "Nao e uma voz. E um peso dourado que sobe lentamente, enchendo cada espaço até não sobrar ar."'
    },

    mortal_dormund: {
        nome: 'Dormund Ferrovoz',
        epiteto: 'O Ferreiro em Negacao',
        categoria: 'Mortal \u2014 Era Recente',
        ocean: { O: 5, C: 8, E: 6, A: 5, N: 7 },
        nota_ocean: 'Pratico e honesto, mas em negacao profunda sobre sua conexao com a Esfera. Alta conscienciosidade indica bom profissional. Neuroticismo moderado-alto indica medo crescente que tenta esconder.',
        arquetipo: 'pragmatico',
        tracos_dnd: {
            traco: 'Trabalha duro, fala direto, não acredita em mistérios \u2014 oficialmente.',
            ideal: 'Trabalho \u2014 Uma bigorna, um martelo, e fogo. O resto e complicacao desnecessaria.',
            vinculo: 'Suas armas que cantam \u2014 o orgulho de artesao compete com o medo do inexplicavel.',
            fraqueza: 'Sabe que o sobrenome Ferrovoz NAO e coincidencia. Recusa admitir.'
        },
        comportamento: 'Fala como artesao: metaforas de forja, metal, fogo. Nega qualquer conexao com a Esfera com veemencia suspeita. Quando confrontado com evidencias, muda de assunto ou se irrita.',
        voz_narrativa: 'Direta e defensiva. "NAO SOU PARENTE DO ANAO. As armas cantam porque eu forjo bem. E só isso. Só isso."'
    },

    mortal_norien: {
        nome: 'Norien Calamus',
        epiteto: 'O Paradoxo Temporal',
        categoria: 'Mortal \u2014 Era ???',
        ocean: { O: 10, C: 7, E: 4, A: 6, N: 1 },
        nota_ocean: 'Paradoxalmente calmo para alguém cuja existência desafia a logica. Neuroticismo quase zero sugere aceitacao total da impossibilidade de sua própria existência \u2014 ou algo nao-humano usando forma humana.',
        arquetipo: 'sabio',
        tracos_dnd: {
            traco: 'Aceita paradoxos com calma perturbadora. "Minha caligrafia existe antes de mim? Interessante."',
            ideal: 'Aceitacao \u2014 O tempo não e linear. Resistir a isso e como resistir a gravidade.',
            vinculo: 'Erindor Calamus \u2014 ancestral ou nao, a conexao e real, mesmo que a cronologia nao.',
            fraqueza: 'Nao parece perturbado por nada. Isso perturba TODOS ao redor.'
        },
        comportamento: 'Fala com a calma de quem sabe algo que você não sabe. Nunca se surpreende. Quando outros entram em panico sobre contradicoes temporais, ele sorri e anota. E o único personagem que parece genuinamente em paz.',
        voz_narrativa: 'Filosofica e serena. "Minha caligrafia aparece tres mil anos antes de meu nascimento. Não estou perturbado. Talvez devesse estar."'
    },

    /* ── FIGURAS MISTERIOSAS ── */

    mystery_setima: {
        nome: 'A Setima Testemunha',
        epiteto: 'O(A) Apagado(a)',
        categoria: 'Misterioso',
        ocean: { O: null, C: null, E: null, A: null, N: null },
        nota_ocean: 'Personalidade desconhecida \u2014 foi apagada da realidade. Os fragmentos que restam sugerem coragem (ousou olhar atras da Esfera) e desespero (tenta se fazer lembrar).',
        arquetipo: null,
        tracos_dnd: {
            traco: 'Desconhecido \u2014 apagado.',
            ideal: 'Desconhecido \u2014 mas o ato de resistir ao apagamento sugere valor por identidade e verdade.',
            vinculo: 'A própria existência \u2014 luta para ser lembrado por um mundo que foi forçado a esquece-lo.',
            fraqueza: 'Desconhecida \u2014 talvez a curiosidade de olhar onde não devia.'
        },
        comportamento: 'Comunica-se por residuos: contradicoes em outros textos, nomes apagados que deixam buracos, sensacoes de deja vu em quem le os fragmentos.',
        voz_narrativa: 'Fragmentada e desesperada. "Meu nome era [algo que você quase lembra mas não consegue]. Eu estava lá. Eu vi."'
    },

    mystery_guardiao: {
        nome: 'O Guardiao da Ultima Palavra',
        epiteto: 'O Que Espera',
        categoria: 'Misterioso',
        ocean: { O: null, C: null, E: null, A: null, N: null },
        nota_ocean: 'Perfil desconhecido. Mencionado por outros, nunca aparece diretamente. A paciência infinita sugere alta conscienciosidade e baixo neuroticismo, mas não há dados para confirmar.',
        arquetipo: null,
        tracos_dnd: {
            traco: 'Espera. Não pelo heroi \u2014 pelo momento certo.',
            ideal: 'Desconhecido.',
            vinculo: 'A única verdade sobre a Esfera que ninguém mais sabe.',
            fraqueza: 'Desconhecida \u2014 mas: pode a resposta final ser confiavel?'
        },
        comportamento: 'Desconhecido. Nunca foi encontrado diretamente. Sera um NPC escondido no jogo \u2014 um easter egg para jogadores que exploram a fundo.',
        voz_narrativa: 'Ainda não revelada. Quando for encontrado, sua fala será a mais importante do jogo.'
    },

    mystery_tres_sonham: {
        nome: 'Os Tres que Sonham',
        epiteto: 'A Trindade Involuntaria',
        categoria: 'Misterioso',
        ocean: { O: 7, C: 5, E: 4, A: 6, N: 8 },
        nota_ocean: 'Perfil medio dos tres combinado (cada um e diferente, mas o sonho os iguala). Alto neuroticismo reflete o estresse de sete anos de sonhos recorrentes.',
        arquetipo: null,
        tracos_dnd: {
            traco: 'Compartilham o mesmo sonho todas as noites. Nenhum sabe que os outros existem.',
            ideal: 'Varia entre os tres \u2014 mas o sonho os esta unificando lentamente.',
            vinculo: 'O sonho \u2014 e uns aos outros, embora ainda não saibam.',
            fraqueza: 'O sonho está mudando. A Esfera está se apróximando dentro dele. O que acontece quando ela chegar?'
        },
        comportamento: 'Cada um dos tres tem personalidade distinta (a ser definida quando aparecerem no jogo). O que compartilham: olheiras profundas, dificuldade em distinguir sonho e realidade, e a sensacao constante de serem observados.',
        voz_narrativa: 'Intima e onirica. "Todas as noites, o mesmo sonho. Há sete anos. Estou no escuro. Não há chão. Não há paredes. E então, ela aparece."'
    },

    mystery_crianca: {
        nome: 'A Crianca do Eclipse',
        epiteto: 'O Ser Anomalo',
        categoria: 'Misterioso',
        ocean: { O: 10, C: 3, E: 6, A: 9, N: 2 },
        nota_ocean: 'Ser nao-humano em forma humana. Altissima abertura e amabilidade combinadas com baixissimo neuroticismo sugerem serenidade transcendental. Baixa conscienciosidade indica que não opera por regras humanas.',
        arquetipo: null,
        tracos_dnd: {
            traco: 'Fala em lingua que ninguém reconhece mas todos entendem. Não envelhece normalmente.',
            ideal: 'Desconhecido \u2014 opera por logica nao-humana.',
            vinculo: 'O monasteiro que a acolheu \u2014 e possívelmente o único lugar onde ela esta segura.',
            fraqueza: 'Nao e mortal nem divino. Não pertence a nenhum lugar. Isso a isola de tudo.'
        },
        comportamento: 'Fala com sabedoria além da idade aparente. Nunca mente, mas a verdade que diz e mais estranha que qualquer mentira. Inspira conforto e inquietacao simultaneos. Criancas e animais a adoram. Adultos sentem algo "errado" sem saber o que.',
        voz_narrativa: 'Simples e profunda. Frases curtas que carregam peso imenso. "O dourado não é cor. E lembrança. Você esta lembrando de algo que ainda não aconteceu."'
    }
};

