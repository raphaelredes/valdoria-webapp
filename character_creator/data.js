// ═══════════════════════════════════════════════
// GAME DATA — Lendas de Valdoria Character Creator
// ═══════════════════════════════════════════════

// --- Translations & Lookups ---
const ATTR_PT = {strength:'Força',dexterity:'Destreza',constitution:'Constituição',intelligence:'Inteligência',wisdom:'Sabedoria',charisma:'Carisma'};
const ATTR_ABBR = {strength:'FOR',dexterity:'DES',constitution:'CON',intelligence:'INT',wisdom:'SAB',charisma:'CAR'};
const SKILL_PT = {athletics:'Atletismo',acrobatics:'Acrobacia',sleight_of_hand:'Prestidigitação',stealth:'Furtividade',arcana:'Arcanismo',history:'História',investigation:'Investigação',nature:'Natureza',religion:'Religião',animal_handling:'Lidar com Animais',insight:'Intuição',medicine:'Medicina',perception:'Percepção',survival:'Sobrevivência',deception:'Enganação',intimidation:'Intimidação',performance:'Atuação',persuasion:'Persuasão'};
const ARMOR_PT = {light_armor:'Leve',medium_armor:'Média',heavy_armor:'Pesada',shield:'Escudo'};
const WEAPON_PT = {simple_weapon:'Simples',martial_weapon:'Marciais'};
const SAVE_PT = ATTR_PT;
const RECOVERY_PT = {full:'Recupera tudo no Desc. Curto',half:'Recupera 50% no Desc. Curto',third:'Recupera 33% no Desc. Curto',none:'Só recupera no Desc. Longo'};

// --- Skill → Governing Attribute ---
const SKILL_ATTR = {
    athletics:'strength',acrobatics:'dexterity',sleight_of_hand:'dexterity',
    stealth:'dexterity',arcana:'intelligence',history:'intelligence',
    investigation:'intelligence',nature:'intelligence',religion:'intelligence',
    animal_handling:'wisdom',insight:'wisdom',medicine:'wisdom',
    perception:'wisdom',survival:'wisdom',deception:'charisma',
    intimidation:'charisma',performance:'charisma',persuasion:'charisma'
};

// --- Descriptions ---
const SKILL_DESC = {
    athletics:'Escalar, nadar, saltar e proezas de força',
    acrobatics:'Equilíbrio, manobras acrobáticas e escapar',
    sleight_of_hand:'Truques manuais e furtar objetos',
    stealth:'Mover-se sem ser detectado',
    arcana:'Conhecimento sobre magia e planos',
    history:'Recordar eventos históricos e lendas',
    investigation:'Deduzir, analisar pistas ocultas',
    nature:'Conhecimento sobre flora e fauna',
    religion:'Conhecimento sobre deuses e ritos',
    animal_handling:'Acalmar e controlar animais',
    insight:'Detectar mentiras e intenções ocultas',
    medicine:'Estabilizar feridos e diagnosticar',
    perception:'Notar detalhes e detectar perigos',
    survival:'Rastrear, navegar e sobreviver',
    deception:'Mentir e enganar convincentemente',
    intimidation:'Ameaçar, coagir e pressionar',
    performance:'Atuar, cantar e entreter',
    persuasion:'Convencer, negociar e influenciar'
};

const TOOL_DESC = {
    smith_tools:'Criar e reparar objetos de metal, armas e armaduras',
    leatherworker_tools:'Criar e reparar itens de couro e peles',
    woodcarver_tools:'Entalhar madeira e criar objetos decorativos',
    jeweler_tools:'Criar e avaliar joias e gemas preciosas',
    alchemist_supplies:'Criar poções e substâncias alquímicas',
    herbalism_kit:'Identificar plantas e criar remédios naturais',
    cook_utensils:'Preparar refeições que concedem benefícios temporários',
    tinker_tools:'Construir e reparar mecanismos e dispositivos'
};

const RACE_IMPACT = {
    Human:'A raça mais versátil. +1 em todos os atributos beneficia qualquer classe. Excelente para iniciantes ou builds equilibradas. Variante: troca +1 em tudo por +1 em 2 + perícia + feat.',
    Dwarf:'Resistente e durável. +2 CON aumenta HP de qualquer classe. Resistência a veneno é valiosa contra inimigos e armadilhas.',
    Elf:'Ágil e perceptivo. +2 DES melhora CA, ataques à distância e iniciativa. Percepção gratuita e imunidade a sono são poderosas.',
    Halfling:'Sortudo e evasivo. Re-rolar 1s naturais no d20 elimina falhas críticas — um dos traços mais fortes do jogo.',
    Gnome:'Inteligente e resistente a magia. Vantagem em saves de INT, SAB e CAR vs magia é uma defesa excepcional contra feiticeiros.',
    HalfElf:'Carismático e flexível. +2 CAR + 2 bônus livres permite otimizar qualquer build. Ideal para Bardo, Feiticeiro, Bruxo e Paladino.',
    Tiefling:'Carismático com resistência a fogo (um dos danos mais comuns). Magias infernais gratuitas economizam recursos.',
    Dragonborn:'Forte com sopro elemental em área. +2 FOR combina com classes corpo-a-corpo. Sopro escala: 2d6 → 5d6.',
    HalfOrc:'Dado extra em crits é devastador com armas grandes. Resistência Implacável salva de knockouts. Ideal para Bárbaro e Guerreiro.'
};

const CLASS_DESC = {
    class_warrior:'Combatente versátil que domina todas as armas e armaduras. Alta HP e habilidades táticas como Recobrar Fôlego (cura em combate) e Surto de Ação (ação extra).',
    class_mage:'Mestre do arcano com o maior arsenal de magias. Frágil em combate corpo-a-corpo (1d6 HP), mas devastador à distância com Bola de Fogo e Mísseis Mágicos.',
    class_rogue:'Especialista em furtividade e perícias (4 no nível 1). Ataque Furtivo causa dano massivo. O mais habilidoso e versátil fora de combate.',
    class_cleric:'Curador divino essencial para manter o grupo vivo. Usa armadura média + escudo. Combina cura (Curar Ferimentos) com dano (Chama Sagrada).',
    class_paladin:'Cavaleiro sagrado que combina tanque com cura. Golpe Divino adiciona dano radiante. Imposição de Mãos cura sem gastar magias.',
    class_ranger:'Explorador e atirador habilidoso. Inimigo Favorito dá bônus contra tipos específicos. Combina combate à distância com magias de natureza.',
    class_barbarian:'Guerreiro primal com a maior HP do jogo (1d12). Fúria concede resistência a dano físico e bônus de dano. Imparável em combate.',
    class_bard:'O mais versátil do jogo — cura, controle, perícias. Inspiração Bárdica fortalece aliados. Único com acesso a TODAS as 18 perícias.',
    class_druid:'Conjurador da natureza com Forma Selvagem — se transforma em animais ganhando HP extra e habilidades únicas. Magias de cura e controle.',
    class_monk:'Artista marcial com mobilidade extrema. Ki permite rajada de golpes, esquiva paciente e golpe atordoante. Defesa sem armadura (DES+SAB).',
    class_sorcerer:'Mago inato com Metamagia — pode modificar magias em tempo real (duplicar alvos, maximizar dano). Menos magias, mais flexibilidade.',
    class_warlock:'Pactário com recuperação TOTAL em descanso curto. Rajada Mística (1d10, escala com nível) é o melhor truque de dano do jogo.'
};

const RES_DESC = {
    'Vigor':'Recurso para habilidades marciais: Recobrar Fôlego, Surto de Ação',
    'Mana':'Recurso para conjurar magias arcanas ou divinas',
    'Energia':'Recurso para manobras furtivas e habilidades de combate',
    'Fúria':'Recurso para entrar em fúria: resistência a dano + bônus de ataque',
    'Inspiração':'Recurso para inspirar aliados e conjurar magias bárdicas',
    'Ki':'Energia espiritual para golpes rápidos, esquivas e técnicas especiais',
    'Pacto':'Recurso do pacto — recupera TUDO em descanso curto'
};

