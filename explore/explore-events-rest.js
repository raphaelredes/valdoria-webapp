/* ============================================================
 *  explore-events-rest.js — Camp/Rest + Death/Return Journey
 *  Camp UI rewrite: uses #camp-screen, popups, new HTML
 *  Death/Return journey: preserved from original
 * ============================================================ */

/* ----------------------------------------------------------
 *  CAMP DATA
 * ---------------------------------------------------------- */

var CAMP_FOOD_BONUSES = {
  'Pão Fresco':          { hp: 1, mp: 0, emoji: '🍞' },
  'Cogumelo Comestível': { hp: 2, mp: 0, emoji: '🍄' },
  'Carne Crua':          { hp: 3, mp: 0, emoji: '🥩' },
  'Carne Seca':          { hp: 3, mp: 0, emoji: '🥩' },
  'Mel Silvestre':       { hp: 3, mp: 2, emoji: '🍯' },
  'Cogumelo Grelhado':   { hp: 3, mp: 2, emoji: '🍄' },
  'Carne Assada':        { hp: 5, mp: 0, emoji: '🍖' },
  'Carne Purificada':    { hp: 6, mp: 0, emoji: '🍖' },
  'Refeição Completa':   { hp: 8, mp: 0, emoji: '🍖' },
};

var CAMP_AMBUSH_CHANCE = {
  desert: 8, plains: 10, snow: 10, mountain: 12,
  volcanic: 15, forest: 20, cave: 20, graveyard: 22, swamp: 25
};
var CAMP_FIRE_REDUCTION  = 5;
var CAMP_GUARD_REDUCTION = 10;
var CAMP_MIN_CHANCE      = 3;

var CAMP_NARRATIONS = {
  short: [
    'O calor da fogueira aquece seus ossos cansados enquanto você prepara uma refeição rápida.',
    'Você encontra um local abrigado e acende uma fogueira. O crepitar das chamas traz conforto.',
    'Entre as sombras da noite, a fogueira é seu único refúgio. Hora de descansar.',
  ],
  long: [
    'A noite se estende sobre a floresta. Você prepara 8 horas de descanso.',
    'O cansaço pesa sobre seus ombros. É hora de dormir sob as estrelas.',
    'A fogueira crepita suavemente enquanto a escuridão envolve tudo ao redor.',
  ],
  guard: [
    'O vento sussurra entre as árvores. Seus sentidos procuram sinais de perigo.',
    'A escuridão é densa além da luz da fogueira. Algo se move nas sombras.',
    'Você se posiciona com as costas para o fogo, olhos na escuridão.',
  ]
};

var CAMP_WEATHER = { c: 'Limpo', r: 'Chuva', t: 'Tempestade', f: 'Neblina', s: 'Neve' };

/* ----------------------------------------------------------
 *  CAMP ATMOSPHERE (per-biome flavor text)
 * ---------------------------------------------------------- */

var CAMP_ATMOSPHERE = {
  forest:    ['A fogueira crepita suavemente entre as arvores. O cheiro de musgo e terra umida preenche o ar.',
              'Grilos cantam ao redor. A luz das chamas danca nas folhas, criando sombras hipnoticas.'],
  plains:    ['O vento da planicie sopra gentilmente. As estrelas brilham vastas acima de voce.',
              'A grama alta sussurra ao redor. Um momento de paz na imensidao.'],
  desert:    ['O calor do dia finalmente cede. A noite do deserto traz um frio inesperado.',
              'As dunas brilham prateadas sob a lua. O silencio e quase meditativo.'],
  snow:      ['A neve abafa todos os sons. Apenas o crepitar da fogueira quebra o silencio gelado.',
              'Cristais de gelo brilham a luz das chamas como pequenos diamantes.'],
  swamp:     ['O ar pesado do pantano se mistura com a fumaca da fogueira. Luzes estranhas brilham ao longe.',
              'Sapos coaxam na escuridao. A fogueira mantem as criaturas do pantano a distancia.'],
  mountain:  ['O vento uiva entre os picos. Daqui de cima, o mundo parece pequeno e distante.',
              'A fogueira luta contra o vento da montanha. Cada rajada faz as chamas dancarem.'],
  volcanic:  ['O chao emana calor. Fissuras distantes brilham alaranjadas na escuridao.',
              'O ar tremula com o calor. A fogueira parece quase desnecessaria neste lugar.'],
  cave:      ['Gotas de agua ecoam na escuridao da caverna. A fogueira projeta sombras imensas nas paredes.',
              'Estalactites brilham a luz do fogo. Um refugio seguro nas profundezas.'],
  graveyard: ['O silencio e denso entre as lapides. A fogueira e sua unica companhia neste lugar.',
              'A nevoa se arrasta ao redor. Melhor descansar rapido e seguir em frente.'],
};

/* ----------------------------------------------------------
 *  CAMPFIRE STORIES (per-biome, for guard watch)
 * ---------------------------------------------------------- */

var CAMPFIRE_STORIES = {
  forest:    ['O crepitar da fogueira mistura-se ao canto dos grilos. Entre as \u00e1rvores, vaga-lumes dan\u00e7am como estrelas ca\u00eddas.',
              'O vento sussurra entre os galhos antigos. Voc\u00ea jura ouvir uma melodia distante, quase como uma can\u00e7\u00e3o de ninar.',
              'Uma coruja pia ao longe. A floresta \u00e9 escura, mas a fogueira \u00e9 quente. Por ora, voc\u00ea est\u00e1 seguro.',
              'As chamas projetam sombras dan\u00e7antes nos troncos. Uma delas parece ter forma humana por um instante.'],
  plains:    ['O c\u00e9u noturno se abre vasto sobre a plan\u00edcie. Mais estrelas do que voc\u00ea jamais viu pontuam a escurid\u00e3o.',
              'A brisa traz o cheiro de grama fresca. No horizonte, a lua cheia ilumina o caminho que voc\u00ea percorreu.',
              'Os grilos cantam ao redor. A fogueira \u00e9 um ponto de luz solit\u00e1rio na vastid\u00e3o da plan\u00edcie.'],
  desert:    ['O calor do deserto finalmente cede. A noite traz um frio cortante que faz a fogueira parecer um tesouro.',
              'As dunas brilham prateadas sob a lua. O sil\u00eancio do deserto \u00e9 t\u00e3o profundo que voc\u00ea ouve seu pr\u00f3prio cora\u00e7\u00e3o.',
              'Uma estrela cadente risca o c\u00e9u. Os viajantes do deserto dizem que \u00e9 um bom pres\u00e1gio.'],
  snow:      ['A neve cai suavemente ao redor da fogueira, derretendo antes de tocar as chamas. Um manto branco cobre tudo.',
              'O frio morde at\u00e9 os ossos, mas o calor da fogueira mant\u00e9m a escurid\u00e3o gelada \u00e0 dist\u00e2ncia.',
              'Aurora boreal dan\u00e7a no c\u00e9u noturno. Cores que nenhum artista conseguiria reproduzir.'],
  swamp:     ['O p\u00e2ntano borbulha na escurid\u00e3o. Luzes estranhas flutuam entre as \u00e1rvores mortas.',
              'O ar \u00e9 pesado e \u00famido. Sapos coaxam um coro desafinado que, de alguma forma, \u00e9 reconfortante.'],
  mountain:  ['Do alto, as luzes de aldeias distantes cintilam como velas. O vento uiva entre os picos rochosos.',
              'A fogueira luta contra o vento da montanha. Cada rajada faz as chamas dan\u00e7arem furiosamente.'],
  volcanic:  ['O ch\u00e3o \u00e9 quente mesmo longe das fissuras. A fogueira quase parece desnecess\u00e1ria neste calor infernal.',
              'Um brilho alaranjado pulsa no horizonte. A terra vive e respira aqui, inquieta sob seus p\u00e9s.'],
  cave:      ['Gotas de \u00e1gua ecoam na escurid\u00e3o da caverna. A fogueira projeta sombras imensas nas paredes de pedra.',
              'Forma\u00e7\u00f5es de estalactites brilham \u00e0 luz do fogo, como j\u00f3ias incrustadas no teto.'],
  graveyard: ['O sil\u00eancio \u00e9 denso. Nem os mortos fazem barulho aqui \u2014 ou talvez fa\u00e7am, e voc\u00ea prefere n\u00e3o ouvir.',
              'A n\u00e9voa se arrasta entre as l\u00e1pides. A fogueira \u00e9 sua \u00fanica companhia neste lugar esquecido.'],
  _generic:  ['As chamas dan\u00e7am e crepitam. O calor \u00e9 reconfortante depois de um longo dia de viagem.',
              'Voc\u00ea observa as brasas brilharem como pequenos s\u00f3is. Amanh\u00e3 ser\u00e1 um novo dia de aventura.',
              'O cansa\u00e7o pesa sobre seus ombros, mas a fogueira aquece seu esp\u00edrito. Valdoria ainda guarda muitos segredos.',
              'O sil\u00eancio da noite \u00e9 quebrado apenas pelo estalar da lenha. Momentos de paz s\u00e3o raros nesta terra.',
              'Voc\u00ea pensa nos caminhos que ainda restam. Cada hex\u00e1gono pode esconder perigo ou tesouro \u2014 ou ambos.']
};

/* ----------------------------------------------------------
 *  CAMP LONG REST ANIMATION — Frame Data
 * ---------------------------------------------------------- */

var _CR_DAWN_NARRATIONS = {
  forest:    ['A luz dourada da manh\u00e3 filtra-se entre as copas. O ar \u00e9 fresco e carregado de orvalho.',
              'P\u00e1ssaros come\u00e7am a cantar. As \u00faltimas brasas da fogueira brilham entre as cinzas.',
              'A n\u00e9voa da manh\u00e3 se dissipa lentamente entre as \u00e1rvores.'],
  plains:    ['O horizonte se incendeia em tons de ouro e p\u00farpura. Um novo dia se abre vasto.',
              'O orvalho brilha sobre a grama como mil diamantes ao sol nascente.',
              'A brisa matinal traz cheiro de terra e liberdade.'],
  desert:    ['O c\u00e9u se tinge de carmesim. O calor j\u00e1 come\u00e7a a se anunciar.',
              'As estrelas desaparecem uma a uma. O deserto desperta em sil\u00eancio dourado.',
              'A areia fria da manh\u00e3 logo se tornar\u00e1 escaldante.'],
  snow:      ['O sol nasce p\u00e1lido sobre a neve intocada. O mundo \u00e9 branco e silencioso.',
              'Cristais de gelo brilham como j\u00f3ias \u00e0 primeira luz. O ar \u00e9 cortante mas puro.',
              'A neve reflete a aurora em tons de rosa e ouro.'],
  swamp:     ['Uma luz esverdeada invade a n\u00e9voa do p\u00e2ntano. O dia come\u00e7a lento aqui.',
              'O canto dos sapos cede lugar ao zumbido dos insetos. Mais um dia no p\u00e2ntano.',
              'A n\u00e9voa se afina, revelando \u00e1guas escuras e \u00e1rvores retorcidas.'],
  mountain:  ['O sol desponta entre os picos, banhando o vale em luz dourada.',
              'A vista do alto \u00e9 deslumbrante ao amanhecer. As nuvens est\u00e3o abaixo de voc\u00ea.',
              'O vento da montanha traz o frescor da manh\u00e3. A trilha continua.'],
  volcanic:  ['O brilho das fissuras se confunde com o nascer do sol. Calor eterno.',
              'Vapor sobe das rochas quentes enquanto o c\u00e9u clareia. A terra nunca dorme aqui.',
              'Cinzas e luz se misturam no horizonte vulc\u00e2nico.'],
  cave:      ['Um fraco brilho anuncia a sa\u00edda da caverna. O mundo l\u00e1 fora espera.',
              'As sombras recuam conforme a tocha se renova. Hora de seguir adiante.',
              'Gotas de \u00e1gua brilham como estrelas nas estalactites ao despertar.'],
  graveyard: ['Uma luz p\u00e1lida e fria anuncia o amanhecer entre as l\u00e1pides.',
              'As sombras da noite recuam. At\u00e9 os mortos parecem mais quietos ao amanhecer.',
              'O nevoeiro se dissipa lentamente. Melhor partir antes que escure\u00e7a novamente.'],
  _generic:  ['A aurora desponta lentamente. Seu corpo responde ao descanso \u2014 mais forte, mais \u00e1gil.',
              'A luz do novo dia traz esperan\u00e7a. Os caminhos de Valdoria aguardam.',
              'Voc\u00ea se espreguia ao p\u00e9 das cinzas da fogueira. Est\u00e1 renovado.']
};

var _CR_DIVIDER_NIGHT = '\u00b7 \u2726 \u00b7 \u2726 \u00b7 \u2726 \u00b7 \u2726 \u00b7';
var _CR_DIVIDER_SLEEP = '\u00b7 \u00b7 \u2727 \u00b7 \u00b7 \u2727 \u00b7 \u00b7 \u2727 \u00b7 \u00b7';
var _CR_DIVIDER_DAWN  = '\u00b7 \u2600 \u00b7 \u2600 \u00b7 \u2600 \u00b7 \u2600 \u00b7';

var _CR_BIOME_BG = {
  forest:    { night: 'radial-gradient(ellipse at 50% 40%, #0a1208 0%, #050805 100%)', sleep: 'radial-gradient(ellipse at 50% 40%, #060808 0%, #030404 100%)', dawn: 'radial-gradient(ellipse at 50% 40%, #2a2000 0%, #1a1200 100%)' },
  plains:    { night: 'radial-gradient(ellipse at 50% 40%, #0a0a18 0%, #050508 100%)', sleep: 'radial-gradient(ellipse at 50% 40%, #080810 0%, #040408 100%)', dawn: 'radial-gradient(ellipse at 50% 40%, #302200 0%, #201500 100%)' },
  desert:    { night: 'radial-gradient(ellipse at 50% 40%, #12100a 0%, #080604 100%)', sleep: 'radial-gradient(ellipse at 50% 40%, #0a0808 0%, #050404 100%)', dawn: 'radial-gradient(ellipse at 50% 40%, #3a2000 0%, #2a1400 100%)' },
  snow:      { night: 'radial-gradient(ellipse at 50% 40%, #0a0a14 0%, #050510 100%)', sleep: 'radial-gradient(ellipse at 50% 40%, #080810 0%, #040408 100%)', dawn: 'radial-gradient(ellipse at 50% 40%, #1a1820 0%, #101018 100%)' },
  swamp:     { night: 'radial-gradient(ellipse at 50% 40%, #080a06 0%, #040504 100%)', sleep: 'radial-gradient(ellipse at 50% 40%, #060806 0%, #030404 100%)', dawn: 'radial-gradient(ellipse at 50% 40%, #1a1a08 0%, #101008 100%)' },
  mountain:  { night: 'radial-gradient(ellipse at 50% 40%, #0a0a12 0%, #050508 100%)', sleep: 'radial-gradient(ellipse at 50% 40%, #080808 0%, #040404 100%)', dawn: 'radial-gradient(ellipse at 50% 40%, #2a2010 0%, #1a1408 100%)' },
  volcanic:  { night: 'radial-gradient(ellipse at 50% 40%, #1a0a04 0%, #0a0504 100%)', sleep: 'radial-gradient(ellipse at 50% 40%, #100804 0%, #080404 100%)', dawn: 'radial-gradient(ellipse at 50% 40%, #301808 0%, #201004 100%)' },
  cave:      { night: 'radial-gradient(ellipse at 50% 40%, #0a0808 0%, #050404 100%)', sleep: 'radial-gradient(ellipse at 50% 40%, #080606 0%, #040303 100%)', dawn: 'radial-gradient(ellipse at 50% 40%, #1a1510 0%, #100c08 100%)' },
  graveyard: { night: 'radial-gradient(ellipse at 50% 40%, #0a0810 0%, #050408 100%)', sleep: 'radial-gradient(ellipse at 50% 40%, #080608 0%, #040404 100%)', dawn: 'radial-gradient(ellipse at 50% 40%, #181418 0%, #100c10 100%)' },
  _default:  { night: 'radial-gradient(ellipse at 50% 40%, #0a0a10 0%, #050508 100%)', sleep: 'radial-gradient(ellipse at 50% 40%, #080810 0%, #050508 100%)', dawn: 'radial-gradient(ellipse at 50% 40%, #2a2000 0%, #1a1200 100%)' }
};

var _CR_FRAME_ICONS = {
  night: ['\uD83D\uDD6F\ufe0f  \uD83C\uDF19  \uD83D\uDD25', '\uD83C\uDF19  \uD83D\uDD25  \u2B50', '\uD83D\uDD25  \uD83C\uDF0C  \uD83D\uDD6F\ufe0f'],
  sleep: ['\uD83D\uDCA4  \uD83D\uDCA4  \uD83D\uDCA4  \uD83D\uDCA4  \uD83D\uDCA4', '\uD83D\uDCA4 \u00b7 \u00b7 \u00b7 \uD83D\uDCA4 \u00b7 \u00b7 \uD83D\uDCA4'],
  dawn:  ['\uD83C\uDF05  \u2600\ufe0f  \uD83D\uDD4A\ufe0f', '\u2600\ufe0f  \uD83C\uDF3F  \uD83D\uDD4A\ufe0f', '\u2600\ufe0f  \u2728  \uD83C\uDF05']
};

function _crPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function _crCalcDelay(lines, category) {
  var text = (Array.isArray(lines) ? lines.join(' ') : lines || '');
  var words = text.trim().split(/\s+/).filter(Boolean).length;
  var base = words * 0.35;
  var ranges = {
    narrative: { min: 3.5, max: 6.0 },
    data:      { min: 4.0, max: 6.5 },
    result:    { min: 5.0, max: 7.0 }
  };
  var r = ranges[category] || ranges.narrative;
  return Math.max(r.min, Math.min(r.max, base)) * 1000;
}

function _crNightBar(phase, total) {
  var pct = phase / Math.max(total - 1, 1);
  var filled = Math.round(pct * 10);
  var bar = '';
  for (var i = 0; i < filled; i++) bar += '\u2593';
  for (var j = filled; j < 10; j++) bar += '\u2591';
  var icon = pct < 0.15 ? '\uD83C\uDF06' : pct < 0.35 ? '\uD83C\uDF03' : pct < 0.65 ? '\uD83C\uDF0C' : pct < 0.85 ? '\uD83C\uDF05' : '\u2600\ufe0f'; /* pflt-suppress night phase icon, not HP threshold */
  var endIcon = pct >= 0.85 ? '\u2600\ufe0f' : '\uD83C\uDF19';
  return icon + ' ' + bar + ' ' + endIcon;
}

function _crBarHTML(emoji, current, max, type, isFull) {
  var pct = max > 0 ? Math.round((current / max) * 100) : 0;
  var fullClass = isFull ? ' full' : '';
  var spark = isFull ? ' \u2728' : '';
  return '<div class="cr-bar-wrap">'
    + '<div class="cr-bar-track"><div class="cr-bar-fill ' + type + fullClass + '" data-target="' + pct + '" style="width:0%"></div></div>'
    + '<span class="cr-bar-label">' + emoji + ' ' + current + '/' + max + spark + '</span>'
    + '</div>';
}

