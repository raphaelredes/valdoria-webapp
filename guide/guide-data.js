/* ═══════════════════════════════════════════════════════════════
   GUIDE DATA — All help topics for Lendas de Valdoria
   ═══════════════════════════════════════════════════════════════ */

// eslint-disable-next-line no-unused-vars
var GUIDE_TOPICS = [
    {
        id: 'city_main', cat: 'cidade', icon: '\u{1f3d8}\ufe0f', title: 'Cidade de Eldoria',
        body: '<b>\u{1f3d8}\ufe0f CIDADE DE ELDORIA - GUIA</b>\n\nSeu ref\u00fagio seguro. Onde ir?\n\n<b>\u{1f3d5}\ufe0f Aventura</b>: Explorar biomas, encontros narrativos e combates\n<b>\u{1f3e8} Estalagem</b>: Recuperar Vida/Mana (Descanso Longo)\n<b>\u{1f3ea} Mercado</b>: Comprar/Vender Equipamentos e Mapas\n<b>\u{1f37a} Taverna</b>: Rumores, Jogos, Bebidas e Mercenar\u00edos\n<b>\u{1f6e1}\ufe0f Guilda</b>: Miss\u00f5es, Recompensas e Recrutar Aventureiros\n<b>\u{1f3db}\ufe0f Banco</b>: Guardar Ouro e Itens\n<b>\u26f2 Pra\u00e7a</b>: NPCs, Cart\u00f3grafo e Chat Global\n<b>\u26ea Templo</b>: Cura, Purifica\u00e7\u00e3o e B\u00ean\u00e7\u00e3os\n<b>\u{1f3f0} Port\u00f5es</b>: Guardas e Arredores da Cidade'
    },
    {
        id: 'temple', cat: 'cidade', icon: '\u{1f6d0}', title: 'Templo',
        body: '<b>\u{1f6d0} TEMPLO - GUIA R\u00c1PIDO</b>\n\nO Templo oferece servi\u00e7os divinos:\n\n<b>\u{1fa79} Curar Ferimentos (30 GP)</b>\n\u2022 Restaura HP usando magia sagrada\n\u2022 Usa dado 2d8+2 (m\u00e9dia 11 HP, m\u00e1x 18 HP)\n\n<b>\u{1f9ea} Purificar Veneno (40 GP)</b>\n\u2022 Remove venenos e doen\u00e7as (Lesser Restoration)\n\n<b>\u2728 Ben\u00e7\u00e3o da Claridade (25 GP)</b>\n\u2022 Restaura +5 MP\n\n<i>Dica: NPCs do templo mudam diariamente e cada um oferece di\u00e1logos \u00fanicos.</i>'
    },
    {
        id: 'tavern', cat: 'cidade', icon: '\u{1f37a}', title: 'Taverna',
        body: '<b>\u{1f37a} TAVERNA - GUIA R\u00c1PIDO</b>\n\nO centro social de Eldoria:\n\n<b>\u{1f5e3}\ufe0f Boatos (5 GP)</b>\n\u2022 Grom compartilha dicas sobre inimigos\n\u2022 +2 Dano contra um tipo de criatura\n\n<b>\u{1f37a} Bebidas</b>\n\u2022 Restauram HP e/ou MP levemente\n\n<b>\u2694\ufe0f Mercenar\u00edos</b>\n\u2022 Contrate guerreiros como companheiros permanentes\n\n<b>\u{1f3b2} Mesa de Jogos</b>\n\u2022 Aposte 10 ou 50 GP nos dados (D20 vs oponente)\n\u2022 Vit\u00f3ria = dobro do valor apostado!'
    },
    {
        id: 'inn', cat: 'cidade', icon: '\u{1f3e8}', title: 'Estalagem',
        body: '<b>\u{1f3e8} ESTALAGEM - GUIA R\u00c1PIDO</b>\n\nLocal para descansar (Long Rest):\n\n<b>\u{1f434} Est\u00e1bulo (Gr\u00e1tis)</b>\n\u2022 Restaura HP (chance de sono interrompido)\n\u2022 Recupera 50% dos Dados de Vida\n\n<b>\u{1f6cf}\ufe0f Quarto Comum (base 3 GP)</b>\n\u2022 Restaura HP e MP completos\n\u2022 Reduz 1 n\u00edvel de exaust\u00e3o\n\n<b>\u{1f451} Su\u00edte Real (base 10 GP)</b>\n\u2022 Restaura tudo + Dados de Vida completos\n\u2022 Concede <b>Inspirado</b> (vantagem no pr\u00f3ximo teste)\n\n<i>Dica: Apenas a Su\u00edte garante recupera\u00e7\u00e3o total + Inspira\u00e7\u00e3o!</i>'
    },
    {
        id: 'bank', cat: 'cidade', icon: '\u{1f3db}\ufe0f', title: 'Banco',
        body: '<b>\u{1f3db}\ufe0f BANCO - GUIA R\u00c1PIDO</b>\n\nProteja seu patrim\u00f4nio:\n\n<b>\u{1f4e5} Guardar Moedas</b>\n\u2022 Dep\u00f3sitos s\u00e3o gratuitos!\n\u2022 Ouro no banco sobrevive \u00e0 morte em combate\n\n<b>\u{1f4e4} Retirar Moedas</b>\n\u2022 <b>Taxa de 2%</b> sobre qualquer saque\n\n<b>\u{1f4e6} Depositar/Recuperar Pertences</b>\n\u2022 Itens no cofre n\u00e3o ocupam espa\u00e7o na mochila\n\u2022 Protegidos contra roubos e morte\n\n<i>Dica: Deposite grandes quantias antes de explorar!</i>'
    },
    {
        id: 'guild', cat: 'cidade', icon: '\u{1f6e1}\ufe0f', title: 'Guilda',
        body: '<b>\u{1f6e1}\ufe0f GUILDA - GUIA R\u00c1PIDO</b>\n\nO quartel-general dos aventureiros:\n\n<b>\u{1f4cb} Quadro de Miss\u00f5es</b>\n\u2022 Miss\u00f5es di\u00e1rias com recompensas em ouro e XP\n\n<b>\u{1f5e1}\ufe0f Tavira (Recompensas)</b>\n\u2022 Entregue ca\u00e7adas conclu\u00eddas para receber recompensas\n\n<b>\u{1f4dc} Contratar Aventureiros</b>\n\u2022 Recrute companheiros para seu grupo\n\n<b>\u{1f9d3} Braun, o Marcado</b>\n\u2022 Hist\u00f3rias de guerra e dicas sobre cada regi\u00e3o\n\n<i>Dica: Um Cl\u00e9rigo ou Paladino no grupo aumenta muito sua sobreviv\u00eancia!</i>'
    },
    {
        id: 'town_square', cat: 'cidade', icon: '\u26f2', title: 'Pra\u00e7a',
        body: '<b>\u26f2 PRA\u00c7A - GUIA R\u00c1PIDO</b>\n\nO cora\u00e7\u00e3o pulsante da cidade:\n\n<b>\u{1f50d} Investigar a Pra\u00e7a</b>\n\u2022 Encontre NPCs e converse com eles\n\u2022 NPCs mudam conforme o per\u00edodo (Manh\u00e3/Tarde)\n\n<b>\u{1f50e} Explorar a \u00c1rea</b>\n\u2022 Eventos investigativos com testes de per\u00edcia\n\n<b>\u{1f4dc} Mestre Cart\u00f3grafo</b>\n\u2022 Dispon\u00edvel apenas \u00e0 tarde\n\u2022 Vende mapas que revelam locais de explora\u00e7\u00e3o\n\n<b>\u{1f4ac} Chat Global</b>\n\u2022 Conecte-se com outros aventureiros\n\n<i>Dica: Mercadores de folga aparecem pela pra\u00e7a ou taverna!</i>'
    },
    {
        id: 'market', cat: 'cidade', icon: '\u{1f3ea}', title: 'Mercado',
        body: '<b>\u{1f3ea} MERCADO - GUIA R\u00c1PIDO</b>\n\nOnde o com\u00e9rcio acontece:\n\n<b>\u2694\ufe0f Comprar Equipamentos</b>\n\u2022 <b>Ferreiro</b>: Armas e Armaduras pesadas\n\u2022 <b>Alquimista</b>: Po\u00e7\u00f5es e Ingredientes\n\u2022 <b>M\u00edstico</b>: Itens m\u00e1gicos e pergaminhos\n\u2022 <b>Viajantes</b>: Itens raros e ex\u00f3ticos\n\n<b>\u2696\ufe0f Vender Itens</b>\n\u2022 Mercadores s\u00f3 compram o que lhes interessa\n\u2022 Pre\u00e7o de venda ~50% do valor base\n\n<i>Dica: Itens equipados n\u00e3o aparecem na lista de venda.</i>'
    },
    {
        id: 'city_gates', cat: 'cidade', icon: '\u{1f3f0}', title: 'Port\u00f5es',
        body: '<b>\u{1f3f0} PORT\u00d5ES DA CIDADE</b>\n\nA entrada e sa\u00edda de Eldoria:\n\n<b>\u{1f5e3}\ufe0f Guarda Aldric</b>\n\u2022 Di\u00e1logos variam conforme sua reputa\u00e7\u00e3o\n\n<b>\u{1f3d5}\ufe0f Partir para Aventura</b>\n\u2022 Saia pelos port\u00f5es para explorar Valdoria\n\n<i>Dica: Converse com Aldric \u2014 veteranos t\u00eam dicas valiosas!</i>'
    },
    {
        id: 'exploration', cat: 'aventura', icon: '\u{1f5fa}\ufe0f', title: 'Explora\u00e7\u00e3o',
        body: '<b>\u{1f5fa}\ufe0f EXPLORA\u00c7\u00c3O - GUIA COMPLETO</b>\n\nAventure-se al\u00e9m dos port\u00f5es:\n\n<b>\u{1f5fa}\ufe0f Viagem e Mapa</b>\n\u2022 Adquira um <b>Mapa de Vald\u00f3ria</b> no Mercado ou Cart\u00f3grafo\n\u2022 Cada bioma tem inimigos, eventos e perigos pr\u00f3prios\n\n<b>\u2694\ufe0f Combate</b>\n\u2022 Inimigos aparecem baseados no bioma e n\u00edvel\n\u2022 Fugir \u00e9 sempre uma op\u00e7\u00e3o (teste de DEX)\n\u2022 Morte = perda de XP e ouro da bolsa\n\n<b>\u{1f4d6} Encontros Narrativos</b>\n\u2022 Situa\u00e7\u00f5es dram\u00e1ticas com 2-4 escolhas\n\u2022 Suas decis\u00f5es s\u00e3o lembradas!\n\n<b>\u2728 Eventos Cl\u00e1ssicos</b>\n\u2022 Santu\u00e1rios, mercadores, ba\u00fas, armadilhas\n\u2022 \u23f1\ufe0f Eventos: 30s para decidir\n\u2022 \u23f1\ufe0f Armadilhas: 10s para reagir\n\n<b>\u{1f3b2} Testes de Per\u00edcia (D20)</b>\n\u2022 10 (F\u00e1cil) | 13 (M\u00e9dio) | 15 (Dif\u00edcil) | 18+ (Muito Dif\u00edcil)\n\u2022 Resultado = <code>1d20 + Mod. Atributo</code>'
    },
    {
        id: 'combat', cat: 'aventura', icon: '\u2694\ufe0f', title: 'Combate',
        body: '<b>\u2694\ufe0f GUIA DE COMBATE (D&D 5E)</b>\n\n<b>Como funciona o turno:</b>\n\n1\ufe0f\u20e3 <b>Iniciativa (DEX)</b>\n\u2022 Define quem age primeiro: <code>d20 + DEX mod</code>\n\n2\ufe0f\u20e3 <b>Sua A\u00e7\u00e3o</b>\n\u2022 <b>Atacar</b>: <code>d20 + STR/DEX + Prof</code> vs AC do inimigo\n\u2022 <b>Usar Habilidade</b>: Gasta recurso de classe\n\u2022 <b>Fugir</b>: Tenta escapar do combate\n\n3\ufe0f\u20e3 <b>A\u00e7\u00e3o B\u00f4nus (R\u00e1pida)</b>\n\u2022 <b>Beber Po\u00e7\u00e3o</b>: Recupera HP instantaneamente\n\n<b>Conceitos Chave:</b>\n\n\u{1f6e1}\ufe0f <b>AC (Classe de Armadura)</b>\n\u2022 Base 10 + DEX + Armadura\n\n\u{1f3b2} <b>Rolagem de Ataque</b>\n\u2022 1 = Erro autom\u00e1tico\n\u2022 20 = Acerto cr\u00edtico + dobro de dados!\n\n\u23f1\ufe0f <b>Timer: 30 segundos por turno</b>'
    },
    {
        id: 'field_encounters', cat: 'aventura', icon: '\u{1f4d6}', title: 'Encontros Narrativos',
        body: '<b>\u{1f4d6} ENCONTROS NARRATIVOS</b>\n\nSitua\u00e7\u00f5es dram\u00e1ticas que testam suas escolhas:\n\n<b>\u{1f3ad} Como Funcionam</b>\n\u2022 Aparecem durante a explora\u00e7\u00e3o (~15% das vezes)\n\u2022 Cada encontro apresenta 2-4 op\u00e7\u00f5es de a\u00e7\u00e3o\n\u2022 Resultado = <code>1d20 + Mod. Atributo vs Dificuldade</code>\n\n<b>\u{1f4dd} Consequ\u00eancias</b>\n\u2022 Suas escolhas s\u00e3o <b>lembradas</b> pelo jogo\n\u2022 Ajudar algu\u00e9m pode trazer um aliado futuro\n\u2022 Trair pode gerar um inimigo vingativo\n\n<b>\u{1f517} Arcos Narrativos</b>\n\u2022 O Desertor: Ajude ou traia\n\u2022 A Praga: Investigue mortes no p\u00e2ntano\n\u2022 O Esp\u00edrito: Complete o pedido de um fantasma'
    },
    {
        id: 'camp', cat: 'aventura', icon: '\u{1f3d5}\ufe0f', title: 'Acampamento',
        body: '<b>\u{1f3d5}\ufe0f ACAMPAMENTO - GUIA R\u00c1PIDO</b>\n\nDescanse em campo durante a explora\u00e7\u00e3o:\n\n<b>\u{1f6cc} Descanso Curto (Short Rest)</b>\n\u2022 Gasta Dados de Vida para recuperar HP\n\u2022 Rola dado da classe + modificador de CON\n\n<b>\u{1f356} Alimenta\u00e7\u00e3o</b>\n\u2022 Consuma comida para b\u00f4nus adicionais\n\n<b>\u{1f3e0} Voltar \u00e0 Cidade (Long Rest)</b>\n\u2022 Descanso completo: recupera tudo\n\n<i>Dica: O Descanso Curto \u00e9 valioso em campo \u2014 use seus Dados de Vida com sabedoria!</i>'
    },
    {
        id: 'dungeon', cat: 'aventura', icon: '\u{1f3da}\ufe0f', title: 'Masmorras',
        body: '<b>\u{1f3da}\ufe0f MASMORRAS - GUIA R\u00c1PIDO</b>\n\nExplore calabou\u00e7os perigosos:\n\n<b>\u{1f6aa} Salas e Encontros</b>\n\u2022 Cada sala pode conter inimigos, armadilhas ou tesouros\n\u2022 Decis\u00f5es morais sem rolagem\n\n<b>\u2694\ufe0f Combates de Masmorra</b>\n\u2022 Inimigos mais fortes que na superf\u00edcie\n\n<b>\u{1f3b2} Dilemas Morais</b>\n\u2022 Aventureiro morto: ficar com o tesouro ou devolver?\n\u2022 Goblin ferido: ajudar, ignorar ou saquear?\n\n<b>\u{1f3b0} Eventos de Risco</b>\n\u2022 Dados encantados, po\u00e7\u00f5es misteriosas, po\u00e7o dos desejos\n\n<i>Dica: Po\u00e7\u00f5es n\u00e3o se recuperam dentro da masmorra \u2014 entre preparado!</i>'
    },
    {
        id: 'inventory', cat: 'personagem', icon: '\u{1f392}', title: 'Invent\u00e1rio',
        body: '<b>\u{1f392} INVENT\u00c1RIO - GUIA R\u00c1PIDO</b>\n\nGerencie seus pertences:\n\n<b>\u{1f9ea} Usar Po\u00e7\u00e3o (A\u00e7\u00e3o R\u00e1pida)</b>\n\u2022 Restaura HP instantaneamente\n\u2022 Tamb\u00e9m dispon\u00edvel como a\u00e7\u00e3o b\u00f4nus em combate\n\n<b>\u2694\ufe0f Gerenciar Equipamento</b>\n\u2022 Slots: Cabe\u00e7a, Torso, M\u00e3os, P\u00e9s, An\u00e9is\n\u2022 Compara\u00e7\u00e3o autom\u00e1tica (\u2191 melhor / \u2193 pior)\n\u2022 \u2705 = proficiente | \u274c = sem profici\u00eancia\n\n<b>\u{1f4b0} Vender Itens (Na cidade)</b>\n\u2022 Pre\u00e7o de venda: ~60% do valor base\n\n<b>\u{1f5d1}\ufe0f Descartar Itens</b>\n\u2022 Elimina\u00e7\u00e3o permanente de itens indesejados\n\n<b>\u{1f48e} Gemas e Encaixes</b>\n\u2022 Equipamentos podem ter slots de gema\n\n<i>Dica: Use "Vender Lixo" para limpar itens comuns rapidamente!</i>'
    },
    {
        id: 'status', cat: 'personagem', icon: '\u{1f4ca}', title: 'Status',
        body: '<b>\u{1f4ca} STATUS - GUIA R\u00c1PIDO</b>\n\nTudo sobre seu personagem:\n\n<b>\u{1f4cb} Vis\u00e3o Geral</b>\n\u2022 Nome, N\u00edvel, Classe e Subclasse\n\u2022 Barras de HP e MP\n\u2022 Ouro e itens no invent\u00e1rio\n\n<b>\u{1f4d6} Detalhes (Expandido)</b>\n\u2022 Atributos: FOR, DES, CON, INT, SAB, CAR\n\u2022 Estat\u00edsticas de combate: AC, B\u00f4nus de Ataque, Dano\n\u2022 Habilidades, Talentos, Profici\u00eancias\n\n<b>\u{1f465} Grupo</b>\n\u2022 Veja seus companheiros (at\u00e9 3 aliados)\n\n<i>Dica: Clique em "Ver Detalhes" para a ficha completa!</i>'
    },
    {
        id: 'quests', cat: 'personagem', icon: '\u{1f4dc}', title: 'Miss\u00f5es',
        body: '<b>\u{1f4dc} MISS\u00d5ES - GUIA R\u00c1PIDO</b>\n\nAcompanhe suas aventuras:\n\n<b>\u{1f4cb} Filtros de Miss\u00f5es</b>\n\u2022 <b>Todas</b>: Lista completa de miss\u00f5es ativas\n\u2022 <b>Hist\u00f3ria</b>: Miss\u00f5es da trama principal\n\u2022 <b>Di\u00e1rias</b>: Renovam periodicamente\n\u2022 <b>Conclu\u00eddas</b>: Hist\u00f3rico\n\n<b>\u2705 Entregar Miss\u00f5es</b>\n\u2022 V\u00e1 ao NPC indicado para receber recompensas\n\n<b>\u274c Abandonar Miss\u00e3o</b>\n\u2022 Miss\u00f5es podem ser abandonadas (exceto pr\u00f3logo)\n\n<i>Dica: Miss\u00f5es di\u00e1rias s\u00e3o a melhor fonte de XP e ouro no in\u00edcio!</i>'
    },
    {
        id: 'skills', cat: 'personagem', icon: '\u2728', title: 'Habilidades',
        body: '<b>\u2728 HABILIDADES - GUIA R\u00c1PIDO</b>\n\nPoderes especiais da sua classe:\n\n<b>\u{1f4d6} Lista de Habilidades</b>\n\u2022 Cada classe tem habilidades \u00fanicas\n\u2022 Desbloqueie novas ao subir de n\u00edvel\n\u2022 Custo em MP/Ki/F\u00faria/recurso de classe\n\n<b>\u2694\ufe0f Uso em Combate</b>\n\u2022 Habilidades s\u00e3o suas a\u00e7\u00f5es mais poderosas\n\n<b>\u{1f4c8} Progress\u00e3o</b>\n\u2022 Novas habilidades ao subir de n\u00edvel\n\n<i>Dica: Leia a descri\u00e7\u00e3o de cada habilidade para montar combos eficientes!</i>'
    },
    {
        id: 'levelup', cat: 'personagem', icon: '\u{1f389}', title: 'Evolu\u00e7\u00e3o de N\u00edvel',
        body: '<b>\u{1f389} EVOLU\u00c7\u00c3O DE N\u00cdVEL</b>\n\nFortalea seu personagem:\n\n<b>\u{1f4ca} Aumentar Atributos (ASI)</b>\n\u2022 Ganhe pontos para FOR, DES, CON, INT, SAB, CAR\n\n<b>\u{1f3c5} Escolher Talentos (Feats)</b>\n\u2022 Troque 2 pontos de atributo por um Talento\n\u2022 Escolha permanente!\n\n<b>\u2728 Aprender Habilidades</b>\n\u2022 Novas habilidades de classe dispon\u00edveis\n\n<b>\u{1f6e1}\ufe0f Escolher Subclasse (N\u00edvel 3)</b>\n\u2022 Especializa\u00e7\u00e3o permanente da classe\n\n<i>Dica: Leia todas as op\u00e7\u00f5es antes de escolher \u2014 decis\u00f5es de evolu\u00e7\u00e3o s\u00e3o permanentes!</i>'
    },
    {
        id: 'settings', cat: 'sistema', icon: '\u2699\ufe0f', title: 'Configura\u00e7\u00f5es',
        body: '<b>\u2699\ufe0f CONFIGURA\u00c7\u00d5ES - GUIA R\u00c1PIDO</b>\n\nPersonalize sua experi\u00eancia:\n\n<b>\u23f1\ufe0f Timers Estendidos</b>\n\u2022 Dobra o tempo de todos os eventos cronometrados\n\u2022 Armadilhas: 10s \u2192 20s\n\u2022 Eventos: 30s \u2192 60s\n\u2022 Combate: 30s \u2192 60s\n\n<i>Dica: Ative os timers estendidos se voc\u00ea est\u00e1 aprendendo o jogo!</i>'
    },
    {
        id: 'social', cat: 'sistema', icon: '\u{1f465}', title: 'Social',
        body: '<b>\u{1f465} SOCIAL - GUIA R\u00c1PIDO</b>\n\nConecte-se com outros aventureiros:\n\n<b>\u{1f4e8} Caixa de Entrada</b>\n\u2022 Pedidos de amizade recebidos\n\n<b>\u{1f441}\ufe0f Jogadores Online</b>\n\u2022 Veja quem est\u00e1 jogando agora\n\n<b>\u{1f464} Perfil</b>\n\u2022 Sua ficha p\u00fablica (classe, n\u00edvel, t\u00edtulos)\n\n<b>\u{1f46b} Lista de Amigos</b>\n\u2022 Seus companheiros de aventura\n\n<i>Dica: Adicione amigos para futuras aventuras cooperativas!</i>'
    },
    {
        id: 'trade_board', cat: 'sistema', icon: '\u{1f4cb}', title: 'Quadro de Trocas',
        body: '<b>\u{1f4cb} QUADRO DE TROCAS</b>\n\nTroque itens com outros jogadores:\n\n<b>\u{1f4cb} Ver Ofertas</b>\n\u2022 Navegue pelas trocas dispon\u00edveis\n\n<b>\u{1f4e6} Minhas Ofertas</b>\n\u2022 Gerencie suas trocas ativas\n\n<b>\u2795 Criar Oferta</b>\n\u2022 Selecione um item do invent\u00e1rio\n\u2022 Defina o pre\u00e7o em ouro ou item desejado\n\n<i>Dica: Ofertas expiram ap\u00f3s 24h se n\u00e3o forem aceitas!</i>'
    },
    {
        id: 'heroes_wall', cat: 'sistema', icon: '\u{1f3c6}', title: 'Mural dos Her\u00f3is',
        body: '<b>\u{1f3c6} MURAL DOS HER\u00d3IS</b>\n\nO hall da fama de Valdoria:\n\n<b>\u{1f3c5} Rankings</b>\n\u2022 Classifica\u00e7\u00e3o por n\u00edvel, ouro, combates\n\n<b>\u{1f947} Primeiros Feitos</b>\n\u2022 Quem alcan\u00e7ou marcos primeiro\n\n<b>\u{1f396}\ufe0f T\u00edtulos</b>\n\u2022 Conquistas especiais dos jogadores\n\n<i>Dica: Suba no ranking para ganhar reconhecimento eterno!</i>'
    },
    {
        id: 'workshop', cat: 'sistema', icon: '\u2692\ufe0f', title: 'Oficina de Artesanato',
        body: '<b>\u2692\ufe0f OFICINA DE ARTESANATO</b>\n\nFabrique itens usando ferramentas artesanais:\n\n<b>\u{1f528} Como Fabricar</b>\n\u2022 Escolha uma ferramenta e selecione uma receita\n\u2022 Role d20 + modificador + profici\u00eancia vs DC\n\u2022 Sucesso \u2192 item criado! Falha \u2192 materiais perdidos\n\n<b>\u{1f3b2} Resultados Especiais</b>\n\u2022 Nat 20 \u2192 sucesso autom\u00e1tico + item b\u00f4nus!\n\u2022 Nat 1 \u2192 falha autom\u00e1tica\n\n<b>\u{1f33f} Coleta de Materiais</b>\n\u2022 3 tentativas por descanso longo na cidade\n\n<i>Dica: Invista em INT para aumentar suas chances de fabrica\u00e7\u00e3o!</i>'
    },
    {
        id: 'black_market', cat: 'cidade', icon: '\u{1f311}', title: 'Mercado Negro',
        body: '<b>\u{1f311} MERCADO NEGRO</b>\n\nItens proibidos no canto escuro da taverna:\n\n<b>\u{1f9ea} Frasco de Veneno (100 GP)</b>\n\u2022 +1d4 de dano por veneno nos pr\u00f3ximos 3 combates\n\n<b>\u{1f4a8} Bomba de Fuma\u00e7a (75 GP)</b>\n\u2022 Fuga garantida de qualquer combate\n\n<b>\u{1f4e6} Caixa Misteriosa (200 GP)</b>\n\u2022 Loot aleat\u00f3rio \u2014 pode ser incr\u00edvel ou decepcionante\n\n<i>Dica: O veneno \u00e9 excelente contra chefes dif\u00edceis!</i>'
    },
    {
        id: 'contribution', cat: 'sistema', icon: '\u{1f48e}', title: 'Portal de Apoio',
        body: '<b>\u{1f48e} PORTAL DE APOIO</b>\n\nComo funciona o sistema de contribui\u00e7\u00e3o:\n\n<b>1.</b> Escolha o valor que deseja contribuir\n<b>2.</b> Um c\u00f3digo PIX ser\u00e1 gerado automaticamente\n<b>3.</b> Copie o c\u00f3digo e cole no app do seu banco\n<b>4.</b> Ap\u00f3s enviar, clique em "J\u00e1 enviei o PIX"\n<b>5.</b> Um administrador verificar\u00e1 o pagamento\n\nSuas recompensas s\u00e3o entregues <b>automaticamente</b> ap\u00f3s a verifica\u00e7\u00e3o.'
    },
    {
        id: 'travel', cat: 'aventura', icon: '\u{1f5fa}\ufe0f', title: 'Viagem',
        body: '<b>\u{1f5fa}\ufe0f VIAGEM - GUIA R\u00c1PIDO</b>\n\nViaje entre regi\u00f5es de Valdoria:\n\n<b>\u{1f5fa}\ufe0f Mapa</b>\n\u2022 Necess\u00e1rio para viajar (compre no Mercado ou Cart\u00f3grafo)\n\n<b>\u2694\ufe0f Encontros na Estrada</b>\n\u2022 Inimigos podem aparecer durante a viagem\n\n<b>\u{1f3d5}\ufe0f Acampamento</b>\n\u2022 Descanse durante viagens longas\n\n<i>Dica: Leve po\u00e7\u00f5es extras \u2014 encontros na estrada podem ser perigosos!</i>'
    },
    {
        id: 'rune_scribe', cat: 'cidade', icon: '\u{1f52e}', title: 'Escriba de Runas',
        body: '<b>\u{1f52e} ESCRIBA DE RUNAS</b>\n\nInscri\u00e7\u00e3o de runas em equipamentos:\n\n<b>\u{1f4dc} Selecionar Runa</b>\n\u2022 Cada runa tem efeitos e b\u00f4nus diferentes\n\n<b>\u2694\ufe0f Selecionar Equipamento</b>\n\u2022 Cada equipamento tem slots limitados\n\n<b>\u{1f4b0} Inscrever</b>\n\u2022 Runas concedem b\u00f4nus permanentes\n\n<i>Dica: Guarde runas raras para seus melhores equipamentos!</i>'
    },
    {
        id: 'event_shrine', cat: 'eventos', icon: '\u26e9\ufe0f', title: 'Santu\u00e1rio Esquecido',
        body: '<b>\u26e9\ufe0f SANTU\u00c1RIO ESQUECIDO</b>\n\n\u{1f64f} <b>Proferir Prece de Cura (Garantido)</b>\n\u2022 +5 HP sem risco\n\n\u{1f4dc} <b>Decifrar Runas Antigas [INT] DC 12</b>\n\u2022 Sucesso: +10 HP + 10 XP\n\u2022 Falha: +5 HP + 5 XP\n\n\u{1f590}\ufe0f <b>Profanar o Altar (Alto Risco)</b>\n\u2022 +5-15 GP garantidos\n\u2022 Sofre 2-6 HP de dano\n\n<b>Op\u00e7\u00f5es de Classe:</b>\n\u2022 \u2728 Cl\u00e9rigo/Paladino: Consagrar Altar [WIS] DC 10\n\u2022 \u{1f4d6} Mago/Feiticeiro: Runas Arcanas [INT] DC 11'
    },
    {
        id: 'event_merchant', cat: 'eventos', icon: '\u{1f392}', title: 'Mercador Viajante',
        body: '<b>\u{1f392} MERCADOR VIAJANTE</b>\n\n\u{1f9ea} <b>Comprar Po\u00e7\u00e3o (25 GP)</b>\n\u2022 Pre\u00e7o especial de estrada!\n\n\u{1f5e3}\ufe0f <b>Negociar Pre\u00e7o [CHA] DC 13</b>\n\u2022 Sucesso: Po\u00e7\u00e3o por 15 GP\n\n\u{1f590}\ufe0f <b>Praticar Ladinagem [DEX] DC 14</b>\n\u2022 Sucesso: Po\u00e7\u00e3o gr\u00e1tis\n\u2022 Falha: 3 HP de dano\n\n\u2694\ufe0f <b>Render o Mercador [CHA] DC 12</b>\n\u2022 Sucesso: 20-50 GP\n\u2022 Falha: Combate!'
    },
    {
        id: 'event_trap', cat: 'eventos', icon: '\u26a0\ufe0f', title: 'Armadilha',
        body: '<b>\u26a0\ufe0f ARMADILHA!</b>\n\n\u23f1\ufe0f <b>Timer de Rea\u00e7\u00e3o: 10 segundos!</b>\nMenos de 3s = Vantagem (2d20)\nAp\u00f3s 8s = Desvantagem (2d20)\n\n\u26a1 <b>Reagir com Agilidade [DEX] DC 12</b>\n\u2022 Sucesso: Sem dano\n\u2022 Falha: 4-10 HP de dano\n\n\u{1f6e1}\ufe0f <b>Suportar Impacto [CON] DC 15</b>\n\u2022 Sucesso: Apenas 2 HP de dano\n\u2022 Falha: 5-12 HP de dano\n\n\u{1f50d} <b>Analisar [INT] DC 12</b>\n\u2022 Sucesso: Entende o mecanismo'
    },
    {
        id: 'event_chest', cat: 'eventos', icon: '\u{1f4e6}', title: 'Ba\u00fa Misterioso',
        body: '<b>\u{1f4e6} BA\u00da MISTERIOSO</b>\n\n\u{1f513} <b>Tentar Ganzua [DEX] DC 15</b>\n\u2022 Sucesso: 15-40 GP + 20 XP\n\u2022 Falha: 2-5 HP de dano\n\n\u{1f50d} <b>Procurar Armadilhas [INT] DC 12</b>\n\u2022 Sucesso: Revela armadilha\n\n\u{1f4a5} <b>Quebrar a Tampa [STR] DC 13</b>\n\u2022 Sucesso: 10-30 GP + 15 XP\n\u2022 Falha: 2-5 HP de dano'
    },
    {
        id: 'event_adventurer', cat: 'eventos', icon: '\u{1f691}', title: 'Aventureira Ferida',
        body: '<b>\u{1f691} AVENTUREIRA FERIDA</b>\n\n\u{1f9ea} <b>Dar Po\u00e7\u00e3o (-1 Po\u00e7\u00e3o)</b>\n\u2022 +50 XP (boa a\u00e7\u00e3o)\n\n\u{1fa79} <b>Prestar Socorros [WIS] DC 13</b>\n\u2022 Sucesso: +30 XP\n\n\u{1f441}\ufe0f <b>Analisar Sinceridade [WIS] DC 13</b>\n\u2022 Sucesso: Revela se \u00e9 emboscada\n\n<b>Op\u00e7\u00f5es de Classe:</b>\n\u2022 \u2728 Cl\u00e9rigo: Curar com Magia [WIS] DC 10\n\u2022 \u{1f33f} Druida: Herbalismo [WIS] DC 11\n\n<i>Dica: Nem toda v\u00edtima \u00e9 inocente... Use Intui\u00e7\u00e3o antes de ajudar!</i>'
    },
    {
        id: 'classes', cat: 'personagem', icon: '📜', title: 'Classes',
        body: '<b>📜 CLASSES JOGÁVEIS</b>\nEscolha sua especialização:\n\n<b>⚔️ Guerreiro</b> — Mestre em armas e combate. Recurso: Vigor\n<b>🔥 Bárbaro</b> — Fúria devastadora e resistência. Recurso: Fúria\n<b>🛡️ Paladino</b> — Guerreiro sagrado com cura. Recurso: Mana\n<b>🎯 Ranger</b> — Explorador e caçador hábil. Recurso: Mana\n<b>🗡️ Ladino</b> — Furtivo com Sneak Attack. Recurso: Energia\n<b>🎶 Bardo</b> — Versátil com inspiração e magias. Recurso: Inspiração\n<b>📖 Mago</b> — Poder arcano supremo. Recurso: Mana\n<b>✨ Feiticeiro</b> — Magia inata com metamagia. Recurso: Mana\n<b>⭐ Bruxo</b> — Pacto com entidade. Recurso: Pacto\n<b>🌿 Druida</b> — Magia da natureza. Recurso: Mana\n<b>⛪ Clérigo</b> — Curador divino e suporte. Recurso: Mana\n<b>🥊 Monge</b> — Artes marciais e Ki. Recurso: Ki\n\n<i>Dica: A subclasse é escolhida no nível 3!</i>'
    },
    {
        id: 'races', cat: 'personagem', icon: '✨', title: 'Raças',
        body: '<b>✨ RAÇAS DISPONÍVEIS</b>\n\n<b>Humano</b>\n• +1 em todos os atributos\n• Versátil — bom para qualquer classe\n\n<b>Anão</b>\n• +2 CON, +1 FOR ou SAB\n• Resistente: mais HP e armaduras pesadas\n\n<b>Elfo</b>\n• +2 DES, +1 INT ou CAR\n• Ágil: bônus em percepção e iniciativa\n\n<i>Anãos são ideais para Guerreiro e Clérigo. Elfos brilham como Mago e Ranger.</i>'
    },
    {
        id: 'death', cat: 'aventura', icon: '☠️', title: 'Morte e Consequências',
        body: '<b>☠️ MORTE — O QUE ACONTECE?</b>\n\nQuando seu HP chega a 0:\n\n<b>❌ Derrota em Combate</b>\n• Perde <b>ouro da bolsa</b> (não do banco!)\n• Perde XP proporcional ao nível\n• Retorna à cidade automaticamente\n• Equipamentos NÃO são perdidos\n\n<b>Como Evitar</b>\n• Leve poções de cura (ação bônus em combate)\n• Fuja quando HP estiver baixo (teste de DEX)\n• Deposite ouro no Banco antes de explorar\n\n<i>Morrer não é o fim — mas dói no bolso!</i>'
    },
    {
        id: 'allies', cat: 'personagem', icon: '👥', title: 'Companheiros',
        body: '<b>👥 COMPANHEIROS DE AVENTURA</b>\n\nRecrute aliados para seu grupo (máx. 3):\n\n<b>Onde Recrutar</b>\n• <b>Guilda</b>: Aventureiros profissionais\n• <b>Taverna</b>: Mercenários por contrato\n• <b>Eventos</b>: NPCs resgatados podem se juntar\n\n<b>Afinidade</b>\n• Aliados têm nível de afinidade (0-5)\n• Afinidade alta = melhor desempenho\n\n<b>Em Combate</b>\n• Aliados agem automaticamente\n• Podem ser derrotados (voltam após descanso)\n\n<i>Um grupo equilibrado (tank + cura + dano) muda tudo!</i>'
    },
    {
        id: 'world_map', cat: 'aventura', icon: '🗺️', title: 'Mapa do Mundo',
        body: '<b>🗺️ MAPA DE VALDÓRIA</b>\n\nExplore o mundo pelo mapa interativo:\n\n<b>Como Acessar</b>\n• Compre um Mapa no Mercado ou Cartógrafo\n• Ou receba como recompensa de missão\n\n<b>Biomas</b>\n• <b>Floresta</b>: Lobos, bandidos, santuários\n• <b>Pântano</b>: Venenos, doenças, mortos-vivos\n• <b>Montanha</b>: Gelo, gigantes, minas\n• <b>Deserto</b>: Calor, escorpiões, ruínas\n• <b>Planície</b>: Eventos variados, viagem rápida\n\n<b>Névoa de Guerra</b>\n• Regiões não visitadas ficam cobertas\n• Explore para revelar o mapa\n\n<i>Cada bioma tem inimigos e eventos únicos!</i>'
    },
    {
        id: 'advantage', cat: 'aventura', icon: '🎲', title: 'Vantagem e Desvantagem',
        body: '<b>🎲 VANTAGEM E DESVANTAGEM (D&D 5e)</b>\n\n<b>✅ Vantagem</b>\n• Rola <b>2d20</b> e usa o <b>maior</b>\n• Quando: Ataque furtivo, bênção, terreno favorável\n\n<b>❌ Desvantagem</b>\n• Rola <b>2d20</b> e usa o <b>menor</b>\n• Quando: Envenenado, exausto, terreno difícil\n\n<b>Regras</b>\n• Vantagem + Desvantagem = rolagem normal\n• Múltiplas fontes não acumulam\n\n<i>Armadilhas com reação rápida (<3s) dão Vantagem!</i>'
    },
    {
        id: 'exhaustion', cat: 'aventura', icon: '⚠️', title: 'Exaustão',
        body: '<b>⚠️ NÍVEIS DE EXAUSTÃO (D&D 5e)</b>\n\nCondição que se acumula e debilita:\n\n<b>Nível 1</b>: Desvantagem em testes de habilidade\n<b>Nível 2</b>: Velocidade reduzida pela metade\n<b>Nível 3</b>: Desvantagem em ataques e saves\n<b>Nível 4</b>: HP máximo reduzido pela metade\n<b>Nível 5</b>: Velocidade reduzida a 0\n<b>Nível 6</b>: <b>Morte</b>\n\n<b>Como Remover</b>\n• Descanso Longo remove 1 nível\n• Suíte Real remove todos os níveis\n\n<i>Exaustão é o inimigo silencioso — descanse antes que acumule!</i>'
    }
];

var GUIDE_CATEGORIES = {
    'todos': '📖 Todos',
    'cidade': '🏘️ Cidade',
    'aventura': '⚔️ Aventura',
    'personagem': '📊 Personagem',
    'sistema': '⚙️ Sistema',
    'eventos': '🎲 Eventos'
};