// --- Racial Traits ---
const RACE_TRAITS = {
    Human:[
        {name:'Versatilidade Humana',desc:'+1 em todos os 6 atributos (FOR, DES, CON, INT, SAB, CAR). A única raça que melhora TODOS os atributos.'},
        {name:'Idioma Extra',desc:'Aprende 1 idioma adicional à escolha, além de Comum. Útil para diplomacia e compreensão de textos.'}
    ],
    Dwarf:[
        {name:'Visão no Escuro (18m)',desc:'Enxerga 18m no escuro como penumbra. Essencial em masmorras e cavernas.'},
        {name:'Resiliência Anã',desc:'Vantagem em saves contra veneno e resistência a dano de veneno (reduz pela metade).'},
        {name:'Treinamento Anão',desc:'Proficiência com machado de batalha, machadinha, martelo leve e martelo de guerra, independente da classe.'},
        {name:'Conhecimento da Pedra',desc:'+2 em testes de História sobre origem de trabalhos em pedra.'},
        {name:'Ferramenta Artesanal',desc:'Proficiência em 1 ferramenta artesanal à sua escolha.'}
    ],
    Elf:[
        {name:'Visão no Escuro (18m)',desc:'Enxerga 18m no escuro como penumbra. Essencial em ambientes noturnos.'},
        {name:'Sentidos Aguçados',desc:'Proficiência gratuita em Percepção — a perícia mais testada do jogo. Detecta armadilhas, emboscadas e itens.'},
        {name:'Ancestralidade Feérica',desc:'Vantagem em saves contra encantamento e imunidade a magias de sono. Proteção contra controle mental.'},
        {name:'Transe',desc:'Medita 4h ao invés de dormir 8h. Consciente durante o "sono". Relevante em narrativa.'}
    ],
    Halfling:[
        {name:'Sortudo',desc:'Quando rolar 1 natural no d20, re-rola e DEVE usar o novo resultado. Elimina falhas críticas — um dos traços mais fortes do jogo.'},
        {name:'Bravura',desc:'Vantagem em saves contra medo. Protege contra dragões, mortos-vivos e magias de terror.'},
        {name:'Agilidade Pequenina',desc:'Move-se através do espaço de criaturas Médias ou maiores. Útil para posicionamento tático.'}
    ],
    Gnome:[
        {name:'Visão no Escuro (18m)',desc:'Enxerga 18m no escuro como penumbra.'},
        {name:'Astúcia Gnômica',desc:'Vantagem em TODOS os saves de INT, SAB e CAR contra magia. Uma das melhores defesas mágicas do jogo.'}
    ],
    HalfElf:[
        {name:'Visão no Escuro (18m)',desc:'Enxerga 18m no escuro como penumbra. Herdado da linhagem élfica.'},
        {name:'Ancestralidade Feérica',desc:'Vantagem vs encantamento e imunidade a sono. Herdado dos elfos.'},
        {name:'Versatilidade em Perícias',desc:'Proficiência em 2 perícias extras à sua escolha. Combinado com a classe, cria um personagem muito habilidoso.'}
    ],
    Tiefling:[
        {name:'Visão no Escuro (18m)',desc:'Enxerga 18m no escuro como penumbra. Herança infernal.'},
        {name:'Resistência Infernal',desc:'Resistência a dano de fogo — reduz pela metade. Fogo é um dos tipos de dano mais comuns.'},
        {name:'Legado Infernal',desc:'Nv.1: Taumaturgia (truque). Nv.3: Repreensão Infernal 1×/dia. Nv.5: Escuridão 1×/dia. Magias gratuitas!'}
    ],
    Dragonborn:[
        {name:'Sopro Dracônico',desc:'Ataque em área: 2d6 dano elemental (escala: 3d6 nv.6, 4d6 nv.11, 5d6 nv.16). Tipo e formato dependem da ancestralidade.'},
        {name:'Resistência Dracônica',desc:'Resistência ao tipo de dano do seu sopro (reduz pela metade). Proteção contra ataques elementais.'}
    ],
    HalfOrc:[
        {name:'Visão no Escuro (18m)',desc:'Enxerga 18m no escuro como penumbra.'},
        {name:'Resistência Implacável',desc:'Ao cair a 0 PV, fica com 1 PV (1×/descanso longo). Pode salvar sua vida em momentos críticos.'},
        {name:'Ataques Selvagens',desc:'Em acertos críticos, rola 1 dado de dano EXTRA. Devastador com armas de dados grandes (2d6, 1d12).'},
        {name:'Ameaçador',desc:'Proficiência gratuita em Intimidação. Útil em interações sociais e pressão.'}
    ]
};

// --- Subrace Details ---
const SUBRACE_DETAILS = {
    Dwarf:{
        hill:{impact:'+1 SAB melhora Percepção e magias divinas. Tenacidade Anã: +1 HP por nível — o Anão mais resistente.'},
        mountain:{impact:'+2 FOR (total +2 CON, +2 FOR). Proficiência em armaduras leve e média independente da classe. Excelente para casters que querem armadura.'}
    },
    Elf:{
        high:{impact:'+1 INT beneficia Magos e investigadores. Ganha 1 truque extra da lista de Mago e 1 idioma adicional.'},
        wood:{impact:'+1 SAB beneficia Druidas, Clérigos e Patrulheiros. Velocidade 10.5m (a mais alta). Pode se esconder em vegetação leve.'}
    },
    Halfling:{
        lightfoot:{impact:'+1 CAR beneficia classes sociais (Bardo, Feiticeiro, Bruxo). Pode se esconder atrás de criaturas Médias — perfeito para Ladinos.'},
        stout:{impact:'+1 CON aumenta HP. Vantagem contra veneno e resistência a dano de veneno — quase tão resistente quanto um Anão.'}
    },
    Gnome:{
        rock:{impact:'+1 CON aumenta HP. Proficiência em Ferramentas de Funileiro. Pode criar pequenos dispositivos mecânicos.'},
        forest:{impact:'+1 DES melhora CA e ataques à distância. Ganha Ilusão Menor (truque). Pode se comunicar com animais pequenos.'}
    }
};

// --- Dragonborn Ancestry ---
const ANCESTRY_DETAILS = {
    red:{element:'Fogo',shape:'Cone (4.5m)',save:'DES'},
    blue:{element:'Relâmpago',shape:'Linha (9m)',save:'DES'},
    white:{element:'Gelo',shape:'Cone (4.5m)',save:'CON'},
    black:{element:'Ácido',shape:'Linha (9m)',save:'DES'},
    green:{element:'Veneno',shape:'Cone (4.5m)',save:'CON'},
    gold:{element:'Fogo',shape:'Cone (4.5m)',save:'DES'},
    silver:{element:'Gelo',shape:'Cone (4.5m)',save:'CON'},
    bronze:{element:'Relâmpago',shape:'Linha (9m)',save:'DES'},
    copper:{element:'Ácido',shape:'Linha (9m)',save:'DES'},
    brass:{element:'Fogo',shape:'Linha (9m)',save:'DES'}
};