function _crRecoveryHTML(data, pct) {
  var hp = Math.min(Math.round(data.startHp + (data.maxHp - data.startHp) * pct), data.maxHp);
  var mp = data.maxMp > 0 ? Math.min(Math.round(data.startMp + (data.maxMp - data.startMp) * pct), data.maxMp) : 0;
  var isFull = pct >= 1.0;
  var html = _crBarHTML('\u2764\ufe0f', hp, data.maxHp, 'hp', isFull);
  if (data.maxMp > 0) {
    html += _crBarHTML('\u2728', mp, data.maxMp, 'mp', isFull);
  }
  if (data.exhaustionBefore > 0 && isFull) {
    html += '<div class="cr-exhaustion-line">\uD83D\uDE0C Exaust\u00e3o: ' + data.exhaustionBefore + ' \u2192 ' + data.exhaustionAfter + '</div>';
  }
  if (isFull && data.hdRecov > 0) {
    html += '<div class="cr-hd-line">\uD83C\uDFB2 Dados de Vida: +' + data.hdRecov + ' recuperados (' + data.hdNow + '/' + data.maxHd + ')</div>';
  }
  return html;
}

function _crAnimateBarFills(container) {
  requestAnimationFrame(function() {
    var fills = container.querySelectorAll('.cr-bar-fill[data-target]');
    for (var i = 0; i < fills.length; i++) {
      (function(el, idx) {
        setTimeout(function() { el.style.width = el.dataset.target + '%'; }, idx * 200);
      })(fills[i], i);
    }
  });
}

function _crCreateParticles(container) {
  container.innerHTML = ''; /* noqa: innerHTML — particles container, safe */
  var starCount = 12;
  for (var i = 0; i < starCount; i++) {
    var p = document.createElement('div');
    p.className = 'camp-rest-particle star';
    p.style.left = (Math.random() * 100) + '%';
    p.style.top = (Math.random() * 70) + '%';
    p.style.setProperty('--dur', (2 + Math.random() * 4) + 's');
    p.style.setProperty('--delay', (Math.random() * 3) + 's');
    container.appendChild(p);
  }
  var emberCount = 5;
  for (var j = 0; j < emberCount; j++) {
    var e = document.createElement('div');
    e.className = 'camp-rest-particle ember';
    e.style.left = (20 + Math.random() * 60) + '%';
    e.style.bottom = (Math.random() * 20) + '%';
    e.style.setProperty('--dur', (4 + Math.random() * 4) + 's');
    e.style.setProperty('--delay', (Math.random() * 5) + 's');
    container.appendChild(e);
  }
}

function _crCreateAmbient(overlay) {
  var amb = overlay.querySelector('.camp-rest-ambient');
  if (!amb) {
    amb = document.createElement('div');
    amb.className = 'camp-rest-ambient';
    overlay.insertBefore(amb, overlay.firstChild);
  }
  amb.innerHTML = ''; /* noqa: innerHTML — ambient container, safe */
  var glow = document.createElement('div');
  glow.className = 'camp-rest-fire-glow';
  amb.appendChild(glow);
  var core = document.createElement('div');
  core.className = 'camp-rest-fire-core';
  amb.appendChild(core);
}

function _crGoldenBurst(overlay, particlesEl) {
  var flash = document.createElement('div');
  flash.className = 'cr-flash';
  overlay.appendChild(flash);
  setTimeout(function() { flash.remove(); }, 700);
  var burst = document.createElement('div');
  burst.className = 'cr-burst';
  overlay.appendChild(burst);
  setTimeout(function() { burst.remove(); }, 1300);
  for (var i = 0; i < 6; i++) {
    var p = document.createElement('div');
    p.className = 'camp-rest-particle spark';
    p.style.left = (30 + Math.random() * 40) + '%';
    p.style.top = (35 + Math.random() * 30) + '%';
    p.style.setProperty('--dur', (1.5 + Math.random() * 2) + 's');
    p.style.setProperty('--delay', (Math.random() * 0.5) + 's');
    p.style.setProperty('--drift-x', (-40 + Math.random() * 80) + 'px');
    p.style.setProperty('--drift-y', (40 + Math.random() * 80) + 'px');
    particlesEl.appendChild(p);
  }
}

function _buildCampRestFrames(restData) {
  var biome = restData.biome || '_generic';
  var bgSet = _CR_BIOME_BG[biome] || _CR_BIOME_BG._default;

  var atmoPool = CAMP_ATMOSPHERE[biome] || CAMP_ATMOSPHERE._generic || CAMP_ATMOSPHERE.forest;
  var storyPool = (CAMPFIRE_STORIES[biome] || []).concat(CAMPFIRE_STORIES._generic || []);
  var dawnPool = _CR_DAWN_NARRATIONS[biome] || _CR_DAWN_NARRATIONS._generic;

  var atmoText = _crPick(atmoPool);
  var storyText = _crPick(storyPool);
  var dawnText = _crPick(dawnPool);

  var weatherLine = '';
  if (restData.weather === 't') weatherLine = '\u26a1 A tempestade ruge, mas a fogueira resiste.';
  else if (restData.weather === 'r') weatherLine = '\uD83C\uDF27\ufe0f A chuva cai suavemente ao redor do acampamento.';
  else if (restData.weather === 'f') weatherLine = '\uD83C\uDF2B\ufe0f A n\u00e9voa se fecha ao redor, abafando os sons.';
  else if (restData.weather === 's') weatherLine = '\u2744\ufe0f Flocos de neve pousam silenciosamente ao redor.';

  var nightLines = atmoText.match(/\.[^.]*$/g) ? [atmoText] : [atmoText];
  if (weatherLine) nightLines.push(weatherLine);

  var guardLine = '';
  if (restData.guardPosted && restData.guardSuccess) guardLine = '\uD83D\uDEE1\ufe0f Sua vig\u00edlia protege o acampamento.';
  else if (restData.guardPosted && !restData.guardSuccess) guardLine = '\u26a0\ufe0f Sua guarda falhou... a noite esconde perigos.';

  var sleepLines = [storyText];
  if (guardLine) sleepLines.push(guardLine);

  var frames = [
    {
      title: 'A NOITE CAI',
      icons: _crPick(_CR_FRAME_ICONS.night),
      lines: nightLines,
      bg: bgSet.night,
      category: 'narrative',
      recovery: 0,
      divider: _CR_DIVIDER_NIGHT
    },
    {
      title: 'SONO AO RELENTO',
      icons: _crPick(_CR_FRAME_ICONS.sleep),
      lines: sleepLines,
      bg: bgSet.sleep,
      category: 'data',
      recovery: 0.6,
      divider: _CR_DIVIDER_SLEEP
    },
    {
      title: 'AMANHECER',
      icons: _crPick(_CR_FRAME_ICONS.dawn),
      lines: [dawnText],
      bg: bgSet.dawn,
      category: 'data',
      recovery: 1.0,
      divider: _CR_DIVIDER_DAWN
    }
  ];

  for (var f = 0; f < frames.length; f++) {
    frames[f].delay = _crCalcDelay(frames[f].lines, frames[f].category);
  }

  return frames;
}

/* ----------------------------------------------------------
 *  _playCampRestAnimation — Inn-style cinematic for camp rest
 * ---------------------------------------------------------- */

function _playCampRestAnimation(restData, onDone) {
  var overlay = document.getElementById('camp-rest-overlay');
  var frameEl = document.getElementById('camp-rest-frame');
  var titleEl = document.getElementById('camp-rest-title');
  var iconsEl = document.getElementById('camp-rest-icons');
  var dividerEl = document.getElementById('camp-rest-divider');
  var textEl = document.getElementById('camp-rest-text');
  var nightBarEl = document.getElementById('camp-rest-night-bar');
  var recoveryEl = document.getElementById('camp-rest-recovery');
  var skipBtn = document.getElementById('camp-rest-skip');
  var advanceBtn = document.getElementById('camp-rest-advance');

  if (!overlay || !frameEl) {
    console.warn('[CAMP] campRestAnimation overlay not found, skipping');
    onDone();
    return;
  }

  console.info('[CAMP] campRestAnimation_start biome=%s weather=%s hp=%d/%d mp=%d/%d',
    restData.biome, restData.weather, restData.startHp, restData.maxHp, restData.startMp, restData.maxMp);

  var frames = _buildCampRestFrames(restData);
  var totalFrames = frames.length;
  var _done = false;
  var _skipped = false;
  var _frameTimer = null;

  try { if (window.Telegram && Telegram.WebApp) Telegram.WebApp.HapticFeedback.impactOccurred('light'); } catch(e) { /* noop */ }

  var finish = function(wasSkipped) {
    if (_done) return;
    _done = true;
    _skipped = wasSkipped;
    if (_frameTimer) clearTimeout(_frameTimer);
    skipBtn.onclick = null;
    skipBtn.style.display = 'none';
    advanceBtn.onclick = null;
    advanceBtn.style.display = 'none';
    overlay.classList.add('hiding');
    setTimeout(function() {
      overlay.style.display = 'none';
      overlay.classList.remove('hiding');
      frameEl.classList.remove('active', 'exiting');
      titleEl.classList.remove('shimmer');
      var particlesEl = overlay.querySelector('.camp-rest-particles');
      if (particlesEl) particlesEl.innerHTML = ''; /* noqa: innerHTML — cleanup */
      var ambEl = overlay.querySelector('.camp-rest-ambient');
      if (ambEl) ambEl.innerHTML = ''; /* noqa: innerHTML — cleanup */
      onDone();
    }, 500);
  };

  var restCount = restData.restCount || 0;
  var skipDelay = restCount >= 3 ? 300 : 2500;
  setTimeout(function() {
    if (!_done) {
      skipBtn.textContent = 'Acordar \u00bb';
      skipBtn.style.display = '';
      skipBtn.onclick = function() { finish(true); };
    }
  }, skipDelay);

  overlay.style.display = '';
  overlay.classList.remove('hiding');
  overlay.style.background = frames[0].bg || '';

  var particlesEl = overlay.querySelector('.camp-rest-particles');
  if (!particlesEl) {
    particlesEl = document.createElement('div');
    particlesEl.className = 'camp-rest-particles';
    overlay.insertBefore(particlesEl, overlay.firstChild);
  }
  _crCreateParticles(particlesEl);
  _crCreateAmbient(overlay);

  function showFrame(idx) {
    if (_done || idx >= totalFrames) {
      if (!_done) finish(false);
      return;
    }

    var frame = frames[idx];
    var isLast = idx === totalFrames - 1;

    if (idx > 0) frameEl.classList.add('exiting');

    var enterDelay = idx === 0 ? 50 : 550;
    setTimeout(function() {
      if (_done) return;

      frameEl.classList.remove('active', 'exiting');
      overlay.style.background = frame.bg;
      nightBarEl.textContent = _crNightBar(idx, totalFrames);
      titleEl.textContent = frame.title;

      if (frame.recovery >= 1.0) {
        titleEl.classList.add('shimmer');
      } else {
        titleEl.classList.remove('shimmer');
      }

      iconsEl.textContent = frame.icons;

      if (dividerEl) {
        dividerEl.textContent = frame.divider || '';
        dividerEl.style.display = frame.divider ? '' : 'none';
      }

      textEl.innerHTML = frame.lines.map(function(l) { /* noqa: innerHTML — camp rest lines, safe data */
        return '<div class="camp-rest-line">' + l + '</div>';
      }).join('');

      if (frame.recovery > 0) {
        recoveryEl.innerHTML = _crRecoveryHTML(restData, frame.recovery); /* noqa: innerHTML — recovery bars, safe computed */
        recoveryEl.style.display = '';
        recoveryEl.style.animation = 'none';
        recoveryEl.offsetHeight; /* reflow */
        recoveryEl.style.animation = '';
        _crAnimateBarFills(recoveryEl);
      } else {
        recoveryEl.style.display = 'none';
      }

      if (isLast && frame.recovery >= 1.0) {
        _crGoldenBurst(overlay, particlesEl);
      }

      frameEl.classList.add('active');

      try {
        if (window.Telegram && Telegram.WebApp) {
          var hf = Telegram.WebApp.HapticFeedback;
          if (isLast && frame.recovery >= 1.0) hf.notificationOccurred('success');
          else if (idx > 0) hf.impactOccurred('light');
        }
      } catch(e) { /* noop */ }

      if (!isLast && advanceBtn) {
        advanceBtn.style.display = '';
        advanceBtn.textContent = 'Avan\u00e7ar \u203a';
        advanceBtn.onclick = function() {
          if (_done) return;
          if (_frameTimer) clearTimeout(_frameTimer);
          advanceBtn.style.display = 'none';
          showFrame(idx + 1);
        };
      } else if (advanceBtn) {
        advanceBtn.style.display = 'none';
      }

      _frameTimer = setTimeout(function() {
        if (advanceBtn) advanceBtn.style.display = 'none';
        showFrame(idx + 1);
      }, frame.delay);
    }, enterDelay);
  }

  showFrame(0);
}

/* ----------------------------------------------------------
 *  CAMP HELPERS
 * ---------------------------------------------------------- */

function _pickCampNarration(type) {
  var pool = CAMP_NARRATIONS[type] || CAMP_NARRATIONS.short;
  return pool[Math.floor(Math.random() * pool.length)];
}

function _getCampfireStory() {
  var biome = S.biome || '_generic';
  var stories = CAMPFIRE_STORIES[biome] || CAMPFIRE_STORIES._generic;
  var pool = stories.concat(CAMPFIRE_STORIES._generic);
  return pool[Math.floor(Math.random() * pool.length)];
}

function _getCampFoodItems() {
  if (!S.charData || !S.charData.inv) return [];
  var items = [];
  for (var i = 0; i < S.charData.inv.length; i++) {
    var it = S.charData.inv[i];
    if (it && it.n && CAMP_FOOD_BONUSES[it.n]) {
      items.push({
        n: it.n,
        q: it.q || 1,
        hp: CAMP_FOOD_BONUSES[it.n].hp,
        mp: CAMP_FOOD_BONUSES[it.n].mp,
        emoji: CAMP_FOOD_BONUSES[it.n].emoji
      });
    }
  }
  /* Sort by HP bonus descending */
  items.sort(function(a, b) { return b.hp - a.hp; });
  return items;
}

function _getCampAmbushChance() {
  var biome = S.biome || 'forest';
  var base = CAMP_AMBUSH_CHANCE[biome] || 20;
  var guardReduction = S._guardPosted ? CAMP_GUARD_REDUCTION : 0;
  var fireReduction = CAMP_FIRE_REDUCTION;
  var final_ = Math.max(CAMP_MIN_CHANCE, base - fireReduction - guardReduction);
  return { base: base, fire: fireReduction, guard: guardReduction, final: final_ };
}

function _updateCampHUD() {
  var cd = S.charData;
  if (!cd) return;
  var hp = cd.hp + (S.hpChange || 0);
  var mh = cd.mh || 10;
  var mp = (cd.mp || 0) + (S.mpChange || 0);
  var mm = cd.mm || 0;
  var hpPct = Math.max(0, Math.min(100, Math.round((hp / mh) * 100)));
  var mpPct = mm > 0 ? Math.max(0, Math.min(100, Math.round((mp / mm) * 100))) : 0;

  var hpBar = document.getElementById('camp-hp-bar');
  var hpText = document.getElementById('camp-hp-text');
  var mpBar = document.getElementById('camp-mp-bar');
  var mpText = document.getElementById('camp-mp-text');

  if (hpBar) hpBar.style.width = hpPct + '%';
  if (hpText) hpText.textContent = hp + '/' + mh;
  if (mpBar) mpBar.style.width = mpPct + '%';
  if (mpText) mpText.textContent = mm > 0 ? (mp + '/' + mm) : '--';
}

/* ----------------------------------------------------------
 *  CAMP SCREEN — Show / Close
 * ---------------------------------------------------------- */

function showCampOverlay() {
  var cd = S.charData || {};
  var _hdRem = ((cd.mhd) || 1) - (S._hdUsed || 0);
  console.info('[CAMP] showCampOverlay biome=%s hp=%d/%d mp=%d/%d hdRemain=%d/%d exhaustion=%d guard=%s weather=%s',
    S.biome || '?', (cd.hp || 0) + (S.hpChange || 0), cd.mh || 0,
    (cd.mp || 0) + (S.mpChange || 0), cd.mm || 0,
    _hdRem, cd.mhd || 0, S.exhaustion || 0,
    S._guardPosted ? 'yes' : 'no', S.weather || '?');

  var screen = document.getElementById('camp-screen');
  if (!screen) { console.error('[CAMP] FATAL camp-screen element not found in DOM'); return; }

  /* Init campfire particles */
  var _fireCanvas = document.getElementById('camp-fire-canvas');
  if (window.CampFire && _fireCanvas) {
    CampFire.init(_fireCanvas);
    console.info('[CAMP] fire_init canvas=%dx%d', _fireCanvas.width, _fireCanvas.height);
  } else {
    console.warn('[CAMP] fire_init_skipped CampFire=%s canvas=%s', !!window.CampFire, !!_fireCanvas);
  }

  /* Update HUD */
  _updateCampHUD();

  /* Biome text */
  var biomeLabels = {
    forest: 'Floresta', plains: 'Plan\u00edcie', cave: 'Caverna', swamp: 'P\u00e2ntano',
    mountain: 'Montanha', desert: 'Deserto', snow: 'Neve', volcanic: 'Vulc\u00e2nico',
    graveyard: 'Cemit\u00e9rio'
  };
  var biomeEl = document.getElementById('camp-biome-text');
  if (biomeEl) biomeEl.textContent = biomeLabels[S.biome] || 'Selvagem';

  /* Card details */
  var cd = S.charData || {};
  var maxHD = cd.mhd || 1;
  var hdRemaining = Math.max(0, maxHD - (S._hdUsed || 0));
  var hdType = cd.hdt || '1d8';
  var foods = _getCampFoodItems();
  var bestFood = foods.length > 0 ? foods[0] : null;
  var canShortRest = hdRemaining > 0;
  var mpCanRecover = cd.mm > 0 && cd.mpr && cd.mpr !== 'none';

  /* Short rest detail */
  var shortDetail = document.getElementById('camp-short-detail');
  if (shortDetail) {
    if (canShortRest || mpCanRecover) {
      var shortText = '\uD83C\uDFB2 ' + hdRemaining + ' DV restantes';
      if (bestFood) shortText += ' \u00b7 ' + bestFood.emoji + ' ' + bestFood.n;
      else shortText += ' \u00b7 Sem comida';
      shortDetail.textContent = shortText;
    } else {
      shortDetail.textContent = '\u26a0\ufe0f Sem Dados de Vida';
    }
  }

  /* Long rest detail */
  var ambush = _getCampAmbushChance();
  var longDetail = document.getElementById('camp-long-detail');
  if (longDetail) {
    var guardText = S._guardPosted ? '\u2705 Guarda montada' : '\u26a0\ufe0f Vig\u00edlia necess\u00e1ria';
    longDetail.textContent = guardText + ' \u00b7 Emboscada: ' + ambush.final + '%';
  }

  /* Guard detail */
  var guardDetail = document.getElementById('camp-guard-detail');
  if (guardDetail) {
    if (S._guardPosted) {
      guardDetail.textContent = '\u2705 Guarda j\u00e1 montada \u00b7 Emboscada reduzida';
    } else {
      var wisMod = typeof getAbilityMod === 'function' ? getAbilityMod('ws') : 0;
      var _sign = wisMod >= 0 ? '+' : '';
      guardDetail.textContent = '\uD83D\uDC41\ufe0f ' + _sign + wisMod + ' Percep\u00e7\u00e3o \u00b7 Reduz emboscada';
    }
  }

  /* Disable short rest card if no HD left AND no MP recovery */
  var shortCard = screen.querySelector('.camp-card-short');
  if (shortCard) {
    if (!canShortRest && !mpCanRecover) {
      shortCard.classList.add('camp-card-disabled');
    } else {
      shortCard.classList.remove('camp-card-disabled');
    }
  }

  /* Footer status */
  var footerEl = document.getElementById('camp-footer-status');
  if (footerEl) {
    var weatherLabel = CAMP_WEATHER[S.weather] || 'Desconhecido';
    footerEl.textContent = '\uD83D\uDE34 Exaust\u00e3o: ' + (S.exhaustion || 0)
      + ' \u00b7 \uD83C\uDFB2 DV: ' + hdRemaining + '/' + maxHD
      + ' \u00b7 \uD83C\uDF21\ufe0f ' + weatherLabel;
  }

  screen.classList.add('active');
}

