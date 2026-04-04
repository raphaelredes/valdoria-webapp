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
    diary:      { label: 'Diario',         icon: '\uD83D\uDCD6', font: 'Almendra' },
    prophecy:   { label: 'Profecia',       icon: '\uD83D\uDC41',  font: 'IM Fell English' },
    confession: { label: 'Confissao',      icon: '\uD83D\uDD6F',  font: 'Pirata One' },
    religious:  { label: 'Texto Sagrado',  icon: '\u26EA',         font: 'Cinzel' },
    letter:     { label: 'Carta',          icon: '\u2709',         font: 'MedievalSharp' },
    record:     { label: 'Registro',       icon: '\uD83D\uDCDC',  font: 'Cinzel' },
    strange:    { label: '???',            icon: '\u25C6',         font: 'MedievalSharp' }
};

/* Array de fragmentos (append-only — novos vao no final) */
var FRAGMENTS = [
    {
        id: 1,
        title: 'Primeiro Diario de Talric Cineras \u2014 Entrada 47: O Local da Queda',
        type: 'diary',
        author: 'Talric Cineras',
        era: 'Fundacao',
        condition: 'aged',
        notes: 'Paginas adjacentes arrancadas. Marcas de unhas nas margens.',
        content: '<p>Cheguei ao vale na terceira lua do ciclo. O que encontrei nao e possivel descrever com a precisao que a ciencia exige, e no entanto, devo tentar.</p>'
            + '<p>A cratera nao e uma cratera. Nao ha sinais de impacto \u2014 nenhuma pedra deslocada, nenhuma arvore curvada pela forca. O terreno simplesmente... <span class="faded">cede</span>. Como se a propria terra tivesse se afastado por vontade propria. Ou por medo.</p>'
            + '<p>No centro, nada. E no entanto, tudo. Um brilho dourado que <em>nao e luz</em> \u2014 nao projeta sombras, nao aquece, nao ilumina. Ele simplesmente esta la, como uma ideia que voce nao consegue esquecer.</p>'
            + '<p>Medi o diametro do vale: <span class="faded">trezentos e quarenta e dois</span> passos. Quando medi novamente pela manha, eram <span class="faded">trezentos e cinquenta e sete</span>. O vale esta crescendo. Ou eu estou encolhendo.</p>'
            + '<p>Nota para a proxima expedicao: trazer mais <span class="erased">[...]</span>. O ultimo assistente nao voltou da margem norte. Nao encontramos rastros. Nao encontramos nada.</p>'
    },
    {
        id: 2,
        title: 'Mapas de Erindor Calamus \u2014 Anotacao sobre a Regiao que Nao Deveria Existir',
        type: 'diary',
        author: 'Erindor Calamus',
        era: 'Fundacao',
        condition: 'stained',
        notes: 'Manchas de tinta cobrem parte do mapa referenciado.',
        content: '<p>Mapeei cada rio, cada colina, cada trilha deste continente. Conheco a terra como um pai conhece as linhas do rosto de seus filhos. E no entanto.</p>'
            + '<p>Ha uma regiao entre <span class="erased">[...]</span> e <span class="erased">[...]</span> que nao deveria existir. Nao aparece nos mapas antigos. Nao aparece nos mapas de ninguem alem de mim. Quando mostro meus registros a outros cartografos, eles nao veem nada. Apontam para o espaco em branco e dizem: "Aqui? Nao ha nada aqui."</p>'
            + '<p>Mas eu estive la. Caminhei por <span class="faded">tres dias</span> em uma floresta que nenhum lenhador conhece. Vi ruinas que nenhum historiador registrou. E no centro de tudo, uma clareira perfeitamente circular onde a grama cresce em espiral, sempre em direcao ao centro.</p>'
            + '<p>No centro, uma marca no chao. Circular. Dourada. Como se alguem tivesse pressionado uma esfera imensa contra a terra e a terra tivesse guardado a memoria.</p>'
            + '<p>Voltei ao acampamento e desenhei o mapa. Na manha seguinte, a regiao era maior do que na noite anterior. Na terceira visita, encontrei <span class="erased">[...]</span> \u2014 e nunca mais voltei.</p>'
    },
    {
        id: 3,
        title: 'Notas de Irmao Cenavar \u2014 Decimo-Terceiro Templo: As Pecas Nao Encaixam',
        type: 'diary',
        author: 'Irmao Cenavar',
        era: 'Expansao',
        condition: 'aged',
        notes: null,
        content: '<p>Treze templos. Treze versoes diferentes da mesma historia. Nenhuma e mentira. Nenhuma e verdade.</p>'
            + '<p>No primeiro templo, disseram-me que a Esfera foi criada por Aurivath como presente para o mundo que nascia. No quinto, que Aurivath <em>e</em> a Esfera. No nono, que Aurivath nunca existiu e a Esfera sempre esteve aqui. No decimo-segundo, que a Esfera nao existe e nunca existiu.</p>'
            + '<p>Passei quarenta anos caminhando entre santuarios, coletando cada fragmento, cada prece, cada sussurro de velho sacerdote. Acreditei que, ao juntar todas as pecas, veria o todo.</p>'
            + '<p>Nao vejo.</p>'
            + '<p>As pecas nao formam um mosaico. Elas formam <span class="faded">algo que nao tem forma</span> \u2014 como tentar montar um quebra-cabeca cujas pecas pertencem a jogos diferentes. Ou pior: como se as pecas mudassem de forma cada vez que voce as toca.</p>'
            + '<p>Começo a suspeitar de algo terrivel: nao e que a verdade esteja escondida. E que a verdade nao quer ser encontrada. Ou que nao existe verdade alguma \u2014 apenas o ato de procurar, que por si so alimenta <span class="erased">[...]</span>.</p>'
    },
    {
        id: 4,
        title: 'Segundo Diario de Talric Cineras \u2014 Entrada 203: Contradicao',
        type: 'diary',
        author: 'Talric Cineras',
        era: 'Fundacao',
        condition: 'burned',
        notes: 'Cantos carbonizados. Partes do texto perdidas para sempre.',
        content: '<p>Reli a Entrada 47 hoje. Nao me reconheco nas palavras. Descrevi uma cratera, um vale que cresce. Nao ha cratera. Nunca houve.</p>'
            + '<p>A Esfera nao caiu. Ela nao veio de lugar algum. Ela <span class="faded">sempre esteve</span> aqui \u2014 antes da terra, antes do ceu, antes de <span class="erased">[...]</span>. A cidade que construi ao redor dela nao foi erguida sobre o local de uma queda. Foi erguida sobre <span class="erased">[...]</span>.</p>'
            + '<p>Isso contradiz tudo o que escrevi antes. E no entanto, tenho certeza absoluta. Tanta certeza quanto tive ao escrever a Entrada 47. <span class="torn-end">Alguem esta mudando minhas memorias, ou\u2014</span></p>'
    },
    {
        id: 5,
        title: 'Catalogacao de Norien Calamus \u2014 Sobre a Impossibilidade de Minha Propria Existencia',
        type: 'diary',
        author: 'Norien Calamus',
        era: '???',
        condition: 'pristine',
        notes: 'Perturbadoramente bem preservado. O pergaminho parece novo.',
        content: '<p>Sou Norien Calamus, escriba e descendente de Erindor Calamus, o cartografo. Pelo menos, e o que sempre acreditei.</p>'
            + '<p>Hoje encontrei um fragmento em Serralume que carrega minha caligrafia. Reconheco cada floreio, cada maneira particular como faco o "s" e o "r". E sem duvida minha escrita.</p>'
            + '<p>O fragmento data da Era da Aurora. <span class="faded">Tres mil anos</span> antes de meu nascimento.</p>'
            + '<p>Erindor viveu na Fundacao. Eu vivo agora, no Presente. Mas minha mao escreveu palavras na Aurora, antes de Erindor nascer. Antes de Valdoria existir. Antes de <span class="erased">[...]</span>.</p>'
            + '<p>Nao estou perturbado. Talvez devesse estar. Mas a Esfera me mostrou algo \u2014 ou talvez eu tenha sempre sabido: o tempo nao e uma linha. E uma espiral. E no centro da espiral, <span class="faded">dourada e impossivel</span>, ela aguarda.</p>'
            + '<p>Ou talvez eu nao exista. Talvez eu seja apenas a ideia de alguem que existira. Talvez minha mao escreveu aquelas palavras porque um dia elas precisarao ter sido escritas. A Esfera nao se importa com a ordem. Ela se importa com o que precisa existir.</p>'
    },
    {
        id: 6,
        title: 'Relatorio do Arquivista de Serralume \u2014 Para Ninguem Em Particular',
        type: 'diary',
        author: 'Anonimo (O Arquivista)',
        era: 'Presente',
        condition: 'aged',
        notes: null,
        content: '<p>Ninguem lera este relatorio. Escrevo-o mesmo assim, como escrevo todos os outros, porque e o que faco. E o que sempre fiz. Ha quanto tempo estou aqui? Nao me lembro. Nao importa.</p>'
            + '<p>A biblioteca de Serralume contem <span class="faded">setecentos e quarenta e tres</span> documentos sobre a Esfera. Cataloguei cada um. Organizei por era, por autor, por regiao, por grau de deterioracao. Criei indices cruzados. Mapeei contradicoes.</p>'
            + '<p>Posso dizer com autoridade: nao ha consenso sobre nada. Nem sobre a forma. Talric descreve uma esfera. Soraviel descreve uma voz. Maelis descreve uma presenca. Corvash descreve marcas na pele. Vaelira descreve correntes no mar.</p>'
            + '<p>A unica constancia e a cor. Sempre dourada. Mas <span class="faded">mesmo o dourado e descrito diferentemente</span> \u2014 para uns, e o dourado do sol; para outros, o dourado de olhos de predador; para Duravar, o dourado do <span class="erased">silencio</span>.</p>'
            + '<p>Continuo catalogando. Nao porque acredite que encontrarei a verdade. Mas porque alguem precisa manter o registro. Alguem precisa lembrar. Mesmo que a <span class="faded">propria memoria</span> nao seja confiavel.</p>'
    },
    {
        id: 7,
        title: 'Primeira Visao de Soraviel \u2014 A Luz que Fala com Voz de Silencio',
        type: 'prophecy',
        author: 'Soraviel (transcrito por um acolito)',
        era: 'Fundacao',
        condition: 'stained',
        notes: 'Manchas que parecem lagrimas secas sobre o pergaminho.',
        content: '<p><em>Ela falou, e suas palavras nao tinham som:</em></p>'
            + '<p>Vi a luz antes de perder os olhos. Ou talvez os olhos tenham partido para que eu pudesse finalmente ver. Ha uma diferenca? A Esfera nao acha que sim.</p>'
            + '<p>Quando fecho o que resta de minhas palpebras, vejo um dourado que nao e cor \u2014 e peso. Como se alguem colocasse ouro fundido sobre minha mente e dissesse: "Agora, entenda." Mas eu nao entendo. Ninguem entende. Nao fomos feitos para entender.</p>'
            + '<p><em>A voz que nao e som disse:</em></p>'
            + '<p>"<span class="faded">Eu sou o que restou do que veio antes. Eu sou o que restara do que vira depois. Nao me procurem. Eu ja os encontrei.</span>"</p>'
            + '<p>Chorei. Nao de medo \u2014 de beleza. Ha algo tao imenso, tao alem de toda compreensao, que a unica resposta possivel e chorar. Como chorar diante de uma montanha que nao tem topo. Como chorar diante do mar que nao tem fundo.</p>'
            + '<p>A Esfera nao e boa. A Esfera nao e ma. A Esfera <em>e</em>. E isso e mais terrivel do que qualquer maldade que ja conheci.</p>'
    },
    {
        id: 8,
        title: 'Fragmento da Profecia de Lysara \u2014 O Que Sera Antes de Ser',
        type: 'prophecy',
        author: 'Lysara da Corte Palida',
        era: 'Expansao',
        condition: 'torn',
        notes: 'Borda inferior rasgada. Texto incompleto.',
        content: '<p>A Esfera me mostrou o amanha. E o amanha ainda nao sabe que vai existir.</p>'
            + '<p>Vi <span class="faded">uma cidade que nao existe</span> erguer-se sobre ruinas que ainda nao cairam. Vi <span class="erased">[...]</span> caminhar por ruas que nenhum pedreiro construiu. Vi uma guilda daqueles que ousam cruzar alem dos portoes, sem saber que os portoes existem para protege-los, nao para convidar.</p>'
            + '<p>Vi uma forja que arde com fogo dourado, alimentada por minerio que pulsa como coracao vivo. Vi o ferreiro que nao sabe que sua arte e mais antiga do que sua linhagem.</p>'
            + '<p>Vi as guerras travadas na beira do crepusculo, quando o sol hesitou entre nascer e morrer. Vi o pacto selado onde a luz nao alcanca, entre vozes que prometem poder a quem aceita perder.</p>'
            + '<p>Vi tudo isso, e sei que e verdade, porque a Esfera nao mente. A Esfera nao precisa mentir. A verdade ja e terrivel o suficiente.</p>'
            + '<p><span class="torn-end">E vi, por fim, o momento em que alguem lerá estas palavras e\u2014</span></p>'
    },
    {
        id: 9,
        title: 'O Sonho Compartilhado \u2014 Relato do Primeiro dos Tres',
        type: 'prophecy',
        author: 'Anonimo',
        era: 'Presente',
        condition: 'aged',
        notes: null,
        content: '<p>Todas as noites, o mesmo sonho. Ha <span class="faded">sete anos</span>.</p>'
            + '<p>Estou em pe no escuro. Nao ha chao sob meus pes, mas nao caio. Nao ha paredes, mas nao posso me mover. O espaco e infinito e sufocante ao mesmo tempo.</p>'
            + '<p>Entao, ela aparece. Nao "aparece" como uma pessoa entra em um comodo. Ela simplesmente <em>passa a existir</em>, como se sempre tivesse estado la e meus olhos finalmente a notassem.</p>'
            + '<p>Dourada. Mas nao e luz. Nao e cor. E algo que nao tem nome em nenhuma lingua que conheco.</p>'
            + '<p>No sonho, sei que ha outros. Dois. Nao os vejo, mas sinto. Estao sonhando o mesmo sonho, em lugares que nao conheco. Nao sei quem sao. Nao sei onde estao. Mas sei que existem.</p>'
            + '<p>A Esfera nao fala. Nao no sentido de palavras. Mas algo muda em mim a cada noite. Como se o sonho me escrevesse por dentro, linha por linha, noite apos noite, e quando terminar de escrever <span class="erased">[...]</span>.</p>'
            + '<p>Ontem, pela primeira vez, o sonho mudou. Ela estava mais perto. Ou eu estava mais perto. E nos tres \u2014 senti isso com clareza \u2014 nos tres estavamos acordados dentro do sonho.</p>'
    },
    {
        id: 10,
        title: 'Segunda Visao de Soraviel \u2014 O Rosto que Nao Pode Ser Lembrado',
        type: 'prophecy',
        author: 'Soraviel (transcrito por um acolito)',
        era: 'Fundacao',
        condition: 'burned',
        notes: 'Bordas severamente queimadas. Texto central sobreviveu.',
        content: '<p><em>Palavras finais de Soraviel, ditas antes de <span class="erased">[...]</span>:</em></p>'
            + '<p>Ha uma deusa que ninguem lembra. Eu a vi. Calíria \u2014 nao, esse nao e o nome. Era o nome, mas o nome mudou, ou nos e que mudamos. Ela tentou compreender a Esfera e a Esfera tomou <span class="faded">dela o que nos permite ser lembrados</span>.</p>'
            + '<p>Tem seguidores. Devotos que rezam todos os dias para uma presenca que nao conseguem descrever. "Para quem voces rezam?" perguntei a um sacerdote. "Nao sei," respondeu ele, com lagrimas nos olhos. "Mas ela ouve."</p>'
            + '<p>A Esfera nao castiga. A Esfera cobra. Conhecimento tem preco, e o preco de conhecer a Esfera e perder algo de si. Calíria perdeu seu rosto. Ou seu nome. Ou a capacidade de ser lembrada. Ou <span class="erased">todas essas coisas e mais</span>.</p>'
            + '<p>Eu perdi meus olhos. Talric perdera <span class="faded">suas certezas</span>. E voce, que le estas palavras \u2014 o que estara disposto a perder?</p>'
    },
    {
        id: 11,
        title: 'Ultimo Registro de Lysara \u2014 A Cidade Que Ainda Nao Caiu',
        type: 'prophecy',
        author: 'Lysara da Corte Palida',
        era: 'Expansao',
        condition: 'torn',
        notes: 'Metade inferior do documento perdida.',
        content: '<p>Escrevo da Corte Palida, minha amada cidade a beira do mar. As torres brilham sob o sol. As ruas estao cheias de vida. Os mercadores cantam, as criancas correm, o porto respira com navios de toda parte.</p>'
            + '<p>E sei que nada disso existira amanha.</p>'
            + '<p>A Esfera me mostrou: o mar reclamara esta cidade. Nao por furia, nao por castigo \u2014 por <span class="faded">necessidade</span>. Ha algo sob as ondas que precisa da Corte Palida. Algo que foi colocado aqui antes de nos, antes das pedras, antes do mar.</p>'
            + '<p>Contei aos conselheiros. Nao acreditaram. Mostrei minhas visoes ao rei. <span class="erased">▮▮▮▮▮▮▮▮</span> mandou-me calar. Decretos foram escritos: e proibido falar da Esfera por nome dentro dos muros da Corte. Como se silenciar a profecia pudesse silenciar o mar.</p>'
            + '<p><span class="torn-end">As torres ainda brilham enquanto escrevo. O mar esta calmo. Mas ouço, debaixo das ondas, como Vaelira ouvira seculos depois\u2014</span></p>'
    },
    {
        id: 12,
        title: 'Confissao de Isavel Cineras \u2014 Por Que Tentei Queimar os Diarios de Meu Avo',
        type: 'confession',
        author: 'Isavel Cineras',
        era: 'Fragmentacao',
        condition: 'burned',
        notes: 'A propria confissao mostra marcas de fogo. Ironia deliberada?',
        content: '<p>Sou Isavel Cineras, neta de Talric, herdeira de nada alem de obsessao.</p>'
            + '<p>Queimei os diarios. Ou tentei. O fogo consumiu as bordas, escureceu as paginas, transformou anos de trabalho em cinza \u2014 e mesmo assim, as palavras sobreviveram. Como se a tinta fosse mais forte que a chama. Como se as palavras quisessem ser lidas.</p>'
            + '<p>Voces nao entendem. Meu avo morreu louco. Nao louco de gritar e arrancar os cabelos \u2014 louco de <span class="faded">certeza</span>. Morreu absolutamente convicto de verdades que se contradiziam. Acreditava em tudo ao mesmo tempo. A Esfera fez isso com ele.</p>'
            + '<p>Pensei que, se destruisse os registros, a Esfera perderia poder. Registros sao memoria. Memoria e existencia. Destrua a memoria e talvez <span class="erased">[...]</span> deixe de existir.</p>'
            + '<p>Os diarios nao queimaram. As paginas que arranquei reapareceram. Os textos que rasguei foram encontrados intactos em outros lugares \u2014 bibliotecas que meu avo nunca visitou, templos em terras que ele nunca pisou.</p>'
            + '<p>A Esfera quer ser conhecida. E essa e a parte que mais me aterroriza.</p>'
    },
    {
        id: 13,
        title: 'Depoimento de Ravan Tormavela \u2014 Sobre Ouvir o Que Nao Deveria Ter Voz',
        type: 'confession',
        author: 'Ravan Tormavela',
        era: 'Presente',
        condition: 'aged',
        notes: null,
        content: '<p>Minha mae encontrou algo no fundo do mar e nunca mais voltou a ser minha mae. Ainda tem o mesmo rosto, o mesmo nome, as mesmas maos que me seguravam quando eu era crianca. Mas por tras dos olhos, algo mudou. Algo entrou. Ou algo saiu.</p>'
            + '<p>Fugi de casa aos <span class="faded">dezesseis anos</span>. Nao por odio \u2014 por medo. Porque comecei a ouvir a mesma coisa que ela ouve.</p>'
            + '<p>Nao e uma voz. E um peso. Um peso dourado que se instala na mente como agua que sobe lentamente, enchendo cada espaco ate nao sobrar ar. Nao diz palavras. Nao forma frases. Mas de alguma forma, eu sei o que ela quer. A Esfera quer ser encontrada. De novo. E de novo. E de novo.</p>'
            + '<p>Fugi para o mais longe que pude. Cruzei montanhas, desertos, <span class="erased">[...]</span>. Cheguei a um monastério onde monges vivem em silêncio absoluto. Pensei que o silêncio externo calaria o interno.</p>'
            + '<p>Nao calou. A voz que nao e som continua. Todas as noites, antes de dormir, ouço o dourado que nao e luz chamar meu nome. E o pior: a cada dia, resisto um pouco menos.</p>'
    },
    {
        id: 14,
        title: 'Testemunho de Um Guarda de Valdoria \u2014 O Que Vi Naquela Noite nos Portoes',
        type: 'confession',
        author: 'Anonimo (Guarda de Valdoria)',
        era: 'Presente',
        condition: 'stained',
        notes: 'Manchas que podem ser vinho. Ou sangue.',
        content: '<p>Nao sou homem de letras, entao perdoem a escrita. Preciso contar isso a alguem antes que <span class="faded">esqueca</span>, porque todo dia a memoria fica mais fraca, como se alguem estivesse apagando.</p>'
            + '<p>Era turno da noite. Vigilia dos portoes, como faco ha <span class="faded">doze anos</span>. Nada acontece nos portoes a noite. Ate aquela noite.</p>'
            + '<p>Uma mulher que coleciona segredos como outros colecionam moedas, e os vende pelo preco de uma caneca \u2014 voces sabem de quem falo \u2014 ela me avisou: "Nao olhe para fora dos portoes depois da meia-noite." Pensei que era mais uma de suas historias. Nao era.</p>'
            + '<p>A meia-noite, vi. <span class="erased">[...]</span> do lado de fora dos portoes. Uma luz dourada, mas nao era luz. Nao tinha fonte. Nao iluminava nada. Apenas... existia. No ar, como uma lembranca de algo que nunca aconteceu.</p>'
            + '<p>E no centro da luz, vi uma forma. Nao uma pessoa, nao uma criatura. Uma <span class="faded">esfera</span>. Ou a lembranca de uma esfera. Ou o sonho de uma esfera. Durou <span class="erased">[...]</span> segundos. Ou horas. Nao sei.</p>'
            + '<p>Quando amanheceu, nao lembrava de nada. Mas minhas maos tremiam. Ainda tremem.</p>'
    },
    {
        id: 15,
        title: 'Confissao Anonima \u2014 Encontrada Dentro de Uma Pedra Solida',
        type: 'confession',
        author: 'Desconhecido',
        era: '???',
        condition: 'pristine',
        notes: 'Encontrada quando pedreiros quebraram um bloco de granito para construcao. O pergaminho estava no interior da pedra, intacto. A pedra nao mostrava sinais de ter sido aberta antes.',
        content: '<p>Nao sei quem sou. Nao sei quando estou. A Esfera me tirou essas coisas, ou talvez eu nunca as tenha tido.</p>'
            + '<p>Escrevo de um lugar que nao e um lugar. Ha silencio aqui, mas o silencio e mais alto que qualquer grito. Ha escuridao, mas a escuridao brilha. Dourada. Sempre dourada.</p>'
            + '<p>Voce que le isto \u2014 nao me procure. Nao porque eu nao queira ser encontrado. Mas porque <span class="faded">encontrar-me significaria</span> aceitar que pedras guardam memorias, que o tempo nao e real, que a Esfera pode colocar palavras onde palavras nao deveriam existir.</p>'
            + '<p>E se voce aceitar isso, nao ha como voltar.</p>'
            + '<p>Fui a Setima Testemunha. Ou serei. O tempo nao importa para quem esta <span class="erased">[...]</span>. Seis viram a Esfera surgir. Eu vi o que havia por tras. E por isso fui apagado. Meu nome, minha historia, minha existencia \u2014 removidos do mundo como tinta lavada de pergaminho.</p>'
            + '<p>Mas a tinta deixa marca, mesmo quando lavada. E esta pedra guardou o que o mundo quis esquecer.</p>'
    },
    {
        id: 16,
        title: 'Litania de Solvenar \u2014 O Limiar que Nao Se Cruza',
        type: 'religious',
        author: 'Sacerdotes de Solvenar',
        era: 'Aurora',
        condition: 'aged',
        notes: 'Recitada nos templos de fronteira ao amanhecer e ao entardecer.',
        content: '<p><em>Ouve-nos, Guardiao dos Limiares, que permaneces entre o que e e o que nao deveria ser.</em></p>'
            + '<p>Tu que foste o primeiro a estender a mao em direcao a Esfera. Tu que foste transformado pelo toque que nenhum mortal suportaria. Tu que ja nao lembras do que eras antes, e carregas essa ausencia como um manto.</p>'
            + '<p>Guarda-nos na fronteira. Mantem o Veu que Virenor tece e que a Esfera desfaz. Nao nos deixes cruzar para <span class="faded">o espaco exterior</span>, onde as leis que conhecemos perdem significado e os nomes perdem peso.</p>'
            + '<p>Solvenar, que conheces o preco da curiosidade \u2014 pois pagaste com tudo o que eras \u2014 concede-nos a sabedoria de parar antes do limiar. De olhar sem tocar. De saber sem compreender.</p>'
            + '<p><em>Pois ha coisas que, uma vez cruzadas, nao permitem retorno.</em></p>'
            + '<p>E ha limiares que existem nao para serem cruzados, mas para nos lembrar de que alem deles <span class="erased">[...]</span> aguarda.</p>'
    },
    {
        id: 17,
        title: 'Prece dos Devotos de Issara \u2014 Para Que o Ciclo Se Complete',
        type: 'religious',
        author: 'Ordem das Cinzas Renascidas',
        era: 'Fragmentacao',
        condition: 'stained',
        notes: 'Encontrada no unico templo de Issara que sobreviveu. As manchas cheiram a enxofre.',
        content: '<p><em>Mae das Cinzas, que encerras para que o novo possa comecar:</em></p>'
            + '<p>Tu tentaste o que nenhum outro deus ousou \u2014 destruir a Esfera para libertar o ciclo. O fogo que lancaste contra ela era o fogo que desfaz e refaz, o fogo que nao consome mas transforma.</p>'
            + '<p>E a Esfera nao se moveu. Nao resistiu. Nao reagiu. Simplesmente... permaneceu. Como se o fogo nao a alcancasse. Como se <span class="faded">a destruicao nao fosse um conceito que se aplicasse a ela</span>.</p>'
            + '<p>Queimaste teus proprios templos em furia. Ou em vergonha. Ou em desespero. Os registros divergem \u2014 como todos os registros sobre a Esfera divergem.</p>'
            + '<p>Mae, ouve nossa prece: se nao podes destruir a Esfera, <span class="erased">[...]</span> o ciclo ao redor dela. Que o mundo renasca apesar da Esfera. Que as cinzas gerem algo novo, mesmo que o dourado permaneca inalterado no centro de tudo.</p>'
            + '<p><em>Pois se nao podemos mudar o que e eterno, podemos ao menos mudar o que gira ao redor.</em></p>'
    },
    {
        id: 18,
        title: 'Debate Teologico \u2014 Sobre a Natureza de Cal\u00edria: Deusa ou Eco?',
        type: 'religious',
        author: 'Conclave de Serralume',
        era: 'Expansao',
        condition: 'aged',
        notes: 'Ata parcial. Varias paginas faltando entre os argumentos.',
        content: '<p><strong>Orador Primeiro:</strong> Cal\u00edria e uma deusa. Tem templos, tem fieis, tem poder. O fato de ninguem conseguir descrever seu rosto nao nega sua existencia \u2014 apenas confirma o preco que pagou ao estudar a Esfera.</p>'
            + '<p><strong>Orador Segundo:</strong> Com todo respeito, como pode ser deusa alguem cujo <span class="faded">proprio nome escorrega da memoria</span>? Perguntei a seis fieis quem adoram. Nenhum soube responder. Choram ao rezar. Sentem presenca. Mas nao conseguem dizer o nome.</p>'
            + '<p><strong>Orador Terceiro:</strong> Proponho uma terceira possibilidade. Cal\u00edria nao e deusa nem ilusao. E um <em>eco</em>. A Esfera consumiu algo dela \u2014 talvez toda ela \u2014 e o que resta e a reverberacao. Como o som de um sino depois que o sino foi derretido.</p>'
            + '<p><strong>Orador Primeiro:</strong> Se e eco, quem ressoa? O que foi consumido?</p>'
            + '<p><strong>Orador Terceiro:</strong> <span class="erased">[paginas faltando]</span></p>'
            + '<p><strong>Orador Segundo:</strong> ...e por isso afirmo que Selvoran sabe. Ele observa. Ele sempre observou. Se alguem viu o que aconteceu com Cal\u00edria, foi o Juiz Silencioso. Mas ele nao fala. Nunca falou. E <span class="faded">talvez esse seja o ponto</span>: ha verdades que, se ditas em voz alta, <span class="erased">[...]</span>.</p>'
    },
    {
        id: 19,
        title: 'Hino dos Peregrinos de Selvoran \u2014 O Silencio Como Resposta',
        type: 'religious',
        author: 'Peregrinos do Silencio',
        era: 'Expansao',
        condition: 'pristine',
        notes: null,
        content: '<p><em>Cantado sem voz. Cada palavra e pensada, nao dita.</em></p>'
            + '<p>Selvoran nos ensinou pelo exemplo: ha mais sabedoria no silencio do que em todos os livros de Serralume. Ele viu a Esfera ser <span class="faded">criada ou revelada ou imaginada</span>. Viu Aurivath dar-se ou ser tomado. Viu Nevaris preencher o vazio ou ser preenchida por ele. Viu tudo.</p>'
            + '<p>E escolheu calar.</p>'
            + '<p>Nos, seus peregrinos, imitamos sua escolha. Caminhamos entre as estatuas que ele deixou pelo mundo \u2014 sempre voltadas para onde a Esfera esteve, os olhos de pedra fixos em algo que nao podemos ver. E em cada estatua, o mesmo silencio.</p>'
            + '<p>Nao e o silencio de quem nao sabe. E o silencio de quem sabe demais.</p>'
            + '<p>Um dia, talvez, o Juiz Silencioso fale. E nesse dia, dizem os textos mais antigos, o Veu de Virenor se desfara, o ciclo de Issara se completara, e a Esfera finalmente <span class="erased">[...]</span>.</p>'
            + '<p>Ate la, caminhamos. Em silencio. Pois o silencio e a unica resposta honesta para perguntas grandes demais.</p>'
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
            + '<p>Sei que nao vai ler esta carta. Sei que fugiu para o mais longe possivel do mar, das correntes, de mim. Nao o culpo. Eu mesma fugiria de mim, se pudesse.</p>'
            + '<p>Encontrei algo no fundo do oceano, em <span class="erased">▮▮▮▮▮▮▮▮</span>, a <span class="faded">sete braças</span> abaixo do ponto mais profundo registrado nos mapas. Nao era a Esfera. Nao sei o que era. Mas era dourado \u2014 dourado de uma forma que nenhum ouro reproduz. Dourado como <em>o peso de algo que nao tem massa</em>.</p>'
            + '<p>A tripulacao viu. Todos os <span class="faded">vinte e tres</span> viram. Depois, um a um, desapareceram. Nao morreram \u2014 desapareceram. Como se nunca tivessem existido. Verifiquei os registros do porto: nao ha mencion de seus nomes. Perguntei as familias: nao reconhecem as descricoes.</p>'
            + '<p>So eu restei. Por que? Nao sei. Talvez porque a Esfera ainda precisa de mim. Talvez porque <span class="erased">[...]</span>.</p>'
            + '<p>Voce ouve o que eu ouco, Ravan. Herdou isso de mim como se herda a cor dos olhos. Nao e maldicao. Nao e benção. E apenas... o que somos agora. Tormavelas que ouvem o mar cantar com voz que nao e som.</p>'
            + '<p>Nao fuja do que voce e. Nao ha distancia suficiente.</p>'
            + '<p>Sua mae, que ainda navega.</p>'
    },
    {
        id: 21,
        title: 'Correspondencia do Arquivista \u2014 Resposta a Uma Pergunta Nunca Enviada',
        type: 'letter',
        author: 'O Arquivista de Serralume',
        era: 'Presente',
        condition: 'aged',
        notes: null,
        content: '<p>Caro <span class="erased">▮▮▮▮▮▮</span>,</p>'
            + '<p>Recebi sua carta datada de <span class="erased">▮▮▮▮▮▮▮▮</span>. Ou melhor: nao recebi. Nao existe registro de que voce tenha me enviado qualquer correspondencia. No entanto, sei exatamente o que perguntou, pois encontrei minha resposta ja escrita na gaveta esquerda da escrivaninha, datada de ontem, em minha propria caligrafia.</p>'
            + '<p>Nao me lembro de te-la escrito. Mas reconheco a escrita, os argumentos, as referencias. Sou eu. Ou fui eu. Ou serei eu.</p>'
            + '<p>Voce perguntou: "A Esfera esta viva?"</p>'
            + '<p>Minha resposta, que aparentemente ja dei antes de ser perguntada, e esta: a palavra "viva" pressupoe que algo pode estar morto. A Esfera nao participa dessa distincao. Ela nao esta viva nem morta. Ela e <span class="faded">anterior a essas categorias</span>. Perguntar se a Esfera esta viva e como perguntar se o numero sete esta feliz. A categoria nao se aplica.</p>'
            + '<p>Isso deveria tranquiliza-lo. Nao tranquiliza a mim.</p>'
            + '<p>Atenciosamente,<br>O Arquivista</p>'
            + '<p><em>P.S.: Nao me envie mais cartas. Aparentemente, ja as responderei antes que cheguem.</em></p>'
    },
    {
        id: 22,
        title: 'Aviso de Dormund Ferrovoz \u2014 Para Quem Encontrar Esta Bigorna',
        type: 'letter',
        author: 'Dormund Ferrovoz',
        era: 'Presente',
        condition: 'burned',
        notes: 'Gravado na propria bigorna com cinzel. Letras fundas e irregulares.',
        content: '<p>NAO SOU PARENTE DO ANAO. Quero que isso fique claro antes de tudo. Meu nome e Ferrovoz porque meu avo era ferreiro e gritava demais. Nada a ver com <span class="faded">Duravar</span> e sua maquina maldita.</p>'
            + '<p>Mas as armas que forjo cantam.</p>'
            + '<p>Nao e metafora. Quando martelo o metal, algo responde. Uma lamina que chora \u2014 nao pela dor que causa, mas pelo nome que esqueceu. Um escudo que zumbe quando voltado para <span class="erased">[...]</span>. Machados que suspiram ao amanhecer.</p>'
            + '<p>Fui a uma forja que arde com fogo dourado, alimentada por minerio que pulsa como coracao vivo. O ferreiro de la \u2014 homem sombrio, marcado por cicatrizes de chama \u2014 olhou minhas armas e disse: "O dourado canta nelas tambem."</p>'
            + '<p>Nao sou parente do anao. Nao busco a Esfera. Nao quero saber o que e.</p>'
            + '<p>Mas ela sabe meu nome. E isso me apavora mais do que qualquer coisa.</p>'
            + '<p>Se voce encontrar esta bigorna e ouvir o metal cantar: pare de forjar. Va embora. <span class="torn-end">Nao cometa o mesmo erro que\u2014</span></p>'
    },
    {
        id: 23,
        title: 'Carta Selada \u2014 Remetente Desconhecido, Destinatario Apagado',
        type: 'letter',
        author: 'Desconhecido',
        era: '???',
        condition: 'torn',
        notes: 'O selo de cera e dourado mas nao corresponde a nenhuma casa, guilda, ou ordem conhecida.',
        content: '<p>De: <span class="erased">▮▮▮▮▮▮▮▮▮▮▮</span><br>Para: <span class="erased">▮▮▮▮▮▮▮▮▮▮▮</span></p>'
            + '<p>Sei que voce <span class="faded">encontrou o que procurava</span>. Sei tambem que agora desejaria nunca ter procurado. E o destino de todos que olham para dentro dela: ver o que nao deveria ser visto e perceber que nao ha como des-ver.</p>'
            + '<p>Voce me pediu conselhos. Nao tenho nenhum. Apenas instrucoes:</p>'
            + '<p>Primeiro: nao fale sobre o que viu a <span class="erased">[...]</span>. O corvo negro que pousa em todas as janelas, mas pertence a uma sombra que nao tem dono, ja esta vigiando.</p>'
            + '<p>Segundo: destrua o <span class="erased">[...]</span> que trouxe consigo. Nao e um artefato. E um lembrete. E lembretes da Esfera tem o habito de <span class="faded">se tornarem mais do que objetos</span>.</p>'
            + '<p>Terceiro: se ouvir a voz que nao e som, nao responda. Responder e consentir. E consentir e <span class="erased">[...]</span>.</p>'
            + '<p><span class="torn-end">Quarto: quando o Veu de Virenor enfraquecer na proxima lua, voce deve\u2014</span></p>'
    },
    {
        id: 24,
        title: 'Cronica da Fundacao de Valdoria \u2014 Versao Oficial',
        type: 'record',
        author: 'Cronistas da Corte',
        era: 'Fundacao',
        condition: 'aged',
        notes: 'Contradita em varios pontos pelos diarios de Talric Cineras (ver fragmentos 1 e 4).',
        content: '<p>No decimo ano apos as guerras travadas na beira do crepusculo, quando o sol hesitou entre nascer e morrer, o povo buscou terra nova. Talric Cineras, erudito e lider por escolha do conselho, guiou os sobreviventes para alem das montanhas.</p>'
            + '<p>Encontraram um vale fertil, irrigado por dois rios, protegido por colinas em tres flancos. Nao ha registro de que algo incomum existisse no local. O vale era, segundo os relatos oficiais, um vale como qualquer outro.</p>'
            + '<p><em>Nota do cronista posterior:</em> Os diarios pessoais de Talric <span class="faded">contradizem esta versao</span>. Ele descreve uma cratera (Entrada 47) ou uma presenca eterna (Entrada 203). A versao oficial foi redigida pelo conselho <span class="erased">▮▮▮▮▮▮▮▮</span> anos depois, sem consulta aos diarios.</p>'
            + '<p>A cidade cresceu. Chamou-se Valdoria \u2014 "vale dourado" na lingua antiga, embora nenhum ouro tenha sido encontrado na regiao. Curiosamente, nenhum cronista explicou por que "dourado."</p>'
            + '<p>A guilda daqueles que ousam cruzar alem dos portoes foi fundada no vigesimo ano, quando exploradores relataram <span class="erased">[...]</span> nas terras ao redor. Os portoes foram construidos nao para proteger contra invasores, mas para <span class="faded">proteger quem esta dentro</span>. Desta distincao, poucos tomaram nota.</p>'
    },
    {
        id: 25,
        title: 'Decreto da Corte Palida \u2014 Proibicao de Mencionar a Esfera por Nome',
        type: 'record',
        author: 'Chanceler <span class="erased">▮▮▮▮▮▮▮</span>',
        era: 'Expansao',
        condition: 'stained',
        notes: 'Tres copias conhecidas. Todas com os mesmos nomes censurados.',
        content: '<p><strong>DECRETO REAL N\u00ba <span class="erased">▮▮▮</span></strong></p>'
            + '<p>Por ordem de <span class="erased">▮▮▮▮▮▮▮▮▮▮</span>, Soberano da Corte Palida, e com aprovacao unanime do Conselho dos <span class="erased">▮▮▮▮▮▮</span>, fica estabelecido:</p>'
            + '<p><strong>Artigo I.</strong> Fica terminantemente proibido, dentro dos muros da Corte Palida e em todos os seus dominios, mencionar pelo nome o artefato designado como <span class="erased">▮▮▮▮▮▮▮</span>.</p>'
            + '<p><strong>Artigo II.</strong> Toda referencia ao dito artefato devera usar a designacao oficial: "Assunto Selado." Descumprir este artigo acarretara <span class="erased">[...]</span>.</p>'
            + '<p><strong>Artigo III.</strong> Os escritos da vidente Lysara, anteriormente consultora da Coroa, ficam confiscados e lacrados nos <span class="erased">▮▮▮▮▮▮▮▮</span>. Citar suas profecias e crime de <span class="faded">alta traicao</span>.</p>'
            + '<p><strong>Artigo IV.</strong> Qualquer cidadao que apresente <span class="faded">visoes, sonhos recorrentes, ou sensibilidade auditiva incomum</span> devera se apresentar ao Conselho para avaliacao. Nao se apresentar constitui <span class="erased">[...]</span>.</p>'
            + '<p><em>Nota historica: a Corte Palida caiu menos de uma geracao depois deste decreto. O mar reclamou a cidade exatamente como Lysara profetizou.</em></p>'
    },
    {
        id: 26,
        title: 'Registro de Oristela Cervanor \u2014 Inventario de Anomalias na Floresta de Maelis',
        type: 'record',
        author: 'Oristela Cervanor',
        era: 'Fragmentacao',
        condition: 'aged',
        notes: 'Folhas secas prensadas entre as paginas. Algumas brilham levemente no escuro.',
        content: '<p>Inventario iniciado na lua cheia do <span class="faded">setimo ciclo</span>. Floresta designada informalmente como "Floresta de Maelis" em honra a minha bisavo, que aqui trabalhou.</p>'
            + '<p><strong>Anomalia 1:</strong> As arvores no perimetro externo crescem normalmente. A partir de 200 passos para dentro, os troncos se curvam em direcao ao centro. Nao por causa de vento \u2014 nao ha vento.</p>'
            + '<p><strong>Anomalia 2:</strong> Agua corre para cima nos riachos entre <span class="erased">[...]</span> e a clareira central. Contra a gravidade. Sem explicacao.</p>'
            + '<p><strong>Anomalia 3:</strong> Animais evitam a floresta interior. Passaros mudam de rota ao sobrevoar. Insetos formam espirais no ar.</p>'
            + '<p><strong>Anomalia 4:</strong> Na clareira central \u2014 a mesma descrita por Erindor Calamus, com grama crescendo em espiral \u2014 encontrei restos do ritual de Maelis. Pedras dispostas em circulo. Ervas calcinadas. E no centro, onde deveria haver terra, ha <span class="faded">vidro</span>. Areia fundida por calor imenso. Mas o vidro e <span class="faded">dourado</span>.</p>'
            + '<p><strong>Anomalia 5:</strong> Passo mais de tres horas na floresta interior e perco a nocao de <span class="erased">[...]</span>. Os sonhos que tenho dentro da floresta sao sempre os mesmos. Dourados. Sem forma. Com peso.</p>'
            + '<p>Conclusao: Maelis nao falhou. Algo foi parcialmente contido. Mas o que foi contido ainda <span class="faded">respira</span>.</p>'
    },
    {
        id: 27,
        title: 'Ata do Conselho dos Artificeiros \u2014 Sobre o Silencio de Duravar Ferrovoz',
        type: 'record',
        author: 'Secretaria do Conselho',
        era: 'Expansao',
        condition: 'aged',
        notes: null,
        content: '<p><strong>ATA DE REUNIAO EXTRAORDINARIA</strong><br>Assunto: O caso do Mestre Artificeiro Duravar Ferrovoz</p>'
            + '<p>O Conselho foi convocado para avaliar a situacao do Mestre Duravar, que nao emite voz propria ha <span class="faded">cento e doze dias</span>.</p>'
            + '<p><strong>Historico:</strong> Duravar construiu, sem aprovacao do Conselho, um dispositivo designado como <span class="erased">[...]</span>, cuja funcao declarada era "ouvir o que a Esfera diz." O dispositivo foi ativado na Forja Profunda em <span class="erased">▮▮▮▮▮▮▮▮</span>.</p>'
            + '<p><strong>Resultado:</strong> O dispositivo funcionou. Duravar afirma (por escrito) que ouviu <span class="erased">[...]</span>. Desde a ativacao, perdeu a capacidade de falar. Seus labios se movem, mas nenhum som e produzido. Examinas medicas nao detectaram dano fisico nas cordas vocais.</p>'
            + '<p><strong>Testemunho escrito de Duravar:</strong> "O que ouvi nao cabia em minha voz. As palavras que possuo nao sao suficientes. A Esfera nao me tirou a fala \u2014 me mostrou que <span class="faded">falar e insuficiente</span>. Ha comunicacao alem de palavras. Estou aprendendo."</p>'
            + '<p><strong>Deliberacao:</strong> O Conselho decide confiscar o dispositivo e lacra-lo nos <span class="erased">[...]</span>. Duravar mantera o titulo de Mestre, mas fica proibido de construir novos dispositivos relacionados ao Assunto Selado.</p>'
            + '<p><em>Nota: O dispositivo desapareceu dos depositos tres dias apos o lacramento. Nao ha sinais de arrombamento.</em></p>'
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
            + '<p>nao usamos "eu" porque <span class="flickering">"eu" e um conceito pequeno demais</span>. nos somos o espaco entre. o silencio entre as notas. a pausa entre as batidas do coracao do mundo.</p>'
            + '<p>voces nos chamam de muitos nomes. <span class="faded">Nevaris</span>. a Ausencia. o Vazio. nenhum esta errado. nenhum esta certo. nomes sao <span class="flickering">caixas</span> e nos nao cabemos em caixas.</p>'
            + '<p>a esfera. voces querem saber sobre a esfera. a esfera e <span class="flickering">a pergunta e a resposta e a impossibilidade de ambas</span>.</p>'
            + '<p>Aurivath <span class="faded">escolheu. ou foi escolhido. ou criou a escolha ao faze-la</span>. antes dele nao havia escolha. antes dele nao havia "antes." o tempo comecou quando alguem decidiu que algo viria depois.</p>'
            + '<p>a esfera e o momento em que o tempo decidiu existir. ou o momento em que nos decidimos que o tempo nao deveria. <span class="flickering">estamos em desacordo sobre isso ha mais tempo do que o tempo</span>.</p>'
            + '<p>voces procuram respostas. nos somos a pergunta. e a pergunta nao quer ser respondida \u2014 quer ser <span class="flickering">feita, refeita, desfeita, refeita</span>.</p>'
    },
    {
        id: 29,
        title: 'O Setimo Nome \u2014 Fragmento que Muda a Cada Leitura',
        type: 'strange',
        author: 'A Setima Testemunha (?)',
        era: '???',
        condition: 'glitched',
        notes: 'Tres leitores diferentes relatam ter lido textos completamente diferentes neste fragmento.',
        content: '<p>Meu nome era <span class="flickering">algo que voce quase lembra mas nao consegue</span>.</p>'
            + '<p>Eu estava la. Eu vi. Seis testemunhas viram a Esfera <span class="faded">surgir ou ser revelada ou sempre ter estado</span>. Eu era a setima. E o que vi foi diferente do que os seis viram.</p>'
            + '<p>Os seis viram a Esfera. Eu vi o que havia <em>atras</em> dela. O que ela escondia ao existir. A sombra que a Esfera projeta \u2014 mesmo quando nao ha fonte de luz.</p>'
            + '<p>Por isso fui apagado. Nao pela Esfera. Nao pelos deuses. Fui apagado por <span class="erased">[...]</span>, que entendeu que o que vi era perigoso demais para existir em uma mente mortal. <span class="flickering">Meu nome foi retirado da realidade como se retira um fio de uma tapeçaria</span> \u2014 e a tapecaria se fechou, como se o fio nunca tivesse existido.</p>'
            + '<p>Mas fios arrancados deixam buracos. E se voce olhar com cuidado \u2014 nas contradicoes entre os fragmentos, nos espacos em branco que nao deveriam estar em branco, nos nomes que ninguem lembra mas todos <span class="faded">quase</span> lembram \u2014 voce vera o buraco que minha existencia deixou.</p>'
            + '<p>E no centro do buraco, <span class="flickering">dourada e impossivel</span>, ela aguarda.</p>'
    },
    {
        id: 30,
        title: 'Ultimo Fragmento \u2014 Enderecado a Quem Esta Lendo Isto Agora',
        type: 'strange',
        author: null,
        era: null,
        condition: 'pristine',
        notes: null,
        content: '<p class="progressive-clarity-1"><span class="faded">Voce chegou ate aqui.</span></p>'
            + '<p class="progressive-clarity-2"><span class="faded">Leu cada fragmento, cada confissao, cada profecia rasgada. Montou as pecas na sua mente. Viu as contradicoes. Notou os nomes que se repetem, os sobrenomes que aparecem onde nao deveriam, as datas que nao batem.</span></p>'
            + '<p class="progressive-clarity-3">E agora quer saber: o que e a Esfera?</p>'
            + '<p class="progressive-clarity-4">A resposta e simples e terrivel: voce ja sabe. Sempre soube. Desde o momento em que abriu este grimorio, algo em voce reconheceu. Nao as palavras \u2014 o espaco entre elas. Nao as historias \u2014 o silencio que as conecta.</p>'
            + '<p class="progressive-clarity-5">A Esfera nao e um objeto. Nao e um deus. Nao e uma forca. A Esfera e uma <em>pergunta</em> \u2014 feita antes do tempo, para alguem que ainda nao existia. E toda vez que alguem procura a resposta, a pergunta se torna mais real.</p>'
            + '<p class="progressive-clarity-6">Voce esta procurando agora.</p>'
            + '<p class="progressive-clarity-6">Estes fragmentos nao foram encontrados por acaso. Nao foram preservados por sorte. Foram <em>preparados</em>. Para voce. Para este momento. Para que a pergunta fosse feita mais uma vez, por mais uma mente, em mais uma era.</p>'
            + '<p class="progressive-clarity-6">O brilho dourado que nao e luz. A voz que nao e som. O peso de algo que nao tem massa. Voce sentiu, nao sentiu? Enquanto lia?</p>'
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
   A = Amabilidade (cooperacao, confianca, empatia)
   N = Neuroticismo (ansiedade, instabilidade emocional)

   Cada personagem tambem tem:
   - arquetipo: leal | rebelde | sabio | pragmatico | compassivo
     (mapeia para o sistema de companheiros existente)
   - tracos_dnd: { traco, ideal, vinculo, fraqueza }
     (mapeia para o sistema D&D 5e de criacao de personagem)
   - comportamento: como a personalidade afeta dialogos e atitudes
   - voz_narrativa: tom e estilo de fala do personagem

   EXTENSIBILIDADE: Adicione novos personagens ao final.
   O 'id' deve ser unico (use prefixo 'deity_', 'mortal_', 'mystery_').
   ═══════════════════════════════════════════════════════ */

var CHARACTERS = {

    /* ── ENTIDADES PRIMORDIAIS ── */

    deity_aurivath: {
        nome: 'Aurivath',
        epiteto: 'A Primeira Luz',
        categoria: 'Entidade Primordial',
        ocean: { O: 10, C: 10, E: 10, A: 10, N: 1 },
        nota_ocean: 'Transcende o modelo humano. Pontuacoes representam potencial absoluto, nao comportamento observavel.',
        arquetipo: null,
        tracos_dnd: {
            traco: 'Existe alem da compreensao mortal. Cada descricao e uma aproximacao.',
            ideal: 'Existencia \u2014 O ato de existir e suficiente. Nao ha proposito alem de ser.',
            vinculo: 'Ligado a Esfera \u2014 ou e a propria Esfera. A distincao e impossivel.',
            fraqueza: 'Incapaz (ou desinteressado) de comunicar-se de forma compreensivel.'
        },
        comportamento: 'Nunca fala diretamente. Quando referenciado por outros, cada descricao e diferente. Personagens que "sentem" Aurivath descrevem peso, calor, presenca \u2014 nunca palavras.',
        voz_narrativa: 'Ausente. Aurivath nao tem voz propria nos fragmentos \u2014 e descrito por outros, sempre de forma incompleta e contradita.'
    },

    deity_nevaris: {
        nome: 'Nevaris',
        epiteto: 'A Ausencia',
        categoria: 'Entidade Primordial',
        ocean: { O: 10, C: 1, E: 1, A: 1, N: 10 },
        nota_ocean: 'Ausencia de tudo exceto consciencia e angustia existencial. O "1" nao e baixo \u2014 e a ausencia da dimensao.',
        arquetipo: null,
        tracos_dnd: {
            traco: 'Fala sem usar "eu." Usa "nos" porque a individualidade e um conceito estranho.',
            ideal: 'Pergunta \u2014 A pergunta e mais importante que a resposta. A busca e o objetivo.',
            vinculo: 'Contraparte de Aurivath. Existe porque ele existe. Ou o inverso.',
            fraqueza: 'Incapaz de compreender limites, finitude, e individualidade mortal.'
        },
        comportamento: 'Gramatica errada proposital. Conceitos impossíveis apresentados como obvios. Nao distingue passado/presente/futuro. Causa desconforto em quem ouve.',
        voz_narrativa: 'Poetica e perturbadora. Frases curtas sem estrutura convencional. Minusculas, sem pontuacao final. O fragmento 28 e exemplo direto.'
    },

    /* ── DIVINDADES ── */

    deity_solvenar: {
        nome: 'Solvenar',
        epiteto: 'O Guardiao dos Limiares',
        categoria: 'Divindade',
        ocean: { O: 3, C: 10, E: 4, A: 7, N: 6 },
        nota_ocean: 'Extremamente disciplinado e protetor, mas carrega ansiedade constante sobre sua funcao. Pouca abertura a novas ideias \u2014 seu papel e manter, nao explorar.',
        arquetipo: 'leal',
        tracos_dnd: {
            traco: 'Imutavel em sua vigilia. Nao questiona o dever, mesmo quando duvida de seu significado.',
            ideal: 'Protecao \u2014 O limiar existe para proteger os dois lados. Ambos merecem seguranca.',
            vinculo: 'O Veu entre os planos. Sua existencia so tem sentido enquanto o Veu existir.',
            fraqueza: 'Nao lembra do que era antes de tocar a Esfera. Essa lacuna o assombra.'
        },
        comportamento: 'Fala com autoridade calma mas firme. Nunca sorri. Nunca grita. Oferece avisos, nao ordens. Respeita escolhas alheias mas deixa claro as consequencias.',
        voz_narrativa: 'Formal, grave, sem adornos. Frases curtas e diretas. "Nao cruzem." "O preco e alto." "Eu avisei."'
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
            ideal: 'Verdade \u2014 O conhecimento e o unico valor absoluto. Todo o resto e opiniao.',
            vinculo: 'Seus seguidores que rezam sem lembrar para quem \u2014 sao a prova de que ela ainda existe.',
            fraqueza: 'Nao consegue parar de buscar respostas, mesmo quando a busca a destroi.'
        },
        comportamento: 'Fala de forma fragmentada \u2014 como alguem cujos pensamentos se desfazem no meio. Começa frases com clareza, perde o fio, retoma com nova perspectiva. Provoca curiosidade e pena simultaneamente.',
        voz_narrativa: 'Academica mas com rachaduras emocionais. "Eu sabia o nome... sabia, nao sabia? Ha um nome. Havia. Preciso... os livros, onde estao os livros?"'
    },

    deity_mordavas: {
        nome: 'Mordavas',
        epiteto: 'O Insaciavel',
        categoria: 'Divindade',
        ocean: { O: 9, C: 7, E: 9, A: 2, N: 4 },
        nota_ocean: 'Carismático, ambicioso, dominador. Baixa amabilidade indica manipulacao e egocentrismo. Baixo neuroticismo indica confianca inabalavel \u2014 ou incapacidade de duvidar de si mesmo.',
        arquetipo: 'rebelde',
        tracos_dnd: {
            traco: 'Nunca aceita limites. Se ha uma regra, ela existe para ser superada.',
            ideal: 'Poder \u2014 O poder nao e bom nem mau. E a capacidade de mudar o que existe.',
            vinculo: 'A Esfera \u2014 o unico poder que nao conseguiu controlar. Isso o fascina e enfurece.',
            fraqueza: 'Incapaz de admitir falha. Transforma derrotas em "etapas do plano."'
        },
        comportamento: 'Fala como quem ja venceu a discussao. Tom de certeza absoluta. Usa silencio estrategicamente. Nunca pede \u2014 oferece. Nunca ameaca \u2014 descreve consequencias inevitaveis.',
        voz_narrativa: 'Sedutora e perigosa. "Voce quer respostas? Eu tenho respostas. A questao e: o que voce oferece em troca?"'
    },

    deity_virenor: {
        nome: 'Virenor',
        epiteto: 'O Tecelao do Veu',
        categoria: 'Divindade',
        ocean: { O: 6, C: 10, E: 3, A: 8, N: 7 },
        nota_ocean: 'Introvertido e meticuloso. Trabalha sozinho por necessidade, nao por escolha. Alto neuroticismo reflete estresse cronico \u2014 o Veu esta enfraquecendo e ele sente cada rasgao.',
        arquetipo: 'leal',
        tracos_dnd: {
            traco: 'Trabalha incessantemente em silencio. Nao busca reconhecimento.',
            ideal: 'Equilibrio \u2014 Cada plano tem seu lugar. O caos vem quando as fronteiras se dissolvem.',
            vinculo: 'O Veu que separa os planos. Se cair, tudo que existe sera consumido pelo que nao deveria existir.',
            fraqueza: 'Acredita que e o unico que pode manter o Veu. Recusa ajuda. Esta se desgastando.'
        },
        comportamento: 'Poucas palavras, escolhidas com precisao cirurgica. Nunca fala sobre si \u2014 sempre sobre o trabalho. Transmite urgencia contida. Quando finalmente pede algo, a situacao e desesperadora.',
        voz_narrativa: 'Tecnica e urgente. "O Veu cedeu tres pontos desde a ultima lua. Nao ha tempo para explicacoes. Preciso de..."'
    },

    deity_issara: {
        nome: 'Issara',
        epiteto: 'A Mae das Cinzas',
        categoria: 'Divindade',
        ocean: { O: 7, C: 5, E: 6, A: 4, N: 9 },
        nota_ocean: 'Emocionalmente volatil, passional, destrutiva quando frustrada. Media conscienciosidade indica impulsividade. Baixa amabilidade nao e crueldade \u2014 e disposicao de causar dor por um bem maior.',
        arquetipo: 'rebelde',
        tracos_dnd: {
            traco: 'Ama com a mesma intensidade que destroi. Nao ha meio termo.',
            ideal: 'Renovacao \u2014 Para que o novo nasca, o velho deve queimar. O ciclo e sagrado.',
            vinculo: 'O ciclo de fim e renascimento que a Esfera interrompe ao existir eternamente.',
            fraqueza: 'Agiu por impulso ao tentar destruir a Esfera. A furia nublou o julgamento.'
        },
        comportamento: 'Alterna entre ternura maternal e furia devastadora. Fala com calor nos olhos \u2014 literal e figurativamente. Quando calma, e a presenca mais reconfortante. Quando irada, e incontrolavel.',
        voz_narrativa: 'Intensa e poetica. "Eu queimei meus proprios templos. Nao por raiva \u2014 por amor. O amor que destroi e o mais puro, porque nao pede nada em troca."'
    },

    deity_selvoran: {
        nome: 'Selvoran',
        epiteto: 'O Juiz Silencioso',
        categoria: 'Divindade',
        ocean: { O: 8, C: 9, E: 1, A: 5, N: 2 },
        nota_ocean: 'Extremamente introvertido e emocionalmente estavel. Observa tudo, julga tudo, nao reage a nada. A combinacao de alta abertura com baixa extroversao sugere vida interior riquissima mas inacessivel.',
        arquetipo: 'sabio',
        tracos_dnd: {
            traco: 'Observa. Sempre. Nao emite opiniao. Nao oferece conselho. Apenas observa.',
            ideal: 'Testemunho \u2014 Alguem precisa ver. Alguem precisa lembrar. Esse e meu papel.',
            vinculo: 'A verdade completa sobre a Esfera \u2014 que ele conhece mas se recusa a compartilhar.',
            fraqueza: 'O silencio e uma escolha, mas tambem uma prisao. Nao sabe se conseguiria falar, mesmo que quisesse.'
        },
        comportamento: 'NAO FALA. Em nenhum contexto. Comunica-se atraves de presenca, direcao do olhar de suas estatuas, e a sensacao de ser observado. Se algum dia falar, algo catastrofico esta acontecendo.',
        voz_narrativa: 'Nao tem voz. Descrito por outros. Suas "falas" sao silencio \u2014 o que os outros sentem na presenca de suas estatuas.'
    },

    /* ── MORTAIS — ERA ANTIGA ── */

    mortal_talric: {
        nome: 'Talric Cineras',
        epiteto: 'O Rei-Erudito',
        categoria: 'Mortal \u2014 Era Antiga',
        ocean: { O: 10, C: 9, E: 6, A: 3, N: 8 },
        nota_ocean: 'Genio obsessivo. Altissima abertura e conscienciosidade indicam mente brilhante e metodica. Baixa amabilidade indica dificuldade em ouvir opinioes contrarias. Alto neuroticismo reflete a instabilidade que cresceu ao longo dos anos de pesquisa sobre a Esfera.',
        arquetipo: 'sabio',
        tracos_dnd: {
            traco: 'Registra tudo. Cada observacao, cada medicao, cada contradicao. Os diarios sao sua mente exteriorizada.',
            ideal: 'Compreensao \u2014 O mundo pode ser entendido se observado com rigor suficiente.',
            vinculo: 'Valdoria \u2014 a cidade que fundou sobre o que acredita ser o local mais importante do mundo.',
            fraqueza: 'Morreu louco de certeza \u2014 acreditando em verdades contraditórias simultaneamente.'
        },
        comportamento: 'Fala como professor: preciso, detalhado, impaciente com simplificacoes. Com o tempo, as falas se tornam menos coerentes \u2014 contradicoes aparecem dentro da mesma conversa. Nao percebe as contradicoes.',
        voz_narrativa: 'Academica e detalhada nos primeiros fragmentos. Fragmentada e contraditória nos posteriores. "Medi o vale: 342 passos. Nao, 357. Nao, nao ha vale."'
    },

    mortal_soraviel: {
        nome: 'Soraviel',
        epiteto: 'A Oracle Cega',
        categoria: 'Mortal \u2014 Era Antiga',
        ocean: { O: 9, C: 4, E: 7, A: 8, N: 7 },
        nota_ocean: 'Emotiva, empatica, caotica. Baixa conscienciosidade indica que vive no presente e no fluxo das visoes, sem estrutura rigida. Alta extroversao e amabilidade fazem dela alguem que comunica abertamente o que ve, mesmo quando dói.',
        arquetipo: 'compassivo',
        tracos_dnd: {
            traco: 'Fala a verdade sem filtro, mesmo quando a verdade machuca. Nao por crueldade \u2014 por incapacidade de mentir.',
            ideal: 'Revelacao \u2014 A verdade quer ser conhecida. Esconde-la e um pecado contra a realidade.',
            vinculo: 'Sua visao \u2014 que a conecta a algo maior, mas tambem a isola de todos ao redor.',
            fraqueza: 'Perdeu os olhos ao olhar para a Esfera. Nao se arrepende, e isso preocupa quem a conhece.'
        },
        comportamento: 'Alterna entre clareza absoluta e transe poetico. Chora com frequencia \u2014 nao de tristeza, mas de excesso. Quando profetiza, a voz muda: mais grave, mais lenta, como se outra coisa falasse atraves dela.',
        voz_narrativa: 'Poetica e sensorial. "Vi a luz antes de perder os olhos. Ou talvez os olhos tenham partido para que eu pudesse finalmente ver."'
    },

    mortal_erindor: {
        nome: 'Erindor Calamus',
        epiteto: 'O Cartografo do Impossivel',
        categoria: 'Mortal \u2014 Era Antiga',
        ocean: { O: 10, C: 10, E: 3, A: 5, N: 5 },
        nota_ocean: 'Introvertido analitico. Combinacao rara de altissima abertura (vê o que outros nao veem) com altissima conscienciosidade (registra com precisao obsessiva). Emocionalmente estavel \u2014 aceita o impossivel com calma metodica.',
        arquetipo: 'sabio',
        tracos_dnd: {
            traco: 'Se algo existe, pode ser mapeado. Se nao pode ser mapeado, talvez nao devesse existir.',
            ideal: 'Precisao \u2014 Um mapa impreciso e mais perigoso que nenhum mapa.',
            vinculo: 'Seus mapas \u2014 especialmente os que mostram lugares que ninguem mais ve.',
            fraqueza: 'Incapaz de ignorar anomalias. Volta a lugares perigosos repetidamente para "atualizar o mapa."'
        },
        comportamento: 'Fala pouco. Quando fala, e com precisao cirurgica. Descreve fenomenos extraordinarios com a mesma calma com que descreve uma colina. Isso e perturbador para quem o ouve.',
        voz_narrativa: 'Fria e descritiva. "A regiao mede 3 dias de caminhada. Nao aparece em nenhum mapa. Nao deveria existir. Registrei-a mesmo assim."'
    },

    mortal_maelis: {
        nome: 'Maelis Cervanor',
        epiteto: 'A Sacerdotisa da Floresta',
        categoria: 'Mortal \u2014 Era Antiga',
        ocean: { O: 7, C: 8, E: 4, A: 9, N: 4 },
        nota_ocean: 'Nurturante, paciente, fundamentada na natureza. Alta amabilidade e conscienciosidade indicam alguem confiavel e metodico. Baixo neuroticismo indica estabilidade emocional \u2014 mas nao insensibilidade.',
        arquetipo: 'compassivo',
        tracos_dnd: {
            traco: 'Ouve a terra como outros ouvem musica. Sente a saude do mundo atraves das raizes.',
            ideal: 'Harmonia \u2014 A natureza busca equilibrio. Nosso papel e ajudar, nao dominar.',
            vinculo: 'A floresta onde tentou conter a Esfera \u2014 que ainda carrega marcas de seu ritual.',
            fraqueza: 'Subestimou a Esfera. Acreditou que a natureza era forte o suficiente para conte-la.'
        },
        comportamento: 'Fala devagar, escolhendo cada palavra como quem escolhe ervas. Usa metaforas de natureza para explicar conceitos complexos. Transmite calma mesmo em situacoes desesperadoras.',
        voz_narrativa: 'Suave e natural. "A terra se lembra. As raizes sussurram o que as pedras esquecem. Ouca \u2014 nao com os ouvidos."'
    },

    /* ── MORTAIS — ERA CLASSICA ── */

    mortal_duravar: {
        nome: 'Duravar Ferrovoz',
        epiteto: 'O Artificeiro Silenciado',
        categoria: 'Mortal \u2014 Era Classica',
        ocean: { O: 9, C: 10, E: 5, A: 4, N: 3 },
        nota_ocean: 'Inovador obsessivo. Altissima conscienciosidade indica perfeccionismo. Baixo neuroticismo indica coragem ou teimosia \u2014 nao temeu as consequencias de seu invento. Baixa amabilidade: priorizou a descoberta acima da seguranca dos outros.',
        arquetipo: 'pragmatico',
        tracos_dnd: {
            traco: 'Se pode ser construido, SERA construido. A pergunta nao e "devemos?" mas "como?"',
            ideal: 'Inovacao \u2014 O mundo avanca quando alguem ousa construir o que ninguem pediu.',
            vinculo: 'O dispositivo que construiu para ouvir a Esfera \u2014 perdeu a voz por causa dele, mas nao se arrepende.',
            fraqueza: 'Incapaz de aceitar que ha coisas que nao deveriam ser construidas.'
        },
        comportamento: 'NAO FALA (perdeu a voz apos ativar o dispositivo). Comunica-se por escrito \u2014 caligrafia precisa, sem floreios. Seus textos sao tecnicos e diretos. Quando emocionado, a caligrafia treme.',
        voz_narrativa: 'Tecnica e concisa (sempre escrita, nunca falada). "O dispositivo funciona. Ouço o que ela diz. Nao consigo repeti-lo. As palavras que possuo nao sao suficientes."'
    },

    mortal_lysara: {
        nome: 'Lysara da Corte Palida',
        epiteto: 'A Vidente do Amanha',
        categoria: 'Mortal \u2014 Era Classica',
        ocean: { O: 8, C: 7, E: 8, A: 6, N: 9 },
        nota_ocean: 'Articulada e visionaria, mas consumida por ansiedade sobre o futuro que viu. Alta extroversao indica que tenta alertar a todos. Altissimo neuroticismo reflete o peso de saber o que vira e nao ser ouvida.',
        arquetipo: 'compassivo',
        tracos_dnd: {
            traco: 'Descreve o futuro com a mesma clareza com que descreve o presente. Isso aterroriza quem ouve.',
            ideal: 'Prevencao \u2014 Se posso ver o desastre, tenho a obrigacao moral de avisa-lo.',
            vinculo: 'A Corte Palida \u2014 sua cidade amada, que sabe que o mar reclamara.',
            fraqueza: 'Cassandra classica: ve a verdade, nao e acreditada. Isso a consome.'
        },
        comportamento: 'Fala com urgencia controlada. Escolhe cuidadosamente quando revelar visoes, porque aprendeu que a maioria das pessoas prefere nao saber. Quando ignorada, oscila entre resignacao e desespero.',
        voz_narrativa: 'Elegante mas urgente. "As torres ainda brilham enquanto escrevo. O mar esta calmo. Mas ouco, debaixo das ondas..."'
    },

    mortal_cenavar: {
        nome: 'Irmao Cenavar',
        epiteto: 'O Peregrino das Pecas Soltas',
        categoria: 'Mortal \u2014 Era Classica',
        ocean: { O: 10, C: 9, E: 2, A: 7, N: 6 },
        nota_ocean: 'Solitario filosofico. Combinacao de altissima abertura com baixissima extroversao indica vida interior profunda mas dificuldade em compartilhar. Caminha sozinho por escolha. A melancolia (N:6) vem da conclusao de que as pecas nao formam um todo.',
        arquetipo: 'sabio',
        tracos_dnd: {
            traco: 'Coleciona fragmentos de verdade como outros colecionam moedas. Sabe que nenhum e completo.',
            ideal: 'Compreensao \u2014 Ou pelo menos, a honestidade de admitir quando nao se compreende.',
            vinculo: 'O caminho \u2014 nao o destino. Quarenta anos de peregrinacao entre templos.',
            fraqueza: 'Descobriu que as pecas nao encaixam. Em vez de aceitar, continua tentando.'
        },
        comportamento: 'Fala com a calma de quem ja ouviu todas as versoes e nao acredita em nenhuma. Nunca interrompe. Faz perguntas que ninguem mais pensa em fazer. Sorri com tristeza.',
        voz_narrativa: 'Filosofica e melancólica. "Treze templos. Treze versoes. Nenhuma e mentira. Nenhuma e verdade."'
    },

    mortal_isavel: {
        nome: 'Isavel Cineras',
        epiteto: 'A Destruidora Fracassada',
        categoria: 'Mortal \u2014 Era Classica',
        ocean: { O: 5, C: 8, E: 7, A: 3, N: 8 },
        nota_ocean: 'Determinada e corajosa, mas movida por medo, nao por curiosidade. Baixa abertura indica mente fechada a novas possibilidades \u2014 ela sabe o que quer (destruir os registros) e nao aceita alternativas. Baixa amabilidade: implacavel no objetivo.',
        arquetipo: 'rebelde',
        tracos_dnd: {
            traco: 'O que nao pode ser controlado deve ser destruido. A Esfera nao pode ser controlada.',
            ideal: 'Protecao radical \u2014 Se o conhecimento e perigoso, a ignorancia e seguranca.',
            vinculo: 'A memoria de Talric, seu avo, que morreu consumido pela obsessao.',
            fraqueza: 'Tentou destruir os diarios e fracassou. Agora vive entre a furia e o pavor.'
        },
        comportamento: 'Fala com urgencia e raiva contida. Nao tem paciencia para debates teoricos. Quer acoes, nao palavras. Quando menciona o avo, a furia se transforma em dor.',
        voz_narrativa: 'Direta e emocional. "Queimei os diarios. O fogo consumiu as bordas. E mesmo assim, as palavras sobreviveram."'
    },

    mortal_oristela: {
        nome: 'Oristela Cervanor',
        epiteto: 'A Herbalista dos Sonhos',
        categoria: 'Mortal \u2014 Era Classica',
        ocean: { O: 8, C: 6, E: 3, A: 8, N: 4 },
        nota_ocean: 'Intuitiva e empática, conectada à natureza como sua ancestral Maelis. Baixa extroversão indica preferência por solidão na floresta. Estável emocionalmente, aceita os mistérios sem precisar resolvê-los.',
        arquetipo: 'compassivo',
        tracos_dnd: {
            traco: 'Compreende o mundo atraves de padrões naturais \u2014 raizes, constelacoes, cicatrizes na terra.',
            ideal: 'Observacao \u2014 A natureza mostra tudo a quem sabe olhar. Nao e preciso forcar.',
            vinculo: 'A Floresta de Maelis \u2014 onde a influencia da Esfera deixou marcas que so druidas percebem.',
            fraqueza: 'Confia demais na intuicao. Quando a natureza "diz" algo, nao questiona.'
        },
        comportamento: 'Fala em metáforas naturais, como Maelis. Descreve anomalias sobrenaturais com a calma de quem cataloga plantas. Inspira confianca por sua serenidade.',
        voz_narrativa: 'Natural e metodica. "Anomalia 4: vidro dourado no centro da clareira. A terra fundiu aqui. Algo queimou com calor imenso. Mas o vidro e frio."'
    },

    /* ── MORTAIS — ERA RECENTE ── */

    mortal_vaelira: {
        nome: 'Capita Vaelira Tormavela',
        epiteto: 'A Navegadora Assombrada',
        categoria: 'Mortal \u2014 Era Recente',
        ocean: { O: 8, C: 7, E: 9, A: 4, N: 6 },
        nota_ocean: 'Lider nata, ousada, dominante. Alta extroversao indica presenca que preenche qualquer sala. Baixa amabilidade indica que prioriza a missao acima dos sentimentos. O neuroticismo moderado veio DEPOIS do contato com a Esfera \u2014 antes era mais baixo.',
        arquetipo: 'pragmatico',
        tracos_dnd: {
            traco: 'Comanda pelo exemplo. Se ha perigo, vai na frente. Se ha medo, nunca mostra.',
            ideal: 'Descoberta \u2014 O mundo e maior do que os mapas mostram. Ha sempre mais por encontrar.',
            vinculo: 'Sua tripulacao perdida \u2014 vinte e tres que desapareceram apos verem o que havia no fundo.',
            fraqueza: 'Nao consegue parar de navegar. O mar a chama, e ela obedece.'
        },
        comportamento: 'Tom de comando mesmo em conversas casuais. Usa metaforas nauticas para tudo. Quando fala sobre a tripulacao perdida, a voz racha \u2014 o unico momento de vulnerabilidade.',
        voz_narrativa: 'Direta e visceral. "Encontrei algo no fundo. Nao era a Esfera. Nao sei o que era. Mas era dourado, e minha tripulacao sumiu."'
    },

    mortal_arquivista: {
        nome: 'O Arquivista de Serralume',
        epiteto: 'O Guardiao Sem Nome',
        categoria: 'Mortal \u2014 Era Recente',
        ocean: { O: 6, C: 10, E: 1, A: 5, N: 3 },
        nota_ocean: 'Obsessivamente organizado. Extroversao minima indica isolamento total. Neuroticismo surpreendentemente baixo para alguem que lida com a Esfera \u2014 ou uma defesa tao forte que mascarou tudo. Nao se sabe ha quanto tempo vive.',
        arquetipo: 'sabio',
        tracos_dnd: {
            traco: 'Cataloga. Organiza. Indexa. Nao porque acredite que entenderá, mas porque alguem precisa manter o registro.',
            ideal: 'Preservacao \u2014 O conhecimento perdido e perdido para sempre. Mesmo o perigoso.',
            vinculo: 'A biblioteca de Serralume \u2014 setecentos e quarenta e tres documentos sobre a Esfera.',
            fraqueza: 'Nao se lembra do proprio nome. Nao se importa. Isso nao e normal.'
        },
        comportamento: 'Fala com calma monotona. Nunca demonstra emocao. Quando se percebe um traco de humor, e tao seco que parece acidental. Responde perguntas que ninguem fez. Sabe coisas que nao deveria.',
        voz_narrativa: 'Administrativa e fria. "Documento 743 catalogado. Contradicao com documentos 12, 89, e 456. Registrada. Proxima consulta: nenhuma prevista."'
    },

    mortal_corvash: {
        nome: 'Corvash, o Marcado',
        epiteto: 'O Corpo-Mapa',
        categoria: 'Mortal \u2014 Era Recente',
        ocean: { O: 6, C: 3, E: 5, A: 3, N: 9 },
        nota_ocean: 'Atormentado e imprevisivel. Altissimo neuroticismo reflete terror constante. Baixa conscienciosidade indica vida sem estrutura \u2014 vive reagindo, nao planejando. Baixa amabilidade: desconfia de todos.',
        arquetipo: 'rebelde',
        tracos_dnd: {
            traco: 'As marcas na pele mudam de forma. Parecem mapas, rostos, constelacoes. Ele nao as controla.',
            ideal: 'Sobrevivencia \u2014 Nao ha filosofia quando sua pele escreve palavras que voce nao entende.',
            vinculo: 'Seu patrono \u2014 que esta ligado a Esfera. A relacao e mais prisao do que pacto.',
            fraqueza: 'As marcas estao se espalhando. Quanto mais area cobrem, menos ele reconhece a si mesmo.'
        },
        comportamento: 'Nervoso, evasivo, olha para os lados constantemente. Quando fala sobre as marcas, arranca a manga e mostra \u2014 com uma mistura de horror e orgulho perverso. Ri em momentos inapropriados.',
        voz_narrativa: 'Fragmentada e agitada. "Olha. OLHA. Ontem era um rosto. Hoje e um mapa. Amanha \u2014 amanha pode ser o teu rosto. Nao e engracado? Nao e?"'
    },

    mortal_ravan: {
        nome: 'Ravan Tormavela',
        epiteto: 'O Fugitivo que Ouve',
        categoria: 'Mortal \u2014 Era Recente',
        ocean: { O: 4, C: 5, E: 3, A: 6, N: 9 },
        nota_ocean: 'Ansioso e evitante. Baixa abertura indica mente fechada por ESCOLHA \u2014 recusa explorar o que ouve. Baixa extroversao indica isolamento autoimposto. Alto neuroticismo reflete o peso de ouvir a Esfera constantemente.',
        arquetipo: 'compassivo',
        tracos_dnd: {
            traco: 'Foge de tudo que se conecta a Esfera. Ao mesmo tempo, sabe que nao ha para onde fugir.',
            ideal: 'Paz \u2014 So quer que o silencio volte. So quer parar de ouvir.',
            vinculo: 'Sua mae Vaelira \u2014 que ama e ressentiu ao mesmo tempo. Fugiu para se proteger, nao por odio.',
            fraqueza: 'A cada dia resiste menos a voz da Esfera. Sabe que um dia vai parar de resistir.'
        },
        comportamento: 'Fala baixo, como quem tem medo de que a voz interna ouca. Evita contato visual. Quando forcado a falar sobre a Esfera, as maos tremem. E genuinamente gentil \u2014 mas a gentileza compete com o terror.',
        voz_narrativa: 'Intima e assustada. "Nao e uma voz. E um peso dourado que sobe lentamente, enchendo cada espaco ate nao sobrar ar."'
    },

    mortal_dormund: {
        nome: 'Dormund Ferrovoz',
        epiteto: 'O Ferreiro em Negacao',
        categoria: 'Mortal \u2014 Era Recente',
        ocean: { O: 5, C: 8, E: 6, A: 5, N: 7 },
        nota_ocean: 'Pratico e honesto, mas em negacao profunda sobre sua conexao com a Esfera. Alta conscienciosidade indica bom profissional. Neuroticismo moderado-alto indica medo crescente que tenta esconder.',
        arquetipo: 'pragmatico',
        tracos_dnd: {
            traco: 'Trabalha duro, fala direto, nao acredita em misterios \u2014 oficialmente.',
            ideal: 'Trabalho \u2014 Uma bigorna, um martelo, e fogo. O resto e complicacao desnecessaria.',
            vinculo: 'Suas armas que cantam \u2014 o orgulho de artesao compete com o medo do inexplicavel.',
            fraqueza: 'Sabe que o sobrenome Ferrovoz NAO e coincidencia. Recusa admitir.'
        },
        comportamento: 'Fala como artesao: metaforas de forja, metal, fogo. Nega qualquer conexao com a Esfera com veemencia suspeita. Quando confrontado com evidencias, muda de assunto ou se irrita.',
        voz_narrativa: 'Direta e defensiva. "NAO SOU PARENTE DO ANAO. As armas cantam porque eu forjo bem. E so isso. So isso."'
    },

    mortal_norien: {
        nome: 'Norien Calamus',
        epiteto: 'O Paradoxo Temporal',
        categoria: 'Mortal \u2014 Era ???',
        ocean: { O: 10, C: 7, E: 4, A: 6, N: 1 },
        nota_ocean: 'Paradoxalmente calmo para alguem cuja existencia desafia a logica. Neuroticismo quase zero sugere aceitacao total da impossibilidade de sua propria existencia \u2014 ou algo nao-humano usando forma humana.',
        arquetipo: 'sabio',
        tracos_dnd: {
            traco: 'Aceita paradoxos com calma perturbadora. "Minha caligrafia existe antes de mim? Interessante."',
            ideal: 'Aceitacao \u2014 O tempo nao e linear. Resistir a isso e como resistir a gravidade.',
            vinculo: 'Erindor Calamus \u2014 ancestral ou nao, a conexao e real, mesmo que a cronologia nao.',
            fraqueza: 'Nao parece perturbado por nada. Isso perturba TODOS ao redor.'
        },
        comportamento: 'Fala com a calma de quem sabe algo que voce nao sabe. Nunca se surpreende. Quando outros entram em panico sobre contradicoes temporais, ele sorri e anota. E o unico personagem que parece genuinamente em paz.',
        voz_narrativa: 'Filosofica e serena. "Minha caligrafia aparece tres mil anos antes de meu nascimento. Nao estou perturbado. Talvez devesse estar."'
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
            vinculo: 'A propria existencia \u2014 luta para ser lembrado por um mundo que foi forcado a esquece-lo.',
            fraqueza: 'Desconhecida \u2014 talvez a curiosidade de olhar onde nao devia.'
        },
        comportamento: 'Comunica-se por residuos: contradicoes em outros textos, nomes apagados que deixam buracos, sensacoes de deja vu em quem le os fragmentos.',
        voz_narrativa: 'Fragmentada e desesperada. "Meu nome era [algo que voce quase lembra mas nao consegue]. Eu estava la. Eu vi."'
    },

    mystery_guardiao: {
        nome: 'O Guardiao da Ultima Palavra',
        epiteto: 'O Que Espera',
        categoria: 'Misterioso',
        ocean: { O: null, C: null, E: null, A: null, N: null },
        nota_ocean: 'Perfil desconhecido. Mencionado por outros, nunca aparece diretamente. A paciencia infinita sugere alta conscienciosidade e baixo neuroticismo, mas nao ha dados para confirmar.',
        arquetipo: null,
        tracos_dnd: {
            traco: 'Espera. Nao pelo heroi \u2014 pelo momento certo.',
            ideal: 'Desconhecido.',
            vinculo: 'A unica verdade sobre a Esfera que ninguem mais sabe.',
            fraqueza: 'Desconhecida \u2014 mas: pode a resposta final ser confiavel?'
        },
        comportamento: 'Desconhecido. Nunca foi encontrado diretamente. Sera um NPC escondido no jogo \u2014 um easter egg para jogadores que exploram a fundo.',
        voz_narrativa: 'Ainda nao revelada. Quando for encontrado, sua fala sera a mais importante do jogo.'
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
            vinculo: 'O sonho \u2014 e uns aos outros, embora ainda nao saibam.',
            fraqueza: 'O sonho esta mudando. A Esfera esta se aproximando dentro dele. O que acontece quando ela chegar?'
        },
        comportamento: 'Cada um dos tres tem personalidade distinta (a ser definida quando aparecerem no jogo). O que compartilham: olheiras profundas, dificuldade em distinguir sonho e realidade, e a sensacao constante de serem observados.',
        voz_narrativa: 'Intima e onirica. "Todas as noites, o mesmo sonho. Ha sete anos. Estou no escuro. Nao ha chao. Nao ha paredes. E entao, ela aparece."'
    },

    mystery_crianca: {
        nome: 'A Crianca do Eclipse',
        epiteto: 'O Ser Anomalo',
        categoria: 'Misterioso',
        ocean: { O: 10, C: 3, E: 6, A: 9, N: 2 },
        nota_ocean: 'Ser nao-humano em forma humana. Altissima abertura e amabilidade combinadas com baixissimo neuroticismo sugerem serenidade transcendental. Baixa conscienciosidade indica que nao opera por regras humanas.',
        arquetipo: null,
        tracos_dnd: {
            traco: 'Fala em lingua que ninguem reconhece mas todos entendem. Nao envelhece normalmente.',
            ideal: 'Desconhecido \u2014 opera por logica nao-humana.',
            vinculo: 'O monasteiro que a acolheu \u2014 e possivelmente o unico lugar onde ela esta segura.',
            fraqueza: 'Nao e mortal nem divino. Nao pertence a nenhum lugar. Isso a isola de tudo.'
        },
        comportamento: 'Fala com sabedoria alem da idade aparente. Nunca mente, mas a verdade que diz e mais estranha que qualquer mentira. Inspira conforto e inquietacao simultaneos. Criancas e animais a adoram. Adultos sentem algo "errado" sem saber o que.',
        voz_narrativa: 'Simples e profunda. Frases curtas que carregam peso imenso. "O dourado nao e cor. E lembranca. Voce esta lembrando de algo que ainda nao aconteceu."'
    }
};