// --- Races ---
const RACES = {
    Human:{name:'Humano',icon:'👤',desc:'+1 em todos os atributos',speed:30,size:'Médio',langs:['Comum','+1 à escolha'],
        bonuses:{strength:1,dexterity:1,constitution:1,intelligence:1,wisdom:1,charisma:1},
        subraces:{standard:{name:'Humano Padrão',desc:'Versátil. +1 em todos os 6 atributos.',bonuses:{}},variant:{name:'Humano Variante',desc:'+1 em 2 atributos + 1 perícia + 1 feat.',bonuses:{}}},
        variant:true,
        traits:['Idioma Extra: Aprende um idioma adicional']},
    Dwarf:{name:'Anão',icon:'🧱',desc:'+2 Constituição',speed:25,size:'Médio',langs:['Comum','Anão'],
        bonuses:{constitution:2},subraces:{hill:{name:'Anão da Colina',desc:'Intuição aguçada e resistência notável.',bonuses:{wisdom:1}},mountain:{name:'Anão da Montanha',desc:'Forte e resistente, treinado em armaduras.',bonuses:{strength:2}}},
        traits:['Visão no Escuro (18m)','Resiliência Anã','Treinamento Anão','Conhecimento da Pedra'],toolChoice:1},
    Elf:{name:'Elfo',icon:'⚡',desc:'+2 Destreza',speed:30,size:'Médio',langs:['Comum','Élfico'],
        bonuses:{dexterity:2},subraces:{high:{name:'Alto Elfo',desc:'Mente afiada e afinidade arcana.',bonuses:{intelligence:1}},wood:{name:'Elfo da Floresta',desc:'Rápido e furtivo entre as árvores.',bonuses:{wisdom:1},speed:35}},
        traits:['Visão no Escuro (18m)','Sentidos Aguçados: Prof. Percepção','Ancestralidade Feérica','Transe: Meditação de 4h']},
    Halfling:{name:'Halfling',icon:'🦶',desc:'+2 Destreza',speed:25,size:'Pequeno',langs:['Comum','Halfling'],
        bonuses:{dexterity:2},subraces:{lightfoot:{name:'Pés-Leves',desc:'Naturalmente furtivo e carismático.',bonuses:{charisma:1}},stout:{name:'Robusto',desc:'Resistente e difícil de envenenar.',bonuses:{constitution:1}}},
        traits:['Sortudo: Re-rola 1 natural','Bravura: Vant. saves medo','Agilidade Pequenina']},
    Gnome:{name:'Gnomo',icon:'🧪',desc:'+2 Inteligência',speed:25,size:'Pequeno',langs:['Comum','Gnômico'],
        bonuses:{intelligence:2},subraces:{rock:{name:'Gnomo da Rocha',desc:'Inventor nato com mãos habilidosas.',bonuses:{constitution:1},tools:['tinker_tools']},forest:{name:'Gnomo da Floresta',desc:'Ágil e conectado à natureza.',bonuses:{dexterity:1}}},
        traits:['Visão no Escuro (18m)','Astúcia Gnômica: Vant. saves INT/SAB/CAR vs magia']},
    HalfElf:{name:'Meio-Elfo',icon:'🧝',desc:'+2 Carisma, +1×2 à escolha',speed:30,size:'Médio',langs:['Comum','Élfico','+1 à escolha'],
        bonuses:{charisma:2},subraces:null,halfelf:true,
        traits:['Visão no Escuro (18m)','Ancestralidade Feérica','Versatilidade em Perícias']},
    Tiefling:{name:'Tiefling',icon:'😈',desc:'+2 Carisma, +1 Inteligência',speed:30,size:'Médio',langs:['Comum','Infernal'],
        bonuses:{charisma:2,intelligence:1},subraces:null,
        traits:['Visão no Escuro (18m)','Resistência Infernal: Res. dano fogo','Legado Infernal: Magias infernais']},
    Dragonborn:{name:'Draconato',icon:'🐉',desc:'+2 Força, +1 Carisma',speed:30,size:'Médio',langs:['Comum','Dracônico'],
        bonuses:{strength:2,charisma:1},
        subraces:{
            red:{name:'Vermelho',desc:'Sopro de fogo (cone)',bonuses:{}},
            blue:{name:'Azul',desc:'Sopro elétrico (linha)',bonuses:{}},
            white:{name:'Branco',desc:'Sopro gélido (cone)',bonuses:{}},
            black:{name:'Negro',desc:'Sopro ácido (linha)',bonuses:{}},
            green:{name:'Verde',desc:'Sopro venenoso (cone)',bonuses:{}},
            gold:{name:'Dourado',desc:'Sopro de fogo (cone)',bonuses:{}},
            silver:{name:'Prateado',desc:'Sopro gélido (cone)',bonuses:{}},
            bronze:{name:'Bronze',desc:'Sopro elétrico (linha)',bonuses:{}},
            copper:{name:'Cobre',desc:'Sopro ácido (linha)',bonuses:{}},
            brass:{name:'Latão',desc:'Sopro de fogo (linha)',bonuses:{}}
        },
        traits:['Sopro Dracônico: 2d6 dano elemental','Resistência Dracônica']},
    HalfOrc:{name:'Meio-Orc',icon:'🪓',desc:'+2 Força, +1 Constituição',speed:30,size:'Médio',langs:['Comum','Orc'],
        bonuses:{strength:2,constitution:1},subraces:null,
        traits:['Visão no Escuro (18m)','Resistência Implacável','Ataques Selvagens','Ameaçador: Prof. Intimidação']}
};

// --- Classes ---
const CLASSES = {
    class_warrior:{name:'Guerreiro',icon:'🛡️',role:'Tanque / DPS',hit_die:'1d10',res:'Vigor',
        stats:[15,13,14,8,12,10],armor:['light_armor','medium_armor','heavy_armor','shield'],weapons:['simple_weapon','martial_weapon'],saves:['strength','constitution'],tools:[],
        equip:['Espada de Treino','Escudo de Madeira','Cota de Malha'],skills:{count:2,opts:['acrobatics','animal_handling','athletics','history','insight','intimidation','perception','survival']},rec:'half',mp:{base:14,attr:'strength',mult:2}},
    class_mage:{name:'Mago',icon:'🔥',role:'DPS Arcano / Controle',hit_die:'1d6',res:'Mana',
        stats:[8,13,14,15,12,10],armor:[],weapons:['simple_weapon'],saves:['intelligence','wisdom'],tools:[],
        equip:['Cajado de Salgueiro','Capuz de Tecido'],skills:{count:2,opts:['arcana','history','insight','investigation','medicine','religion']},rec:'half',mp:{base:20,attr:'intelligence',mult:2}},
    class_rogue:{name:'Ladino',icon:'🗡️',role:'DPS Furtivo / Perícia',hit_die:'1d8',res:'Energia',
        stats:[8,15,13,14,10,12],armor:['light_armor'],weapons:['simple_weapon'],saves:['dexterity','intelligence'],tools:[],
        equip:['Adaga Balanceada','Peitoral de Couro'],skills:{count:4,opts:['acrobatics','athletics','deception','insight','intimidation','investigation','perception','performance','persuasion','sleight_of_hand','stealth']},rec:'half',mp:{base:12,attr:'dexterity',mult:2}},
    class_cleric:{name:'Clérigo',icon:'🙏',role:'Curador / Suporte',hit_die:'1d8',res:'Mana',
        stats:[13,8,14,10,15,12],armor:['light_armor','medium_armor','shield'],weapons:['simple_weapon'],saves:['wisdom','charisma'],tools:[],
        equip:['Maça de Estrela','Escudo de Madeira','Cota de Escamas'],skills:{count:2,opts:['history','insight','medicine','persuasion','religion']},rec:'none',mp:{base:18,attr:'wisdom',mult:2}},
    class_paladin:{name:'Paladino',icon:'⚡',role:'Tanque / Curador',hit_die:'1d10',res:'Mana',
        stats:[15,10,13,8,12,14],armor:['light_armor','medium_armor','heavy_armor','shield'],weapons:['simple_weapon','martial_weapon'],saves:['wisdom','charisma'],tools:[],
        equip:['Martelo de Guerra','Escudo de Madeira','Cota de Malha'],skills:{count:2,opts:['athletics','insight','intimidation','medicine','persuasion','religion']},rec:'none',mp:{base:14,attr:'charisma',mult:2}},
    class_ranger:{name:'Patrulheiro',icon:'🏹',role:'DPS à Distância',hit_die:'1d10',res:'Mana',
        stats:[12,15,13,10,14,8],armor:['light_armor','medium_armor','shield'],weapons:['simple_weapon','martial_weapon'],saves:['strength','dexterity'],tools:[],
        equip:['Arco de Caça','Peitoral de Couro'],skills:{count:3,opts:['animal_handling','athletics','insight','investigation','nature','perception','stealth','survival']},rec:'none',mp:{base:15,attr:'wisdom',mult:2}},
    class_barbarian:{name:'Bárbaro',icon:'😡',role:'Tanque / DPS Brutal',hit_die:'1d12',res:'Fúria',
        stats:[15,13,14,8,12,10],armor:['light_armor','medium_armor','shield'],weapons:['simple_weapon','martial_weapon'],saves:['strength','constitution'],tools:[],
        equip:['Machado de Batalha','Giboia de Pele'],skills:{count:2,opts:['animal_handling','athletics','intimidation','nature','perception','survival']},rec:'half',mp:{base:12,attr:'constitution',mult:2}},
    class_bard:{name:'Bardo',icon:'🎶',role:'Suporte / Versátil',hit_die:'1d8',res:'Inspiração',
        stats:[8,14,13,12,10,15],armor:['light_armor'],weapons:['simple_weapon'],saves:['dexterity','charisma'],tools:[],
        equip:['Rapieira','Peitoral de Couro'],skills:{count:3,opts:['athletics','acrobatics','sleight_of_hand','stealth','arcana','history','investigation','nature','religion','animal_handling','insight','medicine','perception','survival','deception','intimidation','performance','persuasion']},rec:'half',mp:{base:15,attr:'charisma',mult:2}},
    class_druid:{name:'Druida',icon:'🌲',role:'Caster / Transformação',hit_die:'1d8',res:'Mana',
        stats:[8,13,14,12,15,10],armor:['light_armor','medium_armor','shield'],weapons:['simple_weapon'],saves:['intelligence','wisdom'],tools:['herbalism_kit'],
        equip:['Foice','Escudo de Madeira','Giboia de Pele'],skills:{count:2,opts:['arcana','animal_handling','insight','medicine','nature','perception','religion','survival']},rec:'none',mp:{base:15,attr:'wisdom',mult:2}},
    class_monk:{name:'Monge',icon:'👊',role:'DPS / Mobilidade',hit_die:'1d8',res:'Ki',
        stats:[12,15,13,10,14,8],armor:[],weapons:['simple_weapon'],saves:['strength','dexterity'],tools:['_choice_1'],
        equip:['Cajado de Salgueiro'],skills:{count:2,opts:['acrobatics','athletics','history','insight','religion','stealth']},rec:'full',mp:{base:8,attrs:[{a:'dexterity',m:1},{a:'wisdom',m:2}]}},
    class_sorcerer:{name:'Feiticeiro',icon:'🔮',role:'DPS Arcano / Metamagia',hit_die:'1d6',res:'Mana',
        stats:[8,13,14,10,12,15],armor:[],weapons:['simple_weapon'],saves:['constitution','charisma'],tools:[],
        equip:['Cajado de Salgueiro','Capuz de Tecido'],skills:{count:2,opts:['arcana','deception','insight','intimidation','persuasion','religion']},rec:'third',mp:{base:18,attr:'charisma',mult:2}},
    class_warlock:{name:'Bruxo',icon:'👁️',role:'DPS Arcano / Pacto',hit_die:'1d8',res:'Pacto',
        stats:[8,13,14,10,12,15],armor:['light_armor'],weapons:['simple_weapon'],saves:['wisdom','charisma'],tools:[],
        equip:['Adaga Enferrujada','Peitoral de Couro'],skills:{count:2,opts:['arcana','deception','history','intimidation','investigation','nature','religion']},rec:'full',mp:{base:10,attr:'charisma',mult:2}}
};