function closeCampOverlay() {
  console.info('[CAMP] closeCampOverlay');
  var screen = document.getElementById('camp-screen');
  if (screen) screen.classList.remove('active');
  if (window.CampFire) { CampFire.destroy(); console.info('[CAMP] fire_destroyed'); }
  if (typeof setCampfireActive === 'function') setCampfireActive(false);
}

/* ----------------------------------------------------------
 *  CAMP POPUPS — Open / Close
 * ---------------------------------------------------------- */

function openCampPopup(type) {
  console.info('[CAMP] openCampPopup type=%s', type);
  var popup = document.getElementById('camp-popup-' + type);
  var body = document.getElementById('camp-popup-' + type + '-body');
  if (!popup) { console.error('[CAMP] FATAL popup element not found id=camp-popup-%s', type); return; }
  if (!body) { console.error('[CAMP] FATAL popup body not found id=camp-popup-%s-body', type); return; }

  var t0 = Date.now();
  if (type === 'short') _buildShortRestPopup(body);
  else if (type === 'long') _buildLongRestPopup(body);
  else if (type === 'guard') _buildGuardPopup(body);
  else { console.error('[CAMP] unknown popup type=%s', type); return; }
  console.info('[CAMP] popup_built type=%s ms=%d bodyChildren=%d', type, Date.now() - t0, body.children.length);

  popup.classList.add('active');
}

function closeCampPopup(type) {
  console.info('[CAMP] closeCampPopup type=%s', type);
  var popup = document.getElementById('camp-popup-' + type);
  if (popup) popup.classList.remove('active');
  else console.warn('[CAMP] closeCampPopup element not found type=%s', type);
}

/* ----------------------------------------------------------
 *  SHORT REST POPUP BUILDER
 * ---------------------------------------------------------- */

function _buildShortRestPopup(body) {
  var cd = S.charData || {};
  var maxHD = cd.mhd || 1;
  var hdRemaining = Math.max(0, maxHD - (S._hdUsed || 0));
  var hdType = cd.hdt || '1d8';
  var conMod = cd.con || 0;
  var conSign = conMod >= 0 ? '+' : '';
  var foods = _getCampFoodItems();
  console.info('[CAMP] buildShortPopup hdType=%s hdRemain=%d/%d conMod=%d foods=%d charData=%s',
    hdType, hdRemaining, maxHD, conMod, foods.length, cd.hp !== undefined ? 'ok' : 'MISSING');
  var narr = _pickCampNarration('short');

  var hp = cd.hp + (S.hpChange || 0);
  var mh = cd.mh || 10;
  var mp = (cd.mp || 0) + (S.mpChange || 0);
  var mm = cd.mm || 0;

  var html = '';

  /* DM narration */
  html += '<div class="camp-narration"><span class="camp-dm-mark">\u25c6</span> ' + narr + '</div>';

  /* Food selection */
  html += '<div class="camp-section-title">\uD83C\uDF56 Escolha uma Refei\u00e7\u00e3o</div>';

  if (foods.length > 0) {
    for (var i = 0; i < foods.length; i++) {
      var f = foods[i];
      var mpText = f.mp > 0 ? ' +' + f.mp + ' MP' : '';
      html += '<label class="camp-food-option">'
        + '<input type="radio" name="camp-food" value="' + f.n + '"' + (i === 0 ? ' checked' : '') + '>'
        + '<span class="camp-food-emoji">' + f.emoji + '</span>'
        + '<span class="camp-food-name">' + f.n + ' (' + f.q + 'x)</span>'
        + '<span class="camp-food-bonus">+' + f.hp + ' HP' + mpText + '</span>'
        + '</label>';
    }
  }
  /* No food option */
  html += '<label class="camp-food-option">'
    + '<input type="radio" name="camp-food" value=""' + (foods.length === 0 ? ' checked' : '') + '>'
    + '<span class="camp-food-emoji">\u2014</span>'
    + '<span class="camp-food-name">Descansar sem comer</span>'
    + '<span class="camp-food-bonus">Apenas ' + hdType + '+CON</span>'
    + '</label>';

  html += '<div class="camp-divider"></div>';

  /* Recovery estimate */
  html += '<div class="camp-recovery">';
  html += '<div class="camp-section-title" style="color:var(--v-green, #5a9a5b)">Recupera\u00e7\u00e3o Estimada</div>';

  var sides = parseInt((hdType || '1d8').replace(/^\d+d/, ''), 10) || 8;
  var avgRoll = Math.ceil((sides + 1) / 2);
  var baseHeal = Math.max(1, avgRoll + conMod);
  var bestFoodBonus = foods.length > 0 ? foods[0].hp : 0;

  html += '<div class="camp-recovery-row"><span>Dado de Vida</span><span>' + hdType + ' ' + conSign + conMod + ' (CON) \u2248 ' + baseHeal + '</span></div>';
  if (bestFoodBonus > 0) {
    html += '<div class="camp-recovery-row"><span>Refei\u00e7\u00e3o</span><span>+' + bestFoodBonus + ' HP</span></div>';
  }
  html += '<div class="camp-recovery-row"><span>HP estimado</span><span>+' + (baseHeal + bestFoodBonus) + ' HP</span></div>';

  /* MP recovery */
  var mpr = cd.mpr || 'none';
  if (mm > 0 && mpr !== 'none') {
    var mpRecov = 0;
    if (mpr === 'full') mpRecov = mm;
    else if (mpr === 'half') mpRecov = Math.ceil(mm / 2);
    else if (mpr === 'third') mpRecov = Math.ceil(mm / 3);
    html += '<div class="camp-recovery-row"><span>MP</span><span>+' + mpRecov + ' MP (' + mpr + ')</span></div>';
  }
  html += '</div>';

  /* Current status info */
  html += '<div class="camp-info-box">';
  html += '<div class="camp-info-row"><span>\u2764\ufe0f HP</span><span>' + hp + '/' + mh + '</span></div>';
  if (mm > 0) html += '<div class="camp-info-row"><span>\uD83D\uDCA7 MP</span><span>' + mp + '/' + mm + '</span></div>';
  html += '<div class="camp-info-row"><span>\uD83C\uDFB2 DV</span><span>' + hdRemaining + '/' + maxHD + '</span></div>';
  html += '<div class="camp-info-row"><span>\uD83D\uDE34 Exaust\u00e3o</span><span>' + (S.exhaustion || 0) + '</span></div>';
  html += '</div>';

  body.innerHTML = html; /* noqa: innerHTML — camp rest popup builder, safe static content */

  /* Disable confirm button if no HD */
  var confirmBtn = document.getElementById('camp-confirm-short');
  if (confirmBtn) {
    if (hdRemaining <= 0 && !(mm > 0 && mpr !== 'none')) {
      confirmBtn.disabled = true;
      confirmBtn.style.opacity = '0.4';
    } else {
      confirmBtn.disabled = false;
      confirmBtn.style.opacity = '';
    }
  }
}

/* ----------------------------------------------------------
 *  LONG REST POPUP BUILDER
 * ---------------------------------------------------------- */

function _buildLongRestPopup(body) {
  var cd = S.charData || {};
  var narr = _pickCampNarration('long');
  var ambush = _getCampAmbushChance();
  console.info('[CAMP] buildLongPopup ambushFinal=%d%% hasAlly=%s guardPosted=%s exhaustion=%d',
    ambush.final, cd.ally ? 'yes' : 'no', S._guardPosted ? 'yes' : 'no', S.exhaustion || 0);
  var maxHD = cd.mhd || 1;
  var hdRecov = Math.max(1, Math.floor(maxHD / 2));
  var mm = cd.mm || 0;

  var html = '';

  /* DM narration */
  html += '<div class="camp-narration"><span class="camp-dm-mark">\u25c6</span> ' + narr + '</div>';

  /* Warning */
  html += '<div class="camp-warn">'
    + '<span class="camp-warn-icon">\u26a0\ufe0f</span>'
    + '<div>Encerra explora\u00e7\u00e3o. Retorno \u00e0 cidade. Emboscada: <strong>' + ambush.final + '%</strong></div>'
    + '</div>';

  /* Full recovery */
  html += '<div class="camp-recovery">';
  html += '<div class="camp-recovery-row"><span>\u2764\ufe0f HP</span><span>Totalmente recuperado</span></div>';
  if (mm > 0) html += '<div class="camp-recovery-row"><span>\uD83D\uDCA7 MP</span><span>Totalmente recuperado</span></div>';
  html += '<div class="camp-recovery-row"><span>\uD83C\uDFB2 DV</span><span>+' + hdRecov + ' recuperados</span></div>';
  html += '<div class="camp-recovery-row"><span>\u2728 Recursos</span><span>Restaurados</span></div>';
  if ((S.exhaustion || 0) > 0) {
    html += '<div class="camp-recovery-row"><span>\uD83D\uDE34 Exaust\u00e3o</span><span>' + S.exhaustion + ' \u2192 0</span></div>';
  }
  html += '</div>';

  html += '<div class="camp-divider"></div>';

  /* Guard options */
  html += '<div class="camp-section-title">\uD83D\uDEE1\ufe0f Vig\u00edlia</div>';

  var hasCompanion = S.charData && S.charData.ally;
  var guardPosted = S._guardPosted;

  html += '<label class="camp-guard-option">'
    + '<input type="radio" name="camp-guard" value="player"' + (!guardPosted && !hasCompanion ? ' checked' : '') + '>'
    + '<div class="camp-guard-info">'
    + '<div class="camp-guard-title">\uD83D\uDC41\ufe0f Montar guarda pessoalmente</div>'
    + '<div class="camp-guard-desc">Teste de Percep\u00e7\u00e3o (WIS). Reduz emboscada em ' + CAMP_GUARD_REDUCTION + '%.</div>'
    + '</div></label>';

  if (hasCompanion) {
    html += '<label class="camp-guard-option">'
      + '<input type="radio" name="camp-guard" value="companion" checked>'
      + '<div class="camp-guard-info">'
      + '<div class="camp-guard-title">\uD83D\uDC3E Aliado monta guarda</div>'
      + '<div class="camp-guard-desc">Seu aliado vigia enquanto voc\u00ea descansa. Reduz emboscada em ' + CAMP_GUARD_REDUCTION + '%.</div>'
      + '</div></label>';
  }

  html += '<label class="camp-guard-option">'
    + '<input type="radio" name="camp-guard" value="none"' + (guardPosted ? ' checked' : '') + '>'
    + '<div class="camp-guard-info">'
    + '<div class="camp-guard-title">\uD83D\uDCA4 Dormir sem vig\u00edlia</div>'
    + '<div class="camp-guard-desc">Ningu\u00e9m monta guarda. Emboscada com chance total.</div>'
    + '</div></label>';

  if (guardPosted) {
    html += '<div class="camp-info-box"><div class="camp-info-row" style="color:var(--v-green, #5a9a5b)">'
      + '<span>\u2705 Guarda j\u00e1 montada</span><span>-' + CAMP_GUARD_REDUCTION + '% emboscada</span></div></div>';
  }

  body.innerHTML = html; /* noqa: innerHTML — camp long rest popup builder, safe static content */
}

/* ----------------------------------------------------------
 *  GUARD POPUP BUILDER
 * ---------------------------------------------------------- */

function _buildGuardPopup(body) {
  var cd = S.charData || {};
  var narr = _pickCampNarration('guard');
  var wisMod = typeof getAbilityMod === 'function' ? getAbilityMod('ws') : 0;
  var profInPerception = cd.sp && cd.sp.includes('per');
  var profBonus = profInPerception ? (cd.pb || 2) : 0;
  var totalMod = wisMod + profBonus;
  console.info('[CAMP] buildGuardPopup wisMod=%d prof=%s profBonus=%d totalMod=%d dangerLevel=%s',
    wisMod, profInPerception ? 'yes' : 'no', profBonus, totalMod, S.dangerLevel || '?');
  var sign = totalMod >= 0 ? '+' : '';
  var ambush = _getCampAmbushChance();
  var dangerDC = 10 + Math.floor((S.dangerLevel || 1) * 2);

  var html = '';

  /* DM narration */
  html += '<div class="camp-narration"><span class="camp-dm-mark">\u25c6</span> ' + narr + '</div>';

  /* Perception check info */
  html += '<div class="camp-info-box">';
  html += '<div class="camp-section-title">Teste de Percep\u00e7\u00e3o</div>';
  html += '<div class="camp-info-row"><span>Habilidade</span><span>Sabedoria (WIS)</span></div>';
  html += '<div class="camp-info-row"><span>B\u00f4nus</span><span>' + sign + totalMod
    + (profInPerception ? ' (proficiente)' : '') + '</span></div>';
  html += '<div class="camp-info-row"><span>Rolagem</span><span>d20 ' + sign + totalMod + ' vs DC ' + dangerDC + '</span></div>';
  html += '</div>';

  /* Ambush chance breakdown */
  html += '<div class="camp-info-box">';
  html += '<div class="camp-section-title">Chance de Emboscada</div>';
  html += '<div class="camp-info-row"><span>Base (' + (S.biome || 'forest') + ')</span><span>' + ambush.base + '%</span></div>';
  html += '<div class="camp-info-row"><span>Fogueira</span><span>-' + ambush.fire + '%</span></div>';
  html += '<div class="camp-info-row"><span>Guarda</span><span>-' + CAMP_GUARD_REDUCTION + '%</span></div>';
  html += '<div class="camp-info-row" style="font-weight:700"><span>Final</span><span>' + Math.max(CAMP_MIN_CHANCE, ambush.base - ambush.fire - CAMP_GUARD_REDUCTION) + '%</span></div>';
  html += '</div>';

  /* Tip */
  html += '<div class="camp-warn camp-warn-blue">'
    + '<span class="camp-warn-icon">\uD83D\uDCA1</span>'
    + '<div>Monte guarda antes de descansar para reduzir emboscada.</div>'
    + '</div>';

  /* Consequences */
  html += '<div class="camp-info-box">';
  html += '<div class="camp-section-title">Consequ\u00eancias</div>';
  html += '<div class="camp-info-row"><span>\u2705 Sucesso</span><span>Emboscada reduzida em ' + CAMP_GUARD_REDUCTION + '%</span></div>';
  html += '<div class="camp-info-row"><span>\u274c Falha</span><span>Emboscada N\u00c3O \u00e9 reduzida</span></div>';
  html += '<div class="camp-info-row"><span>\u26a0\ufe0f Custo</span><span>Nenhum (precede o descanso)</span></div>';
  html += '</div>';

  body.innerHTML = html; /* noqa: innerHTML — camp guard popup builder, safe static content */
}

/* ----------------------------------------------------------
 *  CONFIRM SHORT REST
 * ---------------------------------------------------------- */

function confirmShortRest() {
  /* Get selected food */
  var selectedRadio = document.querySelector('input[name="camp-food"]:checked');
  var foodName = selectedRadio ? selectedRadio.value : '';
  var food = null;

  if (foodName) {
    var foods = _getCampFoodItems();
    for (var i = 0; i < foods.length; i++) {
      if (foods[i].n === foodName) { food = foods[i]; break; }
    }
  }

  console.info('[CAMP] confirmShortRest food=%s foodHp=%d foodMp=%d radioFound=%s',
    foodName || 'none', food ? food.hp : 0, food ? food.mp : 0, !!selectedRadio);

  closeCampPopup('short');
  doCampRest(food);
}

/* ----------------------------------------------------------
 *  CONFIRM LONG REST
 * ---------------------------------------------------------- */

function confirmLongRest() {
  /* D&D 5e PHB Ch.8: Long rest requer "at least 1 hour of light activity"
   * — implementado como requisito mínimo de 5 passos desde o início da
   * exploração ou desde o último long rest. Previne abuso de acampamento
   * imediato ao entrar no mapa para recuperação full. */
  var MIN_STEPS_BEFORE_LONG_REST = 5;
  var stepsSinceLastRest = (S._stepCount || 0) - (S._stepsAtLastLongRest || 0);
  if (stepsSinceLastRest < MIN_STEPS_BEFORE_LONG_REST) {
    console.warn('[CAMP] longRest_blocked reason=too_soon stepsSince=%d required=%d',
      stepsSinceLastRest, MIN_STEPS_BEFORE_LONG_REST);
    if (typeof showTerrainToast === 'function') {
      showTerrainToast('Voce precisa descansar brevemente antes de um longo descanso. Explore mais ' +
        (MIN_STEPS_BEFORE_LONG_REST - stepsSinceLastRest) + ' hex(es).', 'info');
    }
    if (window.vHaptic && typeof window.vHaptic.warning === 'function') {
      try { window.vHaptic.warning(); } catch (_e) { /* noqa: preflight */ }
    }
    return;
  }

  /* Get selected guard option */
  var selectedGuard = document.querySelector('input[name="camp-guard"]:checked');
  var guardType = selectedGuard ? selectedGuard.value : 'none';

  console.info('[CAMP] confirmLongRest guardType=%s guardAlreadyPosted=%s radioFound=%s stepsSinceLastRest=%d',
    guardType, S._guardPosted ? 'yes' : 'no', !!selectedGuard, stepsSinceLastRest);

  /* Track steps at this rest for next cooldown */
  S._stepsAtLastLongRest = S._stepCount || 0;

  closeCampPopup('long');

  if (guardType === 'player' && !S._guardPosted) {
    /* Guard check first, then long rest */
    console.info('[CAMP] longRest_route=guard_first (player watch)');
    _startGuardWatch();
  } else if (guardType === 'companion') {
    /* Companion guards — auto-success */
    S._guardPosted = true;
    S._guardSuccess = true;
    console.info('[CAMP] longRest_route=companion_guard (auto-success)');
    doLongRest();
  } else {
    /* No guard */
    console.info('[CAMP] longRest_route=no_guard');
    doLongRest();
  }
}

