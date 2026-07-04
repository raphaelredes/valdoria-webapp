/* AUTO-EXTRACTED 2026-04-27 from commit 8b5e4374^ — restaura combate-data-shared.js que foi referenciado em commit 8b5e4374 mas nunca commitado.
   Single source of truth pra:
   - simuladores/combate.html  (acesso direto via top-level var)
   - simuladores/combate-setup-frontend-testes.html (via window.X)
   ZERO fallback hardcoded. Carregado via <script src> antes do main script.

   NOTA: declarações 'var' no top-level de <script> automaticamente
   viram window.X em browser. NÃO usar IIFE aqui (combate.html acessa
   diretamente como CHAR_CLASSES, sem prefixo window). */

/* 2026-04-27 USER RULE: "nunca utilizar nomes de combatentes inimigos com
   números, como Orc 1, Goblin 2, etc... ter pelo menos 8 variações de nomes,
   que é a quantidade máxima de inimigos no campo de combate atual".

   Pool de nomes fantásticos originais (não-copia) por espécie. 8+ variações
   pra cobrir o máximo (8 inimigos no campo) sem repetir. Usados por
   randomEnemies + buildEnemyFromSetup pra substituir o suffix " 1/2/3..." */
var ENEMY_NAME_POOLS = {
    'Goblin':                    ['Snik', 'Grizzle', 'Vrek', 'Squirm', 'Niblat', 'Pricka', 'Mossi', 'Gritto'],
    'Orc':                       ['Grarok', 'Zharak', 'Drugaz', 'Morgosh', 'Krukor', 'Vrachal', 'Bromak', 'Skarrog'],
    'Esqueleto':                 ['Marrow', 'Calcid', 'Femuk', 'Grinso', 'Velhusco', 'Pálidor', 'Ossal', 'Cínero'],
    'Aranha Gigante':            ['Acanto', 'Veneno', 'Tess', 'Mandíbu', 'Pernal', 'Ferrão', 'Aracne', 'Fios'],
    'Sapo Gigante':              ['Glub', 'Pântanal', 'Mucol', 'Croak', 'Limbo', 'Rana', 'Lodal', 'Saltas'],
    'Homem-Lagarto':             ['Sszik', 'Karro', 'Vossh', 'Ramaz', 'Esquam', 'Garrok', 'Sszal', 'Verdek'],
    'Crocodilo':                 ['Sarro', 'Gnarl', 'Mandib', 'Pântano', 'Garra', 'Lodarg', 'Rasgo', 'Sclypa'],
    'Cobra Constritora Gigante': ['Vipara', 'Slarno', 'Constri', 'Sibilo', 'Languar', 'Ofídio', 'Anelar', 'Píton'],
    'Bruxa Verde':               ['Morganha', 'Hexala', 'Verdélia', 'Ranzinza', 'Mostrenga', 'Cróna', 'Erva-Má', 'Pântanorra'],
    'Mímico':                    ['Caixus', 'Falsão', 'Engano', 'Trapace', 'Ladriz', 'Quimera', 'Ilus', 'Falaz'],
    'Lobo':                      ['Sombra', 'Garra', 'Presa', 'Fauce', 'Vento', 'Caçador', 'Furtivo', 'Uivo'],
    'Lobo Atroz':                ['Crisalid', 'Vorago', 'Mordak', 'Rasgaz', 'Fenrak', 'Ulfar', 'Greyfang', 'Skarn'],
    'Bandido':                   ['Lasco', 'Gallum', 'Verme', 'Escuro', 'Faísca', 'Bruto', 'Sorrato', 'Punho'],
    'Troll':                     ['Brackor', 'Gorm', 'Hrundi', 'Kragmar', 'Stozz', 'Vurg', 'Chumbal', 'Gnashek'],
    'Ghoul':                     ['Vorácie', 'Carniço', 'Necrol', 'Ranço', 'Pútri', 'Esquál', 'Vísce', 'Mortenó'],
    'Zumbi':                     ['Lerdo', 'Pútre', 'Ressuro', 'Errante', 'Cinor', 'Brancol', 'Lacerto', 'Mudo'],
    'Urso':                      ['Bruno', 'Pelago', 'Furacão', 'Trovão', 'Pesado', 'Rugir', 'Massivo', 'Patarro'],
    'Urso Pardo':                ['Bruno', 'Pelago', 'Trovão', 'Rugir', 'Massivo', 'Patarro', 'Furacão', 'Pesado'],
    'Bandido Arqueiro':          ['Flecha', 'Olhar', 'Ágil', 'Silenço', 'Pluma', 'Mira', 'Vento', 'Corda'],
    'Capitão Bandido':           ['Garrick', 'Mestre', 'Lâmina', 'Sangra', 'Ferro', 'Capa', 'Pino', 'Cifrão'],
};

/* Helper: pick fantasy name from pool by species + index. Determinístico
   pra que same enemy index sempre tenha same name (consistência durante
   reload). Fallback: usa species name puro se não tem pool.

   2026-05-17 USER REPORTOU: "porque os inimigos estão com nomes como
   CAIXUS para um mímico, GRIZZLE para um GOBLIN, DRUGAZ para um orc"
   — nomes fantasia ficavam confusos pro player que esperava ver
   "Goblin" / "Orc" diretamente. Solução: DESABILITADO por padrão via
   flag global. Caller usa species name + " I, II, III" (numeral roman)
   quando há múltiplos enemies da mesma species.

   Pra REATIVAR fantasy names: setar window._ENEMY_FANTASY_NAMES_ENABLED = true */
function _pickEnemyFantasyName(species, idx) {
    if (typeof window !== 'undefined' && !window._ENEMY_FANTASY_NAMES_ENABLED) {
        return null;  // disabled by default — use species + Roman numeral
    }
    var pool = ENEMY_NAME_POOLS[species];
    if (!pool || !pool.length) return null;
    return pool[idx % pool.length];
}

var BESTIARY = [
    /* V1.7 Sprint-17 Ronda 22 (2026-04-21 QA PHB MM creature types) — tags em todos
       os inimigos base. Enables: Divine Smite +1d8 vs undead/fiend, Hold Person
       humanoid-only, Charm Person humanoid-only, futuras checagens de tipo. */
    { n: 'Goblin',                    hp: 7,  ac: 15, atk: 4, die: 6,  dex: 14, ico: '', dmgMod: 2, attr: 'DEX', tags: ['humanoid'] },
    { n: 'Orc',                       hp: 15, ac: 13, atk: 5, die: 12, dex: 12, ico: '', dmgMod: 3, attr: 'STR', tags: ['humanoid'] },
    { n: 'Esqueleto',                 hp: 13, ac: 13, atk: 4, die: 6,  dex: 14, ico: '', dmgMod: 2, attr: 'STR', tags: ['undead'] },
    { n: 'Aranha Gigante',            hp: 26, ac: 14, atk: 5, die: 8,  dex: 16, ico: '', dmgMod: 3, attr: 'STR', tags: ['beast'] },
    { n: 'Sapo Gigante',              hp: 18, ac: 11, atk: 3, die: 6,  dex: 13, ico: '', dmgMod: 2, attr: 'STR', tags: ['beast'] },
    { n: 'Homem-Lagarto',             hp: 22, ac: 15, atk: 4, die: 6,  dex: 10, ico: '', dmgMod: 2, attr: 'STR', tags: ['humanoid'] },
    { n: 'Crocodilo',                 hp: 19, ac: 12, atk: 4, die: 10, dex: 10, ico: '', dmgMod: 2, attr: 'STR', tags: ['beast'] },
    { n: 'Cobra Constritora Gigante', hp: 60, ac: 12, atk: 6, die: 10, dex: 14, ico: '', dmgMod: 4, attr: 'STR', tags: ['beast'] },
    { n: 'Bruxa Verde',               hp: 82, ac: 17, atk: 6, die: 8,  dex: 12, ico: '‍', dmgMod: 3, attr: 'INT', tags: ['fey'] },
    { n: 'Mímico',                    hp: 58, ac: 12, atk: 5, die: 8,  dex: 12, ico: '', dmgMod: 3, attr: 'STR', tags: ['monstrosity'] },
    /* V1.7 Stage-CASTERS (2026-04-21) — Inimigos que castam magia (PHB Monster
       Manual). Cada um tem `isCaster:true`, pool `res` e arsenal `skills[]`
       espelhado das classes jogadoras. NPC AI escolhe entre weapon attack e
       spell baseado em MP disponível + chance de cast. */
    { n: 'Acólito', hp: 9, ac: 10, atk: 2, die: 4, dex: 10, wis: 14, con: 10, int: 10, cha: 11, ico: '', dmgMod: 0, attr: 'WIS',
      isCaster: true, sugLvl: 1,
      res: { type: 'mp', name: 'Mana', ico: '', max: 4 },
      castProb: 0.7,
      /* MM p.342: Acolyte — Spellcasting 1st level. Cantrips: light, sacred flame, thaumaturgy.
         1st level slots (3): bless, cure wounds, sanctuary. Arena simplificado: 2 skills. */
      skills: [
        { n: 'Chama Sagrada', ico: '', cost: 0, kind: 'attack', dmgType: 'radiant',
          damageSpec: { n: 1, d: 8 }, scale: 'cantrip', save: { ability: 'dex' } },
        { n: 'Curar Ferimentos', ico: '', cost: 2, kind: 'heal', healTargets: 'self',
          healSpec: { n: 1, d: 8, flat: 2 } }
      ]
    },
    { n: 'Aprendiz de Mago', hp: 9, ac: 10, atk: 4, die: 4, dex: 12, int: 15, con: 10, wis: 10, cha: 11, ico: '', dmgMod: 0, attr: 'INT',
      isCaster: true, sugLvl: 1,
      res: { type: 'mp', name: 'Mana', ico: '', max: 5 },
      castProb: 0.8,
      /* MM Apprentice Wizard — Spellcasting 1st level. Cantrips: fire bolt, mage hand,
         shocking grasp. 1st slot (2): burning hands, magic missile, shield. */
      skills: [
        { n: 'Raio de Fogo', ico: '', cost: 0, kind: 'attack', dmgType: 'fire',
          damageSpec: { n: 1, d: 10 }, scale: 'cantrip' },
        { n: 'Mísseis Mágicos', ico: '', cost: 2, kind: 'attack', dmgType: 'force',
          autoHit: true, magicMissiles: { count: 3, perDart: { n: 1, d: 4, flat: 1 } } }
      ]
    },
    { n: 'Cultista Fanático', hp: 33, ac: 13, atk: 4, die: 6, dex: 14, wis: 13, con: 10, int: 10, cha: 14, ico: '', dmgMod: 2, attr: 'WIS',
      isCaster: true, sugLvl: 4,
      res: { type: 'mp', name: 'Mana', ico: '', max: 8 },
      castProb: 0.6,
      /* MM p.345: Cult Fanatic — Spellcasting 4th level. Cantrips: light, sacred flame,
         thaumaturgy. Slots: command, inflict wounds, hold person, spiritual weapon. */
      skills: [
        { n: 'Chama Sagrada', ico: '', cost: 0, kind: 'attack', dmgType: 'radiant',
          damageSpec: { n: 2, d: 8 }, scale: 'cantrip', save: { ability: 'dex' } },
        { n: 'Infligir Ferimentos', ico: '', cost: 2, kind: 'attack', dmgType: 'necrotic',
          damageSpec: { n: 3, d: 10 } }
      ]
    },
    { n: 'Mago Hostil', hp: 40, ac: 12, atk: 6, die: 4, dex: 14, int: 17, con: 11, wis: 12, cha: 11, ico: '‍', dmgMod: 0, attr: 'INT',
      isCaster: true, sugLvl: 9,
      res: { type: 'mp', name: 'Mana', ico: '', max: 15 },
      castProb: 0.85,
      /* MM p.347: Mage — Spellcasting 9th level. Cantrips: fire bolt, light, mage hand,
         prestidigitation. Slots: shield, magic missile, mirror image, fireball, etc.
         V1.7 Stage-CASTERS (2026-04-21): Shield como reactionOnly pra NPC AI usar
         defensivamente quando player atacar e acertar (PHB p.275). */
      skills: [
        { n: 'Raio de Fogo', ico: '', cost: 0, kind: 'attack', dmgType: 'fire',
          damageSpec: { n: 2, d: 10 }, scale: 'cantrip' },
        { n: 'Mísseis Mágicos', ico: '', cost: 2, kind: 'attack', dmgType: 'force',
          autoHit: true, magicMissiles: { count: 3, perDart: { n: 1, d: 4, flat: 1 } } },
        { n: 'Bola de Fogo', ico: '', cost: 3, kind: 'attack', dmgType: 'fire',
          damageSpec: { n: 8, d: 6 }, save: { ability: 'dex' } },
        { n: 'Escudo Arcano', ico: '', cost: 1, kind: 'buff', reactionOnly: true, shieldSpell: true,
          helpDnd5e: 'Escudo (PHB p.275): Mago NPC usa como reação quando é atingido — +5 CA vs gatilho (simplificado: +5 CA por 1 rodada).',
          buffSim: { id: 'escudo_arcano_npc', turns: 2, acBonus: 5, kind: 'buff' } }
      ]
    },
    /* X-6.5.51AC (2026-05-04): 6 entries adicionadas pra fechar gap com ENEMIES_DB
       em simuladores/exploracao.html (linhas 34685-34898). ANTES: encounters de Lobo/
       Bandido/Orc Guerreiro/Fogo-Fátuo/Troll/Zumbi caiam em fallback BESTIARY[0]=Goblin
       silenciosamente em buildEnemyFromSetup (combate.html:12834) porque lookup_name
       resolvido via bestiary_name não existia. Issue #1 do fluxo travel→combat.
       Stats canonicos PHB MM mantidos em sintonia com ENEMIES_DB pra coerência visual
       (HP/CA exibidos na exploração devem bater com combate). */
    { n: 'Lobo',                      hp: 11, ac: 13, atk: 4, die: 8,  dex: 15, str: 12, con: 12, wis: 12, int: 3,  cha: 6,  ico: '', dmgMod: 2, attr: 'STR', tags: ['beast'] },
    { n: 'Bandido',                   hp: 11, ac: 12, atk: 3, die: 6,  dex: 12, str: 11, con: 12, wis: 10, int: 10, cha: 10, ico: '', dmgMod: 1, attr: 'DEX', tags: ['humanoid'] },
    { n: 'Orc Guerreiro',             hp: 22, ac: 14, atk: 5, die: 12, dex: 12, str: 16, con: 16, wis: 11, int: 7,  cha: 10, ico: '', dmgMod: 3, attr: 'STR', tags: ['humanoid'] },
    { n: 'Fogo-Fátuo',                hp: 22, ac: 19, atk: 4, die: 10, dex: 28, str: 1,  con: 10, wis: 14, int: 13, cha: 11, ico: '', dmgMod: 4, attr: 'DEX', tags: ['undead'] },
    { n: 'Troll',                     hp: 84, ac: 15, atk: 7, die: 12, dex: 13, str: 18, con: 20, wis: 9,  int: 7,  cha: 7,  ico: '', dmgMod: 4, attr: 'STR', tags: ['giant'] },
    { n: 'Zumbi',                     hp: 22, ac: 8,  atk: 3, die: 6,  dex: 6,  str: 13, con: 16, wis: 6,  int: 3,  cha: 5,  ico: '', dmgMod: 1, attr: 'STR', tags: ['undead'] },
];

var CHAR_NAMES = ['Kael', 'Elara', 'Thorne', 'Miriel', 'Garrick', 'Sylas', 'Vaela', 'Rurik', 'Isen', 'Brynn'];