// --- Backgrounds ---
const BACKGROUNDS = {
    soldier:{name:'Soldado',desc:'Disciplina do campo de batalha. Veterano de guerras e treinamento militar.',skills:['athletics','intimidation'],gold:10},
    sage:{name:'Sábio',desc:'Anos dedicados a bibliotecas, academias e pesquisa arcana.',skills:['arcana','history'],gold:10},
    criminal:{name:'Criminal',desc:'Passado nas sombras do submundo. Contatos e experiência ilegal.',skills:['stealth','deception'],gold:15},
    acolyte:{name:'Acólito',desc:'Vida dedicada a um templo sagrado. Fé e rituais diários.',skills:['insight','religion'],gold:15},
    noble:{name:'Nobre',desc:'Família de prestígio, influência política e riqueza.',skills:['history','persuasion'],gold:25},
    guild_artisan:{name:'Artesão de Guilda',desc:'Membro respeitado de guilda comercial. Habilidade manual e negociação.',skills:['insight','persuasion'],gold:15,toolChoice:1},
    outlander:{name:'Forasteiro',desc:'Cresceu nas terras selvagens, longe da civilização.',skills:['athletics','survival'],gold:10},
    charlatan:{name:'Charlatão',desc:'Mestre de trapaças, disfarces e identidades falsas.',skills:['deception','sleight_of_hand'],gold:15},
    hermit:{name:'Eremita',desc:'Reclusão e iluminação espiritual. Sabedoria da solidão.',skills:['medicine','religion'],gold:5,tools:['herbalism_kit']},
    entertainer:{name:'Artista',desc:'Encanta multidões com arte, música e performance.',skills:['acrobatics','performance'],gold:15},
    folk_hero:{name:'Herói do Povo',desc:'Origens humildes, mas o destino o escolheu para grandeza.',skills:['animal_handling','survival'],gold:10,toolChoice:1},
    sailor:{name:'Marinheiro',desc:'Moldado pelos mares e tempestades. Habilidade e coragem naval.',skills:['athletics','perception'],gold:10},
    urchin:{name:'Órfão',desc:'Sobreviveu nas ruas com astúcia e agilidade.',skills:['sleight_of_hand','stealth'],gold:10}
};

// --- Artisan Tools ---
const ARTISAN_TOOLS = {
    smith_tools:{name:'Ferramentas de Ferreiro',icon:'⚒️'},
    leatherworker_tools:{name:'Ferramentas de Coureiro',icon:'🧵'},
    woodcarver_tools:{name:'Ferramentas de Entalhador',icon:'🪓'},
    jeweler_tools:{name:'Ferramentas de Joalheiro',icon:'💎'},
    alchemist_supplies:{name:'Suprimentos de Alquimista',icon:'⚗️'},
    herbalism_kit:{name:'Kit de Herbalismo',icon:'🌿'},
    cook_utensils:{name:'Utensílios de Cozinheiro',icon:'🍳'},
    tinker_tools:{name:'Ferramentas de Funileiro',icon:'🔧'}
};

// --- Genders ---
const GENDERS = [
    {key:'Male',icon:'🚹',name:'Masculino'},{key:'Female',icon:'🚺',name:'Feminino'},
    {key:'Non-Binary',icon:'🌈',name:'Não-Binário'},{key:'Fluid',icon:'🌊',name:'Fluido'},
    {key:'Agender',icon:'⚪',name:'Agênero'}
];

// --- Name Generator ---
const NAMES_DATA = {
    pre:["Aer","Ael","Al","An","Ar","Bel","Bor","Bal","Bran","Cal","Cor","Cael","Cyr","Da","Del","Dor","Dra","El","Eom","Er","Fa","Fae","Fel","Fer","Gal","Gen","Gil","Gor","Hal","Hor","Hel","Hrod","Ian","Ith","Ir","Jar","Jen","Jor","Kal","Kel","Kor","Kyr","La","Lel","Lor","Ly","Mai","Mal","Mor","Myr","Na","Nel","Nor","Ny","Ol","Or","Oth","Pa","Per","Pol","Ra","Ren","Ror","Ry","Sa","Sel","Sol","Syl","Ta","Tel","Tor","Ty","Ul","Ur","Va","Val","Vor","Vy","Wa","Wil","Wor","Xa","Xer","Ya","Yl","Za","Zor"],
    inf:["a","e","i","o","u","ae","ai","ea","ia","io","ua","y","aa","ee","oo"],
    suf:["bar","bor","can","cen","dan","den","din","don","fan","fen","fin","gan","gen","gin","gon","han","hen","hin","hon","jan","jen","kan","ken","kin","kon","lan","len","lin","lon","man","men","min","mon","nan","nen","nin","pan","pen","ran","ren","rin","ron","san","sen","sin","son","tan","ten","tin","ton","van","ven","vin","wan","wen","zan","zen","zin"],
    suf_f:["ra","ria","na","nia","la","lia","ara","ira","ina","ena","ala","ela","isa","iel","ael","wen","ith","yra","ynn","essa","aia","eira","ari","ani","ili","eri","ori","alis","elis","ora","ura","riel","niel","liel","dia","sia","via","mia","fia","dra","tra","gra","nna","lla","wyn","lyn","ryn","lis","nis","ris"],
    titles:["o Bravo","o Sábio","o Forte","o Rápido","o Cruel","o Justo","o Grande","o Pequeno","o Místico","o Sombrio","da Luz","o Protetor","o Vingador","o Imortal","o Eterno","Lâmina","Punho","Coração","o Caçador","o Arcano","o Divino","o Eleito"]
};

// ═══════════════════════════════════════════════
// NEW DATA — DM Narration, Class Features, etc.
// ═══════════════════════════════════════════════