/* ----------------------------------------------------------
 *  CONFIRM GUARD (standalone)
 * ---------------------------------------------------------- */

function confirmGuard() {
  console.info('[CAMP] confirmGuard (standalone guard watch)');
  closeCampPopup('guard');
  _startGuardWatch();
}

/* ----------------------------------------------------------
 *  doCampRest (Short Rest internals)
 * ---------------------------------------------------------- */

function doCampRest(food) {
  var _maxHD = (S.charData && S.charData.mhd) || 1;
  if ((S._hdUsed || 0) >= _maxHD) {
    console.warn('[CAMP] shortRest_blocked reason=no_hd hdUsed=%d maxHD=%d', S._hdUsed || 0, _maxHD);
    if (typeof showTerrainToast === 'function') showTerrainToast('Sem dados de vida restantes!', 'condition');
    return;
  }

  var hpBefore = S.charData ? S.charData.hp + (S.hpChange || 0) : 0;
  var mpBefore = S.charData ? (S.charData.mp || 0) + (S.mpChange || 0) : 0;

  var hdType = (S.charData && S.charData.hdt) || '1d8';
  var hitDie = rollDiceFormula(hdType);
  var conMod = getAbilityMod('cn');
  var baseHeal = Math.max(1, hitDie + conMod);
  S._hdUsed = (S._hdUsed || 0) + 1;

  var foodBonus = 0;
  var foodName = 'sem refei\u00e7\u00e3o';
  if (food) {
    foodName = food.n;
    if (food.hp && food.hp !== '0') {
      foodBonus = typeof food.hp === 'number' ? food.hp : rollDiceFormula(String(food.hp));
    }
    console.info('[CAMP] food_consumed name=%s hp=%d mp=%d qty=%d', food.n, food.hp || 0, food.mp || 0, food.q || 1);
    if (typeof useInventoryItem === 'function') useInventoryItem(food);
  }

  var totalHeal = baseHeal + foodBonus;
  S.hpChange += totalHeal;
  if (S.charData) {
    var newHP = Math.min(S.charData.mh, S.charData.hp + S.hpChange);
    updateHP(newHP, S.charData.mh);
  }

  logMoveEvent([{ type: 'camp', heal: totalHeal, food: foodName }]);
  updateRewards();
  if (typeof resetStepsWithoutRest === 'function') resetStepsWithoutRest();
  saveState();
  if (typeof updateCampButtonHint === 'function') updateCampButtonHint();

  var mpRecovered = 0;
  if (S.charData && S.charData.mm > 0) {
    if (!S.charData.mpr && S.charData.mm > 0) console.warn('[CAMP] mpr_undefined class=%s — MP recovery disabled', S.charData.cn || '?');
    var mpr = S.charData.mpr || 'none';
    var maxMP = S.charData.mm;
    if (mpr === 'full') mpRecovered = maxMP;
    else if (mpr === 'half') mpRecovered = Math.ceil(maxMP / 2);
    else if (mpr === 'third') mpRecovered = Math.ceil(maxMP / 3);
    if (mpRecovered > 0) {
      S.mpChange = (S.mpChange || 0) + mpRecovered;
      saveState();
    }
  }

  var hpAfter = S.charData ? S.charData.hp + S.hpChange : 0;
  var mpAfter = S.charData ? (S.charData.mp || 0) + (S.mpChange || 0) : 0;

  console.info('[CAMP] shortRest_complete hdType=%s dieRoll=%d con=%d foodBonus=%d totalHeal=%d food=%s hp=%d→%d mp=%d→%d hdUsed=%d/%d mpRecov=%d mpr=%s',
    hdType, hitDie, conMod, foodBonus, totalHeal, foodName,
    hpBefore, hpAfter, mpBefore, mpAfter,
    S._hdUsed, _maxHD, mpRecovered, mpr || 'none');

  _showCampDiceRoll(hitDie, conMod, foodBonus, totalHeal, foodName, hdType, mpRecovered);
}

/* ----------------------------------------------------------
 *  GUARD WATCH (Perception check before long rest)
 * ---------------------------------------------------------- */

function _startGuardWatch() {
  var wisMod = getAbilityMod('ws');
  var profInPerception = S.charData && S.charData.sp && S.charData.sp.includes('per');
  var profBonus = profInPerception ? (S.charData.pb || 2) : 0;
  var totalMod = wisMod + profBonus;
  var exhDis = (S.exhaustion || 0) >= 1;
  var mode = exhDis ? 'disadvantage' : 'normal';
  var result = rollD20(mode);
  var roll = result.roll;
  var r1 = result.r1;
  var r2 = result.r2;
  var total = roll + totalMod;
  var dangerDC = 10 + Math.floor((S.dangerLevel || 1) * 2);
  S._guardRoll = total;
  S._guardDC = dangerDC;
  S._guardSuccess = total >= dangerDC;

  console.info('[CAMP] guardWatch d20=%d wisMod=%d profBonus=%d total=%d dc=%d success=%s mode=%s r1=%d r2=%d',
    roll, wisMod, profBonus, total, dangerDC, total >= dangerDC ? 'yes' : 'no', mode, r1 || 0, r2 || 0);

  S._campfireStory = _getCampfireStory();
  _showGuardOverlay(roll, r1, r2, mode, totalMod, profInPerception, dangerDC, total >= dangerDC);
}

function _showGuardOverlay(roll, r1, r2, mode, totalMod, proficient, dc, success) {
  var overlay = document.getElementById('check-overlay');
  var formulaEl = document.getElementById('check-formula');
  var resultEl = document.getElementById('check-result');
  var diceContainer = document.getElementById('dice3d-wrapper');
  var diceCanvas = document.getElementById('dice3d-canvas');
  if (!overlay) { doLongRest(); return; }

  var sign = totalMod >= 0 ? '+' : '';
  var profText = proficient ? ' (proficiente)' : '';
  var disText = mode === 'disadvantage' ? ' <span style="color:#c44">(desvantagem)</span>' : '';
  var narrations = [
    'A fogueira se reduz a brasas. O sil\u00eancio da noite se instala...',
    'Sons distantes ecoam pela escurid\u00e3o. Voc\u00ea agu\u00e7a os sentidos...',
    'As horas passam lentamente. Cada sombra parece se mover...',
    'O vento sussurra entre as \u00e1rvores. Algo se move na escurid\u00e3o...',
  ];
  var narr = narrations[Math.floor(Math.random() * narrations.length)];

  formulaEl.innerHTML = '<div style="font-size:13px;color:#c4953a;margin-bottom:6px">\uD83D\uDEE1\ufe0f Montando Guarda</div>' /* noqa: innerHTML — guard overlay formula, safe static content */
    + '<div style="font-size:12px;color:#a09484;font-style:italic;margin-bottom:8px;line-height:1.5">' + narr + '</div>'
    + '<div style="font-size:11px;color:var(--v-text-faint, #8a7a68)">Percep\u00e7\u00e3o (WIS)' + profText + disText + '</div>'
    + '<div style="font-size:11px;color:var(--v-text-faint, #8a7a68);margin-top:2px">DC ' + dc + '</div>';
  resultEl.textContent = '';

  /* Keep dice3d-canvas intact — do NOT overwrite diceContainer with static HTML */
  if (diceCanvas) diceCanvas.style.display = 'none';
  overlay.classList.add('active');

  var narrDelay = typeof calcReadTime === 'function' ? calcReadTime(narr, 'narrative') : 2500;
  setTimeout(function() {
    if (diceCanvas && typeof Dice3D !== 'undefined') {
      try {
        if (window._checkDice) { window._checkDice.dispose(); window._checkDice = null; }
        if (typeof _dice3d !== 'undefined' && _dice3d) { _dice3d.dispose(); _dice3d = null; }
        diceCanvas.style.display = 'block';
        diceCanvas.innerHTML = ''; /* noqa: innerHTML — clearing dice canvas for re-init */
        window._checkDice = new Dice3D(diceCanvas, {
          size: typeof ValdoriaDice !== 'undefined' ? ValdoriaDice.D20_ADV_SIZE : 260,
          dieType: 'd20',
          duration: typeof ValdoriaDice !== 'undefined' ? ValdoriaDice.TIMING.D20_ROLL_MS : 1200
        });
        window._checkDice.roll(roll, function() {
          if (window.vHaptic) vHaptic.medium();
          _showGuardResult(overlay, resultEl, diceCanvas, roll, sign, totalMod, dc, success);
        });
      } catch(e) {
        console.warn('[EXPLORE] Guard dice error:', e);
        _showGuardResult(overlay, resultEl, diceCanvas, roll, sign, totalMod, dc, success);
      }
    } else {
      _showGuardResult(overlay, resultEl, diceCanvas, roll, sign, totalMod, dc, success);
    }
  }, narrDelay);
}

function _showGuardResult(overlay, resultEl, diceCanvas, roll, sign, totalMod, dc, success) {
  var total = roll + totalMod;
  var successNarrs = [
    'Seus olhos penetram a escurid\u00e3o. Nada escapa \u00e0 sua vig\u00edlia.',
    'Um galho estala ao longe. Voc\u00ea identifica: apenas um animal. A noite est\u00e1 segura.',
    'A aurora desponta. Sua guarda foi impec\u00e1vel.',
  ];
  var failNarrs = [
    'O calor da fogueira e o cansa\u00e7o vencem... seus olhos pesam...',
    'Um som distante... ou foi imagina\u00e7\u00e3o? O sono chega antes da resposta.',
    'As p\u00e1lpebras cedem. Quando voc\u00ea acorda, horas se passaram.',
  ];
  var postNarr = success
    ? successNarrs[Math.floor(Math.random() * successNarrs.length)]
    : failNarrs[Math.floor(Math.random() * failNarrs.length)];

  if (success) {
    resultEl.innerHTML = '<div style="color:#6c8;font-size:16px;font-weight:700">\u2705 Vigil\u00e2ncia Alerta</div>' /* noqa: innerHTML — guard result, safe static content */
      + '<div style="font-size:12px;color:var(--v-text-faint, #8a7a68);margin-top:4px">' + roll + ' ' + sign + totalMod + ' = ' + total + ' \u2265 DC ' + dc + '</div>'
      + '<div style="font-size:12px;color:#a09484;font-style:italic;margin-top:8px;line-height:1.5">' + postNarr + '</div>';
  } else {
    resultEl.innerHTML = '<div style="color:#c44;font-size:16px;font-weight:700">\u274c Guarda Falha</div>' /* noqa: innerHTML — guard result fail, safe static content */
      + '<div style="font-size:12px;color:var(--v-text-faint, #8a7a68);margin-top:4px">' + roll + ' ' + sign + totalMod + ' = ' + total + ' < DC ' + dc + '</div>'
      + '<div style="font-size:12px;color:#a09484;font-style:italic;margin-top:8px;line-height:1.5">' + postNarr + '</div>';
  }

  S._guardPosted = true;
  console.info('[CAMP] guardResult success=%s total=%d dc=%d → proceeding to longRest', success ? 'yes' : 'no', total, dc);

  var readDelay = typeof calcReadTime === 'function' ? calcReadTime(postNarr + ' Vigil\u00e2ncia resultado', 'overlay') : 3500;
  console.info('[CAMP] guardResult_delay ms=%d then→doLongRest', readDelay + 1000);
  setTimeout(function() {
    overlay.classList.remove('active');
    if (diceCanvas) diceCanvas.style.display = 'none';
    if (window._checkDice) { window._checkDice.dispose(); window._checkDice = null; }
    doLongRest();
  }, readDelay + 1000);
}

/* ----------------------------------------------------------
 *  LONG REST
 * ---------------------------------------------------------- */

function doLongRest() {
  var cd = S.charData || {};
  var hpBefore = (cd.hp || 0) + (S.hpChange || 0);
  var mpBefore = (cd.mp || 0) + (S.mpChange || 0);
  var hdUsedBefore = S._hdUsed || 0;

  console.info('[CAMP] doLongRest_start count=%d hp=%d/%d mp=%d/%d hdUsed=%d exhaustion=%d weather=%s guard=%s guardSuccess=%s',
    (S._longRestCount || 0) + 1, hpBefore, cd.mh || 0, mpBefore, cd.mm || 0,
    hdUsedBefore, S.exhaustion || 0, S.weather || '?',
    S._guardPosted ? 'yes' : 'no', S._guardSuccess ? 'yes' : 'no');

  S._longRestCount = (S._longRestCount || 0) + 1;

  /* HP full recovery */
  if (S.charData) {
    var maxHP = S.charData.mh || 10;
    var currentHP = S.charData.hp + S.hpChange;
    var healed = maxHP - currentHP;
    if (healed > 0) S.hpChange += healed;
    updateHP(maxHP, maxHP);
    console.info('[CAMP] longRest_hp healed=%d newHP=%d/%d', healed > 0 ? healed : 0, maxHP, maxHP);
  }

  /* Clear conditions */
  var condsBefore = (S.conditions || []).length;
  S.conditions = [];
  updateConditionHUD();
  if (condsBefore > 0) console.info('[CAMP] longRest_conditions cleared=%d', condsBefore);

  /* MP full recovery */
  if (S.charData && S.charData.mm > 0) {
    var maxMP = S.charData.mm;
    var currentMP = (S.charData.mp || 0) + (S.mpChange || 0);
    var mpRecov = maxMP - currentMP;
    if (mpRecov > 0) S.mpChange = (S.mpChange || 0) + mpRecov;
    console.info('[CAMP] longRest_mp recovered=%d newMP=%d/%d', mpRecov > 0 ? mpRecov : 0, maxMP, maxMP);
  }

  /* HD recovery (half of max, minimum 1) */
  var maxHD = (S.charData && S.charData.mhd) || 1;
  var hdRecov = Math.max(1, Math.floor(maxHD / 2));
  S._hdUsed = Math.max(0, (S._hdUsed || 0) - hdRecov);
  console.info('[CAMP] longRest_hd recovered=%d hdUsed=%d→%d max=%d', hdRecov, hdUsedBefore, S._hdUsed, maxHD);

  /* Exhaustion: clear to 0 */
  var prevExhaustion = S.exhaustion;
  S.exhaustion = 0;
  console.info('[CAMP] longRest_exhaustion before=%d after=0', prevExhaustion);

  /* Weather effect: storm adds exhaustion AFTER clearing */
  if (S.weather === 't') {
    console.info('[CAMP] longRest_storm adding +1 exhaustion after clear');
    if (typeof addExhaustion === 'function') addExhaustion(1, 'Tempestade durante descanso');
  }

  if (typeof resetStepsWithoutRest === 'function') resetStepsWithoutRest();
  S.dangerLevel = Math.min(5, (S.dangerLevel || 1) + 0.5);
  if (typeof updateDangerPips === 'function') updateDangerPips();

  logMoveEvent([{ type: 'long_rest', restCount: S._longRestCount }]);
  saveState();
  if (typeof updateCampButtonHint === 'function') updateCampButtonHint();

  /* Build summary text */
  var _hdNow = Math.max(0, maxHD - (S._hdUsed || 0));
  var _lrText = '\uD83C\uDF19 <b>Descanso Longo</b><br><br>';
  _lrText += '\u2764\ufe0f HP totalmente recuperado<br>';
  _lrText += '\u2728 Condi\u00e7\u00f5es removidas<br>';
  if (prevExhaustion > 0) {
    _lrText += '<span style="color:var(--v-hp-heal,#4caf50);font-weight:bold">\u2705 Exaust\u00e3o removida! (' + prevExhaustion + ' \u2192 ' + S.exhaustion + ')</span><br>';
    console.info('[EXPLORE:REST] longRest_exhaustion_removed prev=%d now=%d', prevExhaustion, S.exhaustion);
  } else _lrText += '\u2705 Sem exaust\u00e3o<br>';
  if (S.charData && S.charData.mm > 0) _lrText += '\u2728 MP totalmente recuperado<br>';
  _lrText += '\uD83C\uDFB2 Dados de Vida: ' + _hdNow + '/' + maxHD + ' (+' + hdRecov + ' recuperados)<br>';
  if (S.weather === 't') _lrText += '<br>\u26a1 <span style="color:var(--v-gold,#dca028)">Tempestade: descanso dif\u00edcil, +1 exaust\u00e3o.</span>';
  else if (S.weather === 'r') _lrText += '<br>\uD83C\uDF27\ufe0f <span style="color:var(--v-text-faint, #8a7a68)">Chuva: descanso desconfort\u00e1vel.</span>';
  if (S._longRestCount > 1) _lrText += '<br>\u26a0\ufe0f <span style="color:var(--v-gold,#dca028)">O perigo da regi\u00e3o aumentou.</span>';
  _lrText += '<br><i>Voc\u00ea se sente revigorado.</i>';

  /* Cinematic animation data */
  var _restData = {
    startHp: hpBefore,
    maxHp: cd.mh || 10,
    startMp: mpBefore,
    maxMp: cd.mm || 0,
    hdRecov: hdRecov,
    maxHd: maxHD,
    hdNow: _hdNow,
    hdUsed: S._hdUsed,
    exhaustionBefore: prevExhaustion,
    exhaustionAfter: S.exhaustion,
    weather: S.weather,
    biome: S.biome || 'forest',
    playerName: (cd.nm || 'Aventureiro'),
    guardPosted: S._guardPosted,
    guardSuccess: S._guardSuccess,
    restCount: S._longRestCount
  };

  var animOverlay = document.getElementById('camp-rest-overlay');
  if (animOverlay) {
    _playCampRestAnimation(_restData, function() {
      _showLongRestSummary(_lrText);
    });
  } else {
    _showLongRestDice(_lrText);
  }
}

/* ----------------------------------------------------------
 *  LONG REST AMBUSH CHECK
 * ---------------------------------------------------------- */

function _checkLongRestAmbush() {
  var weatherBonus = S.weather === 't' ? 15 : S.weather === 'r' ? 5 : 0;
  var ambushChance = 20 + ((S._longRestCount - 1) * 15) + weatherBonus;
  var roll = Math.floor(Math.random() * 100) + 1;
  console.info('[CAMP] ambushCheck chance=%d%% d100=%d weatherBonus=%d guardSuccess=%s triggered=%s',
    ambushChance, roll, weatherBonus, S._guardSuccess ? 'yes' : 'no',
    roll <= ambushChance ? 'yes' : 'no');
  if (roll <= ambushChance && S.campAmbush && !S._campAmbushUsed) {
    if (S._guardSuccess) {
      var avoidRoll = Math.floor(Math.random() * 100) + 1;
      if (avoidRoll <= 50) {
        S._longRestAmbushSafe = true;
        showTerrainToast('\uD83D\uDEE1\ufe0f Sua vig\u00edlia afastou uma amea\u00e7a!', 'ranger');
        return;
      }
      showTerrainToast('\u26a0\ufe0f Voc\u00ea detectou a amea\u00e7a, prepare-se!', 'condition');
    }
  } else {
    S._longRestAmbushSafe = true;
  }
}