var CHAR_CLASSES = [
    { cls: 'Guerreiro', hp: [28, 40], ac: [16, 18], atk: [5, 7], die: 10, dex: [12, 14], ico: '', dmgMod: 3, attr: 'STR',
      res: { type: 'vigor',   name: 'Vigor',   ico: '', max: 5 },
      skills: [
        { n: 'Ataque Poderoso', ico: '', cost: 2, kind: 'attack', desc: 'Golpe pesado: 2d10 + modificador de dano após acertar',
            damageSpec: { n: 2, d: 10 },
            helpDnd5e: 'Referência: talento Golpe Desleal (PHB) e estilos com arma de duas mãos / pesada.\nNo D&D 5e, o ataque corpo a corpo ou à distância ainda usa 1d20 + bônus de ataque contra a CA do alvo. Se errar, não há dano.\nNeste fluxo: após acertar, o dano é 2d10 + modificador de atributo (STR), sem a opção PHB de −5 no ataque / +10 no dano.\nCrítico no d20: role o dado de dano de arma uma vez a mais antes do modificador (PHB p.196).' },
        { n: 'Postura Defensiva', ico: '', cost: 1, kind: 'buff', desc: '+2 CA até o fim do próximo turno (estilo Defesa)',
            helpDnd5e: 'Referência: Estilo de Combate Defesa (PHB): +2 na CA até o início do próximo turno do guerreiro, se estiver usando armadura.\nNão exige reação; é passivo enquanto o estilo estiver ativo.\nNeste modo: bônus simplificado aplicado como mensagem de estado até o fluxo integrar turnos completos.',
            buffSim: { id: 'postura_def', vfx: 'shield', decOn: 'after_npc', turns: 1, kind: 'buff', condName: 'Postura de defesa (estilo)', condRule: 'PHB — Estilo de Combate Defesa: +2 na CA com armadura. Neste modo: +2 CA até após a próxima sequência de turnos dos outros combatentes.', acBonus: 2 } },
        { n: 'Investida', ico: '', cost: 2, kind: 'attack', desc: 'Investida: 1d10 + STR; depois −2 CA até o próximo turno (stub)',
            damageSpec: { n: 1, d: 10 },
            afterAttackSelfDebuff: {
                id: 'investida_exposto',
                turns: 1,
                acBonus: -2,
                n: 'Investida — CA penalizada (stub)',
                dndCondition: 'Penalidade à CA (investida)'
            },
            helpDnd5e: 'Referência: talento Investida (PHB) — movimento extra e ataque após deslocar em linha reta.\nAtaque: 1d20 + bônus vs CA; em erro, sem dano.\nDano aplicado: 1d10 + STR. Penalidade de CA após o golpe: mesmo modelo que combat2 (pendingEndTurnSkip + fim de turno).' },
        { n: 'Segundo Fôlego', ico: '', cost: 1, kind: 'heal', bonus: true, desc: 'Ação bônus: recupera 1d10 + nível em PV em si (1/combate).', healTargets: 'self', healSpec: { n: 1, d: 10, modLevel: true }, healSpell: true,
            combatOnceId: 'second_wind',
            helpDnd5e: 'Segundo Fôlego (PHB p.72 Guerreiro): **AÇÃO BÔNUS**, 1d10 + nível da classe em PV, 1x por descanso curto ou longo.\nV1.7 (2026-04-21) alinhamento PHB: era `kind:heal` sem flag `bonus` — consumia AÇÃO principal (divergência). Agora `bonus:true` + `combatOnceId:second_wind` 1x por combate.' },
        { n: 'Golpe Preciso', ico: '', cost: 2, kind: 'attack', desc: 'Golpe calibrado: 2d8 + modificador de dano. Maior precisão em pontos vitais.',
            damageSpec: { n: 2, d: 8 }, dmgType: 'slashing',
            helpDnd5e: 'Referência: Manobra Ataque Preciso (Battle Master PHB p.74): gasta 1 dado de superioridade (1d8) adicionado à rolagem de ataque. Neste fluxo: +1 dado direto no dano (2d8 total no lugar de 1d8 + 1d8 superioridade).' },
        /* V1.7 Sprint-9 (2026-04-21 closeout) — Surto de Ação PHB-fiel real (PHB p.72):
           AÇÃO EXTRA no turno, 1x por combate (stub 1x/short rest PHB). Runtime em
           `useSkill` consome `grantsExtraAction:true` + reseta `actionSpent=false` +
           marca `combatOnceUsed.action_surge=true`. combatOnceId impede spam.
           ADAPTAÇÃO: buffSim stub (atkAdv + 1d6) REMOVIDO — PHB p.72 não dá esses
           bônus, só uma ação extra pura. */
        /* V1.7 Sprint-17 (2026-04-21 QA PHB p.72) — Action Surge Guerreiro nv 2+. */
        { n: 'Surto de Ação', ico: '', cost: 2, kind: 'buff', grantsExtraAction: true, minLevel: 2,
            combatOnceId: 'action_surge',
            desc: 'Ação EXTRA PHB p.72: 1x por combate, use outra ação adicional no turno.',
            helpDnd5e: 'Surto de Ação / Action Surge (PHB p.72 — Guerreiro nv 2): feature de classe; 1x por descanso curto, você pode gastar pra tomar uma AÇÃO ADICIONAL no turno atual. Pode ser Attack, Cast, Dash, Disengage, Dodge, Help, Hide, Ready, Search, Use an Object.\nV1.7 Sprint-9 (2026-04-21 closeout): PHB-fiel real. `grantsExtraAction:true` + `combatOnceId:action_surge` — runtime em `useSkill` reseta `actionSpent=false`, liberando uma ação extra. Custa 2 Vigor (representa a exaustão mental de um Surto PHB).',
            /* No buffSim — a ação extra É o único efeito PHB, nem vantagem nem dmg bonus.
               Stub antigo (atkAdvantage + dmgBonusDie:{n:1,d:6}) foi removido Sprint-9. */ },
        { n: 'Grito de Guerra', ico: '', cost: 2, kind: 'heal', desc: 'Rugido de comando: +5 PV temporários em todos aliados vivos (incluindo você).',
            healSpec: { n: 0, d: 0, flat: 5 }, healSpell: true, healAllAllies: true, tempHp: true,
            helpDnd5e: 'Palavra de Cura em grupo / Inspirador (PHB p.217 — Bardo Inspiração + similares): ação bônus cede dado de dano temporário ou PV.\nNeste fluxo: 5 PV temporários em TODOS aliados — absorvem dano até zerar antes de afetar PV real. Adaptação do "Second Wind" em área.' }
      ] },
    { cls: 'Mago',      hp: [18, 26], ac: [12, 13], atk: [3, 5], die: 6,  dex: [12, 16], ico: '', dmgMod: 0, attr: 'INT',
      res: { type: 'mp',      name: 'Mana',    ico: '', max: 12 },
      /* V1 Invocações Phase 3 (2026-04-18) — Familiar (PHB p.272 — variante de combate da casa). */
      passives: [
          {
              id: 'familiar',
              kind: 'summon_combatant_passive',
              spawnInBattle: true,
              spawnPosition: 'rear_ally',
              /* B1 (escolha autor 2026-04-19) — PHB-fiel: requer ritual fora-de-combate
                 (1h + 10 GP per PHB p.240). Setup-frontend ganha checkbox "Já fez ritual?"
                 (default true pra UX; player pode desmarcar pra simular "Familiar morto/
                 não invocado"). */
              preCombatRitual: true,
              helpDnd5e: 'Achar Familiar (PHB p.240 — Find Familiar): invoca um espírito ' +
                         'em forma animal (Pseudodragon-like). Stats: HP 4, CA 13, atk +4. ' +
                         'INVOCAÇÃO PHB-FIEL: requer 1h de ritual + 10 Valdoritas em incenso/ervas ' +
                         'FORA DE COMBATE. Combat2 assume que ritual foi feito (toggle no ' +
                         'setup-frontend permite desabilitar). ' +
                         'ADAPTAÇÕES vs PHB: ' +
                         '(a) PHB: "Familiar can take any action it can normally take, but ' +
                         'CAN\'T take the Attack action." Combat2 honra PHB via noAttack:true ' +
                         '— Familiar NÃO ataca. Vira presença visual + foco tático (botão ' +
                         'Focar Familiar prepara-o para futura entrega de magias touch); ' +
                         '(b) Delivery de touch spells (PHB p.240 reaction) não implementado. ' +
                         'Persistente até morrer; após morte, retorna no próximo combate.',
              summonSpec: {
                  id: 'familiar',
                  name: 'Familiar',
                  ico: '',
                  hp: 4, mhp: 4, ac: 13,
                  dex: 15, wis: 12, con: 10, str: 6, int: 6, cha: 6,
                  atk: 4,
                  damageSpec: { n: 1, d: 4, flat: 2 },
                  dmgType: 'piercing',
                  die: 4,
                  multiAttack: 1,
                  /* A1 (escolha do autor 2026-04-19) — PHB-fiel: Familiar NÃO ataca.
                     PHB p.240: "Your familiar can take any action it can normally take,
                     but it CAN'T take the Attack action." Vira presença visual + entrega
                     de magias touch (futuramente). Stats de ataque mantidos pra
                     defesa visual mas AI pula seu turno. */
                  noAttack: true
              }
          }
      ],
      skills: [
        /* V1.7 Sprint-17 (2026-04-21 QA audit PHB) — Bola de Fogo (Fireball PHB p.241):
           PHB RAW 3rd-level spell: 8d6 fire damage on failed DEX save, half on success.
           Era 3d6 (divergência PHB — provavelmente balance stub). NPC Mago Hostil já
           usava 8d6 (inconsistente). Corrigido pra 8d6 RAW. */
        /* V1.7 Sprint-17 (2026-04-21 QA PHB p.241) — Bola de Fogo upcast:
           +1d6 per slot level above 3rd. Mago full caster: nv 5 (3rd slot) base
           8d6, nv 7 (4th): 9d6, nv 9 (5th): 10d6, nv 11 (6th): 11d6, etc. */
        { n: 'Bola de Fogo', ico: '', cost: 4, kind: 'attack', minLevel: 5, desc: 'Esfera flamejante 8d6 fogo AOE (PHB p.241). Escala +1d6 por slot acima do 3º. TR DES metade.',
            damageSpec: { n: 8, d: 6, scaleByCasterLevel: { breakpoints: [[7, 1], [9, 2], [11, 3], [13, 4], [15, 5], [17, 6]] } }, dmgType: 'fire', save: { ability: 'dex' },
            fireball: { n: 8, d: 6, flat: 0 }, multiTarget: true,
            helpDnd5e: 'Bola de Fogo / Fireball (PHB p.241 — Mago/Feiticeiro nv 3): 1 action; esfera de 6m raio. Cada criatura na área faz TR DES; **8d6 fogo** em falha, metade em sucesso.\nUpcast: +1d6 por nível acima do 3º.\nV1.7 Sprint-17 (2026-04-21): era 3d6 stub (divergência PHB) — corrigido pra 8d6 RAW.' },
        { n: 'Mísseis Mágicos', ico: '', cost: 2, kind: 'attack', desc: 'Três dardos arcanos que acertam sem falhar. Cada um causa 1d4+1 de dano de força.',
            dmgType: 'force', autoHit: true,
            /* V1.7 Sprint-17 (2026-04-21 QA PHB p.257) — Magic Missile upcast:
               scaleByCasterLevel:true escala por nível do Mago (full caster slot progression).
               nv 1-2: 3 darts · nv 3-4: 4 · nv 5-6: 5 · nv 7-8: 6 · nv 9+: 7. */
            magicMissiles: { count: 3, perDart: { n: 1, d: 4, flat: 1 }, scaleByCasterLevel: true },
            helpDnd5e: 'Mísseis Mágicos (PHB p.257 — 1º nível): 3 dardos que acertam automaticamente; cada um rola 1d4+1 de força. Sem atributo. Autohit vs CA.\nUpcast: +1 dardo por nível acima do 1º.\nArena (escala por nível do caster): nv 1-2: 3 dardos · nv 3-4: 4 · nv 5-6: 5 · nv 7-8: 6 · nv 9+: 7.' },
        { n: 'Escudo Arcano', ico: '', cost: 1, kind: 'buff', reactionOnly: true, desc: 'Reação: +5 na CA até o início do próximo turno', shieldSpell: true,
            helpDnd5e: 'Referência: Escudo (PHB p.275): 1 reação quando é atingido por um ataque ou acertado por magia de Mísseis Mágicos; +5 na CA incluindo contra o gatilho; dura até o início do próximo turno do mago.\nNão gasta concentração.\nV1.7 (2026-04-21) — AGORA É REAÇÃO VERDADEIRA: aparece popup quando inimigo acertar você; gastar 1 Mana aplica +5 CA e pode transformar acerto em erro. Não pode mais ser castada em ação própria.',
            buffSim: { id: 'escudo_arcano', vfx: 'arcane', decOn: 'after_npc', turns: 1, kind: 'buff', condName: 'Escudo (magia)', condRule: 'PHB p.275 — Reação: +5 na CA contra o gatilho e até o início do próximo turno do conjurador.', acBonus: 5 } },
        /* V1.7 Sprint-17 Ronda 27 (2026-04-21 QA PHB p.271) — Ray of Frost é CANTRIP.
           PHB RAW: truque (Mago/Feiticeiro). Cost 2 → 0. Scale cantrip já estava correto. */
        { n: 'Raio Gélido', ico: '', cost: 0, kind: 'attack', dmgType: 'cold', desc: 'Truque (PHB p.271): atk mágico ranged 1d8 frio (escala cantrip) + reduz velocidade 3m.',
            damageSpec: { n: 1, d: 8 },
            scale: 'cantrip',
            rayOfFrost: { n: 1, d: 8, flat: 0 },
            debuffOnHit: {
                id: 'raio_gelido_slow',
                turns: 1,
                n: 'Deslocamento reduzido',
                ico: '',
                dndCondition: 'Velocidade reduzida (truque; não aplica Lentidão PHB)'
            },
            helpDnd5e: 'Raio Gélido / Ray of Frost (PHB p.271 — truque Mago/Feiticeiro): atk magia ranged; 1d8 frio; em acerto reduz velocidade 3m até início do próximo turno.\nEscala cantrip: 2d8 nv5, 3d8 nv11, 4d8 nv17.\nV1.7 Sprint-17 Ronda 27 (2026-04-21 QA PHB p.271): cost 2 → 0 (cantrips não gastam slot RAW).' },
        /* V1.7 Sprint-17 Ronda 27 (2026-04-21 QA PHB p.257) — Relâmpago era duplicata de Lightning Bolt
           sem upcast + sem multiTarget. Alinhado com Raio Relampejante (PHB-fiel): breakpoints +1d6/slot
           acima 3º + multiTarget:true. Cost 5 mantido (stub interno — desbalanceado vs Raio Relampejante
           cost 3, mas respeita expectativa do usuário que já escolheu essa skill). */
        { n: 'Relâmpago', ico: '', cost: 5, kind: 'attack', minLevel: 5, desc: 'Linha 30m (PHB p.257): 8d6 elétrico AOE (escala +1d6/slot acima 3º). TR DES metade.',
            damageSpec: { n: 8, d: 6, scaleByCasterLevel: { breakpoints: [[7, 1], [9, 2], [11, 3], [13, 4], [15, 5], [17, 6]] } }, dmgType: 'lightning', save: { ability: 'dex' }, multiTarget: true,
            helpDnd5e: 'Relâmpago / Lightning Bolt (PHB p.257 — Mago/Feiticeiro nv 3): 1 action; linha 30m × 1,5m. Cada criatura na linha faz TR DES; 8d6 elétrico em falha, metade em sucesso. Objetos inflamáveis pegam fogo.\nUpcast: +1d6 por nível acima do 3º.\nV1.7 Sprint-17 Ronda 27 (2026-04-21): adicionado upcast breakpoints + multiTarget (antes sem upcast + single target, divergências PHB RAW).' },
        { n: 'Contramágica', ico: '', cost: 3, kind: 'buff', reactionOnly: true, shieldSpell: true,
            desc: 'Reação: +3 CA e vantagem contra magias por 2 turnos. Dissipa parcialmente magia inimiga.',
            helpDnd5e: 'Contramágica (PHB p.237): reação para interromper outra magia em conjuração (nível 3 do espaço ou menor é dissipada automaticamente; acima exige teste).\nV1.7 (2026-04-21) — AGORA É REAÇÃO VERDADEIRA: aparece popup quando você for atingido por ataque/magia; gastar 3 Mana aplica +3 CA e vantagem em TR contra magia por 2 rodadas. Não pode mais ser castada em ação própria.',
            buffSim: { id: 'contramagica', vfx: 'arcane', decOn: 'after_npc', turns: 2, kind: 'buff', condName: 'Contramágica', condRule: 'PHB p.237 — Reação: +3 CA e vantagem em TR contra magia por 2 rodadas.', acBonus: 3, magicSaveAdvantage: true } },
        /* V1.7 NEW SKILLS (2026-04-21) — Passo Brumoso (Misty Step PHB p.260) BA teleport 9m */
        { n: 'Passo Brumoso', ico: '', cost: 2, kind: 'buff', bonus: true, minLevel: 3,
            desc: 'Ação bônus (PHB p.260 — 2º nível, nv 3+): teleport 9m — reposicionamento tático (vantagem no próximo ataque).',
            helpDnd5e: 'Passo Brumoso / Misty Step (PHB p.260 — 2º nível): **AÇÃO BÔNUS**; teleport até 9m pra local que você pode ver.\nArena stub (sem grid): traduzido em vantagem no próximo ataque (reposicionamento tático após o teleport).',
            buffSim: { id: 'passo_brumoso', vfx: 'arcane', decOn: 'after_npc', turns: 1, kind: 'buff', condName: 'Passo Brumoso', condRule: 'PHB p.260 — teleport 9m. Stub arena: vantagem próximo ataque.', atkAdvantage: true } },
        /* V1.7 Sprint-5 (2026-04-21 closeout) — Sono (Sleep PHB p.276) Mago nv 1.
           Upgrade PHB: TR SAB em falha → INCONSCIENTE (Unconscious PHB Appendix A):
           prone + incapacitated + crit melee em 1.5m + atacantes advantage + auto-fail STR/DEX.
           Duração: até sofrer dano OU acordar (3 rodadas stub). */
        /* V1.7 Sprint-17 (2026-04-21 QA PHB p.276) — Sono RAW: HP pool 5d8, sem
           save. Criatura afetada se HP ≤ pool (stub: primeiro alvo que couber).
           Antes stub com TR SAB (divergência — PHB Sleep não tem save). */
        { n: 'Sono', ico: '', cost: 3, kind: 'attack', dmgType: 'psychic',
            desc: 'Encantamento (PHB p.276): rola 5d8 HP pool (escala +2d8/slot acima 1º) — se alvo HP ≤ pool, INCONSCIENTE.',
            damageSpec: { n: 0, d: 0 },
            /* V1.7 Sprint-17 Ronda 25 (2026-04-21 QA PHB p.276) — Sleep upcast RAW: +2d8/slot acima 1º.
               Mago full caster: nv 1-2 (1st) 5d8 · nv 3-4 (2nd) 7d8 · nv 5-6 (3rd) 9d8 ·
               nv 7-8 (4th) 11d8 · nv 9+ (5th) 13d8. Antes era fixo 5d8 (divergência RAW). */
            sleepHpPool: { n: 5, d: 8, scaleByCasterLevel: { breakpoints: [[3, 2], [5, 4], [7, 6], [9, 8]] } },
            helpDnd5e: 'Sono / Sleep (PHB p.276 — Mago/Bardo nv 1): 1 action; rola 5d8 HP total. Criaturas em 6m em ordem crescente de HP atual adormecem (se total cobrir). Sem TR.\n1 min ou até sofrer dano / alguém gastar ação acordando.\nInconsciente (PHB Appendix A): incapacitado, prone, auto-falha TRs FOR/DES, atacantes em 1,5m fazem crit auto, outros atacantes com vantagem.\nUpcast: +2d8 por nível acima do 1º.\nNÃO AFETA: undead ou criaturas imunes a charme (elfos imunes).\nV1.7 Sprint-17 (2026-04-21): sleepHpPool implementado — check HP vs 5d8 rolado (antes era TR WIS stub).\nV1.7 Sprint-17 Ronda 25 (2026-04-21 QA PHB p.276): upcast scaling adicionado. Nv 3 (2nd): 7d8, nv 9+ (5th): 13d8 — permite pegar alvos com HP maior conforme Mago evolui.',
            afterAttackEnemyDebuff: { id: 'sleep_unconscious', turns: 3, n: 'Inconsciente', ico: '', skipTurn: true, critMelee: true, targetedAdvantage: true, prone: true, autoFailStrDex: true, wakeOnDamage: true, dndCondition: 'Inconsciente (PHB App.A — Sono)' } },
        /* V1.7 Sprint-6 (2026-04-21 closeout) — Invisibilidade (Invisibility PHB p.255) Mago nv 2.
           Aplica condição INVISÍVEL (PHB Appendix A) em SELF (ou aliado alvo): ataques SEUS
           têm advantage + atacantes CONTRA você têm disadvantage. Dura 1h ou até atacar.
           Arena stub: self-buff 3 rodadas; atacar DEVERIA remover (flag `endOnAttack` stub). */
        { n: 'Invisibilidade', ico: '', cost: 3, kind: 'buff', minLevel: 3,
            desc: 'Torna-se INVISÍVEL (PHB p.255): atk advantage + atacantes disadvantage 3 rodadas.',
            helpDnd5e: 'Invisibilidade / Invisibility (PHB p.255 — 2º nível): concentração até 1h. Alvo fica invisível, equipamento some junto. Efeito termina se alvo ATACAR ou CASTAR magia.\nInvisível (PHB Appendix A): atacantes contra você com desvantagem, SEUS ataques com vantagem (bônus de heavily obscured / unseen attacker).\nArena: self-buff 3 rodadas + `endOnAttack:true` (PHB RAW: próximo atk quebra).',
            buffSim: { id: 'invisibility', vfx: 'arcane', decOn: 'round', turns: 3, kind: 'buff', condName: 'Invisível', condRule: 'PHB p.255 — atk advantage + atacantes disadv. Quebra ao atacar.', atkAdvantage: true, attackerDisadvantage: true, endOnAttack: true, concentration: true, dndCondition: 'Invisível (PHB App.A — Invisibilidade)' } },
        /* V1.7 Sprint-6 (2026-04-21 closeout) — Cegueira/Surdez (Blindness/Deafness PHB p.224) Mago nv 2.
           Aplica condição CEGO (PHB Appendix A): atk disadv + atacantes adv. TR CON no cast + ao fim de cada turno. */
        { n: 'Cegueira', ico: '‍', cost: 3, kind: 'attack', minLevel: 3, dmgType: 'necrotic',
            desc: 'Cega alvo (PHB p.224): TR CON ou CEGO 3 rodadas; TR CON ao fim do turno.',
            damageSpec: { n: 0, d: 0 }, save: { ability: 'con' },
            helpDnd5e: 'Cegueira/Surdez / Blindness-Deafness (PHB p.224 — 2º nível): escolhe Cegueira OU Surdez. Alvo faz TR CON; em falha fica cego (ou surdo) até 1 min. Sem concentração! TR CON repetido ao fim de cada turno.\nCego (PHB Appendix A): não pode ver, atk com desvantagem, atacantes com vantagem, falha auto em checks que requerem visão.\nArena: 0 dano + debuff Cego 3 rodadas com repeatSave CON (sem concentração — diferencial vs Hold Person).',
            afterAttackEnemyDebuff: { id: 'blindness', turns: 3, n: 'Cego', ico: '‍', atkDisadvantage: true, targetedAdvantage: true, repeatSave: { ability: 'con' }, dndCondition: 'Cego (PHB App.A — Cegueira)' } },
        /* V1.7 Sprint-7 (2026-04-21 closeout) — Raio Doentio (Ray of Sickness PHB p.271) Mago nv 1.
           2d8 veneno + TR CON ou ENVENENADO (Poisoned PHB App.A) — atk disadv + ability disadv. */
        { n: 'Raio Doentio', ico: '', cost: 2, kind: 'attack', dmgType: 'poison',
            /* V1.7 Sprint-17 (2026-04-21 QA PHB p.271) — Ray of Sickness upcast:
               +1d8 per slot above 1st. Base 2d8, nv 3 (2nd) 3d8, nv 5 (3rd) 4d8, etc. */
            desc: 'Raio venenoso (PHB p.271): 2d8 veneno (escala +1d8/slot) + TR CON ou ENVENENADO 1 rodada.',
            damageSpec: { n: 2, d: 8, scaleByCasterLevel: { breakpoints: [[3, 1], [5, 2], [7, 3], [9, 4]] } }, save: { ability: 'con' },
            helpDnd5e: 'Raio Doentio / Ray of Sickness (PHB p.271 — Mago nv 1): ataque de magia à distância. Em acerto: 2d8 veneno; alvo faz TR CON ou fica ENVENENADO até o fim do próximo turno.\nEnvenenado (PHB Appendix A): desvantagem em rolagens de ataque e testes de habilidade.\nArena: 2d8 poison + debuff Envenenado 3 rodadas + repeatSave CON + atkDisadvantage (poisoned).',
            /* V1.7 Sprint-17 (2026-04-21 QA PHB audit) — Raio Doentio duração:
               PHB p.271 "Poisoned until end of target's next turn" = ~1 rodada, não 3.
               Corrigido: turns 3 → 1. */
            afterAttackEnemyDebuff: { id: 'ray_sickness_poisoned', turns: 1, n: 'Envenenado', ico: '', atkDisadvantage: true, dndCondition: 'Envenenado (PHB App.A — Raio Doentio, until end of next turn)' } },
        /* V1.7 Sprint-16 (2026-04-21 closeout review) — Pressa (Haste PHB p.251):
           Mago/Feiticeiro nv 3. Self-buff: +2 CA + vantagem TR DES + velocidade dobrada + 1 atk extra. Concentração. */
        { n: 'Pressa', ico: '', cost: 3, kind: 'buff', minLevel: 5,
            desc: 'Self-buff (PHB p.251): +2 CA + vantagem DES + vantagem atk 3 rodadas (concentração).',
            helpDnd5e: 'Pressa / Haste (PHB p.251 — Mago/Feiticeiro nv 3): 1 action; concentração 1 min. Alvo (criatura tocada, caster stub) ganha velocidade dobrada, +2 CA, vantagem em TRs DES e 1 ataque adicional a cada turno (só Attack, Dash, Disengage, Hide, ou Use an Object). Quando acaba, alvo fica letárgico 1 turno (skipTurn — não modelado).\nArena stub: buffSim atkAdvantage + acBonus:2 + concentration. Ataque extra não modelado (simplificação — vantagem aproxima poder).',
            /* V1.7 Sprint-17 Ronda 12 (2026-04-21 QA PHB p.251) — Haste agora com
               extra attack REAL (PHB RAW) em vez de atkAdvantage stub.
               Antes: atkAdvantage:true (stub — representava poder extra como vantagem).
               Agora: removido atkAdvantage, sim detecta buff 'haste' em confirmAndAttack
               e adiciona +1 ataque por turno (PHB: "one additional action... Attack"). */
            buffSim: { id: 'haste', vfx: 'bless', decOn: 'round', turns: 3, kind: 'buff', condName: 'Pressa', condRule: 'PHB p.251 — +2 CA + 1 ataque extra/turno + concentração.', acBonus: 2, concentration: true } },
        /* V1.7 Sprint-16 (2026-04-21 closeout review) — Lentidão (Slow PHB p.277):
           Mago/Feiticeiro nv 3. AOE cubo 12m — TR SAB; falha: speed/2, -2 CA, atk disadv, 1 ação ou BA por turno. */
        { n: 'Lentidão', ico: '', cost: 3, kind: 'attack', minLevel: 5, dmgType: 'psychic',
            desc: 'AOE (PHB p.277): cubo 12m — TR SAB ou LENTO 3 rodadas.',
            damageSpec: { n: 0, d: 0 }, save: { ability: 'wis' }, multiTarget: true,
            helpDnd5e: 'Lentidão / Slow (PHB p.277 — Mago/Feiticeiro nv 3): 1 action; concentração 1 min. Cubo 12m, até 6 criaturas. TR SAB; em falha: velocidade/2, -2 CA, -2 TR DES, atk com DESVANTAGEM, 1 ação OU BA (não ambos) por turno. TR SAB fim de cada turno.\nArena stub: 0 dano + debuff speed0 + atkDisadvantage + skipBonus 3 rodadas + repeatSave SAB + concentration.',
            afterAttackEnemyDebuff: { id: 'slow_spell', turns: 3, n: 'Lento', ico: '', atkDisadvantage: true, skipBonus: true, speed0: true, repeatSave: { ability: 'wis' }, concentration: true, dndCondition: 'Lento (PHB — Slow)' } },
        /* V1.7 Sprint-16 (2026-04-21 closeout review) — Invisibilidade Maior (Greater Invisibility PHB p.250):
           Mago/Bardo/Feiticeiro nv 4. Self-buff (ou target) — como Invisibility mas NÃO quebra ao atacar/castar. */
        { n: 'Invisibilidade Maior', ico: '', cost: 4, kind: 'buff', minLevel: 7,
            desc: 'Self (PHB p.250): INVISÍVEL + atk adv + atacantes disadv 3 rodadas (não quebra).',
            helpDnd5e: 'Invisibilidade Maior / Greater Invisibility (PHB p.250 — Mago/Bardo/Feiticeiro nv 4): 1 action; concentração 1 min. Alvo fica invisível (como Invisibility PHB p.255), mas o efeito NÃO termina ao atacar ou castar magia. Versão superior da Invisibility nv 2.\nArena: buffSim atkAdvantage + attackerDisadvantage + concentration. SEM endOnAttack (diferencial vs Invisibility nv 2).',
            buffSim: { id: 'greater_invisibility', vfx: 'arcane', decOn: 'round', turns: 3, kind: 'buff', condName: 'Invisível (Maior)', condRule: 'PHB p.250 — atk adv + atacantes disadv. NÃO quebra ao atacar.', atkAdvantage: true, attackerDisadvantage: true, concentration: true, dndCondition: 'Invisível (PHB App.A — Greater Invisibility)' } },
        /* V1.7 Sprint-16 (2026-04-21 closeout review) — Palavra do Poder: Atordoar (Power Word Stun PHB p.266):
           Mago/Bardo/Feiticeiro/Bruxo nv 8. Alvo com ≤150 HP fica ATORDOADO sem save. Stub: aplica skipTurn 3 rodadas. */
        /* V1.7 Sprint-17 (2026-04-21 QA PHB p.266) — Power Word Stun com HP threshold:
           Só funciona em alvos com ≤150 HP. Antes stubbava sem check de threshold. */
        { n: 'Palavra Poder: Atordoar', ico: '', cost: 7, kind: 'attack', minLevel: 15, dmgType: 'psychic',
            desc: 'Alvo ≤150 HP (PHB p.266): fica ATORDOADO 3 rodadas (sem TR).',
            damageSpec: { n: 0, d: 0 }, hpThreshold: 150,
            helpDnd5e: 'Palavra do Poder: Atordoar / Power Word Stun (PHB p.266 — Mago/Bardo/Feiticeiro/Bruxo nv 8): 1 action; alvo com **≤150 HP atual** fica ATORDOADO. Alvo faz TR CON fim de cada turno; sucesso termina. Alvos com >150 HP: **SEM EFEITO**.\nV1.7 Sprint-17 (2026-04-21): flag hpThreshold:150 adicionada + handler em playTurn valida antes de aplicar debuff (PHB-fiel).\nArena: aplica debuff Atordoado 3 rodadas se target.hp ≤ 150, senão nada.',
            afterAttackEnemyDebuff: { id: 'power_word_stun', turns: 3, n: 'Atordoado (Palavra)', ico: '', skipTurn: true, targetedAdvantage: true, autoFailStrDex: true, repeatSave: { ability: 'con' }, dndCondition: 'Atordoado (PHB — Power Word Stun)' } },
        /* V1.7 Sprint-15 (2026-04-21 closeout review) — Graxa (Grease PHB p.249):
           Mago nv 1. AOE quadrado 3m; criaturas em pé fazem TR DES ou Prone; também difícil. */
        { n: 'Graxa', ico: '', cost: 2, kind: 'attack', dmgType: 'acid',
            desc: 'AOE (PHB p.249): TR DES ou prostrado + terreno difícil 1 min.',
            damageSpec: { n: 0, d: 0 }, save: { ability: 'dex' }, multiTarget: true,
            helpDnd5e: 'Graxa / Grease (PHB p.249 — Mago/Artificer nv 1): 1 action; AOE 3m². Criaturas em pé na área fazem TR DES; em falha caem PROSTRADAS. Terreno difícil 1 min.\nArena: 0 dano + debuff Prone (atkDisadvantage) 2 rodadas em falha no TR DES. Terreno difícil não modelado (sem grid).',
            afterAttackEnemyDebuff: { id: 'grease_prone', turns: 2, n: 'Prostrado (Graxa)', ico: '', atkDisadvantage: true, prone: true, dndCondition: 'Prostrado (PHB App.A — Grease)' } },
        /* V1.7 Sprint-15 (2026-04-21 closeout review) — Hipnose (Hypnotic Pattern PHB p.252):
           Mago/Bardo/Feiticeiro/Bruxo nv 3. AOE cubo 9m; TR SAB ou Incapacitated. */
        { n: 'Hipnose', ico: '', cost: 3, kind: 'attack', minLevel: 5, dmgType: 'psychic',
            desc: 'AOE (PHB p.252): cubo 9m — TR SAB ou INCAPACITADO 3 rodadas.',
            damageSpec: { n: 0, d: 0 }, save: { ability: 'wis' }, multiTarget: true,
            helpDnd5e: 'Hipnose / Hypnotic Pattern (PHB p.252 — Mago/Bardo/Feiticeiro/Bruxo nv 3): 1 action; cubo 9m. Criaturas na área fazem TR SAB; em falha, INCAPACITADAS + velocidade 0 + encantadas. Efeito quebra se sofrer dano ou alguém usar ação pra acordar.\nArena: 0 dano + debuff Incapacitated (skipTurn + speed0) 3 rodadas + repeatSave SAB + wakeOnDamage.',
            /* V1.7 Sprint-17 Ronda 16 (2026-04-21 QA PHB p.252) — Hypnotic Pattern
               é concentração 1 min. Adicionada flag pra quebrar se caster perder conc. */
            afterAttackEnemyDebuff: { id: 'hypnotic_pattern', turns: 3, n: 'Incapacitado (Hipnose)', ico: '', skipTurn: true, speed0: true, wakeOnDamage: true, repeatSave: { ability: 'wis' }, concentration: true, dndCondition: 'Incapacitado (PHB App.A — Hypnotic Pattern)' } },
        /* V1.7 Sprint-15 (2026-04-21 closeout review) — Nuvem Tóxica (Cloudkill PHB p.231):
           Mago nv 5. AOE esfera 6m 5d8 poison TR CON metade. Concentração 10 min. */
        /* V1.7 Sprint-17 (2026-04-21 QA PHB p.231) — Cloudkill upcast +1d8/slot acima 5º. */
        { n: 'Nuvem Tóxica', ico: '', cost: 4, kind: 'attack', minLevel: 9, dmgType: 'poison',
            desc: 'AOE (PHB p.231): 5d8 veneno (escala +1d8/slot acima 5º). TR CON metade (concentração).',
            damageSpec: { n: 5, d: 8, scaleByCasterLevel: { breakpoints: [[11, 1], [13, 2], [15, 3], [17, 4]] } }, save: { ability: 'con' }, multiTarget: true,
            helpDnd5e: 'Nuvem Tóxica / Cloudkill (PHB p.231 — Mago nv 5): 1 action; concentração 10 min. Névoa venenosa esfera 6m raio. Criaturas que entrarem OU começarem turno fazem TR CON; 5d8 veneno em falha, metade em sucesso. Nuvem move 3m/turno afastando do caster.\nUpcast: +1d8 por nível acima do 5º.\nArena: multiTarget + save + damageSpec + concentration flag (movimento não modelado).' },
        /* V1.7 Sprint-15 (2026-04-21 closeout review) — Raio de Enfraquecimento (Ray of Enfeeblement PHB p.272):
           Mago/Bruxo nv 2. Ranged spell atk; em acerto alvo sofre metade do dano em atk FOR (stub: atkDisadv). */
        { n: 'Raio de Enfraquecimento', ico: '', cost: 2, kind: 'attack', minLevel: 3, dmgType: 'necrotic', ranged: true,
            desc: 'Ranged (PHB p.272): atk magia; em acerto alvo com atk disadv (concentração).',
            damageSpec: { n: 0, d: 0 },
            helpDnd5e: 'Raio de Enfraquecimento / Ray of Enfeeblement (PHB p.272 — Mago/Bruxo nv 2): 1 action; concentração 1 min. Atk magia ranged; em acerto alvo sofre METADE do dano em ataques com FOR. Ao fim de cada turno, TR CON; sucesso termina efeito.\nArena stub: atk ranged + afterAttackEnemyDebuff atkDisadvantage 3 rodadas + repeatSave CON + concentration. Simplificação: atkDisadv aproxima "half dmg STR atks".',
            afterAttackEnemyDebuff: { id: 'enfeeblement', turns: 3, n: 'Enfraquecido', ico: '', atkDisadvantage: true, repeatSave: { ability: 'con' }, concentration: true, dndCondition: 'Enfraquecido (PHB — Ray of Enfeeblement)' } },
        /* V1.7 Sprint-14 (2026-04-21 closeout review) — Névoa Ardente (Scorching Ray PHB p.273):
           Mago nv 2. 3 raios, cada 2d6 fogo. Reusa magicMissiles pattern (autoHit multi-dart). */
        /* V1.7 Sprint-17 Ronda 18 (2026-04-21 QA PHB p.273) — Scorching Ray RAW:
           3 attack rolls separados, cada 2d6 fogo on hit. Upcast +1 ray/slot.
           Antes era stub autoHit magicMissiles — agora é PHB-correct. */
        { n: 'Névoa Ardente', ico: '', cost: 2, kind: 'attack', minLevel: 3, dmgType: 'fire', ranged: true,
            desc: 'Raios (PHB p.273): 3 atk rolls separados, cada 2d6 fogo em acerto. Escala +1 raio/slot.',
            damageSpec: { n: 2, d: 6 }, multiRayAttack: 3, multiRayAttackScale: true,
            helpDnd5e: 'Névoa Ardente / Scorching Ray (PHB p.273 — Mago/Feiticeiro nv 2): 1 action; 3 raios de fogo. Cada raio é **ataque de magia ranged separado**; em acerto, 2d6 fogo.\nUpcast: +1 raio por nível acima do 2º.\nArena PHB RAW (V1.7 Sprint-17 Ronda 18): cada raio rola d20 vs CA independentemente. Nv 3 (2nd slot): 3 raios, nv 5 (3rd): 4, nv 7 (4th): 5, nv 9 (5th): 6, nv 11+ (6th+): 7.' },
        /* V1.7 Sprint-14 (2026-04-21 closeout review) — Onda de Trovão (Thunderwave PHB p.282):
           Mago/Druida/Bardo/Feiticeiro nv 1. Cubo 15ft AOE 2d8 thunder TR CON metade + empurra 3m. */
        /* V1.7 Sprint-17 (2026-04-21 QA PHB p.282) — Thunderwave upcast:
           +1d8 per slot above 1st. */
        { n: 'Onda de Trovão', ico: '', cost: 2, kind: 'attack', dmgType: 'thunder',
            desc: 'Cubo (PHB p.282): 2d8 trovão AOE, escala +1d8 por slot acima do 1º. TR CON metade + empurrão.',
            damageSpec: { n: 2, d: 8, scaleByCasterLevel: { breakpoints: [[3, 1], [5, 2], [7, 3], [9, 4], [11, 5], [13, 6], [15, 7], [17, 8]] } }, save: { ability: 'con' }, multiTarget: true,
            helpDnd5e: 'Onda de Trovão / Thunderwave (PHB p.282 — Mago/Druida/Bardo/Feiticeiro nv 1): 1 action; cubo 4,5m origem você. Criaturas e objetos soltos fazem TR CON; em falha, 2d8 trovão + empurra 3m, em sucesso metade + sem empurrão.\nUpcast: +1d8 por nível acima do 1º.\nArena: reusa multiTarget + save + damageSpec. Empurrão não modelado (sem grid).' },
        /* V1.7 Sprint-14 (2026-04-21 closeout review) — Flecha de Ácido (Melf's Acid Arrow PHB p.258):
           Mago nv 2. Ranged spell atk 4d4 acid + 2d4 no próximo turno. Reusa damageSpec + ranged. */
        /* V1.7 Sprint-17 Ronda 16 (2026-04-21 QA PHB p.258) — Acid Arrow upcast:
           +1d4 per slot above 2nd. Nv 5 (3rd): 5d4, nv 7 (4th): 6d4, etc. */
        { n: 'Flecha de Ácido', ico: '', cost: 2, kind: 'attack', minLevel: 3, dmgType: 'acid', ranged: true,
            desc: 'Ranged (PHB p.258): 4d4 ácido (escala +1d4/slot acima 2º) + 2d4 DOT próximo turno (stub).',
            damageSpec: { n: 4, d: 4, scaleByCasterLevel: { breakpoints: [[5, 1], [7, 2], [9, 3], [11, 4], [13, 5], [15, 6], [17, 7]] } },
            helpDnd5e: 'Flecha de Ácido de Melf / Melf\'s Acid Arrow (PHB p.258 — Mago nv 2): 1 action; atk magia ranged. Em acerto, 4d4 acid + 2d4 acid no FIM do próximo turno (miss: metade imediato, sem DOT).\nUpcast: +1d4 imediato + 1d4 DOT por nível acima do 2º.\nArena stub: damageSpec 4d4 acid ranged. DOT não modelado (stub inicial).' },
        /* V1.7 Sprint-14 (2026-04-21 closeout review) — Cone de Frio (Cone of Cold PHB p.236):
           Mago nv 5. Cone 60ft 8d8 cold TR CON metade. Reusa multiTarget + save. */
        /* V1.7 Sprint-17 (2026-04-21 QA PHB p.236) — Cone of Cold upcast:
           +1d8 per slot above 5th. Nv 9 (5th) base 8d8, nv 11 (6th) 9d8, etc. */
        { n: 'Cone de Frio', ico: '', cost: 4, kind: 'attack', minLevel: 9, dmgType: 'cold',
            desc: 'Cone (PHB p.236): 8d8 frio AOE, escala +1d8 por slot acima do 5º. TR CON metade.',
            damageSpec: { n: 8, d: 8, scaleByCasterLevel: { breakpoints: [[11, 1], [13, 2], [15, 3], [17, 4]] } }, save: { ability: 'con' }, multiTarget: true,
            helpDnd5e: 'Cone de Frio / Cone of Cold (PHB p.236 — Mago/Feiticeiro nv 5): 1 action; cone 18m. Criaturas na área fazem TR CON; 8d8 cold em falha, metade em sucesso. Criaturas mortas por este spell viram estátuas de gelo.\nUpcast: +1d8 por nível acima do 5º.\nArena: reusa multiTarget + save + damageSpec (mesmo pipeline AOE).' },
        /* V1.7 Sprint-13 (2026-04-21 closeout review) — Mãos Flamejantes (Burning Hands PHB p.220):
           Mago nv 1. Cone 15ft AOE 3d6 fogo; TR DES metade. Reusa multiTarget+save pattern. */
        /* V1.7 Sprint-17 (2026-04-21 QA PHB p.220) — Burning Hands upcast:
           +1d6 per slot above 1st. Full caster: nv 3 (2nd) 4d6, nv 5 (3rd) 5d6, etc. */
        { n: 'Mãos Flamejantes', ico: '', cost: 2, kind: 'attack', dmgType: 'fire',
            desc: 'Cone (PHB p.220): 3d6 fogo AOE, escala +1d6 por slot acima do 1º. TR DES metade.',
            damageSpec: { n: 3, d: 6, scaleByCasterLevel: { breakpoints: [[3, 1], [5, 2], [7, 3], [9, 4], [11, 5], [13, 6], [15, 7], [17, 8]] } }, save: { ability: 'dex' }, multiTarget: true,
            helpDnd5e: 'Mãos Flamejantes / Burning Hands (PHB p.220 — Mago/Feiticeiro nv 1): 1 action; cone de fogo 4,5m (15ft). Cada criatura na área faz TR DES; 3d6 fogo em falha, metade em sucesso. Objetos inflamáveis pegam fogo.\nUpcast: +1d6 por nível acima do 1º.\nArena: reusa padrão multiTarget + save + damageSpec (mesmo pipeline da Bola de Fogo, menor dmg).' },
        /* V1.7 Sprint-13 (2026-04-21 closeout review) — Raio Relampejante (Lightning Bolt PHB p.257):
           Mago nv 3. Linha 30m AOE 8d6 lightning; TR DES metade. Reusa multiTarget+save. */
        /* V1.7 Sprint-17 (2026-04-21 QA PHB p.257) — Lightning Bolt upcast:
           +1d6 per slot acima do 3º. Mesmo padrão de Bola de Fogo. */
        { n: 'Raio Relampejante', ico: '', cost: 3, kind: 'attack', minLevel: 5, dmgType: 'lightning',
            desc: 'Linha (PHB p.257): 8d6 elétrico AOE, escala +1d6 por slot acima do 3º. TR DES metade.',
            damageSpec: { n: 8, d: 6, scaleByCasterLevel: { breakpoints: [[7, 1], [9, 2], [11, 3], [13, 4], [15, 5], [17, 6]] } }, save: { ability: 'dex' }, multiTarget: true,
            helpDnd5e: 'Raio Relampejante / Lightning Bolt (PHB p.257 — Mago/Feiticeiro nv 3): 1 action; linha 30m × 1,5m. Cada criatura na linha faz TR DES; 8d6 elétrico em falha, metade em sucesso. Objetos inflamáveis pegam fogo.\nUpcast: +1d6 por nível acima do 3º.\nArena: reusa multiTarget + save + damageSpec (mesmo fluxo da Bola de Fogo).' },
        /* V1.7 Sprint-13 (2026-04-21 closeout review) — Choque Elétrico (Shocking Grasp PHB p.276):
           Mago cantrip. Melee spell atk 1d8 lightning. Alvo não pode usar reação até próximo turno.
           Reusa damageSpec + scale:cantrip + afterAttackEnemyDebuff (com skipBonus stub pra reação). */
        { n: 'Choque Elétrico', ico: '', cost: 0, kind: 'attack', dmgType: 'lightning',
            desc: 'Truque (PHB p.276): ataque de magia toque — 1d8 elétrico + alvo perde reação próxima.',
            damageSpec: { n: 1, d: 8 }, scale: 'cantrip',
            helpDnd5e: 'Choque Elétrico / Shocking Grasp (PHB p.276 — Mago/Feiticeiro cantrip): 1 action; ataque de magia corpo-a-corpo (com vantagem vs criatura usando armadura de metal). Em acerto, 1d8 elétrico + alvo NÃO pode tomar REAÇÃO até o início do próximo turno.\nEscala cantrip: 2d8 nv5, 3d8 nv11, 4d8 nv17.\nArena stub: 1d8 lightning + debuff reactionSpent:true (impede reação via skipBonus + flag custom noReaction). Sem hook dedicado pra reação bloqueada ainda — stub documental.',
            afterAttackEnemyDebuff: { id: 'shocking_grasp_noreact', turns: 1, n: 'Sem Reação', ico: '', skipBonus: true, dndCondition: 'Sem Reação (Shocking Grasp — PHB p.276)' } },
        /* V1.7 Sprint-7 (2026-04-21 closeout) — Transmutar em Pedra (Flesh to Stone PHB p.247) Mago nv 6.
           TR CON (repetido 3x — falha 3 vezes vira PETRIFICADO); arena simplified: 1 TR falhado → Petrificado.
           Petrificado PHB App.A: incapacitated + speed0 + unaware + atacantes adv + auto-fail STR/DEX + resistance all dmg. */
        { n: 'Transmutar em Pedra', ico: '', cost: 5, kind: 'attack', minLevel: 11, dmgType: 'necrotic',
            desc: 'Transmuta alvo em pedra (PHB p.247): TR CON ou PETRIFICADO 3 rodadas.',
            damageSpec: { n: 0, d: 0 }, save: { ability: 'con' },
            helpDnd5e: 'Transmutar em Pedra / Flesh to Stone (PHB p.247 — 6º nível): concentração até 1 min. Alvo carne-e-osso faz TR CON; em falha fica Contido. Ao final de cada turno deve repetir TR — 3 falhas consecutivas = PETRIFICADO (permanente sem dispel). 3 sucessos consecutivos = magia termina.\nPetrificado (PHB App.A): incapacitado, não pode ver/mover, atacantes com vantagem, auto-falha TRs FOR/DES, RESISTÊNCIA a TODO dano, imune a veneno/doença.\nArena stub: 0 dano + debuff Petrificado 3 rodadas (compressão) + repeatSave CON + concentração.',
            afterAttackEnemyDebuff: { id: 'flesh_to_stone', turns: 3, n: 'Petrificado', ico: '', skipTurn: true, speed0: true, targetedAdvantage: true, autoFailStrDex: true, resistAllDmg: true, repeatSave: { ability: 'con' }, concentration: true, dndCondition: 'Petrificado (PHB App.A — Flesh to Stone)' } },
        /* V1.6 (2026-05-16) — Mão Arcana / Bigby's Hand (PHB p.226 — Mago nv 9 / 5th-level
           spell). Conjura mão arcana flutuante. Stub: usa MESMA infra de Spiritual Weapon
           (kind: 'summon_attached') com Clenched Fist como ataque BA recorrente. Difere
           de SW: cast é AÇÃO (não BA), dano maior (2d8 force base — PHB original 4d8),
           dura 1 min/concentração. Upcast: +2d8 a cada nível acima 5º. NÃO modelado:
           Forceful Hand (push), Grasping Hand (grapple), Interposing Hand (cover) —
           só Clenched Fist neste stub. */
        { n: 'Mão Arcana', ico: '', cost: 5, kind: 'summon_attached', minLevel: 9,
            desc: 'Conjura mão arcana (PHB p.226). Ação BÔNUS: Punho Cerrado — 2d8 force vs CA. 10 rounds, concentração.',
            helpDnd5e: 'Mão Arcana / Bigby\'s Hand (PHB p.226 — Mago nv 9 / 5th-level spell): 1 action; concentração até 1 min. Conjura mão espectral média (5x5 ft) em 36m que age na sua iniciativa. PHB original: HP = caster max HP, CA 20, STR 26, FLY 60ft. 4 ações disponíveis via BA: ' +
                       '(1) Punho Cerrado (Clenched Fist): atk mágico vs CA, 4d8 force; ' +
                       '(2) Mão Forçosa (Forceful Hand): empurra alvo até 1,5m; ' +
                       '(3) Mão Garra (Grasping Hand): grapple; ' +
                       '(4) Mão Interpoente (Interposing Hand): meia cobertura (+2 CA) pra você. ' +
                       'Upcast: +2d8 dano + 10 HP por nível acima do 5º. ' +
                       'ARENA STUB (2026-05-16): reusa Spiritual Weapon infra (summon_attached). ' +
                       'Só Clenched Fist modelado (BA repetir cada round): 2d8 force base (stub; ' +
                       'PHB RAW é 4d8 mas mantemos 2d8 pra balance e progressão clara via upcast). ' +
                       'Dura 10 rounds. Concentração ATIVA (pode quebrar). Modificações futuras: ' +
                       'modos Push/Grasp/Interpose como ações BA alternativas.',
            dndCondition: 'Mão Arcana ativa (1 min, concentração)',
            summonSpec: {
                id: 'arcane_hand',
                name: 'Mão Arcana',
                ico: '',
                duration: 10,
                attackKind: 'spell',
                atkAttr: 'int',
                damageSpec: { n: 2, d: 8, flat: 0, addCasterMod: true,
                    /* Mão Arcana 5th-level spell — upcast +2d8/slot acima do 5º.
                       Mago full caster: nv 9 (5th) 2d8 · nv 11 (6th) 4d8 · nv 13 (7th)
                       6d8 · nv 15 (8th) 8d8 · nv 17 (9th) 10d8. PHB RAW seria 4d8 base,
                       arena usa 2d8 pra equilibrar com Spiritual Weapon (1d8 base). */
                    scaleByCasterLevel: { breakpoints: [[11, 2], [13, 4], [15, 6], [17, 8]] } },
                dmgType: 'force',
                concentration: true
            } }
      ] },
    { cls: 'Ladino',    hp: [22, 30], ac: [14, 15], atk: [4, 6], die: 8,  dex: [16, 18], ico: '', dmgMod: 3, attr: 'DEX',
      res: { type: 'energia', name: 'Energia', ico: '', max: 6 },
      skills: [
        { n: 'Ataque Furtivo', ico: '', cost: 0, kind: 'attack', desc: 'Golpe preciso em um ponto vital. Acumula dados extras de dano conforme você sobe de nível (1d6 no nível 1, 2d6 no 3, 3d6 no 5…).',
            damageSpec: { n: 'auto', d: 6 },
            sneakAttack: true,
            helpDnd5e: 'Referência: Ataque Furtivo (PHB p.96): (nível+1)//2 d6 ao acertar com arma furtiva se tiver vantagem OU se outro inimigo do alvo estiver a 1,5 m dele.\nNível 1: 1d6 · 3: 2d6 · 5: 3d6 · 7: 4d6 · 9: 5d6 · … · 19: 10d6.\nNo arena: damageSpec.n = "auto" → motor calcula por nível; crítico dobra os dados.' },
        /* V1.7 Sprint-10 (2026-04-21 closeout) — Ataque Assassino (Assassinate PHB p.97):
           Subclass Ladino Assassin nv 3. Passive: ataques no 1º turno de combate contra
           inimigos que ainda não agiram são AUTO-CRIT. Arena stub: combatOnceId='assassinate'
           limita a 1 uso/combate; enquanto ativo, próximo ataque tem critRange:14 (crit em
           14-20 em vez de só 20) + atkAdvantage. Representa surpresa tática. */
        /* V1.7 Sprint-17 (2026-04-21 QA PHB p.97) — Assassinate Subclass nv 3+. */
        { n: 'Ataque Assassino', ico: '', cost: 2, kind: 'buff', bonus: true, minLevel: 3,
            requiresSubclass: 'assassin', /* REVIEW-#90 [8/17/25]: exclusiva do Assassino (PHB p.97) */
            combatOnceId: 'assassinate',
            desc: 'Subclass Assassin PHB p.97 (1x/combate): próximo ataque com vantagem + crit em 14-20.',
            helpDnd5e: 'Assassinato / Assassinate (PHB p.97 — Ladino Assassino nv 3): vantagem em atk vs criaturas que ainda não agiram no combate. Qualquer acerto em criatura SURPRESA é crítico automático.\nV1.7 Sprint-10 (2026-04-21 closeout): arena stub como AÇÃO BÔNUS 1x/combate — aplica buff atkAdvantage + critRange:14 (crit em 14-20) no próximo ataque. Representa surpresa tática condensada.',
            buffSim: { id: 'assassinate', vfx: 'shadow', decOn: 'after_npc', turns: 1, kind: 'buff', condName: 'Ataque Assassino', condRule: 'PHB p.97 — vantagem + crit range estendido 1 atk.', atkAdvantage: true, critRange: 14 } },
        /* V1.7 Sprint-17 (2026-04-21 QA audit #2) — Esquiva RE-ADICIONADA ao sim.
           PHB p.192 Dodge action — skill pró-ativa com acBonus:2 + attackAdvantage 2 turnos.
           Removida acidentalmente no Sprint 9 quando renomeei a outra pra Esquiva Sobrenatural.
           São skills DIFERENTES: Esquiva = Dodge action (pró-ativa); Esquiva Sobrenatural = Uncanny Dodge (reação). */
        /* V1.7 Sprint-17 FIX (2026-04-21) — Esquiva PHB-correta: Dodge action NÃO dá atk adv
           pro player. PHB p.192 é claro: atacantes contra o player têm DESVANTAGEM, e player
           tem vantagem em TRs de DES (arena não modela saves DES regularmente — foca no que
           aparece em combate: inimigos atacando com desvantagem). */
        { n: 'Esquiva', ico: '', cost: 1, kind: 'buff', desc: 'Ação Esquivar (PHB p.192): atacantes com DESVANTAGEM até o início do seu próximo turno.',
            helpDnd5e: 'Ação Esquivar / Dodge (PHB p.192 — qualquer classe): ação padrão de combate. Até o início do seu próximo turno:\n• Atacantes visíveis têm DESVANTAGEM em ataques contra você\n• Você tem VANTAGEM em TRs de DES (não modelado em arena de combate direto)\n\nArena: buffSim enemyAtkDisadvantage (PHB-correto) por 1 fase NPC (= until start of next turn). Não dá atk adv pro player — isso seria erro RAW.\nDiferente de Esquiva Sobrenatural (Ladino nv 5 Uncanny Dodge — reação halve dmg).',
            buffSim: { id: 'esquiva', vfx: 'dodge', decOn: 'after_npc', turns: 1, kind: 'buff', condName: 'Esquivar', condRule: 'PHB p.192 — Dodge action: atacantes com desvantagem até o início do seu próximo turno.', enemyAtkDisadvantage: true, dndCondition: 'Esquivar (atacantes com desvantagem)' } },
        /* V1.7 Sprint-9 (2026-04-21 closeout) — Esquiva Sobrenatural PHB-fiel REAL (PHB p.96):
           REAÇÃO quando atacante visível acerta → metade do dano. Agora `reactionOnly:true` —
           skill SÓ trigga via reaction_prompt pós-hit (igual Escudo Arcano/Repreensão Infernal).
           Flag `uncannyDodgeReaction:true` marca o tipo (pro hook distinguir de Shield). */
        /* V1.7 Sprint-17 (2026-04-21 QA PHB p.96) — Uncanny Dodge Ladino nv 5+. */
        { n: 'Esquiva Sobrenatural', ico: '', cost: 1, kind: 'buff', reactionOnly: true, uncannyDodgeReaction: true, minLevel: 5,
            desc: 'REAÇÃO (PHB p.96, nv 5+): ao ser acertado por ataque visível — metade do dano.',
            helpDnd5e: 'Esquiva Sobrenatural / Uncanny Dodge (PHB p.96 — Ladino nv 5): **REAÇÃO** quando atacante visível acerta você; você sofre METADE do dano desse ataque (arredondado pra baixo).\nNão reduz dano de TR (áreas) — só de ataques diretos vs CA.\nV1.7 Sprint-9 (2026-04-21 closeout): reactionOnly:true real — prompt `uncanny` em `showShieldReactionPromptLocal` + hook em `playTurn` pós-hit pré-dano reduz `total` ÷ 2. Consome a reação (não se reseta até próximo turno).',
            /* No buffSim — efeito é aplicado inline no playTurn pelo hook */ },
        { n: 'Disparo Rápido', ico: '', cost: 2, kind: 'attack', desc: 'Dois disparos rápidos à distância, 1d8 + DEX cada.',
            damageSpec: { n: 2, d: 8 },
            helpDnd5e: 'Referência: Ataque Extra com arma de disparo / combate com duas armas (PHB).\nCada golpe: rolagem vs CA independente; em cada acerto, 1d8 + DEX neste fluxo.\nCríticos e cobertura seguem regras normais do D&D 5e.' },
        /* V1.7 EFFECT-ADD (2026-04-21) — Passos Silenciosos: +vantagem próximo ataque + 1 CA defensivo */
        { n: 'Passos Silenciosos', ico: '', cost: 1, kind: 'buff', blessSpell: true, targetAlly: true, desc: 'Esconde aliado (ou você): vantagem no próximo ataque + 1 CA defensivo (3 turnos).',
            helpDnd5e: 'Referência: Pass Without Trace (PHB p.264) stub para Ladino — vantagem no próximo ataque (flanqueamento furtivo) + leve bonus defensivo por 3 turnos. Representação simplificada de ocultamento tático.\nV1.7 EFFECT-ADD (2026-04-21): buff era vazio — agora aplica atkAdvantage + acBonus:1.',
            buffSim: { id: 'passos_silenciosos', vfx: 'silent', decOn: 'after_npc', turns: 3, kind: 'buff', condName: 'Passos furtivos', condRule: 'PHB — Vantagem + 1 CA por ocultamento.', atkAdvantage: true, acBonus: 1 } },
        { n: 'Ação Ardilosa', ico: '', cost: 1, kind: 'buff', bonus: true, minLevel: 2, desc: 'Ação bônus (PHB p.96, Ladino nv 2+): Esconder/Desengajar/Correr — traduz em vantagem no próximo ataque.',
            helpDnd5e: 'Ação Ardilosa / Cunning Action (PHB p.96 — Ladino nível 2): **AÇÃO BÔNUS** para Desengajar, Esconder ou Correr (qualquer uma). Neste fluxo: convertida em vantagem no próximo ataque (o efeito tático mais comum após uma ação ardilosa).\nV1.7 (2026-04-21) alinhamento PHB: era sem flag `bonus` — consumia AÇÃO principal (divergência). Agora `bonus:true` libera ação pra atacar no mesmo turno (RAW).\nV1.7 Sprint-17 Ronda 24 (2026-04-21 QA audit PHB p.96): adicionada flag `minLevel: 2` (antes faltava — Ladino nv 1 tinha acesso indevido).',
            buffSim: { id: 'acao_ardilosa', vfx: 'arcane', decOn: 'after_npc', turns: 1, kind: 'buff', condName: 'Ação Ardilosa', condRule: 'PHB p.96 — BA; vantagem no próximo ataque (Desengajar/Esconder/Correr traduzido).', atkAdvantage: true } },
        { n: 'Golpe Mortal', ico: '', cost: 3, kind: 'attack', desc: 'Acerto devastador em ponto vital: 3d6 + DEX de dano perfurante.',
            requiresSubclass: 'assassin', /* REVIEW-#90 [8/17/25]: exclusiva do Assassino (PHB p.97) — paridade c/ motor C3.5 */
            damageSpec: { n: 3, d: 6 }, dmgType: 'piercing',
            helpDnd5e: 'Referência: Assassinar (PHB p.97 — Assassino): crítico automático contra alvo surpreso. Neste fluxo: dado extra de dano (3d6 no lugar do 1d8 + DEX normal) representando o golpe preciso em ponto vulnerável.' },
        /* V1.7 Sprint-17 (2026-04-21 QA PHB p.96) — Evasion Ladino nv 7+. */
        { n: 'Reflexos Evasivos', ico: '', cost: 2, kind: 'buff', minLevel: 7, desc: 'Metade do dano de área nos próximos ataques (2 turnos).',
            shieldSpell: true,
            helpDnd5e: 'Referência: Reflexos Evasivos / Evasão (PHB p.96 — Ladino nível 7): em TR DES contra efeitos em área: sucesso = zero dano; falha = metade do dano.\nNeste fluxo: reduz pela metade o próximo dano físico/mágico recebido por 2 sequências de turnos.',
            /* V1.7 Sprint-17 Ronda 13 (2026-04-21 QA PHB p.96) — Evasion PHB RAW:
               só DEX save area. Antes era halfDmg (stub que reduzia qualquer dano).
               Agora halfDmgDexSaveOnly: 0 dano em sucesso DEX, metade em falha DEX.
               Outros ataques (melee direto, save não-DEX) NÃO ganham redução. */
            buffSim: { id: 'reflexos_evasivos', vfx: 'dodge', decOn: 'after_npc', turns: 2, kind: 'buff', condName: 'Reflexos Evasivos', condRule: 'PHB p.96 — Evasão: 0 dano em sucesso TR DES área; metade em falha.', halfDmgDexSaveOnly: true } }
      ] },
    { cls: 'Clérigo',   hp: [24, 32], ac: [15, 17], atk: [4, 6], die: 8,  dex: [10, 12], ico: '', dmgMod: 2, attr: 'STR',
      res: { type: 'mp',      name: 'Mana',    ico: '', max: 9 },
      skills: [
        /* V1.7 Sprint-17 (2026-04-21 QA PHB audit) — Cura (Cure Wounds PHB p.223):
           PHB RAW 1º nível: 1d8 + spellcasting mod. Antes era 2d8+3 (forte demais em
           nv 1). Agora: 1d8+3 base (3 = WIS mod stub), +1d8/4 níveis (simula upcast). */
        /* V1.7 Sprint-17 (2026-04-21 QA PHB p.223) — usa useCastingMod:true pra
           calcular SAB mod dinâmicamente do actor (antes era flat:3 stub). */
        { n: 'Cura', ico: '', cost: 3, kind: 'heal', desc: 'Toque sagrado (PHB p.223): 1d8+SAB PV, +1d8 a cada 4 níveis.', healSpec: { n: 1, d: 8, useCastingMod: true, scaleByCasterLevel: { perLevels: 4 } }, healSpell: true,
            helpDnd5e: 'Curar Ferimentos / Cure Wounds (PHB p.223 — 1º nível): 1 action; toque; 1d8 + mod de conjuração SAB. Não afeta construtos/mortos-vivos.\nUpcast: +1d8 por slot acima do 1º.\nArena: 1d8+3 base (3 = WIS mod stub pra Clérigo típico); +1d8 a cada 4 níveis (simula disponibilidade de slots superiores).\nV1.7 Sprint-17 (2026-04-21): era 2d8+3 (divergência PHB) — corrigido pra 1d8 RAW base.' },
        /* V1.7 Sprint-17 Ronda 11 (2026-04-21 QA PHB p.219) — Bless multi-target:
           afeta até 3 criaturas (PHB RAW). Arena: self + até 2 aliados. */
        { n: 'Bênção', ico: '', cost: 2, kind: 'buff', desc: 'Bênção (PHB p.219): +1d4 em rolagens de ataque e TR — até 3 aliados (self + 2 outros).', blessSpell: true, multiTargetBuff: 3,
            helpDnd5e: 'Referência: Bênção (PHB): concentração até 1 minuto; até três alvos no início do turno de cada um somam 1d4 em novas rolagens de ataque ou resistência que fizerem antes do fim do turno.\nPerda de concentração segue PHB (dano, incapacitado, etc.).\nNeste modo: bônus simplificado por alguns turnos de combate.',
            /* V1.7 Sprint-17 Ronda 17 (2026-04-21 QA PHB p.219) — Bless agora
               adiciona +1d4 em saves também (PHB: atk OR save, sim auto). */
            buffSim: { id: 'bless', vfx: 'bless', decOn: 'round', turns: 3, kind: 'buff', condName: 'Bênção', condRule: 'PHB p.219 — Concentração; 1d4 em atk OU TR no turno do alvo.', atkBonusDie: { n: 1, d: 4 }, saveBonusDie: { n: 1, d: 4 }, concentration: true, rollApply: { n: 1, d: 4 } } },
        { n: 'Repreensão Divina', ico: '', cost: 3, kind: 'attack', desc: 'Canalizar dano radiante: ataque vs CA; 3d6 se acertar; sem CD para metade',
            damageSpec: { n: 3, d: 6 },
            helpDnd5e: 'Nome e números são adaptação livre para esta pré-visualização (inspirado em magias de ataque com dano radiante, ex.: Raio Guiador).\nNo D&D 5e, se o efeito exige ataque (arma ou magia), compara-se 1d20 + bônus de ataque com a CA do alvo. Se o total for menor que a CA, o ataque erra e não causa dano. Não é acerto automático.\nO texto “sem esquivar o dano” aqui significa: não há teste de resistência de Destreza (nem outro atributo) para reduzir o dano pela metade depois de acertar — ou aplica os 3d6 radiantes inteiros, ou 0 se errar.\nIsso é diferente de magias que pedem só CD (ex.: Rajada Solar de área) ou de Mísseis Mágicos, que não usam ataque.' },
        /* V1.7 Sprint-17 (2026-04-21 QA PHB p.259) — useCastingMod dinâmico. */
        { n: 'Palavra de Cura', ico: '', cost: 2, kind: 'heal', bonus: true, healTargets: 'self',
            desc: 'Ação bônus (PHB p.259): 1d4+SAB PV à distância (+1d4 a cada 4 níveis).',
            healSpec: { n: 1, d: 4, useCastingMod: true, scaleByCasterLevel: { perLevels: 4 } }, healSpell: true,
            helpDnd5e: 'Palavra de Cura / Healing Word (PHB p.259 — Clérigo/Bardo/Druida nv 1): **AÇÃO BÔNUS**; 18m; 1d4 + mod de conjuração PV. Não funciona em construtos/mortos-vivos.\nUpcast: +1d4 por slot acima do 1º.\nArena: 1d4+3 (3 = WIS mod stub) + escala +1d4/4 níveis.\nV1.7 Sprint-17 (2026-04-21): era 2d4+2 (divergência PHB) — corrigido pra 1d4 RAW base.' },
        /* V1.7 Sprint-16 (2026-04-21 closeout review) — Escudo da Fé (Shield of Faith PHB p.275):
           Clérigo/Paladino nv 1. BA: +2 CA em aliado 10 min (concentração). */
        { n: 'Escudo da Fé', ico: '', cost: 1, kind: 'buff', bonus: true, shieldSpell: true, targetAlly: true,
            desc: 'Ação bônus (PHB p.275): +2 CA em aliado (concentração).',
            helpDnd5e: 'Escudo da Fé / Shield of Faith (PHB p.275 — Clérigo/Paladino nv 1): **AÇÃO BÔNUS**; concentração 10 min. Campo protetor em criatura tocada; +2 CA enquanto durar.\nArena: buffSim acBonus:2 + concentration + targetAlly.',
            buffSim: { id: 'shield_of_faith', vfx: 'sanctuary', decOn: 'round', turns: 3, kind: 'buff', condName: 'Escudo da Fé', condRule: 'PHB p.275 — +2 CA concentração.', acBonus: 2, concentration: true } },
        /* V1.7 Sprint-16 (2026-04-21 closeout review) — Massa de Cura (Mass Healing Word PHB p.259):
           Clérigo/Bardo nv 3. BA heal múltiplos aliados. */
        /* V1.7 Sprint-17 (2026-04-21 QA PHB p.259) — Mass Healing Word useCastingMod dinâmico (WIS/CHA mod). */
        /* V1.7 Sprint-17 Ronda 26 (2026-04-21 QA PHB p.258) — Mass Healing Word upcast:
           +1d4 por slot acima 3º. Clérigo full caster: nv 5 (3rd) 1d4, nv 7 (4th) 2d4,
           nv 9 (5th) 3d4, nv 11 (6th) 4d4, nv 13+ (7th+) 5d4 (cap). Antes era fixo 1d4. */
        { n: 'Massa de Cura', ico: '', cost: 3, kind: 'heal', bonus: true, minLevel: 5,
            desc: 'Ação bônus (PHB p.259): 1d4+SAB PV em todos aliados vivos.',
            healSpec: { n: 1, d: 4, useCastingMod: true, scaleByCasterLevel: { breakpoints: [[7, 1], [9, 2], [11, 3], [13, 4]] } }, healSpell: true, healAllAllies: true,
            helpDnd5e: 'Massa de Cura / Mass Healing Word (PHB p.259 — Clérigo/Bardo nv 3): **AÇÃO BÔNUS**; até 6 criaturas em 18m recuperam 1d4 + mod de conjuração HP.\nUpcast: +1d4 por nível acima do 3º.\nArena: reusa healAllAllies pattern — 1d4+mod em todos aliados vivos.\nV1.7 Sprint-17 (2026-04-21): useCastingMod:true (antes era flat:2 stub).\nV1.7 Sprint-17 Ronda 26 (2026-04-21 QA PHB p.258): scaleByCasterLevel.breakpoints [[7,1],[9,2],[11,3],[13,4]] adicionado (antes fixo 1d4). Nv 5 (3rd slot): 1d4 · nv 7 (4th): 2d4 · nv 9 (5th): 3d4 · nv 11 (6th): 4d4 · nv 13+ (7th+ cap): 5d4.' },
        /* V1.7 Sprint-16 (2026-04-21 closeout review) — Proteção contra Energia (Protection from Energy PHB p.270):
           Clérigo/Druida/Mago/Patrulheiro/Feiticeiro nv 3. Resistência a 1 tipo de dano (concentração). */
        { n: 'Proteção contra Energia', ico: '', cost: 3, kind: 'buff', minLevel: 5,
            desc: 'Self (PHB p.270): resistência a dano (concentração 1h).',
            helpDnd5e: 'Proteção contra Energia / Protection from Energy (PHB p.270 — Clérigo/Druida/Mago/Patrulheiro/Feiticeiro nv 3): 1 action; concentração 1h. Escolhe tipo de dano (ácido/frio/fogo/elétrico/trovão); alvo tem RESISTÊNCIA (metade dano) a esse tipo.\nArena stub: buffSim halfDmg genérico (todas resistências — simplificação sem tracking de tipo específico) 3 rodadas + concentration.',
            buffSim: { id: 'prot_energy', vfx: 'shield', decOn: 'round', turns: 3, kind: 'buff', condName: 'Proteção contra Energia', condRule: 'PHB p.270 — resistência a dano (concentração).', halfDmg: true, concentration: true } },
        /* V1.7 Sprint-15 (2026-04-21 closeout review) — Curar (Heal PHB p.251):
           Clérigo/Druida nv 6. 70 HP healing + remove doenças/cegueira/surdez. */
        /* V1.7 Sprint-17 Ronda 27 (2026-04-21 QA PHB p.250) — Heal upcast +10/slot acima 6º.
           flatScale breakpoints: nv 13 (7th): +10 · nv 15 (8th): +20 · nv 17+ (9th): +30.
           Total: 70 base + upcast = 80 / 90 / 100 PV. Antes era fixo 70 (sem upcast). */
        { n: 'Curar', ico: '', cost: 5, kind: 'heal', minLevel: 11, healTargets: 'self',
            desc: 'Cura (PHB p.251 — 6º nível nv 11+): 70 PV (escala +10/slot) + remove cegueira/surdez/doenças.',
            healSpec: { n: 0, d: 1, flat: 70, flatScale: { breakpoints: [[13, 10], [15, 20], [17, 30]] } }, healSpell: true,
            helpDnd5e: 'Curar / Heal (PHB p.251 — Clérigo/Druida nv 6): 1 action; escolhe 1 criatura em 18m. Recupera 70 HP + remove CEGUEIRA, SURDEZ e qualquer doença.\nUpcast: +10 HP por nível acima do 6º.\nArena: healSpec flat:70 + flatScale breakpoints — nv 11 (6th): 70, nv 13 (7th): 80, nv 15 (8th): 90, nv 17+ (9th): 100.\nV1.7 Sprint-17 Ronda 27 (2026-04-21 QA PHB p.250): flatScale breakpoints adicionado (antes sem upcast).\n(Stub sem remoção de condições — cleansing não implementado no healer side.)' },
        /* V1.7 Sprint-15 (2026-04-21 closeout review) — Banir (Banishment PHB p.219):
           Clérigo/Paladino/Mago/Bardo nv 4. TR CAR ou desaparece do combate (skipTurn). Concentração. */
        { n: 'Banir', ico: '', cost: 4, kind: 'attack', minLevel: 7, dmgType: 'psychic',
            desc: 'Banir (PHB p.219 — 4º nível nv 7+): TR CAR ou ALVO REMOVIDO do combate 3 rodadas (concentração).',
            damageSpec: { n: 0, d: 0 }, save: { ability: 'cha' },
            helpDnd5e: 'Banir / Banishment (PHB p.219 — Clérigo/Paladino/Mago/Bardo nv 4): 1 action; concentração 1 min. TR CAR; em falha, alvo é banido (desaparece). Criaturas nativas deste plano retornam em 1 min; extraplanares exiladas.\nUpcast: +1 alvo por nível acima do 4º.\nArena stub: 0 dano + debuff skipTurn (alvo "desaparece" = não age) 3 rodadas + repeatSave CHA + concentration.',
            afterAttackEnemyDebuff: { id: 'banishment', turns: 3, n: 'Banido', ico: '', skipTurn: true, speed0: true, repeatSave: { ability: 'cha' }, concentration: true, dndCondition: 'Banido (PHB — Banishment; alvo desaparece)' } },
        /* V1.7 Sprint-14 (2026-04-21 closeout review) — Raio Guiador (Guiding Bolt PHB p.249):
           Clérigo nv 1. Ranged spell atk 4d6 radiant + próximo atk contra alvo tem vantagem.
           Reusa damageSpec + ranged + afterAttackEnemyDebuff (com targetedAdvantage para aliados). */
        /* V1.7 Sprint-17 (2026-04-21 QA PHB p.249) — Guiding Bolt upcast. */
        { n: 'Raio Guiador', ico: '', cost: 2, kind: 'attack', dmgType: 'radiant', ranged: true,
            desc: 'Ranged (PHB p.249): 4d6 radiante (escala +1d6/slot) + próximo atk contra alvo com vantagem.',
            damageSpec: { n: 4, d: 6, scaleByCasterLevel: { breakpoints: [[3, 1], [5, 2], [7, 3], [9, 4], [11, 5], [13, 6], [15, 7], [17, 8]] } },
            helpDnd5e: 'Raio Guiador / Guiding Bolt (PHB p.249 — Clérigo nv 1): 1 action; atk magia ranged. Em acerto, 4d6 radiante + alvo fica marcado por luz mística — próximo atk contra ele ANTES do fim do seu próximo turno tem VANTAGEM.\nUpcast: +1d6 por nível acima do 1º.\nArena stub: damageSpec 4d6 radiant ranged + afterAttackEnemyDebuff com targetedAdvantage 1 turno (aliados/você ganham vantagem em atk).',
            afterAttackEnemyDebuff: { id: 'guiding_bolt_mark', turns: 1, n: 'Marcado (Luz Guia)', ico: '', targetedAdvantage: true, dndCondition: 'Marcado (Guiding Bolt — próximo atk com vantagem)' } },
        /* V1.7 Sprint-14 (2026-04-21 closeout review) — Espíritos Guardiões (Spirit Guardians PHB p.250):
           Clérigo nv 3. Aura 4,5m AOE 3d8 radiant/necrotic TR SAB metade. Concentração 10 min.
           Reusa multiTarget + save + damageSpec + concentration. */
        /* V1.7 Sprint-17 (2026-04-21 QA PHB p.250) — Spirit Guardians upcast:
           +1d8 per slot above 3rd. */
        { n: 'Espíritos Guardiões', ico: '', cost: 3, kind: 'attack', minLevel: 5, dmgType: 'radiant',
            desc: 'Aura (PHB p.250): 3d8 radiante AOE (escala +1d8/slot acima 3º); TR SAB metade (concentração).',
            damageSpec: { n: 3, d: 8, scaleByCasterLevel: { breakpoints: [[7, 1], [9, 2], [11, 3], [13, 4], [15, 5], [17, 6]] } }, save: { ability: 'wis' }, multiTarget: true,
            helpDnd5e: 'Espíritos Guardiões / Spirit Guardians (PHB p.250 — Clérigo nv 3): 1 action; concentração 10 min. Espíritos em aura 4,5m ao redor do caster. Criaturas hostis que entrarem OU começarem turno na aura fazem TR SAB; 3d8 radiante (ou necrótico para clérigos de mal) em falha, metade em sucesso.\nUpcast: +1d8 por nível acima do 3º.\nArena stub: cast aplica dano 1x AOE (sem tracking ongoing) + stub documentation da aura; concentração flag para quebrar ao sofrer dano.' },
        /* V1.7 Sprint-12 (2026-04-21 closeout review) — Infligir Ferimentos (Inflict Wounds PHB p.254):
           Clérigo nv 1. 1 action melee spell atk; em acerto 3d10 necrotic. Cast não requer concentração. */
        /* V1.7 Sprint-17 (2026-04-21 QA PHB p.254) — Inflict Wounds upcast +1d10/slot acima 1º. */
        { n: 'Infligir Ferimentos', ico: '', cost: 2, kind: 'attack', dmgType: 'necrotic',
            desc: 'Toque necrótico (PHB p.254): 3d10 necrótico (escala +1d10/slot acima 1º).',
            damageSpec: { n: 3, d: 10, scaleByCasterLevel: { breakpoints: [[3, 1], [5, 2], [7, 3], [9, 4], [11, 5], [13, 6], [15, 7], [17, 8]] } },
            helpDnd5e: 'Infligir Ferimentos / Inflict Wounds (PHB p.254 — Clérigo nv 1): 1 action; ataque de magia corpo-a-corpo. Em acerto, 3d10 necrotic. Upcast: +1d10 por nível acima do 1º.\nArena: damageSpec 3d10 necrotic. Em acerto, dano direto (sem TR). Opposite de Cura (mesmo slot nv 1, mas ofensivo em vez de defensivo).' },
        /* V1.7 Sprint-11 (2026-04-21 closeout review) — Santuário PHB-FIX (PHB p.278):
           Casting Time 1 BONUS ACTION. Adicionada flag `bonus:true` (era ação principal). */
        { n: 'Santuário', ico: '', cost: 1, kind: 'buff', bonus: true, shieldSpell: true, targetAlly: true, desc: 'Ação bônus (PHB p.278): atacante faz TR SAB ou escolhe outro alvo.',
            helpDnd5e: 'Referência: Santuário (PHB): bônus em criatura; quem for atacar ou lançar magia ofensiva nela faz teste de resistência de Sabedoria (CD = 8 + bônus de proficiência + modificador de SAB de conjuração). Em falha, escolhe outro alvo ou perde o ataque/magia (alguns efeitos em área ainda podem incluí-la conforme PHB).\nNão dá CA nem dano; é proteção por CD.\nNeste modo: resumo tático até integração completa de CD.',
            buffSim: { id: 'santuário', vfx: 'sanctuary', decOn: 'round', turns: 3, kind: 'buff', sanctuary: true, condName: 'Santuário', condRule: 'PHB — atacante rola TR de Sabedoria vs CD (8 + prof + SAB do conjurador) antes de cada ataque no alvo; em falha, ataque anulado. Duração: 3 rodadas simplificadas.' } },
        /* V1.7 Sprint-17 (2026-04-21 QA PHB p.248) — Palavra Guia = Guiding Bolt.
           Era stub SEM mecânica de vantagem (só narrava no log). Agora com ranged:true
           + afterAttackEnemyDebuff targetedAdvantage turns:1 igual "Raio Guiador"
           (que é a versão PHB-fiel posterior). */
        /* V1.7 Sprint-17 (2026-04-21 QA PHB p.248) — Guiding Bolt upcast +1d6/slot acima 1º. */
        { n: 'Palavra Guia', ico: '', cost: 2, kind: 'attack', dmgType: 'radiant', ranged: true,
            desc: 'Feixe de luz sagrada (PHB p.248): 4d6 radiante (escala +1d6/slot) + próximo atk contra alvo com vantagem.',
            damageSpec: { n: 4, d: 6, scaleByCasterLevel: { breakpoints: [[3, 1], [5, 2], [7, 3], [9, 4], [11, 5], [13, 6], [15, 7], [17, 8]] } },
            helpDnd5e: 'Palavra Guia / Guiding Bolt (PHB p.248 — Clérigo nv 1): 1 action; atk magia ranged. Em acerto, 4d6 radiante + alvo marcado — próximo atk contra ele tem VANTAGEM.\nUpcast: +1d6 por nível acima do 1º.\nV1.7 Sprint-17 (2026-04-21): agora aplica targetedAdvantage 1 turno (antes era só narrativa no log — sem mecânica).',
            afterAttackEnemyDebuff: { id: 'guiding_bolt_mark_palavra', turns: 1, n: 'Marcado (Luz Guia)', ico: '', targetedAdvantage: true, dndCondition: 'Marcado (Guiding Bolt — próximo atk com vantagem)' } },
        { n: 'Proteção Divina', ico: '', cost: 2, kind: 'buff', desc: 'Escudo sagrado aplicado por toque: +2 CA e vantagem em salvaguardas contra magia por 3 turnos.',
            shieldSpell: true, targetAlly: true,
            helpDnd5e: 'Proteção contra o Mal e o Bem (PHB p.288): alvo ganha vantagem em TR contra criaturas de certos tipos; criaturas desvantagem em ataques contra o alvo.\nNeste fluxo: simplificado para +2 CA e vantagem em TR contra magia por 3 rodadas.',
            /* V1.7 Sprint-17 (2026-04-21 QA) — adicionado magicSaveAdvantage:true
               que já existia na data mas faltava no buff (desc mencionava "vantagem
               em salvaguardas contra magia" mas flag não estava). */
            buffSim: { id: 'protecao_divina', vfx: 'shield', decOn: 'round', turns: 3, kind: 'buff', condName: 'Proteção Divina', condRule: 'PHB — +2 CA e vantagem em TR contra magia.', acBonus: 2, magicSaveAdvantage: true } },
        /* V1 Invocações Phase 2 (2026-04-18) — Arma Espiritual reimplementada
           como summon_attached fiel ao PHB p.278: cast bonus, ataques BA por
           round, sem concentração, dura 10 rounds. Substitui versão buff legacy. */
        { n: 'Arma Espiritual', ico: '', cost: 2, kind: 'summon_attached', bonus: true,
            desc: 'Conjura arma espectral. Ação BÔNUS: 1d8 + mod conjuração force vs CA. 10 rounds, sem concentração.',
            helpDnd5e: 'Arma Espiritual (PHB p.278): conjura uma arma espectral flutuante em alcance 60 ft. ' +
                       'Ação bônus para atacar 1 criatura em 5 ft da arma. Ataque mágico: d20 + prof + mod conjuração. ' +
                       'Dano: 1d8 + mod conjuração force. Duração 1 minuto, SEM concentração. ' +
                       'Slots maiores: +1d8 a cada 2 níveis acima de 2.',
            dndCondition: 'Arma Espiritual ativa (1 min)',
            summonSpec: {
                id: 'spiritual_weapon',
                name: 'Arma Espiritual',
                ico: '',
                duration: 10,
                attackKind: 'spell',
                atkAttr: 'wis',
                damageSpec: { n: 1, d: 8, flat: 0, addCasterMod: true },
                dmgType: 'force',
                /* V1.7 Sprint-17 Ronda 11 (2026-04-21 QA PHB p.278 RAW) — Spiritual
                   Weapon upcast: +1d8 a cada 2 SLOTS acima do 2º (não caster level).
                   Antes era [[5,1],[11,2],[15,3]] (divergência — escalava cedo demais).
                   Agora [[7,1],[11,2],[15,3]] RAW: nv 7 (4th slot) 2d8, nv 11 (6th) 3d8,
                   nv 15 (8th) 4d8. Nv 5 (3rd slot) continua 1d8 per PHB. */
                scaleByCasterLevel: { breakpoints: [[7, 1], [11, 2], [15, 3]] },
                concentration: false
            }
        },
        /* V1.7 Sprint-5 (2026-04-21 closeout) — Imobilizar Pessoa (Hold Person PHB p.251)
           Clérigo/Feiticeiro/Mago/Bardo nv 2. Aplica condição PARALISADO (PHB Appendix A):
           incapacitado + auto-fail STR/DEX saves + crit melee em 1.5m + skipTurn.
           TR SAB ao fim de cada turno do alvo (concentração 1 min). */
        /* V1.7 Sprint-17 Ronda 22 (2026-04-21 QA PHB p.251) — Hold Person humanoid-only. */
        { n: 'Imobilizar Pessoa', ico: '', cost: 2, kind: 'attack', minLevel: 3, dmgType: 'radiant', requiresTargetTag: ['humanoid'],
            desc: 'Paralisa humanoide (PHB p.251): TR SAB ou PARALISADO 3 rodadas; TR SAB ao fim do turno.',
            damageSpec: { n: 0, d: 0 }, save: { ability: 'wis' },
            helpDnd5e: 'Imobilizar Pessoa / Hold Person (PHB p.251 — 2º nível): alvo humanoide faz TR SAB; em falha fica PARALISADO até o fim da duração (1 min concentração). Ao fim de cada turno, pode repetir TR SAB.\nParalisado (PHB Appendix A): incapacitado (não atk/reação), auto-falha TRs FOR e DES, ataques em 1,5m são críticos automáticos, atacantes têm vantagem.\nArena: 0 dano + debuff Paralisado 3 rodadas com repeatSave SAB + skipTurn + critMelee + targetedAdvantage.',
            afterAttackEnemyDebuff: { id: 'hold_person_paralyzed', turns: 3, n: 'Paralisado', ico: '', skipTurn: true, critMelee: true, targetedAdvantage: true, autoFailStrDex: true, repeatSave: { ability: 'wis' }, concentration: true, dndCondition: 'Paralisado (PHB App.A — Imobilizar Pessoa)' } },
        /* Fase 4C: Canalizar Divindade — Expulsar Mortos-Vivos (Turn Undead PHB p.58).
           No FIM da lista de propósito (não desloca slots das skills anteriores). */
        { n: 'Expulsar Mortos-Vivos', ico: '†', cost: 0, kind: 'attack', dmgType: 'radiant', minLevel: 2, multiTarget: true, requiresTargetTag: ['undead'], combatOnceId: 'channel_divinity', save: { ability: 'wis' },
            damageSpec: { n: 0, d: 0 },
            desc: 'Canalizar Divindade (PHB p.58): mortos-vivos fazem TR de SAB ou são Expulsos (fogem e perdem o turno). 1×/combate.',
            helpDnd5e: 'Expulsar Mortos-Vivos / Turn Undead (PHB p.58-59 — Canalizar Divindade, Clérigo nv 2): cada morto-vivo que vê/ouve o Clérigo faz um TR de Sabedoria (CD de magia). Em falha, é "expulso" por 1 min ou até sofrer dano — gasta os turnos fugindo e não pode agir.\nArena (sem grelha): TR SAB vs CD; em falha, Expulso (skipTurn 3 rodadas, termina ao sofrer dano). Só afeta mortos-vivos (auto-alveja todos os undead vivos). 1×/combate; sem mortos-vivos, não gasta o uso.',
            afterAttackEnemyDebuff: { id: 'turned', turns: 3, n: 'Expulso', ico: '»', skipTurn: true, wakeOnDamage: true, dndCondition: 'Expulso (Turn Undead — PHB p.58)' } }
      ] },
    { cls: 'Paladino', hp: [26, 38], ac: [16, 18], atk: [5, 6], die: 8, dex: [8, 12], ico: '', dmgMod: 2, attr: 'STR',
      /* D&D 5e PHB p.84: Paladino é meio-conjurador — Smite Divino e magias
         gastam ESPAÇOS DE MAGIA (= "Mana" na abstração do jogo), não "Vigor".
         Alinha com a autoridade (src/game/classes/paladin.py → resource_name
         "Mana"). Sessão #67: D&D é regra, corrigir sempre. */
      res: { type: 'mp', name: 'Mana', ico: '', max: 5 },
      /* V1.5 (2026-04-19, c) — Find Steed (PHB p.240): invoca montaria celestial
         (Warhorse default). Stat block PHB Monster Manual p.337: HP 19, CA 11,
         atk +6, 2d6+4 bludgeoning hooves.
         COMBATE PHB-FIEL: como o steed é "unusually intelligent" (PHB p.240), conta
         como mount independente per PHB p.198 Mounted Combat (age na própria
         iniciativa, ataca por conta própria — não controlado pelo jogador).
         ADAPTAÇÕES PRÉ-COMBATE listadas no helpDnd5e abaixo. */
      passives: [
          {
              id: 'find_steed',
              kind: 'summon_combatant_passive',
              spawnInBattle: true,
              spawnPosition: 'rear_ally',
              /* Sessao #32 (2026-05-25) — User reportou: paladino comecando com
                 montaria parecia estranho. CORRETO em D&D 5e: Find Steed e uma
                 spell de 2o nivel (PHB p.240). Paladino so ganha spellcasting
                 no nivel 2; 2nd-level slots no nivel 3. Antes do level 5 (Extra
                 Attack milestone) ainda e cedo demais — montaria seria poderosa
                 demais pra um paladino iniciante. Gate em minLevel:5 = paladino
                 ja domina sua spellcasting e bondou com sua montaria (canonical
                 narrativa D&D). spawnPassivesForClass em combate.html ja respeita
                 passive.minLevel (gating identico ao Bardo Magical Secrets L10). */
              minLevel: 5,
              /* C1 (escolha autor) — PHB-fiel: ritual de 10 min fora-de-combate
                 (PHB p.240). Setup-frontend ganha checkbox "Já invocou montaria?". */
              preCombatRitual: true,
              helpDnd5e: 'Encontrar Montaria (PHB p.240 — Find Steed): invoca uma ' +
                         'montaria celestial inteligente (Warhorse PHB MM p.337 default; ' +
                         'Pony/Camel/Elk/Mastiff opções). Stats Warhorse: HP 19, CA 11, ' +
                         '2d6+4 bludgeoning hooves. ' +
                         'COMBATE PHB-FIEL: steed é "unusually intelligent" (PHB), conta ' +
                         'como mount independente (PHB p.198) — age na própria iniciativa. ' +
                         'ADAPTAÇÕES vs PHB: ' +
                         '(a) cast original é 10 minutos (ritual fora de combate) — combat2 ' +
                         'auto-spawna no início de cada combate; ' +
                         '(b) "shared spells while mounted" (magias self do paladino atingem ' +
                         'a montaria) NÃO implementado; ' +
                         '(c) Mounted Combat actions (jogador montar/desmontar, controlar) ' +
                         'NÃO implementadas — montaria atua como combatente IA paralelo. ' +
                         'Persistente até morrer; retorna no próximo combate (PHB: 1h ritual).',
              summonSpec: {
                  id: 'find_steed',
                  name: 'Montaria',
                  ico: '',
                  hp: 19, mhp: 19, ac: 11,
                  dex: 12, wis: 12, con: 15, str: 18, int: 6, cha: 7,
                  atk: 6,
                  damageSpec: { n: 2, d: 6, flat: 4 },
                  dmgType: 'bludgeoning',
                  die: 6,
                  multiAttack: 1
              }
          }
      ],
      skills: [
        /* V1.7 Sprint-17 (2026-04-21 QA PHB p.85) — Golpe Divino agora escala por
           nível Paladino (slot available): 2d8 (nv 2-4), 3d8 (5-8), 4d8 (9-12),
           5d8 (13+). Antes era fixo 2d8 — não escalava com PHB RAW.
           Ronda 8: +1d8 vs undead/fiend (bonusVsTag PHB p.85). */
        { n: 'Golpe Divino', ico: '', cost: 2, kind: 'attack', desc: 'Golpe canalizado: 2d8 radiante base, escala com nível Paladino até 5d8. +1d8 vs undead/fiend.',
            damageSpec: { n: 2, d: 8, scaleByCasterLevel: { breakpoints: [[5, 1], [9, 2], [13, 3]] } },
            smite: true, smiteCost: 2,
            bonusVsTag: { tags: ['undead', 'fiend'], dice: { n: 1, d: 8 } },
            helpDnd5e: 'Golpe Divino / Divine Smite (PHB p.85 — Paladino nv 2+): gasta espaço de magia após acertar para somar d8 radiantes.\nPHB RAW: 2d8 (1st slot) → 3d8 (2nd) → 4d8 (3rd) → 5d8 (4th+), cap 5d8. +1d8 vs undead/fiend.\nArena: escala por nível Paladino (slot disponível): nv 2-4: 2d8 · nv 5-8: 3d8 · nv 9-12: 4d8 · nv 13+: 5d8.\nV1.7 Sprint-17 (2026-04-21): escalamento por nível adicionado (antes fixo 2d8).' },
        /* V1.7 Sprint-17 Ronda 15 (2026-04-21 QA PHB p.84) — Lay on Hands pool:
           PHB pool = Paladino nv × 5 HP (total por rest). Sim stub: usa nível do
           caster como múltiplo (modLevel) + 1d4 base. Aproxima crescimento de pool.
           Paladino nv 1: 1d4+1 (pool 5) · nv 5: 1d4+5 (pool 25) · nv 10: 1d4+10 (pool 50). */
        { n: 'Cura pelas Mãos', ico: '', cost: 1, kind: 'heal', desc: 'Toque (PHB p.84): 1d4 + nível em PV (pool = nível × 5).',
            healTargets: 'self', healSpec: { n: 1, d: 4, flat: 0, modLevel: true },
            helpDnd5e: 'Cura pelas Mãos / Lay on Hands (PHB p.84 — Paladino nv 1+): feature de classe; pool = Paladino level × 5 HP total por descanso longo. Gasta HP do pool pra curar qualquer alvo (ação). Também: 5 HP pra curar doença ou poisoned.\nV1.7 Sprint-17 (2026-04-21): stub arena — heal = 1d4 + nível do Paladino (aproxima crescimento do pool). Nv 1: 1d4+1, nv 5: 1d4+5, nv 10: 1d4+10.' },
        /* V1.7 Sprint-17 Ronda 14 (2026-04-21 QA PHB p.85) — Aura of Protection RAW:
           +CHA mod (min +1) em TODOS os saves. Antes era +1 CA (divergência — PHB é save).
           Stub: aplica em self; ideal seria aura 10ft incluindo aliados. */
        { n: 'Aura de Proteção', ico: '', cost: 1, kind: 'buff', minLevel: 6, desc: 'Aura sagrada (PHB p.85, nv 6+): +CAR mod em todos os TRs por 3 rodadas (min +1).',
            buffSim: { id: 'aura_prot', vfx: 'shield', decOn: 'round', turns: 3, kind: 'buff', condName: 'Aura de Proteção', condRule: 'PHB p.85 — +CAR mod em TODOS os TRs (mín +1).', saveBonusFromCasterCha: true } },
        { n: 'Golpe Guidado', ico: '', cost: 2, kind: 'attack', desc: 'Ataque sagrado: 1d8 + força de arma',
            damageSpec: { n: 1, d: 8 },
            helpDnd5e: 'Ataque com arma corpo a corpo; dano 1d8 + STR neste fluxo.' },
        /* V1.7 Sprint-10 (2026-04-21 closeout) — Juramento de Inimizade PHB-FIX (PHB p.88):
           AÇÃO BÔNUS (era ação principal — divergência). Paladino Oath of Vengeance nv 3. */
        /* V1.7 Sprint-17 (2026-04-21 QA PHB p.88) — Vow of Enmity Oath of Vengeance nv 3+. */
        /* V1.7 Sprint-17 Ronda 16 (2026-04-21 QA PHB p.88) — Vow of Enmity target-specific:
           vantagem SÓ vs alvo marcado (PHB RAW). targetEnemy:true auto-pick 1º inimigo. */
        { n: 'Juramento de Inimizade', ico: '', cost: 2, kind: 'buff', bonus: true, minLevel: 3, targetEnemy: true, desc: 'Ação bônus (PHB p.88 — Juramento Vingança nv 3+): marca inimigo — vantagem em ataques CONTRA ELE.',
            blessSpell: true,
            helpDnd5e: 'Juramento de Inimizade / Vow of Enmity (PHB p.88 — Paladino Juramento da Vingança nv 3): **AÇÃO BÔNUS**. Escolha 1 criatura visível em 3m; você tem VANTAGEM em rolagens de ataque contra essa criatura por 1 min (concentração) OU até ela ficar com 0 HP / inconsciente.\nV1.7 Sprint-10 (2026-04-21 closeout): adicionada flag `bonus:true` (PHB-FIX — era ação principal). Stub 3 rodadas + concentração. Vantagem aplicada ao próprio caster (arena sem target-tracking).',
            buffSim: { id: 'juramento_inimizade', vfx: 'bless', decOn: 'round', turns: 3, kind: 'buff', condName: 'Juramento de Inimizade', condRule: 'PHB p.88 — Vantagem em ataques contra alvo marcado (PHB RAW target-specific). Concentração.', atkAdvantage: true, markedTargetOnly: true, concentration: true } },
        /* V1.7 Sprint-17 (2026-04-21 QA PHB p.235) — Palavra Imperiosa / Command
           RAW: 0 dano + TR SAB + grovel (prostrado) em falha. Antes era stub com
           3d6 radiante (divergência — Command é enchantment sem dano). */
        { n: 'Palavra Imperiosa', ico: '', cost: 2, kind: 'attack', dmgType: 'psychic',
            desc: 'Comando (PHB p.235): TR SAB — em falha, alvo se PROSTRA ("grovel") 1 turno.',
            damageSpec: { n: 0, d: 0 }, save: { ability: 'wis' },
            helpDnd5e: 'Palavra Imperiosa / Command (PHB p.235 — Clérigo/Paladino nv 1): 1 action; alvo faz TR SAB. Em falha: obedece 1 palavra de comando no próximo turno (approach, drop, flee, grovel, halt).\nNão afeta undead ou criaturas que não entendem sua língua.\nUpcast: +1 alvo por nível acima do 1º.\nArena: 0 dano + TR SAB; em falha aplica "Prostrado" (grovel) 1 turno — atacantes com vantagem contra o alvo (PHB App.A Prone).\nV1.7 Sprint-17 (2026-04-21): era 3d6 radiante + prostrado (divergência PHB — Command é 0 dano). Corrigido pra PHB RAW.',
            afterAttackEnemyDebuff: { id: 'comando_grovel', turns: 1, n: 'Prostrado (Comando)', ico: '', atkDisadvantage: true, targetedAdvantage: true, prone: true, dndCondition: 'Prostrado (Command — grovel)' } },
        /* V1.7 Sprint-17 (2026-04-21 QA PHB p.221) — Aura of Vitality 3rd level, Paladino nv 9+. */
        /* V1.7 Sprint-17 Ronda 22 (2026-04-21 QA PHB p.221) — Aura de Vitalidade:
           PHB: 2d6 por turno (BA) em 1 aliado. Arena stub: 2d6 em TODOS aliados vivos
           AO CAST (representação compacta do efeito contínuo). Antes era 1d6 (sub-stub). */
        { n: 'Aura de Vitalidade', ico: '', cost: 3, kind: 'heal', minLevel: 9, desc: 'Aura curativa (PHB p.221, nv 9+): restaura 2d6 PV em todos aliados vivos.',
            healSpec: { n: 2, d: 6 }, healSpell: true, healAllAllies: true,
            helpDnd5e: 'Aura de Vitalidade / Aura of Vitality (PHB p.221 — Paladino nv 9+): 1 action; concentração 1 min. Cada turno, BA cura 2d6 PV em 1 aliado em 9m.\nArena stub: cast aplica 2d6 em TODOS aliados vivos 1x (compacta o efeito contínuo em uma aplicação).\nV1.7 Sprint-17 Ronda 22 (2026-04-21): era 1d6 stub — corrigido pra 2d6 PHB.' },
        /* V1.7 Stage-9 (2026-04-21) — Paladino BAs Smites PHB (fecha gap 0 BAs).
           3 skills BA "Smite": concede riders no PRÓXIMO ataque corpo-a-corpo
           que o Paladino acertar (1 min concentração no PHB; aqui turns:2 stub). */
        /* V1.7 Sprint-17 (2026-04-21 QA PHB p.219) — Branding Smite 2nd level, Paladino nv 5+. */
        { n: 'Golpe Marcante', ico: '', cost: 1, kind: 'buff', bonus: true, minLevel: 5,
            desc: 'Ação bônus (PHB p.219 Branding Smite — 2º nível, nv 5+): próximo ataque em acerto +2d6 radiante.',
            helpDnd5e: 'Golpe Marcante / Branding Smite (PHB p.219 — Paladino 2º nível): **AÇÃO BÔNUS**; concentração até 1 min. Próximo ataque corpo-a-corpo com arma que acertar infringe +2d6 radiante extra. Alvo emite luz fraca (3m raio) por 1 min — revela invisibilidade e atrapalha esconder-se.\nArena stub: buff BA com dmgBonusDie:{n:2,d:6} no próximo ataque; condição "Marcado (luz fraca)" também aplica atkDisadvantage no NPC (representa a luz que revela e atrapalha).',
            /* V1.7 Sprint-17 Ronda 11 (2026-04-21 QA PHB p.219) — Branding Smite upcast
               +1d6 por slot acima do 2º. Paladino nv 5 (2nd) 2d6, nv 9 (3rd) 3d6, etc. */
            buffSim: { id: 'golpe_marcante', vfx: 'bless', decOn: 'after_npc', turns: 2, kind: 'buff', condName: 'Golpe Marcante', condRule: 'PHB p.219 — próximo ataque +2d6 radiante (escala +1d6/slot); alvo emite luz 3m.', dmgBonusDie: { n: 2, d: 6, scaleByCasterLevel: { breakpoints: [[9, 1], [13, 2], [17, 3]] } }, concentration: true, consumeOnHit: true } },
        /* V1.7 Sprint-17 (2026-04-21 QA PHB p.281) — Thunderous Smite 1st level, Paladino nv 2+. */
        { n: 'Golpe Trovejante', ico: '', cost: 2, kind: 'buff', bonus: true, minLevel: 2,
            desc: 'Ação bônus (PHB p.281 — 1º nível, nv 2+): próximo ataque +2d6 trovão, TR FOR ou prostrado.',
            helpDnd5e: 'Golpe Trovejante / Thunderous Smite (PHB p.281 — Paladino 1º nível): **AÇÃO BÔNUS**; concentração até 1 min. Próximo ataque corpo-a-corpo que acertar causa +2d6 trovão adicional; alvo faz TR FOR ou é empurrado 3m E cai prostrado.\nArena stub: buff BA dmgBonusDie:{n:2,d:6} no próximo ataque; afterAttackEnemyDebuff prostrated (atkDisadvantage) se hit.',
            /* V1.7 Sprint-17 Ronda 29 (2026-04-21 QA PHB p.281) — Thunderous Smite upcast:
               +1d6 por slot acima 1º. Paladino half caster: nv 2 (1st) 2d6, nv 5 (2nd) 3d6,
               nv 9 (3rd) 4d6, nv 13 (4th) 5d6, nv 17 (5th) 6d6. Antes era fixo 2d6. */
            buffSim: { id: 'golpe_trovejante', vfx: 'thunder', decOn: 'after_npc', turns: 2, kind: 'buff', condName: 'Golpe Trovejante', condRule: 'PHB p.281 — próximo ataque +2d6 trovão (escala +1d6/slot acima 1º) + TR FOR ou prostrado.', dmgBonusDie: { n: 2, d: 6, scaleByCasterLevel: { breakpoints: [[5, 1], [9, 2], [13, 3], [17, 4]] } }, concentration: true, nextHitAppliesDebuff: { id: 'trovejante_prone', turns: 1, n: 'Prostrado', ico: '', atkDisadvantage: true, dndCondition: 'Prostrado (Thunderous Smite — desvantagem próximo ataque)' } } },
        /* V1.7 Sprint-17 (2026-04-21 QA resource audit) — Arma Mágica (Magic Weapon PHB p.257):
           Paladino/Mago nv 2. PHB RAW: 1 AÇÃO, concentração 1h. Antes era stub `bonus:true`
           (divergência PHB admitida no comentário anterior). CORRIGIDO pra 1 ação RAW. */
        { n: 'Arma Mágica', ico: '', cost: 2, kind: 'buff', isSpell: true, minLevel: 5,
            desc: 'Ação (PHB p.257 — 2º nível, Paladino/Mago nv 5+): arma vira mágica +1 (concentração 1h).',
            helpDnd5e: 'Arma Mágica / Magic Weapon (PHB p.257 — Paladino/Mago nv 2): **1 AÇÃO**; concentração 1h. Arma não-mágica tocada vira mágica +1 em atk e dano.\nUpcast: +2 nv 4, +3 nv 6.\nArena: buffSim atkFlat:1 + dmgFlat:1 + concentration. Bônus por turno até concentração quebrar.\nV1.7 Sprint-17 (2026-04-21 audit): era stub `bonus:true` — corrigido pra 1 ação RAW PHB.',
            buffSim: { id: 'magic_weapon', vfx: 'bless', decOn: 'round', turns: 3, kind: 'buff', condName: 'Arma Mágica', condRule: 'PHB p.257 — +1 atk + dano (concentração).', atkFlat: 1, dmgFlat: 1, concentration: true } },
        /* V1.7 Sprint-14 (2026-04-21 closeout review) — Golpe Flamejante (Searing Smite PHB p.273):
           Paladino nv 1. BA + próximo atk em acerto → +1d6 fogo imediato + 1d6 fogo/turno TR CON.
           Reusa Smite pattern + concentration + ongoing DOT stub. */
        /* V1.7 Sprint-17 (2026-04-21 QA PHB p.273) — Searing Smite 1st level, Paladino nv 2+. */
        { n: 'Golpe Flamejante', ico: '', cost: 1, kind: 'buff', bonus: true, minLevel: 2,
            desc: 'Ação bônus (PHB p.273 — 1º nível, nv 2+): próximo atk em acerto +1d6 fogo.',
            helpDnd5e: 'Golpe Flamejante / Searing Smite (PHB p.273 — Paladino 1º nível): **AÇÃO BÔNUS**; concentração até 1 min. Próximo ataque corpo-a-corpo com arma que acertar causa +1d6 fogo; alvo pega fogo. No início de cada turno do alvo até a magia terminar, TR CON — em falha, 1d6 fogo; sucesso = apagou fogo.\nUpcast: +1d6 por nível acima do 1º.\nArena stub: buff BA dmgBonusDie:{n:1,d:6} próximo atk + concentration. DOT ongoing não modelado (stub inicial similar a Bruxaria).',
            /* V1.7 Sprint-17 Ronda 11 (2026-04-21 QA PHB p.273) — Searing Smite upcast
               +1d6 por slot acima do 1º. Paladino nv 2 base 1d6, nv 5 (2nd) 2d6, nv 9 (3rd) 3d6. */
            buffSim: { id: 'searing_smite', vfx: 'bless', decOn: 'after_npc', turns: 2, kind: 'buff', condName: 'Golpe Flamejante', condRule: 'PHB p.273 — próximo atk +1d6 fogo (escala +1d6/slot).', dmgBonusDie: { n: 1, d: 6, scaleByCasterLevel: { breakpoints: [[5, 1], [9, 2], [13, 3], [17, 4]] } }, concentration: true, consumeOnHit: true } },
        /* V1.7 Sprint-13 (2026-04-21 closeout review) — Golpe Fulminante (Blinding Smite PHB p.219):
           Paladino nv 3. BA + próximo atk em acerto → +3d8 radiante + alvo TR CON ou CEGO.
           Reusa Smite pattern (igual Trovejante/Marcante/Irado) + nextHitAppliesDebuff Cego. */
        /* V1.7 Sprint-17 (2026-04-21 QA PHB p.219) — Blinding Smite 3rd level, Paladino nv 9+. */
        { n: 'Golpe Fulminante', ico: '', cost: 2, kind: 'buff', bonus: true, minLevel: 9,
            desc: 'Ação bônus (PHB p.219 — 3º nível, nv 9+): próximo atk +3d8 radiante + TR CON ou CEGO.',
            helpDnd5e: 'Golpe Fulminante / Blinding Smite (PHB p.219 — Paladino 3º nível): **AÇÃO BÔNUS**; concentração até 1 min. Próximo ataque com arma corpo-a-corpo que acertar causa +3d8 radiante; alvo faz TR CON ou fica CEGO até a magia terminar.\nArena stub: buff BA dmgBonusDie:{n:3,d:8} no próximo ataque + afterAttackEnemyDebuff Cego (atkDisadvantage+targetedAdvantage+repeatSave CON) 3 rodadas.',
            /* V1.7 Sprint-17 Ronda 11 (2026-04-21 QA PHB p.219) — Blinding Smite upcast
               +1d8 por slot acima do 3º. Paladino nv 9 (3rd) 3d8 base, nv 13 (4th) 4d8, nv 17 (5th) 5d8. */
            buffSim: { id: 'golpe_fulminante', vfx: 'bless', decOn: 'after_npc', turns: 2, kind: 'buff', condName: 'Golpe Fulminante', condRule: 'PHB p.219 — próximo atk +3d8 radiante (escala +1d8/slot acima 3º) + TR CON ou Cego.', dmgBonusDie: { n: 3, d: 8, scaleByCasterLevel: { breakpoints: [[13, 1], [17, 2]] } }, concentration: true, nextHitAppliesDebuff: { id: 'blinding_smite_blind', turns: 3, n: 'Cego', ico: '‍', atkDisadvantage: true, targetedAdvantage: true, repeatSave: { ability: 'con' }, dndCondition: 'Cego (PHB App.A — Blinding Smite)' } } },
        /* V1.7 Sprint-17 (2026-04-21 QA PHB p.289) — Wrathful Smite 1st level, Paladino nv 2+. */
        { n: 'Golpe Irado', ico: '', cost: 1, kind: 'buff', bonus: true, minLevel: 2,
            desc: 'Ação bônus (PHB p.289 — 1º nível, nv 2+): próximo ataque +1d6 psíquico, TR SAB ou amedrontado.',
            helpDnd5e: 'Golpe Irado / Wrathful Smite (PHB p.289 — Paladino 1º nível): **AÇÃO BÔNUS**; concentração até 1 min. Próximo ataque corpo-a-corpo que acertar causa +1d6 psíquico adicional; alvo faz TR SAB ou fica amedrontado (pode repetir TR como ação por turno).\nArena stub: buff BA dmgBonusDie:{n:1,d:6} no próximo ataque + afterAttackEnemyDebuff frightened (skipBonus) se hit.',
            /* V1.7 Sprint-17 Ronda 29 (2026-04-21 QA PHB p.289) — Wrathful Smite upcast:
               +1d6 por slot acima 1º. Paladino half caster: nv 2 (1st) 1d6, nv 5 (2nd) 2d6,
               nv 9 (3rd) 3d6, nv 13 (4th) 4d6, nv 17 (5th) 5d6. Antes era fixo 1d6. */
            buffSim: { id: 'golpe_irado', vfx: 'shadow', decOn: 'after_npc', turns: 2, kind: 'buff', condName: 'Golpe Irado', condRule: 'PHB p.289 — próximo ataque +1d6 psíquico (escala +1d6/slot acima 1º) + TR SAB ou amedrontado.', dmgBonusDie: { n: 1, d: 6, scaleByCasterLevel: { breakpoints: [[5, 1], [9, 2], [13, 3], [17, 4]] } }, concentration: true, nextHitAppliesDebuff: { id: 'irado_frightened', turns: 2, n: 'Amedrontado', ico: '', atkDisadvantage: true, skipBonus: true, dndCondition: 'Amedrontado (Wrathful Smite — desvantagem + perde BA)' } } }
      ] },
    { cls: 'Bárbaro', hp: [30, 44], ac: [14, 16], atk: [5, 7], die: 12, dex: [14, 16], ico: '', dmgMod: 3, attr: 'STR',
      /* D&D 5e PHB p.48: o recurso do Bárbaro é FÚRIA (Rage), nunca "Vigor".
         max acompanha os usos de Fúria por nível (2→6, via _classResMaxByLevel).
         Cada Fúria consome 1 uso (cost:1 abaixo), então um Bárbaro nv2 entra em
         fúria 2× — fiel ao PHB. Sessão #67: user reforçou "é regra seguir tudo
         do D&D, corrija sempre". */
      res: { type: 'furia', name: 'Fúria', ico: '', max: 6 },
      skills: [
        { n: 'Fúria', ico: '', cost: 1, kind: 'buff', bonus: true,
            desc: 'Ação bônus: entra em fúria — +2 dano + resistência 50% B/P/S + vantagem STR + impede magias (PHB p.48).',
            helpDnd5e: 'Fúria (PHB p.48 — Bárbaro): **AÇÃO BÔNUS** para entrar em fúria.\n+2/+3/+4 dano por nível em ataques corpo a corpo com Força; RESISTÊNCIA a concussão, perfuração e corte com armas (metade do dano); VANTAGEM em testes e TRs de Força; NÃO PODE conjurar magias ou manter concentração em magia.\nDuração: até 1 minuto; termina ao ficar inconsciente, ou no fim do turno se não atacou ou sofreu dano desde o último turno.\nV1.7 (2026-04-21) alinhamento PHB: era `kind:buff` sem flag `bonus` — consumia AÇÃO principal. Agora `bonus:true` libera ação pra atacar no mesmo turno (RAW).\nV1.7 Sprint-4 (2026-04-21 closeout): adicionados `strCheckAdvantage:true` (vantagem TR/check FOR) + `noCastWhileRaging:true` (bloqueia skills `healSpell`/com custo MP) em `buffSim` — PHB-fiel completa.',
            /* V1.7 Sprint-17 (2026-04-21 QA PHB p.48) — Fúria dura 1 min = 10 rodadas
               no PHB. Antes era turns:2 (curta demais pro feature principal do Bárbaro).
               Corrigido pra turns:10 RAW + decOn:'round' (era 'after_npc' — mais curto
               ainda). Fúria termina também se Bárbaro não atacou/sofreu dano — lógica
               PHB mais complexa não modelada em stub. */
            buffSim: { id: 'furia', vfx: 'shield', decOn: 'round', turns: 10, kind: 'buff', condName: 'Fúria', condRule: 'PHB p.48 — +2/+3/+4 dano + RESISTÊNCIA 50% B/P/S + vantagem STR + sem magias. 1 min / 10 rodadas.', rageDmg: true, rageResistance: true, strCheckAdvantage: true, noCastWhileRaging: true } },
        { n: 'Ataque Brutal', ico: '', cost: 2, kind: 'attack', desc: 'Golpe selvagem: 2d12 + STR',
            damageSpec: { n: 2, d: 12 },
            helpDnd5e: 'Resumo: dois dados de arma grande; crítico adiciona mais 1d12.' },
        { n: 'Investida Selvagem', ico: '', cost: 2, kind: 'attack', desc: 'Correr e bater: 1d12 + STR',
            damageSpec: { n: 1, d: 12 },
            helpDnd5e: 'Investida simplificada: 1d12 + modificador após acertar.' },
        { n: 'Recuperação Rápida', ico: '', cost: 1, kind: 'heal', desc: 'Recupera 1d8+2 PV em si',
            healTargets: 'self', healSpec: { n: 1, d: 8, flat: 2 },
            helpDnd5e: 'Resumo: cura curta entre combates; aqui 1d8+2 em si.' },
        /* V1.7 Sprint-11 (2026-04-21 closeout review) — Agarrar PHB-FIX (PHB p.195):
           "When you want to grab a creature or wrestle with it, you can use the Attack
           action to make a special melee attack, a grapple."
           → É parte da ação de Ataque (substitui UM ataque), NÃO ação bônus própria.
           FIX: removida flag `bonus:true` (divergência anterior). Agora consome ação (kind:attack
           sem bonus). PHB-fiel: se tem Extra Attack, ainda pode atacar no mesmo turno. */
        { n: 'Agarrar', ico: '', cost: 1, kind: 'attack', dmgType: 'bludgeoning',
            desc: 'Ação (PHB p.195): substitui 1 ataque por tentativa de agarrar — TR FOR; falha = AGARRADO 3 rodadas.',
            damageSpec: { n: 0, d: 0 }, save: { ability: 'str' },
            helpDnd5e: 'Agarrar / Grapple (PHB p.195 — ação de combate base): você **substitui um ataque** da ação Attack por tentativa de agarrar. Teste FOR(Atletismo) vs FOR(Atletismo) OU DES(Acrobacia) do alvo (stub: TR FOR simples). Em falha do alvo, fica AGARRADO.\nAgarrado (PHB App.A): velocidade 0 + atk adv contra o alvo (flanqueamento). Alvo pode tentar escapar com FOR/DES ao fim do turno.\nV1.7 Sprint-11 (2026-04-21 closeout review): REMOVIDA flag `bonus:true` (divergência) — PHB p.195 diz que Grapple é parte da ação Attack, não BA. Arena: kind attack + 0 dmg + debuff 3 rodadas + speed0 + repeatSave FOR.',
            afterAttackEnemyDebuff: { id: 'grappled', turns: 3, n: 'Agarrado', ico: '', speed0: true, repeatSave: { ability: 'str' }, dndCondition: 'Agarrado (PHB App.A — Agarrar)' } },
        /* V1.7 Sprint-10 (2026-04-21 closeout) — Ataque Temerário PHB-fiel REAL (PHB p.48):
           FREE ACTION toggle declarado no PRIMEIRO ataque do turno (não consome ação nem BA).
           Vantagem em TODOS os ataques STR melee desse turno; atacantes têm vantagem até
           início do próximo turno do Bárbaro.
           Implementação: cost 0 + grantsExtraAction:true (reseta actionSpent=false pra permitir
           atacar logo após ativar) + buffSim aplica atkAdvantage + selfAtkVulnerable.
           firstAttackToggle:true documenta intent (PHB: declarado no 1º atk, não pré-cast). */
        { n: 'Temerário', ico: '', cost: 0, kind: 'buff', grantsExtraAction: true, firstAttackToggle: true, minLevel: 2,
            desc: 'FREE PHB p.48: ativa no 1º ataque — vantagem em todos atk STR; atacantes com vantagem 1 turno.',
            helpDnd5e: 'Ataque Imprudente / Reckless Attack (PHB p.48 — Bárbaro nv 2): FEATURE DE CLASSE (não consome ação). Quando você faz seu primeiro ataque do turno, pode atacar RECKLESSLY — ganha vantagem em TODOS os ataques com arma baseados em FOR este turno, mas atacantes têm vantagem contra você até início da sua próxima rodada.\nV1.7 Sprint-10 (2026-04-21): cost 0 (PHB free action) + grantsExtraAction:true (reseta actionSpent pra permitir atacar logo após ativar). BuffSim aplica ambos: atkAdvantage (ofensivo) + selfAtkVulnerable (defensivo).\nV1.7 Sprint-17 Ronda 24 (2026-04-21 QA audit PHB p.48): adicionada flag `minLevel: 2` (antes faltava — disponível em nv 1 violava PHB RAW).',
            buffSim: { id: 'temerario', vfx: 'bless', decOn: 'after_npc', turns: 1, kind: 'buff', condName: 'Temerário', condRule: 'PHB p.48 — Vantagem em atk FOR, inimigos vantagem contra você.', atkAdvantage: true, selfAtkVulnerable: true } },
        { n: 'Rugido Feroz', ico: '', cost: 2, kind: 'buff', minLevel: 10, desc: 'Rugido que amedronta inimigos visíveis (PHB p.49 nv 10+): desvantagem em ataques contra você por 2 turnos.',
            requiresSubclass: 'berserker', /* REVIEW-#90 [8/17/25]: Presença Intimidante (Berserker PHB p.49) — paridade c/ motor C3.5 */
            blessSpell: true,
            helpDnd5e: 'Presença Intimidante (PHB p.49 — Bárbaro nível 10): ação para amedrontar uma criatura até 30m; TR SAB (CD 8 + prof + CAR). Em falha, fica amedrontada por concentração de 1 min.\nNeste fluxo: área simplificada — todos inimigos ficam com desvantagem em ataques contra você por 2 rodadas.\nV1.7 Sprint-17 Ronda 24 (2026-04-21 QA audit PHB p.49): adicionada flag `minLevel: 10` (antes faltava — Bárbaro nv 1-9 tinha acesso indevido).',
            buffSim: { id: 'rugido_feroz', vfx: 'bless', decOn: 'round', turns: 2, kind: 'buff', condName: 'Rugido Feroz', condRule: 'PHB — Inimigos amedrontados = desvantagem em ataques enquanto você estiver à vista.', enemyAtkDisadvantage: true } },
        /* V1.7 Sprint-17 Ronda 24 (2026-04-21 QA PHB p.49) — Frenzy Berserker nv 3+.
           Antes dizia "PHB p.48 nv 2+" e minLevel:2 (divergência dupla: página E nível).
           PHB p.49 RAW: Berserker é SUBCLASS acessada no nv 3, Frenzy é o feature. */
        { n: 'Fúria Devastadora', ico: '', cost: 2, kind: 'attack', minLevel: 3, desc: 'Ataque brutal (PHB p.49 Berserker nv 3+) que só funciona em Fúria: 1d12 + STR extra.',
            requiresSubclass: 'berserker', /* REVIEW-#90 [8/17/25]: Frenesi (Berserker PHB p.49) — paridade c/ motor C3.5 */
            damageSpec: { n: 1, d: 12 }, dmgType: 'slashing',
            requiresBuff: 'furia',
            helpDnd5e: 'Frenesi / Frenzy (PHB p.49 — Caminho do Berserker nível 3): durante Fúria, um ataque extra como ação bônus a cada turno. Ao fim da Fúria, exaustão (1 nível).\nNeste fluxo: requer Fúria ativa (sem isso, usa-se Ataque Brutal normal); dano 1d12 + STR.\nV1.7 Sprint-17 Ronda 24 (2026-04-21 QA audit PHB p.49): corrigido `minLevel: 2 → 3` (PHB RAW — subclass Berserker é nv 3, não nv 2).' }
      ] },
    { cls: 'Patrulheiro', hp: [24, 34], ac: [14, 16], atk: [4, 6], die: 8, dex: [16, 18], ico: '', dmgMod: 3, attr: 'DEX',
      /* D&D 5e PHB p.89: Patrulheiro é meio-conjurador — Marca do Caçador e
         magias gastam ESPAÇOS DE MAGIA (= "Mana"), não "Energia". Alinha com a
         autoridade (src/game/classes/ranger.py herda resource_name "Mana").
         Sessão #67: D&D é regra, corrigir sempre. */
      res: { type: 'mp', name: 'Mana', ico: '', max: 6 },
      /* H1 (escolha autor 2026-04-19) — PHB-fiel sistema de subclasses:
         Patrulheiro escolhe Conclave no nível 3 (Beast Master, Hunter, Gloom Stalker,
         Horizon Walker, Monster Slayer, Fey Wanderer, Swarmkeeper, Drakewarden).
         Apenas Beast Master ganha Animal Companion. */
      subclasses: ['Beast Master', 'Hunter', 'Gloom Stalker'],
      defaultSubclass: 'Beast Master',
      /* V1.5 (2026-04-19, c) — Animal Companion (PHB p.93 — Beast Master subclass):
         companheiro animal permanente. Wolf default: HP 11, CA 13, atk +4,
         2d4+2 piercing. Pack Tactics no PHB original (vantagem se aliado adjacente)
         simplificado aqui pra match infra sem mecânica nova. */
      passives: [
          {
              id: 'animal_companion',
              kind: 'summon_combatant_passive',
              spawnInBattle: true,
              spawnPosition: 'rear_ally',
              /* H1 (escolha autor) — PHB-fiel: só Beast Master ganha. */
              requiresSubclass: 'Beast Master',
              helpDnd5e: 'Companheiro Animal (PHB p.93 — Beast Master Ranger): besta ' +
                         'pequena/média (Wolf default) que age junto. Stats Wolf: HP 11, ' +
                         'CA 13, atk +4, 2d4+2 piercing. Pack Tactics simplificado. ' +
                         'Persistente até morrer; retorna no próximo combate.',
              summonSpec: {
                  id: 'animal_companion',
                  /* PHB p.93 Beast Master Conclave: Wolf é o default canônico; outras
                     bestas TR ≤ 1/4 (Boar, Hawk, Mastiff, Panther) seriam opções no V2. */
                  name: 'Lobo',
                  ico: '',
                  hp: 11, mhp: 11, ac: 13,
                  dex: 15, wis: 12, con: 12, str: 12, int: 3, cha: 6,
                  atk: 4,
                  damageSpec: { n: 2, d: 4, flat: 2 },
                  dmgType: 'piercing',
                  die: 4,
                  multiAttack: 1,
                  /* F1 (escolha autor 2026-04-19) — PHB-fiel Beast Master (PHB p.93):
                     Wolf age na iniciativa do Patrulheiro, NÃO age sem comando.
                     noInit faz Wolf não pegar turno autônomo; Patrulheiro tem botão
                     "Comandar Wolf" no action sheet (consome AÇÃO; nível 5+ Extra Attack
                     permite arma + comando no mesmo turno). */
                  noInit: true,
                  /* G1 (escolha autor 2026-04-19) — Pack Tactics PHB MM p.341:
                     advantage no ataque se ≥1 aliado vivo (abstração de posicionamento). */
                  packTactics: true
              }
          }
      ],
      skills: [
        /* V1.7 Sprint-17 Ronda 10 (2026-04-21 QA PHB p.251) — Hunter's Mark target-specific.
           targetEnemy:true → auto-pick primeiro inimigo vivo. Bônus +1d6 SÓ contra alvo marcado. */
        { n: 'Marca do Caçador', ico: '', cost: 1, kind: 'buff', bonus: true, targetEnemy: true, desc: 'Ação bônus: marca o primeiro inimigo vivo — seus ataques contra ele ganham +1d6 de dano.',
            helpDnd5e: 'Marca do Caçador / Hunter\'s Mark (PHB p.251 — Patrulheiro nv 1): **AÇÃO BÔNUS**; concentração até 1h; +1d6 de dano por ataque contra o **alvo marcado** (dano de força); pode mover a marca com outra ação bônus se o alvo morrer.\nV1.7 (2026-04-21): targetEnemy:true → auto-pick 1º inimigo vivo. Bônus +1d6 SÓ contra alvo marcado (PHB RAW). Atacar outros alvos não ganha bônus.',
            buffSim: { id: 'marca_cacador', vfx: 'bless', decOn: 'round', turns: 3, kind: 'buff', condName: 'Marca do Caçador', condRule: 'PHB p.251 — BA cast; +1d6 dano por ataque contra alvo marcado (concentração).', dmgBonusDie: { n: 1, d: 6 }, concentration: true, markedTargetOnly: true } },
        { n: 'Tiro Certeiro', ico: '', cost: 2, kind: 'attack', desc: 'Disparo pesado: 2d8 + DEX',
            damageSpec: { n: 2, d: 8 },
            helpDnd5e: 'Dois dados de dano no acerto; vs CA normal.' },
        { n: 'Cura da Companhia', ico: '', cost: 2, kind: 'heal', desc: 'Restaura 2d6+1 PV em um aliado, com +1d6 extra a cada 4 níveis.',
            healSpec: { n: 2, d: 6, flat: 1, scaleByCasterLevel: { perLevels: 4 } },
            helpDnd5e: 'Cura em aliado. PHB upcast: motor escala +1d6 a cada 4 níveis do Patrulheiro.' },
        { n: 'Rajada de Flechas', ico: '', cost: 3, kind: 'attack', desc: 'Várias flechas: 3d6 + DEX',
            damageSpec: { n: 3, d: 6 },
            helpDnd5e: 'Resumo: rajada única 3d6 + modificador após acertar.' },
        { n: 'Tiro Preciso', ico: '', cost: 1, kind: 'attack', desc: 'Disparo calibrado: 1d10 + DEX com vantagem automática.',
            damageSpec: { n: 1, d: 10 }, dmgType: 'piercing',
            helpDnd5e: 'Atirador Afiado / Sharpshooter (PHB p.170 — talento): ignora meia/três-quartos de cobertura + opção -5 ataque/+10 dano. Neste fluxo: tiro com vantagem automática e dado maior (d10 no lugar de d8).' },
        { n: 'Passo Oculto', ico: '', cost: 1, kind: 'buff', desc: 'Encobre aliado (ou você) em névoa: vantagem em ataques até ser detectado (próximos 2 ataques).',
            shieldSpell: true, targetAlly: true,
            helpDnd5e: 'Passar sem Rastro (PHB p.288): +10 em Furtividade para alvos ao alcance. Neste fluxo: simplificado para vantagem nos próximos 2 ataques do patrulheiro.',
            buffSim: { id: 'passo_oculto', vfx: 'silent', decOn: 'after_npc', turns: 2, kind: 'buff', condName: 'Passo Oculto', condRule: 'PHB — +10 Furtividade; vantagem em ataques à distância enquanto oculto.', atkAdvantage: true } },
        { n: 'Invocar Lobo', ico: '', cost: 3, kind: 'buff',
            desc: 'Invoca um lobo espiritual aliado que luta por 3 rodadas (11 PV, CA 13, ataca 2d4+2).',
            summonBeast: {
                n: 'Lobo Espiritual', ico: '',
                hp: 11, ac: 13, atk: 4, die: 6,
                dmgMod: 2, attr: 'DEX',
                damageSpec: { n: 2, d: 4 }, flat: 2,
                /* V1.7 Sprint-17 (2026-04-21 QA PHB MM p.341) — Wolf INT 3 (não 7).
                   Stats PHB RAW: STR 12 DEX 15 CON 12 INT 3 WIS 12 CHA 6. */
                dex: 15, con: 12, wis: 12, str: 12, int: 3, cha: 6,
                duration: 3
            },
            helpDnd5e: 'Summon Beast (Tasha\'s — versão simplificada): 1 lobo espiritual ' +
                       'TR 1/4 que atua por 3 rodadas e ataca inimigos. Para invocar MATILHA ' +
                       '(4 lobos), veja "Conjurar Animais" (nível 9+).' },
        /* W2 (escolha autor 2026-04-20) — Conjurar Animais (PHB p.225 — Conjure Animals).
           Skill MAIOR que invoca matilha (4 lobos, slot 3). Patrulheiro nível 9+ apenas. */
        { n: 'Conjurar Animais', ico: '', cost: 5, kind: 'summon_pack',
            minLevel: 9,
            desc: 'Conjura 8 lobos espirituais (TR 1/4, Pack Tactics) — concentração: caem se você perder a concentração.',
            helpDnd5e: 'Conjurar Animais (PHB p.225 — Conjure Animals): magia de 3º nível ' +
                       'de Patrulheiro/Druida. Invoca espíritos feéricos em forma de bestas. ' +
                       'PHB literal: até 8 bestas TR 1/4 (Lobo é TR 1/4) por slot 3 — combat2 ' +
                       'invoca os 8 LOBOS. Duração: até 1 hora, CONCENTRAÇÃO (na arena, os lobos ' +
                       'se dissipam se você perder a concentração — TR CON ao sofrer dano, ou ao ' +
                       'conjurar outra magia de concentração). ' +
                       'ADAPTAÇÃO vs PHB: (a) gating minLevel:9; (b) sempre invoca Lobo. ' +
                       'Lobos têm Pack Tactics (Wolf MM p.341): vantagem em ataque se ≥1 aliado vivo.',
            packSpec: {
                count: 8,
                durTurns: 100,
                concentration: true,
                summonKind: 'conjure_animals_wolf',
                /* Stats Lobo PHB MM p.341 — idênticos ao Animal Companion */
                wolfSpec: {
                    name: 'Lobo (Conjurado)',
                    ico: '',
                    iconHeraldic: 'ic-animal_companion',
                    hp: 11, mhp: 11, ac: 13,
                    dex: 15, wis: 12, con: 12, str: 12, int: 3, cha: 6,
                    atk: 4,
                    damageSpec: { n: 2, d: 4, flat: 2 },
                    dmgType: 'piercing',
                    die: 4,
                    multiAttack: 1,
                    packTactics: true
                }
            } },
        /* V1.7 Sprint-12 (2026-04-21 closeout review) — Golpe de Armadilha (Ensnaring Strike PHB p.242):
           Patrulheiro nv 1. BA cast + próximo ataque em acerto → alvo CONTIDO (TR FOR) +
           1d6 piercing/turno. Arena stub: BA buff que adiciona dmgBonusDie 1d6 + nextHitAppliesDebuff Contido. */
        { n: 'Golpe de Armadilha', ico: '', cost: 2, kind: 'buff', bonus: true,
            desc: 'Ação bônus (PHB p.242): próximo atk em acerto — alvo CONTIDO + 1d6/turno.',
            helpDnd5e: 'Golpe de Armadilha / Ensnaring Strike (PHB p.242 — Patrulheiro nv 1): **AÇÃO BÔNUS**; concentração até 1 min. No próximo ataque com arma que você acertar, o alvo é envolvido por espinhos mágicos; TR FOR; em falha fica CONTIDO (Restrained PHB App.A) + 1d6 piercing no início de cada turno que permanecer contido.\nArena stub: buff BA concentration; próximo atk ganha dmgBonusDie:1d6 + nextHitAppliesDebuff aplica Contido (atkDisadv + targetedAdv + speed0 + repeatSave FOR) 3 rodadas.',
            /* V1.7 Sprint-17 Ronda 15 (2026-04-21 QA PHB p.242) — Ensnaring Strike
               upcast: +1d6 per slot above 1st. Patrulheiro nv 5 (2nd) 2d6, etc.
               Patrulheiro half caster: nv 2 (1st), nv 5 (2nd), nv 9 (3rd), nv 13 (4th), nv 17 (5th). */
            /* V1.7 Sprint-17 Ronda 28 (2026-04-21 QA PHB App.A Restrained): adicionado
               `restrained:true` no nextHitAppliesDebuff (ativa desvantagem TR DES). */
            buffSim: { id: 'ensnaring_strike', vfx: 'bless', decOn: 'after_npc', turns: 2, kind: 'buff', condName: 'Golpe de Armadilha (pronto)', condRule: 'PHB p.242 — próximo atk aplica Contido + 1d6 piercing (escala +1d6/slot).', dmgBonusDie: { n: 1, d: 6, scaleByCasterLevel: { breakpoints: [[5, 1], [9, 2], [13, 3], [17, 4]] } }, concentration: true, nextHitAppliesDebuff: { id: 'ensnared_restrained', turns: 3, n: 'Contido (Enredado)', ico: '', atkDisadvantage: true, targetedAdvantage: true, speed0: true, restrained: true, repeatSave: { ability: 'str' }, dndCondition: 'Contido (PHB App.A — Golpe de Armadilha)' } } },
        /* V1.7 Sprint-12 (2026-04-21 closeout review) — Chuva de Espinhos (Hail of Thorns PHB p.251):
           Patrulheiro nv 1. BA cast + próximo atk ranged em acerto → AOE 1d10 piercing em 1.5m TR DEX metade. */
        { n: 'Chuva de Espinhos', ico: '', cost: 2, kind: 'buff', bonus: true,
            desc: 'Ação bônus (PHB p.251): próximo atk ranged em acerto — AOE 1d10 piercing em 1,5m.',
            helpDnd5e: 'Chuva de Espinhos / Hail of Thorns (PHB p.251 — Patrulheiro nv 1): **AÇÃO BÔNUS**; concentração até 1 min. No próximo ataque à distância com arma que você acertar, chuva de espinhos cai em 1,5m; criaturas nesse raio fazem TR DES; em falha 1d10 piercing, em sucesso metade.\nArena stub: buff BA concentration; próximo atk ranged ganha dmgBonusDie:1d10 (representa AOE aplicado ao alvo primário em arena sem área).',
            /* V1.7 Sprint-17 Ronda 15 (2026-04-21 QA PHB p.251) — Hail of Thorns
               upcast: +1d10 per slot above 1st. Cap PHB: max 6d10. */
            buffSim: { id: 'hail_of_thorns', vfx: 'bless', decOn: 'after_npc', turns: 2, kind: 'buff', condName: 'Chuva de Espinhos (pronta)', condRule: 'PHB p.251 — próximo atk ranged +1d10 AOE (escala +1d10/slot).', dmgBonusDie: { n: 1, d: 10, scaleByCasterLevel: { breakpoints: [[5, 1], [9, 2], [13, 3], [17, 4]] } }, concentration: true, consumeOnHit: true } }
      ] },
    { cls: 'Bardo', hp: [20, 28], ac: [13, 15], atk: [4, 5], die: 6, dex: [14, 16], ico: '', dmgMod: 2, attr: 'CHA',
      res: { type: 'energia', name: 'Inspiração', ico: '', max: 8 },
      /* V1.5 (2026-04-19, c) — Find Familiar via Magical Secrets (PHB p.54+240).
         Bardo nível 10+ pode pegar Find Familiar como uma das suas Magical Secrets.
         Adaptação combat2: passive sempre disponível (simplificação pra UX). Stats
         idênticos ao Familiar do Mago. Tematicamente: Sprite (fada musical). */
      passives: [
          {
              id: 'familiar',
              kind: 'summon_combatant_passive',
              spawnInBattle: true,
              spawnPosition: 'rear_ally',
              /* I1 (escolha autor 2026-04-19) — PHB-fiel level gating: Magical Secrets
                 é feature de nível 10+ (PHB p.54). Bardo nível < 10 NÃO ganha familiar. */
              minLevel: 10,
              /* B1 (escolha autor) — Familiar requer ritual fora-de-combate. */
              preCombatRitual: true,
              helpDnd5e: 'Encontrar Familiar via Magical Secrets (PHB p.54 + p.240): ' +
                         'NÍVEL 10+ requerido. Magical Secrets permite ao Bardo escolher ' +
                         '2 magias de qualquer classe — uma escolha pode ser Find Familiar. ' +
                         'Stats Sprite: HP 4, CA 13, atk +4, 1d4+2 piercing. ' +
                         'Bardo nível 1-9: NÃO tem familiar (PHB-fiel). ' +
                         'ADAPTAÇÕES vs PHB: ' +
                         '(a) PHB Familiar não pode atacar (combat2 desabilita ataque via ' +
                         'noAttack:true — vira presença visual, conforme escolha A1 do autor); ' +
                         '(b) Cast 1h ritual + 10 Valdoritas — combat2 assume ritual já feito (vide ' +
                         'toggle no setup-frontend); ' +
                         '(c) Delivery de magias touch (PHB) não implementado.',
              summonSpec: {
                  id: 'familiar',
                  name: 'Sprite',
                  ico: '',
                  hp: 4, mhp: 4, ac: 13,
                  dex: 15, wis: 12, con: 10, str: 6, int: 6, cha: 6,
                  atk: 4,
                  damageSpec: { n: 1, d: 4, flat: 2 },
                  dmgType: 'piercing',
                  die: 4,
                  multiAttack: 1,
                  /* A1 (escolha do autor 2026-04-19) — PHB-fiel: Familiar NÃO ataca. */
                  noAttack: true
              }
          }
      ],
      skills: [
        /* V1.7 Sprint-17 (2026-04-21 QA PHB p.53) — Inspiração só em outro aliado
           (PHB RAW: "One creature other than yourself"). Antes tinha targetAlly:true
           permitindo self-cast — corrigido pra 'other' gateando self-cast. */
        { n: 'Inspiração', ico: '', cost: 1, kind: 'buff', bonus: true, desc: 'Ação bônus (PHB p.53): concede dado de inspiração a outro aliado — escala com seu nível (d6/d8/d10/d12).',
            blessSpell: true, targetAlly: 'other',
            helpDnd5e: 'Inspiração do Bardo / Bardic Inspiration (PHB p.53): **AÇÃO BÔNUS**. Uma criatura **diferente do Bardo** ao alcance recebe 1d6 (nível 1-4), 1d8 (5-9), 1d10 (10-14), 1d12 (15+). Pode adicionar o dado a um ataque, TR ou teste nos próximos 10 min.\nV1.7 Stage-FIX (2026-04-21): flag bonus:true adicionada.\nV1.7 Sprint-17 (2026-04-21): targetAlly:"other" — não pode mais castar em si mesmo (PHB RAW).',
            buffSim: { id: 'inspiracao', vfx: 'bless', decOn: 'round', turns: 3, kind: 'buff', condName: 'Inspiração do Bardo', condRule: 'PHB p.53 — BA cast; +1dX por ataque (tamanho escala por nível).', bardicInspiration: true } },
        /* V1.7 EFFECT-ADD (2026-04-21) — trovão estrondoso: alvo perde próxima BA (atordoado pelo som) */
        { n: 'Golpe Arcano', ico: '', cost: 2, kind: 'attack', desc: 'Truque: 2d6 de trovão + alvo perde próxima ação bônus.',
            damageSpec: { n: 2, d: 6 }, dmgType: 'thunder',
            helpDnd5e: 'Trovão Estrondoso / Thunderclap (PHB p.282 — truque): onda sonora explosiva; alvo faz TR CON ou toma 1d6 trovão.\nArena: 2d6 trovão + alvo perde próxima ação bônus (desorientação pelo som).',
            afterAttackEnemyDebuff: { id: 'golpe_arcano_deaf', turns: 1, n: 'Surdo (som)', ico: '', skipBonus: true, dndCondition: 'Ensurdecido temporário (perde BA)' } },
        /* V1.7 Sprint-17 (2026-04-21 QA PHB p.259) — useCastingMod CHA dinâmico. */
        { n: 'Palavra de Cura', ico: '', cost: 2, kind: 'heal', bonus: true, desc: 'Ação bônus (PHB p.259): 1d4+CAR PV à distância (+1d4 a cada 4 níveis).',
            healSpec: { n: 1, d: 4, useCastingMod: true, scaleByCasterLevel: { perLevels: 4 } },
            helpDnd5e: 'Palavra de Cura / Healing Word (PHB p.259 — Bardo nv 1): **AÇÃO BÔNUS**; alcance 18m; 1d4 + mod de conjuração CHA. Não funciona em construtos/mortos-vivos.\nUpcast: +1d4 por slot acima do 1º.\nArena: 1d4+3 base (3 = CHA mod stub); +1d4 a cada 4 níveis.\nV1.7 Sprint-17 (2026-04-21): era 2d4+2 — corrigido pra 1d4 RAW PHB.' },
        /* V1.7 EFFECT-ADD (2026-04-21) — psíquico + mente confusa: desvantagem próximo ataque */
        { n: 'Estocada Mental', ico: '', cost: 3, kind: 'attack', desc: 'Ataque psíquico: 2d6 + alvo com desvantagem no próximo ataque (mente confusa).',
            damageSpec: { n: 2, d: 6 }, dmgType: 'psychic',
            helpDnd5e: 'Estocada Mental (flavor Bardo): dano psíquico 2d6 + alvo sofre desvantagem em seu próximo ataque (mente confusa). Motor aplica atkDisadvantage no próximo d20 do NPC.',
            afterAttackEnemyDebuff: { id: 'estocada_mental', turns: 1, n: 'Mente Confusa', ico: '', atkDisadvantage: true, dndCondition: 'Mente confusa (desvantagem próximo ataque)' } },
        /* V1.7 Sprint-17 Ronda 25 (2026-04-21 QA PHB p.307) — Vicious Mockery é CANTRIP.
           PHB RAW: Bardo truque. Cost 1 → 0. Scale cantrip adicionado (1d4→2d4 nv5→3d4 nv11→4d4 nv17).
           Save WIS adicionado (PHB: TR SAB; em falha toma dano + desvantagem próx atk). */
        { n: 'Palavras Cruéis', ico: '', cost: 0, kind: 'attack', desc: 'Truque (PHB p.307): insulto mágico — TR SAB; em falha 1d4 psíquico + desvantagem próximo ataque.',
            damageSpec: { n: 1, d: 4 }, dmgType: 'psychic', scale: 'cantrip', save: { ability: 'wis' },
            helpDnd5e: 'Zombaria Cruel / Vicious Mockery (PHB p.307 — truque do Bardo): alvo faz TR SAB; em falha, recebe dano psíquico (1d4 em nível 1, escala com nível) e desvantagem na próxima rolagem de ataque antes do fim do próximo turno.\nEscala cantrip: 2d4 nv5, 3d4 nv11, 4d4 nv17.\nV1.7 Sprint-17 Ronda 25 (2026-04-21 QA PHB p.307): cost 1→0, save WIS adicionado, scale cantrip.',
            afterAttackEnemyDebuff: { id: 'zombaria_cruel', turns: 1, n: 'Zombaria', atkDisadvantage: true, dndCondition: 'Zombado (desvantagem próximo ataque)' } },
        /* V1.7 Sprint-17 Ronda 17 (2026-04-21 QA PHB p.236) — Dissonant Whispers:
           upcast +1d6 por slot acima do 1º. Downgraded skipTurn → skipBonus
           (PHB força movimento via reaction, não skip completo). */
        { n: 'Sussurros Dissonantes', ico: '', cost: 2, kind: 'attack', desc: 'Melodia tortuosa (PHB p.236): 3d6 psíquico (escala +1d6/slot). Alvo usa reação pra fugir, perde BA.',
            damageSpec: { n: 3, d: 6, scaleByCasterLevel: { breakpoints: [[3, 1], [5, 2], [7, 3], [9, 4], [11, 5], [13, 6], [15, 7], [17, 8]] } }, dmgType: 'psychic', save: { ability: 'wis' },
            helpDnd5e: 'Sussurros Dissonantes / Dissonant Whispers (PHB p.236 — Bardo nv 1): 1 action; alvo faz TR SAB; em falha 3d6 psíquico + usa reação pra mover velocidade máxima AWAY do caster (sem opp atk). Em sucesso: metade do dano.\nUpcast: +1d6 por slot acima do 1º.\nArena: dano + TR SAB; em falha perde BA (stub do movimento forçado).\nV1.7 Sprint-17 (2026-04-21): upcast adicionado; skipTurn → skipBonus (PHB-correto).',
            afterAttackEnemyDebuff: { id: 'sussurros_dissonantes', turns: 1, n: 'Recuando (Sussurros)', skipBonus: true, dndCondition: 'Movimento forçado (Dissonant Whispers — reaction consumida)' } },
        /* V1.7 Sprint-17 (2026-04-21 QA PHB p.259) — Canção de Cura = Mass Healing Word.
           useCastingMod dinâmico (CHA mod). Antes era 2d4+2 stub (divergência PHB). */
        { n: 'Canção de Cura', ico: '', cost: 3, kind: 'heal', desc: 'Melodia restauradora (PHB p.259): 1d4+CAR PV em todos aliados vivos.',
            healSpec: { n: 1, d: 4, useCastingMod: true }, healSpell: true, healAllAllies: true,
            helpDnd5e: 'Canção de Cura / Mass Healing Word (PHB p.259 — Bardo nv 3): **AÇÃO BÔNUS**; até 6 criaturas ao alcance recuperam 1d4+mod de conjuração CHA. Upcast: +1d4 por nível acima do 3º.\nNeste fluxo: 1d4+CHA_mod em TODOS aliados vivos.\nV1.7 Sprint-17 (2026-04-21): era 2d4+2 stub (divergência); agora 1d4 + CHA mod RAW.' },
        /* V1.7 Sprint-15 (2026-04-21 closeout review) — Calmar Emoções (Calm Emotions PHB p.221):
           Bardo/Clérigo nv 2. AOE esfera 6m TR CAR; remove Encantado/Amedrontado OU charma hostis. */
        { n: 'Calmar Emoções', ico: '', cost: 2, kind: 'buff',
            desc: 'AOE (PHB p.221): esfera 6m — remove Encantado/Amedrontado OU pacifica hostis.',
            cleansesConditions: ['charmed', 'frightened', 'charm_person', 'fear_spell'],
            helpDnd5e: 'Calmar Emoções / Calm Emotions (PHB p.221 — Bardo/Clérigo nv 2): 1 action; concentração 1 min. Esfera 6m. Humanoides fazem TR CAR; em falha, caster escolhe (a) remover Encantado OU Amedrontado (fica imune reapplied enquanto conc) OU (b) tornar indiferentes a hostis (não atacam enquanto conc, até sofrer dano).\nArena stub: usa cleansesConditions pattern (similar Stillness of Mind) — remove charmed/frightened dos aliados (inclui player). Opção b não modelada.' },
        /* V1.7 Sprint-15 (2026-04-21 closeout review) — Enfeitiçar Monstros (Charm Monster PHB p.226):
           Bardo/Feiticeiro/Bruxo/Druida/Mago nv 4. Variante superior do Charm Person, afeta qualquer criatura. */
        { n: 'Enfeitiçar Monstros', ico: '', cost: 4, kind: 'attack', minLevel: 7, dmgType: 'psychic',
            desc: 'Enchant (PHB p.226): TR SAB ou ENCANTADO 3 rodadas (afeta qualquer criatura).',
            damageSpec: { n: 0, d: 0 }, save: { ability: 'wis' },
            helpDnd5e: 'Enfeitiçar Monstros / Charm Monster (PHB p.226 — Bardo/Druida/Feiticeiro/Bruxo/Mago nv 4): 1 action; alvo qualquer criatura (não só humanoide como Charm Person). TR SAB; em falha ENCANTADO por 1h ou até dano. Vantagem TR se em combate.\nUpcast: +1 alvo por nível acima do 4º.\nArena: reusa pattern de Charm Person — 0 dano + debuff Charmed (cantAtkCaster + targetedAdvantage) 3 rodadas + repeatSave SAB.',
            afterAttackEnemyDebuff: { id: 'charm_monster', turns: 3, n: 'Encantado (Monstros)', ico: '', cantAtkCaster: true, targetedAdvantage: true, repeatSave: { ability: 'wis' }, dndCondition: 'Enfeitiçado (PHB App.A — Charm Monster)' } },
        /* V1.7 Sprint-6 (2026-04-21 closeout) — Enfeitiçar Pessoa (Charm Person PHB p.226) Bardo nv 1.
           Aplica condição ENFEITIÇADO (PHB Appendix A): alvo não pode atacar o conjurador nem
           alvejá-lo com efeito hostil; conjurador tem advantage em interações sociais com alvo.
           TR SAB (com advantage se alvo foi atacado pelo caster/companions). Arena stub: 3 rodadas. */
        /* V1.7 Sprint-17 Ronda 22 (2026-04-21 QA PHB p.226) — Charm Person humanoid-only. */
        { n: 'Enfeitiçar Pessoa', ico: '', cost: 2, kind: 'attack', dmgType: 'psychic', requiresTargetTag: ['humanoid'],
            desc: 'Encantamento (PHB p.226): TR SAB ou ENFEITIÇADO — não pode atacar você.',
            damageSpec: { n: 0, d: 0 }, save: { ability: 'wis' },
            helpDnd5e: 'Enfeitiçar Pessoa / Charm Person (PHB p.226 — Bardo/Mago/Feiticeiro/Bruxo/Druida nv 1): alvo humanoide faz TR SAB (com vantagem se em combate). Em falha fica ENCANTADO por 1h ou até você/aliados atacá-lo.\nEnfeitiçado (PHB Appendix A): não pode atacar/alvejar o conjurador com habilidades/magias hostis; conjurador com vantagem em testes sociais contra o alvo. NÃO incapacita (PHB-fix: old D&D tinha skip_turn — removido PHB 5e).\nArena stub: 0 dano + debuff Encantado 3 rodadas + flag `cantAtkCaster:true` + `targetedAdvantage:true` (representa aliados tirarem vantagem do estado).',
            afterAttackEnemyDebuff: { id: 'charm_person', turns: 3, n: 'Encantado', ico: '', cantAtkCaster: true, targetedAdvantage: true, repeatSave: { ability: 'wis' }, dndCondition: 'Enfeitiçado (PHB App.A — Charm Person)' } },
        /* V1.7 NEW (2026-04-21) — Palavras Cortantes (Cutting Words PHB p.55) — REAÇÃO Bardo nv3 (Lore) */
        { n: 'Palavras Cortantes', ico: '', cost: 1, kind: 'buff', reactionOnly: true,
            desc: 'REAÇÃO (PHB p.55 — Bardo Colégio do Saber nv 3): quando inimigo rola ataque/teste, subtrai 1 dado de Inspiração (1d6/1d8/1d10/1d12 por nível) da rolagem.',
            helpDnd5e: 'Palavras Cortantes / Cutting Words (PHB p.55 — Bardo Colégio do Saber nível 3): **REAÇÃO** quando uma criatura que você possa ver em 18m faz ataque/teste de habilidade/rolagem de dano. Gasta 1 uso de Inspiração do Bardo e subtrai o dado rolado (1d6 lvl 1-4, d8 lvl 5-9, d10 lvl 10-14, d12 lvl 15+) da rolagem.\nV1.7 NEW (2026-04-21): reactionOnly:true — triggada via reaction_prompt quando NPC rola ataque contra Bardo com Inspiração disponível. Stub arena: subtrai 1d6 do d20 do atacante (representa "atrapalha o ataque").\nCusto: 1 uso de Inspiração (flavor: gasta o carisma concentrado).',
            reactionReduce: { attackRoll: true, subtractDice: { n: 1, d: 6 }, scaleByLevel: { d8: 5, d10: 10, d12: 15 } } }
      ] },
    /* V1.7 Stage 4 (2026-04-21) — Monge (PHB p.76-79): classe ausente no CHAR_CLASSES
       até esta sessão. Martial artist DEX-based com pool de Ki + Martial Arts
       (unarmed d4→d6→d8→d10 por nível). ADAPTAÇÕES vs PHB:
       - Unarmored Defense (CA=10+DEX+WIS) representada por CA fixa 14-16 (stub).
       - Martial Arts upgrade dice fixo em d6 (sim não trackeia por nível; adaptação).
       - Ki é um resource pool genérico (`ki`) com max 5 (representa ~nível 5).
       - 4 skills canônicas de nível baixo: Flurry, Patient Defense, Step of the Wind,
         Golpe Atordoante (Stunning Strike lvl 5). */
    { cls: 'Monge', hp: [22, 32], ac: [14, 16], atk: [5, 7], die: 6, dex: [16, 18], ico: '', dmgMod: 3, attr: 'DEX',
      res: { type: 'ki', name: 'Ki', ico: '', max: 5 },
      skills: [
        /* V1.7 Sprint-17 (2026-04-21 QA PHB p.78) — Flurry of Blows Monge nv 2+. */
        { n: 'Rajada de Golpes', ico: '', cost: 1, kind: 'attack', bonus: true, requiresActionTaken: true, minLevel: 2, desc: 'Ação bônus (PHB p.78, nv 2+): imediatamente APÓS usar a ação Atacar, gasta 1 Ki para 2 golpes desarmados extras.',
            /* C2.9 #90: martialArtsDie — o `d` é substituído em runtime pelo dado
               de Artes Marciais escalado por nível (d4/d6/d8/d10, PHB p.78). */
            damageSpec: { n: 2, d: 6 }, martialArtsDie: true, dmgType: 'bludgeoning',
            helpDnd5e: 'Rajada de Golpes / Flurry of Blows (PHB p.78 — Monge nível 2): **AÇÃO BÔNUS**; gasta 1 ponto de Ki; imediatamente APÓS fazer a ação Atacar no seu turno, faz 2 ataques desarmados.\nV1.7 Stage-FIX (2026-04-21): flag `requiresActionTaken:true` — gate PHB-fiel impede cast sem Atacar antes. Badge "Ataque antes" no painel se tentar BA sem ter usado ação principal.\nNo arena: 2d6 bludgeoning condensa os 2 ataques desarmados. Custo: 1 Ki + BA.' },
        /* V1.7 Sprint-17 (2026-04-21 QA PHB p.78) — Patient Defense Monge nv 2+. */
        { n: 'Defesa Paciente', ico: '', cost: 1, kind: 'buff', bonus: true, minLevel: 2, desc: 'Ação bônus (PHB p.78, nv 2+): gasta 1 Ki para Esquivar — atacantes rolam com DESVANTAGEM até início do próximo turno.',
            helpDnd5e: 'Defesa Paciente / Patient Defense (PHB p.78 — Monge nível 2): **AÇÃO BÔNUS**; gasta 1 ponto de Ki; ação Esquivar (Dodge) no turno.\nPHB: ataques contra você ficam com DESVANTAGEM até o início do seu próximo turno (se puder ver o atacante). TRs de Destreza com vantagem.\nV1.7 Stage-FIX (2026-04-21): era `acBonus:2` stub — agora usa `enemyAtkDisadvantage:true` PHB-fiel (d20 do atacante rola com desvantagem, mecanicamente mais forte que +2 CA).',
            buffSim: { id: 'defesa_paciente', vfx: 'dodge', decOn: 'after_npc', turns: 1, kind: 'buff', condName: 'Defesa Paciente', condRule: 'PHB p.78 — BA + 1 Ki: atacantes visíveis rolam com DESVANTAGEM até início do próximo turno do monge.', enemyAtkDisadvantage: true } },
        /* V1.7 Sprint-17 (2026-04-21 QA PHB p.78) — Step of the Wind Monge nv 2+. */
        { n: 'Passo do Vento', ico: '', cost: 1, kind: 'buff', bonus: true, minLevel: 2, desc: 'Ação bônus (PHB p.78, nv 2+): gasta 1 Ki para Correr ou Desengajar — vantagem no próximo ataque.',
            helpDnd5e: 'Passo do Vento / Step of the Wind (PHB p.78 — Monge nível 2): **AÇÃO BÔNUS**; gasta 1 ponto de Ki; faz a ação Correr (Dash) ou Desengajar (Disengage).\nAlém disso: distância de salto dobrada pelo turno.\nNo arena: traduzido em vantagem no próximo ataque (efeito tático mais comum — posicionamento flanco).',
            buffSim: { id: 'passo_vento', vfx: 'silent', decOn: 'after_npc', turns: 1, kind: 'buff', condName: 'Passo do Vento', condRule: 'PHB p.78 — BA + 1 Ki: Correr/Desengajar traduzido em vantagem no próximo ataque.', atkAdvantage: true } },
        /* V1.7 Sprint-17 (2026-04-21 QA PHB audit) — Golpe Atordoante custo corrigido:
           PHB p.79 RAW = 1 Ki (rider on attack). Antes era cost:2 (inconsistente com
           desc que já falava "1 Ki"). Corrigido pra cost:1 PHB-fiel. */
        /* V1.7 Sprint-17 (2026-04-21 QA PHB p.79) — Stunning Strike Monge nv 5+. */
        { n: 'Golpe Atordoante', ico: '', cost: 1, kind: 'attack', minLevel: 5, desc: 'Ataque desarmado 1d6 + 1 Ki (PHB p.79 nv 5+): em acerto, alvo faz TR CON ou fica atordoado.',
            damageSpec: { n: 1, d: 6 }, dmgType: 'bludgeoning',
            helpDnd5e: 'Golpe Atordoante / Stunning Strike (PHB p.79 — Monge nível 5): quando atinge com ataque corpo-a-corpo, pode gastar 1 Ki para forçar TR CON (CD = 8 + prof + mod de SAB). Em falha, alvo atordoado até o fim do próximo turno do monge.\nAtordoado: incapacitado, não se move, ataques contra ele com vantagem, testes FOR/DES falham automaticamente (PHB Appendix A).\nV1.7 Stage-FIX (2026-04-21): era auto-stun sem TR (divergência RAW). Agora `saveOnHit.ability:"con"` aplica TR CON; em sucesso, debuff NÃO aplica (PHB-fiel).',
            /* V1.7 Sprint-17 Ronda 17 (2026-04-21 QA PHB App.A Stunned) — Atordoado
               completo: incapacitated + speed0 + autoFailStrDex + atacantes
               vantagem. Antes só tinha skipTurn (incompleto). */
            afterAttackEnemyDebuff: { id: 'atordoado_monge', turns: 1, n: 'Atordoado', ico: '', skipTurn: true, speed0: true, targetedAdvantage: true, autoFailStrDex: true, saveOnHit: { ability: 'con' }, dndCondition: 'Atordoado (PHB App.A — Stunning Strike)' } },
        /* V1.7 Sprint-12 (2026-04-21 closeout review) — Corpo Calmo (Stillness of Mind PHB p.79):
           Monge nv 7. Ação que remove efeitos Charmed ou Frightened do próprio monge. */
        /* V1.7 Sprint-17 (2026-04-21 QA PHB p.79) — Stillness of Mind Monge nv 7+. */
        { n: 'Corpo Calmo', ico: '', cost: 0, kind: 'buff', minLevel: 7,
            desc: 'Ação (PHB p.79, nv 7+): remove de si Encantado ou Amedrontado.',
            helpDnd5e: 'Corpo Calmo / Stillness of Mind (PHB p.79 — Monge nv 7): 1 ação; remove um efeito de Encantado OU Amedrontado de si mesmo.\nArena stub: cost 0 (feature, não magia); flag `cleansesConditions:[charmed, frightened]` — handler remove entries com esses IDs em se[]. Não consome recurso Ki (PHB: free feature).',
            cleansesConditions: ['charmed', 'frightened', 'charm_person'] },
        /* V1.7 NEW (2026-04-21) — Desviar Projéteis (Deflect Missiles PHB p.78) — REAÇÃO Monge nv3 */
        /* V1.7 Sprint-17 (2026-04-21 QA PHB p.78) — Deflect Missiles Monge nv 3+. */
        { n: 'Desviar Projéteis', ico: '', cost: 0, kind: 'buff', reactionOnly: true, minLevel: 3,
            desc: 'REAÇÃO (PHB p.78, nv 3+): quando atingido por ataque à distância — reduz dano em 1d10 + DEX + nível. Se reduzir a 0, pode gastar 1 Ki pra devolver.',
            helpDnd5e: 'Desviar Projéteis / Deflect Missiles (PHB p.78 — Monge nível 3): **REAÇÃO** quando atingido por ataque à distância com arma; reduz o dano em 1d10 + modificador de DES + nível de Monge.\nSe o dano zerar e for < 60m, pode gastar 1 ponto de Ki para fazer ataque à distância devolvendo o projétil (atk com prof + DEX, 1d6 + DEX).\nV1.7 NEW (2026-04-21): reactionOnly:true — triggada via reaction_prompt quando NPC acerta player Monge com ataque à distância (ranged). Stub arena: reduz dano 1d10+DEX+nível (sem devolução ativa).',
            reactionReduce: { ranged: true, reduceDice: { n: 1, d: 10 }, reduceStat: 'dex', reduceByLevel: true } },
      ] },
    /* V1.7 Stage 5 (2026-04-21) — Druida (PHB p.64-71): classe ausente no CHAR_CLASSES
       até esta sessão. Nature caster WIS-based. ADAPTAÇÕES vs PHB:
       - Wild Shape (PHB p.66 lvl 2): simplificado como buff self com +HP temp + dmgMod
         bonus (sem transformação real em beast form — arena não tem stats alternativos).
       - Spell slots → pool 'mp' 'Mana' max 9 (stub).
       - Armadura: Druida pode vestir hide (CA 14-16 simplificada). */
    { cls: 'Druida', hp: [22, 30], ac: [14, 16], atk: [4, 6], die: 6, dex: [12, 14], ico: '', dmgMod: 2, attr: 'WIS',
      res: { type: 'mp', name: 'Mana', ico: '', max: 9 },
      skills: [
        /* V1.7 Sprint-17 Ronda 25 (2026-04-21 QA PHB p.272) — Chama Sagrada é CANTRIP.
           PHB RAW: truques NÃO consomem slot/MP. Druida tinha cost: 1 (divergência).
           Corrigido pra cost: 0 igual NPCs (Acólito/Cultista) e Clérigo usam. */
        { n: 'Chama Sagrada', ico: '', cost: 0, kind: 'attack', desc: 'Truque (PHB p.272): chama celestial — TR DES; em falha, 1d8 radiante.',
            damageSpec: { n: 1, d: 8 }, dmgType: 'radiant', save: { ability: 'dex' },
            scale: 'cantrip',
            helpDnd5e: 'Chama Sagrada / Sacred Flame (PHB p.272 — truque): alvo faz TR DES (CD magia); em falha, 1d8 radiante. Aumenta para 2d8 nv 5, 3d8 nv 11, 4d8 nv 17.\nNão se beneficia de cobertura parcial.\nNo arena: damageSpec 1d8 com scale:cantrip (motor escala por nível).' },
        /* V1.7 Sprint-17 (2026-04-21 QA PHB p.223) — useCastingMod WIS dinâmico. */
        { n: 'Curar Ferimentos', ico: '', cost: 2, kind: 'heal', desc: 'Toque curativo: 1d8 + SAB em um alvo (próprio ou aliado).',
            healTargets: 'self', healSpec: { n: 1, d: 8, useCastingMod: true, scaleByCasterLevel: { perLevels: 4 } },
            helpDnd5e: 'Curar Ferimentos / Cure Wounds (PHB p.223): 1d8 + mod de conjuração ao conjurar em slot 1º; +1d8 por slot acima.\nNo arena: 1d8+2 base; motor escala +1d8 a cada 4 níveis.' },
        /* V1.7 Sprint-17 (2026-04-21 QA PHB p.259) — useCastingMod WIS dinâmico. */
        { n: 'Palavra de Cura', ico: '', cost: 2, kind: 'heal', bonus: true, healTargets: 'self',
            desc: 'Ação bônus (PHB p.259): 1d4+SAB PV à distância (+1d4 a cada 4 níveis).',
            healSpec: { n: 1, d: 4, useCastingMod: true, scaleByCasterLevel: { perLevels: 4 } }, healSpell: true,
            helpDnd5e: 'Palavra de Cura / Healing Word (PHB p.259 — Druida nv 1): **AÇÃO BÔNUS**; 18m; 1d4 + mod de conjuração SAB. Não funciona em construtos/mortos-vivos.\nUpcast: +1d4 por slot acima do 1º.\nArena: 1d4+3 base (3 = WIS mod stub); +1d4 a cada 4 níveis.\nV1.7 Sprint-17 (2026-04-21): era 2d4+2 — corrigido pra 1d4 RAW PHB.' },
        /* FASE 8 (sessão #82) — Forma Selvagem REAL (PHB p.66): kind:'wildshape'. O Druida
           escolhe a forma bestial num CARD e se transforma (stat block da fera substitui o seu).
           Antes era stub buff (+tempHp). REMOTE: motor (combat2_wildshape.py) é autoridade +
           manda `forms`. LOCAL: useWildShapeSkill usa WILD_SHAPE_FORMS_JS (combate.html). */
        { n: 'Forma Selvagem', ico: '', cost: 0, kind: 'wildshape', isWildShape: true, isClassFeature: true, minLevel: 2,
            desc: 'Transforma-se numa fera (PHB p.66): escolha a forma; o stat block da besta substitui o seu.',
            helpDnd5e: 'Forma Selvagem / Wild Shape (PHB p.66 — Druida nível 2): ação para se transformar numa besta que já viu (CR por nível: 1/4 nv2, 1/2 nv4, 1 nv8). Ganha HP/CA/ataques da fera; o PV da forma absorve o dano e o excesso volta pro PV normal. 2 usos por descanso.\nArena: escolha a forma no card; reverte ao reusar a habilidade ou quando a forma cai a 0 PV.' },
        /* V1.7 Sprint-17 (2026-04-21 QA PHB audit) — Invocar Raio é AOE (1.5m raio
           em torno do ponto escolhido). Adicionado multiTarget:true pra bater em
           todos os inimigos (arena simplifica "todos na área" como "todos vivos"). */
        /* V1.7 Sprint-17 (2026-04-21 QA PHB p.228) — Call Lightning upcast +1d10/slot acima 3º. */
        { n: 'Invocar Raio', ico: '', cost: 3, kind: 'attack', minLevel: 5, desc: 'Nuvem de tempestade (PHB p.228): 3d10 elétrico AOE (escala +1d10/slot acima 3º); TR DES metade.',
            damageSpec: { n: 3, d: 10, scaleByCasterLevel: { breakpoints: [[7, 1], [9, 2], [11, 3], [13, 4], [15, 5], [17, 6]] } }, dmgType: 'lightning', save: { ability: 'dex' }, multiTarget: true,
            helpDnd5e: 'Invocar Raio / Call Lightning (PHB p.228 — nível 3): invoca nuvem de tempestade; escolhe ponto e um raio desce causando 3d10 elétrico em criaturas em 1,5m (TR DES metade). Nas rodadas seguintes, pode gastar ação pra outro raio.\nUpcast: +1d10 por nível acima do 3º.\nV1.7 Sprint-17 (2026-04-21): era single-target (divergência) — agora multiTarget AOE PHB-correto.' },
        /* V1.7 Sprint-16 (2026-04-21 closeout review) — Chicote Espinhoso (Thorn Whip PHB p.282):
           Druida cantrip. Ranged spell atk 1d6 piercing + puxa alvo 3m. Reusa damageSpec+ranged+scale. */
        { n: 'Chicote Espinhoso', ico: '', cost: 0, kind: 'attack', dmgType: 'piercing', ranged: true,
            desc: 'Truque (PHB p.282): ranged 1d6 piercing (+ puxão não modelado).',
            damageSpec: { n: 1, d: 6 }, scale: 'cantrip',
            helpDnd5e: 'Chicote Espinhoso / Thorn Whip (PHB p.282 — Druida cantrip): 1 action; atk magia ranged (9m). Em acerto, 1d6 piercing + alvo Large ou menor é puxado até 3m em direção ao caster.\nEscala: 2d6 nv5, 3d6 nv11, 4d6 nv17.\nArena: damageSpec 1d6 piercing ranged + scale:cantrip. Puxão não modelado (sem grid).' },
        /* V1.7 Sprint-16 (2026-04-21 closeout review) — Passar sem Rastro (Pass Without Trace PHB p.264):
           Druida/Patrulheiro nv 2. Buff party stealth +10. Concentração 1h. */
        { n: 'Passar sem Rastro', ico: '', cost: 2, kind: 'buff',
            desc: 'Self (PHB p.264): +10 stealth → vantagem próximo atk (concentração).',
            helpDnd5e: 'Passar sem Deixar Rastro / Pass Without Trace (PHB p.264 — Druida/Patrulheiro nv 2): 1 action; concentração 1h. Caster e aliados em 9m ganham +10 em testes de Furtividade + impossíveis de rastrear (exceto magia).\nArena stub: buffSim atkAdvantage (representa surpresa tática da furtividade) + concentration 3 rodadas. Stealth checks não existem em combate.',
            buffSim: { id: 'pass_without_trace', vfx: 'silent', decOn: 'after_npc', turns: 3, kind: 'buff', condName: 'Passar sem Rastro', condRule: 'PHB p.264 — +10 stealth → vantagem atk (stub).', atkAdvantage: true, concentration: true } },
        /* V1.7 Sprint-13 (2026-04-21 closeout review) — Produzir Chama (Produce Flame PHB p.270):
           Druida cantrip. Cria chama na mão (luz 3m) + ranged spell atk 1d8 fogo.
           Reusa damageSpec + scale:cantrip + ranged. */
        { n: 'Produzir Chama', ico: '', cost: 0, kind: 'attack', dmgType: 'fire', ranged: true,
            desc: 'Truque (PHB p.270): chama à distância — 1d8 fogo (ranged spell atk).',
            damageSpec: { n: 1, d: 8 }, scale: 'cantrip',
            helpDnd5e: 'Produzir Chama / Produce Flame (PHB p.270 — Druida cantrip): 1 action; chama se acende na palma da mão (luz 3m brilhante, 3m penumbra) por 10 min. Quando arremessada: ataque de magia à distância (até 9m), 1d8 fogo em acerto; chama some ao arremessar.\nEscala cantrip: 2d8 nv5, 3d8 nv11, 4d8 nv17.\nArena: damageSpec 1d8 fire ranged + scale:cantrip.' },
        /* V1.7 Sprint-5 (2026-04-21 closeout) — Enredar (Entangle PHB p.246) Druida nv 1.
           Aplica condição CONTIDO (Restrained, PHB Appendix A) ao alvo: atk disadvantage +
           atacantes contra ele com advantage + velocidade 0. TR FOR ao final de cada turno. */
        { n: 'Enredar', ico: '', cost: 2, kind: 'attack', dmgType: 'nature',
            desc: 'Plantas (PHB p.246): TR FOR ou CONTIDO (Restrained) por 3 rodadas; TR FOR ao fim do turno.',
            damageSpec: { n: 0, d: 0 }, save: { ability: 'str' },
            helpDnd5e: 'Enredar / Entangle (PHB p.246 — Druida nv 1): plantas crescem num quadrado de 6m. Criaturas na área fazem TR FOR; em falha, ficam CONTIDAS (Restrained: atk disadv, atacantes atk adv, speed 0). Ao fim de cada turno, a criatura pode gastar ação pra repetir o TR.\nArena: dano 0 + debuff Contido por 3 rodadas, com repeatSave FOR.',
            /* V1.7 Sprint-17 Ronda 28 (2026-04-21 QA PHB App.A Restrained): adicionado flag
               `restrained:true` para ativar desvantagem em TRs DES (via _simSaveAdvState). */
            afterAttackEnemyDebuff: { id: 'entangle_restrained', turns: 3, n: 'Contido', ico: '', atkDisadvantage: true, targetedAdvantage: true, speed0: true, restrained: true, repeatSave: { ability: 'str' }, dndCondition: 'Contido (Restrained PHB App.A — Enredar)' } },
        /* V1.7 Sprint-15 (2026-04-21 closeout review) — Crescimento Espinhoso (Spike Growth PHB p.278):
           Druida/Patrulheiro nv 2. AOE 6m terrain difícil + 2d4 piercing/1.5m movido. Concentração 10min. */
        { n: 'Crescimento Espinhoso', ico: '', cost: 2, kind: 'attack', minLevel: 3, dmgType: 'piercing',
            desc: 'Terreno (PHB p.278): AOE 6m — 2d4 piercing + speed reduzido (concentração).',
            damageSpec: { n: 2, d: 4 }, multiTarget: true,
            helpDnd5e: 'Crescimento Espinhoso / Spike Growth (PHB p.278 — Druida/Patrulheiro nv 2): 1 action; concentração 10 min. AOE 6m raio com espinhos. Criaturas que moverem na área sofrem 2d4 piercing por 1,5m movido. Terreno difícil.\nArena stub: 0 dmg AOE único no cast + debuff speed0 + cold dmg 1x (simplificação — ongoing terrain não modelado sem grid).',
            afterAttackEnemyDebuff: { id: 'spike_growth', turns: 3, n: 'Terreno Espinhoso', ico: '', speed0: true, dndCondition: 'Terreno Espinhoso (PHB — Spike Growth; speed reduzido)' } },
        /* V1.7 Sprint-15 (2026-04-21 closeout review) — Plaga de Insetos (Insect Plague PHB p.253):
           Druida/Clérigo nv 5. AOE esfera 6m 4d10 piercing TR CON metade. Concentração 10min. */
        /* V1.7 Sprint-17 (2026-04-21 QA PHB p.253) — Insect Plague upcast +1d10/slot acima 5º. */
        { n: 'Plaga de Insetos', ico: '', cost: 4, kind: 'attack', minLevel: 9, dmgType: 'piercing',
            desc: 'AOE (PHB p.253): 4d10 piercing (escala +1d10/slot acima 5º); TR CON metade (concentração).',
            damageSpec: { n: 4, d: 10, scaleByCasterLevel: { breakpoints: [[11, 1], [13, 2], [15, 3], [17, 4]] } }, save: { ability: 'con' }, multiTarget: true,
            helpDnd5e: 'Plaga de Insetos / Insect Plague (PHB p.253 — Druida/Clérigo/Feiticeiro nv 5): 1 action; concentração 10 min. Enxame gafanhotos esfera 6m. Criaturas entrando/iniciando turno fazem TR CON; 4d10 piercing em falha, metade em sucesso. Heavily obscured (ocultamento pesado).\nUpcast: +1d10 por nível acima do 5º.\nArena: multiTarget + save + damageSpec + concentration.' },
        /* V1.7 Sprint-14 (2026-04-21 closeout review) — Feixe Lunar (Moonbeam PHB p.259):
           Druida nv 2. Cilindro 1.5m 2d10 radiant TR CON metade. Concentração 1 min.
           Reusa multiTarget + save + damageSpec + concentration. */
        /* V1.7 Sprint-17 (2026-04-21 QA PHB p.259) — Moonbeam upcast +1d10/slot acima 2º. */
        { n: 'Feixe Lunar', ico: '', cost: 2, kind: 'attack', minLevel: 3, dmgType: 'radiant',
            desc: 'Cilindro (PHB p.259): 2d10 radiante AOE (escala +1d10/slot acima 2º); TR CON metade (concentração).',
            damageSpec: { n: 2, d: 10, scaleByCasterLevel: { breakpoints: [[5, 1], [7, 2], [9, 3], [11, 4], [13, 5], [15, 6], [17, 7]] } }, save: { ability: 'con' }, multiTarget: true,
            helpDnd5e: 'Feixe Lunar / Moonbeam (PHB p.259 — Druida nv 2): 1 action; concentração 1 min. Feixe prateado cilindro 1,5m raio × 12m alto. Criaturas que entrarem OU começarem turno no feixe fazem TR CON; 2d10 radiante em falha, metade em sucesso. Formas de lobisomem com desvantagem.\nUpcast: +1d10 por nível acima do 2º.\nArena stub: cast aplica dano AOE 1x + concentration flag (ongoing não modelado — similar Spirit Guardians).' },
        /* V1.7 Sprint-7 (2026-04-21 closeout) — Contágio (Contagion PHB p.234) Druida nv 5.
           TR CON 3x — 3 falhas infligem doença. Arena stub: 1 falha → Exausto nv 1 (desvantagem em checks). */
        /* V1.7 Sprint-17 Ronda 18 (2026-04-21 QA PHB p.234) — Contágio RAW:
           Alvo é POISONED (não Exausto — divergência anterior). PHB: melee spell
           atk; em hit alvo poisoned + TR CON fim cada turno. 3 sucessos encerra,
           3 falhas infligem doença. Arena stub: Poisoned + repeatSave CON 3r. */
        { n: 'Contágio', ico: '', cost: 4, kind: 'attack', minLevel: 9, dmgType: 'necrotic',
            desc: 'Doença (PHB p.234): TR CON ou ENVENENADO 3 rodadas (atk/checks com desvantagem).',
            damageSpec: { n: 0, d: 0 }, save: { ability: 'con' },
            helpDnd5e: 'Contágio / Contagion (PHB p.234 — Druida/Clérigo nv 5): toca alvo com doença. Atk magia melee; em hit alvo fica ENVENENADO. TR CON fim de cada turno: 3 sucessos = encerra, 3 falhas = doença inflige (7 tipos PHB).\nEnvenenado (PHB App.A): atk/ability checks com desvantagem.\nArena stub: 0 dano + debuff Envenenado 3 rodadas + repeatSave CON.\nV1.7 Sprint-17 Ronda 18 (2026-04-21): era Exausto (divergência PHB) — corrigido pra Poisoned RAW.',
            afterAttackEnemyDebuff: { id: 'contagion_poisoned', turns: 3, n: 'Envenenado (Contágio)', ico: '', atkDisadvantage: true, abilityCheckDisadv: true, repeatSave: { ability: 'con' }, dndCondition: 'Envenenado (PHB App.A — Contágio)' } }
      ] },
    /* V1.7 Stage 6 (2026-04-21) — Feiticeiro (PHB p.99-108): CHA caster inato.
       ADAPTAÇÕES vs PHB:
       - Sorcery Points + Metamagic → simplificado como pool 'mp' max 10.
       - Origins (Draconic/Wild Magic) → não modeladas; classe base.
       - Cantrips + spells mesmos do Mago com flavor distinto (CHA vs INT). */
    { cls: 'Feiticeiro', hp: [20, 28], ac: [12, 13], atk: [3, 5], die: 6, dex: [14, 16], ico: '', dmgMod: 0, attr: 'CHA',
      res: { type: 'mp', name: 'Mana', ico: '', max: 10 },
      skills: [
        /* V1.7 Sprint-17 Ronda 25 (2026-04-21 QA PHB p.242) — Raio de Fogo é CANTRIP.
           PHB RAW: truques NÃO consomem slot/MP. Feiticeiro tinha cost: 1 (divergência).
           Corrigido pra cost: 0 igual NPCs (Aprendiz/Mago Hostil) usam. */
        { n: 'Raio de Fogo', ico: '', cost: 0, kind: 'attack', desc: 'Truque (PHB p.242): ataque de magia — 1d10 de fogo.',
            damageSpec: { n: 1, d: 10 }, dmgType: 'fire',
            scale: 'cantrip',
            helpDnd5e: 'Raio de Fogo / Fire Bolt (PHB p.242 — truque): ataque de magia à distância (CD não; usa CA). 1d10 fogo. Aumenta: 2d10 nv 5, 3d10 nv 11, 4d10 nv 17.\nNo arena: damageSpec 1d10 com scale:cantrip.\nV1.7 Sprint-17 Ronda 25 (2026-04-21 QA PHB p.242): cost 1 → 0 (cantrips não gastam slot RAW).' },
        /* V1.7 Sprint-17 (2026-04-21 QA PHB p.257) — Feiticeiro Magic Missile upcast. */
        { n: 'Míssil Mágico', ico: '', cost: 2, kind: 'attack', desc: 'Dardos de força autoHit. 3 base + 1 por slot acima (escala por nível).',
            dmgType: 'force', autoHit: true,
            magicMissiles: { count: 3, perDart: { n: 1, d: 4, flat: 1 }, scaleByCasterLevel: true },
            helpDnd5e: 'Mísseis Mágicos / Magic Missile (PHB p.257 — Feiticeiro nv 1): 3 dardos autohit 1d4+1 força.\nUpcast: +1 dardo por nível acima do 1º.\nArena (escala nível): 3 (nv 1-2) · 4 (nv 3-4) · 5 (nv 5-6) · 6 (nv 7-8) · 7 (nv 9+).' },
        /* REVIEW-#90 [13]: 'Raio Gélido' existia no pool L1 do motor (CLASS_INITIAL_CHOICES)
           mas NÃO no CHAR_CLASSES do sim — a escolha do jogador sumia em produção.
           Espelho da entry do motor (combat2_skills_data.py, Feiticeiro). */
        { n: 'Raio Gélido', ico: '', cost: 0, kind: 'attack', desc: 'Truque (PHB p.271): ranged 1d8 frio; em acerto reduz velocidade (stub).',
            damageSpec: { n: 1, d: 8 }, dmgType: 'cold',
            scale: 'cantrip',
            helpDnd5e: 'Raio Gélido / Ray of Frost (PHB p.271 — truque Feiticeiro/Mago): ataque de magia à distância; 1d8 frio; em acerto reduz a velocidade do alvo em 3m até o início do seu próximo turno. Escala cantrip: 2d8 nv 5, 3d8 nv 11, 4d8 nv 17.\nArena: redução de velocidade não modelada (sem grid).' },
        /* V1.7 Sprint-17 Ronda 15 (2026-04-21 QA PHB p.236) — Chaos Bolt upcast:
           +1d6 per slot above 1st. PHB damage: 2d8 + 1d6, tipo random.
           Arena stub: 2d8 force + escala +1d6/slot acima 1º. */
        /* V1.7 Sprint-17 Ronda 21 (2026-04-21 QA PHB p.236) — Chaos Bolt random type:
           chaosBoltRandomType:true → sim rola d8 a cada cast e define dmgType
           baseado no PHB table (ácido/frio/fogo/força/elétrico/necrótico/veneno/psíquico). */
        { n: 'Raio Caótico', ico: '', cost: 2, kind: 'attack', desc: 'Feiticeiro (PHB p.236): 2d8 + 1d6 dano tipo ALEATÓRIO (rola d8 no cast).', chaosBoltRandomType: true,
            damageSpec: { n: 2, d: 8, scaleByCasterLevel: { breakpoints: [[3, 1], [5, 2], [7, 3], [9, 4], [11, 5], [13, 6], [15, 7], [17, 8]] } }, dmgType: 'force',
            helpDnd5e: 'Raio Caótico / Chaos Bolt (PHB p.236 — Sorcerer exclusivo nível 1): ataque de magia; role 2d8 — tipo do dano é determinado pela soma (1:Ácido, 2:Frio, 3:Fogo, 4:Força, 5:Elétrico, 6:Necrótico, 7:Psíquico, 8:Radiante, 9:Trovão, 10-12:Veneno). Se 2d8 mostrarem mesmo número: salta pra alvo próximo.\nNo arena: dano fixo 2d8 force (tipo aleatório + salto simplificados).' },
        { n: 'Metamagia: Duplicar', ico: '', cost: 3, kind: 'buff', bonus: true, minLevel: 3, desc: 'Ação bônus (PHB p.101 Feiticeiro nv 3+): próxima magia de ataque alvo único atinge 2 alvos.',
            helpDnd5e: 'Feitiço Duplicado / Twinned Spell (PHB p.102 — Feiticeiro Metamagic): gasta pontos de feitiçaria = nível da magia (mín 1). Quando lança magia alvo único, pode direcionar a segundo alvo.\nNo arena: stub como buff bônus que marca próximo ataque como vantagem + 1d6 extra (representa o "segundo alvo" condensado).\nV1.7 Sprint-17 Ronda 24 (2026-04-21 QA audit PHB p.101): adicionada flag `minLevel: 3` (PHB RAW — Feiticeiro escolhe 2 Metamagics no nv 3, nunca no nv 1-2).',
            buffSim: { id: 'metamagia_duplicar', vfx: 'arcane', decOn: 'after_npc', turns: 2, kind: 'buff', condName: 'Metamagia: Duplicar', condRule: 'PHB p.101 — próxima magia alvo único atinge 2 alvos. Stub arena: vantagem + 1d6 dano no próximo ataque.', atkAdvantage: true, dmgBonusDie: { n: 1, d: 6 } } },
        /* V1.7 NEW (2026-04-21) — Passo Brumoso (Misty Step PHB p.260) — Feiticeiro tb tem */
        { n: 'Passo Brumoso', ico: '', cost: 2, kind: 'buff', bonus: true, minLevel: 3,
            desc: 'Ação bônus (PHB p.260 — 2º nível, nv 3+): teleport 9m — reposicionamento (vantagem próximo ataque).',
            helpDnd5e: 'Passo Brumoso / Misty Step (PHB p.260 — 2º nível): **AÇÃO BÔNUS**; teleport 9m.\nStub arena: vantagem no próximo ataque (reposicionamento tático).',
            buffSim: { id: 'passo_brumoso', vfx: 'arcane', decOn: 'after_npc', turns: 1, kind: 'buff', condName: 'Passo Brumoso', condRule: 'PHB p.260 — teleport 9m. Stub: vantagem próximo ataque.', atkAdvantage: true } },
        /* V1.7 NEW (2026-04-21) — Metamagia: Acelerar (Quickened Spell PHB p.101) */
        /* V1.7 Sprint-17 Ronda 24 (2026-04-21 QA audit PHB p.101): adicionada `minLevel: 3`
           (PHB RAW — Metamagics só disponível no nv 3+ Feiticeiro). */
        { n: 'Metamagia: Acelerar', ico: '', cost: 2, kind: 'buff', bonus: true, minLevel: 3,
            desc: 'Ação bônus (PHB p.101 Feiticeiro nv 3+): próxima magia de ação vira bônus — dispara rápido (vantagem + crítico estendido).',
            helpDnd5e: 'Feitiço Acelerado / Quickened Spell (PHB p.101 — Feiticeiro Metamagic): gasta 2 pontos de feitiçaria; a próxima magia que você lançar neste turno com tempo de 1 ação vira 1 ação bônus.\nArena stub: aplica vantagem + crítico estendido (19-20) no próximo ataque mágico (representa a velocidade do cast).\nV1.7 Sprint-17 Ronda 24 (2026-04-21 QA audit PHB p.101): adicionada flag `minLevel: 3`.',
            buffSim: { id: 'metamagia_acelerar', vfx: 'arcane', decOn: 'after_npc', turns: 1, kind: 'buff', condName: 'Metamagia: Acelerar', condRule: 'PHB p.101 — próxima magia ação vira bônus. Stub: vantagem + d6 no próximo ataque.', atkAdvantage: true, dmgBonusDie: { n: 1, d: 6 } } }
      ] },
    /* V1.7 Stage 7 (2026-04-21) — Bruxo (PHB p.105-115): CHA caster com pact patron.
       ADAPTAÇÕES vs PHB:
       - Pact Magic (limited slots regen on short rest) → pool 'mp' max 6 (menor
         que outros casters; representa "few slots but potent").
       - Eldritch Invocations não modeladas.
       - Patrons (Fiend/Archfey/Great Old One) não modelados; classe base.
       - Heraldic icon ic-bruxo NÃO EXISTE em heraldic-icons.js; usa ic-feiticeiro
         como fallback visual (arcana próxima). */
    { cls: 'Bruxo', hp: [20, 26], ac: [12, 14], atk: [3, 5], die: 6, dex: [14, 16], ico: '', dmgMod: 0, attr: 'CHA',
      /* D&D 5e PHB p.105: Bruxo usa MAGIA DE PACTO (Pact Magic) — poucos espaços
         que recarregam em descanso curto. Nome "Pacto" (não "Mana"), alinhado à
         autoridade (src/game/classes/warlock.py → resource_name "Pacto"). Tipo
         'mp' mantém abreviação MP/cor de conjurador (Pact Magic = espaços de
         magia). Sessão #67: D&D é regra, corrigir sempre. */
      res: { type: 'mp', name: 'Pacto', ico: '', max: 6 },
      skills: [
        /* V1.7 Sprint-17 Ronda 19 (2026-04-21 QA PHB p.244) — Eldritch Blast RAW:
           beams separados (1 atk vs 2 nv 5, 3 nv 11, 4 nv 17) via multiRayAttack
           + multiRayAttackBreakpoints. Cada raio é d20 vs CA independente, 1d10 force.
           Antes era scale:cantrip (escala dice, não beams — divergência PHB).
           Pattern reusado de Scorching Ray (Ronda 18). */
        /* V1.7 Sprint-17 Ronda 25 (2026-04-21 QA PHB p.244) — Eldritch Blast é CANTRIP.
           PHB RAW: truques NÃO consomem slot/MP. Divergência anterior: cost: 1. Agora cost: 0. */
        { n: 'Explosão Arcana', ico: '', cost: 0, kind: 'attack', dmgType: 'force', ranged: true,
            desc: 'Truque (PHB p.244): beams separados — 1 raio nv 1-4, 2 nv 5, 3 nv 11, 4 nv 17. Cada raio 1d10 força.',
            damageSpec: { n: 1, d: 10 },
            multiRayAttack: 1, multiRayAttackBreakpoints: [[5, 1], [11, 2], [17, 3]],
            helpDnd5e: 'Explosão Arcana / Eldritch Blast (PHB p.244 — truque Bruxo): ataque de magia ranged; 1d10 força on hit.\nEscala cantrip: **beams separados** (não dice scaling). Nv 1-4: 1 raio · Nv 5-10: 2 raios · Nv 11-16: 3 raios · Nv 17+: 4 raios.\nCada raio rola d20 vs CA independentemente (pode acertar/errar cada um).\nV1.7 Sprint-17 Ronda 19 (2026-04-21): scale:cantrip (dice) → multiRayAttackBreakpoints (beams) PHB RAW.\nV1.7 Sprint-17 Ronda 25 (2026-04-21 QA PHB p.244): cost 1 → 0 (cantrips não gastam slot RAW).' },
        /* V1.7 Sprint-17 Ronda 10 (2026-04-21 QA PHB p.251) — Hex target-specific.
           targetEnemy:true → auto-pick primeiro inimigo vivo. Bônus +1d6 SÓ contra alvo marcado. */
        { n: 'Maldição', ico: '', cost: 1, kind: 'buff', bonus: true, targetEnemy: true, desc: 'Ação bônus (PHB p.251): amaldiçoa primeiro inimigo — seus ataques contra ele ganham +1d6 necrótico.',
            helpDnd5e: 'Maldição / Hex (PHB p.251 — Bruxo nível 1): **AÇÃO BÔNUS**; amaldiçoa criatura; seus ataques contra **essa criatura** causam +1d6 necrótico adicional. Concentração até 1h. Se alvo morrer, pode mover a maldição com BA.\nV1.7 (2026-04-21): targetEnemy:true → auto-pick 1º inimigo vivo. Bônus SÓ contra alvo amaldiçoado (PHB RAW).',
            buffSim: { id: 'maldicao_hex', vfx: 'shadow', decOn: 'round', turns: 3, kind: 'buff', condName: 'Maldição (Hex)', condRule: 'PHB p.251 — BA cast; +1d6 necrótico por ataque contra alvo marcado (concentração).', dmgBonusDie: { n: 1, d: 6 }, concentration: true, markedTargetOnly: true } },
        { n: 'Repreensão Infernal', ico: '', cost: 2, kind: 'attack', reactionOnly: true, desc: 'REAÇÃO (PHB p.250): quando você é atingido por ataque — alvo faz TR DES ou toma 2d10 fogo.',
            damageSpec: { n: 2, d: 10 }, dmgType: 'fire', save: { ability: 'dex' },
            helpDnd5e: 'Repreensão Infernal / Hellish Rebuke (PHB p.250 — Bruxo nível 1): **REAÇÃO** tomada quando você é atingido por ataque e vê o atacante. Alvo faz TR DES; em falha, 2d10 fogo; em sucesso, metade.\nV1.7 Stage 7 (2026-04-21): reactionOnly:true — só triggada via reaction_prompt quando NPC te acerta (mesma infra do Escudo Arcano PHB p.275).' },
        /* V1.7 Sprint-17 Ronda 20 (2026-04-21 QA PHB p.216) — Bane RAW: -1d4 em
           atk rolls AND saves (não atkDisadvantage stub). Atk/Save penalty dice. */
        { n: 'Maldição da Fraqueza', ico: '', cost: 2, kind: 'attack', dmgType: 'necrotic', save: { ability: 'cha' },
            desc: 'Bane (PHB p.216): TR CAR ou -1d4 em atk rolls e TRs por 3 rodadas (concentração).',
            damageSpec: { n: 0, d: 0 },
            helpDnd5e: 'Maldição da Fraqueza / Bane (PHB p.216 — 1º nível): até 3 criaturas fazem TR CAR; em falha, **subtrai 1d4 de atk rolls E saves** por 1 min. Concentração.\nUpcast: +1 alvo por slot acima do 1º.\nV1.7 Sprint-17 Ronda 20 (2026-04-21): antes era atkDisadvantage stub. Agora PHB RAW: `atkPenaltyDie:{n:1,d:4}` + `savePenaltyDie:{n:1,d:4}` — rolam -1d4 em cada atk/save enquanto afetado.',
            afterAttackEnemyDebuff: { id: 'bane_curse', turns: 3, n: 'Maldição (Bane)', atkPenaltyDie: { n: 1, d: 4 }, savePenaltyDie: { n: 1, d: 4 }, concentration: true, dndCondition: 'Maldição (Bane — -1d4 em atk/TR)' } },
        /* V1.7 Sprint-14 (2026-04-21 closeout review) — Medo (Fear PHB p.245):
           Bruxo/Mago/Feiticeiro/Bardo nv 3. Cone 9m TR SAB ou AMEDRONTADO + flee.
           Reusa multiTarget + save + afterAttackEnemyDebuff (Frightened PHB App.A). */
        { n: 'Medo', ico: '', cost: 3, kind: 'attack', minLevel: 5, dmgType: 'psychic',
            desc: 'Cone (PHB p.245): TR SAB ou AMEDRONTADO + fugir 3 rodadas.',
            damageSpec: { n: 0, d: 0 }, save: { ability: 'wis' }, multiTarget: true,
            helpDnd5e: 'Medo / Fear (PHB p.245 — Bruxo/Mago/Feiticeiro/Bardo nv 3): 1 action; concentração 1 min. Cone 9m; criaturas fazem TR SAB; em falha, FICAM AMEDRONTADAS e DERRUBAM o que estão segurando + usam movimento pra fugir do caster (Dash).\nAmedrontado (PHB App.A): desvantagem em atk e checks enquanto fonte do medo visível.\nArena: 0 dano + debuff Frightened (atkDisadv + skipBonus) 3 rodadas + repeatSave SAB + concentration.',
            afterAttackEnemyDebuff: { id: 'fear_spell', turns: 3, n: 'Amedrontado (Medo)', ico: '', atkDisadvantage: true, skipBonus: true, repeatSave: { ability: 'wis' }, concentration: true, dndCondition: 'Amedrontado (PHB App.A — Fear)' } },
        /* V1.7 Sprint-13 (2026-04-21 closeout review) — Bruxaria (Witch Bolt PHB p.289):
           Bruxo/Feiticeiro/Mago nv 1. Ranged spell atk 1d12 lightning + concentration ongoing
           (BA turnos seguintes pra 1d12 automático no mesmo alvo).
           Reusa damageSpec + ranged + concentration. Ongoing como buff dmgBonusDie stub. */
        /* V1.7 Sprint-17 (2026-04-21 QA PHB p.289) — Witch Bolt upcast:
           +1d12 per slot level above 1st. Arena escala por nível do Bruxo
           (full caster). Base 1d12, nv 3: 2d12, nv 5: 3d12, nv 7: 4d12, nv 9: 5d12. */
        { n: 'Bruxaria', ico: '', cost: 2, kind: 'attack', dmgType: 'lightning', ranged: true,
            desc: 'Feitiço ranged (PHB p.289): 1d12 elétrico (base), escala até 5d12 por nível.',
            damageSpec: { n: 1, d: 12, scaleByCasterLevel: { breakpoints: [[3, 1], [5, 2], [7, 3], [9, 4]] } },
            helpDnd5e: 'Bruxaria / Witch Bolt (PHB p.289 — Bruxo/Feiticeiro/Mago nv 1): 1 action; ataque de magia à distância até 9m. Em acerto, 1d12 lightning + alvo conectado por arco elétrico. Nos turnos seguintes, ação BA repete 1d12 automático (sem atk roll) no mesmo alvo. Concentração até 1 min.\nUpcast: +1d12 na 1ª rolagem por nível acima do 1º.\nArena stub: atk inicial + damageSpec 1d12. Ongoing BA repeat não modelado (requer fluxo de skill-linked-to-target persistente).' },
        /* V1.7 Sprint-12 (2026-04-21 closeout review) — Armadura de Agathys (Armor of Agathys PHB p.215):
           Bruxo nv 1. 1 action — 5 HP temporário + 5 dano cold retaliation em melee atk contra caster. */
        { n: 'Armadura de Agathys', ico: '', cost: 1, kind: 'buff',
            desc: 'Armadura gelada (PHB p.215): +5 PV temp + 5 cold em atacantes corpo-a-corpo.',
            helpDnd5e: 'Armadura de Agathys / Armor of Agathys (PHB p.215 — Bruxo nv 1): 1 action; ganha 5 HP temporários por 1h. Enquanto tiver esses HP temp, criaturas que acertar você em melee sofrem 5 cold damage retaliatório.\nUpcast: +5 temp HP e +5 retaliação por nível acima do 1º.\nArena stub: buff self com tempHp:5 + coldRetaliation:5 (flag). Runtime apenas tempHp já funciona (absorve dano); retaliation é documentação — requer hook futuro em _try_npc_attack_on_player.',
            /* V1.7 Sprint-17 Ronda 16 (2026-04-21 QA PHB p.215) — Armor of Agathys
               upcast: +5 tempHp + 5 cold retaliation per slot above 1st.
               Bruxo slot progression: nv 1 (1st)=5, nv 3 (2nd)=10, nv 5 (3rd)=15,
               nv 7 (4th)=20, nv 9+ (5th)=25. */
            buffSim: { id: 'armor_of_agathys', vfx: 'arcane', decOn: 'round', turns: 3, kind: 'buff', condName: 'Armadura de Agathys', condRule: 'PHB p.215 — 5 PV temp (+5/slot) + 5 cold retaliation melee.', tempHp: 5, tempHpScaleByLevel: { breakpoints: [[3, 5], [5, 10], [7, 15], [9, 20]] }, coldRetaliation: 5 } },
        /* V1.7 Sprint-12 (2026-04-21 closeout review) — Golpe de Lâmina Sombria (Shadow Blade PHB p.275):
           Bruxo/Feiticeiro/Mago nv 2. BA cast — invoca arma 2d8 psychic + vantagem em atk em escuridão.
           Arena stub: BA buff com dmgBonusDie:2d8 próximo atk (concentração). */
        { n: 'Lâmina Sombria', ico: '', cost: 2, kind: 'buff', bonus: true, minLevel: 3,
            desc: 'Ação bônus (PHB p.275): invoca arma sombria — próximo atk +2d8 psíquico.',
            helpDnd5e: 'Golpe de Lâmina Sombria / Shadow Blade (PHB p.275 — Bruxo/Feiticeiro/Mago nv 2): **AÇÃO BÔNUS**; concentração até 1 min. Invoca espada de sombras (2d8 psíquico, finesse/light/thrown); vantagem em atk contra alvos em escuridão/penumbra. Upcast: +1d8 no nv 3, +2d8 no nv 5, +3d8 no nv 7.\nArena stub: buff BA concentration; próximo atk ganha dmgBonusDie:2d8 psychic. Em stub arena sem luz-tracking, não aplica vantagem automática.',
            buffSim: { id: 'shadow_blade', vfx: 'shadow', decOn: 'after_npc', turns: 2, kind: 'buff', condName: 'Lâmina Sombria', condRule: 'PHB p.275 — próximo atk +2d8 psíquico.', dmgBonusDie: { n: 2, d: 8 }, concentration: true } }
      ],
      /* PHB p.107 Pacto da Corrente — o familiar é COMANDADO pelo Bruxo na arena
         ("forgo one of your own attacks to allow your familiar to make one attack"):
         noInit (sem turno próprio); comandar consome a AÇÃO (Bruxo sem Ataque Extra
         → ação inteira). Gate por `requiresWarlockPact` (NÃO subclass — o patrono
         Fiend/Archfey/GOO continua sendo a subclasse). Stats vêm do
         chain_familiar_spec (Python, por tipo: Diabrete/Pseudodragão/Quasit/Sprite). */
      passives: [
        { id: 'chain_familiar', kind: 'summon_combatant_passive', spawnInBattle: true,
          requiresWarlockPact: 'chain',
          summonSpec: {
            name: 'Familiar', ico: '', hp: 10, mhp: 10, ac: 13,
            atk: 5, die: 4, dex: 14, wis: 12, con: 10, str: 6, int: 10, cha: 10,
            multiAttack: 1, damageSpec: { n: 1, d: 4, flat: 3 }, dmgType: 'piercing',
            iconHeraldic: 'ic-familiar', noInit: true
          } }
      ] },
];

var CHAR_RACES = ['Humano', 'Anão', 'Elfo', 'Gnomo', 'Meio-Elfo', 'Meio-Orc', 'Draconato', 'Tiefling', 'Halfling'];

/* Belt-and-suspenders: garantir window.X ainda em strict-mode contexts. */
if (typeof window !== 'undefined') {
    window.BESTIARY = BESTIARY;
    window.CHAR_NAMES = CHAR_NAMES;
    window.CHAR_CLASSES = CHAR_CLASSES;
    window.CHAR_RACES = CHAR_RACES;
}