// --- DM Narration per screen ---
const DM_NARRATION = {
    0: 'Muito bem, aventureiro! Antes de tudo, preciso saber sobre suas origens. De qual povo você descende? Cada raça possui dons únicos que moldarão seu destino.',
    1: 'Agora me conte: como você luta? Qual caminho de poder escolheu trilhar? Sua classe define suas habilidades em combate e exploração.',
    2: 'Todo herói tem forças e fraquezas. Distribua seus atributos — coloque os valores mais altos no que importa para sua classe!',
    3: 'Todo herói tem um passado. O que você fazia antes de se tornar aventureiro? Seu antecedente concede perícias e recursos do seu ofício anterior.',
    4: 'Todo herói tem uma bússola moral. Seu alinhamento guia suas escolhas — mas não precisa ser rígido. Pode pular se preferir.',
    5: 'Hora de refinar seus talentos. Escolha as perícias nas quais seu personagem se especializou durante seus anos de treinamento.',
    6: 'Um bom artesão sempre carrega suas ferramentas. Escolha as ferramentas com as quais você tem experiência prática.',
    7: 'Quase lá! Agora dê vida ao seu personagem — escolha seu gênero e batize-o com um nome digno de um herói de Valdoria.',
    8: 'Excelente! Sua ficha está completa. Revise cada detalhe antes de partir em sua jornada pelas terras de Valdoria...'
};

// --- Level 1 Class Features & Spells ---
const CLASS_LV1 = {
    class_warrior: {
        features: [
            {name:'Retomar Fôlego', desc:'Uma vez por descanso curto, recupera 1d10 + nível de Guerreiro em HP como ação bônus.'},
            {name:'Estilo de Combate', desc:'Escolha uma especialização: Duelismo (+2 dano com uma mão), Defesa (+1 CA com armadura), entre outros.'}
        ],
        spells: [],
        ac: {base:16, detail:'Cota de Malha (16)', shield:2}
    },
    class_mage: {
        features: [
            {name:'Recuperação Arcana', desc:'Uma vez por dia após descanso curto, recupera slots de magia de nível combinado igual a metade do nível de Mago.'}
        ],
        spells: [
            {name:'Toque de Fogo', type:'Truque', desc:'1d10 dano de fogo à distância'},
            {name:'Mísseis Mágicos', type:'1º Nível', desc:'3 projéteis de 1d4+1 — acerto automático'},
            {name:'Raio de Gelo', type:'Truque', desc:'1d8 dano de gelo, reduz velocidade'},
            {name:'Mãos Flamejantes', type:'1º Nível', desc:'3d6 fogo em cone de 4,5m'},
            {name:'Escudo Arcano', type:'1º Nível', desc:'+5 CA até próximo turno (reação)'}
        ],
        ac: {base:10, detail:'Sem armadura (10 + mod DES)', shield:0}
    },
    class_rogue: {
        features: [
            {name:'Ataque Furtivo', desc:'+1d6 de dano extra ao acertar com vantagem ou aliado adjacente ao alvo. Escala a cada 2 níveis.'},
            {name:'Especialização', desc:'Dobre o bônus de proficiência em 2 perícias ou ferramentas de ladrão.'}
        ],
        spells: [],
        ac: {base:11, detail:'Peitoral de Couro (11 + mod DES)', shield:0}
    },
    class_cleric: {
        features: [
            {name:'Discípulo da Vida', desc:'Magias de cura restauram HP extra igual a 2 + nível da magia. O curador mais eficiente do jogo.'}
        ],
        spells: [
            {name:'Chama Sagrada', type:'Truque', desc:'1d8 dano radiante (save DES)'},
            {name:'Sino dos Mortos', type:'Truque', desc:'1d8 dano necrótico (save SAB)'},
            {name:'Curar Ferimentos', type:'1º Nível', desc:'Restaura 1d8 + mod SAB de HP'},
            {name:'Palavra Curativa', type:'1º Nível', desc:'1d4 + mod SAB HP (ação bônus)'},
            {name:'Relâmpago Guia', type:'1º Nível', desc:'4d6 radiante + vantagem no próximo ataque'},
            {name:'Bênção', type:'1º Nível', desc:'+1d4 em ataques e saves para até 3 aliados'}
        ],
        ac: {base:14, detail:'Cota de Escamas (14 + mod DES, máx 2)', shield:2}
    },
    class_paladin: {
        features: [
            {name:'Imposição de Mãos', desc:'Pool de cura igual a 5 × nível de Paladino. Cura HP pelo toque sem gastar slots de magia.'},
            {name:'Sentido Divino', desc:'Detecta celestiais, corruptos e mortos-vivos num raio de 18m. Funciona através de paredes.'}
        ],
        spells: [],
        ac: {base:16, detail:'Cota de Malha (16)', shield:2}
    },
    class_ranger: {
        features: [
            {name:'Inimigo Favorito', desc:'Escolha um tipo de criatura. Ganha vantagem em rastreamento e testes de Sabedoria contra eles.'},
            {name:'Explorador Natural', desc:'Terreno favorito: não fica perdido, encontra mais comida, e vantagem em Iniciativa.'}
        ],
        spells: [
            {name:'Marca do Caçador', type:'1º Nível', desc:'+1d6 dano extra contra alvo marcado (concentração)'}
        ],
        ac: {base:11, detail:'Peitoral de Couro (11 + mod DES)', shield:0}
    },
    class_barbarian: {
        features: [
            {name:'Fúria', desc:'2×/dia: resistência a dano cortante, perfurante e contundente + bônus de +2 no dano corpo-a-corpo por 1 minuto.'},
            {name:'Defesa sem Armadura', desc:'Sem armadura: CA = 10 + mod DES + mod CON. Permite alta CA sem equipamento pesado.'}
        ],
        spells: [],
        ac: {base:0, detail:'10 + mod DES + mod CON (sem armadura)', shield:0, unarmored:'barbarian'}
    },
    class_bard: {
        features: [
            {name:'Inspiração Bárdica', desc:'Dê um d6 a um aliado para somar em ataque, save ou teste de perícia. Usos = mod CAR / descanso longo.'}
        ],
        spells: [
            {name:'Zombaria Viciosa', type:'Truque', desc:'1d4 dano psíquico + desvantagem no próximo ataque'},
            {name:'Sussurros Dissonantes', type:'1º Nível', desc:'3d6 psíquico + medo (save SAB)'}
        ],
        ac: {base:11, detail:'Peitoral de Couro (11 + mod DES)', shield:0}
    },
    class_druid: {
        features: [
            {name:'Forma Selvagem', desc:'A partir do nível 2: transforme-se em animais, ganhando HP temporário e habilidades da forma.'}
        ],
        spells: [
            {name:'Produzir Chamas', type:'Truque', desc:'1d8 fogo + iluminação'},
            {name:'Onda Trovejante', type:'1º Nível', desc:'2d8 trovão em cubo de 4,5m + empurrão'},
            {name:'Emaranhar', type:'1º Nível', desc:'Área de terreno difícil + prender criaturas'},
            {name:'Curar Ferimentos', type:'1º Nível', desc:'Restaura 1d8 + mod SAB de HP'},
            {name:'Palavra Curativa', type:'1º Nível', desc:'1d4 + mod SAB HP (ação bônus)'}
        ],
        ac: {base:11, detail:'Giboia de Pele (11 + mod DES)', shield:2}
    },
    class_monk: {
        features: [
            {name:'Artes Marciais', desc:'Use DES para ataques desarmados e com armas de monge. Ataque desarmado bonus como ação bônus. Dado: 1d4.'},
            {name:'Defesa sem Armadura', desc:'Sem armadura: CA = 10 + mod DES + mod SAB. Alta CA com bons atributos.'}
        ],
        spells: [],
        ac: {base:0, detail:'10 + mod DES + mod SAB (sem armadura)', shield:0, unarmored:'monk'}
    },
    class_sorcerer: {
        features: [
            {name:'Origem Dracônica', desc:'HP extra (+1/nível). CA 13 + mod DES sem armadura. Resistência a um tipo de dano elemental.'}
        ],
        spells: [
            {name:'Borrifo Ácido', type:'Truque', desc:'1d6 ácido em alvo de 18m'},
            {name:'Toque de Fogo', type:'Truque', desc:'1d10 fogo em alvo de 36m'},
            {name:'Esfera Cromática', type:'1º Nível', desc:'3d8 de dano elemental à escolha'},
            {name:'Raio Caótico', type:'1º Nível', desc:'2d8 + efeito aleatório'},
            {name:'Escudo Arcano', type:'1º Nível', desc:'+5 CA até próximo turno (reação)'}
        ],
        ac: {base:13, detail:'Escamas Dracônicas (13 + mod DES)', shield:0}
    },
    class_warlock: {
        features: [
            {name:'Magia de Pacto', desc:'Slots de magia recuperam em descanso curto (não longo). Menos slots, mas renováveis.'},
            {name:'Patrono Ultraterreno', desc:'Seu patrono concede poderes e magias expandidas. A fonte do seu poder arcano.'}
        ],
        spells: [
            {name:'Explosão Eldritch', type:'Truque', desc:'1d10 força — o melhor truque de dano do jogo'},
            {name:'Hex', type:'1º Nível', desc:'+1d6 necrótico por ataque + desvantagem em 1 atributo'},
            {name:'Repreensão Infernal', type:'1º Nível', desc:'2d10 fogo como reação ao ser atingido'},
            {name:'Armadura de Agathys', type:'1º Nível', desc:'+5 HP temporário + 5 frio em quem te acertar'}
        ],
        ac: {base:11, detail:'Peitoral de Couro (11 + mod DES)', shield:0}
    }
};