/* ----------------------------------------------------------
 *  LONG REST DICE ANIMATION
 * ---------------------------------------------------------- */

var _lrDice = null;

function _showLongRestDice(summaryHtml) {
  var overlay = document.getElementById('camp-dice-overlay');
  var canvas = document.getElementById('camp-dice-canvas');
  var label = document.getElementById('camp-dice-label');
  if (!overlay || !canvas || typeof Dice3D === 'undefined') {
    console.warn('[CAMP] longRestDice_skipped overlay=%s canvas=%s Dice3D=%s → showing summary directly',
      !!overlay, !!canvas, typeof Dice3D !== 'undefined');
    _showLongRestSummary(summaryHtml);
    return;
  }

  var hdType = (S.charData && S.charData.hdt) || '1d8';
  var dieShape = hdType.replace(/^\d+/, '');
  var sides = parseInt(dieShape.replace('d', ''), 10) || 8;
  var dieResult = Math.floor(Math.random() * sides) + 1;
  console.info('[EXPLORE] longRestDice hd=%s sides=%d rolled=%d', hdType, sides, dieResult);

  if (label) label.textContent = '';
  overlay.classList.add('active');

  try {
    if (_lrDice) { _lrDice.dispose(); _lrDice = null; }
    _lrDice = new Dice3D(canvas, {
      size: typeof ValdoriaDice !== 'undefined' ? ValdoriaDice.CANVAS_SIZES[1] : 180,
      dieType: dieShape,
      duration: typeof ValdoriaDice !== 'undefined' ? ValdoriaDice.TIMING.D20_ROLL_MS : 1200
    });
  } catch(e) {
    console.warn('[EXPLORE] Long Rest Dice3D init failed:', e);
    overlay.classList.remove('active');
    _showLongRestSummary(summaryHtml);
    return;
  }

  _lrDice.roll(dieResult, function() {
    label.textContent = hdType + ' = ' + dieResult + ' (Descanso Longo)';
    if (window.vHaptic) vHaptic.medium();
    var _lrDelay = typeof calcReadTime === 'function' ? calcReadTime('Descanso Longo resultado dado', 'result') : 3000;
    setTimeout(function() {
      overlay.classList.remove('active');
      if (_lrDice) { _lrDice.dispose(); _lrDice = null; }
      _showLongRestSummary(summaryHtml);
    }, _lrDelay);
  });
}

function _showLongRestSummary(summaryHtml) {
  var overlay = document.getElementById('camp-result-overlay');
  var resultEl = document.getElementById('camp-result-text');
  if (overlay && resultEl) {
    resultEl.innerHTML = summaryHtml; /* noqa: innerHTML — long rest summary, safe computed content */
    overlay.classList.add('active');
  } else {
    showTerrainToast('Descanso Longo: HP recuperado', 'ranger');
  }
  _checkLongRestAmbush();
}

/* ----------------------------------------------------------
 *  SHORT REST DICE ANIMATION
 * ---------------------------------------------------------- */

var _campDice = null;

