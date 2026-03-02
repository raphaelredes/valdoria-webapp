// Personality options per background (D&D 5e PHB Chapter 4)
// All texts are ORIGINAL — inspired by D&D themes but not copied from PHB.
const PERSONALITY_DATA = {
    soldier: {
        traits:['Encaro cada desafio de frente, como faria num campo de batalha.','Mantenho disciplina rígida e acordo antes do amanhecer.','Conto histórias de guerra que deixam todos boquiabertos.','Avalio cada situação como um estrategista, buscando vantagem tática.'],
        ideals:['Honra — Minha palavra é meu escudo.','Proteção — Os fracos dependem de quem tem força.','Glória — Busco feitos que ecoem por gerações.','Disciplina — A ordem mantém o caos à distância.'],
        bonds:['Lutei ao lado de camaradas que deram tudo.','Perdi alguém importante em combate.','Jurei proteger minha terra natal.','Meu antigo comandante confiou em mim.'],
        flaws:['Dificuldade em confiar quem não provou valor.','Às vezes sou rígido demais.','Reajo agressivamente a provocações.','Obedeço ordens sem questionar.']
    },
    sage: {
        traits:['Sempre busco aprender algo novo.','Uso palavras difíceis e depois explico.','Prefiro a companhia de livros à de pessoas.','Analiso tudo racionalmente antes de decidir.'],
        ideals:['Conhecimento — O saber é a maior riqueza.','Verdade — Mentiras são os verdadeiros inimigos.','Descoberta — Cada mistério abre novos horizontes.','Ensino — Conhecimento só vale quando compartilhado.'],
        bonds:['Busco um tomo antigo com segredos perdidos.','Meu mentor me ensinou tudo.','Uma pergunta me atormenta sem descanso.','A biblioteca onde cresci foi destruída.'],
        flaws:['Desprezo quem não valoriza o aprendizado.','Fico absorto em pensamentos e ignoro perigos.','Acredito que sempre tenho razão.','Guardo segredos perigosos.']
    },
    criminal: {
        traits:['Sempre tenho um plano de fuga.','Observo cada pessoa antes de relaxar.','Falo com gírias que confundem quem não é das ruas.','Mantenho compostura sob pressão.'],
        ideals:['Liberdade — Correntes existem para serem quebradas.','Lealdade — Nunca traio quem me é fiel.','Oportunidade — Cada crise é chance de lucro.','Justiça — Roubo dos ricos o que tiraram dos pobres.'],
        bonds:['Tenho um parceiro que confia em mim cegamente.','Devo uma dívida a alguém poderoso.','Roubei algo de grande valor e todos me procuram.','Alguém que amo foi preso injustamente.'],
        flaws:['Não resisto à tentação de um bom roubo.','Confio demais na minha esperteza.','Minto com facilidade e esqueço a verdade.','Quando complica, meu instinto é fugir.']
    },
    acolyte: {
        traits:['Vejo sinais divinos em acontecimentos banais.','Sempre ofereço uma oração antes de jornadas.','Trato cada pessoa com compaixão.','Cito escrituras para iluminar discussões.'],
        ideals:['Fé — Confio no plano divino.','Caridade — Dividir o que temos é o caminho.','Redenção — Todos merecem segunda chance.','Tradição — Os ritos nos conectam ao sagrado.'],
        bonds:['O templo onde cresci é meu lar espiritual.','Recebi uma visão divina que me guia.','Meu superior me confiou uma missão.','Perdi minha fé uma vez e jurei que não repetiria.'],
        flaws:['Julgo os outros com rigor excessivo.','Confio cegamente em autoridades religiosas.','Dificuldade em aceitar crenças diferentes.','Coloco missão sagrada acima da segurança dos aliados.']
    },
    noble: {
        traits:['Espero que todos me tratem com respeito.','Mantenho postura elegante em qualquer circunstância.','Tenho senso refinado de etiqueta.','Uso minha influência para abrir portas.'],
        ideals:['Responsabilidade — Privilégio vem com dever.','Poder — Nascidos para liderar devem exercê-lo.','Nobreza — O mérito está nas ações, não no sangue.','Legado — Construirei algo que perdure.'],
        bonds:['A honra da família é tudo para mim.','Herdei uma dívida ancestral.','Algo precioso foi roubado da minha linhagem.','Prometi tornar nosso nome respeitado.'],
        flaws:['Dificuldade em me misturar com classes inferiores.','Gasto dinheiro sem pensar.','Escondo um segredo vergonhoso da família.','Acredito que minha opinião vale mais.']
    },
    guild_artisan: {
        traits:['Examino a qualidade de objetos feitos à mão.','Trabalhar com as mãos me acalma.','Negocio tudo, até o que não está à venda.','Orgulho imenso do meu ofício.'],
        ideals:['Excelência — Cada peça deve ser melhor que a anterior.','Comunidade — A guilda nos fortalece.','Comércio — Bons negócios beneficiam ambos.','Inovação — O progresso é melhor que a tradição.'],
        bonds:['A guilda que me acolheu merece lealdade.','Minha obra-prima foi roubada.','Meu mestre confiou em mim para levar sua arte.','Sonho em abrir minha própria oficina.'],
        flaws:['Aceito trabalhos questionáveis por dinheiro.','Fico obsessivo com projetos.','Tenho ciúmes de artesãos mais talentosos.','Comprometo integridade por relações comerciais.']
    },
    outlander: {
        traits:['Prefiro dormir sob as estrelas.','Tenho senso de direção sobrenatural.','Falo pouco, mas cada palavra tem peso.','Observo a natureza para prever o que vem.'],
        ideals:['Liberdade — Muros e cidades são prisões.','Natureza — O mundo selvagem é mais honesto.','Sobrevivência — Só os adaptáveis permanecem.','Equilíbrio — Cada criatura tem seu lugar.'],
        bonds:['Um lugar selvagem que protejo com minha vida.','Fui exilado e busco provar que mereço voltar.','Um animal me salvou a vida.','Carrego um mapa para um lugar desconhecido.'],
        flaws:['Regras da cidade me confundem.','Sou desconfiado com estranhos.','Violência é minha primeira resposta.','Sinto desconforto em ambientes fechados.']
    },
    charlatan: {
        traits:['Adapto minha personalidade conforme a situação.','Tenho uma história pronta para qualquer momento.','Sorrio mesmo em perigo.','Estudo hábitos das pessoas para encontrar fraquezas.'],
        ideals:['Independência — Não devo satisfações a ninguém.','Astúcia — A mente vence o braço forte.','Prazer — A vida é curta para desperdiçar sendo honesto.','Ambição — Cada golpe me leva mais perto do topo.'],
        bonds:['Enganei alguém poderoso que me caça.','Alguém me ensinou a arte da trapaça.','Existe alguém que jamais enganaria.','Guardo a identidade falsa perfeita.'],
        flaws:['Não resisto a aplicar golpes, mesmo em aliados.','Acredito ser mais esperto que todos.','Fujo no primeiro sinal de perigo real.','Destruí relacionamentos com minhas mentiras.']
    },
    hermit: {
        traits:['Passo longos períodos em silêncio contemplativo.','Dificuldade com conversas triviais.','Coleto ervas e ingredientes estranhos.','Medito diariamente e fico irritável sem isso.'],
        ideals:['Iluminação — A resposta está dentro de nós.','Solidão — Sabedoria floresce longe do barulho.','Mistério — Nem todo segredo deve ser revelado.','Autossuficiência — Depender dos outros é fraqueza.'],
        bonds:['Descobri uma verdade cósmica e preciso agir.','Meu refúgio guarda algo que ninguém pode encontrar.','Deixei alguém para trás ao buscar solidão.','Recebi uma revelação que pode mudar tudo.'],
        flaws:['Sou socialmente estranho e inapropriado.','Minha revelação justifica qualquer ação.','Dificuldade em confiar em instituições.','Prefiro as vozes na minha mente.']
    },
    entertainer: {
        traits:['Adoro ser o centro das atenções.','Tenho piada ou canção para momentos difíceis.','Observo reações do público e me ajusto.','Pratico obsessivamente buscando perfeição.'],
        ideals:['Beleza — O mundo precisa de arte.','Inspiração — Minha arte desperta coragem.','Fama — Quero que cantem meu nome em todas as tavernas.','Criatividade — Regras existem para serem quebradas com estilo.'],
        bonds:['Quero me apresentar no grande palco da capital.','Meu instrumento carrega a alma da minha arte.','Um admirador me deu algo precioso.','Meu antigo grupo se separou e quero reuní-los.'],
        flaws:['Preciso de aplausos para me sentir bem.','Gasto tudo em roupas, bebidas e festas.','Não aceito críticas e reajo mal.','Faço promessas que nem sempre cumpro.']
    },
    folk_hero: {
        traits:['Defendo os oprimidos sem hesitar.','Sou modesto sobre minhas conquistas.','Trato todos igualmente, sem distinção.','Inspiro confiança com palavras simples.'],
        ideals:['Justiça — Tiranos devem responder ao povo.','Coragem — Alguém precisa se levantar.','Igualdade — Ninguém tem mais direitos por nascimento.','Sacrifício — O bem coletivo vale mais.'],
        bonds:['Minha vila me vê como herói.','Alguém que salvei jurou lealdade eterna.','O tirano que oprimiu meu povo ainda está por aí.','A terra onde nasci é tudo para mim.'],
        flaws:['Sou teimoso e me recuso a recuar.','Confio demais na bondade das pessoas.','Me culpo quando algo dá errado.','Meu senso de justiça me torna impulsivo.']
    },
    sailor: {
        traits:['Uso expressões náuticas em todas as conversas.','Fico inquieto longe do som das ondas.','Conto histórias de viagens absurdas.','Avalio o clima e o vento por instinto.'],
        ideals:['Aventura — O horizonte é um convite.','Fraternidade — A tripulação é família.','Riqueza — Tesouros esperam pelos corajosos.','Exploração — Cada porto é um mundo novo.'],
        bonds:['Meu navio é minha alma.','Perdi companheiros no mar.','Existe uma ilha lendária que avistei.','Devo um favor a um capitão.'],
        flaws:['Bebo demais em terra firme.','Dificuldade em seguir regras fora do mar.','Aceito desafios perigosos sem pensar.','Carrego superstições náuticas absurdas.']
    },
    urchin: {
        traits:['Guardo comida nos bolsos por instinto.','Conheço cada beco e passagem secreta.','Desconfio de gentileza gratuita.','Sou ágil e silencioso, passando despercebido.'],
        ideals:['Sobrevivência — Faço o necessário para ver o dia seguinte.','Comunidade — Cuido de outros órfãos.','Mudança — Ninguém deve nascer condenado à miséria.','Esperteza — Na rua, inteligência vale mais.'],
        bonds:['Tenho amigos nas ruas que arriscaram tudo por mim.','Alguém me deu abrigo quando mais precisei.','Prometi sair dessa vida e alcançar algo melhor.','Existe um lugar nas ruelas que é meu lar.'],
        flaws:['Roubo coisas pequenas por reflexo.','Dificuldade em confiar em autoridades.','Fujo de compromissos de longo prazo.','Invejo quem teve infância confortável.']
    }
};
