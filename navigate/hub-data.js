/* hub-data.js — Mock data for Hub de Regioes (will be replaced by backend payload) */

var BIOME_META = {
  plains:    { name: 'Planicies Verdes',     icon: '\u{1F33E}', gradient: 'linear-gradient(135deg,#3a3518,#4a4528,#3a3018)' },
  forest:    { name: 'Bosques Sussurrantes',  icon: '\u{1F332}', gradient: 'linear-gradient(135deg,#1a3020,#2a4030,#1a2a18)' },
  swamp:     { name: 'Pantanos Brumosos',     icon: '\u{1F33F}', gradient: 'linear-gradient(135deg,#1a2a1e,#2a3a26,#1a201a)' },
  mountain:  { name: 'Picos de Pedra',        icon: '\u26F0\uFE0F',  gradient: 'linear-gradient(135deg,#2a2830,#3a3838,#2a2a28)' },
  desert:    { name: 'Areias Douradas',       icon: '\u{1F3DC}\uFE0F',  gradient: 'linear-gradient(135deg,#4a3a18,#5a4a28,#4a3018)' },
  snow:      { name: 'Terras Congeladas',     icon: '\u2744\uFE0F',  gradient: 'linear-gradient(135deg,#2a3038,#3a4048,#2a3038)' },
  cave:      { name: 'Cavernas Profundas',    icon: '\u{1F573}\uFE0F',  gradient: 'linear-gradient(135deg,#1a1518,#2a2028,#1a1218)' },
  volcanic:  { name: 'Cratera Ardente',       icon: '\u{1F30B}',  gradient: 'linear-gradient(135deg,#3a1a10,#4a2a18,#3a1810)' },
  graveyard: { name: 'Cemiterio Antigo',      icon: '\u{1FAA6}',  gradient: 'linear-gradient(135deg,#1a1520,#2a2028,#1a1518)' }
};

var WEATHER_NAMES = {
  clear: '\u2600\uFE0F Limpo', cloudy: '\u2601\uFE0F Nublado', light_rain: '\u{1F327}\uFE0F Chuva',
  fog: '\u{1F32B}\uFE0F Nevoeiro', wind: '\u{1F4A8} Vento', snow: '\u2744\uFE0F Nevasca',
  heat: '\u{1F525} Calor', sandstorm: '\u{1F32A}\uFE0F Tempestade', ash_fall: '\u{1F30B} Cinzas'
};

var DANGER_LABELS = ['Seguro', 'Baixo', 'Baixo', 'Moderado', 'Alto', 'Alto', 'Perigoso', 'Perigoso', 'Letal'];

/* Relative difficulty tiers — player level vs location danger */
var DIFF_TIERS = [
    { max: -3, label: 'Fácil',          color: '#4caf50', icon: '🟢' },
    { max: -1, label: 'Normal',         color: '#c4953a', icon: '🟡' },
    { max:  1, label: 'Perigoso',       color: '#f97316', icon: '🟠' },
    { max:  3, label: 'Muito Perigoso', color: '#ef4444', icon: '🔴' },
    { max:  5, label: 'Extremo',        color: '#dc2626', icon: '💀' },
    { max: 99, label: 'Lendário',       color: '#9333ea', icon: '☠️' },
];
function getRelativeDifficulty(danger, playerLv) {
    var diff = danger - playerLv;
    for (var i = 0; i < DIFF_TIERS.length; i++) {
        if (diff <= DIFF_TIERS[i].max) return { label: DIFF_TIERS[i].label, color: DIFF_TIERS[i].color, icon: DIFF_TIERS[i].icon, tier: i };
    }
    return DIFF_TIERS[DIFF_TIERS.length - 1];
}

var TERRAIN_LABELS = {
  plains: 'Normal', forest: 'Dificil', swamp: 'Dificil',
  mountain: 'Dificil', desert: 'Dificil', snow: 'Dificil',
  cave: 'Dificil', volcanic: 'Dificil', graveyard: 'Normal'
};

var FORAGE_LABELS = {
  plains: 'Bom', forest: 'Excelente', swamp: 'Moderado',
  mountain: 'Moderado', desert: 'Fraco', snow: 'Fraco',
  cave: 'Fraco', volcanic: 'Nenhum', graveyard: 'Nenhum'
};