// --- Background Features (D&D 5e traits) ---
const BG_FEATURES = {
    soldier: {name:'Patente Militar', desc:'Soldados de sua antiga organização reconhecem sua autoridade e influência. Você pode invocar sua patente para requisitar equipamento simples ou acesso a fortalezas militares.'},
    sage: {name:'Pesquisador', desc:'Quando não sabe uma informação, geralmente sabe onde e de quem obtê-la. Isso pode ser uma biblioteca, universidade, ou outro sábio.'},
    criminal: {name:'Contato Criminal', desc:'Você possui um contato confiável no submundo do crime que age como intermediário para informações e trabalhos clandestinos.'},
    acolyte: {name:'Refúgio dos Fiéis', desc:'Templos e santuários de sua fé oferecem cura gratuita e abrigo. Clérigos e acólitos reconhecem sua devoção e ajudam dentro do possível.'},
    noble: {name:'Posição de Privilégio', desc:'Você é bem-vindo na alta sociedade. Pessoas comuns tentam agradá-lo, e nobres o tratam como igual. Portas se abrem com seu nome.'},
    guild_artisan: {name:'Membro de Guilda', desc:'Sua guilda oferece hospedagem, apoio legal e uma rede de contatos comerciais. Artesãos da guilda ajudam uns aos outros.'},
    outlander: {name:'Andarilho', desc:'Você tem memória excelente para mapas e geografia. Sempre encontra comida e água fresca para si e até 5 companheiros em terras selvagens.'},
    charlatan: {name:'Identidade Falsa', desc:'Você criou uma identidade alternativa completa — com documentação, disfarce e história. Pode assumir essa persona a qualquer momento.'},
    hermit: {name:'Descoberta', desc:'Durante sua reclusão, você fez uma descoberta única e poderosa — uma verdade oculta, um segredo cósmico, ou uma revelação divina.'},
    entertainer: {name:'Por Aclamação Popular', desc:'Você sempre encontra hospedagem e comida em troca de performances. Estranhos que reconhecem seu trabalho tornam-se admiradores e aliados.'},
    folk_hero: {name:'Hospitalidade Rústica', desc:'Pessoas comuns o abrigam e ajudam. Podem escondê-lo da lei e dar abrigo em celeiros, fazendas e vilas.'},
    sailor: {name:'Passagem de Navio', desc:'Você consegue passagem gratuita em navios para você e companheiros, em troca de trabalho durante a viagem.'},
    urchin: {name:'Segredos da Cidade', desc:'Você conhece os becos, passagens secretas e atalhos. Viaja pelo dobro da velocidade em ambientes urbanos.'}
};

// --- Race+Class Synergy Tips ---
const RACE_CLASS_TIPS = {
    'Elf_class_rogue': 'Elfos com +2 DES são naturais para Ladino. Percepção gratuita e imunidade a sono complementam perfeitamente o estilo furtivo.',
    'Elf_class_ranger': 'Elfo Patrulheiro é uma combinação clássica. +2 DES melhora ataques à distância, e Percepção gratuita ajuda na exploração.',
    'Elf_class_mage': 'Altos Elfos com +1 INT são excelentes Magos. Truque extra e idioma adicional expandem suas opções arcanas.',
    'Dwarf_class_cleric': 'Anão Clérigo: +2 CON aumenta HP, e Resiliência Anã protege contra veneno. A combinação clássica de curador durável.',
    'Dwarf_class_warrior': 'Anão Guerreiro: +2 CON garante alta HP. Anão da Montanha (+2 FOR) cria um tanque quase indestrutível.',
    'HalfOrc_class_barbarian': 'Meio-Orc Bárbaro: dado extra em crits + Fúria = dano brutal. Resistência Implacável combina com a natureza primal.',
    'HalfOrc_class_warrior': 'Meio-Orc Guerreiro: +2 FOR e Ataques Selvagens fazem acertos críticos devastadores com armas pesadas.',
    'HalfElf_class_bard': 'Meio-Elfo Bardo: +2 CAR é perfeito. 2 perícias extras + 3 do Bardo = o personagem mais habilidoso possível.',
    'HalfElf_class_warlock': 'Meio-Elfo Bruxo: +2 CAR potencializa magias e Explosão Eldritch. Versatilidade em perícias compensa slots limitados.',
    'HalfElf_class_sorcerer': 'Meio-Elfo Feiticeiro: +2 CAR maximiza poder arcano. Bônus livres em CON (+1) aumentam concentração e HP.',
    'HalfElf_class_paladin': 'Meio-Elfo Paladino: +2 CAR fortalece magias e Imposição de Mãos. Flexibilidade em FOR/CON para tanque.',
    'Tiefling_class_warlock': 'Tiefling Bruxo: +2 CAR é ideal. Resistência a fogo combina com tema infernal, e magias raciais economizam slots.',
    'Tiefling_class_sorcerer': 'Tiefling Feiticeiro: +2 CAR + resistência a fogo. Origem Dracônica (fogo) empilha com Resistência Infernal.',
    'Human_class_warrior': 'Humano Guerreiro: +1 em tudo cria uma base equilibrada. Ideal para quem quer ser bom em tudo sem fraquezas.',
    'Human_class_paladin': 'Humano Paladino: +1 em todos os atributos beneficia FOR, CAR e CON — os três pilares do Paladino.',
    'Gnome_class_mage': 'Gnomo Mago: +2 INT maximiza magias. Astúcia Gnômica dá vantagem em saves contra magia — o mago mais resistente a controle.',
    'Halfling_class_rogue': 'Halfling Ladino: +2 DES é perfeito. Sortudo elimina falhas críticas, e Agilidade Pequenina permite fuga fácil.',
    'Dragonborn_class_paladin': 'Draconato Paladino: +2 FOR para ataques + sopro de área. Resistência elemental complementa a armadura pesada.'
};

// ═══════════════════════════════════════════════
// LANGUAGES — D&D 5e PHB p.123
// ═══════════════════════════════════════════════
const LANGUAGES = {
    standard: [
        {key:'Comum',name:'Comum',desc:'Língua franca de todos os povos.'},
        {key:'Anão',name:'Anão',desc:'Falada por anões. Sons guturais e sílabas pesadas.'},
        {key:'Élfico',name:'Élfico',desc:'Falada por elfos. Fluida e melodiosa.'},
        {key:'Gigante',name:'Gigante',desc:'Falada por gigantes e ogros.'},
        {key:'Gnômico',name:'Gnômico',desc:'Falada por gnomos. Rápida e inventiva.'},
        {key:'Goblin',name:'Goblin',desc:'Falada por goblins, hobgoblins e bugbears.'},
        {key:'Halfling',name:'Halfling',desc:'Falada por halflings. Discreta e acolhedora.'},
        {key:'Orc',name:'Orc',desc:'Falada por orcs e meio-orcs. Áspera e direta.'}
    ],
    exotic: [
        {key:'Abissal',name:'Abissal',desc:'Falada por demônios do Abismo.'},
        {key:'Celestial',name:'Celestial',desc:'Falada por anjos e seres celestiais.'},
        {key:'Dracônico',name:'Dracônico',desc:'Falada por dragões e draconatos.'},
        {key:'Infernal',name:'Infernal',desc:'Falada por diabos dos Nove Infernos.'},
        {key:'Primordial',name:'Primordial',desc:'Falada por elementais e gênios.'},
        {key:'Silvestre',name:'Silvestre',desc:'Falada por fadas, centauros e dríades.'},
        {key:'Subcomum',name:'Subcomum',desc:'Falada por criaturas do Subterrâneo.'}
    ]
};