function _showCampDiceRoll(roll, conMod, bonus, total, foodName, hdType, mpRecovered) {
  console.info('[CAMP] showDiceRoll hdType=%s d=%d con=%d food=%d total=%d name=%s mp=%d',
    hdType || '?', roll, conMod, bonus, total, foodName || 'none', mpRecovered || 0);
  var overlay = document.getElementById('camp-dice-overlay');
  var canvas = document.getElementById('camp-dice-canvas');
  var label = document.getElementById('camp-dice-label');
  if (!overlay || !canvas) {
    console.warn('[CAMP] diceRoll_skipped overlay=%s canvas=%s → showing result directly', !!overlay, !!canvas);
    showCampResultOverlay(roll, conMod, bonus, total, foodName);
    return;
  }

  if (label) label.textContent = '';
  overlay.classList.add('active');

  try {
    if (_campDice) { _campDice.dispose(); _campDice = null; }
    var dieShape = (hdType || '1d8').replace(/^\d+/, '');
    _campDice = new Dice3D(canvas, {
      size: typeof ValdoriaDice !== 'undefined' ? ValdoriaDice.CANVAS_SIZES[1] : 180,
      dieType: dieShape,
      duration: typeof ValdoriaDice !== 'undefined' ? ValdoriaDice.TIMING.D20_ROLL_MS : 1200
    });
  } catch(e) {
    console.warn('[EXPLORE] Camp Dice3D init failed:', e);
    overlay.classList.remove('active');
    showCampResultOverlay(roll, conMod, bonus, total, foodName);
    return;
  }

  _campDice.roll(roll, function() {
    var sign = conMod >= 0 ? '+' : '';
    label.textContent = (hdType || '1d8') + ' = ' + roll + ' ' + sign + conMod + ' (CON)';
    if (window.vHaptic) vHaptic.medium();

    /* UNIFIED: append result content directly into dice overlay instead of opening separate overlay */
    setTimeout(function() {
      console.info('[EXPLORE:REST] unifiedOverlay appending result to dice overlay heal=%d', total);
      var card = overlay.querySelector('.camp-dice-card');
      if (!card) { overlay.classList.remove('active'); if (_campDice) { _campDice.dispose(); _campDice = null; } showCampResultOverlay(roll, conMod, bonus, total, foodName, hdType, mpRecovered); return; }

      /* Remove old unified results if any */
      var old = card.querySelector('.camp-unified-result');
      if (old) old.remove();

      var _actualHeal = Math.max(0, Math.min(total, getMaxHP() - (getCurrentHP() - total)));
      var resultDiv = document.createElement('div');
      resultDiv.className = 'camp-unified-result';
      resultDiv.style.cssText = 'margin-top:12px;animation:resultReveal 0.5s var(--v-ease-spring, cubic-bezier(0.34,1.56,0.64,1))';

      /* HP restored text */
      var hpText = document.createElement('div');
      hpText.className = 'camp-result-text';
      hpText.textContent = '+' + _actualHeal + ' HP Restaurados';
      hpText.style.cssText = 'margin-bottom:8px';
      resultDiv.appendChild(hpText);

      /* Detail line */
      var detSign = conMod >= 0 ? '+' : '';
      var detailStr = (hdType || '1d8') + ' = ' + roll + ' ' + detSign + ' ' + conMod + ' (CON) = ' + (roll + conMod);
      if (bonus > 0) detailStr += '\n' + foodName + ': +' + bonus + ' HP';
      if (mpRecovered > 0) detailStr += '\n\u2728 +' + mpRecovered + ' MP recuperado';
      var detailEl = document.createElement('div');
      detailEl.className = 'camp-result-detail';
      detailEl.textContent = detailStr;
      resultDiv.appendChild(detailEl);

      /* HP bar — built via DOM for safety */
      var currentHP = getCurrentHP();
      var maxHP = getMaxHP();
      var hpPct = Math.max(2, Math.round((currentHP / maxHP) * 100));
      var hpColor = hpPct > 60 ? '#4caf50' : hpPct > 25 ? '#f97316' : '#ef4444';
      var maxHD = (S.charData && S.charData.mhd) || 1;
      var hdRemaining = Math.max(0, maxHD - (S._hdUsed || 0));

      var barContainer = document.createElement('div');
      barContainer.style.cssText = 'margin-top:8px;padding:0 12px';
      var barRow = document.createElement('div');
      barRow.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:12px;color:var(--v-text-faint, #8a7a68)';
      var hpLabel = document.createElement('span');
      hpLabel.textContent = 'HP';
      barRow.appendChild(hpLabel);
      var barTrack = document.createElement('div');
      barTrack.style.cssText = 'flex:1;height:8px;background:rgba(0,0,0,0.3);border-radius:4px;overflow:hidden;border:1px solid rgba(255,255,255,0.08)';
      var barFill = document.createElement('div');
      barFill.id = 'camp-unified-hp-fill';
      barFill.style.cssText = 'height:100%;background:' + hpColor + ';border-radius:3px;transition:width 0.8s ease;width:0%';
      barTrack.appendChild(barFill);
      barRow.appendChild(barTrack);
      var hpVal = document.createElement('span');
      hpVal.style.color = hpColor;
      hpVal.textContent = currentHP + '/' + maxHP;
      barRow.appendChild(hpVal);
      barContainer.appendChild(barRow);
      var hdLine = document.createElement('div');
      hdLine.style.cssText = 'text-align:center;font-size:11px;color:var(--v-text-faint, #8a7a68);margin-top:4px';
      hdLine.textContent = 'Dados de Vida: ' + hdRemaining + '/' + maxHD;
      barContainer.appendChild(hdLine);
      resultDiv.appendChild(barContainer);

      /* Exhaustion note for short rest */
      var _exhLvl = S.exhaustion || 0;
      if (_exhLvl > 0) {
        var exhNote = document.createElement('div');
        exhNote.style.cssText = 'color:#c88;font-size:12px;text-align:center;margin-top:6px;font-style:italic';
        exhNote.textContent = '\u26a0\ufe0f Exaust\u00e3o ' + _exhLvl + ': Apenas descanso longo restaura';
        resultDiv.appendChild(exhNote);
        console.info('[EXPLORE:REST] unifiedOverlay_exhaustion_note lvl=%d', _exhLvl);
      }

      /* Close button */
      var closeBtn = document.createElement('button');
      closeBtn.className = 'btn-continue';
      closeBtn.textContent = 'Fechar';
      closeBtn.style.cssText = 'margin-top:12px';
      var _closeDone = false;
      closeBtn.onclick = function() {
        if (_closeDone) return;
        _closeDone = true;
        overlay.classList.remove('active');
        if (_campDice) { _campDice.dispose(); _campDice = null; }
        var _ur = card.querySelector('.camp-unified-result');
        if (_ur) _ur.remove();
        closeCampResult();
      };
      resultDiv.appendChild(closeBtn);
      card.appendChild(resultDiv);

      if (window.vHaptic) vHaptic.success();
      if (typeof flashScreen === 'function') flashScreen('rgba(68,170,136,0.15)');
      setTimeout(function() {
        var fill = document.getElementById('camp-unified-hp-fill');
        if (fill) fill.style.width = hpPct + '%';
      }, 200);

      /* Auto-close safety net */
      var _autoText = detailStr + ' +' + _actualHeal + ' HP';
      var _autoMs = typeof calcReadTime === 'function' ? calcReadTime(_autoText, 'result') : 6000;
      setTimeout(function() {
        if (overlay.classList.contains('active') && !_closeDone) {
          console.info('[EXPLORE:REST] unifiedOverlay auto-close after %dms', _autoMs);
          _closeDone = true;
          overlay.classList.remove('active');
          if (_campDice) { _campDice.dispose(); _campDice = null; }
          var _ur2 = card.querySelector('.camp-unified-result');
          if (_ur2) _ur2.remove();
          closeCampResult();
        }
      }, _autoMs);
    }, 800);
  });
}

/* ----------------------------------------------------------
 *  CAMP RESULT OVERLAY
 * ---------------------------------------------------------- */

function showCampResultOverlay(roll, conMod, bonus, total, foodName, hdType, mpRecovered) {
  console.info('[CAMP] showResultOverlay heal=%d hdType=%s food=%s mp=%d', total, hdType || '?', foodName || 'none', mpRecovered || 0);
  var overlay = document.getElementById('camp-result-overlay');
  var resultText = document.getElementById('camp-result-text');
  var detailEl = document.getElementById('camp-result-detail');
  if (!overlay || !resultText || !detailEl) {
    console.error('[CAMP] FATAL camp-result-overlay elements missing overlay=%s text=%s detail=%s', !!overlay, !!resultText, !!detailEl);
    return;
  }

  var _actualHeal = Math.max(0, Math.min(total, getMaxHP() - (getCurrentHP() - total)));
  resultText.textContent = '+' + _actualHeal + ' HP Restaurados';
  resultText.style.animation = 'none';
  resultText.offsetHeight; /* force reflow */
  resultText.style.animation = 'resultReveal var(--v-transition-slow) var(--v-ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1))';

  var sign = conMod >= 0 ? '+' : '';
  var detail = (hdType || '1d8') + ' = ' + roll + ' ' + sign + ' ' + conMod + ' (CON) = ' + (roll + conMod);
  if (bonus > 0) detail += '\n' + foodName + ': +' + bonus + ' HP';
  if (mpRecovered > 0) detail += '\n\u2728 +' + mpRecovered + ' MP recuperado';

  var maxHD = (S.charData && S.charData.mhd) || 1;
  var hdRemaining = Math.max(0, maxHD - (S._hdUsed || 0));
  var currentHP = getCurrentHP();
  var maxHP = getMaxHP();
  var hpPct = Math.max(2, Math.round((currentHP / maxHP) * 100));
  var hpColor = hpPct > 60 ? '#4caf50' : hpPct > 25 ? '#f97316' : '#ef4444';

  detail += '\n';
  detailEl.textContent = detail;

  var barContainer = document.createElement('div');
  barContainer.className = 'camp-hp-bar-container';
  barContainer.style.cssText = 'margin-top:8px;padding:0 12px';
  barContainer.innerHTML = '<div style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--v-text-faint, #8a7a68)">' /* noqa: innerHTML — camp result HP bar, safe computed content */
    + '<span>HP</span>'
    + '<div style="flex:1;height:8px;background:rgba(0,0,0,0.3);border-radius:4px;overflow:hidden;border:1px solid rgba(255,255,255,0.08)">'
    + '<div id="camp-hp-fill" style="height:100%;background:' + hpColor + ';border-radius:3px;transition:width 0.8s ease;width:0%"></div>'
    + '</div>'
    + '<span style="color:' + hpColor + '">' + currentHP + '/' + maxHP + '</span>'
    + '</div>'
    + '<div style="text-align:center;font-size:11px;color:var(--v-text-faint, #8a7a68);margin-top:4px">Dados de Vida: ' + hdRemaining + '/' + maxHD + '</div>';
  detailEl.parentElement.appendChild(barContainer);

  /* Exhaustion note for short rest — inform player only long rest removes it */
  var _exhLvl = S.exhaustion || 0;
  if (_exhLvl > 0) {
    var exhNote = document.createElement('div');
    exhNote.className = 'camp-result-exh-note';
    exhNote.style.cssText = 'color:#c88;font-size:12px;text-align:center;margin-top:6px;font-style:italic';
    exhNote.textContent = '\u26a0\ufe0f Exaust\u00e3o ' + _exhLvl + ': Apenas descanso longo restaura';
    detailEl.parentElement.appendChild(exhNote);
    console.info('[EXPLORE:REST] shortRest_exhaustion_note lvl=%d', _exhLvl);
  }

  overlay.classList.add('active');

  if (window.vHaptic) vHaptic.success();
  if (typeof flashScreen === 'function') flashScreen('rgba(68,170,136,0.15)');
  setTimeout(function() {
    var fill = document.getElementById('camp-hp-fill');
    if (fill) fill.style.width = hpPct + '%';
  }, 200);

  /* Auto-close safety net — generous timeout so player can read */
  var _autoCloseMs = typeof calcReadTime === 'function'
    ? calcReadTime(detail + ' ' + resultText.textContent, 'result')
    : 6000;
  setTimeout(function() {
    if (overlay.classList.contains('active')) {
      console.info('[CAMP] auto-closing camp-result-overlay after %dms', _autoCloseMs);
      closeCampResult();
    }
  }, _autoCloseMs);
}

/* ----------------------------------------------------------
 *  CLOSE CAMP RESULT
 * ---------------------------------------------------------- */

function closeCampResult() {
  console.info('[CAMP] closeCampResult ambush=%s ambushUsed=%s ambushSafe=%s returning=%s',
    S.campAmbush ? 'pending' : 'none', S._campAmbushUsed ? 'yes' : 'no',
    S._longRestAmbushSafe ? 'yes' : 'no', _returningToCity ? 'yes' : 'no');
  var campResultOverlay = document.getElementById('camp-result-overlay');
  if (!campResultOverlay) {
    console.warn('[CAMP] camp-result-overlay not found on close');
    return;
  }
  var bars = campResultOverlay.querySelectorAll('.camp-hp-bar-container');
  bars.forEach(function(b) { b.remove(); });
  var exhNotes = campResultOverlay.querySelectorAll('.camp-result-exh-note');
  exhNotes.forEach(function(n) { n.remove(); });
  campResultOverlay.classList.remove('active');

  if (typeof setCampfireActive === 'function') setCampfireActive(false);
  S._lowHPAlertShown = false;

  if (S.campAmbush && !S._campAmbushUsed && !S._longRestAmbushSafe) {
    S._campAmbushUsed = true;
    saveState();
    console.info('[CAMP] ambush_triggered! combat=%s', JSON.stringify(S.campAmbush).substring(0, 100));
    showTerrainToast('Algo ataca durante seu descanso!', 'danger');
    setTimeout(function() {
      triggerCombat({ combat: S.campAmbush });
    }, 1500);
    return;
  }

  S._longRestAmbushSafe = false;
  if (_returningToCity && _returnJourney) {
    setTimeout(function() {
      document.getElementById('return-journey-overlay').classList.add('active');
      _renderReturnHP(document.getElementById('return-journey-hp'));
      var remaining = _returnJourney.totalSteps - _returnJourney.currentStep;
      var actionsEl = document.getElementById('return-journey-actions');
      var overlay = document.getElementById('return-journey-overlay');
      _addReturnActions(actionsEl, overlay, remaining);
    }, 400);
  }
}


/* ============================================================
 *  EXIT RISK ASSESSMENT / EXIT PORTAL
 * ============================================================ */

function showExitRiskAssessment() {
  var overlay = document.getElementById('exit-risk-overlay');
  var hpRow = document.getElementById('exit-hp-row');
  var infoRow = document.getElementById('exit-info-row');
  var optionsEl = document.getElementById('exit-options');
  if (!overlay || !hpRow || !infoRow || !optionsEl) {
    console.error('[EXPLORE] exit-risk-overlay elements missing');
    return;
  }
  var currentHP = getCurrentHP();
  var maxHP = getMaxHP();
  var hpPct = getHPPercent();
  var distance = bfsDistanceToExit(S.playerCol, S.playerRow);
  var risk = calculateExitRisk(distance);
  var hpColor = hpPct > 60 ? '#4caf50' : hpPct > 25 ? '#f97316' : '#ef4444';

  hpRow.innerHTML = '<span>HP</span>' /* noqa: innerHTML — exit risk HP bar, safe computed content */
    + '<div class="exit-hp-bar"><div class="exit-hp-fill" style="transform:scaleX(' + Math.max(0.02, hpPct / 100) + ');background:' + hpColor + '"></div></div>'
    + '<span>' + currentHP + '/' + maxHP + '</span>';

  var distText = distance >= 0 ? (distance + ' turnos') : '???';
  var dangerLvl = S.dangerLevel || 1;
  var estEnc = distance > 0 ? Math.max(1, Math.round(distance * dangerLvl * 0.04)) : 0;
  var encText = estEnc > 0 ? '<span>~' + estEnc + ' encontro' + (estEnc > 1 ? 's' : '') + '</span>' : '';

  infoRow.innerHTML = '<span>' + distText + ' at\u00e9 a sa\u00edda</span>' /* noqa: innerHTML — exit info row, safe computed content */
    + '<span style="color:' + risk.color + '">Risco: ' + risk.label + ' (' + risk.chance + '%)</span>'
    + encText;

  optionsEl.innerHTML = ''; /* noqa: innerHTML — clearing exit options container */
  addExitOption(optionsEl, '', 'Retornar \u00e0 Cidade',
    distance >= 0 ? 'Jornada de ' + distance + ' turnos, ' + risk.chance + '% risco' : 'Rota desconhecida',
    risk.color, function() {
      overlay.classList.remove('active');
      attemptReturnToCity(risk.chance);
    });

  var healItems = getHealingItems();
  if (healItems.length > 0 && hpPct < 100) {
    var best = healItems[0];
    addExitOption(optionsEl, best.e || '', 'Usar ' + best.n + ' (' + best.q + 'x)',
      'Restaura ' + best.h + ' HP', '#4a8', function() {
        overlay.classList.remove('active');
        useInventoryItemAnimated(best, function(heal) {
          showTerrainToast((best.e || '') + ' +' + heal + ' HP', 'ranger');
          setTimeout(function() { showExitRiskAssessment(); }, 300);
        });
      });
  }

  addExitOption(optionsEl, '', 'Continuar Explorando', 'Voltar ao mapa', '#8a7a68', function() {
    overlay.classList.remove('active');
  });

  overlay.classList.add('active');
}

function addExitOption(container, icon, title, desc, color, onClick) {
  var btn = document.createElement('button');
  btn.className = 'exit-option-btn';
  btn.innerHTML = '<span class="exit-option-icon">' + icon + '</span>' /* noqa: innerHTML — exit option button, safe static content */
    + '<div class="exit-option-info">'
    + '<div class="exit-option-title">' + title + '</div>'
    + '<div class="exit-option-desc" style="color:' + color + '">' + desc + '</div>'
    + '</div>';
  btn.addEventListener('click', onClick);
  container.appendChild(btn);
}


/* ============================================================
 *  LOW HP / DEATH / SECOND WIND
 * ============================================================ */

function checkLowHP() {
  var pct = getHPPercent();
  if (pct > 25 || pct <= 0) return false;
  if (S._lowHPAlertShown) return false;
  S._lowHPAlertShown = true;
  showLowHPOverlay();
  return true;
}

function showLowHPOverlay() {
  var overlay = document.getElementById('lowhp-overlay');
  var hpRow = document.getElementById('lowhp-hp-row');
  var optionsEl = document.getElementById('lowhp-options');
  var currentHP = getCurrentHP();
  var maxHP = getMaxHP();
  var hpPct = getHPPercent();
  var distance = bfsDistanceToExit(S.playerCol, S.playerRow);
  var risk = calculateExitRisk(distance);

  hpRow.innerHTML = '<span>HP</span>' /* noqa: innerHTML — low HP bar, safe computed content */
    + '<div class="exit-hp-bar"><div class="exit-hp-fill" style="transform:scaleX(' + Math.max(0.02, hpPct / 100) + ');background:#c44"></div></div>'
    + '<span style="color:#c44">' + currentHP + '/' + maxHP + '</span>';

  optionsEl.innerHTML = ''; /* noqa: innerHTML — clearing low HP options */
  var healItems = getHealingItems();
  for (var i = 0; i < Math.min(2, healItems.length); i++) {
    (function(item) {
      addExitOption(optionsEl, item.e || '', 'Usar ' + item.n + ' (' + item.q + 'x)',
        'Restaura ' + item.h + ' HP', '#4a8', function() {
          overlay.classList.remove('active');
          useInventoryItemAnimated(item, function(heal) {
            showTerrainToast((item.e || '') + ' +' + heal + ' HP', 'ranger');
            S._lowHPAlertShown = false;
          });
        });
    })(healItems[i]);
  }

  var distText = distance >= 0 ? (distance + ' turnos') : '???';
  addExitOption(optionsEl, '', 'Retornar (' + distText + ')',
    'Risco: ' + risk.label + ' (' + risk.chance + '%)', risk.color, function() {
      overlay.classList.remove('active');
      attemptReturnToCity(risk.chance);
    });
  addExitOption(optionsEl, '', 'Continuar Explorando',
    'Arriscar seguir adiante', '#8a7a68', function() {
      overlay.classList.remove('active');
    });

  overlay.classList.add('active');
  if (window.vHaptic) vHaptic.warning();
}

function _checkHealingSpring() {
  if (!S.charData) return false;
  if (S._healingSpringUsed) return false;
  var currentHP = S.charData.hp + (S.hpChange || 0);
  var maxHP = S.charData.mh || 10;
  var hpPct = currentHP / maxHP;
  var chance = 0;
  if (hpPct < 0.25) chance = 30;
  else if (hpPct < 0.60) chance = 15;
  else return false;
  var roll = Math.floor(Math.random() * 100) + 1;
  if (window._dbg) console.debug('[EXPLORE] healingSpringCheck', {
    hpPct: hpPct, chance: chance, roll: roll, triggered: roll <= chance
  });
  if (roll > chance) return false;
  S._healingSpringUsed = true;
  _showHealingSpring();
  return true;
}

function _showHealingSpring() {
  activateOverlay('dm-overlay');
  var overlay = document.getElementById('dm-overlay');
  var textEl = document.getElementById('dm-narration');
  var choicesEl = document.getElementById('dm-choices');
  if (!overlay || !textEl) return;

  var biome = S.biome || 'forest';
  var springs = {
    forest:    { name: 'Fonte Silvestre',         desc: 'Uma nascente cristalina brota entre as ra\u00edzes de um carvalho ancestral. A \u00e1gua brilha com um toque de magia.' },
    plains:    { name: 'Po\u00e7o do Peregrino',  desc: 'Um po\u00e7o de pedra desgastado pelo tempo. A \u00e1gua fresca parece curar mais do que a sede.' },
    desert:    { name: 'O\u00e1sis Oculto',       desc: 'Entre as dunas, uma po\u00e7a de \u00e1gua l\u00edmpida cercada por tamareiras. Uma miragem... que \u00e9 real.' },
    snow:      { name: 'Fonte Termal',            desc: 'Vapor sobe de uma po\u00e7a quente na neve. A \u00e1gua mineral aquece e revigora.' },
    swamp:     { name: 'Claro do P\u00e2ntano',   desc: 'Um c\u00edrculo de \u00e1gua estranhamente pura no meio do p\u00e2ntano. Flores azuis flutuam na superf\u00edcie.' },
    mountain:  { name: 'Cascata da Montanha',     desc: 'Uma pequena cascata desce entre as rochas. A \u00e1gua gelada \u00e9 revigorante.' },
    cave:      { name: 'Lago Subterr\u00e2neo',   desc: 'Um lago de \u00e1gua parada que brilha com luz pr\u00f3pria. Cogumelos luminescentes cercam suas margens.' },
    volcanic:  { name: 'Fonte Mineral',           desc: 'A \u00e1gua borbulha quente da terra vulc\u00e2nica. Minerais dissolvidos d\u00e3o-lhe propriedades curativas.' },
    graveyard: { name: 'Santu\u00e1rio Esquecido', desc: 'Uma est\u00e1tua coberta de musgo abriga uma fonte de \u00e1gua benta. A paz emana deste lugar.' },
  };
  var spring = springs[biome] || springs.forest;
  var wisMod = typeof getAbilityMod === 'function' ? getAbilityMod('ws') : 0;
  var healRoll = Math.floor(Math.random() * 8) + 1;
  var totalHeal = Math.max(1, healRoll + wisMod);

  textEl.innerHTML = '<div style="text-align:center">' /* noqa: innerHTML — healing spring, safe static content */
    + '<div style="font-size:14px;color:#4a8;font-weight:700;margin-bottom:8px">\u26f2 ' + spring.name + '</div>'
    + '<div style="font-size:13px;color:#d4c8b0;line-height:1.6;margin-bottom:10px">' + spring.desc + '</div>'
    + '<div style="font-size:12px;color:#4a8;background:rgba(68,170,136,0.1);padding:6px 10px;border-radius:8px;border:1px solid rgba(68,170,136,0.2)">'
    + '\uD83C\uDFB2 1d8+' + wisMod + ' = <b>+' + totalHeal + ' HP</b> recuperados</div></div>';

  S.hpChange = (S.hpChange || 0) + totalHeal;
  var newHP = Math.min(S.charData.mh, S.charData.hp + S.hpChange);
  updateHP(newHP, S.charData.mh);
  if (typeof spawnFloatingText === 'function') spawnFloatingText(S.col, S.row, '+' + totalHeal + ' HP', '#4a8', 'damage');

  choicesEl.innerHTML = ''; /* noqa: innerHTML — clearing healing spring choices */
  var readDelay = typeof calcReadTime === 'function' ? calcReadTime(spring.desc, 'dm') : 3500;
  setTimeout(function() {
    overlay.classList.remove('active');
    if (typeof setEventActive === 'function') setEventActive(false);
    saveState();
  }, readDelay);
}

/* ----------------------------------------------------------
 *  DEATH — checkDeath, Second Wind, Death Saves
 * ---------------------------------------------------------- */

function checkDeath() {
  if (!S.charData) return false;
  var currentHP = S.charData.hp + S.hpChange;
  if (window._dbg) console.debug('[EXPLORE] checkDeath', {
    hp: currentHP, secondWindUsed: S._secondWindUsed || false, cls: S.charData.cn
  });
  if (currentHP <= 0) {
    var _isFighter = S.charData.cn === 'Guerreiro';
    if (_isFighter && !S._secondWindUsed) {
      S._secondWindUsed = true;
      console.info('[EXPLORE] second_wind_triggered class=%s hp=%d', S.charData.cn, currentHP);
      _showSecondWind();
      return true;
    }
    showDeathSaves();
    return true;
  }
  return false;
}

function _showSecondWind() {
  var overlay = document.getElementById('check-overlay');
  var formulaEl = document.getElementById('check-formula');
  var resultEl = document.getElementById('check-result');
  if (!overlay) { showDeathSaves(); return; }

  formulaEl.innerHTML = '<div style="font-size:14px;color:#c44;margin-bottom:6px">\u2620\ufe0f Voc\u00ea cai...</div>' /* noqa: innerHTML — second wind formula, safe static content */
    + '<div style="font-size:12px;color:#a09484;line-height:1.5">Mas algo dentro de voc\u00ea se recusa a ceder.<br>'
    + '<span style="color:#c4953a">F\u00f4lego (1x por explora\u00e7\u00e3o)</span></div>'
    + '<div style="font-size:11px;color:var(--v-text-faint, #8a7a68);margin-top:6px">d20 \u2265 10 para sobreviver</div>';
  resultEl.textContent = '';
  resultEl.className = 'check-result';
  overlay.classList.add('active');

  var readDelay = typeof calcReadTime === 'function'
    ? calcReadTime('Voce cai mas algo dentro de voce se recusa a ceder', 'overlay') : 2500;
  setTimeout(function() {
    var result = rollD20('normal');
    var roll = result.roll;
    var success = roll >= 10;
    var dice = getDice3D();
    if (dice) {
      dice.roll(roll, function() {
        _resolveSecondWind(overlay, formulaEl, resultEl, roll, success);
      });
    } else {
      _resolveSecondWind(overlay, formulaEl, resultEl, roll, success);
    }
  }, readDelay);
}

function _resolveSecondWind(overlay, formulaEl, resultEl, roll, success) {
  if (!S.charData?.hp && S.charData?.hp !== 0) console.warn('[EXPLORE] secondWind: charData.hp undefined');
  if (window._dbg) console.debug('[EXPLORE] secondWind', { roll: roll, success: success });

  if (success) {
    var _swHp = Math.max(0, S.charData?.hp || 0);
    S.hpChange = -(_swHp - 1);
    updateHP(1, S.charData.mh);
    addExhaustion(2, 'F\u00f4lego');
    resultEl.innerHTML = '<div style="color:#4a8;font-size:16px;font-weight:700">\u2705 F\u00f4lego!</div>' /* noqa: innerHTML — second wind success, safe static content */
      + '<div style="font-size:12px;color:#a09484;margin-top:4px">\uD83C\uDFB2 ' + roll + ' \u2265 10</div>'
      + '<div style="font-size:11px;color:#c4953a;margin-top:6px">Voc\u00ea sobrevive com 1 HP + 2 n\u00edveis de exaust\u00e3o.</div>';
    if (window.vHaptic) vHaptic.notify('success');
  } else {
    resultEl.innerHTML = '<div style="color:#c44;font-size:16px;font-weight:700">\u274c Escurid\u00e3o...</div>' /* noqa: innerHTML — second wind fail, safe static content */
      + '<div style="font-size:12px;color:#a09484;margin-top:4px">\uD83C\uDFB2 ' + roll + ' < 10</div>'
      + '<div style="font-size:11px;color:#c44;margin-top:6px">O f\u00f4lego n\u00e3o foi suficiente.</div>';
    if (window.vHaptic) vHaptic.notify('error');
  }

  var readDelay = typeof calcReadTime === 'function'
    ? calcReadTime(success ? 'F\u00f4lego sobrevive com 1 HP' : 'Escurid\u00e3o o folego nao foi suficiente', 'result') : 4000;
  setTimeout(function() {
    overlay.classList.remove('active');
    if (typeof disposeDice3D === 'function') disposeDice3D();
    if (!success) { showDeathSaves(); }
    else { saveState(); }
  }, readDelay);
}

/* ----------------------------------------------------------
 *  DEATH SAVES
 * ---------------------------------------------------------- */

var DEATH_SAVE_NARRATIONS = [
  'O mundo escurece nas bordas. Cada batida do cora\u00e7\u00e3o parece mais fraca que a anterior...',
  'Vozes sussurram ao longe. Ser\u00e3o os deuses decidindo seu destino?',
  'Uma luz fraca brilha al\u00e9m da escurid\u00e3o. Ainda n\u00e3o \u00e9 hora de segui-la.',
  'Mem\u00f3rias passam como sombras. Voc\u00ea se agarra ao fio de vida que resta.',
  'O frio se instala. Seus dedos formigam. A luta entre vida e morte continua.',
];

function showDeathSaves() {
  var overlay = document.getElementById('death-overlay');
  var summary = document.getElementById('death-summary');
  overlay.classList.add('active');
  if (window.vHaptic) vHaptic.error();

  var successes = 0, failures = 0, rollNum = 0;
  var _done = false;

  function renderState(roll, isResult, narrText) {
    var sMarks = '\u25cf'.repeat(successes) + '\u25cb'.repeat(3 - successes);
    var fMarks = '\u25cf'.repeat(failures) + '\u25cb'.repeat(3 - failures);
    var html = '<div style="text-align:center;margin-bottom:12px">'
      + '<div style="font-size:18px;margin-bottom:8px">Salvaguardas contra Morte</div>'
      + '<div style="font-size:14px;color:#6a8">\u2713 ' + sMarks + '</div>'
      + '<div style="font-size:14px;color:#a66">\u2717 ' + fMarks + '</div>'
      + '</div>';
    if (narrText) {
      html += '<div style="text-align:center;font-size:12px;color:#a09484;line-height:1.5;margin:8px 12px;font-style:italic">'
        + narrText + '</div>';
    }
    if (roll !== null) {
      var color = roll === 20 ? '#ffd700' : roll === 1 ? '#ff3333' : roll >= 10 ? '#6a8' : '#a66';
      html += '<div style="text-align:center;margin:12px 0">'
        + '<div class="dice-result" style="font-size:clamp(22px,6vw,28px);color:' + color + '">' + roll + '</div>'
        + '<div style="font-size:12px;color:var(--v-text-faint, #8a7a68);margin-top:4px">Rolagem ' + rollNum + '</div>'
        + '</div>';
    }
    if (isResult) {
      if (successes >= 3) {
        html += '<div style="text-align:center;color:#6a8;font-size:16px;margin-top:12px">Estabilizado! Voc\u00ea acorda com 1 HP.</div>';
      } else if (failures >= 3) {
        html += '<div style="text-align:center;color:#a66;font-size:16px;margin-top:12px">Voc\u00ea sucumbe aos ferimentos...</div>';
      } else if (roll === 20) {
        html += '<div style="text-align:center;color:#ffd700;font-size:16px;margin-top:12px">Cr\u00edtico Natural! Voc\u00ea se levanta com 1 HP!</div>';
      }
    }
    summary.innerHTML = html; /* noqa: innerHTML — death saves state render, safe computed content */
  }

  function rollDeathSave() {
    if (_done) return;
    rollNum++;
    var narrIdx = (rollNum - 1) % DEATH_SAVE_NARRATIONS.length;
    var narrText = DEATH_SAVE_NARRATIONS[narrIdx];
    renderState(null, false, narrText);

    var result = typeof rollD20 === 'function' ? rollD20('normal') : { roll: Math.floor(Math.random() * 20) + 1 };
    var roll = result.roll;
    var narrDelay = typeof calcReadTime === 'function' ? calcReadTime(narrText, 'combat') : 1500;

    setTimeout(function() {
      if (_done) return;
      var dice = typeof getDice3D === 'function' ? getDice3D() : null;

      var afterDice = function() {
        if (roll === 20) {
          successes = 3;
          renderState(roll, true, null);
          if (window.vHaptic) vHaptic.success();
          flashScreen('rgba(255,215,0,0.3)');
          setTimeout(function() {
            if (_done) return;
            _done = true;
            if (typeof disposeDice3D === 'function') disposeDice3D();
            overlay.classList.remove('active');
            S.hpChange = -(S.charData.hp - 1);
            updateHP(1, S.charData.mh);
            saveState();
          }, 2500);
          return;
        }
        if (roll === 1) { failures += 2; }
        else if (roll >= 10) { successes++; }
        else { failures++; }

        var isFinal = successes >= 3 || failures >= 3;
        renderState(roll, isFinal, null);

        if (roll >= 10 && roll !== 20) {
          if (window.vHaptic) vHaptic.notify('success');
        } else {
          if (window.vHaptic) vHaptic.notify('error');
        }
        if (roll === 1) {
          flashScreen('rgba(200,0,0,0.4)');
          if (typeof document.body.animate === 'function') {
            document.body.animate([
              { transform: 'translateX(-3px)' },
              { transform: 'translateX(3px)' },
              { transform: 'translateX(-2px)' },
              { transform: 'translateX(2px)' },
              { transform: 'translateX(0)' },
            ], { duration: 300, easing: 'ease-out' });
          }
        }
        if (typeof disposeDice3D === 'function') disposeDice3D();

        if (successes >= 3) {
          if (typeof flashScreen === 'function') flashScreen('rgba(68,170,136,0.2)');
          setTimeout(function() {
            if (_done) return;
            _done = true;
            overlay.classList.remove('active');
            S.hpChange = -(S.charData.hp - 1);
            updateHP(1, S.charData.mh);
            saveState();
            showTerrainToast('Voce se estabiliza. A escuridao recua.', 'ranger');
          }, 2500);
        } else if (failures >= 3) {
          if (typeof flashScreen === 'function') flashScreen('rgba(100,0,0,0.4)');
          /* transition */
          setTimeout(function() {
            if (_done) return;
            _done = true;
            finishExploration('death');
          }, 3000);
        } else {
          setTimeout(rollDeathSave, 1200);
        }
      };

      if (dice) {
        dice.roll(roll, afterDice);
      } else {
        if (typeof _emojiFallbackDie === 'function') {
          var dsOverlay = document.getElementById('check-overlay') || document.getElementById('death-save-overlay');
          _emojiFallbackDie(dsOverlay, roll, afterDice);
        } else {
          var fb = document.createElement('div');
          fb.style.cssText = 'font-size:32px;text-align:center';
          var fNums = ['\u2680', '\u2681', '\u2682', '\u2683', '\u2684', '\u2685'];
          var fIdx = 0;
          var fIv = setInterval(function() { fb.textContent = fNums[fIdx++ % 6]; }, 80);
          var dsTarget = document.getElementById('check-overlay') || document.getElementById('death-save-overlay');
          if (dsTarget) dsTarget.appendChild(fb);
          setTimeout(function() {
            clearInterval(fIv);
            fb.textContent = roll;
            setTimeout(afterDice, 400);
          }, 700);
        }
      }
    }, narrDelay);
  }

  renderState(null, false, null);
  setTimeout(rollDeathSave, 1000);
}

/* ----------------------------------------------------------
 *  DEATH OVERLAY (final)
 * ---------------------------------------------------------- */

function showDeathOverlay() {
  var overlay = document.getElementById('death-overlay');
  var summary = document.getElementById('death-summary');
  var html = '';
  if (S.xpEarned > 0) html += '<div class="reward-line">+' + S.xpEarned + ' XP</div>';
  if (S.goldEarned > 0) html += '<div class="reward-line">+' + S.goldEarned + ' Ouro</div>';
  html += '<div class="reward-line">HP reduzido a 0</div>';
  summary.innerHTML = html; /* noqa: innerHTML — death overlay summary, safe computed content */
  overlay.classList.add('active');

  var _deathDone = false;
  var skipBtn = document.getElementById('death-skip-btn');
  var finishDeath = function() {
    if (_deathDone) return;
    _deathDone = true;
    if (skipBtn) { skipBtn.classList.remove('visible'); skipBtn.onclick = null; }
    finishExploration('death');
  };
  setTimeout(function() {
    if (!_deathDone && skipBtn) {
      skipBtn.classList.add('visible');
      skipBtn.onclick = finishDeath;
    }
  }, 500);
  var deathText = summary.textContent || '';
  var deathDelay = typeof calcReadTime === 'function' ? calcReadTime(deathText, 'summary') : 2500;
  setTimeout(finishDeath, deathDelay);
}


/* ============================================================
 *  RETURN JOURNEY
 * ============================================================ */

var RETURN_NARRATIONS = {
  forest: [
    'A trilha serpenteia entre carvalhos antigos. Ra\u00edzes expostas marcam o caminho de volta.',
    'O canto dos p\u00e1ssaros guia seus passos pela floresta conhecida.',
    'Folhas secas estalam sob seus p\u00e9s. O caminho de volta parece mais curto.',
    'A luz do sol filtra entre as copas, iluminando a trilha familiar.',
  ],
  plains: [
    'A plan\u00edcie se abre vasta \u00e0 sua frente. Os muros de Eldoria brilham no horizonte.',
    'O vento empurra suas costas, como se a pr\u00f3pria terra quisesse lev\u00e1-lo para casa.',
    'Rastros na grama marcam o caminho que voc\u00ea percorreu. Basta segui-los de volta.',
  ],
  desert: [
    'O calor diminui enquanto voc\u00ea se afasta das dunas profundas.',
    'Suas pegadas na areia ainda s\u00e3o vis\u00edveis. O caminho de volta est\u00e1 claro.',
    'Um o\u00e1sis aparece no caminho. \u00c1gua fresca para a jornada de volta.',
  ],
  snow: [
    'A neve range sob seus passos. O frio \u00e9 intenso, mas familiar.',
    'Suas pegadas na neve marcam o retorno. Flocos brancos dan\u00e7am ao redor.',
    'O vento gelado carrega o cheiro de fuma\u00e7a. Eldoria est\u00e1 pr\u00f3xima.',
  ],
  swamp: [
    'O p\u00e2ntano borbulha ao redor. Cada passo exige cuidado.',
    'O ar \u00famido e pesado d\u00e1 lugar a uma brisa mais fresca. O pior ficou para tr\u00e1s.',
    'Luzes estranhas flutuam ao longe, mas voc\u00ea conhece o caminho seguro.',
  ],
  mountain: [
    'A descida \u00e9 mais r\u00e1pida que a subida. Seus joelhos agradecem cada degrau.',
    'O vento g\u00e9lido dos picos come\u00e7a a ceder enquanto voc\u00ea desce.',
    'Cabras montesas observam sua descida com curiosidade.',
  ],
  volcanic: [
    'O calor diminui a cada passo longe das fissuras vulc\u00e2nicas.',
    'O cheiro de enxofre ainda persegue voc\u00ea, mas fica mais fraco.',
    'O solo firma sob seus p\u00e9s. A terra inst\u00e1vel ficou para tr\u00e1s.',
  ],
  cave: [
    'A luz do dia aparece ao longe. A sa\u00edda da caverna se aproxima.',
    'O eco de seus passos muda \u2014 o teto se abre. Quase fora.',
    'Morcegos voam ao redor enquanto voc\u00ea navega pelas galerias.',
  ],
  graveyard: [
    'As l\u00e1pides ficam para tr\u00e1s. O ar pesado se dissipa gradualmente.',
    'Corvos observam sua partida em sil\u00eancio. Este lugar n\u00e3o esquece.',
    'A n\u00e9voa se afina com a dist\u00e2ncia. Os mortos descansam novamente.',
  ],
  _default: [
    'O caminho se estende diante de voc\u00ea. Cada passo o aproxima da seguran\u00e7a.',
    'A estrada \u00e9 longa, mas familiar. Eldoria espera no fim.',
    'Voc\u00ea acelera o passo. Os muros da cidade chamam.',
  ]
};

var RETURN_HAZARDS = {
  forest: [
    {
      title: 'Ra\u00edzes Trai\u00e7oeiras',
      narr: 'O ch\u00e3o da floresta est\u00e1 coberto de ra\u00edzes expostas. Um passo em falso pode ser desastroso.',
      choices: [
        { i: '\uD83C\uDFC3', t: 'Pular por cima', k: { s: 'dx', dc: 12 }, sNarr: 'Voc\u00ea salta com agilidade sobre as ra\u00edzes.', fNarr: 'Seu p\u00e9 enrosca numa ra\u00edz e voc\u00ea cai.', fDmg: 3 },
        { i: '\uD83D\uDC41\ufe0f', t: 'Contornar com cuidado', k: { s: 'ws', dc: 11 }, sNarr: 'Seus olhos encontram um caminho seguro.', fNarr: 'A vegeta\u00e7\u00e3o densa esconde uma armadilha natural.', fDmg: 2 }
      ]
    },
    {
      title: 'Ninho de Aranhas',
      narr: 'Teias grossas bloqueiam a trilha. Algo se move entre os fios.',
      choices: [
        { i: '\uD83D\uDD25', t: 'Queimar as teias', k: { s: 'dx', dc: 13 }, sNarr: 'As teias queimam rapidamente. Caminho livre.', fNarr: 'O fogo se espalha e uma aranha ataca.', fDmg: 4 },
        { i: '\uD83D\uDDE1\ufe0f', t: 'Cortar caminho', k: { s: 'st', dc: 12 }, sNarr: 'Voc\u00ea corta as teias com efici\u00eancia.', fNarr: 'As teias s\u00e3o mais resistentes do que parecem.', fDmg: 3 }
      ]
    }
  ],
  plains: [
    {
      title: 'Ventania Repentina',
      narr: 'Uma rajada de vento forte tenta derrub\u00e1-lo. Poeira e detritos voam ao redor.',
      choices: [
        { i: '\uD83D\uDEE1\ufe0f', t: 'Resistir firme', k: { s: 'st', dc: 11 }, sNarr: 'Voc\u00ea se firma contra o vento.', fNarr: 'A ventania o derruba.', fDmg: 2 },
        { i: '\uD83C\uDFC3', t: 'Abaixar e avan\u00e7ar', k: { s: 'dx', dc: 11 }, sNarr: 'Voc\u00ea se abaixa e avan\u00e7a rapidamente.', fNarr: 'Um detrito o atinge.', fDmg: 3 }
      ]
    }
  ],
  desert: [
    {
      title: 'Areia Movedi\u00e7a',
      narr: 'O ch\u00e3o cede sob seus p\u00e9s. Areia movedi\u00e7a!',
      choices: [
        { i: '\uD83D\uDCAA', t: 'Arrancar-se com for\u00e7a', k: { s: 'st', dc: 13 }, sNarr: 'Com esfor\u00e7o, voc\u00ea se liberta.', fNarr: 'Voc\u00ea afunda mais antes de se soltar.', fDmg: 3 },
        { i: '\uD83E\uDDE0', t: 'Mover-se devagar', k: { s: 'ws', dc: 12 }, sNarr: 'Movimentos lentos e calculados o libertam.', fNarr: 'O p\u00e2nico toma conta e voc\u00ea afunda mais.', fDmg: 4 }
      ]
    }
  ],
  snow: [
    {
      title: 'Nevasca',
      narr: 'Uma nevasca repentina reduz a visibilidade a quase zero.',
      choices: [
        { i: '\uD83E\uDDED', t: 'Navegar pelo instinto', k: { s: 'ws', dc: 13 }, sNarr: 'Seus instintos o guiam pela tempestade.', fNarr: 'Voc\u00ea se perde e o frio cobra seu pre\u00e7o.', fDmg: 4 },
        { i: '\uD83C\uDFD5\ufe0f', t: 'Esperar passar', k: { s: 'cn', dc: 12 }, sNarr: 'Voc\u00ea resiste ao frio at\u00e9 a nevasca passar.', fNarr: 'O frio penetra at\u00e9 os ossos.', fDmg: 3 }
      ]
    }
  ],
  swamp: [
    {
      title: 'Lama Profunda',
      narr: 'A lama do p\u00e2ntano engole suas botas. Cada passo \u00e9 uma luta.',
      choices: [
        { i: '\uD83D\uDCAA', t: 'For\u00e7ar passagem', k: { s: 'st', dc: 12 }, sNarr: 'Com for\u00e7a bruta, voc\u00ea atravessa.', fNarr: 'A lama n\u00e3o cede facilmente.', fDmg: 3 },
        { i: '\uD83D\uDD0D', t: 'Encontrar ch\u00e3o firme', k: { s: 'ws', dc: 13 }, sNarr: 'Voc\u00ea encontra um caminho mais firme.', fNarr: 'Ch\u00e3o que parecia firme era pior.', fDmg: 4 }
      ]
    }
  ],
  mountain: [
    {
      title: 'Desmoronamento',
      narr: 'Pedras rolam do alto. O caminho est\u00e1 inst\u00e1vel!',
      choices: [
        { i: '\uD83C\uDFC3', t: 'Correr para escapar', k: { s: 'dx', dc: 13 }, sNarr: 'Voc\u00ea escapa das pedras por pouco.', fNarr: 'Uma pedra o atinge no ombro.', fDmg: 4 },
        { i: '\uD83D\uDEE1\ufe0f', t: 'Se proteger', k: { s: 'cn', dc: 12 }, sNarr: 'Voc\u00ea se abriga at\u00e9 as pedras pararem.', fNarr: 'O impacto \u00e9 maior do que esperava.', fDmg: 3 }
      ]
    }
  ],
  volcanic: [
    {
      title: 'Fissura Vulc\u00e2nica',
      narr: 'Uma fissura no solo expele gases quentes e vapor.',
      choices: [
        { i: '\uD83C\uDFC3', t: 'Saltar por cima', k: { s: 'dx', dc: 14 }, sNarr: 'Um salto preciso o leva ao outro lado.', fNarr: 'O calor queima enquanto voc\u00ea hesita.', fDmg: 5 },
        { i: '\uD83E\uDDED', t: 'Contornar', k: { s: 'ws', dc: 12 }, sNarr: 'Voc\u00ea encontra uma passagem mais segura.', fNarr: 'O desvio o leva por terreno inst\u00e1vel.', fDmg: 3 }
      ]
    }
  ],
  cave: [
    {
      title: 'Teto Inst\u00e1vel',
      narr: 'Pedras caem do teto da caverna. A passagem est\u00e1 perigosa.',
      choices: [
        { i: '\uD83C\uDFC3', t: 'Correr pela passagem', k: { s: 'dx', dc: 12 }, sNarr: 'Voc\u00ea atravessa antes do desabamento.', fNarr: 'Uma pedra acerta suas costas.', fDmg: 4 },
        { i: '\uD83D\uDC41\ufe0f', t: 'Observar o padr\u00e3o', k: { s: 'it', dc: 13 }, sNarr: 'Voc\u00ea identifica o ritmo das quedas.', fNarr: 'Sua an\u00e1lise falha e uma pedra o surpreende.', fDmg: 3 }
      ]
    }
  ],
  graveyard: [
    {
      title: 'N\u00e9voa Maldita',
      narr: 'Uma n\u00e9voa espessa e g\u00e9lida envolve tudo. Sussurros ecoam de todos os lados.',
      choices: [
        { i: '\uD83E\uDDE0', t: 'Manter a calma', k: { s: 'ws', dc: 13 }, sNarr: 'Sua mente resiste aos sussurros.', fNarr: 'Os sussurros drenam sua energia.', fDmg: 3 },
        { i: '\uD83C\uDFC3', t: 'Correr pela n\u00e9voa', k: { s: 'cn', dc: 12 }, sNarr: 'Voc\u00ea atravessa a n\u00e9voa antes que ela o afete.', fNarr: 'O frio sobrenatural o enfraquece.', fDmg: 4 }
      ]
    }
  ],
  _default: [
    {
      title: 'Terreno Trai\u00e7oeiro',
      narr: 'O ch\u00e3o \u00e9 irregular e perigoso. Um passo em falso pode custar caro.',
      choices: [
        { i: '\uD83C\uDFC3', t: 'Avan\u00e7ar com cuidado', k: { s: 'dx', dc: 11 }, sNarr: 'Seus passos s\u00e3o certeiros.', fNarr: 'Voc\u00ea trope\u00e7a e se machuca.', fDmg: 3 },
        { i: '\uD83D\uDC41\ufe0f', t: 'Procurar caminho seguro', k: { s: 'ws', dc: 11 }, sNarr: 'Seus olhos encontram a rota mais segura.', fNarr: 'O caminho "seguro" n\u00e3o era t\u00e3o seguro.', fDmg: 2 }
      ]
    }
  ]
};

var _returnDice = null;
var _returnJourney = null;
var _returningToCity = false;

function _getReturnBiome() {
  return S.biome || 'forest';
}

function _pickFrom(pool) {
  return pool[Math.floor(Math.random() * pool.length)];
}

function _getReturnNarration() {
  var b = _getReturnBiome();
  var pool = RETURN_NARRATIONS[b] || RETURN_NARRATIONS._default;
  return _pickFrom(pool);
}

function _getReturnHazard() {
  var b = _getReturnBiome();
  var pool = RETURN_HAZARDS[b] || RETURN_HAZARDS._default;
  return _pickFrom(pool);
}

function _getReturnDice() {
  var canvas = document.getElementById('return-dice-canvas');
  var particles = document.getElementById('return-dice-particles');
  if (!canvas) return null;
  if (_returnDice) { _returnDice.dispose(); _returnDice = null; }
  try {
    _returnDice = new Dice3D(canvas, {
      size: typeof ValdoriaDice !== 'undefined' ? ValdoriaDice.CANVAS_SIZES[1] : 180,
      particlesContainer: particles
    });
  } catch(e) {
    console.warn('[EXPLORE] Return dice init failed:', e);
    return null;
  }
  return _returnDice;
}

function _disposeReturnDice() {
  if (_returnDice) { _returnDice.dispose(); _returnDice = null; }
}

function _renderReturnHP(el) {
  var hp = getCurrentHP();
  var max = getMaxHP();
  var pct = (hp / max) * 100;
  var color = pct > 60 ? '#4a8' : pct > 25 ? '#dca028' : '#c44';
  el.innerHTML = '<span>HP</span>' /* noqa: innerHTML — return journey HP bar, safe computed content */
    + '<div class="exit-hp-bar"><div class="exit-hp-fill" style="transform:scaleX(' + Math.max(0.02, pct / 100) + ');background:' + color + '"></div></div>'
    + '<span>' + hp + '/' + max + '</span>';
}

function _renderReturnProgress(el, j) {
  var pct = Math.round(((j.currentStep - 1) / j.totalSteps) * 100);
  var dots = '';
  for (var i = 1; i <= j.totalSteps; i++) {
    var cls = i < j.currentStep ? 'done' : i === j.currentStep ? 'current' : 'pending';
    dots += '<div class="return-progress-dot ' + cls + '"></div>';
  }
  el.innerHTML = '<div class="return-progress-bar"><div class="return-progress-fill" style="width:' + pct + '%"></div></div>' /* noqa: innerHTML — return progress bar, safe computed content */
    + (j.totalSteps <= 8 ? '<div class="return-progress-steps">' + dots + '</div>' : '')
    + '<div class="return-progress-label"><span>Etapa ' + j.currentStep + ' de ' + j.totalSteps + '</span></div>';
}

function _addReturnBtn(container, icon, title, desc, descColor, onClick) {
  var btn = document.createElement('button');
  btn.className = 'exit-option-btn';
  btn.innerHTML = '<span class="exit-option-icon">' + icon + '</span>' /* noqa: innerHTML — return button, safe static content */
    + '<div class="exit-option-info"><div class="exit-option-title">' + title + '</div>'
    + '<div class="exit-option-desc" style="color:' + descColor + '">' + desc + '</div></div>';
  btn.addEventListener('click', onClick);
  container.appendChild(btn);
}

function attemptReturnToCity(riskChance) {
  if (window._dbg) console.debug('[EXPLORE] attemptReturnToCity', { riskChance: riskChance });
  var distance = bfsDistanceToExit(S.playerCol, S.playerRow);
  var steps = Math.max(1, distance);
  _returnJourney = {
    totalSteps: steps,
    currentStep: 0,
    riskChance: riskChance,
    usedNarrations: new Set(),
    usedHazards: new Set(),
  };
  _returningToCity = true;
  showReturnJourneyStep();
}

function showReturnJourneyStep() {
  if (!_returnJourney) return;
  var j = _returnJourney;
  j.currentStep++;
  if (j.currentStep > j.totalSteps) { _showArrivalScreen(); return; }

  if (typeof playTravelAnimation === 'function' && j.currentStep > 1) {
    var biome = S.biome || 'forest';
    var remaining = j.totalSteps - j.currentStep + 1;
    playTravelAnimation(biome, '', function() { _renderReturnStep(); }, { duration: 2000 });
    return;
  }
  _renderReturnStep();
}

function _renderReturnStep() {
  var j = _returnJourney;
  if (!j) return;
  var roll = Math.random() * 100;
  var hasEncounter = roll < j.riskChance * 0.5 && S.randomEncounters.length > 0;
  var hasHazard = !hasEncounter && roll < j.riskChance;
  var hazard = hasHazard ? _getReturnHazard() : null;

  var overlay = document.getElementById('return-journey-overlay');
  var hpEl = document.getElementById('return-journey-hp');
  var progressEl = document.getElementById('return-journey-progress');
  var narrEl = document.getElementById('return-journey-narration');
  var diceEl = document.getElementById('return-journey-dice');
  var checkEl = document.getElementById('return-journey-check');
  var actionsEl = document.getElementById('return-journey-actions');
  var subtitleEl = document.getElementById('return-journey-subtitle');
  var iconEl = document.getElementById('return-journey-icon');
  var titleEl = document.getElementById('return-journey-title');

  diceEl.classList.remove('active');
  checkEl.innerHTML = ''; /* noqa: innerHTML — clearing return check element */
  actionsEl.innerHTML = ''; /* noqa: innerHTML — clearing return actions */
  _disposeReturnDice();

  var remaining = j.totalSteps - j.currentStep;
  titleEl.textContent = 'Rumo a Eldoria';
  subtitleEl.textContent = remaining > 0 ? (remaining + 1) + ' etapa' + (remaining > 0 ? 's' : '') + ' restante' + (remaining > 0 ? 's' : '') : 'Quase l\u00e1...';
  iconEl.textContent = '';
  _renderReturnHP(hpEl);
  _renderReturnProgress(progressEl, j);

  if (hasEncounter) {
    narrEl.innerHTML = '<div class="return-step-badge danger">Encontro na estrada!</div>' /* noqa: innerHTML — return encounter narration, safe static content */
      + '<div>Sombras se movem entre a vegeta\u00e7\u00e3o. Algo se aproxima rapidamente...</div>';
    _addReturnBtn(actionsEl, '', 'Enfrentar', 'Resolver o encontro para continuar', '#c44', function() {
      overlay.classList.remove('active');
      var enc = S.randomEncounters.shift();
      setTimeout(function() { showRandomEncounter(enc); }, 300);
    });
  } else if (hasHazard) {
    narrEl.innerHTML = '<div class="return-step-badge hazard">' + hazard.title + '</div>' /* noqa: innerHTML — return hazard narration, safe computed content */
      + '<div>' + hazard.narr + '</div>';
    for (var ci = 0; ci < hazard.choices.length; ci++) {
      (function(choice) {
        var statName = STAT_NAMES[choice.k.s] || choice.k.s;
        var mod = getAbilityMod(choice.k.s);
        var proficient = S.charData && S.charData.sp && S.charData.sp.includes(choice.k.s);
        var profMark = proficient ? ' \u2605' : '';
        var chance = Math.max(5, Math.min(95, Math.round(((21 - choice.k.dc + mod) / 20) * 100)));
        _addReturnBtn(actionsEl, choice.i, choice.t,
          statName + profMark + ' DC ' + choice.k.dc + ' | ' + (mod >= 0 ? '+' : '') + mod + ' | ' + chance + '%',
          '#dca028', function() { _rollReturnHazard(hazard, choice); });
      })(hazard.choices[ci]);
    }
  } else {
    var biomeLabels = {
      forest: 'Floresta', plains: 'Plan\u00edcie', cave: 'Caverna',
      swamp: 'P\u00e2ntano', mountain: 'Montanha', desert: 'Deserto', snow: 'Neve'
    };
    var biomeLabel = biomeLabels[_getReturnBiome()] || 'Estrada';
    narrEl.innerHTML = '<div class="return-step-badge safe">\u2713 ' + biomeLabel + ' \u2014 Caminho seguro</div>' /* noqa: innerHTML — return safe narration, safe computed content */
      + '<div>' + _getReturnNarration() + '</div>';
    _addReturnActions(actionsEl, overlay, remaining);
  }

  overlay.classList.add('active');
  if (window.vHaptic) vHaptic.impact(hasEncounter ? 'heavy' : hasHazard ? 'medium' : 'light');
}

function _rollReturnHazard(hazard, choice) {
  var actionsEl = document.getElementById('return-journey-actions');
  var diceEl = document.getElementById('return-journey-dice');
  var checkEl = document.getElementById('return-journey-check');
  actionsEl.innerHTML = ''; /* noqa: innerHTML — clearing return actions for hazard */

  var stat = choice.k.s;
  var dc = choice.k.dc;
  var mod = getAbilityMod(stat);
  var mode = getRollMode({ s: stat });
  var result = rollD20(mode);
  var roll = result.roll;
  var r1 = result.r1;
  var r2 = result.r2;
  var total = roll + mod;
  var success = total >= dc;

  S.checksPerformed.push({ stat: stat, dc: dc, roll: roll, mod: mod, ok: success, mode: mode, context: 'return' });

  var dice = _getReturnDice();
  if (dice) {
    diceEl.classList.add('active');
    dice.roll(roll, function() {
      _resolveReturnHazard(hazard, choice, roll, mod, total, success, r1, r2, mode);
    });
  } else {
    checkEl.innerHTML = ''; /* noqa: innerHTML — clearing check element for fallback dice */
    var _rdie = document.createElement('div');
    _rdie.className = 'die kept';
    _rdie.style.cssText = 'width:56px;height:56px;font-size:28px;margin:0 auto;border-radius:10px';
    _rdie.textContent = '\uD83C\uDFB2';
    checkEl.appendChild(_rdie);
    var _rcyc = setInterval(function() { _rdie.textContent = Math.floor(Math.random() * 20) + 1; }, 50);
    setTimeout(function() {
      clearInterval(_rcyc);
      _rdie.textContent = roll;
      _resolveReturnHazard(hazard, choice, roll, mod, total, success, r1, r2, mode);
    }, 700);
  }
}

function _resolveReturnHazard(hazard, choice, roll, mod, total, success, r1, r2, mode) {
  var overlay = document.getElementById('return-journey-overlay');
  var checkEl = document.getElementById('return-journey-check');
  var narrEl = document.getElementById('return-journey-narration');
  var actionsEl = document.getElementById('return-journey-actions');
  var hpEl = document.getElementById('return-journey-hp');

  var statName = STAT_NAMES[choice.k.s] || choice.k.s;
  var proficient = S.charData && S.charData.sp && S.charData.sp.includes(choice.k.s);
  var profMark = proficient ? '\u2605' : '';

  checkEl.innerHTML = buildFormula(roll, mod, statName, profMark, choice.k.dc, total, r1, r2, mode) /* noqa: innerHTML — return hazard formula, safe computed content */
    + '<div style="margin-top:6px;font-size:15px;font-weight:700;color:' + (success ? '#4a8' : '#c44') + '">'
    + (success ? 'Sucesso!' : 'Falha!') + '</div>';

  if (success) {
    narrEl.innerHTML = '<div class="return-step-badge safe">' + hazard.title + ' \u2014 Superado!</div>' /* noqa: innerHTML — return hazard success, safe computed content */
      + '<div>' + choice.sNarr + '</div>';
  } else {
    var dmg = choice.fDmg || 3;
    S.hpChange -= dmg;
    if (S.charData) {
      var newHP = Math.max(0, S.charData.hp + S.hpChange);
      updateHP(newHP, S.charData.mh);
    }
    _renderReturnHP(hpEl);
    narrEl.innerHTML = '<div class="return-step-badge danger">' + hazard.title + ' \u2014 Falha!</div>' /* noqa: innerHTML — return hazard fail, safe computed content */
      + '<div>' + choice.fNarr + '</div>'
      + '<div style="margin-top:6px;color:#c44;font-size:13px">-' + dmg + ' HP</div>';
  }

  if (window.vHaptic) vHaptic.notify(success ? 'success' : 'error');
  var remaining = _returnJourney ? _returnJourney.totalSteps - _returnJourney.currentStep : 0;
  setTimeout(function() {
    _disposeReturnDice();
    document.getElementById('return-journey-dice').classList.remove('active');
    if (getCurrentHP() <= 0) {
      actionsEl.innerHTML = ''; /* noqa: innerHTML — clearing actions for death */
      _addReturnBtn(actionsEl, '', 'Voc\u00ea sucumbiu...', 'Seus ferimentos foram fatais', '#c44', function() {
        overlay.classList.remove('active');
        _returnJourney = null;
        _returningToCity = false;
        showDeathSaves();
      });
      return;
    }
    _addReturnActions(actionsEl, overlay, remaining);
  }, 1200);
}

function _addReturnActions(actionsEl, overlay, remaining) {
  actionsEl.innerHTML = ''; /* noqa: innerHTML — clearing return actions */
  _addReturnBtn(actionsEl, '',
    remaining > 0 ? 'Continuar Viagem' : 'Chegar \u00e0 Cidade',
    remaining > 0 ? remaining + ' etapa' + (remaining > 1 ? 's' : '') + ' restante' + (remaining > 1 ? 's' : '') : 'Os port\u00f5es de Eldoria se erguem \u00e0 frente!',
    remaining > 0 ? '#8a7a68' : '#4a8',
    function() { showReturnJourneyStep(); });

  var foodItems = getFoodItems();
  if (foodItems.length > 0 && remaining > 0 && getHPPercent() < 100) {
    var div = document.createElement('div');
    div.className = 'return-camp-section';
    actionsEl.appendChild(div);
    _addReturnBtn(div, '', 'Montar Acampamento',
      'Descanso Curto (1d8+CON) \u2014 ' + foodItems.length + ' refei\u00e7\u00e3o dispon\u00edvel', '#4a8',
      function() {
        overlay.classList.remove('active');
        showCampOverlay();
      });
  }

  var healItems = getHealingItems();
  if (healItems.length > 0 && getHPPercent() < 100) {
    var best = healItems[0];
    _addReturnBtn(actionsEl, '', 'Usar ' + best.n + ' (' + best.q + 'x)',
      'Restaura ' + best.h + ' HP', '#4a8', function() {
        useInventoryItemAnimated(best, function(heal) {
          showTerrainToast('+' + heal + ' HP', 'ranger');
          _renderReturnHP(document.getElementById('return-journey-hp'));
          _addReturnActions(actionsEl, overlay, remaining);
        });
      });
  }
}

function _showArrivalScreen() {
  var overlay = document.getElementById('return-journey-overlay');
  var hpEl = document.getElementById('return-journey-hp');
  var progressEl = document.getElementById('return-journey-progress');
  var narrEl = document.getElementById('return-journey-narration');
  var diceEl = document.getElementById('return-journey-dice');
  var checkEl = document.getElementById('return-journey-check');
  var actionsEl = document.getElementById('return-journey-actions');
  var subtitleEl = document.getElementById('return-journey-subtitle');
  var iconEl = document.getElementById('return-journey-icon');
  var titleEl = document.getElementById('return-journey-title');

  diceEl.classList.remove('active');
  checkEl.innerHTML = ''; /* noqa: innerHTML — clearing arrival check */
  actionsEl.innerHTML = ''; /* noqa: innerHTML — clearing arrival actions */
  _disposeReturnDice();

  iconEl.textContent = '';
  iconEl.style.animation = 'none';
  titleEl.textContent = 'Eldoria';
  subtitleEl.textContent = 'Voc\u00ea chegou em seguran\u00e7a';
  _renderReturnHP(hpEl);

  var j = _returnJourney;
  if (j) {
    j.currentStep = j.totalSteps + 1;
    _renderReturnProgress(progressEl, j);
  }

  var ARRIVAL_TEXTS = {
    forest: [
      'As \u00e1rvores se abrem e os muros de Eldoria surgem banhados pela luz dourada. O aroma da floresta se mistura ao cheiro de fuma\u00e7a das chamin\u00e9s. Voc\u00ea sobreviveu.',
      'P\u00e1ssaros cantam uma despedida enquanto a trilha desemboca na estrada principal. Os port\u00f5es de Eldoria se erguem \u00e0 frente, acolhedores.',
      'O verde da floresta cede lugar \u00e0 pedra dos muros. Guardas acenam ao reconhec\u00ea-lo entre as \u00e1rvores. Enfim, seguran\u00e7a.',
    ],
    plains: [
      'A estrada de terra se alarga e os port\u00f5es de Eldoria dominam o horizonte. O vento dos campos sopra uma \u00faltima vez em suas costas.',
      'Rebanhos pastam ao lado da estrada enquanto os muros da cidade crescem a cada passo. O cheiro de p\u00e3o fresco chega com a brisa.',
      'A plan\u00edcie infinita termina nos muros familiares. Seus p\u00e9s encontram cal\u00e7amento e o al\u00edvio se instala. Eldoria, finalmente.',
    ],
    cave: [
      'A luz do dia cega por um instante ao emergir das profundezas. Os muros de Eldoria brilham \u00e0 dist\u00e2ncia como uma promessa cumprida.',
      'O ar livre enche seus pulm\u00f5es ap\u00f3s a escurid\u00e3o opressiva. Os port\u00f5es de Eldoria nunca pareceram t\u00e3o acolhedores.',
      'Seus olhos se adaptam \u00e0 claridade enquanto a estrada serpenteia at\u00e9 os muros da cidade. O pior ficou nas profundezas.',
    ],
    swamp: [
      'A lama cede lugar a ch\u00e3o firme e o ar \u00famido se dissipa. Os muros de Eldoria emergem da bruma como uma fortaleza de esperan\u00e7a.',
      'Voc\u00ea limpa a lama das botas na estrada pavimentada. O p\u00e2ntano fica para tr\u00e1s e a civiliza\u00e7\u00e3o retorna com cada passo.',
      'O cheiro p\u00fatrido \u00e9 substitu\u00eddo por aromas de comida e lareiras. Eldoria acolhe quem sobrevive ao p\u00e2ntano.',
    ],
    mountain: [
      'A descida termina em terras planas e os muros de Eldoria surgem no vale como um o\u00e1sis de pedra. O frio da montanha fica para tr\u00e1s.',
      'Seus joelhos agradecem o terreno plano ap\u00f3s a longa descida. Os port\u00f5es da cidade se abrem com um ranger familiar.',
      'O vento g\u00e9lido dos picos \u00e9 substitu\u00eddo pela brisa amena do vale. Eldoria espera com tetos aquecidos e comida quente.',
    ],
    desert: [
      'A areia cede lugar \u00e0 vegeta\u00e7\u00e3o e os muros de Eldoria surgem como uma miragem que finalmente \u00e9 real. \u00c1gua e sombra, enfim.',
      'O calor diminui com a proximidade dos muros. Guardas oferecem \u00e1gua ao v\u00ea-lo emergir das areias. O deserto ficou para tr\u00e1s.',
      'Seus l\u00e1bios rachados esbo\u00e7am um sorriso ao ver os port\u00f5es. O deserto tentou, mas Eldoria venceu.',
    ],
    snow: [
      'A neve diminui e os muros de Eldoria surgem entre os flocos. O calor das lareiras da cidade pode ser sentido mesmo daqui.',
      'Seus membros entorpecidos pelo frio se aquecem com a vis\u00e3o dos port\u00f5es. A neve n\u00e3o venceu desta vez.',
      'Pegadas na neve levam at\u00e9 a estrada limpa. Guardas com tochas iluminam a entrada. Voc\u00ea sobreviveu ao inverno.',
    ],
    volcanic: [
      'O ar limpo substitui o enxofre e os muros de Eldoria surgem al\u00e9m das cinzas. Suas queimaduras pulsam, mas voc\u00ea est\u00e1 vivo.',
      'O tremor da terra cessa ao se afastar do vulc\u00e3o. Eldoria aguarda, imune ao fogo das profundezas.',
      'O calor infernal fica para tr\u00e1s. O cheiro de comida e a vis\u00e3o dos muros renovam suas for\u00e7as.',
    ],
    graveyard: [
      'A n\u00e9voa do cemit\u00e9rio se dissipa como um sonho ruim. Os muros de Eldoria, s\u00f3lidos e reais, apagam os sussurros dos mortos.',
      'Corvos ficam para tr\u00e1s enquanto a estrada leva aos port\u00f5es. A luz das tochas dos guardas afasta as sombras persistentes.',
      'O sil\u00eancio dos mortos \u00e9 substitu\u00eddo pelo burburinho dos vivos. Eldoria pulsa com vida \u2014 exatamente o que voc\u00ea precisava.',
    ],
    _default: [
      'Os port\u00f5es se abrem diante de voc\u00ea. O som familiar da cidade traz al\u00edvio. Voc\u00ea sobreviveu \u00e0 jornada.',
      'As torres de vigia surgem entre as \u00e1rvores. Os guardas acenam ao reconhec\u00ea-lo. Enfim, seguran\u00e7a.',
      'O cheiro de p\u00e3o fresco e fuma\u00e7a de lareiras atinge voc\u00ea antes mesmo de ver os muros. Eldoria, finalmente.',
    ],
  };

  var arrivalTexts = ARRIVAL_TEXTS[_getReturnBiome()] || ARRIVAL_TEXTS._default;
  narrEl.innerHTML = '<div class="return-step-badge arrival">Chegada a Eldoria</div>' /* noqa: innerHTML — arrival screen narration, safe computed content */
    + '<div>' + _pickFrom(arrivalTexts) + '</div>';

  _addReturnBtn(actionsEl, '', 'Entrar na Cidade',
    'Seus p\u00e9s pisam solo seguro novamente', 'var(--v-gold, #c4953a)', function() {
      _closeReturnJourney();
      finishExploration('exit');
    });

  overlay.classList.add('active');
  if (window.vHaptic) vHaptic.success();
}

function _closeReturnJourney() {
  var overlay = document.getElementById('return-journey-overlay');
  if (overlay) overlay.classList.remove('active');
  _disposeReturnDice();
  _returnJourney = null;
  _returningToCity = false;
  var icon = document.getElementById('return-journey-icon');
  if (icon) icon.style.animation = '';
}