/* Mock state — simulates what backend sends */
var MOCK_STATE = {
  currentLoc: 'city_gates',
  charData: { nm: 'Aldric', lv: 5, hp: 38, mh: 50, mp: 18, mm: 30, gp: 245 },
  regions: {
    plains: {
      locs: [
        { id: 'city_gates', n: 'Portoes de Valdoria', i: '\u{1F3F0}', d: 0, ds: 'A grande muralha se ergue imponente. Estandartes dourados tremulam.', s: 1 },
        { id: 'green_fields', n: 'Campos Verdes', i: '\u{1F33E}', d: 1, ds: 'Ondas de trigo dourado se estendem ate o horizonte.' },
        { id: 'orc_tribe', n: 'Tribo dos Orcs', i: '\u2694\uFE0F', d: 3, ds: 'Tendas de couro e fogueiras marcam o acampamento orc.' },
        { id: 'bandit_fortress', n: 'Fortaleza Bandida', i: '\u{1F3F0}', d: 5, ds: null }
      ],
      discovered: ['city_gates', 'green_fields', 'orc_tribe'],
      quests: 2,
      dungeons: 0,
      settlements: []
    },
    forest: {
      locs: [
        { id: 'whispering_woods', n: 'Bosques Sussurrantes', i: '\u{1F332}', d: 2, ds: 'Arvores centenarias guardam segredos. Luzes estranhas entre as copas.' },
        { id: 'goblin_nest', n: 'Ninho dos Goblins', i: '\u{1F47A}', d: 3, ds: null },
        { id: 'elven_ruins', n: 'Ruinas Elficas', i: '\u{1F3DB}\uFE0F', d: 4, ds: null }
      ],
      discovered: ['whispering_woods'],
      quests: 1,
      dungeons: 1,
      dungeonNames: ['Covil do Lobo Cinzento'],
      settlements: []
    },
    swamp: {
      locs: [
        { id: 'misty_marshes', n: 'Pantanos Brumosos', i: '\u{1F33F}', d: 3, ds: 'Nevoa densa cobre o chao lamacento. Sons inquietantes ecoam.' },
        { id: 'ancient_cemetery', n: 'Cemiterio Ancestral', i: '\u{1FAA6}', d: 4, ds: null },
        { id: 'deep_swamp', n: 'Pantano Profundo', i: '\u{1F40D}', d: 5, ds: null }
      ],
      discovered: ['misty_marshes'],
      quests: 0,
      dungeons: 2,
      dungeonNames: ['Catacumbas Esquecidas', 'Templo Submerso'],
      settlements: []
    },
    mountain: {
      locs: [
        { id: 'stone_peaks', n: 'Picos de Pedra', i: '\u26F0\uFE0F', d: 4, ds: 'Ventos cortantes uivam entre os picos nevados.' },
        { id: 'troll_cave', n: 'Caverna dos Trolls', i: '\u{1F9CC}', d: 5, ds: null },
        { id: 'dragon_pass', n: 'Passagem do Dragao', i: '\u{1F409}', d: 6, ds: null },
        { id: 'underground_passage', n: 'Passagem Subterranea', i: '\u{1F573}\uFE0F', d: 4, ds: null },
        { id: 'korthag', n: 'Korthag', i: '\u{1F3D8}\uFE0F', d: 3, ds: 'Vila de mineradores aninhada entre os picos.', s: 1 }
      ],
      discovered: ['stone_peaks'],
      quests: 1,
      dungeons: 1,
      dungeonNames: ['Fortaleza dos Ventos'],
      settlements: ['Korthag']
    },
    desert: {
      locs: [
        { id: 'golden_sands', n: 'Areias Douradas', i: '\u{1F3DC}\uFE0F', d: 4, ds: 'Dunas infinitas sob um sol implacavel.' }
      ],
      discovered: [],
      quests: 0, dungeons: 0, settlements: []
    },
    snow: {
      locs: [
        { id: 'frozen_waste', n: 'Terras Congeladas', i: '\u2744\uFE0F', d: 5, ds: 'Gelo eterno cobre a paisagem desolada.' }
      ],
      discovered: [],
      quests: 0, dungeons: 0, settlements: []
    },
    cave: {
      locs: [
        { id: 'underground_caves', n: 'Cavernas Subterraneas', i: '\u{1F573}\uFE0F', d: 3, ds: 'Tuneis sombrios se estendem nas profundezas.' },
        { id: 'crystal_depths', n: 'Profundezas Cristalinas', i: '\u{1F48E}', d: 5, ds: null }
      ],
      discovered: [],
      quests: 0, dungeons: 3,
      dungeonNames: ['Mina Perdida', 'Cripta do Dragao Negro', 'Portal Dimensional'],
      settlements: []
    },
    volcanic: {
      locs: [
        { id: 'burning_crater', n: 'Cratera Ardente', i: '\u{1F30B}', d: 8, ds: 'Lava borbulha entre rochas enegrecidas.' },
        { id: 'valkrest', n: 'Valkrest', i: '\u{1F3D5}\uFE0F', d: 5, ds: 'Acampamento de aventureiros temerarios.', s: 1 }
      ],
      discovered: [],
      quests: 0, dungeons: 2,
      dungeonNames: ['Cripta do Dragao Negro', 'Portal Dimensional'],
      settlements: ['Valkrest']
    },
    graveyard: {
      locs: [
        { id: 'ancient_graveyard', n: 'Cemiterio Antigo', i: '\u{1FAA6}', d: 3, ds: 'Lapides cobertas de musgo se alinham em fileiras infinitas.' }
      ],
      discovered: [],
      quests: 0, dungeons: 2,
      dungeonNames: ['Catacumbas Esquecidas', 'Salao do Rei Lich'],
      settlements: []
    }
  },
  weather: {
    plains: 'clear', forest: 'light_rain', swamp: 'fog', mountain: 'wind',
    desert: 'heat', snow: 'snow', cave: 'clear', volcanic: 'heat', graveyard: 'fog'
  },
  /* Mock aliados — mesmo esquema compacto do backend (pt) */
  party: [
    {
      id: 'mock_ally_1',
      n: 'Brenna',
      c: 'Ladino',
      l: 3,
      ico: '\u{1F5E1}',
      hp: 18,
      mhp: 22,
      apr: 12,
      aff: 0
    }
  ]
};