// ═══════════════════════════════════════════════
// FEATS — D&D 5e PHB (no prerequisites, for Variant Human L1)
// ═══════════════════════════════════════════════
const CREATION_FEATS = {
    tough:{name:'Resistente',desc:'+2 HP por nível (retroativo). O mais resistente.'},
    lucky:{name:'Sortudo',desc:'3×/dia re-rola um d20. Incrivelmente versátil.'},
    sentinel:{name:'Sentinela',desc:'Inimigos não fogem de você. Bônus em ataques de oportunidade.'},
    great_weapon_master:{name:'Mestre de Armas Grandes',desc:'-5 ataque, +10 dano com armas pesadas.'},
    sharpshooter:{name:'Atirador Preciso',desc:'-5 ataque, +10 dano à distância.'},
    alert:{name:'Alerta',desc:'+5 iniciativa, não pode ser surpreendido.'},
    athlete:{name:'Atleta',desc:'+1 FOR ou DES. Escalar e levantar com facilidade.'},
    actor:{name:'Ator',desc:'+1 CAR. Mestre de disfarces e imitação.'},
    durable:{name:'Durável',desc:'+1 CON. Dados de Vida curam o dobro do mod CON.'},
    observant:{name:'Observador',desc:'+1 INT ou SAB. +5 Percepção passiva.'},
    magic_initiate:{name:'Iniciado em Magia',desc:'2 truques + 1 magia de 1º nível de outra classe.'},
    shield_master:{name:'Mestre de Escudo',desc:'Bônus em DEX saves com escudo. Empurrão como bônus.'},
    mobile:{name:'Mobilidade',desc:'+3m velocidade. Evita ataques de oportunidade.'},
    martial_adept:{name:'Adepto Marcial',desc:'1 manobra + 1d6 superioridade.'}
};

// ═══════════════════════════════════════════════
// ALIGNMENTS — D&D 5e PHB p.122
// ═══════════════════════════════════════════════
const ALIGNMENTS = {
    lg: {name:'Leal e Bom', abbr:'LB', icon:'⚖️✨', desc:'Segue regras e faz o bem.'},
    ng: {name:'Neutro e Bom', abbr:'NB', icon:'💛', desc:'Faz o bem sem se prender a regras.'},
    cg: {name:'Caótico e Bom', abbr:'CB', icon:'🦅✨', desc:'Liberdade e bondade acima de tudo.'},
    ln: {name:'Leal e Neutro', abbr:'LN', icon:'⚖️', desc:'Ordem e lei acima de tudo.'},
    nn: {name:'Neutro', abbr:'N', icon:'☯️', desc:'Equilíbrio. Nem ordem nem caos.'},
    cn: {name:'Caótico e Neutro', abbr:'CN', icon:'🦅', desc:'Liberdade pessoal. Imprevisível.'},
    le: {name:'Leal e Mau', abbr:'LM', icon:'⚖️🖤', desc:'Usa regras para dominar.'},
    ne: {name:'Neutro e Mau', abbr:'NM', icon:'🖤', desc:'Egoísta puro. Sem lealdade.'},
    ce: {name:'Caótico e Mau', abbr:'CM', icon:'🦅🖤', desc:'Destruição por impulso.'}
};

// ═══════════════════════════════════════════════
// SUBCLASS DATA — L1 subclass selection (D&D 5e PHB)
// Classes that choose subclass at Level 1: Cleric, Sorcerer, Warlock
// ═══════════════════════════════════════════════
const SUBCLASS_DATA = {
    class_cleric: {
        life: {name:'Domínio da Vida', icon:'❤️', desc:'Curandeiro divino supremo, mestre em restaurar e proteger a vida.',
            l1:{name:'Discípulo da Vida', desc:'Magias de cura restauram HP adicional (2 + nível da magia).'}},
        light: {name:'Domínio da Luz', icon:'☀️', desc:'Canaliza o poder da luz divina para queimar os inimigos e proteger aliados.',
            l1:{name:'Flare Protetor', desc:'Impõe desvantagem no ataque do inimigo como reação.'}}
    },
    class_sorcerer: {
        draconic: {name:'Linhagem Dracônica', icon:'🐉', desc:'Sangue de dragão corre em suas veias, concedendo poder ancestral.',
            l1:{name:'Resiliência Dracônica', desc:'+1 HP por nível e CA 13 + DEX sem armadura.'}},
        wild_magic: {name:'Magia Selvagem', icon:'✨', desc:'Fonte caótica de magia imprevisível e poderosa.',
            l1:{name:'Surto de Magia Selvagem', desc:'Magias podem causar efeitos aleatórios imprevisíveis.'}}
    },
    class_warlock: {
        archfey: {name:'Arquifada', icon:'🧚', desc:'Pacto com uma poderosa criatura feérica da Agrestia das Fadas.',
            l1:{name:'Presença Feérica', desc:'Encanta ou assusta criaturas em aura de 3m (WIS save).'}},
        fiend: {name:'Infernal', icon:'😈', desc:'Pacto com um demônio dos planos inferiores.',
            l1:{name:'Bênção do Senhor Negro', desc:'Ganha PV temporário ao derrotar um inimigo (CHA + nível).'}},
        great_old_one: {name:'Grande Antigo', icon:'👁️‍🗨️', desc:'Pacto com uma entidade incompreensível do Vazio Distante.',
            l1:{name:'Mente Desperta', desc:'Conexão telepática amplifica ataques com +1d6 dano psíquico.'}}
    }
};
const L1_SUBCLASS_CLASSES = ['class_cleric','class_sorcerer','class_warlock'];

// ═══════════════════════════════════════════════
// FIGHTING STYLES — Warrior L1 choice (D&D 5e PHB p.72)
// ═══════════════════════════════════════════════
const FIGHTING_STYLES = {
    fighting_style_defense: {name:'Defesa', icon:'🛡️', desc:'+1 CA enquanto vestir armadura. Ideal para tanques que querem sobreviver mais.'},
    fighting_style_dueling: {name:'Duelismo', icon:'⚔️', desc:'+2 dano com arma corpo a corpo em uma mão. Ideal para causar mais dano.'}
};

