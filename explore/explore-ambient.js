/* ── Explore Ambient Flavor (Tier 2 Immersion) ──
 * Periodic biome-specific atmospheric text during exploration.
 * Hooks into the existing showTerrainToast() system.
 */
'use strict';

var _AMBIENT_INTERVAL = 8; /* Show flavor every N steps (randomized 8-12) */
var _ambientStepCounter = 0;
var _ambientNextTrigger = 8 + Math.floor(Math.random() * 5);

/* Biome flavor pools — 4-5 lines per biome */
var _BIOME_FLAVOR = {
  forest: [
    'O vento sussurra entre as copas das arvores.',
    'Folhas secas estalham sob seus pes.',
    'Um passaro canta ao longe, ecoando pela floresta.',
    'A luz do sol filtra entre os galhos, criando sombras dancantes.',
    'O cheiro de terra umida e musgo preenche o ar.'
  ],
  plains: [
    'A brisa carrega o perfume de ervas selvagens.',
    'O horizonte se estende em todas as direcoes.',
    'Rastros de animais cruzam o caminho a sua frente.',
    'O sol aquece suas costas enquanto voce avanca.',
    'Nuvens projetam sombras que correm pela planicie.'
  ],
  swamp: [
    'Bolhas sobem lentamente da agua turva.',
    'O ar e denso e umido, grudando na pele.',
    'Insetos zumbem ao redor, incessantes.',
    'Raizes retorcidas emergem da lama como dedos ossudos.',
    'Um cheiro acre de vegetacao podre paira no ar.'
  ],
  cave: [
    'Gotas de agua ecoam nas paredes de pedra.',
    'A escuridao parece ter peso proprio aqui dentro.',
    'Cristais brilham fracamente nas paredes da caverna.',
    'O som dos seus passos ressoa longamente no tunel.',
    'O ar fica mais frio a cada metro adiante.'
  ],
  desert: [
    'O calor ondula no horizonte como miragens.',
    'Areia fina se acumula nas dobras da sua armadura.',
    'Um vento quente traz consigo graos de areia.',
    'Ossos branqueados pelo sol marcam uma trilha antiga.',
    'O silencio do deserto e quase ensurdecedor.'
  ],
  mountain: [
    'O vento gelado uiva entre os picos rochosos.',
    'Pedras soltas rolam montanha abaixo ao seu toque.',
    'A altitude faz o ar parecer mais fino.',
    'Nuvens passam ao nivel dos seus olhos.',
    'Cabras montanhesas observam de um penhasco distante.'
  ],
  snow: [
    'Flocos de neve derretem ao tocar sua pele.',
    'Seus passos afundam na neve fresca.',
    'O silencio da neve e quebrado apenas pelo vento.',
    'O gelo cobre cada superficie como um manto de cristal.',
    'A paisagem branca cega sob a luz palida do sol.'
  ],
  volcanic: [
    'O chao treme levemente sob seus pes.',
    'Fissuras no solo emanam um calor intenso.',
    'O cheiro de enxofre queima suas narinas.',
    'Rochas incandescentes brilham na penumbra.',
    'Cinzas vulcanicas flutuam no ar como neve negra.'
  ],
  graveyard: [
    'Uma neblina baixa rasteja entre as lapides.',
    'O silencio e pontilhado por rangidos distantes.',
    'Flores murchas adornam tumulos esquecidos.',
    'Uma sensacao gelida percorre sua espinha.',
    'Corvos observam cada movimento seu em silencio.'
  ]
};

/* Breadcrumb hints — when revisiting an area */
var _BREADCRUMB_HINTS = [
  'Voce reconhece este trecho da trilha.',
  'Suas pegadas antigas ainda marcam o caminho.',
  'Este lugar parece familiar...',
  'Voce ja passou por aqui antes.'
];

var _breadcrumbShown = {};
var _lastFlavorBiome = '';

/**
 * Called from tickConditions() via explore-core.js hook.
 * Checks if ambient flavor should trigger.
 */
window._tickAmbientFlavor = function() {
  if (!window.S || !S.biome) return;
  _ambientStepCounter++;

  /* Breadcrumb: if revisiting a hex, show hint (once per hex) */
  var hexKey = S.playerCol + ',' + S.playerRow;
  var visited = S.visited;
  if (visited && visited.has && visited.has(hexKey) && !_breadcrumbShown[hexKey]) {
    /* Only show breadcrumb if player has visited many hexes (not backtracking immediately) */
    if (visited.size > 10 && Math.random() < 0.3) {
      _breadcrumbShown[hexKey] = true;
      var hint = _BREADCRUMB_HINTS[Math.floor(Math.random() * _BREADCRUMB_HINTS.length)];
      if (typeof showTerrainToast === 'function') showTerrainToast(hint, 'flavor');
      return; /* Don't show ambient + breadcrumb on same step */
    }
  }

  /* Ambient flavor: periodic biome-specific text */
  if (_ambientStepCounter >= _ambientNextTrigger) {
    _ambientStepCounter = 0;
    _ambientNextTrigger = 8 + Math.floor(Math.random() * 5); /* Next trigger in 8-12 steps */

    var biome = S.biome || 'forest';
    var pool = _BIOME_FLAVOR[biome] || _BIOME_FLAVOR['forest'];
    if (!pool || pool.length === 0) return;

    /* Avoid repeating same text consecutively */
    var text = pool[Math.floor(Math.random() * pool.length)];
    if (text === _lastFlavorBiome && pool.length > 1) {
      text = pool[(pool.indexOf(text) + 1) % pool.length];
    }
    _lastFlavorBiome = text;

    if (typeof showTerrainToast === 'function') {
      showTerrainToast(text, 'flavor');
    }
  }
};