const EQUIPMENT_PACKAGES = {
    class_warrior:   {A:{name:'Espada e Escudo',icon:'🛡️',desc:'Espada + escudo + cota de malha',items:['Espada de Treino (1d8)','Escudo de Madeira (+1 CA)','Cota de Malha (6 CA)']},B:{name:'Arma Grande',icon:'⚔️',desc:'Machado grande + cota de malha',items:['Machado Grande (1d12)','Cota de Malha (6 CA)']}},
    class_paladin:   {A:{name:'Martelo e Escudo',icon:'🛡️',desc:'Martelo + escudo + cota de malha',items:['Martelo de Guerra (1d8)','Escudo de Madeira (+1 CA)','Cota de Malha (6 CA)']},B:{name:'Alabarda Sagrada',icon:'⚔️',desc:'Alabarda + cota de malha',items:['Alabarda (1d10)','Cota de Malha (6 CA)']}},
    class_barbarian: {A:{name:'Machado de Batalha',icon:'🪓',desc:'Machado + giboia de pele',items:['Machado de Batalha (1d10)','Giboia de Pele (2 CA)']},B:{name:'Machado Grande',icon:'⚔️',desc:'Machado grande + giboia de pele',items:['Machado Grande (1d12)','Giboia de Pele (2 CA)']}},
    class_ranger:    {A:{name:'Arqueiro',icon:'🏹',desc:'Arco + couro',items:['Arco de Caça (1d6)','Peitoral de Couro (2 CA)']},B:{name:'Espadachim',icon:'⚔️',desc:'Duas espadas curtas + couro',items:['Espada Curta (1d6)','Espada Curta (1d6)','Peitoral de Couro (2 CA)']}},
    class_rogue:     {A:{name:'Adaga Precisa',icon:'🗡️',desc:'Adaga + couro',items:['Adaga Balanceada (1d4+1)','Peitoral de Couro (2 CA)']},B:{name:'Espadachim Furtivo',icon:'⚔️',desc:'Espada curta + couro',items:['Espada Curta (1d6)','Peitoral de Couro (2 CA)']}},
    class_monk:      {A:{name:'Cajado do Mosteiro',icon:'🪵',desc:'Cajado',items:['Cajado de Salgueiro (1d6)']},B:{name:'Lança Monástica',icon:'⚔️',desc:'Lança',items:['Lança (1d6, versátil)']}},
    class_bard:      {A:{name:'Rapieira do Menestrel',icon:'🎭',desc:'Rapieira + couro',items:['Rapieira (1d8)','Peitoral de Couro (2 CA)']},B:{name:'Espada do Trovador',icon:'⚔️',desc:'Espada curta + couro',items:['Espada Curta (1d6)','Peitoral de Couro (2 CA)']}},
    class_cleric:    {A:{name:'Guardião',icon:'🛡️',desc:'Maça + escudo + escamas',items:['Maça de Estrela (1d6+1)','Escudo de Madeira (+1 CA)','Cota de Escamas (4 CA)']},B:{name:'Cruzado',icon:'⚔️',desc:'Martelo + escamas',items:['Martelo de Guerra (1d8)','Cota de Escamas (4 CA)']}},
    class_druid:     {A:{name:'Foice e Escudo',icon:'🌿',desc:'Foice + escudo + giboia',items:['Foice (1d4)','Escudo de Madeira (+1 CA)','Giboia de Pele (2 CA)']},B:{name:'Cajado do Bosque',icon:'🪵',desc:'Cajado + giboia',items:['Cajado de Salgueiro (1d6)','Giboia de Pele (2 CA)']}},
    class_mage:      {A:{name:'Cajado Arcano',icon:'✨',desc:'Cajado + capuz',items:['Cajado de Salgueiro (1d6)','Capuz de Tecido']},B:{name:'Besta e Adaga',icon:'⚔️',desc:'Besta leve + capuz',items:['Besta Leve (1d8)','Capuz de Tecido']}},
    class_sorcerer:  {A:{name:'Cajado do Sangue',icon:'🔮',desc:'Cajado + capuz',items:['Cajado de Salgueiro (1d6)','Capuz de Tecido']},B:{name:'Besta Arcana',icon:'⚔️',desc:'Besta leve + capuz',items:['Besta Leve (1d8)','Capuz de Tecido']}},
    class_warlock:   {A:{name:'Adaga do Pacto',icon:'🗡️',desc:'Adaga + couro',items:['Adaga Enferrujada (1d4)','Peitoral de Couro (2 CA)']},B:{name:'Besta Sombria',icon:'⚔️',desc:'Besta leve + couro',items:['Besta Leve (1d8)','Peitoral de Couro (2 CA)']}}
};

// ═══════════════════════════════════════════════
// HELP TEXTS — Explanations for new players
// ═══════════════════════════════════════════════
const HELP_TEXTS = {
    race: {
        title: '🧬 O que é Raça?',
        text: 'Raça é a espécie do seu personagem — se ele é humano, elfo, anão, ou outra criatura fantástica.\n\nCada raça tem habilidades naturais únicas:\n• Bônus de atributos — Elfos são naturalmente ágeis (+2 Destreza)\n• Traços raciais — Anões resistem a veneno, Halflings têm sorte\n• Idiomas — Cada raça fala línguas diferentes\n\n💡 Dica: Não existe raça "errada". Escolha a que mais combina com o tipo de personagem que você quer criar!'
    },
    class: {
        title: '⚔️ O que é Classe?',
        text: 'Classe é a profissão de aventureiro do seu personagem — como ele luta e que poderes possui.\n\nPense assim:\n• Guerreiro — Especialista em armas e armaduras pesadas\n• Mago — Lança magias poderosas, mas frágil de perto\n• Ladino — Furtivo, ágil, dano massivo por trás\n• Clérigo — Cura aliados e protege com magia divina\n\nSua classe define: quanto de vida (HP), que armas pode usar, e que habilidades especiais possui.\n\n💡 Dica para iniciantes: Guerreiro é simples e forte. Clérigo é ótimo para se curar sozinho.'
    },
    background: {
        title: '📖 O que é Antecedente?',
        text: 'Antecedente é o que seu personagem fazia antes de virar aventureiro.\n\nEle era um soldado? Um nobre? Um criminoso?\n\nCada antecedente dá:\n• 2 perícias — habilidades em que seu personagem é treinado\n• Ouro extra — dinheiro inicial para equipamento\n• Ferramentas — alguns dão proficiência em ferramentas especiais\n\n💡 Dica: Escolha um antecedente cujas perícias sejam diferentes das da sua classe — assim você é bom em mais coisas!'
    },
    stats: {
        title: '📊 O que são Atributos?',
        text: 'Atributos são os 6 números que definem o que seu personagem consegue fazer:\n\n💪 Força (FOR) — Quão forte você é. Ataques corpo-a-corpo.\n🏃 Destreza (DES) — Agilidade e reflexos. Esquiva e pontaria.\n🛡️ Constituição (CON) — Resistência física. Mais CON = mais vida.\n📚 Inteligência (INT) — Conhecimento. Magias arcanas.\n🙏 Sabedoria (SAB) — Intuição e percepção. Magias divinas.\n✨ Carisma (CAR) — Personalidade e influência. Liderança.\n\nValores mais altos = melhor. 10 é média. 15 é excelente. 8 é fraco.\n\n💡 Dica: O atributo principal da sua classe é o mais importante!'
    },
    proficiency: {
        title: '🎯 O que são Perícias?',
        text: 'Perícias são coisas em que seu personagem é treinado e se destaca.\n\nExemplos:\n• Furtividade — Se mover sem ser visto\n• Percepção — Notar perigos e detalhes escondidos\n• Persuasão — Convencer pessoas pela conversa\n• Atletismo — Escalar, nadar, feitos de força\n\nQuando você é proficiente, ganha um bônus extra nos testes dessa perícia.\n\n💡 Dica: Percepção é a perícia mais testada no jogo!'
    },
    tools: {
        title: '🔧 O que são Ferramentas?',
        text: 'Ferramentas artesanais são equipamentos que permitem criar e reparar itens.\n\nNa Oficina da cidade você pode:\n• Fabricar armas e armaduras\n• Criar poções e remédios\n• Construir dispositivos mecânicos\n\nVocê só pode fabricar itens com ferramentas em que é proficiente.\n\n💡 Dica: Ferramentas de Ferreiro fabricam armas. Kit de Herbalismo faz poções de cura.'
    },
    alignment: {
        title: '⚖️ O que é Alinhamento?',
        text: 'Alinhamento descreve a bússola moral do seu personagem em dois eixos:\n\nEixo da Ordem:\n• ⚖️ Leal — Segue regras, honra, tradição\n• ☯️ Neutro — Flexível, decide caso a caso\n• 🦅 Caótico — Liberdade acima de tudo\n\nEixo da Moral:\n• ✨ Bom — Ajuda os outros, faz sacrifícios\n• ☯️ Neutro — Equilíbrio, pragmatismo\n• 🖤 Mau — Egoísta, busca poder pessoal\n\n💡 Dica: A maioria dos heróis é Bom ou Neutro.'
    },
    language: {
        title: '🗣️ O que são Idiomas?',
        text: 'Idiomas determinam com quais povos seu personagem pode conversar.\n\nTodos falam Comum (a língua universal). Sua raça dá idiomas extras.\n\nAlgumas raças ganham um idioma extra à escolha — é isso que você está escolhendo agora!\n\n💡 Dica: Goblin e Orc são úteis contra inimigos comuns. Dracônico e Silvestre são exóticos mas temáticos.'
    },
    gender: {
        title: '🪪 Identidade de Gênero',
        text: 'Gênero define como os personagens do mundo (NPCs) se referem ao seu personagem.\n\nAfeta pronomes e tratamentos na narrativa:\n• Masculino — "ele", "o guerreiro"\n• Feminino — "ela", "a guerreira"\n• Não-Binário/Fluido/Agênero — formas neutras\n\n💡 Não afeta mecânicas de jogo — é puramente narrativo.'
    },
    feat: {
        title: '🌟 O que são Feats?',
        text: 'Feats (Talentos) são poderes especiais que dão habilidades únicas.\n\nExemplos:\n• Sortudo — Re-rola 3 dados por dia\n• Resistente — +2 vida por nível\n• Alerta — +5 na Iniciativa\n• Mestre em Armas Grandes — -5 acerto, +10 dano\n\nNormalmente ganhos nos níveis 4, 8, 12, 16 e 19.\nO Humano Variante ganha 1 feat já no nível 1!\n\n💡 Dica: Sortudo e Resistente são os mais versáteis.'
    }
};
